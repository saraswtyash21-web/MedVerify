-- MedVerify Product Catalog Migration
-- Run this in your Supabase SQL Editor to create the product catalog table.
--
-- This table stores verified product records for barcode lookup.
-- Access is read-only for authenticated app users via RLS.
--
-- Prerequisites:
-- 1. Supabase project with Auth enabled
-- 2. Run supabase/migrations/001_initial.sql first (for auth.users)

-- ============================================================================
-- TABLE: product_catalog
-- ============================================================================
-- Stores verified product records linked to barcodes.
-- This is a shared catalog accessible to all authenticated users (read-only).

CREATE TABLE IF NOT EXISTS public.product_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barcode TEXT NOT NULL UNIQUE,
  product_name TEXT NOT NULL,
  active_ingredient TEXT,
  strength TEXT,
  dosage_form TEXT,
  manufacturer TEXT,
  source TEXT NOT NULL, -- e.g., 'GS1', 'FDA NDC', 'Imported CSV', 'Verified Import'
  source_url TEXT,
  last_verified TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast barcode lookups
CREATE INDEX IF NOT EXISTS idx_product_catalog_barcode 
  ON public.product_catalog(barcode);

-- Index for source filtering
CREATE INDEX IF NOT EXISTS idx_product_catalog_source 
  ON public.product_catalog(source);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================
-- Enable RLS on the table
ALTER TABLE public.product_catalog ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can SELECT (read) all catalog records
-- This is a shared catalog - all authenticated users can look up products
CREATE POLICY "Authenticated users can read product catalog"
  ON public.product_catalog
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Only service_role can INSERT/UPDATE/DELETE
-- (This is implicit - no policy means only service_role can modify)
-- The service_role key should NEVER be exposed in browser code.
-- Catalog updates should be done via:
-- 1. Supabase Dashboard Table Editor
-- 2. Server-side scripts using service_role key
-- 3. CSV import via Supabase Dashboard

-- ============================================================================
-- HELPER FUNCTION: Import from CSV
-- ============================================================================
-- This function can be used to import records via SQL.
-- For large imports, use the Supabase Dashboard CSV import feature instead.

-- Example usage:
-- SELECT import_product_catalog_record('1234567890123', 'Paracetamol 500mg', 'Paracetamol', '500mg', 'Tablet', 'Demo Pharma', 'Imported CSV');

CREATE OR REPLACE FUNCTION public.import_product_catalog_record(
  p_barcode TEXT,
  p_product_name TEXT,
  p_active_ingredient TEXT DEFAULT NULL,
  p_strength TEXT DEFAULT NULL,
  p_dosage_form TEXT DEFAULT NULL,
  p_manufacturer TEXT DEFAULT NULL,
  p_source TEXT DEFAULT 'Manual Import'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with table owner privileges
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.product_catalog (
    barcode, product_name, active_ingredient, strength, dosage_form, manufacturer, source
  ) VALUES (
    p_barcode, p_product_name, p_active_ingredient, p_strength, p_dosage_form, p_manufacturer, p_source
  )
  ON CONFLICT (barcode) DO UPDATE SET
    product_name = EXCLUDED.product_name,
    active_ingredient = EXCLUDED.active_ingredient,
    strength = EXCLUDED.strength,
    dosage_form = EXCLUDED.dosage_form,
    manufacturer = EXCLUDED.manufacturer,
    source = EXCLUDED.source,
    updated_at = now()
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. The product_catalog table is a SHARED catalog accessible to all users.
-- 2. Only authenticated users can read (SELECT) - enforced by RLS.
-- 3. Only the service_role (server-side) can modify records.
-- 4. NEVER expose the service_role key in browser code.
-- 5. To add records:
--    a. Use Supabase Dashboard → Table Editor → product_catalog → Insert
--    b. Use the import_product_catalog_record() function
--    c. Import CSV via Supabase Dashboard
-- 6. Barcode format: Store exactly as printed (preserve leading zeros).
-- 7. For production, consider:
--    - Adding a verification workflow
--    - Tracking who imported each record
--    - Adding expiration dates for catalog records
--    - Implementing soft deletes

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- After running this migration, verify with:
--
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public';
-- -- Should show: scan_history, product_catalog
--
-- SELECT polname FROM pg_policies WHERE tablename = 'product_catalog';
-- -- Should show: "Authenticated users can read product catalog"
--
-- SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'product_catalog';
-- -- Should show: product_catalog | t

-- ============================================================================
-- SAMPLE DATA (OPTIONAL)
-- ============================================================================
-- Uncomment below to add sample records for testing.
-- These are clearly marked as DEMO data.

/*
SELECT import_product_catalog_record(
  '1234567890123',
  'DEMO: Paracetamol 500mg Tablets',
  'Paracetamol',
  '500mg',
  'Tablet',
  'DEMO Pharma Ltd',
  'DEMO - Not a real product'
);

SELECT import_product_catalog_record(
  '9876543210987',
  'DEMO: Ibuprofen 400mg Capsules',
  'Ibuprofen',
  '400mg',
  'Capsule',
  'DEMO Pharmaceuticals',
  'DEMO - Not a real product'
);
*/

-- ============================================================================
