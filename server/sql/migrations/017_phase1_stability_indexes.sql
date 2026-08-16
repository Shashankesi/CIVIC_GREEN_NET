-- Migration 017: Phase 1 Stability & Performance Indexes
-- Safe, idempotent indexes for complaint queries, officer queues, notifications, and user lookups.

CREATE INDEX IF NOT EXISTS idx_complaints_user_status_created ON complaints(user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_complaints_officer_status ON complaints(officer_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_complaints_dept_status ON complaints(department_id, status);
CREATE INDEX IF NOT EXISTS idx_complaints_status_priority ON complaints(status, priority);
CREATE INDEX IF NOT EXISTS idx_complaints_created_desc ON complaints(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_role_status ON users(role, status);
CREATE INDEX IF NOT EXISTS idx_complaints_sla_active ON complaints(sla_due_at) WHERE status NOT IN ('resolved', 'closed', 'rejected');
