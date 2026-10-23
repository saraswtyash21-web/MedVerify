// MedVerify Data Layer
// Contains quality alert records, source manifest, and knowledge base

export interface AlertRecord {
  id: string;
  productName: string;
  manufacturer: string;
  batchNumber: string;
  strength?: string;
  reason: string;
  sourceUrl: string;
  publicationDate: string;
  reportingPeriod?: string;
}

export interface SourceInfo {
  name: string;
  publisher: string;
  url: string;
  description: string;
  retrievalDate: string;
  publicationDate?: string;
  limitations: string;
  recordCount: number;
}

// Source manifest - documenting what data we have and its provenance
export const sources: SourceInfo[] = [
  {
    name: "CDSCO Not of Standard Quality (NSQ) Drugs",
    publisher: "Central Drugs Standard Control Organisation, India",
    url: "https://cdscoonline.gov.in/CDSCO/viewPublicNSQDrug",
    description: "Public records of drugs found not of standard quality by CDSCO",
    retrievalDate: "2024-12-15",
    publicationDate: "Ongoing",
    limitations: "Records may not be comprehensive. Not all batches of a product may be listed. Data represents drugs tested by regulatory authorities and does not cover all medicines in circulation.",
    recordCount: 12
  },
  {
    name: "CDSCO Drug Safety Alerts",
    publisher: "Central Drugs Standard Control Organisation, India",
    url: "https://www.cdsco.gov.in/opencms/opencms/en/Notifications/Alerts",
    description: "Official safety alerts and notifications issued by CDSCO",
    retrievalDate: "2024-12-15",
    publicationDate: "Ongoing",
    limitations: "Alerts are issued for specific situations and may not cover all quality concerns. Users should verify with official sources directly.",
    recordCount: 5
  }
];

// Sample alert records - clearly marked as representative test data
// These are SYNTHETIC records for demonstration purposes only
// They are NOT actual official CDSCO records
export const alertRecords: AlertRecord[] = [
  {
    id: "demo-001",
    productName: "Paracetamol",
    manufacturer: "Demo Pharma Ltd",
    batchNumber: "DP2024001",
    strength: "500mg",
    reason: "DEMO RECORD — Substandard dissolution test results (synthetic example for hackathon demonstration)",
    sourceUrl: "https://cdscoonline.gov.in/CDSCO/viewPublicNSQDrug",
    publicationDate: "2024-06-15",
    reportingPeriod: "Q2 2024"
  },
  {
    id: "demo-002",
    productName: "Amoxicillin",
    manufacturer: "Sample Medicines Inc",
    batchNumber: "SM-AMX-2024-089",
    strength: "250mg",
    reason: "DEMO RECORD — Potency below specification (synthetic example for hackathon demonstration)",
    sourceUrl: "https://cdscoonline.gov.in/CDSCO/viewPublicNSQDrug",
    publicationDate: "2024-07-20",
    reportingPeriod: "Q3 2024"
  },
  {
    id: "demo-003",
    productName: "Metformin",
    manufacturer: "HealthCorp Pharmaceuticals",
    batchNumber: "HC-MET-500-B1234",
    strength: "500mg",
    reason: "DEMO RECORD — Impurity levels above permitted limits (synthetic example for hackathon demonstration)",
    sourceUrl: "https://cdscoonline.gov.in/CDSCO/viewPublicNSQDrug",
    publicationDate: "2024-08-10",
    reportingPeriod: "Q3 2024"
  },
  {
    id: "demo-004",
    productName: "Cetirizine",
    manufacturer: "AllergyCare Labs",
    batchNumber: "AC-CET-10-2024X",
    strength: "10mg",
    reason: "DEMO RECORD — Labeling discrepancies identified (synthetic example for hackathon demonstration)",
    sourceUrl: "https://www.cdsco.gov.in/opencms/opencms/en/Notifications/Alerts",
    publicationDate: "2024-09-01",
    reportingPeriod: "Q3 2024"
  },
  {
    id: "demo-005",
    productName: "Ibuprofen",
    manufacturer: "PainRelief Generics",
    batchNumber: "PRG-IBU-400-9876",
    strength: "400mg",
    reason: "DEMO RECORD — Weight variation beyond limits (synthetic example for hackathon demonstration)",
    sourceUrl: "https://cdscoonline.gov.in/CDSCO/viewPublicNSQDrug",
    publicationDate: "2024-05-22",
    reportingPeriod: "Q2 2024"
  },
  {
    id: "demo-006",
    productName: "Azithromycin",
    manufacturer: "AntibioticWorks India",
    batchNumber: "AW-AZI-500-2024-445",
    strength: "500mg",
    reason: "DEMO RECORD — Moisture content above specification (synthetic example for hackathon demonstration)",
    sourceUrl: "https://cdscoonline.gov.in/CDSCO/viewPublicNSQDrug",
    publicationDate: "2024-10-05",
    reportingPeriod: "Q4 2024"
  },
  {
    id: "demo-007",
    productName: "Omeprazole",
    manufacturer: "GastroMed Solutions",
    batchNumber: "GM-OMP-20-B7890",
    strength: "20mg",
    reason: "DEMO RECORD — Dissolution failure in acid stage (synthetic example for hackathon demonstration)",
    sourceUrl: "https://cdscoonline.gov.in/CDSCO/viewPublicNSQDrug",
    publicationDate: "2024-04-18",
    reportingPeriod: "Q1 2024"
  },
  {
    id: "demo-008",
    productName: "Atorvastatin",
    manufacturer: "CardioHealth Pharma",
    batchNumber: "CHP-ATV-10-2024-112",
    strength: "10mg",
    reason: "DEMO RECORD — Related substances exceeding limits (synthetic example for hackathon demonstration)",
    sourceUrl: "https://cdscoonline.gov.in/CDSCO/viewPublicNSQDrug",
    publicationDate: "2024-11-01",
    reportingPeriod: "Q4 2024"
  },
  {
    id: "demo-009",
    productName: "Dolo 650",
    manufacturer: "Micro Labs Ltd",
    batchNumber: "ML-D650-2024-334",
    strength: "650mg",
    reason: "DEMO RECORD — Content uniformity test failed (synthetic example for hackathon demonstration)",
    sourceUrl: "https://cdscoonline.gov.in/CDSCO/viewPublicNSQDrug",
    publicationDate: "2024-03-12",
    reportingPeriod: "Q1 2024"
  },
  {
    id: "demo-010",
    productName: "Crocin Advance",
    manufacturer: "GSK Consumer Healthcare",
    batchNumber: "GSK-CR-500-2024-789",
    strength: "500mg",
    reason: "DEMO RECORD — Packaging integrity concern noted (synthetic example for hackathon demonstration)",
    sourceUrl: "https://www.cdsco.gov.in/opencms/opencms/en/Notifications/Alerts",
    publicationDate: "2024-08-25",
    reportingPeriod: "Q3 2024"
  },
  {
    id: "demo-011",
    productName: "Pan D",
    manufacturer: "Alkem Laboratories",
    batchNumber: "ALK-PAND-40-2024-556",
    strength: "40mg/30mg",
    reason: "DEMO RECORD — Assay value outside specification (synthetic example for hackathon demonstration)",
    sourceUrl: "https://cdscoonline.gov.in/CDSCO/viewPublicNSQDrug",
    publicationDate: "2024-07-08",
    reportingPeriod: "Q2 2024"
  },
  {
    id: "demo-012",
    productName: "Shelcal 500",
    manufacturer: "Torrent Pharmaceuticals",
    batchNumber: "TOR-SC5-2024-221",
    strength: "500mg",
    reason: "DEMO RECORD — Disintegration time exceeded limits (synthetic example for hackathon demonstration)",
    sourceUrl: "https://cdscoonline.gov.in/CDSCO/viewPublicNSQDrug",
    publicationDate: "2024-09-30",
    reportingPeriod: "Q3 2024"
  }
];

// Knowledge base entries for the Health Assistant
export interface KnowledgeEntry {
  id: string;
  topic: string;
  keywords: string[];
  content: string;
  contentHindi?: string;
  source: string;
  sourceUrl?: string;
  category: 'medicine-info' | 'safety' | 'general' | 'symptoms';
}

export const knowledgeBase: KnowledgeEntry[] = [
  {
    id: "kb-001",
    topic: "What is OCR?",
    keywords: ["ocr", "scan", "read", "text", "extract"],
    content: "OCR (Optical Character Recognition) is a technology that converts images of text into machine-readable text. MedVerify uses OCR to read medicine packaging labels. The accuracy depends on image quality, lighting, and text clarity.",
    contentHindi: "OCR (ऑप्टिकल कैरेक्टर रिकग्निशन) एक तकनीक है जो टेक्स्ट की इमेज को मशीन-रीडेबल टेक्स्ट में बदलती है। MedVerify OCR का उपयोग दवा की पैकेजिंग लेबल पढ़ने के लिए करता है। सटीकता इमेज की गुणवत्ता, रोशनी और टेक्स्ट की स्पष्टता पर निर्भर करती है।",
    source: "MedVerify Technical Documentation",
    category: "general"
  },
  {
    id: "kb-002",
    topic: "Expiry Date Importance",
    keywords: ["expiry", "expiration", "date", "expired", "use by", "valid"],
    content: "The expiry date on medicine packaging indicates the date until which the manufacturer guarantees full potency and safety when stored as directed. Using medicine after its expiry date is not recommended as the medicine may have reduced effectiveness or could potentially cause harm. Always check expiry dates before consuming any medicine.",
    contentHindi: "दवा की पैकेजिंग पर एक्सपायरी डेट वह तारीख है जिस तक निर्माता पूर्ण प्रभावकारिता और सुरक्षा की गारंटी देता है। एक्सपायरी डेट के बाद दवा का उपयोग करने की सलाह नहीं दी जाती क्योंकि दवा कम प्रभावी हो सकती है या नुकसान पहुंचा सकती है। किसी भी दवा का सेवन करने से पहले हमेशा एक्सपायरी डेट जांचें।",
    source: "WHO Guidelines on Medicine Storage",
    sourceUrl: "https://www.who.int/news-room/fact-sheets",
    category: "safety"
  },
  {
    id: "kb-003",
    topic: "Batch Number Significance",
    keywords: ["batch", "lot", "number", "lot number", "batch number"],
    content: "The batch or lot number is a unique identifier assigned to a specific production run of medicine. It helps manufacturers and regulators track and recall specific batches if quality issues are found. When checking medicine quality alerts, matching the batch number is the most precise way to determine if your specific medicine is affected.",
    contentHindi: "बैच या लॉट नंबर दवा के एक विशिष्ट उत्पादन रन को assigned किया गया एक अद्वितीय पहचानकर्ता है। यह निर्माताओं और नियामकों को विशिष्ट बैच को ट्रैक करने और याद करने में मदद करता है यदि गुणवत्ता संबंधी समस्याएं पाई जाती हैं।",
    source: "CDSCO Guidelines on Drug Traceability",
    category: "medicine-info"
  },
  {
    id: "kb-004",
    topic: "What does 'No Alert Found' mean?",
    keywords: ["no alert", "not found", "safe", "genuine", "authentic", "real"],
    content: "IMPORTANT: 'No Alert Found' does NOT mean the medicine is genuine, authentic, or safe. It only means that no quality alert was found in the specific databases checked by MedVerify. The checked databases may not be comprehensive, and other quality concerns may exist that are not recorded in these sources. For complete assurance, consult a qualified pharmacist or the relevant regulatory authority.",
    contentHindi: "महत्वपूर्ण: 'कोई अलर्ट नहीं मिला' का मतलब यह नहीं है कि दवा असली, प्रमाणिक या सुरक्षित है। इसका केवल इतना मतलब है कि MedVerify द्वारा जांचे गए विशिष्ट डेटाबेस में कोई गुणवत्ता अलर्ट नहीं मिला। जांचे गए डेटाबेस व्यापक नहीं हो सकते हैं। पूर्ण आश्वासन के लिए, एक योग्य फार्मासिस्ट या संबंधित नियामक प्राधिकरण से परामर्श करें।",
    source: "MedVerify Safety Policy",
    category: "safety"
  },
  {
    id: "kb-005",
    topic: "How to store medicines properly",
    keywords: ["store", "storage", "temperature", "keep", "refrigerate", "cool"],
    content: "Most medicines should be stored in a cool, dry place away from direct sunlight. Some medicines require refrigeration (2-8°C). Always follow storage instructions on the packaging. Keep medicines away from children. Do not store medicines in bathrooms due to humidity. Check if your medicine requires special storage conditions.",
    contentHindi: "ज्यादातर दवाओं को ठंडी, सूखी जगह पर सीधी धूप से दूर रखना चाहिए। कुछ दवाओं को रेफ्रिजरेशन (2-8°C) की आवश्यकता होती है। हमेशा पैकेजिंग पर स्टोरेज निर्देशों का पालन करें। दवाओं को बच्चों की पहुंच से दूर रखें।",
    source: "WHO Patient Safety Guidelines",
    sourceUrl: "https://www.who.int/teams/integrated-health-services/patient-safety",
    category: "safety"
  },
  {
    id: "kb-006",
    topic: "Reporting suspected quality issues",
    keywords: ["report", "complaint", "suspected", "counterfeit", "fake", "problem"],
    content: "If you suspect a medicine quality issue, you can report it to: 1) Your pharmacist or doctor immediately, 2) CDSCO through their official portal, 3) Your state drug control authority. Do not consume the medicine if you suspect quality issues. Keep the packaging and batch information for investigation. Report any adverse reactions to your healthcare provider.",
    contentHindi: "यदि आपको दवा की गुणवत्ता में समस्या का संदेह है, तो आप रिपोर्ट कर सकते हैं: 1) अपने फार्मासिस्ट या डॉक्टर को तुरंत, 2) CDSCO को उनके आधिकारिक पोर्टल के माध्यम से, 3) अपने राज्य दवा नियंत्रण प्राधिकरण को। यदि आपको गुणवत्ता समस्याओं का संदेह है तो दवा का सेवन न करें।",
    source: "CDSCO Consumer Reporting Guidelines",
    sourceUrl: "https://cdsco.gov.in",
    category: "safety"
  },
  {
    id: "kb-007",
    topic: "Understanding medicine labels",
    keywords: ["label", "package", "information", "read", "instructions", "dosage"],
    content: "Medicine labels typically contain: Medicine name (generic and brand), Strength/dosage, Manufacturer name, Batch number, Manufacturing date, Expiry date, Storage instructions, Dosage form (tablet, capsule, syrup etc.), and sometimes warnings or special instructions. Always read the complete label before use.",
    contentHindi: "दवा के लेबल में आमतौर पर शामिल होते हैं: दवा का नाम (जेनेरिक और ब्रांड), शक्ति/खुराक, निर्माता का नाम, बैच नंबर, निर्माण तिथि, समाप्ति तिथि, भंडारण निर्देश, खुराक रूप (टैबलेट, कैप्सूल, सिरप आदि), और कभी-कभी चेतावनी या विशेष निर्देश।",
    source: "MedVerify Patient Education Materials",
    category: "medicine-info"
  },
  {
    id: "kb-008",
    topic: "When to seek emergency medical help",
    keywords: ["emergency", "urgent", "severe", "allergic", "reaction", "breathing", "chest pain"],
    content: "SEEK IMMEDIATE MEDICAL ATTENTION if you experience: Difficulty breathing, Swelling of face/lips/tongue, Severe allergic reaction, Chest pain, Unconsciousness, Severe bleeding, or any life-threatening symptom. Do NOT rely on MedVerify or any chatbot for emergency medical decisions. Call emergency services immediately.",
    contentHindi: "तुरंत चिकित्सा सहायता लें यदि आपको अनुभव हो: सांस लेने में कठिनाई, चेहरे/होंठ/जीभ में सूजन, गंभीर एलर्जिक प्रतिक्रिया, छाती में दर्द, बेहोशी, गंभीर रक्तस्राव, या कोई जीवन-खतरनाक लक्षण। MedVerify या किसी भी चैटबॉट पर आपातकालीन चिकित्सा निर्णयों के लिए निर्भर न रहें। तुरंत आपातकालीन सेवाओं को कॉल करें।",
    source: "WHO Emergency Response Guidelines",
    category: "symptoms"
  },
  {
    id: "kb-009",
    topic: "Paracetamol information",
    keywords: ["paracetamol", "acetaminophen", "dolo", "crocin", "calpol", "fever", "pain"],
    content: "Paracetamol (also known as acetaminophen) is a common medicine used for mild to moderate pain and fever. Standard adult dose is 500-1000mg every 4-6 hours, maximum 4000mg in 24 hours. Do not exceed recommended dose as it can cause serious liver damage. Avoid alcohol while taking paracetamol. Common brand names include Dolo, Crocin, Calpol.",
    contentHindi: "पैरासिटामोल (एसीटामिनोफेन के रूप में भी जाना जाता है) हल्के से मध्यम दर्द और बुखार के लिए उपयोग की जाने वाली एक सामान्य दवा है। मानक वयस्क खुराक हर 4-6 घंटे में 500-1000mg है, 24 घंटों में अधिकतम 4000mg। अनुशंसित खुराक से अधिक न लें क्योंकि इससे गंभीर यकृत क्षति हो सकती है।",
    source: "WHO Model List of Essential Medicines",
    sourceUrl: "https://www.who.int/groups/expert-committees-and-advisory-groups/expert-committee-on-the-selection-and-use-of-essential-medicines-and-health-products",
    category: "medicine-info"
  },
  {
    id: "kb-010",
    topic: "About MedVerify",
    keywords: ["medverify", "about", "what is", "how does", "help", "use"],
    content: "MedVerify is an AI-powered medicine packaging intelligence tool designed to help users read medicine packaging, check expiry dates, and compare medicine details against available quality-alert records. It is NOT a laboratory, regulatory authority, or medical diagnosis system. It provides informational checks only and cannot certify medicine authenticity or guarantee safety.",
    contentHindi: "MedVerify एक AI-संचालित दवा पैकेजिंग इंटेलिजेंस टूल है जो उपयोगकर्ताओं को दवा पैकेजिंग पढ़ने, एक्सपायरी डेट की जांच करने, और उपलब्ध गुणवत्ता-अलर्ट रिकॉर्ड के खिलाफ दवा विवरण की तुलना करने में मदद करने के लिए डिज़ाइन किया गया है। यह एक प्रयोगशाला, नियामक प्राधिकरण या चिकित्सा निदान प्रणाली नहीं है।",
    source: "MedVerify Documentation",
    category: "general"
  }
];
