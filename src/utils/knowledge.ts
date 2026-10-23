// MedVerify Knowledge Retrieval Module
// Provides evidence-based responses from the local knowledge base

import { knowledgeBase, KnowledgeEntry } from '../data/appData';
import { 
  isEmergencyQuery, EMERGENCY_RESPONSE, 
  isPersonalMedicalAdvice, PERSONAL_ADVICE_REDIRECT 
} from './safety';

export interface ChatResponse {
  text: string;
  sources: { title: string; url?: string }[];
  isEmergency: boolean;
  isRedirect: boolean;
  confidence: 'high' | 'medium' | 'low';
}

// Red flag symptoms that require urgent medical care
// Based on WHO and CDC emergency warning signs
const RED_FLAGS = {
  en: [
    'chest pain or pressure',
    'difficulty breathing or shortness of breath',
    'sudden severe headache',
    'confusion or altered mental state',
    'loss of consciousness',
    'seizures',
    'severe bleeding',
    'sudden vision changes',
    'numbness or weakness on one side',
    'severe abdominal pain',
    'high fever (above 103°F/39.4°C)',
    'signs of severe allergic reaction (swelling, difficulty breathing)',
    'suicidal thoughts or self-harm',
    'overdose or poisoning'
  ],
  hi: [
    'छाती में दर्द या दबाव',
    'सांस लेने में कठिनाई',
    'अचानक तेज सिरदर्द',
    'भ्रम या मानसिक स्थिति में बदलाव',
    'बेहोशी',
    'दौरे',
    'गंभीर रक्तस्राव',
    'दृष्टि में अचानक बदलाव',
    'एक तरफ सुन्नता या कमजोरी',
    'तेज पेट दर्द',
    'तेज बुखार (103°F/39.4°C से ऊपर)',
    'गंभीर एलर्जिक प्रतिक्रिया के लक्षण',
    'आत्महत्या के विचार या आत्म-हानि',
    'ओवरडोज या जहर'
  ]
};

// Check if query contains red flag symptoms
export function hasRedFlags(query: string): { hasFlags: boolean; flags: string[] } {
  const lowerQuery = query.toLowerCase();
  const detectedFlags: string[] = [];
  
  for (const flag of RED_FLAGS.en) {
    if (lowerQuery.includes(flag.toLowerCase())) {
      detectedFlags.push(flag);
    }
  }
  
  return {
    hasFlags: detectedFlags.length > 0,
    flags: detectedFlags
  };
}

// Check if query is about symptoms
function isSymptomQuery(query: string): boolean {
  const symptomKeywords = [
    'symptom', 'feel', 'feeling', 'hurt', 'pain', 'ache', 'sick', 'ill',
    'headache', 'fever', 'cough', 'cold', 'nausea', 'vomiting', 'diarrhea',
    'lathargic', 'tired', 'fatigue', 'dizzy', 'lathargy',
    'लक्षण', 'महसूस', 'दर्द', 'बीमार', 'बुखार', 'खांसी', 'सर्दी', 'जी मिचलाना',
    'उल्टी', 'दस्त', 'थकान', 'चक्कर'
  ];
  
  const lowerQuery = query.toLowerCase();
  return symptomKeywords.some(keyword => lowerQuery.includes(keyword));
}

// Generate symptom guidance response
function generateSymptomGuidance(query: string, language: 'en' | 'hi'): ChatResponse {
  const lowerQuery = query.toLowerCase();
  
  // Determine symptom severity based on keywords
  const severeSymptoms = ['severe', 'intense', 'unbearable', 'extreme', 'गंभीर', 'तीव्र', 'असहनीय'];
  const moderateSymptoms = ['moderate', 'persistent', 'constant', 'मध्यम', 'लगातार'];
  
  const isSevere = severeSymptoms.some(s => lowerQuery.includes(s));
  const isModerate = moderateSymptoms.some(s => lowerQuery.includes(s));
  
  let responseText = '';
  
  if (language === 'hi') {
    responseText = `🩺 **लक्षण मार्गदर्शन**\n\n`;
    
    if (isSevere) {
      responseText += `**गंभीर लक्षण:**\nआपके लक्षण गंभीर प्रतीत होते हैं।\n\n`;
      responseText += `**कृपया डॉक्टर से संपर्क करें:**\n`;
      responseText += `• जल्द से जल्द डॉक्टर से मिलें\n`;
      responseText += `• यदि लक्षण बिगड़ रहे हैं, तो आपातकालीन सेवा को कॉल करें: 112\n\n`;
    } else if (isModerate) {
      responseText += `**मध्यम लक्षण:**\n\n`;
      responseText += `**सामान्य देखभाल:**\n`;
      responseText += `• आराम करें और पर्याप्त पानी पिएं\n`;
      responseText += `• लक्षणों पर नज़र रखें\n`;
      responseText += `• यदि 2-3 दिनों में सुधार न हो, तो डॉक्टर से मिलें\n\n`;
    } else {
      responseText += `**हल्के लक्षण:**\n\n`;
      responseText += `**घरेलू देखभाल:**\n`;
      responseText += `• पर्याप्त आराम करें\n`;
      responseText += `• हाइड्रेटेड रहें (पानी, ओआरएस)\n`;
      responseText += `• हल्का भोजन करें\n`;
      responseText += `• लक्षणों की निगरानी करें\n\n`;
    }
    
    responseText += `**डॉक्टर से कब मिलें:**\n`;
    responseText += `• लक्षण 3 दिन से अधिक रहें\n`;
    responseText += `• लक्षण बिगड़ रहे हैं\n`;
    responseText += `• बुखार 108°F (38.3°C) से ऊपर है\n`;
    responseText += `• सांस लेने में कठिनाई हो\n`;
    responseText += `• गंभीर दर्द हो\n\n`;
    
    responseText += `⚠️ **महत्वपूर्ण:** मैं डॉक्टर नहीं हूं और दवा prescribed नहीं कर सकता। `;
    responseText += `किसी भी दवा को लेने से पहले फार्मासिस्ट या डॉक्टर से परामर्श करें, `;
    responseText += `विशेष रूप से यदि आप गर्भवती हैं, अन्य दवाएं ले रहे हैं, या कोई स्वास्थ्य स्थिति है।`;
    
  } else {
    responseText = `🩺 **Symptom Guidance**\n\n`;
    
    if (isSevere) {
      responseText += `**Severe Symptoms:**\nYour symptoms appear serious.\n\n`;
      responseText += `**Please contact a doctor:**\n`;
      responseText += `• See a doctor as soon as possible\n`;
      responseText += `• If symptoms are worsening, call emergency: 112\n\n`;
    } else if (isModerate) {
      responseText += `**Moderate Symptoms:**\n\n`;
      responseText += `**General Care:**\n`;
      responseText += `• Rest and drink plenty of fluids\n`;
      responseText += `• Monitor your symptoms\n`;
      responseText += `• See a doctor if no improvement in 2-3 days\n\n`;
    } else {
      responseText += `**Mild Symptoms:**\n\n`;
      responseText += `**Home Care:**\n`;
      responseText += `• Get adequate rest\n`;
      responseText += `• Stay hydrated (water, ORS)\n`;
      responseText += `• Eat light meals\n`;
      responseText += `• Monitor symptoms\n\n`;
    }
    
    responseText += `**When to see a doctor:**\n`;
    responseText += `• Symptoms last more than 3 days\n`;
    responseText += `• Symptoms are getting worse\n`;
    responseText += `• Fever above 103°F (39.4°C)\n`;
    responseText += `• Difficulty breathing\n`;
    responseText += `• Severe pain\n\n`;
    
    responseText += `⚠️ **Important:** I am not a doctor and cannot prescribe medication. `;
    responseText += `Consult a pharmacist or doctor before taking any medicine, `;
    responseText += `especially if you are pregnant, taking other medications, or have health conditions.`;
  }
  
  return {
    text: responseText,
    sources: [
      { title: 'General Health Guidance', url: 'https://www.who.int/health-topics' }
    ],
    isEmergency: false,
    isRedirect: false,
    confidence: 'medium'
  };
}

// Find relevant knowledge entries for a query
function findRelevantEntries(query: string, language: 'en' | 'hi'): KnowledgeEntry[] {
  const lowerQuery = query.toLowerCase();
  const queryWords = lowerQuery.split(/\s+/).filter(w => w.length > 2);
  
  // Score each entry based on keyword matches
  const scored = knowledgeBase.map(entry => {
    let score = 0;
    
    // Check keyword matches
    for (const keyword of entry.keywords) {
      if (lowerQuery.includes(keyword)) {
        score += 3;
      }
    }
    
    // Check word overlap with topic and content
    const contentWords = (entry.topic + ' ' + entry.content).toLowerCase();
    for (const word of queryWords) {
      if (contentWords.includes(word)) {
        score += 1;
      }
    }
    
    return { entry, score };
  });

  // Return entries with score > 0, sorted by score
  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(s => s.entry);
}

// Generate response based on retrieved knowledge
export function generateResponse(
  query: string, 
  language: 'en' | 'hi' = 'en',
  context?: { productName?: string; outcome?: string }
): ChatResponse {
  // Check for emergency
  if (isEmergencyQuery(query)) {
    return {
      text: language === 'hi' ? EMERGENCY_RESPONSE.hi : EMERGENCY_RESPONSE.en,
      sources: [{ title: 'Emergency Services', url: 'tel:112' }],
      isEmergency: true,
      isRedirect: false,
      confidence: 'high'
    };
  }

  // Check for red flag symptoms
  const redFlagCheck = hasRedFlags(query);
  if (redFlagCheck.hasFlags) {
    const urgentResponse = language === 'hi'
      ? `🚨 **गंभीर लक्षण पहचाने गए**\n\nआपने इन लक्षणों का उल्लेख किया है:\n${redFlagCheck.flags.map(f => `• ${f}`).join('\n')}\n\n**कृपया तुरंत चिकित्सा सहायता लें।**\n\n• आपातकालीन सेवाओं को कॉल करें: 112\n• निकटतम आपातकालीन कक्ष में जाएं\n• समय बर्बाद न करें\n\nमैं व्यक्तिगत चिकित्सा सलाह नहीं दे सकता। ये लक्षण गंभीर स्थिति का संकेत हो सकते हैं।`
      : `🚨 **Serious Symptoms Detected**\n\nYou mentioned these symptoms:\n${redFlagCheck.flags.map(f => `• ${f}`).join('\n')}\n\n**Please seek urgent medical care.**\n\n• Call emergency services: 112\n• Go to the nearest emergency room\n• Do not wait\n\nI cannot provide personalized medical advice. These symptoms may indicate a serious condition.`;
    
    return {
      text: urgentResponse,
      sources: [{ title: 'Emergency Services', url: 'tel:112' }],
      isEmergency: true,
      isRedirect: false,
      confidence: 'high'
    };
  }

  // Check for personal medical advice
  if (isPersonalMedicalAdvice(query)) {
    const baseResponse = language === 'hi' ? PERSONAL_ADVICE_REDIRECT.hi : PERSONAL_ADVICE_REDIRECT.en;
    return {
      text: baseResponse,
      sources: [],
      isEmergency: false,
      isRedirect: true,
      confidence: 'high'
    };
  }

  // Check for symptom-related queries
  if (isSymptomQuery(query)) {
    return generateSymptomGuidance(query, language);
  }

  // Find relevant knowledge
  const entries = findRelevantEntries(query, language);

  if (entries.length === 0) {
    const noInfoResponse = language === 'hi' 
      ? 'क्षमा करें, उपलब्ध ज्ञान आधार से इस प्रश्न का उत्तर नहीं दिया जा सका। कृपया एक योग्य फार्मासिस्ट या डॉक्टर से परामर्श करें।'
      : 'I could not find verified information to answer this question from the available knowledge base. Please consult a qualified pharmacist or doctor for accurate information.';
    
    return {
      text: noInfoResponse,
      sources: [],
      isEmergency: false,
      isRedirect: false,
      confidence: 'low'
    };
  }

  // Build response from relevant entries
  let responseText = '';
  const sourceList: { title: string; url?: string }[] = [];

  for (const entry of entries) {
    const content = (language === 'hi' && entry.contentHindi) ? entry.contentHindi : entry.content;
    responseText += content + '\n\n';
    sourceList.push({
      title: entry.source,
      url: entry.sourceUrl
    });
  }

  // Add context-specific guidance if available
  if (context?.outcome === 'ALERT_MATCH_FOUND') {
    const alertGuidance = language === 'hi'
      ? '\n⚠️ चूंकि एक अलर्ट मिला है: इस दवा का उपयोग न करें जब तक कि आपने फार्मासिस्ट या नियामक प्राधिकरण से परामर्श न किया हो।'
      : '\n⚠️ Since an alert was found: Do not use this medicine until you have consulted a pharmacist or regulatory authority.';
    responseText += alertGuidance;
  } else if (context?.outcome === 'NO_ALERT_FOUND') {
    const noAlertGuidance = language === 'hi'
      ? '\nℹ️ याद रखें: कोई अलर्ट नहीं मिलने का मतलब यह नहीं है कि दवा असली या सुरक्षित है।'
      : '\nℹ️ Remember: No alert found does NOT mean the medicine is genuine or safe.';
    responseText += noAlertGuidance;
  }

  // Deduplicate sources
  const uniqueSources = sourceList.filter((source, index, self) =>
    index === self.findIndex(s => s.title === source.title)
  );

  return {
    text: responseText.trim(),
    sources: uniqueSources,
    isEmergency: false,
    isRedirect: false,
    confidence: entries.length > 1 ? 'high' : 'medium'
  };
}

// Get greeting message
export function getGreeting(language: 'en' | 'hi' = 'en'): string {
  if (language === 'hi') {
    return `🩺 **MedVerify स्वास्थ्य सहायक**

नमस्ते! मैं आपकी दवाओं और सामान्य स्वास्थ्य जानकारी के बारे में मदद कर सकता हूं।

**मैं क्या कर सकता हूं:**
• दवा की जानकारी और पैकेजिंग लेबल समझाना
• स्कैन परिणामों की व्याख्या करना
• हल्के लक्षणों के बारे में सामान्य मार्गदर्शन देना
• बताना कि कब डॉक्टर से मिलना चाहिए

**मैं क्या नहीं कर सकता:**
❌ बीमारी का निदान नहीं कर सकता
❌ दवा prescribed नहीं कर सकता
❌ व्यक्तिगत चिकित्सा सलाह नहीं दे सकता

⚠️ **महत्वपूर्ण:** मैं डॉक्टर नहीं हूं। गंभीर या आपातकालीन स्थिति में, कृपया तुरंत चिकित्सा सहायता लें।

आप क्या जानना चाहेंगे?`;
  }
  return `🩺 **MedVerify Health Assistant**

Hello! I can help you with medicine information and general health guidance.

**What I can do:**
• Explain medicine information and packaging labels
• Help understand scan results
• Provide general guidance for mild symptoms
• Advise when to see a doctor

**What I cannot do:**
❌ Diagnose conditions
❌ Prescribe medications
❌ Provide personalized medical advice

⚠️ **Important:** I am not a doctor. For serious or emergency situations, please seek immediate medical care.

What would you like to know?`;
}

// Get suggested questions
export function getSuggestedQuestions(language: 'en' | 'hi' = 'en'): string[] {
  if (language === 'hi') {
    return [
      'मुझे हल्का सिरदर्द और बुखार है, क्या करूं?',
      'एक्सपायरी डेट क्यों महत्वपूर्ण है?',
      'बैच नंबर क्या होता है?',
      '"कोई अलर्ट नहीं" का क्या मतलब है?',
      'दवा कैसे स्टोर करें?',
      'गुणवत्ता समस्या कैसे रिपोर्ट करें?'
    ];
  }
  return [
    'I have a mild headache and fever, what should I do?',
    'Why is the expiry date important?',
    'What is a batch number?',
    'What does "No Alert Found" mean?',
    'How should I store medicines?',
    'How do I report a quality issue?'
  ];
}
