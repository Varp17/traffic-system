"""
core/audio_siren_detector.py — Acoustic Emergency Siren Detection Engine
========================================================================
Detects emergency vehicle sirens (wail, yelp, hi-lo) using spectral power
analysis and frequency-modulation tracking via Fast Fourier Transform (FFT).
Standard: Emergency sirens concentrate energy in 600 Hz – 1600 Hz with periodic sweeps.
"""

import numpy as np
import wave
import time
import os
import threading
from typing import Dict, Optional, Tuple
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import config


class AudioSirenDetector:
    """
    Acoustic detector analyzing audio signals for emergency vehicle sirens.
    Uses FFT spectral energy distribution and peak-harmonic tracking.
    """

    def __init__(self,
                 freq_low: float = None,
                 freq_high: float = None,
                 confidence_threshold: float = None,
                 sample_rate: int = 22050):
        self.freq_low  = freq_low  or getattr(config, 'SIREN_FREQ_LOW', 600.0)
        self.freq_high = freq_high or getattr(config, 'SIREN_FREQ_HIGH', 1600.0)
        self.confidence_threshold = confidence_threshold or getattr(config, 'SIREN_CONFIDENCE_THRESH', 0.40)
        self.sample_rate = sample_rate

        self.last_detection_time = 0.0
        self.last_confidence = 0.0
        self.is_siren_active = False
        self.dominant_freq = 0.0
        
        # Audio test buffer
        self._lock = threading.Lock()
        self._synthetic_wav_path = os.path.join(config.BASE_DIR, "siren_benchmark.wav")
        self._ensure_benchmark_wav()

    def _ensure_benchmark_wav(self):
        """Generate a pristine mathematical emergency siren WAV file for reliable testing."""
        if not os.path.exists(self._synthetic_wav_path):
            try:
                self.synthesize_siren_wav(self._synthetic_wav_path, duration=5.0)
            except Exception as e:
                print(f"[AudioDetector] Warning generating benchmark WAV: {e}")

    def synthesize_siren_wav(self, output_path: str, duration: float = 5.0, sample_rate: int = 22050):
        """
        Synthesize an acoustic emergency siren (European / American Yelp-Wail sweep).
        Sweeps between 650 Hz and 1450 Hz with 2.0 Hz cyclic modulation.
        """
        num_samples = int(duration * sample_rate)
        t = np.linspace(0, duration, num_samples, endpoint=False)
        
        # Frequency modulation: sinusoidal sweep between 650 Hz and 1450 Hz
        sweep_rate = 1.8  # Hz
        f_inst = 1050.0 + 400.0 * np.sin(2 * np.pi * sweep_rate * t)
        
        # Phase integration
        phase = 2 * np.pi * np.cumsum(f_inst) / sample_rate
        signal = 0.8 * np.sin(phase)
        
        # Add slight 2nd harmonic and simulated ambient urban noise
        signal += 0.2 * np.sin(2 * phase)
        noise = 0.08 * np.random.normal(0, 1, num_samples)
        combined = signal + noise
        
        # Normalize to 16-bit PCM
        audio_int16 = np.int16(np.clip(combined, -1.0, 1.0) * 32767)
        
        with wave.open(output_path, 'wb') as wav_file:
            wav_file.setnchannels(1)      # Mono
            wav_file.setsampwidth(2)     # 16-bit
            wav_file.setframerate(sample_rate)
            wav_file.writeframes(audio_int16.tobytes())
            
        print(f"[AudioDetector] Synthesized siren benchmark at: {output_path}")

    def analyze_audio_chunk(self, audio_data: np.ndarray, sample_rate: int = None) -> Tuple[bool, float, float]:
        """
        Compute Power Spectral Density (PSD) and assess siren presence.
        Returns: (is_siren, confidence, dominant_frequency)
        """
        sr = sample_rate or self.sample_rate
        if len(audio_data) < 256:
            return False, 0.0, 0.0

        # Apply Hanning window
        windowed = audio_data * np.hanning(len(audio_data))
        
        # Real FFT
        fft_vals = np.abs(np.fft.rfft(windowed))
        freqs    = np.fft.rfftfreq(len(windowed), d=1.0 / sr)
        
        power = fft_vals ** 2
        total_power = np.sum(power) + 1e-9
        
        # Siren band power
        siren_mask = (freqs >= self.freq_low) & (freqs <= self.freq_high)
        siren_power = np.sum(power[siren_mask])
        
        # Ratio of spectral power concentrated in the emergency siren band
        power_ratio = float(siren_power / total_power)
        
        # Dominant frequency
        dominant_idx = np.argmax(power)
        dom_freq = float(freqs[dominant_idx])
        
        # Peak harmonicity check (sirens have concentrated tonal peaks, noise is diffuse)
        peak_to_mean = float(power[dominant_idx] / (np.mean(power) + 1e-9))
        
        # Composite confidence metric
        confidence = float(np.clip(power_ratio * 1.5 + (peak_to_mean / 40.0) * 0.3, 0.0, 1.0))
        
        is_siren = (confidence >= self.confidence_threshold) and (self.freq_low <= dom_freq <= self.freq_high)
        
        with self._lock:
            self.last_confidence = confidence
            self.dominant_freq = dom_freq
            if is_siren:
                self.last_detection_time = time.time()
                self.is_siren_active = True
            elif time.time() - self.last_detection_time > 4.0:
                self.is_siren_active = False

        return is_siren, round(confidence, 3), round(dom_freq, 1)

    def analyze_wav_file(self, wav_path: str) -> Dict:
        """Analyze a complete WAV file and return aggregate siren detection metrics."""
        if not os.path.exists(wav_path):
            return {"error": f"File not found: {wav_path}", "detected": False}

        try:
            with wave.open(wav_path, 'rb') as wf:
                sample_rate = wf.getframerate()
                n_channels = wf.getnchannels()
                sampwidth = wf.getsampwidth()
                n_frames = wf.getnframes()
                raw_bytes = wf.readframes(n_frames)
            
            # Convert raw bytes to numpy array
            if sampwidth == 2:
                samples = np.frombuffer(raw_bytes, dtype=np.int16).astype(np.float32) / 32768.0
            elif sampwidth == 1:
                samples = (np.frombuffer(raw_bytes, dtype=np.uint8).astype(np.float32) - 128.0) / 128.0
            else:
                samples = np.frombuffer(raw_bytes, dtype=np.int32).astype(np.float32) / 2147483648.0
            
            # If multi-channel, average to mono
            if n_channels > 1:
                samples = samples.reshape(-1, n_channels).mean(axis=1)

            # Analyze in 0.5-second sliding windows
            win_size = int(0.5 * sample_rate)
            hop_size = int(0.25 * sample_rate)
            detections = []
            
            for start in range(0, len(samples) - win_size, hop_size):
                chunk = samples[start:start + win_size]
                is_siren, conf, freq = self.analyze_audio_chunk(chunk, sample_rate)
                detections.append({"time": round(start / sample_rate, 2), "is_siren": is_siren, "conf": conf, "freq": freq})
            
            siren_hits = sum(1 for d in detections if d["is_siren"])
            overall_confidence = float(np.mean([d["conf"] for d in detections])) if detections else 0.0
            detected = siren_hits >= 2 or overall_confidence >= self.confidence_threshold
            
            return {
                "detected": detected,
                "overall_confidence": round(overall_confidence, 2),
                "siren_window_hits": siren_hits,
                "total_windows": len(detections),
                "sample_rate": sample_rate,
                "dominant_freq": self.dominant_freq,
            }
        except Exception as e:
            return {"error": str(e), "detected": False}

    @property
    def siren_detected(self) -> bool:
        """True if emergency acoustic siren detected within the last 5.0 seconds."""
        with self._lock:
            return self.is_siren_active and (time.time() - self.last_detection_time < 5.0)

    def get_status(self) -> Dict:
        """Return serializable acoustic detector status."""
        with self._lock:
            active = self.is_siren_active and (time.time() - self.last_detection_time < 5.0)
            return {
                "siren_active": active,
                "confidence": round(self.last_confidence, 2),
                "dominant_freq": round(self.dominant_freq, 1),
                "last_detection_time": self.last_detection_time,
            }
