/**
 * End-to-end API verification script using signed JWT to test admin endpoints
 */
const axios = require('axios');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const BASE = 'http://localhost:5000/api';

async function run() {
  console.log('\n=== STEP 1: Generate JWT for admin (id: 69) ===');
  const token = jwt.sign({ userId: 69, role: 'admin' }, process.env.JWT_ACCESS_SECRET, { expiresIn: '15m' });
  console.log('✅ Generated JWT access token');

  const headers = { Authorization: `Bearer ${token}` };

  // 2. Call GET /admin/complaints
  console.log('\n=== STEP 2: GET /api/admin/complaints ===');
  const complaintsRes = await axios.get(`${BASE}/admin/complaints`, { headers, params: { limit: 5 } });
  const data = complaintsRes.data?.data;
  console.log(`✅ Response: total=${data?.total}, items count=${data?.items?.length}`);
  if (data?.items?.length > 0) {
    const first = data.items[0];
    console.log(`   First complaint: #${first.id} [${first.status}] "${first.title}" citizen="${first.citizen_name}"`);

    // 3. GET single complaint
    console.log(`\n=== STEP 3: GET /api/admin/complaints/${first.id} ===`);
    const singleRes = await axios.get(`${BASE}/admin/complaints/${first.id}`, { headers });
    const sc = singleRes.data?.data;
    console.log(`✅ Got complaint: #${sc.id} "${sc.title}"`);
    console.log(`   images: ${(sc.images || []).length}, status_history: ${(sc.status_history || []).length}`);
  }

  // 4. Test filters
  console.log('\n=== STEP 4: GET /api/admin/complaints?status=open&limit=3 ===');
  const filteredRes = await axios.get(`${BASE}/admin/complaints`, { headers, params: { status: 'open', limit: 3 } });
  const fd = filteredRes.data?.data;
  console.log(`✅ Filtered: total=${fd?.total}, returned=${fd?.items?.length}`);

  // 5. Test reports endpoint
  console.log('\n=== STEP 5: GET /api/admin/reports/complaints ===');
  const reportsRes = await axios.get(`${BASE}/admin/reports/complaints`, { headers, params: { limit: 5 } });
  const rd = reportsRes.data?.data;
  console.log(`✅ Reports: total=${rd?.total}, items=${rd?.items?.length}`);

  // 6. Test dashboard
  console.log('\n=== STEP 6: GET /api/admin/dashboard ===');
  const dashRes = await axios.get(`${BASE}/admin/dashboard`, { headers });
  const dd = dashRes.data?.data;
  console.log(`✅ Dashboard: complaints.total=${dd?.complaints?.total}, users.total=${dd?.users?.total}`);

  console.log('\n=== ALL TESTS PASSED ===\n');
}

run().catch((e) => {
  console.error('Test failed:', e?.response?.data || e.message);
  process.exit(1);
});
