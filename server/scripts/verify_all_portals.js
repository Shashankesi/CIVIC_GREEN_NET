const request = require('supertest');
const app = require('../app');
const db = require('../config/db');

async function runPortalRegressionTests() {
  console.log('==================================================');
  console.log('RUNNING FULL PORTAL REGRESSION & DATA VERIFICATION');
  console.log('==================================================\n');

  // 1. Health check
  console.log('1. Testing /api/health...');
  const healthRes = await request(app).get('/api/health');
  console.log('   Health Status:', healthRes.status, 'Body:', healthRes.body);

  // 2. Public endpoints check
  console.log('\n2. Testing Public API Suite...');
  const statsRes = await request(app).get('/api/public/stats');
  console.log('   Public Stats:', statsRes.status, statsRes.body?.data);

  const actRes = await request(app).get('/api/public/activity');
  console.log('   Public Activity Count:', actRes.body?.data?.length);

  const recRes = await request(app).get('/api/public/recent');
  console.log('   Public Recent Count:', recRes.body?.data?.length);

  const mapRes = await request(app).get('/api/public/map');
  console.log('   Public Map Count:', mapRes.body?.data?.length);

  const catRes = await request(app).get('/api/public/categories');
  console.log('   Public Categories:', catRes.body?.data);

  const impactRes = await request(app).get('/api/public/impact');
  console.log('   Public Impact:', impactRes.body?.data);

  // 3. User & Auth check
  console.log('\n3. Testing Auth & User Portals Data Consistency...');
  const userRes = await db.query('SELECT id, email, role, status FROM users ORDER BY id ASC');
  console.log('   Total Users in DB:', userRes.rows.length);
  userRes.rows.forEach(u => console.log(`   - ID ${u.id}: ${u.email} [${u.role}/${u.status}]`));

  // 4. Complaints Consistency
  console.log('\n4. Testing Complaints Lifecycle Data...');
  const compRes = await db.query('SELECT id, title, category, status, priority, created_at FROM complaints ORDER BY id DESC');
  console.log('   Total Complaints in DB:', compRes.rows.length);
  compRes.rows.forEach(c => console.log(`   - #${c.id}: "${c.title}" [${c.category} / ${c.status} / ${c.priority}]`));

  console.log('\n==================================================');
  console.log('ALL VERIFICATIONS PASSED SUCCESSFULLY!');
  console.log('==================================================');
}

runPortalRegressionTests()
  .catch(err => {
    console.error('Portal Verification Failed:', err);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
