const request = require('supertest');
const app = require('../app');
jest.setTimeout(30000);

describe('Auth integration (PostgreSQL)', () => {
  // Use a unique email per run so the test is idempotent against a persistent DB
  const email = `it_test_${Date.now()}@example.com`;
  let emailOverride;
  let officerEmail;
  const password = 'Pass123!';

  afterAll(async () => {
    const db = require('../config/db');
    if (db._pool) {
      const emails = [email];
      if (emailOverride) emails.push(emailOverride);
      if (officerEmail) emails.push(officerEmail);
      await db.query('DELETE FROM users WHERE email = ANY($1)', [emails]);
    }
  });

  test('signup -> login -> refresh -> logout', async () => {
    // signup
    await request(app).post('/api/auth/signup').send({ name: 'IT Test', email, password });
    const db = require('../config/db');
    if (db._pool) await db.query('UPDATE users SET is_verified=true WHERE email=$1', [email]);

    const login = await request(app).post('/api/auth/login').send({ email, password });
    expect(login.status).toBe(200);
    expect(login.body.accessToken).toBeTruthy();
    expect(login.body.refreshToken).toBeTruthy();

    const refresh = await request(app).post('/api/auth/refresh').send({ refreshToken: login.body.refreshToken });
    expect(refresh.status).toBe(200);
    expect(refresh.body.accessToken).toBeTruthy();

    const logout = await request(app).post('/api/auth/logout').send({ refreshToken: login.body.refreshToken });
    expect(logout.status).toBe(200);
  }, 30000);

  test('GET /api/auth/me returns current profile after login', async () => {
    const login = await request(app).post('/api/auth/login').send({ email, password });
    expect(login.status).toBe(200);

    const me = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${login.body.accessToken}`);
    expect(me.status).toBe(200);
    expect(me.body.name).toBe('IT Test');
    expect(me.body.email).toBe(email);
    expect(me.body.role).toBe('citizen');
  }, 30000);

  test('POST /api/auth/signup ignores role override and creates citizens only', async () => {
    emailOverride = `it_test_role_${Date.now()}@example.com`;
    await request(app).post('/api/auth/signup').send({ name: 'Role Test', email: emailOverride, password, role: 'admin' });
    const db = require('../config/db');
    if (db._pool) await db.query('UPDATE users SET is_verified=true WHERE email=$1', [emailOverride]);

    const login = await request(app).post('/api/auth/login').send({ email: emailOverride, password });
    expect(login.status).toBe(200);
    expect(login.body.user.role).toBe('citizen');
  }, 30000);

  test('officer signup creates a pending officer account and login routes to approval', async () => {
    officerEmail = `it_officer_${Date.now()}@example.com`;
    const signup = await request(app)
      .post('/api/auth/signup')
      .send({
        name: 'Officer User',
        email: officerEmail,
        password,
        accountType: 'officer',
        phone: '9876543210',
        departmentId: 1,
        municipalityId: 1,
        zoneId: 1,
        wardId: 1,
        designation: 'Municipal Officer',
        jurisdiction: 'Sector 17'
      });
    expect(signup.status).toBe(201);

    const db = require('../config/db');
    if (db._pool) await db.query('UPDATE users SET is_verified=true WHERE email=$1', [officerEmail]);

    const login = await request(app).post('/api/auth/login').send({ email: officerEmail, password });
    expect(login.status).toBe(200);
    expect(login.body.user.role).toBe('officer');
    expect(login.body.user.status).toBe('pending');
    expect(login.body.redirectPath).toBe('/pending-approval');
  }, 30000);

  test('PUT /api/auth/profile persists name change (allowed field only)', async () => {
    const login = await request(app).post('/api/auth/login').send({ email, password });
    expect(login.status).toBe(200);

    const updated = await request(app)
      .put('/api/auth/profile')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send({ name: 'Updated Name' });
    expect(updated.status).toBe(200);
    expect(updated.body.name).toBe('Updated Name');
    expect(updated.body.role).toBeTruthy();

    // me reflects newly persisted name
    const me = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${login.body.accessToken}`);
    expect(me.status).toBe(200);
    expect(me.body.name).toBe('Updated Name');
  }, 30000);

  test('PUT /api/auth/profile rejects invalid name and ignores role/password fields', async () => {
    const login = await request(app).post('/api/auth/login').send({ email, password });
    expect(login.status).toBe(200);

    // invalid empty name
    const bad = await request(app)
      .put('/api/auth/profile')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send({ name: '' });
    expect(bad.status).toBe(400);

    // role/password must NOT be changed even if sent
    const attack = await request(app)
      .put('/api/auth/profile')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send({ name: 'Safe Name', role: 'admin', password: 'Hacked123!' });
    expect(attack.status).toBe(200);
    expect(attack.body.name).toBe('Safe Name');
    expect(attack.body.role).not.toBe('admin');

    const me = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${login.body.accessToken}`);
    expect(me.body.role).not.toBe('admin');
    expect(me.body.name).toBe('Safe Name');
  }, 30000);

  test('PUT /api/auth/profile requires authentication', async () => {
    const res = await request(app).put('/api/auth/profile').send({ name: 'No Auth' });
    expect(res.status).toBe(401);
  }, 30000);
});
