const jwt = require('jsonwebtoken');
const { JWT } = require('../config');

function authenticate(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ success: false, message: 'Authentication required. Please log in.' });
  const token = auth.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT.ACCESS_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token. Please log in again.' });
  }
}

// Fast in-memory user status cache to eliminate duplicate database hits on concurrent requests (30s TTL)
const statusCache = new Map();
const CACHE_TTL_MS = 30000;

function getCachedUserStatus(userId) {
  const item = statusCache.get(userId);
  if (item && (Date.now() - item.timestamp < CACHE_TTL_MS)) {
    return item.data;
  }
  return null;
}

function setCachedUserStatus(userId, data) {
  statusCache.set(userId, { data, timestamp: Date.now() });
  if (statusCache.size > 2000) {
    const now = Date.now();
    for (const [k, v] of statusCache.entries()) {
      if (now - v.timestamp > CACHE_TTL_MS) statusCache.delete(k);
    }
  }
}

function invalidateUserStatusCache(userId) {
  if (userId) statusCache.delete(userId);
  else statusCache.clear();
}

function authorize(roles = []) {
  return async (req, res, next) => {
    if (!req.user) return res.status(401).json({ success: false, message: 'Authentication required.' });
    if (roles.length && !roles.includes(req.user.role)) return res.status(403).json({ success: false, message: 'Access forbidden: Insufficient permissions.' });

    // For privileged roles, perform a database status check with cache
    const uid = req.user.userId || req.user.id;
    if ((roles.includes('admin') || roles.includes('officer')) && uid) {
      try {
        let dbUser = getCachedUserStatus(uid);
        if (!dbUser) {
          const db = require('../config/db');
          const q = 'SELECT id, status, role FROM users WHERE id = $1';
          const r = await db.query(q, [uid]);
          dbUser = r.rows[0];
          if (dbUser) {
            setCachedUserStatus(uid, dbUser);
          }
        }
        
        if (!dbUser) {
          return res.status(401).json({ success: false, message: 'User account not found' });
        }

        // Allow pending officers to access the onboarding endpoint
        const isOfficerOnboarding = req.user.role === 'officer' && 
                                    dbUser && 
                                    dbUser.status === 'pending' && 
                                    req.originalUrl.includes('/onboarding');

        if (!isOfficerOnboarding && (!dbUser || (dbUser.status !== 'active' && dbUser.status !== 'approved'))) {
          return res.status(403).json({ success: false, message: 'Account is not active or has been suspended.' });
        }
      } catch (err) {
        console.error('Authorize DB status check error:', err.message || err);
        return res.status(500).json({ success: false, message: 'Authorization check failed: database connectivity issue' });
      }
    }

    next();
  };
}

function optionalAuthenticate(req, res, next) {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) {
    const token = auth.split(' ')[1];
    try {
      const payload = jwt.verify(token, JWT.ACCESS_SECRET);
      req.user = payload;
    } catch (err) {
      // Ignore invalid tokens for optional authentication
    }
  }
  next();
}

module.exports = { authenticate, authorize, optionalAuthenticate, invalidateUserStatusCache };
