const db = require('../../config/db');
const logger = require('../../utils/logger');
const { getExecutiveKpis } = require('./governanceAnalytics');
const { getDepartmentPerformanceTable } = require('./departmentAnalytics');
const { getOfficerPerformanceTable } = require('./officerAnalytics');
const { getSlaIntelligence } = require('./slaAnalytics');
const { getWardScorecards } = require('./wardAnalytics');
const { getAuditAnalytics } = require('./auditAnalytics');
const exportService = require('./exportService');
const emailService = require('../emailService');

/**
 * 1. Build and Format Report Data based on Type
 */
async function buildReportData(reportType, filters = {}) {
  const { timeframe = '30d', startDate, endDate, departmentId, category, priority, status } = filters;

  switch (reportType) {
    case 'executive_summary': {
      const kpis = await getExecutiveKpis({ timeframe, startDate, endDate });
      const depts = await getDepartmentPerformanceTable({ timeframe, startDate, endDate });
      const sla = await getSlaIntelligence({ timeframe, startDate, endDate });

      return {
        title: 'Executive Governance Summary Report',
        kpis: {
          'Total Complaints': kpis.total,
          'Resolution Rate': `${kpis.resolutionRate}%`,
          'SLA Compliance': `${kpis.slaCompliance}%`,
          'Active Backlog': kpis.activeBacklog,
          'Critical Cases': kpis.critical,
          'Overdue Cases': kpis.overdue,
          'Avg Resolution Time': `${kpis.avgResolutionHours}h`,
          'Health Score': `${kpis.healthScore.score} (${kpis.healthScore.status})`
        },
        columns: [
          { header: 'Department', accessor: 'name' },
          { header: 'Total Cases', accessor: 'total' },
          { header: 'Resolved', accessor: 'resolved' },
          { header: 'Overdue', accessor: 'overdue' },
          { header: 'Resolution Rate', accessor: r => `${r.resolutionRate}%` },
          { header: 'SLA Compliance', accessor: r => `${r.slaCompliance}%` },
          { header: 'Avg Hours', accessor: r => `${r.avgResolutionHours}h` }
        ],
        rows: depts
      };
    }

    case 'department': {
      const depts = await getDepartmentPerformanceTable({ timeframe, startDate, endDate });
      return {
        title: 'Department Operational Performance Report',
        kpis: {
          'Total Departments': depts.length,
          'Avg Resolution Rate': `${(depts.reduce((a, b) => a + b.resolutionRate, 0) / Math.max(1, depts.length)).toFixed(1)}%`,
          'Avg SLA Compliance': `${(depts.reduce((a, b) => a + b.slaCompliance, 0) / Math.max(1, depts.length)).toFixed(1)}%`
        },
        columns: [
          { header: 'Department Name', accessor: 'name' },
          { header: 'Code', accessor: 'code' },
          { header: 'Total Cases', accessor: 'total' },
          { header: 'Open', accessor: 'open' },
          { header: 'In Progress', accessor: 'inProgress' },
          { header: 'Resolved', accessor: 'resolved' },
          { header: 'Overdue', accessor: 'overdue' },
          { header: 'Critical', accessor: 'critical' },
          { header: 'Active Officers', accessor: 'activeOfficers' },
          { header: 'Resolution %', accessor: r => `${r.resolutionRate}%` },
          { header: 'SLA Compliance %', accessor: r => `${r.slaCompliance}%` }
        ],
        rows: depts
      };
    }

    case 'officer': {
      const officers = await getOfficerPerformanceTable({ timeframe, startDate, endDate, departmentId });
      return {
        title: 'Officer Workload & Fair Performance Report',
        kpis: {
          'Total Officers': officers.length,
          'Avg Fair Score': `${Math.round(officers.reduce((a, b) => a + b.fairScore, 0) / Math.max(1, officers.length))}/100`,
          'Active Workload': officers.reduce((a, b) => a + b.activeWorkload, 0)
        },
        columns: [
          { header: 'Officer Name', accessor: 'name' },
          { header: 'Department', accessor: 'departmentName' },
          { header: 'Status', accessor: 'status' },
          { header: 'Assigned Total', accessor: 'assignedTotal' },
          { header: 'Active Workload', accessor: 'activeWorkload' },
          { header: 'Resolved Cases', accessor: 'resolvedCount' },
          { header: 'Overdue Cases', accessor: 'overdueCount' },
          { header: 'Resolution %', accessor: r => `${r.resolutionRate}%` },
          { header: 'SLA Compliance %', accessor: r => `${r.slaCompliance}%` },
          { header: 'Fair Score', accessor: r => `${r.fairScore}/100` }
        ],
        rows: officers
      };
    }

    case 'sla': {
      const sla = await getSlaIntelligence({ timeframe, startDate, endDate });
      return {
        title: 'SLA Compliance & Breach Intelligence Report',
        kpis: {
          'Overall SLA Compliance': `${sla.summary.overallSlaCompliance}%`,
          'Active Overdue': sla.summary.activeOverdue,
          'Active Due Soon': sla.summary.activeDueSoon,
          'Critical SLA Risk': sla.summary.criticalSlaRisk
        },
        columns: [
          { header: 'Department', accessor: 'name' },
          { header: 'Total Cases', accessor: 'total' },
          { header: 'Resolved Cases', accessor: 'resolved' },
          { header: 'On-Time Resolved', accessor: 'onTimeResolved' },
          { header: 'Active Overdue', accessor: 'overdueActive' },
          { header: 'SLA Compliance Rate', accessor: r => `${r.slaCompliance}%` }
        ],
        rows: sla.departmentRankings
      };
    }

    case 'ward': {
      const wards = await getWardScorecards({ timeframe, startDate, endDate });
      return {
        title: 'Municipal Ward Governance Scorecards Report',
        kpis: {
          'Covered Wards': wards.length,
          'Total Complaints': wards.reduce((a, b) => a + b.totalComplaints, 0),
          'Active Hotspots': wards.reduce((a, b) => a + b.hotspotCount, 0)
        },
        columns: [
          { header: 'Ward Name', accessor: 'name' },
          { header: 'Ward Number', accessor: 'wardNumber' },
          { header: 'Total Complaints', accessor: 'totalComplaints' },
          { header: 'Open', accessor: 'open' },
          { header: 'Resolved', accessor: 'resolved' },
          { header: 'Overdue', accessor: 'overdue' },
          { header: 'Top Category', accessor: 'topCategory' },
          { header: 'Resolution Rate', accessor: r => `${r.resolutionRate}%` },
          { header: 'SLA Compliance', accessor: r => `${r.slaCompliance}%` },
          { header: 'AI Hotspots', accessor: 'hotspotCount' }
        ],
        rows: wards
      };
    }

    case 'complaints': {
      // Direct complaint dataset query with privacy sanitization
      let query = `
        SELECT
          c.id,
          c.title,
          c.category,
          c.priority,
          c.status,
          c.address,
          c.created_at,
          c.sla_due_at,
          c.resolution_at,
          d.name AS department_name,
          u.name AS officer_name
        FROM complaints c
        LEFT JOIN departments d ON d.id = c.department_id
        LEFT JOIN users u ON u.id = c.officer_id
        WHERE 1=1
      `;
      const params = [];

      if (departmentId && departmentId !== 'all') {
        params.push(parseInt(departmentId, 10));
        query += ` AND c.department_id = $${params.length}`;
      }
      if (category && category !== 'all') {
        params.push(category.toLowerCase());
        query += ` AND LOWER(c.category) = $${params.length}`;
      }
      if (status && status !== 'all') {
        params.push(status.toLowerCase());
        query += ` AND LOWER(c.status) = $${params.length}`;
      }

      query += ` ORDER BY c.created_at DESC LIMIT 500;`;
      const res = await db.query(query, params);

      return {
        title: 'Municipal Civic Complaints Report',
        kpis: { 'Total Extracted Records': res.rows.length },
        columns: [
          { header: 'Ticket ID', accessor: r => `CGN-${String(r.id).padStart(5, '0')}` },
          { header: 'Title', accessor: 'title' },
          { header: 'Category', accessor: 'category' },
          { header: 'Priority', accessor: 'priority' },
          { header: 'Status', accessor: 'status' },
          { header: 'Department', accessor: 'department_name' },
          { header: 'Officer', accessor: 'officer_name' },
          { header: 'Address', accessor: 'address' },
          { header: 'Submitted At', accessor: r => r.created_at ? new Date(r.created_at).toISOString() : '' }
        ],
        rows: res.rows
      };
    }

    default: {
      throw new Error(`Unsupported or invalid report type: "${reportType}"`);
    }
  }
}

/**
 * 2. Generate Export in Requested Format (CSV, Excel XML, PDF)
 */
async function generateReport(reportType, format = 'csv', filters = {}, userId = null, options = {}) {
  const startTime = options.startTime || Date.now();
  const reportData = await buildReportData(reportType, filters);
  const tfSuffix = filters.timeframe || '30d';
  const cleanReportType = reportType.replace(/_/g, '-');
  let filename = `civicgreennet-${cleanReportType}-${tfSuffix}`;

  if (format === 'csv') {
    content = exportService.generateCsv(reportData.rows, reportData.columns);
    contentType = 'text/csv; charset=utf-8';
    filename += '.csv';
  } else if (format === 'excel' || format === 'xlsx') {
    content = exportService.generateExcelXml(reportData.title, reportData.kpis, reportData.rows, reportData.columns);
    contentType = 'application/vnd.ms-excel; charset=utf-8';
    filename += '.xls';
  } else if (format === 'pdf') {
    const tableColumns = reportData.columns.map(c => c.header);
    const tableRows = reportData.rows.map(r => 
      reportData.columns.map(c => typeof c.accessor === 'function' ? c.accessor(r) : r[c.accessor])
    );
    content = await exportService.generatePdfBuffer(reportData.title, filters, reportData.kpis, [
      { title: 'Detailed Operational Data', columns: tableColumns, rows: tableRows }
    ]);
    contentType = 'application/pdf';
    filename += '.pdf';
  } else {
    content = exportService.generateCsv(reportData.rows, reportData.columns);
    contentType = 'text/csv; charset=utf-8';
    filename += '.csv';
  }

  const durationMs = Date.now() - startTime;
  const rowCount = reportData.rows ? reportData.rows.length : 0;
  const executionType = options.executionType || (options.scheduledReportId ? 'scheduled' : 'manual');
  const sizeBytes = Buffer.isBuffer(content) ? content.length : Buffer.byteLength(String(content), 'utf8');

  // Log in Report History
  let historyId = null;
  if (db._pool) {
    try {
      const insRes = await db.query(`
        INSERT INTO governance_report_history (
          report_name, report_type, filters, file_format, file_size_bytes,
          generated_by, status, scheduled_report_id, execution_type,
          execution_duration_ms, row_count, delivery_status
        )
        VALUES ($1, $2, $3, $4, $5, $6, 'completed', $7, $8, $9, $10, $11)
        RETURNING id;
      `, [
        reportData.title,
        reportType,
        JSON.stringify(filters || {}),
        format,
        sizeBytes,
        userId || null,
        options.scheduledReportId || null,
        executionType,
        durationMs,
        rowCount,
        options.deliveryStatus || 'not_applicable'
      ]);
      historyId = insRes.rows[0]?.id;
    } catch (e) {
      logger.warn('[ReportService history log warning]', { err: e.message });
    }
  }

  return {
    id: historyId,
    title: reportData.title,
    filename,
    contentType,
    content,
    format,
    summary: reportData.kpis,
    totalRows: rowCount,
    durationMs
  };
}

/**
 * 3. Fetch Report History
 */
async function getReportHistory(limit = 50) {
  if (!db._pool) return [];

  try {
    const res = await db.query(`
      SELECT
        h.id,
        h.report_name,
        h.report_type,
        h.filters,
        h.file_format,
        h.file_size_bytes,
        h.status,
        h.scheduled_report_id,
        h.execution_type,
        h.execution_duration_ms,
        h.row_count,
        h.delivery_status,
        h.error_message,
        h.created_at,
        u.name AS generated_by_name,
        s.title AS schedule_title
      FROM governance_report_history h
      LEFT JOIN users u ON u.id = h.generated_by
      LEFT JOIN scheduled_reports s ON s.id = h.scheduled_report_id
      ORDER BY h.created_at DESC
      LIMIT $1;
    `, [limit]);

    return res.rows.map(r => ({
      id: r.id,
      name: r.report_name,
      type: r.report_type,
      filters: r.filters,
      format: r.file_format,
      sizeBytes: r.file_size_bytes,
      sizeFormatted: r.file_size_bytes < 1024 ? `${r.file_size_bytes} B` : `${(r.file_size_bytes / 1024).toFixed(1)} KB`,
      status: r.status,
      scheduledReportId: r.scheduled_report_id,
      scheduleTitle: r.schedule_title,
      executionType: r.execution_type || 'manual',
      durationMs: r.execution_duration_ms || 0,
      rowCount: r.row_count || 0,
      deliveryStatus: r.delivery_status || 'not_applicable',
      errorMessage: r.error_message,
      generatedByName: r.generated_by_name || (r.execution_type === 'scheduled' ? 'Automated Scheduler' : 'System / Admin'),
      createdAt: r.created_at
    }));
  } catch (err) {
    logger.error('[ReportService getReportHistory Error]', { err: err.message });
    return [];
  }
}

/**
 * 4. List All Scheduled Reports
 */
async function listSchedules() {
  if (!db._pool) return [];
  try {
    const res = await db.query(`
      SELECT
        s.*,
        u.name AS created_by_name,
        u.email AS created_by_email
      FROM scheduled_reports s
      LEFT JOIN users u ON u.id = s.created_by
      ORDER BY s.created_at DESC;
    `);

    return res.rows.map(r => ({
      id: r.id,
      title: r.title,
      reportType: r.report_type,
      frequency: r.frequency,
      format: r.format || 'csv',
      timezone: r.timezone || 'Asia/Kolkata',
      filters: r.filters || {},
      recipientEmail: r.recipient_email,
      isActive: r.is_active,
      lastRunAt: r.last_run_at,
      nextRunAt: r.next_run_at,
      lastRunStatus: r.last_run_status || 'pending',
      lastError: r.last_error,
      runCount: r.run_count || 0,
      createdByName: r.created_by_name,
      createdAt: r.created_at
    }));
  } catch (err) {
    logger.error('[ReportService listSchedules Error]', { err: err.message });
    return [];
  }
}

/**
 * 5. Get Schedule by ID
 */
async function getScheduleById(id) {
  if (!db._pool) return null;
  try {
    const res = await db.query('SELECT * FROM scheduled_reports WHERE id = $1', [id]);
    return res.rows[0] || null;
  } catch (err) {
    logger.error('[ReportService getScheduleById Error]', { err: err.message });
    return null;
  }
}

/**
 * 6. Create Scheduled Report
 */
async function scheduleReport(data, userId) {
  if (!db._pool) return null;

  try {
    const worker = require('./scheduledReportWorker');
    const validation = worker.validateScheduleData(data);
    if (!validation.isValid) {
      const err = new Error(validation.errors.join('; '));
      err.statusCode = 400;
      throw err;
    }

    const {
      title,
      reportType,
      frequency,
      filters = {},
      recipientEmail,
      timezone = 'Asia/Kolkata',
      format = 'csv'
    } = data;

    const initialNextRun = worker.calculateNextRun(frequency, new Date(), timezone);

    const res = await db.query(`
      INSERT INTO scheduled_reports (
        title, report_type, frequency, filters, recipient_email,
        timezone, format, created_by, next_run_at, is_active, last_run_status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, 'pending')
      RETURNING *;
    `, [title, reportType, frequency, JSON.stringify(filters || {}), recipientEmail.trim(), timezone, format, userId || null, initialNextRun]);

    return res.rows[0];
  } catch (err) {
    logger.error('[ReportService scheduleReport Error]', { err: err.message });
    throw err;
  }
}

/**
 * 7. Update Scheduled Report
 */
async function updateSchedule(id, data) {
  if (!db._pool) return null;

  try {
    const existing = await getScheduleById(id);
    if (!existing) {
      const err = new Error('Scheduled report not found');
      err.statusCode = 404;
      throw err;
    }

    const title = data.title || existing.title;
    const reportType = data.reportType || existing.report_type;
    const frequency = data.frequency || existing.frequency;
    const recipientEmail = data.recipientEmail || existing.recipient_email;
    const timezone = data.timezone || existing.timezone || 'Asia/Kolkata';
    const format = data.format || existing.format || 'csv';
    const filters = data.filters !== undefined ? data.filters : existing.filters;

    const worker = require('./scheduledReportWorker');
    const nextRun = worker.calculateNextRun(frequency, new Date(), timezone);

    const res = await db.query(`
      UPDATE scheduled_reports
      SET title = $1,
          report_type = $2,
          frequency = $3,
          recipient_email = $4,
          timezone = $5,
          format = $6,
          filters = $7,
          next_run_at = $8
      WHERE id = $9
      RETURNING *;
    `, [title, reportType, frequency, recipientEmail.trim(), timezone, format, JSON.stringify(filters || {}), nextRun, id]);

    return res.rows[0];
  } catch (err) {
    logger.error('[ReportService updateSchedule Error]', { err: err.message });
    throw err;
  }
}

/**
 * 8. Pause Schedule
 */
async function pauseSchedule(id) {
  if (!db._pool) return null;
  const res = await db.query(`
    UPDATE scheduled_reports
    SET is_active = false
    WHERE id = $1
    RETURNING *;
  `, [id]);
  return res.rows[0] || null;
}

/**
 * 9. Resume Schedule
 */
async function resumeSchedule(id) {
  if (!db._pool) return null;
  const existing = await getScheduleById(id);
  if (!existing) return null;

  const worker = require('./scheduledReportWorker');
  const nextRun = worker.calculateNextRun(existing.frequency, new Date(), existing.timezone || 'Asia/Kolkata');

  const res = await db.query(`
    UPDATE scheduled_reports
    SET is_active = true,
        next_run_at = $1
    WHERE id = $2
    RETURNING *;
  `, [nextRun, id]);
  return res.rows[0] || null;
}

/**
 * 10. Delete Schedule
 */
async function deleteSchedule(id) {
  if (!db._pool) return false;
  const res = await db.query('DELETE FROM scheduled_reports WHERE id = $1 RETURNING id;', [id]);
  return res.rows.length > 0;
}

/**
 * 11. Run Schedule Now (Immediate Execution through Worker Engine)
 */
async function runScheduleNow(id) {
  if (!db._pool) throw new Error('Database not connected');
  const schedule = await getScheduleById(id);
  if (!schedule) {
    const err = new Error('Scheduled report not found');
    err.statusCode = 404;
    throw err;
  }

  const worker = require('./scheduledReportWorker');
  return worker.processScheduledReport(schedule, 'run_now');
}

module.exports = {
  buildReportData,
  generateReport,
  getReportHistory,
  listSchedules,
  getScheduleById,
  scheduleReport,
  updateSchedule,
  pauseSchedule,
  resumeSchedule,
  deleteSchedule,
  runScheduleNow
};

