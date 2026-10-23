import { useState, useRef, useCallback, useEffect } from 'react';
import { processImage, assessOcrQuality, OcrProgress, OcrResult, ExtractedFields } from './utils/ocr';
import { generateReport, formatOutcome, VerificationReport, VerificationInput } from './utils/verification';
import { SAFETY_DISCLAIMER, SHORT_DISCLAIMER } from './utils/safety';
import { generateResponse, getGreeting, getSuggestedQuestions, ChatResponse } from './utils/knowledge';
import { exportReportAsPDF } from './utils/pdfExport';
import { BarcodeScanResult } from './utils/barcode';
import { sources } from './data/appData';
import { hasAnyRealDataSource } from './config';
import { saveScanToHistory, loadScanHistory, isPersistentStorageAvailable, ScanHistoryEntry } from './lib/scanHistory';
import { matchWHOAlert, WHOAlertMatch } from './data/whoAlerts';
import { ThemeProvider, AuthProvider, useTheme, useAuth } from './contexts';
import { SignInPage, SignUpPage } from './components/AuthPages';
import { Dashboard } from './components/Dashboard';
import { VoiceAssistant } from './components/VoiceAssistant';
import { BarcodeScanner } from './components/BarcodeScanner';
import { WHOAlerts } from './components/WHOAlerts';
import { DoctorInfo } from './components/DoctorInfo';
import { 
  Shield, Camera, FileText, MessageCircle, AlertTriangle, 
  CheckCircle, XCircle, Upload, Clock, Search, Download,
  ChevronRight, Info, Eye, Edit3, Globe, ArrowLeft,
  Heart, BookOpen, HelpCircle, RefreshCw, Sun, Moon, LogOut,
  ScanLine, Stethoscope
} from 'lucide-react';

// Types
type Page = 'home' | 'scan' | 'report' | 'assistant' | 'safety' | 'dashboard' | 'doctorInfo';
type Language = 'en' | 'hi';
type AuthPage = 'signin' | 'signup';

// Translations
const t = {
  en: {
    appName: 'MedVerify',
    tagline: 'AI Medicine Packaging Intelligence',
    home: 'Home',
    scan: 'Scan Medicine',
    report: 'Verification Report',
    assistant: 'Health Assistant',
    safety: 'Safety Guide',
    uploadImage: 'Upload Medicine Image',
    processing: 'Processing...',
    extracting: 'Extracting text from image...',
    editFields: 'Review & Edit Extracted Fields',
    runCheck: 'Run Verification Check',
    noAlert: 'No Alert Found in Checked Sources',
    alertFound: 'Alert Match Found',
    unableVerify: 'Unable to Verify',
    disclaimer: SAFETY_DISCLAIMER,
    recentScans: 'Recent Scans',
    noScans: 'No scans yet in this session',
    askAssistant: 'Ask about this result',
    exportPdf: 'Export PDF Report',
    sourcesChecked: 'Sources Checked',
    dataFreshness: 'Data Freshness',
    nextSteps: 'Suggested Next Steps',
    warnings: 'Warnings',
    fieldsChecked: 'Fields Checked',
    matchingRationale: 'Matching Rationale',
  },
  hi: {
    appName: 'MedVerify',
    tagline: 'AI दवा पैकेजिंग इंटेलिजेंस',
    home: 'होम',
    scan: 'दवा स्कैन करें',
    report: 'सत्यापन रिपोर्ट',
    assistant: 'स्वास्थ्य सहायक',
    safety: 'सुरक्षा गाइड',
    uploadImage: 'दवा की इमेज अपलोड करें',
    processing: 'प्रोसेसिंग...',
    extracting: 'इमेज से टेक्स्ट निकाल रहे हैं...',
    editFields: 'निकाले गए फ़ील्ड्स की समीक्षा और संपादन करें',
    runCheck: 'सत्यापन जांच चलाएं',
    noAlert: 'जांचे गए स्रोतों में कोई अलर्ट नहीं मिला',
    alertFound: 'अलर्ट मैच मिला',
    unableVerify: 'सत्यापित करने में असमर्थ',
    disclaimer: SAFETY_DISCLAIMER,
    recentScans: 'हाल के स्कैन',
    noScans: 'इस सेशन में अभी तक कोई स्कैन नहीं',
    askAssistant: 'इस परिणाम के बारे में पूछें',
    exportPdf: 'PDF रिपोर्ट एक्सपोर्ट करें',
    sourcesChecked: 'जांचे गए स्रोत',
    dataFreshness: 'डेटा ताजगी',
    nextSteps: 'सुझाए गए अगले कदम',
    warnings: 'चेतावनियां',
    fieldsChecked: 'जांचे गए फ़ील्ड',
    matchingRationale: 'मैचिंग का तर्क',
  }
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

function AppContent() {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [language, setLanguage] = useState<Language>('en');
  const [authPage, setAuthPage] = useState<AuthPage>('signin');
  const [scanHistory, setScanHistory] = useState<ScanHistoryEntry[]>([]);
  const [currentReport, setCurrentReport] = useState<VerificationReport | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const { isAuthenticated, user, authMode } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const tr = t[language];

  // Load scan history when user authenticates
  useEffect(() => {
    if (isAuthenticated) {
      loadHistory();
    } else {
      setScanHistory([]);
    }
  }, [isAuthenticated, user?.id]);

  const loadHistory = async () => {
    setHistoryLoading(true);
    const history = await loadScanHistory(50);
    setScanHistory(history);
    setHistoryLoading(false);
  };

  const addScanToHistory = async (report: VerificationReport, barcodeResult?: BarcodeScanResult) => {
    const entry = await saveScanToHistory(
      report,
      barcodeResult?.value || null,
      barcodeResult?.formatLabel || null
    );
    if (entry) {
      setScanHistory(prev => [entry, ...prev].slice(0, 50));
    }
  };

  // If not authenticated, show auth pages
  if (!isAuthenticated) {
    if (authPage === 'signup') {
      return <SignUpPage language={language} initialPage="signup" onSwitchPage={setAuthPage} />;
    }
    return <SignInPage language={language} initialPage="signin" onSwitchPage={setAuthPage} />;
  }

  // Redirect to dashboard if on home page after sign-in
  if (currentPage === 'home') {
    // Keep home as dashboard
  }

  return (
    <div className="min-h-screen bg-ivory font-sans transition-colors duration-300">
      {/* Navigation Header */}
      <header className="bg-emerald-deep text-white sticky top-0 z-50 shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <button 
            onClick={() => setCurrentPage('dashboard')}
            className="flex items-center gap-2 hover:opacity-90 transition-opacity"
          >
            <Shield className="w-7 h-7 text-gold" />
            <div>
              <h1 className="font-display text-xl font-bold leading-tight">{tr.appName}</h1>
              <p className="text-[10px] text-sage-light tracking-wider uppercase">{tr.tagline}</p>
            </div>
          </button>
          
          <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
            {[
              { page: 'dashboard' as Page, label: language === 'hi' ? 'डैशबोर्ड' : 'Dashboard', icon: <Heart className="w-4 h-4" /> },
              { page: 'scan' as Page, label: tr.scan, icon: <Camera className="w-4 h-4" /> },
              { page: 'report' as Page, label: tr.report, icon: <FileText className="w-4 h-4" /> },
              { page: 'assistant' as Page, label: tr.assistant, icon: <MessageCircle className="w-4 h-4" /> },
              { page: 'doctorInfo' as Page, label: language === 'hi' ? 'डॉक्टर जानकारी' : 'Doctor Info', icon: <Stethoscope className="w-4 h-4" /> },
              { page: 'safety' as Page, label: tr.safety, icon: <Shield className="w-4 h-4" /> },
            ].map(item => (
              <button
                key={item.page}
                onClick={() => setCurrentPage(item.page)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  currentPage === item.page 
                    ? 'bg-white/15 text-white' 
                    : 'text-sage-light hover:bg-white/10 hover:text-white'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-sm transition-all"
              title={theme === 'dark' ? (language === 'hi' ? 'लाइट मोड' : 'Switch to light mode') : (language === 'hi' ? 'डार्क मोड' : 'Switch to dark mode')}
              aria-label={theme === 'dark' ? (language === 'hi' ? 'लाइट मोड पर स्विच करें' : 'Switch to light mode') : (language === 'hi' ? 'डार्क मोड पर स्विच करें' : 'Switch to dark mode')}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            {/* Language Toggle */}
            <button
              onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-sm transition-all"
              title="Switch language"
              aria-label={language === 'en' ? 'हिंदी में बदलें' : 'Switch to English'}
            >
              <Globe className="w-4 h-4" />
              <span className="text-xs font-medium">{language === 'en' ? 'हिंदी' : 'EN'}</span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden flex border-t border-white/10" role="navigation" aria-label="Mobile navigation">
          {[
            { page: 'dashboard' as Page, label: language === 'hi' ? 'होम' : 'Home', icon: <Heart className="w-4 h-4" /> },
            { page: 'scan' as Page, label: tr.scan, icon: <Camera className="w-4 h-4" /> },
            { page: 'report' as Page, label: tr.report, icon: <FileText className="w-4 h-4" /> },
            { page: 'assistant' as Page, label: tr.assistant, icon: <MessageCircle className="w-4 h-4" /> },
            { page: 'doctorInfo' as Page, label: language === 'hi' ? 'डॉक्टर' : 'Doctor', icon: <Stethoscope className="w-4 h-4" /> },
            { page: 'safety' as Page, label: tr.safety, icon: <Shield className="w-4 h-4" /> },
          ].map(item => (
            <button
              key={item.page}
              onClick={() => setCurrentPage(item.page)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-all ${
                currentPage === item.page 
                  ? 'text-gold bg-white/10' 
                  : 'text-sage-light hover:text-white'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-6 pb-20" role="main">
        {/* Dashboard (replaces home for signed-in users) */}
        {(currentPage === 'home' || currentPage === 'dashboard') && (
          <Dashboard
            language={language}
            setCurrentPage={setCurrentPage}
            scanHistory={scanHistory}
            setCurrentReport={setCurrentReport}
          />
        )}
        {currentPage === 'scan' && (
          <ScanPage 
            language={language}
            setCurrentPage={setCurrentPage}
            setCurrentReport={setCurrentReport}
            addScanToHistory={addScanToHistory}
          />
        )}
        {currentPage === 'report' && (
          currentReport ? (
            <ReportPage 
              language={language}
              report={currentReport}
              setCurrentPage={setCurrentPage}
            />
          ) : (
            <div className="text-center py-16 animate-fade-in">
              <FileText className="w-12 h-12 text-sage mx-auto mb-4" />
              <h3 className="font-semibold text-charcoal mb-2">
                {language === 'hi' ? 'कोई रिपोर्ट उपलब्ध नहीं' : 'No Report Available'}
              </h3>
              <p className="text-sm text-text-main/60 mb-4">
                {language === 'hi' 
                  ? 'पहले दवा स्कैन करें और सत्यापन जांच चलाएं।'
                  : 'Please scan a medicine and run a verification check first.'}
              </p>
              <button
                onClick={() => setCurrentPage('scan')}
                className="px-5 py-2.5 bg-emerald-deep text-white rounded-xl font-medium hover:bg-emerald-light transition-all"
              >
                {language === 'hi' ? 'दवा स्कैन करें' : 'Scan Medicine'}
              </button>
            </div>
          )
        )}
        {currentPage === 'assistant' && (
          <div className="animate-fade-in">
            <VoiceAssistant 
              language={language}
              currentReport={currentReport}
            />
            <AssistantPage 
              language={language}
              currentReport={currentReport}
            />
          </div>
        )}
        {currentPage === 'doctorInfo' && (
          <div className="animate-fade-in max-w-4xl mx-auto">
            <DoctorInfo language={language} />
          </div>
        )}
        {currentPage === 'safety' && (
          <SafetyPage language={language} />
        )}
      </main>

      {/* Footer Disclaimer */}
      <footer className="bg-charcoal text-sage-light py-4 px-4 mt-auto" role="contentinfo">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-xs leading-relaxed max-w-2xl mx-auto">
            <AlertTriangle className="w-3 h-3 inline mr-1 text-warning" aria-hidden="true" />
            <span id="safety-disclaimer">{tr.disclaimer}</span>
          </p>
          <p className="text-[10px] mt-2 text-sage/60">
            {'Informational tool — Not for clinical use'}
            {' | Auth: '}{authMode === 'supabase' ? 'Supabase Auth' : 'Demo-only auth'}
          </p>
        </div>
      </footer>
    </div>
  );
}

// HomePage has been replaced by Dashboard component (src/components/Dashboard.tsx)
// Keeping function for reference but it is no longer rendered.
function HomePage({ language, setCurrentPage, scanHistory, setCurrentReport }: {
  language: Language;
  setCurrentPage: (page: Page) => void;
  scanHistory: ScanHistoryEntry[];
  setCurrentReport: (report: VerificationReport | null) => void;
}) {
  const tr = t[language];
  
  return (
    <div className="animate-fade-in">
      {/* Hero Section */}
      <section className="text-center py-8 md:py-12">
        <div className="inline-flex items-center gap-2 bg-emerald-deep/5 border border-emerald-deep/10 rounded-full px-4 py-1.5 mb-6">
          <Shield className="w-4 h-4 text-emerald-deep" />
          <span className="text-sm font-medium text-emerald-deep">
            {language === 'hi' ? 'AI-संचालित दवा पैकेजिंग इंटेलिजेंस' : 'AI-Powered Medicine Packaging Intelligence'}
          </span>
        </div>
        
        <h2 className="font-display text-3xl md:text-5xl font-bold text-charcoal mb-4">
          {language === 'hi' ? 'अपनी दवाओं को समझें' : 'Understand Your Medicines'}
        </h2>
        <p className="text-lg text-text-main/70 max-w-xl mx-auto mb-8">
          {language === 'hi' 
            ? 'दवा पैकेजिंग स्कैन करें, एक्सपायरी डेट जांचें, और उपलब्ध गुणवत्ता अलर्ट रिकॉर्ड के खिलाफ विवरण की तुलना करें।'
            : 'Scan medicine packaging, check expiry dates, and compare details against available quality-alert records.'}
        </p>

        {/* Hero Illustration */}
        <div className="relative max-w-lg mx-auto mb-8">
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-deep/5 to-transparent rounded-3xl" />
          <img 
            src="https://image.qwenlm.ai/generated-images/dd616539-b654-479a-852f-9729ddb0580b/_result.png"
            alt="MedVerify - Medicine packaging intelligence"
            className="relative rounded-2xl shadow-lg w-full max-w-md mx-auto"
          />
        </div>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => setCurrentPage('scan')}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-deep text-white rounded-xl font-semibold hover:bg-emerald-light transition-all shadow-lg shadow-emerald-deep/20 hover:shadow-xl"
          >
            <Camera className="w-5 h-5" />
            {tr.scan}
          </button>
          <button
            onClick={() => setCurrentPage('assistant')}
            className="flex items-center gap-2 px-6 py-3 bg-white text-emerald-deep border border-emerald-deep/20 rounded-xl font-semibold hover:bg-emerald-deep/5 transition-all"
          >
            <MessageCircle className="w-5 h-5" />
            {tr.assistant}
          </button>
        </div>
      </section>

      {/* Feature Cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        {[
          {
            icon: <Camera className="w-6 h-6" />,
            title: language === 'hi' ? 'स्मार्ट स्कैनर' : 'Smart Scanner',
            desc: language === 'hi' ? 'OCR के साथ दवा पैकेजिंग से जानकारी निकालें' : 'Extract information from medicine packaging using OCR',
            color: 'bg-emerald-deep/5 text-emerald-deep'
          },
          {
            icon: <Search className="w-6 h-6" />,
            title: language === 'hi' ? 'अलर्ट मैचिंग' : 'Alert Matching',
            desc: language === 'hi' ? 'आधिकारिक गुणवत्ता अलर्ट डेटाबेस के खिलाफ जांचें' : 'Check against official quality-alert databases',
            color: 'bg-gold/10 text-gold'
          },
          {
            icon: <BookOpen className="w-6 h-6" />,
            title: language === 'hi' ? 'स्वास्थ्य सहायक' : 'Health Assistant',
            desc: language === 'hi' ? 'साक्ष्य-आधारित दवा जानकारी प्राप्त करें' : 'Get evidence-based medicine information',
            color: 'bg-positive/10 text-positive'
          }
        ].map((feature, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 border border-sage/20 hover:shadow-md transition-shadow">
            <div className={`inline-flex p-3 rounded-xl ${feature.color} mb-3`}>
              {feature.icon}
            </div>
            <h3 className="font-semibold text-charcoal mb-1">{feature.title}</h3>
            <p className="text-sm text-text-main/60">{feature.desc}</p>
          </div>
        ))}
      </section>

      {/* Recent Scans */}
      <section className="mb-8">
        <h3 className="font-semibold text-charcoal mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-gold" />
          {tr.recentScans}
        </h3>
        {scanHistory.length === 0 ? (
          <p className="text-sm text-text-main/50 bg-white/50 rounded-xl p-4 text-center">
            {tr.noScans}
          </p>
        ) : (
          <div className="space-y-2">
            {scanHistory.slice(0, 5).map(scan => {
              const outcomeInfo = formatOutcome(scan.outcome as any);
              return (
                <button
                  key={scan.id}
                  onClick={() => { setCurrentReport(scan.report); setCurrentPage('report'); }}
                  className="w-full flex items-center justify-between bg-white rounded-xl p-3 border border-sage/20 hover:shadow-sm transition-all text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{outcomeInfo.icon}</span>
                    <div>
                      <p className="font-medium text-charcoal text-sm">{scan.productName}</p>
                      <p className="text-xs text-text-main/50">{new Date(scan.timestamp).toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-text-main/30" />
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Data Sources Panel — honest status of connected sources */}
      <section className="bg-white dark:bg-[#1A211E] rounded-2xl p-5 border border-sage/20">
        <h3 className="font-semibold text-charcoal mb-3 flex items-center gap-2">
          <Info className="w-4 h-4 text-emerald-deep" />
          {language === 'hi' ? 'डेटा स्रोत स्थिति' : 'Data Source Status'}
        </h3>
        <div className="space-y-3">
          {sources.map((source, i) => (
            <div key={i} className="flex items-start gap-3 text-sm">
              {source.enabled ? (
                <CheckCircle className="w-4 h-4 text-positive mt-0.5 flex-shrink-0" aria-hidden="true" />
              ) : (
                <XCircle className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" aria-hidden="true" />
              )}
              <div className="flex-1">
                <p className="font-medium text-charcoal">
                  {source.name}
                  {!source.enabled && (
                    <span className="ml-2 text-xs font-normal text-warning">
                      ({language === 'hi' ? 'कनेक्टेड नहीं' : 'Not connected'})
                    </span>
                  )}
                </p>
                <p className="text-text-main/50 text-xs">
                  {source.publisher}
                  {source.enabled 
                    ? ` • ${source.recordCount} records • Retrieved: ${source.retrievalDate || 'Unknown'}`
                    : ` • ${language === 'hi' ? 'कोई रिकॉर्ड लोड नहीं' : 'No records loaded'}`}
                </p>
                <p className="text-text-main/40 text-xs mt-0.5 italic">
                  {source.limitations}
                </p>
              </div>
            </div>
          ))}
        </div>
        {!hasAnyRealDataSource() && (
          <div className="mt-3 p-3 bg-gold/10 dark:bg-gold/5 border border-gold/20 rounded-xl">
            <p className="text-xs text-text-main/70 dark:text-[#D0D6CE]">
              <span className="font-semibold text-gold">
                {language === 'hi' ? 'वर्तमान स्थिति: ' : 'Current status: '}
              </span>
              {language === 'hi'
                ? 'कोई वास्तविक डेटा स्रोत कॉन्फ़िगर नहीं है। सत्यापन उपलब्ध नहीं है। केवल एक्सपायरी डेट की जांच की जाती है।'
                : 'No real data source is configured. Verification against quality-alert records is unavailable. Only expiry date checking is functional.'}
            </p>
          </div>
        )}
        <p className="text-xs text-text-main/40 mt-3 italic">
          {language === 'hi' 
            ? 'नोट: "कोई अलर्ट नहीं" का मतलब दवा सुरक्षित या असली है ऐसा नहीं है। डेटाबेस व्यापक नहीं हो सकते।'
            : 'Note: "No alert found" never confirms a medicine is safe or genuine. Databases may not be comprehensive.'}
        </p>
      </section>
    </div>
  );
}

// ==================== SCAN PAGE ====================
function ScanPage({ language, setCurrentPage, setCurrentReport, addScanToHistory }: {
  language: Language;
  setCurrentPage: (page: Page) => void;
  setCurrentReport: (report: VerificationReport) => void;
  addScanToHistory: (report: VerificationReport, barcodeResult?: BarcodeScanResult) => void;
}) {
  const tr = t[language];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);
  const [ocrProgress, setOcrProgress] = useState<OcrProgress | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fields, setFields] = useState<ExtractedFields | null>(null);
  const [manuallyEditedFields, setManuallyEditedFields] = useState<Set<string>>(new Set());
  const [isEditing, setIsEditing] = useState(false);
  const [qualityAssessment, setQualityAssessment] = useState<{quality: string; issues: string[]; suggestions: string[]} | null>(null);
  const [report, setReport] = useState<VerificationReport | null>(null);
  const [scanMode, setScanMode] = useState<'photo' | 'barcode'>('photo');
  const [barcodeResult, setBarcodeResult] = useState<BarcodeScanResult | null>(null);

  const handleFileUpload = useCallback(async (file: File) => {
    // Validate file
    if (!file.type.match(/^image\/(jpeg|jpg|png)$/i)) {
      alert(language === 'hi' 
        ? 'केवल JPG, JPEG, या PNG फ़ाइलें समर्थित हैं।'
        : 'Only JPG, JPEG, or PNG files are supported.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert(language === 'hi'
        ? 'फ़ाइल का आकार 10MB से अधिक नहीं होना चाहिए।'
        : 'File size must be under 10MB.');
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Run OCR
    setIsProcessing(true);
    setOcrProgress({ status: 'Starting...', progress: 0 });

    try {
      const result = await processImage(file, (progress) => {
        setOcrProgress(progress);
      });
      setOcrResult(result);
      setFields(result.fields);
      setManuallyEditedFields(new Set());
      setIsEditing(true);

      // Assess quality
      const assessment = assessOcrQuality(result);
      setQualityAssessment(assessment);
    } catch (err) {
      setOcrResult({
        success: false,
        fields: { productName: '', activeIngredient: '', strength: '', dosageForm: '', manufacturer: '', batchNumber: '', manufacturingDate: '', expiryDate: '', rawText: '' },
        fieldConfidences: [],
        confidence: 0,
        error: 'OCR processing failed',
        processingTime: 0
      });
    } finally {
      setIsProcessing(false);
      setOcrProgress(null);
    }
  }, [language]);

  const [whoAlertMatch, setWhoAlertMatch] = useState<WHOAlertMatch | null>(null);

  const handleRunVerification = () => {
    if (!fields) return;

    const input: VerificationInput = {
      productName: fields.productName,
      strength: fields.strength,
      manufacturer: fields.manufacturer,
      batchNumber: fields.batchNumber,
      expiryDate: fields.expiryDate,
      manufacturingDate: fields.manufacturingDate,
      dosageForm: fields.dosageForm
    };

    const verificationReport = generateReport(input);
    setReport(verificationReport);
    setCurrentReport(verificationReport);
    addScanToHistory(verificationReport, barcodeResult || undefined);

    // Run WHO alert matching
    const whoMatch = matchWHOAlert({
      productName: fields.productName,
      genericName: fields.activeIngredient,
      manufacturer: fields.manufacturer,
      batchNumber: fields.batchNumber
    });
    setWhoAlertMatch(whoMatch);
  };

  return (
    <div className="animate-fade-in max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="font-display text-2xl font-bold text-charcoal mb-1">
          {language === 'hi' ? 'दवा स्कैन करें' : 'Scan Medicine'}
        </h2>
        <p className="text-text-main/60 text-sm">
          {language === 'hi' 
            ? 'दवा पैकेजिंग की फोटो अपलोड करें, बारकोड स्कैन करें, या डेमो सैंपल चुनें।'
              : 'Upload a clear photo of the medicine packaging or scan its barcode.'}
        </p>
      </div>

      {/* Scan Mode Tabs */}
      {!imagePreview && !fields && !barcodeResult && (
        <div className="flex gap-2 mb-4 p-1 bg-sage/10 dark:bg-sage/5 rounded-xl" role="tablist">
          <button
            role="tab"
            aria-selected={scanMode === 'photo'}
            onClick={() => setScanMode('photo')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              scanMode === 'photo'
                ? 'bg-white dark:bg-[#1A211E] text-emerald-deep dark:text-sage-light shadow-sm'
                : 'text-text-main/60 dark:text-[#D0D6CE] hover:text-charcoal dark:hover:text-[#E8ECE6]'
            }`}
          >
            <Camera className="w-4 h-4" />
            {language === 'hi' ? 'फोटो / OCR' : 'Photo / OCR'}
          </button>
          <button
            role="tab"
            aria-selected={scanMode === 'barcode'}
            onClick={() => setScanMode('barcode')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              scanMode === 'barcode'
                ? 'bg-white dark:bg-[#1A211E] text-emerald-deep dark:text-sage-light shadow-sm'
                : 'text-text-main/60 dark:text-[#D0D6CE] hover:text-charcoal dark:hover:text-[#E8ECE6]'
            }`}
          >
            <ScanLine className="w-4 h-4" />
            {language === 'hi' ? 'बारकोड' : 'Barcode'}
          </button>
        </div>
      )}

      {/* Barcode Scanner Mode */}
      {scanMode === 'barcode' && !imagePreview && !fields && !barcodeResult && (
        <div className="mb-6">
          <BarcodeScanner
            language={language}
            onBarcodeScanned={(result) => {
              setBarcodeResult(result);
            }}
          />
        </div>
      )}

      {/* Barcode Result Display */}
      {barcodeResult && (
        <div className="bg-white dark:bg-[#1A211E] rounded-2xl border border-sage/20 p-5 mb-4 animate-fade-in">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <ScanLine className="w-5 h-5 text-emerald-deep" />
              <h3 className="font-semibold text-charcoal dark:text-[#E8ECE6]">
                {language === 'hi' ? 'बारकोड स्कैन परिणाम' : 'Barcode Scan Result'}
              </h3>
            </div>
            <button
              onClick={() => setBarcodeResult(null)}
              className="text-sm text-text-main/50 hover:text-text-main/80 transition-colors"
              aria-label={language === 'hi' ? 'बारकोड परिणाम हटाएं' : 'Clear barcode result'}
            >
              {language === 'hi' ? 'हटाएं' : 'Clear'}
            </button>
          </div>
          
          <div className="bg-ivory/50 dark:bg-emerald-deep/10 rounded-xl p-3 mb-3">
            <p className="text-xs font-medium text-text-main/50 dark:text-[#D0D6CE] uppercase tracking-wider mb-1">
              {language === 'hi' ? 'बारकोड नंबर' : 'Barcode Number'}
            </p>
            <code className="text-lg font-mono font-bold text-charcoal dark:text-[#E8ECE6]">
              {barcodeResult.value}
            </code>
            <p className="text-xs text-text-main/50 dark:text-[#D0D6CE] mt-1">
              {language === 'hi' ? 'प्रकार' : 'Format'}: {barcodeResult.formatLabel}
            </p>
          </div>

          {/* Disclaimer — prominent and honest */}
          <div role="status" className="bg-gold/10 dark:bg-gold/5 border border-gold/20 rounded-xl p-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-gold flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="text-xs font-semibold text-gold mb-0.5">
                {language === 'hi' ? 'बारकोड पहचान या सुरक्षा साबित नहीं करता' : 'A barcode does not prove identity or safety'}
              </p>
              <p className="text-xs text-text-main/60 dark:text-[#D0D6CE]">
                {language === 'hi'
                  ? 'बारकोड स्कैन करने से केवल पैकेजिंग पर छपा नंबर पढ़ा जाता है। यह दवा की पहचान, प्रामाणिकता या सुरक्षा की पुष्टि नहीं करता। कोई उत्पाद डेटाबेस कनेक्ट नहीं है।'
                  : 'Scanning a barcode only reads the number printed on the packaging. It does NOT identify, authenticate, or verify the medicine. No product database is connected.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Upload Area - Only show in photo mode */}
      {scanMode === 'photo' && !imagePreview && !fields && (
        <div className="space-y-6">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-sage/40 rounded-2xl p-10 text-center cursor-pointer hover:border-emerald-deep/40 hover:bg-emerald-deep/2 transition-all group"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
              }}
            />
            <Upload className="w-12 h-12 text-sage mx-auto mb-4 group-hover:text-emerald-deep transition-colors" />
            <p className="font-semibold text-charcoal mb-1">{tr.uploadImage}</p>
            <p className="text-sm text-text-main/50">JPG, JPEG, PNG • Max 10MB</p>
          </div>

        </div>
      )}

      {/* Processing State */}
      {isProcessing && ocrProgress && (
        <div className="bg-white rounded-2xl p-8 border border-sage/20 text-center">
          <RefreshCw className="w-10 h-10 text-emerald-deep mx-auto mb-4 animate-spin" />
          <p className="font-semibold text-charcoal mb-2">{tr.processing}</p>
          <p className="text-sm text-text-main/60">{ocrProgress.status}</p>
          <div className="mt-4 h-2 bg-sage/20 rounded-full overflow-hidden max-w-xs mx-auto">
            <div 
              className="h-full bg-emerald-deep rounded-full transition-all duration-300"
              style={{ width: `${Math.round(ocrProgress.progress * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Image Preview + OCR Results */}
      {(imagePreview || fields || barcodeResult) && !isProcessing && (
        <div className="space-y-4">
          {/* Image Preview */}
          {imagePreview && (
            <div className="bg-white rounded-2xl p-4 border border-sage/20">
              <img 
                src={imagePreview} 
                alt="Medicine packaging" 
                className="max-h-64 mx-auto rounded-lg object-contain"
              />
              {ocrResult && (
                <div className="mt-3 flex items-center justify-center gap-4 text-xs text-text-main/50">
                  <span>Confidence: {ocrResult.confidence.toFixed(0)}%</span>
                  <span>Time: {(ocrResult.processingTime / 1000).toFixed(1)}s</span>
                </div>
              )}
            </div>
          )}

          {/* Quality Assessment */}
          {qualityAssessment && qualityAssessment.quality !== 'good' && (
            <div className="bg-warning-light rounded-xl p-4 border border-warning/20">
              <p className="font-medium text-warning text-sm flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4" />
                {language === 'hi' ? 'इमेज गुणवत्ता समस्या' : 'Image Quality Issue'}
              </p>
              {qualityAssessment.issues.map((issue, i) => (
                <p key={i} className="text-sm text-text-main/70">• {issue}</p>
              ))}
              {qualityAssessment.suggestions.length > 0 && (
                <div className="mt-2 pt-2 border-t border-warning/10">
                  <p className="text-xs font-medium text-text-main/60 mb-1">
                    {language === 'hi' ? 'सुझाव:' : 'Suggestions:'}
                  </p>
                  {qualityAssessment.suggestions.map((sug, i) => (
                    <p key={i} className="text-xs text-text-main/50">• {sug}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Image Quality Warning */}
          {ocrResult?.imageQuality && ocrResult.imageQuality.score < 70 && (
            <div className="bg-warning-light border border-warning/30 rounded-2xl p-4 mb-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-warning text-sm mb-2">
                    {language === 'hi' ? 'इमेज गुणवत्ता चेतावनी' : 'Image Quality Warning'}
                  </h4>
                  <p className="text-xs text-text-main/70 mb-2">
                    {language === 'hi' 
                      ? 'इमेज की गुणवत्ता कम हो सकती है, जिससे OCR परिणाम प्रभावित हो सकते हैं।'
                      : 'Image quality may be low, which could affect OCR accuracy.'}
                  </p>
                  {ocrResult.imageQuality.recommendations.length > 0 && (
                    <ul className="text-xs text-text-main/60 space-y-1">
                      {ocrResult.imageQuality.recommendations.map((rec, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-warning mt-0.5">•</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <button
                    onClick={() => {
                      setImagePreview(null);
                      setImageFile(null);
                      setOcrResult(null);
                      setFields(null);
                      setManuallyEditedFields(new Set());
                      setQualityAssessment(null);
                    }}
                    className="mt-3 text-xs text-emerald-deep font-medium hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    {language === 'hi' ? 'फोटो दोबारा लें' : 'Retake Photo'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Raw OCR Text (Debug/Transparency) */}
          {ocrResult?.fields.rawText && (
            <details className="bg-white rounded-2xl p-5 border border-sage/20">
              <summary className="font-semibold text-charcoal flex items-center gap-2 cursor-pointer hover:text-emerald-deep transition-colors">
                <Eye className="w-4 h-4 text-gold" />
                {language === 'hi' ? 'कच्चा OCR टेक्स्ट देखें' : 'View Raw OCR Text'}
                <span className="text-xs font-normal text-text-main/50 ml-2">
                  ({language === 'hi' ? 'डीबगिंग के लिए' : 'For debugging'})
                </span>
              </summary>
              <div className="mt-4">
                <p className="text-xs text-text-main/60 mb-2">
                  {language === 'hi' 
                    ? 'यह वह कच्चा टेक्स्ट है जो OCR इंजन ने इमेज से पढ़ा है। यदि यह गलत या अव्यवस्थित है, तो इमेज की गुणवत्ता बढ़ाएं।'
                    : 'This is the raw text that the OCR engine read from the image. If this is incorrect or garbled, improve the image quality.'}
                </p>
                <div className="bg-ivory/50 dark:bg-emerald-deep/10 rounded-lg p-3 border border-sage/10">
                  <pre className="text-xs text-charcoal dark:text-[#E8ECE6] whitespace-pre-wrap break-words font-mono leading-relaxed">
                    {ocrResult.fields.rawText}
                  </pre>
                </div>
                <div className="mt-3 flex items-center gap-4 text-xs text-text-main/60">
                  <span>
                    {language === 'hi' ? 'OCR विश्वास:' : 'OCR Confidence:'} <strong>{ocrResult.confidence.toFixed(1)}%</strong>
                  </span>
                  <span>
                    {language === 'hi' ? 'प्रोसेसिंग समय:' : 'Processing Time:'} <strong>{(ocrResult.processingTime / 1000).toFixed(2)}s</strong>
                  </span>
                </div>
                {ocrResult.confidence < 60 && (
                  <div className="mt-3 bg-warning-light dark:bg-warning/10 border border-warning/20 rounded-lg p-3 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-text-main/70">
                      <p className="font-semibold text-warning mb-1">
                        {language === 'hi' ? 'कम OCR विश्वास' : 'Low OCR Confidence'}
                      </p>
                      <p>
                        {language === 'hi'
                          ? 'OCR इंजन को टेक्स्ट पढ़ने में कठिनाई हो रही है। बेहतर परिणामों के लिए: तेज इमेज लें, अच्छी रोशनी सुनिश्चित करें, और सुनिश्चित करें कि टेक्स्ट स्पष्ट और पढ़ने योग्य है।'
                          : 'The OCR engine is having difficulty reading the text. For better results: take a sharper image, ensure good lighting, and make sure the text is clear and readable.'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </details>
          )}

          {/* Editable Fields */}
          {fields && (
            <div className="bg-white rounded-2xl p-5 border border-sage/20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-charcoal flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-gold" />
                  {tr.editFields}
                </h3>
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-sm text-emerald-deep hover:underline flex items-center gap-1"
                  >
                    <Edit3 className="w-3 h-3" />
                    Edit
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { key: 'productName', label: language === 'hi' ? 'उत्पाद का नाम' : 'Product Name' },
                  { key: 'activeIngredient', label: language === 'hi' ? 'सक्रिय तत्व' : 'Active Ingredient' },
                  { key: 'strength', label: language === 'hi' ? 'शक्ति' : 'Strength' },
                  { key: 'dosageForm', label: language === 'hi' ? 'खुराक रूप' : 'Dosage Form' },
                  { key: 'manufacturer', label: language === 'hi' ? 'निर्माता' : 'Manufacturer' },
                  { key: 'batchNumber', label: language === 'hi' ? 'बैच नंबर' : 'Batch Number' },
                  { key: 'manufacturingDate', label: language === 'hi' ? 'निर्माण तिथि' : 'Manufacturing Date' },
                  { key: 'expiryDate', label: language === 'hi' ? 'समाप्ति तिथि' : 'Expiry Date' },
                ].map(field => {
                      const fieldConfidence = ocrResult?.fieldConfidences?.find(fc => fc.field === field.key);
                  const wasManuallyEdited = manuallyEditedFields.has(field.key);
                  const isUncertain = !wasManuallyEdited && (fieldConfidence?.confidence === 'uncertain' || fieldConfidence?.confidence === 'low');
                  const fieldValue = (fields as any)[field.key];
                  
                  return (
                    <div key={field.key} className={isUncertain && !fieldValue ? 'bg-warning-light/30 rounded-lg p-2' : ''}>
                      <label className="text-xs font-medium text-text-main/60 mb-1 flex items-center gap-2">
                        {field.label}
                        {wasManuallyEdited ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-deep/10 text-emerald-deep">
                            {fieldValue
                              ? (language === 'hi' ? 'मैन्युअल दर्ज' : 'Manually entered')
                              : (language === 'hi' ? 'मैन्युअल संपादित' : 'Manually edited')}
                          </span>
                        ) : fieldConfidence && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                            fieldConfidence.confidence === 'high' ? 'bg-positive/20 text-positive' :
                            fieldConfidence.confidence === 'medium' ? 'bg-gold/20 text-gold' :
                            fieldConfidence.confidence === 'low' ? 'bg-warning/20 text-warning' :
                            'bg-text-main/10 text-text-main/50'
                          }`}>
                            {fieldConfidence.confidence === 'high' ? (language === 'hi' ? 'उच्च' : 'High') :
                             fieldConfidence.confidence === 'medium' ? (language === 'hi' ? 'मध्यम' : 'Medium') :
                             fieldConfidence.confidence === 'low' ? (language === 'hi' ? 'कम' : 'Low') :
                             (language === 'hi' ? 'अनिश्चित' : 'Uncertain')}
                          </span>
                        )}
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={fieldValue || ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            setFields({ ...fields, [field.key]: value });
                            setManuallyEditedFields(previous => {
                              const next = new Set(previous);
                              next.add(field.key);
                              return next;
                            });
                          }}
                          className="w-full px-3 py-2 border border-sage/30 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-deep/20 focus:border-emerald-deep/40"
                          placeholder={language === 'hi' ? '(पहचाना नहीं गया)' : '(not detected)'}
                        />
                      ) : (
                        <div>
                          <p className={`text-sm py-2 ${
                            fieldValue ? 'text-charcoal' : 'text-text-main/30 italic'
                          }`}>
                            {fieldValue || (language === 'hi' ? '(पहचाना नहीं गया)' : '(not detected)')}
                          </p>
                          {isUncertain && fieldValue && fieldConfidence?.message && (
                            <p className="text-xs text-warning mt-1 flex items-start gap-1">
                              <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                              <span>{fieldConfidence.message}</span>
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {isEditing && (
                <button
                  onClick={() => setIsEditing(false)}
                  className="mt-4 text-sm text-emerald-deep hover:underline"
                >
                  {language === 'hi' ? 'संपादन पूर्ण' : 'Done Editing'}
                </button>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleRunVerification}
              disabled={!fields}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-emerald-deep text-white rounded-xl font-semibold hover:bg-emerald-light transition-all shadow-lg shadow-emerald-deep/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Search className="w-5 h-5" />
              {tr.runCheck}
            </button>
            <button
              onClick={() => {
                setImagePreview(null);
                setImageFile(null);
                setOcrResult(null);
                setFields(null);
                setManuallyEditedFields(new Set());
                setIsEditing(false);
                setQualityAssessment(null);
                setReport(null);
                setBarcodeResult(null);
                setScanMode('photo');
              }}
              className="px-4 py-3 bg-white dark:bg-[#1A211E] text-text-main/70 border border-sage/20 dark:border-sage/15 rounded-xl font-medium hover:bg-sage/5 transition-all"
              aria-label={language === 'hi' ? 'सब कुछ रीसेट करें' : 'Reset all'}
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Report Result */}
          {report && (
            <ReportInline report={report} language={language} setCurrentPage={setCurrentPage} />
          )}

          {/* WHO Alerts Check */}
          {whoAlertMatch && (
            <div className="mt-4">
              <WHOAlerts match={whoAlertMatch} language={language} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ==================== REPORT INLINE ====================
function ReportInline({ report, language, setCurrentPage }: {
  report: VerificationReport;
  language: Language;
  setCurrentPage: (page: Page) => void;
}) {
  const tr = t[language];
  const outcomeInfo = formatOutcome(report.outcome);

  return (
    <div className="bg-white rounded-2xl border border-sage/20 overflow-hidden animate-fade-in">
      {/* Outcome Banner */}
      <div className={`p-5 ${
        report.outcome === 'ALERT_MATCH_FOUND' ? 'bg-warning-light' :
        report.outcome === 'NO_ALERT_FOUND' ? 'bg-positive-light' : 'bg-ivory'
      }`}>
        <div className="flex items-start gap-3">
          <span className="text-2xl">{outcomeInfo.icon}</span>
          <div>
            <h3 className={`font-bold text-lg ${outcomeInfo.color}`}>{outcomeInfo.label}</h3>
            <p className="text-sm text-text-main/70 mt-1">{outcomeInfo.description}</p>
          </div>
        </div>
      </div>

      {/* Data Mode Note — honest explanation of what was checked */}
      <div className="px-5 py-3 bg-gold/5 dark:bg-gold/5 border-b border-gold/10 flex items-start gap-2">
        <Info className="w-4 h-4 text-gold flex-shrink-0 mt-0.5" aria-hidden="true" />
        <p className="text-xs text-text-main/70 dark:text-[#D0D6CE] leading-relaxed">
          <span className="font-semibold text-gold">
            {language === 'hi' ? 'डेटा स्थिति: ' : 'Data status: '}
          </span>
          {report.dataModeNote}
        </p>
      </div>

      {/* Details */}
      <div className="p-5 space-y-4">
        {/* Expiry Check */}
        <div>
          <h4 className="text-sm font-semibold text-charcoal mb-1 flex items-center gap-2">
            <Clock className="w-4 h-4 text-gold" />
            {language === 'hi' ? 'एक्सपायरी जांच' : 'Expiry Check'}
          </h4>
          <p className="text-sm text-text-main/70">{report.expiryCheck.message}</p>
        </div>

        {/* Match Rationale */}
        <div>
          <h4 className="text-sm font-semibold text-charcoal mb-1 flex items-center gap-2">
            <Search className="w-4 h-4 text-emerald-deep" />
            {tr.matchingRationale}
          </h4>
          <p className="text-sm text-text-main/70">{report.matchResult.explanation}</p>
        </div>

        {/* Warnings */}
        {report.warnings.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-warning mb-1 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              {tr.warnings}
            </h4>
            {report.warnings.map((w, i) => (
              <p key={i} className="text-sm text-text-main/70">• {w}</p>
            ))}
          </div>
        )}

        {/* Next Steps */}
        <div>
          <h4 className="text-sm font-semibold text-charcoal mb-1 flex items-center gap-2">
            <ChevronRight className="w-4 h-4 text-positive" />
            {tr.nextSteps}
          </h4>
          {report.nextSteps.map((s, i) => (
            <p key={i} className="text-sm text-text-main/70">• {s}</p>
          ))}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-sage/10">
          <button
            onClick={() => exportReportAsPDF(report)}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-deep text-white rounded-lg text-sm font-medium hover:bg-emerald-light transition-all"
          >
            <Download className="w-4 h-4" />
            {tr.exportPdf}
          </button>
          <button
            onClick={() => setCurrentPage('assistant')}
            className="flex items-center gap-1.5 px-4 py-2 bg-white text-emerald-deep border border-emerald-deep/20 rounded-lg text-sm font-medium hover:bg-emerald-deep/5 transition-all"
          >
            <MessageCircle className="w-4 h-4" />
            {tr.askAssistant}
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== REPORT PAGE ====================
function ReportPage({ language, report, setCurrentPage }: {
  language: Language;
  report: VerificationReport;
  setCurrentPage: (page: Page) => void;
}) {
  const tr = t[language];
  const outcomeInfo = formatOutcome(report.outcome);

  return (
    <div className="animate-fade-in max-w-4xl mx-auto">
      <button
        onClick={() => setCurrentPage('dashboard')}
        className="flex items-center gap-1 text-sm text-text-main/60 hover:text-emerald-deep mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        {language === 'hi' ? 'वापस' : 'Back'}
      </button>

      {/* Voice Assistant for Report */}
      <VoiceAssistant language={language} currentReport={report} />

      <div className="bg-white rounded-2xl border border-sage/20 overflow-hidden">
        {/* Header */}
        <div className="bg-emerald-deep p-5 text-white">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-5 h-5 text-gold" />
            <h2 className="font-display text-xl font-bold">{tr.report}</h2>
          </div>
          <p className="text-sage-light text-xs">
            {new Date(report.timestamp).toLocaleString('en-IN')}
          </p>
        </div>

        {/* Outcome */}
        <div className={`p-5 ${
          report.outcome === 'ALERT_MATCH_FOUND' ? 'bg-warning-light' :
          report.outcome === 'NO_ALERT_FOUND' ? 'bg-positive-light' : 'bg-ivory'
        }`}>
          <div className="flex items-start gap-3">
            <span className="text-3xl">{outcomeInfo.icon}</span>
            <div>
              <h3 className={`font-bold text-lg ${outcomeInfo.color}`}>{outcomeInfo.label}</h3>
              <p className="text-sm text-text-main/70 mt-1">{outcomeInfo.description}</p>
            </div>
          </div>
        </div>

        {/* Data Mode Note */}
        <div className="px-5 py-3 bg-gold/5 dark:bg-gold/5 border-b border-gold/10 flex items-start gap-2">
          <Info className="w-4 h-4 text-gold flex-shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-xs text-text-main/70 dark:text-[#D0D6CE] leading-relaxed">
            <span className="font-semibold text-gold">
              {language === 'hi' ? 'डेटा स्थिति: ' : 'Data status: '}
            </span>
            {report.dataModeNote}
          </p>
        </div>

        {/* Full Report Content */}
        <div className="p-5 space-y-5">
          {/* Fields Checked */}
          <section>
            <h4 className="text-sm font-semibold text-charcoal mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4 text-gold" />
              {tr.fieldsChecked}
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {[
                { label: language === 'hi' ? 'उत्पाद' : 'Product', value: report.input.productName },
                { label: language === 'hi' ? 'शक्ति' : 'Strength', value: report.input.strength },
                { label: language === 'hi' ? 'रूप' : 'Form', value: report.input.dosageForm },
                { label: language === 'hi' ? 'निर्माता' : 'Manufacturer', value: report.input.manufacturer },
                { label: language === 'hi' ? 'बैच' : 'Batch', value: report.input.batchNumber },
                { label: language === 'hi' ? 'एक्सपायरी' : 'Expiry', value: report.input.expiryDate },
              ].map((field, i) => (
                <div key={i} className="bg-ivory rounded-lg p-2">
                  <p className="text-[10px] text-text-main/50 uppercase tracking-wider">{field.label}</p>
                  <p className={`text-sm font-medium ${field.value ? 'text-charcoal' : 'text-text-main/30 italic'}`}>
                    {field.value || '—'}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Expiry Check */}
          <section>
            <h4 className="text-sm font-semibold text-charcoal mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4 text-gold" />
              {language === 'hi' ? 'एक्सपायरी जांच' : 'Expiry Check'}
            </h4>
            <div className={`rounded-lg p-3 ${
              report.expiryCheck.status === 'expired' ? 'bg-warning-light' :
              report.expiryCheck.status === 'valid' ? 'bg-positive-light' : 'bg-ivory'
            }`}>
              <p className="text-sm text-text-main/70">{report.expiryCheck.message}</p>
            </div>
          </section>

          {/* Matching Rationale */}
          <section>
            <h4 className="text-sm font-semibold text-charcoal mb-2 flex items-center gap-2">
              <Search className="w-4 h-4 text-emerald-deep" />
              {tr.matchingRationale}
            </h4>
            <p className="text-sm text-text-main/70 bg-ivory rounded-lg p-3">
              {report.matchResult.explanation}
            </p>
          </section>

          {/* Sources */}
          <section>
            <h4 className="text-sm font-semibold text-charcoal mb-2 flex items-center gap-2">
              <Info className="w-4 h-4 text-emerald-deep" />
              {tr.sourcesChecked} & {tr.dataFreshness}
            </h4>
            <div className="space-y-2">
              {report.sourcesChecked.map((source, i) => (
                <div key={i} className="bg-ivory rounded-lg p-3">
                  <p className="text-sm font-medium text-charcoal">{source.name}</p>
                  <p className="text-xs text-text-main/50">
                    {source.publisher} • {source.recordCount} records
                  </p>
                  <p className="text-xs text-text-main/50">
                    Retrieved: {source.retrievalDate} • Published: {source.publicationDate || 'Ongoing'}
                  </p>
                  <p className="text-xs text-warning/70 mt-1 italic">
                    {source.limitations}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Warnings */}
          {report.warnings.length > 0 && (
            <section>
              <h4 className="text-sm font-semibold text-warning mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                {tr.warnings}
              </h4>
              {report.warnings.map((w, i) => (
                <p key={i} className="text-sm text-text-main/70 mb-1">• {w}</p>
              ))}
            </section>
          )}

          {/* Next Steps */}
          <section>
            <h4 className="text-sm font-semibold text-charcoal mb-2 flex items-center gap-2">
              <ChevronRight className="w-4 h-4 text-positive" />
              {tr.nextSteps}
            </h4>
            {report.nextSteps.map((s, i) => (
              <p key={i} className="text-sm text-text-main/70 mb-1">• {s}</p>
            ))}
          </section>

          {/* Disclaimer */}
          <div className="border-t border-sage/20 pt-4">
            <p className="text-xs text-text-main/50 italic flex items-start gap-2">
              <Shield className="w-3 h-3 mt-0.5 flex-shrink-0 text-warning" />
              {report.disclaimer}
            </p>
            <p className="text-[10px] text-text-main/30 mt-2">
              Report generated: {new Date(report.timestamp).toLocaleString('en-IN')} | 
              Data retrieval: {report.sourcesChecked.map(s => s.retrievalDate).join(', ')} |
              This is NOT a certificate of authenticity.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-2">
            <button
              onClick={() => exportReportAsPDF(report)}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-deep text-white rounded-xl text-sm font-medium hover:bg-emerald-light transition-all"
            >
              <Download className="w-4 h-4" />
              {tr.exportPdf}
            </button>
            <button
              onClick={() => setCurrentPage('assistant')}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-white text-emerald-deep border border-emerald-deep/20 rounded-xl text-sm font-medium hover:bg-emerald-deep/5 transition-all"
            >
              <MessageCircle className="w-4 h-4" />
              {tr.askAssistant}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== ASSISTANT PAGE ====================
function AssistantPage({ language, currentReport }: {
  language: Language;
  currentReport: VerificationReport | null;
}) {
  const [messages, setMessages] = useState<{role: 'user' | 'assistant'; text: string; sources?: {title: string; url?: string}[]; isEmergency?: boolean}[]>([
    { role: 'assistant', text: getGreeting(language) }
  ]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (text?: string) => {
    const query = text || input.trim();
    if (!query) return;

    setMessages(prev => [...prev, { role: 'user', text: query }]);
    setInput('');

    // Generate response
    const context = currentReport ? {
      productName: currentReport.input.productName,
      outcome: currentReport.outcome
    } : undefined;

    const response: ChatResponse = generateResponse(query, language, context);

    setTimeout(() => {
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: response.text,
        sources: response.sources,
        isEmergency: response.isEmergency
      }]);
    }, 500);
  };

  const suggestedQuestions = getSuggestedQuestions(language);

  return (
    <div className="animate-fade-in max-w-3xl mx-auto">
      <div className="mb-4">
        <h2 className="font-display text-2xl font-bold text-charcoal mb-1">
          {language === 'hi' ? 'स्वास्थ्य सहायक' : 'Health Assistant'}
        </h2>
        <p className="text-text-main/60 text-sm">
          {language === 'hi'
            ? 'दवा जानकारी, पैकेजिंग, और सुरक्षा के बारे में प्रश्न पूछें।'
            : 'Ask questions about medicine information, packaging, and safety.'}
        </p>
      </div>

      {/* Safety Notice */}
      <div className="mb-4 bg-gold/10 border border-gold/20 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-charcoal mb-1">
              {language === 'hi' ? '⚠️ महत्वपूर्ण सुरक्षा सूचना' : '⚠️ Important Safety Notice'}
            </p>
            <p className="text-text-main/70 leading-relaxed">
              {language === 'hi' 
                ? 'यह सहायक सामान्य स्वास्थ्य जानकारी प्रदान करता है, लेकिन डॉक्टर नहीं है। यह निदान नहीं कर सकता, दवा prescribed नहीं कर सकता, या व्यक्तिगत चिकित्सा सलाह नहीं दे सकता। गंभीर या आपातकालीन स्थिति में, कृपया तुरंत चिकित्सा सहायता लें।'
                : 'This assistant provides general health information but is not a doctor. It cannot diagnose conditions, prescribe medications, or provide personalized medical advice. For serious or emergency situations, please seek immediate medical care.'}
            </p>
          </div>
        </div>
      </div>

      {/* Chat Container */}
      <div className="bg-white rounded-2xl border border-sage/20 overflow-hidden flex flex-col" style={{ height: '60vh', minHeight: '400px' }}>
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                msg.role === 'user' 
                  ? 'bg-emerald-deep text-white rounded-br-sm' 
                  : msg.isEmergency
                    ? 'bg-warning-light border border-warning/20 rounded-bl-sm'
                    : 'bg-ivory text-charcoal rounded-bl-sm'
              }`}>
                <p className="text-base leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-sage/20">
                    <p className="text-xs text-text-main/50 font-medium uppercase tracking-wider mb-1">
                      {language === 'hi' ? 'स्रोत:' : 'Sources:'}
                    </p>
                    {msg.sources.map((src, j) => (
                      <p key={j} className="text-sm text-emerald-deep">
                        {src.url ? (
                          <a href={src.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                            {src.title} ↗
                          </a>
                        ) : src.title}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Questions */}
        {messages.length <= 1 && (
          <div className="px-4 pb-2">
            <p className="text-sm text-text-main/60 mb-2 font-medium">
              {language === 'hi' ? '💡 सुझाए गए प्रश्न:' : '💡 Suggested questions:'}
            </p>
            <div className="flex flex-wrap gap-2">
              {suggestedQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(q)}
                  className="text-sm px-4 py-2 bg-ivory border border-sage/20 rounded-full text-text-main/70 hover:border-emerald-deep/30 hover:text-emerald-deep hover:bg-emerald-deep/5 transition-all"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="p-3 border-t border-sage/10">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={language === 'hi' ? 'अपना प्रश्न टाइप करें...' : 'Type your question...'}
              className="flex-1 px-4 py-3 border border-sage/30 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-emerald-deep/20 focus:border-emerald-deep/40"
              aria-label={language === 'hi' ? 'प्रश्न टाइप करें' : 'Type your question'}
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim()}
              className="px-5 py-3 bg-emerald-deep text-white rounded-xl hover:bg-emerald-light transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label={language === 'hi' ? 'भेजें' : 'Send'}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <p className="text-xs text-text-main/50 mt-2 text-center">
            {language === 'hi' 
              ? '⚠️ यह सूचनात्मक है, चिकित्सा सलाह नहीं। गंभीर स्थिति में डॉक्टर से मिलें।'
              : '⚠️ Informational only, not medical advice. See a doctor for serious concerns.'}
          </p>
        </div>
      </div>
    </div>
  );
}

// ==================== SAFETY PAGE ====================
function SafetyPage({ language }: { language: Language }) {
  return (
    <div className="animate-fade-in max-w-3xl mx-auto">
      <div className="mb-6">
        <h2 className="font-display text-2xl font-bold text-charcoal mb-1">
          {language === 'hi' ? 'सुरक्षा गाइड' : 'Safety Guide'}
        </h2>
        <p className="text-text-main/60 text-sm">
          {language === 'hi'
            ? 'MedVerify की क्षमताओं और सीमाओं को समझें।'
            : 'Understand MedVerify\'s capabilities and limitations.'}
        </p>
      </div>

      <div className="space-y-4">
        {/* What MedVerify Does */}
        <div className="bg-white rounded-2xl p-5 border border-sage/20">
          <h3 className="font-semibold text-charcoal mb-3 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-positive" />
            {language === 'hi' ? 'MedVerify क्या करता है' : 'What MedVerify Does'}
          </h3>
          <ul className="space-y-2">
            {[
              language === 'hi' ? 'दवा पैकेजिंग से टेक्स्ट पढ़ता है (OCR)' : 'Reads text from medicine packaging (OCR)',
              language === 'hi' ? 'एक्सपायरी डेट की जांच करता है' : 'Checks expiry dates',
              language === 'hi' ? 'उपलब्ध गुणवत्ता अलर्ट रिकॉर्ड के खिलाफ बैच/उत्पाद की तुलना करता है' : 'Compares batch/product against available quality-alert records',
              language === 'hi' ? 'हर निर्णय के लिए स्पष्टीकरण प्रदान करता है' : 'Provides explanations for every decision',
              language === 'hi' ? 'दवा जानकारी के बारे में सामान्य प्रश्नों का उत्तर देता है' : 'Answers general questions about medicine information',
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-text-main/70">
                <span className="text-positive mt-0.5">✓</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* What MedVerify Does NOT Do */}
        <div className="bg-white rounded-2xl p-5 border border-warning/20">
          <h3 className="font-semibold text-charcoal mb-3 flex items-center gap-2">
            <XCircle className="w-5 h-5 text-warning" />
            {language === 'hi' ? 'MedVerify क्या नहीं करता' : 'What MedVerify Does NOT Do'}
          </h3>
          <ul className="space-y-2">
            {[
              language === 'hi' ? 'किसी बीमारी का निदान नहीं करता' : 'Diagnose any disease or condition',
              language === 'hi' ? 'दवा या खुराक निर्धारित नहीं करता' : 'Prescribe medication or dosages',
              language === 'hi' ? 'दवा को "असली" या "प्रमाणिक" प्रमाणित नहीं करता' : 'Certify a medicine as "genuine" or "authentic"',
              language === 'hi' ? 'प्रयोगशाला परीक्षण नहीं करता' : 'Perform laboratory testing',
              language === 'hi' ? 'व्यापक दवा ज्ञान का दावा नहीं करता' : 'Claim comprehensive medicine knowledge',
              language === 'hi' ? 'आपके डॉक्टर या फार्मासिस्ट का विकल्प नहीं है' : 'Replace your doctor or pharmacist',
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-text-main/70">
                <span className="text-warning mt-0.5">✗</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Understanding Results */}
        <div className="bg-white rounded-2xl p-5 border border-sage/20">
          <h3 className="font-semibold text-charcoal mb-3 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-gold" />
            {language === 'hi' ? 'परिणामों को समझना' : 'Understanding Results'}
          </h3>
          <div className="space-y-3">
            <div className="bg-warning-light rounded-xl p-3">
              <p className="font-medium text-warning text-sm">⚠️ {language === 'hi' ? 'अलर्ट मैच मिला' : 'ALERT MATCH FOUND'}</p>
              <p className="text-sm text-text-main/70 mt-1">
                {language === 'hi'
                  ? 'एक मिलान गुणवत्ता अलर्ट पाया गया। फार्मासिस्ट या नियामक प्राधिकरण से परामर्श करें।'
                  : 'A matching quality alert was found. Consult a pharmacist or regulatory authority before use.'}
              </p>
            </div>
            <div className="bg-positive-light rounded-xl p-3">
              <p className="font-medium text-positive text-sm">✓ {language === 'hi' ? 'कोई अलर्ट नहीं मिला' : 'NO ALERT FOUND'}</p>
              <p className="text-sm text-text-main/70 mt-1">
                {language === 'hi'
                  ? 'कोई अलर्ट नहीं मिला, लेकिन इसका मतलब दवा असली या सुरक्षित है ऐसा नहीं है। जांचे गए डेटाबेस व्यापक नहीं हो सकते।'
                  : 'No alert was found, but this does NOT mean the medicine is genuine or safe. Checked databases may not be comprehensive.'}
              </p>
            </div>
            <div className="bg-ivory rounded-xl p-3">
              <p className="font-medium text-gold text-sm">? {language === 'hi' ? 'सत्यापित करने में असमर्थ' : 'UNABLE TO VERIFY'}</p>
              <p className="text-sm text-text-main/70 mt-1">
                {language === 'hi'
                  ? 'अपूर्ण या अस्पष्ट जानकारी के कारण सत्यापन पूरा नहीं हो सका। स्पष्ट इमेज अपलोड करें या फार्मासिस्ट से परामर्श करें।'
                  : 'Verification could not be completed due to insufficient or ambiguous information. Upload a clearer image or consult a pharmacist.'}
              </p>
            </div>
          </div>
        </div>

        {/* When to Seek Help */}
        <div className="bg-warning-light rounded-2xl p-5 border border-warning/20">
          <h3 className="font-semibold text-warning mb-3 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            {language === 'hi' ? 'तुरंत चिकित्सा सहायता कब लें' : 'When to Seek Immediate Medical Help'}
          </h3>
          <p className="text-sm text-text-main/70 mb-3">
            {language === 'hi'
              ? 'यदि आपको निम्नलिखित में से कोई भी अनुभव हो तो तुरंत आपातकालीन सेवाओं (भारत में 112) को कॉल करें:'
              : 'Call emergency services (112 in India) immediately if you experience:'}
          </p>
          <ul className="space-y-1">
            {[
              language === 'hi' ? 'सांस लेने में कठिनाई' : 'Difficulty breathing',
              language === 'hi' ? 'गंभीर एलर्जिक प्रतिक्रिया' : 'Severe allergic reaction',
              language === 'hi' ? 'छाती में दर्द' : 'Chest pain',
              language === 'hi' ? 'बेहोशी' : 'Loss of consciousness',
              language === 'hi' ? 'संभावित ओवरडोज' : 'Suspected overdose',
            ].map((item, i) => (
              <li key={i} className="text-sm text-text-main/70 flex items-center gap-2">
                <span className="text-warning">•</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Full Disclaimer */}
        <div className="bg-ivory rounded-2xl p-5 border border-gold/20">
          <h3 className="font-semibold text-charcoal mb-2 flex items-center gap-2">
            <Shield className="w-5 h-5 text-gold" />
            {language === 'hi' ? 'पूर्ण अस्वीकरण' : 'Full Disclaimer'}
          </h3>
          <p className="text-sm text-text-main/70 leading-relaxed">
            {SAFETY_DISCLAIMER}
          </p>
          <p className="text-xs text-text-main/50 mt-3">
            {language === 'hi'
              ? 'यह जानकारी के लिए बना टूल है, चिकित्सा निदान या उपचार के लिए नहीं। लाइव दवा-अलर्ट डेटा स्रोत अभी कनेक्ट नहीं हैं।'
              : 'This is an informational tool, not for medical diagnosis or treatment. Live medicine-alert data sources are not connected.'}
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
