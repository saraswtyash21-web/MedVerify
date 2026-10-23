// MedVerify Voice Assistant Module
// Uses Web Speech API for TTS and Speech Recognition
// Provides fallbacks when browser support is unavailable

export interface VoiceState {
  isSupported: boolean;
  isTtsSupported: boolean;
  isRecognitionSupported: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  error: string | null;
}

export interface VoiceCapabilities {
  ttsSupported: boolean;
  recognitionSupported: boolean;
}

// Check browser support for speech features
export function checkVoiceSupport(): VoiceCapabilities {
  const ttsSupported = 'speechSynthesis' in window;
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  const recognitionSupported = !!SpeechRecognition;
  
  return { ttsSupported, recognitionSupported };
}

// Speak text aloud using TTS
export function speakText(
  text: string, 
  language: 'en' | 'hi' = 'en',
  onStart?: () => void,
  onEnd?: () => void,
  onError?: (error: string) => void
): (() => void) | null {
  if (!('speechSynthesis' in window)) {
    onError?.('Text-to-speech is not supported in this browser.');
    return null;
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  
  // Set language
  if (language === 'hi') {
    utterance.lang = 'hi-IN';
  } else {
    utterance.lang = 'en-IN';
  }
  
  utterance.rate = 0.9; // Slightly slower for clarity
  utterance.pitch = 1.0;
  utterance.volume = 1.0;

  // Try to find a suitable voice
  const voices = window.speechSynthesis.getVoices();
  const preferredLang = language === 'hi' ? 'hi' : 'en';
  const matchingVoice = voices.find(v => v.lang.startsWith(preferredLang));
  if (matchingVoice) {
    utterance.voice = matchingVoice;
  }

  utterance.onstart = () => onStart?.();
  utterance.onend = () => onEnd?.();
  utterance.onerror = (event) => {
    if (event.error !== 'canceled') {
      onError?.(`Speech error: ${event.error}`);
    }
    onEnd?.();
  };

  window.speechSynthesis.speak(utterance);

  // Return stop function
  return () => {
    window.speechSynthesis.cancel();
    onEnd?.();
  };
}

// Stop all speech
export function stopSpeaking(): void {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

// Speech Recognition class wrapper
export class SpeechRecognitionController {
  private recognition: any = null;
  private isListening = false;

  constructor(
    private language: 'en' | 'hi' = 'en',
    private onResult: (text: string) => void,
    private onError: (error: string) => void,
    private onStateChange: (listening: boolean) => void
  ) {
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognitionAPI) {
      this.recognition = new SpeechRecognitionAPI();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = language === 'hi' ? 'hi-IN' : 'en-IN';

      this.recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        this.onResult(transcript);
      };

      this.recognition.onerror = (event: any) => {
        if (event.error === 'not-allowed') {
          this.onError('Microphone permission denied. Please allow microphone access in your browser settings.');
        } else if (event.error === 'no-speech') {
          this.onError('No speech detected. Please try again.');
        } else if (event.error === 'audio-capture') {
          this.onError('No microphone found. Please connect a microphone.');
        } else {
          this.onError(`Speech recognition error: ${event.error}`);
        }
        this.isListening = false;
        this.onStateChange(false);
      };

      this.recognition.onend = () => {
        this.isListening = false;
        this.onStateChange(false);
      };
    }
  }

  start(): boolean {
    if (!this.recognition) {
      this.onError('Speech recognition is not supported in this browser.');
      return false;
    }

    try {
      this.recognition.start();
      this.isListening = true;
      this.onStateChange(true);
      return true;
    } catch (err) {
      this.onError('Could not start speech recognition. Please try again.');
      return false;
    }
  }

  stop(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
      this.onStateChange(false);
    }
  }

  getIsListening(): boolean {
    return this.isListening;
  }

  destroy(): void {
    if (this.recognition) {
      this.recognition.abort();
    }
  }
}

// Generate spoken explanation for a scan result
export function generateSpokenExplanation(
  outcome: string,
  productName: string,
  expiryStatus: string,
  language: 'en' | 'hi' = 'en'
): string {
  const name = productName || 'the medicine';

  if (language === 'hi') {
    if (outcome === 'ALERT_MATCH_FOUND') {
      return `सावधानी। ${name} के लिए एक गुणवत्ता अलर्ट मिला है। कृपया इस दवा का उपयोग न करें। तुरंत फार्मासिस्ट या डॉक्टर से संपर्क करें।`;
    } else if (outcome === 'NO_ALERT_FOUND') {
      return `${name} के लिए जांचे गए स्रोतों में कोई अलर्ट नहीं मिला। ध्यान दें: इसका मतलब यह नहीं है कि दवा पूरी तरह सुरक्षित या असली है। यदि संदेह हो तो फार्मासिस्ट से पूछें।`;
    } else {
      return `${name} को पूरी तरह से सत्यापित नहीं किया जा सका। अधिक जानकारी के लिए कृपया स्पष्ट तस्वीर अपलोड करें या फार्मासिस्ट से संपर्क करें।`;
    }
  }

  // English
  if (outcome === 'ALERT_MATCH_FOUND') {
    return `Warning. A quality alert was found for ${name}. Please do not use this medicine. Contact a pharmacist or doctor immediately.`;
  } else if (outcome === 'NO_ALERT_FOUND') {
    return `No alert was found for ${name} in the checked sources. Please note: this does not mean the medicine is completely safe or genuine. If you have concerns, consult a pharmacist.`;
  } else {
    return `${name} could not be fully verified. Please upload a clearer image or consult a pharmacist for more information.`;
  }
}
