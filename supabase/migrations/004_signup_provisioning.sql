-- 004_signup_provisioning.sql — org provisioning that bypasses the RLS chicken-and-egg.
-- Idempotent: safe to re-run.

create or replace function public.provision_organization(org_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org_id uuid;
begin
  insert into organizations (name, slug)
  values (
    org_name,
    lower(regexp_replace(org_name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(gen_random_uuid()::text, 1, 8)
  )
  returning id into new_org_id;

  -- Idempotent: migration 001's organizations_owner_trigger already adds the
  -- creator as owner; ON CONFLICT makes this a no-op when that has happened.
  insert into organization_members (organization_id, user_id, role)
  values (new_org_id, auth.uid(), 'owner')
  on conflict (organization_id, user_id) do nothing;

  return new_org_id;
end;
$$;

revoke all on function public.provision_organization(text) from public, anon;
grant execute on function public.provision_organization(text) to authenticated;

create or replace function public.accept_invitation(invite_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  inv public.invitations%rowtype;
begin
  select * into inv from public.invitations
  where token = invite_token and accepted_at is null and expires_at > now();
  if not found then
    raise exception 'Invalid or expired invitation';
  end if;

  insert into organization_members (organization_id, user_id, role)
  values (inv.organization_id, auth.uid(), inv.role)
  on conflict (organization_id, user_id) do nothing;

  update public.invitations set accepted_at = now() where id = inv.id;
  return inv.organization_id;
end;
$$;

revoke all on function public.accept_invitation(text) from public, anon;
grant execute on function public.accept_invitation(text) to authenticated;
