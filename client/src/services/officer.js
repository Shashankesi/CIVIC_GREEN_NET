import api, { unwrapResponse } from './api'

export async function getWorkload() {
  const res = await api.get('/officer/workload')
  return unwrapResponse(res)
}

export async function getAssignedComplaints(params = {}) {
  const res = await api.get('/officer/assigned', { params })
  return unwrapResponse(res)
}

export async function getDepartmentStats() {
  const res = await api.get('/officer/department-stats')
  return unwrapResponse(res)
}

export async function getDashboard() {
  const res = await api.get('/officer/dashboard')
  return unwrapResponse(res)
}

export async function getNearbyComplaints(params = {}) {
  const res = await api.get('/officer/complaints/nearby', { params })
  return unwrapResponse(res)
}

export async function getProfile() {
  const res = await api.get('/officer/profile')
  return unwrapResponse(res)
}

export async function acceptComplaint(id) {
  const res = await api.post(`/officer/complaints/${id}/accept`)
  return unwrapResponse(res)
}

export async function updateComplaintStatus(id, data) {
  const res = await api.post(`/officer/complaints/${id}/status`, data)
  return unwrapResponse(res)
}

export async function resolveComplaint(id, data) {
  const res = await api.post(`/officer/complaints/${id}/resolve`, data)
  return unwrapResponse(res)
}

export async function addNote(id, data) {
  const res = await api.post(`/officer/complaints/${id}/notes`, data)
  return unwrapResponse(res)
}

export async function getNotes(id) {
  const res = await api.get(`/officer/complaints/${id}/notes`)
  return unwrapResponse(res)
}

export async function aiChat(data) {
  const res = await api.post('/officer/ai/chat', data)
  return unwrapResponse(res)
}

export async function updateProfile(data) {
  const res = await api.patch('/officer/profile', data)
  return unwrapResponse(res)
}

export async function updateAvailability(availability) {
  const res = await api.patch('/officer/availability', { availability })
  return unwrapResponse(res)
}

export async function getActivity(page = 1) {
  const res = await api.get('/officer/activity', { params: { page } })
  return unwrapResponse(res)
}

export async function getPerformance() {
  const res = await api.get('/officer/performance')
  return unwrapResponse(res)
}

export async function declineAssignment(id, reason) {
  const res = await api.post(`/officer/complaints/${id}/decline`, { reason })
  return unwrapResponse(res)
}

export async function startWork(id) {
  const res = await api.post(`/officer/complaints/${id}/start-work`)
  return unwrapResponse(res)
}

export default {
  getWorkload,
  getAssignedComplaints,
  getDepartmentStats,
  getDashboard,
  getNearbyComplaints,
  getProfile,
  updateProfile,
  acceptComplaint,
  declineAssignment,
  startWork,
  updateComplaintStatus,
  resolveComplaint,
  addNote,
  getNotes,
  aiChat,
  updateAvailability,
  getActivity,
  getPerformance
}
