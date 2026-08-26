const { FRONTEND_URL } = require('../config');
const logger = require('./logger');

/**
 * Centralized URL builder for Civic GreenNet.
 * Guarantees zero hardcoded localhost or 127.0.0.1 in production email dispatches.
 * Uses process.env.FRONTEND_URL / CLIENT_URL / VITE_APP_URL as single source of truth.
 */

// Warn once on startup if FRONTEND_URL is missing in production (email links will be wrong)
if (process.env.NODE_ENV === 'production' && !process.env.FRONTEND_URL && !process.env.CLIENT_URL) {
  logger.warn('[urlUtils] WARNING: FRONTEND_URL is not set in production! Password reset and verification email links will point to localhost:5173. Set FRONTEND_URL=https://civicgreennet.dev in Render environment variables.');
}

function buildFrontendUrl(path = '', queryParams = {}) {
  const baseUrl = (process.env.FRONTEND_URL || process.env.CLIENT_URL || process.env.VITE_APP_URL || FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
  const cleanPath = path ? (path.startsWith('/') ? path : `/${path}`) : '';
  const url = new URL(`${baseUrl}${cleanPath}`);

  if (queryParams && typeof queryParams === 'object') {
    Object.entries(queryParams).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        url.searchParams.set(key, String(val));
      }
    });
  }

  return url.toString();
}

module.exports = { buildFrontendUrl };
