# ReCruItAI Phase 0 — "Make It Real" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the prototype into a real, multi-tenant product: sign up → org → post job → add candidate + upload resume → async AI screening → move pipeline stage, all persistent in Supabase and deployed.

**Architecture:** Supabase (managed Postgres + Auth + Storage, RLS for tenant isolation). Next.js `platform-web` is the application layer — Server Components read, Server Actions write, all DB access through one typed data layer in `src/lib/data/`. FastAPI `backend` is narrowed to AI compute only; it persists analysis results to Supabase with a service-role key. Resume analysis is asynchronous (instant upload, live Realtime update).

**Tech Stack:** Next.js 16 (App Router, Server Components/Actions, `after()`), React 19, TypeScript, `@supabase/ssr` + `@supabase/supabase-js`, Tailwind v4, FastAPI + `supabase-py` (Python), Postgres/Supabase, pytest.

**Spec:** `docs/superpowers/specs/2026-05-22-phase-0-make-it-real-design.md` — read §3 (architecture), §4 (DB), §7 (resume→AI flow) before starting.

**Conventions for every task:**
- Frontend `npm` commands run from `platform-web/`; backend commands from `backend/` with its virtualenv.
- Before any commit: `git config user.name "Vijendrapratap"` and `git config user.email "44225657+Vijendrapratap@users.noreply.github.com"`. Commit with `git -c commit.gpgsign=false commit`.
- `git add` only the files the task changed — never `git add .`/`-A` (there are unrelated uncommitted files in `backend/`).
- **Never** run `git commit --amend`, `git reset`, `git rebase`, or `git checkout <commit>` — only `git add <specific files>` + one `git commit` per task.
- Secrets: the Supabase **service-role key** lives ONLY in the backend env, never in `platform-web` and never in a committed file.
- Database changes apply via the Supabase MCP tools (`mcp__claude_ai_Supabase__apply_migration`, `execute_sql`, `list_tables`, `list_migrations`, `generate_typescript_types`) against project `redgbugvyoidjwhovmxa`. If the MCP reports "needs authentication"/permission denied, STOP and report — do not guess.
- Backend has a real pytest suite (`backend/tests/`) — backend tasks follow TDD. `platform-web` has no test runner; do not add one — frontend tasks verify with `npm run lint` + `npm run build`.

---

## File Structure

**Database (`supabase/migrations/`):** existing `001`–`003`; new `004_signup_provisioning.sql`, `005_async_analysis.sql`.

**Frontend (`platform-web/src/`):**
- `lib/supabase/{server,client,middleware}.ts` — Supabase clients; `middleware.ts` (repo root of platform-web) — session refresh + route protection.
- `lib/types/database.ts` — generated DB types.
- `lib/data/{organizations,jobs,candidates,resumes,applications,dashboard,sample}.ts` — typed data layer (reads + Server Actions), one module per concern.
- `lib/ai.ts` — server-only helper that calls FastAPI to trigger analysis.
- `app/(auth)/{login,signup,accept-invite}/page.tsx` — auth pages.
- `components/PreviewBanner.tsx` — banner for not-yet-live pages.
- In-scope pages converted to a server page + client view split (see tasks).

**Backend (`backend/app/`):**
- `auth/supabase.py` — Supabase JWT (JWKS) verification dependency.
- `supabase_admin.py` — `supabase-py` client with the service-role key.
- `api/v1/endpoints/analysis.py`, `resume.py` — rebuilt to persist to Supabase.
- Removed: `services/recruiter/ats.py`, `api/v1/endpoints/recruiter.py`.

---

## Phase A — Supabase, schema & auth foundation

### Task 1: Database migrations & types

**Files:**
- Create: `supabase/migrations/004_signup_provisioning.sql`
- Create: `supabase/migrations/005_async_analysis.sql`
- Create: `platform-web/src/lib/types/database.ts` (generated)

- [ ] **Step 1: Verify existing schema state**

Use MCP `mcp__claude_ai_Supabase__list_tables` and `list_migrations` on project `redgbugvyoidjwhovmxa`. Confirm tables `organizations, organization_members, invitations, jobs, candidates, applications, resumes, resume_analyses, interview_sessions, interview_reports` exist. If migrations `001`–`003` are not applied, apply them (read each file in `supabase/migrations/`, apply via `apply_migration`). Read `001_foundation_schema.sql` and note whether an `AFTER INSERT` trigger on `organizations` already creates the owner membership.

- [ ] **Step 2: Write `004_signup_provisioning.sql`**

```sql
-- 004_signup_provisioning.sql — org provisioning that bypasses the RLS chicken-and-egg.

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

  -- Idempotent: if 001 already adds the owner via trigger, ON CONFLICT skips this.
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
```

Apply it via `apply_migration` (name: `signup_provisioning`).

- [ ] **Step 3: Write `005_async_analysis.sql`**

```sql
-- 005_async_analysis.sql — async screening status + Realtime.

do $$ begin
  create type analysis_status as enum ('pending','processing','complete','failed');
exception when duplicate_object then null; end $$;

alter table public.applications
  add column if not exists analysis_status analysis_status not null default 'pending',
  add column if not exists analysis_error text;

-- Live updates to open Pipeline/Candidate views.
alter publication supabase_realtime add table public.applications;
```

Apply it via `apply_migration` (name: `async_analysis`). If `applications` is already in `supabase_realtime`, the `alter publication` errors — wrap-check first with `execute_sql` (`select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='applications'`) and skip that line if present.

- [ ] **Step 4: Verify the functions and column**

Run via `execute_sql`:
```sql
select proname from pg_proc where proname in ('provision_organization','accept_invitation');
select column_name from information_schema.columns where table_name='applications' and column_name in ('analysis_status','analysis_error');
```
Expected: both functions listed; both columns listed.

- [ ] **Step 5: Generate TypeScript types**

Use `mcp__claude_ai_Supabase__generate_typescript_types` and write the output to `platform-web/src/lib/types/database.ts`.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/004_signup_provisioning.sql supabase/migrations/005_async_analysis.sql platform-web/src/lib/types/database.ts
git commit -m "feat(db): add signup provisioning + async analysis migrations"
```

### Task 2: Supabase clients & route protection

**Files:**
- Create: `platform-web/src/lib/supabase/server.ts`, `client.ts`, `middleware.ts`
- Create: `platform-web/middleware.ts`
- Modify: `platform-web/.env.local` (local dev), `platform-web/.env.example`

- [ ] **Step 1: Install dependencies**

Run from `platform-web/`: `npm install @supabase/ssr @supabase/supabase-js`

- [ ] **Step 2: Add env vars**

Append to `platform-web/.env.example` (and set real values in `.env.local`, which is gitignored):
```
NEXT_PUBLIC_SUPABASE_URL=https://redgbugvyoidjwhovmxa.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
NEXT_PUBLIC_API_URL=http://localhost:8000
```
Get the anon key via `mcp__claude_ai_Supabase__get_publishable_keys`.

- [ ] **Step 3: Create `src/lib/supabase/server.ts`**

```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component — safe to ignore; middleware refreshes the session.
          }
        },
      },
    }
  );
}
```

- [ ] **Step 4: Create `src/lib/supabase/client.ts`**

```ts
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

- [ ] **Step 5: Create `src/lib/supabase/middleware.ts`**

```ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isProtected = path.startsWith("/dashboard");
  const isAuthPage = path === "/login" || path === "/signup";

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  if (isAuthPage && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }
  return response;
}
```

- [ ] **Step 6: Create `platform-web/middleware.ts`**

```ts
import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
```

- [ ] **Step 7: Verify and commit**

Run `npm run lint && npm run build` — both pass.
```bash
git add platform-web/src/lib/supabase/server.ts platform-web/src/lib/supabase/client.ts platform-web/src/lib/supabase/middleware.ts platform-web/middleware.ts platform-web/.env.example platform-web/package.json platform-web/package-lock.json
git commit -m "feat(web): add Supabase clients and route-protection middleware"
```

### Task 3: `organizations` data module

**Files:**
- Create: `platform-web/src/lib/data/organizations.ts`

- [ ] **Step 1: Create `organizations.ts`**

This module is the pattern every other data module follows: server reads + `"use server"` actions, all using the server Supabase client so RLS applies.

```ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type OrgRole = "owner" | "admin" | "recruiter" | "hiring_manager" | "interviewer";

/** The current user's organization id, or null if they have none. */
export async function getCurrentOrgId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  return data?.organization_id ?? null;
}

export async function getCurrentOrg() {
  const supabase = await createClient();
  const orgId = await getCurrentOrgId();
  if (!orgId) return null;
  const { data } = await supabase.from("organizations").select("*").eq("id", orgId).single();
  return data;
}

export async function listMembers() {
  const supabase = await createClient();
  const orgId = await getCurrentOrgId();
  if (!orgId) return [];
  const { data } = await supabase
    .from("organization_members")
    .select("user_id, role, created_at")
    .eq("organization_id", orgId);
  return data ?? [];
}

/** Creates an org for the signed-in user (called right after signup). */
export async function provisionOrganization(orgName: string): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("provision_organization", { org_name: orgName });
  if (error) throw new Error(error.message);
  return data as string;
}

export async function inviteMember(email: string, role: OrgRole) {
  const supabase = await createClient();
  const orgId = await getCurrentOrgId();
  if (!orgId) throw new Error("No organization");
  const token = crypto.randomUUID();
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await supabase
    .from("invitations")
    .insert({ organization_id: orgId, email, role, token, expires_at: expires });
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/settings");
  return token;
}

export async function acceptInvitation(token: string): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("accept_invitation", { invite_token: token });
  if (error) throw new Error(error.message);
  return data as string;
}
```

- [ ] **Step 2: Verify and commit**

`npm run lint && npm run build` pass.
```bash
git add platform-web/src/lib/data/organizations.ts
git commit -m "feat(web): add organizations data module"
```

### Task 4: Auth pages (login, signup, accept-invite, sign-out)

**Files:**
- Modify: `platform-web/src/app/(auth)/login/page.tsx`
- Create: `platform-web/src/app/(auth)/signup/page.tsx`
- Create: `platform-web/src/app/(auth)/accept-invite/page.tsx`
- Modify: `platform-web/src/app/(dashboard)/layout.tsx` (real sign-out + user/org display)
- Modify: `platform-web/src/app/(dashboard)/dashboard/settings/page.tsx` (wire Team Members tab)

- [ ] **Step 1: Rebuild `login/page.tsx`**

Replace the mock `setTimeout` auth with real Supabase auth. Keep the Warm + Sage `Card`/`Input`/`Button` styling from the UI overhaul. The form is a client component; on submit call the browser client:
```ts
const supabase = createClient(); // from "@/lib/supabase/client"
const { error } = await supabase.auth.signInWithPassword({ email, password });
if (error) { setError(error.message); return; }
router.push("/dashboard");
router.refresh();
```
Show `error` via the existing error UI. Add a "Create an organization" link to `/signup`. Remove the hardcoded `recruiter@example.com` check entirely.

- [ ] **Step 2: Create `signup/page.tsx`**

A client component styled like `login`. Fields: organization name, full name, email, password. On submit:
```ts
const supabase = createClient();
const { error: signUpError } = await supabase.auth.signUp({
  email, password, options: { data: { full_name: fullName } },
});
if (signUpError) { setError(signUpError.message); return; }
// session exists now (email confirmation disabled for Phase 0 — see Task 15 note)
await provisionOrganization(orgName); // server action from "@/lib/data/organizations"
router.push("/dashboard");
router.refresh();
```
Link back to `/login`.

- [ ] **Step 3: Create `accept-invite/page.tsx`**

Reads `?token=` from search params. If the visitor is not signed in, show sign-in/sign-up inline (reuse the signup form WITHOUT the org-name field). After authentication, call `acceptInvitation(token)` (server action) and redirect to `/dashboard`. On invalid/expired token show a clear message.

- [ ] **Step 4: Real sign-out + user display in dashboard layout**

In `(dashboard)/layout.tsx`, the "Sign Out" link becomes a Server Action form:
```tsx
async function signOut() {
  "use server";
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
```
Render it as `<form action={signOut}><button …>Sign Out</button></form>`. The header avatar shows the real user's initials from `supabase.auth.getUser()`/org name. Keep all Warm + Sage styling.

- [ ] **Step 5: Wire the Settings → Team Members tab**

In `settings/page.tsx`, the Team Members tab renders the real members from `listMembers()` and an invite form (email + role `Select`) whose submit calls the `inviteMember` Server Action; on success show the generated invite link (`/accept-invite?token=<token>`) via the `Toast`. This is the minimal team feature — no role-editing UI yet (RLS already enforces owner-vs-member permissions). The Settings page keeps its Warm + Sage `Tabs` layout; only the Team tab's body changes from mock to real.

- [ ] **Step 6: Verify and commit**

`npm run lint && npm run build` pass. Manually: signing up creates an `auth.users` row + an `organizations` row + an `organization_members` row (verify with MCP `execute_sql`).
```bash
git add "platform-web/src/app/(auth)/login/page.tsx" "platform-web/src/app/(auth)/signup/page.tsx" "platform-web/src/app/(auth)/accept-invite/page.tsx" "platform-web/src/app/(dashboard)/layout.tsx" "platform-web/src/app/(dashboard)/dashboard/settings/page.tsx"
git commit -m "feat(web): real Supabase auth — login, signup, invite, sign-out"
```

---

## Phase B — Jobs

### Task 5: `jobs` data module

**Files:**
- Create: `platform-web/src/lib/data/jobs.ts`

- [ ] **Step 1: Create `jobs.ts`**

```ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentOrgId } from "./organizations";
import { revalidatePath } from "next/cache";

export type JobStatus = "draft" | "open" | "paused" | "closed";

export async function listJobs() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("jobs")
    .select("*")
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getJob(id: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("jobs").select("*").eq("id", id).maybeSingle();
  return data;
}

export type CreateJobInput = {
  title: string;
  department: string | null;
  location: string | null;
  employment_type: string;
  salary_min: number | null;
  salary_max: number | null;
  description: string;
  requirements: string[];
  status: JobStatus;
};

export async function createJob(input: CreateJobInput) {
  const supabase = await createClient();
  const orgId = await getCurrentOrgId();
  if (!orgId) throw new Error("No organization");
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("jobs")
    .insert({ ...input, organization_id: orgId, created_by: user!.id })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/jobs");
  return data.id as string;
}

export async function updateJob(id: string, patch: Partial<CreateJobInput>) {
  const supabase = await createClient();
  const { error } = await supabase.from("jobs").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/jobs/${id}`);
  revalidatePath("/dashboard/jobs");
}

export async function closeJob(id: string) {
  await updateJob(id, { status: "closed" });
}
```

- [ ] **Step 2: Verify and commit**

`npm run lint && npm run build` pass.
```bash
git add platform-web/src/lib/data/jobs.ts
git commit -m "feat(web): add jobs data module"
```

### Task 6: Wire Jobs pages to real data

**Files:**
- Modify: `platform-web/src/app/(dashboard)/dashboard/jobs/page.tsx`
- Modify: `platform-web/src/app/(dashboard)/dashboard/jobs/new/page.tsx`
- Modify: `platform-web/src/app/(dashboard)/dashboard/jobs/[id]/page.tsx`

- [ ] **Step 1: Convert `jobs/page.tsx` (list)**

Make `page.tsx` an async **Server Component** that calls `listJobs()` and renders the existing Warm + Sage markup with real rows. Any interactivity (filter chips, search) moves into a small client component `JobsView` in the same folder that receives `jobs` as a prop. Remove the `mockData` import. Keep every `Link` href. Show the existing `EmptyState` when there are no jobs.

- [ ] **Step 2: Convert `jobs/new/page.tsx`**

The form stays a client component but its submit calls the `createJob` Server Action (not a mock `alert`). On success `router.push('/dashboard/jobs/' + id)`. Keep the Warm + Sage `Field`/`Button` components, the department `Select`, and the "Comma separated" requirements input (split on commas into `string[]`). Validate required fields client-side before calling the action.

- [ ] **Step 3: Convert `jobs/[id]/page.tsx` (detail)**

Async Server Component: `const job = await getJob(params.id)`; if null, render a not-found state. Render the real job into the existing detail layout. List this job's applications via `listApplications({ jobId })` once Task 11 lands — until then show the candidates section with an empty state. Keep all hrefs.

- [ ] **Step 4: Verify and commit**

`npm run lint && npm run build` pass. Grep gate: `grep -rn "mockData" "platform-web/src/app/(dashboard)/dashboard/jobs"` returns nothing.
```bash
git add "platform-web/src/app/(dashboard)/dashboard/jobs/page.tsx" "platform-web/src/app/(dashboard)/dashboard/jobs/new/page.tsx" "platform-web/src/app/(dashboard)/dashboard/jobs/[id]/page.tsx"
git commit -m "feat(web): wire jobs pages to real data"
```

---

## Phase C — Candidates, resumes & AI screening

### Task 7: Backend — Supabase admin client & JWT verification

**Files:**
- Create: `backend/app/supabase_admin.py`
- Create: `backend/app/auth/__init__.py`, `backend/app/auth/supabase.py`
- Test: `backend/tests/test_supabase_auth.py`
- Modify: `backend/requirements.txt` (add `supabase`, `pyjwt[crypto]`), `backend/.env.example`

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_supabase_auth.py
import pytest
from fastapi import HTTPException
from app.auth.supabase import verify_supabase_jwt

def test_rejects_missing_token():
    with pytest.raises(HTTPException) as exc:
        verify_supabase_jwt(authorization=None)
    assert exc.value.status_code == 401

def test_rejects_malformed_token():
    with pytest.raises(HTTPException) as exc:
        verify_supabase_jwt(authorization="Bearer not-a-jwt")
    assert exc.value.status_code == 401
```

- [ ] **Step 2: Run it — verify it fails**

Run: `cd backend && python -m pytest tests/test_supabase_auth.py -v`
Expected: FAIL — `app.auth.supabase` does not exist.

- [ ] **Step 3: Implement `app/auth/supabase.py`**

```python
# backend/app/auth/supabase.py
import os
import jwt
from fastapi import Header, HTTPException
from jwt import PyJWKClient

_JWKS_URL = os.environ.get("SUPABASE_JWKS_URL", "")
_jwk_client = PyJWKClient(_JWKS_URL) if _JWKS_URL else None


def verify_supabase_jwt(authorization: str | None = Header(default=None)) -> dict:
    """FastAPI dependency: verify a Supabase access token; return its claims."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    token = authorization.removeprefix("Bearer ").strip()
    if token.count(".") != 2:
        raise HTTPException(status_code=401, detail="Malformed token")
    try:
        if _jwk_client is None:
            raise HTTPException(status_code=500, detail="SUPABASE_JWKS_URL not configured")
        signing_key = _jwk_client.get_signing_key_from_jwt(token).key
        claims = jwt.decode(token, signing_key, algorithms=["RS256", "ES256"], audience="authenticated")
        return claims
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=401, detail=f"Invalid token: {exc}") from exc
```

Create `backend/app/auth/__init__.py` (empty). Add `supabase` and `pyjwt[crypto]` to `requirements.txt`. Add `SUPABASE_JWKS_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` to `.env.example`.

- [ ] **Step 4: Run the test — verify it passes**

Run: `cd backend && python -m pytest tests/test_supabase_auth.py -v`
Expected: PASS (both tests; they exercise the no-token and malformed-token branches, which don't need network).

- [ ] **Step 5: Implement `app/supabase_admin.py`**

```python
# backend/app/supabase_admin.py
import os
from functools import lru_cache
from supabase import create_client, Client


@lru_cache
def admin_client() -> Client:
    """Service-role Supabase client — full DB + Storage access. Server-side only."""
    url = os.environ["SUPABASE_URL"]
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    return create_client(url, key)
```

- [ ] **Step 6: Commit**

```bash
git add backend/app/auth/__init__.py backend/app/auth/supabase.py backend/app/supabase_admin.py backend/tests/test_supabase_auth.py backend/requirements.txt backend/.env.example
git commit -m "feat(backend): add Supabase JWT verification and admin client"
```

### Task 8: Backend — persist resume analysis to Supabase

**Files:**
- Modify: `backend/app/api/v1/endpoints/analysis.py`
- Modify: `backend/app/api/v1/endpoints/resume.py`
- Modify: `backend/app/main.py`
- Test: `backend/tests/test_analysis_persist.py`
- Remove: `backend/app/services/recruiter/ats.py`, `backend/app/api/v1/endpoints/recruiter.py`

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_analysis_persist.py
from app.services.analysis_persistence import build_analysis_row

def test_build_analysis_row_maps_score_fields():
    analyzer_output = {
        "overall_score": 88.5, "ats_score": 91.0,
        "breakdown": {"skills": 90}, "red_flags": [],
        "skills_found": ["python"], "skills_missing": ["kafka"],
        "recommendation": "Strong fit",
    }
    row = build_analysis_row(
        analyzer_output, organization_id="org-1", resume_id="r-1", job_id="j-1"
    )
    assert row["organization_id"] == "org-1"
    assert row["resume_id"] == "r-1"
    assert row["overall_score"] == 88.5
    assert row["skills_found"] == ["python"]
```

- [ ] **Step 2: Run it — verify it fails**

Run: `cd backend && python -m pytest tests/test_analysis_persist.py -v`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement `app/services/analysis_persistence.py`**

```python
# backend/app/services/analysis_persistence.py
"""Pure mapping from analyzer output to a resume_analyses row (kept pure for testing)."""


def build_analysis_row(analyzer_output: dict, *, organization_id: str,
                        resume_id: str, job_id: str | None) -> dict:
    return {
        "organization_id": organization_id,
        "resume_id": resume_id,
        "job_id": job_id,
        "overall_score": analyzer_output.get("overall_score"),
        "ats_score": analyzer_output.get("ats_score"),
        "breakdown": analyzer_output.get("breakdown", {}),
        "red_flags": analyzer_output.get("red_flags", []),
        "skills_found": analyzer_output.get("skills_found", []),
        "skills_missing": analyzer_output.get("skills_missing", []),
    }
```

- [ ] **Step 4: Run the test — verify it passes**

Run: `cd backend && python -m pytest tests/test_analysis_persist.py -v` — Expected: PASS.

- [ ] **Step 5: Rebuild the analyze endpoint**

In `analysis.py`, replace the in-memory `/analyze` handler with one that:
1. Depends on `verify_supabase_jwt` (rejects unauthenticated calls).
2. Accepts `{ resume_id, application_id, job_id }`.
3. Sets `applications.analysis_status = 'processing'` via `admin_client()`.
4. Downloads the resume file from Supabase Storage (`resumes` bucket) using the `storage_path` from the `resumes` row.
5. Runs the existing `ResumeParser` + `ResumeAnalyzer` / LLM pipeline.
6. Inserts a `resume_analyses` row via `build_analysis_row(...)`.
7. Updates the `applications` row: `ai_score`, `recommendation`, `analysis_status = 'complete'`.
8. On any exception, sets `analysis_status = 'failed'` and `analysis_error` and returns HTTP 200 with `{ ok: false }` (the failure is recorded in the DB, not surfaced as a 500 to the trigger).

Keep the LLM/parser service calls exactly as they already work. In `resume.py`, keep the file-handling helpers used by the parser; remove the in-memory `resume_storage` dict.

- [ ] **Step 6: Remove the in-memory recruiter CRUD**

Delete `backend/app/services/recruiter/ats.py` and `backend/app/api/v1/endpoints/recruiter.py`. In `main.py`, remove the import and `include_router` line for the recruiter router. Run `cd backend && python -m pytest tests/test_boot.py tests/test_api_v1.py -v` and fix any test that referenced the removed router (delete assertions for `/api/v1/recruiter/*`).

- [ ] **Step 7: Full backend test run**

Run: `cd backend && python -m pytest -q` — Expected: all pass (pre-existing unrelated failures, if any, must be left as-is and noted, not "fixed" by deleting unrelated tests).

- [ ] **Step 8: Commit**

```bash
git add backend/app/api/v1/endpoints/analysis.py backend/app/api/v1/endpoints/resume.py backend/app/main.py backend/app/services/analysis_persistence.py backend/tests/test_analysis_persist.py
git add -u backend/app/services/recruiter backend/app/api/v1/endpoints/recruiter.py backend/tests/test_api_v1.py backend/tests/test_boot.py
git commit -m "feat(backend): persist resume analysis to Supabase, retire in-memory ATS"
```

### Task 9: `candidates`, `resumes` & `ai` data modules

**Files:**
- Create: `platform-web/src/lib/data/candidates.ts`
- Create: `platform-web/src/lib/data/resumes.ts`
- Create: `platform-web/src/lib/ai.ts`

- [ ] **Step 1: Create `lib/ai.ts`**

```ts
import "server-only";

/** Fires the FastAPI analysis for an application. Caller schedules this via after(). */
export async function triggerAnalysis(params: {
  resumeId: string;
  applicationId: string;
  jobId: string | null;
  accessToken: string;
}) {
  const base = process.env.NEXT_PUBLIC_API_URL!;
  try {
    await fetch(`${base}/api/v1/analysis/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${params.accessToken}`,
      },
      body: JSON.stringify({
        resume_id: params.resumeId,
        application_id: params.applicationId,
        job_id: params.jobId,
      }),
    });
  } catch {
    // The application stays analysis_status='pending' and can be re-run from the UI.
  }
}
```

- [ ] **Step 2: Create `lib/data/candidates.ts`**

Exports: `listCandidates()`, `getCandidate(id)` (with its applications + latest `resume_analyses`), and a `createCandidate` Server Action that inserts a `candidates` row (org-scoped). Follow the exact `jobs.ts` pattern from Task 5 — server client, `getCurrentOrgId()`, `revalidatePath`.

- [ ] **Step 3: Create `lib/data/resumes.ts`**

A Server Action `addCandidateWithResume(formData)` that:
1. Reads org id; inserts the `candidates` row (or accepts an existing `candidateId`).
2. Uploads the file to Supabase Storage bucket `resumes`, path `${orgId}/${candidateId}/${fileName}`.
3. Inserts the `resumes` row (`storage_path`, `file_name`, `mime_type`, `byte_size`).
4. Inserts the `applications` row (`candidate_id`, `job_id`, `stage='new'`, `analysis_status='pending'`).
5. Gets the user's access token: `const { data: { session } } = await supabase.auth.getSession()`.
6. Schedules analysis without blocking: `import { after } from "next/server"` then `after(triggerAnalysis({ resumeId, applicationId, jobId, accessToken: session.access_token }))`.
7. `revalidatePath("/dashboard/candidates")` and returns the candidate id.

Also export `rerunAnalysis(applicationId)` — re-schedules `triggerAnalysis` for a `pending`/`failed` application.

- [ ] **Step 4: Verify and commit**

`npm run lint && npm run build` pass.
```bash
git add platform-web/src/lib/ai.ts platform-web/src/lib/data/candidates.ts platform-web/src/lib/data/resumes.ts
git commit -m "feat(web): add candidates, resumes and AI-trigger data modules"
```

### Task 10: Wire Candidate pages + live AI score

**Files:**
- Modify: `platform-web/src/app/(dashboard)/dashboard/candidates/page.tsx`
- Modify: `platform-web/src/app/(dashboard)/dashboard/candidates/[id]/page.tsx`
- Modify: `platform-web/src/app/(dashboard)/dashboard/candidates/[id]/scorecard/page.tsx`
- Create: `platform-web/src/components/AnalysisStatus.tsx`

- [ ] **Step 1: Create `AnalysisStatus.tsx`**

A client component that takes an `applicationId` and initial `status`/`score`. If status is `pending`/`processing` it subscribes via the browser Supabase client to `applications` row changes (`supabase.channel(...).on("postgres_changes", { event: "UPDATE", schema: "public", table: "applications", filter: \`id=eq.${applicationId}\` }, …)`) and calls `router.refresh()` when the row reaches `complete`/`failed`. While pending it shows an "AI screening…" `Badge` + `Skeleton`.

- [ ] **Step 2: Convert `candidates/page.tsx` (list)**

Async Server Component: `listCandidates()` (joined with applications for stage/score). Render the existing Warm + Sage table; for each row use `<AnalysisStatus>` for the AI-Fit cell so pending rows update live. Interactivity (filter chips, search) → a client `CandidatesView`. Add an "Add candidate" control opening a form that posts to `addCandidateWithResume`. Remove `mockData`. Keep hrefs. `EmptyState` when empty.

- [ ] **Step 3: Convert `candidates/[id]/page.tsx` (detail)**

Async Server Component: `getCandidate(params.id)`. Render real identity, applications, and the real `resume_analyses` breakdown (skills found/missing, red flags, scores). Use `<AnalysisStatus>` so a still-screening candidate fills in live. Add a "Re-run screening" button (calls `rerunAnalysis`). Keep the Warm + Sage layout from the overhaul.

- [ ] **Step 4: Convert `candidates/[id]/scorecard/page.tsx`**

Async Server Component reading the candidate + analysis; render the scorecard from real data. If no scorecard data exists yet, show an `EmptyState`.

- [ ] **Step 5: Verify and commit**

`npm run lint && npm run build` pass. Grep gate: `grep -rn "mockData" "platform-web/src/app/(dashboard)/dashboard/candidates"` returns nothing.
```bash
git add "platform-web/src/app/(dashboard)/dashboard/candidates/page.tsx" "platform-web/src/app/(dashboard)/dashboard/candidates/[id]/page.tsx" "platform-web/src/app/(dashboard)/dashboard/candidates/[id]/scorecard/page.tsx" platform-web/src/components/AnalysisStatus.tsx
git commit -m "feat(web): wire candidate pages with live async AI screening"
```

---

## Phase D — Pipeline, Dashboard, preview & sample data

### Task 11: `applications` & `dashboard` data modules

**Files:**
- Create: `platform-web/src/lib/data/applications.ts`
- Create: `platform-web/src/lib/data/dashboard.ts`

- [ ] **Step 1: Create `applications.ts`**

Exports: `listApplications({ jobId? })` (joined to candidate + job for display); `getPipeline()` returning applications grouped by the six `app_stage` values; and Server Actions `moveStage(applicationId, stage, reason?)` (updates `applications.stage`, `revalidatePath('/dashboard/pipeline')`) and `assignOwner(applicationId, userId)`. Follow the `jobs.ts` pattern.

- [ ] **Step 2: Create `dashboard.ts`**

Export `getDashboardData()` returning the KPI counts and priority queue with **single aggregate queries** (use Supabase `select("*", { count: "exact", head: true })` with `.eq` filters for counts — no fetching all rows to count). Returns: needs-review count, SLA-risk count, interviews-pending count, offers-pending count, a top-N priority queue (highest `ai_score`, not rejected), and active jobs with their application counts.

- [ ] **Step 3: Verify and commit**

`npm run lint && npm run build` pass.
```bash
git add platform-web/src/lib/data/applications.ts platform-web/src/lib/data/dashboard.ts
git commit -m "feat(web): add applications and dashboard data modules"
```

### Task 12: Wire Pipeline & Dashboard

**Files:**
- Modify: `platform-web/src/app/(dashboard)/dashboard/pipeline/page.tsx`
- Modify: `platform-web/src/app/(dashboard)/dashboard/page.tsx`
- Modify: `platform-web/src/app/(dashboard)/dashboard/jobs/[id]/page.tsx` (wire its candidates section)
- Create: `platform-web/src/components/OnboardingChecklist.tsx`

- [ ] **Step 1: Convert `pipeline/page.tsx`**

Async Server Component: `getPipeline()`. Render the horizontal Kanban (from the UI overhaul) with real applications. Each card includes a stage-change control (a `Select` of the six stages) wired to the `moveStage` Server Action — moving a candidate persists. (Drag-and-drop stays Phase 1.) Use `<AnalysisStatus>` on cards still screening. Remove `mockData`.

- [ ] **Step 2: Convert `dashboard/page.tsx`**

Async Server Component: `getDashboardData()`. Render the real KPIs, priority queue, and requisition health. If the org has zero jobs, render `<OnboardingChecklist>` instead of the empty queue. Remove `mockData`.

- [ ] **Step 3: Create `OnboardingChecklist.tsx`**

Shows steps "Post your first job", "Add your first candidate", "Invite a teammate", "Load sample data" — each links to its destination or (sample data) calls the Task 14 action. Steps tick off based on real counts passed in.

- [ ] **Step 4: Wire the Job Detail candidates section**

In `jobs/[id]/page.tsx`, replace the empty-state placeholder from Task 6 Step 3 with `listApplications({ jobId: params.id })`.

- [ ] **Step 5: Verify and commit**

`npm run lint && npm run build` pass. Grep: no `mockData` in `pipeline/page.tsx` or `dashboard/page.tsx`.
```bash
git add "platform-web/src/app/(dashboard)/dashboard/pipeline/page.tsx" "platform-web/src/app/(dashboard)/dashboard/page.tsx" "platform-web/src/app/(dashboard)/dashboard/jobs/[id]/page.tsx" platform-web/src/components/OnboardingChecklist.tsx
git commit -m "feat(web): wire pipeline and dashboard to real data"
```

### Task 13: Preview banner on non-core pages

**Files:**
- Create: `platform-web/src/components/PreviewBanner.tsx`
- Modify: `hiring-flow`, `interviews`, `collaboration`, `communications`, `sourcing`, `automations`, `analytics`, `notifications`, `profile` pages (add the banner)

- [ ] **Step 1: Create `PreviewBanner.tsx`**

```tsx
import { Banner } from "@/components";

export function PreviewBanner() {
  return (
    <div className="px-8 pt-6">
      <Banner tone="warning">
        Preview — this area shows sample data. Live functionality lands in a later phase.
      </Banner>
    </div>
  );
}
```

- [ ] **Step 2: Add the banner to each non-core page**

For each of the nine pages above, import `PreviewBanner` and render it as the first child of the page's root element. Do not otherwise change those pages — they keep their current UI and their local mock display (the §10 no-`mockData` gate does NOT apply to them).

- [ ] **Step 3: Verify and commit**

`npm run lint && npm run build` pass.
```bash
git add platform-web/src/components/PreviewBanner.tsx "platform-web/src/app/(dashboard)/dashboard/hiring-flow/page.tsx" "platform-web/src/app/(dashboard)/dashboard/interviews/page.tsx" "platform-web/src/app/(dashboard)/dashboard/collaboration/page.tsx" "platform-web/src/app/(dashboard)/dashboard/communications/page.tsx" "platform-web/src/app/(dashboard)/dashboard/sourcing/page.tsx" "platform-web/src/app/(dashboard)/dashboard/automations/page.tsx" "platform-web/src/app/(dashboard)/dashboard/analytics/page.tsx" "platform-web/src/app/(dashboard)/dashboard/notifications/page.tsx" "platform-web/src/app/(dashboard)/dashboard/profile/page.tsx"
git commit -m "feat(web): mark non-core pages as preview"
```

### Task 14: Sample-data seed

**Files:**
- Create: `platform-web/src/lib/data/sample.ts`

- [ ] **Step 1: Create `sample.ts`**

Two Server Actions:
- `loadSampleData()` — inserts into the current org a fixed set of ~4 jobs, ~8 candidates, and `applications` spread across stages with pre-filled `ai_score`, `recommendation`, and `analysis_status='complete'` (no LLM call — the scores are illustrative). Tag every seeded row so it can be found again — set `candidates.source = 'sample'` and a recognizable job title prefix, or insert a marker. `revalidatePath` the dashboard, jobs, candidates, pipeline.
- `clearSampleData()` — deletes only the rows created by `loadSampleData` (matched by the marker), org-scoped.

Derive the content from the retired `mockData.ts` values so it looks realistic.

- [ ] **Step 2: Wire into the onboarding checklist**

The `OnboardingChecklist` "Load sample data" item calls `loadSampleData()`; add a "Clear sample data" control (e.g. in Settings or the checklist) calling `clearSampleData()`.

- [ ] **Step 3: Verify and commit**

`npm run lint && npm run build` pass.
```bash
git add platform-web/src/lib/data/sample.ts platform-web/src/components/OnboardingChecklist.tsx
git commit -m "feat(web): add one-click sample-data seed for demos"
```

---

## Phase E — Deploy & verify

### Task 15: Configure environments & deploy

**Files:** none (configuration + deploy)

- [ ] **Step 1: Supabase Auth config**

In the Supabase dashboard for `redgbugvyoidjwhovmxa`, under Auth settings: for Phase 0 demos, **disable "Confirm email"** so signup yields an immediate session (Task 4 Step 2 depends on this). Add the deployed `platform-web` URL to the allowed redirect URLs.

- [ ] **Step 2: Frontend env on Vercel (project A)**

Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_API_URL` (the deployed FastAPI URL) via `vercel env` or the dashboard, for Production + Preview.

- [ ] **Step 3: Backend env on Vercel (project B)**

Set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWKS_URL` (`https://redgbugvyoidjwhovmxa.supabase.co/auth/v1/.well-known/jwks.json`), and the existing LLM provider keys. Confirm the FastAPI app is deployed and reachable.

- [ ] **Step 4: Deploy**

Push to `main` (Vercel auto-deploys `platform-web`). Deploy the backend per its existing Vercel setup. Confirm both URLs respond.

### Task 16: End-to-end verification

**Files:** Create `scripts/verify-rls.md` (a short checklist file) — optional.

- [ ] **Step 1: RLS isolation check**

Create two orgs (two signups). Using each user's session, attempt to read the other org's `jobs`/`candidates`/`applications`. Expected: each org sees only its own rows. Verify via the app and via MCP `execute_sql` with each JWT context if possible.

- [ ] **Step 2: Core-loop E2E on the deployed URL**

Sign up → org auto-created → post a job → add a candidate with a resume → candidate appears immediately as "AI screening…" → within seconds the real AI score appears live (no refresh) → open Candidate Detail and see the explainable breakdown → move the candidate to "Interview" on the Pipeline → reload: the stage persisted.

- [ ] **Step 3: Persistence check**

Restart the backend. Confirm all data (jobs, candidates, applications, analyses) is still present — it lives in Supabase, not memory.

- [ ] **Step 4: Grep gate**

`grep -rn "mockData" platform-web/src/app/(dashboard)/dashboard/{page.tsx,jobs,candidates,pipeline}` returns nothing. Login/signup contain no hardcoded credentials.

- [ ] **Step 5: Final build + commit**

`cd platform-web && npm run lint && npm run build` pass; `cd backend && python -m pytest -q` passes. Commit any verification fixes, then push.

```bash
git add <any fixed files>
git commit -m "test(phase-0): end-to-end verification fixes"
git push origin main
```

---

## Self-Review Notes

- **Spec coverage:** §3 architecture → Tasks 2,5,7 (server-layer data access, FastAPI=AI). §4 DB → Task 1. §5.1 plumbing → Task 2. §5.2 auth → Task 4. §5.3 data layer → Tasks 3,5,9,11,14. §5.4 page conversions → Tasks 6,10,12. §5.5 preview → Task 13. §5.6 states → Tasks 10,12. §5.7 sample data → Task 14. §6 backend AI-only → Tasks 7,8. §7 async resume→AI flow → Tasks 8,9,10 (`after()`, `analysis_status`, Realtime). §9 deploy → Task 15. §10 verification → Task 16. §13 performance → async (Tasks 8–10), aggregate queries (Task 11).
- **Type consistency:** `getCurrentOrgId` used by all data modules; `analysis_status` enum values (`pending|processing|complete|failed`) consistent across migration 005, backend Task 8, and `AnalysisStatus` Task 10; `triggerAnalysis` signature consistent between `ai.ts` (Task 9) and its callers.
- **Out of scope (correctly excluded):** drag-and-drop, real Scheduling/Offers/Inbox/Automations/Analytics, org switcher, OAuth, full RBAC UI — all Phase 1+.
- **Verification model:** backend tasks are TDD with pytest (real runner); frontend tasks verify with `npm run lint` + `npm run build` + grep gates; Task 16 is the end-to-end gate. No frontend test framework is added (YAGNI, per spec §10).
