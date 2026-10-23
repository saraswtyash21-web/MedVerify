// MedVerify OCR Module
// Uses Tesseract.js for client-side OCR processing with image preprocessing

import Tesseract from 'tesseract.js';

export interface ExtractedFields {
  productName: string;
  activeIngredient: string;
  strength: string;
  dosageForm: string;
  manufacturer: string;
  batchNumber: string;
  manufacturingDate: string;
  expiryDate: string;
  rawText: string;
}

export interface FieldConfidence {
  field: keyof ExtractedFields;
  confidence: 'high' | 'medium' | 'low' | 'uncertain';
  message?: string;
}

export interface OcrResult {
  success: boolean;
  fields: ExtractedFields;
  fieldConfidences: FieldConfidence[];
  confidence: number;
  imageQuality?: ImageQuality;
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
    /\b(?:batch|lot)(?:\s*(?:no\.?|number))?\s*[:#-]?\s*([A-Z0-9][A-Z0-9./-]{2,})\b/i,
  ];

  for (const pattern of batchPatterns) {
    const match = text.match(pattern);
    if (match) {
      const candidate = match[1].trim();
      if (/^(?:no\.?|number|lic|license)$/i.test(candidate)) continue;
      return candidate;
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
  // Strategy 1: Look for explicit labels (highest confidence)
  const labeledPatterns = [
    /(?:drug\s*name|medicine\s*name|product\s*name|generic\s*name|brand\s*name)\s*[:.]?\s*([^\r\n]{3,60})/i,
  ];

  for (const pattern of labeledPatterns) {
    const match = text.match(pattern);
    if (match) {
      const name = cleanMedicineNameCandidate(match[1]);
      if (isValidMedicineName(name)) {
        return name;
      }
    }
  }

  // Strategy 2: Look for medicine name near STRONG context clues
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  for (const line of lines) {
    
    // Check if this line contains STRONG medicine context (both strength AND form)
    const hasStrength = /(?:\d+\s*(?:mg|ml|mcg|gm|g|iu|units?))/i.test(line);
    const hasForm = /(?:tablet|capsule|syrup|injection|cream|ointment|drops|inhaler|powder|gel|solution|suspension)/i.test(line);
    
    // Only proceed if we have BOTH strength and form (very strong context)
    if (hasStrength && hasForm && line.length < 50) {
      const potentialName = cleanMedicineNameCandidate(line);
      if (isValidMedicineName(potentialName)) {
        return potentialName;
      }
    }
  }

  // Strategy 3: VERY CONSERVATIVE - only accept if we find a line that looks exactly like a medicine name
  // Medicine names often: start with capital, have 2-4 words, contain letters only
  for (const line of lines) {
    // Skip lines that are clearly not medicine names
    if (/^(batch|lot|exp|mfg|date|tablet|capsule|store|storage|warning|manufacturer|ingredients?|composition|excipients?|colour|color|dosage|each|contains|prescription|directions|instructions|keep|caution)/i.test(line)) {
      continue;
    }
    // Punctuation-prefixed fragments are usually OCR noise from blister foil.
    if (!/^[A-Za-z]/.test(line)) continue;
    
    // Remove strengths and dosage forms before validating. Real packages often
    // print names in uppercase and include the strength on the same line.
    const potentialName = cleanMedicineNameCandidate(line);
    const commonWords = /\b(the|a|an|of|and|for|with|from|this|that|is|are|was|were|be|been|being|have|has|had|do|does|did|will|would|could|should|may|might|must|can|prescription|directions|instructions|warning|caution|read|before|using|take)\b/i;
    if (isValidMedicineName(potentialName) && !commonWords.test(potentialName)) {
      return potentialName;
    }
  }

  // If the printed brand is unreadable, use the legible active ingredient as
  // a generic product name instead of promoting a garbled brand fragment.
  const genericName = extractActiveIngredient(text)
    .replace(/\b(?:IP|USP|BP)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (isValidMedicineName(genericName)) return genericName;

  // No confident match found - return empty string
  return '';
}

// Keep only the likely medicine-name portion of a printed line. Do not infer
// missing characters; the user can still review and edit the result.
function cleanMedicineNameCandidate(text: string): string {
  return text
    .replace(/^(?:drug\s*name|medicine\s*name|product\s*name|generic\s*name|brand\s*name)\s*[:.]?\s*/i, '')
    .replace(/\b\d+(?:\.\d+)?\s*(?:mg|ml|mcg|μg|gm|g|iu|units?)\b/gi, ' ')
    .replace(/\b(?:tablets?|capsules?|syrup|injections?|cream|ointments?|drops?|inhaler|powder|gel|solution|suspension)\b/gi, ' ')
    .replace(/\b(?:ip|usp|bp)\b/gi, ' ')
    .replace(/[^A-Za-z\s&'-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Validate if text looks like a legitimate medicine name
function isValidMedicineName(text: string): boolean {
  if (!text || text.length < 3 || text.length > 40) {
    return false;
  }

  // Must start with a letter
  if (!/^[A-Za-z]/.test(text)) {
    return false;
  }

  // Count character types
  const letters = (text.match(/[A-Za-z]/g) || []).length;
  const spaces = (text.match(/\s/g) || []).length;
  const vowels = (text.match(/[aeiou]/gi) || []).length;
  const consonants = (text.match(/[^aeiou\s]/gi) || []).length;
  const total = letters + spaces;

  // Must have reasonable letter-to-total ratio (allow spaces)
  if (letters / total < 0.7) {
    return false;
  }

  // Allow common names with a slightly consonant-heavy spelling (for example,
  // "Crocin") while still rejecting text with no vowels or extreme imbalance.
  if (vowels === 0 || consonants / (vowels + consonants) > 0.75) {
    return false;
  }

  // Must have at least 20% vowels (natural language requirement)
  if (vowels / letters < 0.2) {
    return false;
  }

  // Reject if too many consecutive consonants (likely garbage)
  if (/[bcdfghjklmnpqrstvwxyz]{4,}/i.test(text)) {
    return false;
  }

  const words = text.split(/\s+/);
  // Medicine packaging commonly prints names in uppercase, so capitalization
  // alone is not evidence of OCR garbage. A long all-uppercase sequence is
  // more likely to be fragments than a product name.
  if (words.length > 4) return false;
  const allCapsWords = words.filter(w => w.length > 1 && w === w.toUpperCase()).length;
  if (words.length > 2 && allCapsWords === words.length) return false;

  // Must look like natural language (no repeated patterns)
  if (/(\b\w+\b)(.*\b\1\b){2,}/i.test(text)) {
    return false;
  }

  // NEW CHECKS: Reject common OCR garbage patterns
  
  // Reject single-letter words (except "A" or "I" in context)
  const singleLetterWords = words.filter(w => w.length === 1 && !/^[AI]$/i.test(w));
  if (singleLetterWords.length > 0) {
    return false;
  }

  // Reject repeated letter patterns (e.g., "EE", "AAA")
  if (/(.)\1{2,}/i.test(text)) {
    return false;
  }

  // Reject common non-medicine words that indicate OCR misread
  const nonMedicineWords = /\b(prescription|composition|excipients?|colour|color|dosage|storage|contains|tablet|tablets|capsule|capsules|manufacturer|manufactured|marketed|of|a|the|and|for|with|from|this|that|read|directions|instructions|warning|caution)\b/i;
  if (nonMedicineWords.test(text)) {
    return false;
  }

  // Reject if words don't look like real words (too many unusual letter combinations)
  // Check each word for common English letter patterns
  for (const word of words) {
    if (word.length < 2) continue;
    
    // Reject words with unusual patterns like "GEIR", "V", "EE"
    // Real medicine names typically have common letter patterns
    const unusualPatterns = /(?:^[A-Z]$)|(?:^[AEIOU]{2,})|(?:[bcdfghjklmnpqrstvwxyz]{3,}$)/i;
    if (unusualPatterns.test(word)) {
      return false;
    }
    
    // Reject words that are all the same letter (e.g., "EEE")
    if (/^(.)\1+$/i.test(word)) {
      return false;
    }
  }

  // Reject if text contains fragments that don't form coherent words
  // Medicine names should have recognizable word structures
  const hasValidWordStructure = words.some(word => {
    // Word should have at least one vowel and reasonable consonant-vowel pattern
    return word.length >= 3 && 
           /[aeiou]/i.test(word) && 
           !/^[^aeiou]+$/i.test(word) && // Not all consonants
           !/^[aeiou]+$/i.test(word); // Not all vowels
  });
  
  if (!hasValidWordStructure) {
    return false;
  }

  return true;
}

// Extract active ingredient
function extractActiveIngredient(text: string): string {
  const ingredientPatterns = [
    /(?:active\s*ingredient|generic\s*name|composition|contains)\s*[:.]?\s*([A-Za-z\s]+?)(?:\d+\s*(?:mg|ml|mcg)|\n|$)/i,
    /(?:paracetamol|acetaminophen|ibuprofen|aspirin|amoxicillin|metformin|atorvastatin|omeprazole|cetirizine|azithromycin)\s*(\d+\s*(?:mg|ml|mcg))?/i,
  ];

  for (const pattern of ingredientPatterns) {
    const match = text.match(pattern);
    if (match) {
      const ingredient = match[1]?.trim() || match[0].trim();
      if (ingredient.length > 2) {
        return ingredient;
      }
    }
  }
  return '';
}

// Calculate confidence for each extracted field
function calculateFieldConfidences(fields: ExtractedFields, overallConfidence: number): FieldConfidence[] {
  const confidences: FieldConfidence[] = [];
  
  // Product name confidence
  if (fields.productName) {
    const hasLabel = /(?:drug|medicine|product|brand)\s*name/i.test(fields.rawText);
    const hasContext = /(?:mg|ml|mcg|tablet|capsule|syrup)/i.test(fields.rawText);
    
    if (hasLabel) {
      confidences.push({
        field: 'productName',
        confidence: 'high',
        message: 'Extracted from explicit label'
      });
    } else if (hasContext && overallConfidence > 70) {
      confidences.push({
        field: 'productName',
        confidence: 'medium',
        message: 'Extracted from context, please verify'
      });
    } else {
      confidences.push({
        field: 'productName',
        confidence: 'low',
        message: 'Uncertain extraction - please verify or rescan'
      });
    }
  } else {
    confidences.push({ 
      field: 'productName', 
      confidence: 'uncertain', 
      message: 'Not detected - please enter manually or rescan with clearer image' 
    });
  }

  // Active ingredient confidence
  if (fields.activeIngredient) {
    const hasLabel = /(?:active\s*ingredient|generic\s*name|composition)/i.test(fields.rawText);
    confidences.push({
      field: 'activeIngredient',
      confidence: hasLabel ? 'high' : 'medium',
      message: hasLabel ? undefined : 'Inferred from common medicine names'
    });
  } else {
    confidences.push({ field: 'activeIngredient', confidence: 'uncertain', message: 'Not detected' });
  }

  // Strength confidence
  if (fields.strength) {
    confidences.push({
      field: 'strength',
      confidence: overallConfidence > 70 ? 'high' : 'medium'
    });
  } else {
    confidences.push({ field: 'strength', confidence: 'uncertain', message: 'Not detected' });
  }

  // Dosage form confidence
  if (fields.dosageForm) {
    confidences.push({ field: 'dosageForm', confidence: 'high' });
  } else {
    confidences.push({ field: 'dosageForm', confidence: 'uncertain', message: 'Not detected' });
  }

  // Manufacturer confidence
  if (fields.manufacturer) {
    const hasLabel = /(?:manufactured|mfr|mfg|marketed)/i.test(fields.rawText);
    confidences.push({
      field: 'manufacturer',
      confidence: hasLabel ? 'high' : 'medium',
      message: hasLabel ? undefined : 'Extracted from context, verify manually'
    });
  } else {
    confidences.push({ field: 'manufacturer', confidence: 'uncertain', message: 'Not detected' });
  }

  // Batch number confidence
  if (fields.batchNumber) {
    const hasLabel = /(?:batch|lot)/i.test(fields.rawText);
    confidences.push({
      field: 'batchNumber',
      confidence: hasLabel ? 'high' : 'medium'
    });
  } else {
    confidences.push({ field: 'batchNumber', confidence: 'uncertain', message: 'Not detected' });
  }

  // Manufacturing date confidence
  if (fields.manufacturingDate) {
    confidences.push({ field: 'manufacturingDate', confidence: 'high' });
  } else {
    confidences.push({ field: 'manufacturingDate', confidence: 'uncertain', message: 'Not detected' });
  }

  // Expiry date confidence
  if (fields.expiryDate) {
    const hasLabel = /(?:exp|expiry|use\s*by|best\s*before)/i.test(fields.rawText);
    confidences.push({
      field: 'expiryDate',
      confidence: hasLabel ? 'high' : 'medium',
      message: hasLabel ? undefined : 'Date format detected but label unclear'
    });
  } else {
    confidences.push({ field: 'expiryDate', confidence: 'uncertain', message: 'Not detected' });
  }

  return confidences;
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

// Image quality assessment
export interface ImageQuality {
  score: number; // 0-100
  isBlurry: boolean;
  isTooSmall: boolean;
  hasGoodContrast: boolean;
  recommendations: string[];
}

// Assess image quality before OCR
export async function assessImageQuality(imageFile: File | string): Promise<ImageQuality> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve({ score: 50, isBlurry: false, isTooSmall: false, hasGoodContrast: true, recommendations: [] });
        return;
      }

      // Quality heuristics only need a representative thumbnail. Scanning every
      // pixel of a modern phone photo here was adding several seconds on mobile.
      const qualityScale = Math.min(1, 640 / Math.max(img.width, img.height));
      canvas.width = Math.max(1, Math.round(img.width * qualityScale));
      canvas.height = Math.max(1, Math.round(img.height * qualityScale));
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Calculate blur (Laplacian variance)
      let laplacianSum = 0;
      let laplacianCount = 0;
      for (let y = 1; y < canvas.height - 1; y++) {
        for (let x = 1; x < canvas.width - 1; x++) {
          const idx = (y * canvas.width + x) * 4;
          const center = data[idx];
          const top = data[((y - 1) * canvas.width + x) * 4];
          const bottom = data[((y + 1) * canvas.width + x) * 4];
          const left = data[(y * canvas.width + (x - 1)) * 4];
          const right = data[(y * canvas.width + (x + 1)) * 4];
          const laplacian = Math.abs(4 * center - top - bottom - left - right);
          laplacianSum += laplacian;
          laplacianCount++;
        }
      }
      const blurScore = laplacianCount > 0 ? laplacianSum / laplacianCount : 0;
      const isBlurry = blurScore < 50;

      // Check text size (estimate based on image dimensions)
      const minDimension = Math.min(canvas.width, canvas.height);
      const isTooSmall = minDimension < 800;

      // Check contrast (standard deviation of grayscale values)
      let sum = 0;
      let sumSq = 0;
      for (let i = 0; i < data.length; i += 4) {
        const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
        sum += gray;
        sumSq += gray * gray;
      }
      const pixelCount = data.length / 4;
      const mean = sum / pixelCount;
      const variance = (sumSq / pixelCount) - (mean * mean);
      const stdDev = Math.sqrt(variance);
      const hasGoodContrast = stdDev > 40;

      // Calculate overall score
      let score = 50;
      if (!isBlurry) score += 20;
      if (!isTooSmall) score += 15;
      if (hasGoodContrast) score += 15;

      // Generate recommendations
      const recommendations: string[] = [];
      if (isBlurry) {
        recommendations.push('Image appears blurry. Hold camera steady and ensure focus.');
      }
      if (isTooSmall) {
        recommendations.push('Image resolution is low. Move closer or use higher resolution.');
      }
      if (!hasGoodContrast) {
        recommendations.push('Low contrast detected. Ensure good lighting and avoid shadows.');
      }
      if (score < 70) {
        recommendations.push('Consider retaking the photo for better accuracy.');
      }

      resolve({ score, isBlurry, isTooSmall, hasGoodContrast, recommendations });
    };

    img.onerror = () => {
      resolve({ score: 50, isBlurry: false, isTooSmall: false, hasGoodContrast: true, recommendations: [] });
    };

    if (typeof imageFile === 'string') {
      img.src = imageFile;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(imageFile);
    }
  });
}

// Build OCR inputs at multiple scales. Medicine labels often occupy only a
// narrow strip of a blister/package photo, so OCR the full frame and enlarged,
// overlapping regions rather than relying on one down-sized full image.
async function preprocessImage(imageFile: File | string): Promise<string[]> {
  const source = await new Promise<string>((resolve, reject) => {
    if (typeof imageFile === 'string') {
      resolve(imageFile);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Unable to read image file'));
    reader.readAsDataURL(imageFile);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Unable to decode image'));
    image.src = source;
  });

  // Keep the common path fast: one readable full-frame image, then one
  // enlarged center crop only when the first OCR result is weak.
  const regions = [
    { x: 0, y: 0, width: 1, height: 1 },
    { x: 0.08, y: 0.12, width: 0.84, height: 0.76 },
  ];

  return regions.map((region) => {
    const sx = Math.round(img.width * region.x);
    const sy = Math.round(img.height * region.y);
    const sw = Math.max(1, Math.round(img.width * region.width));
    const sh = Math.max(1, Math.round(img.height * region.height));
    const scale = Math.min(1.5, Math.max(1, 1600 / Math.max(sw, sh)));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(sw * scale);
    canvas.height = Math.round(sh * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return source;

    // Mild grayscale and contrast enhancement. Avoid the previous aggressive
    // per-pixel sharpening, which amplified foil texture and damaged letter shapes.
    ctx.filter = 'grayscale(1) contrast(1.25)';
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    ctx.filter = 'none';
    return canvas.toDataURL('image/png');
  });
}

function scoreOcrText(text: string, confidence: number): number {
  const usefulSignals = (text.match(/\b(?:mg|mcg|tablet|tablets|capsule|batch|lot|mfg|exp|expiry|composition|manufactured|marketed|cipla|fusion)\b/gi) || []).length;
  const readableChars = (text.match(/[A-Za-z0-9]/g) || []).length;
  return confidence + usefulSignals * 5 + Math.min(readableChars / 30, 20);
}

// Main OCR processing function
export async function processImage(
  imageFile: File | string,
  onProgress?: (progress: OcrProgress) => void
): Promise<OcrResult> {
  const startTime = Date.now();

  try {
    if (onProgress) {
      onProgress({ status: 'Assessing image quality...', progress: 0.05 });
    }

    // Assess image quality first
    const imageQuality = await assessImageQuality(imageFile);

    if (onProgress) {
      onProgress({ status: 'Preprocessing image for OCR...', progress: 0.1 });
    }

    // Preprocess the full photo and enlarged overlapping crops to improve OCR
    // when medicine text is small or limited to a narrow strip.
    const processedImages = await preprocessImage(imageFile);

    if (onProgress) {
      onProgress({ status: 'Initializing OCR engine...', progress: 0.2 });
    }

    const worker = await Tesseract.createWorker('eng', 1, {
      logger: (m) => {
        if (onProgress && m.status) {
          onProgress({ status: m.status, progress: m.progress || 0 });
        }
      }
    });

    let bestText = '';
    let bestConfidence = 0;
    let bestScore = -1;
    try {
      for (let index = 0; index < processedImages.length; index += 1) {
        const result = await worker.recognize(processedImages[index]);
        const text = result.data.text.trim();
        const confidence = result.data.confidence;
        const score = scoreOcrText(text, confidence);
        if (score > bestScore) {
          bestText = text;
          bestConfidence = confidence;
          bestScore = score;
        }
        if (onProgress) {
          onProgress({ status: `Reading label area ${index + 1} of ${processedImages.length}...`, progress: 0.2 + 0.65 * ((index + 1) / processedImages.length) });
        }
        // Avoid a second Tesseract pass when the first pass already found a
        // plausible medicine name and strength with usable confidence.
        const firstPassName = extractProductName(text);
        const firstPassHasStrength = Boolean(extractStrength(text));
        const firstPassLooksUseful = firstPassName.length >= 4 &&
          !/^(?:composition|ingredients?|dosage|storage|warning|caution)$/i.test(firstPassName.trim()) &&
          firstPassHasStrength && confidence >= 45;
        if (index === 0 && firstPassLooksUseful) break;
      }
    } finally {
      await worker.terminate();
    }

    const rawText = bestText;
    const confidence = bestConfidence;

    if (onProgress) {
      onProgress({ status: 'Extracting fields...', progress: 0.9 });
    }

    // Extract fields from OCR text
    let productName = extractProductName(rawText);
    // Do not surface packaging headings as medicine names. When the brand line
    // is unreadable, fall back only to a legible generic ingredient.
    const normalizedProductName = productName.normalize('NFKD').replace(/[^A-Za-z]/g, '').toLowerCase();
    if (/^(?:composition|ingredient|ingredients|excipient|excipients|dosage|storage|warning|caution)/.test(normalizedProductName)) {
      productName = extractActiveIngredient(rawText)
        .replace(/\b(?:IP|USP|BP)\b/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
    }
    const extractedBatchNumber = extractBatchNumber(rawText);

    const fields: ExtractedFields = {
      productName,
      activeIngredient: extractActiveIngredient(rawText),
      strength: extractStrength(rawText),
      dosageForm: extractDosageForm(rawText),
      manufacturer: extractManufacturer(rawText),
      batchNumber: /^(?:no|number|lic|license)/i.test(extractedBatchNumber.trim()) ? '' : extractedBatchNumber,
      manufacturingDate: extractMfgDate(rawText),
      expiryDate: extractExpiryDate(rawText),
      rawText: rawText
    };

    // Calculate field confidences
    const fieldConfidences: FieldConfidence[] = calculateFieldConfidences(fields, confidence);

    const processingTime = Date.now() - startTime;

    if (onProgress) {
      onProgress({ status: 'Complete', progress: 1.0 });
    }

    return {
      success: true,
      fields,
      fieldConfidences,
      confidence,
      imageQuality,
      processingTime
    };
  } catch (error) {
    const processingTime = Date.now() - startTime;
    return {
      success: false,
      fields: {
        productName: '',
        activeIngredient: '',
        strength: '',
        dosageForm: '',
        manufacturer: '',
        batchNumber: '',
        manufacturingDate: '',
        expiryDate: '',
        rawText: ''
      },
      fieldConfidences: [],
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
