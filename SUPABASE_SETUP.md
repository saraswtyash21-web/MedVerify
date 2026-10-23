# Supabase Setup Guide for MedVerify

This guide walks you through setting up Supabase authentication and persistent scan history for MedVerify.

## Prerequisites

- A Supabase account (free tier available at https://supabase.com)
- Node.js 18+ and npm installed
- MedVerify project cloned locally

## Step 1: Create a Supabase Project

1. Go to https://app.supabase.com
2. Click "New Project"
3. Fill in:
   - **Name**: `medverify` (or your preferred name)
   - **Database Password**: Choose a strong password (save this somewhere safe)
   - **Region**: Choose the region closest to your users
4. Click "Create new project"
5. Wait for the project to initialize (takes ~2 minutes)

## Step 2: Get Your Project Credentials

1. In your Supabase dashboard, go to **Project Settings** → **API**
2. Copy these values:
   - **Project URL**: Looks like `https://abcdefghijk.supabase.co`
   - **anon public key**: A long string starting with `eyJ...`

⚠️ **Security Note**: The `anon` key is safe to expose in client-side code. It's designed for this purpose and is restricted by Row Level Security (RLS) policies. Never expose the `service_role` key.

## Step 3: Configure Environment Variables

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and fill in your values:
   ```bash
   VITE_SUPABASE_URL=https://abcdefghijk.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   VITE_AUTH_MODE=supabase
   VITE_APP_MODE=demo
   ```

3. Save the file

⚠️ **Important**: The `.env` file is listed in `.gitignore` and should never be committed to version control.

## Step 4: Run the Database Migration

1. In your Supabase dashboard, go to **SQL Editor** (left sidebar)
2. Click "New query"
3. Copy the entire contents of `supabase/migrations/001_initial.sql`
4. Paste it into the SQL Editor
5. Click "Run" (or press Ctrl+Enter / Cmd+Enter)
6. You should see success messages for each statement

### Verify the Migration

Run these queries in the SQL Editor to verify:

```sql
-- Check table exists
SELECT tablename FROM pg_tables WHERE schemaname = 'public';
-- Should show: scan_history

-- Check RLS policies
SELECT polname FROM pg_policies WHERE tablename = 'scan_history';
-- Should show 4 policies (SELECT, INSERT, UPDATE, DELETE)

-- Check RLS is enabled
SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'scan_history';
-- Should show: scan_history | t
```

## Step 5: Run the Product Catalog Migration

The product catalog stores verified medicine records for barcode lookup.

1. In Supabase dashboard, go to **SQL Editor**
2. Click "New query"
3. Copy the entire contents of `supabase/migrations/002_product_catalog.sql`
4. Paste it into the SQL Editor
5. Click "Run"

### Verify the Product Catalog Migration

```sql
-- Check table exists
SELECT tablename FROM pg_tables WHERE schemaname = 'public';
-- Should show: scan_history, product_catalog

-- Check RLS policies for product_catalog
SELECT polname FROM pg_policies WHERE tablename = 'product_catalog';
-- Should show: "Authenticated users can read product catalog"

-- Check RLS is enabled
SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'product_catalog';
-- Should show: product_catalog | t
```

### Import Verified Medicine Records

The product catalog is empty by default. You must import verified records from official sources (GS1, FDA, etc.) before barcode lookup will work.

**Quick Start:**
1. Copy the template: `cp data/product_catalog_template.csv data/my_products.csv`
2. Fill in your verified records (see template for format)
3. Validate: `node scripts/validate-catalog-csv.js data/my_products.csv`
4. Import via Supabase Dashboard → Table Editor → product_catalog → Import

**Detailed Guide:** See [docs/IMPORTING_VERIFIED_RECORDS.md](docs/IMPORTING_VERIFIED_RECORDS.md) for:
- How to verify data sources
- CSV format and validation
- Import procedures
- Security and compliance requirements

⚠️ **Important:** 
- Only import records from **verified, official sources** (GS1, FDA, national regulatory bodies)
- Never import fake, sample, or unverified data
- A barcode lookup does NOT prove medicine authenticity or safety
- The catalog is read-only for app users (RLS enforced)

## Step 6: Configure Authentication

1. In Supabase dashboard, go to **Authentication** → **Providers**
2. Ensure **Email** provider is enabled (it is by default)
3. Optional: Configure email templates under **Authentication** → **Email Templates**
4. Optional: Enable additional providers (Google, GitHub, etc.) if desired

### Email Confirmation (Optional)

By default, Supabase requires email confirmation. To disable:

1. Go to **Authentication** → **Providers** → **Email**
2. Toggle off "Confirm email"
3. Click "Save"

⚠️ **Note**: Disabling email confirmation is less secure but provides a smoother user experience for development/testing.

## Step 7: Test the Setup

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Open http://localhost:5173 in your browser

3. You should see:
   - A green banner: "Supabase Auth Active"
   - A green banner on the dashboard: "Persistent Storage Active"

4. Test the flow:
   - Sign up with a new email/password
   - Perform a medicine scan
   - Refresh the page
   - Your scan history should persist

## Step 8: Verify Data Persistence

1. In Supabase dashboard, go to **Table Editor**
2. Click on `scan_history` table
3. You should see your scan records with:
   - `user_id`: Your user's UUID
   - `product_name`, `outcome`, etc.
   - `report_json`: Full verification report as JSON

4. Click on `product_catalog` table
5. If you've imported records, you should see:
   - `barcode`: Unique product barcode
   - `product_name`: Medicine name
   - `source`: Data source (e.g., "GS1", "FDA")
   - Other product details (active ingredient, strength, etc.)

## Troubleshooting

### "Supabase Configuration Error" on login page

**Problem**: The app shows a red error banner about missing configuration.

**Solution**:
- Check that `.env` file exists and contains valid values
- Ensure `VITE_AUTH_MODE=supabase`
- Restart the dev server after changing `.env`

### "Failed to save scan to database"

**Problem**: Scans are not being saved to the database.

**Solution**:
- Verify the migration ran successfully (check Step 4)
- Check browser console for detailed error messages
- Verify RLS policies are in place:
  ```sql
  SELECT * FROM pg_policies WHERE tablename = 'scan_history';
  ```

### "Invalid API key" error

**Problem**: Authentication fails with API key error.

**Solution**:
- Double-check `VITE_SUPABASE_ANON_KEY` in `.env`
- Ensure there are no extra spaces or line breaks
- Verify the key starts with `eyJ` and is very long (200+ characters)

### Scans don't persist after page refresh

**Problem**: Scan history disappears on refresh.

**Solution**:
- Check that `VITE_AUTH_MODE=supabase` (not `demo`)
- Verify the user is authenticated (check Supabase dashboard → Authentication → Users)
- Check browser console for errors

## Security Considerations

### Row Level Security (RLS)

The migration includes RLS policies that ensure:
- Users can only SELECT their own scans
- Users can only INSERT scans with their own `user_id`
- Users can only UPDATE/DELETE their own scans

This is enforced at the database level, not just the application level.

### API Keys

- **anon key**: Safe to expose in client-side code. Restricted by RLS.
- **service_role key**: NEVER expose this. It bypasses RLS and has full database access.

### Environment Variables

- Never commit `.env` to version control
- Use different Supabase projects for development/staging/production
- Rotate keys if they are accidentally exposed

## Production Deployment

When deploying to production:

1. **Set environment variables** in your hosting platform:
   - Vercel: Project Settings → Environment Variables
   - Netlify: Site Settings → Environment Variables
   - Railway: Variables tab
   - etc.

2. **Use a production Supabase project** (separate from development)

3. **Enable email confirmation** for better security

4. **Configure custom domain** in Supabase (optional)

5. **Set up backups** in Supabase dashboard → Database → Backups

6. **Monitor usage** in Supabase dashboard → Logs

## Next Steps

After setting up Supabase, you can:

1. **Configure real data sources** in `src/config.ts` for quality-alert verification
2. **Enable additional auth providers** (Google, GitHub, etc.) in Supabase dashboard
3. **Customize email templates** for sign-up confirmation, password reset, etc.
4. **Set up database backups** for production use
5. **Add monitoring and alerts** for database usage and errors

## Support

- Supabase Documentation: https://supabase.com/docs
- Supabase Discord: https://discord.supabase.com
- MedVerify Issues: Create an issue in your project repository

---

**Note**: This setup guide assumes you're using the free tier of Supabase. For production use with high traffic, consider upgrading to a paid plan.
