"""
Interview-related Pydantic schemas
"""

from pydantic import BaseModel, Field
from typing import Optional, Dict, List
from enum import Enum


class InterviewType(str, Enum):
    """Type of interview"""
    SCREENING = "screening"
    TECHNICAL = "technical"
    BEHAVIORAL = "behavioral"
    COMPREHENSIVE = "comprehensive"


class InterviewMode(str, Enum):
    """Interview interaction mode"""
    TEXT = "text"
    VOICE = "voice"


class DifficultyLevel(str, Enum):
    """Interview difficulty level"""
    ENTRY = "entry"
    MID = "mid"
    SENIOR = "senior"
    EXECUTIVE = "executive"


class InterviewStartRequest(BaseModel):
    """Request to start an interview"""
    resume_id: str = Field(..., description="Resume ID for context")
    job_description: Optional[str] = Field(None, description="Job description for targeted questions")
    interview_type: InterviewType = Field(default=InterviewType.COMPREHENSIVE)
    num_questions: int = Field(default=7, ge=5, le=10)
    mode: InterviewMode = Field(default=InterviewMode.TEXT)
    difficulty: DifficultyLevel = Field(default=DifficultyLevel.MID)
    focus_areas: Optional[List[str]] = Field(None, description="Specific areas to focus on")


class InterviewQuestionResponse(BaseModel):
    """Response containing a question"""
    question_number: int
    total_questions: int
    question: str
    question_type: str
    topic: str
    expected_time_seconds: int = Field(default=120)


class InterviewStartResponse(BaseModel):
    """Response when interview starts"""
    session_id: str
    status: str
    intro_message: str
    first_question: InterviewQuestionResponse


class InterviewResponseRequest(BaseModel):
    """Submit response to a question"""
    session_id: str
    response: str = Field(..., min_length=10)
    audio_analytics: Optional[Dict[str, float]] = None # New field for voice metrics


class ResponseScores(BaseModel):
    """Scores for a response"""
    content_relevance: float = Field(..., ge=0, le=10)
    communication: float = Field(..., ge=0, le=10)
    technical_accuracy: float = Field(..., ge=0, le=10)
    confidence: float = Field(..., ge=0, le=10)
    depth: float = Field(..., ge=0, le=10)
    star_adherence: Optional[float] = Field(None, ge=0, le=10)


class InterviewResponseResult(BaseModel):
    """Result after submitting a response"""
    session_id: str
    evaluation_summary: str
    scores: Dict[str, float]
    is_complete: bool
    next_question: Optional[InterviewQuestionResponse] = None
    transcript: Optional[str] = None
    closing_message: Optional[str] = None


class InterviewEndResponse(BaseModel):
    """Response when interview ends"""
    session_id: str
    status: str
    questions_answered: int
    total_questions: int
    aggregate_scores: Dict[str, float]


class InterviewSession(BaseModel):
    """Interview session details"""
    id: str
    resume_id: str
    interview_type: str
    mode: str
    status: str
    num_questions: int
    questions_answered: int
    started_at: str
    ended_at: Optional[str] = None


class QuestionEvaluation(BaseModel):
    """Detailed evaluation of a single question"""
    question_number: int
    question: str
    response: str
    scores: ResponseScores
    strengths: List[str]
    weaknesses: List[str]
    ideal_response_elements: List[str]

class InterviewReportResponse(BaseModel):
    """Detailed interview performance report"""
    session_id: str
    overall_score: float
    recommendation: str
    executive_summary: str
    performance_metrics: Dict[str, float]
    strengths: List[str]
    areas_for_improvement: List[str]
    skill_assessment: Dict[str, Dict[str, str]]
    behavioral_competencies: Dict[str, float]
    communication_analysis: Dict[str, str]
    question_feedback: List[Dict]
    improvement_roadmap: Dict[str, List[str]]
    interview_tips: List[str]

