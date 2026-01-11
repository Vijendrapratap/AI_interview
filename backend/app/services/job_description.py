import logging
from typing import Dict, Optional, List
from app.services.llm import LLMService

logger = logging.getLogger(__name__)

class JDGeneratorService:
    """
    AI Service to generate optimized Job Descriptions.
    """
    
    def __init__(self):
        self.llm = LLMService(task="jd_generation")
        # Reuse existing config or add new prompts later
        # For now we'll define a simple prompt inline or assume it's in config
    
    async def generate_jd(self, role: str, industry: str, seniority: str, skills: List[str]) -> Dict:
        """
        Generate a structured JD based on inputs.
        """
        prompt = f"""
        You are an expert HR recruitment specialist. Create a comprehensive, engaging, and professional Job Description for the following role:
        
        Role Title: {role}
        Industry: {industry}
        Seniority Level: {seniority}
        Key Skills Required: {', '.join(skills)}
        
        The JD should include:
        1. Engaging specific Role Summary
        2. Key Responsibilities (bullet points)
        3. Required Qualifications & Skills
        4. "Nice to Have" skills
        5. Why join us (Culture/Benefits placeholders)
        
        Output as JSON:
        {{
            "title": "...",
            "summary": "...",
            "responsibilities": ["...", "..."],
            "required_skills": ["...", "..."],
            "preferred_skills": ["...", "..."],
            "benefits": ["...", "..."]
        }}
        """
        
        try:
            # Using generate_json from LLMService
            result = await self.llm.generate_json(
                prompt=prompt,
                system_prompt="You are a helpful HR assistant.",
                temperature=0.7
            )
            return result
        except Exception as e:
            logger.error(f"JD Generation failed: {str(e)}")
            raise

jd_generator = JDGeneratorService()
