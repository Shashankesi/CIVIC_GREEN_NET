const { validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { JWT } = require('../config');
const { VALID_DESIGNATIONS } = require('./publicController');
const emailService = require('../services/emailService');
const tokenService = require('../services/tokenService');
const userService = require('../services/userService');
const otpService = require('../services/otpService');

const SALT_ROUNDS = 10;
const VALID_ROLES = new Set(['citizen', 'officer', 'admin']);

function normalizeRole(role) {
  const value = String(role || '').toLowerCase();
  return VALID_ROLES.has(value) ? value : 'citizen';
}

async function signup(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const email = String(req.body.email || '').trim().toLowerCase();
    const name = String(req.body.name || '').trim();
    const password = req.body.password || '';
    const accountType = String(req.body.accountType || req.body.role || 'citizen').trim().toLowerCase();
    const safeRole = accountType === 'officer' ? 'officer' : 'citizen';

    const existing = await userService.findByEmail(email);
    if (existing && existing.is_verified) {
      return res.status(409).json({ message: 'An account with this email already exists. Please log in.' });
    }

    // Validate parameters
    if (!name || name.length < 2) return res.status(400).json({ message: 'Name must be at least 2 characters' });
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ message: 'Enter a valid email address' });
    if (!password || password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters' });

    let deptId = null;
    let munId = null;
    let zoneId = null;
    let wardId = null;
    let desig = null;
    let juris = null;
    let phoneNum = String(req.body.phone || '').trim();

    if (safeRole === 'officer') {
      deptId = parseInt(req.body.departmentId || req.body.department_id, 10);
      munId = parseInt(req.body.municipalityId || req.body.municipality_id, 10);
      zoneId = parseInt(req.body.zoneId || req.body.zone_id, 10);
      wardId = parseInt(req.body.wardId || req.body.ward_id, 10);
      desig = String(req.body.designation || '').trim();
      juris = String(req.body.jurisdiction || '').trim();

      if (!phoneNum || !/^\d{10}$/.test(phoneNum)) {
        return res.status(400).json({ message: 'Phone number must be a valid 10-digit number' });
      }

      if (!VALID_DESIGNATIONS.includes(desig)) {
        return res.status(400).json({ message: 'Invalid designation selected' });
      }

      const deptQuery = await db.query('SELECT 1 FROM departments WHERE id = $1', [deptId]);
      if (deptQuery.rows.length === 0) return res.status(400).json({ message: 'Invalid department selected' });

      const munQuery = await db.query('SELECT 1 FROM municipalities WHERE id = $1', [munId]);
      if (munQuery.rows.length === 0) return res.status(400).json({ message: 'Invalid municipality selected' });

      const zoneQuery = await db.query('SELECT 1 FROM zones WHERE id = $1 AND municipality_id = $2', [zoneId, munId]);
      if (zoneQuery.rows.length === 0) return res.status(400).json({ message: 'Invalid zone for selected municipality' });

      const wardQuery = await db.query('SELECT 1 FROM wards WHERE id = $1 AND zone_id = $2', [wardId, zoneId]);
      if (wardQuery.rows.length === 0) return res.status(400).json({ message: 'Invalid ward for selected zone' });
    }

    const settings = { phone: phoneNum };
    if (safeRole === 'officer') {
      settings.designation = desig;
      settings.jurisdiction = juris;
    }

    const hashed = await bcrypt.hash(password, SALT_ROUNDS);
    let user;

    if (existing && !existing.is_verified) {
      // Refresh details for unverified pending account
      const updateQ = `UPDATE users SET name=$1, password=$2, role=$3, settings=$4, department_id=$5, municipality_id=$6, zone_id=$7, ward_id=$8, jurisdiction=$9, designation=$10, created_at=now() WHERE id=$11 RETURNING id, name, email, role, status, is_verified`;
      const updateRes = await db.query(updateQ, [name, hashed, safeRole, JSON.stringify(settings), deptId, munId, zoneId, wardId, juris, desig, existing.id]);
      user = updateRes.rows[0];
    } else {
      user = await userService.createUser({
        name,
        email,
        password: hashed,
        role: safeRole,
        status: safeRole === 'officer' ? 'pending' : 'active',
        settings,
        department_id: deptId,
        municipality_id: munId,
        zone_id: zoneId,
        ward_id: wardId,
        jurisdiction: juris,
        designation: desig
      });
    }

    // Generate cryptographic 6-digit OTP
    const otpRes = await otpService.createOrUpdateOtp({
      email,
      purpose: 'signup',
      userId: user.id,
      force: true
    });

    // Send OTP verification email
    try {
      const emailRes = await emailService.sendOtpVerificationEmail(email, otpRes.rawOtp, 'signup', user);
      if (!emailRes || (!emailRes.success && !emailRes.testMode)) {
        throw new Error(emailRes?.error || 'Email provider failed to deliver OTP');
      }
    } catch (emailErr) {
      const logger = require('../utils/logger');
      logger.error('Failed to send registration OTP email', { err: emailErr.message || emailErr });
      return res.status(500).json({
        success: false,
        message: "We couldn't send the verification email right now. Please check your email address and try again."
      });
    }

    const maskedEmail = otpService.maskEmail(email);

    return res.status(201).json({
      success: true,
      requiresVerification: true,
      email,
      maskedEmail,
      role: safeRole,
      expiresInSeconds: otpRes.expiresInSeconds,
      cooldownSeconds: otpRes.cooldownSeconds,
      message: `A 6-digit verification code has been sent to ${maskedEmail}.`
    });
  } catch (err) {
    next(err);
  }
}

async function verifyOtp(req, res, next) {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const otp = String(req.body.otp || req.body.code || '').trim();
    const purpose = String(req.body.purpose || 'signup').trim().toLowerCase();

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_INPUT',
        message: 'Email and 6-digit verification code are required.'
      });
    }

    const result = await otpService.validateAndConsumeOtp({ email, otp, purpose });
    if (!result.valid) {
      return res.status(400).json({
        success: false,
        code: result.code,
        message: result.message,
        remainingAttempts: result.remainingAttempts
      });
    }

    const user = await userService.findByEmail(email);
    if (!user) {
      return res.status(404).json({ success: false, code: 'USER_NOT_FOUND', message: 'User account not found.' });
    }

    // Mark email verified
    await userService.verifyEmail(user.id);

    const safeRole = normalizeRole(user.role);

    if (safeRole === 'citizen') {
      const accessToken = tokenService.generateAccessToken({ userId: user.id, role: safeRole });
      const refreshToken = tokenService.generateRefreshToken({ userId: user.id, role: safeRole });
      await tokenService.saveRefreshToken(user.id, refreshToken);

      // Send welcome email asynchronously
      try {
        emailService.sendWelcomeEmail(user).catch(() => {});
      } catch (e) {}

      return res.status(200).json({
        success: true,
        verified: true,
        message: 'Email verified successfully! Welcome to Civic GreenNet.',
        accessToken,
        token: accessToken,
        refreshToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: safeRole,
          status: user.status || 'active',
          emailVerified: true
        },
        redirectPath: '/dashboard'
      });
    }

    if (safeRole === 'officer') {
      let departmentName = '';
      let municipalityName = '';
      try {
        if (user.department_id) {
          const deptRes = await db.query('SELECT name FROM departments WHERE id = $1', [user.department_id]);
          departmentName = deptRes.rows[0]?.name || '';
        }
        if (user.municipality_id) {
          const munRes = await db.query('SELECT name FROM municipalities WHERE id = $1', [user.municipality_id]);
          municipalityName = munRes.rows[0]?.name || '';
        }

        await emailService.sendOfficerRegistrationReceivedEmail(user);
        await emailService.sendAdminOfficerRegistrationEmail(user);

        const { rows: admins } = await db.query("SELECT id FROM users WHERE role='admin'");
        const notificationService = require('../services/notificationService');
        for (const admin of admins) {
          await notificationService.create(admin.id, 'OFFICER', {
            title: 'Officer Registration Pending',
            message: 'New officer registration pending approval',
            subtitle: `Officer ${user.name} registered and is awaiting approval.`,
            officerId: user.id
          });
        }
      } catch (err) {
        const logger = require('../utils/logger');
        logger.warn('Non-critical notification error after officer OTP verification', { err: err.message });
      }

      return res.status(200).json({
        success: true,
        verified: true,
        requiresApproval: true,
        message: 'Email verified successfully! Your officer application has been submitted for administrator review.',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: 'officer',
          status: 'pending',
          emailVerified: true,
          registrationId: `CGN-REG-${new Date().getFullYear()}-${String(user.id).padStart(5, '0')}`,
          departmentName,
          municipalityName
        },
        redirectPath: '/pending-approval'
      });
    }

    return res.status(200).json({
      success: true,
      verified: true,
      message: 'Email verified successfully.',
      redirectPath: '/login'
    });
  } catch (err) {
    next(err);
  }
}

async function resendOtp(req, res, next) {
  try {
    const email = String(req.body.email || req.query.email || '').trim().toLowerCase();
    const purpose = String(req.body.purpose || 'signup').trim().toLowerCase();

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email address is required.' });
    }

    const user = await userService.findByEmail(email);
    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'If an account exists for this email, a new verification code has been sent.',
        maskedEmail: otpService.maskEmail(email)
      });
    }

    if (user.is_verified) {
      return res.status(200).json({
        success: true,
        alreadyVerified: true,
        message: 'Your email address is already verified. Please sign in.'
      });
    }

    const otpRes = await otpService.createOrUpdateOtp({
      email,
      purpose,
      userId: user.id,
      force: false
    });

    if (otpRes.cooldown) {
      return res.status(429).json({
        success: false,
        inCooldown: true,
        remainingSeconds: otpRes.remainingSeconds,
        message: otpRes.message
      });
    }

    try {
      const emailRes = await emailService.sendOtpVerificationEmail(email, otpRes.rawOtp, purpose, user);
      if (!emailRes || (!emailRes.success && !emailRes.testMode)) {
        throw new Error(emailRes?.error || 'Failed to resend verification email');
      }
    } catch (emailErr) {
      const logger = require('../utils/logger');
      logger.error('Failed to resend OTP email', { err: emailErr.message || emailErr });
      return res.status(500).json({
        success: false,
        message: "We couldn't send the verification email right now. Please try again in a moment."
      });
    }

    const maskedEmail = otpService.maskEmail(email);

    return res.status(200).json({
      success: true,
      message: `A new verification code has been sent to ${maskedEmail}.`,
      maskedEmail,
      expiresInSeconds: otpRes.expiresInSeconds,
      cooldownSeconds: otpRes.cooldownSeconds
    });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const email = String(req.body.email || '').trim().toLowerCase();
    const { password } = req.body;
    const user = await userService.findByEmail(email);
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    // Verify password first before status or role checks to prevent bypass
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

    // Check email verification status
    if (user.is_verified === false) {
      // Trigger a fresh OTP email automatically if not in cooldown so they can verify right away
      try {
        const otpRes = await otpService.createOrUpdateOtp({
          email: user.email,
          purpose: 'signup',
          userId: user.id,
          force: false
        });
        if (!otpRes.cooldown) {
          const emailRes = await emailService.sendOtpVerificationEmail(user.email, otpRes.rawOtp, 'signup', user);
          if (!emailRes?.success && !emailRes?.testMode) {
            const logger = require('../utils/logger');
            logger.warn('Failed automatic login OTP email dispatch', { err: emailRes?.error });
          }
        }
      } catch (e) {
        // non-blocking
      }

      return res.status(403).json({
        success: false,
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Please verify your email address before signing in. We have sent a verification code to your inbox.',
        email: user.email,
        maskedEmail: otpService.maskEmail(user.email),
        role: user.role
      });
    }

    // Handle blocking status codes
    if (user.status === 'blocked') {
      return res.status(403).json({ message: 'Your account has been blocked. Contact your administrator.' });
    }

    const role = normalizeRole(user.role);
    const accessToken = tokenService.generateAccessToken({ userId: user.id, role });
    const refreshToken = tokenService.generateRefreshToken({ userId: user.id, role });

    await tokenService.saveRefreshToken(user.id, refreshToken);

    req.user = { id: user.id, name: user.name, role: user.role };
    try {
      const auditLogger = require('../utils/auditLogger');
      await auditLogger.log(req, user.role === 'admin' ? 'admin_login' : 'user_login', user.id, 'user', { email: user.email });
    } catch (auditErr) {
      // ignore
    }

    res.json({
      success: true,
      message: 'Login successful',
      accessToken,
      token: accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role,
        status: user.status || 'active',
        emailVerified: !!user.is_verified
      },
      redirectPath: role === 'admin' ? '/admin' : (role === 'officer' && user.status === 'pending') ? '/pending-approval' : role === 'officer' ? '/officer' : '/dashboard'
    });
  } catch (err) {
    next(err);
  }
}

async function refreshToken(req, res, next) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ message: 'Missing token' });

    const payload = tokenService.verifyRefreshToken(refreshToken);
    if (!payload) return res.status(401).json({ message: 'Invalid token' });

    const exists = await tokenService.isRefreshTokenValid(payload.userId, refreshToken);
    if (!exists) return res.status(401).json({ message: 'Invalid token' });

    const accessToken = tokenService.generateAccessToken({ userId: payload.userId, role: payload.role });
    res.json({ accessToken });
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) await tokenService.deleteRefreshToken(refreshToken);
    res.json({ message: 'Logged out' });
  } catch (err) {
    next(err);
  }
}

async function verifyEmail(req, res, next) {
  try {
    const token = String(req.query.token || req.body.token || '').trim();
    if (!token) {
      return res.status(400).json({ success: false, code: 'INVALID_TOKEN', message: 'Missing verification token' });
    }

    let payload = null;
    try {
      payload = tokenService.verifyEmailToken(token);
    } catch (e) {
      // payload stays null
    }

    if (!payload || !payload.userId) {
      return res.status(400).json({ success: false, code: 'EXPIRED_TOKEN', message: 'This verification link has expired or is invalid.' });
    }

    const user = await userService.findById(payload.userId);
    if (!user) {
      return res.status(404).json({ success: false, code: 'INVALID_TOKEN', message: 'Associated user account not found.' });
    }

    if (user.is_verified) {
      return res.status(200).json({ success: true, alreadyVerified: true, code: 'ALREADY_VERIFIED', message: 'Your email is already verified.' });
    }

    await userService.verifyEmail(user.id);

    try {
      await db.query('DELETE FROM email_verifications WHERE token=$1 OR user_id=$2', [token, user.id]);
    } catch (e) {
      // non-critical
    }

    return res.status(200).json({ success: true, code: 'SUCCESS', message: 'Email verified successfully! Your Civic GreenNet account is now active.' });
  } catch (err) {
    next(err);
  }
}

async function resendVerification(req, res, next) {
  try {
    const email = String(req.body.email || req.query.email || '').trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email address is required' });
    }

    const user = await userService.findByEmail(email);
    if (!user) {
      return res.status(200).json({ success: true, message: 'If an unverified account exists for this email, a new verification link has been sent.' });
    }

    if (user.is_verified) {
      return res.status(200).json({ success: true, alreadyVerified: true, message: 'Your email is already verified. Please sign in.' });
    }

    const token = tokenService.generateEmailToken({ userId: user.id });
    await userService.saveEmailVerification(user.id, token);
    await emailService.sendEmailVerification(user.email, token);

    return res.status(200).json({ success: true, message: 'A new verification link has been sent to your email address.' });
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    const userId = req.user && req.user.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const user = await userService.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Detect if role changed since login token was issued
    const jwtRole = req.user.role;
    const dbRole = user.role;
    let newTokens = null;

    if (jwtRole !== dbRole) {
      const tokenService = require('../services/tokenService');
      const accessToken = tokenService.generateAccessToken({ userId: user.id, role: dbRole });
      const refreshToken = tokenService.generateRefreshToken({ userId: user.id, role: dbRole });
      await tokenService.saveRefreshToken(user.id, refreshToken);
      newTokens = { accessToken, refreshToken };
    }

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: normalizeRole(user.role),
      status: user.status || 'active',
      avatar_url: user.avatar_url,
      settings: user.settings || {},
      department_id: user.department_id,
      municipality_id: user.municipality_id,
      zone_id: user.zone_id,
      ward_id: user.ward_id,
      jurisdiction: user.jurisdiction,
      designation: user.designation,
      employee_id: user.employee_id,
      approved_at: user.approved_at,
      approved_by: user.approved_by,
      newTokens
    });
  } catch (err) {
    next(err);
  }
}

async function updateProfile(req, res, next) {
  try {
    const userId = req.user && req.user.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    let { name, avatar_url } = req.body || {};

    if (req.file) {
      try {
        const cloudinary = require('../config/cloudinary');
        const dataUri = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
        const uploadRes = await cloudinary.uploader.upload(dataUri, { folder: 'avatars' });
        avatar_url = uploadRes.secure_url || uploadRes.url;
      } catch (uploadErr) {
        console.error('Failed to upload avatar to Cloudinary:', uploadErr);
        return res.status(500).json({ message: 'Failed to upload profile picture' });
      }
    }

    // Never allow changing role or password through the profile endpoint
    if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
      return res.status(400).json({ message: 'Name must be a non-empty string' });
    }
    if (name && name.trim().length < 2) {
      return res.status(400).json({ message: 'Name must be at least 2 characters' });
    }
    if (avatar_url !== undefined && avatar_url !== null && typeof avatar_url !== 'string') {
      return res.status(400).json({ message: 'avatar_url must be a string' });
    }

    const updated = await userService.updateProfile(userId, {
      name: name !== undefined ? name.trim() : undefined,
      avatar_url
    });
    if (!updated) return res.status(404).json({ message: 'User not found' });

    res.json({ id: updated.id, name: updated.name, email: updated.email, role: updated.role, avatar_url: updated.avatar_url });
  } catch (err) {
    next(err);
  }
}

async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    const user = await userService.findByEmail(email);
    if (!user) return res.status(200).json({ message: 'If the account exists, a reset link has been sent' });

    const token = tokenService.generatePasswordResetToken({ userId: user.id });
    await userService.savePasswordReset(user.id, token);
    await emailService.sendPasswordReset(email, token);

    res.json({ message: 'If the account exists, a reset link has been sent' });
  } catch (err) {
    next(err);
  }
}

async function resetPassword(req, res, next) {
  try {
    const { token, password } = req.body;
    if (!token) return res.status(400).json({ message: 'Missing token' });

    const payload = tokenService.verifyPasswordResetToken(token);
    if (!payload) return res.status(400).json({ message: 'Invalid token' });

    const hashed = await bcrypt.hash(password, SALT_ROUNDS);
    await userService.updatePassword(payload.userId, hashed);
    await userService.invalidatePasswordReset(token);

    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    next(err);
  }
}

async function getDepartments(req, res, next) {
  try {
    const r = await db.query('SELECT id, name FROM departments ORDER BY name');
    res.json({ data: r.rows });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  signup,
  verifyOtp,
  verifyEmailOtp: verifyOtp,
  resendOtp,
  login,
  refreshToken,
  logout,
  verifyEmail,
  resendVerification,
  me,
  updateProfile,
  forgotPassword,
  resetPassword,
  getDepartments
};

