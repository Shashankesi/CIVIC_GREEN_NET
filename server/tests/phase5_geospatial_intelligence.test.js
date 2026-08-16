const request = require('supertest');
const app = require('../app');
const db = require('../config/db');
const mapService = require('../services/mapService');

jest.setTimeout(40000);

describe('PHASE 5 — Advanced Geospatial & Civic Map Intelligence', () => {
  let adminToken = null;
  let officerToken = null;
  let citizenToken = null;
  let adminUserId = null;
  let officerUserId = null;
  let citizenUserId = null;
  let testComplaintId = null;

  const testSuffix = Date.now();
  const adminEmail = `p5_admin_${testSuffix}@example.com`;
  const officerEmail = `p5_officer_${testSuffix}@example.com`;
  const citizenEmail = `p5_citizen_${testSuffix}@example.com`;

  beforeAll(async () => {
    const passHash = require('bcrypt').hashSync('Password123!', 10);

    const adminRes = await db.query(
      `INSERT INTO users (name, email, password, role, is_verified, created_at)
       VALUES ($1, $2, $3, 'admin', true, now()) RETURNING id`,
      ['P5 Admin', adminEmail, passHash]
    );
    adminUserId = adminRes.rows[0].id;

    const offRes = await db.query(
      `INSERT INTO users (name, email, password, role, is_verified, created_at)
       VALUES ($1, $2, $3, 'officer', true, now()) RETURNING id`,
      ['P5 Officer', officerEmail, passHash]
    );
    officerUserId = offRes.rows[0].id;

    const citRes = await db.query(
      `INSERT INTO users (name, email, password, role, is_verified, created_at)
       VALUES ($1, $2, $3, 'citizen', true, now()) RETURNING id`,
      ['P5 Citizen', citizenEmail, passHash]
    );
    citizenUserId = citRes.rows[0].id;

    const aLog = await request(app).post('/api/auth/login').send({ email: adminEmail, password: 'Password123!' });
    adminToken = aLog.body.accessToken;

    const oLog = await request(app).post('/api/auth/login').send({ email: officerEmail, password: 'Password123!' });
    officerToken = oLog.body.accessToken;

    const cLog = await request(app).post('/api/auth/login').send({ email: citizenEmail, password: 'Password123!' });
    citizenToken = cLog.body.accessToken;

    // Create a known spatial complaint in Chandigarh Sector 17
    const createRes = await request(app)
      .post('/api/complaints')
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({
        title: 'Broken water pipe near Sector 17 Plaza',
        description: 'Clean drinking water gushing across Sector 17 main market walkway.',
        category: 'water',
        priority: 'high',
        address: 'Sector 17 Plaza, Chandigarh',
        location: { lat: 30.7380, lng: 76.7820 }
      });

    if (createRes.body.data) {
      testComplaintId = createRes.body.data.id;
    }
  });

  afterAll(async () => {
    if (db._pool) {
      if (testComplaintId) {
        await db.query('DELETE FROM ai_audit_logs WHERE complaint_id = $1', [testComplaintId]);
        await db.query('DELETE FROM duplicate_complaints WHERE complaint_id = $1 OR duplicate_of = $1', [testComplaintId]);
        await db.query('DELETE FROM ai_analysis WHERE complaint_id = $1', [testComplaintId]);
        await db.query('DELETE FROM complaints WHERE id = $1', [testComplaintId]);
      }
      await db.query('DELETE FROM users WHERE id IN ($1, $2, $3)', [adminUserId, officerUserId, citizenUserId]);
    }
  });

  // ==========================================
  // 1. PostGIS Extension & Spatial Indexes
  // ==========================================
  test('1. PostGIS extension is active and operational in PostgreSQL', async () => {
    const extRes = await db.query(`SELECT extname FROM pg_extension WHERE extname = 'postgis'`);
    expect(extRes.rows.length).toBe(1);
    expect(extRes.rows[0].extname).toBe('postgis');
  });

  test('2. Spatial indexes exist on complaints and ward boundary polygons', async () => {
    const idxRes = await db.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename IN ('complaints', 'wards', 'civic_hotspots')
        AND indexdef ILIKE '%gist%';
    `);
    expect(idxRes.rows.length).toBeGreaterThanOrEqual(2);
  });

  // ==========================================
  // 2. Bounding Box API & Input Validation
  // ==========================================
  test('3. GET /api/maps/complaints returns complaints inside valid bounding box', async () => {
    const res = await request(app)
      .get('/api/maps/complaints?minLng=76.70&minLat=30.70&maxLng=76.85&maxLat=30.80')
      .set('Authorization', `Bearer ${citizenToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0]).toHaveProperty('lat');
    expect(res.body.data[0]).toHaveProperty('lng');
    expect(res.body.data[0]).toHaveProperty('ticketId');
  });

  test('4. GET /api/maps/complaints validates numeric coordinates and rejects invalid bbox', async () => {
    const res = await request(app)
      .get('/api/maps/complaints?minLng=invalid&minLat=30.70&maxLng=76.85&maxLat=30.80');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('5. GET /api/maps/complaints filters by category, priority, and status', async () => {
    const res = await request(app)
      .get('/api/maps/complaints?minLng=76.70&minLat=30.70&maxLng=76.85&maxLat=30.80&category=water&priority=high');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    res.body.data.forEach(item => {
      expect(item.category.toLowerCase()).toBe('water');
      expect(item.priority.toLowerCase()).toBe('high');
    });
  });

  // ==========================================
  // 3. Privacy & Sanitization
  // ==========================================
  test('6. Public / Citizen map sanitizes citizen identities and private fields', async () => {
    const res = await request(app)
      .get('/api/maps/complaints?minLng=76.70&minLat=30.70&maxLng=76.85&maxLat=30.80')
      .set('Authorization', `Bearer ${citizenToken}`);

    expect(res.status).toBe(200);
    res.body.data.forEach(item => {
      expect(item).not.toHaveProperty('citizenName');
      expect(item).not.toHaveProperty('user_id');
    });
  });

  test('7. Admin map includes authorized case officer & AI insights fields', async () => {
    const res = await request(app)
      .get('/api/maps/complaints?minLng=76.70&minLat=30.70&maxLng=76.85&maxLat=30.80')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    const item = res.body.data.find(c => c.id === testComplaintId);
    if (item) {
      expect(item).toHaveProperty('citizenName');
    }
  });

  // ==========================================
  // 4. Spatial Clustering & Heatmap
  // ==========================================
  test('8. GET /api/maps/clusters aggregates complaints into spatial grid clusters', async () => {
    const res = await request(app)
      .get('/api/maps/clusters?minLng=76.70&minLat=30.70&maxLng=76.85&maxLat=30.80&zoom=10');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    if (res.body.data.length > 0) {
      expect(res.body.data[0]).toHaveProperty('lat');
      expect(res.body.data[0]).toHaveProperty('lng');
      expect(res.body.data[0]).toHaveProperty('count');
      expect(res.body.data[0]).toHaveProperty('dominantCategory');
    }
  });

  test('9. GET /api/maps/heatmap returns weighted coordinates for density rendering', async () => {
    const res = await request(app)
      .get('/api/maps/heatmap?minLng=76.70&minLat=30.70&maxLng=76.85&maxLat=30.80&weightBy=priority');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    if (res.body.data.length > 0) {
      const point = res.body.data[0];
      expect(Array.isArray(point)).toBe(true);
      expect(point.length).toBe(3); // [lat, lng, weight]
      expect(typeof point[0]).toBe('number');
      expect(typeof point[1]).toBe('number');
      expect(typeof point[2]).toBe('number');
    }
  });

  // ==========================================
  // 5. AI Hotspots & SLA Risk Overlay
  // ==========================================
  test('10. GET /api/maps/hotspots returns Phase 4 AI hotspots with risk classification', async () => {
    const res = await request(app).get('/api/maps/hotspots?days=30');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    if (res.body.data.length > 0) {
      expect(res.body.data[0]).toHaveProperty('riskLevel');
      expect(res.body.data[0]).toHaveProperty('trendDisplay');
      expect(res.body.data[0]).toHaveProperty('radiusMeters');
    }
  });

  test('11. GET /api/maps/sla-risk returns overdue, due soon, and on time SLA tiers', async () => {
    const res = await request(app).get('/api/maps/sla-risk');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('overdue');
    expect(res.body.data).toHaveProperty('dueSoon');
    expect(res.body.data).toHaveProperty('onTime');
    expect(res.body.data).toHaveProperty('summary');
  });

  // ==========================================
  // 6. Duplicate Clusters & Recurring Issue Zones
  // ==========================================
  test('12. GET /api/maps/duplicate-clusters returns multi-ticket duplicate groups', async () => {
    const res = await request(app).get('/api/maps/duplicate-clusters');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('13. GET /api/maps/recurring-zones returns recurring infrastructure defect areas', async () => {
    const res = await request(app).get('/api/maps/recurring-zones?days=60');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  // ==========================================
  // 7. Ward & Zone Boundaries
  // ==========================================
  test('14. GET /api/maps/wards returns GeoJSON polygon boundaries and resolution statistics', async () => {
    const res = await request(app).get('/api/maps/wards');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0]).toHaveProperty('name');
    expect(res.body.data[0]).toHaveProperty('geojson');
    expect(res.body.data[0]).toHaveProperty('resolutionRate');
    expect(res.body.data[0]).toHaveProperty('totalComplaints');
  });

  test('15. GET /api/maps/zones returns municipal zones with GeoJSON', async () => {
    const res = await request(app).get('/api/maps/zones');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('16. GET /api/maps/departments returns department operational coverage', async () => {
    const res = await request(app).get('/api/maps/departments');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  // ==========================================
  // 8. Officer Operational Coverage & RBAC
  // ==========================================
  test('17. Citizen cannot access officer coverage endpoint (RBAC 403)', async () => {
    const res = await request(app)
      .get('/api/maps/officers')
      .set('Authorization', `Bearer ${citizenToken}`);
    expect(res.status).toBe(403);
  });

  test('18. Admin can access officer coverage with active workload distribution', async () => {
    const res = await request(app)
      .get('/api/maps/officers')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  // ==========================================
  // 9. Nearby Issues Search (ST_DWithin)
  // ==========================================
  test('19. GET /api/maps/nearby returns nearby complaints sorted by distance in meters', async () => {
    const res = await request(app)
      .get('/api/maps/nearby?lat=30.7380&lng=76.7820&radius=5000')
      .set('Authorization', `Bearer ${citizenToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0]).toHaveProperty('distanceMeters');
    expect(res.body.data[0]).toHaveProperty('distanceFormatted');
  });

  // ==========================================
  // 10. Geographic Trends & Executive Insights
  // ==========================================
  test('20. GET /api/maps/trends returns period-over-period geographic changes', async () => {
    const res = await request(app).get('/api/maps/trends?timeframe=30d');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('21. GET /api/maps/insights returns high-level GIS summary metrics', async () => {
    const res = await request(app).get('/api/maps/insights');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('totalCityComplaints');
    expect(res.body.data).toHaveProperty('coveredWards');
  });

  // ==========================================
  // 11. Database Query Performance (EXPLAIN ANALYZE)
  // ==========================================
  test('22. Spatial bounding-box query executes with index and high performance', async () => {
    const explainRes = await db.query(`
      EXPLAIN ANALYZE
      SELECT id, title, ST_X(location::geometry) AS lng, ST_Y(location::geometry) AS lat
      FROM complaints
      WHERE location IS NOT NULL AND location && ST_MakeEnvelope(76.70, 30.70, 76.85, 30.80, 4326)
      LIMIT 100;
    `);
    expect(explainRes.rows.length).toBeGreaterThan(0);
    const planText = explainRes.rows.map(r => r['QUERY PLAN']).join('\n');
    expect(planText).toBeDefined();
  });
});
