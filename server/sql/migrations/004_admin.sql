-- Civic GreenNet Phase 4 — Admin, departments, officer assignment, settings, user status
-- Idempotent, safe for existing data, backward compatible.

-- 1. Departments: add description if missing
ALTER TABLE IF EXISTS departments ADD COLUMN IF NOT EXISTS description TEXT;

-- 2. Users: add status field if missing (active | suspended)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='users' AND column_name='status'
  ) THEN
    ALTER TABLE users ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'active';
  END IF;
END $$;

-- Add CHECK constraint for valid status values (idempotent via DO block)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname='users_status_check' AND conrelid='users'::regclass
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_status_check CHECK (status IN ('active','pending','suspended','rejected','blocked'));
  END IF;
END $$;

-- Users: add department_id for officers if missing (officers belong to a department)
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS department_id INTEGER;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname='users_department_id_fkey' AND conrelid='users'::regclass
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_department_id_fkey FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 3. Complaints: add officer assignment columns if missing (backward compatible, NULL by default)
ALTER TABLE IF EXISTS complaints ADD COLUMN IF NOT EXISTS officer_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE IF EXISTS complaints ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP WITH TIME ZONE;

-- Index officer_id for queue queries
CREATE INDEX IF NOT EXISTS idx_complaints_officer ON complaints(officer_id);

-- 4. Assignment history table (preserves reassignment history)
CREATE TABLE IF NOT EXISTS complaint_assignments (
  id SERIAL PRIMARY KEY,
  complaint_id INTEGER NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  officer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  assigned_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_complaint_assignments_complaint ON complaint_assignments(complaint_id);

-- 5. User settings table (theme, notification + privacy preferences)
CREATE TABLE IF NOT EXISTS user_settings (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  theme VARCHAR(20) NOT NULL DEFAULT 'light',
  notification_preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  privacy_preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

