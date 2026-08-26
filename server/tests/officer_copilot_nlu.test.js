const {
  processOfficerChat,
  detectOfficerIntent,
  fastMatchOfficerIntent
} = require('../services/ai/officerCopilot');
const {
  getOfficerWorkload,
  getOfficerPriorityCases,
  getOfficerSlaAlerts,
  getOfficerPerformance,
  getOfficerPoints,
  getOfficerReputation,
  getOfficerComplaintDetails,
  calculateComplaintPriority
} = require('../services/ai/aiTools');
const db = require('../config/db');

describe('OFFICER COPILOT NLU & DYNAMIC ROUTING TESTS', () => {
  let officerUser;
  let otherOfficerUser;
  let testComplaint;

  beforeAll(async () => {
    // 1. Fetch or create test officer
    const offRes = await db.query("SELECT id, name, department_id FROM users WHERE role = 'officer' LIMIT 1");
    if (offRes.rows.length > 0) {
      officerUser = offRes.rows[0];
    } else {
      const ins = await db.query(
        "INSERT INTO users (name, email, password, role) VALUES ('Test Officer Copilot', 'officer.copilot@test.com', 'hashed', 'officer') RETURNING id, name, department_id"
      );
      officerUser = ins.rows[0];
    }

    const otherRes = await db.query("SELECT id, name, department_id FROM users WHERE role = 'officer' AND id != $1 LIMIT 1", [officerUser.id]);
    if (otherRes.rows.length > 0) {
      otherOfficerUser = otherRes.rows[0];
    } else {
      const ins2 = await db.query(
        "INSERT INTO users (name, email, password, role) VALUES ('Other Officer', 'other.officer@test.com', 'hashed', 'officer') RETURNING id, name, department_id"
      );
      otherOfficerUser = ins2.rows[0];
    }

    // 2. Fetch or create test complaint assigned to officer
    const cRes = await db.query("SELECT id FROM complaints WHERE officer_id = $1 LIMIT 1", [officerUser.id]);
    if (cRes.rows.length > 0) {
      testComplaint = cRes.rows[0];
    } else {
      const insC = await db.query(
        `INSERT INTO complaints (user_id, officer_id, department_id, title, description, category, priority, severity, status, sla_due_at)
         VALUES ($1, $2, 1, 'Pothole on Main Road', 'Dangerous deep pothole near junction', 'roads', 'high', 'critical', 'assigned', now() + INTERVAL '4 hours')
         RETURNING id`,
        [officerUser.id, officerUser.id]
      );
      testComplaint = insC.rows[0];
    }
  });

  // ==========================================
  // INTENT ROUTING TESTS
  // ==========================================

  test('TEST 1: "show my workload" -> MY_WORKLOAD', async () => {
    const res = await detectOfficerIntent('show my workload');
    expect(res.intent).toBe('MY_WORKLOAD');
  });

  test('TEST 2: "show my priority complaints" -> PRIORITY_CASES', async () => {
    const res = await detectOfficerIntent('show my highest priority complaints');
    expect(res.intent).toBe('PRIORITY_CASES');
  });

  test('TEST 3: "which cases are close to SLA breach?" -> SLA_ALERTS', async () => {
    const res = await detectOfficerIntent('which complaints are close to SLA breach?');
    expect(res.intent).toBe('SLA_ALERTS');
  });

  test('TEST 4: "how is my performance?" -> MY_PERFORMANCE', async () => {
    const res = await detectOfficerIntent('how is my performance?');
    expect(res.intent).toBe('MY_PERFORMANCE');
  });

  test('TEST 5: "how many points do I have?" -> MY_POINTS', async () => {
    const res = await detectOfficerIntent('how many points do I have?');
    expect(res.intent).toBe('MY_POINTS');
  });

  test('TEST 6: "tell me about complaint CGN-00123" -> COMPLAINT_DETAILS', async () => {
    const res = await detectOfficerIntent('tell me about complaint CGN-00123');
    expect(res.intent).toBe('COMPLAINT_DETAILS');
    expect(res.parameters?.complaintId).toMatch(/CGN-?0*123/i);
  });

  test('TEST 7: "hi" and "hello" -> GREETING', async () => {
    const res1 = await detectOfficerIntent('hi');
    expect(res1.intent).toBe('GREETING');

    const res2 = await detectOfficerIntent('hello');
    expect(res2.intent).toBe('GREETING');
  });

  test('TEST 8: Different questions produce strictly different intents', async () => {
    const i1 = (await detectOfficerIntent('show my workload')).intent;
    const i2 = (await detectOfficerIntent('which complaints are close to SLA breach?')).intent;
    const i3 = (await detectOfficerIntent('how is my performance?')).intent;
    const i4 = (await detectOfficerIntent('what is the workload of my department?')).intent;
    const i5 = (await detectOfficerIntent('what should I focus on today?')).intent;

    expect(i1).toBe('MY_WORKLOAD');
    expect(i2).toBe('SLA_ALERTS');
    expect(i3).toBe('MY_PERFORMANCE');
    expect(i4).toBe('DEPARTMENT_WORKLOAD');
    expect(i5).toBe('TODAY_SUMMARY');

    const uniqueIntents = new Set([i1, i2, i3, i4, i5]);
    expect(uniqueIntents.size).toBe(5);
  });

  // ==========================================
  // DISPATCHER & END-TO-END TESTS
  // ==========================================

  test('TEST 9: Different intents invoke different database tools and return rich data', async () => {
    // 1. Workload
    const workloadRes = await processOfficerChat({
      officerId: officerUser.id,
      message: 'show my workload'
    });
    expect(workloadRes.intent).toBe('MY_WORKLOAD');
    expect(typeof workloadRes.answer).toBe('string');
    expect(workloadRes.answer.length).toBeGreaterThan(10);

    // 2. Priority
    const priorityRes = await processOfficerChat({
      officerId: officerUser.id,
      message: 'What should I handle first?'
    });
    expect(priorityRes.intent).toBe('PRIORITY_CASES');
    expect(typeof priorityRes.answer).toBe('string');

    // 3. SLA Alerts
    const slaRes = await processOfficerChat({
      officerId: officerUser.id,
      message: 'Which of my complaints are overdue or close to SLA breach?'
    });
    expect(slaRes.intent).toBe('SLA_ALERTS');

    // 4. Performance
    const perfRes = await processOfficerChat({
      officerId: officerUser.id,
      message: 'How is my performance and compliance rate?'
    });
    expect(perfRes.intent).toBe('MY_PERFORMANCE');

    // 5. Greeting (No DB query, friendly greeting)
    const greetRes = await processOfficerChat({
      officerId: officerUser.id,
      message: 'hii'
    });
    expect(greetRes.intent).toBe('GREETING');
    expect(greetRes.answer).toMatch(/Copilot|assist|Hello/i);
  });

  test('TEST 10: Deterministic Priority Scoring calculates correct weights', () => {
    const highRisk = {
      id: 101,
      title: 'Water pipe burst flood',
      category: 'drainage',
      priority: 'critical',
      severity: 'critical',
      status: 'assigned',
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 80).toISOString(),
      sla_due_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString() // overdue
    };

    const lowRisk = {
      id: 102,
      title: 'Minor park bush trimming',
      category: 'gardening',
      priority: 'low',
      severity: 'low',
      status: 'assigned',
      created_at: new Date().toISOString(),
      sla_due_at: new Date(Date.now() + 1000 * 60 * 60 * 72).toISOString()
    };

    const scoredHigh = calculateComplaintPriority(highRisk);
    const scoredLow = calculateComplaintPriority(lowRisk);

    expect(scoredHigh.score).toBeGreaterThan(scoredLow.score);
    expect(scoredHigh.isOverdue).toBe(true);
    expect(scoredHigh.reasons.length).toBeGreaterThan(0);
  });

  test('TEST 11: Officer cannot view details of an unauthorized complaint belonging to another officer & department', async () => {
    // Find valid department different from officer's department if possible
    const deptRes = await db.query('SELECT id FROM departments LIMIT 2');
    const depts = deptRes.rows.map(r => r.id);
    const targetDeptId = depts.find(d => d !== officerUser.department_id) || depts[0] || 1;

    // Ensure other officer has this department and test officer does not
    await db.query('UPDATE users SET department_id = $1 WHERE id = $2', [targetDeptId, otherOfficerUser.id]);
    if (officerUser.department_id === targetDeptId) {
      await db.query('UPDATE users SET department_id = NULL WHERE id = $1', [officerUser.id]);
    }

    const insPrivate = await db.query(
      `INSERT INTO complaints (user_id, officer_id, department_id, title, description, category, priority, status)
       VALUES ($1, $2, $3, 'Confidential Inspection', 'Restricted memo', 'general', 'low', 'assigned')
       RETURNING id`,
      [otherOfficerUser.id, otherOfficerUser.id, targetDeptId]
    );
    const privateId = insPrivate.rows[0].id;

    const detailRes = await getOfficerComplaintDetails(officerUser.id, privateId);
    expect(detailRes.error).toBeDefined();
    expect(detailRes.error).toMatch(/restricted|not authorized/i);
  });
});
