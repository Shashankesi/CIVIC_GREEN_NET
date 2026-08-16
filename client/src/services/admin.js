import api, { unwrapResponse } from './api'

// ---- Dashboard / Analytics ----
export async function getDashboard(params = {}) {
  const res = await api.get('/admin/dashboard', { params })
  return unwrapResponse(res)
}

export async function listUsers(params = {}) {
  const res = await api.get('/admin/users', { params })
  return unwrapResponse(res)
}

export async function getUserStats() {
  const res = await api.get('/admin/users/stats')
  return unwrapResponse(res)
}

export async function createUser(payload) {
  const res = await api.post('/admin/users', payload)
  return unwrapResponse(res)
}

export async function exportUsersCsv(params = {}) {
  const res = await api.get('/admin/users/export', { params, responseType: 'blob' })
  return res.data
}

export async function getUser(id) {
  const res = await api.get(`/admin/users/${id}`)
  return unwrapResponse(res)
}

export async function updateUser(id, fields) {
  const res = await api.put(`/admin/users/${id}`, fields)
  return unwrapResponse(res)
}

export async function updateUserRole(id, role, departmentId = null, designation = null, reason = '') {
  const res = await api.put(`/admin/users/${id}/role`, { role, departmentId, designation, reason })
  return unwrapResponse(res)
}

export async function updateUserStatus(id, status, reason = '') {
  const res = await api.put(`/admin/users/${id}/status`, { status, reason })
  return unwrapResponse(res)
}

export async function approveOfficer(id) {
  const res = await api.post(`/admin/users/${id}/approve`)
  return unwrapResponse(res)
}

export async function getOfficerFullProfile(id) {
  const res = await api.get(`/admin/officers/${id}/full-profile`)
  return unwrapResponse(res)
}

// ---- Departments ----
export async function listDepartments(params = {}) {
  const res = await api.get('/admin/departments', { params })
  return unwrapResponse(res)
}

export async function getDepartment(id) {
  const res = await api.get(`/admin/departments/${id}`)
  return unwrapResponse(res)
}

export async function createDepartment(payload) {
  const res = await api.post('/admin/departments', payload)
  return unwrapResponse(res)
}

export async function updateDepartment(id, payload) {
  const res = await api.put(`/admin/departments/${id}`, payload)
  return unwrapResponse(res)
}

export async function deleteDepartment(id) {
  const res = await api.delete(`/admin/departments/${id}`)
  return unwrapResponse(res)
}

export async function listOfficers() {
  const res = await api.get('/admin/departments/officers')
  return unwrapResponse(res)
}

// ---- Assignments ----
export async function assignComplaint(complaintId, officerId, departmentId = null) {
  const payload = typeof complaintId === 'object' && complaintId !== null
    ? complaintId
    : { complaintId, officerId, departmentId }
  const res = await api.post('/admin/assignments', payload)
  return unwrapResponse(res)
}

export async function unassignComplaint(complaintId) {
  const res = await api.post(`/admin/assignments/${complaintId}/unassign`)
  return unwrapResponse(res)
}

// ---- Complaints ----
export async function listComplaints(params = {}) {
  const res = await api.get('/admin/complaints', { params })
  return unwrapResponse(res)
}
export const listAdminComplaints = listComplaints;

export async function getComplaint(id) {
  const res = await api.get(`/admin/complaints/${id}`)
  return unwrapResponse(res)
}
export const getAdminComplaint = getComplaint;

export async function updateAdminComplaint(id, fields) {
  const res = await api.patch(`/admin/complaints/${id}`, fields)
  return unwrapResponse(res)
}

// ---- Reports ----
export async function getReportSummary(params = {}) {
  const res = await api.get('/admin/reports/summary', { params })
  return unwrapResponse(res)
}

export async function getReportComplaints(params = {}) {
  const res = await api.get('/admin/reports/complaints', { params })
  return unwrapResponse(res)
}

export async function exportReport(params = {}) {
  const res = await api.get('/admin/reports/export', { params, responseType: 'blob' })
  return res.data
}
export const exportComplaintsReport = exportReport;

export async function listAuditLogs(params = {}) {
  const res = await api.get('/admin/audit-logs', { params })
  return unwrapResponse(res)
}
export const getAuditLogs = listAuditLogs;

export async function exportAuditLogs(params = {}) {
  const res = await api.get('/admin/audit-logs/export', { params, responseType: 'blob' })
  return res.data
}

export async function getSystemHealth() {
  const res = await api.get('/admin/system-health')
  return unwrapResponse(res)
}

export async function listEmailLogs(params = {}) {
  const res = await api.get('/admin/email-logs', { params })
  return unwrapResponse(res)
}
export const getEmailLogs = listEmailLogs;

export async function getEmailStats() {
  const res = await api.get('/admin/email-stats')
  return unwrapResponse(res)
}

export async function retryEmail(id) {
  const res = await api.post(`/admin/email-logs/${id}/retry`)
  return unwrapResponse(res)
}

export async function getOfficerSummary() {
  const res = await api.get('/admin/officers/summary')
  return unwrapResponse(res)
}

export async function verifyDocument(officerId, type) {
  const res = await api.post(`/admin/officers/${officerId}/documents/${type}/verify`)
  return unwrapResponse(res)
}

export async function rejectDocument(officerId, type, reason) {
  const res = await api.post(`/admin/officers/${officerId}/documents/${type}/reject`, { reason })
  return unwrapResponse(res)
}

export default {
  getDashboard,
  listUsers,
  getUserStats,
  createUser,
  exportUsersCsv,
  getUser,
  updateUser,
  updateUserRole,
  updateUserStatus,
  approveOfficer,
  listDepartments,
  getDepartment,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  listOfficers,
  assignComplaint,
  unassignComplaint,
  listComplaints,
  listAdminComplaints,
  getComplaints: listComplaints,
  getComplaint,
  getAdminComplaint,
  updateAdminComplaint,
  getReportSummary,
  getReportComplaints,
  exportReport,
  exportComplaintsReport,
  listAuditLogs,
  getAuditLogs,
  exportAuditLogs,
  getSystemHealth,
  listEmailLogs,
  getEmailLogs,
  getEmailStats,
  retryEmail,
  getOfficerSummary,
  verifyDocument,
  rejectDocument
}
