const { validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { JWT } = require('../config');
const emailService = require('../services/emailService');
const tokenService = require('../services/tokenService');
const userService = require('../services/userService');

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

    const { password, phone, city, departmentId, department_id, employeeId, employee_id, designation } = req.body;
    const email = String(req.body.email || '').trim().toLowerCase();
    const name = String(req.body.name || '').trim();
    const accountType = String(req.body.accountType || req.body.role || 'citizen').trim().toLowerCase();
    const safeRole = accountType === 'officer' ? 'officer' : 'citizen';

    const existing = await userService.findByEmail(email);
    if (existing) return res.status(409).json({ message: 'Email already in use' });

    const settings = {};
    if (phone) settings.phone = String(phone).trim();
    if (city) settings.city = String(city).trim();
    if (safeRole === 'officer') {
      if (employeeId || employee_id) settings.employee_id = String(employeeId || employee_id).trim();
      if (designation) settings.designation = String(designation).trim();
    }

    const deptId = safeRole === 'officer' ? (parseInt(departmentId || department_id, 10) || null) : null;

    const hashed = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await userService.createUser({
      name,
      email,
      password: hashed,
      role: safeRole,
      status: safeRole === 'officer' ? 'pending' : 'active',
      settings,
      department_id: deptId
    });

    const verificationToken = tokenService.generateEmailToken({ userId: user.id });
    await userService.saveEmailVerification(user.id, verificationToken);

    try {
      if (safeRole === 'citizen') {
        // Send welcome email immediately
        await emailService.sendWelcomeEmail(user);
        // Send email verification link
        await emailService.sendEmailVerification(email, verificationToken);
      } else {
        // Send admin notification about the pending officer registration
        await emailService.sendAdminOfficerRegistrationEmail(user);
      }
    } catch (emailErr) {
      const logger = require('../utils/logger');
      logger.error('Failed to send registration/welcome email(s)', { err: emailErr.message || emailErr });
    }

    const responseMessage = safeRole === 'officer'
      ? 'Officer registration submitted for admin approval.'
      : 'User registered. Verification email sent.';

    res.status(201).json({
      message: responseMessage,
      user: {
        id: user.id,
        role: safeRole,
        status: safeRole === 'officer' ? 'pending' : 'active'
      }
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

    if (['suspended', 'blocked', 'rejected'].includes(user.status)) {
      return res.status(403).json({ message: 'Your account is suspended. Please contact support.' });
    }

    if (user.role === 'officer' && user.status === 'pending') {
      const role = normalizeRole(user.role);
      const accessToken = tokenService.generateAccessToken({ userId: user.id, role });
      const refreshToken = tokenService.generateRefreshToken({ userId: user.id, role });
      await tokenService.saveRefreshToken(user.id, refreshToken);
      return res.json({
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role,
          status: user.status || 'pending'
        },
        redirectPath: '/pending-approval'
      });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

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
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role,
        status: user.status || 'active'
      },
      redirectPath: role === 'admin' ? '/admin' : role === 'officer' ? '/officer' : '/dashboard'
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
    const { token } = req.query;
    if (!token) return res.status(400).json({ message: 'Missing token' });

    const payload = tokenService.verifyEmailToken(token);
    if (!payload) return res.status(400).json({ message: 'Invalid token' });

    await userService.verifyEmail(payload.userId);
    res.json({ message: 'Email verified' });
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
    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: normalizeRole(user.role),
      status: user.status || 'active',
      avatar_url: user.avatar_url
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

module.exports = {
  signup,
  login,
  refreshToken,
  logout,
  verifyEmail,
  me,
  updateProfile,
  forgotPassword,
  resetPassword
};

