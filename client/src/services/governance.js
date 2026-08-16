import api, { API_BASE, getTokens } from './api';

export const governanceApi = {
  // 1. Executive KPIs and Analytics
  getExecutiveKpis: (params) => api.get('/governance/executive-kpis', { params }).then(r => r.data.data),
  getOperationsTrends: (params) => api.get('/governance/trends', { params }).then(r => r.data.data),
  getCategoryAnalytics: (params) => api.get('/governance/categories', { params }).then(r => r.data.data),
  getPriorityAnalytics: (params) => api.get('/governance/priorities', { params }).then(r => r.data.data),
  getCriticalBacklog: () => api.get('/governance/critical-ops').then(r => r.data.data),

  // 2. Department Intelligence
  getDepartments: (params) => api.get('/governance/departments', { params }).then(r => r.data.data),
  getDepartmentWorkspace: (id, params) => api.get(`/governance/departments/${id}`, { params }).then(r => r.data.data),

  // 3. Officer Intelligence
  getOfficers: (params) => api.get('/governance/officers', { params }).then(r => r.data.data),
  getOfficerWorkspace: (id, params) => api.get(`/governance/officers/${id}`, { params }).then(r => r.data.data),

  // 4. SLA Intelligence
  getSlaIntelligence: (params) => api.get('/governance/sla', { params }).then(r => r.data.data),

  // 5. Ward & Zone Scorecards
  getWardScorecards: (params) => api.get('/governance/wards', { params }).then(r => r.data.data),
  getZoneScorecards: (params) => api.get('/governance/zones', { params }).then(r => r.data.data),

  // 6. Audit & Accountability
  getAuditAnalytics: (params) => api.get('/governance/audit', { params }).then(r => r.data.data),
  getAccountabilityTimeline: (complaintId) => api.get(`/governance/audit/timeline/${complaintId}`).then(r => r.data.data),

  // 7. Data Quality & Alerts
  getDataQuality: () => api.get('/governance/data-quality').then(r => r.data.data),
  getGovernanceAlerts: () => api.get('/governance/alerts').then(r => r.data.data),

  // 8. AI Executive Summary
  generateAiExecutiveSummary: (payload) => api.post('/governance/ai/executive-summary', payload).then(r => r.data.data),

  // 9. Report Builder, Exports, and History
  previewReport: (payload) => api.post('/governance/reports/preview', payload).then(r => r.data.data),
  getReportHistory: (params) => api.get('/governance/reports/history', { params }).then(r => r.data.data),
  
  // 10. Automated Scheduled Reports CRUD & Run Now
  getSchedules: () => api.get('/governance/reports/schedules').then(r => r.data.data),
  scheduleReport: (payload) => api.post('/governance/reports/schedule', payload).then(r => r.data.data),
  updateSchedule: (id, payload) => api.put(`/governance/reports/schedules/${id}`, payload).then(r => r.data.data),
  pauseSchedule: (id) => api.patch(`/governance/reports/schedules/${id}/pause`).then(r => r.data.data),
  resumeSchedule: (id) => api.patch(`/governance/reports/schedules/${id}/resume`).then(r => r.data.data),
  deleteSchedule: (id) => api.delete(`/governance/reports/schedules/${id}`).then(r => r.data.data),
  runScheduleNow: (id) => api.post(`/governance/reports/schedules/${id}/run-now`).then(r => r.data.data),
  getSchedulerHealth: () => api.get('/governance/scheduler/health').then(r => r.data.data),
  
  // 11. Authenticated Report Download
  downloadReport: async (format, params = {}) => {
    try {
      const res = await api.get(`/governance/reports/export/${format}`, {
        params,
        responseType: 'blob'
      });

      const contentType = res.headers['content-type'] || '';
      
      // If the backend sent JSON error inside blob
      if (contentType.includes('application/json')) {
        let errorMsg = 'Failed to export report';
        try {
          const text = await res.data.text();
          const json = JSON.parse(text);
          errorMsg = json.message || errorMsg;
        } catch (e) {
          /* use fallback */
        }
        throw new Error(errorMsg);
      }

      // Extract filename from Content-Disposition header
      let filename = `civicgreennet-${params.reportType ? params.reportType.replace(/_/g, '-') : 'report'}-${params.timeframe || '30d'}.${format === 'excel' ? 'xls' : format}`;
      const disposition = res.headers['content-disposition'];
      if (disposition && disposition.includes('filename=')) {
        const match = disposition.match(/filename="?([^";]+)"?/);
        if (match && match[1]) {
          filename = match[1].trim();
        }
      }

      // Determine proper MIME type for blob
      let mimeType = contentType;
      if (!mimeType || mimeType === 'text/plain') {
        if (format === 'csv') mimeType = 'text/csv; charset=utf-8';
        else if (format === 'excel' || format === 'xlsx') mimeType = 'application/vnd.ms-excel; charset=utf-8';
        else if (format === 'pdf') mimeType = 'application/pdf';
      }

      const blob = new Blob([res.data], { type: mimeType });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      return { success: true, filename };
    } catch (err) {
      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const json = JSON.parse(text);
          throw new Error(json.message || 'Unable to export report. Please try again.');
        } catch (parseErr) {
          if (parseErr.message && !parseErr.message.includes('JSON')) {
            throw parseErr;
          }
        }
      }
      throw err;
    }
  }
};

export default governanceApi;

