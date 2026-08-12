const db = require('../config/db');

async function listUsers({ q = null, role = null, status = null, page = 1, limit = 20, sortBy = 'created_at', sortDir = 'desc' } = {}) {
  const conditions = [];
  const vals = [];
  let idx = 1;
  if (q) {
    conditions.push(`(name ILIKE $${idx} OR email ILIKE $${idx})`);
    vals.push(`%${q}%`);
    idx++;
  }
  if (role) { conditions.push(`role=$${idx++}`); vals.push(role); }
  if (status) { conditions.push(`status=$${idx++}`); vals.push(status); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const orderCol = ['name', 'email', 'role', 'status', 'created_at'].includes(sortBy) ? sortBy : 'created_at';
  const order = `ORDER BY ${orderCol} ${sortDir.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'}`;
  const offset = (page - 1) * limit;

  const countR = await db.query(`SELECT COUNT(*)::int AS total FROM users ${where}`, vals);
  const total = countR.rows[0] ? countR.rows[0].total : 0;

  const qStr = `SELECT id, name, email, role, status, is_verified, avatar_url, settings, department_id, created_at FROM users ${where} ${order} LIMIT $${idx++} OFFSET $${idx++}`;
  vals.push(limit, offset);
  const r = await db.query(qStr, vals);
  return { items: r.rows, total };
}

async function getById(id) {
  const q = 'SELECT id, name, email, role, status, is_verified, avatar_url, settings, department_id, created_at FROM users WHERE id=$1';
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

module.exports = {
  listUsers,
  getById,
  findByEmailWithPassword,
  updateUser,
  updateRole,
  updateStatus,
  countByRole,
  countActiveAdmins
};
