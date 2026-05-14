from datetime import datetime
from uuid import uuid4

from app.schemas.recruiter import (
    CandidateNoteRequest,
    CandidateStageMoveRequest,
    DashboardMetric,
    FeedbackRequestCreate,
    InterviewInviteRequest,
    RecruiterActionResponse,
    RecruiterCandidate,
    RecruiterDashboardResponse,
    RecruiterJob,
)


class RecruiterATSService:
    """Mock-backed ATS read/write model for the recruiter workspace."""

    def __init__(self) -> None:
        self._jobs = self._build_jobs()
        self._candidates = self._build_candidates()

    def list_jobs(self) -> list[RecruiterJob]:
        return self._jobs

    def get_job(self, job_id: str) -> RecruiterJob | None:
        return next((job for job in self._jobs if job.id == job_id), None)

    def list_candidates(self) -> list[RecruiterCandidate]:
        return self._candidates

    def get_candidate(self, candidate_id: str) -> RecruiterCandidate | None:
        return next((candidate for candidate in self._candidates if candidate.id == candidate_id), None)

    def move_candidate_stage(self, candidate_id: str, request: CandidateStageMoveRequest) -> RecruiterCandidate | None:
        candidate = self.get_candidate(candidate_id)
        if not candidate:
            return None
        candidate.status = request.stage
        candidate.stage_age_days = 0
        candidate.last_activity = f"Moved to {request.stage} just now"
        candidate.stage_history.append({
            "stage": request.stage,
            "changed_at": datetime.utcnow().isoformat(),
            "changed_by": "Recruiter",
            "note": request.note or request.reason or "Stage updated from recruiter workspace",
        })
        return candidate

    def add_candidate_note(self, candidate_id: str, request: CandidateNoteRequest) -> RecruiterCandidate | None:
        candidate = self.get_candidate(candidate_id)
        if not candidate:
            return None
        candidate.notes.append({
            "id": f"note_{uuid4().hex[:8]}",
            "author": "Recruiter",
            "body": request.body,
            "created_at": datetime.utcnow().isoformat(),
            "visibility": request.visibility,
        })
        candidate.last_activity = "Recruiter note added just now"
        return candidate

    def send_interview_invite(self, candidate_id: str, request: InterviewInviteRequest) -> RecruiterActionResponse | None:
        candidate = self.get_candidate(candidate_id)
        if not candidate:
            return None
        candidate.interview_status = "Invited"
        candidate.interview_invite = {
            "status": "Sent",
            "template": request.template_id,
            "link": f"/interview/{candidate.id}",
            "sent_at": datetime.utcnow().isoformat(),
        }
        candidate.last_activity = "AI interview invite sent just now"
        return RecruiterActionResponse(ok=True, message=f"Interview invite sent to {candidate.name}")

    def request_feedback(self, candidate_id: str, request: FeedbackRequestCreate) -> RecruiterCandidate | None:
        candidate = self.get_candidate(candidate_id)
        if not candidate:
            return None
        candidate.feedback_requests.append({
            "id": f"fb_{uuid4().hex[:8]}",
            "reviewer": request.reviewer,
            "status": "Pending",
            "due_at": request.due_at,
            "competencies": request.competencies,
        })
        candidate.last_activity = f"Feedback requested from {request.reviewer}"
        return candidate

    def get_dashboard(self) -> RecruiterDashboardResponse:
        active_candidates = [candidate for candidate in self._candidates if candidate.status != "Rejected"]
        needs_review = [candidate for candidate in active_candidates if candidate.next_action != "No action needed"]
        at_risk_jobs = [job for job in self._jobs if job.sla_status != "Healthy"]
        interviews_pending = [candidate for candidate in active_candidates if candidate.interview_status in {"Invited", "Needs Review", "Not Invited"}]

        return RecruiterDashboardResponse(
            metrics=[
                DashboardMetric(label="Needs review", value=str(len(needs_review)), detail="Recruiter-owned actions", severity="watch"),
                DashboardMetric(label="SLA risks", value=str(len(at_risk_jobs)), detail="Requisitions needing attention", severity="risk"),
                DashboardMetric(label="Interviews pending", value=str(len(interviews_pending)), detail="Invite, complete, or review", severity="neutral"),
                DashboardMetric(label="Offers pending", value="3", detail="Ready to close", severity="good"),
            ],
            priority_queue=sorted(active_candidates, key=lambda candidate: candidate.score, reverse=True)[:4],
            at_risk_jobs=at_risk_jobs,
            pipeline_stats=[
                {"name": "Received", "value": 155},
                {"name": "Screening", "value": 95},
                {"name": "Interview", "value": 45},
                {"name": "Offer", "value": 18},
                {"name": "Hired", "value": 9},
            ],
            source_performance=[
                {"source": "Referral", "candidates": 42, "quality": 91},
                {"source": "LinkedIn Sourcing", "candidates": 88, "quality": 84},
                {"source": "Inbound Application", "candidates": 151, "quality": 72},
                {"source": "Agency", "candidates": 31, "quality": 61},
            ],
        )

    def get_interview_queue(self) -> dict[str, object]:
        candidates = [candidate for candidate in self._candidates if candidate.status != "Rejected"]
        return {
            "to_invite": [candidate for candidate in candidates if candidate.interview_status == "Not Invited"],
            "awaiting_review": [candidate for candidate in candidates if candidate.interview_status == "Needs Review"],
            "completed": [candidate for candidate in candidates if candidate.interview_status == "Completed"],
        }

    def get_collaboration_queue(self) -> dict[str, object]:
        feedback = []
        for candidate in self._candidates:
            for request in candidate.feedback_requests:
                feedback.append({"candidate": candidate.name, "role": candidate.role_applied, **request.model_dump()})
        return {"feedback_requests": feedback, "overdue_count": len([item for item in feedback if item["status"] == "Overdue"])}

    def get_analytics(self) -> dict[str, object]:
        return {
            "time_to_hire": "18 days",
            "source_quality": self.get_dashboard().source_performance,
            "ai_screen_pass_rate": "41%",
            "offer_acceptance": "53%",
            "sla_risks": len([job for job in self._jobs if job.sla_status == "At Risk"]),
        }

    def _build_jobs(self) -> list[RecruiterJob]:
        return [
            RecruiterJob(id="job_1", requisition_id="REQ-ENG-1042", title="Senior Backend Engineer", department="Engineering", location="Remote / SF", type="Full-time", salary_range="$140k - $180k", posted_at="2026-01-15", status="Active", priority="High", hiring_manager="Nina Patel", owner="David Recruiter", days_open=31, sla_status="At Risk", pipeline_health=72, applicants_count=42, stages={"received": 20, "screening": 15, "interview": 6, "offer": 1}, required_skills=["Python", "FastAPI", "PostgreSQL", "AWS", "System Design"], next_action="Review 4 high-fit profiles before standup", description="Senior backend engineer for API and platform services."),
            RecruiterJob(id="job_2", requisition_id="REQ-DES-2031", title="Product Designer", department="Design", location="New York, NY", type="Full-time", salary_range="$110k - $150k", posted_at="2026-01-18", status="Active", priority="Medium", hiring_manager="Maya Chen", owner="David Recruiter", days_open=24, sla_status="Watch", pipeline_health=81, applicants_count=28, stages={"received": 12, "screening": 8, "interview": 5, "offer": 3}, required_skills=["Figma", "React", "Prototyping", "UI/UX", "User Research"], next_action="Collect final scorecards for 2 candidates", description="Product designer for core user experiences."),
            RecruiterJob(id="job_6", requisition_id="REQ-DATA-1180", title="Lead Data Scientist", department="Data", location="Seattle, WA", type="Full-time", salary_range="$150k - $200k", posted_at="2026-01-12", status="Active", priority="High", hiring_manager="Owen Brooks", owner="Priya Shah", days_open=35, sla_status="At Risk", pipeline_health=66, applicants_count=18, stages={"received": 8, "screening": 5, "interview": 4, "offer": 1}, required_skills=["Python", "TensorFlow", "SQL", "Machine Learning", "AWS"], next_action="Send AI interview invite to top candidate", description="Lead data scientist for applied AI initiatives."),
        ]

    def _build_candidates(self) -> list[RecruiterCandidate]:
        base_history = [{"stage": "Received", "changed_at": "2026-01-20", "changed_by": "System", "note": "Candidate applied"}]
        return [
            RecruiterCandidate(id="cand_1", job_id="job_1", name="Arjun Singh", email="arjun@example.com", role_applied="Senior Backend Engineer", applied_at="2026-01-20", status="Interview", score=82, recommendation="Strong Hire", source="Referral", owner="David Recruiter", last_activity="AI interview completed 2h ago", next_action="Review interview scorecard", risk_level="Low", compliance_status="Clear", stage_age_days=2, interview_status="Needs Review", screening_summary="Strong backend profile with AWS/FastAPI depth. Missing explicit system design examples.", resume_analysis={"quality_score": 85, "ats_score": 90, "match_percentage": 88, "skills_found": ["Python", "AWS", "Docker", "FastAPI", "PostgreSQL"], "skills_missing": ["System Design"], "red_flags": []}, interview={"overall_score": 79, "strengths": ["System Design", "Communication"], "weaknesses": ["GraphQL depth"], "transcript_snippet": "I designed the payment gateway microservice..."}, stage_history=base_history, available_actions=["Review scorecard", "Request feedback", "Move to final"]),
            RecruiterCandidate(id="cand_51", job_id="job_6", name="Alice Wang", email="alice.wang@email.com", role_applied="Lead Data Scientist", applied_at="2026-01-21", status="Screening", score=94, recommendation="Strong Hire", source="Inbound Application", owner="Priya Shah", last_activity="Resume screened today", next_action="Send AI technical interview", risk_level="Low", compliance_status="Pending", stage_age_days=1, interview_status="Not Invited", screening_summary="Excellent model-building and SQL background with strong match to all must-have skills.", resume_analysis={"quality_score": 96, "ats_score": 92, "match_percentage": 95, "skills_found": ["Python", "TensorFlow", "SQL", "XGBoost", "AWS"], "skills_missing": [], "red_flags": []}, stage_history=base_history, available_actions=["Send interview", "Shortlist", "Request feedback"]),
            RecruiterCandidate(id="cand_53", job_id="job_8", name="Jennifer Lopez", email="jen.lopez@email.com", role_applied="HR Manager", applied_at="2026-01-20", status="Received", score=75, recommendation="Review", source="Indeed", owner="Priya Shah", last_activity="Application received 3d ago", next_action="Review resume and decide screen", risk_level="Medium", compliance_status="Needs Review", stage_age_days=4, interview_status="Not Invited", screening_summary="Good people-ops fit but needs validation on HRIS depth and global HR experience.", resume_analysis={"quality_score": 78, "ats_score": 70, "match_percentage": 75, "skills_found": ["Recruiting", "BambooHR", "Employee Relations"], "skills_missing": ["Workday", "Global HR"], "red_flags": []}, stage_history=base_history, available_actions=["Review", "Reject", "Request screen"]),
        ]


recruiter_ats_service = RecruiterATSService()
