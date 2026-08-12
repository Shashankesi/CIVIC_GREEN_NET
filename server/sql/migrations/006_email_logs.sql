-- Migration 006: Email Logs Table
-- Keeps track of all sent, pending, and failed email notifications for auditing and retrying.

CREATE TABLE IF NOT EXISTS email_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  complaint_id INTEGER REFERENCES complaints(id) ON DELETE SET NULL,
  event_type VARCHAR(100) NOT NULL,
  recipient VARCHAR(255) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending', -- pending, sent, failed
  provider_message_id TEXT,
  error_message TEXT,
  deduplication_key TEXT UNIQUE,
  attempt_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  sent_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_email_logs_event_type ON email_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON email_logs(created_at DESC);
