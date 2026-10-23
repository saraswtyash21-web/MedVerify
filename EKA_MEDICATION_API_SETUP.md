# Eka medication search setup

Doctor Info uses Eka Care as its India medication-catalog source and DailyMed as an optional U.S. label source. Eka search returns catalogue suggestions such as medicine name, generic name, manufacturer, and product type; it is not a medicine safety-alert or authenticity check.

## Local development

1. Copy `.env.example` to `.env` in the project folder.
2. Fill `EKA_CLIENT_ID` and `EKA_CLIENT_SECRET` from your Eka developer account. Add `EKA_SHARING_KEY` only if Eka provided one for this API.
3. Keep the values server-side. Do not rename them with a `VITE_` prefix or put them in frontend code.
4. Restart the Vite development server after changing `.env`.

The local Vite server handles `/api/eka-medications` through a server middleware, so credentials are not sent to the browser.

## Vercel (when ready to deploy)

In the Vercel project, add `EKA_CLIENT_ID`, `EKA_CLIENT_SECRET`, and, if supplied by Eka, `EKA_SHARING_KEY` as server environment variables. Use `EKA_API_BASE_URL=https://api.dev.eka.care` for Eka's development environment. Set the approved production base URL only after Eka provides production access. Redeploy after adding or changing the variables.

The API follows Eka's documented client-login endpoint and medication-search endpoint:

- [Eka client login](https://developer.eka.care/api-reference/authorization/client-login)
- [Eka medication search](https://developer.eka.care/api-reference/knowledge-base/medications/search)

The app never stores credentials in Supabase or browser storage. If credentials are missing or Eka rejects the request, the Doctor Info page displays an error instead of demo results.
