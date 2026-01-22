"""
Career Analytics Service
- Comprehensive career pattern analysis
- Gap detection, job hopping analysis, trajectory analysis
- Industry transition detection
"""

from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, field, asdict
from datetime import datetime
import logging

from app.services.analytics.industry_classifier import IndustryClassifier, IndustryTransition

logger = logging.getLogger(__name__)


@dataclass
class GapInfo:
    """Information about an employment gap."""
    start: str  # YYYY-MM format
    end: str
    duration_months: int
    between_companies: str  # "Company A and Company B"
    severity: str  # "minor" (<3 months), "medium" (3-6 months), "significant" (>6 months)


@dataclass
class TenureInfo:
    """Information about a job tenure."""
    company: str
    title: str
    duration_months: int
    start_date: Optional[str]
    end_date: Optional[str]


@dataclass
class TitleChange:
    """Information about a title/role change."""
    from_title: str
    to_title: str
    from_company: str
    to_company: str
    year: Optional[int]
    change_type: str  # "promotion", "lateral", "role_change", "demotion"


@dataclass
class RedFlag:
    """A potential red flag in the career history."""
    flag_type: str
    description: str
    severity: str  # "low", "medium", "high"
    details: Optional[Dict] = None


@dataclass
class OverlapInfo:
    """Information about overlapping job dates."""
    company1: str
    company2: str
    overlap_start: str
    overlap_end: str
    overlap_months: int


@dataclass
class CareerInsights:
    """Comprehensive career insights from analysis."""
    # Timeline Analysis
    total_experience_years: float
    employment_gaps: List[GapInfo]
    has_significant_gaps: bool  # > 6 months

    # Stability Analysis
    average_tenure_months: float
    shortest_tenure: Optional[TenureInfo]
    longest_tenure: Optional[TenureInfo]
    job_hopping_risk: str  # "none", "low", "medium", "high"
    roles_under_1_year: int
    roles_under_2_years: int

    # Industry Analysis
    industries_worked: List[str]
    industry_transitions: List[Dict]  # Serialized IndustryTransition
    is_industry_hopper: bool
    primary_industry: str
    primary_industry_percentage: float

    # Career Trajectory
    trajectory: str  # "ascending", "lateral", "descending", "mixed"
    seniority_progression: List[str]
    title_changes: List[Dict]  # Serialized TitleChange

    # Red Flags
    red_flags: List[Dict]  # Serialized RedFlag
    authenticity_concerns: List[str]

    # Overlaps
    date_overlaps: List[Dict]  # Serialized OverlapInfo

    def to_dict(self) -> Dict:
        """Convert to dictionary for serialization."""
        return asdict(self)


class CareerAnalytics:
    """
    Comprehensive career pattern analysis.
    Analyzes experience entries for gaps, stability, trajectory, and red flags.
    """

    # Seniority levels for trajectory analysis (lowest to highest)
    SENIORITY_LEVELS = [
        "intern",
        "junior",
        "mid",
        "senior",
        "lead",
        "staff",
        "principal",
        "director",
        "vp",
        "executive"
    ]

    def __init__(self):
        self.industry_classifier = IndustryClassifier()

    def analyze(self, experiences: List[Dict]) -> CareerInsights:
        """
        Perform comprehensive career analysis on experience data.

        Args:
            experiences: List of experience entries with:
                - company, title, start_date, end_date, duration_months
                - is_current, responsibilities, industry, location

        Returns:
            CareerInsights with comprehensive analysis
        """
        if not experiences:
            return self._empty_insights()

        # Sort experiences by start date (most recent first)
        sorted_exp = self._sort_experiences(experiences)

        # Calculate total experience
        total_years = self._calculate_total_experience(sorted_exp)

        # Analyze gaps
        gaps = self._analyze_gaps(sorted_exp)
        has_significant_gaps = any(g.duration_months >= 6 for g in gaps)

        # Analyze stability
        stability = self._analyze_stability(sorted_exp)

        # Analyze industries
        industry_analysis = self._analyze_industries(sorted_exp)

        # Analyze trajectory
        trajectory_analysis = self._analyze_trajectory(sorted_exp)

        # Detect overlaps
        overlaps = self._detect_overlaps(sorted_exp)

        # Identify red flags
        red_flags = self._identify_red_flags(
            sorted_exp, gaps, stability, overlaps
        )

        # Authenticity concerns
        authenticity_concerns = self._check_authenticity(sorted_exp)

        return CareerInsights(
            # Timeline
            total_experience_years=total_years,
            employment_gaps=[asdict(g) for g in gaps],
            has_significant_gaps=has_significant_gaps,

            # Stability
            average_tenure_months=stability["average_tenure_months"],
            shortest_tenure=stability["shortest_tenure"],
            longest_tenure=stability["longest_tenure"],
            job_hopping_risk=stability["job_hopping_risk"],
            roles_under_1_year=stability["roles_under_1_year"],
            roles_under_2_years=stability["roles_under_2_years"],

            # Industries
            industries_worked=industry_analysis["industries"],
            industry_transitions=industry_analysis["transitions"],
            is_industry_hopper=industry_analysis["is_hopper"],
            primary_industry=industry_analysis["primary_industry"],
            primary_industry_percentage=industry_analysis["primary_percentage"],

            # Trajectory
            trajectory=trajectory_analysis["trajectory"],
            seniority_progression=trajectory_analysis["seniority_progression"],
            title_changes=trajectory_analysis["title_changes"],

            # Red flags
            red_flags=[asdict(r) for r in red_flags],
            authenticity_concerns=authenticity_concerns,

            # Overlaps
            date_overlaps=[asdict(o) for o in overlaps]
        )

    def _empty_insights(self) -> CareerInsights:
        """Return empty insights when no experience data."""
        return CareerInsights(
            total_experience_years=0,
            employment_gaps=[],
            has_significant_gaps=False,
            average_tenure_months=0,
            shortest_tenure=None,
            longest_tenure=None,
            job_hopping_risk="none",
            roles_under_1_year=0,
            roles_under_2_years=0,
            industries_worked=[],
            industry_transitions=[],
            is_industry_hopper=False,
            primary_industry="Unknown",
            primary_industry_percentage=0,
            trajectory="unknown",
            seniority_progression=[],
            title_changes=[],
            red_flags=[],
            authenticity_concerns=[],
            date_overlaps=[]
        )

    def _sort_experiences(self, experiences: List[Dict]) -> List[Dict]:
        """Sort experiences by start date (most recent first)."""
        def get_start_date(exp: Dict) -> datetime:
            date_str = exp.get("start_date")
            if not date_str:
                return datetime.min

            if isinstance(date_str, datetime):
                return date_str

            try:
                return datetime.strptime(str(date_str), "%Y-%m")
            except ValueError:
                try:
                    return datetime.strptime(str(date_str), "%Y")
                except ValueError:
                    return datetime.min

        return sorted(experiences, key=get_start_date, reverse=True)

    def _calculate_total_experience(self, experiences: List[Dict]) -> float:
        """Calculate total years of experience."""
        if not experiences:
            return 0

        # Find earliest start and latest end
        earliest_start = None
        latest_end = None

        for exp in experiences:
            start = self._parse_date(exp.get("start_date"))
            end = self._parse_date(exp.get("end_date"))

            if exp.get("is_current"):
                end = datetime.now()

            if start and (earliest_start is None or start < earliest_start):
                earliest_start = start

            if end and (latest_end is None or end > latest_end):
                latest_end = end

        if not earliest_start:
            return 0

        if not latest_end:
            latest_end = datetime.now()

        months = (latest_end.year - earliest_start.year) * 12 + (latest_end.month - earliest_start.month)
        return round(months / 12, 1)

    def _analyze_gaps(self, experiences: List[Dict]) -> List[GapInfo]:
        """Analyze employment gaps between jobs."""
        gaps = []

        if len(experiences) < 2:
            return gaps

        # Sort ascending for gap analysis
        sorted_asc = sorted(
            experiences,
            key=lambda x: self._parse_date(x.get("start_date")) or datetime.min
        )

        for i in range(len(sorted_asc) - 1):
            current = sorted_asc[i]
            next_job = sorted_asc[i + 1]

            current_end = self._parse_date(current.get("end_date"))
            if current.get("is_current"):
                continue  # Current job, no gap to check

            if not current_end:
                continue

            next_start = self._parse_date(next_job.get("start_date"))
            if not next_start:
                continue

            # Calculate gap in days
            gap_days = (next_start - current_end).days

            if gap_days > 30:  # Only consider gaps > 1 month
                gap_months = gap_days // 30

                # Determine severity
                if gap_months < 3:
                    severity = "minor"
                elif gap_months < 6:
                    severity = "medium"
                else:
                    severity = "significant"

                gaps.append(GapInfo(
                    start=current_end.strftime("%Y-%m"),
                    end=next_start.strftime("%Y-%m"),
                    duration_months=gap_months,
                    between_companies=f"{current.get('company', 'Unknown')} and {next_job.get('company', 'Unknown')}",
                    severity=severity
                ))

        return gaps

    def _analyze_stability(self, experiences: List[Dict]) -> Dict:
        """Analyze job stability and hopping patterns."""
        if not experiences:
            return {
                "average_tenure_months": 0,
                "shortest_tenure": None,
                "longest_tenure": None,
                "job_hopping_risk": "none",
                "roles_under_1_year": 0,
                "roles_under_2_years": 0
            }

        tenures = []
        roles_under_1_year = 0
        roles_under_2_years = 0

        for exp in experiences:
            duration = exp.get("duration_months", 0)

            if duration == 0:
                # Calculate from dates
                start = self._parse_date(exp.get("start_date"))
                end = self._parse_date(exp.get("end_date"))

                if exp.get("is_current"):
                    end = datetime.now()

                if start and end:
                    duration = (end.year - start.year) * 12 + (end.month - start.month)

            if duration > 0:
                tenure = TenureInfo(
                    company=exp.get("company", "Unknown"),
                    title=exp.get("title", "Unknown"),
                    duration_months=duration,
                    start_date=exp.get("start_date"),
                    end_date=exp.get("end_date")
                )
                tenures.append(tenure)

                if duration < 12:
                    roles_under_1_year += 1
                if duration < 24:
                    roles_under_2_years += 1

        if not tenures:
            return {
                "average_tenure_months": 0,
                "shortest_tenure": None,
                "longest_tenure": None,
                "job_hopping_risk": "none",
                "roles_under_1_year": 0,
                "roles_under_2_years": 0
            }

        # Calculate average
        total_months = sum(t.duration_months for t in tenures)
        average = total_months / len(tenures)

        # Find shortest and longest
        shortest = min(tenures, key=lambda t: t.duration_months)
        longest = max(tenures, key=lambda t: t.duration_months)

        # Determine job hopping risk
        if roles_under_1_year >= 3 or (len(tenures) > 2 and roles_under_1_year >= 2):
            risk = "high"
        elif roles_under_1_year >= 2 or (len(tenures) > 3 and average < 18):
            risk = "medium"
        elif roles_under_1_year >= 1 or average < 24:
            risk = "low"
        else:
            risk = "none"

        return {
            "average_tenure_months": round(average, 1),
            "shortest_tenure": asdict(shortest),
            "longest_tenure": asdict(longest),
            "job_hopping_risk": risk,
            "roles_under_1_year": roles_under_1_year,
            "roles_under_2_years": roles_under_2_years
        }

    def _analyze_industries(self, experiences: List[Dict]) -> Dict:
        """Analyze industry distribution and transitions."""
        if not experiences:
            return {
                "industries": [],
                "transitions": [],
                "is_hopper": False,
                "primary_industry": "Unknown",
                "primary_percentage": 0
            }

        # Get industry for each experience
        industry_months = {}
        total_months = 0

        for exp in experiences:
            industry = exp.get("industry")
            if not industry:
                industry = self.industry_classifier.classify(
                    exp.get("company", ""),
                    exp.get("title", ""),
                    " ".join(exp.get("responsibilities", []))
                )

            industry = self.industry_classifier.format_industry_name(industry)
            duration = exp.get("duration_months", 12)

            industry_months[industry] = industry_months.get(industry, 0) + duration
            total_months += duration

        # Get unique industries
        industries = list(industry_months.keys())

        # Detect transitions
        transitions = []
        sorted_exp = sorted(
            experiences,
            key=lambda x: self._parse_date(x.get("start_date")) or datetime.min
        )

        prev_industry = None
        prev_company = None

        for exp in sorted_exp:
            industry = exp.get("industry") or self.industry_classifier.classify(
                exp.get("company", ""),
                exp.get("title", ""),
                " ".join(exp.get("responsibilities", []))
            )
            industry = self.industry_classifier.format_industry_name(industry)

            if prev_industry and industry != prev_industry:
                start_date = exp.get("start_date")
                year = None
                if start_date:
                    try:
                        if isinstance(start_date, str):
                            year = int(start_date[:4])
                        elif isinstance(start_date, datetime):
                            year = start_date.year
                    except (ValueError, TypeError):
                        pass

                transitions.append({
                    "from_industry": prev_industry,
                    "to_industry": industry,
                    "year": year,
                    "from_company": prev_company or "Unknown",
                    "to_company": exp.get("company", "Unknown")
                })

            prev_industry = industry
            prev_company = exp.get("company")

        # Determine primary industry
        if industry_months:
            primary = max(industry_months, key=industry_months.get)
            percentage = (industry_months[primary] / total_months * 100) if total_months > 0 else 0
        else:
            primary = "Unknown"
            percentage = 0

        # Is industry hopper (3+ different industries)
        is_hopper = len(industries) >= 3

        return {
            "industries": industries,
            "transitions": transitions,
            "is_hopper": is_hopper,
            "primary_industry": primary,
            "primary_percentage": round(percentage, 1)
        }

    def _analyze_trajectory(self, experiences: List[Dict]) -> Dict:
        """Analyze career trajectory and progression."""
        if not experiences:
            return {
                "trajectory": "unknown",
                "seniority_progression": [],
                "title_changes": []
            }

        # Get seniority for each role
        seniority_progression = []
        title_changes = []

        # Sort chronologically (oldest first)
        sorted_exp = sorted(
            experiences,
            key=lambda x: self._parse_date(x.get("start_date")) or datetime.min
        )

        prev_seniority = None
        prev_title = None
        prev_company = None
        prev_seniority_level = -1

        for exp in sorted_exp:
            title = exp.get("title", "")
            company = exp.get("company", "")

            # Determine seniority level
            seniority = self.industry_classifier.classify_seniority(title)
            seniority_level = self._get_seniority_level(seniority)

            seniority_progression.append(seniority)

            # Track title changes
            if prev_title and title != prev_title:
                # Determine change type
                if seniority_level > prev_seniority_level:
                    change_type = "promotion"
                elif seniority_level < prev_seniority_level:
                    change_type = "demotion"
                elif company != prev_company:
                    change_type = "lateral"
                else:
                    change_type = "role_change"

                start_date = exp.get("start_date")
                year = None
                if start_date:
                    try:
                        if isinstance(start_date, str):
                            year = int(start_date[:4])
                        elif isinstance(start_date, datetime):
                            year = start_date.year
                    except (ValueError, TypeError):
                        pass

                title_changes.append({
                    "from_title": prev_title,
                    "to_title": title,
                    "from_company": prev_company,
                    "to_company": company,
                    "year": year,
                    "change_type": change_type
                })

            prev_seniority = seniority
            prev_seniority_level = seniority_level
            prev_title = title
            prev_company = company

        # Determine overall trajectory
        trajectory = self._determine_trajectory(seniority_progression)

        return {
            "trajectory": trajectory,
            "seniority_progression": seniority_progression,
            "title_changes": title_changes
        }

    def _get_seniority_level(self, seniority: str) -> int:
        """Get numeric seniority level."""
        try:
            return self.SENIORITY_LEVELS.index(seniority)
        except ValueError:
            return 2  # Default to "mid"

    def _determine_trajectory(self, seniority_progression: List[str]) -> str:
        """Determine overall career trajectory."""
        if len(seniority_progression) < 2:
            return "unknown"

        levels = [self._get_seniority_level(s) for s in seniority_progression]

        # Count upward and downward moves
        upward = sum(1 for i in range(1, len(levels)) if levels[i] > levels[i - 1])
        downward = sum(1 for i in range(1, len(levels)) if levels[i] < levels[i - 1])
        lateral = len(levels) - 1 - upward - downward

        if upward > downward and upward >= lateral:
            return "ascending"
        elif downward > upward and downward >= lateral:
            return "descending"
        elif lateral > upward and lateral > downward:
            return "lateral"
        else:
            return "mixed"

    def _detect_overlaps(self, experiences: List[Dict]) -> List[OverlapInfo]:
        """Detect overlapping job dates."""
        overlaps = []

        for i, exp1 in enumerate(experiences):
            for exp2 in experiences[i + 1:]:
                start1 = self._parse_date(exp1.get("start_date"))
                end1 = self._parse_date(exp1.get("end_date"))
                if exp1.get("is_current"):
                    end1 = datetime.now()

                start2 = self._parse_date(exp2.get("start_date"))
                end2 = self._parse_date(exp2.get("end_date"))
                if exp2.get("is_current"):
                    end2 = datetime.now()

                if not all([start1, end1, start2, end2]):
                    continue

                # Check for overlap
                overlap_start = max(start1, start2)
                overlap_end = min(end1, end2)

                if overlap_start < overlap_end:
                    overlap_months = (overlap_end.year - overlap_start.year) * 12 + (overlap_end.month - overlap_start.month)

                    # Only flag significant overlaps (> 1 month)
                    if overlap_months > 1:
                        overlaps.append(OverlapInfo(
                            company1=exp1.get("company", "Unknown"),
                            company2=exp2.get("company", "Unknown"),
                            overlap_start=overlap_start.strftime("%Y-%m"),
                            overlap_end=overlap_end.strftime("%Y-%m"),
                            overlap_months=overlap_months
                        ))

        return overlaps

    def _identify_red_flags(
        self,
        experiences: List[Dict],
        gaps: List[GapInfo],
        stability: Dict,
        overlaps: List[OverlapInfo]
    ) -> List[RedFlag]:
        """Identify potential red flags in career history."""
        flags = []

        # Significant gaps
        for gap in gaps:
            if gap.severity == "significant":
                flags.append(RedFlag(
                    flag_type="employment_gap",
                    description=f"Employment gap of {gap.duration_months} months between {gap.between_companies}",
                    severity="medium" if gap.duration_months < 12 else "high",
                    details={"start": gap.start, "end": gap.end, "months": gap.duration_months}
                ))

        # Job hopping
        if stability["job_hopping_risk"] in ["medium", "high"]:
            flags.append(RedFlag(
                flag_type="frequent_job_changes",
                description=f"{stability['roles_under_1_year']} roles held for less than 1 year",
                severity=stability["job_hopping_risk"],
                details={
                    "roles_under_1_year": stability["roles_under_1_year"],
                    "average_tenure_months": stability["average_tenure_months"]
                }
            ))

        # Date overlaps
        for overlap in overlaps:
            if overlap.overlap_months > 3:  # Only significant overlaps
                flags.append(RedFlag(
                    flag_type="date_overlap",
                    description=f"Overlapping dates ({overlap.overlap_months} months) between {overlap.company1} and {overlap.company2}",
                    severity="high" if overlap.overlap_months > 6 else "medium",
                    details=asdict(overlap)
                ))

        # Very short tenure at most recent job (if not current)
        if experiences:
            most_recent = experiences[0]  # Assuming sorted most recent first
            if not most_recent.get("is_current"):
                duration = most_recent.get("duration_months", 0)
                if duration > 0 and duration < 6:
                    flags.append(RedFlag(
                        flag_type="short_recent_tenure",
                        description=f"Most recent role at {most_recent.get('company')} lasted only {duration} months",
                        severity="medium",
                        details={"company": most_recent.get("company"), "months": duration}
                    ))

        return flags

    def _check_authenticity(self, experiences: List[Dict]) -> List[str]:
        """Check for potential authenticity concerns."""
        concerns = []

        for exp in experiences:
            responsibilities = exp.get("responsibilities", [])

            # No responsibilities listed
            if not responsibilities:
                concerns.append(f"No responsibilities listed for role at {exp.get('company', 'Unknown')}")
                continue

            # Generic descriptions
            generic_phrases = [
                "responsible for",
                "duties included",
                "worked on various",
                "participated in",
                "assisted with"
            ]

            resp_text = " ".join(responsibilities).lower()
            if any(phrase in resp_text for phrase in generic_phrases):
                has_metrics = any(
                    char.isdigit() for char in resp_text
                )
                if not has_metrics:
                    concerns.append(
                        f"Generic descriptions without metrics at {exp.get('company', 'Unknown')}"
                    )

        # Check for vague dates
        for exp in experiences:
            start_date = exp.get("start_date", "")
            end_date = exp.get("end_date", "")

            # Only year provided (no month)
            if start_date and len(str(start_date)) == 4:
                concerns.append(
                    f"Only year provided for start date at {exp.get('company', 'Unknown')}"
                )

        return concerns[:5]  # Limit to top 5 concerns

    def _parse_date(self, date_value) -> Optional[datetime]:
        """Parse a date string or datetime to datetime object."""
        if isinstance(date_value, datetime):
            return date_value

        if not date_value or str(date_value).lower() in ["present", "current", "now"]:
            return None

        date_str = str(date_value)

        formats = ["%Y-%m", "%Y/%m", "%Y-%m-%d", "%Y"]
        for fmt in formats:
            try:
                return datetime.strptime(date_str, fmt)
            except ValueError:
                continue

        return None
