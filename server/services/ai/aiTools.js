const db = require('../../config/db');
const complaintRepo = require('../../repositories/complaintRepository');
const assignmentRepo = require('../../repositories/assignmentRepository');
const adminAnalyticsRepo = require('../../repositories/adminAnalyticsRepository');
const pointService = require('../pointService');
const logger = require('../../utils/logger');

/**
 * Format and sanitize a complaint record into a clean, safe payload
 */
function sanitizeComplaint(c) {
  if (!c) return null;
  const numId = typeof c.id === 'number' ? c.id : parseInt(String(c.id).replace(/[^0-9]/g, ''), 10);
  const now = new Date();
  const slaDate = c.sla_due_at ? new Date(c.sla_due_at) : null;
  const isOverdue = !!(slaDate && slaDate < now && !['resolved', 'closed'].includes(c.status));

  let hoursRemaining = null;
  let hoursOverdue = null;
  if (slaDate) {
    const diffHours = (slaDate - now) / (1000 * 60 * 60);
    if (diffHours < 0) {
      hoursOverdue = Math.round(Math.abs(diffHours));
    } else {
      hoursRemaining = Math.round(diffHours * 10) / 10;
    }
  }

  const createdAt = c.created_at ? new Date(c.created_at) : null;
  const ageHours = createdAt ? Math.round((now - createdAt) / (1000 * 60 * 60)) : 0;

  return {
    id: `CGN-${String(numId).padStart(5, '0')}`,
    rawId: numId,
    title: c.title || 'Untitled Issue',
    summary: c.summary || c.description || null,
    status: c.status || 'open',
    category: c.category || 'general',
    priority: c.priority || 'medium',
    severity: c.severity || 'moderate',
    address: c.address || null,
    location: c.lat && c.lng ? { lat: parseFloat(c.lat), lng: parseFloat(c.lng) } : null,
    created_at: c.created_at || null,
    sla_due_at: c.sla_due_at || null,
    isOverdue,
    hoursRemaining,
    hoursOverdue,
    ageHours,
    department_id: c.department_id || null,
    department_name: c.department_name || null,
    assigned_officer_name: c.assigned_officer_name || null
  };
}

/**
 * Smart Deterministic Priority Scoring
 * Calculates an authoritative priority score based on severity, SLA, age, and safety weight.
 * Output is 100% deterministic (no LLM hallucinations).
 */
function calculateComplaintPriority(complaint) {
  const sanitized = sanitizeComplaint(complaint);
  if (!sanitized) {
    return { score: 0, severity: 'moderate', slaRisk: 'none', overdue: false, ageHours: 0, reasons: [] };
  }

  let score = 0;
  const reasons = [];

  // 1. Severity Weight (up to 40 pts)
  const sev = (sanitized.severity || '').toLowerCase();
  const prio = (sanitized.priority || '').toLowerCase();
  if (sev === 'critical' || prio === 'critical') {
    score += 40;
    reasons.push('Critical severity defect requiring urgent attention');
  } else if (sev === 'major' || prio === 'urgent' || prio === 'high') {
    score += 30;
    reasons.push('High priority / major impact issue');
  } else if (sev === 'moderate' || prio === 'medium') {
    score += 15;
  } else {
    score += 5;
  }

  // 2. SLA Risk & Overdue Weight (up to 35 pts)
  if (sanitized.isOverdue) {
    score += 35;
    reasons.push(`SLA breached (Overdue by ${sanitized.hoursOverdue || 1} hour(s))`);
  } else if (sanitized.hoursRemaining !== null) {
    if (sanitized.hoursRemaining <= 4) {
      score += 25;
      reasons.push(`Approaching SLA deadline in ${sanitized.hoursRemaining} hours`);
    } else if (sanitized.hoursRemaining <= 12) {
      score += 15;
      reasons.push(`SLA deadline in ${sanitized.hoursRemaining} hours`);
    } else if (sanitized.hoursRemaining <= 24) {
      score += 8;
    }
  }

  // 3. Complaint Age Weight (up to 15 pts)
  if (sanitized.ageHours >= 168) { // > 7 days
    score += 15;
    reasons.push(`Pending for over 7 days (${Math.floor(sanitized.ageHours / 24)} days)`);
  } else if (sanitized.ageHours >= 72) { // > 3 days
    score += 10;
    reasons.push(`Pending for ${Math.floor(sanitized.ageHours / 24)} days`);
  } else if (sanitized.ageHours >= 24) {
    score += 5;
  }

  // 4. Safety & Critical Infrastructure Weight (up to 10 pts)
  const cat = (sanitized.category || '').toLowerCase();
  if (['public_safety', 'drainage', 'roads', 'utilities'].includes(cat) && (sev === 'critical' || sev === 'major' || prio === 'high' || prio === 'critical')) {
    score += 10;
    reasons.push('Public safety & essential infrastructure hazard');
  }

  return {
    ...sanitized,
    score,
    slaRisk: sanitized.isOverdue ? 'breached' : (sanitized.hoursRemaining && sanitized.hoursRemaining <= 12 ? 'high' : 'normal'),
    reasons
  };
}

// ==========================================
// CITIZEN DATABASE TOOLS
// ==========================================

async function getMyComplaints(userId, { status, limit = 10 } = {}) {
  const query = `
    SELECT c.*, d.name AS department_name, uo.name AS assigned_officer_name
    FROM complaints c
    LEFT JOIN departments d ON d.id = c.department_id
    LEFT JOIN users uo ON uo.id = c.officer_id
    WHERE c.user_id = $1
      ${status ? 'AND c.status = $2' : ''}
    ORDER BY c.created_at DESC
    LIMIT $${status ? 3 : 2};
  `;
  const params = status ? [userId, status, Math.min(limit, 30)] : [userId, Math.min(limit, 30)];
  const res = await db.query(query, params);
  return res.rows.map(sanitizeComplaint);
}

async function getMyComplaintById(userId, complaintId) {
  const rawId = parseInt(String(complaintId).replace(/[^0-9]/g, ''), 10);
  if (isNaN(rawId)) return null;

  const query = `
    SELECT c.*, d.name AS department_name, uo.name AS assigned_officer_name
    FROM complaints c
    LEFT JOIN departments d ON d.id = c.department_id
    LEFT JOIN users uo ON uo.id = c.officer_id
    WHERE c.id = $1 AND c.user_id = $2;
  `;
  const res = await db.query(query, [rawId, userId]);
  if (!res.rows[0]) return null;

  const timeline = await complaintRepo.getTimeline(rawId);
  return {
    ...sanitizeComplaint(res.rows[0]),
    timeline: (timeline.history || []).map(h => ({
      from: h.status_from,
      to: h.status_to,
      note: h.note,
      date: h.created_at
    }))
  };
}

async function getMyComplaintHistory(userId, limit = 20) {
  const query = `
    SELECT c.id, c.title, c.category, c.status, c.priority, c.created_at, c.resolved_at,
           d.name AS department_name
    FROM complaints c
    LEFT JOIN departments d ON d.id = c.department_id
    WHERE c.user_id = $1
    ORDER BY c.created_at DESC
    LIMIT $2;
  `;
  const res = await db.query(query, [userId, limit]);
  return res.rows.map(sanitizeComplaint);
}

async function getMyReputation(userId) {
  const pointsData = await pointService.getUserPoints(userId);
  const badges = await pointService.getUserBadges(userId);
  return {
    points: pointsData.points || 0,
    civicLevel: pointsData.level || 'New Contributor',
    badgeIcon: pointsData.badgeIcon || '🌱',
    badges: badges || [],
    breakdown: pointsData.breakdown || {}
  };
}

async function getMyPointHistory(userId, limit = 10) {
  const history = await pointService.getPointHistory(userId, { limit });
  return history;
}

async function getPublicCivicStats() {
  const query = `
    SELECT
      COUNT(*)::int AS total_complaints,
      COUNT(CASE WHEN status = 'resolved' THEN 1 END)::int AS resolved_complaints,
      COUNT(CASE WHEN status IN ('open', 'in_progress', 'assigned') THEN 1 END)::int AS active_complaints,
      ROUND(COUNT(CASE WHEN status = 'resolved' THEN 1 END)::numeric / NULLIF(COUNT(*), 0) * 100, 1) AS resolution_rate
    FROM complaints;
  `;
  const res = await db.query(query);
  return res.rows[0] || { total_complaints: 0, resolved_complaints: 0, active_complaints: 0, resolution_rate: 0 };
}

function getCivicGuidelines(category) {
  const guidelines = {
    sanitation: {
      category: 'Sanitation & Waste',
      slaHours: 48,
      advice: 'Ensure photos clearly show the pile or overflow and include the nearest street address or landmark.',
      contact: 'Department of Public Health & Sanitation'
    },
    roads: {
      category: 'Roads & Potholes',
      slaHours: 72,
      advice: 'Include a landmark and approximate depth of pothole or extent of road damage.',
      contact: 'Department of Transportation & Municipal Roads'
    },
    lighting: {
      category: 'Street Lighting',
      slaHours: 24,
      advice: 'Note pole numbers if visible, and specify if entire street or single bulb is dark.',
      contact: 'Department of Electrical & Lighting Infrastructure'
    },
    drainage: {
      category: 'Water & Drainage',
      slaHours: 24,
      advice: 'Report standing water depth or blockage source immediately during monsoon season.',
      contact: 'Department of Water Works & Sewage Management'
    },
    general: {
      category: 'Municipal Services',
      slaHours: 48,
      advice: 'Clear photographs and GPS verification speed up officer dispatch by up to 40%.',
      contact: 'Civic GreenNet Central Operations'
    }
  };
  return guidelines[category?.toLowerCase()] || guidelines.general;
}

// ==========================================
// OFFICER DATABASE TOOLS
// ==========================================

async function getOfficerAssignments(officerId, { status = null, limit = 30 } = {}) {
  const query = `
    SELECT c.*, d.name AS department_name
    FROM complaints c
    LEFT JOIN departments d ON d.id = c.department_id
    WHERE c.officer_id = $1
      ${status ? 'AND c.status = $2' : "AND c.status NOT IN ('resolved', 'closed', 'rejected')"}
    ORDER BY c.created_at ASC
    LIMIT $${status ? 3 : 2};
  `;
  const params = status ? [officerId, status, limit] : [officerId, limit];
  const res = await db.query(query, params);
  return res.rows.map(sanitizeComplaint);
}

async function getOfficerPriorityCases(officerId) {
  const activeCases = await getOfficerAssignments(officerId);
  const scored = activeCases.map(calculateComplaintPriority);
  scored.sort((a, b) => b.score - a.score);
  return scored;
}

async function getOfficerSLARisks(officerId) {
  const query = `
    SELECT c.*, d.name AS department_name
    FROM complaints c
    LEFT JOIN departments d ON d.id = c.department_id
    WHERE c.officer_id = $1
      AND c.status NOT IN ('resolved', 'closed', 'rejected')
      AND c.sla_due_at IS NOT NULL
      AND c.sla_due_at < now() + INTERVAL '24 hours'
    ORDER BY c.sla_due_at ASC
    LIMIT 20;
  `;
  const res = await db.query(query, [officerId]);
  return res.rows.map(calculateComplaintPriority);
}

async function getOfficerPerformance(officerId) {
  const stats = await complaintRepo.getOfficerDashboardStats(officerId);
  const pointsData = await pointService.getUserPoints(officerId);

  const query = `
    SELECT
      COUNT(CASE WHEN status = 'resolved' AND resolved_at <= sla_due_at THEN 1 END)::int AS resolved_within_sla,
      COUNT(CASE WHEN status = 'resolved' THEN 1 END)::int AS total_resolved_all_time,
      COUNT(CASE WHEN status = 'resolved' AND resolved_at >= date_trunc('month', now()) THEN 1 END)::int AS resolved_this_month
    FROM complaints
    WHERE officer_id = $1;
  `;
  const res = await db.query(query, [officerId]);
  const perf = res.rows[0] || {};

  const totalResolved = perf.total_resolved_all_time || 0;
  const withinSla = perf.resolved_within_sla || 0;
  const slaComplianceRate = totalResolved > 0 ? Math.round((withinSla / totalResolved) * 100) : 100;

  return {
    assignedToMe: stats.assigned_to_me || 0,
    open: stats.open || 0,
    inProgress: stats.in_progress || 0,
    overdue: stats.overdue || 0,
    dueSoon: stats.due_soon || 0,
    resolvedThisMonth: perf.resolved_this_month || 0,
    totalResolved,
    slaComplianceRate,
    points: pointsData.points || 0,
    civicLevel: pointsData.level || 'Field Officer'
  };
}

async function getOfficerReputation(officerId) {
  const pointsData = await pointService.getUserPoints(officerId);
  const leaderboard = await pointService.getOfficerLeaderboard({ limit: 50 });
  const myRank = leaderboard.findIndex(item => item.user_id === officerId) + 1;

  return {
    points: pointsData.points || 0,
    level: pointsData.level || 'Field Officer',
    badgeIcon: pointsData.badgeIcon || '🛡️',
    rank: myRank > 0 ? myRank : null,
    totalOfficersRanked: leaderboard.length
  };
}

async function getNearbyOperationalIssues(officerId) {
  // Find officer department and nearby open complaints
  const officerRes = await db.query('SELECT department_id FROM users WHERE id = $1', [officerId]);
  const deptId = officerRes.rows[0]?.department_id;

  const query = `
    SELECT c.*, d.name AS department_name
    FROM complaints c
    LEFT JOIN departments d ON d.id = c.department_id
    WHERE c.status IN ('open', 'assigned')
      ${deptId ? 'AND (c.department_id = $1 OR c.department_id IS NULL)' : ''}
    ORDER BY c.created_at DESC
    LIMIT 10;
  `;
  const res = await db.query(query, deptId ? [deptId] : []);
  return res.rows.map(sanitizeComplaint);
}

// ==========================================
// ADMIN DATABASE TOOLS
// ==========================================

async function getUnresolvedByCategory(category = null) {
  const cat = category ? category.toLowerCase() : null;
  const query = cat
    ? `SELECT category, COUNT(*)::int AS count FROM complaints WHERE status NOT IN ('resolved', 'closed') AND LOWER(category) = $1 GROUP BY category`
    : `SELECT category, COUNT(*)::int AS count FROM complaints WHERE status NOT IN ('resolved', 'closed') GROUP BY category ORDER BY count DESC`;
  const res = await db.query(query, cat ? [cat] : []);
  const total = res.rows.reduce((sum, r) => sum + r.count, 0);
  return { data: res.rows, totalCount: total, filterCategory: cat };
}

async function getCriticalToday() {
  const query = `
    SELECT c.*, d.name AS department_name, uo.name AS assigned_officer_name
    FROM complaints c
    LEFT JOIN departments d ON d.id = c.department_id
    LEFT JOIN users uo ON uo.id = c.officer_id
    WHERE (c.priority IN ('high', 'urgent', 'critical') OR c.severity = 'critical')
      AND c.created_at >= now() - INTERVAL '24 hours'
    ORDER BY c.created_at DESC
    LIMIT 15;
  `;
  const res = await db.query(query);
  return {
    totalCriticalToday: res.rows.length,
    complaints: res.rows.map(calculateComplaintPriority)
  };
}

async function getDepartmentAnalytics() {
  const { getDepartmentIntelligence } = require('./insightGenerator');
  const depts = await getDepartmentIntelligence();
  const sorted = [...depts].sort((a, b) => b.totalAssigned - a.totalAssigned);
  return {
    departments: sorted,
    topWorkloadDepartment: sorted[0] || null
  };
}

async function getSLABreaches() {
  const query = `
    SELECT c.*, d.name AS department_name, uo.name AS assigned_officer_name,
           ROUND(EXTRACT(EPOCH FROM (now() - c.sla_due_at)) / 3600) AS hours_overdue
    FROM complaints c
    LEFT JOIN departments d ON d.id = c.department_id
    LEFT JOIN users uo ON uo.id = c.officer_id
    WHERE c.status NOT IN ('resolved', 'closed', 'rejected')
      AND c.sla_due_at IS NOT NULL
      AND c.sla_due_at < now()
    ORDER BY c.sla_due_at ASC
    LIMIT 20;
  `;
  const res = await db.query(query);
  return {
    totalBreaches: res.rows.length,
    breaches: res.rows.map(calculateComplaintPriority)
  };
}

async function getWardAnalytics() {
  const wardAnalytics = require('../analytics/wardAnalytics');
  const scorecards = await wardAnalytics.getWardScorecards({ timeframe: '30d' });
  const sorted = [...scorecards].sort((a, b) => ((b.open || 0) + (b.inProgress || 0)) - ((a.open || 0) + (a.inProgress || 0)));
  return {
    topUnresolvedWard: sorted[0] || null,
    wardBreakdown: sorted.slice(0, 10).map(w => ({
      wardId: w.id,
      wardName: w.name,
      wardNumber: w.wardNumber,
      unresolved: (w.open || 0) + (w.inProgress || 0),
      open: w.open,
      inProgress: w.inProgress,
      total: w.totalComplaints,
      overdue: w.overdue,
      slaCompliance: `${w.slaCompliance}%`
    }))
  };
}

async function getHighestPriorityComplaints() {
  const query = `
    SELECT c.*, d.name AS department_name, uo.name AS assigned_officer_name
    FROM complaints c
    LEFT JOIN departments d ON d.id = c.department_id
    LEFT JOIN users uo ON uo.id = c.officer_id
    WHERE c.status NOT IN ('resolved', 'closed', 'rejected')
    ORDER BY c.created_at ASC
    LIMIT 30;
  `;
  const res = await db.query(query);
  const scored = res.rows.map(calculateComplaintPriority);
  scored.sort((a, b) => b.score - a.score);
  return {
    totalHighPriority: scored.filter(c => c.score >= 30).length,
    complaints: scored.slice(0, 10)
  };
}

async function getOfficerPerformanceAnalytics() {
  const { getOfficerWorkloadIntelligence } = require('./insightGenerator');
  const officers = await getOfficerWorkloadIntelligence();
  const sortedByWorkload = [...officers].sort((a, b) => b.activeAssignments - a.activeAssignments);
  const sortedByCompliance = [...officers].sort((a, b) => (b.slaCompliance || 0) - (a.slaCompliance || 0));

  return {
    highestWorkloadOfficers: sortedByWorkload.slice(0, 5),
    bestComplianceOfficers: sortedByCompliance.slice(0, 5),
    needsAttentionOfficers: sortedByWorkload.filter(o => o.overdueAssignments > 0).slice(0, 5)
  };
}

async function getComplaintTrends() {
  const { getPredictiveTrends } = require('./insightGenerator');
  const trends = await getPredictiveTrends('30d');
  const rising = (trends.trends || []).sort((a, b) => b.changePercentage - a.changePercentage);
  return {
    topRising: rising[0] || null,
    trends: rising
  };
}

async function getGISHotspots() {
  const { analyzeHotspots } = require('./hotspotAnalyzer');
  const hotspots = await analyzeHotspots({ days: 30 });
  return {
    topHotspot: hotspots[0] || null,
    hotspots: hotspots.slice(0, 5)
  };
}

async function getReopenedComplaints() {
  const query = `
    SELECT c.*, d.name AS department_name, uo.name AS assigned_officer_name
    FROM complaints c
    LEFT JOIN departments d ON d.id = c.department_id
    LEFT JOIN users uo ON uo.id = c.officer_id
    WHERE c.status = 'reopened'
    ORDER BY c.updated_at DESC
    LIMIT 15;
  `;
  const res = await db.query(query);
  return {
    totalReopened: res.rows.length,
    complaints: res.rows.map(sanitizeComplaint)
  };
}

async function getCivicHealth() {
  const overview = await adminAnalyticsRepo.analyticsOverview();
  const breaches = await getSLABreaches();
  const critical = await getCriticalToday();

  return {
    totalComplaints: overview.total || 0,
    openComplaints: overview.open || 0,
    inProgressComplaints: overview.in_progress || 0,
    resolvedComplaints: overview.resolved || 0,
    overdueComplaints: breaches.totalBreaches || 0,
    criticalToday: critical.totalCriticalToday || 0,
    resolutionRate: overview.resolutionRate || 0,
    slaCompliance: overview.slaCompliance || 0
  };
}

module.exports = {
  sanitizeComplaint,
  calculateComplaintPriority,
  // Citizen
  getMyComplaints,
  getMyComplaintById,
  getMyComplaintHistory,
  getMyReputation,
  getMyPointHistory,
  getPublicCivicStats,
  getCivicGuidelines,
  // Officer
  getOfficerAssignments,
  getOfficerPriorityCases,
  getOfficerSLARisks,
  getOfficerPerformance,
  getOfficerReputation,
  getNearbyOperationalIssues,
  // Admin
  getUnresolvedByCategory,
  getCriticalToday,
  getDepartmentAnalytics,
  getSLABreaches,
  getWardAnalytics,
  getHighestPriorityComplaints,
  getOfficerPerformanceAnalytics,
  getComplaintTrends,
  getGISHotspots,
  getReopenedComplaints,
  getCivicHealth
};
