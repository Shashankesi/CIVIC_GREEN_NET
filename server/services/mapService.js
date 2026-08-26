const db = require('../config/db');
const logger = require('../utils/logger');
const { analyzeHotspots } = require('./ai/hotspotAnalyzer');
const { detectRecurringIssues } = require('./ai/recurringIssueDetector');
const { getDuplicateClusters } = require('./ai/duplicateClustering');
const { getCategoryAliases, normalizeStatusFilter } = require('../constants/categories');

/**
 * Helper to build timeframe WHERE clause
 */
function getTimeframeInterval(timeframe) {
  switch (String(timeframe || '').toLowerCase()) {
    case '7d': return `INTERVAL '7 days'`;
    case '30d': return `INTERVAL '30 days'`;
    case '90d': return `INTERVAL '90 days'`;
    case '6m': return `INTERVAL '180 days'`;
    case '1y': return `INTERVAL '365 days'`;
    default: return null;
  }
}

/**
 * 1. Bounding Box Complaint Retrieval with Filters and Privacy Masking
 */
async function getBboxComplaints(minLng, minLat, maxLng, maxLat, {
  status = null,
  category = null,
  priority = null,
  departmentId = null,
  officerId = null,
  slaRisk = null,
  timeframe = null,
  search = null,
  limit = 100,
  offset = 0
} = {}, userRole = 'citizen') {
  if (!db._pool) return [];

  const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 100, 1), 300);
  const parsedOffset = Math.max(parseInt(offset, 10) || 0, 0);

  const conditions = [
    `c.location IS NOT NULL`,
    `c.location::geometry && ST_MakeEnvelope($1, $2, $3, $4, 4326)`
  ];
  const params = [
    parseFloat(minLng),
    parseFloat(minLat),
    parseFloat(maxLng),
    parseFloat(maxLat)
  ];

  if (status && status !== 'all' && status !== 'null' && status !== 'undefined') {
    const matchingStatuses = normalizeStatusFilter(status);
    if (matchingStatuses && matchingStatuses.length) {
      params.push(matchingStatuses);
      conditions.push(`c.status = ANY($${params.length})`);
    }
  }

  if (category && category !== 'all' && category !== 'null' && category !== 'undefined') {
    const catAliases = getCategoryAliases(category);
    if (catAliases && catAliases.length) {
      params.push(catAliases);
      conditions.push(`LOWER(c.category) = ANY($${params.length})`);
    }
  }

  if (priority && priority !== 'all' && priority !== 'null' && priority !== 'undefined') {
    params.push(priority.toLowerCase());
    conditions.push(`LOWER(c.priority) = $${params.length}`);
  }

  if (departmentId && departmentId !== 'all' && departmentId !== 'null' && departmentId !== 'undefined') {
    params.push(parseInt(departmentId, 10));
    conditions.push(`c.department_id = $${params.length}`);
  }

  if (officerId && officerId !== 'all' && officerId !== 'null' && officerId !== 'undefined') {
    params.push(parseInt(officerId, 10));
    conditions.push(`c.officer_id = $${params.length}`);
  }

  if (slaRisk) {
    if (slaRisk === 'overdue') {
      conditions.push(`c.status NOT IN ('resolved', 'closed', 'rejected') AND c.sla_due_at IS NOT NULL AND c.sla_due_at < now()`);
    } else if (slaRisk === 'due_soon') {
      conditions.push(`c.status NOT IN ('resolved', 'closed', 'rejected') AND c.sla_due_at IS NOT NULL AND c.sla_due_at >= now() AND c.sla_due_at <= now() + INTERVAL '24 hours'`);
    } else if (slaRisk === 'on_time') {
      conditions.push(`c.status NOT IN ('resolved', 'closed', 'rejected') AND (c.sla_due_at IS NULL OR c.sla_due_at > now() + INTERVAL '24 hours')`);
    }
  }

  const interval = getTimeframeInterval(timeframe);
  if (interval) {
    conditions.push(`c.created_at >= now() - ${interval}`);
  }

  if (search && search.trim()) {
    params.push(`%${search.trim().toLowerCase()}%`);
    conditions.push(`(
      LOWER(c.title) LIKE $${params.length} 
      OR LOWER(COALESCE(c.address, '')) LIKE $${params.length}
      OR CAST(c.id AS TEXT) = $${params.length - 1 + 1}
    )`);
  }

  params.push(parsedLimit);
  const limitPlaceholder = `$${params.length}`;
  params.push(parsedOffset);
  const offsetPlaceholder = `$${params.length}`;

  const query = `
    SELECT 
      c.id,
      c.title,
      c.category,
      c.priority,
      c.status,
      c.address,
      c.created_at,
      c.sla_due_at,
      c.department_id,
      d.name AS department_name,
      ST_Y(c.location::geometry) AS lat,
      ST_X(c.location::geometry) AS lng,
      CASE 
        WHEN c.status NOT IN ('resolved', 'closed', 'rejected') AND c.sla_due_at IS NOT NULL AND c.sla_due_at < now() THEN 'overdue'
        WHEN c.status NOT IN ('resolved', 'closed', 'rejected') AND c.sla_due_at IS NOT NULL AND c.sla_due_at <= now() + INTERVAL '24 hours' THEN 'due_soon'
        WHEN c.status IN ('resolved', 'closed') THEN 'resolved'
        ELSE 'on_time'
      END AS sla_status,
      COALESCE((SELECT url FROM complaint_images WHERE complaint_id = c.id LIMIT 1), NULL) AS image_url,
      COALESCE((SELECT COUNT(*)::int FROM complaint_votes WHERE complaint_id = c.id), 0) AS upvotes,
      COALESCE((SELECT COUNT(*)::int FROM complaint_follows WHERE complaint_id = c.id), 0) AS followers
      ${userRole === 'admin' || userRole === 'officer' ? `,
        c.user_id,
        u.name AS citizen_name,
        c.officer_id,
        off.name AS officer_name,
        ai.confidence AS ai_confidence,
        ai.reason AS ai_reason
      ` : ''}
    FROM complaints c
    LEFT JOIN departments d ON d.id = c.department_id
    ${userRole === 'admin' || userRole === 'officer' ? `
      LEFT JOIN users u ON u.id = c.user_id
      LEFT JOIN users off ON off.id = c.officer_id
      LEFT JOIN ai_analysis ai ON ai.complaint_id = c.id
    ` : ''}
    WHERE ${conditions.join(' AND ')}
    ORDER BY c.created_at DESC
    LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder};
  `;

  try {
    const res = await db.query(query, params);
    return res.rows.map(row => ({
      id: row.id,
      ticketId: `CGN-${String(row.id).padStart(5, '0')}`,
      title: row.title,
      category: row.category,
      priority: row.priority,
      status: row.status,
      address: row.address || 'Municipal Area',
      lat: parseFloat(row.lat),
      lng: parseFloat(row.lng),
      createdAt: row.created_at,
      slaDueAt: row.sla_due_at,
      slaStatus: row.sla_status,
      departmentId: row.department_id,
      departmentName: row.department_name || 'General Operations',
      imageUrl: row.image_url,
      upvotes: row.upvotes,
      followers: row.followers,
      ...(userRole === 'admin' || userRole === 'officer' ? {
        citizenName: row.citizen_name,
        officerId: row.officer_id,
        officerName: row.officer_name,
        aiConfidence: row.ai_confidence,
        aiReason: row.ai_reason
      } : {})
    }));
  } catch (err) {
    logger.error('[MapService getBboxComplaints Error]', { err: err.message });
    return [];
  }
}

/**
 * 2. Server-side Spatial Clustering (for Low/Mid zoom levels)
 */
async function getSpatialClusters(minLng, minLat, maxLng, maxLat, zoom = 10, {
  status = null,
  category = null,
  priority = null
} = {}) {
  if (!db._pool) return [];

  // Zoom-adaptive grid size in degrees (~111km per degree)
  // zoom 6 -> ~0.2 deg, zoom 10 -> ~0.02 deg, zoom 14 -> ~0.003 deg
  const z = Math.min(Math.max(parseInt(zoom, 10) || 10, 3), 18);
  const gridSize = Math.max(0.001, 1.5 / Math.pow(2, z - 3));

  const conditions = [
    `c.location IS NOT NULL`,
    `c.location::geometry && ST_MakeEnvelope($1, $2, $3, $4, 4326)`
  ];
  const params = [parseFloat(minLng), parseFloat(minLat), parseFloat(maxLng), parseFloat(maxLat), gridSize];

  if (status && status !== 'all' && status !== 'null' && status !== 'undefined') {
    const matchingStatuses = normalizeStatusFilter(status);
    if (matchingStatuses && matchingStatuses.length) {
      params.push(matchingStatuses);
      conditions.push(`c.status = ANY($${params.length})`);
    }
  }
  if (category && category !== 'all' && category !== 'null' && category !== 'undefined') {
    const catAliases = getCategoryAliases(category);
    if (catAliases && catAliases.length) {
      params.push(catAliases);
      conditions.push(`LOWER(c.category) = ANY($${params.length})`);
    }
  }
  if (priority && priority !== 'all' && priority !== 'null' && priority !== 'undefined') {
    params.push(priority.toLowerCase());
    conditions.push(`LOWER(c.priority) = $${params.length}`);
  }

  const query = `
    SELECT 
      ST_Y(ST_Centroid(ST_Collect(c.location::geometry))) AS lat,
      ST_X(ST_Centroid(ST_Collect(c.location::geometry))) AS lng,
      COUNT(*)::int AS count,
      MODE() WITHIN GROUP (ORDER BY c.category) AS dominant_category,
      COUNT(CASE WHEN c.priority IN ('high', 'urgent', 'critical') THEN 1 END)::int AS critical_count,
      COUNT(CASE WHEN c.status NOT IN ('resolved', 'closed', 'rejected') AND c.sla_due_at IS NOT NULL AND c.sla_due_at < now() THEN 1 END)::int AS overdue_count
    FROM complaints c
    WHERE ${conditions.join(' AND ')}
    GROUP BY ST_SnapToGrid(c.location::geometry, $5)
    ORDER BY count DESC
    LIMIT 200;
  `;

  try {
    const res = await db.query(query, params);
    return res.rows.map((row, idx) => ({
      id: `cluster-${idx + 1}`,
      lat: parseFloat(row.lat),
      lng: parseFloat(row.lng),
      count: row.count,
      dominantCategory: row.dominant_category || 'other',
      criticalCount: row.critical_count || 0,
      overdueCount: row.overdue_count || 0
    }));
  } catch (err) {
    logger.error('[MapService getSpatialClusters Error]', { err: err.message });
    return [];
  }
}

/**
 * 3. Weighted Heatmap Data
 */
async function getHeatmapData(bbox = null, zoom = 10, weightBy = 'density', filters = {}) {
  if (!db._pool) return [];

  try {
    const conditions = [`c.location IS NOT NULL`];
    const params = [];

    if (bbox && bbox.length === 4) {
      params.push(parseFloat(bbox[0]), parseFloat(bbox[1]), parseFloat(bbox[2]), parseFloat(bbox[3]));
      conditions.push(`c.location::geometry && ST_MakeEnvelope($1, $2, $3, $4, 4326)`);
    }

    if (filters.category && filters.category !== 'all' && filters.category !== 'null' && filters.category !== 'undefined') {
      const catAliases = getCategoryAliases(filters.category);
      if (catAliases && catAliases.length) {
        params.push(catAliases);
        conditions.push(`LOWER(c.category) = ANY($${params.length})`);
      }
    }

    if (filters.status && filters.status !== 'all' && filters.status !== 'null' && filters.status !== 'undefined') {
      const matchingStatuses = normalizeStatusFilter(filters.status);
      if (matchingStatuses && matchingStatuses.length) {
        params.push(matchingStatuses);
        conditions.push(`c.status = ANY($${params.length})`);
      }
    }

    const query = `
      SELECT 
        ST_Y(c.location::geometry) AS lat,
        ST_X(c.location::geometry) AS lng,
        c.priority,
        c.status,
        c.created_at
      FROM complaints c
      WHERE ${conditions.join(' AND ')}
      LIMIT 1000;
    `;

    const res = await db.query(query, params);

    return res.rows.map(row => {
      let weight = 0.5;
      if (weightBy === 'priority') {
        if (row.priority === 'critical') weight = 1.0;
        else if (row.priority === 'high') weight = 0.8;
        else if (row.priority === 'medium') weight = 0.5;
        else weight = 0.3;
      } else if (weightBy === 'unresolved') {
        weight = (row.status === 'resolved' || row.status === 'closed') ? 0.2 : 0.9;
      } else {
        weight = 0.6;
      }

      return [
        parseFloat(row.lat),
        parseFloat(row.lng),
        weight
      ];
    });
  } catch (err) {
    logger.error('[MapService getHeatmapData Error]', { err: err.message });
    return [];
  }
}

/**
 * 4. AI Hotspots Layer
 */
async function getHotspotLayers(days = 30, category = null) {
  try {
    const hotspots = await analyzeHotspots({ days, category });
    return hotspots;
  } catch (err) {
    logger.error('[MapService getHotspotLayers Error]', { err: err.message });
    return [];
  }
}

/**
 * 5. SLA Risk Geographic Layer
 */
async function getSlaRiskLayer(bbox = null) {
  if (!db._pool) return { overdue: [], dueSoon: [], onTime: [], summary: {} };

  try {
    const conditions = [
      `c.location IS NOT NULL`,
      `c.status NOT IN ('resolved', 'closed', 'rejected')`
    ];
    const params = [];

    if (bbox && bbox.length === 4) {
      params.push(parseFloat(bbox[0]), parseFloat(bbox[1]), parseFloat(bbox[2]), parseFloat(bbox[3]));
      conditions.push(`c.location::geometry && ST_MakeEnvelope($1, $2, $3, $4, 4326)`);
    }

    const query = `
      SELECT 
        c.id,
        c.title,
        c.category,
        c.priority,
        c.status,
        c.address,
        c.sla_due_at,
        d.name AS department_name,
        ST_Y(c.location::geometry) AS lat,
        ST_X(c.location::geometry) AS lng,
        CASE 
          WHEN c.sla_due_at IS NOT NULL AND c.sla_due_at < now() THEN 'overdue'
          WHEN c.sla_due_at IS NOT NULL AND c.sla_due_at <= now() + INTERVAL '24 hours' THEN 'due_soon'
          ELSE 'on_time'
        END AS risk_tier
      FROM complaints c
      LEFT JOIN departments d ON d.id = c.department_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY c.sla_due_at ASC NULLS LAST
      LIMIT 300;
    `;

    const res = await db.query(query, params);

    const overdue = [];
    const dueSoon = [];
    const onTime = [];

    res.rows.forEach(r => {
      const item = {
        id: r.id,
        ticketId: `CGN-${String(r.id).padStart(5, '0')}`,
        title: r.title,
        category: r.category,
        priority: r.priority,
        status: r.status,
        address: r.address,
        slaDueAt: r.sla_due_at,
        departmentName: r.department_name || 'General Operations',
        lat: parseFloat(r.lat),
        lng: parseFloat(r.lng),
        riskTier: r.risk_tier
      };

      if (r.risk_tier === 'overdue') overdue.push(item);
      else if (r.risk_tier === 'due_soon') dueSoon.push(item);
      else onTime.push(item);
    });

    return {
      overdue,
      dueSoon,
      onTime,
      summary: {
        totalActive: res.rows.length,
        overdueCount: overdue.length,
        dueSoonCount: dueSoon.length,
        onTimeCount: onTime.length
      }
    };
  } catch (err) {
    logger.error('[MapService getSlaRiskLayer Error]', { err: err.message });
    return { overdue: [], dueSoon: [], onTime: [], summary: {} };
  }
}

/**
 * 6. Duplicate Complaint Clusters Map Layer
 */
async function getDuplicateClusterLayer() {
  try {
    const clusters = await getDuplicateClusters();
    return clusters;
  } catch (err) {
    logger.error('[MapService getDuplicateClusterLayer Error]', { err: err.message });
    return [];
  }
}

/**
 * 7. Recurring Issue Zones Map Layer
 */
async function getRecurringIssueLayer(days = 60) {
  try {
    const issues = await detectRecurringIssues(days);
    return issues;
  } catch (err) {
    logger.error('[MapService getRecurringIssueLayer Error]', { err: err.message });
    return [];
  }
}

/**
 * 8. Ward Intelligence & Boundary Polygons
 */
async function getWardIntelligence() {
  if (!db._pool) return [];

  try {
    const query = `
      SELECT 
        w.id,
        w.name,
        w.zone_id,
        z.name AS zone_name,
        ST_AsGeoJSON(w.boundary)::json AS geojson,
        COUNT(c.id)::int AS total_complaints,
        COUNT(CASE WHEN c.status IN ('open', 'assigned') THEN 1 END)::int AS open_count,
        COUNT(CASE WHEN c.status = 'in_progress' THEN 1 END)::int AS in_progress_count,
        COUNT(CASE WHEN c.status IN ('resolved', 'closed') THEN 1 END)::int AS resolved_count,
        COUNT(CASE WHEN c.status NOT IN ('resolved', 'closed', 'rejected') AND c.sla_due_at IS NOT NULL AND c.sla_due_at < now() THEN 1 END)::int AS overdue_count,
        COUNT(CASE WHEN c.priority IN ('high', 'urgent', 'critical') THEN 1 END)::int AS critical_count,
        MODE() WITHIN GROUP (ORDER BY c.category) AS top_category
      FROM wards w
      LEFT JOIN zones z ON z.id = w.zone_id
      LEFT JOIN complaints c ON c.location IS NOT NULL AND w.boundary IS NOT NULL AND ST_Contains(w.boundary, c.location::geometry)
      GROUP BY w.id, w.name, w.zone_id, z.name, w.boundary
      ORDER BY w.id ASC;
    `;

    const res = await db.query(query);

    return res.rows.map(r => {
      const total = r.total_complaints || 0;
      const resolved = r.resolved_count || 0;
      const resRate = total > 0 ? Math.round((resolved / total) * 100) : 100;

      return {
        id: r.id,
        name: r.name,
        zoneId: r.zone_id,
        zoneName: r.zone_name,
        geojson: r.geojson,
        totalComplaints: total,
        openCount: r.open_count || 0,
        inProgressCount: r.in_progress_count || 0,
        resolvedCount: resolved,
        overdueCount: r.overdue_count || 0,
        criticalCount: r.critical_count || 0,
        resolutionRate: resRate,
        topCategory: r.top_category || 'General',
        status: (r.overdue_count || 0) >= 5 ? 'High Risk' : (r.open_count || 0) >= 10 ? 'Moderate' : 'Optimal'
      };
    });
  } catch (err) {
    logger.error('[MapService getWardIntelligence Error]', { err: err.message });
    return [];
  }
}

/**
 * 9. Zone Intelligence
 */
async function getZoneIntelligence() {
  if (!db._pool) return [];

  try {
    const query = `
      SELECT 
        z.id,
        z.name,
        z.municipality_id,
        m.name AS municipality_name,
        ST_AsGeoJSON(z.boundary)::json AS geojson,
        COUNT(c.id)::int AS total_complaints,
        COUNT(CASE WHEN c.status NOT IN ('resolved', 'closed', 'rejected') THEN 1 END)::int AS active_count,
        COUNT(CASE WHEN c.status = 'resolved' THEN 1 END)::int AS resolved_count
      FROM zones z
      LEFT JOIN municipalities m ON m.id = z.municipality_id
      LEFT JOIN complaints c ON c.location IS NOT NULL AND z.boundary IS NOT NULL AND ST_Contains(z.boundary, c.location::geometry)
      GROUP BY z.id, z.name, z.municipality_id, m.name, z.boundary
      ORDER BY z.id ASC;
    `;

    const res = await db.query(query);
    return res.rows.map(r => ({
      id: r.id,
      name: r.name,
      municipalityName: r.municipality_name,
      geojson: r.geojson,
      totalComplaints: r.total_complaints || 0,
      activeCount: r.active_count || 0,
      resolvedCount: r.resolved_count || 0
    }));
  } catch (err) {
    logger.error('[MapService getZoneIntelligence Error]', { err: err.message });
    return [];
  }
}

/**
 * 10. Department Jurisdiction & Workload
 */
async function getDepartmentJurisdiction() {
  if (!db._pool) return [];

  try {
    const query = `
      SELECT 
        d.id,
        d.name,
        d.description,
        ST_AsGeoJSON(d.boundary)::json AS geojson,
        COUNT(c.id)::int AS total_assigned,
        COUNT(CASE WHEN c.status IN ('open', 'assigned', 'in_progress') THEN 1 END)::int AS active_cases,
        COUNT(CASE WHEN c.status NOT IN ('resolved', 'closed', 'rejected') AND c.sla_due_at IS NOT NULL AND c.sla_due_at < now() THEN 1 END)::int AS overdue_cases
      FROM departments d
      LEFT JOIN complaints c ON c.department_id = d.id
      GROUP BY d.id, d.name, d.description, d.boundary
      ORDER BY active_cases DESC;
    `;

    const res = await db.query(query);
    return res.rows.map(r => ({
      id: r.id,
      name: r.name,
      description: r.description,
      geojson: r.geojson,
      totalAssigned: r.total_assigned || 0,
      activeCases: r.active_cases || 0,
      overdueCases: r.overdue_cases || 0
    }));
  } catch (err) {
    logger.error('[MapService getDepartmentJurisdiction Error]', { err: err.message });
    return [];
  }
}

/**
 * 11. Privacy-Safe Officer Operational Coverage
 */
async function getOfficerOperationalCoverage() {
  if (!db._pool) return [];

  try {
    const query = `
      SELECT 
        u.id,
        u.name,
        d.name AS department_name,
        COALESCE(u.availability, 'AVAILABLE') AS availability,
        COUNT(c.id)::int AS active_cases,
        COUNT(CASE WHEN c.priority IN ('high', 'urgent', 'critical') THEN 1 END)::int AS high_priority_cases,
        COUNT(CASE WHEN c.sla_due_at IS NOT NULL AND c.sla_due_at < now() AND c.status NOT IN ('resolved', 'closed') THEN 1 END)::int AS overdue_cases,
        AVG(ST_Y(c.location::geometry)) AS center_lat,
        AVG(ST_X(c.location::geometry)) AS center_lng
      FROM users u
      LEFT JOIN departments d ON d.id = u.department_id
      LEFT JOIN complaints c ON c.officer_id = u.id AND c.status IN ('assigned', 'in_progress', 'open')
      WHERE u.role = 'officer'
      GROUP BY u.id, u.name, d.name, COALESCE(u.availability, 'AVAILABLE')
      ORDER BY active_cases DESC;
    `;

    const res = await db.query(query);
    return res.rows.map(r => ({
      id: r.id,
      name: r.name,
      departmentName: r.department_name || 'Field Operations',
      availability: r.availability,
      activeCases: r.active_cases || 0,
      highPriorityCases: r.high_priority_cases || 0,
      overdueCases: r.overdue_cases || 0,
      operationalCenter: (r.center_lat && r.center_lng) ? {
        lat: parseFloat(r.center_lat),
        lng: parseFloat(r.center_lng)
      } : null
    }));
  } catch (err) {
    logger.error('[MapService getOfficerOperationalCoverage Error]', { err: err.message });
    return [];
  }
}

/**
 * 12. Nearby Complaints (ST_DWithin with exact distance)
 */
async function getNearbyComplaints(lat, lng, radiusMeters = 1000, {
  category = null,
  status = null,
  priority = null,
  limit = 50,
  offset = 0
} = {}, userRole = 'citizen') {
  if (!db._pool) return [];

  const parsedRadius = Math.min(Math.max(parseFloat(radiusMeters) || 1000, 100), 50000);
  const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);
  const parsedOffset = Math.max(parseInt(offset, 10) || 0, 0);

  const conditions = [
    `c.location IS NOT NULL`,
    `ST_DWithin(c.location::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $3)`
  ];
  const params = [parseFloat(lng), parseFloat(lat), parsedRadius];

  if (category && category !== 'all' && category !== 'null' && category !== 'undefined') {
    const catAliases = getCategoryAliases(category);
    if (catAliases && catAliases.length) {
      params.push(catAliases);
      conditions.push(`LOWER(c.category) = ANY($${params.length})`);
    }
  }

  if (status && status !== 'all' && status !== 'null' && status !== 'undefined') {
    const matchingStatuses = normalizeStatusFilter(status);
    if (matchingStatuses && matchingStatuses.length) {
      params.push(matchingStatuses);
      conditions.push(`c.status = ANY($${params.length})`);
    }
  }

  if (priority && priority !== 'all' && priority !== 'null' && priority !== 'undefined') {
    params.push(priority.toLowerCase());
    conditions.push(`LOWER(c.priority) = $${params.length}`);
  }

  params.push(parsedLimit);
  const limitPlaceholder = `$${params.length}`;
  params.push(parsedOffset);
  const offsetPlaceholder = `$${params.length}`;

  const query = `
    SELECT 
      c.id,
      c.title,
      c.category,
      c.priority,
      c.status,
      c.address,
      c.created_at,
      ST_Y(c.location::geometry) AS lat,
      ST_X(c.location::geometry) AS lng,
      ROUND(ST_Distance(c.location::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography))::int AS distance_meters,
      COALESCE((SELECT url FROM complaint_images WHERE complaint_id = c.id LIMIT 1), NULL) AS image_url,
      COALESCE((SELECT COUNT(*)::int FROM complaint_votes WHERE complaint_id = c.id), 0) AS upvotes,
      COALESCE((SELECT COUNT(*)::int FROM complaint_follows WHERE complaint_id = c.id), 0) AS followers
    FROM complaints c
    WHERE ${conditions.join(' AND ')}
    ORDER BY distance_meters ASC
    LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder};
  `;

  try {
    const res = await db.query(query, params);
    return res.rows.map(r => ({
      id: r.id,
      ticketId: `CGN-${String(r.id).padStart(5, '0')}`,
      title: r.title,
      category: r.category,
      priority: r.priority,
      status: r.status,
      address: r.address || 'Nearby Municipal Area',
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lng),
      distanceMeters: r.distance_meters,
      distanceFormatted: r.distance_meters < 1000 ? `${r.distance_meters} m` : `${(r.distance_meters / 1000).toFixed(1)} km`,
      imageUrl: r.image_url,
      upvotes: r.upvotes,
      followers: r.followers,
      createdAt: r.created_at
    }));
  } catch (err) {
    logger.error('[MapService getNearbyComplaints Error]', { err: err.message });
    return [];
  }
}

/**
 * 13. Geographic Spatial Trends (Period-over-Period)
 */
async function getGeographicTrends(timeframe = '30d') {
  if (!db._pool) return [];

  let days = 30;
  if (timeframe === '7d') days = 7;
  else if (timeframe === '90d') days = 90;
  else if (timeframe === '6m') days = 180;

  try {
    const query = `
      WITH current_period AS (
        SELECT 
          COALESCE(c.address, 'Ward Area') AS zone,
          c.category,
          COUNT(*)::int AS current_count
        FROM complaints c
        WHERE c.created_at >= now() - ($1 || ' days')::INTERVAL
          AND c.address IS NOT NULL AND TRIM(c.address) != ''
        GROUP BY COALESCE(c.address, 'Ward Area'), c.category
      ),
      previous_period AS (
        SELECT 
          COALESCE(c.address, 'Ward Area') AS zone,
          c.category,
          COUNT(*)::int AS prev_count
        FROM complaints c
        WHERE c.created_at >= now() - ($2 || ' days')::INTERVAL
          AND c.created_at < now() - ($1 || ' days')::INTERVAL
          AND c.address IS NOT NULL AND TRIM(c.address) != ''
        GROUP BY COALESCE(c.address, 'Ward Area'), c.category
      )
      SELECT 
        cp.zone,
        cp.category,
        cp.current_count,
        COALESCE(pp.prev_count, 0) AS prev_count
      FROM current_period cp
      LEFT JOIN previous_period pp ON pp.zone = cp.zone AND pp.category = cp.category
      ORDER BY cp.current_count DESC
      LIMIT 15;
    `;

    const res = await db.query(query, [days, days * 2]);
    return res.rows.map(r => {
      const prev = r.prev_count || 0;
      const curr = r.current_count;
      let trendPercentage = 0;
      if (prev > 0) trendPercentage = Math.round(((curr - prev) / prev) * 100);
      else if (curr > 1) trendPercentage = 100;

      return {
        zone: r.zone,
        category: r.category,
        currentReports: curr,
        previousReports: prev,
        trendPercentage,
        trendDisplay: trendPercentage >= 0 ? `+${trendPercentage}%` : `${trendPercentage}%`,
        direction: trendPercentage > 15 ? 'rising' : trendPercentage < -15 ? 'improving' : 'stable'
      };
    });
  } catch (err) {
    logger.error('[MapService getGeographicTrends Error]', { err: err.message });
    return [];
  }
}

/**
 * 14. AI Geographic Insights Summary
 */
async function getGeographicInsightsSummary() {
  if (!db._pool) return null;

  try {
    const counts = await db.query(`
      SELECT 
        COUNT(*)::int AS total,
        COUNT(CASE WHEN status NOT IN ('resolved', 'closed', 'rejected') THEN 1 END)::int AS active,
        COUNT(CASE WHEN status NOT IN ('resolved', 'closed', 'rejected') AND sla_due_at IS NOT NULL AND sla_due_at < now() THEN 1 END)::int AS overdue
      FROM complaints;
    `);

    const wardCount = await db.query(`SELECT COUNT(*)::int AS count FROM wards WHERE boundary IS NOT NULL;`);
    const hotspotList = await analyzeHotspots({ days: 30 });
    const clusters = await getDuplicateClusters();

    const c = counts.rows[0] || {};
    return {
      totalCityComplaints: c.total || 0,
      activeUnresolved: c.active || 0,
      slaBreaches: c.overdue || 0,
      coveredWards: wardCount.rows[0]?.count || 5,
      activeHotspotCount: hotspotList.length,
      duplicateClusterCount: clusters.length,
      criticalHotspotName: hotspotList[0]?.name || 'Sector 17 - Roads',
      primaryConcern: hotspotList[0]?.category || 'sanitation'
    };
  } catch (err) {
    logger.error('[MapService getGeographicInsightsSummary Error]', { err: err.message });
    return null;
  }
}

module.exports = {
  getBboxComplaints,
  getSpatialClusters,
  getHeatmapData,
  getHotspotLayers,
  getSlaRiskLayer,
  getDuplicateClusterLayer,
  getRecurringIssueLayer,
  getWardIntelligence,
  getZoneIntelligence,
  getDepartmentJurisdiction,
  getOfficerOperationalCoverage,
  getNearbyComplaints,
  getGeographicTrends,
  getGeographicInsightsSummary
};
