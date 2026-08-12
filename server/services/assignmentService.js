const assignmentRepo = require('../repositories/assignmentRepository');
const adminUserRepo = require('../repositories/adminUserRepository');
const complaintRepo = require('../repositories/complaintRepository');

class AssignmentError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

async function assign(complaintId, officerId, assignedBy) {
  const complaint = await complaintRepo.getById(complaintId);
  if (!complaint) throw new AssignmentError('Complaint not found', 404);

  const officer = await adminUserRepo.getById(officerId);
  if (!officer) throw new AssignmentError('Officer not found', 404);
  if (officer.role !== 'officer' && officer.role !== 'admin') {
    throw new AssignmentError('Target user is not an officer', 400);
  }

  const result = await assignmentRepo.assignComplaint({ complaintId, officerId, assignedBy });

  try {
    const emailService = require('./emailService');
    // Fetch fresh complaint info just in case
    const updatedComplaint = await complaintRepo.getById(complaintId);
    await emailService.sendComplaintAssignedEmail(updatedComplaint || complaint, officer);
  } catch (e) {
    const logger = require('../utils/logger');
    logger.error('Failed sending complaint assignment email', { err: e.message });
  }

  return result;
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
