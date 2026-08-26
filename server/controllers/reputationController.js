const asyncHandler = require('../utils/asyncHandler');
const { success, error } = require('../utils/response');
const pointService = require('../services/pointService');

const getUserId = (req) => (req.user ? (req.user.userId || req.user.id) : null);

/**
 * Get authenticated user's civic reputation, points balance, rank, and achievements.
 */
const getMyReputation = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return error(res, 'Unauthorized', 401);

  const data = await pointService.getUserPoints(userId);
  return success(res, data);
});

/**
 * Get authenticated user's transaction ledger history.
 */
const getMyHistory = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return error(res, 'Unauthorized', 401);

  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const offset = (page - 1) * limit;

  const data = await pointService.getPointHistory(userId, { limit, offset, role: req.user.role });
  return success(res, {
    ...data,
    page,
    totalPages: Math.ceil(data.total / limit) || 1
  });
});

/**
 * Citizen Leaderboard (Public / Authenticated).
 */
const getCitizenLeaderboard = asyncHandler(async (req, res) => {
  const timeframe = req.query.timeframe || 'all';
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const offset = (page - 1) * limit;
  const currentUserId = getUserId(req);

  const data = await pointService.getCitizenLeaderboard({
    timeframe,
    limit,
    offset,
    currentUserId
  });

  return success(res, {
    ...data,
    page,
    limit,
    totalPages: Math.ceil(data.total / limit) || 1
  });
});

/**
 * Officer Performance Leaderboard.
 */
const getOfficerLeaderboard = asyncHandler(async (req, res) => {
  const timeframe = req.query.timeframe || 'all';
  const departmentId = req.query.departmentId || null;
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const offset = (page - 1) * limit;

  const data = await pointService.getOfficerLeaderboard({
    timeframe,
    departmentId,
    limit,
    offset
  });

  return success(res, {
    ...data,
    page,
    limit,
    totalPages: Math.ceil(data.total / limit) || 1
  });
});

/**
 * Get active point rules matrix.
 */
const getRules = asyncHandler(async (req, res) => {
  const rules = await pointService.getPointRules();
  return success(res, rules);
});

/**
 * Admin: Overview statistics.
 */
const getAdminOverview = asyncHandler(async (req, res) => {
  const data = await pointService.getAdminOverview();
  return success(res, data);
});

/**
 * Admin: Detailed Citizen Leaderboard.
 */
const getAdminCitizens = asyncHandler(async (req, res) => {
  const timeframe = req.query.timeframe || 'all';
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const offset = (page - 1) * limit;

  const data = await pointService.getCitizenLeaderboard({
    timeframe,
    limit,
    offset
  });

  return success(res, {
    ...data,
    page,
    limit,
    totalPages: Math.ceil(data.total / limit) || 1
  });
});

/**
 * Admin: Detailed Officer Performance Leaderboard.
 */
const getAdminOfficers = asyncHandler(async (req, res) => {
  const timeframe = req.query.timeframe || 'all';
  const departmentId = req.query.departmentId || null;
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const offset = (page - 1) * limit;

  const data = await pointService.getOfficerLeaderboard({
    timeframe,
    departmentId,
    limit,
    offset
  });

  return success(res, {
    ...data,
    page,
    limit,
    totalPages: Math.ceil(data.total / limit) || 1
  });
});

/**
 * Admin: Update Point Rules.
 */
const updateAdminRules = asyncHandler(async (req, res) => {
  const rules = req.body.rules;
  if (!Array.isArray(rules)) {
    return error(res, 'Rules must be an array', 400);
  }

  const updated = await pointService.updatePointRules(rules, getUserId(req));
  return success(res, updated, 'Point rules updated successfully');
});

module.exports = {
  getMyReputation,
  getMyHistory,
  getCitizenLeaderboard,
  getOfficerLeaderboard,
  getRules,
  getAdminOverview,
  getAdminCitizens,
  getAdminOfficers,
  updateAdminRules
};
