# United Black World - The Journal

**A Revolutionary Digital Archive**

A serverless web application for hosting and sharing revolutionary PDFs, videos, and audio files. Built with Next.js, Supabase, and deployed on Vercel.

## 🎯 The Innovation: Client-Side Upload (No Server Timeouts!)

This project solves the "serverless timeout problem" by **uploading files directly from the browser to Supabase Storage**, bypassing the server entirely. This means:

- ✅ **No file size limits** (upload 500MB PDFs with no timeout)
- ✅ **100% Free** (Vercel + Supabase free tiers)
- ✅ **Fast uploads** (direct to storage bucket)
- ✅ **No backend API needed** for file handling

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ installed
- A Supabase account (free)
- A Vercel account (free) for deployment

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd Unitedblackworld
npm install
```

### 2. Set Up Supabase

#### A. Create a New Project

1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Fill in your project details
4. Wait for the project to be created (~2 minutes)

#### B. Create the Database Table

1. In your Supabase dashboard, go to **SQL Editor**
2. Click "New Query"
3. Paste and run this SQL:

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

-- Enable Row Level Security
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view resources
CREATE POLICY "Public read access"
ON resources FOR SELECT
TO public
USING (true);

-- Policy: Only authenticated users can insert
CREATE POLICY "Authenticated insert access"
ON resources FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy: Only authenticated users can delete
CREATE POLICY "Authenticated delete access"
ON resources FOR DELETE
TO authenticated
USING (true);
```

#### C. Create the Storage Bucket

1. In Supabase, go to **Storage**
2. Click "New Bucket"
3. Name it: `archives`
4. Make it **Public**
5. Click "Create Bucket"

#### D. Set Storage Policies

1. Click on the `archives` bucket
2. Go to **Policies** tab
3. Create these policies:

**Policy 1: Public Read Access**
```sql
-- Anyone can view/download files
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'archives');
```

**Policy 2: Authenticated Upload Access**
```sql
-- Only authenticated users can upload
CREATE POLICY "Authenticated upload access"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'archives');
```

**Policy 3: Authenticated Delete Access**
```sql
-- Only authenticated users can delete
CREATE POLICY "Authenticated delete access"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'archives');
```

#### E. Get Your API Keys

1. Go to **Settings** → **API**
2. Copy your `Project URL` and `anon public` key

### 3. Configure Environment Variables

1. Copy the example file:

```bash
cp .env.local.example .env.local
```

2. Edit `.env.local` and add your keys:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
ADMIN_PASSWORD=your-secure-password-here
```

**⚠️ Important:** Set a strong `ADMIN_PASSWORD` - this is used for admin login.

### 4. Run the Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

---

## 📦 Deployment to Vercel

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin <your-github-repo-url>
git push -u origin main
```

### 2. Deploy on Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `ADMIN_PASSWORD`
5. Click "Deploy"

Your site will be live in ~2 minutes!

---

## 🎨 Features

### For Visitors (Public)

- **Browse the Library**: Filter resources by Books, Videos, or Audio
- **Search**: Find resources by title or author
- **View/Download**: Access all resources instantly
- **Responsive Design**: Works on all devices

### For Admins (Protected)

- **Password-Protected Admin Panel**: "Captain's Quarters" login
- **Upload Large Files**: Direct browser-to-storage upload (no timeouts!)
- **Manage Resources**: View, delete, and organize content
- **Category Management**: Organize by Books, Videos, Audio

---

## 🔧 How It Works

### The Client-Side Upload Magic

```javascript
// Traditional approach (❌ Times out on large files):
File → Server → Storage Bucket

// Our approach (✅ No timeouts ever):
File → Directly to Storage Bucket (browser uses Supabase SDK)
```

When an admin uploads a file:

1. **Browser** grabs the file from the form
2. **Supabase JS Client** uploads directly to Storage bucket
3. **Supabase** returns the public URL
4. **Browser** saves the URL + metadata to the database

**The server is never involved in file handling!**

### Tech Stack

- **Frontend**: Next.js 14 (React)
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage
- **Authentication**: Simple password auth (upgradeable to Supabase Auth)
- **Deployment**: Vercel
- **Animations**: GSAP

---

## 📁 Project Structure

```
Unitedblackworld/
├── app/
│   ├── admin/          # Admin dashboard
│   ├── library/        # Public library page
│   ├── login/          # Admin login
│   ├── api/auth/       # Authentication API
│   └── page.jsx        # Homepage
├── components/
│   ├── Navbar.jsx      # Navigation bar
│   └── Hero.jsx        # Hero section
├── lib/
│   └── supabase.js     # Supabase client & helpers
├── saved-ui/           # Original UI components (reference)
└── README.md           # This file
```

---

## 🔐 Security Notes

### Current Authentication

- Simple password-based auth for MVP
- Password stored in environment variables
- Not suitable for multi-admin scenarios

### Recommended Upgrades

For production with multiple admins:

1. **Use Supabase Auth**: Replace simple password with Supabase authentication
2. **Add user roles**: Differentiate between admin and regular users
3. **Implement sessions**: Use proper session management
4. **Add CSRF protection**: Protect against cross-site attacks

---

## 🎯 Roadmap

- [ ] Implement Supabase Auth for multi-admin support
- [ ] Add edit functionality for resources
- [ ] Implement tagging system
- [ ] Add full-text search
- [ ] Create collection/playlist feature
- [ ] Add user favorites
- [ ] Implement admin activity logs
- [ ] Add file type validation
- [ ] Create batch upload feature
- [ ] Add analytics dashboard

---

## 🐛 Troubleshooting

### "Missing Supabase environment variables"

- Make sure `.env.local` exists
- Check that variable names match exactly
- Restart the dev server after adding variables

### "Failed to upload file"

- Check that the `archives` bucket exists in Supabase
- Verify storage policies are set correctly
- Check browser console for detailed errors

### "Incorrect Captain's Code"

- Verify `ADMIN_PASSWORD` in `.env.local` matches what you're entering
- Check for extra spaces or hidden characters

### Files not showing in Library

- Check that the resource was saved to the database
- Verify `pdf_url` field contains the correct URL
- Check browser console for fetch errors

---

## 📝 License

This project is open source and available for revolutionary purposes.

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

---

## 💡 Credits

Built with ❤️ for the movement.

**Design Inspiration**: One Piece aesthetic, "Captain's Log" theme

**Tech Stack**: Next.js, Supabase, Vercel, GSAP

---

## 📧 Support

For questions or issues, please open a GitHub issue.

**Remember**: This is a tool for liberation. Use it wisely.

---

## 🔥 The Golden Rule

**Never write an API route for file uploads!**

All file handling happens directly in the browser using the Supabase Storage SDK. This is what makes the project immune to serverless timeouts.

```javascript
// ✅ DO THIS (Client-side upload):
const { url } = await supabase.storage
  .from('archives')
  .upload(filePath, file);

// ❌ DON'T DO THIS (Server-side upload):
await fetch('/api/upload', {
  method: 'POST',
  body: formData
});
```

---

**Power to the people. Knowledge is freedom.** ✊
