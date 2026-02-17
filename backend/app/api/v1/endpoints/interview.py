"""
Interview Session Endpoints
"""

from fastapi import APIRouter, HTTPException, UploadFile, File
from typing import Optional, Union
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
from app.services.interview.advanced_engine import AdvancedInterviewEngine
from app.services.tts.service import TTSService
from app.services.analytics.behavioral import BehavioralAnalytics
from app.services.analytics.audio import AudioAnalyzer
from app.api.v1.endpoints.resume import resume_storage
from app.api.v1.endpoints.analysis import analysis_storage

# Initialize services
behavioral_analyzer = BehavioralAnalytics()
audio_analyzer = AudioAnalyzer()

router = APIRouter()
logger = logging.getLogger(__name__)

# Store interview sessions (replace with database in production)
interview_sessions = {}


def _create_engine() -> Union[AdvancedInterviewEngine, InterviewEngine]:
    """Create the best available interview engine with fallback."""
    try:
        return AdvancedInterviewEngine()
    except Exception as e:
        logger.warning(f"AdvancedInterviewEngine init failed, falling back to basic: {e}")
        return InterviewEngine()


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
        # Create interview session with advanced engine
        session_id = str(uuid.uuid4())
        engine = _create_engine()
        is_advanced = isinstance(engine, AdvancedInterviewEngine)

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
            "is_advanced": is_advanced,
            "intro_message": init_result.get("intro_message", ""),
            "current_follow_up_count": 0
        }

        # Get first question - advanced engine may include it in init
        first_question = init_result.get("first_question")
        if not first_question or not first_question.get("question"):
            # Generate first question explicitly
            if is_advanced:
                first_question = await engine.generate_next_question(
                    previous_questions=[],
                    previous_responses=[],
                    previous_evaluations=[]
                )
            else:
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

    Implements a state machine for dynamic follow-up questions:
    - Evaluates answer depth
    - If shallow/vague, generates contextual follow-up (doesn't count toward question limit)
    - If adequate, moves to next topic
    """
    session = interview_sessions.get(request.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found")

    if session["status"] != "in_progress":
        raise HTTPException(status_code=400, detail="Interview is not in progress")

    try:
        engine = session["engine"]
        is_advanced = session.get("is_advanced", False)

        # Get current question
        current_q_index = session["current_question_index"]
        current_question = session["questions"][current_q_index]
        is_follow_up = current_question.get("is_follow_up", False)

        # Evaluate response - use appropriate engine method
        if is_advanced:
            evaluation = await engine.evaluate_response_deep(
                question=current_question,
                response=request.response,
                audio_analytics=request.audio_analytics
            )
        else:
            # Evaluate answer depth first (quick check)
            depth_evaluation = await engine.evaluate_answer_depth(
                question=current_question,
                response=request.response
            )
            evaluation = await engine.evaluate_response(
                question=current_question,
                response=request.response,
                resume_text=resume_storage[session["resume_id"]]["text_content"],
                audio_analytics=request.audio_analytics
            )

        # Behavioral analytics on the response
        behavioral_analysis = behavioral_analyzer.analyze_response(request.response)

        # Add behavioral metrics to evaluation
        evaluation["behavioral_analytics"] = {
            "filler_word_count": behavioral_analysis.filler_word_count,
            "filler_word_rate": behavioral_analysis.filler_word_rate,
            "confidence_score": behavioral_analysis.confidence_score,
            "clarity_score": behavioral_analysis.clarity_score,
            "vocabulary_diversity": behavioral_analysis.vocabulary_diversity,
            "sentiment": behavioral_analysis.sentiment,
            "red_flags": behavioral_analysis.red_flags
        }

        # Store response and evaluation
        session["responses"].append(request.response)
        session["evaluations"].append(evaluation)

        # Store behavioral analyses for session-level reporting
        if "behavioral_analyses" not in session:
            session["behavioral_analyses"] = []
        session["behavioral_analyses"].append(behavioral_analysis)

        # Track follow-up count to prevent infinite loops (max 1 follow-up per main question)
        follow_up_count = session.get("current_follow_up_count", 0)
        max_follow_ups = 1  # Allow 1 follow-up per main question

        # Determine if we should ask a follow-up
        if is_advanced:
            needs_follow_up = evaluation.get("follow_up_recommended", False)
        else:
            needs_follow_up = (
                depth_evaluation.get("needs_follow_up", False)
                or evaluation.get("follow_up_recommended", False)
            )

        should_follow_up = (
            needs_follow_up
            and follow_up_count < max_follow_ups
            and not is_follow_up  # Don't follow-up on a follow-up
        )

        # Check if interview would be complete (only count main questions, not follow-ups)
        main_question_count = len([q for q in session["questions"] if not q.get("is_follow_up", False)])

        if not should_follow_up and main_question_count >= session["num_questions"]:
            session["status"] = "completed"
            session["ended_at"] = datetime.utcnow().isoformat()

            # Generate closing message
            closing_message = await _generate_closing_message(engine, session, is_advanced)

            # Calculate aggregate scores
            aggregate_scores = calculate_aggregate_scores(session["evaluations"])

            # Calculate behavioral summary
            if session.get("responses"):
                session["behavioral_summary"] = behavioral_analyzer.analyze_interview_session(
                    responses=session["responses"]
                )

            return InterviewResponseResult(
                session_id=request.session_id,
                evaluation_summary=evaluation.get("feedback", ""),
                scores=evaluation.get("scores", {}),
                is_complete=True,
                next_question=None,
                closing_message=closing_message,
                transcript=request.response
            )

        if should_follow_up:
            # Generate contextual follow-up question
            if is_advanced:
                follow_up_question = await engine.generate_follow_up(
                    original_question=current_question,
                    response=request.response,
                    evaluation=evaluation
                )
            elif evaluation.get("follow_up_question"):
                follow_up_question = {
                    "question": evaluation["follow_up_question"],
                    "question_type": "follow_up",
                    "topic": current_question.get("topic", "clarification"),
                    "is_follow_up": True,
                    "parent_question": current_question.get("question", "")
                }
            else:
                follow_up_reason = depth_evaluation.get("reason", "Need more detail")
                follow_up_question = await engine.generate_follow_up(
                    original_question=current_question,
                    response=request.response,
                    reason=follow_up_reason
                )

            session["questions"].append(follow_up_question)
            session["current_question_index"] += 1
            session["current_follow_up_count"] = follow_up_count + 1

            # For follow-ups, show same question number
            display_q_num = main_question_count

            return InterviewResponseResult(
                session_id=request.session_id,
                evaluation_summary=evaluation.get("feedback", ""),
                scores=evaluation.get("scores", {}),
                is_complete=False,
                next_question=InterviewQuestionResponse(
                    question_number=display_q_num,
                    total_questions=session["num_questions"],
                    question=follow_up_question.get("question", ""),
                    question_type="follow_up",
                    topic=follow_up_question.get("topic", "clarification")
                ),
                transcript=request.response
            )

        # Reset follow-up counter for next main question
        session["current_follow_up_count"] = 0

        # Generate next main question
        if is_advanced:
            next_question = await engine.generate_next_question(
                previous_questions=session["questions"],
                previous_responses=session["responses"],
                previous_evaluations=session["evaluations"]
            )
        else:
            next_question = await engine.generate_next_question(
                previous_questions=session["questions"],
                previous_responses=session["responses"],
                covered_topics=[q.get("topic") for q in session["questions"] if not q.get("is_follow_up")]
            )

        session["questions"].append(next_question)
        session["current_question_index"] += 1

        # Count main questions for display
        new_main_count = len([q for q in session["questions"] if not q.get("is_follow_up", False)])

        return InterviewResponseResult(
            session_id=request.session_id,
            evaluation_summary=evaluation.get("feedback", ""),
            scores=evaluation.get("scores", {}),
            is_complete=False,
            next_question=InterviewQuestionResponse(
                question_number=new_main_count,
                total_questions=session["num_questions"],
                question=next_question.get("question", ""),
                question_type=next_question.get("question_type", ""),
                topic=next_question.get("topic", "")
            ),
            transcript=request.response
        )

    except Exception as e:
        logger.error(f"Error processing response: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error processing response: {str(e)}"
        )


async def _generate_closing_message(engine, session: dict, is_advanced: bool) -> str:
    """Generate a closing message for the interview."""
    try:
        # Collect strengths and weaknesses from evaluations
        all_strengths = []
        all_weaknesses = []
        total_score = 0
        count = 0

        for ev in session["evaluations"]:
            all_strengths.extend(ev.get("strengths", []))
            all_weaknesses.extend(ev.get("weaknesses", []))
            total_score += ev.get("overall_score", 5)
            count += 1

        avg_score = total_score / count if count > 0 else 5

        closing = await engine.generate_closing(
            num_questions=len(session["responses"]),
            overall_performance=avg_score,
            strengths=list(set(all_strengths))[:5],
            improvements=list(set(all_weaknesses))[:5]
        )
        return closing
    except Exception as e:
        logger.error(f"Closing message generation failed: {e}")
        return "Thank you for completing this interview! Your responses have been recorded and analyzed. We appreciate your time and thoughtful answers."


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
        # Read audio file
        audio_content = await audio.read()

        # 1. Analyze Audio
        audio_metrics = audio_analyzer.analyze(audio_content)

        # 2. Transcribe Audio
        tts_service = TTSService()
        transcription = await tts_service.transcribe_audio(audio_content)

        if not transcription or len(transcription.strip()) < 10:
            raise HTTPException(
                status_code=400,
                detail="Could not transcribe audio. Please speak clearly and try again."
            )

        # Process as text response with added analytics
        result = await submit_response(
            InterviewResponseRequest(
                session_id=session_id,
                response=transcription,
                audio_analytics=audio_metrics
            )
        )

        return result

    except HTTPException:
        raise
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
    main_question_count = len([
        q for i, q in enumerate(session["questions"])
        if not q.get("is_follow_up", False) and i <= current_q_index
    ])

    return InterviewQuestionResponse(
        question_number=main_question_count,
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

    # Calculate aggregate behavioral analytics
    if session.get("responses"):
        behavioral_summary = behavioral_analyzer.analyze_interview_session(
            responses=session["responses"]
        )
        session["behavioral_summary"] = behavioral_summary

    return InterviewEndResponse(
        session_id=session_id,
        status="completed",
        questions_answered=len(session["responses"]),
        total_questions=session["num_questions"],
        aggregate_scores=aggregate_scores
    )


@router.get("/behavioral/{session_id}")
async def get_behavioral_analytics(session_id: str):
    """
    Get detailed behavioral analytics for an interview session.

    Returns:
    - Filler word analysis
    - Confidence and clarity scores
    - Speaking patterns
    - Recommendations for improvement
    """
    session = interview_sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found")

    if not session.get("responses"):
        raise HTTPException(status_code=400, detail="No responses to analyze")

    # Generate comprehensive behavioral analysis
    behavioral_report = behavioral_analyzer.analyze_interview_session(
        responses=session["responses"]
    )

    return {
        "session_id": session_id,
        "analysis": behavioral_report
    }


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

    # Match the actual score keys produced by evaluation engine
    score_keys = ["content", "communication", "analytical", "technical_depth",
                  "star_method", "authenticity"]

    aggregates = {}
    for key in score_keys:
        scores = [e.get("scores", {}).get(key, 0) for e in evaluations if e.get("scores")]
        if scores:
            # Scores are 0-10 from engine, scale to 0-100 for display
            aggregates[key] = round(sum(scores) / len(scores) * 10, 1)

    # Overall score (0-100)
    if aggregates:
        aggregates["overall"] = round(sum(aggregates.values()) / len(aggregates), 1)

    return aggregates


@router.get("/report/{session_id}", response_model=InterviewReportResponse)
async def get_interview_report(session_id: str):
    """
    Generate detailed interview performance report.
    Aggregates data from all questions, evaluations, and behavioral analytics.
    """
    session = interview_sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found")

    if session["status"] != "completed" and len(session["responses"]) < 1:
        raise HTTPException(status_code=400, detail="Interview not active or no data to report")

    # 1. Calculate Overall Scores
    evaluations = session["evaluations"]
    agg_scores = calculate_aggregate_scores(evaluations)
    overall_score = agg_scores.get("overall", 0)

    # 2. Determine Recommendation
    if overall_score >= 85:
        recommendation = "Strong Hire"
    elif overall_score >= 70:
        recommendation = "Hire"
    elif overall_score >= 50:
        recommendation = "Maybe"
    else:
        recommendation = "No Hire"

    # 3. Aggregate Strengths & Weaknesses
    all_strengths = []
    all_weaknesses = []
    for ev in evaluations:
        all_strengths.extend(ev.get("strengths", []))
        all_weaknesses.extend(ev.get("weaknesses", []))
    
    unique_strengths = list(set(all_strengths))[:5]
    unique_weaknesses = list(set(all_weaknesses))[:5]

    # 4. Generate Question Feedback
    question_feedback = []
    questions = session["questions"]
    responses = session["responses"]
    
    for i, ev in enumerate(evaluations):
        if i >= len(questions) or i >= len(responses):
            break
            
        q = questions[i]
        q_num = i + 1
        # If it's a follow-up, it might share number with parent? 
        # For simplicity, just sequential numbering or handling follow-ups as distinct
        
        feedback_item = {
            "question_number": q_num,
            "question": q.get("question", ""),
            "score": int(ev.get("scores", {}).get("overall", 0) * 10), # Scale to 100
            "response_summary": responses[i][:150] + "..." if len(responses[i]) > 150 else responses[i],
            "strengths": ev.get("strengths", [])[:2],
            "improvements": ev.get("weaknesses", [])[:2],
            "ideal_response": ev.get("ideal_response_elements", [])[0] if ev.get("ideal_response_elements") else "Focus on STAR method."
        }
        question_feedback.append(feedback_item)

    # 5. Mock/Template Data for Complex Analytics (since we don't have deep storage for these yet)
    # in a real system, these would be aggregated from specific evaluation fields
    
    performance_metrics = {
        "technical_knowledge": agg_scores.get("technical_depth", 0) * 10,
        "communication_skills": agg_scores.get("communication", 0) * 10,
        "problem_solving": agg_scores.get("analytical", 0) * 10,
        "cultural_fit": agg_scores.get("authenticity", 0) * 10
    }
    
    # Fill missing with valid defaults if calculation failed (e.g. short interview)
    for k in performance_metrics:
        if performance_metrics[k] == 0:
            performance_metrics[k] = 70.0

    skill_assessment = {} # We'd need to track skills per question. 
    # Mocking for now based on interview type
    if session.get("interview_type") == "technical":
        skill_assessment = {
            "Core Concept": {
                "skill_name": "Core Concepts",
                "demonstrated_level": "Intermediate",
                "evidence": "Good understanding of basics shown in Q1",
                "gap_to_requirement": None
            }
        }

    behavioral_competencies = {
        "leadership": 75.0,
        "teamwork": 80.0,
        "adaptability": 70.0
    }
    
    communication_analysis = {
        "clarity": "Clear and concise",
        "pacing": "Good speaking rate",
        "confidence": "Generally confident"
    }
    
    improvement_roadmap = {
        "immediate_actions": [f"Practice {w}" for w in unique_weaknesses[:2]],
        "short_term": ["Deepen technical knowledge in specific areas"],
        "medium_term": ["Work on system design patterns"]
    }

    interview_tips = [
        "Use the STAR method more consistently",
        "Pause to think before answering complex questions",
        "Ask clarifying questions when requirements are vague"
    ]

    executive_summary = (
        f"The candidate demonstrated {recommendation.lower()} potential with an overall score of {overall_score}. "
        f"Key strengths include {', '.join(unique_strengths[:2])}. "
        f"Areas for development are {', '.join(unique_weaknesses[:2])}."
    )

    return InterviewReportResponse(
        session_id=session_id,
        overall_score=overall_score,
        recommendation=recommendation,
        executive_summary=executive_summary,
        performance_metrics=performance_metrics,
        strengths=unique_strengths,
        areas_for_improvement=unique_weaknesses,
        skill_assessment=skill_assessment,
        behavioral_competencies=behavioral_competencies,
        communication_analysis=communication_analysis,
        question_feedback=question_feedback,
        improvement_roadmap=improvement_roadmap,
        interview_tips=interview_tips
    )

