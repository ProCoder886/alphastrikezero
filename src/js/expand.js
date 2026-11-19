// ---------- Map expansion: every location is ~5x its original playable area ----------
// The original layout stays untouched in the middle (the "core"); the new outer ring is built from the same kit,
// materials and props: indoor maps get annex wings of rooms (or more parking halls) joined to the core through
// doorways cut into its outer walls, outdoor maps (and the hangar's airfield) get villages, camps, forests and
// fields on lots around the core, with roads and rivers carried through to the new edges.
const EXPAND_K = Math.sqrt(5);
function expandedBounds(M) {
  if (M.expandBounds) return Object.assign({}, M.expandBounds);
  const b = M.bounds, cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2, hx = (b.x1 - b.x0) / 2 * EXPAND_K, hz = (b.z1 - b.z0) / 2 * EXPAND_K;
  return { x0: Math.round(cx - hx), x1: Math.round(cx + hx), z0: Math.round(cz - hz), z1: Math.round(cz + hz) };
}
const _inRect = (x, z, r, m = 0) => x > r.x0 - m && x < r.x1 + m && z > r.z0 - m && z < r.z1 + m;
const _rectsOverlap = (a, b, m = 0) => a.x0 < b.x1 + m && a.x1 > b.x0 - m && a.z0 < b.z1 + m && a.z1 > b.z0 - m;

function expandMap(W, M, core, info) {
  const st = M.expand || {};
  const outer = WORLD.bounds;
  const spawns = info.enemySpawns || (info.enemySpawns = []);
  if (st.style === 'annex' || st.style === 'garage') buildAnnex(W, core, outer, st, spawns);
  else buildOutskirts(W, core, outer, st, spawns);
}

// ===================== indoor: annex wings =====================
function buildAnnex(W, core, outer, st, spawns) {
  const H = st.H || 4, C = st.cell || 14;
  const wallM = st.wall(), ceilM = st.ceil ? st.ceil() : M_('concrete', { color: 0xa8a8a6 }), beamM = st.beam ? st.beam() : M_('concrete', { color: 0x8a8a88 });
  // grid lines include the core edges, so annex rooms close exactly against the core's outer walls
  const breaks = (o0, c0, c1, o1) => {
    const seg = (a, b) => { const n = Math.max(1, Math.round((b - a) / C)); return Array.from({ length: n }, (_, k) => a + (b - a) * k / n); };
    return [...seg(o0, c0), ...seg(c0, c1), ...seg(c1, o1), o1];
  };
  const XB = breaks(outer.x0, core.x0, core.x1, outer.x1), ZB = breaks(outer.z0, core.z0, core.z1, outer.z1);
  const nx = XB.length - 1, nz = ZB.length - 1;
  const cells = [];
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const r = { x0: XB[i], x1: XB[i + 1], z0: ZB[j], z1: ZB[j + 1] };
    const inCore = r.x0 >= core.x0 - 0.01 && r.x1 <= core.x1 + 0.01 && r.z0 >= core.z0 - 0.01 && r.z1 <= core.z1 + 0.01;
    cells.push({ i, j, r, cx: (r.x0 + r.x1) / 2, cz: (r.z0 + r.z1) / 2, w: r.x1 - r.x0, d: r.z1 - r.z0, core: inCore });
  }
  const at = (i, j) => (i < 0 || j < 0 || i >= nx || j >= nz) ? null : cells[j * nx + i];
  const ann = cells.filter(c => !c.core);
  // outer walls of the whole complex
  W.wall(outer.x0, outer.z0, outer.x1, outer.z0, H, 0.6, wallM, { noAuto: true }); W.wall(outer.x0, outer.z1, outer.x1, outer.z1, H, 0.6, wallM, { noAuto: true });
  W.wall(outer.x0, outer.z0, outer.x0, outer.z1, H, 0.6, wallM, { noAuto: true }); W.wall(outer.x1, outer.z0, outer.x1, outer.z1, H, 0.6, wallM, { noAuto: true });
  const lampC = st.lamp || 0xd8ecff, sod = st.lamp2 || lampC;
  if (st.style === 'garage') {
    // more parking halls: open floor, pillar grid, cars, barriers, fires; one ceiling slab per band
    for (const r of [{ x0: outer.x0, x1: outer.x1, z0: outer.z0, z1: core.z0 }, { x0: outer.x0, x1: outer.x1, z0: core.z1, z1: outer.z1 }, { x0: outer.x0, x1: core.x0, z0: core.z0, z1: core.z1 }, { x0: core.x1, x1: outer.x1, z0: core.z0, z1: core.z1 }])
      W.box((r.x0 + r.x1) / 2, H, (r.z0 + r.z1) / 2, r.x1 - r.x0 + 0.6, 0.4, r.z1 - r.z0 + 0.6, ceilM, { nav: false, minimap: false });
    for (let x = outer.x0 + 6; x < outer.x1 - 3; x += 8) for (let z = outer.z0 + 6; z < outer.z1 - 3; z += 9) {
      if (_inRect(x, z, core, 2)) continue;
      W.pillar(x, z, 0.7, H, beamM); W.box(x, 0, z, 0.74, 0.5, 0.74, MATLIB.plain(0xe0b020, { rough: 0.6 }), { collide: false });
      W.lamp(x + 4, H - 0.08, z + 4.5, W.rnd() < 0.35 ? lampC : sod, { fixture: 'tube', len: 1.2, poolSize: 7, poolI: 0.3, real: W.rnd() < 0.12, intensity: 1.3, dist: 14, flicker: W.rnd() < 0.1 ? 'broken' : null });
      const rr = W.rnd();
      if (rr < 0.32) W.prop('car_wreck', x + 3, z + W.r(-2, 2), { size: 4.4, rot: Math.PI / 2 + W.r(-0.2, 0.2), surface: 'metal' });
      else if (rr < 0.42) W.prop('barrier', x + W.r(2, 5), z + W.r(-3, 3), { size: 2.4, rot: W.r(0, 3), surface: 'concrete' });
      else if (rr < 0.5) crateStack(W, x + 3, z + 3, 2 + Math.floor(W.rnd() * 2));
      else if (rr < 0.55) W.fireDrum(x + 2.5, z - 2.5);
      else if (rr < 0.6) barrelCluster(W, x + 3, z - 3, 2);
    }
    for (let k = 0; k < 4; k++) { const c = ann[Math.floor(W.rnd() * ann.length)]; W.fire(c.cx + W.r(-3, 3), 0.55, c.cz + W.r(-3, 3), 1.1); }
    for (const c of ann) if (W.rnd() < 0.5) spawns.push([c.cx, c.cz]);
    for (const c of ann) annexCover(W, c, 1 + Math.floor(W.rnd() * 2), st);
    return;
  }
  // rooms: spanning tree over the annex cells (plus loops) decides which shared walls get doorways
  const key = (a, b) => a < b ? a + '|' + b : b + '|' + a, open = new Set();
  const id = (c) => c.j * nx + c.i;
  const start = ann[0], seen = new Set([id(start)]), stack = [start];
  while (stack.length) {
    const c = stack[stack.length - 1];
    const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dz]) => at(c.i + dx, c.j + dz)).filter(n => n && !n.core && !seen.has(id(n)));
    if (!nb.length) { stack.pop(); continue; }
    const n = nb[Math.floor(W.rnd() * nb.length)]; open.add(key(id(c), id(n))); seen.add(id(n)); stack.push(n);
  }
  for (const c of ann) for (const [dx, dz] of [[1, 0], [0, 1]]) { const n = at(c.i + dx, c.j + dz); if (n && !n.core && W.rnd() < 0.55) open.add(key(id(c), id(n))); }
  const dh = Math.min(2.8, H - 0.5), door = (len) => ({ at: len / 2 + W.r(-len * 0.22, len * 0.22), w: W.rnd() < 0.3 ? 4.2 : 2.6, h: dh });
  for (const c of ann) {
    // east and south walls of each cell (shared with the neighbour); the outer boundary is already walled
    const e = at(c.i + 1, c.j), s = at(c.i, c.j + 1);
    if (e && !e.core) W.wall(c.r.x1, c.r.z0, c.r.x1, c.r.z1, H, 0.4, wallM, { noAuto: true, openings: open.has(key(id(c), id(e))) ? [door(c.d)] : [] });
    if (s && !s.core) W.wall(c.r.x0, c.r.z1, c.r.x1, c.r.z1, H, 0.4, wallM, { noAuto: true, openings: open.has(key(id(c), id(s))) ? [door(c.w)] : [] });
    // ceiling slab + beam
    W.box(c.cx, H, c.cz, c.w + 0.5, 0.4, c.d + 0.5, ceilM, { nav: false, minimap: false });
    W.box(c.cx, H - 0.3, c.cz, 0.35, 0.3, c.d - 0.4, beamM, { collide: false, minimap: false, nav: false });
    // lights
    const real = W.rnd() < 0.3;
    W.lamp(c.cx + (st.lampOff || 0), H - 0.1, c.cz - c.d * 0.22, lampC, { fixture: st.fixture || 'tube', real, intensity: 1.4, dist: 15, poolSize: 8, poolI: 0.3, flicker: W.rnd() < 0.12 ? 'broken' : null });
    W.lamp(c.cx, H - 0.1, c.cz + c.d * 0.22, sod, { fixture: st.fixture || 'tube', poolSize: 7, poolI: 0.26 });
    annexRoom(W, c, c.w, c.d, H, st);
    if (W.rnd() < 0.6) spawns.push([c.cx + W.r(-c.w * 0.25, c.w * 0.25), c.cz + W.r(-c.d * 0.25, c.d * 0.25)]);
  }
}
// what fills an annex room: storage, machines, barracks, office, a pillared hall or a bare corridor
function annexRoom(W, c, cw, cd, H, st) {
  const x = c.cx, z = c.cz, k = W.rnd(), m = Math.min(cw, cd);
  const metal = MATLIB.get('metal', { color: 0x8a9098 });
  if (k < 0.22) { // storage
    crateStack(W, x - cw * 0.25, z - cd * 0.25, 2 + Math.floor(W.rnd() * 3), W.r(0, 3)); crateStack(W, x + cw * 0.22, z + cd * 0.2, 2 + Math.floor(W.rnd() * 2));
    barrelCluster(W, x + cw * 0.25, z - cd * 0.22, 2 + Math.floor(W.rnd() * 2)); if (W.rnd() < 0.4) W.explosiveBarrel(x - cw * 0.2, z + cd * 0.25);
    for (let i = 0; i < 3; i++) W.box(x - cw * 0.42, 0, z - cd * 0.3 + i * 1.3, 0.8, 2.2, 1.1, metal, { surface: 'metal' });
  } else if (k < 0.38) { // machine room
    W.prop('generator', x - cw * 0.2, z - cd * 0.15, { size: 2.4, rot: W.r(0, 3) }); W.prop('water_tank', x + cw * 0.22, z + cd * 0.15, { size: 3.0, axis: 'h' });
    barrelCluster(W, x + cw * 0.25, z - cd * 0.28, 2); W.box(x - cw * 0.1, 0, z + cd * 0.3, 3.2, 1.1, 0.8, M_('concrete', { color: 0x9a9a98 }));
  } else if (k < 0.52) { // barracks: bunk beds along one wall
    for (let i = 0; i < 3; i++) { const bx = x - cw * 0.3 + i * 2.6; W.box(bx, 0, z - cd * 0.36, 2.0, 0.6, 1.0, metal); W.box(bx, 1.4, z - cd * 0.36, 2.0, 0.15, 1.0, metal); }
    W.coverTable(x + W.r(-1, 1), z + cd * 0.12, W.r(0, 3)); W.woodBox(x + cw * 0.3, z + cd * 0.28, 0.7, W.r(0, 3), 2);
  } else if (k < 0.68) { // office: desks knocked over as cover
    W.coverTable(x - cw * 0.2, z - cd * 0.1, W.r(0, 6.28)); W.coverTable(x + cw * 0.22, z + cd * 0.15, W.r(0, 6.28));
    W.chair(x, z + cd * 0.3, W.r(0, 6.28), true); W.metalDoor(x + cw * 0.28, z - cd * 0.28, W.r(0, 6.28));
  } else if (k < 0.82 && m > 11) { // pillared hall with low walls
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) W.pillar(x + dx * cw * 0.22, z + dz * cd * 0.22, 0.8, H, st.pillar ? st.pillar() : M_('concrete', { color: 0x9a9a98 }));
    W.lowWall(x, z, 3.2, W.rnd() < 0.5 ? 0 : Math.PI / 2, st.coverWall ? st.coverWall() : null);
  } else { // corridor-like room with scattered cover
    W.woodBox(x + W.r(-2, 2), z + W.r(-2, 2), 0.75, W.r(0, 3), 1 + Math.floor(W.rnd() * 2));
    W.lowWall(x + W.r(-3, 3), z + W.r(-3, 3), 2.8, W.r(0, 3.14), st.coverWall ? st.coverWall() : null);
    if (W.rnd() < 0.4) barrelCluster(W, x + cw * 0.3, z + cd * 0.3, 2);
  }
}
function annexCover(W, c, n, st) {
  for (let i = 0; i < n; i++) {
    const x = c.cx + W.r(-4, 4), z = c.cz + W.r(-4, 4), k = W.rnd();
    if (k < 0.35) W.woodBox(x, z, 0.75, W.r(0, 3), 1 + Math.floor(W.rnd() * 2));
    else if (k < 0.6) W.lowWall(x, z, 2.8, W.r(0, 3.14), st.coverWall ? st.coverWall() : null);
    else if (k < 0.8) W.metalDoor(x, z, W.r(0, 6.28));
    else W.coverTable(x, z, W.r(0, 6.28));
  }
}

// ===================== outdoor: outskirts =====================
// st: { house(W, x, z, w, d, side), tree(W, x, z), rock, road, roads: [['z', x] | ['x', z]], night, weights: {cluster, camp, forest, field, checkpoint}, wallMat, lampColor }
function buildOutskirts(W, core, outer, st, spawns) {
  const LOT = st.lot || 34, w = st.weights || { cluster: 3, camp: 2, forest: 2, field: 2, checkpoint: 1 };
  // roads carried from the core to the new edges
  for (const [ax, c] of st.roads || []) {
    if (ax === 'z') { for (const [a, b] of [[outer.z0, core.z0], [core.z1, outer.z1]]) { W.patch(c, (a + b) / 2, st.roadW || 6, b - a, st.road || 'dirt'); reserve(c - 3.5, a, c + 3.5, b); } }
    else { for (const [a, b] of [[outer.x0, core.x0], [core.x1, outer.x1]]) { W.patch((a + b) / 2, c, b - a, st.roadW || 6, st.road || 'dirt'); reserve(a, c - 3.5, b, c + 3.5); } }
  }
  // lots on a grid whose lines include the core edges (thin rings still get full rows of lots)
  const seg = (a, b) => { const n = Math.max(1, Math.round((b - a) / LOT)); return Array.from({ length: n }, (_, k) => a + (b - a) * k / n); };
  const XB = [...seg(outer.x0 + 2, core.x0 - 2), ...seg(core.x0 - 2, core.x1 + 2), ...seg(core.x1 + 2, outer.x1 - 2), outer.x1 - 2];
  const ZB = [...seg(outer.z0 + 2, core.z0 - 2), ...seg(core.z0 - 2, core.z1 + 2), ...seg(core.z1 + 2, outer.z1 - 2), outer.z1 - 2];
  const lots = [];
  for (let i = 0; i < XB.length - 1; i++) for (let j = 0; j < ZB.length - 1; j++) {
    const r = { x0: XB[i], x1: XB[i + 1], z0: ZB[j], z1: ZB[j + 1] };
    if (r.x0 >= core.x0 - 2.1 && r.x1 <= core.x1 + 2.1 && r.z0 >= core.z0 - 2.1 && r.z1 <= core.z1 + 2.1) continue;
    if (r.x1 - r.x0 < 10 || r.z1 - r.z0 < 10) continue;
    lots.push({ r, cx: (r.x0 + r.x1) / 2, cz: (r.z0 + r.z1) / 2, size: Math.min(r.x1 - r.x0, r.z1 - r.z0) });
  }
  const kinds = Object.keys(w), tot = kinds.reduce((a, k) => a + w[k], 0);
  const pick = () => { let v = W.rnd() * tot; for (const k of kinds) { v -= w[k]; if (v <= 0) return k; } return kinds[0]; };
  for (const L of lots) {
    const kind = pick();
    ({ cluster: lotCluster, camp: lotCamp, forest: lotForest, field: lotField, checkpoint: lotCheckpoint }[kind] || lotField)(W, L, st);
    // a few trees and rocks everywhere so no lot is bare
    for (let i = 0; i < (kind === 'forest' ? 0 : 3); i++) { const x = W.r(L.r.x0 + 2, L.r.x1 - 2), z = W.r(L.r.z0 + 2, L.r.z1 - 2); if (isFree(x, z, 2)) st.tree(W, x, z); }
    const sp = NAV_SAFE(L.cx, L.cz); if (sp) spawns.push(sp);
  }
}
const NAV_SAFE = (x, z) => isFree(x, z, 1.5) ? [x, z] : (isFree(x + 4, z + 4, 1.5) ? [x + 4, z + 4] : null);
function lotSpot(W, L, r, tries = 18, m = 4) {
  for (let i = 0; i < tries; i++) { const x = W.r(L.r.x0 + m, L.r.x1 - m), z = W.r(L.r.z0 + m, L.r.z1 - m); if (isFree(x, z, r)) return [x, z]; }
  return null;
}
function lotCluster(W, L, st) {
  const n = 3 + Math.floor(W.rnd() * 3);
  for (let i = 0; i < n; i++) {
    const hw = W.r(6.5, 10), hd = W.r(6, 8.5), p = lotSpot(W, L, Math.max(hw, hd) / 2 + 2.2, 22, hw / 2 + 2);
    if (!p) continue;
    const side = Math.abs(p[0] - L.cx) > Math.abs(p[1] - L.cz) ? (p[0] > L.cx ? 'w' : 'e') : (p[1] > L.cz ? 'n' : 's');
    st.house(W, p[0], p[1], hw, hd, side);
    reserve(p[0] - hw / 2 - 1, p[1] - hd / 2 - 1, p[0] + hw / 2 + 1, p[1] + hd / 2 + 1);
  }
  if (st.wallMat) for (let i = 0; i < 2; i++) { const p = lotSpot(W, L, 3); if (p) { const len = W.r(6, 11); W.wall(p[0] - len / 2, p[1], p[0] + len / 2, p[1], 1.7, 0.45, st.wallMat(), { openings: [{ at: len * W.r(0.3, 0.7), w: 2.2, h: 1.7 }] }); } }
  lotProps(W, L, st, 3);
  if (st.night) { const p = lotSpot(W, L, 1); if (p) { W.box(p[0], 0, p[1], 0.15, 4.4, 0.15, MATLIB.plain(0x2a2a2a, { metal: 0.7 })); W.lamp(p[0], 4.5, p[1], st.lampColor || 0xffb060, { fixture: 'bulb', real: W.rnd() < 0.5, intensity: 2.0, dist: 18, poolSize: 9, poolI: 0.38 }); } }
}
function lotCamp(W, L, st) {
  const tents = 2 + Math.floor(W.rnd() * 2);
  for (let i = 0; i < tents; i++) { const p = lotSpot(W, L, 3.2); if (p) { W.prop('tent', p[0], p[1], { size: W.r(4.2, 5.2), rot: W.r(0, 6.28), surface: 'wood' }); reserve(p[0] - 3, p[1] - 3, p[0] + 3, p[1] + 3); } }
  let p = lotSpot(W, L, 2); if (p) W.prop('generator', p[0], p[1], { size: 2.2, rot: W.r(0, 3) });
  p = lotSpot(W, L, 3.5); if (p) W.prop('technical', p[0], p[1], { size: 5.6, rot: W.r(0, 6.28) });
  if (W.rnd() < 0.5) { p = lotSpot(W, L, 3); if (p) W.prop('watchtower', p[0], p[1], { size: 10, axis: 'h', surface: 'wood', pad: 0.35 }); }
  for (let i = 0; i < 3; i++) { p = lotSpot(W, L, 2); if (p) W.prop('sandbags', p[0], p[1], { size: 3, rot: W.r(0, 3.14) }); }
  if (st.night || W.rnd() < 0.3) { p = lotSpot(W, L, 1.2); if (p) W.fireDrum(p[0], p[1]); }
  lotProps(W, L, st, 4);
}
function lotForest(W, L, st) {
  const n = 12 + Math.floor(W.rnd() * 8);
  for (let i = 0; i < n; i++) { const p = lotSpot(W, L, 1.6, 6, 1.5); if (p) st.tree(W, p[0], p[1]); }
  for (let i = 0; i < 3; i++) { const p = lotSpot(W, L, 2); if (p) W.rock(p[0], p[1], W.r(0.8, 2), st.rock(), { sy: 0.8 }); }
  if (st.log !== false) for (let i = 0; i < 2; i++) { const p = lotSpot(W, L, 2.5); if (p) W.box(p[0], 0, p[1], W.r(3, 5), 0.6, 0.6, M_('bark'), { rot: W.r(0, 3.14), surface: 'wood' }); }
}
function lotField(W, L, st) {
  for (let i = 0; i < 4; i++) { const p = lotSpot(W, L, 2.2); if (p) W.rock(p[0], p[1], W.r(0.9, 2.4), st.rock(), { sy: W.r(0.7, 1.1) }); }
  for (let i = 0; i < 2; i++) { const p = lotSpot(W, L, 3); if (p) W.lowWall(p[0], p[1], W.r(3, 5), W.r(0, 3.14), st.wallMat ? st.wallMat() : null); }
  let p = lotSpot(W, L, 3); if (p && W.rnd() < 0.6) W.prop('car_wreck', p[0], p[1], { size: 4.4, rot: W.r(0, 6.28) });
  lotProps(W, L, st, 3);
}
function lotCheckpoint(W, L, st) {
  const con = M_('concrete', { color: 0xb0b0aa });
  for (let i = 0; i < 4; i++) { const p = lotSpot(W, L, 2.2); if (p) W.box(p[0], 0, p[1], 3.2, 1.1, 0.8, con, { rot: W.r(0, 3.14) }); }
  for (let i = 0; i < 3; i++) { const p = lotSpot(W, L, 2); if (p) W.prop('sandbags', p[0], p[1], { size: 3, rot: W.r(0, 3.14) }); }
  let p = lotSpot(W, L, 2); if (p) W.prop('barrier', p[0], p[1], { size: 2.6, rot: W.r(0, 3) });
  p = lotSpot(W, L, 3); if (p) W.prop('watchtower', p[0], p[1], { size: 10, axis: 'h', surface: 'wood', pad: 0.35 });
  if (st.night) { p = lotSpot(W, L, 2); if (p) W.searchlight(p[0], p[1], 8, 0xe8f0ff); }
  lotProps(W, L, st, 2);
}
// crates, barrels (some explosive) and hard cover pieces
function lotProps(W, L, st, n) {
  for (let i = 0; i < n; i++) {
    const p = lotSpot(W, L, 1.8); if (!p) continue;
    const k = W.rnd();
    if (k < 0.28) crateStack(W, p[0], p[1], 2 + Math.floor(W.rnd() * 2), W.r(0, 3));
    else if (k < 0.46) barrelCluster(W, p[0], p[1], 2);
    else if (k < 0.56) W.explosiveBarrel(p[0], p[1]);
    else if (k < 0.72) W.woodBox(p[0], p[1], 0.75, W.r(0, 3), 1 + Math.floor(W.rnd() * 2));
    else if (k < 0.86) W.lowWall(p[0], p[1], W.r(2.6, 4), W.r(0, 3.14), st.wallMat ? st.wallMat() : null);
    else W.metalDoor(p[0], p[1], W.r(0, 6.28));
  }
}

// openings cut into the core's outer walls so the annex wings connect (W.wall calls this while the core builds)
function coreWallOpenings(x0, z0, x1, z1, h, ops) {
  const c = WORLD.coreOpen; if (!c) return ops;
  const alongX = Math.abs(x1 - x0) >= Math.abs(z1 - z0), len = alongX ? Math.abs(x1 - x0) : Math.abs(z1 - z0);
  const onEdge = alongX ? (Math.abs(z0 - c.z0) < 0.7 || Math.abs(z0 - c.z1) < 0.7) && Math.abs(z0 - z1) < 0.01 : (Math.abs(x0 - c.x0) < 0.7 || Math.abs(x0 - c.x1) < 0.7) && Math.abs(x0 - x1) < 0.01;
  if (!onEdge || len < 7) return ops;
  const out = ops.slice(), dh = Math.min(2.9, h - 0.4);
  for (let a = 6.5; a < len - 4; a += 13) if (!out.some(o => Math.abs(o.at - a) < (o.w || 2) / 2 + 2.2)) out.push({ at: a, w: 3, h: dh });
  return out;
}

// ===================== extra set dressing: more props on every location =====================
// After a map (and its outer ring) is built, the free floor gets more hard cover and clutter from the same prop kit:
// indoors small pieces that never close a doorway (the 2 m clearance keeps them off walls and out of door gaps),
// outdoors larger ones. The count follows the map's area.
function extraProps(W, M, info) {
  if (M.key === 'random_outdoor') return;   // that generator dresses its own lots
  const b = WORLD.bounds, area = (b.x1 - b.x0) * (b.z1 - b.z0), sp = (info && info.spawn) || M.spawn || { x: 0, z: 0 };
  const indoor = WORLD.indoor, n = indoor ? clamp(Math.round(area / 210), 18, 80) : clamp(Math.round(area / 950), 16, 70);
  const night = !!(WORLD.env && WORLD.env.night);
  let placed = 0;
  for (let i = 0; i < n * 16 && placed < n; i++) {
    const x = W.r(b.x0 + 3, b.x1 - 3), z = W.r(b.z0 + 3, b.z1 - 3);
    if (Math.hypot(x - sp.x, z - sp.z) < 7 || !isFree(x, z, indoor ? 2.0 : 3.0)) continue;
    const k = W.rnd(), rot = W.r(0, 6.28);
    if (indoor) {
      if (k < 0.26) W.woodBox(x, z, 0.75, rot, 1 + Math.floor(W.rnd() * 2));
      else if (k < 0.42) barrelCluster(W, x, z, 2 + Math.floor(W.rnd() * 2));
      else if (k < 0.55) crateStack(W, x, z, 2 + Math.floor(W.rnd() * 2), rot);
      else if (k < 0.65) { W.coverTable(x, z, rot); W.chair(x + 1.1, z + 0.4, rot + 1, true); }
      else if (k < 0.73) W.metalDoor(x, z, rot);
      else if (k < 0.81) W.prop('rubble', x, z, { size: W.r(2, 2.8), rot, surface: 'concrete' });
      else if (k < 0.87) W.explosiveBarrel(x, z);
      else if (k < 0.95) W.lowWall(x, z, 2.6, rot);
      else W.prop('generator', x, z, { size: 2.2, rot });
    } else {
      if (k < 0.2) W.prop('sandbags', x, z, { size: 3, rot });
      else if (k < 0.33) W.prop('car_wreck', x, z, { size: 4.4, rot, surface: 'metal' });
      else if (k < 0.4) W.prop('technical', x, z, { size: 5.6, rot, surface: 'metal' });
      else if (k < 0.5) W.prop('barrier', x, z, { size: 2.6, rot, surface: 'concrete' });
      else if (k < 0.64) crateStack(W, x, z, 2 + Math.floor(W.rnd() * 2), rot);
      else if (k < 0.76) barrelCluster(W, x, z, 2 + Math.floor(W.rnd() * 2));
      else if (k < 0.84) W.woodBox(x, z, 0.8, rot, 2);
      else if (k < 0.9) W.explosiveBarrel(x, z);
      else if (k < 0.96) W.lowWall(x, z, W.r(3, 4.5), rot);
      else if (night) W.fireDrum(x, z); else W.prop('rubble', x, z, { size: W.r(2.4, 3.4), rot, surface: 'concrete' });
    }
    reserve(x - 2.2, z - 2.2, x + 2.2, z + 2.2); placed++;
  }
}
