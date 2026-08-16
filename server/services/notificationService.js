const notificationRepo = require('../repositories/notificationRepository');
const realtimeGateway = require('./realtimeGateway');
const db = require('../config/db');

async function create(userId, type, payload) {
  const notification = await notificationRepo.createNotification(userId, type, payload);
  try {
    const unreadCount = await notificationRepo.getUnreadCount(userId);
    realtimeGateway.sendToUser(userId, {
      type: 'NOTIFICATION_CREATED',
      notification,
      unreadCount
    });
  } catch (err) {
    // Non-blocking real-time delivery
  }
  return notification;
}

async function list(userId, page = 1, limit = 20) {
  const offset = (page - 1) * limit;
  return notificationRepo.listNotifications(userId, limit, offset);
}

async function markRead(id) {
  // Find owner of notification to notify
  let userId = null;
  try {
    const r = await db.query('SELECT user_id FROM notifications WHERE id = $1', [id]);
    userId = r.rows[0]?.user_id;
  } catch (e) {}

  await notificationRepo.markRead(id);

  if (userId) {
    try {
      const unreadCount = await notificationRepo.getUnreadCount(userId);
      realtimeGateway.sendToUser(userId, {
        type: 'NOTIFICATION_READ',
        notificationId: id,
        unreadCount
      });
    } catch (err) {}
  }
}

async function markAllRead(userId) {
  await notificationRepo.markAllRead(userId);
  try {
    realtimeGateway.sendToUser(userId, {
      type: 'NOTIFICATIONS_MARKED_ALL_READ',
      unreadCount: 0
    });
  } catch (err) {}
}

async function remove(id) {
  return notificationRepo.deleteNotification(id);
}

async function getUnreadCount(userId) {
  return notificationRepo.getUnreadCount(userId);
}

module.exports = { create, list, getUnreadCount, markRead, markAllRead, remove };

