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

async function listLogs({ action, actorId, limit = 50, offset = 0 } = {}) {
  const conditions = [];
  const vals = [];
  let idx = 1;

  if (action) {
    conditions.push(`action = $${idx++}`);
    vals.push(action);
  }
  if (actorId) {
    conditions.push(`actor_id = $${idx++}`);
    vals.push(parseInt(actorId, 10));
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

  const [rowsRes, countRes] = await Promise.all([
    db.query(q, vals),
    db.query(countQ, countVals)
  ]);

  return {
    items: rowsRes.rows,
    total: countRes.rows[0]?.total || 0
  };
}

module.exports = { logAction, listLogs };
