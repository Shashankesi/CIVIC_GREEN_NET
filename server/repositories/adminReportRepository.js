const db = require('../config/db');

const ALLOWED_SORT = new Set(['created_at', 'priority', 'status', 'category', 'id']);

function buildFilters(opts) {
  const conditions = [];
  const vals = [];
  let idx = 1;
  if (opts.dateFrom) { conditions.push(`c.created_at >= $${idx++}`); vals.push(opts.dateFrom); }
  if (opts.dateTo) { conditions.push(`c.created_at <= $${idx++}`); vals.push(opts.dateTo); }
  if (opts.category) { conditions.push(`c.category=$${idx++}`); vals.push(opts.category); }
  if (opts.departmentId) { conditions.push(`c.department_id=$${idx++}`); vals.push(opts.departmentId); }
  if (opts.officerId) { conditions.push(`c.officer_id=$${idx++}`); vals.push(opts.officerId); }
  if (opts.status) { conditions.push(`c.status=$${idx++}`); vals.push(opts.status); }
  if (opts.priority) { conditions.push(`c.priority=$${idx++}`); vals.push(opts.priority); }
  return { conditions, vals, idx };
}

async function reportSummary(opts = {}) {
  const { conditions, vals } = buildFilters(opts);
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const q = `
    SELECT
      COUNT(*)::int AS total,
      SUM(CASE WHEN c.status IN ('open', 'submitted') THEN 1 ELSE 0 END)::int AS open,
      SUM(CASE WHEN c.status = 'in_progress' THEN 1 ELSE 0 END)::int AS in_progress,
      SUM(CASE WHEN c.status = 'resolved' THEN 1 ELSE 0 END)::int AS resolved,
      SUM(CASE WHEN c.status = 'closed' THEN 1 ELSE 0 END)::int AS closed,
      SUM(CASE WHEN c.status IN ('resolved', 'closed') THEN 1 ELSE 0 END)::int AS completed,
      SUM(CASE WHEN c.status = 'rejected' THEN 1 ELSE 0 END)::int AS rejected,
      SUM(CASE WHEN c.status = 'pending' THEN 1 ELSE 0 END)::int AS pending,
      CASE
        WHEN COUNT(*) = 0 THEN 0
        ELSE ROUND(100.0 * SUM(CASE WHEN c.status IN ('resolved', 'closed') THEN 1 ELSE 0 END) / COUNT(*), 2)
      END AS resolution_rate,
      COALESCE(
        AVG(CASE WHEN c.status IN ('resolved', 'closed') THEN EXTRACT(EPOCH FROM (now() - c.created_at)) / 3600.0 ELSE NULL END),
        0
      ) AS avg_resolution_hours
    FROM complaints c ${where}
  `;
  const r = await db.query(q, vals);
  const row = r.rows[0] || {};
  const completed = row.completed || (row.resolved || 0) + (row.closed || 0)
  return {
    total: row.total || 0,
    open: (row.open || 0) + (row.pending || 0),
    inProgress: row.in_progress || 0,
    resolved: completed,
    closed: row.closed || 0,
    rejected: row.rejected || 0,
    pending: row.pending || 0,
    resolutionRate: row.resolution_rate || 0,
    avgResolutionHours: Math.round((row.avg_resolution_hours || 0) * 10) / 10
  };
}

async function reportComplaints(opts = {}) {
  let { conditions, vals, idx } = buildFilters(opts);
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const page = opts.page || 1;
  const limit = opts.limit || 20;
  const offset = (page - 1) * limit;
  const sortBy = ALLOWED_SORT.has(opts.sortBy) ? opts.sortBy : 'created_at';
  const sortDir = opts.sortDir && opts.sortDir.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  const countQ = `SELECT COUNT(*)::int AS total FROM complaints c ${where}`;
  const countR = await db.query(countQ, vals);
  const total = countR.rows[0] ? countR.rows[0].total : 0;

  const qStr = `
    SELECT c.id, c.title, c.summary, c.category, c.priority, c.status, c.address, c.created_at,
      u.name AS citizen_name, cn.name AS officer_name, d.name AS department_name
    FROM complaints c
    LEFT JOIN users u ON u.id = c.user_id
    LEFT JOIN users cn ON cn.id = c.officer_id
    LEFT JOIN departments d ON d.id = c.department_id
    ${where}
    ORDER BY c.${sortBy} ${sortDir}
    LIMIT $${idx++} OFFSET $${idx++}
  `;
  vals.push(limit, offset);
  const r = await db.query(qStr, vals);
  return { items: r.rows, page, limit, total };
}

async function exportComplaints(opts = {}) {
  const { conditions, vals } = buildFilters(opts);
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const q = `
    SELECT c.id, c.title, c.summary, c.category, c.priority, c.status, c.address, c.created_at,
      u.name AS citizen_name, cn.name AS officer_name, d.name AS department_name
    FROM complaints c
    LEFT JOIN users u ON u.id = c.user_id
    LEFT JOIN users cn ON cn.id = c.officer_id
    LEFT JOIN departments d ON d.id = c.department_id
    ${where}
    ORDER BY c.created_at DESC
  `;
  const r = await db.query(q, vals);
  return r.rows;
}

module.exports = { reportSummary, reportComplaints, exportComplaints };
