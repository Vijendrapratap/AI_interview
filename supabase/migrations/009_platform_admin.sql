-- 009_platform_admin.sql — Layer 3 (Pratap AI platform owner) super-admin.
-- A platform admin sits ABOVE all organizations and can read across every org.
-- Idempotent: safe to re-run.

create table if not exists public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.platform_admins enable row level security;

-- security-definer check (no recursion: reads platform_admins, not the gated tables)
create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.platform_admins where user_id = auth.uid());
$$;
grant execute on function public.is_platform_admin() to authenticated;

-- A platform admin can see the admin list; nobody else can.
drop policy if exists "platform admins read admins" on public.platform_admins;
create policy "platform admins read admins" on public.platform_admins
  for select to authenticated using (public.is_platform_admin());

-- Cross-org READ for platform admins on the core tables (additive — OR'd with the
-- existing org-member policies, so normal recruiters are unaffected).
do $$
declare t text;
begin
  foreach t in array array[
    'organizations','organization_members','jobs','candidates','applications',
    'resumes','resume_analyses','interview_sessions','interview_reports'
  ] loop
    execute format('drop policy if exists "platform admin read %1$s" on public.%1$s;', t);
    execute format(
      'create policy "platform admin read %1$s" on public.%1$s for select to authenticated using (public.is_platform_admin());',
      t
    );
  end loop;
end $$;

-- ── Team management (Layer 2 company admin) ────────────────────────────────
-- Members with their email/name (auth.users isn't readable directly under RLS).
create or replace function public.org_members(p_org uuid)
returns table(user_id uuid, role org_role, email text, full_name text, created_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select m.user_id, m.role, u.email::text, (u.raw_user_meta_data->>'full_name'), m.created_at
  from organization_members m
  join auth.users u on u.id = m.user_id
  where m.organization_id = p_org
    and (
      exists (select 1 from organization_members me where me.organization_id = p_org and me.user_id = auth.uid())
      or public.is_platform_admin()
    )
  order by m.created_at;
$$;
grant execute on function public.org_members(uuid) to authenticated;

-- Change a member's role (owner/admin or platform admin only).
create or replace function public.set_member_role(p_org uuid, p_user uuid, p_role org_role)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from organization_members
    where organization_id = p_org and user_id = auth.uid() and role in ('owner','admin')
  ) and not public.is_platform_admin() then
    raise exception 'Not authorized';
  end if;
  update organization_members set role = p_role where organization_id = p_org and user_id = p_user;
end $$;
grant execute on function public.set_member_role(uuid, uuid, org_role) to authenticated;

-- Remove a member (owner/admin or platform admin only; never the last owner).
create or replace function public.remove_member(p_org uuid, p_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from organization_members
    where organization_id = p_org and user_id = auth.uid() and role in ('owner','admin')
  ) and not public.is_platform_admin() then
    raise exception 'Not authorized';
  end if;
  if (select role from organization_members where organization_id = p_org and user_id = p_user) = 'owner'
     and (select count(*) from organization_members where organization_id = p_org and role = 'owner') <= 1 then
    raise exception 'Cannot remove the last owner';
  end if;
  delete from organization_members where organization_id = p_org and user_id = p_user;
end $$;
grant execute on function public.remove_member(uuid, uuid) to authenticated;

-- ── Platform-admin cross-org rollup (Layer 3) ──────────────────────────────
create or replace function public.platform_overview()
returns table(
  org_id uuid, org_name text, created_at timestamptz,
  members bigint, jobs bigint, candidates bigint, applications bigint, interviews bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select o.id, o.name, o.created_at,
    (select count(*) from organization_members m where m.organization_id = o.id),
    (select count(*) from jobs j where j.organization_id = o.id),
    (select count(*) from candidates c where c.organization_id = o.id),
    (select count(*) from applications a where a.organization_id = o.id),
    (select count(*) from interview_sessions s where s.organization_id = o.id)
  from organizations o
  where public.is_platform_admin()
  order by o.created_at desc;
$$;
grant execute on function public.platform_overview() to authenticated;

-- Per-recruiter performance for the company-admin dashboard (owner/admin only).
create or replace function public.org_recruiter_stats(p_org uuid)
returns table(user_id uuid, jobs bigint, applications bigint, hires bigint, interviews bigint)
language sql
stable
security definer
set search_path = public
as $$
  select m.user_id,
    (select count(*) from jobs j where j.organization_id = p_org and j.created_by = m.user_id),
    (select count(*) from applications a where a.organization_id = p_org and a.owner_id = m.user_id),
    (select count(*) from applications a where a.organization_id = p_org and a.owner_id = m.user_id and a.stage = 'hired'),
    (select count(*) from interview_sessions s
       where s.organization_id = p_org
         and s.candidate_id in (select a.candidate_id from applications a where a.organization_id = p_org and a.owner_id = m.user_id))
  from organization_members m
  where m.organization_id = p_org
    and (
      exists (select 1 from organization_members me where me.organization_id = p_org and me.user_id = auth.uid() and me.role in ('owner','admin'))
      or public.is_platform_admin()
    );
$$;
grant execute on function public.org_recruiter_stats(uuid) to authenticated;

-- Seed the platform owner (no-op if the user hasn't signed up yet; re-run later).
insert into public.platform_admins (user_id)
select id from auth.users where lower(email) = 'autonoeticedge@gmail.com'
on conflict (user_id) do nothing;
