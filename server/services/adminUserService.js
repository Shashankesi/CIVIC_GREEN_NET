const adminUserRepo = require('../repositories/adminUserRepository');
const { invalidateUserStatusCache } = require('../middleware/authMiddleware');

class AdminError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

async function listUsers(params) {
  return adminUserRepo.listUsers(params);
}

async function getById(id) {
  const user = await adminUserRepo.getById(id);
  if (!user) throw new AdminError('User not found', 404);
  return user;
}

async function updateUser(id, fields, actorUserId) {
  if (id === actorUserId) {
    // prevent admin from changing their own status/removing themselves
    if (fields.status && fields.status !== 'active') {
      throw new AdminError('You cannot suspend your own account', 400);
    }
  }
  const user = await adminUserRepo.updateUser(id, fields);
  if (!user) throw new AdminError('User not found', 404);
  return user;
}

async function updateRole(id, role, actorUserId, departmentId = null, designation = null, reason = '') {
  const VALID_ROLES = ['citizen', 'officer', 'admin'];
  if (!VALID_ROLES.includes(role)) throw new AdminError('Invalid role', 400);

  if (role === 'officer' && designation) {
    const { VALID_DESIGNATIONS } = require('../controllers/publicController');
    if (!VALID_DESIGNATIONS.includes(designation)) {
      throw new AdminError('Invalid designation selected', 400);
    }
  }

  if (id === actorUserId && role !== 'admin') {
    throw new AdminError('You cannot demote yourself from admin', 400);
  }

  const target = await adminUserRepo.getById(id);
  if (!target) throw new AdminError('User not found', 404);

  // Prevent removing the final active administrator
  if (target.role === 'admin' && role !== 'admin') {
    const activeAdmins = await adminUserRepo.countActiveAdmins();
    if (activeAdmins <= 1) {
      throw new AdminError('Cannot demote the last active admin', 400);
    }
  }

  const db = require('../config/db');

  if (departmentId || designation) {
    const updates = [];
    const vals = [];
    let idx = 1;
    if (departmentId) { updates.push(`department_id = $${idx++}`); vals.push(departmentId); }
    if (designation) { updates.push(`designation = $${idx++}`); vals.push(designation); }
    vals.push(id);
    await db.query(`UPDATE users SET ${updates.join(', ')} WHERE id = $${idx}`, vals);
  }

  if (role === 'officer') {
    await adminUserRepo.updateRole(id, 'officer');
    const targetUser = await adminUserRepo.getById(id);
    const munName = targetUser.municipality_name || 'DEL';
    const cityCode = munName.substring(0, 3).toUpperCase();
    const employeeId = targetUser.employee_id || `CGN-${cityCode}-GEN-${String(id).padStart(5, '0')}`;

    const currentSettings = typeof targetUser.settings === 'string' ? JSON.parse(targetUser.settings) : (targetUser.settings || {});
    const updatedSettings = {
      ...currentSettings,
      onboarding_status: 'PENDING_DETAILS',
      employee_id: employeeId
    };

    await db.query(`
      UPDATE users SET
        status = 'pending',
        employee_id = $1,
        settings = $2
      WHERE id = $3
    `, [employeeId, JSON.stringify(updatedSettings), id]);

    try {
      const notificationService = require('./notificationService');
      await notificationService.create(id, 'ROLE_CHANGED', {
        title: 'Officer Role Assigned',
        message: 'Your account has been assigned the Municipal Officer role. Please complete your officer profile and verification documents.',
        subtitle: `Officer ID: ${employeeId}`,
        actionUrl: '/officer/onboarding',
        officerId: id
      });
    } catch (err) {
      const logger = require('../utils/logger');
      logger.warn('Failed to create officer setup notification', { err: err.message });
    }

    try {
      const emailService = require('./emailService');
      await emailService.sendOfficerOnboardingRequiredEmail(targetUser, employeeId);
    } catch (e) {
      const logger = require('../utils/logger');
      logger.warn('Failed to send officer onboarding email', { err: e.message });
    }

    return adminUserRepo.getById(id);
  }

  const result = await adminUserRepo.updateRole(id, role);

  // Create role change notification for user
  try {
    const notificationService = require('./notificationService');
    await notificationService.create(id, 'SYSTEM', {
      title: 'Account Role Updated',
      message: `Your account role has been updated to ${role.toUpperCase()} by an administrator.`,
      subtitle: `New Role: ${role.toUpperCase()}`,
      userId: id
    });
  } catch (err) {
    const logger = require('../utils/logger');
    logger.warn('Failed to create role change notification', { err: err.message });
  }

  try {
    const emailService = require('./emailService');
    const updatedUser = await adminUserRepo.getById(id);
    if (updatedUser) {
      await emailService.sendRoleChangedEmail(updatedUser);
    }
  } catch (e) {
    const logger = require('../utils/logger');
    logger.warn('Failed to send role change email', { err: e.message });
  }

  invalidateUserStatusCache(id);
  return result;
}

async function updateStatus(id, status, actorUserId, reason = 'Rejection by administrator') {
  if (!['active', 'approved', 'pending', 'suspended', 'rejected', 'blocked'].includes(status)) throw new AdminError('Invalid status', 400);
  if (id === actorUserId && (status === 'suspended' || status === 'blocked')) {
    throw new AdminError('You cannot suspend/block your own account', 400);
  }

  const target = await adminUserRepo.getById(id);
  if (!target) throw new AdminError('User not found', 404);

  // Prevent suspending the final active admin
  if (target.role === 'admin' && (status === 'suspended' || status === 'blocked')) {
    const activeAdmins = await adminUserRepo.countActiveAdmins();
    if (activeAdmins <= 1) {
      throw new AdminError('Cannot suspend/block the last active admin', 400);
    }
  }

  if (target.role === 'officer' && status === 'rejected') {
    return rejectOfficer(id, reason, actorUserId);
  }

  const result = await adminUserRepo.updateStatus(id, status);
  invalidateUserStatusCache(id);
  return result;
}

async function rejectOfficer(id, reason, actorUserId) {
  const target = await adminUserRepo.getById(id);
  if (!target) throw new AdminError('User not found', 404);
  if (target.role !== 'officer') throw new AdminError('Only officer accounts can be rejected', 400);

  const result = await adminUserRepo.rejectOfficerRecord(id, reason);

  // Create notifications
  try {
    const notificationService = require('./notificationService');
    const db = require('../config/db');
    
    // Notify the officer
    await notificationService.create(id, 'OFFICER', {
      title: 'Officer Registration Rejected',
      message: 'Officer registration rejected',
      subtitle: `Your application was rejected by the administrator. Reason: ${reason}`,
      officerId: id
    });
    
    // Notify admins
    const { rows: admins } = await db.query("SELECT id FROM users WHERE role='admin'");
    for (const admin of admins) {
      await notificationService.create(admin.id, 'OFFICER', {
        title: 'Officer Application Rejected',
        message: 'Officer application rejected',
        subtitle: `Officer ${target.name} has been rejected.`,
        officerId: id
      });
    }
  } catch (err) {
    const logger = require('../utils/logger');
    logger.warn('Failed to create officer rejection database notifications', { err: err.message });
  }

  try {
    const emailService = require('./emailService');
    await emailService.sendOfficerApprovalEmail(target, false, null, reason);
  } catch (e) {
    const logger = require('../utils/logger');
    logger.error('Failed sending officer rejection email', { err: e.message });
  }

  return result;
}

async function approveOfficer(id, actorUserId) {
  const target = await adminUserRepo.getById(id);
  if (!target) throw new AdminError('User not found', 404);
  if (target.role !== 'officer') throw new AdminError('Only officer accounts can be approved', 400);

  const db = require('../config/db');
  
  // Verify that all 3 documents are uploaded and verified
  const docsRes = await db.query(
    "SELECT COUNT(*) as count FROM officer_documents WHERE user_id = $1 AND status = 'VERIFIED'",
    [id]
  );
  const verifiedCount = parseInt(docsRes.rows[0].count, 10);
  if (verifiedCount < 3) {
    throw new AdminError('Officer cannot be approved yet. Complete document verification first.', 400);
  }

  // Fetch department and municipality names to build the Employee ID code
  const deptRes = await db.query('SELECT name FROM departments WHERE id = $1', [target.department_id]);
  const munRes = await db.query('SELECT name FROM municipalities WHERE id = $1', [target.municipality_id]);
  
  const deptName = deptRes.rows[0]?.name || 'GEN';
  const munName = munRes.rows[0]?.name || 'GEN';

  const cityCode = munName.substring(0, 3).toUpperCase();
  
  function getDeptCode(name) {
    const clean = name.toLowerCase();
    if (clean.includes('sanitation') || clean.includes('waste')) return 'SWM';
    if (clean.includes('roads') || clean.includes('infrastructure')) return 'RND';
    if (clean.includes('light')) return 'STL';
    if (clean.includes('water')) return 'WTR';
    if (clean.includes('sewer') || clean.includes('drain')) return 'SWR';
    if (clean.includes('public health') || clean.includes('health')) return 'PBH';
    if (clean.includes('park') || clean.includes('horticulture')) return 'PKH';
    if (clean.includes('traffic') || clean.includes('transport')) return 'TRF';
    if (clean.includes('elect')) return 'ELC';
    if (clean.includes('admin')) return 'ADM';
    
    const words = name.split(/[^a-zA-Z0-9]+/).filter(w => w && !['and', 'of', 'in', 'for', 'the', 'management'].includes(w.toLowerCase()));
    return words.map(w => w[0].toUpperCase()).join('').substring(0, 4) || 'GEN';
  }
  
  const deptCode = getDeptCode(deptName);
  const employeeId = `CGN-${cityCode}-${deptCode}-${String(id).padStart(5, '0')}`;

  const result = await adminUserRepo.approveOfficerRecord(id, employeeId, actorUserId);

  // Create notifications
  try {
    const notificationService = require('./notificationService');
    
    // Notify the officer
    await notificationService.create(id, 'OFFICER', {
      title: 'Officer Registration Approved',
      message: 'Officer registration approved',
      subtitle: `Welcome! Your application has been approved. Employee ID: ${employeeId}`,
      officerId: id
    });
    
    // Notify admins
    const { rows: admins } = await db.query("SELECT id FROM users WHERE role='admin'");
    for (const admin of admins) {
      await notificationService.create(admin.id, 'OFFICER', {
        title: 'Officer Application Approved',
        message: 'Officer application approved',
        subtitle: `Officer ${target.name} has been approved.`,
        officerId: id
      });
    }
  } catch (err) {
    const logger = require('../utils/logger');
    logger.warn('Failed to create officer approval database notifications', { err: err.message });
  }

  try {
    const emailService = require('./emailService');
    await emailService.sendOfficerApprovalEmail(target, true, employeeId);
  } catch (e) {
    const logger = require('../utils/logger');
    logger.error('Failed sending officer approval email', { err: e.message });
  }

  // Real-time event dispatch
  try {
    const realtimeGateway = require('./realtimeGateway');
    realtimeGateway.sendToUser(id, {
      type: 'OFFICER_APPROVED',
      userId: id,
      employeeId,
      status: 'active'
    });
    realtimeGateway.sendToRole('admin', {
      type: 'OFFICER_APPROVED',
      userId: id,
      officerName: target.name,
      employeeId
    });
  } catch (rtErr) {}

  return result;
}

async function getUserStats() {
  return adminUserRepo.getUserStats();
}

async function createUser(data, actorUserId) {
  const { name, email, role, phone, departmentId } = data;
  if (!name || !email) throw new AdminError('Name and Email are required', 400);

  const existing = await adminUserRepo.findByEmailWithPassword(email);
  if (existing) throw new AdminError('User with this email already exists', 400);

  const bcrypt = require('bcrypt');
  const tempPassword = 'User@123456';
  const hashed = await bcrypt.hash(tempPassword, 10);

  const db = require('../config/db');
  const userRole = ['citizen', 'officer', 'admin'].includes(role) ? role : 'citizen';
  const status = userRole === 'officer' ? 'pending' : 'active';
  const settings = { phone: phone || '', onboarding_status: userRole === 'officer' ? 'PENDING_DETAILS' : undefined };

  const q = `
    INSERT INTO users (name, email, password, role, status, is_verified, settings, department_id, created_at)
    VALUES ($1, $2, $3, $4, $5, true, $6, $7, now())
    RETURNING id, name, email, role, status, is_verified, created_at
  `;
  const r = await db.query(q, [name, email, hashed, userRole, status, JSON.stringify(settings), departmentId || null]);
  const user = r.rows[0];

  if (userRole === 'officer') {
    const cityCode = 'DEL';
    const employeeId = `CGN-${cityCode}-GEN-${String(user.id).padStart(5, '0')}`;
    const updatedSettings = { ...settings, employee_id: employeeId };
    await db.query('UPDATE users SET employee_id = $1, settings = $2 WHERE id = $3', [employeeId, JSON.stringify(updatedSettings), user.id]);
    user.employee_id = employeeId;
  }

  return user;
}

async function exportUsersCsv(params) {
  const data = await adminUserRepo.listUsers({ ...params, limit: 5000 });
  const items = data.items || [];
  
  const headers = ['ID', 'Name', 'Email', 'Role', 'Status', 'Employee ID', 'Department', 'Availability', 'Joined At'];
  const rows = items.map(u => [
    u.id,
    `"${(u.name || '').replace(/"/g, '""')}"`,
    `"${(u.email || '').replace(/"/g, '""')}"`,
    u.role,
    u.status,
    u.employee_id || '',
    `"${(u.department_name || '').replace(/"/g, '""')}"`,
    u.availability || 'AVAILABLE',
    u.created_at ? new Date(u.created_at).toISOString() : ''
  ]);

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

async function getOfficerSummary() {
  return adminUserRepo.getOfficerSummary();
}

async function getOfficerFullProfile(id) {
  const profile = await adminUserRepo.getOfficerFullProfile(id);
  if (!profile) throw new AdminError('Officer profile not found', 404);
  return profile;
}

module.exports = { listUsers, getUserStats, createUser, exportUsersCsv, getById, updateUser, updateRole, updateStatus, rejectOfficer, approveOfficer, getOfficerSummary, getOfficerFullProfile, AdminError };
