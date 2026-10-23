#!/usr/bin/env node

/**
 * Product Catalog CSV Validator
 * 
 * Validates CSV files before importing to Supabase product_catalog table.
 * Checks for:
 * - Required fields (barcode, product_name, source)
 * - Barcode format and uniqueness
 * - Date format for last_verified
 * - No duplicate barcodes
 * 
 * Usage: node scripts/validate-catalog-csv.js <csv-file>
 */

const fs = require('fs');
const path = require('path');

// Required columns
const REQUIRED_COLUMNS = ['barcode', 'product_name', 'source'];
const OPTIONAL_COLUMNS = ['active_ingredient', 'strength', 'dosage_form', 'manufacturer', 'source_url', 'last_verified'];
const ALL_COLUMNS = [...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS];

// Barcode validation: should be numeric (with possible leading zeros) and reasonable length
function isValidBarcode(barcode) {
  if (!barcode || typeof barcode !== 'string') return false;
  const trimmed = barcode.trim();
  // EAN-13: 13 digits, EAN-8: 8 digits, UPC-A: 12 digits, UPC-E: 8 digits
  // Also allow Code 128 which can be alphanumeric
  return /^[\d]{8,13}$/.test(trimmed) || /^[\w-]{1,50}$/.test(trimmed);
}

// Date validation: YYYY-MM-DD format
function isValidDate(dateStr) {
  if (!dateStr) return true; // Optional field
  const trimmed = dateStr.trim();
  if (!trimmed) return true;
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!datePattern.test(trimmed)) return false;
  const date = new Date(trimmed);
  return date instanceof Date && !isNaN(date.getTime());
}

function validateCSV(filePath) {
  console.log(`\n🔍 Validating CSV file: ${filePath}\n`);

  // Check file exists
  if (!fs.existsSync(filePath)) {
    console.error('❌ Error: File not found');
    process.exit(1);
  }

  // Read file
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim() && !line.trim().startsWith('#'));

  if (lines.length === 0) {
    console.error('❌ Error: CSV file is empty');
    process.exit(1);
  }

  // Parse header
  const header = lines[0].split(',').map(h => h.trim().toLowerCase());
  
  // Check required columns
  const missingColumns = REQUIRED_COLUMNS.filter(col => !header.includes(col));
  if (missingColumns.length > 0) {
    console.error(`❌ Error: Missing required columns: ${missingColumns.join(', ')}`);
    process.exit(1);
  }

  // Check for unknown columns
  const unknownColumns = header.filter(col => !ALL_COLUMNS.includes(col));
  if (unknownColumns.length > 0) {
    console.warn(`⚠️  Warning: Unknown columns will be ignored: ${unknownColumns.join(', ')}`);
  }

  console.log('✅ Header validation passed');
  console.log(`   Required columns: ${REQUIRED_COLUMNS.join(', ')}`);
  console.log(`   Optional columns: ${OPTIONAL_COLUMNS.filter(col => header.includes(col)).join(', ') || 'none'}\n`);

  // Parse data rows
  const dataRows = lines.slice(1);
  const errors = [];
  const warnings = [];
  const barcodes = new Set();
  let validCount = 0;

  dataRows.forEach((line, index) => {
    const rowNum = index + 2; // +2 because row 1 is header and we're 0-indexed
    const values = line.split(',').map(v => v.trim());
    
    // Create object from header and values
    const record = {};
    header.forEach((col, i) => {
      record[col] = values[i] || '';
    });

    // Validate required fields
    if (!record.barcode) {
      errors.push(`Row ${rowNum}: Missing required field 'barcode'`);
      return;
    }

    if (!record.product_name) {
      errors.push(`Row ${rowNum}: Missing required field 'product_name'`);
      return;
    }

    if (!record.source) {
      errors.push(`Row ${rowNum}: Missing required field 'source'`);
      return;
    }

    // Validate barcode format
    if (!isValidBarcode(record.barcode)) {
      errors.push(`Row ${rowNum}: Invalid barcode format '${record.barcode}'`);
      return;
    }

    // Check for duplicate barcodes
    if (barcodes.has(record.barcode)) {
      errors.push(`Row ${rowNum}: Duplicate barcode '${record.barcode}'`);
      return;
    }
    barcodes.add(record.barcode);

    // Validate date format if present
    if (record.last_verified && !isValidDate(record.last_verified)) {
      errors.push(`Row ${rowNum}: Invalid date format '${record.last_verified}' (expected YYYY-MM-DD)`);
      return;
    }

    // Warn about suspicious sources
    const suspiciousSources = ['demo', 'sample', 'test', 'fake', 'example'];
    if (suspiciousSources.some(s => record.source.toLowerCase().includes(s))) {
      warnings.push(`Row ${rowNum}: Source '${record.source}' appears to be non-production data`);
    }

    validCount++;
  });

  // Print results
  console.log('📊 Validation Results:\n');
  console.log(`   Total rows: ${dataRows.length}`);
  console.log(`   Valid rows: ${validCount}`);
  console.log(`   Errors: ${errors.length}`);
  console.log(`   Warnings: ${warnings.length}\n`);

  if (errors.length > 0) {
    console.log('❌ ERRORS (must fix before import):\n');
    errors.forEach(err => console.log(`   • ${err}`));
    console.log('');
  }

  if (warnings.length > 0) {
    console.log('⚠️  WARNINGS (review before import):\n');
    warnings.forEach(warn => console.log(`   • ${warn}`));
    console.log('');
  }

  if (errors.length === 0) {
    console.log('✅ CSV is valid and ready for import!\n');
    console.log('📋 Next steps:');
    console.log('   1. Review the data to ensure all records are from verified sources');
    console.log('   2. Go to Supabase Dashboard → Table Editor → product_catalog');
    console.log('   3. Click "Import" and upload this CSV file');
    console.log('   4. Verify the import was successful\n');
    process.exit(0);
  } else {
    console.log('❌ CSV has errors. Please fix them before importing.\n');
    process.exit(1);
  }
}

// Main
const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('Usage: node scripts/validate-catalog-csv.js <csv-file>');
  console.log('Example: node scripts/validate-catalog-csv.js data/my_products.csv');
  process.exit(1);
}

const csvFile = args[0];
validateCSV(csvFile);
