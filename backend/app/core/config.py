"""
Application Configuration
Central configuration management with environment variable support
"""

import os
from pathlib import Path
from typing import Optional
from pydantic_settings import BaseSettings
from pydantic import Field
import yaml


class Settings(BaseSettings):
    """Application settings with environment variable support"""

    # Application
    APP_NAME: str = "Resume Analyzer & Interview Prep"
    APP_VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    DEBUG: bool = Field(default=False, env="DEBUG")

    # Server
    HOST: str = Field(default="0.0.0.0", env="HOST")
    PORT: int = Field(default=8000, env="PORT")
    
    # Security
    SECRET_KEY: str = Field(default="09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7", env="SECRET_KEY")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8 # 8 days

    # Paths
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent.parent
    CONFIG_DIR: Path = BASE_DIR / "config"
    UPLOAD_DIR: Path = BASE_DIR / "backend" / "uploads"

    # API Keys (loaded from environment)
    OPENAI_API_KEY: Optional[str] = Field(default=None, env="OPENAI_API_KEY")
    ANTHROPIC_API_KEY: Optional[str] = Field(default=None, env="ANTHROPIC_API_KEY")
    GOOGLE_API_KEY: Optional[str] = Field(default=None, env="GOOGLE_API_KEY")
    ELEVENLABS_API_KEY: Optional[str] = Field(default=None, env="ELEVENLABS_API_KEY")
    GROQ_API_KEY: Optional[str] = Field(default=None, env="GROQ_API_KEY")
    AZURE_SPEECH_KEY: Optional[str] = Field(default=None, env="AZURE_SPEECH_KEY")

    # Database
    DATABASE_URL: str = Field(
        default="sqlite:///./resume_analyzer.db",
        env="DATABASE_URL"
    )

    # Redis (optional, for caching)
    REDIS_URL: Optional[str] = Field(default=None, env="REDIS_URL")

    # CORS
    CORS_ORIGINS: list = ["http://localhost:3000", "http://localhost:5173"]

    # File Upload
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10MB
    ALLOWED_EXTENSIONS: list = [".pdf", ".docx", ".doc", ".txt"]

    # Session
    SESSION_EXPIRE_MINUTES: int = 60

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


class ModelConfig:
    """Load model configurations from YAML files"""

    def __init__(self, config_dir: Path):
        self.config_dir = config_dir
        self._llm_config = None
        self._tts_config = None
        self._prompts = {}

    @property
    def llm(self) -> dict:
        """Load LLM configuration"""
        if self._llm_config is None:
            config_path = self.config_dir / "models" / "llm_config.yaml"
            with open(config_path, 'r') as f:
                self._llm_config = yaml.safe_load(f)
        return self._llm_config

    @property
    def tts(self) -> dict:
        """Load TTS configuration"""
        if self._tts_config is None:
            config_path = self.config_dir / "models" / "tts_config.yaml"
            with open(config_path, 'r') as f:
                self._tts_config = yaml.safe_load(f)
        return self._tts_config

    def get_prompt(self, prompt_file: str) -> dict:
        """Load prompts from YAML file"""
        if prompt_file not in self._prompts:
            prompt_path = self.config_dir / "prompts" / f"{prompt_file}.yaml"
            with open(prompt_path, 'r') as f:
                self._prompts[prompt_file] = yaml.safe_load(f)
        return self._prompts[prompt_file]

    def get_active_llm_provider(self) -> dict:
        """Get the currently active LLM provider configuration"""
        default_provider = self.llm.get("default", "openai")
        provider_config = self.llm["providers"].get(default_provider, {})
        return {
            "provider": default_provider,
            **provider_config
        }

    def get_active_tts_provider(self) -> dict:
        """Get the currently active TTS provider configuration"""
        default_provider = self.tts.get("default", "openai")
        provider_config = self.tts["providers"].get(default_provider, {})
        return {
            "provider": default_provider,
            **provider_config
        }

    def reload(self):
        """Reload all configurations from files"""
        self._llm_config = None
        self._tts_config = None
        self._prompts = {}


# Global instances
settings = Settings()
model_config = ModelConfig(settings.CONFIG_DIR)


def get_api_key(key_name: str) -> Optional[str]:
    """Get API key from environment or settings"""
    # First try environment variable
    key = os.getenv(key_name)
    if key:
        return key

    # Then try settings
    return getattr(settings, key_name, None)
