# Importing Verified Medicine Records to Product Catalog

This guide explains how to safely add real, verified medicine records to the MedVerify product catalog.

## ⚠️ Critical Security Notice

**The product catalog is READ-ONLY for application users.** Records can only be added by:
1. Supabase Dashboard (Table Editor or CSV import)
2. Server-side scripts using the service_role key (NOT in browser code)

**NEVER:**
- Put the service_role key in browser code
- Import fake, sample, or unverified data
- Claim a barcode proves medicine authenticity or safety

---

## Step 1: Verify Your Data Source

Before importing ANY records, you must verify the source is legitimate and authoritative.

### ✅ Acceptable Sources

**Official Government/Regulatory:**
- GS1 (global barcode standards organization) - https://www.gs1.org/
- FDA National Drug Code (NDC) Directory - https://www.fda.gov/drugs/drug-approvals-and-databases/national-drug-code-directory
- CDSCO (India) - https://cdsco.gov.in/
- EMA (Europe) - https://www.ema.europa.eu/
- MHRA (UK) - https://www.mhra.gov.uk/

**Verified Commercial Databases:**
- GS1 Product Database (paid, verified)
- FDA OpenFDA API (free, official)
- National drug databases with official backing

**Manufacturer Direct:**
- Official product information from manufacturer websites
- Product packaging data verified against physical products

### ❌ Unacceptable Sources

- Fake/sample data for testing
- Unverified internet sources
- Crowdsourced data without verification
- Data from unknown or untrusted sources
- Synthetic/example records

### How to Verify a Source

1. **Check authority**: Is this an official government or standards body?
2. **Verify accuracy**: Cross-reference with at least one other official source
3. **Check freshness**: When was the data last updated?
4. **Document source**: Record the exact URL and retrieval date
5. **Validate format**: Ensure barcodes match official formats (EAN-13, UPC-A, etc.)

---

## Step 2: Prepare Your CSV File

### CSV Template

Use the template at `data/product_catalog_template.csv` or create your own with these columns:

**Required Columns:**
- `barcode` - Unique barcode (preserve leading zeros, e.g., `0123456789012`)
- `product_name` - Full product name as shown on packaging
- `source` - Where this record came from (e.g., "GS1 India", "FDA NDC")

**Optional Columns:**
- `active_ingredient` - Generic name of active ingredient
- `strength` - Dosage strength (e.g., "500mg", "10ml")
- `dosage_form` - Form type (e.g., "Tablet", "Capsule", "Syrup")
- `manufacturer` - Company name
- `source_url` - URL to official source
- `last_verified` - Date when record was verified (YYYY-MM-DD format)

### Example CSV

```csv
barcode,product_name,active_ingredient,strength,dosage_form,manufacturer,source,source_url,last_verified
8901234567890,Paracetamol 500mg Tablets,Paracetamol,500mg,Tablet,Verified Pharma Ltd,GS1 India,https://www.gs1.org/services/gs1-india,2024-01-15
8901234567891,Ibuprofen 400mg Capsules,Ibuprofen,400mg,Capsule,Trusted Medicines Inc,FDA NDC,https://www.fda.gov/drugs/ndc,2024-01-15
```

### CSV Rules

1. **No header comments** - Remove all lines starting with `#`
2. **Unique barcodes** - Each barcode must appear only once
3. **Preserve leading zeros** - Use `0123456789012`, not `123456789012`
4. **No empty required fields** - barcode, product_name, and source are mandatory
5. **Valid date format** - Use YYYY-MM-DD for last_verified (if provided)

---

## Step 3: Validate Your CSV

Before importing, validate your CSV file to catch errors early.

### Run the Validation Script

```bash
node scripts/validate-catalog-csv.js data/your_products.csv
```

### What the Script Checks

✅ **Required fields** - barcode, product_name, source present  
✅ **Barcode format** - Valid EAN/UPC/Code128 format  
✅ **Unique barcodes** - No duplicates  
✅ **Date format** - Valid YYYY-MM-DD if provided  
⚠️ **Warnings** - Flags suspicious sources (demo, sample, test, fake)  

### Example Output

```
🔍 Validating CSV file: data/my_products.csv

✅ Header validation passed
   Required columns: barcode, product_name, source
   Optional columns: active_ingredient, strength, dosage_form, manufacturer, source_url, last_verified

📊 Validation Results:

   Total rows: 50
   Valid rows: 50
   Errors: 0
   Warnings: 0

✅ CSV is valid and ready for import!

📋 Next steps:
   1. Review the data to ensure all records are from verified sources
   2. Go to Supabase Dashboard → Table Editor → product_catalog
   3. Click "Import" and upload this CSV file
   4. Verify the import was successful
```

---

## Step 4: Import to Supabase

### Option A: Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard/
   - Select your project

2. **Navigate to Table Editor**
   - Click "Table Editor" in left sidebar
   - Select `product_catalog` table

3. **Import CSV**
   - Click "Import" button (top right)
   - Upload your validated CSV file
   - Review the import preview
   - Click "Confirm" to import

4. **Verify Import**
   - Check record count matches your CSV
   - Spot-check a few records for accuracy
   - Run a test barcode lookup in the app

### Option B: SQL Function (For Small Imports)

For importing a few records at a time, use the SQL function:

```sql
SELECT import_product_catalog_record(
  '8901234567890',           -- barcode (required)
  'Paracetamol 500mg',       -- product_name (required)
  'Paracetamol',             -- active_ingredient (optional)
  '500mg',                   -- strength (optional)
  'Tablet',                  -- dosage_form (optional)
  'Verified Pharma Ltd',     -- manufacturer (optional)
  'GS1 India'                -- source (required)
);
```

**Note:** This function uses `SECURITY DEFINER` to bypass RLS, allowing it to insert records. It's safe because it only runs in the SQL Editor with your authenticated session.

### Option C: Direct SQL (Advanced)

For bulk imports or custom logic:

```sql
INSERT INTO product_catalog (
  barcode, product_name, active_ingredient, strength, dosage_form, 
  manufacturer, source, source_url, last_verified
) VALUES (
  '8901234567890',
  'Paracetamol 500mg Tablets',
  'Paracetamol',
  '500mg',
  'Tablet',
  'Verified Pharma Ltd',
  'GS1 India',
  'https://www.gs1.org/services/gs1-india',
  '2024-01-15'
)
ON CONFLICT (barcode) DO UPDATE SET
  product_name = EXCLUDED.product_name,
  active_ingredient = EXCLUDED.active_ingredient,
  strength = EXCLUDED.strength,
  dosage_form = EXCLUDED.dosage_form,
  manufacturer = EXCLUDED.manufacturer,
  source = EXCLUDED.source,
  source_url = EXCLUDED.source_url,
  last_verified = EXCLUDED.last_verified,
  updated_at = now();
```

---

## Step 5: Verify the Import

After importing, verify everything works correctly.

### Check Record Count

```sql
SELECT COUNT(*) FROM product_catalog;
```

Should match the number of records in your CSV.

### Test Barcode Lookup

1. Open the MedVerify app
2. Scan a barcode you just imported
3. Verify the product details display correctly
4. Check that all fields (name, ingredient, strength, etc.) are accurate

### Spot-Check Records

```sql
SELECT * FROM product_catalog 
WHERE source = 'Your Source Name'
ORDER BY created_at DESC
LIMIT 10;
```

Review the results to ensure data integrity.

---

## Security & Privacy

### What's Protected

✅ **RLS Enabled** - Users can only READ, not modify  
✅ **No service_role in browser** - Only anon key used client-side  
✅ **Audit trail** - created_at and updated_at timestamps  
✅ **Source tracking** - Every record has a source field  

### What You Must Do

✅ **Verify sources** - Only import from official, authoritative sources  
✅ **Document sources** - Record source_url and last_verified  
✅ **Regular updates** - Re-verify records periodically  
✅ **Monitor usage** - Check Supabase logs for suspicious activity  

### What You Must NOT Do

❌ **Never expose service_role key** - Keep it server-side only  
❌ **Never import fake data** - No demo/sample/test records  
❌ **Never claim authenticity** - Barcode lookup ≠ medicine verification  
❌ **Never skip validation** - Always run the validation script  

---

## Troubleshooting

### Import Failed: Duplicate Barcode

**Error:** `duplicate key value violates unique constraint "product_catalog_barcode_key"`

**Solution:**
- Check your CSV for duplicate barcodes
- Run the validation script: `node scripts/validate-catalog-csv.js your_file.csv`
- Remove or update duplicates before importing

### Import Failed: Missing Required Field

**Error:** `null value in column "product_name" violates not-null constraint`

**Solution:**
- Ensure all required fields (barcode, product_name, source) are present
- Check for empty cells in your CSV
- Run the validation script to catch missing fields

### Barcode Lookup Returns "Not Found"

**Possible causes:**
1. Record not imported yet - Check Supabase Table Editor
2. Barcode mismatch - Verify exact match (including leading zeros)
3. Catalog not configured - Check `VITE_USE_SUPABASE_CATALOG=true` in `.env`

**Debug:**
```sql
SELECT * FROM product_catalog WHERE barcode = 'your_barcode_here';
```

### Validation Script Fails

**Common issues:**
- CSV has comments (lines starting with `#`) - Remove them
- Missing required columns - Add barcode, product_name, source
- Invalid date format - Use YYYY-MM-DD
- Duplicate barcodes - Remove duplicates

---

## Best Practices

### Data Quality

1. **Use official sources only** - GS1, FDA, national regulatory bodies
2. **Cross-reference data** - Verify with at least two sources when possible
3. **Document everything** - Record source_url and last_verified
4. **Regular updates** - Re-verify records every 6-12 months
5. **Validate before import** - Always run the validation script

### Barcode Formats

- **EAN-13**: 13 digits (most common for medicines)
- **EAN-8**: 8 digits (small packages)
- **UPC-A**: 12 digits (North America)
- **UPC-E**: 8 digits (North America, small packages)
- **Code 128**: Alphanumeric (variable length)

**Important:** Preserve leading zeros! `0123456789012` ≠ `123456789012`

### Source Naming

Use clear, descriptive source names:
- ✅ "GS1 India"
- ✅ "FDA NDC Directory"
- ✅ "CDSCO Official Database"
- ❌ "internet"
- ❌ "unknown"
- ❌ "demo"

---

## Legal & Compliance

### Data Licensing

- **GS1 Data**: Requires GS1 membership and license agreement
- **FDA Data**: Public domain (US government work)
- **Other Sources**: Check terms of use and licensing

### Privacy

- **No patient data** - Product catalog contains only product information
- **No personal data** - Do not include patient-specific information
- **Public information** - Product names, ingredients, manufacturers are public

### Medical Disclaimer

**IMPORTANT:** A barcode lookup does NOT prove:
- ❌ Medicine authenticity
- ❌ Medicine safety
- ❌ Medicine efficacy
- ❌ Proper storage conditions
- ❌ Valid expiry date

The catalog only identifies products by barcode. Physical verification requires:
- Visual inspection of packaging
- Verification with pharmacist
- Laboratory testing (if needed)

---

## Support

### Documentation

- [Supabase Import Guide](https://supabase.com/docs/guides/database/import-data)
- [GS1 Standards](https://www.gs1.org/standards)
- [FDA NDC Directory](https://www.fda.gov/drugs/drug-approvals-and-databases/national-drug-code-directory)

### Project Files

- CSV Template: `data/product_catalog_template.csv`
- Validation Script: `scripts/validate-catalog-csv.js`
- Database Migration: `supabase/migrations/002_product_catalog.sql`
- Catalog Code: `src/lib/supabaseCatalog.ts`

### Getting Help

1. Check the validation script output for specific errors
2. Review Supabase Dashboard logs for import errors
3. Verify your CSV matches the template format
4. Ensure all required fields are present and valid

---

## Summary

**To safely import verified medicine records:**

1. ✅ Verify your data source is official and authoritative
2. ✅ Prepare CSV using the template
3. ✅ Run validation script: `node scripts/validate-catalog-csv.js your_file.csv`
4. ✅ Import via Supabase Dashboard → Table Editor → product_catalog → Import
5. ✅ Verify import and test barcode lookup
6. ✅ Document sources and verification dates

**Remember:**
- Only import VERIFIED records from OFFICIAL sources
- Never expose service_role key in browser code
- Barcode lookup ≠ medicine authenticity verification
- Validate before importing, verify after importing

---

**Last Updated:** 2024  
**Status:** Production-ready workflow for verified data import
