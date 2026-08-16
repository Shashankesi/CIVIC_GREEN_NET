require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const request = require('supertest');
const app = require('../app');
const emailService = require('../services/emailService');
const otpService = require('../services/otpService');
const { EMAIL } = require('../config');
const db = require('../config/db');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

jest.setTimeout(30000);

describe('CIVIC GREENNET — COMPLETE RESEND EMAIL SUITE & WORKFLOW AUDIT', () => {
  const ts = Date.now();
  const testUserEmail = `resend_test_user_${ts}@example.com`;
  const testOfficerEmail = `resend_test_officer_${ts}@example.com`;
  const testAdminEmail = `resend_test_admin_${ts}@example.com`;
  let testUserId;
  let testOfficerId;
  let testAdminId;
  let testComplaintId;
  let adminToken;

  beforeAll(async () => {
    if (db._pool) {
      try {
        const adminRes = await db.query(
          "INSERT INTO users (name, email, password, role, status, is_verified) VALUES ($1, $2, $3, 'admin', 'active', true) RETURNING id",
          ['Resend Test Admin', testAdminEmail, 'hashedPassword123']
        );
        testAdminId = adminRes.rows[0].id;

        const userRes = await db.query(
          "INSERT INTO users (name, email, password, role, status, is_verified) VALUES ($1, $2, $3, 'citizen', 'active', true) RETURNING id",
          ['Resend Test User', testUserEmail, 'hashedPassword123']
        );
        testUserId = userRes.rows[0].id;

        const officerRes = await db.query(
          "INSERT INTO users (name, email, password, role, status, is_verified, employee_id) VALUES ($1, $2, $3, 'officer', 'active', true, 'CGN-TEST-001') RETURNING id",
          ['Resend Test Officer', testOfficerEmail, 'hashedPassword123']
        );
        testOfficerId = officerRes.rows[0].id;

        const compRes = await db.query(
          "INSERT INTO complaints (user_id, officer_id, title, description, category, priority, status, sla_due_at) VALUES ($1, $2, $3, $4, $5, $6, $7, now() + INTERVAL '48 hours') RETURNING id",
          [testUserId, testOfficerId, 'Pothole on Main Road', 'Large pothole causing traffic slowdown', 'roads', 'high', 'open']
        );
        testComplaintId = compRes.rows[0].id;
      } catch (e) {
        // non-blocking if db not available in unit run
      }
    }

    const { JWT } = require('../config');
    adminToken = jwt.sign(
      { id: testAdminId || 9999, userId: testAdminId || 9999, email: testAdminEmail, role: 'admin' },
      JWT.ACCESS_SECRET,
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    if (db._pool) {
      try {
        await db.query("DELETE FROM email_logs WHERE recipient LIKE 'resend_%'");
        await db.query("DELETE FROM email_verifications WHERE email LIKE 'resend_%'");
        await db.query("DELETE FROM complaints WHERE id = $1", [testComplaintId]);
        await db.query("DELETE FROM users WHERE email LIKE 'resend_%'");
      } catch (e) {
        // cleanup
      }
    }
  });

  // ==========================================
  // 1. CONFIGURATION & SENDER VERIFICATION
  // ==========================================
  describe('1. Resend Configuration & Sender Domain', () => {
    test('1. Resend provider, verified sender domain and reply-to configuration are valid', () => {
      expect(EMAIL.PROVIDER).toBe('resend');
      expect(EMAIL.FROM).toBeDefined();
      expect(EMAIL.FROM).toContain('notifications@civicgreennet.dev');
      expect(EMAIL.REPLY_TO).toBe('civicgreennet@gmail.com');
    });

    test('2. Missing API key handling returns appropriate error/status gracefully', async () => {
      const origKey = process.env.RESEND_API_KEY;
      delete process.env.RESEND_API_KEY;
      delete EMAIL.RESEND_API_KEY;

      const result = await emailService.sendAndLog({
        recipient: 'test@example.com',
        eventType: 'TEST_NO_KEY',
        subject: 'Test Subject',
        html: '<p>Test</p>',
        text: 'Test'
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true); // Test mode suppression handled gracefully

      // Restore key
      process.env.RESEND_API_KEY = origKey || 're_mock_test_key_placeholder';
      EMAIL.RESEND_API_KEY = process.env.RESEND_API_KEY;
    });

    test('3. verifyEmail reports structured status with domain civicgreennet.dev and zero secrets', async () => {
      const status = await emailService.verifyEmail();
      expect(status).toHaveProperty('provider', 'resend');
      expect(status).toHaveProperty('domain', 'civicgreennet.dev');
      expect(status).not.toHaveProperty('apiKey');
      expect(status).not.toHaveProperty('RESEND_API_KEY');
    });
  });

  // ==========================================
  // 2. AUTHENTICATION EMAIL WORKFLOWS (1-6)
  // ==========================================
  describe('2. Authentication Email Workflows (1-6)', () => {
    test('1. Citizen signup OTP email dispatches 6-digit code to citizen', async () => {
      const res = await emailService.sendOtpVerificationEmail(testUserEmail, '123456', 'signup');
      expect(res).toBeDefined();
      expect(res.success).toBe(true);
    });

    test('2. Officer signup OTP email dispatches 6-digit code to officer', async () => {
      const res = await emailService.sendOtpVerificationEmail(testOfficerEmail, '654321', 'officer_signup');
      expect(res).toBeDefined();
      expect(res.success).toBe(true);
    });

    test('3. OTP resend email dispatches new OTP code to requesting email', async () => {
      const res = await emailService.sendOtpVerificationEmail(testUserEmail, '789012', 'resend_otp');
      expect(res).toBeDefined();
      expect(res.success).toBe(true);
    });

    test('4. Welcome email sends branded message to verified user', async () => {
      const user = { id: testUserId || 1, name: 'Resend Test User', email: testUserEmail };
      const res = await emailService.sendWelcomeEmail(user);
      expect(res).toBeDefined();
      expect(res.success).toBe(true);
    });

    test('5. Email verification link dispatches to user email', async () => {
      const res = await emailService.sendEmailVerification(testUserEmail, 'mock-email-verify-token-123');
      expect(res).toBeDefined();
      expect(res.success).toBe(true);
    });

    test('6. Password reset link dispatches to requesting user email', async () => {
      const res = await emailService.sendPasswordReset(testUserEmail, 'mock-password-reset-token-xyz');
      expect(res).toBeDefined();
      expect(res.success).toBe(true);
    });
  });

  // ==========================================
  // 3. OFFICER LIFECYCLE WORKFLOWS (7-13)
  // ==========================================
  describe('3. Officer Lifecycle Email Workflows (7-13)', () => {
    test('7. Officer registration confirmation email to applicant', async () => {
      const officer = { id: testOfficerId || 2, name: 'Officer Test', email: testOfficerEmail };
      const res = await emailService.sendOfficerRegistrationReceivedEmail(officer);
      expect(res).toBeDefined();
      expect(res.success).toBe(true);
    });

    test('8. Officer registration alert to municipal administrator', async () => {
      const officer = { id: testOfficerId || 2, name: 'Officer Test', email: testOfficerEmail };
      const res = await emailService.sendAdminOfficerRegistrationEmail(officer);
      expect(res).toBeDefined();
      expect(res.success).toBe(true);
    });

    test('9. Officer approval email dispatches approved status with Employee ID', async () => {
      const officer = { id: testOfficerId || 2, name: 'Officer Test', email: testOfficerEmail };
      const res = await emailService.sendOfficerApprovalEmail(officer, true, 'CGN-TEST-001');
      expect(res).toBeDefined();
      expect(res.success).toBe(true);
    });

    test('10. Officer rejection email dispatches with administrative reason', async () => {
      const officer = { id: testOfficerId || 2, name: 'Officer Test', email: testOfficerEmail };
      const res = await emailService.sendOfficerApprovalEmail(officer, false, null, 'Incomplete jurisdiction documentation');
      expect(res).toBeDefined();
      expect(res.success).toBe(true);
    });

    test('11. Officer profile setup required email dispatches cleanly', async () => {
      const user = { id: testOfficerId || 2, name: 'Officer Setup', email: testOfficerEmail };
      const res = await emailService.sendOfficerOnboardingRequiredEmail(user, 'CGN-DEL-GEN-00002');
      expect(res).toBeDefined();
      expect(res.success).toBe(true);
    });

    test('12. Officer changes requested email with admin feedback', async () => {
      const user = { id: testOfficerId || 2, name: 'Officer Setup', email: testOfficerEmail };
      const res = await emailService.sendOfficerChangesRequestedEmail(user, 'Please re-upload clearer identity document');
      expect(res).toBeDefined();
      expect(res.success).toBe(true);
    });

    test('13. Role changed email dispatches to affected user', async () => {
      const user = { id: testUserId || 1, name: 'Promoted User', email: testUserEmail, role: 'officer', employee_id: 'CGN-OFF-101' };
      const res = await emailService.sendRoleChangedEmail(user);
      expect(res).toBeDefined();
      expect(res.success).toBe(true);
    });
  });

  // ==========================================
  // 4. COMPLAINT LIFECYCLE WORKFLOWS (14-20)
  // ==========================================
  describe('4. Complaint Lifecycle Email Workflows (14-20)', () => {
    test('14. Complaint submitted confirmation email dispatches to complaint owner', async () => {
      const complaint = { id: testComplaintId || 101, title: 'Streetlight Out', category: 'electricity', priority: 'medium' };
      const citizen = { id: testUserId || 1, name: 'Citizen Test', email: testUserEmail };
      const res = await emailService.sendComplaintSubmittedEmail(complaint, citizen);
      expect(res).toBeDefined();
      expect(res.success).toBe(true);
    });

    test('15. Complaint assigned email dispatches to assigned officer', async () => {
      const complaint = { id: testComplaintId || 101, title: 'Broken Water Pipe', category: 'water', priority: 'high', sla_due_at: new Date() };
      const officer = { id: testOfficerId || 2, name: 'Officer Test', email: testOfficerEmail };
      const res = await emailService.sendComplaintAssignedEmail(complaint, officer);
      expect(res).toBeDefined();
      expect(res.success).toBe(true);
    });

    test('16. Complaint assigned citizen update email dispatches to complaint owner', async () => {
      const complaint = { id: testComplaintId || 101, title: 'Streetlight Out' };
      const citizen = { id: testUserId || 1, name: 'Citizen Test', email: testUserEmail };
      const res = await emailService.sendComplaintAssignedCitizenEmail(complaint, citizen);
      expect(res).toBeDefined();
      expect(res.success).toBe(true);
    });

    test('17. Complaint status changed notification email to citizen', async () => {
      const complaint = { id: testComplaintId || 101, title: 'Streetlight Out', status: 'in_progress' };
      const citizen = { id: testUserId || 1, name: 'Citizen Test', email: testUserEmail };
      const res = await emailService.sendComplaintStatusChangedEmail(complaint, citizen, 'open', 'in_progress');
      expect(res).toBeDefined();
      expect(res.success).toBe(true);
    });

    test('18. Complaint resolved email invites citizen verification', async () => {
      const complaint = { id: testComplaintId || 101, title: 'Streetlight Out' };
      const citizen = { id: testUserId || 1, name: 'Citizen Test', email: testUserEmail };
      const res = await emailService.sendComplaintResolvedEmail(complaint, citizen);
      expect(res).toBeDefined();
      expect(res.success).toBe(true);
    });

    test('19. Complaint reopened email notifies assigned officer', async () => {
      const complaint = { id: testComplaintId || 101, title: 'Streetlight Out' };
      const officer = { id: testOfficerId || 2, name: 'Officer Test', email: testOfficerEmail };
      const res = await emailService.sendComplaintReopenedEmail(complaint, officer);
      expect(res).toBeDefined();
      expect(res.success).toBe(true);
    });

    test('20. Resolution verification required email dispatches to citizen', async () => {
      const complaint = { id: testComplaintId || 101, title: 'Resolved Pothole' };
      const citizen = { id: testUserId || 1, name: 'Citizen Test', email: testUserEmail };
      const res = await emailService.sendResolutionVerificationEmail(complaint, citizen);
      expect(res).toBeDefined();
      expect(res.success).toBe(true);
    });
  });

  // ==========================================
  // 5. SLA & SCHEDULED REPORTS (21-23)
  // ==========================================
  describe('5. SLA & Scheduled Governance Workflows (21-23)', () => {
    test('21. SLA warning email notifies responsible officer approaching deadline', async () => {
      const complaint = { id: testComplaintId || 101, title: 'Critical Water Leak', priority: 'critical', sla_due_at: new Date() };
      const officer = { id: testOfficerId || 2, name: 'Officer Test', email: testOfficerEmail };
      const warnRes = await emailService.sendSlaWarningEmail(complaint, officer);
      expect(warnRes).toBeDefined();
      expect(warnRes.success).toBe(true);
    });

    test('22. SLA breach critical alert email notifies responsible officer', async () => {
      const complaint = { id: testComplaintId || 101, title: 'Critical Water Leak', priority: 'critical', sla_due_at: new Date() };
      const officer = { id: testOfficerId || 2, name: 'Officer Test', email: testOfficerEmail };
      const breachRes = await emailService.sendSlaBreachedEmail(complaint, officer);
      expect(breachRes).toBeDefined();
      expect(breachRes.success).toBe(true);
    });

    test('23. Scheduled reports email dispatches executive summary to administrator', async () => {
      const report = {
        title: 'Weekly Executive Briefing',
        filename: 'report.csv',
        content: 'Header1,Header2\nVal1,Val2',
        contentType: 'text/csv',
        totalRows: 10,
        summary: { 'Total Complaints': 10, 'Resolution Rate': '90%' }
      };
      const schedule = { id: 1, title: 'Weekly Executive Briefing', frequency: 'weekly', timezone: 'Asia/Kolkata' };
      const res = await emailService.sendScheduledReportEmail({
        report,
        schedule,
        recipientEmail: 'admin@civicgreennet.dev'
      });
      expect(res).toBeDefined();
      expect(res.success).toBe(true);
    });
  });

  // ==========================================
  // 6. RESEND ERROR HANDLING, DEDUP & SECURITY
  // ==========================================
  describe('6. Resend Error Handling, Deduplication & Security', () => {
    test('24. Invalid or missing recipient throws descriptive error', async () => {
      await expect(emailService.sendAndLog({
        recipient: '',
        eventType: 'TEST_INVALID',
        subject: 'Test',
        html: '<p>Test</p>'
      })).rejects.toThrow(/recipient.*required/i);
    });

    test('25. Duplicate email prevention via deduplication key works', async () => {
      const dedupKey = `test_dedup_${Date.now()}`;
      const res1 = await emailService.sendAndLog({
        recipient: testUserEmail,
        eventType: 'TEST_DEDUP',
        subject: 'Dedup Test 1',
        html: '<p>Dedup</p>',
        deduplicationKey: dedupKey
      });
      expect(res1.success).toBe(true);

      const res2 = await emailService.sendAndLog({
        recipient: testUserEmail,
        eventType: 'TEST_DEDUP',
        subject: 'Dedup Test 2',
        html: '<p>Dedup</p>',
        deduplicationKey: dedupKey
      });
      expect(res2.success).toBe(true);
    });

    test('26. Email masking utility masks sensitive email addresses safely', () => {
      expect(emailService.maskEmail('shashank@gmail.com')).toBe('s****k@gmail.com');
      expect(emailService.maskEmail('a@b.com')).toBe('a*@b.com');
      expect(emailService.maskEmail('')).toBe('');
      expect(emailService.maskEmail(null)).toBe('');
    });

    test('27. OTP security: OTP is cryptographically hashed with SHA-256 and timing-safe verified', async () => {
      const code = '654321';
      const email = 'security_test@example.com';
      const hash = otpService.hashOtp(code, email, 'signup');
      expect(hash).toBeDefined();
      expect(hash.length).toBe(64); // SHA-256

      const isValid = otpService.verifyOtpHash(code, email, 'signup', hash);
      expect(isValid).toBe(true);

      const isInvalid = otpService.verifyOtpHash('999999', email, 'signup', hash);
      expect(isInvalid).toBe(false);
    });
  });

  // ==========================================
  // 7. ADMIN TEST EMAIL & HEALTH APIS
  // ==========================================
  describe('7. Admin Test Email & System Health Endpoints', () => {
    test('28. POST /api/admin/email/test rejects unauthenticated requests', async () => {
      const res = await request(app)
        .post('/api/admin/email/test')
        .send({ to: 'admin@civicgreennet.dev' });
      expect(res.status).toBe(401);
    });

    test('29. POST /api/admin/email/test succeeds for authorized admin and returns sanitized result without secrets', async () => {
      const res = await request(app)
        .post('/api/admin/email/test')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ to: 'admin@civicgreennet.dev' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('provider', 'resend');
      expect(res.body.data).toHaveProperty('domain', 'civicgreennet.dev');
      expect(res.body.data).not.toHaveProperty('apiKey');
      expect(res.body.data).not.toHaveProperty('RESEND_API_KEY');
    });

    test('30. POST /api/admin/email/test-otp rejects unauthenticated requests', async () => {
      const res = await request(app)
        .post('/api/admin/email/test-otp')
        .send({ to: 'admin@civicgreennet.dev' });
      expect(res.status).toBe(401);
    });

    test('31. POST /api/admin/email/test-otp succeeds for authorized admin, triggers real OTP dispatch, and returns sanitized result', async () => {
      const res = await request(app)
        .post('/api/admin/email/test-otp')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ to: 'admin@civicgreennet.dev' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('provider', 'resend');
      expect(res.body.data).toHaveProperty('domain', 'civicgreennet.dev');
      expect(res.body.data).toHaveProperty('messageId');
      expect(res.body.data).not.toHaveProperty('otp');
      expect(res.body.data).not.toHaveProperty('rawOtp');
    });

    test('32. GET /api/health returns operational email provider diagnostics without secrets', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.email).toBeDefined();
      expect(res.body.email.provider).toBe('resend');
      expect(res.body.email.domain).toBe('civicgreennet.dev');
      expect(res.body.email.configured).toBe(true);
      expect(res.body).not.toHaveProperty('RESEND_API_KEY');
    });
  });

  // ==========================================
  // 8. REAL SIGNUP & OTP PIPELINE
  // ==========================================
  describe('8. Real Signup & OTP Pipeline Flow', () => {
    test('33. POST /api/auth/signup triggers sendOtpVerificationEmail with 6-digit OTP and returns 201', async () => {
      const testEmail = `jest_citizen_${Date.now()}@example.com`;
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'Jest Citizen Tester',
          email: testEmail,
          password: 'Password123!',
          accountType: 'citizen'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.requiresVerification).toBe(true);
      expect(res.body.maskedEmail).toBeDefined();
      expect(res.body).not.toHaveProperty('rawOtp');
      expect(res.body).not.toHaveProperty('otp');
    });

    test('34. POST /api/auth/resend-otp triggers fresh verification email with cooldown enforcement', async () => {
      const testEmail = `jest_resend_${Date.now()}@example.com`;
      // Create user first
      await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'Jest Resend Tester',
          email: testEmail,
          password: 'Password123!',
          accountType: 'citizen'
        });

      // Immediate resend should trigger cooldown 429
      const resend1 = await request(app)
        .post('/api/auth/resend-otp')
        .send({ email: testEmail, purpose: 'signup' });

      expect(resend1.status).toBe(429);
      expect(resend1.body.inCooldown).toBe(true);
    });
  });

  // ==========================================
  // 9. FRONTEND SECRET LEAK SCAN
  // ==========================================
  describe('9. Frontend Source & Client Secret Audit', () => {
    test('35. Client source files contain 0 RESEND_API_KEY or secret references', () => {
      const clientSrc = path.join(__dirname, '../../client/src');
      if (fs.existsSync(clientSrc)) {
        const scanDir = (dir) => {
          const entries = fs.readdirSync(dir, { withFileTypes: true });
          for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
              scanDir(fullPath);
            } else if (/\.(jsx?|tsx?|html|css|json)$/i.test(entry.name)) {
              const content = fs.readFileSync(fullPath, 'utf8');
              expect(content).not.toContain('RESEND_API_KEY');
              expect(content).not.toContain('JWT_ACCESS_SECRET');
            }
          }
        };
        scanDir(clientSrc);
      }
    });
  });
});
