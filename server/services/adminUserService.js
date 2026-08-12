const adminUserRepo = require('../repositories/adminUserRepository');

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

async function updateRole(id, role, actorUserId) {
  const VALID_ROLES = ['citizen', 'officer', 'admin'];
  if (!VALID_ROLES.includes(role)) throw new AdminError('Invalid role', 400);

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

  return adminUserRepo.updateRole(id, role);
}

async function updateStatus(id, status, actorUserId) {
  if (!['active', 'pending', 'suspended', 'rejected', 'blocked'].includes(status)) throw new AdminError('Invalid status', 400);
  if (id === actorUserId && status === 'suspended') {
    throw new AdminError('You cannot suspend your own account', 400);
  }

  const target = await adminUserRepo.getById(id);
  if (!target) throw new AdminError('User not found', 404);

  // Prevent suspending the final active admin
  if (target.role === 'admin' && status === 'suspended') {
    const activeAdmins = await adminUserRepo.countActiveAdmins();
    if (activeAdmins <= 1) {
      throw new AdminError('Cannot suspend the last active admin', 400);
    }
  }

  const result = await adminUserRepo.updateStatus(id, status);

  // Send rejection email if officer profile was rejected
  if (target.role === 'officer' && status === 'rejected') {
    try {
      const emailService = require('./emailService');
      await emailService.sendOfficerApprovalEmail(target, false);
    } catch (e) {
      const logger = require('../utils/logger');
      logger.error('Failed sending officer rejection email', { err: e.message });
    }
  }

  return result;
}

async function approveOfficer(id, actorUserId) {
  const target = await adminUserRepo.getById(id);
  if (!target) throw new AdminError('User not found', 404);
  if (target.role !== 'officer') throw new AdminError('Only officer accounts can be approved', 400);

  const result = await adminUserRepo.updateStatus(id, 'active');

  try {
    const emailService = require('./emailService');
    await emailService.sendOfficerApprovalEmail(target, true);
  } catch (e) {
    const logger = require('../utils/logger');
    logger.error('Failed sending officer approval email', { err: e.message });
  }

  return result;
}

module.exports = { listUsers, getById, updateUser, updateRole, updateStatus, approveOfficer, AdminError };
