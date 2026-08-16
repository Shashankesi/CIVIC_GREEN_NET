const db = require('../config/db');
const assignmentRepo = require('../repositories/assignmentRepository');
const adminUserRepo = require('../repositories/adminUserRepository');
const complaintRepo = require('../repositories/complaintRepository');
const notificationService = require('./notificationService');
const logger = require('../utils/logger');

class AssignmentError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

async function assign({ complaintId, departmentId = null, officerId = null, assignedBy }) {
  const complaint = await complaintRepo.getById(complaintId);
  if (!complaint) throw new AssignmentError('Complaint not found', 404);

  let officer = null;
  if (officerId) {
    officer = await adminUserRepo.getById(officerId);
    if (!officer) throw new AssignmentError('Officer not found', 404);
    if (officer.role !== 'officer' && officer.role !== 'admin') {
      throw new AssignmentError('Target user is not an authorized officer', 400);
    }

    // Validate department match if both are specified
    if (departmentId && officer.department_id && parseInt(officer.department_id, 10) !== parseInt(departmentId, 10)) {
      throw new AssignmentError('Selected officer does not belong to this department.', 400);
    }

    // If departmentId is not explicitly provided, adopt officer's department
    if (!departmentId && officer.department_id) {
      departmentId = officer.department_id;
    }
  }

  const previousOfficerId = complaint.officer_id;
  const isReassignment = previousOfficerId && officerId && parseInt(previousOfficerId, 10) !== parseInt(officerId, 10);

  // Use database transaction for atomic update
  const client = await db.getClient ? await db.getClient() : null;

  try {
    if (client) await client.query('BEGIN');

    // 1. Update complaint record
    const updateFields = {};
    if (departmentId !== undefined && departmentId !== null) updateFields.department_id = parseInt(departmentId, 10);
    if (officerId !== undefined && officerId !== null) {
      updateFields.officer_id = parseInt(officerId, 10);
      updateFields.assigned_at = new Date().toISOString();
      updateFields.status = 'assigned';
    }
    await complaintRepo.updateComplaint(complaintId, updateFields);

    // 2. Record assignment history & status history
    if (officerId) {
      await assignmentRepo.assignComplaint({ complaintId, officerId: parseInt(officerId, 10), assignedBy });
      if (complaint.status !== 'assigned') {
        await complaintRepo.addStatusHistory(complaintId, complaint.status || 'open', 'assigned', assignedBy, 'Complaint assigned to officer.');
      }
    }

    if (client) await client.query('COMMIT');
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    logger.error('Assignment transaction error:', err);
    throw new AssignmentError(err.message || 'Failed to update assignment', 500);
  } finally {
    if (client && typeof client.release === 'function') client.release();
  }

  const formattedId = `CGN-${String(complaintId).padStart(5, '0')}`;

  // 4. Notifications (best-effort async)
  try {
    // Notify newly assigned officer
    if (officerId) {
      await notificationService.create(officerId, 'COMPLAINT_ASSIGNED', {
        title: isReassignment ? 'Complaint Reassigned to You' : 'New Complaint Assigned',
        message: `Complaint #${formattedId} (${complaint.title}) has been assigned to you.`,
        subtitle: `Priority: ${complaint.priority || 'Medium'} · Category: ${complaint.category || 'General'}`,
        complaintId
      });

      // Email notifications
      const emailService = require('./emailService');
      const fresh = await complaintRepo.getById(complaintId);
      await emailService.sendComplaintAssignedEmail(fresh || complaint, officer);
      if (complaint.user_id) {
        await emailService.sendComplaintAssignedCitizenEmail(fresh || complaint, complaint.user_id);
      }
    }

    // Notify previous officer if reassigned
    if (isReassignment && previousOfficerId) {
      await notificationService.create(previousOfficerId, 'COMPLAINT_REASSIGNED', {
        title: 'Complaint Reassigned',
        message: `Complaint #${formattedId} has been reassigned to another officer.`,
        subtitle: complaint.title,
        complaintId
      });
    }
  } catch (notifErr) {
    logger.warn('Assignment notifications error:', notifErr.message);
  }

  const fresh = await complaintRepo.getById(complaintId);

  // Real-time event dispatch
  try {
    const realtimeGateway = require('./realtimeGateway');
    realtimeGateway.publishComplaintEvent(isReassignment ? 'COMPLAINT_REASSIGNED' : 'COMPLAINT_ASSIGNED', fresh || complaint, {
      previousOfficerId: isReassignment ? previousOfficerId : null,
      officerId: officerId ? parseInt(officerId, 10) : null,
      assignedBy
    });
    if (isReassignment && previousOfficerId) {
      realtimeGateway.sendToUser(previousOfficerId, {
        type: 'COMPLAINT_REASSIGNED',
        complaintId,
        ticketId: formattedId,
        title: complaint.title
      });
    }
  } catch (rtErr) {
    logger.warn('Real-time assignment event error:', rtErr.message);
  }

  return fresh;
}

async function unassign(complaintId, assignedBy) {
  const complaint = await complaintRepo.getById(complaintId);
  if (!complaint) throw new AssignmentError('Complaint not found', 404);
  return assignmentRepo.unassignComplaint(complaintId, assignedBy);
}

async function history(complaintId) {
  return assignmentRepo.getAssignments(complaintId);
}

module.exports = { assign, unassign, history, AssignmentError };
