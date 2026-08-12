const nodemailer = require('nodemailer');
const { EMAIL, FRONTEND_URL } = require('../config');
const db = require('../config/db');
const logger = require('../utils/logger');

let transporter = null;
if (EMAIL.SMTP_HOST && EMAIL.SMTP_USER) {
  transporter = nodemailer.createTransport({
    host: EMAIL.SMTP_HOST,
    port: parseInt(EMAIL.SMTP_PORT, 10) || 587,
    secure: false,
    auth: { user: EMAIL.SMTP_USER, pass: EMAIL.SMTP_PASS }
  });
} else {
  logger.warn('SMTP not configured — emailService will noop.');
}

// Helper to check SMTP connection
async function verifySmtp() {
  if (!transporter) return { status: 'not_configured' };
  try {
    await transporter.verify();
    return { status: 'operational' };
  } catch (e) {
    return { status: 'error', error: e.message };
  }
}

// Generic email HTML wrapper for professional branding
function wrapHtml(title, bodyHtml) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f4f7f6; color: #333333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08); border: 1px solid #e1e7e5; }
    .header { background: linear-gradient(135deg, #10b981, #059669); padding: 25px 20px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
    .header p { margin: 5px 0 0; font-size: 14px; opacity: 0.9; }
    .content { padding: 30px 25px; line-height: 1.6; font-size: 15px; }
    .content h2 { color: #0f172a; font-size: 18px; margin-top: 0; margin-bottom: 15px; }
    .btn-container { text-align: center; margin: 25px 0; }
    .btn { display: inline-block; background-color: #10b981; color: #ffffff !important; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 15px; box-shadow: 0 2px 5px rgba(16,185,129,0.2); }
    .meta-box { background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; padding: 15px; margin: 20px 0; }
    .meta-item { font-size: 13px; margin-bottom: 8px; color: #475569; }
    .meta-item:last-child { margin-bottom: 0; }
    .meta-label { font-weight: 600; color: #0f172a; width: 120px; display: inline-block; }
    .footer { background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
    .footer p { margin: 5px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Civic GreenNet</h1>
      <p>Smart Civic Governance Platform</p>
    </div>
    <div class="content">
      <h2>${title}</h2>
      ${bodyHtml}
    </div>
    <div class="footer">
      <p>This is an automated notification from Civic GreenNet.</p>
      <p>&copy; 2026 Civic GreenNet. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

// Low-level helper to send mail & log the delivery record in db
async function sendAndLog({ userId, complaintId, eventType, recipient, subject, html, text, deduplicationKey }) {
  if (!transporter) {
    logger.warn(`No transporter active. Email to ${recipient} skipped (logged as pending).`);
    return { success: false, status: 'pending', error: 'SMTP not configured' };
  }

  // Check deduplication
  if (deduplicationKey && db._pool) {
    try {
      const check = await db.query('SELECT id, status FROM email_logs WHERE deduplication_key=$1', [deduplicationKey]);
      if (check.rows.length > 0) {
        logger.info(`Email with deduplication key ${deduplicationKey} already exists. Skipping.`);
        return { success: true, duplicate: true };
      }
    } catch (e) {
      logger.warn('Deduplication check failed', { err: e.message });
    }
  }

  let logId = null;
  // Initialize pending log
  if (db._pool) {
    try {
      const q = `INSERT INTO email_logs(user_id, complaint_id, event_type, recipient, subject, status, deduplication_key, attempt_count)
                 VALUES($1, $2, $3, $4, $5, 'pending', $6, 1) RETURNING id`;
      const res = await db.query(q, [userId || null, complaintId || null, eventType, recipient, subject, deduplicationKey || null]);
      logId = res.rows[0].id;
    } catch (e) {
      if (e.code === '23505') { // Unique constraint violation (dedup race)
        logger.info(`Duplicate email prevented by database constraint: ${deduplicationKey}`);
        return { success: true, duplicate: true };
      }
      logger.error('Failed to write initial email log', { err: e.message });
    }
  }

  // Bypass real SMTP send in tests to speed them up and prevent sending emails to fake/synthetic addresses
  if (process.env.NODE_ENV === 'test') {
    logger.info(`[TEST MODE] Suppressed SMTP delivery for ${eventType} to ${recipient}`);
    if (logId && db._pool) {
      try {
        await db.query(
          `UPDATE email_logs SET status='sent', provider_message_id=$1, sent_at=now() WHERE id=$2`,
          ['test-message-id', logId]
        );
      } catch (dbErr) {
        logger.warn('Failed updating email log status in test mode', { err: dbErr.message });
      }
    }
    return { success: true, messageId: 'test-message-id' };
  }

  try {
    const info = await transporter.sendMail({
      from: EMAIL.FROM,
      to: recipient,
      subject,
      html,
      text
    });

    if (logId && db._pool) {
      await db.query(
        `UPDATE email_logs SET status='sent', provider_message_id=$1, sent_at=now() WHERE id=$2`,
        [info.messageId, logId]
      );
    }
    logger.info(`Email successfully sent: ${eventType} to ${recipient}`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    logger.error(`Failed sending email to ${recipient}`, { err: err.message });
    if (logId && db._pool) {
      await db.query(
        `UPDATE email_logs SET status='failed', error_message=$1 WHERE id=$2`,
        [err.message, logId]
      );
    }
    return { success: false, error: err.message };
  }
}

// Retry a specific log
async function retryEmailLog(id) {
  if (!db._pool || !transporter) return false;
  try {
    const r = await db.query('SELECT * FROM email_logs WHERE id=$1', [id]);
    const log = r.rows[0];
    if (!log || log.status === 'sent') return false;

    // Increment attempt count
    await db.query('UPDATE email_logs SET attempt_count = attempt_count + 1 WHERE id=$1', [id]);

    // Reconstruct mail parameters based on event_type
    // For simplicity, we can fetch HTML content based on the event type or regenerate it.
    // However, since we don't store raw HTML in the log table to keep it clean, we will recreate the template.
    // We can query user & complaint info if necessary.
    let user = null;
    let complaint = null;
    if (log.user_id) {
      const u = await db.query('SELECT * FROM users WHERE id=$1', [log.user_id]);
      user = u.rows[0];
    }
    if (log.complaint_id) {
      const c = await db.query('SELECT * FROM complaints WHERE id=$1', [log.complaint_id]);
      complaint = c.rows[0];
    }

    const { subject, html, text } = await buildEmailPayload(log.event_type, user, complaint, log.recipient);

    const info = await transporter.sendMail({
      from: EMAIL.FROM,
      to: log.recipient,
      subject: log.subject,
      html,
      text
    });

    await db.query(
      `UPDATE email_logs SET status='sent', provider_message_id=$1, error_message=NULL, sent_at=now() WHERE id=$2`,
      [info.messageId, id]
    );
    return true;
  } catch (e) {
    logger.error(`Retry attempt failed for email log ${id}`, { err: e.message });
    await db.query('UPDATE email_logs SET error_message=$1 WHERE id=$2', [e.message, id]);
    return false;
  }
}

// Background batch retry function (exponential backup style or standard loop)
async function batchRetryFailed() {
  if (!db._pool || !transporter) return;
  try {
    // Retry logs that failed and have less than 3 attempts
    const r = await db.query("SELECT id FROM email_logs WHERE status='failed' AND attempt_count < 3 LIMIT 10");
    for (const row of r.rows) {
      await retryEmailLog(row.id);
    }
  } catch (e) {
    logger.error('Batch retry job failed', { err: e.message });
  }
}

// ─── Template Payload Builders ────────────────────────────────────────────────

async function buildEmailPayload(eventType, user, complaint, customRecipientEmail) {
  let title = 'Notification';
  let bodyHtml = '';
  let text = '';
  let subject = 'Civic GreenNet Notification';

  const resetUrl = `${FRONTEND_URL}/reset-password`;

  switch (eventType) {
    case 'WELCOME':
      subject = 'Welcome to Civic GreenNet';
      title = 'Welcome to Civic GreenNet!';
      bodyHtml = `
        <p>Dear ${user?.name || 'Citizen'},</p>
        <p>Thank you for joining Civic GreenNet — the smart civic governance platform designed to make our community cleaner, safer, and more efficient.</p>
        <p>Your account is ready! You can now report civic issues, track resolution progress in real-time, and get AI-assisted updates.</p>
        <div class="btn-container">
          <a href="${FRONTEND_URL}/login" class="btn">Access Dashboard</a>
        </div>
        <p>If you have any questions or need assistance, feel free to contact support at <a href="mailto:support@civicgreennet.gov">support@civicgreennet.gov</a>.</p>
      `;
      text = `Welcome to Civic GreenNet, ${user?.name || 'Citizen'}! Your account is ready. Access the dashboard here: ${FRONTEND_URL}/login`;
      break;

    case 'PASSWORD_RESET':
      subject = 'Reset your Civic GreenNet password';
      title = 'Reset Password';
      bodyHtml = `
        <p>Hello,</p>
        <p>We received a request to reset your password for your Civic GreenNet account.</p>
        <p>Click the button below to choose a new password. This link will expire in 1 hour.</p>
        <div class="btn-container">
          <a href="${resetUrl}" class="btn">Reset Password</a>
        </div>
        <p><strong>Security Warning:</strong> If you did not request this reset, please ignore this email. Your password will remain secure.</p>
      `;
      text = `Reset your password by visiting this link: ${resetUrl}`;
      break;

    case 'EMAIL_VERIFICATION':
      subject = 'Verify your email';
      title = 'Verify Your Email Address';
      bodyHtml = `
        <p>Hello,</p>
        <p>Please click the button below to verify your email address and activate your Civic GreenNet citizen profile.</p>
        <div class="btn-container">
          <a href="${FRONTEND_URL}/verify" class="btn">Verify Email</a>
        </div>
      `;
      text = `Verify your email here: ${FRONTEND_URL}/verify`;
      break;

    case 'COMPLAINT_SUBMITTED':
      subject = `Complaint Submitted: ${complaint?.title || 'Report'}`;
      title = 'Complaint Confirmed';
      bodyHtml = `
        <p>Dear Citizen,</p>
        <p>Your civic complaint has been successfully submitted and saved in the Civic GreenNet database.</p>
        <div class="meta-box">
          <div class="meta-item"><span class="meta-label">Reference Number:</span> #${complaint?.id || 'N/A'}</div>
          <div class="meta-item"><span class="meta-label">Title:</span> ${complaint?.title || 'Untitled'}</div>
          <div class="meta-item"><span class="meta-label">Category:</span> ${complaint?.category || 'General'}</div>
          <div class="meta-item"><span class="meta-label">Priority:</span> <span style="text-transform: capitalize;">${complaint?.priority || 'Medium'}</span></div>
          <div class="meta-item"><span class="meta-label">Status:</span> <strong>${complaint?.status || 'Open'}</strong></div>
          <div class="meta-item"><span class="meta-label">Submitted On:</span> ${complaint?.created_at ? new Date(complaint.created_at).toLocaleString() : new Date().toLocaleString()}</div>
        </div>
        <div class="btn-container">
          <a href="${FRONTEND_URL}/complaints/${complaint?.id || ''}" class="btn">Track Complaint</a>
        </div>
      `;
      text = `Your complaint #${complaint?.id} ("${complaint?.title}") is open. Track it here: ${FRONTEND_URL}/complaints/${complaint?.id}`;
      break;

    case 'COMPLAINT_STATUS_CHANGED':
      subject = `Status Update: Complaint #${complaint?.id || ''}`;
      title = 'Complaint Status Updated';
      bodyHtml = `
        <p>Hello,</p>
        <p>The status of your reported issue has been updated.</p>
        <div class="meta-box">
          <div class="meta-item"><span class="meta-label">Reference:</span> #${complaint?.id || 'N/A'}</div>
          <div class="meta-item"><span class="meta-label">Title:</span> ${complaint?.title || 'Untitled'}</div>
          <div class="meta-item"><span class="meta-label">Current Status:</span> <strong style="color: #10b981; text-transform: uppercase;">${complaint?.status || 'Update'}</strong></div>
        </div>
        <div class="btn-container">
          <a href="${FRONTEND_URL}/complaints/${complaint?.id || ''}" class="btn">View Timeline</a>
        </div>
      `;
      text = `Complaint #${complaint?.id} status updated to: ${complaint?.status}. View details: ${FRONTEND_URL}/complaints/${complaint?.id}`;
      break;

    case 'COMPLAINT_ASSIGNED':
      subject = `New Complaint Assigned: #${complaint?.id || ''}`;
      title = 'New Assignment';
      bodyHtml = `
        <p>Hello Officer,</p>
        <p>A new civic complaint has been assigned to you for resolution.</p>
        <div class="meta-box">
          <div class="meta-item"><span class="meta-label">Reference:</span> #${complaint?.id || 'N/A'}</div>
          <div class="meta-item"><span class="meta-label">Title:</span> ${complaint?.title || 'Untitled'}</div>
          <div class="meta-item"><span class="meta-label">Category:</span> ${complaint?.category || 'General'}</div>
          <div class="meta-item"><span class="meta-label">Priority:</span> <span style="text-transform: capitalize;">${complaint?.priority || 'Medium'}</span></div>
          <div class="meta-item"><span class="meta-label">SLA Deadline:</span> <strong>${complaint?.sla_due_at ? new Date(complaint.sla_due_at).toLocaleString() : 'N/A'}</strong></div>
        </div>
        <div class="btn-container">
          <a href="${FRONTEND_URL}/officer/complaints/${complaint?.id || ''}" class="btn">Open Work Order</a>
        </div>
        <p>Please review the details and updates on the portal and act within the SLA timeframe.</p>
      `;
      text = `Complaint #${complaint?.id} has been assigned to you. SLA due: ${complaint?.sla_due_at}`;
      break;

    case 'OFFICER_APPROVED':
      subject = 'Your Civic GreenNet Officer Account Approved';
      title = 'Account Approved';
      bodyHtml = `
        <p>Dear ${user?.name || 'Officer'},</p>
        <p>We are pleased to inform you that your request to join Civic GreenNet as a Smart Governance Officer has been approved by the Administration.</p>
        <div class="meta-box">
          <div class="meta-item"><span class="meta-label">Name:</span> ${user?.name}</div>
          <div class="meta-item"><span class="meta-label">Department:</span> ${user?.department_name || 'Assigned'}</div>
          <div class="meta-item"><span class="meta-label">Role:</span> Officer</div>
        </div>
        <p>You can now log in to the portal and access assignments, update resolution work orders, and review SLA metrics.</p>
        <div class="btn-container">
          <a href="${FRONTEND_URL}/login" class="btn">Log In Now</a>
        </div>
      `;
      text = `Your Civic GreenNet officer profile was approved. Login here: ${FRONTEND_URL}/login`;
      break;

    case 'OFFICER_REJECTED':
      subject = 'Civic GreenNet Officer Application Status';
      title = 'Application Status';
      bodyHtml = `
        <p>Dear ${user?.name || 'Applicant'},</p>
        <p>Thank you for your interest in joining Civic GreenNet. After careful review, your application for an officer profile has been rejected at this time.</p>
        <p>If you believe this is a mistake or have updated credentials, please reach out to your municipal administration department.</p>
      `;
      text = `Your Civic GreenNet officer registration request was rejected.`;
      break;

    case 'OFFICER_PENDING_APPROVAL':
      subject = 'New Officer Registration Requires Approval';
      title = 'Officer Registration Request';
      bodyHtml = `
        <p>Admin Team,</p>
        <p>A new officer has registered and is pending approval in the system.</p>
        <div class="meta-box">
          <div class="meta-item"><span class="meta-label">Name:</span> ${user?.name}</div>
          <div class="meta-item"><span class="meta-label">Email:</span> ${user?.email}</div>
          <div class="meta-item"><span class="meta-label">Register Date:</span> ${new Date().toLocaleString()}</div>
        </div>
        <div class="btn-container">
          <a href="${FRONTEND_URL}/admin/users" class="btn">Review User Portal</a>
        </div>
      `;
      text = `New officer registration: ${user?.name} (${user?.email}) requires admin approval.`;
      break;

    case 'COMPLAINT_RESOLVED':
      subject = `Issue Resolved: Complaint #${complaint?.id || ''}`;
      title = 'Complaint Resolved';
      bodyHtml = `
        <p>Dear Citizen,</p>
        <p>We are pleased to notify you that your reported issue has been marked as <strong>Resolved</strong> by the department officer.</p>
        <div class="meta-box">
          <div class="meta-item"><span class="meta-label">Reference:</span> #${complaint?.id}</div>
          <div class="meta-item"><span class="meta-label">Title:</span> ${complaint?.title}</div>
        </div>
        <p>Please review and verify the resolution. If you are satisfied, you can close the ticket. If the issue persists, you can reject the resolution to reopen it.</p>
        <div class="btn-container">
          <a href="${FRONTEND_URL}/complaints/${complaint?.id}/verify" class="btn">Verify Resolution</a>
        </div>
      `;
      text = `Complaint #${complaint?.id} is marked as resolved. Please verify at: ${FRONTEND_URL}/complaints/${complaint?.id}/verify`;
      break;

    case 'RESOLUTION_VERIFICATION':
      subject = `Action Required: Verify Resolution for Complaint #${complaint?.id || ''}`;
      title = 'Please Verify Resolution';
      bodyHtml = `
        <p>Dear Citizen,</p>
        <p>Please take a moment to verify if the resolution provided for complaint #${complaint?.id} is satisfactory.</p>
        <p>Your feedback is vital to maintaining smart governance standards.</p>
        <div class="btn-container">
          <a href="${FRONTEND_URL}/complaints/${complaint?.id}/verify" class="btn">Verify Now</a>
        </div>
      `;
      text = `Verify resolution for complaint #${complaint?.id}: ${FRONTEND_URL}/complaints/${complaint?.id}/verify`;
      break;

    case 'COMPLAINT_REOPENED':
      subject = `Complaint Reopened: #${complaint?.id || ''}`;
      title = 'Complaint Reopened';
      bodyHtml = `
        <p>Hello Officer,</p>
        <p>The citizen has rejected the resolution for complaint #${complaint?.id}. As a result, the complaint has been automatically <strong>Reopened</strong>.</p>
        <p>Please inspect the feedback notes, coordinate if needed, and issue a fresh work update.</p>
        <div class="btn-container">
          <a href="${FRONTEND_URL}/officer/complaints/${complaint?.id}" class="btn">View Complaint</a>
        </div>
      `;
      text = `Complaint #${complaint?.id} was reopened by the citizen.`;
      break;

    case 'SLA_WARNING':
      subject = `SLA Warning: Complaint #${complaint?.id || ''} approaching deadline`;
      title = 'SLA Warning Alert';
      bodyHtml = `
        <p>Attention,</p>
        <p>This is a system warning that complaint #${complaint?.id} is approaching its SLA resolution deadline.</p>
        <div class="meta-box">
          <div class="meta-item"><span class="meta-label">Reference:</span> #${complaint?.id}</div>
          <div class="meta-item"><span class="meta-label">Title:</span> ${complaint?.title}</div>
          <div class="meta-item"><span class="meta-label">Priority:</span> <span style="text-transform: capitalize;">${complaint?.priority}</span></div>
          <div class="meta-item"><span class="meta-label">SLA Due:</span> <strong>${complaint?.sla_due_at ? new Date(complaint.sla_due_at).toLocaleString() : 'N/A'}</strong></div>
        </div>
        <div class="btn-container">
          <a href="${FRONTEND_URL}/complaints/${complaint?.id}" class="btn">Inspect Ticket</a>
        </div>
      `;
      text = `SLA Warning: Complaint #${complaint?.id} is approaching its resolution deadline: ${complaint?.sla_due_at}`;
      break;

    case 'SLA_BREACH':
      subject = `CRITICAL: SLA Breached on Complaint #${complaint?.id || ''}`;
      title = 'SLA BREACH ALERT';
      bodyHtml = `
        <p style="color: #ef4444; font-weight: bold;">CRITICAL ALERT:</p>
        <p>Complaint #${complaint?.id} has exceeded its SLA resolution deadline without being marked as resolved or closed.</p>
        <div class="meta-box">
          <div class="meta-item"><span class="meta-label">Reference:</span> #${complaint?.id}</div>
          <div class="meta-item"><span class="meta-label">Title:</span> ${complaint?.title}</div>
          <div class="meta-item"><span class="meta-label">Priority:</span> <span style="text-transform: capitalize; color: #ef4444; font-weight: bold;">${complaint?.priority}</span></div>
          <div class="meta-item"><span class="meta-label">SLA Due Date:</span> <strong style="color: #ef4444;">${complaint?.sla_due_at ? new Date(complaint.sla_due_at).toLocaleString() : 'N/A'}</strong></div>
        </div>
        <div class="btn-container">
          <a href="${FRONTEND_URL}/complaints/${complaint?.id}" class="btn">Inspect Breached Ticket</a>
        </div>
      `;
      text = `SLA BREACH: Complaint #${complaint?.id} has breached its SLA due date: ${complaint?.sla_due_at}`;
      break;

    default:
      bodyHtml = `<p>You have a new notification from Civic GreenNet.</p>`;
      text = `New notification from Civic GreenNet.`;
  }

  return {
    subject,
    html: wrapHtml(title, bodyHtml),
    text
  };
}

// ─── Exported Send wrappers ──────────────────────────────────────────────────

async function sendWelcomeEmail(user) {
  const { subject, html, text } = await buildEmailPayload('WELCOME', user);
  return sendAndLog({
    userId: user.id,
    eventType: 'WELCOME',
    recipient: user.email,
    subject,
    html,
    text
  });
}

async function sendPasswordResetEmail(user, resetUrl) {
  const { subject, html, text } = await buildEmailPayload('PASSWORD_RESET', user);
  return sendAndLog({
    userId: user.id,
    eventType: 'PASSWORD_RESET',
    recipient: user.email,
    subject,
    html,
    text
  });
}

async function sendEmailVerification(to, token) {
  const userRes = await db.query('SELECT id FROM users WHERE email=$1', [to]);
  const user = userRes.rows[0];
  const { subject, html, text } = await buildEmailPayload('EMAIL_VERIFICATION', user);
  return sendAndLog({
    userId: user ? user.id : null,
    eventType: 'EMAIL_VERIFICATION',
    recipient: to,
    subject,
    html,
    text
  });
}

async function sendPasswordReset(to, token) {
  const userRes = await db.query('SELECT id FROM users WHERE email=$1', [to]);
  const user = userRes.rows[0];
  const { subject, html, text } = await buildEmailPayload('PASSWORD_RESET', user);
  return sendAndLog({
    userId: user ? user.id : null,
    eventType: 'PASSWORD_RESET',
    recipient: to,
    subject,
    html,
    text
  });
}

async function shouldSend(userId, key) {
  if (!userId || !db._pool) return true;
  try {
    const r = await db.query('SELECT notification_preferences FROM user_settings WHERE user_id=$1', [userId]);
    if (r.rows.length === 0) return true;
    const prefs = r.rows[0].notification_preferences || {};
    return prefs[key] !== false;
  } catch (e) {
    logger.warn('Failed to load user notification preference', { err: e.message });
    return true;
  }
}

async function sendComplaintSubmittedEmail(complaint, citizen) {
  if (citizen?.id) {
    const active = await shouldSend(citizen.id, 'complaint_submitted');
    if (!active) {
      logger.info(`Notification "complaint_submitted" disabled for user #${citizen.id}`);
      return;
    }
  }
  const { subject, html, text } = await buildEmailPayload('COMPLAINT_SUBMITTED', citizen, complaint);
  return sendAndLog({
    userId: citizen?.id,
    complaintId: complaint?.id,
    eventType: 'COMPLAINT_SUBMITTED',
    recipient: citizen?.email,
    subject,
    html,
    text
  });
}

async function sendComplaintStatusChangedEmail(complaint, citizen, oldStatus, newStatus) {
  if (citizen?.id) {
    const active = await shouldSend(citizen.id, 'status_changes');
    if (!active) {
      logger.info(`Notification "status_changes" disabled for user #${citizen.id}`);
      return;
    }
  }
  const { subject, html, text } = await buildEmailPayload('COMPLAINT_STATUS_CHANGED', citizen, complaint);
  return sendAndLog({
    userId: citizen?.id,
    complaintId: complaint?.id,
    eventType: 'COMPLAINT_STATUS_CHANGED',
    recipient: citizen?.email,
    subject,
    html,
    text
  });
}

async function sendComplaintAssignedEmail(complaint, officer) {
  if (officer?.id) {
    const active = await shouldSend(officer.id, 'assignment_updates');
    if (!active) {
      logger.info(`Notification "assignment_updates" disabled for user #${officer.id}`);
      return;
    }
  }
  const { subject, html, text } = await buildEmailPayload('COMPLAINT_ASSIGNED', officer, complaint);
  return sendAndLog({
    userId: officer?.id,
    complaintId: complaint?.id,
    eventType: 'COMPLAINT_ASSIGNED',
    recipient: officer?.email,
    subject,
    html,
    text
  });
}

async function sendOfficerApprovalEmail(officer, approved) {
  const event = approved ? 'OFFICER_APPROVED' : 'OFFICER_REJECTED';
  const { subject, html, text } = await buildEmailPayload(event, officer);
  return sendAndLog({
    userId: officer.id,
    eventType: event,
    recipient: officer.email,
    subject,
    html,
    text
  });
}

async function sendAdminOfficerRegistrationEmail(officer) {
  const { subject, html, text } = await buildEmailPayload('OFFICER_PENDING_APPROVAL', officer);
  return sendAndLog({
    eventType: 'OFFICER_PENDING_APPROVAL',
    recipient: EMAIL.SMTP_USER,
    subject,
    html,
    text
  });
}

async function sendComplaintResolvedEmail(complaint, citizen) {
  if (citizen?.id) {
    const active = await shouldSend(citizen.id, 'resolution');
    if (!active) {
      logger.info(`Notification "resolution" disabled for user #${citizen.id}`);
      return;
    }
  }
  const { subject, html, text } = await buildEmailPayload('COMPLAINT_RESOLVED', citizen, complaint);
  return sendAndLog({
    userId: citizen?.id,
    complaintId: complaint?.id,
    eventType: 'COMPLAINT_RESOLVED',
    recipient: citizen?.email,
    subject,
    html,
    text
  });
}

async function sendComplaintReopenedEmail(complaint, officer) {
  if (officer?.id) {
    const active = await shouldSend(officer.id, 'reopened');
    if (!active) {
      logger.info(`Notification "reopened" disabled for user #${officer.id}`);
      return;
    }
  }
  const { subject, html, text } = await buildEmailPayload('COMPLAINT_REOPENED', officer, complaint);
  return sendAndLog({
    userId: officer?.id,
    complaintId: complaint?.id,
    eventType: 'COMPLAINT_REOPENED',
    recipient: officer?.email,
    subject,
    html,
    text
  });
}

async function sendResolutionVerificationEmail(complaint, citizen) {
  const { subject, html, text } = await buildEmailPayload('RESOLUTION_VERIFICATION', citizen, complaint);
  return sendAndLog({
    userId: citizen?.id,
    complaintId: complaint?.id,
    eventType: 'RESOLUTION_VERIFICATION',
    recipient: citizen?.email,
    subject,
    html,
    text
  });
}

async function sendSlaWarningEmail(complaint, officer) {
  if (officer?.id) {
    const active = await shouldSend(officer.id, 'sla_alerts');
    if (!active) return;
  }
  const { subject, html, text } = await buildEmailPayload('SLA_WARNING', officer, complaint);
  const dedupKey = `sla_warning:${complaint.id}`;
  return sendAndLog({
    userId: officer?.id,
    complaintId: complaint.id,
    eventType: 'SLA_WARNING',
    recipient: officer?.email,
    subject,
    html,
    text,
    deduplicationKey: dedupKey
  });
}

async function sendSlaBreachedEmail(complaint, officer) {
  if (officer?.id) {
    const active = await shouldSend(officer.id, 'sla_alerts');
    if (!active) return;
  }
  const { subject, html, text } = await buildEmailPayload('SLA_BREACH', officer, complaint);
  const dedupKey = `sla_breach:${complaint.id}`;
  return sendAndLog({
    userId: officer?.id,
    complaintId: complaint.id,
    eventType: 'SLA_BREACH',
    recipient: officer?.email,
    subject,
    html,
    text,
    deduplicationKey: dedupKey
  });
}

module.exports = {
  verifySmtp,
  sendEmailVerification,
  sendPasswordReset,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendComplaintSubmittedEmail,
  sendComplaintStatusChangedEmail,
  sendComplaintAssignedEmail,
  sendOfficerApprovalEmail,
  sendAdminOfficerRegistrationEmail,
  sendComplaintResolvedEmail,
  sendComplaintReopenedEmail,
  sendResolutionVerificationEmail,
  sendSlaWarningEmail,
  sendSlaBreachedEmail,
  retryEmailLog,
  batchRetryFailed
};
