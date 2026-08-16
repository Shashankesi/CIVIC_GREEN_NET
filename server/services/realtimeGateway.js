const logger = require('../utils/logger');

// Global registry of active SSE clients
// Map<userId, Set<{ id, res, userId, role, departmentId, municipalityId, connectedAt }>>
const clientsByUserId = new Map();
let nextClientId = 1;
let eventSeq = 1;

/**
 * Strips sensitive data from complaint object before emitting real-time event.
 */
function sanitizeComplaintSummary(complaint) {
  if (!complaint) return null;
  return {
    id: complaint.id,
    ticketId: `CGN-${String(complaint.id).padStart(5, '0')}`,
    title: complaint.title,
    category: complaint.category,
    status: complaint.status,
    priority: complaint.priority,
    latitude: complaint.latitude ? parseFloat(complaint.latitude) : null,
    longitude: complaint.longitude ? parseFloat(complaint.longitude) : null,
    address: complaint.address,
    departmentId: complaint.department_id,
    officerId: complaint.officer_id,
    userId: complaint.user_id,
    slaDueAt: complaint.sla_due_at,
    resolutionAt: complaint.resolution_at,
    createdAt: complaint.created_at,
    updatedAt: complaint.updated_at
  };
}

/**
 * Formats a message into Server-Sent Events text protocol.
 */
function formatSseMessage(event) {
  const id = eventSeq++;
  const data = JSON.stringify({
    ...event,
    eventId: id,
    serverTime: new Date().toISOString()
  });
  return `id: ${id}\nevent: message\ndata: ${data}\n\n`;
}

/**
 * Registers an active client SSE connection.
 */
function registerClient(user, res) {
  const userId = parseInt(user.id, 10);
  const clientId = nextClientId++;

  // Set SSE response headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  });

  // Send initial connected handshake
  const handshake = {
    type: 'CONNECTED',
    userId,
    role: user.role,
    clientId,
    timestamp: new Date().toISOString()
  };
  res.write(formatSseMessage(handshake));

  const clientObj = {
    id: clientId,
    res,
    userId,
    role: user.role,
    departmentId: user.department_id || null,
    municipalityId: user.municipality_id || null,
    connectedAt: Date.now()
  };

  if (!clientsByUserId.has(userId)) {
    clientsByUserId.set(userId, new Set());
  }
  clientsByUserId.get(userId).add(clientObj);

  logger.info(`[REALTIME] Client connected: user=${userId} role=${user.role} (total users=${clientsByUserId.size})`);

  // Handle client disconnection
  res.on('close', () => {
    const userClients = clientsByUserId.get(userId);
    if (userClients) {
      userClients.delete(clientObj);
      if (userClients.size === 0) {
        clientsByUserId.delete(userId);
      }
    }
    logger.info(`[REALTIME] Client disconnected: user=${userId} role=${user.role}`);
  });

  return clientId;
}

/**
 * Sends an event to all active connections of a specific user.
 */
function sendToUser(userId, event) {
  if (!userId) return false;
  const uid = parseInt(userId, 10);
  const userClients = clientsByUserId.get(uid);
  if (!userClients || userClients.size === 0) return false;

  const payload = formatSseMessage(event);
  for (const client of userClients) {
    try {
      client.res.write(payload);
    } catch (err) {
      logger.warn('[REALTIME] Error sending event to client', { userId: uid, err: err.message });
    }
  }
  return true;
}

/**
 * Sends an event to multiple user IDs.
 */
function sendToUsers(userIds, event) {
  if (!Array.isArray(userIds)) return;
  for (const id of userIds) {
    sendToUser(id, event);
  }
}

/**
 * Sends an event to all active users with a specific role (e.g., 'admin').
 */
function sendToRole(role, event) {
  if (!role) return;
  const payload = formatSseMessage(event);
  for (const [, userClients] of clientsByUserId) {
    for (const client of userClients) {
      if (client.role === role) {
        try {
          client.res.write(payload);
        } catch (err) {
          logger.warn('[REALTIME] Error sending event to role', { role, err: err.message });
        }
      }
    }
  }
}

/**
 * Targeted role-based complaint event router.
 * Automatically distributes event to:
 * 1. Citizen complaint owner (if connected)
 * 2. Assigned officer (if connected)
 * 3. Municipal administrators
 */
function publishComplaintEvent(eventType, complaint, extra = {}) {
  if (!complaint) return;
  const summary = sanitizeComplaintSummary(complaint);
  const event = {
    type: eventType,
    complaint: summary,
    complaintId: summary.id,
    ticketId: summary.ticketId,
    status: summary.status,
    ...extra
  };

  // 1. Send to citizen owner
  if (summary.userId) {
    sendToUser(summary.userId, event);
  }

  // 2. Send to assigned officer
  if (summary.officerId && parseInt(summary.officerId, 10) !== parseInt(summary.userId, 10)) {
    sendToUser(summary.officerId, event);
  }

  // 3. Send to all connected Admins
  sendToRole('admin', event);
}

/**
 * Heartbeat keeper: sends SSE ping comment every 25 seconds to keep streaming connections alive.
 */
const heartbeatTimer = setInterval(() => {
  if (clientsByUserId.size === 0) return;
  const ping = ':ping\n\n';
  for (const [, userClients] of clientsByUserId) {
    for (const client of userClients) {
      try {
        client.res.write(ping);
      } catch (err) {
        // Handled on close
      }
    }
  }
}, 25000);

if (heartbeatTimer.unref) {
  heartbeatTimer.unref();
}

/**
 * Returns connection metrics.
 */
function getMetrics() {
  let totalConnections = 0;
  const roles = { admin: 0, officer: 0, citizen: 0 };
  for (const [, userClients] of clientsByUserId) {
    totalConnections += userClients.size;
    for (const client of userClients) {
      if (roles[client.role] !== undefined) {
        roles[client.role]++;
      }
    }
  }
  return {
    activeUsers: clientsByUserId.size,
    totalConnections,
    byRole: roles
  };
}

/**
 * Publishes Phase 4 AI Events (AI_ANALYSIS_STARTED, AI_ANALYSIS_COMPLETED, DUPLICATE_DETECTED, HOTSPOT_DETECTED, etc.)
 */
function publishAiEvent(eventType, data = {}, targetRole = 'admin', targetUserId = null) {
  const event = {
    type: eventType,
    ...data,
    timestamp: new Date().toISOString()
  };

  if (targetUserId) {
    sendToUser(targetUserId, event);
  }
  if (targetRole) {
    sendToRole(targetRole, event);
  }
}

/**
 * Gracefully closes all active SSE client connections.
 * Used during server shutdown or test teardown.
 */
function closeAllClients() {
  const shutdownMsg = formatSseMessage({
    type: 'SERVER_SHUTDOWN',
    message: 'Server is undergoing maintenance or shutting down.',
    timestamp: new Date().toISOString()
  });

  for (const [, userClients] of clientsByUserId) {
    for (const client of userClients) {
      try {
        client.res.write(shutdownMsg);
        client.res.end();
      } catch (err) {
        // Ignore errors during socket termination
      }
    }
  }
  clientsByUserId.clear();
  logger.info('[REALTIME] All active client connections closed gracefully.');
}

module.exports = {
  registerClient,
  sendToUser,
  sendToUsers,
  sendToRole,
  publishComplaintEvent,
  publishAiEvent,
  getMetrics,
  sanitizeComplaintSummary,
  closeAllClients
};
