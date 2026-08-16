/**
 * Civic GreenNet — Controlled Production Test Data Cleanup Script
 * Database: Neon PostgreSQL
 * 
 * Safely removes test users, test complaints, and their dependent records
 * while strictly preserving all genuine users, complaints, municipal structures, and settings.
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const db = require('../config/db');

async function cleanProductionTestData() {
  console.log('=====================================================');
  console.log('CIVIC GREENNET — CONTROLLED TEST DATA CLEANUP');
  console.log('=====================================================');
  console.log('Database Provider: Neon PostgreSQL');
  console.log('Database URL Host:', process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] || 'Neon Host');

  const client = await db._pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Identify Test Users
    const testUserQuery = `
      SELECT id, name, email, role, status
      FROM users
      WHERE 
        LOWER(email) LIKE '%@example.com'
        OR LOWER(email) LIKE 'p8_%'
        OR LOWER(email) LIKE 'p6_%'
        OR LOWER(email) LIKE 'phase%'
        OR LOWER(email) LIKE 'jest_%'
        OR LOWER(email) LIKE 'resend_%'
        OR LOWER(email) LIKE 'civicgreennet+test%'
        OR LOWER(email) LIKE 'civicgreennet+officer%'
        OR LOWER(name) LIKE 'p8 %'
        OR LOWER(name) LIKE 'p6 %'
        OR LOWER(name) LIKE 'phase%'
        OR LOWER(name) LIKE 'other citizen'
        OR LOWER(name) LIKE 'jest %'
        OR LOWER(name) LIKE 'test citizen user'
        OR LOWER(name) LIKE 'test officer user'
        OR LOWER(name) LIKE 'resend test %'
      ORDER BY id ASC
    `;
    const testUsersRes = await client.query(testUserQuery);
    const testUserIds = testUsersRes.rows.map(u => u.id);
    const testUserIdStrings = testUserIds.map(String);

    console.log(`\n[1] Identified ${testUserIds.length} test users for removal.`);

    // 2. Identify Test Complaints
    const testCompQuery = `
      SELECT id, title, status, user_id, officer_id
      FROM complaints
      WHERE
        title ILIKE '%Phase 8 Drainage Overflow%'
        OR title ILIKE '%P8 test complaint%'
        OR title ILIKE '%Hazardous deep pothole near Sector 17 main market%'
        ${testUserIds.length > 0 ? `OR user_id = ANY($1::int[]) OR officer_id = ANY($1::int[])` : ''}
      ORDER BY id ASC
    `;
    const testCompRes = await client.query(testCompQuery, testUserIds.length > 0 ? [testUserIds] : []);
    const testCompIds = testCompRes.rows.map(c => c.id);
    const testCompIdStrings = testCompIds.map(String);

    console.log(`[2] Identified ${testCompIds.length} test complaints for removal.`);

    // 3. Delete dependent records in foreign key order
    console.log('\n[3] Deleting dependent records across related tables...');

    // a. Comment reports
    if (testCompIds.length > 0 || testUserIds.length > 0) {
      const crRes = await client.query(`
        DELETE FROM comment_reports
        WHERE comment_id IN (
          SELECT id FROM complaint_comments 
          WHERE complaint_id = ANY($1::int[]) OR user_id = ANY($2::int[])
        )
        OR reporter_id = ANY($2::int[])
        OR reviewed_by = ANY($2::int[])
      `, [testCompIds, testUserIds]);
      console.log(`  - comment_reports: deleted ${crRes.rowCount}`);
    }

    // b. Complaint comments
    if (testCompIds.length > 0 || testUserIds.length > 0) {
      const ccRes = await client.query(`
        DELETE FROM complaint_comments
        WHERE complaint_id = ANY($1::int[]) OR user_id = ANY($2::int[])
      `, [testCompIds, testUserIds]);
      console.log(`  - complaint_comments: deleted ${ccRes.rowCount}`);
    }

    // c. Complaint votes
    if (testCompIds.length > 0 || testUserIds.length > 0) {
      const cvRes = await client.query(`
        DELETE FROM complaint_votes
        WHERE complaint_id = ANY($1::int[]) OR user_id = ANY($2::int[])
      `, [testCompIds, testUserIds]);
      console.log(`  - complaint_votes: deleted ${cvRes.rowCount}`);
    }

    // d. Complaint follows
    if (testCompIds.length > 0 || testUserIds.length > 0) {
      const cfRes = await client.query(`
        DELETE FROM complaint_follows
        WHERE complaint_id = ANY($1::int[]) OR user_id = ANY($2::int[])
      `, [testCompIds, testUserIds]);
      console.log(`  - complaint_follows: deleted ${cfRes.rowCount}`);
    }

    // e. Complaint reopenings
    if (testCompIds.length > 0 || testUserIds.length > 0) {
      const crpRes = await client.query(`
        DELETE FROM complaint_reopenings
        WHERE complaint_id = ANY($1::int[]) OR user_id = ANY($2::int[])
      `, [testCompIds, testUserIds]);
      console.log(`  - complaint_reopenings: deleted ${crpRes.rowCount}`);
    }

    // f. AI Audit logs
    if (testCompIds.length > 0 || testUserIds.length > 0) {
      const aialRes = await client.query(`
        DELETE FROM ai_audit_logs
        WHERE complaint_id = ANY($1::int[]) OR user_id = ANY($2::int[])
      `, [testCompIds, testUserIds]);
      console.log(`  - ai_audit_logs: deleted ${aialRes.rowCount}`);
    }

    // g. AI Feedback
    if (testUserIds.length > 0) {
      const aifbRes = await client.query(`
        DELETE FROM ai_feedback
        WHERE user_id = ANY($1::int[])
        OR message_id IN (
          SELECT id FROM ai_messages
          WHERE conversation_id IN (
            SELECT id FROM ai_conversations WHERE user_id = ANY($1::int[])
          )
        )
      `, [testUserIds]);
      console.log(`  - ai_feedback: deleted ${aifbRes.rowCount}`);
    }

    // h. AI Messages
    if (testUserIds.length > 0) {
      const aimRes = await client.query(`
        DELETE FROM ai_messages
        WHERE conversation_id IN (
          SELECT id FROM ai_conversations WHERE user_id = ANY($1::int[])
        )
      `, [testUserIds]);
      console.log(`  - ai_messages: deleted ${aimRes.rowCount}`);
    }

    // i. AI Conversations
    if (testUserIds.length > 0) {
      const aicRes = await client.query(`
        DELETE FROM ai_conversations
        WHERE user_id = ANY($1::int[])
      `, [testUserIds]);
      console.log(`  - ai_conversations: deleted ${aicRes.rowCount}`);
    }

    // j. AI Analysis
    if (testUserIds.length > 0 || testCompIds.length > 0) {
      await client.query(`
        UPDATE ai_analysis
        SET overridden_by = NULL
        WHERE overridden_by = ANY($1::int[])
      `, [testUserIds]);

      const aiaRes = await client.query(`
        DELETE FROM ai_analysis
        WHERE complaint_id = ANY($1::int[])
      `, [testCompIds]);
      console.log(`  - ai_analysis: deleted ${aiaRes.rowCount}`);
    }

    // k. Officer documents
    if (testUserIds.length > 0) {
      const odRes = await client.query(`
        DELETE FROM officer_documents
        WHERE user_id = ANY($1::int[]) OR uploaded_by = ANY($1::int[]) OR verified_by = ANY($1::int[])
      `, [testUserIds]);
      console.log(`  - officer_documents: deleted ${odRes.rowCount}`);
    }

    // l. Citizen contribution events & badges
    if (testUserIds.length > 0) {
      const cceRes = await client.query(`DELETE FROM citizen_contribution_events WHERE user_id = ANY($1::int[])`, [testUserIds]);
      console.log(`  - citizen_contribution_events: deleted ${cceRes.rowCount}`);
      const cbRes = await client.query(`DELETE FROM citizen_badges WHERE user_id = ANY($1::int[])`, [testUserIds]);
      console.log(`  - citizen_badges: deleted ${cbRes.rowCount}`);
    }

    // m. Scheduled Reports & History
    if (testUserIds.length > 0) {
      const grhRes = await client.query(`
        DELETE FROM governance_report_history
        WHERE generated_by = ANY($1::int[])
        OR scheduled_report_id IN (SELECT id FROM scheduled_reports WHERE created_by = ANY($1::int[]))
      `, [testUserIds]);
      console.log(`  - governance_report_history: deleted ${grhRes.rowCount}`);

      const srRes = await client.query(`DELETE FROM scheduled_reports WHERE created_by = ANY($1::int[])`, [testUserIds]);
      console.log(`  - scheduled_reports: deleted ${srRes.rowCount}`);
    }

    // n. Email Logs
    const elRes = await client.query(`
      DELETE FROM email_logs
      WHERE 
        user_id = ANY($1::int[])
        OR complaint_id = ANY($2::int[])
        OR LOWER(recipient) LIKE '%example.com'
        OR LOWER(recipient) LIKE 'p8_%'
        OR LOWER(recipient) LIKE 'p6_%'
        OR LOWER(recipient) LIKE 'phase%'
        OR LOWER(recipient) LIKE 'jest_%'
        OR LOWER(recipient) LIKE 'resend_%'
        OR LOWER(recipient) LIKE 'civicgreennet+test%'
        OR LOWER(recipient) LIKE 'civicgreennet+officer%'
    `, [testUserIds, testCompIds]);
    console.log(`  - email_logs: deleted ${elRes.rowCount}`);

    // o. Email Verifications
    const evRes = await client.query(`
      DELETE FROM email_verifications
      WHERE 
        user_id = ANY($1::int[])
        OR LOWER(email) LIKE '%example.com'
        OR LOWER(email) LIKE 'p8_%'
        OR LOWER(email) LIKE 'p6_%'
        OR LOWER(email) LIKE 'phase%'
        OR LOWER(email) LIKE 'jest_%'
        OR LOWER(email) LIKE 'resend_%'
        OR LOWER(email) LIKE 'civicgreennet+test%'
        OR LOWER(email) LIKE 'civicgreennet+officer%'
    `, [testUserIds]);
    console.log(`  - email_verifications: deleted ${evRes.rowCount}`);

    // p. Notifications
    if (testUserIds.length > 0) {
      const notifRes = await client.query(`DELETE FROM notifications WHERE user_id = ANY($1::int[])`, [testUserIds]);
      console.log(`  - notifications: deleted ${notifRes.rowCount}`);
    }

    // q. Audit Logs
    const auditRes = await client.query(`
      DELETE FROM audit_logs
      WHERE 
        actor_id = ANY($1::int[])
        OR (target_type = 'user' AND target_id = ANY($2::text[]))
        OR (target_type = 'complaint' AND target_id = ANY($3::text[]))
    `, [testUserIds, testUserIdStrings, testCompIdStrings]);
    console.log(`  - audit_logs: deleted ${auditRes.rowCount}`);

    // r. Refresh Tokens & Notification Preferences
    if (testUserIds.length > 0) {
      const rtRes = await client.query(`DELETE FROM refresh_tokens WHERE user_id = ANY($1::int[])`, [testUserIds]);
      console.log(`  - refresh_tokens: deleted ${rtRes.rowCount}`);

      const npRes = await client.query(`DELETE FROM notification_preferences WHERE user_id = ANY($1::int[])`, [testUserIds]);
      console.log(`  - notification_preferences: deleted ${npRes.rowCount}`);
    }

    // s. Clear self-referencing user approvals pointing to test admins
    if (testUserIds.length > 0) {
      await client.query(`
        UPDATE users
        SET approved_by = NULL
        WHERE approved_by = ANY($1::int[])
      `, [testUserIds]);
    }

    // 4. Delete Complaints
    if (testCompIds.length > 0) {
      const delCompRes = await client.query(`DELETE FROM complaints WHERE id = ANY($1::int[])`, [testCompIds]);
      console.log(`\n[4] Deleted ${delCompRes.rowCount} test complaints.`);
    }

    // 5. Delete Users
    if (testUserIds.length > 0) {
      const delUserRes = await client.query(`DELETE FROM users WHERE id = ANY($1::int[])`, [testUserIds]);
      console.log(`[5] Deleted ${delUserRes.rowCount} test users.`);
    }

    await client.query('COMMIT');
    console.log('\n✅ TRANSACTION COMMITTED SUCCESSFULLY.');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌ ERROR OCCURRED — TRANSACTION ROLLED BACK:', err);
    throw err;
  } finally {
    client.release();
  }

  // Verification of remaining data
  console.log('\n=====================================================');
  console.log('POST-CLEANUP DATABASE VERIFICATION');
  console.log('=====================================================');

  const remainingUsers = await db.query('SELECT id, name, email, role, status, is_verified FROM users ORDER BY id ASC');
  console.log(`\nRemaining Genuine Users (${remainingUsers.rows.length} total):`);
  console.table(remainingUsers.rows);

  const remainingComplaints = await db.query('SELECT id, title, category, priority, status, user_id, officer_id FROM complaints ORDER BY id ASC');
  console.log(`\nRemaining Genuine Complaints (${remainingComplaints.rows.length} total):`);
  console.table(remainingComplaints.rows);

  await db._pool.end();
}

cleanProductionTestData().catch(console.error);
