// ---------- World building toolkit, environment, map loading ----------
const WORLD = {
  indoor: false, env: { hemiI: 0.5, sunI: 0 }, enemyTheme: 'urban', camo: 'urban', groundSurface: 'concrete',
  bounds: { x0: -40, x1: 40, z0: -40, z1: 40 }, spawn: { x: 0, z: 0, yaw: 0 }, enemySpawns: [], explosives: [], menuCam: null, name: '',
  lamps: [], backdrop: null
};
const _wM = new THREE.Matrix4(), _wQ = new THREE.Quaternion(), _wP = new THREE.Vector3(), _wS = new THREE.Vector3(1, 1, 1), _wE = new THREE.Euler();

const W = {
  rnd: Math.random,
  r(a, b) { return a + this.rnd() * (b - a); },
  pick(arr) { return arr[Math.floor(this.rnd() * arr.length)]; },

  // Solid box. y = bottom.
  box(x, y, z, w, h, d, mat, o = {}) {
    const geo = new THREE.BoxGeometry(w, h, d);
    _wE.set(o.rotX || 0, o.rot || 0, o.rotZ || 0); _wQ.setFromEuler(_wE);
    _wM.compose(_wP.set(x, y + h / 2, z), _wQ, _wS);
    STATIC.add(geo, mat, _wM, { noShadow: o.noShadow, uvRot: o.uvRot });
    geo.dispose();
    if (o.collide === false) return;
    let ex = w / 2, ez = d / 2;
    const r = o.rot || 0;
    if (r) { const c = Math.abs(Math.cos(r)), s = Math.abs(Math.sin(r)); ex = w / 2 * c + d / 2 * s; ez = w / 2 * s + d / 2 * c; }
    return addCollider(x - ex, x + ex, y, y + h, z - ez, z + ez, { move: o.move, shot: o.shot, nav: o.nav, surface: o.surface || mat.userData.surface, minimap: o.minimap });
  },

  // Axis-aligned wall from (x0,z0) to (x1,z1). openings: [{at (distance from start), w, h, y (sill)}]
  wall(x0, z0, x1, z1, h, t, mat, o = {}) {
    const y = o.y || 0;
    const alongX = Math.abs(x1 - x0) >= Math.abs(z1 - z0);
    const len = alongX ? Math.abs(x1 - x0) : Math.abs(z1 - z0);
    const sx = alongX ? Math.sign(x1 - x0) || 1 : 0, sz = alongX ? 0 : Math.sign(z1 - z0) || 1;
    // walls on the core's outer edge get doorways into the expansion wings (see expand.js)
    const ops = (!o.noAuto && WORLD.coreOpen && !(o.y > 0.5) ? coreWallOpenings(x0, z0, x1, z1, h, o.openings || []) : (o.openings || [])).slice().sort((a, b) => a.at - b.at);
    const seg = (a, b, yy, hh) => {
      if (b - a < 0.05 || hh < 0.05) return;
      const m = (a + b) / 2, L = b - a;
      const cx = x0 + sx * m, cz = z0 + sz * m;
      this.box(cx, yy, cz, alongX ? L : t, hh, alongX ? t : L, mat, { surface: o.surface, minimap: o.minimap, noShadow: o.noShadow });
    };
    let cur = 0;
    for (const op of ops) {
      const a = clamp(op.at - op.w / 2, 0, len), b = clamp(op.at + op.w / 2, 0, len);
      seg(cur, a, y, h);
      const sill = op.y || 0, top = sill + op.h;
      if (sill > 0) seg(a, b, y, sill);
      if (top < h) seg(a, b, y + top, h - top);
      if (op.glass) this.glass(x0 + sx * (a + b) / 2, y + sill, z0 + sz * (a + b) / 2, alongX ? b - a : t * 0.3, op.h, alongX ? t * 0.3 : b - a, op.glass);
      cur = b;
    }
    seg(cur, len, y, h);
  },

  glass(x, y, z, w, h, d, color) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), color === 'lit' ? MATLIB.emissive(0xffc070, 2.2) : MATLIB.plain(0x9ab8d0, { rough: 0.05, metal: 0.6, opacity: 0.35 }));
    m.position.set(x, y + h / 2, z); scene.add(m); mapObjects.push(m);
  },

  // Room with walls (doors per side as offsets from the side's start), optional floor & ceiling
  room(x, z, w, d, h, o = {}) {
    const t = o.t || 0.3, wm = o.wall, x0 = x - w / 2, x1 = x + w / 2, z0 = z - d / 2, z1 = z + d / 2;
    const D = o.doors || {}, Wn = o.windows || {}, dw = o.doorW || 2.4, dh = o.doorH || 2.6;
    const mk = (side) => [...(D[side] || []).map(a => ({ at: a, w: dw, h: dh })), ...(Wn[side] || []).map(a => ({ at: a, w: o.winW || 1.4, h: o.winH || 1.1, y: o.winY || 1.1, glass: o.glass }))];
    if (!o.skip || !o.skip.includes('n')) this.wall(x0, z0, x1, z0, h, t, wm, { openings: mk('n'), y: o.y });
    if (!o.skip || !o.skip.includes('s')) this.wall(x0, z1, x1, z1, h, t, wm, { openings: mk('s'), y: o.y });
    if (!o.skip || !o.skip.includes('w')) this.wall(x0, z0 + t / 2, x0, z1 - t / 2, h, t, wm, { openings: mk('w').map(p => ({ ...p, at: p.at - t / 2 })), y: o.y });
    if (!o.skip || !o.skip.includes('e')) this.wall(x1, z0 + t / 2, x1, z1 - t / 2, h, t, wm, { openings: mk('e').map(p => ({ ...p, at: p.at - t / 2 })), y: o.y });
    if (o.floor) { this.box(x, (o.y || 0) - 0.1 + 0.001, z, w, 0.1, d, o.floor, { collide: false, noShadow: true }); GROUND_EXCL.push({ x0: x0, x1: x1, z0: z0, z1: z1 }); }
    if (o.ceil) this.box(x, (o.y || 0) + h, z, w + t, o.roofT || 0.3, d + t, o.ceil, { nav: false, minimap: false });
    if (o.roofLip) this.box(x, (o.y || 0) + h + (o.roofT || 0.3), z, w + t + 0.3, 0.12, d + t + 0.3, o.roofLip, { collide: false });
  },

  pillar(x, z, s, h, mat, o = {}) { return this.box(x, o.y || 0, z, s, h, s, mat, o); },

  // stairs rising along dir ('+x','-x','+z','-z') starting at (x,z)
  stairs(x, z, width, length, height, dir, mat) {
    const n = Math.max(2, Math.round(height / 0.25)), stepL = length / n, stepH = height / n;
    for (let i = 0; i < n; i++) {
      const off = stepL * (i + 0.5), hh = stepH * (i + 1);
      const px = x + (dir === '+x' ? off : dir === '-x' ? -off : 0), pz = z + (dir === '+z' ? off : dir === '-z' ? -off : 0);
      const ax = dir === '+x' || dir === '-x';
      this.box(px, 0, pz, ax ? stepL : width, hh, ax ? width : stepL, mat, { nav: i < 2, minimap: i === n - 1 });
    }
  },

  // GLB prop. size: metres for largest dimension (or axis 'h' / 'w')
  prop(name, x, z, o = {}) {
    const m = ASSETS.models[name];
    if (!m) return null;
    const ref = o.axis === 'h' ? m.size.y : o.axis === 'w' ? Math.max(m.size.x, m.size.z) : Math.max(m.size.x, m.size.y, m.size.z);
    const k = (o.size || 1) / (ref || 1);
    const rot = o.rot || 0, y = o.y || 0;
    _wQ.setFromAxisAngle(WUP, rot);
    const local = new THREE.Matrix4().makeTranslation(-m.center.x, -m.box.min.y, -m.center.z);
    const world = new THREE.Matrix4().compose(_wP.set(x, y, z), _wQ, _wS.set(k, k, k)).multiply(local);
    _wS.set(1, 1, 1);
    INSTANCER.add(name, world);
    const sx = m.size.x * k, sy = m.size.y * k, sz = m.size.z * k;
    let c = null;
    if (o.collide !== false) {
      const pad = o.pad !== undefined ? o.pad : 0.93; // collide with (almost) the visible size: no clipping into props
      const cs = Math.abs(Math.cos(rot)), sn = Math.abs(Math.sin(rot));
      const ex = (sx / 2 * cs + sz / 2 * sn) * pad, ez = (sx / 2 * sn + sz / 2 * cs) * pad;
      const ch = o.colH !== undefined ? o.colH : sy;
      c = addCollider(x - ex, x + ex, y, y + ch, z - ez, z + ez, { surface: o.surface || 'metal', shot: o.shot, move: o.move, nav: o.nav });
      if (y < 0.3 && Math.max(sx, sz) < 14) AO_BATCH.add(x, z, sx * 1.35 + 0.5, sz * 1.35 + 0.5, 0, rot);
    }
    return { size: new THREE.Vector3(sx, sy, sz), collider: c };
  },

  explosiveBarrel(x, z) {
    const p = this.prop('tnt_barrel', x, z, { size: 1.1, axis: 'h', rot: this.r(0, 6.28), surface: 'metal' });
    if (p) this.explosive(p, 'tnt_barrel', x, z);
  },
  // Every barrel is a fuel drum: shooting it sets it off (TNT biggest, red standard, rusty smaller), explosions set
  // off the barrels around them, and the destroyed drum disappears from its instanced batch.
  explosive(p, prop, x, z) {
    if (!p || !p.collider) return null;
    const spec = { tnt_barrel: [40, 1.15], barrel_red: [32, 1.0], barrel_rust: [45, 0.72] }[prop] || [40, 0.9];
    const ex = { x, z, hp: spec[0], power: spec[1], alive: true, collider: p.collider, prop };
    p.collider.explosive = ex;
    WORLD.explosives.push(ex);
    return ex;
  },

  // ---------- hard cover kit: small wooden boxes, low walls, flipped tables + chairs, leaning aluminium doors ----------
  // Parts are placed in a local frame (x across, z depth, y up) rotated by `rot` about the vertical; tilted parts get
  // no collider of their own, each piece adds one solid collider for its footprint instead.
  _part(f, lx, ly, lz, sx, sy, sz, mat, o = {}) {
    const c = Math.cos(f.rot), s = Math.sin(f.rot);
    const wx = f.x + lx * c + lz * s, wz = f.z - lx * s + lz * c;
    return this.box(wx, ly - sy / 2, wz, sx, sy, sz, mat, Object.assign({ rot: f.rot, collide: false }, o));
  },
  _footprint(f, hw, hd, h, surface) {
    const c = Math.abs(Math.cos(f.rot)), s = Math.abs(Math.sin(f.rot)), ex = hw * c + hd * s, ez = hw * s + hd * c;
    return addCollider(f.x - ex, f.x + ex, 0, h, f.z - ez, f.z + ez, { surface });
  },
  woodBox(x, z, size = 0.7, rot = 0, stack = 1) {
    const wood = MATLIB.get('wood', { color: 0xc0a27a }), band = MATLIB.get('wood', { color: 0x6e5338 });
    for (let i = 0; i < stack; i++) {
      const s = size * (i ? 0.82 : 1), y = i ? size + (i - 1) * size * 0.82 : 0, f = { x: x + (i ? this.r(-0.08, 0.08) : 0), z: z + (i ? this.r(-0.08, 0.08) : 0), rot: rot + (i ? this.r(-0.35, 0.35) : 0) };
      this._part(f, 0, y + s / 2, 0, s, s, s, wood);
      for (const by of [0.14, 0.86]) this._part(f, 0, y + s * by, 0, s + 0.025, 0.06, s + 0.025, band);
      this._part(f, 0, y + s / 2, 0, 0.06, s + 0.02, s + 0.025, band);   // vertical batten
    }
    this._footprint({ x, z, rot }, size / 2, size / 2, size + (stack - 1) * size * 0.82, 'wood');
    AO_BATCH.add(x, z, size * 1.6, size * 1.6, 0, rot);
  },
  lowWall(x, z, len, rot = 0, mat = null, o = {}) {
    mat = mat || MATLIB.get('brick'); const f = { x, z, rot }, t = 0.3, n = Math.max(2, Math.round(len / 0.45)), h = o.h || 1.1;
    for (let i = 0; i < n; i++) {
      const lx = -len / 2 + (i + 0.5) * len / n, broken = o.broken !== false && (i === 0 || i === n - 1 || this.rnd() < 0.18);
      const sh = broken ? h * this.r(0.55, 0.85) : h * this.r(0.97, 1.03);
      this._part(f, lx, sh / 2, 0, len / n + 0.002, sh, t, mat);
    }
    this._part(f, 0, h + 0.03, 0, len * 0.72, 0.06, t + 0.04, MATLIB.get('concrete', { color: 0xa8a49c }));   // coping
    for (let i = 0; i < 4; i++) this._part(f, this.r(-len / 2, len / 2), 0.05, (this.rnd() < 0.5 ? -1 : 1) * this.r(0.3, 0.7), 0.22, 0.09, 0.11, mat, { rot: rot + this.r(0, 3) }); // fallen bricks
    this._footprint(f, len / 2, t / 2 + 0.03, h, mat.userData.surface || 'concrete');
    AO_BATCH.add(x, z, len + 0.8, 1.2, 0, rot);
  },
  // table knocked on its side as a barricade (top facing the enemy, legs sticking out back), chairs toppled nearby
  coverTable(x, z, rot = 0) {
    const top = MATLIB.get('wood_floor', { color: 0x9a7a5c }), leg = MATLIB.plain(0x3a3d42, { rough: 0.45, metal: 0.7 }), f = { x, z, rot };
    this._part(f, 0, 0.42, 0, 1.6, 0.8, 0.05, top);
    for (const lx of [-0.72, 0.72]) for (const ly of [0.1, 0.74]) this._part(f, lx, ly, 0.4, 0.05, 0.05, 0.74, leg);
    this._footprint(f, 0.82, 0.12, 0.84, 'wood');
    for (let i = 0; i < 1 + (this.rnd() < 0.6 ? 1 : 0); i++) this.chair(x + Math.cos(rot) * this.r(-1.2, 1.2) + Math.sin(rot) * 1.1, z - Math.sin(rot) * this.r(-1.2, 1.2) + Math.cos(rot) * 1.1, this.r(0, 6.28), this.rnd() < 0.75);
    AO_BATCH.add(x, z, 2.2, 1.4, 0, rot);
  },
  chair(x, z, rot = 0, toppled = true) {
    const seat = MATLIB.get('wood', { color: 0x8a6a4c }), frame = MATLIB.plain(0x2e3136, { rough: 0.4, metal: 0.75 });
    if (!toppled) {
      const f = { x, z, rot };
      this._part(f, 0, 0.46, 0, 0.44, 0.04, 0.44, seat); this._part(f, 0, 0.75, -0.2, 0.44, 0.34, 0.04, seat);
      for (const [lx, lz] of [[-0.19, -0.19], [0.19, -0.19], [-0.19, 0.19], [0.19, 0.19]]) this._part(f, lx, 0.22, lz, 0.03, 0.44, 0.03, frame);
    } else {
      // lying on its back: seat vertical, back flat on the floor, legs pointing up
      const f = { x, z, rot };
      this._part(f, 0, 0.24, 0, 0.44, 0.44, 0.04, seat); this._part(f, 0, 0.03, 0.3, 0.44, 0.04, 0.4, seat);
      for (const lx of [-0.19, 0.19]) for (const ly of [0.05, 0.42]) this._part(f, lx, ly, -0.22, 0.03, 0.03, 0.44, frame);
    }
    this._footprint({ x, z, rot }, 0.28, 0.28, toppled ? 0.48 : 0.95, 'wood');
  },
  // aluminium door torn off its hinges, propped up as a barricade and braced with a box
  metalDoor(x, z, rot = 0) {
    const alu = MATLIB.get('metal', { color: 0xd0d6dc }), frame = MATLIB.plain(0x8a9098, { rough: 0.35, metal: 0.85 }), f = { x, z, rot };
    this._part(f, 0, 1.0, 0, 0.92, 2.0, 0.05, alu, { rotX: -0.16 });
    this._part(f, 0, 1.0, 0.03, 0.96, 0.06, 0.07, frame, { rotX: -0.16 }); this._part(f, 0, 1.95, 0.18, 0.96, 0.06, 0.07, frame, { rotX: -0.16 });
    this._part(f, 0.34, 1.0, -0.06, 0.12, 0.03, 0.04, frame, { rotX: -0.16 });  // handle
    this._part(f, 0, 0.75, 0.08, 0.7, 0.38, 0.03, MATLIB.plain(0x1c2228, { rough: 0.1, metal: 0.4 }), { rotX: -0.16 }); // wired glass panel
    this._footprint(f, 0.48, 0.2, 1.95, 'metal');
    this.woodBox(x + Math.sin(rot) * 0.75, z + Math.cos(rot) * 0.75, 0.55, rot + this.r(-0.3, 0.3));
  },

  // Lamp fixture (housing + emissive diffuser), floor light pool, ceiling glow, and a lamp record the real-light
  // pool (LIGHTPOOL) occupies when the player is nearby. o.real marks the brighter, primary lamps.
  lamp(x, y, z, color, o = {}) {
    const kind = o.fixture || 'tube';
    const geo = kind === 'bulb' ? new THREE.SphereGeometry(0.12, 10, 8) : kind === 'flood' ? new THREE.BoxGeometry(0.6, 0.3, 0.4) : new THREE.BoxGeometry(o.len || 1.4, 0.06, 0.14);
    const mat = MATLIB.emissive(color, o.glow || (kind === 'bulb' ? 4 : kind === 'flood' ? 3.5 : 3.4));
    const lamp = { x, y, z, color, i: (o.intensity || 1.25) * (o.real ? 1.15 : 1), dist: o.dist || (kind === 'flood' ? 24 : 14), mult: 1, score: 0 };
    WORLD.lamps.push(lamp);
    if (o.flicker) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.y = o.rot || 0; scene.add(m); mapObjects.push(m); mapAnimators.push(flickerAnim(m, lamp, o.flicker)); }
    else { _wQ.setFromAxisAngle(WUP, o.rot || 0); _wM.compose(_wP.set(x, y, z), _wQ, _wS.set(1, 1, 1)); STATIC.add(geo, mat, _wM, { noShadow: true, keepUV: true }); geo.dispose(); _wQ.identity(); }
    if (kind === 'tube') { // metal housing above the diffuser
      const hg = new THREE.BoxGeometry((o.len || 1.4) + 0.1, 0.07, 0.24);
      _wQ.setFromAxisAngle(WUP, o.rot || 0); _wM.compose(_wP.set(x, y + 0.055, z), _wQ, _wS.set(1, 1, 1)); STATIC.add(hg, MATLIB.plain(0xb8bcc0, { rough: 0.45, metal: 0.6 }), _wM, { noShadow: true, keepUV: true }); hg.dispose(); _wQ.identity();
    }
    if (o.pool !== false) this.lightPool(x, o.floorY || 0, z, color, o.poolSize || 6, (o.poolI || 0.35) * 1.25);
    // light spilling across the ceiling around indoor fixtures
    if (WORLD.indoor && kind !== 'flood' && o.ceilGlow !== false) POOL_BATCH.add(x, y + (kind === 'bulb' ? 0.14 : 0.09), z, kind === 'bulb' ? 3.2 : 3.8, new THREE.Color(color).multiplyScalar(0.42), true);
    return lamp;
  },
  lightPool(x, y, z, color, size, inten) { POOL_BATCH.add(x, y, z, size, new THREE.Color(color).multiplyScalar(inten)); },
  // Open fire (burning drum, wreck, debris pile): looping flames, embers and smoke, a flickering warm light the
  // light pool can pick up, and a glow on the ground. Particles only spawn near the camera.
  fire(x, y, z, size = 1, o = {}) {
    const lamp = { x, y: y + 0.7 * size, z, color: o.color || 0xff8a3a, i: (o.intensity || 1.7) * Math.sqrt(size), dist: (o.dist || 12) * Math.sqrt(size), mult: 1, score: 0 };
    WORLD.lamps.push(lamp);
    this.lightPool(x, o.floorY || 0, z, 0xff7428, 5.5 * Math.sqrt(size), 0.5);
    const bed = new THREE.Mesh(new THREE.CircleGeometry(0.32 * size, 12), MATLIB.emissive(0xff5a18, 2.4));
    bed.rotation.x = -Math.PI / 2; bed.position.set(x, y + 0.02, z); scene.add(bed); mapObjects.push(bed);
    const seed = Math.random() * 10, P = new THREE.Vector3(x, y, z);
    let acc = 0, sacc = 0;
    mapAnimators.push((t, dt) => {
      lamp.mult = 0.8 + 0.14 * Math.sin(t * 9.1 + seed) * Math.sin(t * 5.3 + seed * 2) + 0.08 * Math.sin(t * 23 + seed);
      bed.material.emissiveIntensity = 2.0 + lamp.mult;
      const d = Math.hypot(activeCamera.position.x - x, activeCamera.position.z - z);
      if (d > 75 || !dt) return;
      acc += dt * (d < 30 ? 16 : 7) * size; sacc += dt * 2.2 * size;
      while (acc >= 1) {
        acc -= 1;
        const f = fxSprite('explosion', Math.random() < 0.5 ? 0xffa050 : 0xff7a30, rand(0.35, 0.7) * size, P.clone().add(_wP.set(rand(-0.25, 0.25) * size, rand(0, 0.25) * size, rand(-0.25, 0.25) * size)), { additive: true, opacity: 0.85 });
        addParticle(f, rand(0.45, 0.8), 'smoke', { grav: -2.6 * size, grow: -0.6, op: 0.85, vel: new THREE.Vector3(rand(-0.2, 0.2), rand(0.9, 1.6) * size, rand(-0.2, 0.2)) });
        if (Math.random() < 0.12) { const e = fxSprite('glint', 0xffb060, 0.05, P.clone().setY(y + 0.4 * size), { additive: true }); addParticle(e, rand(1, 1.8), 'smoke', { grav: -1.4, grow: -0.3, op: 1, vel: new THREE.Vector3(rand(-0.6, 0.6), rand(1.2, 2.4), rand(-0.6, 0.6)) }); }
      }
      while (sacc >= 1) {
        sacc -= 1;
        const s = fxSprite('smoke', 0x3a3632, rand(0.7, 1.2) * size, P.clone().setY(y + 1.1 * size), { opacity: 0.45 });
        addParticle(s, rand(2.5, 4), 'smoke', { grav: -0.6, grow: 1.1, op: 0.45, vel: new THREE.Vector3(rand(-0.25, 0.25), rand(0.7, 1.2), rand(-0.25, 0.25)) });
      }
    });
    return lamp;
  },
  // burning oil drum: a rusted barrel with the fire inside it
  fireDrum(x, z, o = {}) {
    this.prop('barrel_rust', x, z, { size: 0.95, surface: 'metal' });
    return this.fire(x, 0.92, z, o.size || 0.75, o);
  },
  // light shaft / volumetric cone (additive)
  shaft(x, y, z, r0, r1, len, color, o = {}) {
    // Soft volume: brightness falls off along the beam and towards the silhouette (walls seen edge-on vanish), and the
    // beam fades out as the camera walks into it - so looking up through it never shows a hard ring or a disc of light.
    const geo = new THREE.CylinderGeometry(r0, r1, len, 24, 1, true); geo.translate(0, -len / 2, 0);
    const mat = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(color).multiplyScalar((o.i || 0.35) * 0.8) } },
      vertexShader: 'varying vec3 vN; varying vec3 vW; varying float vV;\n' +
        'void main(){ vV = uv.y; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: 'uniform vec3 uColor; varying vec3 vN; varying vec3 vW; varying float vV;\n' +
        'void main(){ vec3 V = cameraPosition - vW; float d = length(V); V /= max(d, 1e-3);\n' +
        '  float face = abs(dot(normalize(vN), V)); face *= face;\n' +
        '  float along = vV * vV * smoothstep(1.0, 0.85, vV) * 1.6;\n' +
        '  float near = smoothstep(1.0, 6.0, d);\n' +
        '  gl_FragColor = vec4(uColor * face * along * near, 1.0); }',
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false
    });
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z);
    if (o.dir) m.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), o.dir.clone().normalize());
    scene.add(m); mapObjects.push(m); return m;
  },
  searchlight(x, z, h, color) {
    const pole = MATLIB.plain(0x55595e, { rough: 0.5, metal: 0.7 });
    this.box(x, 0, z, 0.3, h, 0.3, pole);
    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.22, 0.45, 12), MATLIB.emissive(color, 4)); head.position.set(x, h + 0.2, z); scene.add(head); mapObjects.push(head);
    const spot = new THREE.SpotLight(color, 3.5, 70, 0.22, 0.5, 1.5); spot.position.set(x, h + 0.2, z);
    const tgt = new THREE.Object3D(); scene.add(tgt); spot.target = tgt; scene.add(spot); mapObjects.push(spot, tgt);
    const beam = this.shaft(x, h + 0.2, z, 0.25, 7, 40, color, { i: 0.18 });
    const ph = this.rnd() * 6.28;
    mapAnimators.push((t) => {
      const a = ph + Math.sin(t * 0.25 + ph) * 1.6, r = 18 + Math.sin(t * 0.4 + ph) * 6;
      tgt.position.set(x + Math.sin(a) * r, 0, z + Math.cos(a) * r);
      const dir = _wP.set(tgt.position.x - x, -h, tgt.position.z - z).normalize();
      beam.quaternion.setFromUnitVectors(_dn, dir);
    });
  },

  // Conifer: trunk, a dark inner crown, then whorls of drooping branch cards (flat + crossed) that get shorter
  // toward the top - alpha-tested needle sprays give a real silhouette and dappled shadows. Merged into the static batch.
  pine(x, z, h, o = {}) {
    const tint = o.snow ? 0xd6dee4 : (o.color ? new THREE.Color(o.color).lerp(new THREE.Color(0xffffff), 0.55).getHex() : 0xc8d8c0);
    const trunkM = MATLIB.get('bark'), coreM = MATLIB.get('leaves', { color: o.snow ? 0x7a868c : 0x223322 }), brM = foliageMaterial('pine_branch', tint);
    const g1 = new THREE.CylinderGeometry(0.05 * h / 8, 0.22 * h / 8, h * 0.92, 6);
    _wM.compose(_wP.set(x, h * 0.46, z), _wQ.identity(), _wS.set(1, 1, 1)); STATIC.add(g1, trunkM, _wM); g1.dispose();
    const core = new THREE.ConeGeometry(h * 0.1, h * 0.7, 7); core.rotateY(this.r(0, 3));
    _wM.compose(_wP.set(x, h * 0.25 + h * 0.35, z), _wQ.identity(), _wS); STATIC.add(core, coreM, _wM); core.dispose();
    const layers = clamp(Math.round(h * 0.85), 6, 14), spin = this.r(0, 6.28);
    for (let i = 0; i < layers; i++) {
      const u = i / (layers - 1), y = h * (0.22 + 0.74 * u), R = h * 0.27 * Math.pow(1 - u, 0.85) + 0.32;
      const cards = u > 0.85 ? 3 : (u < 0.4 ? 6 : 5);
      for (let c = 0; c < cards; c++) {
        const ang = spin + c / cards * 6.283 + i * 0.73 + this.r(-0.25, 0.25), droop = 0.22 + (1 - u) * 0.3 + this.r(-0.08, 0.08), len = R * this.r(0.85, 1.15);
        for (const roll of [0, Math.PI / 2]) {
          _wE.set(roll, ang, -droop, 'YZX'); _wQ.setFromEuler(_wE);
          _wM.compose(_wP.set(x, y, z), _wQ, _wS.set(len, 1, len * 0.5)); STATIC.add(BRANCH_CARD, brM, _wM, { keepUV: true });
        }
      }
    }
    _wE.set(0, 0, 0, 'XYZ'); _wQ.identity(); _wS.set(1, 1, 1);
    addCollider(x - 0.25, x + 0.25, 0, h * 0.5, z - 0.25, z + 0.25, { surface: 'wood', minimap: false });
  },
  rock(x, z, s, mat, o = {}) {
    const g = new THREE.IcosahedronGeometry(s, 2);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const v = _wP.fromBufferAttribute(p, i); const n = 1 + (Math.sin(v.x * 2.1 / s + x) * Math.cos(v.z * 1.7 / s + z) * 0.16) + Math.sin(v.y * 3.3 / s + z) * 0.08 + this.r(-0.04, 0.04); p.setXYZ(i, v.x * n * (o.sx || 1), v.y * n * (o.sy || 0.7), v.z * n * (o.sz || 1)); }
    g.computeVertexNormals();
    _wM.compose(_wP.set(x, (o.y || 0) + s * (o.sy || 0.7) * 0.55, z), _wQ.setFromAxisAngle(WUP, this.r(0, 6.28)), _wS.set(1, 1, 1));
    STATIC.add(g, mat || MATLIB.get('rock'), _wM); g.dispose();
    const ex = s * (o.sx || 1) * 0.8, ez = s * (o.sz || 1) * 0.8;
    if (o.collide !== false) addCollider(x - ex, x + ex, 0, (o.y || 0) + s * (o.sy || 0.7) * 1.4, z - ez, z + ez, { surface: 'rock' });
  },

  // water surface (+ movement blocker unless walkable)
  water(x, z, w, d, y, o = {}) {
    const geo = new THREE.PlaneGeometry(w, d, 1, 1); geo.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(geo, waterMaterial(o.color || 0x2a4a5a, o.flow || 0, w, d));
    m.position.set(x, y, z); m.receiveShadow = true; scene.add(m); mapObjects.push(m);
    if (!o.walk) addCollider(x - w / 2, x + w / 2, -1, 1.2, z - d / 2, z + d / 2, { shot: false, surface: 'water', minimap: false });
    return m;
  },

  // River channel / lake basin dug into the terrain (axis 'x': runs along x, width across z). The terrain is cut
  // away (CHANNEL_CUTS) and replaced by sloped mud banks and a gravel bed; the water sits below the bank lip and
  // its colour follows the real depth under each pixel, with sky / scene reflections and foam along the banks.
  channel(cx, cz, len, w, axis, o = {}) {
    const ax = axis === 'x', hw = w / 2, bank = o.bank ?? 1.7, depth = o.depth ?? 1.9, surf = o.surf ?? -0.68;
    const ex = ax ? len / 2 : hw + bank, ez = ax ? hw + bank : len / 2;
    if (CHANNEL_N < CHANNEL_CUTS.length) CHANNEL_CUTS[CHANNEL_N++].set(cx - ex, cz - ez, cx + ex, cz + ez);
    GROUND_EXCL.push({ x0: cx - ex, x1: cx + ex, z0: cz - ez, z1: cz + ez });
    const H = WORLD.groundH || (() => 0);
    const prof = [[-(hw + bank), 0], [-(hw + bank * 0.45), -0.24], [-(hw + 0.12), surf + 0.04], [-(hw - Math.min(1.1, hw * 0.4)), -depth],
      [hw - Math.min(1.1, hw * 0.4), -depth], [hw + 0.12, surf + 0.04], [hw + bank * 0.45, -0.24], [hw + bank, 0]];
    const segs = Math.max(2, Math.ceil(len / 2.2)), NP = prof.length;
    const P = (t, u, y) => ax ? [cx + t, y, cz + u] : [cx + u, y, cz + t];
    const pos = [];
    for (let i = 0; i <= segs; i++) {
      const t = -len / 2 + len * i / segs;
      for (let j = 0; j < NP; j++) {
        let [u, y] = prof[j];
        const edge = j === 0 || j === NP - 1, n = Math.sin(t * 0.37 + j * 1.7) * 0.5 + Math.sin(t * 0.91 + j * 3.1) * 0.5;
        if (!edge) { u += n * (j === 3 || j === 4 ? 0.25 : 0.18); y += n * (j === 3 || j === 4 ? 0.12 : 0.05); }
        const p = P(t, u, y);
        if (edge) p[1] = H(p[0], p[2]) + 0.01;
        pos.push(p);
      }
    }
    const build = (j0, j1) => {
      const v = [], idx = [];
      for (let i = 0; i <= segs; i++) for (let j = j0; j <= j1; j++) v.push(...pos[i * NP + j]);
      const cols = j1 - j0 + 1;
      for (let i = 0; i < segs; i++) for (let j = 0; j < cols - 1; j++) { const a = i * cols + j, b = a + 1, c = a + cols, d = c + 1; idx.push(a, d, c, a, b, d); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); g.setIndex(idx); g.computeVertexNormals();
      if (g.attributes.normal.getY(Math.floor(cols / 2)) < 0) { for (let k = 0; k < idx.length; k += 3) { const tmp = idx[k + 1]; idx[k + 1] = idx[k + 2]; idx[k + 2] = tmp; } g.setIndex(idx); g.computeVertexNormals(); }
      return g;
    };
    _wM.identity();
    const bankMat = o.bankMat || MATLIB.get('dirt', { color: 0x6a5c4a, wet: true }), bedMat = o.bedMat || MATLIB.get('gravel', { color: 0x4a463e, wet: true });
    for (const [a, b] of [[0, 3], [4, NP - 1]]) { const g = build(a, b); STATIC.add(g, bankMat, _wM); g.dispose(); }
    { const g = build(3, 4); STATIC.add(g, bedMat, _wM, { noShadow: true }); g.dispose(); }
    // water surface: three columns across so the bank foam can be read from a 0 (centre) .. 1 (bank) ramp
    const ww = hw + 0.3, v = [], uv = [], edge = [], idx = [];
    for (const t of [-len / 2, len / 2]) for (const u of [-ww, 0, ww]) { const p = P(t, u, surf); v.push(...p); uv.push((ax ? p[0] : p[2]) / 7, (ax ? p[2] : p[0]) / 7); edge.push(u === 0 ? 0 : 1); }
    idx.push(0, 4, 3, 0, 1, 4, 1, 5, 4, 1, 2, 5);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setAttribute('aEdge', new THREE.Float32BufferAttribute(edge, 1)); g.setIndex(idx); g.computeVertexNormals();
    if (g.attributes.normal.getY(0) < 0) { const ix = g.index.array; for (let k = 0; k < ix.length; k += 3) { const tmp = ix[k + 1]; ix[k + 1] = ix[k + 2]; ix[k + 2] = tmp; } g.computeVertexNormals(); }
    const m = new THREE.Mesh(g, deepWaterMaterial(o.color || 0x2a4a5a, o.flow || 0, { depth: depth + surf, night: !!WORLD.night }));
    m.receiveShadow = true; m.renderOrder = 2; scene.add(m); mapObjects.push(m);
    if (!o.walk) addCollider(cx - (ax ? len / 2 : hw + bank * 0.8), cx + (ax ? len / 2 : hw + bank * 0.8), -2, 1.2, cz - (ax ? hw + bank * 0.8 : len / 2), cz + (ax ? hw + bank * 0.8 : len / 2), { shot: false, surface: 'water', minimap: false });
    return m;
  },

  // ground plane with hills rising outside the play area
  ground(texName, o = {}) {
    // outdoor terrain runs out to ~450 m so its edge is lost in the haze, under the distant mountains
    // flat inside the (expanded) playable area; indoor floors grow with the map
    const b = WORLD.groundBounds || WORLD.bounds;
    const span = Math.max(Math.abs(b.x0), Math.abs(b.x1), Math.abs(b.z0), Math.abs(b.z1)) * 2 + 12;
    const size = Math.max(o.size || 900, span), seg = o.size && o.size < 300 ? Math.max(40, Math.round(160 * size / 900)) : 160;
    let geo;
    if (o.holes && o.holes.length) {
      // flat floor with openings (basement stairwells / pits): a shape with holes, shape y = -world z
      const hs = size / 2, V = (x, y) => new THREE.Vector2(x, y);
      const sh = new THREE.Shape([V(-hs, -hs), V(hs, -hs), V(hs, hs), V(-hs, hs)]);
      for (const q of o.holes) sh.holes.push(new THREE.Path([V(q.x0, -q.z1), V(q.x0, -q.z0), V(q.x1, -q.z0), V(q.x1, -q.z1)]));
      geo = new THREE.ShapeGeometry(sh); geo.rotateX(-Math.PI / 2);
    } else { geo = new THREE.PlaneGeometry(size, size, seg, seg); geo.rotateX(-Math.PI / 2); }
    const p = geo.attributes.position;
    const uv = new Float32Array(p.count * 2), col = new Float32Array(p.count * 3);
    const tile = (TEXDEF[texName] || { tile: 4 }).tile;
    const height = (x, z) => {
      const dx = Math.max(0, Math.max(b.x0 - x, x - b.x1)), dz = Math.max(0, Math.max(b.z0 - z, z - b.z1)), out = Math.hypot(dx, dz);
      if (o.hills === false || out <= 6) return 0;
      const rise = 1 - Math.exp(-(out - 6) / 45);
      return rise * (o.hillMax || 22) * (0.65 + 0.35 * Math.sin(x * 0.045 + 1.3) * Math.cos(z * 0.038)) + Math.sin(x * 0.11 + z * 0.07) * Math.min(out * 0.08, 2.2);
    };
    WORLD.groundH = height; WORLD.groundKind = o.kind || texName;   // kind: what grows on it (ground cover plan)
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i);
      const dx = Math.max(0, Math.max(b.x0 - x, x - b.x1)), dz = Math.max(0, Math.max(b.z0 - z, z - b.z1));
      const out = Math.hypot(dx, dz);
      const h = height(x, z);
      p.setY(i, h);
      uv[i * 2] = x / tile; uv[i * 2 + 1] = z / tile;
      const shade = 1 - Math.min(0.35, out * 0.004);
      col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = shade;
    }
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.computeVertexNormals();
    const mat = MATLIB.ground(texName, Object.assign({ vc: true }, o.color ? { color: o.color } : {}, o.matOpts || {}));
    const m = new THREE.Mesh(geo, mat); m.receiveShadow = true; scene.add(m); mapObjects.push(m);
    m.renderOrder = 50; // after the rest of the opaque world: covered ground pixels fail the depth test early
    WORLD.groundSurface = mat.userData.surface || TEXDEF[texName]?.surface || 'dirt';
    return m;
  },
  // flat textured patch (roads, floors)
  patch(x, z, w, d, texName, o = {}) {
    const geo = new THREE.PlaneGeometry(w, d); geo.rotateX(-Math.PI / 2); if (o.rot) geo.rotateY(o.rot);
    _wM.makeTranslation(x, (o.y || 0) + 0.015, z);
    STATIC.add(geo, MATLIB.ground(texName, o.matOpts || {}), _wM, { noShadow: true }); geo.dispose();
    const r = o.rot ? Math.hypot(w, d) / 2 : 0;
    GROUND_EXCL.push(r ? { x0: x - r, x1: x + r, z0: z - r, z1: z + r } : { x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2 });
  },

  // Distant mountain ring. The panoramas have their photographed sky cut out (tools/cut_pano.py), so the map's
  // own sky shows above the ridgeline; the mountains are re-lit with the map's light and sink into the same
  // haze colour as the fogged terrain (applyEnvironment sets the uniforms), so they belong to the scene.
  backdrop(texKey, o = {}) {
    const tex = ASSETS.sky[texKey]; if (!tex) return;
    const rep = o.repeat || 3, r = o.r || 560, h = o.h || (2 * Math.PI * r / rep) / 4.03;
    const geo = new THREE.CylinderGeometry(r, r, h, 96, 1, true);
    tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.ClampToEdgeWrapping; tex.anisotropy = 4;
    const mat = new THREE.ShaderMaterial({
      uniforms: { map: { value: tex }, rep: { value: rep }, tint: { value: new THREE.Color(o.tint || 0xffffff) }, light: { value: new THREE.Color(1, 1, 1) }, haze: { value: new THREE.Color(0.7, 0.75, 0.8) }, hazeK: { value: 0.3 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `
        uniform sampler2D map; uniform float rep, hazeK; uniform vec3 tint, light, haze; varying vec2 vUv;
        void main(){
          vec4 t = texture2D(map, vec2(vUv.x * rep, vUv.y));
          if (t.a < 0.02) discard;
          vec3 c = pow(t.rgb, vec3(2.2)) * tint * light;
          c = mix(c, haze, clamp(hazeK * (1.2 - vUv.y * 0.7), 0.0, 1.0)); // valleys deeper in the haze than the peaks
          c = mix(haze, c, smoothstep(0.02, 0.3, vUv.y));                 // the base melts into the horizon
          gl_FragColor = vec4(c, t.a);
          #include <tonemapping_fragment>
          #include <encodings_fragment>
        }`,
      transparent: true, side: THREE.BackSide, depthWrite: false, fog: false
    });
    const m = new THREE.Mesh(geo, mat); m.position.y = (o.y !== undefined ? o.y : h * 0.5 - h * (o.sink || 0.12)); m.rotation.y = o.rot || 0; m.renderOrder = -5;
    scene.add(m); mapObjects.push(m);
    WORLD.backdrop = mat;
    mapAnimators.push(() => { m.position.x = activeCamera.position.x; m.position.z = activeCamera.position.z; });
  },

  // simple building shell with door + windows and a flat or tiled roof
  house(x, z, w, d, h, o = {}) {
    const wall = o.wall, rot = o.doorSide || 's';
    const doors = {}; doors[rot] = [(rot === 'n' || rot === 's' ? w : d) * (o.doorAt || 0.5)];
    const winsN = [], winsW = [];
    for (let i = 1; i < Math.floor(w / 3); i++) winsN.push(i * w / Math.floor(w / 3));
    for (let i = 1; i < Math.floor(d / 3); i++) winsW.push(i * d / Math.floor(d / 3));
    const wins = { n: winsN, s: winsN.filter(a => Math.abs(a - w * (o.doorAt || 0.5)) > 1.6), e: winsW, w: winsW };
    if (rot === 'e' || rot === 'w') wins[rot] = winsW.filter(a => Math.abs(a - d * (o.doorAt || 0.5)) > 1.6);
    this.room(x, z, w, d, h, { wall, doors, windows: o.windows === false ? {} : wins, glass: o.lit ? 'lit' : undefined, ceil: o.roof || wall, floor: o.floor, t: 0.3, winY: 1.1, winH: 1.1, roofLip: o.lip });
    if (o.storeys > 1) this.room(x, z, w, d, h, { y: h + 0.3, wall, windows: wins, glass: o.lit ? 'lit' : undefined, ceil: o.roof || wall, t: 0.3, roofLip: o.lip });
    if (o.parapet) { const top = h * (o.storeys || 1) + 0.3 * (o.storeys || 1); this.wall(x - w / 2, z - d / 2, x + w / 2, z - d / 2, 0.8, 0.25, wall, { y: top }); this.wall(x - w / 2, z + d / 2, x + w / 2, z + d / 2, 0.8, 0.25, wall, { y: top }); this.wall(x - w / 2, z - d / 2, x - w / 2, z + d / 2, 0.8, 0.25, wall, { y: top }); this.wall(x + w / 2, z - d / 2, x + w / 2, z + d / 2, 0.8, 0.25, wall, { y: top }); }
    if (o.pitched) {
      const top = h * (o.storeys || 1) + 0.3 * (o.storeys || 1), rm = o.pitched;
      const g = new THREE.CylinderGeometry(0.01, Math.max(w, d) * 0.62, 2.2, 4, 1); g.rotateY(Math.PI / 4); g.scale(w / Math.max(w, d), 1, d / Math.max(w, d));
      _wM.compose(_wP.set(x, top + 1.1, z), _wQ.identity(), _wS.set(1, 1, 1)); STATIC.add(g, rm, _wM); g.dispose();
    }
  }
};
const _dn = new THREE.Vector3(0, -1, 0);
// unit foliage card in the XZ plane running from the origin (trunk end, u = 0) along +x; normals lean up and
// outward so foliage is lit like a soft volume instead of flat paper
const BRANCH_CARD = (() => {
  const g = new THREE.PlaneGeometry(1, 1, 2, 1); g.rotateX(-Math.PI / 2); g.translate(0.5, 0, 0);
  const n = g.attributes.normal; for (let i = 0; i < n.count; i++) n.setXYZ(i, 0.5, 0.86, 0);
  return g;
})();
const _folMats = {};
function foliageMaterial(tex, tint) {
  const key = tex + tint;
  if (_folMats[key]) return _folMats[key];
  const m = new THREE.MeshStandardMaterial({ map: ASSETS.tex[tex], color: tint, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.92, metalness: 0, envMapIntensity: 0.15 });
  m.map.anisotropy = 4;
  m.userData.surface = 'wood'; m.userData.noWorldUV = true; m.userData.tile = 1;
  return (_folMats[key] = m);
}

// flickering / broken / alarm lamps: drives the fixture mesh and the lamp record (a pooled light follows it)
function flickerAnim(mesh, lamp, mode) {
  let tNext = 0, on = true;
  return (t, dt) => {
    if (t > tNext) { on = mode === 'broken' ? Math.random() < 0.35 : Math.random() < 0.88; tNext = t + (on ? rand(0.05, mode === 'broken' ? 0.4 : 2.5) : rand(0.03, 0.15)); }
    if (lamp) lamp.mult = on ? rand(0.9, 1.05) : 0.05;
    if (mesh) mesh.visible = on;
  };
}

// ---------- real lights that follow the player ----------
// Every lamp is a candidate; a fixed pool of point lights (size set by the quality preset) moves to the lamps
// nearest the camera, fading in on arrival. The number of lights never changes during play, so no shader
// recompiles, and every lamp the player walks up to really lights the room, the soldiers and the props.
const LIGHTPOOL = {
  lights: [], t: 0, fwd: new THREE.Vector3(), picks: [],
  resize(n) {
    if (this.lights.length === n) return;
    for (const L of this.lights) scene.remove(L);
    this.lights = [];
    for (let i = 0; i < n; i++) { const L = new THREE.PointLight(0xffffff, 0, 10, 2); L.userData = { lamp: null, k: 0 }; scene.add(L); this.lights.push(L); }
    this.t = 0;
  },
  clear() { for (const L of this.lights) { L.userData.lamp = null; L.userData.k = 0; L.intensity = 0; } this.t = 0; },
  update(dt) {
    const lamps = WORLD.lamps, n = this.lights.length;
    if (!n) return;
    this.t -= dt;
    if (this.t <= 0) {
      this.t = 0.2;
      const c = activeCamera.position, f = this.fwd.set(0, 0, -1).applyQuaternion(activeCamera.quaternion);
      this.picks.length = 0;
      for (const l of lamps) {
        const dx = l.x - c.x, dy = l.y - c.y, dz = l.z - c.z, d = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (d > l.dist * 1.7) continue;
        const behind = d > 5 && (dx * f.x + dy * f.y + dz * f.z) < -0.35 * d;
        l.score = d * (behind ? 1.7 : 1) / Math.sqrt(l.i);
        this.picks.push(l);
      }
      this.picks.sort((a, b) => a.score - b.score);
      const want = new Set(this.picks.slice(0, n));
      for (const L of this.lights) { const l = L.userData.lamp; if (l && want.has(l)) want.delete(l); else L.userData.lamp = null; }
      for (const L of this.lights) {
        if (L.userData.lamp || !want.size) continue;
        const l = want.values().next().value; want.delete(l);
        L.userData.lamp = l; L.userData.k = 0;
        L.position.set(l.x, l.y - 0.25, l.z); L.color.setHex(l.color); L.distance = l.dist;
      }
    }
    for (const L of this.lights) {
      const u = L.userData, l = u.lamp;
      u.k = Math.min(1, u.k + dt * 4);
      L.intensity = l ? l.i * l.mult * u.k : 0;
    }
  }
};

// ---------- ground cover: grass tufts, dry shrubs, pebbles and half-buried rocks (instanced, outdoor maps) ----------
const GROUND_EXCL = []; // roads / floors / paths where nothing grows
const COVER = { time: { value: 0 } };
// baked blade sprites (tools/bake_textures.py): ~110 thin curved blades, dark roots to light tips
function tuftTexture(key, dry) {
  const t = ASSETS.tex[dry ? 'tuft_dry' : 'tuft_green'];
  t.anisotropy = 4;
  return t;
}
function tuftGeometry(w, h) {
  const geos = [];
  for (let i = 0; i < 3; i++) { const g = new THREE.PlaneGeometry(w, h); g.translate(0, h / 2, 0); g.rotateY(i * Math.PI / 3); geos.push(g); }
  const g = THREE.BufferGeometryUtils.mergeBufferGeometries(geos); geos.forEach(q => q.dispose());
  const n = g.attributes.normal; for (let i = 0; i < n.count; i++) n.setXYZ(i, 0, 1, 0); // lit like the ground they stand on
  return g;
}
function swayMaterial(map) {
  const m = new THREE.MeshStandardMaterial({ map, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 1, metalness: 0, envMapIntensity: 0.25 });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.cT = COVER.time;
    sh.vertexShader = 'uniform float cT;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      vec4 cI = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
      float cS = sin(cT * 1.6 + cI.x * 0.31 + cI.z * 0.23) * 0.07 + sin(cT * 3.7 + cI.x * 1.3) * 0.025;
      transformed.xz += vec2(cS, cS * 0.6) * position.y * 1.8;`);
  };
  m.customProgramCacheKey = () => 'sway';
  return m;
}
function coverSpotFree(x, z, r) {
  for (const c of colliders) if (x > c.x0 - r && x < c.x1 + r && z > c.z0 - r && z < c.z1 + r && c.y1 > 0.05) return false;
  for (const q of GROUND_EXCL) if (x > q.x0 - r && x < q.x1 + r && z > q.z0 - r && z < q.z1 + r) return false;
  if (typeof RESERVED !== 'undefined') for (const q of RESERVED) if (x > q.x0 - r && x < q.x1 + r && z > q.z0 - r && z < q.z1 + r) return false;
  return true;
}
function groundCover() {
  const kind = WORLD.groundKind, H = WORLD.groundH || (() => 0);
  const plan = {
    grass: { tufts: 9000, dry: 0, pebbles: 500 },
    dirt: { tufts: 3000, dry: 400, pebbles: 900 },
    gravel: { tufts: 1500, dry: 300, pebbles: 1400 },
    sand: { tufts: 0, dry: 600, pebbles: 900 },
    snow: { tufts: 0, dry: 260, pebbles: 0, rocks: 420 }
  }[kind];
  if (!plan) return;
  const b = WORLD.bounds, pad = 22, rnd = W.rnd;
  // denser on the expanded maps (instanced, so the count costs little)
  const q = Q().cover * Math.min(2.6, Math.max(1, (b.x1 - b.x0) * (b.z1 - b.z0) / 12100 * 0.5));
  const spots = (n, r) => {
    const out = [];
    for (let i = 0; i < n * 3 && out.length < n; i++) {
      const x = b.x0 - pad + rnd() * (b.x1 - b.x0 + pad * 2), z = b.z0 - pad + rnd() * (b.z1 - b.z0 + pad * 2);
      if (coverSpotFree(x, z, r)) out.push([x, H(x, z), z]);
    }
    return out;
  };
  const M4 = new THREE.Matrix4(), Q4 = new THREE.Quaternion(), P4 = new THREE.Vector3(), S4 = new THREE.Vector3(), C4 = new THREE.Color();
  const instanced = (geo, mat, pts, scale, colorFn, shadow) => {
    if (!pts.length) return;
    const im = new THREE.InstancedMesh(geo, mat, pts.length);
    pts.forEach((p, i) => {
      const s = scale();
      Q4.setFromAxisAngle(WUP, rnd() * 6.28); P4.set(p[0], p[1] + (s.y0 || 0), p[2]); S4.set(s.x, s.y, s.z);
      M4.compose(P4, Q4, S4); im.setMatrixAt(i, M4);
      if (colorFn) im.setColorAt(i, colorFn(C4));
    });
    im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
    im.castShadow = !!shadow; im.receiveShadow = true; im.frustumCulled = false;
    scene.add(im); mapObjects.push(im);
  };
  // grass colour matched to the terrain texture
  const base = new THREE.Color(kind === 'grass' ? 0x9ab070 : 0xa8a070);
  if (plan.tufts) instanced(tuftGeometry(0.7, 0.55), swayMaterial(tuftTexture('tuftGreen', false)), spots(Math.round(plan.tufts * q), 0.3),
    () => { const s = 0.7 + rnd() * 0.8; return { x: s, y: s * (0.8 + rnd() * 0.5), z: s }; },
    (c) => c.copy(base).multiplyScalar(0.85 + rnd() * 0.4).lerp(new THREE.Color(0xc8b880), rnd() * 0.3));
  if (plan.dry) instanced(tuftGeometry(0.8, 0.6), swayMaterial(tuftTexture('tuftDry', true)), spots(Math.round(plan.dry * q), 0.4),
    () => { const s = 0.6 + rnd() * 0.9; return { x: s, y: s * (0.7 + rnd() * 0.6), z: s }; },
    (c) => c.setRGB(1, 1, 1).multiplyScalar(0.7 + rnd() * 0.4));
  const rockM = MATLIB.get('rock', { color: kind === 'sand' ? 0xc8a078 : kind === 'snow' ? 0x8a8e94 : 0x9a9488 });
  if (plan.pebbles) instanced(new THREE.IcosahedronGeometry(1, 0), rockM, spots(Math.round(plan.pebbles * q), 0.2),
    () => { const s = 0.04 + Math.pow(rnd(), 2) * 0.16; return { x: s * (0.8 + rnd() * 0.6), y: s * 0.55, z: s, y0: -s * 0.15 }; }, null, false);
  if (plan.rocks) instanced(new THREE.IcosahedronGeometry(1, 1), MATLIB.get('rock', { color: 0x7a7e86 }), spots(Math.round(plan.rocks * q), 0.6),
    () => { const s = 0.15 + Math.pow(rnd(), 2) * 0.55; return { x: s * (0.8 + rnd() * 0.7), y: s * 0.5, z: s, y0: -s * 0.2 }; }, null, true);
  mapAnimators.push((t) => { COVER.time.value = t; });
}

const _waterMats = [];
// Low-roughness water with two ripple layers scrolling in different directions: the sun (day/evening)
// and the moon (night) draw a glittering reflection path, the sky is reflected through the env map.
function waterMaterial(color, flow, w = 20, d = 20) {
  const m = new THREE.MeshStandardMaterial({ color: new THREE.Color(color).multiplyScalar(0.55), roughness: 0.06, metalness: 0.0, transparent: true, opacity: 0.93, envMapIntensity: 1.15 });
  const t = waterNormalTex().clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(Math.max(1, w / 7), Math.max(1, d / 7));
  m.normalMap = t; m.normalScale = new THREE.Vector2(0.55, 0.55);
  m.userData.flow = flow || 0;
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uT = { value: 0 }; sh.uniforms.uFlow = { value: m.userData.flow };
    m.userData.shader = sh;
    expandNormalChunk(sh); // the ripple code below edits the resolved normal-map chunk
    sh.fragmentShader = 'uniform float uT;\nuniform float uFlow;\n' + sh.fragmentShader.replace(
      'vec3 mapN = texture2D( normalMap, vUv ).xyz * 2.0 - 1.0;',
      'vec3 mapN = normalize( (texture2D( normalMap, vUv + vec2( uT * 0.011 + uFlow * uT * 0.06, uT * 0.008 ) ).xyz * 2.0 - 1.0) + (texture2D( normalMap, vUv * 1.73 + vec2( -uT * 0.009, uT * 0.013 + uFlow * uT * 0.035 ) ).xyz * 2.0 - 1.0) );');
  };
  _waterMats.push(m);
  return m;
}
function updateWater(t) { for (const m of _waterMats) if (m.userData.shader) m.userData.shader.uniforms.uT.value = t; }
// Deep water for channels and lakes: ripples as above, plus colour and opacity from the light path through the
// water down to the bed (clear at the shallow banks and straight down, dark and opaque at depth / grazing angles),
// Fresnel reflections of the captured environment, and foam where the water meets the banks.
function deepWaterMaterial(color, flow, o = {}) {
  const base = new THREE.Color(color);
  const m = new THREE.MeshStandardMaterial({ color: base, roughness: 0.05, metalness: 0.0, transparent: true, opacity: 1, envMapIntensity: o.night ? 0.8 : 1.25, depthWrite: false });
  const t = waterNormalTex().clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  m.normalMap = t; m.normalScale = new THREE.Vector2(0.6, 0.6);
  m.userData.flow = flow || 0;
  const deep = base.clone().multiplyScalar(0.26), shallow = base.clone().lerp(new THREE.Color(0x5e6a50), 0.3).multiplyScalar(0.72);
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uT = { value: 0 }; sh.uniforms.uFlow = { value: m.userData.flow };
    sh.uniforms.uDepth = { value: Math.max(0.3, o.depth || 1) }; sh.uniforms.uDeep = { value: deep }; sh.uniforms.uShallow = { value: shallow };
    m.userData.shader = sh;
    sh.vertexShader = 'attribute float aEdge;\nvarying float vEdge;\nvarying vec3 vWPos;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n\tvEdge = aEdge; vWPos = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;');
    expandNormalChunk(sh);
    sh.fragmentShader = 'uniform float uT, uFlow, uDepth;\nuniform vec3 uDeep, uShallow;\nvarying float vEdge;\nvarying vec3 vWPos;\n' + sh.fragmentShader
      .replace('vec3 mapN = texture2D( normalMap, vUv ).xyz * 2.0 - 1.0;',
        'vec3 mapN = normalize( (texture2D( normalMap, vUv + vec2( uT * 0.011 + uFlow * uT * 0.06, uT * 0.008 ) ).xyz * 2.0 - 1.0) + (texture2D( normalMap, vUv * 1.73 + vec2( -uT * 0.009, uT * 0.013 + uFlow * uT * 0.035 ) ).xyz * 2.0 - 1.0) );')
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec3 wV = normalize( cameraPosition - vWPos );
        float wFoam = smoothstep( 0.86, 1.0, vEdge ) * ( 0.55 + 0.45 * sin( vWPos.x * 2.7 + vWPos.z * 2.1 + uT * ( 1.3 + uFlow ) ) );
        float wD = uDepth * ( 1.0 - smoothstep( 0.55, 1.0, vEdge ) * 0.88 );              // shallower toward the banks
        float wPath = wD / max( abs( wV.y ), 0.07 );                                         // light path down to the bed
        float wAbs = 1.0 - exp( -wPath * 1.7 );
        float wFres = pow( 1.0 - clamp( abs( wV.y ), 0.0, 1.0 ), 5.0 );
        diffuseColor.rgb = mix( mix( uShallow, uDeep, wAbs ), vec3( 0.78, 0.8, 0.8 ), wFoam * 0.8 );
        diffuseColor.a = clamp( mix( 0.5, 0.97, wAbs ) + wFres * 0.45 + wFoam * 0.6, 0.0, 1.0 );`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n\troughnessFactor = mix( roughnessFactor, 0.55, wFoam );');
  };
  m.customProgramCacheKey = () => 'deepWater';
  _waterMats.push(m);
  return m;
}

// additive floor light pools from lamps: one batched mesh per map
// down = true: a glow on the underside of a ceiling (faces down)
const POOL_BATCH = {
  items: [],
  add(x, y, z, size, col, down) { this.items.push([x, y, z, size, col, !!down]); },
  build() {
    if (!this.items.length) return;
    const n = this.items.length, pos = new Float32Array(n * 12), uv = new Float32Array(n * 8), cols = new Float32Array(n * 12), idx = [];
    this.items.forEach(([x, y, z, sz, c, down], q) => {
      [[-1, -1, 0, 0], [1, -1, 1, 0], [1, 1, 1, 1], [-1, 1, 0, 1]].forEach(([a, b, u, v], k) => { pos.set([x + a * sz / 2, down ? y - 0.012 : y + 0.02, z + b * sz / 2], (q * 4 + k) * 3); uv.set([u, v], (q * 4 + k) * 2); cols.set([c.r, c.g, c.b], (q * 4 + k) * 3); });
      const o = q * 4;
      if (down) idx.push(o, o + 1, o + 2, o, o + 2, o + 3); else idx.push(o, o + 2, o + 1, o, o + 3, o + 2);
    });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setAttribute('color', new THREE.BufferAttribute(cols, 3)); g.setIndex(idx);
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: radialTex('pool', 'rgba(255,255,255,1)', 'rgba(255,255,255,0)'), vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
    m.renderOrder = 2; m.matrixAutoUpdate = false; scene.add(m); mapObjects.push(m);
    this.items.length = 0;
  }
};

// source: 'player' (credited kills), the AI agent whose stray fire hit it, or null
function damageExplosive(ex, dmg, source = 'player') {
  if (!ex.alive) return;
  ex.hp -= dmg;
  if (ex.hp > 0) { if (dmg > 0) spawnSparks(new THREE.Vector3(ex.x, 0.6, ex.z)); return; }
  ex.alive = false;
  const i = colliders.indexOf(ex.collider); if (i >= 0) colliders.splice(i, 1);
  // hide this drum in its instanced batch (shrink the instance nearest to it)
  const mm = new THREE.Matrix4(), p = new THREE.Vector3();
  for (const o of mapObjects) {
    if (!o.isInstancedMesh || o.userData.prop !== ex.prop) continue;
    for (let k = 0; k < o.count; k++) { o.getMatrixAt(k, mm); p.setFromMatrixPosition(mm); if (Math.hypot(p.x - ex.x, p.z - ex.z) < 0.45) { mm.makeScale(0, 0, 0); o.setMatrixAt(k, mm); o.instanceMatrix.needsUpdate = true; } }
  }
  setTimeout(() => explode(new THREE.Vector3(ex.x, 0.5, ex.z), ex.power || 1, source), 90);
}

// ---------- environment ----------
function applyEnvironment(env) {
  WORLD.env = env;
  const sky = env.sky || {};
  sunDir.copy(new THREE.Vector3(...(env.sunDir || [0.5, 0.6, -0.4])).normalize());
  applySky(env);
  skyDome.visible = !env.indoor || !!env.skyVisible;
  scene.background = new THREE.Color(env.fog.color);
  scene.fog = new THREE.FogExp2(env.fog.color, env.fog.density);
  hemi.color.set(env.hemi[0]); hemi.groundColor.set(env.hemi[1]); hemi.intensity = env.hemi[2];
  moon.color.set(env.sun.color); moon.intensity = env.sun.i; moon.visible = env.sun.i > 0;
  moon.castShadow = env.sun.i > 0 && S.quality !== 'low';
  WORLD.env.hemiI = env.hemi[2]; WORLD.env.sunI = env.sun.i;
  // indoors, light bouncing off floors and walls reaches the ceilings and the shadowed side of everything
  if (env.indoor) {
    hemi.groundColor.copy(new THREE.Color(env.envLight || 0xffffff).multiplyScalar(0.34).lerp(new THREE.Color(env.hemi[1]), 0.3));
    hemi.intensity = env.hemi[2] * 1.5 + 0.27;   // interiors used to sink into pure black away from the lamps
    WORLD.env.hemiI = hemi.intensity;
  } else if (env.night) {
    hemi.intensity = env.hemi[2] * 1.3 + 0.08;   // night maps: shadowed walls keep a little moonlit detail
    WORLD.env.hemiI = hemi.intensity;
  }
  if (WORLD.backdrop) {
    const BU = WORLD.backdrop.uniforms;
    BU.light.value.set(env.hemi[0]).multiplyScalar(env.hemi[2] * 0.9).add(new THREE.Color(env.sun.color).multiplyScalar(env.sun.i * 0.35));
    BU.haze.value.set(env.fog.color);
    BU.hazeK.value = clamp(1 - Math.exp(-Math.pow(env.fog.density * 120, 2)), 0.12, 0.65);
  }
  // viewmodel lighting follows the map
  vmHemi.color.set(env.hemi[0]); vmHemi.groundColor.set(env.hemi[1]); vmHemi.intensity = env.vmHemi ?? Math.max(0.55, env.hemi[2] * 1.1);
  vmSun.color.set(env.indoor ? (env.vmKey || 0xfff0d8) : env.sun.color); vmSun.intensity = env.vmSun ?? (env.indoor ? 0.9 : Math.max(0.6, env.sun.i * 0.9));
  vmFill.intensity = env.vmFill ?? 0.35;
  const gr = env.grade || {};
  const Ug = POST.grade.uniforms;
  Ug.exposure.value = env.exposure ?? 1.0; Ug.saturation.value = gr.sat ?? 1.05; Ug.contrast.value = gr.contrast ?? 1.05;
  Ug.tint.value.set(gr.tint ?? 0xffffff); Ug.lift.value.set(gr.lift ?? 0x000000); Ug.vignette.value = (gr.vignette ?? 0.35) * 0.6;
  // sun / moon glare strength: evening suns flare most, the moon softly, sealed interiors not at all
  WORLD.glare = env.indoor ? (env.skyVisible ? 0.55 : 0) : (sky.moon ? 0.4 : (env.glare ?? 1));
  Ug.sunCol.value.set(sky.moon ? 0xbcd0ff : (sky.sunColor ?? env.sun.color)); Ug.sunNight.value = sky.moon ? 1 : 0;
  POST.bloom.strength = env.bloom ?? 0.4; POST.bloom.threshold = env.bloomT ?? (env.indoor ? 0.9 : 1.2);
  renderer.toneMappingExposure = env.exposure ?? 1.0;
  buildEnvironment(!!env.indoor, { ambient: env.envAmbient || env.fog.color, light: env.envLight || 0xffffff });
  AudioSys.setIndoor(!!env.indoor);
}

// ---------- map loading ----------
let currentMapIndex = -1;
function clearMap() {
  resetChannelCuts();
  for (const e of enemies) removeEnemy(e); enemies.length = 0;
  for (const p of pickups) scene.remove(p.m); pickups.length = 0;
  for (const w of weaponDrops) scene.remove(w.mesh); weaponDrops.length = 0;
  for (const p of particles) removeFx(p.obj); particles.length = 0; SPR.clear(); BOOM.clear();
  for (const g of grenades) scene.remove(g.m); grenades.length = 0;
  DECALS.clear();
  for (const o of mapObjects) { scene.remove(o); if (o.isMesh && o.geometry && !o.isInstancedMesh) o.geometry.dispose(); }
  mapObjects.length = 0; mapAnimators.length = 0; _waterMats.length = 0;
  colliders.length = 0; mapRects.length = 0; swayers.length = 0; coverPoints.length = 0;
  WORLD.explosives = []; WORLD.lamps = []; WORLD.backdrop = null; WORLD.groundH = null; WORLD.groundKind = ''; GROUND_EXCL.length = 0; PITS.length = 0;
  LIGHTPOOL.clear();
  STATIC.reset(); INSTANCER.reset(); AO_BATCH.reset(); POOL_BATCH.items.length = 0;
  if (typeof FREEGRID !== 'undefined') FREEGRID.reset();
}

function buildMap(i) {
  if (!ASSETS.done) return;
  S.map = i; currentMapIndex = i;
  const M = MAPS[i];
  if (typeof autoQuality === 'function') autoQuality(M.group === 'indoor');   // default preset of this kind of location
  clearMap();
  const seed = M.random ? (Math.random() * 1e6 | 0) : M.seed;
  W.rnd = mulberry32(seed);
  WORLD.indoor = M.group === 'indoor'; WORLD.name = M.name; WORLD.locName = ''; WORLD.locKind = '';
  // the original layout builds inside its own bounds (the core); terrain, rivers and the decorative tree line are
  // laid out for the expanded map, and expandMap() fills the new ring afterwards (5x the playable area)
  const core = Object.assign({}, M.bounds), outer = M.noExpand ? core : expandedBounds(M);
  WORLD.bounds = Object.assign({}, core); WORLD.coreBounds = core; WORLD.outerBounds = outer; WORLD.groundBounds = outer;
  WORLD.coreOpen = !M.noExpand && M.group === 'indoor' ? core : null;
  if (typeof RESERVED !== 'undefined') RESERVED.length = 0;
  WORLD.enemyTheme = M.theme || 'urban'; WORLD.camo = M.camo || M.theme || 'urban';
  WORLD.menuCam = M.menuCam || null;
  const env = typeof M.env === 'function' ? M.env(W.rnd) : M.env;
  const tm = [], t0 = performance.now(); let tl = t0;
  const lap = (n) => { const t = performance.now(); tm.push(n + ' ' + Math.round(t - tl)); tl = t; };
  NAV.bake(WORLD.bounds); // bounds for resolveCollision during build
  const info = M.build(W, W.rnd) || {};
  WORLD.coreOpen = null;
  if (!M.noExpand) { WORLD.bounds = Object.assign({}, outer); NAV.bake(WORLD.bounds); expandMap(W, M, core, info); }
  if (typeof extraProps === 'function') extraProps(W, M, info);
  if (!WORLD.indoor) groundCover();
  lap('layout');
  STATIC.build(); INSTANCER.build(); AO_BATCH.build(); POOL_BATCH.build();
  lap('batch');
  for (const o of mapObjects) if (o.isInstancedMesh && !o.userData.prop) { /* tag tnt instances */ }
  tagInstancedProps();
  WORLD.spawn = info.spawn || M.spawn || { x: 0, z: 0, yaw: 0 };
  WORLD.enemySpawns = info.enemySpawns || M.enemySpawns || [];
  applyEnvironment(env);
  captureEnvironment(new THREE.Vector3(WORLD.spawn.x, WORLD.indoor ? 1.7 : 2.2, WORLD.spawn.z));
  lap('env');
  NAV.bake(WORLD.bounds);
  // only spawn points the player's spawn can reach count (a closed hangar door, walls or props must never strand
  // a hostile base outside the fight); too few left -> fresh ones from the reachable floor
  if (NAV.flood(WORLD.spawn.x, WORLD.spawn.z) > 0) {
    const sp = WORLD.spawn, all = WORLD.enemySpawns;
    const ok = all.filter(p => NAV.reachable(p[0], p[1]) || (() => { const s = NAV.snap(p[0], p[1]); return Math.hypot(s.x - p[0], s.z - p[1]) < 4; })());
    if (ok.length < 6) ok.push(...NAV.sampleReach(sp.x, sp.z, WORLD.indoor ? 22 : 40, 8 - ok.length, W.rnd));
    if (ok.length !== all.length) console.info('[map] spawn points ' + all.length + ' -> ' + ok.length + ' reachable');
    WORLD.enemySpawns = ok.map(p => { const s = NAV.snap(p[0], p[1]); return [s.x, s.z]; });
  }
  bakeCover();
  lap('nav');
  setWeather(env.weather || 'none');
  setupViewmodel(WORLD.camo);
  mapAnimators.push((t) => updateWater(t));
  prewarmShaders();
  lap('shaders');
  console.info('[map] ' + M.key + ' ' + Math.round(performance.now() - t0) + 'ms · ' + tm.join('ms · ') + 'ms · programs ' + renderer.info.programs.length);
}

// Compile every shader variant the fight will need *now* (enemies, guns, pickups, effects, shadows),
// against the real render target, so nothing compiles mid-combat.
function prewarmShaders() {
  const tmp = [];
  try {
    camera.updateMatrixWorld(true);
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion); fwd.y = 0;
    if (fwd.lengthSq() < 1e-4) fwd.set(0, 0, -1); fwd.normalize();
    const p = camera.position.clone().addScaledVector(fwd, 6); p.y = 0;
    const e = spawnEnemy('soldier', p), ally = spawnEnemy('soldier', p.clone().add(new THREE.Vector3(1.5, 0, 0)), { team: 'blue' });
    e.g.updateMatrixWorld(true); ally.g.updateMatrixWorld(true);
    SPR.ensure(); DECALS.pool('hole'); DECALS.pool('blood');
    spawnTracer(p.clone().setY(1.5), p.clone().add(new THREE.Vector3(0, 1.5, 3)), 0xffd9a0);
    spawnPickup(p.clone().add(new THREE.Vector3(1, 0, 0)), 'ammo'); spawnPickup(p.clone().add(new THREE.Vector3(-1, 0, 0)), 'health');
    spawnDroppedWeapon('AK47', p.clone().add(new THREE.Vector3(0, 0, 1)), 30, 60);
    for (const n of ['M4A1', 'AWM', 'M24', 'BarrettM82', 'M1911', 'PumpShotgun', 'MP5', 'DesertEagle', 'Woodpecker', 'Minigun', 'ScarL']) {
      const g = buildGun(n, true); g.position.copy(p).add(new THREE.Vector3(0, 1, 0)); scene.add(g); tmp.push(g);
    }
    for (const k of ['dust', 'smoke', 'blood']) addParticle(fxSprite(k, 0xffffff, 0.5, p.clone().setY(1)), 0.01, 'smoke');
    for (const k of ['glint', 'muzzle', 'explosion']) addParticle(fxSprite(k, 0xffffff, 0.5, p.clone().setY(1), { additive: true }), 0.01, 'flash');
    SPR.update(camera);
    renderer.setRenderTarget(POST.enabled ? POST.composer.readBuffer : null);
    renderer.compile(scene, camera);
    renderer.setRenderTarget(null);
    renderer.shadowMap.needsUpdate = true;
    renderFrame(0.016); // also builds shadow-depth and post-pass programs
    for (const x of [e, ally]) { removeEnemy(x); enemies.splice(enemies.indexOf(x), 1); }
  } catch (err) { console.warn('prewarm failed', err); }
  for (const g of tmp) scene.remove(g);
  for (const pk of pickups) scene.remove(pk.m); pickups.length = 0;
  for (const w of weaponDrops) scene.remove(w.mesh); weaponDrops.length = 0;
  for (const pt of particles) { if (pt.pooled) pt.obj.visible = false; else removeFx(pt.obj); } particles.length = 0;
  SPR.clear(); BOOM.clear();
}
// all viewmodel weapons, compiled once when a match starts (first weapon switch never hitches)
function prewarmWeapons() {
  try {
    const extra = [];
    for (const w of INVENTORY.slots) if (w && w.model.parent !== VM.pose) { VM.pose.add(w.model); extra.push(w.model); }
    renderer.setRenderTarget(POST.enabled ? POST.composer.readBuffer : null);
    renderer.compile(vmScene, vmCamera);
    renderer.setRenderTarget(null);
    for (const m of extra) VM.pose.remove(m);
  } catch (err) { console.warn('weapon prewarm failed', err); }
}
function tagInstancedProps() {
  // InstancedMesh objects are created per prop name in INSTANCER.build: tag them so destroyed props can be hidden
  const byGeo = new Map();
  for (const name of PROP_NAMES) { const m = ASSETS.models[name]; if (m) m.scene.traverse(o => { if (o.isMesh) byGeo.set(o.geometry, name); }); }
  for (const o of mapObjects) if (o.isInstancedMesh && !o.userData.prop && byGeo.has(o.geometry)) o.userData.prop = byGeo.get(o.geometry);
}
