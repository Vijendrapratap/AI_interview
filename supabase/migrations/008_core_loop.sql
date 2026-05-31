-- 008_core_loop.sql — schema for the end-to-end recruiter loop:
-- public career page + apply, candidate-link interviews, approval-gated emails,
-- stage history, and resume+interview decision fusion.
-- Idempotent: safe to re-run.

-- ── JOBS: public career page ────────────────────────────────────────────────
alter table public.jobs
  add column if not exists slug text,
  add column if not exists published boolean not null default false,
  add column if not exists publish_salary boolean not null default true;

-- unique slug per job (nullable until set)
create unique index if not exists jobs_slug_key on public.jobs (slug) where slug is not null;

-- backfill slugs for existing jobs
update public.jobs
  set slug = lower(regexp_replace(coalesce(nullif(trim(title), ''), 'job'), '[^a-zA-Z0-9]+', '-', 'g'))
             || '-' || substr(id::text, 1, 8)
  where slug is null;

-- Public can read ONLY published jobs (anon role). Recruiter RLS (002) still applies for members.
drop policy if exists "Public can read published jobs" on public.jobs;
create policy "Public can read published jobs" on public.jobs
  for select to anon
  using (published = true);

-- ── INTERVIEW SESSIONS: candidate link + questions + scoring ────────────────
alter table public.interview_sessions
  add column if not exists public_token text,
  add column if not exists questions jsonb not null default '[]',
  add column if not exists invited_email text,
  add column if not exists invited_name text,
  add column if not exists overall_score numeric(5,2),
  add column if not exists recommendation text,
  add column if not exists is_analysed boolean not null default false,
  add column if not exists tab_switch_count int not null default 0,
  add column if not exists application_id uuid references public.applications(id) on delete set null;

create unique index if not exists interview_sessions_public_token_key
  on public.interview_sessions (public_token) where public_token is not null;

-- ── EMAIL OUTBOX: approval-gated automation ─────────────────────────────────
create table if not exists public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  application_id uuid references public.applications(id) on delete set null,
  candidate_id uuid references public.candidates(id) on delete set null,
  job_id uuid references public.jobs(id) on delete set null,
  to_email text not null,
  action_type text not null,                 -- assessment | interview_invite | rejection | offer | custom
  trigger_stage app_stage,
  subject text not null,
  body_html text not null default '',
  body_text text not null default '',
  status text not null default 'draft',       -- draft | pending | sending | sent | failed | canceled
  dedupe_key text,
  provider_message_id text,
  retry_count int not null default 0,
  next_attempt_at timestamptz,
  last_error text,
  created_by uuid references auth.users(id),
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, dedupe_key)
);
create index if not exists email_outbox_org_status_idx on public.email_outbox (organization_id, status);
alter table public.email_outbox enable row level security;
drop policy if exists "org members manage outbox" on public.email_outbox;
create policy "org members manage outbox" on public.email_outbox
  for all to authenticated
  using (organization_id in (select organization_id from public.organization_members where user_id = auth.uid()))
  with check (organization_id in (select organization_id from public.organization_members where user_id = auth.uid()));

-- ── STAGE EVENTS: pipeline transition history ───────────────────────────────
create table if not exists public.stage_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  application_id uuid not null references public.applications(id) on delete cascade,
  from_stage app_stage,
  to_stage app_stage not null,
  actor_id uuid references auth.users(id),
  note text,
  created_at timestamptz not null default now()
);
create index if not exists stage_events_app_idx on public.stage_events (application_id, created_at);
alter table public.stage_events enable row level security;
drop policy if exists "org members read stage events" on public.stage_events;
create policy "org members read stage events" on public.stage_events
  for select to authenticated
  using (organization_id in (select organization_id from public.organization_members where user_id = auth.uid()));
drop policy if exists "org members write stage events" on public.stage_events;
create policy "org members write stage events" on public.stage_events
  for insert to authenticated
  with check (organization_id in (select organization_id from public.organization_members where user_id = auth.uid()));

-- ── DECISION FUSION: resume + interview -> recommendation ───────────────────
alter table public.applications
  add column if not exists decision jsonb;

-- ── GRANTS (service_role used by public/candidate server routes; authenticated for recruiters)
grant all on table public.email_outbox to authenticated, service_role;
grant all on table public.stage_events to authenticated, service_role;
