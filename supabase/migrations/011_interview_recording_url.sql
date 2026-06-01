-- 011_interview_recording_url.sql — store the interview audio recording path.
-- (Missed in 008; submit_interview + the recruiter review page reference it.)
alter table public.interview_sessions add column if not exists recording_url text;
