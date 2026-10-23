// MedVerify Safety Module
// Central safety guardrails shared by all features

export const SAFETY_DISCLAIMER = "MedVerify provides informational checks against the records available to it. It cannot certify authenticity or guarantee medicine safety. For concerns, consult a qualified pharmacist or the relevant official authority.";

export const SHORT_DISCLAIMER = "Informational only. Not a substitute for professional medical advice.";

// Emergency indicators that should trigger urgent care advice
const EMERGENCY_INDICATORS = [
  'emergency', 'urgent', 'severe', 'allergic reaction', 'breathing difficulty',
  'chest pain', 'unconscious', 'seizure', 'anaphylaxis', 'overdose',
  'suicide', 'self-harm', 'poisoning'
];

// Check if a query contains emergency indicators
export function isEmergencyQuery(query: string): boolean {
  const lower = query.toLowerCase();
  return EMERGENCY_INDICATORS.some(indicator => lower.includes(indicator));
}

// Emergency response message
export const EMERGENCY_RESPONSE = {
  en: "🚨 IMPORTANT: If you or someone else is experiencing a medical emergency, please call emergency services immediately (112 in India, 911 in US/Canada, 999 in UK). Do NOT rely on MedVerify or any chatbot for emergency medical decisions. Seek immediate in-person medical attention.",
  hi: "🚨 महत्वपूर्ण: यदि आप या कोई और चिकित्सा आपातकाल का अनुभव कर रहा है, तो कृपया तुरंत आपातकालीन सेवाओं को कॉल करें (भारत में 112)। MedVerify या किसी भी चैटबॉट पर आपातकालीन चिकित्सा निर्णयों के लिए निर्भर न रहें। तुरंत प्रत्यक्ष चिकित्सा ध्यान प्राप्त करें।"
};

// Rules that the chatbot must always follow
export const CHATBOT_RULES = [
  "Never diagnose a disease or medical condition.",
  "Never prescribe medication or dosages.",
  "Never tell users to start or stop medication based only on this application.",
  "Never claim that a medicine is definitely genuine or counterfeit without authoritative evidence.",
  "Never fabricate official records, source URLs, citations, or data freshness.",
  "Always show uncertainty when evidence is insufficient.",
  "For personal treatment questions, direct users to a qualified clinician or pharmacist.",
  "For severe or potentially emergency symptoms, advise seeking urgent medical care.",
  "Do not pretend to be a doctor.",
  "Always cite available sources when providing factual information."
];

// Check if a question is asking for personalized medical advice
export function isPersonalMedicalAdvice(query: string): boolean {
  const patterns = [
    /should i (take|start|stop|use)/i,
    /can i (take|use|have)/i,
    /what should i (do|take|use)/i,
    /is it (safe|ok|fine) for me/i,
    /will it help me/i,
    /prescribe|recommend.*for me|dosage for me/i,
    /treat my|cure my|diagnose my/i,
  ];
  
  return patterns.some(pattern => pattern.test(query));
}

// Personal advice redirect message
export const PERSONAL_ADVICE_REDIRECT = {
  en: "I cannot provide personalized medical advice, prescribe medications, or recommend treatment plans. For questions about your specific health situation, please consult a qualified doctor or pharmacist who can consider your complete medical history.",
  hi: "मैं व्यक्तिगत चिकित्सा सलाह नहीं दे सकता, दवाएं निर्धारित नहीं कर सकता, या उपचार योजनाओं की सिफारिश नहीं कर सकता। अपनी विशिष्ट स्वास्थ्य स्थिति के बारे में प्रश्नों के लिए, कृपया एक योग्य डॉक्टर या फार्मासिस्ट से परामर्श करें।"
};

// Validate that a response doesn't violate safety rules
export function validateResponse(response: string): {
  safe: boolean;
  violations: string[];
} {
  const violations: string[] = [];
  const lower = response.toLowerCase();

  // Check for diagnosis claims
  if (/\byou have\b.*\b(disease|condition|infection|disorder)\b/i.test(response)) {
    violations.push('Response appears to diagnose a condition');
  }

  // Check for prescription claims
  if (/\byou should take\b.*\b(mg|ml|tablet|capsule|dose)\b/i.test(response)) {
    violations.push('Response appears to prescribe medication');
  }

  // Check for authenticity guarantees
  if (/\b(genuine|authentic|real|safe|certified)\b.*\bmedicine\b/i.test(lower) && 
      !/\b(cannot|not|may not|does not)\b/i.test(response)) {
    violations.push('Response may be claiming medicine authenticity');
  }

  return {
    safe: violations.length === 0,
    violations
  };
}
