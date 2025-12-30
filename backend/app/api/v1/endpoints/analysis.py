"""
Resume Analysis Endpoints
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from typing import Optional
import logging

from app.schemas.analysis import (
    AnalysisRequest,
    AnalysisResponse,
    QuickAnalysisResponse,
    JDComparisonRequest,
    JDComparisonResponse
)
from app.services.resume.analyzer import ResumeAnalyzer
from app.api.v1.endpoints.resume import resume_storage

router = APIRouter()
logger = logging.getLogger(__name__)

# Store analysis results (replace with database in production)
analysis_storage = {}


@router.post("/analyze", response_model=AnalysisResponse)
async def analyze_resume(request: AnalysisRequest):
    """
    Perform comprehensive resume analysis.

    Optionally provide a job description for targeted analysis.
    """
    # Get resume from storage
    if request.resume_id not in resume_storage:
        raise HTTPException(status_code=404, detail="Resume not found")

    resume_data = resume_storage[request.resume_id]

    try:
        analyzer = ResumeAnalyzer()

        # Perform analysis
        analysis_result = await analyzer.analyze(
            resume_text=resume_data["text_content"],
            job_description=request.job_description,
            analysis_type=request.analysis_type
        )

        # Store analysis result
        analysis_id = f"analysis_{request.resume_id}"
        analysis_storage[analysis_id] = {
            "resume_id": request.resume_id,
            "result": analysis_result
        }

        # Update resume status
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
            rewrite_examples=analysis_result.get("rewrite_examples", [])
        )

    except Exception as e:
        logger.error(f"Error analyzing resume: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error analyzing resume: {str(e)}"
        )


@router.post("/quick-analyze", response_model=QuickAnalysisResponse)
async def quick_analyze_resume(request: AnalysisRequest):
    """
    Perform a quick resume analysis (faster, less detailed).
    """
    if request.resume_id not in resume_storage:
        raise HTTPException(status_code=404, detail="Resume not found")

    resume_data = resume_storage[request.resume_id]

    try:
        analyzer = ResumeAnalyzer()

        result = await analyzer.quick_analyze(
            resume_text=resume_data["text_content"]
        )

        return QuickAnalysisResponse(
            resume_id=request.resume_id,
            overall_score=result.get("overall_score", 0),
            summary=result.get("summary", ""),
            top_strength=result.get("top_strength", ""),
            top_improvement=result.get("top_improvement", "")
        )

    except Exception as e:
        logger.error(f"Error in quick analysis: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error in quick analysis: {str(e)}"
        )


@router.post("/compare-jd", response_model=JDComparisonResponse)
async def compare_with_jd(request: JDComparisonRequest):
    """
    Compare resume against a specific job description.
    """
    if request.resume_id not in resume_storage:
        raise HTTPException(status_code=404, detail="Resume not found")

    if not request.job_description:
        raise HTTPException(status_code=400, detail="Job description is required")

    resume_data = resume_storage[request.resume_id]

    try:
        analyzer = ResumeAnalyzer()

        result = await analyzer.compare_with_jd(
            resume_text=resume_data["text_content"],
            job_description=request.job_description
        )

        return JDComparisonResponse(
            resume_id=request.resume_id,
            match_percentage=result.get("match_percentage", 0),
            matched_requirements=result.get("matched_requirements", []),
            missing_requirements=result.get("missing_requirements", []),
            transferable_skills=result.get("transferable_skills", []),
            recommendations=result.get("recommendations", []),
            gap_analysis=result.get("gap_analysis", {})
        )

    except Exception as e:
        logger.error(f"Error comparing with JD: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error comparing with JD: {str(e)}"
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
    if resume_id not in resume_storage:
        raise HTTPException(status_code=404, detail="Resume not found")

    resume_data = resume_storage[resume_id]

    try:
        analyzer = ResumeAnalyzer()

        keywords = await analyzer.extract_keywords(
            resume_text=resume_data["text_content"]
        )

        return {
            "resume_id": resume_id,
            "keywords": keywords
        }

    except Exception as e:
        logger.error(f"Error extracting keywords: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error extracting keywords: {str(e)}"
        )
