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
  // No product database is connected. A barcode number alone does not identify,
  // authenticate, or verify a medicine. To enable lookup, configure GS1 or similar.
  barcodeLookup: {
    enabled: boolean;
    provider: null | 'gs1' | 'openfoodfacts' | 'custom';
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

  dataSources: [
    {
      id: 'cdsko-nsq',
      name: 'CDSCO Not of Standard Quality (NSQ) Drugs',
      publisher: 'Central Drugs Standard Control Organisation, India',
      url: 'https://cdscoonline.gov.in/CDSCO/viewPublicNSQDrug',
      description: 'Public records of drugs found not of standard quality by CDSCO.',
      enabled: false, // NOT connected — no records loaded
      recordCount: 0,
      retrievalDate: null,
      lastVerified: null,
      limitations: 'CDSCO does not publish a downloadable dataset or public API. Records must be imported manually from the website or obtained via an official data-sharing agreement.',
      requiresCredentials: false,
      credentialNotes: 'No API key required, but records must be manually imported or scraped in compliance with CDSCO terms of use.'
    },
    {
      id: 'cdsco-alerts',
      name: 'CDSCO Drug Safety Alerts',
      publisher: 'Central Drugs Standard Control Organisation, India',
      url: 'https://www.cdsco.gov.in/opencms/opencms/en/Notifications/Alerts',
      description: 'Official safety alerts and notifications issued by CDSCO.',
      enabled: false, // NOT connected — no records loaded
      recordCount: 0,
      retrievalDate: null,
      lastVerified: null,
      limitations: 'Alerts are published as PDF/HTML notices, not as structured data. Manual import is required.',
      requiresCredentials: false,
      credentialNotes: 'No API key required, but records must be manually imported.'
    }
  ],

  auth: {
    provider: 'demo',
    notes: 'Using UI-only localStorage authentication. NOT secure. For production, configure Supabase Auth, Firebase Auth, Auth0, or another real identity provider.'
  },

  barcodeLookup: {
    enabled: false,
    provider: null,
    notes: 'No product database is connected. A scanned barcode number is displayed but not looked up. To enable, configure GS1 Data Hub, Open Food Facts, or a national drug database API.'
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
