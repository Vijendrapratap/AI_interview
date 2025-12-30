"""
Analysis-related Pydantic schemas
"""

from pydantic import BaseModel, Field
from typing import Optional, Dict, List
from enum import Enum


class AnalysisType(str, Enum):
    """Type of analysis to perform"""
    COMPREHENSIVE = "comprehensive"
    QUICK = "quick"
    ATS_FOCUS = "ats_focus"
    JD_MATCH = "jd_match"


class AnalysisRequest(BaseModel):
    """Request for resume analysis"""
    resume_id: str = Field(..., description="Resume ID to analyze")
    job_description: Optional[str] = Field(None, description="Job description for targeted analysis")
    analysis_type: AnalysisType = Field(default=AnalysisType.COMPREHENSIVE)


class SectionAnalysis(BaseModel):
    """Analysis of a resume section"""
    section_name: str
    score: float = Field(..., ge=0, le=100)
    strengths: List[str] = Field(default_factory=list)
    weaknesses: List[str] = Field(default_factory=list)
    suggestions: List[str] = Field(default_factory=list)


class KeywordAnalysis(BaseModel):
    """Keyword analysis results"""
    found_keywords: Dict[str, List[str]] = Field(default_factory=dict)
    missing_keywords: List[str] = Field(default_factory=list)
    keyword_density: float = Field(default=0)
    industry_terms: List[str] = Field(default_factory=list)


class RewriteExample(BaseModel):
    """Before/after example for improvement"""
    original: str
    improved: str
    explanation: str
    impact: str = Field(default="medium")  # low, medium, high


class AnalysisResponse(BaseModel):
    """Comprehensive analysis response"""
    analysis_id: str
    resume_id: str
    overall_score: float = Field(..., ge=0, le=100)
    ats_score: float = Field(..., ge=0, le=100)
    content_score: float = Field(..., ge=0, le=100)
    format_score: float = Field(..., ge=0, le=100)
    jd_match_score: Optional[float] = Field(None, ge=0, le=100)
    sections: Dict[str, SectionAnalysis] = Field(default_factory=dict)
    keywords: KeywordAnalysis = Field(default_factory=KeywordAnalysis)
    improvements: List[str] = Field(default_factory=list)
    detailed_feedback: str = ""
    rewrite_examples: List[RewriteExample] = Field(default_factory=list)


class QuickAnalysisResponse(BaseModel):
    """Quick analysis response"""
    resume_id: str
    overall_score: float
    summary: str
    top_strength: str
    top_improvement: str


class JDComparisonRequest(BaseModel):
    """Request for JD comparison"""
    resume_id: str
    job_description: str = Field(..., min_length=50)
    job_title: Optional[str] = None
    company: Optional[str] = None


class JDComparisonResponse(BaseModel):
    """JD comparison results"""
    resume_id: str
    match_percentage: float = Field(..., ge=0, le=100)
    matched_requirements: List[str] = Field(default_factory=list)
    missing_requirements: List[str] = Field(default_factory=list)
    transferable_skills: List[str] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)
    gap_analysis: Dict = Field(default_factory=dict)
