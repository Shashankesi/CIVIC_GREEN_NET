const axios = require('axios');
const { GROQ } = require('../../config');
const logger = require('../../utils/logger');
const { AI_ERROR_CODES, CopilotError } = require('./aiErrors');

const GROQ_BASE = 'https://api.groq.com/openai/v1';
const PRIMARY_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
const FALLBACK_MODEL = process.env.GROQ_FALLBACK_MODEL || 'llama-3.1-8b-instant';

function isConfigured() {
  return !!(GROQ && GROQ.API_KEY);
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Call Groq API with retries and model fallback
 */
async function callGroqWithRetry(payload, maxAttempts = 2) {
  if (!isConfigured()) {
    throw new CopilotError(AI_ERROR_CODES.SERVICE_UNAVAILABLE, 'Groq API key not configured');
  }

  let attempt = 0;
  let currentModel = payload.model || PRIMARY_MODEL;

  while (attempt < maxAttempts) {
    attempt++;
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
      return res.data;
    } catch (err) {
      const status = err.response?.status;
      const errorMsg = err.response?.data?.error?.message || err.message;

      logger.warn(`[Groq API] Model ${currentModel} attempt ${attempt} failed (Status: ${status}): ${errorMsg}`);

      if (attempt < maxAttempts) {
        currentModel = FALLBACK_MODEL;
        await delay(500 * attempt);
        continue;
      }

      if (status === 429) {
        throw new CopilotError(AI_ERROR_CODES.AI_RATE_LIMIT, 'AI provider rate limit reached');
      }

      if (status >= 500 || err.code === 'ECONNABORTED' || err.message.includes('timeout')) {
        throw new CopilotError(AI_ERROR_CODES.AI_TIMEOUT, 'AI service request timed out');
      }

      throw new CopilotError(AI_ERROR_CODES.SERVICE_UNAVAILABLE, `Groq API failed: ${errorMsg}`);
    }
  }
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
 * Generate structured text or JSON from Groq for a role
 */
async function generateGroqCompletion({ systemPrompt, userMessage, jsonMode = false, temperature = 0.2, maxTokens = 800 }) {
  const payload = {
    model: PRIMARY_MODEL,
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
  PRIMARY_MODEL,
  FALLBACK_MODEL
};
