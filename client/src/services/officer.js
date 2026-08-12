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

export default { getWorkload, getAssignedComplaints, getDepartmentStats }
