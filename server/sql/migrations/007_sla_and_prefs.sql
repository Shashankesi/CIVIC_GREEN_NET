-- Migration 007: SLA Column & Backfill
-- Adds SLA due dates to complaints for tracking resolution deadlines.

ALTER TABLE complaints ADD COLUMN IF NOT EXISTS sla_due_at TIMESTAMP WITH TIME ZONE;

-- Backfill existing SLA dates based on priority
-- critical -> 24 hours
-- high -> 48 hours
-- medium -> 72 hours
-- low / other -> 168 hours (7 days)
UPDATE complaints
SET sla_due_at = created_at + CASE
  WHEN LOWER(priority) = 'critical' THEN INTERVAL '24 hours'
  WHEN LOWER(priority) = 'high'     THEN INTERVAL '48 hours'
  WHEN LOWER(priority) = 'medium'   THEN INTERVAL '72 hours'
  ELSE                                   INTERVAL '168 hours'
END
WHERE sla_due_at IS NULL;
