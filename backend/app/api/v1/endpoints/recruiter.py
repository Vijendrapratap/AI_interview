from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.api import deps
from app.schemas.recruiter import (
    CandidateNoteRequest,
    CandidateStageMoveRequest,
    FeedbackRequestCreate,
    InterviewInviteRequest,
    RecruiterActionResponse,
    RecruiterCandidate,
    RecruiterDashboardResponse,
    RecruiterHiringFlowResponse,
    RecruiterJob,
)
from app.services.job_description import jd_generator
from app.services.recruiter.ats import recruiter_ats_service

router = APIRouter()


class JDGenerationRequest(BaseModel):
    role: str
    industry: str
    seniority: str
    skills: list[str]


@router.get("/dashboard", response_model=RecruiterDashboardResponse)
async def get_recruiter_dashboard():
    return recruiter_ats_service.get_dashboard()


@router.get("/jobs", response_model=list[RecruiterJob])
async def list_jobs():
    return recruiter_ats_service.list_jobs()


@router.get("/jobs/{job_id}", response_model=RecruiterJob)
async def get_job(job_id: str):
    job = recruiter_ats_service.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.get("/candidates", response_model=list[RecruiterCandidate])
async def list_candidates():
    return recruiter_ats_service.list_candidates()


@router.get("/candidates/{candidate_id}", response_model=RecruiterCandidate)
async def get_candidate(candidate_id: str):
    candidate = recruiter_ats_service.get_candidate(candidate_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return candidate


@router.post("/candidates/{candidate_id}/move-stage", response_model=RecruiterCandidate)
async def move_candidate_stage(candidate_id: str, request: CandidateStageMoveRequest):
    candidate = recruiter_ats_service.move_candidate_stage(candidate_id, request)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return candidate


@router.post("/candidates/{candidate_id}/notes", response_model=RecruiterCandidate)
async def add_candidate_note(candidate_id: str, request: CandidateNoteRequest):
    candidate = recruiter_ats_service.add_candidate_note(candidate_id, request)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return candidate


@router.post("/candidates/{candidate_id}/interview-invite", response_model=RecruiterActionResponse)
async def send_interview_invite(candidate_id: str, request: InterviewInviteRequest):
    result = recruiter_ats_service.send_interview_invite(candidate_id, request)
    if not result:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return result


@router.post("/candidates/{candidate_id}/feedback-requests", response_model=RecruiterCandidate)
async def request_feedback(candidate_id: str, request: FeedbackRequestCreate):
    candidate = recruiter_ats_service.request_feedback(candidate_id, request)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return candidate


@router.get("/interviews")
async def get_interview_queue():
    return recruiter_ats_service.get_interview_queue()


@router.get("/collaboration")
async def get_collaboration_queue():
    return recruiter_ats_service.get_collaboration_queue()


@router.get("/analytics")
async def get_recruiter_analytics():
    return recruiter_ats_service.get_analytics()


@router.get("/hiring-flow", response_model=RecruiterHiringFlowResponse)
async def get_hiring_flow():
    return recruiter_ats_service.get_hiring_flow()


@router.post("/generate-jd")
async def generate_jd(
    request: JDGenerationRequest,
    current_user: dict = Depends(deps.get_current_active_user)
):
    try:
        jd = await jd_generator.generate_jd(
            role=request.role,
            industry=request.industry,
            seniority=request.seniority,
            skills=request.skills
        )
        return jd
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
