# 00 — Architecture Overview

The 30-second mental model of how the whole platform fits together.

---

## The stack

```mermaid
flowchart LR
  Browser[("👤 Browser")]
  subgraph Vercel_A["Vercel · platform-web (Next.js 16)"]
    Proxy["middleware → proxy.ts<br/>(auth gate)"]
    SC["Server Components<br/>(reads)"]
    SA["Server Actions<br/>(writes)"]
    Data["src/lib/data/*<br/>(typed data layer)"]
  end
  subgraph Vercel_B["Vercel · backend (FastAPI · Python)"]
    AI["AI endpoints<br/>(resume parse, score,<br/>interview engine, TTS)"]
    LLM["LLMService<br/>(OpenRouter, Anthropic,<br/>OpenAI, Groq, Gemini)"]
  end
  subgraph Supabase["Supabase · project redgbugvyoidjwhovmxa"]
    Auth["Auth<br/>(JWT, sessions)"]
    Postgres["Postgres<br/>+ RLS per org"]
    Storage["Storage<br/>(resumes bucket)"]
    Realtime["Realtime<br/>(applications updates)"]
  end

  Browser -- "page request" --> Proxy
  Proxy --> SC
  SC -- "read (user JWT)" --> Postgres
  SA -- "write (user JWT)" --> Postgres
  SA -- "upload file" --> Storage
  SA -. "after(): fire-and-forget" .-> AI
  AI -- "service-role JWT" --> Postgres
  AI -- "download resume" --> Storage
  AI -- "LLM call" --> LLM
  Browser -- "subscribe" --> Realtime
  Postgres -- "notify on update" --> Realtime
  Browser -- "auth (signup/login)" --> Auth
```

---

## The rules (the production-grade pattern this app follows)

1. **One product language.** TypeScript everywhere. Python only inside the FastAPI backend, which is narrow: it does AI compute and nothing else.
2. **The Next.js *server layer* is the API.** Pages read via **Server Components**; mutations go through **Server Actions**. The browser never holds a privileged key and never writes to the database directly.
3. **All DB access goes through one typed data layer** in `platform-web/src/lib/data/*.ts`. One module per entity (`organizations.ts`, `jobs.ts`, `candidates.ts`, etc.). Pages never call the Supabase client directly.
4. **Supabase Auth + RLS** is the multi-tenant safety net. Every org-scoped row is filtered by `organization_members` membership at the database — a bug in app code cannot leak cross-org data.
5. **AI never blocks the UI.** Server Actions schedule LLM work with Next.js `after()`; the UI shows a "screening…" state and updates live via Supabase Realtime when the score lands.
6. **Migrations as files.** Schema lives in `supabase/migrations/00*.sql`. They are idempotent and the source of truth — never edit Supabase tables directly without a migration to match.

---

## Directory map (only the parts that matter)

```
ReCruItAI/
├─ platform-web/                       # Next.js 16 frontend (THE app)
│  ├─ src/app/(dashboard)/             # recruiter workspace (auth required)
│  ├─ src/app/(auth)/                  # login, signup, accept-invite
│  ├─ src/app/(portal)/                # candidate-facing portal (no auth required)
│  ├─ src/app/interview/[id]/          # the live AI interview page
│  ├─ src/lib/supabase/                # @supabase/ssr server + browser clients
│  ├─ src/lib/data/                    # the typed data layer (every DB call lives here)
│  ├─ src/lib/ai.ts                    # the one function that calls FastAPI
│  ├─ src/lib/types/database.ts        # generated from the live Supabase schema
│  ├─ src/components/                  # Warm + Sage component library
│  └─ proxy.ts                         # Next.js 16 proxy (auth gate)
├─ backend/                            # FastAPI — AI only
│  ├─ app/auth/supabase.py             # verifies Supabase JWT
│  ├─ app/supabase_admin.py            # service-role client (writes analyses)
│  ├─ app/api/v1/endpoints/            # analysis, resume, interview, tts
│  └─ app/services/                    # LLM, parsers, analyzers
├─ supabase/migrations/                # schema (001–006). Source of truth.
└─ docs/
   ├─ superpowers/specs/               # design specs
   ├─ superpowers/plans/               # implementation plans
   ├─ superpowers/deploys/             # deploy handoffs
   └─ features/                        # ← you are here
```

---

## A typical write flow (the canonical example)

What happens when a recruiter clicks "Create Job":

```mermaid
sequenceDiagram
  participant U as Recruiter
  participant P as JobsNew page<br/>(client form)
  participant SA as createJob Server Action<br/>(lib/data/jobs.ts)
  participant SB as Supabase<br/>(Postgres + RLS)

  U->>P: fills form, submits
  P->>SA: createJob(input)
  SA->>SA: createClient() (server, with user JWT cookie)
  SA->>SA: getCurrentOrgId()
  SA->>SB: INSERT INTO jobs (... organization_id, created_by)
  Note over SB: RLS check:<br/>can this user write to this org?
  SB-->>SA: { id }
  SA->>SA: revalidatePath("/dashboard/jobs")
  SA-->>P: jobId
  P->>U: router.push("/dashboard/jobs/" + jobId)
```

Every write in the app follows this exact shape. If you can read this diagram, you can find your way through any feature in the codebase.

---

## The async-AI flow (the second canonical example)

What happens when a recruiter uploads a resume — the UI never blocks on the LLM:

```mermaid
sequenceDiagram
  participant U as Recruiter
  participant P as Candidates page<br/>(client form)
  participant SA as addCandidateWithResume<br/>(lib/data/resumes.ts)
  participant SB as Supabase<br/>(Postgres + Storage)
  participant FA as FastAPI<br/>/api/v1/analysis/analyze
  participant LLM as LLM provider

  U->>P: pick resume + job, submit
  P->>SA: FormData
  SA->>SB: upload file to Storage
  SA->>SB: INSERT candidate, resume, application<br/>(analysis_status='pending')
  SA-->>P: candidate id (returns IMMEDIATELY)
  P->>U: candidate appears as "AI screening…"
  Note over SA,FA: after() schedules this AFTER the response
  SA->>FA: POST /analyze<br/>{resume_id, application_id, job_id}<br/>Authorization: Bearer <userJWT>
  FA->>SB: status='processing'
  FA->>SB: download file from Storage (service role)
  FA->>LLM: parse + score (10–30s)
  FA->>SB: INSERT resume_analyses<br/>UPDATE applications (score, status='complete')
  SB-->>P: Realtime UPDATE event
  P->>U: row flips to real score live, no refresh
```

This pattern (instant write + `after()` + Realtime update) is how every long-running AI feature should be built going forward.
