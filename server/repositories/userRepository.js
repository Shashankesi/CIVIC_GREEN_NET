const db = require('../config/db');

async function findByEmail(email) {
  const q = 'SELECT id,name,email,password,role,status,is_verified,avatar_url,created_at FROM users WHERE email=$1';
  const r = await db.query(q, [email]);
  return r.rows[0];
}

async function findById(id) {
  const q = 'SELECT id,name,email,role,status,is_verified,avatar_url,created_at FROM users WHERE id=$1';
  const r = await db.query(q, [id]);
  return r.rows[0];
}

async function createUser({ name, email, password, role = 'citizen', status = 'active', settings = {}, department_id = null }) {
  const safeRole = role === 'officer' ? 'officer' : 'citizen';
  const safeStatus = safeRole === 'officer' ? 'pending' : 'active';
  const effectiveStatus = status || safeStatus;
  const q = `INSERT INTO users(name,email,password,role,status,is_verified,settings,department_id,created_at)
    VALUES($1,$2,$3,$4,$5,false,$6,$7,now()) RETURNING id,name,email,role,status`;
  const r = await db.query(q, [name, email, password, safeRole, effectiveStatus, JSON.stringify(settings), department_id]);
  return r.rows[0];
}

async function verifyEmail(userId) {
  const q = 'UPDATE users SET is_verified=true WHERE id=$1';
  await db.query(q, [userId]);
}

async function updatePassword(userId, hashed) {
  const q = 'UPDATE users SET password=$1 WHERE id=$2';
  await db.query(q, [hashed, userId]);
}

// Update only allowed profile fields (name, avatar_url). Does NOT touch role or password.
async function updateProfile(id, { name, avatar_url }) {
  const fields = [];
  const values = [];
  if (name !== undefined && name !== null && String(name).trim()) {
    values.push(String(name).trim());
    fields.push(`name=$${values.length}`);
  }
  if (avatar_url !== undefined) {
    values.push(avatar_url === null ? null : String(avatar_url));
    fields.push(`avatar_url=$${values.length}`);
  }
  if (fields.length === 0) {
    const empty = await findById(id);
    return empty || undefined;
  }
  values.push(id);
  const q = `UPDATE users SET ${fields.join(',')} WHERE id=$${values.length} RETURNING id,name,email,role,avatar_url`;
  const r = await db.query(q, values);
  return r.rows[0];
}

module.exports = { findByEmail, findById, createUser, verifyEmail, updatePassword, updateProfile };
