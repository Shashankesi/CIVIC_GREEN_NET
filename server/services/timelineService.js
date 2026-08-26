const db = require('../config/db');
const complaintRepo = require('../repositories/complaintRepository');
const notificationService = require('./notificationService');
const logger = require('../utils/logger');

class StatusTransitionError extends Error {
  constructor(message, status = 400, code = 'INVALID_STATUS_TRANSITION') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const VALID_TRANSITIONS = {
  open: ['assigned', 'rejected'],
  pending: ['assigned', 'rejected'],
  assigned: ['accepted', 'rejected'],
  accepted: ['in_progress', 'rejected'],
  in_progress: ['resolved', 'rejected'],
  rejected: ['open', 'assigned', 'in_progress'],
  resolved: ['closed', 'reopened'],
  reopened: ['assigned', 'in_progress', 'resolved'],
  closed: ['reopened']
};

function formatStatusLabel(st) {
  if (!st) return '';
  switch (st) {
    case 'open': return 'Open';
    case 'pending': return 'Pending';
    case 'assigned': return 'Assigned';
    case 'accepted': return 'Accepted';
    case 'in_progress': return 'In Progress';
    case 'resolved': return 'Resolved';
    case 'rejected': return 'Rejected';
    case 'reopened': return 'Reopened';
    case 'closed': return 'Closed';
    default: return st;
  }
}

async function changeStatus(complaintId, toStatus, changedBy, note) {
  const complaint = await complaintRepo.getById(complaintId);
  if (!complaint) throw new StatusTransitionError('Complaint not found', 404, 'COMPLAINT_NOT_FOUND');
  
  const from = complaint.status || 'open';

  // If status is identical and no note/file is provided, return without inserting duplicate history
  if (from === toStatus) {
    if (!note) {
      return complaint;
    }
  } else {
    const allowed = VALID_TRANSITIONS[from] || [];
    if (!allowed.includes(toStatus)) {
      throw new StatusTransitionError(
        `Invalid status transition from ${formatStatusLabel(from)} to ${formatStatusLabel(toStatus)}`,
        400,
        'INVALID_STATUS_TRANSITION'
      );
    }
  }

  // Use database transaction for atomic update
  const client = await db.getClient ? await db.getClient() : null;

  try {
    if (client) await client.query('BEGIN');

    // 1. Update complaint status & resolved_at timestamp
    const updateFields = { status: toStatus };
    if (toStatus === 'resolved' || toStatus === 'closed') {
      updateFields.resolution_at = new Date().toISOString();
    }
    const updated = await complaintRepo.updateComplaint(complaintId, updateFields);

    // 2. Insert status history record
    await complaintRepo.addStatusHistory(complaintId, from, toStatus, changedBy, note || null);

    if (client) await client.query('COMMIT');

    const formattedId = `CGN-${String(complaintId).padStart(5, '0')}`;

    // 3. Notifications (best-effort async)
    try {
      // Citizen notification
      if (complaint.user_id) {
        const notifType = toStatus === 'resolved' ? 'COMPLAINT_RESOLVED' : 'COMPLAINT_STATUS_UPDATE';
        await notificationService.create(complaint.user_id, notifType, {
          title: toStatus === 'resolved' ? 'Complaint Marked Resolved' : `Complaint Status: ${formatStatusLabel(toStatus)}`,
          message: `Your complaint #${formattedId} (${complaint.title}) status is now ${formatStatusLabel(toStatus)}.`,
          subtitle: note ? `Note: ${note}` : `Updated from ${formatStatusLabel(from)} to ${formatStatusLabel(toStatus)}.`,
          complaintId
        });
      }

      // Officer notification if updated by someone else
      if (complaint.officer_id && parseInt(complaint.officer_id, 10) !== parseInt(changedBy, 10)) {
        await notificationService.create(complaint.officer_id, 'COMPLAINT_STATUS_UPDATE', {
          title: `Assigned Complaint Updated`,
          message: `Complaint #${formattedId} status changed to ${formatStatusLabel(toStatus)}.`,
          subtitle: note || `Status updated`,
          complaintId
        });
      }

      // Email notifications based on status change
      const emailService = require('./emailService');
      if (toStatus === 'resolved') {
        if (complaint.user_id) {
          await emailService.sendComplaintResolvedEmail(updated || complaint, complaint.user_id);
        }
      } else if (toStatus === 'reopened') {
        if (complaint.officer_id) {
          await emailService.sendComplaintReopenedEmail(updated || complaint, complaint.officer_id);
        }
      } else {
        if (complaint.user_id) {
          await emailService.sendComplaintStatusChangedEmail(updated || complaint, complaint.user_id, from, toStatus);
        }
      }

      // Reputation & Points Lifecycle Hook
      try {
        const pointService = require('./pointService');
        if (toStatus === 'resolved') {
          // 1. Award Citizen Resolution Points
          if (complaint.user_id) {
            await pointService.awardPoints({
              userId: complaint.user_id,
              role: 'citizen',
              complaintId,
              eventType: 'COMPLAINT_RESOLVED',
              reason: 'Complaint successfully resolved'
            });
          }
          // 2. Award Officer Resolution Points & SLA Bonus / Penalty
          if (complaint.officer_id) {
            await pointService.awardPoints({
              userId: complaint.officer_id,
              role: 'officer',
              complaintId,
              eventType: 'OFFICER_RESOLVED',
              reason: 'Assigned complaint resolved'
            });

            // SLA Performance Check
            const now = new Date();
            const slaDue = complaint.sla_due_at ? new Date(complaint.sla_due_at) : null;
            if (!slaDue || now <= slaDue) {
              await pointService.awardPoints({
                userId: complaint.officer_id,
                role: 'officer',
                complaintId,
                eventType: 'OFFICER_SLA_BONUS',
                reason: 'Complaint resolved within SLA deadline'
              });
            } else {
              await pointService.deductPoints({
                userId: complaint.officer_id,
                role: 'officer',
                complaintId,
                eventType: 'OFFICER_SLA_VIOLATION',
                reason: 'Resolution completed past SLA window'
              });
            }
          }
        } else if (toStatus === 'reopened') {
          // Penalty for reopened resolution
          if (complaint.officer_id) {
            await pointService.deductPoints({
              userId: complaint.officer_id,
              role: 'officer',
              complaintId,
              eventType: 'RESOLUTION_REOPENED',
              reason: 'Resolution reopened for further review'
            });
          }
        } else if (toStatus === 'rejected') {
          // Only penalize if confirmed false / abusive
          const lowerNote = (note || '').toLowerCase();
          if (lowerNote.includes('false') || lowerNote.includes('spam') || lowerNote.includes('abusive') || lowerNote.includes('fake')) {
            if (complaint.user_id) {
              await pointService.deductPoints({
                userId: complaint.user_id,
                role: 'citizen',
                complaintId,
                eventType: 'FALSE_COMPLAINT',
                reason: 'Confirmed false/abusive complaint report'
              });
            }
          }
        }
      } catch (ptErr) {
        logger.warn('[timelineService] Point hook warning:', ptErr.message);
      }

      // Real-time event dispatch
      try {
        const realtimeGateway = require('./realtimeGateway');
        const eventType = toStatus === 'resolved'
          ? 'COMPLAINT_RESOLVED'
          : toStatus === 'reopened'
            ? 'COMPLAINT_REOPENED'
            : 'COMPLAINT_STATUS_CHANGED';
        realtimeGateway.publishComplaintEvent(eventType, updated || complaint, {
          previousStatus: from,
          newStatus: toStatus,
          changedBy,
          note
        });
      } catch (rtErr) {
        logger.warn('Real-time status event error:', rtErr.message);
      }
    } catch (notifErr) {
      logger.warn('Status update notification warning:', notifErr.message);
    }

    return updated;
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    if (err instanceof StatusTransitionError) throw err;
    logger.error('Status transition transaction error:', err);
    throw new StatusTransitionError(err.message || 'Failed to update status', 500, 'TRANSACTION_FAILED');
  } finally {
    if (client && typeof client.release === 'function') client.release();
  }
}

/**
 * 100% Database-Driven & Side-Effect Free Timeline Aggregation
 */
async function getTimeline(complaintId) {
  const complaint = await complaintRepo.getById(complaintId);
  if (!complaint) return { history: [], resolutionImages: [], ai: [] };

  // 1. Complaint Creation Event
  const creatorRes = await db.query('SELECT name, role FROM users WHERE id=$1', [complaint.user_id]);
  const creator = creatorRes.rows[0];

  const creationEvent = {
    id: `creation-${complaint.id}`,
    complaint_id: complaint.id,
    status_from: null,
    status_to: 'open',
    changed_by: complaint.user_id,
    changed_by_name: creator ? creator.name : 'Citizen',
    changed_by_role: creator ? creator.role : 'citizen',
    action_type: 'COMPLAINT_CREATED',
    action_title: 'Complaint Submitted',
    note: `Complaint #${String(complaint.id).padStart(5, '0')} filed in ${complaint.category || 'general'} category`,
    created_at: complaint.created_at
  };

  // 2. Status History Events
  const statusHistoryRes = await db.query(`
    SELECT h.id, h.status_from, h.status_to, h.changed_by, u.name AS changed_by_name, u.role AS changed_by_role, h.note, h.created_at
    FROM complaint_status_history h
    LEFT JOIN users u ON u.id = h.changed_by
    WHERE h.complaint_id=$1
    ORDER BY h.created_at ASC
  `, [complaintId]);

  const statusEvents = statusHistoryRes.rows.map(h => ({
    id: `status-${h.id}`,
    complaint_id: complaintId,
    status_from: h.status_from,
    status_to: h.status_to,
    changed_by: h.changed_by,
    changed_by_name: h.changed_by_name || 'System User',
    changed_by_role: h.changed_by_role || 'system',
    action_type: 'STATUS_CHANGED',
    action_title: `Status changed from ${formatStatusLabel(h.status_from)} to ${formatStatusLabel(h.status_to)}`,
    note: h.note || null,
    created_at: h.created_at
  }));

  // 3. Assignment History Events
  const assignmentRes = await db.query(`
    SELECT a.id, a.officer_id, a.assigned_by, u_assigner.name AS assigner_name, u_assigner.role AS assigner_role,
           u_officer.name AS officer_name, d.name AS department_name, a.assigned_at AS created_at
    FROM complaint_assignments a
    LEFT JOIN users u_assigner ON u_assigner.id = a.assigned_by
    LEFT JOIN users u_officer ON u_officer.id = a.officer_id
    LEFT JOIN departments d ON d.id = u_officer.department_id
    WHERE a.complaint_id=$1
    ORDER BY a.assigned_at ASC
  `, [complaintId]);

  const assignmentEvents = assignmentRes.rows.map((a, idx) => ({
    id: `assignment-${a.id}`,
    complaint_id: complaintId,
    status_from: null,
    status_to: null,
    changed_by: a.assigned_by,
    changed_by_name: a.assigner_name || 'Administrator',
    changed_by_role: a.assigner_role || 'admin',
    action_type: idx === 0 ? 'ASSIGNED' : 'REASSIGNED',
    action_title: idx === 0 ? `Assigned to ${a.officer_name || 'Officer'}` : `Reassigned to ${a.officer_name || 'Officer'}`,
    note: a.department_name ? `Department: ${a.department_name}` : `Assigned Officer #${a.officer_id}`,
    created_at: a.created_at
  }));

  // 4. Resolution Evidence Images
  const imgQ = `SELECT id,url,public_id,metadata,created_at FROM complaint_images WHERE complaint_id=$1 AND (metadata->>'resolution')='true' ORDER BY created_at ASC`;
  const imgs = await db.query(imgQ, [complaintId]);

  // 5. AI Analysis
  const aiQ = `SELECT id,analysis,confidence,created_at FROM ai_analysis WHERE complaint_id=$1 ORDER BY created_at ASC`;
  const ai = await db.query(aiQ, [complaintId]);

  // Merge and sort events by database timestamp
  const allEvents = [creationEvent, ...assignmentEvents, ...statusEvents].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  return {
    history: allEvents,
    resolutionImages: imgs.rows,
    ai: ai.rows
  };
}

module.exports = { changeStatus, getTimeline, StatusTransitionError, VALID_TRANSITIONS };
