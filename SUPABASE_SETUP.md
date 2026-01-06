# Supabase Setup Guide

Complete step-by-step instructions for setting up Supabase for United Black World.

---

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up or log in
3. Click **"New Project"**
4. Fill in:
   - **Name**: united-black-world
   - **Database Password**: (save this securely!)
   - **Region**: Choose closest to you
   - **Pricing Plan**: Free
5. Click **"Create new project"**
6. Wait 2-3 minutes for setup to complete

---

## Step 2: Create Database Table

### Go to SQL Editor

1. In your project dashboard, click **"SQL Editor"** in the left sidebar
2. Click **"New Query"**
3. Copy and paste this SQL code:

```sql
-- Create the resources table
CREATE TABLE resources (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('books', 'video', 'audio')),
  pdf_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;

-- Policy 1: Anyone can read/view resources (public access)
CREATE POLICY "Public read access"
ON resources FOR SELECT
TO public
USING (true);

-- Policy 2: Only authenticated admins can insert resources
CREATE POLICY "Authenticated insert access"
ON resources FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy 3: Only authenticated admins can delete resources
CREATE POLICY "Authenticated delete access"
ON resources FOR DELETE
TO authenticated
USING (true);
```

4. Click **"Run"** (or press Ctrl+Enter / Cmd+Enter)
5. You should see: "Success. No rows returned"

### Verify Table Creation

1. Click **"Table Editor"** in left sidebar
2. You should see the `resources` table
3. Click on it to view the columns: `id`, `title`, `author`, `category`, `pdf_url`, `created_at`

---

## Step 3: Create Storage Bucket

### Create the Bucket

1. Click **"Storage"** in the left sidebar
2. Click **"New bucket"**
3. Fill in:
   - **Name**: `archives`
   - **Public bucket**: ✅ **Check this box** (important!)
   - **File size limit**: 50 MB (or higher if you need)
   - **Allowed MIME types**: Leave empty for now
4. Click **"Create bucket"**

### Set Storage Policies

1. Click on the `archives` bucket you just created
2. Click the **"Policies"** tab
3. You'll see "No policies created yet"
4. Click **"New Policy"**

#### Policy 1: Public Read Access

1. Click **"For full customization"**
2. Fill in:
   - **Policy name**: `Public read access`
   - **Allowed operation**: **SELECT** (check this)
   - **Target roles**: **public**
3. In the **"Policy definition"** section, use:

```sql
bucket_id = 'archives'
```

4. Click **"Review"** then **"Save policy"**

#### Policy 2: Authenticated Upload Access

1. Click **"New Policy"** again
2. Fill in:
   - **Policy name**: `Authenticated upload access`
   - **Allowed operation**: **INSERT** (check this)
   - **Target roles**: **authenticated**
3. In the **"Policy definition"** section, use:

```sql
bucket_id = 'archives'
```

4. Click **"Review"** then **"Save policy"**

#### Policy 3: Authenticated Delete Access

1. Click **"New Policy"** again
2. Fill in:
   - **Policy name**: `Authenticated delete access`
   - **Allowed operation**: **DELETE** (check this)
   - **Target roles**: **authenticated**
3. In the **"Policy definition"** section, use:

```sql
bucket_id = 'archives'
```

4. Click **"Review"** then **"Save policy"**

### Verify Policies

You should now see 3 policies:
- ✅ Public read access (SELECT)
- ✅ Authenticated upload access (INSERT)
- ✅ Authenticated delete access (DELETE)

---

## Step 4: Get API Keys

1. Click **"Settings"** (gear icon) in the left sidebar
2. Click **"API"** under Project Settings
3. You'll see two important values:

### Project URL
```
https://abcdefghijklmnop.supabase.co
```
Copy this - you'll need it for `NEXT_PUBLIC_SUPABASE_URL`

### anon public Key
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
Copy this - you'll need it for `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**⚠️ Note**: The `anon` key is safe to use in the browser. Don't use the `service_role` key in your frontend!

---

## Step 5: Configure Your App

1. In your project, open `.env.local`
2. Paste your keys:

```env
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
ADMIN_PASSWORD=your-secure-password-here
```

3. Save the file
4. Restart your dev server

---

## Step 6: Test the Setup

### Test 1: Homepage Loads

1. Run `npm run dev`
2. Visit `http://localhost:3000`
3. Should see homepage with no errors

### Test 2: Library Loads

1. Click "Enter The Library"
2. Should see "No resources found" (this is correct - you haven't uploaded any yet!)

### Test 3: Admin Login

1. Click the skull icon (top right)
2. Enter your `ADMIN_PASSWORD`
3. Should redirect to `/admin`

### Test 4: Upload a File

1. In admin panel, click "Upload New Resource"
2. Fill in:
   - Title: "Test Book"
   - Author: "Test Author"
   - Category: Books
   - File: (select any PDF)
3. Click "Upload Resource"
4. Should see success message
5. Check Supabase:
   - Go to **Table Editor** → `resources` → should see your entry
   - Go to **Storage** → `archives` → should see your uploaded file

---

## Troubleshooting

### Error: "Missing Supabase environment variables"

**Solution**:
- Make sure `.env.local` exists in project root
- Variable names must be exact (including `NEXT_PUBLIC_` prefix)
- Restart the dev server after adding variables

### Error: "new row violates row-level security policy"

**Solution**:
- You're not authenticated when trying to upload
- In the admin page, check that `localStorage.getItem('adminAuth')` returns `'true'`
- For a proper fix, implement Supabase Auth

### Error: "Failed to upload file"

**Solution**:
- Check that the `archives` bucket exists
- Verify the bucket is **public**
- Check that storage policies are created correctly
- Look in browser console for specific error message

### Files upload but don't show in library

**Solution**:
- Check the `resources` table in Supabase - is the entry there?
- Verify the `pdf_url` column contains a valid URL
- Check browser console for fetch errors
- Make sure public read policy exists on the `resources` table

### Can't login to admin

**Solution**:
- Double-check the password in `.env.local` (no spaces, no quotes)
- Try a simple password first like `test123`
- Check browser console for errors
- Verify `/api/auth` route exists

---

## Security Best Practices

### For Development
- ✅ Use the `anon` (public) key
- ✅ Enable Row Level Security on all tables
- ✅ Set specific policies (not wildcard permissions)

### For Production
- ✅ Implement proper Supabase Auth (not simple password)
- ✅ Use environment variables (never commit `.env.local`)
- ✅ Enable email confirmation for signups
- ✅ Set up MFA for admin accounts
- ✅ Regularly review access logs

---

## Next Steps

### Implement Supabase Auth (Recommended)

Replace the simple password system with proper authentication:

1. In Supabase, go to **Authentication** → **Settings**
2. Configure email provider
3. Update your app to use:
   ```javascript
   const { data, error } = await supabase.auth.signInWithPassword({
     email: email,
     password: password
   });
   ```

### Set Up Storage Limits

1. Go to **Storage** → `archives` → **Settings**
2. Set file size limits (e.g., 100 MB)
3. Add allowed MIME types:
   - `application/pdf`
   - `video/mp4`
   - `audio/mpeg`

---

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Storage Documentation](https://supabase.com/docs/guides/storage)
- [JavaScript Client Reference](https://supabase.com/docs/reference/javascript)

---

**You're all set! Your Supabase backend is ready to power the Revolutionary Digital Archive.** ✊
