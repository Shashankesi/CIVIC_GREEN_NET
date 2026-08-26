const db = require('../config/db');

function getCategoriesForDepartment(deptName) {
  if (!deptName) return [];
  const name = deptName.toLowerCase();
  const cats = [];
  if (name.includes('road') || name.includes('infrastruct')) cats.push('roads', 'road', 'pothole', 'traffic', 'footpath', 'bridge', 'infrastructure');
  if (name.includes('sanitat') || name.includes('waste') || name.includes('garbage')) cats.push('sanitation', 'waste', 'garbage', 'debris', 'solid_waste');
  if (name.includes('light') || name.includes('electr')) cats.push('lighting', 'street_lighting', 'street lighting', 'electrical', 'power');
  if (name.includes('water')) cats.push('water', 'utilities', 'water_supply', 'water supply', 'leakage', 'pipeline');
  if (name.includes('sewer') || name.includes('drain')) cats.push('drainage', 'sewerage', 'utilities', 'drain', 'sewer');
  if (name.includes('park') || name.includes('horticult')) cats.push('parks', 'horticulture', 'environment', 'trees', 'gardens');
  if (name.includes('traffic') || name.includes('transport') || name.includes('safety')) cats.push('public_safety', 'traffic', 'roads', 'transport');
  if (name.includes('health')) cats.push('public_health', 'health', 'sanitation');
  cats.push(name);
  return [...new Set(cats.map(c => c.toLowerCase()))];
}

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
  const q = `SELECT *, ST_X(location::geometry) AS lng, ST_Y(location::geometry) AS lat FROM complaints WHERE id=$1`;
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
  await db.transaction(async (client) => {
    await client.query('DELETE FROM complaint_images WHERE complaint_id=$1', [id]);
    await client.query('DELETE FROM complaint_status_history WHERE complaint_id=$1', [id]);
    await client.query('DELETE FROM duplicate_complaints WHERE complaint_id=$1', [id]);
    await client.query('DELETE FROM complaint_notes WHERE complaint_id=$1', [id]);
    await client.query('DELETE FROM complaint_assignments WHERE complaint_id=$1', [id]);
    await client.query('DELETE FROM complaint_votes WHERE complaint_id=$1', [id]);
    await client.query('DELETE FROM complaint_follows WHERE complaint_id=$1', [id]);
    await client.query('DELETE FROM complaint_comments WHERE complaint_id=$1', [id]);
    await client.query('DELETE FROM ai_analysis WHERE complaint_id=$1', [id]);
    await client.query('DELETE FROM ai_audit_logs WHERE complaint_id=$1', [id]);
    await client.query('DELETE FROM complaint_reopenings WHERE complaint_id=$1', [id]);
    await client.query('DELETE FROM point_transactions WHERE complaint_id=$1', [id]);
    await client.query('DELETE FROM resource_requests WHERE complaint_id=$1', [id]);
    await client.query('DELETE FROM complaint_teams WHERE complaint_id=$1', [id]);
    await client.query('DELETE FROM email_logs WHERE complaint_id=$1', [id]);
    await client.query('DELETE FROM complaints WHERE id=$1', [id]);
  });

  try {
    const { invalidatePublicCache } = require('../controllers/publicController');
    invalidatePublicCache();
  } catch (e) {}
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
      (SELECT COUNT(*) FROM complaints ${userFilter} ${userId ? 'AND' : 'WHERE'} status='resolved') AS resolved,
      (SELECT COUNT(*) FROM complaints ${userFilter} ${userId ? 'AND' : 'WHERE'} status='reopened') AS reopened,
      (SELECT COUNT(*) FROM complaints ${userFilter} ${userId ? 'AND' : 'WHERE'} status='closed') AS closed`;
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
  const {
    q = null,
    userId = null,
    officerId = null,
    officerScopeId = null,
    category = null,
    departmentId = null,
    status = null,
    priority = null,
    dateFrom = null,
    dateTo = null,
    lat = null,
    lng = null,
    radius = null,
    page = 1,
    limit = 20,
    sortBy = 'created_at',
    sortDir = 'desc',
    assigned = null,
    dueSoon = null
  } = opts;

  const conditions = [];
  const vals = [];
  let idx = 1;

  if (q && String(q).trim()) {
    const rawTerm = String(q).trim();
    const cleanIdMatch = rawTerm.replace(/^[#\s]+/, '').replace(/^CGN-0*/i, '');
    const isNumericId = cleanIdMatch && !isNaN(parseInt(cleanIdMatch, 10));

    if (isNumericId) {
      const parsedId = parseInt(cleanIdMatch, 10);
      conditions.push(`(
        c.id = $${idx} OR
        c.title ILIKE $${idx + 1} OR
        c.description ILIKE $${idx + 1} OR
        c.summary ILIKE $${idx + 1} OR
        c.address ILIKE $${idx + 1} OR
        c.category ILIKE $${idx + 1} OR
        u.name ILIKE $${idx + 1} OR
        d.name ILIKE $${idx + 1} OR
        o.name ILIKE $${idx + 1} OR
        ('CGN-' || lpad(c.id::text, 5, '0')) ILIKE $${idx + 1}
      )`);
      vals.push(parsedId, `%${rawTerm}%`);
      idx += 2;
    } else {
      conditions.push(`(
        c.title ILIKE $${idx} OR
        c.description ILIKE $${idx} OR
        c.summary ILIKE $${idx} OR
        c.address ILIKE $${idx} OR
        c.category ILIKE $${idx} OR
        u.name ILIKE $${idx} OR
        d.name ILIKE $${idx} OR
        o.name ILIKE $${idx} OR
        c.id::text ILIKE $${idx} OR
        ('CGN-' || lpad(c.id::text, 5, '0')) ILIKE $${idx}
      )`);
      vals.push(`%${rawTerm}%`);
      idx++;
    }
  }

  if (userId && !isNaN(parseInt(userId, 10))) {
    conditions.push(`c.user_id = $${idx++}`);
    vals.push(parseInt(userId, 10));
  }

  if (officerId && !isNaN(parseInt(officerId, 10))) {
    conditions.push(`c.officer_id = $${idx++}`);
    vals.push(parseInt(officerId, 10));
  }

  if (assigned === 'true' || assigned === true) {
    conditions.push(`c.officer_id IS NOT NULL`);
  } else if (assigned === 'false' || assigned === false) {
    conditions.push(`c.officer_id IS NULL`);
  }

  if (dueSoon === 'true' || dueSoon === true) {
    conditions.push(`c.status NOT IN ('resolved', 'closed', 'rejected') AND c.sla_due_at IS NOT NULL AND c.sla_due_at > now() AND c.sla_due_at <= now() + INTERVAL '24 hours'`);
  }

  if (officerScopeId) {
    const officerRes = await db.query(`
      SELECT u.department_id, u.settings, u.municipality_id, u.zone_id, u.ward_id, u.jurisdiction,
      m.name AS municipality_name, z.name AS zone_name, w.name AS ward_name,
      d.name AS department_name
      FROM users u
      LEFT JOIN municipalities m ON m.id = u.municipality_id
      LEFT JOIN zones z ON z.id = u.zone_id
      LEFT JOIN wards w ON w.id = u.ward_id
      LEFT JOIN departments d ON d.id = u.department_id
      WHERE u.id = $1
    `, [officerScopeId]);

    if (officerRes.rows.length) {
      const u = officerRes.rows[0];
      const settings = typeof u.settings === 'string' ? JSON.parse(u.settings) : (u.settings || {});
      const offLat = parseFloat(settings.latitude || settings.lat);
      const offLng = parseFloat(settings.longitude || settings.lng);
      const offRadius = parseFloat(settings.radius || settings.radius_km * 1000) || 10000;

      const isGeneralOfficer = !u.department_id && !u.municipality_id && !u.zone_id && !u.ward_id && !u.jurisdiction && (isNaN(offLat) || isNaN(offLng));

      if (!isGeneralOfficer) {
        const scopeConditions = [];

        // Condition 1: Assigned directly to this officer
        scopeConditions.push(`c.officer_id = $${idx++}`);
        vals.push(officerScopeId);

        // Condition 2: Matches department ID or department categories (case-insensitive)
        if (u.department_id) {
          scopeConditions.push(`c.department_id = $${idx++}`);
          vals.push(u.department_id);

          const cats = getCategoriesForDepartment(u.department_name);
          if (cats.length) {
            scopeConditions.push(`LOWER(c.category) = ANY($${idx++})`);
            vals.push(cats);
          }
        }

        // Condition 3: Matches location radius
        if (!isNaN(offLat) && !isNaN(offLng)) {
          scopeConditions.push(`ST_DWithin(c.location::geography, ST_SetSRID(ST_MakePoint($${idx++},$${idx++}),4326)::geography, $${idx++})`);
          vals.push(offLng, offLat, offRadius);
        }

        // Condition 4: Fallback to municipality / zone / ward / jurisdiction text matches
        if (u.municipality_name) {
          scopeConditions.push(`c.address ILIKE $${idx++}`);
          vals.push(`%${u.municipality_name}%`);
        }
        if (u.zone_name) {
          scopeConditions.push(`c.address ILIKE $${idx++}`);
          vals.push(`%${u.zone_name}%`);
        }
        if (u.ward_name) {
          scopeConditions.push(`c.address ILIKE $${idx++}`);
          vals.push(`%${u.ward_name}%`);
        }
        if (u.jurisdiction) {
          scopeConditions.push(`c.address ILIKE $${idx++}`);
          vals.push(`%${u.jurisdiction}%`);
        }

        if (scopeConditions.length) {
          conditions.push(`(${scopeConditions.join(' OR ')})`);
        }
      }
    }
  }

  if (category && String(category).trim() && String(category).trim().toLowerCase() !== 'all') {
    conditions.push(`LOWER(c.category) = $${idx++}`);
    vals.push(String(category).trim().toLowerCase());
  }
  if (departmentId && !isNaN(parseInt(departmentId, 10))) {
    conditions.push(`c.department_id = $${idx++}`);
    vals.push(parseInt(departmentId, 10));
  }
  if (status && String(status).trim() && String(status).trim().toLowerCase() !== 'all') {
    const rawStatus = String(status).trim().toLowerCase().replace('-', '_');
    conditions.push(`c.status = $${idx++}`);
    vals.push(rawStatus);
  }
  if (priority && String(priority).trim() && String(priority).trim().toLowerCase() !== 'all') {
    conditions.push(`c.priority = $${idx++}`);
    vals.push(String(priority).trim().toLowerCase());
  }
  if (dateFrom && String(dateFrom).trim()) {
    conditions.push(`c.created_at >= $${idx++}::timestamp`);
    vals.push(dateFrom);
  }
  if (dateTo && String(dateTo).trim()) {
    conditions.push(`c.created_at < ($${idx++}::date + INTERVAL '1 day')`);
    vals.push(dateTo);
  }
  if (lat && lng && radius) {
    conditions.push(`ST_DWithin(c.location::geography, ST_SetSRID(ST_MakePoint($${idx++},$${idx++}),4326)::geography, $${idx++})`);
    vals.push(lng, lat, radius);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * limit;
  let order = `ORDER BY c.${sortBy} ${sortDir.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'}`;
  if (sortBy === 'priority_val') {
    order = `ORDER BY CASE WHEN c.priority = 'critical' THEN 4 WHEN c.priority = 'high' THEN 3 WHEN c.priority = 'medium' THEN 2 ELSE 1 END ${sortDir.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'}`;
  }

  const qStr = `
    SELECT
      c.id,
      c.external_id,
      c.user_id,
      c.department_id,
      c.title,
      c.summary,
      c.description,
      c.status,
      c.priority,
      c.severity,
      c.category,
      c.created_at,
      c.assigned_at,
      c.address,
      ST_X(c.location::geometry) AS lng,
      ST_Y(c.location::geometry) AS lat,
      c.officer_id,
      c.sla_due_at,
      c.resolution_at,
      c.resolution_note,
      c.is_anonymous,
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
    ${order}
    LIMIT $${idx++} OFFSET $${idx++}
  `;
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

async function nearbyComplaints(lat, lng, radiusMeters = 1000, { limit = 50, offset = 0, filters = {} } = {}) {
  const conditions = [`ST_DWithin(location::geography, ST_SetSRID(ST_MakePoint($1,$2),4326)::geography, $3)`];
  const vals = [lng, lat, radiusMeters];
  let idx = 4;
  if (filters.category) { conditions.push(`category=$${idx++}`); vals.push(filters.category); }
  if (filters.status) { conditions.push(`status=$${idx++}`); vals.push(filters.status); }
  if (filters.priority) { conditions.push(`priority=$${idx++}`); vals.push(filters.priority); }
  if (filters.officerId) { conditions.push(`officer_id=$${idx++}`); vals.push(filters.officerId); }

  const where = `WHERE ${conditions.join(' AND ')}`;
  const q = `SELECT id,title,summary,category,priority,status,address, ST_X(location::geometry) AS lng, ST_Y(location::geometry) AS lat, ST_Distance(location::geography, ST_SetSRID(ST_MakePoint($1,$2),4326)::geography) AS distance FROM complaints ${where} ORDER BY distance LIMIT $${idx++} OFFSET $${idx++}`;
  vals.push(limit, offset);
  const r = await db.query(q, vals);
  return r.rows;
}

async function getOfficerDashboardStats(officerId) {
  // Retrieve officer profile details for scope validation
  const officerRes = await db.query(`
    SELECT u.department_id, u.settings, u.municipality_id, u.zone_id, u.ward_id, u.jurisdiction,
    m.name AS municipality_name, z.name AS zone_name, w.name AS ward_name,
    d.name AS department_name
    FROM users u
    LEFT JOIN municipalities m ON m.id = u.municipality_id
    LEFT JOIN zones z ON z.id = u.zone_id
    LEFT JOIN wards w ON w.id = u.ward_id
    LEFT JOIN departments d ON d.id = u.department_id
    WHERE u.id = $1
  `, [officerId]);

  let scopeCondition = '1=1';
  const vals = [officerId];
  let idx = 2;

  if (officerRes.rows.length) {
    const u = officerRes.rows[0];
    const settings = typeof u.settings === 'string' ? JSON.parse(u.settings) : (u.settings || {});
    const offLat = parseFloat(settings.latitude || settings.lat);
    const offLng = parseFloat(settings.longitude || settings.lng);
    const offRadius = parseFloat(settings.radius || settings.radius_km * 1000) || 10000;

    const isGeneralOfficer = !u.department_id && !u.municipality_id && !u.zone_id && !u.ward_id && !u.jurisdiction && (isNaN(offLat) || isNaN(offLng));

    if (!isGeneralOfficer) {
      const scopeConditions = ['c.officer_id = $1'];

      if (u.department_id) {
        scopeConditions.push(`c.department_id = $${idx++}`);
        vals.push(u.department_id);

        const cats = getCategoriesForDepartment(u.department_name);
        if (cats.length) {
          scopeConditions.push(`LOWER(c.category) = ANY($${idx++})`);
          vals.push(cats);
        }
      }

      if (!isNaN(offLat) && !isNaN(offLng)) {
        scopeConditions.push(`ST_DWithin(c.location::geography, ST_SetSRID(ST_MakePoint($${idx++},$${idx++}),4326)::geography, $${idx++})`);
        vals.push(offLng, offLat, offRadius);
      }

      if (u.municipality_name) {
        scopeConditions.push(`c.address ILIKE $${idx++}`);
        vals.push(`%${u.municipality_name}%`);
      }
      if (u.zone_name) {
        scopeConditions.push(`c.address ILIKE $${idx++}`);
        vals.push(`%${u.zone_name}%`);
      }
      if (u.ward_name) {
        scopeConditions.push(`c.address ILIKE $${idx++}`);
        vals.push(`%${u.ward_name}%`);
      }
      if (u.jurisdiction) {
        scopeConditions.push(`c.address ILIKE $${idx++}`);
        vals.push(`%${u.jurisdiction}%`);
      }

      scopeCondition = `(${scopeConditions.join(' OR ')})`;
    }
  }

  const q = `SELECT
    COUNT(*)::int AS total,
    COUNT(CASE WHEN c.officer_id = $1 THEN 1 END)::int AS assigned_to_me,
    COUNT(CASE WHEN c.status = 'open' THEN 1 END)::int AS open,
    COUNT(CASE WHEN c.status IN ('in_progress', 'assigned', 'accepted', 'reopened') THEN 1 END)::int AS in_progress,
    COUNT(CASE WHEN c.priority = 'high' AND c.status NOT IN ('resolved', 'closed', 'rejected') THEN 1 END)::int AS high_priority,
    COUNT(CASE WHEN c.priority = 'critical' AND c.status NOT IN ('resolved', 'closed', 'rejected') THEN 1 END)::int AS critical,
    COUNT(CASE WHEN c.status = 'resolved' THEN 1 END)::int AS resolved,
    COUNT(CASE WHEN c.status = 'closed' THEN 1 END)::int AS closed,
    COUNT(CASE WHEN c.officer_id IS NULL AND c.status NOT IN ('resolved', 'closed', 'rejected') THEN 1 END)::int AS unassigned,
    COUNT(CASE WHEN c.status NOT IN ('resolved', 'closed', 'rejected') AND c.sla_due_at IS NOT NULL AND c.sla_due_at > now() AND c.sla_due_at <= now() + INTERVAL '24 hours' THEN 1 END)::int AS due_soon,
    COUNT(CASE WHEN c.status NOT IN ('resolved', 'closed', 'rejected') AND c.sla_due_at IS NOT NULL AND c.sla_due_at < now() THEN 1 END)::int AS overdue
    FROM complaints c
    WHERE ${scopeCondition}`;

  const r = await db.query(q, vals);
  return r.rows[0];
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

async function getComplaintVotes(complaintId, userId = null) {
  const countRes = await db.query('SELECT COUNT(*)::int as count FROM complaint_votes WHERE complaint_id=$1', [complaintId]);
  let hasVoted = false;
  if (userId) {
    const userRes = await db.query('SELECT 1 FROM complaint_votes WHERE complaint_id=$1 AND user_id=$2', [complaintId, userId]);
    hasVoted = userRes.rows.length > 0;
  }
  return { count: countRes.rows[0]?.count || 0, hasVoted };
}

async function toggleVote(complaintId, userId) {
  const existing = await db.query('SELECT id FROM complaint_votes WHERE complaint_id=$1 AND user_id=$2', [complaintId, userId]);
  if (existing.rows.length > 0) {
    await db.query('DELETE FROM complaint_votes WHERE complaint_id=$1 AND user_id=$2', [complaintId, userId]);
    const { count } = await getComplaintVotes(complaintId, userId);
    return { hasVoted: false, count };
  } else {
    await db.query('INSERT INTO complaint_votes (complaint_id, user_id, created_at) VALUES ($1, $2, now()) ON CONFLICT DO NOTHING', [complaintId, userId]);
    const { count } = await getComplaintVotes(complaintId, userId);
    return { hasVoted: true, count };
  }
}

async function getComplaintFollow(complaintId, userId = null) {
  const countRes = await db.query('SELECT COUNT(*)::int as count FROM complaint_follows WHERE complaint_id=$1', [complaintId]);
  let isFollowing = false;
  if (userId) {
    const userRes = await db.query('SELECT 1 FROM complaint_follows WHERE complaint_id=$1 AND user_id=$2', [complaintId, userId]);
    isFollowing = userRes.rows.length > 0;
  }
  return { count: countRes.rows[0]?.count || 0, isFollowing };
}

async function toggleFollow(complaintId, userId) {
  const existing = await db.query('SELECT id FROM complaint_follows WHERE complaint_id=$1 AND user_id=$2', [complaintId, userId]);
  if (existing.rows.length > 0) {
    await db.query('DELETE FROM complaint_follows WHERE complaint_id=$1 AND user_id=$2', [complaintId, userId]);
    const { count } = await getComplaintFollow(complaintId, userId);
    return { isFollowing: false, count };
  } else {
    await db.query('INSERT INTO complaint_follows (complaint_id, user_id, created_at) VALUES ($1, $2, now()) ON CONFLICT DO NOTHING', [complaintId, userId]);
    const { count } = await getComplaintFollow(complaintId, userId);
    return { isFollowing: true, count };
  }
}

async function listFollowedComplaints(userId, limit = 20, offset = 0) {
  const q = `
    SELECT c.*, 
           ST_X(c.location::geometry) AS lng, 
           ST_Y(c.location::geometry) AS lat,
           d.name as department_name,
           u_off.name as officer_name
    FROM complaint_follows f
    JOIN complaints c ON c.id = f.complaint_id
    LEFT JOIN departments d ON d.id = c.department_id
    LEFT JOIN users u_off ON u_off.id = c.officer_id
    WHERE f.user_id = $1
    ORDER BY f.created_at DESC
    LIMIT $2 OFFSET $3
  `;
  const r = await db.query(q, [userId, limit, offset]);
  return r.rows;
}

async function getComments(complaintId, currentUserId = null) {
  const q = `
    SELECT cm.id, cm.complaint_id, cm.user_id, cm.comment, cm.is_anonymous, cm.status, cm.created_at,
           u.name as user_name, u.role as user_role, u.avatar_url as user_avatar, u.settings as user_settings
    FROM complaint_comments cm
    LEFT JOIN users u ON u.id = cm.user_id
    WHERE cm.complaint_id = $1 AND (cm.status IS NULL OR cm.status != 'hidden')
    ORDER BY cm.created_at ASC
  `;
  const r = await db.query(q, [complaintId]);
  return r.rows.map(row => {
    let settings = {};
    try {
      settings = typeof row.user_settings === 'string' ? JSON.parse(row.user_settings) : (row.user_settings || {});
    } catch(e) { settings = {}; }

    if (row.is_anonymous && row.user_id !== currentUserId) {
      return {
        id: row.id,
        complaint_id: row.complaint_id,
        user_id: null,
        comment: row.comment,
        is_anonymous: true,
        status: row.status,
        created_at: row.created_at,
        user_name: 'Anonymous Citizen',
        user_avatar: null,
        user_role: 'citizen'
      };
    }

    let displayName = row.user_name || 'Citizen';
    if (row.user_role === 'citizen') {
      if (settings.publicNickname && settings.publicNickname.trim()) {
        displayName = settings.publicNickname.trim();
      } else if (row.user_name) {
        const parts = row.user_name.trim().split(' ');
        displayName = parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : parts[0];
      }
    }

    return {
      id: row.id,
      complaint_id: row.complaint_id,
      user_id: row.user_id,
      comment: row.comment,
      is_anonymous: !!row.is_anonymous,
      status: row.status || 'visible',
      created_at: row.created_at,
      user_name: displayName,
      user_avatar: row.is_anonymous ? null : row.user_avatar,
      user_role: row.user_role
    };
  });
}

async function addComment(complaintId, userId, comment, isAnonymous = false) {
  // Strip HTML / script tags
  const sanitizedComment = String(comment || '').replace(/<[^>]*>?/gm, '').trim();
  const q = `
    INSERT INTO complaint_comments (complaint_id, user_id, comment, is_anonymous, status, created_at)
    VALUES ($1, $2, $3, $4, 'visible', now())
    RETURNING *
  `;
  const r = await db.query(q, [complaintId, userId, sanitizedComment, isAnonymous]);
  const userRes = await db.query('SELECT name, role, avatar_url, settings FROM users WHERE id=$1', [userId]);
  const user = userRes.rows[0] || {};
  let settings = {};
  try {
    settings = typeof user.settings === 'string' ? JSON.parse(user.settings) : (user.settings || {});
  } catch(e) { settings = {}; }

  let displayName = user.name || 'Citizen';
  if (isAnonymous) {
    displayName = 'Anonymous Citizen';
  } else if (settings.publicNickname && settings.publicNickname.trim()) {
    displayName = settings.publicNickname.trim();
  }

  return {
    ...r.rows[0],
    user_name: displayName,
    user_role: user.role,
    user_avatar: isAnonymous ? null : user.avatar_url
  };
}

async function reportComment(commentId, reporterId, reason) {
  const q = `
    INSERT INTO comment_reports (comment_id, reporter_id, reason, status, created_at)
    VALUES ($1, $2, $3, 'pending', now())
    ON CONFLICT (comment_id, reporter_id) DO UPDATE SET reason = EXCLUDED.reason, created_at = now()
    RETURNING *
  `;
  const r = await db.query(q, [commentId, reporterId, String(reason || 'Inappropriate content').trim()]);
  return r.rows[0];
}

async function getCitizenActivity(userId, limit = 20) {
  const q = `
    (
      SELECT 'complaint_created' as action_type, id as reference_id, title as title, category as meta, created_at, status as status
      FROM complaints
      WHERE user_id = $1
    )
    UNION ALL
    (
      SELECT 'complaint_voted' as action_type, c.id as reference_id, c.title as title, c.category as meta, v.created_at, c.status as status
      FROM complaint_votes v
      JOIN complaints c ON c.id = v.complaint_id
      WHERE v.user_id = $1
    )
    UNION ALL
    (
      SELECT 'complaint_commented' as action_type, c.id as reference_id, c.title as title, cm.comment as meta, cm.created_at, c.status as status
      FROM complaint_comments cm
      JOIN complaints c ON c.id = cm.complaint_id
      WHERE cm.user_id = $1
    )
    UNION ALL
    (
      SELECT 'complaint_followed' as action_type, c.id as reference_id, c.title as title, c.category as meta, f.created_at, c.status as status
      FROM complaint_follows f
      JOIN complaints c ON c.id = f.complaint_id
      WHERE f.user_id = $1
    )
    UNION ALL
    (
      SELECT 'resolution_verified' as action_type, reference_id, 'Resolution Verified' as title, 'Earned +5 Contribution Points' as meta, created_at, 'closed' as status
      FROM citizen_contribution_events
      WHERE user_id = $1 AND event_type = 'RESOLUTION_VERIFIED'
    )
    ORDER BY created_at DESC
    LIMIT $2
  `;
  const r = await db.query(q, [userId, limit]);
  return r.rows;
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
  getOfficerDashboardStats,
  getTimeline,
  addStatusHistory,
  getComplaintVotes,
  toggleVote,
  getComplaintFollow,
  toggleFollow,
  listFollowedComplaints,
  getComments,
  addComment,
  reportComment,
  getCitizenActivity
};
