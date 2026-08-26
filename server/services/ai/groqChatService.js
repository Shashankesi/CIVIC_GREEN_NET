const axios = require('axios');
const { GROQ } = require('../../config');
const logger = require('../../utils/logger');
const { AI_ERROR_CODES, CopilotError } = require('./aiErrors');

const GROQ_BASE = 'https://api.groq.com/openai/v1';

// Priority order of models to try
const CANDIDATE_MODELS = [
  process.env.GROQ_MODEL,
  'qwen/qwen3.8-27b',
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant'
].filter(Boolean);

let verifiedWorkingModel = CANDIDATE_MODELS[0] || 'qwen/qwen3.8-27b';

function isConfigured() {
  return !!(GROQ && GROQ.API_KEY);
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Call Groq API with automatic model discovery and retries
 */
async function callGroqWithRetry(payload, maxAttempts = 3) {
  if (!isConfigured()) {
    throw new CopilotError(AI_ERROR_CODES.SERVICE_UNAVAILABLE, 'Groq API key not configured');
  }

  const modelsToTry = [
    verifiedWorkingModel,
    ...CANDIDATE_MODELS.filter(m => m !== verifiedWorkingModel)
  ];

  let lastError = null;

  for (let i = 0; i < Math.min(modelsToTry.length, maxAttempts); i++) {
    const currentModel = modelsToTry[i];
    try {
      const res = await axios.post(
        `${GROQ_BASE}/chat/completions`,
        { ...payload, model: currentModel },
        {
          headers: {
            Authorization: `Bearer ${GROQ.API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      if (res.data?.choices?.[0]?.message?.content) {
        verifiedWorkingModel = currentModel;
        return res.data;
      }
    } catch (err) {
      lastError = err;
      const status = err.response?.status;
      const errorMsg = err.response?.data?.error?.message || err.message;
      logger.warn(`[Groq API] Model ${currentModel} failed (Status: ${status}): ${errorMsg}`);

      if (status === 429) {
        await delay(800 * (i + 1));
      }
    }
  }

  const errorMsg = lastError?.response?.data?.error?.message || lastError?.message || 'All candidate models failed';
  throw new CopilotError(AI_ERROR_CODES.SERVICE_UNAVAILABLE, `Groq API failed: ${errorMsg}`);
}

/**
 * Clean technical / function artifacts from generated text
 */
function sanitizeAiResponse(text) {
  if (!text || typeof text !== 'string') return '';
  let cleaned = text.trim();
  cleaned = cleaned.replace(/```json/gi, '').replace(/```/gi, '');
  cleaned = cleaned.replace(/I can only provide the results based on the function calls made\.*/gi, '');
  cleaned = cleaned.replace(/based on the function calls made\.*/gi, '');
  cleaned = cleaned.replace(/the function returned\.*/gi, '');
  cleaned = cleaned.replace(/I will wait for the results\.*/gi, '');
  return cleaned.trim();
}

/**
 * Generate structured text or JSON from Groq
 */
async function generateGroqCompletion({ systemPrompt, userMessage, jsonMode = false, temperature = 0.2, maxTokens = 800 }) {
  const payload = {
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ],
    temperature,
    max_tokens: maxTokens
  };

  if (jsonMode) {
    payload.response_format = { type: 'json_object' };
  }

  const responseData = await callGroqWithRetry(payload);
  const rawContent = responseData?.choices?.[0]?.message?.content || '';

  if (jsonMode) {
    try {
      return JSON.parse(rawContent);
    } catch (e) {
      const match = rawContent.match(/\{[\s\S]*\}/);
      if (match) {
        return JSON.parse(match[0]);
      }
      throw new CopilotError(AI_ERROR_CODES.AI_INVALID_RESPONSE, 'Failed to parse JSON response from Groq');
    }
  }

  return sanitizeAiResponse(rawContent);
}

module.exports = {
  isConfigured,
  callGroqWithRetry,
  generateGroqCompletion,
  sanitizeAiResponse,
  PRIMARY_MODEL: verifiedWorkingModel,
  FALLBACK_MODEL: 'qwen/qwen3.8-27b'
};
