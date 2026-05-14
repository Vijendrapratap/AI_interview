# Enterprise Recruiter ATS Revamp Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Transform the existing AI interview/resume analyzer into a clean recruiter-centric ATS workspace with jobs, candidates, screening, interview orchestration, collaboration, analytics, and enterprise readiness.

**Architecture:** Keep the current FastAPI + Next.js stack. Add ATS domain contracts behind `/api/v1/recruiter` while the frontend progressively moves from local mock data to API-backed recruiter workflows. Preserve existing candidate portal and interview flows while building recruiter-first screens around pipeline decisions and next actions.

**Tech Stack:** FastAPI, Pydantic, Next.js App Router, TypeScript, Tailwind, existing resume/interview analytics services.

---

## Product direction from ATS research

Leading ATS/interview platforms cluster around: structured hiring, CRM/pipeline, AI screening, interview kits, scheduling, feedback collection, analytics, and integrations. The revamp should position as:

**A simple AI-first ATS for recruiters: screen resumes, run structured AI interviews, and manage the hiring pipeline from one clean workspace.**

Design principles:
- Recruiter sees what needs attention first.
- AI explains recommendations; it never silently rejects.
- Candidate and job context stay in one place.
- Advanced enterprise settings stay out of the default flow.
- Every screen should reduce admin work or decision fatigue.

---

## Phase 1 — Recruiter command center and ATS data model

### Task 1: Add ATS mock data and frontend types

**Objective:** Extend the existing recruiter mock data with enterprise ATS fields without touching interview/report user changes.

**Files:**
- Modify: `platform-web/src/lib/mockData.ts`

**Add fields:**
- Jobs: `requisition_id`, `hiring_manager`, `priority`, `sla_status`, `days_open`, `pipeline_health`, `owner`, `next_action`.
- Candidates: `source`, `owner`, `last_activity`, `next_action`, `risk_level`, `compliance_status`, `stage_age_days`, `interview_status`, `screening_summary`.
- Analytics: recruiter action metrics, bottlenecks, source performance.

**Verify:**
- `npm run lint` from `platform-web`.

### Task 2: Revamp dashboard into recruiter command center

**Objective:** Replace generic overview with a clear recruiter workspace.

**Files:**
- Modify: `platform-web/src/app/(dashboard)/dashboard/page.tsx`

**UI requirements:**
- KPI cards: candidates needing review, SLA risks, interviews pending, offers pending.
- Priority queue with next actions.
- Active requisition health table.
- Simple funnel/bottleneck summary.

**Verify:**
- Dashboard compiles and keeps `/dashboard/jobs/new` CTA.

### Task 3: Revamp candidates page into ATS pipeline table

**Objective:** Make the candidates page useful for recruiter triage.

**Files:**
- Modify: `platform-web/src/app/(dashboard)/dashboard/candidates/page.tsx`

**UI requirements:**
- Search by candidate, job, email, source, owner.
- Filters by stage and risk.
- Columns: candidate, job/req, stage age, AI fit, source, risk/compliance, owner, next action.
- Preserve interview link copy action.

**Verify:**
- Page compiles and no table link overlay blocks action buttons.

### Task 4: Add backend recruiter ATS API contracts

**Objective:** Create mock-backed recruiter API endpoints that mirror the frontend ATS model.

**Files:**
- Create: `backend/app/schemas/recruiter.py`
- Create: `backend/app/services/recruiter/__init__.py`
- Create: `backend/app/services/recruiter/ats.py`
- Modify: `backend/app/api/v1/endpoints/recruiter.py`

**Endpoints:**
- `GET /api/v1/recruiter/dashboard`
- `GET /api/v1/recruiter/jobs`
- `GET /api/v1/recruiter/jobs/{job_id}`
- `GET /api/v1/recruiter/candidates`
- `GET /api/v1/recruiter/candidates/{candidate_id}`

**Verify:**
- Import FastAPI app successfully.
- Optionally call endpoints with TestClient if auth allows.

---

## Phase 2 — Real ATS workflow foundation

### Task 5: Add persistent ATS entities

**Objective:** Move jobs/candidates/pipeline from mock/in-memory to database-backed models.

**Files:**
- Create SQLAlchemy models for `Organization`, `Job`, `Candidate`, `Application`, `PipelineStage`, `Scorecard`, `Activity`.
- Add migration or lightweight SQLite initialization depending on current app DB strategy.

### Task 6: Connect resume upload to candidate/application records

**Objective:** When a recruiter uploads or imports a resume, create a candidate and application against a job.

**Acceptance criteria:**
- Resume parsing result is attached to the candidate profile.
- Candidate gets an explainable AI match score for the target job.

### Task 7: Add pipeline actions

**Objective:** Recruiters can move candidates between stages and record reasons.

**Endpoints:**
- `POST /recruiter/candidates/{id}/move-stage`
- `POST /recruiter/candidates/{id}/notes`
- `POST /recruiter/candidates/{id}/request-feedback`

---

## Phase 3 — AI interviewer as ATS workflow

### Task 8: Add interview template and invitation workflow

**Objective:** Recruiter selects an interview template and sends a candidate link.

**Requirements:**
- Templates by role and competency.
- Generated questions mapped to scorecard criteria.
- Interview invite status visible from candidate and job pages.

### Task 9: Build recruiter review of interview results

**Objective:** Convert transcript/evaluation into structured recruiter decisions.

**Requirements:**
- Transcript summary.
- Question-by-question scores.
- Competency heatmap.
- Red flags and follow-up questions.
- Move-to-next-stage action.

---

## Phase 4 — Enterprise readiness

### Task 10: Add RBAC, audit logs, and organization settings

**Objective:** Prepare the product for enterprise use.

**Requirements:**
- Roles: admin, recruiter, hiring manager, interviewer, candidate.
- Audit log for candidate stage changes, score overrides, interview invites, rejection reasons.
- Privacy controls and data retention settings.

### Task 11: Add collaboration and communication

**Objective:** Reduce recruiter follow-up work.

**Requirements:**
- Hiring team feedback requests.
- Email templates.
- Pending feedback reminders.
- Candidate communication timeline.

### Task 12: Add analytics and integrations

**Objective:** Support recruiter and leadership reporting.

**Requirements:**
- Time in stage, source effectiveness, offer acceptance, AI screen pass rate.
- Calendar/email integration-ready service boundaries.
- Webhook/API-ready architecture.
