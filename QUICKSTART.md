# 🚀 Quick Start Guide

Get your Revolutionary Digital Archive running in 15 minutes!

---

## Prerequisites

- [ ] Node.js 18+ installed
- [ ] Supabase account (sign up at supabase.com)
- [ ] Text editor (VS Code recommended)

---

## Step 1: Install Dependencies (2 minutes)

```bash
cd Unitedblackworld
npm install
```

Wait for packages to install...

---

## Step 2: Set Up Supabase (5 minutes)

### Create Project
1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Name it "united-black-world"
4. Choose a region
5. Click "Create"

### Create Database Table
1. Go to **SQL Editor**
2. Paste this:

```sql
CREATE TABLE resources (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('books', 'video', 'audio')),
  pdf_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read" ON resources FOR SELECT TO public USING (true);
CREATE POLICY "Auth insert" ON resources FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth delete" ON resources FOR DELETE TO authenticated USING (true);
```

3. Click "Run"

### Create Storage Bucket
1. Go to **Storage**
2. Click "New bucket"
3. Name: `archives`
4. Check **"Public bucket"**
5. Create

### Add Storage Policies
1. Click on `archives` bucket
2. Go to **Policies** tab
3. Add 3 policies (use SQL Editor or UI):

```sql
-- Read
CREATE POLICY "Public read" ON storage.objects FOR SELECT TO public USING (bucket_id = 'archives');

-- Upload
CREATE POLICY "Auth upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'archives');

-- Delete
CREATE POLICY "Auth delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'archives');
```

### Get API Keys
1. Go to **Settings** → **API**
2. Copy:
   - Project URL
   - anon public key

---

## Step 3: Configure App (2 minutes)

Create `.env.local` file:

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
ADMIN_PASSWORD=revolution2024
```

---

## Step 4: Run the App (1 minute)

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Step 5: Test Everything (5 minutes)

### ✅ Homepage
- Should see "My Journey to Unity"
- Navbar should have links
- Compass should rotate slowly

### ✅ Library
- Click "Enter The Library"
- Should see "No resources found" (this is correct!)

### ✅ Admin Login
- Click skull icon (top right)
- Enter your ADMIN_PASSWORD
- Should redirect to admin panel

### ✅ Upload Test
1. In admin, click "Upload New Resource"
2. Fill in:
   - Title: "Test Document"
   - Author: "Test Author"
   - Category: Books
   - File: (any PDF)
3. Click "Upload Resource"
4. Should see success message!

### ✅ Verify in Supabase
1. Go to **Table Editor** → `resources`
2. Should see your test entry
3. Go to **Storage** → `archives`
4. Should see your uploaded file!

### ✅ View in Library
1. Go back to homepage
2. Click "Enter The Library"
3. Should see your test document!
4. Click "View" to open it

---

## 🎉 Success!

Your Revolutionary Digital Archive is running!

### What You've Built:

✅ Public library with filtering
✅ Direct browser-to-storage uploads (no timeouts!)
✅ Password-protected admin panel
✅ Beautiful UI with animations
✅ 100% free hosting ready

---

## Next Steps

### Deploy to Vercel (Optional)

1. Push to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import repository
4. Add environment variables
5. Deploy!

### Customize Your Site

- Edit colors in `app/globals.css`
- Change branding in `components/Navbar.jsx`
- Update hero text in `components/Hero.jsx`

### Add More Features

- Implement Supabase Auth for multi-admin
- Add tagging system
- Create collections
- Add comments/discussions

---

## 🆘 Need Help?

Check these files:
- `README.md` - Full documentation
- `SUPABASE_SETUP.md` - Detailed Supabase guide

Common issues:
- **"Missing environment variables"** → Check `.env.local` file exists and has correct variable names
- **"Failed to upload"** → Check storage policies in Supabase
- **"Can't login"** → Verify ADMIN_PASSWORD in `.env.local`

---

**Power to the people. Knowledge is freedom.** ✊
