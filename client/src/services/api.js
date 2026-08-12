import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api';

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

const instance = axios.create({ baseURL: API_BASE });

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
	return config;
});

instance.interceptors.response.use(
	(res) => res,
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
				const newAccess = r.data.accessToken;
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

export async function updateProfile(fields) {
	const config = fields instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : {};
	const res = await instance.put('/auth/profile', fields, config);
	return unwrapResponse(res);
}

export { getTokens, setTokens, clearTokens, unwrapResponse };
export default instance;
