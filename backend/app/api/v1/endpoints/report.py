"""
Report Generation Endpoints
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from typing import Optional
import io
import logging

from app.schemas.report import (
    InterviewReportResponse,
    ResumeReportResponse,
    CombinedReportResponse
)
from app.services.report.generator import ReportGenerator
from app.api.v1.endpoints.interview import interview_sessions
from app.api.v1.endpoints.analysis import analysis_storage
from app.api.v1.endpoints.resume import resume_storage

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/interview/{session_id}", response_model=InterviewReportResponse)
async def get_interview_report(session_id: str):
    """
    Generate a comprehensive interview performance report.
    """
    session = interview_sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found")

    if session["status"] != "completed":
        raise HTTPException(status_code=400, detail="Interview is still in progress")

    try:
        generator = ReportGenerator()

        # Get resume data
        resume_data = resume_storage.get(session["resume_id"], {})

        report = await generator.generate_interview_report(
            session_data={
                "questions": session["questions"],
                "responses": session["responses"],
                "evaluations": session["evaluations"],
                "interview_type": session["interview_type"],
                "num_questions": session["num_questions"],
                "started_at": session["started_at"],
                "ended_at": session.get("ended_at")
            },
            resume_text=resume_data.get("text_content", ""),
            job_description=session.get("job_description", "")
        )

        return InterviewReportResponse(
            session_id=session_id,
            overall_score=report.get("overall_score", 0),
            recommendation=report.get("recommendation", ""),
            executive_summary=report.get("executive_summary", ""),
            performance_metrics=report.get("performance_metrics", {}),
            strengths=report.get("strengths", []),
            areas_for_improvement=report.get("areas_for_improvement", []),
            skill_assessment=report.get("skill_assessment", {}),
            behavioral_competencies=report.get("behavioral_competencies", {}),
            communication_analysis=report.get("communication_analysis", {}),
            question_feedback=report.get("question_feedback", []),
            improvement_roadmap=report.get("improvement_roadmap", {}),
            interview_tips=report.get("interview_tips", [])
        )

    except Exception as e:
        logger.error(f"Error generating interview report: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error generating report: {str(e)}"
        )


@router.get("/interview/{session_id}/pdf")
async def download_interview_report_pdf(session_id: str):
    """
    Download interview report as PDF.
    """
    session = interview_sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found")

    try:
        # First generate the report
        report_response = await get_interview_report(session_id)

        # Generate PDF
        generator = ReportGenerator()
        pdf_bytes = await generator.generate_pdf(
            report_data=report_response.model_dump(),
            report_type="interview"
        )

        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=interview_report_{session_id}.pdf"
            }
        )

    except Exception as e:
        logger.error(f"Error generating PDF report: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error generating PDF: {str(e)}"
        )


@router.get("/resume/{analysis_id}", response_model=ResumeReportResponse)
async def get_resume_report(analysis_id: str):
    """
    Get detailed resume analysis report.
    """
    analysis = analysis_storage.get(analysis_id)
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")

    try:
        generator = ReportGenerator()

        # Get resume data
        resume_id = analysis.get("resume_id")
        resume_data = resume_storage.get(resume_id, {})

        report = await generator.generate_resume_report(
            analysis_result=analysis.get("result", {}),
            resume_text=resume_data.get("text_content", "")
        )

        return ResumeReportResponse(
            analysis_id=analysis_id,
            resume_id=resume_id,
            overall_score=report.get("overall_score", 0),
            score_breakdown=report.get("score_breakdown", {}),
            section_analysis=report.get("section_analysis", []),
            keyword_analysis=report.get("keyword_analysis", {}),
            ats_optimization=report.get("ats_optimization", {}),
            priority_actions=report.get("priority_actions", []),
            rewrite_examples=report.get("rewrite_examples", [])
        )

    except Exception as e:
        logger.error(f"Error generating resume report: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error generating report: {str(e)}"
        )


@router.get("/resume/{analysis_id}/pdf")
async def download_resume_report_pdf(analysis_id: str):
    """
    Download resume analysis report as PDF.
    """
    analysis = analysis_storage.get(analysis_id)
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")

    try:
        # First generate the report
        report_response = await get_resume_report(analysis_id)

        # Generate PDF
        generator = ReportGenerator()
        pdf_bytes = await generator.generate_pdf(
            report_data=report_response.model_dump(),
            report_type="resume"
        )

        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=resume_report_{analysis_id}.pdf"
            }
        )

    except Exception as e:
        logger.error(f"Error generating PDF report: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error generating PDF: {str(e)}"
        )


@router.get("/combined/{session_id}", response_model=CombinedReportResponse)
async def get_combined_report(session_id: str):
    """
    Get combined resume and interview report.
    """
    session = interview_sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found")

    resume_id = session.get("resume_id")
    resume_data = resume_storage.get(resume_id, {})
    analysis_id = resume_data.get("analysis_id")
    analysis_data = analysis_storage.get(analysis_id, {}).get("result", {})

    try:
        generator = ReportGenerator()

        report = await generator.generate_combined_report(
            resume_analysis=analysis_data,
            interview_data={
                "questions": session["questions"],
                "responses": session["responses"],
                "evaluations": session["evaluations"]
            }
        )

        return CombinedReportResponse(
            session_id=session_id,
            resume_id=resume_id,
            overall_assessment=report.get("overall_assessment", ""),
            claims_vs_performance=report.get("claims_vs_performance", {}),
            verified_skills=report.get("verified_skills", []),
            areas_of_concern=report.get("areas_of_concern", []),
            recommendation=report.get("recommendation", ""),
            development_plan=report.get("development_plan", {})
        )

    except Exception as e:
        logger.error(f"Error generating combined report: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error generating report: {str(e)}"
        )


@router.get("/history")
async def get_report_history():
    """
    Get history of all reports generated.
    """
    reports = []

    # Add interview reports
    for session_id, session in interview_sessions.items():
        if session["status"] == "completed":
            reports.append({
                "type": "interview",
                "id": session_id,
                "created_at": session.get("ended_at"),
                "resume_id": session["resume_id"]
            })

    # Add resume analysis reports
    for analysis_id, analysis in analysis_storage.items():
        reports.append({
            "type": "resume_analysis",
            "id": analysis_id,
            "resume_id": analysis.get("resume_id")
        })

    return {"reports": reports}
