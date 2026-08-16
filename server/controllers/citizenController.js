const asyncHandler = require('../utils/asyncHandler');
const { success, error } = require('../utils/response');
const db = require('../config/db');
const complaintRepo = require('../repositories/complaintRepository');
const complaintService = require('../services/complaintService');
const contributionService = require('../services/citizenContributionService');
const communityPulseService = require('../services/communityPulseService');

const getUserId = (req) => (req.user ? (req.user.userId || req.user.id) : null);

/**
 * GET /api/citizen/dashboard
 * Aggregates personalized metrics, active status alert banner, recent complaints, followed highlights,
 * and live contribution achievements.
 */
const getDashboard = asyncHandler(async (req, res) => {
  const userId = getUserId(req);

  // 1. Personalized Complaint Counts (Strictly scoped to authenticated citizen)
  const stats = await complaintRepo.statsSummary(userId);

  // 2. Recent Complaints submitted by citizen
  const recentComplaints = await db.query(`
    SELECT c.id, c.title, c.category, c.priority, c.status, c.address, c.created_at, c.resolution_at, c.sla_due_at,
           d.name as department_name,
           (
             SELECT note FROM complaint_status_history 
             WHERE complaint_id = c.id 
             ORDER BY created_at DESC LIMIT 1
           ) as latest_note,
           (
             SELECT COUNT(*)::int FROM complaint_votes WHERE complaint_id = c.id
           ) as vote_count,
           (
             SELECT COUNT(*)::int FROM complaint_comments WHERE complaint_id = c.id AND (status IS NULL OR status = 'visible')
           ) as comment_count
    FROM complaints c
    LEFT JOIN departments d ON d.id = c.department_id
    WHERE c.user_id = $1
    ORDER BY c.created_at DESC
    LIMIT 6
  `, [userId]);

  await complaintService.enrichComplaintsWithImages(recentComplaints.rows);

  // 3. Active Attention Alert (Most recently updated complaint in progress, resolved, or recently changed status)
  const activeAlertRes = await db.query(`
    SELECT c.id, c.title, c.status, c.priority, c.category, c.created_at,
           h.status_from, h.status_to, h.note as status_note, h.created_at as updated_at
    FROM complaints c
    JOIN complaint_status_history h ON h.complaint_id = c.id
    WHERE c.user_id = $1
    ORDER BY h.created_at DESC
    LIMIT 1
  `, [userId]);

  // 4. Followed Complaints Highlights
  const followedRes = await complaintRepo.listFollowedComplaints(userId, 4, 0);
  await complaintService.enrichComplaintsWithImages(followedRes);

  // 5. Total Community Upvotes Received on Citizen's Complaints
  const upvotesReceivedRes = await db.query(`
    SELECT COUNT(*)::int as count 
    FROM complaint_votes v
    JOIN complaints c ON c.id = v.complaint_id
    WHERE c.user_id = $1
  `, [userId]);

  // 6. Citizen Contribution & Badges Summary
  const contribution = await contributionService.getCitizenContributionSummary(userId);

  // 7. Community Pulse Preview (Top 3 most supported local issues)
  const communityPulse = await communityPulseService.getCommunityPulse({ limit: 3, timeframe: 30 });

  return success(res, {
    stats: {
      total: parseInt(stats.total, 10) || 0,
      open: parseInt(stats.open, 10) || 0,
      in_progress: parseInt(stats.in_progress, 10) || 0,
      resolved: (parseInt(stats.resolved, 10) || 0) + (parseInt(stats.closed, 10) || 0),
      reopened: parseInt(stats.reopened, 10) || 0,
      upvotesReceived: upvotesReceivedRes.rows[0]?.count || 0,
      followedCount: followedRes.length
    },
    recentComplaints: recentComplaints.rows,
    activeAlert: activeAlertRes.rows[0] || null,
    followedComplaints: followedRes,
    contribution: {
      totalPoints: contribution.totalPoints,
      currentLevel: contribution.currentLevel,
      nextLevel: contribution.nextLevel,
      earnedBadges: contribution.earnedBadges,
      streak: contribution.streak
    },
    communityPulse
  });
});

/**
 * GET /api/citizen/contribution
 * Comprehensive points breakdown, earned badges, full badge catalog, and scoring formula.
 */
const getContribution = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  const data = await contributionService.getCitizenContributionSummary(userId);
  return success(res, data);
});

/**
 * GET /api/citizen/leaderboard
 * Privacy-safe community leaderboard.
 */
const getLeaderboard = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 15;
  const data = await contributionService.getLeaderboard(limit);
  return success(res, data);
});

/**
 * GET /api/citizen/community-pulse
 * Public community activity, category velocity, and city transparency metrics.
 */
const getCommunityPulse = asyncHandler(async (req, res) => {
  const timeframe = parseInt(req.query.timeframe, 10) || 30;
  const limit = parseInt(req.query.limit, 10) || 6;
  const pulse = await communityPulseService.getCommunityPulse({ limit, timeframe });
  return success(res, pulse);
});

/**
 * GET /api/citizen/activity
 * Chronological timeline of citizen's reports, votes, comments, and resolutions.
 */
const getActivity = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  const limit = parseInt(req.query.limit, 10) || 25;
  const activity = await complaintRepo.getCitizenActivity(userId, limit);
  return success(res, activity);
});

/**
 * GET /api/citizen/followed
 * List of complaints followed / bookmarked by the authenticated citizen.
 */
const getFollowed = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const offset = (page - 1) * limit;

  const followed = await complaintRepo.listFollowedComplaints(userId, limit, offset);
  await complaintService.enrichComplaintsWithImages(followed);

  return success(res, { items: followed, page, limit });
});

/**
 * GET /api/citizen/profile
 */
const getProfile = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  const userRes = await db.query(`
    SELECT id, name, email, role, is_verified, avatar_url, settings, created_at
    FROM users 
    WHERE id = $1
  `, [userId]);

  if (!userRes.rows[0]) return error(res, 'User not found', 404);
  const user = userRes.rows[0];

  const stats = await complaintRepo.statsSummary(userId);
  const upvotesGivenRes = await db.query('SELECT COUNT(*)::int as count FROM complaint_votes WHERE user_id=$1', [userId]);
  const followsCountRes = await db.query('SELECT COUNT(*)::int as count FROM complaint_follows WHERE user_id=$1', [userId]);
  const contribution = await contributionService.getCitizenContributionSummary(userId);

  // Notification Preferences
  const prefRes = await db.query('SELECT * FROM notification_preferences WHERE user_id = $1', [userId]);

  return success(res, {
    user,
    metrics: {
      totalReports: parseInt(stats.total, 10) || 0,
      openReports: parseInt(stats.open, 10) || 0,
      inProgressReports: parseInt(stats.in_progress, 10) || 0,
      resolvedReports: (parseInt(stats.resolved, 10) || 0) + (parseInt(stats.closed, 10) || 0),
      issuesSupported: upvotesGivenRes.rows[0]?.count || 0,
      issuesFollowed: followsCountRes.rows[0]?.count || 0
    },
    contribution: {
      totalPoints: contribution.totalPoints,
      currentLevel: contribution.currentLevel,
      earnedBadges: contribution.earnedBadges,
      streak: contribution.streak
    },
    notificationPreferences: prefRes.rows[0] || {
      email_complaint_updates: true,
      email_followed_updates: true,
      email_community_activity: true,
      in_app_complaint_updates: true,
      in_app_followed_updates: true,
      in_app_community_activity: true
    }
  });
});

/**
 * PATCH /api/citizen/profile
 */
const updateProfile = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  const { name, phone, address, city, state, pincode, settings } = req.body;

  const currentRes = await db.query('SELECT settings FROM users WHERE id=$1', [userId]);
  const currentSettings = typeof currentRes.rows[0]?.settings === 'string' 
    ? JSON.parse(currentRes.rows[0]?.settings) 
    : (currentRes.rows[0]?.settings || {});

  const updatedSettings = {
    ...currentSettings,
    ...(settings || {}),
    ...(phone !== undefined ? { phone } : {}),
    ...(address !== undefined ? { address } : {}),
    ...(city !== undefined ? { city } : {}),
    ...(state !== undefined ? { state } : {}),
    ...(pincode !== undefined ? { pincode } : {})
  };

  const updates = ['settings = $1'];
  const vals = [JSON.stringify(updatedSettings)];
  let idx = 2;

  if (name && name.trim()) {
    updates.push(`name = $${idx++}`);
    vals.push(name.trim());
  }

  vals.push(userId);
  const q = `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx} RETURNING id, name, email, role, avatar_url, settings, created_at`;
  const result = await db.query(q, vals);

  return success(res, result.rows[0], 'Profile updated successfully');
});

/**
 * GET /api/citizen/preferences
 */
const getPreferences = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  const resPref = await db.query('SELECT * FROM notification_preferences WHERE user_id = $1', [userId]);
  const userRes = await db.query('SELECT settings FROM users WHERE id = $1', [userId]);
  
  let settings = {};
  try {
    settings = typeof userRes.rows[0]?.settings === 'string' ? JSON.parse(userRes.rows[0]?.settings) : (userRes.rows[0]?.settings || {});
  } catch(e) { settings = {}; }

  return success(res, {
    notifications: resPref.rows[0] || {
      email_complaint_updates: true,
      email_followed_updates: true,
      email_community_activity: true,
      in_app_complaint_updates: true,
      in_app_followed_updates: true,
      in_app_community_activity: true
    },
    privacy: {
      publicNickname: settings.publicNickname || '',
      anonymousLeaderboard: !!settings.anonymousLeaderboard,
      hideCommunityActivity: !!settings.hideCommunityActivity
    },
    language: settings.language || 'en'
  });
});

/**
 * PATCH /api/citizen/preferences
 */
const updatePreferences = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  const { notifications, privacy, language } = req.body;

  // 1. Update notification preferences table
  if (notifications && typeof notifications === 'object') {
    await db.query(`
      INSERT INTO notification_preferences (
        user_id, email_complaint_updates, email_followed_updates, email_community_activity,
        in_app_complaint_updates, in_app_followed_updates, in_app_community_activity, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, now()
      )
      ON CONFLICT (user_id) DO UPDATE SET
        email_complaint_updates = COALESCE(EXCLUDED.email_complaint_updates, notification_preferences.email_complaint_updates),
        email_followed_updates = COALESCE(EXCLUDED.email_followed_updates, notification_preferences.email_followed_updates),
        email_community_activity = COALESCE(EXCLUDED.email_community_activity, notification_preferences.email_community_activity),
        in_app_complaint_updates = COALESCE(EXCLUDED.in_app_complaint_updates, notification_preferences.in_app_complaint_updates),
        in_app_followed_updates = COALESCE(EXCLUDED.in_app_followed_updates, notification_preferences.in_app_followed_updates),
        in_app_community_activity = COALESCE(EXCLUDED.in_app_community_activity, notification_preferences.in_app_community_activity),
        updated_at = now()
    `, [
      userId,
      notifications.email_complaint_updates !== undefined ? notifications.email_complaint_updates : true,
      notifications.email_followed_updates !== undefined ? notifications.email_followed_updates : true,
      notifications.email_community_activity !== undefined ? notifications.email_community_activity : true,
      notifications.in_app_complaint_updates !== undefined ? notifications.in_app_complaint_updates : true,
      notifications.in_app_followed_updates !== undefined ? notifications.in_app_followed_updates : true,
      notifications.in_app_community_activity !== undefined ? notifications.in_app_community_activity : true
    ]);
  }

  // 2. Update user settings JSON for privacy & language
  const currentRes = await db.query('SELECT settings FROM users WHERE id=$1', [userId]);
  const currentSettings = typeof currentRes.rows[0]?.settings === 'string' 
    ? JSON.parse(currentRes.rows[0]?.settings) 
    : (currentRes.rows[0]?.settings || {});

  const newSettings = {
    ...currentSettings,
    ...(privacy ? {
      publicNickname: privacy.publicNickname !== undefined ? privacy.publicNickname : currentSettings.publicNickname,
      anonymousLeaderboard: privacy.anonymousLeaderboard !== undefined ? privacy.anonymousLeaderboard : currentSettings.anonymousLeaderboard,
      hideCommunityActivity: privacy.hideCommunityActivity !== undefined ? privacy.hideCommunityActivity : currentSettings.hideCommunityActivity
    } : {}),
    ...(language ? { language } : {})
  };

  await db.query('UPDATE users SET settings = $1 WHERE id = $2', [JSON.stringify(newSettings), userId]);

  return success(res, {
    message: 'Preferences updated successfully',
    settings: newSettings
  });
});

module.exports = {
  getDashboard,
  getContribution,
  getLeaderboard,
  getCommunityPulse,
  getActivity,
  getFollowed,
  getProfile,
  updateProfile,
  getPreferences,
  updatePreferences
};
