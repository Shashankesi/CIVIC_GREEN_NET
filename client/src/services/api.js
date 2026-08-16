import axios from 'axios';

export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';

// Simple token store using localStorage
const TOKEN_KEY = 'cgn_tokens';
function getTokens() {
	try {
		return JSON.parse(localStorage.getItem(TOKEN_KEY) || 'null');
	} catch (e) {
		return null;
	}
}

function setTokens(tokens) {
	localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
}

function clearTokens() {
	localStorage.removeItem(TOKEN_KEY);
}

function unwrapResponse(res) {
  const body = res && res.data;
  if (body && typeof body === 'object' && 'data' in body) {
    return body.data;
  }
  return body;
}

// In-flight request deduplication & short-term cache for GET requests
const inFlightRequests = new Map();
const getCache = new Map();
const CACHE_DEFAULT_TTL = 3000; // 3 seconds for deduplication / snappy tab switching

function generateCacheKey(config) {
  if (config.method && config.method.toLowerCase() !== 'get') return null;
  const url = config.url || '';
  const params = config.params ? JSON.stringify(config.params) : '';
  return `${url}?${params}`;
}

export function invalidateApiCache(pattern = null) {
  if (!pattern) {
    getCache.clear();
    return;
  }
  for (const key of getCache.keys()) {
    if (key.includes(pattern)) {
      getCache.delete(key);
    }
  }
}

const instance = axios.create({ baseURL: API_BASE, timeout: 15000 });

let isRefreshing = false;
let refreshQueue = [];

function processQueue(error, token = null) {
	refreshQueue.forEach((prom) => {
		if (error) prom.reject(error);
		else prom.resolve(token);
	});
	refreshQueue = [];
}

instance.interceptors.request.use((config) => {
	const tokens = getTokens();
	if (tokens && tokens.accessToken) {
		config.headers.Authorization = `Bearer ${tokens.accessToken}`;
	}
  // Attach correlation ID if available
  if (!config.headers['X-Request-ID']) {
    config.headers['X-Request-ID'] = `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }
	return config;
});

instance.interceptors.response.use(
	(res) => {
    // Invalidate relevant cache on mutations
    const method = (res.config?.method || '').toLowerCase();
    if (['post', 'put', 'patch', 'delete'].includes(method)) {
      invalidateApiCache();
    }
    return res;
  },
	async (err) => {
		const original = err.config;
		if (!original || original._retry) return Promise.reject(err);
		if (err.response && err.response.status === 401) {
			const tokens = getTokens();
			if (!tokens || !tokens.refreshToken) return Promise.reject(err);
			if (isRefreshing) {
				return new Promise((resolve, reject) => {
					refreshQueue.push({ resolve, reject });
				})
					.then((token) => {
						original.headers.Authorization = `Bearer ${token}`;
						return axios(original);
					})
					.catch((e) => Promise.reject(e));
			}

			isRefreshing = true;
			original._retry = true;
			try {
				const r = await axios.post(`${API_BASE}/auth/refresh`, { refreshToken: tokens.refreshToken });
				const unwrapped = unwrapResponse(r);
				const newAccess = unwrapped?.accessToken || r.data?.accessToken;
				if (!newAccess) {
					throw new Error('Refresh token invalid');
				}
				const newTokens = { accessToken: newAccess, refreshToken: tokens.refreshToken };
				setTokens(newTokens);
				processQueue(null, newAccess);
				original.headers.Authorization = `Bearer ${newAccess}`;
				return axios(original);
			} catch (refreshErr) {
				processQueue(refreshErr, null);
				clearTokens();
				return Promise.reject(refreshErr);
			} finally {
				isRefreshing = false;
			}
		}
		return Promise.reject(err);
	}
);

// Wrapped cached get helper
export async function cachedGet(url, config = {}, ttlMs = CACHE_DEFAULT_TTL) {
  const fullConfig = { ...config, url, method: 'get' };
  const key = generateCacheKey(fullConfig);
  
  if (key) {
    const cached = getCache.get(key);
    if (cached && (Date.now() - cached.timestamp < ttlMs)) {
      return cached.data;
    }
    if (inFlightRequests.has(key)) {
      return inFlightRequests.get(key);
    }
  }

  const promise = instance.get(url, config)
    .then((res) => {
      const data = unwrapResponse(res);
      if (key) {
        getCache.set(key, { data, timestamp: Date.now() });
        inFlightRequests.delete(key);
      }
      return data;
    })
    .catch((err) => {
      if (key) inFlightRequests.delete(key);
      throw err;
    });

  if (key) inFlightRequests.set(key, promise);
  return promise;
}

export async function updateProfile(fields) {
	const config = fields instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : {};
	const res = await instance.put('/auth/profile', fields, config);
	return unwrapResponse(res);
}

export { getTokens, setTokens, clearTokens, unwrapResponse };
export default instance;
