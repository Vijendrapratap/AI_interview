"""
Resume Analysis Endpoints
"""

import logging
import tempfile
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.auth.supabase import verify_supabase_jwt
from app.supabase_admin import admin_client
from app.services.analysis_persistence import build_analysis_row
from app.schemas.analysis import (
    AnalysisRequest,
    AnalysisResponse,
    QuickAnalysisResponse,
    JDComparisonRequest,
    JDComparisonResponse,
)
from app.services.resume.analyzer import ResumeAnalyzer
from app.services.resume.parser import ResumeParser

router = APIRouter()
logger = logging.getLogger(__name__)

# Store analysis results for the legacy /analyze-upload flow (in-memory)
analysis_storage: dict = {}


# ---------------------------------------------------------------------------
# New Supabase-persisted /analyze endpoint
# ---------------------------------------------------------------------------

class PersistAnalyzeRequest(BaseModel):
    resume_id: str
    application_id: str
    job_id: Optional[str] = None


@router.post("/analyze")
async def analyze_resume_persist(
    request: PersistAnalyzeRequest,
    _claims: dict = Depends(verify_supabase_jwt),
):
    """
    Trigger resume analysis and persist results to Supabase.

    Accepts { resume_id, application_id, job_id }.
    Requires a valid Supabase Bearer token.
    Always returns HTTP 200; errors are recorded in the DB and returned
    as { ok: false, error: "..." } rather than 4xx/5xx.
    """
    db = admin_client()
    application_id = request.application_id

    try:
        # 1. Mark application as processing
        db.table("applications").update(
            {"analysis_status": "processing", "analysis_error": None}
        ).eq("id", application_id).execute()

        # 2. Fetch resume row to get storage_path + organization_id
        resume_row = (
            db.table("resumes")
            .select("storage_path, organization_id")
            .eq("id", request.resume_id)
            .single()
            .execute()
        )
        if not resume_row.data:
            raise ValueError(f"Resume {request.resume_id} not found in DB")

        storage_path: str = resume_row.data["storage_path"]
        organization_id: str = resume_row.data["organization_id"]

        # 3. Download file bytes from Storage
        file_bytes: bytes = db.storage.from_("resumes").download(storage_path)

        # 4. Save to temp file and parse
        suffix = "." + storage_path.rsplit(".", 1)[-1] if "." in storage_path else ".pdf"
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            tmp.write(file_bytes)
            tmp_path = tmp.name

        from pathlib import Path
        parser = ResumeParser()
        parsed = await parser.parse(Path(tmp_path))
        resume_text: str = parsed.get("text", "")

        # 5. Run analyzer
        analyzer = ResumeAnalyzer()
        analyzer_output: dict = await analyzer.analyze(
            resume_text=resume_text,
            job_description=None,
            analysis_type="comprehensive",
        )

        # 6. Build and insert resume_analyses row
        analysis_row = build_analysis_row(
            analyzer_output,
            organization_id=organization_id,
            resume_id=request.resume_id,
            job_id=request.job_id,
        )
        db.table("resume_analyses").insert(analysis_row).execute()

        # 7. Update application with results
        db.table("applications").update(
            {
                "ai_score": analyzer_output.get("overall_score"),
                "recommendation": analyzer_output.get("recommendation")
                or analyzer_output.get("verdict")
                or analyzer_output.get("hiring_recommendation", {}).get("decision")
                or "",
                "analysis_status": "complete",
                "analysis_error": None,
            }
        ).eq("id", application_id).execute()

        return {"ok": True, "application_id": application_id}

    except Exception as exc:
        logger.error(
            "Analysis persistence failed for application %s: %s",
            application_id,
            exc,
            exc_info=True,
        )
        try:
            db.table("applications").update(
                {"analysis_status": "failed", "analysis_error": str(exc)}
            ).eq("id", application_id).execute()
        except Exception as inner_exc:
            logger.error("Failed to record analysis error in DB: %s", inner_exc)
        return {"ok": False, "application_id": application_id, "error": str(exc)}


# ---------------------------------------------------------------------------
# Legacy upload-then-analyze flow (kept for portal/page.tsx compatibility)
# ---------------------------------------------------------------------------

@router.post("/analyze-upload", response_model=AnalysisResponse)
async def analyze_resume_upload(request: AnalysisRequest):
    """
    Perform comprehensive resume analysis against an in-memory uploaded resume.

    Legacy endpoint — the NEW flow is POST /analyze with { resume_id, application_id, job_id }.
    """
    from app.api.v1.endpoints.resume import resume_storage

    if request.resume_id not in resume_storage:
        raise HTTPException(status_code=404, detail="Resume not found")

    resume_data = resume_storage[request.resume_id]

    try:
        analyzer = ResumeAnalyzer()

        analysis_result = await analyzer.analyze_enhanced(
            resume_text=resume_data["text_content"],
            job_description=request.job_description,
            analysis_type=request.analysis_type,
            include_smart_questions=True,
        )

        analysis_id = f"analysis_{request.resume_id}"
        analysis_storage[analysis_id] = {
            "resume_id": request.resume_id,
            "result": analysis_result,
        }

        resume_storage[request.resume_id]["status"] = "analyzed"
        resume_storage[request.resume_id]["analysis_id"] = analysis_id

        return AnalysisResponse(
            analysis_id=analysis_id,
            resume_id=request.resume_id,
            overall_score=analysis_result.get("overall_score", 0),
            ats_score=analysis_result.get("ats_score", 0),
            content_score=analysis_result.get("content_score", 0),
            format_score=analysis_result.get("format_score", 0),
            jd_match_score=analysis_result.get("jd_match_score"),
            sections=analysis_result.get("sections", {}),
            keywords=analysis_result.get("keywords", {}),
            improvements=analysis_result.get("improvements", []),
            detailed_feedback=analysis_result.get("detailed_feedback", ""),
            rewrite_examples=analysis_result.get("rewrite_examples", []),
        )

    except Exception as e:
        import traceback

        logger.error(f"Error analyzing resume: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail=f"Error analyzing resume: {str(e)}",
        )


@router.post("/quick-analyze", response_model=QuickAnalysisResponse)
async def quick_analyze_resume(request: AnalysisRequest):
    """
    Perform a quick resume analysis (faster, less detailed).
    """
    from app.api.v1.endpoints.resume import resume_storage

    if request.resume_id not in resume_storage:
        raise HTTPException(status_code=404, detail="Resume not found")

    resume_data = resume_storage[request.resume_id]

    try:
        analyzer = ResumeAnalyzer()

        result = await analyzer.quick_analyze(resume_text=resume_data["text_content"])

        return QuickAnalysisResponse(
            resume_id=request.resume_id,
            overall_score=result.get("overall_score", 0),
            summary=result.get("summary", ""),
            top_strength=result.get("top_strength", ""),
            top_improvement=result.get("top_improvement", ""),
        )

    except Exception as e:
        logger.error(f"Error in quick analysis: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error in quick analysis: {str(e)}",
        )


@router.post("/compare-jd", response_model=JDComparisonResponse)
async def compare_with_jd(request: JDComparisonRequest):
    """
    Compare resume against a specific job description.
    """
    from app.api.v1.endpoints.resume import resume_storage

    if request.resume_id not in resume_storage:
        raise HTTPException(status_code=404, detail="Resume not found")

    if not request.job_description:
        raise HTTPException(status_code=400, detail="Job description is required")

    resume_data = resume_storage[request.resume_id]

    try:
        analyzer = ResumeAnalyzer()

        result = await analyzer.compare_with_jd(
            resume_text=resume_data["text_content"],
            job_description=request.job_description,
        )

        return JDComparisonResponse(
            resume_id=request.resume_id,
            match_percentage=result.get("match_percentage", 0),
            matched_requirements=result.get("matched_requirements", []),
            missing_requirements=result.get("missing_requirements", []),
            transferable_skills=result.get("transferable_skills", []),
            recommendations=result.get("recommendations", []),
            gap_analysis=result.get("gap_analysis", {}),
        )

    except Exception as e:
        logger.error(f"Error comparing with JD: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error comparing with JD: {str(e)}",
        )


@router.get("/{analysis_id}")
async def get_analysis(analysis_id: str):
    """Get analysis results by ID"""
    if analysis_id not in analysis_storage:
        raise HTTPException(status_code=404, detail="Analysis not found")

    return analysis_storage[analysis_id]


@router.post("/keywords/{resume_id}")
async def extract_keywords(resume_id: str):
    """Extract and categorize keywords from resume"""
    from app.api.v1.endpoints.resume import resume_storage

    if resume_id not in resume_storage:
        raise HTTPException(status_code=404, detail="Resume not found")

    resume_data = resume_storage[resume_id]

    try:
        analyzer = ResumeAnalyzer()

        keywords = await analyzer.extract_keywords(
            resume_text=resume_data["text_content"]
        )

        return {"resume_id": resume_id, "keywords": keywords}

    except Exception as e:
        logger.error(f"Error extracting keywords: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error extracting keywords: {str(e)}",
        )
