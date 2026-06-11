-- 012: production hardening (applied to prod 2026-06-11)
-- 1. Covering indexes for FKs flagged by the Supabase performance advisor.
-- 2. Pin search_path on the two remaining mutable-search_path functions.
-- 3. RLS initplan fix: wrap auth.uid() in (select auth.uid()) in every policy
--    so it is evaluated once per query instead of once per row.
-- 4. Interview link expiry: candidate tokens stop working 14 days after the
--    invite is created (unless the interview was already completed).

-- 1. FK covering indexes ------------------------------------------------------
create index if not exists idx_applications_job_id            on public.applications (job_id);
create index if not exists idx_applications_owner_id          on public.applications (owner_id);
create index if not exists idx_email_outbox_application_id    on public.email_outbox (application_id);
create index if not exists idx_email_outbox_approved_by       on public.email_outbox (approved_by);
create index if not exists idx_email_outbox_candidate_id      on public.email_outbox (candidate_id);
create index if not exists idx_email_outbox_created_by        on public.email_outbox (created_by);
create index if not exists idx_email_outbox_job_id            on public.email_outbox (job_id);
create index if not exists idx_interview_sessions_application_id on public.interview_sessions (application_id);
create index if not exists idx_interview_sessions_job_id      on public.interview_sessions (job_id);
create index if not exists idx_jobs_created_by                on public.jobs (created_by);
create index if not exists idx_resume_analyses_job_id         on public.resume_analyses (job_id);
create index if not exists idx_resume_analyses_resume_id      on public.resume_analyses (resume_id);
create index if not exists idx_stage_events_actor_id          on public.stage_events (actor_id);
create index if not exists idx_stage_events_organization_id   on public.stage_events (organization_id);

-- 2. Pin function search_path -------------------------------------------------
alter function public.add_creator_as_owner() set search_path = public;
alter function public.user_org_ids() set search_path = public;

-- 3. RLS initplan rewrite (idempotent: skips policies already using a subselect)
do $$
declare p record; s text;
begin
  for p in
    select tablename, policyname, qual, with_check
    from pg_policies
    where schemaname = 'public'
      and (
        (qual is not null and qual like '%auth.uid()%' and qual not ilike '%( select auth.uid()%' and qual not ilike '%(select auth.uid()%')
        or
        (with_check is not null and with_check like '%auth.uid()%' and with_check not ilike '%( select auth.uid()%' and with_check not ilike '%(select auth.uid()%')
      )
  loop
    s := format('alter policy %I on public.%I', p.policyname, p.tablename);
    if p.qual is not null and p.qual like '%auth.uid()%' then
      s := s || format(' using (%s)', replace(p.qual, 'auth.uid()', '(select auth.uid())'));
    end if;
    if p.with_check is not null and p.with_check like '%auth.uid()%' then
      s := s || format(' with check (%s)', replace(p.with_check, 'auth.uid()', '(select auth.uid())'));
    end if;
    execute s;
  end loop;
end $$;

-- 4. Interview token expiry (14 days) ------------------------------------------
-- A token is expired when the session was never completed and the invite is
-- older than 14 days. get_interview still returns the row with expired=true so
-- the page can show a friendly message; start/submit refuse to act on it.

create or replace function public.get_interview(p_token text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare v jsonb;
begin
  select jsonb_build_object(
    'id', s.id, 'status', s.status, 'questions', s.questions,
    'invited_name', s.invited_name, 'job_id', s.job_id,
    'job_title', coalesce(j.title,'the role'),
    'application_id', s.application_id, 'organization_id', s.organization_id,
    'resume_score', (select a.ai_score from applications a where a.id = s.application_id),
    'created_at', s.created_at,
    'expired', (s.status <> 'completed' and s.created_at < now() - interval '14 days')
  ) into v
  from interview_sessions s left join jobs j on j.id = s.job_id
  where s.public_token = p_token;
  return v; -- null if not found
end $function$;

create or replace function public.start_interview(p_token text)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  update interview_sessions set status = 'in_progress', started_at = now()
  where public_token = p_token and status = 'created'
    and created_at >= now() - interval '14 days';
end $function$;

create or replace function public.submit_interview(p_token text, p_transcript jsonb, p_tabs integer, p_recording text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare v jsonb;
begin
  update interview_sessions set transcript = p_transcript, status = 'completed',
    ended_at = now(), tab_switch_count = coalesce(p_tabs,0),
    recording_url = coalesce(p_recording, recording_url)
  where public_token = p_token and status <> 'completed'
    and created_at >= now() - interval '14 days';
  select jsonb_build_object('id',s.id,'job_id',s.job_id,'application_id',s.application_id,
    'questions',s.questions,'job_title',coalesce(j.title,'the role'),'already', (s.status='completed' and s.is_analysed),
    'expired', (s.status <> 'completed' and s.created_at < now() - interval '14 days'))
  into v from interview_sessions s left join jobs j on j.id=s.job_id where s.public_token = p_token;
  return v;
end $function$;
