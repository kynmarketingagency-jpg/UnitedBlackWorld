-- Add file_path column to resources table for reliable deletion
-- Run this in Supabase SQL Editor

ALTER TABLE resources
ADD COLUMN IF NOT EXISTS file_path TEXT;

-- Update existing records to extract file_path from pdf_url
-- This will fix any existing uploads
UPDATE resources
SET file_path =
  CASE
    WHEN pdf_url LIKE '%/archives/%'
    THEN substring(pdf_url from '/archives/(.+)$')
    ELSE NULL
  END
WHERE file_path IS NULL;
