import type { VercelRequest, VercelResponse } from '@vercel/node';
import { searchIndianMedicines } from '../server/indiaMedicineSearch.js';

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ message: 'Only GET requests are supported.' });
  }

  try {
    const result = await searchIndianMedicines(request.query.q);
    response.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
    return response.status(200).json(result);
  } catch (error) {
    const statusCode = Number((error as { statusCode?: number }).statusCode) || 502;
    const message = error instanceof Error ? error.message : 'Indian medicine search is unavailable.';
    return response.status(statusCode).json({ medicines: [], message });
  }
}
