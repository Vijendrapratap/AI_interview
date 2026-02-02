"""
TTS/STT Service - Text-to-Speech and Speech-to-Text

Supports multiple providers:
- TTS: OpenAI, ElevenLabs, Google (gTTS), Edge TTS, Kokoro
- STT: OpenAI Whisper, Faster-Whisper (recommended), Vosk
"""

from typing import Optional, Dict, List
import logging
import httpx
import io
import uuid
from pathlib import Path

from app.core.config import model_config, settings, get_api_key

logger = logging.getLogger(__name__)

# Global model caches for performance
_KOKORO_PIPELINE = None
_FASTER_WHISPER_MODEL = None
_VOSK_MODEL = None


class TTSService:
    """
    Text-to-Speech and Speech-to-Text service.

    Supports multiple providers:
    - ElevenLabs (premium quality)
    - OpenAI TTS
    - Google TTS (free)
    - Edge TTS (free)
    """

    def __init__(self):
        self.config = model_config.tts

    async def synthesize(
        self,
        text: str,
        voice: Optional[str] = None,
        provider: Optional[str] = None,
        speed: float = 1.0
    ) -> bytes:
        """
        Convert text to speech.

        Args:
            text: Text to synthesize
            voice: Voice ID or name
            provider: TTS provider to use
            speed: Speech speed multiplier

        Returns:
            Audio bytes
        """
        provider = provider or self.config.get("default", "openai")
        provider_config = self.config.get("providers", {}).get(provider, {})

        if provider == "openai":
            return await self._synthesize_openai(text, voice, provider_config, speed)
        elif provider == "elevenlabs":
            return await self._synthesize_elevenlabs(text, voice, provider_config)
        elif provider == "google":
            return await self._synthesize_google(text, provider_config)
        elif provider == "edge":
            return await self._synthesize_edge(text, voice, provider_config)
        elif provider == "kokoro":
            return await self._synthesize_kokoro(text, voice, provider_config, speed)
        elif provider == "personaplex":
            return await self._synthesize_personaplex(text, voice, provider_config, speed)
        else:
            raise ValueError(f"Unknown TTS provider: {provider}")

    async def synthesize_to_url(
        self,
        text: str,
        voice: Optional[str] = None,
        provider: Optional[str] = None,
        speed: float = 1.0
    ) -> str:
        """
        Synthesize speech and save to file, return URL.

        Args:
            text: Text to synthesize
            voice: Voice ID or name
            provider: TTS provider
            speed: Speech speed

        Returns:
            URL to audio file
        """
        audio_bytes = await self.synthesize(text, voice, provider, speed)

        # Save to uploads directory
        filename = f"speech_{uuid.uuid4().hex[:8]}.mp3"
        file_path = settings.UPLOAD_DIR / filename

        with open(file_path, 'wb') as f:
            f.write(audio_bytes)

        return f"/uploads/{filename}"

    async def transcribe_audio(
        self,
        audio_data: bytes,
        filename: Optional[str] = None,
        provider: Optional[str] = None
    ) -> str:
        """
        Transcribe audio to text.

        Args:
            audio_data: Audio file bytes
            filename: Original filename (for format detection)
            provider: STT provider

        Returns:
            Transcribed text
        """
        stt_config = self.config.get("stt", {})
        provider = provider or stt_config.get("default", "faster_whisper")

        if provider == "faster_whisper":
            return await self._transcribe_faster_whisper(audio_data, filename, stt_config.get("faster_whisper", {}))
        elif provider == "whisper":
            return await self._transcribe_whisper(audio_data, filename)
        elif provider == "vosk":
            return await self._transcribe_vosk(audio_data, stt_config.get("vosk", {}))
        else:
            raise ValueError(f"Unknown STT provider: {provider}")

    async def list_voices(self, provider: Optional[str] = None) -> List[Dict]:
        """
        List available voices.

        Args:
            provider: Filter by provider

        Returns:
            List of voice information
        """
        voices = []

        # OpenAI voices
        if not provider or provider == "openai":
            openai_voices = [
                {"id": "alloy", "name": "Alloy", "provider": "openai", "gender": "neutral"},
                {"id": "echo", "name": "Echo", "provider": "openai", "gender": "male"},
                {"id": "fable", "name": "Fable", "provider": "openai", "gender": "neutral"},
                {"id": "onyx", "name": "Onyx", "provider": "openai", "gender": "male"},
                {"id": "nova", "name": "Nova", "provider": "openai", "gender": "female"},
                {"id": "shimmer", "name": "Shimmer", "provider": "openai", "gender": "female"}
            ]
            voices.extend(openai_voices)

        # ElevenLabs voices
        if not provider or provider == "elevenlabs":
            elevenlabs_voices = [
                {"id": "21m00Tcm4TlvDq8ikWAM", "name": "Rachel", "provider": "elevenlabs", "gender": "female"},
                {"id": "ErXwobaYiN019PkySvjV", "name": "Antoni", "provider": "elevenlabs", "gender": "male"},
                {"id": "TxGEqnHWrfWFTfGW9XjX", "name": "Josh", "provider": "elevenlabs", "gender": "male"},
                {"id": "EXAVITQu4vr4xnSDxMaL", "name": "Bella", "provider": "elevenlabs", "gender": "female"}
            ]
            voices.extend(elevenlabs_voices)

        # Edge TTS voices
        if not provider or provider == "edge":
            edge_voices = [
                {"id": "en-US-AriaNeural", "name": "Aria (US)", "provider": "edge", "gender": "female"},
                {"id": "en-US-GuyNeural", "name": "Guy (US)", "provider": "edge", "gender": "male"},
                {"id": "en-GB-SoniaNeural", "name": "Sonia (UK)", "provider": "edge", "gender": "female"}
            ]
            voices.extend(edge_voices)

        # Kokoro voices
        if not provider or provider == "kokoro":
             kokoro_voices = [
                {"id": "af_heart", "name": "Heart", "provider": "kokoro", "gender": "female"},
                {"id": "af_bella", "name": "Bella", "provider": "kokoro", "gender": "female"},
                {"id": "af_nicole", "name": "Nicole", "provider": "kokoro", "gender": "female"},
                {"id": "am_michael", "name": "Michael", "provider": "kokoro", "gender": "male"},
                {"id": "am_adam", "name": "Adam", "provider": "kokoro", "gender": "male"}
             ]
             voices.extend(kokoro_voices)

        # Personaplex voices
        if not provider or provider == "personaplex":
            personaplex_voices = [
                {"id": "en-US-Standard", "name": "Personaplex Standard", "provider": "personaplex", "gender": "neutral"}
            ]
            voices.extend(personaplex_voices)

        return voices

    async def get_provider_status(self) -> Dict:
        """Get status of all TTS and STT providers."""
        tts_providers = []
        stt_providers = []

        # === TTS PROVIDERS ===

        # Check OpenAI
        openai_key = get_api_key("OPENAI_API_KEY")
        tts_providers.append({
            "name": "openai",
            "available": bool(openai_key),
            "api_key_configured": bool(openai_key),
            "quality": "high",
            "speed": "fast",
            "cost": "paid"
        })

        # Check ElevenLabs
        elevenlabs_key = get_api_key("ELEVENLABS_API_KEY")
        tts_providers.append({
            "name": "elevenlabs",
            "available": bool(elevenlabs_key),
            "api_key_configured": bool(elevenlabs_key),
            "quality": "premium",
            "speed": "fast",
            "cost": "paid",
            "features": ["voice_cloning"]
        })

        # Google TTS (free, always available)
        tts_providers.append({
            "name": "google",
            "available": True,
            "api_key_configured": True,
            "quality": "basic",
            "speed": "fast",
            "cost": "free"
        })

        # Edge TTS (free, always available)
        tts_providers.append({
            "name": "edge",
            "available": True,
            "api_key_configured": True,
            "quality": "high",
            "speed": "fast",
            "cost": "free",
            "recommended": True
        })

        # Kokoro (local, needs installation)
        try:
            import kokoro
            kokoro_available = True
        except ImportError:
            kokoro_available = False

        tts_providers.append({
            "name": "kokoro",
            "available": kokoro_available,
            "api_key_configured": True,
            "quality": "premium",
            "speed": "very_fast",
            "cost": "free",
            "local": True,
            "recommended": True,
            "note": "#1 on HuggingFace TTS Arena"
        })

        # Personaplex (NVIDIA)
        personaplex_key = get_api_key("NVIDIA_API_KEY")
        tts_providers.append({
            "name": "personaplex",
            "available": bool(personaplex_key),
            "api_key_configured": bool(personaplex_key),
            "quality": "premium",
            "speed": "fast",
            "cost": "paid",
            "note": "NVIDIA Personaplex API"
        })

        # === STT PROVIDERS ===

        # Faster-Whisper (local, recommended)
        try:
            import faster_whisper
            faster_whisper_available = True
        except ImportError:
            faster_whisper_available = False

        stt_providers.append({
            "name": "faster_whisper",
            "available": faster_whisper_available,
            "api_key_configured": True,
            "quality": "excellent",
            "speed": "4x_faster_than_whisper",
            "cost": "free",
            "local": True,
            "recommended": True,
            "note": "CTranslate2 optimized Whisper"
        })

        # OpenAI Whisper API
        stt_providers.append({
            "name": "whisper",
            "available": bool(openai_key),
            "api_key_configured": bool(openai_key),
            "quality": "excellent",
            "speed": "fast",
            "cost": "paid"
        })

        # Vosk (lightweight offline)
        try:
            import vosk
            vosk_available = True
        except ImportError:
            vosk_available = False

        stt_providers.append({
            "name": "vosk",
            "available": vosk_available,
            "api_key_configured": True,
            "quality": "good",
            "speed": "fast",
            "cost": "free",
            "local": True,
            "note": "Lightweight, runs on CPU"
        })

        # Browser (Web Speech API)
        stt_providers.append({
            "name": "browser",
            "available": True,
            "api_key_configured": True,
            "quality": "variable",
            "speed": "real_time",
            "cost": "free",
            "note": "Uses browser's Web Speech API"
        })

        return {
            "tts": tts_providers,
            "stt": stt_providers,
            "default_tts": self.config.get("default", "edge"),
            "default_stt": self.config.get("stt", {}).get("default", "faster_whisper")
        }

    async def _synthesize_openai(
        self,
        text: str,
        voice: Optional[str],
        config: Dict,
        speed: float
    ) -> bytes:
        """Synthesize using OpenAI TTS"""
        api_key = get_api_key("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OpenAI API key not configured")

        voice = voice or config.get("voice", "nova")
        model = config.get("model", "tts-1")

        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.openai.com/v1/audio/speech",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": model,
                    "input": text,
                    "voice": voice,
                    "speed": speed
                },
                timeout=30.0
            )
            response.raise_for_status()
            return response.content

    async def _synthesize_elevenlabs(
        self,
        text: str,
        voice: Optional[str],
        config: Dict
    ) -> bytes:
        """Synthesize using ElevenLabs"""
        api_key = get_api_key("ELEVENLABS_API_KEY")
        if not api_key:
            raise ValueError("ElevenLabs API key not configured")

        voice_id = voice or config.get("voice_id", "21m00Tcm4TlvDq8ikWAM")
        model_id = config.get("model_id", "eleven_multilingual_v2")

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}",
                headers={
                    "xi-api-key": api_key,
                    "Content-Type": "application/json"
                },
                json={
                    "text": text,
                    "model_id": model_id,
                    "voice_settings": {
                        "stability": config.get("stability", 0.5),
                        "similarity_boost": config.get("similarity_boost", 0.75)
                    }
                },
                timeout=30.0
            )
            response.raise_for_status()
            return response.content

    async def _synthesize_google(self, text: str, config: Dict) -> bytes:
        """Synthesize using Google TTS (gTTS)"""
        try:
            from gtts import gTTS

            tts = gTTS(
                text=text,
                lang=config.get("language", "en"),
                tld=config.get("tld", "com"),
                slow=config.get("slow", False)
            )

            # Save to bytes
            fp = io.BytesIO()
            tts.write_to_fp(fp)
            fp.seek(0)
            return fp.read()

        except ImportError:
            raise ImportError("gTTS not installed. Run: pip install gTTS")

    async def _synthesize_edge(
        self,
        text: str,
        voice: Optional[str],
        config: Dict
    ) -> bytes:
        """Synthesize using Edge TTS (free Microsoft voices)"""
        try:
            import edge_tts

            # Use configured voice - AndrewNeural is natural and professional
            voice = voice or config.get("voice", "en-US-AndrewNeural")
            rate = config.get("rate", "-3%")  # Slightly slower for natural speech
            volume = config.get("volume", "+0%")
            pitch = config.get("pitch", "+0Hz")

            communicate = edge_tts.Communicate(
                text,
                voice,
                rate=rate,
                volume=volume,
                pitch=pitch
            )

            # Collect audio data
            audio_data = b""
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    audio_data += chunk["data"]

            return audio_data

        except ImportError:
            raise ImportError("edge-tts not installed. Run: pip install edge-tts")


    async def _transcribe_whisper(
        self,
        audio_data: bytes,
        filename: Optional[str]
    ) -> str:
        """Transcribe using OpenAI Whisper API"""
        api_key = get_api_key("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OpenAI API key not configured")

        # Determine file extension
        ext = ".mp3"
        if filename:
            ext = Path(filename).suffix or ".mp3"

        async with httpx.AsyncClient() as client:
            files = {
                "file": (f"audio{ext}", audio_data, "audio/mpeg"),
                "model": (None, "whisper-1")
            }

            response = await client.post(
                "https://api.openai.com/v1/audio/transcriptions",
                headers={
                    "Authorization": f"Bearer {api_key}"
                },
                files=files,
                timeout=60.0
            )
            response.raise_for_status()
            data = response.json()
            return data.get("text", "")

    async def _transcribe_faster_whisper(
        self,
        audio_data: bytes,
        filename: Optional[str],
        config: Dict
    ) -> str:
        """
        Transcribe using Faster-Whisper (CTranslate2 optimized).

        Faster-Whisper is 4x faster than original Whisper with same accuracy.
        Supports: tiny, base, small, medium, large-v2, large-v3 models.
        """
        try:
            from faster_whisper import WhisperModel
            import tempfile
            import os

            # Get configuration
            model_size = config.get("model_size", "large-v3")
            device = config.get("device", "auto")
            compute_type = config.get("compute_type", "float16")
            language = config.get("language", "en")
            beam_size = config.get("beam_size", 5)
            vad_filter = config.get("vad_filter", True)

            # Auto-detect device
            if device == "auto":
                try:
                    import torch
                    device = "cuda" if torch.cuda.is_available() else "cpu"
                    if device == "cpu":
                        compute_type = "int8"  # Use int8 on CPU for speed
                except ImportError:
                    device = "cpu"
                    compute_type = "int8"

            # Initialize model (cached globally for performance)
            global _FASTER_WHISPER_MODEL
            model_key = f"{model_size}_{device}_{compute_type}"

            if '_FASTER_WHISPER_MODEL' not in globals() or _FASTER_WHISPER_MODEL.get("key") != model_key:
                logger.info(f"Loading Faster-Whisper model: {model_size} on {device}")
                model = WhisperModel(
                    model_size,
                    device=device,
                    compute_type=compute_type,
                    download_root=config.get("download_root")
                )
                _FASTER_WHISPER_MODEL = {"key": model_key, "model": model}
                logger.info("Faster-Whisper model loaded")

            model = _FASTER_WHISPER_MODEL["model"]

            # Save audio to temporary file
            ext = ".mp3"
            if filename:
                ext = Path(filename).suffix or ".mp3"

            with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp_file:
                tmp_file.write(audio_data)
                tmp_path = tmp_file.name

            try:
                # Transcribe with VAD filter for better accuracy
                vad_params = None
                if vad_filter:
                    vad_config = config.get("vad_parameters", {})
                    vad_params = {
                        "min_silence_duration_ms": vad_config.get("min_silence_duration_ms", 500),
                        "speech_pad_ms": vad_config.get("speech_pad_ms", 400)
                    }

                segments, info = model.transcribe(
                    tmp_path,
                    beam_size=beam_size,
                    language=language if language else None,
                    vad_filter=vad_filter,
                    vad_parameters=vad_params
                )

                # Combine all segments
                text = " ".join(segment.text for segment in segments)

                logger.info(
                    f"Transcribed {info.duration:.1f}s audio in {info.duration_after_vad:.1f}s "
                    f"(detected language: {info.language}, probability: {info.language_probability:.2f})"
                )

                return text.strip()

            finally:
                # Clean up temp file
                os.unlink(tmp_path)

        except ImportError:
            logger.warning("faster-whisper not installed, falling back to OpenAI Whisper API")
            return await self._transcribe_whisper(audio_data, filename)
        except Exception as e:
            logger.error(f"Faster-Whisper transcription error: {str(e)}")
            raise

    async def _transcribe_vosk(
        self,
        audio_data: bytes,
        config: Dict
    ) -> str:
        """
        Transcribe using Vosk (lightweight offline STT).

        Vosk is ideal for resource-constrained environments and offline use.
        """
        try:
            from vosk import Model, KaldiRecognizer
            import wave
            import json
            import tempfile
            import os

            model_path = config.get("model_path")
            sample_rate = config.get("sample_rate", 16000)

            # Initialize model
            global _VOSK_MODEL
            if '_VOSK_MODEL' not in globals() or _VOSK_MODEL is None:
                if model_path:
                    _VOSK_MODEL = Model(model_path)
                else:
                    # Download default model
                    _VOSK_MODEL = Model(lang=config.get("language", "en-us"))
                logger.info("Vosk model loaded")

            model = _VOSK_MODEL

            # Convert audio to WAV format if needed
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp_file:
                # For simplicity, assume input is already compatible
                # In production, use ffmpeg or pydub for conversion
                tmp_file.write(audio_data)
                tmp_path = tmp_file.name

            try:
                wf = wave.open(tmp_path, "rb")
                rec = KaldiRecognizer(model, wf.getframerate())
                rec.SetWords(True)

                results = []
                while True:
                    data = wf.readframes(4000)
                    if len(data) == 0:
                        break
                    if rec.AcceptWaveform(data):
                        result = json.loads(rec.Result())
                        if result.get("text"):
                            results.append(result["text"])

                # Get final result
                final = json.loads(rec.FinalResult())
                if final.get("text"):
                    results.append(final["text"])

                wf.close()
                return " ".join(results)

            finally:
                os.unlink(tmp_path)

        except ImportError:
            logger.warning("vosk not installed, falling back to Faster-Whisper")
            return await self._transcribe_faster_whisper(audio_data, None, {})
        except Exception as e:
            logger.error(f"Vosk transcription error: {str(e)}")
            raise
    async def _synthesize_kokoro(
        self,
        text: str,
        voice: Optional[str],
        config: Dict,
        speed: float = 1.0
    ) -> bytes:
        """Synthesize using Kokoro (Local) with Caching"""
        global _KOKORO_PIPELINE
        try:
            from kokoro import KPipeline
            import soundfile as sf
            import numpy as np
            
            # Initialize pipeline only once (Singleton Pattern)
            if _KOKORO_PIPELINE is None:
                logger.info("Loading Kokoro Pipeline (First Run)...")
                # 'a' is for American English
                _KOKORO_PIPELINE = KPipeline(lang_code='a')
                logger.info("Kokoro Pipeline Loaded.")
            
            pipeline = _KOKORO_PIPELINE
            
            # Default voice
            voice = voice or config.get("voice", "af_heart")
            
            # Generate audio
            # generator returns (graphemes, phonemes, audio)
            generator = pipeline(text, voice=voice, speed=speed, split_pattern=r'\n+')
            
            all_audio = []
            for _, _, audio in generator:
                all_audio.append(audio)
                
            if not all_audio:
                raise ValueError("No audio generated")
                
            # Concatenate all audio segments
            full_audio = np.concatenate(all_audio)
            
            # Convert to bytes (WAV format)
            fp = io.BytesIO()
            sf.write(fp, full_audio, 24000, format='WAV')
            fp.seek(0)
            return fp.read()
            
        except ImportError:
            raise ImportError("kokoro not installed. Run: pip install kokoro soundfile")
        except Exception as e:
            logger.error(f"Kokoro synthesis error: {str(e)}")
            raise



    async def _synthesize_personaplex(
        self,
        text: str,
        voice: Optional[str],
        config: Dict,
        speed: float = 1.0
    ) -> bytes:
        """Synthesize using Personaplex (NVIDIA) API"""
        api_key = get_api_key(config.get("api_key_env", "NVIDIA_API_KEY"))
        if not api_key:
            raise ValueError("Personaplex API key not configured")

        base_url = config.get("base_url")
        voice = voice or config.get("voice", "en-US-Standard")
        
        # Placeholder implementation for NVIDIA NIM / Personaplex API
        # The actual API contract depends on the specific NIM container
        async with httpx.AsyncClient() as client:
            response = await client.post(
                base_url,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "text": text,
                    "voice_name": voice,
                    "language_code": "en-US",
                    "speed": speed
                },
                timeout=60.0
            )
            
            if response.status_code != 200:
                logger.error(f"Personaplex error: {response.text}")
                response.raise_for_status()

            # Handle different response formats (binary vs JSON with base64)
            # Assuming functionality similar to standard TTS APIs returning binary audio
            if response.headers.get("Content-Type", "").startswith("application/json"):
                 data = response.json()
                 if "audio_content" in data:
                     import base64
                     return base64.b64decode(data["audio_content"])
            
            return response.content
