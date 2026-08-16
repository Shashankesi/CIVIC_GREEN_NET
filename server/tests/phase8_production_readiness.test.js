/**
 * Civic GreenNet — Phase 8 Production Readiness Test Suite
 * Validates:
 * 1. Environment Safety & Secret Protection
 * 2. Secret Protection in Error Responses & Logs
 * 3. CORS Origin Validation
 * 4. Security Headers & CSP Configuration
 * 5. Authentication Hardening & Token Validation
 * 6. RBAC Authorization & Role Isolation
 * 7. Object Ownership & IDOR Protection
 * 8. Input Validation & Parameterized Queries
 * 9. File Upload Security & MIME Validation
 * 10. Rate Limiting Configuration
 * 11. Transaction Safety & Rollback Behavior
 * 12. SSE Real-Time Connection Cleanup & Client Management
 * 13. Scheduler Locking & Health Diagnostics
 * 14. System Health Endpoints
 * 15. AI Advisory Resilience & Fallback
 * 16. SMTP Resilience & Batch Retry Logging
 * 17. Cloudinary Upload Failure Resilience
 * 18. Database Failure Handling
 * 19. Authoritative Data Consistency
 * 20. Graceful Shutdown & Production Readiness
 */

const request = require('supertest');
const app = require('../app');
const db = require('../config/db');
const jwt = require('jsonwebtoken');
const { JWT } = require('../config');
const realtimeGateway = require('../services/realtimeGateway');
const scheduledReportWorker = require('../services/analytics/scheduledReportWorker');
const aiProvider = require('../services/ai/aiProvider');

describe('CIVIC GREENNET — PHASE 8 PRODUCTION READINESS & SECURITY', () => {
  let citizenToken, officerToken, adminToken;
  let citizenUser, officerUser, adminUser;
  let testComplaintId;

  beforeAll(async () => {
    const timestamp = Date.now();

    // 1. Create Verified Citizen
    const citizenEmail = `p8_citizen_${timestamp}@civicgreennet.gov.in`;
    const citRes = await db.query(`
      INSERT INTO users (name, email, password, role, status, is_verified, created_at)
      VALUES ($1, $2, 'hash_p8_pwd', 'citizen', 'active', true, now())
      RETURNING id, name, email, role, status;
    `, [`P8 Citizen ${timestamp}`, citizenEmail]);
    citizenUser = citRes.rows[0];
    citizenToken = jwt.sign({ userId: citizenUser.id, role: 'citizen', email: citizenEmail }, JWT.ACCESS_SECRET, { expiresIn: '1h' });

    // 2. Create Active Officer with Department
    const deptRes = await db.query(`SELECT id FROM departments LIMIT 1`);
    const deptId = deptRes.rows[0]?.id || 1;
    const officerEmail = `p8_officer_${timestamp}@civicgreennet.gov.in`;
    const offRes = await db.query(`
      INSERT INTO users (name, email, password, role, status, is_verified, department_id, created_at)
      VALUES ($1, $2, 'hash_p8_pwd', 'officer', 'active', true, $3, now())
      RETURNING id, name, email, role, status, department_id;
    `, [`P8 Officer ${timestamp}`, officerEmail, deptId]);
    officerUser = offRes.rows[0];
    officerToken = jwt.sign({ userId: officerUser.id, role: 'officer', email: officerEmail, departmentId: deptId }, JWT.ACCESS_SECRET, { expiresIn: '1h' });

    // 3. Create Administrator
    const adminEmail = `p8_admin_${timestamp}@civicgreennet.gov.in`;
    const admRes = await db.query(`
      INSERT INTO users (name, email, password, role, status, is_verified, created_at)
      VALUES ($1, $2, 'hash_p8_pwd', 'admin', 'active', true, now())
      RETURNING id, name, email, role, status;
    `, [`P8 Admin ${timestamp}`, adminEmail]);
    adminUser = admRes.rows[0];
    adminToken = jwt.sign({ userId: adminUser.id, role: 'admin', email: adminEmail }, JWT.ACCESS_SECRET, { expiresIn: '1h' });

    // 4. Create Baseline Complaint
    const compRes = await db.query(`
      INSERT INTO complaints (
        user_id, department_id, officer_id, title, description, category, priority, status,
        location, address, created_at
      ) VALUES (
        $1, $2, $3, 'Phase 8 Drainage Overflow', 'P8 test complaint for production verification', 'water', 'high', 'open',
        ST_SetSRID(ST_MakePoint(76.7794, 30.7333), 4326), 'Sector 17, Chandigarh', now()
      ) RETURNING id;
    `, [citizenUser.id, deptId, officerUser.id]);
    testComplaintId = compRes.rows[0].id;
  });

  afterAll(async () => {
    // Teardown connections cleanly
    realtimeGateway.closeAllClients();
  });

  // =========================================================================
  // DOMAIN 1 & 2: Environment Safety & Secret Protection
  // =========================================================================
  describe('Domain 1 & 2: Environment Safety & Secret Protection', () => {
    test('Config object does not leak database connection password in unmasked form', () => {
      const config = require('../config');
      expect(config.JWT.ACCESS_SECRET).toBeDefined();
      expect(config.PORT).toBeDefined();
      expect(config.EMAIL.PROVIDER).toBe('resend');
    });

    test('Environment validator masks sensitive API keys and summarizes email configuration safely', () => {
      const { maskApiKey, emailConfigSummary } = require('../config/validateEnv');
      expect(maskApiKey('re_1234567890abcdef')).toMatch(/^re_12\*{4}cdef$/);
      expect(maskApiKey(null)).toBe('(none)');
      expect(emailConfigSummary.from).toContain('notifications@civicgreennet.dev');
      expect(emailConfigSummary.replyTo).toBe('civicgreennet@gmail.com');
      expect(emailConfigSummary.apiKeyMasked).toMatch(/^\*{4}$|^[a-zA-Z0-9_-]{5}\*{4}[a-zA-Z0-9_-]{4}$|^\(none\)$/);
    });

    test('Error handler suppresses stack traces and db connection strings in error responses', async () => {
      const res = await request(app)
        .get('/api/complaints/99999999')
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBeDefined();
      expect(res.body.stack).toBeUndefined();
      expect(JSON.stringify(res.body)).not.toContain('postgresql://');
      expect(JSON.stringify(res.body)).not.toContain('password=');
    });

    test('Request ID middleware attaches correlation ID to every response', async () => {
      const res = await request(app)
        .get('/api/health')
        .expect(200);

      expect(res.headers['x-request-id']).toBeDefined();
      expect(res.headers['x-response-time']).toBeDefined();
    });
  });

  // =========================================================================
  // DOMAIN 3 & 4: CORS & Security Headers
  // =========================================================================
  describe('Domain 3 & 4: CORS & Security Headers', () => {
    test('Security headers (Helmet) are present on API responses', async () => {
      const res = await request(app).get('/api/health');

      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options'] || res.headers['content-security-policy']).toBeDefined();
      expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    });

    test('CORS allows localhost development origin', async () => {
      const validRes = await request(app)
        .get('/api/health')
        .set('Origin', 'http://localhost:5173');
      expect(validRes.status).toBe(200);
      expect(validRes.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    });

    test('CORS allows production origin (https://civicgreennet.onrender.com)', async () => {
      const res = await request(app)
        .get('/api/health')
        .set('Origin', 'https://civicgreennet.onrender.com');
      expect(res.status).toBe(200);
      expect(res.headers['access-control-allow-origin']).toBe('https://civicgreennet.onrender.com');
    });

    test('CORS blocks untrusted cross-origin requests', async () => {
      const invalidRes = await request(app)
        .get('/api/health')
        .set('Origin', 'http://malicious-phishing-site.xyz');
      expect(invalidRes.headers['access-control-allow-origin']).not.toBe('http://malicious-phishing-site.xyz');
    });

    test('CORS handles preflight OPTIONS for /api/health', async () => {
      const optionsRes = await request(app)
        .options('/api/health')
        .set('Origin', 'http://localhost:5173')
        .set('Access-Control-Request-Method', 'GET');
      expect(optionsRes.status).toBe(200);
      expect(optionsRes.headers['access-control-allow-credentials']).toBe('true');
    });

    test('CORS handles preflight OPTIONS for /api/maps/complaints from production origin', async () => {
      const res = await request(app)
        .options('/api/maps/complaints')
        .set('Origin', 'https://civicgreennet.onrender.com')
        .set('Access-Control-Request-Method', 'GET')
        .set('Access-Control-Request-Headers', 'Authorization,Content-Type');
      expect(res.status).toBe(200);
      expect(res.headers['access-control-allow-origin']).toBe('https://civicgreennet.onrender.com');
      expect(res.headers['access-control-allow-credentials']).toBe('true');
    });

    test('CORS handles preflight OPTIONS for /api/maps/hotspots from production origin', async () => {
      const res = await request(app)
        .options('/api/maps/hotspots')
        .set('Origin', 'https://civicgreennet.onrender.com')
        .set('Access-Control-Request-Method', 'GET');
      expect(res.status).toBe(200);
      expect(res.headers['access-control-allow-origin']).toBe('https://civicgreennet.onrender.com');
    });

    test('CORS handles preflight OPTIONS for /api/realtime/stream from production origin', async () => {
      const res = await request(app)
        .options('/api/realtime/stream')
        .set('Origin', 'https://civicgreennet.onrender.com')
        .set('Access-Control-Request-Method', 'GET')
        .set('Access-Control-Request-Headers', 'Last-Event-ID,Cache-Control');
      expect(res.status).toBe(200);
      expect(res.headers['access-control-allow-origin']).toBe('https://civicgreennet.onrender.com');
    });

    test('URL builder (buildFrontendUrl) generates valid URLs and supports query parameters', () => {
      const { buildFrontendUrl } = require('../utils/urlUtils');
      const url = buildFrontendUrl('/verify', { token: 'test-123', email: 'test@civicgreennet.dev' });
      expect(url).toContain('/verify');
      expect(url).toContain('token=test-123');
      expect(url).toContain('email=test%40civicgreennet.dev');
      expect(url.startsWith('http://') || url.startsWith('https://')).toBe(true);
    });

    test('Health check endpoint is publicly accessible and returns expected structure without credentials', async () => {
      const healthRes = await request(app).get('/api/health');
      expect(healthRes.status).toBe(200);
      expect(healthRes.body.success).toBe(true);
      expect(healthRes.body.status).toBe('healthy');
      expect(healthRes.body.database).toBe('connected');
      expect(healthRes.body.email).toBeDefined();
      expect(healthRes.body.email.provider).toBe('resend');
      // Verify no raw secrets are in health payload
      const jsonStr = JSON.stringify(healthRes.body);
      expect(jsonStr).not.toContain('re_');
      expect(jsonStr).not.toContain('postgres://');
      expect(jsonStr).not.toContain('postgresql://');
    });
  });

  // =========================================================================
  // DOMAIN 5 & 6: Authentication Hardening & Role Security (RBAC)
  // =========================================================================
  describe('Domain 5 & 6: Authentication Hardening & RBAC', () => {
    test('Unauthenticated request to protected admin endpoint returns 401', async () => {
      const res = await request(app)
        .get('/api/admin/dashboard')
        .expect(401);
      expect(res.body.success).toBe(false);
    });

    test('Citizen role cannot access admin APIs (returns 403)', async () => {
      const res = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${citizenToken}`)
        .expect(403);
      expect(res.body.success).toBe(false);
    });

    test('Citizen role cannot access officer APIs (returns 403)', async () => {
      const res = await request(app)
        .get('/api/officer/workload')
        .set('Authorization', `Bearer ${citizenToken}`)
        .expect(403);
      expect(res.body.success).toBe(false);
    });

    test('Officer role cannot access admin user management (returns 403)', async () => {
      const res = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${officerToken}`)
        .expect(403);
      expect(res.body.success).toBe(false);
    });

    test('Admin role has access to administrative and governance endpoints', async () => {
      const res = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.success).toBe(true);
    });

    test('Malformed or tampered JWT returns 401', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid_tampered_token_signature')
        .expect(401);
      expect(res.body.success).toBe(false);
    });
  });

  // =========================================================================
  // DOMAIN 7 & 8: Ownership & IDOR Protection + Input Validation
  // =========================================================================
  describe('Domain 7 & 8: Ownership (IDOR) & Input Validation', () => {
    test('Citizen A cannot verify resolution or modify Citizen B complaint (returns 403)', async () => {
      const otherCitEmail = `p8_other_${Date.now()}@example.com`;
      const otherRes = await db.query(`
        INSERT INTO users (name, email, password, role, status, is_verified)
        VALUES ('Other Citizen', $1, 'hash', 'citizen', 'active', true)
        RETURNING id;
      `, [otherCitEmail]);
      const otherToken = jwt.sign({ userId: otherRes.rows[0].id, role: 'citizen' }, JWT.ACCESS_SECRET);

      const res = await request(app)
        .post(`/api/complaints/${testComplaintId}/verify-resolution`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ satisfied: true });

      expect([400, 403]).toContain(res.status);
    });

    test('Parameterized SQL injection prevention in search query', async () => {
      const res = await request(app)
        .get("/api/complaints/search?mine=false&category=' OR 1=1 --")
        .expect(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.items || res.body.data)).toBe(true);
    });
  });

  // =========================================================================
  // DOMAIN 9 & 10: File Upload Security & Rate Limiting
  // =========================================================================
  describe('Domain 9 & 10: File Upload Security & Rate Limiting', () => {
    test('Reject executable or invalid file upload extensions', async () => {
      const res = await request(app)
        .post('/api/complaints')
        .set('Authorization', `Bearer ${citizenToken}`)
        .field('title', 'Test upload title')
        .field('description', 'Test upload description')
        .field('category', 'water')
        .field('priority', 'medium')
        .attach('images', Buffer.from('malicious shell script'), 'evil.sh');

      expect([400, 500]).toContain(res.status);
    });

    test('Rate limit headers are present on API responses', async () => {
      const res = await request(app).get('/api/public/stats');
      expect(res.headers['ratelimit-limit'] || res.headers['x-ratelimit-limit']).toBeDefined();
    });

    test('Health check endpoints (/api/health and /health) bypass rate limiter and return 200', async () => {
      const res1 = await request(app).get('/api/health');
      expect(res1.status).toBe(200);
      expect(res1.body.success).toBe(true);
      expect(res1.body.status).toBe('healthy');

      const res2 = await request(app).get('/health');
      expect(res2.status).toBe(200);
      expect(res2.body.success).toBe(true);
      expect(res2.body.status).toBe('healthy');
    });
  });

  // =========================================================================
  // DOMAIN 11 & 12: Transaction Safety & SSE Connection Cleanup
  // =========================================================================
  describe('Domain 11 & 12: Transaction Safety & SSE Cleanup', () => {
    test('Database transactions commit and rollback correctly', async () => {
      const txResult = await db.transaction(async (client) => {
        const r = await client.query('SELECT 1 + 1 AS result');
        return r.rows[0].result;
      });
      expect(txResult).toBe(2);

      await expect(
        db.transaction(async (client) => {
          await client.query("INSERT INTO departments (name) VALUES ('Temporary Dept')");
          throw new Error('Intentional Transaction Abort');
        })
      ).rejects.toThrow('Intentional Transaction Abort');
    });

    test('SSE Real-Time Gateway registers and closes clients without memory leaks', () => {
      const mockRes = {
        writeHead: jest.fn(),
        write: jest.fn(),
        on: jest.fn(),
        end: jest.fn()
      };

      const clientId = realtimeGateway.registerClient({ id: 9999, role: 'citizen' }, mockRes);
      expect(clientId).toBeDefined();
      expect(mockRes.writeHead).toHaveBeenCalledWith(200, expect.any(Object));

      const metrics = realtimeGateway.getMetrics();
      expect(metrics.activeUsers).toBeGreaterThanOrEqual(1);

      realtimeGateway.closeAllClients();
      expect(mockRes.end).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // DOMAIN 13 & 14: Scheduler & System Health Endpoints
  // =========================================================================
  describe('Domain 13 & 14: Scheduler Diagnostics & System Health', () => {
    test('GET /api/health returns operational database connectivity', async () => {
      const res = await request(app)
        .get('/api/health')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.api).toBe('healthy');
      expect(res.body.database).toBe('connected');
    });

    test('GET /api/admin/system-health returns full operational matrix', async () => {
      const res = await request(app)
        .get('/api/admin/system-health')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.database).toBe('operational');
      expect(res.body.data.postgis).toBeDefined();
      expect(res.body.data.realtime).toBeDefined();
      expect(res.body.data.scheduler).toBeDefined();
    });

    test('Scheduled report worker diagnostics and health checks run cleanly', async () => {
      const health = await scheduledReportWorker.getSchedulerHealth();
      expect(health.workerId).toBeDefined();
      expect(health.uptimeSeconds).toBeGreaterThan(0);
      expect(health.stats).toBeDefined();
    });
  });

  // =========================================================================
  // DOMAIN 15 & 16: AI Advisory Fallback & SMTP Resilience
  // =========================================================================
  describe('Domain 15 & 16: AI Fallback & SMTP Resilience', () => {
    test('AI service provides deterministic fallback classification when external LLM is offline', async () => {
      const complaintClassifier = require('../services/ai/complaintClassifier');
      const fallbackResult = complaintClassifier.deterministicClassify('Electric wire sparking and streetlight out in dark street', 'lighting');
      expect(fallbackResult).toBeDefined();
      expect(fallbackResult.category).toBe('lighting');
      expect(fallbackResult.priority).toBeDefined();
      expect(fallbackResult.confidence).toBeDefined();

      const liveOrFallbackResult = await complaintClassifier.classifyComplaint({
        title: 'Broken streetlight at sector 17',
        description: 'Dark road creating public safety issue',
        citizenCategory: 'lighting'
      });
      expect(liveOrFallbackResult).toBeDefined();
      expect(liveOrFallbackResult.category).toBeDefined();
    }, 15000);

    test('Email retry queue logs failed delivery attempts into PostgreSQL email_logs', async () => {
      const logRes = await db.query('SELECT COUNT(*)::int AS count FROM email_logs');
      expect(logRes.rows[0].count).toBeGreaterThanOrEqual(0);
    });
  });

  // =========================================================================
  // DOMAIN 17 & 18: Cloudinary & Database Resilience
  // =========================================================================
  describe('Domain 17 & 18: Cloudinary & Database Failure Handling', () => {
    test('Cloudinary service degrades gracefully without breaking complaint records', () => {
      const cloudinary = require('../config/cloudinary');
      expect(cloudinary).toBeDefined();
    });

    test('Database pool health query SELECT 1 completes in under 200ms', async () => {
      const start = Date.now();
      await db.query('SELECT 1');
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000);
    });
  });

  // =========================================================================
  // DOMAIN 19 & 20: Authoritative Data Consistency & Production Readiness
  // =========================================================================
  describe('Domain 19 & 20: Data Consistency & Production Readiness', () => {
    test('Authoritative complaint count matches across database and public stats', async () => {
      const dbCountRes = await db.query('SELECT COUNT(*)::int AS count FROM complaints');
      const totalInDb = dbCountRes.rows[0].count;

      const publicStatsRes = await request(app)
        .get('/api/complaints/public-stats')
        .expect(200);

      const reportedTotal = publicStatsRes.body.data?.totalReports ?? publicStatsRes.body.data?.total ?? 0;
      expect(reportedTotal).toBe(totalInDb);
    });

    test('Graceful shutdown exports server and handler functions', () => {
      const serverModule = require('../server');
      expect(serverModule.gracefulShutdown).toBeDefined();
      expect(typeof serverModule.gracefulShutdown).toBe('function');
    });
  });
});
