"""Preserve supplied MP3s and build lossless PCM16 gameplay clips for the game's mixer.

The supplied fire MP3s are multi-shot demonstrations. A single attack is extracted
from each so one trigger event produces exactly one audible report.
"""
from pathlib import Path
import base64
import json
import re
import shutil
import subprocess
import imageio_ffmpeg
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
BASE = Path(r"K:\Games 2026\Y8 Games 2026\Assets 2\Weapons Pack 2026\Individual Weapons Sounds 2026\Final Weapons Sounds 2026")
OUT = ROOT / 'src' / 'assets' / 'audio'
ORIG = OUT / 'supplied_mp3'
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
SR = 44100
AUDIT = json.loads((ROOT / 'tools' / 'out' / 'supplied_audio_audit.json').read_text())

def decode(path):
    raw = subprocess.check_output([FFMPEG, '-v', 'error', '-i', str(path), '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'])
    return np.frombuffer(raw, dtype='<f4').copy()

def encode(y):
    peak = float(np.max(np.abs(y))) if len(y) else 0
    if peak > 0.98: y = y * (0.98 / peak)
    y = np.clip(y, -1, 1)
    raw = (y * 32767).astype('<i2').tobytes()
    return {'rate': SR, 'n': len(y), 'c': 'pcm16', 'd': base64.b64encode(raw).decode('ascii')}

def key(name):
    return re.sub(r'[^a-z0-9]+', '_', name.lower().replace('.mp3', '')).strip('_')

def peak_near(y, lo, hi):
    a, b = int(lo * SR), min(len(y), int(hi * SR))
    if b <= a: return round(lo, 3)
    # 12 ms energy windows, so a mechanical impact gets the animation key.
    hop = 529
    z = y[a:a + (b-a)//hop*hop].reshape(-1, hop)
    if not len(z): return round(lo, 3)
    rms = np.sqrt(np.mean(z*z, axis=1))
    return round((a + int(np.argmax(rms))*hop) / SR, 3)

def main():
    fire, reloads, meta = {}, {}, {'fire': {}, 'reload': {}, 'source': {}, 'format': 'supplied-audio-1'}
    ORIG.mkdir(exist_ok=True)
    maxima = {'assault_rifle': .21, 'asasault_rifle': .21, 'light_machine_gun': .19,
              'machine_gun': .28, 'pistol': .34, 'rpg': 1.35, 'shotgun': .39,
              'sub_machine_gun': .15}
    for group, items in AUDIT.items():
        for item in items:
            path = BASE / group / item['name']
            shutil.copy2(path, ORIG / (('fire__' if group.startswith('Gun') else 'reload__') + item['name']))
            y = decode(path)
            stem = key(item['name'])
            if group.startswith('Gun'):
                voice = 'sf_' + stem
                typ = next((k for k in maxima if stem.startswith(k)), None)
                limit = maxima[typ] if typ else .2
                onset = max(0, float(item['onset'] or 0) - .006)
                later = [t for t in item['attacks'] if t > onset + .075]
                dur = min(limit, max(.075, later[0] - onset - .012)) if later else limit
                start = int(onset * SR)
                clip = y[start:min(len(y), start + int(dur * SR))].copy()
                fade = min(len(clip)//3, int(.024 * SR))
                if fade: clip[-fade:] *= np.linspace(1, 0, fade, dtype=np.float32)
                fire[voice] = encode(clip)
                meta['fire'][voice] = {'dur': round(len(clip)/SR, 3), 'onsetMs': 0, 'original': item['name']}
            else:
                voice = 'sr_' + stem
                reloads[voice] = encode(y)
                dur = len(y)/SR
                mag_out = peak_near(y, dur*.14, dur*.42)
                mag_in = peak_near(y, max(mag_out+.25, dur*.48), dur*.77)
                bolt = peak_near(y, max(mag_in+.15, dur*.78), dur*.91)
                meta['reload'][voice] = {'id': voice, 'dur': round(dur, 3), 'events': {
                    'magOut': mag_out, 'magIn': mag_in, 'boltPull': bolt,
                    'boltRelease': min(round(dur*.94, 3), round(bolt+.14, 3))},
                    'original': item['name'], 'markersEstimated': True}
            meta['source'][voice] = {'file': item['name'], 'directory': group, 'originalSeconds': item['seconds']}
    # A shell insertion is taken from each supplied shotgun reload demonstration.
    for i in (1, 2):
        name = f'sr_shotgun_reload_{i}'
        if name not in reloads: continue
        source = next((BASE / 'Reload Sounds Selected').glob(f'Shotgun Reload {i}.mp3'))
        y = decode(source)
        t = meta['reload'][name]['events']['magIn']
        start = max(0, int((t-.055)*SR)); clip = y[start:min(len(y), start+int(.23*SR))].copy()
        fade = min(int(.025*SR), len(clip)//3)
        if fade: clip[-fade:] *= np.linspace(1, 0, fade, dtype=np.float32)
        reloads[f'sr_shell_{i}'] = encode(clip)
    (OUT / 'supplied_fire.json').write_text(json.dumps({'format':'asz-audio-1','sounds':fire}, separators=(',',':')))
    (OUT / 'supplied_reload.json').write_text(json.dumps({'format':'asz-audio-1','sounds':reloads}, separators=(',',':')))
    (OUT / 'supplied_audio.json').write_text(json.dumps(meta, indent=2))
    print('Imported',len(fire),'single-fire clips and',len(reloads),'reload clips; originals kept at',ORIG)

if __name__ == '__main__': main()
