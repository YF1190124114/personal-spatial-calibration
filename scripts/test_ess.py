"""Verify committed ESS format, exact signal samples and logarithmic frequency law."""
from pathlib import Path
import numpy as np
from scipy.io import wavfile
from scipy.signal import chirp, hilbert

path = Path(__file__).resolve().parents[1] / 'public/audio/ess-200-8000-3s.wav'
rate, pcm = wavfile.read(path)
assert rate == 48000 and pcm.dtype == np.int16 and pcm.ndim == 1 and len(pcm) == 144000
assert pcm[0] == pcm[-1] == 0
assert np.max(np.abs(pcm.astype(np.int32))) <= 6554
n = 960
t = np.arange(len(pcm), dtype=np.float64) / rate
expected = chirp(t, f0=200, f1=8000, t1=3, method='logarithmic', phi=-90)
fade = np.sin(np.linspace(0, np.pi/2, n))**2
expected[:n] *= fade
expected[-n:] *= fade[::-1]
np.testing.assert_array_equal(pcm, np.round(expected * .2 * 32767).astype(np.int16))
phase = np.unwrap(np.angle(hilbert(pcm.astype(np.float64))))
frequency = np.diff(phase) * rate / (2*np.pi)
for second in [.3, 1.5, 2.7]:
    i = round(second * rate)
    observed = np.median(frequency[i-100:i+100])
    target = 200 * 40**(second/3)
    assert abs(observed-target)/target < .02, (observed,target)
print('PASS: WAV format, duration, mono PCM16, peak, exact 20 ms fades, log sweep samples and instantaneous-frequency checks.')
