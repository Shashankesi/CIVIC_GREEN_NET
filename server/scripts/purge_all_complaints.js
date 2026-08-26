require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const db = require('../config/db');

async function purgeAllComplaints() {
  console.log('=====================================================');
  console.log('CIVIC GREENNET — PURGING ALL REPORTED COMPLAINTS');
  console.log('=====================================================');

  const client = await db._pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Check current complaint count
    const compCountRes = await client.query('SELECT COUNT(*)::int AS count FROM complaints');
    const totalComplaints = compCountRes.rows[0].count;
    console.log(`Found ${totalComplaints} existing complaints to remove.`);

    // 2. Remove dependent items in correct relational order
    console.log('Clearing dependent records...');

    // a. Comment reports
    const delCommentReports = await client.query('DELETE FROM comment_reports');
    console.log(`  - comment_reports: deleted ${delCommentReports.rowCount}`);

    // b. Complaint comments
    const delComments = await client.query('DELETE FROM complaint_comments');
    console.log(`  - complaint_comments: deleted ${delComments.rowCount}`);

    // c. Complaint votes
    const delVotes = await client.query('DELETE FROM complaint_votes');
    console.log(`  - complaint_votes: deleted ${delVotes.rowCount}`);

    // d. Complaint follows
    const delFollows = await client.query('DELETE FROM complaint_follows');
    console.log(`  - complaint_follows: deleted ${delFollows.rowCount}`);

    // e. Complaint reopenings
    const delReopenings = await client.query('DELETE FROM complaint_reopenings');
    console.log(`  - complaint_reopenings: deleted ${delReopenings.rowCount}`);

    // f. Complaint team members & teams
    const delTeamMembers = await client.query('DELETE FROM complaint_team_members');
    console.log(`  - complaint_team_members: deleted ${delTeamMembers.rowCount}`);

    const delTeams = await client.query('DELETE FROM complaint_teams');
    console.log(`  - complaint_teams: deleted ${delTeams.rowCount}`);

    // g. Complaint assignments
    const delAssignments = await client.query('DELETE FROM complaint_assignments');
    console.log(`  - complaint_assignments: deleted ${delAssignments.rowCount}`);

    // h. Complaint notes
    const delNotes = await client.query('DELETE FROM complaint_notes');
    console.log(`  - complaint_notes: deleted ${delNotes.rowCount}`);

    // i. Resource requests
    const delResourceReqs = await client.query('DELETE FROM resource_requests');
    console.log(`  - resource_requests: deleted ${delResourceReqs.rowCount}`);

    // j. Status history
    const delStatusHistory = await client.query('DELETE FROM complaint_status_history');
    console.log(`  - complaint_status_history: deleted ${delStatusHistory.rowCount}`);

    // k. Complaint images
    const delImages = await client.query('DELETE FROM complaint_images');
    console.log(`  - complaint_images: deleted ${delImages.rowCount}`);

    // l. Duplicates & Clusters
    const delDupClusters = await client.query('DELETE FROM complaint_duplicate_clusters');
    console.log(`  - complaint_duplicate_clusters: deleted ${delDupClusters.rowCount}`);

    const delDuplicates = await client.query('DELETE FROM duplicate_complaints');
    console.log(`  - duplicate_complaints: deleted ${delDuplicates.rowCount}`);

    // m. AI Analysis & Audit Logs
    const delAiAnalysis = await client.query('DELETE FROM ai_analysis');
    console.log(`  - ai_analysis: deleted ${delAiAnalysis.rowCount}`);

    const delAiAuditLogs = await client.query('DELETE FROM ai_audit_logs');
    console.log(`  - ai_audit_logs: deleted ${delAiAuditLogs.rowCount}`);

    // n. Civic Hotspots
    const delHotspots = await client.query('DELETE FROM civic_hotspots');
    console.log(`  - civic_hotspots: deleted ${delHotspots.rowCount}`);

    // o. Reports & Governance
    const delReports = await client.query('DELETE FROM reports');
    console.log(`  - reports: deleted ${delReports.rowCount}`);

    // p. Complaint-related Notifications
    const delNotifications = await client.query(`
      DELETE FROM notifications 
      WHERE (payload->>'complaintId') IS NOT NULL 
         OR (payload->>'complaint_id') IS NOT NULL
         OR type IN ('COMPLAINT', 'STATUS_UPDATE', 'ASSIGNMENT', 'OFFICER_ASSIGNMENT', 'VERIFICATION')
    `);
    console.log(`  - notifications (complaint-related): deleted ${delNotifications.rowCount}`);

    // q. Audit Logs for complaints
    const delAudit = await client.query(`DELETE FROM audit_logs WHERE target_type = 'complaint'`);
    console.log(`  - audit_logs (complaint-related): deleted ${delAudit.rowCount}`);

    // r. Point transactions linking to complaints (set null or delete)
    const updatePt = await client.query(`UPDATE point_transactions SET complaint_id = NULL WHERE complaint_id IS NOT NULL`);
    console.log(`  - point_transactions unlinked: ${updatePt.rowCount}`);

    // s. Email logs linking to complaints
    const updateEmail = await client.query(`UPDATE email_logs SET complaint_id = NULL WHERE complaint_id IS NOT NULL`);
    console.log(`  - email_logs unlinked: ${updateEmail.rowCount}`);

    // 3. Delete all complaints
    const delComplaints = await client.query('DELETE FROM complaints');
    console.log(`\n✓ Successfully deleted all ${delComplaints.rowCount} complaints from database.`);

    await client.query('COMMIT');
    console.log('\n✅ TRANSACTION COMMITTED SUCCESSFULLY.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌ ERROR OCCURRED — TRANSACTION ROLLED BACK:', err);
    throw err;
  } finally {
    client.release();
  }

  // Verification
  console.log('\n=====================================================');
  console.log('POST-PURGE DATABASE VERIFICATION');
  console.log('=====================================================');

  const compCheck = await db.query('SELECT COUNT(*)::int AS count FROM complaints');
  console.log(`Complaints Remaining: ${compCheck.rows[0].count}`);

  const userCount = await db.query('SELECT role, COUNT(*)::int AS count FROM users GROUP BY role ORDER BY role');
  console.log('Users Remaining by Role:');
  console.table(userCount.rows);

  await db._pool.end();
}

purgeAllComplaints().catch(console.error);
