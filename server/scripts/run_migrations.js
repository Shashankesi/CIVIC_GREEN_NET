const fs = require('fs');
const path = require('path');
const db = require('../config/db');

async function run() {
  console.log('=== RUNNING MIGRATIONS ===');
  const migrationPath = path.join(__dirname, '../sql/migrations/005_audit_logs.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');
  try {
    await db.query(sql);
    console.log('✅ Applied migration 005_audit_logs.sql successfully!');
  } catch (err) {
    console.error('❌ Failed to run migration:', err);
    process.exit(1);
  }
  process.exit(0);
}

run();
