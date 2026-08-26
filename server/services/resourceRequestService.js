const resourceRepo = require('../repositories/resourceRequestRepository');
const complaintRepo = require('../repositories/complaintRepository');
const notificationService = require('./notificationService');
const logger = require('../utils/logger');

class ResourceRequestError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

async function createRequest({
  complaintId,
  officerId,
  requestType = 'TEAM',
  requiredPeople = 1,
  requiredSkills = null,
  equipment = null,
  priority = 'medium',
  reason
}) {
  const complaint = await complaintRepo.getById(complaintId);
  if (!complaint) throw new ResourceRequestError('Complaint not found', 404);

  if (!reason || !reason.trim()) {
    throw new ResourceRequestError('A detailed reason for the resource request is required', 400);
  }

  const peopleCount = parseInt(requiredPeople, 10) || 1;
  if (peopleCount < 1 || peopleCount > 50) {
    throw new ResourceRequestError('Required people must be between 1 and 50', 400);
  }

  const record = await resourceRepo.createResourceRequest({
    complaintId,
    officerId,
    departmentId: complaint.department_id,
    requestType: requestType || 'TEAM',
    requiredPeople: peopleCount,
    requiredSkills: requiredSkills ? requiredSkills.trim() : null,
    equipment: equipment ? equipment.trim() : null,
    priority: priority || 'medium',
    reason: reason.trim()
  });

  const formattedId = `CGN-${String(complaintId).padStart(5, '0')}`;

  // Notify Admins
  try {
    const db = require('../config/db');
    const { rows: admins } = await db.query("SELECT id FROM users WHERE role = 'admin'");
    for (const admin of admins) {
      await notificationService.create(admin.id, 'RESOURCE_REQUESTED', {
        title: 'New Resource Request',
        message: `Officer requested ${peopleCount} personnel for complaint #${formattedId}.`,
        subtitle: `Skills: ${requiredSkills || 'General'} · Priority: ${priority || 'Medium'}`,
        actionUrl: `/admin?tab=operations`,
        complaintId,
        requestId: record.id
      });
    }
  } catch (notifErr) {
    logger.warn('Resource request notification error:', notifErr.message);
  }

  // Real-time broadcast
  try {
    const realtimeGateway = require('./realtimeGateway');
    realtimeGateway.publishComplaintEvent('RESOURCE_REQUESTED', complaint, {
      requestId: record.id,
      officerId,
      requiredPeople: peopleCount,
      requestType,
      reason
    });
  } catch (rtErr) {
    logger.warn('Real-time resource request event error:', rtErr.message);
  }

  return record;
}

async function listRequests(filters = {}) {
  return resourceRepo.listResourceRequests(filters);
}

async function getById(id) {
  const req = await resourceRepo.getById(id);
  if (!req) throw new ResourceRequestError('Resource request not found', 404);
  return req;
}

async function approveRequest(requestId, adminId, {
  teamName,
  leaderId = null,
  memberNames = [],
  notes = null
} = {}) {
  const request = await resourceRepo.getById(requestId);
  if (!request) throw new ResourceRequestError('Resource request not found', 404);

  if (request.status !== 'pending') {
    throw new ResourceRequestError(`Cannot approve request in status ${request.status}`, 400);
  }

  const generatedTeamName = (teamName && teamName.trim())
    || `${request.department_name || 'Support'} Crew (Team #${request.complaint_id})`;

  let members = [];
  if (Array.isArray(memberNames) && memberNames.length > 0) {
    members = memberNames;
  } else {
    // Default placeholder members if none explicitly passed
    const count = request.required_people || 2;
    for (let i = 1; i <= count; i++) {
      members.push({ name: `Field Specialist ${i}`, role: 'Crew Member' });
    }
  }

  // 1. Update request status to approved
  const updatedReq = await resourceRepo.updateStatus(requestId, {
    status: 'approved',
    approvedBy: adminId
  });

  // 2. Create support team
  const team = await resourceRepo.createComplaintTeam({
    complaintId: request.complaint_id,
    resourceRequestId: requestId,
    teamName: generatedTeamName,
    leaderId: leaderId || request.requested_by_officer_id,
    notes: notes || request.reason,
    members
  });

  const formattedId = `CGN-${String(request.complaint_id).padStart(5, '0')}`;

  // 3. Notify assigned officer
  try {
    await notificationService.create(request.requested_by_officer_id, 'RESOURCE_APPROVED', {
      title: 'Resource Request Approved',
      message: `Support team "${generatedTeamName}" (${members.length} members) assigned to #${formattedId}.`,
      subtitle: `Approved by administration`,
      actionUrl: `/complaints/${request.complaint_id}`,
      complaintId: request.complaint_id,
      teamId: team.id
    });
  } catch (e) {
    logger.warn('Approval notification warning:', e.message);
  }

  // 4. Real-time event
  try {
    const realtimeGateway = require('./realtimeGateway');
    realtimeGateway.publishComplaintEvent('TEAM_ASSIGNED', { id: request.complaint_id }, {
      requestId,
      teamName: generatedTeamName,
      membersCount: members.length,
      leaderId: leaderId || request.requested_by_officer_id
    });
    realtimeGateway.sendToUser(request.requested_by_officer_id, {
      type: 'TEAM_ASSIGNED',
      complaintId: request.complaint_id,
      ticketId: formattedId,
      teamName: generatedTeamName,
      membersCount: members.length
    });
  } catch (rtErr) {
    logger.warn('Real-time team assigned event warning:', rtErr.message);
  }

  return { request: updatedReq, team };
}

async function rejectRequest(requestId, adminId, { reason } = {}) {
  const request = await resourceRepo.getById(requestId);
  if (!request) throw new ResourceRequestError('Resource request not found', 404);

  if (request.status !== 'pending') {
    throw new ResourceRequestError(`Cannot reject request in status ${request.status}`, 400);
  }

  const updatedReq = await resourceRepo.updateStatus(requestId, {
    status: 'rejected',
    approvedBy: adminId,
    rejectionReason: reason || 'Resource request declined by administration.'
  });

  const formattedId = `CGN-${String(request.complaint_id).padStart(5, '0')}`;

  // Notify officer
  try {
    await notificationService.create(request.requested_by_officer_id, 'RESOURCE_REJECTED', {
      title: 'Resource Request Declined',
      message: `Request for additional resources on #${formattedId} was declined.`,
      subtitle: `Reason: ${reason || 'Not specified'}`,
      actionUrl: `/complaints/${request.complaint_id}`,
      complaintId: request.complaint_id
    });
  } catch (e) {
    logger.warn('Rejection notification warning:', e.message);
  }

  return updatedReq;
}

async function getTeamForComplaint(complaintId) {
  return resourceRepo.getComplaintTeam(complaintId);
}

module.exports = {
  createRequest,
  listRequests,
  getById,
  approveRequest,
  rejectRequest,
  getTeamForComplaint,
  ResourceRequestError
};
