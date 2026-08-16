import api, { unwrapResponse } from './api';

const DEFAULT_TIMEOUT = 10000;

export async function getPublicHealth(signal = null) {
  try {
    const res = await api.get('/health', {
      timeout: 5000,
      signal
    });
    return res.data;
  } catch (err) {
    if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') throw err;
    return { success: false, api: 'unreachable', database: 'disconnected' };
  }
}

export async function getPublicStats(signal = null) {
  const res = await api.get('/public/stats', {
    timeout: DEFAULT_TIMEOUT,
    signal
  });
  return unwrapResponse(res);
}

export async function getPublicActivity(limit = 10, signal = null) {
  const res = await api.get('/public/activity', {
    params: { limit },
    timeout: DEFAULT_TIMEOUT,
    signal
  });
  return unwrapResponse(res);
}

export async function getPublicRecent(limit = 6, signal = null) {
  const res = await api.get('/public/recent', {
    params: { limit },
    timeout: DEFAULT_TIMEOUT,
    signal
  });
  return unwrapResponse(res);
}

export async function getPublicMap(params = {}, signal = null) {
  const res = await api.get('/public/map', {
    params,
    timeout: DEFAULT_TIMEOUT,
    signal
  });
  const data = unwrapResponse(res);
  return Array.isArray(data) ? data : (data?.items || []);
}

export async function getPublicCategories(signal = null) {
  const res = await api.get('/public/categories', {
    timeout: DEFAULT_TIMEOUT,
    signal
  });
  const data = unwrapResponse(res);
  return Array.isArray(data) ? data : [];
}

export async function getPublicImpact(signal = null) {
  const res = await api.get('/public/impact', {
    timeout: DEFAULT_TIMEOUT,
    signal
  });
  return unwrapResponse(res);
}

export default {
  getPublicHealth,
  getPublicStats,
  getPublicActivity,
  getPublicRecent,
  getPublicMap,
  getPublicCategories,
  getPublicImpact
};
