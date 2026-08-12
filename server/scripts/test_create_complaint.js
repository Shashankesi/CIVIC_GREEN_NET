const axios = require('axios');
const { Pool } = require('pg');
require('dotenv').config();

const API_BASE = 'http://localhost:5000/api';
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
  try {
    console.log('🚀 Programmatic verification: Creating complaint via API...');

    // 1. Sign up citizen
    let token = '';
    const email = `testcitizen_verify_${Date.now()}@example.com`;
    const password = 'password123';
    try {
      const resSignup = await axios.post(`${API_BASE}/auth/signup`, {
        name: 'Test Citizen',
        email,
        password,
        confirmPassword: password
      });
      console.log('✅ Citizen signup successful:', resSignup.data.status);
    } catch (e) {
      console.error('❌ Signup failed:', e.response ? e.response.data : e.message);
      process.exit(1);
    }

    // 2. Login citizen
    try {
      const resLogin = await axios.post(`${API_BASE}/auth/login`, { email, password });
      token = resLogin.data.accessToken || resLogin.data.data?.token || resLogin.data.token;
      console.log('✅ Citizen login successful, token obtained');
    } catch (e) {
      console.error('❌ Login failed:', e.response ? e.response.data : e.message);
      process.exit(1);
    }

    // 3. Create complaint with Delhi coordinates
    let complaintId = null;
    try {
      const resComplaint = await axios.post(`${API_BASE}/complaints`, {
        title: 'Broken street light on 5th avenue',
        description: 'The street light has been broken for 3 days and it is completely dark here at night. Please fix it.',
        category: 'lighting',
        priority: 'high',
        address: 'Delhi, India',
        location: { lng: 77.2090, lat: 28.6139 }
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      complaintId = resComplaint.data.data.id;
      console.log('✅ Complaint created successfully! ID:', complaintId);
      console.log('Response title:', resComplaint.data.data.title);
      console.log('Response summary:', resComplaint.data.data.summary);
    } catch (e) {
      console.error('❌ Complaint creation failed:', e.response ? e.response.data : e.message);
      process.exit(1);
    }

    // 4. Verify DB records
    console.log('\n🔍 Verifying Neon database records...');
    const { rows: complaints } = await pool.query('SELECT * FROM complaints WHERE id = $1', [complaintId]);
    if (complaints.length === 1) {
      const c = complaints[0];
      console.log('✅ Found complaint in DB:', c.title);
      console.log('  - category:', c.category);
      console.log('  - priority:', c.priority);
      console.log('  - location coordinates (X/Y):', c.address);
    } else {
      console.error('❌ Complaint not found in database!');
    }

    // 5. Verify AI analysis record
    const { rows: aiAnalyses } = await pool.query('SELECT * FROM ai_analysis WHERE complaint_id = $1', [complaintId]);
    if (aiAnalyses.length > 0) {
      console.log('✅ Found AI analysis in DB:');
      console.log('  - confidence:', aiAnalyses[0].confidence);
      console.log('  - analysis summary:', aiAnalyses[0].analysis?.summary);
    } else {
      console.log('⚠️ No AI analysis recorded (API key may be missing or failed)');
    }

    // 6. Verify notification creation
    const { rows: notifications } = await pool.query('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 5');
    console.log('\n🔔 Latest system notifications created:');
    notifications.forEach(n => {
      console.log(`- Type: ${n.type}, payload: ${JSON.stringify(n.payload)}`);
    });

    await pool.end();
    console.log('\n🎉 Verification completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Programmatic verify error:', err.message || err);
    await pool.end();
    process.exit(1);
  }
}

run();
