// ---------- Random Ops: a brand-new location on every deployment (indoor and outdoor) ----------
// Each run draws a new seed, a theme / biome that was not used in the last runs, a layout style, a size, furniture
// and lighting - so no two compounds come out alike. The pick is made in env() (lighting) and reused by build().
const RAND_PICK = { indoor: null, outdoor: null };
function pickFresh(list, slot) {
  let hist = [];
  try { hist = JSON.parse(localStorage.getItem('asz_rand_' + slot) || '[]'); } catch (e) { }
  const fresh = list.map((t, i) => i).filter(i => !hist.includes(list[i].key));
  const pool = fresh.length ? fresh : list.map((t, i) => i);
  const i = pool[Math.floor(Math.random() * pool.length)];
  hist = [list[i].key, ...hist].slice(0, Math.min(3, list.length - 1));
  try { localStorage.setItem('asz_rand_' + slot, JSON.stringify(hist)); } catch (e) { }
  return list[i];
}

// ===================== indoor =====================
const RANDOM_INDOOR_THEMES = [
  { key: 'office', name: 'OFFICE TOWER', wall: ['plaster', { color: 0xd8d4cc }], floor: 'tiles', floorColor: 0xc4c0b8, ceil: ['ceiling_tiles', { color: 0xece8e0 }], H: 3.6, lamp: 0xeef4ff, fixture: 'tube', kit: ['office', 'office', 'meeting', 'storage', 'servers'], layouts: ['rooms', 'spine'], env: { fog: 0x14161a, tint: 0xf4f6fa, light: 0xe8eef4, exposure: 1.25 } },
  { key: 'warehouse', name: 'WAREHOUSE', wall: ['corrugated', { color: 0xa8a8a0 }], floor: 'concrete', ceil: ['corrugated', { color: 0x8a8a84 }], H: 7, lamp: 0xffe2b8, fixture: 'flood', kit: ['racks', 'racks', 'pallets', 'storage', 'machines'], layouts: ['hall'], env: { fog: 0x161412, tint: 0xfaf4ec, light: 0xf4ead8, exposure: 1.2 } },
  { key: 'prison', name: 'PRISON BLOCK', wall: ['concrete_wall', { color: 0xb8b4a8 }], floor: 'concrete', ceil: ['concrete', { color: 0xa8a8a0 }], H: 4, lamp: 0xe8f0d8, fixture: 'tube', kit: ['cells', 'cells', 'guard', 'storage', 'canteen'], layouts: ['spine', 'rooms'], env: { fog: 0x121512, tint: 0xf2f6ee, light: 0xe4ece0, exposure: 1.2 } },
  { key: 'hospital', name: 'ABANDONED HOSPITAL', wall: ['tiles', { color: 0xdce4e0 }], floor: 'tiles', floorColor: 0xb8c0bc, ceil: ['ceiling_tiles', { color: 0xe8eeea }], H: 3.6, lamp: 0xe8fff4, fixture: 'tube', kit: ['ward', 'ward', 'surgery', 'storage', 'office'], layouts: ['spine', 'rooms'], env: { fog: 0x131614, tint: 0xf0f6f2, light: 0xe4f0ea, exposure: 1.2 } },
  { key: 'factory', name: 'FACTORY FLOOR', wall: ['brick', { color: 0xc4bab4 }], floor: 'concrete', ceil: ['concrete', { color: 0x9a9a98 }], H: 6, lamp: 0xffd8a0, fixture: 'flood', kit: ['machines', 'machines', 'storage', 'pallets', 'office'], layouts: ['hall', 'rooms'], env: { fog: 0x161310, tint: 0xfaf2e8, light: 0xf4e4cc, exposure: 1.18 } },
  { key: 'bunker', name: 'MILITARY BUNKER', wall: ['concrete', { color: 0x9aa090 }], floor: 'concrete', ceil: ['concrete', { color: 0x8a907e }], H: 3.8, lamp: 0xffe0a8, fixture: 'bulb', kit: ['armory', 'barracks', 'storage', 'command', 'machines'], layouts: ['rooms', 'spine'], env: { fog: 0x121410, tint: 0xf4f6ee, light: 0xece8d8, exposure: 1.22 } },
  { key: 'hotel', name: 'GRAND HOTEL', wall: ['plaster', { color: 0xd8cbb8 }], floor: 'wood_floor', floorColor: 0xb4a89a, ceil: ['plaster', { color: 0xeae4da }], H: 3.4, lamp: 0xffe6c0, fixture: 'bulb', kit: ['suite', 'suite', 'lounge', 'storage', 'kitchen'], layouts: ['spine', 'rooms'], env: { fog: 0x161310, tint: 0xfcf4ea, light: 0xf8e8d0, exposure: 1.2 } },
  { key: 'datacenter', name: 'DATA CENTER', wall: ['concrete_wall', { color: 0xa8b0b8 }], floor: 'tiles', floorColor: 0x9aa4ac, ceil: ['ceiling_tiles', { color: 0xd8e0e8 }], H: 3.8, lamp: 0xd8ecff, fixture: 'tube', kit: ['servers', 'servers', 'office', 'storage', 'machines'], layouts: ['rooms', 'hall'], env: { fog: 0x111418, tint: 0xf0f4fa, light: 0xdce8f4, exposure: 1.22 } },
  { key: 'subway', name: 'SUBWAY STATION', wall: ['tiles', { color: 0xd8d0c0 }], floor: 'concrete', ceil: ['concrete', { color: 0xa0a098 }], H: 4.6, lamp: 0xfff0d0, fixture: 'tube', kit: ['platform', 'storage', 'office', 'machines'], layouts: ['hall', 'spine'], env: { fog: 0x141312, tint: 0xf8f4ee, light: 0xf0e8dc, exposure: 1.2 } }
];
function randomIndoorEnv() {
  const T = RAND_PICK.indoor = pickFresh(RANDOM_INDOOR_THEMES, 'indoor');
  const e = T.env;
  return { indoor: true, fog: { color: e.fog, density: 0.015 }, hemi: [0x8a94a8, 0x1a1a1a, 0.58], sun: { color: 0, i: 0 }, exposure: e.exposure,
    grade: { sat: 0.92, contrast: 1.08, tint: e.tint, vignette: 0.4 }, bloom: 0.6, bloomT: 0.9, weather: 'motes', ambience: 'amb_city', ambVol: 0.2, envLight: e.light, vmKey: 0xfff0e0 };
}
function buildRandomIndoor(W, r) {
  const T = RAND_PICK.indoor || RANDOM_INDOOR_THEMES[0];
  const layout = T.layouts[Math.floor(r() * T.layouts.length)];
  const SX = Math.round(W.r(104, 128)), SZ = Math.round(W.r(104, 128)), hx = SX / 2, hz = SZ / 2, H = T.H;
  WORLD.bounds = { x0: -hx, x1: hx, z0: -hz, z1: hz }; WORLD.outerBounds = WORLD.groundBounds = WORLD.bounds;
  WORLD.name = 'RANDOM OPS · ' + T.name;
  const wall = M_(T.wall[0], T.wall[1]), ceil = M_(T.ceil[0], T.ceil[1]), beam = M_('concrete', { color: 0x8a8a88 });
  W.ground(T.floor, T.floorColor ? { hills: false, size: 300, color: T.floorColor } : { hills: false, size: 300 });
  for (const [a, b, c, d] of [[-hx, -hz, hx, -hz], [-hx, hz, hx, hz], [-hx, -hz, -hx, hz], [hx, -hz, hx, hz]]) W.wall(a, b, c, d, H, 0.6, wall, { noAuto: true });
  const rooms = [];
  const door = (len) => ({ at: len / 2 + W.r(-len * 0.25, len * 0.25), w: W.r(2.4, 3.6), h: Math.min(2.8, H - 0.4) });
  const cutsOf = (lo, hi, a, b) => { const out = [lo]; let p = lo; while (hi - p > b) { p += W.r(a, b); if (hi - p < a * 0.7) break; out.push(p); } out.push(hi); return out; };
  if (layout === 'rooms') {
    const XB = cutsOf(-hx, hx, 11, 19), ZB = cutsOf(-hz, hz, 11, 19), nx = XB.length - 1, nz = ZB.length - 1;
    const key = (a, b) => a < b ? a + '|' + b : b + '|' + a, open = new Set(), merged = new Set(), seen = new Set([0]), stack = [0];
    while (stack.length) {
      const c = stack[stack.length - 1], ci = c % nx, cj = (c / nx) | 0;
      const nb = [[ci + 1, cj], [ci - 1, cj], [ci, cj + 1], [ci, cj - 1]].filter(([i, j]) => i >= 0 && i < nx && j >= 0 && j < nz && !seen.has(j * nx + i));
      if (!nb.length) { stack.pop(); continue; }
      const [i, j] = nb[Math.floor(r() * nb.length)], n = j * nx + i; open.add(key(c, n)); seen.add(n); stack.push(n);
    }
    for (let c = 0; c < nx * nz; c++) { if (c % nx < nx - 1 && r() < 0.4) open.add(key(c, c + 1)); if (c + nx < nx * nz && r() < 0.4) open.add(key(c, c + nx)); }
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const c = j * nx + i, x0 = XB[i], x1 = XB[i + 1], z0 = ZB[j], z1 = ZB[j + 1];
      if (i < nx - 1) { const m = open.has(key(c, c + 1)) && r() < 0.18; if (m) merged.add(key(c, c + 1)); else W.wall(x1, z0, x1, z1, H, 0.35, wall, { noAuto: true, openings: open.has(key(c, c + 1)) ? [door(z1 - z0)] : [] }); }
      if (j < nz - 1) { const m = open.has(key(c, c + nx)) && r() < 0.18; if (!m) W.wall(x0, z1, x1, z1, H, 0.35, wall, { noAuto: true, openings: open.has(key(c, c + nx)) ? [door(x1 - x0)] : [] }); }
      rooms.push({ x: (x0 + x1) / 2, z: (z0 + z1) / 2, w: x1 - x0, d: z1 - z0 });
    }
  } else if (layout === 'spine') {
    // a main corridor along x and a cross corridor along z, rooms opening onto them
    const cw = W.r(4.5, 6.5), zc = W.r(-hz * 0.25, hz * 0.25), xc = W.r(-hx * 0.3, hx * 0.3);
    for (const [zA, zB, side] of [[-hz, zc - cw / 2, 1], [zc + cw / 2, hz, -1]]) {
      const xs = cutsOf(-hx, hx, 10, 17);
      for (let k = 0; k < xs.length - 1; k++) {
        const x0 = xs[k], x1 = xs[k + 1];
        if (x0 < xc + cw / 2 && x1 > xc - cw / 2) continue; // the cross corridor runs here
        const edge = side > 0 ? zB : zA;
        W.wall(x0, edge, x1, edge, H, 0.35, wall, { noAuto: true, openings: [door(x1 - x0)] });
        if (k < xs.length - 2) W.wall(x1, zA, x1, zB, H, 0.35, wall, { noAuto: true, openings: r() < 0.35 ? [door(zB - zA)] : [] });
        rooms.push({ x: (x0 + x1) / 2, z: (zA + zB) / 2, w: x1 - x0, d: zB - zA });
      }
      // cross corridor walls
      W.wall(xc - cw / 2, zA, xc - cw / 2, zB, H, 0.35, wall, { noAuto: true, openings: [door(zB - zA)] }); W.wall(xc + cw / 2, zA, xc + cw / 2, zB, H, 0.35, wall, { noAuto: true, openings: [door(zB - zA)] });
    }
    for (let x = -hx + 6; x < hx - 3; x += 9) W.lamp(x, H - 0.1, zc, T.lamp, { fixture: T.fixture === 'flood' ? 'tube' : T.fixture, real: r() < 0.3, intensity: 1.3, dist: 14, poolSize: 7, poolI: 0.26, flicker: r() < 0.1 ? 'broken' : null });
    for (let k = 0; k < 6; k++) { const x = W.r(-hx + 6, hx - 6); if (Math.abs(x - xc) > cw) W.woodBox(x, zc + W.r(-1, 1), 0.7, W.r(0, 3), 1 + Math.floor(r() * 2)); }
  } else { // hall: a big open floor with offices along two sides
    const od = W.r(10, 14), zA = -hz + od, zB = hz - od;
    for (const [z0, z1, edge] of [[-hz, zA, zA], [zB, hz, zB]]) {
      const xs = cutsOf(-hx, hx, 11, 17);
      for (let k = 0; k < xs.length - 1; k++) {
        W.wall(xs[k], edge, xs[k + 1], edge, H, 0.35, wall, { noAuto: true, openings: [door(xs[k + 1] - xs[k])] });
        if (k < xs.length - 2) W.wall(xs[k + 1], z0, xs[k + 1], z1, H, 0.35, wall, { noAuto: true });
        rooms.push({ x: (xs[k] + xs[k + 1]) / 2, z: (z0 + z1) / 2, w: xs[k + 1] - xs[k], d: z1 - z0 });
      }
    }
    for (let x = -hx + 9; x < hx - 4; x += 12) for (let z = zA + 7; z < zB - 3; z += 11) {
      W.pillar(x, z, 0.8, H, beam);
      W.lamp(x + 6, H - 0.15, z + 5.5, T.lamp, { fixture: T.fixture, real: r() < 0.25, intensity: 1.6, dist: 20, poolSize: 11, poolI: 0.3, flicker: r() < 0.08 ? 'broken' : null });
      hallFill(W, x + 6, z + 5.5, T, r);
    }
  }
  // ceiling slabs (one per 30 m tile keeps the static chunks small)
  for (let x = -hx; x < hx; x += 30) for (let z = -hz; z < hz; z += 30) { const w = Math.min(30, hx - x), d = Math.min(30, hz - z); W.box(x + w / 2, H, z + d / 2, w + 0.4, 0.4, d + 0.4, ceil, { nav: false, minimap: false }); }
  if (H < 5) ceilingBeams(W, -hx, -hz, hx, hz, H, beam, { spacing: 12, depth: 0.3 });
  // rooms: lights + contents
  const spawn = rooms.slice().sort((a, b) => (a.x + a.z) - (b.x + b.z))[0] || { x: 0, z: 0 };
  for (const rm of rooms) {
    W.lamp(rm.x, H - 0.1, rm.z, T.lamp, { fixture: T.fixture === 'flood' && H < 5 ? 'tube' : T.fixture, real: r() < 0.32, intensity: 1.4, dist: 15, poolSize: 8, poolI: 0.28, flicker: r() < 0.12 ? 'broken' : null });
    if (rm === spawn) continue;
    randomRoom(W, rm, T, H, r);
  }
  const far = rooms.filter(rm => Math.hypot(rm.x - spawn.x, rm.z - spawn.z) > 24).map(rm => [rm.x + W.r(-2, 2), rm.z + W.r(-2, 2)]);
  return { spawn: { x: spawn.x, z: spawn.z, yaw: Math.atan2(spawn.x, spawn.z) }, enemySpawns: far.length ? far : [[hx - 10, hz - 10]] };
}
// big-hall filler between pillars
function hallFill(W, x, z, T, r) {
  const k = r();
  if (T.key === 'warehouse' || (k < 0.4 && T.kit.includes('racks'))) rackRow(W, x, z, r() < 0.5 ? 0 : Math.PI / 2);
  else if (k < 0.6) W.prop('generator', x, z, { size: 2.4, rot: r() * 6 });
  else if (k < 0.75) crateStack(W, x, z, 2 + Math.floor(r() * 3), r() * 3);
  else if (k < 0.85) W.lowWall(x, z, 3.2, r() * 3, M_('concrete', { color: 0xa0a09a }));
  else if (k < 0.92) barrelCluster(W, x, z, 3);
}
function rackRow(W, x, z, rot) {
  const steel = MATLIB.plain(0x3a5a8a, { rough: 0.5, metal: 0.6 }), wood = M_('wood', { color: 0xb09878 }), f = { x, z, rot };
  for (const lx of [-2.2, 2.2]) W._part(f, lx, 2.4, 0, 0.1, 2.4, 1.0, steel);
  for (const ly of [0.15, 1.2, 2.25]) { W._part(f, 0, ly + 0.05, 0, 4.5, 0.08, 1.0, steel); for (let i = 0; i < 3; i++) if (W.rnd() < 0.75) W._part(f, -1.4 + i * 1.4, ly + 0.55, 0, 1.1, 0.9, 0.85, wood); }
  W._footprint(f, 2.3, 0.55, 2.5, 'metal');
}
function randomRoom(W, rm, T, H, r) {
  const kind = T.kit[Math.floor(r() * T.kit.length)], x = rm.x, z = rm.z, w = rm.w, d = rm.d;
  const metal = MATLIB.get('metal', { color: 0x8a9098 }), white = MATLIB.plain(0xdcdcd4, { rough: 0.7 }), dark = MATLIB.plain(0x1a1e24, { rough: 0.5, metal: 0.5 });
  switch (kind) {
    case 'office': case 'meeting':
      W.coverTable(x - w * 0.18, z - d * 0.12, r() * 6.28); W.coverTable(x + w * 0.2, z + d * 0.15, r() * 6.28);
      for (let i = 0; i < 2; i++) W.chair(x + W.r(-w * 0.3, w * 0.3), z + W.r(-d * 0.3, d * 0.3), r() * 6.28, r() < 0.6);
      for (let i = 0; i < 3; i++) W.box(x - w * 0.42, 0, z - d * 0.3 + i * 1.2, 0.6, 1.9, 1.0, metal, { surface: 'metal' });
      break;
    case 'servers': case 'command':
      for (let i = 0; i < 3; i++) { const bx = x - w * 0.25 + i * w * 0.25; W.box(bx, 0, z, 0.9, 2.1, Math.min(d * 0.6, 6), dark, { surface: 'metal' }); W.box(bx + 0.46, 1.4, z, 0.02, 0.05, Math.min(d * 0.6, 6) * 0.9, MATLIB.emissive(i % 2 ? 0x30ff80 : 0x40a0ff, 3), { collide: false }); }
      break;
    case 'storage': case 'pallets':
      crateStack(W, x - w * 0.25, z - d * 0.2, 2 + Math.floor(r() * 3), r() * 3); crateStack(W, x + w * 0.22, z + d * 0.22, 2 + Math.floor(r() * 2));
      barrelCluster(W, x + w * 0.25, z - d * 0.25, 2 + Math.floor(r() * 2)); if (r() < 0.35) W.explosiveBarrel(x - w * 0.2, z + d * 0.28);
      break;
    case 'racks': rackRow(W, x, z - d * 0.2, 0); rackRow(W, x, z + d * 0.2, 0); break;
    case 'machines':
      W.prop('generator', x - w * 0.2, z, { size: 2.6, rot: r() * 6 }); W.prop('water_tank', x + w * 0.22, z + d * 0.15, { size: 3, axis: 'h' }); barrelCluster(W, x + w * 0.25, z - d * 0.28, 2);
      break;
    case 'cells': // barred cells along one wall
      for (let i = 0; i < 3; i++) { const cx = x - w * 0.33 + i * w * 0.33; for (let b = -4; b <= 4; b++) W.box(cx + b * 0.32, 0, z - d * 0.12, 0.05, H - 0.5, 0.05, metal, { collide: false }); addCollider(cx - 1.4, cx + 1.4, 0, H - 0.5, z - d * 0.12 - 0.05, z - d * 0.12 + 0.05, { surface: 'metal', shot: false }); W.box(cx, 0, z - d * 0.38, 1.9, 0.5, 0.9, metal); }
      W.woodBox(x + W.r(-2, 2), z + d * 0.25, 0.7, r() * 3);
      break;
    case 'guard': case 'armory':
      W.coverTable(x, z, r() * 6.28); crateStack(W, x - w * 0.3, z + d * 0.25, 2); W.prop('sandbags', x + w * 0.25, z - d * 0.2, { size: 3, rot: r() * 3 });
      for (let i = 0; i < 3; i++) W.box(x + w * 0.42, 0, z - d * 0.3 + i * 1.2, 0.6, 1.9, 1.0, metal, { surface: 'metal' });
      break;
    case 'barracks':
      for (let i = 0; i < 3; i++) { const bx = x - w * 0.3 + i * 2.6; W.box(bx, 0, z - d * 0.36, 2.0, 0.6, 1.0, metal); W.box(bx, 1.4, z - d * 0.36, 2.0, 0.15, 1.0, metal); }
      W.coverTable(x, z + d * 0.15, r() * 3);
      break;
    case 'ward': case 'surgery':
      for (let i = 0; i < 3; i++) { const bx = x - w * 0.3 + i * w * 0.3; W.box(bx, 0, z - d * 0.3, 1.0, 0.7, 2.0, white); W.box(bx, 0.7, z - d * 0.3 - 0.85, 1.0, 0.25, 0.3, white, { collide: false }); }
      W.metalDoor(x + w * 0.2, z + d * 0.25, r() * 6.28); W.chair(x - w * 0.2, z + d * 0.2, r() * 6.28, true);
      break;
    case 'suite': case 'lounge':
      W.box(x - w * 0.2, 0, z - d * 0.25, 2.0, 0.55, 2.2, M_('wood', { color: 0x8a6a4c })); W.box(x - w * 0.2, 0.55, z - d * 0.25, 1.9, 0.18, 2.1, white, { collide: false });
      W.box(x + w * 0.22, 0, z + d * 0.15, 2.4, 0.8, 0.9, MATLIB.plain(0x5a3a2a, { rough: 0.9 })); W.coverTable(x, z + d * 0.3, r() * 6.28);
      break;
    case 'kitchen': case 'canteen':
      for (let i = 0; i < 2; i++) W.box(x - w * 0.25 + i * w * 0.5, 0, z, 2.6, 0.9, 1.0, metal, { surface: 'metal' });
      W.coverTable(x, z + d * 0.28, r() * 6.28); W.chair(x + 1.5, z - d * 0.25, r() * 6.28, true);
      break;
    case 'platform':
      W.box(x, 0, z - d * 0.3, w * 0.8, 1.1, 0.6, M_('concrete', { color: 0xa8a8a0 })); for (let i = 0; i < 2; i++) W.box(x - w * 0.25 + i * w * 0.5, 0, z + d * 0.1, 2.2, 0.5, 0.6, M_('wood', { color: 0x8a6a4c }));
      break;
  }
  // a piece of hard cover in most rooms
  if (r() < 0.7) { const k = r(), px = x + W.r(-w * 0.25, w * 0.25), pz = z + W.r(-d * 0.25, d * 0.25); if (k < 0.4) W.woodBox(px, pz, 0.75, r() * 3, 1 + Math.floor(r() * 2)); else if (k < 0.7) W.lowWall(px, pz, 2.8, r() * 3.14, M_(T.wall[0], T.wall[1])); else W.metalDoor(px, pz, r() * 6.28); }
}

// ===================== outdoor: a new battlefield on every deployment =====================
// Nothing here is a preset: the size, the terrain, the roads and rivers, what stands on every lot, the time of day
// and the materials are all drawn fresh. The materials come from the texture pools in src/assets/texpool (ground,
// brick / wall, asphalt, stone, metal - see tools/import_texture_pools.py): one of each (two wall textures) is
// picked per battlefield and downloaded in the background while the previous game is running.
const RANDOM_TIMES = {
  morning: { fog: [0xc8d2da, 0.0042], hemi: [0xdce6f0, 0x4a5040, 0.72], sun: [0xfff0dc, 2.2], dir: [0.6, 0.45, -0.5], sky: { zenith: 0x4a78b2, horizon: 0xdce4ea, clouds: 0.5, glow: 0.7 }, ex: 1.0 },
  noon: { fog: [0xd0d8e0, 0.003], hemi: [0xe2e8ee, 0x5a5444, 0.74], sun: [0xfff6ea, 2.6], dir: [-0.3, 0.85, -0.35], sky: { zenith: 0x3e6eae, horizon: 0xd8dee4, clouds: 0.45, glow: 0.6 }, ex: 0.98 },
  golden: { fog: [0xe2d2c0, 0.0036], hemi: [0xeee2d4, 0x5a4a38, 0.66], sun: [0xffd6a8, 2.4], dir: [0.85, 0.3, 0.25], sky: { zenith: 0x4a6ea4, horizon: 0xeed2b8, clouds: 0.5, glow: 0.9, sunColor: 0xffcc98 }, ex: 1.02 },
  overcast: { fog: [0xb4bcc4, 0.0052], hemi: [0xd2d8de, 0x4c4c48, 0.86], sun: [0xe8ecf0, 1.2], dir: [0.3, 0.8, 0.4], sky: { zenith: 0x7c8894, horizon: 0xc6ccd2, clouds: 0.95, glow: 0.25 }, ex: 1.04 },
  dusk: { fog: [0x8a8c9a, 0.0056], hemi: [0x9aa0b4, 0x2a2622, 0.55], sun: [0xffa878, 1.4], dir: [-0.85, 0.16, 0.3], sky: { zenith: 0x2a3a5e, horizon: 0xd09a7a, clouds: 0.55, glow: 1.0, sunColor: 0xff9a68 }, ex: 1.12 },
  night: { fog: [0x141a26, 0.008], hemi: [0x4c5566, 0x0c0d10, 0.46], sun: [0xc6cfe0, 0.75], dir: [0.35, 0.6, -0.7], sky: { zenith: 0x05070e, horizon: 0x4a5468, ground: 0x0a0c10, sunColor: 0xe6eaf2, glow: 0.3, clouds: 0.35, cloudColor: 0x3c4352, stars: 1.0, moon: true }, ex: 1.25, night: true }
};
const RANDOM_NAMES = [['IRON', 'BLACK', 'RED', 'SILENT', 'BROKEN', 'COLD', 'LOST', 'BURNT', 'HOLLOW', 'GREY', 'FALLEN', 'DEAD', 'WHITE', 'LONG', 'HIGH', 'DEEP', 'STONE', 'ASH', 'STORM', 'RUST'],
  ['RIDGE', 'HOLLOW', 'CROSSING', 'VALLEY', 'REACH', 'BASIN', 'FLATS', 'QUARRY', 'JUNCTION', 'OUTPOST', 'PASS', 'HARBOUR', 'FIELDS', 'GATE', 'PLATEAU', 'DEPOT', 'FRONTIER', 'RAVINE', 'YARD', 'STATION']];

// ---------- texture pools ----------
const TEXPOOL = {
  man: null, cur: null, next: null, old: [],
  TILE: { terrain: 3.4, wall: 1.9, road: 3.2, stone: 2.3, metal: 2.1 },
  init() {
    const pre = window.ASSET_JSON && window.ASSET_JSON['assets/texpool/manifest.json'];
    const p = pre ? Promise.resolve(pre) : fetch(assetURL('assets/texpool/manifest.json')).then(r => (r.ok ? r.json() : null));
    return p.then(m => { if (m && m.terrain && m.terrain.length) { this.man = m; this.plan(); } }).catch(() => { });
  },
  key(cat, e) { return 'pool_' + cat + '_' + e.n; },
  // register a pool texture with the material library (tile size, roughness, bullet-impact surface, ground shading)
  _register(cat, e, map, nrm) {
    const key = this.key(cat, e);
    ASSETS.tex[key] = map; ASSETS.normals[key] = nrm;
    const kind = e.k || 'dirt';
    TEXDEF[key] = cat === 'metal' ? { tile: this.TILE.metal, rough: 0.5, metal: 0.55, ns: 0.6, surface: 'metal' }
      : cat === 'terrain' ? { tile: this.TILE.terrain, rough: 1.0, ns: 0.7, surface: kind === 'sand' ? 'sand' : kind === 'snow' ? 'snow' : 'dirt' }
      : { tile: this.TILE[cat], rough: cat === 'road' ? 0.94 : 0.88, ns: 0.75, surface: cat === 'stone' ? 'rock' : 'concrete' };
    if (cat === 'terrain' || cat === 'road' || cat === 'stone') GROUND_DEF[key] = { vari: cat === 'terrain' ? 0.42 : 0.28, tint: [1, 1, 1], tintAmt: 0 };
  },
  // choose the materials of the next battlefield and load them (6 textures + normal maps, about 1 MB)
  plan() {
    if (!this.man) return;
    // terrain: light and medium grounds are favoured, dark mud / gravel / mulch is drawn rarely (luminance of the
    // texture's mean colour: dark < 70, light > 100)
    const lum = (e) => { const c = parseInt(e.c, 16); return 0.2126 * (c >> 16) + 0.7152 * ((c >> 8) & 255) + 0.0722 * (c & 255); };
    const wt = (cat, e) => cat !== 'terrain' ? 1 : lum(e) < 70 ? 0.15 : lum(e) < 100 ? 1 : 1.9;
    const pick = (cat, not) => {
      const L = this.man[cat].filter(e => e !== not); let tot = 0; for (const e of L) tot += wt(cat, e);
      let x = Math.random() * tot; for (const e of L) { x -= wt(cat, e); if (x <= 0) return e; }
      return L[L.length - 1];
    };
    const R = { terrain: pick('terrain'), wall: pick('wall'), road: pick('road'), stone: pick('stone'), metal: pick('metal'), loaded: false, keys: {} };
    R.wall2 = pick('wall', R.wall); R.stone2 = pick('stone', R.stone);
    const tl = new THREE.TextureLoader(), aniso = renderer.capabilities.getMaxAnisotropy();
    const load = (path, srgb) => new Promise((res, rej) => tl.load(assetURL(path), t => {
      t.encoding = srgb ? THREE.sRGBEncoding : THREE.LinearEncoding; t.anisotropy = aniso;
      t.wrapS = t.wrapT = THREE.MirroredRepeatWrapping; t.mirrorWrap = true; res(t);   // any image tiles seamlessly when mirrored
    }, undefined, rej));
    const jobs = [];
    for (const slot of ['terrain', 'wall', 'wall2', 'road', 'stone', 'stone2', 'metal']) {
      const cat = slot.replace('2', ''), e = R[slot], key = this.key(cat, e);
      R.keys[slot] = key;
      if (ASSETS.tex[key]) continue;
      jobs.push(Promise.all([load('assets/texpool/' + cat + '/' + e.n + '.webp', true), load('assets/texpool/' + cat + '/' + e.n + '_n.webp', false)]).then(([a, n]) => this._register(cat, e, a, n)));
    }
    this.next = R;
    Promise.all(jobs).then(() => { R.loaded = true; }).catch(() => { R.failed = true; });
  },
  // the recipe to build with: the planned one once its textures have arrived (then the following one is planned)
  take() {
    if (this.next && this.next.loaded) {
      if (this.cur) this.old.push(this.cur);
      this.cur = this.next; this.next = null; this.plan();
      // free the GPU copies of textures from two battlefields ago (they upload again if drawn again)
      while (this.old.length > 1) { const o = this.old.shift(), keep = new Set(Object.values(this.cur.keys).concat(this.next ? Object.values(this.next.keys) : [])); for (const k of Object.values(o.keys)) if (!keep.has(k)) { if (ASSETS.tex[k]) ASSETS.tex[k].dispose(); if (ASSETS.normals[k]) ASSETS.normals[k].dispose(); } }
    } else if (!this.next || this.next.failed) this.plan();
    return this.cur;
  }
};

// Weather of a Random Outdoor battlefield. Always daylight (no night or dusk): clear skies 60 % of the time, the rest
// fog, light rain, a sandstorm, a high-wind hailstorm or a thunderstorm, each with its own sky, haze and light.
const RANDOM_WEATHER = {
  fog:       { fogK: 5.6, fogCol: 0xc6ced4, sun: 0.45, hemi: 1.1, sky: { zenith: 0x8a96a2, horizon: 0xcad2d8, clouds: 0.92, glow: 0.2, cloudColor: 0xe0e4e8 }, ex: 1.06, sat: 0.86, glare: 0.3, fx: 'fog', label: 'FOG' },
  lightrain: { fogK: 1.8, fogCol: 0xa8b2bc, sun: 0.5, hemi: 1.02, sky: { zenith: 0x6c7884, horizon: 0xb4bcc4, clouds: 0.97, glow: 0.15, cloudColor: 0xc8ccd0 }, ex: 1.06, sat: 0.88, glare: 0.2, fx: 'lightrain', label: 'LIGHT RAIN' },
  sandstorm: { fogK: 5.0, fogCol: 0xc49c68, sun: 0.55, sunCol: 0xffc890, hemi: 1.05, hemiCol: 0xe8c8a0, sky: { zenith: 0xb08a5c, horizon: 0xd8b07a, clouds: 0.6, glow: 0.5, cloudColor: 0xd8b888, sunColor: 0xffb070 }, ex: 1.04, sat: 0.92, tint: 0xfff0dc, glare: 0.35, fx: 'sandstorm', label: 'SANDSTORM' },
  hail:      { fogK: 2.3, fogCol: 0x9ca6b0, sun: 0.42, hemi: 1.02, sky: { zenith: 0x5a6672, horizon: 0xa6aeb6, clouds: 1, glow: 0.1, cloudColor: 0xaab2ba }, ex: 1.08, sat: 0.84, glare: 0.1, fx: 'hail', label: 'HAILSTORM' },
  thunder:   { fogK: 2.0, fogCol: 0x8c96a2, sun: 0.36, hemi: 0.98, sky: { zenith: 0x4c5864, horizon: 0x9aa4ae, clouds: 1, glow: 0.08, cloudColor: 0x8e969e }, ex: 1.1, sat: 0.84, glare: 0.05, fx: 'thunder', label: 'THUNDERSTORM' }
};
const RAND_OUT = { time: 'noon', kind: 'dirt', name: '', R: null, weather: 'clear' };
function randomOutdoorEnv() {
  const R = RAND_OUT.R = TEXPOOL.take();
  const kind = RAND_OUT.kind = R ? (R.terrain.k || 'dirt') : choose(['grass', 'dirt', 'sand', 'snow', 'gravel']);
  const force = RAND_OUT.force;   // (dev: RAND_OUT.force = 'hail' / 'clear' ...)
  const clear = force ? force === 'clear' : Math.random() < 0.6;
  const wk = RAND_OUT.weather = clear ? 'clear' : force && RANDOM_WEATHER[force] ? force : choose(Object.keys(RANDOM_WEATHER).filter(k => k !== 'sandstorm' || kind !== 'snow'));
  const tk = RAND_OUT.time = clear ? choose(kind === 'snow' ? ['morning', 'noon'] : ['morning', 'noon', 'golden']) : (wk === 'sandstorm' ? choose(['noon', 'golden']) : choose(['morning', 'noon']));
  const T = RANDOM_TIMES[tk], Wt = RANDOM_WEATHER[wk] || null;
  RAND_OUT.name = choose(RANDOM_NAMES[0]) + ' ' + choose(RANDOM_NAMES[1]);
  // haze takes a little of the ground colour so the horizon belongs to the terrain
  const fog = new THREE.Color(Wt ? Wt.fogCol : T.fog[0]);
  if (R) fog.lerp(new THREE.Color('#' + R.terrain.c), Wt ? 0.06 : 0.12);
  return {
    fog: { color: fog.getHex(), density: T.fog[1] * (Wt ? Wt.fogK : 1) }, hemi: Wt ? [Wt.hemiCol || T.hemi[0], T.hemi[1], T.hemi[2] * Wt.hemi] : T.hemi,
    sun: { color: Wt && Wt.sunCol ? Wt.sunCol : T.sun[0], i: T.sun[1] * (Wt ? Wt.sun : 1) }, sunDir: T.dir, exposure: T.ex * (Wt ? Wt.ex : 1), night: false,
    sky: Object.assign({ ground: 0x5a5444 }, T.sky, Wt ? Wt.sky : {}), grade: { sat: Wt ? Wt.sat : 0.96, contrast: 1.06, tint: Wt && Wt.tint ? Wt.tint : 0xfffaf6, vignette: 0.3 },
    glare: Wt ? Wt.glare : 1, bloom: 0.4, weather: Wt ? Wt.fx : 'none',
    ambience: kind === 'sand' ? 'amb_desert' : 'amb_snow', ambVol: 0.3
  };
}

function buildRandomOutdoor(W, r) {
  const R = RAND_OUT.R, kind = RAND_OUT.kind, night = RAND_OUT.time === 'night';
  // one of the 15 outdoor themes (suited to this ground) and the location's two-word name
  const OT = RAND_OUT.theme = rtPickOutdoor(kind), locName = rtName(r, OT.nouns);
  RAND_OUT.name = locName; WORLD.locName = locName; WORLD.locKind = 'OUTDOOR · ' + OT.label;
  // five times the area of the old random battlefield (was about 240 m across)
  const hx = Math.round(W.r(248, 276)), hz = Math.round(W.r(248, 276));
  WORLD.bounds = { x0: -hx, x1: hx, z0: -hz, z1: hz }; WORLD.outerBounds = WORLD.groundBounds = WORLD.bounds; WORLD.coreBounds = null;
  WORLD.name = 'RANDOM OPS · ' + RAND_OUT.name + (RANDOM_WEATHER[RAND_OUT.weather] ? ' · ' + RANDOM_WEATHER[RAND_OUT.weather].label : '');
  WORLD.enemyTheme = night ? 'night' : kind === 'snow' ? 'arctic' : kind === 'sand' ? 'desert' : kind === 'grass' ? 'woodland' : 'urban';
  WORLD.camo = WORLD.enemyTheme === 'night' ? 'night' : WORLD.enemyTheme;
  NAV.bake(WORLD.bounds);
  // materials of this battlefield (built-in textures when the pool has not arrived, e.g. opened from disk)
  const K = R ? R.keys : null;
  const T = {
    ground: K ? K.terrain : { grass: 'grass', dirt: 'dirt', sand: 'sand', snow: 'snow', gravel: 'gravel' }[kind],
    wall: () => M_(K ? (r() < 0.55 ? K.wall : K.wall2) : choose(['brick', 'plaster', 'adobe', 'clinker'])),
    road: K ? K.road : 'asphalt', stone: K ? K.stone : 'cobble', stone2: K ? K.stone2 : 'fortress', metal: K ? K.metal : 'corrugated'
  };
  const stoneM = () => M_(r() < 0.6 ? T.stone : T.stone2), metalM = () => M_(T.metal), roofM = () => (r() < 0.45 ? M_(T.metal) : M_('roof'));
  outdoorCommon(W, { ground: T.ground, kind, pano: kind === 'sand' ? 'pano_desert' : 'pano_snow', panoTint: night ? 0xa8b0be : 0xffffff, hillMax: W.r(12, 36) });
  // ----- roads: a loose grid of asphalt, some stone lanes -----
  const roadsZ = [], roadsX = [];
  for (let c = -hx + W.r(50, 90); c < hx - 40; c += W.r(95, 150)) roadsZ.push(Math.round(c));
  for (let c = -hz + W.r(50, 90); c < hz - 40; c += W.r(95, 150)) roadsX.push(Math.round(c));
  for (const c of roadsZ) { const w = r() < 0.6 ? 7 : 5.5, tex = r() < 0.75 ? T.road : T.stone; W.patch(c, 0, w, hz * 2, tex); reserve(c - w / 2 - 0.6, -hz, c + w / 2 + 0.6, hz); }
  for (const c of roadsX) { const w = r() < 0.6 ? 7 : 5.5, tex = r() < 0.75 ? T.road : T.stone; W.patch(0, c, hx * 2, w, tex); reserve(-hx, c - w / 2 - 0.6, hx, c + w / 2 + 0.6); }
  // ----- rivers with bridges where the roads cross (and a few plank crossings) -----
  const nRiv = kind === 'sand' ? (r() < 0.3 ? 1 : 0) : (r() < 0.7 ? 1 : 0) + (r() < 0.3 ? 1 : 0);
  const usedRiv = [];
  for (let i = 0; i < nRiv; i++) {
    const ax = i === 0 ? (r() < 0.5 ? 'x' : 'z') : (usedRiv[0] === 'x' ? 'z' : 'x'), lim = (ax === 'x' ? hx : hz) + 8, span = ax === 'x' ? hz : hx;
    let c = 0; for (let t = 0; t < 8; t++) { c = Math.round(W.r(-span + 60, span - 60)); if (Math.abs(c) > 46 && !(ax === 'x' ? roadsX : roadsZ).some(q => Math.abs(q - c) < 14)) break; }
    const w = Math.round(W.r(7, 11)), cross = (ax === 'x' ? roadsZ : roadsX), gaps = cross.map(q => [q - 4.5, q + 4.5]);
    for (let p = -lim + 40; p < lim - 30; p += W.r(70, 110)) if (!gaps.some(g => Math.abs((g[0] + g[1]) / 2 - p) < 22)) gaps.push([p - 2, p + 2]);
    gaps.sort((a, b) => a[0] - b[0]);
    river(W, ax, c, w, -lim, lim, gaps, night ? 0x0e1a28 : kind === 'snow' ? 0x3a5a68 : 0x2a5058, 1);
    for (const g of gaps) {
      const m = (g[0] + g[1]) / 2, wide = g[1] - g[0] > 6;
      if (wide) { if (ax === 'x') trussBridge(W, m, c - w / 2 - 1.2, m, c + w / 2 + 1.2, 7.4, 0.3); else trussBridge(W, c - w / 2 - 1.2, m, c + w / 2 + 1.2, m, 7.4, 0.3); }
      else if (ax === 'x') plankBridge(W, m, c - w / 2 - 1.6, m, c + w / 2 + 1.6, 3.6); else plankBridge(W, c - w / 2 - 1.6, m, c + w / 2 + 1.6, m, 3.6);
    }
    usedRiv.push(ax);
  }
  // ----- what grows here -----
  const tree = (W2, x, z) => {
    if (kind === 'sand') { if (r() < 0.75) { W.prop('palm', x, z, { size: W.r(7, 10), axis: 'h', collide: false }); addCollider(x - 0.3, x + 0.3, 0, 3, z - 0.3, z + 0.3, { surface: 'wood', minimap: false }); } else W.rock(x, z, W.r(0.8, 1.8), stoneM(), { sy: 0.8 }); }
    else if (kind === 'snow') W.pine(x, z, W.r(9, 15), { snow: true });
    else if (r() < 0.45) deciduous(W, x, z, W.r(6, 10)); else W.pine(x, z, W.r(8, 14), r() < 0.5 ? { color: 0x5a7040 } : {});
  };
  // ----- buildings: every house draws its own style -----
  const house = (W2, x, z, w, d, side) => {
    const k = r();
    if (k < 0.16) return W.prop('cabin', x, z, { size: 8, rot: W.r(-0.4, 0.4) + (r() < 0.5 ? Math.PI / 2 : 0), surface: 'wood' });
    if (k < 0.28) return woodHut(W, x, z, Math.min(w, 7.5), Math.min(d, 7), side);
    if (k < 0.42) return ruin(x, z, w, d);
    const flat = r() < 0.5, roof = roofM();
    return W.house(x, z, w, d, W.r(3.1, 3.8), Object.assign({ wall: k < 0.52 ? stoneM() : T.wall(), roof, doorSide: side, storeys: r() < 0.28 ? 2 : 1, lit: night && r() < 0.7 }, flat ? { parapet: true } : { pitched: roof }));
  };
  // a broken house: walls of uneven height with gaps, rubble inside
  const ruin = (x, z, w, d) => {
    const m = r() < 0.5 ? T.wall() : stoneM(), hw = w / 2, hd = d / 2;
    const seg = (x0, z0, x1, z1) => { if (r() < 0.2) return; const len = Math.hypot(x1 - x0, z1 - z0); W.wall(x0, z0, x1, z1, W.r(1.1, 3.4), 0.45, m, r() < 0.55 ? { openings: [{ at: len * W.r(0.3, 0.7), w: W.r(1.6, 2.8), h: 2.4 }] } : {}); };
    seg(x - hw, z - hd, x + hw, z - hd); seg(x - hw, z + hd, x + hw, z + hd); seg(x - hw, z - hd, x - hw, z + hd); seg(x + hw, z - hd, x + hw, z + hd);
    W.prop('rubble', x + W.r(-1.5, 1.5), z + W.r(-1.2, 1.2), { size: W.r(2.6, 3.8), rot: W.r(0, 6.28), surface: 'concrete' });
    if (r() < 0.5) W.woodBox(x + W.r(-2, 2), z + W.r(-2, 2), 0.75, W.r(0, 3), 1);
  };
  const st = { lot: 46, house, tree, rock: stoneM, wallMat: () => (r() < 0.5 ? stoneM() : T.wall()), night, lampColor: 0xffb060, log: kind !== 'sand' && kind !== 'snow' };
  // ----- central objective: the theme's centrepiece, or one of the classic forms -----
  const core = { x0: -24, x1: 24, z0: -24, z1: 24 }, wm = r() < 0.5 ? stoneM() : T.wall(), form = r();
  const X = { r, T, st, house, ruin, container, tree, stoneM, metalM, roofM, night, kind, pk: (a) => a[Math.floor(r() * a.length)] };
  let themed = false;
  try { themed = !!(RT_CENTER[OT.key] && RT_CENTER[OT.key](W, X)); } catch (e) { console.warn('theme centre', OT.key, e); }
  if (themed) { /* the theme built the middle */ }
  else if (form < 0.4) {       // walled compound with watchtowers
    for (const [a, b, c, d2] of [[core.x0, core.z0, core.x1, core.z0], [core.x0, core.z1, core.x1, core.z1], [core.x0, core.z0, core.x0, core.z1], [core.x1, core.z0, core.x1, core.z1]]) W.wall(a, b, c, d2, 2.7, 0.6, wm, { openings: [{ at: 24, w: 5, h: 2.7 }] });
    for (const [x, z] of [[core.x0, core.z0], [core.x1, core.z1]]) W.prop('watchtower', x + 2.5, z + (z < 0 ? 2.5 : -2.5), { size: 10, axis: 'h', surface: 'wood', pad: 0.35 });
  } else if (form < 0.7) { // stone fort: corner towers and a paved yard
    W.patch(0, 0, 44, 44, T.stone);
    for (const [x, z] of [[-20, -20], [20, -20], [-20, 20], [20, 20]]) stoneTower(W, x, z, 4.2, W.r(7, 10), M_(T.stone2), { lit: night });
    for (const [a, b, c, d2] of [[-18, -20, 18, -20], [-18, 20, 18, 20], [-20, -18, -20, 18], [20, -18, 20, 18]]) W.wall(a, b, c, d2, 3.2, 0.7, M_(T.stone2), { openings: [{ at: 18, w: 5, h: 3 }] });
    flagPole(W, 0, 0, 9, choose([0xb02020, 0x2050a0, 0x207040, 0xc0a020]));
  } else {                // depot: containers, tanks, a radar
    W.patch(0, 0, 46, 46, T.road);
    for (let i = 0; i < 7; i++) { const x = W.r(-18, 18), z = W.r(-18, 18); if (isFree(x, z, 4.2)) { container(x, z, r() < 0.5 ? 0 : Math.PI / 2); } }
    W.prop('radar', -14, 14, { size: 7, axis: 'h', surface: 'metal' }); W.prop('water_tank', 14, -14, { size: 5, axis: 'h', surface: 'metal' });
  }
  function container(x, z, rot, stack) {
    const L = 6.1, wd = 2.44, hh = 2.6, m = metalM(), a = Math.abs(Math.sin(rot)) > 0.5;
    W.box(x, 0, z, a ? wd : L, hh, a ? L : wd, m, { surface: 'metal' });
    if (stack) W.box(x, hh, z, a ? wd : L, hh, a ? L : wd, metalM(), { surface: 'metal', nav: false });
    reserve(x - (a ? wd : L) / 2 - 0.6, z - (a ? L : wd) / 2 - 0.6, x + (a ? wd : L) / 2 + 0.6, z + (a ? L : wd) / 2 + 0.6);
  }
  reserve(core.x0 - 1, core.z0 - 1, core.x1 + 1, core.z1 + 1);
  if (!themed) {
    for (let i = 0; i < 3; i++) { const x = W.r(-13, 13), z = W.r(-13, 13); if (form < 0.7 && isFree(x, z, 5.5)) { house(W, x, z, W.r(7, 9), W.r(6, 8), ['n', 's', 'e', 'w'][Math.floor(r() * 4)]); reserve(x - 5, z - 5, x + 5, z + 5); } }
    crateStack(W, 6, -15, 3); barrelCluster(W, -15, 8, 3); W.explosiveBarrel(10, 11); W.prop('generator', -10, -13, { size: 2.2 });
  } else for (let i = 0; i < 4; i++) { const x = W.r(-20, 20), z = W.r(-20, 20); if (isFree(x, z, 1.5)) W.woodBox(x, z, 0.75, W.r(0, 3), 1 + Math.floor(r() * 2)); }
  if (night) for (const [x, z] of [[0, -19], [-19, 0], [19, 0], [0, 19]]) { W.box(x, 0, z, 0.15, 4.4, 0.15, MATLIB.plain(0x2a2a2a, { metal: 0.7 })); W.lamp(x, 4.5, z, 0xffb060, { fixture: 'bulb', real: true, intensity: 2.2, dist: 20, poolSize: 10, poolI: 0.4 }); }
  // ----- spawn at a random edge -----
  const side = Math.floor(r() * 4), sp = [[0, hz - 14, 0], [0, -hz + 14, Math.PI], [hx - 14, 0, Math.PI / 2], [-hx + 14, 0, -Math.PI / 2]][side];
  reserve(sp[0] - 8, sp[1] - 8, sp[0] + 8, sp[1] + 8);
  // ----- the rest: lots of every kind -----
  const spawns = [], LOT = st.lot, b = WORLD.bounds;
  const cut = (a, c) => { const n = Math.max(1, Math.round((c - a) / LOT)); return Array.from({ length: n + 1 }, (_, k) => a + (c - a) * k / n); };
  const XB = cut(b.x0 + 3, b.x1 - 3), ZB = cut(b.z0 + 3, b.z1 - 3);
  // the mix changes with every battlefield: each kind gets a random weight
  const kinds = { village: W.r(1.5, 4), ruins: W.r(0.6, 2.4), camp: W.r(0.8, 2.2), forest: W.r(kind === 'sand' ? 0.3 : 1.2, kind === 'sand' ? 1.2 : 3.4), field: W.r(1, 2.6), checkpoint: W.r(0.4, 1.3), depot: W.r(0.5, 1.8), scrap: W.r(0.5, 1.8), dump: W.r(0.3, 1.2), radar: W.r(0.15, 0.7), pond: kind === 'snow' ? W.r(0.5, 1.4) : W.r(0, 0.5), dunes: kind === 'sand' ? 0 : W.r(0, 0.7) };
  // the theme's own lots make up most of the map; the classic kinds keep turning up between them
  for (const k in kinds) kinds[k] *= 0.32;
  for (const k in OT.lots) kinds['t_' + k] = OT.lots[k] * W.r(0.85, 1.2) * 1.9;
  const names = Object.keys(kinds), tot = names.reduce((a, k) => a + kinds[k], 0);
  const pickKind = () => { let v = r() * tot; for (const k of names) { v -= kinds[k]; if (v <= 0) return k; } return 'field'; };
  const LOTS = {
    village: (L) => lotCluster(W, L, st), camp: (L) => lotCamp(W, L, st), forest: (L) => lotForest(W, L, st), field: (L) => lotField(W, L, st), checkpoint: (L) => lotCheckpoint(W, L, st),
    ruins: (L) => { for (let i = 0; i < 3 + Math.floor(r() * 3); i++) { const p = lotSpot(W, L, 6.5, 18, 7); if (p) { const w = W.r(6.5, 10), d = W.r(6, 8.5); ruin(p[0], p[1], w, d); reserve(p[0] - w / 2 - 1, p[1] - d / 2 - 1, p[0] + w / 2 + 1, p[1] + d / 2 + 1); } } for (let i = 0; i < 3; i++) { const p = lotSpot(W, L, 3); if (p) W.lowWall(p[0], p[1], W.r(3, 5), W.r(0, 3.14), stoneM()); } lotProps(W, L, st, 3); },
    depot: (L) => { W.patch(L.cx, L.cz, L.size * 0.7, L.size * 0.7, T.road); for (let i = 0; i < 5 + Math.floor(r() * 4); i++) { const p = lotSpot(W, L, 4.6, 14, 6); if (p) container(p[0], p[1], r() < 0.5 ? 0 : Math.PI / 2, r() < 0.3); } let p = lotSpot(W, L, 3.2); if (p) W.prop('water_tank', p[0], p[1], { size: 4.6, axis: 'h', surface: 'metal' }); p = lotSpot(W, L, 2.4); if (p) W.prop('generator', p[0], p[1], { size: 2.3, rot: W.r(0, 3) }); for (let i = 0; i < 2; i++) { p = lotSpot(W, L, 2); if (p) W.prop('barrier', p[0], p[1], { size: 2.6, rot: W.r(0, 3) }); } lotProps(W, L, st, 4); if (night) { p = lotSpot(W, L, 2); if (p) W.searchlight(p[0], p[1], 8, 0xe8f0ff); } },
    scrap: (L) => { for (let i = 0; i < 4 + Math.floor(r() * 4); i++) { const p = lotSpot(W, L, 3.6); if (p) { const k = r(); W.prop(k < 0.6 ? 'car_wreck' : k < 0.8 ? 'technical' : 'bus_wreck', p[0], p[1], { size: k < 0.6 ? 4.4 : k < 0.8 ? 5.6 : 9, rot: W.r(0, 6.28), surface: 'metal' }); reserve(p[0] - 3, p[1] - 3, p[0] + 3, p[1] + 3); } } for (let i = 0; i < 2; i++) { const p = lotSpot(W, L, 3); if (p) { const len = W.r(5, 9); W.wall(p[0] - len / 2, p[1], p[0] + len / 2, p[1], 2.2, 0.12, metalM(), {}); } } let p = lotSpot(W, L, 1.4); if (p) W.fireDrum(p[0], p[1]); lotProps(W, L, st, 3); },
    dump: (L) => { for (let i = 0; i < 4; i++) { const p = lotSpot(W, L, 2.4); if (p) barrelCluster(W, p[0], p[1], 2 + Math.floor(r() * 3)); } for (let i = 0; i < 3; i++) { const p = lotSpot(W, L, 1.6); if (p) W.explosiveBarrel(p[0], p[1]); } for (let i = 0; i < 3; i++) { const p = lotSpot(W, L, 2); if (p) W.prop('sandbags', p[0], p[1], { size: 3, rot: W.r(0, 3.14) }); } let p = lotSpot(W, L, 2.2); if (p) crateStack(W, p[0], p[1], 3, W.r(0, 3)); lotProps(W, L, st, 2); },
    radar: (L) => { let p = lotSpot(W, L, 5); if (p) { W.patch(p[0], p[1], 14, 14, T.stone); W.prop('radar', p[0], p[1], { size: 8, axis: 'h', surface: 'metal' }); reserve(p[0] - 5, p[1] - 5, p[0] + 5, p[1] + 5); } p = lotSpot(W, L, 4); if (p && typeof radioTower === 'function') { radioTower(W, p[0], p[1], W.r(16, 24)); reserve(p[0] - 3, p[1] - 3, p[0] + 3, p[1] + 3); } p = lotSpot(W, L, 2.4); if (p) W.prop('generator', p[0], p[1], { size: 2.3, rot: W.r(0, 3) }); for (let i = 0; i < 3; i++) { p = lotSpot(W, L, 2); if (p) W.prop('sandbags', p[0], p[1], { size: 3, rot: W.r(0, 3.14) }); } lotProps(W, L, st, 2); },
    // frozen pond (snow) or a paved yard elsewhere: open ground ringed with rocks
    pond: (L) => { const s = L.size * W.r(0.4, 0.6); W.patch(L.cx, L.cz, s, s * W.r(0.7, 1), kind === 'snow' ? 'tiles' : T.stone2, kind === 'snow' ? { rot: W.r(0, 1.5), matOpts: { color: 0xbfd8e8, wet: true } } : { rot: W.r(0, 1.5) }); for (let i = 0; i < 7; i++) { const a = i / 7 * 6.28, x = L.cx + Math.cos(a) * s * 0.62, z = L.cz + Math.sin(a) * s * 0.62; if (isFree(x, z, 1.5)) W.rock(x, z, W.r(0.8, 1.8), stoneM(), { sy: 0.7 }); } lotProps(W, L, st, 2); },
    // a patch of desert in other terrain
    dunes: (L) => { W.patch(L.cx, L.cz, L.size * 0.8, L.size * 0.7, 'sand', { rot: W.r(0, 1.5) }); for (let i = 0; i < 4; i++) { const p = lotSpot(W, L, 2.2); if (p) W.rock(p[0], p[1], W.r(0.9, 2.2), M_('mountain_rock', { color: 0xd8a070 }), { sy: W.r(0.6, 1) }); } let p = lotSpot(W, L, 3.4); if (p) W.prop('car_wreck', p[0], p[1], { size: 4.4, rot: W.r(0, 6.28) }); lotProps(W, L, st, 2); }
  };
  for (const k in OT.lots) LOTS['t_' + k] = (L) => RT_LOT[k](W, L, X);
  for (let i = 0; i < XB.length - 1; i++) for (let j = 0; j < ZB.length - 1; j++) {
    const q = { x0: XB[i], x1: XB[i + 1], z0: ZB[j], z1: ZB[j + 1] };
    const L = { r: q, cx: (q.x0 + q.x1) / 2, cz: (q.z0 + q.z1) / 2, size: Math.min(q.x1 - q.x0, q.z1 - q.z0) };
    if (Math.abs(L.cx) < core.x1 + 4 && Math.abs(L.cz) < core.z1 + 4) continue;   // the objective stands here
    const k = pickKind();
    try { LOTS[k](L); } catch (e) { console.warn('lot', k, e); }
    for (let t = 0; t < (k === 'forest' ? 0 : 3); t++) { const x = W.r(q.x0 + 2, q.x1 - 2), z = W.r(q.z0 + 2, q.z1 - 2); if (isFree(x, z, 2)) tree(W, x, z); }
    const s = NAV_SAFE(L.cx, L.cz); if (s) spawns.push(s);
  }
  outerRing(W, 110, (x, z) => tree(W, x, z), 2, 34);
  return { spawn: { x: sp[0], z: sp[1], yaw: sp[2] }, enemySpawns: spawns.filter(p => Math.hypot(p[0] - sp[0], p[1] - sp[1]) > 34) };
}

MAPS.push({
  name: 'RANDOM OPS · OUTDOOR', key: 'random_outdoor', group: 'outdoor', random: true, theme: 'woodland', camo: 'woodland',
  desc: 'A battlefield that never existed before, from 15 themes: park, street, neighborhood, mansion garden, festival, town square, boardwalk, botanical garden, mountain village, farm, beach, campground, market, industrial yard or rooftop plaza · 550 m across', bounds: { x0: -260, x1: 260, z0: -260, z1: 260 }, menuCam: { y: 22, r: 60 },
  noExpand: true,
  env: () => randomOutdoorEnv(),
  build(W, r) { return buildRandomOutdoor(W, r); }
});
