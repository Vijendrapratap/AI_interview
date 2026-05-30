-- 007_signup_org_trigger.sql — provision an organization at auth.users insert.
-- Fixes B1: signup with email-confirmation ON has no session yet, so auth.uid()
-- is NULL and the old client-called provision_organization() RPC failed,
-- leaving users with no org (which then 500'd every org-scoped page = B2).
-- This trigger runs as the table owner using NEW.id, so it never depends on a
-- session. Idempotent: safe to re-run.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_name text;
  v_org_id uuid;
begin
  -- Prefer an explicit org name from signup metadata; fall back to the user's
  -- name or email local-part so a workspace always exists.
  v_org_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'org_name'), ''),
    nullif(trim(new.raw_user_meta_data->>'full_name'), '') || '''s workspace',
    nullif(split_part(coalesce(new.email, ''), '@', 1), '') || '''s workspace',
    'My workspace'
  );

  insert into public.organizations (name, slug)
  values (
    v_org_name,
    lower(regexp_replace(v_org_name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(gen_random_uuid()::text, 1, 8)
  )
  returning id into v_org_id;

  -- NOTE: migration 001's organizations_owner_trigger only fires when
  -- auth.uid() is not null, so during signup (auth.uid() = null) it no-ops and
  -- this explicit insert is what makes the new user the owner.
  insert into public.organization_members (organization_id, user_id, role)
  values (v_org_id, new.id, 'owner')
  on conflict (organization_id, user_id) do nothing;

  return new;
exception
  when others then
    -- Never block account creation if provisioning hiccups; the app's
    -- ensureOrganization() fallback + /onboarding guard will recover.
    raise warning 'handle_new_user failed for %: %', new.id, sqlerrm;
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill: give any existing org-less users a workspace so they stop 500ing.
do $$
declare
  u record;
  v_org_id uuid;
  v_name text;
begin
  for u in
    select au.id, au.email, au.raw_user_meta_data
    from auth.users au
    where not exists (
      select 1 from public.organization_members m where m.user_id = au.id
    )
  loop
    v_name := coalesce(
      nullif(trim(u.raw_user_meta_data->>'org_name'), ''),
      nullif(trim(u.raw_user_meta_data->>'full_name'), '') || '''s workspace',
      nullif(split_part(coalesce(u.email, ''), '@', 1), '') || '''s workspace',
      'My workspace'
    );
    insert into public.organizations (name, slug)
    values (v_name, lower(regexp_replace(v_name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(gen_random_uuid()::text, 1, 8))
    returning id into v_org_id;
    insert into public.organization_members (organization_id, user_id, role)
    values (v_org_id, u.id, 'owner')
    on conflict (organization_id, user_id) do nothing;
  end loop;
end $$;
