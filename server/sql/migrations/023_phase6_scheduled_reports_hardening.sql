-- ============================================================
-- Migration: 023_phase6_scheduled_reports_hardening.sql
-- Description: Phase 6 Scheduled Reports Hardening, Concurrency Locking & Performance Indexes
-- ============================================================

-- 1. Enhance scheduled_reports table for production scheduler
ALTER TABLE scheduled_reports ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'Asia/Kolkata';
ALTER TABLE scheduled_reports ADD COLUMN IF NOT EXISTS format VARCHAR(20) DEFAULT 'csv';
ALTER TABLE scheduled_reports ADD COLUMN IF NOT EXISTS last_run_status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE scheduled_reports ADD COLUMN IF NOT EXISTS last_error TEXT;
ALTER TABLE scheduled_reports ADD COLUMN IF NOT EXISTS run_count INT DEFAULT 0;
ALTER TABLE scheduled_reports ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ;
ALTER TABLE scheduled_reports ADD COLUMN IF NOT EXISTS locked_by VARCHAR(100);

-- Composite index for fast scheduler polling of active, due reports
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_due_poll 
ON scheduled_reports (is_active, next_run_at) 
WHERE is_active = true;

-- 2. Enhance governance_report_history table for observability & delivery tracking
ALTER TABLE governance_report_history ADD COLUMN IF NOT EXISTS scheduled_report_id INT REFERENCES scheduled_reports(id) ON DELETE SET NULL;
ALTER TABLE governance_report_history ADD COLUMN IF NOT EXISTS execution_type VARCHAR(20) DEFAULT 'manual'; -- 'scheduled', 'manual', 'run_now'
ALTER TABLE governance_report_history ADD COLUMN IF NOT EXISTS execution_duration_ms INT DEFAULT 0;
ALTER TABLE governance_report_history ADD COLUMN IF NOT EXISTS row_count INT DEFAULT 0;
ALTER TABLE governance_report_history ADD COLUMN IF NOT EXISTS delivery_status VARCHAR(50) DEFAULT 'not_applicable'; -- 'pending', 'delivered', 'failed', 'not_applicable'
ALTER TABLE governance_report_history ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Composite index for report history querying
CREATE INDEX IF NOT EXISTS idx_governance_report_history_sched 
ON governance_report_history (scheduled_report_id, created_at DESC);
