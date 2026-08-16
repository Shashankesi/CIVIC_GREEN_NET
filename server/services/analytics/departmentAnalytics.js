const db = require('../../config/db');
const logger = require('../../utils/logger');
const { buildDateCondition } = require('./governanceAnalytics');

/**
 * 1. Department Performance Overview Table
 */
async function getDepartmentPerformanceTable(options = {}) {
  const { timeframe = '30d', startDate, endDate } = options;
  if (!db._pool) return [];

  try {
    const { clause: dateClause, params } = buildDateCondition(timeframe, startDate, endDate, 'c', 'created_at');

    const query = `
      SELECT
        d.id,
        d.name,
        COUNT(c.id)::int AS total,
        COUNT(CASE WHEN c.status = 'open' THEN 1 END)::int AS open,
        COUNT(CASE WHEN c.status IN ('assigned', 'accepted', 'in_progress') THEN 1 END)::int AS in_progress,
        COUNT(CASE WHEN c.status = 'resolved' THEN 1 END)::int AS resolved,
        COUNT(CASE WHEN c.status = 'closed' THEN 1 END)::int AS closed,
        COUNT(CASE WHEN c.status NOT IN ('resolved', 'closed', 'rejected') AND c.sla_due_at IS NOT NULL AND c.sla_due_at < now() THEN 1 END)::int AS overdue,
        COUNT(CASE WHEN c.priority = 'critical' AND c.status NOT IN ('resolved', 'closed', 'rejected') THEN 1 END)::int AS critical,
        COUNT(CASE WHEN c.status = 'reopened' THEN 1 END)::int AS reopened,
        AVG(CASE 
          WHEN c.status IN ('resolved', 'closed') AND c.resolution_at IS NOT NULL 
          THEN EXTRACT(EPOCH FROM (c.resolution_at - c.created_at)) / 3600.0
          ELSE NULL 
        END) AS avg_resolution_hours,
        COUNT(CASE WHEN c.status IN ('resolved', 'closed') AND (c.sla_due_at IS NULL OR c.resolution_at <= c.sla_due_at) THEN 1 END)::int AS on_time_resolved,
        COALESCE((SELECT COUNT(*)::int FROM users u WHERE u.department_id = d.id AND u.role = 'officer' AND u.status = 'active'), 0) AS active_officers
      FROM departments d
      LEFT JOIN complaints c ON c.department_id = d.id AND ${dateClause}
      GROUP BY d.id, d.name
      ORDER BY total DESC;
    `;

    const res = await db.query(query, params);

    return res.rows.map(r => {
      const total = r.total || 0;
      const completed = (r.resolved || 0) + (r.closed || 0);
      const resolutionRate = total > 0 ? parseFloat(((completed / total) * 100).toFixed(1)) : 0.0;
      const slaCompliance = completed > 0 ? parseFloat(((r.on_time_resolved / completed) * 100).toFixed(1)) : 100.0;
      const reopenRate = completed > 0 ? parseFloat(((r.reopened / completed) * 100).toFixed(1)) : 0.0;
      const avgHours = r.avg_resolution_hours != null ? parseFloat(Number(r.avg_resolution_hours).toFixed(1)) : 0.0;

      return {
        id: r.id,
        name: r.name,
        total,
        open: r.open || 0,
        inProgress: r.in_progress || 0,
        resolved: r.resolved || 0,
        closed: r.closed || 0,
        completed,
        overdue: r.overdue || 0,
        critical: r.critical || 0,
        reopened: r.reopened || 0,
        activeOfficers: r.active_officers,
        resolutionRate,
        slaCompliance,
        reopenRate,
        avgResolutionHours: avgHours
      };
    });
  } catch (err) {
    logger.error('[DepartmentAnalytics getDepartmentPerformanceTable Error]', { err: err.message });
    return [];
  }
}

/**
 * 2. Department Deep-Dive Workspace
 */
async function getDepartmentWorkspace(departmentId, options = {}) {
  const { timeframe = '30d', startDate, endDate } = options;
  if (!db._pool) return null;

  try {
    const deptRes = await db.query(`SELECT id, name, description FROM departments WHERE id = $1`, [departmentId]);
    if (deptRes.rows.length === 0) return null;
    const department = deptRes.rows[0];

    const { clause: dateClause, params } = buildDateCondition(timeframe, startDate, endDate, 'c', 'created_at');
    params.push(departmentId);
    const deptParamIdx = params.length;

    // 1. Department Overview Stats
    const statsQuery = `
      SELECT
        COUNT(*)::int AS total,
        COUNT(CASE WHEN c.status = 'open' THEN 1 END)::int AS open,
        COUNT(CASE WHEN c.status IN ('assigned', 'accepted', 'in_progress') THEN 1 END)::int AS in_progress,
        COUNT(CASE WHEN c.status = 'resolved' THEN 1 END)::int AS resolved,
        COUNT(CASE WHEN c.status = 'closed' THEN 1 END)::int AS closed,
        COUNT(CASE WHEN c.status NOT IN ('resolved', 'closed', 'rejected') AND c.sla_due_at IS NOT NULL AND c.sla_due_at < now() THEN 1 END)::int AS overdue,
        COUNT(CASE WHEN c.priority = 'critical' AND c.status NOT IN ('resolved', 'closed', 'rejected') THEN 1 END)::int AS critical,
        AVG(CASE 
          WHEN c.status IN ('resolved', 'closed') AND c.resolution_at IS NOT NULL 
          THEN EXTRACT(EPOCH FROM (c.resolution_at - c.created_at)) / 3600.0
          ELSE NULL 
        END) AS avg_resolution_hours,
        COUNT(CASE WHEN c.status IN ('resolved', 'closed') AND (c.sla_due_at IS NULL OR c.resolution_at <= c.sla_due_at) THEN 1 END)::int AS on_time_resolved
      FROM complaints c
      WHERE ${dateClause} AND c.department_id = $${deptParamIdx};
    `;

    // 2. Department Officers
    const officersQuery = `
      SELECT
        u.id,
        u.name,
        u.email,
        u.status,
        COUNT(c.id)::int AS assigned_total,
        COUNT(CASE WHEN c.status IN ('assigned', 'accepted', 'in_progress') THEN 1 END)::int AS active_workload,
        COUNT(CASE WHEN c.status IN ('resolved', 'closed') THEN 1 END)::int AS resolved_count,
        COUNT(CASE WHEN c.status NOT IN ('resolved', 'closed', 'rejected') AND c.sla_due_at IS NOT NULL AND c.sla_due_at < now() THEN 1 END)::int AS overdue_count
      FROM users u
      LEFT JOIN complaints c ON c.officer_id = u.id AND ${dateClause}
      WHERE u.department_id = $1 AND u.role = 'officer'
      GROUP BY u.id, u.name, u.email, u.status
      ORDER BY active_workload DESC;
    `;

    // 3. Category Breakdown inside Department
    const categoryQuery = `
      SELECT
        COALESCE(c.category, 'other') AS category,
        COUNT(*)::int AS total,
        COUNT(CASE WHEN c.status IN ('resolved', 'closed') THEN 1 END)::int AS resolved,
        COUNT(CASE WHEN c.status NOT IN ('resolved', 'closed', 'rejected') AND c.sla_due_at IS NOT NULL AND c.sla_due_at < now() THEN 1 END)::int AS overdue
      FROM complaints c
      WHERE ${dateClause} AND c.department_id = $${deptParamIdx}
      GROUP BY COALESCE(c.category, 'other')
      ORDER BY total DESC;
    `;

    // 4. Recent Department Complaints
    const recentQuery = `
      SELECT
        c.id,
        c.title,
        c.category,
        c.priority,
        c.status,
        c.address,
        c.created_at,
        c.sla_due_at,
        u.name AS officer_name
      FROM complaints c
      LEFT JOIN users u ON u.id = c.officer_id
      WHERE c.department_id = $1
      ORDER BY c.created_at DESC
      LIMIT 20;
    `;

    const [statsRes, officersRes, catRes, recentRes] = await Promise.all([
      db.query(statsQuery, params),
      db.query(officersQuery, [departmentId]),
      db.query(categoryQuery, params),
      db.query(recentQuery, [departmentId])
    ]);

    const s = statsRes.rows[0] || {};
    const total = s.total || 0;
    const completed = (s.resolved || 0) + (s.closed || 0);
    const resolutionRate = total > 0 ? parseFloat(((completed / total) * 100).toFixed(1)) : 0.0;
    const slaCompliance = completed > 0 ? parseFloat(((s.on_time_resolved / completed) * 100).toFixed(1)) : 100.0;

    return {
      department,
      stats: {
        total,
        open: s.open || 0,
        inProgress: s.in_progress || 0,
        resolved: s.resolved || 0,
        closed: s.closed || 0,
        completed,
        overdue: s.overdue || 0,
        critical: s.critical || 0,
        resolutionRate,
        slaCompliance,
        avgResolutionHours: s.avg_resolution_hours != null ? parseFloat(Number(s.avg_resolution_hours).toFixed(1)) : 0.0
      },
      officers: officersRes.rows.map(o => ({
        id: o.id,
        name: o.name,
        email: o.email,
        status: o.status,
        assignedTotal: o.assigned_total,
        activeWorkload: o.active_workload,
        resolvedCount: o.resolved_count,
        overdueCount: o.overdue_count,
        resolutionRate: o.assigned_total > 0 ? parseFloat(((o.resolved_count / o.assigned_total) * 100).toFixed(1)) : 0.0
      })),
      categories: catRes.rows.map(c => ({
        category: c.category,
        total: c.total,
        resolved: c.resolved,
        overdue: c.overdue,
        resolutionRate: c.total > 0 ? parseFloat(((c.resolved / c.total) * 100).toFixed(1)) : 0.0
      })),
      recentComplaints: recentRes.rows.map(r => ({
        id: r.id,
        ticketId: `CGN-${String(r.id).padStart(5, '0')}`,
        title: r.title,
        category: r.category,
        priority: r.priority,
        status: r.status,
        address: r.address || 'Municipal Area',
        officerName: r.officer_name || 'Unassigned',
        slaDueAt: r.sla_due_at,
        createdAt: r.created_at
      }))
    };
  } catch (err) {
    logger.error('[DepartmentAnalytics getDepartmentWorkspace Error]', { err: err.message });
    return null;
  }
}

module.exports = {
  getDepartmentPerformanceTable,
  getDepartmentWorkspace
};
