const axios = require('axios');
const { GEMINI } = require('./index');

// Official Google AI Studio / Gemini API
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const GEMINI_MODEL = 'gemini-1.5-flash';
const EMBEDDING_MODEL = 'text-embedding-004';

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

async function analyzeComplaint(text) {
  if (!GEMINI.API_KEY) {
    throw new Error('Gemini API key not configured');
  }
  try {
    const res = await axios.post(
      `${GEMINI_BASE}/models/${GEMINI_MODEL}:generateContent?key=${GEMINI.API_KEY}`,
      {
        contents: [{ role: 'user', parts: [{ text: ANALYZE_PROMPT + text }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 1024
        }
      },
      { headers: { 'Content-Type': 'application/json' } }
    );
    const raw = extractText(res.data);
    return parseAnalysis(raw);
  } catch (err) {
    console.error('Gemini error', err?.response?.data || err.message);
    throw err;
  }
}

function extractText(data) {
  try {
    const parts = data?.candidates?.[0]?.content?.parts || [];
    const text = parts.map((p) => p.text || '').join('\n').trim();
    if (!text) throw new Error('Gemini returned empty content');
    return text;
  } catch (e) {
    throw new Error('Gemini returned unexpected content format');
  }
}

// Parse Gemini's textual output into a structured analysis object.
function parseAnalysis(raw) {
  // Strip possible markdown/code fences
  let cleaned = String(raw).trim();
  const fence = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) cleaned = fence[1].trim();
  // Find the first { ... } block
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try {
      const obj = JSON.parse(cleaned.slice(start, end + 1));
      return normalizeAnalysis(obj);
    } catch (e) {
      console.error('Gemini JSON parse failed, returning raw text', e.message);
    }
  }
  // Fallback: minimal structured object from raw text
  return normalizeAnalysis({ summary: raw, title: raw.slice(0, 80), confidence: 0.5 });
}

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

async function getEmbedding(text) {
  if (!GEMINI.API_KEY) throw new Error('Gemini API key not configured');
  try {
    const res = await axios.post(
      `${GEMINI_BASE}/models/${EMBEDDING_MODEL}:embedContent?key=${GEMINI.API_KEY}`,
      { content: { parts: [{ text }] } },
      { headers: { 'Content-Type': 'application/json' } }
    );
    const emb = res?.data?.embedding?.values;
    if (!Array.isArray(emb)) throw new Error('Unexpected embedding response');
    return emb;
  } catch (err) {
    console.error('Gemini embedding error', err?.response?.data || err.message);
    throw err;
  }
}

module.exports = { analyzeComplaint, getEmbedding };
