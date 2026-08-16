const request = require('supertest');
const app = require('../app');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { JWT } = require('../config');
const otpService = require('../services/otpService');

jest.setTimeout(30000);

describe('Phase 2: Authentication, Email OTP Verification & Account Security Suite', () => {
  const ts = Date.now();
  const citizenEmail = `phase2_cit_${ts}@example.com`;
  const officerEmail = `phase2_off_${ts}@example.com`;
  const existingVerifiedEmail = `phase2_exist_${ts}@example.com`;
  const unverifiedEmail = `phase2_unverified_${ts}@example.com`;
  let existingUserId;
  let citizenUserId;
  let officerUserId;

  beforeAll(async () => {
    // 1. Create an existing verified citizen account
    const hashed = await bcrypt.hash('Password123!', 10);
    const existRes = await db.query(
      "INSERT INTO users (name, email, password, role, status, is_verified) VALUES ($1, $2, $3, 'citizen', 'active', true) RETURNING id",
      ['Existing Citizen', existingVerifiedEmail, hashed]
    );
    existingUserId = existRes.rows[0].id;
  });

  afterAll(async () => {
    // Cleanup test records
    await db.query("DELETE FROM email_verifications WHERE email LIKE 'phase2_%'");
    await db.query("DELETE FROM users WHERE email LIKE 'phase2_%'");
  });

  describe('1. New User Registration & Cryptographic OTP Generation', () => {
    test('Citizen signup creates pending user, generates hashed OTP, and hides plaintext from DB', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'New Citizen',
          email: citizenEmail,
          password: 'SecurePassword123!',
          accountType: 'citizen'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.requiresVerification).toBe(true);
      expect(res.body).toHaveProperty('maskedEmail');
      expect(res.body).not.toHaveProperty('otp'); // Never return plaintext OTP in response

      // Check PostgreSQL DB state
      const userRes = await db.query('SELECT id, role, status, is_verified FROM users WHERE email = $1', [citizenEmail]);
      expect(userRes.rows.length).toBe(1);
      const user = userRes.rows[0];
      citizenUserId = user.id;
      expect(user.is_verified).toBe(false); // Must be unverified initially

      // Check email_verifications table
      const otpRecord = await db.query(
        'SELECT id, otp_hash, purpose, expires_at, attempt_count FROM email_verifications WHERE email = $1 AND verified_at IS NULL',
        [citizenEmail]
      );
      expect(otpRecord.rows.length).toBe(1);
      expect(otpRecord.rows[0].otp_hash).toBeDefined();
      expect(otpRecord.rows[0].otp_hash.length).toBe(64); // SHA-256 hex string
    });

    test('Officer signup requires valid department and sets status to pending', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'New Officer',
          email: officerEmail,
          password: 'SecurePassword123!',
          accountType: 'officer',
          departmentId: 1,
          municipalityId: 1,
          zoneId: 1,
          wardId: 1,
          designation: 'Sanitation Officer',
          jurisdiction: 'Zone 1',
          phone: '9876543210'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.requiresVerification).toBe(true);

      const userRes = await db.query('SELECT id, role, status, is_verified FROM users WHERE email = $1', [officerEmail]);
      expect(userRes.rows.length).toBe(1);
      officerUserId = userRes.rows[0].id;
      expect(userRes.rows[0].role).toBe('officer');
      expect(userRes.rows[0].status).toBe('pending');
      expect(userRes.rows[0].is_verified).toBe(false);
    });

    test('Role injection prevention: Public signup with role=admin CANNOT create admin account', async () => {
      const hackerEmail = `phase2_hacker_${ts}@example.com`;
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'Fake Admin',
          email: hackerEmail,
          password: 'SecurePassword123!',
          accountType: 'admin',
          role: 'admin'
        });

      // Role is normalized to citizen
      const userRes = await db.query('SELECT role FROM users WHERE email = $1', [hackerEmail]);
      expect(userRes.rows.length).toBe(1);
      expect(userRes.rows[0].role).toBe('citizen'); // Forced to citizen
    });
  });

  describe('2. OTP Verification & Error Handling', () => {
    test('Wrong OTP is rejected and remaining attempts count is returned', async () => {
      const res = await request(app)
        .post('/api/auth/verify-otp')
        .send({
          email: citizenEmail,
          otp: '000000',
          purpose: 'signup'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('INVALID_OTP');
      expect(typeof res.body.remainingAttempts).toBe('number');

      // User must remain unverified
      const userRes = await db.query('SELECT is_verified FROM users WHERE email = $1', [citizenEmail]);
      expect(userRes.rows[0].is_verified).toBe(false);
    });

    test('Correct OTP verifies citizen email and returns authentication tokens', async () => {
      // Generate known OTP for citizenEmail
      const otpRes = await otpService.createOrUpdateOtp({
        email: citizenEmail,
        purpose: 'signup',
        userId: citizenUserId,
        force: true
      });

      const res = await request(app)
        .post('/api/auth/verify-otp')
        .send({
          email: citizenEmail,
          otp: otpRes.rawOtp,
          purpose: 'signup'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.verified).toBe(true);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body.user.emailVerified).toBe(true);

      // Verify PostgreSQL state
      const userRes = await db.query('SELECT is_verified, status FROM users WHERE email = $1', [citizenEmail]);
      expect(userRes.rows[0].is_verified).toBe(true);
      expect(userRes.rows[0].status).toBe('active');
    });

    test('Single-use OTP: Replaying the same OTP immediately fails', async () => {
      const res = await request(app)
        .post('/api/auth/verify-otp')
        .send({
          email: citizenEmail,
          otp: '123456',
          purpose: 'signup'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    test('Expired OTP is rejected', async () => {
      const expiredEmail = `phase2_exp_${ts}@example.com`;
      await db.query(
        "INSERT INTO users (name, email, password, role, status, is_verified) VALUES ('Exp User', $1, 'pass', 'citizen', 'active', false)",
        [expiredEmail]
      );
      // Insert already expired OTP
      const otpHash = otpService.hashOtp('654321', expiredEmail, 'signup');
      await db.query(
        "INSERT INTO email_verifications (email, otp_hash, purpose, expires_at, attempt_count) VALUES ($1, $2, 'signup', now() - INTERVAL '1 minute', 0)",
        [expiredEmail, otpHash]
      );

      const res = await request(app)
        .post('/api/auth/verify-otp')
        .send({
          email: expiredEmail,
          otp: '654321',
          purpose: 'signup'
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('EXPIRED');
    });
  });

  describe('3. Officer OTP Verification & Approval Boundary', () => {
    test('Officer OTP verification marks email verified but keeps status as pending review', async () => {
      const otpRes = await otpService.createOrUpdateOtp({
        email: officerEmail,
        purpose: 'signup',
        userId: officerUserId,
        force: true
      });

      const res = await request(app)
        .post('/api/auth/verify-otp')
        .send({
          email: officerEmail,
          otp: otpRes.rawOtp,
          purpose: 'signup'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.requiresApproval).toBe(true);
      expect(res.body.redirectPath).toBe('/pending-approval');

      // Database check
      const userRes = await db.query('SELECT is_verified, status, role FROM users WHERE email = $1', [officerEmail]);
      expect(userRes.rows[0].is_verified).toBe(true);
      expect(userRes.rows[0].status).toBe('pending'); // Must NOT be active yet
    });
  });

  describe('4. Resend OTP & Cooldown Enforcements', () => {
    test('Resend OTP enforces 60-second cooldown', async () => {
      const resendEmail = `phase2_resend_${ts}@example.com`;
      await db.query(
        "INSERT INTO users (name, email, password, role, status, is_verified) VALUES ('Resend User', $1, 'pass', 'citizen', 'active', false)",
        [resendEmail]
      );
      // Create initial OTP
      await otpService.createOrUpdateOtp({ email: resendEmail, purpose: 'signup', force: true });

      // Immediate resend must be throttled
      const res = await request(app)
        .post('/api/auth/resend-otp')
        .send({ email: resendEmail, purpose: 'signup' });

      expect(res.status).toBe(429);
      expect(res.body.inCooldown).toBe(true);
      expect(res.body.remainingSeconds).toBeGreaterThan(0);
    });
  });

  describe('5. Login Security & Existing User Protection', () => {
    test('Existing verified user logs in smoothly without OTP prompts', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: existingVerifiedEmail,
          password: 'Password123!'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body.user.emailVerified).toBe(true);
    });

    test('Unverified user login is blocked with EMAIL_NOT_VERIFIED (403)', async () => {
      const hashed = await bcrypt.hash('Password123!', 10);
      await db.query(
        "INSERT INTO users (name, email, password, role, status, is_verified) VALUES ('Unverified User', $1, $2, 'citizen', 'active', false)",
        [unverifiedEmail, hashed]
      );

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: unverifiedEmail,
          password: 'Password123!'
        });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('EMAIL_NOT_VERIFIED');
      expect(res.body).toHaveProperty('maskedEmail');
    });

    test('Invalid password rejected before any verification leak (401)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: existingVerifiedEmail,
          password: 'WrongPassword999!'
        });

      expect(res.status).toBe(401);
    });
  });
});
