# Phase 0 Deploy Handoff

**Status:** Code shipped to `main` (commit `78c9c75`); Vercel build failing on the frontend project due to a Root-Directory mismatch; backend Vercel project not yet provisioned; Supabase Auth not yet configured for the deployed URL.

This document lists exactly what's needed to bring the deployed app online.

---

## 1. Frontend — Vercel project `recruitai-test` (BLOCKED on project setting)

**What's done**
- `main` is up to date; all 28 Phase 0 commits pushed.
- Three production env vars set on the project:
  - `NEXT_PUBLIC_SUPABASE_URL` = `https://redgbugvyoidjwhovmxa.supabase.co`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = the project's legacy anon JWT
  - `NEXT_PUBLIC_API_URL` = `https://recruitai-backend.vercel.app` (placeholder — update after the backend project is created in §2)

**What's blocking**
The Vercel project's **Root Directory** is `.` (repo root), but the Next.js app is in `platform-web/`. Every git auto-deploy and `--archive=tgz` deploy fails with either *"Couldn't find any pages or app directory"* (repo root has no Next.js app) or *"No Next.js version detected"* (Root Directory mismatch).

**Fix — pick ONE (a) is one click)**

(a) **Set Root Directory to `platform-web` in the dashboard.** Vercel project `recruitai-test` → Settings → Build & Development → **Root Directory** = `platform-web` → Save. Then push any commit or `vercel deploy --prod` — git auto-deploy and CLI deploy will both work, the configured env vars are picked up, the app builds.

(b) **Move `platform-web/package.json` (and the rest of the Next.js app) to the repo root.** Bigger refactor — not recommended.

After (a), trigger a fresh deploy:
```bash
cd platform-web && vercel deploy --prod --yes --force --archive=tgz
```
Verify at `https://recruitai-test.vercel.app` — sign-up should land you in the dashboard with empty data + the "Load sample data" onboarding step.

---

## 2. Backend — FastAPI on Vercel (NOT YET PROVISIONED)

The backend handles resume parsing + AI screening. Until it's deployed, candidate uploads write the row but `analysis_status` stays `pending` forever (the trigger has nowhere to call). Everything else in the app works without it: sign-up, jobs, candidates *without* resume scoring, pipeline, sample data.

**To provision (one-time setup):**

1. Create a new Vercel project pointed at the same repo. In the dashboard: New Project → Import the same GitHub repo → Project Name `recruitai-backend` → Framework Preset **Other** → **Root Directory** `backend`.
2. Set these env vars (all in **Production**):

   | Name | Value |
   |---|---|
   | `SUPABASE_URL` | `https://redgbugvyoidjwhovmxa.supabase.co` |
   | `SUPABASE_SERVICE_ROLE_KEY` | (from Supabase Dashboard → Settings → API → `service_role`) — **secret, server-only** |
   | `SUPABASE_JWKS_URL` | `https://redgbugvyoidjwhovmxa.supabase.co/auth/v1/.well-known/jwks.json` |
   | LLM provider keys | whatever your current backend `.env` has (Anthropic / OpenAI / etc.) |

3. Deploy. Note the deployed URL (e.g. `https://recruitai-backend.vercel.app`).
4. Update the **frontend** project's `NEXT_PUBLIC_API_URL` env var to that real URL, then redeploy the frontend.

---

## 3. Supabase Auth — dashboard settings

In Supabase Dashboard → project `redgbugvyoidjwhovmxa` → **Authentication**:

1. **Sign In / Providers → Email →** turn **OFF** *"Confirm email"*. The current signup flow expects an immediate session — with email confirmation on, the user lands on the dashboard with no session and is bounced back to `/login`.
2. **URL Configuration → Redirect URLs:** add the deployed frontend URL(s), e.g.:
   - `https://recruitai-test.vercel.app/**`
   - any preview URLs you want to allow
3. Optionally enable Google OAuth later — out of Phase 0 scope.

---

## 4. End-to-end verification (after §1–§3)

Once the frontend deploys and the Supabase Auth config is done, run through the core loop on the public URL:

1. `/signup` → enter org name + credentials → land in `/dashboard` with the onboarding checklist.
2. Click **Load sample data** → KPIs and pipeline populate with example jobs/candidates.
3. Post a new job from `/dashboard/jobs/new` → returns to its detail page.
4. From `/dashboard/candidates` open the **Add candidate** form → upload a real resume + pick the job → candidate appears immediately as **"AI screening…"**.
5. (Needs §2 done) Within seconds, the row flips to the real AI score live via Realtime — no refresh.
6. Drag (well, *Select*) the candidate to **Interview** on the Pipeline → state persists.
7. Restart the backend → re-open the app → all data still present.

Also do the **2-org isolation** check: sign up a second account in an incognito window, create a different org, confirm zero visibility into the first org's data.

---

## 5. What's NOT in Phase 0 (deferred to later phases)

Drag-and-drop on Pipeline; real Scheduling / Offers / Inbox / Automations / Analytics / AI Copilot; org switcher; OAuth providers; full RBAC management UI; HRIS / e-sign / calendar integrations; live data on the non-core pages (currently behind the "Preview" banner).
