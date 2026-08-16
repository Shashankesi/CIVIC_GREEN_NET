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

        // Create database notifications for officer and admins
        try {
          const notificationService = require('./notificationService');
          
          // Notify the officer
          await notificationService.create(c.officer_id, 'SLA', {
            title: 'SLA Resolution Warning',
            message: `Complaint #CGN-${String(c.id).padStart(5, '0')} is approaching its SLA deadline.`,
            subtitle: `Title: ${c.title}`,
            complaintId: c.id
          });

          // Notify admins
          const { rows: admins } = await db.query("SELECT id FROM users WHERE role='admin'");
          for (const admin of admins) {
            await notificationService.create(admin.id, 'SLA', {
              title: 'SLA Resolution Warning',
              message: `Complaint #CGN-${String(c.id).padStart(5, '0')} assigned to ${c.officer_name} is nearing SLA Resolution.`,
              subtitle: `Title: ${c.title}`,
              complaintId: c.id
            });
          }

          // Real-time SLA warning dispatch
          try {
            const realtimeGateway = require('./realtimeGateway');
            realtimeGateway.publishComplaintEvent('SLA_WARNING', c, {
              officerId: c.officer_id,
              officerName: c.officer_name,
              slaDueAt: c.sla_due_at
            });
          } catch (rtErr) {}
        } catch (err) {
          logger.warn('Failed to create SLA warning database notifications', { err: err.message });
        }
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

        // Update sla_escalated_at timestamp
        try {
          await db.query('UPDATE complaints SET sla_escalated_at = now() WHERE id = $1', [c.id]);
        } catch (e) {}

        // Create database notifications for officer and admins
        try {
          const notificationService = require('./notificationService');
          
          // Notify the officer
          await notificationService.create(c.officer_id, 'SLA', {
            title: 'CRITICAL: SLA Breached',
            message: `Complaint #CGN-${String(c.id).padStart(5, '0')} has breached its SLA Resolution deadline.`,
            subtitle: `Title: ${c.title}`,
            complaintId: c.id
          });

          // Notify admins
          const { rows: admins } = await db.query("SELECT id FROM users WHERE role='admin'");
          for (const admin of admins) {
            await notificationService.create(admin.id, 'SLA', {
              title: 'CRITICAL: SLA Breached',
              message: `Complaint #CGN-${String(c.id).padStart(5, '0')} assigned to ${c.officer_name} has breached its SLA Resolution deadline.`,
              subtitle: `Title: ${c.title}`,
              complaintId: c.id
            });
          }

          // Real-time SLA breach dispatch
          try {
            const realtimeGateway = require('./realtimeGateway');
            realtimeGateway.publishComplaintEvent('SLA_BREACH', c, {
              officerId: c.officer_id,
              officerName: c.officer_name,
              slaDueAt: c.sla_due_at,
              escalatedAt: new Date().toISOString()
            });
          } catch (rtErr) {}
        } catch (err) {
          logger.warn('Failed to create SLA breach database notifications', { err: err.message });
        }
      }
    }
    
    logger.info('SLA compliance check scan completed.');
  } catch (e) {
    logger.error('Failed to run SLA compliance check scan', { err: e.message });
  }
}

async function checkAutoClose() {
  if (!db._pool) return;
  try {
    const timelineService = require('./timelineService');
    // Find complaints that have been in 'resolved' status for 24+ hours
    const autoCloseQuery = `
      SELECT id, title, user_id, officer_id, resolution_at
      FROM complaints
      WHERE status = 'resolved'
        AND resolution_at IS NOT NULL
        AND resolution_at <= now() - INTERVAL '24 hours'
    `;
    const res = await db.query(autoCloseQuery);
    if (res.rows.length > 0) {
      logger.info(`Auto-close scan: found ${res.rows.length} resolved complaints past 24-hour verification period.`);
    }

    for (const c of res.rows) {
      try {
        await timelineService.changeStatus(
          c.id,
          'closed',
          c.user_id || 69,
          'auto_closed_after_verification_period'
        );
        logger.info(`Complaint #${c.id} automatically closed after 24h verification window.`);
      } catch (err) {
        logger.warn(`Auto-close failed for complaint #${c.id}:`, { err: err.message });
      }
    }
  } catch (e) {
    logger.error('Failed to run auto-close scan', { err: e.message });
  }
}

function startMonitor() {
  // Check SLAs every 15 minutes
  const SLA_INTERVAL = 15 * 60 * 1000;
  setInterval(checkSlas, SLA_INTERVAL);
  
  // Check 24-hour auto-close every 5 minutes
  const AUTO_CLOSE_INTERVAL = 5 * 60 * 1000;
  setInterval(checkAutoClose, AUTO_CLOSE_INTERVAL);

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
  setTimeout(() => {
    checkSlas();
    checkAutoClose();
  }, 6000);
}

module.exports = { startMonitor, checkSlas, checkAutoClose };
