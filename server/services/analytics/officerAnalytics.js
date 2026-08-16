const db = require('../../config/db');
const logger = require('../../utils/logger');
const { buildDateCondition } = require('./governanceAnalytics');

/**
 * 1. Officer Performance Overview Table (Fair Multi-Factor Scoring)
 */
async function getOfficerPerformanceTable(options = {}) {
  const { timeframe = '30d', startDate, endDate, departmentId } = options;
  if (!db._pool) return [];

  try {
    const { clause: dateClause, params } = buildDateCondition(timeframe, startDate, endDate, 'c', 'created_at');
    const conditions = [`u.role = 'officer'`];

    if (departmentId && departmentId !== 'all') {
      params.push(parseInt(departmentId, 10));
      conditions.push(`u.department_id = $${params.length}`);
    }

    const query = `
      SELECT
        u.id,
        u.name,
        u.email,
        u.status,
        u.department_id,
        d.name AS department_name,
        COUNT(c.id)::int AS assigned_total,
        COUNT(CASE WHEN c.status IN ('assigned', 'accepted', 'in_progress') THEN 1 END)::int AS active_workload,
        COUNT(CASE WHEN c.status = 'resolved' THEN 1 END)::int AS resolved_count,
        COUNT(CASE WHEN c.status = 'closed' THEN 1 END)::int AS closed_count,
        COUNT(CASE WHEN c.status NOT IN ('resolved', 'closed', 'rejected') AND c.sla_due_at IS NOT NULL AND c.sla_due_at < now() THEN 1 END)::int AS overdue_count,
        COUNT(CASE WHEN c.priority = 'critical' THEN 1 END)::int AS critical_count,
        COUNT(CASE WHEN c.status = 'reopened' THEN 1 END)::int AS reopened_count,
        COUNT(CASE WHEN c.status IN ('resolved', 'closed') AND (c.sla_due_at IS NULL OR c.resolution_at <= c.sla_due_at) THEN 1 END)::int AS on_time_resolved,
        AVG(CASE 
          WHEN c.status IN ('resolved', 'closed') AND c.resolution_at IS NOT NULL 
          THEN EXTRACT(EPOCH FROM (c.resolution_at - c.created_at)) / 3600.0
          ELSE NULL 
        END) AS avg_resolution_hours
      FROM users u
      LEFT JOIN departments d ON d.id = u.department_id
      LEFT JOIN complaints c ON c.officer_id = u.id AND ${dateClause}
      WHERE ${conditions.join(' AND ')}
      GROUP BY u.id, u.name, u.email, u.status, u.department_id, d.name
      ORDER BY assigned_total DESC, active_workload DESC;
    `;

    const res = await db.query(query, params);

    return res.rows.map(r => {
      const assigned = r.assigned_total || 0;
      const completed = (r.resolved_count || 0) + (r.closed_count || 0);
      const resolutionRate = assigned > 0 ? parseFloat(((completed / assigned) * 100).toFixed(1)) : 0.0;
      const slaCompliance = completed > 0 ? parseFloat(((r.on_time_resolved / completed) * 100).toFixed(1)) : 100.0;
      const reopenRate = completed > 0 ? parseFloat(((r.reopened_count / completed) * 100).toFixed(1)) : 0.0;
      const avgHours = r.avg_resolution_hours != null ? parseFloat(Number(r.avg_resolution_hours).toFixed(1)) : 0.0;

      // Documented Fair Multi-Factor Scoring Model (0-100)
      // Fair Score = 0.40 × SLA Score + 0.30 × Resolution Velocity Score + 0.15 × Case Complexity Score + 0.15 × Workload Balance Score
      let slaScore = 100;
      let velocityScore = 100;
      let complexityScore = 100;
      let workloadBalanceScore = 100;
      let fairScore = 100;

      if (assigned > 0) {
        slaScore = Math.min(100, Math.max(0, slaCompliance));
        
        // Resolution Velocity Score based on avg resolution hours
        if (completed > 0) {
          if (avgHours <= 24) velocityScore = 100;
          else if (avgHours <= 48) velocityScore = 85;
          else if (avgHours <= 72) velocityScore = 70;
          else if (avgHours <= 120) velocityScore = 55;
          else velocityScore = 35;
        } else {
          velocityScore = 80;
        }

        // Case Complexity Score: handling critical & high cases responsibly
        const critRatio = (r.critical_count || 0) / assigned;
        const critPenalty = (r.critical_count > 0 && r.overdue_count > 0) ? Math.min(40, r.overdue_count * 15) : 0;
        complexityScore = Math.round(Math.min(100, Math.max(0, (85 + (critRatio * 15)) - critPenalty)));

        // Workload Balance Score: penalty for active overdue & reopens
        const overduePenalty = (r.overdue_count || 0) * 20;
        const reopenPenalty = (r.reopened_count || 0) * 15;
        workloadBalanceScore = Math.round(Math.min(100, Math.max(0, 100 - overduePenalty - reopenPenalty)));

        fairScore = Math.round(
          (0.40 * slaScore) +
          (0.30 * velocityScore) +
          (0.15 * complexityScore) +
          (0.15 * workloadBalanceScore)
        );
      }

      return {
        id: r.id,
        name: r.name,
        email: r.email,
        status: r.status,
        departmentId: r.department_id,
        departmentName: r.department_name || 'Unassigned',
        assignedTotal: assigned,
        activeWorkload: r.active_workload || 0,
        resolvedCount: r.resolved_count || 0,
        closedCount: r.closed_count || 0,
        completed,
        overdueCount: r.overdue_count || 0,
        criticalCount: r.critical_count || 0,
        reopenedCount: r.reopened_count || 0,
        resolutionRate,
        slaCompliance,
        reopenRate,
        avgResolutionHours: avgHours,
        fairScore: Math.min(100, Math.max(0, fairScore)),
        scoreBreakdown: {
          slaScore: parseFloat(slaScore.toFixed(1)),
          velocityScore: parseFloat(velocityScore.toFixed(1)),
          complexityScore: parseFloat(complexityScore.toFixed(1)),
          workloadBalanceScore: parseFloat(workloadBalanceScore.toFixed(1))
        }
      };
    });
  } catch (err) {
    logger.error('[OfficerAnalytics getOfficerPerformanceTable Error]', { err: err.message });
    return [];
  }
}

/**
 * 2. Officer Workspace & Individual Deep-Dive
 */
async function getOfficerWorkspace(officerId, options = {}) {
  const { timeframe = '30d', startDate, endDate } = options;
  if (!db._pool) return null;

  try {
    const userRes = await db.query(`
      SELECT u.id, u.name, u.email, u.role, u.status, u.created_at, d.name AS department_name
      FROM users u
      LEFT JOIN departments d ON d.id = u.department_id
      WHERE u.id = $1 AND u.role = 'officer'
    `, [officerId]);

    if (userRes.rows.length === 0) return null;
    const officer = userRes.rows[0];

    const { clause: dateClause, params } = buildDateCondition(timeframe, startDate, endDate, 'c', 'created_at');
    params.push(officerId);
    const officerParamIdx = params.length;

    // 1. Officer KPI breakdown
    const statsQuery = `
      SELECT
        COUNT(*)::int AS total_assigned,
        COUNT(CASE WHEN c.status IN ('assigned', 'accepted', 'in_progress') THEN 1 END)::int AS active_cases,
        COUNT(CASE WHEN c.status = 'resolved' THEN 1 END)::int AS resolved,
        COUNT(CASE WHEN c.status = 'closed' THEN 1 END)::int AS closed,
        COUNT(CASE WHEN c.status NOT IN ('resolved', 'closed', 'rejected') AND c.sla_due_at IS NOT NULL AND c.sla_due_at < now() THEN 1 END)::int AS overdue,
        COUNT(CASE WHEN c.priority = 'critical' THEN 1 END)::int AS critical,
        COUNT(CASE WHEN c.status = 'reopened' THEN 1 END)::int AS reopened,
        COUNT(CASE WHEN c.status IN ('resolved', 'closed') AND (c.sla_due_at IS NULL OR c.resolution_at <= c.sla_due_at) THEN 1 END)::int AS on_time_resolved,
        AVG(CASE 
          WHEN c.status IN ('resolved', 'closed') AND c.resolution_at IS NOT NULL 
          THEN EXTRACT(EPOCH FROM (c.resolution_at - c.created_at)) / 3600.0
          ELSE NULL 
        END) AS avg_resolution_hours
      FROM complaints c
      WHERE ${dateClause} AND c.officer_id = $${officerParamIdx};
    `;

    // 2. Officer Recent Cases
    const casesQuery = `
      SELECT
        c.id,
        c.title,
        c.category,
        c.priority,
        c.status,
        c.address,
        c.created_at,
        c.assigned_at,
        c.sla_due_at,
        c.resolution_at,
        CASE WHEN c.sla_due_at IS NOT NULL AND c.sla_due_at < now() AND c.status NOT IN ('resolved', 'closed', 'rejected') THEN true ELSE false END AS is_overdue
      FROM complaints c
      WHERE c.officer_id = $1
      ORDER BY c.created_at DESC
      LIMIT 25;
    `;

    // 3. Category Distribution for this Officer
    const catQuery = `
      SELECT
        COALESCE(c.category, 'other') AS category,
        COUNT(*)::int AS count,
        COUNT(CASE WHEN c.status IN ('resolved', 'closed') THEN 1 END)::int AS resolved
      FROM complaints c
      WHERE c.officer_id = $1
      GROUP BY COALESCE(c.category, 'other')
      ORDER BY count DESC;
    `;

    const [statsRes, casesRes, catRes] = await Promise.all([
      db.query(statsQuery, params),
      db.query(casesQuery, [officerId]),
      db.query(catQuery, [officerId])
    ]);

    const s = statsRes.rows[0] || {};
    const assigned = s.total_assigned || 0;
    const completed = (s.resolved || 0) + (s.closed || 0);
    const resolutionRate = assigned > 0 ? parseFloat(((completed / assigned) * 100).toFixed(1)) : 0.0;
    const slaCompliance = completed > 0 ? parseFloat(((s.on_time_resolved / completed) * 100).toFixed(1)) : 100.0;

    return {
      officer,
      stats: {
        totalAssigned: assigned,
        activeCases: s.active_cases || 0,
        resolved: s.resolved || 0,
        closed: s.closed || 0,
        completed,
        overdue: s.overdue || 0,
        critical: s.critical || 0,
        reopened: s.reopened || 0,
        resolutionRate,
        slaCompliance,
        avgResolutionHours: s.avg_resolution_hours != null ? parseFloat(Number(s.avg_resolution_hours).toFixed(1)) : 0.0
      },
      cases: casesRes.rows.map(c => ({
        id: c.id,
        ticketId: `CGN-${String(c.id).padStart(5, '0')}`,
        title: c.title,
        category: c.category,
        priority: c.priority,
        status: c.status,
        address: c.address,
        isOverdue: c.is_overdue,
        assignedAt: c.assigned_at,
        slaDueAt: c.sla_due_at,
        resolutionAt: c.resolution_at,
        createdAt: c.created_at
      })),
      categories: catRes.rows.map(c => ({
        category: c.category,
        count: c.count,
        resolved: c.resolved
      }))
    };
  } catch (err) {
    logger.error('[OfficerAnalytics getOfficerWorkspace Error]', { err: err.message });
    return null;
  }
}

module.exports = {
  getOfficerPerformanceTable,
  getOfficerWorkspace
};
