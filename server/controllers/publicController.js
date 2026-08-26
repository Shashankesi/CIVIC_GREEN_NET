const db = require('../config/db');
const { success, error } = require('../utils/response');
const { getCategoryAliases, normalizeCategory, normalizeStatusFilter } = require('../constants/categories');

// Lightweight in-memory cache with TTL for public aggregate endpoints
const cache = {
  stats: { data: null, expiresAt: 0 },
  categories: { data: null, expiresAt: 0 },
  impact: { data: null, expiresAt: 0 },
  activity: { data: null, expiresAt: 0 }
};

const CACHE_TTL_MS = 15 * 1000; // 15 seconds

function getCached(key) {
  const item = cache[key];
  if (item && item.expiresAt > Date.now()) {
    return item.data;
  }
  return null;
}

function setCache(key, data, ttlMs = CACHE_TTL_MS) {
  cache[key] = {
    data,
    expiresAt: Date.now() + ttlMs
  };
}

function invalidatePublicCache() {
  cache.stats = { data: null, expiresAt: 0 };
  cache.categories = { data: null, expiresAt: 0 };
  cache.impact = { data: null, expiresAt: 0 };
  cache.activity = { data: null, expiresAt: 0 };
}

// ---- Standard public metadata (existing) ----
async function getDepartments(req, res, next) {
  try {
    const r = await db.query('SELECT id, name FROM departments ORDER BY name');
    return res.json({ data: r.rows });
  } catch (err) {
    next(err);
  }
}

async function getMunicipalities(req, res, next) {
  try {
    const r = await db.query('SELECT id, name FROM municipalities ORDER BY name');
    return res.json({ data: r.rows });
  } catch (err) {
    next(err);
  }
}

async function getZones(req, res, next) {
  try {
    const municipalityId = parseInt(req.params.municipalityId, 10);
    if (isNaN(municipalityId)) {
      return res.status(400).json({ message: 'Invalid municipality ID' });
    }
    const r = await db.query('SELECT id, name FROM zones WHERE municipality_id = $1 ORDER BY name', [municipalityId]);
    return res.json({ data: r.rows });
  } catch (err) {
    next(err);
  }
}

async function getWards(req, res, next) {
  try {
    const zoneId = parseInt(req.params.zoneId, 10);
    if (isNaN(zoneId)) {
      return res.status(400).json({ message: 'Invalid zone ID' });
    }
    const r = await db.query('SELECT id, name FROM wards WHERE zone_id = $1 ORDER BY name', [zoneId]);
    return res.json({ data: r.rows });
  } catch (err) {
    next(err);
  }
}

const VALID_DESIGNATIONS = [
  'Municipal Officer',
  'Senior Municipal Officer',
  'Field Inspector',
  'Ward Officer',
  'Sanitation Officer',
  'Environmental Officer',
  'Waste Management Officer',
  'Public Works Officer',
  'Water & Utilities Officer',
  'Health & Safety Officer',
  'Administrative Officer'
];

async function getDesignations(req, res, next) {
  try {
    return res.json({ data: VALID_DESIGNATIONS });
  } catch (err) {
    next(err);
  }
}

// ---- Live Public Stats ----
// GET /api/public/stats
async function getPublicStats(req, res, next) {
  try {
    const cached = getCached('stats');
    if (cached) {
      return success(res, cached);
    }

    const [complaintsRes, deptsRes, officersRes] = await Promise.all([
      db.query(`
        SELECT 
          COUNT(*)::int as total,
          COUNT(*) FILTER (WHERE status = 'open')::int as open,
          COUNT(*) FILTER (WHERE status = 'in_progress')::int as in_progress,
          COUNT(*) FILTER (WHERE status = 'resolved')::int as resolved,
          COUNT(*) FILTER (WHERE status = 'closed')::int as closed,
          COUNT(*) FILTER (WHERE status IN ('resolved', 'closed'))::int as completed,
          COALESCE(
            AVG(CASE WHEN status IN ('resolved', 'closed') AND resolution_at IS NOT NULL 
                THEN EXTRACT(EPOCH FROM (resolution_at - created_at)) / 3600.0 
                WHEN status IN ('resolved', 'closed') 
                THEN EXTRACT(EPOCH FROM (now() - created_at)) / 3600.0 
                END), 
            0
          ) as avg_resolution_hours
        FROM complaints
      `),
      db.query('SELECT COUNT(*)::int as total FROM departments'),
      db.query("SELECT COUNT(*)::int as total FROM users WHERE role = 'officer' AND status IN ('active', 'approved')")
    ]);

    const compRow = complaintsRes.rows[0] || {};
    const totalReports = compRow.total || 0;
    const openReports = compRow.open || 0;
    const inProgressReports = compRow.in_progress || 0;
    const resolvedOnly = compRow.resolved || 0;
    const closedOnly = compRow.closed || 0;
    const resolvedReports = compRow.completed || (resolvedOnly + closedOnly);
    const activeDepartments = deptsRes.rows[0]?.total || 0;
    const activeOfficers = officersRes.rows[0]?.total || 0;

    const resolutionRate = totalReports > 0 
      ? Math.round((resolvedReports / totalReports) * 1000) / 10 
      : null;
    const rawAvgHours = parseFloat(compRow.avg_resolution_hours);
    const avgResolutionHours = (resolvedReports > 0 && !isNaN(rawAvgHours) && rawAvgHours > 0)
      ? Math.round(rawAvgHours * 10) / 10
      : null;

    const result = {
      totalReports,
      openReports,
      inProgressReports,
      resolvedReports,
      activeOfficers,
      departments: activeDepartments,
      resolutionRate,
      avgResolutionHours,
      timestamp: new Date().toISOString()
    };

    setCache('stats', result, CACHE_TTL_MS);
    return success(res, result);
  } catch (err) {
    next(err);
  }
}

// ---- Live Public Activity ----
// GET /api/public/activity
async function getPublicActivity(req, res, next) {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 30);
    const cached = getCached('activity');
    if (cached && !req.query.limit) {
      return success(res, cached);
    }

    // Return only public-safe fields (sanitized area, no email, no phone, no internal notes)
    const q = `
      SELECT 
        c.id,
        c.title,
        c.category,
        c.status,
        c.priority,
        c.address,
        c.created_at,
        COALESCE(c.resolution_at, c.assigned_at, c.created_at) as updated_at,
        d.name as department_name
      FROM complaints c
      LEFT JOIN departments d ON d.id = c.department_id
      WHERE c.status != 'rejected'
      ORDER BY c.created_at DESC
      LIMIT $1
    `;
    const r = await db.query(q, [limit]);

    // Format sanitized area / snippet
    const items = r.rows.map(row => {
      let area = 'Local Area';
      if (row.address) {
        // Extract street or first 2 parts of address without private house numbers
        const parts = row.address.split(',').map(s => s.trim()).filter(Boolean);
        if (parts.length > 0) {
          area = parts.slice(0, 2).join(', ');
        }
      }

      return {
        id: row.id,
        title: row.title || `${row.category || 'Civic'} Issue`,
        category: row.category || 'general',
        status: row.status || 'open',
        priority: row.priority || 'medium',
        area,
        departmentName: row.department_name || null,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
    });

    if (!req.query.limit) {
      setCache('activity', items, 15 * 1000); // 15s cache
    }

    return success(res, items);
  } catch (err) {
    next(err);
  }
}

// ---- Recent Public Complaint Cards ----
// GET /api/public/recent
async function getPublicRecent(req, res, next) {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 6, 12);

    const q = `
      SELECT 
        c.id,
        c.title,
        c.summary,
        c.description,
        c.category,
        c.status,
        c.priority,
        c.address,
        c.created_at,
        c.resolution_at,
        (
          SELECT url FROM complaint_images ci 
          WHERE ci.complaint_id = c.id 
          ORDER BY ci.created_at ASC 
          LIMIT 1
        ) as image_url
      FROM complaints c
      WHERE c.status != 'rejected'
      ORDER BY c.created_at DESC
      LIMIT $1
    `;
    const r = await db.query(q, [limit]);

    const items = r.rows.map(row => {
      let area = 'Civic Area';
      if (row.address) {
        const parts = row.address.split(',').map(s => s.trim()).filter(Boolean);
        if (parts.length > 0) area = parts.slice(0, 2).join(', ');
      }

      return {
        id: row.id,
        title: row.title || `${row.category || 'Civic'} Report`,
        summary: row.summary || (row.description ? row.description.substring(0, 120) + '...' : ''),
        category: row.category || 'general',
        status: row.status || 'open',
        priority: row.priority || 'medium',
        area,
        imageUrl: row.image_url || null,
        createdAt: row.created_at,
        resolvedAt: row.resolution_at || null
      };
    });

    return success(res, items);
  } catch (err) {
    next(err);
  }
}

// ---- Public Map Data ----
// GET /api/public/map
async function getPublicMap(req, res, next) {
  try {
    const { minLng, minLat, maxLng, maxLat, category, status, priority } = req.query;
    const limit = Math.min(parseInt(req.query.limit, 10) || 300, 500);

    const conditions = ['c.location IS NOT NULL'];
    const vals = [];
    let idx = 1;

    if (minLng && minLat && maxLng && maxLat) {
      const minX = parseFloat(minLng);
      const minY = parseFloat(minLat);
      const maxX = parseFloat(maxLng);
      const maxY = parseFloat(maxLat);
      if (!isNaN(minX) && !isNaN(minY) && !isNaN(maxX) && !isNaN(maxY)) {
        conditions.push(`c.location && ST_MakeEnvelope($${idx++}, $${idx++}, $${idx++}, $${idx++}, 4326)`);
        vals.push(minX, minY, maxX, maxY);
      }
    }

    if (category && category !== 'all' && category !== 'ALL') {
      const catAliases = getCategoryAliases(category);
      if (catAliases && catAliases.length) {
        conditions.push(`LOWER(c.category) = ANY($${idx++})`);
        vals.push(catAliases);
      }
    }

    if (status && status !== 'all' && status !== 'ALL') {
      const matchingStatuses = normalizeStatusFilter(status);
      if (matchingStatuses && matchingStatuses.length) {
        conditions.push(`c.status = ANY($${idx++})`);
        vals.push(matchingStatuses);
      }
    }

    if (priority && priority !== 'all') {
      conditions.push(`c.priority = $${idx++}`);
      vals.push(priority);
    }

    const where = `WHERE ${conditions.join(' AND ')}`;
    vals.push(limit);

    const q = `
      SELECT 
        c.id,
        c.title,
        c.summary,
        c.category,
        c.priority,
        c.status,
        c.address,
        ST_X(c.location::geometry) AS lng,
        ST_Y(c.location::geometry) AS lat,
        c.created_at,
        (
          SELECT url FROM complaint_images ci 
          WHERE ci.complaint_id = c.id 
          ORDER BY ci.created_at ASC 
          LIMIT 1
        ) as image_url
      FROM complaints c
      ${where}
      ORDER BY c.created_at DESC
      LIMIT $${idx}
    `;

    const r = await db.query(q, vals);
    const items = r.rows.map(row => ({
      id: row.id,
      title: row.title || `${row.category || 'Civic'} Report`,
      summary: row.summary || '',
      category: row.category || 'general',
      priority: row.priority || 'medium',
      status: row.status || 'open',
      lat: parseFloat(row.lat),
      lng: parseFloat(row.lng),
      address: row.address || '',
      imageUrl: row.image_url || null,
      createdAt: row.created_at
    }));

    return success(res, items);
  } catch (err) {
    next(err);
  }
}

// ---- Category Distribution Analytics ----
// GET /api/public/categories
async function getPublicCategories(req, res, next) {
  try {
    const cached = getCached('categories');
    if (cached) {
      return success(res, cached);
    }

    const q = `
      SELECT 
        COALESCE(NULLIF(category, ''), 'general') as raw_category,
        COUNT(*)::int as count,
        COUNT(*) FILTER (WHERE status IN ('resolved', 'closed'))::int as resolved_count
      FROM complaints
      GROUP BY COALESCE(NULLIF(category, ''), 'general')
      ORDER BY count DESC
    `;
    const r = await db.query(q);

    // Normalize categories into canonical buckets
    const aggregated = {};
    for (const row of r.rows) {
      const canonicalKey = normalizeCategory(row.raw_category);
      if (!aggregated[canonicalKey]) {
        aggregated[canonicalKey] = {
          category: canonicalKey,
          count: 0,
          resolvedCount: 0
        };
      }
      aggregated[canonicalKey].count += (row.count || 0);
      aggregated[canonicalKey].resolvedCount += (row.resolved_count || 0);
    }

    const totalCount = Object.values(aggregated).reduce((sum, item) => sum + item.count, 0);
    const items = Object.values(aggregated)
      .sort((a, b) => b.count - a.count)
      .map(item => ({
        category: item.category,
        count: item.count,
        resolvedCount: item.resolvedCount,
        percentage: totalCount > 0 ? Math.round((item.count / totalCount) * 100) : 0,
        resolvedRate: item.count > 0 ? Math.round((item.resolvedCount / item.count) * 100) : 0
      }));

    setCache('categories', items, CACHE_TTL_MS);
    return success(res, items);
  } catch (err) {
    next(err);
  }
}

// ---- City Impact Metrics ----
// GET /api/public/impact
async function getPublicImpact(req, res, next) {
  try {
    const cached = getCached('impact');
    if (cached) {
      return success(res, cached);
    }

    const [statsRes, deptRes, officerRes] = await Promise.all([
      db.query(`
        SELECT 
          COUNT(*)::int as total_reports,
          COUNT(*) FILTER (WHERE status IN ('resolved', 'closed'))::int as resolved_reports,
          COUNT(*) FILTER (WHERE status = 'in_progress')::int as in_progress_reports,
          COALESCE(
            AVG(CASE WHEN status IN ('resolved', 'closed') AND resolution_at IS NOT NULL 
                THEN EXTRACT(EPOCH FROM (resolution_at - created_at)) / 3600.0 
                WHEN status IN ('resolved', 'closed') 
                THEN EXTRACT(EPOCH FROM (now() - created_at)) / 3600.0 
                END), 
            0
          ) as avg_resolution_hours
        FROM complaints
      `),
      db.query('SELECT COUNT(*)::int as total FROM departments'),
      db.query("SELECT COUNT(*)::int as total FROM users WHERE role = 'officer' AND status IN ('active', 'approved')")
    ]);

    const row = statsRes.rows[0] || {};
    const totalReports = row.total_reports || 0;
    const resolvedReports = row.resolved_reports || 0;
    const inProgressReports = row.in_progress_reports || 0;
    const departments = deptRes.rows[0]?.total || 0;
    const activeOfficers = officerRes.rows[0]?.total || 0;

    const resolutionRate = totalReports > 0 ? Math.round((resolvedReports / totalReports) * 100) : null;
    const rawAvg = parseFloat(row.avg_resolution_hours);
    const avgResolutionHours = (resolvedReports > 0 && !isNaN(rawAvg) && rawAvg > 0)
      ? Math.round(rawAvg * 10) / 10
      : null;

    const result = {
      totalReports,
      resolvedReports,
      inProgressReports,
      departments,
      activeOfficers,
      resolutionRate,
      avgResolutionHours,
      timestamp: new Date().toISOString()
    };

    setCache('impact', result, CACHE_TTL_MS);
    return success(res, result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getDepartments,
  getMunicipalities,
  getZones,
  getWards,
  getDesignations,
  VALID_DESIGNATIONS,
  getPublicStats,
  getPublicActivity,
  getPublicRecent,
  getPublicMap,
  getPublicCategories,
  getPublicImpact,
  invalidatePublicCache
};
