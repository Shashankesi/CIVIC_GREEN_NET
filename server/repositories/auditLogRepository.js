const db = require('../config/db');

async function logAction({ actorId, actorName, actorRole, action, targetId, targetType, details, ipAddress, userAgent }) {
  const q = `
    INSERT INTO audit_logs (
      actor_id, actor_name, actor_role, action, target_id, target_type, details, ip_address, user_agent
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *
  `;
  const r = await db.query(q, [
    actorId || null,
    actorName || null,
    actorRole || null,
    action,
    targetId ? String(targetId) : null,
    targetType || null,
    details ? JSON.stringify(details) : '{}',
    ipAddress || null,
    userAgent || null
  ]);
  return r.rows[0];
}

async function listLogs({ search, role, action, datePreset, dateFrom, dateTo, actorId, limit = 20, offset = 0 } = {}) {
  const conditions = [];
  const vals = [];
  let idx = 1;

  if (search) {
    conditions.push(`(
      actor_name ILIKE $${idx} OR
      action ILIKE $${idx} OR
      target_type ILIKE $${idx} OR
      target_id ILIKE $${idx} OR
      ip_address ILIKE $${idx} OR
      details::text ILIKE $${idx}
    )`);
    vals.push(`%${search.trim()}%`);
    idx++;
  }

  if (role) {
    conditions.push(`actor_role = $${idx++}`);
    vals.push(role);
  }

  if (action) {
    if (action === 'auth') {
      conditions.push(`action IN ('user_login', 'admin_login', 'user_logout', 'failed_login')`);
    } else if (action === 'complaint') {
      conditions.push(`action LIKE 'complaint_%'`);
    } else if (action === 'assignment') {
      conditions.push(`action IN ('complaint_assigned', 'complaint_reassigned', 'complaint_assignment')`);
    } else if (action === 'notification') {
      conditions.push(`action IN ('notification_created', 'notification_sent', 'email_sent')`);
    } else if (action === 'security') {
      conditions.push(`action IN ('role_change', 'permission_changed', 'officer_approval', 'officer_rejected')`);
    } else {
      conditions.push(`action = $${idx++}`);
      vals.push(action);
    }
  }

  if (actorId) {
    conditions.push(`actor_id = $${idx++}`);
    vals.push(parseInt(actorId, 10));
  }

  if (datePreset === 'today') {
    conditions.push(`created_at >= CURRENT_DATE`);
  } else if (datePreset === '7d') {
    conditions.push(`created_at >= NOW() - INTERVAL '7 days'`);
  } else if (datePreset === '30d') {
    conditions.push(`created_at >= NOW() - INTERVAL '30 days'`);
  }

  if (dateFrom) {
    conditions.push(`created_at >= $${idx++}`);
    vals.push(dateFrom);
  }
  if (dateTo) {
    conditions.push(`created_at <= $${idx++}`);
    vals.push(dateTo);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const q = `
    SELECT id, actor_id, actor_name, actor_role, action, target_id, target_type, details, ip_address, user_agent, created_at
    FROM audit_logs
    ${where}
    ORDER BY created_at DESC
    LIMIT $${idx++} OFFSET $${idx++}
  `;
  vals.push(limit, offset);

  const countQ = `SELECT COUNT(*)::int AS total FROM audit_logs ${where}`;
  const countVals = vals.slice(0, idx - 3);

  // Compute real dashboard summary statistics
  const statsQ = `
    SELECT
      COUNT(*)::int AS "totalEvents",
      COUNT(CASE WHEN created_at >= CURRENT_DATE THEN 1 END)::int AS "todayEvents",
      COUNT(CASE WHEN actor_role = 'admin' AND created_at >= CURRENT_DATE THEN 1 END)::int AS "adminToday",
      COUNT(CASE WHEN actor_role = 'officer' AND created_at >= CURRENT_DATE THEN 1 END)::int AS "officerToday",
      COUNT(CASE WHEN actor_role = 'citizen' AND created_at >= CURRENT_DATE THEN 1 END)::int AS "citizenToday",
      COUNT(CASE WHEN action IN ('role_change', 'permission_changed', 'officer_approval', 'officer_rejected', 'failed_login') AND created_at >= CURRENT_DATE THEN 1 END)::int AS "securityToday"
    FROM audit_logs
  `;

  const [rowsRes, countRes, statsRes] = await Promise.all([
    db.query(q, vals),
    db.query(countQ, countVals),
    db.query(statsQ)
  ]);

  return {
    items: rowsRes.rows,
    total: countRes.rows[0]?.total || 0,
    stats: statsRes.rows[0] || {
      totalEvents: 0,
      todayEvents: 0,
      adminToday: 0,
      officerToday: 0,
      citizenToday: 0,
      securityToday: 0
    }
  };
}

async function exportLogsCsv(params) {
  const { items } = await listLogs({ ...params, limit: 5000, offset: 0 });
  const headers = ['ID', 'Timestamp', 'Actor Name', 'Actor Role', 'Action', 'Target Type', 'Target ID', 'IP Address', 'Details'];
  const rows = items.map(item => [
    item.id,
    new Date(item.created_at).toISOString(),
    `"${(item.actor_name || '').replace(/"/g, '""')}"`,
    `"${(item.actor_role || '').replace(/"/g, '""')}"`,
    `"${(item.action || '').replace(/"/g, '""')}"`,
    `"${(item.target_type || '').replace(/"/g, '""')}"`,
    `"${(item.target_id || '').replace(/"/g, '""')}"`,
    `"${(item.ip_address || '').replace(/"/g, '""')}"`,
    `"${JSON.stringify(item.details || {}).replace(/"/g, '""')}"`
  ]);

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

module.exports = { logAction, listLogs, exportLogsCsv };
