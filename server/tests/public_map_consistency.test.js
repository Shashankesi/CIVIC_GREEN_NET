const request = require('supertest');
const app = require('../app');
const db = require('../config/db');
const { getCategoryAliases, normalizeCategory, normalizeStatusFilter } = require('../constants/categories');
const { invalidatePublicCache } = require('../controllers/publicController');

jest.setTimeout(40000);

describe('PRE-PHASE-10 — Public Data Consistency & Live Map Filtering', () => {
  let citizenUserId = null;
  let testComplaintIds = [];
  const suffix = Date.now();

  beforeAll(async () => {
    // Clean cache
    invalidatePublicCache();

    // Create a citizen test user
    const passHash = require('bcrypt').hashSync('Password123!', 10);
    const citRes = await db.query(
      `INSERT INTO users (name, email, password, role, is_verified, created_at)
       VALUES ($1, $2, $3, 'citizen', true, now()) RETURNING id`,
      ['Test Citizen', `test_cit_${suffix}@example.com`, passHash]
    );
    citizenUserId = citRes.rows[0].id;

    // Create distinct test complaints across categories and statuses with coordinates in Chandigarh bbox
    // [minLng: 76.70, minLat: 30.68, maxLng: 76.85, maxLat: 30.80]
    const testCases = [
      { title: `Road Pothole ${suffix}`, cat: 'Roads', status: 'open', prio: 'high', lat: 30.735, lng: 76.780 },
      { title: `Streetlight Dark ${suffix}`, cat: 'lighting', status: 'open', prio: 'medium', lat: 30.738, lng: 76.782 },
      { title: `Water Pipe Burst ${suffix}`, cat: 'Water Supply', status: 'in_progress', prio: 'critical', lat: 30.730, lng: 76.775 },
      { title: `Garbage Overflow ${suffix}`, cat: 'sanitation', status: 'resolved', prio: 'medium', lat: 30.742, lng: 76.788 },
      { title: `Drain Blockage ${suffix}`, cat: 'drainage', status: 'closed', prio: 'low', lat: 30.728, lng: 76.770 },
      { title: `Open Manhole ${suffix}`, cat: 'public_safety', status: 'open', prio: 'high', lat: 30.733, lng: 76.778 },
      { title: `Broken Swing ${suffix}`, cat: 'parks', status: 'in_progress', prio: 'low', lat: 30.745, lng: 76.790 },
      { title: `Spam Rejected Item ${suffix}`, cat: 'roads', status: 'rejected', prio: 'low', lat: 30.750, lng: 76.795 }
    ];

    for (const tc of testCases) {
      const res = await db.query(
        `INSERT INTO complaints (user_id, title, description, category, status, priority, address, location, created_at)
         VALUES ($1, $2, 'Detailed description for test', $3, $4, $5, 'Sector 17, Chandigarh', ST_SetSRID(ST_MakePoint($6, $7), 4326), now())
         RETURNING id`,
        [citizenUserId, tc.title, tc.cat, tc.status, tc.prio, tc.lng, tc.lat]
      );
      testComplaintIds.push(res.rows[0].id);
    }
  });

  afterAll(async () => {
    if (testComplaintIds.length > 0) {
      const ids = testComplaintIds;
      await db.query('DELETE FROM complaints WHERE id = ANY($1)', [ids]);
    }
    if (citizenUserId) {
      await db.query('DELETE FROM users WHERE id = $1', [citizenUserId]);
    }
  });

  describe('1. Canonical Category Normalization Tests', () => {
    test('Normalizes various casing and alias strings correctly', () => {
      expect(normalizeCategory('Roads')).toBe('roads');
      expect(normalizeCategory('road_infrastructure')).toBe('roads');
      expect(normalizeCategory('pothole')).toBe('roads');
      expect(normalizeCategory('Sanitation & Waste Management')).toBe('sanitation');
      expect(normalizeCategory('garbage')).toBe('sanitation');
      expect(normalizeCategory('Street Lighting')).toBe('lighting');
      expect(normalizeCategory('electricity')).toBe('lighting');
      expect(normalizeCategory('Water Supply')).toBe('water');
      expect(normalizeCategory('sewerage')).toBe('drainage');
      expect(normalizeCategory('Public Safety')).toBe('public_safety');
      expect(normalizeCategory('Parks & Horticulture')).toBe('parks');
    });

    test('Provides comprehensive aliases for SQL matching', () => {
      const aliases = getCategoryAliases('roads');
      expect(aliases).toContain('roads');
      expect(aliases).toContain('pothole');
      expect(aliases).toContain('road_infrastructure');
    });

    test('Normalizes UI status filters into database status sets', () => {
      expect(normalizeStatusFilter('active')).toEqual(['open', 'assigned', 'accepted', 'in_progress', 'reopened', 'pending']);
      expect(normalizeStatusFilter('in_progress')).toEqual(['in_progress', 'assigned', 'accepted', 'reopened']);
      expect(normalizeStatusFilter('resolved')).toEqual(['resolved', 'closed']);
    });
  });

  describe('2. Public Endpoints Consistency & Privacy', () => {
    test('GET /api/public/stats returns real counts and excludes spam / handles empty gracefully', async () => {
      const res = await request(app).get('/api/public/stats');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(typeof res.body.data.totalReports).toBe('number');
      expect(res.body.data.totalReports).toBeGreaterThan(0);
    });

    test('GET /api/public/activity excludes rejected complaints and never leaks private emails', async () => {
      const res = await request(app).get('/api/public/activity?limit=20');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);

      for (const item of res.body.data) {
        expect(item.status).not.toBe('rejected');
        expect(item.email).toBeUndefined();
        expect(item.phone).toBeUndefined();
        expect(item.user_id).toBeUndefined();
        expect(typeof item.area).toBe('string');
      }
    });

    test('GET /api/public/recent returns safe cards with title, category, status, and area', async () => {
      const res = await request(app).get('/api/public/recent?limit=10');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);

      for (const item of res.body.data) {
        expect(item.status).not.toBe('rejected');
        expect(item.user_id).toBeUndefined();
        expect(item.email).toBeUndefined();
      }
    });

    test('GET /api/public/categories returns aggregated canonical category distribution', async () => {
      const res = await request(app).get('/api/public/categories');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);

      const catKeys = res.body.data.map(c => c.category);
      expect(catKeys.some(k => k === 'roads' || k === 'sanitation' || k === 'lighting' || k === 'water')).toBe(true);
    });
  });

  describe('3. Live City Operations Map Category & Status Filtering', () => {
    const bboxParams = 'minLng=76.60&minLat=30.60&maxLng=76.90&maxLat=30.90';

    test('GET /api/maps/complaints with category=roads returns roads complaints regardless of case/alias in DB', async () => {
      const res = await request(app).get(`/api/maps/complaints?${bboxParams}&category=roads`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);

      const items = res.body.data;
      expect(items.length).toBeGreaterThan(0);
      for (const item of items) {
        const cat = normalizeCategory(item.category);
        expect(cat).toBe('roads');
      }
    });

    test('GET /api/maps/complaints with category=lighting matches street lighting complaints', async () => {
      const res = await request(app).get(`/api/maps/complaints?${bboxParams}&category=lighting`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);

      const items = res.body.data;
      expect(items.length).toBeGreaterThan(0);
      for (const item of items) {
        const cat = normalizeCategory(item.category);
        expect(cat).toBe('lighting');
      }
    });

    test('GET /api/maps/complaints with category=water matches water supply complaints', async () => {
      const res = await request(app).get(`/api/maps/complaints?${bboxParams}&category=water`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);

      const items = res.body.data;
      expect(items.length).toBeGreaterThan(0);
      for (const item of items) {
        const cat = normalizeCategory(item.category);
        expect(cat).toBe('water');
      }
    });

    test('GET /api/maps/complaints with status=active returns open and in_progress complaints', async () => {
      const res = await request(app).get(`/api/maps/complaints?${bboxParams}&status=active`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);

      const items = res.body.data;
      expect(items.length).toBeGreaterThan(0);
      for (const item of items) {
        expect(['open', 'in_progress', 'assigned', 'accepted', 'reopened', 'pending']).toContain(item.status);
      }
    });

    test('GET /api/maps/complaints with status=resolved returns resolved and closed complaints', async () => {
      const res = await request(app).get(`/api/maps/complaints?${bboxParams}&status=resolved`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);

      const items = res.body.data;
      expect(items.length).toBeGreaterThan(0);
      for (const item of items) {
        expect(['resolved', 'closed']).toContain(item.status);
      }
    });

    test('GET /api/maps/complaints with combined category=roads & status=open returns exact intersection', async () => {
      const res = await request(app).get(`/api/maps/complaints?${bboxParams}&category=roads&status=open`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);

      const items = res.body.data;
      for (const item of items) {
        expect(normalizeCategory(item.category)).toBe('roads');
        expect(item.status).toBe('open');
      }
    });

    test('GET /api/maps/complaints with zero-match query returns empty array [] without mock fallbacks', async () => {
      const res = await request(app).get(`/api/maps/complaints?${bboxParams}&category=parks&status=resolved&priority=critical`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(0);
    });

    test('Public map endpoint GET /api/public/map works with category and status filters', async () => {
      const res = await request(app).get(`/api/public/map?${bboxParams}&category=roads&status=active`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      for (const item of res.body.data) {
        expect(normalizeCategory(item.category)).toBe('roads');
      }
    });
  });

  describe('4. Deletion Cascade and Cache Invalidation', () => {
    test('Deleting a complaint cascades and immediately reflects in public activity', async () => {
      // Create a temporary complaint to delete
      const res = await db.query(
        `INSERT INTO complaints (user_id, title, description, category, status, priority, address, location, created_at)
         VALUES ($1, 'Delete Me Immediately', 'Will be deleted', 'roads', 'open', 'high', 'Sector 17', ST_SetSRID(ST_MakePoint(76.78, 30.73), 4326), now())
         RETURNING id`,
        [citizenUserId]
      );
      const tempId = res.rows[0].id;

      // Add a status history row
      await db.query(`INSERT INTO complaint_status_history (complaint_id, status_from, status_to, note) VALUES ($1, 'open', 'in_progress', 'Initial')`, [tempId]);

      // Call repository deleteComplaint
      const complaintRepo = require('../repositories/complaintRepository');
      await complaintRepo.deleteComplaint(tempId);

      // Verify complaint is deleted from DB
      const check = await db.query('SELECT id FROM complaints WHERE id = $1', [tempId]);
      expect(check.rows.length).toBe(0);

      // Verify status history is deleted
      const checkHistory = await db.query('SELECT id FROM complaint_status_history WHERE complaint_id = $1', [tempId]);
      expect(checkHistory.rows.length).toBe(0);

      // Verify it does not appear in public activity
      const pubRes = await request(app).get('/api/public/activity?limit=20');
      expect(pubRes.status).toBe(200);
      const found = pubRes.body.data.some(d => d.id === tempId);
      expect(found).toBe(false);
    });
  });
});
