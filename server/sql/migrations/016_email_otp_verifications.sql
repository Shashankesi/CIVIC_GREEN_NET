-- Migration 016: Complete Email OTP Verification & Email Service Hardening
-- Idempotent, safe, and backwards-compatible database script

-- 1. Ensure `is_verified` column exists on users and backfill existing active users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'is_verified'
  ) THEN
    ALTER TABLE users ADD COLUMN is_verified BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Backfill all existing active / approved / admin users as verified so they never get locked out
UPDATE users 
SET is_verified = true 
WHERE is_verified IS NULL OR (status IN ('active', 'approved') AND is_verified = false);

-- 2. Upgrade `email_verifications` table with robust OTP tracking columns
CREATE TABLE IF NOT EXISTS email_verifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  token TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE email_verifications ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE email_verifications ADD COLUMN IF NOT EXISTS otp_hash VARCHAR(255);
ALTER TABLE email_verifications ADD COLUMN IF NOT EXISTS purpose VARCHAR(50) DEFAULT 'signup';
ALTER TABLE email_verifications ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE email_verifications ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE email_verifications ADD COLUMN IF NOT EXISTS attempt_count INTEGER DEFAULT 0;
ALTER TABLE email_verifications ADD COLUMN IF NOT EXISTS max_attempts INTEGER DEFAULT 5;
ALTER TABLE email_verifications ADD COLUMN IF NOT EXISTS last_sent_at TIMESTAMP WITH TIME ZONE DEFAULT now();
ALTER TABLE email_verifications ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE email_verifications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Make token nullable in case it had NOT NULL in legacy installations
DO $$
BEGIN
  ALTER TABLE email_verifications ALTER COLUMN token DROP NOT NULL;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- 3. Performance & Lookup Indexes
CREATE INDEX IF NOT EXISTS idx_email_verifications_email_purpose ON email_verifications(LOWER(TRIM(email)), purpose);
CREATE INDEX IF NOT EXISTS idx_email_verifications_expires ON email_verifications(expires_at);
CREATE INDEX IF NOT EXISTS idx_users_is_verified ON users(is_verified);
