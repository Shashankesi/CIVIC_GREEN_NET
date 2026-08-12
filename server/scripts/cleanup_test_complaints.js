const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

(async () => {
  try {
    // 1. Get all complaints that we should keep
    // Keep #35 (Pothole) and #12 (Illegal garbage dumping behind market)
    const keepIds = [12, 35];

    // Select the complaints to delete
    const selectQ = 'SELECT id, title, summary FROM complaints WHERE id NOT IN ($1, $2)';
    const { rows: testComplaints } = await pool.query(selectQ, keepIds);

    if (testComplaints.length === 0) {
      console.log('✅ No test complaints found in database.');
      await pool.end();
      process.exit(0);
    }

    console.log(`🔎 Found ${testComplaints.length} test complaints to delete:`);
    testComplaints.forEach(c => console.log(`- ID: ${c.id}, Title: "${c.title}"`));

    const deleteIds = testComplaints.map(c => c.id);

    // 2. Start transaction
    await pool.query('BEGIN');

    // Delete referencing rows in correct order
    console.log('🗑️ Deleting referencing rows from other tables...');
    await pool.query('DELETE FROM complaint_images WHERE complaint_id = ANY($1)', [deleteIds]);
    await pool.query('DELETE FROM complaint_status_history WHERE complaint_id = ANY($1)', [deleteIds]);
    await pool.query('DELETE FROM ai_analysis WHERE complaint_id = ANY($1)', [deleteIds]);
    await pool.query('DELETE FROM duplicate_complaints WHERE complaint_id = ANY($1) OR duplicate_of = ANY($1)', [deleteIds]);
    await pool.query('DELETE FROM complaint_assignments WHERE complaint_id = ANY($1)', [deleteIds]);

    // Delete the complaints
    console.log('🗑️ Deleting test complaints...');
    await pool.query('DELETE FROM complaints WHERE id = ANY($1)', [deleteIds]);

    await pool.query('COMMIT');
    console.log(`✅ Successfully deleted ${deleteIds.length} test complaints.`);

    await pool.end();
    process.exit(0);
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('❌ Error during complaints cleanup:', err.message || err);
    await pool.end();
    process.exit(1);
  }
})();
