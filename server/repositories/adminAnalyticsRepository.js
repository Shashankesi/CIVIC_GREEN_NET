const db = require('../config/db');

async function analyticsOverview(startDate, endDate) {
  const qComplaints = `
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status = 'open')::int AS open,
      COUNT(*) FILTER (WHERE status = 'in_progress')::int AS in_progress,
      COUNT(*) FILTER (WHERE status = 'resolved')::int AS resolved,
      COUNT(*) FILTER (WHERE status = 'closed')::int AS closed,
      COUNT(*) FILTER (WHERE status = 'rejected')::int AS rejected,
      COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
      COUNT(*) FILTER (WHERE priority = 'critical' AND status NOT IN ('resolved', 'rejected', 'closed'))::int AS critical,
      COUNT(*) FILTER (WHERE priority = 'high' AND status NOT IN ('resolved', 'rejected', 'closed'))::int AS high_priority,
      COUNT(*) FILTER (WHERE officer_id IS NULL)::int AS unassigned,
      COUNT(*) FILTER (
        WHERE status NOT IN ('resolved', 'rejected', 'closed')
          AND sla_due_at IS NOT NULL
          AND sla_due_at > now()
          AND sla_due_at <= now() + INTERVAL '24 hours'
      )::int AS due_soon,
      COUNT(*) FILTER (
        WHERE status NOT IN ('resolved', 'rejected', 'closed')
          AND (
            (sla_due_at IS NOT NULL AND sla_due_at < now()) OR
            (priority = 'critical' AND created_at < now() - interval '4 hours') OR
            (priority = 'high' AND created_at < now() - interval '12 hours') OR
            (priority = 'medium' AND created_at < now() - interval '48 hours') OR
            (priority = 'low' AND created_at < now() - interval '72 hours') OR
            ((priority IS NULL OR priority = '') AND created_at < now() - interval '48 hours')
          )
      )::int AS overdue,
      COALESCE(
        AVG(CASE WHEN status = 'resolved' THEN EXTRACT(EPOCH FROM (now() - created_at)) / 3600.0 END), 
        0
      ) AS avg_resolution_hours
    FROM complaints
    WHERE ($1::timestamp IS NULL OR created_at >= $1) AND ($2::timestamp IS NULL OR created_at <= $2)
  `;

  const qOfficers = `
    SELECT
      COUNT(*) FILTER (WHERE role = 'officer' AND status = 'pending')::int AS pending_approvals,
      COUNT(*) FILTER (WHERE role = 'officer' AND status IN ('active', 'approved'))::int AS active_officers
    FROM users
  `;

  const [complaintsRes, officersRes] = await Promise.all([
    db.query(qComplaints, [startDate || null, endDate || null]),
    db.query(qOfficers)
  ]);

  const row = complaintsRes.rows[0] || {};
  const offRow = officersRes.rows[0] || {};
  const total = row.total || 0;
  const completed = (row.resolved || 0) + (row.closed || 0);
  const resolutionRate = total > 0 ? (Math.round((completed / total) * 10000) / 100) : 0;

  return {
    total,
    open: row.open || 0,
    inProgress: row.in_progress || 0,
    resolved: row.resolved || 0,
    closed: row.closed || 0,
    rejected: row.rejected || 0,
    pending: row.pending || 0,
    critical: row.critical || 0,
    highPriority: row.high_priority || 0,
    unassigned: row.unassigned || 0,
    dueSoon: row.due_soon || 0,
    overdue: row.overdue || 0,
    pendingApprovals: offRow.pending_approvals || 0,
    activeOfficers: offRow.active_officers || 0,
    resolutionRate,
    avgResolutionHours: Math.round(parseFloat(row.avg_resolution_hours || 0) * 10) / 10
  };
}

async function usersOverview() {
  const q = `
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE role = 'citizen')::int AS citizen,
      COUNT(*) FILTER (WHERE role = 'officer')::int AS officer,
      COUNT(*) FILTER (WHERE role = 'admin')::int AS admin
    FROM users
  `;
  const r = await db.query(q);
  const row = r.rows[0] || {};
  return {
    total: row.total || 0,
    citizen: row.citizen || 0,
    officer: row.officer || 0,
    admin: row.admin || 0
  };
}

async function categoryDistribution(startDate, endDate) {
  const q = `
    SELECT COALESCE(category, 'general') AS category, COUNT(*)::int AS count 
    FROM complaints 
    WHERE ($1::timestamp IS NULL OR created_at >= $1) AND ($2::timestamp IS NULL OR created_at <= $2)
    GROUP BY category 
    ORDER BY count DESC
  `;
  const r = await db.query(q, [startDate || null, endDate || null]);
  return r.rows;
}

async function priorityDistribution(startDate, endDate) {
  const q = `
    SELECT COALESCE(priority, 'low') AS priority, COUNT(*)::int AS count 
    FROM complaints 
    WHERE ($1::timestamp IS NULL OR created_at >= $1) AND ($2::timestamp IS NULL OR created_at <= $2)
    GROUP BY priority 
    ORDER BY count DESC
  `;
  const r = await db.query(q, [startDate || null, endDate || null]);
  return r.rows;
}

async function monthlyTrend(months = 6, startDate, endDate) {
  const q = `
    SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS month, COUNT(*)::int AS count
    FROM complaints
    WHERE ($1::timestamp IS NULL OR created_at >= $1) 
      AND ($2::timestamp IS NULL OR created_at <= $2)
      AND ($3::int IS NULL OR created_at > now() - ($3::int || ' months')::interval)
    GROUP BY month 
    ORDER BY month
  `;
  const r = await db.query(q, [
    startDate || null,
    endDate || null,
    startDate ? null : months
  ]);
  return r.rows;
}

async function departmentPerformance(startDate, endDate) {
  const q = `
    SELECT 
      d.id, 
      d.name,
      COUNT(c.id)::int AS complaint_count,
      COUNT(c.id) FILTER (WHERE c.status = 'pending')::int AS pending_count,
      COUNT(c.id) FILTER (WHERE c.status = 'in_progress')::int AS in_progress_count,
      COUNT(c.id) FILTER (WHERE c.status = 'resolved')::int AS resolved_count,
      COUNT(c.id) FILTER (
        WHERE c.status NOT IN ('resolved', 'rejected', 'closed')
          AND (
            (c.sla_due_at IS NOT NULL AND c.sla_due_at < now()) OR
            (c.priority = 'critical' AND c.created_at < now() - interval '4 hours') OR
            (c.priority = 'high' AND c.created_at < now() - interval '12 hours') OR
            (c.priority = 'medium' AND c.created_at < now() - interval '48 hours') OR
            (c.priority = 'low' AND c.created_at < now() - interval '72 hours') OR
            ((c.priority IS NULL OR c.priority = '') AND c.created_at < now() - interval '48 hours')
          )
      )::int AS overdue_count,
      CASE 
        WHEN COUNT(c.id) = 0 THEN 0
        ELSE ROUND(100.0 * COUNT(c.id) FILTER (WHERE c.status IN ('resolved', 'closed')) / COUNT(c.id), 2)
      END AS resolution_rate
    FROM departments d
    LEFT JOIN complaints c ON c.department_id = d.id 
      AND ($1::timestamp IS NULL OR c.created_at >= $1) 
      AND ($2::timestamp IS NULL OR c.created_at <= $2)
    GROUP BY d.id, d.name
    ORDER BY complaint_count DESC
  `;
  const r = await db.query(q, [startDate || null, endDate || null]);
  return r.rows;
}

async function officerPerformance(startDate, endDate) {
  const q = `
    SELECT 
      u.id, 
      u.name,
      COUNT(c.id)::int AS assigned_count,
      COUNT(c.id) FILTER (WHERE c.status = 'in_progress')::int AS in_progress_count,
      COUNT(c.id) FILTER (WHERE c.status IN ('resolved', 'closed'))::int AS resolved_count,
      CASE 
        WHEN COUNT(c.id) = 0 THEN 0
        ELSE ROUND(100.0 * COUNT(c.id) FILTER (WHERE c.status IN ('resolved', 'closed')) / COUNT(c.id), 2)
      END AS resolution_rate
    FROM users u
    LEFT JOIN complaints c ON c.officer_id = u.id 
      AND ($1::timestamp IS NULL OR c.created_at >= $1) 
      AND ($2::timestamp IS NULL OR c.created_at <= $2)
    WHERE u.role = 'officer'
    GROUP BY u.id, u.name
    ORDER BY assigned_count DESC
  `;
  const r = await db.query(q, [startDate || null, endDate || null]);
  return r.rows;
}

async function resolutionTrend(startDate, endDate) {
  const q = `
    SELECT date_trunc('day', created_at)::date AS day,
      COUNT(*) FILTER (WHERE status = 'resolved')::int AS resolved,
      COUNT(*)::int AS created
    FROM complaints
    WHERE ($1::timestamp IS NULL OR created_at >= $1)
      AND ($2::timestamp IS NULL OR created_at <= $2)
      AND ($1::timestamp IS NOT NULL OR created_at > now() - interval '30 days')
    GROUP BY date_trunc('day', created_at)::date
    ORDER BY day
  `;
  const r = await db.query(q, [startDate || null, endDate || null]);
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
