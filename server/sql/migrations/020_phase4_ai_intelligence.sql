-- Migration 020: Phase 4 AI Civic Intelligence & Predictive Issue Analytics
-- Safe, idempotent PostgreSQL migration

-- 1. Enhance `ai_analysis` with structured intelligence columns
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_analysis' AND column_name = 'category') THEN
    ALTER TABLE ai_analysis ADD COLUMN category VARCHAR(100);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_analysis' AND column_name = 'subcategory') THEN
    ALTER TABLE ai_analysis ADD COLUMN subcategory VARCHAR(100);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_analysis' AND column_name = 'priority') THEN
    ALTER TABLE ai_analysis ADD COLUMN priority VARCHAR(50);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_analysis' AND column_name = 'severity') THEN
    ALTER TABLE ai_analysis ADD COLUMN severity VARCHAR(50);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_analysis' AND column_name = 'department_recommendation') THEN
    ALTER TABLE ai_analysis ADD COLUMN department_recommendation VARCHAR(255);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_analysis' AND column_name = 'department_id_recommendation') THEN
    ALTER TABLE ai_analysis ADD COLUMN department_id_recommendation INTEGER REFERENCES departments(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_analysis' AND column_name = 'reason') THEN
    ALTER TABLE ai_analysis ADD COLUMN reason TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_analysis' AND column_name = 'keywords') THEN
    ALTER TABLE ai_analysis ADD COLUMN keywords TEXT[];
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_analysis' AND column_name = 'suggested_actions') THEN
    ALTER TABLE ai_analysis ADD COLUMN suggested_actions TEXT[];
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_analysis' AND column_name = 'risk_assessment') THEN
    ALTER TABLE ai_analysis ADD COLUMN risk_assessment TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_analysis' AND column_name = 'duplicate_candidates') THEN
    ALTER TABLE ai_analysis ADD COLUMN duplicate_candidates JSONB DEFAULT '[]'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_analysis' AND column_name = 'model_used') THEN
    ALTER TABLE ai_analysis ADD COLUMN model_used VARCHAR(100);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_analysis' AND column_name = 'is_overridden') THEN
    ALTER TABLE ai_analysis ADD COLUMN is_overridden BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_analysis' AND column_name = 'overridden_by') THEN
    ALTER TABLE ai_analysis ADD COLUMN overridden_by INTEGER REFERENCES users(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_analysis' AND column_name = 'override_reason') THEN
    ALTER TABLE ai_analysis ADD COLUMN override_reason TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_analysis' AND column_name = 'overridden_at') THEN
    ALTER TABLE ai_analysis ADD COLUMN overridden_at TIMESTAMP WITH TIME ZONE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_analysis' AND column_name = 'updated_at') THEN
    ALTER TABLE ai_analysis ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();
  END IF;
END $$;

-- 2. Create `complaint_duplicate_clusters` table
CREATE TABLE IF NOT EXISTS complaint_duplicate_clusters (
  id SERIAL PRIMARY KEY,
  cluster_name VARCHAR(255),
  category VARCHAR(100),
  location_label VARCHAR(255),
  centroid GEOGRAPHY(POINT,4326),
  complaint_ids JSONB DEFAULT '[]'::jsonb,
  total_reports INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Create `civic_hotspots` table
CREATE TABLE IF NOT EXISTS civic_hotspots (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  ward_or_area VARCHAR(255),
  category VARCHAR(100),
  complaint_count INTEGER DEFAULT 0,
  unresolved_count INTEGER DEFAULT 0,
  sla_breach_count INTEGER DEFAULT 0,
  trend_percentage NUMERIC DEFAULT 0,
  risk_level VARCHAR(50) DEFAULT 'medium',
  centroid GEOGRAPHY(POINT,4326),
  radius_meters INTEGER DEFAULT 1000,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. Create `ai_audit_logs` table
CREATE TABLE IF NOT EXISTS ai_audit_logs (
  id SERIAL PRIMARY KEY,
  complaint_id INTEGER REFERENCES complaints(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  model_used VARCHAR(100),
  recommendation JSONB,
  confidence NUMERIC,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. Indexes for Phase 4 intelligence queries
CREATE INDEX IF NOT EXISTS idx_ai_analysis_complaint_id ON ai_analysis(complaint_id);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_category ON ai_analysis(category);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_confidence ON ai_analysis(confidence);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_created ON ai_analysis(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_duplicate_clusters_cat ON complaint_duplicate_clusters(category);
CREATE INDEX IF NOT EXISTS idx_civic_hotspots_cat ON civic_hotspots(category);
CREATE INDEX IF NOT EXISTS idx_civic_hotspots_risk ON civic_hotspots(risk_level);
CREATE INDEX IF NOT EXISTS idx_ai_audit_logs_comp ON ai_audit_logs(complaint_id);
CREATE INDEX IF NOT EXISTS idx_ai_audit_logs_event ON ai_audit_logs(event_type);
