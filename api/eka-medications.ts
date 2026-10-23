import type { VercelRequest, VercelResponse } from '@vercel/node';
import { searchEkaMedications } from '../server/ekaMedications.js';

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ message: 'Only GET requests are supported.' });
  }

  try {
    const result = await searchEkaMedications(request.query.q);
    response.setHeader('Cache-Control', 'private, no-store');
    return response.status(200).json(result);
  } catch (error) {
    const statusCode = Number((error as { statusCode?: number }).statusCode) || 503;
    const message = error instanceof Error ? error.message : 'Eka medication search is unavailable.';
    return response.status(statusCode).json({ found: false, medicines: [], message });
  }
}
