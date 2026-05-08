-- ============================================================
-- Librarian — trim to fit Supabase Free tier (500 MB cap)
-- ============================================================
-- Caps every book at its first 150 chunks. Books with fewer
-- chunks are untouched. Keeps every book searchable in the
-- librarian (so the user never sees "this book has nothing"),
-- just with shallower per-book depth on long books.
--
-- Expected outcome:
--   ~221k rows  →  ~75k rows
--   ~1.0 GB     →  ~0.33 GB (table + HNSW index)
-- ============================================================

-- 1. Drop everything past chunk 149 in every book.
delete from librarian_chunks
 where chunk_index >= 150;

-- 2. Reclaim space and shrink the file on disk so Supabase's
--    storage meter actually drops. Without this, the rows are
--    marked dead but the file size stays the same until the
--    next autovacuum cycle.
--
--    VACUUM FULL takes an exclusive lock on the table. Skip it
--    if anything else is hitting librarian_chunks; standard
--    autovacuum will catch up within an hour or so.
vacuum full librarian_chunks;

-- 3. Rebuild the HNSW index so it reflects the smaller dataset.
--    Otherwise the index file keeps its old size on disk.
reindex index librarian_chunks_embedding_hnsw;

-- 4. (Optional) update the per-book chunks_count so the
--    librarian_books status table matches reality.
update librarian_books b
   set chunks_count = (
     select count(*) from librarian_chunks c
     where c.resource_id = b.resource_id
   ),
   updated_at = now()
 where b.status = 'embedded';
