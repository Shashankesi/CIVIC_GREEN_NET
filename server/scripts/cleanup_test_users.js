// scripts/cleanup_test_users.js
// This script removes test/demo users from the Neon PostgreSQL database.
// It targets users whose email contains the substring "test" (case-insensitive)
// or ends with "@example.com". The script logs the IDs and emails of the users
// that will be deleted before performing the deletion.

const db = require('../config/db'); // Adjust path if script location changes

(async () => {
  try {
    // Fetch users matching test patterns
    const { rows: testUsers } = await db.query(
      `SELECT id, email FROM users WHERE (LOWER(email) LIKE $1 OR LOWER(email) LIKE $2) AND role != 'admin'`,
      ['%test%', '%@example.com']
    );

    if (testUsers.length === 0) {
      console.log('✅ No test/demo users found.');
      process.exit(0);
    }

    console.log('🔎 Test/demo users identified:');
    testUsers.forEach(u => console.log(`- ID: ${u.id}, Email: ${u.email}`));

    // Delete identified users inside a transaction
    await db.query('BEGIN');
    const ids = testUsers.map(u => u.id);
    await db.query('DELETE FROM users WHERE id = ANY($1)', [ids]);
    await db.query('COMMIT');

    console.log(`🗑️ Deleted ${ids.length} user(s).`);
    process.exit(0);
  } catch (err) {
    await db.query('ROLLBACK');
    console.error('❌ Error during cleanup:', err);
    process.exit(1);
  }
})();
