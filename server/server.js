require('dotenv').config();
// Validate environment early
require('./config/validateEnv');
const app = require('./app');
const { PORT } = require('./config');
const { runMigrations } = require('./migrations/runMigrations');

const port = PORT || 4000;

(async () => {
  // Run DB migrations / feature detection before starting server
  try {
    await runMigrations();
  } catch (e) {
    console.error('Migration runner error', e && e.message ? e.message : e);
  }

  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
    // Start background SLA monitor
    try {
      const slaMonitor = require('./services/slaMonitorService');
      slaMonitor.startMonitor();
      console.log('Background SLA compliance monitoring active');
    } catch (e) {
      console.error('Failed to start SLA monitoring service:', e.message);
    }
  });
})();
