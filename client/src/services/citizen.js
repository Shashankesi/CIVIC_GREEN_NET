import api, { unwrapResponse } from './api'

export async function getDashboard() {
  const res = await api.get('/citizen/dashboard')
  return unwrapResponse(res)
}

export async function getContribution() {
  const res = await api.get('/citizen/contribution')
  return unwrapResponse(res)
}

export async function getLeaderboard(params = {}) {
  const res = await api.get('/citizen/leaderboard', { params })
  return unwrapResponse(res)
}

export async function getCommunityPulse(params = {}) {
  const res = await api.get('/citizen/community-pulse', { params })
  return unwrapResponse(res)
}

export async function getActivity(params = {}) {
  const res = await api.get('/citizen/activity', { params })
  return unwrapResponse(res)
}

export async function getFollowed(params = {}) {
  const res = await api.get('/citizen/followed', { params })
  return unwrapResponse(res)
}

export async function getProfile() {
  const res = await api.get('/citizen/profile')
  return unwrapResponse(res)
}

export async function updateProfile(data) {
  const res = await api.patch('/citizen/profile', data)
  return unwrapResponse(res)
}

export async function getPreferences() {
  const res = await api.get('/citizen/preferences')
  return unwrapResponse(res)
}

export async function updatePreferences(data) {
  const res = await api.patch('/citizen/preferences', data)
  return unwrapResponse(res)
}

export default {
  getDashboard,
  getContribution,
  getLeaderboard,
  getCommunityPulse,
  getActivity,
  getFollowed,
  getProfile,
  updateProfile,
  getPreferences,
  updatePreferences
}
