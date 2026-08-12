import api, { unwrapResponse } from './api'

export async function getSettings() {
  const res = await api.get('/settings')
  return unwrapResponse(res)
}

export async function updateSettings(payload) {
  const res = await api.put('/settings', payload)
  return unwrapResponse(res)
}

export default { getSettings, updateSettings }
