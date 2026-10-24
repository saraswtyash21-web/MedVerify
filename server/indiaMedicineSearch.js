const SEARCH_ORIGIN = 'https://drugdb.in';
const MAX_RESULTS = 99;

function asText(value) {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const key of ['name', 'medicineName', 'genericName', 'manufacturerName', 'value', 'label', 'term', 'display']) {
      const candidate = value[key];
      if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
    }
  }
  return undefined;
}

function normalizeMedicines(payload) {
  const root = payload && typeof payload === 'object' ? payload : {};
  const records = Array.isArray(payload)
    ? payload
    : ['results', 'data', 'items', 'content', 'medicines'].map(key => root[key]).find(Array.isArray) || [];

  return records.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
    const brand = item.brand && typeof item.brand === 'object' ? item.brand : {};
    const generic = item.generic && typeof item.generic === 'object' ? item.generic : {};
    const manufacturer = item.manufacturer && typeof item.manufacturer === 'object' ? item.manufacturer : {};
    const name = asText(item.medicineName) || asText(item.name) || asText(item.label) || asText(item.title) || asText(brand.name);
    if (!name) return [];
    return [{
      name,
      genericName: asText(item['generic.genericName']) || asText(item.genericName) || asText(item.generic_name) || asText(generic.genericName) || asText(generic.name),
      manufacturer: asText(item['manufacturer.manufacturerName']) || asText(item.manufacturerName) || asText(item.manufacturer_name) || asText(manufacturer.manufacturerName) || asText(manufacturer.name),
    }];
  });
}

export async function searchIndianMedicines(query) {
  const cleanQuery = typeof query === 'string' ? query.trim() : '';
  if (cleanQuery.length < 2 || cleanQuery.length > 100) {
    const error = new Error('Enter a medicine name between 2 and 100 characters.');
    error.statusCode = 400;
    throw error;
  }

  const url = new URL('/search', SEARCH_ORIGIN);
  url.searchParams.set('q', cleanQuery);
  url.searchParams.set('type', 'medicine');
  url.searchParams.set('limit', String(MAX_RESULTS));

  try {
    const upstream = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10000),
    });
    if (!upstream.ok) throw new Error('UPSTREAM_ERROR');
    if (!(upstream.headers.get('content-type') || '').toLowerCase().includes('json')) throw new Error('INVALID_RESPONSE');
    const payload = await upstream.json();
    const medicines = normalizeMedicines(payload).slice(0, MAX_RESULTS);
    return {
      medicines,
      source: 'Common Drug Codes for India, NRCeS at C-DAC Pune; search service: HealthPilot.ai',
      sourceUrl: 'https://drugdb.in/',
      attribution: 'Common Drug Codes for India (NRCeS/C-DAC Pune). Content used under CC BY 4.0 where applicable; brand and trade names belong to their respective owners.',
      totalMatches: Number.isFinite(Number(payload?.total)) ? Number(payload.total) : undefined,
      message: medicines.length ? undefined : 'No matching Indian medicine records were returned. Try the generic name or a shorter spelling.',
    };
  } catch (cause) {
    console.error('Indian medicine catalogue upstream request failed:', cause);
    const timedOut = cause instanceof Error && cause.name === 'TimeoutError';
    const error = new Error(timedOut
      ? 'The Indian medicine catalogue took too long to respond. Please try again.'
      : 'The Indian medicine catalogue is temporarily unavailable. Please try again shortly.');
    error.statusCode = 502;
    throw error;
  }
}
