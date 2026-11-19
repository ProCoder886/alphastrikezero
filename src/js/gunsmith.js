// ---------- Gunsmith: original weapon models built in code ----------
// Every catalogue weapon (catalogue.js) is assembled here from parametric parts: extruded side profiles, tubes,
// rails, stocks, magazines, sights, plus the attachments of its kit (optic, muzzle, underbarrel, laser, magazine).
// Nothing is loaded from disk: the shapes, proportions and names are this game's own.
//
// Weapon frame: origin at the pistol grip (top of the grip, under the receiver), muzzle along -Z, +Y up, +X right,
// metres. Moving parts are separate nodes ('mag', 'bolt', 'charge', 'slide', 'pump', 'cover', 'cyl', 'break',
// 'barrels') whose origin is their rest position; the viewmodel animates them.
//
// GUNSMITH.build(entry, kit) -> { root, info, rig, mounted }
//   info    { len, muzzle, sightY, sight, iron, handL, mag, brass, size, box }      (weapon frame)
//   rig     { mag, bolt, charge, slide, pump, cover, cyl, brk, barrels, frameR, frameL, magPos, magLen, preset }
//   mounted { optic, muzzle, laser, flashlight, underbarrel, magazine }             (what the kit added)
// ---------- finishes ----------
// Every part is shaded with a physical finish: a surface map (tools/import_gun_textures.py: R roughness variation,
// G relief, B wear / scratches) and, for wood and skins, a colour map. All maps are projected TRIPLANAR in weapon
// space (the gsP attribute = rest position of the vertex in the weapon frame), blended by the surface normal: no UV
// layout, so nothing stretches or seams and every face is covered at the same scale, moving parts included.
//   surf: surface map  ts: its tile size (m)  bump: relief height (m)  rv: roughness variation  wear: how much
//   of the finish is worn through (to wc colour, wr roughness, wm metalness)  alb: colour map  as: its tile (m)
// Skins (src/assets/weapons/skins, the user's finish designs) are applied per weapon as '<finish>@<skin>' keys:
// the skin's colours on a coated surface, its silver / chrome patches turned metallic, worn edges showing steel.
const GS_MATS = {};
const GS_MAT_DEFS = {
  steel:    { color: 0x4b4f55, metalness: 0.74, roughness: 0.48, env: 1.0, surf: 'parker', ts: 0.09, bump: 0.00022, rv: 0.45, wear: 0.42, wc: 0x9ca1a8, wr: 0.26, wm: 0.92 },
  blued:    { color: 0x272c35, metalness: 0.9, roughness: 0.24, env: 1.15, surf: 'brushed', ts: 0.14, bump: 0.00008, rv: 0.55, wear: 0.3, wc: 0x9a9fa6, wr: 0.18, wm: 0.95 },
  dark:     { color: 0x0c0d0f, metalness: 0.35, roughness: 0.74, env: 0.25, surf: 'parker', ts: 0.06, bump: 0.00012, rv: 0.3, wear: 0 },
  polymer:  { color: 0x2c2e32, metalness: 0.03, roughness: 0.6, env: 0.6, surf: 'polymer', ts: 0.11, bump: 0.00028, rv: 0.35, wear: 0.22, wc: 0x55585d, wr: 0.42, wm: 0.03 },
  rubber:   { color: 0x121214, metalness: 0, roughness: 0.9, env: 0.15, surf: 'rubber', ts: 0.05, bump: 0.00025, rv: 0.2, wear: 0 },
  tan:      { color: 0x9a7f57, metalness: 0.05, roughness: 0.62, env: 0.35, surf: 'cerakote', ts: 0.1, bump: 0.00009, rv: 0.35, wear: 0.4, wc: 0x3d4045, wr: 0.34, wm: 0.75 },
  olive:    { color: 0x4d563d, metalness: 0.05, roughness: 0.62, env: 0.35, surf: 'cerakote', ts: 0.1, bump: 0.00009, rv: 0.35, wear: 0.4, wc: 0x3d4045, wr: 0.34, wm: 0.75 },
  grey:     { color: 0x5b6068, metalness: 0.64, roughness: 0.4, env: 0.8, surf: 'anod', ts: 0.07, bump: 0.0001, rv: 0.3, wear: 0.35, wc: 0xb4b8bd, wr: 0.24, wm: 0.9 },
  white:    { color: 0xbcbfc3, metalness: 0.08, roughness: 0.56, env: 0.4, surf: 'cerakote', ts: 0.1, bump: 0.00008, rv: 0.3, wear: 0.35, wc: 0x55585d, wr: 0.34, wm: 0.7 },
  bare:     { color: 0xb6bac0, metalness: 0.97, roughness: 0.17, env: 1.1, surf: 'brushed', ts: 0.1, bump: 0.00006, rv: 0.7, wear: 0.12, wc: 0xd8dce0, wr: 0.1, wm: 1 },
  brass:    { color: 0xc49c46, metalness: 0.94, roughness: 0.27, env: 1.05, surf: 'brushed', ts: 0.08, bump: 0.00005, rv: 0.6, wear: 0.15, wc: 0xe0c070, wr: 0.15, wm: 1 },
  copper:   { color: 0xb6683a, metalness: 0.92, roughness: 0.32, env: 0.95, surf: 'brushed', ts: 0.08, bump: 0.00005, rv: 0.6, wear: 0.15, wc: 0xd88a5a, wr: 0.2, wm: 1 },
  red:      { color: 0xa81f1f, metalness: 0.08, roughness: 0.5, env: 0.4, surf: 'cerakote', ts: 0.1, bump: 0.00008, rv: 0.3, wear: 0.35, wc: 0x4a4d52, wr: 0.3, wm: 0.8 },
  orange:   { color: 0xc8641c, metalness: 0.05, roughness: 0.56, env: 0.35, surf: 'polymer', ts: 0.11, bump: 0.0002, rv: 0.3, wear: 0.2, wc: 0x6a4a30, wr: 0.45, wm: 0.05 },
  bake:     { color: 0x7a3a1c, metalness: 0.05, roughness: 0.42, env: 0.5, surf: 'polymer', ts: 0.14, bump: 0.00012, rv: 0.3, wear: 0.15, wc: 0x9a5a34, wr: 0.36, wm: 0.05 },
  smoke:    { color: 0x2a2f33, metalness: 0, roughness: 0.25, env: 0.9, opacity: 0.72, plain: true },
  wood:     { color: 0xffffff, metalness: 0, roughness: 0.44, env: 0.45, alb: 'walnut', as: 0.34, surf: 'wood', ts: 0.3, bump: 0.00016, rv: 0.4, wear: 0.18, wc: 0xb08a60, wr: 0.6, wm: 0 },
  woodDark: { color: 0xffffff, metalness: 0, roughness: 0.4, env: 0.5, alb: 'wood_dark', as: 0.34, surf: 'wood', ts: 0.3, bump: 0.00016, rv: 0.4, wear: 0.15, wc: 0x7a5a40, wr: 0.6, wm: 0 },
  woodLight:{ color: 0xffffff, metalness: 0, roughness: 0.48, env: 0.4, alb: 'wood_light', as: 0.34, surf: 'wood', ts: 0.3, bump: 0.00016, rv: 0.4, wear: 0.15, wc: 0xd8c0a0, wr: 0.6, wm: 0 },
  wrap:     { color: 0x2a2a2c, metalness: 0, roughness: 0.95, env: 0.1, wrap: true, as: 0.03, surf: 'rubber', ts: 0.05, bump: 0.0004, rv: 0.1, wear: 0 },
  glass:    { color: 0x9fc6ff, metalness: 0, roughness: 0.06, env: 1.4, opacity: 0.1, glass: true },
  lens:     { color: 0x0c1826, metalness: 0.6, roughness: 0.05, env: 1.8, plain: true },
  glowR:    { color: 0xff2a1a, emissive: 0xff2a1a },
  glowG:    { color: 0x30ff5a, emissive: 0x30ff5a },
  glowW:    { color: 0xfff4d8, emissive: 0xfff4d8 },
  // legacy key (catalogue entries finished in crimson): steel coated with the crimson skin
  crimson:  { skinOf: 'steel', skin: 'crimson' }
};
// the user's finish designs (tools/import_gun_textures.py): tile size on the weapon (m); panel designs are larger
const GS_SKINS = {
  multicam: 0.2, snowfall: 0.2, ebony: 0.24, amberwood: 0.22, rose: 0.2, glacier: 0.2, woodland: 0.22, carnival: 0.2, skyline: 0.2, plum: 0.26,
  urban: 0.2, crimson: 0.18, hornet: 0.2, navy: 0.28, ruby: 0.28, vanguard: 0.28, blaze: 0.28, patriot: 0.28, oakframe: 0.28, ember: 0.28
};
// skins per category: every category has its own looks; inside a category the weapons take them in turn
const GS_SKIN_CAT = {
  assault: ['woodland', 'urban', 'multicam', 'crimson', 'skyline', 'hornet', 'navy', 'vanguard'],
  smg: ['glacier', 'carnival', 'rose', 'ruby', 'skyline', 'snowfall', 'blaze', 'patriot'],
  mg: ['woodland', 'multicam', 'urban', 'vanguard', 'oakframe', 'ember', 'hornet'],
  lmg: ['multicam', 'woodland', 'hornet', 'urban', 'patriot', 'navy', 'crimson'],
  rifle: ['woodland', 'urban', 'multicam', 'ebony', 'crimson', 'skyline', 'oakframe'],
  shotgun: ['amberwood', 'oakframe', 'ebony', 'blaze', 'ruby', 'plum', 'ember'],
  pistol: ['crimson', 'urban', 'navy', 'plum', 'hornet', 'ebony', 'rose', 'snowfall'],
  launcher: ['woodland', 'hornet', 'blaze', 'vanguard', 'urban', 'multicam', 'ember', 'oakframe'],
  melee: ['ebony', 'crimson', 'urban', 'woodland', 'amberwood', 'plum', 'hornet']
};
function gsSkinFor(e) {
  if (!e || !e.id) return null;
  if (e.p && e.p.skin !== undefined) return e.p.skin || null;
  const list = GS_SKIN_CAT[e.category]; if (!list) return null;
  return list[(e.order || 0) % list.length];
}
const GS_SYNTH = ['polymer', 'tan', 'olive', 'grey', 'white', 'red', 'orange', 'bake'];
const GS_COATED_BLADES = ['knife', 'karambit', 'machete', 'kukri', 'cleaver', 'trench'];

// ---------- textures (loaded once, at boot, before any weapon is drawn) ----------
const GSTEX = {
  t: {}, _p: null,
  SURF: ['brushed', 'parker', 'anod', 'polymer', 'cerakote', 'rubber', 'wood'], ALB: ['walnut', 'wood_dark', 'wood_light'],
  load(path, srgb) {
    if (this.t[path]) return this.t[path];
    const t = new THREE.Texture(); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; t.encoding = srgb ? THREE.sRGBEncoding : THREE.LinearEncoding;
    t.ready = new Promise(res => { const im = new Image(); im.onload = () => { t.image = im; t.needsUpdate = true; res(t); }; im.onerror = () => res(t); im.src = assetURL(path); });
    return (this.t[path] = t);
  },
  surf(k) { return this.load('assets/weapons/surface/' + k + '.jpg', false); },
  alb(k) { return this.load('assets/weapons/surface/' + k + '.jpg', true); },
  skin(k) { return this.load('assets/weapons/skins/' + k + '.jpg', true); },
  // every finish and skin: the Armory's thumbnails are rendered once and must never catch a texture still loading
  preload() {
    if (this._p) return this._p;
    const all = this.SURF.map(k => this.surf(k)).concat(this.ALB.map(k => this.alb(k)), Object.keys(GS_SKINS).map(k => this.skin(k)));
    return (this._p = Promise.all(all.map(t => t.ready)));
  }
};

// cord / tape wrap: diagonal weave (colour map of 'wrap')
function gsWrapTex() {
  if (GS_MATS._wrap) return GS_MATS._wrap;
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d');
  x.fillStyle = '#9a9a9a'; x.fillRect(0, 0, 256, 256);
  for (let i = -256; i < 512; i += 16) { x.strokeStyle = i % 32 ? '#5a5a5a' : '#d0d0d0'; x.lineWidth = 6; x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 256, 256); x.stroke(); x.beginPath(); x.moveTo(i + 256, 0); x.lineTo(i, 256); x.stroke(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; t.encoding = THREE.sRGBEncoding;
  return (GS_MATS._wrap = t);
}

// triplanar finish shader (MeshStandardMaterial + onBeforeCompile; one program per define set)
const GS_TRI_V = `
attribute vec3 gsP;
varying vec3 vGsP;
varying vec3 vGsN;`;
const GS_TRI_F = `
uniform sampler2D gsSurf;
uniform vec4 gsK;      // x albedo map tiles / m, y surface tiles / m, z relief (m), w wear
uniform vec4 gsR;      // x roughness variation, y worn roughness, z worn metalness, w skin metal hint
uniform vec3 gsWC;     // worn-through colour (linear)
varying vec3 vGsP;
varying vec3 vGsN;
vec3 gsW; vec3 gsS; vec3 gsAlb; float gsWear;
vec4 gsTri(sampler2D t, float s) {
  return texture2D(t, vGsP.zy * s) * gsW.x + texture2D(t, vec2(vGsP.z * s, vGsP.x * s + 0.37)) * gsW.y + texture2D(t, vec2(vGsP.x * s + 0.61, vGsP.y * s + 0.23)) * gsW.z;
}`;
const GS_TRI_MAP = `
  gsW = pow(abs(normalize(vGsN)), vec3(6.0)); gsW /= max(1e-4, gsW.x + gsW.y + gsW.z);
  gsS = gsTri(gsSurf, gsK.y).rgb;
  gsAlb = vec3(1.0);
#ifdef USE_MAP
  vec4 texelColor = gsTri(map, gsK.x);
  gsAlb = texelColor.rgb;
  texelColor = mapTexelToLinear(texelColor);
  diffuseColor *= texelColor;
#else
  diffuseColor.rgb *= 0.9 + 0.2 * gsS.r;                       // mottling of the finish
#endif
  diffuseColor.rgb *= 0.86 + 0.14 * smoothstep(0.1, 0.7, gsS.g); // relief darkens the hollows a little
  gsWear = smoothstep(0.42, 0.95, gsS.b) * gsK.w;
  diffuseColor.rgb = mix(diffuseColor.rgb, gsWC, gsWear);`;
const GS_TRI_ROUGH = `
  float roughnessFactor = clamp(roughness * (1.0 + gsR.x * (gsS.r - 0.5) * 1.6), 0.05, 1.0);
  float metalnessFactor = metalness;
#ifdef GS_SKIN
  float gsMx = max(gsAlb.r, max(gsAlb.g, gsAlb.b)), gsMn = min(gsAlb.r, min(gsAlb.g, gsAlb.b));
  float gsChrome = smoothstep(0.42, 0.78, gsMx) * (1.0 - smoothstep(0.06, 0.2, (gsMx - gsMn) / (gsMx + 0.001))) * gsR.w;
  metalnessFactor = mix(metalnessFactor, 0.94, gsChrome); roughnessFactor = mix(roughnessFactor, 0.2, gsChrome);
  float gsDarkGap = 1.0 - smoothstep(0.05, 0.16, gsMx);       // dark recesses of the design: matte
  roughnessFactor = mix(roughnessFactor, 0.78, gsDarkGap * 0.7);
#endif
  roughnessFactor = mix(roughnessFactor, gsR.y, gsWear); metalnessFactor = mix(metalnessFactor, gsR.z, gsWear);`;
const GS_TRI_NORMAL = `
#ifdef USE_BUMPMAP
  normal = perturbNormalArb(-vViewPosition, normal, vec2(dFdx(gsS.g), dFdy(gsS.g)) * gsK.z, faceDirection);
#endif`;
function gsTriplanar(m, d, skin) {
  const surf = GSTEX.surf(d.surf);
  m.bumpMap = surf;   // defines USE_BUMPMAP (derivatives + perturbNormalArb); the relief itself is sampled triplanar
  if (skin) m.defines = { GS_SKIN: 1 };
  const wc = new THREE.Color(d.wc || 0x808080).convertSRGBToLinear();
  const albScale = skin ? 1 / GS_SKINS[skin] : d.as ? 1 / d.as : 1;
  const U = {
    gsSurf: { value: surf }, gsK: { value: new THREE.Vector4(albScale, 1 / (d.ts || 0.1), d.bump || 0.0001, d.wear || 0) },
    gsR: { value: new THREE.Vector4(d.rv || 0.3, d.wr === undefined ? d.roughness : d.wr, d.wm === undefined ? d.metalness : d.wm, skin ? 1 : 0) }, gsWC: { value: wc }
  };
  m._gsU = U;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>' + GS_TRI_V)
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n vGsP = gsP; vGsN = normal;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>' + GS_TRI_F)
      .replace('#include <map_fragment>', GS_TRI_MAP)
      .replace('#include <roughnessmap_fragment>', GS_TRI_ROUGH)
      .replace('#include <metalnessmap_fragment>', '')
      .replace('#include <normal_fragment_maps>', GS_TRI_NORMAL);
  };
  m.customProgramCacheKey = () => 'gsTri2';
  return m;
}
function gsMat(key) {
  if (GS_MATS[key]) return GS_MATS[key];
  if (key.endsWith('~')) {
    const m2 = gsMat(key.slice(0, -1)).clone(), D = gsDefOf(key); m2.side = THREE.DoubleSide; m2.userData.gs = key;
    if (D.d.surf && !D.d.emissive) gsTriplanar(m2, D.d, D.skin);
    return (GS_MATS[key] = m2);
  }
  const { d, skin } = gsDefOf(key);
  let m;
  if (d.emissive !== undefined) m = new THREE.MeshBasicMaterial({ color: d.emissive, toneMapped: false });
  else {
    m = new THREE.MeshStandardMaterial({ color: skin ? 0xf2f2f2 : d.color, metalness: d.metalness, roughness: d.roughness, envMapIntensity: d.env });
    m.color.convertSRGBToLinear();   // the palette above is written in display (sRGB) values
    if (d.opacity !== undefined) { m.transparent = true; m.opacity = d.opacity; m.depthWrite = !d.glass; if (d.glass) m.side = THREE.DoubleSide; }
    if (skin) m.map = GSTEX.skin(skin);
    else if (d.alb) m.map = GSTEX.alb(d.alb);
    else if (d.wrap) m.map = gsWrapTex();
    if (d.surf) gsTriplanar(m, d, skin);
  }
  m.userData.gs = key; if (d.glass) m.userData.glass = true;
  return (GS_MATS[key] = m);
}
// '<finish>@<skin>' -> the finish's definition, coated: painted over (low metalness), worn through to the finish
function gsDefOf(key) {
  const k = key.replace('~', '');
  let [base, skin] = k.split('@');
  let d = GS_MAT_DEFS[base] || GS_MAT_DEFS.steel;
  if (d.skinOf) { skin = skin || d.skin; d = GS_MAT_DEFS[d.skinOf]; }
  if (!skin || !GS_SKINS[skin]) return { d, skin: null };
  const metalBase = d.metalness > 0.5;
  return { skin, d: Object.assign({}, d, { metalness: 0.22, roughness: 0.46, env: 0.85, surf: 'cerakote', ts: 0.1, bump: 0.0001, rv: 0.4, wear: metalBase ? 0.38 : 0.2,
    wc: metalBase ? 0x8e9298 : d.color, wr: metalBase ? 0.24 : d.roughness, wm: metalBase ? 0.9 : d.metalness, alb: null, wrap: false }) };
}
// weapon-space rest position of every vertex (the triplanar projection space); origin = the node's rest position
function gsTriAttr(geo, o) {
  const p = geo.attributes.position, a = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) { a[i * 3] = p.getX(i) + o.x; a[i * 3 + 1] = p.getY(i) + o.y; a[i * 3 + 2] = p.getZ(i) + o.z; }
  geo.setAttribute('gsP', new THREE.BufferAttribute(a, 3));
}

class GunBuilder {
  constructor(entry, kit) {
    this.e = entry; this.p = entry.p || {}; this.kit = kit || {};
    this.G = {}; this.grp('body', 0, 0, 0);
    this.by = 0.046;           // bore height above the grip origin
    this.a = {};               // anchors filled by the family builder (see GUNSMITH.build)
    const c = this.p.c || [];
    this.M = c[0] || 'steel'; this.F = c[1] || 'polymer';   // metal, furniture
    // the weapon's skin (GS_SKIN_CAT): on the receiver / body metal and on synthetic furniture; barrels, bolts,
    // sights, magazines and wood keep their own finishes. A polished stainless body keeps its shine unless
    // nothing else would carry the skin.
    const skin = this.skin = gsSkinFor(entry);
    if (skin && this.M !== 'crimson') {
      const mOk = this.M !== 'bare' && this.M !== 'brass', fOk = GS_SYNTH.includes(this.F);
      if (mOk || !fOk) this.M += '@' + skin;
      if (fOk) this.F += '@' + skin;
    }
    this.A = c[2] || this.F;   // accent
  }
  grp(name, x, y, z) { if (!this.G[name]) this.G[name] = { o: new THREE.Vector3(x || 0, y || 0, z || 0), parts: {} }; return this; }
  add(geo, mat, grp) {
    const g = this.G[grp || 'body'];
    if (geo.index) geo = geo.toNonIndexed();
    if (g.o.x || g.o.y || g.o.z) geo.translate(-g.o.x, -g.o.y, -g.o.z);
    mat = mat || this.M;
    // melee weapons: the skin on the fittings, synthetic handles and the coated blades of tactical knives
    if (this.skin && this.e.category === 'melee' && mat.indexOf('@') < 0) {
      const base = mat.replace('~', ''), blade = base === 'bare' && GS_COATED_BLADES.includes(this.p.kind);
      if (blade || GS_SYNTH.includes(base) || base === 'blued' || base === 'brass') mat = (blade ? 'steel' : base) + '@' + this.skin + (mat.endsWith('~') ? '~' : '');
    }
    (g.parts[mat] = g.parts[mat] || []).push(geo);
    return this;
  }
  // box: w along X, h along Y, d along Z, centred on (x, y, z), optional Euler rotation about its centre
  box(w, h, d, x, y, z, mat, grp, rx, ry, rz) {
    const g = new THREE.BoxGeometry(w, h, d);
    if (rx || ry || rz) g.applyMatrix4(_gsM.makeRotationFromEuler(_gsE.set(rx || 0, ry || 0, rz || 0)));
    g.translate(x, y, z); return this.add(g, mat, grp);
  }
  // cylinder along Z from z0 to z1 (any order) centred on (o.x, y); o: { r2 (radius at the forward end), seg, sx, sy, x, open }
  tube(r, z0, z1, y, mat, grp, o) {
    o = o || {};
    const zf = Math.min(z0, z1), zr = Math.max(z0, z1);
    const g = new THREE.CylinderGeometry(o.r2 !== undefined ? o.r2 : r, r, zr - zf, o.seg || 14, 1, !!o.open);
    g.rotateX(-Math.PI / 2);
    if (o.rot) g.rotateZ(o.rot);
    if (o.sx || o.sy) g.scale(o.sx || 1, o.sy || 1, 1);
    g.translate(o.x || 0, y, (zf + zr) / 2); return this.add(g, o.open ? (mat || this.M) + '~' : mat, grp);
  }
  // ring: R = radius, r = thickness; axis 'x' (ring in the YZ plane), 'y' or 'z'
  torus(R, r, x, y, z, mat, grp, axis) {
    const g = new THREE.TorusGeometry(R, r, 6, 16);
    if (axis === 'x') g.rotateY(Math.PI / 2); else if (axis === 'y') g.rotateX(Math.PI / 2);
    g.translate(x, y, z); return this.add(g, mat, grp);
  }
  cylX(r, len, x, y, z, mat, grp, seg, r2) { const g = new THREE.CylinderGeometry(r2 !== undefined ? r2 : r, r, len, seg || 14); g.rotateZ(-Math.PI / 2); g.translate(x, y, z); return this.add(g, mat, grp); }
  cylY(r, len, x, y, z, mat, grp, seg, r2) { const g = new THREE.CylinderGeometry(r2 !== undefined ? r2 : r, r, len, seg || 14); g.translate(x, y, z); return this.add(g, mat, grp); }
  // rod between two points
  rod(r, a, b, mat, grp, seg) {
    const A = new THREE.Vector3(a[0], a[1], a[2]), B = new THREE.Vector3(b[0], b[1], b[2]), d = B.clone().sub(A), len = d.length();
    const g = new THREE.CylinderGeometry(r, r, len, seg || 8);
    g.applyMatrix4(_gsM.makeRotationFromQuaternion(_gsQ.setFromUnitVectors(_gsUp, d.multiplyScalar(1 / len))));
    g.translate((A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2); return this.add(g, mat, grp);
  }
  ball(r, x, y, z, mat, grp, sx, sy, sz) { const g = new THREE.SphereGeometry(r, 10, 8); if (sx) g.scale(sx, sy || 1, sz || 1); g.translate(x, y, z); return this.add(g, mat, grp); }
  // extruded side profile: pts [[z, y], ...] in weapon coordinates, thickness t along X; o: { x, bev, bs, rz, hole }
  prof(pts, t, mat, grp, o) {
    o = o || {};
    const s = new THREE.Shape();
    pts.forEach((q, i) => { if (i) s.lineTo(-q[0], q[1]); else s.moveTo(-q[0], q[1]); });
    for (const hp of (o.holes || (o.hole ? [o.hole] : []))) { const h = new THREE.Path(); hp.forEach((q, i) => { if (i) h.lineTo(-q[0], q[1]); else h.moveTo(-q[0], q[1]); }); s.holes.push(h); }
    const bev = Math.min(o.bev === undefined ? 0.0016 : o.bev, t * 0.45), depth = bev > 0 ? t - 2 * bev : t;
    const g = new THREE.ExtrudeGeometry(s, bev > 0 ? { depth, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelOffset: -bev, bevelSegments: o.bs || 1, steps: 1, curveSegments: 6 }
      : { depth, bevelEnabled: false, steps: 1, curveSegments: 6 });
    g.translate(0, 0, -depth / 2);
    g.rotateY(Math.PI / 2);
    if (o.rz) g.rotateZ(o.rz);
    if (o.x || o.y) g.translate(o.x || 0, o.y || 0, 0);
    return this.add(g, mat, grp);
  }
  // row of thin dark slots / ribs on both sides (x = ±hx) between z0 and z1
  slots(z0, z1, y, hx, n, w, h, mat, grp, oneSide) {
    for (let i = 0; i < n; i++) {
      const z = n === 1 ? (z0 + z1) / 2 : z0 + (z1 - z0) * i / (n - 1);
      if (oneSide !== -1) this.box(0.0016, h, w, hx, y, z, mat || 'dark', grp);
      if (oneSide !== 1) this.box(0.0016, h, w, -hx, y, z, mat || 'dark', grp);
    }
    return this;
  }
  finish() {
    const root = new THREE.Group(), nodes = {};
    for (const name in this.G) {
      const g = this.G[name];
      let node = root;
      if (name !== 'body') { node = new THREE.Group(); node.name = 'gs_' + name; node.position.copy(g.o); root.add(node); nodes[name] = node; }
      for (const mk in g.parts) {
        const geo = THREE.BufferGeometryUtils.mergeBufferGeometries(g.parts[mk], false);
        const d = gsDefOf(mk).d;
        gsTriAttr(geo, g.o);
        const m = new THREE.Mesh(geo, gsMat(mk)); m.frustumCulled = false; m.name = name + ':' + mk;
        if (d.glass || d.opacity !== undefined) m.renderOrder = 3;
        node.add(m);
      }
    }
    return { root, nodes };
  }
}
const _gsM = new THREE.Matrix4(), _gsE = new THREE.Euler(), _gsQ = new THREE.Quaternion(), _gsUp = new THREE.Vector3(0, 1, 0);

// ---------- shared parts ----------
const GSP = {
  // Picatinny-style rail: base strip with cross slots. y = underside. o: { mat, grp, rot, axisY, w }
  rail(b, z0, z1, y, o) {
    o = o || {};
    const zf = Math.min(z0, z1), zr = Math.max(z0, z1), len = zr - zf, w = o.w || 0.021, mat = o.mat || b.M, geos = [];
    let g = new THREE.BoxGeometry(w * 0.72, 0.0045, len); g.translate(0, y + 0.00225, (zf + zr) / 2); geos.push(g);
    const n = Math.max(2, Math.floor(len / 0.0101));
    for (let i = 0; i < n; i++) { g = new THREE.BoxGeometry(w, 0.0042, 0.0056); g.translate(0, y + 0.0064, zf + (i + 0.5) * len / n); geos.push(g); }
    for (g of geos) {
      if (o.rot) { g.translate(0, -(o.axisY || 0), 0); g.rotateZ(o.rot); g.translate(0, o.axisY || 0, 0); }
      b.add(g, mat, o.grp);
    }
    return y + 0.0085;
  },
  // pistol grip under the origin
  grip(b, kind, mat, z) {
    z = z || 0; mat = mat || b.F;
    const P = {
      ar:   [[-0.022, 0.002], [0.010, -0.098], [0.050, -0.098], [0.036, -0.022], [0.031, -0.007], [0.021, 0.002]],
      ak:   [[-0.020, 0.002], [-0.002, -0.088], [0.034, -0.088], [0.026, -0.02], [0.020, 0.002]],
      ergo: [[-0.022, 0.002], [-0.014, -0.03], [0.004, -0.102], [0.046, -0.104], [0.044, -0.05], [0.036, -0.016], [0.033, -0.004], [0.022, 0.002]],
      slim: [[-0.018, 0.002], [0.004, -0.09], [0.038, -0.09], [0.028, -0.02], [0.018, 0.002]],
      tall: [[-0.022, 0.002], [-0.006, -0.112], [0.040, -0.112], [0.030, -0.02], [0.022, 0.002]]
    }[kind || 'ar'];
    b.prof(P.map(q => [q[0] + z, q[1]]), kind === 'slim' ? 0.026 : 0.03, mat, null, { bev: 0.006, bs: 2 });
    // texture bands
    const lo = P[1], hi = P[0];
    for (let i = 1; i <= 3; i++) { const k = 0.25 + i * 0.17; b.box(0.032, 0.0022, 0.03, 0, hi[1] + (lo[1] - hi[1]) * k, z + hi[0] + (lo[0] - hi[0]) * k + 0.02, 'dark', null, -0.3); }
    b.a.gripKind = kind || 'ar';
    return b;
  },
  // trigger and guard between the grip (zr) and zf; y0 = receiver underside
  guard(b, zf, zr, y0, mat, drop) {
    mat = mat || b.M; y0 = y0 || 0; drop = drop || 0.034;
    b.box(0.011, 0.0028, Math.abs(zf - zr) + 0.004, 0, y0 - drop, (zf + zr) / 2, mat);
    b.box(0.011, drop, 0.0028, 0, y0 - drop / 2, zf, mat, null, 0.12);
    b.prof([[zr - 0.014, y0 + 0.002], [zr - 0.019, y0 - 0.012], [zr - 0.024, y0 - 0.024], [zr - 0.02, y0 - 0.026], [zr - 0.012, y0 - 0.012], [zr - 0.008, y0 + 0.002]], 0.006, 'blued', null, { bev: 0.001 });
    return b;
  },
  // shoulder stocks, attached at z0 (rear of the receiver) on the bore line y
  stock(b, kind, z0, y, M, F) {
    M = M || b.M; F = F || b.F;
    switch (kind) {
      case 'm4': // buffer tube + collapsible stock
        b.tube(0.0145, z0, z0 + 0.185, y - 0.004, M);
        b.box(0.034, 0.04, 0.012, 0, y - 0.004, z0 + 0.008, M);
        b.prof([[z0 + 0.075, y + 0.018], [z0 + 0.245, y + 0.018], [z0 + 0.256, y + 0.004], [z0 + 0.256, y - 0.104], [z0 + 0.228, y - 0.104], [z0 + 0.15, y - 0.04], [z0 + 0.075, y - 0.032]], 0.04, F, null, { bev: 0.005, bs: 2 });
        b.box(0.042, 0.124, 0.008, 0, y - 0.044, z0 + 0.26, 'rubber');
        b.box(0.012, 0.012, 0.03, 0, y - 0.044, z0 + 0.12, M); // adjustment latch
        b.slots(z0 + 0.1, z0 + 0.2, y - 0.006, 0.0205, 3, 0.02, 0.006);
        b.a.butt = z0 + 0.264; break;
      case 'fixed': // full rifle stock
        b.prof([[z0, y + 0.022], [z0 + 0.262, y + 0.024], [z0 + 0.268, y - 0.108], [z0 + 0.24, y - 0.112], [z0 + 0.02, y - 0.04], [z0, y - 0.034]], 0.042, F, null, { bev: 0.007, bs: 2 });
        b.box(0.044, 0.136, 0.008, 0, y - 0.043, z0 + 0.272, 'rubber');
        b.a.butt = z0 + 0.276; break;
      case 'wood': // solid wooden butt
        b.prof([[z0, y + 0.014], [z0 + 0.25, y + 0.0], [z0 + 0.258, y - 0.118], [z0 + 0.238, y - 0.124], [z0 + 0.06, y - 0.046], [z0, y - 0.036]], 0.04, F, null, { bev: 0.009, bs: 2 });
        b.box(0.036, 0.124, 0.005, 0, y - 0.06, z0 + 0.261, M);
        b.a.butt = z0 + 0.264; break;
      case 'skel': // side-folding skeleton
        b.rod(0.006, [0, y + 0.006, z0], [0, y + 0.006, z0 + 0.225], M);
        b.rod(0.006, [0, y - 0.03, z0], [0, y - 0.09, z0 + 0.225], M);
        b.prof([[z0 + 0.218, y + 0.018], [z0 + 0.236, y + 0.018], [z0 + 0.24, y - 0.108], [z0 + 0.222, y - 0.108]], 0.034, F, null, { bev: 0.004 });
        b.box(0.03, 0.04, 0.02, 0, y - 0.012, z0 + 0.005, M);
        b.a.butt = z0 + 0.24; break;
      case 'tri': // triangular folder
        b.rod(0.0055, [0.004, y + 0.004, z0], [0.004, y + 0.002, z0 + 0.235], M);
        b.rod(0.0055, [0.004, y - 0.026, z0], [0.004, y - 0.1, z0 + 0.235], M);
        b.rod(0.0055, [0.004, y + 0.004, z0 + 0.235], [0.004, y - 0.104, z0 + 0.235], M);
        b.box(0.03, 0.118, 0.008, 0.002, y - 0.05, z0 + 0.24, M);
        b.a.butt = z0 + 0.244; break;
      case 'wire': // retractable twin rods
        b.rod(0.0042, [0.02, y - 0.004, z0 - 0.08], [0.02, y - 0.004, z0 + 0.2], M);
        b.rod(0.0042, [-0.02, y - 0.004, z0 - 0.08], [-0.02, y - 0.004, z0 + 0.2], M);
        b.prof([[z0 + 0.196, y + 0.022], [z0 + 0.21, y + 0.022], [z0 + 0.214, y - 0.09], [z0 + 0.2, y - 0.09]], 0.052, F, null, { bev: 0.004 });
        b.a.butt = z0 + 0.214; break;
      case 'boot': // side-folder with cheek riser
        b.prof([[z0, y + 0.034], [z0 + 0.2, y + 0.034], [z0 + 0.205, y + 0.012], [z0, y + 0.012]], 0.036, F, null, { bev: 0.005 });
        b.prof([[z0, y + 0.012], [z0 + 0.25, y + 0.012], [z0 + 0.258, y - 0.004], [z0 + 0.258, y - 0.11], [z0 + 0.23, y - 0.11], [z0 + 0.2, y - 0.03], [z0, y - 0.02]], 0.034, F, null, { bev: 0.005, hole: [[z0 + 0.04, y - 0.004], [z0 + 0.18, y - 0.004], [z0 + 0.19, y - 0.018], [z0 + 0.04, y - 0.012]] });
        b.box(0.038, 0.128, 0.008, 0, y - 0.05, z0 + 0.262, 'rubber');
        b.a.butt = z0 + 0.266; break;
      case 'prs': // precision stock: adjustable cheek piece and butt pad
        b.prof([[z0, y + 0.008], [z0 + 0.26, y + 0.008], [z0 + 0.264, y - 0.112], [z0 + 0.2, y - 0.116], [z0 + 0.15, y - 0.05], [z0, y - 0.03]], 0.038, F, null, { bev: 0.005, hole: [[z0 + 0.05, y - 0.006], [z0 + 0.2, y - 0.006], [z0 + 0.21, y - 0.03], [z0 + 0.06, y - 0.02]] });
        b.prof([[z0 + 0.06, y + 0.012], [z0 + 0.22, y + 0.012], [z0 + 0.215, y + 0.04], [z0 + 0.065, y + 0.04]], 0.034, F, null, { bev: 0.008, bs: 2 });
        b.box(0.04, 0.134, 0.012, 0, y - 0.05, z0 + 0.272, 'rubber');
        b.rod(0.004, [0, y - 0.03, z0 + 0.262], [0, y - 0.03, z0 + 0.272], 'bare'); b.rod(0.004, [0, y - 0.08, z0 + 0.262], [0, y - 0.08, z0 + 0.272], 'bare');
        b.a.butt = z0 + 0.278; break;
      case 'tube': // bare buffer tube with a brace pad
        b.tube(0.0145, z0, z0 + 0.19, y - 0.004, M);
        b.box(0.03, 0.07, 0.016, 0, y - 0.02, z0 + 0.19, 'rubber');
        b.a.butt = z0 + 0.198; break;
      default: // end cap only
        b.box(0.03, 0.04, 0.012, 0, y - 0.004, z0 + 0.006, M); b.a.butt = z0 + 0.012;
    }
    return b;
  },
  // curved box magazine profile below the well mouth (group 'mag', origin at the mouth)
  magShape(w, h, curve, lean, ins) {
    const n = 7, f = [], r = [];
    for (let i = 0; i <= n; i++) {
      const d = -ins + (h + ins) * i / n, k = Math.max(0, d) / h, zc = -curve * k * k - (lean || 0) * d;
      f.push([zc - w / 2, -d]); r.push([zc + w / 2, -d]);
    }
    return f.concat(r.reverse());
  },
  // kinds: stanag, pmag, short, ak, ak5, stick, curve9, drum, box308, box50, sgbox, sgdrum, helix, g36, long
  // o: { h (visible length), ins (length hidden inside the well) }
  mag(b, kind, z, y, mat, o) {
    o = o || {};
    b.grp('mag', 0, y, z);
    const K = {
      stanag: { w: 0.061, t: 0.023, h: 0.125, c: 0.02, m: 'grey' },
      pmag:   { w: 0.064, t: 0.026, h: 0.13, c: 0.022, m: 'polymer', ribs: 1 },
      short:  { w: 0.061, t: 0.023, h: 0.07, c: 0.006, m: 'grey' },
      long:   { w: 0.061, t: 0.023, h: 0.19, c: 0.05, m: 'grey' },
      ak:     { w: 0.068, t: 0.027, h: 0.19, c: 0.075, m: 'steel', ribs: 2 },
      ak5:    { w: 0.064, t: 0.026, h: 0.185, c: 0.045, m: 'bake', ribs: 1 },
      g36:    { w: 0.066, t: 0.03, h: 0.165, c: 0.035, m: 'smoke', ribs: 1 },
      stick:  { w: 0.031, t: 0.021, h: 0.15, c: 0, m: 'steel' },
      stick45:{ w: 0.036, t: 0.024, h: 0.17, c: 0, m: 'steel' },
      curve9: { w: 0.034, t: 0.021, h: 0.18, c: 0.032, m: 'steel' },
      box308: { w: 0.072, t: 0.027, h: 0.085, c: 0.004, m: 'steel' },
      box338: { w: 0.085, t: 0.028, h: 0.07, c: 0, m: 'steel' },
      box50:  { w: 0.112, t: 0.032, h: 0.115, c: 0.004, m: 'steel', ribs: 2 },
      sgbox:  { w: 0.088, t: 0.03, h: 0.13, c: 0.012, m: 'polymer', ribs: 1 }
    }[kind];
    let h = 0.12;
    if (K) {
      if (o.h) { K.c *= o.h / K.h; K.h = o.h; }
      if (b.magAtt === 'ext' && !o.fixed) { K.c *= 1.3; K.h *= 1.3; }
      const m = mat || K.m, ins = o.ins || 0.034; h = K.h;
      b.prof(GSP.magShape(K.w, K.h, K.c, b.p.magLean || 0, ins).map(q => [q[0] + z, q[1] + y]), K.t, m, 'mag', { bev: 0.0022 });
      const zb = z - K.c - (b.p.magLean || 0) * K.h, tilt = Math.atan2(2 * K.c, K.h) * 0.9;
      b.box(K.t + 0.004, 0.007, K.w + 0.006, 0, y - K.h - 0.002, zb, m === 'smoke' ? 'polymer' : m, 'mag', -tilt);
      if (K.ribs) for (let i = 0; i < 3; i++) { const k = 0.3 + i * 0.22, zz = z - K.c * k * k; b.box(K.t + 0.0018, 0.0035, K.w * (K.ribs === 2 ? 0.96 : 0.7), 0, y - K.h * k, zz, m === 'smoke' ? 'polymer' : m, 'mag', -Math.atan2(2 * K.c * k, K.h)); }
      if (m === 'smoke') for (let i = 0; i < 6; i++) { const k = 0.12 + i * 0.13; b.cylX(0.0045, 0.02, 0, y - K.h * k, z - K.c * k * k - 0.004, 'brass', 'mag', 8); }
      // top round visible when the magazine is out
      b.cylX(0.0046, K.t * 0.7, 0, y + ins - 0.004, z - 0.004, 'brass', 'mag', 8);
    } else if (kind === 'drum') {
      h = 0.14;
      b.prof(GSP.magShape(0.058, 0.05, 0.004, 0, 0.034).map(q => [q[0] + z, q[1] + y]), 0.026, 'steel', 'mag');
      b.cylX(0.062, 0.062, 0, y - 0.085, z - 0.004, mat || 'steel', 'mag', 22);
      b.cylX(0.05, 0.068, 0, y - 0.085, z - 0.004, 'blued', 'mag', 22);
      b.cylX(0.012, 0.074, 0, y - 0.085, z - 0.004, 'bare', 'mag', 10);
      for (let i = 0; i < 8; i++) { const an = i / 8 * 6.283; b.box(0.066, 0.006, 0.006, 0, y - 0.085 + Math.sin(an) * 0.056, z - 0.004 + Math.cos(an) * 0.056, 'blued', 'mag'); }
    } else if (kind === 'sgdrum') {
      h = 0.17;
      b.prof(GSP.magShape(0.08, 0.05, 0, 0, 0.03).map(q => [q[0] + z, q[1] + y]), 0.032, 'polymer', 'mag');
      b.cylX(0.078, 0.075, 0, y - 0.105, z, 'polymer', 'mag', 24);
      b.cylX(0.03, 0.082, 0, y - 0.105, z, 'steel', 'mag', 12);
      for (let i = 0; i < 10; i++) { const an = i / 10 * 6.283; b.cylX(0.011, 0.078, 0, y - 0.105 + Math.sin(an) * 0.058, z + Math.cos(an) * 0.058, 'dark', 'mag', 8); }
    } else if (kind === 'helix') {
      h = 0.07;
      b.tube(0.028, z + 0.11, z - 0.11, y - 0.03, mat || 'polymer', 'mag', { seg: 16 });
      b.tube(0.03, z + 0.112, z + 0.1, y - 0.03, 'steel', 'mag', { seg: 16 }); b.tube(0.03, z - 0.1, z - 0.112, y - 0.03, 'steel', 'mag', { seg: 16 });
      for (let i = 0; i < 5; i++) b.tube(0.0288, z + 0.07 - i * 0.035, z + 0.066 - i * 0.035, y - 0.03, 'dark', 'mag', { seg: 16 });
    }
    b.a.mag = new THREE.Vector3(0, y, z); b.a.magLen = h; b.a.magKind = b.a.magKind || 'mag';
    return b;
  },
  // barrel + default muzzle device; returns the muzzle tip z. kind: bird, brake, slant, comp, cone, heavy, thread, none
  muzzle(b, kind, z, y, r) {
    const M = 'blued';
    if (b.kit.muzzle) { b.a.muzzleMount = new THREE.Vector3(0, y, z); return z; }
    switch (kind) {
      case 'bird': b.tube(r + 0.0028, z + 0.004, z - 0.042, y, M); for (let i = 0; i < 5; i++) { const an = (i - 2) * 0.62; b.box(0.0026, 0.0012, 0.024, Math.sin(an) * (r + 0.0026), y + Math.cos(an) * (r + 0.0026), z - 0.022, 'dark', null, 0, 0, -an); } z -= 0.042; break;
      case 'brake': b.box(r * 2 + 0.01, r * 2 + 0.006, 0.05, 0, y, z - 0.024, M); b.slots(z - 0.012, z - 0.038, y, r + 0.0052, 3, 0.007, r * 1.5); b.box(r * 1.4, 0.0012, 0.034, 0, y + r + 0.0034, z - 0.025, 'dark'); z -= 0.049; break;
      case 'heavy': b.box(r * 2 + 0.03, r * 2 + 0.012, 0.03, 0, y, z - 0.02, M); b.box(r * 2 + 0.03, r * 2 + 0.012, 0.03, 0, y, z - 0.064, M); b.tube(r + 0.004, z, z - 0.09, y, M); b.slots(z - 0.042, z - 0.086, y, r + 0.0152, 2, 0.012, r * 1.6); z -= 0.09; break;
      case 'slant': b.tube(r + 0.0034, z + 0.004, z - 0.028, y, M); b.box(0.004, 0.0012, 0.02, 0, y + r + 0.0034, z - 0.014, 'dark'); z -= 0.028; break;
      case 'comp': b.tube(r + 0.004, z + 0.004, z - 0.06, y, M, null, { seg: 8 }); b.slots(z - 0.014, z - 0.05, y + 0.002, r + 0.0036, 3, 0.008, r); b.tube(r + 0.0045, z - 0.056, z - 0.06, y, 'dark', null, { seg: 8 }); z -= 0.06; break;
      case 'cone': b.tube(r + 0.002, z + 0.004, z - 0.05, y, M, null, { r2: r + 0.011 }); b.tube(r + 0.0105, z - 0.049, z - 0.052, y, 'dark'); z -= 0.052; break;
      case 'thread': b.tube(r + 0.0016, z + 0.002, z - 0.014, y, M); z -= 0.014; break;
    }
    // dark bore
    b.tube(r * 0.62, z + 0.001, z - 0.0012, y, 'dark');
    return z;
  },
  // iron sights. kind: flip (rail flip-ups), post (hooded front + rear aperture block), notch (leaf + post ears)
  // part: 'f' front only, 'r' rear only (to mix kinds)
  irons(b, kind, fz, rz, y, base, part) {
    const M = b.M;
    if (b.kit.optic) return b;
    if (kind === 'flip') {
      // y = rail top; sight line 3.2 cm above
      const sy = y + 0.032;
      if (part !== 'r') {
        b.box(0.018, 0.008, 0.016, 0, y + 0.004, fz, M); b.box(0.014, 0.022, 0.004, 0, y + 0.017, fz, M); b.box(0.0016, 0.012, 0.0016, 0, sy - 0.006, fz, 'bare');
        b.box(0.003, 0.014, 0.004, 0.0072, sy - 0.004, fz, M); b.box(0.003, 0.014, 0.004, -0.0072, sy - 0.004, fz, M);
      }
      if (part === 'f') { b.a.irons = Object.assign(b.a.irons || { rz }, { fz, y: sy }); return b; }
      b.box(0.018, 0.008, 0.016, 0, y + 0.004, rz, M);
      b.prof([[rz - 0.002, y + 0.008], [rz - 0.002, sy + 0.007], [rz + 0.002, sy + 0.007], [rz + 0.002, y + 0.008]], 0.005, M, null, { x: 0.0062, bev: 0 });
      b.prof([[rz - 0.002, y + 0.008], [rz - 0.002, sy + 0.007], [rz + 0.002, sy + 0.007], [rz + 0.002, y + 0.008]], 0.005, M, null, { x: -0.0062, bev: 0 });
      b.box(0.0174, 0.003, 0.004, 0, sy + 0.0085, rz, M); b.box(0.0174, 0.012, 0.004, 0, y + 0.014, rz, M);
      b.a.irons = part === 'r' && b.a.irons ? Object.assign(b.a.irons, { rz }) : { fz, rz, y: sy };
    } else if (kind === 'post') {
      // base = y of the mounting surface for front (barrel top) ; y = sight line
      b.prof([[fz + 0.02, base], [fz + 0.006, y - 0.012], [fz - 0.006, y - 0.012], [fz - 0.012, base]], 0.012, M, null, { bev: 0.001 });
      b.box(0.0018, 0.014, 0.0018, 0, y - 0.007, fz, 'bare');
      b.box(0.0026, 0.016, 0.01, 0.0076, y - 0.005, fz, M); b.box(0.0026, 0.016, 0.01, -0.0076, y - 0.005, fz, M);
      b.a.irons = { fz, rz, y };
    } else {
      // notch: tangent leaf at rz with two ears, front post with protective ears
      b.box(0.012, 0.004, 0.06, 0, y - 0.012, rz - 0.028, M, null, 0.08);
      b.box(0.005, 0.008, 0.005, 0.0052, y - 0.003, rz, M); b.box(0.005, 0.008, 0.005, -0.0052, y - 0.003, rz, M);
      b.prof([[fz + 0.016, base], [fz + 0.004, y - 0.01], [fz - 0.004, y - 0.01], [fz - 0.012, base]], 0.012, M, null, { bev: 0.001 });
      b.box(0.0018, 0.012, 0.0018, 0, y - 0.006, fz, 'bare');
      b.box(0.0024, 0.016, 0.008, 0.008, y - 0.004, fz, M, null, 0, 0, -0.2); b.box(0.0024, 0.016, 0.008, -0.008, y - 0.004, fz, M, null, 0, 0, 0.2);
      b.a.irons = { fz, rz, y };
    }
    return b;
  },
  bipod(b, z, y, deployed) {
    b.box(0.03, 0.014, 0.024, 0, y - 0.006, z, 'steel');
    if (deployed) { b.rod(0.0055, [0.012, y - 0.01, z], [0.085, y - 0.2, z - 0.03], 'steel'); b.rod(0.0055, [-0.012, y - 0.01, z], [-0.085, y - 0.2, z - 0.03], 'steel'); b.box(0.02, 0.008, 0.03, 0.088, y - 0.204, z - 0.03, 'rubber'); b.box(0.02, 0.008, 0.03, -0.088, y - 0.204, z - 0.03, 'rubber'); }
    else { b.rod(0.0055, [0.014, y - 0.012, z], [0.016, y - 0.016, z - 0.2], 'steel'); b.rod(0.0055, [-0.014, y - 0.012, z], [-0.016, y - 0.016, z - 0.2], 'steel'); b.box(0.012, 0.012, 0.022, 0.016, y - 0.016, z - 0.205, 'rubber'); b.box(0.012, 0.012, 0.022, -0.016, y - 0.016, z - 0.205, 'rubber'); }
    return b;
  },
  // pins, selector, magazine release on a receiver side wall at x = ±hx
  controls(b, hx, y, zSel, zRel) {
    b.cylX(0.0032, 0.003, hx, y + 0.01, zSel + 0.018, 'blued', null, 8); b.cylX(0.0032, 0.003, -hx, y + 0.01, zSel + 0.018, 'blued', null, 8);
    b.box(0.0034, 0.006, 0.02, -hx - 0.001, y + 0.012, zSel, 'blued', null, 0.5);
    b.box(0.0034, 0.009, 0.012, hx + 0.001, y + 0.012, zRel, 'blued');
    return b;
  }
};

// ---------- attachments ----------
// Catalogue of attachments (ids are used in kits and saved loadouts). `fit` lists the weapon categories; a weapon
// needs the matching mount anchor (optic rail, muzzle thread, underbarrel rail, side rail) for the slot to exist.
const GS_ATTACH = [
  // optics
  { id: 'op_reflex',  slot: 'optic', name: 'HALO-R OPEN REFLEX', desc: '1x open reflex. Fastest aim, clear dot.', fit: ['assault', 'smg', 'lmg', 'shotgun', 'rifle'], optic: { mag: 1, reticle: 'red_dot', kind: 'reflex' } },
  { id: 'op_dot',     slot: 'optic', name: 'CORONA T2 RED DOT', desc: '1x tube red dot. Precise 2 MOA dot.', fit: ['assault', 'smg', 'lmg', 'shotgun', 'rifle'], optic: { mag: 1, reticle: 'red_dot', kind: 'tube' } },
  { id: 'op_holo',    slot: 'optic', name: 'AURORA HOLOGRAPHIC', desc: '1x holographic. Ring and dot reticle.', fit: ['assault', 'smg', 'lmg', 'shotgun', 'rifle'], optic: { mag: 1, reticle: 'holo_ring', kind: 'holo' } },
  { id: 'op_green',   slot: 'optic', name: 'VERDANT G1 GREEN DOT', desc: '1x tube sight with a green dot.', fit: ['assault', 'smg', 'lmg', 'shotgun', 'rifle'], optic: { mag: 1, reticle: 'red_dot', kind: 'tube', color: '#3cff6a' } },
  { id: 'op_micro',   slot: 'optic', name: 'FIREFLY MICRO DOT', desc: '1x slide-mounted micro dot.', fit: ['pistol'], optic: { mag: 1, reticle: 'red_dot', kind: 'micro' } },
  { id: 'op_prism',   slot: 'optic', name: 'MERIDIAN 3.5x PRISM', desc: '3.5x combat prism scope.', fit: ['assault', 'lmg', 'rifle', 'smg'], optic: { mag: 3.5, reticle: 'chevron', kind: 'prism' } },
  { id: 'op_hybrid',  slot: 'optic', name: 'TWINPATH 3x HYBRID', desc: 'Holographic sight with a 3x magnifier.', fit: ['assault', 'lmg', 'rifle'], optic: { mag: 3, reticle: 'holo_ring', kind: 'hybrid' } },
  { id: 'op_lpvo',    slot: 'optic', name: 'RANGER 1-6x SCOPE', desc: '6x variable scope for medium range.', fit: ['assault', 'lmg', 'rifle'], optic: { mag: 6, reticle: 'crosshair', kind: 'scope', size: 0.8 } },
  { id: 'op_sniper',  slot: 'optic', name: 'LONGSIGHT 8x SCOPE', desc: '8x precision scope.', fit: ['rifle'], optic: { mag: 8, reticle: 'crosshair', kind: 'scope', size: 1 } },
  { id: 'op_sniper12',slot: 'optic', name: 'ZENITH 12x SCOPE', desc: '12x long-range scope. Narrow view.', fit: ['rifle'], optic: { mag: 12, reticle: 'crosshair', kind: 'scope', size: 1.15 } },
  // muzzle
  { id: 'mz_sup',     slot: 'muzzle', name: 'WHISPER-9 SUPPRESSOR', desc: 'Quiet shots, no flash. Slightly less range.', fit: ['assault', 'smg', 'lmg', 'rifle', 'pistol'], muzzle: { kind: 'sup', suppressed: true } },
  { id: 'mz_supS',    slot: 'muzzle', name: 'HUSH-K COMPACT SUPPRESSOR', desc: 'Short suppressor. Quiet, quick handling.', fit: ['assault', 'smg', 'pistol'], muzzle: { kind: 'supS', suppressed: true } },
  { id: 'mz_comp',    slot: 'muzzle', name: 'TORQUE COMPENSATOR', desc: 'Less vertical recoil.', fit: ['assault', 'smg', 'lmg', 'rifle', 'pistol'], muzzle: { kind: 'comp', recV: 0.84 } },
  { id: 'mz_flash',   slot: 'muzzle', name: 'TRIDENT FLASH HIDER', desc: 'Hides the muzzle flash, slightly steadier.', fit: ['assault', 'smg', 'lmg', 'rifle'], muzzle: { kind: 'flash', flash: 0.35, recH: 0.92 } },
  { id: 'mz_brake',   slot: 'muzzle', name: 'ANVIL MUZZLE BRAKE', desc: 'Much less recoil on heavy calibres.', fit: ['rifle', 'lmg', 'assault'], muzzle: { kind: 'brake', recV: 0.78, recH: 0.9 } },
  { id: 'mz_choke',   slot: 'muzzle', name: 'TIGHTLINE CHOKE', desc: 'Tighter pellet spread.', fit: ['shotgun'], muzzle: { kind: 'choke', spread: 0.72 } },
  { id: 'mz_breach',  slot: 'muzzle', name: 'RAM BREACHER', desc: 'Spiked standoff. Stronger weapon strikes.', fit: ['shotgun'], muzzle: { kind: 'breach', spread: 0.9 } },
  // underbarrel
  { id: 'ub_vgrip',   slot: 'underbarrel', name: 'BRACE VERTICAL GRIP', desc: 'Less horizontal recoil.', fit: ['assault', 'smg', 'lmg', 'shotgun'], under: { kind: 'vgrip', recH: 0.72 } },
  { id: 'ub_stubby',  slot: 'underbarrel', name: 'NUB STUBBY GRIP', desc: 'Steadier hip fire.', fit: ['assault', 'smg', 'lmg', 'shotgun'], under: { kind: 'stubby', hip: 0.8, recH: 0.88 } },
  { id: 'ub_angled',  slot: 'underbarrel', name: 'SLANT ANGLED GRIP', desc: 'Faster aiming, a little less recoil.', fit: ['assault', 'smg', 'lmg', 'rifle', 'shotgun'], under: { kind: 'angled', adsSpeed: 1.25, recV: 0.94 } },
  { id: 'ub_stop',    slot: 'underbarrel', name: 'WEDGE HAND STOP', desc: 'Light and quick. Slightly steadier.', fit: ['assault', 'smg'], under: { kind: 'stop', adsSpeed: 1.12, recH: 0.92 } },
  { id: 'ub_bipod',   slot: 'underbarrel', name: 'STILT BIPOD', desc: 'Far less recoil when crouched or prone.', fit: ['lmg', 'rifle', 'assault'], under: { kind: 'bipod', bipod: 0.55 } },
  // lasers / lights
  { id: 'ls_green',   slot: 'laser', name: 'EMERALD GREEN LASER', desc: 'Green laser: tighter hip fire, marks the impact point.', fit: ['assault', 'smg', 'lmg', 'shotgun', 'pistol', 'rifle'], laser: { color: 0x30ff5a } },
  { id: 'ls_red',     slot: 'laser', name: 'CRIMSON RED LASER', desc: 'Red laser: tighter hip fire, marks the impact point.', fit: ['assault', 'smg', 'lmg', 'shotgun', 'pistol', 'rifle'], laser: { color: 0xff2626 } },
  { id: 'ls_light',   slot: 'laser', name: 'NOVA WEAPON LIGHT', desc: 'Tactical flashlight for dark rooms.', fit: ['assault', 'smg', 'lmg', 'shotgun', 'pistol'], light: true },
  // magazines
  { id: 'mg_ext',     slot: 'magazine', name: 'EXTENDED MAGAZINE', desc: 'A third more rounds. Slightly slower reload.', fit: ['assault', 'smg', 'pistol', 'rifle', 'lmg', 'shotgun'], mag: { cap: 1.34, reload: 1.08, kind: 'ext' } },
  { id: 'mg_drum',    slot: 'magazine', name: 'DRUM MAGAZINE', desc: 'Double capacity. Slower reload and aim.', fit: ['assault', 'smg', 'shotgun'], mag: { cap: 2, reload: 1.3, adsSpeed: 0.85, kind: 'drum' } },
  { id: 'mg_fast',    slot: 'magazine', name: 'SPEED-PULL MAGAZINE', desc: 'Pull loop for faster reloads.', fit: ['assault', 'smg', 'pistol', 'rifle'], mag: { cap: 1, reload: 0.8, kind: 'fast' } }
];
const GS_ATT_BY_ID = {}; for (const a of GS_ATTACH) GS_ATT_BY_ID[a.id] = a;

const GSA = {
  // optic on the rail at (0, y, z): y = rail top. Returns the mounted block. grp: node the optic rides on
  optic(b, a, y, z, grp) {
    const o = a.optic, k = o.kind, M = 'blued';
    let lens, front, relief = 0.1, half = [0.012, 0.01];
    if (k === 'reflex') {
      b.box(0.026, 0.01, 0.046, 0, y + 0.005, z, M, grp);
      // hoop: two posts and a top bar around the glass
      b.box(0.003, 0.034, 0.005, 0.0135, y + 0.027, z - 0.017, M, grp); b.box(0.003, 0.034, 0.005, -0.0135, y + 0.027, z - 0.017, M, grp);
      b.box(0.03, 0.003, 0.005, 0, y + 0.0445, z - 0.017, M, grp);
      b.box(0.024, 0.031, 0.0012, 0, y + 0.0275, z - 0.017, 'glass', grp);
      b.box(0.01, 0.006, 0.012, 0, y + 0.013, z + 0.012, 'dark', grp);
      lens = [0, y + 0.028, z - 0.017]; front = lens; relief = 0.13; half = [0.012, 0.0155];
    } else if (k === 'micro') {
      b.box(0.022, 0.005, 0.03, 0, y + 0.0025, z, M, grp);
      b.box(0.0026, 0.02, 0.004, 0.0105, y + 0.015, z - 0.012, M, grp); b.box(0.0026, 0.02, 0.004, -0.0105, y + 0.015, z - 0.012, M, grp);
      b.box(0.0236, 0.0026, 0.004, 0, y + 0.0255, z - 0.012, M, grp);
      b.box(0.0184, 0.019, 0.001, 0, y + 0.0152, z - 0.012, 'glass', grp);
      lens = [0, y + 0.0155, z - 0.012]; front = lens; relief = 0.3; half = [0.009, 0.0095];
    } else if (k === 'tube') {
      const cy = y + 0.036;
      b.box(0.022, 0.012, 0.03, 0, y + 0.006, z, M, grp); b.box(0.012, 0.014, 0.022, 0, y + 0.016, z, M, grp);
      b.tube(0.0172, z + 0.038, z - 0.038, cy, M, grp, { open: true, seg: 20 }); b.tube(0.0145, z + 0.038, z - 0.038, cy, 'dark', grp, { open: true, seg: 20 });
      b.tube(0.0185, z + 0.04, z + 0.034, cy, M, grp, { open: true, seg: 20 }); b.tube(0.0185, z - 0.034, z - 0.04, cy, M, grp, { open: true, seg: 20 });
      b.cylY(0.007, 0.01, 0, cy + 0.02, z, M, grp, 10); b.cylX(0.007, 0.01, 0.02, cy, z, M, grp, 10);
      b.tube(0.0145, z - 0.03, z - 0.0308, cy, 'glass', grp, { seg: 20 });
      lens = [0, cy, z + 0.038]; front = [0, cy, z - 0.03]; relief = 0.1; half = [0.0145, 0.0145];
    } else if (k === 'holo' || k === 'hybrid') {
      const cy = y + 0.034;
      b.box(0.03, 0.014, 0.072, 0, y + 0.007, z, M, grp);
      b.box(0.004, 0.036, 0.04, 0.0165, cy, z - 0.012, M, grp); b.box(0.004, 0.036, 0.04, -0.0165, cy, z - 0.012, M, grp);
      b.box(0.037, 0.004, 0.04, 0, cy + 0.02, z - 0.012, M, grp);
      b.box(0.029, 0.036, 0.001, 0, cy, z - 0.026, 'glass', grp);
      b.box(0.012, 0.012, 0.02, 0, y + 0.02, z + 0.026, 'dark', grp);
      b.cylX(0.006, 0.006, 0.02, y + 0.008, z + 0.02, M, grp, 8);
      lens = [0, cy, z + 0.008]; front = [0, cy, z - 0.026]; relief = 0.1; half = [0.0145, 0.018];
      if (k === 'hybrid') {
        // flip magnifier behind the sight
        const mz = z + 0.085;
        b.box(0.022, 0.012, 0.026, 0, y + 0.006, mz, M, grp); b.box(0.01, 0.014, 0.02, 0, y + 0.016, mz, M, grp);
        b.tube(0.017, mz + 0.04, mz - 0.034, cy, M, grp, { seg: 18 }); b.tube(0.0185, mz + 0.046, mz + 0.036, cy, 'rubber', grp, { seg: 18 });
        b.tube(0.0135, mz + 0.0465, mz + 0.0455, cy, 'lens', grp, { seg: 18 });
        lens = [0, cy, mz + 0.046]; relief = 0.07;
      }
    } else if (k === 'prism') {
      const cy = y + 0.04;
      b.box(0.024, 0.014, 0.06, 0, y + 0.007, z, M, grp);
      b.prof([[z + 0.062, cy - 0.016], [z + 0.062, cy + 0.016], [z + 0.02, cy + 0.019], [z - 0.06, cy + 0.024], [z - 0.066, cy + 0.02], [z - 0.066, cy - 0.02], [z - 0.06, cy - 0.024], [z + 0.02, cy - 0.019]], 0.036, M, grp, { bev: 0.006, bs: 2 });
      b.box(0.004, 0.004, 0.07, 0, cy + 0.024, z - 0.01, 'red', grp);
      b.tube(0.019, z + 0.075, z + 0.06, cy, 'rubber', grp, { seg: 18 }); b.tube(0.014, z + 0.0755, z + 0.0745, cy, 'lens', grp, { seg: 18 });
      b.tube(0.017, z - 0.0665, z - 0.0675, cy, 'lens', grp, { seg: 18 });
      b.cylY(0.008, 0.01, 0, cy + 0.024, z + 0.03, M, grp, 10);
      lens = [0, cy, z + 0.075]; front = [0, cy, z - 0.067]; relief = 0.06; half = [0.014, 0.014];
    } else {
      // scope: tube, objective and ocular bells, turrets, rings
      const s = o.size || 1, cy = y + 0.03 + 0.012 * s, L = 0.3 * s;
      const zr = z + L * 0.46, zf = z - L * 0.54;
      b.tube(0.0152, zr - 0.07 * s, zf + 0.08 * s, cy, M, grp, { seg: 18 });
      b.tube(0.0152, zf + 0.08 * s, zf + 0.04 * s, cy, M, grp, { seg: 18, r2: 0.024 * s + 0.004 }); b.tube(0.024 * s + 0.004, zf + 0.04 * s, zf, cy, M, grp, { seg: 18 });
      b.tube(0.021 * s + 0.002, zr, zr - 0.05 * s, cy, M, grp, { seg: 18 }); b.tube(0.0152, zr - 0.05 * s, zr - 0.07 * s, cy, M, grp, { seg: 18, r2: 0.021 * s + 0.002 });
      b.tube(0.0225 * s + 0.002, zr + 0.008, zr - 0.006, cy, 'rubber', grp, { seg: 18 });
      b.tube(0.018 * s, zr + 0.0085, zr + 0.0075, cy, 'lens', grp, { seg: 18 }); b.tube(0.022 * s + 0.002, zf + 0.001, zf - 0.0006, cy, 'lens', grp, { seg: 18 });
      b.cylY(0.011, 0.02, 0, cy + 0.022, z - 0.005, M, grp, 12); b.cylX(0.011, 0.02, 0.022, cy, z - 0.005, M, grp, 12); b.cylX(0.009, 0.014, -0.02, cy, z - 0.005, M, grp, 12);
      b.box(0.03, 0.016, 0.03, 0, cy, z - 0.005, M, grp);
      for (const rz of [z + 0.05 * s, z - 0.06 * s]) { b.box(0.022, cy - y - 0.004, 0.014, 0, (cy + y) / 2 - 0.004, rz, M, grp); b.tube(0.0185, rz + 0.008, rz - 0.008, cy, M, grp, { seg: 12 }); }
      lens = [0, cy, zr + 0.008]; front = [0, cy, zf]; relief = 0.075; half = [0.018 * s, 0.018 * s];
    }
    return { id: a.id, lens: new THREE.Vector3(lens[0], lens[1], lens[2]), front: new THREE.Vector3(front[0], front[1], front[2]), eyeRelief: relief, mag: o.mag, reticle: o.reticle, color: o.color || '#ff2a1a', half, grp: grp || null };
  },
  // muzzle device at the muzzle mount; returns { flash: Vector3, ... }
  muzzle(b, a, p, r) {
    const k = a.muzzle.kind, y = p.y; let z = p.z, x = p.x || 0;
    const T = (rr, z0, z1, mat, o) => b.tube(rr, z0, z1, y, mat, null, Object.assign({ x }, o || {}));
    if (k === 'sup' || k === 'supS') {
      const L = k === 'sup' ? 0.17 : 0.115, R = Math.max(0.0175, r + 0.0085);
      T(R, z + 0.012, z - L, 'polymer', { seg: 18 }); T(R + 0.0012, z + 0.014, z + 0.004, 'blued', { seg: 18 }); T(R + 0.0008, z - L + 0.012, z - L - 0.002, 'blued', { seg: 18 });
      for (let i = 0; i < 4; i++) T(R + 0.0004, z - 0.03 - i * 0.022, z - 0.034 - i * 0.022, 'dark', { seg: 18 });
      z -= L + 0.002;
    } else if (k === 'comp') {
      T(r + 0.0048, z + 0.006, z - 0.064, 'blued', { seg: 8 });
      for (let i = 0; i < 3; i++) { b.box(0.0016, r * 1.2, 0.009, x + r + 0.0046, y + 0.002, z - 0.016 - i * 0.017, 'dark'); b.box(0.0016, r * 1.2, 0.009, x - r - 0.0046, y + 0.002, z - 0.016 - i * 0.017, 'dark'); b.box(r * 1.2, 0.0016, 0.009, x, y + r + 0.0046, z - 0.016 - i * 0.017, 'dark'); }
      z -= 0.064;
    } else if (k === 'flash') {
      T(r + 0.003, z + 0.006, z - 0.02, 'blued');
      for (let i = 0; i < 3; i++) { const an = i / 3 * 6.283 + 0.5; b.box(0.005, 0.0045, 0.05, x + Math.sin(an) * (r + 0.001), y + Math.cos(an) * (r + 0.001), z - 0.04, 'blued', null, 0, 0, -an); }
      z -= 0.065;
    } else if (k === 'brake') {
      T(r + 0.004, z + 0.006, z - 0.1, 'blued');
      for (let i = 0; i < 3; i++) b.box(r * 2 + 0.03, r * 2 + 0.01, 0.018, x, y, z - 0.022 - i * 0.03, 'blued');
      z -= 0.1;
    } else if (k === 'choke') {
      T(r + 0.0035, z + 0.004, z - 0.04, 'bare', { seg: 16 }); for (let i = 0; i < 6; i++) { const an = i / 6 * 6.283; b.box(0.004, 0.0014, 0.02, x + Math.sin(an) * (r + 0.0034), y + Math.cos(an) * (r + 0.0034), z - 0.022, 'dark', null, 0, 0, -an); }
      z -= 0.04;
    } else if (k === 'breach') {
      T(r + 0.004, z + 0.004, z - 0.045, 'blued', { seg: 12 });
      for (let i = 0; i < 6; i++) { const an = i / 6 * 6.283; b.box(0.006, 0.004, 0.03, x + Math.sin(an) * (r + 0.003), y + Math.cos(an) * (r + 0.003), z - 0.055, 'bare', null, 0, 0, -an); }
      z -= 0.07;
    }
    T(r * 0.62, z + 0.001, z - 0.0012, 'dark');
    return { id: a.id, flash: new THREE.Vector3(x, y, z), suppressed: !!a.muzzle.suppressed, flashK: a.muzzle.flash };
  },
  under(b, a, p) {
    const k = a.under.kind, y = p.y, z = p.z;
    let hand = null, vertical = false;
    if (k === 'vgrip') { b.box(0.024, 0.01, 0.03, 0, y - 0.005, z, 'blued'); b.cylY(0.0155, 0.092, 0, y - 0.054, z, 'polymer', null, 12, 0.014); b.cylY(0.017, 0.008, 0, y - 0.1, z, 'polymer', null, 12); for (let i = 0; i < 4; i++) b.cylY(0.0162, 0.003, 0, y - 0.03 - i * 0.016, z, 'dark', null, 12); hand = [0, y - 0.05, z]; vertical = true; }
    else if (k === 'stubby') { b.box(0.024, 0.01, 0.03, 0, y - 0.005, z, 'blued'); b.cylY(0.0165, 0.05, 0, y - 0.034, z, 'polymer', null, 12, 0.015); b.cylY(0.018, 0.006, 0, y - 0.06, z, 'polymer', null, 12); hand = [0, y - 0.034, z]; vertical = true; }
    else if (k === 'angled') { b.prof([[z + 0.05, y], [z + 0.052, y - 0.012], [z + 0.03, y - 0.036], [z - 0.02, y - 0.03], [z - 0.06, y - 0.01], [z - 0.06, y]], 0.03, 'polymer', null, { bev: 0.005, bs: 2 }); hand = [0, y - 0.03, z]; }
    else if (k === 'stop') { b.prof([[z + 0.022, y], [z + 0.02, y - 0.022], [z + 0.006, y - 0.026], [z - 0.02, y - 0.006], [z - 0.02, y]], 0.026, 'polymer', null, { bev: 0.004 }); hand = [0, y - 0.016, z - 0.03]; }
    else if (k === 'bipod') { GSP.bipod(b, z - 0.04, y, false); hand = [0, y - 0.012, z + 0.03]; }
    return { id: a.id, hand: hand ? new THREE.Vector3(hand[0], hand[1], hand[2]) : null, vertical };
  },
  // laser / light module on the side rail (p: position of the module centre; top = mounted over the handguard)
  side(b, a, p) {
    const x = p.x, y = p.y, z = p.z;
    if (a.light) {
      b.tube(0.012, z + 0.04, z - 0.03, y, 'blued', null, { x, seg: 12 }); b.tube(0.0155, z - 0.03, z - 0.052, y, 'blued', null, { x, seg: 12 });
      b.tube(0.0125, z - 0.0521, z - 0.0528, y, 'glowW', null, { x, seg: 12 }); b.box(0.008, 0.01, 0.03, x * 0.78, y, z, 'blued');
      return { flashlight: { id: a.id, emitter: new THREE.Vector3(x, y, z - 0.055) } };
    }
    b.box(0.024, 0.026, 0.062, x, y, z, 'blued'); b.box(0.02, 0.004, 0.03, x, y + 0.015, z + 0.006, 'polymer');
    b.box(0.008, 0.01, 0.03, x * 0.6, y, z, 'blued');
    b.tube(0.0052, z - 0.031, z - 0.0325, y + 0.004, a.laser.color === 0x30ff5a ? 'glowG' : 'glowR', null, { x: x + 0.004, seg: 10 });
    b.tube(0.007, z - 0.03, z - 0.034, y + 0.004, 'dark', null, { x: x + 0.004, seg: 10, open: true });
    return { laser: { id: a.id, emitter: new THREE.Vector3(x + 0.004, y + 0.004, z - 0.036), color: a.laser.color } };
  }
};

// reticle plane on the optic axis just in front of the front lens (drawn only while aiming)
function gsReticle(M) {
  const key = M.reticle, col = M.color;
  const tex = canvasTex('gsret_' + key + col, 128, 128, (x) => {
    x.clearRect(0, 0, 128, 128); x.strokeStyle = col; x.fillStyle = col; x.shadowColor = col; x.shadowBlur = 8; x.lineCap = 'round';
    if (key === 'holo_ring') { x.lineWidth = 4.5; x.beginPath(); x.arc(64, 64, 44, 0, Math.PI * 2); x.stroke(); for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; x.beginPath(); x.moveTo(64 + Math.cos(a) * 44, 64 + Math.sin(a) * 44); x.lineTo(64 + Math.cos(a) * 56, 64 + Math.sin(a) * 56); x.stroke(); } x.beginPath(); x.arc(64, 64, 5, 0, Math.PI * 2); x.fill(); }
    else if (key === 'chevron') { x.lineWidth = 5; x.beginPath(); x.moveTo(40, 92); x.lineTo(64, 60); x.lineTo(88, 92); x.stroke(); }
    else if (key === 'crosshair') { x.lineWidth = 3; x.beginPath(); x.moveTo(8, 64); x.lineTo(52, 64); x.moveTo(76, 64); x.lineTo(120, 64); x.moveTo(64, 8); x.lineTo(64, 52); x.moveTo(64, 76); x.lineTo(64, 120); x.stroke(); x.beginPath(); x.arc(64, 64, 3, 0, Math.PI * 2); x.fill(); }
    else { x.shadowBlur = 14; x.beginPath(); x.arc(64, 64, 15, 0, Math.PI * 2); x.fill(); x.fillStyle = '#fff'; x.globalAlpha = 0.55; x.beginPath(); x.arc(64, 64, 6, 0, Math.PI * 2); x.fill(); }
  });
  // sized by the angle it covers from the aiming eye (eye relief behind the rear lens)
  const dist = M.eyeRelief + Math.abs(M.lens.z - M.front.z) + 0.004;
  const size = dist * (key === 'holo_ring' ? 0.13 : key === 'chevron' ? 0.07 : key === 'crosshair' ? 0.16 : 0.052);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending, opacity: 0 }));
  m.position.set(M.front.x, M.front.y, M.front.z - 0.004); m.renderOrder = 40; m.name = 'reticle'; m.frustumCulled = false;
  return m;
}
