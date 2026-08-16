const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const db = require('../config/db');

async function run() {
  console.log('=== RUNNING MIGRATION 010_ai_conversations.sql ===');
  const migrationPath = path.join(__dirname, '../sql/migrations/010_ai_conversations.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');
  try {
    await db.query(sql);
    console.log('✅ Applied migration 010_ai_conversations.sql successfully!');
  } catch (err) {
    console.error('❌ Failed to run migration:', err);
    process.exit(1);
  }
  process.exit(0);
}

run();
