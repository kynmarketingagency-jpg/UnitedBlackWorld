-- Database schema updates for United Black World
-- Run this in Supabase SQL Editor

-- Add file_path column for reliable deletion
ALTER TABLE resources
ADD COLUMN IF NOT EXISTS file_path TEXT;

-- Add thumbnail_url for book cover images (auto-generated from PDF)
ALTER TABLE resources
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- Add youtube_url for videos and audio (replaces direct file uploads)
ALTER TABLE resources
ADD COLUMN IF NOT EXISTS youtube_url TEXT;

-- Add twitter_url for Twitter/X live videos and spaces
ALTER TABLE resources
ADD COLUMN IF NOT EXISTS twitter_url TEXT;

-- Add instagram_url for Instagram reels and videos
ALTER TABLE resources
ADD COLUMN IF NOT EXISTS instagram_url TEXT;

-- Add tiktok_url for TikTok videos
ALTER TABLE resources
ADD COLUMN IF NOT EXISTS tiktok_url TEXT;

-- Update existing records to extract file_path from pdf_url
UPDATE resources
SET file_path =
  CASE
    WHEN pdf_url LIKE '%/archives/%'
    THEN substring(pdf_url from '/archives/(.+)$')
    ELSE NULL
  END
WHERE file_path IS NULL;

-- Note: After running this, you can start using the new features:
-- Books: PDF upload with auto-generated thumbnail
-- Videos: YouTube URL embed (no file upload)
-- Audio: YouTube URL embed (no file upload)
