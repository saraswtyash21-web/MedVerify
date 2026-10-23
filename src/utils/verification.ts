// MedVerify Verification Module
// Handles expiry checking, alert matching, and report generation

import { AlertRecord, alertRecords, sources, SourceInfo } from '../data/appData';

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
  matchType: 'exact-batch' | 'product-manufacturer' | 'similar-name' | 'none';
  records: AlertRecord[];
  confidence: 'high' | 'medium' | 'low';
  explanation: string;
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

  // Try various date formats
  const formats = [
    /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/, // DD/MM/YYYY
    /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2})$/, // DD/MM/YY
    /^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/, // YYYY/MM/DD
    /^([A-Za-z]+)\s*(\d{4})$/, // Month YYYY
  ];

  // DD/MM/YYYY
  let match = dateStr.match(formats[0]);
  if (match) {
    const day = parseInt(match[1]);
    const month = parseInt(match[2]) - 1;
    const year = parseInt(match[3]);
    // Assume DD/MM/YYYY format (Indian standard)
    if (day <= 31 && month <= 11) {
      return new Date(year, month, day);
    }
    // Try MM/DD/YYYY
    return new Date(year, day - 1, month + 1);
  }

  // DD/MM/YY
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

  // YYYY/MM/DD
  match = dateStr.match(formats[2]);
  if (match) {
    return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
  }

  // Month YYYY
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
      // End of the month
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

// Calculate string similarity (simple Levenshtein-based)
function stringSimilarity(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);
  
  if (na === nb) return 1.0;
  if (na.length === 0 || nb.length === 0) return 0;
  
  // Simple character overlap ratio
  const charsA = new Set(na.split(''));
  const charsB = new Set(nb.split(''));
  let common = 0;
  charsA.forEach(c => { if (charsB.has(c)) common++; });
  
  return common / Math.max(charsA.size, charsB.size);
}

// Match against alert records
export function matchAlerts(input: VerificationInput): MatchResult {
  const warnings: string[] = [];
  
  // If no useful identifiers, cannot match
  if (!input.productName && !input.batchNumber && !input.manufacturer) {
    return {
      matched: false,
      matchType: 'none',
      records: [],
      confidence: 'low',
      explanation: 'Insufficient information to check against quality alert records. At minimum, a product name is needed.'
    };
  }

  // Strategy 1: Exact batch match (highest confidence)
  if (input.batchNumber) {
    const exactBatchMatches = alertRecords.filter(
      record => normalize(record.batchNumber) === normalize(input.batchNumber)
    );

    if (exactBatchMatches.length > 0) {
      return {
        matched: true,
        matchType: 'exact-batch',
        records: exactBatchMatches,
        confidence: 'high',
        explanation: `EXACT BATCH MATCH: Batch number "${input.batchNumber}" matches ${exactBatchMatches.length} alert record(s). This is the highest confidence match type. The specific batch has been flagged for quality concerns.`
      };
    }
  }

  // Strategy 2: Product + Manufacturer match
  if (input.productName && input.manufacturer) {
    const productMfrMatches = alertRecords.filter(record => {
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
        explanation: `PRODUCT + MANUFACTURER MATCH: The product "${input.productName}" by "${input.manufacturer}" has ${productMfrMatches.length} alert record(s). However, the batch numbers differ. Alerts for other batches do not necessarily apply to your batch. Review the specific batch numbers in the matched records.`
      };
    }
  }

  // Strategy 3: Product name only (low confidence, candidates only)
  if (input.productName) {
    const nameMatches = alertRecords.filter(record => {
      const similarity = stringSimilarity(record.productName, input.productName);
      return similarity > 0.7;
    });

    if (nameMatches.length > 0) {
      return {
        matched: false,
        matchType: 'similar-name',
        records: nameMatches,
        confidence: 'low',
        explanation: `SIMILAR NAME CANDIDATES: Found ${nameMatches.length} record(s) with similar product names. These are NOT confirmed matches. Product name similarity alone is insufficient to confirm a batch match. Different strengths, manufacturers, or batches may be involved. Manual review is required.`
      };
    }
  }

  // No matches found
  return {
    matched: false,
    matchType: 'none',
    records: [],
    confidence: 'low',
    explanation: 'No matching quality alert records were found in the checked sources. This does NOT mean the medicine is genuine or safe — it only means no alert was found in the available databases, which may not be comprehensive.'
  };
}

// Generate verification report
export function generateReport(input: VerificationInput): VerificationReport {
  const expiryCheck = checkExpiry(input.expiryDate);
  const matchResult = matchAlerts(input);
  const warnings: string[] = [];
  const nextSteps: string[] = [];

  // Determine outcome
  let outcome: VerificationOutcome;
  
  if (matchResult.matched && matchResult.confidence === 'high') {
    outcome = 'ALERT_MATCH_FOUND';
  } else if (matchResult.matched || matchResult.matchType === 'product-manufacturer') {
    outcome = 'ALERT_MATCH_FOUND';
  } else if (matchResult.matchType === 'similar-name') {
    outcome = 'UNABLE_TO_VERIFY';
    warnings.push('Similar product names were found in alert records but could not be confirmed as matches.');
  } else if (!input.productName && !input.batchNumber) {
    outcome = 'UNABLE_TO_VERIFY';
    warnings.push('Insufficient information was extracted to perform a meaningful check.');
  } else {
    outcome = 'NO_ALERT_FOUND';
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
    nextSteps.push('No alert was found, but this does not confirm the medicine is genuine or safe.');
    nextSteps.push('If you have any concerns about the medicine, consult a qualified pharmacist.');
    nextSteps.push('Check the physical condition of the packaging and medicine.');
  } else {
    nextSteps.push('Verification could not be completed due to insufficient or ambiguous information.');
    nextSteps.push('Try uploading a clearer image or manually entering the medicine details.');
    nextSteps.push('Consult a pharmacist for professional verification.');
  }

  // Add missing field warnings
  if (!input.batchNumber) {
    warnings.push('Batch number not available — exact batch matching was not possible.');
  }
  if (!input.manufacturer) {
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
    disclaimer: 'MedVerify provides informational checks against the records available to it. It cannot certify authenticity or guarantee medicine safety. For concerns, consult a qualified pharmacist or the relevant official authority.'
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
        description: 'A matching quality alert was found in the checked sources. This medicine batch or product has been flagged. Do not use until verified by a pharmacist or regulatory authority.'
      };
    case 'NO_ALERT_FOUND':
      return {
        label: 'NO ALERT FOUND IN CHECKED SOURCES',
        color: 'text-positive',
        bgColor: 'bg-positive-light',
        icon: '✓',
        description: 'No quality alert was found in the databases checked. This does NOT mean the medicine is genuine, authentic, or safe. The checked databases may not be comprehensive.'
      };
    case 'UNABLE_TO_VERIFY':
      return {
        label: 'UNABLE TO VERIFY',
        color: 'text-gold',
        bgColor: 'bg-ivory',
        icon: '?',
        description: 'Verification could not be completed due to insufficient, ambiguous, or conflicting information. Manual review by a pharmacist is recommended.'
      };
  }
}
