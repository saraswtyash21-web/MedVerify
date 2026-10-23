// MedVerify Dashboard
// Shows after sign-in with quick access to scanning features

import { useAuth } from '../contexts';
import { VerificationReport, formatOutcome } from '../utils/verification';
import { 
  Shield, Camera, MessageCircle, Clock, User, LogOut, 
  ChevronRight, Search, Heart, FileText
} from 'lucide-react';

type Language = 'en' | 'hi';
type Page = 'home' | 'scan' | 'report' | 'assistant' | 'safety' | 'dashboard';

interface DashboardProps {
  language: Language;
  setCurrentPage: (page: Page) => void;
  scanHistory: { id: string; timestamp: string; productName: string; outcome: string; report: VerificationReport }[];
  setCurrentReport: (report: VerificationReport) => void;
}

export function Dashboard({ language, setCurrentPage, scanHistory, setCurrentReport }: DashboardProps) {
  const { user, signOut } = useAuth();
  const isHi = language === 'hi';

  return (
    <div className="animate-fade-in max-w-5xl mx-auto">
      {/* Welcome Header */}
      <div className="bg-white rounded-2xl border border-sage/20 p-5 md:p-6 mb-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-deep/10 rounded-xl flex items-center justify-center">
              <User className="w-6 h-6 text-emerald-deep" />
            </div>
            <div>
              <h2 className="font-display text-xl md:text-2xl font-bold text-charcoal">
                {isHi ? `नमस्ते, ${user?.name || 'उपयोगकर्ता'}` : `Hello, ${user?.name || 'User'}`}
              </h2>
              <p className="text-sm text-text-main/60">
                {isHi ? 'आज अपनी दवाओं की जांच करें' : 'Check your medicines today'}
              </p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="flex items-center gap-2 px-4 py-2 text-sm text-text-main/60 hover:text-warning border border-sage/20 rounded-xl hover:border-warning/20 transition-all"
            aria-label={isHi ? 'साइन आउट करें' : 'Sign out'}
          >
            <LogOut className="w-4 h-4" />
            {isHi ? 'साइन आउट' : 'Sign Out'}
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <button
          onClick={() => setCurrentPage('scan')}
          className="group bg-emerald-deep text-white rounded-2xl p-5 md:p-6 text-left hover:bg-emerald-light transition-all shadow-lg shadow-emerald-deep/10 hover:shadow-xl"
        >
          <Camera className="w-8 h-8 text-gold mb-3" />
          <h3 className="font-semibold text-lg mb-1">
            {isHi ? 'दवा स्कैन करें' : 'Scan Medicine'}
          </h3>
          <p className="text-sm text-white/70">
            {isHi 
              ? 'दवा पैकेजिंग की फोटो अपलोड करें और OCR के साथ जानकारी निकालें।'
              : 'Upload a medicine packaging photo and extract info with OCR.'}
          </p>
          <div className="flex items-center gap-1 mt-3 text-sm font-medium text-gold group-hover:gap-2 transition-all">
            {isHi ? 'शुरू करें' : 'Start scan'}
            <ChevronRight className="w-4 h-4" />
          </div>
        </button>

        <button
          onClick={() => setCurrentPage('assistant')}
          className="group bg-white border border-sage/20 rounded-2xl p-5 md:p-6 text-left hover:border-emerald-deep/30 hover:shadow-md transition-all"
        >
          <MessageCircle className="w-8 h-8 text-emerald-deep mb-3" />
          <h3 className="font-semibold text-lg text-charcoal mb-1">
            {isHi ? 'स्वास्थ्य सहायक' : 'Health Assistant'}
          </h3>
          <p className="text-sm text-text-main/60">
            {isHi 
              ? 'दवा जानकारी और सुरक्षा के बारे में प्रश्न पूछें।'
              : 'Ask questions about medicine info and safety.'}
          </p>
          <div className="flex items-center gap-1 mt-3 text-sm font-medium text-emerald-deep group-hover:gap-2 transition-all">
            {isHi ? 'चैट करें' : 'Open chat'}
            <ChevronRight className="w-4 h-4" />
          </div>
        </button>

        <button
          onClick={() => setCurrentPage('safety')}
          className="group bg-white border border-sage/20 rounded-2xl p-5 md:p-6 text-left hover:border-gold/40 hover:shadow-md transition-all sm:col-span-2 lg:col-span-1"
        >
          <Shield className="w-8 h-8 text-gold mb-3" />
          <h3 className="font-semibold text-lg text-charcoal mb-1">
            {isHi ? 'सुरक्षा गाइड' : 'Safety Guide'}
          </h3>
          <p className="text-sm text-text-main/60">
            {isHi 
              ? 'MedVerify की क्षमताओं और सीमाओं को समझें।'
              : 'Understand MedVerify capabilities and limits.'}
          </p>
          <div className="flex items-center gap-1 mt-3 text-sm font-medium text-gold group-hover:gap-2 transition-all">
            {isHi ? 'देखें' : 'View guide'}
            <ChevronRight className="w-4 h-4" />
          </div>
        </button>
      </div>

      {/* Recent Scans - Only show if real data exists */}
      <div className="bg-white rounded-2xl border border-sage/20 p-5 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-charcoal flex items-center gap-2">
            <Clock className="w-5 h-5 text-gold" />
            {isHi ? 'हाल के स्कैन' : 'Recent Scans'}
          </h3>
          {scanHistory.length > 0 && (
            <span className="text-xs text-text-main/50 bg-ivory px-2 py-1 rounded-full">
              {scanHistory.length} {isHi ? 'स्कैन' : scanHistory.length === 1 ? 'scan' : 'scans'}
            </span>
          )}
        </div>

        {scanHistory.length === 0 ? (
          <div className="text-center py-8">
            <Search className="w-10 h-10 text-sage mx-auto mb-3" />
            <p className="text-sm text-text-main/60 mb-4">
              {isHi 
                ? 'इस सेशन में अभी तक कोई स्कैन नहीं है। अपनी पहली दवा स्कैन करें।'
                : 'No scans in this session yet. Scan your first medicine to get started.'}
            </p>
            <button
              onClick={() => setCurrentPage('scan')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-deep text-white rounded-xl text-sm font-medium hover:bg-emerald-light transition-all"
            >
              <Camera className="w-4 h-4" />
              {isHi ? 'पहला स्कैन करें' : 'Start first scan'}
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {scanHistory.slice(0, 5).map(scan => {
              const outcomeInfo = formatOutcome(scan.outcome as any);
              return (
                <button
                  key={scan.id}
                  onClick={() => { setCurrentReport(scan.report); setCurrentPage('report'); }}
                  className="w-full flex items-center justify-between bg-ivory/50 hover:bg-ivory rounded-xl p-3 border border-sage/10 hover:border-sage/30 transition-all text-left group"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg" aria-hidden="true">{outcomeInfo.icon}</span>
                    <div>
                      <p className="font-medium text-charcoal text-sm">{scan.productName || (isHi ? 'अज्ञात उत्पाद' : 'Unknown product')}</p>
                      <p className="text-xs text-text-main/50">
                        {new Date(scan.timestamp).toLocaleString('en-IN')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      scan.outcome === 'ALERT_MATCH_FOUND' ? 'bg-warning-light text-warning' :
                      scan.outcome === 'NO_ALERT_FOUND' ? 'bg-positive-light text-positive' :
                      'bg-ivory text-gold'
                    }`}>
                      {scan.outcome === 'ALERT_MATCH_FOUND' ? (isHi ? 'अलर्ट' : 'Alert') :
                       scan.outcome === 'NO_ALERT_FOUND' ? (isHi ? 'कोई अलर्ट नहीं' : 'No alert') :
                       (isHi ? 'अनिश्चित' : 'Uncertain')}
                    </span>
                    <ChevronRight className="w-4 h-4 text-text-main/30 group-hover:text-text-main/60 transition-colors" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Safety Reminder */}
      <div className="mt-6 bg-gold/5 border border-gold/20 rounded-2xl p-4 flex items-start gap-3">
        <Heart className="w-5 h-5 text-gold mt-0.5 flex-shrink-0" />
        <p className="text-sm text-text-main/70 leading-relaxed">
          {isHi 
            ? 'याद रखें: MedVerify केवल सूचनात्मक जांच प्रदान करता है। यह दवा की प्रामाणिकता या सुरक्षा की गारंटी नहीं दे सकता। चिंताओं के लिए, एक योग्य फार्मासिस्ट या संबंधित आधिकारिक प्राधिकरण से परामर्श करें।'
            : 'Remember: MedVerify provides informational checks only. It cannot certify medicine authenticity or guarantee safety. For concerns, consult a qualified pharmacist or the relevant official authority.'}
        </p>
      </div>
    </div>
  );
}
