-- Migration 021: Phase 5 Advanced Geospatial & Civic Map Intelligence
-- Safe, idempotent PostGIS schema enhancement for municipal boundaries and GIS indexing.

-- 1. Ensure PostGIS is enabled
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Add boundary geometry column to wards table if not present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wards' AND column_name = 'boundary'
  ) THEN
    ALTER TABLE wards ADD COLUMN boundary GEOMETRY(Polygon, 4326);
  END IF;
END $$;

-- 3. Add boundary geometry column to zones table if not present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'zones' AND column_name = 'boundary'
  ) THEN
    ALTER TABLE zones ADD COLUMN boundary GEOMETRY(Polygon, 4326);
  END IF;
END $$;

-- 4. Add boundary geometry column to departments table if not present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'departments' AND column_name = 'boundary'
  ) THEN
    ALTER TABLE departments ADD COLUMN boundary GEOMETRY(Polygon, 4326);
  END IF;
END $$;

-- 5. Add geometry column to civic_hotspots if not present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'civic_hotspots' AND column_name = 'geometry'
  ) THEN
    ALTER TABLE civic_hotspots ADD COLUMN geometry GEOMETRY(Geometry, 4326);
  END IF;
END $$;

-- 6. Spatial Indexes
CREATE INDEX IF NOT EXISTS idx_wards_boundary ON wards USING gist (boundary);
CREATE INDEX IF NOT EXISTS idx_zones_boundary ON zones USING gist (boundary);
CREATE INDEX IF NOT EXISTS idx_departments_boundary ON departments USING gist (boundary);
CREATE INDEX IF NOT EXISTS idx_civic_hotspots_geometry ON civic_hotspots USING gist (geometry);
CREATE INDEX IF NOT EXISTS idx_complaints_status_cat_created ON complaints (status, category, created_at DESC);

-- 7. Populate realistic default municipal polygon boundaries for wards if null
-- Chandigarh Sector coordinates: ~ 30.71 to 30.77 N, 76.74 to 76.82 E
UPDATE wards
SET boundary = ST_SetSRID(ST_MakePolygon(ST_MakeLine(ARRAY[
  ST_MakePoint(76.7500, 30.7300),
  ST_MakePoint(76.7800, 30.7300),
  ST_MakePoint(76.7800, 30.7550),
  ST_MakePoint(76.7500, 30.7550),
  ST_MakePoint(76.7500, 30.7300)
])), 4326)
WHERE id = 1 AND boundary IS NULL;

UPDATE wards
SET boundary = ST_SetSRID(ST_MakePolygon(ST_MakeLine(ARRAY[
  ST_MakePoint(76.7800, 30.7300),
  ST_MakePoint(76.8100, 30.7300),
  ST_MakePoint(76.8100, 30.7550),
  ST_MakePoint(76.7800, 30.7550),
  ST_MakePoint(76.7800, 30.7300)
])), 4326)
WHERE id = 2 AND boundary IS NULL;

UPDATE wards
SET boundary = ST_SetSRID(ST_MakePolygon(ST_MakeLine(ARRAY[
  ST_MakePoint(76.7500, 30.7550),
  ST_MakePoint(76.7800, 30.7550),
  ST_MakePoint(76.7800, 30.7800),
  ST_MakePoint(76.7500, 30.7800),
  ST_MakePoint(76.7500, 30.7550)
])), 4326)
WHERE id = 3 AND boundary IS NULL;

UPDATE wards
SET boundary = ST_SetSRID(ST_MakePolygon(ST_MakeLine(ARRAY[
  ST_MakePoint(76.7800, 30.7550),
  ST_MakePoint(76.8100, 30.7550),
  ST_MakePoint(76.8100, 30.7800),
  ST_MakePoint(76.7800, 30.7800),
  ST_MakePoint(76.7800, 30.7550)
])), 4326)
WHERE id = 4 AND boundary IS NULL;

UPDATE wards
SET boundary = ST_SetSRID(ST_MakePolygon(ST_MakeLine(ARRAY[
  ST_MakePoint(76.7200, 30.7100),
  ST_MakePoint(76.7500, 30.7100),
  ST_MakePoint(76.7500, 30.7350),
  ST_MakePoint(76.7200, 30.7350),
  ST_MakePoint(76.7200, 30.7100)
])), 4326)
WHERE id = 5 AND boundary IS NULL;

-- 8. Populate zone boundaries if null
UPDATE zones
SET boundary = ST_SetSRID(ST_MakePolygon(ST_MakeLine(ARRAY[
  ST_MakePoint(76.7400, 30.7200),
  ST_MakePoint(76.8200, 30.7200),
  ST_MakePoint(76.8200, 30.7850),
  ST_MakePoint(76.7400, 30.7850),
  ST_MakePoint(76.7400, 30.7200)
])), 4326)
WHERE id = 1 AND boundary IS NULL;

UPDATE zones
SET boundary = ST_SetSRID(ST_MakePolygon(ST_MakeLine(ARRAY[
  ST_MakePoint(76.7000, 30.7000),
  ST_MakePoint(76.7500, 30.7000),
  ST_MakePoint(76.7500, 30.7450),
  ST_MakePoint(76.7000, 30.7450),
  ST_MakePoint(76.7000, 30.7000)
])), 4326)
WHERE id = 2 AND boundary IS NULL;
