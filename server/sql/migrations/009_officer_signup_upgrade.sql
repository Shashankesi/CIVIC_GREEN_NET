-- Migration 009: Officer signup upgrade & master data tables
-- Idempotent, safe, and backwards-compatible database script

-- 1. Create Municipalities, Zones, and Wards master tables
CREATE TABLE IF NOT EXISTS municipalities (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS zones (
  id SERIAL PRIMARY KEY,
  municipality_id INTEGER NOT NULL REFERENCES municipalities(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(municipality_id, name)
);

CREATE TABLE IF NOT EXISTS wards (
  id SERIAL PRIMARY KEY,
  zone_id INTEGER NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(zone_id, name)
);

-- 2. Drop old status check constraint and create updated status list constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_status_check;
ALTER TABLE users ADD CONSTRAINT users_status_check CHECK (status IN ('active', 'pending', 'approved', 'suspended', 'rejected', 'blocked'));

-- 3. Add upgraded officer columns directly to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS municipality_id INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS zone_id INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ward_id INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS jurisdiction TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS designation VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS employee_id VARCHAR(100) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_by INTEGER;

-- 4. Set up foreign key references for integrity check constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname='fk_users_municipality'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT fk_users_municipality FOREIGN KEY (municipality_id) REFERENCES municipalities(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname='fk_users_zone'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT fk_users_zone FOREIGN KEY (zone_id) REFERENCES zones(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname='fk_users_ward'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT fk_users_ward FOREIGN KEY (ward_id) REFERENCES wards(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname='fk_users_approved_by'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT fk_users_approved_by FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 5. Seed realistic departments
INSERT INTO departments (name) VALUES
  ('Sanitation & Waste Management'),
  ('Roads & Infrastructure'),
  ('Street Lighting'),
  ('Water Supply'),
  ('Sewerage & Drainage'),
  ('Public Health'),
  ('Parks & Horticulture'),
  ('Traffic & Transport'),
  ('Electrical'),
  ('General Administration')
ON CONFLICT (name) DO NOTHING;

-- 6. Seed municipalities, zones, and wards
INSERT INTO municipalities (name) VALUES
  ('Chandigarh'),
  ('Mohali'),
  ('Panchkula')
ON CONFLICT (name) DO NOTHING;

-- Seed Zones and Wards for Chandigarh
DO $$
DECLARE
  chd_id INTEGER;
  z1_id INTEGER;
  z2_id INTEGER;
  z3_id INTEGER;
  z4_id INTEGER;
BEGIN
  SELECT id INTO chd_id FROM municipalities WHERE name = 'Chandigarh';

  INSERT INTO zones (municipality_id, name) VALUES (chd_id, 'Zone 1') ON CONFLICT (municipality_id, name) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO z1_id;
  INSERT INTO zones (municipality_id, name) VALUES (chd_id, 'Zone 2') ON CONFLICT (municipality_id, name) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO z2_id;
  INSERT INTO zones (municipality_id, name) VALUES (chd_id, 'Zone 3') ON CONFLICT (municipality_id, name) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO z3_id;
  INSERT INTO zones (municipality_id, name) VALUES (chd_id, 'Zone 4') ON CONFLICT (municipality_id, name) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO z4_id;

  INSERT INTO wards (zone_id, name) VALUES (z1_id, 'Ward 1'), (z1_id, 'Ward 2'), (z1_id, 'Ward 3') ON CONFLICT (zone_id, name) DO NOTHING;
  INSERT INTO wards (zone_id, name) VALUES (z2_id, 'Ward 4'), (z2_id, 'Ward 5'), (z2_id, 'Ward 6') ON CONFLICT (zone_id, name) DO NOTHING;
  INSERT INTO wards (zone_id, name) VALUES (z3_id, 'Ward 7'), (z3_id, 'Ward 8'), (z3_id, 'Ward 17') ON CONFLICT (zone_id, name) DO NOTHING;
  INSERT INTO wards (zone_id, name) VALUES (z4_id, 'Ward 10'), (z4_id, 'Ward 11'), (z4_id, 'Ward 12') ON CONFLICT (zone_id, name) DO NOTHING;
END $$;

-- Seed Zones and Wards for Mohali
DO $$
DECLARE
  moh_id INTEGER;
  z_a_id INTEGER;
  z_b_id INTEGER;
BEGIN
  SELECT id INTO moh_id FROM municipalities WHERE name = 'Mohali';

  INSERT INTO zones (municipality_id, name) VALUES (moh_id, 'Zone A') ON CONFLICT (municipality_id, name) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO z_a_id;
  INSERT INTO zones (municipality_id, name) VALUES (moh_id, 'Zone B') ON CONFLICT (municipality_id, name) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO z_b_id;

  INSERT INTO wards (zone_id, name) VALUES (z_a_id, 'Ward A1'), (z_a_id, 'Ward A2') ON CONFLICT (zone_id, name) DO NOTHING;
  INSERT INTO wards (zone_id, name) VALUES (z_b_id, 'Ward B1'), (z_b_id, 'Ward B2') ON CONFLICT (zone_id, name) DO NOTHING;
END $$;
