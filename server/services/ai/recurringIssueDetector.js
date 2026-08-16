const db = require('../../config/db');
const logger = require('../../utils/logger');

/**
 * Detect recurring municipal issues by analyzing complaint history by location and category
 */
async function detectRecurringIssues(days = 60) {
  if (!db._pool) return [];

  try {
    const query = `
      SELECT 
        COALESCE(address, 'General Municipal Zone') AS location,
        category,
        COUNT(*)::int AS total_reports,
        COUNT(CASE WHEN status = 'resolved' THEN 1 END)::int AS resolved_count,
        COUNT(CASE WHEN status = 'reopened' THEN 1 END)::int AS reopened_count,
        COUNT(CASE WHEN status IN ('open', 'in_progress', 'assigned') THEN 1 END)::int AS active_count,
        MIN(created_at) AS first_reported,
        MAX(created_at) AS latest_reported
      FROM complaints
      WHERE created_at >= now() - ($1 || ' days')::INTERVAL
        AND address IS NOT NULL AND TRIM(address) != ''
      GROUP BY COALESCE(address, 'General Municipal Zone'), category
      HAVING COUNT(*) >= 2
      ORDER BY (COUNT(*) + COUNT(CASE WHEN status = 'reopened' THEN 1 END) * 2) DESC
      LIMIT 15;
    `;

    const res = await db.query(query, [days]);

    return res.rows.map((row, idx) => {
      let riskLevel = 'moderate';
      let riskReason = 'Multiple complaints recorded in this zone.';
      if (row.reopened_count > 0 || row.total_reports >= 5) {
        riskLevel = 'critical';
        riskReason = `High repeat frequency (${row.total_reports} reports) with ${row.reopened_count} reopened case(s) indicates underlying systemic failure.`;
      } else if (row.total_reports >= 3) {
        riskLevel = 'high';
        riskReason = `Repeated reports (${row.total_reports}) over the last ${days} days.`;
      }

      let recommendedAction = `Schedule preventive maintenance for ${row.category} infrastructure.`;
      if (row.category === 'drainage' || row.category === 'utilities') {
        recommendedAction = 'Dispatch civil engineering inspection for pipeline and drainage integrity.';
      } else if (row.category === 'sanitation') {
        recommendedAction = 'Increase waste collection frequency and inspect for commercial waste dumping.';
      } else if (row.category === 'roads') {
        recommendedAction = 'Perform structural road resurfacing instead of temporary patch repair.';
      } else if (row.category === 'lighting') {
        recommendedAction = 'Inspect feeder pillar and replace faulty transformer/wiring line.';
      }

      return {
        id: `REC-${idx + 1}`,
        issue: `Recurring ${row.category} issue detected`,
        location: row.location,
        category: row.category,
        totalReports: row.total_reports,
        resolvedCount: row.resolved_count,
        reopenedCount: row.reopened_count,
        activeCount: row.active_count,
        period: `last ${days} days`,
        riskLevel,
        riskReason,
        recommendedAction,
        firstReported: row.first_reported,
        latestReported: row.latest_reported
      };
    });
  } catch (err) {
    logger.error('[Recurring Issues Detector Error]', { err: err.message });
    return [];
  }
}

module.exports = {
  detectRecurringIssues
};
