"""
TTS/STT-related Pydantic schemas
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum


class TTSProvider(str, Enum):
    """Available TTS providers"""

    GOOGLE = "google"
    OPENAI = "openai"
    ELEVENLABS = "elevenlabs"
    EDGE = "edge"
    KOKORO = "kokoro"
    PERSONAPLEX = "personaplex"



class AudioFormat(str, Enum):
    """Available audio formats"""
    MP3 = "mp3"
    WAV = "wav"
    OGG = "ogg"
    OPUS = "opus"


class TTSRequest(BaseModel):
    """Request for text-to-speech conversion"""
    text: str = Field(..., min_length=1, max_length=5000)
    voice: Optional[str] = Field(None, description="Voice ID or name")
    provider: Optional[TTSProvider] = Field(None, description="TTS provider to use")
    speed: float = Field(default=1.0, ge=0.5, le=2.0)
    output_format: AudioFormat = Field(default=AudioFormat.MP3)


class TTSResponse(BaseModel):
    """Response with audio URL"""
    audio_url: str
    duration_seconds: Optional[float] = None


class STTResponse(BaseModel):
    """Response from speech-to-text"""
    text: str
    confidence: Optional[float] = Field(None, ge=0, le=1)
    language: Optional[str] = None


class VoiceInfo(BaseModel):
    """Information about a voice"""
    id: str
    name: str
    provider: str
    language: str = "en"
    gender: Optional[str] = None
    description: Optional[str] = None
    preview_url: Optional[str] = None


class VoiceListResponse(BaseModel):
    """List of available voices"""
    voices: List[VoiceInfo]


class ProviderStatus(BaseModel):
    """Status of a TTS/STT provider"""
    name: str
    available: bool
    api_key_configured: bool
    features: List[str] = Field(default_factory=list)
