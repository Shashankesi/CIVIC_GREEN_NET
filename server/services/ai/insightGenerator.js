const db = require('../../config/db');
const logger = require('../../utils/logger');

/**
 * Department Workload & Performance Intelligence
 */
async function getDepartmentIntelligence() {
  if (!db._pool) return [];

  try {
    const query = `
      SELECT 
        d.id,
        d.name,
        COUNT(c.id)::int AS total_assigned,
        COUNT(CASE WHEN c.status = 'open' THEN 1 END)::int AS open_count,
        COUNT(CASE WHEN c.status = 'in_progress' THEN 1 END)::int AS in_progress_count,
        COUNT(CASE WHEN c.status = 'resolved' THEN 1 END)::int AS resolved_count,
        COUNT(CASE WHEN c.status = 'reopened' THEN 1 END)::int AS reopened_count,
        COUNT(CASE WHEN c.priority IN ('high', 'urgent', 'critical') AND c.status NOT IN ('resolved', 'closed') THEN 1 END)::int AS high_priority_count,
        COUNT(CASE WHEN c.sla_due_at IS NOT NULL AND c.sla_due_at < now() AND c.status NOT IN ('resolved', 'closed') THEN 1 END)::int AS overdue_count,
        ROUND(AVG(
          CASE 
            WHEN c.status = 'resolved' 
            THEN EXTRACT(EPOCH FROM (COALESCE(c.created_at, now()) - c.created_at)) / 3600
            ELSE NULL 
          END
        )::numeric, 1) AS avg_resolution_hours
      FROM departments d
      LEFT JOIN complaints c ON c.department_id = d.id
      GROUP BY d.id, d.name
      ORDER BY total_assigned DESC;
    `;

    const res = await db.query(query);

    return res.rows.map(r => {
      const total = r.total_assigned || 0;
      const overdue = r.overdue_count || 0;
      const resolved = r.resolved_count || 0;
      const slaCompliance = total > 0 ? Math.max(Math.round(((total - overdue) / total) * 100), 0) : 100;

      return {
        id: r.id,
        name: r.name,
        totalAssigned: total,
        open: r.open_count || 0,
        inProgress: r.in_progress_count || 0,
        resolved,
        reopened: r.reopened_count || 0,
        highPriority: r.high_priority_count || 0,
        overdue,
        slaCompliance,
        avgResolutionTimeHours: parseFloat(r.avg_resolution_hours || 48),
        status: overdue > 5 ? 'Needs Attention' : slaCompliance >= 85 ? 'Optimal' : 'Moderate'
      };
    });
  } catch (err) {
    logger.error('[Department Intelligence Error]', { err: err.message });
    return [];
  }
}

/**
 * Officer Workload Intelligence & AI Dispatch Recommendations
 */
async function getOfficerWorkloadIntelligence() {
  if (!db._pool) return [];

  try {
    const query = `
      SELECT 
        u.id,
        u.name,
        u.email,
        d.name AS department_name,
        COALESCE(u.availability, 'AVAILABLE') AS availability,
        COUNT(c.id)::int AS total_assigned,
        COUNT(CASE WHEN c.status IN ('assigned', 'in_progress', 'open') THEN 1 END)::int AS active_assignments,
        COUNT(CASE WHEN c.status = 'resolved' THEN 1 END)::int AS resolved_count,
        COUNT(CASE WHEN c.priority IN ('high', 'urgent', 'critical') AND c.status NOT IN ('resolved', 'closed') THEN 1 END)::int AS high_priority_count,
        COUNT(CASE WHEN c.sla_due_at IS NOT NULL AND c.sla_due_at < now() AND c.status NOT IN ('resolved', 'closed') THEN 1 END)::int AS overdue_count
      FROM users u
      LEFT JOIN departments d ON d.id = u.department_id
      LEFT JOIN complaints c ON c.officer_id = u.id
      WHERE u.role = 'officer'
      GROUP BY u.id, u.name, u.email, d.name, COALESCE(u.availability, 'AVAILABLE')
      ORDER BY active_assignments ASC;
    `;

    const res = await db.query(query);

    return res.rows.map((r, idx) => {
      const active = r.active_assignments || 0;
      const resolved = r.resolved_count || 0;
      const total = active + resolved;
      const overdue = r.overdue_count || 0;
      const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 100;
      const slaCompliance = active > 0 ? Math.max(Math.round(((active - overdue) / active) * 100), 0) : 100;

      let aiRecommendation = null;
      if (idx === 0 && (r.availability === 'available' || r.availability === 'active')) {
        aiRecommendation = 'Recommended for new incoming cases (lowest active load).';
      } else if (active > 8) {
        aiRecommendation = 'High case load: Avoid assigning new urgent items.';
      } else if (r.availability === 'on_leave' || r.availability === 'off_field') {
        aiRecommendation = 'Officer currently off-field or on leave.';
      }

      return {
        id: r.id,
        name: r.name,
        email: r.email,
        department: r.department_name || 'General Operations',
        availability: r.availability,
        totalAssigned: r.total_assigned,
        activeAssignments: active,
        resolvedCount: resolved,
        highPriorityCount: r.high_priority_count,
        overdueCount: overdue,
        resolutionRate,
        slaCompliance,
        aiRecommendation
      };
    });
  } catch (err) {
    logger.error('[Officer Workload Intelligence Error]', { err: err.message });
    return [];
  }
}

/**
 * Resolution Speed & Quality Insights
 */
async function getResolutionInsights() {
  if (!db._pool) return { summary: 'No data', categories: [] };

  try {
    const query = `
      SELECT 
        category,
        COUNT(*)::int AS total_resolved,
        ROUND(AVG(EXTRACT(EPOCH FROM (COALESCE(created_at, now()) - created_at)) / 3600)::numeric, 1) AS avg_hours,
        COUNT(CASE WHEN sla_due_at IS NOT NULL AND created_at > sla_due_at THEN 1 END)::int AS breached_sla_count
      FROM complaints
      WHERE status = 'resolved'
      GROUP BY category
      ORDER BY total_resolved DESC;
    `;

    const res = await db.query(query);

    const overallRes = await db.query(`
      SELECT 
        COUNT(*)::int AS total_complaints,
        COUNT(CASE WHEN status = 'resolved' THEN 1 END)::int AS total_resolved,
        COUNT(CASE WHEN status = 'reopened' THEN 1 END)::int AS total_reopened,
        COUNT(CASE WHEN sla_due_at IS NOT NULL AND sla_due_at < now() AND status NOT IN ('resolved', 'closed') THEN 1 END)::int AS current_overdue
      FROM complaints;
    `);

    const overview = overallRes.rows[0] || {};
    const total = overview.total_complaints || 0;
    const resolved = overview.total_resolved || 0;
    const reopened = overview.total_reopened || 0;

    return {
      totalComplaints: total,
      totalResolved: resolved,
      totalReopened: reopened,
      currentOverdue: overview.current_overdue || 0,
      reopenRatePercentage: resolved > 0 ? parseFloat(((reopened / resolved) * 100).toFixed(1)) : 0,
      overallSlaCompliancePercentage: total > 0 ? Math.round(((total - (overview.current_overdue || 0)) / total) * 100) : 100,
      categoryBreakdown: res.rows.map(r => ({
        category: r.category,
        totalResolved: r.total_resolved,
        avgResolutionHours: parseFloat(r.avg_hours || 24),
        breachedSlaCount: r.breached_sla_count,
        slaCompliance: r.total_resolved > 0 ? Math.round(((r.total_resolved - r.breached_sla_count) / r.total_resolved) * 100) : 100
      }))
    };
  } catch (err) {
    logger.error('[Resolution Insights Error]', { err: err.message });
    return { totalComplaints: 0, categoryBreakdown: [] };
  }
}

/**
 * Time-based Predictive & Trend Insights (7d, 30d, 90d, 6m)
 */
async function getPredictiveTrends(timeframe = '30d') {
  if (!db._pool) return { timeframe, status: 'Insufficient historical data', trends: [] };

  const daysMap = { '7d': 7, '30d': 30, '90d': 90, '6m': 180 };
  const days = daysMap[timeframe] || 30;

  try {
    const totalCheck = await db.query('SELECT COUNT(*)::int AS count FROM complaints WHERE created_at >= now() - ($1 || \' days\')::INTERVAL', [days]);
    const count = totalCheck.rows[0]?.count || 0;

    if (count < 3) {
      return {
        timeframe,
        status: 'Insufficient historical data',
        message: 'Insufficient historical complaint volume in this period to establish statistically significant trends.',
        hasSufficientData: false,
        trends: [],
        emergingHotspots: []
      };
    }

    const trendQuery = `
      WITH curr AS (
        SELECT category, COUNT(*)::int AS curr_count
        FROM complaints 
        WHERE created_at >= now() - ($1 || ' days')::INTERVAL
        GROUP BY category
      ),
      prev AS (
        SELECT category, COUNT(*)::int AS prev_count
        FROM complaints 
        WHERE created_at >= now() - ($2 || ' days')::INTERVAL
          AND created_at < now() - ($1 || ' days')::INTERVAL
        GROUP BY category
      )
      SELECT 
        c.category,
        c.curr_count,
        COALESCE(p.prev_count, 0) AS prev_count
      FROM curr c
      LEFT JOIN prev p ON p.category = c.category
      ORDER BY c.curr_count DESC;
    `;

    const res = await db.query(trendQuery, [days, days * 2]);

    const trends = res.rows.map(r => {
      const p = r.prev_count;
      const c = r.curr_count;
      let pct = 0;
      if (p > 0) {
        pct = Math.round(((c - p) / p) * 100);
      } else if (c > 1) {
        pct = 100;
      }
      return {
        category: r.category,
        currentCount: c,
        previousCount: p,
        changePercentage: pct,
        trendDirection: pct > 10 ? 'rising' : pct < -10 ? 'declining' : 'stable',
        indicator: pct > 10 ? `Potential increase (+${pct}%)` : pct < -10 ? `Decreasing (${pct}%)` : 'Stable volume'
      };
    });

    return {
      timeframe,
      hasSufficientData: true,
      status: 'Trend detected',
      totalPeriodComplaints: count,
      trends,
      risingCategories: trends.filter(t => t.trendDirection === 'rising').map(t => t.category),
      predictiveAdvisory: trends.some(t => t.trendDirection === 'rising')
        ? 'Emerging volume trend detected in rising categories. Recommend pre-allocating department field capacity.'
        : 'Complaint distribution remains within baseline municipal parameters.'
    };
  } catch (err) {
    logger.error('[Predictive Trends Error]', { err: err.message });
    return { timeframe, status: 'Insufficient historical data', trends: [] };
  }
}

module.exports = {
  getDepartmentIntelligence,
  getOfficerWorkloadIntelligence,
  getResolutionInsights,
  getPredictiveTrends
};
