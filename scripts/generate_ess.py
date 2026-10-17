"""Reproduce the V0.5 playback-only signal: python scripts/generate_ess.py.
Requires numpy and scipy (pip install -r scripts/requirements-audio.txt).
"""
from pathlib import Path
import numpy as np
from scipy.signal import chirp
from scipy.io import wavfile

SAMPLE_RATE = 48000
DURATION = 3.0
START_HZ = 200.0
END_HZ = 8000.0
FADE_SECONDS = 0.020
AMPLITUDE = 0.20  # peak <= -13.98 dBFS before the fixed browser gain

def generate():
    t = np.arange(round(SAMPLE_RATE * DURATION), dtype=np.float64) / SAMPLE_RATE
    sweep = chirp(t, f0=START_HZ, f1=END_HZ, t1=DURATION, method="logarithmic", phi=-90)
    n = round(SAMPLE_RATE * FADE_SECONDS)
    fade = np.sin(np.linspace(0, np.pi / 2, n)) ** 2
    sweep[:n] *= fade
    sweep[-n:] *= fade[::-1]
    pcm = np.round(sweep * AMPLITUDE * 32767).astype(np.int16)
    path = Path(__file__).resolve().parents[1] / "public/audio/ess-200-8000-3s.wav"
    path.parent.mkdir(parents=True, exist_ok=True)
    wavfile.write(path, SAMPLE_RATE, pcm)
    assert pcm.size == 144000 and pcm[0] == pcm[-1] == 0
    assert np.max(np.abs(pcm.astype(np.int32))) <= 6554
    print(f"{path}: 48000 Hz, mono PCM16, 144000 samples, 3 s, 200–8000 Hz log sweep, 20 ms fades")

if __name__ == "__main__":
    generate()
