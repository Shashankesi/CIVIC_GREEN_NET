const axios = require('axios');
const { GEMINI } = require('../../config');
const logger = require('../../utils/logger');

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const GEMINI_VISION_MODEL = process.env.GEMINI_VISION_MODEL || process.env.GEMINI_MODEL || 'gemini-2.0-flash';

const VISION_SYSTEM_PROMPT = `You are Civic GreenNet's AI Visual Evidence Inspector.
Analyze the citizen-uploaded municipal complaint photo with high precision.

You MUST respond with a valid, raw JSON object (strictly no markdown code fences, no introductory text) matching this schema:
{
  "category": "sanitation|roads|utilities|environment|public_safety|parks|lighting|drainage|noise|other",
  "severity": "minor|moderate|major|critical",
  "observations": ["specific visible object/condition 1", "specific visible object/condition 2"],
  "safetyConcerns": ["hazard or risk 1", "hazard or risk 2"],
  "visibleDamage": "Concise summary of physical damage or municipal disruption visible in the photo",
  "confidence": 0.00 to 1.00,
  "summary": "1-2 sentence factual description of the visible civic issue",
  "isCivicIssue": true
}`;

/**
 * Analyze a complaint image buffer or base64 data using Google Gemini Vision.
 * 
 * @param {Object} file - Multer file object or object with buffer/base64 & mimetype
 * @param {Object} context - Optional textual context (title, description, category)
 * @returns {Promise<Object>} Structured visual analysis or null if unavailable
 */
async function analyzeComplaintImage(file, context = {}) {
  if (!GEMINI || !GEMINI.API_KEY) {
    logger.warn('[ImageAnalyzer] Gemini API key not configured; skipping vision analysis.');
    return {
      available: false,
      reason: 'Gemini API key not configured in environment'
    };
  }

  if (!file) {
    return null;
  }

  try {
    let mimeType = file.mimetype || 'image/jpeg';
    let base64Data = '';

    if (file.buffer) {
      base64Data = file.buffer.toString('base64');
    } else if (typeof file.data === 'string') {
      base64Data = file.data.replace(/^data:image\/[a-z]+;base64,/, '');
    } else if (typeof file === 'string' && file.startsWith('data:')) {
      const matches = file.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
      if (matches) {
        mimeType = matches[1];
        base64Data = matches[2];
      }
    }

    if (!base64Data) {
      logger.warn('[ImageAnalyzer] Could not extract base64 data from file');
      return { available: false, reason: 'Invalid image data' };
    }

    const contextPrompt = context.title || context.description
      ? `Citizen Complaint Context: "${context.title || ''} - ${context.description || ''}"\nReported Category: ${context.category || 'Unknown'}`
      : 'Analyze this photo for municipal infrastructure, public works, sanitation, or safety issues.';

    const requestPayload = {
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `${VISION_SYSTEM_PROMPT}\n\n${contextPrompt}`
            },
            {
              inlineData: {
                mimeType,
                data: base64Data
              }
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 1024,
        responseMimeType: 'application/json'
      }
    };

    const response = await axios.post(
      `${GEMINI_BASE}/models/${GEMINI_VISION_MODEL}:generateContent?key=${GEMINI.API_KEY}`,
      requestPayload,
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      }
    );

    const parts = response.data?.candidates?.[0]?.content?.parts || [];
    const rawText = parts.map(p => p.text || '').join('\n').trim();

    if (!rawText) {
      throw new Error('Gemini vision returned empty response');
    }

    let parsed = null;
    try {
      let cleaned = rawText.replace(/```(?:json)?\s*([\s\S]*?)```/i, '$1').trim();
      parsed = JSON.parse(cleaned);
    } catch (e) {
      const match = rawText.match(/\{[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[0]);
      } else {
        throw new Error('Failed to parse JSON from Gemini vision output');
      }
    }

    return {
      available: true,
      category: parsed.category || 'other',
      severity: parsed.severity || 'moderate',
      observations: Array.isArray(parsed.observations) ? parsed.observations : [],
      safetyConcerns: Array.isArray(parsed.safetyConcerns) ? parsed.safetyConcerns : [],
      visibleDamage: parsed.visibleDamage || '',
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.85,
      summary: parsed.summary || 'Image analyzed by Gemini AI',
      isCivicIssue: parsed.isCivicIssue !== false,
      modelUsed: `gemini:${GEMINI_VISION_MODEL}`,
      analyzedAt: new Date().toISOString()
    };
  } catch (err) {
    logger.error('[ImageAnalyzer] Vision analysis failed', {
      error: err.response?.data || err.message
    });
    return {
      available: false,
      error: err.response?.data?.error?.message || err.message,
      analyzedAt: new Date().toISOString()
    };
  }
}

module.exports = {
  analyzeComplaintImage
};
