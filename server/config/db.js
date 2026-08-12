const { Pool } = require('pg');
const { DB } = require('.');

let pool = null;
// Support DATABASE_URL (Neon/Supabase) or individual DB_* variables
const connectionString = DB.URL || null;
const hasBasicConfig = DB.HOST && DB.USER && DB.NAME;

if (connectionString || hasBasicConfig) {
  const opts = {};
  if (connectionString) opts.connectionString = connectionString;
  else {
    opts.host = DB.HOST;
    if (DB.PORT) opts.port = DB.PORT;
    opts.user = DB.USER;
    opts.password = DB.PASSWORD;
    opts.database = DB.NAME;
  }

  // Enable SSL automatically for production, Neon, or when DB_SSL env var is set
  const forceSsl = process.env.DB_SSL === 'true' || process.env.DB_REQUIRE_SSL === 'true' || process.env.NODE_ENV === 'production';
  if (forceSsl) {
    opts.ssl = { rejectUnauthorized: false };
  }

  try {
    pool = new Pool(opts);
    pool.on('error', (err) => {
      console.error('Unexpected PG error', err);
    });
  } catch (e) {
    console.warn('Failed to create PG pool', e && e.message ? e.message : e);
    pool = null;
  }
}

if (!pool) {
  const err = new Error('Postgres not configured. Set DATABASE_URL or DB_HOST/DB_USER/DB_PASSWORD/DB_NAME environment variables.');
  console.error(err.message);
}

module.exports = {
  query: async (text, params) => {
    if (!pool) {
      throw new Error('Postgres is not configured. Database queries cannot run without valid connection settings.');
    }
    try {
      return await pool.query(text, params);
    } catch (e) {
      console.error('DB query failed:', e.code || e.message || e);
      throw e;
    }
  },
  _pool: pool,
  hasVector: false
};
