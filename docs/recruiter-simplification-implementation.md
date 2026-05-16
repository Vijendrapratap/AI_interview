# ReCruItAI Recruiter Simplification Implementation

Generated: 2026-05-16

## Product goal

Make existing recruitment workflows dramatically simpler for recruiters:

1. Post one job to multiple platforms.
2. Collect resumes into one workspace.
3. Parse resumes automatically.
4. Let AI score and explain candidate fit.
5. If the candidate passes the threshold, draft/send the test or AI interview email.
6. Keep recruiter approval in the loop before any candidate-facing action.

## UX principle

The recruiter should not think in modules like ATS, CRM, sourcing, scorecards, automation, and analytics. The recruiter should see one operating flow:

**Post → Collect → AI Screen → Send Test → Decide**

## Changes implemented

### Frontend

- Added a new recruiter workflow page:
  - `platform-web/src/app/(dashboard)/dashboard/hiring-flow/page.tsx`
- Added sidebar navigation item:
  - `Hiring Flow`
- Added a dashboard overview strip showing the simplified 5-step hiring flow.
- Expanded sourcing page with multi-platform posting cards:
  - LinkedIn
  - Naukri
  - Indeed
  - Company careers page
- Expanded automations page with:
  - screening threshold rules
  - pass/review/reject workflow
  - test email drafts waiting for recruiter approval
- Expanded settings page with enterprise controls so the product can remain simple while RBAC/audit/retention/integration readiness exists underneath.
- Added mock data for:
  - `recruiterFlowSteps`
  - `screeningRules`
  - `testEmailDrafts`

### Backend

- Added recruiter hiring flow response contract:
  - `RecruiterHiringFlowResponse`
  - `JobBoardChannel`
  - `ScreeningRule`
  - `TestEmailDraft`
- Added service method:
  - `recruiter_ats_service.get_hiring_flow()`
- Added API endpoint:
  - `GET /api/v1/recruiter/hiring-flow`

## Current behavior

The product now communicates the intended end-to-end recruiter workflow clearly, even before all integrations are production-backed:

- Jobs can conceptually be posted to multiple channels from one place.
- Candidate flow is explained as a single funnel.
- Resume scoring now maps to simple recruiter decisions:
  - 85+ = auto-shortlist and draft test invite
  - 70-84 = recruiter review
  - below 70 = draft rejection / keep warm
- Test email drafts are visible and approval-based.

## Next product milestones

1. Persist jobs, candidates, applications, stage movements, and test invites in the database.
2. Connect real resume upload/import to candidate/application records.
3. Add real job board posting integrations or CSV/API export first.
4. Add real email sending with recruiter approval and audit logs.
5. Add a clean job creation wizard that outputs platform-ready job posts.
6. Add candidate deduplication across channels.
7. Add candidate-facing test/interview link expiration and reminder logic.
