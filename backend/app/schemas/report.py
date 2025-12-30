"""
Report-related Pydantic schemas
"""

from pydantic import BaseModel, Field
from typing import Optional, Dict, List


class QuestionFeedback(BaseModel):
    """Feedback for a single question"""
    question_number: int
    question: str
    response_summary: str
    score: float
    strengths: List[str]
    improvements: List[str]
    ideal_response: Optional[str] = None


class PerformanceMetrics(BaseModel):
    """Performance metrics breakdown"""
    technical_knowledge: float = Field(..., ge=0, le=100)
    communication_skills: float = Field(..., ge=0, le=100)
    problem_solving: float = Field(..., ge=0, le=100)
    cultural_fit: float = Field(..., ge=0, le=100)
    leadership_potential: float = Field(..., ge=0, le=100)
    overall_score: float = Field(..., ge=0, le=100)


class SkillAssessment(BaseModel):
    """Assessment of a specific skill"""
    skill_name: str
    demonstrated_level: str  # Beginner, Intermediate, Advanced, Expert
    evidence: str
    gap_to_requirement: Optional[str] = None


class ImprovementRoadmap(BaseModel):
    """Improvement roadmap"""
    immediate_actions: List[str] = Field(default_factory=list)  # 30 days
    short_term: List[str] = Field(default_factory=list)  # 60 days
    medium_term: List[str] = Field(default_factory=list)  # 90 days


class InterviewReportResponse(BaseModel):
    """Comprehensive interview report"""
    session_id: str
    overall_score: float = Field(..., ge=0, le=100)
    recommendation: str  # Strong Hire, Hire, Maybe, No Hire
    executive_summary: str
    performance_metrics: Dict[str, float]
    strengths: List[str]
    areas_for_improvement: List[str]
    skill_assessment: Dict[str, SkillAssessment] = Field(default_factory=dict)
    behavioral_competencies: Dict[str, float] = Field(default_factory=dict)
    communication_analysis: Dict[str, str] = Field(default_factory=dict)
    question_feedback: List[QuestionFeedback] = Field(default_factory=list)
    improvement_roadmap: Dict[str, List[str]] = Field(default_factory=dict)
    interview_tips: List[str] = Field(default_factory=list)


class SectionReportAnalysis(BaseModel):
    """Report analysis for a resume section"""
    section_name: str
    current_score: float
    issues: List[str]
    recommendations: List[str]
    before_after_examples: List[Dict[str, str]] = Field(default_factory=list)


class ResumeReportResponse(BaseModel):
    """Comprehensive resume analysis report"""
    analysis_id: str
    resume_id: str
    overall_score: float = Field(..., ge=0, le=100)
    score_breakdown: Dict[str, float]
    section_analysis: List[SectionReportAnalysis]
    keyword_analysis: Dict
    ats_optimization: Dict
    priority_actions: List[Dict[str, str]]  # action, impact, urgency
    rewrite_examples: List[Dict[str, str]]


class CombinedReportResponse(BaseModel):
    """Combined resume + interview report"""
    session_id: str
    resume_id: str
    overall_assessment: str
    claims_vs_performance: Dict[str, Dict]  # skill: {claimed, demonstrated}
    verified_skills: List[str]
    areas_of_concern: List[str]
    recommendation: str
    confidence_level: float = Field(default=0.8, ge=0, le=1)
    development_plan: Dict[str, List[str]]
