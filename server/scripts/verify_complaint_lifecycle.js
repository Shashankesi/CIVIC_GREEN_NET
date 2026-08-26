require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const db = require('../config/db');
const complaintService = require('../services/complaintService');
const complaintRepo = require('../repositories/complaintRepository');
const adminComplaintRepo = require('../repositories/adminComplaintRepository');

async function testFullComplaintLifecycle() {
  console.log('=====================================================');
  console.log('TESTING REAL COMPLAINT CREATION & FETCHING WORKFLOW');
  console.log('=====================================================');

  try {
    // 1. Get real citizen and officer IDs from DB
    const citizenRes = await db.query("SELECT id, name, email FROM users WHERE role = 'citizen' LIMIT 1");
    const officerRes = await db.query("SELECT id, name, email, department_id FROM users WHERE role = 'officer' LIMIT 1");
    const adminRes = await db.query("SELECT id, name, email FROM users WHERE role = 'admin' LIMIT 1");

    if (!citizenRes.rows.length || !officerRes.rows.length) {
      throw new Error('Required genuine users (citizen/officer) not found in database.');
    }

    const citizen = citizenRes.rows[0];
    const officer = officerRes.rows[0];
    const admin = adminRes.rows[0];

    console.log(`Using Citizen: #${citizen.id} (${citizen.name})`);
    console.log(`Using Officer: #${officer.id} (${officer.name}, Dept: ${officer.department_id})`);
    if (admin) console.log(`Using Admin: #${admin.id} (${admin.name})`);

    // 2. Test Complaint Creation via ComplaintService
    console.log('\n[Step 1] Creating a genuine civic complaint via complaintService...');
    const payload = {
      userId: citizen.id,
      departmentId: officer.department_id || 1,
      title: 'Water Leakage Near Sector 22 Market',
      description: 'Major water pipeline leakage observed since morning causing waterlogging on the pedestrian footpath.',
      category: 'water',
      priority: 'high',
      severity: 'moderate',
      isAnonymous: false,
      address: 'Sector 22 Market, Chandigarh',
      location: { lat: 30.7333, lng: 76.7794 }
    };

    const createdComplaint = await complaintService.createComplaint(payload, []);
    console.log(`✓ Complaint created successfully! ID: #${createdComplaint.id}`);
    console.log(`  - Title: "${createdComplaint.title}"`);
    console.log(`  - Category: ${createdComplaint.category}`);
    console.log(`  - Priority: ${createdComplaint.priority}`);
    console.log(`  - SLA Due At: ${createdComplaint.sla_due_at}`);

    // 3. Test Citizen Fetching
    console.log('\n[Step 2] Testing Citizen Data Fetching...');
    const citizenComplaints = await complaintService.searchComplaints({
      userId: citizen.id,
      page: 1,
      limit: 10
    });
    console.log(`✓ Citizen search returned ${citizenComplaints.length} complaint(s).`);
    const foundMine = citizenComplaints.find(c => c.id === createdComplaint.id);
    if (!foundMine) throw new Error('Created complaint not found in citizen complaint list!');
    console.log(`  - Found complaint in citizen list: #${foundMine.id} - ${foundMine.title}`);

    // 4. Test Single Complaint Details Fetching
    console.log('\n[Step 3] Testing getComplaint details...');
    const singleComplaint = await complaintService.getComplaint(createdComplaint.id);
    if (!singleComplaint || singleComplaint.title !== payload.title) {
      throw new Error('Complaint retrieval by ID failed or data mismatch.');
    }
    console.log(`✓ Retrieved single complaint: #${singleComplaint.id} [${singleComplaint.status}]`);

    // 5. Test Admin Complaint Listing
    console.log('\n[Step 4] Testing Admin Complaint Listing...');
    const adminData = await adminComplaintRepo.listComplaints({
      page: 1,
      limit: 20
    });
    console.log(`✓ Admin listComplaints returned ${adminData.items?.length || 0} complaint(s), total: ${adminData.total}`);
    const foundAdmin = adminData.items?.find(c => c.id === createdComplaint.id);
    if (!foundAdmin) throw new Error('Created complaint not found in admin complaint list!');
    console.log(`  - Found complaint in admin list: #${foundAdmin.id} - ${foundAdmin.title}`);

    // 6. Test Assigning Complaint to Officer
    console.log('\n[Step 5] Assigning complaint to officer...');
    const assignmentService = require('../services/assignmentService');
    await assignmentService.assign({
      complaintId: createdComplaint.id,
      officerId: officer.id,
      assignedBy: admin ? admin.id : citizen.id
    });
    console.log(`✓ Assigned complaint #${createdComplaint.id} to Officer #${officer.id} (${officer.name})`);

    // 7. Test Officer Assigned Complaints Fetching
    console.log('\n[Step 6] Testing Officer Assigned Complaints Fetching...');
    const officerComplaints = await complaintRepo.searchComplaints({
      officerId: officer.id,
      page: 1,
      limit: 10
    });
    console.log(`✓ Officer search returned ${officerComplaints.length} assigned complaint(s).`);
    const foundOfficer = officerComplaints.find(c => c.id === createdComplaint.id);
    if (!foundOfficer) throw new Error('Assigned complaint not found in officer queue!');
    console.log(`  - Found complaint in officer assigned list: #${foundOfficer.id} [Status: ${foundOfficer.status}]`);

    // 8. Test Officer Accepting, Starting Work, Adding Note, and Resolving
    console.log('\n[Step 7] Testing Officer Accepting Complaint...');
    const timelineService = require('../services/timelineService');
    await timelineService.changeStatus(createdComplaint.id, 'accepted', officer.id, 'Officer accepted the assignment.');
    console.log('✓ Status changed: assigned -> accepted');

    console.log('\n[Step 8] Testing Officer Starting Work & Adding Notes...');
    await db.query(
      `INSERT INTO complaint_notes (complaint_id, user_id, note, is_internal, created_at)
       VALUES ($1, $2, 'Inspected site; repair team dispatched.', false, now())`,
      [createdComplaint.id, officer.id]
    );
    await timelineService.changeStatus(createdComplaint.id, 'in_progress', officer.id, 'Repair underway at Sector 22.');
    console.log('✓ Status changed: accepted -> in_progress');

    console.log('\n[Step 9] Testing Officer Resolving Complaint...');
    await timelineService.changeStatus(createdComplaint.id, 'resolved', officer.id, 'Pipeline fixed and road cleared.');
    console.log('✓ Status changed: in_progress -> resolved');

    const updatedComplaint = await complaintService.getComplaint(createdComplaint.id);
    console.log(`✓ Current Complaint Status: ${updatedComplaint.status}`);

    // 9. Clean up this test complaint to keep database completely clean
    console.log('\n[Step 10] Cleaning up test complaint...');
    await complaintRepo.deleteComplaint(createdComplaint.id);
    console.log(`✓ Successfully cleaned up test complaint #${createdComplaint.id}`);

    const finalCheck = await db.query('SELECT COUNT(*)::int AS count FROM complaints');
    console.log(`\nFinal Complaints in DB: ${finalCheck.rows[0].count}`);

    console.log('\n=====================================================');
    console.log('✅ ALL COMPLAINT WORKFLOWS VERIFIED TO WORK PERFECTLY!');
    console.log('=====================================================');

    await db._pool.end();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Verification failed:', err);
    await db._pool.end();
    process.exit(1);
  }
}

testFullComplaintLifecycle().catch(console.error);
