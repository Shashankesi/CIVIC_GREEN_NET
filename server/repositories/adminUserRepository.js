const db = require('../config/db');

async function listUsers({ q = null, role = null, status = null, departmentId = null, page = 1, limit = 20, sortBy = 'created_at', sortDir = 'desc' } = {}) {
  const conditions = [];
  const vals = [];
  let idx = 1;
  if (q) {
    conditions.push(`(u.name ILIKE $${idx} OR u.email ILIKE $${idx} OR u.employee_id ILIKE $${idx} OR u.designation ILIKE $${idx} OR u.jurisdiction ILIKE $${idx} OR u.id::text ILIKE $${idx})`);
    vals.push(`%${q}%`);
    idx++;
  }
  if (role) { conditions.push(`u.role=$${idx++}`); vals.push(role); }
  if (status) {
    if (status === 'active') {
      conditions.push(`u.status IN ('active', 'approved')`);
    } else if (status === 'suspended') {
      conditions.push(`u.status IN ('suspended', 'blocked')`);
    } else {
      conditions.push(`u.status=$${idx++}`);
      vals.push(status);
    }
  }
  if (departmentId) { conditions.push(`u.department_id = $${idx++}`); vals.push(parseInt(departmentId, 10)); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const orderCol = ['name', 'email', 'role', 'status', 'created_at'].includes(sortBy) ? `u.${sortBy}` : 'u.created_at';
  const order = `ORDER BY ${orderCol} ${sortDir.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'}`;
  const offset = (page - 1) * limit;

  const countR = await db.query(`SELECT COUNT(*)::int AS total FROM users u ${where}`, vals);
  const total = countR.rows[0] ? countR.rows[0].total : 0;

  const qStr = `SELECT u.id, u.name, u.email, u.role, u.status, u.is_verified, u.avatar_url, u.settings, u.department_id,
    u.municipality_id, u.zone_id, u.ward_id, u.jurisdiction, u.designation, u.employee_id, u.approved_at, u.approved_by, u.created_at, u.availability,
    d.name AS department_name, m.name AS municipality_name, z.name AS zone_name, w.name AS ward_name
    FROM users u
    LEFT JOIN departments d ON d.id = u.department_id
    LEFT JOIN municipalities m ON m.id = u.municipality_id
    LEFT JOIN zones z ON z.id = u.zone_id
    LEFT JOIN wards w ON w.id = u.ward_id
    ${where} ${order} LIMIT $${idx++} OFFSET $${idx++}`;
  vals.push(limit, offset);
  const r = await db.query(qStr, vals);
  return { items: r.rows, total };
}

async function getUserStats() {
  const q = `
    SELECT
      COUNT(*)::int AS total,
      COALESCE(SUM(CASE WHEN status IN ('active', 'approved') THEN 1 ELSE 0 END), 0)::int AS active,
      COALESCE(SUM(CASE WHEN role = 'citizen' THEN 1 ELSE 0 END), 0)::int AS citizens,
      COALESCE(SUM(CASE WHEN role = 'officer' THEN 1 ELSE 0 END), 0)::int AS officers,
      COALESCE(SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END), 0)::int AS admins,
      COALESCE(SUM(CASE WHEN status IN ('suspended', 'blocked') THEN 1 ELSE 0 END), 0)::int AS suspended
    FROM users
  `;
  const r = await db.query(q);
  const row = r.rows[0] || {};
  return {
    total: row.total || 0,
    active: row.active || 0,
    citizens: row.citizens || 0,
    officers: row.officers || 0,
    admins: row.admins || 0,
    suspended: row.suspended || 0
  };
}

async function getById(id) {
  const q = `SELECT u.id, u.name, u.email, u.role, u.status, u.is_verified, u.avatar_url, u.settings, u.department_id,
    u.municipality_id, u.zone_id, u.ward_id, u.jurisdiction, u.designation, u.employee_id, u.approved_at, u.approved_by, u.created_at, u.availability,
    d.name AS department_name, m.name AS municipality_name, z.name AS zone_name, w.name AS ward_name
    FROM users u
    LEFT JOIN departments d ON d.id = u.department_id
    LEFT JOIN municipalities m ON m.id = u.municipality_id
    LEFT JOIN zones z ON z.id = u.zone_id
    LEFT JOIN wards w ON w.id = u.ward_id
    WHERE u.id=$1`;
  const r = await db.query(q, [id]);
  return r.rows[0] || null;
}

async function findByEmailWithPassword(email) {
  const q = 'SELECT id, name, email, password, role, status, is_verified, avatar_url, created_at FROM users WHERE email=$1';
  const r = await db.query(q, [email]);
  return r.rows[0] || null;
}

async function updateUser(id, fields = {}) {
  const allowed = new Set(['name', 'email', 'avatar_url', 'status']);
  const sets = [];
  const vals = [];
  let idx = 1;
  Object.keys(fields).forEach((k) => {
    if (allowed.has(k)) {
      sets.push(`${k}=$${idx++}`);
      vals.push(fields[k]);
    }
  });
  if (!sets.length) return getById(id);
  vals.push(id);
  const q = `UPDATE users SET ${sets.join(',')} WHERE id=$${idx} RETURNING id, name, email, role, status, is_verified, avatar_url, created_at`;
  const r = await db.query(q, vals);
  return r.rows[0] || null;
}

async function updateRole(id, role) {
  const q = 'UPDATE users SET role=$1 WHERE id=$2 RETURNING id, name, email, role, status, is_verified, avatar_url, created_at';
  const r = await db.query(q, [role, id]);
  return r.rows[0] || null;
}

async function updateStatus(id, status) {
  const q = 'UPDATE users SET status=$1 WHERE id=$2 RETURNING id, name, email, role, status, is_verified, avatar_url, created_at';
  const r = await db.query(q, [status, id]);
  return r.rows[0] || null;
}

async function approveOfficerRecord(id, employeeId, actorUserId) {
  const q = `UPDATE users SET
    status = 'approved',
    employee_id = $1,
    approved_at = now(),
    approved_by = $2
    WHERE id = $3
    RETURNING id, name, email, role, status, is_verified, avatar_url, employee_id, approved_at, approved_by, created_at`;
  const r = await db.query(q, [employeeId, actorUserId, id]);
  return r.rows[0] || null;
}

async function rejectOfficerRecord(id, reason) {
  const q = `UPDATE users SET
    status = 'rejected',
    settings = jsonb_set(settings, '{rejection_reason}', to_jsonb($1::text), true)
    WHERE id = $2
    RETURNING id, name, email, role, status, is_verified, avatar_url, settings, created_at`;
  const r = await db.query(q, [reason, id]);
  return r.rows[0] || null;
}

async function countByRole() {
  const q = 'SELECT role, COUNT(*)::int AS count FROM users GROUP BY role';
  const r = await db.query(q);
  const counts = { citizen: 0, officer: 0, admin: 0 };
  r.rows.forEach((row) => { counts[row.role] = row.count; });
  return counts;
}

async function countActiveAdmins() {
  const q = "SELECT COUNT(*)::int AS count FROM users WHERE role='admin' AND status='active'";
  const r = await db.query(q);
  return r.rows[0] ? r.rows[0].count : 0;
}

async function getOfficerSummary() {
  const q = `
    SELECT
      COUNT(*)::int AS total,
      COALESCE(SUM(CASE WHEN status IN ('active', 'approved') THEN 1 ELSE 0 END), 0)::int AS active,
      COALESCE(SUM(CASE WHEN status = 'pending' AND (settings->>'onboarding_status' IS NULL OR settings->>'onboarding_status' = 'PENDING_DETAILS') THEN 1 ELSE 0 END), 0)::int AS pending_details,
      COALESCE(SUM(CASE WHEN status = 'pending' AND settings->>'onboarding_status' = 'COMPLETED' THEN 1 ELSE 0 END), 0)::int AS pending_review,
      COALESCE(SUM(CASE WHEN status IN ('active', 'approved') THEN 1 ELSE 0 END), 0)::int AS approved,
      COALESCE(SUM(CASE WHEN status = 'suspended' THEN 1 ELSE 0 END), 0)::int AS suspended,
      COALESCE(SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END), 0)::int AS rejected
    FROM users
    WHERE role = 'officer'
  `;
  const r = await db.query(q);
  const row = r.rows[0] || {};
  return {
    total: row.total || 0,
    active: row.active || 0,
    pendingDetails: row.pending_details || 0,
    pendingReview: row.pending_review || 0,
    pending: (row.pending_details || 0) + (row.pending_review || 0),
    approved: row.approved || 0,
    suspended: row.suspended || 0,
    rejected: row.rejected || 0
  };
}

async function getOfficerFullProfile(id) {
  const officerQ = `
    SELECT u.id, u.name, u.email, u.role, u.status, u.is_verified, u.avatar_url, u.settings, u.department_id,
      u.municipality_id, u.zone_id, u.ward_id, u.jurisdiction, u.designation, u.employee_id, u.approved_at, u.approved_by, u.created_at, u.availability,
      d.name AS department_name, d.description AS department_description,
      m.name AS municipality_name, z.name AS zone_name, w.name AS ward_name,
      approver.name AS approved_by_name
    FROM users u
    LEFT JOIN departments d ON d.id = u.department_id
    LEFT JOIN municipalities m ON m.id = u.municipality_id
    LEFT JOIN zones z ON z.id = u.zone_id
    LEFT JOIN wards w ON w.id = u.ward_id
    LEFT JOIN users approver ON approver.id = u.approved_by
    WHERE u.id = $1
  `;
  const officerRes = await db.query(officerQ, [id]);
  const officer = officerRes.rows[0];
  if (!officer) return null;

  const statsQ = `
    SELECT
      COUNT(*)::int AS total_assigned,
      COALESCE(SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END), 0)::int AS open,
      COALESCE(SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END), 0)::int AS in_progress,
      COALESCE(SUM(CASE WHEN status IN ('resolved', 'closed') THEN 1 ELSE 0 END), 0)::int AS resolved,
      COALESCE(SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END), 0)::int AS closed,
      COALESCE(SUM(CASE WHEN status NOT IN ('resolved', 'closed', 'rejected') AND sla_due_at IS NOT NULL AND sla_due_at < now() THEN 1 ELSE 0 END), 0)::int AS overdue,
      COALESCE(SUM(CASE WHEN priority = 'critical' AND status NOT IN ('resolved', 'closed', 'rejected') THEN 1 ELSE 0 END), 0)::int AS critical
    FROM complaints
    WHERE officer_id = $1
  `;
  const statsRes = await db.query(statsQ, [id]);
  const statsRow = statsRes.rows[0] || {};
  const total = statsRow.total_assigned || 0;
  const resCount = statsRow.resolved || 0;

  const statistics = {
    totalAssigned: total,
    open: statsRow.open || 0,
    inProgress: statsRow.in_progress || 0,
    resolved: resCount,
    closed: statsRow.closed || 0,
    overdue: statsRow.overdue || 0,
    critical: statsRow.critical || 0,
    resolutionRate: total > 0 ? Math.round((resCount / total) * 1000) / 10 : 0
  };

  const complaintsQ = `
    SELECT c.id, c.title, c.category, c.priority, c.status, c.address, c.created_at, c.resolution_at, c.sla_due_at,
      d.name AS department_name
    FROM complaints c
    LEFT JOIN departments d ON d.id = c.department_id
    WHERE c.officer_id = $1
    ORDER BY c.created_at DESC
    LIMIT 50
  `;
  const complaintsRes = await db.query(complaintsQ, [id]);

  const auditQ = `
    SELECT a.id, a.action, a.target_id, a.target_type, a.details, a.created_at, u.name AS actor_name
    FROM audit_logs a
    LEFT JOIN users u ON u.id = a.actor_id
    WHERE a.target_id = $1::text OR a.actor_id = $1::integer
    ORDER BY a.created_at DESC
    LIMIT 30
  `;
  const auditRes = await db.query(auditQ, [id]);

  const emailsQ = `
    SELECT id, recipient, event_type, subject, status, error_message, created_at, sent_at
    FROM email_logs
    WHERE recipient = $1
    ORDER BY created_at DESC
    LIMIT 30
  `;
  const emailsRes = await db.query(emailsQ, [officer.email]);

  const notifsQ = `
    SELECT id, type, payload, is_read, created_at
    FROM notifications
    WHERE user_id = $1
    ORDER BY created_at DESC
    LIMIT 30
  `;
  const notifsRes = await db.query(notifsQ, [id]);

  const docsRes = await db.query(
    'SELECT id, type, status, original_file_name, file_size, document_url, rejection_reason, version, uploaded_at, verified_at, verified_by FROM officer_documents WHERE user_id = $1',
    [id]
  );

  return {
    officer,
    statistics,
    complaints: complaintsRes.rows,
    auditLogs: auditRes.rows,
    emailLogs: emailsRes.rows,
    notifications: notifsRes.rows,
    documents: docsRes.rows
  };
}

module.exports = {
  listUsers,
  getUserStats,
  getById,
  findByEmailWithPassword,
  updateUser,
  updateRole,
  updateStatus,
  approveOfficerRecord,
  rejectOfficerRecord,
  countByRole,
  countActiveAdmins,
  getOfficerSummary,
  getOfficerFullProfile
};
