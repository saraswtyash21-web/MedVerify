// WHO Medical Product Alerts Data Model
// Source: https://www.who.int/teams/regulation-prequalification/incidents-and-SF/full-list-of-who-medical-product-alerts

export interface WHOAlert {
  id: string;
  alertNumber: string; // e.g., "3/2026"
  date: string; // ISO date string
  productName: string; // Brand name
  genericName?: string; // Generic/INN name
  manufacturer?: string;
  batchNumbers?: string[]; // Specific batch numbers if mentioned
  countries?: string[]; // Countries where detected
  issueType: 'falsified' | 'substandard' | 'contaminated' | 'other';
  description: string;
  risks: string;
  advice: string;
  sourceUrl: string;
  lastChecked: string; // When this record was last verified
}

export interface WHOAlertMatch {
  matched: boolean;
  alert?: WHOAlert;
  matchType: 'exact' | 'partial' | 'none';
  matchedFields: string[];
  confidence: 'high' | 'medium' | 'low';
  explanation: string;
}

// WHO Alert data management
// Since WHO doesn't provide a public API, alerts must be manually imported
// This module provides the structure and matching logic

let whoAlerts: WHOAlert[] = [];
let lastRetrievalDate: string | null = null;

export function setWHOAlerts(alerts: WHOAlert[], retrievalDate: string): void {
  whoAlerts = alerts;
  lastRetrievalDate = retrievalDate;
}

export function getWHOAlerts(): WHOAlert[] {
  return whoAlerts;
}

export function getWHOLastRetrievalDate(): string | null {
  return lastRetrievalDate;
}

export function getWHOAlertCount(): number {
  return whoAlerts.length;
}

// Normalize text for comparison
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Calculate string similarity (0-1)
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

// Match scan results against WHO alerts
export function matchWHOAlert(scanData: {
  productName?: string;
  genericName?: string;
  manufacturer?: string;
  batchNumber?: string;
}): WHOAlertMatch {
  if (whoAlerts.length === 0) {
    return {
      matched: false,
      matchType: 'none',
      matchedFields: [],
      confidence: 'low',
      explanation: 'No WHO alert records are currently loaded. Unable to verify against WHO alerts.'
    };
  }

  // If we have no identifying information, cannot match
  if (!scanData.productName && !scanData.genericName && !scanData.batchNumber) {
    return {
      matched: false,
      matchType: 'none',
      matchedFields: [],
      confidence: 'low',
      explanation: 'Insufficient information to check against WHO alerts. Product name, generic name, or batch number required.'
    };
  }

  // Strategy 1: Exact batch match (highest confidence)
  if (scanData.batchNumber) {
    for (const alert of whoAlerts) {
      if (alert.batchNumbers && alert.batchNumbers.length > 0) {
        const normalizedBatch = normalize(scanData.batchNumber);
        const matchedBatch = alert.batchNumbers.find(b => normalize(b) === normalizedBatch);
        
        if (matchedBatch) {
          // Verify product name also matches
          const nameMatches = 
            (scanData.productName && alert.productName && 
             stringSimilarity(scanData.productName, alert.productName) > 0.8) ||
            (scanData.genericName && alert.genericName && 
             stringSimilarity(scanData.genericName, alert.genericName) > 0.8);
          
          if (nameMatches) {
            return {
              matched: true,
              alert,
              matchType: 'exact',
              matchedFields: ['batchNumber', 'productName'],
              confidence: 'high',
              explanation: `EXACT MATCH: Batch number "${scanData.batchNumber}" matches WHO Alert ${alert.alertNumber}. This product has been flagged by WHO as ${alert.issueType}.`
            };
          }
        }
      }
    }
  }

  // Strategy 2: Product name match (medium confidence)
  if (scanData.productName || scanData.genericName) {
    for (const alert of whoAlerts) {
      const productNameMatch = scanData.productName && alert.productName && 
        stringSimilarity(scanData.productName, alert.productName) > 0.85;
      
      const genericNameMatch = scanData.genericName && alert.genericName && 
        stringSimilarity(scanData.genericName, alert.genericName) > 0.85;
      
      if (productNameMatch || genericNameMatch) {
        // Check if manufacturer also matches (if available)
        const manufacturerMatch = !scanData.manufacturer || !alert.manufacturer ||
          stringSimilarity(scanData.manufacturer, alert.manufacturer) > 0.8;
        
        if (manufacturerMatch) {
          const matchedFields = [];
          if (productNameMatch) matchedFields.push('productName');
          if (genericNameMatch) matchedFields.push('genericName');
          if (manufacturerMatch && scanData.manufacturer) matchedFields.push('manufacturer');
          
          return {
            matched: true,
            alert,
            matchType: 'partial',
            matchedFields,
            confidence: 'medium',
            explanation: `PRODUCT MATCH: Product name matches WHO Alert ${alert.alertNumber}. This product has been flagged by WHO as ${alert.issueType}. Verify batch numbers and other details.`
          };
        }
      }
    }
  }

  // No match found
  return {
    matched: false,
    matchType: 'none',
    matchedFields: [],
    confidence: 'low',
    explanation: 'No matching WHO alert found in the checked records. This does NOT mean the medicine is safe, authentic, or approved. The WHO alert database may not be comprehensive or up-to-date.'
  };
}
