"""
API v1 Router
Combines all endpoint routers
"""

from fastapi import APIRouter
from app.api.v1.endpoints import resume, analysis, interview, report, tts

router = APIRouter()

# Include all endpoint routers
router.include_router(resume.router, prefix="/resume", tags=["Resume"])
router.include_router(analysis.router, prefix="/analysis", tags=["Analysis"])
router.include_router(interview.router, prefix="/interview", tags=["Interview"])
router.include_router(report.router, prefix="/report", tags=["Report"])
router.include_router(tts.router, prefix="/tts", tags=["TTS"])
