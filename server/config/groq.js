// Groq — optional secondary/fallback AI provider (backend only).
// Architecture mirrors config/gemini.js so the complaint AI flow can fall back to Groq
// for compatible text tasks when Gemini is temporarily unavailable.
//
// Security: GROQ_API_KEY is read from server/.env via config/index.js. It is NEVER
// logged, printed, or exposed to the frontend.
const axios = require('axios');
const { GROQ } = require('./index');

const GROQ_BASE = 'https://api.groq.com/openai/v1';
// Text-capable model (performance / cost). Verified against the official Groq API.
const GROQ_TEXT_MODEL = 'llama-3.1-8b-instant';
// NOTE on vision: not all Groq models accept image input. We keep a separate const
// so callers can opt-in only after verifying capability. Defaults are text-only.
const GROQ_VISION_MODEL = 'llama-3.2-90b-vision-preview';

const ANALYZE_PROMPT = `Analyze the following civic complaint text and return a JSON object (no markdown, no code fences) with ONLY these keys:
- "title": concise descriptive title
- "summary": one-sentence summary
- "category": one of (sanitation, roads, utilities, environment, public_safety, parks, noise, lighting, other)
- "department": suggested responsible department name
- "severity": one of (minor, moderate, major, critical)
- "priority": one of (low, medium, high, urgent)
- "tags": array of short keyword strings
- "keywords": array of short keyword strings
- "resolution_estimate": short human-readable estimate e.g. "3-5 days"
- "suggested_actions": array of short action strings
- "confidence": number between 0 and 1

Complaint text:
`;

function isConfigured() {
  return !!(GROQ && GROQ.API_KEY);
}

// Generic chat completion against Groq's OpenAI-compatible API.
async function chatCompletion(promptText, { model = GROQ_TEXT_MODEL, temperature = 0.2, maxTokens = 1024, imageDataUrl = null } = {}) {
  if (!isConfigured()) {
    throw new Error('Groq API key not configured');
  }
  const messages = [{ role: 'user', content: [] }];
  // Content parts: text always present; image optionally appended IF supported.
  const parts = [{ type: 'text', text: promptText }];
  if (imageDataUrl) {
    // Only include image when caller explicitly requests vision and supplies an image.
    parts.push({ type: 'image_url', image_url: { url: imageDataUrl } });
  }
  messages[0].content = parts;
  try {
    const res = await axios.post(
      `${GROQ_BASE}/chat/completions`,
      {
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        response_format: { type: 'json_object' }
      },
      { headers: { Authorization: `Bearer ${GROQ.API_KEY}`, 'Content-Type': 'application/json' } }
    );
    return res.data;
  } catch (err) {
    console.error('Groq error', err?.response?.status, err?.response?.data?.error?.message || err.message, err?.response?.statusText || '');
    throw err;
  }
}

function extractContent(data) {
  const msg = data?.choices?.[0]?.message?.content;
  if (typeof msg !== 'string' || !msg.trim()) throw new Error('Groq returned empty content');
  return msg.trim();
}

// Normalize a parsed analysis object to the same shape gemini.js produces.
function normalizeAnalysis(obj) {
  const safe = obj || {};
  const arr = (v) => (Array.isArray(v) ? v : v ? [String(v)] : []);
  return {
    title: safe.title || safe.summary || '',
    summary: safe.summary || safe.title || '',
    category: safe.category || null,
    department: safe.department || null,
    severity: safe.severity || 'moderate',
    priority: safe.priority || 'medium',
    tags: arr(safe.tags || safe.keywords),
    keywords: arr(safe.keywords || safe.tags),
    resolution_estimate: safe.resolution_estimate || null,
    suggested_actions: arr(safe.suggested_actions),
    confidence: typeof safe.confidence === 'number' ? safe.confidence : 0.5
  };
}

function parseAnalysis(raw) {
  let cleaned = String(raw).trim();
  const fence = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) cleaned = fence[1].trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try {
      return normalizeAnalysis(JSON.parse(cleaned.slice(start, end + 1)));
    } catch (e) {
      // fall through
    }
  }
  return normalizeAnalysis({ summary: cleaned, title: cleaned.slice(0, 80), confidence: 0.5 });
}

// Structured complaint analysis (text). Mirrors gemini.analyzeComplaint.
async function analyzeComplaint(text) {
  const res = await chatCompletion(ANALYZE_PROMPT + text);
  return parseAnalysis(extractContent(res));
}

// Optional vision/classification. Only call if the selected model supports image input.
// Returns structured json: { waste_type, confidence, description, severity, recommended_action }
async function classifyImage(imageDataUrl, model = GROQ_VISION_MODEL) {
  const prompt = `You are a civic waste classification assistant. Analyze the image and return JSON (no markdown) with ONLY:
{"waste_type": "wet|dry|recyclable|hazardous|e_waste|mixed|unknown", "confidence": 0-1, "description": "short", "severity": "minor|moderate|major|critical", "recommended_action": "short"}
Image:`;
  const res = await chatCompletion(prompt, { model, imageDataUrl });
  return parseImageAnalysis(extractContent(res));
}

function parseImageAnalysis(raw) {
  let cleaned = String(raw).trim();
  const fence = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) cleaned = fence[1].trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try {
      const o = JSON.parse(cleaned.slice(start, end + 1));
      return {
        waste_type: o.waste_type || o.wasteType || 'unknown',
        confidence: typeof o.confidence === 'number' ? o.confidence : 0.5,
        description: o.description || '',
        severity: o.severity || 'moderate',
        recommended_action: o.recommended_action || o.recommendedAction || ''
      };
    } catch (e) { /* ignore */ }
  }
  return { waste_type: 'unknown', confidence: 0.5, description: cleaned, severity: 'moderate', recommended_action: '' };
}

module.exports = {
  analyzeComplaint,
  classifyImage,
  isConfigured,
  GROQ_TEXT_MODEL,
  GROQ_VISION_MODEL
};
