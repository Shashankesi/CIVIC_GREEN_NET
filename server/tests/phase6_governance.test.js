const request = require('supertest');
const app = require('../app');
const db = require('../config/db');

jest.setTimeout(40000);

describe('PHASE 6 — Municipal Governance, Advanced Analytics, Reporting & Executive Decision Intelligence', () => {
  let adminToken = null;
  let officerToken = null;
  let citizenToken = null;
  let adminUserId = null;
  let officerUserId = null;
  let citizenUserId = null;
  let testDepartmentId = null;

  const testSuffix = Date.now();
  const adminEmail = `p6_admin_${testSuffix}@example.com`;
  const officerEmail = `p6_officer_${testSuffix}@example.com`;
  const citizenEmail = `p6_citizen_${testSuffix}@example.com`;

  beforeAll(async () => {
    const passHash = require('bcrypt').hashSync('Password123!', 10);

    const adminRes = await db.query(
      `INSERT INTO users (name, email, password, role, is_verified, created_at)
       VALUES ($1, $2, $3, 'admin', true, now()) RETURNING id`,
      ['P6 Admin', adminEmail, passHash]
    );
    adminUserId = adminRes.rows[0].id;

    const deptRes = await db.query(
      `INSERT INTO departments (name, description, created_at)
       VALUES ($1, $2, now()) RETURNING id`,
      [`P6 Governance Dept ${testSuffix}`, 'Phase 6 Testing Department']
    );
    testDepartmentId = deptRes.rows[0].id;

    const offRes = await db.query(
      `INSERT INTO users (name, email, password, role, is_verified, department_id, created_at)
       VALUES ($1, $2, $3, 'officer', true, $4, now()) RETURNING id`,
      ['P6 Officer', officerEmail, passHash, testDepartmentId]
    );
    officerUserId = offRes.rows[0].id;

    const citRes = await db.query(
      `INSERT INTO users (name, email, password, role, is_verified, created_at)
       VALUES ($1, $2, $3, 'citizen', true, now()) RETURNING id`,
      ['P6 Citizen', citizenEmail, passHash]
    );
    citizenUserId = citRes.rows[0].id;

    const tokenService = require('../services/tokenService');
    adminToken = tokenService.generateAccessToken({ userId: adminUserId, role: 'admin' });
    officerToken = tokenService.generateAccessToken({ userId: officerUserId, role: 'officer' });
    citizenToken = tokenService.generateAccessToken({ userId: citizenUserId, role: 'citizen' });

    // Create test complaints with formula injection test string
    await db.query(
      `INSERT INTO complaints (title, description, category, priority, status, user_id, department_id, officer_id, location, address, sla_due_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, ST_SetSRID(ST_MakePoint(76.7794, 30.7333), 4326)::geography, $9, now() + interval '2 days', now() - interval '1 day')`,
      [
        '=SUM(1,2) Injected Title',
        '+cmd| /C calc Injected Description',
        'water',
        'critical',
        'open',
        citizenUserId,
        testDepartmentId,
        officerUserId,
        'Sector 17, Chandigarh'
      ]
    );

    await db.query(
      `INSERT INTO complaints (title, description, category, priority, status, user_id, department_id, officer_id, location, address, sla_due_at, resolution_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, ST_SetSRID(ST_MakePoint(76.7800, 30.7340), 4326)::geography, $9, now() + interval '1 day', now() - interval '2 hours', now() - interval '3 days')`,
      [
        'Resolved Water Leakage',
        'Leakage fixed quickly by officer',
        'water',
        'high',
        'resolved',
        citizenUserId,
        testDepartmentId,
        officerUserId,
        'Sector 17, Chandigarh'
      ]
    );
  });

  afterAll(async () => {
    try {
      await db.query('DELETE FROM complaints WHERE user_id = $1', [citizenUserId]);
      await db.query('DELETE FROM scheduled_reports WHERE created_by = $1', [adminUserId]);
      await db.query('DELETE FROM governance_report_history WHERE generated_by = $1', [adminUserId]);
      await db.query('DELETE FROM users WHERE id IN ($1, $2, $3)', [adminUserId, officerUserId, citizenUserId]);
      await db.query('DELETE FROM departments WHERE id = $1', [testDepartmentId]);
    } catch (e) {
      // Cleanup
    }
  });

  describe('1. Executive KPIs & Municipal Health Score', () => {
    test('Admin should retrieve executive KPIs with valid calculations', async () => {
      const res = await request(app)
        .get('/api/governance/executive-kpis?timeframe=30d')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const data = res.body.data || res.body;
      expect(data).toHaveProperty('total');
      expect(data).toHaveProperty('healthScore');

      expect(data.total).toBeGreaterThanOrEqual(2);
      expect(data.resolutionRate).toBeGreaterThanOrEqual(0);
      expect(data.slaCompliance).toBeGreaterThanOrEqual(0);

      const hs = data.healthScore;
      expect(hs.score).toBeGreaterThanOrEqual(0);
      expect(hs.score).toBeLessThanOrEqual(100);
      expect(hs).toHaveProperty('grade');
      expect(hs.breakdown).toHaveProperty('resolutionPoints');
      expect(hs.breakdown).toHaveProperty('slaPoints');
    });

    test('Executive KPIs should support custom date range filters', async () => {
      const res = await request(app)
        .get('/api/governance/executive-kpis?timeframe=custom&startDate=2026-01-01&endDate=2026-12-31')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const data = res.body.data || res.body;
      expect(data.total).toBeDefined();
    });
  });

  describe('2. Department Governance & Performance Analytics', () => {
    test('Admin should retrieve department performance table', async () => {
      const res = await request(app)
        .get('/api/governance/departments?timeframe=30d')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const data = res.body.data || res.body;
      expect(Array.isArray(data)).toBe(true);

      const dept = data.find(d => d.id === testDepartmentId);
      expect(dept).toBeDefined();
      expect(dept.total).toBeGreaterThanOrEqual(2);
      expect(dept.resolutionRate).toBeGreaterThanOrEqual(0);
      expect(dept.slaCompliance).toBeGreaterThanOrEqual(0);
    });

    test('Admin should retrieve department workspace deep dive', async () => {
      const res = await request(app)
        .get(`/api/governance/departments/${testDepartmentId}?timeframe=30d`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const data = res.body.data || res.body;
      expect(data.department).toBeDefined();
      expect(data.stats).toBeDefined();
      expect(Array.isArray(data.officers)).toBe(true);
      expect(Array.isArray(data.recentComplaints)).toBe(true);
    });
  });

  describe('3. Officer Governance & Fair Multi-Factor Scoring', () => {
    test('Admin should retrieve officer performance rankings with fair scores', async () => {
      const res = await request(app)
        .get('/api/governance/officers?timeframe=30d')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const data = res.body.data || res.body;
      expect(Array.isArray(data)).toBe(true);

      const off = data.find(o => o.id === officerUserId);
      expect(off).toBeDefined();
      expect(off).toHaveProperty('fairScore');
      expect(off.fairScore).toBeGreaterThanOrEqual(0);
      expect(off.fairScore).toBeLessThanOrEqual(100);
      expect(off.slaCompliance).toBeGreaterThanOrEqual(0);
      expect(off.resolutionRate).toBeGreaterThanOrEqual(0);
    });

    test('Admin should retrieve officer workspace deep dive', async () => {
      const res = await request(app)
        .get(`/api/governance/officers/${officerUserId}?timeframe=30d`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const data = res.body.data || res.body;
      expect(data.officer).toBeDefined();
      expect(data.stats).toBeDefined();
      expect(data.stats).toHaveProperty('resolutionRate');
    });
  });

  describe('4. SLA Intelligence & Breach Analytics', () => {
    test('Admin should retrieve SLA intelligence overview', async () => {
      const res = await request(app)
        .get('/api/governance/sla?timeframe=30d')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const data = res.body.data || res.body;
      expect(data).toHaveProperty('summary');
      expect(data).toHaveProperty('departmentRankings');
      expect(data).toHaveProperty('categoryBreaches');
      expect(data.summary).toHaveProperty('overallSlaCompliance');
    });
  });

  describe('5. Municipal Ward & Zone Scorecards (GIS)', () => {
    test('Admin should retrieve ward scorecards with spatial aggregation', async () => {
      const res = await request(app)
        .get('/api/governance/wards?timeframe=30d')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const data = res.body.data || res.body;
      expect(Array.isArray(data)).toBe(true);
      if (data.length > 0) {
        expect(data[0]).toHaveProperty('wardNumber');
        expect(data[0]).toHaveProperty('totalComplaints');
        expect(data[0]).toHaveProperty('resolutionRate');
      }
    });

    test('Admin should retrieve zone scorecards', async () => {
      const res = await request(app)
        .get('/api/governance/zones?timeframe=30d')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const data = res.body.data || res.body;
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe('6. Data Quality & Governance Alerts', () => {
    test('Admin should retrieve data quality audit & integrity score', async () => {
      const res = await request(app)
        .get('/api/governance/data-quality')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const data = res.body.data || res.body;
      expect(data).toHaveProperty('integrityScore');
      expect(data.integrityScore).toBeGreaterThanOrEqual(0);
      expect(data.integrityScore).toBeLessThanOrEqual(100);
      expect(data).toHaveProperty('anomalies');
      expect(data).toHaveProperty('completenessRate');
    });

    test('Admin should retrieve rule-based governance alerts', async () => {
      const res = await request(app)
        .get('/api/governance/alerts')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const data = res.body.data || res.body;
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe('7. Report Generation, Preview, & Formula Injection Sanitization', () => {
    test('Admin should generate interactive report preview', async () => {
      const res = await request(app)
        .post('/api/governance/reports/preview')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reportType: 'executive_summary',
          filters: { timeframe: '30d' }
        });

      expect(res.status).toBe(200);
      const data = res.body.data || res.body;
      expect(data).toHaveProperty('title');
      expect(data).toHaveProperty('columns');
      expect(Array.isArray(data.rows)).toBe(true);
    });

    test('CSV export must sanitize formula injection attempts (=, +, -, @ prefixing with \')', async () => {
      const res = await request(app)
        .get('/api/governance/reports/export?format=csv&reportType=complaints&timeframe=30d')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      const csvText = res.text;

      // The injected formula "=SUM(1,2)" must be escaped with a single quote "='=SUM(1,2)"
      expect(csvText).toMatch(/'=SUM\(1,2\)/);
    });

    test('Excel export should produce valid XML Spreadsheet workbook', async () => {
      const res = await request(app)
        .get('/api/governance/reports/export?format=excel&reportType=executive_summary&timeframe=30d')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('application/vnd.ms-excel');
      expect(res.text).toContain('<table');
      expect(res.text.toUpperCase()).toContain('EXECUTIVE GOVERNANCE SUMMARY');
    });

    test('PDF export should produce valid binary PDF document (%PDF-1.4)', async () => {
      const res = await request(app)
        .get('/api/governance/reports/export?format=pdf&reportType=executive_summary&timeframe=30d')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('application/pdf');
      expect(res.headers['content-disposition']).toContain('civicgreennet-executive-summary-30d.pdf');
      expect(Buffer.isBuffer(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(1000);
      expect(res.body.slice(0, 5).toString()).toBe('%PDF-');
    });

    test('Department and Complaints PDF exports should produce non-empty valid PDFs', async () => {
      const deptRes = await request(app)
        .get('/api/governance/reports/export?format=pdf&reportType=department&timeframe=7d')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(deptRes.status).toBe(200);
      expect(deptRes.headers['content-type']).toContain('application/pdf');
      expect(deptRes.body.slice(0, 5).toString()).toBe('%PDF-');
      expect(deptRes.body.length).toBeGreaterThan(1000);

      const compRes = await request(app)
        .get('/api/governance/reports/export?format=pdf&reportType=complaints&timeframe=30d')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(compRes.status).toBe(200);
      expect(compRes.headers['content-type']).toContain('application/pdf');
      expect(compRes.body.slice(0, 5).toString()).toBe('%PDF-');
      expect(compRes.body.length).toBeGreaterThan(1000);
    });

    test('Unauthenticated report export request must be rejected with 401', async () => {
      const res = await request(app)
        .get('/api/governance/reports/export?format=csv&reportType=executive_summary');

      expect(res.status).toBe(401);
      expect(res.body.message).toContain('Authentication required');
    });

    test('Citizen role report export request must be rejected with 403', async () => {
      const res = await request(app)
        .get('/api/governance/reports/export?format=csv&reportType=executive_summary')
        .set('Authorization', `Bearer ${citizenToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('8. Report History & Scheduling', () => {
    test('Admin should retrieve report generation history', async () => {
      const res = await request(app)
        .get('/api/governance/reports/history')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const data = res.body.data || res.body;
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThanOrEqual(1);
    });

    test('Admin should schedule a recurring report', async () => {
      const res = await request(app)
        .post('/api/governance/reports/schedule')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Weekly Executive Health Audit',
          reportType: 'executive_summary',
          frequency: 'weekly',
          recipientEmail: 'commissioner@chandigarh.gov.in',
          filters: { timeframe: '7d' }
        });

      expect(res.status).toBe(201);
      const data = res.body.data || res.body.schedule || res.body;
      expect(data).toBeDefined();
      expect(data.title || res.body.schedule.title).toBe('Weekly Executive Health Audit');
    });
  });

  describe('9. AI Executive Summary (Grounded Numbers)', () => {
    test('Admin should generate AI Executive Brief with grounded PostgreSQL metrics', async () => {
      const res = await request(app)
        .post('/api/governance/ai-executive-summary')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ timeframe: '30d' });

      expect(res.status).toBe(200);
      const data = res.body.data || res.body;
      expect(data).toHaveProperty('summary');
      expect(data).toHaveProperty('verifiedKpis');
      expect(data.verifiedKpis.total).toBeGreaterThanOrEqual(2);
      expect(typeof data.summary).toBe('string');
      expect(data.summary.length).toBeGreaterThan(50);
    });
  });

  describe('10. Category & Priority Intelligence Analytics', () => {
    test('Admin should retrieve category performance analytics', async () => {
      const res = await request(app)
        .get('/api/governance/categories?timeframe=30d')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const data = res.body.data || res.body;
      expect(Array.isArray(data)).toBe(true);
      if (data.length > 0) {
        expect(data[0]).toHaveProperty('category');
        expect(data[0]).toHaveProperty('resolutionRate');
        expect(data[0]).toHaveProperty('slaCompliance');
      }
    });

    test('Admin should retrieve priority distribution and analytics', async () => {
      const res = await request(app)
        .get('/api/governance/priorities?timeframe=30d')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const data = res.body.data || res.body;
      expect(Array.isArray(data)).toBe(true);
    });

    test('Admin should retrieve operations lifecycle trends', async () => {
      const res = await request(app)
        .get('/api/governance/trends?timeframe=30d')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const data = res.body.data || res.body;
      expect(Array.isArray(data)).toBe(true);
      if (data.length > 0) {
        expect(data[0]).toHaveProperty('submitted');
        expect(data[0]).toHaveProperty('resolved');
      }
    });
  });

  describe('11. Critical Operations & Accountability Timeline', () => {
    test('Admin should retrieve critical operations backlog', async () => {
      const res = await request(app)
        .get('/api/governance/critical-ops')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const data = res.body.data || res.body;
      expect(data).toHaveProperty('criticalCases');
      expect(data).toHaveProperty('totalCriticalActive');
      expect(Array.isArray(data.criticalCases)).toBe(true);
    });

    test('Admin should retrieve audit log analytics', async () => {
      const res = await request(app)
        .get('/api/governance/audit?limit=10')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const data = res.body.data || res.body;
      expect(data).toHaveProperty('logs');
      expect(data).toHaveProperty('total');
      expect(Array.isArray(data.logs)).toBe(true);
    });
  });

  describe('12. Direct PostgreSQL Data Consistency Verification', () => {
    test('Executive KPIs from API must match direct SQL query results exactly', async () => {
      const apiRes = await request(app)
        .get('/api/governance/executive-kpis?timeframe=all')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(apiRes.status).toBe(200);
      const apiKpis = apiRes.body.data || apiRes.body;

      const directRes = await db.query(`
        SELECT
          COUNT(*)::int AS total,
          COUNT(CASE WHEN status = 'open' THEN 1 END)::int AS open,
          COUNT(CASE WHEN status = 'resolved' THEN 1 END)::int AS resolved,
          COUNT(CASE WHEN status = 'closed' THEN 1 END)::int AS closed
        FROM complaints;
      `);

      const sqlRow = directRes.rows[0];
      expect(apiKpis.total).toBe(sqlRow.total);
      expect(apiKpis.open).toBe(sqlRow.open);
      expect(apiKpis.resolved).toBe(sqlRow.resolved);
      expect(apiKpis.closed).toBe(sqlRow.closed);
    });
  });

  describe('13. RBAC Security — Only Admin Allowed', () => {
    test('Citizen should receive 403 Forbidden on governance endpoints', async () => {
      const res = await request(app)
        .get('/api/governance/executive-kpis')
        .set('Authorization', `Bearer ${citizenToken}`);

      expect(res.status).toBe(403);
    });

    test('Officer should receive 403 Forbidden on governance endpoints', async () => {
      const res = await request(app)
        .get('/api/governance/executive-kpis')
        .set('Authorization', `Bearer ${officerToken}`);

      expect(res.status).toBe(403);
    });

    test('Unauthenticated user should receive 401 Unauthorized', async () => {
      const res = await request(app).get('/api/governance/executive-kpis');
      expect(res.status).toBe(401);
    });
  });
});
