import api, { unwrapResponse } from './api'

// Backend wraps responses as { success, message, data } for notification routes.
const unwrap = unwrapResponse;

async function list(page = 1) {
  const res = await api.get('/notifications', { params: { page } });
  return unwrap(res);
}

async function markRead(id) {
  const res = await api.post(`/notifications/${id}/read`);
  return unwrap(res);
}

async function markAll() {
  const res = await api.post('/notifications/read-all');
  return unwrap(res);
}

export default { list, markRead, markAll, unwrap };
