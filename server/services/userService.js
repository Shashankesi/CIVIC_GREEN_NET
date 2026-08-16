const db = require('../config/db');
const userRepo = require('../repositories/userRepository');

async function createUser({
  name,
  email,
  password,
  role = 'citizen',
  status = 'active',
  settings = {},
  department_id = null,
  municipality_id = null,
  zone_id = null,
  ward_id = null,
  jurisdiction = null,
  designation = null
}) {
  return userRepo.createUser({
    name,
    email,
    password,
    role,
    status,
    settings,
    department_id,
    municipality_id,
    zone_id,
    ward_id,
    jurisdiction,
    designation
  });
}

async function findByEmail(email) {
  return userRepo.findByEmail(email);
}

async function findById(id) {
  return userRepo.findById(id);
}

async function saveEmailVerification(userId, token) {
  const q = 'INSERT INTO email_verifications(user_id,token,created_at) VALUES($1,$2,now())';
  await db.query(q, [userId, token]);
}

async function verifyEmail(userId) {
  const q = 'UPDATE users SET is_verified=true WHERE id=$1';
  await db.query(q, [userId]);
}

async function savePasswordReset(userId, token) {
  const q = 'INSERT INTO password_resets(user_id,token,created_at) VALUES($1,$2,now())';
  await db.query(q, [userId, token]);
}

async function invalidatePasswordReset(token) {
  const q = 'DELETE FROM password_resets WHERE token=$1';
  await db.query(q, [token]);
}

async function updatePassword(userId, hashed) {
  const q = 'UPDATE users SET password=$1 WHERE id=$2';
  await db.query(q, [hashed, userId]);
}

// Update only allowed profile fields (name, avatar_url). Does NOT touch role or password.
async function updateProfile(id, { name, avatar_url }) {
  return userRepo.updateProfile(id, { name, avatar_url });
}

module.exports = { createUser, findByEmail, findById, saveEmailVerification, verifyEmail, savePasswordReset, invalidatePasswordReset, updatePassword, updateProfile };
