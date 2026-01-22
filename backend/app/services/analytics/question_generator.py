"""
Smart Question Generator Service
- Generate targeted interview questions based on career patterns
- Questions for gaps, job changes, industry transitions, red flags
"""

from typing import Dict, List, Optional
from dataclasses import dataclass, asdict
import random
import logging

from app.services.analytics.career_analytics import CareerInsights

logger = logging.getLogger(__name__)


@dataclass
class InterviewQuestion:
    """A generated interview question."""
    question: str
    category: str  # "gap", "job_change", "industry", "experience", "red_flag", "depth"
    priority: str  # "high", "medium", "low"
    context: str   # Why this question is relevant
    follow_ups: List[str]

    def to_dict(self) -> Dict:
        """Convert to dictionary for serialization."""
        return asdict(self)


class ResumeQuestionGenerator:
    """
    Generate intelligent interview questions based on resume patterns.
    """

    # Question templates for each category
    GAP_QUESTIONS = [
        {
            "template": "I noticed a {duration}-month gap between {company1} and {company2} ({period}). What were you doing during this time?",
            "follow_ups": [
                "Were you actively job searching during this period?",
                "Did you pursue any professional development or learning?",
                "What made you decide to re-enter the workforce when you did?"
            ]
        },
        {
            "template": "Can you walk me through the transition period from {company1} to {company2}?",
            "follow_ups": [
                "What prompted you to leave {company1}?",
                "How did you spend the time between roles?",
                "What were you looking for in your next opportunity?"
            ]
        },
        {
            "template": "There's a {duration}-month gap in your work history around {period}. Could you explain what happened?",
            "follow_ups": [
                "Did you consider different career paths during this time?",
                "What skills or experiences did you gain during this period?",
                "How did this gap impact your career perspective?"
            ]
        }
    ]

    JOB_CHANGE_QUESTIONS = [
        {
            "template": "You've had {count} roles in {years} years. What's driving these transitions?",
            "follow_ups": [
                "What are you looking for that you haven't found yet?",
                "How would you describe your ideal work environment?",
                "What would make you stay at a company long-term?"
            ]
        },
        {
            "template": "What made you leave {company} after only {months} months?",
            "follow_ups": [
                "Was this your decision or was there a layoff/restructuring?",
                "What did you learn from this experience?",
                "How do you evaluate opportunities differently now?"
            ]
        },
        {
            "template": "I see several short tenures on your resume. What are you looking for in your next role that would make you stay longer?",
            "follow_ups": [
                "What factors typically lead to your decision to leave a role?",
                "How do you approach evaluating company culture before joining?",
                "What's the longest you've stayed at a company and why?"
            ]
        },
        {
            "template": "Your average tenure is about {tenure} months. How do you see yourself committing to a longer-term role?",
            "follow_ups": [
                "What would you need from an employer to stay for 3+ years?",
                "How do you balance career growth with stability?",
                "What's changed in your career priorities over time?"
            ]
        }
    ]

    INDUSTRY_QUESTIONS = [
        {
            "template": "You've worked across {industries}. What drew you from {industry1} to {industry2}?",
            "follow_ups": [
                "Which industry did you find most fulfilling?",
                "How do these varied experiences give you a unique perspective?",
                "Are you looking to specialize now or continue exploring?"
            ]
        },
        {
            "template": "How do you see your {industry1} experience applying to this {industry2} role?",
            "follow_ups": [
                "What transferable skills are most relevant?",
                "What's the biggest adjustment you'd need to make?",
                "How quickly can you get up to speed on industry-specific knowledge?"
            ]
        },
        {
            "template": "Your background spans {count} different industries. What's connecting these experiences for you?",
            "follow_ups": [
                "Is there a common thread in the problems you enjoy solving?",
                "How do you adapt to new industry contexts quickly?",
                "What industry would you most like to work in long-term?"
            ]
        }
    ]

    EXPERIENCE_DEPTH_QUESTIONS = [
        {
            "template": "You mention {skill} at {company}. Can you describe a specific project where you used it?",
            "follow_ups": [
                "What was your specific contribution?",
                "What challenges did you face?",
                "What was the outcome or impact?"
            ]
        },
        {
            "template": "Your role at {company} sounds similar to your role at {other_company}. What was different about each?",
            "follow_ups": [
                "What did you learn in one that you applied to the other?",
                "Which role was more challenging and why?",
                "How did your approach evolve between these roles?"
            ]
        },
        {
            "template": "You led a team of {team_size} at {company}. What was your management approach?",
            "follow_ups": [
                "How did you handle underperforming team members?",
                "What was your biggest leadership challenge?",
                "How did you develop and mentor your team?"
            ]
        }
    ]

    RED_FLAG_QUESTIONS = [
        {
            "template": "Your resume shows overlapping dates at {company1} and {company2}. Can you clarify this timeline?",
            "follow_ups": [
                "Were these concurrent positions?",
                "Was one a part-time or contract role?",
                "How did you manage responsibilities at both?"
            ]
        },
        {
            "template": "You list {skill} as a key skill, but I don't see many projects using it. Can you elaborate on your experience?",
            "follow_ups": [
                "What level of proficiency would you say you have?",
                "When did you last use this in a professional setting?",
                "What would you need to get up to speed on the latest developments?"
            ]
        },
        {
            "template": "Your most recent role at {company} was quite short ({duration} months). What happened?",
            "follow_ups": [
                "Was this expected when you joined?",
                "What did you accomplish in this time?",
                "What would you have done differently?"
            ]
        }
    ]

    TRAJECTORY_QUESTIONS = [
        {
            "template": "I see you moved from {from_title} to {to_title}. That seems like a {change_type}. Can you tell me about that decision?",
            "follow_ups": [
                "What motivated this change?",
                "How did this affect your career goals?",
                "What did you gain or sacrifice in making this move?"
            ]
        },
        {
            "template": "Your career shows a {trajectory} trajectory. Where do you see yourself in 5 years?",
            "follow_ups": [
                "What's the next step you're aiming for?",
                "What skills do you need to develop?",
                "How does this role fit into your plan?"
            ]
        }
    ]

    def __init__(self):
        pass

    def generate_questions(
        self,
        insights: CareerInsights,
        experiences: List[Dict],
        max_questions: int = 10
    ) -> List[InterviewQuestion]:
        """
        Generate targeted interview questions based on career insights.

        Args:
            insights: CareerInsights from career analytics
            experiences: List of experience entries
            max_questions: Maximum number of questions to generate

        Returns:
            List of InterviewQuestion objects
        """
        questions = []

        # Generate gap questions
        if insights.employment_gaps:
            gap_questions = self._generate_gap_questions(insights.employment_gaps)
            questions.extend(gap_questions)

        # Generate job change questions
        if insights.job_hopping_risk in ["medium", "high"]:
            change_questions = self._generate_job_change_questions(insights, experiences)
            questions.extend(change_questions)

        # Generate industry questions
        if insights.is_industry_hopper or len(insights.industry_transitions) > 0:
            industry_questions = self._generate_industry_questions(insights)
            questions.extend(industry_questions)

        # Generate red flag questions
        if insights.red_flags:
            red_flag_questions = self._generate_red_flag_questions(insights, experiences)
            questions.extend(red_flag_questions)

        # Generate trajectory questions
        if insights.title_changes:
            trajectory_questions = self._generate_trajectory_questions(insights)
            questions.extend(trajectory_questions)

        # Generate experience depth questions
        if experiences:
            depth_questions = self._generate_depth_questions(experiences)
            questions.extend(depth_questions)

        # Sort by priority and limit
        priority_order = {"high": 0, "medium": 1, "low": 2}
        questions.sort(key=lambda q: priority_order.get(q.priority, 1))

        return questions[:max_questions]

    def _generate_gap_questions(self, gaps: List[Dict]) -> List[InterviewQuestion]:
        """Generate questions about employment gaps."""
        questions = []

        for gap in gaps:
            if gap.get("severity") in ["medium", "significant"]:
                template = random.choice(self.GAP_QUESTIONS)

                # Parse between_companies
                between = gap.get("between_companies", "").split(" and ")
                company1 = between[0] if len(between) > 0 else "your previous role"
                company2 = between[1] if len(between) > 1 else "your next role"

                question_text = template["template"].format(
                    duration=gap.get("duration_months", "several"),
                    company1=company1,
                    company2=company2,
                    period=f"{gap.get('start', '')} to {gap.get('end', '')}"
                )

                follow_ups = [
                    f.format(company1=company1, company2=company2)
                    for f in template["follow_ups"]
                ]

                priority = "high" if gap.get("severity") == "significant" else "medium"

                questions.append(InterviewQuestion(
                    question=question_text,
                    category="gap",
                    priority=priority,
                    context=f"Unexplained gap of {gap.get('duration_months')} months",
                    follow_ups=follow_ups
                ))

        return questions

    def _generate_job_change_questions(
        self,
        insights: CareerInsights,
        experiences: List[Dict]
    ) -> List[InterviewQuestion]:
        """Generate questions about frequent job changes."""
        questions = []

        # General job hopping question
        if insights.roles_under_1_year >= 2:
            years = insights.total_experience_years
            template = random.choice(self.JOB_CHANGE_QUESTIONS[:2])

            # Find shortest recent role
            short_roles = [e for e in experiences if e.get("duration_months", 0) < 12]
            if short_roles:
                short_role = short_roles[0]
                company = short_role.get("company", "your previous company")
                months = short_role.get("duration_months", "a few")

                question_text = template["template"].format(
                    count=len(experiences),
                    years=round(years, 1),
                    company=company,
                    months=months,
                    tenure=round(insights.average_tenure_months)
                )

                questions.append(InterviewQuestion(
                    question=question_text,
                    category="job_change",
                    priority="high" if insights.job_hopping_risk == "high" else "medium",
                    context=f"Average tenure of {round(insights.average_tenure_months)} months with {insights.roles_under_1_year} roles under 1 year",
                    follow_ups=template["follow_ups"]
                ))

        return questions

    def _generate_industry_questions(self, insights: CareerInsights) -> List[InterviewQuestion]:
        """Generate questions about industry transitions."""
        questions = []

        if insights.industry_transitions:
            # Get the most recent transition
            transition = insights.industry_transitions[-1] if insights.industry_transitions else None

            if transition:
                template = random.choice(self.INDUSTRY_QUESTIONS)

                industries_str = ", ".join(insights.industries_worked[:3])

                question_text = template["template"].format(
                    industries=industries_str,
                    industry1=transition.get("from_industry", "your previous industry"),
                    industry2=transition.get("to_industry", "a new industry"),
                    count=len(insights.industries_worked)
                )

                questions.append(InterviewQuestion(
                    question=question_text,
                    category="industry",
                    priority="medium",
                    context=f"Worked across {len(insights.industries_worked)} industries: {industries_str}",
                    follow_ups=template["follow_ups"]
                ))

        return questions

    def _generate_red_flag_questions(
        self,
        insights: CareerInsights,
        experiences: List[Dict]
    ) -> List[InterviewQuestion]:
        """Generate questions about red flags."""
        questions = []

        for flag in insights.red_flags:
            flag_type = flag.get("flag_type")

            if flag_type == "date_overlap":
                details = flag.get("details", {})
                template = self.RED_FLAG_QUESTIONS[0]

                question_text = template["template"].format(
                    company1=details.get("company1", "one company"),
                    company2=details.get("company2", "another company")
                )

                questions.append(InterviewQuestion(
                    question=question_text,
                    category="red_flag",
                    priority="high",
                    context=flag.get("description", "Overlapping job dates detected"),
                    follow_ups=template["follow_ups"]
                ))

            elif flag_type == "short_recent_tenure":
                details = flag.get("details", {})
                template = self.RED_FLAG_QUESTIONS[2]

                question_text = template["template"].format(
                    company=details.get("company", "your last company"),
                    duration=details.get("months", "a short time")
                )

                questions.append(InterviewQuestion(
                    question=question_text,
                    category="red_flag",
                    priority="high",
                    context=flag.get("description", "Recent short tenure"),
                    follow_ups=template["follow_ups"]
                ))

        return questions

    def _generate_trajectory_questions(self, insights: CareerInsights) -> List[InterviewQuestion]:
        """Generate questions about career trajectory."""
        questions = []

        # Look for interesting title changes
        for change in insights.title_changes[-2:]:  # Last 2 changes
            change_type = change.get("change_type", "change")

            if change_type in ["promotion", "demotion", "lateral"]:
                template = self.TRAJECTORY_QUESTIONS[0]

                question_text = template["template"].format(
                    from_title=change.get("from_title", "your previous role"),
                    to_title=change.get("to_title", "your new role"),
                    change_type=change_type
                )

                priority = "medium" if change_type == "demotion" else "low"

                questions.append(InterviewQuestion(
                    question=question_text,
                    category="experience",
                    priority=priority,
                    context=f"Career {change_type} from {change.get('from_title')} to {change.get('to_title')}",
                    follow_ups=template["follow_ups"]
                ))

        return questions

    def _generate_depth_questions(self, experiences: List[Dict]) -> List[InterviewQuestion]:
        """Generate questions to probe experience depth."""
        questions = []

        if not experiences:
            return questions

        # Find experiences with responsibilities
        for exp in experiences[:3]:  # Top 3 recent experiences
            responsibilities = exp.get("responsibilities", [])

            if responsibilities:
                # Look for quantified achievements
                for resp in responsibilities[:2]:
                    if any(char.isdigit() for char in resp):
                        # Has numbers - good candidate for depth question
                        template = self.EXPERIENCE_DEPTH_QUESTIONS[0]

                        # Extract a skill or keyword
                        skill_keywords = ["led", "built", "designed", "implemented", "developed", "managed", "created"]
                        skill = None
                        for keyword in skill_keywords:
                            if keyword in resp.lower():
                                skill = keyword + " " + resp.split(keyword, 1)[-1].split()[0] if keyword in resp.lower() else keyword
                                break

                        if skill:
                            question_text = template["template"].format(
                                skill=skill,
                                company=exp.get("company", "your previous company")
                            )

                            questions.append(InterviewQuestion(
                                question=question_text,
                                category="depth",
                                priority="low",
                                context=f"Verify depth of experience: {resp[:50]}...",
                                follow_ups=template["follow_ups"]
                            ))
                            break

        return questions

    def generate_all_questions_dict(
        self,
        insights: CareerInsights,
        experiences: List[Dict],
        max_questions: int = 10
    ) -> List[Dict]:
        """
        Generate questions and return as list of dicts.

        Args:
            insights: CareerInsights from career analytics
            experiences: List of experience entries
            max_questions: Maximum number of questions to generate

        Returns:
            List of question dictionaries
        """
        questions = self.generate_questions(insights, experiences, max_questions)
        return [q.to_dict() for q in questions]
