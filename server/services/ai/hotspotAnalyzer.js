const db = require('../../config/db');
const logger = require('../../utils/logger');

/**
 * Calculate and return geographic hotspots with SLA risk and trend metrics
 */
async function analyzeHotspots({ days = 30, category = null } = {}) {
  if (!db._pool) return [];

  try {
    const numDays = parseInt(days, 10) || 30;
    const prevDays = numDays * 2;
    const params = [numDays, prevDays];
    let catFilter = '';
    if (category && category !== 'all') {
      params.push(category.toLowerCase());
      catFilter = ` AND LOWER(c.category) = $${params.length}`;
    }

    // Query current period complaints vs previous period complaints grouped by location/address
    const query = `
      WITH current_period AS (
        SELECT 
          COALESCE(c.address, 'Ward Area') AS zone,
          c.category,
          COUNT(*)::int AS current_count,
          COUNT(CASE WHEN c.status NOT IN ('resolved', 'closed') THEN 1 END)::int AS unresolved_count,
          COUNT(CASE WHEN c.sla_due_at IS NOT NULL AND c.sla_due_at < now() AND c.status NOT IN ('resolved', 'closed') THEN 1 END)::int AS sla_breach_count
        FROM complaints c
        WHERE c.created_at >= now() - ($1 || ' days')::INTERVAL
          ${catFilter}
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
          ${catFilter}
          AND c.address IS NOT NULL AND TRIM(c.address) != ''
        GROUP BY COALESCE(c.address, 'Ward Area'), c.category
      )
      SELECT 
        cp.zone,
        cp.category,
        cp.current_count,
        cp.unresolved_count,
        cp.sla_breach_count,
        COALESCE(pp.prev_count, 0) AS prev_count
      FROM current_period cp
      LEFT JOIN previous_period pp ON pp.zone = cp.zone AND pp.category = cp.category
      ORDER BY (cp.current_count * 2 + cp.unresolved_count * 3 + cp.sla_breach_count * 5) DESC
      LIMIT 20;
    `;

    const res = await db.query(query, params);

    return res.rows.map((row, idx) => {
      const prev = row.prev_count || 0;
      const curr = row.current_count;
      let trendPercentage = 0;
      if (prev > 0) {
        trendPercentage = Math.round(((curr - prev) / prev) * 100);
      } else if (curr > 1) {
        trendPercentage = 100;
      }

      let riskLevel = 'normal';
      if (row.sla_breach_count >= 3 || (curr >= 10 && row.unresolved_count >= 5)) {
        riskLevel = 'critical'; // Red
      } else if (trendPercentage >= 40 || curr >= 5 || row.sla_breach_count >= 1) {
        riskLevel = 'emerging'; // Orange
      } else if (row.unresolved_count >= 3) {
        riskLevel = 'recurring'; // Yellow
      }

      return {
        id: `HS-${idx + 1}`,
        name: `${row.zone} - ${row.category}`,
        zone: row.zone,
        category: row.category,
        totalReports: curr,
        unresolvedCount: row.unresolved_count,
        slaBreaches: row.sla_breach_count,
        previousPeriodReports: prev,
        trendPercentage,
        trendDisplay: trendPercentage >= 0 ? `+${trendPercentage}%` : `${trendPercentage}%`,
        riskLevel,
        lat: 30.7333 + (idx * 0.005),
        lng: 76.7794 + (idx * 0.005),
        radiusMeters: Math.min(Math.max(curr * 80, 400), 2000),
        status: riskLevel === 'critical' ? '🔴 Critical Hotspot' : riskLevel === 'emerging' ? '🟠 Emerging Hotspot' : riskLevel === 'recurring' ? '🟡 Recurring Issue' : '🔵 Complaint Cluster'
      };
    });
  } catch (err) {
    logger.error('[Hotspot Analyzer Error]', { err: err.message });
    return [];
  }
}

module.exports = {
  analyzeHotspots
};
