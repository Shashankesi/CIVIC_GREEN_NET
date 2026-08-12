const db = require('../config/db');

const REAL_USER_WHERE = `
  COALESCE(email, '') NOT ILIKE '%@example.com'
  AND COALESCE(email, '') NOT ILIKE 'it_test_%'
  AND COALESCE(email, '') NOT ILIKE 'it_officer_%'
`;

async function analyticsOverview() {
  const q = `
    SELECT
      COUNT(*)::int AS total,
      COALESCE((SELECT COUNT(*)::int FROM complaints WHERE status='open'), 0) AS open,
      COALESCE((SELECT COUNT(*)::int FROM complaints WHERE status='in_progress'), 0) AS in_progress,
      COALESCE((SELECT COUNT(*)::int FROM complaints WHERE status='resolved'), 0) AS resolved,
      COALESCE((SELECT COUNT(*)::int FROM complaints WHERE status='rejected'), 0) AS rejected,
      COALESCE((SELECT COUNT(*)::int FROM complaints WHERE status='pending'), 0) AS pending,
      COALESCE((SELECT COUNT(*)::int FROM complaints WHERE priority='critical' AND status NOT IN ('resolved', 'rejected', 'closed')), 0) AS critical,
      COALESCE((
        SELECT COUNT(*)::int FROM complaints
        WHERE status NOT IN ('resolved', 'rejected', 'closed')
          AND (
            (priority = 'critical' AND created_at < now() - interval '4 hours') OR
            (priority = 'high' AND created_at < now() - interval '12 hours') OR
            (priority = 'medium' AND created_at < now() - interval '48 hours') OR
            (priority = 'low' AND created_at < now() - interval '72 hours') OR
            ((priority IS NULL OR priority = '') AND created_at < now() - interval '48 hours')
          )
      ), 0) AS overdue,
      COALESCE((SELECT COUNT(*)::int FROM users WHERE role='officer' AND status='pending'), 0) AS pending_approvals,
      COALESCE((SELECT COUNT(*)::int FROM users WHERE role='officer' AND status='active'), 0) AS active_officers,
      CASE WHEN COUNT(*)=0 THEN 0
           ELSE ROUND(100.0 * (SELECT COUNT(*)::int FROM complaints WHERE status='resolved') / COUNT(*), 2)
      END AS resolution_rate,
      COALESCE((
        SELECT AVG(EXTRACT(EPOCH FROM (now() - created_at)) / 3600.0)
        FROM complaints
        WHERE status='resolved'
      ), 0) AS avg_resolution_hours
    FROM complaints
  `;
  const r = await db.query(q);
  const row = r.rows[0] || {};
  return {
    total: row.total || 0,
    open: row.open || 0,
    inProgress: row.in_progress || 0,
    resolved: row.resolved || 0,
    rejected: row.rejected || 0,
    pending: row.pending || 0,
    critical: row.critical || 0,
    overdue: row.overdue || 0,
    pendingApprovals: row.pending_approvals || 0,
    activeOfficers: row.active_officers || 0,
    resolutionRate: row.resolution_rate || 0,
    avgResolutionHours: Math.round((row.avg_resolution_hours || 0) * 10) / 10
  };
}

async function usersOverview() {
  const q = `
    SELECT
      COUNT(*)::int AS total,
      SUM(CASE WHEN role='citizen' THEN 1 ELSE 0 END)::int AS citizen,
      SUM(CASE WHEN role='officer' THEN 1 ELSE 0 END)::int AS officer,
      SUM(CASE WHEN role='admin' THEN 1 ELSE 0 END)::int AS admin
    FROM users
    WHERE ${REAL_USER_WHERE}
  `;
  const r = await db.query(q);
  const row = r.rows[0] || {};
  return { total: row.total || 0, citizen: row.citizen || 0, officer: row.officer || 0, admin: row.admin || 0 };
}

async function categoryDistribution() {
  const q = 'SELECT category, COUNT(*)::int AS count FROM complaints GROUP BY category ORDER BY count DESC';
  const r = await db.query(q);
  return r.rows;
}

async function priorityDistribution() {
  const q = 'SELECT priority, COUNT(*)::int AS count FROM complaints GROUP BY priority ORDER BY count DESC';
  const r = await db.query(q);
  return r.rows;
}

async function monthlyTrend(months = 6) {
  const q = `SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS month, COUNT(*)::int AS count
    FROM complaints
    WHERE created_at > now() - ($1::int || ' months')::interval
    GROUP BY month ORDER BY month`;
  const r = await db.query(q, [months]);
  return r.rows;
}

async function departmentPerformance() {
  const q = `
    SELECT d.id, d.name,
      COUNT(c.id)::int AS complaint_count,
      COALESCE((SELECT COUNT(*)::int FROM complaints cc WHERE cc.department_id=d.id AND cc.status='pending'),0) AS pending_count,
      COALESCE((SELECT COUNT(*)::int FROM complaints cc WHERE cc.department_id=d.id AND cc.status='in_progress'),0) AS in_progress_count,
      COALESCE((SELECT COUNT(*)::int FROM complaints cc WHERE cc.department_id=d.id AND cc.status='resolved'),0) AS resolved_count,
      CASE WHEN COUNT(c.id)=0 THEN 0
           ELSE ROUND(100.0 * COALESCE((SELECT COUNT(*)::int FROM complaints cc WHERE cc.department_id=d.id AND cc.status='resolved'), 0) / COUNT(c.id), 2)
      END AS resolution_rate
    FROM departments d
    LEFT JOIN complaints c ON c.department_id = d.id
    GROUP BY d.id, d.name
    ORDER BY complaint_count DESC
  `;
  const r = await db.query(q);
  return r.rows;
}

async function officerPerformance() {
  const q = `
    SELECT u.id, u.name,
      COUNT(c.id)::int AS assigned_count,
      COALESCE((SELECT COUNT(*)::int FROM complaints cc WHERE cc.officer_id=u.id AND cc.status='in_progress'),0) AS in_progress_count,
      COALESCE((SELECT COUNT(*)::int FROM complaints cc WHERE cc.officer_id=u.id AND cc.status='resolved'),0) AS resolved_count,
      CASE WHEN COUNT(c.id)=0 THEN 0
           ELSE ROUND(100.0 * COALESCE((SELECT COUNT(*)::int FROM complaints cc WHERE cc.officer_id=u.id AND cc.status='resolved'), 0) / COUNT(c.id), 2)
      END AS resolution_rate
    FROM users u
    LEFT JOIN complaints c ON c.officer_id = u.id
    WHERE u.role='officer'
    GROUP BY u.id, u.name
    ORDER BY assigned_count DESC
  `;
  const r = await db.query(q);
  return r.rows;
}

async function resolutionTrend() {
  const q = `
    SELECT date_trunc('day', created_at)::date AS day,
      COALESCE((SELECT COUNT(*)::int FROM complaints cc WHERE cc.created_at >= date_trunc('day', created_at) AND cc.created_at < date_trunc('day', created_at) + interval '1 day' AND cc.status='resolved'), 0) AS resolved,
      COUNT(*)::int AS created
    FROM complaints
    WHERE created_at > now() - interval '30 days'
    GROUP BY day ORDER BY day
  `;
  const r = await db.query(q);
  return r.rows;
}

module.exports = {
  analyticsOverview,
  usersOverview,
  categoryDistribution,
  priorityDistribution,
  monthlyTrend,
  departmentPerformance,
  officerPerformance,
  resolutionTrend
};
