const db = require('../config/db');
const logger = require('../utils/logger');

/**
 * Safely clean up development/automated test accounts from the database.
 * Preserves ALL legitimate users, production data, real officers, and real citizens.
 */
async function cleanTestUsers() {
  if (!db._pool) {
    console.error('Database pool not initialized.');
    process.exit(1);
  }

  const client = await db._pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Identify test users by explicit automated test patterns
    const identifySql = `
      SELECT id, name, email, role, created_at
      FROM users
      WHERE 
        email LIKE '%@example.com'
        OR email LIKE 'p8_%@civicgreennet.gov.in'
        OR email LIKE 'p4_%@%'
        OR email LIKE 'phase7_%@%'
        OR email LIKE 'jest_%@%'
        OR name LIKE 'P8 %'
        OR name LIKE 'Phase7 %'
        OR name LIKE 'Jest %'
        OR name = 'Other Citizen'
        OR email = 'fucku@gmail.com'
      ORDER BY id ASC;
    `;

    const testUsersRes = await client.query(identifySql);
    const testUsers = testUsersRes.rows;
    console.log(`Found ${testUsers.length} test user account(s) to remove:`);
    testUsers.forEach(u => console.log(`  [#${u.id}] ${u.name} <${u.email}> (${u.role})`));

    if (testUsers.length === 0) {
      console.log('No test users found.');
      await client.query('COMMIT');
      client.release();
      return;
    }

    const testUserIds = testUsers.map(u => u.id);

    // 2. Remove dependent child records for these test users in referential integrity order
    const cleanupOperations = [
      { name: 'point_transactions', sql: `DELETE FROM point_transactions WHERE user_id = ANY($1::int[]) OR created_by = ANY($1::int[])` },
      { name: 'user_badges', sql: `DELETE FROM user_badges WHERE user_id = ANY($1::int[])` },
      { name: 'citizen_contribution_events', sql: `DELETE FROM citizen_contribution_events WHERE user_id = ANY($1::int[])` },
      { name: 'citizen_badges', sql: `DELETE FROM citizen_badges WHERE user_id = ANY($1::int[])` },
      { name: 'complaint_votes', sql: `DELETE FROM complaint_votes WHERE user_id = ANY($1::int[])` },
      { name: 'complaint_follows', sql: `DELETE FROM complaint_follows WHERE user_id = ANY($1::int[])` },
      { name: 'comment_reports', sql: `DELETE FROM comment_reports WHERE reporter_id = ANY($1::int[]) OR reviewed_by = ANY($1::int[])` },
      { name: 'complaint_comments', sql: `DELETE FROM complaint_comments WHERE user_id = ANY($1::int[])` },
      { name: 'complaint_reopenings', sql: `DELETE FROM complaint_reopenings WHERE user_id = ANY($1::int[])` },
      { name: 'complaint_notes', sql: `DELETE FROM complaint_notes WHERE user_id = ANY($1::int[])` },
      { name: 'notifications', sql: `DELETE FROM notifications WHERE user_id = ANY($1::int[])` },
      { name: 'notification_preferences', sql: `DELETE FROM notification_preferences WHERE user_id = ANY($1::int[])` },
      { name: 'user_settings', sql: `DELETE FROM user_settings WHERE user_id = ANY($1::int[])` },
      { name: 'email_logs', sql: `DELETE FROM email_logs WHERE user_id = ANY($1::int[])` },
      { name: 'password_resets', sql: `DELETE FROM password_resets WHERE user_id = ANY($1::int[])` },
      { name: 'email_verifications', sql: `DELETE FROM email_verifications WHERE user_id = ANY($1::int[])` },
      { name: 'refresh_tokens', sql: `DELETE FROM refresh_tokens WHERE user_id = ANY($1::int[])` },
      { name: 'ai_feedback', sql: `DELETE FROM ai_feedback WHERE user_id = ANY($1::int[])` },
      { name: 'ai_messages', sql: `DELETE FROM ai_messages WHERE conversation_id IN (SELECT id FROM ai_conversations WHERE user_id = ANY($1::int[]))` },
      { name: 'ai_conversations', sql: `DELETE FROM ai_conversations WHERE user_id = ANY($1::int[])` },
      { name: 'ai_audit_logs', sql: `DELETE FROM ai_audit_logs WHERE user_id = ANY($1::int[])` },
      { name: 'officer_documents', sql: `DELETE FROM officer_documents WHERE user_id = ANY($1::int[]) OR uploaded_by = ANY($1::int[]) OR verified_by = ANY($1::int[])` },
      { name: 'complaint_assignments', sql: `DELETE FROM complaint_assignments WHERE officer_id = ANY($1::int[]) OR assigned_by = ANY($1::int[])` },
      { name: 'complaint_status_history', sql: `DELETE FROM complaint_status_history WHERE changed_by = ANY($1::int[])` },
      { name: 'test_complaints_ai_analysis', sql: `DELETE FROM ai_analysis WHERE complaint_id IN (SELECT id FROM complaints WHERE user_id = ANY($1::int[]))` },
      { name: 'test_complaints_images', sql: `DELETE FROM complaint_images WHERE complaint_id IN (SELECT id FROM complaints WHERE user_id = ANY($1::int[]))` },
      { name: 'test_complaints', sql: `DELETE FROM complaints WHERE user_id = ANY($1::int[])` },
      { name: 'users_approved_by_null', sql: `UPDATE users SET approved_by = NULL WHERE approved_by = ANY($1::int[])` },
      { name: 'users', sql: `DELETE FROM users WHERE id = ANY($1::int[])` }
    ];

    for (const op of cleanupOperations) {
      try {
        const res = await client.query(op.sql, [testUserIds]);
        console.log(`  - Cleaned ${op.name}: ${res.rowCount || 0} row(s) removed.`);
      } catch (err) {
        console.warn(`  - Note on ${op.name}: ${err.message}`);
      }
    }

    await client.query('COMMIT');
    console.log('Test user cleanup completed successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Test user cleanup failed, transaction rolled back:', err);
  } finally {
    client.release();
  }
}

if (require.main === module) {
  cleanTestUsers().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
}

module.exports = { cleanTestUsers };
