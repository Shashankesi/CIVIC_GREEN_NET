const db = require('../config/db');

async function assignComplaint({ complaintId, officerId, assignedBy }) {
  await db.query("UPDATE complaints SET officer_id=$1, assigned_at=now(), status='assigned' WHERE id=$2", [officerId, complaintId]);
  // Insert assignment history (preserve history)
  const q = "INSERT INTO complaint_assignments(complaint_id, officer_id, assigned_by, assigned_at, status) VALUES($1,$2,$3,now(),'ASSIGNED') RETURNING *";
  const r = await db.query(q, [complaintId, officerId, assignedBy]);
  return r.rows[0];
}

async function unassignComplaint(complaintId, assignedBy) {
  await db.query("UPDATE complaints SET officer_id=NULL, assigned_at=NULL, status='open' WHERE id=$1", [complaintId]);
  await db.query("INSERT INTO complaint_assignments(complaint_id, officer_id, assigned_by, assigned_at, status) VALUES($1,NULL,$2,now(),'DECLINED')", [complaintId, assignedBy]);
  return { complaint_id: complaintId, officer_id: null };
}

async function getAssignments(complaintId) {
  const q = `SELECT a.id, a.complaint_id, a.officer_id, a.assigned_by, a.assigned_at,
      uo.name AS officer_name, ua.name AS assigned_by_name
    FROM complaint_assignments a
    LEFT JOIN users uo ON uo.id = a.officer_id
    LEFT JOIN users ua ON ua.id = a.assigned_by
    WHERE a.complaint_id=$1
    ORDER BY a.assigned_at DESC`;
  const r = await db.query(q, [complaintId]);
  return r.rows;
}

async function complaintsAssignedToOfficer(officerId, { limit = 50 } = {}) {
  const q = `SELECT id FROM complaints WHERE officer_id=$1 ORDER BY assigned_at DESC LIMIT $2`;
  const r = await db.query(q, [officerId, limit]);
  return r.rows;
}

module.exports = { assignComplaint, unassignComplaint, getAssignments, complaintsAssignedToOfficer };
