const { Pool } = require('pg');
const { DB } = require('.');

const isTestEnv = process.env.NODE_ENV === 'test' || process.env.TEST_MODE === 'true';

let connectionString = null;
if (isTestEnv) {
  connectionString = process.env.TEST_DATABASE_URL || DB.URL || null;
} else {
  connectionString = DB.URL || null;
}

const hasBasicConfig = !connectionString && DB.HOST && DB.USER && DB.NAME;

let pool = null;
if (connectionString || hasBasicConfig) {
  const opts = {
    max: parseInt(process.env.DB_POOL_MAX || '8', 10),
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '10000', 10),
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '15000', 10),
    statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT || '15000', 10),
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000
  };

  if (connectionString) {
    // Sanitize connection string for node-postgres (strip unsupported channel_binding parameter)
    opts.connectionString = connectionString
      .replace(/[?&]channel_binding=[^&]+/g, '')
      .replace(/\?&/, '?')
      .replace(/\?$/, '');
  } else {
    opts.host = DB.HOST;
    if (DB.PORT) opts.port = DB.PORT;
    opts.user = DB.USER;
    opts.password = DB.PASSWORD;
    opts.database = DB.NAME;
  }

  // Enable SSL automatically for production, Neon, or when DB_SSL env var is set
  const isNeon = connectionString && (connectionString.includes('neon.tech') || connectionString.includes('sslmode='));
  const forceSsl = isNeon || process.env.DB_SSL === 'true' || process.env.DB_REQUIRE_SSL === 'true' || process.env.NODE_ENV === 'production';
  if (forceSsl) {
    opts.ssl = { rejectUnauthorized: false };
  }

  try {
    pool = new Pool(opts);
    pool.on('error', (err) => {
      console.error('Unexpected PG Pool client error:', err.message || err);
    });

    // Keep connection pool warm and prevent Neon compute autosuspend cold starts
    const heartbeat = setInterval(async () => {
      if (!pool) return;
      try {
        await pool.query('SELECT 1');
      } catch (e) {
        // Ignore silent heartbeat blips
      }
    }, 45000);
    if (heartbeat.unref) heartbeat.unref();
  } catch (e) {
    console.warn('Failed to create PG pool:', e && e.message ? e.message : e);
    pool = null;
  }
}

if (!pool) {
  const err = new Error('Postgres not configured. Set DATABASE_URL or DB_HOST/DB_USER/DB_PASSWORD/DB_NAME environment variables.');
  console.error(err.message);
}

const isRetryableError = (e) => {
  if (!e) return false;
  const msg = (e.message || '').toLowerCase();
  const code = (e.code || '').toLowerCase();
  return (
    msg.includes('connection terminated') ||
    msg.includes('timeout') ||
    msg.includes('connection closed') ||
    msg.includes('socket closed') ||
    msg.includes('econnreset') ||
    code === '57p01' || // admin_shutdown
    code === '08006' || // connection_failure
    code === '08001'    // unable_to_establish_connection
  );
};

module.exports = {
  query: async (text, params) => {
    if (!pool) {
      throw new Error('Postgres is not configured. Database queries cannot run without valid connection settings.');
    }
    const start = Date.now();
    try {
      const res = await pool.query(text, params);
      const duration = Date.now() - start;
      if (process.env.LOG_QUERIES === 'true' || (process.env.NODE_ENV === 'development' && duration > 1000)) {
        console.log(`[DB SLOW QUERY] ${duration}ms: ${text.substring(0, 100).replace(/\s+/g, ' ')}...`);
      }
      return res;
    } catch (e) {
      // Automatic single retry on connection blip
      if (isRetryableError(e)) {
        try {
          await new Promise(r => setTimeout(r, 200));
          const res = await pool.query(text, params);
          return res;
        } catch (retryErr) {
          e = retryErr;
        }
      }
      const duration = Date.now() - start;
      console.error(`[DB ERROR] (${duration}ms) ${e.code || e.message}: ${text.substring(0, 100).replace(/\s+/g, ' ')}...`);
      throw e;
    }
  },
  transaction: async (callback) => {
    if (!pool) {
      throw new Error('Postgres is not configured.');
    }
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  },
  _pool: pool,
  hasVector: false
};
