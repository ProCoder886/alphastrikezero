// ---------- Weapons: definitions, models, first-person viewmodel, firing, reloading ----------
// Spread values are cone half-angles in radians. recV/recH = camera recoil per shot (pitch / random yaw).
const SND = {
  pistol:   { s: 'enemy_single', rate: 1.28, vol: 0.75, layer: 'shot_viper', layerRate: 1.55, layerVol: 0.22, bass: 0.25, crack: 0.22, mech: 2400 },
  glock:    { s: 'enemy_single', rate: 1.38, vol: 0.7, layer: 'shot_viper', layerRate: 1.65, layerVol: 0.2, bass: 0.2, crack: 0.25, mech: 2600 },
  beretta:  { s: 'enemy_single', rate: 1.32, vol: 0.72, layer: 'shot_viper', layerRate: 1.6, layerVol: 0.2, bass: 0.22, crack: 0.22, mech: 2500 },
  deagle:   { s: 'shot_talon', rate: 1.32, vol: 0.85, bass: 0.5, bassF: 80, crack: 0.3, mech: 1900 },
  revolver: { s: 'shot_talon', rate: 1.18, vol: 0.85, bass: 0.55, bassF: 75, crack: 0.25 },
  mp5:      { s: 'shot_viper', rate: 1.38, vol: 0.62, bass: 0.2, crack: 0.12, mech: 2800 },
  uzi:      { s: 'shot_viper', rate: 1.48, vol: 0.6, layer: 'enemy_single', layerRate: 1.5, layerVol: 0.18, bass: 0.18, mech: 3000 },
  vector:   { s: 'shot_phantom', rate: 1.5, vol: 0.65, bass: 0.18, mech: 3200 },
  mac10:    { s: 'shot_viper', rate: 1.58, vol: 0.58, bass: 0.15, crack: 0.15, mech: 3100 },
  ak:       { s: 'enemy_single', rate: 0.92, vol: 0.95, layer: 'shot_viper', layerRate: 0.85, layerVol: 0.42, bass: 0.45, bassF: 65, crack: 0.15 },
  m4:       { s: 'shot_viper', rate: 1.0, vol: 0.9, bass: 0.35, crack: 0.18 },
  scar:     { s: 'shot_viper', rate: 0.9, vol: 0.95, bass: 0.45, bassF: 62, crack: 0.15 },
  aug:      { s: 'shot_viper', rate: 1.06, vol: 0.88, bass: 0.32, crack: 0.2 },
  famas:    { s: 'shot_viper', rate: 1.13, vol: 0.85, bass: 0.3, crack: 0.22 },
  dmr:      { s: 'shot_talon', rate: 1.1, vol: 0.92, bass: 0.48, bassF: 60, crack: 0.25 },
  pump:     { s: 'shot_titan', rate: 0.78, vol: 1.0, layer: 'explosion', layerRate: 2.4, layerVol: 0.22, bass: 0.7, bassF: 55 },
  tactical: { s: 'shot_titan', rate: 0.84, vol: 0.95, layer: 'explosion', layerRate: 2.6, layerVol: 0.18, bass: 0.6, bassF: 58 },
  auto:     { s: 'shot_titan', rate: 0.9, vol: 0.9, bass: 0.5, bassF: 60 },
  double:   { s: 'shot_titan', rate: 0.72, vol: 1.0, layer: 'explosion', layerRate: 2.2, layerVol: 0.3, bass: 0.85, bassF: 50 },
  barrett:  { s: 'shot_titan', rate: 1.0, vol: 1.0, bass: 0.85, bassF: 45, crack: 0.35 },
  awm:      { s: 'shot_phantom', rate: 1.0, vol: 1.0, bass: 0.5, bassF: 55, crack: 0.2 },
  m24:      { s: 'shot_talon', rate: 1.0, vol: 1.0, bass: 0.55, bassF: 55, crack: 0.25 },
  svd:      { s: 'shot_talon', rate: 1.08, vol: 0.95, bass: 0.5, bassF: 58, crack: 0.25 },
  lmg:      { s: 'shot_viper', rate: 0.86, vol: 0.95, layer: 'enemy_single', layerRate: 0.8, layerVol: 0.35, bass: 0.5, bassF: 60 },
  minigun:  { s: 'shot_viper', rate: 1.6, vol: 0.5, bass: 0.22, echo: false }
};

const WEAPON_DEFS = {
  // PISTOLS
  M1911:       { cls: 'pistol', model: 'pistol', len: 0.22, dmg: 34, rpm: 420, mag: 8,  auto: false, hip: 0.024, ads: 0.006, bloom: 0.012, recV: 0.034, recH: 0.01, reload: 1.5, adsFov: 60, snd: SND.pistol, label: 'GUARDIAN .45' },
  Glock:       { cls: 'pistol', model: 'pistol', len: 0.2,  dmg: 24, rpm: 520, mag: 17, auto: false, hip: 0.026, ads: 0.007, bloom: 0.01, recV: 0.026, recH: 0.01, reload: 1.3, adsFov: 60, snd: SND.glock, tint: 0x6a6e74, label: 'SENTRY P9' },
  Beretta:     { cls: 'pistol', model: 'pistol', len: 0.22, dmg: 27, rpm: 460, mag: 15, auto: false, hip: 0.025, ads: 0.006, bloom: 0.011, recV: 0.028, recH: 0.01, reload: 1.4, adsFov: 60, snd: SND.beretta, tint: 0x9a8a70, label: 'CENTURION 9' },
  DesertEagle: { cls: 'pistol', model: 'deagle', len: 0.27, dmg: 64, rpm: 170, mag: 7,  auto: false, hip: 0.03, ads: 0.004, bloom: 0.03, recV: 0.075, recH: 0.02, reload: 1.9, adsFov: 58, snd: SND.deagle, label: 'WARHAWK .50' },
  Revolver:    { cls: 'pistol', model: 'deagle', len: 0.28, dmg: 58, rpm: 140, mag: 6,  auto: false, hip: 0.028, ads: 0.004, bloom: 0.028, recV: 0.07, recH: 0.018, reload: 2.4, adsFov: 58, snd: SND.revolver, tint: 0x5a5e66, label: 'MARSHAL R6' },
  // SMGS
  MP5:         { cls: 'smg', model: 'mp5', len: 0.56, dmg: 21, rpm: 800, mag: 30, auto: true, hip: 0.032, ads: 0.008, bloom: 0.005, maxBloom: 0.04, recV: 0.012, recH: 0.007, reload: 2.0, adsFov: 56, snd: SND.mp5, label: 'VIPER 9' },
  Uzi:         { cls: 'smg', model: 'mp5', len: 0.47, dmg: 18, rpm: 900, mag: 32, auto: true, hip: 0.038, ads: 0.011, bloom: 0.006, maxBloom: 0.05, recV: 0.013, recH: 0.009, reload: 2.0, adsFov: 56, snd: SND.uzi, label: 'STRYX K' },
  Vector:      { cls: 'smg', model: 'mp5', len: 0.52, dmg: 17, rpm: 1100, mag: 25, auto: true, hip: 0.03, ads: 0.008, bloom: 0.004, maxBloom: 0.035, recV: 0.008, recH: 0.005, reload: 1.7, adsFov: 56, snd: SND.vector, label: 'RAZOR V' },
  MAC10:       { cls: 'smg', model: 'mp5', len: 0.42, dmg: 16, rpm: 1050, mag: 30, auto: true, hip: 0.045, ads: 0.014, bloom: 0.007, maxBloom: 0.06, recV: 0.015, recH: 0.012, reload: 1.9, adsFov: 56, snd: SND.mac10, label: 'MAKO 10' },
  // ASSAULT RIFLES
  AK47:        { cls: 'rifle', model: 'enemy_ak', len: 0.88, dmg: 33, rpm: 600, mag: 30, auto: true, hip: 0.036, ads: 0.006, bloom: 0.006, maxBloom: 0.045, recV: 0.021, recH: 0.011, reload: 2.4, adsFov: 52, snd: SND.ak, label: 'VARGAN 7' },
  M4A1:        { cls: 'rifle', model: 'rifle_viper', len: 0.86, dmg: 27, rpm: 780, mag: 30, auto: true, hip: 0.032, ads: 0.004, bloom: 0.005, maxBloom: 0.035, recV: 0.015, recH: 0.007, reload: 2.1, adsFov: 48, snd: SND.m4, label: 'KESTREL C4' },
  ScarL:       { cls: 'rifle', model: 'rifle_viper', len: 0.9, dmg: 30, rpm: 650, mag: 30, auto: true, hip: 0.033, ads: 0.004, bloom: 0.005, maxBloom: 0.038, recV: 0.017, recH: 0.008, reload: 2.2, adsFov: 48, snd: SND.scar, tint: 0xc8b48a, label: 'TALON SR' },
  AUG:         { cls: 'rifle', model: 'rifle_viper', len: 0.8, dmg: 26, rpm: 700, mag: 30, auto: true, hip: 0.03, ads: 0.003, bloom: 0.004, maxBloom: 0.032, recV: 0.014, recH: 0.006, reload: 2.4, adsFov: 44, snd: SND.aug, tint: 0x7a8a6a, label: 'HALCYON A3' },
  FAMAS:       { cls: 'rifle', model: 'rifle_viper', len: 0.76, dmg: 23, rpm: 950, mag: 25, auto: true, hip: 0.034, ads: 0.005, bloom: 0.005, maxBloom: 0.04, recV: 0.015, recH: 0.008, reload: 2.3, adsFov: 48, snd: SND.famas, tint: 0x8a8e94, label: 'FENRIS FX' },
  Woodpecker:  { cls: 'dmr', model: 'woodpecker', len: 1.12, dmg: 62, rpm: 300, mag: 15, auto: false, hip: 0.05, ads: 0.0015, bloom: 0.02, recV: 0.045, recH: 0.012, reload: 2.4, adsFov: 30, scope: 4, snd: SND.dmr, label: 'WARDEN DMR' },
  // SHOTGUNS (pellets inside the cone)
  PumpShotgun:     { cls: 'shotgun', model: 'shotgun', len: 1.0, dmg: 17, pellets: 9, rpm: 72, mag: 6, auto: false, pump: true, hip: 0.06, ads: 0.045, bloom: 0, recV: 0.07, recH: 0.02, reload: 0.5, adsFov: 60, snd: SND.pump, label: 'BREACHER 12' },
  TacticalShotgun: { cls: 'shotgun', model: 'shotgun', len: 0.95, dmg: 14, pellets: 8, rpm: 160, mag: 8, auto: false, hip: 0.055, ads: 0.04, bloom: 0.01, recV: 0.055, recH: 0.02, reload: 0.45, adsFov: 60, snd: SND.tactical, tint: 0x6a7060, label: 'RIOT SA' },
  AutoShotgun:     { cls: 'shotgun', model: 'shotgun', len: 0.98, dmg: 11, pellets: 8, rpm: 260, mag: 12, auto: true, hip: 0.065, ads: 0.05, bloom: 0.01, recV: 0.05, recH: 0.022, reload: 0.4, adsFov: 60, snd: SND.auto, tint: 0x55595e, label: 'HAMMER AA' },
  DoubleBarrel:    { cls: 'shotgun', model: 'shotgun', len: 0.92, dmg: 21, pellets: 10, rpm: 320, mag: 2, auto: false, hip: 0.07, ads: 0.055, bloom: 0, recV: 0.09, recH: 0.025, reload: 0.55, adsFov: 60, snd: SND.double, tint: 0x8a6a4a, label: 'COACH DB' },
  // SNIPERS
  BarrettM82:  { cls: 'sniper', model: 'rifle_titan', len: 1.42, dmg: 190, rpm: 90, mag: 5, auto: false, hip: 0.08, ads: 0.0, bloom: 0.04, recV: 0.12, recH: 0.02, reload: 3.2, adsFov: 14, scope: 10, snd: SND.barrett, label: 'HAMMERFALL .50' },
  AWM:         { cls: 'sniper', model: 'rifle_phantom', len: 1.24, dmg: 160, rpm: 50, mag: 5, auto: false, bolt: true, hip: 0.07, ads: 0.0, bloom: 0, recV: 0.09, recH: 0.015, reload: 2.9, adsFov: 16, scope: 8, snd: SND.awm, label: 'SENTINEL 338' },
  Dragunov:    { cls: 'sniper', model: 'rifle_talon', len: 1.2, dmg: 92, rpm: 220, mag: 10, auto: false, hip: 0.065, ads: 0.0008, bloom: 0.012, recV: 0.06, recH: 0.014, reload: 2.6, adsFov: 24, scope: 6, snd: SND.svd, tint: 0x9a7a5a, label: 'DRAGOON SV' },
  M24:         { cls: 'sniper', model: 'rifle_talon', len: 1.12, dmg: 135, rpm: 55, mag: 5, auto: false, bolt: true, hip: 0.07, ads: 0.0, bloom: 0, recV: 0.08, recH: 0.015, reload: 2.5, adsFov: 18, scope: 8, snd: SND.m24, label: 'LONGBOW M2' },
  // HEAVY
  LMG:         { cls: 'lmg', model: 'enemy_ak', len: 1.02, drum: true, dmg: 29, rpm: 700, mag: 100, auto: true, hip: 0.045, ads: 0.012, bloom: 0.004, maxBloom: 0.05, recV: 0.017, recH: 0.012, reload: 4.6, adsFov: 54, snd: SND.lmg, tint: 0x6a6a60, label: 'VARGAN RPL' },
  Minigun:     { cls: 'minigun', model: 'proc_minigun', len: 0.95, dmg: 21, rpm: 1500, mag: 200, auto: true, hip: 0.05, ads: 0.035, bloom: 0.002, maxBloom: 0.06, recV: 0.006, recH: 0.008, reload: 5.0, adsFov: 66, noADS: true, spinUp: 0.45, snd: SND.minigun, label: 'CYCLONE XR' },
  // LASER-SIGHT WEAPONS: a rail laser marks the exact impact point (the round goes where the dot is, even from the
  // hip); the beam itself is only visible at night and in dark places
  MK18:        { cls: 'rifle', model: 'rifle_viper', len: 0.76, dmg: 28, rpm: 820, mag: 30, auto: true, hip: 0.013, ads: 0.003, bloom: 0.004, maxBloom: 0.026, recV: 0.014, recH: 0.006, reload: 2.0, adsFov: 48, snd: SND.m4, tint: 0x3c4046, laser: 0x30ff5a, label: 'KESTREL K' },
  HK416:       { cls: 'rifle', model: 'rifle_viper', len: 0.88, dmg: 31, rpm: 720, mag: 30, auto: true, hip: 0.014, ads: 0.003, bloom: 0.005, maxBloom: 0.028, recV: 0.016, recH: 0.007, reload: 2.2, adsFov: 46, snd: SND.scar, tint: 0xb4a07a, laser: 0xff2626, label: 'TALON SR' },
  MP7:         { cls: 'smg', model: 'mp5', len: 0.5, dmg: 20, rpm: 950, mag: 40, auto: true, hip: 0.015, ads: 0.006, bloom: 0.004, maxBloom: 0.028, recV: 0.01, recH: 0.006, reload: 1.8, adsFov: 56, snd: SND.vector, tint: 0x484b50, laser: 0x30ff5a, label: 'WASP MP' },
  P90:         { cls: 'smg', model: 'mp5', len: 0.5, dmg: 19, rpm: 900, mag: 50, auto: true, hip: 0.016, ads: 0.006, bloom: 0.004, maxBloom: 0.03, recV: 0.009, recH: 0.006, reload: 2.1, adsFov: 56, snd: SND.mp5, tint: 0x6c6852, laser: 0xff2626, label: 'HORNET PDW' },
  G18:         { cls: 'pistol', model: 'pistol', len: 0.21, dmg: 22, rpm: 1100, mag: 33, auto: true, hip: 0.015, ads: 0.006, bloom: 0.008, maxBloom: 0.036, recV: 0.019, recH: 0.012, reload: 1.5, adsFov: 60, snd: SND.glock, tint: 0x5a5e64, laser: 0xff2626, label: 'SENTRY AUTO' }
};
const WEAPON_ORDER = ['M4A1', 'AK47', 'MP5', 'PumpShotgun', 'AWM', 'DesertEagle', 'BarrettM82', 'Woodpecker', 'M1911', 'LMG',
  'MK18', 'HK416', 'MP7', 'P90', 'G18',
  'ScarL', 'AUG', 'FAMAS', 'Uzi', 'Vector', 'MAC10', 'TacticalShotgun', 'AutoShotgun', 'DoubleBarrel', 'Dragunov', 'M24', 'Glock', 'Beretta', 'Revolver', 'Minigun'];
// one sniper rifle per mode (a different one in each); campaign keeps the full armoury
const SNIPER_RIFLES = ['BarrettM82', 'AWM', 'Dragunov', 'M24'];
const MODE_SNIPER = { tdm: 'AWM', endless: 'BarrettM82', survival: 'Dragunov' };
function modeLoadout() { const keep = MODE_SNIPER[S.mode]; return keep ? WEAPON_ORDER.filter(n => !SNIPER_RIFLES.includes(n) || n === keep) : WEAPON_ORDER; }
// guns with a mounted optic aim through a full-screen scope view (no close-up of the 3D optic); zoom of that view
function hasOptic(w) { return !!(w && !w.def.scope && w.model && w.model.userData.ads && w.model.userData.ads.lens); }
// a magnified scope (sniper and marksman rifles, any gun wearing a 2x+ optic)
function isScoped(w) { return !!(w && w.def && (w.def.scope >= 2 || w.def.cls === 'sniper')); }
function adsFovOf(w) { return hasOptic(w) ? Math.min(w.def.adsFov, w.def.cls === 'lmg' ? 36 : 30) : w.def.adsFov; }

// Class defaults for hand placement (fractions along the gun from stock (0) to muzzle (1)).
// hip = [x, drop of the sight line below screen centre, z]
const CLASS_VM = {
  pistol:  { grip: 0.2, fore: 0.2, hip: [0.11, 0.085, -0.36], adsZ: -0.32 },
  smg:     { grip: 0.42, fore: 0.7, hip: [0.12, 0.075, -0.4], adsZ: -0.24 },
  rifle:   { grip: 0.36, fore: 0.62, hip: [0.12, 0.075, -0.43], adsZ: -0.24 },
  dmr:     { grip: 0.34, fore: 0.6, hip: [0.12, 0.08, -0.44], adsZ: -0.24 },
  shotgun: { grip: 0.3, fore: 0.62, hip: [0.12, 0.075, -0.43], adsZ: -0.26 },
  sniper:  { grip: 0.34, fore: 0.6, hip: [0.12, 0.085, -0.46], adsZ: -0.24 },
  lmg:     { grip: 0.36, fore: 0.6, hip: [0.13, 0.085, -0.43], adsZ: -0.26 },
  minigun: { grip: 0.45, fore: 0.62, hip: [0.11, 0.16, -0.42], adsZ: -0.3 },
  launcher: { grip: 0.3, fore: 0.55, hip: [0.12, 0.1, -0.44], adsZ: -0.3 },
  melee:   { grip: 0.2, fore: 0.2, hip: [0.15, 0.13, -0.4], adsZ: -0.3 }
};
// hip pose of catalogue weapons per class: [x, sight-line drop below the screen centre, grip z]
// (real-size models carried high and close, so the weapon fills the lower right of the view)
const HQ_HIP = {
  rifle: [0.078, 0.03, -0.27], smg: [0.076, 0.032, -0.27], lmg: [0.088, 0.04, -0.29], dmr: [0.078, 0.032, -0.28], sniper: [0.082, 0.04, -0.29],
  shotgun: [0.078, 0.034, -0.27], pistol: [0.07, 0.05, -0.36], launcher: [0.1, 0.07, -0.26], melee: [0.13, 0.13, -0.36]
};
// tube-fed shotguns and drum launchers are loaded one round at a time
function usesShells(d) { return d.hq ? !!d.shells : d.cls === 'shotgun'; }
// Per-model orientation fixes (applied when the automatic muzzle detection is wrong)
const MODEL_FIX = { };
// First-person aiming per model (tuned against rendered frames). drop: how far the aiming axis sits below the
// computed sight line (> 0 raises the gun: optic centre instead of the top of its housing), x: sideways position of
// the sight axis in the model (the gun shifts the other way so the sight lines up with the screen centre),
// z: eye distance behind the grip, lens: the model has an optic whose eyepiece is baked into the texture as an
// opaque disc - a see-through hole of this radius (fraction of screen height) is cut there and the red dot is
// drawn inside it.
const MODEL_ADS = {
  rifle_viper: { drop: 0.03, x: 0.006, z: -0.3, lens: 0.088 },
  enemy_ak:    { drop: 0.03, x: 0.004, z: -0.3, lens: 0.12 },
  mp5:         { drop: -0.04, x: 0, z: -0.4 },
  shotgun:     { drop: -0.02, x: 0, z: -0.32 },
  deagle:      { drop: -0.025, x: 0, z: -0.34 },
  pistol:      { drop: 0, x: 0, z: -0.34 },
  woodpecker:  { drop: 0, x: 0, z: -0.26 }
};
// shared uniforms of the see-through eyepiece hole (drawing-buffer pixels)
const VM_HOLE = { c: { value: new THREE.Vector2(-1e4, -1e4) }, r: { value: 0 } };
const _fpMats = new Map();
function holeShader(m) {
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uHoleC = VM_HOLE.c; sh.uniforms.uHoleR = VM_HOLE.r;
    sh.fragmentShader = 'uniform vec2 uHoleC;\nuniform float uHoleR;\n' + sh.fragmentShader.replace('#include <clipping_planes_fragment>',
      '#include <clipping_planes_fragment>\n if (uHoleR > 0.0 && distance(gl_FragCoord.xy, uHoleC) < uHoleR) discard;');
  };
  m.customProgramCacheKey = () => 'fpgun';
  return m;
}
// first-person copy of a gun material (enemy guns share the originals and must never get the hole)
function fpMaterial(m) {
  let c = _fpMats.get(m.uuid);
  if (!c) { c = holeShader(m.clone()); _fpMats.set(m.uuid, c); }
  return c;
}

// ---------- gun model analysis & construction ----------
const _gunInfo = {};
function analyzeGun(key) {
  if (_gunInfo[key]) return _gunInfo[key];
  const m = ASSETS.models[key];
  if (!m) return null;
  m.scene.updateMatrixWorld(true);
  const size = m.size, longX = size.x > size.z;
  const A = longX ? 0 : 2, B = longX ? 2 : 0;
  const pts = [];
  const v = new THREE.Vector3();
  m.scene.traverse(o => {
    if (!o.isMesh) return;
    const pos = o.geometry.attributes.position, step = Math.max(1, Math.floor(pos.count / 4000));
    for (let i = 0; i < pos.count; i += step) { v.set(readAttr(pos, i, 0), readAttr(pos, i, 1), readAttr(pos, i, 2)).applyMatrix4(o.matrixWorld); pts.push([v.getComponent(A), v.y, v.getComponent(B)]); }
  });
  const amin = m.box.min.getComponent(A), amax = m.box.max.getComponent(A), L = amax - amin;
  const NB = 24, binMin = new Array(NB).fill(Infinity), binMax = new Array(NB).fill(-Infinity);
  for (const p of pts) { const b = clamp(Math.floor((p[0] - amin) / L * NB), 0, NB - 1); binMin[b] = Math.min(binMin[b], p[1]); binMax[b] = Math.max(binMax[b], p[1]); }
  const h = i => (binMax[i] > binMin[i] ? binMax[i] - binMin[i] : 0);
  // the stock / grip end is taller than the barrel end
  const lowEnd = h(0) + h(1) + h(2) + h(3), highEnd = h(NB - 1) + h(NB - 2) + h(NB - 3) + h(NB - 4);
  let muzzlePositive = lowEnd > highEnd; // muzzle at +A
  const fix = MODEL_FIX[key];
  if (fix && fix.flip) muzzlePositive = !muzzlePositive;
  // profile from stock (t=0) to muzzle (t=1)
  const prof = [];
  for (let i = 0; i < NB; i++) { const bi = muzzlePositive ? i : NB - 1 - i; prof.push({ min: binMin[bi], max: binMax[bi] }); }
  const info = { key, A, longX, muzzlePositive, amin, amax, L, prof, NB, centerB: m.center.getComponent(B), box: m.box.clone() };
  return (_gunInfo[key] = info);
}

function profAt(info, t) { const i = clamp(Math.floor(t * info.NB), 0, info.NB - 1); const p = info.prof[i]; return isFinite(p.min) ? p : info.prof.find(q => isFinite(q.min)); }

// Builds a gun whose origin is the pistol grip, muzzle along -Z, scaled to `def.len` metres.
// returns Group with userData {muzzle, fore, sightY, len}
// third-person (AI) weapons use light models: the first-person ones carry up to 55k vertices each
const AI_GUN_MODEL = { rifle_viper: 'enemy_ak', shotgun: 'm590' };
function buildGun(name, forEnemy) {
  const def = WEAPON_DEFS[name] || WEAPON_DEFS.AK47;
  const cv = CLASS_VM[def.cls];
  if (def.model === 'proc_minigun') return buildMinigun(def);
  const model = forEnemy && AI_GUN_MODEL[def.model] && ASSETS.models[AI_GUN_MODEL[def.model]] ? AI_GUN_MODEL[def.model] : def.model;
  const info = analyzeGun(model);
  if (!info) return buildFallbackGun(def);
  const m = ASSETS.models[model];
  const k = def.len / info.L;
  const gT = (def.gripT !== undefined ? def.gripT : cv.grip), fT = (def.foreT !== undefined ? def.foreT : cv.fore);
  const gp = profAt(info, gT), fp = profAt(info, fT);
  const center = (gp.min + gp.max) / 2;
  const gripY = center - (center - gp.min) * 0.45;
  const aGrip = info.muzzlePositive ? info.amin + gT * info.L : info.amax - gT * info.L;
  // sight line: highest point just ahead of the grip (optic/rear sight)
  let sightTop = -Infinity;
  for (let t = gT; t <= Math.min(1, gT + 0.3); t += 1 / info.NB) sightTop = Math.max(sightTop, profAt(info, t).max);
  const sightY = (sightTop - gripY) * k - (def.scope ? 0.024 : 0.012);
  const rotY = info.longX ? (info.muzzlePositive ? Math.PI / 2 : -Math.PI / 2) : (info.muzzlePositive ? Math.PI : 0);

  const inner = m.scene.clone(true);
  const gripModel = new THREE.Vector3(); gripModel.setComponent(info.A, aGrip); gripModel.y = gripY; gripModel.setComponent(info.A === 0 ? 2 : 0, info.centerB);
  inner.position.sub(gripModel);
  const pivot = new THREE.Group(); pivot.rotation.y = rotY; pivot.scale.setScalar(k); pivot.add(inner);
  const g = new THREE.Group(); g.add(pivot);
  if (def.tint) {
    inner.traverse(o => { if (o.isMesh) { o.material = (Array.isArray(o.material) ? o.material : [o.material]).map(mm => { const c = mm.clone(); c.color = (c.color || new THREE.Color(1, 1, 1)).clone().multiply(new THREE.Color(def.tint)).multiplyScalar(1.25); return forEnemy ? c : holeShader(c); }); if (o.material.length === 1) o.material = o.material[0]; } });
  } else if (!forEnemy) {
    inner.traverse(o => { if (o.isMesh) o.material = Array.isArray(o.material) ? o.material.map(fpMaterial) : fpMaterial(o.material); });
  }
  if (def.laser && !forEnemy) {
    // rail-mounted laser module on the right side of the fore-end, emitter facing forward
    const fy = (fp.min - gripY) * k, fz = -(Math.min(0.92, fT + 0.08) - gT) * def.len;
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.024, 0.075), gunMaterial('gunmetal'));
    box.position.set(0.032, fy + 0.035, fz); g.add(box);
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.007, 10), new THREE.MeshBasicMaterial({ color: def.laser, toneMapped: false }));
    lens.position.set(0.032, fy + 0.035, fz - 0.0385); lens.rotation.y = Math.PI; g.add(lens);
    g.userData.laser = new THREE.Vector3(0.032, fy + 0.035, fz - 0.04);
  }
  if (def.drum) {
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.07, 16), gunMaterial('gunmetal'));
    drum.rotation.z = Math.PI / 2; drum.position.set(0, -0.09, -(0.5 - gT) * def.len + 0.12); g.add(drum);
  }
  const muzzleT = profAt(info, 0.99);
  // rear of the optic / sight block: where the profile first reaches its top ahead of the grip
  let tTop = gT;
  for (let t = gT; t <= Math.min(1, gT + 0.3); t += 1 / info.NB) if (profAt(info, t).max >= sightTop - 1e-6) { tTop = t; break; }
  g.userData = {
    len: def.len,
    muzzle: new THREE.Vector3(0, ((muzzleT.min + muzzleT.max) / 2 - gripY) * k, -(1 - gT) * def.len),
    fore: new THREE.Vector3(0, (fp.min - gripY) * k - 0.012, -(fT - gT) * def.len),
    magPos: new THREE.Vector3(0, (gp.min - gripY) * k * 0.6, -(Math.min(0.95, gT + 0.12) - gT) * def.len),
    sightY, gripT: gT, ads: forEnemy ? null : (MODEL_ADS[model] || null), lensZ: -(tTop - gT) * def.len + 0.02, laser: g.userData.laser || null
  };
  g.traverse(o => { if (o.isMesh) { o.castShadow = !!forEnemy; o.receiveShadow = !!forEnemy; o.frustumCulled = false; } });
  return g;
}

function buildMinigun(def) {
  const g = new THREE.Group(), mat = gunMaterial('gunmetal'), dark = gunMaterial('polymer');
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.16, 0.36), dark); body.position.set(0, 0.02, -0.05); g.add(body);
  const barrels = new THREE.Group(); barrels.position.set(0, 0.03, -0.28);
  for (let i = 0; i < 6; i++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.62, 8), mat); b.rotation.x = Math.PI / 2; const a = i / 6 * Math.PI * 2; b.position.set(Math.cos(a) * 0.04, Math.sin(a) * 0.04, -0.28); barrels.add(b); }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.01, 6, 16), mat); ring.position.z = -0.5; barrels.add(ring);
  const ring2 = ring.clone(); ring2.position.z = -0.1; barrels.add(ring2);
  g.add(barrels);
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.2, 0.18), MATLIB.plain(0x4a5a3a, { rough: 0.7, metal: 0.3 })); box.position.set(-0.14, -0.08, 0.02); g.add(box);
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.22), mat); handle.position.set(0, 0.14, -0.08); g.add(handle);
  g.userData = { len: def.len, muzzle: new THREE.Vector3(0, 0.03, -0.9), fore: new THREE.Vector3(0, 0.15, -0.12), magPos: new THREE.Vector3(-0.14, -0.1, 0), sightY: 0.12, barrels };
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
  return g;
}
function buildFallbackGun(def) {
  const g = new THREE.Group(), mat = gunMaterial('gunmetal');
  const b = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.09, def.len), mat); b.position.z = -def.len * 0.35; g.add(b);
  g.userData = { len: def.len, muzzle: new THREE.Vector3(0, 0, -def.len * 0.85), fore: new THREE.Vector3(0, -0.04, -def.len * 0.4), magPos: new THREE.Vector3(0, -0.08, -0.08), sightY: 0.06 };
  return g;
}

// ---------- first-person arms ----------
const VM = { root: null, pose: null, gun: null, armR: null, armL: null, handL: null, handR: null, flash: null, shells: [], camoTheme: '' };
function camoTexture(theme) {
  const cols = {
    desert: ['#b49a6a', '#8f744a', '#d2bd8f', '#6e5a3a'], woodland: ['#4a5634', '#2f3a22', '#6a6a44', '#1e231a'],
    arctic: ['#d8dde2', '#a9b2bc', '#eef2f5', '#7c8792'], urban: ['#55595f', '#3a3d42', '#777b80', '#24272b'], night: ['#2a2f3a', '#1a1d24', '#3c4250', '#101216']
  }[theme] || ['#55595f', '#3a3d42', '#777b80', '#24272b'];
  return canvasTex('camo_' + theme, 256, 256, (x) => {
    x.fillStyle = cols[0]; x.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 70; i++) {
      x.fillStyle = cols[1 + (i % 3)]; x.beginPath();
      const cx = Math.random() * 256, cy = Math.random() * 256, r = 10 + Math.random() * 26;
      for (let k = 0; k < 8; k++) { const a = k / 8 * 6.28, rr = r * (0.6 + Math.random() * 0.6); x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.6); }
      x.fill();
    }
  }, { repeat: true });
}
function limbMesh(r0, r1, mat) {
  const geo = new THREE.CylinderGeometry(r1, r0, 1, 12, 1); geo.translate(0, 0.5, 0);
  const m = new THREE.Mesh(geo, mat); m.frustumCulled = false; return m;
}
const _lUp = new THREE.Vector3(0, 1, 0), _lD = new THREE.Vector3();
function placeLimb(m, a, b) { _lD.subVectors(b, a); const len = _lD.length(); m.position.copy(a); m.quaternion.setFromUnitVectors(_lUp, _lD.multiplyScalar(1 / len)); m.scale.set(1, len, 1); }

function buildHand(glove, left) {
  const h = new THREE.Group();
  const palm = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.088, 0.085), glove); palm.position.set(0, -0.01, 0.0); h.add(palm);
  const fingers = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.075, 0.045), glove); fingers.position.set(left ? 0.03 : -0.03, -0.02, -0.03); fingers.rotation.y = left ? -0.5 : 0.5; h.add(fingers);
  const thumb = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.06, 8), glove); thumb.position.set(left ? -0.02 : 0.02, 0.035, -0.035); thumb.rotation.x = Math.PI / 2.3; h.add(thumb);
  const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.034, 0.05, 12), glove); cuff.rotation.x = Math.PI / 2; cuff.position.set(0, 0.0, 0.06); h.add(cuff);
  h.traverse(o => { if (o.isMesh) o.frustumCulled = false; });
  return h;
}

function setupViewmodel(theme) {
  if (VM.root) weaponRig.remove(VM.root);
  VM.root = new THREE.Group(); VM.pose = new THREE.Group(); VM.root.add(VM.pose);
  weaponRig.add(VM.root);
  const sleeve = new THREE.MeshStandardMaterial({ map: camoTexture(theme), roughness: 0.9, metalness: 0, envMapIntensity: 0.25 });
  sleeve.map.repeat.set(1, 2);
  const glove = new THREE.MeshStandardMaterial({ color: 0x17191b, roughness: 0.82, metalness: 0.02, envMapIntensity: 0.15 });
  VM.armR = { fore: limbMesh(0.043, 0.036, sleeve), upper: limbMesh(0.052, 0.046, sleeve) };
  VM.armL = { fore: limbMesh(0.043, 0.036, sleeve), upper: limbMesh(0.052, 0.046, sleeve) };
  VM.handR = buildHand(glove, false); VM.handL = buildHand(glove, true);
  for (const o of [VM.armR.fore, VM.armR.upper, VM.armL.fore, VM.armL.upper]) VM.pose.add(o);
  VM.pose.add(VM.handR); VM.pose.add(VM.handL);
  // muzzle flash sprite (viewmodel)
  VM.flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: ASSETS.fx.muzzle, color: 0xffe2b8, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0, toneMapped: false }));
  VM.flash.scale.set(0.22, 0.22, 1); VM.pose.add(VM.flash);
  VM.camoTheme = theme;
  FPARMS.build(theme);
  const w = INVENTORY.curW(); if (w) attachGun(w);
}

function attachGun(w) {
  if (VM.gun && VM.gun.parent) VM.gun.parent.remove(VM.gun);
  VM.gun = w.model;
  VM.pose.add(VM.gun);
  VM.gun.position.set(0, 0, 0); VM.gun.rotation.set(0, 0, 0);
}

// ---------- weapon instances & inventory ----------
function createWeaponInstance(name) {
  const def = WEAPON_DEFS[name];
  if (!def) return null;
  if (def.hq) return createHQWeapon(name, def);
  const model = buildGun(name, false);
  return {
    name, def, model, mag: def.mag,
    reserve: Math.round(def.mag * (def.cls === 'sniper' ? 4 : 4) * diffSettings().ammoReserveScale),
    lastShot: -9, reloading: false, reloadT: 0, reloadDur: 0, reloadKind: '', reloadEvents: [], cycleT: 0, spin: 0
  };
}

// Catalogue weapon (ARSENAL): the holder gets the full-quality model, the hands follow its own IK tags.
function createHQWeapon(name, def) {
  const holder = new THREE.Group();
  holder.userData = { len: def.len, muzzle: new THREE.Vector3(0, 0.05, -def.len * 0.75), fore: new THREE.Vector3(0, -0.03, -def.len * 0.4), magPos: new THREE.Vector3(0, -0.07, -0.08), sightY: 0.08, gripT: 0.3, ads: { drop: 0, x: 0, z: -0.14 }, hqHolder: true };
  const w = {
    name, def, model: holder, mag: def.mag, hq: null, loading: true, burst: 0,
    reserve: Math.round(def.mag * (def.cls === 'launcher' ? 3 : 4) * diffSettings().ammoReserveScale),
    lastShot: -9, reloading: false, reloadT: 0, reloadDur: 0, reloadKind: '', reloadEvents: [], cycleT: 0, spin: 0
  };
  w.ready = ARSENAL.instance(def.hq).then(root => {
    holder.add(root);
    root.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; o.frustumCulled = false; } });
    HQVM.setup(w, root);
    const info = root.userData.hqInfo, ud = holder.userData;
    ud.muzzle = info.muzzle.clone(); ud.len = info.len;
    ud.fore = (info.handL || ud.fore).clone(); ud.magPos = (info.mag || ud.magPos).clone();
    ud.sightY = info.sightY; ud.brass = info.brass ? info.brass.clone() : null;
    ud.barrels = root.userData.rig.barrels || null;
    // iron sights: the eye behind the rear sight (pistols at arm's length), on the line through the front post, so
    // the post tip sits exactly on the screen centre
    const sz = info.sight ? info.sight.z : -0.02;
    ud.ads = { drop: 0, x: info.iron ? info.iron.x : 0, z: -({ pistol: 0.33, launcher: 0.14, shotgun: 0.15, lmg: 0.12, melee: 0.3 }[def.cls] || 0.09) - sz };
    // attachments: this instance gets its own copy of the definition (optic zoom, laser, suppressor, grips, magazine)
    const M = root.userData.mounted || {}, d = w.def = Object.assign({}, def, { snd: Object.assign({}, def.snd) });
    const att = (m) => (m && m.id && GS_ATT_BY_ID[m.id]) || null;
    if (M.optic) {
      // the eye on the optic axis at its eye relief: the reticle sits exactly on the screen centre
      ud.sightY = M.optic.lens.y; ud.ads = { drop: 0, x: M.optic.lens.x, z: -M.optic.eyeRelief - M.optic.lens.z };
      ud.reticle = M.optic.reticleMesh || null;
      if (M.optic.mag >= 2) { d.scope = M.optic.mag; d.adsFov = clamp(68 / M.optic.mag, 6, 34); }
      else { d.scope = 0; d.adsFov = Math.min(d.adsFov, d.cls === 'pistol' ? 58 : 50); }
    } else d.scope = 0;
    let a = att(M.muzzle);
    if (M.muzzle) ud.muzzle = M.muzzle.flash.clone();
    if (a) { const m = a.muzzle; if (m.recV) d.recV *= m.recV; if (m.recH) d.recH *= m.recH; if (m.spread) { d.hip *= m.spread; d.ads *= m.spread; } if (m.flash !== undefined) d.flashK = m.flash; }
    if (M.muzzle && M.muzzle.suppressed) { d.suppressed = true; d.flashK = 0.22; if (d.snd.sup) d.snd.s = d.snd.sup; d.snd.tail = AudioSys.has('ft_sup') ? 'ft_sup' : null; d.snd.echo = null; }
    if ((a = att(M.underbarrel))) { const u = a.under; if (u.recH) d.recH *= u.recH; if (u.recV) d.recV *= u.recV; if (u.hip) d.hip *= u.hip; if (u.adsSpeed) d.adsSpeed = (d.adsSpeed || 1) * u.adsSpeed; if (u.bipod) d.bipod = u.bipod; }
    if (M.laser) { d.laser = M.laser.color; ud.laser = M.laser.emitter.clone(); }
    if (M.flashlight) d.light = true;
    if (M.magazine) {
      d.mag = Math.max(1, Math.round(def.mag * M.magazine.cap)); d.reload = def.reload * M.magazine.reload;
      if (M.magazine.kind === 'drum') d.adsSpeed = (d.adsSpeed || 1) * 0.85;
      if (w.mag === def.mag) w.mag = d.mag;
    }
    // the optic decides whether this gun is a scoped weapon (limited supply in TDM / Endless)
    if (w.limited || (AMMO_RULES.kind(w) && !w.adopted && INVENTORY.slots.includes(w))) AMMO_RULES.apply(w);
    w.loading = false;
    if (INVENTORY.curW() === w) updateAmmoHUD();
    if (INVENTORY.curW() === w) { attachGun(w); equipAnim(w); }
  }).catch(err => {
    console.warn('weapon model failed', name, err);
    const fb = buildFallbackGun(def); holder.add(fb); Object.assign(holder.userData, fb.userData); w.loading = false;
  });
  return w;
}

const INVENTORY = {
  slots: [], activeIdx: 0, lastIdx: 0, switchT: 0, pendingIdx: -1,
  init() {
    for (const o of this.slots) if (o) { stopSpin(o); stopReloadSound(o); cancelPendingShot(o); }
    // the player's loadout (3 primaries, 2 secondaries, melee, launcher) when the catalogue is available, else the legacy armoury
    const ids = typeof ARSENAL !== 'undefined' && ARSENAL.ready && ARSENAL.weapons.length ? LOADOUT.ids() : [];
    this.slots = (ids.length ? ids.map(id => ARSENAL.defName(id)) : modeLoadout()).map(n => createWeaponInstance(n)).filter(Boolean);
    for (const w of this.slots) AMMO_RULES.apply(w);   // limited supplies of this new game (TDM / Endless)
    this.activeIdx = 0; this.lastIdx = 0; this.pendingIdx = -1;
    attachGun(this.slots[0]); equipAnim(this.slots[0]);
    updateAmmoHUD(); updateInventoryUI();
  },
  curW() { return this.slots[this.activeIdx]; },
  switchWeapon(idx) {
    if (idx < 0 || idx >= this.slots.length || !this.slots[idx] || idx === this.activeIdx) return;
    const cw = this.curW();
    if (cw) { cw.reloading = false; cw.reloadEvents = []; cw.reloadQueued = false; stopReloadSound(cw); stopSpin(cw); cw.spin = 0; cancelPendingShot(cw); cw.cycleAt = null; }
    VMS.fxQ.length = 0; VMS.flashT = 0;
    this.lastIdx = this.activeIdx;
    this.activeIdx = idx;
    const w = this.curW();
    attachGun(w); equipAnim(w);
    ads = false; adsT = 0;
    updateAmmoHUD(); updateInventoryUI();
  },
  pickupWeapon(name, mag, reserve) {
    // dropped enemy weapons become their catalogue counterpart in the player's hands
    if (typeof ARSENAL !== 'undefined' && ARSENAL.ready && GS_LEGACY_MAP[name] && ARSENAL.byId[GS_LEGACY_MAP[name]]) name = ARSENAL.defName(GS_LEGACY_MAP[name]);
    // merge ammo into an existing weapon of the same type, otherwise replace the current one
    const same = this.slots.findIndex(s => s && s.name === name);
    if (same !== -1) { this.slots[same].reserve += mag + reserve; SFX.pickupAmmo(); addKillFeed('+' + (mag + reserve) + ' ' + WEAPON_DEFS[name].label + ' AMMO', false); updateAmmoHUD(); return; }
    const cw = this.curW();
    spawnDroppedWeapon(cw.name, player.pos, cw.mag, cw.reserve);
    const nw = createWeaponInstance(name); nw.mag = mag; nw.reserve = reserve; AMMO_RULES.adopt(nw);
    this.slots[this.activeIdx] = nw;
    attachGun(nw); equipAnim(nw); SFX.pickupWep();
    updateAmmoHUD(); updateInventoryUI();
  }
};

// ---------- animation state ----------
let mouseFire = false, ads = false, locked = false;
let adsT = 0;                 // 0 hip .. 1 aimed
let recoilP = 0, recoilY = 0; // camera recoil offset (radians), recovers over time
let gunKick = 0, swayX = 0, swayY = 0;
const VMS = { kickZ: 0, kickRX: 0, kickRZ: 0, kickV: 0, equip: 1, sprint: 0, bobT: 0, land: 0, bloom: 0, breathT: 0, lookX: 0, lookY: 0, flashT: 0, fxQ: [] };
// run fn when the shot's report is heard: `delay` seconds after the frame being drawn reaches the screen (a delay under
// half a frame runs it in this frame)
function atReport(delay, fn) {
  if (!(delay * 1000 > 0.5 * (G.frameMs || 16.7))) { fn(); return; }
  const t = (G.perfNow || performance.now()) + delay * 1000;
  let i = VMS.fxQ.length; while (i > 0 && VMS.fxQ[i - 1].t > t) i--;
  VMS.fxQ.splice(i, 0, { t, fn });
}

function equipAnim(w) { VMS.equip = 0; if (w.def.snd && w.def.snd.equip) AudioSys.play(w.def.snd.equip, { vol: 0.9, reverb: 0.1 }); else SFX.equip(); w.cycleT = 0; }

// Team Deathmatch and Endless: the reserve never runs out (magazines still have to be reloaded) - except for the
// weapons AMMO_RULES limits (launchers, sniper / marksman rifles, any gun with a magnified scope)
function infiniteAmmo(w) { return typeof MODE !== 'undefined' && !!MODE.infiniteAmmo && G.playing && !(w && w.limited); }
function hasReserve(w) { return w.reserve > 0 || infiniteAmmo(w); }

// ---------- limited ammunition (Team Deathmatch and Endless) ----------
// Every new game rolls a fresh, small supply for the heavy and precision weapons: launchers get 5-10 rounds,
// sniper / marksman rifles and every weapon with a zoom scope 25-40 rounds (magazine + reserve), and the two
// throwables 5-10 each (EQUIP). A respawn or a resupply restores the supply rolled for this game, never more.
const AMMO_RULES = {
  MODES: ['tdm', 'endless'], RANGE: { launcher: [5, 10], scoped: [25, 40] }, GREN: [5, 10],
  on() { return this.MODES.includes(S.mode); },
  kind(w) {
    const d = w && w.def; if (!d || d.cls === 'melee') return null;
    if (d.cls === 'launcher') return 'launcher';
    if (d.cls === 'sniper' || d.cls === 'dmr' || d.cat === 'rifle' || d.scope >= 2) return 'scoped';
    return null;
  },
  // (re)apply to a weapon instance: rolls its supply once, clamps the magazine to the weapon's real capacity
  apply(w) {
    if (!w) return;
    const k = this.on() ? this.kind(w) : null;
    if (!k) { w.limited = false; return; }
    if (!w.allot) { const r = this.RANGE[k]; w.allot = randInt(r[0], r[1]); }
    w.limited = k;
    w.mag = Math.min(w.def.mag, w.allot); w.reserve = Math.max(0, w.allot - w.mag);
  },
  // weapon picked up mid-game: the ammo it carried is its supply
  adopt(w) { const k = this.on() ? this.kind(w) : null; if (k) { w.limited = k; w.allot = w.mag + w.reserve; } },
  restore(w, full) {
    if (!w.limited || w.mag + w.reserve >= w.allot) return;
    if (full) w.mag = Math.min(w.def.mag, w.allot);
    w.reserve = Math.max(0, w.allot - w.mag);
  },
  grenades() { return this.on() ? { lethal: randInt(this.GREN[0], this.GREN[1]), tactical: randInt(this.GREN[0], this.GREN[1]) } : null; }
};

function startReload() {
  const w = INVENTORY.curW();
  if (!w || w.reloading || w.mag >= w.def.mag || !hasReserve(w) || G.cine) return;
  // pressing R during the weapon raise queues the reload instead of ignoring the key
  if (VMS.equip < 0.9) { w.reloadQueued = true; return; }
  w.reloadQueued = false;
  const d = w.def;
  if (w.loading || d.cls === 'melee') return;
  w.reloading = true; w.reloadT = 0; ads = false; w.cycleT = 0; cancelPendingShot(w);
  const empty = w.mag === 0;
  if (w.hq) HQVM.onReloadStart(w);
  if (w.hq && !usesShells(d)) {
    // the reload sound is the timeline: its event times place the magazine and bolt keys, and the recording is
    // started in the same frame as the animation
    const plan = HQVM.reloadPlan(w, empty);
    w.reloadPlan = plan; w.reloadKind = 'mag'; w.reloadDur = plan.dur; w.reloadEvents = plan.events.map(e => ({ t: e.t, fn: e.fn, syn: !!e.syn }));
    const at0 = actionAudioStart(w);
    w.reloadAudioAt = at0 == null ? null : at0;
    w.reloadVid = plan.snd ? AudioSys.play(plan.snd, { vol: 1, rate: plan.rate, reverb: AudioSys.indoor ? 0.3 : 0.12, at: at0, noSlow: true }) : 0;
    w.reloadEmpty = empty;
    AudioSys._flush();
    return;
  }
  if (usesShells(d)) {
    // shell by shell: one cycle per missing shell, then pump
    const need = infiniteAmmo(w) ? d.mag - w.mag : Math.min(d.mag - w.mag, w.reserve);
    w.reloadKind = 'shells'; w.shellTime = d.reload; w.shellsToLoad = need;
    // the closing pump (or bolt release) runs the full pump sound after the last shell; its animation is keyed
    // from the same events as the sound (HQVM.PUMP_KEYS), so the fore-end and the clacks move together
    const tEnd = 0.35 + need * d.reload, closing = empty || d.pump;
    w.pumpAt = closing ? tEnd + 0.1 : -1;
    w.reloadDur = closing ? w.pumpAt + 0.62 : tEnd + 0.15;
    w.reloadEvents = [];
    // the shell is pushed home at 0.62 of each cycle (the hand path in HQVM uses the same key)
    for (let i = 0; i < need; i++) w.reloadEvents.push({ t: 0.35 + i * d.reload + d.reload * 0.62, fn: 'shell' });
    if (closing) w.reloadEvents.push({ t: w.pumpAt, fn: 'pump' });
    // every shell click (and the pump) is placed on the audio clock now, sample-accurate with the hand that pushes
    // it home; a reload cut short by firing cancels the clicks still to come
    if (w.hq) {
      const at0 = actionAudioStart(w); w.reloadVids = [];
      w.reloadAudioAt = at0 == null ? null : at0;
      for (const ev of w.reloadEvents) {
        const shellName = 'sr_shell_' + (1 + ((w.reloadVids.length) % 2));
        const name = ev.fn === 'shell' ? (AudioSys.has(shellName) ? shellName : 'x_shell_in') : (d.pump ? 'x_pump' : 'x_bolt_close');
        if (!AudioSys.has(name)) continue;
        const soundAt = ev.t - (name.startsWith('sr_shell_') ? 0.055 : 0);
        const vid = AudioSys.play(name, { vol: 1, rate: ev.fn === 'shell' ? (d.cls === 'launcher' ? 0.72 : 1) * rand(0.96, 1.05) : 1, reverb: 0.13, at: at0 + soundAt, noSlow: true });
        if (vid) { ev.pre = true; w.reloadVids.push({ vid, t: soundAt }); }
      }
      AudioSys._flush();
    }
  } else {
    w.reloadKind = 'mag';
    w.reloadDur = d.reload * (empty ? 1.12 : 1);
    w.reloadEvents = [{ t: w.reloadDur * 0.2, fn: 'magOut' }, { t: w.reloadDur * 0.62, fn: 'magIn' }, { t: w.reloadDur * 0.66, fn: 'fill' }];
    if (empty || d.bolt) w.reloadEvents.push({ t: w.reloadDur * 0.84, fn: 'bolt' });
  }
  w.reloadEmpty = empty;
}

function stopSpin(w) { if (w && w.spinVid) { AudioSys.post({ t: 'stop', vid: w.spinVid, time: 0.18 }); w.spinVid = 0; } }
function stopReloadSound(w) {
  if (!w) return;
  w.reloadAudioAt = null;
  if (w.reloadVid) { AudioSys.post({ t: 'stop', vid: w.reloadVid, time: 0.06 }); w.reloadVid = 0; }
  // A switch or interrupted reload also fades any shell/pump voice that already started.
  if (w.reloadVids) { for (const r of w.reloadVids) AudioSys.post({ t: 'stop', vid: r.vid, time: r.t > w.reloadT ? 0 : 0.035 }); w.reloadVids = null; }
  if (w.hq && typeof HQVM !== 'undefined') HQVM.cancelReload(w);
  w.pumpAt = -1;
}
// audio-clock time at which an action that starts now (a reload, a bolt or pump cycle) is heard, and the matching
// head start: the action's own clock (reloadT / cycleT) begins after the same lead, so every key of the animation is
// on screen exactly when its sound is heard (the audio output cannot start sooner than its latency allows)
function actionAudioStart(w) {
  if (!AC) { w.actLead = 0; return undefined; }
  const ideal = AudioSys.ctxAt((G.perfNow || performance.now()) + 18), at = Math.max(ideal, AudioSys.ctxEarliest());
  w.actLead = Math.min(0.12, at - ideal);
  if (w.reloading) w.reloadT = -w.actLead;
  return at;
}
function reloadEvent(w, ev, syn, pre) {
  // catalogue weapons carry the real reload recording (playing since the reload started): no synthetic clicks,
  // except events the recording does not contain (syn)
  const rec = !!(w.hq && w.reloadVid) && !syn;
  switch (ev) {
    case 'magOut': if (!rec) SFX.magOut(); break;
    case 'magIn': if (!rec) SFX.magIn(); break;
    case 'fill': { const need = w.def.mag - w.mag, inf = infiniteAmmo(w), take = inf ? need : Math.min(need, w.reserve); w.mag += take; if (!inf) w.reserve -= take; updateAmmoHUD(); updateInventoryUI(); if (w.hq) HQVM.onReloaded(w); break; }
    case 'bolt': if (!rec) SFX.bolt(); break;
    case 'shell':
      if (hasReserve(w) && w.mag < w.def.mag) {
        w.mag++; if (!infiniteAmmo(w)) w.reserve--;
        if (!pre && !(w.hq && AudioSys.play('x_shell_in', { vol: 1, rate: (w.def.cls === 'launcher' ? 0.72 : 1) * rand(0.96, 1.05), reverb: 0.12 }))) SFX.roundIn();
        updateAmmoHUD();
      }
      break;
    case 'pump': if (!pre && !(w.hq && AudioSys.play(w.def.pump ? 'x_pump' : 'x_bolt_close', { vol: 1, reverb: 0.14 }))) SFX.bolt(1.15); break;
  }
}

// keyframe helper
function kf(t, keys) { // keys: [[t, value], ...] value can be number
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) { const a = keys[i - 1], b = keys[i]; const u = (t - a[0]) / (b[0] - a[0]); const s = u * u * (3 - 2 * u); return a[1] + (b[1] - a[1]) * s; }
  }
  return keys[keys.length - 1][1];
}

const _vV = new THREE.Vector3(), _vV2 = new THREE.Vector3(), _vV3 = new THREE.Vector3(), _vPo = { px: 0, py: 0, pz: 0, rx: 0, ry: 0, rz: 0 };
function updateWeapons(dt) {
  const w = INVENTORY.curW();
  if (!w || !VM.root) return;
  const d = w.def, ud = w.model.userData, cv = CLASS_VM[d.cls];

  // reload timeline
  if (w.reloading) {
    // Use the same audio clock that schedules the recording. A slow render frame
    // can skip an animation pose, but cannot make the magazine trail its sound.
    // (the audio HEARD when this frame reaches the screen, not the mixer's render clock that runs ahead of it by the
    // output latency: every key of the animation is on screen exactly when its sound is heard)
    if (w.reloadAudioAt != null && AC && AC.state === 'running') w.reloadT = AudioSys.heardAt((G.perfNow || performance.now()) + 18) - w.reloadAudioAt;
    else w.reloadT += dt;
    while (w.reloadEvents.length && w.reloadT >= w.reloadEvents[0].t) { const ev = w.reloadEvents.shift(); reloadEvent(w, ev.fn, ev.syn, ev.pre); }
    if (w.reloadT >= w.reloadDur) { w.reloading = false; w.reloadEvents = []; w.reloadVid = 0; w.reloadVids = null; w.reloadAudioAt = null; }
  }
  if (w.cycleT > 0) {
    if (w.cycleAt != null && AC && AC.state === 'running') { w.cycleT = w.cycleDur - (AudioSys.heardAt((G.perfNow || performance.now()) + 18) - w.cycleAt); if (w.cycleT <= 0) w.cycleAt = null; }
    else w.cycleT -= dt;
    // manual actions throw the spent case when the bolt / fore-end reaches the rear
    if (w.ejectAt > 0 && w.cycleDur - w.cycleT >= w.ejectAt) { w.ejectAt = 0; ejectVMShell(w); SFX.shell(); }   // (cycleDur - cycleT counts from -lead)
  }
  // shot visuals waiting for their report to be heard (muzzle flash, light, kick, recoil, tracer, slide)
  if (VMS.fxQ.length) {
    const now = (G.perfNow || performance.now()) + 0.5 * (G.frameMs || 16.7);
    while (VMS.fxQ.length && VMS.fxQ[0].t <= now) VMS.fxQ.shift().fn();
  }
  if (w.reloadQueued && !w.reloading && VMS.equip >= 0.9) { w.reloadQueued = false; startReload(); }

  // minigun spin
  if (d.spinUp) {
    const want = mouseFire && !w.reloading ? 1 : 0;
    w.spin = clamp(w.spin + (want ? dt / d.spinUp : -dt / 0.8), 0, 1);
    if (ud.barrels) ud.barrels.rotation.z += w.spin * dt * 40;
    // the motor: one looping voice whose speed and level follow the barrels
    if (w.spin > 0.02) {
      if (!w.spinVid && AudioSys.has('x_spin')) w.spinVid = AudioSys.play('x_spin', { loop: true, vol: 1, rate: 0.5, reverb: 0.12, fade: 0.12 });
      if (w.spinVid) { AudioSys.post({ t: 'rate', vid: w.spinVid, value: 0.42 + w.spin * 0.8 }); AudioSys.post({ t: 'gain', vid: w.spinVid, value: 0.25 + w.spin * 0.75, time: 0.06 }); }
    } else stopSpin(w);
  }
  if (mouseFire && d.auto) { for (let k = 0; k < 4; k++) if (!tryFire() || G.time - w.lastShot < 60 / d.rpm) break; }
  // a queued round that the gun did not fire (trigger released, reloading, blocked) never sounds
  if (w.pend && (!mouseFire || G.time >= w.lastShot + 60 / d.rpm)) cancelPendingShot(w);
  if (w.burst && (!mouseFire || w.mag === 0) && G.time - w.lastShot > 0.05) {
    // the burst's report rolls away: the tail starts on the last round's own audio time (its fade-in keeps the
    // transient single); if that moment has passed, the mixer skips the part already gone so it stays aligned
    if (d.snd && d.snd.tail && d.auto) AudioSys.play(d.snd.tail, { vol: (d.snd.vol || 0.9) * clamp(0.35 + w.burst * 0.18, 0.4, 0.9), rate: d.snd.rate || 1, reverb: AudioSys.indoor ? 0.5 : 0.25, at: w.shotAt, skipLate: true, offset: w.shotAt ? 0 : Math.max(0, G.time - w.lastShot) });
    w.burst = 0;
  }

  // ADS blend
  const crawling = player.prone && player.speed2d > 0.4;
  // scoped rifles stay in the scope while the bolt is worked between shots (only a reload or letting go of aim
  // drops the zoom); other manual actions (pump guns) still lower the sights for the cycle
  const holdScope = isScoped(w) && !w.reloading;
  const canAds = ads && !w.reloading && !d.noADS && player.sprintT < 0.2 && VMS.equip > 0.6 && (w.cycleT <= 0.05 || holdScope) && !(MELEE_P.t > 0) && !crawling;
  const adsSpeed = (d.cls === 'sniper' ? 4.5 : d.cls === 'pistol' ? 9 : d.cls === 'lmg' ? 5.5 : 7) * (d.adsSpeed || 1);
  const prevAds = adsT;
  adsT = clamp(adsT + (canAds ? dt * adsSpeed : -dt * adsSpeed * 1.3), 0, 1);
  if (prevAds < 0.5 && adsT >= 0.5) { if (d.scope) SFX.scopeIn(); else SFX.zoom(); }
  VMS.equip = w.loading ? 0 : Math.min(1, VMS.equip + dt / 0.38);
  VMS.sprint = damp(VMS.sprint, player.sprintT > 0.2 && !w.reloading ? 1 : 0, 10, dt);
  VMS.crawl = damp(VMS.crawl || 0, crawling && !w.reloading ? 1 : 0, 8, dt);
  VMS.bloom = Math.max(0, VMS.bloom - dt * (d.cls === 'sniper' ? 0.3 : 0.12));

  // springs
  VMS.kickZ = damp(VMS.kickZ, 0, 16, dt); VMS.kickRX = damp(VMS.kickRX, 0, 13, dt); VMS.kickRZ = damp(VMS.kickRZ, 0, 10, dt);
  VMS.land = damp(VMS.land, 0, 8, dt);
  VMS.lookX = damp(VMS.lookX, swayX, 9, dt); VMS.lookY = damp(VMS.lookY, swayY, 9, dt);

  // catalogue weapons: real-size models held at the shoulder (stock beside the face, not in front of it)
  const hip = d.hipPos || (w.hq ? (HQ_HIP[d.cls] || HQ_HIP.rifle) : cv.hip);
  const aimP = smoothstep(0, 1, adsT);
  // base position: hip -> ads (sight line on screen centre)
  const fa = ud.ads || {}, aimY = ud.sightY - (fa.drop || 0);
  let px = lerp(hip[0], -(fa.x || 0), aimP), py = lerp(-ud.sightY - hip[1], -aimY, aimP), pz = lerp(hip[2], fa.z ?? d.adsZ ?? cv.adsZ, aimP);
  let rx = 0, ry = lerp(0.035, 0, aimP), rz = 0;

  // movement bob & idle breathing
  const moving = player.onGround && player.speed2d > 0.5;
  VMS.bobT += dt * (moving ? player.speed2d * 1.15 : 0);
  const bobA = moving ? (1 - aimP * 0.85) * clamp(player.speed2d / 6, 0, 1.4) : 0;
  px += Math.cos(VMS.bobT) * 0.012 * bobA; py += -Math.abs(Math.sin(VMS.bobT)) * 0.014 * bobA;
  rz += Math.cos(VMS.bobT) * 0.02 * bobA;
  VMS.breathT += dt;
  const breath = (1 - aimP * 0.7);
  py += Math.sin(VMS.breathT * 1.6) * 0.0025 * breath; rx += Math.sin(VMS.breathT * 1.6) * 0.004 * breath;

  // mouse sway (weapon lags behind the view)
  px += VMS.lookX * (1 - aimP * 0.8); py += VMS.lookY * (1 - aimP * 0.8);
  ry += VMS.lookX * 2.2 * (1 - aimP * 0.8); rx += -VMS.lookY * 1.6 * (1 - aimP * 0.8);
  rz += -VMS.lookX * 1.5;

  // sprint pose
  const sp = VMS.sprint * (1 - aimP);
  px += -0.05 * sp; py += -0.05 * sp; pz += 0.04 * sp; ry += 0.75 * sp; rx += -0.28 * sp; rz += 0.22 * sp;
  if (sp > 0.1) { px += Math.sin(VMS.bobT) * 0.025 * sp; py += Math.abs(Math.cos(VMS.bobT)) * 0.02 * sp; }
  // crawling: rifle rolled onto its side and carried low, rocking with the elbows
  const cw = VMS.crawl;
  if (cw > 0.01) { px += 0.03 * cw + Math.sin(VMS.bobT * 2.2) * 0.02 * cw; py += -0.07 * cw - Math.abs(Math.cos(VMS.bobT * 2.2)) * 0.015 * cw; ry += 0.45 * cw; rx += -0.12 * cw; rz += 0.55 * cw; }
  // crouch / prone / slide tilt
  rz += (player.prone ? 0.04 : player.crouch ? 0.06 : 0) * (1 - aimP) + (player.sliding ? 0.35 : 0);
  // rifle-butt strike / kick
  if (MELEE_P.t > 0) { const m = meleeViewPose(); px += m[0]; py += m[1]; pz += m[2]; rx += m[3]; ry += m[4]; rz += m[5]; }
  // landing dip
  py -= VMS.land;
  // grenade throw: the gun drops and turns away while the arm swings
  const thr = EQUIP.pose();
  if (thr) { py -= 0.16 * thr; rx -= 0.5 * thr; rz += 0.4 * thr; px += 0.04 * thr; }

  // equip: rise from below
  const eq = 1 - smoothstep(0, 1, VMS.equip);
  py -= eq * 0.28; rx -= eq * 0.9; rz += eq * 0.3;

  // recoil kick
  pz += VMS.kickZ; rx += VMS.kickRX; rz += VMS.kickRZ; py += VMS.kickRX * 0.06;

  // bolt cycling (bolt-action snipers / pump)
  let handLOff = _vV.set(0, 0, 0);
  if (w.cycleT > 0) {
    const u = clamp(1 - w.cycleT / w.cycleDur, 0, 1);   // negative during the audio lead: the action has not started yet
    const k = Math.sin(u * Math.PI);
    if (d.pump) { handLOff.z += k * 0.09; rx += k * 0.04; }
    else if (!w.hq) { rz += k * 0.35; rx += k * 0.12; px += k * 0.02; py -= k * 0.02; }
    else { rx += k * 0.05; px += k * 0.012; }   // the right hand works the bolt (HQVM), the rifle only dips
  }

  // reload choreography (old armoury guns; catalogue weapons are animated by HQVM below)
  let magOffset = null;
  if (w.reloading && !w.hq) {
    const u = w.reloadT / w.reloadDur;
    if (w.reloadKind === 'mag') {
      const tilt = kf(u, [[0, 0], [0.12, 1], [0.86, 1], [1, 0]]);
      rz += tilt * (d.cls === 'pistol' ? 0.5 : 0.62); rx += tilt * 0.18; px += tilt * -0.03; py += tilt * -0.02; pz += tilt * 0.04;
      // left hand: down to mag, away, back with new mag, insert, (charge)
      const hy = kf(u, [[0, 0], [0.14, -0.02], [0.22, -0.06], [0.36, -0.32], [0.48, -0.32], [0.58, -0.07], [0.64, -0.03], [0.72, 0], [1, 0]]);
      const hz = kf(u, [[0, 0], [0.14, 0.08], [0.6, 0.08], [0.72, 0], [1, 0]]);
      const mov = ud.magPos.clone().sub(ud.fore);
      handLOff.set(mov.x * kf(u, [[0, 0], [0.14, 1], [0.66, 1], [0.74, 0]]), hy + mov.y * kf(u, [[0, 0], [0.14, 1], [0.66, 1], [0.74, 0]]), hz + mov.z * kf(u, [[0, 0], [0.14, 1], [0.66, 1], [0.74, 0]]));
      // mag bump when inserting
      if (u > 0.6 && u < 0.68) { py += 0.012; rx -= 0.04; }
      // charging handle / slide
      if (w.reloadEmpty || d.bolt) { const c = kf(u, [[0.74, 0], [0.8, 1], [0.86, 1], [0.92, 0]]); handLOff.y += c * 0.09; handLOff.z += c * 0.12; rz -= c * 0.1; }
      if (u > 0.22 && u < 0.62) magOffset = new THREE.Vector3(handLOff.x, handLOff.y - 0.05, handLOff.z);
    } else {
      // shotgun: rotate to loading port, left hand feeds shells
      const tilt = kf(u, [[0, 0], [0.06, 1], [0.92, 1], [1, 0]]);
      rz -= tilt * 0.35; rx += tilt * 0.22; py += tilt * 0.02; px -= tilt * 0.02;
      const tt = w.reloadT - 0.35;
      if (tt > 0 && tt < w.shellsToLoad * w.shellTime) {
        const su = (tt % w.shellTime) / w.shellTime;
        handLOff.set(-0.02 * Math.sin(su * Math.PI), kf(su, [[0, 0], [0.3, -0.14], [0.55, -0.03], [0.75, 0.02], [1, 0]]), kf(su, [[0, 0], [0.55, 0.12], [0.75, 0.16], [1, 0]]));
        magOffset = new THREE.Vector3(handLOff.x, handLOff.y + 0.01, handLOff.z - 0.02);
      }
      if (w.reloadEvents.length && w.reloadEvents[0].fn === 'pump' && w.reloadT > w.reloadEvents[0].t - 0.25) handLOff.z += Math.sin((w.reloadT - (w.reloadEvents[0].t - 0.25)) / 0.3 * Math.PI) * 0.09;
    }
  }

  // catalogue weapons: reload pose, magazine / bolt / slide joints, rounds in the magazine
  if (w.hq) {
    const po = _vPo; po.px = px; po.py = py; po.pz = pz; po.rx = rx; po.ry = ry; po.rz = rz;
    HQVM.update(w, dt, po);
    px = po.px; py = po.py; pz = po.pz; rx = po.rx; ry = po.ry; rz = po.rz;
  }

  // apply pose
  const P = VM.pose;
  P.position.set(px, py, pz);
  P.rotation.set(rx, ry, rz, 'YXZ');

  // catalogue weapons are held by the soldier's own arms (IK onto the weapon's hand tags)
  const hqArms = !!w.hq && FPARMS.ready;
  for (const o of [VM.armR.fore, VM.armR.upper, VM.handR]) o.visible = !hqArms;
  for (const o of [VM.armL.fore, VM.armL.upper, VM.handL]) o.visible = !hqArms && (d.cls !== 'pistol' || w.reloading);
  FPARMS.setVisible(hqArms);
  if (hqArms) { VM.root.updateMatrixWorld(true); HQVM.arms(w); }

  // arms & hands (in pose space)
  const grip = _vV2.set(0, 0, 0);
  const fore = _vV3.copy(ud.fore).add(handLOff);
  VM.handR.position.copy(grip).add(new THREE.Vector3(0.012, -0.03, 0.01)); VM.handR.rotation.set(-0.25, 0.1, 0.1);
  VM.handL.position.copy(fore).add(new THREE.Vector3(-0.012, -0.02, 0)); VM.handL.rotation.set(d.cls === 'pistol' ? -0.2 : 0.35, -0.2, d.cls === 'pistol' ? -0.3 : -0.55);
  const elbowR = new THREE.Vector3(0.11, -0.16, 0.3), shoulderR = new THREE.Vector3(0.26, -0.35, 0.65);
  const elbowL = new THREE.Vector3(-0.17 + fore.x * 0.4, -0.2 + fore.y * 0.6, fore.z + 0.3), shoulderL = new THREE.Vector3(-0.3, -0.4, 0.62);
  placeLimb(VM.armR.fore, elbowR, VM.handR.position.clone().add(new THREE.Vector3(0, 0, 0.05)));
  placeLimb(VM.armR.upper, shoulderR, elbowR);
  placeLimb(VM.armL.fore, elbowL, VM.handL.position.clone().add(new THREE.Vector3(0, -0.01, 0.05)));
  placeLimb(VM.armL.upper, shoulderL, elbowL);

  // carried magazine / shell in the left hand during reload (old guns; catalogue guns move their own magazine)
  if (!VM.shellM) { VM.shellM = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.065, 10), MATLIB.plain(0xb02020, { rough: 0.5 })); VM.shellM.rotation.x = Math.PI / 2; VM.shellM.frustumCulled = false; VM.pose.add(VM.shellM); VM.shellM.visible = false; }
  if (w.hq) {
    if (VM.mag) VM.mag.visible = false;
    const sp = w.reloading && w.reloadKind === 'shells' ? w.hq.shell : null;
    VM.shellM.visible = !!sp;
    if (sp) { VM.shellM.position.copy(sp); const big = d.cls === 'launcher'; VM.shellM.scale.set(big ? 1.9 : 1, big ? 1.5 : 1, big ? 1.9 : 1); VM.shellM.material.color.setHex(big ? 0x8a8448 : 0xb02020); }
  } else if (magOffset) {
    if (!VM.mag) { VM.mag = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.12, 0.06), gunMaterial('polymer')); VM.pose.add(VM.mag); }
    const isShell = w.reloadKind === 'shells';
    VM.mag.visible = !isShell; VM.shellM.visible = isShell; VM.shellM.scale.set(1, 1, 1);
    (isShell ? VM.shellM : VM.mag).position.copy(ud.fore).add(magOffset);
    if (!isShell && d.cls === 'pistol') VM.mag.scale.set(0.8, 0.8, 0.7); else VM.mag.scale.set(1, 1, 1);
  } else { if (VM.mag) VM.mag.visible = false; VM.shellM.visible = false; }

  // optic reticle: only while aiming through the optic. It lies on the optic axis, which the aimed pose puts on the
  // camera axis, so the dot is on the screen centre and on the point of impact
  if (ud.reticle) ud.reticle.material.opacity = w.reloading ? 0 : smoothstep(0.6, 0.97, adsT);
  // muzzle flash
  VMS.flashT -= dt;
  VM.flash.material.opacity = VMS.flashT > 0 ? Math.min(1, (d.flashK === undefined ? 1 : d.flashK) * 1.4) : 0;
  vmFlash.intensity = VMS.flashT > 0 ? 3 * (d.flashK === undefined ? 1 : d.flashK) : 0;
  VM.flash.position.copy(ud.muzzle).add(new THREE.Vector3(0, 0, -0.06));

  // scope overlay: hide the model when fully scoped. Guns with a mounted optic use the scope view too (zoomed,
  // with their own reticle) instead of a close-up of the 3D optic.
  const optic = hasOptic(w);
  const scoped = (d.scope || optic) && adsT > 0.92;
  VM.root.visible = !scoped;
  if (scoped) FPARMS.setVisible(false);   // the arms live beside the weapon in the rig: hide them with it
  const lensOn = false;
  if (lensOn) {
    VM.root.updateMatrixWorld(true);
    _vV.set(fa.x || 0, aimY, ud.lensZ).applyMatrix4(VM.gun.matrixWorld).project(vmCamera);
    const bs = renderBufferSize(_dbs), k = smoothstep(0.55, 0.95, adsT);
    VM_HOLE.c.value.set((_vV.x * 0.5 + 0.5) * bs.x, (_vV.y * 0.5 + 0.5) * bs.y);
    VM_HOLE.r.value = fa.lens * bs.y * k;
    VMS.dotX = (_vV.x * 0.5 + 0.5) * innerWidth; VMS.dotY = (0.5 - _vV.y * 0.5) * innerHeight;
  } else VM_HOLE.r.value = 0;
  updateScopeUI(w, scoped, lensOn, optic);
  LASER.update(w, dt);

  // viewmodel shells
  for (let i = VM.shells.length - 1; i >= 0; i--) {
    const s = VM.shells[i]; s.life -= dt;
    s.m.position.addScaledVector(s.v, dt); s.v.y -= 5 * dt; s.m.rotation.x += 14 * dt; s.m.rotation.z += 9 * dt;
    if (s.life <= 0) { weaponRig.remove(s.m); VM.shells.splice(i, 1); }
  }

  const hint = document.getElementById('reloadHint');
  const ht = w.reloading ? 'RELOADING' : (w.mag === 0 ? (hasReserve(w) ? 'PRESS R TO RELOAD' : 'NO AMMO') : (w.mag <= Math.ceil(d.mag * 0.25) ? 'LOW AMMO · R RELOAD' : ''));
  if (hint.textContent !== ht) hint.textContent = ht;
}

// weapon light (NOVA attachment): 0..1 strength of the light cone drawn by the grade pass; strongest in the dark,
// off under night vision (it would only wash the intensifier out)
function torchLevel() {
  const w = INVENTORY.curW();
  if (!G.playing || G.dead || G.cine || !w || !w.def.light || VMS.equip < 0.8 || (typeof NVG !== 'undefined' && NVG.on)) return 0;
  const dark = WORLD.indoor || (WORLD.env && WORLD.env.night);
  return dark ? clamp(1.25 - NVG.level * 0.9, 0.3, 1) : 0.12;
}

// current spread cone (radians)
function currentSpread(w) {
  const d = w.def;
  const aim = smoothstep(0, 1, adsT);
  let s = lerp(d.hip, d.ads, aim);
  const mv = clamp(player.speed2d / 5.5, 0, 1.6);
  s *= 1 + mv * (d.cls === 'sniper' ? 2.5 : 0.9) * (aim > 0.5 ? 0.6 : 1);
  if (!player.onGround) s *= 2.2;
  if (player.prone) s *= player.speed2d < 0.4 ? 0.5 : 2.5;
  else if (player.crouch && player.speed2d < 1) s *= 0.7;
  if (d.cls === 'sniper' && aim > 0.9 && !G.holdingBreath) s += 0.0015; // scope sway shows up as spread when not holding breath
  if (d.laser && LASER.on) s *= 0.6;                                     // the laser shows exactly where the round goes
  return s + VMS.bloom;
}

const _fDir = new THREE.Vector3(), _fRight = new THREE.Vector3(), _fUp = new THREE.Vector3(), _fOrigin = new THREE.Vector3();
function tryFire() {
  const w = INVENTORY.curW();
  if (!w || w.loading || G.cine || VMS.equip < 0.85 || MELEE_P.t > 0 || VMS.crawl > 0.5 || EQUIP.throwT > 0) return;
  const d = w.def;
  // melee weapons swing instead of firing
  if (d.cls === 'melee') { startPlayerMelee('weapon'); return; }
  if (w.reloading) {
    // shotguns can interrupt shell loading
    if (w.reloadKind === 'shells' && w.mag > 0) { w.reloading = false; w.reloadEvents = []; stopReloadSound(w); } else return;
  }
  if (w.cycleT > 0) return;
  if (d.spinUp && w.spin < 1) return;
  const iv = 60 / d.rpm;
  if (G.time - w.lastShot < iv - 1e-6) return;
  if (w.mag <= 0) { if (G.time - w.lastShot > 0.25) { if (d.snd && d.snd.dry) AudioSys.play(d.snd.dry, { vol: 0.9 }); else SFX.dry(); w.lastShot = G.time; } if (S.autoReload) startReload(); return; }
  if (player.sprintT > 0.2) { player.sprintT = 0; }

  // cadence: while the trigger stays down the shots sit on an exact grid (last shot + interval, the overshoot of the
  // frame carried over), so an automatic weapon fires at its real rate whatever the frame rate is
  const cont = d.auto && w.burst > 0 && G.time - w.lastShot < iv * 2.2;
  w.lastShot = cont ? w.lastShot + iv : G.time;
  w.mag--;
  const ud0 = w.model.userData, flashK = d.flashK === undefined ? 1 : d.flashK;
  const pellets = d.cls === 'launcher' ? 0 : (d.pellets || 1);
  G.shots += pellets;
  // vDelay: how long after this frame reaches the screen the round's report is heard. The muzzle flash, its light, the
  // kick, the recoil, the tracer and the slide / bolt movement are shown then, so picture and sound land together.
  let vDelay = 0;
  if (d.snd && d.snd.hq) {
    // one shot sample per round with its attack on the first samples, started on the audio clock at the shot's exact
    // time: the muzzle flash, the recoil kick and the report land together, and a burst keeps an even cadence
    // (shot n of a burst = first shot + n x interval, sample-accurate in the mixer). Takes rotate between the
    // weapon's recorded variations so a long burst does not sound like one sample looped.
    const at = shotAudioTime(w, cont, iv); let vid = 0;
    // the round queued by the previous one is this shot's sound when it lands on the grid, and also when it has
    // already started during a long frame (no second report); the following rounds then re-anchor on the picture
    if (w.pend && cont && at !== undefined && (Math.abs(w.pend.at - at) < 0.001 || w.pend.at < AudioSys.ctxEarliest())) { vid = w.pend.vid; w.pend = null; }
    else { cancelPendingShot(w); vid = playShot(w, at); }
    // while the trigger is held the next round is queued one interval ahead on the audio clock (never late, so the
    // cadence is exact at any frame rate); it is cancelled if the gun does not fire it (released, empty, blocked)
    if (d.auto && w.mag > 0 && mouseFire && at !== undefined && vid) { const nv = playShot(w, at + iv, 1); if (nv) w.pend = { at: at + iv, vid: nv }; }
    // precision rifles: the rolling echo starts on the same sample as the report (outdoors; walls swallow it inside)
    if (vid && d.snd.echo && !AudioSys.indoor && AudioSys.has(d.snd.echo)) AudioSys.play(d.snd.echo, { vol: d.cls === 'sniper' ? 1 : 0.8, rate: rand(0.97, 1.03), reverb: 0.25, at });
    AudioSys._flush();
    if (vid && at !== undefined && AC && AC.state === 'running') vDelay = clamp(at - AudioSys.heardAt((G.perfNow || performance.now()) + 18), 0, 0.15);
    if (!vid)
      AudioSys.gunshot(SND[{ pistol: 'pistol', smg: 'mp5', rifle: 'm4', dmr: 'dmr', sniper: 'm24', lmg: 'lmg', shotgun: 'pump', launcher: 'pump' }[d.cls] || 'm4']);
    w.burst = (w.burst || 0) + 1;
    atReport(vDelay, () => HQVM.onShot(w));
  } else AudioSys.gunshot(d.snd);
  if (w.hq ? (!!ud0.brass && !d.bolt && !d.pump) : (d.cls !== 'shotgun' && d.cls !== 'pistol' && !d.bolt)) SFX.shell();

  // alert nearby enemies
  for (const en of enemies) if (!en.dead && en.team === 'red' && Math.hypot(en.g.position.x - player.pos.x, en.g.position.z - player.pos.z) < (WORLD.indoor ? 45 : 70)) { en.lkp.copy(player.pos); if (!en.alerted || en.state === 'patrol') { en.alerted = true; en.state = 'advance'; en.stateT = 0; } }

  camera.updateMatrixWorld(true);
  camera.getWorldPosition(_fOrigin);
  const fwd = _fDir.set(0, 0, -1).applyQuaternion(camera.quaternion);
  _fRight.set(1, 0, 0).applyQuaternion(camera.quaternion); _fUp.set(0, 1, 0).applyQuaternion(camera.quaternion);
  const spread = currentSpread(w);
  const muzzleW = camera.localToWorld(new THREE.Vector3(0.1 * (1 - adsT), -0.09 * (1 - adsT) - 0.03, -0.55));

  if (d.cls === 'launcher') EQUIP.fireProjectile(w, muzzleW, fwd.clone());
  let hitCount = 0, hsCount = 0, killed = [];
  const kills = []; // { zone, dist, point } per kill, for the precision slow motion
  let cineShot = null;
  const tracers = [];
  for (let p = 0; p < pellets; p++) {
    const r = spread * Math.sqrt(Math.random()), th = Math.random() * Math.PI * 2;
    const dir = fwd.clone().addScaledVector(_fRight, Math.tan(r) * Math.cos(th)).addScaledVector(_fUp, Math.tan(r) * Math.sin(th)).normalize();
    const res = traceShot(_fOrigin, dir, 400);
    const end = res.point || _fOrigin.clone().addScaledVector(dir, 250);
    if (res.enemy) {
      const dist = res.t;
      const dmg = d.dmg * zoneMultiplier(res.zone, d) * falloff(d, dist);
      const willKill = res.enemy.hp - dmg <= 0;
      if (pellets === 1 && willKill && CINE.shouldTrigger(w, res, dist)) {
        cineShot = { enemy: res.enemy, zone: res.zone, point: res.point.clone(), dir: dir.clone(), dmg, dist, from: muzzleW.clone(), weapon: w.name };
      } else {
        const k = damageEnemy(res.enemy, dmg, res.zone, res.point, dir);
        hitCount++; if (res.zone === 'head') hsCount++;
        if (k) { killed.push(res.enemy); kills.push({ zone: res.zone, dist, point: res.point.clone(), enemy: res.enemy }); }
      }
    } else if (res.collider) {
      const surf = res.collider.surface || 'concrete';
      spawnImpact(res.point, res.normal, surf);
      if (!res.collider.ground || Math.random() < 0.5) spawnDecal(res.point, res.normal, 'hole', d.cls === 'sniper' ? 0.18 : 0.12);
      if (p === 0 || Math.random() < 0.3) SFX.impact(surf, res.point);
      if (res.collider.explosive) damageExplosive(res.collider.explosive, d.dmg);
    }
    if (!cineShot) tracers.push(end.clone());
  }

  // muzzle, light, shells, kick and recoil: on the report (recoil is applied after the shot either way, so the round
  // itself still goes to the crosshair)
  const aimK = adsT > 0.5 ? 0.62 : 1, adsK = adsT > 0.5, crouchK = (player.prone ? 0.6 : player.crouch ? 0.82 : 1) * (d.bipod && (player.prone || player.crouch) ? d.bipod : 1);
  const sh = { tr: tracers, m: muzzleW.clone(), recP: d.recV * aimK * crouchK * rand(0.85, 1.15), recY: rand(-1, 1) * d.recH * aimK + d.recH * 0.25 * Math.sin(G.time * 3.1) };
  atReport(vDelay, () => {
    for (const e of sh.tr) spawnTracer(sh.m, e, 0xffd9a0, d.cls === 'sniper' ? 0.035 : 0.022);
    VMS.flashT = 0.05;
    VM.flash.material.rotation = Math.random() * 6.28;
    VM.flash.scale.setScalar((d.cls === 'shotgun' || d.cls === 'sniper' || d.cls === 'launcher' ? 0.36 : d.cls === 'pistol' ? 0.2 : 0.26) * rand(0.85, 1.15) * (0.5 + flashK * 0.5));
    lightPulse(sh.m, 0xffb060, 2.6 * flashK, 14, 0.05);
    if (INVENTORY.curW() === w) {
      if (w.hq) { if (ud0.brass && !d.bolt && !d.pump) ejectVMShell(w); }
      else if (!d.bolt && !d.pump && d.cls !== 'shotgun') ejectVMShell(w);
    }
    recoilP += sh.recP; recoilY += sh.recY;
    VMS.kickZ += (d.cls === 'sniper' || d.cls === 'shotgun' ? 0.09 : d.cls === 'pistol' ? 0.045 : 0.035) * (adsK ? 0.6 : 1);
    VMS.kickRX += d.recV * (d.cls === 'pistol' ? 3.5 : 2.2) * (adsK ? 0.5 : 1);
    VMS.kickRZ += rand(-1, 1) * d.recH * 2;
    G.camShake = Math.max(G.camShake, d.recV * (d.cls === 'sniper' ? 0.25 : 0.12));
  });
  VMS.bloom = Math.min(d.maxBloom || 0.05, VMS.bloom + (d.bloom || 0));
  if (d.bolt || d.pump) {
    w.cycleDur = d.bolt ? 0.95 : 0.55; w.cycleT = w.cycleDur;
    // the action sound runs on the same clock as the hand animation (bolt lift / draw / close, pump back / forward):
    // it starts on the shot's own audio time and the animation waits the same lead
    if (w.hq && d.snd.cycle && AudioSys.has(d.snd.cycle)) {
      // the hands follow the action sound on the heard clock (it starts on the shot's own audio time)
      const lead = w.shotAt !== undefined ? clamp(vDelay, 0, 0.15) : 0;
      AudioSys.play(d.snd.cycle, { vol: 1, reverb: AudioSys.indoor ? 0.25 : 0.1, at: w.shotAt, noSlow: true });
      w.cycleAt = w.shotAt !== undefined && AC && AC.state === 'running' ? w.shotAt : null;
      w.cycleT = w.cycleDur + lead; w.ejectAt = w.cycleDur * (d.bolt ? 0.44 : 0.5) + (w.cycleAt != null ? 0 : lead);
    }
    else setTimeout(() => { if (INVENTORY.curW() === w) SFX.bolt(d.pump ? 1.15 : 1); }, d.bolt ? 280 : 160);
  }

  updateAmmoHUD(); updateInventoryUI();
  if (cineShot) CINE.start(cineShot);
  else if (kills.length) {
    const best = kills.find(k => k.zone === 'head') || kills[0];
    if (!CINE.maybeKillCam(w, best, muzzleW)) SLOWMO.evaluate(w, kills, muzzleW);
  }
  if (w.mag === 0 && S.autoReload && hasReserve(w)) setTimeout(() => { if (INVENTORY.curW() === w && !w.reloading) startReload(); }, 250);
  if (G.shotLog) G.shotLog.push({ t: w.lastShot, gt: G.time, perf: G.perfNow, at: w.shotAt, frame: G.frameNo, vis: vDelay });
  return true;
}

// audio-clock time (context seconds) of the round fired now. `ideal` is the moment the frame that shows its muzzle
// flash reaches the screen; a burst keeps one fixed lead over it (as small as the audio output allows, at least a
// frame so a queued round can still be cancelled), and every further round sits exactly one interval after the
// previous one. Only if the game drifts off the grid (a long stall) is the burst re-anchored.
function shotAudioTime(w, cont, iv) {
  if (!AC) return undefined;
  const ideal = AudioSys.ctxAt((G.perfNow || performance.now()) - (G.time - w.lastShot) * 1000 + 18);
  if (cont && w.shotAt && Math.abs(w.shotAt + iv - (ideal + w.shotLead)) < 0.03) return (w.shotAt += iv);
  w.shotLead = Math.max(AudioSys.ctxEarliest() - ideal, Math.min(0.034, G.dtAvg || 1 / 60) + 0.006);
  return (w.shotAt = ideal + w.shotLead);
}
function playShot(w, at, ahead) {
  const d = w.def, snd = shotVoice(w), n = (w.burst || 0) + (ahead || 0);
  return snd ? AudioSys.play(snd, { vol: d.snd.vol || 0.9, rate: (d.snd.rate || 1) * (1 + ((n * 0.618) % 1 - 0.5) * 0.024), reverb: AudioSys.indoor ? 0.4 : 0.18, at, dbg: !!AudioSys.startLog }) : 0;
}
function cancelPendingShot(w) { if (w && w.pend) { AudioSys.post({ t: 'stop', vid: w.pend.vid, time: 0 }); w.pend = null; AudioSys._flush(); } }
// the weapon's voice for this round: rotates through the recorded takes (f_x, f_x_b, f_x_c)
function shotVoice(w) {
  const base = w.def.snd.s; if (!base) return null;
  if (!w._takes || w._takesOf !== base) { w._takesOf = base; w._takes = [base, base + '_b', base + '_c'].filter(n => AudioSys.has(n)); w._take = 0; }
  if (w._takes.length < 2) return base;
  w._take = (w._take + 1 + (Math.random() < 0.3 ? 1 : 0)) % w._takes.length;
  return w._takes[w._take];
}

function ejectVMShell(w) {
  const b = w.model.userData.brass;
  if (w.hq && !b) return;
  const m = new THREE.Mesh(shellGeo, shellMat);
  if (w.def.cls === 'shotgun') { if (!VM.hullMat) VM.hullMat = MATLIB.plain(0xb02020, { rough: 0.5 }); m.material = VM.hullMat; m.scale.set(1.7, 1.5, 1.7); }
  else if (w.def.cls === 'sniper' || w.def.cls === 'lmg' || w.def.cls === 'dmr') m.scale.set(1.25, 1.5, 1.25);
  const p = VM.pose.localToWorld(b ? b.clone().add(new THREE.Vector3(0.01, 0, 0)) : new THREE.Vector3(0.025, 0.04, -0.12));
  weaponRig.worldToLocal(p); m.position.copy(p);
  weaponRig.add(m);
  VM.shells.push({ m, life: 0.6, v: new THREE.Vector3(rand(0.9, 1.4), rand(0.9, 1.3), rand(0.1, 0.3)) });
}

function zoneMultiplier(zone, d) {
  if (zone === 'head') return d.cls === 'sniper' ? 4 : (d.cls === 'shotgun' ? 1.6 : 2.4);
  if (zone === 'chest') return 1.1;
  if (zone === 'stomach') return 1.0;
  return 0.75;
}
function falloff(d, dist) {
  const r = { pistol: [18, 45, 0.6], smg: [16, 40, 0.55], rifle: [40, 100, 0.7], dmr: [70, 160, 0.8], shotgun: [7, 22, 0.15], sniper: [200, 400, 0.9], lmg: [40, 100, 0.7], minigun: [25, 70, 0.6], launcher: [40, 120, 0.8], melee: [3, 5, 1] }[d.cls] || [40, 100, 0.7];
  if (dist <= r[0]) return 1;
  return lerp(1, r[2], (dist - r[0]) / (r[1] - r[0]));
}

// trace a bullet: nearest of world colliders and enemy hit volumes
function traceShot(origin, dir, maxDist) {
  const wh = rayWorld(origin, dir, maxDist, 'shot');
  const limit = wh ? wh.t : maxDist;
  let best = null;
  for (const e of enemies) {
    if (e.dead || e.team === 'blue') continue; // no friendly fire
    const h = enemyRayTest(e, origin, dir, limit);
    if (h && (!best || h.t < best.t)) best = { t: h.t, zone: h.zone, enemy: e };
  }
  if (best) return { t: best.t, point: origin.clone().addScaledVector(dir, best.t), enemy: best.enemy, zone: best.zone };
  if (wh) return { t: wh.t, point: wh.point, normal: wh.normal, collider: wh.collider };
  return { t: maxDist };
}

const _dbs = new THREE.Vector2();
function updateScopeUI(w, scoped, lensOn, optic) {
  const so = document.getElementById('scope'), rd = document.getElementById('reddot');
  so.classList.toggle('on', !!scoped);
  so.classList.toggle('optic', !!(scoped && optic));
  // red dot only inside a real optic (iron sights are aimed with the sights themselves)
  const on = lensOn && adsT > 0.8;
  rd.classList.toggle('on', on);
  if (on) rd.style.transform = `translate(${(VMS.dotX - innerWidth / 2).toFixed(1)}px,${(VMS.dotY - innerHeight / 2).toFixed(1)}px)`;
}

// ---------- laser sights ----------
// The beam starts at the gun's laser module (projected from the viewmodel onto the world view, so it leaves the
// emitter on screen) and ends exactly where a round fired now would hit (the crosshair ray, world + soldiers).
// It is drawn with a constant on-screen width, brightest at the gun, and only at night / in dark places;
// the dot shows in daylight too, faint.
const LASER = {
  on: false, dark: false, darkT: 0, beam: null, dot: null, flare: null, pos: null, col: null,
  init() {
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(12); this.col = new Float32Array(12);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(this.col, 3)); g.setIndex([0, 1, 2, 2, 1, 3]);
    this.beam = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false, side: THREE.DoubleSide }));
    this.beam.frustumCulled = false; this.beam.renderOrder = 30; this.beam.visible = false; scene.add(this.beam);
    const dotTex = radialTex('laserDot', 'rgba(255,255,255,1)', 'rgba(255,255,255,0)');
    this.dot = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false, sizeAttenuation: false }));
    this.dot.renderOrder = 31; this.dot.visible = false; scene.add(this.dot);
    this.flare = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, toneMapped: false, fog: false, sizeAttenuation: false }));
    this.flare.renderOrder = 31; this.flare.visible = false; scene.add(this.flare);
  },
  hide() { if (this.beam) { this.beam.visible = this.dot.visible = this.flare.visible = false; } this.on = false; },
  update(w, dt) {
    if (!this.beam) this.init();
    const d = w.def, ud = w.model.userData;
    if (!d.laser || !ud.laser || G.dead || G.cine || !G.playing || VMS.equip < 0.85 || w.reloading || VMS.sprint > 0.5 || activeCamera !== camera) { this.hide(); return; }
    // darkness: night maps, dim interiors, or the goggles are on (re-checked a few times a second)
    this.darkT -= dt;
    if (this.darkT <= 0) {
      this.darkT = 0.3;
      const th = typeof nvgDarkThreshold === 'function' ? nvgDarkThreshold() : -1;
      this.dark = !!(WORLD.env && WORLD.env.night) || (typeof NVG !== 'undefined' && NVG.on) || (th > 0 && lightLevelAt(player.pos) < th * 1.6);
    }
    this.on = true;
    // impact point: the crosshair ray
    camera.updateMatrixWorld(true);
    const o = camera.getWorldPosition(_lzO), f = _lzF.set(0, 0, -1).applyQuaternion(camera.quaternion);
    const hit = traceShot(o, f, 300), P = _lzP.copy(o).addScaledVector(f, hit.point ? hit.t : 300);
    // emitter: viewmodel -> screen -> world at 0.55 m in front of the eye
    VM.root.updateMatrixWorld(true);
    _lzS.copy(ud.laser).applyMatrix4(VM.gun.matrixWorld).project(vmCamera);
    const O = _lzE.set(_lzS.x, _lzS.y, 0.5).unproject(camera).sub(o).normalize();
    O.multiplyScalar(0.55 / Math.max(0.2, O.dot(f))).add(o);
    const c = _lzC.setHex(d.laser), k = this.dark ? 1 : 0;
    // beam quad with constant on-screen width (~1.6 px at 1080p)
    const dir = _lzD.subVectors(P, O), L = dir.length(); dir.multiplyScalar(1 / Math.max(L, 1e-4));
    const side = _lzX.crossVectors(dir, _lzV.subVectors(O, o)).normalize();
    const w0 = 0.0016 * O.distanceTo(o), w1 = 0.0015 * P.distanceTo(o) + 0.004;
    const put = (i, p, s, wd) => { this.pos[i * 3] = p.x + s.x * wd; this.pos[i * 3 + 1] = p.y + s.y * wd; this.pos[i * 3 + 2] = p.z + s.z * wd; };
    put(0, O, side, w0); put(1, O, side, -w0); put(2, P, side, w1); put(3, P, side, -w1);
    const nearB = 2.6 * k, farB = 0.7 * k;
    for (let i = 0; i < 4; i++) { const b = i < 2 ? nearB : farB; this.col[i * 3] = c.r * b; this.col[i * 3 + 1] = c.g * b; this.col[i * 3 + 2] = c.b * b; }
    this.beam.geometry.attributes.position.needsUpdate = true; this.beam.geometry.attributes.color.needsUpdate = true;
    this.beam.visible = this.dark;
    // the dot sits a hair in front of the surface it hits
    this.dot.position.copy(P).addScaledVector(f, -0.03);
    this.dot.material.color.copy(c).multiplyScalar(this.dark ? 2.2 : 0.9);
    const ds = (this.dark ? 0.02 : 0.012) * (hit.enemy ? 1.2 : 1); this.dot.scale.set(ds, ds, 1);
    this.dot.visible = !!hit.point || L < 250;
    this.flare.position.copy(O); this.flare.material.color.copy(c).multiplyScalar(0.8 * k); this.flare.scale.set(0.012, 0.012, 1); this.flare.visible = this.dark;
  }
};
const _lzO = new THREE.Vector3(), _lzF = new THREE.Vector3(), _lzP = new THREE.Vector3(), _lzS = new THREE.Vector3(), _lzE = new THREE.Vector3(), _lzD = new THREE.Vector3(), _lzX = new THREE.Vector3(), _lzV = new THREE.Vector3(), _lzC = new THREE.Color();
