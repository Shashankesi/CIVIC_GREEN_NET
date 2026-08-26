const db = require('../config/db');
const adminDeptService = require('../services/adminDepartmentService');
const assignmentService = require('../services/assignmentService');
const resourceRequestService = require('../services/resourceRequestService');
const timelineService = require('../services/timelineService');
const aiTools = require('../services/ai/aiTools');
const officerCopilot = require('../services/ai/officerCopilot');
const complaintRepo = require('../repositories/complaintRepository');

describe('Civic GreenNet End-to-End Assignment & Resolution Workflow', () => {
  const testComplaintId = 73;
  let deptRoads;
  let targetOfficer;
  let adminUser;
  let resourceReq;

  beforeAll(async () => {
    const { rows: depts } = await db.query('SELECT * FROM departments ORDER BY id ASC');
    deptRoads = depts.find(d => d.name.toLowerCase().includes('road')) || depts[0];

    const { rows: adminRows } = await db.query("SELECT id, name FROM users WHERE role = 'admin' LIMIT 1");
    adminUser = adminRows[0] || { id: null };

    const roadsOfficers = await adminDeptService.listOfficers({ departmentId: deptRoads.id });
    if (roadsOfficers.length > 0) {
      targetOfficer = roadsOfficers[0];
    } else {
      const { rows: anyOff } = await db.query("SELECT id, name, department_id FROM users WHERE role = 'officer' AND status IN ('active', 'approved') LIMIT 1");
      if (anyOff.length > 0) {
        targetOfficer = anyOff[0];
        await db.query('UPDATE users SET department_id = $1 WHERE id = $2', [deptRoads.id, targetOfficer.id]);
      }
    }
  });

  afterAll(async () => {
    // Keep complaint 73 clean
  });

  it('1. Department-specific officer listing & workload metrics', async () => {
    const roadsOfficers = await adminDeptService.listOfficers({ departmentId: deptRoads.id });
    expect(Array.isArray(roadsOfficers)).toBe(true);
    if (roadsOfficers.length > 0) {
      expect(typeof roadsOfficers[0].currentWorkload).toBe('number');
      expect(typeof roadsOfficers[0].slaRisk).toBe('string');
    }
  });

  it('2. Strict Department Validation rejects cross-department officer assignment', async () => {
    const { rows: depts } = await db.query('SELECT * FROM departments ORDER BY id ASC');
    const otherDept = depts.find(d => d.id !== deptRoads.id);
    if (otherDept && targetOfficer) {
      await expect(
        assignmentService.assign({
          complaintId: testComplaintId,
          departmentId: otherDept.id,
          officerId: targetOfficer.id,
          assignedBy: adminUser.id
        })
      ).rejects.toThrow('Selected officer does not belong to this department.');
    }
  });

  it('3. Atomic Assignment updates department, officer, status, and logs history', async () => {
    const assignResult = await assignmentService.assign({
      complaintId: testComplaintId,
      departmentId: deptRoads.id,
      officerId: targetOfficer.id,
      priority: 'high',
      assignedBy: adminUser.id
    });

    expect(assignResult.status).toBe('assigned');
    expect(assignResult.officer_id).toBe(targetOfficer.id);
    expect(assignResult.department_id).toBe(deptRoads.id);

    const { rows: assignHistory } = await db.query(
      'SELECT * FROM complaint_assignments WHERE complaint_id = $1 AND officer_id = $2 ORDER BY assigned_at DESC LIMIT 1',
      [testComplaintId, targetOfficer.id]
    );
    expect(assignHistory.length).toBeGreaterThan(0);
  });

  it('4. Officer accepts assignment', async () => {
    await complaintRepo.updateComplaint(testComplaintId, { status: 'accepted' });
    await db.query("UPDATE complaint_assignments SET status = 'ACCEPTED' WHERE complaint_id = $1 AND officer_id = $2", [testComplaintId, targetOfficer.id]);
    await complaintRepo.addStatusHistory(testComplaintId, 'assigned', 'accepted', targetOfficer.id, 'Officer accepted assignment.');

    const updated = await complaintRepo.getById(testComplaintId);
    expect(updated.status).toBe('accepted');
  });

  it('5. Officer starts work', async () => {
    await timelineService.changeStatus(testComplaintId, 'in_progress', targetOfficer.id, 'Field work commenced by assigned officer.');
    const updated = await complaintRepo.getById(testComplaintId);
    expect(updated.status).toBe('in_progress');
  });

  it('6. Officer logs operational progress note', async () => {
    const noteRes = await db.query(
      'INSERT INTO complaint_notes(complaint_id, user_id, note, is_internal, created_at) VALUES($1, $2, $3, $4, now()) RETURNING *',
      [testComplaintId, targetOfficer.id, 'Inspection completed on site. Asphalt patch crew requested.', true]
    );
    expect(noteRes.rows.length).toBeGreaterThan(0);
  });

  it('7. Officer requests support team workforce', async () => {
    resourceReq = await resourceRequestService.createRequest({
      complaintId: testComplaintId,
      officerId: targetOfficer.id,
      requestType: 'TEAM',
      requiredPeople: 3,
      requiredSkills: 'Road resurfacing, compaction',
      priority: 'high',
      reason: 'Pothole cluster spans 15 meters and requires dedicated asphalt crew.'
    });
    expect(resourceReq.id).toBeDefined();
    expect(resourceReq.status).toBe('pending');
  });

  it('8. Admin approves resource request & dispatches support team', async () => {
    const approval = await resourceRequestService.approveRequest(resourceReq.id, adminUser.id, {
      teamName: `Roads Rapid Action Crew #${testComplaintId}`,
      memberNames: [
        { name: 'Kiran Patel', role: 'Paving Operator' },
        { name: 'Sanjay Verma', role: 'Excavation Lead' },
        { name: 'Amit Roy', role: 'Traffic Safety' }
      ]
    });
    expect(approval.request.status).toBe('approved');

    const teamData = await resourceRequestService.getTeamForComplaint(testComplaintId);
    expect(teamData).not.toBeNull();
    expect(teamData.members.length).toBe(3);
  });

  it('9. Officer marks complaint resolved', async () => {
    await timelineService.changeStatus(testComplaintId, 'resolved', targetOfficer.id, 'Road crater fully patched and leveled. Traffic restored.');
    await db.query('UPDATE complaints SET resolution_note = $1 WHERE id = $2', ['Road crater fully patched and leveled. Traffic restored.', testComplaintId]);
    const updated = await complaintRepo.getById(testComplaintId);
    expect(updated.status).toBe('resolved');
  });

  it('10. Timeline aggregates all events in sequence', async () => {
    const fullTimeline = await timelineService.getTimeline(testComplaintId);
    expect(fullTimeline.history.length).toBeGreaterThan(0);
    const actionTypes = fullTimeline.history.map(h => h.action_type);
    expect(actionTypes).toContain('ASSIGNED');
    expect(actionTypes).toContain('TEAM_ASSIGNED');
  });

  it('11. Officer Copilot AI context grounding and intent parsing', async () => {
    const officerDetails = await aiTools.getOfficerComplaintDetails(targetOfficer.id, testComplaintId);
    expect(officerDetails.rawId === testComplaintId || officerDetails.ticketId?.includes(String(testComplaintId)) || officerDetails.id === testComplaintId).toBe(true);
    expect(officerDetails.supportTeam).not.toBeNull();
    expect(officerDetails.resolutionReadiness).not.toBeNull();

    const match1 = officerCopilot.fastMatchOfficerIntent(`What should I do with complaint #${testComplaintId}?`);
    expect(match1.intent).toBe('COMPLAINT_DETAILS');

    const match2 = officerCopilot.fastMatchOfficerIntent('How many active complaints do I have?');
    expect(match2.intent).toBe('MY_WORKLOAD');
  });

  it('12. Admin verifies and closes complaint', async () => {
    const adminVerify = await timelineService.changeStatus(testComplaintId, 'closed', adminUser.id, 'Administrative resolution quality verification passed.');
    expect(adminVerify.status).toBe('closed');
  });
});
