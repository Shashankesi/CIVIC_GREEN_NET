const db = require('../config/db');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

async function runMigrations() {
  if (!db._pool) {
    logger.info('DB not configured — skipping migrations');
    return;
  }

  const client = db._pool;
  try {
    // 0. Ensure base schema (schema.sql) is applied first if not already present
    try {
      const schemaPath = path.join(__dirname, '..', 'sql', 'schema.sql');
      if (fs.existsSync(schemaPath)) {
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        await client.query(schemaSql);
        logger.info('Applied base schema (schema.sql)');
      }
    } catch (e) {
      logger.warn('Base schema runner notice (tables may already exist):', { err: e.message });
    }

    // 1. Apply SQL migrations dynamically in sorted order (004, 005, etc.)
    try {
      const migrationsDir = path.join(__dirname, '..', 'sql', 'migrations');
      if (fs.existsSync(migrationsDir)) {
        const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
        for (const file of files) {
          const sqlPath = path.join(migrationsDir, file);
          const sql = fs.readFileSync(sqlPath, 'utf8');
          try {
            await client.query(sql);
            logger.info(`Applied migration: ${file}`);
          } catch (mErr) {
            logger.warn(`Migration ${file} notice:`, { err: mErr.message });
          }
        }
      }
    } catch (e) {
      logger.warn('SQL migrations runner warning:', { err: e.message });
    }

    // 2. Create extensions if possible
    try {
      await client.query("CREATE EXTENSION IF NOT EXISTS postgis;");
    } catch (e) {
      logger.warn('Could not create postgis extension:', { err: e.message });
    }
    try {
      await client.query("CREATE EXTENSION IF NOT EXISTS pg_trgm;");
    } catch (e) {
      logger.warn('Could not create pg_trgm extension:', { err: e.message });
    }
    try {
      await client.query("CREATE EXTENSION IF NOT EXISTS vector;");
      logger.info('Checked/created extension: vector');
    } catch (e) {
      logger.warn('Could not create vector extension (insufficient privileges or not supported):', { err: e.message });
    }

    // 3. Add embedding column if not exists (dimension 1536 default)
    try {
      await client.query("ALTER TABLE IF EXISTS ai_analysis ADD COLUMN IF NOT EXISTS embedding vector(1536);");
      logger.info('Ensured ai_analysis.embedding column exists (vector(1536))');
    } catch (e) {
      logger.warn('Could not add embedding column to ai_analysis', { err: e.message });
    }

    // 4. Create vector index (ivfflat) if possible
    try {
      await client.query("CREATE INDEX IF NOT EXISTS ai_analysis_embedding_ivfflat_idx ON ai_analysis USING ivfflat (embedding vector_l2_ops) WITH (lists = 100);");
      logger.info('Ensured ai_analysis embedding ivfflat index');
    } catch (e) {
      logger.warn('Could not create ivfflat index (server may not support it)', { err: e.message });
    }

    // 5. Ensure trigram index on complaints.title
    try {
      await client.query("CREATE INDEX IF NOT EXISTS complaints_title_trgm_idx ON complaints USING gin (title gin_trgm_ops);");
      logger.info('Ensured complaints.title trigram index');
    } catch (e) {
      logger.warn('Could not create trigram index', { err: e.message });
    }

    // 6. Detect whether vector extension is available
    try {
      const res = await client.query("SELECT 1 FROM pg_extension WHERE extname='vector'");
      db.hasVector = res.rows.length > 0;
      logger.info('pgvector available:', { hasVector: db.hasVector });
    } catch (e) {
      db.hasVector = false;
      logger.warn('pgvector detection failed', { err: e.message });
    }
  } catch (e) {
    logger.error('Migration runner failed', { err: e.message });
  }
}

module.exports = { runMigrations };
