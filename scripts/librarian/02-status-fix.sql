-- Add 'extracted' and 'embedded' to the allowed librarian_books.status values,
-- so the two-stage pipeline can track which phase each book is in.
--
-- Statuses now mean:
--   pending     queued, no work started
--   processing  a stage is currently running
--   extracted   stage 1 done (text JSON on disk)
--   embedded    stage 2 done (chunks + vectors in Supabase)
--   failed      something went wrong (see error_message)
--   skipped     intentionally skipped (e.g. scanned PDFs needing OCR)
--
-- Run once in the Supabase SQL editor.

alter table librarian_books
  drop constraint if exists librarian_books_status_check;

alter table librarian_books
  add constraint librarian_books_status_check
  check (status in ('pending','processing','extracted','embedded','failed','skipped'));
