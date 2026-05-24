-- Migration 006: Platform Connections & Job Publications
-- Idempotent: safe to run multiple times.

-- Create table platform_connections
create table if not exists public.platform_connections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  platform text not null,
  status text not null default 'connected',
  settings jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique (organization_id, platform)
);

-- Enable RLS on platform_connections
alter table public.platform_connections enable row level security;

-- Drop existing policies if they exist to make it idempotent
drop policy if exists "Allow org members to read connections" on public.platform_connections;
drop policy if exists "Allow org members to insert connections" on public.platform_connections;
drop policy if exists "Allow org members to update connections" on public.platform_connections;
drop policy if exists "Allow org members to delete connections" on public.platform_connections;

-- Create policies for platform_connections
create policy "Allow org members to read connections" on public.platform_connections
  for select to authenticated
  using (
    organization_id in (
      select organization_id from public.organization_members where user_id = auth.uid()
    )
  );

create policy "Allow org members to insert connections" on public.platform_connections
  for insert to authenticated
  with check (
    organization_id in (
      select organization_id from public.organization_members where user_id = auth.uid()
    )
  );

create policy "Allow org members to update connections" on public.platform_connections
  for update to authenticated
  using (
    organization_id in (
      select organization_id from public.organization_members where user_id = auth.uid()
    )
  )
  with check (
    organization_id in (
      select organization_id from public.organization_members where user_id = auth.uid()
    )
  );

create policy "Allow org members to delete connections" on public.platform_connections
  for delete to authenticated
  using (
    organization_id in (
      select organization_id from public.organization_members where user_id = auth.uid()
    )
  );


-- Create table job_publications
create table if not exists public.job_publications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  platform text not null,
  status text not null default 'published',
  published_url text,
  created_at timestamptz not null default now(),
  unique (job_id, platform)
);

-- Enable RLS on job_publications
alter table public.job_publications enable row level security;

-- Drop existing policies if they exist to make it idempotent
drop policy if exists "Allow org members to read publications" on public.job_publications;
drop policy if exists "Allow org members to insert publications" on public.job_publications;
drop policy if exists "Allow org members to update publications" on public.job_publications;
drop policy if exists "Allow org members to delete publications" on public.job_publications;

-- Create policies for job_publications
create policy "Allow org members to read publications" on public.job_publications
  for select to authenticated
  using (
    organization_id in (
      select organization_id from public.organization_members where user_id = auth.uid()
    )
  );

create policy "Allow org members to insert publications" on public.job_publications
  for insert to authenticated
  with check (
    organization_id in (
      select organization_id from public.organization_members where user_id = auth.uid()
    )
  );

create policy "Allow org members to update publications" on public.job_publications
  for update to authenticated
  using (
    organization_id in (
      select organization_id from public.organization_members where user_id = auth.uid()
    )
  )
  with check (
    organization_id in (
      select organization_id from public.organization_members where user_id = auth.uid()
    )
  );

create policy "Allow org members to delete publications" on public.job_publications
  for delete to authenticated
  using (
    organization_id in (
      select organization_id from public.organization_members where user_id = auth.uid()
    )
  );

-- Grant privileges to authenticated and service_role for Data API access
grant all on table public.platform_connections to authenticated, service_role;
grant all on table public.job_publications to authenticated, service_role;
