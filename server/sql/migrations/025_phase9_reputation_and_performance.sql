-- Migration 025: Phase 9 Civic Reputation, Point Ledger & Officer Performance System
-- Fully auditable, transactional point transactions, dynamic point rules, and achievements.

-- 1. Point Transactions Ledger Table
CREATE TABLE IF NOT EXISTS point_transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(32) NOT NULL DEFAULT 'citizen',
  complaint_id INTEGER REFERENCES complaints(id) ON DELETE SET NULL,
  event_type VARCHAR(64) NOT NULL,
  points INTEGER NOT NULL,
  reason TEXT,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Unique index to prevent duplicate point events for the same complaint action
CREATE UNIQUE INDEX IF NOT EXISTS uq_point_tx_user_complaint_event 
ON point_transactions (user_id, complaint_id, event_type) 
WHERE complaint_id IS NOT NULL;

-- 2. Configurable Point Rules Table
CREATE TABLE IF NOT EXISTS point_rules (
  id SERIAL PRIMARY KEY,
  role VARCHAR(32) NOT NULL,
  rule_key VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(128) NOT NULL,
  description TEXT,
  points INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Seed Default Configurable Point Rules Idempotently
INSERT INTO point_rules (role, rule_key, name, description, points, is_active)
VALUES
  -- Citizen Rules
  ('citizen', 'COMPLAINT_SUBMITTED', 'Valid Complaint Submission', 'Awarded when a citizen submits a valid civic issue report', 10, true),
  ('citizen', 'COMPLAINT_VERIFIED', 'Complaint Verification', 'Awarded when a report is verified by AI or municipal review', 20, true),
  ('citizen', 'COMPLAINT_RESOLVED', 'Complaint Resolution', 'Awarded when a reported complaint is successfully resolved', 30, true),
  ('citizen', 'HELPFUL_EVIDENCE', 'Helpful Additional Evidence', 'Awarded for uploading clear photos or supplementary documentation', 5, true),
  ('citizen', 'COMPLAINT_DUPLICATE', 'Duplicate Complaint', 'Assigned when a report is matched as duplicate (no penalty)', 0, true),
  ('citizen', 'FALSE_COMPLAINT', 'Confirmed False Complaint', 'Penalty for confirmed abusive, spam, or malicious reports', -30, true),

  -- Officer Rules
  ('officer', 'OFFICER_ACCEPTED', 'Assignment Accepted', 'Awarded when an officer accepts an assigned case', 2, true),
  ('officer', 'OFFICER_INVESTIGATION', 'Investigation Started', 'Awarded when field work or investigation starts', 5, true),
  ('officer', 'OFFICER_EVIDENCE_SUBMITTED', 'Resolution Evidence Submitted', 'Awarded for uploading proof of work / photo evidence', 10, true),
  ('officer', 'OFFICER_RESOLVED', 'Complaint Resolution', 'Awarded when an assigned case is resolved in the field', 25, true),
  ('officer', 'OFFICER_SLA_BONUS', 'On-Time SLA Resolution Bonus', 'Bonus awarded when a case is resolved before SLA deadline', 15, true),
  ('officer', 'OFFICER_VERIFIED_RESOLUTION', 'Verified Resolution Confirmation', 'Bonus when citizen or admin confirms resolution quality', 20, true),
  ('officer', 'RESOLUTION_REOPENED', 'Resolution Reopened Penalty', 'Penalty applied when a resolution is contested and reopened', -10, true),
  ('officer', 'FALSE_RESOLUTION', 'False Resolution Penalty', 'Penalty for invalid or fabricated resolution reports', -30, true),
  ('officer', 'OFFICER_SLA_VIOLATION', 'SLA Breach Penalty', 'Penalty for cases resolved past the SLA deadline', -15, true)
ON CONFLICT (rule_key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  role = EXCLUDED.role;

-- 3. Badges Catalog Expansion (Officers and Advanced Citizens)
INSERT INTO badges (id, name, description, icon, category, criteria_points)
VALUES
  ('ACTIVE_CITIZEN', 'Active Citizen', 'Submitted 10 or more verified civic reports', 'ShieldCheck', 'reporting', 100),
  ('RELIABLE_REPORTER', 'Reliable Reporter', 'Maintained 90%+ report verification accuracy rate', 'Award', 'verification', 150),
  ('COMMUNITY_CONTRIBUTOR', 'Community Contributor', '25 or more complaints resolved in community', 'CheckCircle2', 'community', 250),
  ('CIVIC_CHAMPION', 'Civic Champion', 'Earned 100+ total civic reputation points', 'Sparkles', 'leadership', 100),
  ('TOP_RESPONDER', 'Top Responder', 'Ranked in the top 10 citywide leaderboard', 'Trophy', 'leadership', 300),
  ('FAST_RESPONDER', 'Fast Responder', 'High SLA compliance resolution track record', 'Zap', 'officer', 100),
  ('FIELD_CHAMPION', 'Field Champion', 'Resolved 50 or more field complaints on time', 'Award', 'officer', 250),
  ('RELIABLE_OFFICER', 'Reliable Officer', 'Maintained 95%+ on-time SLA resolution consistency', 'Shield', 'officer', 200)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  category = EXCLUDED.category,
  criteria_points = EXCLUDED.criteria_points;

-- 4. User Badges Table (Supports all roles)
CREATE TABLE IF NOT EXISTS user_badges (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id VARCHAR(64) NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  awarded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb,
  CONSTRAINT uq_user_badge_link UNIQUE (user_id, badge_id)
);

-- 5. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_pt_user_created ON point_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pt_complaint_event ON point_transactions(complaint_id, event_type);
CREATE INDEX IF NOT EXISTS idx_pt_role_points ON point_transactions(role, points);
CREATE INDEX IF NOT EXISTS idx_pt_created_at ON point_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges(user_id);
