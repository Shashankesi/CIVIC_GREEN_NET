const asyncHandler = require('../utils/asyncHandler');
const notificationService = require('../services/notificationService');
const { success, error } = require('../utils/response');

const list = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const userId = req.user.userId;
  const rows = await notificationService.list(userId, page);
  return success(res, { items: rows, page });
});

const create = asyncHandler(async (req, res) => {
  const { userId, type, payload } = req.body;
  const note = await notificationService.create(userId, type, payload);
  return success(res, note, 'Created', 201);
});

const mark = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  await notificationService.markRead(id);
  return success(res, {}, 'Marked');
});

const markAll = asyncHandler(async (req, res) => {
  await notificationService.markAllRead(req.user.userId);
  return success(res, {}, 'All marked');
});

const remove = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  await notificationService.remove(id);
  return success(res, {}, 'Deleted');
});

const unreadCount = asyncHandler(async (req, res) => {
  const count = await notificationService.getUnreadCount(req.user.userId);
  return success(res, { count });
});

module.exports = { list, create, unreadCount, mark, markAll, remove };
