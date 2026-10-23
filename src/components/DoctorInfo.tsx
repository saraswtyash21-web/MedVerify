import { useState } from 'react';
import { AlertCircle, BookOpen, ExternalLink, Info, Loader2, Search } from 'lucide-react';
import { config } from '../config';
import { searchDailyMed, type MedicineInfo } from '../lib/dailyMed';

type Language = 'en' | 'hi';
type Source = 'eka' | 'dailymed';

interface EkaMedicine {
  name: string;
  generic_name?: string | null;
  manufacturer_name?: string | null;
  product_type?: string | null;
}

interface EkaSearchResult {
  found: boolean;
  medicines: EkaMedicine[];
  message?: string;
}

interface DoctorInfoProps {
  language: Language;
}

async function searchEka(query: string): Promise<EkaSearchResult> {
  const response = await fetch(`/api/eka-medications?q=${encodeURIComponent(query)}`, {
    headers: { Accept: 'application/json' },
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.message || 'Eka medication search is unavailable.');
  }
  return result as EkaSearchResult;
}

export function DoctorInfo({ language }: DoctorInfoProps) {
  const [source, setSource] = useState<Source>('eka');
  const [query, setQuery] = useState('');
  const [ekaResults, setEkaResults] = useState<EkaMedicine[]>([]);
  const [dailymedResults, setDailymedResults] = useState<MedicineInfo[]>([]);
  const [selectedEka, setSelectedEka] = useState<EkaMedicine | null>(null);
  const [selectedDailyMed, setSelectedDailyMed] = useState<MedicineInfo | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    const medicineName = query.trim();
    if (!medicineName || loading) return;
    setLoading(true);
    setError('');
    setSearched(true);
    setEkaResults([]);
    setDailymedResults([]);
    setSelectedEka(null);
    setSelectedDailyMed(null);

    try {
      if (source === 'eka') {
        const result = await searchEka(medicineName);
        if (result.found && result.medicines.length) {
          setEkaResults(result.medicines);
          if (result.medicines.length === 1) setSelectedEka(result.medicines[0]);
        } else {
          setError(result.message || (language === 'hi' ? 'कोई दवा नहीं मिली।' : 'No medicine was found.'));
        }
      } else {
        const result = await searchDailyMed(medicineName);
        if (result.found && result.medicines?.length) {
          setDailymedResults(result.medicines);
          if (result.medicines.length === 1) setSelectedDailyMed(result.medicines[0]);
        } else {
          setError(result.message);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : (language === 'hi' ? 'दवा खोजने में त्रुटि हुई।' : 'Medicine search failed.'));
    } finally {
      setLoading(false);
    }
  };

  if (!config.doctorInfo.enabled) {
    return (
      <div className="bg-ivory rounded-xl p-6 border border-sage/20">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-gold flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-charcoal mb-2">{language === 'hi' ? 'डॉक्टर जानकारी उपलब्ध नहीं' : 'Doctor Information Not Available'}</h3>
            <p className="text-sm text-text-main/70">{config.doctorInfo.notes}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-emerald-deep text-white rounded-xl p-4">
        <div className="flex items-start gap-3">
          <BookOpen className="w-6 h-6 flex-shrink-0 mt-0.5" />
          <div>
            <h2 className="text-xl font-bold mb-1">{language === 'hi' ? 'डॉक्टर दवा जानकारी' : 'Doctor Medicine Information'}</h2>
            <p className="text-sm text-sage-light">{language === 'hi' ? 'स्वास्थ्य देखभाल पेशेवरों के लिए दवा जानकारी' : 'Medicine information for healthcare professionals'}</p>
          </div>
        </div>
      </div>

      <section className="bg-white rounded-xl p-4 border border-sage/20">
        <label className="block text-sm font-medium text-charcoal mb-2">{language === 'hi' ? 'डेटा स्रोत चुनें' : 'Select Data Source'}</label>
        <div className="flex gap-2">
          {(['eka', 'dailymed'] as const).map((option) => (
            <button key={option} onClick={() => { setSource(option); setError(''); setSearched(false); setEkaResults([]); setDailymedResults([]); setSelectedEka(null); setSelectedDailyMed(null); }}
              className={`flex-1 px-4 py-2 rounded-lg border transition-colors ${source === option ? 'bg-emerald-deep text-white border-emerald-deep' : 'bg-white text-charcoal border-sage/30 hover:border-emerald-deep/50'}`}>
              <span className="font-medium">{option === 'eka' ? 'Eka Care' : 'DailyMed'}</span>
              <span className="ml-2 text-xs opacity-75">({option === 'eka' ? (language === 'hi' ? 'भारत' : 'India') : 'U.S.'})</span>
            </button>
          ))}
        </div>
        <div className="mt-3 p-3 bg-ivory rounded-lg border border-sage/20 flex items-start gap-2">
          <Info className="w-4 h-4 text-gold flex-shrink-0 mt-0.5" />
          <p className="text-xs text-text-main/70">
            {source === 'eka'
              ? (language === 'hi' ? 'Eka Care की दवा डेटाबेस खोज। यह दवा की पहचान में मदद करती है; यह सुरक्षा/बैन अलर्ट जाँच नहीं है।' : 'Searches Eka Care’s medication database. It helps identify medicines; it does not check safety or ban alerts.')
              : (language === 'hi' ? 'DailyMed यू.एस. दवा लेबल का स्रोत है; भारतीय ब्रांड इसमें शामिल न हों।' : 'DailyMed provides U.S. medicine labels and may not include Indian brands.')}
          </p>
        </div>
      </section>

      <section className="bg-white rounded-xl p-4 border border-sage/20">
        <label htmlFor="doctor-medicine-search" className="block text-sm font-medium text-charcoal mb-2">{language === 'hi' ? 'दवा का नाम खोजें' : 'Search Medicine Name'}</label>
        <div className="flex gap-2">
          <input id="doctor-medicine-search" type="text" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && handleSearch()}
            placeholder={source === 'eka' ? 'e.g., Dolo, Paracetamol, Cipla' : 'e.g., Acetaminophen, Ibuprofen'} disabled={loading}
            className="flex-1 px-4 py-2 border border-sage/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-deep/20 focus:border-emerald-deep/40" />
          <button onClick={handleSearch} disabled={loading || !query.trim()} className="px-6 py-2 bg-emerald-deep text-white rounded-lg hover:bg-emerald-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" />{language === 'hi' ? 'खोज रहे हैं...' : 'Searching...'}</> : <><Search className="w-4 h-4" />{language === 'hi' ? 'खोजें' : 'Search'}</>}
          </button>
        </div>
        <p className="text-xs text-text-main/60 mt-2">{language === 'hi' ? 'ब्रांड नाम या जेनेरिक नाम दर्ज करें' : 'Enter a brand name or generic name'}</p>
      </section>

      {loading && <div className="bg-ivory rounded-xl p-6 border border-sage/20 text-center"><Loader2 className="w-8 h-8 text-emerald-deep animate-spin mx-auto mb-2" /><p className="text-sm text-text-main/70">{language === 'hi' ? 'दवा की जानकारी खोजी जा रही है...' : `Searching ${source === 'eka' ? 'Eka Care' : 'DailyMed'}...`}</p></div>}

      {error && !loading && <div className="bg-warning-light rounded-xl p-4 border border-warning/20 flex items-start gap-3"><AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" /><div><p className="text-sm font-medium text-warning mb-1">{language === 'hi' ? 'जानकारी उपलब्ध नहीं' : 'Information Not Available'}</p><p className="text-sm text-text-main/70">{error}</p></div></div>}

      {source === 'eka' && ekaResults.length > 1 && !selectedEka && !loading && (
        <section className="bg-white rounded-xl p-4 border border-sage/20"><h3 className="font-semibold text-charcoal mb-3">{language === 'hi' ? 'मिलते-जुलते परिणाम चुनें' : 'Choose a matching result'}</h3><div className="space-y-2">{ekaResults.map((medicine, index) => <button key={`${medicine.name}-${index}`} onClick={() => setSelectedEka(medicine)} className="w-full text-left p-3 bg-ivory hover:bg-sage/10 border border-sage/20 rounded-lg"><p className="font-medium text-charcoal">{medicine.name}</p><p className="text-xs text-text-main/60 mt-1">{[medicine.generic_name, medicine.manufacturer_name, medicine.product_type].filter(Boolean).join(' • ')}</p></button>)}</div></section>
      )}

      {source === 'eka' && selectedEka && !loading && (
        <section className="bg-white rounded-xl p-4 border border-sage/20 space-y-4">
          {ekaResults.length > 1 && <button onClick={() => setSelectedEka(null)} className="text-sm text-emerald-deep hover:underline">← {language === 'hi' ? 'अन्य परिणाम देखें' : 'View other results'}</button>}
          <h3 className="font-bold text-charcoal text-lg flex items-center gap-2"><BookOpen className="w-5 h-5 text-emerald-deep" />{selectedEka.name}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {selectedEka.generic_name && <div><p className="text-xs font-medium text-text-main/60 uppercase">{language === 'hi' ? 'जेनेरिक नाम' : 'Generic Name'}</p><p className="text-sm text-charcoal">{selectedEka.generic_name}</p></div>}
            {selectedEka.manufacturer_name && <div><p className="text-xs font-medium text-text-main/60 uppercase">{language === 'hi' ? 'निर्माता' : 'Manufacturer'}</p><p className="text-sm text-charcoal">{selectedEka.manufacturer_name}</p></div>}
            {selectedEka.product_type && <div><p className="text-xs font-medium text-text-main/60 uppercase">{language === 'hi' ? 'उत्पाद प्रकार' : 'Product Type'}</p><p className="text-sm text-charcoal">{selectedEka.product_type}</p></div>}
          </div>
          <p className="text-xs text-text-main/60">{language === 'hi' ? 'स्रोत: Eka Care दवा डेटाबेस। यह परिणाम दवा की पहचान में मदद करता है; यह चिकित्सा सलाह या सुरक्षा सत्यापन नहीं है।' : 'Source: Eka Care medication database. This result helps identify a medicine; it is not medical advice or a safety verification.'}</p>
        </section>
      )}

      {source === 'dailymed' && dailymedResults.length > 1 && !selectedDailyMed && !loading && (
        <section className="bg-white rounded-xl p-4 border border-sage/20"><h3 className="font-semibold text-charcoal mb-3">{language === 'hi' ? 'मिलते-जुलते परिणाम चुनें' : 'Choose a matching result'}</h3><div className="space-y-2">{dailymedResults.map((medicine, index) => <button key={`${medicine.source.setId}-${index}`} onClick={() => setSelectedDailyMed(medicine)} className="w-full text-left p-3 bg-ivory hover:bg-sage/10 border border-sage/20 rounded-lg"><p className="font-medium text-charcoal">{medicine.brandName || medicine.genericName}</p><p className="text-xs text-text-main/60 mt-1">{[...medicine.dosageForms, ...medicine.routes].join(' • ')}</p></button>)}</div></section>
      )}

      {source === 'dailymed' && selectedDailyMed && !loading && (
        <section className="bg-white rounded-xl p-4 border border-sage/20 space-y-4">
          {dailymedResults.length > 1 && <button onClick={() => setSelectedDailyMed(null)} className="text-sm text-emerald-deep hover:underline">← {language === 'hi' ? 'अन्य परिणाम देखें' : 'View other results'}</button>}
          <h3 className="font-bold text-charcoal text-lg flex items-center gap-2"><BookOpen className="w-5 h-5 text-emerald-deep" />{selectedDailyMed.brandName || selectedDailyMed.genericName}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3"><div><p className="text-xs font-medium text-text-main/60 uppercase">{language === 'hi' ? 'जेनेरिक नाम' : 'Generic Name'}</p><p className="text-sm text-charcoal">{selectedDailyMed.genericName}</p></div>{selectedDailyMed.dosageForms.length > 0 && <div><p className="text-xs font-medium text-text-main/60 uppercase">{language === 'hi' ? 'खुराक रूप' : 'Dosage Forms'}</p><p className="text-sm text-charcoal">{selectedDailyMed.dosageForms.join(', ')}</p></div>}</div>
          {selectedDailyMed.activeIngredients.length > 0 && <div><h4 className="font-semibold text-charcoal mb-2">{language === 'hi' ? 'सक्रिय तत्व' : 'Active Ingredients'}</h4>{selectedDailyMed.activeIngredients.map((ingredient, index) => <p key={index} className="text-sm text-charcoal">{ingredient.name} — {ingredient.strength} {ingredient.unit}</p>)}</div>}
          {selectedDailyMed.warnings?.length ? <div className="bg-warning-light rounded-xl p-3"><h4 className="font-semibold text-warning mb-1">{language === 'hi' ? 'चेतावनी' : 'Warnings'}</h4><ul className="list-disc list-inside">{selectedDailyMed.warnings.slice(0, 8).map((warning, index) => <li key={index} className="text-sm text-text-main/70">{warning}</li>)}</ul></div> : null}
          {selectedDailyMed.indications?.length ? <div><h4 className="font-semibold text-charcoal mb-1">{language === 'hi' ? 'उपयोग' : 'Indications'}</h4><ul className="list-disc list-inside">{selectedDailyMed.indications.slice(0, 8).map((indication, index) => <li key={index} className="text-sm text-text-main/70">{indication}</li>)}</ul></div> : null}
          <a href={selectedDailyMed.source.url} target="_blank" rel="noopener noreferrer" className="text-emerald-deep hover:underline inline-flex items-center gap-1 text-sm">{language === 'hi' ? 'DailyMed पर पूरा लेबल देखें' : 'View full label on DailyMed'} <ExternalLink className="w-3 h-3" /></a>
          <p className="text-xs text-text-main/60">{language === 'hi' ? 'DailyMed में यू.एस. दवा लेबल हैं; भारतीय दवाएं शामिल न हों।' : 'DailyMed contains U.S. medicine labels and may not include Indian medicines.'}</p>
        </section>
      )}

      {!searched && !loading && <div className="bg-ivory rounded-xl p-6 border border-sage/20 text-center"><BookOpen className="w-12 h-12 text-sage mx-auto mb-3" /><p className="text-sm text-text-main/70">{language === 'hi' ? 'दवा की जानकारी देखने के लिए नाम खोजें' : 'Search for a medicine name to view information'}</p></div>}
    </div>
  );
}
