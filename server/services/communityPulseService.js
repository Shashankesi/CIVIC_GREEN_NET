const db = require('../config/db');
const logger = require('../utils/logger');

/**
 * Community Pulse Service
 * Aggregates live civic trends, most supported community issues, recently verified resolutions,
 * and category velocity from Neon PostgreSQL.
 */

async function getCommunityPulse(options = {}) {
  const { limit = 6, timeframe = 30 } = options;

  // 1. Most Supported Community Issues (Active citizen issues with highest votes)
  const mostSupportedRes = await db.query(`
    SELECT 
      c.id, c.title, c.category, c.priority, c.status, c.address, c.created_at,
      d.name as department_name,
      COUNT(v.id)::int as support_count,
      COUNT(DISTINCT cm.id)::int as comment_count,
      (
        SELECT url FROM complaint_images 
        WHERE complaint_id = c.id 
        ORDER BY id ASC LIMIT 1
      ) as thumbnail_url
    FROM complaints c
    LEFT JOIN complaint_votes v ON v.complaint_id = c.id
    LEFT JOIN complaint_comments cm ON cm.complaint_id = c.id AND (cm.status IS NULL OR cm.status = 'visible')
    LEFT JOIN departments d ON d.id = c.department_id
    WHERE c.created_at >= (now() - ($1 || ' days')::interval)
    GROUP BY c.id, c.title, c.category, c.priority, c.status, c.address, c.created_at, d.name
    HAVING COUNT(v.id) > 0 OR COUNT(DISTINCT cm.id) > 0
    ORDER BY support_count DESC, comment_count DESC, c.created_at DESC
    LIMIT $2
  `, [timeframe, limit]);

  // 2. Fastest Growing Categories (Velocity over past 30 days)
  const categoryTrendsRes = await db.query(`
    SELECT 
      category,
      COUNT(*)::int as count,
      COUNT(CASE WHEN status IN ('resolved', 'closed') THEN 1 END)::int as resolved_count,
      ROUND(
        COUNT(CASE WHEN status IN ('resolved', 'closed') THEN 1 END)::numeric / NULLIF(COUNT(*), 0) * 100, 
        1
      ) as resolution_rate
    FROM complaints
    WHERE created_at >= (now() - ($1 || ' days')::interval)
    GROUP BY category
    ORDER BY count DESC
    LIMIT 6
  `, [timeframe]);

  // 3. Recently Verified & Resolved Civic Milestones (with before/after photos if available)
  const recentResolutionsRes = await db.query(`
    SELECT 
      c.id, c.title, c.category, c.address, c.created_at, c.resolution_at,
      d.name as department_name,
      (
        SELECT url FROM complaint_images 
        WHERE complaint_id = c.id AND (metadata->>'resolution' = 'true' OR metadata->>'is_resolution' = 'true')
        ORDER BY id DESC LIMIT 1
      ) as resolution_image_url,
      (
        SELECT url FROM complaint_images 
        WHERE complaint_id = c.id AND (metadata->>'resolution' IS NULL OR metadata->>'resolution' = 'false')
        ORDER BY id ASC LIMIT 1
      ) as original_image_url,
      (
        SELECT COUNT(*)::int FROM complaint_votes WHERE complaint_id = c.id
      ) as support_count
    FROM complaints c
    LEFT JOIN departments d ON d.id = c.department_id
    WHERE c.status IN ('resolved', 'closed') AND c.resolution_at IS NOT NULL
    ORDER BY c.resolution_at DESC
    LIMIT $1
  `, [limit]);

  // 4. City Civic Transparency Aggregates (Real PostgreSQL totals, 0 fake data)
  const transparencyRes = await db.query(`
    SELECT 
      COUNT(*)::int as total_reports,
      COUNT(CASE WHEN status IN ('resolved', 'closed') THEN 1 END)::int as total_resolved,
      COUNT(CASE WHEN status = 'in_progress' THEN 1 END)::int as active_in_progress,
      COUNT(CASE WHEN status = 'open' THEN 1 END)::int as pending_review,
      COUNT(CASE WHEN status = 'reopened' THEN 1 END)::int as total_reopened,
      ROUND(AVG(
        CASE 
          WHEN resolution_at IS NOT NULL AND created_at IS NOT NULL 
          THEN EXTRACT(EPOCH FROM (resolution_at - created_at)) / 3600 
        END
      )::numeric, 1) as avg_resolution_hours,
      (SELECT COUNT(*)::int FROM complaint_votes) as total_community_supports,
      (SELECT COUNT(*)::int FROM complaint_comments WHERE status IS NULL OR status = 'visible') as total_comments
    FROM complaints
  `);

  const transparency = transparencyRes.rows[0] || {};
  const resolutionRate = transparency.total_reports > 0 
    ? Math.round((transparency.total_resolved / transparency.total_reports) * 100)
    : 0;

  return {
    mostSupported: mostSupportedRes.rows,
    categoryTrends: categoryTrendsRes.rows,
    recentResolutions: recentResolutionsRes.rows,
    transparency: {
      ...transparency,
      resolutionRate
    }
  };
}

module.exports = {
  getCommunityPulse
};
