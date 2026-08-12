const complaintRepo = require('../repositories/complaintRepository');
const notificationService = require('./notificationService');
const logger = require('../utils/logger');

const VALID_TRANSITIONS = {
  open: ['in_progress', 'rejected', 'resolved'],
  in_progress: ['resolved', 'rejected'],
  rejected: ['open', 'in_progress'],
  resolved: ['closed', 'reopened'],
  reopened: ['in_progress', 'rejected', 'resolved'],
  closed: ['reopened']
};

async function changeStatus(complaintId, toStatus, changedBy, note) {
  const complaint = await complaintRepo.getById(complaintId);
  if (!complaint) throw new Error('Complaint not found');
  const from = complaint.status || 'open';
  const allowed = VALID_TRANSITIONS[from] || [];
  if (!allowed.includes(toStatus)) throw new Error(`Invalid status transition from ${from} to ${toStatus}`);

  // update complaint status
  const updated = await complaintRepo.updateComplaint(complaintId, { status: toStatus });

  // record history
  await complaintRepo.addStatusHistory(complaintId, from, toStatus, changedBy, note || null);

  // send notifications to owner and officers (for now notify owner)
  try {
    if (complaint.user_id) {
      await notificationService.create(complaint.user_id, `complaint_${toStatus}`, { complaintId, from, to: toStatus });
    }
  } catch (e) {
    logger.warn('Failed to send notification', { err: e });
  }

  // send email notifications
  try {
    const db = require('../config/db');
    const emailService = require('./emailService');

    // Citizen notification
    if (complaint.user_id) {
      const citizenRes = await db.query('SELECT * FROM users WHERE id=$1', [complaint.user_id]);
      const citizen = citizenRes.rows[0];
      if (citizen) {
        if (toStatus === 'resolved') {
          await emailService.sendComplaintResolvedEmail(updated, citizen);
        } else {
          await emailService.sendComplaintStatusChangedEmail(updated, citizen, from, toStatus);
        }
      }
    }

    // Officer notification for reopened status
    if (toStatus === 'reopened' && updated.officer_id) {
      const officerRes = await db.query('SELECT * FROM users WHERE id=$1', [updated.officer_id]);
      const officer = officerRes.rows[0];
      if (officer) {
        await emailService.sendComplaintReopenedEmail(updated, officer);
      }
    }
  } catch (emailErr) {
    logger.error('Failed to send status update email(s)', { err: emailErr.message || emailErr });
  }

  return updated;
}

async function getTimeline(complaintId) {
  return complaintRepo.getTimeline(complaintId);
}

module.exports = { changeStatus, getTimeline };
