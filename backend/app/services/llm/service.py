"""
LLM Service - Unified interface for all LLM providers
"""

from typing import Optional, Dict, List, Any
import logging

from app.core.config import model_config
from app.services.llm.base import BaseLLMProvider
from app.services.llm.providers import (
    OpenAIProvider,
    ClaudeProvider,
    GeminiProvider,
    OllamaProvider,
    GroqProvider
)

logger = logging.getLogger(__name__)


class LLMService:
    """
    Unified LLM service that supports multiple providers.

    Usage:
        service = LLMService()  # Uses default provider from config
        service = LLMService(provider="claude")  # Use specific provider

        response = await service.generate("Your prompt here")
    """

    PROVIDERS = {
        "openai": OpenAIProvider,
        "claude": ClaudeProvider,
        "gemini": GeminiProvider,
        "ollama": OllamaProvider,
        "groq": GroqProvider
    }

    def __init__(self, provider: Optional[str] = None, task: Optional[str] = None):
        """
        Initialize LLM service.

        Args:
            provider: Specific provider to use (overrides config)
            task: Task name to check for task-specific model config
        """
        self.config = model_config.llm

        # Determine which provider to use
        if provider:
            provider_name = provider
        elif task:
            # Check for task-specific model
            task_model = self.config.get("task_models", {}).get(task)
            provider_name = task_model or self.config.get("default", "openai")
        else:
            provider_name = self.config.get("default", "openai")

        # Get provider configuration
        provider_config = self.config.get("providers", {}).get(provider_name, {})

        # Initialize provider
        self.provider_name = provider_name
        self.provider = self._create_provider(provider_name, provider_config)

        # Store settings
        self.temperature = provider_config.get("temperature", 0.7)
        self.max_tokens = provider_config.get("max_tokens", 4096)

    def _create_provider(self, name: str, config: Dict) -> BaseLLMProvider:
        """Create provider instance"""
        provider_class = self.PROVIDERS.get(name)
        if not provider_class:
            raise ValueError(f"Unknown provider: {name}")

        # Provider-specific initialization
        if name == "openai":
            return OpenAIProvider(
                model=config.get("model", "gpt-4o"),
                base_url=config.get("base_url")
            )
        elif name == "claude":
            return ClaudeProvider(
                model=config.get("model", "claude-3-5-sonnet-20241022")
            )
        elif name == "gemini":
            return GeminiProvider(
                model=config.get("model", "gemini-2.0-flash")
            )
        elif name == "ollama":
            return OllamaProvider(
                model=config.get("model", "llama3.1"),
                base_url=config.get("base_url", "http://localhost:11434")
            )
        elif name == "groq":
            return GroqProvider(
                model=config.get("model", "llama-3.1-70b-versatile")
            )
        else:
            raise ValueError(f"Unknown provider: {name}")

    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        json_mode: bool = False
    ) -> str:
        """
        Generate a response from the LLM.

        Args:
            prompt: The user prompt
            system_prompt: Optional system prompt for context
            temperature: Override default temperature
            max_tokens: Override default max tokens
            json_mode: Request JSON output (if supported)

        Returns:
            Generated text response
        """
        try:
            response = await self.provider.generate(
                prompt=prompt,
                system_prompt=system_prompt,
                temperature=temperature or self.temperature,
                max_tokens=max_tokens or self.max_tokens,
                json_mode=json_mode
            )
            return response
        except Exception as e:
            logger.error(f"LLM generation error ({self.provider_name}): {str(e)}")
            raise

    async def generate_with_history(
        self,
        messages: List[Dict[str, str]],
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        json_mode: bool = False
    ) -> str:
        """
        Generate response with conversation history.

        Args:
            messages: List of message dicts with 'role' and 'content'
            temperature: Override default temperature
            max_tokens: Override default max tokens
            json_mode: Request JSON output (if supported)

        Returns:
            Generated text response
        """
        try:
            response = await self.provider.generate_with_history(
                messages=messages,
                temperature=temperature or self.temperature,
                max_tokens=max_tokens or self.max_tokens,
                json_mode=json_mode
            )
            return response
        except Exception as e:
            logger.error(f"LLM generation error ({self.provider_name}): {str(e)}")
            raise

    async def generate_json(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Generate and parse JSON response.

        Args:
            prompt: The prompt (should request JSON output)
            system_prompt: Optional system prompt
            temperature: Override default temperature

        Returns:
            Parsed JSON as dict
        """
        response = await self.generate(
            prompt=prompt,
            system_prompt=system_prompt,
            temperature=temperature,
            json_mode=True
        )
        return self.provider.parse_json_response(response)

    def switch_provider(self, provider: str):
        """
        Switch to a different provider.

        Args:
            provider: Name of the provider to switch to
        """
        provider_config = self.config.get("providers", {}).get(provider, {})
        self.provider_name = provider
        self.provider = self._create_provider(provider, provider_config)
        self.temperature = provider_config.get("temperature", 0.7)
        self.max_tokens = provider_config.get("max_tokens", 4096)

    @classmethod
    def get_available_providers(cls) -> List[str]:
        """Get list of available provider names"""
        return list(cls.PROVIDERS.keys())
