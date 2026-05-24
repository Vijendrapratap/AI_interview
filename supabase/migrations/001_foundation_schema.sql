-- Foundation schema for ReCruItAI Slice 1
-- Tables, enums, indexes, owner trigger.
-- Idempotent: safe to re-run.

create extension if not exists "pgcrypto";

-- ENUMS
do $$ begin
  create type org_role as enum ('owner','admin','recruiter','hiring_manager','interviewer');
exception when duplicate_object then null; end $$;

do $$ begin
  create type job_status as enum ('draft','open','paused','closed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type app_stage as enum ('new','screening','interview','offer','hired','rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type session_status as enum ('created','in_progress','completed','abandoned');
exception when duplicate_object then null; end $$;

-- ORGS
create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists organization_members (
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role org_role not null default 'recruiter',
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);
create index if not exists organization_members_user_id_idx on organization_members (user_id);

create table if not exists invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  email text not null,
  role org_role not null default 'recruiter',
  token text not null unique,
  expires_at timestamptz not null,
  accepted_at timestamptz
);
create index if not exists invitations_org_idx on invitations (organization_id);

-- JOBS / CANDIDATES / APPLICATIONS
create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  title text not null,
  department text,
  location text,
  employment_type text not null default 'Full-time',
  salary_min int,
  salary_max int,
  currency text not null default 'USD',
  description text not null default '',
  requirements text[] not null default '{}',
  status job_status not null default 'open',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists jobs_org_status_idx on jobs (organization_id, status);

create table if not exists candidates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text,
  "current_role" text,
  current_company text,
  source text not null default 'manual',
  created_at timestamptz not null default now()
);
create index if not exists candidates_org_idx on candidates (organization_id);

create table if not exists applications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  candidate_id uuid not null references candidates(id) on delete cascade,
  job_id uuid not null references jobs(id) on delete cascade,
  stage app_stage not null default 'new',
  ai_score numeric(5,2),
  recommendation text,
  owner_id uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (candidate_id, job_id)
);
create index if not exists applications_org_stage_idx on applications (organization_id, stage);

-- RESUMES + ANALYSES
create table if not exists resumes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  candidate_id uuid references candidates(id) on delete set null,
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  byte_size int not null,
  uploaded_at timestamptz not null default now()
);
create index if not exists resumes_org_idx on resumes (organization_id);
create index if not exists resumes_candidate_idx on resumes (candidate_id);

create table if not exists resume_analyses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  resume_id uuid not null references resumes(id) on delete cascade,
  job_id uuid references jobs(id) on delete set null,
  overall_score numeric(5,2) not null default 0,
  ats_score numeric(5,2) not null default 0,
  breakdown jsonb not null default '{}',
  red_flags jsonb not null default '[]',
  skills_found text[] not null default '{}',
  skills_missing text[] not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists resume_analyses_org_idx on resume_analyses (organization_id);

-- INTERVIEWS
create table if not exists interview_sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  candidate_id uuid references candidates(id) on delete set null,
  job_id uuid references jobs(id) on delete set null,
  status session_status not null default 'created',
  mode text not null default 'voice',
  transcript jsonb not null default '[]',
  scores jsonb not null default '{}',
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists interview_sessions_org_idx on interview_sessions (organization_id);
create index if not exists interview_sessions_candidate_idx on interview_sessions (candidate_id);

create table if not exists interview_reports (
  session_id uuid primary key references interview_sessions(id) on delete cascade,
  summary text not null default '',
  scorecard jsonb not null default '{}',
  recommendation text,
  created_at timestamptz not null default now()
);

-- OWNER TRIGGER: when an org is created, the calling user becomes owner
create or replace function add_creator_as_owner()
returns trigger language plpgsql security definer as $$
begin
  if auth.uid() is not null then
    insert into organization_members (organization_id, user_id, role)
    values (new.id, auth.uid(), 'owner')
    on conflict do nothing;
  end if;
  return new;
end $$;

drop trigger if exists organizations_owner_trigger on organizations;
create trigger organizations_owner_trigger
after insert on organizations
for each row execute function add_creator_as_owner();
