-- Make pdf_url nullable so video/audio resources don't require a PDF
ALTER TABLE resources ALTER COLUMN pdf_url DROP NOT NULL;

-- Also make file_path nullable since video/audio don't have file paths
ALTER TABLE resources ALTER COLUMN file_path DROP NOT NULL;
