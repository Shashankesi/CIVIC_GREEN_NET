-- Migration 026: Resource Requests & Complaint Teams
-- Enables officers to request additional workforce/equipment and admins to approve & assign teams.

-- 1. Resource Requests Table
CREATE TABLE IF NOT EXISTS resource_requests (
  id SERIAL PRIMARY KEY,
  complaint_id INTEGER NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  requested_by_officer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
  request_type VARCHAR(50) NOT NULL DEFAULT 'TEAM',
  required_people INTEGER NOT NULL DEFAULT 1,
  required_skills TEXT,
  equipment TEXT,
  priority VARCHAR(50) NOT NULL DEFAULT 'medium',
  reason TEXT NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Constraint for valid status values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_resource_requests_status' AND conrelid = 'resource_requests'::regclass
  ) THEN
    ALTER TABLE resource_requests ADD CONSTRAINT chk_resource_requests_status 
      CHECK (status IN ('pending', 'approved', 'rejected', 'completed'));
  END IF;
END $$;

-- 2. Complaint Support Teams Table
CREATE TABLE IF NOT EXISTS complaint_teams (
  id SERIAL PRIMARY KEY,
  complaint_id INTEGER NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  resource_request_id INTEGER REFERENCES resource_requests(id) ON DELETE SET NULL,
  team_name VARCHAR(255) NOT NULL,
  leader_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_complaint_teams_status' AND conrelid = 'complaint_teams'::regclass
  ) THEN
    ALTER TABLE complaint_teams ADD CONSTRAINT chk_complaint_teams_status 
      CHECK (status IN ('active', 'completed', 'disbanded'));
  END IF;
END $$;

-- 3. Complaint Support Team Members Table
CREATE TABLE IF NOT EXISTS complaint_team_members (
  id SERIAL PRIMARY KEY,
  team_id INTEGER NOT NULL REFERENCES complaint_teams(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  member_name VARCHAR(255) NOT NULL,
  role_in_team VARCHAR(100) DEFAULT 'Member',
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. Ensure complaint_assignments has status and declined_reason columns
ALTER TABLE IF EXISTS complaint_assignments ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'ASSIGNED';
ALTER TABLE IF EXISTS complaint_assignments ADD COLUMN IF NOT EXISTS declined_reason TEXT;

-- 5. Indexes for rapid queries
CREATE INDEX IF NOT EXISTS idx_resource_requests_complaint ON resource_requests(complaint_id);
CREATE INDEX IF NOT EXISTS idx_resource_requests_status ON resource_requests(status);
CREATE INDEX IF NOT EXISTS idx_resource_requests_officer ON resource_requests(requested_by_officer_id);
CREATE INDEX IF NOT EXISTS idx_complaint_teams_complaint ON complaint_teams(complaint_id);
CREATE INDEX IF NOT EXISTS idx_complaint_team_members_team ON complaint_team_members(team_id);

