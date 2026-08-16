require('dotenv').config();
// Validate environment early
require('./config/validateEnv');
const app = require('./app');
const { PORT } = require('./config');
const port = PORT || 5000;
const { runMigrations } = require('./migrations/runMigrations');

let server = null;
const isRunningInTest = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;

if (require.main === module && !isRunningInTest) {
  server = app.listen(port, '0.0.0.0', () => {
    console.log(`Server listening on port ${port}`);
    try {
      const slaMonitor = require('./services/slaMonitorService');
      slaMonitor.startMonitor();
      console.log('Background SLA compliance monitoring active');
    } catch (e) {
      console.error('Failed to start SLA monitoring service:', e.message);
    }

    try {
      const scheduledReportWorker = require('./services/analytics/scheduledReportWorker');
      scheduledReportWorker.startScheduledReportWorker();
      console.log('Background Scheduled Report Worker active');
    } catch (e) {
      console.error('Failed to start Scheduled Report Worker:', e.message);
    }
  });

  (async () => {
    try {
      await runMigrations();
    } catch (e) {
      console.error('Migration runner error', e && e.message ? e.message : e);
    }
  })();
}

// Graceful Shutdown Sequence
let isShuttingDown = false;
async function gracefulShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`\n[SHUTDOWN] Received ${signal}. Starting graceful shutdown sequence...`);

  // 1. Stop background workers
  try {
    const scheduledReportWorker = require('./services/analytics/scheduledReportWorker');
    scheduledReportWorker.stopScheduledReportWorker();
  } catch (e) {}

  // 2. Terminate active SSE streams cleanly
  try {
    const realtimeGateway = require('./services/realtimeGateway');
    realtimeGateway.closeAllClients();
  } catch (e) {}

  // 3. Stop accepting new HTTP connections
  server.close(async () => {
    console.log('[SHUTDOWN] HTTP server stopped accepting connections.');
    
    // 4. Close database pool
    try {
      const db = require('./config/db');
      if (db._pool) {
        await db._pool.end();
        console.log('[SHUTDOWN] PostgreSQL connection pool closed cleanly.');
      }
    } catch (e) {
      console.error('[SHUTDOWN] Error closing database pool:', e.message);
    }

    console.log('[SHUTDOWN] Graceful shutdown complete.');
    process.exit(0);
  });

  // Force exit after 10s timeout if connections hang
  setTimeout(() => {
    console.error('[SHUTDOWN] Forced shutdown after timeout.');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = { server, gracefulShutdown };
