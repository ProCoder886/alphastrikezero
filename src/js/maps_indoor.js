// ---------- Indoor operations (converted from the original outdoor sectors) ----------
const M_ = (n, o) => MATLIB.get(n, o);

function fenceMaterial() {
  const t = canvasTex('fence', 128, 128, (x) => { x.clearRect(0, 0, 128, 128); x.strokeStyle = 'rgba(160,165,170,1)'; x.lineWidth = 4; for (let i = 0; i <= 128; i += 16) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 128); x.stroke(); x.beginPath(); x.moveTo(0, i); x.lineTo(128, i); x.stroke(); } }, { repeat: true });
  const m = new THREE.MeshStandardMaterial({ map: t, alphaTest: 0.5, metalness: 0.7, roughness: 0.4, side: THREE.DoubleSide });
  m.userData.surface = 'metal'; m.userData.tile = 1.2;
  return m;
}
const _fenceMat = { m: null };
function fence(W, x0, z0, x1, z1, h) {
  if (!_fenceMat.m) _fenceMat.m = fenceMaterial();
  const alongX = Math.abs(x1 - x0) > Math.abs(z1 - z0), L = alongX ? Math.abs(x1 - x0) : Math.abs(z1 - z0);
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  W.box(cx, 0, cz, alongX ? L : 0.05, h, alongX ? 0.05 : L, _fenceMat.m, { shot: false, surface: 'metal', noShadow: true });
  const post = M_('metal', { color: 0x666a70 });
  const n = Math.ceil(L / 3);
  for (let i = 0; i <= n; i++) { const t = i / n; W.box(alongX ? x0 + (x1 - x0) * t : cx, 0, alongX ? cz : z0 + (z1 - z0) * t, 0.08, h, 0.08, post, { collide: false }); }
}
function pipeRun(W, x0, z0, x1, z1, y, r, mat) {
  const alongX = Math.abs(x1 - x0) > Math.abs(z1 - z0), L = alongX ? Math.abs(x1 - x0) : Math.abs(z1 - z0);
  const g = new THREE.CylinderGeometry(r, r, L, 10);
  if (alongX) g.rotateZ(Math.PI / 2); else g.rotateX(Math.PI / 2);
  _wM.makeTranslation((x0 + x1) / 2, y, (z0 + z1) / 2);
  STATIC.add(g, mat, _wM, { keepUV: true }); g.dispose();
}
// Structural beams under a ceiling slab (both directions on a grid), split around an open area (o.hole).
// Gives ceilings real construction depth instead of a flat lid; they catch the lamp light and the ceiling glow.
function ceilingBeams(W, x0, z0, x1, z1, y, mat, o = {}) {
  const sp = o.spacing || 8, dp = o.depth || 0.36, bw = o.width || 0.32, hole = o.hole;
  const run = (along, c, a0, a1) => {
    const segs = [];
    if (hole && c > (along === 'x' ? hole.z0 : hole.x0) && c < (along === 'x' ? hole.z1 : hole.x1)) {
      const h0 = along === 'x' ? hole.x0 : hole.z0, h1 = along === 'x' ? hole.x1 : hole.z1;
      if (h0 > a0) segs.push([a0, h0]); if (h1 < a1) segs.push([h1, a1]);
    } else segs.push([a0, a1]);
    for (const [s0, s1] of segs) {
      const m = (s0 + s1) / 2, L = s1 - s0;
      if (along === 'x') W.box(m, y - dp, c, L, dp, bw, mat, { collide: false, noShadow: true });
      else W.box(c, y - dp, m, bw, dp, L, mat, { collide: false, noShadow: true });
    }
  };
  for (let z = (o.fromZ ?? z0 + sp); z < z1 - 0.5; z += sp) run('x', z, x0, x1);
  if (o.both !== false) for (let x = (o.fromX ?? x0 + sp); x < x1 - 0.5; x += sp) run('z', x, z0, z1);
}
// open floor for a new piece of cover: clear of walls, doorways and other props by r metres (and, outdoors, of
// the reserved roads, river banks and house plots)
function clearSpot(x, z, r, reserved) {
  for (const c of colliders) if (c.y1 > 0.15 && c.y0 < 2.4 && x > c.x0 - r && x < c.x1 + r && z > c.z0 - r && z < c.z1 + r) return false;
  if (reserved) for (const q of RESERVED) if (x > q.x0 - r && x < q.x1 + r && z > q.z0 - r && z < q.z1 + r) return false;
  return true;
}
// Realistic hard cover dotted around a map: small wooden boxes, tables knocked over with toppled chairs, leaning
// aluminium doors and low walls - every piece is solid and becomes an AI cover point (bakeCover).
function dressCover(W, n, o = {}) {
  const b = WORLD.bounds, sp = o.spawn, kinds = o.kinds || ['box', 'box', 'table', 'door', 'wall', 'wall'];
  let placed = 0;
  for (let t = 0; t < n * 60 && placed < n; t++) {
    const x = W.r(b.x0 + 3, b.x1 - 3), z = W.r(b.z0 + 3, b.z1 - 3);
    if (sp && Math.hypot(x - sp.x, z - sp.z) < 6) continue;
    const kind = W.pick(kinds), rot = (W.rnd() < 0.5 ? 0 : Math.PI / 2) + W.r(-0.25, 0.25);
    if (!clearSpot(x, z, kind === 'wall' ? 2.6 : kind === 'table' ? 2.4 : 1.8, o.reserved)) continue;
    if (kind === 'box') W.woodBox(x, z, W.r(0.55, 0.8), rot, W.rnd() < 0.35 ? 2 : 1);
    else if (kind === 'table') W.coverTable(x, z, rot);
    else if (kind === 'door') W.metalDoor(x, z, rot);
    else W.lowWall(x, z, W.r(2.2, 3.6), rot, o.wallMat ? W.pick(o.wallMat) : null);
    if (o.reserved) reserve(x - 1.5, z - 1.5, x + 1.5, z + 1.5);
    placed++;
  }
}
function crateStack(W, x, z, n, rot = 0) {
  for (let i = 0; i < n; i++) W.prop('crate', x + (i % 2) * 1.25 * Math.cos(rot), z + (i % 2) * 1.25 * Math.sin(rot), { size: 1.2, rot: rot + W.r(-0.1, 0.1), y: i >= 2 ? 1.15 : 0, surface: 'wood', nav: i < 2 });
}
function barrelCluster(W, x, z, n) {
  for (let i = 0; i < n; i++) {
    const a = i / n * 6.28, r = n > 1 ? 0.6 : 0, name = W.rnd() < 0.5 ? 'barrel_rust' : 'barrel_red', bx = x + Math.cos(a) * r, bz = z + Math.sin(a) * r;
    W.explosive(W.prop(name, bx, bz, { size: 1.0, axis: 'h', rot: W.r(0, 6), surface: 'metal' }), name, bx, bz);
  }
}

const MAPS = [];

// 0 ─ SECTOR 7 · FLOODED BASEMENT
MAPS.push({
  name: 'SECTOR 7 · BASEMENT', key: 'sector7_basement', group: 'indoor', seed: 2026, theme: 'urban', camo: 'urban',
  desc: 'Flooded maintenance basement', bounds: { x0: -30, x1: 30, z0: -30, z1: 30 }, menuCam: { y: 2.2, r: 9 },
  expand: { style: 'annex', H: 4.2, cell: 14, wall: () => M_('clinker'), ceil: () => M_('concrete', { color: 0xc8c8c4 }), beam: () => M_('concrete', { color: 0x9a9a98 }), lamp: 0xd8ecff, coverWall: () => M_('black_brick') },
  env: {
    indoor: true, fog: { color: 0x14161a, density: 0.016 }, hemi: [0x8a9098, 0x1a1a1b, 0.55], sun: { color: 0, i: 0 },
    exposure: 1.25, grade: { sat: 0.88, contrast: 1.08, tint: 0xf2f4f6, vignette: 0.4 }, bloom: 0.6, bloomT: 0.9,
    weather: 'drips', ambience: 'amb_city', ambVol: 0.25, envLight: 0xe8eef2, vmKey: 0xeef2f6
  },
  build(W, r) {
    const H = 4.2, wall = M_('clinker'), con = M_('concrete', { color: 0x9a9a98 }), brick = M_('black_brick'), metal = MATLIB.plain(0x7a7e82, { rough: 0.4, metal: 0.8 }), pipe = MATLIB.plain(0x4a3a30, { rough: 0.5, metal: 0.8 });
    W.ground('concrete', { hills: false, size: 90, color: 0x45474b, matOpts: { wet: true, env: 0.5 } });
    W.wall(-30, -30, 30, -30, H, 0.6, wall); W.wall(-30, 30, 30, 30, H, 0.6, wall);
    W.wall(-30, -30, -30, 30, H, 0.6, wall); W.wall(30, -30, 30, 30, H, 0.6, wall);
    W.box(0, H, 0, 61, 0.4, 61, M_('concrete', { color: 0xc8c8c4 }), { nav: false, minimap: false });
    ceilingBeams(W, -30, -30, 30, 30, H, con, { spacing: 10, fromX: -20, fromZ: -20 });
    // pillar grid
    for (let x = -20; x <= 20; x += 10) for (let z = -20; z <= 20; z += 10) if (!(x === -20 && z === -20) && !(x === 20 && z === 20)) W.pillar(x, z, 0.9, H, con);
    // boiler room (NW)
    W.room(-21, -21, 16, 16, H, { wall: brick, doors: { s: [11], e: [5] }, t: 0.35 });
    W.prop('generator', -25, -25, { size: 2.4, rot: 0.2 }); W.prop('generator', -17, -25, { size: 2.4, rot: -0.1 });
    W.prop('water_tank', -24.5, -16, { size: 3.4, axis: 'h' }); W.prop('water_tank', -17.5, -17, { size: 3.0, axis: 'h' });
    W.lamp(-21, 3.9, -21, 0xff2a20, { real: true, intensity: 1.6, dist: 14, fixture: 'bulb', flicker: 'alarm', poolSize: 9, poolI: 0.5 });
    // storage cages (NE)
    fence(W, 10, -28, 10, -12, 3.2); fence(W, 10, -12, 18, -12, 3.2); fence(W, 22, -12, 28, -12, 3.2);
    crateStack(W, 15, -24, 4); crateStack(W, 24, -22, 3, 1.57); barrelCluster(W, 25, -16, 3); crateStack(W, 15, -16, 2);
    // pump room (SE)
    W.room(21, 21, 16, 16, H, { wall: brick, doors: { n: [4, 12], w: [8] } });
    W.prop('generator', 21, 24, { size: 2.6 }); W.prop('water_tank', 26, 25, { size: 3.2, axis: 'h' }); barrelCluster(W, 17, 25, 2);
    // partition walls with doorways
    W.wall(-30, 6, -8, 6, H, 0.4, wall, { openings: [{ at: 6, w: 2.6, h: 2.7 }, { at: 16, w: 2.6, h: 2.7 }] });
    W.wall(-8, 6, -8, 30, H, 0.4, wall, { openings: [{ at: 8, w: 2.6, h: 2.7 }, { at: 18, w: 2.6, h: 2.7 }] });
    W.wall(4, -6, 4, -30, H, 0.4, wall, { openings: [{ at: 10, w: 2.6, h: 2.7 }, { at: 19, w: 2.6, h: 2.7 }] });
    // cover clutter
    crateStack(W, -3, -8, 3); crateStack(W, 8, 4, 2, 0.6); crateStack(W, -15, 12, 3); crateStack(W, -22, 22, 2); crateStack(W, 2, 20, 2, 1.2);
    barrelCluster(W, 12, 12, 3); barrelCluster(W, -12, -6, 2); barrelCluster(W, -24, 0, 3);
    W.explosiveBarrel(6, -10); W.explosiveBarrel(-18, 18); W.explosiveBarrel(16, 2);
    W.prop('rubble', -2, 12, { size: 3.2, rot: 0.4, surface: 'concrete' }); W.prop('rubble', 18, -4, { size: 2.6, rot: 2, surface: 'concrete' });
    W.box(-6, 0, 22, 4, 1.1, 0.8, con); W.box(12, 0, -2, 0.8, 1.1, 4, con); W.box(-18, 0, -4, 4, 1.1, 0.8, con);
    // pipes along the ceiling
    pipeRun(W, -29, -2, 29, -2, 3.7, 0.18, pipe); pipeRun(W, -29, -2.6, 29, -2.6, 3.75, 0.1, metal);
    pipeRun(W, 14, -29, 14, 29, 3.65, 0.22, pipe); pipeRun(W, -14, -29, -14, 29, 3.7, 0.12, metal);
    // puddles
    W.water(-4, 2, 7, 5, 0.02, { walk: true, color: 0x1a2228 }); W.water(10, 16, 5, 6, 0.02, { walk: true, color: 0x1a2228 }); W.water(-16, -10, 6, 4, 0.02, { walk: true, color: 0x1a2228 });
    // lights: tubes everywhere, a few real lights
    const real = [[-10, -10], [10, -10], [0, 2], [-18, 16], [16, 18], [20, -20], [-4, 24]];
    for (let x = -25; x <= 25; x += 10) for (let z = -25; z <= 25; z += 10) {
      const isReal = real.some(p => Math.abs(p[0] - x) < 6 && Math.abs(p[1] - z) < 6);
      W.lamp(x + 5, H - 0.08, z + 5, 0xd8ecff, { fixture: 'tube', real: false, poolSize: 7, poolI: 0.22, flicker: r() < 0.15 ? 'broken' : null, rot: r() < 0.5 ? 0 : 1.57 });
    }
    real.forEach((p, i) => W.lamp(p[0], H - 0.1, p[1], 0xcfe4ff, { real: true, intensity: 1.5, dist: 17, fixture: 'tube', flicker: i === 3 ? 'broken' : null, poolSize: 8, poolI: 0.3 }));
    dressCover(W, 14, { spawn: { x: 0, z: 25 }, wallMat: [M_('black_brick'), M_('clinker')] });
    return {
      spawn: { x: 0, z: 25, yaw: 0 },
      enemySpawns: [[-24, -10], [-20, -24], [-6, -26], [8, -26], [24, -26], [26, -6], [-26, 14], [-14, -16], [20, -8], [6, -16], [24, 8], [-24, 26]]
    };
  }
});

// 1 ─ DUNE OUTPOST · AIRCRAFT HANGAR
function buildAircraft(W, x, z) {
  const skin = MATLIB.plain(0x8e968e, { rough: 0.42, metal: 0.55 }), dark = MATLIB.plain(0x2a2d30, { rough: 0.6, metal: 0.4 }), glass = MATLIB.plain(0x1a2a3a, { rough: 0.1, metal: 0.8 });
  const addG = (g, mat, px, py, pz, rx = 0, ry = 0, rz = 0) => { _wE.set(rx, ry, rz); _wQ.setFromEuler(_wE); _wM.compose(_wP.set(px, py, pz), _wQ, _wS.set(1, 1, 1)); STATIC.add(g, mat, _wM); g.dispose(); };
  addG(new THREE.CylinderGeometry(2.1, 2.1, 20, 24), skin, x, 2.7, z, 0, 0, Math.PI / 2);
  addG(new THREE.SphereGeometry(2.1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), skin, x + 10, 2.7, z, 0, 0, -Math.PI / 2);
  addG(new THREE.CylinderGeometry(2.1, 0.9, 8, 24), skin, x - 14, 3.4, z, 0, 0, Math.PI / 2 - 0.12);
  addG(new THREE.BoxGeometry(5.5, 6, 0.35), skin, x - 16.5, 6.6, z, 0, 0, 0.35);
  addG(new THREE.BoxGeometry(3.2, 0.25, 11), skin, x - 17.2, 4.2, z);
  addG(new THREE.BoxGeometry(3.6, 0.35, 34), skin, x + 1, 4.75, z);
  for (const s of [-11, -5.5, 5.5, 11]) {
    addG(new THREE.CylinderGeometry(0.7, 0.8, 3.6, 16), dark, x + 1.6, 4.0, z + s, 0, 0, Math.PI / 2);
    addG(new THREE.BoxGeometry(0.12, 3.6, 0.3), dark, x + 3.5, 4.0, z + s);
  }
  addG(new THREE.BoxGeometry(1.2, 0.7, 3.2), glass, x + 10.3, 3.9, z, 0, 0, -0.5);
  for (const s of [-1.6, 1.6]) addG(new THREE.CylinderGeometry(0.55, 0.55, 0.5, 16), dark, x - 1, 0.55, z + s, Math.PI / 2, 0, 0);
  addG(new THREE.CylinderGeometry(0.45, 0.45, 0.4, 16), dark, x + 8, 0.45, z, Math.PI / 2, 0, 0);
  addCollider(x - 12, x + 12, 0.55, 4.8, z - 2.1, z + 2.1, { surface: 'metal' });
  addCollider(x - 1.6, x - 0.4, 0, 1.1, z - 2, z + 2, { surface: 'metal', minimap: false });
  addCollider(x + 7.5, x + 8.5, 0, 0.9, z - 0.4, z + 0.4, { surface: 'metal', minimap: false });
  addCollider(x - 19, x - 12, 1.4, 9, z - 1.2, z + 1.2, { surface: 'metal', minimap: false });
  addCollider(x - 0.8, x + 2.8, 4.5, 5.0, z - 17, z + 17, { surface: 'metal', minimap: false, nav: false });
}
MAPS.push({
  name: 'DUNE OUTPOST · HANGAR', key: 'dune_hangar', group: 'indoor', seed: 7711, theme: 'desert', camo: 'desert',
  desc: 'Aircraft hangar at the desert airstrip', bounds: { x0: -35, x1: 35, z0: -25, z1: 25 }, menuCam: { y: 5, r: 16 },
  expand: { style: 'outskirts', lot: 36, road: 'asphalt', roads: [['x', 0]], weights: { camp: 3, checkpoint: 2, cluster: 2, field: 2 },
    house: (W, x, z, w, d, side) => W.house(x, z, w, d, W.r(3.4, 4.2), { wall: W.rnd() < 0.5 ? M_('corrugated', { color: 0xd0c4a8 }) : M_('adobe'), roof: M_('concrete', { color: 0xb0a890 }), doorSide: side, parapet: true }),
    tree: (W, x, z) => { W.prop('palm', x, z, { size: W.r(6, 9), axis: 'h', collide: false }); addCollider(x - 0.3, x + 0.3, 0, 3, z - 0.3, z + 0.3, { surface: 'wood', minimap: false }); },
    rock: () => M_('mountain_rock', { color: 0xd8a070 }), wallMat: () => M_('adobe'), log: false },
  env: {
    indoor: true, skyVisible: true, fog: { color: 0xd4cbbb, density: 0.005 }, hemi: [0xe2e4e6, 0x6a5e4c, 0.55],
    sun: { color: 0xfff0e0, i: 2.7 }, sunDir: [0.85, 0.5, 0.2], exposure: 1.0,
    sky: { zenith: 0x4a76b0, horizon: 0xdcdcd6, ground: 0xb0a080, sunColor: 0xfff4e4, glow: 0.7, clouds: 0.35 },
    grade: { sat: 0.94, contrast: 1.06, tint: 0xfffaf4, vignette: 0.32 }, bloom: 0.5, weather: 'motes', ambience: 'amb_desert', ambVol: 0.35, envLight: 0xf4ece0
  },
  build(W, r) {
    const H = 10, skin = M_('corrugated', { color: 0xd8ccb0 }), con = M_('concrete', { color: 0xb8b0a0 }), plaster = M_('plaster', { color: 0xd8cfc0 }), steel = M_('metal', { color: 0x707478 }), rail = MATLIB.plain(0xd8a020, { rough: 0.5, metal: 0.6 });
    W.ground('sand', { hills: true, hillMax: 10, size: 420 });
    W.patch(0, 0, 72, 52, 'concrete', { matOpts: { color: 0xa8a49c } });
    W.patch(70.5, 0, 69, 30, 'asphalt', { y: 0.004 }); // starts at the door line: no overlap with the hangar floor (z-fighting)
    // walls
    W.wall(-36, -26, 36, -26, H, 0.5, skin); W.wall(-36, 26, 36, 26, H, 0.5, skin); W.wall(-36, -26, -36, 26, H, 0.5, skin);
    W.wall(36, -26, 36, 26, H, 0.5, skin, { openings: [{ at: 26, w: 26, h: 8.5 }] });
    addCollider(35.6, 36.6, 0, 8.5, -13, 13, { shot: false, surface: 'metal', minimap: false });
    W.box(36.4, 0, -17, 1.2, 8.5, 9, steel, { collide: false }); W.box(36.4, 0, 17, 1.2, 8.5, 9, steel, { collide: false });
    // arched roof with two skylight gaps
    const segs = 14;
    for (let i = 0; i < segs; i++) {
      const u0 = i / segs, u1 = (i + 1) / segs;
      const z0 = -26 + 52 * u0, z1 = -26 + 52 * u1, y0 = H + 6 * Math.sin(Math.PI * u0), y1 = H + 6 * Math.sin(Math.PI * u1);
      const len = Math.hypot(z1 - z0, y1 - y0), ang = Math.atan2(y1 - y0, z1 - z0);
      if (i === 4 || i === 9) continue;
      W.box(0, (y0 + y1) / 2 - 0.15, (z0 + z1) / 2, 73, 0.3, len + 0.05, skin, { rotX: -ang, collide: false });
    }
    for (let x = -32; x <= 32; x += 8) for (let i = 0; i <= segs; i += 2) { const u = i / segs; W.box(x, H + 6 * Math.sin(Math.PI * u) - 0.6, -26 + 52 * u, 0.25, 0.4, 0.25, steel, { collide: false }); }
    for (let x = -32; x <= 32; x += 8) W.box(x, H - 0.3, 0, 0.3, 0.3, 52, steel, { collide: false });
    for (const z of [-26 + 52 * 4.5 / segs, -26 + 52 * 9.5 / segs]) W.shaft(r() * 4, 15, z, 2.5, 4.5, 15, 0xffe0b0, { i: 0.22, dir: new THREE.Vector3(-0.85, -1, -0.2) });
    buildAircraft(W, 4, 0);
    // offices (2 storeys) along the west wall with stairs and a catwalk on the north wall
    W.room(-31, 8, 9, 12, 3.6, { wall: plaster, doors: { e: [4] }, windows: { e: [9] }, ceil: con, glass: 'clear' });
    W.room(-31, -6, 9, 12, 3.6, { wall: plaster, doors: { e: [8] }, windows: { e: [3] }, ceil: con, glass: 'clear' });
    W.box(-31, 3.6, -16, 9, 0.3, 20, steel, { nav: false, minimap: false });
    W.box(-20, 3.6, -23.5, 30, 0.25, 4, steel, { nav: false, minimap: false });
    W.box(-15.5, 3.85, -21.6, 21, 1.0, 0.08, rail, { collide: true, minimap: false, nav: false });
    W.box(-5.04, 3.85, -23.5, 0.08, 1.0, 4, rail, { collide: true, minimap: false, nav: false });
    W.stairs(-20.5, -19.6, 2.4, 6, 3.6, '-x', steel);
    crateStack(W, -26, -22, 2); barrelCluster(W, -14, -23.5, 2);
    // vehicles & clutter
    W.prop('technical', 22, -14, { size: 5.6, rot: 0.4 }); W.prop('technical', -12, 16, { size: 5.6, rot: -2.4 });
    W.prop('technical', 46, 8, { size: 5.6, rot: 1.9, collide: false });
    crateStack(W, 18, 12, 4); crateStack(W, 26, 18, 3, 1.57); crateStack(W, -18, 2, 3); crateStack(W, -6, -14, 2, 0.4); crateStack(W, 12, -20, 3);
    barrelCluster(W, 28, -20, 3); barrelCluster(W, -24, 20, 3); barrelCluster(W, 10, 20, 2);
    W.explosiveBarrel(20, 4); W.explosiveBarrel(-8, -20); W.explosiveBarrel(-20, 12);
    W.prop('generator', 30, 6, { size: 2.2, rot: 1.57 }); W.prop('generator', -28, 22, { size: 2.2 });
    W.prop('sandbags', 31, -6, { size: 3.2, rot: 1.57 }); W.prop('sandbags', 31, 4, { size: 3.2, rot: 1.57 }); W.prop('sandbags', 24, 0, { size: 3.0, rot: 1.57 });
    W.box(-2, 0, 18, 6, 1.0, 1.2, con); W.box(14, 0, -6, 1.2, 1.0, 5, con);
    // yellow floor markings
    for (let x = -30; x <= 30; x += 6) W.patch(x, 12.5, 3.5, 0.2, 'concrete', { matOpts: { color: 0xffd040 } });
    // high-bay lamps
    for (let x = -24; x <= 24; x += 16) for (const z of [-12, 12]) W.lamp(x, 9.4, z, 0xffe2b8, { fixture: 'flood', real: Math.abs(x) < 20, intensity: 1.6, dist: 24, poolSize: 12, poolI: 0.25 });
    // outside dressing beyond the doors
    W.prop('watchtower', 60, -24, { size: 10, axis: 'h', collide: false }); W.prop('palm', 56, 20, { size: 8, axis: 'h', collide: false }); W.prop('palm', 66, 26, { size: 9, axis: 'h', collide: false });
    W.backdrop('pano_desert', { tint: 0xfff0d8 });
    dressCover(W, 12, { spawn: { x: -24, z: 0 }, kinds: ['box', 'box', 'door', 'table', 'wall'], wallMat: [M_('concrete', { color: 0xb8b0a0 })] });
    return {
      spawn: { x: -24, z: 0, yaw: -Math.PI / 2 },
      enemySpawns: [[30, -18], [30, 18], [24, 0], [10, -22], [10, 22], [-4, -22], [-4, 22], [16, -10], [16, 10], [-30, -22], [32, 10]]
    };
  }
});

// 2 ─ WHITEOUT · ARCTIC BUNKER
MAPS.push({
  name: 'WHITEOUT · ARCTIC BUNKER', key: 'white_bunker', group: 'indoor', seed: 4242, theme: 'arctic', camo: 'arctic',
  desc: 'Frozen research bunker compartments', bounds: { x0: -27, x1: 27, z0: -27, z1: 27 }, menuCam: { y: 2.2, r: 6 },
  expand: { style: 'annex', H: 4.5, cell: 15, wall: () => M_('concrete', { color: 0xb8c4d0 }), ceil: () => M_('ceiling_tiles', { color: 0xe6edf3 }), beam: () => M_('concrete', { color: 0xa8b2bc }), lamp: 0xd8ecff, coverWall: () => M_('concrete', { color: 0xb8c4d0 }) },
  env: {
    indoor: true, skyVisible: true, fog: { color: 0x1a222c, density: 0.014 }, hemi: [0x9ab8d8, 0x1c2228, 0.52],
    sun: { color: 0xdde8ff, i: 1.4 }, sunDir: [0.3, 0.9, 0.25], exposure: 1.04,
    sky: { zenith: 0x7a8ea8, horizon: 0xd8e2ec, ground: 0x8a96a2, clouds: 0.8, cloudColor: 0xe8eef4, glow: 0.2 },
    grade: { sat: 0.9, contrast: 1.14, tint: 0xf0f3f8, lift: 0x010102, vignette: 0.4 }, bloom: 0.6, weather: 'motes', ambience: 'amb_snow', ambVol: 0.3, envLight: 0xe8eef4, vmKey: 0xeef2f8
  },
  build(W, r) {
    const H = 4.5, con = M_('concrete', { color: 0xb8c4d0 }), metal = MATLIB.plain(0x8a96a2, { rough: 0.45, metal: 0.6 }), dark = MATLIB.plain(0x1a1e24, { rough: 0.5, metal: 0.5 }), snow = M_('snow');
    const tilesC = M_('ceiling_tiles', { color: 0xe6edf3 });
    W.ground('concrete', { hills: false, size: 80, color: 0x5c6670 });
    const C = 18;
    for (let gx = -1; gx <= 1; gx++) for (let gz = -1; gz <= 1; gz++) {
      const x = gx * C, z = gz * C;
      const doors = {};
      if (gz > -1) doors.n = [C / 2 - 4, C / 2 + 4]; if (gz < 1) doors.s = [C / 2 - 4, C / 2 + 4];
      if (gx > -1) doors.w = [C / 2]; if (gx < 1) doors.e = [C / 2];
      const skyHole = gx === 1 && gz === 1;
      W.room(x, z, C, C, H, { wall: con, doors, doorW: 2.6, doorH: 2.8, t: 0.4, ceil: skyHole ? null : tilesC });
      if (skyHole) { W.box(x - 5.5, H, z, 7, 0.4, C, con, { nav: false, minimap: false }); W.box(x + 6.5, H, z, 5, 0.4, C, con, { nav: false, minimap: false }); W.box(x + 1, H, z - 6, 6, 0.4, 6, con, { nav: false, minimap: false }); W.box(x + 1, H, z + 6.5, 6, 0.4, 5, con, { nav: false, minimap: false }); }
      // wainscot metal panels
      // wainscot metal panels along the north / south walls - split at the doorways, and solid
      const panel = (zz, hasDoors) => { for (const [a, b] of hasDoors ? [[-8.5, -5.4], [-2.6, 2.6], [5.4, 8.5]] : [[-8.5, 8.5]]) W.box(x + (a + b) / 2, 0, zz, b - a, 1.1, 0.1, metal, { surface: 'metal' }); };
      panel(z - C / 2 + 0.3, gz > -1); panel(z + C / 2 - 0.3, gz < 1);
      W.lamp(x, H - 0.1, z, 0xd8ecff, { fixture: 'tube', len: 2.4, real: (gx + gz) % 2 === 0, intensity: 1.5, dist: 18, poolSize: 10, poolI: 0.3, flicker: gx === -1 && gz === 1 ? 'broken' : null });
      W.lamp(x - 5, H - 0.1, z - 5, 0xd8ecff, { fixture: 'tube', poolSize: 6, poolI: 0.2 }); W.lamp(x + 5, H - 0.1, z + 5, 0xd8ecff, { fixture: 'tube', poolSize: 6, poolI: 0.2 });
    }
    // server room (NW)
    for (let i = 0; i < 4; i++) { const zx = -C - 5 + i * 3.2; W.box(-C, 0, zx, 8, 2.2, 0.9, dark, { surface: 'metal' }); W.box(-C, 0.4, zx + 0.46, 7.6, 0.04, 0.02, MATLIB.emissive(i % 2 ? 0x30ff80 : 0x40a0ff, 3), { collide: false }); W.box(-C, 1.4, zx - 0.46, 7.6, 0.04, 0.02, MATLIB.emissive(0x40a0ff, 3), { collide: false }); }
    // command room (centre)
    W.box(0, 0, 0, 5, 1.0, 2.6, metal); W.box(0, 1.0, 0, 4.6, 0.05, 2.2, MATLIB.emissive(0x30a0ff, 1.6), { collide: false });
    for (const s of [-6, 6]) { W.box(s, 0, -6, 3, 1.1, 1, dark); W.box(s, 1.1, -6.3, 2.6, 0.9, 0.08, MATLIB.emissive(0x50ff90, 1.4), { collide: false, rotX: -0.3 }); }
    // generator room (NE)
    W.prop('generator', C - 4, -C - 4, { size: 2.6 }); W.prop('generator', C + 4, -C - 4, { size: 2.6 }); W.prop('water_tank', C + 5, -C + 5, { size: 3.6, axis: 'h' });
    // barracks (SW)
    for (let i = 0; i < 4; i++) {
      const bx = -C - 6 + i * 4;
      W.box(bx, 0, C + 6, 2.0, 0.6, 1.0, metal); W.box(bx, 1.4, C + 6, 2.0, 0.15, 1.0, metal);
      for (const [px, pz] of [[-0.95, -0.45], [0.95, -0.45], [-0.95, 0.45], [0.95, 0.45]]) W.box(bx + px, 0, C + 6 + pz, 0.06, 1.55, 0.06, dark, { collide: false });
    }
    for (let i = 0; i < 6; i++) W.box(-C + 7.5, 0, C - 6 + i * 1.1, 0.6, 2.0, 1.0, metal, { surface: 'metal' });
    // vehicle bay (SE) with the broken skylight
    W.prop('technical', C + 2, C + 2, { size: 5.6, rot: 0.6 }); W.prop('radar', C - 5, C - 4, { size: 4.5, axis: 'h' });
    W.patch(C + 1, C, 6, 6, 'snow'); W.rock(C + 2, C - 1.5, 1.0, snow, { sy: 0.4 }); W.rock(C - 0.5, C + 1.5, 0.8, snow, { sy: 0.35 });
    W.shaft(C + 1, H + 3, C, 2.5, 3.6, 8, 0xe8f0ff, { i: 0.3 });
    // storage clutter
    crateStack(W, 0, -C - 3, 3); crateStack(W, -C - 3, 2, 3, 1.57); crateStack(W, C + 3, -1, 2); crateStack(W, 3, C + 4, 3); crateStack(W, -5, 5, 2);
    barrelCluster(W, 6, -C + 4, 2); barrelCluster(W, -C + 4, -4, 3); barrelCluster(W, C - 4, 5, 2);
    W.explosiveBarrel(-4, -C + 5); W.explosiveBarrel(C - 5, -5); W.explosiveBarrel(-C + 5, C - 4);
    W.box(-6, 0, C - 4, 3.5, 1.1, 0.8, con); W.box(6, 0, -C + 6, 0.8, 1.1, 3.5, con); W.box(C - 6, 0, 2, 3.5, 1.1, 0.8, con);
    // frost patches
    dressCover(W, 14, { spawn: { x: 0, z: 23 }, kinds: ['table', 'table', 'door', 'door', 'box', 'wall'], wallMat: [M_('concrete', { color: 0xb8c4d0 })] });
    return {
      spawn: { x: 0, z: 23, yaw: 0 },
      enemySpawns: [[-22, -22], [0, -23], [22, -22], [-23, 0], [23, 0], [-14, -14], [14, -14], [22, 14], [-22, 14], [0, -10]]
    };
  }
});

// 3 ─ NIGHT CITY · UNDERGROUND PARKING
MAPS.push({
  name: 'NIGHT CITY · PARKING', key: 'city_garage', group: 'indoor', seed: 999, theme: 'night', camo: 'night',
  desc: 'Underground parking garage under the city', bounds: { x0: -32, x1: 32, z0: -28, z1: 28 }, menuCam: { y: 1.9, r: 10 },
  expand: { style: 'garage', H: 3.4, wall: () => M_('fortress'), ceil: () => M_('concrete', { color: 0xaeaeb4 }), beam: () => M_('fortress'), lamp: 0xd6ecff, lamp2: 0xffa04a, coverWall: () => M_('fortress') },
  env: {
    // a dark garage lit by its own fixtures: sodium-orange bays, a few cold fluorescent tubes, burning wrecks and neon
    indoor: true, fog: { color: 0x120f0d, density: 0.017 }, hemi: [0x6a5e50, 0x0e0c0a, 0.36], sun: { color: 0, i: 0 },
    exposure: 1.05, grade: { sat: 1.0, contrast: 1.14, tint: 0xf8f2ec, lift: 0x020103, vignette: 0.5 }, bloom: 0.75, bloomT: 0.85,
    weather: 'none', ambience: 'amb_city', ambVol: 0.35, envLight: 0xd8b890, vmKey: 0xffd6a8
  },
  build(W, r) {
    const H = 3.4, con = M_('concrete', { color: 0x8a8a90 }), pil = M_('fortress'), wall = M_('fortress'), hazard = MATLIB.plain(0xe0b020, { rough: 0.6 }), white = MATLIB.plain(0xd8d8d8, { rough: 0.8 });
    W.ground('rock', { hills: false, size: 90, matOpts: { wet: true } });
    W.wall(-32, -28, 32, -28, H, 0.6, wall); W.wall(-32, 28, 32, 28, H, 0.6, wall); W.wall(-32, -28, -32, 28, H, 0.6, wall); W.wall(32, -28, 32, 28, H, 0.6, wall);
    W.box(0, H, 0, 65, 0.4, 57, M_('concrete', { color: 0xaeaeb4 }), { nav: false, minimap: false });
    ceilingBeams(W, -32, -28, 32, 28, H, con, { spacing: 8, fromX: -24, fromZ: -18, depth: 0.42 });
    for (let x = -24; x <= 24; x += 8) for (let z = -18; z <= 18; z += 9) { W.pillar(x, z, 0.7, H, pil); W.box(x, 0, z, 0.74, 0.5, 0.74, hazard, { collide: false }); }
    // parking bays
    for (let x = -28; x <= 28; x += 3) for (const z of [-24, -12.5, 0, 12.5]) W.patch(x, z + 2.6, 0.12, 5, 'concrete', { matOpts: { color: 0xffffff } });
    for (let x = -26; x <= 26; x += 12) W.patch(x, -6.3, 3, 0.25, 'concrete', { matOpts: { color: 0xffe060 } });
    // cars
    const carSpots = [[-26.5, -21], [-20.5, -21.5], [-8.5, -21], [3.5, -21.5], [15.5, -21], [24.5, -21], [-23.5, 2.6], [-11.5, 2.4], [9.5, 2.8], [21.5, 2.5], [-17.5, 15.2], [0.5, 15], [18.5, 15.1]];
    for (const p of carSpots) if (r() < 0.85) W.prop('car_wreck', p[0], p[1], { size: 4.4, rot: Math.PI / 2 + W.r(-0.15, 0.15), surface: 'metal' });
    W.prop('bus_wreck', -17, 24.5, { size: 11, rot: 0, surface: 'metal' });
    // barriers & cover
    for (const p of [[-14, -8], [-2, -9], [12, -8], [26, -9], [-28, 8], [6, 8], [-10, 21]]) W.prop('barrier', p[0], p[1], { size: 2.4, rot: W.r(-0.3, 0.3), surface: 'concrete' });
    crateStack(W, 27, 24, 3); crateStack(W, -28, -12, 2, 1.57); barrelCluster(W, 28, -2, 2); barrelCluster(W, -18, 24, 3);
    W.explosiveBarrel(4, -9); W.explosiveBarrel(-26, 22); W.explosiveBarrel(20, 8);
    W.prop('sandbags', 9, 18, { size: 3, rot: 0 }); W.prop('sandbags', -6, 16, { size: 3, rot: 0.2 });
    // ramp up (blocked)
    for (let i = 0; i < 6; i++) W.box(26 + 0, i * 0.25, -14 + i * 1.6, 7, 0.25, 1.6, con, { nav: i < 2 });
    W.prop('barrier', 26, -5, { size: 3, rot: Math.PI / 2 });
    // neon signage
    const neon = (x, y, z, w, col, rot) => { W.box(x, y, z, w, 0.12, 0.06, MATLIB.emissive(col, 4), { collide: false, rot }); W.lightPool(x, 0, z + (rot ? 0 : (z > 0 ? -1.2 : 1.2)), col, 5, 0.18); };
    neon(-20, 2.3, -27.6, 6, 0xff2a8a); neon(10, 2.5, -27.6, 4, 0x2ab0ff); neon(-12, 2.4, 27.6, 5, 0x2ab0ff); neon(18, 2.2, 27.6, 7, 0xff2a8a);
    neon(-31.6, 2.6, 12, 4, 0xffb020, Math.PI / 2); neon(31.6, 2.4, -20, 5, 0x40ffd0, Math.PI / 2);
    W.box(-31.6, 1.6, -4, 0.06, 1.0, 3, MATLIB.emissive(0x30ff90, 2.5), { collide: false });
    // sodium lights
    const real = [[-16, -14], [8, -14], [-20, 8], [0, 4], [20, 6], [-6, 20], [24, -24]];
    // ceiling fixtures: sodium vapour over the bays (orange), fluorescent tubes over the driving lanes (cool), denser grid
    const SODIUM = 0xffa04a, TUBE = 0xd6ecff;
    for (let x = -28; x <= 28; x += 8) for (let z = -22; z <= 22; z += 9) W.lamp(x + 4, H - 0.08, z + 4.5, (x + z) % 3 === 0 ? TUBE : SODIUM, { fixture: 'tube', len: 1.2, poolSize: 7, poolI: 0.3, flicker: r() < 0.14 ? 'broken' : null });
    for (let x = -28; x <= 28; x += 8) for (const z of [-17.5, -6.3, 6.3, 17.5]) W.lamp(x, H - 0.08, z, SODIUM, { fixture: 'bulb', poolSize: 5, poolI: 0.26, glow: 5 });
    real.forEach((p, i) => W.lamp(p[0], H - 0.12, p[1], i % 3 === 0 ? TUBE : SODIUM, { real: true, intensity: 1.35, dist: 15, fixture: 'tube', flicker: i === 5 ? 'broken' : null, poolSize: 8, poolI: 0.34 }));
    // fires: burning wrecks and oil drums the survivors lit (flickering warm light, smoke under the ceiling)
    W.fire(-20.5, 0.55, -21.5, 1.3); W.fire(15.5, 0.55, -21, 1.1); W.fire(0.5, 0.5, 15, 1.0);
    W.fireDrum(-29.5, -18); W.fireDrum(29.5, 20); W.fireDrum(-4, -12.5); W.fireDrum(14, 12.5); W.fireDrum(-29, 25);
    // emergency beacons by the blocked ramp and the exits (red / amber, rotating)
    for (const [x, z, col] of [[22.6, -6, 0xff2a20], [29.4, -6, 0xffa020], [-31.4, -4, 0x30ff90]]) {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.18, 10), MATLIB.emissive(col, 4)); b.position.set(x, 2.6, z); scene.add(b); mapObjects.push(b);
      const lamp = W.lamp(x, 2.4, z, col, { fixture: 'bulb', real: true, intensity: 0.9, dist: 9, pool: false, ceilGlow: false, glow: 0.01 }), ph = Math.random() * 6;
      mapAnimators.push((t) => { const k = Math.max(0, Math.sin(t * 5 + ph)); lamp.mult = 0.25 + k * k * 1.2; b.material.emissiveIntensity = 1 + k * 4; });
    }
    dressCover(W, 12, { spawn: { x: 2, z: 24 }, kinds: ['box', 'door', 'wall', 'wall', 'table'], wallMat: [M_('concrete', { color: 0x9a9aa0 })] });
    return {
      spawn: { x: 2, z: 24, yaw: 0 },
      enemySpawns: [[-26, -25], [-10, -25], [10, -25], [26, -25], [-28, -6], [28, -12], [-28, 10], [28, 14], [-14, -16], [16, -16], [0, -16]]
    };
  }
});

// 4 ─ JUNGLE BASE · BUNKER COMPLEX
MAPS.push({
  name: 'JUNGLE BASE · BUNKER', key: 'jungle_bunker', group: 'indoor', seed: 1234, theme: 'jungle', camo: 'woodland',
  desc: 'Overgrown concrete bunker around a jungle atrium', bounds: { x0: -30, x1: 30, z0: -30, z1: 30 }, menuCam: { y: 3, r: 7 },
  expand: { style: 'annex', H: 4, cell: 14, wall: () => M_('brick'), ceil: () => M_('concrete', { color: 0x9aa090 }), beam: () => M_('concrete', { color: 0x8a907e }), lamp: 0xffd890, fixture: 'bulb', coverWall: () => M_('brick'), pillar: () => M_('brick') },
  env: {
    indoor: true, skyVisible: true, fog: { color: 0x30362f, density: 0.012 }, hemi: [0xc8d2c4, 0x1e2418, 0.62],
    sun: { color: 0xfff4e0, i: 2.3 }, sunDir: [0.25, 0.92, 0.3], exposure: 1.05,
    sky: { zenith: 0x8498a8, horizon: 0xd2d6d0, ground: 0x4a5040, clouds: 0.8, glow: 0.4 },
    grade: { sat: 0.96, contrast: 1.08, tint: 0xf2f8ee, vignette: 0.4 }, bloom: 0.55, weather: 'motes', ambience: 'amb_desert', ambVol: 0.2, envLight: 0xe8eee2, vmKey: 0xfff4e4
  },
  build(W, r) {
    const H = 4, stone = M_('brick'), con = M_('concrete', { color: 0x9aa090 }), leaves = M_('leaves', { color: 0x7a9a6a }), bark = M_('bark'), grass = M_('grass');
    W.ground('gravel', { hills: false, size: 90, kind: 'floor' });
    W.wall(-30, -30, 30, -30, H, 0.6, stone); W.wall(-30, 30, 30, 30, H, 0.6, stone); W.wall(-30, -30, -30, 30, H, 0.6, stone); W.wall(30, -30, 30, 30, H, 0.6, stone);
    // roof over the wings and corridors (the atrium gets its own terrace deck below)
    W.box(0, H, -19.5, 61, 0.4, 21, con, { nav: false, minimap: false }); W.box(0, H, 19.5, 61, 0.4, 21, con, { nav: false, minimap: false });
    W.box(-19.5, H, 0, 21, 0.4, 18, con, { nav: false, minimap: false }); W.box(19.5, H, 0, 21, 0.4, 18, con, { nav: false, minimap: false });
    ceilingBeams(W, -30, -30, 30, 30, H, M_('concrete', { color: 0x8a907e }), { spacing: 6, fromX: -24, fromZ: -24, hole: { x0: -9, x1: 9, z0: -9, z1: 9 } });
    // atrium walls with doorways
    W.wall(-9, -9, 9, -9, H, 0.5, stone, { openings: [{ at: 4, w: 2.6, h: 2.8 }, { at: 14, w: 2.6, h: 2.8 }] });
    W.wall(-9, 9, 9, 9, H, 0.5, stone, { openings: [{ at: 9, w: 3, h: 2.8 }] });
    W.wall(-9, -9, -9, 9, H, 0.5, stone, { openings: [{ at: 9, w: 3, h: 2.8 }] });
    W.wall(9, -9, 9, 9, H, 0.5, stone, { openings: [{ at: 5, w: 2.6, h: 2.8 }, { at: 13, w: 2.6, h: 2.8 }] });
    // atrium jungle
    W.patch(0, 0, 18, 18, 'grass');
    W.prop('palm', -4, -3, { size: 3.4, axis: 'h', collide: false }); addCollider(-4.25, -3.75, 0, 2.5, -3.25, -2.75, { surface: 'wood' });
    W.prop('palm', 4, 4, { size: 3.6, axis: 'h', collide: false }); addCollider(3.75, 4.25, 0, 2.5, 3.75, 4.25, { surface: 'wood' });
    W.prop('tent', 3, -4, { size: 4.5, rot: 0.5, surface: 'wood' });
    for (let i = 0; i < 14; i++) { const x = W.r(-7.5, 7.5), z = W.r(-7.5, 7.5); if (Math.hypot(x - 3, z + 4) < 3) continue; const g = new THREE.IcosahedronGeometry(W.r(0.5, 1.0), 1); _wM.makeTranslation(x, 0.4, z); STATIC.add(g, leaves, _wM); g.dispose(); }
    // terrace roof over the atrium: a concrete deck with four barred light wells (sun shafts fall through the
    // bars onto the garden), a parapet around the terrace on top, beams and lamps underneath
    const wells = [-4.5, 4.5], ws = 2.2, wm = MATLIB.plain(0x2a2e2a, { rough: 0.5, metal: 0.7 });
    const zs = [[-9, -4.5 - ws / 2], [-4.5 - ws / 2, -4.5 + ws / 2], [-4.5 + ws / 2, 4.5 - ws / 2], [4.5 - ws / 2, 4.5 + ws / 2], [4.5 + ws / 2, 9]];
    zs.forEach(([z0, z1], k) => {
      const zc = (z0 + z1) / 2, zd = z1 - z0;
      if (k % 2 === 0) W.box(0, H, zc, 18.2, 0.4, zd, con, { nav: false, minimap: false });
      else for (const [x0, x1] of [[-9, -4.5 - ws / 2], [-4.5 + ws / 2, 4.5 - ws / 2], [4.5 + ws / 2, 9]]) W.box((x0 + x1) / 2, H, zc, x1 - x0, 0.4, zd, con, { nav: false, minimap: false });
    });
    for (const wx of wells) for (const wz of wells) {
      for (let b = -2; b <= 2; b++) W.box(wx + b * 0.44, H + 0.12, wz, 0.07, 0.07, ws + 0.1, wm, { collide: false, minimap: false, nav: false });
      W.box(wx, H + 0.12, wz, ws + 0.1, 0.07, 0.07, wm, { collide: false, minimap: false, nav: false });
      W.shaft(wx, H + 1.5, wz, 0.9, 1.5, 5.5, 0xfff0c8, { i: 0.16, dir: new THREE.Vector3(0.12, -1, 0.15) });
    }
    for (const [x, z, w, d] of [[0, -9.1, 18.4, 0.3], [0, 9.1, 18.4, 0.3], [-9.1, 0, 0.3, 18.4], [9.1, 0, 0.3, 18.4]]) W.box(x, H + 0.4, z, w, 0.9, d, con, { collide: false, minimap: false, nav: false });
    for (const x of [-6, 0, 6]) W.box(x, H - 0.32, 0, 0.35, 0.32, 18, M_('concrete', { color: 0x8a907e }), { collide: false, minimap: false, nav: false });
    for (const [x, z] of [[-4.5, 0], [4.5, 0], [0, -6.5], [0, 6.5]]) W.lamp(x, H - 0.4, z, 0xffe0a8, { fixture: 'bulb', real: x === 0, intensity: 1.2, dist: 13, poolSize: 7, poolI: 0.28 });
    // wings: rooms off the corridors
    W.room(-20, -20, 14, 14, H, { wall: stone, doors: { e: [7], s: [10] }, t: 0.4 });
    W.room(20, -20, 14, 14, H, { wall: stone, doors: { w: [7], s: [4] }, t: 0.4 });
    W.room(-20, 20, 14, 14, H, { wall: stone, doors: { e: [7], n: [10] }, t: 0.4 });
    W.room(20, 20, 14, 14, H, { wall: stone, doors: { w: [7], n: [4] }, t: 0.4 });
    // armory / comms / barracks / storage dressing
    crateStack(W, -23, -23, 4); crateStack(W, -17, -24, 2, 1.57); for (let i = 0; i < 4; i++) W.box(-26.5, 0, -21 + i * 1.6, 0.8, 2, 1.2, MATLIB.plain(0x3a4a3a, { metal: 0.5 }));
    W.prop('generator', 22, -23, { size: 2.4 }); W.prop('radar', 18, -17, { size: 3.0, axis: 'h' });
    for (let i = 0; i < 3; i++) { W.box(-23 + i * 3.2, 0, 23, 2, 0.5, 1, MATLIB.plain(0x4a5040)); }
    barrelCluster(W, 22, 22, 4); crateStack(W, 17, 25, 2);
    // corridor clutter
    crateStack(W, 0, -22, 2); crateStack(W, -24, 0, 2, 1.57); crateStack(W, 24, 2, 2, 1.57); crateStack(W, 2, 24, 2);
    barrelCluster(W, -12, -14, 2); barrelCluster(W, 13, 14, 2); W.prop('sandbags', 0, -13, { size: 3, rot: 0 }); W.prop('sandbags', -13, 0, { size: 3, rot: 1.57 });
    W.explosiveBarrel(-14, 24); W.explosiveBarrel(14, -26); W.explosiveBarrel(26, -12);
    // vines
    for (let i = 0; i < 40; i++) { const side = i % 4, t = W.r(-28, 28); const x = side === 0 ? -29.6 : side === 1 ? 29.6 : t, z = side === 2 ? -29.6 : side === 3 ? 29.6 : t; const L = W.r(1, 3); W.box(x, H - L, z, 0.08, L, 0.08, leaves, { collide: false }); }
    for (let i = 0; i < 16; i++) { const x = W.r(-9, 9), z = (i % 2 ? -9 : 9) + W.r(-0.2, 0.2); const L = W.r(1, 3.4); W.box(x, H - L, z, 0.1, L, 0.1, leaves, { collide: false }); }
    // lights
    const lamps = [[-20, -20], [20, -20], [-20, 20], [20, 20], [0, -19], [-19, 0], [19, 0], [0, 19]];
    lamps.forEach((p, i) => W.lamp(p[0], H - 0.15, p[1], 0xffd890, { fixture: 'bulb', real: i < 6, intensity: 1.3, dist: 15, poolSize: 8, poolI: 0.3, flicker: i === 2 ? 'broken' : null }));
    dressCover(W, 12, { spawn: { x: 0, z: 25 }, kinds: ['box', 'box', 'wall', 'wall', 'table', 'door'], wallMat: [M_('greenstone')] });
    return {
      spawn: { x: 0, z: 25, yaw: 0 },
      enemySpawns: [[-24, -25], [0, -25], [24, -25], [-25, -8], [25, -8], [-24, 10], [24, 10], [-20, -14], [20, -14], [0, -5]]
    };
  }
});

// 5 ─ RANDOM OPS · procedural compartments
MAPS.push({
  name: 'RANDOM OPS · COMPOUND', key: 'random_ops', group: 'indoor', random: true, theme: 'urban', camo: 'urban',
  desc: 'A new building every deployment: office, warehouse, prison, hospital, factory, bunker, hotel, data center or subway', bounds: { x0: -60, x1: 60, z0: -60, z1: 60 }, menuCam: { y: 2.3, r: 5 },
  noExpand: true, // the generator itself builds a compound the size of an expanded map (random_maps.js)
  env: () => randomIndoorEnv(),
  build(W, r) { return buildRandomIndoor(W, r); }
});
