import { useState, useRef, useCallback, useEffect } from 'react';
import { processImage, assessOcrQuality, OcrProgress, OcrResult, ExtractedFields } from './utils/ocr';
import { generateReport, formatOutcome, VerificationReport, VerificationInput } from './utils/verification';
import { SAFETY_DISCLAIMER, SHORT_DISCLAIMER } from './utils/safety';
import { generateResponse, getGreeting, getSuggestedQuestions, ChatResponse } from './utils/knowledge';
import { exportReportAsPDF } from './utils/pdfExport';
import { sources } from './data/appData';
import { ThemeProvider, AuthProvider, useTheme, useAuth } from './contexts';
import { SignInPage, SignUpPage } from './components/AuthPages';
import { Dashboard } from './components/Dashboard';
import { VoiceAssistant } from './components/VoiceAssistant';
import { 
  Shield, Camera, FileText, MessageCircle, AlertTriangle, 
  CheckCircle, XCircle, Upload, Clock, Search, Download,
  ChevronRight, Info, Eye, Edit3, Globe, ArrowLeft,
  Heart, BookOpen, HelpCircle, RefreshCw, Sun, Moon, LogOut
} from 'lucide-react';

// Types
type Page = 'home' | 'scan' | 'report' | 'assistant' | 'safety' | 'dashboard';
type Language = 'en' | 'hi';
type AuthPage = 'signin' | 'signup';

interface ScanHistory {
  id: string;
  timestamp: string;
  productName: string;
  outcome: string;
  report: VerificationReport;
}

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
    orChooseDemo: 'Or choose a demo sample',
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
    orChooseDemo: 'या डेमो सैंपल चुनें',
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
  const [scanHistory, setScanHistory] = useState<ScanHistory[]>([]);
  const [currentReport, setCurrentReport] = useState<VerificationReport | null>(null);
  const { isAuthenticated } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const tr = t[language];

  const addScanToHistory = (report: VerificationReport) => {
    const entry: ScanHistory = {
      id: report.id,
      timestamp: report.timestamp,
      productName: report.input.productName || 'Unknown',
      outcome: report.outcome,
      report
    };
    setScanHistory(prev => [entry, ...prev].slice(0, 10));
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
            DEMO APPLICATION — AI/ML Hackathon 2024 | Not for production medical use | Auth: UI-only demo
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
  scanHistory: ScanHistory[];
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

      {/* Data Sources Panel */}
      <section className="bg-white rounded-2xl p-5 border border-sage/20">
        <h3 className="font-semibold text-charcoal mb-3 flex items-center gap-2">
          <Info className="w-4 h-4 text-emerald-deep" />
          {tr.sourcesChecked}
        </h3>
        <div className="space-y-3">
          {sources.map((source, i) => (
            <div key={i} className="flex items-start gap-3 text-sm">
              <CheckCircle className="w-4 h-4 text-positive mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-charcoal">{source.name}</p>
                <p className="text-text-main/50 text-xs">
                  {source.publisher} • {source.recordCount} records • Retrieved: {source.retrievalDate}
                </p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-text-main/40 mt-3 italic">
          {language === 'hi' 
            ? 'नोट: डेटाबेस व्यापक नहीं हो सकते हैं। कोई अलर्ट नहीं मिलने का मतलब दवा की प्रामाणिकता नहीं है।'
            : 'Note: Databases may not be comprehensive. No alert found does not confirm medicine authenticity.'}
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
  addScanToHistory: (report: VerificationReport) => void;
}) {
  const tr = t[language];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);
  const [ocrProgress, setOcrProgress] = useState<OcrProgress | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fields, setFields] = useState<ExtractedFields | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [qualityAssessment, setQualityAssessment] = useState<{quality: string; issues: string[]; suggestions: string[]} | null>(null);
  const [report, setReport] = useState<VerificationReport | null>(null);

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
      setIsEditing(true);

      // Assess quality
      const assessment = assessOcrQuality(result);
      setQualityAssessment(assessment);
    } catch (err) {
      setOcrResult({
        success: false,
        fields: { productName: '', strength: '', dosageForm: '', manufacturer: '', batchNumber: '', manufacturingDate: '', expiryDate: '', rawText: '' },
        confidence: 0,
        error: 'OCR processing failed',
        processingTime: 0
      });
    } finally {
      setIsProcessing(false);
      setOcrProgress(null);
    }
  }, [language]);

  const handleDemoSelect = (demo: { name: string; fields: Partial<ExtractedFields> }) => {
    const demoFields: ExtractedFields = {
      productName: demo.fields.productName || '',
      strength: demo.fields.strength || '',
      dosageForm: demo.fields.dosageForm || '',
      manufacturer: demo.fields.manufacturer || '',
      batchNumber: demo.fields.batchNumber || '',
      manufacturingDate: demo.fields.manufacturingDate || '',
      expiryDate: demo.fields.expiryDate || '',
      rawText: `[DEMO] ${demo.name} — NOT A REAL MEDICINE RECORD`
    };
    setFields(demoFields);
    setIsEditing(true);
    setImagePreview(null);
    setImageFile(null);
    setOcrResult({
      success: true,
      fields: demoFields,
      confidence: 100,
      processingTime: 0
    });
    setQualityAssessment({ quality: 'good', issues: [], suggestions: [] });
  };

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
    addScanToHistory(verificationReport);
  };

  const demoSamples = [
    {
      name: 'Demo: Expired Medicine',
      fields: {
        productName: 'Paracetamol',
        strength: '500mg',
        dosageForm: 'Tablet',
        manufacturer: 'Demo Pharma Ltd',
        batchNumber: 'DP2024001',
        expiryDate: '03/2023',
        manufacturingDate: '03/2021'
      }
    },
    {
      name: 'Demo: Valid Medicine',
      fields: {
        productName: 'Amoxicillin',
        strength: '250mg',
        dosageForm: 'Capsule',
        manufacturer: 'Different Pharma Co',
        batchNumber: 'DIFF-AMX-2024-999',
        expiryDate: '12/2026',
        manufacturingDate: '01/2024'
      }
    },
    {
      name: 'Demo: Alert Match',
      fields: {
        productName: 'Metformin',
        strength: '500mg',
        dosageForm: 'Tablet',
        manufacturer: 'HealthCorp Pharmaceuticals',
        batchNumber: 'HC-MET-500-B1234',
        expiryDate: '06/2025',
        manufacturingDate: '06/2023'
      }
    },
    {
      name: 'Demo: Unclear Image',
      fields: {
        productName: '',
        strength: '',
        dosageForm: '',
        manufacturer: '',
        batchNumber: '',
        expiryDate: '',
        manufacturingDate: ''
      }
    }
  ];

  return (
    <div className="animate-fade-in max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="font-display text-2xl font-bold text-charcoal mb-1">
          {language === 'hi' ? 'दवा स्कैन करें' : 'Scan Medicine'}
        </h2>
        <p className="text-text-main/60 text-sm">
          {language === 'hi' 
            ? 'दवा पैकेजिंग की फोटो अपलोड करें या डेमो सैंपल चुनें।'
            : 'Upload a photo of medicine packaging or choose a demo sample.'}
        </p>
      </div>

      {/* Upload Area */}
      {!imagePreview && !fields && (
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

          {/* Demo Samples */}
          <div>
            <p className="text-sm font-medium text-text-main/60 mb-3 flex items-center gap-2">
              <Eye className="w-4 h-4" />
              {tr.orChooseDemo}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {demoSamples.map((demo, i) => (
                <button
                  key={i}
                  onClick={() => handleDemoSelect(demo)}
                  className="text-left p-3 bg-white rounded-xl border border-sage/20 hover:border-gold/40 hover:shadow-sm transition-all"
                >
                  <p className="text-sm font-medium text-charcoal">{demo.name}</p>
                  <p className="text-xs text-warning/80 mt-0.5">
                    {language === 'hi' ? 'डेमो — असली दवा रिकॉर्ड नहीं' : 'DEMO — NOT A REAL MEDICINE RECORD'}
                  </p>
                </button>
              ))}
            </div>
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
      {(imagePreview || fields) && !isProcessing && (
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
                  { key: 'strength', label: language === 'hi' ? 'शक्ति' : 'Strength' },
                  { key: 'dosageForm', label: language === 'hi' ? 'खुराक रूप' : 'Dosage Form' },
                  { key: 'manufacturer', label: language === 'hi' ? 'निर्माता' : 'Manufacturer' },
                  { key: 'batchNumber', label: language === 'hi' ? 'बैच नंबर' : 'Batch Number' },
                  { key: 'manufacturingDate', label: language === 'hi' ? 'निर्माण तिथि' : 'Manufacturing Date' },
                  { key: 'expiryDate', label: language === 'hi' ? 'समाप्ति तिथि' : 'Expiry Date' },
                ].map(field => (
                  <div key={field.key}>
                    <label className="text-xs font-medium text-text-main/60 mb-1 block">
                      {field.label}
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={(fields as any)[field.key] || ''}
                        onChange={(e) => setFields({ ...fields, [field.key]: e.target.value })}
                        className="w-full px-3 py-2 border border-sage/30 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-deep/20 focus:border-emerald-deep/40"
                        placeholder={language === 'hi' ? '(पहचाना नहीं गया)' : '(not detected)'}
                      />
                    ) : (
                      <p className={`text-sm py-2 ${
                        (fields as any)[field.key] ? 'text-charcoal' : 'text-text-main/30 italic'
                      }`}>
                        {(fields as any)[field.key] || (language === 'hi' ? '(पहचाना नहीं गया)' : '(not detected)')}
                      </p>
                    )}
                  </div>
                ))}
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
                setIsEditing(false);
                setQualityAssessment(null);
                setReport(null);
              }}
              className="px-4 py-3 bg-white text-text-main/70 border border-sage/20 rounded-xl font-medium hover:bg-sage/5 transition-all"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Report Result */}
          {report && (
            <ReportInline report={report} language={language} setCurrentPage={setCurrentPage} />
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
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-sage/20">
                    <p className="text-[10px] text-text-main/50 font-medium uppercase tracking-wider mb-1">
                      {language === 'hi' ? 'स्रोत:' : 'Sources:'}
                    </p>
                    {msg.sources.map((src, j) => (
                      <p key={j} className="text-xs text-emerald-deep">
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
            <p className="text-xs text-text-main/50 mb-2">
              {language === 'hi' ? 'सुझाए गए प्रश्न:' : 'Suggested questions:'}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {suggestedQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(q)}
                  className="text-xs px-3 py-1.5 bg-ivory border border-sage/20 rounded-full text-text-main/70 hover:border-emerald-deep/30 hover:text-emerald-deep transition-all"
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
              className="flex-1 px-4 py-2.5 border border-sage/30 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-deep/20 focus:border-emerald-deep/40"
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim()}
              className="px-4 py-2.5 bg-emerald-deep text-white rounded-xl hover:bg-emerald-light transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <p className="text-[10px] text-text-main/40 mt-2 text-center">
            {SHORT_DISCLAIMER}
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
              ? 'MedVerify एक डेमो/हैकाथॉन ऐप्लिकेशन है और इसे चिकित्सा उपयोग के लिए नहीं बनाया गया है।'
              : 'MedVerify is a demo/hackathon application and is not intended for clinical medical use.'}
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
