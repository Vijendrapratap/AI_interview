from typing import Dict, List, Literal, Optional

from pydantic import BaseModel, Field


PipelineStage = Literal[
    "Received",
    "Screening",
    "Interview",
    "Offer",
    "Hired",
    "Rejected",
]
RiskLevel = Literal["Low", "Medium", "High"]
SLAStatus = Literal["Healthy", "Watch", "At Risk"]


class RecruiterJob(BaseModel):
    id: str
    requisition_id: str
    title: str
    department: str
    location: str
    type: str
    salary_range: str
    posted_at: str
    status: str
    priority: Literal["High", "Medium", "Low"]
    hiring_manager: str
    owner: str
    days_open: int
    sla_status: SLAStatus
    pipeline_health: int = Field(ge=0, le=100)
    applicants_count: int
    stages: Dict[str, int]
    required_skills: List[str]
    next_action: str
    description: str


class ResumeScreen(BaseModel):
    quality_score: int = Field(ge=0, le=100)
    ats_score: int = Field(ge=0, le=100)
    match_percentage: int = Field(ge=0, le=100)
    skills_found: List[str]
    skills_missing: List[str]
    red_flags: List[str]


class InterviewSignal(BaseModel):
    overall_score: int = Field(ge=0, le=100)
    strengths: List[str]
    weaknesses: List[str]
    transcript_snippet: str


class StageHistoryItem(BaseModel):
    stage: str
    changed_at: str
    changed_by: str
    note: str


class CandidateNote(BaseModel):
    id: str
    author: str
    body: str
    created_at: str
    visibility: Literal["Internal", "Hiring Team"] = "Internal"


class InterviewInvite(BaseModel):
    status: Literal["Not Sent", "Sent", "Opened", "Completed", "Expired"]
    template: str
    link: str
    sent_at: Optional[str] = None


class FeedbackRequest(BaseModel):
    id: str
    reviewer: str
    status: Literal["Pending", "Submitted", "Overdue"]
    due_at: str
    competencies: List[str]


class ScorecardCompetency(BaseModel):
    name: str
    score: int = Field(ge=0, le=100)
    evidence: str


class CandidateScorecard(BaseModel):
    competencies: List[ScorecardCompetency]
    recommendation: Literal["Strong Hire", "Hire", "Review", "Reject"]


class RecruiterCandidate(BaseModel):
    id: str
    job_id: str
    name: str
    email: str
    role_applied: str
    applied_at: str
    status: PipelineStage
    score: int = Field(ge=0, le=100)
    recommendation: str
    source: str
    owner: str
    last_activity: str
    next_action: str
    risk_level: RiskLevel
    compliance_status: Literal["Clear", "Needs Review", "Pending"]
    stage_age_days: int
    interview_status: Literal["Not Invited", "Invited", "Completed", "Needs Review"]
    screening_summary: str
    resume_analysis: ResumeScreen
    interview: Optional[InterviewSignal] = None
    stage_history: List[StageHistoryItem] = []
    notes: List[CandidateNote] = []
    interview_invite: Optional[InterviewInvite] = None
    feedback_requests: List[FeedbackRequest] = []
    scorecard: Optional[CandidateScorecard] = None
    available_actions: List[str] = []


class DashboardMetric(BaseModel):
    label: str
    value: str
    detail: str
    severity: Literal["neutral", "good", "watch", "risk"] = "neutral"


class RecruiterDashboardResponse(BaseModel):
    metrics: List[DashboardMetric]
    priority_queue: List[RecruiterCandidate]
    at_risk_jobs: List[RecruiterJob]
    pipeline_stats: List[Dict[str, int | str]]
    source_performance: List[Dict[str, int | str]]


class CandidateStageMoveRequest(BaseModel):
    stage: PipelineStage
    reason: Optional[str] = None
    note: Optional[str] = None


class CandidateNoteRequest(BaseModel):
    body: str
    visibility: Literal["Internal", "Hiring Team"] = "Internal"


class InterviewInviteRequest(BaseModel):
    template_id: str
    message: Optional[str] = None


class FeedbackRequestCreate(BaseModel):
    reviewer: str
    due_at: str
    competencies: List[str]


class RecruiterActionResponse(BaseModel):
    ok: bool
    message: str


class JobBoardChannel(BaseModel):
    name: str
    status: str
    reach: str
    cost: str
    recommendation: str


class ScreeningRule(BaseModel):
    label: str
    threshold: str
    action: str
    guardrail: str


class TestEmailDraft(BaseModel):
    candidate: str
    role: str
    score: int = Field(ge=0, le=100)
    test: str
    subject: str
    status: str


class RecruiterHiringFlowResponse(BaseModel):
    job_boards: List[JobBoardChannel]
    screening_rules: List[ScreeningRule]
    test_email_drafts: List[TestEmailDraft]
