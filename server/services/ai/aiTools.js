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
  let slaCategory = 'NORMAL';

  if (slaDate) {
    const diffHours = (slaDate - now) / (1000 * 60 * 60);
    if (diffHours < 0) {
      hoursOverdue = Math.round(Math.abs(diffHours) * 10) / 10;
      slaCategory = 'OVERDUE';
    } else {
      hoursRemaining = Math.round(diffHours * 10) / 10;
      if (hoursRemaining <= 2) slaCategory = 'DUE_WITHIN_2_HOURS';
      else if (hoursRemaining <= 6) slaCategory = 'DUE_WITHIN_6_HOURS';
      else if (hoursRemaining <= 24) slaCategory = 'DUE_WITHIN_24_HOURS';
    }
  }

  const createdAt = c.created_at ? new Date(c.created_at) : null;
  const ageHours = createdAt ? Math.round((now - createdAt) / (1000 * 60 * 60)) : 0;

  return {
    id: `CGN-${String(numId).padStart(5, '0')}`,
    rawId: numId,
    title: c.title || 'Untitled Issue',
    summary: c.summary || c.description || null,
    description: c.description || null,
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
    slaCategory,
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
    if (sanitized.hoursRemaining <= 2) {
      score += 30;
      reasons.push(`Critical: SLA deadline in ${sanitized.hoursRemaining} hours`);
    } else if (sanitized.hoursRemaining <= 6) {
      score += 20;
      reasons.push(`Urgent: SLA deadline in ${sanitized.hoursRemaining} hours`);
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
    SELECT c.id, c.title, c.category, c.status, c.priority, c.created_at, c.resolution_at,
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
  let query = `
    SELECT c.*, d.name AS department_name
    FROM complaints c
    LEFT JOIN departments d ON d.id = c.department_id
    WHERE c.officer_id = $1
  `;
  const params = [officerId];
  let idx = 2;

  if (status && status !== 'all') {
    query += ` AND c.status = $${idx++}`;
    params.push(status);
  } else if (!status) {
    query += ` AND c.status NOT IN ('resolved', 'closed', 'rejected')`;
  }
  query += ` ORDER BY c.created_at ASC LIMIT $${idx++}`;
  params.push(limit);

  const res = await db.query(query, params);
  return res.rows.map(sanitizeComplaint);
}

async function getOfficerWorkload(officerId) {
  const assignments = await getOfficerAssignments(officerId);
  const scored = assignments.map(calculateComplaintPriority);

  const pendingStart = scored.filter(c => c.status === 'open' || c.status === 'assigned');
  const inProgress = scored.filter(c => c.status === 'in_progress');
  const overdue = scored.filter(c => c.isOverdue);
  const critical = scored.filter(c => (c.severity === 'critical' || c.priority === 'critical'));

  return {
    totalActive: scored.length,
    pendingStartCount: pendingStart.length,
    inProgressCount: inProgress.length,
    overdueCount: overdue.length,
    criticalCount: critical.length,
    cases: scored
  };
}

async function getOfficerPriorityCases(officerId) {
  const activeCases = await getOfficerAssignments(officerId);
  let scored = activeCases.map(calculateComplaintPriority);
  scored.sort((a, b) => b.score - a.score);

  // If officer has 0 assigned cases, check if there are urgent unassigned cases in officer's department
  let unassignedDepartmentCases = [];
  if (scored.length === 0) {
    const userRes = await db.query(
      `SELECT u.department_id, d.name AS department_name
       FROM users u
       LEFT JOIN departments d ON d.id = u.department_id
       WHERE u.id = $1`,
      [officerId]
    );
    const deptId = userRes.rows[0]?.department_id;
    const deptName = userRes.rows[0]?.department_name;
    if (deptId) {
      const complaintRepo = require('../repositories/complaintRepository');
      const cats = complaintRepo.getCategoriesForDepartment ? complaintRepo.getCategoriesForDepartment(deptName) : [];
      const unassignedRes = await db.query(
        `SELECT c.*, d.name AS department_name
         FROM complaints c
         LEFT JOIN departments d ON d.id = c.department_id
         WHERE (c.department_id = $1 OR ($2::text[] IS NOT NULL AND LOWER(c.category) = ANY($2)))
           AND c.officer_id IS NULL AND c.status IN ('open', 'reopened')
         ORDER BY c.created_at ASC LIMIT 5`,
        [deptId, cats.length ? cats : null]
      );
      unassignedDepartmentCases = unassignedRes.rows.map(calculateComplaintPriority);
      unassignedDepartmentCases.sort((a, b) => b.score - a.score);
    }
  }

  return {
    assignedPriorityCases: scored,
    unassignedDepartmentCases,
    topCase: scored[0] || unassignedDepartmentCases[0] || null
  };
}

async function getOfficerSlaAlerts(officerId) {
  const assignments = await getOfficerAssignments(officerId);
  const scored = assignments.map(calculateComplaintPriority);

  const overdue = scored.filter(c => c.isOverdue);
  const dueWithin2Hours = scored.filter(c => !c.isOverdue && c.slaCategory === 'DUE_WITHIN_2_HOURS');
  const dueWithin6Hours = scored.filter(c => !c.isOverdue && c.slaCategory === 'DUE_WITHIN_6_HOURS');
  const dueWithin24Hours = scored.filter(c => !c.isOverdue && c.slaCategory === 'DUE_WITHIN_24_HOURS');

  return {
    totalAtRisk: overdue.length + dueWithin2Hours.length + dueWithin6Hours.length,
    overdue,
    dueWithin2Hours,
    dueWithin6Hours,
    dueWithin24Hours,
    allCases: scored
  };
}

async function getOfficerSLARisks(officerId) {
  const alerts = await getOfficerSlaAlerts(officerId);
  return [...alerts.overdue, ...alerts.dueWithin2Hours, ...alerts.dueWithin6Hours, ...alerts.dueWithin24Hours];
}

async function getOfficerDepartmentWorkload(officerId) {
  const userRes = await db.query(
    `SELECT u.department_id, d.name AS department_name
     FROM users u
     LEFT JOIN departments d ON d.id = u.department_id
     WHERE u.id = $1`,
    [officerId]
  );
  const dept = userRes.rows[0];
  if (!dept || !dept.department_id) {
    return { message: 'Officer has no assigned department.', departmentName: 'Unassigned' };
  }

  const complaintRepo = require('../repositories/complaintRepository');
  const cats = complaintRepo.getCategoriesForDepartment ? complaintRepo.getCategoriesForDepartment(dept.department_name) : [];

  const statsRes = await db.query(
    `SELECT
       COUNT(*)::int AS total_complaints,
       COUNT(CASE WHEN c.status IN ('open', 'assigned', 'in_progress', 'reopened') THEN 1 END)::int AS active_complaints,
       COUNT(CASE WHEN c.status = 'open' THEN 1 END)::int AS open_queue,
       COUNT(CASE WHEN c.status = 'in_progress' THEN 1 END)::int AS in_progress,
       COUNT(CASE WHEN c.status = 'resolved' THEN 1 END)::int AS resolved,
       COUNT(CASE WHEN c.status = 'closed' THEN 1 END)::int AS closed,
       COUNT(CASE WHEN c.sla_due_at < now() AND c.status NOT IN ('resolved', 'closed', 'rejected') THEN 1 END)::int AS overdue,
       COUNT(CASE WHEN (c.priority IN ('high', 'urgent', 'critical') OR c.severity = 'critical') AND c.status NOT IN ('resolved', 'closed', 'rejected') THEN 1 END)::int AS critical
     FROM complaints c
     WHERE c.department_id = $1 OR ($2::text[] IS NOT NULL AND LOWER(c.category) = ANY($2))`,
    [dept.department_id, cats.length ? cats : null]
  );

  const stats = statsRes.rows[0] || {};
  return {
    departmentId: dept.department_id,
    departmentName: dept.department_name || 'My Department',
    ...stats
  };
}

async function getOfficerPerformance(officerId) {
  const directRes = await db.query(
    `SELECT
       COUNT(CASE WHEN status IN ('open', 'assigned', 'in_progress') THEN 1 END)::int AS assigned_to_me,
       COUNT(CASE WHEN status IN ('open', 'assigned') THEN 1 END)::int AS open,
       COUNT(CASE WHEN status = 'in_progress' THEN 1 END)::int AS in_progress,
       COUNT(CASE WHEN sla_due_at < now() AND status NOT IN ('resolved', 'closed', 'rejected') THEN 1 END)::int AS overdue,
       COUNT(CASE WHEN sla_due_at >= now() AND sla_due_at <= now() + INTERVAL '12 hours' AND status NOT IN ('resolved', 'closed', 'rejected') THEN 1 END)::int AS due_soon,
       COUNT(CASE WHEN status = 'resolved' AND resolution_at <= sla_due_at THEN 1 END)::int AS resolved_within_sla,
       COUNT(CASE WHEN status = 'resolved' THEN 1 END)::int AS total_resolved_all_time,
       COUNT(CASE WHEN status = 'resolved' AND resolution_at >= date_trunc('month', now()) THEN 1 END)::int AS resolved_this_month,
       COUNT(CASE WHEN status = 'reopened' THEN 1 END)::int AS reopened_count
     FROM complaints WHERE officer_id = $1`,
    [officerId]
  );
  const perf = directRes.rows[0] || {};

  let pointsData = { points: 0, level: 'Field Officer' };
  try {
    pointsData = await pointService.getUserPoints(officerId);
  } catch (e) {
    // default points
  }

  let leaderboardItems = [];
  try {
    const lRes = await pointService.getOfficerLeaderboard({ limit: 100 });
    leaderboardItems = Array.isArray(lRes) ? lRes : (lRes.items || []);
  } catch (e) {
    leaderboardItems = [];
  }
  const myRank = leaderboardItems.findIndex(item => (item.officer_id || item.user_id) === officerId) + 1;

  const totalResolved = perf.total_resolved_all_time || 0;
  const withinSla = perf.resolved_within_sla || 0;
  const slaComplianceRate = totalResolved > 0 ? Math.round((withinSla / totalResolved) * 100) : 100;
  const assignedCount = perf.assigned_to_me || 0;
  const resolutionRate = (assignedCount + totalResolved) > 0
    ? Math.round((totalResolved / (assignedCount + totalResolved)) * 100)
    : 100;

  return {
    assignedToMe: assignedCount,
    open: perf.open || 0,
    inProgress: perf.in_progress || 0,
    overdue: perf.overdue || 0,
    dueSoon: perf.due_soon || 0,
    resolvedThisMonth: perf.resolved_this_month || 0,
    totalResolved,
    reopenedCount: perf.reopened_count || 0,
    resolutionRate,
    slaComplianceRate,
    points: pointsData.points || 0,
    civicLevel: pointsData.level || 'Field Officer',
    leaderboardRank: myRank > 0 ? myRank : null,
    totalOfficersRanked: leaderboardItems.length
  };
}

async function getOfficerPoints(officerId) {
  const pointsData = await pointService.getUserPoints(officerId);
  const badges = await pointService.getUserBadges(officerId);
  const history = await pointService.getPointHistory(officerId, { limit: 5 });

  return {
    points: pointsData.points || 0,
    level: pointsData.level || 'Field Officer',
    badgeIcon: pointsData.badgeIcon || '🛡️',
    badges: badges || [],
    recentTransactions: history || []
  };
}

async function getOfficerReputation(officerId) {
  const pointsData = await pointService.getUserPoints(officerId);
  let leaderboardItems = [];
  try {
    const lRes = await pointService.getOfficerLeaderboard({ limit: 50 });
    leaderboardItems = Array.isArray(lRes) ? lRes : (lRes.items || []);
  } catch (e) {
    leaderboardItems = [];
  }
  const myRank = leaderboardItems.findIndex(item => (item.officer_id || item.user_id) === officerId) + 1;

  return {
    points: pointsData.points || 0,
    level: pointsData.level || 'Field Officer',
    badgeIcon: pointsData.badgeIcon || '🛡️',
    rank: myRank > 0 ? myRank : null,
    totalOfficersRanked: leaderboardItems.length
  };
}

async function getOfficerComplaintDetails(officerId, complaintId) {
  const rawId = parseInt(String(complaintId).replace(/[^0-9]/g, ''), 10);
  if (isNaN(rawId)) return { error: 'Invalid complaint ID format' };

  const query = `
    SELECT c.*, d.name AS department_name, uo.name AS assigned_officer_name
    FROM complaints c
    LEFT JOIN departments d ON d.id = c.department_id
    LEFT JOIN users uo ON uo.id = c.officer_id
    WHERE c.id = $1;
  `;
  const res = await db.query(query, [rawId]);
  const c = res.rows[0];
  if (!c) return { error: `Complaint #${complaintId} not found` };

  // RBAC check: officer can access if assigned to them or if belonging to their department
  const userRes = await db.query('SELECT department_id FROM users WHERE id = $1', [officerId]);
  const officerDeptId = userRes.rows[0]?.department_id;

  const isAssigned = c.officer_id === officerId;
  const isDeptMatch = officerDeptId && c.department_id === officerDeptId;

  if (!isAssigned && !isDeptMatch) {
    return { error: 'Access restricted: You are not authorized to view this complaint file.' };
  }

  const timeline = await complaintRepo.getTimeline(rawId);
  const scored = calculateComplaintPriority(c);

  // Fetch support team and members
  let supportTeam = null;
  try {
    const resourceRequestService = require('../resourceRequestService');
    supportTeam = await resourceRequestService.getTeamForComplaint(rawId);
  } catch (e) {}

  // Fetch resource requests
  let resourceRequests = [];
  try {
    const resourceRepo = require('../../repositories/resourceRequestRepository');
    const rrRes = await resourceRepo.listResourceRequests({ complaintId: rawId });
    resourceRequests = rrRes.items || [];
  } catch (e) {}

  // Fetch operational notes count & evidence count
  const notesRes = await db.query('SELECT COUNT(*)::int AS count FROM complaint_notes WHERE complaint_id = $1', [rawId]);
  const imagesRes = await db.query('SELECT COUNT(*)::int AS count, COUNT(CASE WHEN (metadata->>\'resolution\') = \'true\' THEN 1 END)::int AS resolution_count FROM complaint_images WHERE complaint_id = $1', [rawId]);

  const notesCount = notesRes.rows[0]?.count || 0;
  const totalEvidenceCount = imagesRes.rows[0]?.count || 0;
  const resolutionEvidenceCount = imagesRes.rows[0]?.resolution_count || 0;

  // Resource recommendation logic
  const isComplex = c.severity === 'critical' || c.severity === 'high' || c.priority === 'critical' || c.priority === 'high';
  const hasTeam = !!supportTeam;
  const pendingResourceReq = resourceRequests.find(r => r.status === 'pending');

  let resourceRecommendation = null;
  if (!hasTeam) {
    if (isComplex) {
      resourceRecommendation = 'High-complexity case. Requesting a field support crew of 2-3 specialists is recommended.';
    } else {
      resourceRecommendation = 'Standard case complexity. Can typically be handled by primary assigned officer or a 1-person assistant.';
    }
  } else {
    resourceRecommendation = `Assigned support team "${supportTeam.team_name}" (${supportTeam.members?.length || 0} members) is currently actively dispatched.`;
  }

  // Resolution readiness assessment
  const canResolve = c.status === 'in_progress' || c.status === 'accepted';
  const missingEvidence = totalEvidenceCount === 0
    ? 'No field photographs uploaded yet.'
    : (c.status === 'in_progress' && resolutionEvidenceCount === 0 ? 'Resolution proof photo not yet marked/uploaded.' : 'Evidence documented.');

  return {
    ...scored,
    isAssignedToCaller: isAssigned,
    supportTeam: supportTeam ? {
      teamName: supportTeam.team_name,
      leaderName: supportTeam.leader_name,
      memberCount: supportTeam.members?.length || 0,
      members: (supportTeam.members || []).map(m => m.member_name)
    } : null,
    resourceRequests: resourceRequests.map(r => ({
      type: r.request_type,
      people: r.required_people,
      status: r.status,
      reason: r.reason
    })),
    resourceRecommendation,
    resolutionReadiness: {
      canResolve,
      currentStatus: c.status,
      notesCount,
      totalEvidenceCount,
      resolutionEvidenceCount,
      missingEvidence
    },
    timeline: (timeline.history || []).map(h => ({
      from: h.status_from,
      to: h.status_to,
      note: h.note,
      date: h.created_at
    }))
  };
}

async function getNearbyIssuesForOfficer(officerId) {
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

async function getOfficerTodaySummary(officerId) {
  const workload = await getOfficerWorkload(officerId);
  const priority = await getOfficerPriorityCases(officerId);
  const sla = await getOfficerSlaAlerts(officerId);
  const perf = await getOfficerPerformance(officerId);

  return {
    workload,
    topPriorityCases: priority.assignedPriorityCases.slice(0, 3),
    unassignedDeptCases: priority.unassignedDepartmentCases.slice(0, 3),
    slaAlerts: sla,
    performance: perf
  };
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
  getOfficerWorkload,
  getOfficerPriorityCases,
  getOfficerSlaAlerts,
  getOfficerSLARisks,
  getOfficerDepartmentWorkload,
  getOfficerPerformance,
  getOfficerPoints,
  getOfficerReputation,
  getOfficerComplaintDetails,
  getNearbyIssuesForOfficer,
  getOfficerTodaySummary,
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
