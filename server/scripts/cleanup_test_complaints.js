const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

(async () => {
  try {
    // Select the complaints to delete dynamically using test keywords and test email suffixes
    const selectQ = `
      SELECT DISTINCT c.id, c.title, c.summary 
      FROM complaints c
      LEFT JOIN users u ON u.id = c.user_id
      WHERE 
        LOWER(c.title) LIKE '%test%' OR
        LOWER(c.title) LIKE '%mock%' OR
        LOWER(c.title) LIKE '%demo%' OR
        LOWER(c.title) LIKE '%ci %' OR
        LOWER(c.title) = 'ci updated' OR
        LOWER(c.title) = 'ci complaint' OR
        LOWER(c.title) = 'broken street light on 5th avenue' OR
        LOWER(c.description) LIKE '%test%' OR
        LOWER(c.description) LIKE '%mock%' OR
        LOWER(c.description) LIKE '%demo%' OR
        LOWER(u.email) LIKE '%test%' OR
        LOWER(u.email) LIKE '%@example.com'
    `;
    const { rows: testComplaints } = await pool.query(selectQ);

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
