// ---------- Navigation grid, collider queries, line of sight ----------
const NAV = (() => {
  // the grid is sized per map from its bounds (expanded maps reach ~270 m across)
  const CELL = 0.5;
  let WX = 300, WZ = 300, OX = -75, OZ = -75;
  let blocked = new Uint8Array(WX * WZ);
  const idx = (ix, iz) => iz * WX + ix;
  const toIX = v => clamp(Math.floor((v - OX) / CELL), 0, WX - 1), toIZ = v => clamp(Math.floor((v - OZ) / CELL), 0, WZ - 1);
  const toWX = i => OX + (i + 0.5) * CELL, toWZ = i => OZ + (i + 0.5) * CELL;
  let bounds = { x0: -60, x1: 60, z0: -60, z1: 60 };
  let gs, came, stamp, closed, heapF, heapC;
  function alloc() {
    const n = WX * WZ;
    blocked = new Uint8Array(n); gs = new Float32Array(n); came = new Int32Array(n); stamp = new Uint32Array(n); closed = new Uint32Array(n);
    heapF = new Float32Array(n * 2); heapC = new Int32Array(n * 2); curStamp = 1;
  }

  // reach: cells connected to the player's spawn (flood fill after the final bake). While it exists, snap() only
  // returns reachable cells, so spawn points, team bases, respawns and objectives never land in a sealed-off area
  // (outside a closed hangar, behind a wall, inside a prop).
  let reach = null;
  function flood(x, z) {
    const n = WX * WZ; reach = null;
    const [sx, sz] = nudge(toIX(x), toIZ(z));
    reach = new Uint8Array(n);
    const q = new Int32Array(n); let h = 0, t = 0;
    const s = idx(sx, sz); if (blocked[s]) { reach = null; return 0; }
    reach[s] = 1; q[t++] = s;
    while (h < t) {
      const c = q[h++], cx = c % WX, cz = (c - cx) / WX;
      if (cx > 0 && !reach[c - 1] && !blocked[c - 1]) { reach[c - 1] = 1; q[t++] = c - 1; }
      if (cx < WX - 1 && !reach[c + 1] && !blocked[c + 1]) { reach[c + 1] = 1; q[t++] = c + 1; }
      if (cz > 0 && !reach[c - WX] && !blocked[c - WX]) { reach[c - WX] = 1; q[t++] = c - WX; }
      if (cz < WZ - 1 && !reach[c + WX] && !blocked[c + WX]) { reach[c + WX] = 1; q[t++] = c + WX; }
    }
    return t;
  }
  function reachable(x, z) { return reach ? !!reach[idx(toIX(x), toIZ(z))] : walkable(x, z); }
  // random reachable points at least minD from (x, z) (fallback spawn points)
  function sampleReach(x, z, minD, n, rng = Math.random) {
    const out = [];
    for (let k = 0; k < n * 400 && out.length < n; k++) {
      const px = bounds.x0 + 3 + rng() * (bounds.x1 - bounds.x0 - 6), pz = bounds.z0 + 3 + rng() * (bounds.z1 - bounds.z0 - 6);
      if (!reachable(px, pz) || Math.hypot(px - x, pz - z) < minD) continue;
      if (out.some(p => Math.hypot(p[0] - px, p[1] - pz) < 8)) continue;
      out.push([px, pz]);
    }
    return out;
  }

  function bake(b) {
    if (b) bounds = b;
    reach = null;
    const nx = Math.ceil((bounds.x1 - bounds.x0 + 8) / CELL), nz = Math.ceil((bounds.z1 - bounds.z0 + 8) / CELL);
    const ox = bounds.x0 - 4, oz = bounds.z0 - 4;
    if (nx !== WX || nz !== WZ || !gs) { WX = nx; WZ = nz; alloc(); }
    OX = ox; OZ = oz;
    blocked.fill(0);
    const pad = 0.45;
    for (const c of colliders) {
      if (!c.nav) continue;
      const x0 = toIX(c.x0 - pad), x1 = toIX(c.x1 + pad), z0 = toIZ(c.z0 - pad), z1 = toIZ(c.z1 + pad);
      for (let iz = z0; iz <= z1; iz++) for (let ix = x0; ix <= x1; ix++) blocked[idx(ix, iz)] = 1;
    }
    const bx0 = toIX(bounds.x0 + 0.6), bx1 = toIX(bounds.x1 - 0.6), bz0 = toIZ(bounds.z0 + 0.6), bz1 = toIZ(bounds.z1 - 0.6);
    for (let iz = 0; iz < WZ; iz++) for (let ix = 0; ix < WX; ix++) if (ix < bx0 || ix > bx1 || iz < bz0 || iz > bz1) blocked[idx(ix, iz)] = 1;
  }
  function walkable(x, z) { return !blocked[idx(toIX(x), toIZ(z))]; }
  function lineWalkable(ax, az, bx, bz) {
    const d = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(d / (CELL * 0.6)));
    for (let i = 1; i <= n; i++) { const t = i / n; if (!walkable(ax + (bx - ax) * t, az + (bz - az) * t)) return false; }
    return true;
  }
  function nudge(ix, iz) {
    const ok = (i) => !blocked[i] && (!reach || reach[i]);
    if (ok(idx(ix, iz))) return [ix, iz];
    for (let r = 1; r < (reach ? 90 : 14); r++) for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
      if (Math.abs(dx) !== r && Math.abs(dz) !== r) continue;
      const nx = ix + dx, nz = iz + dz;
      if (nx >= 0 && nx < WX && nz >= 0 && nz < WZ && ok(idx(nx, nz))) return [nx, nz];
    }
    return [ix, iz];
  }
  // nearest walkable world point
  function snap(x, z) { const [ix, iz] = nudge(toIX(x), toIZ(z)); return { x: toWX(ix), z: toWZ(iz) }; }

  const DIRS = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
  let curStamp = 1;
  // binary heap of (f, cell) in typed arrays (no temporary arrays while sifting)
  let hn = 0;
  function push(f, c) {
    let i = hn++;
    while (i > 0) { const p = (i - 1) >> 1; if (heapF[p] <= f) break; heapF[i] = heapF[p]; heapC[i] = heapC[p]; i = p; }
    heapF[i] = f; heapC[i] = c;
  }
  function pop() {
    const top = heapC[0]; hn--;
    const f = heapF[hn], c = heapC[hn];
    let i = 0;
    for (; ;) {
      const l = i * 2 + 1; if (l >= hn) break;
      const r = l + 1, m = r < hn && heapF[r] < heapF[l] ? r : l;
      if (heapF[m] >= f) break;
      heapF[i] = heapF[m]; heapC[i] = heapC[m]; i = m;
    }
    heapF[i] = f; heapC[i] = c;
    return top;
  }
  // octile distance, slightly inflated (weighted A*: far fewer expanded cells, near-optimal paths)
  function heur(x, z, tx, tz) { const dx = Math.abs(x - tx), dz = Math.abs(z - tz); return (dx > dz ? dx + 0.414 * dz : dz + 0.414 * dx) * 1.2; }
  function findPath(ax, az, bx, bz) {
    const [sx, sz] = nudge(toIX(ax), toIZ(az)), [tx, tz] = nudge(toIX(bx), toIZ(bz));
    curStamp++; hn = 0;
    const s = idx(sx, sz), t = idx(tx, tz);
    gs[s] = 0; stamp[s] = curStamp; came[s] = -1;
    push(heur(sx, sz, tx, tz), s);
    let found = false, iter = 0;
    const cap = WX * WZ > 500000 ? 240000 : 60000;   // the 550 m random battlefield needs longer searches
    while (hn && iter++ < cap) {
      const cur = pop();
      if (closed[cur] === curStamp) continue;
      closed[cur] = curStamp;
      if (cur === t) { found = true; break; }
      const cx = cur % WX, cz = (cur - cx) / WX;
      for (let k = 0; k < 8; k++) {
        const d = DIRS[k], nx = cx + d[0], nz = cz + d[1];
        if (nx < 0 || nx >= WX || nz < 0 || nz >= WZ) continue;
        const ni = idx(nx, nz);
        if (blocked[ni] || closed[ni] === curStamp) continue;
        if (d[0] && d[1] && (blocked[idx(cx + d[0], cz)] || blocked[idx(cx, cz + d[1])])) continue;
        const g = gs[cur] + d[2];
        if (stamp[ni] !== curStamp || g < gs[ni]) { stamp[ni] = curStamp; gs[ni] = g; came[ni] = cur; push(g + heur(nx, nz, tx, tz), ni); }
      }
    }
    if (!found) return null;
    const pts = []; let ci = t;
    while (ci !== -1 && pts.length < 4000) { const cx = ci % WX, cz = (ci - cx) / WX; pts.push([toWX(cx), toWZ(cz)]); ci = came[ci]; }
    pts.reverse();
    const out = [pts[0]]; let a = 0;
    for (let i = 2; i < pts.length; i += (i + 2 < pts.length ? 2 : 1)) if (!lineWalkable(pts[a][0], pts[a][1], pts[i][0], pts[i][1])) { const j = Math.max(a + 1, i - 2); out.push(pts[j]); a = j; }
    out.push(pts[pts.length - 1]);
    return out;
  }
  return { walkable, lineWalkable, findPath, bake, snap, flood, reachable, sampleReach, get bounds() { return bounds; } };
})();

// ---------- world ray (slab test against colliders) ----------
const _wrN = new THREE.Vector3();
// returns {t, point, normal, collider} or null. kind: 'shot' (bullets/LOS) or 'move'
function rayWorld(origin, dir, maxDist, kind = 'shot') {
  let best = maxDist, bestC = null, bestAxis = 0, bestSign = 0;
  const ox = origin.x, oy = origin.y, oz = origin.z, dx = dir.x, dy = dir.y, dz = dir.z;
  const ix = 1 / (dx || 1e-12), iy = 1 / (dy || 1e-12), iz = 1 / (dz || 1e-12);
  for (let i = 0; i < colliders.length; i++) {
    const c = colliders[i];
    if (kind === 'shot' ? !c.shot : !c.move) continue;
    let t1 = (c.x0 - ox) * ix, t2 = (c.x1 - ox) * ix;
    let tmin = Math.min(t1, t2), tmax = Math.max(t1, t2), axis = 0, sign = t1 < t2 ? -1 : 1;
    t1 = (c.y0 - oy) * iy; t2 = (c.y1 - oy) * iy;
    let a = Math.min(t1, t2), b = Math.max(t1, t2);
    if (a > tmin) { tmin = a; axis = 1; sign = t1 < t2 ? -1 : 1; }
    if (b < tmax) tmax = b;
    if (tmax < tmin) continue;
    t1 = (c.z0 - oz) * iz; t2 = (c.z1 - oz) * iz;
    a = Math.min(t1, t2); b = Math.max(t1, t2);
    if (a > tmin) { tmin = a; axis = 2; sign = t1 < t2 ? -1 : 1; }
    if (b < tmax) tmax = b;
    if (tmax < tmin || tmax < 0) continue;
    const t = tmin < 0 ? 0 : tmin;
    if (t < best) { best = t; bestC = c; bestAxis = axis; bestSign = sign; }
  }
  // ground plane (sunken basements / pits have their own, lower floor)
  if (dy < -1e-6) {
    let tg = (0 - oy) / dy;
    if (PITS.length) { const pt = pitAt(ox + dx * tg, oz + dz * tg); if (pt) tg = (pt.y - oy) / dy; }
    if (tg > 0 && tg < best) { best = tg; bestC = GROUND_COLLIDER; bestAxis = 1; bestSign = 1; }
  }
  if (!bestC) return null;
  const n = new THREE.Vector3(); n.setComponent(bestAxis, bestSign);
  return { t: best, point: origin.clone().addScaledVector(dir, best), normal: n, collider: bestC };
}
const GROUND_COLLIDER = { surface: 'concrete', ground: true };
// Sunken areas (basements under a floor slab, stairwells, orchestra pits): inside a pit rect the bare ground is
// pit.y instead of 0. The floor mesh has a hole there (W.ground holes), walls / rails / stairs are ordinary colliders.
const PITS = [];
function pitAt(x, z) { for (const p of PITS) if (x > p.x0 && x < p.x1 && z > p.z0 && z < p.z1) return p; return null; }
function baseGround(x, z) { if (!PITS.length) return 0; const p = pitAt(x, z); return p ? p.y : 0; }

function hasLOS(from, to) {
  _wrN.subVectors(to, from);
  const d = _wrN.length(); _wrN.multiplyScalar(1 / d);
  const h = rayWorld(from, _wrN, d - 0.25, 'shot');
  return !h || h.collider.ground;
}

function bakeCover() {
  coverPoints.length = 0;
  for (const c of colliders) {
    if (!c.nav || !c.shot) continue;
    const h = c.y1 - c.y0;
    if (c.y0 > 0.5 || h < 0.9 || (c.x1 - c.x0) * (c.z1 - c.z0) > 60) continue;
    const cx = (c.x0 + c.x1) / 2, cz = (c.z0 + c.z1) / 2, off = 0.9;
    [[cx, c.z0 - off], [cx, c.z1 + off], [c.x0 - off, cz], [c.x1 + off, cz]].forEach(p => {
      if (NAV.walkable(p[0], p[1])) coverPoints.push({ x: p[0], z: p[1], low: h < 1.6 });
    });
  }
}

// ---------- collider helpers ----------
function addCollider(x0, x1, y0, y1, z0, z1, opts = {}) {
  const c = { x0: Math.min(x0, x1), x1: Math.max(x0, x1), y0, y1, z0: Math.min(z0, z1), z1: Math.max(z0, z1),
    move: opts.move !== false, shot: opts.shot !== false, nav: opts.nav !== undefined ? opts.nav : (y0 < 1.6 && y1 > 0.4 && opts.move !== false),
    surface: opts.surface || 'concrete', explosive: opts.explosive || null };
  colliders.push(c);
  if (opts.minimap !== false && c.nav) mapRects.push({ x: (c.x0 + c.x1) / 2, z: (c.z0 + c.z1) / 2, w: c.x1 - c.x0, d: c.z1 - c.z0 });
  return c;
}

// highest standable surface under a footprint (r = radius) not higher than y+step
function groundHeightAt(x, z, curY, r = 0.3, step = 0.5) {
  let h = PITS.length ? baseGround(x, z) : 0;
  for (const c of colliders) {
    if (!c.move) continue;
    if (x > c.x0 - r && x < c.x1 + r && z > c.z0 - r && z < c.z1 + r && c.y1 <= curY + step && c.y1 > h) h = c.y1;
  }
  return h;
}

// push a circle out of colliders that overlap the body's vertical span
function resolveCollision(p, r, y, height = 1.75, step = 0.5) {
  for (const c of colliders) {
    if (!c.move) continue;
    if (c.y1 <= y + step || c.y0 >= y + height) continue;
    const nx = clamp(p.x, c.x0, c.x1), nz = clamp(p.z, c.z0, c.z1);
    const dx = p.x - nx, dz = p.z - nz, d2 = dx * dx + dz * dz;
    if (d2 < r * r) {
      if (d2 > 1e-8) { const d = Math.sqrt(d2); p.x = nx + dx / d * r; p.z = nz + dz / d * r; }
      else {
        // centre inside the box: push out along the shallowest axis
        const ex = Math.min(p.x - c.x0, c.x1 - p.x), ez = Math.min(p.z - c.z0, c.z1 - p.z);
        if (ex < ez) p.x = (p.x - c.x0 < c.x1 - p.x) ? c.x0 - r : c.x1 + r; else p.z = (p.z - c.z0 < c.z1 - p.z) ? c.z0 - r : c.z1 + r;
      }
    }
  }
  const b = NAV.bounds;
  p.x = clamp(p.x, b.x0 + r, b.x1 - r); p.z = clamp(p.z, b.z0 + r, b.z1 - r);
}

function ceilingAbove(x, z, y, r = 0.3) {
  let h = Infinity;
  for (const c of colliders) {
    if (!c.move) continue;
    if (x > c.x0 - r && x < c.x1 + r && z > c.z0 - r && z < c.z1 + r && c.y0 >= y && c.y0 < h) h = c.y0;
  }
  return h;
}
