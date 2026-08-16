const request = require('supertest');
const app = require('../app');
const db = require('../config/db');

jest.setTimeout(60000);

describe('PHASE 7 — Citizen Engagement, Trust, Community Intelligence & Contribution Suite', () => {
  let citizenToken, citizenId, citizenEmail;
  let citizenTokenB, citizenIdB, citizenEmailB;
  let officerToken, officerId;
  let adminToken;
  let testComplaintId;
  let testCommentId;

  const timestamp = Date.now();

  beforeAll(async () => {
    const passHash = require('bcrypt').hashSync('Password123!', 10);

    // 1. Register Citizen A
    citizenEmail = `phase7_cit_a_${timestamp}@example.com`;
    const uARes = await db.query(
      `INSERT INTO users (name, email, password, role, is_verified, status, created_at)
       VALUES ($1, $2, $3, 'citizen', true, 'active', now()) RETURNING id`,
      ['Ananya Sharma', citizenEmail, passHash]
    );
    citizenId = uARes.rows[0].id;

    const loginA = await request(app)
      .post('/api/auth/login')
      .send({ email: citizenEmail, password: 'Password123!' });
    citizenToken = loginA.body.accessToken;

    // 2. Register Citizen B
    citizenEmailB = `phase7_cit_b_${timestamp}@example.com`;
    const uBRes = await db.query(
      `INSERT INTO users (name, email, password, role, is_verified, status, created_at)
       VALUES ($1, $2, $3, 'citizen', true, 'active', now()) RETURNING id`,
      ['Rohan Verma', citizenEmailB, passHash]
    );
    citizenIdB = uBRes.rows[0].id;

    const loginB = await request(app)
      .post('/api/auth/login')
      .send({ email: citizenEmailB, password: 'Password123!' });
    citizenTokenB = loginB.body.accessToken;

    // 3. Register & Approve Officer
    const offEmail = `phase7_off_${timestamp}@example.com`;
    const uOffRes = await db.query(
      `INSERT INTO users (name, email, password, role, is_verified, status, department_id, designation, jurisdiction, created_at)
       VALUES ($1, $2, $3, 'officer', true, 'active', 1, 'Junior Engineer', 'Zone 1', now()) RETURNING id`,
      ['Officer Vikram', offEmail, passHash]
    );
    officerId = uOffRes.rows[0].id;

    const offLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: offEmail, password: 'Password123!' });
    officerToken = offLogin.body.accessToken;

    // 4. Admin User
    const adminEmail = `phase7_admin_${timestamp}@example.com`;
    await db.query(
      `INSERT INTO users (name, email, password, role, is_verified, status, created_at)
       VALUES ($1, $2, $3, 'admin', true, 'active', now()) RETURNING id`,
      ['Phase7 Admin', adminEmail, passHash]
    );
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: adminEmail, password: 'Password123!' });
    adminToken = adminLogin.body.accessToken;
  });

  afterAll(async () => {
    // Clean up test data
    try {
      if (citizenId) {
        await db.query('DELETE FROM users WHERE id IN ($1, $2, $3)', [citizenId, citizenIdB, officerId]);
      }
    } catch (e) {}
  });

  describe('1. Citizen Complaint Submission & Contribution Points', () => {
    it('allows Citizen A to submit a complaint and awards +10 contribution points', async () => {
      const res = await request(app)
        .post('/api/complaints')
        .set('Authorization', `Bearer ${citizenToken}`)
        .field('title', 'Hazardous deep pothole near Sector 17 main market')
        .field('description', 'A severe 2-foot wide pothole causing traffic obstruction and bike accidents.')
        .field('category', 'Roads')
        .field('priority', 'high')
        .field('location', JSON.stringify({ lat: 30.7333, lng: 76.7794 }))
        .field('address', 'Sector 17, Chandigarh');

      expect(res.status).toBe(201);
      expect(res.body.id || res.body.data?.id).toBeDefined();
      testComplaintId = res.body.id || res.body.data?.id;

      // Verify contribution points event in PostgreSQL
      const contribEvents = await db.query(
        "SELECT * FROM citizen_contribution_events WHERE user_id = $1 AND event_type = 'REPORT_SUBMITTED' AND reference_id = $2",
        [citizenId, testComplaintId]
      );
      expect(contribEvents.rows.length).toBe(1);
      expect(contribEvents.rows[0].points).toBe(10);
    });

    it('returns accurate, personalized Citizen Dashboard metrics from PostgreSQL', async () => {
      const res = await request(app)
        .get('/api/citizen/dashboard')
        .set('Authorization', `Bearer ${citizenToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.stats).toBeDefined();
      expect(res.body.data.stats.total).toBeGreaterThanOrEqual(1);
      expect(res.body.data.contribution).toBeDefined();
      expect(res.body.data.contribution.totalPoints).toBeGreaterThanOrEqual(10);
      expect(res.body.data.contribution.currentLevel).toBeDefined();
    });
  });

  describe('2. Community Support (Upvotes) & Duplicate Protection', () => {
    it('allows Citizen B to support Citizen A complaint (+1 point each)', async () => {
      const res = await request(app)
        .post(`/api/complaints/${testComplaintId}/vote`)
        .set('Authorization', `Bearer ${citizenTokenB}`);

      expect(res.status).toBe(200);
      expect(res.body.hasVoted ?? res.body.data?.hasVoted).toBe(true);
      expect(res.body.count ?? res.body.data?.count).toBe(1);

      // Verify voter points
      const voterPts = await db.query(
        "SELECT * FROM citizen_contribution_events WHERE user_id = $1 AND event_type = 'COMMUNITY_SUPPORT_GIVEN' AND reference_id = $2",
        [citizenIdB, testComplaintId]
      );
      expect(voterPts.rows.length).toBe(1);
      expect(voterPts.rows[0].points).toBe(1);

      // Verify author received points
      const authorPts = await db.query(
        "SELECT * FROM citizen_contribution_events WHERE user_id = $1 AND event_type = 'COMMUNITY_SUPPORT_RECEIVED' AND reference_id = $2",
        [citizenId, testComplaintId]
      );
      expect(authorPts.rows.length).toBe(1);
      expect(authorPts.rows[0].points).toBe(1);
    });

    it('toggles vote when Citizen B clicks support again', async () => {
      const res = await request(app)
        .post(`/api/complaints/${testComplaintId}/vote`)
        .set('Authorization', `Bearer ${citizenTokenB}`);

      expect(res.status).toBe(200);
      expect(res.body.hasVoted ?? res.body.data?.hasVoted).toBe(false);
      expect(res.body.count ?? res.body.data?.count).toBe(0);

      // Re-enable vote for further tests
      await request(app)
        .post(`/api/complaints/${testComplaintId}/vote`)
        .set('Authorization', `Bearer ${citizenTokenB}`);
    });
  });

  describe('3. Follow / Bookmark System', () => {
    it('allows Citizen B to follow Citizen A complaint', async () => {
      const res = await request(app)
        .post(`/api/complaints/${testComplaintId}/follow`)
        .set('Authorization', `Bearer ${citizenTokenB}`);

      expect(res.status).toBe(200);
      expect(res.body.isFollowing ?? res.body.data?.isFollowing).toBe(true);

      const followedList = await request(app)
        .get('/api/citizen/followed')
        .set('Authorization', `Bearer ${citizenTokenB}`);

      expect(followedList.status).toBe(200);
      const items = followedList.body.items || followedList.body.data?.items || [];
      expect(items.some(x => x.id === testComplaintId)).toBe(true);
    });
  });

  describe('4. Comments, Sanitization & Moderation Reporting', () => {
    it('allows Citizen B to add a comment with HTML sanitization & earns +2 points', async () => {
      const maliciousComment = '<script>alert("xss")</script>Confirmed this pothole! Please repair soon.';
      const res = await request(app)
        .post(`/api/complaints/${testComplaintId}/comments`)
        .set('Authorization', `Bearer ${citizenTokenB}`)
        .send({ comment: maliciousComment, isAnonymous: false });

      expect(res.status).toBe(201);
      const commentData = res.body.data || res.body;
      expect(commentData.comment).not.toContain('<script>');
      expect(commentData.comment).toContain('Confirmed this pothole!');
      testCommentId = commentData.id;

      // Verify points
      const commentPts = await db.query(
        "SELECT * FROM citizen_contribution_events WHERE user_id = $1 AND event_type = 'CONSTRUCTIVE_COMMENT' AND reference_id = $2",
        [citizenIdB, testCommentId]
      );
      expect(commentPts.rows.length).toBe(1);
      expect(commentPts.rows[0].points).toBe(2);
    });

    it('rejects empty or overly long comments', async () => {
      const emptyRes = await request(app)
        .post(`/api/complaints/${testComplaintId}/comments`)
        .set('Authorization', `Bearer ${citizenTokenB}`)
        .send({ comment: ' ' });

      expect(emptyRes.status).toBe(400);

      const longText = 'A'.repeat(1005);
      const longRes = await request(app)
        .post(`/api/complaints/${testComplaintId}/comments`)
        .set('Authorization', `Bearer ${citizenTokenB}`)
        .send({ comment: longText });

      expect(longRes.status).toBe(400);
    });

    it('allows Citizen A to flag an inappropriate comment for moderation', async () => {
      const res = await request(app)
        .post(`/api/complaints/comments/${testCommentId}/report`)
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({ reason: 'Spam or irrelevant text' });

      expect(res.status).toBe(201);

      const reportDb = await db.query('SELECT * FROM comment_reports WHERE comment_id=$1', [testCommentId]);
      expect(reportDb.rows.length).toBe(1);
      expect(reportDb.rows[0].status).toBe('pending');
    });
  });

  describe('5. Resolution Verification & Reopening Workflow', () => {
    beforeAll(async () => {
      // Transition complaint to resolved for testing verification
      await db.query("UPDATE complaints SET status='resolved', resolution_at=now() WHERE id=$1", [testComplaintId]);
    });

    it('prevents Citizen B from verifying Citizen A complaint (RBAC ownership)', async () => {
      const res = await request(app)
        .post(`/api/complaints/${testComplaintId}/verify-resolution`)
        .set('Authorization', `Bearer ${citizenTokenB}`)
        .send({ satisfied: true });

      expect(res.status).toBe(403);
    });

    it('requires valid reason when requesting reopening (satisfied=false)', async () => {
      const res = await request(app)
        .post(`/api/complaints/${testComplaintId}/verify-resolution`)
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({ satisfied: false, reason: '' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('reason');
    });

    it('allows Citizen A to request reopening with reason and creates reopening ledger entry', async () => {
      const res = await request(app)
        .post(`/api/complaints/${testComplaintId}/verify-resolution`)
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({ satisfied: false, reason: 'Pothole patch broke again after rain today.' });

      expect(res.status).toBe(200);

      // Verify status changed to reopened
      const cRes = await db.query('SELECT status FROM complaints WHERE id=$1', [testComplaintId]);
      expect(cRes.rows[0].status).toBe('reopened');

      // Verify complaint_reopenings ledger
      const reopenLedger = await db.query('SELECT * FROM complaint_reopenings WHERE complaint_id=$1', [testComplaintId]);
      expect(reopenLedger.rows.length).toBe(1);
      expect(reopenLedger.rows[0].reason).toContain('Pothole patch broke again');
    });

    it('allows Citizen A to confirm resolution (satisfied=true) -> closes complaint and awards +5 points', async () => {
      // Transition back to resolved
      await db.query("UPDATE complaints SET status='resolved', resolution_at=now() WHERE id=$1", [testComplaintId]);

      const res = await request(app)
        .post(`/api/complaints/${testComplaintId}/verify-resolution`)
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({ satisfied: true, note: 'Work verified and satisfied.' });

      expect(res.status).toBe(200);

      const cRes = await db.query('SELECT status FROM complaints WHERE id=$1', [testComplaintId]);
      expect(cRes.rows[0].status).toBe('closed');

      // Verify resolution verified contribution points
      const verPts = await db.query(
        "SELECT * FROM citizen_contribution_events WHERE user_id = $1 AND event_type = 'RESOLUTION_VERIFIED' AND reference_id = $2",
        [citizenId, testComplaintId]
      );
      expect(verPts.rows.length).toBe(1);
      expect(verPts.rows[0].points).toBe(5);
    });
  });

  describe('6. PostGIS Nearby Spatial Radius Query', () => {
    it('returns nearby complaints within specified radius (1000m)', async () => {
      const res = await request(app)
        .get('/api/complaints/nearby')
        .query({
          lat: 30.7333,
          lng: 76.7794,
          radius: 1000
        });

      expect(res.status).toBe(200);
      const list = Array.isArray(res.body) ? res.body : (res.body.data || res.body.items || []);
      expect(Array.isArray(list)).toBe(true);
      expect(list.some(c => c.id === testComplaintId)).toBe(true);
    });
  });

  describe('7. Community Pulse & Privacy-Safe Leaderboard', () => {
    it('returns live community pulse aggregates without fake values', async () => {
      const res = await request(app).get('/api/citizen/community-pulse');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.mostSupported).toBeDefined();
      expect(res.body.data.categoryTrends).toBeDefined();
      expect(res.body.data.transparency).toBeDefined();
      expect(res.body.data.transparency.total_reports).toBeGreaterThanOrEqual(1);
    });

    it('returns privacy-safe citizen leaderboard without exposing private emails or phones', async () => {
      const res = await request(app).get('/api/citizen/leaderboard');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      
      const leader = res.body.data[0];
      if (leader) {
        expect(leader.displayName).toBeDefined();
        expect(leader.totalPoints).toBeGreaterThanOrEqual(0);
        expect(leader.levelName).toBeDefined();
        // Zero private info leakage
        expect(leader.email).toBeUndefined();
        expect(leader.phone).toBeUndefined();
      }
    });
  });

  describe('8. Notification & Privacy Preferences Persistence', () => {
    it('persists notification preferences and privacy settings in PostgreSQL', async () => {
      const updateRes = await request(app)
        .patch('/api/citizen/preferences')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({
          notifications: {
            email_complaint_updates: true,
            email_followed_updates: false,
            email_community_activity: true
          },
          privacy: {
            publicNickname: 'CivicHero_30',
            anonymousLeaderboard: false
          },
          language: 'hi'
        });

      expect(updateRes.status).toBe(200);

      const getRes = await request(app)
        .get('/api/citizen/preferences')
        .set('Authorization', `Bearer ${citizenToken}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.data.notifications.email_followed_updates).toBe(false);
      expect(getRes.body.data.privacy.publicNickname).toBe('CivicHero_30');
      expect(getRes.body.data.language).toBe('hi');
    });
  });

  describe('9. Security & Role Isolation', () => {
    it('blocks unauthenticated requests to citizen dashboard with 401', async () => {
      const res = await request(app).get('/api/citizen/dashboard');
      expect(res.status).toBe(401);
    });

    it('blocks citizen from accessing admin user management (403)', async () => {
      const res = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${citizenToken}`);
      expect(res.status).toBe(403);
    });

    it('blocks citizen from accessing officer assignments (403)', async () => {
      const res = await request(app)
        .get('/api/officer/assignments')
        .set('Authorization', `Bearer ${citizenToken}`);
      expect(res.status).toBe(403);
    });
  });
});
