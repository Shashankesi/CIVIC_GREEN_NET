-- Migration 014: Citizen Portal Community & Engagement Enhancements
-- Safe, idempotent alterations for voting/supporting, following issues, citizen comments, and performance.

-- 1. Community Votes / Support Table
CREATE TABLE IF NOT EXISTS complaint_votes (
  id SERIAL PRIMARY KEY,
  complaint_id INTEGER NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT uq_complaint_vote UNIQUE(complaint_id, user_id)
);

-- 2. Followed / Saved Issues Table
CREATE TABLE IF NOT EXISTS complaint_follows (
  id SERIAL PRIMARY KEY,
  complaint_id INTEGER NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT uq_complaint_follow UNIQUE(complaint_id, user_id)
);

-- 3. Citizen Comments / Public Communication Table
CREATE TABLE IF NOT EXISTS complaint_comments (
  id SERIAL PRIMARY KEY,
  complaint_id INTEGER NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  is_anonymous BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. High-Performance Indexes for Citizen Queries
CREATE INDEX IF NOT EXISTS idx_complaint_votes_complaint_id ON complaint_votes(complaint_id);
CREATE INDEX IF NOT EXISTS idx_complaint_votes_user_id ON complaint_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_complaint_follows_complaint_id ON complaint_follows(complaint_id);
CREATE INDEX IF NOT EXISTS idx_complaint_follows_user_id ON complaint_follows(user_id);
CREATE INDEX IF NOT EXISTS idx_complaint_comments_complaint_id ON complaint_comments(complaint_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_complaints_user_status_created ON complaints(user_id, status, created_at DESC);
