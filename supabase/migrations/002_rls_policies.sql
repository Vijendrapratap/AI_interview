-- RLS policies for foundation tables.
-- Idempotent: drops existing policies before recreating.

-- Helper function: orgs the current user belongs to
create or replace function user_org_ids() returns setof uuid
language sql stable security definer as $$
  select organization_id from organization_members where user_id = auth.uid();
$$;

-- ORGANIZATIONS
alter table organizations enable row level security;
drop policy if exists orgs_member_select on organizations;
drop policy if exists orgs_authenticated_insert on organizations;
drop policy if exists orgs_owner_admin_update on organizations;

create policy orgs_member_select on organizations for select
  using (id in (select user_org_ids()));

create policy orgs_authenticated_insert on organizations for insert
  with check (auth.uid() is not null);

create policy orgs_owner_admin_update on organizations for update
  using (id in (
    select organization_id from organization_members
    where user_id = auth.uid() and role in ('owner','admin')
  ));

-- ORG MEMBERS
alter table organization_members enable row level security;
drop policy if exists members_self_select on organization_members;
drop policy if exists members_owner_admin_write on organization_members;

create policy members_self_select on organization_members for select
  using (organization_id in (select user_org_ids()));

create policy members_owner_admin_write on organization_members for all
  using (organization_id in (
    select organization_id from organization_members
    where user_id = auth.uid() and role in ('owner','admin')
  ))
  with check (organization_id in (
    select organization_id from organization_members
    where user_id = auth.uid() and role in ('owner','admin')
  ));

-- Generic per-table policies
do $$
declare t text;
begin
  for t in select unnest(array[
    'invitations','jobs','candidates','applications',
    'resumes','resume_analyses','interview_sessions'
  ]) loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists %I_member_select on %I', t, t);
    execute format('drop policy if exists %I_member_insert on %I', t, t);
    execute format('drop policy if exists %I_member_update on %I', t, t);
    execute format('drop policy if exists %I_admin_delete on %I', t, t);

    execute format($p$
      create policy %I_member_select on %I for select
        using (organization_id in (select user_org_ids()))
    $p$, t, t);

    execute format($p$
      create policy %I_member_insert on %I for insert
        with check (organization_id in (select user_org_ids()))
    $p$, t, t);

    execute format($p$
      create policy %I_member_update on %I for update
        using (organization_id in (select user_org_ids()))
        with check (organization_id in (select user_org_ids()))
    $p$, t, t);

    execute format($p$
      create policy %I_admin_delete on %I for delete
        using (organization_id in (
          select organization_id from organization_members
          where user_id = auth.uid() and role in ('owner','admin')
        ))
    $p$, t, t);
  end loop;
end $$;

-- interview_reports references session_id, not organization_id; custom policy
alter table interview_reports enable row level security;
drop policy if exists reports_member_all on interview_reports;
create policy reports_member_all on interview_reports for all
  using (session_id in (
    select id from interview_sessions where organization_id in (select user_org_ids())
  ))
  with check (session_id in (
    select id from interview_sessions where organization_id in (select user_org_ids())
  ));
