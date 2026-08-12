const auditLogRepository = require('../repositories/auditLogRepository');
const db = require('../config/db');

async function log(req, action, targetId, targetType, details = {}) {
  try {
    const actorId = req.user?.userId || req.user?.id || null;
    const actorRole = req.user?.role || 'system';
    let actorName = 'System';

    if (actorId) {
      try {
        const uRes = await db.query('SELECT name FROM users WHERE id = $1', [actorId]);
        if (uRes.rows[0]) {
          actorName = uRes.rows[0].name;
        }
      } catch (dbErr) {
        // fallback
      }
    }

    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;
    const userAgent = req.headers['user-agent'] || null;

    await auditLogRepository.logAction({
      actorId,
      actorName,
      actorRole,
      action,
      targetId,
      targetType,
      details,
      ipAddress,
      userAgent
    });
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}

module.exports = { log };
