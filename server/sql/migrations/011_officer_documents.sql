-- 011_officer_documents.sql
-- Officer Onboarding Document verification tables

CREATE TABLE IF NOT EXISTS officer_documents (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'IDENTITY', 'ADDRESS', 'QUALIFICATION'
  original_file_name VARCHAR(255) NOT NULL,
  stored_file_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  file_size INTEGER NOT NULL,
  storage_provider VARCHAR(50) DEFAULT 'cloudinary',
  storage_path VARCHAR(500) NOT NULL,
  document_url TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'UPLOADED', -- 'UPLOADED', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED'
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  verified_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  rejection_reason TEXT,
  version INTEGER DEFAULT 1,
  UNIQUE(user_id, type)
);

CREATE INDEX IF NOT EXISTS idx_off_docs_user ON officer_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_off_docs_type ON officer_documents(type);
