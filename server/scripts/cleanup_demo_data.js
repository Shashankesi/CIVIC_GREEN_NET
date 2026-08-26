require('dotenv').config({ path: '.env' });
const db = require('../config/db');

async function main() {
  try {
    console.log('Connecting to PostgreSQL to check and clean demo / test reports...');

    // 1. Clean test/demo reports in governance_report_history
    const delHist = await db.query(`
      DELETE FROM governance_report_history 
      WHERE report_name ILIKE '%test%' 
         OR report_name ILIKE '%demo%' 
         OR report_name ILIKE '%mock%'
    `);
    console.log(`✓ Deleted ${delHist.rowCount} demo/test entries from governance_report_history.`);

    // 2. Clean test/demo scheduled reports
    const delSched = await db.query(`
      DELETE FROM scheduled_reports 
      WHERE title ILIKE '%test%' 
         OR title ILIKE '%demo%' 
         OR recipient_email ILIKE '%test%' 
         OR recipient_email ILIKE '%example.com%'
    `);
    console.log(`✓ Deleted ${delSched.rowCount} demo/test entries from scheduled_reports.`);

    // 3. Clean test/demo complaints if any explicitly marked as test
    const delComp = await db.query(`
      DELETE FROM complaints 
      WHERE title ILIKE '%[TEST]%' 
         OR title ILIKE '%[DEMO]%'
         OR description ILIKE '%test complaint generated for automated testing%'
    `);
    console.log(`✓ Deleted ${delComp.rowCount} test complaints.`);

    // 4. Summarize remaining active real data
    const histCount = await db.query('SELECT COUNT(*) FROM governance_report_history');
    const schedCount = await db.query('SELECT COUNT(*) FROM scheduled_reports');
    const compCount = await db.query('SELECT status, COUNT(*) FROM complaints GROUP BY status ORDER BY status');
    const userCount = await db.query('SELECT role, COUNT(*) FROM users GROUP BY role ORDER BY role');

    console.log('\n--- ACTIVE REAL DATABASE STATE ---');
    console.log(`Report History Records: ${histCount.rows[0].count}`);
    console.log(`Scheduled Reports: ${schedCount.rows[0].count}`);
    console.log('Complaints by Status:', compCount.rows);
    console.log('Registered Users by Role:', userCount.rows);

    process.exit(0);
  } catch (err) {
    console.error('Error during cleanup:', err);
    process.exit(1);
  }
}

main();
