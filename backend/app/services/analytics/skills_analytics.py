import logging
from typing import Dict, List, Optional
from dataclasses import dataclass, asdict

logger = logging.getLogger(__name__)

@dataclass
class SkillGap:
    """Information about a skill gap."""
    skill_name: str
    current_level: str  # "Beginner", "Intermediate", "Advanced", "Expert"
    required_level: str
    gap_type: str  # "missing", "improvement_needed"
    importance: str  # "critical", "high", "medium", "nice_to_have"

@dataclass
class SkillGroup:
    """Group of related skills."""
    category: str
    skills: List[str]
    average_proficiency: float  # 0-100

@dataclass
class MarketComparison:
    """Comparison against market standards."""
    role: str
    percentile: int  # 0-100
    missing_critical_skills: List[str]
    above_market_skills: List[str]
    salary_range_estimate: Optional[str] = None

@dataclass
class SkillsAssessment:
    """Comprehensive skills assessment."""
    overall_proficiency: float  # 0-100
    total_skills_identified: int
    verified_skills_count: int
    skill_gaps: List[SkillGap]
    market_comparison: Optional[MarketComparison]
    strongest_skills: List[str]
    areas_for_improvement: List[str]
    learning_roadmap: List[str]  # Recommendations

    def to_dict(self) -> Dict:
        return asdict(self)

class SkillsAnalytics:
    """
    Analyzes skills from resume against market data and job descriptions.
    """

    def __init__(self):
        # We could load skill taxonomies here
        pass

    def analyze(self, resume_skills: Dict[str, List[str]], job_description_analysis: Optional[Dict] = None) -> SkillsAssessment:
        """
        Analyze skills to generate assessment.
        
        Args:
            resume_skills: Dict of extracted skills categories (Technical, Soft, Tools)
            job_description_analysis: Optional analysis from JD comparison
            
        Returns:
            SkillsAssessment object
        """
        # Flatten skills
        all_skills = []
        for cat, skills in resume_skills.items():
            if isinstance(skills, list):
                all_skills.extend(skills)
        
        total_count = len(all_skills)
        
        # Estimate proficiency (mock logic without detailed assessment data)
        # In a real system, we'd extract proficiency levels or infer them from experience
        overall_proficiency = min(100, total_count * 2 + 40) 
        
        # Identify gaps (using JD analysis if available)
        gaps = []
        market_comp = None
        roadmap = []
        
        if job_description_analysis:
            missing = job_description_analysis.get("missing_requirements", [])
            for skill in missing:
                gaps.append(SkillGap(
                    skill_name=skill,
                    current_level="None",
                    required_level="Intermediate",
                    gap_type="missing",
                    importance="high"
                ))
                roadmap.append(f"Learn {skill} to match job requirements")
            
            # Simple market comparison based on match percentage
            match_pct = job_description_analysis.get("match_percentage", 50)
            market_comp = MarketComparison(
                role="Target Role",
                percentile=int(match_pct),
                missing_critical_skills=missing[:3],
                above_market_skills=job_description_analysis.get("matched_requirements", [])[:3]
            )
        else:
            # Generic gaps/roadmap based on common trends (simplified)
            # If tech resume but no cloud skills, suggest cloud, etc.
            tech_skills = resume_skills.get("technical_skills", [])
            tech_str = " ".join(tech_skills).lower()
            
            if "python" in tech_str and "pandas" not in tech_str:
                roadmap.append("Consider learning Pandas for data analysis")
            
            if "javascript" in tech_str and "react" not in tech_str:
                roadmap.append("Consider learning React framework")
                
            market_comp = MarketComparison(
                role="General Market",
                percentile=65, # Default estimation
                missing_critical_skills=[],
                above_market_skills=tech_skills[:3]
            )

        return SkillsAssessment(
            overall_proficiency=overall_proficiency,
            total_skills_identified=total_count,
            verified_skills_count=int(total_count * 0.8), # Estimation
            skill_gaps=gaps,
            market_comparison=market_comp,
            strongest_skills=all_skills[:5],
            areas_for_improvement=[gap.skill_name for gap in gaps[:5]],
            learning_roadmap=roadmap
        )
