// MedVerify Data Layer
// 
// IMPORTANT: This file contains NO real alert records.
// All records here are clearly marked as DEMO data for UI demonstration only.
// Real verification requires configuring a data source in src/config.ts.
//
// The `sources` array reflects what is actually loaded — see src/config.ts
// for the authoritative configuration.

import { config, getEnabledSources, hasAnyRealDataSource } from '../config';

export interface AlertRecord {
  id: string;
  productName: string;
  manufacturer: string;
  batchNumber: string;
  strength?: string;
  reason: string;
  sourceUrl: string;
  publicationDate: string;
  reportingPeriod?: string;
  // Marks whether this record comes from a real verified source or is synthetic demo data
  isDemo: boolean;
}

export interface SourceInfo {
  id: string;
  name: string;
  publisher: string;
  url: string;
  description: string;
  enabled: boolean;
  retrievalDate: string | null;
  lastVerified: string | null;
  publicationDate?: string;
  limitations: string;
  recordCount: number;
  requiresCredentials: boolean;
  credentialNotes?: string;
}

// ============================================================================
// REAL DATA SOURCES
// ============================================================================
// This list is derived from src/config.ts. It honestly reflects what is loaded.
// When no source is enabled, verification returns UNABLE_TO_VERIFY.
export const sources: SourceInfo[] = config.dataSources.map(s => ({
  id: s.id,
  name: s.name,
  publisher: s.publisher,
  url: s.url,
  description: s.description,
  enabled: s.enabled,
  retrievalDate: s.retrievalDate,
  lastVerified: s.lastVerified,
  publicationDate: 'Ongoing',
  limitations: s.limitations,
  recordCount: s.recordCount,
  requiresCredentials: s.requiresCredentials,
  credentialNotes: s.credentialNotes
}));

// Real records loaded from enabled sources.
// Currently EMPTY — no real data source is configured.
// To add real records, import them from a CSV or API and populate this array,
// then set the corresponding source's `enabled: true` in src/config.ts.
export const realAlertRecords: AlertRecord[] = [];

// ============================================================================
// DEMO DATA — clearly separated, never used in real verification
// ============================================================================
// These records exist ONLY for UI demonstration and testing.
// They are NOT real CDSCO records. They are NOT used when verifying real scans
// unless the application is explicitly in demo mode AND the user opts in.

export const DEMO_ALERT_RECORDS: AlertRecord[] = [
  {
    id: 'demo-001',
    productName: 'Paracetamol',
    manufacturer: 'Demo Pharma Ltd',
    batchNumber: 'DP2024001',
    strength: '500mg',
    reason: 'DEMO RECORD — Substandard dissolution test results (synthetic example for UI demonstration only)',
    sourceUrl: 'https://cdscoonline.gov.in/CDSCO/viewPublicNSQDrug',
    publicationDate: '2024-06-15',
    reportingPeriod: 'Q2 2024',
    isDemo: true
  },
  {
    id: 'demo-002',
    productName: 'Amoxicillin',
    manufacturer: 'Sample Medicines Inc',
    batchNumber: 'SM-AMX-2024-089',
    strength: '250mg',
    reason: 'DEMO RECORD — Potency below specification (synthetic example for UI demonstration only)',
    sourceUrl: 'https://cdscoonline.gov.in/CDSCO/viewPublicNSQDrug',
    publicationDate: '2024-07-20',
    reportingPeriod: 'Q3 2024',
    isDemo: true
  },
  {
    id: 'demo-003',
    productName: 'Metformin',
    manufacturer: 'HealthCorp Pharmaceuticals',
    batchNumber: 'HC-MET-500-B1234',
    strength: '500mg',
    reason: 'DEMO RECORD — Impurity levels above permitted limits (synthetic example for UI demonstration only)',
    sourceUrl: 'https://cdscoonline.gov.in/CDSCO/viewPublicNSQDrug',
    publicationDate: '2024-08-10',
    reportingPeriod: 'Q3 2024',
    isDemo: true
  }
];

// Helper: get records available for matching based on current mode
export function getRecordsForMatching(): {
  records: AlertRecord[];
  source: 'real' | 'demo' | 'none';
  hasRealData: boolean;
} {
  const hasReal = hasAnyRealDataSource();
  
  if (hasReal) {
    return { records: realAlertRecords, source: 'real', hasRealData: true };
  }
  
  // No real data — return empty. Demo records are NOT used for verification.
  return { records: [], source: 'none', hasRealData: false };
}

// ============================================================================
// KNOWLEDGE BASE — for the Health Assistant chatbot
// ============================================================================
// These are general medicine information entries from authoritative sources.
// They are NOT used for verification — only for answering user questions.

export interface KnowledgeEntry {
  id: string;
  topic: string;
  keywords: string[];
  content: string;
  contentHindi?: string;
  source: string;
  sourceUrl?: string;
  category: 'medicine-info' | 'safety' | 'general' | 'symptoms';
}

export const knowledgeBase: KnowledgeEntry[] = [
  {
    id: 'kb-001',
    topic: 'Expiry Date Importance',
    keywords: ['expiry', 'expiration', 'date', 'expired', 'use by', 'valid'],
    content: 'The expiry date on medicine packaging indicates the date until which the manufacturer guarantees full potency and safety when stored as directed. Using medicine after its expiry date is not recommended as the medicine may have reduced effectiveness or could potentially cause harm.',
    contentHindi: 'दवा की पैकेजिंग पर एक्सपायरी डेट वह तारीख है जिस तक निर्माता पूर्ण प्रभावकारिता और सुरक्षा की गारंटी देता है। एक्सपायरी डेट के बाद दवा का उपयोग करने की सलाह नहीं दी जाती।',
    source: 'WHO Guidelines on Medicine Storage',
    sourceUrl: 'https://www.who.int/news-room/fact-sheets',
    category: 'safety'
  },
  {
    id: 'kb-002',
    topic: 'Batch Number Significance',
    keywords: ['batch', 'lot', 'number', 'lot number', 'batch number'],
    content: 'The batch or lot number is a unique identifier assigned to a specific production run of medicine. It helps manufacturers and regulators track and recall specific batches if quality issues are found.',
    contentHindi: 'बैच या लॉट नंबर दवा के एक विशिष्ट उत्पादन रन को assigned किया गया एक अद्वितीय पहचानकर्ता है।',
    source: 'CDSCO Guidelines on Drug Traceability',
    category: 'medicine-info'
  },
  {
    id: 'kb-003',
    topic: 'What does No Alert Found mean',
    keywords: ['no alert', 'not found', 'safe', 'genuine', 'authentic', 'real'],
    content: 'IMPORTANT: "No Alert Found" does NOT mean the medicine is genuine, authentic, or safe. It only means that no quality alert was found in the specific databases checked. The checked databases may not be comprehensive. For complete assurance, consult a qualified pharmacist or the relevant regulatory authority.',
    contentHindi: 'महत्वपूर्ण: "कोई अलर्ट नहीं मिला" का मतलब यह नहीं है कि दवा असली, प्रमाणिक या सुरक्षित है। पूर्ण आश्वासन के लिए, एक योग्य फार्मासिस्ट से परामर्श करें।',
    source: 'MedVerify Safety Policy',
    category: 'safety'
  },
  {
    id: 'kb-004',
    topic: 'How to store medicines properly',
    keywords: ['store', 'storage', 'temperature', 'keep', 'refrigerate', 'cool'],
    content: 'Most medicines should be stored in a cool, dry place away from direct sunlight. Some medicines require refrigeration (2-8°C). Always follow storage instructions on the packaging. Keep medicines away from children.',
    contentHindi: 'ज्यादातर दवाओं को ठंडी, सूखी जगह पर सीधी धूप से दूर रखना चाहिए। कुछ दवाओं को रेफ्रिजरेशन (2-8°C) की आवश्यकता होती है।',
    source: 'WHO Patient Safety Guidelines',
    sourceUrl: 'https://www.who.int/teams/integrated-health-services/patient-safety',
    category: 'safety'
  },
  {
    id: 'kb-005',
    topic: 'Reporting suspected quality issues',
    keywords: ['report', 'complaint', 'suspected', 'counterfeit', 'fake', 'problem'],
    content: 'If you suspect a medicine quality issue, report it to: 1) Your pharmacist or doctor immediately, 2) CDSCO through their official portal, 3) Your state drug control authority. Do not consume the medicine if you suspect quality issues.',
    contentHindi: 'यदि आपको दवा की गुणवत्ता में समस्या का संदेह है, तो अपने फार्मासिस्ट या डॉक्टर को तुरंत रिपोर्ट करें।',
    source: 'CDSCO Consumer Reporting Guidelines',
    sourceUrl: 'https://cdsco.gov.in',
    category: 'safety'
  },
  {
    id: 'kb-006',
    topic: 'Understanding medicine labels',
    keywords: ['label', 'package', 'information', 'read', 'instructions', 'dosage'],
    content: 'Medicine labels typically contain: Medicine name (generic and brand), Strength/dosage, Manufacturer name, Batch number, Manufacturing date, Expiry date, Storage instructions, Dosage form (tablet, capsule, syrup etc).',
    contentHindi: 'दवा के लेबल में आमतौर पर शामिल होते हैं: दवा का नाम, शक्ति/खुराक, निर्माता का नाम, बैच नंबर, निर्माण तिथि, समाप्ति तिथि, भंडारण निर्देश।',
    source: 'MedVerify Patient Education Materials',
    category: 'medicine-info'
  },
  {
    id: 'kb-007',
    topic: 'When to seek emergency medical help',
    keywords: ['emergency', 'urgent', 'severe', 'allergic', 'reaction', 'breathing', 'chest pain'],
    content: 'SEEK IMMEDIATE MEDICAL ATTENTION if you experience: Difficulty breathing, Swelling of face/lips/tongue, Severe allergic reaction, Chest pain, Unconsciousness, Severe bleeding. Do NOT rely on MedVerify for emergency medical decisions. Call emergency services immediately.',
    contentHindi: 'तुरंत चिकित्सा सहायता लें यदि आपको सांस लेने में कठिनाई, गंभीर एलर्जिक प्रतिक्रिया, छाती में दर्द, बेहोशी का अनुभव हो। MedVerify पर आपातकालीन निर्णयों के लिए निर्भर न रहें।',
    source: 'WHO Emergency Response Guidelines',
    category: 'symptoms'
  },
  {
    id: 'kb-008',
    topic: 'About MedVerify',
    keywords: ['medverify', 'about', 'what is', 'how does', 'help', 'use'],
    content: 'MedVerify is an AI-powered medicine packaging intelligence tool. It helps users read medicine packaging, check expiry dates, and compare details against available quality-alert records. It is NOT a laboratory, regulatory authority, or medical diagnosis system. It provides informational checks only.',
    contentHindi: 'MedVerify एक AI-संचालित दवा पैकेजिंग इंटेलिजेंस टूल है। यह प्रयोगशाला, नियामक प्राधिकरण या चिकित्सा निदान प्रणाली नहीं है।',
    source: 'MedVerify Documentation',
    category: 'general'
  }
];
