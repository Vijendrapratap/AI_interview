"""
Resume Analytics Service
- Gap Analysis
- Job Hopping Detection
- Leadership Signal Detection
- Integration with Career Analytics
"""

from typing import Dict, List, Optional
from datetime import datetime, date
import re
import logging

from app.services.analytics.career_analytics import CareerAnalytics, CareerInsights
from app.services.analytics.question_generator import ResumeQuestionGenerator
from app.services.analytics.industry_classifier import IndustryClassifier

logger = logging.getLogger(__name__)

class ResumeAnalytics:
    """
    Advanced analytics for resume data.
    Integrates with CareerAnalytics for comprehensive analysis.
    """

    def __init__(self):
        """Initialize with enhanced analytics components."""
        self.career_analytics = CareerAnalytics()
        self.question_generator = ResumeQuestionGenerator()
        self.industry_classifier = IndustryClassifier()

    def analyze(self, resume_data: Dict) -> Dict:
        """
        Perform comprehensive analysis on parsed resume data.
        """
        work_experience = resume_data.get("sections", {}).get("experience", [])
        if isinstance(work_experience, str):
            # If it's just raw text, we can't do structured analysis easily without LLM parsing first.
            # Assuming structred data or we skip.
            return {
                "gap_analysis": {"flags": [], "gaps": []},
                "job_stability": {"flags": [], "average_tenure_years": 0},
                "leadership_signals": []
            }

        # ensuring work_experience is a list of dicts (parsed structured data)
        # If the parser only returns text, we might need to rely on the LLM-extracted structure stored in 'chunks' or elsewhere.
        # For this implementation, we will assume 'work_experience' is a list of dicts with 'start_date', 'end_date'.
        # If not, we will fallback to a mock/heuristic or rely on LLM Extraction in a real scenario.
        
        # Since the current parser might be simple, let's assume we extract dates from the text if needed, 
        # but better to assume standard format: [{ "start": "2020-01", "end": "2021-01", "company": "..." }]
        
        return {
            "gap_analysis": self._analyze_gaps(work_experience),
            "job_stability": self._analyze_stability(work_experience),
            "leadership_signals": self._detect_leadership(resume_data.get("text_content", ""))
        }

    def _analyze_gaps(self, experience: List[Dict]) -> Dict:
        """
        Analyze employment gaps > 3 months.
        """
        gaps = []
        flags = []
        
        # Sort by start date (descending or ascending? usually descending in resumes)
        # We need to normalize dates first.
        timeline = []
        for job in experience:
            start = self._parse_date(job.get("start_date") or job.get("start"))
            end = self._parse_date(job.get("end_date") or job.get("end"))
            if start:
                if not end:
                    end = datetime.now() # Present
                timeline.append({"start": start, "end": end, "company": job.get("company", "Unknown")})
        
        # Sort ascending for gap check
        timeline.sort(key=lambda x: x["start"])
        
        for i in range(len(timeline) - 1):
            current_job = timeline[i]
            next_job = timeline[i+1]
            
            # Check gap between current_end and next_start
            # Wait, if current job overlaps next, no gap. 
            # Gap is between current job END and next job START (if strict seq)
            # But overlapping jobs exist. 
            
            # Simple logic: Gap if next_start > current_end + 3 months
            gap_days = (next_job["start"] - current_job["end"]).days
            if gap_days > 90:
                months = int(gap_days / 30)
                gaps.append({
                    "start": current_job["end"].strftime("%Y-%m"),
                    "end": next_job["start"].strftime("%Y-%m"),
                    "duration_months": months,
                    "between": f"{current_job['company']} and {next_job['company']}"
                })
                flags.append(f"Gap of {months} months detected between {current_job['company']} and {next_job['company']}")

        return {
            "has_gaps": len(gaps) > 0,
            "gaps": gaps,
            "flags": flags
        }

    def _analyze_stability(self, experience: List[Dict]) -> Dict:
        """
        Analyze job stability (Job Hopping).
        """
        short_tenures = []
        flags = []
        total_tenure_days = 0
        job_count = 0
        
        for job in experience:
            start = self._parse_date(job.get("start_date") or job.get("start"))
            end = self._parse_date(job.get("end_date") or job.get("end"))
            
            if start:
                if not end:
                    end = datetime.now()
                
                duration_days = (end - start).days
                total_tenure_days += duration_days
                job_count += 1
                
                # Flag < 1 year (365 days)
                if duration_days < 365:
                    months = int(duration_days / 30)
                    short_tenures.append({
                        "company": job.get("company", "Unknown"),
                        "duration_months": months
                    })
        
        if len(short_tenures) >= 2:
           flags.append(f"Job Hopping Risk: {len(short_tenures)} roles held for less than 1 year.")
           
        avg_tenure = (total_tenure_days / 365) / job_count if job_count > 0 else 0
        
        return {
            "job_hopping_risk": len(short_tenures) >= 2,
            "short_tenures": short_tenures,
            "average_tenure_years": round(avg_tenure, 1),
            "flags": flags
        }

    def _detect_leadership(self, text: str) -> List[str]:
        """
        Detect leadership signals in text.
        """
        signals = []
        text_lower = text.lower()
        
        patterns = [
            ("managed team", "Managed a team"),
            ("led team", "Led a team"),
            ("mentored", "Mentored junior engineers"),
            ("hired", "Involved in hiring/recruiting"),
            ("spearheaded", "Spearheaded initiatives"),
            ("strategic", "Strategic planning detected"),
            ("stakeholder", "Stakeholder management detected")
        ]
        
        for pattern, label in patterns:
            if pattern in text_lower:
                signals.append(label)
                
        return list(set(signals))

    def _parse_date(self, date_str: str) -> Optional[datetime]:
        """
        Parse flexible date strings.
        """
        if not date_str or str(date_str).lower() == "present":
            return None

        formats = ["%Y-%m-%d", "%Y-%m", "%b %Y", "%B %Y", "%Y"]
        for fmt in formats:
            try:
                return datetime.strptime(str(date_str).strip(), fmt)
            except ValueError:
                continue
        return None

    def analyze_structured(self, experiences: List[Dict]) -> Dict:
        """
        Perform enhanced analysis on structured experience data.

        Args:
            experiences: List of structured experience entries with:
                - company, title, start_date, end_date, duration_months
                - is_current, responsibilities, industry, location

        Returns:
            Dict with comprehensive career analytics
        """
        # Use the new CareerAnalytics for comprehensive analysis
        insights = self.career_analytics.analyze(experiences)

        # Also run legacy analysis for backwards compatibility
        legacy_gaps = self._analyze_gaps(experiences)
        legacy_stability = self._analyze_stability(experiences)

        # Combine all text for leadership detection
        text_content = " ".join(
            " ".join(exp.get("responsibilities", []))
            for exp in experiences
        )
        leadership = self._detect_leadership(text_content)

        return {
            # Legacy format for backwards compatibility
            "gap_analysis": legacy_gaps,
            "job_stability": legacy_stability,
            "leadership_signals": leadership,
            # Enhanced career analytics
            "career_insights": insights.to_dict()
        }

    def generate_smart_questions(
        self,
        experiences: List[Dict],
        max_questions: int = 10
    ) -> List[Dict]:
        """
        Generate smart interview questions based on experience data.

        Args:
            experiences: List of structured experience entries
            max_questions: Maximum number of questions to generate

        Returns:
            List of question dictionaries
        """
        # Run career analytics
        insights = self.career_analytics.analyze(experiences)

        # Generate questions
        questions = self.question_generator.generate_questions(
            insights=insights,
            experiences=experiences,
            max_questions=max_questions
        )

        return [q.to_dict() for q in questions]

    def get_industry_analysis(self, experiences: List[Dict]) -> Dict:
        """
        Get industry distribution and transition analysis.

        Args:
            experiences: List of structured experience entries

        Returns:
            Dict with industry analysis
        """
        if not experiences:
            return {
                "industries": [],
                "primary_industry": "Unknown",
                "is_industry_hopper": False,
                "transitions": []
            }

        # Get all industries
        industries = self.industry_classifier.get_all_industries(experiences)

        # Get primary industry
        primary, percentage = self.industry_classifier.get_primary_industry(experiences)

        # Detect transitions
        transitions = self.industry_classifier.detect_transitions(experiences)

        return {
            "industries": [
                self.industry_classifier.format_industry_name(i)
                for i in industries
            ],
            "primary_industry": self.industry_classifier.format_industry_name(primary),
            "primary_percentage": percentage,
            "is_industry_hopper": len(industries) >= 3,
            "transitions": [
                {
                    "from": self.industry_classifier.format_industry_name(t.from_industry),
                    "to": self.industry_classifier.format_industry_name(t.to_industry),
                    "year": t.year,
                    "from_company": t.from_company,
                    "to_company": t.to_company
                }
                for t in transitions
            ]
        }

    def get_stability_risk(self, experiences: List[Dict]) -> Dict:
        """
        Calculate job stability risk score.

        Args:
            experiences: List of structured experience entries

        Returns:
            Dict with stability metrics and risk assessment
        """
        insights = self.career_analytics.analyze(experiences)

        # Calculate risk score (0-100, higher = more risk)
        risk_score = 0

        # Tenure factors
        if insights.average_tenure_months < 12:
            risk_score += 30
        elif insights.average_tenure_months < 18:
            risk_score += 20
        elif insights.average_tenure_months < 24:
            risk_score += 10

        # Job count factors
        if insights.roles_under_1_year >= 3:
            risk_score += 25
        elif insights.roles_under_1_year >= 2:
            risk_score += 15
        elif insights.roles_under_1_year >= 1:
            risk_score += 5

        # Gap factors
        significant_gaps = [
            g for g in insights.employment_gaps
            if g.get("severity") == "significant"
        ]
        risk_score += len(significant_gaps) * 10

        # Industry hopping
        if insights.is_industry_hopper:
            risk_score += 10

        # Cap at 100
        risk_score = min(100, risk_score)

        # Determine risk level
        if risk_score >= 60:
            risk_level = "high"
        elif risk_score >= 30:
            risk_level = "medium"
        elif risk_score >= 10:
            risk_level = "low"
        else:
            risk_level = "none"

        return {
            "risk_score": risk_score,
            "risk_level": risk_level,
            "factors": {
                "average_tenure_months": insights.average_tenure_months,
                "roles_under_1_year": insights.roles_under_1_year,
                "roles_under_2_years": insights.roles_under_2_years,
                "significant_gaps": len(significant_gaps),
                "is_industry_hopper": insights.is_industry_hopper
            },
            "recommendation": self._get_stability_recommendation(risk_level)
        }

    def _get_stability_recommendation(self, risk_level: str) -> str:
        """Get recommendation based on stability risk level."""
        recommendations = {
            "high": "High job-hopping risk. Probe deeply about reasons for short tenures and commitment to long-term roles.",
            "medium": "Moderate stability concerns. Ask about career goals and what would make them stay longer.",
            "low": "Minor stability indicators. Standard interview process recommended.",
            "none": "Strong stability profile. Candidate shows consistent tenure patterns."
        }
        return recommendations.get(risk_level, "")
