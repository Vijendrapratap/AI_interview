import io
import numpy as np
import soundfile as sf
from typing import Dict, Any, Tuple

class AudioAnalyzer:
    def analyze(self, audio_bytes: bytes) -> Dict[str, Any]:
        """
        Analyze audio bytes for voice confidence metrics.
        Returns:
            Dict containing:
            - duration_seconds
            - speech_ratio (vs silence)
            - avg_volume_db
            - volume_stability (0-1)
            - pitch_variability (0-1)
        """
        try:
            # Load audio
            # soundfile supports many formats, returns data (frames) and samplerate
            data, samplerate = sf.read(io.BytesIO(audio_bytes))
            
            # Convert to mono if stereo
            if len(data.shape) > 1:
                data = data.mean(axis=1)
                
            # Normalize
            if np.max(np.abs(data)) > 0:
                data = data / np.max(np.abs(data))
                
            # Basic stats
            duration = len(data) / samplerate
            
            # --- Volume Analysis (RMS) ---
            # Frame size for analysis (e.g., 50ms)
            frame_length = int(samplerate * 0.05)
            hop_length = int(samplerate * 0.025)
            
            rms_energy = []
            for i in range(0, len(data), hop_length):
                frame = data[i:i+frame_length]
                if len(frame) > 0:
                    rms = np.sqrt(np.mean(frame**2))
                    rms_energy.append(rms)
            
            rms_energy = np.array(rms_energy)
            
            # Silence detection (threshold: 0.02, typical for normalized audio)
            silence_threshold = 0.02
            is_speech = rms_energy > silence_threshold
            speech_frames = np.sum(is_speech)
            total_frames = len(rms_energy)
            
            speech_ratio = speech_frames / total_frames if total_frames > 0 else 0
            
            # Volume Metrics
            avg_volume = np.mean(rms_energy[is_speech]) if speech_frames > 0 else 0
            # Stability: 1.0 = perfectly flat volume (robotic), lower = dynamic. 
            # We want "Controlled Dynamism". Too low = mumbling/shouting.
            # Std Dev of active speech volume
            volume_std = np.std(rms_energy[is_speech]) if speech_frames > 0 else 0
            volume_stability = 1.0 - min(volume_std * 5, 1.0) # Scale roughly to 0-1
            
            return {
                "duration": duration,
                "speech_ratio": float(round(speech_ratio, 2)),
                "silence_duration": float(round(duration * (1 - speech_ratio), 2)),
                "avg_volume": float(round(avg_volume, 3)),
                "volume_stability": float(round(volume_stability, 2)), # High means steady voice
                "confidence_score": self._calculate_confidence(speech_ratio, volume_stability)
            }
            
        except Exception as e:
            print(f"Audio analysis error: {e}")
            return {
                "duration": 0,
                "error": str(e)
            }

    def _calculate_confidence(self, speech_ratio: float, volume_stability: float) -> int:
        """
        Heuristic for "Voice Confidence" (0-100).
        - High speech ratio (less hesitation) -> +
        - Moderate volume stability (steady but natural) -> +
        """
        score = 50 # Base
        
        # Reward continuous speech (less hesitation)
        score += (speech_ratio * 30) 
        
        # Reward stability (steady voice)
        score += (volume_stability * 20)
        
        return int(min(max(score, 0), 100))
