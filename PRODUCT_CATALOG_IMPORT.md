# MedVerify - Product Catalog Import Guide

## Overview

The product catalog enables barcode lookup for medicine identification. This guide explains how to safely import **verified** medicine records from official sources.

## ⚠️ Critical Security Notice

**The product catalog is READ-ONLY for application users.** Records can only be added via:
1. Supabase Dashboard (Table Editor or CSV import)
2. Server-side scripts using the service_role key (NOT in browser code)

**NEVER:**
- Put the service_role key in browser code
- Import fake, sample, or unverified data
- Claim a barcode proves medicine authenticity or safety

## Quick Start

### 1. Prepare Your CSV

Copy the template:
```bash
cp data/product_catalog_template.csv data/my_products.csv
```

Edit `data/my_products.csv` with your verified records.

**Required columns:**
- `barcode` - Unique barcode (preserve leading zeros)
- `product_name` - Full product name
- `source` - Data source (e.g., "GS1 India", "FDA NDC")

**Optional columns:**
- `active_ingredient` - Generic name
- `strength` - Dosage strength (e.g., "500mg")
- `dosage_form` - Form type (e.g., "Tablet")
- `manufacturer` - Company name
- `source_url` - URL to official source
- `last_verified` - Verification date (YYYY-MM-DD)

### 2. Validate Your CSV

```bash
node scripts/validate-catalog-csv.js data/my_products.csv
```

The script checks:
- ✅ Required fields present
- ✅ Valid barcode format
- ✅ No duplicate barcodes
- ✅ Valid date format
- ⚠️ Warns about suspicious sources

### 3. Import to Supabase

**Option A: Via Dashboard (Recommended)**
1. Go to Supabase Dashboard → Table Editor
2. Select `product_catalog` table
3. Click "Import" → Upload your validated CSV
4. Verify import succeeded

**Option B: Via SQL (Small batches)**
```sql
SELECT import_product_catalog_record(
  '8901234567890',           -- barcode
  'Paracetamol 500mg',       -- product_name
  'Paracetamol',             -- active_ingredient
  '500mg',                   -- strength
  'Tablet',                  -- dosage_form
  'Verified Pharma Ltd',     -- manufacturer
  'GS1 India'                -- source
);
```

### 4. Verify Import

```sql
SELECT COUNT(*) FROM product_catalog;
```

Test in the app:
1. Scan a barcode you imported
2. Verify product details display correctly

## Data Source Verification

### ✅ Acceptable Sources

**Official Government/Regulatory:**
- GS1 (global barcode standards) - https://www.gs1.org/
- FDA National Drug Code (NDC) - https://www.fda.gov/drugs/ndc
- CDSCO (India) - https://cdsco.gov.in/
- EMA (Europe) - https://www.ema.europa.eu/
- MHRA (UK) - https://www.mhra.gov.uk/

**Verified Commercial:**
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
5. **Validate format**: Ensure barcodes match official formats

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

## Medical Disclaimer

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

## Troubleshooting

### Import Failed: Duplicate Barcode

**Error:** `duplicate key value violates unique constraint`

**Solution:**
- Check CSV for duplicate barcodes
- Run validation script
- Remove duplicates before importing

### Import Failed: Missing Required Field

**Error:** `null value in column violates not-null constraint`

**Solution:**
- Ensure barcode, product_name, and source are present
- Check for empty cells in CSV
- Run validation script

### Barcode Lookup Returns "Not Found"

**Possible causes:**
1. Record not imported yet
2. Barcode mismatch (check leading zeros)
3. Catalog not configured

**Debug:**
```sql
SELECT * FROM product_catalog WHERE barcode = 'your_barcode';
```

## Best Practices

### Data Quality

1. **Use official sources only** - GS1, FDA, national regulatory bodies
2. **Cross-reference data** - Verify with at least two sources
3. **Document everything** - Record source_url and last_verified
4. **Regular updates** - Re-verify records every 6-12 months
5. **Validate before import** - Always run the validation script

### Barcode Formats

- **EAN-13**: 13 digits (most common)
- **EAN-8**: 8 digits (small packages)
- **UPC-A**: 12 digits (North America)
- **UPC-E**: 8 digits (North America, small packages)
- **Code 128**: Alphanumeric (variable length)

**Important:** Preserve leading zeros! `0123456789012` ≠ `123456789012`

## Files

- **Template**: `data/product_catalog_template.csv`
- **Validator**: `scripts/validate-catalog-csv.js`
- **Migration**: `supabase/migrations/002_product_catalog.sql`
- **Detailed Guide**: `docs/IMPORTING_VERIFIED_RECORDS.md`
- **Setup Guide**: `SUPABASE_SETUP.md`

## Support

- [Supabase Import Guide](https://supabase.com/docs/guides/database/import-data)
- [GS1 Standards](https://www.gs1.org/standards)
- [FDA NDC Directory](https://www.fda.gov/drugs/drug-approvals-and-databases/national-drug-code-directory)
- [Detailed Import Guide](docs/IMPORTING_VERIFIED_RECORDS.md)

## Summary

**To safely import verified medicine records:**

1. ✅ Verify your data source is official and authoritative
2. ✅ Prepare CSV using the template
3. ✅ Run validation script
4. ✅ Import via Supabase Dashboard
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
