const db = require('../config/db');

const ALLOWED_SORT = new Set(['created_at', 'priority', 'status', 'category', 'id', 'title']);

/**
 * Build WHERE conditions from filter options.
 * Returns { conditions, vals, idx } for safe parameterised queries.
 */
function buildFilters(opts, startIdx = 1) {
  const conditions = [];
  const vals = [];
  let idx = startIdx;

  if (opts.search) {
    conditions.push(`(c.title ILIKE $${idx} OR c.description ILIKE $${idx} OR c.summary ILIKE $${idx})`);
    vals.push(`%${opts.search}%`);
    idx++;
  }
  if (opts.status) { conditions.push(`c.status = $${idx++}`); vals.push(opts.status); }
  if (opts.priority) { conditions.push(`c.priority = $${idx++}`); vals.push(opts.priority); }
  if (opts.category) { conditions.push(`c.category = $${idx++}`); vals.push(opts.category); }
  if (opts.departmentId) { conditions.push(`c.department_id = $${idx++}`); vals.push(opts.departmentId); }
  if (opts.officerId) { conditions.push(`c.officer_id = $${idx++}`); vals.push(opts.officerId); }
  if (opts.userId) { conditions.push(`c.user_id = $${idx++}`); vals.push(opts.userId); }
  if (opts.dateFrom) { conditions.push(`c.created_at >= $${idx++}`); vals.push(opts.dateFrom); }
  if (opts.dateTo) { conditions.push(`c.created_at <= $${idx++}`); vals.push(opts.dateTo); }

  return { conditions, vals, idx };
}

/**
 * List complaints with full join data for admin view.
 * Supports: search, status, priority, category, departmentId, officerId, dateFrom, dateTo, page, limit, sortBy, sortDir
 */
async function listComplaints(opts = {}) {
  const {
    page = 1,
    limit = 20,
    sortBy = 'created_at',
    sortDir = 'desc'
  } = opts;

  const { conditions, vals, idx } = buildFilters(opts);
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * limit;
  const orderCol = ALLOWED_SORT.has(sortBy) ? sortBy : 'created_at';
  const orderDir = sortDir && sortDir.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  const countQ = `SELECT COUNT(*)::int AS total FROM complaints c ${where}`;
  const countR = await db.query(countQ, vals);
  const total = countR.rows[0] ? countR.rows[0].total : 0;

  const qStr = `
    SELECT
      c.id,
      c.external_id,
      c.title,
      c.summary,
      c.description,
      c.category,
      c.priority,
      c.severity,
      c.status,
      c.address,
      c.is_anonymous,
      c.created_at,
      c.assigned_at,
      c.user_id,
      c.department_id,
      c.officer_id,
      ST_X(c.location::geometry) AS lng,
      ST_Y(c.location::geometry) AS lat,
      u.name AS citizen_name,
      u.email AS citizen_email,
      d.name AS department_name,
      o.name AS officer_name,
      o.email AS officer_email
    FROM complaints c
    LEFT JOIN users u ON u.id = c.user_id
    LEFT JOIN departments d ON d.id = c.department_id
    LEFT JOIN users o ON o.id = c.officer_id
    ${where}
    ORDER BY c.${orderCol} ${orderDir}
    LIMIT $${idx} OFFSET $${idx + 1}
  `;
  const listVals = [...vals, limit, offset];
  const r = await db.query(qStr, listVals);

  return { items: r.rows, total, page, limit };
}

/**
 * Get a single complaint by ID with full join data, images, and AI analysis.
 */
async function getComplaintById(id) {
  const q = `
    SELECT
      c.id,
      c.external_id,
      c.title,
      c.summary,
      c.description,
      c.category,
      c.priority,
      c.severity,
      c.status,
      c.address,
      c.is_anonymous,
      c.created_at,
      c.assigned_at,
      c.user_id,
      c.department_id,
      c.officer_id,
      ST_X(c.location::geometry) AS lng,
      ST_Y(c.location::geometry) AS lat,
      u.name AS citizen_name,
      u.email AS citizen_email,
      d.name AS department_name,
      o.name AS officer_name,
      o.email AS officer_email
    FROM complaints c
    LEFT JOIN users u ON u.id = c.user_id
    LEFT JOIN departments d ON d.id = c.department_id
    LEFT JOIN users o ON o.id = c.officer_id
    WHERE c.id = $1
  `;
  const r = await db.query(q, [id]);
  if (!r.rows[0]) return null;

  const complaint = r.rows[0];

  // Fetch images
  try {
    const imgQ = 'SELECT id, url, public_id, metadata, created_at FROM complaint_images WHERE complaint_id = $1 ORDER BY created_at';
    const imgs = await db.query(imgQ, [id]);
    complaint.images = imgs.rows;
  } catch (e) {
    complaint.images = [];
  }

  // Fetch AI analysis
  try {
    const aiQ = 'SELECT id, analysis, confidence, created_at FROM ai_analysis WHERE complaint_id = $1 ORDER BY created_at DESC LIMIT 1';
    const ai = await db.query(aiQ, [id]);
    complaint.ai_analysis = ai.rows[0] || null;
  } catch (e) {
    complaint.ai_analysis = null;
  }

  // Fetch status history
  try {
    const histQ = `
      SELECT h.id, h.status_from, h.status_to, h.note, h.created_at,
        u.name AS changed_by_name, u.role AS changed_by_role
      FROM complaint_status_history h
      LEFT JOIN users u ON u.id = h.changed_by
      WHERE h.complaint_id = $1
      ORDER BY h.created_at
    `;
    const hist = await db.query(histQ, [id]);
    complaint.status_history = hist.rows;
  } catch (e) {
    complaint.status_history = [];
  }

  return complaint;
}

/**
 * Update complaint fields (status, priority, department_id, officer_id).
 * Only allows safe, whitelisted fields.
 */
async function updateComplaintAdmin(id, fields = {}) {
  const ALLOWED = new Set(['status', 'priority', 'severity', 'department_id', 'officer_id', 'assigned_at']);
  const sets = [];
  const vals = [];
  let idx = 1;

  Object.keys(fields).forEach((k) => {
    if (ALLOWED.has(k)) {
      sets.push(`${k} = $${idx++}`);
      vals.push(fields[k]);
    }
  });

  if (!sets.length) return getComplaintById(id);

  vals.push(id);
  const q = `UPDATE complaints SET ${sets.join(', ')} WHERE id = $${idx} RETURNING id`;
  await db.query(q, vals);
  return getComplaintById(id);
}

module.exports = {
  listComplaints,
  getComplaintById,
  updateComplaintAdmin
};
