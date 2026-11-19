"""Generates the weapon sound packs of ALPHA STRIKE ZERO (all synthesised here: no recordings are used).

python -I tools/make_weapon_audio.py

  src/assets/audio/arsenal_fire.json     single shots  f_<voice>  + burst tails  ft_<family>   (mu-law 44.1 kHz / ADPCM 32 kHz)
  src/assets/audio/arsenal_reload.json   reloads  r_<family>_tac / _empty                     (IMA-ADPCM 32 kHz)
  src/assets/audio/arsenal_fx.json       handling sounds  x_<name>                            (IMA-ADPCM 32 kHz)
  src/assets/audio/arsenal_audio.json    levels, tails per voice, and for every reload its length and EVENT TIMES
                                         (magOut, magIn, boltPull, boltRelease, open, close) in seconds

The reload animation is keyed from those event times and the sound is started in the same frame, so the hands and
the clicks cannot drift apart. Every shot has its attack on its first samples, so trigger, flash and report coincide.
Pack format: asz-audio-1 (see src/js/audio.js decodeSound): mono, peak-normalised, 'g' = restore gain.
"""
import os, sys, json, base64, math
import numpy as np
from scipy import signal

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'src', 'assets', 'audio')
SR = 44100
rng = np.random.default_rng(20261116)

# ------------------------------------------------------------------ codecs (bit-exact with audio.js)
_IDX = [-1, -1, -1, -1, 2, 4, 6, 8, -1, -1, -1, -1, 2, 4, 6, 8]
_STEP = [7, 8, 9, 10, 11, 12, 13, 14, 16, 17, 19, 21, 23, 25, 28, 31, 34, 37, 41, 45, 50, 55, 60, 66, 73, 80, 88, 97, 107, 118, 130, 143, 157, 173, 190, 209, 230,
         253, 279, 307, 337, 371, 408, 449, 494, 544, 598, 658, 724, 796, 876, 963, 1060, 1166, 1282, 1411, 1552, 1707, 1878, 2066, 2272, 2499, 2749, 3024, 3327,
         3660, 4026, 4428, 4871, 5358, 5894, 6484, 7132, 7845, 8630, 9493, 10442, 11487, 12635, 13899, 15289, 16818, 18500, 20350, 22385, 24623, 27086, 29794, 32767]


def adpcm_encode(f32, B=1024):
    """IMA-ADPCM in the game's block layout (int16 LE predictor, uint8 step index, B/2 bytes, low nibble first).
    The coder state runs on across blocks, so block edges are seamless."""
    s = np.clip(np.round(np.asarray(f32, dtype=np.float64) * 32767), -32768, 32767).astype(np.int64).tolist()
    n = len(s)
    out = bytearray()
    pred, index = (s[0] if n else 0), 30
    STEP, IDX = _STEP, _IDX
    i = 0
    while i < n:
        p16 = pred & 0xFFFF
        out += bytes((p16 & 255, (p16 >> 8) & 255, index))
        nibs = bytearray(B)
        for k in range(B):
            v = s[i + k] if i + k < n else 0
            diff = v - pred
            nib = 0
            if diff < 0:
                nib = 8; diff = -diff
            step = STEP[index]; delta = step >> 3
            if diff >= step:
                nib |= 4; diff -= step; delta += step
            step >>= 1
            if diff >= step:
                nib |= 2; diff -= step; delta += step
            step >>= 1
            if diff >= step:
                nib |= 1; delta += step
            pred = pred - delta if nib & 8 else pred + delta
            if pred < -32768: pred = -32768
            elif pred > 32767: pred = 32767
            index += IDX[nib]
            if index < 0: index = 0
            elif index > 88: index = 88
            nibs[k] = nib
        for k in range(0, B, 2):
            out.append(nibs[k] | (nibs[k + 1] << 4))
        i += B
    return bytes(out)


def adpcm_decode(data, n, B):
    src = data; out = np.zeros(n, dtype=np.int16); per = 3 + B // 2; o = 0; blk = 0
    while o < n:
        h = blk * per
        pred = src[h] | (src[h + 1] << 8)
        if pred >= 32768: pred -= 65536
        index = src[h + 2]
        for k in range(B):
            if o >= n: break
            byte = src[h + 3 + (k >> 1)]
            nib = byte >> 4 if k & 1 else byte & 15
            step = _STEP[index]; delta = step >> 3
            if nib & 4: delta += step
            step >>= 1
            if nib & 2: delta += step
            step >>= 1
            if nib & 1: delta += step
            pred = pred - delta if nib & 8 else pred + delta
            pred = -32768 if pred < -32768 else 32767 if pred > 32767 else pred
            index += _IDX[nib]; index = 0 if index < 0 else 88 if index > 88 else index
            out[o] = pred; o += 1
        blk += 1
    return out


def _mulaw_table():
    t = np.zeros(256, dtype=np.int32)
    for u in range(256):
        v = ~u & 0xFF; e = (v >> 4) & 7; m = v & 15
        d = ((m << 3) + 0x84) << e; d -= 0x84
        t[u] = -d if v & 0x80 else d
    return t


MULAW = _mulaw_table()


def mulaw_encode(f32):
    s = np.clip(np.round(np.asarray(f32, dtype=np.float64) * 32767), -32635, 32635).astype(np.int32)
    sign = np.where(s < 0, 0x80, 0)
    a = np.abs(s) + 0x84
    exp = np.zeros_like(a)
    for e in range(7, 0, -1):
        exp = np.where((exp == 0) & ((a >> (e + 7)) & 1).astype(bool), e, exp)
    man = (a >> (exp + 3)) & 0x0F
    return ((~(sign | (exp << 4) | man)) & 0xFF).astype(np.uint8).tobytes()


def pack_sound(x, sr, codec, peak=0.97):
    x = np.asarray(x, dtype=np.float64)
    pk = float(np.max(np.abs(x))) or 1.0
    g = pk / peak; y = x / g
    if codec == 'mulaw':
        d = mulaw_encode(y); dec = MULAW[np.frombuffer(d, dtype=np.uint8)].astype(np.float64) / 32768
        e = {'rate': int(sr), 'n': int(len(y)), 'g': float('%.5g' % g), 'c': 'mulaw', 'd': base64.b64encode(d).decode('ascii')}
    else:
        B = 1024; d = adpcm_encode(y, B); dec = adpcm_decode(d, len(y), B).astype(np.float64) / 32768
        e = {'rate': int(sr), 'n': int(len(y)), 'g': float('%.5g' % g), 'c': 'adpcm', 'b': B, 'd': base64.b64encode(d).decode('ascii')}
    err = y - dec
    snr = 10 * math.log10((np.mean(y * y) + 1e-12) / (np.mean(err * err) + 1e-12))
    return e, snr


# ------------------------------------------------------------------ DSP helpers
def N(n): return rng.standard_normal(int(n))
def T(dur): return np.arange(int(dur * SR)) / SR
def sos(kind, f, order=2): return signal.butter(order, f, btype=kind, fs=SR, output='sos')
def lp(x, f, o=2): return signal.sosfilt(sos('low', min(f, SR * 0.45), o), x)
def hp(x, f, o=2): return signal.sosfilt(sos('high', f, o), x)
def bp(x, lo, hi, o=2): return signal.sosfilt(sos('band', [lo, min(hi, SR * 0.45)], o), x)
def sat(x, drive): return np.tanh(x * drive) / np.tanh(drive)
def dec(n, tau): return np.exp(-np.arange(int(n)) / (tau * SR))


def put(buf, x, t, gain=1.0):
    """Add x into buf starting at time t (seconds)."""
    i = int(round(t * SR)); j = min(len(buf), i + len(x))
    if j > i >= 0: buf[i:j] += x[:j - i] * gain
    return buf


def fade(x, fin=0.0, fout=0.02):
    x = x.copy(); a = int(fin * SR); b = int(fout * SR)
    if a > 1: x[:a] *= np.linspace(0, 1, a) ** 2
    if b > 1: x[-b:] *= np.linspace(1, 0, b) ** 2
    return x


def resample(x, sr_out):
    if sr_out == SR: return x
    g = math.gcd(sr_out, SR)
    return signal.resample_poly(x, sr_out // g, SR // g)


# ------------------------------------------------------------------ gunshots
def tail_part(dur, tau, lp0, lp1, pre=0.012):
    """Diffuse report: noise whose brightness falls as it decays, plus a few early slap-backs."""
    n = int(dur * SR); x = N(n)
    bright = lp(x, lp0) * dec(n, tau * 0.45); dark = lp(N(n), lp1, 3) * dec(n, tau)
    y = hp(bright * 0.7 + dark * 1.25, 70)
    out = np.zeros(n + int(pre * SR)); out[int(pre * SR):] = y
    return out[:n]


def gunshot(dur=0.45, crack=1.0, crack_hp=1800, crack_tau=0.004, body=1.0, body_band=(160, 1400), body_tau=0.04, mid=0.5, mid_band=(900, 4200), mid_tau=0.018,
            thump=0.8, th_f=(150, 48), th_tau=0.07, mech=0.14, mech_t=0.028, mech_f=(2300, 3700, 5300), tail=0.22, tail_tau=0.16, tail_lp=(3200, 800),
            refl=((0.021, 0.28, 2600), (0.047, 0.2, 1900), (0.083, 0.13, 1300)), drive=2.2, click=1.0, seed=0):
    global rng
    rng = np.random.default_rng(1000 + seed)
    n = int(dur * SR); t = np.arange(n) / SR
    dry = np.zeros(n)
    # muzzle blast: an N-wave on the very first samples (the attack that the flash is synchronised with)
    k = int(0.0011 * SR); nw = np.sin(np.linspace(0, 2 * np.pi, k)) * np.linspace(1, 0.35, k)
    dry[:k] += nw * click * 1.3
    dry += hp(N(n), crack_hp) * dec(n, crack_tau) * crack
    dry += bp(N(n), *body_band) * dec(n, body_tau) * body * 1.6
    dry += bp(N(n), *mid_band) * dec(n, mid_tau) * mid * 1.2
    # low-end punch: falling sine, phase-locked to the attack
    f = th_f[1] + (th_f[0] - th_f[1]) * np.exp(-t / 0.028)
    dry += np.sin(2 * np.pi * np.cumsum(f) / SR) * dec(n, th_tau) * thump * 1.25
    y = dry.copy()
    for d_, g_, f_ in refl: put(y, lp(dry, f_) , d_, g_)
    if tail > 0: y += tail_part(dur, tail_tau, *tail_lp)[:n] * tail
    # action cycling
    if mech > 0:
        m = int(0.06 * SR); tm = np.arange(m) / SR
        c = hp(N(m), 2500) * dec(m, 0.0035) * 0.9
        for i, fq in enumerate(mech_f): c += np.sin(2 * np.pi * fq * tm + i) * dec(m, 0.011 + 0.004 * i) * 0.45
        put(y, c, mech_t, mech); put(y, c[::-1][:m // 2] * 0.0 + c[:m // 2], mech_t + 0.021, mech * 0.7)
    y = sat(y / (np.max(np.abs(y)) + 1e-9) * 1.0, drive)
    return fade(y, 0, min(0.06, dur * 0.2))


def suppressed(dur=0.36, body=1.0, band=(500, 5200), tau=0.022, thump=0.35, th_f=(110, 50), mech=0.4, mech_t=0.02, hiss=0.25, seed=0):
    global rng
    rng = np.random.default_rng(3000 + seed)
    n = int(dur * SR); t = np.arange(n) / SR
    att = 1 - np.exp(-t / 0.0006)
    y = bp(N(n), *band) * dec(n, tau) * att * body * 1.6
    y += lp(N(n), 1400) * dec(n, tau * 2.4) * 0.5 * body
    f = th_f[1] + (th_f[0] - th_f[1]) * np.exp(-t / 0.03)
    y += np.sin(2 * np.pi * np.cumsum(f) / SR) * dec(n, 0.05) * thump
    y += hp(N(n), 3500) * dec(n, 0.09) * hiss * 0.5          # gas hiss
    m = int(0.06 * SR); tm = np.arange(m) / SR
    c = hp(N(m), 2200) * dec(m, 0.004)
    for i, fq in enumerate((2100, 3300, 4900)): c += np.sin(2 * np.pi * fq * tm + i) * dec(m, 0.012) * 0.5
    put(y, c, mech_t, mech); put(y, c, mech_t + 0.024, mech * 0.7)
    y += tail_part(dur, 0.08, 1800, 600)[:n] * 0.06
    y = sat(y / (np.max(np.abs(y)) + 1e-9), 1.6)
    return fade(y, 0, 0.05)


def burst_tail(dur, tau, lp0, lp1, slaps, seed):
    """End-of-burst report (played aligned with the last shot; the fade-in keeps the shot's own attack single)."""
    global rng
    rng = np.random.default_rng(5000 + seed)
    n = int(dur * SR)
    y = tail_part(dur, tau, lp0, lp1, pre=0.02)
    src = bp(N(int(0.09 * SR)), 180, 1600) * dec(int(0.09 * SR), 0.03)
    for d_, g_, f_ in slaps: put(y, lp(src, f_), d_, g_ * 0.5)
    y = sat(y / (np.max(np.abs(y)) + 1e-9), 1.4)
    return fade(y, 0.035, dur * 0.35)


FIRE = {
    # voice: (builder, kwargs)   -- one family of shots per ammunition class, each with its own colour
    'pistol9':   dict(dur=0.42, crack=1.0, crack_hp=2200, body=0.8, body_band=(260, 1900), body_tau=0.028, mid=0.7, thump=0.5, th_f=(190, 70), th_tau=0.045, mech=0.2, mech_t=0.02, tail=0.2, tail_tau=0.13, drive=2.0, seed=1),
    'pistol45':  dict(dur=0.48, crack=0.9, crack_hp=1700, body=1.0, body_band=(180, 1500), body_tau=0.036, mid=0.55, thump=0.75, th_f=(160, 55), th_tau=0.06, mech=0.18, mech_t=0.024, tail=0.22, tail_tau=0.15, drive=2.3, seed=2),
    'pistol50':  dict(dur=0.7, crack=1.0, crack_hp=1500, body=1.2, body_band=(120, 1300), body_tau=0.055, mid=0.6, thump=1.1, th_f=(130, 40), th_tau=0.11, mech=0.16, mech_t=0.034, tail=0.34, tail_tau=0.24, tail_lp=(2600, 600), drive=3.0, seed=3),
    'revolver':  dict(dur=0.72, crack=1.1, crack_hp=1600, body=1.15, body_band=(140, 1500), body_tau=0.05, mid=0.7, thump=1.0, th_f=(140, 44), th_tau=0.1, mech=0.0, tail=0.36, tail_tau=0.26, tail_lp=(2800, 650), drive=2.8, seed=4),
    'smg9':      dict(dur=0.34, crack=0.9, crack_hp=2300, body=0.8, body_band=(280, 2000), body_tau=0.024, mid=0.75, mid_tau=0.014, thump=0.45, th_f=(200, 75), th_tau=0.038, mech=0.24, mech_t=0.018, tail=0.12, tail_tau=0.09, drive=2.0, seed=5),
    'smg45':     dict(dur=0.36, crack=0.85, crack_hp=1900, body=0.95, body_band=(200, 1700), body_tau=0.03, mid=0.6, thump=0.65, th_f=(170, 60), th_tau=0.048, mech=0.22, mech_t=0.02, tail=0.12, tail_tau=0.1, drive=2.2, seed=6),
    'pdw':       dict(dur=0.32, crack=1.15, crack_hp=2800, crack_tau=0.0032, body=0.7, body_band=(350, 2400), body_tau=0.02, mid=0.9, mid_band=(1400, 5200), mid_tau=0.012, thump=0.35, th_f=(220, 85), th_tau=0.03, mech=0.22, mech_t=0.016, tail=0.11, tail_tau=0.08, drive=1.9, seed=7),
    'carbine':   dict(dur=0.4, crack=1.15, crack_hp=2100, body=0.95, body_band=(200, 1700), body_tau=0.032, mid=0.75, thump=0.7, th_f=(165, 52), th_tau=0.06, mech=0.16, mech_t=0.026, tail=0.14, tail_tau=0.12, drive=2.4, seed=8),
    'ar556':     dict(dur=0.42, crack=1.05, crack_hp=1900, body=1.0, body_band=(170, 1500), body_tau=0.038, mid=0.65, thump=0.8, th_f=(155, 48), th_tau=0.068, mech=0.15, mech_t=0.028, tail=0.15, tail_tau=0.13, drive=2.4, seed=9),
    'bullpup':   dict(dur=0.4, crack=1.0, crack_hp=2000, body=1.05, body_band=(220, 1300), body_tau=0.034, mid=0.8, mid_band=(1100, 3600), thump=0.7, th_f=(175, 55), th_tau=0.058, mech=0.2, mech_t=0.022, mech_f=(1900, 3100, 4700), tail=0.14, tail_tau=0.12, drive=2.3, seed=10),
    'ak545':     dict(dur=0.42, crack=1.0, crack_hp=1800, body=1.05, body_band=(160, 1600), body_tau=0.04, mid=0.7, thump=0.8, th_f=(150, 50), th_tau=0.066, mech=0.2, mech_t=0.03, mech_f=(1700, 2900, 4300), tail=0.15, tail_tau=0.13, drive=2.5, seed=11),
    'ak762':     dict(dur=0.46, crack=0.95, crack_hp=1500, body=1.2, body_band=(130, 1300), body_tau=0.048, mid=0.6, mid_band=(800, 3400), thump=1.0, th_f=(135, 42), th_tau=0.085, mech=0.2, mech_t=0.034, mech_f=(1500, 2600, 4100), tail=0.17, tail_tau=0.15, tail_lp=(2800, 700), drive=2.8, seed=12),
    'br762':     dict(dur=0.5, crack=1.05, crack_hp=1600, body=1.2, body_band=(130, 1400), body_tau=0.05, mid=0.65, thump=1.05, th_f=(130, 40), th_tau=0.09, mech=0.16, mech_t=0.036, tail=0.2, tail_tau=0.17, tail_lp=(2800, 700), drive=2.9, seed=13),
    'lmg556':    dict(dur=0.42, crack=1.0, crack_hp=1800, body=1.1, body_band=(160, 1500), body_tau=0.04, mid=0.7, thump=0.9, th_f=(150, 46), th_tau=0.07, mech=0.26, mech_t=0.03, mech_f=(1600, 2700, 3900), tail=0.15, tail_tau=0.13, drive=2.6, seed=14),
    'lmg762':    dict(dur=0.48, crack=0.95, crack_hp=1500, body=1.25, body_band=(120, 1300), body_tau=0.052, mid=0.6, mid_band=(800, 3200), thump=1.1, th_f=(125, 40), th_tau=0.09, mech=0.26, mech_t=0.036, mech_f=(1400, 2400, 3600), tail=0.17, tail_tau=0.15, tail_lp=(2600, 650), drive=3.0, seed=15),
    'rotary':    dict(dur=0.2, crack=1.0, crack_hp=2000, body=0.9, body_band=(200, 1700), body_tau=0.018, mid=0.7, mid_tau=0.01, thump=0.6, th_f=(160, 60), th_tau=0.03, mech=0.0, tail=0.05, tail_tau=0.05, refl=(), drive=2.4, seed=16),
    'dmr':       dict(dur=0.85, crack=1.15, crack_hp=1700, body=1.15, body_band=(140, 1500), body_tau=0.05, mid=0.7, thump=1.0, th_f=(140, 42), th_tau=0.095, mech=0.14, mech_t=0.04, tail=0.4, tail_tau=0.3, tail_lp=(3000, 700), drive=2.8, seed=17),
    'sniper308': dict(dur=1.15, crack=1.25, crack_hp=1500, crack_tau=0.005, body=1.2, body_band=(120, 1400), body_tau=0.06, mid=0.7, thump=1.15, th_f=(130, 38), th_tau=0.12, mech=0.0, tail=0.5, tail_tau=0.42, tail_lp=(3000, 650),
                      refl=((0.03, 0.3, 2400), (0.07, 0.24, 1700), (0.13, 0.18, 1200), (0.21, 0.12, 900)), drive=3.0, seed=18),
    'sniper338': dict(dur=1.3, crack=1.3, crack_hp=1300, crack_tau=0.0055, body=1.3, body_band=(100, 1300), body_tau=0.07, mid=0.65, thump=1.3, th_f=(115, 34), th_tau=0.15, mech=0.0, tail=0.55, tail_tau=0.5, tail_lp=(2700, 600),
                      refl=((0.032, 0.32, 2200), (0.075, 0.26, 1600), (0.14, 0.2, 1100), (0.23, 0.14, 800)), drive=3.2, seed=19),
    'amr50':     dict(dur=1.5, crack=1.3, crack_hp=1000, crack_tau=0.007, body=1.5, body_band=(80, 1100), body_tau=0.09, mid=0.6, mid_band=(700, 3000), thump=1.6, th_f=(95, 28), th_tau=0.22, mech=0.12, mech_t=0.06, mech_f=(1100, 1900, 2900), tail=0.65, tail_tau=0.6, tail_lp=(2300, 500),
                      refl=((0.035, 0.36, 1900), (0.08, 0.3, 1400), (0.15, 0.24, 1000), (0.26, 0.17, 700)), drive=3.6, seed=20),
    'sgpump':    dict(dur=0.95, crack=0.9, crack_hp=1200, crack_tau=0.006, body=1.5, body_band=(100, 1500), body_tau=0.07, mid=0.8, mid_band=(700, 3600), mid_tau=0.03, thump=1.3, th_f=(110, 36), th_tau=0.14, mech=0.0, tail=0.42, tail_tau=0.3, tail_lp=(2600, 600), drive=3.4, seed=21),
    'sgsemi':    dict(dur=0.7, crack=0.95, crack_hp=1300, crack_tau=0.005, body=1.4, body_band=(110, 1600), body_tau=0.06, mid=0.8, mid_band=(700, 3600), mid_tau=0.026, thump=1.15, th_f=(120, 40), th_tau=0.11, mech=0.2, mech_t=0.04, mech_f=(1300, 2200, 3400), tail=0.3, tail_tau=0.22, tail_lp=(2600, 650), drive=3.2, seed=22),
    'sgdouble':  dict(dur=1.1, crack=0.9, crack_hp=1000, crack_tau=0.007, body=1.6, body_band=(90, 1400), body_tau=0.085, mid=0.75, mid_band=(600, 3200), mid_tau=0.034, thump=1.5, th_f=(100, 32), th_tau=0.17, mech=0.0, tail=0.5, tail_tau=0.36, tail_lp=(2400, 550), drive=3.6, seed=23),
    'sgauto':    dict(dur=0.44, crack=0.95, crack_hp=1300, body=1.35, body_band=(110, 1500), body_tau=0.05, mid=0.75, mid_band=(700, 3400), thump=1.1, th_f=(120, 42), th_tau=0.085, mech=0.24, mech_t=0.036, mech_f=(1200, 2100, 3300), tail=0.14, tail_tau=0.13, drive=3.2, seed=24),
}


# automatic-fire voices get two more takes (f_<voice>_b / _c): the same gun, a different round - noise, body and
# action vary a few per cent, so a long burst never repeats one sample (the game rotates through the takes)
TAKES = ['carbine', 'ar556', 'bullpup', 'ak545', 'ak762', 'br762', 'lmg556', 'lmg762', 'smg9', 'smg45', 'pdw', 'rotary', 'sgauto', 'pistol9']


def take(kw, k):
    t = dict(kw)
    j = np.random.default_rng(777 + 31 * k + kw.get('seed', 0))
    def f(x, a): return x * (1 + j.uniform(-a, a))
    t['seed'] = kw.get('seed', 0) + 100 * k
    for key, a in (('crack', 0.08), ('body', 0.06), ('mid', 0.08), ('thump', 0.06), ('mech', 0.15), ('body_tau', 0.06), ('mid_tau', 0.08), ('th_tau', 0.05)):
        if key in t: t[key] = f(t[key], a)
    if 'body_band' in t: b = t['body_band']; t['body_band'] = (f(b[0], 0.04), f(b[1], 0.04))
    if 'mech_t' in t: t['mech_t'] = f(t['mech_t'], 0.08)
    return t


def spin_loop(dur=1.0):
    """Rotary gun motor: an electric whine with gear harmonics over a mechanical rumble, a seamless loop (whole
    cycles of every partial; the noise is cross-faded with its own start). The game raises its rate with the spin."""
    global rng
    rng = np.random.default_rng(8800)
    n = int(dur * SR); t = np.arange(n) / SR
    y = np.zeros(n)
    for f0, g in ((96, 0.5), (192, 0.32), (288, 0.24), (576, 0.12), (1152, 0.07), (1730, 0.05)):
        f = round(f0 * dur) / dur
        y += np.sin(2 * np.pi * f * t + f0) * g
    am = 1 + 0.18 * np.sin(2 * np.pi * round(24 * dur) / dur * t)           # six barrels passing the feed
    y *= am
    m = int(0.1 * SR)
    noise = bp(N(n + m), 200, 2400)
    head = noise[:m] * np.linspace(0, 1, m) + noise[n:n + m] * np.linspace(1, 0, m)
    noise = noise[:n].copy(); noise[:m] = head
    y = y * 0.8 + noise * 0.35 + lp(N(n), 120, 2)[:n] * 0.0
    return y / (np.max(np.abs(y)) + 1e-9) * 0.9


def gl_thump(seed=0):
    global rng
    rng = np.random.default_rng(7000 + seed)
    dur = 0.7; n = int(dur * SR); t = np.arange(n) / SR
    f = 62 + 150 * np.exp(-t / 0.022)
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * dec(n, 0.085) * 1.3
    y += bp(N(n), 260, 620, 3) * dec(n, 0.05) * 1.1                 # hollow tube
    y += hp(N(n), 2500) * dec(n, 0.004) * 0.35
    m = int(0.05 * SR); tm = np.arange(m) / SR
    c = hp(N(m), 2000) * dec(m, 0.004) + np.sin(2 * np.pi * 1700 * tm) * dec(m, 0.012) * 0.6
    put(y, c, 0.0, 0.25)
    y += tail_part(dur, 0.12, 1500, 500)[:n] * 0.12
    return fade(sat(y / np.max(np.abs(y)), 1.8), 0, 0.08)


def rocket_launch(seed=0):
    global rng
    rng = np.random.default_rng(7100 + seed)
    dur = 1.5; n = int(dur * SR); t = np.arange(n) / SR
    y = gunshot(dur=dur, crack=0.7, crack_hp=1200, crack_tau=0.008, body=1.3, body_band=(90, 1200), body_tau=0.09, mid=0.5, thump=1.5, th_f=(100, 30), th_tau=0.2, mech=0, tail=0.3, tail_tau=0.4, tail_lp=(2000, 500), drive=3.0, seed=77)
    # motor: a roaring hiss that rises and recedes
    env = (1 - np.exp(-t / 0.03)) * np.exp(-t / 0.5)
    sweep = np.zeros(n); x = N(n)
    for k, (lo, hi) in enumerate(((300, 900), (800, 2400), (2000, 6000))):
        e = np.exp(-((t - 0.05 - k * 0.07) ** 2) / (2 * (0.16 + k * 0.05) ** 2))
        sweep += bp(x, lo, hi) * e
    y = y * 0.9 + sweep * env * 1.2 + lp(N(n), 160, 3) * env * 2.0
    return fade(sat(y / np.max(np.abs(y)), 2.2), 0, 0.3)


# ------------------------------------------------------------------ foley primitives (reloads / handling)
def click(f=(2800, 4300), tau=0.004, ring=0.012, noise=1.0, dur=0.07):
    n = int(dur * SR); t = np.arange(n) / SR
    y = hp(N(n), 2600) * dec(n, tau) * noise
    for i, fq in enumerate(f): y += np.sin(2 * np.pi * fq * t + 1.3 * i) * dec(n, ring * (1 + 0.3 * i)) * 0.55
    return y


def clack(weight=1.0, f=(1100, 1900, 3100), ring=0.022, dur=0.16):
    """Metal on metal with some mass behind it."""
    n = int(dur * SR); t = np.arange(n) / SR
    y = bp(N(n), 700, 5200) * dec(n, 0.006) * 1.2 + hp(N(n), 3000) * dec(n, 0.003) * 0.8
    for i, fq in enumerate(f): y += np.sin(2 * np.pi * fq * t + i) * dec(n, ring * (1 + 0.25 * i)) * 0.5
    y += np.sin(2 * np.pi * (150 / (0.6 + 0.4 * weight)) * t) * dec(n, 0.03) * 0.9 * weight
    return y


def scrape(dur=0.09, band=(1400, 5200), rise=True, grit=0.5):
    n = int(dur * SR); t = np.arange(n) / SR
    e = (t / dur) ** 1.5 if rise else (1 - t / dur) ** 0.8
    y = bp(N(n), *band) * e
    y *= 1 + grit * np.sign(np.sin(2 * np.pi * 180 * t * (1 + t * 3)))          # ratchet texture
    return fade(y, 0.004, 0.006) * 0.6


def thud(f=140, tau=0.04, dur=0.14, noise=0.5):
    n = int(dur * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * f * t * (1 - t * 1.5)) * dec(n, tau) + lp(N(n), 900) * dec(n, tau * 0.6) * noise


def rustle(dur=0.25, level=1.0):
    n = int(dur * SR); t = np.arange(n) / SR
    e = np.sin(np.pi * t / dur) ** 2 * (0.6 + 0.4 * np.abs(lp(N(n), 18)) * 6)
    return bp(N(n), 500, 3800) * e * 0.16 * level


def spring(dur=0.09, f0=5200, f1=3200):
    n = int(dur * SR); t = np.arange(n) / SR
    f = f0 + (f1 - f0) * t / dur
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * dec(n, 0.03) * (1 + 0.5 * np.sin(2 * np.pi * 90 * t)) * 0.35


def ping(f=4200, tau=0.05, dur=0.2):
    n = int(dur * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * 1.52 * t + 1)) * dec(n, tau) * 0.4


class Reel:
    """A reload recording being assembled; ev records the event times the animation is keyed from."""
    def __init__(self, dur, seed):
        global rng
        rng = np.random.default_rng(9000 + seed)
        self.buf = np.zeros(int(dur * SR)); self.dur = dur; self.ev = {}
    def add(self, x, t, g=1.0): put(self.buf, x, t, g); return self
    def mark(self, name, t): self.ev[name] = round(float(t), 3); return self
    # composite actions; `t` is always the moment of the main click (the animation key)
    def mag_out(self, t, heavy=1.0, drop=False, key='magOut'):
        self.add(click((2600, 4100)), t - 0.07, 0.5)                       # release button
        self.add(scrape(0.08, (1300, 4600), rise=False), t, 0.8 * heavy)   # magazine sliding out
        self.add(thud(170 / heavy, 0.02, 0.08, 0.4), t, 0.5)
        if drop: self.add(thud(120, 0.05, 0.2, 0.9), t + 0.42, 0.35).add(clack(0.4, (900, 1700, 2600), 0.02), t + 0.43, 0.16)   # hits the ground
        return self.mark(key, t)
    def mag_in(self, t, heavy=1.0, key='magIn'):
        self.add(scrape(0.085, (1200, 4200), rise=True), t - 0.085, 0.85 * heavy)
        self.add(clack(heavy, (950, 1750, 2900)), t, 0.95)
        self.add(click((3000, 4600)), t + 0.012, 0.4)
        return self.mark(key, t)
    def slap(self, t):   # bolt catch: bolt runs forward
        self.add(clack(0.8, (1200, 2100, 3500)), t, 0.9).add(spring(), t + 0.004, 0.8).add(clack(1.0, (800, 1500, 2600)), t + 0.045, 0.8)
        return self.mark('boltPull', t).mark('boltRelease', t + 0.05)
    def charge(self, t_pull, t_rel, heavy=1.0):
        d = max(0.07, min(0.16, t_rel - t_pull))
        self.add(click((2400, 3900)), t_pull, 0.5)
        self.add(scrape(d, (1100, 4000), rise=True, grit=0.7), t_pull, 0.9 * heavy)
        self.add(clack(0.6 * heavy, (1300, 2300, 3700)), t_pull + d, 0.6)
        self.add(spring(0.07), t_rel, 0.8).add(clack(heavy, (850, 1600, 2700)), t_rel + 0.035, 1.0)
        return self.mark('boltPull', t_pull).mark('boltRelease', t_rel)
    def cloth(self, t, dur=0.25, g=1.0): return self.add(rustle(dur), t, g)
    def done(self):
        y = self.buf
        y = y + lp(y, 900) * 0.25
        y = sat(y / (np.max(np.abs(y)) + 1e-9), 1.5)
        return fade(y, 0.005, 0.06), self.ev


def reload_mag(dur, t_out, t_in, bolt=None, heavy=1.0, drop=False, seed=0, slap=False):
    r = Reel(dur, seed)
    r.cloth(0.02, min(0.3, t_out - 0.02), 1.0)
    r.mag_out(t_out, heavy, drop)
    r.cloth(t_out + 0.15, max(0.2, t_in - t_out - 0.3), 0.9)
    r.add(click((1800, 3000), 0.003, 0.008), t_in - 0.2, 0.25)             # fresh magazine pulled from the pouch
    r.mag_in(t_in, heavy)
    if bolt:
        if slap: r.slap(bolt[0])
        else: r.charge(bolt[0], bolt[1], heavy)
    r.cloth(dur - 0.3, 0.26, 0.8)
    return r.done()


def reload_pistol(dur, t_out, t_in, slide=None, seed=0):
    r = Reel(dur, seed)
    r.cloth(0.02, 0.2, 0.7)
    r.add(click((3100, 4800)), t_out - 0.04, 0.6).add(scrape(0.06, (1800, 5600), rise=False), t_out, 0.6).mark('magOut', t_out)
    r.add(thud(150, 0.04, 0.16, 0.9), t_out + 0.36, 0.3).add(clack(0.3, (1200, 2200, 3300), 0.015), t_out + 0.37, 0.14)
    r.cloth(t_out + 0.12, max(0.2, t_in - t_out - 0.22), 0.7)
    r.add(scrape(0.06, (1600, 5200), rise=True), t_in - 0.06, 0.7).add(clack(0.5, (1400, 2500, 3900), 0.016), t_in, 0.9).mark('magIn', t_in)
    if slide:
        r.add(spring(0.06, 6000, 3600), slide[0], 0.7).add(clack(0.6, (1300, 2400, 3800), 0.016), slide[0] + 0.03, 1.0)
        r.mark('boltPull', slide[0] - 0.08).mark('boltRelease', slide[0])
    r.cloth(dur - 0.22, 0.2, 0.6)
    return r.done()


def reload_revolver(dur, seed=0):
    r = Reel(dur, seed); t_open, t_ej, t_in, t_close = 0.3, 0.78, 1.75, 2.2
    r.cloth(0.02, 0.22, 0.7)
    r.add(click((2600, 4200)), t_open - 0.03, 0.7).add(clack(0.5, (1500, 2700, 4100), 0.02), t_open, 0.7).mark('open', t_open)
    r.add(scrape(0.07, (1500, 5000), rise=True), t_ej - 0.07, 0.6).add(clack(0.4, (1700, 2900, 4300), 0.012), t_ej, 0.6).mark('magOut', t_ej)
    for i in range(6): r.add(ping(3900 + rng.uniform(-500, 900), 0.06), t_ej + 0.25 + i * 0.045 + rng.uniform(0, 0.02), 0.3 - i * 0.02)   # brass on the ground
    r.cloth(t_ej + 0.1, 0.5, 0.7)
    for i in range(3): r.add(click((2300, 3700), 0.003, 0.008), t_in - 0.09 + i * 0.03, 0.4)
    r.add(clack(0.5, (1300, 2300, 3600), 0.016), t_in, 0.8).mark('magIn', t_in)
    r.add(thud(160, 0.03, 0.12, 0.7), t_in + 0.22, 0.2)                    # the loader is dropped
    r.add(scrape(0.05, (1500, 4500), rise=True), t_close - 0.05, 0.5).add(clack(0.9, (1000, 1900, 3200)), t_close, 1.0).mark('close', t_close)
    r.cloth(dur - 0.3, 0.26, 0.7)
    return r.done()


def reload_break(dur, big=False, seed=0):
    r = Reel(dur, seed); t_open, t_ej, t_in, t_close = 0.3, 0.6, 1.5, 1.95
    k = 0.7 if big else 1.0
    r.cloth(0.02, 0.22, 0.7)
    r.add(click((2200, 3600)), t_open - 0.05, 0.7).add(clack(1.0, (700 * k, 1300 * k, 2300 * k), 0.03), t_open, 0.9)
    r.add(scrape(0.12, (500, 2200), rise=False, grit=0.9), t_open + 0.01, 0.5).mark('open', t_open)
    for i in range(1 if big else 2):
        r.add(bp(N(int(0.08 * SR)), 300 * k, 900 * k, 3) * dec(int(0.08 * SR), 0.018) * 2.2, t_ej + i * 0.05, 0.7)       # hollow pop of the ejectors
        r.add(thud(200 * k, 0.03, 0.1, 0.9), t_ej + 0.4 + i * 0.07, 0.3)
    r.mark('magOut', t_ej)
    r.cloth(t_ej + 0.15, 0.45, 0.8)
    for i in range(1 if big else 2):
        r.add(scrape(0.05, (900, 3200), rise=True), t_in - 0.05 - (0.11 if i == 0 and not big else 0), 0.6)
        r.add(thud(230 * k, 0.02, 0.08, 0.5), t_in - (0.11 if i == 0 and not big else 0), 0.9)
    r.mark('magIn', t_in)
    r.add(scrape(0.07, (500, 2400), rise=True, grit=0.9), t_close - 0.07, 0.5).add(clack(1.2, (650 * k, 1250 * k, 2200 * k), 0.035), t_close, 1.0).add(click((2500, 4000)), t_close + 0.02, 0.5)
    r.mark('close', t_close)
    r.cloth(dur - 0.3, 0.26, 0.7)
    return r.done()


def reload_belt(dur, charge, seed=0, k=1.0):
    """Belt-fed reload; k stretches the timeline (heavy machine guns take longer: bigger box, longer belt)."""
    r = Reel(dur, seed); t_open, t_out, t_in, t_close = 0.6 * k, 1.5 * k, 3.1 * k, 4.0 * k
    r.cloth(0.02, 0.4, 1.0)
    r.add(click((2100, 3500)), t_open - 0.06, 0.8).add(clack(0.8, (800, 1500, 2600), 0.03), t_open, 0.8)
    r.add(scrape(0.2, (400, 1800), rise=False, grit=1.0), t_open + 0.01, 0.45).mark('open', t_open)                       # cover hinge
    for i in range(4): r.add(ping(3300 + rng.uniform(-400, 700), 0.04), t_open + 0.35 + i * 0.07, 0.16)                   # old links fall away
    r.add(click((1900, 3100)), t_out - 0.08, 0.5).add(scrape(0.1, (700, 2800), rise=False), t_out, 0.8)
    r.add(thud(110, 0.05, 0.2, 1.0), t_out, 0.7).mark('magOut', t_out)                                                     # box unhooked
    r.cloth(t_out + 0.2, 1.0, 1.0)
    for i in range(5): r.add(click((2600, 4100), 0.003, 0.008), t_in - 0.5 + i * 0.06 + rng.uniform(0, 0.02), 0.22)       # belt rattling in the new box
    r.add(scrape(0.1, (700, 2600), rise=True), t_in - 0.1, 0.8).add(clack(1.3, (600, 1150, 2000), 0.04), t_in, 1.0).mark('magIn', t_in)
    for i in range(4): r.add(click((2800, 4400), 0.003, 0.01), t_in + 0.3 + i * 0.09, 0.3)                                # belt laid on the feed tray
    r.add(scrape(0.12, (400, 1800), rise=True, grit=1.0), t_close - 0.12, 0.45)
    r.add(clack(1.5, (550, 1050, 1900), 0.045), t_close, 1.0).add(click((2200, 3700)), t_close + 0.03, 0.6).mark('close', t_close)
    if charge: r.charge(charge[0], charge[1], 1.3)
    r.cloth(dur - 0.4, 0.34, 0.9)
    return r.done()


def reload_tube(dur, t_out, t_in, rocket, seed=0):
    r = Reel(dur, seed)
    r.cloth(0.02, 0.4, 1.0)
    r.add(click((1800, 3000)), t_out, 0.7).add(clack(0.9, (600, 1100, 1900), 0.04), t_out + 0.04, 0.6).mark('magOut', t_out)
    r.cloth(t_out + 0.2, max(0.3, t_in - t_out - 0.7), 1.0)
    r.add(scrape(0.34, (350, 1600), rise=True, grit=0.4), t_in - 0.36, 0.9)                                              # round sliding into the tube
    r.add(clack(1.4, (480, 900, 1600), 0.05), t_in, 1.0).mark('magIn', t_in)
    r.add(click((2100, 3400)), t_in + (0.16 if rocket else 0.3), 0.8)                                                    # lock
    if not rocket: r.add(clack(1.2, (520, 1000, 1700), 0.04), t_in + 0.34, 0.8)
    r.cloth(dur - 0.4, 0.34, 0.9)
    return r.done()


RELOADS = {
    # key: (builder, kwargs) ; tac = magazine change, empty = with the bolt / slide work
    'r_ar_tac':        lambda: reload_mag(2.1, 0.55, 1.5, seed=1),
    'r_ar_empty':      lambda: reload_mag(2.36, 0.5, 1.45, bolt=(1.9, 1.95), slap=True, drop=True, seed=2),
    'r_ak_tac':        lambda: reload_mag(2.4, 0.65, 1.7, heavy=1.25, seed=3),
    'r_ak_empty':      lambda: reload_mag(2.72, 0.6, 1.62, bolt=(2.06, 2.22), heavy=1.25, drop=True, seed=4),
    'r_bullpup_tac':   lambda: reload_mag(2.36, 0.62, 1.68, heavy=1.1, seed=5),
    'r_bullpup_empty': lambda: reload_mag(2.66, 0.58, 1.62, bolt=(2.12, 2.28), heavy=1.1, drop=True, seed=6),
    'r_smg_tac':       lambda: reload_mag(2.0, 0.5, 1.42, heavy=0.8, seed=7),
    'r_smg_empty':     lambda: reload_mag(2.26, 0.48, 1.38, bolt=(1.82, 1.87), slap=True, heavy=0.8, drop=True, seed=8),
    'r_smgbox_tac':    lambda: reload_mag(1.86, 0.45, 1.3, heavy=0.75, seed=9),
    'r_smgbox_empty':  lambda: reload_mag(2.1, 0.42, 1.26, bolt=(1.66, 1.8), heavy=0.75, drop=True, seed=10),
    'r_pdw_tac':       lambda: reload_mag(2.36, 0.6, 1.7, heavy=0.9, seed=11),
    'r_pdw_empty':     lambda: reload_mag(2.66, 0.58, 1.66, bolt=(2.14, 2.3), heavy=0.9, seed=12),
    'r_lmgmag_tac':    lambda: reload_mag(3.8, 0.9, 2.7, heavy=1.6, seed=13),
    'r_lmgmag_empty':  lambda: reload_mag(4.2, 0.86, 2.6, bolt=(3.36, 3.56), heavy=1.6, drop=True, seed=14),
    'r_dmr_tac':       lambda: reload_mag(2.4, 0.62, 1.68, heavy=1.2, seed=15),
    'r_dmr_empty':     lambda: reload_mag(2.72, 0.6, 1.62, bolt=(2.06, 2.22), heavy=1.2, drop=True, seed=16),
    'r_sniper_tac':    lambda: reload_mag(2.5, 0.62, 1.72, heavy=1.2, seed=17),
    'r_sniper_empty':  lambda: reload_mag(3.0, 0.6, 1.66, bolt=(2.16, 2.5), heavy=1.3, seed=18),
    'r_pistol_tac':    lambda: reload_pistol(1.4, 0.3, 0.95, seed=19),
    'r_pistol_empty':  lambda: reload_pistol(1.62, 0.28, 0.95, slide=(1.3, 1.3), seed=20),
    'r_revolver_tac':  lambda: reload_revolver(2.6, seed=21),
    'r_break_tac':     lambda: reload_break(2.3, big=False, seed=22),
    'r_lmgbelt_tac':   lambda: reload_belt(4.6, None, seed=23),
    'r_lmgbelt_empty': lambda: reload_belt(5.3, (4.5, 4.76), seed=24),
    'r_rocket_tac':    lambda: reload_tube(3.3, 0.5, 2.4, True, seed=25),
    'r_tube_tac':      lambda: reload_tube(3.7, 0.7, 2.6, False, seed=26),
    # classes with their own handling: 7.62 battle rifles (heavy box, charging handle slapped down), .50 anti-materiel
    # rifles (very heavy magazine), heavy belt-fed machine guns (bigger box, longer belt), magnum pistols, bullpup /
    # magazine-fed support weapons
    'r_br_tac':        lambda: reload_mag(2.6, 0.7, 1.8, heavy=1.35, seed=27),
    'r_br_empty':      lambda: reload_mag(2.95, 0.66, 1.74, bolt=(2.28, 2.44), heavy=1.35, drop=True, seed=28),
    'r_amr_tac':       lambda: reload_mag(3.3, 0.9, 2.3, heavy=1.8, seed=29),
    'r_amr_empty':     lambda: reload_mag(3.7, 0.86, 2.2, bolt=(2.86, 3.12), heavy=1.8, drop=True, seed=30),
    'r_mgbelt_tac':    lambda: reload_belt(5.8, None, seed=31, k=1.26),
    'r_mgbelt_empty':  lambda: reload_belt(6.5, (5.66, 5.94), seed=32, k=1.26),
    'r_magnum_tac':    lambda: reload_pistol(1.85, 0.42, 1.25, seed=33),
    'r_magnum_empty':  lambda: reload_pistol(2.05, 0.4, 1.24, slide=(1.66, 1.66), seed=34),
    'r_lsw_tac':       lambda: reload_mag(2.9, 0.75, 2.0, heavy=1.3, seed=35),
    'r_lsw_empty':     lambda: reload_mag(3.25, 0.7, 1.95, bolt=(2.5, 2.68), heavy=1.3, drop=True, seed=36),
}


def fx_sounds():
    global rng
    rng = np.random.default_rng(424242)
    X = {}
    def mk(dur): return np.zeros(int(dur * SR))
    b = mk(0.45); put(b, rustle(0.3, 1.6), 0.0); put(b, clack(0.5, (1200, 2200, 3400), 0.015), 0.2, 0.5); put(b, click(), 0.3, 0.4); X['x_equip_rifle'] = b
    b = mk(0.32); put(b, rustle(0.2, 1.4), 0.0); put(b, click((3000, 4700)), 0.14, 0.5); put(b, clack(0.3, (1700, 2900, 4300), 0.01), 0.2, 0.4); X['x_equip_pistol'] = b
    b = mk(0.6); put(b, rustle(0.4, 1.8), 0.0); put(b, clack(1.0, (700, 1300, 2300), 0.03), 0.24, 0.7); put(b, clack(0.6, (1000, 1900, 3000), 0.02), 0.4, 0.5); X['x_equip_heavy'] = b
    b = mk(0.4); put(b, rustle(0.16, 1.2), 0.0); n = int(0.3 * SR); t = np.arange(n) / SR
    put(b, (np.sin(2 * np.pi * (5200 + 2600 * t / 0.3) * t) + hp(N(n), 4000) * 0.6) * np.sin(np.pi * t / 0.3) ** 2 * dec(n, 0.12) * 0.5, 0.08); X['x_equip_blade'] = b
    b = mk(0.14); put(b, click((2300, 3600), 0.003, 0.012), 0.0, 1.0); put(b, thud(260, 0.012, 0.05, 0.3), 0.0, 0.3); X['x_dry'] = b
    b = mk(0.24); put(b, scrape(0.05, (1100, 3600), rise=True), 0.0, 0.7); put(b, clack(0.5, (1500, 2600, 3800), 0.012), 0.05, 0.9); put(b, thud(240, 0.02, 0.07, 0.4), 0.05, 0.5); X['x_shell_in'] = b
    # pump: back at 0.20-0.27 s, forward and locked at 0.42-0.50 s (the fore-end animation peaks at 0.275 s of 0.55 s)
    b = mk(0.6); put(b, scrape(0.08, (900, 3400), rise=True, grit=0.9), 0.19, 1.0); put(b, clack(1.0, (800, 1500, 2600), 0.03), 0.27, 1.0)
    put(b, scrape(0.08, (1000, 3800), rise=True, grit=0.9), 0.4, 1.0); put(b, clack(1.2, (700, 1350, 2400), 0.035), 0.48, 1.0); X['x_pump'] = b
    # bolt action: lift 0.25 s, drawn back 0.42 s, driven forward 0.61 s, locked down 0.72 s (keys of the hand animation)
    b = mk(0.95); put(b, click((2500, 4000)), 0.24, 0.8); put(b, scrape(0.14, (1200, 4400), rise=True, grit=0.5), 0.28, 0.9); put(b, clack(0.8, (1000, 1800, 3000), 0.02), 0.42, 0.9)
    put(b, ping(4300, 0.05), 0.47, 0.5); put(b, scrape(0.14, (1300, 4800), rise=True, grit=0.5), 0.47, 0.9); put(b, clack(0.9, (900, 1700, 2900), 0.02), 0.61, 1.0); put(b, clack(0.6, (1300, 2300, 3600), 0.015), 0.72, 0.8); X['x_bolt_cycle'] = b
    b = mk(0.26); put(b, spring(0.07), 0.0, 0.8); put(b, clack(1.0, (850, 1600, 2700)), 0.04, 1.0); X['x_bolt_close'] = b
    n = int(0.32 * SR); t = np.arange(n) / SR
    X['x_swing_blade'] = bp(N(n), 1800, 9000) * np.exp(-((t - 0.12) ** 2) / (2 * 0.04 ** 2)) + hp(N(n), 5000) * np.exp(-((t - 0.13) ** 2) / (2 * 0.02 ** 2)) * 0.5
    n = int(0.4 * SR); t = np.arange(n) / SR
    X['x_swing_blunt'] = bp(N(n), 300, 2400) * np.exp(-((t - 0.16) ** 2) / (2 * 0.06 ** 2)) * 1.2
    b = mk(0.34); put(b, bp(N(int(0.1 * SR)), 1500, 7000) * dec(int(0.1 * SR), 0.02), 0.0, 0.9); put(b, thud(150, 0.045, 0.2, 1.2), 0.0, 1.0); put(b, lp(N(int(0.2 * SR)), 1200) * dec(int(0.2 * SR), 0.05), 0.02, 0.5); X['x_hit_blade'] = b
    b = mk(0.36); put(b, thud(95, 0.06, 0.26, 1.4), 0.0, 1.2); put(b, bp(N(int(0.08 * SR)), 500, 3000) * dec(int(0.08 * SR), 0.012), 0.0, 1.0); put(b, clack(0.4, (700, 1300, 2100), 0.02), 0.005, 0.4); X['x_hit_blunt'] = b
    return {k: fade(sat(v / (np.max(np.abs(v)) + 1e-9), 1.4), 0.002, 0.04) for k, v in X.items()}


TAILS = {
    'ft_rifle':  (1.3, 0.34, 3000, 750, ((0.04, 0.5, 2200), (0.09, 0.4, 1600), (0.17, 0.3, 1100), (0.28, 0.2, 800)), 1),
    'ft_smg':    (0.9, 0.22, 3400, 900, ((0.03, 0.45, 2600), (0.07, 0.35, 1900), (0.13, 0.22, 1300)), 2),
    'ft_lmg':    (1.5, 0.42, 2700, 650, ((0.045, 0.55, 2000), (0.1, 0.45, 1500), (0.19, 0.34, 1000), (0.31, 0.24, 750)), 3),
    'ft_pistol': (0.8, 0.2, 3400, 950, ((0.03, 0.4, 2600), (0.07, 0.3, 1900)), 4),
    'ft_sg':     (1.4, 0.4, 2500, 600, ((0.05, 0.55, 1900), (0.11, 0.45, 1400), (0.2, 0.32, 950)), 5),
    'ft_rotary': (1.6, 0.46, 2800, 700, ((0.04, 0.5, 2100), (0.09, 0.42, 1500), (0.17, 0.32, 1050), (0.29, 0.22, 780)), 6),
    'ft_sup':    (0.5, 0.11, 1700, 600, ((0.03, 0.3, 1500),), 7),
}
TAIL_OF = {'carbine': 'ft_rifle', 'ar556': 'ft_rifle', 'ak762': 'ft_rifle', 'ak545': 'ft_rifle', 'br762': 'ft_rifle', 'bullpup': 'ft_rifle', 'smg9': 'ft_smg', 'smg45': 'ft_smg', 'pdw': 'ft_smg',
           'lmg556': 'ft_lmg', 'lmg762': 'ft_lmg', 'pistol9': 'ft_pistol', 'sgauto': 'ft_sg', 'rotary': 'ft_rotary', 'sup_pistol': 'ft_sup', 'sup_smg': 'ft_sup', 'sup_rifle': 'ft_sup'}

# ------------------------------------------------------------------ precision rifles (their own synthesis)
SNIPER = {
    # dur, crack, blast band, blast tau, boom start/end Hz, boom tau, ring Hz, ring level, brake (AMR muzzle brake side blast), seed
    'dmr':       dict(dur=0.75, crack=1.15, band=(150, 1700), tau=0.055, boom=(120, 42), btau=0.12, ring=(3900, 5600), ringv=0.10, brake=0.0, mech=0.16, seed=31),
    'sniper308': dict(dur=0.9, crack=1.35, band=(120, 1500), tau=0.07, boom=(110, 36), btau=0.17, ring=(4300, 6100), ringv=0.14, brake=0.0, mech=0.0, seed=32),
    'sniper338': dict(dur=1.0, crack=1.45, band=(100, 1350), tau=0.085, boom=(98, 32), btau=0.21, ring=(3900, 5800), ringv=0.12, brake=0.25, mech=0.0, seed=33),
    'amr50':     dict(dur=1.2, crack=1.4, band=(70, 1150), tau=0.11, boom=(86, 26), btau=0.28, ring=(2700, 4300), ringv=0.1, brake=0.6, mech=0.12, seed=34),
}


def sniper_shot(dur, crack, band, tau, boom, btau, ring, ringv, brake, mech, seed):
    """Report of a high-velocity rifle as the shooter hears it: the supersonic crack and the muzzle blast arrive on the
    first samples (a hard N-wave and a bright snap), a heavy concussive body, a deep sub boom that the chest feels,
    a short metallic ring of barrel and action, and early slap-backs from the ground. The long rolling echo is a
    separate voice (ft_sniper / ft_amr) that the game adds outdoors."""
    global rng
    saved = rng; rng = np.random.default_rng(6000 + seed)
    n = int(dur * SR); t = np.arange(n) / SR
    y = np.zeros(n)
    k = int(0.0016 * SR); nw = np.concatenate([np.linspace(0, 1, k // 4), np.linspace(1, -0.85, k // 2), np.linspace(-0.85, 0, k - k // 4 - k // 2)])
    y[:k] += nw * crack * 1.6                                                     # N-wave (the crack)
    y += hp(N(n), 2600, 3) * dec(n, 0.0028) * crack * 1.2                        # supersonic snap
    y += bp(N(n), 1800, 7000) * dec(n, 0.009) * 0.7                              # bright blast edge
    y += bp(N(n), *band) * dec(n, tau) * 1.9                                      # concussive body
    y += lp(N(n), 380, 3) * dec(n, tau * 1.8) * 1.4                               # low pressure wave
    f = boom[1] + (boom[0] - boom[1]) * np.exp(-t / 0.035)
    y += np.sin(2 * np.pi * np.cumsum(f) / SR) * dec(n, btau) * 1.5              # sub boom
    if brake > 0:                                                                 # muzzle brake: a second, sideways blast
        b2 = bp(N(n), 300, 2600) * dec(n, 0.03) * brake * 1.4
        y += np.concatenate([np.zeros(int(0.0045 * SR)), b2[:n - int(0.0045 * SR)]])
    rr = np.zeros(n)
    for i, fq in enumerate(ring): rr += np.sin(2 * np.pi * fq * t + i) * dec(n, 0.045 + 0.02 * i)
    y += rr * ringv * (1 - np.exp(-t / 0.002))                                   # barrel / action ring
    if mech > 0:
        m = int(0.06 * SR); c = hp(N(m), 2400) * dec(m, 0.004) + np.sin(2 * np.pi * 1900 * np.arange(m) / SR) * dec(m, 0.012) * 0.5
        put(y, c, 0.05, mech)
    dry = y.copy()
    for d_, g_, f_ in ((0.012, 0.42, 3000), (0.031, 0.34, 2200), (0.058, 0.26, 1500), (0.097, 0.2, 1100), (0.16, 0.14, 800)):
        put(y, lp(dry, f_), d_, g_)                                               # ground / near-object slap-backs
    y += tail_part(dur, 0.22, 2400, 600)[:n] * 0.32
    y = sat(y / (np.max(np.abs(y)) + 1e-9), 3.4)
    rng = saved
    return fade(y, 0, 0.12)


def rolling_echo(dur, seed, low=1.0):
    """Outdoor rolling echo of a big rifle: the report coming back from terrain at several distances, each return
    duller and longer than the one before, over a low rumble that rolls away."""
    global rng
    saved = rng; rng = np.random.default_rng(6100 + seed)
    n = int(dur * SR); t = np.arange(n) / SR
    src = bp(N(int(0.25 * SR)), 90, 1400) * dec(int(0.25 * SR), 0.06) + lp(N(int(0.25 * SR)), 200, 3) * dec(int(0.25 * SR), 0.09) * 1.5 * low
    y = np.zeros(n)
    for d_, g_, f_ in ((0.16, 0.9, 1900), (0.33, 0.75, 1400), (0.55, 0.62, 1100), (0.82, 0.5, 850), (1.15, 0.38, 650), (1.55, 0.28, 520), (2.0, 0.2, 420)):
        if d_ < dur: put(y, lp(src, f_) * (1 + 0.15 * rng.standard_normal()), d_ + rng.uniform(-0.02, 0.02), g_)
    env = (1 - np.exp(-t / 0.08)) * np.exp(-t / (dur * 0.38))
    y += lp(N(n), 160, 3) * env * 1.6 * low + lp(N(n), 700, 2) * env * 0.5          # the rumble rolling away
    y = sat(y / (np.max(np.abs(y)) + 1e-9), 1.5)
    rng = saved
    return fade(y, 0.03, dur * 0.4)

LEVEL = {'pistol9': 0.8, 'pistol45': 0.85, 'pistol50': 0.95, 'revolver': 0.95, 'smg9': 0.78, 'smg45': 0.8, 'pdw': 0.78, 'carbine': 0.88, 'ar556': 0.9, 'bullpup': 0.88, 'ak545': 0.9, 'ak762': 0.95,
         'br762': 0.97, 'lmg556': 0.92, 'lmg762': 0.97, 'rotary': 0.7, 'dmr': 0.97, 'sniper308': 1.0, 'sniper338': 1.0, 'amr50': 1.0, 'sgpump': 1.0, 'sgsemi': 0.97, 'sgdouble': 1.0, 'sgauto': 0.92,
         'gl40': 0.85, 'rocket': 1.0, 'sup_pistol': 0.5, 'sup_smg': 0.5, 'sup_rifle': 0.56, 'sup_sniper': 0.62}


def main():
    fire, reload_, fx = {}, {}, {}
    meta = {'levels': {}, 'tails': {k: v for k, v in TAIL_OF.items()}, 'reload': {}, 'fire': {}, 'fx': {}}
    report = []
    shots = {k: gunshot(**v) for k, v in FIRE.items()}
    for k in TAKES:
        for i, suf in ((1, '_b'), (2, '_c')): shots[k + suf] = gunshot(**take(FIRE[k], i))
    shots['gl40'] = gl_thump(); shots['rocket'] = rocket_launch()
    shots['sup_pistol'] = suppressed(dur=0.3, band=(700, 6000), tau=0.016, thump=0.25, mech=0.5, mech_t=0.016, seed=1)
    shots['sup_smg'] = suppressed(dur=0.3, band=(600, 5400), tau=0.018, thump=0.3, mech=0.5, mech_t=0.016, seed=2)
    shots['sup_rifle'] = suppressed(dur=0.38, band=(450, 5000), tau=0.026, thump=0.45, mech=0.38, mech_t=0.026, seed=3)
    shots['sup_sniper'] = suppressed(dur=0.6, band=(350, 4600), tau=0.04, thump=0.7, th_f=(100, 40), mech=0.0, hiss=0.4, seed=4)
    for k, kw in SNIPER.items(): shots[k] = sniper_shot(**kw)      # precision rifles: their own synthesis
    for k, y in shots.items():
        onset = int(np.argmax(np.abs(y) > 0.05 * np.max(np.abs(y)))) / SR * 1000
        e, snr = pack_sound(y, SR, 'mulaw'); fire['f_' + k] = e
        meta['levels']['f_' + k] = LEVEL.get(k.replace('_b', '').replace('_c', ''), 0.9); meta['fire']['f_' + k] = {'dur': round(len(y) / SR, 3), 'onsetMs': round(onset, 2)}
        report.append('f_%-11s %.2fs onset %.2f ms  rms %.1f dB  snr %.0f dB' % (k, len(y) / SR, onset, 20 * math.log10(np.sqrt(np.mean(y ** 2)) + 1e-9), snr))
    for k, dur, seed, low in (('ft_sniper', 2.6, 1, 1.0), ('ft_amr', 3.2, 2, 1.35), ('ft_dmr', 1.8, 3, 0.8)):
        y = resample(rolling_echo(dur, seed, low), 32000)
        e, snr = pack_sound(y, 32000, 'adpcm'); fire[k] = e; meta['levels'][k] = 0.62
        report.append('%-13s %.2fs snr %.0f dB' % (k, dur, snr))
    for k, (dur, tau, a, b, slaps, seed) in TAILS.items():
        y = resample(burst_tail(dur, tau, a, b, slaps, seed), 32000)
        e, snr = pack_sound(y, 32000, 'adpcm'); fire[k] = e; meta['levels'][k] = 0.5
        report.append('%-13s %.2fs snr %.0f dB' % (k, dur, snr))
    for k, fn in RELOADS.items():
        y, ev = fn()
        e, snr = pack_sound(resample(y, 32000), 32000, 'adpcm'); reload_[k] = e
        meta['levels'][k] = 0.62; meta['reload'][k] = {'dur': round(len(y) / SR, 3), 'events': ev}
        report.append('%-16s %.2fs %s snr %.0f dB' % (k, len(y) / SR, ev, snr))
    fxs = fx_sounds(); fxs['x_spin'] = spin_loop()
    for k, y in fxs.items():
        y32 = signal.resample(y, int(len(y) * 32000 / SR)) if k == 'x_spin' else resample(y, 32000)   # FFT resampling keeps the loop seamless
        e, snr = pack_sound(y32, 32000, 'adpcm'); fx[k] = e
        meta['levels'][k] = 0.55 if k.startswith('x_equip') else 0.42 if k == 'x_spin' else 0.6; meta['fx'][k] = {'dur': round(len(y) / SR, 3)}
        report.append('%-16s %.2fs snr %.0f dB' % (k, len(y) / SR, snr))
    meta['fx']['x_bolt_cycle']['events'] = {'lift': 0.25, 'back': 0.42, 'fwd': 0.61, 'down': 0.72}
    meta['fx']['x_pump']['events'] = {'back': 0.27, 'fwd': 0.48}
    sizes = {}
    for name, sounds in (('arsenal_fire', fire), ('arsenal_reload', reload_), ('arsenal_fx', fx)):
        p = os.path.join(OUT, name + '.json')
        with open(p, 'w', encoding='utf-8') as f:
            json.dump({'format': 'asz-audio-1', 'sounds': sounds}, f, separators=(',', ':'))
        sizes[name] = os.path.getsize(p)
    with open(os.path.join(OUT, 'arsenal_audio.json'), 'w', encoding='utf-8') as f:
        json.dump(meta, f, indent=1)
    print('\n'.join(report))
    print('sizes:', {k: '%.2f MB' % (v / 1048576) for k, v in sizes.items()}, 'sounds:', len(fire), len(reload_), len(fx))
    # spectrogram sheet for a look at the results (dev only)
    if '--plot' in sys.argv:
        from PIL import Image
        os.makedirs(os.path.join(ROOT, 'tools', 'out'), exist_ok=True)
        keys = ['carbine', 'ak762', 'dmr', 'pistol9', 'sniper308', 'sniper338', 'amr50', 'rocket']
        W, H = 420, 150; img = Image.new('RGB', (W * 4, H * 2), (10, 12, 16))
        for i, k in enumerate(keys):
            y = shots[k]; f_, t_, S = signal.spectrogram(y, SR, nperseg=512, noverlap=384)
            S = 10 * np.log10(S[:160] + 1e-12); S = np.clip((S - S.max() + 70) / 70, 0, 1)[::-1]
            im = Image.fromarray((S * 255).astype(np.uint8)).resize((W - 4, H - 4)); img.paste(Image.merge('RGB', (im, im.point(lambda v: int(v * 0.7)), im.point(lambda v: int(v * 0.3)))), ((i % 4) * W + 2, (i // 4) * H + 2))
        img.save(os.path.join(ROOT, 'tools', 'out', 'au_fire_spec.png'))


if __name__ == '__main__':
    main()
