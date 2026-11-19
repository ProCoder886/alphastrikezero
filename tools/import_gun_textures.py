"""Weapon finishes for ALPHA STRIKE ZERO's Gunsmith.

python -I tools/import_gun_textures.py

1. Skins: the user's finish images in  Assets 2/Gun Textures/Gun Textures 1  (AI-generated camo / cerakote / wood
   panel designs) -> src/assets/weapons/skins/<name>.jpg. Each image has hardware painted into its edges (grip
   panels, vents, screws); a region of plain pattern is cropped, levelled (the studio light of the render is
   flattened) and made seamless (offset + noise-feathered blend), 512 x 512.
2. Surface maps generated here (tileable by construction: periodic noise from filtered spectra) ->
   src/assets/weapons/surface/<finish>.jpg  packed R = roughness variation, G = height (bump), B = wear / scratches.
   brushed (polished and brushed steel), parker (phosphate matte), anod (bead-blasted anodised aluminium),
   polymer (stippled), cerakote (orange-peel coating), rubber, wood (pores + grain relief).
3. Wood albedo: walnut, dark and light oak, grain along U (the weapon's length).

The game projects all of them triplanar in weapon space (gunsmith.js), so no UV layout is involved.
"""
import os, sys, math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = r"K:\Games 2026\Y8 Games 2026\Assets 2\Gun Textures\Gun Textures 1"
OUT_SKIN = os.path.join(ROOT, 'src', 'assets', 'weapons', 'skins')
OUT_SURF = os.path.join(ROOT, 'src', 'assets', 'weapons', 'surface')
N = 512
rng = np.random.default_rng(20261118)

# name, file, crop (fractions x0 y0 x1 y1)
SKINS = [
    ('multicam',  'Gemini_Generated_Image_87zufv87zufv87zu.png', (0.24, 0.24, 0.68, 0.68)),
    ('snowfall',  'Gemini_Generated_Image_ch8q6sch8q6sch8q.png', (0.24, 0.20, 0.66, 0.62)),
    ('ebony',     'Gemini_Generated_Image_hgo8h7hgo8h7hgo8.png', (0.04, 0.04, 0.42, 0.42)),
    ('amberwood', 'Gemini_Generated_Image_n1scb3n1scb3n1sc.png', (0.26, 0.22, 0.70, 0.66)),
    ('rose',      'Gemini_Generated_Image_n2z9wdn2z9wdn2z9.png', (0.18, 0.30, 0.56, 0.68)),
    ('glacier',   'Gemini_Generated_Image_nfysvtnfysvtnfys.png', (0.24, 0.24, 0.66, 0.66)),
    ('woodland',  'Gemini_Generated_Image_o4maiso4maiso4ma.png', (0.26, 0.20, 0.74, 0.68)),
    ('carnival',  'Gemini_Generated_Image_pihyu3pihyu3pihy.png', (0.22, 0.24, 0.64, 0.66)),
    ('skyline',   'Gemini_Generated_Image_tt84z0tt84z0tt84.png', (0.32, 0.26, 0.76, 0.70)),
    ('plum',      'Gemini_Generated_Image_w8gs4aw8gs4aw8gs.png', (0.26, 0.20, 0.74, 0.68)),
    ('urban',     'Gun Texture 1.jpg', (0.22, 0.02, 0.68, 0.48)),
    ('crimson',   'Gun Texture 2.jpg', (0.22, 0.00, 0.98, 0.72)),
    ('hornet',    'increase-yellow-intensity-2.jpg', (0.25, 0.12, 0.75, 0.62)),
    ('navy',      'transform-this-1 (1).jpg', (0.25, 0.12, 0.75, 0.62)),
    ('ruby',      'transform-this-1 (2).jpg', (0.25, 0.12, 0.75, 0.62)),
    ('vanguard',  'transform-this-1 (3).jpg', (0.25, 0.12, 0.75, 0.62)),
    ('blaze',     'transform-this-1 (4).jpg', (0.25, 0.12, 0.75, 0.62)),
    ('patriot',   'transform-this-1 (5).jpg', (0.25, 0.12, 0.75, 0.62)),
    ('oakframe',  'transform-this-1 (6).jpg', (0.25, 0.12, 0.75, 0.62)),
    ('ember',     'transform-this-1.jpg', (0.25, 0.12, 0.75, 0.62)),
]


# ------------------------------------------------------------------ periodic noise
def pnoise(n, scale_lo, scale_hi=None, aniso=(1.0, 1.0), seed=None):
    """Tileable band-limited noise: white noise filtered in the frequency domain (wraps exactly)."""
    g = np.random.default_rng(seed) if seed is not None else rng
    w = g.standard_normal((n, n))
    # aniso < 1 along an axis stretches the structures along it (its frequencies count more)
    fy = np.fft.fftfreq(n)[:, None] * n / aniso[1]
    fx = np.fft.fftfreq(n)[None, :] * n / aniso[0]
    f = np.sqrt(fx * fx + fy * fy) + 1e-6
    hi = scale_hi if scale_hi is not None else scale_lo * 4
    band = np.exp(-((np.log(f) - math.log(math.sqrt(scale_lo * hi))) ** 2) / (2 * (math.log(hi / scale_lo) / 2.2) ** 2))
    band[0, 0] = 0
    y = np.real(np.fft.ifft2(np.fft.fft2(w) * band))
    y -= y.mean(); y /= (np.abs(y).max() + 1e-9)
    return y


def norm01(x):
    x = x - x.min(); return x / (x.max() + 1e-9)


def wrap_lines(n, count, ang_spread, length, width, alpha, seed, along=0.0):
    """Scratches drawn on a 3x3 tiling so the result wraps."""
    g = np.random.default_rng(seed)
    big = Image.new('L', (n * 3, n * 3), 0); d = ImageDraw.Draw(big)
    for _ in range(count):
        x, y = g.uniform(0, n), g.uniform(0, n)
        a = along + g.normal(0, ang_spread); L = g.uniform(*length)
        dx, dy = math.cos(a) * L, math.sin(a) * L
        v = int(255 * g.uniform(*alpha)); wd = max(1, int(g.uniform(*width)))
        for ox in (0, n, 2 * n):
            for oy in (0, n, 2 * n):
                d.line([(x + ox, y + oy), (x + ox + dx, y + oy + dy)], fill=v, width=wd)
    im = np.asarray(big, dtype=np.float64)[n:2 * n, n:2 * n] / 255.0
    return im


def save_rgb(path, r, g, b, q=90):
    arr = np.stack([r, g, b], -1)
    Image.fromarray(np.clip(arr * 255 + 0.5, 0, 255).astype(np.uint8), 'RGB').save(path, quality=q, subsampling=0)


# ------------------------------------------------------------------ skins
def seamless(a, seed):
    h, w = a.shape[:2]
    rolled = np.roll(a, (h // 2, w // 2), axis=(0, 1))
    yy, xx = np.mgrid[0:h, 0:w]
    d = np.minimum(np.minimum(xx, w - 1 - xx), np.minimum(yy, h - 1 - yy)) / (w * 0.5)
    nz = pnoise(w, 3, 10, seed=seed) * 0.22
    m = np.clip((d + nz - 0.16) / 0.22, 0, 1)
    m = m * m * (3 - 2 * m)
    return a * m[..., None] + rolled * (1 - m[..., None])


def level_light(a):
    """Flatten the soft studio lighting of the render: divide by a very blurred luminance, keep the mean."""
    lum = a.mean(-1)
    im = Image.fromarray(np.clip(lum * 255, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(a.shape[0] / 5))
    blur = np.asarray(im, dtype=np.float64) / 255.0 + 0.02
    k = (lum.mean() + 0.02) / blur
    k = 1 + (k - 1) * 0.7
    return np.clip(a * k[..., None], 0, 1)


def make_skins():
    os.makedirs(OUT_SKIN, exist_ok=True)
    rep = []
    for i, (name, f, c) in enumerate(SKINS):
        im = Image.open(os.path.join(SRC, f)).convert('RGB'); W, H = im.size
        box = (int(c[0] * W), int(c[1] * H), int(c[2] * W), int(c[3] * H))
        side = min(box[2] - box[0], box[3] - box[1])
        im = im.crop((box[0], box[1], box[0] + side, box[1] + side)).resize((N, N), Image.LANCZOS)
        a = np.asarray(im, dtype=np.float64) / 255.0
        a = level_light(a)
        a = seamless(a, 900 + i)
        Image.fromarray(np.clip(a * 255 + 0.5, 0, 255).astype(np.uint8)).save(os.path.join(OUT_SKIN, name + '.jpg'), quality=88, subsampling=0)
        rep.append('%-10s <- %s  crop %s  %d KB' % (name, f, c, os.path.getsize(os.path.join(OUT_SKIN, name + '.jpg')) // 1024))
    return rep


# ------------------------------------------------------------------ surfaces
def make_surfaces():
    os.makedirs(OUT_SURF, exist_ok=True)
    n = N
    out = {}
    # brushed / polished steel: long streaks along U (the barrel axis), a few fine scratches across
    s1 = pnoise(n, 30, 160, aniso=(0.04, 1.0), seed=11); s2 = pnoise(n, 80, 250, aniso=(0.02, 1.0), seed=12)
    h = norm01(s1 * 0.7 + s2 * 0.3)
    scr = wrap_lines(n, 70, 0.5, (20, 120), (1, 2), (0.3, 0.9), 13)
    out['brushed'] = (norm01(h * 0.8 + pnoise(n, 2, 8, seed=14) * 0.2), h, np.clip(scr, 0, 1))
    # parkerised / phosphate: fine grit + soft mottling
    g1 = pnoise(n, 90, 250, seed=21); g2 = pnoise(n, 3, 12, seed=22)
    h = norm01(g1 * 0.75 + g2 * 0.25)
    scr = wrap_lines(n, 45, 1.6, (8, 60), (1, 2), (0.2, 0.7), 23) * 0.8 + np.clip(pnoise(n, 4, 14, seed=24) - 0.45, 0, 1) * 1.2
    out['parker'] = (norm01(g2 * 0.6 + g1 * 0.4), h, np.clip(scr, 0, 1))
    # anodised aluminium: bead blast (very fine), almost no macro variation
    b1 = pnoise(n, 140, 256, seed=31)
    out['anod'] = (norm01(b1 * 0.5 + pnoise(n, 3, 10, seed=32) * 0.5), norm01(b1), np.clip(wrap_lines(n, 30, 1.6, (6, 40), (1, 2), (0.2, 0.6), 33), 0, 1))
    # stippled polymer: dense round bumps
    st = np.zeros((n, n)); gg = np.random.default_rng(41)
    yy, xx = np.mgrid[0:n, 0:n]
    img = Image.new('L', (n, n), 0); d = ImageDraw.Draw(img)
    for _ in range(5200):
        x, y, r = gg.uniform(0, n), gg.uniform(0, n), gg.uniform(1.6, 3.2)
        for ox in (-n, 0, n):
            for oy in (-n, 0, n):
                d.ellipse([x + ox - r, y + oy - r, x + ox + r, y + oy + r], fill=int(gg.uniform(150, 255)))
    st = np.asarray(img.filter(ImageFilter.GaussianBlur(1.1)), dtype=np.float64) / 255.0
    h = norm01(st * 0.85 + pnoise(n, 4, 16, seed=42) * 0.15)
    out['polymer'] = (norm01(1 - st * 0.6 + pnoise(n, 3, 10, seed=43) * 0.3), h, np.clip(wrap_lines(n, 35, 1.6, (8, 50), (1, 3), (0.2, 0.7), 44), 0, 1))
    # cerakote / paint: orange peel
    o1 = pnoise(n, 25, 70, seed=51)
    out['cerakote'] = (norm01(o1 * 0.4 + pnoise(n, 3, 9, seed=52) * 0.6), norm01(o1), np.clip(wrap_lines(n, 40, 1.6, (10, 70), (1, 2), (0.3, 0.8), 53) + np.clip(pnoise(n, 5, 16, seed=54) - 0.5, 0, 1) * 1.4, 0, 1))
    # rubber: pebbled
    r1 = pnoise(n, 60, 160, seed=61)
    out['rubber'] = (norm01(r1 * 0.5 + pnoise(n, 4, 12, seed=62) * 0.5), norm01(r1), np.zeros((n, n)))
    # wood relief: grain lines along U plus pores
    gr = norm01(np.sin((yy / n * 2 * np.pi * 34) + pnoise(n, 1, 3, aniso=(0.12, 1), seed=91) * 4.4 + pnoise(n, 3, 9, aniso=(0.08, 1), seed=92) * 1.8))
    pores = np.clip(pnoise(n, 60, 220, aniso=(0.15, 1.0), seed=72) - 0.35, 0, 1) * 2.0
    out['wood'] = (norm01(gr * 0.5 + pores * 0.5), norm01(gr * 0.6 - pores * 0.4), np.clip(wrap_lines(n, 25, 0.3, (10, 70), (1, 2), (0.2, 0.6), 73), 0, 1))
    rep = []
    for k, (r, g, b) in out.items():
        p = os.path.join(OUT_SURF, k + '.jpg'); save_rgb(p, r, g, b, 92)
        rep.append('surface %-9s %d KB' % (k, os.path.getsize(p) // 1024))
    # wood albedo
    seeds = {'walnut': 91, 'wood_dark': 92, 'wood_light': 93}
    for name, light, dark, figure in (('walnut', (0.46, 0.29, 0.17), (0.19, 0.105, 0.055), 1.0), ('wood_dark', (0.30, 0.18, 0.105), (0.11, 0.06, 0.035), 0.8),
                                       ('wood_light', (0.74, 0.57, 0.38), (0.45, 0.31, 0.18), 0.7)):
        # straight-grained stock blank: many fine growth lines along U, gently drifting, with a little figure
        sd = seeds[name]
        warp = pnoise(n, 1, 3, aniso=(0.35, 1.0), seed=sd) * 5.5 * figure + pnoise(n, 2, 6, aniso=(0.2, 1), seed=sd + 1) * 1.6
        rings = 0.5 + 0.5 * np.sin(yy / n * 2 * np.pi * 24 + warp * 2.0)
        rings = rings ** 3.0
        fine = norm01(pnoise(n, 60, 200, aniso=(0.03, 1.0), seed=sd + 2))
        streak = norm01(pnoise(n, 8, 40, aniso=(0.04, 1.0), seed=sd + 3))
        pores = np.clip(pnoise(n, 90, 250, aniso=(0.1, 1.0), seed=sd + 4) - 0.42, 0, 1) * 2.4
        t = np.clip(rings * 0.38 + fine * 0.22 + streak * 0.38 - pores * 0.3 + 0.06, 0, 1)
        col = np.array(dark)[None, None, :] + (np.array(light) - np.array(dark))[None, None, :] * t[..., None]
        col *= (0.9 + 0.2 * norm01(pnoise(n, 1, 3, seed=sd + 5)))[..., None]
        p = os.path.join(OUT_SURF, name + '.jpg')
        Image.fromarray(np.clip(col * 255 + 0.5, 0, 255).astype(np.uint8)).save(p, quality=90, subsampling=0)
        rep.append('albedo  %-9s %d KB' % (name, os.path.getsize(p) // 1024))
    return rep


if __name__ == '__main__':
    rep = make_surfaces()
    if os.path.isdir(SRC): rep += make_skins()
    else: rep.append('skins skipped: ' + SRC + ' not found')
    print('\n'.join(rep))
