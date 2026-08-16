const axios = require('axios');
const { GROQ } = require('../../config');
const { executeTool } = require('./aiTools');

const GROQ_BASE = 'https://api.groq.com/openai/v1';
const PRIMARY_MODEL = 'llama-3.3-70b-versatile';
const FALLBACK_MODEL = 'llama-3.1-8b-instant';

function isConfigured() {
  return !!(GROQ && GROQ.API_KEY);
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function callGroqWithRetry(payload, maxAttempts = 3) {
  let attempt = 0;
  while (attempt < maxAttempts) {
    attempt++;
    try {
      const res = await axios.post(`${GROQ_BASE}/chat/completions`, payload, {
        headers: {
          Authorization: `Bearer ${GROQ.API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });
      return res.data;
    } catch (err) {
      const status = err.response?.status;
      if (status === 429 || status >= 500) {
        console.warn(`[Groq API] Model ${payload.model} attempt ${attempt} returned status ${status}.`);
        if (attempt < maxAttempts) {
          // Switch to fallback model if primary failed, and wait 1.5s
          payload.model = FALLBACK_MODEL;
          await delay(1500 * attempt);
          continue;
        }
      }
      throw err;
    }
  }
}

/**
 * Execute chat completion loop with optional tool calling.
 * Handles up to 3 iterative tool calls per single user interaction turn.
 */
async function executeChatLoop({ messages, tools = [], ctx, temperature = 0.3, maxTokens = 1024 }) {
  if (!isConfigured()) {
    throw new Error('Groq API key not configured in environment (GROQ_API_KEY).');
  }

  let currentMessages = [...messages];
  let iterations = 0;
  const maxIterations = 3;
  let finalMessage = null;

  while (iterations < maxIterations) {
    iterations++;

    const payload = {
      model: PRIMARY_MODEL,
      messages: currentMessages,
      temperature,
      max_tokens: maxTokens
    };

    if (tools && tools.length > 0) {
      payload.tools = tools;
      payload.tool_choice = 'auto';
    }

    let responseData;
    try {
      responseData = await callGroqWithRetry(payload);
    } catch (err) {
      console.error('Groq API Error:', err.response?.data || err.message);
      throw new Error(err.response?.data?.error?.message || err.message || 'Groq service temporarily unavailable');
    }

    const choiceMessage = responseData?.choices?.[0]?.message;
    if (!choiceMessage) {
      throw new Error('Groq returned empty response choice');
    }

    // Check if model requested tool calls
    if (choiceMessage.tool_calls && choiceMessage.tool_calls.length > 0) {
      currentMessages.push(choiceMessage);

      for (const toolCall of choiceMessage.tool_calls) {
        const fnName = toolCall.function?.name;
        let fnArgs = {};
        try {
          fnArgs = JSON.parse(toolCall.function?.arguments || '{}');
        } catch (e) {
          fnArgs = {};
        }

        console.log(`[AI Tool Call] Role: ${ctx.role} | Tool: ${fnName} | Args:`, fnArgs);

        let result;
        try {
          result = await executeTool(fnName, fnArgs, ctx);
        } catch (execErr) {
          console.error(`[AI Tool Error] ${fnName}:`, execErr.message);
          result = { error: execErr.message };
        }

        currentMessages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          name: fnName,
          content: JSON.stringify(result)
        });
      }
    } else {
      finalMessage = choiceMessage;
      break;
    }
  }

  if (!finalMessage) {
    const payload = {
      model: PRIMARY_MODEL,
      messages: currentMessages,
      temperature,
      max_tokens: maxTokens
    };
    const responseData = await callGroqWithRetry(payload);
    finalMessage = responseData?.choices?.[0]?.message;
  }

  return {
    message: finalMessage,
    updatedMessages: currentMessages
  };
}

module.exports = {
  isConfigured,
  executeChatLoop,
  PRIMARY_MODEL,
  FALLBACK_MODEL
};
