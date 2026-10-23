// DailyMed Medicine Information Service
// Source: https://dailymed.nlm.nih.gov/ (NIH/NLM official API)
// Provides comprehensive drug labeling information for healthcare professionals
// 
// IMPORTANT: DailyMed contains U.S. FDA-approved drug labels only.
// It may not contain Indian brands or international medications.

export interface MedicineInfo {
  // Basic identification
  brandName?: string;
  genericName: string;
  activeIngredients: Array<{
    name: string;
    strength: string;
    unit: string;
  }>;
  
  // Product details
  dosageForms: string[];
  routes: string[];
  ndcCodes?: string[];
  
  // Clinical information
  indications?: string[];
  contraindications?: string[];
  warnings?: string[];
  precautions?: string[];
  adverseReactions?: string[];
  drugInteractions?: string[];
  
  // Dosing (source-backed, not AI-generated)
  dosingInformation?: string;
  
  // Monitoring
  monitoringRequirements?: string[];
  
  // Source metadata
  source: {
    name: string;
    url: string;
    setId: string;
    lastUpdated: string;
  };
}

export interface DailyMedSearchResult {
  found: boolean;
  medicines?: MedicineInfo[];
  medicine?: MedicineInfo; // For backward compatibility
  message: string;
  error?: string;
  totalResults?: number;
}

// Search for drug by name and return multiple results
export async function searchDailyMed(drugName: string): Promise<DailyMedSearchResult> {
  try {
    const searchResponse = await fetch(`/api/dailymed-search?q=${encodeURIComponent(drugName)}`, {
      headers: { Accept: 'application/json' },
    });

    if (!searchResponse.ok) {
      const errorData = await searchResponse.json().catch(() => ({}));
      return {
        found: false,
        message: errorData.message || 'DailyMed search is temporarily unavailable. Please try again.',
        error: errorData.error || `HTTP ${searchResponse.status}`
      };
    }
    
    const searchData = await searchResponse.json();
    
    if (!searchData.data || searchData.data.length === 0) {
      return {
        found: false,
        message: `No medicine information found for "${drugName}" in DailyMed database. Note: DailyMed contains U.S. FDA-approved drug labels and may not include Indian brands or international medications.`,
        totalResults: 0
      };
    }
    
    // Step 2: Fetch full details for each SPL
    const medicines: MedicineInfo[] = [];
    const detailIssues: string[] = [];
    
    // Limit to first 5 results to avoid too many API calls
    const splsToFetch = searchData.data.slice(0, 5);
    
    for (const splMeta of splsToFetch) {
      const setid = splMeta.setid;
      if (typeof setid !== 'string' || !/^[0-9a-f-]{36}$/i.test(setid)) continue;
      
      try {
        // DailyMed's full SPL endpoint is XML. The old implementation requested
        // JSON here, which DailyMed rejects with HTTP 415.
        const splResponse = await fetch(`/api/dailymed-search?setid=${encodeURIComponent(setid)}`, {
        });
        
        if (splResponse.ok) {
          const xml = await splResponse.text();
          const medicine = parseSPLXml(xml, setid, splMeta);
          if (medicine.genericName || medicine.brandName || medicine.activeIngredients.length > 0) medicines.push(medicine);
          else detailIssues.push('The label did not contain readable medicine identity fields.');
        } else {
          detailIssues.push(`Label request failed (HTTP ${splResponse.status}).`);
        }
      } catch (err) {
        console.warn(`Failed to fetch SPL ${setid}:`, err);
        detailIssues.push(err instanceof Error ? err.message : 'Could not parse the DailyMed label.');
        // Continue with other results
      }
    }
    
    if (medicines.length === 0) {
      return {
        found: false,
        message: detailIssues[0]
          ? `DailyMed found a matching label but could not load its details: ${detailIssues[0]}`
          : 'DailyMed found matching labels but could not load their details. Please try again.',
        totalResults: searchData.data.length
      };
    }
    
    return {
      found: true,
      medicines,
      medicine: medicines[0], // For backward compatibility
      message: `Found ${medicines.length} medicine(s) in DailyMed (NIH/NLM). DailyMed contains U.S. FDA-approved drug labels.`,
      totalResults: searchData.data.length
    };
    
  } catch (error) {
    console.error('DailyMed API error:', error);
    return {
      found: false,
      message: 'Could not connect to DailyMed. Check your connection and try again.',
      error: error instanceof Error ? error.message : 'Unknown network error'
    };
  }
}

// Parse DailyMed's official XML SPL document in the browser. Keep the returned
// clinical sections tied to the exact label and source instead of generating advice.
function parseSPLXml(xml: string, setid: string, metadata: any): MedicineInfo {
  const document = new DOMParser().parseFromString(xml, 'application/xml');
  if (document.querySelector('parsererror')) throw new Error('DailyMed returned invalid XML');

  const elements = (root: ParentNode, localName: string): Element[] =>
    Array.from((root as Document | Element).getElementsByTagNameNS('*', localName));
  const textOf = (root: ParentNode, localName: string): string =>
    elements(root, localName)[0]?.textContent?.replace(/\s+/g, ' ').trim() || '';
  const productSection = elements(document, 'section').find((section) =>
    elements(section, 'code').some((code) => code.getAttribute('displayName')?.toLowerCase().includes('product data elements'))
  );
  const productWrappers = productSection ? elements(productSection, 'manufacturedProduct') : [];
  const product = productWrappers[1] || productWrappers[0];

  const genericName = product ? textOf(product, 'genericMedicine')
    ? textOf(elements(product, 'genericMedicine')[0], 'name')
    : '' : '';
  const brandName = product ? textOf(product, 'name') : '';
  const activeIngredients = product
    ? elements(product, 'ingredient').filter((ingredient) => ingredient.getAttribute('classCode') === 'ACTIB').map((ingredient) => {
      const numerator = elements(ingredient, 'numerator')[0];
      return {
        name: textOf(ingredient, 'ingredientSubstance')
          ? textOf(elements(ingredient, 'ingredientSubstance')[0], 'name')
          : '',
        strength: numerator?.getAttribute('value') || '',
        unit: numerator?.getAttribute('unit') || '',
      };
    }).filter((ingredient) => ingredient.name)
    : [];
  const dosageForms = product
    ? elements(product, 'formCode')
      .filter((form) => form.parentElement?.localName.toLowerCase() === 'manufacturedproduct')
      .map((form) => form.getAttribute('displayName') || '').filter(Boolean)
    : [];
  const routes = product
    ? elements(product, 'routeCode').map((route) => route.getAttribute('displayName') || '').filter(Boolean)
    : [];
  const sectionValues: Record<string, string[]> = {};
  for (const section of elements(document, 'section')) {
    const label = `${textOf(section, 'title')} ${elements(section, 'code').map((code) => code.getAttribute('displayName') || '').join(' ')}`.toLowerCase();
    const content = textOf(section, 'text');
    if (!content || section === productSection) continue;
    const add = (key: string) => { (sectionValues[key] ||= []).push(content.slice(0, 5000)); };
    if (label.includes('indication')) add('indications');
    if (label.includes('contraindication')) add('contraindications');
    if (label.includes('warning')) add('warnings');
    if (label.includes('precaution')) add('precautions');
    if (label.includes('adverse reaction')) add('adverseReactions');
    if (label.includes('drug interaction')) add('drugInteractions');
    if (label.includes('dosage') || label.includes('administration')) add('dosingInformation');
  }
  const title = typeof metadata.title === 'string' ? metadata.title : '';
  const publishedDate = typeof metadata.published_date === 'string' ? Date.parse(metadata.published_date) : NaN;

  const medicine: MedicineInfo = {
    brandName: brandName || undefined,
    genericName,
    activeIngredients,
    dosageForms: [...new Set(dosageForms)],
    routes: [...new Set(routes)],
    source: {
      name: 'DailyMed (NIH/NLM)',
      url: `https://dailymed.nlm.nih.gov/dailymed/drug-information.cfm?setid=${setid}`,
      setId: setid,
      lastUpdated: Number.isFinite(publishedDate) ? new Date(publishedDate).toISOString() : new Date().toISOString()
    }
  };
  Object.assign(medicine, sectionValues);
  if (sectionValues.dosingInformation?.length) medicine.dosingInformation = sectionValues.dosingInformation.join('\n\n');
  // Retain source title for records where a separate brand/generic name is absent.
  if (!medicine.brandName && !medicine.genericName && title) medicine.genericName = title;
  return medicine;
}

// Extract list items from HTML/text content
function extractListFromContent(content: string): string[] {
  if (!content) return [];
  
  // Remove HTML tags
  const text = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  
  // Split by common list delimiters
  const items = text
    .split(/[;•·]\s*|\.\s+(?=[A-Z])/)
    .map(item => item.trim())
    .filter(item => item.length > 5 && item.length < 500);
  
  return items.slice(0, 20); // Limit to 20 items
}

// Check if DailyMed service is available
export async function checkDailyMedAvailability(): Promise<boolean> {
  try {
    const response = await fetch('/api/dailymed-search?q=acetaminophen');
    return response.ok;
  } catch {
    return false;
  }
}
