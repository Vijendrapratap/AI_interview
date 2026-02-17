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
    overall_score: float = Field(default=0, ge=0, le=100)
    ats_score: float = Field(default=0, ge=0, le=100)
    content_score: float = Field(default=0, ge=0, le=100)
    format_score: float = Field(default=0, ge=0, le=100)
    jd_match_score: Optional[float] = Field(default=None)
    sections: Dict = Field(default_factory=dict)
    keywords: Dict = Field(default_factory=dict)
    improvements: List = Field(default_factory=list)
    detailed_feedback: str = ""
    rewrite_examples: List = Field(default_factory=list)


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


# ============================================================================
# Career Analytics Models
# ============================================================================

class ExperienceEntry(BaseModel):
    """Structured work experience entry"""
    company: str
    title: str
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    duration_months: int = 0
    location: Optional[str] = None
    industry: Optional[str] = None
    responsibilities: List[str] = Field(default_factory=list)
    is_current: bool = False


class GapInfo(BaseModel):
    """Information about an employment gap"""
    start: str
    end: str
    duration_months: int
    between_companies: str
    severity: str  # "minor", "medium", "significant"


class TenureInfo(BaseModel):
    """Information about job tenure"""
    company: str
    title: str
    duration_months: int
    start_date: Optional[str] = None
    end_date: Optional[str] = None


class IndustryTransition(BaseModel):
    """Information about industry transition"""
    from_industry: str
    to_industry: str
    year: Optional[int] = None
    from_company: str
    to_company: str


class TitleChange(BaseModel):
    """Information about title/role change"""
    from_title: str
    to_title: str
    from_company: str
    to_company: str
    year: Optional[int] = None
    change_type: str  # "promotion", "lateral", "role_change", "demotion"


class RedFlag(BaseModel):
    """A potential red flag in career history"""
    flag_type: str
    description: str
    severity: str  # "low", "medium", "high"
    details: Optional[Dict] = None


class DateOverlap(BaseModel):
    """Information about overlapping job dates"""
    company1: str
    company2: str
    overlap_start: str
    overlap_end: str
    overlap_months: int


class CareerAnalyticsResponse(BaseModel):
    """Comprehensive career analytics response"""
    # Timeline Analysis
    total_experience_years: float = 0
    employment_gaps: List[GapInfo] = Field(default_factory=list)
    has_significant_gaps: bool = False

    # Stability Analysis
    average_tenure_months: float = 0
    shortest_tenure: Optional[TenureInfo] = None
    longest_tenure: Optional[TenureInfo] = None
    job_hopping_risk: str = "none"  # "none", "low", "medium", "high"
    roles_under_1_year: int = 0
    roles_under_2_years: int = 0

    # Industry Analysis
    industries_worked: List[str] = Field(default_factory=list)
    industry_transitions: List[IndustryTransition] = Field(default_factory=list)
    is_industry_hopper: bool = False
    primary_industry: str = "Unknown"
    primary_industry_percentage: float = 0

    # Career Trajectory
    trajectory: str = "unknown"  # "ascending", "lateral", "descending", "mixed"
    seniority_progression: List[str] = Field(default_factory=list)
    title_changes: List[TitleChange] = Field(default_factory=list)

    # Red Flags
    red_flags: List[RedFlag] = Field(default_factory=list)
    authenticity_concerns: List[str] = Field(default_factory=list)

    # Overlaps
    date_overlaps: List[DateOverlap] = Field(default_factory=list)


class SmartQuestion(BaseModel):
    """An intelligent interview question based on resume patterns"""
    question: str
    category: str  # "gap", "job_change", "industry", "experience", "red_flag", "depth"
    priority: str  # "high", "medium", "low"
    context: str
    follow_ups: List[str] = Field(default_factory=list)


class SmartQuestionsResponse(BaseModel):
    """Response containing smart interview questions"""
    questions: List[SmartQuestion] = Field(default_factory=list)
    total_count: int = 0
    categories: Dict[str, int] = Field(default_factory=dict)  # Category counts



# ============================================================================
# Skills Assessment Models
# ============================================================================

class SkillGap(BaseModel):
    """Information about a skill gap."""
    skill_name: str
    current_level: str  # "Beginner", "Intermediate", "Advanced", "Expert"
    required_level: str
    gap_type: str  # "missing", "improvement_needed"
    importance: str  # "critical", "high", "medium", "nice_to_have"

class MarketComparison(BaseModel):
    """Comparison against market standards."""
    role: str
    percentile: int  # 0-100
    missing_critical_skills: List[str]
    above_market_skills: List[str]
    salary_range_estimate: Optional[str] = None

class SkillsAssessment(BaseModel):
    """Comprehensive skills assessment."""
    overall_proficiency: float  # 0-100
    total_skills_identified: int
    verified_skills_count: int
    skill_gaps: List[SkillGap] = Field(default_factory=list)
    market_comparison: Optional[MarketComparison] = None
    strongest_skills: List[str] = Field(default_factory=list)
    areas_for_improvement: List[str] = Field(default_factory=list)
    learning_roadmap: List[str] = Field(default_factory=list)


class EnhancedAnalysisResponse(BaseModel):
    """Enhanced analysis response with career analytics and smart questions"""
    # Base analysis fields
    analysis_id: str
    resume_id: str
    overall_score: float = Field(default=0, ge=0, le=100)
    ats_score: float = Field(default=0, ge=0, le=100)
    content_score: float = Field(default=0, ge=0, le=100)
    format_score: float = Field(default=0, ge=0, le=100)
    jd_match_score: Optional[float] = Field(default=None)
    sections: Dict = Field(default_factory=dict)
    keywords: Dict = Field(default_factory=dict)
    improvements: List = Field(default_factory=list)
    detailed_feedback: str = ""
    rewrite_examples: List = Field(default_factory=list)

    # Enhanced fields
    structured_experience: List[ExperienceEntry] = Field(default_factory=list)
    career_analytics: Optional[CareerAnalyticsResponse] = None
    skills_assessment: Optional[SkillsAssessment] = None
    smart_questions: List[SmartQuestion] = Field(default_factory=list)
