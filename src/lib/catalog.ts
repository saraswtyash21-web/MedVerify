// MedVerify Product Catalog
// Provides barcode-to-product lookup from verified sources
// 
// This module defines the catalog interface and provides implementations
// for different catalog backends (Supabase, local JSON, etc.)

export interface ProductCatalogRecord {
  barcode: string;
  productName: string;
  activeIngredient?: string;
  strength?: string;
  dosageForm?: string;
  manufacturer?: string;
  source: string; // e.g., "GS1", "FDA NDC", "Imported CSV"
  sourceUrl?: string;
  lastVerified?: string;
}

export interface CatalogLookupResult {
  found: boolean;
  record?: ProductCatalogRecord;
  message: string;
}

export interface ProductCatalog {
  name: string;
  isConfigured: boolean;
  lookup(barcode: string): Promise<CatalogLookupResult>;
  getRecordCount(): Promise<number>;
}

// Import format for CSV/JSON catalog files
export interface CatalogImportFormat {
  barcode: string;
  product_name: string;
  active_ingredient?: string;
  strength?: string;
  dosage_form?: string;
  manufacturer?: string;
  source: string;
  source_url?: string;
  last_verified?: string;
}
