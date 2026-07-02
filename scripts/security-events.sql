-- ============================================================
-- United Black World — Security event log
-- Run this in the Supabase SQL Editor (after lockdown-rls.sql).
--
-- Stores blocked/failed access attempts so the admin "Security"
-- page can show who has been trying funny things (IP + browser +
-- what they tried). Written only by the server (service role);
-- locked to anon/authenticated so it can't be read or tampered
-- with from the public key.
--
-- Safe to re-run.
-- ============================================================

create table if not exists public.security_events (
  id          bigserial primary key,
  event_type  text not null,     -- login_failed | delete_files_denied | upload_denied | resource_create_denied | resource_delete_denied
  ip          text,
  user_agent  text,
  detail      text,
  created_at  timestamptz not null default now()
);

create index if not exists security_events_created_at
  on public.security_events (created_at desc);

alter table public.security_events enable row level security;
-- No policies -> only the service-role key (server) can touch it.
revoke all on table public.security_events from anon, authenticated;

-- ─── Verify ─────────────────────────────────────────────────
--   select * from security_events order by created_at desc limit 50;
