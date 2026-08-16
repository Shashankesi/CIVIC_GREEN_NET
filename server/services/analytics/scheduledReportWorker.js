const os = require('os');
const db = require('../../config/db');
const logger = require('../../utils/logger');
const reportService = require('./reportService');
const emailService = require('../emailService');

const WORKER_ID = `worker-${os.hostname()}-${process.pid}`;

let workerInterval = null;
let lastTickAt = null;
const stats = {
  totalProcessed: 0,
  successfulRuns: 0,
  failedRuns: 0
};

/**
 * Valid Report Types, Frequencies, and Formats
 */
const VALID_REPORT_TYPES = ['executive_summary', 'department', 'officer', 'sla', 'ward', 'complaints'];
const VALID_FREQUENCIES = ['daily', 'weekly', 'monthly'];
const VALID_FORMATS = ['csv', 'excel', 'pdf'];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validate Schedule Input
 */
function validateScheduleData(data) {
  const errors = [];
  if (!data.title || typeof data.title !== 'string' || !data.title.trim()) {
    errors.push('Schedule title is required');
  }
  if (!data.reportType || !VALID_REPORT_TYPES.includes(data.reportType)) {
    errors.push(`Invalid reportType. Must be one of: ${VALID_REPORT_TYPES.join(', ')}`);
  }
  if (!data.frequency || !VALID_FREQUENCIES.includes(String(data.frequency).toLowerCase())) {
    errors.push(`Invalid frequency. Must be one of: ${VALID_FREQUENCIES.join(', ')}`);
  }
  if (!data.recipientEmail || typeof data.recipientEmail !== 'string' || !EMAIL_REGEX.test(data.recipientEmail.trim())) {
    errors.push('Valid recipientEmail is required');
  }
  if (data.format && !VALID_FORMATS.includes(String(data.format).toLowerCase())) {
    errors.push(`Invalid format. Must be one of: ${VALID_FORMATS.join(', ')}`);
  }
  if (data.timezone) {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: data.timezone });
    } catch (e) {
      errors.push(`Invalid IANA timezone: ${data.timezone}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Timezone-aware Next Run Calculation (09:00:00 in target timezone)
 */
function calculateNextRun(frequency, fromDate = new Date(), timezone = 'Asia/Kolkata') {
  const tz = timezone || 'Asia/Kolkata';
  const freq = String(frequency || 'daily').toLowerCase();
  const baseDate = fromDate instanceof Date ? fromDate : new Date(fromDate);

  // Determine current year, month, day in target timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false
  });
  const parts = formatter.formatToParts(baseDate);
  const getPart = type => parseInt(parts.find(p => p.type === type)?.value || 0, 10);

  const curYear = getPart('year');
  const curMonth = getPart('month') - 1; // 0-indexed
  const curDay = getPart('day');

  let targetYear = curYear;
  let targetMonth = curMonth;
  let targetDay = curDay;

  if (freq === 'daily') {
    targetDay += 1;
  } else if (freq === 'weekly') {
    // Next Monday
    const dateObj = new Date(Date.UTC(curYear, curMonth, curDay));
    const dayOfWeek = dateObj.getUTCDay(); // 0 is Sunday, 1 is Monday...
    const daysUntilNextMonday = ((1 - dayOfWeek + 7) % 7) || 7;
    targetDay += daysUntilNextMonday;
  } else if (freq === 'monthly') {
    // 1st of next month
    targetMonth += 1;
    targetDay = 1;
  } else {
    targetDay += 1;
  }

  // Construct target local date at 09:00:00
  // Handle month/year rollover cleanly
  const rolledDate = new Date(Date.UTC(targetYear, targetMonth, targetDay, 9, 0, 0, 0));

  // Determine UTC offset for target date in target timezone
  // Use Intl offset calculation
  const offsetFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    timeZoneName: 'shortOffset'
  });
  const tzName = offsetFormatter.formatToParts(rolledDate).find(p => p.type === 'timeZoneName')?.value || 'GMT';
  
  let offsetMinutes = 0;
  if (tzName.includes('+') || tzName.includes('-')) {
    const match = tzName.match(/GMT([+-])(\d+)(?::(\d+))?/);
    if (match) {
      const sign = match[1] === '+' ? 1 : -1;
      const hours = parseInt(match[2], 10);
      const mins = match[3] ? parseInt(match[3], 10) : 0;
      offsetMinutes = sign * (hours * 60 + mins);
    }
  } else if (tz.toLowerCase() === 'asia/kolkata' || tz.toLowerCase() === 'asia/calcutta') {
    offsetMinutes = 330; // +05:30
  }

  // UTC instant = local target - offset
  const utcMillis = Date.UTC(
    rolledDate.getUTCFullYear(),
    rolledDate.getUTCMonth(),
    rolledDate.getUTCDate(),
    9, 0, 0, 0
  ) - (offsetMinutes * 60 * 1000);

  return new Date(utcMillis);
}

/**
 * Acquire and lock due scheduled reports using PostgreSQL SKIP LOCKED
 */
async function acquireDueReports(workerId = WORKER_ID, limit = 10) {
  if (!db._pool) return [];

  const client = await db._pool.connect();
  try {
    await client.query('BEGIN');

    // Select due and unlocked (or stale locked > 15m) reports
    const selectQuery = `
      SELECT id FROM scheduled_reports
      WHERE is_active = true
        AND next_run_at <= now()
        AND (locked_at IS NULL OR locked_at < now() - INTERVAL '15 minutes')
      ORDER BY next_run_at ASC
      LIMIT $1
      FOR UPDATE SKIP LOCKED;
    `;
    const selRes = await client.query(selectQuery, [limit]);

    if (selRes.rows.length === 0) {
      await client.query('COMMIT');
      return [];
    }

    const ids = selRes.rows.map(r => r.id);

    // Mark as locked by this worker
    const lockQuery = `
      UPDATE scheduled_reports
      SET locked_at = now(), locked_by = $1
      WHERE id = ANY($2::int[])
      RETURNING *;
    `;
    const lockRes = await client.query(lockQuery, [workerId, ids]);
    await client.query('COMMIT');

    return lockRes.rows;
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('[ScheduledReportWorker acquireDueReports error]', { err: err.message });
    return [];
  } finally {
    client.release();
  }
}

/**
 * Process a single scheduled report with timing, email delivery, and state updates
 */
async function processScheduledReport(schedule, executionType = 'scheduled') {
  const startTime = Date.now();
  stats.totalProcessed += 1;
  const scheduleId = schedule.id;

  logger.info(`[ScheduledReportWorker] Executing report schedule #${scheduleId}: "${schedule.title}" (${schedule.report_type}, ${schedule.frequency})`);

  let reportResult = null;
  let errorMsg = null;
  let deliveryStatus = 'pending';

  try {
    // 1. Generate Report
    reportResult = await reportService.generateReport(
      schedule.report_type,
      schedule.format || 'csv',
      schedule.filters || {},
      schedule.created_by,
      {
        scheduledReportId: scheduleId,
        executionType,
        startTime
      }
    );

    // 2. Dispatch Email
    try {
      await emailService.sendScheduledReportEmail({
        report: reportResult,
        schedule,
        recipientEmail: schedule.recipient_email,
        executionType
      });
      deliveryStatus = 'delivered';
    } catch (emailErr) {
      deliveryStatus = 'failed';
      logger.error(`[ScheduledReportWorker] Email delivery failed for schedule #${scheduleId}:`, { err: emailErr.message });
    }

    // 3. Update Report History record with delivery status & duration
    if (reportResult?.id && db._pool) {
      const durationMs = Date.now() - startTime;
      await db.query(`
        UPDATE governance_report_history
        SET execution_duration_ms = $1, delivery_status = $2, row_count = $3
        WHERE id = $4
      `, [durationMs, deliveryStatus, reportResult.totalRows || 0, reportResult.id]);
    }

    // 4. Calculate Next Run
    const nextRun = calculateNextRun(schedule.frequency, new Date(), schedule.timezone || 'Asia/Kolkata');

    // 5. Update scheduled_reports state and release lock
    if (db._pool) {
      await db.query(`
        UPDATE scheduled_reports
        SET last_run_at = now(),
            last_run_status = 'completed',
            last_error = NULL,
            run_count = COALESCE(run_count, 0) + 1,
            next_run_at = $1,
            locked_at = NULL,
            locked_by = NULL
        WHERE id = $2;
      `, [nextRun, scheduleId]);
    }

    stats.successfulRuns += 1;
    logger.info(`[ScheduledReportWorker] Successfully executed schedule #${scheduleId} in ${Date.now() - startTime}ms. Next run: ${nextRun.toISOString()}`);

    return {
      success: true,
      scheduleId,
      reportResult,
      deliveryStatus,
      durationMs: Date.now() - startTime,
      nextRun
    };
  } catch (err) {
    stats.failedRuns += 1;
    errorMsg = err.message || 'Unknown execution error';
    logger.error(`[ScheduledReportWorker] Execution failed for schedule #${scheduleId}:`, { err: errorMsg });

    // Safe error recovery: calculate next run so it does not get stuck in a tight failing loop, and release lock
    const nextRun = calculateNextRun(schedule.frequency, new Date(), schedule.timezone || 'Asia/Kolkata');

    if (db._pool) {
      try {
        await db.query(`
          UPDATE scheduled_reports
          SET last_run_at = now(),
              last_run_status = 'failed',
              last_error = $1,
              next_run_at = $2,
              locked_at = NULL,
              locked_by = NULL
          WHERE id = $3;
        `, [errorMsg, nextRun, scheduleId]);

        // Log failed entry in history if no report was generated
        if (!reportResult?.id) {
          await db.query(`
            INSERT INTO governance_report_history (
              report_name, report_type, filters, file_format, generated_by, status,
              scheduled_report_id, execution_type, execution_duration_ms, delivery_status, error_message
            ) VALUES ($1, $2, $3, $4, $5, 'failed', $6, $7, $8, 'failed', $9);
          `, [
            schedule.title,
            schedule.report_type,
            JSON.stringify(schedule.filters || {}),
            schedule.format || 'csv',
            schedule.created_by,
            scheduleId,
            executionType,
            Date.now() - startTime,
            errorMsg
          ]);
        }
      } catch (dbErr) {
        logger.error('[ScheduledReportWorker] Failed to update error state in database:', { err: dbErr.message });
      }
    }

    return {
      success: false,
      scheduleId,
      error: errorMsg,
      durationMs: Date.now() - startTime
    };
  }
}

/**
 * Periodic tick to acquire and execute due reports
 */
async function tickScheduledReports() {
  if (!db._pool) return;
  lastTickAt = new Date();

  try {
    const dueReports = await acquireDueReports(WORKER_ID, 5);
    if (dueReports.length > 0) {
      logger.info(`[ScheduledReportWorker] Picked up ${dueReports.length} due scheduled report(s).`);
      for (const report of dueReports) {
        await processScheduledReport(report, 'scheduled');
      }
    }
  } catch (err) {
    logger.error('[ScheduledReportWorker tick error]', { err: err.message });
  }
}

/**
 * Start Scheduled Report Worker
 */
function startScheduledReportWorker(intervalMs = 60000) {
  if (workerInterval) {
    clearInterval(workerInterval);
  }

  logger.info(`[ScheduledReportWorker] Starting scheduler with interval ${intervalMs}ms (Worker: ${WORKER_ID})`);

  // Initial scan after 5 seconds
  setTimeout(() => {
    tickScheduledReports();
  }, 5000);

  workerInterval = setInterval(() => {
    tickScheduledReports();
  }, intervalMs);
}

/**
 * Stop Scheduled Report Worker
 */
function stopScheduledReportWorker() {
  if (workerInterval) {
    clearInterval(workerInterval);
    workerInterval = null;
    logger.info('[ScheduledReportWorker] Stopped scheduler.');
  }
}

/**
 * Get Scheduler Health & Observability Metrics
 */
async function getSchedulerHealth() {
  let activeCount = 0;
  let dueCount = 0;
  let runningCount = 0;

  if (db._pool) {
    try {
      const activeRes = await db.query('SELECT COUNT(*)::int AS count FROM scheduled_reports WHERE is_active = true');
      activeCount = activeRes.rows[0]?.count || 0;

      const dueRes = await db.query('SELECT COUNT(*)::int AS count FROM scheduled_reports WHERE is_active = true AND next_run_at <= now()');
      dueCount = dueRes.rows[0]?.count || 0;

      const runningRes = await db.query("SELECT COUNT(*)::int AS count FROM scheduled_reports WHERE locked_at IS NOT NULL AND locked_at > now() - INTERVAL '15 minutes'");
      runningCount = runningRes.rows[0]?.count || 0;
    } catch (e) {
      logger.warn('[ScheduledReportWorker getSchedulerHealth DB query error]', { err: e.message });
    }
  }

  return {
    status: workerInterval ? 'running' : 'idle',
    workerId: WORKER_ID,
    lastTickAt: lastTickAt ? lastTickAt.toISOString() : null,
    uptimeSeconds: process.uptime(),
    activeSchedules: activeCount,
    dueSchedules: dueCount,
    currentlyRunning: runningCount,
    stats: { ...stats }
  };
}

module.exports = {
  WORKER_ID,
  VALID_REPORT_TYPES,
  VALID_FREQUENCIES,
  VALID_FORMATS,
  validateScheduleData,
  calculateNextRun,
  acquireDueReports,
  processScheduledReport,
  tickScheduledReports,
  startScheduledReportWorker,
  stopScheduledReportWorker,
  getSchedulerHealth
};
