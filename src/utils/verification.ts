// MedVerify Verification Module
// Handles expiry checking, alert matching, and report generation.
//
// IMPORTANT: This module respects src/config.ts. When no real data source is
// configured, verification returns UNABLE_TO_VERIFY with an honest explanation.
// Synthetic demo records are NEVER used for real verification.

import { AlertRecord, getRecordsForMatching, sources, SourceInfo } from '../data/appData';
import { hasAnyRealDataSource, isDemoMode, getEnabledSources } from '../config';
import { SAFETY_DISCLAIMER } from './safety';

export type VerificationOutcome = 'ALERT_MATCH_FOUND' | 'NO_ALERT_FOUND' | 'UNABLE_TO_VERIFY';

export interface VerificationInput {
  productName: string;
  strength: string;
  manufacturer: string;
  batchNumber: string;
  expiryDate: string;
  manufacturingDate: string;
  dosageForm: string;
}

export interface ExpiryCheck {
  status: 'expired' | 'valid' | 'missing' | 'ambiguous';
  message: string;
  expiryDate?: Date;
  daysUntilExpiry?: number;
}

export interface MatchResult {
  matched: boolean;
  matchType: 'exact-batch' | 'product-manufacturer' | 'similar-name' | 'none' | 'no-data-source';
  records: AlertRecord[];
  confidence: 'high' | 'medium' | 'low';
  explanation: string;
  dataSourceUsed: 'real' | 'none';
}

export interface VerificationReport {
  id: string;
  timestamp: string;
  input: VerificationInput;
  outcome: VerificationOutcome;
  expiryCheck: ExpiryCheck;
  matchResult: MatchResult;
  sourcesChecked: SourceInfo[];
  warnings: string[];
  nextSteps: string[];
  disclaimer: string;
  dataModeNote: string;
}

// Normalize text for comparison
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Parse expiry date string to Date object
function parseExpiryDate(dateStr: string): Date | null {
  if (!dateStr) return null;

  const formats = [
    /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/,
    /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2})$/,
    /^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/,
    /^([A-Za-z]+)\s*(\d{4})$/,
  ];

  let match = dateStr.match(formats[0]);
  if (match) {
    const day = parseInt(match[1]);
    const month = parseInt(match[2]) - 1;
    const year = parseInt(match[3]);
    if (day <= 31 && month <= 11) {
      return new Date(year, month, day);
    }
    return new Date(year, day - 1, month + 1);
  }

  match = dateStr.match(formats[1]);
  if (match) {
    const day = parseInt(match[1]);
    const month = parseInt(match[2]) - 1;
    let year = parseInt(match[3]);
    year += year < 50 ? 2000 : 1900;
    if (day <= 31 && month <= 11) {
      return new Date(year, month, day);
    }
  }

  match = dateStr.match(formats[2]);
  if (match) {
    return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
  }

  match = dateStr.match(formats[3]);
  if (match) {
    const monthNames = ['january', 'february', 'march', 'april', 'may', 'june',
      'july', 'august', 'september', 'october', 'november', 'december',
      'jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const monthStr = match[1].toLowerCase();
    const monthIdx = monthNames.indexOf(monthStr);
    if (monthIdx >= 0) {
      const month = monthIdx % 12;
      const year = parseInt(match[2]);
      return new Date(year, month + 1, 0);
    }
  }

  return null;
}

// Check expiry date
export function checkExpiry(expiryDateStr: string): ExpiryCheck {
  if (!expiryDateStr || expiryDateStr.trim() === '') {
    return {
      status: 'missing',
      message: 'No expiry date was detected. This could mean the date is not visible on the packaging, or the OCR could not read it clearly. Medicines without a visible expiry date should not be consumed — consult a pharmacist.'
    };
  }

  const expiryDate = parseExpiryDate(expiryDateStr);
  
  if (!expiryDate || isNaN(expiryDate.getTime())) {
    return {
      status: 'ambiguous',
      message: `The expiry date "${expiryDateStr}" could not be parsed. Please verify the date manually. If uncertain, do not use the medicine and consult a pharmacist.`
    };
  }

  const now = new Date();
  const diffMs = expiryDate.getTime() - now.getTime();
  const daysUntilExpiry = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (daysUntilExpiry < 0) {
    return {
      status: 'expired',
      message: `This medicine EXPIRED on ${expiryDate.toLocaleDateString('en-IN')}. It is ${Math.abs(daysUntilExpiry)} days past its expiry date. Do not use expired medicine. Consult a pharmacist for proper disposal and replacement.`,
      expiryDate,
      daysUntilExpiry
    };
  }

  if (daysUntilExpiry <= 30) {
    return {
      status: 'valid',
      message: `This medicine expires on ${expiryDate.toLocaleDateString('en-IN')} (${daysUntilExpiry} days remaining). It is nearing its expiry date. Use promptly and check storage conditions.`,
      expiryDate,
      daysUntilExpiry
    };
  }

  if (daysUntilExpiry <= 180) {
    return {
      status: 'valid',
      message: `This medicine expires on ${expiryDate.toLocaleDateString('en-IN')} (${daysUntilExpiry} days remaining). It has a moderate shelf life remaining.`,
      expiryDate,
      daysUntilExpiry
    };
  }

  return {
    status: 'valid',
    message: `This medicine expires on ${expiryDate.toLocaleDateString('en-IN')} (${daysUntilExpiry} days remaining). The expiry date has not passed. Note: An unexpired date does NOT guarantee the medicine is genuine or safe.`,
    expiryDate,
    daysUntilExpiry
  };
}

// Calculate string similarity
function stringSimilarity(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);
  
  if (na === nb) return 1.0;
  if (na.length === 0 || nb.length === 0) return 0;
  
  const charsA = new Set(na.split(''));
  const charsB = new Set(nb.split(''));
  let common = 0;
  charsA.forEach(c => { if (charsB.has(c)) common++; });
  
  return common / Math.max(charsA.size, charsB.size);
}

// Match against alert records — ONLY uses real data sources.
// When no real data source is configured, returns a clear "no data source" result.
export function matchAlerts(input: VerificationInput): MatchResult {
  const { records, source, hasRealData } = getRecordsForMatching();

  // No real data source configured — cannot verify
  if (!hasRealData || records.length === 0) {
    return {
      matched: false,
      matchType: 'no-data-source',
      records: [],
      confidence: 'low',
      explanation: 'Unable to verify against live sources. No real quality-alert database is currently connected to MedVerify. To enable verification, a verified data source (e.g., CDSCO NSQ records) must be imported and configured in the application settings.',
      dataSourceUsed: 'none'
    };
  }

  // If no useful identifiers, cannot match
  if (!input.productName && !input.batchNumber && !input.manufacturer) {
    return {
      matched: false,
      matchType: 'none',
      records: [],
      confidence: 'low',
      explanation: 'Insufficient information to check against quality alert records. At minimum, a product name is needed.',
      dataSourceUsed: 'real'
    };
  }

  // Strategy 1: Exact batch match (highest confidence)
  if (input.batchNumber) {
    const exactBatchMatches = records.filter(
      (record: AlertRecord) => normalize(record.batchNumber) === normalize(input.batchNumber)
    );

    if (exactBatchMatches.length > 0) {
      return {
        matched: true,
        matchType: 'exact-batch',
        records: exactBatchMatches,
        confidence: 'high',
        explanation: `EXACT BATCH MATCH: Batch number "${input.batchNumber}" matches ${exactBatchMatches.length} alert record(s) from verified sources. This is the highest confidence match type.`,
        dataSourceUsed: 'real'
      };
    }
  }

  // Strategy 2: Product + Manufacturer match
  if (input.productName && input.manufacturer) {
    const productMfrMatches = records.filter((record: AlertRecord) => {
      const nameMatch = normalize(record.productName) === normalize(input.productName);
      const mfrMatch = normalize(record.manufacturer) === normalize(input.manufacturer);
      return nameMatch && mfrMatch;
    });

    if (productMfrMatches.length > 0) {
      return {
        matched: true,
        matchType: 'product-manufacturer',
        records: productMfrMatches,
        confidence: 'medium',
        explanation: `PRODUCT + MANUFACTURER MATCH from verified sources: "${input.productName}" by "${input.manufacturer}" has ${productMfrMatches.length} alert record(s). However, the batch numbers differ. Alerts for other batches do not necessarily apply to your batch.`,
        dataSourceUsed: 'real'
      };
    }
  }

  // Strategy 3: Product name only (low confidence, candidates only)
  if (input.productName) {
    const nameMatches = records.filter((record: AlertRecord) => {
      const similarity = stringSimilarity(record.productName, input.productName);
      return similarity > 0.7;
    });

    if (nameMatches.length > 0) {
      return {
        matched: false,
        matchType: 'similar-name',
        records: nameMatches,
        confidence: 'low',
        explanation: `SIMILAR NAME CANDIDATES from verified sources: Found ${nameMatches.length} record(s) with similar product names. These are NOT confirmed matches. Manual review is required.`,
        dataSourceUsed: 'real'
      };
    }
  }

  // No matches found in real data
  return {
    matched: false,
    matchType: 'none',
    records: [],
    confidence: 'low',
    explanation: `No matching quality alert records were found in the ${records.length} verified record(s) from configured sources. This does NOT mean the medicine is genuine or safe — it only means no alert was found in the available databases, which may not be comprehensive.`,
    dataSourceUsed: 'real'
  };
}

// Generate verification report
export function generateReport(input: VerificationInput): VerificationReport {
  const expiryCheck = checkExpiry(input.expiryDate);
  const matchResult = matchAlerts(input);
  const warnings: string[] = [];
  const nextSteps: string[] = [];
  const hasRealData = hasAnyRealDataSource();

  // Determine outcome — honest about data availability
  let outcome: VerificationOutcome;
  let dataModeNote: string;
  
  if (!hasRealData) {
    // No real data source — always UNABLE_TO_VERIFY
    outcome = 'UNABLE_TO_VERIFY';
    dataModeNote = 'No verified quality-alert database is connected. Verification against live sources is not possible. Expiry date checking is still performed from the scanned packaging.';
    warnings.push('⚠️ Unable to verify against live sources. No real data source is configured.');
  } else if (matchResult.matched && (matchResult.confidence === 'high' || matchResult.confidence === 'medium')) {
    outcome = 'ALERT_MATCH_FOUND';
    dataModeNote = `Verification performed against ${matchResult.records.length} record(s) from configured real sources.`;
  } else if (matchResult.matchType === 'similar-name') {
    outcome = 'UNABLE_TO_VERIFY';
    dataModeNote = 'Similar names found in verified sources but could not be confirmed as matches.';
    warnings.push('Similar product names were found in verified sources but could not be confirmed as matches.');
  } else if (!input.productName && !input.batchNumber) {
    outcome = 'UNABLE_TO_VERIFY';
    dataModeNote = 'Insufficient information extracted to perform a meaningful check.';
    warnings.push('Insufficient information was extracted to perform a meaningful check.');
  } else {
    outcome = 'NO_ALERT_FOUND';
    dataModeNote = `No alert found in ${matchResult.records.length} verified record(s) from configured sources. This does NOT confirm medicine safety or authenticity.`;
  }

  // Add expiry warnings
  if (expiryCheck.status === 'expired') {
    warnings.push('⚠️ Medicine has EXPIRED. Do not use.');
    nextSteps.push('Dispose of expired medicine properly. Consult a pharmacist for replacement.');
  } else if (expiryCheck.status === 'missing') {
    warnings.push('⚠️ No expiry date detected. Cannot verify freshness.');
    nextSteps.push('Check the packaging manually for an expiry date. If not found, consult a pharmacist.');
  } else if (expiryCheck.status === 'ambiguous') {
    warnings.push('⚠️ Expiry date could not be parsed. Manual verification needed.');
    nextSteps.push('Read the expiry date from the packaging and verify it manually.');
  }

  // Add match-related next steps
  if (outcome === 'ALERT_MATCH_FOUND') {
    nextSteps.push('Do NOT use this medicine until you have consulted a pharmacist or the relevant regulatory authority.');
    nextSteps.push('Note the batch number and alert details for reference.');
    nextSteps.push('Report the issue to CDSCO or your state drug control authority if appropriate.');
  } else if (outcome === 'NO_ALERT_FOUND') {
    nextSteps.push('No alert was found in verified sources, but this does not confirm the medicine is genuine or safe.');
    nextSteps.push('If you have any concerns about the medicine, consult a qualified pharmacist.');
    nextSteps.push('Check the physical condition of the packaging and medicine.');
  } else {
    nextSteps.push('Verification could not be completed. Configure a real data source to enable quality-alert checking.');
    nextSteps.push('Try uploading a clearer image or manually entering the medicine details for expiry checking.');
    nextSteps.push('Consult a pharmacist for professional verification.');
  }

  // Add missing field warnings
  if (!input.batchNumber && hasRealData) {
    warnings.push('Batch number not available — exact batch matching was not possible.');
  }
  if (!input.manufacturer && hasRealData) {
    warnings.push('Manufacturer not identified — manufacturer-level matching was not possible.');
  }

  return {
    id: `report-${Date.now()}`,
    timestamp: new Date().toISOString(),
    input,
    outcome,
    expiryCheck,
    matchResult,
    sourcesChecked: sources,
    warnings,
    nextSteps,
    disclaimer: SAFETY_DISCLAIMER,
    dataModeNote
  };
}

// Format outcome for display
export function formatOutcome(outcome: VerificationOutcome): {
  label: string;
  color: string;
  bgColor: string;
  icon: string;
  description: string;
} {
  switch (outcome) {
    case 'ALERT_MATCH_FOUND':
      return {
        label: 'ALERT MATCH FOUND',
        color: 'text-warning',
        bgColor: 'bg-warning-light',
        icon: '⚠️',
        description: 'A matching quality alert was found in verified sources. This medicine batch or product has been flagged. Do not use until verified by a pharmacist or regulatory authority.'
      };
    case 'NO_ALERT_FOUND':
      return {
        label: 'NO ALERT FOUND IN VERIFIED SOURCES',
        color: 'text-positive',
        bgColor: 'bg-positive-light',
        icon: '✓',
        description: 'No quality alert was found in the verified sources currently connected. This does NOT mean the medicine is genuine, authentic, or safe. The connected databases may not be comprehensive.'
      };
    case 'UNABLE_TO_VERIFY':
      return {
        label: 'UNABLE TO VERIFY',
        color: 'text-gold',
        bgColor: 'bg-ivory',
        icon: '?',
        description: 'Verification could not be completed. This may be because no real data source is configured, or because the extracted information was insufficient or ambiguous. Manual review by a pharmacist is recommended.'
      };
  }
}
