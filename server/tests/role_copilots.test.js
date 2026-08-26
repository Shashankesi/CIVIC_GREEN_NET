const request = require('supertest');
const app = require('../app');
const db = require('../config/db');
const tokenService = require('../services/tokenService');
const { calculateComplaintPriority } = require('../services/ai/aiTools');
const { processCitizenChat } = require('../services/ai/citizenCopilot');
const { processOfficerChat } = require('../services/ai/officerCopilot');
const { processAdminChat } = require('../services/ai/adminCopilot');
const { formatCitizenFallback, formatOfficerFallback, formatAdminFallback } = require('../services/ai/aiResponseFormatter');

jest.setTimeout(35000);

describe('Role-Separated Production-Hardened AI Copilots', () => {
  let citizen1Token, citizen2Token, officerToken, adminToken;
  let citizen1Id, citizen2Id, officerId, adminId;
  let complaint1Id, complaint2Id, officerComplaintId;

  beforeAll(async () => {
    const passHash = require('bcrypt').hashSync('Password123!', 10);
    const suffix = Date.now();

    // 1. Create Citizen 1
    const c1 = await db.query(
      `INSERT INTO users (name, email, password, role, is_verified, status, created_at)
       VALUES ($1, $2, $3, 'citizen', true, 'active', now()) RETURNING id`,
      ['Citizen One', `c1_${suffix}@example.com`, passHash]
    );
    citizen1Id = c1.rows[0].id;

    // 2. Create Citizen 2
    const c2 = await db.query(
      `INSERT INTO users (name, email, password, role, is_verified, status, created_at)
       VALUES ($1, $2, $3, 'citizen', true, 'active', now()) RETURNING id`,
      ['Citizen Two', `c2_${suffix}@example.com`, passHash]
    );
    citizen2Id = c2.rows[0].id;

    // 3. Create Officer
    const off = await db.query(
      `INSERT INTO users (name, email, password, role, is_verified, status, created_at)
       VALUES ($1, $2, $3, 'officer', true, 'active', now()) RETURNING id`,
      ['Officer Demo', `off_${suffix}@example.com`, passHash]
    );
    officerId = off.rows[0].id;

    // 4. Create Admin
    const adm = await db.query(
      `INSERT INTO users (name, email, password, role, is_verified, status, created_at)
       VALUES ($1, $2, $3, 'admin', true, 'active', now()) RETURNING id`,
      ['Admin Demo', `adm_${suffix}@example.com`, passHash]
    );
    adminId = adm.rows[0].id;

    // Generate JWT tokens
    citizen1Token = tokenService.generateAccessToken({ userId: citizen1Id, role: 'citizen' });
    citizen2Token = tokenService.generateAccessToken({ userId: citizen2Id, role: 'citizen' });
    officerToken = tokenService.generateAccessToken({ userId: officerId, role: 'officer' });
    adminToken = tokenService.generateAccessToken({ userId: adminId, role: 'admin' });

    // Seed Complaints
    const comp1 = await db.query(
      `INSERT INTO complaints (user_id, title, description, category, priority, severity, status, address, sla_due_at, created_at)
       VALUES ($1, 'Pothole on 5th Main', 'Deep pothole causing traffic jam', 'roads', 'high', 'major', 'in_progress', '5th Main Road', now() + INTERVAL '20 hours', now() - INTERVAL '2 days')
       RETURNING id`,
      [citizen1Id]
    );
    complaint1Id = comp1.rows[0].id;

    const comp2 = await db.query(
      `INSERT INTO complaints (user_id, title, description, category, priority, severity, status, address, sla_due_at, created_at)
       VALUES ($1, 'Streetlight broken', 'Lamp pole 12 is dark', 'lighting', 'medium', 'moderate', 'open', '7th Cross', now() + INTERVAL '40 hours', now() - INTERVAL '1 day')
       RETURNING id`,
      [citizen1Id]
    );
    complaint2Id = comp2.rows[0].id;

    const offComp = await db.query(
      `INSERT INTO complaints (user_id, officer_id, title, description, category, priority, severity, status, address, sla_due_at, created_at)
       VALUES ($1, $2, 'Water main leak', 'Urgent water gushing from pipeline', 'utilities', 'critical', 'critical', 'assigned', 'MG Road', now() - INTERVAL '2 hours', now() - INTERVAL '12 hours')
       RETURNING id`,
      [citizen2Id, officerId]
    );
    officerComplaintId = offComp.rows[0].id;
  });

  afterAll(async () => {
    if (db._pool) {
      await db.query('DELETE FROM ai_messages WHERE conversation_id IN (SELECT id FROM ai_conversations WHERE user_id IN ($1, $2, $3, $4))', [citizen1Id, citizen2Id, officerId, adminId]);
      await db.query('DELETE FROM ai_conversations WHERE user_id IN ($1, $2, $3, $4)', [citizen1Id, citizen2Id, officerId, adminId]);
      await db.query('DELETE FROM complaints WHERE id IN ($1, $2, $3)', [complaint1Id, complaint2Id, officerComplaintId]);
      await db.query('DELETE FROM users WHERE id IN ($1, $2, $3, $4)', [citizen1Id, citizen2Id, officerId, adminId]);
    }
  });

  // ============================================================
  // 1. DETERMINISTIC PRIORITY SCORING TESTS
  // ============================================================
  describe('Deterministic Priority Scoring', () => {
    test('calculateComplaintPriority correctly prioritizes critical overdue cases', () => {
      const criticalOverdue = {
        id: 101,
        title: 'Burst pipe',
        category: 'utilities',
        priority: 'critical',
        severity: 'critical',
        status: 'assigned',
        sla_due_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        created_at: new Date(Date.now() - 86400000).toISOString()
      };

      const minorFresh = {
        id: 102,
        title: 'Tree branch pruning',
        category: 'parks',
        priority: 'low',
        severity: 'minor',
        status: 'open',
        sla_due_at: new Date(Date.now() + 86400000 * 3).toISOString(), // 3 days ahead
        created_at: new Date().toISOString()
      };

      const scoredCrit = calculateComplaintPriority(criticalOverdue);
      const scoredMinor = calculateComplaintPriority(minorFresh);

      expect(scoredCrit.score).toBeGreaterThan(scoredMinor.score);
      expect(scoredCrit.isOverdue).toBe(true);
      expect(scoredCrit.slaRisk).toBe('breached');
      expect(scoredCrit.reasons.length).toBeGreaterThan(0);
    });
  });

  // ============================================================
  // 2. CITIZEN COPILOT TESTS
  // ============================================================
  describe('Citizen Copilot', () => {
    test('Citizen can retrieve own complaints via POST /api/ai/citizen/chat', async () => {
      const res = await request(app)
        .post('/api/ai/citizen/chat')
        .set('Authorization', `Bearer ${citizen1Token}`)
        .send({ message: 'Show my unresolved complaints' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.assistantMessage).toBeDefined();
      expect(res.body.data.assistantMessage.content).toBeTruthy();
      // Should mention at least one of their real complaints
      const content = res.body.data.assistantMessage.content;
      expect(content.toLowerCase()).not.toContain('analyzing live municipal records. please try asking');
    });

    test('Citizen receives accurate data when querying points/rank', async () => {
      const res = await request(app)
        .post('/api/ai/citizen/chat')
        .set('Authorization', `Bearer ${citizen1Token}`)
        .send({ message: 'How many points do I have and what is my civic rank?' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const content = res.body.data.assistantMessage.content;
      expect(content).toMatch(/point/i);
    });

    test('Citizen Copilot Level 2 Deterministic Fallback formats real database records cleanly', () => {
      const mockDbComplaints = [
        {
          id: 'CGN-01024',
          rawId: 1024,
          title: 'Road damage on Ring Road',
          category: 'roads',
          status: 'in_progress',
          priority: 'high',
          created_at: new Date().toISOString()
        }
      ];

      const fallback = formatCitizenFallback('MY_COMPLAINTS', mockDbComplaints, 'My complaints');
      expect(fallback.answer).toContain('CGN-01024');
      expect(fallback.answer).toContain('Road damage on Ring Road');
      expect(fallback.summary).toContain('1 active complaints');
      expect(fallback.intent).toBe('MY_COMPLAINTS');
    });
  });

  // ============================================================
  // 3. OFFICER COPILOT TESTS
  // ============================================================
  describe('Officer Copilot', () => {
    test('Officer can retrieve priority cases via POST /api/ai/officer/chat', async () => {
      const res = await request(app)
        .post('/api/ai/officer/chat')
        .set('Authorization', `Bearer ${officerToken}`)
        .send({ message: 'What should I handle first?' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.assistantMessage).toBeDefined();
      const content = res.body.data.assistantMessage.content;
      expect(content).toBeTruthy();
      expect(content.toLowerCase()).not.toContain('analyzing live municipal records. please try asking');
    });

    test('Officer can retrieve SLA risks', async () => {
      const res = await request(app)
        .post('/api/ai/officer/chat')
        .set('Authorization', `Bearer ${officerToken}`)
        .send({ message: 'Which of my complaints are close to SLA breach?' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.assistantMessage.content).toBeTruthy();
    });

    test('Officer Copilot Level 2 Deterministic Fallback formats priority ranking', () => {
      const mockPriorityCases = [
        {
          id: 'CGN-01042',
          rawId: 1042,
          title: 'Water supply pipeline burst',
          severity: 'critical',
          priority: 'critical',
          score: 85,
          isOverdue: true,
          hoursOverdue: 3,
          reasons: ['Critical severity', 'SLA breached']
        }
      ];

      const fallback = formatOfficerFallback('MY_PRIORITY_CASES', mockPriorityCases, 'What should I handle first?');
      expect(fallback.answer).toContain('CGN-01042');
      expect(fallback.answer).toContain('Water supply pipeline burst');
      expect(fallback.answer).toContain('85 pts');
      expect(fallback.recommendations.length).toBeGreaterThan(0);
    });
  });

  // ============================================================
  // 4. ADMIN GOVERNANCE COPILOT TESTS
  // ============================================================
  describe('Admin Governance Copilot', () => {
    test('Admin can query operational summary via POST /api/ai/admin/chat', async () => {
      const res = await request(app)
        .post('/api/ai/admin/chat')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ message: 'What needs attention today?' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.assistantMessage.content).toBeTruthy();
      const content = res.body.data.assistantMessage.content;
      expect(content.toLowerCase()).not.toContain('analyzing live municipal records. please try asking');
    });

    test('Admin can query department workload', async () => {
      const res = await request(app)
        .post('/api/ai/admin/chat')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ message: 'Which departments have the highest active workload?' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.assistantMessage.content).toBeTruthy();
    });

    test('Admin Copilot Level 2 Deterministic Fallback formats SLA breaches', () => {
      const mockBreaches = {
        totalBreaches: 2,
        breaches: [
          {
            id: 'CGN-00099',
            title: 'Overflowing drain',
            category: 'drainage',
            hoursOverdue: 5,
            department_name: 'Water Works'
          }
        ]
      };

      const fallback = formatAdminFallback('SLA_BREACHES', mockBreaches, 'Show SLA breaches');
      expect(fallback.answer).toContain('CGN-00099');
      expect(fallback.answer).toContain('Overflowing drain');
      expect(fallback.answer).toContain('5 hour(s)');
      expect(fallback.summary).toContain('2 SLA breaches');
    });
  });

  // ============================================================
  // 5. SECURITY & CROSS-ROLE AUTHORIZATION TESTS
  // ============================================================
  describe('Cross-Role RBAC Security Enforcement', () => {
    test('Citizen attempting to access Admin Copilot endpoint is blocked with 403', async () => {
      const res = await request(app)
        .post('/api/ai/admin/chat')
        .set('Authorization', `Bearer ${citizen1Token}`)
        .send({ message: 'Give me city wide metrics' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    test('Citizen attempting to access Officer Copilot endpoint is blocked with 403', async () => {
      const res = await request(app)
        .post('/api/ai/officer/chat')
        .set('Authorization', `Bearer ${citizen1Token}`)
        .send({ message: 'What should I handle first?' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    test('Officer attempting to access Admin Copilot endpoint is blocked with 403', async () => {
      const res = await request(app)
        .post('/api/ai/admin/chat')
        .set('Authorization', `Bearer ${officerToken}`)
        .send({ message: 'What needs attention today?' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    test('Unauthenticated user receives 401 on copilot endpoints', async () => {
      const res = await request(app)
        .post('/api/ai/citizen/chat')
        .send({ message: 'Show complaints' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    test('Legacy /api/ai/chat strictly routes by authenticated JWT role and ignores body.role', async () => {
      const res = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${citizen1Token}`)
        .send({ message: 'Show my complaints', role: 'admin' }); // Malicious role spoof in body

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      // The backend should have processed it as a citizen, NOT an admin
      expect(res.body.data.assistantMessage.intent).not.toBe('ADMIN_OPERATIONS');
    });
  });
});
