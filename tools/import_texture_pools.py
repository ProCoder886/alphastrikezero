"""Imports the texture library folders used by RANDOM OPS - OUTDOOR into src/assets/texpool.

python -I tools/import_texture_pools.py "<...>/Game Textures 2026" [--sheet]

The library images are 1520x760 preview renders (the material on a tilted, lit plane), not flat tileable maps, so
every image is made usable first:
  1. pattern straightened: the dominant edge direction (brick courses, paving joints, corrugation) is found from a
     gradient-orientation histogram and the image is rotated so it runs along the texture axes
  2. central 512 x 512 crop
  3. lighting flattened: the large-scale brightness gradient / edge darkening of the render is divided out
  4. saved as WebP; the game tiles it with MIRRORED repeat, which is seamless for any image
  5. a normal map is derived from the luminance (Sobel)
Output: src/assets/texpool/<category>/<name>.webp + <name>_n.webp and src/assets/texpool/manifest.json
        (per texture: average colour, ground kind, and whether it had a regular pattern)
"""
import os, sys, json, io
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'src', 'assets', 'texpool')
CATS = {'terrain': 'Terrain and Ground', 'wall': 'Bricks and Wall', 'road': 'Asphalt', 'stone': 'Stones', 'metal': 'Metal'}
SIZE = 512


def slug(name):
    s = os.path.splitext(name)[0].lower()
    s = ''.join(c if c.isalnum() else '_' for c in s)
    while '__' in s: s = s.replace('__', '_')
    return s.strip('_')


def dominant_angle(lum):
    """Angle (degrees, -45..45) to rotate the image by so its dominant structure is axis-aligned, and its strength."""
    g = ndimage.gaussian_filter(lum, 1.5)
    gx = ndimage.sobel(g, axis=1); gy = ndimage.sobel(g, axis=0)
    mag = np.hypot(gx, gy)
    thr = np.percentile(mag, 70)
    m = mag > thr
    ang = (np.degrees(np.arctan2(gy[m], gx[m])) % 90.0)
    hist, _ = np.histogram(ang, bins=90, range=(0, 90), weights=mag[m])
    hist = ndimage.gaussian_filter1d(hist, 2.0, mode='wrap')
    p = int(np.argmax(hist)); strength = float(hist[p] / (hist.mean() + 1e-9))
    a = p + 0.5
    return (a if a <= 45 else a - 90), strength


def flatten(rgb):
    """Divide out the render's low-frequency lighting (keeps the colour, evens the brightness)."""
    lum = rgb @ np.array([0.299, 0.587, 0.114])
    low = ndimage.gaussian_filter(lum, 70, mode='reflect')
    k = (low.mean() / np.maximum(low, 1e-3))[..., None]
    out = rgb * (0.25 + 0.75 * k)                      # 75 % correction: fully flat images look artificial
    # gentle contrast normalisation to a common exposure
    l2 = out @ np.array([0.299, 0.587, 0.114]); mean = l2.mean()
    target = np.clip(mean, 0.22, 0.6)
    return np.clip(out * (target / max(mean, 1e-3)), 0, 1)


def normal_map(rgb, strength):
    lum = ndimage.gaussian_filter(rgb @ np.array([0.299, 0.587, 0.114]), 0.9, mode='mirror')
    gx = ndimage.sobel(lum, axis=1, mode='mirror') * strength; gy = ndimage.sobel(lum, axis=0, mode='mirror') * strength
    n = np.dstack([-gx, gy, np.ones_like(lum)]); n /= np.linalg.norm(n, axis=2, keepdims=True)
    return ((n * 0.5 + 0.5) * 255).astype(np.uint8)


def ground_kind(name):
    n = name
    if 'snow' in n: return 'snow'
    if any(k in n for k in ('sand', 'coast', 'beach', 'laterite')): return 'sand'
    if any(k in n for k in ('grass', 'forest', 'leaves', 'mulch', 'flower', 'moss', 'park')): return 'grass'
    if any(k in n for k in ('gravel', 'pebble', 'rock', 'stone', 'trail', 'brick')): return 'gravel'
    return 'dirt'


def process(path):
    im = Image.open(path).convert('RGB')
    w, h = im.size
    side = min(w, h)
    im = im.crop(((w - side * 1.4) // 2, 0, (w + side * 1.4) // 2, h)) if w > side * 1.4 else im
    lum = np.asarray(im.convert('L'), dtype=np.float64) / 255
    ang, strength = dominant_angle(lum[::2, ::2])
    structured = strength > 1.9
    # every image is turned to its dominant direction (even a weak one): lines that run along the axes mirror
    # seamlessly, slanted ones would turn into chevrons and diamonds
    if abs(ang) > 0.8:
        im = im.rotate(ang, resample=Image.BICUBIC, expand=False)      # PIL rotates counter-clockwise for positive angles
    w, h = im.size
    crop = min(int(h / 1.42), 536)                                      # stays inside the rotated frame
    im = im.crop(((w - crop) // 2, (h - crop) // 2, (w + crop) // 2, (h + crop) // 2)).resize((SIZE, SIZE), Image.LANCZOS)
    rgb = flatten(np.asarray(im, dtype=np.float64) / 255)
    return rgb, structured, ang, strength


def main():
    src = sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith('--') else None
    if not src or not os.path.isdir(src): sys.exit('usage: python -I tools/import_texture_pools.py "<Game Textures 2026 folder>" [--sheet]')
    manifest, total, sheet = {}, 0, []
    for cat, folder in CATS.items():
        d = os.path.join(src, folder); os.makedirs(os.path.join(OUT, cat), exist_ok=True)
        entries, seen = [], set()
        for f in sorted(os.listdir(d)):
            if not f.lower().endswith(('.webp', '.png', '.jpg', '.jpeg')): continue
            name = slug(f)
            if name.endswith('_1') and name[:-2] in seen: continue      # "(1)" duplicates
            seen.add(name)
            try: rgb, structured, ang, strength = process(os.path.join(d, f))
            except Exception as e:
                print('skip', f, e); continue
            a8 = (rgb * 255 + 0.5).astype(np.uint8)
            p = os.path.join(OUT, cat, name + '.webp'); Image.fromarray(a8).save(p, 'WEBP', quality=82, method=6)
            pn = os.path.join(OUT, cat, name + '_n.webp')
            Image.fromarray(normal_map(rgb, 2.2 if cat in ('wall', 'stone') else 1.6)).save(pn, 'WEBP', quality=84, method=6)
            total += os.path.getsize(p) + os.path.getsize(pn)
            avg = (rgb.reshape(-1, 3).mean(axis=0) * 255).astype(int)
            e = {'n': name, 'c': '%02x%02x%02x' % tuple(int(v) for v in avg), 's': 1 if structured else 0}
            if cat == 'terrain': e['k'] = ground_kind(name)
            entries.append(e)
            if len(sheet) < 60 and (len(entries) % 4 == 1): sheet.append((cat + '/' + name + (' rot %.0f' % ang if structured else ''), a8))
        manifest[cat] = entries
        print('%-8s %3d textures' % (cat, len(entries)))
    with open(os.path.join(OUT, 'manifest.json'), 'w', encoding='utf-8') as f:
        json.dump(manifest, f, separators=(',', ':'))
    print('total %.1f MB' % (total / 1048576))
    if '--sheet' in sys.argv:
        from PIL import ImageDraw
        cols = 8; rows = (len(sheet) + cols - 1) // cols; S = 200
        im = Image.new('RGB', (cols * S, rows * S)); dr = ImageDraw.Draw(im)
        for i, (label, a8) in enumerate(sheet):
            t = Image.fromarray(a8).resize((S // 2, S // 2), Image.LANCZOS)
            # 2 x 2 mirrored, as the game tiles it
            x0, y0 = (i % cols) * S, (i // cols) * S
            im.paste(t, (x0, y0)); im.paste(t.transpose(Image.FLIP_LEFT_RIGHT), (x0 + S // 2, y0))
            im.paste(t.transpose(Image.FLIP_TOP_BOTTOM), (x0, y0 + S // 2)); im.paste(t.transpose(Image.ROTATE_180), (x0 + S // 2, y0 + S // 2))
            dr.rectangle((x0, y0, x0 + S - 1, y0 + 11), fill=(0, 0, 0)); dr.text((x0 + 2, y0), label[:32], fill=(255, 255, 255))
        os.makedirs(os.path.join(ROOT, 'tools', 'out'), exist_ok=True)
        im.save(os.path.join(ROOT, 'tools', 'out', 'texpool_sheet.jpg'), quality=85)


if __name__ == '__main__':
    main()
