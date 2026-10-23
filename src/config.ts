// MedVerify Configuration
// 
// This file declares what is genuinely functional vs. what requires external services.
// No fake credentials, no invented APIs, no synthetic data treated as real.
//
// To enable real verification, configure the relevant data source below and set
// its `enabled` flag to true. Until then, verification returns UNABLE_TO_VERIFY
// with an honest explanation.

export interface DataSourceConfig {
  id: string;
  name: string;
  publisher: string;
  url: string;
  description: string;
  enabled: boolean;
  // A real data source must have one of:
  // - records: a loaded array of verified records (from CSV import, API fetch, etc.)
  // - fetchFn: a function that returns records (for future API integration)
  // If neither is provided and enabled=true, the source is misconfigured.
  recordCount: number;
  retrievalDate: string | null; // null = never retrieved
  lastVerified: string | null;  // null = never verified against live source
  limitations: string;
  requiresCredentials: boolean;
  credentialNotes?: string;
}

export interface AppConfig {
  // Application mode
  // - 'production': only real configured sources are used; demo features disabled
  // - 'demo': demo features (sample scans, synthetic records) are available alongside real sources
  mode: 'production' | 'demo';

  // Data sources for quality-alert verification
  dataSources: DataSourceConfig[];

  // Authentication configuration
  // When `provider` is 'demo', the UI-only localStorage auth is used.
  // For production, configure a real provider (e.g. 'supabase', 'firebase', 'auth0').
  auth: {
    provider: 'demo' | 'supabase' | 'firebase' | 'auth0' | 'custom';
    notes: string;
  };

  // Barcode product lookup
  // Uses a product catalog (Supabase table or local import) to look up barcode numbers.
  // A barcode number alone does not identify, authenticate, or verify a medicine.
  // Only returns results from explicitly configured, verified catalog records.
  barcodeLookup: {
    enabled: boolean;
    provider: null | 'supabase' | 'local' | 'gs1' | 'custom';
    notes: string;
  };

  // WHO Medical Product Alerts
  // Uses WHO official alerts for product safety verification
  whoAlerts: {
    enabled: boolean;
    notes: string;
  };

  // Doctor Medicine Information
  // Uses DailyMed (NIH/NLM) API for comprehensive drug information
  doctorInfo: {
    enabled: boolean;
    provider: null | 'eka' | 'dailymed' | 'custom';
    notes: string;
  };
}

// ============================================================================
// CURRENT CONFIGURATION
// ============================================================================
// This is an honest declaration of what is and is not connected.
// No synthetic data is treated as real. No credentials are invented.

export const config: AppConfig = {
  mode: 'demo',

  dataSources: [], // No safety-alert data sources configured

  auth: {
    provider: 'demo',
    notes: 'Using UI-only localStorage authentication. NOT secure. For production, configure Supabase Auth, Firebase Auth, Auth0, or another real identity provider.'
  },

  barcodeLookup: {
    enabled: false,
    provider: null,
    notes: 'No product catalog is connected. To enable barcode lookup, run the product_catalog migration in Supabase and set VITE_USE_SUPABASE_CATALOG=true in .env'
  },

  whoAlerts: {
    enabled: false,
    notes: 'WHO Medical Product Alerts not loaded. WHO does not provide a public API. Alerts must be manually imported from https://www.who.int/teams/regulation-prequalification/incidents-and-SF/full-list-of-who-medical-product-alerts'
  },

  doctorInfo: {
    enabled: true,
    provider: 'eka',
    notes: 'Eka Care is the primary medication catalogue source for India. DailyMed is available as a supplementary U.S. label source.'
  }
};

// Derived helpers
export function getEnabledSources(): DataSourceConfig[] {
  return config.dataSources.filter(s => s.enabled);
}

export function hasAnyRealDataSource(): boolean {
  return config.dataSources.some(s => s.enabled && s.recordCount > 0);
}

export function getTotalRealRecordCount(): number {
  return config.dataSources
    .filter(s => s.enabled)
    .reduce((sum, s) => sum + s.recordCount, 0);
}

export function isDemoMode(): boolean {
  return config.mode === 'demo';
}
