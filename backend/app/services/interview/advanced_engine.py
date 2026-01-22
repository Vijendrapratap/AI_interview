"""
Advanced Interview Engine - Deep questioning with reasoning capabilities
Integrates career analytics for intelligent, probing interview questions
"""

from typing import Dict, Optional, List, Tuple
from dataclasses import dataclass, asdict
import logging
import random

from app.services.llm import LLMService
from app.core.config import model_config, settings
from app.services.analytics.career_analytics import CareerAnalytics, CareerInsights
from app.services.analytics.question_generator import ResumeQuestionGenerator
from app.services.resume.experience_extractor import ExperienceExtractor

logger = logging.getLogger(__name__)


@dataclass
class InterviewState:
    """Tracks interview state for adaptive questioning."""
    questions_asked: int = 0
    topics_covered: List[str] = None
    depth_scores: Dict[str, float] = None  # Track answer depth per topic
    red_flags_detected: List[Dict] = None
    areas_needing_probe: List[str] = None
    candidate_strengths: List[str] = None
    candidate_concerns: List[str] = None
    conversation_history: List[Dict] = None

    def __post_init__(self):
        self.topics_covered = self.topics_covered or []
        self.depth_scores = self.depth_scores or {}
        self.red_flags_detected = self.red_flags_detected or []
        self.areas_needing_probe = self.areas_needing_probe or []
        self.candidate_strengths = self.candidate_strengths or []
        self.candidate_concerns = self.candidate_concerns or []
        self.conversation_history = self.conversation_history or []


@dataclass
class QuestionStrategy:
    """Defines the strategy for the next question."""
    question_type: str  # "verification", "depth_probe", "behavioral", "technical", "situational"
    focus_area: str
    intensity: str  # "gentle", "moderate", "deep_probe"
    rationale: str
    target_competency: str


class AdvancedInterviewEngine:
    """
    Advanced AI-powered interview engine with deep questioning capabilities.

    Features:
    - Career analytics integration for smart questions
    - Adaptive depth probing based on answer quality
    - Red flag detection and verification
    - Chain-of-thought reasoning for question generation
    - Multi-dimensional competency assessment
    """

    # Competency weights for scoring
    COMPETENCY_WEIGHTS = {
        "technical_excellence": 0.30,
        "analytical_thinking": 0.25,
        "communication": 0.25,
        "behavioral_cultural": 0.20
    }

    # Question depth levels
    DEPTH_LEVELS = {
        "surface": 1,      # Basic question
        "clarifying": 2,   # Follow-up for clarity
        "probing": 3,      # Dig into specifics
        "challenging": 4,  # Challenge claims/assumptions
        "verification": 5  # Verify authenticity
    }

    def __init__(self, use_reasoning_mode: bool = True):
        """
        Initialize advanced interview engine.

        Args:
            use_reasoning_mode: Whether to use chain-of-thought reasoning
        """
        # Use OpenRouter with thinking model if available
        provider = "openrouter" if settings.OPENROUTER_API_KEY else None
        self.llm = LLMService(provider=provider, task="interview_questions")
        self.prompts = model_config.get_prompt("interview")

        # Load advanced prompts if available
        try:
            self.advanced_prompts = model_config.get_prompt("advanced_interview")
        except FileNotFoundError:
            self.advanced_prompts = {}

        # Analytics components
        self.career_analytics = CareerAnalytics()
        self.question_generator = ResumeQuestionGenerator()
        self.experience_extractor = ExperienceExtractor(use_llm_fallback=False)

        # Interview state
        self.state = InterviewState()
        self.use_reasoning_mode = use_reasoning_mode

        # Session context
        self.resume_text = ""
        self.jd_text = ""
        self.career_insights: Optional[CareerInsights] = None
        self.structured_experience: List[Dict] = []
        self.smart_questions: List[Dict] = []
        self.interview_type = "comprehensive"
        self.difficulty = "mid"
        self.num_questions = 7

    async def initialize_interview(
        self,
        resume_text: str,
        job_description: Optional[str],
        resume_analysis: Optional[Dict],
        interview_type: str = "comprehensive",
        num_questions: int = 7,
        difficulty: str = "mid"
    ) -> Dict:
        """
        Initialize interview with deep resume analysis.

        Args:
            resume_text: Candidate's resume
            job_description: Target job description
            resume_analysis: Pre-computed resume analysis
            interview_type: Type of interview
            num_questions: Target number of questions
            difficulty: Difficulty level

        Returns:
            Dict with intro message, first question, and analytics
        """
        # Store context
        self.resume_text = resume_text
        self.jd_text = job_description or ""
        self.interview_type = interview_type
        self.num_questions = num_questions
        self.difficulty = difficulty

        # Reset state
        self.state = InterviewState()

        # Extract structured experience
        try:
            experiences = await self.experience_extractor.extract(resume_text)
            self.structured_experience = [exp.to_dict() for exp in experiences]

            # Run career analytics
            self.career_insights = self.career_analytics.analyze(self.structured_experience)

            # Generate smart questions based on career patterns
            questions = self.question_generator.generate_questions(
                self.career_insights,
                self.structured_experience,
                max_questions=15
            )
            self.smart_questions = [q.to_dict() for q in questions]

            logger.info(
                f"Initialized with {len(self.structured_experience)} experiences, "
                f"{len(self.smart_questions)} smart questions"
            )
        except Exception as e:
            logger.error(f"Career analytics initialization failed: {e}")
            self.structured_experience = []
            self.career_insights = None
            self.smart_questions = []

        # Generate personalized introduction
        intro_response = await self._generate_introduction(resume_analysis)

        return {
            "intro_message": intro_response.get("intro_message", self._get_fallback_intro()),
            "first_question": intro_response.get("first_question", {}),
            "session_initialized": True,
            "career_analytics_summary": self._get_analytics_summary(),
            "settings": {
                "interview_type": interview_type,
                "num_questions": num_questions,
                "difficulty": difficulty
            }
        }

    async def generate_next_question(
        self,
        previous_questions: List[Dict],
        previous_responses: List[str],
        previous_evaluations: List[Dict]
    ) -> Dict:
        """
        Generate the next question using adaptive strategy.

        Uses chain-of-thought reasoning to determine:
        1. What competencies still need assessment
        2. What areas need deeper probing
        3. What claims need verification
        4. What follow-up is most valuable
        """
        # Update state
        self.state.questions_asked = len(previous_questions)

        # Analyze previous responses for patterns
        response_analysis = self._analyze_response_patterns(
            previous_questions,
            previous_responses,
            previous_evaluations
        )

        # Determine question strategy
        strategy = await self._determine_question_strategy(
            previous_questions,
            previous_evaluations,
            response_analysis
        )

        # Check if we should use a smart question
        smart_question = self._select_smart_question(
            previous_questions,
            strategy
        )

        if smart_question:
            return self._format_smart_question(smart_question, strategy)

        # Generate new question with reasoning
        return await self._generate_question_with_reasoning(
            strategy,
            previous_questions,
            previous_responses,
            response_analysis
        )

    async def evaluate_response_deep(
        self,
        question: Dict,
        response: str,
        audio_analytics: Optional[Dict] = None
    ) -> Dict:
        """
        Perform deep evaluation of candidate response.

        Evaluates:
        - Content accuracy and depth
        - Alignment with resume claims
        - Communication clarity
        - Authenticity signals
        - Technical depth (if applicable)
        - STAR method compliance (if behavioral)
        """
        # Quick heuristic checks
        depth_assessment = self._assess_answer_depth(response)

        # Build context for LLM evaluation
        context = {
            "resume_claims": self._extract_relevant_claims(question),
            "career_insights": asdict(self.career_insights) if self.career_insights else {},
            "previous_context": self.state.conversation_history[-3:] if self.state.conversation_history else []
        }

        # Perform deep evaluation
        evaluation = await self._evaluate_with_reasoning(
            question, response, context, audio_analytics
        )

        # Update state based on evaluation
        self._update_state_from_evaluation(question, response, evaluation)

        # Add conversation to history
        self.state.conversation_history.append({
            "question": question.get("question", ""),
            "response": response,
            "evaluation_summary": {
                "overall_score": evaluation.get("overall_score", 5),
                "depth": depth_assessment.get("depth", "medium"),
                "red_flags": evaluation.get("red_flags", [])
            }
        })

        return evaluation

    async def generate_follow_up(
        self,
        original_question: Dict,
        response: str,
        evaluation: Dict
    ) -> Dict:
        """
        Generate intelligent follow-up question.

        Determines the best follow-up type:
        - Clarification: Response was unclear
        - Depth probe: Need more specifics
        - Verification: Claims need checking
        - Challenge: Test assumptions
        """
        follow_up_type = self._determine_follow_up_type(evaluation)

        prompt = self._build_follow_up_prompt(
            original_question, response, evaluation, follow_up_type
        )

        try:
            result = await self.llm.generate_json(
                prompt=prompt,
                system_prompt=self._get_system_prompt(),
                temperature=0.6
            )

            return {
                "question": result.get("follow_up", "Could you elaborate on that?"),
                "question_type": "follow_up",
                "follow_up_type": follow_up_type,
                "topic": original_question.get("topic", "clarification"),
                "is_follow_up": True,
                "parent_question": original_question.get("question", ""),
                "rationale": result.get("rationale", "")
            }
        except Exception as e:
            logger.error(f"Follow-up generation failed: {e}")
            return self._get_fallback_follow_up(follow_up_type)

    def _analyze_response_patterns(
        self,
        questions: List[Dict],
        responses: List[str],
        evaluations: List[Dict]
    ) -> Dict:
        """Analyze patterns in candidate's responses."""
        if not responses:
            return {"patterns": [], "concerns": [], "strengths": []}

        patterns = {
            "avg_word_count": sum(len(r.split()) for r in responses) / len(responses),
            "uses_we_vs_i": sum(1 for r in responses if "we " in r.lower() and "i " not in r.lower()),
            "gives_specifics": sum(1 for r in responses if any(c.isdigit() for c in r)),
            "mentions_challenges": sum(1 for r in responses if any(w in r.lower() for w in ["challenge", "difficult", "problem", "issue"])),
            "shows_reflection": sum(1 for r in responses if any(w in r.lower() for w in ["learned", "realized", "improved", "mistake"])),
        }

        concerns = []
        strengths = []

        # Detect concerning patterns
        if patterns["uses_we_vs_i"] > len(responses) // 2:
            concerns.append("Uses 'we' frequently without clarifying personal contribution")
        if patterns["avg_word_count"] < 40:
            concerns.append("Consistently brief answers lacking detail")
        if patterns["gives_specifics"] < len(responses) // 3:
            concerns.append("Rarely provides specific metrics or examples")

        # Detect strengths
        if patterns["gives_specifics"] > len(responses) // 2:
            strengths.append("Provides specific, quantified examples")
        if patterns["shows_reflection"] > len(responses) // 3:
            strengths.append("Shows self-awareness and learning mindset")
        if patterns["avg_word_count"] > 80:
            strengths.append("Provides thorough, detailed responses")

        return {
            "patterns": patterns,
            "concerns": concerns,
            "strengths": strengths
        }

    async def _determine_question_strategy(
        self,
        previous_questions: List[Dict],
        evaluations: List[Dict],
        response_analysis: Dict
    ) -> QuestionStrategy:
        """Determine the optimal strategy for the next question."""
        # Calculate coverage of competencies
        competency_coverage = self._calculate_competency_coverage(previous_questions)

        # Find lowest covered competency
        lowest_competency = min(competency_coverage, key=competency_coverage.get)

        # Check for areas needing probe
        if self.state.areas_needing_probe:
            area = self.state.areas_needing_probe[0]
            return QuestionStrategy(
                question_type="depth_probe",
                focus_area=area,
                intensity="deep_probe",
                rationale=f"Previous response on {area} lacked depth",
                target_competency=lowest_competency
            )

        # Check for red flags to verify
        if self.state.red_flags_detected:
            flag = self.state.red_flags_detected[0]
            return QuestionStrategy(
                question_type="verification",
                focus_area=flag.get("area", "experience"),
                intensity="challenging",
                rationale=f"Need to verify: {flag.get('description', 'claim')}",
                target_competency="technical_excellence"
            )

        # Check career analytics for smart question opportunities
        if self.career_insights and self.smart_questions:
            unused_smart = [q for q in self.smart_questions
                          if not any(q["question"] in pq.get("question", "") for pq in previous_questions)]
            if unused_smart:
                sq = unused_smart[0]
                return QuestionStrategy(
                    question_type=sq["category"],
                    focus_area=sq.get("context", "career"),
                    intensity="moderate",
                    rationale=sq.get("context", "Based on career pattern"),
                    target_competency="behavioral_cultural"
                )

        # Default: Cover uncovered competency
        question_types = {
            "technical_excellence": "technical",
            "analytical_thinking": "situational",
            "communication": "behavioral",
            "behavioral_cultural": "behavioral"
        }

        return QuestionStrategy(
            question_type=question_types.get(lowest_competency, "behavioral"),
            focus_area=lowest_competency,
            intensity="moderate",
            rationale=f"Need more assessment of {lowest_competency}",
            target_competency=lowest_competency
        )

    def _assess_answer_depth(self, response: str) -> Dict:
        """Quick heuristic assessment of answer depth."""
        word_count = len(response.split())

        # Count specific indicators
        has_numbers = sum(1 for char in response if char.isdigit())
        has_specifics = sum(1 for word in ["specifically", "exactly", "precisely", "actually"] if word in response.lower())

        # Vague language indicators
        vague_phrases = ["kind of", "sort of", "basically", "you know", "stuff", "things", "etc", "various"]
        vague_count = sum(1 for phrase in vague_phrases if phrase in response.lower())

        # Personal contribution clarity
        uses_i = response.lower().count(" i ")
        uses_we = response.lower().count(" we ")

        # Calculate depth score
        depth_score = 0
        depth_score += min(word_count / 20, 5)  # Length contribution (max 5)
        depth_score += min(has_numbers, 3)       # Metrics contribution (max 3)
        depth_score += has_specifics            # Specificity contribution
        depth_score -= vague_count              # Penalize vagueness

        if uses_we > uses_i and uses_i < 2:
            depth_score -= 2  # Unclear personal contribution

        # Determine depth level
        if depth_score >= 7:
            depth = "deep"
        elif depth_score >= 4:
            depth = "adequate"
        elif depth_score >= 2:
            depth = "surface"
        else:
            depth = "shallow"

        return {
            "depth": depth,
            "depth_score": depth_score,
            "word_count": word_count,
            "has_metrics": has_numbers > 0,
            "vague_language": vague_count > 2,
            "personal_contribution_clear": uses_i > uses_we or uses_we < 2,
            "needs_follow_up": depth in ["shallow", "surface"]
        }

    def _select_smart_question(
        self,
        previous_questions: List[Dict],
        strategy: QuestionStrategy
    ) -> Optional[Dict]:
        """Select an appropriate smart question if available."""
        if not self.smart_questions:
            return None

        # Filter questions matching strategy
        matching = []
        for sq in self.smart_questions:
            # Check if already asked
            if any(sq["question"] in pq.get("question", "") for pq in previous_questions):
                continue

            # Match by category
            if sq["category"] == strategy.question_type:
                matching.append(sq)
            elif sq["priority"] == "high" and strategy.intensity in ["deep_probe", "challenging"]:
                matching.append(sq)

        if matching:
            # Prioritize high priority questions
            high_priority = [q for q in matching if q["priority"] == "high"]
            return high_priority[0] if high_priority else matching[0]

        return None

    def _format_smart_question(self, smart_question: Dict, strategy: QuestionStrategy) -> Dict:
        """Format a smart question for delivery."""
        return {
            "question": smart_question["question"],
            "question_type": smart_question["category"],
            "topic": smart_question.get("context", "career").split()[0],
            "expected_elements": [
                "Specific explanation",
                "Personal context",
                "Honest reflection"
            ],
            "difficulty": "medium" if smart_question["priority"] == "medium" else "hard",
            "follow_up_hints": smart_question.get("follow_ups", []),
            "is_smart_question": True,
            "strategy": asdict(strategy)
        }

    async def _generate_question_with_reasoning(
        self,
        strategy: QuestionStrategy,
        previous_questions: List[Dict],
        previous_responses: List[str],
        response_analysis: Dict
    ) -> Dict:
        """Generate question using chain-of-thought reasoning."""
        # Build comprehensive prompt
        prompt = self._build_question_generation_prompt(
            strategy, previous_questions, previous_responses, response_analysis
        )

        try:
            result = await self.llm.generate_json(
                prompt=prompt,
                system_prompt=self._get_system_prompt(),
                temperature=0.7
            )

            return {
                "question": result.get("question", self._get_fallback_question(len(previous_questions))),
                "question_type": strategy.question_type,
                "topic": result.get("topic", strategy.focus_area),
                "expected_elements": result.get("expected_elements", []),
                "difficulty": result.get("difficulty", self.difficulty),
                "follow_up_hints": result.get("follow_up_hints", []),
                "reasoning": result.get("reasoning", ""),
                "strategy": asdict(strategy)
            }
        except Exception as e:
            logger.error(f"Question generation failed: {e}")
            return self._get_fallback_question_dict(len(previous_questions))

    async def _evaluate_with_reasoning(
        self,
        question: Dict,
        response: str,
        context: Dict,
        audio_analytics: Optional[Dict]
    ) -> Dict:
        """Evaluate response with deep reasoning."""
        prompt = self._build_evaluation_prompt(question, response, context, audio_analytics)

        try:
            result = await self.llm.generate_json(
                prompt=prompt,
                system_prompt=self._get_system_prompt(),
                temperature=0.3
            )

            return self._validate_evaluation(result)
        except Exception as e:
            logger.error(f"Evaluation failed: {e}")
            return self._get_default_evaluation()

    def _update_state_from_evaluation(
        self,
        question: Dict,
        response: str,
        evaluation: Dict
    ) -> None:
        """Update interview state based on evaluation."""
        topic = question.get("topic", "general")

        # Update depth scores
        self.state.depth_scores[topic] = evaluation.get("overall_score", 5)

        # Track topics covered
        if topic not in self.state.topics_covered:
            self.state.topics_covered.append(topic)

        # Track red flags
        red_flags = evaluation.get("red_flags", [])
        for flag in red_flags:
            self.state.red_flags_detected.append({
                "area": topic,
                "description": flag,
                "question": question.get("question", "")
            })

        # Track areas needing probe
        if evaluation.get("follow_up_recommended", False):
            if topic not in self.state.areas_needing_probe:
                self.state.areas_needing_probe.append(topic)
        elif topic in self.state.areas_needing_probe:
            self.state.areas_needing_probe.remove(topic)

        # Track strengths and concerns
        self.state.candidate_strengths.extend(evaluation.get("strengths", []))
        self.state.candidate_concerns.extend(evaluation.get("weaknesses", []))

    def _determine_follow_up_type(self, evaluation: Dict) -> str:
        """Determine the best type of follow-up question."""
        if evaluation.get("red_flags"):
            return "verification"

        scores = evaluation.get("scores", {})

        if scores.get("content", 5) < 5:
            return "clarification"
        if scores.get("technical_depth", 5) < 5:
            return "depth_probe"
        if scores.get("star_method", 5) < 5:
            return "structure"
        if scores.get("authenticity", 5) < 6:
            return "verification"

        return "expansion"

    def _calculate_competency_coverage(self, questions: List[Dict]) -> Dict[str, float]:
        """Calculate how well each competency has been covered."""
        coverage = {
            "technical_excellence": 0,
            "analytical_thinking": 0,
            "communication": 0,
            "behavioral_cultural": 0
        }

        question_type_map = {
            "technical": "technical_excellence",
            "resume_verification": "technical_excellence",
            "analytical": "analytical_thinking",
            "situational": "analytical_thinking",
            "behavioral": "behavioral_cultural",
            "motivation": "behavioral_cultural",
            "self_reflection": "behavioral_cultural"
        }

        for q in questions:
            q_type = q.get("question_type", "behavioral")
            competency = question_type_map.get(q_type, "behavioral_cultural")
            coverage[competency] += 1
            coverage["communication"] += 0.5  # All questions assess communication

        return coverage

    def _extract_relevant_claims(self, question: Dict) -> List[str]:
        """Extract resume claims relevant to the question."""
        topic = question.get("topic", "").lower()
        claims = []

        for exp in self.structured_experience[:3]:  # Recent experiences
            if topic in exp.get("title", "").lower() or topic in exp.get("industry", "").lower():
                claims.append(f"{exp.get('title')} at {exp.get('company')}")
                claims.extend(exp.get("responsibilities", [])[:2])

        return claims

    def _build_question_generation_prompt(
        self,
        strategy: QuestionStrategy,
        previous_questions: List[Dict],
        previous_responses: List[str],
        response_analysis: Dict
    ) -> str:
        """Build prompt for question generation with reasoning."""
        return f"""Generate the next interview question using the following strategy:

## STRATEGY
- Type: {strategy.question_type}
- Focus Area: {strategy.focus_area}
- Intensity: {strategy.intensity}
- Rationale: {strategy.rationale}
- Target Competency: {strategy.target_competency}

## CANDIDATE CONTEXT
Resume Summary: {self.resume_text[:1000]}
Job Description: {self.jd_text[:500] if self.jd_text else "General interview"}

## CAREER INSIGHTS
{self._format_career_insights() if self.career_insights else "Not available"}

## PREVIOUS QUESTIONS (do not repeat)
{chr(10).join(q.get("question", "") for q in previous_questions[-3:])}

## RESPONSE PATTERNS OBSERVED
Concerns: {response_analysis.get("concerns", [])}
Strengths: {response_analysis.get("strengths", [])}

## INSTRUCTIONS
1. Generate a question that aligns with the strategy
2. Make it conversational, not interrogative
3. Reference specific details from their resume if relevant
4. For verification: Challenge their claims gently but directly
5. For depth probe: Dig into specifics they glossed over

## OUTPUT (JSON only):
{{"question": "Your natural, probing question", "topic": "area being assessed", "expected_elements": ["element1", "element2", "element3"], "difficulty": "easy|medium|hard", "follow_up_hints": ["hint1", "hint2"], "reasoning": "Why this question is valuable now"}}"""

    def _build_evaluation_prompt(
        self,
        question: Dict,
        response: str,
        context: Dict,
        audio_analytics: Optional[Dict]
    ) -> str:
        """Build prompt for response evaluation."""
        audio_context = ""
        if audio_analytics:
            audio_context = f"""
## VOICE ANALYSIS
- Confidence: {audio_analytics.get('confidence_score', 'N/A')}/100
- Speech Ratio: {audio_analytics.get('speech_ratio', 0)*100:.0f}%
- Volume Stability: {audio_analytics.get('volume_stability', 0)*100:.0f}%"""

        return f"""Evaluate this interview response like an experienced hiring manager.

## THE QUESTION
{question.get("question", "")}
Type: {question.get("question_type", "")}
Looking for: {question.get("expected_elements", [])}

## CANDIDATE'S RESPONSE
{response}

## RELEVANT RESUME CLAIMS
{context.get("resume_claims", [])}

## CAREER INSIGHTS
{context.get("career_insights", {})}
{audio_context}

## EVALUATION CRITERIA

### Technical/Content (0-10)
- Did they answer what was asked?
- Were examples specific and believable?
- Does it align with their resume claims?

### Communication (0-10)
- Clear and well-organized?
- Right level of detail?
- Easy to follow?

### Analytical (0-10)
- Logical reasoning shown?
- Considered trade-offs?
- Good judgment?

### STAR Method (0-10) [for behavioral]
- Situation clear?
- Task/responsibility defined?
- Actions specific (I vs We)?
- Results quantified?

### Authenticity (0-10)
- Genuine vs rehearsed?
- Self-aware?
- Honest about limitations?

## RED FLAGS TO CHECK
- Vague answers
- Can't explain claimed skills
- "We did" without personal role
- Inconsistent with resume
- Defensive/evasive

## OUTPUT (JSON only):
{{"scores": {{"content": 7, "communication": 8, "analytical": 7, "technical_depth": 7, "star_method": 6, "authenticity": 8}}, "overall_score": 7.2, "strengths": ["strength1", "strength2"], "weaknesses": ["area1", "area2"], "missing_elements": [], "feedback": "Brief 2-sentence feedback", "red_flags": [], "follow_up_recommended": false, "follow_up_reason": "", "verification_notes": ""}}"""

    def _build_follow_up_prompt(
        self,
        original_question: Dict,
        response: str,
        evaluation: Dict,
        follow_up_type: str
    ) -> str:
        """Build prompt for follow-up question generation."""
        type_instructions = {
            "clarification": "Ask for clarification on unclear points",
            "depth_probe": "Dig deeper into specifics - ask for exact numbers, names, or details",
            "verification": "Gently challenge their claims or ask for evidence",
            "structure": "Ask them to walk through it step by step using STAR method",
            "expansion": "Ask about impact, lessons learned, or how it applies elsewhere"
        }

        return f"""Generate a natural follow-up question.

## ORIGINAL QUESTION
{original_question.get("question", "")}

## THEIR RESPONSE
{response}

## EVALUATION SUMMARY
- Overall: {evaluation.get("overall_score", 5)}/10
- Missing: {evaluation.get("missing_elements", [])}
- Concerns: {evaluation.get("weaknesses", [])}
- Red Flags: {evaluation.get("red_flags", [])}

## FOLLOW-UP TYPE: {follow_up_type}
Instruction: {type_instructions.get(follow_up_type, "Ask a relevant follow-up")}

## EXAMPLES OF GOOD FOLLOW-UPS
Clarification: "I want to make sure I understand - you said X, but did you mean Y?"
Depth probe: "You mentioned leading the project - what was the team size and your specific responsibilities?"
Verification: "That's impressive. Walk me through specifically how you achieved that result."
Structure: "Can you break that down for me? What was the situation, your role, and the outcome?"
Expansion: "What did you take away from that experience?"

## OUTPUT (JSON only):
{{"follow_up": "Your natural follow-up question", "rationale": "Why this follow-up is valuable"}}"""

    def _format_career_insights(self) -> str:
        """Format career insights for prompts."""
        if not self.career_insights:
            return "Not available"

        return f"""
- Total Experience: {self.career_insights.total_experience_years} years
- Average Tenure: {self.career_insights.average_tenure_months} months
- Job Hopping Risk: {self.career_insights.job_hopping_risk}
- Industries: {', '.join(self.career_insights.industries_worked[:3])}
- Employment Gaps: {len(self.career_insights.employment_gaps)}
- Red Flags: {len(self.career_insights.red_flags)}
- Trajectory: {self.career_insights.trajectory}"""

    async def _generate_introduction(self, resume_analysis: Optional[Dict]) -> Dict:
        """Generate personalized introduction."""
        prompt = self.prompts.get("interview_initialization_prompt", "").format(
            resume_text=self.resume_text[:1500],
            job_description=self.jd_text[:500] if self.jd_text else "General technical interview",
            resume_analysis=str(resume_analysis or {})[:500],
            num_questions=self.num_questions,
            interview_type=self.interview_type,
            focus_areas=self._get_focus_areas(),
            difficulty=self.difficulty
        )

        try:
            result = await self.llm.generate_json(
                prompt=prompt,
                system_prompt=self._get_system_prompt(),
                temperature=0.7
            )
            return result
        except Exception as e:
            logger.error(f"Introduction generation failed: {e}")
            return {"intro_message": self._get_fallback_intro()}

    def _get_focus_areas(self) -> str:
        """Get focus areas based on career analytics."""
        areas = []

        if self.career_insights:
            if self.career_insights.job_hopping_risk in ["medium", "high"]:
                areas.append("Job stability and commitment")
            if self.career_insights.employment_gaps:
                areas.append("Career gaps explanation")
            if self.career_insights.is_industry_hopper:
                areas.append("Industry transitions")
            if self.career_insights.red_flags:
                areas.append("Resume verification")

        return ", ".join(areas) if areas else "Comprehensive assessment"

    def _get_analytics_summary(self) -> Dict:
        """Get summary of career analytics for frontend."""
        if not self.career_insights:
            return {}

        return {
            "total_experience_years": self.career_insights.total_experience_years,
            "job_hopping_risk": self.career_insights.job_hopping_risk,
            "employment_gaps_count": len(self.career_insights.employment_gaps),
            "red_flags_count": len(self.career_insights.red_flags),
            "smart_questions_generated": len(self.smart_questions)
        }

    def _get_system_prompt(self) -> str:
        """Get the system prompt."""
        return self.prompts.get("interviewer_system_prompt", "")

    def _get_fallback_intro(self) -> str:
        """Get fallback introduction."""
        return f"Hello! Thanks for joining this {self.interview_type} interview. I'll be asking you {self.num_questions} questions to learn about your background and experience. Take your time with each answer, and feel free to ask for clarification if needed. Let's get started!"

    def _get_fallback_follow_up(self, follow_up_type: str) -> Dict:
        """Get fallback follow-up question."""
        fallbacks = {
            "clarification": "Could you clarify what you meant by that?",
            "depth_probe": "Can you give me a specific example?",
            "verification": "Walk me through exactly how you achieved that.",
            "structure": "Can you break that down step by step?",
            "expansion": "What did you learn from that experience?"
        }

        return {
            "question": fallbacks.get(follow_up_type, "Could you elaborate on that?"),
            "question_type": "follow_up",
            "follow_up_type": follow_up_type,
            "is_follow_up": True
        }

    def _get_fallback_question_dict(self, question_number: int) -> Dict:
        """Get fallback question as dict."""
        questions = [
            ("Tell me about yourself and your background.", "introduction"),
            ("What are your greatest strengths?", "strengths"),
            ("Describe a challenging project you've worked on.", "challenges"),
            ("Why are you interested in this role?", "motivation"),
            ("Where do you see yourself in the next few years?", "career_goals"),
            ("Tell me about a time you worked effectively in a team.", "teamwork"),
            ("How do you handle tight deadlines?", "stress_management"),
            ("What's a skill you're currently improving?", "growth"),
        ]

        idx = min(question_number, len(questions) - 1)
        q, topic = questions[idx]

        return {
            "question": q,
            "question_type": "behavioral",
            "topic": topic,
            "expected_elements": [],
            "difficulty": self.difficulty,
            "follow_up_hints": []
        }

    def _get_fallback_question(self, question_number: int) -> str:
        """Get fallback question text."""
        return self._get_fallback_question_dict(question_number)["question"]

    def _validate_evaluation(self, result: Dict) -> Dict:
        """Validate and normalize evaluation result."""
        scores = result.get("scores", {})
        validated_scores = {}

        for key in ["content", "communication", "analytical", "technical_depth", "star_method", "authenticity"]:
            try:
                validated_scores[key] = min(10, max(0, float(scores.get(key, 5))))
            except (ValueError, TypeError):
                validated_scores[key] = 5

        if validated_scores:
            default_overall = sum(validated_scores.values()) / len(validated_scores)
        else:
            default_overall = 5

        return {
            "scores": validated_scores,
            "overall_score": result.get("overall_score", default_overall),
            "strengths": result.get("strengths", []),
            "weaknesses": result.get("weaknesses", result.get("improvements", [])),
            "missing_elements": result.get("missing_elements", []),
            "feedback": result.get("feedback", "Thank you for your response."),
            "red_flags": result.get("red_flags", []),
            "follow_up_recommended": result.get("follow_up_recommended", False),
            "follow_up_reason": result.get("follow_up_reason", ""),
            "verification_notes": result.get("verification_notes", "")
        }

    def _get_default_evaluation(self) -> Dict:
        """Get default evaluation on failure."""
        return {
            "scores": {
                "content": 5,
                "communication": 5,
                "analytical": 5,
                "technical_depth": 5,
                "star_method": 5,
                "authenticity": 5
            },
            "overall_score": 5,
            "strengths": ["Response provided"],
            "weaknesses": ["Evaluation unavailable"],
            "feedback": "Thank you for your response.",
            "red_flags": [],
            "follow_up_recommended": False
        }
