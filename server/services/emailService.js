const { Resend } = require('resend');
const { EMAIL, FRONTEND_URL } = require('../config');
const db = require('../config/db');
const logger = require('../utils/logger');
const { buildFrontendUrl } = require('../utils/urlUtils');

// Helper to mask email for privacy in logs
function maskEmail(email) {
  if (!email || typeof email !== 'string') return '';
  const norm = email.trim().toLowerCase();
  const parts = norm.split('@');
  if (parts.length !== 2) return norm;
  const [name, domain] = parts;
  if (name.length <= 2) {
    return `${name[0]}*@${domain}`;
  }
  const maskedName = `${name[0]}${'*'.repeat(Math.min(name.length - 2, 4))}${name[name.length - 1]}`;
  return `${maskedName}@${domain}`;
}

// Resend singleton client instance
let resend = null;
const resendApiKey = process.env.RESEND_API_KEY || EMAIL.RESEND_API_KEY;
if (resendApiKey) {
  resend = new Resend(resendApiKey);
} else {
  logger.warn('Resend API key not configured — emailService will noop or store pending logs.');
}

// Resend client accessor (useful for runtime testing / environment reload)
function getResendClient() {
  const key = process.env.RESEND_API_KEY || EMAIL.RESEND_API_KEY;
  if (!key) return null;
  if (!resend) {
    resend = new Resend(key);
  }
  return resend;
}

// Verify Resend service status / API key validity
async function verifyEmail() {
  const client = getResendClient();
  if (!client) {
    return { status: 'not_configured', provider: 'resend', domain: 'civicgreennet.dev', configured: false };
  }
  try {
    const res = await client.apiKeys.list();
    if (res && res.error) {
      return { status: 'error', provider: 'resend', domain: 'civicgreennet.dev', configured: true, error: res.error.message || 'Resend API authentication failed' };
    }
    return { status: 'operational', provider: 'resend', domain: 'civicgreennet.dev', configured: true };
  } catch (e) {
    return { status: 'error', provider: 'resend', domain: 'civicgreennet.dev', configured: true, error: e.message };
  }
}

// Backward-compatible alias for existing system health checks
const verifySmtp = verifyEmail;

// Dynamic Admin Email Resolution Helper
async function getAdminEmail() {
  if (EMAIL.ADMIN_EMAIL && typeof EMAIL.ADMIN_EMAIL === 'string' && EMAIL.ADMIN_EMAIL.trim()) {
    return EMAIL.ADMIN_EMAIL.trim();
  }
  if (db._pool) {
    try {
      const res = await db.query("SELECT email FROM users WHERE role='admin' ORDER BY id ASC LIMIT 1");
      if (res.rows.length > 0 && res.rows[0].email && res.rows[0].email.trim()) {
        return res.rows[0].email.trim();
      }
    } catch (e) {
      logger.warn('Failed to query admin user email from DB', { err: e.message });
    }
  }
  const fallback = process.env.EMAIL_REPLY_TO || EMAIL.REPLY_TO || 'civicgreennet@gmail.com';
  return fallback;
}

// Authoritative DB User Entity Resolver
async function resolveUser(userOrId) {
  if (!userOrId) return null;
  const id = typeof userOrId === 'object' ? userOrId.id : userOrId;

  if (!id || !db._pool) {
    return typeof userOrId === 'object' ? userOrId : null;
  }

  try {
    const res = await db.query(
      `SELECT u.id, u.name, u.email, u.role, u.status, u.settings, u.created_at, u.department_id, u.designation, d.name AS department_name
       FROM users u
       LEFT JOIN departments d ON d.id = u.department_id
       WHERE u.id=$1`,
      [id]
    );
    if (res.rows[0]) {
      return res.rows[0];
    }
  } catch (e) {
    logger.warn(`Failed to resolve user #${id} from DB`, { err: e.message });
  }
  return typeof userOrId === 'object' ? userOrId : null;
}

// Generic email HTML wrapper for professional Civic GreenNet branding
function wrapHtml(title, bodyHtml) {
  const supportEmailAddr = process.env.EMAIL_REPLY_TO || EMAIL.SUPPORT_EMAIL || 'civicgreennet@gmail.com';
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
    .fallback-url { font-size: 12px; color: #64748b; margin-top: 18px; border-top: 1px dashed #e2e8f0; padding-top: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div style="font-size: 24px; font-weight: 900; letter-spacing: -0.5px; color: #ffffff;">
        Civic<span style="color: #6ee7b7;">GreenNet</span>
      </div>
      <p style="margin: 4px 0 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1.2px; color: #d1fae5; font-weight: 700;">Smart Civic Governance Platform</p>
    </div>
    <div class="content">
      <h2>${title}</h2>
      ${bodyHtml}
    </div>
    <div class="footer">
      <p>This is an automated notification from Civic GreenNet.</p>
      <p>Need help? Contact support at <a href="mailto:${supportEmailAddr}" style="color: #10b981; text-decoration: none; font-weight: 600;">${supportEmailAddr}</a></p>
      <p>&copy; 2026 Civic GreenNet. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Reusable generic email sending function with validation, logging, and error normalization.
 */
async function sendEmail({
  to,
  subject,
  html,
  text,
  replyTo,
  tags,
  idempotencyKey,
  attachments,
  userId,
  complaintId,
  eventType = 'GENERIC'
}) {
  return sendAndLog({
    userId,
    complaintId,
    eventType,
    recipient: Array.isArray(to) ? to[0] : to,
    subject,
    html,
    text,
    replyTo,
    tags,
    deduplicationKey: idempotencyKey,
    attachments
  });
}

// Low-level helper to send mail via Resend & log delivery record in db
async function sendAndLog({
  userId,
  complaintId,
  eventType,
  recipient,
  subject,
  html,
  text,
  replyTo,
  tags,
  deduplicationKey,
  attachments
}) {
  // STRICT RECIPIENT VALIDATION: Fail loudly if recipient is missing or invalid
  if (!recipient || typeof recipient !== 'string' || !recipient.trim()) {
    const errMsg = `[EMAIL ERROR] Cannot send email for ${eventType}: recipient email is missing or invalid`;
    logger.error(errMsg);
    throw new Error(`Email recipient is required for ${eventType}`);
  }
  recipient = recipient.trim();

  const fromAddress = process.env.EMAIL_FROM || EMAIL.FROM || 'Civic GreenNet <notifications@civicgreennet.dev>';
  const replyToAddress = replyTo || process.env.EMAIL_REPLY_TO || EMAIL.REPLY_TO || 'civicgreennet@gmail.com';

  // Bypass real Resend send & database log pollution during test environment runs
  if (process.env.NODE_ENV === 'test' || process.env.TEST_MODE === 'true') {
    logger.info(`[TEST MODE] Suppressed email delivery for ${eventType} to ${maskEmail(recipient)}`);
    return { success: true, messageId: 'test-message-id', testMode: true };
  }

  const client = getResendClient();
  if (!client) {
    logger.warn(`No Resend client active. Email for ${eventType} to ${maskEmail(recipient)} skipped (logged as pending).`);
    return { success: false, status: 'pending', error: 'Resend API key not configured', errorCode: 'NOT_CONFIGURED' };
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
  // Initialize pending log in email_logs table
  if (db._pool) {
    try {
      const q = `INSERT INTO email_logs(user_id, complaint_id, event_type, recipient, subject, status, deduplication_key, attempt_count)
                 VALUES($1, $2, $3, $4, $5, 'pending', $6, 1) RETURNING id`;
      const res = await db.query(q, [userId || null, complaintId || null, eventType, recipient, subject, deduplicationKey || null]);
      logId = res.rows[0].id;
    } catch (e) {
      if (e.code === '23505') { // Unique constraint violation
        logger.info(`Duplicate email prevented by database constraint: ${deduplicationKey}`);
        return { success: true, duplicate: true };
      }
      if (e.code === '23503') { // Foreign key constraint violation
        try {
          const fallbackQ = `INSERT INTO email_logs(user_id, complaint_id, event_type, recipient, subject, status, deduplication_key, attempt_count)
                             VALUES(NULL, NULL, $1, $2, $3, 'pending', $4, 1) RETURNING id`;
          const fallbackRes = await db.query(fallbackQ, [eventType, recipient, subject, deduplicationKey || null]);
          logId = fallbackRes.rows[0].id;
        } catch (fErr) {
          logger.error('Failed to write initial email log fallback', { err: fErr.message });
        }
      } else {
        logger.error('Failed to write initial email log', { err: e.message });
      }
    }
  }

  // Controlled retry loop for transient failures (max 3 attempts)
  let lastError = null;
  let sendResult = null;
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const emailPayload = {
        from: fromAddress,
        to: [recipient],
        replyTo: replyToAddress,
        subject,
        html,
        text
      };

      if (deduplicationKey) {
        emailPayload.headers = {
          'X-Entity-Ref-ID': deduplicationKey
        };
      }

      if (attachments && Array.isArray(attachments) && attachments.length > 0) {
        emailPayload.attachments = attachments.map(att => ({
          filename: att.filename,
          content: typeof att.content === 'string' ? Buffer.from(att.content) : att.content,
          content_type: att.contentType
        }));
      }

      if (tags && Array.isArray(tags)) {
        emailPayload.tags = tags;
      }

      const sendOptions = deduplicationKey ? { idempotencyKey: deduplicationKey } : undefined;
      const res = await client.emails.send(emailPayload, sendOptions);

      if (res && res.error) {
        lastError = new Error(res.error.message || 'Resend delivery failed');
        const errMsg = (res.error.message || '').toLowerCase();
        // Do not retry permanent errors
        if (errMsg.includes('api key') || errMsg.includes('unauthorized') || errMsg.includes('invalid') || errMsg.includes('domain') || errMsg.includes('validation')) {
          break;
        }
        if (attempt < maxAttempts) {
          await new Promise(r => setTimeout(r, attempt * 200));
        }
      } else if (res && res.data && res.data.id) {
        sendResult = res.data;
        lastError = null;
        break;
      } else {
        lastError = new Error('No message ID returned from Resend');
        if (attempt < maxAttempts) {
          await new Promise(r => setTimeout(r, attempt * 200));
        }
      }
    } catch (err) {
      lastError = err;
      const errMsg = (err.message || '').toLowerCase();
      if (errMsg.includes('api key') || errMsg.includes('unauthorized') || errMsg.includes('validation')) {
        break;
      }
      if (attempt < maxAttempts) {
        await new Promise(r => setTimeout(r, attempt * 200));
      }
    }
  }

  if (sendResult && sendResult.id) {
    if (logId && db._pool) {
      try {
        await db.query(
          `UPDATE email_logs SET status='sent', provider_message_id=$1, sent_at=now() WHERE id=$2`,
          [sendResult.id, logId]
        );
      } catch (dbErr) {
        logger.warn('Failed to update email log status to sent', { err: dbErr.message });
      }
    }
    logger.info(`Email successfully sent via Resend: ${eventType} to ${maskEmail(recipient)}`);
    return { success: true, messageId: sendResult.id };
  } else {
    const errorMsg = lastError ? lastError.message : 'Unknown Resend error';
    logger.error(`Failed sending email for ${eventType} to ${maskEmail(recipient)}`, { err: errorMsg });
    if (logId && db._pool) {
      try {
        await db.query(
          `UPDATE email_logs SET status='failed', error_message=$1 WHERE id=$2`,
          [errorMsg, logId]
        );
      } catch (dbErr) {
        logger.warn('Failed to update email log status to failed', { err: dbErr.message });
      }
    }
    return { success: false, error: errorMsg, errorCode: 'EMAIL_SEND_FAILED' };
  }
}

// Retry a specific log record, strictly preserving the original recipient
async function retryEmailLog(id) {
  const client = getResendClient();
  if (!db._pool || !client) return false;

  try {
    const r = await db.query('SELECT * FROM email_logs WHERE id=$1', [id]);
    const log = r.rows[0];
    if (!log || log.status === 'sent') return false;

    if (!log.recipient || typeof log.recipient !== 'string' || !log.recipient.trim()) {
      throw new Error(`Email log #${id} has no valid recipient recorded.`);
    }

    const recipient = log.recipient.trim();
    const fromAddress = process.env.EMAIL_FROM || EMAIL.FROM || 'Civic GreenNet <notifications@civicgreennet.dev>';
    const replyToAddress = process.env.EMAIL_REPLY_TO || EMAIL.REPLY_TO || 'civicgreennet@gmail.com';

    // Increment attempt count
    await db.query('UPDATE email_logs SET attempt_count = attempt_count + 1 WHERE id=$1', [id]);

    let user = null;
    let complaint = null;
    if (log.user_id) {
      user = await resolveUser(log.user_id);
    }
    if (log.complaint_id) {
      const c = await db.query('SELECT * FROM complaints WHERE id=$1', [log.complaint_id]);
      complaint = c.rows[0];
    }

    const { subject, html, text } = await buildEmailPayload(log.event_type, user, complaint, recipient, log.token || null);

    const res = await client.emails.send({
      from: fromAddress,
      to: [recipient],
      replyTo: replyToAddress,
      subject: log.subject || subject,
      html,
      text
    });

    if (res.error) {
      throw new Error(res.error.message || 'Resend retry failed');
    }

    const messageId = res.data?.id || 'resend-retry-id';

    await db.query(
      `UPDATE email_logs SET status='sent', provider_message_id=$1, error_message=NULL, sent_at=now() WHERE id=$2`,
      [messageId, id]
    );
    logger.info(`Successfully retried email log #${id} to ${maskEmail(recipient)} via Resend`);
    return true;
  } catch (e) {
    logger.error(`Retry attempt failed for email log #${id}`, { err: e.message });
    await db.query('UPDATE email_logs SET error_message=$1 WHERE id=$2', [e.message, id]);
    return false;
  }
}

// Background batch retry job
async function batchRetryFailed() {
  const client = getResendClient();
  if (!db._pool || !client) return;
  try {
    const r = await db.query("SELECT id FROM email_logs WHERE status='failed' AND attempt_count < 3 LIMIT 10");
    for (const row of r.rows) {
      await retryEmailLog(row.id);
    }
  } catch (e) {
    logger.error('Batch retry job failed', { err: e.message });
  }
}

// ─── Template Payload Builders ────────────────────────────────────────────────

async function buildEmailPayload(eventType, user, complaint, customRecipientEmail, token = null) {
  let title = 'Notification';
  let bodyHtml = '';
  let text = '';
  let subject = 'Civic GreenNet Notification';

  const supportEmailAddr = process.env.EMAIL_REPLY_TO || EMAIL.SUPPORT_EMAIL || 'civicgreennet@gmail.com';

  switch (eventType) {
    case 'WELCOME': {
      const loginUrl = buildFrontendUrl('/login');
      subject = 'Welcome to Civic GreenNet';
      title = 'Welcome to Civic GreenNet!';
      bodyHtml = `
        <p>Dear ${user?.name || 'Citizen'},</p>
        <p>Thank you for joining Civic GreenNet — the smart civic governance platform designed to make our community cleaner, safer, and more efficient.</p>
        <p>Your account is ready! You can now report civic issues, track resolution progress in real-time, and get AI-assisted updates.</p>
        <div class="btn-container">
          <a href="${loginUrl}" class="btn">Access Dashboard</a>
        </div>
        <p class="fallback-url">If the button above does not work, copy and paste this link into your browser:<br/><a href="${loginUrl}" style="color: #10b981; word-break: break-all;">${loginUrl}</a></p>
        <p>If you have any questions or need assistance, feel free to contact support at <a href="mailto:${supportEmailAddr}">${supportEmailAddr}</a>.</p>
      `;
      text = `Welcome to Civic GreenNet, ${user?.name || 'Citizen'}! Your account is ready. Access the dashboard here: ${loginUrl}`;
      break;
    }

    case 'PASSWORD_RESET': {
      const resetUrl = buildFrontendUrl('/reset-password', { token });
      subject = 'Reset your Civic GreenNet password';
      title = 'Reset Password';
      bodyHtml = `
        <p>Hello ${user?.name || ''},</p>
        <p>We received a request to reset your password for your Civic GreenNet account.</p>
        <p>Click the button below to choose a new password. This link will expire in 1 hour.</p>
        <div class="btn-container">
          <a href="${resetUrl}" class="btn">Reset Password</a>
        </div>
        <p class="fallback-url">If the button above does not work, copy and paste this link into your browser:<br/><a href="${resetUrl}" style="color: #10b981; word-break: break-all;">${resetUrl}</a></p>
        <p><strong>Security Warning:</strong> If you did not request this reset, please ignore this email. Your password will remain secure.</p>
      `;
      text = `Reset your password by visiting this link: ${resetUrl}`;
      break;
    }

    case 'EMAIL_OTP_VERIFICATION': {
      const otpCode = token; // token param holds the raw 6-digit OTP
      subject = 'Verify your Civic GreenNet account';
      title = 'Verify Your Email Address';
      bodyHtml = `
        <p>Hello <strong>${user?.name || 'Citizen'}</strong>,</p>
        <p>Welcome to <strong>Civic GreenNet</strong> — Smart Civic Governance Platform.</p>
        <p>Use the verification code below to verify your email address and activate your account:</p>
        
        <div style="text-align: center; margin: 28px 0;">
          <div style="display: inline-block; background: #ecfdf5; border: 2px dashed #059669; border-radius: 12px; padding: 16px 36px;">
            <span style="font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #047857;">${otpCode}</span>
          </div>
          <p style="margin-top: 10px; font-size: 13px; color: #475569; font-weight: 600;">
            ⏳ This code expires in <strong>10 minutes</strong>.
          </p>
        </div>

        <div class="meta-box" style="border-left: 4px solid #059669; background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; padding: 14px 18px; margin: 20px 0;">
          <p style="margin: 0 0 6px 0; font-size: 13px; font-weight: 700; color: #0f172a;">🛡️ For your security:</p>
          <ul style="margin: 0; padding-left: 18px; font-size: 12px; color: #475569; line-height: 1.6;">
            <li>Never share this code with anyone.</li>
            <li>Civic GreenNet will never ask for your OTP.</li>
            <li>If you did not request this account, you can safely ignore this email.</li>
          </ul>
        </div>
      `;
      text = `Hello ${user?.name || 'Citizen'},\n\nWelcome to Civic GreenNet.\n\nUse the verification code below:\n[ ${otpCode} ]\n\nThis code expires in 10 minutes.\n\nFor your security:\n- Never share this code.\n- Civic GreenNet will never ask for your OTP.\n\nIf you did not request this account, you can safely ignore this email.\n\nCivic GreenNet\nSmart Civic Governance Platform`;
      break;
    }

    case 'EMAIL_VERIFICATION': {
      const verifyUrl = buildFrontendUrl('/verify', { token });
      subject = 'Verify your email';
      title = 'Verify Your Email Address';
      bodyHtml = `
        <p>Hello ${user?.name || ''},</p>
        <p>Please click the button below to verify your email address and activate your Civic GreenNet citizen profile.</p>
        <div class="btn-container">
          <a href="${verifyUrl}" class="btn">Verify Email</a>
        </div>
        <p class="fallback-url">If the button above does not work, copy and paste this link into your browser:<br/><a href="${verifyUrl}" style="color: #10b981; word-break: break-all;">${verifyUrl}</a></p>
      `;
      text = `Verify your email by visiting this link: ${verifyUrl}`;
      break;
    }

    case 'OFFICER_REGISTRATION_RECEIVED':
      if (!user || !user.name || !user.email) {
        logger.error('[EMAIL TEMPLATE ERROR] Cannot build OFFICER_REGISTRATION_RECEIVED payload: user record or user name/email is missing');
        throw new Error('Cannot send officer registration confirmation email: real officer name and email are required');
      }
      subject = 'Officer Registration Received';
      title = 'Application Received';
      bodyHtml = `
        <p>Dear <strong>${user.name}</strong>,</p>
        <p>Thank you for submitting your officer application for Civic GreenNet.</p>
        <div class="meta-box">
          <div class="meta-item"><span class="meta-label">Name:</span> <strong>${user.name}</strong></div>
          <div class="meta-item"><span class="meta-label">Email:</span> <strong>${user.email}</strong></div>
          <div class="meta-item"><span class="meta-label">Status:</span> <strong>Pending Administrator Review</strong></div>
        </div>
        <p>Your profile is under review by municipal administrators. You will receive an email once your account is approved.</p>
      `;
      text = `Officer registration received for ${user.name} (${user.email}). Your application is pending administrator approval.`;
      break;

    case 'OFFICER_PENDING_APPROVAL': {
      if (!user || !user.name || !user.email) {
        logger.error('[EMAIL TEMPLATE ERROR] Cannot build OFFICER_PENDING_APPROVAL payload: user record or user name/email is missing');
        throw new Error('Cannot send officer registration request email: real officer name and email are required');
      }

      const formattedDate = user.created_at
        ? new Date(user.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        : new Date().toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

      const officerRegId = user.id ? `CGN-REG-${new Date(user.created_at || Date.now()).getFullYear()}-${String(user.id).padStart(5, '0')}` : 'N/A';
      const deptDisplay = user.department_name || (user.department_id ? `Department #${user.department_id}` : 'General Municipal');
      const adminUsersUrl = buildFrontendUrl('/admin/users');

      subject = 'New Officer Registration Requires Approval';
      title = 'Officer Registration Request';
      bodyHtml = `
        <p>Admin Team,</p>
        <p>A new officer has registered and requires administrative approval in Civic GreenNet.</p>
        <h3 style="color: #0f172a; font-size: 14px; font-weight: 700; margin-top: 20px; margin-bottom: 10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">Officer Details</h3>
        <div class="meta-box">
          <div class="meta-item"><span class="meta-label">Name:</span> <strong>${user.name}</strong></div>
          <div class="meta-item"><span class="meta-label">Email:</span> <strong>${user.email}</strong></div>
          <div class="meta-item"><span class="meta-label">Department:</span> ${deptDisplay}</div>
          <div class="meta-item"><span class="meta-label">Registered:</span> ${formattedDate}</div>
          <div class="meta-item"><span class="meta-label">Officer ID:</span> <code>${officerRegId}</code></div>
        </div>
        <div class="btn-container">
          <a href="${adminUsersUrl}" class="btn">Review User Portal</a>
        </div>
        <p class="fallback-url">If the button above does not work, copy and paste this link into your browser:<br/><a href="${adminUsersUrl}" style="color: #10b981; word-break: break-all;">${adminUsersUrl}</a></p>
      `;
      text = `New officer registration: ${user.name} (${user.email}) from ${deptDisplay}. Registered at: ${formattedDate}. Officer ID: ${officerRegId}. Review at ${adminUsersUrl}`;
      break;
    }

    case 'OFFICER_APPROVED': {
      if (!user || !user.name || !user.email) {
        logger.error('[EMAIL TEMPLATE ERROR] Cannot build OFFICER_APPROVED payload: user record or user name/email is missing');
        throw new Error('Cannot send officer approval email: real officer name and email are required');
      }
      const loginUrl = buildFrontendUrl('/login');
      subject = 'Your Civic GreenNet Officer Account Has Been Approved';
      title = 'Officer Account Approved';
      bodyHtml = `
        <p>Dear <strong>${user.name}</strong>,</p>
        <p>We are pleased to inform you that your request to join Civic GreenNet as a Smart Governance Officer has been approved by the Administration.</p>
        <div class="meta-box">
          <div class="meta-item"><span class="meta-label">Name:</span> ${user.name}</div>
          <div class="meta-item"><span class="meta-label">Email:</span> ${user.email}</div>
          <div class="meta-item"><span class="meta-label">Role:</span> Officer</div>
          <div class="meta-item"><span class="meta-label">Employee ID:</span> <strong>${user.employee_id || 'N/A'}</strong></div>
        </div>
        <p>You can now log in to the portal using your registered credentials to access your assignments, update resolution work orders, and review SLA metrics.</p>
        <div class="btn-container">
          <a href="${loginUrl}" class="btn">Log In Now</a>
        </div>
        <p class="fallback-url">If the button above does not work, copy and paste this link into your browser:<br/><a href="${loginUrl}" style="color: #10b981; word-break: break-all;">${loginUrl}</a></p>
      `;
      text = `Your Civic GreenNet officer profile was approved. Employee ID: ${user.employee_id || 'N/A'}. Login here: ${loginUrl}`;
      break;
    }

    case 'OFFICER_REJECTED':
      if (!user || !user.name || !user.email) {
        logger.error('[EMAIL TEMPLATE ERROR] Cannot build OFFICER_REJECTED payload: user record or user name/email is missing');
        throw new Error('Cannot send officer rejection email: real officer name and email are required');
      }
      subject = 'Civic GreenNet Officer Application Update';
      title = 'Application Status Update';
      bodyHtml = `
        <p>Dear <strong>${user.name}</strong>,</p>
        <p>Thank you for your interest in joining Civic GreenNet. After review, your application for an officer profile has not been approved at this time.</p>
        <div class="meta-box">
          <div class="meta-item"><span class="meta-label">Reason:</span> ${user.rejection_reason || 'Rejection by administrator'}</div>
        </div>
        <p>If you believe this is a mistake or have updated credentials, please reach out to support at <a href="mailto:${supportEmailAddr}">${supportEmailAddr}</a>.</p>
      `;
      text = `Your Civic GreenNet officer registration request was rejected. Reason: ${user.rejection_reason || 'N/A'}`;
      break;

    case 'COMPLAINT_SUBMITTED': {
      const complaintUrl = buildFrontendUrl(`/complaints/${complaint?.id || ''}`);
      subject = `Complaint Submitted: #${complaint?.id ? `CGN-${String(complaint.id).padStart(5, '0')}` : ''}`;
      title = 'Complaint Submission Confirmed';
      bodyHtml = `
        <p>Dear Citizen,</p>
        <p>Your civic complaint has been successfully submitted and saved in the Civic GreenNet database.</p>
        <div class="meta-box">
          <div class="meta-item"><span class="meta-label">Reference Number:</span> #CGN-${complaint?.id ? String(complaint.id).padStart(5, '0') : 'N/A'}</div>
          <div class="meta-item"><span class="meta-label">Title:</span> ${complaint?.title || 'Untitled'}</div>
          <div class="meta-item"><span class="meta-label">Category:</span> ${complaint?.category || 'General'}</div>
          <div class="meta-item"><span class="meta-label">Priority:</span> <span style="text-transform: capitalize;">${complaint?.priority || 'Medium'}</span></div>
          <div class="meta-item"><span class="meta-label">Status:</span> <strong>${complaint?.status || 'Open'}</strong></div>
          <div class="meta-item"><span class="meta-label">Submitted On:</span> ${complaint?.created_at ? new Date(complaint.created_at).toLocaleString() : new Date().toLocaleString()}</div>
        </div>
        <div class="btn-container">
          <a href="${complaintUrl}" class="btn">Track Complaint</a>
        </div>
        <p class="fallback-url">If the button above does not work, copy and paste this link into your browser:<br/><a href="${complaintUrl}" style="color: #10b981; word-break: break-all;">${complaintUrl}</a></p>
      `;
      text = `Your complaint #CGN-${complaint?.id} ("${complaint?.title}") is open. Track it here: ${complaintUrl}`;
      break;
    }

    case 'COMPLAINT_ASSIGNED_OFFICER':
    case 'COMPLAINT_ASSIGNED': {
      const officerUrl = buildFrontendUrl(`/complaints/${complaint?.id || ''}`);
      subject = `New Complaint Assigned to You: #CGN-${complaint?.id ? String(complaint.id).padStart(5, '0') : ''}`;
      title = 'New Case Assignment';
      bodyHtml = `
        <p>Hello Officer,</p>
        <p>A new civic complaint has been assigned to you for resolution.</p>
        <div class="meta-box">
          <div class="meta-item"><span class="meta-label">Reference:</span> #CGN-${complaint?.id ? String(complaint.id).padStart(5, '0') : 'N/A'}</div>
          <div class="meta-item"><span class="meta-label">Title:</span> ${complaint?.title || 'Untitled'}</div>
          <div class="meta-item"><span class="meta-label">Category:</span> ${complaint?.category || 'General'}</div>
          <div class="meta-item"><span class="meta-label">Priority:</span> <span style="text-transform: capitalize;">${complaint?.priority || 'Medium'}</span></div>
          <div class="meta-item"><span class="meta-label">SLA Deadline:</span> <strong>${complaint?.sla_due_at ? new Date(complaint.sla_due_at).toLocaleString() : 'N/A'}</strong></div>
        </div>
        <div class="btn-container">
          <a href="${officerUrl}" class="btn">Open Work Order</a>
        </div>
        <p class="fallback-url">If the button above does not work, copy and paste this link into your browser:<br/><a href="${officerUrl}" style="color: #10b981; word-break: break-all;">${officerUrl}</a></p>
      `;
      text = `Complaint #CGN-${complaint?.id} has been assigned to you. SLA due: ${complaint?.sla_due_at}`;
      break;
    }

    case 'COMPLAINT_ASSIGNED_CITIZEN': {
      const complaintUrl = buildFrontendUrl(`/complaints/${complaint?.id || ''}`);
      subject = `Your Complaint Has Been Assigned: #CGN-${complaint?.id ? String(complaint.id).padStart(5, '0') : ''}`;
      title = 'Complaint Assigned to Officer';
      bodyHtml = `
        <p>Dear Citizen,</p>
        <p>Your reported issue has been assigned to an officer for resolution.</p>
        <div class="meta-box">
          <div class="meta-item"><span class="meta-label">Reference:</span> #CGN-${complaint?.id ? String(complaint.id).padStart(5, '0') : 'N/A'}</div>
          <div class="meta-item"><span class="meta-label">Title:</span> ${complaint?.title || 'Untitled'}</div>
          <div class="meta-item"><span class="meta-label">Status:</span> <strong>Assigned & In Progress</strong></div>
        </div>
        <div class="btn-container">
          <a href="${complaintUrl}" class="btn">View Live Status</a>
        </div>
        <p class="fallback-url">If the button above does not work, copy and paste this link into your browser:<br/><a href="${complaintUrl}" style="color: #10b981; word-break: break-all;">${complaintUrl}</a></p>
      `;
      text = `Your complaint #CGN-${complaint?.id} has been assigned to an officer. Track status at: ${complaintUrl}`;
      break;
    }

    case 'COMPLAINT_STATUS_CHANGED': {
      const complaintUrl = buildFrontendUrl(`/complaints/${complaint?.id || ''}`);
      subject = `Status Update: Complaint #CGN-${complaint?.id ? String(complaint.id).padStart(5, '0') : ''}`;
      title = 'Complaint Status Updated';
      bodyHtml = `
        <p>Dear Citizen,</p>
        <p>The status of your reported issue has been updated.</p>
        <div class="meta-box">
          <div class="meta-item"><span class="meta-label">Reference:</span> #CGN-${complaint?.id ? String(complaint.id).padStart(5, '0') : 'N/A'}</div>
          <div class="meta-item"><span class="meta-label">Title:</span> ${complaint?.title || 'Untitled'}</div>
          <div class="meta-item"><span class="meta-label">Current Status:</span> <strong style="color: #10b981; text-transform: uppercase;">${complaint?.status || 'Updated'}</strong></div>
        </div>
        <div class="btn-container">
          <a href="${complaintUrl}" class="btn">View Timeline</a>
        </div>
        <p class="fallback-url">If the button above does not work, copy and paste this link into your browser:<br/><a href="${complaintUrl}" style="color: #10b981; word-break: break-all;">${complaintUrl}</a></p>
      `;
      text = `Complaint #CGN-${complaint?.id} status updated to: ${complaint?.status}. View details: ${complaintUrl}`;
      break;
    }

    case 'COMPLAINT_RESOLVED': {
      const complaintUrl = buildFrontendUrl(`/complaints/${complaint?.id || ''}`);
      subject = `Issue Resolved: Complaint #CGN-${complaint?.id ? String(complaint.id).padStart(5, '0') : ''}`;
      title = 'Complaint Resolved';
      bodyHtml = `
        <p>Dear Citizen,</p>
        <p>We are pleased to notify you that your reported issue has been marked as <strong>Resolved</strong> by the department officer.</p>
        <div class="meta-box">
          <div class="meta-item"><span class="meta-label">Reference:</span> #CGN-${complaint?.id ? String(complaint.id).padStart(5, '0') : ''}</div>
          <div class="meta-item"><span class="meta-label">Title:</span> ${complaint?.title}</div>
        </div>
        <p>Please review and verify the resolution. If you are satisfied, you can close the ticket. If the issue persists, you can reject the resolution to reopen it.</p>
        <div class="btn-container">
          <a href="${complaintUrl}" class="btn">Verify Resolution</a>
        </div>
        <p class="fallback-url">If the button above does not work, copy and paste this link into your browser:<br/><a href="${complaintUrl}" style="color: #10b981; word-break: break-all;">${complaintUrl}</a></p>
      `;
      text = `Complaint #CGN-${complaint?.id} is marked as resolved. Please verify at: ${complaintUrl}`;
      break;
    }

    case 'RESOLUTION_VERIFICATION': {
      const complaintUrl = buildFrontendUrl(`/complaints/${complaint?.id || ''}`);
      subject = `Action Required: Verify Resolution for Complaint #CGN-${complaint?.id ? String(complaint.id).padStart(5, '0') : ''}`;
      title = 'Please Verify Resolution';
      bodyHtml = `
        <p>Dear Citizen,</p>
        <p>Please take a moment to verify if the resolution provided for complaint #CGN-${complaint?.id ? String(complaint.id).padStart(5, '0') : ''} is satisfactory.</p>
        <p>Your feedback is vital to maintaining smart governance standards.</p>
        <div class="btn-container">
          <a href="${complaintUrl}" class="btn">Verify Now</a>
        </div>
        <p class="fallback-url">If the button above does not work, copy and paste this link into your browser:<br/><a href="${complaintUrl}" style="color: #10b981; word-break: break-all;">${complaintUrl}</a></p>
      `;
      text = `Verify resolution for complaint #CGN-${complaint?.id}: ${complaintUrl}`;
      break;
    }

    case 'COMPLAINT_REOPENED': {
      const complaintUrl = buildFrontendUrl(`/complaints/${complaint?.id || ''}`);
      subject = `Complaint Reopened: #CGN-${complaint?.id ? String(complaint.id).padStart(5, '0') : ''}`;
      title = 'Complaint Reopened';
      bodyHtml = `
        <p>Hello Officer,</p>
        <p>The citizen has rejected the resolution for complaint #CGN-${complaint?.id ? String(complaint.id).padStart(5, '0') : ''}. As a result, the complaint has been automatically <strong>Reopened</strong>.</p>
        <p>Please inspect the feedback notes, coordinate if needed, and issue a fresh work update.</p>
        <div class="btn-container">
          <a href="${complaintUrl}" class="btn">View Complaint</a>
        </div>
        <p class="fallback-url">If the button above does not work, copy and paste this link into your browser:<br/><a href="${complaintUrl}" style="color: #10b981; word-break: break-all;">${complaintUrl}</a></p>
      `;
      text = `Complaint #CGN-${complaint?.id} was reopened by the citizen.`;
      break;
    }

    case 'SLA_WARNING': {
      const complaintUrl = buildFrontendUrl(`/complaints/${complaint?.id || ''}`);
      subject = `SLA Warning: Complaint #CGN-${complaint?.id ? String(complaint.id).padStart(5, '0') : ''} approaching deadline`;
      title = 'SLA Warning Alert';
      bodyHtml = `
        <p>Attention Officer,</p>
        <p>This is a system warning that complaint #CGN-${complaint?.id ? String(complaint.id).padStart(5, '0') : ''} is approaching its SLA resolution deadline.</p>
        <div class="meta-box">
          <div class="meta-item"><span class="meta-label">Reference:</span> #CGN-${complaint?.id ? String(complaint.id).padStart(5, '0') : ''}</div>
          <div class="meta-item"><span class="meta-label">Title:</span> ${complaint?.title}</div>
          <div class="meta-item"><span class="meta-label">Priority:</span> <span style="text-transform: capitalize;">${complaint?.priority}</span></div>
          <div class="meta-item"><span class="meta-label">SLA Due:</span> <strong>${complaint?.sla_due_at ? new Date(complaint.sla_due_at).toLocaleString() : 'N/A'}</strong></div>
        </div>
        <div class="btn-container">
          <a href="${complaintUrl}" class="btn">Inspect Ticket</a>
        </div>
        <p class="fallback-url">If the button above does not work, copy and paste this link into your browser:<br/><a href="${complaintUrl}" style="color: #10b981; word-break: break-all;">${complaintUrl}</a></p>
      `;
      text = `SLA Warning: Complaint #CGN-${complaint?.id} is approaching its resolution deadline: ${complaint?.sla_due_at}`;
      break;
    }

    case 'SLA_BREACH': {
      const complaintUrl = buildFrontendUrl(`/complaints/${complaint?.id || ''}`);
      subject = `CRITICAL: SLA Breached on Complaint #CGN-${complaint?.id ? String(complaint.id).padStart(5, '0') : ''}`;
      title = 'SLA BREACH ALERT';
      bodyHtml = `
        <p style="color: #ef4444; font-weight: bold;">CRITICAL ALERT:</p>
        <p>Complaint #CGN-${complaint?.id ? String(complaint.id).padStart(5, '0') : ''} has exceeded its SLA resolution deadline without being marked as resolved or closed.</p>
        <div class="meta-box">
          <div class="meta-item"><span class="meta-label">Reference:</span> #CGN-${complaint?.id ? String(complaint.id).padStart(5, '0') : ''}</div>
          <div class="meta-item"><span class="meta-label">Title:</span> ${complaint?.title}</div>
          <div class="meta-item"><span class="meta-label">Priority:</span> <span style="text-transform: capitalize; color: #ef4444; font-weight: bold;">${complaint?.priority}</span></div>
          <div class="meta-item"><span class="meta-label">SLA Due Date:</span> <strong style="color: #ef4444;">${complaint?.sla_due_at ? new Date(complaint.sla_due_at).toLocaleString() : 'N/A'}</strong></div>
        </div>
        <div class="btn-container">
          <a href="${complaintUrl}" class="btn">Inspect Breached Ticket</a>
        </div>
        <p class="fallback-url">If the button above does not work, copy and paste this link into your browser:<br/><a href="${complaintUrl}" style="color: #10b981; word-break: break-all;">${complaintUrl}</a></p>
      `;
      text = `SLA BREACH: Complaint #CGN-${complaint?.id} has breached its SLA due date: ${complaint?.sla_due_at}`;
      break;
    }

    case 'ROLE_CHANGED': {
      const loginUrl = buildFrontendUrl('/login');
      const onboardingUrl = buildFrontendUrl('/officer/onboarding');
      const isOfficer = user?.role === 'officer';
      subject = 'Your Civic GreenNet Account Role Has Been Updated';
      title = 'Account Role Updated';
      bodyHtml = `
        <p>Dear <strong>${user?.name || 'User'}</strong>,</p>
        <p>Your account role in Civic GreenNet has been updated by an administrator.</p>
        <div class="meta-box">
          <div class="meta-item"><span class="meta-label">Name:</span> ${user?.name || 'N/A'}</div>
          <div class="meta-item"><span class="meta-label">Email:</span> ${user?.email || 'N/A'}</div>
          <div class="meta-item"><span class="meta-label">New Role:</span> <strong style="text-transform: uppercase; color: #059669;">${user?.role || 'Citizen'}</strong></div>
          ${user?.employee_id ? `<div class="meta-item"><span class="meta-label">Employee ID:</span> <strong>${user.employee_id}</strong></div>` : ''}
        </div>
        ${isOfficer ? `
          <p>Please complete your officer onboarding and profile verification documents to begin receiving assigned complaints.</p>
          <div class="btn-container">
            <a href="${onboardingUrl}" class="btn">Complete Officer Onboarding</a>
          </div>
          <p class="fallback-url">If the button does not work, visit:<br/><a href="${onboardingUrl}" style="color: #10b981; word-break: break-all;">${onboardingUrl}</a></p>
        ` : `
          <div class="btn-container">
            <a href="${loginUrl}" class="btn">Sign In to Dashboard</a>
          </div>
          <p class="fallback-url">If the button does not work, visit:<br/><a href="${loginUrl}" style="color: #10b981; word-break: break-all;">${loginUrl}</a></p>
        `}
      `;
      text = `Your Civic GreenNet role has been updated to: ${user?.role}.`;
      break;
    }

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

// ─── Preference Check Helper ─────────────────────────────────────────────────

async function shouldSend(userId, key) {
  if (!userId || !db._pool) return true;
  try {
    const r = await db.query('SELECT * FROM notification_preferences WHERE user_id=$1', [userId]);
    if (r.rows.length === 0) return true;
    const prefs = r.rows[0] || {};
    if (key === 'complaint_updates' && prefs.email_complaint_updates === false) return false;
    if (key === 'followed_updates' && prefs.email_followed_updates === false) return false;
    if (key === 'community_activity' && prefs.email_community_activity === false) return false;
    return true;
  } catch (e) {
    logger.warn('Failed to load user notification preference', { err: e.message });
    return true;
  }
}

// ─── Exported Email Dispatch Functions ──────────────────────────────────────

async function sendWelcomeEmail(userOrId) {
  const user = await resolveUser(userOrId);
  if (!user || !user.email) {
    throw new Error('User record with a valid email address is required for WELCOME email');
  }
  const { subject, html, text } = await buildEmailPayload('WELCOME', user);
  return sendAndLog({
    userId: user.id,
    eventType: 'WELCOME',
    recipient: user.email,
    subject,
    html,
    text,
    deduplicationKey: `welcome_${user.id}`
  });
}

async function sendOtpVerificationEmail(to, otp, purpose = 'signup', userOrNull = null) {
  if (!to || typeof to !== 'string' || !to.trim()) {
    throw new Error('Recipient email address is required for sendOtpVerificationEmail');
  }
  const email = to.trim().toLowerCase();
  let user = userOrNull;
  if (!user && db._pool) {
    try {
      const userRes = await db.query('SELECT id, name, email FROM users WHERE LOWER(TRIM(email)) = $1', [email]);
      user = userRes.rows[0] || null;
    } catch (e) {
      // non-blocking
    }
  }
  const { subject, html, text } = await buildEmailPayload('EMAIL_OTP_VERIFICATION', user, null, email, otp);
  return sendAndLog({
    userId: user ? user.id : null,
    eventType: 'EMAIL_OTP_VERIFICATION',
    recipient: email,
    subject,
    html,
    text
  });
}

async function sendEmailVerification(to, token) {
  if (!to || typeof to !== 'string' || !to.trim()) {
    throw new Error('Recipient email address is required for EMAIL_VERIFICATION');
  }
  const email = to.trim();
  let user = null;
  if (db._pool) {
    const userRes = await db.query('SELECT id, name, email FROM users WHERE email=$1', [email]);
    user = userRes.rows[0] || null;
  }
  const { subject, html, text } = await buildEmailPayload('EMAIL_VERIFICATION', user, null, email, token);
  return sendAndLog({
    userId: user ? user.id : null,
    eventType: 'EMAIL_VERIFICATION',
    recipient: email,
    subject,
    html,
    text
  });
}

async function sendPasswordResetEmail(userOrId, token) {
  const user = await resolveUser(userOrId);
  if (!user || !user.email) {
    throw new Error('User record with a valid email address is required for PASSWORD_RESET');
  }
  const { subject, html, text } = await buildEmailPayload('PASSWORD_RESET', user, null, user.email, token);
  return sendAndLog({
    userId: user.id,
    eventType: 'PASSWORD_RESET',
    recipient: user.email,
    subject,
    html,
    text
  });
}

async function sendPasswordReset(to, token) {
  if (!to || typeof to !== 'string' || !to.trim()) {
    throw new Error('Recipient email address is required for PASSWORD_RESET');
  }
  const email = to.trim();
  let user = null;
  if (db._pool) {
    const userRes = await db.query('SELECT id, name, email FROM users WHERE email=$1', [email]);
    user = userRes.rows[0] || null;
  }
  const { subject, html, text } = await buildEmailPayload('PASSWORD_RESET', user, null, email, token);
  return sendAndLog({
    userId: user ? user.id : null,
    eventType: 'PASSWORD_RESET',
    recipient: email,
    subject,
    html,
    text
  });
}

async function sendOfficerRegistrationReceivedEmail(officerOrId) {
  const officer = await resolveUser(officerOrId);
  if (!officer || !officer.name || !officer.email) {
    logger.error('Cannot send officer registration confirmation email: officer name or email could not be resolved from DB');
    throw new Error('Cannot send officer registration confirmation email: real officer name and email are required');
  }
  const dedupKey = `officer_registration_confirmation:${officer.id}`;
  const { subject, html, text } = await buildEmailPayload('OFFICER_REGISTRATION_RECEIVED', officer);
  return sendAndLog({
    userId: officer.id,
    eventType: 'OFFICER_REGISTRATION_RECEIVED',
    recipient: officer.email,
    subject,
    html,
    text,
    deduplicationKey: dedupKey
  });
}

async function sendAdminOfficerRegistrationEmail(officerOrId) {
  const officer = await resolveUser(officerOrId);
  if (!officer || !officer.name || !officer.email) {
    logger.error('Cannot send officer registration email: officer record or name/email could not be resolved from DB');
    throw new Error('Cannot send officer registration request email: real officer name and email are required');
  }
  const adminEmail = await getAdminEmail();
  if (!adminEmail) {
    throw new Error('Admin recipient email address is not configured');
  }
  const dedupKey = `officer_registration_admin:${officer.id}`;
  const { subject, html, text } = await buildEmailPayload('OFFICER_PENDING_APPROVAL', officer);
  return sendAndLog({
    userId: officer.id,
    eventType: 'OFFICER_PENDING_APPROVAL',
    recipient: adminEmail,
    subject,
    html,
    text,
    deduplicationKey: dedupKey
  });
}

async function sendOfficerApprovalEmail(officerOrId, approved, employeeId = null, rejectionReason = null) {
  const officer = await resolveUser(officerOrId);
  if (!officer || !officer.name || !officer.email) {
    throw new Error('Officer record with a valid email address is required for OFFICER_APPROVAL/REJECTION');
  }
  const eventType = approved ? 'OFFICER_APPROVED' : 'OFFICER_REJECTED';
  const { subject, html, text } = await buildEmailPayload(eventType, { ...officer, employee_id: employeeId, rejection_reason: rejectionReason });
  return sendAndLog({
    userId: officer.id,
    eventType,
    recipient: officer.email,
    subject,
    html,
    text
  });
}

async function sendComplaintSubmittedEmail(complaint, citizenOrId) {
  const citizen = await resolveUser(citizenOrId || complaint?.user_id);
  if (!citizen || !citizen.email) {
    logger.warn(`Cannot send complaint submitted email: citizen email for complaint #${complaint?.id} could not be resolved`);
    return;
  }

  if (citizen.id) {
    const active = await shouldSend(citizen.id, 'complaint_submitted');
    if (!active) {
      logger.info(`Notification "complaint_submitted" disabled for user #${citizen.id}`);
      return;
    }
  }

  const { subject, html, text } = await buildEmailPayload('COMPLAINT_SUBMITTED', citizen, complaint);
  return sendAndLog({
    userId: citizen.id,
    complaintId: complaint?.id,
    eventType: 'COMPLAINT_SUBMITTED',
    recipient: citizen.email,
    subject,
    html,
    text,
    deduplicationKey: `complaint_submitted_${complaint?.id}`
  });
}

async function sendComplaintStatusChangedEmail(complaint, citizenOrId, oldStatus, newStatus) {
  const citizen = await resolveUser(citizenOrId || complaint?.user_id);
  if (!citizen || !citizen.email) {
    logger.warn(`Cannot send complaint status email: citizen email for complaint #${complaint?.id} could not be resolved`);
    return;
  }

  if (citizen.id) {
    const active = await shouldSend(citizen.id, 'status_changes');
    if (!active) {
      logger.info(`Notification "status_changes" disabled for user #${citizen.id}`);
      return;
    }
  }

  const { subject, html, text } = await buildEmailPayload('COMPLAINT_STATUS_CHANGED', citizen, complaint);
  return sendAndLog({
    userId: citizen.id,
    complaintId: complaint?.id,
    eventType: 'COMPLAINT_STATUS_CHANGED',
    recipient: citizen.email,
    subject,
    html,
    text
  });
}

async function sendComplaintAssignedEmail(complaint, officerOrId) {
  const officer = await resolveUser(officerOrId || complaint?.officer_id);
  if (!officer || !officer.email) {
    logger.warn(`Cannot send complaint assigned email: officer email for complaint #${complaint?.id} could not be resolved`);
    return;
  }

  if (officer.id) {
    const active = await shouldSend(officer.id, 'assignment_updates');
    if (!active) {
      logger.info(`Notification "assignment_updates" disabled for user #${officer.id}`);
      return;
    }
  }

  const { subject, html, text } = await buildEmailPayload('COMPLAINT_ASSIGNED_OFFICER', officer, complaint);
  return sendAndLog({
    userId: officer.id,
    complaintId: complaint?.id,
    eventType: 'COMPLAINT_ASSIGNED_OFFICER',
    recipient: officer.email,
    subject,
    html,
    text,
    deduplicationKey: `assignment_officer_${complaint?.id}_${officer.id}`
  });
}

async function sendComplaintAssignedCitizenEmail(complaint, citizenOrId) {
  const citizen = await resolveUser(citizenOrId || complaint?.user_id);
  if (!citizen || !citizen.email) {
    logger.warn(`Cannot send complaint assignment citizen email: citizen email for complaint #${complaint?.id} could not be resolved`);
    return;
  }

  if (citizen.id) {
    const active = await shouldSend(citizen.id, 'assignment_updates');
    if (!active) return;
  }

  const { subject, html, text } = await buildEmailPayload('COMPLAINT_ASSIGNED_CITIZEN', citizen, complaint);
  return sendAndLog({
    userId: citizen.id,
    complaintId: complaint?.id,
    eventType: 'COMPLAINT_ASSIGNED_CITIZEN',
    recipient: citizen.email,
    subject,
    html,
    text,
    deduplicationKey: `assignment_citizen_${complaint?.id}`
  });
}

async function sendComplaintResolvedEmail(complaint, citizenOrId) {
  const citizen = await resolveUser(citizenOrId || complaint?.user_id);
  if (!citizen || !citizen.email) {
    logger.warn(`Cannot send complaint resolved email: citizen email for complaint #${complaint?.id} could not be resolved`);
    return;
  }

  if (citizen.id) {
    const active = await shouldSend(citizen.id, 'resolution');
    if (!active) {
      logger.info(`Notification "resolution" disabled for user #${citizen.id}`);
      return;
    }
  }

  const { subject, html, text } = await buildEmailPayload('COMPLAINT_RESOLVED', citizen, complaint);
  return sendAndLog({
    userId: citizen.id,
    complaintId: complaint?.id,
    eventType: 'COMPLAINT_RESOLVED',
    recipient: citizen.email,
    subject,
    html,
    text,
    deduplicationKey: `resolution_${complaint?.id}`
  });
}

async function sendComplaintReopenedEmail(complaint, officerOrId) {
  const officer = await resolveUser(officerOrId || complaint?.officer_id);
  if (!officer || !officer.email) {
    logger.warn(`Cannot send complaint reopened email: officer email for complaint #${complaint?.id} could not be resolved`);
    return;
  }

  if (officer.id) {
    const active = await shouldSend(officer.id, 'reopened');
    if (!active) {
      logger.info(`Notification "reopened" disabled for user #${officer.id}`);
      return;
    }
  }

  const { subject, html, text } = await buildEmailPayload('COMPLAINT_REOPENED', officer, complaint);
  return sendAndLog({
    userId: officer.id,
    complaintId: complaint?.id,
    eventType: 'COMPLAINT_REOPENED',
    recipient: officer.email,
    subject,
    html,
    text,
    deduplicationKey: `reopen_${complaint?.id}_${Date.now()}`
  });
}

async function sendResolutionVerificationEmail(complaint, citizenOrId) {
  const citizen = await resolveUser(citizenOrId || complaint?.user_id);
  if (!citizen || !citizen.email) {
    logger.warn(`Cannot send resolution verification email: citizen email for complaint #${complaint?.id} could not be resolved`);
    return;
  }

  const { subject, html, text } = await buildEmailPayload('RESOLUTION_VERIFICATION', citizen, complaint);
  return sendAndLog({
    userId: citizen.id,
    complaintId: complaint?.id,
    eventType: 'RESOLUTION_VERIFICATION',
    recipient: citizen.email,
    subject,
    html,
    text,
    deduplicationKey: `res_verif_${complaint?.id}`
  });
}

async function sendSlaWarningEmail(complaint, officerOrId) {
  const officer = await resolveUser(officerOrId || complaint?.officer_id);
  if (!officer || !officer.email) {
    logger.warn(`Cannot send SLA warning email: officer email for complaint #${complaint?.id} could not be resolved`);
    return;
  }

  if (officer.id) {
    const active = await shouldSend(officer.id, 'sla_alerts');
    if (!active) return;
  }

  const { subject, html, text } = await buildEmailPayload('SLA_WARNING', officer, complaint);
  const dedupKey = `sla_warning:${complaint.id}`;
  return sendAndLog({
    userId: officer.id,
    complaintId: complaint.id,
    eventType: 'SLA_WARNING',
    recipient: officer.email,
    subject,
    html,
    text,
    deduplicationKey: dedupKey
  });
}

async function sendSlaBreachedEmail(complaint, officerOrId) {
  const officer = await resolveUser(officerOrId || complaint?.officer_id);
  if (!officer || !officer.email) {
    logger.warn(`Cannot send SLA breach email: officer email for complaint #${complaint?.id} could not be resolved`);
    return;
  }

  if (officer.id) {
    const active = await shouldSend(officer.id, 'sla_alerts');
    if (!active) return;
  }

  const { subject, html, text } = await buildEmailPayload('SLA_BREACH', officer, complaint);
  const dedupKey = `sla_breach:${complaint.id}`;
  return sendAndLog({
    userId: officer.id,
    complaintId: complaint.id,
    eventType: 'SLA_BREACH',
    recipient: officer.email,
    subject,
    html,
    text,
    deduplicationKey: dedupKey
  });
}

async function sendOfficerOnboardingRequiredEmail(user, employeeId) {
  const loginUrl = buildFrontendUrl('/officer/onboarding');
  const subject = 'Civic GreenNet — Complete Your Officer Profile';
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
      <h2 style="color: #059669;">Civic GreenNet — Officer Account Upgraded</h2>
      <p>Hello <strong>${user.name}</strong>,</p>
      <p>Your Civic GreenNet account has been upgraded to <strong>Municipal Officer</strong>.</p>
      <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 15px 0;">
        <p style="margin: 0;"><strong>Officer ID:</strong> ${employeeId}</p>
        <p style="margin: 5px 0 0 0;"><strong>Current Status:</strong> Profile Setup Required</p>
      </div>
      <p>Please complete your Officer profile using the button below before your account can be activated by an administrator.</p>
      <p style="margin-top: 20px;">
        <a href="${loginUrl}" style="background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
          Complete Officer Profile
        </a>
      </p>
      <p style="font-size: 12px; color: #6b7280; margin-top: 25px;">Civic GreenNet Governance & Work Management</p>
    </div>
  `;
  const text = `Hello ${user.name},\n\nYour account has been upgraded to Officer.\nOfficer ID: ${employeeId}\nStatus: Profile Setup Required.\n\nPlease complete your profile: ${loginUrl}`;

  return sendAndLog({
    recipient: user.email,
    userId: user.id,
    eventType: 'OFFICER_PROFILE_REQUIRED',
    subject,
    html: wrapHtml('Complete Officer Profile', html),
    text,
    deduplicationKey: `OFFICER_PROFILE_REQUIRED_${user.id}`
  });
}

async function sendOfficerChangesRequestedEmail(user, reason) {
  const loginUrl = buildFrontendUrl('/officer/onboarding');
  const subject = 'Civic GreenNet — Officer Profile Changes Required';
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
      <h2 style="color: #d97706;">Civic GreenNet — Officer Profile Changes Required</h2>
      <p>Hello <strong>${user.name}</strong>,</p>
      <p>Your officer profile submission requires changes before administrator approval:</p>
      <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #d97706;">
        <p style="margin: 0;"><strong>Admin Feedback:</strong> ${reason}</p>
      </div>
      <p>Please update your profile details using the link below:</p>
      <p style="margin-top: 20px;">
        <a href="${loginUrl}" style="background-color: #d97706; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
          Update Officer Profile
        </a>
      </p>
    </div>
  `;
  const text = `Hello ${user.name},\n\nYour officer profile requires changes before approval.\nReason: ${reason}\nUpdate profile: ${loginUrl}`;

  return sendAndLog({
    recipient: user.email,
    userId: user.id,
    eventType: 'OFFICER_CHANGES_REQUESTED',
    subject,
    html: wrapHtml('Officer Changes Requested', html),
    text,
    deduplicationKey: `OFFICER_CHANGES_${user.id}_${Date.now()}`
  });
}

async function sendRoleChangedEmail(userOrId) {
  const user = await resolveUser(userOrId);
  if (!user || !user.email) {
    throw new Error('User record with a valid email address is required for ROLE_CHANGED email');
  }
  const { subject, html, text } = await buildEmailPayload('ROLE_CHANGED', user);
  return sendAndLog({
    userId: user.id,
    eventType: 'ROLE_CHANGED',
    recipient: user.email,
    subject,
    html,
    text
  });
}

async function sendScheduledReportEmail({ report, schedule, recipientEmail, executionType = 'scheduled' }) {
  if (!recipientEmail || typeof recipientEmail !== 'string' || !recipientEmail.trim()) {
    throw new Error('Recipient email address is required for scheduled report delivery');
  }
  const recipient = recipientEmail.trim();
  const title = schedule?.title || report?.title || 'Automated Municipal Governance Report';
  const frequency = schedule?.frequency ? schedule.frequency.toUpperCase() : 'AUTOMATED';
  const reportCenterUrl = buildFrontendUrl('/admin', { tab: 'reports' });
  const generatedAt = new Date().toLocaleString('en-IN', { timeZone: schedule?.timezone || 'Asia/Kolkata', dateStyle: 'full', timeStyle: 'medium' });

  // Build KPI summary table if summary available
  let summaryRows = '';
  if (report?.summary && typeof report.summary === 'object') {
    summaryRows = Object.entries(report.summary)
      .map(([k, v]) => `<tr><td style="padding: 6px 12px; font-weight: 600; color: #475569; border-bottom: 1px solid #e2e8f0;">${k}</td><td style="padding: 6px 12px; font-weight: 700; color: #0f172a; border-bottom: 1px solid #e2e8f0;">${v}</td></tr>`)
      .join('');
  }

  const subject = `[Civic GreenNet] ${frequency} Report: ${title}`;
  const bodyHtml = `
    <p>Dear Municipal Administrator,</p>
    <p>Your configured automated governance report <strong>${title}</strong> has been generated successfully.</p>
    
    <div class="meta-box">
      <div class="meta-item"><span class="meta-label">Report Title:</span> <strong>${title}</strong></div>
      <div class="meta-item"><span class="meta-label">Report Type:</span> <span style="text-transform: capitalize;">${(schedule?.report_type || 'Governance').replace('_', ' ')}</span></div>
      <div class="meta-item"><span class="meta-label">Schedule Frequency:</span> <strong>${frequency}</strong></div>
      <div class="meta-item"><span class="meta-label">Timezone:</span> ${schedule?.timezone || 'Asia/Kolkata'}</div>
      <div class="meta-item"><span class="meta-label">Generated At:</span> ${generatedAt}</div>
      <div class="meta-item"><span class="meta-label">Total Records:</span> <strong>${report?.totalRows || 0}</strong></div>
    </div>

    ${summaryRows ? `
      <h3 style="color: #0f172a; font-size: 14px; font-weight: 700; margin-top: 20px; margin-bottom: 10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">Executive Key Performance Indicators</h3>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px;">
        <tbody>${summaryRows}</tbody>
      </table>
    ` : ''}

    <p>The structured data file is attached to this email. You can also view live municipal analytics and historical exports directly in the Report Center.</p>
    
    <div class="btn-container">
      <a href="${reportCenterUrl}" class="btn">Open Report Center</a>
    </div>
    <p class="fallback-url">If the button above does not work, copy and paste this link into your browser:<br/><a href="${reportCenterUrl}" style="color: #10b981; word-break: break-all;">${reportCenterUrl}</a></p>
  `;

  const text = `Civic GreenNet ${frequency} Report: ${title}\nGenerated at: ${generatedAt}\nTotal Records: ${report?.totalRows || 0}\nView Report Center: ${reportCenterUrl}`;

  const attachments = [];
  if (report?.content && report?.filename) {
    attachments.push({
      filename: report.filename,
      content: report.content,
      contentType: report.contentType || 'text/plain'
    });
  }

  const dedupKey = `sched_report_${schedule?.id || 'manual'}_${Date.now()}`;
  return sendAndLog({
    userId: schedule?.created_by || null,
    eventType: 'SCHEDULED_REPORT',
    recipient,
    subject,
    html: wrapHtml(title, bodyHtml),
    text,
    deduplicationKey: dedupKey,
    attachments
  });
}

module.exports = {
  sendEmail,
  sendAndLog,
  verifyEmail,
  verifySmtp,
  getAdminEmail,
  maskEmail,
  sendOtpVerificationEmail,
  sendEmailVerification,
  sendPasswordReset,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendRoleChangedEmail,
  sendOfficerRegistrationReceivedEmail,
  sendAdminOfficerRegistrationEmail,
  sendOfficerApprovalEmail,
  sendOfficerOnboardingRequiredEmail,
  sendOfficerChangesRequestedEmail,
  sendComplaintSubmittedEmail,
  sendComplaintAssignedEmail,
  sendComplaintAssignedCitizenEmail,
  sendComplaintStatusChangedEmail,
  sendComplaintResolvedEmail,
  sendComplaintReopenedEmail,
  sendResolutionVerificationEmail,
  sendSlaWarningEmail,
  sendSlaBreachedEmail,
  sendScheduledReportEmail,
  retryEmailLog,
  batchRetryFailed
};
