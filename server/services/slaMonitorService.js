const db = require('../config/db');
const emailService = require('./emailService');
const logger = require('../utils/logger');

async function checkSlas() {
  if (!db._pool) return;
  try {
    logger.info('Starting SLA compliance check scan...');
    
    // 1. Scan for complaints nearing SLA breach (within 24 hours)
    // Ignore resolved, closed, or rejected complaints. Ensure warning has not yet been sent.
    const warningQuery = `
      SELECT c.*, u.email as officer_email, u.name as officer_name, u.settings as officer_settings
      FROM complaints c
      LEFT JOIN users u ON u.id = c.officer_id
      WHERE c.status IN ('open', 'in_progress', 'reopened')
        AND c.sla_due_at IS NOT NULL
        AND c.sla_due_at <= now() + INTERVAL '24 hours'
        AND c.sla_due_at > now()
        AND NOT EXISTS (
          SELECT 1 FROM email_logs
          WHERE complaint_id = c.id AND event_type = 'SLA_WARNING'
        )
    `;
    const warningRes = await db.query(warningQuery);
    logger.info(`SLA Warning scan: found ${warningRes.rows.length} nearing SLA breaches.`);
    
    for (const c of warningRes.rows) {
      if (c.officer_id && c.officer_email) {
        const officer = {
          id: c.officer_id,
          name: c.officer_name,
          email: c.officer_email,
          settings: c.officer_settings || {}
        };
        await emailService.sendSlaWarningEmail(c, officer);
      }
    }

    // 2. Scan for actual SLA breaches (sla_due_at elapsed)
    const breachQuery = `
      SELECT c.*, u.email as officer_email, u.name as officer_name, u.settings as officer_settings
      FROM complaints c
      LEFT JOIN users u ON u.id = c.officer_id
      WHERE c.status IN ('open', 'in_progress', 'reopened')
        AND c.sla_due_at IS NOT NULL
        AND c.sla_due_at <= now()
        AND NOT EXISTS (
          SELECT 1 FROM email_logs
          WHERE complaint_id = c.id AND event_type = 'SLA_BREACH'
        )
    `;
    const breachRes = await db.query(breachQuery);
    logger.info(`SLA Breach scan: found ${breachRes.rows.length} active SLA breaches.`);
    
    for (const c of breachRes.rows) {
      if (c.officer_id && c.officer_email) {
        const officer = {
          id: c.officer_id,
          name: c.officer_name,
          email: c.officer_email,
          settings: c.officer_settings || {}
        };
        await emailService.sendSlaBreachedEmail(c, officer);
      }
    }
    
    logger.info('SLA compliance check scan completed.');
  } catch (e) {
    logger.error('Failed to run SLA compliance check scan', { err: e.message });
  }
}

function startMonitor() {
  // Check SLAs every 15 minutes
  const SLA_INTERVAL = 15 * 60 * 1000;
  setInterval(checkSlas, SLA_INTERVAL);
  
  // Run batch retry for failed emails every 10 minutes
  const RETRY_INTERVAL = 10 * 60 * 1000;
  setInterval(async () => {
    try {
      logger.info('Running background failed email retry queue...');
      await emailService.batchRetryFailed();
    } catch (e) {
      logger.error('Failed running background retry queue', { err: e.message });
    }
  }, RETRY_INTERVAL);

  // Initial trigger after startup delay
  setTimeout(checkSlas, 6000);
}

module.exports = { startMonitor, checkSlas };
