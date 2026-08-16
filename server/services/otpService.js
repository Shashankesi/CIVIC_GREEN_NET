const crypto = require('crypto');
const db = require('../config/db');
const { JWT } = require('../config');
const logger = require('../utils/logger');

const OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES, 10) || 10;
const OTP_MAX_ATTEMPTS = parseInt(process.env.OTP_MAX_ATTEMPTS, 10) || 5;
const OTP_RESEND_COOLDOWN_SECONDS = parseInt(process.env.OTP_RESEND_COOLDOWN_SECONDS, 10) || 60;

/**
 * Normalizes email address consistently across the platform.
 */
function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

/**
 * Masks an email for privacy display (e.g. j***e@domain.com)
 */
function maskEmail(email) {
  const norm = normalizeEmail(email);
  const parts = norm.split('@');
  if (parts.length !== 2) return norm;
  const [name, domain] = parts;
  if (name.length <= 2) {
    return `${name[0]}*@${domain}`;
  }
  const maskedName = `${name[0]}${'*'.repeat(Math.min(name.length - 2, 4))}${name[name.length - 1]}`;
  return `${maskedName}@${domain}`;
}

/**
 * Generates a cryptographically secure 6-digit numeric string (100000 - 999999).
 */
function generateOtpCode() {
  return crypto.randomInt(100000, 1000000).toString();
}

/**
 * Computes an HMAC SHA-256 hash of the OTP using server-side secret.
 */
function hashOtp(otp, email, purpose = 'signup') {
  const secret = JWT.ACCESS_SECRET || 'civic-greennet-otp-salt-key';
  return crypto
    .createHmac('sha256', secret)
    .update(`${normalizeEmail(email)}:${purpose}:${otp}`)
    .digest('hex');
}

/**
 * Timing-safe comparison of OTP hashes to prevent timing attacks.
 */
function verifyOtpHash(providedOtp, email, purpose, storedHash) {
  if (!providedOtp || !storedHash) return false;
  try {
    const computedHash = hashOtp(providedOtp, email, purpose);
    const a = Buffer.from(computedHash, 'utf8');
    const b = Buffer.from(storedHash, 'utf8');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch (err) {
    logger.error('Error during timingSafeEqual comparison', { err: err.message });
    return false;
  }
}

/**
 * Creates or updates an OTP verification record for an email and purpose.
 * Enforces resend cooldown unless force=true.
 */
async function createOrUpdateOtp({ email, purpose = 'signup', metadata = {}, userId = null, force = false }) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    throw new Error('Valid email address is required for OTP generation');
  }

  // 1. Check existing unverified record for cooldown
  const checkQuery = `
    SELECT id, last_sent_at, expires_at, attempt_count, max_attempts
    FROM email_verifications
    WHERE LOWER(TRIM(email)) = $1 AND purpose = $2 AND verified_at IS NULL
    ORDER BY created_at DESC
    LIMIT 1
  `;
  const existingRes = await db.query(checkQuery, [normalizedEmail, purpose]);
  const existing = existingRes.rows[0];

  if (existing && !force && existing.last_sent_at) {
    const now = Date.now();
    const lastSent = new Date(existing.last_sent_at).getTime();
    const elapsedSeconds = Math.floor((now - lastSent) / 1000);
    if (elapsedSeconds < OTP_RESEND_COOLDOWN_SECONDS) {
      const remainingSeconds = OTP_RESEND_COOLDOWN_SECONDS - elapsedSeconds;
      return {
        cooldown: true,
        remainingSeconds,
        message: `Please wait ${remainingSeconds} seconds before requesting another code.`
      };
    }
  }

  // 2. Generate new OTP and hash
  const rawOtp = generateOtpCode();
  const otpHash = hashOtp(rawOtp, normalizedEmail, purpose);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  // 3. Delete previous unverified records for this email and purpose to avoid clutter
  await db.query(
    'DELETE FROM email_verifications WHERE LOWER(TRIM(email)) = $1 AND purpose = $2 AND verified_at IS NULL',
    [normalizedEmail, purpose]
  );

  // 4. Insert fresh OTP record
  const insertQuery = `
    INSERT INTO email_verifications (
      email, user_id, otp_hash, purpose, expires_at, attempt_count,
      max_attempts, last_sent_at, metadata, created_at, updated_at
    )
    VALUES ($1, $2, $3, $4, $5, 0, $6, now(), $7, now(), now())
    RETURNING id, email, purpose, expires_at, attempt_count, max_attempts, last_sent_at
  `;

  const insertRes = await db.query(insertQuery, [
    normalizedEmail,
    userId,
    otpHash,
    purpose,
    expiresAt,
    OTP_MAX_ATTEMPTS,
    JSON.stringify(metadata || {})
  ]);

  return {
    cooldown: false,
    rawOtp, // Returned ONLY to caller service to be sent via email, never saved to DB or logs
    record: insertRes.rows[0],
    expiresAt,
    expiresInSeconds: OTP_EXPIRY_MINUTES * 60,
    cooldownSeconds: OTP_RESEND_COOLDOWN_SECONDS
  };
}

/**
 * Validates and consumes an OTP code.
 */
async function validateAndConsumeOtp({ email, otp, purpose = 'signup' }) {
  const normalizedEmail = normalizeEmail(email);
  const cleanOtp = String(otp || '').trim();

  if (!normalizedEmail || !cleanOtp) {
    return {
      valid: false,
      code: 'INVALID_INPUT',
      message: 'Email and 6-digit verification code are required.'
    };
  }

  // 1. Fetch latest pending verification record
  const q = `
    SELECT id, user_id, email, otp_hash, purpose, expires_at, verified_at,
           attempt_count, max_attempts, metadata, last_sent_at
    FROM email_verifications
    WHERE LOWER(TRIM(email)) = $1 AND purpose = $2 AND verified_at IS NULL
    ORDER BY created_at DESC
    LIMIT 1
  `;
  const res = await db.query(q, [normalizedEmail, purpose]);
  const record = res.rows[0];

  if (!record) {
    return {
      valid: false,
      code: 'NOT_FOUND',
      message: 'No pending verification request found. Please request a new code.'
    };
  }

  // 2. Check if expired
  if (new Date() > new Date(record.expires_at)) {
    return {
      valid: false,
      code: 'EXPIRED',
      message: 'Your verification code has expired. Please request a new code.'
    };
  }

  // 3. Check attempt limit
  if (record.attempt_count >= record.max_attempts) {
    return {
      valid: false,
      code: 'MAX_ATTEMPTS',
      message: 'Too many incorrect attempts. Please request a new verification code.'
    };
  }

  // 4. Verify cryptographic hash
  const isMatch = verifyOtpHash(cleanOtp, normalizedEmail, purpose, record.otp_hash);

  if (!isMatch) {
    const newAttempts = record.attempt_count + 1;
    await db.query(
      'UPDATE email_verifications SET attempt_count = $1, updated_at = now() WHERE id = $2',
      [newAttempts, record.id]
    );

    const remaining = Math.max(0, record.max_attempts - newAttempts);
    return {
      valid: false,
      code: 'INVALID_OTP',
      remainingAttempts: remaining,
      message: remaining > 0
        ? `Invalid verification code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
        : 'Too many incorrect attempts. Please request a new verification code.'
    };
  }

  // 5. Success: Consume OTP and mark verified
  await db.query(
    'UPDATE email_verifications SET verified_at = now(), updated_at = now() WHERE id = $1',
    [record.id]
  );

  return {
    valid: true,
    userId: record.user_id,
    metadata: typeof record.metadata === 'string' ? JSON.parse(record.metadata) : record.metadata || {},
    email: normalizedEmail,
    purpose: record.purpose
  };
}

/**
 * Periodically cleans up expired unverified OTP records older than 24 hours.
 */
async function cleanupExpiredOtps() {
  try {
    const q = "DELETE FROM email_verifications WHERE verified_at IS NULL AND expires_at < (now() - INTERVAL '24 hours')";
    await db.query(q);
  } catch (err) {
    logger.warn('Failed to cleanup expired OTPs', { err: err.message });
  }
}

module.exports = {
  OTP_EXPIRY_MINUTES,
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_COOLDOWN_SECONDS,
  normalizeEmail,
  maskEmail,
  generateOtpCode,
  hashOtp,
  verifyOtpHash,
  createOrUpdateOtp,
  validateAndConsumeOtp,
  cleanupExpiredOtps
};
