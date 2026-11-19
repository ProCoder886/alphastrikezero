"""Inspect supplied MP3 recordings without modifying them."""
from pathlib import Path
import json
import subprocess
import imageio_ffmpeg
import numpy as np

BASE = Path(r"K:\Games 2026\Y8 Games 2026\Assets 2\Weapons Pack 2026\Individual Weapons Sounds 2026\Final Weapons Sounds 2026")
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()

def read(path):
    raw = subprocess.check_output([FFMPEG, '-v', 'error', '-i', str(path), '-ac', '1', '-ar', '22050', '-f', 'f32le', '-'])
    return np.frombuffer(raw, dtype='<f4')

def inspect(path):
    y = read(path)
    hop = 220
    z = y[:len(y) // hop * hop].reshape(-1, hop)
    env = np.max(np.abs(z), axis=1)
    peak = float(np.max(env)) if len(env) else 0
    active = np.flatnonzero(env > max(peak * 0.08, 0.005))
    onset = round(float(active[0] * hop / 22050), 3) if len(active) else None
    end = round(float((active[-1] + 1) * hop / 22050), 3) if len(active) else None
    # Separate sharp attacks by at least 70 ms. This is diagnostic only.
    changes = np.flatnonzero((env[1:] > np.maximum(env[:-1] * 2.4, peak * 0.13)) & (env[1:] > peak * 0.16)) + 1
    attacks = []
    for k in changes:
        t = round(float(k * hop / 22050), 2)
        if not attacks or t - attacks[-1] >= 0.07:
            attacks.append(t)
    return {'name': path.name, 'seconds': round(len(y) / 22050, 3), 'onset': onset, 'end': end,
            'peak': round(peak, 3), 'attacks': attacks[:30]}

if __name__ == '__main__':
    data = {folder: [inspect(p) for p in sorted((BASE / folder).glob('*.mp3'))]
            for folder in ('Gun Fire Selected', 'Reload Sounds Selected')}
    out = Path(__file__).resolve().parent / 'out' / 'supplied_audio_audit.json'
    out.parent.mkdir(exist_ok=True)
    out.write_text(json.dumps(data, indent=2))
    for folder, entries in data.items():
        print(folder)
        for e in entries:
            print(f"  {e['name']:<36} {e['seconds']:>5.2f}s onset={e['onset']} active-end={e['end']} attacks={e['attacks'][:10]}")
    print('Saved', out)
