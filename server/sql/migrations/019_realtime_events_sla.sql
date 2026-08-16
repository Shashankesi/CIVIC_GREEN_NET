-- Migration 019: Real-time Operations & SLA Event Tracking Indexes
-- Idempotent, safe, and backwards-compatible database migration

-- 1. Ensure `sla_escalated_at` column exists on `complaints` table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'complaints' AND column_name = 'sla_escalated_at'
  ) THEN
    ALTER TABLE complaints ADD COLUMN sla_escalated_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- 2. Partial and composite indexes for real-time querying and SLA compliance
CREATE INDEX IF NOT EXISTS idx_complaints_sla_active 
  ON complaints(status, sla_due_at) 
  WHERE status IN ('open', 'in_progress', 'reopened');

CREATE INDEX IF NOT EXISTS idx_complaints_officer_active 
  ON complaints(officer_id, status) 
  WHERE status IN ('assigned', 'in_progress', 'open', 'reopened');

CREATE INDEX IF NOT EXISTS idx_complaints_citizen_active 
  ON complaints(user_id, status);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread_recent 
  ON notifications(user_id, is_read, created_at DESC);
