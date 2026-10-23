# OCR Improvements & Limitations Guide

## Overview

MedVerify uses Tesseract.js for client-side OCR (Optical Character Recognition) to extract text from medicine packaging photos. This guide explains the improvements made to handle garbled text, image quality requirements, and known limitations.

## Recent Improvements

### 1. Stricter Medicine Name Detection

**Problem:** Previous versions would confidently display garbled text like "RA CANA SNA GRU AAA" as a medicine name.

**Solution:** Implemented multi-strategy extraction with strict validation:

#### Strategy 1: Explicit Labels (Highest Confidence)
- Looks for explicit labels like "Drug Name:", "Medicine Name:", "Product Name:", "Brand Name:"
- Only accepts text following these labels
- **Confidence:** High

#### Strategy 2: Context-Aware Extraction (Medium Confidence)
- Searches for text near medicine-related keywords (mg, ml, tablet, capsule, syrup, etc.)
- Validates that extracted text looks like a legitimate medicine name
- **Confidence:** Medium

#### Strategy 3: Pattern Matching (Low Confidence)
- Looks for text that matches medicine name patterns (2-4 words, reasonable format)
- Applies strict validation rules
- **Confidence:** Low

### 2. Medicine Name Validation

All potential medicine names must pass these validation checks:

✅ **Must have:**
- Length between 3-40 characters
- Start with a letter
- At least 70% letters (allowing spaces)
- At least 20% vowels (natural language requirement)
- Vowel-to-consonant ratio ≤ 0.65 (rejects random consonant clusters)

❌ **Must NOT have:**
- 4+ consecutive consonants (indicates garbage text)
- More than 50% all-caps words (indicates random capitalization)
- Repeated word patterns (indicates OCR errors)
- Too many numbers or special characters

**Example:**
- ✅ "Paracetamol" - Valid (good vowel/consonant balance)
- ✅ "Amoxicillin 500mg" - Valid (natural language pattern)
- ❌ "RA CANA SNA GRU AAA" - Rejected (vowel ratio 0.5, too many consecutive consonants)
- ❌ "XYZ123 ABC456" - Rejected (too many numbers)

### 3. Image Quality Assessment

Before OCR processing, the system now assesses image quality:

#### Blur Detection
- Uses Laplacian variance algorithm
- Detects blurry images that will produce poor OCR results
- **Threshold:** Variance < 50 indicates blur

#### Text Size Estimation
- Checks minimum image dimensions
- **Threshold:** Minimum dimension < 800px indicates low resolution

#### Contrast Analysis
- Measures standard deviation of grayscale values
- Detects low-contrast images (shadows, poor lighting)
- **Threshold:** StdDev < 40 indicates low contrast

#### Quality Score
- Overall score from 0-100 based on blur, size, and contrast
- **Score < 70:** Shows warning with recommendations

### 4. Confidence Indicators

Each extracted field now shows a confidence level:

- 🟢 **High** - Extracted from explicit label or very clear context
- 🟡 **Medium** - Extracted from context, please verify
- 🟠 **Low** - Uncertain extraction, please verify or rescan
- ⚪ **Uncertain** - Not detected, please enter manually

**Visual Indicators:**
- Confidence badges next to each field label
- Warning icons for low/uncertain fields
- Yellow background for uncertain empty fields
- Warning messages for fields that need verification

### 5. Image Quality Warnings

When image quality is poor (score < 70), the system shows:
- Warning banner with specific issues detected
- Actionable recommendations (e.g., "Hold camera steady", "Ensure good lighting")
- "Retake Photo" button for quick rescan

## How to Take Better Photos

### ✅ Do:
1. **Use good lighting** - Natural light or bright, even artificial light
2. **Hold camera steady** - Use both hands or rest on stable surface
3. **Focus on text** - Ensure text is sharp and clear
4. **Capture entire label** - Include all relevant information
5. **Avoid shadows** - Position light source to minimize shadows
6. **Use high resolution** - Move closer or use higher camera resolution
7. **Flat surface** - Place medicine on flat, contrasting background
8. **Straight angle** - Hold camera perpendicular to the label

### ❌ Don't:
1. **Don't use flash** - Creates glare and shadows
2. **Don't shoot at angle** - Distorts text
3. **Don't use blurry images** - OCR cannot read blurry text
4. **Don't crop too tight** - Include context around medicine name
5. **Don't use low resolution** - Text must be clearly readable
6. **Don't include reflections** - Glossy packaging can cause issues

## Known Limitations

### 1. OCR Accuracy

**Limitation:** Tesseract.js is a general-purpose OCR engine, not specifically trained for medicine packaging.

**Impact:**
- May struggle with decorative fonts
- May misread small text
- May confuse similar characters (O/0, I/1, S/5)
- May fail on curved or wrinkled packaging

**Mitigation:**
- Always review extracted fields
- Edit incorrect values manually
- Retake photo if quality is poor
- Use confidence indicators to identify uncertain fields

### 2. Medicine Name Detection

**Limitation:** Cannot guarantee 100% accurate medicine name extraction.

**Impact:**
- May not detect medicine name if no explicit label
- May extract wrong text if packaging has prominent non-medicine text
- May fail on non-English text (currently English-only)

**Mitigation:**
- System marks uncertain names with low confidence
- Users can edit fields manually
- Barcode lookup provides alternative identification
- System never guesses - returns empty if uncertain

### 3. Language Support

**Limitation:** Currently English-only OCR.

**Impact:**
- Cannot extract text from Hindi, Spanish, or other language packaging
- May misread non-Latin characters

**Future:** Multi-language support planned (Tesseract.js supports multiple languages)

### 4. Image Preprocessing

**Limitation:** No automatic rotation, cropping, or enhancement.

**Impact:**
- User must manually ensure proper orientation
- Cannot automatically crop to relevant area
- Cannot enhance poor-quality images

**Future:** Automatic preprocessing planned (rotation detection, auto-crop, contrast enhancement)

### 5. Field Extraction

**Limitation:** Some fields require specific formatting or labels.

**Impact:**
- Batch numbers without "Batch:" or "Lot:" label may not be detected
- Dates in unusual formats may not be parsed
- Manufacturer without "Manufactured by:" may not be detected

**Mitigation:**
- System shows "Uncertain" for undetected fields
- Users can manually enter missing information
- Confidence indicators show which fields need review

## Troubleshooting

### Problem: Garbled text shown as medicine name

**Cause:** Poor image quality or unusual packaging format

**Solution:**
1. Check confidence indicator - should show "Low" or "Uncertain"
2. Edit the field manually with correct medicine name
3. Retake photo with better lighting and focus
4. Ensure medicine name is clearly visible

### Problem: Medicine name not detected

**Cause:** No explicit label or poor image quality

**Solution:**
1. Check if medicine name is clearly visible in photo
2. Retake photo with better quality
3. Manually enter medicine name in edit mode
4. Use barcode scanning as alternative

### Problem: Low confidence on multiple fields

**Cause:** Poor overall image quality

**Solution:**
1. Check image quality warning banner
2. Follow recommendations (better lighting, steady camera, etc.)
3. Retake photo
4. Ensure entire label is in focus

### Problem: Image quality warning appears

**Cause:** Image is blurry, too small, or has low contrast

**Solution:**
1. Read specific recommendations in warning banner
2. Retake photo following best practices
3. Use "Retake Photo" button for quick rescan
4. Ensure minimum 800px resolution

## Technical Details

### OCR Engine
- **Library:** Tesseract.js v5.x
- **Language:** English (eng)
- **Processing:** Client-side (browser)
- **Privacy:** Images never leave user's device

### Image Quality Assessment
- **Blur Detection:** Laplacian variance algorithm
- **Size Check:** Minimum dimension analysis
- **Contrast Check:** Grayscale standard deviation
- **Processing:** Canvas API (client-side)

### Validation Rules
- **Medicine Name:** Multi-strategy extraction with strict validation
- **Date Formats:** DD/MM/YYYY, MM/DD/YYYY, Month YYYY, YYYY-MM-DD
- **Strength:** Numeric + unit (mg, ml, mcg, etc.)
- **Batch Number:** Alphanumeric pattern after label

### Confidence Calculation
- **High:** Explicit label found + good OCR confidence (>70%)
- **Medium:** Context clues + reasonable OCR confidence
- **Low:** Pattern matching only or low OCR confidence
- **Uncertain:** No match found or validation failed

## Best Practices

### For Users:
1. Always review extracted fields before verification
2. Pay attention to confidence indicators
3. Edit uncertain fields manually
4. Retake photo if quality warning appears
5. Use barcode scanning when available
6. Keep photos for reference

### For Developers:
1. Monitor OCR accuracy metrics
2. Collect feedback on extraction failures
3. Update validation rules based on real-world data
4. Consider adding multi-language support
5. Implement automatic image preprocessing
6. Add more medicine name patterns

## Future Improvements

### Planned:
1. **Multi-language OCR** - Support for Hindi, Spanish, etc.
2. **Automatic preprocessing** - Rotation, cropping, enhancement
3. **Medicine name database** - Validate against known medicine names
4. **Improved validation** - Machine learning for better garbage detection
5. **Batch processing** - Multiple images per medicine
6. **Offline mode** - Cache OCR models for offline use

### Under Consideration:
1. **Cloud OCR** - Google Vision, AWS Textract (requires API keys)
2. **Custom model** - Train Tesseract on medicine packaging
3. **AR overlay** - Real-time text highlighting
4. **Voice input** - Speak medicine name instead of OCR

## Support

If you encounter OCR issues:
1. Check this guide for troubleshooting
2. Review confidence indicators
3. Retake photo with better quality
4. Edit fields manually if needed
5. Report issues with sample images (if possible)

## Summary

The OCR system has been significantly improved to:
- ✅ Reject garbled text more effectively
- ✅ Provide clear confidence indicators
- ✅ Warn about poor image quality
- ✅ Guide users to take better photos
- ✅ Never guess medicine names
- ✅ Allow manual editing of all fields

**Key Principle:** When in doubt, the system marks fields as uncertain rather than showing potentially incorrect information. Users should always review and verify extracted data.

---

**Last Updated:** 2024  
**OCR Engine:** Tesseract.js v5.x  
**Status:** Production-ready with known limitations
