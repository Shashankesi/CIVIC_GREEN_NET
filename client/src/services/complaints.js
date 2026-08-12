import api, { getTokens } from './api'

// Backend wraps responses as { success, message, data } for complaint routes.
// These helpers unwrap the inner payload so components receive it directly.

function unwrap(res) {
  // res.data is the HTTP body. If it has a `data` field, return that; else return body.
  const body = res && res.data;
  if (body && typeof body === 'object' && 'data' in body) return body.data;
  return body;
}

async function createComplaint(formData) {
  // formData is a FormData instance
  const res = await api.post('/complaints', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  return unwrap(res);
}

async function listComplaints(params) {
  const res = await api.get('/complaints', { params });
  return unwrap(res);
}

async function getComplaint(id) {
  const res = await api.get(`/complaints/${id}`);
  return unwrap(res);
}

async function getTimeline(id) {
  const res = await api.get(`/complaints/${id}/timeline`);
  return unwrap(res);
}

async function changeStatus(id, formData) {
  const res = await api.post(`/complaints/${id}/status`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  return unwrap(res);
}

async function searchComplaints(params) {
  const res = await api.get('/complaints/search', { params });
  return unwrap(res);
}

async function getSimilar(id) {
  const res = await api.get(`/complaints/${id}/similar`);
  return unwrap(res);
}

async function heatmap(params) {
  const res = await api.get('/complaints/heatmap', { params });
  const body = unwrap(res);
  if (Array.isArray(body)) return body
  if (Array.isArray(body?.items)) return body.items
  return []
}

async function bboxQuery(params) {
  const res = await api.get('/complaints/bbox', { params })
  const body = unwrap(res)
  if (Array.isArray(body)) return body
  if (Array.isArray(body?.items)) return body.items
  return []
}

async function nearby(params) {
  const res = await api.get('/complaints/nearby', { params })
  const body = unwrap(res)
  if (Array.isArray(body)) return body
  if (Array.isArray(body?.items)) return body.items
  return []
}

async function getPublicStats() {
  const res = await api.get('/complaints/public-stats');
  return unwrap(res);
}

export default { createComplaint, listComplaints, getComplaint, getTimeline, changeStatus, searchComplaints, getSimilar, heatmap, bboxQuery, nearby, getPublicStats, unwrap };
