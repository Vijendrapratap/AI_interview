# ReCruItAI — Feature Documentation

This directory documents every feature in the platform so you (and any future engineer) can quickly tell **what works, what's a preview, and what's broken** — and how each piece fits together.

Every feature doc follows the same shape:
- A **Status** badge (the legend is below)
- A **plain-language summary** of what the feature does
- A **Mermaid diagram** of the data/control flow
- The **files involved** (linked, so you can jump straight to the code)
- **What works**, **what's missing**, and the **next concrete fix** if it's not fully real yet

---

## Status legend

| Badge | Meaning |
|---|---|
| ✅ **Working** | End-to-end on real Supabase data; safe to demo and use |
| ⚠️ **Partial** | Some real wiring + a known gap (called out per doc) |
| 🚧 **Preview** | UI exists but reads mock data; behind a `PreviewBanner` |
| ❌ **Broken / Missing** | Visible in the UI but does nothing meaningful, or absent entirely |

---

## Current state at a glance

| # | Feature | Status | Recruiter entry | Candidate entry |
|---|---|---|---|---|
| 01 | [Authentication & Org](01-authentication.md) | ✅ Working | `/signup`, `/login` | `/signup` (joins via invite) |
| 02 | [Jobs (post / list / detail)](02-jobs.md) | ✅ Working | `/dashboard/jobs` | — |
| 03 | [Candidates (add / detail / scorecard)](03-candidates.md) | ✅ Working | `/dashboard/candidates` | — |
| 04 | [Resume AI Screening (async)](04-resume-ai-screening.md) | ⚠️ Partial — needs deployed backend | "Add candidate" form | `/portal` (self-upload) |
| 05 | [Pipeline (Kanban)](05-pipeline.md) | ✅ Working (stage moves persist; drag-drop is Phase 1) | `/dashboard/pipeline` | — |
| 06 | [Dashboard (KPIs + onboarding)](06-dashboard.md) | ✅ Working | `/dashboard` | — |
| 07 | [AI Live Interview](07-ai-interview.md) | ⚠️ Partial — **engine real, persistence + candidate invites are not** | `/dashboard/interviews` ("Copy link" generates a broken link) | `/portal` → upload → "Start Interview Now" |
| 08 | [Multi-platform Job Posting](08-multi-platform-posting.md) | ❌ **Cosmetic only — no real LinkedIn/Indeed/Naukri API calls** | `/dashboard/jobs/new`, `/dashboard/sourcing` | — |
| 09 | [Sample Data Seed](09-sample-data.md) | ✅ Working (org-scoped, removable) | Dashboard onboarding | — |
| 10 | [Settings & Team Invites](10-settings-team.md) | ✅ Working (Org + Team tabs) · 🚧 Enterprise controls preview | `/dashboard/settings` | `/accept-invite?token=…` |
| 11 | [Preview-only Pages](11-preview-pages.md) | 🚧 Preview | (9 sidebar pages) | — |
| 00 | [Architecture overview](00-architecture.md) | — | — | — |

---

## The two biggest honest gaps you flagged

These have their own deep-dive docs with **proposed concrete fixes** (a single first-pass change you can ship to close the gap):

### 1. AI Interview — candidate-side flow is broken end-to-end
- The interview engine itself **is real** (LLM questions, evaluation, TTS, voice recording) — see doc 07.
- But: interview sessions live in a Python dict, not Supabase. The "Copy link" on the recruiter Interviews page generates a URL with a mock candidate id that the backend will 404. The "Send interview invite" route returns a hardcoded demo string and sends no email.
- Result: a real candidate cannot do an interview via a recruiter-sent link.
- **The fix (one focused PR):** persist `interview_sessions` to the existing Supabase table + change the recruiter invite to generate a real signed link tied to a real `resumes.id`. Details in [07-ai-interview.md](07-ai-interview.md).

### 2. Multi-platform job posting — cosmetic only
- The Sourcing page lists LinkedIn / Indeed / Naukri / Glassdoor with "Connected" badges.
- "Publish" on the New Job page animates a per-platform progress bar and writes a row to `job_publications` with a **fabricated** `published_url` (`linkedin.com/jobs/view/codesstellar-abc123` is a string built in code, not returned by LinkedIn).
- Zero actual API calls to any job board exist in the codebase.
- **The fix (first board to make real):** the `platform_connections` and `job_publications` tables, the UI, and the `publishJob()` Server Action already exist — what's missing is the actual integration. Pick one board (LinkedIn Jobs Posting API is the obvious starting point), add real OAuth + a real POST, replace the fake URL with the one the API returns. Details in [08-multi-platform-posting.md](08-multi-platform-posting.md).

---

## How to use these docs when building new features

1. **Before touching a feature, read its doc.** The "Files" section tells you the *exact* code paths so you don't grep blindly.
2. **The diagrams are the contract.** If your change alters a flow, update the diagram in the same PR. Stale diagrams are worse than no diagrams.
3. **Always match the data-layer pattern.** All DB access goes through `platform-web/src/lib/data/*.ts` modules — never call the Supabase client from a page directly. The pattern is documented in [00-architecture.md](00-architecture.md).
4. **Async AI work uses `next/server`'s `after()`** — never block a Server Action on an LLM call. Pattern shown in doc 04.
5. **Update the status badge in this README** whenever a doc's status changes (e.g. when 08 moves from ❌ to ⚠️ after LinkedIn integration ships).
