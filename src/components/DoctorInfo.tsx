import { useState } from 'react';
import { AlertCircle, BookOpen, ExternalLink, Info, Loader2, Search } from 'lucide-react';
import { searchDailyMed, type MedicineInfo } from '../lib/dailyMed';

type Language = 'en' | 'hi';
type Source = 'india' | 'dailymed';

interface IndianMedicine {
  name: string;
  genericName?: string;
  manufacturer?: string;
}

interface SearchResult {
  medicines: IndianMedicine[];
  totalMatches?: number;
  message?: string;
}

interface DoctorInfoProps {
  language: Language;
}

async function searchIndianMedicines(query: string): Promise<SearchResult> {
  const response = await fetch(`/api/india-medicine-search?q=${encodeURIComponent(query)}`, {
    headers: { Accept: 'application/json' },
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.message || 'Indian medicine search is temporarily unavailable.');
  }
  return result as SearchResult;
}

export function DoctorInfo({ language }: DoctorInfoProps) {
  const [source, setSource] = useState<Source>('india');
  const [query, setQuery] = useState('');
  const [medicines, setMedicines] = useState<IndianMedicine[]>([]);
  const [totalMatches, setTotalMatches] = useState<number | null>(null);
  const [selected, setSelected] = useState<IndianMedicine | null>(null);
  const [dailyMedResults, setDailyMedResults] = useState<MedicineInfo[]>([]);
  const [selectedDailyMed, setSelectedDailyMed] = useState<MedicineInfo | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (requestedSource: Source = source) => {
    const medicineName = query.trim();
    if (medicineName.length < 2 || loading) return;
    setSource(requestedSource);
    setLoading(true);
    setError('');
    setSearched(true);
    setMedicines([]);
    setTotalMatches(null);
    setSelected(null);
    setDailyMedResults([]);
    setSelectedDailyMed(null);

    try {
      if (requestedSource === 'india') {
        const result = await searchIndianMedicines(medicineName);
        if (result.medicines.length) {
          setMedicines(result.medicines);
          setTotalMatches(result.totalMatches ?? result.medicines.length);
          if (result.medicines.length === 1) setSelected(result.medicines[0]);
        } else {
          setError(result.message || (language === 'hi' ? 'कोई मेल खाती दवा नहीं मिली।' : 'No matching medicine was found.'));
        }
      } else {
        const result = await searchDailyMed(medicineName);
        if (result.found && result.medicines?.length) {
          setDailyMedResults(result.medicines);
          if (result.medicines.length === 1) setSelectedDailyMed(result.medicines[0]);
        } else {
          setError(result.message || (language === 'hi' ? 'कोई मेल खाती दवा नहीं मिली।' : 'No matching medicine was found.'));
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : (language === 'hi' ? 'दवा खोजने में त्रुटि हुई।' : 'Medicine search failed.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-emerald-deep text-white rounded-xl p-4">
        <div className="flex items-start gap-3">
          <BookOpen className="w-6 h-6 flex-shrink-0 mt-0.5" />
          <div>
            <h2 className="text-xl font-bold mb-1">{source === 'india' ? (language === 'hi' ? 'भारत की दवा जानकारी' : 'Indian Medicine Information') : 'DailyMed — U.S. Drug Labels'}</h2>
            <p className="text-sm text-sage-light">{source === 'india' ? (language === 'hi' ? 'भारत की दवा सूची में ब्रांड, जेनेरिक नाम और निर्माता खोजें' : 'Search Indian medicine brands, generic names, and manufacturers') : (language === 'hi' ? 'अमेरिकी दवा लेबल के लिए बैकअप स्रोत' : 'Backup source for U.S. drug labels')}</p>
          </div>
        </div>
      </div>

      <section className="bg-white rounded-xl p-4 border border-sage/20">
        <div className="flex items-start gap-2 rounded-lg bg-ivory p-3 border border-sage/20">
          <Info className="w-4 h-4 text-gold flex-shrink-0 mt-0.5" />
          <p className="text-xs text-text-main/70">
            {language === 'hi'
              ? 'स्रोत: NRCeS/C-DAC का Common Drug Codes for India, HealthPilot.ai खोज सेवा के माध्यम से। यह सूची दवा पहचान के लिए है—यह प्रतिबंध, गुणवत्ता, असली होने या सुरक्षित उपयोग की पुष्टि नहीं करती।'
              : 'Source: Common Drug Codes for India from NRCeS/C-DAC, accessed through the HealthPilot.ai search service. This catalogue supports medicine identification; it does not verify bans, quality, authenticity, or safe use.'}
          </p>
        </div>
        <div className="mt-4 flex gap-2">
          {(['india', 'dailymed'] as const).map((option) => (
            <button key={option} onClick={() => { setSource(option); setError(''); setSearched(false); setMedicines([]); setSelected(null); setDailyMedResults([]); setSelectedDailyMed(null); }}
              className={`flex-1 rounded-lg border px-3 py-2 transition-colors ${source === option ? 'bg-emerald-deep text-white border-emerald-deep' : 'bg-white text-charcoal border-sage/30 hover:border-emerald-deep/50'}`}>
              <span className="font-medium">{option === 'india' ? (language === 'hi' ? 'भारतीय दवा सूची' : 'India catalog') : 'DailyMed'}</span>
              <span className="ml-2 text-xs opacity-75">{option === 'india' ? (language === 'hi' ? '(मुख्य)' : '(Primary)') : '(U.S. backup)'}</span>
            </button>
          ))}
        </div>
        {source === 'dailymed' && <p className="mt-2 text-xs text-text-main/60">{language === 'hi' ? 'DailyMed अमेरिकी लेबल डेटाबेस है; भारतीय ब्रांड इसमें न मिलें।' : 'DailyMed is a U.S. drug-label database and may not include Indian brands.'}</p>}
      </section>

      <section className="bg-white rounded-xl p-4 border border-sage/20">
        <label htmlFor="doctor-medicine-search" className="block text-sm font-medium text-charcoal mb-2">{language === 'hi' ? 'दवा का नाम खोजें' : 'Search Medicine Name'}</label>
        <div className="flex gap-2">
          <input id="doctor-medicine-search" type="text" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && handleSearch()}
            placeholder={source === 'india' ? 'e.g., Dolo, Paracetamol, Cipla' : 'e.g., Acetaminophen, Ibuprofen'} disabled={loading}
            className="flex-1 px-4 py-2 border border-sage/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-deep/20 focus:border-emerald-deep/40" />
          <button onClick={() => handleSearch()} disabled={loading || query.trim().length < 2} className="px-6 py-2 bg-emerald-deep text-white rounded-lg hover:bg-emerald-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" />{language === 'hi' ? 'खोज रहे हैं...' : 'Searching...'}</> : <><Search className="w-4 h-4" />{language === 'hi' ? 'खोजें' : 'Search'}</>}
          </button>
        </div>
        <p className="text-xs text-text-main/60 mt-2">{language === 'hi' ? 'ब्रांड, जेनेरिक नाम या निर्माता दर्ज करें' : 'Enter a brand name, generic name, or manufacturer'}</p>
      </section>

      {loading && <div className="bg-ivory rounded-xl p-6 border border-sage/20 text-center"><Loader2 className="w-8 h-8 text-emerald-deep animate-spin mx-auto mb-2" /><p className="text-sm text-text-main/70">{language === 'hi' ? 'दवा की जानकारी खोजी जा रही है...' : source === 'india' ? 'Searching the Indian medicine catalogue...' : 'Searching DailyMed (U.S.)...'}</p></div>}

      {error && !loading && <div className="bg-warning-light rounded-xl p-4 border border-warning/20 flex items-start gap-3"><AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" /><div><p className="text-sm font-medium text-warning mb-1">{language === 'hi' ? 'जानकारी उपलब्ध नहीं' : 'Information Not Available'}</p><p className="text-sm text-text-main/70">{error}</p>{source === 'india' && <button onClick={() => void handleSearch('dailymed')} className="mt-3 rounded-lg bg-white px-3 py-2 text-sm font-medium text-emerald-deep border border-sage/30 hover:border-emerald-deep/50">{language === 'hi' ? 'DailyMed बैकअप में कोशिश करें (यू.एस.)' : 'Try DailyMed backup (U.S.)'}</button>}</div></div>}

      {medicines.length > 1 && !selected && !loading && (
        <section className="bg-white rounded-xl p-4 border border-sage/20"><h3 className="font-semibold text-charcoal mb-1">{language === 'hi' ? 'सही दवा चुनें' : 'Choose a matching medicine'}</h3><p className="text-xs text-text-main/60 mb-3">{language === 'hi' ? `${medicines.length} परिणाम दिखाए गए${totalMatches && totalMatches > medicines.length ? ` · कुल ${totalMatches} मेल` : ''}` : `Showing ${medicines.length} results${totalMatches && totalMatches > medicines.length ? ` · ${totalMatches} total matches` : ''}`}</p><div className="space-y-2">{medicines.map((medicine, index) => <button key={`${medicine.name}-${medicine.manufacturer || ''}-${index}`} onClick={() => setSelected(medicine)} className="w-full text-left p-3 bg-ivory hover:bg-sage/10 border border-sage/20 rounded-lg"><p className="font-medium text-charcoal">{medicine.name}</p><p className="text-xs text-text-main/60 mt-1">{[medicine.genericName, medicine.manufacturer].filter(Boolean).join(' • ')}</p></button>)}</div></section>
      )}

      {selected && !loading && (
        <section className="bg-white rounded-xl p-4 border border-sage/20 space-y-4">
          {medicines.length > 1 && <button onClick={() => setSelected(null)} className="text-sm text-emerald-deep hover:underline">← {language === 'hi' ? 'अन्य परिणाम देखें' : 'View other results'}</button>}
          <h3 className="font-bold text-charcoal text-lg flex items-center gap-2"><BookOpen className="w-5 h-5 text-emerald-deep" />{selected.name}</h3>
          {(selected.genericName || selected.manufacturer) && <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {selected.genericName && <div><p className="text-xs font-medium text-text-main/60 uppercase">{language === 'hi' ? 'जेनेरिक नाम' : 'Generic Name'}</p><p className="text-sm text-charcoal">{selected.genericName}</p></div>}
            {selected.manufacturer && <div><p className="text-xs font-medium text-text-main/60 uppercase">{language === 'hi' ? 'निर्माता' : 'Manufacturer'}</p><p className="text-sm text-charcoal">{selected.manufacturer}</p></div>}
          </div>}
          <a href="https://drugdb.in/" target="_blank" rel="noopener noreferrer" className="text-emerald-deep hover:underline inline-flex items-center gap-1 text-sm">{language === 'hi' ? 'मूल स्रोत खोलें' : 'Open source catalogue'} <ExternalLink className="w-3 h-3" /></a>
          <p className="text-xs text-text-main/60">{language === 'hi' ? 'यह जानकारी संदर्भ के लिए है। दवा लेने या बदलने से पहले डॉक्टर या फार्मासिस्ट से सलाह लें।' : 'Reference information only. Consult a doctor or pharmacist before starting or changing a medicine.'}</p>
        </section>
      )}

      {dailyMedResults.length > 1 && !selectedDailyMed && !loading && (
        <section className="bg-white rounded-xl p-4 border border-sage/20"><h3 className="font-semibold text-charcoal mb-3">{language === 'hi' ? 'मिलते-जुलते परिणाम चुनें' : 'Choose a matching DailyMed label'}</h3><div className="space-y-2">{dailyMedResults.map((medicine, index) => <button key={`${medicine.source.setId}-${index}`} onClick={() => setSelectedDailyMed(medicine)} className="w-full text-left p-3 bg-ivory hover:bg-sage/10 border border-sage/20 rounded-lg"><p className="font-medium text-charcoal">{medicine.brandName || medicine.genericName}</p><p className="text-xs text-text-main/60 mt-1">{[medicine.genericName, ...medicine.dosageForms, ...medicine.routes].filter(Boolean).join(' • ')}</p></button>)}</div></section>
      )}

      {selectedDailyMed && !loading && (
        <section className="bg-white rounded-xl p-4 border border-sage/20 space-y-4">
          {dailyMedResults.length > 1 && <button onClick={() => setSelectedDailyMed(null)} className="text-sm text-emerald-deep hover:underline">← {language === 'hi' ? 'अन्य परिणाम देखें' : 'View other results'}</button>}
          <h3 className="font-bold text-charcoal text-lg flex items-center gap-2"><BookOpen className="w-5 h-5 text-emerald-deep" />{selectedDailyMed.brandName || selectedDailyMed.genericName}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3"><div><p className="text-xs font-medium text-text-main/60 uppercase">{language === 'hi' ? 'जेनेरिक नाम' : 'Generic Name'}</p><p className="text-sm text-charcoal">{selectedDailyMed.genericName}</p></div>{selectedDailyMed.dosageForms.length > 0 && <div><p className="text-xs font-medium text-text-main/60 uppercase">{language === 'hi' ? 'खुराक रूप' : 'Dosage Forms'}</p><p className="text-sm text-charcoal">{selectedDailyMed.dosageForms.join(', ')}</p></div>}</div>
          {selectedDailyMed.activeIngredients.length > 0 && <div><h4 className="font-semibold text-charcoal mb-2">{language === 'hi' ? 'सक्रिय तत्व' : 'Active Ingredients'}</h4>{selectedDailyMed.activeIngredients.map((ingredient, index) => <p key={index} className="text-sm text-charcoal">{ingredient.name} — {ingredient.strength} {ingredient.unit}</p>)}</div>}
          {selectedDailyMed.warnings?.length ? <div className="bg-warning-light rounded-xl p-3"><h4 className="font-semibold text-warning mb-1">{language === 'hi' ? 'लेबल चेतावनियाँ' : 'Label Warnings'}</h4><ul className="list-disc list-inside">{selectedDailyMed.warnings.slice(0, 8).map((warning, index) => <li key={index} className="text-sm text-text-main/70">{warning}</li>)}</ul></div> : null}
          {selectedDailyMed.indications?.length ? <div><h4 className="font-semibold text-charcoal mb-1">{language === 'hi' ? 'लेबल में दिए उपयोग' : 'Label Indications'}</h4><ul className="list-disc list-inside">{selectedDailyMed.indications.slice(0, 8).map((indication, index) => <li key={index} className="text-sm text-text-main/70">{indication}</li>)}</ul></div> : null}
          <a href={selectedDailyMed.source.url} target="_blank" rel="noopener noreferrer" className="text-emerald-deep hover:underline inline-flex items-center gap-1 text-sm">{language === 'hi' ? 'DailyMed पर पूरा लेबल देखें' : 'View full U.S. label on DailyMed'} <ExternalLink className="w-3 h-3" /></a>
          <p className="text-xs text-text-main/60">{language === 'hi' ? 'स्रोत: DailyMed (NIH/NLM), अमेरिकी FDA लेबल। यह भारतीय उत्पाद की पुष्टि या चिकित्सा सलाह नहीं है।' : 'Source: DailyMed (NIH/NLM), U.S. drug labeling. This does not confirm an Indian product or provide medical advice.'}</p>
        </section>
      )}

      {!searched && !loading && <div className="bg-ivory rounded-xl p-6 border border-sage/20 text-center"><BookOpen className="w-12 h-12 text-sage mx-auto mb-3" /><p className="text-sm text-text-main/70">{language === 'hi' ? 'दवा की जानकारी देखने के लिए नाम खोजें' : 'Search for an Indian medicine to view catalogue information'}</p></div>}
    </div>
  );
}
