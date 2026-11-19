"""Check imported audio against the source manifest and mixer format."""
from pathlib import Path
import base64
import json
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
AUDIO = ROOT / 'src' / 'assets' / 'audio'
meta = json.loads((AUDIO / 'supplied_audio.json').read_text())
packs = [json.loads((AUDIO / n).read_text())['sounds'] for n in ('supplied_fire.json', 'supplied_reload.json')]
all_sounds = packs[0] | packs[1]
assert len(meta['source']) == 52, 'A source MP3 is missing from the import'
assert len(list((AUDIO / 'supplied_mp3').glob('*.mp3'))) == 52, 'Original MP3 archive is incomplete'
assert len(packs[0]) == 26 and len(packs[1]) == 28
for name, sound in all_sounds.items():
    assert sound['c'] == 'pcm16' and sound['rate'] == 44100, name
    data = np.frombuffer(base64.b64decode(sound['d']), dtype='<i2')
    assert len(data) == sound['n'] and np.max(np.abs(data.astype(np.int32))) > 100, name
    assert np.max(np.abs(data.astype(np.int32))) < 32767, name
for name, info in meta['reload'].items():
    assert name in packs[1]
    ev = info['events']
    assert 0 <= ev['magOut'] < ev['magIn'] < info['dur'], name
    assert ev['magIn'] < ev['boltPull'] < info['dur'], name
print('Validated 52 originals, 26 single-shot clips, 26 full reload clips, and 2 shell inserts.')
