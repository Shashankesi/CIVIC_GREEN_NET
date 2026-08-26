const db = require('../config/db');

async function createResourceRequest({
  complaintId,
  officerId,
  departmentId = null,
  requestType = 'TEAM',
  requiredPeople = 1,
  requiredSkills = null,
  equipment = null,
  priority = 'medium',
  reason
}) {
  const q = `
    INSERT INTO resource_requests (
      complaint_id, requested_by_officer_id, department_id, request_type,
      required_people, required_skills, equipment, priority, reason, status, created_at, updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', now(), now())
    RETURNING *
  `;
  const r = await db.query(q, [
    complaintId,
    officerId,
    departmentId,
    requestType,
    requiredPeople,
    requiredSkills,
    equipment,
    priority,
    reason
  ]);
  return r.rows[0];
}

async function getById(id) {
  const q = `
    SELECT rr.*,
      c.title AS complaint_title, c.category AS complaint_category, c.status AS complaint_status,
      uo.name AS officer_name, uo.email AS officer_email,
      d.name AS department_name,
      ua.name AS approved_by_name
    FROM resource_requests rr
    JOIN complaints c ON c.id = rr.complaint_id
    JOIN users uo ON uo.id = rr.requested_by_officer_id
    LEFT JOIN departments d ON d.id = rr.department_id
    LEFT JOIN users ua ON ua.id = rr.approved_by
    WHERE rr.id = $1
  `;
  const r = await db.query(q, [id]);
  return r.rows[0] || null;
}

async function listResourceRequests({
  complaintId = null,
  officerId = null,
  departmentId = null,
  status = null,
  page = 1,
  limit = 20
} = {}) {
  const conditions = [];
  const vals = [];
  let idx = 1;

  if (complaintId) {
    conditions.push(`rr.complaint_id = $${idx++}`);
    vals.push(parseInt(complaintId, 10));
  }
  if (officerId) {
    conditions.push(`rr.requested_by_officer_id = $${idx++}`);
    vals.push(parseInt(officerId, 10));
  }
  if (departmentId) {
    conditions.push(`rr.department_id = $${idx++}`);
    vals.push(parseInt(departmentId, 10));
  }
  if (status) {
    conditions.push(`rr.status = $${idx++}`);
    vals.push(status);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * limit;

  const countQ = `SELECT COUNT(*)::int AS total FROM resource_requests rr ${where}`;
  const countR = await db.query(countQ, vals);
  const total = countR.rows[0]?.total || 0;

  const listQ = `
    SELECT rr.*,
      c.title AS complaint_title, c.category AS complaint_category, c.status AS complaint_status,
      uo.name AS officer_name, uo.email AS officer_email,
      d.name AS department_name,
      ua.name AS approved_by_name
    FROM resource_requests rr
    JOIN complaints c ON c.id = rr.complaint_id
    JOIN users uo ON uo.id = rr.requested_by_officer_id
    LEFT JOIN departments d ON d.id = rr.department_id
    LEFT JOIN users ua ON ua.id = rr.approved_by
    ${where}
    ORDER BY rr.created_at DESC
    LIMIT $${idx++} OFFSET $${idx++}
  `;
  vals.push(limit, offset);
  const listR = await db.query(listQ, vals);

  return { items: listR.rows, total, page, limit };
}

async function updateStatus(id, { status, approvedBy = null, rejectionReason = null }) {
  const q = `
    UPDATE resource_requests
    SET status = $1, approved_by = $2, approved_at = now(), rejection_reason = $3, updated_at = now()
    WHERE id = $4
    RETURNING *
  `;
  const r = await db.query(q, [status, approvedBy, rejectionReason, id]);
  return r.rows[0] || null;
}

async function createComplaintTeam({
  complaintId,
  resourceRequestId = null,
  teamName,
  leaderId = null,
  notes = null,
  members = []
}) {
  const teamQ = `
    INSERT INTO complaint_teams (complaint_id, resource_request_id, team_name, leader_id, notes, status, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, 'active', now(), now())
    RETURNING *
  `;
  const teamR = await db.query(teamQ, [complaintId, resourceRequestId, teamName, leaderId, notes]);
  const team = teamR.rows[0];

  const teamMembers = [];
  for (const m of members) {
    const memberName = typeof m === 'string' ? m : m.name || m.memberName;
    const userId = typeof m === 'object' && m.userId ? parseInt(m.userId, 10) : null;
    const roleInTeam = typeof m === 'object' && m.role ? m.role : 'Member';

    if (memberName && memberName.trim()) {
      const memberQ = `
        INSERT INTO complaint_team_members (team_id, user_id, member_name, role_in_team, assigned_at)
        VALUES ($1, $2, $3, $4, now())
        RETURNING *
      `;
      const memberR = await db.query(memberQ, [team.id, userId, memberName.trim(), roleInTeam]);
      teamMembers.push(memberR.rows[0]);
    }
  }

  return { ...team, members: teamMembers };
}

async function getComplaintTeam(complaintId) {
  const teamQ = `
    SELECT ct.*, ul.name AS leader_name, ul.email AS leader_email
    FROM complaint_teams ct
    LEFT JOIN users ul ON ul.id = ct.leader_id
    WHERE ct.complaint_id = $1 AND ct.status = 'active'
    ORDER BY ct.created_at DESC
    LIMIT 1
  `;
  const teamR = await db.query(teamQ, [complaintId]);
  if (!teamR.rows.length) return null;

  const team = teamR.rows[0];
  const membersQ = `
    SELECT ctm.*, u.email AS user_email
    FROM complaint_team_members ctm
    LEFT JOIN users u ON u.id = ctm.user_id
    WHERE ctm.team_id = $1
    ORDER BY ctm.assigned_at ASC
  `;
  const membersR = await db.query(membersQ, [team.id]);
  return { ...team, members: membersR.rows };
}

module.exports = {
  createResourceRequest,
  getById,
  listResourceRequests,
  updateStatus,
  createComplaintTeam,
  getComplaintTeam
};
