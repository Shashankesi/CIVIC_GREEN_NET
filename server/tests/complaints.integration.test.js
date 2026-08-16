const request = require('supertest');
const app = require('../app');
jest.setTimeout(30000);

describe('Complaints integration (PostgreSQL)', () => {
  let token;
  let complaintId;
  const ciEmail = `ci_test_${Date.now()}@example.com`;
  beforeAll(async () => {
    try { 
      await request(app).post('/api/auth/signup').send({ name: 'CI Test', email: ciEmail, password: 'Pass123!' }); 
      const db = require('../config/db');
      if (db._pool) await db.query('UPDATE users SET is_verified=true WHERE email=$1', [ciEmail]);
    } catch (e) {}
    const login = await request(app).post('/api/auth/login').send({ email: ciEmail, password: 'Pass123!' });
    token = login.body.accessToken;
  }, 30000);

  afterAll(async () => {
    const db = require('../config/db');
    if (db._pool) {
      if (complaintId) {
        await db.query('DELETE FROM complaint_images WHERE complaint_id=$1', [complaintId]);
        await db.query('DELETE FROM complaint_status_history WHERE complaint_id=$1', [complaintId]);
        await db.query('DELETE FROM ai_analysis WHERE complaint_id=$1', [complaintId]);
        await db.query('DELETE FROM duplicate_complaints WHERE complaint_id=$1 OR duplicate_of=$1', [complaintId]);
        await db.query('DELETE FROM complaint_assignments WHERE complaint_id=$1', [complaintId]);
        await db.query('DELETE FROM complaints WHERE id=$1', [complaintId]);
      }
      await db.query('DELETE FROM users WHERE email=$1', [ciEmail]);
    }
  });

  test('create, get, update, timeline', async () => {
    const create = await request(app).post('/api/complaints').set('Authorization', 'Bearer ' + token).send({ title: 'CI Complaint', description: 'ci', location: { lat: 1, lng: 2 }, category: 'sanitation', priority: 'low' });
    expect(create.status).toBe(201);
    complaintId = create.body.data.id;

    const get = await request(app).get('/api/complaints/' + complaintId);
    expect(get.status).toBe(200);

    const upd = await request(app).put('/api/complaints/' + complaintId).set('Authorization', 'Bearer ' + token).send({ title: 'CI Updated' });
    expect(upd.status).toBe(200);

    const timeline = await request(app).get('/api/complaints/' + complaintId + '/timeline');
    expect(timeline.status).toBe(200);
  }, 30000);

  test('GET /api/complaints/stats/summary requires authentication', async () => {
    const res = await request(app).get('/api/complaints/stats/summary');
    expect(res.status).toBe(401);
  }, 30000);
});

