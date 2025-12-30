"""
Base LLM Service - Pluggable model provider support
"""

from abc import ABC, abstractmethod
from typing import Optional, Dict, Any, List
import json
import logging

logger = logging.getLogger(__name__)


class BaseLLMProvider(ABC):
    """Abstract base class for LLM providers"""

    @abstractmethod
    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
        json_mode: bool = False
    ) -> str:
        """Generate a response from the LLM"""
        pass

    @abstractmethod
    async def generate_with_history(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 4096,
        json_mode: bool = False
    ) -> str:
        """Generate response with conversation history"""
        pass

    def parse_json_response(self, response: str) -> Dict:
        """Parse JSON from LLM response"""
        import re

        if not response or not response.strip():
            logger.error("Empty response from LLM")
            raise ValueError("Empty response from LLM")

        original_response = response

        # Strip markdown code blocks if present
        # Match ```json ... ``` or ``` ... ```
        code_block_pattern = r'```(?:json)?\s*([\s\S]*?)\s*```'
        code_match = re.search(code_block_pattern, response)
        if code_match:
            response = code_match.group(1).strip()
            logger.debug(f"Extracted from code block: {response[:100]}...")

        # Try to extract JSON from response
        try:
            # First try direct parsing
            result = json.loads(response)
            logger.debug(f"Successfully parsed JSON directly")
            return result
        except json.JSONDecodeError as e:
            logger.debug(f"Direct JSON parse failed: {e}")

            # Try to find JSON block
            start_markers = ['{', '[']
            end_markers = ['}', ']']

            for start, end in zip(start_markers, end_markers):
                start_idx = response.find(start)
                if start_idx != -1:
                    # Find matching end (search from the end)
                    end_idx = response.rfind(end)
                    if end_idx != -1 and end_idx > start_idx:
                        json_str = response[start_idx:end_idx + 1]
                        try:
                            result = json.loads(json_str)
                            logger.debug(f"Successfully parsed JSON from substring")
                            return result
                        except json.JSONDecodeError:
                            # Try with balanced bracket matching
                            depth = 0
                            for i, char in enumerate(response[start_idx:]):
                                if char == start:
                                    depth += 1
                                elif char == end:
                                    depth -= 1
                                    if depth == 0:
                                        json_str = response[start_idx:start_idx + i + 1]
                                        try:
                                            result = json.loads(json_str)
                                            logger.debug(f"Successfully parsed JSON with bracket matching")
                                            return result
                                        except json.JSONDecodeError:
                                            break

            # If all else fails, raise an error with details
            logger.error(f"Could not parse JSON from LLM response. First 500 chars: {original_response[:500]}")
            raise ValueError(f"Failed to parse JSON from LLM response: {original_response[:100]}...")
