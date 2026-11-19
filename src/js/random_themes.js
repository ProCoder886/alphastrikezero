// ---------- Random Ops themes: 15 indoor location themes (outdoor themes: random_themes_out.js) ----------
// Every deployment draws a theme, then randomises the structure on top of it: building size and proportions, the
// layout (an atrium or a hall with an upper gallery, a grid of rooms, corridors), ceiling height, wall / floor /
// ceiling materials, door and curtain colours, lamp colours and what stands in every room. Recurring features:
// staircases with railings up to galleries, terraces and attics, basements down a stairwell, open doors in many
// colours, curtains, and lamps in different light colours. Each map gets a two-word name ("ASYLUM LIBRARY").

// ---------- small toolkit ----------
const RT_ACCENT = [0xff5a8a, 0x40c8ff, 0xffb040, 0x7aff8a, 0xb070ff, 0xff6a40, 0x40ffd8, 0xffe060];
const RT_PREFIX = ['ASYLUM', 'CRIMSON', 'IRON', 'SILENT', 'NORTHGATE', 'HARBOR', 'GRAND', 'OLD', 'ROYAL', 'EMPIRE', 'MIDNIGHT', 'EASTSIDE', 'CENTRAL',
  'LIBERTY', 'OBSIDIAN', 'VELVET', 'SAINT', 'COPPER', 'MAPLE', 'CEDAR', 'RAVEN', 'WESTWOOD', 'IVORY', 'GOLDEN', 'BLACKSTONE', 'SUNSET', 'ORCHID',
  'HIGHLAND', 'RIVERSIDE', 'EMBER', 'ONYX', 'SILVER', 'LANTERN', 'PHOENIX', 'ATLAS', 'VANGUARD', 'SPECTER', 'FALCON', 'WINTER', 'STERLING', 'SCARLET',
  'HOLLOW', 'MERIDIAN', 'AURORA', 'KESTREL', 'GRANITE', 'WILLOW', 'BRAMBLE', 'CORAL', 'JADE'];
function rtName(r, nouns) {
  const n = nouns[Math.floor(r() * nouns.length)];
  let p = RT_PREFIX[Math.floor(r() * RT_PREFIX.length)];
  if (p === n) p = RT_PREFIX[(RT_PREFIX.indexOf(p) + 7) % RT_PREFIX.length];
  return p + ' ' + n;
}
const RTM = {
  paint: (c, o) => MATLIB.plain(c, Object.assign({ rough: 0.55, metal: 0.05, surface: 'wood' }, o || {})),
  metal: (c) => MATLIB.plain(c === undefined ? 0x6a7078 : c, { rough: 0.38, metal: 0.8, surface: 'metal' }),
  cloth: (c) => MATLIB.plain(c, { rough: 0.95, metal: 0, double: true, surface: 'wood' }),
  glass: () => MATLIB.plain(0xa8c4d8, { rough: 0.05, metal: 0.5, opacity: 0.3, surface: 'glass' }),
  wood: (c) => M_('wood', { color: c === undefined ? 0x9a7a5c : c }),
  dark: () => MATLIB.plain(0x1c2026, { rough: 0.5, metal: 0.4 }),
  white: () => MATLIB.plain(0xe0e0d8, { rough: 0.7, surface: 'wood' }),
  glow: (c, i) => MATLIB.emissive(c, i === undefined ? 2.4 : i)
};
const _rtM = new THREE.Matrix4(), _rtQ = new THREE.Quaternion(), _rtP = new THREE.Vector3(), _rtS = new THREE.Vector3(1, 1, 1), _rtUp = new THREE.Vector3(0, 1, 0);
function rtAddGeo(geo, mat, x, y, z, rot, o) {
  _rtQ.setFromAxisAngle(_rtUp, rot || 0); _rtM.compose(_rtP.set(x, y, z), _rtQ, _rtS.set(1, 1, 1));
  STATIC.add(geo, mat, _rtM, Object.assign({ keepUV: true }, o || {})); geo.dispose();
}
// part in a local frame f = {x, z, rot, y (base)}: ly is the centre height above the base
function rtP(W, f, lx, ly, lz, sx, sy, sz, mat, o) { return W._part(f, lx, (f.y || 0) + ly, lz, sx, sy, sz, mat, o); }
// footprint collider of a piece of furniture (in a basement it also blocks the AI's grid)
function rtFoot(f, hw, hd, h, surface, o = {}) {
  const c = Math.abs(Math.cos(f.rot || 0)), s = Math.abs(Math.sin(f.rot || 0)), ex = hw * c + hd * s, ez = hw * s + hd * c, y = f.y || 0;
  return addCollider(f.x - ex, f.x + ex, y, y + h, f.z - ez, f.z + ez, Object.assign({ surface, nav: y < -0.5 ? true : undefined }, o));
}
function rtCyl(W, x, y, z, r0, h, mat, o = {}) {
  const g = new THREE.CylinderGeometry(o.r1 === undefined ? r0 : o.r1, r0, h, o.seg || 14); g.translate(0, h / 2, 0);
  if (o.rotX) g.rotateX(o.rotX);
  rtAddGeo(g, mat, x, y, z, o.rot || 0);
  if (o.collide !== false) addCollider(x - r0 * 0.85, x + r0 * 0.85, y, y + h, z - r0 * 0.85, z + r0 * 0.85, { surface: o.surface || 'metal', nav: o.nav === undefined ? (y < -0.5 ? true : undefined) : o.nav, shot: o.shot });
}

// railing along an axis-aligned line at height y: posts, top and middle rail (glass panel optional); one thin
// collider stops falls, bullets pass
function rtRail(W, x0, z0, x1, z1, y, o = {}) {
  const L = Math.hypot(x1 - x0, z1 - z0); if (L < 0.25) return;
  const mat = o.mat || MATLIB.plain(0x2a2d32, { rough: 0.35, metal: 0.85 }), h = o.h || 1.05;
  const ax = Math.abs(x1 - x0) >= Math.abs(z1 - z0), cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  W.box(cx, y + h - 0.06, cz, ax ? L : 0.07, 0.06, ax ? 0.07 : L, mat, { collide: false, noShadow: true });
  W.box(cx, y + h * 0.48, cz, ax ? L : 0.035, 0.035, ax ? 0.035 : L, mat, { collide: false, noShadow: true });
  const n = Math.max(1, Math.round(L / 1.25));
  for (let i = 0; i <= n; i++) { const t = i / n; W.box(x0 + (x1 - x0) * t, y, z0 + (z1 - z0) * t, 0.055, h, 0.055, mat, { collide: false, noShadow: true }); }
  if (o.glass) W.box(cx, y + 0.1, cz, ax ? L : 0.025, h - 0.24, ax ? 0.025 : L, RTM.glass(), { collide: false, noShadow: true });
  if (o.collide !== false) addCollider(ax ? Math.min(x0, x1) : cx - 0.06, ax ? Math.max(x0, x1) : cx + 0.06, y, y + h, ax ? cz - 0.06 : Math.min(z0, z1), ax ? cz + 0.06 : Math.max(z0, z1), { shot: false, surface: 'metal', minimap: false, nav: o.nav });
}
// railing with gaps (gaps: [[a, b]] along the line, measured from its start)
function rtRailGaps(W, x0, z0, x1, z1, y, gaps, o) {
  const L = Math.hypot(x1 - x0, z1 - z0), ux = (x1 - x0) / (L || 1), uz = (z1 - z0) / (L || 1);
  const g = gaps.slice().sort((a, b) => a[0] - b[0]); let cur = 0;
  for (const [a, b] of g) { if (a > cur) rtRail(W, x0 + ux * cur, z0 + uz * cur, x0 + ux * a, z0 + uz * a, y, o); cur = Math.max(cur, b); }
  if (cur < L) rtRail(W, x0 + ux * cur, z0 + uz * cur, x1, z1, y, o);
}
// staircase rising along dir ('+x' / '-x' / '+z' / '-z') from (x, z) on floor y0 by `height`; solid steps (the AI
// never paths onto them) and a sloped handrail on both sides. Returns its length.
function rtStairs(W, x, z, width, height, dir, mat, o = {}) {
  const y0 = o.y || 0, n = Math.max(3, Math.round(height / 0.24)), stepH = height / n, stepL = o.stepL || 0.3, L = n * stepL;
  const ax = dir === '+x' || dir === '-x', sg = dir[0] === '+' ? 1 : -1;
  for (let i = 0; i < n; i++) {
    const off = stepL * (i + 0.5) * sg;
    W.box(ax ? x + off : x, y0, ax ? z : z + off, ax ? stepL : width, stepH * (i + 1), ax ? width : stepL, mat, { nav: true, minimap: i === n - 1, surface: o.surface });
  }
  if (o.rails !== false) {
    const rm = o.railMat || MATLIB.plain(0x2a2d32, { rough: 0.35, metal: 0.85 }), Lr = Math.hypot(L, height), a = Math.atan2(height, L);
    for (const s of (o.railSides || [-1, 1])) {
      const cx = ax ? x + sg * L / 2 : x + s * (width / 2 - 0.05), cz = ax ? z + s * (width / 2 - 0.05) : z + sg * L / 2;
      W.box(cx, y0 + height / 2 + 0.92 - 0.03, cz, ax ? Lr : 0.06, 0.06, ax ? 0.06 : Lr, rm, { collide: false, noShadow: true, rotZ: ax ? sg * a : 0, rotX: ax ? 0 : -sg * a });
      for (let k = 0; k <= 3; k++) { const t = k / 3; W.box(ax ? x + sg * L * t : x + s * (width / 2 - 0.05), y0 + height * t, ax ? z + s * (width / 2 - 0.05) : z + sg * L * t, 0.05, 0.95, 0.05, rm, { collide: false, noShadow: true }); }
    }
  }
  return L;
}
// stairs going down from floor level at (x, z) along dir to -depth (walkable for the AI: they lead to a basement)
function rtStairsDown(W, x, z, width, depth, dir, mat) {
  const n = Math.max(3, Math.round(depth / 0.24)), stepH = depth / n, stepL = 0.3, ax = dir === '+x' || dir === '-x', sg = dir[0] === '+' ? 1 : -1;
  for (let i = 0; i < n - 1; i++) {
    const off = stepL * (i + 0.5) * sg, top = -stepH * (i + 1);
    W.box(ax ? x + off : x, -depth, ax ? z : z + off, ax ? stepL : width, depth + top, ax ? width : stepL, mat, { minimap: false, nav: false });
  }
  return n * stepL;
}
// an open door leaf in a doorway: wall from (x0, z0) to (x1, z1), opening centred `at` metres along it
function rtDoor(W, x0, z0, x1, z1, at, dw, dh, color, o = {}) {
  const r = W.rnd, ax = Math.abs(x1 - x0) >= Math.abs(z1 - z0), ux = ax ? Math.sign(x1 - x0) || 1 : 0, uz = ax ? 0 : Math.sign(z1 - z0) || 1;
  const yb = o.y || 0, trim = o.trim || RTM.paint(0xe8e2d8), leafM = RTM.paint(color, { rough: 0.45 });
  // frame: two jambs and a lintel
  for (const s of [-1, 1]) { const a = at + s * (dw / 2 + 0.04); W.box(x0 + ux * a, yb, z0 + uz * a, ax ? 0.08 : 0.42, dh + 0.05, ax ? 0.42 : 0.08, trim, { collide: false, noShadow: true }); }
  W.box(x0 + ux * at, yb + dh, z0 + uz * at, ax ? dw + 0.16 : 0.42, 0.1, ax ? 0.42 : dw + 0.16, trim, { collide: false, noShadow: true });
  if (dw > 3.2) return;   // wide openings: frame only
  const hingeA = at + (r() < 0.5 ? -1 : 1) * (dw / 2 - 0.04), hx = x0 + ux * hingeA, hz = z0 + uz * hingeA;
  const side = r() < 0.5 ? -1 : 1, open = W.r(1.25, 1.75), toward = hingeA < at ? 1 : -1;   // leaf turns from the closed position about the hinge
  const cx0 = ux * toward, cz0 = uz * toward;   // closed direction (along the wall into the opening)
  const nx = -cz0 * side, nz = cx0 * side;      // swing side
  const dx = cx0 * Math.cos(open) + nx * Math.sin(open), dz = cz0 * Math.cos(open) + nz * Math.sin(open);
  const lw = dw - 0.1, px = hx + dx * lw / 2, pz = hz + dz * lw / 2, rot = Math.atan2(-dz, dx);
  W.box(px, yb, pz, lw, dh - 0.04, 0.05, leafM, { collide: false, rot });
  W.box(hx + dx * (lw - 0.12) - nx * 0.05, yb + 1.0, hz + dz * (lw - 0.12) - nz * 0.05, 0.12, 0.03, 0.06, RTM.metal(0xc8b070), { collide: false, rot, noShadow: true });
  addCollider(Math.min(hx, hx + dx * lw) - 0.04, Math.max(hx, hx + dx * lw) + 0.04, yb, yb + dh, Math.min(hz, hz + dz * lw) - 0.04, Math.max(hz, hz + dz * lw) + 0.04, { surface: 'wood', nav: false, minimap: false });
}
// draped curtain: a folded cloth panel (rot: angle of the panel about the vertical)
function rtCurtain(W, x, z, y, w, h, rot, color, o = {}) {
  const folds = Math.max(3, Math.round(w * (o.dense ? 5 : 3.5))), g = new THREE.PlaneGeometry(w, h, folds * 2, 2), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const u = p.getX(i), v = p.getY(i); p.setZ(i, Math.sin((u / w + 0.5) * folds * Math.PI * 2) * 0.075 * (1 + (0.5 - v / h) * (o.gather ? 0.8 : 0.2))); }
  g.computeVertexNormals();
  rtAddGeo(g, RTM.cloth(color), x, y + h / 2, z, rot);
  if (o.rod !== false) W.box(x, y + h + 0.02, z, Math.abs(Math.cos(rot)) * w + 0.12, 0.04, Math.abs(Math.sin(rot)) * w + 0.12, RTM.metal(0x8a7a5a), { collide: false, noShadow: true });
}
// open floor at ground level (ceilings and upper floors do not count): reserved areas, walls, props, bounds
function rtFree(x, z, rad) {
  const b = WORLD.bounds;
  if (x < b.x0 + 1.5 || x > b.x1 - 1.5 || z < b.z0 + 1.5 || z > b.z1 - 1.5) return false;
  FREEGRID.sync();
  return !FREEGRID.hit(FREEGRID.rcells, x - rad, z - rad, x + rad, z + rad) && !FREEGRID.hit(FREEGRID.cells, x - rad, z - rad, x + rad, z + rad, (c) => c.y0 < 2.2 && c.y1 > 0.05);
}
function rtLampColor(C) { return C.r() < 0.26 ? C.pk(RT_ACCENT) : C.pk(C.T.lamps); }

// ---------- furniture ----------
function rtTable(W, f, w, d, top, leg, h = 0.76) {
  rtP(W, f, 0, h - 0.025, 0, w, 0.05, d, top);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) rtP(W, f, sx * (w / 2 - 0.07), (h - 0.05) / 2, sz * (d / 2 - 0.07), 0.05, h - 0.05, 0.05, leg);
  rtFoot(f, w / 2, d / 2, h, 'wood');
}
function rtChairAt(W, x, z, rot, y, mat) {
  const f = { x, z, rot, y: y || 0 }, seat = mat || RTM.wood(0x6a4a34), frame = MATLIB.plain(0x2e3136, { rough: 0.4, metal: 0.75 });
  rtP(W, f, 0, 0.46, 0, 0.44, 0.05, 0.44, seat); rtP(W, f, 0, 0.76, -0.2, 0.44, 0.56, 0.05, seat);
  for (const [lx, lz] of [[-0.19, -0.19], [0.19, -0.19], [-0.19, 0.19], [0.19, 0.19]]) rtP(W, f, lx, 0.22, lz, 0.03, 0.44, 0.03, frame);
}
function rtDiningSet(W, f, w, d, top, chairM) {
  rtTable(W, f, w, d, top, top);
  const c = Math.cos(f.rot), s = Math.sin(f.rot), n = Math.max(1, Math.floor(w / 0.75));
  for (let i = 0; i < n; i++) for (const sd of [-1, 1]) {
    const lx = -w / 2 + (i + 0.5) * w / n, lz = sd * (d / 2 + 0.35);
    rtChairAt(W, f.x + lx * c + lz * s, f.z - lx * s + lz * c, f.rot + (sd > 0 ? Math.PI : 0), f.y, chairM);
  }
}
function rtShelf(W, f, len, h, mat, books) {
  const dp = 0.42, n = Math.max(3, Math.round(h / 0.42));
  rtP(W, f, 0, h / 2, -dp / 2 + 0.02, len, h, 0.04, mat);
  for (const s of [-1, 1]) rtP(W, f, s * len / 2, h / 2, 0, 0.05, h, dp, mat);
  for (let i = 0; i <= n; i++) rtP(W, f, 0, i * (h - 0.05) / n + 0.025, 0, len, 0.04, dp, mat);
  if (books) for (let i = 0; i < n; i++) {
    const y0 = i * (h - 0.05) / n + 0.05, sh = (h - 0.05) / n - 0.08; let px = -len / 2 + 0.05;
    while (px < len / 2 - 0.2) { const bw = W.r(0.22, 0.6), bh = sh * W.r(0.72, 0.96); if (W.rnd() < 0.88) rtP(W, f, px + bw / 2, y0 + bh / 2, 0.02, bw - 0.02, bh, dp * W.r(0.62, 0.86), books[Math.floor(W.rnd() * books.length)]); px += bw; }
  }
  rtFoot(f, len / 2, dp / 2, h, 'wood');
}
function rtCounter(W, f, len, body, top, o = {}) {
  rtP(W, f, 0, 0.52, 0, len, 1.04, 0.66, body); rtP(W, f, 0, 1.07, 0, len + 0.06, 0.06, 0.78, top);
  if (o.glass) rtP(W, f, 0, 1.62, -0.12, len, 1.0, 0.03, RTM.glass());
  if (o.screens) for (let i = -len / 2 + 0.8; i < len / 2 - 0.4; i += 1.6) rtP(W, f, i, 1.34, 0.14, 0.46, 0.3, 0.04, RTM.glow(o.screens, 1.4));
  rtFoot(f, len / 2, 0.4, 1.1, 'wood');
}
function rtSeats(W, f, n, color, o = {}) {
  const sp = o.sp || 0.58, L = n * sp, seat = RTM.paint(color, { rough: 0.8 }), frame = MATLIB.plain(0x2a2a2e, { rough: 0.4, metal: 0.7 });
  rtP(W, f, 0, 0.44, 0, L, 0.09, 0.5, seat); rtP(W, f, 0, 0.78, 0.23, L, 0.62, 0.07, seat);
  for (let i = 0; i <= n; i++) rtP(W, f, -L / 2 + i * sp, 0.36, 0, 0.05, 0.72, 0.48, frame);
  rtFoot(f, L / 2, 0.3, 0.95, 'wood');
}
function rtBed(W, f, sheet, frameM) {
  const fr = frameM || RTM.wood(0x5a3e2a);
  rtP(W, f, 0, 0.24, 0, 1.0, 0.48, 2.0, fr); rtP(W, f, 0, 0.55, 0.06, 0.96, 0.16, 1.84, RTM.paint(sheet, { rough: 0.9 }));
  rtP(W, f, 0, 0.67, -0.76, 0.72, 0.1, 0.32, RTM.white()); rtP(W, f, 0, 0.6, -0.98, 1.0, 1.15, 0.07, fr);
  rtFoot(f, 0.5, 1.0, 0.7, 'wood');
}
function rtSofa(W, f, color, len = 2.1) {
  const m = RTM.paint(color, { rough: 0.92 });
  rtP(W, f, 0, 0.22, 0, len, 0.44, 0.86, m); rtP(W, f, 0, 0.6, -0.34, len, 0.62, 0.2, m);
  for (const s of [-1, 1]) rtP(W, f, s * (len / 2 - 0.1), 0.45, 0, 0.2, 0.5, 0.86, m);
  rtFoot(f, len / 2, 0.44, 0.9, 'wood');
}
function rtCase(W, f, glow) {
  rtP(W, f, 0, 0.45, 0, 1.0, 0.9, 1.0, RTM.paint(0x1e1e22, { rough: 0.4 }));
  rtP(W, f, 0, 1.25, 0, 0.96, 0.7, 0.96, RTM.glass());
  rtP(W, f, 0, 1.08, 0, 0.32, 0.3, 0.22, RTM.glow(glow || 0xffd890, 1.6));
  rtFoot(f, 0.5, 0.5, 1.6, 'glass');
}
function rtStatue(W, f, stone) {
  const m = stone || M_('fortress', { color: 0xe0dcd4 });
  rtP(W, f, 0, 0.55, 0, 1.0, 1.1, 1.0, m); rtP(W, f, 0, 1.55, 0, 0.5, 0.9, 0.32, m); rtP(W, f, 0, 2.15, 0, 0.62, 0.3, 0.36, m);
  rtP(W, f, 0, 2.48, 0, 0.26, 0.32, 0.26, m); rtP(W, f, 0.38, 1.9, 0, 0.14, 0.62, 0.14, m); rtP(W, f, -0.38, 1.9, 0, 0.14, 0.62, 0.14, m);
  rtFoot(f, 0.5, 0.5, 2.6, 'rock');
}
function rtPlant(W, x, z, y = 0, s = 1) {
  rtCyl(W, x, y, z, 0.28 * s, 0.5 * s, RTM.paint(0x8a5a3a, { rough: 0.8 }), { r1: 0.34 * s, seg: 10 });
  const g = new THREE.IcosahedronGeometry(0.55 * s, 1); g.scale(1, 1.3, 1); rtAddGeo(g, M_('leaves', { color: 0x4a7a3a }), x, y + 0.5 * s + 0.55 * s, z, 0);
}
function rtLockers(W, f, n, color) {
  const m = RTM.paint(color, { rough: 0.5, metal: 0.4 }), L = n * 0.42;
  rtP(W, f, 0, 0.95, 0, L, 1.9, 0.5, m);
  for (let i = 0; i < n; i++) rtP(W, f, -L / 2 + (i + 0.5) * 0.42, 1.0, 0.255, 0.02, 1.7, 0.01, RTM.dark());
  rtFoot(f, L / 2, 0.25, 1.9, 'metal');
}
// a flat thing on a wall: board, painting, screen, mirror (x, z = point on the wall face, rot = the wall's facing)
function rtBoard(W, x, z, y, w, h, rot, mat, frame) {
  if (frame) W.box(x, y - 0.06, z, w + 0.12, h + 0.12, 0.05, frame, { collide: false, rot, noShadow: true });
  W.box(x, y, z, w, h, 0.07, mat, { collide: false, rot, noShadow: true });
}
function rtRug(W, x, z, w, d, color, y = 0) { W.box(x, y + 0.003, z, w, 0.014, d, RTM.paint(color, { rough: 0.98 }), { collide: false, noShadow: true }); }
function rtChandelier(W, x, y, z, color, o = {}) {
  const gold = RTM.metal(0xc8a050);
  W.box(x, y, z, 0.05, o.drop || 0.9, 0.05, gold, { collide: false, noShadow: true });
  const ring = new THREE.TorusGeometry(0.55, 0.035, 6, 20); ring.rotateX(Math.PI / 2); rtAddGeo(ring, gold, x, y - 0.02, z, 0, { noShadow: true });
  for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283; W.box(x + Math.cos(a) * 0.55, y + 0.04, z + Math.sin(a) * 0.55, 0.07, 0.12, 0.07, RTM.glow(color, 3.4), { collide: false, noShadow: true }); }
  W.lamp(x, y - 0.05, z, color, { fixture: 'bulb', real: o.real !== false, intensity: 1.7, dist: 18, poolSize: 9, poolI: 0.34, floorY: o.floorY || 0, ceilGlow: false });
}
function rtFountain(W, x, z, R = 2.2, y = 0) {
  const stone = M_('fortress', { color: 0xd8d4cc });
  const ring = new THREE.CylinderGeometry(R, R + 0.1, 0.55, 28, 1, true); ring.translate(0, 0.275, 0); rtAddGeo(ring, stone, x, y, z, 0);
  const lip = new THREE.TorusGeometry(R, 0.14, 6, 28); lip.rotateX(Math.PI / 2); rtAddGeo(lip, stone, x, y + 0.55, z, 0);
  W.water(x, z, R * 1.7, R * 1.7, y + 0.42, { walk: true, color: 0x2a5a6a });
  rtCyl(W, x, y, z, 0.32, 1.6, stone, { r1: 0.18, collide: false });
  const top = new THREE.CylinderGeometry(0.75, 0.25, 0.25, 16); rtAddGeo(top, stone, x, y + 1.6, z, 0);
  addCollider(x - R * 0.85, x + R * 0.85, y, y + 0.68, z - R * 0.85, z + R * 0.85, { surface: 'rock' });
}
function rtKiosk(W, f, color) {
  rtP(W, f, 0, 0.55, 0, 2.2, 1.1, 1.4, RTM.paint(0xe8e4dc)); rtP(W, f, 0, 1.12, 0, 2.3, 0.05, 1.5, RTM.wood(0x8a6a4c));
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) rtP(W, f, sx * 1.05, 1.55, sz * 0.65, 0.06, 0.9, 0.06, RTM.metal(0x4a4e54));
  rtP(W, f, 0, 2.06, 0, 2.6, 0.1, 1.8, RTM.paint(color)); rtP(W, f, 0, 2.2, 0.72, 1.6, 0.26, 0.04, RTM.glow(color, 2.2));
  rtFoot(f, 1.1, 0.72, 1.15, 'wood');
}
function rtBoiler(W, x, z, y = 0) {
  const m = RTM.metal(W.rnd() < 0.5 ? 0x7a3a2a : 0x5a6a5a);
  rtCyl(W, x, y, z, 0.75, 2.4, m, { seg: 16 });
  const cap = new THREE.SphereGeometry(0.75, 14, 6, 0, 6.283, 0, Math.PI / 2); rtAddGeo(cap, m, x, y + 2.4, z, 0);
  W.box(x, y + 1.0, z + 0.78, 0.3, 0.3, 0.12, RTM.glow(W.rnd() < 0.5 ? 0xff4020 : 0x40ff80, 2), { collide: false, noShadow: true });
}
function rtCrates(W, x, z, y, n, rot) {
  const m = RTM.wood(0xb09070), band = RTM.wood(0x5e4632);
  for (let i = 0; i < n; i++) {
    const s = W.r(0.7, 1.05), f = { x: x + (i % 2) * 1.1 * Math.cos(rot), z: z - (i % 2) * 1.1 * Math.sin(rot), rot: rot + W.r(-0.15, 0.15), y: y + (i >= 2 ? 1.0 : 0) };
    rtP(W, f, 0, s / 2, 0, s, s, s, m); rtP(W, f, 0, s * 0.5, 0, s + 0.02, 0.08, s + 0.02, band);
    if (i < 2) rtFoot(f, s / 2, s / 2, n > 2 ? 2 : s, 'wood');
  }
}

// ---------- room contents ----------
// Every function fills a room rect rm = {x, z, w, d, y} (y: floor level, below 0 in a basement) for theme context C.
const RT_ROOM = {
  office(W, rm, C) {
    const n = 2 + Math.floor(C.r() * 3), desk = RTM.wood(C.pk([0x8a6a4c, 0xd8d0c4, 0x4a3a2c]));
    for (let i = 0; i < n; i++) {
      const f = { x: rm.x - rm.w * 0.3 + (i % 2) * rm.w * 0.55, z: rm.z - rm.d * 0.22 + Math.floor(i / 2) * rm.d * 0.42, rot: C.r() < 0.5 ? 0 : Math.PI, y: rm.y };
      rtTable(W, f, 1.6, 0.8, desk, RTM.metal(0x3a3e44));
      rtP(W, f, 0, 1.0, -0.15, 0.55, 0.36, 0.04, RTM.glow(C.pk([0x60b0ff, 0x80ffc0, 0xffffff]), 1.2));
      rtChairAt(W, f.x + Math.sin(f.rot) * 0.7, f.z + Math.cos(f.rot) * 0.7, f.rot + Math.PI, rm.y);
    }
    rtLockers(W, { x: rm.x + rm.w / 2 - 0.5, z: rm.z, rot: Math.PI / 2, y: rm.y }, 4, C.pk([0x6a7078, 0x8a9098, 0x4a5a6a]));
  },
  meeting(W, rm, C) {
    const f = { x: rm.x, z: rm.z, rot: rm.w > rm.d ? 0 : Math.PI / 2, y: rm.y };
    rtDiningSet(W, f, Math.min(4.2, Math.max(rm.w, rm.d) * 0.4), 1.3, RTM.wood(C.pk([0x5a3e2a, 0xd8d0c4])), RTM.paint(0x22262c));
    rtBoard(W, rm.x, rm.z - rm.d / 2 + 0.3, (rm.y || 0) + 1.2, 2.2, 1.2, 0, RTM.glow(0x3a6aa0, 1.2), RTM.dark());
    rtPlant(W, rm.x + rm.w / 2 - 1, rm.z + rm.d / 2 - 1, rm.y);
  },
  cubicles(W, rm, C) {
    const pm = RTM.paint(C.pk([0x7a8a9a, 0x9a8a7a, 0x6a7a6a]), { rough: 0.9 }), desk = RTM.wood(0xd8d0c4);
    for (let ix = -1; ix <= 1; ix += 2) for (let iz = -1; iz <= 1; iz += 2) {
      const x = rm.x + ix * rm.w * 0.22, z = rm.z + iz * rm.d * 0.2, y = rm.y || 0;
      W.box(x, y, z - 0.9, 2.4, 1.3, 0.06, pm, { surface: 'wood' }); W.box(x - 1.2, y, z, 0.06, 1.3, 1.8, pm, { surface: 'wood' });
      rtTable(W, { x: x + 0.1, z: z - 0.45, rot: 0, y }, 1.8, 0.7, desk, RTM.metal(0x3a3e44));
      rtChairAt(W, x + 0.1, z + 0.2, Math.PI, y);
    }
  },
  servers(W, rm, C) {
    const dark = RTM.dark();
    for (let i = 0; i < 3; i++) { const bx = rm.x - rm.w * 0.25 + i * rm.w * 0.25, len = Math.min(rm.d * 0.6, 6), y = rm.y || 0; W.box(bx, y, rm.z, 0.9, 2.1, len, dark, { surface: 'metal' }); W.box(bx + 0.46, y + 1.4, rm.z, 0.02, 0.05, len * 0.9, RTM.glow(i % 2 ? 0x30ff80 : 0x40a0ff, 3), { collide: false }); }
  },
  storage(W, rm, C) {
    rtCrates(W, rm.x - rm.w * 0.25, rm.z - rm.d * 0.2, rm.y || 0, 2 + Math.floor(C.r() * 3), C.r() * 3);
    rtCrates(W, rm.x + rm.w * 0.22, rm.z + rm.d * 0.22, rm.y || 0, 2, C.r() * 3);
    rtShelf(W, { x: rm.x - rm.w / 2 + 0.5, z: rm.z, rot: -Math.PI / 2, y: rm.y }, Math.min(4, rm.d * 0.5), 2.2, RTM.metal(0x5a6068), null);
    if (!(rm.y < 0)) barrelCluster(W, rm.x + rm.w * 0.25, rm.z - rm.d * 0.25, 2 + Math.floor(C.r() * 2));
  },
  racks(W, rm, C) { if (rm.y < 0) return RT_ROOM.storage(W, rm, C); rackRow(W, rm.x, rm.z - rm.d * 0.2, 0); rackRow(W, rm.x, rm.z + rm.d * 0.2, 0); },
  machines(W, rm, C) {
    if (rm.y < 0) { rtBoiler(W, rm.x - rm.w * 0.2, rm.z, rm.y); rtBoiler(W, rm.x + rm.w * 0.2, rm.z + rm.d * 0.1, rm.y); return; }
    W.prop('generator', rm.x - rm.w * 0.2, rm.z, { size: 2.6, rot: C.r() * 6 }); W.prop('water_tank', rm.x + rm.w * 0.22, rm.z + rm.d * 0.15, { size: 3, axis: 'h' }); barrelCluster(W, rm.x + rm.w * 0.25, rm.z - rm.d * 0.28, 2);
  },
  boiler(W, rm, C) {
    rtBoiler(W, rm.x - rm.w * 0.25, rm.z - rm.d * 0.15, rm.y || 0); rtBoiler(W, rm.x + rm.w * 0.1, rm.z - rm.d * 0.2, rm.y || 0);
    const pipe = MATLIB.plain(0x4a3a30, { rough: 0.5, metal: 0.8 }), y = (rm.y || 0) + (rm.top || 3) - 0.5;
    W.box(rm.x, y, rm.z + rm.d * 0.3, rm.w - 0.6, 0.22, 0.22, pipe, { collide: false }); W.box(rm.x + rm.w * 0.3, y - 0.3, rm.z, 0.16, 0.16, rm.d - 0.6, RTM.metal(0x7a7e82), { collide: false });
    rtCrates(W, rm.x + rm.w * 0.28, rm.z + rm.d * 0.15, rm.y || 0, 2, 0.3);
  },
  cells(W, rm, C) {
    const metal = RTM.metal(0x6a7078), y = rm.y || 0, H = Math.min(3.2, (rm.top || 3.4) - 0.3);
    for (let i = 0; i < 3; i++) {
      const cx = rm.x - rm.w * 0.33 + i * rm.w * 0.33;
      for (let b = -4; b <= 4; b++) W.box(cx + b * 0.32, y, rm.z - rm.d * 0.12, 0.05, H, 0.05, metal, { collide: false });
      addCollider(cx - 1.4, cx + 1.4, y, y + H, rm.z - rm.d * 0.12 - 0.05, rm.z - rm.d * 0.12 + 0.05, { surface: 'metal', shot: false, nav: y < 0 ? true : undefined });
      rtBed(W, { x: cx, z: rm.z - rm.d * 0.36, rot: Math.PI / 2, y }, 0x8a8a7a, metal);
    }
  },
  guard(W, rm, C) {
    rtTable(W, { x: rm.x, z: rm.z, rot: C.r() * 3, y: rm.y }, 1.8, 0.9, RTM.wood(0x6a5a4a), RTM.metal());
    rtLockers(W, { x: rm.x + rm.w / 2 - 0.4, z: rm.z - rm.d * 0.1, rot: Math.PI / 2, y: rm.y }, 5, 0x4a5a4a);
    rtBoard(W, rm.x, rm.z - rm.d / 2 + 0.3, (rm.y || 0) + 1.5, 1.8, 0.9, 0, RTM.glow(0x40ff90, 1.2), RTM.dark());
  },
  armory(W, rm, C) {
    rtLockers(W, { x: rm.x - rm.w / 2 + 0.4, z: rm.z, rot: -Math.PI / 2, y: rm.y }, 6, 0x3a4a3a);
    for (let i = 0; i < 3; i++) rtShelf(W, { x: rm.x - rm.w * 0.15 + i * 1.4, z: rm.z - rm.d / 2 + 0.4, rot: 0, y: rm.y }, 1.2, 1.9, RTM.metal(0x4a4e54), null);
    rtCrates(W, rm.x + rm.w * 0.25, rm.z + rm.d * 0.2, rm.y || 0, 3, C.r() * 3);
  },
  barracks(W, rm, C) {
    const metal = RTM.metal(0x5a6a5a);
    for (let i = 0; i < 3; i++) { const f = { x: rm.x - rm.w * 0.3 + i * 2.6, z: rm.z - rm.d * 0.3, rot: 0, y: rm.y }; rtBed(W, f, 0x5a6a4a, metal); }
    rtTable(W, { x: rm.x, z: rm.z + rm.d * 0.18, rot: C.r() * 3, y: rm.y }, 1.6, 0.8, RTM.wood(), metal);
  },
  ward(W, rm, C) {
    const n = Math.max(2, Math.min(4, Math.floor(rm.w / 2.8))), cur = C.pk(C.T.curtains);
    for (let i = 0; i < n; i++) {
      const x = rm.x - rm.w / 2 + (i + 0.5) * rm.w / n, z = rm.z - rm.d * 0.22;
      rtBed(W, { x, z, rot: 0, y: rm.y }, C.pk([0xe8f0f0, 0xb8d8e8, 0xd8e8d8]), RTM.metal(0xc8ccd0));
      if (i < n - 1) rtCurtain(W, x + rm.w / n / 2, z, (rm.y || 0) + 0.3, 2.2, 1.9, Math.PI / 2, cur, { gather: true });
      W.box(x + 0.7, rm.y || 0, z - 0.8, 0.04, 1.8, 0.04, RTM.metal(0xd0d4d8), { collide: false });
    }
    rtCounter(W, { x: rm.x, z: rm.z + rm.d * 0.32, rot: 0, y: rm.y }, Math.min(3, rm.w * 0.4), RTM.white(), RTM.paint(0x8ab0c0));
  },
  surgery(W, rm, C) {
    const f = { x: rm.x, z: rm.z, rot: 0, y: rm.y }, st = RTM.metal(0xc8ccd0);
    rtP(W, f, 0, 0.5, 0, 0.7, 1.0, 2.0, st); rtP(W, f, 0, 1.03, 0, 0.66, 0.08, 1.9, RTM.paint(0x5a9a8a));
    rtFoot(f, 0.4, 1.0, 1.1, 'metal');
    const top = (rm.y || 0) + (rm.top || 3.4) - 0.2;
    W.box(rm.x, top - 0.9, rm.z, 0.06, 0.9, 0.06, st, { collide: false });
    const disc = new THREE.CylinderGeometry(0.45, 0.45, 0.08, 18); rtAddGeo(disc, RTM.glow(0xf4fbff, 3.2), rm.x, top - 0.95, rm.z, 0, { noShadow: true });
    W.lamp(rm.x, top - 1.0, rm.z, 0xf4fbff, { fixture: 'bulb', real: true, intensity: 1.9, dist: 12, poolSize: 6, poolI: 0.45, floorY: rm.y || 0, ceilGlow: false });
    for (let i = 0; i < 3; i++) W.box(rm.x - rm.w / 2 + 0.45, rm.y || 0, rm.z - 1.2 + i * 1.2, 0.6, 1.9, 1.0, st, { surface: 'metal' });
  },
  morgue(W, rm, C) {
    const st = RTM.metal(0xb8bcc0);
    for (let i = 0; i < 2; i++) { const f = { x: rm.x - 1.2 + i * 2.4, z: rm.z, rot: 0, y: rm.y }; rtP(W, f, 0, 0.45, 0, 0.8, 0.9, 2.0, st); rtFoot(f, 0.4, 1.0, 0.95, 'metal'); }
    const wy = rm.y || 0;
    W.box(rm.x, wy, rm.z - rm.d / 2 + 0.45, Math.min(rm.w - 1, 5), 2.2, 0.8, st, { surface: 'metal', nav: wy < 0 ? true : undefined });
    for (let i = 0; i < 4; i++) for (let k = 0; k < 3; k++) W.box(rm.x - 1.8 + i * 1.2, wy + 0.3 + k * 0.65, rm.z - rm.d / 2 + 0.86, 0.9, 0.5, 0.03, RTM.metal(0x8a8e92), { collide: false });
  },
  waiting(W, rm, C) {
    const col = C.pk([0x3a6aa0, 0x8a2a3a, 0x2a7a5a, 0xc89a30]);
    for (let i = 0; i < 3; i++) rtSeats(W, { x: rm.x, z: rm.z - rm.d * 0.25 + i * 1.6, rot: 0, y: rm.y }, Math.max(3, Math.floor(rm.w * 0.45 / 0.58)), col);
    rtPlant(W, rm.x - rm.w / 2 + 0.9, rm.z + rm.d / 2 - 0.9, rm.y); rtPlant(W, rm.x + rm.w / 2 - 0.9, rm.z - rm.d / 2 + 0.9, rm.y);
  },
  reception(W, rm, C) {
    rtCounter(W, { x: rm.x, z: rm.z - rm.d * 0.15, rot: 0, y: rm.y }, Math.min(5, rm.w * 0.5), RTM.wood(C.pk([0x5a3e2a, 0xd8d0c4, 0x2a2e34])), RTM.paint(0x1e1e22), { screens: 0x60b0ff });
    rtSofa(W, { x: rm.x - rm.w * 0.25, z: rm.z + rm.d * 0.28, rot: Math.PI, y: rm.y }, C.pk([0x6a2a2a, 0x2a3a5a, 0x5a5a5a]));
    rtPlant(W, rm.x + rm.w * 0.32, rm.z + rm.d * 0.3, rm.y, 1.2);
    rtBoard(W, rm.x, rm.z - rm.d / 2 + 0.3, (rm.y || 0) + 2.0, 2.6, 0.5, 0, RTM.glow(C.pk(RT_ACCENT), 2.2));
  },
  suite(W, rm, C) {
    rtBed(W, { x: rm.x - rm.w * 0.2, z: rm.z - rm.d * 0.2, rot: 0, y: rm.y }, C.pk([0xe8e0d0, 0x8a2a3a, 0x2a4a6a, 0xd8c8a0]));
    rtSofa(W, { x: rm.x + rm.w * 0.22, z: rm.z + rm.d * 0.25, rot: Math.PI, y: rm.y }, C.pk([0x6a4a3a, 0x3a3a4a, 0x7a6a4a]));
    rtRug(W, rm.x, rm.z + rm.d * 0.05, rm.w * 0.5, rm.d * 0.4, C.pk([0x7a2a2a, 0x2a3a5a, 0x5a4a3a, 0x3a5a4a]), rm.y);
    const cc = C.pk(C.T.curtains); rtCurtain(W, rm.x + rm.w * 0.15, rm.z - rm.d / 2 + 0.3, (rm.y || 0) + 0.05, Math.min(3, rm.w * 0.4), Math.min(2.8, (rm.top || 3.2) - 0.4), 0, cc, { dense: true });
    W.box(rm.x + rm.w / 2 - 0.4, rm.y || 0, rm.z - rm.d * 0.2, 0.6, 2.1, 1.4, RTM.wood(0x6a4a34), { surface: 'wood', nav: (rm.y || 0) < 0 ? true : undefined });
  },
  bedroom(W, rm, C) { RT_ROOM.suite(W, rm, C); rtTable(W, { x: rm.x + rm.w * 0.3, z: rm.z - rm.d * 0.32, rot: 0, y: rm.y }, 1.2, 0.6, RTM.wood(0x6a4a34), RTM.wood(0x6a4a34)); },
  lounge(W, rm, C) {
    const col = C.pk([0x6a2a2a, 0x2a3a5a, 0x4a3a2a, 0x2a5a4a]);
    rtRug(W, rm.x, rm.z, rm.w * 0.55, rm.d * 0.5, C.pk([0x7a2a2a, 0x2a3a5a, 0x5a4a3a]), rm.y);
    rtSofa(W, { x: rm.x, z: rm.z - rm.d * 0.2, rot: 0, y: rm.y }, col, 2.4); rtSofa(W, { x: rm.x, z: rm.z + rm.d * 0.2, rot: Math.PI, y: rm.y }, col, 2.4);
    rtTable(W, { x: rm.x, z: rm.z, rot: 0, y: rm.y }, 1.3, 0.7, RTM.wood(0x3a2a1e), RTM.wood(0x3a2a1e), 0.45);
    rtCounter(W, { x: rm.x + rm.w / 2 - 0.8, z: rm.z, rot: Math.PI / 2, y: rm.y }, Math.min(4, rm.d * 0.5), RTM.wood(0x4a2e1e), RTM.paint(0x1e1e22));
    rtPlant(W, rm.x - rm.w / 2 + 0.9, rm.z - rm.d / 2 + 0.9, rm.y, 1.2);
  },
  dining(W, rm, C) {
    rtDiningSet(W, { x: rm.x, z: rm.z, rot: rm.w > rm.d ? 0 : Math.PI / 2, y: rm.y }, Math.min(5, Math.max(rm.w, rm.d) * 0.45), 1.2, RTM.wood(0x4a2e1e), RTM.wood(0x6a4a34));
    if (!(rm.y < 0)) rtChandelier(W, rm.x, (rm.top || 3.4) - 0.1, rm.z, C.pk([0xffe0b0, 0xfff0d0]), { drop: 0.6 });
    rtRug(W, rm.x, rm.z, rm.w * 0.62, rm.d * 0.55, C.pk([0x6a1a1a, 0x1a2a4a, 0x4a3a1a]), rm.y);
  },
  kitchen(W, rm, C) {
    const st = RTM.metal(0xb8bcc0);
    rtCounter(W, { x: rm.x, z: rm.z - rm.d / 2 + 0.5, rot: 0, y: rm.y }, rm.w - 1.4, st, st);
    rtCounter(W, { x: rm.x, z: rm.z + rm.d * 0.1, rot: 0, y: rm.y }, Math.min(3.6, rm.w * 0.4), st, M_('tiles', { color: 0xe8e8e0 }));
    for (let i = 0; i < 2; i++) W.box(rm.x + rm.w / 2 - 0.5, rm.y || 0, rm.z + rm.d * 0.1 + i * 1.0, 0.8, 2.0, 0.8, RTM.white(), { surface: 'metal' });
  },
  canteen(W, rm, C) {
    for (let i = 0; i < 2; i++) for (let k = 0; k < 2; k++) rtDiningSet(W, { x: rm.x - rm.w * 0.22 + i * rm.w * 0.44, z: rm.z - rm.d * 0.18 + k * rm.d * 0.4, rot: 0, y: rm.y }, 2.2, 0.9, RTM.paint(C.pk([0xd8d0c4, 0x8ab0c0, 0xc8a070])), RTM.paint(C.pk([0x3a6aa0, 0xc84a3a, 0x3a8a5a])));
  },
  vault(W, rm, C) {
    const st = RTM.metal(0x8a8e94), y = rm.y || 0, wz = rm.z - rm.d / 2 + 0.45;
    W.box(rm.x - rm.w * 0.2, y, wz - 0.25, 3.2, Math.min(3.0, (rm.top || 3) - 0.05), 0.5, st, { surface: 'metal', nav: y < 0 ? true : undefined });
    const door = new THREE.CylinderGeometry(1.25, 1.25, 0.45, 28); door.rotateX(Math.PI / 2); rtAddGeo(door, RTM.metal(0xb0b4b8), rm.x - rm.w * 0.2, y + 1.35, wz + 0.25, 0);
    for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283; W.box(rm.x - rm.w * 0.2 + Math.cos(a) * 0.5, y + 1.3 + Math.sin(a) * 0.5, wz + 0.5, 0.08, 0.08, 0.16, RTM.metal(0xd8c070), { collide: false }); }
    for (let i = 0; i < 5; i++) for (let k = 0; k < 4; k++) W.box(rm.x + rm.w * 0.12 + i * 0.5, y + 0.25 + k * 0.5, wz + 0.05, 0.46, 0.44, 0.1, st, { collide: false, noShadow: true });
    W.box(rm.x + rm.w * 0.22, y, wz - 0.15, 2.6, 2.3, 0.4, st, { surface: 'metal', nav: y < 0 ? true : undefined });
    const gold = MATLIB.plain(0xe8b830, { rough: 0.3, metal: 1, surface: 'metal' });
    for (let i = 0; i < 2; i++) { const f = { x: rm.x - rm.w * 0.15 + i * 2.2, z: rm.z + rm.d * 0.15, rot: 0, y }; rtTable(W, f, 1.4, 0.8, st, st, 0.8); for (let k = 0; k < 6; k++) rtP(W, f, -0.4 + (k % 3) * 0.4, 0.86 + Math.floor(k / 3) * 0.09, -0.15 + Math.floor(k / 3) * 0.1, 0.32, 0.08, 0.14, gold); }
  },
  teller(W, rm, C) {
    rtCounter(W, { x: rm.x, z: rm.z - rm.d * 0.1, rot: 0, y: rm.y }, rm.w - 2, RTM.wood(0x4a2e1e), M_('tiles', { color: 0xd8d4cc }), { glass: true, screens: 0x60ff9a });
    for (let i = 0; i < 4; i++) W.box(rm.x - rm.w * 0.3 + i * rm.w * 0.2, rm.y || 0, rm.z + rm.d * 0.25, 0.06, 1.0, 0.06, RTM.metal(0xc8a050), { collide: false });
    W.box(rm.x, (rm.y || 0) + 0.85, rm.z + rm.d * 0.25, rm.w * 0.6, 0.04, 0.04, RTM.cloth(0x8a1a2a), { collide: false });
  },
  deposit(W, rm, C) {
    const st = RTM.metal(0x9a9ea4), y = rm.y || 0;
    for (const s of [-1, 1]) { W.box(rm.x + s * (rm.w / 2 - 0.4), y, rm.z, 0.6, 2.4, rm.d - 1.4, st, { surface: 'metal' }); for (let i = 0; i < 6; i++) for (let k = 0; k < 5; k++) W.box(rm.x + s * (rm.w / 2 - 0.72), y + 0.2 + k * 0.45, rm.z - rm.d / 2 + 1.2 + i * (rm.d - 2.4) / 5, 0.03, 0.4, 0.5, RTM.metal(0xc8ccd0), { collide: false, noShadow: true }); }
    rtTable(W, { x: rm.x, z: rm.z, rot: 0, y }, 2.0, 0.9, st, st);
  },
  reading(W, rm, C) {
    const tbl = RTM.wood(0x4a2e1e);
    for (let i = 0; i < 2; i++) { const f = { x: rm.x, z: rm.z - rm.d * 0.18 + i * rm.d * 0.36, rot: 0, y: rm.y }; rtDiningSet(W, f, Math.min(3.2, rm.w * 0.5), 1.0, tbl, RTM.wood(0x6a4a34)); for (const s of [-1, 1]) rtP(W, f, s * 0.6, 0.98, 0, 0.3, 0.12, 0.18, RTM.glow(0x40c870, 1.8)); }
    rtShelf(W, { x: rm.x, z: rm.z - rm.d / 2 + 0.35, rot: 0, y: rm.y }, rm.w - 1.2, Math.min(2.8, (rm.top || 3.4) - 0.4), RTM.wood(0x5a3e2a), C.books);
  },
  stacks(W, rm, C) {
    const n = Math.max(2, Math.floor(rm.d / 2.4)), h = Math.min(2.6, (rm.top || 3.4) - 0.5);
    for (let i = 0; i < n; i++) rtShelf(W, { x: rm.x, z: rm.z - rm.d / 2 + 1.4 + i * (rm.d - 2.4) / Math.max(1, n - 1), rot: 0, y: rm.y }, Math.min(rm.w - 3, 7), h, RTM.wood(C.pk([0x5a3e2a, 0x7a5a3a, 0x3a2a1e])), C.books);
  },
  exhibit(W, rm, C) {
    const n = Math.max(2, Math.min(4, Math.floor(rm.w / 3)));
    for (let i = 0; i < n; i++) rtCase(W, { x: rm.x - rm.w / 2 + (i + 0.5) * rm.w / n, z: rm.z + (i % 2 ? 0.8 : -0.8), rot: 0, y: rm.y }, C.pk([0xffd890, 0x90d8ff, 0xffa0c0]));
    const fr = RTM.paint(0xc8a050, { metal: 0.6 });
    for (let i = 0; i < 2; i++) rtBoard(W, rm.x - rm.w * 0.22 + i * rm.w * 0.44, rm.z - rm.d / 2 + 0.28, (rm.y || 0) + 1.4, 1.6, 1.1, 0, RTM.paint(C.pk([0x6a3a2a, 0x2a4a6a, 0x4a6a3a, 0x8a6a2a])), fr);
  },
  statues(W, rm, C) {
    rtStatue(W, { x: rm.x - rm.w * 0.2, z: rm.z, rot: C.r() * 6, y: rm.y }); rtStatue(W, { x: rm.x + rm.w * 0.2, z: rm.z + rm.d * 0.1, rot: C.r() * 6, y: rm.y });
    rtSeats(W, { x: rm.x, z: rm.z + rm.d * 0.32, rot: 0, y: rm.y }, 4, 0x3a2a1e);
  },
  classroom(W, rm, C) {
    const desk = RTM.wood(0xc8a878), leg = RTM.metal(0x4a5a7a), rows = 3, cols = Math.max(2, Math.min(4, Math.floor(rm.w / 2.4)));
    for (let i = 0; i < rows; i++) for (let k = 0; k < cols; k++) { const x = rm.x - rm.w * 0.32 + k * rm.w * 0.64 / Math.max(1, cols - 1), z = rm.z - rm.d * 0.1 + i * 1.5; rtTable(W, { x, z, rot: 0, y: rm.y }, 1.1, 0.55, desk, leg, 0.72); rtChairAt(W, x, z + 0.55, Math.PI, rm.y, RTM.paint(C.pk([0x3a6aa0, 0xc84a3a, 0xe0a030]))); }
    rtBoard(W, rm.x, rm.z - rm.d / 2 + 0.28, (rm.y || 0) + 1.1, Math.min(4, rm.w * 0.5), 1.2, 0, RTM.paint(0x1e4a32, { rough: 0.95 }), RTM.wood(0x6a4a34));
    rtTable(W, { x: rm.x + rm.w * 0.25, z: rm.z - rm.d * 0.32, rot: 0, y: rm.y }, 1.4, 0.7, RTM.wood(0x6a4a34), RTM.wood(0x6a4a34));
  },
  lockers(W, rm, C) {
    for (const s of [-1, 1]) rtLockers(W, { x: rm.x, z: rm.z + s * (rm.d / 2 - 0.4), rot: s > 0 ? Math.PI : 0, y: rm.y }, Math.floor((rm.w - 2) / 0.42), C.pk([0x3a6aa0, 0xb83a3a, 0x3a8a5a, 0xd8a030]));
    rtSeats(W, { x: rm.x, z: rm.z, rot: 0, y: rm.y }, 5, 0x8a6a4c);
  },
  gym(W, rm, C) {
    for (const s of [-1, 1]) { const x = rm.x + s * (rm.w / 2 - 0.8), y = rm.y || 0; W.box(x, y, rm.z, 0.15, 3.0, 0.15, RTM.metal(0x2a2a2e)); W.box(x - s * 0.3, y + 2.9, rm.z, 0.06, 1.0, 1.6, RTM.paint(0xe8e8e8), { collide: false }); W.box(x - s * 0.6, y + 2.95, rm.z, 0.45, 0.03, 0.45, RTM.paint(0xff6020), { collide: false }); }
    for (let i = 0; i < 3; i++) W.box(rm.x - rm.w * 0.2 + i * 1.6, rm.y || 0, rm.z + rm.d * 0.3, 1.4, 0.12, 2.0, RTM.paint(0x2a4a8a, { rough: 0.9 }), { collide: false });
  },
  shop(W, rm, C) {
    const col = C.pk([0xc83a3a, 0x3a6ac8, 0x3ac87a, 0xe0b030, 0xc83ab0]);
    for (let i = 0; i < 2; i++) rtShelf(W, { x: rm.x - rm.w * 0.18 + i * rm.w * 0.36, z: rm.z, rot: 0, y: rm.y }, Math.min(3.2, rm.w * 0.3), 1.7, RTM.paint(0xe8e4dc), [RTM.paint(col), RTM.paint(0xe8e8e8), RTM.paint(0x2a2a2a), RTM.paint(C.pk(RT_ACCENT))]);
    rtCounter(W, { x: rm.x + rm.w * 0.28, z: rm.z + rm.d * 0.3, rot: Math.PI, y: rm.y }, 2.4, RTM.paint(col), RTM.paint(0x1e1e22), { screens: 0xffffff });
    for (let i = 0; i < 2; i++) { const f = { x: rm.x - rm.w * 0.3 + i * 0.9, z: rm.z + rm.d * 0.3, rot: 0, y: rm.y }; rtP(W, f, 0, 0.95, 0, 0.36, 1.1, 0.24, RTM.paint(0xe0e0d8)); rtP(W, f, 0, 1.65, 0, 0.2, 0.26, 0.2, RTM.paint(0xe0e0d8)); rtFoot(f, 0.2, 0.15, 1.8, 'wood'); }
  },
  foodcourt(W, rm, C) {
    for (let i = 0; i < 3; i++) for (let k = 0; k < 2; k++) { const f = { x: rm.x - rm.w * 0.3 + i * rm.w * 0.3, z: rm.z - rm.d * 0.15 + k * rm.d * 0.35, rot: 0, y: rm.y }; rtTable(W, f, 0.9, 0.9, RTM.paint(0xe8e4dc), RTM.metal()); for (const s of [-1, 1]) rtChairAt(W, f.x + s * 0.7, f.z, s > 0 ? -Math.PI / 2 : Math.PI / 2, rm.y, RTM.paint(C.pk(RT_ACCENT))); }
    rtKiosk(W, { x: rm.x, z: rm.z - rm.d / 2 + 1.2, rot: 0, y: rm.y }, C.pk(RT_ACCENT));
  },
  gate(W, rm, C) {
    const col = C.pk([0x2a4a8a, 0x5a5a62, 0x8a2a3a]);
    for (let i = 0; i < 3; i++) for (const s of [-1, 1]) rtSeats(W, { x: rm.x + s * rm.w * 0.2, z: rm.z - rm.d * 0.2 + i * 1.7, rot: 0, y: rm.y }, 5, col);
    rtCounter(W, { x: rm.x, z: rm.z + rm.d * 0.36, rot: Math.PI, y: rm.y }, 2.6, RTM.paint(0xe8e4dc), RTM.paint(0x2a2e34), { screens: 0xffb040 });
    rtBoard(W, rm.x, rm.z - rm.d / 2 + 0.3, (rm.y || 0) + 2.1, 2.8, 0.8, 0, RTM.glow(0xffb040, 1.4), RTM.dark());
  },
  checkin(W, rm, C) {
    rtCounter(W, { x: rm.x, z: rm.z - rm.d * 0.2, rot: 0, y: rm.y }, rm.w - 2, RTM.paint(0xd8dce0), RTM.paint(0x2a2e34), { screens: 0x60b0ff });
    for (let i = 0; i < 5; i++) W.box(rm.x - rm.w * 0.36 + i * rm.w * 0.18, rm.y || 0, rm.z + rm.d * 0.15, 0.06, 1.0, 0.06, RTM.metal(0xc8ccd0), { collide: false });
    W.box(rm.x, (rm.y || 0) + 0.9, rm.z + rm.d * 0.15, rm.w * 0.72, 0.05, 0.03, RTM.cloth(0x2a4ab0), { collide: false });
  },
  baggage(W, rm, C) {
    const y = rm.y || 0, L = Math.min(rm.w - 3, 9), D = Math.min(rm.d - 3, 3.6), belt = RTM.paint(0x22262a, { rough: 0.6 }), st = RTM.metal(0xb8bcc0);
    W.box(rm.x, y, rm.z, L, 0.55, D, st, { surface: 'metal' }); W.box(rm.x, y + 0.55, rm.z, L - 0.3, 0.05, D - 0.3, belt, { collide: false });
    rtCrates(W, rm.x + L / 2 + 0.8, rm.z, y, 2, 0.2);
  },
  ticket(W, rm, C) {
    for (let i = 0; i < 3; i++) { const f = { x: rm.x - rm.w * 0.3 + i * rm.w * 0.3, z: rm.z - rm.d * 0.3, rot: 0, y: rm.y }; rtP(W, f, 0, 0.9, 0, 0.8, 1.8, 0.6, RTM.paint(C.pk([0xc83a3a, 0x3a6ac8, 0x2a8a5a]))); rtP(W, f, 0, 1.3, 0.31, 0.5, 0.4, 0.02, RTM.glow(0x60b0ff, 1.5)); rtFoot(f, 0.4, 0.3, 1.8, 'metal'); }
    rtSeats(W, { x: rm.x, z: rm.z + rm.d * 0.2, rot: 0, y: rm.y }, 6, 0x6a4a34);
  },
  dressing(W, rm, C) {
    const y = rm.y || 0;
    rtCounter(W, { x: rm.x, z: rm.z - rm.d / 2 + 0.45, rot: 0, y: rm.y }, rm.w - 1.6, RTM.wood(0x5a3e2a), RTM.paint(0x1e1e22));
    for (let i = 0; i < 3; i++) { const x = rm.x - rm.w * 0.3 + i * rm.w * 0.3; rtBoard(W, x, rm.z - rm.d / 2 + 0.3, y + 1.3, 0.9, 0.9, 0, MATLIB.plain(0xc8d8e8, { rough: 0.05, metal: 0.9 })); for (let k = 0; k < 5; k++) W.box(x - 0.5 + k * 0.25, y + 2.28, rm.z - rm.d / 2 + 0.36, 0.07, 0.07, 0.07, RTM.glow(0xffe0a0, 3.5), { collide: false, noShadow: true }); }
    for (let i = 0; i < 2; i++) rtCurtain(W, rm.x - rm.w * 0.2 + i * rm.w * 0.4, rm.z + rm.d * 0.2, y + 0.15, 1.6, 1.6, 0, C.pk(C.T.curtains), { rod: true });
  },
  props(W, rm, C) {
    rtCrates(W, rm.x - rm.w * 0.2, rm.z, rm.y || 0, 3, C.r() * 3);
    for (let i = 0; i < 3; i++) W.box(rm.x + rm.w * 0.1 + i * 0.6, rm.y || 0, rm.z - rm.d * 0.3 + i * 0.3, 1.8, 2.6, 0.08, RTM.paint(C.pk([0x5a7a4a, 0x8a5a3a, 0x3a5a8a])), { rot: C.r() * 0.6, surface: 'wood', collide: i === 0 });
    rtCurtain(W, rm.x + rm.w * 0.25, rm.z + rm.d * 0.3, (rm.y || 0) + 0.1, 2.2, 1.8, Math.PI / 2, C.pk(C.T.curtains));
  },
  music(W, rm, C) {
    const f = { x: rm.x - rm.w * 0.15, z: rm.z - rm.d * 0.1, rot: C.r() * 0.6, y: rm.y }, blk = RTM.paint(0x101012, { rough: 0.25, metal: 0.2 });
    rtP(W, f, 0, 0.62, 0, 1.5, 0.35, 1.8, blk); rtP(W, f, 0, 0.3, -0.6, 0.12, 0.6, 0.12, blk); rtP(W, f, 0.6, 0.3, 0.6, 0.12, 0.6, 0.12, blk); rtP(W, f, -0.6, 0.3, 0.6, 0.12, 0.6, 0.12, blk);
    rtP(W, f, 0, 0.83, 0.92, 1.4, 0.06, 0.18, RTM.white()); rtFoot(f, 0.8, 0.95, 1.0, 'wood');
    for (let i = 0; i < 4; i++) rtChairAt(W, rm.x + rm.w * 0.15 + (i % 2) * 1.2, rm.z + rm.d * 0.1 + Math.floor(i / 2) * 1.3, Math.PI, rm.y);
    rtCurtain(W, rm.x, rm.z - rm.d / 2 + 0.3, (rm.y || 0) + 0.05, rm.w * 0.7, Math.min(3, (rm.top || 3.4) - 0.4), 0, C.pk(C.T.curtains), { dense: true });
  },
  fireplace(W, rm, C) {
    const y = rm.y || 0, st = M_('fortress', { color: 0xc8c0b0 }), z = rm.z - rm.d / 2 + 0.55;
    W.box(rm.x, y, z, 2.2, 1.3, 0.8, st); W.box(rm.x, y + 1.3, z - 0.1, 1.6, Math.max(0.5, (rm.top || 3.2) - 1.3), 0.5, st, { collide: false });
    W.fire(rm.x, y + 0.2, z + 0.42, 0.55, { floorY: y });
    rtSofa(W, { x: rm.x, z: rm.z + rm.d * 0.15, rot: Math.PI, y: rm.y }, C.pk([0x6a2a2a, 0x3a2a1a, 0x2a3a2a]), 2.4);
    rtRug(W, rm.x, rm.z - rm.d * 0.05, 3.2, 2.2, C.pk([0x7a1a1a, 0x1a2a5a]), rm.y);
  },
  wine(W, rm, C) {
    const wood = RTM.wood(0x5a3a22), y = rm.y || 0;
    for (let i = 0; i < 4; i++) { const x = rm.x - rm.w * 0.32 + i * rm.w * 0.21; rtCyl(W, x, y + 0.55, rm.z - rm.d * 0.25, 0.5, 1.1, wood, { rotX: Math.PI / 2, collide: false }); rtFoot({ x, z: rm.z - rm.d * 0.25, rot: 0, y }, 0.55, 0.6, 1.1, 'wood'); }
    rtShelf(W, { x: rm.x, z: rm.z + rm.d / 2 - 0.35, rot: Math.PI, y: rm.y }, rm.w - 1.5, 2.0, wood, [RTM.paint(0x2a1a14), RTM.paint(0x3a2a1a)]);
  },
  pipes(W, rm, C) { RT_ROOM.boiler(W, rm, C); },
  archive(W, rm, C) {
    for (let i = 0; i < 3; i++) rtShelf(W, { x: rm.x, z: rm.z - rm.d * 0.3 + i * rm.d * 0.3, rot: 0, y: rm.y }, Math.min(rm.w - 2, 6), 2.2, RTM.metal(0x6a7078), [RTM.paint(0xc8b88a), RTM.paint(0xa89870), RTM.paint(0x8a7a5a)]);
  },
  stage(W, rm, C) {   // small rehearsal stage
    const y = rm.y || 0, z = rm.z - rm.d * 0.25;
    W.box(rm.x, y, z, rm.w * 0.7, 0.6, rm.d * 0.35, RTM.wood(0x3a2a1e), { surface: 'wood' });
    rtCurtain(W, rm.x, z - rm.d * 0.17, y + 0.6, rm.w * 0.7, Math.min(2.6, (rm.top || 3.4) - 0.9), 0, C.pk(C.T.curtains), { dense: true });
    for (let i = 0; i < 2; i++) rtSeats(W, { x: rm.x, z: rm.z + rm.d * 0.12 + i * 1.3, rot: 0, y: rm.y }, Math.floor(rm.w * 0.5 / 0.58), C.pk([0x8a1a2a, 0x2a2a5a]));
  }
};

// ---------- 15 indoor themes ----------
const RT_IN = [
  { key: 'hospital', label: 'HOSPITAL', nouns: ['HOSPITAL', 'CLINIC', 'INFIRMARY', 'SANATORIUM', 'MEDICAL'], walls: [['tiles', 0xdce4e0], ['plaster', 0xe4ece8], ['concrete_wall', 0xc8d2cc]], floors: [['tiles', 0xb8c0bc], ['tiles', 0xc4d0cc], ['concrete', 0xa8b0ac]], ceils: [['ceiling_tiles', 0xe8eeea]],
    H: [3.4, 3.9], size: [92, 124], layouts: ['spine', 'rooms', 'atrium'], lamps: [0xe8fff4, 0xf4fbff, 0xd8ecff], doors: [0xe8eef0, 0x8ab4c0, 0x4a7a8a, 0xd8d0b8], curtains: [0x7ab8b0, 0xc8d8e0, 0x8aa0c8, 0xa8c8a0],
    kit: ['ward', 'ward', 'surgery', 'office', 'storage', 'waiting', 'reception'], hall: ['waiting', 'reception', 'planters'], basement: ['morgue', 'boiler', 'storage', 'archive'], fog: 0x131614, tint: 0xf0f6f2, light: 0xe4f0ea },
  { key: 'bank', label: 'BANK', nouns: ['BANK', 'TREASURY', 'VAULT', 'EXCHANGE', 'RESERVE'], walls: [['plaster', 0xe0d8c8], ['fortress', 0xd8d0c0], ['concrete_wall', 0xc8c0b0]], floors: [['tiles', 0xc8c0b0], ['tiles', 0xb0a8a0], ['wood_floor', 0xa89880]], ceils: [['plaster', 0xf0ebe0], ['ceiling_tiles', 0xece8e0]],
    H: [3.8, 4.4], size: [84, 112], layouts: ['atrium', 'hall', 'rooms'], lamps: [0xffe8c8, 0xfff4e0], doors: [0x3a2a1e, 0x1e2a3a, 0x5a1a1a, 0xc8b070], curtains: [0x6a1a2a, 0x1a2a5a, 0xc8a050],
    kit: ['teller', 'office', 'meeting', 'deposit', 'vault', 'lounge'], hall: ['teller', 'columns', 'planters', 'statues'], basement: ['vault', 'vault', 'deposit', 'archive'], basementP: 1, fog: 0x15140f, tint: 0xfff8ec, light: 0xf8ecd8 },
  { key: 'office', label: 'OFFICE TOWER', nouns: ['TOWER', 'OFFICES', 'PLAZA', 'HEADQUARTERS', 'CORPORATE'], walls: [['plaster', 0xd8d4cc], ['concrete_wall', 0xb8bcc0], ['plaster', 0xc8d0d8]], floors: [['tiles', 0xc4c0b8], ['wood_floor', 0xa89a8a], ['concrete', 0x9aa0a4]], ceils: [['ceiling_tiles', 0xece8e0]],
    H: [3.5, 4.0], size: [92, 128], layouts: ['atrium', 'spine', 'rooms'], lamps: [0xeef4ff, 0xf8fbff], doors: [0xd8dce0, 0x2a2e34, 0x3a6aa0, 0x8a6a4c], curtains: [0x8a9aaa, 0x5a6a7a, 0xc8c0b0],
    kit: ['office', 'office', 'cubicles', 'meeting', 'servers', 'storage', 'reception'], hall: ['reception', 'planters', 'seats', 'kiosks'], basement: ['servers', 'storage', 'archive', 'boiler'], fog: 0x14161a, tint: 0xf4f6fa, light: 0xe8eef4 },
  { key: 'library', label: 'LIBRARY', nouns: ['LIBRARY', 'ARCHIVE', 'ATHENAEUM', 'READING ROOM'.split(' ')[0], 'ARCHIVES'], walls: [['plaster', 0xd8c8b0], ['wood_floor', 0x8a6a4c], ['fortress', 0xc8b8a0]], floors: [['wood_floor', 0xa08868], ['wood_floor', 0x8a7058], ['tiles', 0xc8b8a0]], ceils: [['plaster', 0xe8dcc8], ['wood_floor', 0x9a7a5a]],
    H: [3.6, 4.2], size: [84, 116], layouts: ['atrium', 'hall', 'rooms'], lamps: [0xffe0b0, 0xffd8a0, 0xfff0d0], doors: [0x4a2e1e, 0x6a4a34, 0x2a3a2a], curtains: [0x5a1a1a, 0x2a4a2a, 0x7a5a2a],
    kit: ['stacks', 'stacks', 'reading', 'reading', 'archive', 'office', 'lounge'], hall: ['stacks', 'reading', 'statues', 'planters'], basement: ['archive', 'archive', 'storage'], fog: 0x15120e, tint: 0xfff4e4, light: 0xf8e4c8 },
  { key: 'mansion', label: 'MANSION', nouns: ['MANSION', 'MANOR', 'ESTATE', 'HALL', 'CASTLE'], walls: [['plaster', 0xd8c4b0], ['fortress', 0xc8b8a8], ['brick', 0xb89888]], floors: [['wood_floor', 0x9a7a5a], ['tiles', 0xd8d0c4], ['wood_floor', 0x7a5a42]], ceils: [['plaster', 0xeee4d4]],
    H: [3.6, 4.3], size: [80, 112], layouts: ['atrium', 'rooms'], lamps: [0xffe0b0, 0xffd090, 0xfff0d8], doors: [0x3a2214, 0x5a1a1a, 0x1a3a2a, 0xe8e0d0], curtains: [0x7a1a2a, 0x2a1a4a, 0xa88a3a, 0x1a4a3a],
    kit: ['bedroom', 'dining', 'lounge', 'fireplace', 'music', 'kitchen', 'reading'], hall: ['grand', 'statues', 'planters', 'rugs'], basement: ['wine', 'wine', 'storage', 'boiler'], fog: 0x16120e, tint: 0xfff2e4, light: 0xf8e0c8 },
  { key: 'villa', label: 'VILLA', nouns: ['VILLA', 'HACIENDA', 'RETREAT', 'PALAZZO', 'CASA'], walls: [['plaster', 0xf0e4d0], ['adobe', 0xe8d4b8], ['plaster', 0xe8e0f0]], floors: [['rose_clay', 0xd8a888], ['tiles', 0xe8dcc8], ['cobble', 0xd0c0a8]], ceils: [['plaster', 0xf8f0e4], ['wood_floor', 0xa07a58]],
    H: [3.4, 4.0], size: [76, 104], layouts: ['atrium', 'rooms'], lamps: [0xfff0d0, 0xffe4b8], doors: [0x2a5a7a, 0x6a3a1a, 0x3a6a3a, 0xe8e0d0], curtains: [0xe8e0c8, 0x6a8ab0, 0xd88a5a, 0x8ab08a],
    kit: ['bedroom', 'lounge', 'dining', 'kitchen', 'music', 'fireplace'], hall: ['fountain', 'planters', 'statues', 'rugs'], basement: ['wine', 'storage'], courtyard: true, fog: 0x18150f, tint: 0xfff6e8, light: 0xfaecd8 },
  { key: 'basement', label: 'BASEMENT COMPLEX', nouns: ['BASEMENT', 'UNDERCROFT', 'CELLARS', 'SUBLEVEL', 'UNDERWORKS'], walls: [['clinker', 0xb8b0a8], ['concrete_wall', 0xa8aca8], ['black_brick', 0xc0c0c0]], floors: [['concrete', 0x8a8c8a], ['concrete', 0x9a948a]], ceils: [['concrete', 0xa8a8a4]],
    H: [3.0, 3.4], size: [96, 128], layouts: ['rooms', 'spine'], lamps: [0xd8ecff, 0xffe0a8, 0xc8ffd8], accent: true, doors: [0x5a6a5a, 0x7a3a2a, 0x3a4a5a, 0x8a8a7a], curtains: [0x5a5a4a, 0x3a4a3a],
    kit: ['boiler', 'pipes', 'cells', 'servers', 'storage', 'armory', 'guard', 'machines'], hall: ['racks', 'crates'], basement: ['boiler', 'cells', 'storage', 'morgue', 'pipes'], basementP: 1, basementN: 2, flicker: 0.22, fog: 0x121310, tint: 0xf2f4ee, light: 0xdce4dc },
  { key: 'hotel', label: 'HOTEL', nouns: ['HOTEL', 'RESORT', 'LODGE', 'INN', 'SUITES'], walls: [['plaster', 0xd8cbb8], ['plaster', 0xc8b8c8], ['brick', 0xc8a898]], floors: [['wood_floor', 0xb4a89a], ['tiles', 0xd8d0c0], ['wood_floor', 0x8a6a52]], ceils: [['plaster', 0xeae4da]],
    H: [3.3, 3.8], size: [88, 120], layouts: ['atrium', 'spine'], lamps: [0xffe6c0, 0xfff0d8, 0xffdcb0], doors: [0x5a3a22, 0xe8e0d0, 0x2a3a5a, 0x6a1a2a], curtains: [0x8a2a3a, 0x2a4a6a, 0xc8a870, 0x4a6a4a],
    kit: ['suite', 'suite', 'bedroom', 'lounge', 'dining', 'kitchen', 'storage'], hall: ['reception', 'grand', 'planters', 'rugs', 'seats'], basement: ['storage', 'boiler', 'wine'], fog: 0x161310, tint: 0xfcf4ea, light: 0xf8e8d0 },
  { key: 'mall', label: 'SHOPPING MALL', nouns: ['MALL', 'GALLERIA', 'ARCADE', 'PROMENADE', 'MARKETPLACE'], walls: [['plaster', 0xe0dcd4], ['tiles', 0xd8d8d0], ['concrete_wall', 0xc8c8c4]], floors: [['tiles', 0xb8b4ac], ['tiles', 0xa8a8a0], ['wood_floor', 0xa89a8a]], ceils: [['ceiling_tiles', 0xf0eee8]],
    H: [3.8, 4.4], size: [100, 132], layouts: ['atrium', 'hall'], lamps: [0xf8fbff, 0xfff4e0], accent: true, doors: [0xd8dce0, 0x2a2e34], curtains: [0xc83a5a, 0x3a6ac8, 0xe0b030],
    kit: ['shop', 'shop', 'shop', 'foodcourt', 'storage', 'lounge'], hall: ['fountain', 'kiosks', 'planters', 'seats'], basement: ['storage', 'boiler', 'machines'], shopFronts: true, fog: 0x141418, tint: 0xf8f6fa, light: 0xeceef4 },
  { key: 'museum', label: 'MUSEUM', nouns: ['MUSEUM', 'GALLERY', 'EXHIBITION', 'COLLECTION', 'PAVILION'], walls: [['plaster', 0xe8e4dc], ['fortress', 0xd8d4cc], ['plaster', 0xd8dce4]], floors: [['tiles', 0xd8d4cc], ['wood_floor', 0xa89070], ['fortress', 0xc8c4bc]], ceils: [['plaster', 0xf4f2ec]],
    H: [4.0, 4.6], size: [88, 120], layouts: ['atrium', 'hall', 'rooms'], lamps: [0xfff4e0, 0xf8fbff], doors: [0x2a2a2e, 0xd8d0c0, 0x5a3a22], curtains: [0x6a1a2a, 0x1a2a4a, 0x2a2a2a],
    kit: ['exhibit', 'exhibit', 'statues', 'statues', 'reception', 'storage'], hall: ['statues', 'cases', 'planters', 'seats'], basement: ['archive', 'storage', 'vault'], fog: 0x141414, tint: 0xfaf8f4, light: 0xf0ece4 },
  { key: 'school', label: 'SCHOOL', nouns: ['SCHOOL', 'ACADEMY', 'COLLEGE', 'HIGH', 'INSTITUTE'], walls: [['plaster', 0xe8e0c8], ['brick', 0xc8a898], ['tiles', 0xd8e4e8]], floors: [['tiles', 0xc8c4b0], ['wood_floor', 0xb89a78], ['concrete', 0xa8a8a0]], ceils: [['ceiling_tiles', 0xece8dc]],
    H: [3.4, 3.8], size: [88, 120], layouts: ['spine', 'rooms', 'hall'], lamps: [0xf4f8ff, 0xfff8e8], doors: [0x3a6aa0, 0xb83a3a, 0x3a8a5a, 0xd8a030, 0xe8e0d0], curtains: [0x3a6aa0, 0xc8a050, 0x8a2a2a],
    kit: ['classroom', 'classroom', 'classroom', 'lockers', 'canteen', 'gym', 'office', 'music'], hall: ['gymfloor', 'lockers', 'seats'], basement: ['boiler', 'storage', 'archive'], fog: 0x141410, tint: 0xf8f6f0, light: 0xeeece0 },
  { key: 'airport', label: 'AIRPORT TERMINAL', nouns: ['TERMINAL', 'AIRPORT', 'AIRFIELD', 'CONCOURSE', 'SKYPORT'], walls: [['concrete_wall', 0xc8ccd0], ['plaster', 0xe0e4e8], ['metal', 0xa8b0b8]], floors: [['tiles', 0xb8bcc0], ['tiles', 0xa0a4a8], ['concrete', 0xa0a09c]], ceils: [['ceiling_tiles', 0xf0f2f4], ['metal', 0xc8ccd0]],
    H: [4.0, 4.6], size: [104, 136], layouts: ['hall', 'atrium'], lamps: [0xf8fbff, 0xeef4ff], accent: true, doors: [0xd8dce0, 0x3a4a5a], curtains: [0x2a4a8a, 0x5a5a62],
    kit: ['gate', 'gate', 'checkin', 'baggage', 'shop', 'foodcourt', 'office'], hall: ['checkin', 'gates', 'baggage', 'kiosks', 'planters'], basement: ['storage', 'machines', 'baggageroom'], fog: 0x14161a, tint: 0xf4f6fa, light: 0xe8eef4 },
  { key: 'train', label: 'TRAIN STATION', nouns: ['STATION', 'TERMINUS', 'JUNCTION', 'DEPOT', 'CENTRAL'], walls: [['tiles', 0xd8d0c0], ['brick', 0xb89888], ['fortress', 0xc8c0b0]], floors: [['tiles', 0xc8c0b4], ['concrete', 0xa8a49c], ['cobble', 0xb0a898]], ceils: [['concrete', 0xa0a098], ['metal', 0x9aa0a4]],
    H: [3.8, 4.4], size: [108, 136], layouts: ['hall'], lamps: [0xfff0d0, 0xf8fbff], accent: true, doors: [0x2a3a2a, 0x5a3a22, 0x3a3a4a], curtains: [0x5a1a1a, 0x2a2a3a],
    kit: ['ticket', 'waiting', 'shop', 'foodcourt', 'office', 'storage'], hall: ['tracks'], basement: ['storage', 'boiler', 'machines'], fog: 0x141312, tint: 0xf8f4ee, light: 0xf0e8dc },
  { key: 'warehouse', label: 'WAREHOUSE', nouns: ['WAREHOUSE', 'DEPOT', 'STOREHOUSE', 'DOCKS', 'FREIGHT'], walls: [['corrugated', 0xa8a8a0], ['brick', 0xb8a898], ['concrete_wall', 0xa8aca8]], floors: [['concrete', 0x9a9a98], ['concrete', 0x8a8478]], ceils: [['corrugated', 0x8a8a84], ['metal', 0x7a7e82]],
    H: [3.6, 4.2], size: [100, 136], layouts: ['hall', 'rooms'], lamps: [0xffe2b8, 0xffd8a0, 0xf8fbff], doors: [0x5a6a5a, 0xd8a030, 0x7a3a2a], curtains: [0x5a6a4a, 0x8a8a7a],
    kit: ['racks', 'racks', 'storage', 'machines', 'office', 'guard'], hall: ['racks', 'crates', 'containers'], basement: ['storage', 'boiler'], fog: 0x161412, tint: 0xfaf4ec, light: 0xf4ead8 },
  { key: 'theater', label: 'THEATER', nouns: ['THEATER', 'OPERA', 'PLAYHOUSE', 'PALACE', 'ODEON'], walls: [['plaster', 0x8a2a2a], ['plaster', 0xd8c8b0], ['wood_floor', 0x6a3a2a]], floors: [['wood_floor', 0x7a4a32], ['wood_floor', 0x5a3a28], ['tiles', 0xc8b8a0]], ceils: [['plaster', 0xe8d8c0]],
    H: [3.6, 4.2], size: [88, 116], layouts: ['hall'], lamps: [0xffd8a0, 0xffe8c0], accent: true, doors: [0x5a1a1a, 0x3a2214, 0xc8a050], curtains: [0xa81a2a, 0x8a1a2a, 0x2a1a5a, 0xc8a040],
    kit: ['dressing', 'dressing', 'props', 'lounge', 'storage', 'music', 'stage'], hall: ['auditorium'], basement: ['storage', 'props', 'boiler'], fog: 0x140e0e, tint: 0xfff0e4, light: 0xf8dcc8 }
];
RT_IN.forEach(T => { if (T.key === 'library') T.nouns = ['LIBRARY', 'ARCHIVE', 'ATHENAEUM', 'BOOKHOUSE', 'ARCHIVES']; });
RT_ROOM.baggageroom = RT_ROOM.baggage;

function rtIndoorEnv() {
  const T = RAND_PICK.indoor = pickFresh(RT_IN, 'indoor15');
  return { indoor: true, fog: { color: T.fog, density: 0.013 }, hemi: [0x8a94a8, 0x1a1a1a, 0.5], sun: { color: 0, i: 0 }, exposure: T.exp || 1.06,
    grade: { sat: 0.95, contrast: 1.08, tint: T.tint, vignette: 0.38 }, bloom: 0.62, bloomT: 0.9, weather: T.key === 'basement' ? 'drips' : 'motes', ambience: 'amb_city', ambVol: 0.2, envLight: T.light, vmKey: 0xfff0e0 };
}

// ---------- the building ----------
function rtBuildIndoor(W, r) {
  const T = RAND_PICK.indoor || RT_IN[0];
  const pk = (a) => a[Math.floor(r() * a.length)];
  const layout = pk(T.layouts);
  const SX = Math.round(W.r(T.size[0], T.size[1])), SZ = Math.round(W.r(T.size[0], T.size[1]) * W.r(0.82, 1.12)), hx = SX / 2, hz = SZ / 2;
  const H = Math.round(W.r(T.H[0], T.H[1]) * 10) / 10;
  const twoLevel = layout === 'atrium' || layout === 'hall', HA = twoLevel ? H * 2 + 0.3 + Math.round(W.r(0, 1.4) * 10) / 10 : H;
  WORLD.bounds = { x0: -hx, x1: hx, z0: -hz, z1: hz }; WORLD.outerBounds = WORLD.groundBounds = WORLD.bounds;
  const name = rtName(r, T.nouns);
  WORLD.locName = name; WORLD.locKind = 'INDOOR · ' + T.label; WORLD.name = 'RANDOM OPS · ' + name;
  const wS = pk(T.walls), w2 = pk(T.walls), fS = pk(T.floors), cS = pk(T.ceils);
  const C = { T, r, pk, H, HA, wall: M_(wS[0], { color: wS[1] }), wall2: M_(w2[0], { color: w2[1] }), ceil: M_(cS[0], { color: cS[1] }), beam: M_('concrete', { color: 0x8a8a88 }),
    floorTex: fS[0], floorCol: fS[1], trim: RTM.paint(pk([0xe8e2d8, 0x3a2a1e, 0x2a2e34, 0xc8b8a0])), stairM: M_(pk(['concrete', 'wood_floor', 'tiles']), { color: pk([0xb0aca4, 0x9a7a5a, 0xc8c4bc]) }),
    books: [0x8a1a1a, 0x1a3a6a, 0x2a5a2a, 0xc8a050, 0x5a2a5a, 0x1a1a1a, 0xd8d0c0, 0x8a5a2a].map(c => RTM.paint(c, { rough: 0.85 })), lampBase: pk(T.lamps) };
  const rooms = [], walls = [], holes = [], doorsAt = [];
  const door = (len) => ({ at: len / 2 + W.r(-len * 0.25, len * 0.25), w: r() < 0.25 ? W.r(3.4, 4.4) : W.r(1.6, 2.6), h: Math.min(2.8, H - 0.4) });
  const cutsOf = (lo, hi, a, b) => { const out = [lo]; let p = lo; while (hi - p > b) { p += W.r(a, b); if (hi - p < a * 0.7) break; out.push(p); } out.push(hi); return out; };
  const addWall = (x0, z0, x1, z1, h, t, mat, ops, o = {}) => walls.push({ x0, z0, x1, z1, h, t, mat, ops: ops || [], y: o.y || 0, inner: !!o.inner });
  let atrium = null;   // the tall central space (atrium / hall layouts)
  // ----- layout -----
  if (layout === 'rooms') {
    const XB = cutsOf(-hx, hx, 11, 19), ZB = cutsOf(-hz, hz, 11, 19), nx = XB.length - 1, nz = ZB.length - 1;
    const key = (a, b) => a < b ? a + '|' + b : b + '|' + a, open = new Set(), seen = new Set([0]), stack = [0];
    while (stack.length) {
      const c = stack[stack.length - 1], ci = c % nx, cj = (c / nx) | 0;
      const nb = [[ci + 1, cj], [ci - 1, cj], [ci, cj + 1], [ci, cj - 1]].filter(([i, j]) => i >= 0 && i < nx && j >= 0 && j < nz && !seen.has(j * nx + i));
      if (!nb.length) { stack.pop(); continue; }
      const [i, j] = nb[Math.floor(r() * nb.length)], n = j * nx + i; open.add(key(c, n)); seen.add(n); stack.push(n);
    }
    // extra openings make loops: several routes between any two rooms
    for (let c = 0; c < nx * nz; c++) { if (c % nx < nx - 1 && r() < 0.45) open.add(key(c, c + 1)); if (c + nx < nx * nz && r() < 0.45) open.add(key(c, c + nx)); }
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const c = j * nx + i, x0 = XB[i], x1 = XB[i + 1], z0 = ZB[j], z1 = ZB[j + 1];
      if (i < nx - 1 && !(open.has(key(c, c + 1)) && r() < 0.15)) addWall(x1, z0, x1, z1, H, 0.35, C.wall, open.has(key(c, c + 1)) ? [door(z1 - z0)] : []);
      if (j < nz - 1 && !(open.has(key(c, c + nx)) && r() < 0.15)) addWall(x0, z1, x1, z1, H, 0.35, C.wall, open.has(key(c, c + nx)) ? [door(x1 - x0)] : []);
      rooms.push({ x: (x0 + x1) / 2, z: (z0 + z1) / 2, w: x1 - x0, d: z1 - z0, top: H });
    }
  } else if (layout === 'spine') {
    const cw = W.r(4.5, 6.5), zc = W.r(-hz * 0.25, hz * 0.25), xc = W.r(-hx * 0.3, hx * 0.3);
    for (const [zA, zB, side] of [[-hz, zc - cw / 2, 1], [zc + cw / 2, hz, -1]]) {
      const xs = cutsOf(-hx, hx, 10, 17);
      for (let k = 0; k < xs.length - 1; k++) {
        const x0 = xs[k], x1 = xs[k + 1];
        if (x0 < xc + cw / 2 && x1 > xc - cw / 2) continue;
        const edge = side > 0 ? zB : zA;
        addWall(x0, edge, x1, edge, H, 0.35, C.wall, [door(x1 - x0)].concat(x1 - x0 > 14 && r() < 0.5 ? [{ at: (x1 - x0) * 0.2, w: 1.8, h: Math.min(2.6, H - 0.4) }] : []));
        if (k < xs.length - 2) addWall(x1, zA, x1, zB, H, 0.35, C.wall, r() < 0.45 ? [door(zB - zA)] : []);
        rooms.push({ x: (x0 + x1) / 2, z: (zA + zB) / 2, w: x1 - x0, d: zB - zA, top: H });
      }
      addWall(xc - cw / 2, zA, xc - cw / 2, zB, H, 0.35, C.wall, [door(zB - zA)]); addWall(xc + cw / 2, zA, xc + cw / 2, zB, H, 0.35, C.wall, [door(zB - zA)]);
    }
    C.corridor = { zc, cw, xc };
  } else {
    // atrium: rooms on all four sides of a two-storey hall; hall: rooms along two sides. The roofs of those rooms
    // are the upper level: a gallery with railings, reached by staircases in the hall, with attics in its corners.
    const rd = Math.round(W.r(9, 13)), sides = layout === 'atrium' ? ['n', 's', 'w', 'e'] : ['n', 's'];
    atrium = { x0: sides.includes('w') ? -hx + rd : -hx, x1: sides.includes('e') ? hx - rd : hx, z0: -hz + rd, z1: hz - rd };
    C.ring = []; C.sides = sides; C.rd = rd;
    C.stairs = rtPlanGalleryStairs(C, atrium, H + 0.3);
    const blocked = (s, a, b) => C.stairs.some(st => st.side === s && b > st.lo - 1 && a < st.hi + 1);
    for (const s of sides) {
      const alongX = s === 'n' || s === 's';
      const a0 = alongX ? -hx : atrium.z0, a1 = alongX ? hx : atrium.z1, xs = cutsOf(a0, a1, 10, 16);
      const inner = s === 'n' ? atrium.z0 : s === 's' ? atrium.z1 : s === 'w' ? atrium.x0 : atrium.x1;
      const outer = s === 'n' ? -hz : s === 's' ? hz : s === 'w' ? -hx : hx;
      for (let k = 0; k < xs.length - 1; k++) {
        const p0 = xs[k], p1 = xs[k + 1], len = p1 - p0;
        const room = alongX ? { x: (p0 + p1) / 2, z: (inner + outer) / 2, w: len, d: Math.abs(outer - inner) } : { x: (inner + outer) / 2, z: (p0 + p1) / 2, w: Math.abs(outer - inner), d: len };
        room.top = H; room.side = s; rooms.push(room); C.ring.push(room);
        // the wall to the hall: doors where it faces the hall (never behind a staircase), else into the side wing
        const lo = alongX ? Math.max(p0, atrium.x0) : p0, hi = alongX ? Math.min(p1, atrium.x1) : p1, ops = [];
        for (let tries = 0; tries < 8 && ops.length < (len > 13 ? 2 : 1); tries++) {
          const dw = r() < 0.25 ? W.r(3.2, 4.2) : W.r(1.8, 2.6), c = hi - lo > dw + 1.2 ? W.r(lo + dw / 2 + 0.6, hi - dw / 2 - 0.6) : (p0 + p1) / 2;
          if (blocked(s, c - dw / 2, c + dw / 2) || ops.some(o => Math.abs(o.at + p0 - c) < 4)) continue;
          ops.push({ at: c - p0, w: dw, h: Math.min(2.8, H - 0.4) });
        }
        if (alongX) addWall(p0, inner, p1, inner, H, 0.35, C.wall2, ops, { inner: true }); else addWall(inner, p0, inner, p1, H, 0.35, C.wall2, ops, { inner: true });
        // partitions between neighbouring rooms (often with a door: routes around the ring)
        if (k < xs.length - 2) { if (alongX) addWall(p1, Math.min(inner, outer), p1, Math.max(inner, outer), H, 0.35, C.wall, r() < 0.6 ? [door(Math.abs(outer - inner))] : []); else addWall(Math.min(inner, outer), p1, Math.max(inner, outer), p1, H, 0.35, C.wall, r() < 0.6 ? [door(Math.abs(outer - inner))] : []); }
      }
    }
    C.hallFeature = pk(T.hall);
    if (C.hallFeature === 'auditorium') C.aud = rtPlanAuditorium(C, atrium, holes);
    if (C.hallFeature === 'tracks') C.tracks = rtPlanTracks(C, atrium, holes);
  }
  // ----- basements: sunken rooms under a floor slab, down a stairwell with railings -----
  const spawnRoom = rooms.slice().sort((a, b) => (a.x + a.z) - (b.x + b.z))[0] || { x: 0, z: 0, w: 10, d: 10 };
  const bP = T.basementP || (layout === 'rooms' || layout === 'spine' ? 0.85 : 0.5), bN = T.basementN || 1, basements = [];
  if (r() < bP) {
    const cands = rooms.filter(rm => rm !== spawnRoom && rm.w >= 12.5 && rm.d >= 10.5).sort(() => r() - 0.5);
    for (const rm of cands.slice(0, bN)) {
      const bw = Math.min(rm.w - 3, W.r(10, 16)), bd = Math.min(rm.d - 3, W.r(8.5, 12)), B = { x0: rm.x - bw / 2, x1: rm.x + bw / 2, z0: rm.z - bd / 2, z1: rm.z + bd / 2 };
      const alongX = bw >= bd, sg = r() < 0.5 ? 1 : -1, sw = 1.8, D = Math.round(W.r(3.2, 3.6) * 10) / 10;
      const L = Math.max(3, Math.round(D / 0.24)) * 0.3;
      // stairwell: starts at one end of the basement, runs into it
      const lat = alongX ? W.r(B.z0 + 1.4, B.z1 - 1.4 - sw) : W.r(B.x0 + 1.4, B.x1 - 1.4 - sw);
      const st = alongX ? { x0: sg > 0 ? B.x0 : B.x1 - L - 0.6, x1: sg > 0 ? B.x0 + L + 0.6 : B.x1, z0: lat, z1: lat + sw } : { x0: lat, x1: lat + sw, z0: sg > 0 ? B.z0 : B.z1 - L - 0.6, z1: sg > 0 ? B.z0 + L + 0.6 : B.z1 };
      basements.push({ rm, B, st, D, alongX, sg, sw, L, lat });
      holes.push(st); rm.basement = basements[basements.length - 1];
      PITS.push({ x0: B.x0, x1: B.x1, z0: B.z0, z1: B.z1, y: -D });
      reserve(B.x0 - 0.6, B.z0 - 0.6, B.x1 + 0.6, B.z1 + 0.6);
    }
  }
  // ----- floor (holes over the stairwells), outer walls, partitions with doors -----
  W.ground(C.floorTex, { hills: false, size: 300, color: C.floorCol, holes });
  for (const [a, b, c, d] of [[-hx, -hz, hx, -hz], [-hx, hz, hx, hz], [-hx, -hz, -hx, hz], [hx, -hz, hx, hz]]) W.wall(a, b, c, d, HA, 0.6, C.wall, { noAuto: true });
  const doorCol = () => pk(T.doors);
  for (const wl of walls) {
    W.wall(wl.x0, wl.z0, wl.x1, wl.z1, wl.h, wl.t, wl.mat, { noAuto: true, openings: wl.ops, y: wl.y });
    for (const op of wl.ops) if (r() < 0.62) rtDoor(W, wl.x0, wl.z0, wl.x1, wl.z1, op.at, op.w, op.h, doorCol(), { trim: C.trim, y: wl.y });
    if (wl.inner && (T.shopFronts || T.accent)) for (const op of wl.ops) {
      const ax = Math.abs(wl.x1 - wl.x0) > Math.abs(wl.z1 - wl.z0), ux = ax ? Math.sign(wl.x1 - wl.x0) : 0, uz = ax ? 0 : Math.sign(wl.z1 - wl.z0);
      if (T.shopFronts || r() < 0.35) W.box(wl.x0 + ux * op.at, Math.min(H - 0.5, op.h + 0.35), wl.z0 + uz * op.at, ax ? op.w * 0.9 : 0.5, 0.32, ax ? 0.5 : op.w * 0.9, RTM.glow(pk(RT_ACCENT), 2.4), { collide: false, noShadow: true });
    }
  }
  // ----- ceilings / upper level -----
  if (!twoLevel) {
    for (let x = -hx; x < hx; x += 30) for (let z = -hz; z < hz; z += 30) { const w = Math.min(30, hx - x), d = Math.min(30, hz - z); W.box(x + w / 2, H, z + d / 2, w + 0.4, 0.4, d + 0.4, C.ceil, { nav: false, minimap: false }); }
    if (H < 5) ceilingBeams(W, -hx, -hz, hx, hz, H, C.beam, { spacing: 12, depth: 0.3 });
  } else rtUpperLevel(W, C, atrium, hx, hz);
  // ----- room lights and contents -----
  for (const rm of rooms) {
    const col = rtLampColor(C), fl = T.flicker || 0.1;
    W.lamp(rm.x, rm.top - 0.1, rm.z, col, { fixture: T.key === 'mansion' || T.key === 'villa' || T.key === 'hotel' ? 'bulb' : 'tube', real: r() < 0.34, intensity: 1.4, dist: 15, poolSize: 8, poolI: 0.28, flicker: r() < fl ? 'broken' : null });
    if (rm.basement) { rtBasement(W, C, rm.basement); continue; }
    if (rm === spawnRoom) { rtPlant(W, rm.x + rm.w * 0.3, rm.z + rm.d * 0.3); continue; }
    const kind = pk(T.kit);
    try { (RT_ROOM[kind] || RT_ROOM.storage)(W, rm, C); } catch (e) { console.warn('room', kind, e); }
    if (r() < 0.55) { const k = r(), px = rm.x + W.r(-rm.w * 0.22, rm.w * 0.22), pz = rm.z + W.r(-rm.d * 0.22, rm.d * 0.22); if (rtFree(px, pz, 1.2)) { if (k < 0.4) W.woodBox(px, pz, 0.75, r() * 3, 1 + Math.floor(r() * 2)); else if (k < 0.7) W.lowWall(px, pz, 2.6, r() * 3.14, C.wall); else W.metalDoor(px, pz, r() * 6.28); } }
  }
  // ----- the big hall: theme centrepiece, lights -----
  if (atrium) rtHall(W, C, atrium);
  if (C.corridor) { const { zc, cw } = C.corridor; for (let x = -hx + 6; x < hx - 3; x += 9) W.lamp(x, H - 0.1, zc, rtLampColor(C), { fixture: 'tube', real: r() < 0.3, intensity: 1.3, dist: 14, poolSize: 7, poolI: 0.26, flicker: r() < 0.1 ? 'broken' : null }); for (let k = 0; k < 6; k++) { const x = W.r(-hx + 6, hx - 6); if (Math.abs(x - C.corridor.xc) > cw && rtFree(x, zc, 1)) W.woodBox(x, zc + W.r(-1, 1), 0.7, W.r(0, 3), 1 + Math.floor(r() * 2)); } if (T.key === 'school' || T.key === 'hospital') for (let x = -hx + 8; x < hx - 8; x += 7) if (rtFree(x, zc - cw / 2 + 0.45, 0.5)) rtLockers(W, { x, z: zc - cw / 2 + 0.45, rot: 0 }, 6, pk([0x3a6aa0, 0xb83a3a, 0x8a9098])); }
  // ----- spawn + hostile spawn points (basements included: they are reached by their stairs) -----
  const far = rooms.filter(rm => rm !== spawnRoom && Math.hypot(rm.x - spawnRoom.x, rm.z - spawnRoom.z) > 22).map(rm => rm.basement ? [rm.basement.B.x0 + (rm.basement.B.x1 - rm.basement.B.x0) * 0.5, rm.basement.B.z0 + (rm.basement.B.z1 - rm.basement.B.z0) * 0.5] : [rm.x + W.r(-rm.w * 0.2, rm.w * 0.2), rm.z + W.r(-rm.d * 0.2, rm.d * 0.2)]);
  if (atrium) for (let k = 0; k < 4; k++) far.push([W.r(atrium.x0 + 4, atrium.x1 - 4), W.r(atrium.z0 + 4, atrium.z1 - 4)]);
  const sp = { x: spawnRoom.x, z: spawnRoom.z };
  WORLD.basements = basements;
  return { spawn: { x: sp.x, z: sp.z, yaw: Math.atan2(sp.x, sp.z) }, enemySpawns: far.length ? far : [[hx - 10, hz - 10]] };
}

// staircases up to the gallery: hugging the hall's edge, one per side (three or four in an atrium), at random ends
function rtPlanGalleryStairs(C, A, Y) {
  const { r, sides } = C, sw = 2.2, L = Math.max(3, Math.round(Y / 0.24)) * 0.3, out = [];
  const use = sides.length === 4 ? sides.filter(() => r() < 0.85).slice(0, 4) : sides.slice();
  if (!use.length) use.push(sides[0]);
  for (const s of use) {
    if (s === 'n' || s === 's') {
      const z = s === 'n' ? A.z0 + sw / 2 : A.z1 - sw / 2, left = r() < 0.5, x = left ? A.x0 + 2.5 : A.x1 - 2.5, end = left ? x + L : x - L;
      out.push({ side: s, x, z, dir: left ? '+x' : '-x', lo: Math.min(x, end) - 1.3, hi: Math.max(x, end) + 1.3 });
    } else {
      const x = s === 'w' ? A.x0 + sw / 2 : A.x1 - sw / 2, top = r() < 0.5, z = top ? A.z0 + 3.5 : A.z1 - 3.5, end = top ? z + L : z - L;
      out.push({ side: s, x, z, dir: top ? '+z' : '-z', lo: Math.min(z, end) - 1.3, hi: Math.max(z, end) + 1.3 });
    }
  }
  return out;
}
// theater: the stage at one end of the hall, an orchestra pit right in front of it (planned before the floor)
function rtPlanAuditorium(C, A, holes) {
  const east = C.r() < 0.5, d = A.z1 - A.z0, cz = (A.z0 + A.z1) / 2, sd = Math.min(16, d - 8), sx = east ? A.x1 - 6 : A.x0 + 6;
  const xf = east ? sx - 5 : sx + 5, pw = 3.6, pd = Math.max(6, sd - 5), D = 1.7;
  const B = { x0: east ? xf - pw : xf, x1: east ? xf : xf + pw, z0: cz - pd / 2, z1: cz + pd / 2 };
  PITS.push({ x0: B.x0, x1: B.x1, z0: B.z0, z1: B.z1, y: -D }); holes.push(B);
  return { east, sx, xf, sd, cz, B, D };
}
// train station: two track trenches along the hall (planned before the floor)
function rtPlanTracks(C, A, holes) {
  const cz = (A.z0 + A.z1) / 2, d = A.z1 - A.z0, tw = 4.4, D = 1.15, out = [];
  for (const s of [-1, 1]) {
    const zc = cz + s * Math.min(d * 0.22, 7), B = { x0: A.x0 + 3, x1: A.x1 - 3, z0: zc - tw / 2, z1: zc + tw / 2 };
    PITS.push({ x0: B.x0, x1: B.x1, z0: B.z0, z1: B.z1, y: -D }); holes.push(B); out.push({ s, zc, B, D, tw });
  }
  return out;
}
// gallery level on the roofs of the ring rooms: floor, railings to the hall, staircases, attics, roof and lights
function rtUpperLevel(W, C, A, hx, hz) {
  const { H, HA, r, pk, T } = C, Y = H + 0.3, ceil = C.ceil;
  // slabs over the ring (ceiling below, gallery floor on top)
  const strips = [];
  if (C.sides.includes('n')) strips.push({ x0: -hx, x1: hx, z0: -hz, z1: A.z0 });
  if (C.sides.includes('s')) strips.push({ x0: -hx, x1: hx, z0: A.z1, z1: hz });
  if (C.sides.includes('w')) strips.push({ x0: -hx, x1: A.x0, z0: A.z0, z1: A.z1 });
  if (C.sides.includes('e')) strips.push({ x0: A.x1, x1: hx, z0: A.z0, z1: A.z1 });
  const gFloor = pk(['wood_floor', 'tiles', C.floorTex]), gCol = pk([0xb09070, 0xc8c0b4, C.floorCol]);
  for (const s of strips) {
    W.box((s.x0 + s.x1) / 2, H, (s.z0 + s.z1) / 2, s.x1 - s.x0 + 0.4, 0.3, s.z1 - s.z0 + 0.4, ceil, { nav: false, minimap: false });
    W.patch((s.x0 + s.x1) / 2, (s.z0 + s.z1) / 2, s.x1 - s.x0, s.z1 - s.z0, gFloor, { y: Y, matOpts: { color: gCol } });
  }
  // staircases from the hall up to the gallery (planned with the walls): several routes up
  const sw = 2.2, gaps = { n: [], s: [], w: [], e: [] };
  for (const st of C.stairs) {
    const L = rtStairs(W, st.x, st.z, sw, Y, st.dir, C.stairM, { railSides: [st.side === 'n' || st.side === 'w' ? 1 : -1] });
    const ax = st.dir.includes('x'), sg = st.dir[0] === '+' ? 1 : -1, end = (ax ? st.x : st.z) + sg * L;
    if (ax) W.box(end + sg * 0.6, 0, st.z, 1.2, Y, sw, C.stairM, { nav: true, minimap: false }); else W.box(st.x, 0, end + sg * 0.6, sw, Y, 1.2, C.stairM, { nav: true, minimap: false });
    // railings round the landing's open sides (the far end and the hall side): only the gallery side is open
    { const rm = { mat: RTM.metal(0x2a2d32) }, far = end + sg * 1.2, hall = ax ? st.z + (st.side === 'n' ? sw / 2 : -sw / 2) : st.x + (st.side === 'w' ? sw / 2 : -sw / 2);
      if (ax) { rtRail(W, far, st.z - sw / 2, far, st.z + sw / 2, Y, rm); rtRail(W, end, hall, far, hall, Y, rm); }
      else { rtRail(W, st.x - sw / 2, far, st.x + sw / 2, far, Y, rm); rtRail(W, hall, end, hall, far, Y, rm); } }
    const base = ax ? A.x0 : A.z0, a = (sg > 0 ? end - 1.8 : end - 1.2) - base;
    gaps[st.side].push([a, a + 3.0]);
    if (ax) reserve(Math.min(st.x, end) - 1.5, st.z - sw, Math.max(st.x, end) + 1.5, st.z + sw); else reserve(st.x - sw, Math.min(st.z, end) - 1.5, st.x + sw, Math.max(st.z, end) + 1.5);
  }
  // railings along the gallery edge (glass or metal), gaps where the stairs arrive
  const glass = r() < 0.5, rail = { glass, mat: glass ? RTM.metal(0xc8ccd0) : RTM.metal(pk([0x2a2d32, 0x8a7a5a, 0x3a2a1e])) };
  if (C.sides.includes('n')) rtRailGaps(W, A.x0, A.z0, A.x1, A.z0, Y, gaps.n, rail);
  if (C.sides.includes('s')) rtRailGaps(W, A.x0, A.z1, A.x1, A.z1, Y, gaps.s, rail);
  if (C.sides.includes('w')) rtRailGaps(W, A.x0, A.z0, A.x0, A.z1, Y, gaps.w, rail);
  if (C.sides.includes('e')) rtRailGaps(W, A.x1, A.z0, A.x1, A.z1, Y, gaps.e, rail);
  // hall layout: the gallery ends at the outer walls; open ends get rails too
  // attics: small rooms under a sloped ceiling in gallery corners; terraces with plants and seating elsewhere
  const corners = [];
  if (C.sides.includes('n')) corners.push({ x0: -hx + 0.3, x1: -hx + W.r(7, 10), z0: -hz + 0.3, z1: A.z0 - 0.4 }, { x0: hx - W.r(7, 10), x1: hx - 0.3, z0: -hz + 0.3, z1: A.z0 - 0.4 });
  if (C.sides.includes('s')) corners.push({ x0: -hx + 0.3, x1: -hx + W.r(7, 10), z0: A.z1 + 0.4, z1: hz - 0.3 }, { x0: hx - W.r(7, 10), x1: hx - 0.3, z0: A.z1 + 0.4, z1: hz - 0.3 });
  const attics = corners.filter(() => r() < 0.6);
  const ah = Math.min(HA - Y, 3.0);
  for (const q of attics) {
    const w = q.x1 - q.x0, d = q.z1 - q.z0, cx = (q.x0 + q.x1) / 2, cz = (q.z0 + q.z1) / 2, wm = C.wall2;
    const facing = cz < 0 ? 's' : 'n', dz = facing === 's' ? q.z1 : q.z0, xEdge = cx < 0 ? q.x1 : q.x0;
    W.wall(q.x0, dz, q.x1, dz, ah, 0.25, wm, { noAuto: true, y: Y, openings: [{ at: w * 0.5, w: 1.6, h: Math.min(2.3, ah - 0.2) }] });
    W.wall(xEdge, q.z0, xEdge, q.z1, ah, 0.25, wm, { noAuto: true, y: Y, openings: r() < 0.5 ? [{ at: d * 0.5, w: 1.6, h: Math.min(2.3, ah - 0.2) }] : [] });
    rtDoor(W, q.x0, dz, q.x1, dz, w * 0.5, 1.6, Math.min(2.3, ah - 0.2), pk(T.doors), { trim: C.trim, y: Y });
    // sloped ceiling planks (rafters) and an old bulb
    const wood = RTM.wood(0x7a5a3a);
    for (let x = q.x0 + 0.6; x < q.x1; x += 1.1) W.box(x, Y + ah - 0.9, cz, 0.12, 0.12, d, wood, { collide: false, noShadow: true, rotX: (cz < 0 ? 1 : -1) * 0.35 });
    W.lamp(cx, Y + ah - 0.35, cz, 0xffc880, { fixture: 'bulb', real: r() < 0.5, intensity: 1.2, dist: 9, poolSize: 5, poolI: 0.4, floorY: Y, flicker: r() < 0.3 ? 'broken' : null });
    rtCrates(W, cx - w * 0.2, cz, Y, 2, r() * 3); rtSofa(W, { x: cx + w * 0.15, z: cz, rot: r() * 6, y: Y }, pk([0x6a4a34, 0x4a3a2a, 0x5a2a2a]), 1.8);
    if (r() < 0.6) rtCurtain(W, cx, (facing === 's' ? q.z0 : q.z1) + (facing === 's' ? 0.2 : -0.2), Y + 0.2, Math.min(2.4, w * 0.5), Math.min(2.0, ah - 0.4), 0, pk(T.curtains));
  }
  // gallery dressing: plants, benches / sofas, low cover; lamps over the gallery
  for (const s of strips) {
    const along = (s.x1 - s.x0) > (s.z1 - s.z0), len = along ? s.x1 - s.x0 : s.z1 - s.z0, n = Math.floor(len / 9);
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n, x = along ? s.x0 + (s.x1 - s.x0) * t : (s.x0 + s.x1) / 2, z = along ? (s.z0 + s.z1) / 2 : s.z0 + (s.z1 - s.z0) * t;
      if (attics.some(q => x > q.x0 - 1 && x < q.x1 + 1 && z > q.z0 - 1 && z < q.z1 + 1)) continue;
      W.lamp(x, HA - 0.12, z, rtLampColor(C), { fixture: T.key === 'mansion' || T.key === 'hotel' ? 'bulb' : 'tube', real: r() < 0.3, intensity: 1.3, dist: 14, poolSize: 7, poolI: 0.3, floorY: Y });
      const k = r();
      if (k < 0.3) rtPlant(W, x, z, Y, 1.1);
      else if (k < 0.55) rtSofa(W, { x, z, rot: r() < 0.5 ? 0 : Math.PI / 2, y: Y }, pk([0x6a2a2a, 0x2a3a5a, 0x4a4a4a]));
      else if (k < 0.75) { const f = { x, z, rot: r() * 3, y: Y }; rtP(W, f, 0, 0.55, 0, 2.4, 1.1, 0.35, C.wall2); rtFoot(f, 1.2, 0.18, 1.1, 'concrete'); }
      else if (k < 0.9) rtCrates(W, x, z, Y, 2, r() * 3);
      else if (T.key === 'library') rtShelf(W, { x, z, rot: along ? 0 : Math.PI / 2, y: Y }, 3, 2.2, RTM.wood(0x5a3e2a), C.books);
    }
  }
  // roof over everything, skylight above the hall
  for (let x = -hx; x < hx; x += 30) for (let z = -hz; z < hz; z += 30) { const w = Math.min(30, hx - x), d = Math.min(30, hz - z); W.box(x + w / 2, HA, z + d / 2, w + 0.4, 0.4, d + 0.4, ceil, { nav: false, minimap: false }); }
  const skW = (A.x1 - A.x0) * 0.5, skD = (A.z1 - A.z0) * 0.5;
  W.box((A.x0 + A.x1) / 2, HA - 0.02, (A.z0 + A.z1) / 2, skW, 0.02, skD, RTM.glow(0xdfe8f0, 0.75), { collide: false, noShadow: true });
  ceilingBeams(W, A.x0, A.z0, A.x1, A.z1, HA, C.beam, { spacing: 8, depth: 0.45 });
}

// the hall / atrium floor: lights and what this theme puts there
function rtHall(W, C, A) {
  const { T, r, pk, HA } = C, cx = (A.x0 + A.x1) / 2, cz = (A.z0 + A.z1) / 2, w = A.x1 - A.x0, d = A.z1 - A.z0;
  for (let x = A.x0 + 7; x < A.x1 - 3; x += 12) for (let z = A.z0 + 7; z < A.z1 - 3; z += 11) {
    if (T.key === 'mansion' || T.key === 'hotel' || T.key === 'bank' || T.key === 'theater') rtChandelier(W, x, HA - 1.4, z, pk([0xffe0b0, 0xfff0d0]), { real: r() < 0.4, drop: 1.3 });
    else W.lamp(x, HA - 0.3, z, rtLampColor(C), { fixture: T.key === 'warehouse' || T.key === 'train' || T.key === 'airport' ? 'flood' : 'tube', real: r() < 0.3, intensity: 1.6, dist: 22, poolSize: 11, poolI: 0.3 });
  }
  const feature = C.hallFeature || pk(T.hall), spots = [];
  for (let x = A.x0 + 6; x < A.x1 - 5; x += W.r(7, 10)) for (let z = A.z0 + 6; z < A.z1 - 5; z += W.r(7, 10)) spots.push([x + W.r(-1, 1), z + W.r(-1, 1)]);
  const free = (x, z, rad) => rtFree(x, z, rad);
  const place = (fn, rad) => { for (const s of spots.sort(() => r() - 0.5)) if (free(s[0], s[1], rad)) { fn(s[0], s[1]); reserve(s[0] - rad, s[1] - rad, s[0] + rad, s[1] + rad); return true; } return false; };
  // theme centrepieces
  if (feature === 'auditorium') return rtAuditorium(W, C, A);
  if (feature === 'tracks') return rtTracks(W, C, A);
  if (feature === 'grand') {   // grand staircase hall: a wide central stair up to a landing, rugs, statues
    rtRug(W, cx, cz, Math.min(10, w * 0.35), Math.min(14, d * 0.5), pk([0x7a1a1a, 0x1a2a5a, 0x5a1a3a]));
    rtFountain(W, cx, cz + Math.min(5, d * 0.2), 1.8);
  }
  if (feature === 'fountain') rtFountain(W, cx, cz, W.r(2.2, 3.2));
  const n = Math.round(w * d / 150), mix = T.hall.filter(h => h !== 'grand' && h !== 'fountain').concat(['planters']);
  for (let i = 0; i < n; i++) {
    const k = i < 3 && feature !== 'grand' && feature !== 'fountain' ? feature : pk(mix);
    switch (k) {
      case 'planters': place((x, z) => { rtPlant(W, x, z, 0, 1.4); if (r() < 0.5) rtSeats(W, { x: x + 1.6, z, rot: Math.PI / 2 }, 3, pk([0x6a4a34, 0x2a3a5a])); }, 2); break;
      case 'seats': place((x, z) => { for (let j = 0; j < 2; j++) rtSeats(W, { x, z: z + j * 1.6, rot: 0 }, 6, pk([0x2a4a8a, 0x8a2a3a, 0x3a3a3a])); }, 2.6); break;
      case 'kiosks': place((x, z) => rtKiosk(W, { x, z, rot: r() * 6 }, pk(RT_ACCENT)), 2.2); break;
      case 'reception': place((x, z) => { rtCounter(W, { x, z, rot: r() < 0.5 ? 0 : Math.PI }, 4.2, RTM.wood(pk([0x4a2e1e, 0xd8d0c4])), RTM.paint(0x1e1e22), { screens: 0x60b0ff }); rtPlant(W, x + 3, z, 0, 1.2); }, 3); break;
      case 'teller': place((x, z) => rtCounter(W, { x, z, rot: 0 }, 6, RTM.wood(0x4a2e1e), M_('tiles', { color: 0xd8d4cc }), { glass: true, screens: 0x60ff9a }), 3.4); break;
      case 'columns': place((x, z) => { rtCyl(W, x, 0, z, 0.55, HA, M_('fortress', { color: 0xe0d8c8 }), { seg: 18 }); }, 1); break;
      case 'statues': place((x, z) => rtStatue(W, { x, z, rot: r() * 6 }), 1.4); break;
      case 'cases': place((x, z) => rtCase(W, { x, z, rot: r() * 3 }, pk([0xffd890, 0x90d8ff])), 1.2); break;
      case 'stacks': place((x, z) => { for (let j = 0; j < 3; j++) rtShelf(W, { x, z: z - 2 + j * 2, rot: 0 }, 5, Math.min(3.2, HA - 1), RTM.wood(0x5a3e2a), C.books); }, 3.4); break;
      case 'reading': place((x, z) => { rtDiningSet(W, { x, z, rot: 0 }, 3, 1, RTM.wood(0x4a2e1e), RTM.wood(0x6a4a34)); }, 2.6); break;
      case 'rugs': place((x, z) => { rtRug(W, x, z, 4, 3, pk([0x7a1a1a, 0x1a2a5a, 0x4a3a1a])); rtSofa(W, { x, z: z - 1, rot: 0 }, pk([0x6a2a2a, 0x2a3a5a])); }, 2.4); break;
      case 'checkin': place((x, z) => { rtCounter(W, { x, z, rot: 0 }, 7, RTM.paint(0xd8dce0), RTM.paint(0x2a2e34), { screens: 0x60b0ff }); for (let j = 0; j < 4; j++) W.box(x - 3 + j * 2, 0, z + 2.2, 0.06, 1.0, 0.06, RTM.metal(0xc8ccd0), { collide: false }); }, 4); break;
      case 'gates': place((x, z) => { for (let j = 0; j < 3; j++) rtSeats(W, { x, z: z - 1.6 + j * 1.6, rot: 0 }, 7, pk([0x2a4a8a, 0x5a5a62])); }, 3); break;
      case 'baggage': place((x, z) => RT_ROOM.baggage(W, { x, z, w: 12, d: 6 }, C), 5); break;
      case 'racks': place((x, z) => rackRow(W, x, z, r() < 0.5 ? 0 : Math.PI / 2), 3); break;
      case 'crates': place((x, z) => crateStack(W, x, z, 2 + Math.floor(r() * 3), r() * 3), 2); break;
      case 'containers': place((x, z) => { const a = r() < 0.5; W.box(x, 0, z, a ? 2.44 : 6.1, 2.6, a ? 6.1 : 2.44, M_('corrugated', { color: pk([0x8a3a2a, 0x2a5a8a, 0x3a6a3a, 0xc89a30]) }), { surface: 'metal' }); }, 4); break;
      case 'gymfloor': place((x, z) => RT_ROOM.gym(W, { x, z, w: 14, d: 10 }, C), 6); break;
      case 'lockers': place((x, z) => rtLockers(W, { x, z, rot: r() < 0.5 ? 0 : Math.PI / 2 }, 8, pk([0x3a6aa0, 0xb83a3a])), 2); break;
      default: place((x, z) => W.woodBox(x, z, 0.75, r() * 3, 2), 1.4);
    }
  }
  // hard cover so the hall is not a shooting gallery
  for (let i = 0; i < Math.round(w * d / 260); i++) place((x, z) => { const k = r(); if (k < 0.4) W.lowWall(x, z, W.r(2.4, 3.6), r() * 3.14, C.wall2); else if (k < 0.7) W.coverTable(x, z, r() * 6.28); else W.woodBox(x, z, 0.75, r() * 3, 1 + Math.floor(r() * 2)); }, 1.6);
}
// theater: stage with grand curtains at one end, stepped seating, an orchestra pit in front of the stage
function rtAuditorium(W, C, A) {
  const { r, pk, T } = C, P = C.aud, { east, sx, xf, sd, cz, B, D } = P, d = A.z1 - A.z0, w = A.x1 - A.x0, sh = 1.1, wood = RTM.wood(0x3a2a1e), sg = east ? 1 : -1;
  W.box(sx, 0, cz, 10, sh, sd, wood, { surface: 'wood' });
  reserve(sx - 5.5, cz - sd / 2 - 0.5, sx + 5.5, cz + sd / 2 + 0.5);
  // steps up onto the stage at both sides of the orchestra pit
  for (const s of [-1, 1]) rtStairs(W, xf - sg * 1.5, cz + s * (sd / 2 - 1.0), 1.6, sh, east ? '+x' : '-x', wood, { rails: false });
  const cur = pk(T.curtains), ch = Math.min(C.HA - sh - 0.8, 7), fx = xf + sg * 0.3;
  rtCurtain(W, fx, cz - sd / 4 - 0.3, sh, sd / 2 - 0.4, ch, Math.PI / 2, cur, { dense: true, gather: true });
  rtCurtain(W, fx, cz + sd / 4 + 0.3, sh, sd / 2 - 0.4, ch, Math.PI / 2, cur, { dense: true, gather: true });
  rtCurtain(W, sx + sg * 4.6, cz, sh, sd - 0.6, ch, Math.PI / 2, pk([0x1a1a1a, 0x2a1a3a]), { dense: true });
  W.box(fx, sh + ch, cz, 0.5, 1.0, sd, RTM.paint(0xc8a040, { metal: 0.5 }), { collide: false });
  for (let i = 0; i < 4; i++) W.lamp(sx, C.HA - 0.6, cz - sd / 2 + (i + 0.5) * sd / 4, pk([0xff4060, 0x40a0ff, 0xffd060, 0xb060ff]), { fixture: 'flood', real: i % 2 === 0, intensity: 2.0, dist: 18, poolSize: 7, poolI: 0.45, floorY: sh });
  rtSunkenPit(W, C, B, D, { stairs: true, rails: true });
  // stepped seating facing the stage, aisle down the middle
  const x0 = east ? B.x0 - 2 : B.x1 + 2, rows = Math.max(3, Math.floor((w - 18) / 1.3)), seatCol = pk([0x8a1a2a, 0x6a1a1a, 0x2a2a5a, 0x5a1a3a]);
  const half = Math.max(2, Math.floor((d / 2 - 5) / 0.58));
  for (let i = 0; i < rows; i++) {
    const x = x0 - sg * i * 1.3, tier = Math.min(1.2, Math.floor(i / 3) * 0.3);
    if (Math.abs(x - (east ? A.x0 : A.x1)) < 3) break;
    if (tier > 0) W.box(x, 0, cz, 1.3, tier, d - 7, M_('wood_floor', { color: 0x6a4a34 }), { surface: 'wood', nav: true });
    for (const s of [-1, 1]) rtSeats(W, { x, z: cz + s * (1.2 + half * 0.29), rot: east ? Math.PI / 2 : -Math.PI / 2, y: tier }, half, seatCol);
  }
}
// train station: two tracks in trenches along the hall, platforms between them, benches and a departures board
function rtTracks(W, C, A) {
  const { r, pk } = C, cz = (A.z0 + A.z1) / 2;
  for (const t of C.tracks) {
    const { zc, B, D, tw } = t;
    rtSunkenPit(W, C, B, D, { ladders: true });
    const ballast = M_('gravel', { color: 0x8a8278 }), steel = RTM.metal(0x9aa0a8), sleeper = RTM.wood(0x4a3a2a);
    W.box((B.x0 + B.x1) / 2, -D, zc, B.x1 - B.x0, 0.06, tw - 0.3, ballast, { collide: false, noShadow: true });
    for (let x = B.x0 + 0.4; x < B.x1; x += 0.7) W.box(x, -D + 0.06, zc, 0.24, 0.12, 2.6, sleeper, { collide: false, noShadow: true });
    for (const o of [-0.72, 0.72]) W.box((B.x0 + B.x1) / 2, -D + 0.18, zc + o, B.x1 - B.x0, 0.14, 0.08, steel, { collide: false });
    for (const e of [B.z0 - 0.25, B.z1 + 0.25]) W.box((B.x0 + B.x1) / 2, 0.002, e, B.x1 - B.x0, 0.01, 0.4, RTM.paint(0xe8c020, { rough: 0.8 }), { collide: false, noShadow: true });
    // a train standing on the track: cover along the platform, windows lit
    if (r() < 0.75) {
      const L = W.r(14, 22), x = W.r(B.x0 + L / 2 + 3, B.x1 - L / 2 - 3), car = RTM.paint(pk([0x8a1a1a, 0x1a4a8a, 0x2a6a4a, 0xc8c8c0]), { metal: 0.4 });
      W.box(x, -D + 0.3, zc, L, 3.6, 3.0, car, { surface: 'metal', nav: true });
      for (const side of [-1, 1]) for (let k = -L / 2 + 1.5; k < L / 2 - 1; k += 2.2) W.box(x + k, -D + 1.9, zc + side * 1.52, 1.4, 0.9, 0.04, RTM.glow(0xfff0c8, 1.4), { collide: false });
    }
  }
  for (let x = A.x0 + 8; x < A.x1 - 8; x += 9) if (rtFree(x, cz, 1.4)) rtSeats(W, { x, z: cz, rot: r() < 0.5 ? 0 : Math.PI }, 4, pk([0x5a3a22, 0x2a4a6a]));
  rtBoard(W, (A.x0 + A.x1) / 2, cz, C.HA - 2.2, 6, 1.2, 0, RTM.glow(0xffb040, 1.4), RTM.dark());
  const clock = new THREE.CylinderGeometry(0.8, 0.8, 0.12, 24); clock.rotateX(Math.PI / 2); rtAddGeo(clock, RTM.white(), (A.x0 + A.x1) / 2, C.HA - 4.2, cz, 0, { noShadow: true });
}
// a sunken area open to the room above (orchestra pit, train tracks): walls, floor, railings / steps to get out
function rtSunkenPit(W, C, B, D, o = {}) {
  const wallM = M_('concrete', { color: 0x8a8a86 }), floorM = M_('concrete', { color: 0x6a6a68 });
  W.box((B.x0 + B.x1) / 2, -D - 0.1, (B.z0 + B.z1) / 2, B.x1 - B.x0, 0.1, B.z1 - B.z0, floorM, { collide: false });
  for (const [x0, z0, x1, z1, out] of [[B.x0, B.z0, B.x1, B.z0, -1], [B.x0, B.z1, B.x1, B.z1, 1], [B.x0, B.z0, B.x0, B.z1, -1], [B.x1, B.z0, B.x1, B.z1, 1]]) {
    const ax = Math.abs(x1 - x0) > 0.01, L = ax ? x1 - x0 : z1 - z0, cx = (x0 + x1) / 2 + (ax ? 0 : out * 0.15), cz = (z0 + z1) / 2 + (ax ? out * 0.15 : 0);
    W.box(cx, -D, cz, ax ? L + 0.6 : 0.3, D - 0.004, ax ? 0.3 : L + 0.6, wallM, { nav: true, minimap: false });
  }
  // ways out: stepped blocks at the ends (tracks) or a short stair at each end (orchestra pit)
  if (o.ladders) for (const x of [B.x0 + 1.2, B.x1 - 1.2]) for (const zs of [1, -1]) for (let i = 0; i < 4; i++) { const z = (zs > 0 ? B.z0 + 0.15 : B.z1 - 0.15) + zs * i * 0.3; W.box(x, -D, z, 1.2, D * (4 - i) / 4.2, 0.3, wallM, { nav: false, minimap: false }); }
  if (o.stairs) { const L = Math.max(3, Math.round(D / 0.24)) * 0.3; for (const zs of [1, -1]) rtStairs(W, (B.x0 + B.x1) / 2, zs > 0 ? B.z1 - L - 0.05 : B.z0 + L + 0.05, 1.4, D, zs > 0 ? '+z' : '-z', wallM, { y: -D, rails: false }); }
  if (o.rails) { rtRail(W, B.x0, B.z0, B.x1, B.z0, 0, { nav: false }); rtRail(W, B.x0, B.z1, B.x1, B.z1, 0, { nav: false }); const side = C.aud && C.aud.east ? B.x0 : B.x1; rtRail(W, side, B.z0, side, B.z1, 0, { nav: false }); }
}
// a basement under a room: walls below the floor, a slab ceiling with a stairwell, the stairs, its own rooms
function rtBasement(W, C, bs) {
  const { B, st, D, alongX, sg, sw, L, lat } = bs, { r, pk, T } = C, t = 0.3;
  const wallM = M_(pk(['concrete', 'clinker', 'black_brick']), { color: pk([0xa8a8a4, 0xb8b0a8, 0x9a9a98]) }), floorM = M_('concrete', { color: 0x7a7a76 }), slabM = M_('concrete', { color: 0xa8a8a4 });
  // walls (outside the footprint, tops just under the floor so they never fight with it); the stair side is open
  const sides = [['n', B.x0, B.z0, B.x1, B.z0], ['s', B.x0, B.z1, B.x1, B.z1], ['w', B.x0, B.z0, B.x0, B.z1], ['e', B.x1, B.z0, B.x1, B.z1]];
  const entry = alongX ? (sg > 0 ? 'w' : 'e') : (sg > 0 ? 'n' : 's');
  for (const [s, x0, z0, x1, z1] of sides) {
    const ax = s === 'n' || s === 's', out = s === 'n' || s === 'w' ? -t / 2 : t / 2;
    const segs = s === entry ? (ax ? [[x0 - t, st.x0], [st.x1, x1 + t]] : [[z0 - t, st.z0], [st.z1, z1 + t]]) : [[ax ? x0 - t : z0 - t, ax ? x1 + t : z1 + t]];
    for (const [a, b] of segs) if (b - a > 0.05) { if (ax) W.box((a + b) / 2, -D, z0 + out, b - a, D - 0.004, t, wallM, { nav: true, minimap: false }); else W.box(x0 + out, -D, (a + b) / 2, t, D - 0.004, b - a, wallM, { nav: true, minimap: false }); }
  }
  W.box((B.x0 + B.x1) / 2, -D - 0.1, (B.z0 + B.z1) / 2, B.x1 - B.x0, 0.1, B.z1 - B.z0, floorM, { collide: false });
  // ceiling slab: the basement area minus the stairwell (its top lies just under the floor plane above)
  for (const q of rtRectMinus(B, st)) W.box((q.x0 + q.x1) / 2, -0.32, (q.z0 + q.z1) / 2, q.x1 - q.x0, 0.316, q.z1 - q.z0, slabM, { nav: false, minimap: false });
  // the stairs, and the railing around the opening at floor level (bullets and the AI pass under it)
  if (alongX) rtStairsDown(W, sg > 0 ? B.x0 : B.x1, lat + sw / 2, sw, D, sg > 0 ? '+x' : '-x', C.stairM);
  else rtStairsDown(W, lat + sw / 2, sg > 0 ? B.z0 : B.z1, sw, D, sg > 0 ? '+z' : '-z', C.stairM);
  const rail = { nav: false, mat: RTM.metal(pk([0x2a2d32, 0xc8a050, 0x8a9098])) };
  if (alongX) { const xe = sg > 0 ? st.x1 : st.x0, xs = sg > 0 ? st.x0 : st.x1; rtRail(W, xs, st.z0, xe, st.z0, 0, rail); rtRail(W, xs, st.z1, xe, st.z1, 0, rail); rtRail(W, xe, st.z0, xe, st.z1, 0, rail); }
  else { const ze = sg > 0 ? st.z1 : st.z0, zs = sg > 0 ? st.z0 : st.z1; rtRail(W, st.x0, zs, st.x0, ze, 0, rail); rtRail(W, st.x1, zs, st.x1, ze, 0, rail); rtRail(W, st.x0, ze, st.x1, ze, 0, rail); }
  // lights and contents of the basement (theme's basement rooms)
  const y = -D, top = D - 0.32, bw = B.x1 - B.x0, bd = B.z1 - B.z0;
  const lampCol = r() < 0.5 ? pk([0xffd8a0, 0xd8ecff]) : pk([0x60ff9a, 0xff5050, 0xffb040, 0x40c8ff]);
  for (const [lx, lz] of [[-0.25, -0.25], [0.25, 0.25]]) W.lamp((B.x0 + B.x1) / 2 + lx * bw, -0.42, (B.z0 + B.z1) / 2 + lz * bd, lampCol, { fixture: 'tube', real: true, intensity: 1.4, dist: 12, poolSize: 7, poolI: 0.34, floorY: y, flicker: r() < 0.3 ? 'broken' : null });
  const pipe = MATLIB.plain(0x4a3a30, { rough: 0.5, metal: 0.8 });
  W.box((B.x0 + B.x1) / 2, -0.75, alongX ? B.z1 - 0.5 : (B.z0 + B.z1) / 2, alongX ? bw - 0.4 : 0.2, 0.2, alongX ? 0.2 : bd - 0.4, pipe, { collide: false });
  // contents stay off the stairs' landing zone
  const rm = alongX ? { x: (sg > 0 ? (B.x0 + L + 1.2 + B.x1) / 2 : (B.x0 + B.x1 - L - 1.2) / 2), z: (B.z0 + B.z1) / 2, w: bw - L - 1.6, d: bd - 0.6, y, top }
    : { x: (B.x0 + B.x1) / 2, z: sg > 0 ? (B.z0 + L + 1.2 + B.z1) / 2 : (B.z0 + B.z1 - L - 1.2) / 2, w: bw - 0.6, d: bd - L - 1.6, y, top };
  if (rm.w > 3 && rm.d > 3) { const kind = pk(T.basement || ['storage']); try { (RT_ROOM[kind] || RT_ROOM.storage)(W, rm, C); } catch (e) { console.warn('basement', kind, e); } }
  // the room above keeps a clear floor around the stairwell: a sign and a lamp mark the way down
  const ex = alongX ? (sg > 0 ? st.x1 : st.x0) : (st.x0 + st.x1) / 2, ez = alongX ? (st.z0 + st.z1) / 2 : (sg > 0 ? st.z1 : st.z0);
  W.box(ex, 1.12, ez, alongX ? 0.06 : 0.7, 0.24, alongX ? 0.7 : 0.06, RTM.glow(0x40ff80, 2.2), { collide: false, noShadow: true });
}
function rtRectMinus(A, Hh) {
  const out = [], push = (x0, x1, z0, z1) => { if (x1 - x0 > 0.05 && z1 - z0 > 0.05) out.push({ x0, x1, z0, z1 }); };
  const hx0 = Math.max(A.x0, Hh.x0), hx1 = Math.min(A.x1, Hh.x1), hz0 = Math.max(A.z0, Hh.z0), hz1 = Math.min(A.z1, Hh.z1);
  if (hx0 >= hx1 || hz0 >= hz1) return [A];
  push(A.x0, A.x1, A.z0, hz0); push(A.x0, A.x1, hz1, A.z1); push(A.x0, hx0, hz0, hz1); push(hx1, A.x1, hz0, hz1);
  return out;
}

// hook the themes into RANDOM OPS · COMPOUND (the indoor random location)
{
  const M = MAPS.find(m => m.key === 'random_ops');
  if (M) {
    M.desc = 'A new building every deployment from 15 themes: hospital, bank, office tower, library, mansion, villa, basement complex, hotel, mall, museum, school, airport, train station, warehouse or theater';
    M.env = () => rtIndoorEnv();
    M.build = (W, r) => rtBuildIndoor(W, r);
  }
}
