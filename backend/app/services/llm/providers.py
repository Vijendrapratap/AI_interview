"""
LLM Provider Implementations
Supports: OpenAI, Claude, Gemini, Ollama, Groq
"""

from typing import Optional, Dict, List
import logging
import httpx

from app.services.llm.base import BaseLLMProvider
from app.core.config import get_api_key

logger = logging.getLogger(__name__)


class OpenAIProvider(BaseLLMProvider):
    """OpenAI GPT provider"""

    def __init__(self, model: str = "gpt-4o", base_url: Optional[str] = None):
        self.model = model
        self.base_url = base_url or "https://api.openai.com/v1"
        self.api_key = get_api_key("OPENAI_API_KEY")
        if not self.api_key:
            raise ValueError("OpenAI API key not found. Please set OPENAI_API_KEY.")

    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
        json_mode: bool = False
    ) -> str:
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        return await self.generate_with_history(
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            json_mode=json_mode
        )

    async def generate_with_history(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 4096,
        json_mode: bool = False
    ) -> str:
        async with httpx.AsyncClient() as client:
            payload = {
                "model": self.model,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens
            }

            if json_mode:
                payload["response_format"] = {"type": "json_object"}

            response = await client.post(
                f"{self.base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                },
                json=payload,
                timeout=60.0
            )
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"]


class ClaudeProvider(BaseLLMProvider):
    """Anthropic Claude provider"""

    def __init__(self, model: str = "claude-3-5-sonnet-20241022"):
        self.model = model
        self.api_key = get_api_key("ANTHROPIC_API_KEY")
        if not self.api_key:
            raise ValueError("Anthropic API key not found. Please set ANTHROPIC_API_KEY.")
        self.base_url = "https://api.anthropic.com/v1"

    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
        json_mode: bool = False
    ) -> str:
        messages = [{"role": "user", "content": prompt}]

        return await self._call_api(
            messages=messages,
            system=system_prompt,
            temperature=temperature,
            max_tokens=max_tokens,
            json_mode=json_mode
        )

    async def generate_with_history(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 4096,
        json_mode: bool = False
    ) -> str:
        # Extract system message if present
        system = None
        claude_messages = []

        for msg in messages:
            if msg["role"] == "system":
                system = msg["content"]
            else:
                claude_messages.append(msg)

        return await self._call_api(
            messages=claude_messages,
            system=system,
            temperature=temperature,
            max_tokens=max_tokens,
            json_mode=json_mode
        )

    async def _call_api(
        self,
        messages: List[Dict],
        system: Optional[str],
        temperature: float,
        max_tokens: int,
        json_mode: bool = False
    ) -> str:
        if json_mode:
            messages.insert(0, {"role": "user", "content": "Only return a valid JSON object."})
        async with httpx.AsyncClient() as client:
            payload = {
                "model": self.model,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens
            }

            if system:
                payload["system"] = system

            response = await client.post(
                f"{self.base_url}/messages",
                headers={
                    "x-api-key": self.api_key,
                    "anthropic-version": "2023-06-01",
                    "Content-Type": "application/json"
                },
                json=payload,
                timeout=60.0
            )
            response.raise_for_status()
            data = response.json()
            return data["content"][0]["text"]


class GeminiProvider(BaseLLMProvider):
    """Google Gemini provider"""

    def __init__(self, model: str = "gemini-2.0-flash"):
        self.model = model
        self.api_key = get_api_key("GOOGLE_API_KEY")
        if not self.api_key:
            raise ValueError("Google API key not found. Please set GOOGLE_API_KEY.")
        self.base_url = "https://generativelanguage.googleapis.com/v1beta"

    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
        json_mode: bool = False
    ) -> str:
        full_prompt = prompt
        if system_prompt:
            full_prompt = f"{system_prompt}\n\n{prompt}"
        if json_mode:
            full_prompt = f"Only return a valid JSON object.\n\n{full_prompt}"

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/models/{self.model}:generateContent",
                headers={
                    "x-goog-api-key": self.api_key,
                    "Content-Type": "application/json"
                },
                json={
                    "contents": [{"parts": [{"text": full_prompt}]}],
                    "generationConfig": {
                        "temperature": temperature,
                        "maxOutputTokens": max_tokens
                    }
                },
                timeout=60.0
            )
            response.raise_for_status()
            data = response.json()
            return data["candidates"][0]["content"]["parts"][0]["text"]

    async def generate_with_history(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 4096,
        json_mode: bool = False
    ) -> str:
        # Convert to Gemini format
        contents = []
        if json_mode:
            messages.insert(0, {"role": "user", "content": "Only return a valid JSON object."})
        for msg in messages:
            role = "user" if msg["role"] in ["user", "system"] else "model"
            contents.append({
                "role": role,
                "parts": [{"text": msg["content"]}]
            })

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/models/{self.model}:generateContent",
                headers={
                    "x-goog-api-key": self.api_key,
                    "Content-Type": "application/json"
                },
                json={
                    "contents": contents,
                    "generationConfig": {
                        "temperature": temperature,
                        "maxOutputTokens": max_tokens
                    }
                },
                timeout=60.0
            )
            response.raise_for_status()
            data = response.json()
            return data["candidates"][0]["content"]["parts"][0]["text"]


class OllamaProvider(BaseLLMProvider):
    """Ollama local provider"""

    def __init__(self, model: str = "llama3.1", base_url: str = "http://localhost:11434"):
        self.model = model
        self.base_url = base_url

    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
        json_mode: bool = False
    ) -> str:
        async with httpx.AsyncClient() as client:
            payload = {
                "model": self.model,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": temperature,
                    "num_predict": max_tokens
                }
            }

            if system_prompt:
                payload["system"] = system_prompt

            if json_mode:
                payload["format"] = "json"

            response = await client.post(
                f"{self.base_url}/api/generate",
                json=payload,
                timeout=120.0
            )
            response.raise_for_status()
            data = response.json()
            return data["response"]

    async def generate_with_history(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 4096
    ) -> str:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/api/chat",
                json={
                    "model": self.model,
                    "messages": messages,
                    "stream": False,
                    "options": {
                        "temperature": temperature,
                        "num_predict": max_tokens
                    }
                },
                timeout=120.0
            )
            response.raise_for_status()
            data = response.json()
            return data["message"]["content"]


class GroqProvider(BaseLLMProvider):
    """Groq provider (fast inference)"""

    def __init__(self, model: str = "llama-3.1-70b-versatile"):
        self.model = model
        self.api_key = get_api_key("GROQ_API_KEY")
        if not self.api_key:
            raise ValueError("Groq API key not found. Please set GROQ_API_KEY.")
        self.base_url = "https://api.groq.com/openai/v1"

    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
        json_mode: bool = False
    ) -> str:
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        return await self.generate_with_history(
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            json_mode=json_mode
        )

    async def generate_with_history(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 4096,
        json_mode: bool = False
    ) -> str:
        async with httpx.AsyncClient() as client:
            payload = {
                "model": self.model,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens
            }

            if json_mode:
                payload["response_format"] = {"type": "json_object"}

            response = await client.post(
                f"{self.base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                },
                json=payload,
                timeout=30.0
            )
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"]

class OpenRouterProvider(OpenAIProvider):
    """OpenRouter provider (OpenAI compatible)"""
    
    def __init__(self, model: str = "openai/gpt-4o", base_url: str = "https://openrouter.ai/api/v1"):
        self.model = model
        self.base_url = base_url
        self.api_key = get_api_key("OPENROUTER_API_KEY")
        if not self.api_key:
            raise ValueError("OpenRouter API key not found. Please set OPENROUTER_API_KEY.")
