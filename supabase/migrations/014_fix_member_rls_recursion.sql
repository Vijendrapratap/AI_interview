-- 014: fix infinite recursion in organization_members RLS (applied to prod 2026-06-13)
--
-- members_owner_admin_write is FOR ALL, so it is also evaluated for SELECT. Its
-- USING/WITH CHECK subquery reads organization_members directly, which re-applies
-- this same policy to that inner read -> Postgres errors 42P17 "infinite
-- recursion detected in policy". Every org-scoped read (incl. the dashboard's
-- org lookup) then 500s, bouncing all users to /onboarding.
--
-- Fix: route the owner/admin check through a SECURITY DEFINER function (which
-- bypasses RLS, exactly like the existing user_org_ids()), so the policy no
-- longer references its own table under RLS. Same pattern, no recursion.

create or replace function user_admin_org_ids() returns setof uuid
language sql stable security definer set search_path = public as $$
  select organization_id from organization_members
  where user_id = (select auth.uid()) and role in ('owner','admin');
$$;

drop policy if exists members_owner_admin_write on organization_members;
create policy members_owner_admin_write on organization_members for all
  using (organization_id in (select user_admin_org_ids()))
  with check (organization_id in (select user_admin_org_ids()));

-- organizations.orgs_owner_admin_update has the same self-referential shape
-- against organization_members; route it through the helper too so an org
-- read triggered from that policy can't recurse either.
drop policy if exists orgs_owner_admin_update on organizations;
create policy orgs_owner_admin_update on organizations for update
  using (id in (select user_admin_org_ids()));
