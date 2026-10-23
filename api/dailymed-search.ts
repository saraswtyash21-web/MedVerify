import type { VercelRequest, VercelResponse } from '@vercel/node';

const DAILYMED_BASE_URL = 'https://dailymed.nlm.nih.gov/dailymed/services/v2';
const SET_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ error: 'METHOD_NOT_ALLOWED', message: 'Only GET requests are supported.' });
  }

  const query = typeof request.query.q === 'string' ? request.query.q.trim() : '';
  const setId = typeof request.query.setid === 'string' ? request.query.setid.trim() : '';

  if (query && setId) {
    return response.status(400).json({ error: 'INVALID_REQUEST', message: 'Provide either q or setid, not both.' });
  }

  if (setId) {
    if (!SET_ID_PATTERN.test(setId)) {
      return response.status(400).json({ error: 'INVALID_SET_ID', message: 'The DailyMed label ID is invalid.' });
    }

    try {
      // DailyMed documents the full SPL resource as XML (the JSON variant returns 415).
      const upstream = await fetch(`${DAILYMED_BASE_URL}/spls/${setId}.xml`, {
        signal: AbortSignal.timeout(12000),
      });
      if (!upstream.ok) {
        return response.status(upstream.status === 404 ? 404 : 502).json({
          error: 'DAILYMED_LABEL_UNAVAILABLE',
          message: 'DailyMed could not return this medicine label.',
        });
      }
      const xml = await upstream.text();
      if (!xml.includes('<document')) {
        return response.status(502).json({ error: 'INVALID_DAILYMED_RESPONSE', message: 'DailyMed returned an unreadable label.' });
      }
      response.setHeader('Content-Type', 'application/xml; charset=utf-8');
      response.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
      return response.status(200).send(xml);
    } catch {
      return response.status(502).json({ error: 'DAILYMED_UNAVAILABLE', message: 'DailyMed is temporarily unavailable.' });
    }
  }

  if (!query || query.length > 100) {
    return response.status(400).json({ error: 'INVALID_QUERY', message: 'Enter a medicine name up to 100 characters.' });
  }

  try {
    const url = new URL(`${DAILYMED_BASE_URL}/spls.json`);
    url.searchParams.set('drug_name', query);
    url.searchParams.set('pagesize', '10');
    const upstream = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(12000),
    });
    if (!upstream.ok) {
      return response.status(502).json({ error: 'DAILYMED_SEARCH_FAILED', message: 'DailyMed search is temporarily unavailable.' });
    }
    const data = await upstream.json();
    response.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
    return response.status(200).json(data);
  } catch {
    return response.status(502).json({ error: 'DAILYMED_UNAVAILABLE', message: 'Could not connect to DailyMed. Please try again.' });
  }
}
