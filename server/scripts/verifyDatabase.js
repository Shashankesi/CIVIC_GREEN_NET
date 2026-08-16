const db = require('../config/db');

async function main() {
  console.log('--- CIVIC GREENNET NEON POSTGRESQL VERIFICATION ---');
  try {
    const conn = await db.query('SELECT current_database(), current_user, version()');
    console.log('Database Info:', conn.rows[0]);

    const tablesRes = await db.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    console.log('\nExisting Tables:');
    for (const t of tablesRes.rows) {
      try {
        const countRes = await db.query(`SELECT COUNT(*)::int as count FROM "${t.table_name}"`);
        console.log(`  - ${t.table_name.padEnd(28)}: ${countRes.rows[0].count} records`);
      } catch (err) {
        console.log(`  - ${t.table_name.padEnd(28)}: Error (${err.message})`);
      }
    }

    console.log('\nUsers Breakdown:');
    const usersBreakdown = await db.query(`
      SELECT role, status, COUNT(*)::int as count 
      FROM users 
      GROUP BY role, status 
      ORDER BY role, status;
    `);
    console.table(usersBreakdown.rows);

    console.log('\nOfficers Breakdown:');
    const officers = await db.query(`
      SELECT id, name, email, role, status, employee_id, department_id, settings->>'onboarding_status' as onboarding_status
      FROM users 
      WHERE role = 'officer'
      ORDER BY id;
    `);
    console.table(officers.rows);

    console.log('\nComplaints Status Breakdown:');
    const complaintsBreakdown = await db.query(`
      SELECT status, priority, COUNT(*)::int as count 
      FROM complaints 
      GROUP BY status, priority 
      ORDER BY status, priority;
    `);
    console.table(complaintsBreakdown.rows);

    console.log('\nExisting Indexes:');
    const indexesRes = await db.query(`
      SELECT tablename, indexname, indexdef 
      FROM pg_indexes 
      WHERE schemaname = 'public' 
      ORDER BY tablename, indexname;
    `);
    console.table(indexesRes.rows.map(r => ({ table: r.tablename, index: r.indexname })));

  } catch (err) {
    console.error('Database connection / verification failed:', err);
  } finally {
    process.exit(0);
  }
}

main();
