const request = require('supertest');
const app = require('../app');
const db = require('../config/db');
const pointService = require('../services/pointService');

jest.setTimeout(30000);

describe('Civic Reputation & Performance System Integration', () => {
  const timestamp = Date.now();
  const citizenEmail = `citizen_rep_${timestamp}@example.com`;
  const officerEmail = `officer_rep_${timestamp}@example.com`;
  const adminEmail = `admin_rep_${timestamp}@example.com`;
  const password = 'Pass123!';

  let citizenToken, citizenId;
  let officerToken, officerId;
  let adminToken, adminId;
  let testComplaintId;

  beforeAll(async () => {
    // 1. Create Citizen User
    await request(app).post('/api/auth/signup').send({ name: 'Reputation Citizen', email: citizenEmail, password });
    if (db._pool) {
      await db.query('UPDATE users SET is_verified=true WHERE email=$1', [citizenEmail]);
      const uRes = await db.query('SELECT id FROM users WHERE email=$1', [citizenEmail]);
      citizenId = uRes.rows[0]?.id;
    }
    const cLogin = await request(app).post('/api/auth/login').send({ email: citizenEmail, password });
    citizenToken = cLogin.body.accessToken;

    // 2. Create Officer User
    await request(app).post('/api/auth/signup').send({ name: 'Field Officer Dave', email: officerEmail, password });
    if (db._pool) {
      await db.query("UPDATE users SET is_verified=true, role='officer', status='active' WHERE email=$1", [officerEmail]);
      const oRes = await db.query('SELECT id FROM users WHERE email=$1', [officerEmail]);
      officerId = oRes.rows[0]?.id;
    }
    const oLogin = await request(app).post('/api/auth/login').send({ email: officerEmail, password });
    officerToken = oLogin.body.accessToken;

    // 3. Create Admin User
    await request(app).post('/api/auth/signup').send({ name: 'City Admin Chief', email: adminEmail, password });
    if (db._pool) {
      await db.query("UPDATE users SET is_verified=true, role='admin', status='active' WHERE email=$1", [adminEmail]);
      const aRes = await db.query('SELECT id FROM users WHERE email=$1', [adminEmail]);
      adminId = aRes.rows[0]?.id;
    }
    const aLogin = await request(app).post('/api/auth/login').send({ email: adminEmail, password });
    adminToken = aLogin.body.accessToken;

    // 4. Create a test complaint
    if (citizenId && db._pool) {
      const compRes = await db.query(`
        INSERT INTO complaints (user_id, title, description, category, priority, status, created_at)
        VALUES ($1, 'Pothole on Main St', 'Large road hazard', 'roads', 'medium', 'open', now())
        RETURNING id;
      `, [citizenId]);
      testComplaintId = compRes.rows[0]?.id;
    }
  });

  afterAll(async () => {
    if (db._pool) {
      if (testComplaintId) {
        await db.query('DELETE FROM complaints WHERE id = $1', [testComplaintId]);
      }
      const emails = [citizenEmail, officerEmail, adminEmail];
      await db.query('DELETE FROM users WHERE email = ANY($1)', [emails]);
    }
  });

  test('1. GET /api/reputation/rules returns active point rules', async () => {
    const res = await request(app).get('/api/reputation/rules');
    expect(res.status).toBe(200);
    const data = res.body.data || res.body;
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    const submittedRule = data.find(r => r.rule_key === 'COMPLAINT_SUBMITTED');
    expect(submittedRule).toBeDefined();
    expect(submittedRule.points).toBe(10);
  });

  test('2. Award points and verify idempotency', async () => {
    if (!citizenId) return;

    // First award
    const tx1 = await pointService.awardPoints({
      userId: citizenId,
      role: 'citizen',
      complaintId: testComplaintId,
      eventType: 'COMPLAINT_SUBMITTED',
      reason: 'Valid test complaint submission'
    });
    expect(tx1).toBeTruthy();
    expect(tx1.points).toBe(10);

    // Duplicate award on same complaint and event type must be skipped
    const tx2 = await pointService.awardPoints({
      userId: citizenId,
      role: 'citizen',
      complaintId: testComplaintId,
      eventType: 'COMPLAINT_SUBMITTED',
      reason: 'Duplicate call'
    });
    expect(tx2).toBeNull();
  });

  test('3. Deduct points (Penalty test)', async () => {
    if (!citizenId) return;

    const penalty = await pointService.deductPoints({
      userId: citizenId,
      role: 'citizen',
      complaintId: testComplaintId,
      eventType: 'FALSE_COMPLAINT',
      reason: 'Confirmed false complaint penalty'
    });
    expect(penalty).toBeTruthy();
    expect(penalty.points).toBe(-30);
  });

  test('4. GET /api/reputation/me returns user points and level summary', async () => {
    if (!citizenToken) return;

    const res = await request(app)
      .get('/api/reputation/me')
      .set('Authorization', `Bearer ${citizenToken}`);

    expect(res.status).toBe(200);
    const data = res.body.data || res.body;
    expect(data).toHaveProperty('totalPoints');
    expect(data).toHaveProperty('currentLevel');
    expect(data).toHaveProperty('rank');
    expect(Array.isArray(data.badges)).toBe(true);
  });

  test('5. GET /api/reputation/me/history returns paginated point transaction ledger', async () => {
    if (!citizenToken) return;

    const res = await request(app)
      .get('/api/reputation/me/history?page=1&limit=5')
      .set('Authorization', `Bearer ${citizenToken}`);

    expect(res.status).toBe(200);
    const data = res.body.data || res.body;
    expect(data).toHaveProperty('items');
    expect(Array.isArray(data.items)).toBe(true);
    expect(data).toHaveProperty('total');
  });

  test('6. GET /api/reputation/citizens/leaderboard returns ranked and privacy-safe citizen list', async () => {
    const res = await request(app)
      .get('/api/reputation/citizens/leaderboard?timeframe=all')
      .set('Authorization', `Bearer ${citizenToken}`);

    expect(res.status).toBe(200);
    const data = res.body.data || res.body;
    expect(data).toHaveProperty('items');
    expect(Array.isArray(data.items)).toBe(true);
  });

  test('7. GET /api/reputation/officers/leaderboard checks RBAC (forbidden to citizen, allowed to officer)', async () => {
    // Citizen should be forbidden
    const citizenRes = await request(app)
      .get('/api/reputation/officers/leaderboard')
      .set('Authorization', `Bearer ${citizenToken}`);
    expect(citizenRes.status).toBe(403);

    // Officer should be authorized
    const officerRes = await request(app)
      .get('/api/reputation/officers/leaderboard')
      .set('Authorization', `Bearer ${officerToken}`);
    expect(officerRes.status).toBe(200);
    const data = officerRes.body.data || officerRes.body;
    expect(data).toHaveProperty('items');
  });

  test('8. Admin reputation management & rule editing (PUT /api/admin/reputation/rules)', async () => {
    // Citizen cannot edit rules
    const cEdit = await request(app)
      .put('/api/admin/reputation/rules')
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({ rules: [{ rule_key: 'COMPLAINT_SUBMITTED', points: 15 }] });
    expect(cEdit.status).toBe(403);

    // Admin can edit rules
    const aEdit = await request(app)
      .put('/api/admin/reputation/rules')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        rules: [
          { rule_key: 'COMPLAINT_SUBMITTED', points: 12, role: 'citizen', name: 'Valid Complaint Submission', description: 'Updated reward' }
        ]
      });
    expect(aEdit.status).toBe(200);

    // Reset back to 10 points
    await request(app)
      .put('/api/admin/reputation/rules')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        rules: [
          { rule_key: 'COMPLAINT_SUBMITTED', points: 10, role: 'citizen', name: 'Valid Complaint Submission', description: 'Valid complaint submission' }
        ]
      });
  });

  test('9. Admin Overview (GET /api/admin/reputation/overview)', async () => {
    const res = await request(app)
      .get('/api/admin/reputation/overview')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const data = res.body.data || res.body;
    expect(data).toHaveProperty('totalPointsIssued');
    expect(data).toHaveProperty('totalTransactions');
  });
});
