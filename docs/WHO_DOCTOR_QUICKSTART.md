# WHO Alerts & Doctor Info - Quick Start Guide

## 🎯 What's New

Two powerful new features have been added to MedVerify:

1. **WHO Medical Product Alerts** - Check medicines against official WHO safety alerts
2. **Doctor Medicine Information** - Access comprehensive drug information for healthcare professionals

---

## 📋 WHO Medical Product Alerts

### What It Does
Checks scanned medicines against official WHO alerts for falsified, substandard, or contaminated products.

### How to Use

#### Step 1: Scan Medicine
- Upload medicine package photo OR
- Scan barcode

#### Step 2: Review Extracted Fields
- Check product name, manufacturer, batch number
- Edit if OCR made mistakes

#### Step 3: Run Verification
- Click "Run Verification Check"
- WHO alerts check runs automatically

#### Step 4: View Results

**🔴 Alert Found (Red Warning)**
```
⚠️ WHO Alert Found!

Alert Number: 3/2026
Product: DARZALEX (daratumumab)
Issue Type: falsified
Affected Batches: MYS7381, STV1K01

Description: [Full alert details]
Risks: [Safety risks]
Advice: [What to do]

🚨 DO NOT USE this product. 
Consult a pharmacist or healthcare professional immediately.
```

**🟢 No Alert Found (Green Message)**
```
✓ No WHO Alert Found

No matching WHO alert found in the checked records.

Data Source: WHO Medical Product Alerts
Last checked: [Date]
Alerts checked: [Number]

⚠️ Important: No alert found does NOT mean the medicine is safe, 
authentic, or approved. The WHO alert database may not be 
comprehensive or up-to-date.
```

**🟡 No Data Loaded (Yellow Message)**
```
ℹ WHO Alerts Not Available

No WHO alert records are loaded. WHO alert data must be imported 
to enable WHO verification.

How to add WHO alert data:
1. Visit WHO alerts page: [Link]
2. Export alert data to JSON/CSV
3. Import data into src/data/whoAlerts.ts
```

### Important Notes
- ⚠️ WHO alerts must be manually imported (WHO has no public API)
- ⚠️ "No alert found" ≠ medicine is safe
- ⚠️ Always check physical packaging for tampering
- ⚠️ Consult pharmacist/doctor for concerns

---

## 🩺 Doctor Medicine Information

### What It Does
Provides comprehensive drug information from DailyMed (NIH/NLM) for healthcare professionals.

### How to Use

#### Step 1: Open Doctor Info
- Click "Doctor Info" in navigation menu
- Icon: 🩺 Stethoscope

#### Step 2: Search Drug
- Enter brand name (e.g., "Tylenol") OR
- Enter generic name (e.g., "Acetaminophen")
- Click "Search"

#### Step 3: Review Information

**Basic Information**
- Brand name
- Generic name
- Dosage forms (tablet, capsule, etc.)
- Routes (oral, injection, etc.)

**Active Ingredients**
- Ingredient names
- Strengths and units

**Clinical Sections** (when available)
- ✅ Indications (what it's used for)
- ⚠️ Contraindications (when NOT to use)
- ⚠️ Warnings (important safety information)
- Adverse Reactions (side effects)
- Drug Interactions (medicines that interact)
- Dosing Information (how to use)

**Source Citation**
- DailyMed (NIH/NLM) - Official U.S. government source
- Direct link to full label
- Last updated date

### Example Output

```
📖 Acetaminophen

Brand Name: Tylenol
Generic Name: Acetaminophen
Dosage Forms: Tablet, Capsule, Liquid
Routes: Oral

Active Ingredients:
• Acetaminophen - 500 mg per tablet

Indications:
• Relief of mild to moderate pain
• Reduction of fever

Contraindications:
• Hypersensitivity to acetaminophen
• Severe liver disease

Warnings:
• Do not exceed recommended dose
• May cause liver damage
• Avoid alcohol while taking

Adverse Reactions:
• Nausea
• Stomach pain
• Loss of appetite
• Dark urine
• Yellowing of skin/eyes

Source: DailyMed (NIH/NLM)
Last updated: 2024-01-15
[View full label on DailyMed →]

⚠️ This information is for healthcare professionals only. 
This is not medical advice. Review the full label and medical 
literature before making clinical decisions.
```

### Important Notes
- ✅ For healthcare professionals only
- ⚠️ This is NOT medical advice
- ⚠️ U.S. drug labels only (may not include all international drugs)
- ⚠️ Always review full official label before clinical decisions
- ⚠️ Verify against current clinical guidelines

---

## 🔧 Setup & Configuration

### WHO Alerts (Requires Manual Setup)

**Current Status**: ⚠️ Not enabled by default

**Why**: WHO does not provide a public API for automated data retrieval

**How to Enable**:

1. **Visit WHO Alerts Page**
   ```
   https://www.who.int/teams/regulation-prequalification/incidents-and-SF/full-list-of-who-medical-product-alerts
   ```

2. **Extract Alert Data**
   - Manually review alerts on the page
   - Note alert numbers, dates, products, batch numbers
   - Copy descriptions, risks, and advice

3. **Create JSON Data**
   ```typescript
   import { setWHOAlerts } from './data/whoAlerts';
   
   const alerts = [
     {
       id: 'who-2026-003',
       alertNumber: '3/2026',
       date: '2026-07-03',
       productName: 'DARZALEX',
       genericName: 'daratumumab',
       manufacturer: 'JANSSEN',
       batchNumbers: ['MYS7381', 'STV1K01'],
       countries: ['Maldives', 'Mexico'],
       issueType: 'falsified',
       description: 'Falsified DARZALEX identified...',
       risks: 'Falsified DARZALEX poses serious risk...',
       advice: 'Health-care professionals should report...',
       sourceUrl: 'https://www.who.int/news/item/03-07-2026...',
       lastChecked: '2024-01-15'
     },
     // Add more alerts...
   ];
   
   setWHOAlerts(alerts, '2024-01-15');
   ```

4. **Enable in Config**
   ```typescript
   // src/config.ts
   whoAlerts: {
     enabled: true,  // Change from false to true
     notes: '...'
   }
   ```

5. **Rebuild Application**
   ```bash
   npm run build
   ```

### Doctor Info (Ready to Use)

**Current Status**: ✅ Enabled by default

**Configuration**:
```typescript
// src/config.ts
doctorInfo: {
  enabled: true,
  provider: 'dailymed',
  notes: 'Using DailyMed (NIH/NLM) API...'
}
```

**No setup required** - works out of the box!

---

## 🧪 Testing

### Test WHO Alerts

**Test 1: No Data Loaded**
1. Keep `config.whoAlerts.enabled = false`
2. Scan medicine
3. Run verification
4. ✅ Should see yellow "WHO Alerts Not Available" message

**Test 2: No Match Found**
1. Import some WHO alerts
2. Scan medicine NOT in alerts
3. Run verification
4. ✅ Should see green "No WHO Alert Found" message

**Test 3: Alert Matched**
1. Import WHO alert for specific product
2. Scan that product
3. Run verification
4. ✅ Should see red warning with full alert details

### Test Doctor Info

**Test 1: Successful Search**
1. Click "Doctor Info"
2. Search "Paracetamol"
3. ✅ Should see comprehensive drug information

**Test 2: Drug Not Found**
1. Search for non-existent drug
2. ✅ Should see error message

**Test 3: Network Error**
1. Disable internet
2. Search for any drug
3. ✅ Should see error about retrieval failure

---

## 📊 Data Sources

### WHO Medical Product Alerts
- **Source**: World Health Organization
- **URL**: https://www.who.int/teams/regulation-prequalification/incidents-and-SF/full-list-of-who-medical-product-alerts
- **Coverage**: Global alerts for falsified/substandard/contaminated products
- **Update**: Manual import required
- **API**: None available (WHO limitation)
- **License**: WHO public health information

### DailyMed (Doctor Info)
- **Source**: National Library of Medicine (NIH/NLM)
- **URL**: https://dailymed.nlm.nih.gov/
- **Coverage**: FDA-approved drug labels (U.S. market)
- **Update**: Real-time via API
- **API**: Official REST API v2
- **License**: U.S. Government work (public domain)

---

## ⚠️ Important Disclaimers

### WHO Alerts
- Database may not be comprehensive
- May not include recent alerts
- "No alert found" does NOT mean medicine is safe
- Always verify with pharmacist/doctor
- Check physical packaging for tampering

### Doctor Info
- For healthcare professionals only
- This is NOT medical advice
- U.S. drug labels only
- May not include all international medications
- Always review full official label
- Verify against current clinical guidelines

---

## 🆘 When to Seek Help

### Contact Pharmacist/Doctor If:
- WHO alert found for your medicine
- Medicine looks suspicious or tampered
- You experience adverse reactions
- You're unsure about medicine safety
- You need medical advice

### Emergency Situations
- Severe allergic reaction
- Difficulty breathing
- Chest pain
- Unconsciousness
- Call emergency services immediately

---

## 📚 Additional Resources

### WHO Alerts
- [WHO Medical Product Alerts](https://www.who.int/teams/regulation-prequalification/incidents-and-SF/full-list-of-who-medical-product-alerts)
- [WHO Patient Safety](https://www.who.int/teams/integrated-health-services/patient-safety)

### Doctor Info
- [DailyMed](https://dailymed.nlm.nih.gov/)
- [FDA Drug Information](https://www.fda.gov/drugs)
- [NIH NLM](https://www.nlm.nih.gov/)

### General
- [MedVerify Documentation](../README.md)
- [Safety Guide](./SAFETY_GUIDE.md)

---

## 🎓 For Healthcare Professionals

### Using Doctor Info Effectively

1. **Verify Drug Identity**
   - Check brand and generic names
   - Verify dosage form and strength
   - Confirm route of administration

2. **Review Clinical Information**
   - Check indications match patient condition
   - Review contraindications for patient factors
   - Assess warnings for patient-specific risks
   - Check for drug interactions with current medications

3. **Check Dosing**
   - Review dosing information
   - Adjust for renal/hepatic impairment if needed
   - Consider patient age and weight
   - Verify against institutional protocols

4. **Monitor Patients**
   - Review monitoring requirements
   - Check for adverse reactions
   - Assess therapeutic effectiveness
   - Document outcomes

### Best Practices
- Always review full DailyMed label
- Cross-reference with clinical guidelines
- Consider patient-specific factors
- Document clinical decisions
- Report adverse events

---

## 🔐 Privacy & Security

### Data Handling
- ✅ No patient data stored
- ✅ No API keys in browser code
- ✅ Client-side processing only
- ✅ No tracking or analytics
- ✅ Secure HTTPS connections

### WHO Alerts
- Matching happens in browser
- No data sent to external servers
- Alert data stored locally (if imported)

### Doctor Info
- Search queries sent to DailyMed API
- No personal information transmitted
- Results displayed locally
- No search history saved

---

## 📞 Support

### Issues or Questions
- Check [WHO_DOCTOR_FEATURES.md](./WHO_DOCTOR_FEATURES.md) for detailed documentation
- Review [SAFETY_GUIDE.md](./SAFETY_GUIDE.md) for safety information
- See [README.md](../README.md) for general help

### Reporting Problems
- WHO alert matching issues: Check data import
- Doctor Info errors: Check internet connection
- UI problems: Check browser console for errors
- Safety concerns: Contact healthcare professional immediately

---

**Last Updated:** 2024  
**Version:** 1.0  
**Status:** ✅ Production Ready
