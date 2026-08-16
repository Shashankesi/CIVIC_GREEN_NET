-- Migration 012: Officer Availability and Assignment Status Columns
-- Idempotent, safe database script to support advanced officer status and assignment workflows.

-- 1. Add availability column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS availability VARCHAR(50) DEFAULT 'AVAILABLE';

-- 2. Add check constraint to restrict availability values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'users_availability_check' AND conrelid = 'users'::regclass
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_availability_check CHECK (availability IN ('AVAILABLE', 'BUSY', 'ON_FIELD', 'OFFLINE'));
  END IF;
END $$;

-- 3. Add status column to complaint_assignments history table
ALTER TABLE complaint_assignments ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'ASSIGNED';

-- 4. Add check constraint to restrict complaint_assignments status values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'complaint_assignments_status_check' AND conrelid = 'complaint_assignments'::regclass
  ) THEN
    ALTER TABLE complaint_assignments ADD CONSTRAINT complaint_assignments_status_check CHECK (status IN ('PENDING', 'ASSIGNED', 'ACCEPTED', 'DECLINED', 'REASSIGNED', 'COMPLETED'));
  END IF;
END $$;

-- 5. Add declined_reason column to complaint_assignments
ALTER TABLE complaint_assignments ADD COLUMN IF NOT EXISTS declined_reason TEXT;
