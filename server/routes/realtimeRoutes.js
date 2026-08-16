const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { JWT } = require('../config');
const db = require('../config/db');
const realtimeGateway = require('../services/realtimeGateway');
const logger = require('../utils/logger');

/**
 * Authenticated Real-Time Event Stream (Server-Sent Events)
 * Accepts JWT token in query (?token=...) or Authorization header (Bearer ...).
 */
router.get('/stream', async (req, res) => {
  let token = null;

  // 1. Extract token from query or Authorization header
  if (req.query && req.query.token) {
    token = String(req.query.token).trim();
  } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      code: 'AUTH_REQUIRED',
      message: 'Authentication token required for real-time connection.'
    });
  }

  // 2. Verify JWT signature
  let decoded;
  try {
    decoded = jwt.verify(token, JWT.ACCESS_SECRET);
  } catch (err) {
    logger.warn('[REALTIME] Authentication token verification failed', { err: err.message });
    return res.status(401).json({
      success: false,
      code: 'INVALID_TOKEN',
      message: 'Invalid or expired authentication token.'
    });
  }

  const userId = decoded.userId || decoded.id;
  if (!userId) {
    return res.status(401).json({
      success: false,
      code: 'INVALID_TOKEN',
      message: 'Malformed token payload.'
    });
  }

  // 3. Verify user in PostgreSQL database
  try {
    const userRes = await db.query(
      'SELECT id, name, email, role, status, department_id, municipality_id FROM users WHERE id = $1',
      [userId]
    );
    const user = userRes.rows[0];

    if (!user) {
      return res.status(404).json({
        success: false,
        code: 'USER_NOT_FOUND',
        message: 'User account not found.'
      });
    }

    if (user.status === 'suspended' || user.status === 'blocked') {
      return res.status(403).json({
        success: false,
        code: 'ACCOUNT_INACTIVE',
        message: 'Account is suspended or blocked.'
      });
    }

    // 4. Register client in real-time SSE gateway
    realtimeGateway.registerClient(user, res);
  } catch (err) {
    logger.error('[REALTIME] Error establishing real-time stream', { err: err.message });
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Failed to establish real-time connection.' });
    }
  }
});

/**
 * Diagnostics and Health Status of Real-Time Gateway
 */
router.get('/status', (req, res) => {
  const metrics = realtimeGateway.getMetrics();
  res.json({
    success: true,
    realtime: 'operational',
    timestamp: new Date().toISOString(),
    metrics
  });
});

module.exports = router;
