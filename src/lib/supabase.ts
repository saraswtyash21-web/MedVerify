// MedVerify Supabase Client
//
// This module initializes the Supabase client using environment variables.
// It gracefully handles the case where Supabase is not configured.
//
// Environment variables required (see .env.example):
// - VITE_SUPABASE_URL: Your Supabase project URL
// - VITE_SUPABASE_ANON_KEY: Your Supabase anon/public key
// - VITE_AUTH_MODE: 'demo' | 'supabase'

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Read environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const authMode = (import.meta.env.VITE_AUTH_MODE as string) || 'demo';

// Check if Supabase is properly configured
export function isSupabaseConfigured(): boolean {
  return (
    authMode === 'supabase' &&
    typeof supabaseUrl === 'string' &&
    supabaseUrl.length > 0 &&
    !supabaseUrl.startsWith('your-') &&
    typeof supabaseAnonKey === 'string' &&
    supabaseAnonKey.length > 0 &&
    !supabaseAnonKey.startsWith('your-')
  );
}

export function getAuthMode(): 'demo' | 'supabase' {
  return authMode === 'supabase' && isSupabaseConfigured() ? 'supabase' : 'demo';
}

export function getSupabaseConfigError(): string | null {
  if (authMode !== 'supabase') return null;
  
  if (!supabaseUrl || supabaseUrl.startsWith('your-')) {
    return 'VITE_SUPABASE_URL is not configured. Set it in .env or as an environment variable.';
  }
  if (!supabaseAnonKey || supabaseAnonKey.startsWith('your-')) {
    return 'VITE_SUPABASE_ANON_KEY is not configured. Set it in .env or as an environment variable.';
  }
  return null;
}

// Lazy-initialized Supabase client
let _client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    return null;
  }
  
  if (!_client) {
    _client = createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      },
    });
  }
  
  return _client;
}

// Database types for scan_history table
export interface ScanHistoryRow {
  id: string;
  user_id: string;
  created_at: string;
  product_name: string | null;
  strength: string | null;
  dosage_form: string | null;
  manufacturer: string | null;
  batch_number: string | null;
  manufacturing_date: string | null;
  expiry_date: string | null;
  outcome: 'ALERT_MATCH_FOUND' | 'NO_ALERT_FOUND' | 'UNABLE_TO_VERIFY';
  report_json: object;
  barcode_value: string | null;
  barcode_format: string | null;
}

export interface InsertScanInput {
  product_name?: string | null;
  strength?: string | null;
  dosage_form?: string | null;
  manufacturer?: string | null;
  batch_number?: string | null;
  manufacturing_date?: string | null;
  expiry_date?: string | null;
  outcome: 'ALERT_MATCH_FOUND' | 'NO_ALERT_FOUND' | 'UNABLE_TO_VERIFY';
  report_json: object;
  barcode_value?: string | null;
  barcode_format?: string | null;
}
