# ReCruItAI — Phase 0: "Make It Real" (Foundation)

**Date:** 2026-05-22
**Status:** Approved design — ready for implementation planning
**Supersedes:** the architecture of `docs/superpowers/specs/2026-05-19-foundation-and-ui-design.md` (Slice 1). Slice 1 was specced and planned (2026-05-19/-21) but never built; the UI overhaul (`2026-05-22`) shipped instead. Phase 0 keeps Slice 1's **goal, database schema, RLS, Supabase project, storage bucket, and Vercel deployment plan**, and revises only the **data-access architecture**.

---

## 1. Problem

The platform is a high-fidelity prototype that no company can actually use:

- All 15 dashboard pages render from `platform-web/src/lib/mockData.ts` (hardcoded). `src/lib/api.ts` has 5 real functions — none are called.
- The FastAPI backend keeps all data in in-memory Python dicts; every restart wipes it. No DB connection.
- A complete Supabase schema exists in `supabase/migrations/` (organizations, jobs, candidates, applications, resumes, analyses, interviews, RLS, storage) — wired to nothing.
- Login is a client-side string check (`recruiter@example.com`). No sessions, no protected routes, no multi-tenant isolation.
- The AI pipeline (multi-provider LLM, resume parsing, scoring) is genuinely real and works in the backend — but the frontend shows hardcoded scores.

## 2. Goal — definition of done

A stranger opens the deployed app, **signs up**, an **organization** is created, they **post a job**, **add a candidate and upload a resume**, the candidate is **scored by the real AI pipeline**, they open the **Candidate Detail** page and see the real explainable score, and they **move the candidate between pipeline stages**. Everything **survives a server restart**. A second organization's data is **invisible** to the first. Login is real (Supabase Auth, sessions, protected routes). No `mockData` import remains in any in-scope page; no `alert()`-based fake flows in the core loop.

## 3. Architecture — chosen: "Supabase Auth + direct client; FastAPI for AI only"

```
Next.js  platform-web              ── Vercel project A
  ├─ @supabase/ssr                 signup, login, session cookies, middleware
  ├─ Server Components             read Supabase (server client, user JWT → RLS)
  ├─ Server Actions                writes (insert/update, RLS-enforced)
  ├─ src/lib/data/*                typed data-access layer per entity
  └─ Server Action → FastAPI       triggers AI; passes Supabase JWT

FastAPI  backend                   ── Vercel project B  (AI ONLY)
  ├─ app/auth/supabase.py          verify Supabase JWT via JWKS
  ├─ app/supabase_admin.py         supabase-py client, SERVICE-ROLE key
  ├─ resume / analysis / interview endpoints — persist results to Supabase
  └─ LLM / TTS providers           unchanged (real, multi-provider)
  ✗ app/services/recruiter/ats.py  RETIRED (in-memory CRUD removed)
  ✗ /api/v1/recruiter/* CRUD       RETIRED (CRUD now goes frontend → Supabase)

Supabase  project redgbugvyoidjwhovmxa
  ├─ Auth                          email + password
  ├─ Postgres + RLS                schema in supabase/migrations/ (+ new 004)
  └─ Storage bucket  resumes       path = {org_id}/{candidate_id}/{filename}
```

Clean split of responsibility: **Supabase owns data + auth**; **FastAPI owns AI compute**. The frontend reads/writes Supabase directly under RLS; it calls FastAPI only to run AI.

## 4. Database

The schema already exists as `supabase/migrations/001_foundation_schema.sql`, `002_rls_policies.sql`, `003_storage_bucket.sql`. Tables: `organizations`, `organization_members`, `invitations`, `jobs`, `candidates`, `applications`, `resumes`, `resume_analyses`, `interview_sessions`, `interview_reports`. Enums: `org_role`, `job_status`, `app_stage`, `session_status`. RLS scopes every org-owned row to the caller's `organization_members`.

**Phase 0 database work:**
- **Verify** the three migrations are applied to project `redgbugvyoidjwhovmxa`; apply any that are not.
- **Add migration `004_signup_provisioning.sql`** with two `SECURITY DEFINER` functions (RLS would otherwise create a chicken-and-egg on first insert):
  - `provision_organization(org_name text) returns uuid` — inserts an `organizations` row, inserts `organization_members(org, auth.uid(), 'owner')`, returns the org id. If migration 001 already has an org-owner trigger, this function only inserts the org and lets the trigger add the membership — the implementation must read 001 and reconcile so membership is created exactly once.
  - `accept_invitation(invite_token text) returns uuid` — validates an unexpired `invitations` row, inserts `organization_members(org, auth.uid(), invited_role)`, stamps `accepted_at`, returns the org id.
- Generate TypeScript types from the live schema into `platform-web/src/lib/types/database.ts`.

## 5. Frontend (`platform-web`)

### 5.1 Supabase + auth plumbing
- `src/lib/supabase/server.ts` — server client (`@supabase/ssr`, reads cookies).
- `src/lib/supabase/client.ts` — browser client.
- `src/lib/supabase/middleware.ts` + `middleware.ts` (root) — refresh the session on every request and **redirect unauthenticated users away from `/dashboard/*`** to `/login`.
- Active org: a logged-in user's org is resolved from `organization_members` (Phase 0 assumes one org per user; an org switcher is deferred).

### 5.2 Auth pages
- `(auth)/login` — real Supabase email+password sign-in; on success → `/dashboard`.
- `(auth)/signup` — new page: email+password + organization name → create the auth user → call `provision_organization` → `/dashboard`.
- `(auth)/accept-invite` — new page: reads `?token=`, requires sign-in/sign-up, calls `accept_invitation`.
- Minimal team invite: Settings → Team Members can send an `invitations` row (email + role) and list members. Full RBAC management UI is deferred; RLS already enforces member-vs-owner permissions.

### 5.3 Typed data-access layer — `src/lib/data/`
One module per entity, each exporting **read functions** (called from Server Components) and **Server Actions** (mutations, `"use server"`):
- `organizations.ts` — current org + members; `provisionOrganization`, `inviteMember`.
- `jobs.ts` — `listJobs`, `getJob`; `createJob`, `updateJob`, `closeJob`.
- `candidates.ts` — `listCandidates`, `getCandidate`; `createCandidate`, `updateCandidate`.
- `applications.ts` — `listApplications`, pipeline grouping; `moveStage`, `assignOwner`.
- `resumes.ts` — upload to Storage + `resumes` row; `requestAnalysis` (Server Action → FastAPI).
- `dashboard.ts` — aggregate counts for the dashboard KPIs/queue.
All reads run under the user's JWT so RLS enforces org isolation. Server Actions call `revalidatePath` after writes.

### 5.4 Page conversions (fetch strategy: Server Components + Server Actions)
Each in-scope page becomes a **server page** (async, fetches via the data layer) that renders a **client view** component for interactivity (filters, tabs, drag). In scope:
- `dashboard/page.tsx` — real KPIs, priority queue, requisition health.
- `dashboard/jobs/page.tsx`, `jobs/new/page.tsx` (real create via Server Action), `jobs/[id]/page.tsx` (real Job Detail).
- `dashboard/candidates/page.tsx`, `candidates/[id]/page.tsx` (real Candidate Detail — resume, AI score breakdown, applications, stage controls), `candidates/[id]/scorecard/page.tsx`.
- `dashboard/pipeline/page.tsx` — real stage columns from `applications`; stage change persists (drag-and-drop interaction itself is Phase 1; Phase 0 ships a working stage-change control).
- Candidate add + resume upload UI (a form/drawer on the Candidates page).
- `mockData.ts` is removed from every in-scope page. The file may be repurposed as an optional `scripts/seed-demo.ts` seed; it must not be imported by shipped pages.

### 5.5 Non-core pages
`hiring-flow`, `interviews`, `collaboration`, `communications`, `sourcing`, `automations`, `analytics`, `notifications`, `settings` (beyond Org + Team), `profile` — keep their current UI **unchanged except for adding a `<PreviewBanner>`** at the top ("Preview — live data lands in a later phase"). New component `src/components/PreviewBanner.tsx`. Their existing mock-driven display stays as-is until their own phase reskins them with live data — the §10 no-`mockData` gate applies **only to the in-scope core-loop pages**, not to these.

### 5.6 States
Real loading via `Suspense` + the existing `Skeleton`; real empty states via the existing `EmptyState`; an onboarding checklist on the dashboard for a brand-new org (post first job, add first candidate, invite a teammate); error boundaries on each route segment.

## 6. Backend (`backend`) — AI only

- **Retire** `app/services/recruiter/ats.py` and the `/api/v1/recruiter/*` CRUD endpoints (CRUD is now frontend → Supabase).
- `app/auth/supabase.py` — verify the Supabase JWT (JWKS) on every AI endpoint; reject unauthenticated calls.
- `app/supabase_admin.py` — a `supabase-py` client created with the **service-role key**, used to read resume files from Storage and write `resumes` / `resume_analyses` rows and update `applications.ai_score`.
- Resume + analysis endpoints rebuilt around persistence (see §7). Interview/TTS endpoints keep working; persisting interview results fully is Phase 1 — Phase 0 only needs the resume→score path persistent.
- In-memory dicts (`resume_storage`, `analysis_storage`, etc.) removed for the resume/analysis path.

## 7. The resume → AI screening flow (most important data path)

1. Recruiter adds a candidate and selects a resume file on the Candidates page.
2. Browser uploads the file **directly to Supabase Storage** (`resumes` bucket, path `{org_id}/{candidate_id}/{filename}`) — RLS/storage policy enforces org scope.
3. A Server Action inserts the `resumes` row and the `applications` row (candidate ↔ job), then calls FastAPI `POST /api/v1/analysis/analyze` with `{ resume_id, application_id, job_id }` and the user's Supabase JWT.
4. FastAPI verifies the JWT, downloads the file from Storage (service role), parses it, scores it against the job via the LLM pipeline, and **writes** a `resume_analyses` row + updates `applications.ai_score` and `recommendation`.
5. The Server Action `revalidatePath`s; the Candidate Detail page now shows the real, explainable score (skills matched/missing, red flags, breakdown).

Analysis is synchronous in Phase 0 (the request waits). If it proves slow, a background/polling variant is a Phase 1 improvement — not in scope here.

## 8. Out of scope (later phases)

Pipeline drag-and-drop; real Scheduling, Offers, Inbox, Sourcing distribution, Automations engine, Communications real sends, Analytics aggregation, AI Copilot; org switcher; Google OAuth; full RBAC management UI; HRIS/e-sign/calendar integrations; the non-core pages' live data. These are Phase 1+ and each gets its own spec.

## 9. Deployment

- `platform-web` → Vercel project A (existing). Add Supabase env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and the FastAPI base URL.
- `backend` → Vercel project B (Python/Fluid Compute) per the Slice 1 deployment plan. Env: Supabase URL, **service-role key**, JWKS URL, LLM provider keys.
- The whole core loop must work from the public URLs, not only localhost.

## 10. Verification

- **RLS isolation test:** create two orgs; confirm org A cannot read org B's jobs/candidates/applications (a scripted check using two JWTs).
- **Backend:** `pytest` — the resume→analyze→persist path writes the expected `resume_analyses` row; JWT verification rejects unauthenticated calls.
- **Frontend:** `npm run lint` + `npm run build` clean; no `mockData` import in any in-scope page (grep gate).
- **Manual end-to-end on the deployed URLs:** signup → org → post job → add candidate + upload resume → real AI score on Candidate Detail → move stage → restart backend → data still present.

## 11. Risks & mitigations

- **Signup vs RLS chicken-and-egg** — mitigated by the `SECURITY DEFINER` `provision_organization` function (§4); the implementation must reconcile with any existing trigger in migration 001.
- **Client→server page split** — the core-loop pages were just rebuilt in the UI overhaul and are heavily `"use client"`. Mitigation: split each into a thin server page + the existing markup as a client view; preserve the Warm + Sage UI exactly.
- **FastAPI deployment / service-role secret** — the service-role key is powerful; it lives only in the backend's Vercel env, never in the frontend.
- **Migrations may already be partially applied** — verify state before applying; never assume.
- **Scope** — Phase 0 is large but coherent. The implementation plan must phase it: (1) Supabase + auth + middleware, (2) data layer + Jobs, (3) Candidates + resume upload + AI persistence, (4) Pipeline + Dashboard + detail pages + preview banner, (5) deploy + verify.

## 12. File structure (new / changed)

**New (frontend):** `src/lib/supabase/{server,client,middleware}.ts`, `middleware.ts`, `src/lib/types/database.ts`, `src/lib/data/{organizations,jobs,candidates,applications,resumes,dashboard}.ts`, `src/lib/ai.ts`, `src/app/(auth)/signup/page.tsx`, `src/app/(auth)/accept-invite/page.tsx`, `src/components/PreviewBanner.tsx`.
**Changed (frontend):** all in-scope pages (§5.4), `src/lib/api.ts` (reduced to AI calls or removed), `(auth)/login/page.tsx`, non-core pages (add `PreviewBanner`).
**New (backend):** `app/auth/supabase.py`, `app/supabase_admin.py`, `supabase/migrations/004_signup_provisioning.sql`.
**Changed (backend):** `app/api/v1/endpoints/{resume,analysis}.py` (persist to Supabase), `app/main.py` (drop recruiter CRUD router).
**Removed (backend):** `app/services/recruiter/ats.py` and `app/api/v1/endpoints/recruiter.py` (in-memory CRUD).
