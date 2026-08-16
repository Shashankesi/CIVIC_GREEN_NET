const db = require('../../config/db');
const logger = require('../../utils/logger');

/**
 * 1. Audit Log Analytics & Action Breakdown
 */
async function getAuditAnalytics(options = {}) {
  const { limit = 50, offset = 0, action, role, userId } = options;
  if (!db._pool) return { logs: [], total: 0, actionBreakdown: [] };

  try {
    const conditions = ['1=1'];
    const params = [];

    if (action && action !== 'all') {
      params.push(action);
      conditions.push(`a.action = $${params.length}`);
    }

    if (role && role !== 'all') {
      params.push(role);
      conditions.push(`a.actor_role = $${params.length}`);
    }

    if (userId) {
      params.push(parseInt(userId, 10));
      conditions.push(`a.actor_id = $${params.length}`);
    }

    params.push(parseInt(limit, 10) || 50);
    const limitPlaceholder = `$${params.length}`;
    params.push(parseInt(offset, 10) || 0);
    const offsetPlaceholder = `$${params.length}`;

    const logsQuery = `
      SELECT
        a.id,
        a.action,
        a.details,
        a.created_at,
        a.ip_address,
        a.actor_id AS user_id,
        a.actor_name AS user_name,
        a.actor_role AS user_role,
        a.target_id,
        a.target_type
      FROM audit_logs a
      WHERE ${conditions.join(' AND ')}
      ORDER BY a.created_at DESC
      LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder};
    `;

    const totalQuery = `
      SELECT COUNT(*)::int AS total
      FROM audit_logs a
      WHERE ${conditions.join(' AND ')};
    `;

    const breakdownQuery = `
      SELECT
        a.action,
        COUNT(*)::int AS count
      FROM audit_logs a
      GROUP BY a.action
      ORDER BY count DESC
      LIMIT 10;
    `;

    const [logsRes, totalRes, bdRes] = await Promise.all([
      db.query(logsQuery, params),
      db.query(totalQuery, params.slice(0, -2)),
      db.query(breakdownQuery)
    ]);

    return {
      logs: logsRes.rows.map(r => ({
        id: r.id,
        action: r.action,
        details: r.details,
        ipAddress: r.ip_address,
        userName: r.user_name || 'System Engine',
        userRole: r.user_role || 'system',
        targetId: r.target_id,
        targetType: r.target_type,
        createdAt: r.created_at
      })),
      total: totalRes.rows[0]?.total || 0,
      actionBreakdown: bdRes.rows.map(b => ({
        action: b.action,
        count: b.count
      }))
    };
  } catch (err) {
    logger.error('[AuditAnalytics getAuditAnalytics Error]', { err: err.message });
    return { logs: [], total: 0, actionBreakdown: [] };
  }
}

/**
 * 2. Accountability Timeline for Specific Complaint
 */
async function getAccountabilityTimeline(complaintId) {
  if (!db._pool) return [];

  try {
    const query = `
      SELECT
        sh.id,
        sh.old_status,
        sh.new_status,
        sh.notes,
        sh.created_at,
        sh.changed_by,
        u.name AS actor_name,
        u.role AS actor_role
      FROM complaint_status_history sh
      LEFT JOIN users u ON u.id = sh.changed_by
      WHERE sh.complaint_id = $1
      ORDER BY sh.created_at ASC;
    `;

    const res = await db.query(query, [complaintId]);

    return res.rows.map(r => ({
      id: r.id,
      oldStatus: r.old_status,
      newStatus: r.new_status,
      notes: r.notes,
      actorName: r.actor_name || 'System Engine',
      actorRole: r.actor_role || 'system',
      createdAt: r.created_at
    }));
  } catch (err) {
    logger.error('[AuditAnalytics getAccountabilityTimeline Error]', { err: err.message });
    return [];
  }
}

module.exports = {
  getAuditAnalytics,
  getAccountabilityTimeline
};
