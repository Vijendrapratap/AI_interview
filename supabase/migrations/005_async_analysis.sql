-- 005_async_analysis.sql — async screening status + Realtime.
-- Idempotent: safe to re-run.

do $$ begin
  create type analysis_status as enum ('pending','processing','complete','failed');
exception when duplicate_object then null; end $$;

alter table public.applications
  add column if not exists analysis_status analysis_status not null default 'pending',
  add column if not exists analysis_error text;

-- Live updates to open Pipeline / Candidate views.
do $$ begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'applications'
  ) then
    alter publication supabase_realtime add table public.applications;
  end if;
end $$;
