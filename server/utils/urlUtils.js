const { FRONTEND_URL } = require('../config');

/**
 * Centralized URL builder for Civic GreenNet.
 * Guarantees zero hardcoded localhost or 127.0.0.1 in production email dispatches.
 * Uses process.env.FRONTEND_URL / CLIENT_URL / VITE_APP_URL as single source of truth.
 */
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
