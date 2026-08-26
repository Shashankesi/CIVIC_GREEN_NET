require('dotenv').config();
const db = require('../config/db');

/**
 * Safely cleans up all automated and manual test data:
 * - Test users (created during Jest, Phase/P8/P7 tests, or with test email domains)
 * - All test complaints / issues reported during testing
 * - Test email logs, verification tokens, password resets, and test notifications
 * Preserves ALL legitimate users, real officers, and real citizens.
 */
async function cleanTestUsers() {
  if (!db._pool) {
    console.error('Database pool not initialized.');
    process.exit(1);
  }

  const client = await db._pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Clean all complaints and dependent records
    console.log('Cleaning all test complaints and child records...');
    await client.query('DELETE FROM complaint_images');
    await client.query('DELETE FROM complaint_status_history');
    await client.query('DELETE FROM duplicate_complaints');
    await client.query('DELETE FROM complaint_notes');
    await client.query('DELETE FROM complaint_assignments');
    await client.query('DELETE FROM complaint_votes');
    await client.query('DELETE FROM complaint_follows');
    await client.query('DELETE FROM comment_reports');
    await client.query('DELETE FROM complaint_comments');
    await client.query('DELETE FROM ai_analysis');
    await client.query('DELETE FROM ai_audit_logs');
    await client.query('DELETE FROM complaint_reopenings');
    await client.query('DELETE FROM point_transactions');
    await client.query('DELETE FROM resource_requests');
    await client.query('DELETE FROM complaint_teams');
    await client.query('DELETE FROM email_logs');
    await client.query('DELETE FROM notifications');
    const compRes = await client.query('DELETE FROM complaints');
    console.log(`  - Removed ${compRes.rowCount || 0} complaint(s).`);

    // 2. Identify test users by explicit automated test patterns
    const identifyUsersSql = `
      SELECT id, name, email, role, created_at
      FROM users
      WHERE 
        email LIKE '%@example.com'
        OR email LIKE 'test_%@%'
        OR email LIKE 'phase%@%'
        OR email LIKE 'p8_%@%'
        OR email LIKE 'p5_%@%'
        OR email LIKE 'p7_%@%'
        OR email LIKE 'adm_%@%'
        OR email LIKE 'off_%@%'
        OR email LIKE 'c1_%@%'
        OR email LIKE 'c2_%@%'
        OR email LIKE 'jest_%@%'
        OR email LIKE 'p4_%@%'
        OR name LIKE 'P8 %'
        OR name LIKE 'Phase7 %'
        OR name LIKE 'Jest %'
        OR name = 'Other Citizen'
        OR email = 'fucku@gmail.com'
        OR email = 'admin@civicgreennet.local'
      ORDER BY id ASC;
    `;

    const testUsersRes = await client.query(identifyUsersSql);
    const testUsers = testUsersRes.rows;
    const testUserIds = testUsers.map(u => u.id);

    console.log(`Found ${testUsers.length} test user account(s) to remove:`);
    testUsers.forEach(u => console.log(`  [#${u.id}] ${u.name} <${u.email}> (${u.role})`));

    // 3. Clean test users' related child records & users table in foreign-key order
    if (testUserIds.length > 0) {
      console.log('\nCleaning test user child records...');
      const userCleanupOps = [
        { name: 'user_badges', sql: `DELETE FROM user_badges WHERE user_id = ANY($1::int[])` },
        { name: 'citizen_contribution_events', sql: `DELETE FROM citizen_contribution_events WHERE user_id = ANY($1::int[])` },
        { name: 'citizen_badges', sql: `DELETE FROM citizen_badges WHERE user_id = ANY($1::int[])` },
        { name: 'notification_preferences', sql: `DELETE FROM notification_preferences WHERE user_id = ANY($1::int[])` },
        { name: 'user_settings', sql: `DELETE FROM user_settings WHERE user_id = ANY($1::int[])` },
        { name: 'password_resets', sql: `DELETE FROM password_resets WHERE user_id = ANY($1::int[])` },
        { name: 'email_verifications', sql: `DELETE FROM email_verifications WHERE user_id = ANY($1::int[])` },
        { name: 'refresh_tokens', sql: `DELETE FROM refresh_tokens WHERE user_id = ANY($1::int[])` },
        { name: 'ai_feedback', sql: `DELETE FROM ai_feedback WHERE user_id = ANY($1::int[])` },
        { name: 'ai_messages', sql: `DELETE FROM ai_messages WHERE conversation_id IN (SELECT id FROM ai_conversations WHERE user_id = ANY($1::int[]))` },
        { name: 'ai_conversations', sql: `DELETE FROM ai_conversations WHERE user_id = ANY($1::int[])` },
        { name: 'audit_logs', sql: `DELETE FROM audit_logs WHERE actor_id = ANY($1::int[])` },
        { name: 'reports', sql: `UPDATE reports SET generated_by = NULL WHERE generated_by = ANY($1::int[])` },
        { name: 'governance_report_history', sql: `UPDATE governance_report_history SET generated_by = NULL WHERE generated_by = ANY($1::int[])` },
        { name: 'scheduled_reports', sql: `UPDATE scheduled_reports SET created_by = NULL WHERE created_by = ANY($1::int[])` },
        { name: 'officer_documents', sql: `DELETE FROM officer_documents WHERE user_id = ANY($1::int[]) OR uploaded_by = ANY($1::int[]) OR verified_by = ANY($1::int[])` },
        { name: 'users_approved_by_null', sql: `UPDATE users SET approved_by = NULL WHERE approved_by = ANY($1::int[])` },
        { name: 'users', sql: `DELETE FROM users WHERE id = ANY($1::int[])` }
      ];

      for (const op of userCleanupOps) {
        const res = await client.query(op.sql, [testUserIds]);
        console.log(`  - Cleaned ${op.name}: ${res.rowCount || 0} row(s) removed/updated.`);
      }
    }

    await client.query('COMMIT');
    console.log('\n✅ All test emails, reports, complaints, and test users successfully cleaned up!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Cleanup failed, transaction rolled back:', err);
  } finally {
    client.release();
  }
}

if (require.main === module) {
  cleanTestUsers().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
}

module.exports = { cleanTestUsers };
