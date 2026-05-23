from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.api import deps
from app.services.job_description import JDGeneratorService

router = APIRouter()


class JDGenerationRequest(BaseModel):
    role: str
    industry: str
    seniority: str
    skills: list[str]


@router.post("/generate-jd")
async def generate_jd(
    request: JDGenerationRequest,
    current_user: dict = Depends(deps.get_current_active_user),
):
    try:
        service = JDGeneratorService()
        jd = await service.generate_jd(
            role=request.role,
            industry=request.industry,
            seniority=request.seniority,
            skills=request.skills,
        )
        return jd
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
