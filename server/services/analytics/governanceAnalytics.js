const db = require('../../config/db');
const logger = require('../../utils/logger');

/**
 * Parses timeframe strings or custom date ranges into SQL interval / boundary clauses.
 */
function buildDateCondition(timeframe, customStart, customEnd, tableAlias = 'c', dateCol = 'created_at') {
  const col = `${tableAlias}.${dateCol}`;
  const params = [];
  let clause = '1=1';

  if (customStart && customEnd) {
    const s = new Date(customStart);
    const e = new Date(customEnd);
    if (!isNaN(s.getTime()) && !isNaN(e.getTime())) {
      const validStart = s <= e ? s : e;
      const validEnd = s <= e ? e : s;
      // Cap end date at end of that day (23:59:59.999)
      validEnd.setHours(23, 59, 59, 999);
      params.push(validStart, validEnd);
      clause = `${col} >= $${params.length - 1} AND ${col} <= $${params.length}`;
      return {
        clause,
        params,
        label: `Custom (${validStart.toLocaleDateString('en-IN')} - ${validEnd.toLocaleDateString('en-IN')})`
      };
    }
  }

  const tf = (timeframe || '30d').toLowerCase();
  switch (tf) {
    case 'today':
      clause = `${col} >= CURRENT_DATE`;
      return { clause, params, label: 'Today' };
    case '7d':
      clause = `${col} >= now() - INTERVAL '7 days'`;
      return { clause, params, label: 'Last 7 Days' };
    case '30d':
      clause = `${col} >= now() - INTERVAL '30 days'`;
      return { clause, params, label: 'Last 30 Days' };
    case '90d':
      clause = `${col} >= now() - INTERVAL '90 days'`;
      return { clause, params, label: 'Last 90 Days' };
    case '6m':
      clause = `${col} >= now() - INTERVAL '180 days'`;
      return { clause, params, label: 'Last 6 Months' };
    case '1y':
      clause = `${col} >= now() - INTERVAL '365 days'`;
      return { clause, params, label: 'Last 1 Year' };
    case 'all':
      clause = '1=1';
      return { clause, params, label: 'All Time' };
    default:
      clause = `${col} >= now() - INTERVAL '30 days'`;
      return { clause, params, label: 'Last 30 Days' };
  }
}

/**
 * 1. Executive KPIs (Direct PostgreSQL Aggregation)
 */
async function getExecutiveKpis(options = {}) {
  const { timeframe = '30d', startDate, endDate, departmentId, category } = options;
  if (!db._pool) {
    return getFallbackKpis();
  }

  try {
    const { clause: dateClause, params, label: dateLabel } = buildDateCondition(timeframe, startDate, endDate, 'c', 'created_at');
    const conditions = [dateClause];

    if (departmentId && departmentId !== 'all') {
      params.push(parseInt(departmentId, 10));
      conditions.push(`c.department_id = $${params.length}`);
    }

    if (category && category !== 'all') {
      params.push(category.toLowerCase());
      conditions.push(`LOWER(c.category) = $${params.length}`);
    }

    const whereSql = conditions.join(' AND ');

    // 1. Complaint counts
    const kpiQuery = `
      SELECT
        COUNT(*)::int AS total,
        COUNT(CASE WHEN c.status = 'open' THEN 1 END)::int AS open,
        COUNT(CASE WHEN c.status = 'assigned' THEN 1 END)::int AS assigned,
        COUNT(CASE WHEN c.status = 'accepted' THEN 1 END)::int AS accepted,
        COUNT(CASE WHEN c.status = 'in_progress' THEN 1 END)::int AS in_progress,
        COUNT(CASE WHEN c.status = 'resolved' THEN 1 END)::int AS resolved,
        COUNT(CASE WHEN c.status = 'closed' THEN 1 END)::int AS closed,
        COUNT(CASE WHEN c.status = 'reopened' THEN 1 END)::int AS reopened,
        COUNT(CASE WHEN c.status = 'rejected' THEN 1 END)::int AS rejected,
        COUNT(CASE WHEN c.priority = 'critical' AND c.status NOT IN ('resolved', 'closed', 'rejected') THEN 1 END)::int AS critical_backlog,
        COUNT(CASE WHEN c.status NOT IN ('resolved', 'closed', 'rejected') AND c.sla_due_at IS NOT NULL AND c.sla_due_at < now() THEN 1 END)::int AS overdue,
        COUNT(CASE WHEN c.status NOT IN ('resolved', 'closed', 'rejected') AND c.sla_due_at IS NOT NULL AND c.sla_due_at <= now() + INTERVAL '24 hours' AND c.sla_due_at >= now() THEN 1 END)::int AS due_soon,
        COUNT(CASE WHEN c.officer_id IS NULL AND c.status NOT IN ('resolved', 'closed', 'rejected') THEN 1 END)::int AS unassigned,
        AVG(CASE 
          WHEN c.status IN ('resolved', 'closed') AND c.resolution_at IS NOT NULL 
          THEN EXTRACT(EPOCH FROM (c.resolution_at - c.created_at)) / 3600.0
          ELSE NULL 
        END) AS avg_resolution_hours,
        COUNT(CASE WHEN c.status IN ('resolved', 'closed') AND (c.sla_due_at IS NULL OR c.resolution_at <= c.sla_due_at) THEN 1 END)::int AS resolved_on_time,
        COUNT(CASE WHEN c.status IN ('resolved', 'closed') THEN 1 END)::int AS total_resolved_cases
      FROM complaints c
      WHERE ${whereSql};
    `;

    // 2. Active officers and pending approvals
    const userStatsQuery = `
      SELECT
        COUNT(CASE WHEN role = 'officer' AND status = 'active' THEN 1 END)::int AS active_officers,
        COUNT(CASE WHEN role = 'officer' AND status = 'pending' THEN 1 END)::int AS pending_officer_approvals
      FROM users;
    `;

    const [kpiRes, userRes] = await Promise.all([
      db.query(kpiQuery, params),
      db.query(userStatsQuery)
    ]);

    const row = kpiRes.rows[0] || {};
    const uRow = userRes.rows[0] || {};

    const total = row.total || 0;
    const completed = (row.resolved || 0) + (row.closed || 0);
    const resolutionRate = total > 0 ? parseFloat(((completed / total) * 100).toFixed(1)) : 0.0;
    
    const resolvedCases = row.total_resolved_cases || 0;
    const resolvedOnTime = row.resolved_on_time || 0;
    const slaCompliance = resolvedCases > 0 ? parseFloat(((resolvedOnTime / resolvedCases) * 100).toFixed(1)) : 100.0;

    const activeBacklog = (row.open || 0) + (row.assigned || 0) + (row.accepted || 0) + (row.in_progress || 0) + (row.reopened || 0);
    const reopenRate = completed > 0 ? parseFloat((((row.reopened || 0) / completed) * 100).toFixed(1)) : 0.0;
    const overdueRate = activeBacklog > 0 ? parseFloat((((row.overdue || 0) / activeBacklog) * 100).toFixed(1)) : 0.0;

    const avgResHours = row.avg_resolution_hours != null ? parseFloat(Number(row.avg_resolution_hours).toFixed(1)) : 0.0;

    const kpis = {
      dateRangeLabel: dateLabel,
      total,
      open: row.open || 0,
      assigned: row.assigned || 0,
      accepted: row.accepted || 0,
      inProgress: row.in_progress || 0,
      resolved: row.resolved || 0,
      closed: row.closed || 0,
      reopened: row.reopened || 0,
      rejected: row.rejected || 0,
      completed,
      activeBacklog,
      critical: row.critical_backlog || 0,
      overdue: row.overdue || 0,
      dueSoon: row.due_soon || 0,
      unassigned: row.unassigned || 0,
      resolutionRate,
      slaCompliance,
      reopenRate,
      overdueRate,
      avgResolutionHours: avgResHours,
      avgResolutionDays: parseFloat((avgResHours / 24).toFixed(1)),
      activeOfficers: uRow.active_officers || 0,
      pendingOfficerApprovals: uRow.pending_officer_approvals || 0
    };

    kpis.healthScore = calculateGovernanceHealthScore(kpis);

    return kpis;
  } catch (err) {
    logger.error('[GovernanceAnalytics getExecutiveKpis Error]', { err: err.message });
    return getFallbackKpis();
  }
}

/**
 * 2. Governance Health Score Algorithm
 * Formula: 35% Resolution Rate + 35% SLA Compliance + 15% (100 - Overdue Rate) + 15% (100 - Reopen Rate)
 */
function calculateGovernanceHealthScore(kpis) {
  if (!kpis || kpis.total === 0) {
    return {
      score: 100,
      displayScore: 'Insufficient data',
      grade: 'N/A',
      status: 'INSUFFICIENT DATA',
      hasData: false,
      breakdown: {
        resolutionPoints: 0.0,
        slaPoints: 0.0,
        overduePoints: 0.0,
        reopenPoints: 0.0
      },
      formula: '0.35 × Resolution Rate + 0.35 × SLA Compliance + 0.15 × (100 - Overdue Rate) + 0.15 × (100 - Reopen Rate)'
    };
  }

  const resScore = Math.min(100, Math.max(0, kpis.resolutionRate || 0));
  const slaScore = Math.min(100, Math.max(0, kpis.slaCompliance || 0));
  const overduePenalty = Math.min(100, Math.max(0, kpis.overdueRate || 0));
  const reopenPenalty = Math.min(100, Math.max(0, kpis.reopenRate || 0));

  const weightedRes = 0.35 * resScore;
  const weightedSla = 0.35 * slaScore;
  const weightedOverdue = 0.15 * (100 - overduePenalty);
  const weightedReopen = 0.15 * (100 - reopenPenalty);

  const rawScore = weightedRes + weightedSla + weightedOverdue + weightedReopen;
  const score = Math.round(Math.min(100, Math.max(0, rawScore)));

  let grade = 'A';
  let status = 'HEALTHY';
  if (score >= 90) { grade = 'A'; status = 'EXCELLENT'; }
  else if (score >= 75) { grade = 'B'; status = 'HEALTHY'; }
  else if (score >= 60) { grade = 'C'; status = 'NEEDS ATTENTION'; }
  else if (score >= 45) { grade = 'D'; status = 'CRITICAL'; }
  else { grade = 'F'; status = 'CRITICAL'; }

  return {
    score,
    displayScore: `${score} / 100`,
    grade,
    status,
    hasData: true,
    contributingMetrics: {
      resolutionRate: `${resScore.toFixed(1)}%`,
      slaCompliance: `${slaScore.toFixed(1)}%`,
      overdueBacklog: `${(100 - overduePenalty).toFixed(1)}% on time`,
      reopenRate: `${reopenPenalty.toFixed(1)}% reopen rate`
    },
    breakdown: {
      resolutionPoints: parseFloat(weightedRes.toFixed(1)),
      slaPoints: parseFloat(weightedSla.toFixed(1)),
      overduePoints: parseFloat(weightedOverdue.toFixed(1)),
      reopenPoints: parseFloat(weightedReopen.toFixed(1))
    },
    formula: '0.35 × Resolution Rate + 0.35 × SLA Compliance + 0.15 × (100 - Overdue Rate) + 0.15 × (100 - Reopen Rate)'
  };
}

/**
 * 3. Operations Trends Analytics
 * Supports daily, weekly, monthly aggregations across lifecycle states
 */
async function getOperationsTrends(options = {}) {
  const { timeframe = '30d', startDate, endDate, aggregation = 'daily' } = options;
  if (!db._pool) return [];

  try {
    const { clause: dateClause, params } = buildDateCondition(timeframe, startDate, endDate, 'c', 'created_at');

    let dateFormat = 'YYYY-MM-DD';
    let dateTrunc = 'day';
    if (aggregation === 'weekly') {
      dateFormat = 'YYYY-"W"IW';
      dateTrunc = 'week';
    } else if (aggregation === 'monthly') {
      dateFormat = 'YYYY-MM';
      dateTrunc = 'month';
    }

    const query = `
      SELECT
        TO_CHAR(c.created_at, '${dateFormat}') AS date,
        COUNT(*)::int AS submitted,
        COUNT(CASE WHEN c.status = 'assigned' THEN 1 END)::int AS assigned,
        COUNT(CASE WHEN c.status = 'accepted' THEN 1 END)::int AS accepted,
        COUNT(CASE WHEN c.status = 'in_progress' THEN 1 END)::int AS in_progress,
        COUNT(CASE WHEN c.status = 'resolved' THEN 1 END)::int AS resolved,
        COUNT(CASE WHEN c.status = 'closed' THEN 1 END)::int AS closed,
        COUNT(CASE WHEN c.status = 'reopened' THEN 1 END)::int AS reopened,
        COUNT(CASE WHEN c.status = 'rejected' THEN 1 END)::int AS rejected
      FROM complaints c
      WHERE ${dateClause}
      GROUP BY TO_CHAR(c.created_at, '${dateFormat}')
      ORDER BY date ASC;
    `;

    const res = await db.query(query, params);
    return res.rows.map(r => ({
      date: r.date,
      submitted: r.submitted,
      assigned: r.assigned,
      accepted: r.accepted,
      inProgress: r.in_progress,
      resolved: r.resolved,
      closed: r.closed,
      reopened: r.reopened,
      rejected: r.rejected,
      totalCompleted: r.resolved + r.closed
    }));
  } catch (err) {
    logger.error('[GovernanceAnalytics getOperationsTrends Error]', { err: err.message });
    return [];
  }
}

/**
 * 4. Category Intelligence Analytics
 */
async function getCategoryAnalytics(options = {}) {
  const { timeframe = '30d', startDate, endDate } = options;
  if (!db._pool) return [];

  try {
    const { clause: dateClause, params } = buildDateCondition(timeframe, startDate, endDate, 'c', 'created_at');

    const query = `
      SELECT
        COALESCE(c.category, 'other') AS category,
        COUNT(*)::int AS total,
        COUNT(CASE WHEN c.status IN ('resolved', 'closed') THEN 1 END)::int AS resolved,
        COUNT(CASE WHEN c.status NOT IN ('resolved', 'closed', 'rejected') AND c.sla_due_at IS NOT NULL AND c.sla_due_at < now() THEN 1 END)::int AS overdue,
        COUNT(CASE WHEN c.priority = 'critical' THEN 1 END)::int AS critical,
        AVG(CASE 
          WHEN c.status IN ('resolved', 'closed') AND c.resolution_at IS NOT NULL 
          THEN EXTRACT(EPOCH FROM (c.resolution_at - c.created_at)) / 3600.0
          ELSE NULL 
        END) AS avg_resolution_hours,
        COUNT(CASE WHEN c.status IN ('resolved', 'closed') AND (c.sla_due_at IS NULL OR c.resolution_at <= c.sla_due_at) THEN 1 END)::int AS on_time_resolved
      FROM complaints c
      WHERE ${dateClause}
      GROUP BY COALESCE(c.category, 'other')
      ORDER BY total DESC;
    `;

    const res = await db.query(query, params);

    return res.rows.map(r => {
      const total = r.total || 0;
      const resolved = r.resolved || 0;
      const resolutionRate = total > 0 ? parseFloat(((resolved / total) * 100).toFixed(1)) : 0.0;
      const slaCompliance = resolved > 0 ? parseFloat(((r.on_time_resolved / resolved) * 100).toFixed(1)) : 100.0;
      const avgHours = r.avg_resolution_hours != null ? parseFloat(Number(r.avg_resolution_hours).toFixed(1)) : 0.0;

      return {
        category: r.category,
        total,
        resolved,
        overdue: r.overdue || 0,
        critical: r.critical || 0,
        resolutionRate,
        slaCompliance,
        avgResolutionHours: avgHours
      };
    });
  } catch (err) {
    logger.error('[GovernanceAnalytics getCategoryAnalytics Error]', { err: err.message });
    return [];
  }
}

/**
 * 5. Priority Analytics
 */
async function getPriorityAnalytics(options = {}) {
  const { timeframe = '30d', startDate, endDate } = options;
  if (!db._pool) return [];

  try {
    const { clause: dateClause, params } = buildDateCondition(timeframe, startDate, endDate, 'c', 'created_at');

    const query = `
      SELECT
        COALESCE(c.priority, 'medium') AS priority,
        COUNT(*)::int AS total,
        COUNT(CASE WHEN c.status IN ('resolved', 'closed') THEN 1 END)::int AS resolved,
        COUNT(CASE WHEN c.status NOT IN ('resolved', 'closed', 'rejected') AND c.sla_due_at IS NOT NULL AND c.sla_due_at < now() THEN 1 END)::int AS overdue,
        AVG(CASE 
          WHEN c.status IN ('resolved', 'closed') AND c.resolution_at IS NOT NULL 
          THEN EXTRACT(EPOCH FROM (c.resolution_at - c.created_at)) / 3600.0
          ELSE NULL 
        END) AS avg_resolution_hours
      FROM complaints c
      WHERE ${dateClause}
      GROUP BY COALESCE(c.priority, 'medium')
      ORDER BY 
        CASE COALESCE(c.priority, 'medium')
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
          ELSE 5
        END;
    `;

    const res = await db.query(query, params);

    return res.rows.map(r => {
      const total = r.total || 0;
      const resolved = r.resolved || 0;
      return {
        priority: r.priority,
        total,
        resolved,
        overdue: r.overdue || 0,
        resolutionRate: total > 0 ? parseFloat(((resolved / total) * 100).toFixed(1)) : 0.0,
        avgResolutionHours: r.avg_resolution_hours != null ? parseFloat(Number(r.avg_resolution_hours).toFixed(1)) : 0.0
      };
    });
  } catch (err) {
    logger.error('[GovernanceAnalytics getPriorityAnalytics Error]', { err: err.message });
    return [];
  }
}

/**
 * 6. Critical Operations Backlog
 */
async function getCriticalOperationsBacklog() {
  if (!db._pool) return { criticalCases: [], overdueCriticalCount: 0, criticalHotspots: [] };

  try {
    const query = `
      SELECT
        c.id,
        c.title,
        c.category,
        c.priority,
        c.status,
        c.address,
        c.created_at,
        c.sla_due_at,
        d.name AS department_name,
        u.name AS officer_name,
        ST_Y(c.location::geometry) AS lat,
        ST_X(c.location::geometry) AS lng,
        CASE WHEN c.sla_due_at IS NOT NULL AND c.sla_due_at < now() THEN true ELSE false END AS is_overdue
      FROM complaints c
      LEFT JOIN departments d ON d.id = c.department_id
      LEFT JOIN users u ON u.id = c.officer_id
      WHERE c.priority = 'critical' AND c.status NOT IN ('resolved', 'closed', 'rejected')
      ORDER BY c.sla_due_at ASC NULLS LAST, c.created_at ASC
      LIMIT 100;
    `;

    const res = await db.query(query);

    const criticalCases = res.rows.map(r => ({
      id: r.id,
      ticketId: `CGN-${String(r.id).padStart(5, '0')}`,
      title: r.title,
      category: r.category,
      priority: r.priority,
      status: r.status,
      address: r.address || 'Municipal Area',
      departmentName: r.department_name || 'Unassigned',
      officerName: r.officer_name || 'Unassigned',
      lat: parseFloat(r.lat) || null,
      lng: parseFloat(r.lng) || null,
      isOverdue: r.is_overdue,
      slaDueAt: r.sla_due_at,
      createdAt: r.created_at
    }));

    const overdueCount = criticalCases.filter(c => c.isOverdue).length;

    return {
      criticalCases,
      totalCriticalActive: criticalCases.length,
      overdueCriticalCount: overdueCount
    };
  } catch (err) {
    logger.error('[GovernanceAnalytics getCriticalOperationsBacklog Error]', { err: err.message });
    return { criticalCases: [], totalCriticalActive: 0, overdueCriticalCount: 0 };
  }
}

function getFallbackKpis() {
  return {
    dateRangeLabel: 'Last 30 Days',
    total: 0,
    open: 0,
    assigned: 0,
    accepted: 0,
    inProgress: 0,
    resolved: 0,
    closed: 0,
    reopened: 0,
    rejected: 0,
    completed: 0,
    activeBacklog: 0,
    critical: 0,
    overdue: 0,
    dueSoon: 0,
    unassigned: 0,
    resolutionRate: 0.0,
    slaCompliance: 100.0,
    reopenRate: 0.0,
    overdueRate: 0.0,
    avgResolutionHours: 0.0,
    avgResolutionDays: 0.0,
    activeOfficers: 0,
    pendingOfficerApprovals: 0,
    healthScore: { score: 100, grade: 'A+', status: 'OPTIMAL' }
  };
}

module.exports = {
  buildDateCondition,
  getExecutiveKpis,
  calculateGovernanceHealthScore,
  getOperationsTrends,
  getCategoryAnalytics,
  getPriorityAnalytics,
  getCriticalOperationsBacklog
};
