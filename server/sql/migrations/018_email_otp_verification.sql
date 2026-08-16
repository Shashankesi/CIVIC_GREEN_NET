-- Migration 018: Complete Email OTP Verification & Account Security Hardening
-- Idempotent, safe, and backwards-compatible database migration

-- 1. Ensure `is_verified` column exists on `users` table and preserve all existing users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'is_verified'
  ) THEN
    ALTER TABLE users ADD COLUMN is_verified BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Backfill all existing active / approved / admin users as verified so existing accounts never break
UPDATE users 
SET is_verified = true 
WHERE is_verified IS NULL OR (status IN ('active', 'approved') AND is_verified = false);

-- 2. Ensure `email_verifications` table exists with all required OTP tracking columns
CREATE TABLE IF NOT EXISTS email_verifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  otp_hash VARCHAR(255) NOT NULL,
  purpose VARCHAR(50) DEFAULT 'signup',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified_at TIMESTAMP WITH TIME ZONE,
  attempt_count INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 5,
  last_sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Ensure all columns exist in case table was created by older migrations
DO $$
BEGIN
  ALTER TABLE email_verifications ADD COLUMN IF NOT EXISTS email VARCHAR(255);
  ALTER TABLE email_verifications ADD COLUMN IF NOT EXISTS otp_hash VARCHAR(255);
  ALTER TABLE email_verifications ADD COLUMN IF NOT EXISTS purpose VARCHAR(50) DEFAULT 'signup';
  ALTER TABLE email_verifications ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;
  ALTER TABLE email_verifications ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE;
  ALTER TABLE email_verifications ADD COLUMN IF NOT EXISTS attempt_count INTEGER DEFAULT 0;
  ALTER TABLE email_verifications ADD COLUMN IF NOT EXISTS max_attempts INTEGER DEFAULT 5;
  ALTER TABLE email_verifications ADD COLUMN IF NOT EXISTS last_sent_at TIMESTAMP WITH TIME ZONE DEFAULT now();
  ALTER TABLE email_verifications ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
  ALTER TABLE email_verifications ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT now();
  ALTER TABLE email_verifications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- 3. Composite Indexes for fast lookup, verification, and expiration queries
CREATE INDEX IF NOT EXISTS idx_email_verifications_email_purpose ON email_verifications(LOWER(TRIM(email)), purpose);
CREATE INDEX IF NOT EXISTS idx_email_verifications_pending ON email_verifications(LOWER(TRIM(email)), purpose) WHERE verified_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_email_verifications_expires ON email_verifications(expires_at);
CREATE INDEX IF NOT EXISTS idx_email_verifications_user_id ON email_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_users_is_verified ON users(is_verified);
CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users(LOWER(TRIM(email)));
