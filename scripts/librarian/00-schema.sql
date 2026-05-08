-- ============================================================
-- United Black World — Librarian: fresh schema
-- Run once in Supabase SQL Editor.
--
-- This is a clean, self-contained set of tables prefixed
-- `librarian_*`. It does NOT touch any existing tables
-- (resources, document_chunks, ingestion_status, etc.).
--
-- Embedding model: BAAI/bge-small-en-v1.5  (384 dims, local)
-- Distance metric: cosine
-- ============================================================

create extension if not exists vector;

-- ─── Chunks (text + embedding + citation) ───────────────────
create table if not exists librarian_chunks (
  id            bigserial primary key,
  resource_id   bigint not null references resources(id) on delete cascade,
  book_title    text not null,
  author        text,
  page_number   int  not null,
  chunk_index   int  not null,
  content       text not null,
  char_count    int  not null,
  embedding     vector(384) not null,
  created_at    timestamptz not null default now(),
  unique (resource_id, chunk_index)
);

create index if not exists librarian_chunks_resource_id
  on librarian_chunks (resource_id);

-- HNSW index for fast cosine similarity at query time.
create index if not exists librarian_chunks_embedding_hnsw
  on librarian_chunks
  using hnsw (embedding vector_cosine_ops);

-- ─── Per-book ingestion status (resume support) ─────────────
create table if not exists librarian_books (
  resource_id    bigint primary key references resources(id) on delete cascade,
  status         text not null check (status in ('pending','processing','completed','failed','skipped')),
  pages_count    int,
  chunks_count   int,
  error_message  text,
  started_at     timestamptz,
  completed_at   timestamptz,
  updated_at     timestamptz not null default now()
);

create index if not exists librarian_books_status
  on librarian_books (status);

-- ─── Session memory ("welcome back, comrade") ───────────────
create table if not exists librarian_sessions (
  session_id        text primary key,
  last_query        text,
  last_resource_id  bigint references resources(id) on delete set null,
  last_page_number  int,
  turn_count        int  not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists librarian_sessions_updated_at
  on librarian_sessions (updated_at desc);

-- ─── Search RPC ─────────────────────────────────────────────
-- Returns top-k chunks with cosine similarity. The librarian
-- API calls this with the user's embedded question.
create or replace function librarian_search(
  query_embedding vector(384),
  match_count     int   default 8,
  match_threshold float default 0.0
)
returns table (
  id           bigint,
  resource_id  bigint,
  book_title   text,
  author       text,
  page_number  int,
  chunk_index  int,
  content      text,
  similarity   float
)
language sql stable
as $$
  select
    c.id,
    c.resource_id,
    c.book_title,
    c.author,
    c.page_number,
    c.chunk_index,
    c.content,
    1 - (c.embedding <=> query_embedding) as similarity
  from librarian_chunks c
  where 1 - (c.embedding <=> query_embedding) > match_threshold
  order by c.embedding <=> query_embedding
  limit match_count;
$$;
