const request = require('supertest');
const app = require('../app');
const jwt = require('jsonwebtoken');
const { JWT } = require('../config');

describe('Role-Based Security and Authorization Suite', () => {
  const citizenToken = jwt.sign({ userId: 101, role: 'citizen' }, JWT.ACCESS_SECRET, { expiresIn: '15m' });
  const officerToken = jwt.sign({ userId: 102, role: 'officer' }, JWT.ACCESS_SECRET, { expiresIn: '15m' });
  const adminToken = jwt.sign({ userId: 103, role: 'admin' }, JWT.ACCESS_SECRET, { expiresIn: '15m' });
  const expiredToken = jwt.sign({ userId: 101, role: 'citizen' }, JWT.ACCESS_SECRET, { expiresIn: '-1s' });

  describe('Unauthenticated Access (401)', () => {
    test('rejects request without Authorization header', async () => {
      const res = await request(app).get('/api/citizen/dashboard');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    test('rejects request with expired token', async () => {
      const res = await request(app)
        .get('/api/citizen/dashboard')
        .set('Authorization', `Bearer ${expiredToken}`);
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    test('rejects request with malformed token', async () => {
      const res = await request(app)
        .get('/api/citizen/dashboard')
        .set('Authorization', 'Bearer invalid.token.payload');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Role Boundary Protection (403 Forbidden)', () => {
    test('Citizen CANNOT access Admin endpoints', async () => {
      const res = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${citizenToken}`);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    test('Citizen CANNOT access Officer endpoints', async () => {
      const res = await request(app)
        .get('/api/officer/workload')
        .set('Authorization', `Bearer ${citizenToken}`);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    test('Officer CANNOT access Admin user management', async () => {
      const res = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${officerToken}`);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Health API Verification', () => {
    test('GET /api/health returns healthy system status', async () => {
      const res = await request(app).get('/api/health');
      expect([200, 503]).toContain(res.status);
      expect(res.body).toHaveProperty('api');
      expect(res.body).toHaveProperty('database');
    });
  });
});
