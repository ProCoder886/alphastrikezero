// ---------- Outdoor operations (based on the location concept art) ----------
const RESERVED = [];
function reserve(x0, z0, x1, z1) { RESERVED.push({ x0: Math.min(x0, x1), x1: Math.max(x0, x1), z0: Math.min(z0, z1), z1: Math.max(z0, z1) }); }
// Spatial index (8 m cells) over the colliders and reserved areas, filled incrementally while a map is built: the
// free-spot tests used to scan every collider for every placement attempt (quadratic on the big random maps).
const FREEGRID = {
  S: 8, n: 0, rn: 0, cells: new Map(), rcells: new Map(), stamp: 0,
  reset() { this.cells.clear(); this.rcells.clear(); this.n = this.rn = 0; },
  _add(map, q) {
    const S = this.S, gx0 = Math.floor(q.x0 / S), gx1 = Math.floor(q.x1 / S), gz0 = Math.floor(q.z0 / S), gz1 = Math.floor(q.z1 / S);
    for (let gx = gx0; gx <= gx1; gx++) for (let gz = gz0; gz <= gz1; gz++) { const k = gx * 65536 + gz; let a = map.get(k); if (!a) map.set(k, a = []); a.push(q); }
  },
  sync() {
    if (colliders.length < this.n || RESERVED.length < this.rn) this.reset();
    while (this.n < colliders.length) this._add(this.cells, colliders[this.n++]);
    while (this.rn < RESERVED.length) this._add(this.rcells, RESERVED[this.rn++]);
  },
  // true if any item of the map overlaps the box (x0..x1, z0..z1) and passes the filter
  hit(map, x0, z0, x1, z1, filter) {
    const S = this.S, st = ++this.stamp;
    for (let gx = Math.floor(x0 / S); gx <= Math.floor(x1 / S); gx++) for (let gz = Math.floor(z0 / S); gz <= Math.floor(z1 / S); gz++) {
      const a = map.get(gx * 65536 + gz); if (!a) continue;
      for (const q of a) { if (q._fs === st) continue; q._fs = st; if (q.x1 > x0 && q.x0 < x1 && q.z1 > z0 && q.z0 < z1 && (!filter || filter(q))) return true; }
    }
    return false;
  }
};
function isFree(x, z, r) {
  const b = WORLD.bounds;
  if (x < b.x0 + 2 || x > b.x1 - 2 || z < b.z0 + 2 || z > b.z1 - 2) return false;
  FREEGRID.sync();
  return !FREEGRID.hit(FREEGRID.rcells, x - r, z - r, x + r, z + r) && !FREEGRID.hit(FREEGRID.cells, x - r, z - r, x + r, z + r);
}
function scatter(W, n, r, fn, tries = 30) {
  let placed = 0;
  for (let i = 0; i < n * tries && placed < n; i++) {
    const b = WORLD.bounds, x = W.r(b.x0 + 3, b.x1 - 3), z = W.r(b.z0 + 3, b.z1 - 3);
    if (!isFree(x, z, r)) continue;
    fn(x, z); placed++;
  }
}
// decorative ring of trees / rocks just outside the play area
function outerRing(W, n, fn, inner = 4, outer = 26) {
  const b = WORLD.outerBounds || WORLD.bounds; n = Math.round(n * (WORLD.outerBounds ? 1.8 : 1));
  for (let i = 0; i < n; i++) {
    const side = Math.floor(W.rnd() * 4), d = W.r(inner, outer);
    let x, z;
    if (side === 0) { x = W.r(b.x0 - outer, b.x1 + outer); z = b.z0 - d; }
    else if (side === 1) { x = W.r(b.x0 - outer, b.x1 + outer); z = b.z1 + d; }
    else if (side === 2) { x = b.x0 - d; z = W.r(b.z0 - outer, b.z1 + outer); }
    else { x = b.x1 + d; z = W.r(b.z0 - outer, b.z1 + outer); }
    fn(x, z, d);
  }
}
function radioTower(W, x, z, h) {
  const steel = MATLIB.plain(0x8a2a22, { rough: 0.5, metal: 0.6 }), white = MATLIB.plain(0xd8d8d8, { rough: 0.5, metal: 0.6 });
  const legs = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  const levels = Math.round(h / 3);
  for (let i = 0; i < levels; i++) {
    const y0 = i * h / levels, y1 = (i + 1) * h / levels, w0 = 1.6 * (1 - y0 / h * 0.75), w1 = 1.6 * (1 - y1 / h * 0.75);
    const m = i % 2 ? steel : white;
    for (const [lx, lz] of legs) { const a = new THREE.Vector3(x + lx * w0, y0, z + lz * w0), b = new THREE.Vector3(x + lx * w1, y1, z + lz * w1); const g = new THREE.CylinderGeometry(0.06, 0.06, a.distanceTo(b), 5); g.translate(0, a.distanceTo(b) / 2, 0); const q = new THREE.Quaternion().setFromUnitVectors(WUP, b.clone().sub(a).normalize()); _wM.compose(a, q, _wS.set(1, 1, 1)); STATIC.add(g, m, _wM, { keepUV: true }); g.dispose(); }
    for (let k = 0; k < 4; k++) { const [ax, az] = legs[k], [bx, bz] = legs[(k + 1) % 4]; const a = new THREE.Vector3(x + ax * w0, y0, z + az * w0), b = new THREE.Vector3(x + bx * w1, y1, z + bz * w1); const g = new THREE.CylinderGeometry(0.035, 0.035, a.distanceTo(b), 4); g.translate(0, a.distanceTo(b) / 2, 0); const q = new THREE.Quaternion().setFromUnitVectors(WUP, b.clone().sub(a).normalize()); _wM.compose(a, q, _wS.set(1, 1, 1)); STATIC.add(g, m, _wM, { keepUV: true }); g.dispose(); }
  }
  const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.2, 0.3, 16), white); dish.position.set(x + 0.6, h * 0.7, z); dish.rotation.z = Math.PI / 2; scene.add(dish); mapObjects.push(dish);
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), MATLIB.emissive(0xff2020, 6)); beacon.position.set(x, h + 0.3, z); scene.add(beacon); mapObjects.push(beacon);
  mapAnimators.push((t) => { beacon.visible = (t % 1.6) < 0.8; });
  addCollider(x - 1.7, x + 1.7, 0, 3, z - 1.7, z + 1.7, { surface: 'metal' });
}
function trussBridge(W, x0, z0, x1, z1, width, deckY) {
  const steel = MATLIB.plain(0x4a5058, { rough: 0.45, metal: 0.7 }), deck = M_('concrete', { color: 0x8a8a8a });
  const alongX = Math.abs(x1 - x0) > Math.abs(z1 - z0), L = alongX ? Math.abs(x1 - x0) : Math.abs(z1 - z0), cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  W.box(cx, deckY - 0.4, cz, alongX ? L : width, 0.4, alongX ? width : L, deck, { nav: true });
  // ramps onto the deck
  for (let i = 1; i <= 3; i++) { const off = L / 2 + i * 0.9; for (const s of [-1, 1]) W.box(alongX ? cx + s * off : cx, 0, alongX ? cz : cz + s * off, alongX ? 0.9 : width, deckY - i * deckY / 4, alongX ? width : 0.9, deck); }
  const n = Math.round(L / 3);
  for (const side of [-1, 1]) {
    const ox = alongX ? 0 : side * width / 2, oz = alongX ? side * width / 2 : 0;
    for (let i = 0; i <= n; i++) { const t = -L / 2 + i * L / n; W.box(alongX ? cx + t : cx + ox, deckY, alongX ? cz + oz : cz + t, 0.25, 3.2, 0.25, steel, { collide: i === 0 || i === n, minimap: false }); }
    W.box(alongX ? cx : cx + ox, deckY + 3.2, alongX ? cz + oz : cz, alongX ? L : 0.3, 0.3, alongX ? 0.3 : L, steel, { collide: false });
    W.box(alongX ? cx : cx + ox, deckY, alongX ? cz + oz : cz, alongX ? L : 0.12, 1.0, alongX ? 0.12 : L, steel, { minimap: false, nav: false });
    for (let i = 0; i < n; i++) { const t = -L / 2 + (i + 0.5) * L / n; W.box(alongX ? cx + t : cx + ox, deckY + 0.2, alongX ? cz + oz : cz + t, alongX ? L / n * 1.15 : 0.12, 0.15, alongX ? 0.12 : L / n * 1.15, steel, { collide: false, rotZ: alongX ? (i % 2 ? 0.8 : -0.8) : 0, rotX: alongX ? 0 : (i % 2 ? 0.8 : -0.8) }); }
  }
}
function plankBridge(W, x0, z0, x1, z1, width) {
  const wood = M_('wood', { color: 0xa08868 });
  const alongX = Math.abs(x1 - x0) > Math.abs(z1 - z0), L = alongX ? Math.abs(x1 - x0) : Math.abs(z1 - z0), cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  W.box(cx, 0, cz, alongX ? L : width, 0.32, alongX ? width : L, wood, { nav: true, surface: 'wood' });
  for (const s of [-1, 1]) W.box(alongX ? cx : cx + s * width / 2, 0.32, alongX ? cz + s * width / 2 : cz, alongX ? L : 0.1, 0.9, alongX ? 0.1 : L, wood, { surface: 'wood', minimap: false, nav: false });
}
// River dug into the terrain as one continuous channel (it flows on under the bridges); movement is blocked
// between the bridges only. axis 'x' (runs along x at z = c) or 'z'. o: bankMat, bedMat, depth, bank.
function river(W, axis, c, w, from, to, gaps, color, flow, o = {}) {
  const ax = axis === 'x', bank = o.bank ?? 1.5, ob = WORLD.outerBounds, cb = WORLD.coreBounds;
  if (ob && cb) {
    // carry the river to the edges of the expanded map, with a plank bridge in each new stretch
    const lo = ax ? cb.x0 : cb.z0, hi = ax ? cb.x1 : cb.z1, olo = ax ? ob.x0 : ob.z0, ohi = ax ? ob.x1 : ob.z1;
    gaps = gaps.slice();
    if (from <= lo - 2) { from = olo - 8; const m = (olo + lo) / 2; gaps.push([m - 2, m + 2]); }
    if (to >= hi + 2) { to = ohi + 8; const m = (ohi + hi) / 2; gaps.push([m - 2, m + 2]); }
    for (const g of gaps) if ((g[0] < lo || g[1] > hi) && W.rnd) { const m = (g[0] + g[1]) / 2; if (ax) plankBridge(W, m, c - w / 2 - 1.6, m, c + w / 2 + 1.6, 3.6); else plankBridge(W, c - w / 2 - 1.6, m, c + w / 2 + 1.6, m, 3.6); }
  }
  W.channel(ax ? (from + to) / 2 : c, ax ? c : (from + to) / 2, to - from, w, axis, Object.assign({ color, flow, walk: true }, o));
  const pts = [from, ...gaps.flatMap(g => [g[0], g[1]]), to].sort((a, b) => a - b), half = w / 2 + bank * 0.8;
  for (let i = 0; i < pts.length; i += 2) {
    const a = pts[i], b = pts[i + 1]; if (b - a < 0.2) continue;
    if (ax) { addCollider(a, b, -2, 1.2, c - half, c + half, { shot: false, surface: 'water', minimap: false }); reserve(a, c - w / 2 - 1.8, b, c + w / 2 + 1.8); }
    else { addCollider(c - half, c + half, -2, 1.2, a, b, { shot: false, surface: 'water', minimap: false }); reserve(c - w / 2 - 1.8, a, c + w / 2 + 1.8, b); }
  }
  // rocks half-sunk on the banks
  const rm = o.rockMat || M_('rock', { color: 0x8a8a84 });
  for (let i = 0; i < Math.abs(to - from) / 5; i++) {
    const t = W.r(from, to); if (gaps.some(g => t > g[0] - 3 && t < g[1] + 3)) continue;
    const s = W.r(0.45, 1.1), side = W.rnd() < 0.5 ? -1 : 1, u = c + side * (w / 2 + W.r(0.1, bank * 0.6));
    if (ax) W.rock(t, u, s, rm, { y: -0.35, sy: 0.55 }); else W.rock(u, t, s, rm, { y: -0.35, sy: 0.55 });
  }
}
function stoneTower(W, x, z, s, h, mat, o = {}) {
  W.box(x, 0, z, s, h, s, mat);
  W.box(x, h, z, s + 0.6, 0.4, s + 0.6, mat, { collide: false });
  for (let i = 0; i < 4; i++) for (let k = -1; k <= 1; k += 2) { const a = i < 2; W.box(x + (a ? k * (s / 2) : (i === 2 ? -1 : 1) * (s / 2)), h + 0.4, z + (a ? (i === 0 ? -1 : 1) * (s / 2) : k * (s / 2)), 0.6, 0.7, 0.6, mat, { collide: false }); }
  for (let y = 2; y < h - 1; y += 3) for (const [dx, dz] of [[0, -s / 2 - 0.01], [0, s / 2 + 0.01], [-s / 2 - 0.01, 0], [s / 2 + 0.01, 0]]) W.box(x + dx, y, z + dz, dx ? 0.05 : 0.5, 0.9, dz ? 0.05 : 0.5, o.lit ? MATLIB.emissive(0xffb050, 2) : MATLIB.plain(0x141210), { collide: false });
}
function flagPole(W, x, z, h, color) {
  W.box(x, 0, z, 0.12, h, 0.12, MATLIB.plain(0x777777, { metal: 0.8, rough: 0.3 }));
  const tex = canvasTex('flag_' + color, 128, 80, (c) => { c.fillStyle = '#' + new THREE.Color(color).getHexString(); c.fillRect(0, 0, 128, 80); c.fillStyle = 'rgba(255,255,255,0.85)'; c.beginPath(); c.moveTo(64, 14); c.lineTo(84, 40); c.lineTo(64, 66); c.lineTo(44, 40); c.closePath(); c.fill(); c.fillStyle = '#' + new THREE.Color(color).getHexString(); c.beginPath(); c.arc(64, 40, 10, 0, 6.28); c.fill(); });
  const geo = new THREE.PlaneGeometry(2.6, 1.6, 16, 6); geo.translate(1.3, 0, 0);
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide, roughness: 0.9 }));
  m.position.set(x + 0.06, h - 0.9, z); m.castShadow = true; scene.add(m); mapObjects.push(m);
  const base = geo.attributes.position.array.slice();
  mapAnimators.push((t) => { const p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const bx = base[i * 3]; p.setZ(i, Math.sin(bx * 2.2 - t * 5) * 0.18 * bx / 2.6 + Math.sin(bx * 4 - t * 7.3) * 0.04 * bx); } p.needsUpdate = true; geo.computeVertexNormals(); });
}
function woodHut(W, x, z, w, d, rot) {
  const wood = M_('wood', { color: 0xb09878 }), roof = M_('wood', { color: 0x806850 });
  W.house(x, z, w, d, 2.8, { wall: wood, roof, doorSide: rot || 's', pitched: roof, windows: true });
}
// Broadleaf tree: trunk with a few limbs, crown built from crossed leaf-cluster cards around a dark core
function deciduous(W, x, z, h) {
  const bark = M_('bark'), core = M_('leaves', { color: 0x2e4020 }), leafM = foliageMaterial('leaf_cluster', 0xd8e4c8);
  const g1 = new THREE.CylinderGeometry(0.1, 0.26, h * 0.62, 7); _wM.makeTranslation(x, h * 0.31, z); STATIC.add(g1, bark, _wM); g1.dispose();
  const cy = h * 0.68, cr = h * 0.24;
  const cg = new THREE.IcosahedronGeometry(cr * 0.7, 1); _wM.makeTranslation(x, cy, z); STATIC.add(cg, core, _wM); cg.dispose();
  const n = 7 + Math.floor(W.rnd() * 4);
  for (let i = 0; i < n; i++) {
    const a = i / n * 6.283 + W.r(-0.3, 0.3), rr = cr * W.r(0.35, 0.8), px = x + Math.cos(a) * rr, pz = z + Math.sin(a) * rr, py = cy + W.r(-0.35, 0.45) * cr * 1.4;
    const s = cr * W.r(0.75, 1.05);
    for (const [rx, ry] of [[0, 0], [0, Math.PI / 2], [Math.PI / 2, 0]]) {
      const g = new THREE.PlaneGeometry(s * 2, s * 2); g.rotateX(rx); g.rotateY(ry + a);
      const nn = g.attributes.normal; for (let k = 0; k < nn.count; k++) nn.setXYZ(k, Math.cos(a) * 0.5, 0.86, Math.sin(a) * 0.5);
      _wM.makeTranslation(px, py, pz); STATIC.add(g, leafM, _wM, { keepUV: true }); g.dispose();
    }
  }
  addCollider(x - 0.3, x + 0.3, 0, h * 0.5, z - 0.3, z + 0.3, { surface: 'wood', minimap: false });
}

function outdoorCommon(W, o) {
  RESERVED.length = 0;
  W.ground(o.ground, { hills: true, hillMax: o.hillMax || 24, color: o.groundColor, kind: o.kind });
  if (o.pano) W.backdrop(o.pano, { tint: o.panoTint, repeat: o.panoRepeat || 3, rot: o.panoRot || 0 });
}

// 6 ─ DESERT VILLAGE (golden hour)
MAPS.push({
  name: 'DESERT VILLAGE', key: 'desert_village', group: 'outdoor', seed: 3101, theme: 'desert', camo: 'desert',
  desc: 'Adobe village at golden hour', bounds: { x0: -55, x1: 55, z0: -55, z1: 55 }, menuCam: { y: 16, r: 40 },
  expand: { lot: 34, road: 'dirt', roads: [['z', 0], ['x', 0]], weights: { cluster: 4, camp: 2, field: 2, checkpoint: 1, forest: 0.5 },
    house: (W, x, z, w, d, side) => W.house(x, z, w, d, W.r(3.2, 3.8), { wall: W.rnd() < 0.5 ? M_('adobe') : M_('facade_desert'), roof: M_('adobe'), doorSide: side, storeys: W.rnd() < 0.3 ? 2 : 1, parapet: true }),
    tree: (W, x, z) => { W.prop('palm', x, z, { size: W.r(7, 10), axis: 'h', collide: false }); addCollider(x - 0.3, x + 0.3, 0, 3, z - 0.3, z + 0.3, { surface: 'wood', minimap: false }); },
    rock: () => M_('mountain_rock', { color: 0xd8a070 }), wallMat: () => M_('adobe'), log: false },
  env: {
    fog: { color: 0xd8d2c6, density: 0.0028 }, hemi: [0xdfe6ee, 0x8c7c64, 0.72], sun: { color: 0xfff2e2, i: 2.5 }, sunDir: [-0.6, 0.62, -0.4],
    sky: { zenith: 0x3e6eae, horizon: 0xd9dcdc, ground: 0xb4a484, sunColor: 0xfff6e8, glow: 0.7, clouds: 0.45, cloudColor: 0xffffff },
    grade: { sat: 0.93, contrast: 1.06, tint: 0xfffbf6, vignette: 0.28 }, bloom: 0.3, bloomT: 1.3, exposure: 1.0, glare: 1.0, weather: 'dust', ambience: 'amb_desert', ambVol: 0.45
  },
  build(W, r) {
    outdoorCommon(W, { ground: 'sand', pano: 'pano_desert', panoTint: 0xffffff, groundColor: 0xd4c6aa, hillMax: 12 });
    const adobe = M_('adobe'), facade = M_('facade_desert'), dirt = 'dirt', rockM = M_('mountain_rock', { color: 0xd8a070 });
    W.patch(0, 0, 7, 112, dirt); W.patch(0, 0, 112, 7, dirt); W.patch(-28, 24, 6, 50, dirt, { rot: 0.3 });
    reserve(-3.5, -56, 3.5, 56); reserve(-56, -3.5, 56, 3.5);
    reserve(-6, 40, 6, 56); // player start
    // market square
    W.patch(14, -14, 14, 14, 'rose_clay');
    W.prop('tent', 10, -10, { size: 5, rot: 0.2, surface: 'wood' }); W.prop('tent', 18, -18, { size: 5, rot: 1.8, surface: 'wood' });
    crateStack(W, 14, -16, 3); barrelCluster(W, 19, -10, 3);
    // houses in each quadrant
    const quads = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
    for (const [qx, qz] of quads) {
      for (let k = 0; k < 14; k++) {
        const w = W.r(7, 11), d = W.r(6, 9), x = qx * W.r(8, 44), z = qz * W.r(8, 44);
        if (!isFree(x, z, Math.max(w, d) / 2 + 2.5)) continue;
        const side = Math.abs(x) < Math.abs(z) ? (x > 0 ? 'w' : 'e') : (z > 0 ? 'n' : 's');
        W.house(x, z, w, d, W.r(3.2, 3.8), { wall: r() < 0.5 ? adobe : facade, roof: adobe, doorSide: side, storeys: r() < 0.3 ? 2 : 1, parapet: true });
        reserve(x - w / 2 - 1, z - d / 2 - 1, x + w / 2 + 1, z + d / 2 + 1);
      }
    }
    // compound walls
    for (let i = 0; i < 7; i++) scatter(W, 1, 3, (x, z) => { const L = W.r(6, 12); if (r() < 0.5) W.wall(x - L / 2, z, x + L / 2, z, 1.7, 0.45, adobe, { openings: [{ at: L * W.r(0.3, 0.7), w: 2.2, h: 1.7 }] }); else W.wall(x, z - L / 2, x, z + L / 2, 1.7, 0.45, adobe, { openings: [{ at: L * W.r(0.3, 0.7), w: 2.2, h: 1.7 }] }); });
    // stone watchtowers
    stoneTower(W, -30, -32, 4, 10, M_('adobe', { color: 0xd8b890 })); stoneTower(W, 34, 30, 4.5, 11, M_('adobe', { color: 0xd8b890 }));
    // palms
    scatter(W, 22, 1.5, (x, z) => { W.prop('palm', x, z, { size: W.r(7, 10), axis: 'h', collide: false }); addCollider(x - 0.3, x + 0.3, 0, 3, z - 0.3, z + 0.3, { surface: 'wood', minimap: false }); });
    // rock formations
    for (const p of [[-48, -48], [48, -46], [-46, 44], [50, 12], [-50, 6]]) W.rock(p[0], p[1], W.r(3, 5), rockM, { sy: 1.4 });
    outerRing(W, 26, (x, z, d) => W.rock(x, z, W.r(4, 9), rockM, { sy: W.r(1.2, 2.6), collide: false }), 6, 40);
    // vehicles & cover
    W.prop('technical', -8, -20, { size: 5.6, rot: 1.2 }); W.prop('technical', 22, 12, { size: 5.6, rot: -0.6 }); W.prop('car_wreck', -20, 8, { size: 4.4, rot: 0.3 });
    scatter(W, 8, 2, (x, z) => W.prop('sandbags', x, z, { size: 3, rot: W.r(0, 3.14) }));
    scatter(W, 6, 2, (x, z) => crateStack(W, x, z, 2 + Math.floor(r() * 2), r() * 3));
    scatter(W, 6, 1.5, (x, z) => barrelCluster(W, x, z, 2));
    scatter(W, 3, 1.5, (x, z) => W.explosiveBarrel(x, z));
    dressCover(W, 16, { spawn: { x: 0, z: 48 }, kinds: ['box', 'box', 'table', 'wall', 'wall', 'door'], wallMat: [M_('adobe')], reserved: true });
    return { spawn: { x: 0, z: 48, yaw: 0 }, enemySpawns: [[-40, -48], [-15, -50], [15, -50], [40, -48], [-50, -20], [50, -20], [-50, 15], [50, 15], [0, -30], [-28, -10], [28, -10]] };
  }
});

// 7 ─ MISTY VALLEY
MAPS.push({
  name: 'MISTY VALLEY', key: 'misty_valley', group: 'outdoor', seed: 3202, theme: 'woodland', camo: 'woodland',
  desc: 'Pine forest camp along a mountain creek', bounds: { x0: -55, x1: 55, z0: -55, z1: 55 }, menuCam: { y: 12, r: 36 },
  expand: { lot: 34, road: 'gravel', roads: [['z', 0]], weights: { forest: 4, camp: 2, cluster: 2, field: 1 },
    house: (W, x, z, w, d, side) => (W.rnd() < 0.5 ? woodHut(W, x, z, Math.min(w, 7.5), Math.min(d, 7), side) : W.prop('cabin', x, z, { size: 8, rot: W.r(-0.4, 0.4) + (W.rnd() < 0.5 ? Math.PI / 2 : 0), surface: 'wood' })),
    tree: (W, x, z) => W.pine(x, z, W.r(8, 15)), rock: () => M_('greenstone'), wallMat: () => M_('cobble') },
  env: {
    fog: { color: 0xb8c8d0, density: 0.0085 }, hemi: [0xd0e2f0, 0x3a4a2a, 0.75], sun: { color: 0xfff0d8, i: 2.2 }, sunDir: [0.4, 0.72, -0.55], exposure: 1.02,
    sky: { zenith: 0x4a7ab8, horizon: 0xd2dfe8, ground: 0x4a5a40, clouds: 0.62, glow: 0.7 },
    grade: { sat: 0.95, contrast: 1.06, tint: 0xf8faf8, vignette: 0.3 }, bloom: 0.45, weather: 'fog', ambience: 'amb_snow', ambVol: 0.25
  },
  build(W, r) {
    outdoorCommon(W, { ground: 'grass', pano: 'pano_snow', panoTint: 0xf0f6f2, groundColor: 0x8a9a7c, hillMax: 30 });
    reserve(-6, 40, 6, 56);
    river(W, 'x', -6, 5, -60, 60, [[-26, -21], [14, 19]], 0x2a4a48, 1);
    plankBridge(W, -23.5, -10, -23.5, -2, 3.6); plankBridge(W, 16.5, -10, 16.5, -2, 3.6);
    W.patch(0, 24, 4, 60, 'gravel'); W.patch(-23.5, -30, 4, 40, 'dirt');
    // cabins and huts
    const cab = [[-30, 20], [-12, 30], [24, 26], [36, -24], [-34, -28]];
    for (const p of cab) { W.prop('cabin', p[0], p[1], { size: 8, rot: W.r(-0.4, 0.4) + (r() < 0.5 ? Math.PI / 2 : 0), surface: 'wood' }); reserve(p[0] - 5, p[1] - 5, p[0] + 5, p[1] + 5); }
    woodHut(W, 8, 14, 7, 6, 'w'); woodHut(W, -10, -24, 6, 6, 'n'); woodHut(W, 30, 6, 6, 7, 'w');
    W.prop('watchtower', -40, 4, { size: 10, axis: 'h', surface: 'wood', pad: 0.35 }); W.prop('watchtower', 42, 40, { size: 10, axis: 'h', surface: 'wood', pad: 0.35 });
    // fallen logs, rocks
    const bark = M_('bark');
    for (let i = 0; i < 8; i++) scatter(W, 1, 2, (x, z) => W.box(x, 0, z, W.r(3, 5), 0.6, 0.6, bark, { rot: W.r(0, 3.14), surface: 'wood' }));
    scatter(W, 18, 2, (x, z) => W.rock(x, z, W.r(0.8, 2.0), M_('greenstone'), { sy: 0.8 }));
    // camp props
    W.prop('tent', 2, 2, { size: 4.5, rot: 0.3, surface: 'wood' }); W.prop('tent', -6, 8, { size: 4.5, rot: -0.6, surface: 'wood' });
    W.prop('generator', 6, 6, { size: 2 }); crateStack(W, -2, 10, 3); barrelCluster(W, 12, 2, 2);
    scatter(W, 6, 2, (x, z) => crateStack(W, x, z, 2, r() * 3)); scatter(W, 4, 2, (x, z) => W.prop('sandbags', x, z, { size: 3, rot: W.r(0, 3) }));
    scatter(W, 3, 1.5, (x, z) => W.explosiveBarrel(x, z));
    // forest
    scatter(W, 70, 1.6, (x, z) => W.pine(x, z, W.r(8, 15)));
    outerRing(W, 120, (x, z) => W.pine(x, z, W.r(10, 20)), 2, 36);
    dressCover(W, 12, { spawn: { x: 0, z: 48 }, kinds: ['box', 'box', 'wall', 'table'], wallMat: [M_('greenstone'), M_('cobble')], reserved: true });
    return { spawn: { x: 0, z: 48, yaw: 0 }, enemySpawns: [[-40, -48], [-10, -50], [20, -50], [45, -45], [-50, -15], [50, -10], [-48, 30], [48, 20], [0, -35], [-30, -40]] };
  }
});

// 8 ─ MOONLIT COMPOUND (night)
MAPS.push({
  name: 'MOONLIT COMPOUND', key: 'moonlit_compound', group: 'outdoor', seed: 3303, theme: 'night', camo: 'night',
  desc: 'Night raid on a riverside mountain village', bounds: { x0: -55, x1: 55, z0: -55, z1: 55 }, menuCam: { y: 14, r: 38 },
  expand: { lot: 34, road: 'cobble', roads: [['z', 0]], night: true, lampColor: 0xffb060, weights: { cluster: 4, forest: 2, camp: 1, checkpoint: 1 },
    house: (W, x, z, w, d, side) => W.house(x, z, w, d, 3.2, { wall: M_('bark'), roof: M_('roof'), pitched: M_('roof'), doorSide: side, lit: W.rnd() < 0.7, storeys: W.rnd() < 0.25 ? 2 : 1 }),
    tree: (W, x, z) => W.pine(x, z, W.r(8, 13), { color: 0x3a5040 }), rock: () => M_('rock'), wallMat: () => M_('bark') },
  env: {
    fog: { color: 0x141a26, density: 0.011 }, hemi: [0x4c5566, 0x0c0d10, 0.46], sun: { color: 0xc6cfe0, i: 0.75 }, sunDir: [0.35, 0.6, -0.7], exposure: 1.25, night: true,
    // skyglow: the night sky is lighter at the horizon than at the zenith, so moonlit peaks stand against it instead of a black band
    sky: { zenith: 0x05070e, horizon: 0x4a5468, ground: 0x0a0c10, sunColor: 0xe6eaf2, glow: 0.3, clouds: 0.35, cloudColor: 0x3c4352, stars: 1.0, moon: true },
    grade: { sat: 0.8, contrast: 1.08, tint: 0xeef0f6, lift: 0x010102, vignette: 0.45 }, bloom: 0.7, bloomT: 0.85, weather: 'none', ambience: 'amb_snow', ambVol: 0.22, vmHemi: 0.5
  },
  build(W, r) {
    outdoorCommon(W, { ground: 'gravel2', kind: 'gravel', pano: 'pano_snow', panoTint: 0xa8b0be });
    reserve(-6, 40, 6, 56);
    river(W, 'x', 30, 8, -60, 60, [[-38, -33], [-4, 4]], 0x0e1a28, 1);
    // stone bridge
    const fort = M_('fortress');
    W.box(0, 0, 30, 8, 0.45, 12, fort, { nav: true }); W.box(-3.8, 0.45, 30, 0.4, 0.9, 12, fort, { minimap: false, nav: false }); W.box(3.8, 0.45, 30, 0.4, 0.9, 12, fort, { minimap: false, nav: false });
    plankBridge(W, -35.5, 25, -35.5, 35, 3.4);
    W.patch(0, 0, 6, 110, 'cobble'); W.patch(0, 6, 90, 5, 'cobble');
    reserve(-3, -56, 3, 56); reserve(-46, 3.5, 46, 8.5);
    // village houses
    const plaster = M_('bark'), brick = M_('bark'), roof = M_('roof');   // walls and pillars: bark
    for (let i = 0; i < 16; i++) scatter(W, 1, 6, (x, z) => {
      const w = W.r(7, 10), d = W.r(6, 8);
      W.house(x, z, w, d, 3.2, { wall: r() < 0.6 ? plaster : brick, roof, pitched: roof, doorSide: x > 0 ? 'w' : 'e', lit: r() < 0.7, storeys: r() < 0.25 ? 2 : 1 });
      reserve(x - w / 2 - 1.2, z - d / 2 - 1.2, x + w / 2 + 1.2, z + d / 2 + 1.2);
    });
    // watchtowers with sweeping searchlights
    W.prop('watchtower', -44, -40, { size: 11, axis: 'h', surface: 'wood', pad: 0.35 }); W.searchlight(-40, -36, 9, 0xe8f0ff);
    W.prop('watchtower', 44, -10, { size: 11, axis: 'h', surface: 'wood', pad: 0.35 }); W.searchlight(40, -6, 9, 0xe8f0ff);
    // street lamps
    const lamps = [[4, -40], [-4, -20], [4, 0], [-4, 16], [20, 10], [-20, 10], [4, 44]];
    for (const [x, z] of lamps) { W.box(x, 0, z, 0.15, 4.4, 0.15, MATLIB.plain(0x2a2a2a, { metal: 0.7 })); W.lamp(x, 4.5, z, 0xffb060, { fixture: 'bulb', real: true, intensity: 2.2, dist: 20, poolSize: 10, poolI: 0.4 }); }
    // trucks & cover
    W.prop('technical', 10, -22, { size: 5.6, rot: 0.3 }); W.prop('technical', -12, 20, { size: 5.6, rot: 2.6 }); W.prop('technical', 22, 18, { size: 5.6, rot: -1.2 }); W.prop('car_wreck', -16, -32, { size: 4.4, rot: 1.1 });
    scatter(W, 8, 2, (x, z) => crateStack(W, x, z, 2 + Math.floor(r() * 2), r() * 3)); scatter(W, 6, 2, (x, z) => W.prop('sandbags', x, z, { size: 3, rot: W.r(0, 3) }));
    scatter(W, 5, 1.5, (x, z) => barrelCluster(W, x, z, 2)); scatter(W, 3, 1.5, (x, z) => W.explosiveBarrel(x, z));
    scatter(W, 20, 2, (x, z) => W.pine(x, z, W.r(8, 13), { color: 0x3a5040 }));
    outerRing(W, 110, (x, z) => W.pine(x, z, W.r(10, 18), { color: 0x2a3a30 }), 2, 36);
    dressCover(W, 14, { spawn: { x: 0, z: 48 }, wallMat: [M_('brick'), M_('plaster', { color: 0xc8c0b0 })], reserved: true });
    return { spawn: { x: 0, z: 48, yaw: 0 }, enemySpawns: [[-40, -48], [-12, -50], [14, -50], [42, -48], [-50, -20], [50, -24], [-48, 14], [48, 16], [0, -28], [24, -36]] };
  }
});

// 9 ─ ALPINE FORTRESS (snow)
MAPS.push({
  name: 'ALPINE FORTRESS', key: 'alpine_fortress', group: 'outdoor', seed: 3404, theme: 'arctic', camo: 'arctic',
  desc: 'Snowbound fortress with radar station and river bridge', bounds: { x0: -55, x1: 55, z0: -55, z1: 55 }, menuCam: { y: 16, r: 40 },
  expand: { lot: 34, road: 'gravel', roads: [['z', 0]], weights: { camp: 3, forest: 3, checkpoint: 2, field: 2, cluster: 1 },
    house: (W, x, z, w, d, side) => W.house(x, z, w, d, 3.4, { wall: W.rnd() < 0.5 ? M_('concrete', { color: 0xc0c6cc }) : M_('fortress', { color: 0xd8dde4 }), roof: M_('concrete', { color: 0xd8dde4 }), doorSide: side, parapet: true, lit: W.rnd() < 0.4 }),
    tree: (W, x, z) => W.pine(x, z, W.r(9, 15), { snow: true }), rock: () => M_('rock', { color: 0xe8eef4 }), wallMat: () => M_('fortress', { color: 0xd8dde4 }) },
  env: {
    fog: { color: 0xb4c2d2, density: 0.006 }, hemi: [0xd0dcee, 0x4a5868, 0.62], sun: { color: 0xffe2c8, i: 1.9 }, sunDir: [-0.5, 0.38, -0.6], exposure: 0.8,
    sky: { zenith: 0x5a7aa4, horizon: 0xd0dae6, ground: 0xa8b4c2, clouds: 0.72, glow: 0.8, sunColor: 0xffe0c0 },
    grade: { sat: 0.92, contrast: 1.12, tint: 0xf4f6fa, vignette: 0.32 }, bloom: 0.35, weather: 'snow', ambience: 'amb_snow', ambVol: 0.5
  },
  build(W, r) {
    outdoorCommon(W, { ground: 'snow', pano: 'pano_snow', panoTint: 0xffffff, hillMax: 34 });
    reserve(-6, 40, 6, 56);
    const fort = M_('fortress', { color: 0xd8dde4 }), con = M_('concrete', { color: 0xc0c6cc });
    // icy river with a concrete bridge
    river(W, 'x', 34, 9, -60, 60, [[6, 14]], 0x4a6a7a, 0.6, { bankMat: M_('mountain_rock', { color: 0xa4a8ae }), bedMat: M_('gravel', { color: 0x5a5e62, wet: true }) });
    trussBridge(W, 10, 28.5, 10, 39.5, 6.5, 0.8);
    // fortress perimeter with gates
    const fx0 = -24, fx1 = 24, fz0 = -30, fz1 = 8;
    W.wall(fx0, fz0, fx1, fz0, 5, 1.2, fort, { openings: [{ at: 24, w: 5, h: 4 }] });
    W.wall(fx0, fz1, fx1, fz1, 5, 1.2, fort, { openings: [{ at: 14, w: 5, h: 4 }, { at: 36, w: 4, h: 3.5 }] });
    W.wall(fx0, fz0, fx0, fz1, 5, 1.2, fort, { openings: [{ at: 20, w: 4, h: 3.5 }] });
    W.wall(fx1, fz0, fx1, fz1, 5, 1.2, fort, { openings: [{ at: 14, w: 4, h: 3.5 }] });
    for (const [x, z] of [[fx0, fz0], [fx1, fz0], [fx0, fz1], [fx1, fz1]]) stoneTower(W, x, z, 3.4, 7.5, fort, { lit: true });
    reserve(fx0 - 1, fz0 - 1, fx1 + 1, fz1 + 1);
    // command building + radio mast
    W.house(-6, -14, 14, 9, 3.6, { wall: con, roof: con, doorSide: 's', storeys: 2, parapet: true, lit: true });
    radioTower(W, 14, -22, 20);
    W.prop('radar', 12, -6, { size: 7, axis: 'h', surface: 'metal' });
    // bunkers
    for (const [x, z] of [[-16, -2], [16, 2]]) { W.box(x, 0, z, 5, 2.2, 4, con); W.box(x, 1.4, z + 2.01, 3.2, 0.3, 0.05, MATLIB.plain(0x101010), { collide: false }); }
    crateStack(W, -18, -24, 3); crateStack(W, 2, 2, 2); barrelCluster(W, 18, -14, 3); W.prop('technical', -14, -8, { size: 5.6, rot: 1.6 });
    W.prop('generator', 8, -26, { size: 2.2 }); W.explosiveBarrel(-2, 4); W.explosiveBarrel(19, -27);
    // outside
    W.prop('watchtower', -40, 20, { size: 10, axis: 'h', surface: 'wood', pad: 0.35 }); W.prop('watchtower', 40, -40, { size: 10, axis: 'h', surface: 'wood', pad: 0.35 });
    W.prop('technical', 30, 18, { size: 5.6, rot: 0.4 }); W.prop('tent', -36, -40, { size: 5, rot: 0.6, surface: 'wood' });
    scatter(W, 8, 2, (x, z) => crateStack(W, x, z, 2, r() * 3)); scatter(W, 6, 2, (x, z) => W.prop('sandbags', x, z, { size: 3, rot: W.r(0, 3) }));
    scatter(W, 12, 2, (x, z) => W.rock(x, z, W.r(0.8, 2.2), M_('rock', { color: 0xe8eef4 }), { sy: 0.7 }));
    scatter(W, 3, 1.5, (x, z) => W.explosiveBarrel(x, z));
    scatter(W, 18, 1.6, (x, z) => { W.prop('pine_snow', x, z, { size: W.r(8, 12), axis: 'h', collide: false }); addCollider(x - 0.35, x + 0.35, 0, 4, z - 0.35, z + 0.35, { surface: 'wood', minimap: false }); });
    // distant ring: lightweight procedural snowy pines (the GLB pine is ~20K triangles each)
    outerRing(W, 90, (x, z) => W.pine(x, z, W.r(10, 17), { snow: true }), 2, 34);
    dressCover(W, 12, { spawn: { x: 0, z: 48 }, kinds: ['box', 'box', 'wall', 'wall', 'door'], wallMat: [M_('fortress', { color: 0xd8dde4 }), M_('concrete', { color: 0xc0c6cc })], reserved: true });
    return { spawn: { x: 0, z: 48, yaw: 0 }, enemySpawns: [[-40, -48], [-10, -50], [20, -50], [45, -45], [-48, -20], [48, -20], [-46, 12], [46, 14], [0, -20], [-14, -26], [16, -12]] };
  }
});

// 10 ─ FORTIFIED VALLEY (sunrise)
MAPS.push({
  name: 'FORTIFIED VALLEY', key: 'fortified_valley', group: 'outdoor', seed: 3505, theme: 'woodland', camo: 'woodland',
  desc: 'Stone fort above a lake at sunrise', bounds: { x0: -55, x1: 42, z0: -55, z1: 55 }, menuCam: { y: 16, r: 42 },
  expandBounds: { x0: -175, x1: 42, z0: -123, z1: 123 },
  expand: { lot: 34, road: 'dirt', roads: [['z', -8]], weights: { cluster: 2, field: 3, forest: 3, camp: 2 },
    house: (W, x, z, w, d, side) => W.house(x, z, w, d, 3.4, { wall: M_('fortress', { color: 0xc8b8a0 }), roof: M_('roof'), pitched: M_('roof'), doorSide: side }),
    tree: (W, x, z) => (W.rnd() < 0.5 ? deciduous(W, x, z, W.r(6, 10)) : W.pine(x, z, W.r(8, 13), { color: 0x5a7040 })), rock: () => M_('rock'), wallMat: () => M_('cobble') },
  env: {
    fog: { color: 0xe2d2c4, density: 0.0055 }, hemi: [0xeee6de, 0x4a4836, 0.66], sun: { color: 0xffd6b0, i: 2.4 }, sunDir: [0.86, 0.32, 0.22], exposure: 1.02,
    sky: { zenith: 0x4a70a8, horizon: 0xeed2bc, ground: 0x6a6048, sunColor: 0xffd0a0, glow: 0.9, clouds: 0.5, cloudColor: 0xfff0e4 },
    grade: { sat: 0.95, contrast: 1.06, tint: 0xfff8f2, vignette: 0.3 }, bloom: 0.5, glare: 1.1, weather: 'none', ambience: 'amb_desert', ambVol: 0.25
  },
  build(W, r) {
    outdoorCommon(W, { ground: 'grass', pano: 'pano_snow', panoTint: 0xffeadc, groundColor: 0x9a9878, hillMax: 26 });
    reserve(-6, 40, 6, 56);
    const fort = M_('fortress', { color: 0xc8b8a0 }), stone = M_('cobble');
    // lake on the east
    W.channel(70, 0, 300, 56, 'z', { color: 0x3a5a6a, walk: true, depth: 2.4, bank: 2.6, surf: -0.5 });
    addCollider(42, 100, -1, 2, -150, 150, { shot: false, surface: 'water', minimap: false });
    for (let z = -120; z <= 120; z += 7) W.rock(W.r(40, 44), z + W.r(-2, 2), W.r(1, 2.2), M_('rock'));
    // dirt road
    W.patch(-8, 0, 6, 110, 'dirt'); W.patch(10, -18, 40, 6, 'dirt', { rot: 0.2 }); reserve(-11, -56, -5, 56);
    // the fort
    const cx = -32, cz = -14, s = 30;
    W.wall(cx - s / 2, cz - s / 2, cx + s / 2, cz - s / 2, 4.6, 1.2, fort); W.wall(cx - s / 2, cz + s / 2, cx + s / 2, cz + s / 2, 4.6, 1.2, fort, { openings: [{ at: s / 2, w: 5, h: 4 }] });
    W.wall(cx - s / 2, cz - s / 2, cx - s / 2, cz + s / 2, 4.6, 1.2, fort); W.wall(cx + s / 2, cz - s / 2, cx + s / 2, cz + s / 2, 4.6, 1.2, fort, { openings: [{ at: s / 2, w: 5, h: 4 }] });
    for (const [x, z] of [[cx - s / 2, cz - s / 2], [cx + s / 2, cz - s / 2], [cx - s / 2, cz + s / 2], [cx + s / 2, cz + s / 2]]) stoneTower(W, x, z, 4.6, 8, fort);
    stoneTower(W, cx - 6, cz - 6, 5.5, 13, fort); flagPole(W, cx - 6, cz - 6 + 2, 13 + 4.5, 0x1a2a4a);
    W.house(cx + 5, cz + 5, 9, 7, 3.4, { wall: fort, roof: M_('roof'), pitched: M_('roof'), doorSide: 'e' });
    reserve(cx - s / 2 - 1, cz - s / 2 - 1, cx + s / 2 + 1, cz + s / 2 + 1);
    crateStack(W, cx + 8, cz - 8, 3); barrelCluster(W, cx - 8, cz + 8, 3); W.prop('sandbags', cx + 10, cz + 1, { size: 3, rot: 1.57 }); W.explosiveBarrel(cx + 2, cz - 10);
    // outer stone walls & sandbag lines
    for (let i = 0; i < 6; i++) scatter(W, 1, 3, (x, z) => { const L = W.r(6, 12); W.wall(x - L / 2, z, x + L / 2, z, 1.4, 0.6, stone, { openings: [{ at: L * 0.5, w: 2.2, h: 1.4 }] }); });
    scatter(W, 10, 2, (x, z) => W.prop('sandbags', x, z, { size: 3, rot: W.r(0, 3) }));
    // trucks, tents, crates
    W.prop('technical', 6, -30, { size: 5.6, rot: 0.6 }); W.prop('technical', 20, 10, { size: 5.6, rot: -1.0 }); W.prop('technical', -12, 30, { size: 5.6, rot: 1.5 });
    W.prop('tent', 18, -6, { size: 5, rot: 0.3, surface: 'wood' }); W.prop('tent', 26, 24, { size: 5, rot: -0.5, surface: 'wood' });
    scatter(W, 7, 2, (x, z) => crateStack(W, x, z, 2 + Math.floor(r() * 2), r() * 3)); scatter(W, 5, 1.5, (x, z) => barrelCluster(W, x, z, 2));
    scatter(W, 3, 1.5, (x, z) => W.explosiveBarrel(x, z));
    scatter(W, 14, 2, (x, z) => W.rock(x, z, W.r(0.8, 2), M_('rock'), { sy: 0.8 }));
    scatter(W, 28, 2, (x, z) => (r() < 0.5 ? deciduous(W, x, z, W.r(6, 10)) : W.pine(x, z, W.r(8, 13), { color: 0x5a7040 })));
    outerRing(W, 90, (x, z) => { if (x > 42) return; (W.rnd() < 0.5 ? deciduous(W, x, z, W.r(8, 12)) : W.pine(x, z, W.r(10, 17), { color: 0x4a6038 })); }, 2, 34);
    dressCover(W, 12, { spawn: { x: 0, z: 48 }, kinds: ['box', 'wall', 'wall', 'table'], wallMat: [M_('cobble'), M_('fortress', { color: 0xc8b8a0 })], reserved: true });
    return { spawn: { x: 0, z: 48, yaw: 0 }, enemySpawns: [[-45, -48], [-20, -50], [10, -50], [35, -45], [-50, -10], [-30, -14], [36, 0], [-48, 20], [30, 20], [0, -30]] };
  }
});

// 11 ─ RIVER DELTA
MAPS.push({
  name: 'RIVER DELTA', key: 'river_delta', group: 'outdoor', seed: 3606, theme: 'woodland', camo: 'woodland',
  desc: 'Alpine river delta with islands, bridges and a radio mast', bounds: { x0: -55, x1: 55, z0: -55, z1: 55 }, menuCam: { y: 14, r: 40 },
  expand: { lot: 34, road: 'dirt', roads: [], weights: { forest: 3, cluster: 2, camp: 2, field: 1 },
    house: (W, x, z, w, d, side) => (W.rnd() < 0.5 ? woodHut(W, x, z, Math.min(w, 7), Math.min(d, 7), side) : W.prop('cabin', x, z, { size: 8, rot: W.r(-0.4, 0.4), surface: 'wood' })),
    tree: (W, x, z) => W.pine(x, z, W.r(8, 15)), rock: () => M_('rock'), wallMat: () => M_('cobble') },
  env: {
    fog: { color: 0xb4c2cc, density: 0.0065 }, hemi: [0xd2dce6, 0x434a3a, 0.72], sun: { color: 0xfff4e6, i: 2.3 }, sunDir: [-0.4, 0.75, -0.42], exposure: 1.0,
    sky: { zenith: 0x4672ac, horizon: 0xd2dce4, ground: 0x4a5444, clouds: 0.55, glow: 0.6 },
    grade: { sat: 0.93, contrast: 1.06, tint: 0xf8fafc, vignette: 0.3 }, bloom: 0.45, weather: 'none', ambience: 'amb_snow', ambVol: 0.3
  },
  build(W, r) {
    outdoorCommon(W, { ground: 'grass', pano: 'pano_snow', panoTint: 0xf4f8ff, groundColor: 0x8c9a7e, hillMax: 28 });
    reserve(-6, 40, 6, 56);
    // main channel along z at x=8, branch along x at z=-20 (west side)
    river(W, 'z', 8, 10, -60, 60, [[6, 14], [-44, -38]], 0x2a5058, 1.4);
    river(W, 'x', -20, 7, -60, 2.5, [[-33, -27], [-13, -7]], 0x2a5058, 1.0);
    trussBridge(W, 1.5, 10, 14.5, 10, 6, 0.9);
    plankBridge(W, 2.5, -41, 13.5, -41, 3.4);
    plankBridge(W, -30, -24.5, -30, -15.5, 3.4); plankBridge(W, -10, -24.5, -10, -15.5, 3.4);
    // waterfall at the north edge
    const fall = new THREE.Mesh(new THREE.PlaneGeometry(14, 22, 1, 1), waterMaterial(0xd8eef4, 3)); fall.position.set(8, 10, -70); scene.add(fall); mapObjects.push(fall);
    W.rock(1, -68, 6, M_('mountain_rock'), { sy: 2.2, collide: false }); W.rock(16, -68, 6, M_('mountain_rock'), { sy: 2.2, collide: false });
    mapAnimators.push((t) => { if (Math.random() < 0.3) { const s = fxSprite('smoke', 0xffffff, 3, new THREE.Vector3(8 + rand(-5, 5), 1, -60), { opacity: 0.3 }); addParticle(s, 3, 'smoke', { vel: new THREE.Vector3(0, 1.2, 1.5), grow: 0.6, op: 0.3, real: true }); } });
    // cabins on the land regions
    const cab = [[-34, -40], [-12, -36], [30, -30], [36, 24], [-30, 18], [-14, 30]];
    for (const p of cab) { if (!isFree(p[0], p[1], 5)) continue; W.prop('cabin', p[0], p[1], { size: 8, rot: W.r(-0.4, 0.4) + (r() < 0.5 ? Math.PI / 2 : 0), surface: 'wood' }); reserve(p[0] - 5, p[1] - 5, p[0] + 5, p[1] + 5); }
    woodHut(W, 26, 4, 6, 6, 'w'); woodHut(W, -40, -2, 6, 7, 'e');
    // docks
    const wood = M_('wood', { color: 0xa08868 });
    W.box(1.5, 0, -10, 3, 0.3, 4, wood, { surface: 'wood' }); W.box(14.5, 0, 22, 3, 0.3, 4, wood, { surface: 'wood' });
    radioTower(W, 40, -44, 20);
    W.prop('watchtower', 30, -12, { size: 10, axis: 'h', surface: 'wood', pad: 0.35 }); W.prop('watchtower', -46, 34, { size: 10, axis: 'h', surface: 'wood', pad: 0.35 });
    W.prop('technical', 24, 36, { size: 5.6, rot: 0.6 }); W.prop('generator', 38, -38, { size: 2.2 });
    scatter(W, 7, 2, (x, z) => crateStack(W, x, z, 2 + Math.floor(r() * 2), r() * 3)); scatter(W, 6, 2, (x, z) => W.prop('sandbags', x, z, { size: 3, rot: W.r(0, 3) }));
    scatter(W, 5, 1.5, (x, z) => barrelCluster(W, x, z, 2)); scatter(W, 3, 1.5, (x, z) => W.explosiveBarrel(x, z));
    scatter(W, 16, 2, (x, z) => W.rock(x, z, W.r(0.8, 2.2), M_('rock'), { sy: 0.8 }));
    scatter(W, 55, 1.6, (x, z) => W.pine(x, z, W.r(8, 15)));
    outerRing(W, 120, (x, z) => W.pine(x, z, W.r(10, 19)), 2, 36);
    dressCover(W, 12, { spawn: { x: -2, z: 48 }, kinds: ['box', 'box', 'wall', 'table'], wallMat: [M_('cobble')], reserved: true });
    return { spawn: { x: -2, z: 48, yaw: 0 }, enemySpawns: [[-40, -48], [-20, -48], [30, -48], [45, -20], [-48, -30], [48, 10], [-48, 10], [30, 30], [-20, -40], [24, -36]] };
  }
});
