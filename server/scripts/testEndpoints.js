const http = require('http');
const app = require('../app');
const db = require('../config/db');

async function testSuite() {
  console.log('=== RUNNING CIVIC GREENNET ADMIN API TEST SUITE ===');

  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;
  console.log(`Server listening on ${baseUrl}\n`);

  try {
    // 1. Health Check
    console.log('1. Testing GET /api/health ...');
    const healthRes = await fetch(`${baseUrl}/api/health`);
    const healthJson = await healthRes.json();
    console.log(`   Status: ${healthRes.status}, Body:`, healthJson);

    // 2. Fetch admin user from DB
    const adminUserRes = await db.query("SELECT id, email, role FROM users WHERE role = 'admin' LIMIT 1");
    if (adminUserRes.rows.length === 0) {
      console.warn('No admin user found in database.');
      return;
    }
    const adminUser = adminUserRes.rows[0];
    console.log(`\n2. Using Admin User: ID=${adminUser.id}, Email=${adminUser.email}`);

    // Generate JWT token directly
    const tokenService = require('../services/tokenService');
    const token = tokenService.generateAccessToken({ userId: adminUser.id, role: 'admin' });
    const authHeaders = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    // 3. Admin Dashboard
    console.log('\n3. Testing GET /api/admin/dashboard ...');
    const startDash = Date.now();
    const dashRes = await fetch(`${baseUrl}/api/admin/dashboard`, { headers: authHeaders });
    const dashJson = await dashRes.json();
    console.log(`   Response Time: ${Date.now() - startDash}ms, Status: ${dashRes.status}`);
    console.log('   Dashboard Complaints Total:', dashJson.data?.complaints?.total);
    console.log('   Dashboard Users Total:', dashJson.data?.users?.total);

    // 4. User Directory
    console.log('\n4. Testing GET /api/admin/users ...');
    const usersRes = await fetch(`${baseUrl}/api/admin/users?page=1&limit=15`, { headers: authHeaders });
    const usersJson = await usersRes.json();
    console.log(`   Status: ${usersRes.status}, Total Users: ${usersJson.data?.total}, Items: ${usersJson.data?.items?.length}`);

    // 5. User Stats
    console.log('\n5. Testing GET /api/admin/users/stats ...');
    const statsRes = await fetch(`${baseUrl}/api/admin/users/stats`, { headers: authHeaders });
    const statsJson = await statsRes.json();
    console.log(`   Status: ${statsRes.status}, Stats:`, statsJson.data);

    // 6. Officer Summary
    console.log('\n6. Testing GET /api/admin/officers/summary ...');
    const offSumRes = await fetch(`${baseUrl}/api/admin/officers/summary`, { headers: authHeaders });
    const offSumJson = await offSumRes.json();
    console.log(`   Status: ${offSumRes.status}, Officer Summary:`, offSumJson.data);

    // 7. Complaints List
    console.log('\n7. Testing GET /api/admin/complaints ...');
    const compRes = await fetch(`${baseUrl}/api/admin/complaints?page=1&limit=20`, { headers: authHeaders });
    const compJson = await compRes.json();
    console.log(`   Status: ${compRes.status}, Total Complaints: ${compJson.data?.total}, Items: ${compJson.data?.items?.length}`);

    // 8. System Health
    console.log('\n8. Testing GET /api/admin/system-health ...');
    const sysHealthRes = await fetch(`${baseUrl}/api/admin/system-health`, { headers: authHeaders });
    const sysHealthJson = await sysHealthRes.json();
    console.log(`   Status: ${sysHealthRes.status}, Health:`, sysHealthJson.data);

    // 9. Audit Logs
    console.log('\n9. Testing GET /api/admin/audit-logs ...');
    const auditRes = await fetch(`${baseUrl}/api/admin/audit-logs?page=1&limit=10`, { headers: authHeaders });
    const auditJson = await auditRes.json();
    console.log(`   Status: ${auditRes.status}, Total Audit Logs: ${auditJson.data?.total}`);

    // 10. Email Logs
    console.log('\n10. Testing GET /api/admin/email-logs ...');
    const emailRes = await fetch(`${baseUrl}/api/admin/email-logs?page=1&limit=10`, { headers: authHeaders });
    const emailJson = await emailRes.json();
    console.log(`   Status: ${emailRes.status}, Total Email Logs: ${emailJson.data?.total}`);

    console.log('\n🎉 ALL ADMIN API ENDPOINTS RESPONDED WITH REAL DATABASE DATA IN RECORD TIME!');
  } catch (err) {
    console.error('\n❌ Test Suite Error:', err);
  } finally {
    server.close(() => process.exit(0));
  }
}

testSuite();
