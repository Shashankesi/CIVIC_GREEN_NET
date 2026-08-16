-- Performance indexes for fast login lookups and session verification

CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_token ON refresh_tokens(user_id, token);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX IF NOT EXISTS idx_complaints_user_status ON complaints(user_id, status);
CREATE INDEX IF NOT EXISTS idx_complaints_officer_status ON complaints(officer_id, status);
