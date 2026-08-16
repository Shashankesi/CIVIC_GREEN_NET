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

async function listOfficers() {
  const q = "SELECT id, name, email, department_id, employee_id, status FROM users WHERE role='officer' AND status IN ('active', 'approved') ORDER BY name ASC";
  const r = await db.query(q);
  return r.rows;
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
