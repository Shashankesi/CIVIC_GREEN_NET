const db = require('../../config/db');
const logger = require('../../utils/logger');
const { buildDateCondition } = require('./governanceAnalytics');

/**
 * 1. SLA Intelligence Dashboard Data
 */
async function getSlaIntelligence(options = {}) {
  const { timeframe = '30d', startDate, endDate } = options;
  if (!db._pool) return getFallbackSla();

  try {
    const { clause: dateClause, params } = buildDateCondition(timeframe, startDate, endDate, 'c', 'created_at');

    // 1. SLA Status Counters
    const countersQuery = `
      SELECT
        COUNT(*)::int AS total_cases,
        COUNT(CASE WHEN c.status IN ('resolved', 'closed') AND (c.sla_due_at IS NULL OR c.resolution_at <= c.sla_due_at) THEN 1 END)::int AS resolved_on_time,
        COUNT(CASE WHEN c.status IN ('resolved', 'closed') AND c.sla_due_at IS NOT NULL AND c.resolution_at > c.sla_due_at THEN 1 END)::int AS resolved_breached,
        COUNT(CASE WHEN c.status NOT IN ('resolved', 'closed', 'rejected') AND c.sla_due_at IS NOT NULL AND c.sla_due_at < now() THEN 1 END)::int AS active_overdue,
        COUNT(CASE WHEN c.status NOT IN ('resolved', 'closed', 'rejected') AND c.sla_due_at IS NOT NULL AND c.sla_due_at <= now() + INTERVAL '24 hours' AND c.sla_due_at >= now() THEN 1 END)::int AS active_due_soon,
        COUNT(CASE WHEN c.status NOT IN ('resolved', 'closed', 'rejected') AND (c.sla_due_at IS NULL OR c.sla_due_at > now() + INTERVAL '24 hours') THEN 1 END)::int AS active_on_time,
        COUNT(CASE WHEN c.priority = 'critical' AND c.status NOT IN ('resolved', 'closed', 'rejected') AND c.sla_due_at IS NOT NULL AND c.sla_due_at < now() THEN 1 END)::int AS critical_sla_risk,
        AVG(CASE 
          WHEN c.status IN ('resolved', 'closed') AND c.resolution_at IS NOT NULL 
          THEN EXTRACT(EPOCH FROM (c.resolution_at - c.created_at)) / 3600.0
          ELSE NULL 
        END) AS avg_resolution_hours
      FROM complaints c
      WHERE ${dateClause};
    `;

    // 2. SLA Ranking by Department
    const deptRankingQuery = `
      SELECT
        d.id,
        d.name AS department_name,
        COUNT(c.id)::int AS total,
        COUNT(CASE WHEN c.status IN ('resolved', 'closed') THEN 1 END)::int AS resolved,
        COUNT(CASE WHEN c.status IN ('resolved', 'closed') AND (c.sla_due_at IS NULL OR c.resolution_at <= c.sla_due_at) THEN 1 END)::int AS on_time_resolved,
        COUNT(CASE WHEN c.status NOT IN ('resolved', 'closed', 'rejected') AND c.sla_due_at IS NOT NULL AND c.sla_due_at < now() THEN 1 END)::int AS overdue_active
      FROM departments d
      LEFT JOIN complaints c ON c.department_id = d.id AND ${dateClause}
      GROUP BY d.id, d.name
      ORDER BY total DESC;
    `;

    // 3. SLA Breaches by Category
    const categorySlaQuery = `
      SELECT
        COALESCE(c.category, 'other') AS category,
        COUNT(*)::int AS total,
        COUNT(CASE WHEN c.status NOT IN ('resolved', 'closed', 'rejected') AND c.sla_due_at IS NOT NULL AND c.sla_due_at < now() THEN 1 END)::int AS active_overdue,
        COUNT(CASE WHEN c.status IN ('resolved', 'closed') AND (c.sla_due_at IS NULL OR c.resolution_at <= c.sla_due_at) THEN 1 END)::int AS on_time,
        COUNT(CASE WHEN c.status IN ('resolved', 'closed') THEN 1 END)::int AS resolved
      FROM complaints c
      WHERE ${dateClause}
      GROUP BY COALESCE(c.category, 'other')
      ORDER BY active_overdue DESC, total DESC;
    `;

    // 4. Monthly SLA Trend (Past 6 Months)
    const monthlySlaQuery = `
      SELECT
        TO_CHAR(c.created_at, 'Mon YYYY') AS month_label,
        DATE_TRUNC('month', c.created_at) AS month_date,
        COUNT(*)::int AS total,
        COUNT(CASE WHEN c.status IN ('resolved', 'closed') AND (c.sla_due_at IS NULL OR c.resolution_at <= c.sla_due_at) THEN 1 END)::int AS on_time,
        COUNT(CASE WHEN c.status IN ('resolved', 'closed') THEN 1 END)::int AS resolved
      FROM complaints c
      WHERE c.created_at >= now() - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', c.created_at), TO_CHAR(c.created_at, 'Mon YYYY')
      ORDER BY month_date ASC;
    `;

    const [countersRes, deptRes, catRes, monthRes] = await Promise.all([
      db.query(countersQuery, params),
      db.query(deptRankingQuery, params),
      db.query(categorySlaQuery, params),
      db.query(monthlySlaQuery)
    ]);

    const countRow = countersRes.rows[0] || {};
    const resolvedTotal = (countRow.resolved_on_time || 0) + (countRow.resolved_breached || 0);
    const overallSlaRate = resolvedTotal > 0 ? parseFloat(((countRow.resolved_on_time / resolvedTotal) * 100).toFixed(1)) : 100.0;

    const departmentRankings = deptRes.rows.map(d => {
      const resolved = d.resolved || 0;
      const rate = resolved > 0 ? parseFloat(((d.on_time_resolved / resolved) * 100).toFixed(1)) : (d.total === 0 ? 100.0 : 0.0);
      return {
        id: d.id,
        name: d.department_name,
        total: d.total,
        resolved: d.resolved,
        onTimeResolved: d.on_time_resolved,
        overdueActive: d.overdue_active,
        slaCompliance: rate
      };
    }).sort((a, b) => b.slaCompliance - a.slaCompliance);

    return {
      summary: {
        totalCases: countRow.total_cases || 0,
        overallSlaCompliance: overallSlaRate,
        activeOnTime: countRow.active_on_time || 0,
        activeDueSoon: countRow.active_due_soon || 0,
        activeOverdue: countRow.active_overdue || 0,
        criticalSlaRisk: countRow.critical_sla_risk || 0,
        avgResolutionHours: countRow.avg_resolution_hours != null ? parseFloat(Number(countRow.avg_resolution_hours).toFixed(1)) : 0.0
      },
      departmentRankings,
      categoryBreaches: catRes.rows.map(c => ({
        category: c.category,
        total: c.total,
        activeOverdue: c.active_overdue,
        slaRate: c.resolved > 0 ? parseFloat(((c.on_time / c.resolved) * 100).toFixed(1)) : 100.0
      })),
      monthlyTrends: monthRes.rows.map(m => ({
        month: m.month_label,
        total: m.total,
        resolved: m.resolved,
        complianceRate: m.resolved > 0 ? parseFloat(((m.on_time / m.resolved) * 100).toFixed(1)) : 100.0
      }))
    };
  } catch (err) {
    logger.error('[SlaAnalytics getSlaIntelligence Error]', { err: err.message });
    return getFallbackSla();
  }
}

function getFallbackSla() {
  return {
    summary: {
      totalCases: 0,
      overallSlaCompliance: 100.0,
      activeOnTime: 0,
      activeDueSoon: 0,
      activeOverdue: 0,
      criticalSlaRisk: 0,
      avgResolutionHours: 0.0
    },
    departmentRankings: [],
    categoryBreaches: [],
    monthlyTrends: []
  };
}

module.exports = {
  getSlaIntelligence
};
