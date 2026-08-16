const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const { success, error } = require('../utils/response');
const governanceAnalytics = require('../services/analytics/governanceAnalytics');
const departmentAnalytics = require('../services/analytics/departmentAnalytics');
const officerAnalytics = require('../services/analytics/officerAnalytics');
const slaAnalytics = require('../services/analytics/slaAnalytics');
const wardAnalytics = require('../services/analytics/wardAnalytics');
const auditAnalytics = require('../services/analytics/auditAnalytics');
const dataQualityService = require('../services/analytics/dataQualityService');
const reportService = require('../services/analytics/reportService');
const { generateAiText } = require('../services/ai/aiProvider');

// 1. Executive KPIs
const getExecutiveKpis = asyncHandler(async (req, res) => {
  const { timeframe, startDate, endDate, departmentId, category } = req.query;
  const kpis = await governanceAnalytics.getExecutiveKpis({ timeframe, startDate, endDate, departmentId, category });
  return success(res, kpis);
});

// 2. Operations Trends
const getOperationsTrends = asyncHandler(async (req, res) => {
  const { timeframe, startDate, endDate } = req.query;
  const trends = await governanceAnalytics.getOperationsTrends({ timeframe, startDate, endDate });
  return success(res, trends);
});

// 3. Category Analytics
const getCategoryAnalytics = asyncHandler(async (req, res) => {
  const { timeframe, startDate, endDate } = req.query;
  const categories = await governanceAnalytics.getCategoryAnalytics({ timeframe, startDate, endDate });
  return success(res, categories);
});

// 4. Priority Analytics
const getPriorityAnalytics = asyncHandler(async (req, res) => {
  const { timeframe, startDate, endDate } = req.query;
  const priorities = await governanceAnalytics.getPriorityAnalytics({ timeframe, startDate, endDate });
  return success(res, priorities);
});

// 5. Critical Backlog & Operations
const getCriticalBacklog = asyncHandler(async (req, res) => {
  const criticalOps = await governanceAnalytics.getCriticalOperationsBacklog();
  return success(res, criticalOps);
});

// 6. Department Performance
const getDepartmentPerformance = asyncHandler(async (req, res) => {
  const { timeframe, startDate, endDate } = req.query;
  const depts = await departmentAnalytics.getDepartmentPerformanceTable({ timeframe, startDate, endDate });
  return success(res, depts);
});

const getDepartmentWorkspace = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { timeframe, startDate, endDate } = req.query;
  const workspace = await departmentAnalytics.getDepartmentWorkspace(id, { timeframe, startDate, endDate });
  if (!workspace) {
    return error(res, 'Department not found', 404);
  }
  return success(res, workspace);
});

// 7. Officer Performance
const getOfficerPerformance = asyncHandler(async (req, res) => {
  const { timeframe, startDate, endDate, departmentId } = req.query;
  const officers = await officerAnalytics.getOfficerPerformanceTable({ timeframe, startDate, endDate, departmentId });
  return success(res, officers);
});

const getOfficerWorkspace = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { timeframe, startDate, endDate } = req.query;
  const workspace = await officerAnalytics.getOfficerWorkspace(id, { timeframe, startDate, endDate });
  if (!workspace) {
    return error(res, 'Officer not found', 404);
  }
  return success(res, workspace);
});

// 8. SLA Intelligence
const getSlaIntelligence = asyncHandler(async (req, res) => {
  const { timeframe, startDate, endDate } = req.query;
  const sla = await slaAnalytics.getSlaIntelligence({ timeframe, startDate, endDate });
  return success(res, sla);
});

// 9. Ward & Zone Scorecards
const getWardScorecards = asyncHandler(async (req, res) => {
  const { timeframe, startDate, endDate } = req.query;
  const wards = await wardAnalytics.getWardScorecards({ timeframe, startDate, endDate });
  return success(res, wards);
});

const getZoneScorecards = asyncHandler(async (req, res) => {
  const { timeframe, startDate, endDate } = req.query;
  const zones = await wardAnalytics.getZoneScorecards({ timeframe, startDate, endDate });
  return success(res, zones);
});

// 10. Audit Analytics
const getAuditAnalytics = asyncHandler(async (req, res) => {
  const { limit, offset, action, role, userId } = req.query;
  const audit = await auditAnalytics.getAuditAnalytics({ limit, offset, action, role, userId });
  return success(res, audit);
});

const getAccountabilityTimeline = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const timeline = await auditAnalytics.getAccountabilityTimeline(id);
  return success(res, timeline);
});

// 11. Data Quality & Alerts
const getDataQuality = asyncHandler(async (req, res) => {
  const report = await dataQualityService.getDataQualityReport();
  return success(res, report);
});

const getGovernanceAlerts = asyncHandler(async (req, res) => {
  const alerts = await dataQualityService.getGovernanceAlerts();
  return success(res, alerts);
});

// 12. AI Executive Summary
const generateAiExecutiveSummary = asyncHandler(async (req, res) => {
  const { timeframe = '30d' } = req.body;
  const kpis = await governanceAnalytics.getExecutiveKpis({ timeframe });
  const depts = await departmentAnalytics.getDepartmentPerformanceTable({ timeframe });
  const sla = await slaAnalytics.getSlaIntelligence({ timeframe });

  const lowestSlaDept = [...depts].sort((a, b) => a.slaCompliance - b.slaCompliance)[0];
  const topVolumeDept = [...depts].sort((a, b) => b.total - a.total)[0];

  const prompt = `
You are the Chief Municipal Operations Officer AI for Civic GreenNet.
Generate an executive briefing based strictly on the following validated database statistics:

TOTAL COMPLAINTS: ${kpis.total}
COMPLETED RESOLUTIONS: ${kpis.completed} (${kpis.resolutionRate}% resolution rate)
SLA COMPLIANCE: ${kpis.slaCompliance}%
ACTIVE CRITICAL TICKETS: ${kpis.critical}
OVERDUE CASES: ${kpis.overdue}
GOVERNANCE HEALTH SCORE: ${kpis.healthScore.score}/100 (${kpis.healthScore.status})
LOWEST SLA DEPARTMENT: ${lowestSlaDept ? `${lowestSlaDept.name} (${lowestSlaDept.slaCompliance}%)` : 'None'}
TOP VOLUME DEPARTMENT: ${topVolumeDept ? `${topVolumeDept.name} (${topVolumeDept.total} cases)` : 'None'}

Provide:
1. Executive Assessment
2. Key Operational Risks & Bottlenecks
3. Recommended Resource Allocations & Action Items

Format cleanly with markdown bullet points. Do not invent any numbers not present above.
`;

  try {
    const aiText = await generateAiText(prompt, { maxTokens: 400 });
    return success(res, {
      summary: aiText,
      verifiedKpis: {
        total: kpis.total,
        resolutionRate: kpis.resolutionRate,
        slaCompliance: kpis.slaCompliance,
        critical: kpis.critical,
        healthScore: kpis.healthScore.score
      },
      generatedAt: new Date().toISOString()
    });
  } catch (err) {
    // Fallback template grounded in validated metrics
    const fallbackText = `### Executive Municipal Governance Assessment\n\n- **Overall Performance**: The municipality maintains a **${kpis.resolutionRate}% resolution rate** and **${kpis.slaCompliance}% SLA compliance** across **${kpis.total} total cases**.\n- **Operational Risks**: There are currently **${kpis.critical} critical issues** and **${kpis.overdue} overdue tickets** requiring immediate intervention.\n- **Department Focus**: ${lowestSlaDept ? `**${lowestSlaDept.name}** requires staffing review with SLA compliance at ${lowestSlaDept.slaCompliance}%.` : 'Department workloads are currently balanced.'}\n- **Recommendation**: Prioritize critical backlog triage and review overdue cases in lagging departments.`;
    return success(res, {
      summary: fallbackText,
      verifiedKpis: { total: kpis.total, resolutionRate: kpis.resolutionRate, slaCompliance: kpis.slaCompliance, critical: kpis.critical },
      generatedAt: new Date().toISOString()
    });
  }
});

// 13. Reports: Preview, Generate, History & Schedule
const previewReport = asyncHandler(async (req, res) => {
  const { reportType = 'executive_summary', filters = {} } = req.body;
  const reportData = await reportService.buildReportData(reportType, filters);
  return success(res, reportData);
});

const exportReport = asyncHandler(async (req, res) => {
  const format = req.params.format || req.query.format || 'csv';
  const { reportType = 'executive_summary', ...filters } = req.query;

  const report = await reportService.generateReport(reportType, format, filters, req.user?.id);

  if (!report || !report.content || (Buffer.isBuffer(report.content) && report.content.length === 0)) {
    return res.status(500).json({ success: false, message: 'Failed to generate report file: Empty payload.' });
  }

  res.setHeader('Content-Type', report.contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${report.filename}"`);
  return res.send(report.content);
});

const getReportHistory = asyncHandler(async (req, res) => {
  const { limit } = req.query;
  const history = await reportService.getReportHistory(parseInt(limit, 10) || 50);
  return success(res, history);
});

const listScheduledReports = asyncHandler(async (req, res) => {
  const schedules = await reportService.listSchedules();
  return success(res, schedules);
});

const getScheduledReport = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const schedule = await reportService.getScheduleById(id);
  if (!schedule) {
    return error(res, 'Scheduled report not found', 404);
  }
  return success(res, schedule);
});

const createScheduledReport = asyncHandler(async (req, res) => {
  const { title, reportType, frequency, recipientEmail } = req.body;
  if (!title || !reportType || !frequency || !recipientEmail) {
    return error(res, 'Missing required scheduling fields (title, reportType, frequency, recipientEmail)', 400);
  }
  try {
    const scheduled = await reportService.scheduleReport(req.body, req.user?.id);
    return res.status(201).json({ success: true, message: 'Created', data: scheduled, schedule: scheduled });
  } catch (err) {
    return error(res, err.message, err.statusCode || 400);
  }
});

const updateScheduledReport = asyncHandler(async (req, res) => {
  const { id } = req.params;
  try {
    const updated = await reportService.updateSchedule(id, req.body);
    return success(res, updated, 'Schedule updated successfully');
  } catch (err) {
    return error(res, err.message, err.statusCode || 400);
  }
});

const pauseScheduledReport = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updated = await reportService.pauseSchedule(id);
  if (!updated) return error(res, 'Schedule not found', 404);
  return success(res, updated, 'Schedule paused');
});

const resumeScheduledReport = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updated = await reportService.resumeSchedule(id);
  if (!updated) return error(res, 'Schedule not found', 404);
  return success(res, updated, 'Schedule resumed');
});

const deleteScheduledReport = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const deleted = await reportService.deleteSchedule(id);
  if (!deleted) return error(res, 'Schedule not found', 404);
  return success(res, { id }, 'Schedule deleted');
});

const runScheduledReportNow = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await reportService.runScheduleNow(id);
  return success(res, result, 'Report executed successfully');
});

const getSchedulerHealth = asyncHandler(async (req, res) => {
  const worker = require('../services/analytics/scheduledReportWorker');
  const health = await worker.getSchedulerHealth();
  return success(res, health);
});

module.exports = {
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
};

