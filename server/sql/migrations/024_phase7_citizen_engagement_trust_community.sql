-- Migration 024: Phase 7 Citizen Engagement, Trust, Community Intelligence & Contribution System
-- Safe, idempotent alterations for points, badges, reopenings, moderation, and preferences.

-- 1. Citizen Contribution Events Table (Auditable ledger)
CREATE TABLE IF NOT EXISTS citizen_contribution_events (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type VARCHAR(64) NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  reference_type VARCHAR(64),
  reference_id INTEGER,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Unique constraint to prevent duplicate points for same action
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_user_event_ref'
  ) THEN
    ALTER TABLE citizen_contribution_events 
    ADD CONSTRAINT uq_user_event_ref UNIQUE (user_id, event_type, reference_type, reference_id);
  END IF;
END $$;

-- 2. Badges Catalog Table
CREATE TABLE IF NOT EXISTS badges (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  description TEXT NOT NULL,
  icon VARCHAR(64) NOT NULL DEFAULT 'Award',
  category VARCHAR(64) NOT NULL DEFAULT 'engagement',
  criteria_points INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Seed Standard Badges Idempotently
INSERT INTO badges (id, name, description, icon, category, criteria_points)
VALUES
  ('FIRST_REPORT', 'First Responder', 'Submitted your first verified civic issue report', 'ShieldCheck', 'reporting', 10),
  ('VERIFIED_REPORTER', 'Trusted Reporter', 'Submitted 5 or more verified civic issue reports', 'Award', 'reporting', 50),
  ('RESOLUTION_HELPER', 'Quality Guardian', 'Actively verified and confirmed municipal resolution outcomes', 'CheckCircle2', 'verification', 30),
  ('COMMUNITY_SUPPORTER', 'Community Champion', 'Supported 10 or more neighborhood civic complaints', 'ThumbsUp', 'community', 20),
  ('EVIDENCE_CONTRIBUTOR', 'Evidence Master', 'Uploaded high-quality supplementary photo/document evidence', 'Camera', 'evidence', 25),
  ('NEIGHBORHOOD_CONTRIBUTOR', 'Civic Voice', 'Contributed constructive community discussions and comments', 'MessageSquare', 'community', 15),
  ('CIVIC_LEADER', 'Civic Champion', 'Reached top-tier community leadership status with 200+ contribution points', 'Sparkles', 'leadership', 200)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  category = EXCLUDED.category,
  criteria_points = EXCLUDED.criteria_points;

-- 3. Citizen Badges Awarded Table
CREATE TABLE IF NOT EXISTS citizen_badges (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id VARCHAR(64) NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  awarded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb,
  CONSTRAINT uq_user_badge UNIQUE (user_id, badge_id)
);

-- 4. Complaint Reopenings Ledger Table
CREATE TABLE IF NOT EXISTS complaint_reopenings (
  id SERIAL PRIMARY KEY,
  complaint_id INTEGER NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  evidence_urls TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. Comment Moderation & Reporting Table
CREATE TABLE IF NOT EXISTS comment_reports (
  id SERIAL PRIMARY KEY,
  comment_id INTEGER NOT NULL REFERENCES complaint_comments(id) ON DELETE CASCADE,
  reporter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT uq_comment_report UNIQUE (comment_id, reporter_id)
);

-- 6. Notification Preferences Table
CREATE TABLE IF NOT EXISTS notification_preferences (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email_complaint_updates BOOLEAN DEFAULT true,
  email_followed_updates BOOLEAN DEFAULT true,
  email_community_activity BOOLEAN DEFAULT true,
  email_marketing BOOLEAN DEFAULT false,
  in_app_complaint_updates BOOLEAN DEFAULT true,
  in_app_followed_updates BOOLEAN DEFAULT true,
  in_app_community_activity BOOLEAN DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT uq_user_notification_prefs UNIQUE (user_id)
);

-- 7. Add Moderation status to complaint_comments if not present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'complaint_comments' AND column_name = 'status'
  ) THEN
    ALTER TABLE complaint_comments ADD COLUMN status VARCHAR(32) DEFAULT 'visible';
  END IF;
END $$;

-- 8. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_contrib_user_created ON citizen_contribution_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contrib_event_type ON citizen_contribution_events(event_type);
CREATE INDEX IF NOT EXISTS idx_citizen_badges_user ON citizen_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_reopenings_complaint ON complaint_reopenings(complaint_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comment_reports_status ON comment_reports(status);
CREATE INDEX IF NOT EXISTS idx_notif_prefs_user ON notification_preferences(user_id);
