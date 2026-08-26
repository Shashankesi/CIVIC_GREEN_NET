/**
 * Standardized AI and Copilot Error definitions
 */

const AI_ERROR_CODES = {
  AI_TIMEOUT: 'AI_TIMEOUT',
  AI_RATE_LIMIT: 'AI_RATE_LIMIT',
  AI_INVALID_RESPONSE: 'AI_INVALID_RESPONSE',
  DATABASE_ERROR: 'DATABASE_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INVALID_REQUEST: 'INVALID_REQUEST',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE'
};

class CopilotError extends Error {
  constructor(code, message, fallbackData = null) {
    super(message);
    this.name = 'CopilotError';
    this.code = code || AI_ERROR_CODES.SERVICE_UNAVAILABLE;
    this.fallbackData = fallbackData;
  }
}

module.exports = {
  AI_ERROR_CODES,
  CopilotError
};
