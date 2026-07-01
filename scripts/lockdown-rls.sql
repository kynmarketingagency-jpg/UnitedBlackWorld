-- ============================================================
-- United Black World — Lock down the resources table
-- Run this in the Supabase SQL Editor.
--
-- Why: RLS policies currently allow the anon role to INSERT and
-- DELETE rows in `resources`. The anon key ships in the site's
-- public JavaScript bundle, so anyone could delete catalog
-- records directly (this is how books went missing — 12 orphaned
-- PDFs in R2 whose records vanished are the fingerprint).
--
-- After this, all writes go through /api/resources, which checks
-- the admin session cookie and uses the service-role key
-- (service role bypasses RLS, so the app keeps working).
--
-- Safe to re-run. Each step is idempotent.
-- ============================================================

begin;

-- 1. Drop every non-SELECT policy on resources
do $$
declare p record;
begin
  for p in
    select policyname from pg_policies
    where schemaname = 'public'
      and tablename = 'resources'
      and cmd <> 'SELECT'
  loop
    execute format('drop policy %I on public.resources', p.policyname);
  end loop;
end $$;

-- 2. Ensure RLS is on and the public library can still read
alter table public.resources enable row level security;
drop policy if exists "resources public read" on public.resources;
create policy "resources public read"
  on public.resources for select using (true);

-- 3. Belt and suspenders: strip write privileges from public roles
--    (even a mistakenly recreated policy can't override a missing grant)
revoke insert, update, delete on table public.resources from anon, authenticated;

-- 4. Audit trail: log every future deletion, whoever performs it
create table if not exists public.resource_audit (
  id           bigserial primary key,
  action       text not null,
  resource_id  bigint,
  title        text,
  category     text,
  file_path    text,
  happened_at  timestamptz not null default now()
);

create or replace function public.log_resource_delete()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.resource_audit (action, resource_id, title, category, file_path)
  values ('delete', old.id, old.title, old.category, old.file_path);
  return old;
end $$;

drop trigger if exists resources_delete_audit on public.resources;
create trigger resources_delete_audit
  before delete on public.resources
  for each row execute function public.log_resource_delete();

commit;

-- ─── Verify ─────────────────────────────────────────────────
-- 1. This should list ONLY the "resources public read" SELECT policy:
--      select policyname, cmd, roles from pg_policies
--      where tablename = 'resources';
-- 2. Deletions now appear in:
--      select * from resource_audit order by happened_at desc;
