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
    return 'नमस्ते! मैं MedVerify स्वास्थ्य सहायक हूं। मैं दवा की जानकारी, पैकेजिंग लेबल, और स्कैन परिणामों के बारे में आपके प्रश्नों में मदद कर सकता हूं।\n\nमहत्वपूर्ण: मैं डॉक्टर नहीं हूं और व्यक्तिगत चिकित्सा सलाह नहीं दे सकता। आप क्या जानना चाहेंगे?';
  }
  return 'Hello! I\'m the MedVerify Health Assistant. I can help answer questions about medicine information, packaging labels, and scan results.\n\nImportant: I am not a doctor and cannot provide personalized medical advice. What would you like to know?';
}

// Get suggested questions
export function getSuggestedQuestions(language: 'en' | 'hi' = 'en'): string[] {
  if (language === 'hi') {
    return [
      'एक्सपायरी डेट क्यों महत्वपूर्ण है?',
      'बैच नंबर क्या होता है?',
      '"कोई अलर्ट नहीं" का क्या मतलब है?',
      'दवा कैसे स्टोर करें?',
      'गुणवत्ता समस्या कैसे रिपोर्ट करें?'
    ];
  }
  return [
    'Why is the expiry date important?',
    'What is a batch number?',
    'What does "No Alert Found" mean?',
    'How should I store medicines?',
    'How do I report a quality issue?'
  ];
}
