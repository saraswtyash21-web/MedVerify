# MedVerify — Configuration Guide

This document describes what is genuinely functional in the current build, and what requires external services or verified data to enable.

**No fake APIs, medicine records, or credentials are included.** Every external dependency is listed below with its official documentation and what is needed.

---

## Current State (No External Services)

The following features work with no external services configured:

| Feature | Status | Notes |
|---------|--------|-------|
| OCR text extraction | ✅ Functional | Uses Tesseract.js in the browser |
| Barcode scanning | ✅ Functional | Uses @zxing/library; reads number only |
| Expiry date checking | ✅ Functional | Parses dates from scanned text |
| Field editing | ✅ Functional | Users correct OCR results |
| Hindi/English UI | ✅ Functional | All strings translated |
| Light/Dark mode | ✅ Functional | Persists in localStorage |
| Voice assistant (TTS) | ✅ Functional | Web Speech API where supported |
| PDF report export | ✅ Functional | jsPDF-based |
| Demo UI flow | ✅ Functional | Clearly labeled as demo |

The following features are **not functional** without external services:

| Feature | Status | What's Needed |
|---------|--------|---------------|
| Quality-alert verification | ❌ Not functional | Real data source (see below) |
| Barcode product lookup | ❌ Not functional | GS1 or similar API (see below) |
| Production authentication | ❌ Not functional | Real identity provider (see below) |
| Medicine knowledge database | ❌ Not functional | RxNorm, DailyMed, or similar (see below) |

---

## Required External Services

### 1. Quality-Alert Data Source (for verification)

**Purpose:** Check scanned medicines against official quality-alert records.

**Current state:** No data source is configured. `src/config.ts` declares two CDSCO sources with `enabled: false`.

**Options:**

#### Option A: CDSCO NSQ Records (India)
- **URL:** https://cdscoonline.gov.in/CDSCO/viewPublicNSQDrug
- **API:** None. The website does not provide a public API or downloadable dataset.
- **Credentials required:** None for viewing; data sharing agreement may be needed for bulk access.
- **How to integrate:**
  1. Manually download records from the CDSCO portal (comply with their terms of use).
  2. Convert to CSV with columns: `id, productName, manufacturer, batchNumber, strength, reason, sourceUrl, publicationDate`.
  3. Import into the app by populating `realAlertRecords` in `src/data/appData.ts`.
  4. Set `enabled: true` for the `cdsko-nsq` source in `src/config.ts`.
  5. Update `recordCount`, `retrievalDate`, and `lastVerified`.

#### Option B: Other National Regulatory Sources
- **US FDA:** https://www.fda.gov/drugs/drug-safety-and-availability/drug-recalls (RSS/API available)
- **UK MHRA:** https://www.gov.uk/drug-safety-update
- **EU EMA:** https://www.ema.europa.eu/en/human-regulatory/overview/marketing-authorisation/medicine-shortages
- Each has different access methods; check their official documentation.

**Configuration file:** `src/config.ts`

```typescript
dataSources: [
  {
    id: 'cdsko-nsq',
    enabled: true,                    // ← flip to true after importing data
    recordCount: 123,                 // ← actual count after import
    retrievalDate: '2025-01-15',      // ← when you retrieved the data
    lastVerified: '2025-01-15',
    // ...
  }
]
```

---

### 2. Barcode Product Lookup

**Purpose:** Look up product details from a scanned barcode number.

**Current state:** No product database is connected. A barcode number is displayed but not looked up.

**Options:**

#### Option A: GS1 Data Hub
- **URL:** https://www.gs1.org/services/data-hub
- **API:** GS1 Web API (commercial)
- **Credentials required:** GS1 membership + API key
- **Documentation:** https://www.gs1.org/standards/digital-link

#### Option B: Open Food Facts (food only, not medicines)
- **URL:** https://world.openfoodfacts.org/data
- **API:** Free, no key required
- **Limitation:** Food products only; not suitable for medicines.

#### Option C: National Drug Database
- **India:** No public barcode-to-medicine API exists.
- **US:** FDA National Drug Code (NDC) Directory — https://www.fda.gov/drugs/drug-approvals-and-databases/national-drug-code-directory
- **Credentials:** Varies by country.

**Configuration file:** `src/config.ts`

```typescript
barcodeLookup: {
  enabled: true,
  provider: 'gs1',           // or 'custom'
  // Add API key configuration here
}
```

---

### 3. Production Authentication

**Purpose:** Secure user accounts, session management, and data protection.

**Current state:** UI-only demo using localStorage. Passwords are NOT stored (only email addresses are tracked). This is NOT secure and should not be used for production.

**Recommended providers:**

#### Option A: Supabase Auth (recommended for free tier)
- **URL:** https://supabase.com/docs/guides/auth
- **Free tier:** 50,000 monthly active users
- **Credentials required:** Supabase project URL + anon key
- **Integration:** Replace `AuthProvider` in `src/contexts.tsx` with Supabase client.

#### Option B: Firebase Authentication
- **URL:** https://firebase.google.com/docs/auth
- **Free tier:** Generous limits
- **Credentials required:** Firebase project config
- **Integration:** Replace `AuthProvider` with Firebase Auth SDK.

#### Option C: Auth0
- **URL:** https://auth0.com/docs
- **Free tier:** 7,500 active users
- **Credentials required:** Auth0 domain + client ID + client secret

#### Option D: AWS Cognito
- **URL:** https://docs.aws.amazon.com/cognito/
- **Free tier:** 50,000 users for first 12 months
- **Credentials required:** AWS account + Cognito user pool

**Configuration file:** `src/config.ts`

```typescript
auth: {
  provider: 'supabase',        // or 'firebase', 'auth0', 'custom'
  // Add provider-specific configuration here
}
```

---

### 4. Medicine Knowledge Database

**Purpose:** Answer user questions about medicines with authoritative information.

**Current state:** Small local knowledge base with ~8 general entries. Not comprehensive.

**Options:**

#### Option A: RxNorm (US)
- **URL:** https://www.nlm.nih.gov/research/umls/rxnorm/index.html
- **API:** NLM RxNorm REST API (free)
- **Credentials:** None required
- **Documentation:** https://www.nlm.nih.gov/research/umls/rxnorm/docs.html

#### Option B: OpenDailyMed / DailyMed (US)
- **URL:** https://dailymed.nlm.nih.gov/
- **API:** https://dailymed.nlm.nih.gov/development-info/
- **Credentials:** None required

#### Option C: Indian Pharmacopoeia
- **URL:** https://ipc.gov.in/
- **API:** None public; manual import required.

**Configuration file:** `src/config.ts` (add new section)

```typescript
medicineKnowledge: {
  enabled: true,
  provider: 'rxnorm',          // or 'dailymed', 'custom'
  // Add API configuration here
}
```

---

## How to Add a Real Data Source (Step-by-Step)

### Example: Adding CDSCO NSQ Records

1. **Obtain data:**
   - Visit https://cdscoonline.gov.in/CDSCO/viewPublicNSQDrug
   - Download records (comply with terms of use)
   - Save as `data/cdsco-nsq-records.csv`

2. **Convert to TypeScript:**
   - Create a script or manually convert CSV to TypeScript array
   - Each record must have: `id`, `productName`, `manufacturer`, `batchNumber`, `strength`, `reason`, `sourceUrl`, `publicationDate`
   - Set `isDemo: false` for all imported records

3. **Update `src/data/appData.ts`:**
   ```typescript
   import { cdsoRecords } from './cdsco-import';
   export const realAlertRecords: AlertRecord[] = cdsoRecords;
   ```

4. **Update `src/config.ts`:**
   ```typescript
   {
     id: 'cdsko-nsq',
     enabled: true,
     recordCount: cdsoRecords.length,
     retrievalDate: '2025-01-15',
     lastVerified: '2025-01-15',
     // ...
   }
   ```

5. **Rebuild:**
   ```bash
   npm run build
   ```

6. **Verify:**
   - Open the app
   - The demo banner should disappear (if all sources are enabled)
   - The data source panel should show green checkmarks
   - Scanning a medicine should now perform real verification

---

## Safety Guarantees

The current build enforces these safety rules:

1. ✅ Synthetic records are **never** used in real verification
2. ✅ Without a real data source, outcome is always `UNABLE_TO_VERIFY`
3. ✅ "No alert found" is **never** shown based on local demo data
4. ✅ Barcode disclaimer explicitly states it does not prove identity/safety
5. ✅ Auth pages clearly state they are NOT secure
6. ✅ Demo mode banner visible at top of app
7. ✅ Data source panel shows honest connection status per source
8. ✅ Every report includes a `dataModeNote` explaining what was actually checked
9. ✅ Passwords are NOT stored (only email addresses are tracked)

---

## Files Reference

| File | Purpose |
|------|---------|
| `src/config.ts` | Central configuration — what is enabled, what needs credentials |
| `src/data/appData.ts` | Data layer — separates real records from demo records |
| `src/utils/verification.ts` | Verification logic — respects config, never uses demo data for real results |
| `src/contexts.tsx` | Auth context — demo-only, does NOT store passwords |
| `src/components/AuthPages.tsx` | Login UI — clearly labeled as demo |
| `src/App.tsx` | Main app — demo banner, data source status panel |
| `src/utils/barcode.ts` | Barcode scanning — disclaimer that it doesn't verify |

---

## Commands

```bash
# Development
npm run dev

# Production build
npm run build

# Type check
npm run typecheck
```

---

## Summary

**This build is NOT production-ready.** It is a functional MVP that honestly declares what is and is not connected. To make it production-ready, you must:

1. Configure at least one real quality-alert data source
2. Replace demo auth with a real identity provider
3. (Optional) Configure barcode product lookup
4. (Optional) Expand the medicine knowledge base

No fake data, credentials, or APIs are included. All external dependencies are documented with official links.
