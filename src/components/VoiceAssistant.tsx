// MedVerify Voice Assistant Component
// Explains scan results aloud using TTS with speech recognition input

import { useState, useEffect, useRef, useCallback } from 'react';
import { VerificationReport, formatOutcome } from '../utils/verification';
import { 
  checkVoiceSupport, speakText, stopSpeaking, 
  SpeechRecognitionController, generateSpokenExplanation 
} from '../utils/voice';
import { Mic, MicOff, Volume2, VolumeX, AlertCircle, Info } from 'lucide-react';

type Language = 'en' | 'hi';

interface VoiceAssistantProps {
  language: Language;
  currentReport: VerificationReport | null;
  onVoiceInput?: (text: string) => void;
}

export function VoiceAssistant({ language, currentReport, onVoiceInput }: VoiceAssistantProps) {
  const [isTtsSupported, setIsTtsSupported] = useState(false);
  const [isRecognitionSupported, setIsRecognitionSupported] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [spokenText, setSpokenText] = useState<string>('');
  const recognitionRef = useRef<SpeechRecognitionController | null>(null);

  const isHi = language === 'hi';

  // Check support on mount
  useEffect(() => {
    const support = checkVoiceSupport();
    setIsTtsSupported(support.ttsSupported);
    setIsRecognitionSupported(support.recognitionSupported);

    return () => {
      stopSpeaking();
      recognitionRef.current?.destroy();
    };
  }, []);

  // Generate explanation text when report changes
  useEffect(() => {
    if (currentReport) {
      const text = generateSpokenExplanation(
        currentReport.outcome,
        currentReport.input.productName,
        currentReport.expiryCheck.status,
        language
      );
      setSpokenText(text);
    } else {
      setSpokenText('');
    }
  }, [currentReport, language]);

  const handleSpeak = useCallback(() => {
    if (!isTtsSupported) {
      setVoiceError(isHi ? 'इस ब्राउज़र में टेक्स्ट-टू-स्पीच समर्थित नहीं है।' : 'Text-to-speech is not supported in this browser.');
      return;
    }

    if (isSpeaking) {
      stopSpeaking();
      setIsSpeaking(false);
      return;
    }

    if (!spokenText) {
      setVoiceError(isHi ? 'बोलने के लिए कोई टेक्स्ट उपलब्ध नहीं है। पहले एक दवा स्कैन करें।' : 'No text available to speak. Please scan a medicine first.');
      return;
    }

    setVoiceError(null);
    speakText(
      spokenText,
      language,
      () => setIsSpeaking(true),
      () => setIsSpeaking(false),
      (err) => {
        setVoiceError(err);
        setIsSpeaking(false);
      }
    );
  }, [isTtsSupported, isSpeaking, spokenText, language, isHi]);

  const handleListen = useCallback(() => {
    if (!isRecognitionSupported) {
      setVoiceError(isHi ? 'इस ब्राउज़र में स्पीच रिकग्निशन समर्थित नहीं है।' : 'Speech recognition is not supported in this browser.');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }

    setVoiceError(null);
    
    recognitionRef.current = new SpeechRecognitionController(
      language,
      (text) => {
        onVoiceInput?.(text);
        setIsListening(false);
      },
      (error) => {
        setVoiceError(error);
        setIsListening(false);
      },
      (listening) => setIsListening(listening)
    );

    recognitionRef.current.start();
  }, [isRecognitionSupported, isListening, language, onVoiceInput, isHi]);

  return (
    <div className="bg-white rounded-2xl border border-sage/20 p-5 mb-4">
      <div className="flex items-center gap-2 mb-4">
        <Volume2 className="w-5 h-5 text-emerald-deep" />
        <h3 className="font-semibold text-charcoal">
          {isHi ? 'वॉइस सहायक' : 'Voice Assistant'}
        </h3>
      </div>

      {/* Support Status */}
      {(!isTtsSupported || !isRecognitionSupported) && (
        <div className="bg-gold/10 border border-gold/20 rounded-xl p-3 mb-4 flex items-start gap-2">
          <Info className="w-4 h-4 text-gold mt-0.5 flex-shrink-0" />
          <p className="text-xs text-text-main/70 leading-relaxed">
            {!isTtsSupported && !isRecognitionSupported 
              ? (isHi 
                  ? 'इस ब्राउज़र में वॉइस सुविधाएं समर्थित नहीं हैं। कृपया Chrome, Edge, या Safari का उपयोग करें।'
                  : 'Voice features are not supported in this browser. Please use Chrome, Edge, or Safari.')
              : !isTtsSupported
                ? (isHi 
                    ? 'टेक्स्ट-टू-स्पीच समर्थित नहीं है। परिणाम नीचे टेक्स्ट में दिखाए जाएंगे।'
                    : 'Text-to-speech is not supported. Results will be shown as text below.')
                : (isHi 
                    ? 'स्पीच रिकग्निशन समर्थित नहीं है। कृपया टेक्स्ट टाइप करें।'
                    : 'Speech recognition is not supported. Please type your question instead.')}
          </p>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap gap-3 mb-4">
        {/* Speak Button */}
        <button
          onClick={handleSpeak}
          disabled={!isTtsSupported}
          className={`flex items-center gap-2 px-4 py-3 rounded-xl font-medium text-sm transition-all ${
            isSpeaking 
              ? 'bg-emerald-deep text-white shadow-lg' 
              : 'bg-emerald-deep/10 text-emerald-deep hover:bg-emerald-deep/20'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
          aria-label={isSpeaking ? (isHi ? 'बोलना बंद करें' : 'Stop speaking') : (isHi ? 'परिणाम बोलें' : 'Speak result')}
        >
          {isSpeaking ? (
            <>
              <VolumeX className="w-5 h-5" />
              {isHi ? 'बंद करें' : 'Stop'}
            </>
          ) : (
            <>
              <Volume2 className="w-5 h-5" />
              {isHi ? 'परिणाम सुनें' : 'Listen to result'}
            </>
          )}
        </button>

        {/* Listen Button */}
        <button
          onClick={handleListen}
          disabled={!isRecognitionSupported}
          className={`relative flex items-center gap-2 px-4 py-3 rounded-xl font-medium text-sm transition-all ${
            isListening 
              ? 'bg-warning text-white shadow-lg' 
              : 'bg-warning/10 text-warning hover:bg-warning/20'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
          aria-label={isListening ? (isHi ? 'सुनना बंद करें' : 'Stop listening') : (isHi ? 'बोलकर पूछें' : 'Ask by voice')}
        >
          {isListening && (
            <span className="absolute inset-0 rounded-xl border-2 border-warning animate-pulse-ring" />
          )}
          {isListening ? (
            <>
              <MicOff className="w-5 h-5" />
              {isHi ? 'बंद करें' : 'Stop'}
            </>
          ) : (
            <>
              <Mic className="w-5 h-5" />
              {isHi ? 'बोलकर पूछें' : 'Ask by voice'}
            </>
          )}
        </button>
      </div>

      {/* Listening indicator */}
      {isListening && (
        <div role="status" aria-live="polite" className="bg-warning-light border border-warning/20 rounded-xl p-3 mb-4 flex items-center gap-2 animate-fade-in">
          <div className="w-3 h-3 bg-warning rounded-full animate-pulse" />
          <p className="text-sm text-warning font-medium">
            {isHi ? 'सुन रहे हैं... बोलना शुरू करें' : 'Listening... Start speaking'}
          </p>
        </div>
      )}

      {/* Error Message */}
      {voiceError && (
        <div role="alert" className="bg-warning-light border border-warning/20 rounded-xl p-3 mb-4 flex items-start gap-2 animate-fade-in">
          <AlertCircle className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
          <p className="text-sm text-warning">{voiceError}</p>
        </div>
      )}

      {/* Text Fallback - Always show the explanation as readable text */}
      {spokenText && (
        <div className="bg-ivory/50 rounded-xl p-4 border border-sage/10">
          <p className="text-xs font-medium text-text-main/50 uppercase tracking-wider mb-2">
            {isHi ? 'टेक्स्ट व्याख्या:' : 'Text explanation:'}
          </p>
          <p className="text-sm text-charcoal leading-relaxed">
            {spokenText}
          </p>
        </div>
      )}

      {!currentReport && (
        <p className="text-sm text-text-main/50 text-center py-4">
          {isHi 
            ? 'वॉइस व्याख्या के लिए पहले एक दवा स्कैन करें।'
            : 'Scan a medicine first to get a voice explanation.'}
        </p>
      )}
    </div>
  );
}
