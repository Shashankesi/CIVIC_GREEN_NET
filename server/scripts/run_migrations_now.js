const { runMigrations } = require('../migrations/runMigrations');
(async () => {
  try {
    await runMigrations();
    console.log('Migrations runner completed');
    process.exit(0);
  } catch (e) {
    console.error('Migrations runner failed', e && e.message ? e.message : e);
    process.exit(1);
  }
})();
