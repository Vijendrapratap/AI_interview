---
title: Slice 1 — Foundation + UI System
status: approved-for-planning
date: 2026-05-19
owner: ReCruItAI team
estimate: 8–10 working days
---

# Slice 1 — Foundation + UI System

## 1. Goal (definition of done)

A stranger lands on the marketing page, signs up, creates an organization, invites a teammate, posts a job, adds a candidate with a resume, sees the candidate scored by AI, and moves the candidate between pipeline stages. Everything survives a server restart. A second organization's data is invisible to the first. Every page the user touches in this flow uses the new visual system (warm cream surface, Fraunces headlines, lime accent, soft cards) and ships without any `alert()` or hard-coded mock data.

## 2. Non-goals (explicitly out of this slice)

Pipeline drag-and-drop, automations engine, communications real sends (Gmail/SendGrid), sourcing distribution to LinkedIn/Indeed, analytics calculation, scorecards write-back beyond what already runs, unified inbox, **dark-mode pass on the dashboard** (mirrors the phone-mockup look — done in the follow-up slice). The legacy `frontend/` (Vite) directory is not touched. Existing `/interview/[id]` and `/portal` flows keep working unchanged except for the new visual tokens.

## 3. Architecture

```
Next.js (platform-web)
  ├─ @supabase/ssr               signup, login, session cookies
  ├─ Org switcher                writes active org_id to cookie
  └─ fetch(FastAPI)              Authorization: Bearer <supabase JWT>
                                 X-Organization-Id: <uuid>

FastAPI (backend)
  ├─ app/auth/supabase.py        verifies JWT via Supabase JWKS
  ├─ app/db.py                   psycopg async pool to Supabase Postgres
  ├─ Service layer               replaces in-memory dicts with SQL
  └─ LLM/TTS providers           lazy-init on first call

Supabase (project redgbugvyoidjwhovmxa)
  ├─ Auth                        email+password + Google OAuth
  ├─ Postgres + RLS              every org-scoped row filtered by membership
  └─ Storage bucket `resumes`    path = {org_id}/{candidate_id}/{filename}
```

## 4. Data model (`public` schema)

All tables use `id uuid default gen_random_uuid() primary key` and `created_at timestamptz default now()` unless noted.

| Table | Columns |
|---|---|
| `organizations` | id, name text, slug text unique, created_at |
| `organization_members` | organization_id uuid → organizations, user_id uuid → auth.users, role org_role, created_at, PK(org_id, user_id) |
| `invitations` | id, organization_id, email text, role org_role, token text unique, expires_at timestamptz, accepted_at timestamptz null |
| `jobs` | id, organization_id, title text, department text null, location text null, employment_type text, salary_min int null, salary_max int null, currency text default 'USD', description text, requirements text[], status job_status default 'open', created_by uuid → auth.users, created_at, updated_at |
| `candidates` | id, organization_id, full_name text, email text, phone text null, current_role text null, current_company text null, source text default 'manual', created_at |
| `applications` | id, organization_id, candidate_id → candidates, job_id → jobs, stage app_stage default 'new', ai_score numeric(5,2) null, recommendation text null, owner_id uuid null → auth.users, created_at, updated_at, UNIQUE(candidate_id, job_id) |
| `resumes` | id, organization_id, candidate_id → candidates, storage_path text, file_name text, mime_type text, byte_size int, uploaded_at |
| `resume_analyses` | id, organization_id, resume_id → resumes, job_id null → jobs, overall_score numeric(5,2), ats_score numeric(5,2), breakdown jsonb, red_flags jsonb, skills_found text[], skills_missing text[], created_at |
| `interview_sessions` | id, organization_id, candidate_id → candidates, job_id null → jobs, status session_status default 'created', mode text default 'voice', transcript jsonb default '[]', scores jsonb default '{}', started_at, ended_at null |
| `interview_reports` | session_id uuid PK → interview_sessions, summary text, scorecard jsonb, recommendation text, created_at |

**Enums**
- `org_role`: `owner | admin | recruiter | hiring_manager | interviewer`
- `job_status`: `draft | open | paused | closed`
- `app_stage`: `new | screening | interview | offer | hired | rejected`
- `session_status`: `created | in_progress | completed | abandoned`

**Indexes**: `(organization_id)` on every org-scoped table; `(organization_id, stage)` on `applications`; `(organization_id, status)` on `jobs`; `(candidate_id)` on `resumes` and `interview_sessions`.

## 5. RLS policies

Pattern applied to every org-scoped table (illustrated for `jobs`):

```sql
alter table jobs enable row level security;

create policy jobs_member_select on jobs for select
  using (organization_id in (
    select organization_id from organization_members where user_id = auth.uid()
  ));

create policy jobs_member_insert on jobs for insert
  with check (organization_id in (
    select organization_id from organization_members where user_id = auth.uid()
  ));

create policy jobs_member_update on jobs for update
  using (organization_id in (
    select organization_id from organization_members where user_id = auth.uid()
  ));

create policy jobs_owner_admin_delete on jobs for delete
  using (organization_id in (
    select organization_id from organization_members
    where user_id = auth.uid() and role in ('owner','admin')
  ));
```

`organizations` row visible only to its members. `organization_members` readable by members of the same org. `invitations` readable by `owner|admin` only. Storage bucket `resumes` policies mirror the `resumes` table.

**Trigger**: `on insert into organizations` auto-inserts an `organization_members` row with `role='owner'` for the calling user.

## 6. Backend changes

Files to add:
- `app/auth/supabase.py` — JWT verification using Supabase JWKS (cached); `get_current_context()` FastAPI dependency returns `Context(user_id, org_id, role)`. Org resolved from `X-Organization-Id` header, falling back to first membership.
- `app/db.py` — async psycopg pool, configured from `SUPABASE_DB_URL` env var.
- Repository modules under `app/repositories/` for each table: `jobs.py`, `candidates.py`, `applications.py`, `resumes.py`, `analyses.py`, `sessions.py`. Pure SQL, no business logic.

Files to change:
- `app/services/job_description.py:59` — remove module-level `jd_generator = JDGeneratorService()`; instantiate per-request inside the endpoint.
- `app/services/llm/service.py:67` — defer `_create_provider` to first `complete()` call. Boot succeeds with no API keys set.
- `app/api/v1/endpoints/interview.py:616` — **delete** `POST /interview/debug/inject_resume`.
- `app/api/v1/endpoints/resume.py`, `analysis.py`, `interview.py`, `recruiter.py` — replace the in-memory `*_storage` dicts with repository calls. Every endpoint gains `ctx: Context = Depends(get_current_context)` and scopes every read/write by `ctx.org_id`.
- `app/core/config.py` — add `SUPABASE_URL`, `SUPABASE_JWT_SECRET` (or JWKS URL), `SUPABASE_DB_URL`, `SUPABASE_SERVICE_ROLE_KEY` env vars. None required at boot; checked at first use.

Files to remove: `fake_users_db` block in `app/api/v1/endpoints/auth.py:17–39`. The whole `auth.py` collapses to a single `GET /me` endpoint that takes the verified Supabase JWT context and returns `{user_id, email, memberships: [{org_id, name, role}]}`. Signup, login, password reset, OAuth all happen client-side against Supabase; FastAPI never sees a password.

## 7. Frontend changes (`platform-web`)

New routes:
- `src/app/(auth)/signup/page.tsx` — email, password, organization name. Creates auth user → org → membership.
- `src/app/(auth)/invite/[token]/page.tsx` — accept invitation, sets membership row.

Modified routes:
- `src/app/(auth)/login/page.tsx` — real Supabase auth, drop hardcoded credentials at lines 24–46.
- `src/app/(dashboard)/layout.tsx` — adds org switcher in header; reads active org from cookie.
- `src/app/(dashboard)/dashboard/jobs/page.tsx`, `jobs/[id]/page.tsx`, `jobs/new/page.tsx` — fetch from FastAPI, no more `alert()`.
- `src/app/(dashboard)/dashboard/candidates/page.tsx`, `candidates/[id]/page.tsx` — fetch from FastAPI.
- `src/app/(dashboard)/dashboard/settings/page.tsx` — Team Members tab becomes functional: list, invite by email, change role, remove.
- All other dashboard pages: keep `mockData.ts` but add a small "Coming in Slice 2" pill so we don't lie about what works.

New libraries:
- `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts` — @supabase/ssr setup.
- `src/lib/api.ts` — typed fetch wrapper that auto-injects `Authorization` and `X-Organization-Id`.

Removed:
- `src/lib/mockData.ts` usage from jobs, candidates, candidate detail. File itself stays for the not-yet-wired pages.

## 8. UI design system

### Tokens (`src/app/globals.css` and `tailwind.config.js`)

```css
:root {
  --surface:        #EFE7DC;   /* page bg — warm sand */
  --surface-muted:  #E6DDD0;
  --card:           #FFFFFF;
  --ink:            #1B1B1B;
  --ink-2:          #4A4944;
  --ink-3:          #8A8780;
  --border:         #E0D6C7;
  --border-card:    #EEE7DA;

  --accent:         #B8DC4E;   /* primary action */
  --accent-ink:     #1B1B1B;
  --accent-soft:    #EAF2C2;

  --success:        #4F8A5B;
  --warning:        #C9913D;
  --danger:         #B14B3C;
  --info:           #4E6B8A;

  --radius-sm: 8px; --radius-md: 14px; --radius-lg: 20px; --radius-pill: 9999px;
  --shadow-card: 0 1px 0 rgba(27,27,27,.04);
}
```

Tailwind extension maps these to `bg-surface`, `bg-card`, `text-ink`, `border-border`, `bg-accent`, `text-accent-ink`, etc. Dark mode is a follow-up slice (mirrors the phone-mockup look: black surface, cream ink, accent unchanged).

### Type

- Headlines: **Fraunces** (Google Fonts, variable) — `weight 400/500`, italic available, used for page titles, hero numbers, empty-state titles.
- UI + body + tables: **Inter** — `weight 400/500/600`.
- Scale: `12 caption | 13 table | 14 body | 16 lead | 24 h3 | 32 h2 | 48 h1`. Headline tracking `-0.02em`, body normal.
- Loaded via `next/font/google` in `src/app/layout.tsx`.

### Components (reference)

- **Button (primary)**: pill, bg-accent, text-accent-ink, `h-10 px-5`, hover darkens 8%.
- **Button (secondary)**: rounded-md `8px`, border-border, text-ink, transparent bg.
- **Button (ghost)**: text-ink-2 hover text-ink, no border.
- **Card**: bg-card, border-border-card, `radius-md`, `shadow-card`, `p-6`.
- **Table**: no zebra; row-bottom-border in `border-card`; sticky header on `surface`; cells `py-3`.
- **Badge**: pill, `accent-soft` bg + ink text by default; semantic variants use the four desaturated colors at 12% opacity bg + full color text.
- **Empty state**: Fraunces italic title + Inter body + one primary action; centered, no illustration.

### Page-level applications

- Dashboard home: cream surface; the priority queue, stat cards, and SLA table all on white cards with cream gutters; one accent CTA per row.
- Pipeline (still mock data): column headers in cream-on-white; cards on white with cream divider; drag-and-drop stays out of this slice.
- Jobs/candidates tables: dense Inter rows on white, sticky cream header, stage badges in semantic colors.
- Login/signup: cream full-bleed, white card centered, Fraunces headline, lime CTA.

## 9. Migrations

Single Supabase SQL migration applied via the project-scoped MCP after Claude Code restart:

- `001_foundation_schema.sql` — enums, tables, indexes, RLS policies, owner trigger, storage bucket + policies.

Migration is idempotent (`if not exists`) so re-running is safe. Rollback is a paired `001_foundation_schema_down.sql` for emergencies; not part of normal flow.

## 10. Testing

**Backend (pytest)**:
- Auth bridge: valid JWT → context resolves; expired/wrong-issuer/garbage → 401.
- Org isolation: user in org A reading a job whose `organization_id` is org B returns 404, not 403 (we don't leak existence).
- CRUD round-trip for `jobs`, `candidates`, `applications`, `resumes`.
- Lazy-init: backend boots with `OPENROUTER_API_KEY` unset, first analysis call raises a clean 503 with provider name.

**Frontend (Playwright)**:
- Happy path: signup → create org → post job → invite teammate → second user accepts → second user sees the job.
- Negative path: second org's user cannot read first org's job (404 from API).

CI runs both; both must be green before merge.

## 11. Risks

1. **Supabase JWKS verification** — easy to misconfigure `issuer`/`audience` on first try. Mitigation: start from a known-good snippet, covered by pytest.
2. **RLS policy gaps** — easy to forget a policy on `update`/`delete` and leave a table read-only or fully open. Mitigation: explicit per-table checklist in the migration review.
3. **Background trigger ordering** — the `organizations` insert trigger must complete before the API returns success, otherwise the first member is missing. Mitigation: trigger runs in the same transaction as the insert; pytest verifies.
4. **psycopg async pool sizing** — too small under load. Mitigation: default 10, env-tunable.
5. **Fraunces + Inter font weight** in dev — `next/font` self-hosts so no FOUT, but the variable font file is ~150KB. Acceptable.

## 12. Timeline

| Day | Backend | Frontend |
|---|---|---|
| 1 | Lazy-init LLM, remove debug endpoint, write `supabase.py` auth + `db.py` pool | Tokens + globals.css + Tailwind extension; install Supabase libs |
| 2 | Apply 001 migration; `jobs` + `candidates` + `applications` repos + endpoints | Signup, login, invite pages; org switcher |
| 3 | `resumes` + `analyses` + `sessions` repos; wire existing flows to repos | Jobs list + new + detail (real fetch) |
| 4 | Tests for auth bridge + org isolation + CRUD | Candidates list + detail (real fetch); team-members tab |
| 5 | Backend cleanup, error paths, observability | Playwright happy + negative paths |
| 6 | Buffer | Visual polish pass on remaining wired pages |
| 7 | Buffer | Buffer |

8–10 day window total (5 dev days + 2–3 days slack).

## 13. Open questions

None at this time. All forks resolved: multi-org membership (Option 2), Supabase managed stack, lime accent `#B8DC4E`, Fraunces serif headlines, bundled foundation + UI in one slice.
