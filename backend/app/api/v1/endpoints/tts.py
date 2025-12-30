"""
Text-to-Speech and Speech-to-Text Endpoints
"""

from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from typing import Optional
import io
import logging

from app.schemas.tts import (
    TTSRequest,
    TTSResponse,
    STTResponse,
    VoiceListResponse
)
from app.services.tts.service import TTSService

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/synthesize")
async def synthesize_speech(request: TTSRequest):
    """
    Convert text to speech.

    Returns audio file in the requested format.
    """
    try:
        tts_service = TTSService()

        audio_bytes = await tts_service.synthesize(
            text=request.text,
            voice=request.voice,
            provider=request.provider,
            speed=request.speed
        )

        # Determine content type based on format
        content_type_map = {
            "mp3": "audio/mpeg",
            "wav": "audio/wav",
            "ogg": "audio/ogg",
            "opus": "audio/opus"
        }
        content_type = content_type_map.get(request.output_format, "audio/mpeg")

        return StreamingResponse(
            io.BytesIO(audio_bytes),
            media_type=content_type,
            headers={
                "Content-Disposition": f"attachment; filename=speech.{request.output_format}"
            }
        )

    except Exception as e:
        logger.error(f"Error synthesizing speech: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error synthesizing speech: {str(e)}"
        )


@router.post("/synthesize/url", response_model=TTSResponse)
async def synthesize_speech_url(request: TTSRequest):
    """
    Convert text to speech and return a URL to the audio file.
    Useful for frontend playback.
    """
    try:
        tts_service = TTSService()

        audio_url = await tts_service.synthesize_to_url(
            text=request.text,
            voice=request.voice,
            provider=request.provider,
            speed=request.speed
        )

        return TTSResponse(
            audio_url=audio_url,
            duration_seconds=len(request.text) / 15  # Rough estimate
        )

    except Exception as e:
        logger.error(f"Error synthesizing speech: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error synthesizing speech: {str(e)}"
        )


@router.post("/transcribe", response_model=STTResponse)
async def transcribe_audio(audio: UploadFile = File(...)):
    """
    Transcribe audio to text.

    Supports: mp3, wav, m4a, webm, ogg formats.
    """
    try:
        audio_bytes = await audio.read()

        tts_service = TTSService()

        transcription = await tts_service.transcribe_audio(
            audio_data=audio_bytes,
            filename=audio.filename
        )

        return STTResponse(
            text=transcription,
            confidence=0.95  # Placeholder - actual confidence varies by provider
        )

    except Exception as e:
        logger.error(f"Error transcribing audio: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error transcribing audio: {str(e)}"
        )


@router.get("/voices", response_model=VoiceListResponse)
async def list_available_voices(provider: Optional[str] = None):
    """
    List available voices for TTS.

    Optionally filter by provider.
    """
    try:
        tts_service = TTSService()

        voices = await tts_service.list_voices(provider=provider)

        return VoiceListResponse(
            voices=voices
        )

    except Exception as e:
        logger.error(f"Error listing voices: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error listing voices: {str(e)}"
        )


@router.get("/providers")
async def list_providers():
    """
    List available TTS/STT providers and their status.
    """
    tts_service = TTSService()

    providers = await tts_service.get_provider_status()

    return {"providers": providers}
