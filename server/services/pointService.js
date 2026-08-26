const db = require('../config/db');
const logger = require('../utils/logger');
const notificationService = require('./notificationService');

// Static fallback rules when DB is initializing or offline
const DEFAULT_RULES = {
  // Citizen
  COMPLAINT_SUBMITTED: { role: 'citizen', points: 10, name: 'Complaint Submitted', description: 'Valid complaint submission' },
  COMPLAINT_VERIFIED: { role: 'citizen', points: 20, name: 'Complaint Verified', description: 'Complaint verification' },
  COMPLAINT_RESOLVED: { role: 'citizen', points: 30, name: 'Complaint Resolved', description: 'Successful resolution' },
  HELPFUL_EVIDENCE: { role: 'citizen', points: 5, name: 'Helpful Evidence', description: 'Helpful additional evidence' },
  COMPLAINT_DUPLICATE: { role: 'citizen', points: 0, name: 'Duplicate Complaint', description: 'Duplicate report matched' },
  FALSE_COMPLAINT: { role: 'citizen', points: -30, name: 'False Complaint', description: 'Confirmed false/misleading complaint' },
  // Officer
  OFFICER_ACCEPTED: { role: 'officer', points: 2, name: 'Assignment Accepted', description: 'Accept assignment' },
  OFFICER_INVESTIGATION: { role: 'officer', points: 5, name: 'Investigation Started', description: 'Start investigation / in progress' },
  OFFICER_EVIDENCE_SUBMITTED: { role: 'officer', points: 10, name: 'Evidence Submitted', description: 'Valid evidence submission' },
  OFFICER_RESOLVED: { role: 'officer', points: 25, name: 'Complaint Resolution', description: 'Complaint resolution' },
  OFFICER_SLA_BONUS: { role: 'officer', points: 15, name: 'SLA Resolution Bonus', description: 'Resolution within SLA' },
  OFFICER_VERIFIED_RESOLUTION: { role: 'officer', points: 20, name: 'Citizen Verified Resolution', description: 'Citizen/admin verified resolution' },
  RESOLUTION_REOPENED: { role: 'officer', points: -10, name: 'Reopened Resolution Penalty', description: 'Reopened resolution' },
  FALSE_RESOLUTION: { role: 'officer', points: -30, name: 'False Resolution Penalty', description: 'False resolution' },
  OFFICER_SLA_VIOLATION: { role: 'officer', points: -15, name: 'SLA Violation Penalty', description: 'SLA violation' }
};

const CIVIC_LEVELS = [
  { level: 'New Contributor', minPoints: 0, maxPoints: 25, badgeIcon: '🌱' },
  { level: 'Active Citizen', minPoints: 26, maxPoints: 75, badgeIcon: '🛡️' },
  { level: 'Community Helper', minPoints: 76, maxPoints: 150, badgeIcon: '🤝' },
  { level: 'Civic Champion', minPoints: 151, maxPoints: 300, badgeIcon: '⭐' },
  { level: 'Community Leader', minPoints: 301, maxPoints: Infinity, badgeIcon: '👑' }
];

/**
 * Fetch all active point rules from PostgreSQL.
 */
async function getPointRules() {
  if (!db._pool) {
    return Object.entries(DEFAULT_RULES).map(([k, v]) => ({
      rule_key: k,
      ...v,
      is_active: true
    }));
  }

  try {
    const res = await db.query(`
      SELECT id, role, rule_key, name, description, points, is_active, updated_at
      FROM point_rules
      ORDER BY role, id ASC
    `);

    if (res.rows.length === 0) {
      return Object.entries(DEFAULT_RULES).map(([k, v], idx) => ({
        id: idx + 1,
        rule_key: k,
        ...v,
        is_active: true
      }));
    }

    return res.rows;
  } catch (err) {
    logger.warn('[PointService] Failed to load point_rules from DB, using defaults', { err: err.message });
    return Object.entries(DEFAULT_RULES).map(([k, v], idx) => ({
      id: idx + 1,
      rule_key: k,
      ...v,
      is_active: true
    }));
  }
}

/**
 * Update point rules (Admin only).
 */
async function updatePointRules(rulesArray, adminUserId) {
  if (!Array.isArray(rulesArray) || rulesArray.length === 0) {
    throw new Error('Rules array is required');
  }

  const results = [];
  for (const r of rulesArray) {
    if (!r.rule_key) continue;
    const pts = parseInt(r.points, 10);
    if (isNaN(pts)) continue;
    const isActive = r.is_active === undefined ? true : Boolean(r.is_active);

    const q = `
      INSERT INTO point_rules (rule_key, role, name, description, points, is_active, updated_by, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, now())
      ON CONFLICT (rule_key) DO UPDATE SET
        points = EXCLUDED.points,
        name = COALESCE(EXCLUDED.name, point_rules.name),
        description = COALESCE(EXCLUDED.description, point_rules.description),
        is_active = EXCLUDED.is_active,
        updated_by = EXCLUDED.updated_by,
        updated_at = now()
      RETURNING *;
    `;
    const res = await db.query(q, [
      r.rule_key,
      r.role || 'citizen',
      r.name || r.rule_key,
      r.description || '',
      pts,
      isActive,
      adminUserId || null
    ]);
    if (res.rows[0]) results.push(res.rows[0]);
  }

  logger.info('[PointService] Point rules updated by admin', { count: results.length, adminUserId });
  return results;
}

/**
 * Resolve points for a given event type from DB or fallbacks.
 */
async function resolveRulePoints(eventType, defaultPoints = 0) {
  try {
    const res = await db.query(`SELECT points, is_active FROM point_rules WHERE rule_key = $1`, [eventType]);
    if (res.rows.length > 0) {
      if (!res.rows[0].is_active) return 0;
      return parseInt(res.rows[0].points, 10);
    }
  } catch (e) {}

  if (DEFAULT_RULES[eventType]) {
    return DEFAULT_RULES[eventType].points;
  }
  return defaultPoints;
}

/**
 * Award points to a user (Citizen or Officer).
 * Fully auditable, idempotent, transactional.
 */
async function awardPoints({
  userId,
  role = 'citizen',
  complaintId = null,
  eventType,
  pointsOverride = null,
  reason = null,
  createdBy = null,
  metadata = {}
}) {
  if (!userId || !eventType) return null;
  if (!db._pool) return null;

  const points = pointsOverride !== null ? parseInt(pointsOverride, 10) : await resolveRulePoints(eventType, 0);
  if (isNaN(points)) return null;

  // Format reason if not provided
  const finalReason = reason || DEFAULT_RULES[eventType]?.description || eventType.replace(/_/g, ' ');

  try {
    // 1. Idempotent insert into point_transactions
    const insertQ = `
      INSERT INTO point_transactions (user_id, role, complaint_id, event_type, points, reason, created_by, metadata, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now())
      ON CONFLICT (user_id, complaint_id, event_type) WHERE complaint_id IS NOT NULL DO NOTHING
      RETURNING id, user_id, role, complaint_id, event_type, points, reason, created_at;
    `;
    const res = await db.query(insertQ, [
      userId,
      role,
      complaintId || null,
      eventType,
      points,
      finalReason,
      createdBy || null,
      JSON.stringify(metadata)
    ]);

    if (res.rows.length === 0) {
      logger.debug('[PointService] Skipped duplicate point award', { userId, complaintId, eventType });
      return null;
    }

    const tx = res.rows[0];
    logger.info('[PointService] Points awarded', { userId, role, points, eventType, complaintId });

    // 2. Also record in citizen_contribution_events for legacy compatibility if citizen
    if (role === 'citizen') {
      try {
        await db.query(`
          INSERT INTO citizen_contribution_events (user_id, event_type, points, reference_type, reference_id, metadata, created_at)
          VALUES ($1, $2, $3, 'complaint', $4, $5, now())
          ON CONFLICT (user_id, event_type, reference_type, reference_id) DO NOTHING
        `, [userId, eventType, points, complaintId, JSON.stringify(metadata)]);
      } catch (legacyErr) {}
    }

    // 3. Evaluate Badges asynchronously
    checkAndAwardBadges(userId, role).catch(err => {
      logger.warn('[PointService] Error checking badges after award', { err: err.message, userId });
    });

    // 4. Send Realtime SSE event
    try {
      const realtimeGateway = require('./realtimeGateway');
      realtimeGateway.sendToUser(userId, {
        type: 'POINTS_AWARDED',
        transactionId: tx.id,
        points: tx.points,
        eventType: tx.event_type,
        reason: tx.reason,
        complaintId: tx.complaint_id,
        timestamp: tx.created_at
      });
      // Broadcast leaderboard update signal
      realtimeGateway.sendToRole('admin', { type: 'LEADERBOARD_UPDATED', role });
    } catch (rtErr) {}

    // 5. In-app Notification for significant positive points
    if (points > 0) {
      try {
        const ticketStr = complaintId ? ` for Case #CGN-${String(complaintId).padStart(5, '0')}` : '';
        await notificationService.create(userId, 'POINTS_AWARDED', {
          title: `+${points} Civic Points!`,
          message: `${finalReason}${ticketStr}`,
          points,
          complaintId
        });
      } catch (notifErr) {}
    }

    return tx;
  } catch (err) {
    logger.error('[PointService] Failed to award points', { err: err.message, userId, eventType });
    return null;
  }
}

/**
 * Deduct points from a user (e.g. false complaint penalty, SLA breach).
 */
async function deductPoints({
  userId,
  role = 'citizen',
  complaintId = null,
  eventType,
  pointsOverride = null,
  reason = null,
  createdBy = null,
  metadata = {}
}) {
  if (!userId || !eventType) return null;
  if (!db._pool) return null;

  let points = pointsOverride !== null ? parseInt(pointsOverride, 10) : await resolveRulePoints(eventType, 0);
  if (isNaN(points)) return null;

  // Ensure points is negative
  if (points > 0) points = -points;

  const finalReason = reason || DEFAULT_RULES[eventType]?.description || 'Civic point deduction';

  try {
    const insertQ = `
      INSERT INTO point_transactions (user_id, role, complaint_id, event_type, points, reason, created_by, metadata, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now())
      ON CONFLICT (user_id, complaint_id, event_type) WHERE complaint_id IS NOT NULL DO NOTHING
      RETURNING id, user_id, role, complaint_id, event_type, points, reason, created_at;
    `;
    const res = await db.query(insertQ, [
      userId,
      role,
      complaintId || null,
      eventType,
      points,
      finalReason,
      createdBy || null,
      JSON.stringify(metadata)
    ]);

    if (res.rows.length === 0) {
      return null;
    }

    const tx = res.rows[0];
    logger.warn('[PointService] Points deducted', { userId, role, points, eventType, complaintId });

    // Send Realtime SSE event
    try {
      const realtimeGateway = require('./realtimeGateway');
      realtimeGateway.sendToUser(userId, {
        type: 'POINTS_DEDUCTED',
        transactionId: tx.id,
        points: tx.points,
        eventType: tx.event_type,
        reason: tx.reason,
        complaintId: tx.complaint_id,
        timestamp: tx.created_at
      });
      realtimeGateway.sendToRole('admin', { type: 'LEADERBOARD_UPDATED', role });
    } catch (rtErr) {}

    // In-app Notification for deduction
    try {
      const ticketStr = complaintId ? ` on Case #CGN-${String(complaintId).padStart(5, '0')}` : '';
      await notificationService.create(userId, 'POINTS_DEDUCTED', {
        title: `${points} Civic Points`,
        message: `${finalReason}${ticketStr}`,
        points,
        complaintId
      });
    } catch (notifErr) {}

    return tx;
  } catch (err) {
    logger.error('[PointService] Failed to deduct points', { err: err.message, userId, eventType });
    return null;
  }
}

/**
 * Get comprehensive user points, rank, and metrics.
 */
async function getUserPoints(userId) {
  if (!userId || !db._pool) {
    return {
      totalPoints: 0,
      currentLevel: CIVIC_LEVELS[0],
      nextLevel: CIVIC_LEVELS[1],
      pointsToNext: 26,
      rank: 1,
      totalReports: 0,
      verifiedReports: 0,
      resolvedReports: 0,
      recentTransactions: [],
      badges: []
    };
  }

  // 1. Total Points from point_transactions
  const ptsRes = await db.query(`
    SELECT COALESCE(SUM(points), 0)::int as total_points
    FROM point_transactions
    WHERE user_id = $1
  `, [userId]);
  const totalPoints = ptsRes.rows[0]?.total_points || 0;

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

  // 3. User Reports & Verification stats from database
  const statsRes = await db.query(`
    SELECT 
      COUNT(*)::int AS total_reports,
      COUNT(CASE WHEN status NOT IN ('rejected') THEN 1 END)::int AS verified_reports,
      COUNT(CASE WHEN status IN ('resolved', 'closed') THEN 1 END)::int AS resolved_reports
    FROM complaints
    WHERE user_id = $1
  `, [userId]);
  const s = statsRes.rows[0] || {};

  // 4. Citywide Rank
  const rankRes = await db.query(`
    SELECT COUNT(*)::int + 1 AS rank
    FROM (
      SELECT user_id, SUM(points) as total
      FROM point_transactions
      WHERE role = 'citizen'
      GROUP BY user_id
      HAVING SUM(points) > $1
    ) sub
  `, [totalPoints]);
  const rank = rankRes.rows[0]?.rank || 1;

  // 5. Recent Point Transactions
  const txRes = await db.query(`
    SELECT id, complaint_id, event_type, points, reason, created_at
    FROM point_transactions
    WHERE user_id = $1
    ORDER BY created_at DESC
    LIMIT 10
  `, [userId]);

  // 6. User Badges
  const badges = await getUserBadges(userId);

  return {
    totalPoints,
    rank,
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
    totalReports: s.total_reports || 0,
    verifiedReports: s.verified_reports || 0,
    resolvedReports: s.resolved_reports || 0,
    recentTransactions: txRes.rows,
    badges: badges.earned || [],
    badgeCatalog: badges.catalog || []
  };
}

/**
 * Get paginated point history ledger for a user.
 */
async function getPointHistory(userId, { limit = 20, offset = 0, role = null } = {}) {
  if (!userId || !db._pool) return { items: [], total: 0 };

  const parsedLimit = Math.min(Math.max(1, parseInt(limit, 10) || 20), 100);
  const parsedOffset = Math.max(0, parseInt(offset, 10) || 0);

  const countRes = await db.query(`
    SELECT COUNT(*)::int as total
    FROM point_transactions
    WHERE user_id = $1 ${role ? 'AND role = $2' : ''}
  `, role ? [userId, role] : [userId]);
  const total = countRes.rows[0]?.total || 0;

  const itemsRes = await db.query(`
    SELECT id, user_id, role, complaint_id, event_type, points, reason, created_at, metadata
    FROM point_transactions
    WHERE user_id = $1 ${role ? 'AND role = $2' : ''}
    ORDER BY created_at DESC
    LIMIT $${role ? 3 : 2} OFFSET $${role ? 4 : 3}
  `, role ? [userId, role, parsedLimit, parsedOffset] : [userId, parsedLimit, parsedOffset]);

  return {
    items: itemsRes.rows,
    total,
    limit: parsedLimit,
    offset: parsedOffset
  };
}

/**
 * Citizen Leaderboard with privacy-safe display names, verified metrics, and rank.
 */
async function getCitizenLeaderboard({ timeframe = 'all', limit = 20, offset = 0, currentUserId = null } = {}) {
  if (!db._pool) return { items: [], currentUserRank: null, total: 0 };

  const parsedLimit = Math.min(Math.max(1, parseInt(limit, 10) || 20), 100);
  const parsedOffset = Math.max(0, parseInt(offset, 10) || 0);

  let timeInterval = null;
  if (timeframe === 'today') timeInterval = "INTERVAL '1 day'";
  else if (timeframe === 'week') timeInterval = "INTERVAL '7 days'";
  else if (timeframe === 'month') timeInterval = "INTERVAL '30 days'";

  const txFilter = timeInterval ? `AND pt.created_at >= now() - ${timeInterval}` : '';

  const query = `
    SELECT 
      u.id as user_id,
      u.name,
      u.settings,
      COALESCE(p.total_points, 0)::int as points,
      COALESCE(c.total_reports, 0)::int as total_reports,
      COALESCE(c.verified_reports, 0)::int as verified_reports,
      COALESCE(c.resolved_reports, 0)::int as resolved_reports
    FROM users u
    INNER JOIN (
      SELECT user_id, SUM(points) as total_points
      FROM point_transactions pt
      WHERE pt.role = 'citizen' ${txFilter}
      GROUP BY user_id
      HAVING SUM(points) > 0
    ) p ON p.user_id = u.id
    LEFT JOIN (
      SELECT 
        user_id,
        COUNT(*)::int as total_reports,
        COUNT(CASE WHEN status NOT IN ('rejected') THEN 1 END)::int as verified_reports,
        COUNT(CASE WHEN status IN ('resolved', 'closed') THEN 1 END)::int as resolved_reports
      FROM complaints
      GROUP BY user_id
    ) c ON c.user_id = u.id
    WHERE u.role = 'citizen' AND u.status = 'active'
    ORDER BY points DESC, verified_reports DESC
    LIMIT $1 OFFSET $2;
  `;

  const countQuery = `
    SELECT COUNT(DISTINCT user_id)::int as total
    FROM point_transactions pt
    WHERE pt.role = 'citizen' ${txFilter};
  `;

  const [rowsRes, countRes] = await Promise.all([
    db.query(query, [parsedLimit, parsedOffset]),
    db.query(countQuery)
  ]);

  let rankIdx = parsedOffset + 1;
  const items = rowsRes.rows.map((row) => {
    let settings = {};
    try {
      settings = typeof row.settings === 'string' ? JSON.parse(row.settings) : (row.settings || {});
    } catch(e) { settings = {}; }

    // Privacy Masking: Check user preference or mask full names
    let displayName = 'Civic Contributor';
    if (settings.anonymousLeaderboard) {
      displayName = `Citizen #${1000 + row.user_id}`;
    } else if (settings.publicNickname && settings.publicNickname.trim()) {
      displayName = settings.publicNickname.trim();
    } else if (row.name) {
      const parts = row.name.trim().split(' ');
      displayName = parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : parts[0];
    }

    return {
      rank: rankIdx++,
      userId: row.user_id,
      displayName,
      points: row.points,
      reports: row.total_reports,
      verifiedReports: row.verified_reports,
      resolvedReports: row.resolved_reports,
      isCurrentUser: currentUserId ? parseInt(currentUserId, 10) === parseInt(row.user_id, 10) : false
    };
  });

  // Calculate current user rank if provided
  let currentUserRank = null;
  if (currentUserId) {
    const myRankRes = await db.query(`
      SELECT COUNT(*)::int + 1 AS rank
      FROM (
        SELECT user_id, SUM(points) as total
        FROM point_transactions pt
        WHERE pt.role = 'citizen' ${txFilter}
        GROUP BY user_id
        HAVING SUM(points) > COALESCE((
          SELECT SUM(points) FROM point_transactions WHERE user_id = $1 ${txFilter}
        ), 0)
      ) sub
    `, [currentUserId]);
    currentUserRank = myRankRes.rows[0]?.rank || null;
  }

  return {
    items,
    total: countRes.rows[0]?.total || 0,
    timeframe,
    currentUserRank
  };
}

/**
 * Officer Leaderboard with SLA compliance, assigned/resolved workload, verification rating.
 */
async function getOfficerLeaderboard({ timeframe = 'all', limit = 20, offset = 0, departmentId = null } = {}) {
  if (!db._pool) return { items: [], total: 0 };

  const parsedLimit = Math.min(Math.max(1, parseInt(limit, 10) || 20), 100);
  const parsedOffset = Math.max(0, parseInt(offset, 10) || 0);

  let timeInterval = null;
  if (timeframe === 'today') timeInterval = "INTERVAL '1 day'";
  else if (timeframe === 'week') timeInterval = "INTERVAL '7 days'";
  else if (timeframe === 'month') timeInterval = "INTERVAL '30 days'";

  const txFilter = timeInterval ? `AND pt.created_at >= now() - ${timeInterval}` : '';
  const deptFilter = departmentId && departmentId !== 'all' ? `AND u.department_id = ${parseInt(departmentId, 10)}` : '';

  const query = `
    SELECT 
      u.id as officer_id,
      u.name as officer_name,
      d.name as department_name,
      COALESCE(p.total_points, 0)::int as points,
      COALESCE(c.assigned_cases, 0)::int as assigned_cases,
      COALESCE(c.resolved_cases, 0)::int as resolved_cases,
      COALESCE(c.on_time_cases, 0)::int as on_time_cases,
      COALESCE(c.reopened_cases, 0)::int as reopened_cases,
      ROUND(COALESCE(c.avg_resolution_hours, 0)::numeric, 1) as avg_resolution_hours
    FROM users u
    LEFT JOIN departments d ON d.id = u.department_id
    LEFT JOIN (
      SELECT user_id, SUM(points) as total_points
      FROM point_transactions pt
      WHERE pt.role = 'officer' ${txFilter}
      GROUP BY user_id
    ) p ON p.user_id = u.id
    LEFT JOIN (
      SELECT 
        officer_id,
        COUNT(*)::int as assigned_cases,
        COUNT(CASE WHEN status IN ('resolved', 'closed') THEN 1 END)::int as resolved_cases,
        COUNT(CASE WHEN status IN ('resolved', 'closed') AND (resolution_at <= sla_due_at OR sla_due_at IS NULL) THEN 1 END)::int as on_time_cases,
        COUNT(CASE WHEN status = 'reopened' THEN 1 END)::int as reopened_cases,
        AVG(CASE WHEN status IN ('resolved', 'closed') AND resolution_at IS NOT NULL 
            THEN EXTRACT(EPOCH FROM (resolution_at - created_at)) / 3600 END) as avg_resolution_hours
      FROM complaints
      WHERE officer_id IS NOT NULL
      GROUP BY officer_id
    ) c ON c.officer_id = u.id
    WHERE u.role = 'officer' AND u.status = 'active' ${deptFilter}
    ORDER BY points DESC, resolved_cases DESC, on_time_cases DESC
    LIMIT $1 OFFSET $2;
  `;

  const countQuery = `
    SELECT COUNT(*)::int as total
    FROM users u
    WHERE u.role = 'officer' AND u.status = 'active' ${deptFilter};
  `;

  const [rowsRes, countRes] = await Promise.all([
    db.query(query, [parsedLimit, parsedOffset]),
    db.query(countQuery)
  ]);

  let rankIdx = parsedOffset + 1;
  const items = rowsRes.rows.map((row) => {
    const resolved = row.resolved_cases || 0;
    const onTime = row.on_time_cases || 0;
    const slaCompliance = resolved > 0 ? Math.round((onTime / resolved) * 100) : 100;

    return {
      rank: rankIdx++,
      officerId: row.officer_id,
      name: row.officer_name,
      department: row.department_name || 'Field Operations',
      points: row.points || 0,
      assignedCases: row.assigned_cases || 0,
      resolvedCases: resolved,
      slaCompliance,
      avgResolutionHours: parseFloat(row.avg_resolution_hours) || 0,
      reopenedCases: row.reopened_cases || 0
    };
  });

  return {
    items,
    total: countRes.rows[0]?.total || 0,
    timeframe
  };
}

/**
 * Check badge criteria and award user badges idempotently.
 */
async function checkAndAwardBadges(userId, role = 'citizen') {
  if (!userId || !db._pool) return [];

  const newlyAwarded = [];

  try {
    if (role === 'citizen') {
      // 1. Citizen stats
      const [compRes, ptRes] = await Promise.all([
        db.query(`
          SELECT 
            COUNT(*)::int as total_reports,
            COUNT(CASE WHEN status NOT IN ('rejected') THEN 1 END)::int as verified_reports,
            COUNT(CASE WHEN status IN ('resolved', 'closed') THEN 1 END)::int as resolved_reports
          FROM complaints WHERE user_id = $1
        `, [userId]),
        db.query(`
          SELECT COALESCE(SUM(points), 0)::int as total_points
          FROM point_transactions WHERE user_id = $1 AND role = 'citizen'
        `, [userId])
      ]);

      const totalReports = compRes.rows[0]?.total_reports || 0;
      const verifiedReports = compRes.rows[0]?.verified_reports || 0;
      const resolvedReports = compRes.rows[0]?.resolved_reports || 0;
      const totalPoints = ptRes.rows[0]?.total_points || 0;

      const eligible = [];
      if (verifiedReports >= 1) eligible.push('FIRST_REPORT');
      if (verifiedReports >= 5) eligible.push('VERIFIED_REPORTER');
      if (verifiedReports >= 10) eligible.push('ACTIVE_CITIZEN');
      if (totalReports >= 5 && (verifiedReports / totalReports) >= 0.9) eligible.push('RELIABLE_REPORTER');
      if (resolvedReports >= 25) eligible.push('COMMUNITY_CONTRIBUTOR');
      if (totalPoints >= 100) eligible.push('CIVIC_CHAMPION');

      for (const badgeId of eligible) {
        const ins = await db.query(`
          INSERT INTO user_badges (user_id, badge_id, awarded_at)
          VALUES ($1, $2, now())
          ON CONFLICT (user_id, badge_id) DO NOTHING
          RETURNING badge_id;
        `, [userId, badgeId]);
        if (ins.rows.length > 0) {
          newlyAwarded.push(badgeId);
          logger.info('[PointService] Awarded citizen badge', { userId, badgeId });
        }
      }
    } else if (role === 'officer') {
      // 2. Officer stats
      const [compRes, ptRes] = await Promise.all([
        db.query(`
          SELECT 
            COUNT(CASE WHEN status IN ('resolved', 'closed') THEN 1 END)::int as resolved_cases,
            COUNT(CASE WHEN status IN ('resolved', 'closed') AND (resolution_at <= sla_due_at OR sla_due_at IS NULL) THEN 1 END)::int as on_time_cases
          FROM complaints WHERE officer_id = $1
        `, [userId]),
        db.query(`
          SELECT COALESCE(SUM(points), 0)::int as total_points
          FROM point_transactions WHERE user_id = $1 AND role = 'officer'
        `, [userId])
      ]);

      const resolved = compRes.rows[0]?.resolved_cases || 0;
      const onTime = compRes.rows[0]?.on_time_cases || 0;
      const totalPoints = ptRes.rows[0]?.total_points || 0;
      const slaRate = resolved > 0 ? (onTime / resolved) : 1;

      const eligible = [];
      if (resolved >= 10 && slaRate >= 0.9) eligible.push('FAST_RESPONDER');
      if (resolved >= 50 && onTime >= 40) eligible.push('FIELD_CHAMPION');
      if (resolved >= 20 && slaRate >= 0.95) eligible.push('RELIABLE_OFFICER');

      for (const badgeId of eligible) {
        const ins = await db.query(`
          INSERT INTO user_badges (user_id, badge_id, awarded_at)
          VALUES ($1, $2, now())
          ON CONFLICT (user_id, badge_id) DO NOTHING
          RETURNING badge_id;
        `, [userId, badgeId]);
        if (ins.rows.length > 0) {
          newlyAwarded.push(badgeId);
          logger.info('[PointService] Awarded officer badge', { userId, badgeId });
        }
      }
    }
  } catch (err) {
    logger.warn('[PointService] Badge check failed', { err: err.message, userId });
  }

  return newlyAwarded;
}

/**
 * Fetch badges earned and catalog for a user.
 */
async function getUserBadges(userId) {
  if (!userId || !db._pool) return { earned: [], catalog: [] };

  try {
    const [earnedRes, catalogRes] = await Promise.all([
      db.query(`
        SELECT b.id, b.name, b.description, b.icon, b.category, ub.awarded_at
        FROM user_badges ub
        JOIN badges b ON b.id = ub.badge_id
        WHERE ub.user_id = $1
        ORDER BY ub.awarded_at DESC;
      `, [userId]),
      db.query(`
        SELECT id, name, description, icon, category, criteria_points
        FROM badges
        ORDER BY criteria_points ASC;
      `)
    ]);

    const earnedSet = new Set(earnedRes.rows.map(b => b.id));
    const catalog = catalogRes.rows.map(b => ({
      ...b,
      isEarned: earnedSet.has(b.id),
      awarded_at: earnedRes.rows.find(x => x.id === b.id)?.awarded_at || null
    }));

    return {
      earned: earnedRes.rows,
      catalog
    };
  } catch (err) {
    logger.warn('[PointService] getUserBadges query failed', { err: err.message, userId });
    return { earned: [], catalog: [] };
  }
}

/**
 * Admin Overview Summary of Reputation System.
 */
async function getAdminOverview() {
  if (!db._pool) {
    return {
      totalPointsIssued: 0,
      totalTransactions: 0,
      citizenPointsTotal: 0,
      officerPointsTotal: 0,
      topCitizens: [],
      topOfficers: []
    };
  }

  const [txSumRes, topCRes, topORes] = await Promise.all([
    db.query(`
      SELECT 
        COALESCE(SUM(points), 0)::int as total_points,
        COUNT(*)::int as total_txs,
        COALESCE(SUM(CASE WHEN role = 'citizen' THEN points ELSE 0 END), 0)::int as citizen_points,
        COALESCE(SUM(CASE WHEN role = 'officer' THEN points ELSE 0 END), 0)::int as officer_points
      FROM point_transactions;
    `),
    getCitizenLeaderboard({ limit: 5 }),
    getOfficerLeaderboard({ limit: 5 })
  ]);

  const s = txSumRes.rows[0] || {};
  return {
    totalPointsIssued: s.total_points || 0,
    totalTransactions: s.total_txs || 0,
    citizenPointsTotal: s.citizen_points || 0,
    officerPointsTotal: s.officer_points || 0,
    topCitizens: topCRes.items || [],
    topOfficers: topORes.items || []
  };
}

module.exports = {
  getPointRules,
  updatePointRules,
  awardPoints,
  deductPoints,
  getUserPoints,
  getPointHistory,
  getCitizenLeaderboard,
  getOfficerLeaderboard,
  checkAndAwardBadges,
  getUserBadges,
  getAdminOverview,
  DEFAULT_RULES,
  CIVIC_LEVELS
};
