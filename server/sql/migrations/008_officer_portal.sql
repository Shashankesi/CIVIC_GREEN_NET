-- Migration 008: Officer Portal additions
-- Safe, idempotent alterations to track resolutions and officer operational notes.

-- 1. Add resolution tracking columns to complaints table
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS resolution_note TEXT;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS resolution_at TIMESTAMP WITH TIME ZONE;

-- 2. Create complaint_notes table for officer-submitted comments
CREATE TABLE IF NOT EXISTS complaint_notes (
  id SERIAL PRIMARY KEY,
  complaint_id INTEGER NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index for speedy note queries
CREATE INDEX IF NOT EXISTS idx_complaint_notes_complaint_id ON complaint_notes(complaint_id);
