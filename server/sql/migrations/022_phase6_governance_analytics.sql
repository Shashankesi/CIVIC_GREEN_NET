-- ============================================================
-- Migration: 022_phase6_governance_analytics.sql
-- Description: Phase 6 Municipal Governance, Reports & Alerts
-- ============================================================

-- 1. Governance Report History
CREATE TABLE IF NOT EXISTS governance_report_history (
  id SERIAL PRIMARY KEY,
  report_name VARCHAR(255) NOT NULL,
  report_type VARCHAR(100) NOT NULL, -- executive_summary, department, officer, sla, ward, category, critical_issues, audit
  filters JSONB DEFAULT '{}'::jsonb,
  file_format VARCHAR(20) NOT NULL, -- csv, excel, pdf
  file_size_bytes INT DEFAULT 0,
  file_path TEXT,
  generated_by INT REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'completed', -- pending, completed, failed
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_report_history_type_created ON governance_report_history (report_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_report_history_generated_by ON governance_report_history (generated_by);

-- 2. Scheduled Reports
CREATE TABLE IF NOT EXISTS scheduled_reports (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  report_type VARCHAR(100) NOT NULL,
  frequency VARCHAR(50) NOT NULL, -- daily, weekly, monthly
  filters JSONB DEFAULT '{}'::jsonb,
  recipient_email VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  created_by INT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_reports_active ON scheduled_reports (is_active, next_run_at);

-- 3. Governance Alerts
CREATE TABLE IF NOT EXISTS governance_alerts (
  id SERIAL PRIMARY KEY,
  alert_type VARCHAR(100) NOT NULL, -- sla_breach_spike, critical_backlog, department_overload, recurring_hotspot, data_quality_issue
  severity VARCHAR(50) NOT NULL DEFAULT 'medium', -- low, medium, high, critical
  title VARCHAR(255) NOT NULL,
  description TEXT,
  entity_type VARCHAR(100), -- department, category, ward, system
  entity_id INT,
  metric_value NUMERIC(10, 2),
  threshold_value NUMERIC(10, 2),
  is_resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_governance_alerts_unresolved ON governance_alerts (is_resolved, severity, created_at DESC);

-- 4. High-Performance Composite Indexes for Governance Analytics
CREATE INDEX IF NOT EXISTS idx_complaints_analytics_window ON complaints (created_at DESC, status, department_id, priority);
CREATE INDEX IF NOT EXISTS idx_complaints_sla_calc ON complaints (sla_due_at, status, resolution_at);
