const db = require('../config/db');

async function save(userId, token) {
  const q = 'INSERT INTO refresh_tokens(user_id, token) VALUES($1,$2)';
  await db.query(q, [userId, token]);
}

async function exists(userId, token) {
  if (!db._pool) {
    return mem.tokens.some(t => t.userId === userId && t.token === token);
  }
  const q = 'SELECT id FROM refresh_tokens WHERE user_id=$1 AND token=$2';
  const r = await db.query(q, [userId, token]);
  return r.rowCount > 0;
}

async function remove(token) {
  if (!db._pool) {
    const idx = mem.tokens.findIndex(t => t.token === token);
    if (idx >= 0) mem.tokens.splice(idx, 1);
    return;
  }
  const q = 'DELETE FROM refresh_tokens WHERE token=$1';
  await db.query(q, [token]);
}

module.exports = { save, exists, remove };
