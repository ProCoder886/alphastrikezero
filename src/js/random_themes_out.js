// ---------- Random Ops themes: 15 outdoor location themes ----------
// The outdoor generator (random_maps.js) keeps everything it had - size, terrain and material pools, weather, time
// of day, roads, rivers, bridges and its own lot kinds - and draws one of these themes on top: the theme sets the
// centrepiece, most of the lots, the name, and adds its recurring features (buildings with open doors in many
// colours, curtained windows, balconies, roof terraces reached by outside staircases, railings, coloured lights).

// ---------- building kit ----------
// rtBuilding: storeys, a front door with an open leaf, windows (some with curtains), a balcony and an outside
// staircase up to it or to a roof terrace with a parapet. Returns its footprint.
function rtBuilding(W, x, z, w, d, o = {}) {
  const r = W.rnd, st = o.storeys || 1, h = o.h || W.r(3.0, 3.5), wall = o.wall || M_('plaster', { color: 0xe0d8c8 }), roofM = o.roof || wall;
  const side = o.door || 's', doorAt = W.r(0.32, 0.68), terrace = o.terrace !== undefined ? o.terrace : r() < 0.5, lenSide = (s) => s === 'n' || s === 's' ? w : d;
  const opp = { n: 's', s: 'n', e: 'w', w: 'e' };
  // the outside stair runs along a side wall (not the front), to the roof (one storey) or to a first-floor balcony
  const stairSide = o.stairs === false ? null : (o.stairSide || (side === 'n' || side === 's' ? (r() < 0.5 ? 'e' : 'w') : (r() < 0.5 ? 'n' : 's')));
  const stairY = st === 1 ? h + 0.3 : h + 0.3, stairL = Math.max(3, Math.round(stairY / 0.24)) * 0.3, sideLen = stairSide ? lenSide(stairSide) : 0;
  const stairsOk = !!stairSide && sideLen >= stairL + 3.2 && (st > 1 || terrace);
  const balK = st > 1 && stairsOk ? 1 : -1, balAt = stairsOk ? sideLen - 1.6 : 0;   // balcony door position along the stair side
  for (let k = 0; k < st; k++) {
    const y = k * (h + 0.3), doors = {}, wins = {};
    for (const s of ['n', 's', 'e', 'w']) { const L = lenSide(s), n = Math.max(1, Math.floor(L / 3)); wins[s] = []; for (let i = 1; i < n; i++) wins[s].push(i * L / n); }
    if (k === 0) { doors[side] = [lenSide(side) * doorAt]; wins[side] = wins[side].filter(a => Math.abs(a - lenSide(side) * doorAt) > 1.7); }
    if (k === balK) { doors[stairSide] = [balAt]; wins[stairSide] = wins[stairSide].filter(a => Math.abs(a - balAt) > 1.7); }
    if (stairsOk && k === 0) wins[stairSide] = [];   // the stair climbs past this wall
    W.room(x, z, w, d, h, { y, wall, doors, windows: wins, glass: o.lit && r() < 0.6 ? 'lit' : undefined, ceil: k === st - 1 ? roofM : wall, t: 0.3, winY: 1.1, winH: 1.1, doorW: 2.0, doorH: 2.4 });
    // curtains behind some windows of the front
    if (o.curtains !== false) for (const a of wins[side]) if (r() < 0.45) rtWindowCurtains(W, x, z, w, d, side, a, y, o.curtainCol || [0xc83a3a, 0xe8d8b0, 0x3a6aa0, 0x6a8a4a, 0xd8a040, 0x8a3a8a][Math.floor(r() * 6)]);
  }
  // open front door
  rtSideDoor(W, x, z, w, d, side, lenSide(side) * doorAt, 0, o.doorCol);
  const top = st * (h + 0.3);
  // pitched roof or a flat roof terrace with a parapet
  if (!terrace) {
    const g = new THREE.CylinderGeometry(0.01, Math.max(w, d) * 0.62, 2.2, 4, 1); g.rotateY(Math.PI / 4); g.scale(w / Math.max(w, d), 1, d / Math.max(w, d));
    rtAddGeo(g, o.pitch || M_('roof', { color: o.roofCol || 0xb06a50 }), x, top + 1.1, z, 0);
  }
  // outside staircase + landing / balcony walkway, railings
  if (stairsOk) {
    const ax = stairSide === 'n' || stairSide === 's', out = stairSide === 'n' || stairSide === 'w' ? -1 : 1, sw = 1.3;
    const lineC = ax ? z + out * (d / 2 + 0.15 + sw / 2) : x + out * (w / 2 + 0.15 + sw / 2);   // centre line of the stair, outside the wall
    const a0 = (ax ? x - w / 2 : z - d / 2) + 0.4, dir = ax ? '+x' : '+z';
    const sx = ax ? a0 : lineC, sz = ax ? lineC : a0, sm = o.stairM || M_('concrete', { color: 0xa8a49c });
    rtStairs(W, sx, sz, sw, stairY, dir, sm, { railSides: [out] });
    const aTop = a0 + stairL, aEnd = (ax ? x + w / 2 : z + d / 2) + 0.15;
    // walkway along the wall from the stair top to the far corner (the balcony): slab + outer rail + end rail
    const wl = aEnd - aTop;
    if (ax) W.box((aTop + aEnd) / 2, stairY - 0.25, lineC, wl, 0.25, sw, sm, { nav: false, minimap: false }); else W.box(lineC, stairY - 0.25, (aTop + aEnd) / 2, sw, 0.25, wl, sm, { nav: false, minimap: false });
    if (ax) { rtRail(W, aTop, lineC + out * sw / 2, aEnd, lineC + out * sw / 2, stairY); rtRail(W, aEnd, lineC - sw / 2, aEnd, lineC + sw / 2, stairY); }
    else { rtRail(W, lineC + out * sw / 2, aTop, lineC + out * sw / 2, aEnd, stairY); rtRail(W, lineC - sw / 2, aEnd, lineC + sw / 2, aEnd, stairY); }
    // supports under the walkway
    for (const a of [aTop + 0.2, aEnd - 0.2]) W.box(ax ? a : lineC + out * (sw / 2 - 0.1), 0, ax ? lineC + out * (sw / 2 - 0.1) : a, 0.15, stairY - 0.25, 0.15, sm, { minimap: false });
    if (balK === 1) rtSideDoor(W, x, z, w, d, stairSide, balAt, h + 0.3, o.doorCol);
    // roof terrace of a one-storey building: parapet with a gap at the walkway
    if (st === 1 && terrace) {
      const gapA = (ax ? aEnd - (x - w / 2) : aEnd - (z - d / 2)) - 2.2;
      rtParapet(W, x, z, w, d, top, wall, stairSide, gapA, 2.0);
      rtRoofDressing(W, x, z, w, d, top);
    }
    reserve(ax ? x - w / 2 - 1 : lineC - sw, ax ? lineC - sw : z - d / 2 - 1, ax ? x + w / 2 + 1 : lineC + sw, ax ? lineC + sw : z + d / 2 + 1);
  } else if (terrace) rtParapet(W, x, z, w, d, top, wall, null, 0, 0);
  // decorative balconies on the front of upper storeys
  if (st > 1 && o.frontBalconies !== false) for (let k = 1; k < st; k++) if (r() < 0.7) rtFrontBalcony(W, x, z, w, d, side, k * (h + 0.3), o.railMat);
  // awning over the front door
  if (o.awning) { const ax = side === 'n' || side === 's', out = side === 'n' || side === 'w' ? -1 : 1, a = (ax ? x - w / 2 : z - d / 2) + lenSide(side) * doorAt;
    W.box(ax ? a : x + out * (w / 2 + 0.7), 2.7, ax ? z + out * (d / 2 + 0.7) : a, ax ? 3.2 : 1.4, 0.12, ax ? 1.4 : 3.2, RTM.paint(o.awning), { collide: false, rotX: ax ? out * 0.18 : 0, rotZ: ax ? 0 : -out * 0.18 }); }
  return { x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2, top };
}
// open door leaf in a building's side door (a = distance along the side from its start, as W.room counts it)
function rtSideDoor(W, x, z, w, d, side, a, y, col) {
  const x0 = x - w / 2, x1 = x + w / 2, z0 = z - d / 2, z1 = z + d / 2, cols = [0x7a2a1e, 0x2a4a7a, 0x2a6a3a, 0xc8a040, 0xe8e0d0, 0x1e1e22, 0x8a3a6a, 0x3a8a8a];
  const c = col || cols[Math.floor(W.rnd() * cols.length)];
  if (side === 'n') rtDoor(W, x0, z0, x1, z0, a, 2.0, 2.4, c, { y });
  else if (side === 's') rtDoor(W, x0, z1, x1, z1, a, 2.0, 2.4, c, { y });
  else if (side === 'w') rtDoor(W, x0, z0 + 0.15, x0, z1 - 0.15, a - 0.15, 2.0, 2.4, c, { y });
  else rtDoor(W, x1, z0 + 0.15, x1, z1 - 0.15, a - 0.15, 2.0, 2.4, c, { y });
}
function rtWindowCurtains(W, x, z, w, d, side, a, y, col) {
  const ax = side === 'n' || side === 's', inn = side === 'n' || side === 'w' ? 1 : -1;
  const px = ax ? x - w / 2 + a : x + (side === 'w' ? -w / 2 : w / 2) + inn * 0.3, pz = ax ? z + (side === 'n' ? -d / 2 : d / 2) + inn * 0.3 : z - d / 2 + a;
  for (const s of [-1, 1]) rtCurtain(W, px + (ax ? s * 0.45 : 0), pz + (ax ? 0 : s * 0.45), y + 0.9, 0.6, 1.5, ax ? 0 : Math.PI / 2, col, { rod: false, gather: true });
}
function rtParapet(W, x, z, w, d, top, mat, gapSide, gapA, gapW) {
  const x0 = x - w / 2, x1 = x + w / 2, z0 = z - d / 2, z1 = z + d / 2;
  const sides = { n: [x0, z0, x1, z0], s: [x0, z1, x1, z1], w: [x0, z0, x0, z1], e: [x1, z0, x1, z1] };
  for (const s in sides) { const [a, b, c, e] = sides[s]; W.wall(a, b, c, e, 0.9, 0.22, mat, { y: top, noAuto: true, openings: s === gapSide ? [{ at: gapA + gapW / 2, w: gapW, h: 0.9 }] : [] }); }
}
function rtRoofDressing(W, x, z, w, d, top) {
  const r = W.rnd, f = (lx, lz) => ({ x: x + lx, z: z + lz, rot: r() < 0.5 ? 0 : Math.PI / 2, y: top });
  if (r() < 0.6) { const q = f(W.r(-w * 0.25, w * 0.25), W.r(-d * 0.25, d * 0.25)); rtP(W, q, 0, 0.45, 0, 1.4, 0.9, 1.0, RTM.metal(0x9aa0a4)); rtFoot(q, 0.7, 0.5, 0.9, 'metal'); }
  if (r() < 0.6) rtPlant(W, x + W.r(-w * 0.3, w * 0.3), z + W.r(-d * 0.3, d * 0.3), top, 0.9);
  if (r() < 0.5) { const q = f(W.r(-w * 0.2, w * 0.2), W.r(-d * 0.2, d * 0.2)); rtTable(W, q, 1.0, 1.0, RTM.paint(0xe8e4dc), RTM.metal(), 0.74); }
  if (r() < 0.4) { const q = f(W.r(-w * 0.3, w * 0.3), W.r(-d * 0.3, d * 0.3)); rtP(W, q, 0, 0.5, 0, 1.2, 1.0, 1.2, RTM.glass()); }
}
function rtFrontBalcony(W, x, z, w, d, side, y, railMat) {
  const ax = side === 'n' || side === 's', out = side === 'n' || side === 'w' ? -1 : 1, L = Math.min(ax ? w : d, W.r(3, 4.5)), a = W.r(-(ax ? w : d) / 2 + L / 2 + 0.5, (ax ? w : d) / 2 - L / 2 - 0.5);
  const cx = ax ? x + a : x + out * (w / 2 + 0.8), cz = ax ? z + out * (d / 2 + 0.8) : z + a, slab = M_('concrete', { color: 0xc8c4bc });
  W.box(cx, y - 0.2, cz, ax ? L : 1.3, 0.2, ax ? 1.3 : L, slab, { minimap: false, nav: false });
  const rm = { mat: railMat || RTM.metal(0x2a2d32) };
  if (ax) { rtRail(W, cx - L / 2, cz + out * 0.62, cx + L / 2, cz + out * 0.62, y, rm); rtRail(W, cx - L / 2, cz - out * 0.6, cx - L / 2, cz + out * 0.62, y, rm); rtRail(W, cx + L / 2, cz - out * 0.6, cx + L / 2, cz + out * 0.62, y, rm); }
  else { rtRail(W, cx + out * 0.62, cz - L / 2, cx + out * 0.62, cz + L / 2, y, rm); rtRail(W, cx - out * 0.6, cz - L / 2, cx + out * 0.62, cz - L / 2, y, rm); rtRail(W, cx - out * 0.6, cz + L / 2, cx + out * 0.62, cz + L / 2, y, rm); }
  if (W.rnd() < 0.5) rtPlant(W, cx, cz, y, 0.6);
}

// ---------- street furniture & small structures ----------
function rtLampPost(W, x, z, col, o = {}) {
  const pole = MATLIB.plain(0x2a2c30, { rough: 0.5, metal: 0.7 }), h = o.h || 4.2;
  W.box(x, 0, z, 0.14, h, 0.14, pole, { minimap: false });
  W.box(x, h, z, 0.42, 0.22, 0.42, RTM.glow(col, 3), { collide: false, noShadow: true });
  W.lamp(x, h - 0.1, z, col, { fixture: 'bulb', real: W.rnd() < (o.real || 0.25), intensity: 1.8, dist: 16, poolSize: 8, poolI: 0.3 });
}
function rtBench(W, x, z, rot) {
  const f = { x, z, rot }, wood = RTM.wood(0x8a6a4c), iron = MATLIB.plain(0x2a2c30, { rough: 0.5, metal: 0.7 });
  W._part(f, 0, 0.45, 0, 1.8, 0.06, 0.5, wood); W._part(f, 0, 0.8, -0.24, 1.8, 0.4, 0.05, wood);
  for (const s of [-0.75, 0.75]) W._part(f, s, 0.22, 0, 0.06, 0.45, 0.5, iron);
  W._footprint(f, 0.9, 0.3, 0.9, 'wood');
}
function rtHedge(W, x, z, len, rot, h = 1.2) {
  const f = { x, z, rot }; W._part(f, 0, h / 2, 0, len, h, 0.8, M_('leaves', { color: 0x3a6a2a })); W._footprint(f, len / 2, 0.4, h, 'wood');
}
function rtFlowerBed(W, x, z, w, d) {
  W.box(x, 0, z, w, 0.35, d, M_('cobble', { color: 0xb8a890 }), { surface: 'rock' });
  const cols = [0xd83a5a, 0xe8c030, 0x8a4ad8, 0xff8a3a, 0xf0f0f0, 0x3a8ae8];
  for (let i = 0; i < Math.round(w * d / 1.2); i++) W.box(x + W.r(-w / 2 + 0.3, w / 2 - 0.3), 0.35, z + W.r(-d / 2 + 0.3, d / 2 - 0.3), 0.4, W.r(0.15, 0.35), 0.4, RTM.paint(cols[Math.floor(W.rnd() * cols.length)], { rough: 0.9 }), { collide: false, noShadow: true });
}
function rtGazebo(W, x, z, R = 3) {
  const wood = RTM.wood(0xe8e0d0), roofM = M_('roof', { color: 0x6a3a2a });
  W.box(x, 0, z, R * 2, 0.3, R * 2, M_('wood_floor', { color: 0xa08868 }), { surface: 'wood' });
  for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283; W.box(x + Math.cos(a) * R * 0.9, 0.3, z + Math.sin(a) * R * 0.9, 0.18, 2.6, 0.18, wood, { minimap: false }); }
  const g = new THREE.CylinderGeometry(0.05, R * 1.15, 1.6, 6); rtAddGeo(g, roofM, x, 2.9 + 0.8, z, 0);
  W.lamp(x, 2.7, z, 0xffd8a0, { fixture: 'bulb', real: false, intensity: 1.2, dist: 8, poolSize: 5, poolI: 0.3 });
  rtBench(W, x, z + R * 0.4, Math.PI);
}
function rtStall(W, x, z, rot, col) {
  const f = { x, z, rot }, wood = RTM.wood(0x8a6a4c), cloth = RTM.cloth(col);
  W._part(f, 0, 0.45, 0, 2.6, 0.9, 1.0, wood);
  for (const [sx, sz] of [[-1.3, -0.6], [1.3, -0.6], [-1.3, 0.6], [1.3, 0.6]]) W._part(f, sx, 1.2, sz, 0.08, 2.4, 0.08, wood);
  W._part(f, 0, 2.4, 0, 3.0, 0.08, 1.8, cloth, { rotX: 0.15 });
  const goods = [0xd83a2a, 0x3ac83a, 0xe8c030, 0xff8a3a, 0x8a4a2a];
  for (let i = 0; i < 5; i++) W._part(f, -1 + i * 0.5, 0.98, 0.1, 0.4, 0.16, 0.5, RTM.paint(goods[Math.floor(W.rnd() * goods.length)], { rough: 0.9 }));
  W._footprint(f, 1.3, 0.55, 1.0, 'wood');
  rtCurtain(W, x - Math.sin(rot) * 0.0 - Math.cos(rot) * 1.35, z + Math.sin(rot) * 1.35, 0.95, 1.0, 1.3, rot + Math.PI / 2, col, { rod: false, gather: true });
}
function rtStringLights(W, x0, z0, x1, z1, h) {
  const pole = MATLIB.plain(0x3a3a3a, { metal: 0.6 }), L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(4, Math.round(L / 1.1));
  for (const [x, z] of [[x0, z0], [x1, z1]]) W.box(x, 0, z, 0.12, h + 0.2, 0.12, pole, { minimap: false });
  for (let i = 1; i < n; i++) { const t = i / n, sag = Math.sin(t * Math.PI) * 0.6; W.box(x0 + (x1 - x0) * t, h - sag, z0 + (z1 - z0) * t, 0.1, 0.12, 0.1, RTM.glow(RT_ACCENT[i % RT_ACCENT.length], 3.2), { collide: false, noShadow: true }); }
  W.lamp((x0 + x1) / 2, h - 0.5, (z0 + z1) / 2, RT_ACCENT[Math.floor(W.rnd() * RT_ACCENT.length)], { fixture: 'bulb', real: W.rnd() < 0.3, intensity: 1.2, dist: 10, poolSize: 7, poolI: 0.25, pool: true });
}
function rtStage(W, x, z, rot, curCol) {
  const f = { x, z, rot }, wood = RTM.wood(0x3a2a1e), truss = RTM.metal(0x9aa0a8);
  W._part(f, 0, 0.6, 0, 10, 1.2, 6, wood); W._footprint(f, 5, 3, 1.2, 'wood');
  for (const sx of [-5, 5]) W._part(f, sx, 3.4, -2.8, 0.25, 6.8, 0.25, truss);
  W._part(f, 0, 6.8, -2.8, 10.2, 0.3, 0.3, truss);
  const c = Math.cos(rot), s = Math.sin(rot), bx = x - 2.6 * s, bz = z - 2.6 * c;
  rtCurtain(W, bx, bz, 1.2, 9.6, 5.4, rot, curCol, { dense: true });
  for (let i = 0; i < 4; i++) { const lx = -3.6 + i * 2.4, col = [0xff3060, 0x40a0ff, 0xffd040, 0xb050ff][i]; W._part(f, lx, 6.55, -2.4, 0.4, 0.3, 0.4, RTM.glow(col, 3)); W.lamp(x + lx * c, 6.4, z - lx * s, col, { fixture: 'bulb', real: i % 2 === 0, intensity: 1.8, dist: 14, poolSize: 6, poolI: 0.45, floorY: 1.2 }); }
  // steps up at the front corners
  for (const sx of [-4.2, 4.2]) rtStairs(W, x + sx * c + 4.5 * s, z - sx * s + 4.5 * c, 1.4, 1.2, Math.abs(Math.cos(rot)) > 0.5 ? (c > 0 ? '-z' : '+z') : (s > 0 ? '-x' : '+x'), wood, { rails: false });
}
function rtUmbrella(W, x, z, col) {
  W.box(x, 0, z, 0.06, 2.3, 0.06, RTM.metal(0xd8d8d8), { minimap: false });
  const g = new THREE.ConeGeometry(1.4, 0.5, 8, 1, true); rtAddGeo(g, RTM.cloth(col), x, 2.35, z, 0);
  const f = { x: x + 0.9, z, rot: W.r(0, 3) }; W._part(f, 0, 0.3, 0, 0.7, 0.12, 1.8, RTM.paint(0xe8e4dc)); W._footprint(f, 0.35, 0.9, 0.4, 'wood');
}
function rtHay(W, x, z) { rtCyl(W, x, 0.75, z, 0.75, 1.3, M_('leaves', { color: 0xd8b860 }), { rotX: Math.PI / 2, collide: false }); addCollider(x - 0.75, x + 0.75, 0, 1.5, z - 0.65, z + 0.65, { surface: 'wood' }); }
function rtFenceLine(W, x0, z0, x1, z1, col) {
  const wood = RTM.wood(col || 0xa08060), L = Math.hypot(x1 - x0, z1 - z0), ax = Math.abs(x1 - x0) > Math.abs(z1 - z0), n = Math.max(1, Math.round(L / 2));
  for (let i = 0; i <= n; i++) { const t = i / n; W.box(x0 + (x1 - x0) * t, 0, z0 + (z1 - z0) * t, 0.12, 1.1, 0.12, wood, { collide: false, minimap: false }); }
  for (const y of [0.45, 0.9]) W.box((x0 + x1) / 2, y, (z0 + z1) / 2, ax ? L : 0.05, 0.1, ax ? 0.05 : L, wood, { collide: false, minimap: false });
  addCollider(ax ? Math.min(x0, x1) : x0 - 0.06, ax ? Math.max(x0, x1) : x0 + 0.06, 0, 1.05, ax ? z0 - 0.06 : Math.min(z0, z1), ax ? z0 + 0.06 : Math.max(z0, z1), { surface: 'wood', shot: false, minimap: false });
}
function rtGreenhouse(W, x, z, w, d) {
  const frame = MATLIB.plain(0xe8ece8, { rough: 0.4, metal: 0.6 }), glass = RTM.glass(), h = 3.4;
  for (const [a, b, c, e] of [[x - w / 2, z - d / 2, x + w / 2, z - d / 2], [x - w / 2, z + d / 2, x + w / 2, z + d / 2], [x - w / 2, z - d / 2, x - w / 2, z + d / 2], [x + w / 2, z - d / 2, x + w / 2, z + d / 2]]) {
    const ax = Math.abs(c - a) > 0.01, L = ax ? c - a : e - b, n = Math.max(2, Math.round(L / 2));
    for (let i = 0; i <= n; i++) { const t = i / n; W.box(a + (c - a) * t, 0, b + (e - b) * t, 0.08, h, 0.08, frame, { collide: false, minimap: false }); }
    const doorGap = ax && b > z ? [L * 0.5 - 1.1, L * 0.5 + 1.1] : null;
    const segs = doorGap ? [[0, doorGap[0]], [doorGap[1], L]] : [[0, L]];
    for (const [s0, s1] of segs) { const m = (s0 + s1) / 2, l = s1 - s0; W.box(ax ? a + m : a, 0, ax ? b : b + m, ax ? l : 0.04, h, ax ? 0.04 : l, glass, { surface: 'glass', minimap: true }); }
  }
  const g = new THREE.CylinderGeometry(0.01, Math.max(w, d) * 0.6, 1.8, 4, 1, true); g.rotateY(Math.PI / 4); g.scale(w / Math.max(w, d), 1, d / Math.max(w, d)); rtAddGeo(g, glass, x, h + 0.9, z, 0);
  for (let i = 0; i < 4; i++) rtFlowerBed(W, x + W.r(-w * 0.3, w * 0.3), z + W.r(-d * 0.3, d * 0.3), W.r(1.2, 2.2), W.r(1.2, 2.2));
  for (let i = 0; i < 3; i++) rtPlant(W, x + W.r(-w * 0.35, w * 0.35), z + W.r(-d * 0.35, d * 0.35), 0, W.r(1, 1.6));
  W.lamp(x, h - 0.2, z, 0xe8ffe0, { fixture: 'tube', real: false, intensity: 1.2, dist: 12, poolSize: 8, poolI: 0.25 });
}
function rtSilo(W, x, z) { const m = RTM.metal(0xb8bcc0); rtCyl(W, x, 0, z, 2.2, 9, m, { seg: 18 }); const cap = new THREE.SphereGeometry(2.2, 16, 6, 0, 6.283, 0, Math.PI / 2); rtAddGeo(cap, m, x, 9, z, 0); }
function rtCrane(W, x, z, h = 22) {
  const y = RTM.paint(0xe0a020, { metal: 0.5 });
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) W.box(x + dx * 0.9, 0, z + dz * 0.9, 0.22, h, 0.22, y, { collide: dx === -1 && dz === -1, minimap: false });
  for (let k = 2; k < h; k += 2.4) { W.box(x, k, z - 0.9, 1.9, 0.12, 0.12, y, { collide: false }); W.box(x, k, z + 0.9, 1.9, 0.12, 0.12, y, { collide: false }); }
  W.box(x + 7, h, z, 20, 0.7, 1.0, y, { collide: false }); W.box(x + 1.5, h - 2.4, z, 2.6, 2.2, 2.2, RTM.paint(0xd8d8d0), { collide: false });
  W.box(x + 14, h - 8, z, 0.05, 8, 0.05, RTM.dark(), { collide: false }); W.box(x + 14, h - 9.2, z, 1.4, 1.2, 1.4, RTM.paint(0x5a6a7a), { collide: false });
  addCollider(x - 1.1, x + 1.1, 0, h, z - 1.1, z + 1.1, { surface: 'metal' });
}

// ---------- themed lots: (W, L, X) with L = {r, cx, cz, size}, X = generator context ----------
const rtSpot = (W, L, rad, tries, m) => lotSpot(W, L, rad, tries || 18, m || 4);
const RT_LOT = {
  park(W, L, X) {
    W.patch(L.cx, L.cz, L.size * 0.86, L.size * 0.86, 'grass', { matOpts: { color: 0xb8d8a0 } });
    W.patch(L.cx, L.cz, L.size * 0.86, 3, X.T.stone); W.patch(L.cx, L.cz, 3, L.size * 0.86, X.T.stone);
    for (let i = 0; i < 9; i++) { const p = rtSpot(W, L, 2.2, 10, 3); if (p) (X.r() < 0.7 ? deciduous(W, p[0], p[1], W.r(6, 10)) : W.pine(p[0], p[1], W.r(8, 12))); }
    for (let i = 0; i < 4; i++) { const p = rtSpot(W, L, 1.4); if (p) rtBench(W, p[0], p[1], X.r() * 6.28); }
    for (const [dx, dz] of [[-6, -6], [6, 6]]) rtLampPost(W, L.cx + dx, L.cz + dz, X.pk([0xffe0b0, 0xfff4e0, 0xa8e8ff]));
    const k = X.r(), p = rtSpot(W, L, 4.5, 12, 7);
    if (p) { if (k < 0.4) rtGazebo(W, p[0], p[1], 3); else if (k < 0.75) rtFountain(W, p[0], p[1], 2.4); else W.water(p[0], p[1], 9, 7, 0.05, { color: 0x2a5a6a }); reserve(p[0] - 4.5, p[1] - 4.5, p[0] + 4.5, p[1] + 4.5); }
    for (let i = 0; i < 3; i++) { const q = rtSpot(W, L, 2.4); if (q) rtHedge(W, q[0], q[1], W.r(3, 6), X.r() < 0.5 ? 0 : Math.PI / 2); }
    lotProps(W, L, X.st, 1);
  },
  street(W, L, X) {
    const alongX = X.r() < 0.5;
    W.patch(L.cx, L.cz, alongX ? L.size : 8, alongX ? 8 : L.size, X.T.road); W.patch(L.cx, L.cz, alongX ? L.size : 13, alongX ? 13 : L.size, X.T.stone, { y: -0.004 });
    reserve(alongX ? L.r.x0 : L.cx - 6.5, alongX ? L.cz - 6.5 : L.r.z0, alongX ? L.r.x1 : L.cx + 6.5, alongX ? L.cz + 6.5 : L.r.z1);
    for (const s of [-1, 1]) for (let k = 0; k < 2; k++) {
      const w = W.r(9, 13), d = W.r(9, 12), off = 6.5 + (alongX ? d : w) / 2 + 0.8, along = (k - 0.5) * L.size * 0.48;
      const x = alongX ? L.cx + along : L.cx + s * off, z = alongX ? L.cz + s * off : L.cz + along;
      if (!isFree(x, z, Math.max(w, d) / 2 + 0.5)) continue;
      rtBuilding(W, x, z, w, d, { storeys: 2 + Math.floor(X.r() * 2), wall: X.T.wall(), roof: X.roofM(), door: alongX ? (s > 0 ? 'n' : 's') : (s > 0 ? 'w' : 'e'), terrace: X.r() < 0.6, awning: X.r() < 0.6 ? X.pk([0xc83a3a, 0x2a6a3a, 0x2a4a8a, 0xd8a030]) : null });
      reserve(x - w / 2 - 1.5, z - d / 2 - 1.5, x + w / 2 + 1.5, z + d / 2 + 1.5);
      if (X.r() < 0.5) W.box(alongX ? x : x - s * (w / 2 + 0.05), 3.6, alongX ? z - s * (d / 2 + 0.05) : z, alongX ? 2.6 : 0.1, 0.5, alongX ? 0.1 : 2.6, RTM.glow(X.pk(RT_ACCENT), 2.4), { collide: false, noShadow: true });
    }
    for (let i = 0; i < 3; i++) { const t = (i - 1) * L.size * 0.3; W.prop('car_wreck', alongX ? L.cx + t : L.cx + (X.r() < 0.5 ? -2.2 : 2.2), alongX ? L.cz + (X.r() < 0.5 ? -2.2 : 2.2) : L.cz + t, { size: 4.4, rot: (alongX ? Math.PI / 2 : 0) + W.r(-0.15, 0.15), surface: 'metal' }); }
    for (const s of [-1, 1]) rtLampPost(W, alongX ? L.cx + s * 10 : L.cx + 5.5, alongX ? L.cz + 5.5 : L.cz + s * 10, X.pk([0xffd8a0, 0xf8fbff, 0xff9a60]));
  },
  residential(W, L, X) {
    const n = 2 + Math.floor(X.r() * 3);
    for (let i = 0; i < n; i++) {
      const w = W.r(8, 11), d = W.r(7.5, 10), p = rtSpot(W, L, Math.max(w, d) / 2 + 3, 24, Math.max(w, d) / 2 + 3); if (!p) continue;
      const side = Math.abs(p[0] - L.cx) > Math.abs(p[1] - L.cz) ? (p[0] > L.cx ? 'w' : 'e') : (p[1] > L.cz ? 'n' : 's');
      rtBuilding(W, p[0], p[1], w, d, { storeys: X.r() < 0.4 ? 2 : 1, wall: X.r() < 0.5 ? X.T.wall() : M_('plaster', { color: X.pk([0xf0e8d8, 0xe8d8c8, 0xd8e0e8, 0xf0dcc8]) }), roof: X.roofM(), door: side, terrace: X.r() < 0.35, roofCol: X.pk([0xa04a3a, 0x5a5a62, 0x6a4a3a, 0x3a4a5a]) });
      reserve(p[0] - w / 2 - 2, p[1] - d / 2 - 2, p[0] + w / 2 + 2, p[1] + d / 2 + 2);
      W.patch(p[0], p[1] + (side === 's' ? d / 2 + 2.5 : side === 'n' ? -d / 2 - 2.5 : 0), w + 3, 4, 'grass', { matOpts: { color: 0xa8c890 } });
      if (X.r() < 0.7) { const fz = side === 's' ? p[1] + d / 2 + 4.6 : p[1] - d / 2 - 4.6; if (side === 's' || side === 'n') { rtFenceLine(W, p[0] - w / 2 - 1, fz, p[0] - 1.2, fz, 0xe8e4dc); rtFenceLine(W, p[0] + 1.2, fz, p[0] + w / 2 + 1, fz, 0xe8e4dc); } }
    }
    for (let i = 0; i < 3; i++) { const p = rtSpot(W, L, 2); if (p) deciduous(W, p[0], p[1], W.r(5, 8)); }
    let p = rtSpot(W, L, 3); if (p) W.prop('car_wreck', p[0], p[1], { size: 4.4, rot: W.r(0, 6.28) });
    lotProps(W, L, X.st, 1);
  },
  mansion(W, L, X) {
    const w = W.r(16, 22), d = W.r(11, 14), x = L.cx, z = L.cz - L.size * 0.1;
    if (!isFree(x, z, Math.max(w, d) / 2 + 1)) return RT_LOT.park(W, L, X);
    W.patch(L.cx, L.cz, L.size * 0.86, L.size * 0.86, 'grass', { matOpts: { color: 0xa8d090 } });
    rtBuilding(W, x, z, w, d, { storeys: 2 + (X.r() < 0.4 ? 1 : 0), wall: M_(X.pk(['plaster', 'fortress', 'brick']), { color: X.pk([0xf0e8dc, 0xe0d0c0, 0xd8c8b8]) }), roof: X.roofM(), door: 's', terrace: false, roofCol: X.pk([0x3a3a42, 0x5a3a2a]), curtainCol: X.pk([0x8a1a2a, 0x2a2a5a, 0xc8a040]), doorCol: X.pk([0x3a2214, 0x1e2a3a, 0xe8e0d0]) });
    reserve(x - w / 2 - 2, z - d / 2 - 2, x + w / 2 + 2, z + d / 2 + 4);
    for (const s of [-1, 1]) rtCyl(W, x + s * 2.4, 0, z + d / 2 + 1.4, 0.3, 5.5, M_('fortress', { color: 0xe8e4dc }), { seg: 12 });
    W.box(x, 5.5, z + d / 2 + 1.4, 6, 0.4, 2.8, M_('fortress', { color: 0xe8e4dc }), { collide: false });
    W.patch(x, z + d / 2 + 6, 3.5, 10, X.T.stone);
    const fz = z + d / 2 + 9; if (isFree(x, fz, 3)) rtFountain(W, x, fz, 2.2);
    for (const s of [-1, 1]) { rtHedge(W, x + s * 7, z + d / 2 + 6, 8, Math.PI / 2, 1.0); if (X.r() < 0.6) rtStatue(W, { x: x + s * 4, z: z + d / 2 + 11, rot: 0 }); rtFlowerBed(W, x + s * 10, z + d / 2 + 9, 3, 4); }
  },
  festival(W, L, X) {
    const p = rtSpot(W, L, 7, 14, 8); if (p) { rtStage(W, p[0], p[1], X.pk([0, Math.PI / 2, Math.PI, -Math.PI / 2]), X.pk([0xa81a2a, 0x2a1a5a, 0x1a1a1a, 0xc8a040])); reserve(p[0] - 6.5, p[1] - 6.5, p[0] + 6.5, p[1] + 6.5); }
    for (let i = 0; i < 4; i++) { const q = rtSpot(W, L, 2.2); if (q) rtStall(W, q[0], q[1], X.r() * 6.28, X.pk([0xd83a3a, 0x3a8ad8, 0xe8c030, 0x3ac87a, 0xc83ab0])); }
    for (let i = 0; i < 2; i++) { const q = rtSpot(W, L, 3.2); if (q) W.prop('tent', q[0], q[1], { size: W.r(4.2, 5.2), rot: X.r() * 6.28, surface: 'wood' }); }
    for (let i = 0; i < 2; i++) { const a = rtSpot(W, L, 1, 8, 5); if (a) rtStringLights(W, a[0], a[1], a[0] + W.r(-8, 8), a[1] + W.r(6, 10) * (X.r() < 0.5 ? 1 : -1), 3.8); }
    lotProps(W, L, X.st, 2);
  },
  square(W, L, X) {
    W.patch(L.cx, L.cz, L.size * 0.8, L.size * 0.8, X.T.stone);
    if (X.r() < 0.6) rtFountain(W, L.cx, L.cz, 2.6); else rtStatue(W, { x: L.cx, z: L.cz, rot: X.r() * 6 });
    reserve(L.cx - 4, L.cz - 4, L.cx + 4, L.cz + 4);
    for (let i = 0; i < 4; i++) { const a = i / 4 * 6.283 + 0.4; rtBench(W, L.cx + Math.cos(a) * 6.5, L.cz + Math.sin(a) * 6.5, -a + Math.PI / 2); rtLampPost(W, L.cx + Math.cos(a + 0.8) * 9, L.cz + Math.sin(a + 0.8) * 9, X.pk([0xffd8a0, 0xfff0d0])); }
    for (let i = 0; i < 2; i++) { const w = W.r(9, 12), d = W.r(8, 10), q = rtSpot(W, L, Math.max(w, d) / 2 + 2, 18, Math.max(w, d) / 2 + 2); if (q) { rtBuilding(W, q[0], q[1], w, d, { storeys: 2, wall: X.T.wall(), roof: X.roofM(), door: Math.abs(q[0] - L.cx) > Math.abs(q[1] - L.cz) ? (q[0] > L.cx ? 'w' : 'e') : (q[1] > L.cz ? 'n' : 's'), awning: X.pk([0xc83a3a, 0x2a6a3a, 0xd8a030]) }); reserve(q[0] - w / 2 - 1.5, q[1] - d / 2 - 1.5, q[0] + w / 2 + 1.5, q[1] + d / 2 + 1.5); } }
    if (X.r() < 0.5) { const q = rtSpot(W, L, 3); if (q) stoneTower(W, q[0], q[1], 3.6, W.r(10, 14), M_(X.T.stone2), { lit: false }); }
  },
  boardwalk(W, L, X) {
    const alongX = X.r() < 0.5, s = X.r() < 0.5 ? -1 : 1, ww = L.size * 0.32, wc = s * (L.size / 2 - ww / 2);
    // water along one side of the lot, the deck along its edge, a pier out into it
    const wx = alongX ? L.cx : L.cx + wc, wz = alongX ? L.cz + wc : L.cz;
    W.water(wx, wz, alongX ? L.size : ww, alongX ? ww : L.size, 0.06, { color: 0x24546a });
    const dc = s * (L.size / 2 - ww - 2.2), dk = M_('wood_floor', { color: 0x9a7a5a });
    W.box(alongX ? L.cx : L.cx + dc, 0, alongX ? L.cz + dc : L.cz, alongX ? L.size : 4.4, 0.3, alongX ? 4.4 : L.size, dk, { surface: 'wood', nav: false });
    const edge = dc + s * 2.2;
    rtRail(W, alongX ? L.r.x0 : L.cx + edge, alongX ? L.cz + edge : L.r.z0, alongX ? L.r.x1 : L.cx + edge, alongX ? L.cz + edge : L.r.z1, 0.3, { mat: RTM.wood(0x6a4a34) });
    const pa = W.r(-L.size * 0.25, L.size * 0.25), pl = ww * 0.8;
    W.box(alongX ? L.cx + pa : L.cx + edge + s * pl / 2, 0, alongX ? L.cz + edge + s * pl / 2 : L.cz + pa, alongX ? 3 : pl, 0.3, alongX ? pl : 3, dk, { surface: 'wood', nav: false });
    for (const k of [-1.5, 1.5]) rtRail(W, alongX ? L.cx + pa + k : L.cx + edge, alongX ? L.cz + edge : L.cz + pa + k, alongX ? L.cx + pa + k : L.cx + edge + s * pl, alongX ? L.cz + edge + s * pl : L.cz + pa + k, 0.3, { mat: RTM.wood(0x6a4a34) });
    reserve(alongX ? L.r.x0 : L.cx + dc - 2.4, alongX ? L.cz + dc - 2.4 : L.r.z0, alongX ? L.r.x1 : L.cx + wc + ww / 2, alongX ? L.cz + wc + ww / 2 : L.r.z1);
    for (let i = 0; i < 3; i++) { const t = (i - 1) * L.size * 0.3; rtLampPost(W, alongX ? L.cx + t : L.cx + dc - s * 1.8, alongX ? L.cz + dc - s * 1.8 : L.cz + t, X.pk([0xffd8a0, 0xa8e8ff])); }
    for (let i = 0; i < 2; i++) { const q = rtSpot(W, L, 2.4); if (q) rtKiosk(W, { x: q[0], z: q[1], rot: X.r() * 6.28 }, X.pk(RT_ACCENT)); }
    for (let i = 0; i < 3; i++) { const q = rtSpot(W, L, 1.4); if (q) rtBench(W, q[0], q[1], X.r() * 6.28); }
    lotProps(W, L, X.st, 1);
  },
  garden(W, L, X) {
    W.patch(L.cx, L.cz, L.size * 0.86, L.size * 0.86, 'grass', { matOpts: { color: 0xa8d090 } });
    const p = rtSpot(W, L, 6.5, 12, 8); if (p) { rtGreenhouse(W, p[0], p[1], W.r(9, 12), W.r(6.5, 8)); reserve(p[0] - 6.5, p[1] - 5, p[0] + 6.5, p[1] + 5); }
    for (let i = 0; i < 5; i++) { const q = rtSpot(W, L, 2.2); if (q) rtFlowerBed(W, q[0], q[1], W.r(2, 4), W.r(1.5, 3)); }
    for (let i = 0; i < 3; i++) { const q = rtSpot(W, L, 2.4); if (q) rtHedge(W, q[0], q[1], W.r(4, 7), X.r() < 0.5 ? 0 : Math.PI / 2, 1.1); }
    for (let i = 0; i < 4; i++) { const q = rtSpot(W, L, 2); if (q) deciduous(W, q[0], q[1], W.r(5, 8)); }
    for (let i = 0; i < 2; i++) { const q = rtSpot(W, L, 1.4); if (q) rtBench(W, q[0], q[1], X.r() * 6.28); }
  },
  chalet(W, L, X) {
    const n = 2 + Math.floor(X.r() * 2);
    for (let i = 0; i < n; i++) {
      const w = W.r(7.5, 10), d = W.r(7, 9), p = rtSpot(W, L, Math.max(w, d) / 2 + 2.6, 24, Math.max(w, d) / 2 + 2.6); if (!p) continue;
      rtBuilding(W, p[0], p[1], w, d, { storeys: X.r() < 0.5 ? 2 : 1, wall: M_(X.r() < 0.5 ? 'wood' : 'fortress', { color: X.r() < 0.5 ? 0xb08a62 : 0xd0c8bc }), roof: M_('wood', { color: 0x6a4a34 }), door: X.pk(['n', 's', 'e', 'w']), terrace: false, roofCol: X.pk([0x5a3a2a, 0x3a3a42, 0x7a3a2a]), railMat: RTM.wood(0x6a4a34), curtainCol: X.pk([0xc83a3a, 0xe8d8b0, 0x3a6a3a]) });
      reserve(p[0] - w / 2 - 2, p[1] - d / 2 - 2, p[0] + w / 2 + 2, p[1] + d / 2 + 2);
    }
    for (let i = 0; i < 2; i++) { const q = rtSpot(W, L, 3); if (q) W.lowWall(q[0], q[1], W.r(4, 7), X.r() * 3.14, M_(X.T.stone)); }
    for (let i = 0; i < 4; i++) { const q = rtSpot(W, L, 2); if (q) W.pine(q[0], q[1], W.r(8, 13), X.kind === 'snow' ? { snow: true } : {}); }
    let q = rtSpot(W, L, 1.6); if (q) { W.box(q[0], 0, q[1], 2.4, 1.0, 1.0, RTM.wood(0x8a6a4c), { surface: 'wood' }); }
    lotProps(W, L, X.st, 1);
  },
  farm(W, L, X) {
    const w = W.r(12, 16), d = W.r(9, 12), p = rtSpot(W, L, Math.max(w, d) / 2 + 2, 18, Math.max(w, d) / 2 + 3);
    if (p) { rtBuilding(W, p[0], p[1], w, d, { storeys: 1, h: 5.2, wall: M_('wood', { color: X.pk([0xa83a2a, 0x8a2a22, 0xb8a888]) }), roof: M_('roof', { color: 0x5a5a5a }), door: X.pk(['n', 's']), terrace: false, roofCol: 0x6a6a6a, stairs: false, curtains: false }); reserve(p[0] - w / 2 - 2, p[1] - d / 2 - 2, p[0] + w / 2 + 2, p[1] + d / 2 + 2); }
    let q = rtSpot(W, L, 2.8); if (q) { rtSilo(W, q[0], q[1]); reserve(q[0] - 2.6, q[1] - 2.6, q[0] + 2.6, q[1] + 2.6); }
    for (let i = 0; i < 5; i++) { q = rtSpot(W, L, 1.2); if (q) rtHay(W, q[0], q[1]); }
    q = rtSpot(W, L, 6, 10, 8); if (q) { W.patch(q[0], q[1], 12, 9, 'dirt', { matOpts: { color: 0x7a5a3a } }); for (let k = -4; k <= 4; k += 1.2) W.box(q[0], 0, q[1] + k * 0.9, 11, 0.18, 0.35, M_('dirt', { color: 0x6a4a2a }), { collide: false, noShadow: true }); }
    rtFenceLine(W, L.r.x0 + 3, L.r.z0 + 3, L.r.x1 - 3, L.r.z0 + 3); rtFenceLine(W, L.r.x0 + 3, L.r.z0 + 3, L.r.x0 + 3, L.cz - 2);
    q = rtSpot(W, L, 3.4); if (q) W.prop('technical', q[0], q[1], { size: 5.6, rot: W.r(0, 6.28) });
  },
  orchard(W, L, X) {
    for (let x = L.r.x0 + 5; x < L.r.x1 - 4; x += W.r(5.5, 7)) for (let z = L.r.z0 + 5; z < L.r.z1 - 4; z += W.r(5.5, 7)) if (isFree(x, z, 2)) deciduous(W, x + W.r(-0.5, 0.5), z + W.r(-0.5, 0.5), W.r(4.5, 6.5));
    for (let i = 0; i < 4; i++) { const q = rtSpot(W, L, 1.4, 12, 2); if (q) { const f = { x: q[0], z: q[1], rot: X.r() * 3 }; rtP(W, f, 0, 0.3, 0, 0.9, 0.6, 0.6, RTM.wood(0xb09070)); rtP(W, f, 0, 0.62, 0, 0.8, 0.06, 0.5, RTM.paint(X.pk([0xc82a2a, 0x7ac83a, 0xe8b830]), { rough: 0.8 })); rtFoot(f, 0.45, 0.3, 0.7, 'wood'); } }
    rtFenceLine(W, L.r.x0 + 2, L.r.z1 - 2, L.r.x1 - 2, L.r.z1 - 2);
  },
  beach(W, L, X) {
    if (X.kind !== 'sand') W.patch(L.cx, L.cz, L.size * 0.9, L.size * 0.9, 'sand');
    const s = X.r() < 0.5 ? -1 : 1, ww = L.size * 0.3; W.water(L.cx + s * (L.size / 2 - ww / 2), L.cz, ww, L.size, 0.06, { color: 0x2a7a8a });
    reserve(L.cx + s * (L.size / 2 - ww) - 1, L.r.z0, L.cx + s * L.size / 2, L.r.z1);
    for (let i = 0; i < 6; i++) { const q = rtSpot(W, L, 1.8); if (q) rtUmbrella(W, q[0], q[1], X.pk([0xd83a3a, 0x3a8ad8, 0xe8c030, 0x3ac8a0, 0xf0f0f0])); }
    for (let i = 0; i < 5; i++) { const q = rtSpot(W, L, 1.6); if (q) { W.prop('palm', q[0], q[1], { size: W.r(7, 10), axis: 'h', collide: false }); addCollider(q[0] - 0.3, q[0] + 0.3, 0, 3, q[1] - 0.3, q[1] + 0.3, { surface: 'wood', minimap: false }); } }
    for (let i = 0; i < 2; i++) { const q = rtSpot(W, L, 3.5); if (q) { rtBuilding(W, q[0], q[1], W.r(4.5, 6), W.r(4, 5), { storeys: 1, h: 2.8, wall: M_('wood', { color: X.pk([0x3a8ad8, 0xd83a5a, 0xe8c030, 0x3ac8a0]) }), roof: M_('wood', { color: 0xe8e4dc }), door: X.pk(['n', 's', 'e', 'w']), terrace: false, stairs: false, curtains: false }); reserve(q[0] - 3.5, q[1] - 3.5, q[0] + 3.5, q[1] + 3.5); } }
    const q = rtSpot(W, L, 3); if (q) W.prop('watchtower', q[0], q[1], { size: 7, axis: 'h', surface: 'wood', pad: 0.35 });
  },
  campground(W, L, X) {
    for (let i = 0; i < 3; i++) { const q = rtSpot(W, L, 3.2); if (q) W.prop('tent', q[0], q[1], { size: W.r(4, 5), rot: X.r() * 6.28, surface: 'wood' }); }
    let q = rtSpot(W, L, 3, 14, 6); if (q) { W.fire(q[0], 0.15, q[1], 0.9); for (let i = 0; i < 5; i++) { const a = i / 5 * 6.283; W.box(q[0] + Math.cos(a) * 2.4, 0, q[1] + Math.sin(a) * 2.4, 1.6, 0.42, 0.42, M_('bark'), { rot: -a, surface: 'wood' }); } reserve(q[0] - 3, q[1] - 3, q[0] + 3, q[1] + 3); }
    q = rtSpot(W, L, 4.2); if (q) W.prop('cabin', q[0], q[1], { size: 8, rot: W.r(0, 6.28), surface: 'wood' });
    for (let i = 0; i < 2; i++) { q = rtSpot(W, L, 2); if (q) rtDiningSet(W, { x: q[0], z: q[1], rot: X.r() * 3, y: 0 }, 2.0, 0.9, RTM.wood(0x8a6a4c), RTM.wood(0x6a4a34)); }
    for (let i = 0; i < 6; i++) { q = rtSpot(W, L, 2, 8, 2); if (q) (X.kind === 'snow' ? W.pine(q[0], q[1], W.r(9, 14), { snow: true }) : W.pine(q[0], q[1], W.r(8, 13))); }
    q = rtSpot(W, L, 1.5); if (q) rtStringLights(W, q[0], q[1], q[0] + W.r(5, 8), q[1] + W.r(-3, 3), 3.0);
  },
  market(W, L, X) {
    if (X.r() < 0.45) {   // covered market hall: a roof on columns
      const w = W.r(14, 18), d = W.r(9, 12), q = rtSpot(W, L, Math.max(w, d) / 2 + 1, 12, Math.max(w, d) / 2 + 2);
      if (q) { for (let i = 0; i <= 4; i++) for (const s of [-1, 1]) W.box(q[0] - w / 2 + i * w / 4, 0, q[1] + s * d / 2, 0.35, 4.4, 0.35, M_(X.T.stone), { minimap: false }); W.box(q[0], 4.4, q[1], w + 1, 0.3, d + 1, X.roofM(), { collide: false }); for (let i = 0; i < 4; i++) rtStall(W, q[0] - w * 0.3 + (i % 2) * w * 0.6, q[1] - d * 0.2 + Math.floor(i / 2) * d * 0.4, 0, X.pk([0xd83a3a, 0x3a8ad8, 0xe8c030, 0x3ac87a])); W.lamp(q[0], 4.2, q[1], 0xffd8a0, { fixture: 'tube', real: X.r() < 0.4, intensity: 1.4, dist: 14, poolSize: 9, poolI: 0.3 }); reserve(q[0] - w / 2 - 1, q[1] - d / 2 - 1, q[0] + w / 2 + 1, q[1] + d / 2 + 1); }
    }
    W.patch(L.cx, L.cz, L.size * 0.7, 6, X.T.stone);
    for (let i = 0; i < 7; i++) { const q = rtSpot(W, L, 2.2); if (q) rtStall(W, q[0], q[1], X.r() < 0.5 ? 0 : Math.PI / 2, X.pk([0xd83a3a, 0x3a8ad8, 0xe8c030, 0x3ac87a, 0xc83ab0, 0xff8a3a])); }
    for (let i = 0; i < 2; i++) { const q = rtSpot(W, L, 1, 8, 4); if (q) rtStringLights(W, q[0], q[1], q[0] + W.r(6, 10), q[1] + W.r(-2, 2), 3.6); }
    lotProps(W, L, X.st, 2);
  },
  industrial(W, L, X) {
    const w = W.r(16, 22), d = W.r(12, 16), q = rtSpot(W, L, Math.max(w, d) / 2 + 1.5, 14, Math.max(w, d) / 2 + 2);
    if (q) { rtBuilding(W, q[0], q[1], w, d, { storeys: 1, h: 6, wall: M_('corrugated', { color: X.pk([0xa8a8a0, 0x8a9aa8, 0xb8a888]) }), roof: X.metalM(), door: X.pk(['n', 's', 'e', 'w']), terrace: true, curtains: false, stairM: RTM.metal(0x5a6068) }); reserve(q[0] - w / 2 - 2, q[1] - d / 2 - 2, q[0] + w / 2 + 2, q[1] + d / 2 + 2); }
    W.patch(L.cx, L.cz, L.size * 0.6, L.size * 0.6, X.T.road, { y: -0.004 });
    for (let i = 0; i < 4; i++) { const p = rtSpot(W, L, 4.4, 14, 5); if (p) X.container(p[0], p[1], X.r() < 0.5 ? 0 : Math.PI / 2, X.r() < 0.4); }
    let p = rtSpot(W, L, 3.2); if (p) W.prop('water_tank', p[0], p[1], { size: 4.6, axis: 'h', surface: 'metal' });
    if (X.r() < 0.4) { p = rtSpot(W, L, 2.2, 12, 6); if (p) rtCrane(W, p[0], p[1], W.r(18, 26)); }
    if (X.r() < 0.5) { p = rtSpot(W, L, 1.6); if (p) rtCyl(W, p[0], 0, p[1], 1.2, W.r(14, 20), M_('brick', { color: 0x9a6a5a }), { r1: 0.9 }); }
    lotProps(W, L, X.st, 2);
  },
  rooftop(W, L, X) {
    const n = 1 + (X.r() < 0.6 ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const w = W.r(10, 14), d = W.r(10, 13), p = rtSpot(W, L, Math.max(w, d) / 2 + 2.4, 18, Math.max(w, d) / 2 + 3); if (!p) continue;
      rtBuilding(W, p[0], p[1], w, d, { storeys: 1, h: W.r(3.6, 4.4), wall: X.T.wall(), roof: M_('tiles', { color: 0xb8b4ac }), door: X.pk(['n', 's', 'e', 'w']), terrace: true });
      reserve(p[0] - w / 2 - 2, p[1] - d / 2 - 2, p[0] + w / 2 + 2, p[1] + d / 2 + 2);
    }
    for (let i = 0; i < 2; i++) { const q = rtSpot(W, L, 1.6); if (q) rtPlant(W, q[0], q[1], 0, 1.3); }
    lotProps(W, L, X.st, 2);
  }
};

// ---------- centrepieces (the middle of the map, 48 x 48 m) ----------
const RT_CENTER = {
  park(W, X) { W.patch(0, 0, 46, 46, 'grass', { matOpts: { color: 0xb0d898 } }); W.patch(0, 0, 46, 3.5, X.T.stone); W.patch(0, 0, 3.5, 46, X.T.stone); rtFountain(W, 0, 0, 3.4); reserve(-5, -5, 5, 5); rtGazebo(W, 14, 14, 3.2); reserve(10, 10, 18, 18); for (let i = 0; i < 10; i++) { const x = W.r(-20, 20), z = W.r(-20, 20); if (isFree(x, z, 2.5)) deciduous(W, x, z, W.r(6, 10)); } for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283; rtBench(W, Math.cos(a) * 7, Math.sin(a) * 7, -a + Math.PI / 2); } for (const [x, z] of [[-9, -9], [9, -9], [-9, 9]]) rtLampPost(W, x, z, X.pk([0xffe0b0, 0xa8e8ff])); return true; },
  street(W, X) { W.patch(0, 0, 46, 8, X.T.road); W.patch(0, 0, 8, 46, X.T.road); reserve(-24, -4.5, 24, 4.5); reserve(-4.5, -24, 4.5, 24); for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { rtBuilding(W, sx * 13.5, sz * 13.5, 14, 14, { storeys: 3, wall: X.T.wall(), roof: X.roofM(), door: sz < 0 ? 's' : 'n', terrace: true, awning: X.pk([0xc83a3a, 0x2a6a3a, 0x2a4a8a]) }); reserve(sx * 13.5 - 8, sz * 13.5 - 8, sx * 13.5 + 8, sz * 13.5 + 8); } for (const [x, z] of [[-5.5, -5.5], [5.5, 5.5]]) rtLampPost(W, x, z, X.pk([0xffd8a0, 0xff9a60])); W.prop('bus_wreck', 0, 12, { size: 9, rot: 0.2, surface: 'metal' }); W.prop('car_wreck', -12, 0, { size: 4.4, rot: 1.6, surface: 'metal' }); return true; },
  residential(W, X) { W.patch(0, 0, 14, 14, X.T.road); reserve(-7, -7, 7, 7); for (let i = 0; i < 5; i++) { const a = i / 5 * 6.283 + 0.3, x = Math.cos(a) * 16, z = Math.sin(a) * 16, side = Math.abs(x) > Math.abs(z) ? (x > 0 ? 'w' : 'e') : (z > 0 ? 'n' : 's'); if (isFree(x, z, 6)) { rtBuilding(W, x, z, 10, 9, { storeys: X.r() < 0.5 ? 2 : 1, wall: M_('plaster', { color: X.pk([0xf0e8d8, 0xd8e0e8, 0xf0dcc8]) }), roof: X.roofM(), door: side, roofCol: X.pk([0xa04a3a, 0x5a5a62]) }); reserve(x - 6.5, z - 6, x + 6.5, z + 6); } } rtLampPost(W, 5, 5, 0xffe0b0); return true; },
  mansion(W, X) { RT_LOT.mansion(W, { r: { x0: -24, x1: 24, z0: -24, z1: 24 }, cx: 0, cz: 0, size: 48 }, X); return true; },
  festival(W, X) { rtStage(W, 0, -12, 0, X.pk([0xa81a2a, 0x2a1a5a])); reserve(-6, -18, 6, -6); for (let i = 0; i < 6; i++) rtStall(W, -15 + (i % 3) * 15, 6 + Math.floor(i / 3) * 9, 0, X.pk([0xd83a3a, 0x3a8ad8, 0xe8c030, 0x3ac87a, 0xc83ab0])); for (let i = 0; i < 3; i++) rtStringLights(W, -18 + i * 12, 2, -12 + i * 12, 16, 4); W.prop('tent', -18, -14, { size: 5, rot: 0.4, surface: 'wood' }); W.prop('tent', 18, -14, { size: 5, rot: -0.4, surface: 'wood' }); return true; },
  square(W, X) { W.patch(0, 0, 46, 46, X.T.stone); rtFountain(W, 0, 0, 3.2); reserve(-5, -5, 5, 5); stoneTower(W, 15, -15, 4.2, 14, M_(X.T.stone2), { lit: false }); reserve(11, -19, 19, -11); for (const [x, z, sd] of [[-14, -14, 's'], [-14, 14, 'n'], [14, 14, 'n']]) { rtBuilding(W, x, z, 12, 10, { storeys: 2, wall: X.T.wall(), roof: X.roofM(), door: sd, awning: X.pk([0xc83a3a, 0x2a6a3a, 0xd8a030]) }); reserve(x - 7.5, z - 6.5, x + 7.5, z + 6.5); } for (let i = 0; i < 4; i++) { const a = i / 4 * 6.283 + 0.78; rtBench(W, Math.cos(a) * 7, Math.sin(a) * 7, -a + Math.PI / 2); rtLampPost(W, Math.cos(a) * 9.5, Math.sin(a) * 9.5, 0xffd8a0); } return true; },
  boardwalk(W, X) { RT_LOT.boardwalk(W, { r: { x0: -24, x1: 24, z0: -24, z1: 24 }, cx: 0, cz: 0, size: 48 }, X); return true; },
  garden(W, X) { W.patch(0, 0, 46, 46, 'grass', { matOpts: { color: 0xa8d090 } }); rtGreenhouse(W, 0, -6, 16, 10); reserve(-9, -12, 9, 0); for (let i = 0; i < 8; i++) { const x = W.r(-20, 20), z = W.r(3, 20); if (isFree(x, z, 2.5)) rtFlowerBed(W, x, z, W.r(2, 4), W.r(1.5, 3)); } rtFountain(W, 0, 12, 2.2); for (const s of [-1, 1]) rtHedge(W, s * 16, 0, 14, Math.PI / 2, 1.2); return true; },
  chalet(W, X) { if (X.r() < 0.5) return false; for (let i = 0; i < 4; i++) { const x = (i % 2 ? 1 : -1) * 12, z = (i < 2 ? -1 : 1) * 12; rtBuilding(W, x, z, 9, 8, { storeys: 2, wall: M_('wood', { color: 0xb08a62 }), roof: M_('wood', { color: 0x6a4a34 }), door: z < 0 ? 's' : 'n', terrace: false, roofCol: 0x5a3a2a, railMat: RTM.wood(0x6a4a34) }); reserve(x - 5.5, z - 5, x + 5.5, z + 5); } stoneTower(W, 0, 0, 4, 12, M_(X.T.stone2), { lit: false }); reserve(-3, -3, 3, 3); return true; },
  farm(W, X) { RT_LOT.farm(W, { r: { x0: -24, x1: 24, z0: -24, z1: 24 }, cx: 0, cz: 0, size: 48 }, X); return true; },
  beach(W, X) { RT_LOT.beach(W, { r: { x0: -24, x1: 24, z0: -24, z1: 24 }, cx: 0, cz: 0, size: 48 }, X); return true; },
  campground(W, X) { RT_LOT.campground(W, { r: { x0: -24, x1: 24, z0: -24, z1: 24 }, cx: 0, cz: 0, size: 48 }, X); return true; },
  market(W, X) { RT_LOT.market(W, { r: { x0: -24, x1: 24, z0: -24, z1: 24 }, cx: 0, cz: 0, size: 48 }, X); return true; },
  industrial(W, X) { if (X.r() < 0.4) return false; RT_LOT.industrial(W, { r: { x0: -24, x1: 24, z0: -24, z1: 24 }, cx: 0, cz: 0, size: 48 }, X); return true; },
  rooftop(W, X) {
    // a plaza on a building's roof: a solid podium, two staircases up opposite sides, glass railings, planters,
    // skylights, a helipad
    const h = W.r(5.2, 6.4), s = 32, wall = X.T.wall();
    W.box(0, 0, 0, s, h, s, wall, { surface: 'concrete' });
    W.patch(0, 0, s, s, 'tiles', { y: h, matOpts: { color: 0xc8c4bc } });
    for (let i = -s / 2 + 3; i < s / 2 - 2; i += 3.2) for (const sd of [-1, 1]) W.box(i, 1.2, sd * (s / 2 + 0.03), 1.6, 1.4, 0.06, RTM.glow(0xfff0c8, 1.1), { collide: false, noShadow: true });
    const L = Math.max(3, Math.round(h / 0.24)) * 0.3, sw = 2.4;
    rtStairs(W, -L / 2, s / 2 + sw / 2 + 0.05, sw, h, '+x', M_('concrete', { color: 0xa8a49c }), { railSides: [1] });
    rtStairs(W, L / 2, -s / 2 - sw / 2 - 0.05, sw, h, '-x', M_('concrete', { color: 0xa8a49c }), { railSides: [-1] });
    W.box(L / 2 + 0.7, 0, s / 2 + sw / 2 + 0.05, 1.4, h, sw, M_('concrete', { color: 0xa8a49c }), { nav: true });
    W.box(-L / 2 - 0.7, 0, -s / 2 - sw / 2 - 0.05, 1.4, h, sw, M_('concrete', { color: 0xa8a49c }), { nav: true });
    reserve(-s / 2 - 3, -s / 2 - 4, s / 2 + 3, s / 2 + 4);
    const g = { glass: true, mat: RTM.metal(0xc8ccd0) };
    // railings round the top landings (open sides only: the stair side and the podium side stay open)
    { const zo = s / 2 + 0.05 + sw, x1 = L / 2 + 1.4; rtRail(W, L / 2, zo, x1, zo, h, g); rtRail(W, x1, s / 2, x1, zo, h, g); }
    { const zo = -s / 2 - 0.05 - sw, x1 = -L / 2 - 1.4; rtRail(W, x1, zo, -L / 2, zo, h, g); rtRail(W, x1, zo, x1, -s / 2, h, g); }
    rtRailGaps(W, -s / 2, s / 2, s / 2, s / 2, h, [[s / 2 + L / 2 - 1.2, s / 2 + L / 2 + 1.6]], g);
    rtRailGaps(W, -s / 2, -s / 2, s / 2, -s / 2, h, [[s / 2 - L / 2 - 1.6, s / 2 - L / 2 + 1.2]], g);
    rtRail(W, -s / 2, -s / 2, -s / 2, s / 2, h, g); rtRail(W, s / 2, -s / 2, s / 2, s / 2, h, g);
    W.box(8, h + 0.004, 8, 9, 0.012, 9, RTM.paint(0x3a3e44, { rough: 0.9 }), { collide: false, noShadow: true });
    W.box(8, h + 0.018, 8, 5, 0.01, 0.6, RTM.paint(0xe8e8e0), { collide: false, noShadow: true }); W.box(8, h + 0.018, 8, 0.6, 0.01, 5, RTM.paint(0xe8e8e0), { collide: false, noShadow: true });
    for (const [x, z] of [[-9, -9], [-9, 9], [9, -9], [0, 0]]) { const f = { x, z, rot: 0, y: h }; rtP(W, f, 0, 0.45, 0, 3, 0.9, 1.2, M_('concrete', { color: 0x9a9690 })); rtFoot(f, 1.5, 0.6, 0.9, 'concrete'); rtPlant(W, x - 0.8, z, h + 0.9, 0.8); rtPlant(W, x + 0.8, z, h + 0.9, 0.8); }
    for (const [x, z] of [[-4, 10], [4, -10]]) { const f = { x, z, rot: 0, y: h }; rtP(W, f, 0, 0.5, 0, 2.4, 1.0, 1.6, RTM.glass()); rtFoot(f, 1.2, 0.8, 1.0, 'glass'); }
    for (const [x, z] of [[-12, 0], [0, 12], [12, -4]]) { const f = { x, z, rot: 0, y: h }; rtP(W, f, 0, 0.6, 0, 1.6, 1.2, 1.2, RTM.metal(0x9aa0a4)); rtFoot(f, 0.8, 0.6, 1.2, 'metal'); }
    for (const [x, z] of [[-14, -14], [14, 14], [-14, 14]]) rtLampPost(W, x, z, X.pk([0xff5a8a, 0x40c8ff, 0xffd8a0]), { h: h + 3.4, real: 0.5 });
    radioTower(W, 13, -13, 9);
    return true;
  }
};

// ---------- 15 outdoor themes ----------
// terrain: the ground kinds the theme suits (the texture pool picks the ground before the theme is drawn)
const RT_OUT = [
  { key: 'park', label: 'CITY PARK', nouns: ['PARK', 'COMMONS', 'GREEN', 'MEADOWS'], terrain: ['grass', 'dirt', 'gravel', 'snow'], lots: { park: 4, residential: 1.2, street: 0.8, garden: 0.8 } },
  { key: 'street', label: 'URBAN STREET', nouns: ['STREET', 'AVENUE', 'BOULEVARD', 'DISTRICT'], terrain: ['grass', 'dirt', 'gravel', 'sand', 'snow'], lots: { street: 4, rooftop: 1.2, square: 0.8, market: 0.6 } },
  { key: 'residential', label: 'RESIDENTIAL NEIGHBORHOOD', nouns: ['HEIGHTS', 'ESTATES', 'LANE', 'SUBURBS'], terrain: ['grass', 'dirt', 'gravel', 'snow'], lots: { residential: 4.5, park: 1, street: 0.8 } },
  { key: 'mansion', label: 'MANSION LAWN & GARDEN', nouns: ['MANOR', 'ESTATE', 'GROUNDS', 'GARDENS'], terrain: ['grass', 'dirt', 'gravel'], lots: { garden: 2.2, park: 2, mansion: 1.2, residential: 1 } },
  { key: 'festival', label: 'FESTIVAL GROUNDS', nouns: ['FESTIVAL', 'FAIRGROUNDS', 'CARNIVAL', 'JAMBOREE'], terrain: ['grass', 'dirt', 'sand', 'gravel'], lots: { festival: 4, market: 1.5, campground: 1, park: 0.8 } },
  { key: 'square', label: 'TOWN SQUARE', nouns: ['SQUARE', 'PLAZA', 'PIAZZA', 'COMMONS'], terrain: ['grass', 'dirt', 'gravel', 'sand', 'snow'], lots: { square: 2.5, street: 2, market: 1.2, residential: 1 } },
  { key: 'boardwalk', label: 'WATERFRONT BOARDWALK', nouns: ['BOARDWALK', 'WHARF', 'PIER', 'HARBOR'], terrain: ['sand', 'grass', 'dirt', 'gravel'], lots: { boardwalk: 3.5, beach: 1.2, market: 1, street: 0.8 } },
  { key: 'garden', label: 'BOTANICAL GARDEN', nouns: ['GARDENS', 'CONSERVATORY', 'ARBORETUM', 'GREENHOUSE'], terrain: ['grass', 'dirt'], lots: { garden: 4, park: 1.6, orchard: 0.8 } },
  { key: 'chalet', label: 'MOUNTAIN VILLAGE', nouns: ['VILLAGE', 'HAMLET', 'PASS', 'CHALETS'], terrain: ['snow', 'grass', 'dirt', 'gravel'], lots: { chalet: 4, campground: 1, farm: 0.6 } },
  { key: 'farm', label: 'FARM & ORCHARD', nouns: ['FARM', 'ORCHARD', 'RANCH', 'HOMESTEAD'], terrain: ['grass', 'dirt', 'gravel'], lots: { farm: 2.6, orchard: 2.4, residential: 0.8 } },
  { key: 'beach', label: 'BEACH', nouns: ['BEACH', 'COVE', 'SHORE', 'BAY'], terrain: ['sand', 'grass', 'dirt'], lots: { beach: 4, boardwalk: 1.4, festival: 0.6 } },
  { key: 'campground', label: 'FOREST CAMPGROUND', nouns: ['CAMPGROUND', 'TRAILHEAD', 'CAMP', 'RETREAT'], terrain: ['grass', 'dirt', 'snow', 'gravel'], lots: { campground: 4, chalet: 0.8, festival: 0.4 } },
  { key: 'market', label: 'MARKET', nouns: ['MARKET', 'BAZAAR', 'SOUK', 'EXCHANGE'], terrain: ['sand', 'dirt', 'gravel', 'grass'], lots: { market: 4, street: 1.4, square: 1 } },
  { key: 'industrial', label: 'INDUSTRIAL YARD', nouns: ['YARD', 'WORKS', 'FOUNDRY', 'DOCKYARD'], terrain: ['gravel', 'dirt', 'sand', 'snow', 'grass'], lots: { industrial: 4, street: 0.8, rooftop: 0.6 } },
  { key: 'rooftop', label: 'ROOFTOP PLAZA', nouns: ['ROOFTOP', 'SKYDECK', 'TERRACE', 'PLAZA'], terrain: ['gravel', 'grass', 'dirt', 'sand', 'snow'], lots: { rooftop: 3.5, street: 1.8, square: 0.8 } }
];
function rtPickOutdoor(kind) {
  const fit = RT_OUT.filter(t => t.terrain.includes(kind));
  return pickFresh(fit.length ? fit : RT_OUT, 'outdoor15');
}
