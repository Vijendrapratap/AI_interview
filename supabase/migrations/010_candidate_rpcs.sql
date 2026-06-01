-- 010_candidate_rpcs.sql — let candidates (anon) drive apply + interview WITHOUT a
-- service-role key, via SECURITY DEFINER RPCs with controlled logic + scoped
-- storage policies. Idempotent.

-- ── PUBLIC APPLY ────────────────────────────────────────────────────────────
create or replace function public.public_apply(
  p_job uuid, p_name text, p_email text, p_phone text, p_role text, p_company text,
  p_storage_path text, p_file text, p_mime text, p_size int
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_org uuid; v_cand uuid; v_resume uuid; v_app uuid;
begin
  select organization_id into v_org from jobs where id = p_job and status = 'open';
  if v_org is null then raise exception 'Job not open'; end if;

  insert into candidates (organization_id, full_name, email, phone, "current_role", current_company, source)
  values (v_org, p_name, p_email, nullif(p_phone,''), nullif(p_role,''), nullif(p_company,''), 'careers')
  returning id into v_cand;

  insert into resumes (organization_id, candidate_id, storage_path, file_name, mime_type, byte_size)
  values (v_org, v_cand, p_storage_path, p_file, p_mime, p_size) returning id into v_resume;

  insert into applications (organization_id, candidate_id, job_id, stage, analysis_status)
  values (v_org, v_cand, p_job, 'new', 'pending') returning id into v_app;

  return jsonb_build_object('organization_id',v_org,'candidate_id',v_cand,'resume_id',v_resume,'application_id',v_app);
end $$;
grant execute on function public.public_apply(uuid,text,text,text,text,text,text,text,text,int) to anon, authenticated;

-- Save a screening result (used by both the authed recruiter path and the anon
-- public-apply path, so it always works regardless of session).
create or replace function public.save_resume_analysis(
  p_application uuid, p_resume uuid, p_job uuid, p_org uuid,
  p_overall numeric, p_ats numeric, p_breakdown jsonb, p_red jsonb,
  p_found text[], p_missing text[], p_recommendation text
) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into resume_analyses (organization_id, resume_id, job_id, overall_score, ats_score, breakdown, red_flags, skills_found, skills_missing)
  values (p_org, p_resume, p_job, p_overall, p_ats, p_breakdown, p_red, p_found, p_missing);
  update applications set ai_score = p_overall, recommendation = p_recommendation,
    analysis_status = 'complete', analysis_error = null where id = p_application;
end $$;
grant execute on function public.save_resume_analysis(uuid,uuid,uuid,uuid,numeric,numeric,jsonb,jsonb,text[],text[],text) to anon, authenticated;

-- Status updates that work from both the authed and anon screening paths.
create or replace function public.set_analysis_status(p_app uuid, p_status analysis_status, p_error text)
returns void language sql security definer set search_path = public as $$
  update applications set analysis_status = p_status, analysis_error = p_error where id = p_app;
$$;
grant execute on function public.set_analysis_status(uuid, analysis_status, text) to anon, authenticated;

-- ── CANDIDATE INTERVIEW (by token) ─────────────────────────────────────────
create or replace function public.get_interview(p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v jsonb;
begin
  select jsonb_build_object(
    'id', s.id, 'status', s.status, 'questions', s.questions,
    'invited_name', s.invited_name, 'job_id', s.job_id,
    'job_title', coalesce(j.title,'the role'),
    'application_id', s.application_id, 'organization_id', s.organization_id,
    'resume_score', (select a.ai_score from applications a where a.id = s.application_id)
  ) into v
  from interview_sessions s left join jobs j on j.id = s.job_id
  where s.public_token = p_token;
  return v; -- null if not found
end $$;
grant execute on function public.get_interview(text) to anon, authenticated;

create or replace function public.start_interview(p_token text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update interview_sessions set status = 'in_progress', started_at = now()
  where public_token = p_token and status = 'created';
end $$;
grant execute on function public.start_interview(text) to anon, authenticated;

create or replace function public.submit_interview(p_token text, p_transcript jsonb, p_tabs int, p_recording text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v jsonb;
begin
  update interview_sessions set transcript = p_transcript, status = 'completed',
    ended_at = now(), tab_switch_count = coalesce(p_tabs,0),
    recording_url = coalesce(p_recording, recording_url)
  where public_token = p_token and status <> 'completed';
  select jsonb_build_object('id',s.id,'job_id',s.job_id,'application_id',s.application_id,
    'questions',s.questions,'job_title',coalesce(j.title,'the role'),'already', (s.status='completed' and s.is_analysed))
  into v from interview_sessions s left join jobs j on j.id=s.job_id where s.public_token = p_token;
  return v;
end $$;
grant execute on function public.submit_interview(text,jsonb,int,text) to anon, authenticated;

create or replace function public.save_interview_result(
  p_token text, p_scores jsonb, p_overall numeric, p_recommendation text, p_decision jsonb
) returns void language plpgsql security definer set search_path = public as $$
declare v_session uuid; v_app uuid;
begin
  update interview_sessions set scores = p_scores, overall_score = p_overall,
    recommendation = p_recommendation, is_analysed = true
  where public_token = p_token returning id, application_id into v_session, v_app;
  if v_session is not null then
    insert into interview_reports (session_id, summary, scorecard, recommendation)
    values (v_session, coalesce(p_scores->>'summary',''), p_scores, p_recommendation)
    on conflict (session_id) do update set summary = excluded.summary, scorecard = excluded.scorecard, recommendation = excluded.recommendation;
  end if;
  if v_app is not null and p_decision is not null then
    update applications set decision = p_decision where id = v_app;
  end if;
end $$;
grant execute on function public.save_interview_result(text,jsonb,numeric,text,jsonb) to anon, authenticated;

-- ── STORAGE POLICIES (anon upload; org members read) ───────────────────────
-- resumes: anon may upload (public apply); org members may read their org's files.
drop policy if exists "anon upload resumes" on storage.objects;
create policy "anon upload resumes" on storage.objects for insert to anon
  with check (bucket_id = 'resumes');
drop policy if exists "members read resumes" on storage.objects;
create policy "members read resumes" on storage.objects for select to authenticated
  using (bucket_id = 'resumes' and (storage.foldername(name))[1] in (
    select organization_id::text from organization_members where user_id = auth.uid()));

-- interview-recordings: anon may upload (candidate); org members may read (signed URLs).
drop policy if exists "anon upload recordings" on storage.objects;
create policy "anon upload recordings" on storage.objects for insert to anon
  with check (bucket_id = 'interview-recordings');
drop policy if exists "members read recordings" on storage.objects;
create policy "members read recordings" on storage.objects for select to authenticated
  using (bucket_id = 'interview-recordings' and (storage.foldername(name))[1] in (
    select organization_id::text from organization_members where user_id = auth.uid()));
