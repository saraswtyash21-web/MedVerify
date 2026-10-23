// MedVerify OCR Module
// Uses Tesseract.js for client-side OCR processing

import Tesseract from 'tesseract.js';

export interface ExtractedFields {
  productName: string;
  strength: string;
  dosageForm: string;
  manufacturer: string;
  batchNumber: string;
  manufacturingDate: string;
  expiryDate: string;
  rawText: string;
}

export interface OcrResult {
  success: boolean;
  fields: ExtractedFields;
  confidence: number;
  error?: string;
  processingTime: number;
}

export interface OcrProgress {
  status: string;
  progress: number;
}

// Parse dates in various common formats
function parseDate(text: string): string {
  if (!text) return '';
  
  // Common date patterns
  const patterns = [
    /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/, // DD/MM/YYYY or MM/DD/YYYY
    /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2})/, // DD/MM/YY
    /([A-Za-z]{3,9})\s*(\d{4})/, // Month YYYY
    /(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/, // YYYY/MM/DD
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[0];
    }
  }
  return '';
}

// Extract expiry date from text
function extractExpiryDate(text: string): string {
  const expiryPatterns = [
    /(?:exp|expiry|expires?|use\s*by|best\s*before|use\s*till)\s*[:.]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
    /(?:exp|expiry|expires?|use\s*by|best\s*before)\s*[:.]?\s*([A-Za-z]+\s*\d{4})/i,
    /(?:exp|expiry)\s*[:.]?\s*(\d{4}[\/\-\.]\d{1,2}[\/\-\.]?\d{0,2})/i,
  ];

  for (const pattern of expiryPatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }
  return '';
}

// Extract manufacturing date from text
function extractMfgDate(text: string): string {
  const mfgPatterns = [
    /(?:mfg|mfd|manufactured?|date\s*of\s*mfg|date\s*of\s*manufacture)\s*[:.]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
    /(?:mfg|mfd|manufactured?)\s*[:.]?\s*([A-Za-z]+\s*\d{4})/i,
  ];

  for (const pattern of mfgPatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }
  return '';
}

// Extract batch/lot number
function extractBatchNumber(text: string): string {
  const batchPatterns = [
    /(?:batch|lot|batch\s*no|lot\s*no|batch\s*number|lot\s*number)\s*[:.]?\s*([A-Za-z0-9\-\/]+)/i,
    /(?:batch|lot)\s*[:.]?\s*([A-Z0-9\-]+)/i,
  ];

  for (const pattern of batchPatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }
  return '';
}

// Extract manufacturer name
function extractManufacturer(text: string): string {
  const mfrPatterns = [
    /(?:manufactured\s*by|mfr|mfg|marketed\s*by|made\s*by|producer)\s*[:.]?\s*([A-Za-z\s&.,]+?)(?:\n|,|Ltd|Pvt|$)/i,
    /(?:manufactured\s*by|mfr|mfg|marketed\s*by)\s*[:.]?\s*([A-Za-z\s&.]+)/i,
  ];

  for (const pattern of mfrPatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }
  return '';
}

// Extract medicine name (typically prominent text)
function extractProductName(text: string): string {
  // Look for common medicine name patterns
  const namePatterns = [
    /(?:drug\s*name|medicine\s*name|product\s*name|generic\s*name)\s*[:.]?\s*([A-Za-z\s]+)/i,
    /^([A-Za-z][A-Za-z\s]{2,30})/m, // First prominent text line
  ];

  for (const pattern of namePatterns) {
    const match = text.match(pattern);
    if (match) {
      const name = match[1].trim();
      // Filter out common non-name words
      if (name.length > 2 && !/^(batch|lot|exp|mfg|date|tablet|capsule|store|warning)/i.test(name)) {
        return name;
      }
    }
  }
  return '';
}

// Extract strength
function extractStrength(text: string): string {
  const strengthPatterns = [
    /(\d+)\s*(?:mg|ml|mcg|gm|g|iu|units?)(?:\s*\/\s*(?:tablet|capsule|ml|dose))?/i,
    /strength\s*[:.]?\s*(\d+\s*(?:mg|ml|mcg|gm|g))/i,
  ];

  for (const pattern of strengthPatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[0].trim();
    }
  }
  return '';
}

// Extract dosage form
function extractDosageForm(text: string): string {
  const forms = ['tablet', 'tablets', 'capsule', 'capsules', 'syrup', 'injection', 'cream', 'ointment', 'drops', 'inhaler', 'powder', 'gel', 'solution', 'suspension'];
  const lowerText = text.toLowerCase();
  
  for (const form of forms) {
    if (lowerText.includes(form)) {
      return form.charAt(0).toUpperCase() + form.slice(1);
    }
  }
  return '';
}

// Main OCR processing function
export async function processImage(
  imageFile: File | string,
  onProgress?: (progress: OcrProgress) => void
): Promise<OcrResult> {
  const startTime = Date.now();

  try {
    if (onProgress) {
      onProgress({ status: 'Initializing OCR engine...', progress: 0.1 });
    }

    const result = await Tesseract.recognize(imageFile, 'eng', {
      logger: (m) => {
        if (onProgress && m.status) {
          onProgress({
            status: m.status,
            progress: m.progress || 0
          });
        }
      }
    });

    const rawText = result.data.text;
    const confidence = result.data.confidence;

    if (onProgress) {
      onProgress({ status: 'Extracting fields...', progress: 0.9 });
    }

    // Extract fields from OCR text
    const fields: ExtractedFields = {
      productName: extractProductName(rawText),
      strength: extractStrength(rawText),
      dosageForm: extractDosageForm(rawText),
      manufacturer: extractManufacturer(rawText),
      batchNumber: extractBatchNumber(rawText),
      manufacturingDate: extractMfgDate(rawText),
      expiryDate: extractExpiryDate(rawText),
      rawText: rawText
    };

    const processingTime = Date.now() - startTime;

    if (onProgress) {
      onProgress({ status: 'Complete', progress: 1.0 });
    }

    return {
      success: true,
      fields,
      confidence,
      processingTime
    };
  } catch (error) {
    const processingTime = Date.now() - startTime;
    return {
      success: false,
      fields: {
        productName: '',
        strength: '',
        dosageForm: '',
        manufacturer: '',
        batchNumber: '',
        manufacturingDate: '',
        expiryDate: '',
        rawText: ''
      },
      confidence: 0,
      error: error instanceof Error ? error.message : 'Unknown OCR error',
      processingTime
    };
  }
}

// Check if OCR result has sufficient quality
export function assessOcrQuality(result: OcrResult): {
  quality: 'good' | 'fair' | 'poor';
  issues: string[];
  suggestions: string[];
} {
  const issues: string[] = [];
  const suggestions: string[] = [];

  if (!result.success) {
    return {
      quality: 'poor',
      issues: ['OCR processing failed'],
      suggestions: ['Try uploading a clearer image', 'Ensure the image is not corrupted']
    };
  }

  if (result.confidence < 40) {
    issues.push('Low OCR confidence score');
    suggestions.push('Upload a higher resolution image');
    suggestions.push('Ensure good lighting and minimal shadows');
  } else if (result.confidence < 60) {
    issues.push('Moderate OCR confidence');
    suggestions.push('A clearer image may improve accuracy');
  }

  const fields = result.fields;
  const missingFields: string[] = [];

  if (!fields.expiryDate) missingFields.push('Expiry date');
  if (!fields.batchNumber) missingFields.push('Batch number');
  if (!fields.manufacturer) missingFields.push('Manufacturer');
  if (!fields.productName) missingFields.push('Product name');

  if (missingFields.length >= 3) {
    issues.push(`Could not extract: ${missingFields.join(', ')}`);
    suggestions.push('Ensure all text is visible and in focus');
    suggestions.push('Try photographing the label from a straight angle');
  } else if (missingFields.length > 0) {
    issues.push(`Missing: ${missingFields.join(', ')}`);
  }

  if (result.fields.rawText.trim().length < 20) {
    issues.push('Very little text was detected');
    suggestions.push('Make sure the medicine label text is clearly visible');
    suggestions.push('Avoid blurry or low-contrast images');
  }

  let quality: 'good' | 'fair' | 'poor' = 'good';
  if (issues.length >= 3 || result.confidence < 40) {
    quality = 'poor';
  } else if (issues.length >= 1 || result.confidence < 60) {
    quality = 'fair';
  }

  return { quality, issues, suggestions };
}
