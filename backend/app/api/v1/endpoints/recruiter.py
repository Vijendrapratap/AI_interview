from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from pydantic import BaseModel
from app.services.job_description import jd_generator
# from app.api.deps import get_current_user # To be implemented properly later

router = APIRouter()

class JDGenerationRequest(BaseModel):
    role: str
    industry: str
    seniority: str
    skills: List[str]

from app.api import deps

@router.post("/generate-jd")
async def generate_jd(
    request: JDGenerationRequest,
    current_user: dict = Depends(deps.get_current_active_user)
):
    """
    Generate a Job Description using AI.
    """
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
