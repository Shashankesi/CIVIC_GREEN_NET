const db = require('../config/db');

async function createComplaint({ userId, departmentId, title, summary, description, category, priority, severity, isAnonymous, address, location, sla_due_at }) {
  const q = `INSERT INTO complaints(user_id, department_id, title, summary, description, category, priority, severity, is_anonymous, address, location, created_at, sla_due_at)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, ST_SetSRID(ST_MakePoint($11,$12),4326), now(), $13) RETURNING *`;
  const params = [userId, departmentId, title, summary, description, category, priority, severity, isAnonymous, address, location.lng, location.lat, sla_due_at];
  const r = await db.query(q, params);
  return r.rows[0];
}

async function addComplaintImage(complaintId, url, publicId, metadata = {}) {
  const q = 'INSERT INTO complaint_images(complaint_id,url,public_id,metadata,created_at) VALUES($1,$2,$3,$4,now()) RETURNING *';
  const r = await db.query(q, [complaintId, url, publicId, metadata]);
  return r.rows[0];
}

async function listComplaints({ limit = 20, offset = 0, filters = {} } = {}) {
  const conditions = [];
  const vals = [];
  let idx = 1;
  if (filters.userId) { conditions.push(`user_id=$${idx++}`); vals.push(filters.userId); }
  if (filters.status) { conditions.push(`status=$${idx++}`); vals.push(filters.status); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const q = `SELECT * FROM complaints ${where} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`;
  vals.push(limit, offset);
  const r = await db.query(q, vals);
  return r.rows;
}

async function getById(id) {
  const q = 'SELECT * FROM complaints WHERE id=$1';
  const r = await db.query(q, [id]);
  return r.rows[0];
}

async function updateComplaint(id, fields = {}) {
  const sets = [];
  const vals = [];
  let idx = 1;
  Object.keys(fields).forEach((k) => {
    sets.push(`${k}=$${idx++}`);
    vals.push(fields[k]);
  });
  if (!sets.length) return getById(id);
  vals.push(id);
  const q = `UPDATE complaints SET ${sets.join(',')} WHERE id=$${idx} RETURNING *`;
  const r = await db.query(q, vals);
  return r.rows[0];
}

async function deleteComplaint(id) {
  const q = 'DELETE FROM complaints WHERE id=$1';
  await db.query(q, [id]);
}

async function findPotentialDuplicates(text, threshold = 0.3, limit = 5) {
  const q = `SELECT id, title, similarity(title, $1) AS score FROM complaints WHERE similarity(title, $1) > $2 ORDER BY score DESC LIMIT $3`;
  const r = await db.query(q, [text, threshold, limit]);
  return r.rows;
}

async function statsSummary(userId = null) {
  const params = [];
  const userFilter = userId ? 'WHERE user_id = $1' : '';
  const q = `SELECT
      (SELECT COUNT(*) FROM complaints ${userFilter}) AS total,
      (SELECT COUNT(*) FROM complaints ${userFilter} ${userId ? 'AND' : 'WHERE'} status='open') AS open,
      (SELECT COUNT(*) FROM complaints ${userFilter} ${userId ? 'AND' : 'WHERE'} status='in_progress') AS in_progress,
      (SELECT COUNT(*) FROM complaints ${userFilter} ${userId ? 'AND' : 'WHERE'} status='resolved') AS resolved`;
  if (userId) params.push(userId);
  const r = await db.query(q, params);
  return r.rows[0];
}

async function recentComplaints(limit = 10, userId = null) {
  const where = userId ? 'WHERE user_id = $2' : '';
  const params = userId ? [limit, userId] : [limit];
  const q = `SELECT id,title,summary,status,created_at FROM complaints ${where} ORDER BY created_at DESC LIMIT $1`;
  const r = await db.query(q, params);
  return r.rows;
}

async function trend(days = 30, userId = null) {
  const where = userId ? 'AND user_id = $2' : '';
  const params = userId ? [days, userId] : [days];
  const q = `SELECT date(created_at) AS day, count(*) FROM complaints WHERE created_at > now() - ($1::int || ' days')::interval ${where} GROUP BY date(created_at) ORDER BY date(created_at)`;
  const r = await db.query(q, params);
  return r.rows;
}

async function categoryDistribution(userId = null) {
  const where = userId ? 'WHERE user_id = $1' : '';
  const params = userId ? [userId] : [];
  const q = `SELECT category, count(*) FROM complaints ${where} GROUP BY category ORDER BY count DESC`;
  const r = await db.query(q, params);
  return r.rows;
}

async function priorityDistribution(userId = null) {
  const where = userId ? 'WHERE user_id = $1' : '';
  const params = userId ? [userId] : [];
  const q = `SELECT priority, count(*) FROM complaints ${where} GROUP BY priority ORDER BY count DESC`;
  const r = await db.query(q, params);
  return r.rows;
}

async function monthlyTrend(months = 6, userId = null) {
  const where = userId ? 'AND user_id = $2' : '';
  const params = userId ? [months, userId] : [months];
  const q = `SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS month, count(*) FROM complaints WHERE created_at > now() - ($1::int || ' months')::interval ${where} GROUP BY month ORDER BY month`;
  const r = await db.query(q, params);
  return r.rows;
}

async function searchComplaints(opts = {}) {
  const { q = null, category = null, departmentId = null, status = null, priority = null, dateFrom = null, dateTo = null, lat = null, lng = null, radius = null, page = 1, limit = 20, sortBy = 'created_at', sortDir = 'desc' } = opts;
  const conditions = [];
  const vals = [];
  let idx = 1;
  if (q) { conditions.push(`(similarity(title, $${idx}) > 0.1 OR title ILIKE $${idx} OR description ILIKE $${idx})`); vals.push(q); idx++; }
  if (category) { conditions.push(`category=$${idx++}`); vals.push(category); }
  if (departmentId) { conditions.push(`department_id=$${idx++}`); vals.push(departmentId); }
  if (status) { conditions.push(`status=$${idx++}`); vals.push(status); }
  if (priority) { conditions.push(`priority=$${idx++}`); vals.push(priority); }
  if (dateFrom) { conditions.push(`created_at >= $${idx++}`); vals.push(dateFrom); }
  if (dateTo) { conditions.push(`created_at <= $${idx++}`); vals.push(dateTo); }
  if (lat && lng && radius) { conditions.push(`ST_DWithin(location::geography, ST_SetSRID(ST_MakePoint($${idx++},$${idx++}),4326)::geography, $${idx++})`); vals.push(lng, lat, radius); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * limit;
  const order = `ORDER BY ${sortBy} ${sortDir.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'}`;
  const qStr = `SELECT id,user_id,department_id,title,summary,status,priority,category,created_at FROM complaints ${where} ${order} LIMIT $${idx++} OFFSET $${idx++}`;
  vals.push(limit, offset);
  const r = await db.query(qStr, vals);
  return r.rows;
}

async function getSimilarComplaints(complaintId, threshold = 0.7, limit = 5) {
  try {
    const hasVector = db.hasVector || false;
    if (!hasVector) {
      try {
        const ext = await db.query("SELECT 1 FROM pg_extension WHERE extname='vector'");
        if (ext.rows.length) db.hasVector = true;
      } catch (e) {
        db.hasVector = false;
      }
    }

    if (db.hasVector) {
      const col = await db.query("SELECT column_name FROM information_schema.columns WHERE table_name='ai_analysis' AND column_name='embedding'");
      if (col.rows.length) {
        const base = await db.query('SELECT embedding FROM ai_analysis WHERE complaint_id=$1 LIMIT 1', [complaintId]);
        if (base.rows.length && base.rows[0].embedding) {
          try {
            const rows = await db.query('SELECT complaint_id, embedding <-> $1 AS distance FROM ai_analysis WHERE complaint_id != $2 ORDER BY distance ASC LIMIT $3', [base.rows[0].embedding, complaintId, limit]);
            return rows.rows.map(r => ({ id: r.complaint_id, score: 1 / (1 + parseFloat(r.distance)) }));
          } catch (e) {
            // fall through to JSON/js fallback
          }
        }
      }
    }
  } catch (e) {
    // ignore — will fallback to legacy methods
  }

  try {
    const base = await db.query('SELECT analysis FROM ai_analysis WHERE complaint_id=$1 LIMIT 1', [complaintId]);
    if (!base.rows.length) return [];
    const embedding = base.rows[0].analysis && base.rows[0].analysis.embedding ? base.rows[0].analysis.embedding : null;
    if (embedding && Array.isArray(embedding)) {
      const rows = await db.query("SELECT complaint_id, analysis FROM ai_analysis WHERE analysis ? 'embedding'");
      const candidates = [];
      for (const r of rows.rows) {
        try {
          const emb = r.analysis && r.analysis.embedding ? r.analysis.embedding : null;
          if (emb && Array.isArray(emb) && r.complaint_id !== complaintId) {
            let dot = 0, na = 0, nb = 0;
            for (let i = 0; i < emb.length; i++) { dot += emb[i] * embedding[i]; na += emb[i] * emb[i]; nb += embedding[i] * embedding[i]; }
            const sim = dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-12);
            if (sim >= threshold) candidates.push({ id: r.complaint_id, score: sim });
          }
        } catch (e) {}
      }
      candidates.sort((a, b) => b.score - a.score);
      return candidates.slice(0, limit);
    }
  } catch (e) {}

  try {
    const c = await db.query('SELECT title FROM complaints WHERE id=$1', [complaintId]);
    if (!c.rows.length) return [];
    const title = c.rows[0].title || '';
    const r = await db.query('SELECT id, title, similarity(title, $1) AS score FROM complaints WHERE id != $2 AND similarity(title, $1) > 0.1 ORDER BY score DESC LIMIT $3', [title, complaintId, limit]);
    return r.rows.map(rr => ({ id: rr.id, score: rr.score }));
  } catch (e) { return []; }
}

async function heatmapAggregation({ bbox = null, zoom = 10, limit = 1000 } = {}) {
  try {
    const vals = [];
    let idx = 1;
    let where = '';
    if (bbox && bbox.length === 4) {
      where = `WHERE location && ST_MakeEnvelope($${idx++}, $${idx++}, $${idx++}, $${idx++}, 4326)`;
      vals.push(bbox[0], bbox[1], bbox[2], bbox[3]);
    }
    const precision = Math.max(0, 3 - Math.floor(zoom / 5));
    const q2 = `SELECT ROUND(ST_X(location::geometry)::numeric, $${idx}) AS lng, ROUND(ST_Y(location::geometry)::numeric, $${idx}) AS lat, count(*) AS cnt FROM complaints ${where} GROUP BY lng,lat ORDER BY cnt DESC LIMIT $${idx+1}`;
    vals.push(precision, limit);
    const r = await db.query(q2, vals);
    return r.rows.map(row => ({ lng: parseFloat(row.lng), lat: parseFloat(row.lat), count: parseInt(row.cnt, 10) }));
  } catch (e) { return []; }
}

async function bboxQuery(minLng, minLat, maxLng, maxLat, { limit = 100, offset = 0, filters = {} } = {}) {
  const conditions = [`location && ST_MakeEnvelope($1,$2,$3,$4,4326)`];
  const vals = [minLng, minLat, maxLng, maxLat];
  let idx = 5;
  if (filters.category) { conditions.push(`category=$${idx++}`); vals.push(filters.category); }
  if (filters.status) { conditions.push(`status=$${idx++}`); vals.push(filters.status); }
  if (filters.priority) { conditions.push(`priority=$${idx++}`); vals.push(filters.priority); }
  const where = `WHERE ${conditions.join(' AND ')}`;
  const q = `SELECT id,title,summary,category,priority,status,ST_X(location::geometry) AS lng, ST_Y(location::geometry) AS lat, created_at FROM complaints ${where} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`;
  vals.push(limit, offset);
  const r = await db.query(q, vals);
  return r.rows;
}

async function nearbyComplaints(lat, lng, radiusMeters = 1000, { limit = 50, offset = 0 } = {}) {
  const q = `SELECT id,title,summary,category,priority,status, ST_X(location::geometry) AS lng, ST_Y(location::geometry) AS lat, ST_Distance(location::geography, ST_SetSRID(ST_MakePoint($1,$2),4326)::geography) AS distance FROM complaints WHERE ST_DWithin(location::geography, ST_SetSRID(ST_MakePoint($1,$2),4326)::geography, $3) ORDER BY distance LIMIT $4 OFFSET $5`;
  const r = await db.query(q, [lng, lat, radiusMeters, limit, offset]);
  return r.rows;
}

async function getTimeline(complaintId) {
  const q = `SELECT h.id, h.status_from, h.status_to, h.changed_by, u.name AS changed_by_name, u.avatar_url AS changed_by_avatar, u.role AS changed_by_role, h.note, h.created_at
      FROM complaint_status_history h
      LEFT JOIN users u ON u.id = h.changed_by
      WHERE h.complaint_id=$1
      ORDER BY h.created_at`;
  const r = await db.query(q, [complaintId]);
  const imgQ = `SELECT id,url,public_id,metadata,created_at FROM complaint_images WHERE complaint_id=$1 AND (metadata->>'resolution')='true' ORDER BY created_at`;
  const imgs = await db.query(imgQ, [complaintId]);
  const aiQ = `SELECT id,analysis,confidence,created_at FROM ai_analysis WHERE complaint_id=$1 ORDER BY created_at`;
  const ai = await db.query(aiQ, [complaintId]);
  return { history: r.rows, resolutionImages: imgs.rows, ai: ai.rows };
}

async function addStatusHistory(complaintId, from, to, changedBy, note) {
  const q = 'INSERT INTO complaint_status_history(complaint_id,status_from,status_to,changed_by,note,created_at) VALUES($1,$2,$3,$4,$5,now()) RETURNING *';
  const r = await db.query(q, [complaintId, from, to, changedBy, note]);
  return r.rows[0];
}

module.exports = {
  createComplaint,
  addComplaintImage,
  listComplaints,
  getById,
  updateComplaint,
  deleteComplaint,
  findPotentialDuplicates,
  statsSummary,
  recentComplaints,
  trend,
  categoryDistribution,
  priorityDistribution,
  monthlyTrend,
  searchComplaints,
  getSimilarComplaints,
  heatmapAggregation,
  bboxQuery,
  nearbyComplaints,
  getTimeline,
  addStatusHistory
};
