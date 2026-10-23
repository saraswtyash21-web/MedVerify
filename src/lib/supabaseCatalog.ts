// MedVerify Supabase Product Catalog
// Reads product records from a Supabase table with RLS-protected read access

import { getSupabaseClient, isSupabaseConfigured } from './supabase';
import { ProductCatalog, ProductCatalogRecord, CatalogLookupResult } from './catalog';

export class SupabaseProductCatalog implements ProductCatalog {
  name = 'Supabase Product Catalog';
  
  get isConfigured(): boolean {
    return isSupabaseConfigured();
  }

  async lookup(barcode: string): Promise<CatalogLookupResult> {
    if (!this.isConfigured) {
      return {
        found: false,
        message: 'Product catalog is not configured. No lookup performed.'
      };
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return {
        found: false,
        message: 'Supabase client not available.'
      };
    }

    try {
      // Normalize barcode: preserve leading zeros, trim whitespace
      const normalizedBarcode = barcode.trim();
      
      const { data, error } = await supabase
        .from('product_catalog')
        .select('*')
        .eq('barcode', normalizedBarcode)
        .limit(1);

      if (error) {
        console.error('Catalog lookup error:', error);
        return {
          found: false,
          message: `Catalog lookup failed: ${error.message}`
        };
      }

      if (!data || data.length === 0) {
        return {
          found: false,
          message: 'Barcode read, but this product is not in the connected catalog.'
        };
      }

      const row = data[0];
      const record: ProductCatalogRecord = {
        barcode: row.barcode,
        productName: row.product_name,
        activeIngredient: row.active_ingredient || undefined,
        strength: row.strength || undefined,
        dosageForm: row.dosage_form || undefined,
        manufacturer: row.manufacturer || undefined,
        source: row.source,
        sourceUrl: row.source_url || undefined,
        lastVerified: row.last_verified || undefined,
      };

      return {
        found: true,
        record,
        message: `Product found in catalog: ${record.productName}`
      };
    } catch (err) {
      console.error('Catalog lookup exception:', err);
      return {
        found: false,
        message: 'Catalog lookup failed due to an unexpected error.'
      };
    }
  }

  async getRecordCount(): Promise<number> {
    if (!this.isConfigured) return 0;

    const supabase = getSupabaseClient();
    if (!supabase) return 0;

    try {
      const { count, error } = await supabase
        .from('product_catalog')
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.error('Count error:', error);
        return 0;
      }

      return count || 0;
    } catch {
      return 0;
    }
  }
}

// Local in-memory catalog (for testing or imported CSV data)
export class LocalProductCatalog implements ProductCatalog {
  name: string;
  private records: Map<string, ProductCatalogRecord>;

  constructor(name: string, records: ProductCatalogRecord[] = []) {
    this.name = name;
    this.records = new Map();
    records.forEach(r => this.records.set(r.barcode, r));
  }

  get isConfigured(): boolean {
    return this.records.size > 0;
  }

  async lookup(barcode: string): Promise<CatalogLookupResult> {
    const normalizedBarcode = barcode.trim();
    const record = this.records.get(normalizedBarcode);

    if (!record) {
      return {
        found: false,
        message: 'Barcode read, but this product is not in the connected catalog.'
      };
    }

    return {
      found: true,
      record,
      message: `Product found in catalog: ${record.productName}`
    };
  }

  async getRecordCount(): Promise<number> {
    return this.records.size;
  }

  // Import records from CSV/JSON format
  importRecords(importData: Array<{
    barcode: string;
    product_name: string;
    active_ingredient?: string;
    strength?: string;
    dosage_form?: string;
    manufacturer?: string;
    source: string;
    source_url?: string;
    last_verified?: string;
  }>): number {
    let imported = 0;
    for (const row of importData) {
      if (!row.barcode || !row.product_name) continue;
      
      const record: ProductCatalogRecord = {
        barcode: row.barcode.trim(),
        productName: row.product_name.trim(),
        activeIngredient: row.active_ingredient?.trim(),
        strength: row.strength?.trim(),
        dosageForm: row.dosage_form?.trim(),
        manufacturer: row.manufacturer?.trim(),
        source: row.source,
        sourceUrl: row.source_url,
        lastVerified: row.last_verified,
      };
      
      this.records.set(record.barcode, record);
      imported++;
    }
    return imported;
  }
}

// Get the configured catalog based on environment
let _catalog: ProductCatalog | null = null;

export function getProductCatalog(): ProductCatalog {
  if (!_catalog) {
    // Check if Supabase catalog is configured via environment
    const useSupabaseCatalog = import.meta.env.VITE_USE_SUPABASE_CATALOG === 'true';
    
    if (useSupabaseCatalog && isSupabaseConfigured()) {
      _catalog = new SupabaseProductCatalog();
    } else {
      // Default to empty local catalog
      _catalog = new LocalProductCatalog('No Catalog Configured');
    }
  }
  return _catalog;
}

// Reset catalog (useful for testing)
export function resetProductCatalog(): void {
  _catalog = null;
}

export function isCatalogConfigured(): boolean {
  return getProductCatalog().isConfigured;
}
