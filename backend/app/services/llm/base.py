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
        max_tokens: int = 4096
    ) -> str:
        """Generate response with conversation history"""
        pass

    def parse_json_response(self, response: str) -> Dict:
        """Parse JSON from LLM response"""
        # Try to extract JSON from response
        try:
            # First try direct parsing
            return json.loads(response)
        except json.JSONDecodeError:
            # Try to find JSON block
            start_markers = ['{', '[']
            end_markers = ['}', ']']

            for start, end in zip(start_markers, end_markers):
                start_idx = response.find(start)
                if start_idx != -1:
                    # Find matching end
                    depth = 0
                    for i, char in enumerate(response[start_idx:]):
                        if char == start:
                            depth += 1
                        elif char == end:
                            depth -= 1
                            if depth == 0:
                                json_str = response[start_idx:start_idx + i + 1]
                                try:
                                    return json.loads(json_str)
                                except json.JSONDecodeError:
                                    continue

            # If all else fails, return empty dict
            logger.warning("Could not parse JSON from LLM response")
            return {}
