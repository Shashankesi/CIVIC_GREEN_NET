const db = require('../../config/db');
const logger = require('../../utils/logger');
const { buildDateCondition } = require('./governanceAnalytics');

/**
 * 1. Ward Governance Scorecards
 */
async function getWardScorecards(options = {}) {
  const { timeframe = '30d', startDate, endDate } = options;
  if (!db._pool) return [];

  try {
    const { clause: dateClause, params } = buildDateCondition(timeframe, startDate, endDate, 'c', 'created_at');

    const query = `
      SELECT
        w.id,
        w.name,
        w.id AS ward_number,
        ST_AsGeoJSON(w.boundary)::json AS geojson,
        COUNT(c.id)::int AS total_complaints,
        COUNT(CASE WHEN c.status = 'open' THEN 1 END)::int AS open,
        COUNT(CASE WHEN c.status IN ('assigned', 'accepted', 'in_progress') THEN 1 END)::int AS in_progress,
        COUNT(CASE WHEN c.status = 'resolved' THEN 1 END)::int AS resolved,
        COUNT(CASE WHEN c.status = 'closed' THEN 1 END)::int AS closed,
        COUNT(CASE WHEN c.status NOT IN ('resolved', 'closed', 'rejected') AND c.sla_due_at IS NOT NULL AND c.sla_due_at < now() THEN 1 END)::int AS overdue,
        COUNT(CASE WHEN c.priority = 'critical' THEN 1 END)::int AS critical,
        COUNT(CASE WHEN c.status IN ('resolved', 'closed') AND (c.sla_due_at IS NULL OR c.resolution_at <= c.sla_due_at) THEN 1 END)::int AS on_time_resolved,
        MODE() WITHIN GROUP (ORDER BY c.category) AS top_category,
        COALESCE((
          SELECT COUNT(*)::int 
          FROM civic_hotspots h 
          WHERE h.geometry IS NOT NULL AND w.boundary IS NOT NULL AND ST_Intersects(h.geometry, w.boundary)
        ), 0) AS hotspot_count,
        COALESCE((
          SELECT COUNT(*)::int 
          FROM complaint_duplicate_clusters cl
          WHERE cl.centroid IS NOT NULL AND w.boundary IS NOT NULL AND ST_Intersects(cl.centroid, w.boundary)
        ), 0) AS recurring_issue_count
      FROM wards w
      LEFT JOIN complaints c ON c.location IS NOT NULL AND w.boundary IS NOT NULL 
        AND ST_Contains(w.boundary, c.location::geometry) AND ${dateClause}
      GROUP BY w.id, w.name, w.boundary
      ORDER BY total_complaints DESC, w.id ASC;
    `;

    const res = await db.query(query, params);

    return res.rows.map(r => {
      const total = r.total_complaints || 0;
      const completed = (r.resolved || 0) + (r.closed || 0);
      const resolutionRate = total > 0 ? parseFloat(((completed / total) * 100).toFixed(1)) : 0.0;
      const slaCompliance = completed > 0 ? parseFloat(((r.on_time_resolved / completed) * 100).toFixed(1)) : 100.0;

      return {
        id: r.id,
        name: r.name,
        wardNumber: r.ward_number,
        geojson: r.geojson,
        totalComplaints: total,
        open: r.open || 0,
        inProgress: r.in_progress || 0,
        resolved: r.resolved || 0,
        closed: r.closed || 0,
        completed,
        overdue: r.overdue || 0,
        critical: r.critical || 0,
        topCategory: r.top_category || 'General',
        resolutionRate,
        slaCompliance,
        hotspotCount: r.hotspot_count || 0,
        recurringIssueCount: r.recurring_issue_count || 0
      };
    });
  } catch (err) {
    logger.error('[WardAnalytics getWardScorecards Error]', { err: err.message });
    return [];
  }
}

/**
 * 2. Zone Governance Scorecards
 */
async function getZoneScorecards(options = {}) {
  const { timeframe = '30d', startDate, endDate } = options;
  if (!db._pool) return [];

  try {
    const { clause: dateClause, params } = buildDateCondition(timeframe, startDate, endDate, 'c', 'created_at');

    const query = `
      SELECT
        z.id,
        z.name,
        ST_AsGeoJSON(z.boundary)::json AS geojson,
        COUNT(c.id)::int AS total_complaints,
        COUNT(CASE WHEN c.status IN ('resolved', 'closed') THEN 1 END)::int AS resolved,
        COUNT(CASE WHEN c.status NOT IN ('resolved', 'closed', 'rejected') AND c.sla_due_at IS NOT NULL AND c.sla_due_at < now() THEN 1 END)::int AS overdue,
        COUNT(CASE WHEN c.priority = 'critical' THEN 1 END)::int AS critical,
        COUNT(CASE WHEN c.status IN ('resolved', 'closed') AND (c.sla_due_at IS NULL OR c.resolution_at <= c.sla_due_at) THEN 1 END)::int AS on_time_resolved
      FROM zones z
      LEFT JOIN complaints c ON c.location IS NOT NULL AND z.boundary IS NOT NULL 
        AND ST_Contains(z.boundary, c.location::geometry) AND ${dateClause}
      GROUP BY z.id, z.name, z.boundary
      ORDER BY total_complaints DESC;
    `;

    const res = await db.query(query, params);

    return res.rows.map(r => {
      const total = r.total_complaints || 0;
      const resolved = r.resolved || 0;
      return {
        id: r.id,
        name: r.name,
        geojson: r.geojson,
        totalComplaints: total,
        resolved,
        overdue: r.overdue || 0,
        critical: r.critical || 0,
        resolutionRate: total > 0 ? parseFloat(((resolved / total) * 100).toFixed(1)) : 0.0,
        slaCompliance: resolved > 0 ? parseFloat(((r.on_time_resolved / resolved) * 100).toFixed(1)) : 100.0
      };
    });
  } catch (err) {
    logger.error('[WardAnalytics getZoneScorecards Error]', { err: err.message });
    return [];
  }
}

module.exports = {
  getWardScorecards,
  getZoneScorecards
};
