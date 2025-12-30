"""
Interview Session Endpoints
"""

from fastapi import APIRouter, HTTPException, UploadFile, File
from typing import Optional
import uuid
import logging
from datetime import datetime

from app.schemas.interview import (
    InterviewStartRequest,
    InterviewStartResponse,
    InterviewQuestionResponse,
    InterviewResponseRequest,
    InterviewResponseResult,
    InterviewEndResponse,
    InterviewSession
)
from app.services.interview.engine import InterviewEngine
from app.services.tts.service import TTSService
from app.api.v1.endpoints.resume import resume_storage
from app.api.v1.endpoints.analysis import analysis_storage

router = APIRouter()
logger = logging.getLogger(__name__)

# Store interview sessions (replace with database in production)
interview_sessions = {}


@router.post("/start", response_model=InterviewStartResponse)
async def start_interview(request: InterviewStartRequest):
    """
    Start a new interview session.

    Parameters:
    - resume_id: ID of the uploaded resume
    - job_description: Optional JD for targeted questions
    - interview_type: screening, technical, behavioral, comprehensive
    - num_questions: Number of questions (5-10)
    - mode: text or voice
    """
    # Validate resume exists
    if request.resume_id not in resume_storage:
        raise HTTPException(status_code=404, detail="Resume not found")

    resume_data = resume_storage[request.resume_id]

    # Get analysis if available
    analysis_id = resume_data.get("analysis_id")
    analysis_data = analysis_storage.get(analysis_id, {}).get("result", {})

    try:
        # Create interview session
        session_id = str(uuid.uuid4())
        engine = InterviewEngine()

        # Initialize interview
        init_result = await engine.initialize_interview(
            resume_text=resume_data["text_content"],
            job_description=request.job_description,
            resume_analysis=analysis_data,
            interview_type=request.interview_type,
            num_questions=request.num_questions,
            difficulty=request.difficulty
        )

        # Store session
        interview_sessions[session_id] = {
            "id": session_id,
            "resume_id": request.resume_id,
            "job_description": request.job_description,
            "interview_type": request.interview_type,
            "mode": request.mode,
            "num_questions": request.num_questions,
            "difficulty": request.difficulty,
            "current_question_index": 0,
            "questions": [],
            "responses": [],
            "evaluations": [],
            "status": "in_progress",
            "started_at": datetime.utcnow().isoformat(),
            "engine": engine,
            "intro_message": init_result.get("intro_message", "")
        }

        # Generate first question
        first_question = await engine.generate_next_question(
            previous_questions=[],
            previous_responses=[],
            covered_topics=[]
        )

        interview_sessions[session_id]["questions"].append(first_question)

        return InterviewStartResponse(
            session_id=session_id,
            status="started",
            intro_message=init_result.get("intro_message", ""),
            first_question=InterviewQuestionResponse(
                question_number=1,
                total_questions=request.num_questions,
                question=first_question.get("question", ""),
                question_type=first_question.get("question_type", ""),
                topic=first_question.get("topic", "")
            )
        )

    except Exception as e:
        logger.error(f"Error starting interview: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error starting interview: {str(e)}"
        )


@router.post("/respond", response_model=InterviewResponseResult)
async def submit_response(request: InterviewResponseRequest):
    """
    Submit a text response to the current question.
    """
    session = interview_sessions.get(request.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found")

    if session["status"] != "in_progress":
        raise HTTPException(status_code=400, detail="Interview is not in progress")

    try:
        engine: InterviewEngine = session["engine"]

        # Get current question
        current_q_index = session["current_question_index"]
        current_question = session["questions"][current_q_index]

        # Evaluate response
        evaluation = await engine.evaluate_response(
            question=current_question,
            response=request.response,
            resume_text=resume_storage[session["resume_id"]]["text_content"]
        )

        # Store response and evaluation
        session["responses"].append(request.response)
        session["evaluations"].append(evaluation)

        # Check if interview is complete
        if current_q_index + 1 >= session["num_questions"]:
            session["status"] = "completed"
            session["ended_at"] = datetime.utcnow().isoformat()

            return InterviewResponseResult(
                session_id=request.session_id,
                evaluation_summary=evaluation.get("feedback", ""),
                scores=evaluation.get("scores", {}),
                is_complete=True,
                next_question=None
            )

        # Generate next question
        next_question = await engine.generate_next_question(
            previous_questions=session["questions"],
            previous_responses=session["responses"],
            covered_topics=[q.get("topic") for q in session["questions"]]
        )

        session["questions"].append(next_question)
        session["current_question_index"] += 1

        return InterviewResponseResult(
            session_id=request.session_id,
            evaluation_summary=evaluation.get("feedback", ""),
            scores=evaluation.get("scores", {}),
            is_complete=False,
            next_question=InterviewQuestionResponse(
                question_number=session["current_question_index"] + 1,
                total_questions=session["num_questions"],
                question=next_question.get("question", ""),
                question_type=next_question.get("question_type", ""),
                topic=next_question.get("topic", "")
            )
        )

    except Exception as e:
        logger.error(f"Error processing response: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error processing response: {str(e)}"
        )


@router.post("/respond/audio")
async def submit_audio_response(
    session_id: str,
    audio: UploadFile = File(...)
):
    """
    Submit an audio response to the current question.
    Audio will be transcribed before evaluation.
    """
    session = interview_sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found")

    if session["status"] != "in_progress":
        raise HTTPException(status_code=400, detail="Interview is not in progress")

    try:
        # Save audio file temporarily
        audio_content = await audio.read()

        # Transcribe audio
        tts_service = TTSService()
        transcription = await tts_service.transcribe_audio(audio_content)

        # Process as text response
        return await submit_response(
            InterviewResponseRequest(
                session_id=session_id,
                response=transcription
            )
        )

    except Exception as e:
        logger.error(f"Error processing audio response: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error processing audio response: {str(e)}"
        )


@router.get("/question/{session_id}", response_model=InterviewQuestionResponse)
async def get_current_question(session_id: str):
    """Get the current question for an interview session"""
    session = interview_sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found")

    current_q_index = session["current_question_index"]
    if current_q_index >= len(session["questions"]):
        raise HTTPException(status_code=400, detail="No more questions")

    current_question = session["questions"][current_q_index]

    return InterviewQuestionResponse(
        question_number=current_q_index + 1,
        total_questions=session["num_questions"],
        question=current_question.get("question", ""),
        question_type=current_question.get("question_type", ""),
        topic=current_question.get("topic", "")
    )


@router.post("/end/{session_id}", response_model=InterviewEndResponse)
async def end_interview(session_id: str):
    """End an interview session early"""
    session = interview_sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found")

    session["status"] = "completed"
    session["ended_at"] = datetime.utcnow().isoformat()

    # Calculate aggregate scores
    all_evaluations = session["evaluations"]
    aggregate_scores = calculate_aggregate_scores(all_evaluations)

    return InterviewEndResponse(
        session_id=session_id,
        status="completed",
        questions_answered=len(session["responses"]),
        total_questions=session["num_questions"],
        aggregate_scores=aggregate_scores
    )


@router.get("/session/{session_id}", response_model=InterviewSession)
async def get_session(session_id: str):
    """Get interview session details"""
    session = interview_sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found")

    return InterviewSession(
        id=session["id"],
        resume_id=session["resume_id"],
        interview_type=session["interview_type"],
        mode=session["mode"],
        status=session["status"],
        num_questions=session["num_questions"],
        questions_answered=len(session["responses"]),
        started_at=session["started_at"],
        ended_at=session.get("ended_at")
    )


@router.get("/sessions")
async def list_sessions():
    """List all interview sessions"""
    return {
        "sessions": [
            {
                "id": s["id"],
                "resume_id": s["resume_id"],
                "status": s["status"],
                "questions_answered": len(s["responses"]),
                "started_at": s["started_at"]
            }
            for s in interview_sessions.values()
        ]
    }


def calculate_aggregate_scores(evaluations: list) -> dict:
    """Calculate aggregate scores from all evaluations"""
    if not evaluations:
        return {}

    score_keys = ["content_relevance", "communication", "technical_accuracy",
                  "confidence", "depth"]

    aggregates = {}
    for key in score_keys:
        scores = [e.get("scores", {}).get(key, 0) for e in evaluations if e.get("scores")]
        if scores:
            aggregates[key] = round(sum(scores) / len(scores), 1)

    # Overall score
    if aggregates:
        aggregates["overall"] = round(sum(aggregates.values()) / len(aggregates), 1)

    return aggregates
