const notificationRepo = require('../repositories/notificationRepository');

async function create(userId, type, payload) {
  return notificationRepo.createNotification(userId, type, payload);
}

async function list(userId, page = 1, limit = 20) {
  const offset = (page - 1) * limit;
  return notificationRepo.listNotifications(userId, limit, offset);
}

async function markRead(id) {
  return notificationRepo.markRead(id);
}

async function markAllRead(userId) {
  return notificationRepo.markAllRead(userId);
}

async function remove(id) {
  return notificationRepo.deleteNotification(id);
}

module.exports = { create, list, markRead, markAllRead, remove };
