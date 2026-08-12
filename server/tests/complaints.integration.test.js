const request = require('supertest');
const app = require('../app');

describe('Complaints integration (PostgreSQL)', () => {
  let token;
  const ciEmail = `ci_test_${Date.now()}@example.com`;
  beforeAll(async () => {
    try { await request(app).post('/api/auth/signup').send({ name: 'CI Test', email: ciEmail, password: 'Pass123!' }); } catch (e) {}
    const login = await request(app).post('/api/auth/login').send({ email: ciEmail, password: 'Pass123!' });
    token = login.body.accessToken;
  }, 30000);

  test('create, get, update, timeline', async () => {
    const create = await request(app).post('/api/complaints').set('Authorization', 'Bearer ' + token).send({ title: 'CI Complaint', description: 'ci', location: { lat: 1, lng: 2 }, category: 'sanitation', priority: 'low' });
    expect(create.status).toBe(201);
    const id = create.body.data.id;

    const get = await request(app).get('/api/complaints/' + id);
    expect(get.status).toBe(200);

    const upd = await request(app).put('/api/complaints/' + id).set('Authorization', 'Bearer ' + token).send({ title: 'CI Updated' });
    expect(upd.status).toBe(200);

    const timeline = await request(app).get('/api/complaints/' + id + '/timeline');
    expect(timeline.status).toBe(200);
  }, 20000);

  test('GET /api/complaints/stats/summary requires authentication', async () => {
    const res = await request(app).get('/api/complaints/stats/summary');
    expect(res.status).toBe(401);
  }, 10000);
});

