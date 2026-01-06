# Complete Deployment Guide

This guide documents the exact steps we took to successfully deploy United Black World to Vercel.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Supabase Setup](#supabase-setup)
3. [Local Development](#local-development)
4. [GitHub Setup](#github-setup)
5. [Vercel Deployment](#vercel-deployment)
6. [Post-Deployment Configuration](#post-deployment-configuration)
7. [Common Issues We Faced](#common-issues-we-faced)

---

## Prerequisites

Before starting, make sure you have:

- ✅ Node.js 18+ installed
- ✅ Git installed
- ✅ A GitHub account
- ✅ A Supabase account (free tier works)
- ✅ A Vercel account (free tier works)

---

## Supabase Setup

### Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Fill in:
   - **Name**: UnitedBlackWorld (or your preferred name)
   - **Database Password**: Save this securely (you won't need it for the app)
   - **Region**: Choose closest to your users
4. Wait ~2 minutes for project creation

### Step 2: Create the Database Table

1. In Supabase dashboard, go to **SQL Editor**
2. Click **"New query"**
3. Copy and paste this SQL:

```sql
-- Create the resources table with file_path column
CREATE TABLE resources (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('books', 'video', 'audio')),
  pdf_url TEXT NOT NULL,
  file_path TEXT,  -- Required for deleting files from storage
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view resources
CREATE POLICY "Public read access"
ON resources FOR SELECT
TO public
USING (true);

-- Policy: Public can insert (we use simple password auth, not Supabase Auth)
CREATE POLICY "Public insert access"
ON resources FOR INSERT
TO public
WITH CHECK (true);

-- Policy: Public can delete (we use simple password auth, not Supabase Auth)
CREATE POLICY "Public delete access"
ON resources FOR DELETE
TO public
USING (true);
```

4. Click **"Run"** (or press Cmd/Ctrl + Enter)
5. You should see "Success. No rows returned"

### Step 3: Create Storage Bucket

1. In Supabase, go to **Storage** (left sidebar)
2. Click **"New bucket"**
3. Settings:
   - **Name**: `archives`
   - **Public bucket**: ✅ **Check this box**
4. Click **"Create bucket"**

### Step 4: Set Storage Policies

1. Click on the **`archives`** bucket you just created
2. Go to **"Policies"** tab
3. Click **"New policy"**
4. Select **"For full customization"**

**Create 3 policies:**

**Policy 1: Public Read**
- Allowed operation: SELECT
- Policy name: `Public read access`
- Target roles: `public`
- SQL:
```sql
bucket_id = 'archives'
```

**Policy 2: Public Insert**
- Allowed operation: INSERT
- Policy name: `Public upload access`
- Target roles: `public`
- SQL:
```sql
bucket_id = 'archives'
```

**Policy 3: Public Delete**
- Allowed operation: DELETE
- Policy name: `Public delete access`
- Target roles: `public`
- SQL:
```sql
bucket_id = 'archives'
```

### Step 5: Get Your API Credentials

1. Go to **Settings** → **API**
2. Copy these values:
   - **Project URL**: Something like `https://xxxxx.supabase.co`
   - **anon public key**: Long string starting with `eyJ...`
3. Save these for later!

---

## Local Development

### Step 1: Clone and Install

```bash
cd /Users/raydner/Desktop/Ark/Unitedblackworld
npm install
```

### Step 2: Configure Environment Variables

1. Create `.env.local` file:

```bash
cp .env.local.example .env.local
```

2. Edit `.env.local` with your values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://ankanowfwxpeuovwnjai.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFua2Fub3dmd3hwZXVvdnduamFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2MzgyNzUsImV4cCI6MjA4MzIxNDI3NX0.oBF20QF5UNIukA2khSZ8Hm6R9kjUSNb6bE0kj-C6aWw
ADMIN_PASSWORD=revolution2024
```

**⚠️ Security Note:** The anon key above is specific to our project. Use YOUR OWN keys!

### Step 3: Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

**Test that everything works:**
- ✅ Homepage loads with rotating compass
- ✅ Can navigate to Library
- ✅ Can login to admin (password: revolution2024)
- ✅ Can upload a test file
- ✅ File appears in Library
- ✅ Can delete file

---

## GitHub Setup

### Step 1: Initialize Git Repository

```bash
git init
git add .
git commit -m "Initial commit - Revolutionary Digital Archive with Suspense fix"
```

### Step 2: Create GitHub Repository

1. Go to [github.com/new](https://github.com/new)
2. Repository settings:
   - **Name**: `UnitedBlackWorld`
   - **Visibility**: Public (or Private if you prefer)
   - **DO NOT** check "Add README" or .gitignore (we already have them)
3. Click **"Create repository"**

### Step 3: Push to GitHub

```bash
git remote add origin https://github.com/YOUR-USERNAME/UnitedBlackWorld.git
git branch -M main
git push -u origin main
```

Replace `YOUR-USERNAME` with your actual GitHub username.

---

## Vercel Deployment

### Step 1: Import Project to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository:
   - Find `UnitedBlackWorld` in the list
   - Click **"Import"**

### Step 2: Configure Project Settings

**Framework Preset:** Next.js (auto-detected)

**Build Settings:**
- Build Command: `npm run build` (default, leave as is)
- Output Directory: `.next` (default, leave as is)
- Install Command: `npm install` (default, leave as is)

### Step 3: Add Environment Variables

**CRITICAL STEP - Don't skip this!**

Click **"Environment Variables"** and add these 3 variables:

**Variable 1:**
- **Key**: `NEXT_PUBLIC_SUPABASE_URL`
- **Value**: `https://ankanowfwxpeuovwnjai.supabase.co` (use YOUR URL)
- **Environments**: ✅ Production, ✅ Preview, ✅ Development

**Variable 2:**
- **Key**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Value**: Your anon key from Supabase Settings → API
- **Environments**: ✅ Production, ✅ Preview, ✅ Development

**Variable 3:**
- **Key**: `ADMIN_PASSWORD`
- **Value**: `revolution2024` (or your custom password)
- **Environments**: ✅ Production, ✅ Preview, ✅ Development

### Step 4: Deploy

1. Click **"Deploy"**
2. Wait 2-3 minutes for build to complete
3. You'll see "🎉 Congratulations!"
4. Click **"Visit"** to see your live site!

**Your URL will be:** `https://unitedblackworld-xxxxx.vercel.app`

---

## Post-Deployment Configuration

### Test Your Live Site

Visit your Vercel URL and test:

1. **Homepage** - Should load with rotating compass
2. **Library** - Should show "No resources found" (empty state)
3. **Login** - Go to `/login`, enter your admin password
4. **Admin Dashboard** - Should show "Captain's Quarters"
5. **Upload a file** - Upload a test PDF
6. **Check Library** - File should appear
7. **Delete file** - Should remove from storage and database

### If Upload Fails with "Could not find the 'file_path' column"

Run this SQL in Supabase (SQL Editor):

```sql
ALTER TABLE resources
ADD COLUMN IF NOT EXISTS file_path TEXT;

UPDATE resources
SET file_path =
  CASE
    WHEN pdf_url LIKE '%/archives/%'
    THEN substring(pdf_url from '/archives/(.+)$')
    ELSE NULL
  END
WHERE file_path IS NULL;
```

Then try uploading again.

---

## Common Issues We Faced

### Issue 1: "useSearchParams() should be wrapped in a suspense boundary"

**Symptom:** Vercel build fails with this error during static generation

**Solution:** The `app/library/page.jsx` already has a Suspense boundary. If you see this error:
1. Make sure you're deploying the latest code
2. Go to Vercel deployment → Click "Redeploy"
3. **Uncheck** "Use existing Build Cache"
4. Deploy again

### Issue 2: "New row violates row-level security policy"

**Symptom:** Upload fails with RLS policy error

**Solution:** Your Supabase policies are set to `authenticated` instead of `public`.

**Fix for Database:**
1. Supabase → Table Editor → `resources` table
2. Click on the table → Policies
3. Delete existing policies
4. Run the SQL from Step 2 of Supabase Setup to recreate policies correctly

**Fix for Storage:**
1. Supabase → Storage → `archives` bucket → Policies
2. Delete existing policies
3. Recreate with `TO public` instead of `TO authenticated`

### Issue 3: Vercel Deploying Old Code

**Symptom:** Made changes, pushed to GitHub, but Vercel deploys old version

**Solution:**
1. Go to Vercel Project → Settings → Git
2. Verify "Production Branch" is `main`
3. Go to Deployments
4. Click latest deployment → "Redeploy"
5. **Uncheck** "Use existing Build Cache"

**Nuclear option (if above doesn't work):**
1. Delete Vercel project entirely
2. Delete GitHub repository
3. Start fresh with new repo and new Vercel import

### Issue 4: "Missing Supabase environment variables"

**Symptom:** Build fails immediately with this error

**Solution:**
1. Go to Vercel Project → Settings → Environment Variables
2. Verify all 3 variables are present and spelled exactly:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `ADMIN_PASSWORD`
3. Make sure they're enabled for Production, Preview, and Development
4. Redeploy

---

## Final Checklist

Before going live, verify:

- ✅ Supabase database table created with `file_path` column
- ✅ Supabase storage bucket created and set to public
- ✅ Database policies set to `public` (not `authenticated`)
- ✅ Storage policies set to `public` (not `authenticated`)
- ✅ All 3 environment variables added to Vercel
- ✅ Code pushed to GitHub
- ✅ Vercel deployment successful
- ✅ Can upload files on live site
- ✅ Can delete files (removes from storage too)
- ✅ Library shows uploaded resources

---

## 🎉 Success!

Your Revolutionary Digital Archive is now live!

**Live Site:** Check your Vercel dashboard for the URL

**Admin Access:** `your-url.vercel.app/login`

**Admin Password:** The value you set for `ADMIN_PASSWORD`

---

## Next Steps

1. **Add your first real content** to the library
2. **Share the URL** with your community
3. **Monitor usage** via Supabase dashboard
4. **Consider upgrading** to Supabase Auth for multi-admin support

---

**Power to the people. Knowledge is freedom.** ✊
