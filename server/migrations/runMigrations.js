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
    // Apply SQL migrations dynamically in sorted order (004, 005, etc.)
    try {
      const migrationsDir = path.join(__dirname, '..', 'sql', 'migrations');
      const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
      for (const file of files) {
        const sqlPath = path.join(migrationsDir, file);
        const sql = fs.readFileSync(sqlPath, 'utf8');
        await client.query(sql);
        logger.info(`Applied migration: ${file}`);
      }
    } catch (e) {
      logger.warn('SQL migrations runner warning (some may already be applied):', { err: e.message });
    }

    // Create extensions if possible
    try {
      await client.query("CREATE EXTENSION IF NOT EXISTS pg_trgm;");
      await client.query("CREATE EXTENSION IF NOT EXISTS vector;");
      logger.info('Checked/created extensions: pg_trgm, vector');
    } catch (e) {
      logger.warn('Could not create extensions (insufficient privileges or not supported)', { err: e.message });
    }

    // Add embedding column if not exists (dimension 1536 default)
    try {
      await client.query("ALTER TABLE IF EXISTS ai_analysis ADD COLUMN IF NOT EXISTS embedding vector(1536);");
      logger.info('Ensured ai_analysis.embedding column exists (vector(1536))');
    } catch (e) {
      logger.warn('Could not add embedding column to ai_analysis', { err: e.message });
    }

    // Create vector index (ivfflat) if possible
    try {
      await client.query("CREATE INDEX IF NOT EXISTS ai_analysis_embedding_ivfflat_idx ON ai_analysis USING ivfflat (embedding vector_l2_ops) WITH (lists = 100);");
      logger.info('Ensured ai_analysis embedding ivfflat index');
    } catch (e) {
      logger.warn('Could not create ivfflat index (server may not support it)', { err: e.message });
    }

    // Ensure trigram index on complaints.title
    try {
      await client.query("CREATE INDEX IF NOT EXISTS complaints_title_trgm_idx ON complaints USING gin (title gin_trgm_ops);");
      logger.info('Ensured complaints.title trigram index');
    } catch (e) {
      logger.warn('Could not create trigram index', { err: e.message });
    }

    // Detect whether vector extension is available
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
