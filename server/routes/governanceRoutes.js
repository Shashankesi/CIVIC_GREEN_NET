const express = require('express');
const router = express.Router();
const {
  getExecutiveKpis,
  getOperationsTrends,
  getCategoryAnalytics,
  getPriorityAnalytics,
  getCriticalBacklog,
  getDepartmentPerformance,
  getDepartmentWorkspace,
  getOfficerPerformance,
  getOfficerWorkspace,
  getSlaIntelligence,
  getWardScorecards,
  getZoneScorecards,
  getAuditAnalytics,
  getAccountabilityTimeline,
  getDataQuality,
  getGovernanceAlerts,
  generateAiExecutiveSummary,
  previewReport,
  exportReport,
  getReportHistory,
  listScheduledReports,
  getScheduledReport,
  createScheduledReport,
  updateScheduledReport,
  pauseScheduledReport,
  resumeScheduledReport,
  deleteScheduledReport,
  runScheduledReportNow,
  getSchedulerHealth
} = require('../controllers/governanceController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// All Governance endpoints require Admin authentication & authorization
router.use(authenticate, authorize('admin'));

// 1. Executive KPIs, Trends, and Health Score
router.get('/executive-kpis', getExecutiveKpis);
router.get('/trends', getOperationsTrends);
router.get('/categories', getCategoryAnalytics);
router.get('/priorities', getPriorityAnalytics);
router.get('/critical-ops', getCriticalBacklog);

// 2. Department Intelligence
router.get('/departments', getDepartmentPerformance);
router.get('/departments/:id', getDepartmentWorkspace);

// 3. Officer Intelligence
router.get('/officers', getOfficerPerformance);
router.get('/officers/:id', getOfficerWorkspace);

// 4. SLA Intelligence
router.get('/sla', getSlaIntelligence);

// 5. Ward and Zone Scorecards
router.get('/wards', getWardScorecards);
router.get('/zones', getZoneScorecards);

// 6. Audit & Accountability
router.get('/audit', getAuditAnalytics);
router.get('/audit/timeline/:id', getAccountabilityTimeline);

// 7. Data Quality & Alerts
router.get('/data-quality', getDataQuality);
router.get('/alerts', getGovernanceAlerts);

// 8. AI Executive Summary
router.post('/ai/executive-summary', generateAiExecutiveSummary);
router.post('/ai-executive-summary', generateAiExecutiveSummary);

// 9. Report Builder, Exports, and History
router.post('/reports/preview', previewReport);
router.get('/reports/export', exportReport);
router.get('/reports/export/:format', exportReport);
router.get('/reports/history', getReportHistory);

// 10. Automated Scheduled Reports Management & Execution
router.get('/reports/schedules', listScheduledReports);
router.get('/reports/schedules/:id', getScheduledReport);
router.post('/reports/schedule', createScheduledReport);
router.post('/reports/schedules', createScheduledReport);
router.put('/reports/schedules/:id', updateScheduledReport);
router.patch('/reports/schedules/:id/pause', pauseScheduledReport);
router.patch('/reports/schedules/:id/resume', resumeScheduledReport);
router.delete('/reports/schedules/:id', deleteScheduledReport);
router.post('/reports/schedules/:id/run-now', runScheduledReportNow);

// 11. Scheduler Observability & Diagnostics
router.get('/scheduler/health', getSchedulerHealth);

module.exports = router;

