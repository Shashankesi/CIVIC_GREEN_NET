require('dotenv').config();
const db = require('../config/db');
const logger = require('../utils/logger');

/**
 * Safely cleans up all automated and manual test data:
 * - Test users (created during Jest, Phase/P8/P7 tests, or with test email domains)
 * - Test complaints / issues reported during testing
 * - Test email logs, verification tokens, password resets, and test notifications
 * Preserves ALL legitimate users, production complaints, real officers, and real citizens.
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
    const identifyUsersSql = `
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
        OR email = 'admin@civicgreennet.local'
      ORDER BY id ASC;
    `;

    const testUsersRes = await client.query(identifyUsersSql);
    const testUsers = testUsersRes.rows;
    const testUserIds = testUsers.map(u => u.id);

    console.log(`Found ${testUsers.length} test user account(s) to remove:`);
    testUsers.forEach(u => console.log(`  [#${u.id}] ${u.name} <${u.email}> (${u.role})`));

    // 2. Identify test complaints/issues created during automated/manual test runs
    const identifyComplaintsSql = `
      SELECT id, title, user_id, status, created_at
      FROM complaints
      WHERE
        (user_id IS NOT NULL AND user_id = ANY($1::int[]))
        OR title LIKE 'Hazardous deep pothole near Sector 17%'
        OR title LIKE 'Phase 8 Drainage Overflow%'
        OR title LIKE 'CI Complaint%'
        OR title LIKE 'Broken water pipe near Sector 17 Plaza%'
        OR title LIKE 'Confidential Inspection%'
        OR description LIKE 'P8 test complaint%'
        OR description = 'Restricted memo'
        OR description = 'ci'
      ORDER BY id ASC;
    `;

    const testComplaintsRes = await client.query(identifyComplaintsSql, [testUserIds.length > 0 ? testUserIds : [-1]]);
    const testComplaints = testComplaintsRes.rows;
    const testComplaintIds = testComplaints.map(c => c.id);

    console.log(`\nFound ${testComplaints.length} test complaint(s)/issue(s) to remove:`);
    testComplaints.forEach(c => console.log(`  [#${c.id}] "${c.title}" (user: ${c.user_id}, status: ${c.status})`));

    // 3. Clean all child records for test complaints in foreign-key order
    if (testComplaintIds.length > 0) {
      console.log('\nCleaning test complaints child records...');
      const complaintCleanupOps = [
        { name: 'ai_analysis', sql: `DELETE FROM ai_analysis WHERE complaint_id = ANY($1::int[])` },
        { name: 'ai_audit_logs', sql: `DELETE FROM ai_audit_logs WHERE complaint_id = ANY($1::int[])` },
        { name: 'complaint_images', sql: `DELETE FROM complaint_images WHERE complaint_id = ANY($1::int[])` },
        { name: 'complaint_votes', sql: `DELETE FROM complaint_votes WHERE complaint_id = ANY($1::int[])` },
        { name: 'complaint_follows', sql: `DELETE FROM complaint_follows WHERE complaint_id = ANY($1::int[])` },
        { name: 'comment_reports', sql: `DELETE FROM comment_reports WHERE comment_id IN (SELECT id FROM complaint_comments WHERE complaint_id = ANY($1::int[]))` },
        { name: 'complaint_comments', sql: `DELETE FROM complaint_comments WHERE complaint_id = ANY($1::int[])` },
        { name: 'complaint_reopenings', sql: `DELETE FROM complaint_reopenings WHERE complaint_id = ANY($1::int[])` },
        { name: 'complaint_notes', sql: `DELETE FROM complaint_notes WHERE complaint_id = ANY($1::int[])` },
        { name: 'complaint_assignments', sql: `DELETE FROM complaint_assignments WHERE complaint_id = ANY($1::int[])` },
        { name: 'complaint_status_history', sql: `DELETE FROM complaint_status_history WHERE complaint_id = ANY($1::int[])` },
        { name: 'duplicate_complaints', sql: `DELETE FROM duplicate_complaints WHERE complaint_id = ANY($1::int[]) OR duplicate_of = ANY($1::int[])` },
        { name: 'point_transactions', sql: `DELETE FROM point_transactions WHERE complaint_id = ANY($1::int[])` },
        {
          name: 'notifications_by_complaint',
          sql: `DELETE FROM notifications WHERE (payload->>'complaintId' = ANY($1::text[])) OR (payload->>'complaint_id' = ANY($1::text[]))`
        },
        { name: 'email_logs_by_complaint', sql: `DELETE FROM email_logs WHERE complaint_id = ANY($1::int[])` },
        { name: 'complaints', sql: `DELETE FROM complaints WHERE id = ANY($1::int[])` }
      ];

      for (const op of complaintCleanupOps) {
        if (op.name === 'notifications_by_complaint') {
          const stringIds = testComplaintIds.map(String);
          const res = await client.query(op.sql, [stringIds]);
          console.log(`  - Cleaned ${op.name}: ${res.rowCount || 0} row(s) removed.`);
        } else {
          const res = await client.query(op.sql, [testComplaintIds]);
          console.log(`  - Cleaned ${op.name}: ${res.rowCount || 0} row(s) removed.`);
        }
      }
    }

    // 4. Clean test email logs and test emails
    console.log('\nCleaning test emails & email logs...');
    const emailCleanupSql = `
      DELETE FROM email_logs
      WHERE
        (user_id IS NOT NULL AND user_id = ANY($1::int[]))
        OR recipient LIKE '%@example.com'
        OR recipient LIKE '%@civicgreennet.gov.in'
        OR recipient LIKE '%@chandigarh.gov.in'
        OR recipient LIKE '%@civicgreennet.gov'
    `;
    const emailRes = await client.query(emailCleanupSql, [testUserIds.length > 0 ? testUserIds : [-1]]);
    console.log(`  - Cleaned test email_logs: ${emailRes.rowCount || 0} row(s) removed.`);

    // 5. Clean test users' related child records & users table in foreign-key order
    if (testUserIds.length > 0) {
      console.log('\nCleaning test user child records...');
      const userCleanupOps = [
        { name: 'point_transactions', sql: `DELETE FROM point_transactions WHERE user_id = ANY($1::int[]) OR created_by = ANY($1::int[])` },
        { name: 'point_rules', sql: `UPDATE point_rules SET updated_by = NULL WHERE updated_by = ANY($1::int[])` },
        { name: 'user_badges', sql: `DELETE FROM user_badges WHERE user_id = ANY($1::int[])` },
        { name: 'citizen_contribution_events', sql: `DELETE FROM citizen_contribution_events WHERE user_id = ANY($1::int[])` },
        { name: 'citizen_badges', sql: `DELETE FROM citizen_badges WHERE user_id = ANY($1::int[])` },
        { name: 'complaint_votes', sql: `DELETE FROM complaint_votes WHERE user_id = ANY($1::int[])` },
        { name: 'complaint_follows', sql: `DELETE FROM complaint_follows WHERE user_id = ANY($1::int[])` },
        { name: 'comment_reports', sql: `DELETE FROM comment_reports WHERE reporter_id = ANY($1::int[]) OR reviewed_by = ANY($1::int[])` },
        { name: 'complaint_comments', sql: `DELETE FROM complaint_comments WHERE user_id = ANY($1::int[])` },
        { name: 'complaint_reopenings', sql: `DELETE FROM complaint_reopenings WHERE user_id = ANY($1::int[])` },
        { name: 'complaint_notes', sql: `DELETE FROM complaint_notes WHERE user_id = ANY($1::int[])` },
        { name: 'notifications_by_user', sql: `DELETE FROM notifications WHERE user_id = ANY($1::int[])` },
        { name: 'notification_preferences', sql: `DELETE FROM notification_preferences WHERE user_id = ANY($1::int[])` },
        { name: 'user_settings', sql: `DELETE FROM user_settings WHERE user_id = ANY($1::int[])` },
        { name: 'email_logs_by_user', sql: `DELETE FROM email_logs WHERE user_id = ANY($1::int[])` },
        { name: 'password_resets', sql: `DELETE FROM password_resets WHERE user_id = ANY($1::int[])` },
        { name: 'email_verifications', sql: `DELETE FROM email_verifications WHERE user_id = ANY($1::int[])` },
        { name: 'refresh_tokens', sql: `DELETE FROM refresh_tokens WHERE user_id = ANY($1::int[])` },
        { name: 'ai_feedback', sql: `DELETE FROM ai_feedback WHERE user_id = ANY($1::int[])` },
        { name: 'ai_messages', sql: `DELETE FROM ai_messages WHERE conversation_id IN (SELECT id FROM ai_conversations WHERE user_id = ANY($1::int[]))` },
        { name: 'ai_conversations', sql: `DELETE FROM ai_conversations WHERE user_id = ANY($1::int[])` },
        { name: 'ai_audit_logs', sql: `DELETE FROM ai_audit_logs WHERE user_id = ANY($1::int[])` },
        { name: 'ai_analysis_override', sql: `UPDATE ai_analysis SET overridden_by = NULL WHERE overridden_by = ANY($1::int[])` },
        { name: 'audit_logs', sql: `DELETE FROM audit_logs WHERE actor_id = ANY($1::int[])` },
        { name: 'reports', sql: `UPDATE reports SET generated_by = NULL WHERE generated_by = ANY($1::int[])` },
        { name: 'governance_report_history', sql: `UPDATE governance_report_history SET generated_by = NULL WHERE generated_by = ANY($1::int[])` },
        { name: 'scheduled_reports', sql: `UPDATE scheduled_reports SET created_by = NULL WHERE created_by = ANY($1::int[])` },
        { name: 'officer_documents', sql: `DELETE FROM officer_documents WHERE user_id = ANY($1::int[]) OR uploaded_by = ANY($1::int[]) OR verified_by = ANY($1::int[])` },
        { name: 'complaint_assignments', sql: `DELETE FROM complaint_assignments WHERE officer_id = ANY($1::int[]) OR assigned_by = ANY($1::int[])` },
        { name: 'complaint_status_history', sql: `DELETE FROM complaint_status_history WHERE changed_by = ANY($1::int[])` },
        { name: 'complaints_officer_null', sql: `UPDATE complaints SET officer_id = NULL WHERE officer_id = ANY($1::int[])` },
        { name: 'users_approved_by_null', sql: `UPDATE users SET approved_by = NULL WHERE approved_by = ANY($1::int[])` },
        { name: 'users', sql: `DELETE FROM users WHERE id = ANY($1::int[])` }
      ];

      for (const op of userCleanupOps) {
        const res = await client.query(op.sql, [testUserIds]);
        console.log(`  - Cleaned ${op.name}: ${res.rowCount || 0} row(s) removed/updated.`);
      }
    }

    await client.query('COMMIT');
    console.log('\n✅ All test users, test complaints, test emails, and related records successfully cleaned up!');
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
