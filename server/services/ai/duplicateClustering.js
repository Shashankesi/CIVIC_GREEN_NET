const db = require('../../config/db');
const logger = require('../../utils/logger');

/**
 * Identify and retrieve duplicate complaint clusters from PostgreSQL
 */
async function getDuplicateClusters() {
  if (!db._pool) return [];

  try {
    // 1. Group complaints that are linked in duplicate_complaints table
    const clusterQuery = `
      WITH RECURSIVE dup_pairs AS (
        SELECT complaint_id AS a, duplicate_of AS b, score FROM duplicate_complaints
        UNION
        SELECT duplicate_of AS a, complaint_id AS b, score FROM duplicate_complaints
      ),
      grouped_dups AS (
        SELECT 
          LEAST(a, b) as root_id,
          ARRAY_AGG(DISTINCT a) || ARRAY_AGG(DISTINCT b) as member_ids,
          AVG(score) as avg_score
        FROM dup_pairs
        GROUP BY LEAST(a, b)
      )
      SELECT 
        gd.root_id,
        gd.avg_score,
        c.category,
        c.address,
        c.title AS primary_title,
        c.status AS primary_status,
        ARRAY(SELECT DISTINCT UNNEST(gd.member_ids)) AS unique_complaint_ids
      FROM grouped_dups gd
      JOIN complaints c ON c.id = gd.root_id
      ORDER BY ARRAY_LENGTH(ARRAY(SELECT DISTINCT UNNEST(gd.member_ids)), 1) DESC
      LIMIT 20;
    `;

    const res = await db.query(clusterQuery);

    if (res.rows.length > 0) {
      const clusters = [];
      let clusterIdx = 1;
      for (const row of res.rows) {
        const ids = row.unique_complaint_ids || [row.root_id];
        // Fetch brief details for member complaints
        const memberRes = await db.query(
          `SELECT id, title, status, priority, address, created_at 
           FROM complaints WHERE id = ANY($1::int[])`,
          [ids]
        );

        clusters.push({
          clusterId: `Cluster #${clusterIdx++}`,
          primaryId: `CGN-${String(row.root_id).padStart(5, '0')}`,
          category: row.category || 'General',
          location: row.address || 'Municipal Area',
          primaryTitle: row.primary_title,
          totalReports: ids.length,
          averageSimilarity: parseFloat(Number(row.avg_score || 0.85).toFixed(2)),
          complaints: memberRes.rows.map(m => ({
            id: `CGN-${String(m.id).padStart(5, '0')}`,
            rawId: m.id,
            title: m.title,
            status: m.status,
            priority: m.priority,
            address: m.address,
            created_at: m.created_at
          }))
        });
      }
      return clusters;
    }

    // 2. If no explicit duplicate_complaints pairs, group by matching address and category
    const addressGroupingQuery = `
      SELECT 
        address,
        category,
        COUNT(*)::int AS total_reports,
        ARRAY_AGG(id ORDER BY id ASC) AS complaint_ids,
        MIN(title) AS primary_title,
        MIN(status) AS primary_status
      FROM complaints
      WHERE address IS NOT NULL AND TRIM(address) != ''
      GROUP BY address, category
      HAVING COUNT(*) > 1
      ORDER BY total_reports DESC
      LIMIT 15;
    `;

    const groupRes = await db.query(addressGroupingQuery);
    let cIndex = 1;
    const addressClusters = [];

    for (const r of groupRes.rows) {
      const ids = r.complaint_ids || [];
      const memberRes = await db.query(
        `SELECT id, title, status, priority, address, created_at 
         FROM complaints WHERE id = ANY($1::int[])`,
        [ids]
      );

      addressClusters.push({
        clusterId: `Cluster #${cIndex++}`,
        primaryId: `CGN-${String(ids[0]).padStart(5, '0')}`,
        category: r.category,
        location: r.address,
        primaryTitle: r.primary_title,
        totalReports: r.total_reports,
        averageSimilarity: 0.80,
        complaints: memberRes.rows.map(m => ({
          id: `CGN-${String(m.id).padStart(5, '0')}`,
          rawId: m.id,
          title: m.title,
          status: m.status,
          priority: m.priority,
          address: m.address,
          created_at: m.created_at
        }))
      });
    }

    return addressClusters;
  } catch (err) {
    logger.error('[Duplicate Clustering Error]', { err: err.message });
    return [];
  }
}

module.exports = {
  getDuplicateClusters
};
