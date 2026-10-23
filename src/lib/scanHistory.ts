// MedVerify Scan History Service
//
// Provides persistent scan history using Supabase when configured.
// Falls back to in-memory storage when Supabase is not available.
//
// Database table: scan_history (see supabase/migrations/001_initial.sql)
// Row Level Security ensures users can only access their own records.

import { getSupabaseClient, isSupabaseConfigured, InsertScanInput } from './supabase';
import { VerificationReport } from '../utils/verification';

export interface ScanHistoryEntry {
  id: string;
  timestamp: string;
  productName: string;
  outcome: string;
  report: VerificationReport;
  barcodeValue?: string | null;
  barcodeFormat?: string | null;
}

// In-memory fallback for demo mode
const memoryHistory: ScanHistoryEntry[] = [];

// Get current user ID from Supabase session
async function getCurrentUserId(): Promise<string | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id || null;
}

// Save a scan to history
export async function saveScanToHistory(
  report: VerificationReport,
  barcodeValue?: string | null,
  barcodeFormat?: string | null
): Promise<ScanHistoryEntry | null> {
  const entry: ScanHistoryEntry = {
    id: report.id,
    timestamp: report.timestamp,
    productName: report.input.productName || 'Unknown',
    outcome: report.outcome,
    report,
    barcodeValue: barcodeValue || null,
    barcodeFormat: barcodeFormat || null,
  };

  // If Supabase is configured, save to database
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const userId = await getCurrentUserId();
    if (!userId) {
      console.warn('Cannot save scan: no authenticated user');
      return null;
    }

    const insertData: InsertScanInput = {
      product_name: report.input.productName || null,
      strength: report.input.strength || null,
      dosage_form: report.input.dosageForm || null,
      manufacturer: report.input.manufacturer || null,
      batch_number: report.input.batchNumber || null,
      manufacturing_date: report.input.manufacturingDate || null,
      expiry_date: report.input.expiryDate || null,
      outcome: report.outcome,
      report_json: report as object,
      barcode_value: barcodeValue || null,
      barcode_format: barcodeFormat || null,
    };

    const { data, error } = await supabase
      .from('scan_history')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Failed to save scan to database:', error);
      return null;
    }

    // Update entry with database ID
    entry.id = data.id;
    return entry;
  }

  // Demo mode: save to in-memory array
  memoryHistory.unshift(entry);
  // Keep only last 50 entries in memory
  if (memoryHistory.length > 50) {
    memoryHistory.pop();
  }
  return entry;
}

// Load scan history for current user
export async function loadScanHistory(limit: number = 50): Promise<ScanHistoryEntry[]> {
  // If Supabase is configured, load from database
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    const userId = await getCurrentUserId();
    if (!userId) return [];

    const { data, error } = await supabase
      .from('scan_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Failed to load scan history:', error);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      timestamp: row.created_at,
      productName: row.product_name || 'Unknown',
      outcome: row.outcome,
      report: row.report_json as VerificationReport,
      barcodeValue: row.barcode_value,
      barcodeFormat: row.barcode_format,
    }));
  }

  // Demo mode: return in-memory history
  return memoryHistory.slice(0, limit);
}

// Delete a scan from history
export async function deleteScanFromHistory(scanId: string): Promise<boolean> {
  // If Supabase is configured, delete from database
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    const { error } = await supabase
      .from('scan_history')
      .delete()
      .eq('id', scanId);

    if (error) {
      console.error('Failed to delete scan:', error);
      return false;
    }
    return true;
  }

  // Demo mode: remove from in-memory array
  const index = memoryHistory.findIndex(entry => entry.id === scanId);
  if (index !== -1) {
    memoryHistory.splice(index, 1);
    return true;
  }
  return false;
}

// Clear all scan history for current user
export async function clearScanHistory(): Promise<boolean> {
  // If Supabase is configured, delete all user's scans
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    const userId = await getCurrentUserId();
    if (!userId) return false;

    const { error } = await supabase
      .from('scan_history')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('Failed to clear scan history:', error);
      return false;
    }
    return true;
  }

  // Demo mode: clear in-memory array
  memoryHistory.length = 0;
  return true;
}

// Check if persistent storage is available
export function isPersistentStorageAvailable(): boolean {
  return isSupabaseConfigured();
}
