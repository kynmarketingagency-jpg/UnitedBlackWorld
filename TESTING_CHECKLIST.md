# Testing Checklist - United Black World

Use this checklist to verify everything is working correctly after deployment.

---

## 🚀 Pre-Deployment Testing (Local)

### Environment Setup
- [ ] `.env.local` file exists
- [ ] All 3 environment variables are set correctly
- [ ] `npm install` completed without errors
- [ ] `npm run dev` starts without errors

### Homepage Tests
- [ ] Visit `http://localhost:3000`
- [ ] Red anchor logo appears in navbar
- [ ] Compass animation is rotating smoothly
- [ ] Hero section displays correctly
- [ ] Navigation links work (Library, Login)
- [ ] Search bar is visible in navbar

### Library Page Tests
- [ ] Visit `http://localhost:3000/library`
- [ ] Page loads without errors
- [ ] Filter tabs appear (All, Books, Video, Audio)
- [ ] "No resources found" message shows (if empty)
- [ ] Search functionality works (if you have resources)
- [ ] Clicking filters updates the display

### Admin Login Tests
- [ ] Visit `http://localhost:3000/login`
- [ ] "Captain's Quarters" branding displays
- [ ] Can enter password
- [ ] Wrong password shows error message
- [ ] Correct password (`revolution2024`) redirects to `/admin`

### Admin Dashboard Tests
- [ ] After login, redirected to `/admin`
- [ ] "Captain's Quarters" header displays
- [ ] Filter tabs work (All, Books, Videos, Audio)
- [ ] "Upload New Resource" button appears
- [ ] "Return to Ship" link goes to homepage
- [ ] "Logout" button works

### Upload Tests
- [ ] Click "Upload New Resource"
- [ ] Form appears with all fields
- [ ] Can enter title, author, select category
- [ ] Can select a file (PDF, MP4, or MP3)
- [ ] File name displays after selection
- [ ] Upload button is enabled
- [ ] Cancel button works

**Small File Upload (< 1MB):**
- [ ] Upload completes successfully
- [ ] Success message appears
- [ ] Form resets
- [ ] New resource appears in admin grid
- [ ] Resource appears in public library

**Large File Upload (> 10MB):**
- [ ] Upload starts
- [ ] No timeout error
- [ ] Upload completes (may take time depending on connection)
- [ ] File appears in library

### Delete Tests
- [ ] Click delete button on a resource
- [ ] Confirmation dialog appears
- [ ] Cancel works (resource stays)
- [ ] Confirm deletes resource
- [ ] Resource disappears from admin grid
- [ ] Resource disappears from public library

**Verify Storage Deletion:**
- [ ] Go to Supabase → Storage → archives bucket
- [ ] Deleted file is no longer in storage

### Supabase Verification
- [ ] Go to Supabase dashboard
- [ ] Table Editor → resources table has entries
- [ ] Each entry has: id, title, author, category, pdf_url, file_path, created_at
- [ ] Storage → archives bucket shows uploaded files
- [ ] File paths in database match storage paths

---

## 🌐 Post-Deployment Testing (Production)

### Vercel Deployment
- [ ] Build completed successfully
- [ ] No build errors in Vercel dashboard
- [ ] Deployment URL is active
- [ ] Domain shows the site (not 404)

### Environment Variables Check
- [ ] Go to Vercel → Settings → Environment Variables
- [ ] `NEXT_PUBLIC_SUPABASE_URL` is set
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` is set
- [ ] `ADMIN_PASSWORD` is set
- [ ] All are enabled for Production, Preview, Development

### Production Homepage
- [ ] Visit your Vercel URL
- [ ] Homepage loads correctly
- [ ] All styles applied
- [ ] Compass animation works
- [ ] Navigation works
- [ ] No console errors (check browser DevTools)

### Production Library
- [ ] Visit `/library` on production URL
- [ ] Page loads without errors
- [ ] Resources display (if you uploaded any locally)
- [ ] Filters work
- [ ] Search works
- [ ] Can click "View" to open PDFs in new tab
- [ ] Can click "Download" to download files

### Production Admin Login
- [ ] Visit `/login` on production URL
- [ ] Login page displays
- [ ] Enter admin password
- [ ] Successfully redirects to `/admin`
- [ ] Logout works

### Production Upload Test
**CRITICAL TEST:**
- [ ] Login to admin on production
- [ ] Upload a small test file (< 1MB)
- [ ] Upload succeeds
- [ ] File appears in library
- [ ] File is viewable/downloadable
- [ ] No errors in browser console

**If upload fails with "Could not find file_path column":**
- [ ] Go to Supabase → SQL Editor
- [ ] Run `UPDATE_DATABASE.sql` script
- [ ] Try upload again

### Production Delete Test
- [ ] Delete the test file from admin
- [ ] File disappears from library
- [ ] Check Supabase storage - file is gone
- [ ] Check Supabase database - record is gone

### Mobile Testing
- [ ] Open production URL on mobile device
- [ ] Homepage displays correctly
- [ ] Navigation menu works
- [ ] Library is readable
- [ ] Can view/download resources
- [ ] Admin login works on mobile

### Browser Compatibility
Test on multiple browsers:
- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari (if on Mac/iOS)

### Performance Testing
- [ ] Page loads in < 3 seconds
- [ ] Compass animation is smooth (no lag)
- [ ] Image/file loading is reasonable
- [ ] No layout shifts during page load

---

## 🔐 Security Testing

### Admin Protection
- [ ] Cannot access `/admin` without logging in (redirects to `/login`)
- [ ] Wrong password shows error
- [ ] `ADMIN_PASSWORD` not visible in page source
- [ ] `ADMIN_PASSWORD` not in browser console

### Database Access
- [ ] Public can view resources (expected)
- [ ] Public cannot see Supabase credentials in source code
- [ ] Anon key is public (expected for client-side access)
- [ ] Database password is NOT exposed anywhere

### File Access
- [ ] Anyone can view/download files (expected - public bucket)
- [ ] File URLs are direct Supabase Storage URLs
- [ ] No server-side proxy needed

---

## 📊 Data Verification

### Database Check
- [ ] Go to Supabase → Table Editor → resources
- [ ] Verify all uploaded resources are listed
- [ ] Check that `file_path` column has values
- [ ] Check that `pdf_url` column has valid URLs
- [ ] Verify timestamps are correct

### Storage Check
- [ ] Go to Supabase → Storage → archives
- [ ] Files are organized by category folder
- [ ] File names include timestamp prefix
- [ ] File sizes match uploaded files
- [ ] No orphaned files (files without database entries)

---

## 🐛 Error Scenarios to Test

### Network Errors
- [ ] Try uploading with slow internet - does it timeout? (should not)
- [ ] Try visiting library with no internet - shows appropriate error

### Edge Cases
- [ ] Upload file with special characters in name (should work)
- [ ] Upload very long title (should work or show validation)
- [ ] Upload empty form (should show validation error)
- [ ] Try accessing admin while logged out (should redirect)

### Browser Console
- [ ] No JavaScript errors on homepage
- [ ] No JavaScript errors on library page
- [ ] No JavaScript errors on admin page
- [ ] No 404 errors for resources
- [ ] No CORS errors

---

## ✅ Final Acceptance Criteria

All of these must be true for production approval:

- [ ] ✅ Site loads on production URL
- [ ] ✅ Homepage displays correctly
- [ ] ✅ Library shows resources
- [ ] ✅ Admin login works
- [ ] ✅ File upload works (small and large files)
- [ ] ✅ File delete works (removes from storage)
- [ ] ✅ Mobile responsive
- [ ] ✅ No console errors
- [ ] ✅ Supabase database has correct data
- [ ] ✅ Supabase storage has files
- [ ] ✅ Environment variables configured
- [ ] ✅ Code pushed to GitHub
- [ ] ✅ Documentation complete

---

## 📝 Test Results Template

Use this template to document your testing:

```
## Test Session: [Date]

**Environment:** Local / Production
**URL:** [Your Vercel URL]
**Tester:** [Your Name]

### Homepage
- Status: ✅ / ❌
- Notes:

### Library
- Status: ✅ / ❌
- Notes:

### Admin Login
- Status: ✅ / ❌
- Notes:

### File Upload
- Small file: ✅ / ❌
- Large file: ✅ / ❌
- Notes:

### File Delete
- Status: ✅ / ❌
- Storage cleaned: ✅ / ❌
- Notes:

### Issues Found:
1.
2.
3.

### Overall Status: PASS / FAIL
```

---

## 🎯 Quick Smoke Test (5 minutes)

If you're short on time, run this minimal test:

1. **Visit homepage** - should load correctly
2. **Visit library** - should show resources or empty state
3. **Login to admin** - should work with correct password
4. **Upload a test file** - should succeed
5. **Check library** - file should appear
6. **Delete test file** - should disappear
7. **Check Supabase storage** - file should be gone

If all 7 steps pass ✅ - you're good to go!

---

**Remember:** Test early, test often. Every deployment should pass this checklist!

**Power to the people. Knowledge is freedom.** ✊
