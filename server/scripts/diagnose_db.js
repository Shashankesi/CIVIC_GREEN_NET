const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function diagnose() {
  try {
    // Check tables
    const tables = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name");
    console.log('=== TABLES ===');
    console.log(tables.rows.map(r => r.table_name).join(', '));

    // Check complaints
    const complaintCount = await pool.query('SELECT COUNT(*) as total FROM complaints');
    console.log('\n=== COMPLAINTS TOTAL ===', complaintCount.rows[0].total);

    const complaintsByStatus = await pool.query('SELECT status, COUNT(*) as count FROM complaints GROUP BY status ORDER BY count DESC');
    console.log('\n=== COMPLAINTS BY STATUS ===');
    complaintsByStatus.rows.forEach(r => console.log(`  ${r.status}: ${r.count}`));

    const recentComplaints = await pool.query('SELECT id, title, status, priority, category, user_id, created_at FROM complaints ORDER BY created_at DESC LIMIT 10');
    console.log('\n=== RECENT 10 COMPLAINTS ===');
    recentComplaints.rows.forEach(r => console.log(`  #${r.id} [${r.status}] ${r.title} (user:${r.user_id}, cat:${r.category}, created:${r.created_at})`));

    // Check users
    const userCount = await pool.query('SELECT COUNT(*) as total FROM users');
    console.log('\n=== USERS TOTAL ===', userCount.rows[0].total);

    const usersByRole = await pool.query('SELECT role, status, COUNT(*) as count FROM users GROUP BY role, status ORDER BY role, status');
    console.log('\n=== USERS BY ROLE/STATUS ===');
    usersByRole.rows.forEach(r => console.log(`  ${r.role}/${r.status}: ${r.count}`));

    // Check if departments table exists and its data
    try {
      const depts = await pool.query('SELECT id, name FROM departments LIMIT 10');
      console.log('\n=== DEPARTMENTS ===');
      depts.rows.forEach(r => console.log(`  #${r.id} ${r.name}`));
    } catch(e) {
      console.log('\n=== DEPARTMENTS: Table may not exist or error:', e.message);
    }

    // Check admin route - does the reportComplaints query work?
    console.log('\n=== TESTING reportComplaints QUERY ===');
    const testQ = `
      SELECT c.id, c.title, c.summary, c.category, c.priority, c.status, c.address, c.created_at,
        u.name AS citizen_name, cn.name AS officer_name, d.name AS department_name
      FROM complaints c
      LEFT JOIN users u ON u.id = c.user_id
      LEFT JOIN users cn ON cn.id = c.officer_id
      LEFT JOIN departments d ON d.id = c.department_id
      ORDER BY c.created_at DESC
      LIMIT 5
    `;
    const testResult = await pool.query(testQ);
    console.log(`Query returned ${testResult.rows.length} rows`);
    if (testResult.rows.length > 0) {
      testResult.rows.forEach(r => console.log(`  #${r.id} [${r.status}] ${r.title} citizen:${r.citizen_name}`));
    }

    // Check complaints columns
    const cols = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='complaints' ORDER BY ordinal_position");
    console.log('\n=== COMPLAINTS TABLE COLUMNS ===');
    cols.rows.forEach(r => console.log(`  ${r.column_name}: ${r.data_type}`));

    // Check users columns
    const ucols = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='users' ORDER BY ordinal_position");
    console.log('\n=== USERS TABLE COLUMNS ===');
    ucols.rows.forEach(r => console.log(`  ${r.column_name}: ${r.data_type}`));

    await pool.end();
    console.log('\n=== DIAGNOSTIC COMPLETE ===');
  } catch(e) {
    console.error('FATAL ERROR:', e.message);
    await pool.end();
  }
}

diagnose();
