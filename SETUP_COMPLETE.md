# Supabase Connection Setup - MedVerify

## ✅ Configuration Complete

Your MedVerify project has been configured to connect to your Supabase instance.

### What Was Done

1. **Created `.env` file** with your Supabase credentials
   - Project URL configured
   - Anon key configured
   - Auth mode set to `supabase`
   - App mode set to `demo`

2. **Updated `.gitignore`** to exclude `.env` files from version control
   - `.env`
   - `.env.local`
   - `.env.*.local`

3. **Verified build** - Project builds successfully with Supabase integration

---

## 📋 Next Steps - Manual Actions Required

### Step 1: Run Database Migration

You need to create the `scan_history` table in your Supabase database.

**File to run:** `supabase/migrations/001_initial.sql`

**Instructions:**

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/
2. Select your project: `ihzykdtbmhpcyymolply`
3. Navigate to **SQL Editor** (left sidebar)
4. Click **New Query**
5. Copy the entire contents of `supabase/migrations/001_initial.sql`
6. Paste it into the SQL Editor
7. Click **Run** (or press Ctrl+Enter / Cmd+Enter)

**What this creates:**
- `scan_history` table with columns for storing medicine scan data
- Row Level Security (RLS) policies to ensure users can only access their own data
- Indexes for performance optimization

**Verification queries** (run after migration):
```sql
-- Check table exists
SELECT tablename FROM pg_tables WHERE schemaname = 'public';

-- Check RLS policies
SELECT polname FROM pg_policies WHERE tablename = 'scan_history';

-- Check RLS is enabled
SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'scan_history';
```

---

### Step 2: Configure Supabase Auth Settings

1. In Supabase Dashboard, go to **Authentication** → **Providers**
2. Ensure **Email** provider is enabled (should be enabled by default)
3. Optional but recommended settings:
   - **Enable email confirmations**: Toggle ON for better security
   - **Set site URL**: Add your app's URL (e.g., `http://localhost:5173` for development)
   - **Configure email templates**: Customize welcome/password reset emails if desired

4. Go to **Authentication** → **URL Configuration**
   - Set **Site URL** to: `http://localhost:5173` (for local development)
   - Add redirect URLs if deploying to production

---

### Step 3: Start the Application

```bash
npm run dev
```

The app should now:
- Show "Supabase Auth Active" on the login page (green banner)
- Allow users to sign up with email/password
- Persist scan history in the database
- Show "Persistent Storage Active" on the dashboard

---

## 🧪 Testing Instructions

### Test 1: Sign Up

1. Open the app in your browser
2. Click **Sign Up**
3. Enter:
   - Name: Test User 1
   - Email: test1@example.com
   - Password: test123456
4. Click **Create Account**
5. You should be redirected to the dashboard

**Verify in Supabase:**
- Go to **Authentication** → **Users**
- You should see `test1@example.com` in the user list

---

### Test 2: Perform a Scan

1. On the dashboard, click **Scan Medicine**
2. Upload a medicine image or use a demo sample
3. Complete the scan and verification
4. The scan should be saved to the database

**Verify in Supabase:**
- Go to **Table Editor** → **scan_history**
- You should see a new row with your user_id and scan data

---

### Test 3: Sign Out and Sign In

1. Click **Sign Out** in the dashboard
2. You should be redirected to the login page
3. Sign in with the same credentials:
   - Email: test1@example.com
   - Password: test123456
4. Your scan history should still be visible on the dashboard

---

### Test 4: Data Isolation (Multi-User Test)

1. Sign out from Test User 1
2. Sign up with a new account:
   - Name: Test User 2
   - Email: test2@example.com
   - Password: test123456
3. Perform a different scan
4. Verify that Test User 2 only sees their own scans
5. Sign out and sign back in as Test User 1
6. Verify that Test User 1 only sees their own scans (not Test User 2's)

**Verify in Supabase:**
- Go to **Table Editor** → **scan_history**
- You should see rows for both users
- Each row should have a different `user_id`
- RLS policies ensure each user can only query their own data

---

### Test 5: Persistent Storage

1. Sign in as any user
2. Perform a scan
3. Refresh the browser page (F5 or Cmd+R)
4. Your scan history should still be there
5. This confirms data is persisted in the database, not just in memory

---

## 🔒 Security Notes

### What's Secure

✅ **Authentication**: Handled by Supabase Auth (industry-standard)
✅ **Password Storage**: Managed by Supabase (bcrypt hashing)
✅ **Data Isolation**: Row Level Security (RLS) ensures users only see their own data
✅ **Session Management**: Supabase handles secure session tokens
✅ **Environment Variables**: Credentials stored in `.env`, not in source code
✅ **Git Protection**: `.env` is in `.gitignore`, won't be committed

### What's NOT Configured Yet

❌ **Medicine Quality Alerts**: No real data source connected (still using demo data)
❌ **Barcode Product Lookup**: No product database API connected
❌ **Email Verification**: Optional, can be enabled in Supabase dashboard
❌ **Production Deployment**: Currently configured for local development

---

## 📊 Database Schema

The `scan_history` table includes:

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Foreign key to auth.users |
| `created_at` | TIMESTAMPTZ | When the scan was performed |
| `product_name` | TEXT | Name of the medicine |
| `strength` | TEXT | Dosage strength |
| `dosage_form` | TEXT | Tablet, capsule, etc. |
| `manufacturer` | TEXT | Manufacturer name |
| `batch_number` | TEXT | Batch/lot number |
| `manufacturing_date` | TEXT | Mfg date |
| `expiry_date` | TEXT | Expiry date |
| `outcome` | TEXT | ALERT_MATCH_FOUND, NO_ALERT_FOUND, or UNABLE_TO_VERIFY |
| `report_json` | JSONB | Full verification report |
| `barcode_value` | TEXT | Scanned barcode number |
| `barcode_format` | TEXT | Barcode format (EAN-13, etc.) |

---

## 🚀 What This Setup Does NOT Include

This configuration only sets up:
- ✅ Supabase Authentication (sign up, sign in, sign out)
- ✅ Persistent scan history storage
- ✅ Row Level Security for data isolation

This configuration does NOT include:
- ❌ Live medicine quality alert data (CDSCO, FDA, etc.)
- ❌ Barcode product lookup (GS1, Open Food Facts, etc.)
- ❌ Comprehensive medicine knowledge database (RxNorm, DailyMed, etc.)

To add these features, you'll need to:
1. Obtain real data from official sources
2. Configure data sources in `src/config.ts`
3. Import or connect to live APIs

See `CONFIGURATION.md` for details on adding real data sources.

---

## 🐛 Troubleshooting

### Issue: "Supabase Configuration Error" on login page

**Cause**: Environment variables not loaded

**Solution**:
1. Ensure `.env` file exists in the project root
2. Restart the dev server: `npm run dev`
3. Check browser console for specific error messages

---

### Issue: "Failed to save scan to database"

**Cause**: Migration not run or RLS policies not configured

**Solution**:
1. Run the migration: `supabase/migrations/001_initial.sql`
2. Verify RLS policies exist:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'scan_history';
   ```
3. Should show 4 policies (SELECT, INSERT, UPDATE, DELETE)

---

### Issue: Can't sign up - "User already registered"

**Cause**: Email already exists in Supabase

**Solution**:
1. Go to **Authentication** → **Users** in Supabase dashboard
2. Delete the existing user or use a different email
3. Try signing up again

---

### Issue: Scan history not persisting after refresh

**Cause**: Not connected to Supabase or migration not run

**Solution**:
1. Check that `VITE_AUTH_MODE=supabase` in `.env`
2. Verify migration was run successfully
3. Check browser console for errors
4. Verify you're signed in (check Supabase dashboard → Authentication → Users)

---

## 📝 Environment Variables Reference

| Variable | Value | Description |
|----------|-------|-------------|
| `VITE_SUPABASE_URL` | `https://ihzykdtbmhpcyymolply.supabase.co` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | `[configured]` | Your Supabase anon/public key |
| `VITE_AUTH_MODE` | `supabase` | Use Supabase Auth (not demo) |
| `VITE_APP_MODE` | `demo` | Demo features enabled |

---

## ✅ Verification Checklist

Before considering setup complete, verify:

- [ ] `.env` file exists with your Supabase credentials
- [ ] `.env` is in `.gitignore`
- [ ] Migration `001_initial.sql` has been run in Supabase SQL Editor
- [ ] `scan_history` table exists in Supabase Table Editor
- [ ] RLS policies are active (4 policies for scan_history)
- [ ] Email auth provider is enabled in Supabase dashboard
- [ ] App shows "Supabase Auth Active" on login page
- [ ] Can sign up with new email/password
- [ ] Can sign in with existing credentials
- [ ] Can sign out successfully
- [ ] Scan history persists after page refresh
- [ ] Multiple users can only see their own scan history
- [ ] Build passes: `npm run build`

---

## 📚 Additional Resources

- **Supabase Setup Guide**: `SUPABASE_SETUP.md`
- **Integration Summary**: `SUPABASE_INTEGRATION.md`
- **Configuration Guide**: `CONFIGURATION.md`
- **Supabase Docs**: https://supabase.com/docs
- **Supabase Auth Docs**: https://supabase.com/docs/guides/auth

---

## 🔐 Security Reminder

⚠️ **Never commit `.env` to version control**
⚠️ **Never share your Supabase service_role key** (only anon key is safe for client-side)
⚠️ **Enable email verification** for production use
⚠️ **Use different Supabase projects** for development/staging/production

---

**Setup completed**: Your MedVerify app is now connected to Supabase for authentication and persistent scan history storage.
