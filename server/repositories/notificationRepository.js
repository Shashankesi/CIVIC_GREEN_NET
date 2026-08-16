const db = require('../config/db');

async function createNotification(userId, type, payload) {
  const q = 'INSERT INTO notifications(user_id,type,payload,is_read,created_at) VALUES($1,$2,$3,false,now()) RETURNING *';
  const r = await db.query(q, [userId, type, payload]);
  return r.rows[0];
}

async function listNotifications(userId, limit = 20, offset = 0) {
  const q = 'SELECT id,user_id,type,payload,is_read,created_at FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT $2 OFFSET $3';
  const r = await db.query(q, [userId, limit, offset]);
  return r.rows;
}

async function markRead(id) {
  const q = 'UPDATE notifications SET is_read=true WHERE id=$1';
  await db.query(q, [id]);
}

async function markAllRead(userId) {
  const q = 'UPDATE notifications SET is_read=true WHERE user_id=$1';
  await db.query(q, [userId]);
}

async function deleteNotification(id) {
  const q = 'DELETE FROM notifications WHERE id=$1';
  await db.query(q, [id]);
}

async function getUnreadCount(userId) {
  const q = 'SELECT COUNT(*)::int AS count FROM notifications WHERE user_id=$1 AND is_read=false';
  const r = await db.query(q, [userId]);
  return r.rows[0]?.count || 0;
}

module.exports = { createNotification, listNotifications, getUnreadCount, markRead, markAllRead, deleteNotification };
