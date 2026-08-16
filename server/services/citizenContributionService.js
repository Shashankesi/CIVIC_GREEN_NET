const db = require('../config/db');
const logger = require('../utils/logger');

// Points Matrix for Explainable Civic Gamification
const POINTS_MATRIX = {
  REPORT_SUBMITTED: 10,
  RESOLUTION_VERIFIED: 5,
  EVIDENCE_UPLOADED: 5,
  COMMUNITY_SUPPORT_GIVEN: 1,
  COMMUNITY_SUPPORT_RECEIVED: 1,
  CONSTRUCTIVE_COMMENT: 2,
  FIRST_REPORT_BONUS: 5
};

const CIVIC_LEVELS = [
  { level: 'New Contributor', minPoints: 0, maxPoints: 20, badgeIcon: '🌱' },
  { level: 'Active Citizen', minPoints: 21, maxPoints: 50, badgeIcon: '🛡️' },
  { level: 'Community Helper', minPoints: 51, maxPoints: 100, badgeIcon: '🤝' },
  { level: 'Civic Champion', minPoints: 101, maxPoints: 200, badgeIcon: '⭐' },
  { level: 'Community Leader', minPoints: 201, maxPoints: Infinity, badgeIcon: '👑' }
];

/**
 * Record a contribution event and automatically evaluate badge eligibility.
 */
async function recordContributionEvent(userId, eventType, referenceType = null, referenceId = null, metadata = {}) {
  if (!userId || !eventType) return null;
  const points = POINTS_MATRIX[eventType] || 0;
  if (points <= 0) return null;

  try {
    const insertRes = await db.query(`
      INSERT INTO citizen_contribution_events (user_id, event_type, points, reference_type, reference_id, metadata, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, now())
      ON CONFLICT (user_id, event_type, reference_type, reference_id) DO NOTHING
      RETURNING id, points, created_at
    `, [userId, eventType, points, referenceType, referenceId, JSON.stringify(metadata)]);

    if (insertRes.rows.length > 0) {
      logger.info('Citizen contribution event recorded', { userId, eventType, points });
      // Asynchronously check badge eligibility
      await checkAndAwardBadges(userId);
    }
    return insertRes.rows[0] || null;
  } catch (err) {
    logger.warn('Failed to record contribution event', { err: err.message, userId, eventType });
    return null;
  }
}

/**
 * Compute the citizen's total score, level, and breakdown from PostgreSQL.
 */
async function getCitizenContributionSummary(userId) {
  if (!userId) {
    return {
      totalPoints: 0,
      currentLevel: CIVIC_LEVELS[0],
      nextLevel: CIVIC_LEVELS[1],
      pointsToNext: 21,
      breakdown: {},
      badges: [],
      streak: 1
    };
  }

  // 1. Total Points & Breakdown
  const totalRes = await db.query(`
    SELECT 
      COALESCE(SUM(points), 0)::int as total_points,
      event_type,
      COUNT(*)::int as event_count,
      COALESCE(SUM(points), 0)::int as event_points
    FROM citizen_contribution_events
    WHERE user_id = $1
    GROUP BY event_type
  `, [userId]);

  let totalPoints = 0;
  const breakdown = {};
  for (const row of totalRes.rows) {
    totalPoints += row.event_points;
    breakdown[row.event_type] = {
      count: row.event_count,
      points: row.event_points
    };
  }

  // 2. Determine Level
  let currentLevel = CIVIC_LEVELS[0];
  let nextLevel = CIVIC_LEVELS[1];
  for (let i = 0; i < CIVIC_LEVELS.length; i++) {
    const lvl = CIVIC_LEVELS[i];
    if (totalPoints >= lvl.minPoints && totalPoints <= lvl.maxPoints) {
      currentLevel = lvl;
      nextLevel = CIVIC_LEVELS[i + 1] || null;
      break;
    }
  }

  const pointsToNext = nextLevel ? Math.max(0, nextLevel.minPoints - totalPoints) : 0;
  const levelProgress = nextLevel 
    ? Math.min(100, Math.round(((totalPoints - currentLevel.minPoints) / (nextLevel.minPoints - currentLevel.minPoints)) * 100))
    : 100;

  // 3. User Badges
  const badgesRes = await db.query(`
    SELECT b.id, b.name, b.description, b.icon, b.category, cb.awarded_at
    FROM citizen_badges cb
    JOIN badges b ON b.id = cb.badge_id
    WHERE cb.user_id = $1
    ORDER BY cb.awarded_at DESC
  `, [userId]);

  // 4. All Available Badges Catalog for Progress
  const allBadgesRes = await db.query(`
    SELECT id, name, description, icon, category, criteria_points
    FROM badges
    ORDER BY criteria_points ASC
  `);

  const earnedBadgeIds = new Set(badgesRes.rows.map(b => b.id));
  const badgeCatalog = allBadgesRes.rows.map(b => ({
    ...b,
    isEarned: earnedBadgeIds.has(b.id),
    awarded_at: badgesRes.rows.find(x => x.id === b.id)?.awarded_at || null
  }));

  // 5. Meaningful Civic Streak (Engagement in the last 30 days)
  const activityDaysRes = await db.query(`
    SELECT COUNT(DISTINCT created_at::date)::int as active_days
    FROM citizen_contribution_events
    WHERE user_id = $1 AND created_at >= (now() - interval '30 days')
  `, [userId]);
  const activeDays = activityDaysRes.rows[0]?.active_days || 0;

  return {
    totalPoints,
    currentLevel: {
      name: currentLevel.level,
      minPoints: currentLevel.minPoints,
      maxPoints: currentLevel.maxPoints,
      badgeIcon: currentLevel.badgeIcon,
      progressPercent: levelProgress
    },
    nextLevel: nextLevel ? {
      name: nextLevel.level,
      minPoints: nextLevel.minPoints,
      pointsNeeded: pointsToNext
    } : null,
    breakdown,
    earnedBadges: badgesRes.rows,
    badgeCatalog,
    streak: Math.max(1, activeDays),
    formulaDoc: {
      REPORT_SUBMITTED: "+10 points (Verified issue report)",
      RESOLUTION_VERIFIED: "+5 points (Citizen confirmed resolution)",
      EVIDENCE_UPLOADED: "+5 points (Supplementary photo/document evidence)",
      COMMUNITY_SUPPORT_GIVEN: "+1 point (Supported a public community issue)",
      COMMUNITY_SUPPORT_RECEIVED: "+1 point (Community upvoted your reported issue)",
      CONSTRUCTIVE_COMMENT: "+2 points (Constructive discussion comment)"
    }
  };
}

/**
 * Check badge criteria against real PostgreSQL counts and award badges idempotently.
 */
async function checkAndAwardBadges(userId) {
  if (!userId) return [];
  const newlyAwarded = [];

  try {
    // 1. Report Count
    const reportCountRes = await db.query(`
      SELECT COUNT(*)::int as count FROM complaints WHERE user_id = $1
    `, [userId]);
    const reportCount = reportCountRes.rows[0]?.count || 0;

    // 2. Verified Resolutions
    const verifiedRes = await db.query(`
      SELECT COUNT(*)::int as count FROM citizen_contribution_events 
      WHERE user_id = $1 AND event_type = 'RESOLUTION_VERIFIED'
    `, [userId]);
    const verifiedCount = verifiedRes.rows[0]?.count || 0;

    // 3. Supported count
    const supportRes = await db.query(`
      SELECT COUNT(*)::int as count FROM complaint_votes WHERE user_id = $1
    `, [userId]);
    const supportCount = supportRes.rows[0]?.count || 0;

    // 4. Evidence count
    const evidenceRes = await db.query(`
      SELECT COUNT(*)::int as count FROM citizen_contribution_events 
      WHERE user_id = $1 AND event_type = 'EVIDENCE_UPLOADED'
    `, [userId]);
    const evidenceCount = evidenceRes.rows[0]?.count || 0;

    // 5. Total points
    const pointsRes = await db.query(`
      SELECT COALESCE(SUM(points), 0)::int as total FROM citizen_contribution_events WHERE user_id = $1
    `, [userId]);
    const totalPoints = pointsRes.rows[0]?.total || 0;

    const badgesToAward = [];
    if (reportCount >= 1) badgesToAward.push('FIRST_REPORT');
    if (reportCount >= 5) badgesToAward.push('VERIFIED_REPORTER');
    if (verifiedCount >= 1) badgesToAward.push('RESOLUTION_HELPER');
    if (supportCount >= 10) badgesToAward.push('COMMUNITY_SUPPORTER');
    if (evidenceCount >= 2) badgesToAward.push('EVIDENCE_CONTRIBUTOR');
    if (totalPoints >= 200) badgesToAward.push('CIVIC_LEADER');

    for (const badgeId of badgesToAward) {
      const insRes = await db.query(`
        INSERT INTO citizen_badges (user_id, badge_id, awarded_at)
        VALUES ($1, $2, now())
        ON CONFLICT (user_id, badge_id) DO NOTHING
        RETURNING id, badge_id
      `, [userId, badgeId]);

      if (insRes.rows.length > 0) {
        newlyAwarded.push(badgeId);
        logger.info('Citizen awarded badge', { userId, badgeId });
      }
    }
  } catch (err) {
    logger.warn('Error evaluating badges', { err: err.message, userId });
  }

  return newlyAwarded;
}

/**
 * Privacy-safe community leaderboard.
 * Exposes only public display nickname / initial, contribution level, points, and verified reports.
 */
async function getLeaderboard(limit = 15) {
  const safeLimit = Math.min(Math.max(1, parseInt(limit, 10) || 15), 50);

  const query = `
    SELECT 
      u.id as user_id,
      u.name,
      u.settings,
      COALESCE(c.total_points, 0)::int as total_points,
      COALESCE(r.report_count, 0)::int as report_count,
      COALESCE(v.verified_count, 0)::int as verified_count
    FROM users u
    LEFT JOIN (
      SELECT user_id, SUM(points) as total_points
      FROM citizen_contribution_events
      GROUP BY user_id
    ) c ON c.user_id = u.id
    LEFT JOIN (
      SELECT user_id, COUNT(*) as report_count
      FROM complaints
      GROUP BY user_id
    ) r ON r.user_id = u.id
    LEFT JOIN (
      SELECT user_id, COUNT(*) as verified_count
      FROM citizen_contribution_events
      WHERE event_type = 'RESOLUTION_VERIFIED'
      GROUP BY user_id
    ) v ON v.user_id = u.id
    WHERE u.role = 'citizen' AND COALESCE(c.total_points, 0) > 0
    ORDER BY total_points DESC, report_count DESC
    LIMIT $1
  `;

  const res = await db.query(query, [safeLimit]);

  return res.rows.map((row, idx) => {
    let settings = {};
    try {
      settings = typeof row.settings === 'string' ? JSON.parse(row.settings) : (row.settings || {});
    } catch(e) { settings = {}; }

    // Privacy Masking: Check user preference
    let displayName = 'Civic Contributor';
    if (settings.anonymousLeaderboard) {
      displayName = `Citizen #${1000 + row.user_id}`;
    } else if (settings.publicNickname && settings.publicNickname.trim()) {
      displayName = settings.publicNickname.trim();
    } else if (row.name) {
      const parts = row.name.trim().split(' ');
      displayName = parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : parts[0];
    }

    // Determine Level
    let levelName = 'New Contributor';
    let levelIcon = '🌱';
    for (const lvl of CIVIC_LEVELS) {
      if (row.total_points >= lvl.minPoints && row.total_points <= lvl.maxPoints) {
        levelName = lvl.level;
        levelIcon = lvl.badgeIcon;
        break;
      }
    }

    return {
      rank: idx + 1,
      displayName,
      totalPoints: row.total_points,
      reportCount: row.report_count,
      verifiedCount: row.verified_count,
      levelName,
      levelIcon
    };
  });
}

module.exports = {
  recordContributionEvent,
  getCitizenContributionSummary,
  checkAndAwardBadges,
  getLeaderboard,
  POINTS_MATRIX,
  CIVIC_LEVELS
};
