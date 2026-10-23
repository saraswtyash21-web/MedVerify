let cachedToken = '';
let tokenExpiresAt = 0;

function requiredEnv(env) {
  if (!env.EKA_CLIENT_ID || !env.EKA_CLIENT_SECRET) {
    const error = new Error('Eka API credentials are not configured. Add EKA_CLIENT_ID and EKA_CLIENT_SECRET to the server environment.');
    error.statusCode = 503;
    throw error;
  }
}

async function getAccessToken(env) {
  requiredEnv(env);
  if (cachedToken && Date.now() < tokenExpiresAt - 60_000) return cachedToken;

  const body = {
    client_id: env.EKA_CLIENT_ID,
    client_secret: env.EKA_CLIENT_SECRET,
  };
  if (env.EKA_SHARING_KEY) body.sharing_key = env.EKA_SHARING_KEY;

  const response = await fetch('https://api.eka.care/connect-auth/v1/account/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(12_000),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || typeof result.access_token !== 'string') {
    const error = new Error('Eka authentication failed. Check the Eka credentials and sharing key.');
    error.statusCode = response.status === 401 || response.status === 403 ? 502 : 503;
    throw error;
  }
  cachedToken = result.access_token;
  tokenExpiresAt = Date.now() + (Number(result.expires_in) || 300) * 1000;
  return cachedToken;
}

export async function searchEkaMedications(query, env = process.env) {
  const cleanQuery = String(query || '').trim();
  if (!cleanQuery || cleanQuery.length > 100) {
    const error = new Error('Enter a medicine name up to 100 characters.');
    error.statusCode = 400;
    throw error;
  }

  const token = await getAccessToken(env);
  const baseUrl = String(env.EKA_API_BASE_URL || 'https://api.dev.eka.care').replace(/\/$/, '');
  const url = new URL(`${baseUrl}/eka-mcp/medications/v1/search`);
  url.searchParams.set('drug_name', cleanQuery);

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    signal: AbortSignal.timeout(12_000),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(response.status === 403
      ? 'Eka denied the medication search. Confirm that this API is enabled for your account.'
      : 'Eka medication search is temporarily unavailable. Please try again.');
    error.statusCode = response.status === 403 ? 502 : 503;
    throw error;
  }

  const rawItems = Array.isArray(payload) ? payload
    : Array.isArray(payload?.data) ? payload.data
      : Array.isArray(payload?.results) ? payload.results : [];
  const medicines = rawItems
    .filter((item) => item && typeof item.name === 'string' && item.name.trim())
    .slice(0, 20)
    .map((item) => ({
      name: item.name.trim(),
      generic_name: typeof item.generic_name === 'string' ? item.generic_name : null,
      manufacturer_name: typeof item.manufacturer_name === 'string' ? item.manufacturer_name : null,
      product_type: typeof item.product_type === 'string' ? item.product_type : null,
    }));

  return { found: medicines.length > 0, medicines, message: medicines.length ? undefined : `No Eka medication results found for “${cleanQuery}”.` };
}
