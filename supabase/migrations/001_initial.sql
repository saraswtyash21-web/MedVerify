-- MedVerify Database Migration
-- Run this in your Supabase SQL Editor to create the required tables and policies.
--
-- Prerequisites:
-- 1. Create a Supabase project at https://app.supabase.com
-- 2. Enable Email Auth in Authentication > Providers
-- 3. Copy and paste this entire file into the SQL Editor and run it
--
-- This migration creates:
-- - scan_history table: stores user scan results
-- - Row Level Security (RLS) policies: users can only access their own records
-- - Indexes for performance

-- ============================================================================
-- TABLE: scan_history
-- ============================================================================
-- Stores each medicine scan result linked to the authenticated user.

CREATE TABLE IF NOT EXISTS public.scan_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Extracted fields from OCR/barcode
  product_name TEXT,
  strength TEXT,
  dosage_form TEXT,
  manufacturer TEXT,
  batch_number TEXT,
  manufacturing_date TEXT,
  expiry_date TEXT,
  
  -- Verification outcome
  outcome TEXT NOT NULL CHECK (outcome IN ('ALERT_MATCH_FOUND', 'NO_ALERT_FOUND', 'UNABLE_TO_VERIFY')),
  
  -- Full report stored as JSONB for flexibility
  report_json JSONB NOT NULL,
  
  -- Barcode data (if scanned)
  barcode_value TEXT,
  barcode_format TEXT
);

-- Index for fast user-scoped queries
CREATE INDEX IF NOT EXISTS idx_scan_history_user_id 
  ON public.scan_history(user_id, created_at DESC);

-- Index for outcome filtering
CREATE INDEX IF NOT EXISTS idx_scan_history_outcome 
  ON public.scan_history(outcome);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================
-- Enable RLS on the table
ALTER TABLE public.scan_history ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only SELECT their own scans
CREATE POLICY "Users can view their own scans"
  ON public.scan_history
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can only INSERT their own scans
CREATE POLICY "Users can insert their own scans"
  ON public.scan_history
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only UPDATE their own scans
CREATE POLICY "Users can update their own scans"
  ON public.scan_history
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only DELETE their own scans
CREATE POLICY "Users can delete their own scans"
  ON public.scan_history
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. The auth.users table is automatically created by Supabase Auth.
-- 2. The foreign key to auth.users ensures scans are deleted when a user is deleted.
-- 3. RLS policies ensure users can ONLY access their own records.
-- 4. The service_role key (server-side) bypasses RLS — never expose it client-side.
-- 5. For production, consider adding:
--    - Rate limiting on inserts
--    - Data retention policies
--    - Backup schedules
--    - Monitoring and alerts
--
-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- After running this migration, verify with:
--
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public';
-- -- Should show: scan_history
--
-- SELECT polname FROM pg_policies WHERE tablename = 'scan_history';
-- -- Should show 4 policies (SELECT, INSERT, UPDATE, DELETE)
--
-- ============================================================================
