from fastapi import APIRouter
from app.api.v1.endpoints import resume, analysis, interview, report, tts, auth, verification, recruiter

router = APIRouter()

router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
router.include_router(resume.router, prefix="/resume", tags=["Resume"])
router.include_router(analysis.router, prefix="/analysis", tags=["Analysis"])
router.include_router(interview.router, prefix="/interview", tags=["Interview"])
router.include_router(report.router, prefix="/report", tags=["Report"])
router.include_router(tts.router, prefix="/tts", tags=["TTS"])
router.include_router(verification.router, prefix="/verification", tags=["Verification"])
router.include_router(recruiter.router, prefix="/recruiter", tags=["Recruiter"])
