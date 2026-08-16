const request = require('supertest');
const app = require('../app');
const jwt = require('jsonwebtoken');
const { JWT } = require('../config');
const db = require('../config/db');

describe('Phase 1 Complaints Verification Suite', () => {
  let citizenId;
  let citizenToken;
  let otherCitizenToken;
  let adminId;
  let adminToken;
  let testComplaintId;
  const testEmail = `phase1_user_${Date.now()}@example.com`;
  const otherEmail = `phase1_other_${Date.now()}@example.com`;
  const adminEmail = `phase1_admin_${Date.now()}@example.com`;

  beforeAll(async () => {
    // Create test citizen
    const citizenRes = await db.query(
      "INSERT INTO users (name, email, password, role, status, is_verified) VALUES ($1, $2, 'hash123', 'citizen', 'active', true) RETURNING id",
      ['Phase1 Citizen', testEmail]
    );
    citizenId = citizenRes.rows[0].id;
    citizenToken = jwt.sign({ userId: citizenId, role: 'citizen' }, JWT.ACCESS_SECRET, { expiresIn: '15m' });

    // Create other citizen
    const otherRes = await db.query(
      "INSERT INTO users (name, email, password, role, status, is_verified) VALUES ($1, $2, 'hash123', 'citizen', 'active', true) RETURNING id",
      ['Phase1 Other Citizen', otherEmail]
    );
    const otherCitizenId = otherRes.rows[0].id;
    otherCitizenToken = jwt.sign({ userId: otherCitizenId, role: 'citizen' }, JWT.ACCESS_SECRET, { expiresIn: '15m' });

    // Create test admin
    const adminRes = await db.query(
      "INSERT INTO users (name, email, password, role, status, is_verified) VALUES ($1, $2, 'hash123', 'admin', 'active', true) RETURNING id",
      ['Phase1 Admin', adminEmail]
    );
    adminId = adminRes.rows[0].id;
    adminToken = jwt.sign({ userId: adminId, role: 'admin' }, JWT.ACCESS_SECRET, { expiresIn: '15m' });

    // Create test complaint owned by citizenId
    const compRes = await db.query(
      "INSERT INTO complaints (user_id, title, description, category, priority, status, address) VALUES ($1, 'P1 Test Pothole', 'Deep pothole on Main Road', 'roads', 'high', 'open', 'Sector 17, Chandigarh') RETURNING id",
      [citizenId]
    );
    testComplaintId = compRes.rows[0].id;
  });

  afterAll(async () => {
    if (testComplaintId) {
      await db.query('DELETE FROM complaints WHERE id = $1', [testComplaintId]);
    }
    if (citizenId || adminId) {
      await db.query('DELETE FROM users WHERE id IN ($1, $2, $3)', [citizenId, adminId, otherCitizenToken ? citizenId + 1 : 0]);
    }
  });

  describe('Admin Complaints Queue', () => {
    test('GET /api/admin/complaints returns complaints list with total count', async () => {
      const res = await request(app)
        .get('/api/admin/complaints')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ limit: 10, page: 1 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('items');
      expect(res.body.data).toHaveProperty('total');
      expect(Array.isArray(res.body.data.items)).toBe(true);
    });

    test('GET /api/admin/complaints supports search and filters', async () => {
      const res = await request(app)
        .get('/api/admin/complaints')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ search: 'Pothole', status: 'open', limit: 5 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.items)).toBe(true);
    });
  });

  describe('Citizen My Complaints Filtering & Ownership', () => {
    test('Citizen sees their own complaint under mine=true', async () => {
      const res = await request(app)
        .get('/api/complaints/search')
        .set('Authorization', `Bearer ${citizenToken}`)
        .query({ mine: 'true' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const ids = (res.body.data.items || []).map(c => c.id);
      expect(ids).toContain(testComplaintId);
    });

    test('Other citizen does NOT see first citizen complaint under mine=true', async () => {
      const res = await request(app)
        .get('/api/complaints/search')
        .set('Authorization', `Bearer ${otherCitizenToken}`)
        .query({ mine: 'true' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const ids = (res.body.data.items || []).map(c => c.id);
      expect(ids).not.toContain(testComplaintId);
    });

    test('Other citizen CANNOT modify first citizen complaint (403 Forbidden)', async () => {
      const res = await request(app)
        .put(`/api/complaints/${testComplaintId}`)
        .set('Authorization', `Bearer ${otherCitizenToken}`)
        .send({ title: 'Unauthorized Modification' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });
});
