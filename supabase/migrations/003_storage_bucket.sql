-- Resumes storage bucket with org-scoped policies.
-- Idempotent.

insert into storage.buckets (id, name, public)
values ('resumes', 'resumes', false)
on conflict (id) do nothing;

drop policy if exists resume_uploads_member_insert on storage.objects;
drop policy if exists resume_objects_member_select on storage.objects;
drop policy if exists resume_objects_member_delete on storage.objects;

create policy resume_uploads_member_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'resumes'
    and (storage.foldername(name))[1] in (
      select organization_id::text from organization_members where user_id = auth.uid()
    )
  );

create policy resume_objects_member_select on storage.objects for select to authenticated
  using (
    bucket_id = 'resumes'
    and (storage.foldername(name))[1] in (
      select organization_id::text from organization_members where user_id = auth.uid()
    )
  );

create policy resume_objects_member_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'resumes'
    and (storage.foldername(name))[1] in (
      select organization_id::text from organization_members where user_id = auth.uid()
    )
  );
