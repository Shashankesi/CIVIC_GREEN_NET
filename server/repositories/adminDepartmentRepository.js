const db = require('../config/db');

async function listDepartments({ q = null, page = 1, limit = 50 } = {}) {
  const conditions = [];
  const vals = [];
  let idx = 1;
  if (q) { conditions.push(`(name ILIKE $${idx} OR description ILIKE $${idx})`); vals.push(`%${q}%`); idx++; }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * limit;

  // Stats: officer count + complaint counts per department
  const qStr = `
    SELECT d.id, d.name, d.description, d.created_at,
      (SELECT COUNT(*)::int FROM users u WHERE u.role='officer' AND u.department_id = d.id) AS officer_count,
      (SELECT COUNT(*)::int FROM complaints c WHERE c.department_id = d.id) AS complaint_count,
      (SELECT COUNT(*)::int FROM complaints c WHERE c.department_id = d.id AND c.status='pending') AS pending_count,
      (SELECT COUNT(*)::int FROM complaints c WHERE c.department_id = d.id AND c.status='resolved') AS resolved_count
    FROM departments d ${where}
    ORDER BY d.name ASC
    LIMIT $${idx++} OFFSET $${idx++}`;
  vals.push(limit, offset);
  const r = await db.query(qStr, vals);

  const countR = await db.query(`SELECT COUNT(*)::int AS total FROM departments d ${where}`, conditions.length ? vals.slice(0, -2) : []);
  const total = countR.rows[0] ? countR.rows[0].total : 0;
  return { items: r.rows, total };
}

async function getById(id) {
  const qStr = `
    SELECT d.id, d.name, d.description, d.created_at,
      (SELECT COUNT(*)::int FROM users u WHERE u.role='officer' AND u.department_id = d.id) AS officer_count,
      (SELECT COUNT(*)::int FROM complaints c WHERE c.department_id = d.id) AS complaint_count,
      (SELECT COUNT(*)::int FROM complaints c WHERE c.department_id = d.id AND c.status='pending') AS pending_count,
      (SELECT COUNT(*)::int FROM complaints c WHERE c.department_id = d.id AND c.status='resolved') AS resolved_count
    FROM departments d WHERE d.id=$1`;
  const r = await db.query(qStr, [id]);
  return r.rows[0] || null;
}

async function getByName(name) {
  const q = 'SELECT id, name, description FROM departments WHERE name ILIKE $1';
  const r = await db.query(q, [`%${name}%`]);
  return r.rows[0] || null;
}

async function createDepartment({ name, description = null }) {
  const q = 'INSERT INTO departments(name, description, created_at) VALUES($1,$2,now()) RETURNING id, name, description, created_at';
  const r = await db.query(q, [name, description]);
  return r.rows[0];
}

async function updateDepartment(id, fields = {}) {
  const allowed = new Set(['name', 'description']);
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
  const q = `UPDATE departments SET ${sets.join(',')} WHERE id=$${idx} RETURNING id, name, description, created_at`;
  const r = await db.query(q, vals);
  return r.rows[0] || null;
}

async function deleteDepartment(id) {
  // Only delete if no complaints reference it (safe). Admin service checks before calling.
  await db.query('DELETE FROM departments WHERE id=$1', [id]);
}

async function listOfficers({ departmentId = null, category = null, strictDepartment = false } = {}) {
  const conditions = ["u.role = 'officer'", "u.status IN ('active', 'approved')"];
  const vals = [];
  let idx = 1;
  let deptParamIdx = null;

  if (departmentId && strictDepartment) {
    conditions.push(`u.department_id = $${idx++}`);
    vals.push(parseInt(departmentId, 10));
  } else if (departmentId) {
    deptParamIdx = idx++;
    vals.push(parseInt(departmentId, 10));
  }

  const orderBy = deptParamIdx
    ? `(CASE WHEN u.department_id = $${deptParamIdx} THEN 0 ELSE 1 END), (CASE WHEN UPPER(COALESCE(u.availability, 'AVAILABLE')) = 'AVAILABLE' THEN 0 ELSE 1 END), current_workload ASC, u.name ASC`
    : `(CASE WHEN UPPER(COALESCE(u.availability, 'AVAILABLE')) = 'AVAILABLE' THEN 0 ELSE 1 END), current_workload ASC, u.name ASC`;

  const q = `
    SELECT
      u.id,
      u.id AS user_id,
      u.name,
      u.email,
      u.department_id,
      d.name AS department_name,
      COALESCE(u.availability, 'AVAILABLE') AS availability,
      COALESCE(u.designation, u.settings->>'designation', 'Field Officer') AS designation,
      COALESCE(u.employee_id, u.settings->>'employee_id') AS employee_id,
      u.status,
      true AS active,
      ${deptParamIdx ? `(u.department_id = $${deptParamIdx})` : 'true'} AS is_dept_match,
      COUNT(CASE WHEN c.status IN ('assigned', 'accepted', 'in_progress', 'reopened') THEN 1 END)::int AS active_assignments,
      COUNT(CASE WHEN c.status IN ('assigned', 'accepted', 'in_progress', 'reopened') THEN 1 END)::int AS current_workload,
      COUNT(CASE WHEN c.status NOT IN ('resolved', 'closed', 'rejected') AND c.sla_due_at < now() THEN 1 END)::int AS overdue_count,
      COUNT(CASE WHEN c.status NOT IN ('resolved', 'closed', 'rejected') AND (c.priority IN ('critical', 'urgent', 'high') OR c.severity = 'critical') THEN 1 END)::int AS critical_count
    FROM users u
    LEFT JOIN departments d ON d.id = u.department_id
    LEFT JOIN complaints c ON c.officer_id = u.id
    WHERE ${conditions.join(' AND ')}
    GROUP BY u.id, d.name
    ORDER BY ${orderBy}
  `;

  const r = await db.query(q, vals);
  return r.rows.map(row => {
    let slaRisk = 'Low';
    if (row.overdue_count > 0 || row.critical_count >= 2) {
      slaRisk = 'High';
    } else if (row.active_assignments >= 4 || row.critical_count === 1) {
      slaRisk = 'Medium';
    }
    return {
      ...row,
      availability: row.availability || 'AVAILABLE',
      isDeptMatch: Boolean(row.is_dept_match),
      currentWorkload: row.current_workload,
      activeAssignments: row.active_assignments,
      overdueCount: row.overdue_count,
      criticalCount: row.critical_count,
      slaRisk
    };
  });
}

module.exports = {
  listDepartments,
  getById,
  getByName,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  listOfficers
};
