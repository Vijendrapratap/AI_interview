# ReCruItAI

ReCruItAI is an AI-first applicant tracking system for recruiters. It combines resume screening, structured AI interviews, candidate pipeline management, collaboration, communication workflows, sourcing insight, and recruiting analytics in one clean workspace.

## Product Direction

The platform is designed around one principle: recruiters should make faster and better hiring decisions without extra admin work. AI assists screening and interviewing, while recruiters stay in control of decisions, approvals, and candidate communication.

## Key Platform Modules

### Recruiter Command Center
- Priority queue for the next best recruiter action
- At-risk requisitions and SLA alerts
- Interview, offer, and feedback reminders
- Pipeline health metrics

### Job & Requisition Management
- Active job list and job detail pages
- Requisition metadata, owner, hiring manager, priority, SLA, and required skills
- Pipeline counts by stage

### Candidate Pipeline
- Candidate triage table
- Kanban-style hiring pipeline
- AI score, recommendation, risk, compliance, source, owner, and next action
- Candidate profiles and structured scorecards

### AI Resume Screener
- Resume quality score
- ATS match score
- Skills found and missing
- Red flags and explainable screening summary

### AI Interview Center
- Candidate interview invite workflow
- Adaptive AI interview foundation
- Transcript and report review
- Structured scorecards with competency evidence

### Collaboration & Communication
- Hiring team feedback queue
- Scorecard reminders
- Candidate email template center
- Bulk communication workflow foundation

### Sourcing & Analytics
- Source quality insights
- Candidate rediscovery workspace foundation
- Time-to-hire, offer acceptance, AI pass rate, bottlenecks, and SLA risk metrics

### Enterprise Roadmap
- RBAC and workspace roles
- Audit logs
- Candidate consent and retention controls
- Bias-aware screening workflows
- Calendar, email, job board, HRIS, and Slack integrations

## Tech Stack

- Frontend: Next.js, TypeScript, Tailwind CSS
- Backend: FastAPI, Pydantic
- AI: Resume analysis, ATS scoring, structured interview generation, interview feedback
- Database: SQLite now, designed for persistence expansion

## Local Development

### Frontend
```bash
cd platform-web
npm install
npm run dev
```

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## Verification

Validated in this implementation pass:

- Frontend lint: `npm run lint`
- Frontend production build: `npm run build`
- Backend recruiter schema/service compile
- Backend recruiter service smoke flow

See `docs/ats-competitor-feature-research.md` for the ATS competitor feature review and implementation mapping.
