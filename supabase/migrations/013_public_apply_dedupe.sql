-- 013: public_apply hardening (applied to prod 2026-06-11)
-- Reuse the existing candidate when the same email applies again within an org
-- (previously every application created a brand-new candidate row), and reject
-- duplicate applications to the same job within 24 hours so the public apply
-- endpoint cannot be used to spam an org's pipeline.

create or replace function public.public_apply(
  p_job uuid, p_name text, p_email text, p_phone text, p_role text,
  p_company text, p_storage_path text, p_file text, p_mime text, p_size integer
)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare v_org uuid; v_cand uuid; v_resume uuid; v_app uuid;
begin
  select organization_id into v_org from jobs where id = p_job and status = 'open';
  if v_org is null then raise exception 'Job not open'; end if;

  -- Reuse the candidate when the email already exists in this org.
  select id into v_cand from candidates
  where organization_id = v_org and lower(email) = lower(p_email)
  order by created_at asc limit 1;

  if v_cand is null then
    insert into candidates (organization_id, full_name, email, phone, "current_role", current_company, source)
    values (v_org, p_name, p_email, nullif(p_phone,''), nullif(p_role,''), nullif(p_company,''), 'careers')
    returning id into v_cand;
  else
    update candidates set
      full_name = coalesce(nullif(p_name,''), full_name),
      phone = coalesce(nullif(p_phone,''), phone),
      "current_role" = coalesce(nullif(p_role,''), "current_role"),
      current_company = coalesce(nullif(p_company,''), current_company)
    where id = v_cand;
  end if;

  -- Duplicate guard: one application per candidate+job per 24h.
  select id into v_app from applications
  where candidate_id = v_cand and job_id = p_job
    and created_at > now() - interval '24 hours'
  limit 1;
  if v_app is not null then
    return jsonb_build_object('duplicate', true, 'application_id', v_app, 'candidate_id', v_cand);
  end if;

  insert into resumes (organization_id, candidate_id, storage_path, file_name, mime_type, byte_size)
  values (v_org, v_cand, p_storage_path, p_file, p_mime, p_size) returning id into v_resume;

  insert into applications (organization_id, candidate_id, job_id, stage, analysis_status)
  values (v_org, v_cand, p_job, 'new', 'pending') returning id into v_app;

  return jsonb_build_object('organization_id',v_org,'candidate_id',v_cand,'resume_id',v_resume,'application_id',v_app);
end $function$;
