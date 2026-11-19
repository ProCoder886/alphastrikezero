// ---------- particles / effects ----------
const FX_LIMIT = 450;
const shellGeo = new THREE.CylinderGeometry(0.006, 0.006, 0.03, 6); shellGeo.rotateZ(Math.PI / 2);
const shellMat = new THREE.MeshStandardMaterial({ color: 0xd8b04a, metalness: 0.9, roughness: 0.25 });
const decalGeo = new THREE.PlaneGeometry(1, 1);
const tracerGeo = new THREE.PlaneGeometry(1, 1); tracerGeo.translate(0, 0.5, 0);
const _pV = new THREE.Vector3(), _pV2 = new THREE.Vector3(), _pQ = new THREE.Quaternion(), _pUp = new THREE.Vector3(0, 1, 0);

// ---------- batched sprites: every effect sprite of one texture is drawn in a single draw call ----------
const SPR = {
  batches: new Map(), CAP: 640,
  batch(texKey, additive, fog) {
    const key = texKey + (additive ? '+' : '') + (fog ? 'f' : '');
    let b = this.batches.get(key);
    if (b) return b;
    const cap = this.CAP, g = new THREE.BufferGeometry();
    const pos = new Float32Array(cap * 3), col = new Float32Array(cap * 4), size = new Float32Array(cap), rot = new Float32Array(cap);
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aColor', new THREE.BufferAttribute(col, 4).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aRot', new THREE.BufferAttribute(rot, 1).setUsage(THREE.DynamicDrawUsage));
    g.setDrawRange(0, 0);
    const mat = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { map: { value: ASSETS.fx[texKey] || null }, uScale: { value: 800 } }]),
      vertexShader: `attribute vec4 aColor; attribute float aSize; attribute float aRot; uniform float uScale; varying vec4 vColor; varying float vRot;
        #include <fog_pars_vertex>
        void main(){ vColor = aColor; vRot = aRot; vec4 mvPosition = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mvPosition;
          gl_PointSize = aSize * uScale / max(0.05, -mvPosition.z);
          #include <fog_vertex>
        }`,
      fragmentShader: `uniform sampler2D map; varying vec4 vColor; varying float vRot;
        #include <fog_pars_fragment>
        void main(){ vec2 c = gl_PointCoord - 0.5; float sn = sin(vRot), cs = cos(vRot);
          vec2 uv = vec2(cs * c.x - sn * c.y, sn * c.x + cs * c.y) + 0.5;
          if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) discard;
          vec4 t = texture2D(map, vec2(uv.x, 1.0 - uv.y));
          gl_FragColor = vec4(pow(t.rgb, vec3(2.2)) * vColor.rgb, t.a * vColor.a);
          if (gl_FragColor.a < 0.003) discard;
          #include <fog_fragment>
        }`,
      transparent: true, depthWrite: false, fog: !!fog, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending
    });
    const pts = new THREE.Points(g, mat); pts.frustumCulled = false; pts.renderOrder = 3;
    scene.add(pts);
    b = { key, pts, g, mat, items: new Set() };
    this.batches.set(key, b);
    return b;
  },
  ensure() { for (const k of ['dust', 'smoke', 'blood', 'glint', 'muzzle', 'explosion']) { this.batch(k, false, true); this.batch(k, true, true); this.batch(k, true, false); } },
  clear() { for (const b of this.batches.values()) { b.items.clear(); b.g.setDrawRange(0, 0); } },
  update(cam) {
    const h = renderBufferSize(_sprV2).y, sc = h / (2 * Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2));
    for (const b of this.batches.values()) {
      if (!b.pts.parent) scene.add(b.pts);
      b.mat.uniforms.uScale.value = sc;
      const P = b.g.attributes.position.array, C = b.g.attributes.aColor.array, Z = b.g.attributes.aSize.array, R = b.g.attributes.aRot.array;
      let n = 0;
      for (const o of b.items) {
        if (!o.visible || n >= this.CAP) continue;
        P[n * 3] = o.position.x; P[n * 3 + 1] = o.position.y; P[n * 3 + 2] = o.position.z;
        C[n * 4] = o.color.r; C[n * 4 + 1] = o.color.g; C[n * 4 + 2] = o.color.b; C[n * 4 + 3] = o.material.opacity;
        Z[n] = Math.max(o.scale.x, o.scale.y); R[n] = o.material.rotation; n++;
      }
      b.g.setDrawRange(0, n);
      if (n) { b.g.attributes.position.needsUpdate = true; b.g.attributes.aColor.needsUpdate = true; b.g.attributes.aSize.needsUpdate = true; b.g.attributes.aRot.needsUpdate = true; }
    }
  }
};
const _sprV2 = new THREE.Vector2();
const _noopDispose = () => { };
// A lightweight sprite record drawn by its batch (keeps the old THREE.Sprite-like fields)
function fxSprite(texKey, color, size, pos, opts = {}) {
  if (particles.length > FX_LIMIT * Q().fx) return null;
  const b = SPR.batch(texKey, !!opts.additive, opts.fog !== false);
  const o = { isVSprite: true, batch: b, visible: true, position: pos.clone(), scale: { x: size, y: size, set(x, y) { this.x = x; this.y = y; } }, color: new THREE.Color(color),
    material: { opacity: opts.opacity ?? 1, rotation: opts.rot ?? Math.random() * 6.28, dispose: _noopDispose } };
  b.items.add(o);
  return o;
}
function removeFx(o) { if (!o) return; if (o.isVSprite) o.batch.items.delete(o); else { scene.remove(o); if (o.material && o.material.dispose) o.material.dispose(); } }
function addParticle(obj, life, kind, extra = {}) {
  if (!obj) return;
  particles.push(Object.assign({ obj, life, max: life, kind, real: false }, extra));
}

// Pooled tracers: materials live for the whole session so their shader program is never freed and
// recompiled mid-fight (disposing the last material of a program forces a recompile on the next shot).
const TRACERS = { pool: [], i: 0, SIZE: 48 };
function tracerMesh() {
  if (TRACERS.pool.length < TRACERS.SIZE) {
    const m = new THREE.Mesh(tracerGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
    m.frustumCulled = false; m.visible = false;
    m.userData.axis = new THREE.Vector3(); m.userData.side = new THREE.Vector3(); m.userData.nrm = new THREE.Vector3(); m.userData.basis = new THREE.Matrix4();
    m.onBeforeRender = (r, s, cam) => {
      const u = m.userData; u.side.copy(cam.position).sub(m.position).cross(u.axis);
      if (u.side.lengthSq() < 1e-8) return;
      u.side.normalize(); u.nrm.crossVectors(u.side, u.axis);
      u.basis.makeBasis(u.side, u.axis, u.nrm); m.quaternion.setFromRotationMatrix(u.basis); m.updateMatrixWorld();
    };
    m.userData.shared = true;
    TRACERS.pool.push(m);
    return m;
  }
  TRACERS.i = (TRACERS.i + 1) % TRACERS.SIZE;
  return TRACERS.pool[TRACERS.i];
}
function spawnTracer(a, b, color, width = 0.025) {
  const len = a.distanceTo(b);
  if (len < 0.5) return;
  const m = tracerMesh();
  m.material.color.set(color).multiplyScalar(3); m.material.opacity = 0.85;
  m.position.copy(a);
  m.userData.axis.subVectors(b, a).normalize();
  m.quaternion.setFromUnitVectors(_pUp, m.userData.axis);
  m.scale.set(width, len, 1);
  m.visible = true;
  if (!m.parent) scene.add(m);
  for (let k = particles.length - 1; k >= 0; k--) if (particles[k].obj === m) { particles.splice(k, 1); break; }
  addParticle(m, 0.06, 'fade', { op: 0.85, pooled: true, shared: true });
}

function spawnMuzzleFlash(pos, dir, big = 1) {
  const s = fxSprite('muzzle', 0xffe0b0, (0.55 + Math.random() * 0.3) * big, pos, { additive: true });
  addParticle(s, 0.05, 'flash');
  if (pos.distanceToSquared(activeCamera.position) < 1600) lightPulse(pos, 0xffa050, 2.2 * big, 10, 0.06);
  const sm = fxSprite('smoke', 0x9a9a9a, 0.35, pos, { opacity: 0.35 });
  if (sm) addParticle(sm, 0.9, 'smoke', { vel: dir ? dir.clone().multiplyScalar(0.6).add(new THREE.Vector3(0, 0.3, 0)) : new THREE.Vector3(0, 0.4, 0), grow: 1.6, op: 0.35 });
}

// surface-aware impact
function spawnImpact(pos, normal, surface) {
  const n = normal || _pUp;
  const colors = { concrete: 0xb8b2a8, rock: 0xa09a90, sand: 0xd8b880, dirt: 0x8a7458, snow: 0xf2f6ff, wood: 0x8a6a48, metal: 0xffd07a, glass: 0xd0e8ff };
  const col = colors[surface] || 0xb0a898;
  const d = fxSprite('dust', col, 0.35 + Math.random() * 0.25, pos.clone().addScaledVector(n, 0.05), { opacity: 0.85 });
  addParticle(d, 0.8, 'smoke', { vel: n.clone().multiplyScalar(0.7).add(new THREE.Vector3(0, 0.25, 0)), grow: 1.9, op: 0.85 });
  if (surface === 'metal' || surface === 'glass' || surface === 'rock' || surface === 'concrete') {
    const k = surface === 'metal' ? 8 : 4;
    for (let i = 0; i < k; i++) {
      const s = fxSprite('glint', 0xffc070, 0.06 + Math.random() * 0.05, pos, { additive: true });
      const v = n.clone().multiplyScalar(rand(2, 5)).add(new THREE.Vector3(rand(-2.5, 2.5), rand(0, 3), rand(-2.5, 2.5)));
      addParticle(s, 0.3, 'spark', { vel: v, grav: 12 });
    }
  }
  if (surface === 'wood' || surface === 'dirt' || surface === 'sand' || surface === 'snow') {
    for (let i = 0; i < 5; i++) {
      const s = fxSprite('dust', col, 0.06 + Math.random() * 0.05, pos, { opacity: 0.9 });
      addParticle(s, 0.5, 'chunk', { vel: n.clone().multiplyScalar(rand(1.5, 3.5)).add(new THREE.Vector3(rand(-1.5, 1.5), rand(1, 3), rand(-1.5, 1.5))), grav: 11, op: 0.9 });
    }
  }
}
function spawnSparks(pos) { spawnImpact(pos, _pUp, 'metal'); }

function spawnBlood(pos, dir, big = 1) {
  if (!S.showBlood) { spawnImpact(pos, _pUp, 'dirt'); return; }
  const s = fxSprite('blood', 0xffffff, 0.55 * big, pos, { opacity: 0.95 });
  addParticle(s, 0.45, 'smoke', { vel: (dir ? dir.clone().multiplyScalar(1.2) : new THREE.Vector3()).add(new THREE.Vector3(0, 0.3, 0)), grow: 2.2, op: 0.95 });
  for (let i = 0; i < 8 * big; i++) {
    const d = fxSprite('blood', 0xffffff, 0.08 + Math.random() * 0.08, pos, { opacity: 0.9 });
    const v = (dir ? dir.clone().multiplyScalar(rand(1.5, 4)) : new THREE.Vector3()).add(new THREE.Vector3(rand(-1.5, 1.5), rand(0.5, 2.5), rand(-1.5, 1.5)));
    addParticle(d, 0.6, 'chunk', { vel: v, grav: 10, op: 0.9 });
  }
  // splatter on the surface behind the target
  if (dir) {
    const h = rayWorld(pos, dir, 2.5, 'shot');
    if (h) spawnDecal(h.point, h.normal, 'blood', rand(0.5, 0.9));
  }
}

function spawnShell(pos, rightDir) {
  if (particles.length > FX_LIMIT) return;
  const m = new THREE.Mesh(shellGeo, shellMat); m.position.copy(pos); scene.add(m);
  const v = (rightDir || new THREE.Vector3(1, 0, 0)).clone().multiplyScalar(rand(1.5, 2.5)).add(new THREE.Vector3(0, rand(1.5, 2.5), 0));
  addParticle(m, 1.2, 'shell', { vel: v, grav: 12, spin: new THREE.Vector3(rand(5, 15), rand(5, 15), rand(5, 15)), shared: true });
}

// oriented decal (bullet hole / blood) on a surface
// ---------- decals: instanced ring buffers (2 draw calls for every bullet hole and blood splat) ----------
const DECALS = {
  pools: {},
  pool(kind) {
    let p = this.pools[kind];
    if (p && p.mesh.parent) return p;
    const cap = kind === 'blood' ? 60 : 160;
    const mat = new THREE.MeshStandardMaterial({ map: kind === 'blood' ? bloodDecalTex() : bulletHoleTex(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, roughness: 0.9 });
    const mesh = new THREE.InstancedMesh(decalGeo, mat, cap);
    const zero = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < cap; i++) mesh.setMatrixAt(i, zero);
    mesh.frustumCulled = false; mesh.renderOrder = 1;
    scene.add(mesh);
    return (this.pools[kind] = { mesh, cap, i: 0 });
  },
  add(kind, pos, normal, size) {
    const p = this.pool(kind);
    _pQ.setFromUnitVectors(_dZ, normal); _pQ2.setFromAxisAngle(_dZ, Math.random() * 6.28); _pQ.multiply(_pQ2);
    _pM.compose(_pV.copy(pos).addScaledVector(normal, 0.012), _pQ, _pS.set(size, size, size));
    p.mesh.setMatrixAt(p.i, _pM); p.i = (p.i + 1) % p.cap;
    p.mesh.instanceMatrix.needsUpdate = true;
  },
  clear() { for (const k in this.pools) { const p = this.pools[k]; scene.remove(p.mesh); p.mesh.dispose(); } this.pools = {}; }
};
const _dZ = new THREE.Vector3(0, 0, 1), _pQ2 = new THREE.Quaternion(), _pM = new THREE.Matrix4(), _pS = new THREE.Vector3();
function spawnDecal(pos, normal, kind = 'hole', size = 0.13) { if (normal) DECALS.add(kind === 'blood' ? 'blood' : 'hole', pos, normal, size); }

// ---------- grenades / explosions ----------
const grenGeo = new THREE.SphereGeometry(0.07, 10, 8);
const grenMat = new THREE.MeshStandardMaterial({ color: 0x3a4430, roughness: 0.6, metalness: 0.4, emissive: 0xff2020, emissiveIntensity: 0.4 });
function throwGrenade(e, from, target) {
  const tp = target || player.pos;
  const dist2d = Math.hypot(tp.x - from.x, tp.z - from.z);
  const t = 1.0 + dist2d * 0.03;
  const tgt = new THREE.Vector3(tp.x + rand(-2, 2), tp.y || 0, tp.z + rand(-2, 2));
  const m = new THREE.Mesh(grenGeo, grenMat.clone()); m.castShadow = true; m.position.copy(from); scene.add(m);
  grenades.push({ m, fuse: 2.6, warned: false, src: e, vel: new THREE.Vector3((tgt.x - from.x) / t, (tgt.y + 0.2 - from.y + 0.5 * 18 * t * t) / t, (tgt.z - from.z) / t) });
  SFX.grenadePin();
}

// source: 'player' (shot barrels), the AI agent that threw the grenade, or null
// opts.big: the player's own grenade or launcher round - the full blast (huge fireball, column, shock ring) and
// maximum lethality: everyone inside the kill radius dies, the outer ring is still deadly for most soldiers.
// Returns the soldiers it killed.
function explode(pos, power = 1, source = null, opts = {}) {
  const big = !!opts.big;
  const surf = typeof surfaceAt === 'function' ? surfaceAt(pos.x, pos.z, pos.y + 0.5) : 'dirt';
  BOOM.blast(pos, big ? Math.max(1.6, power * 1.4) : Math.max(0.95, power), surf);
  // set off the drums around it (a short delay makes chains ripple instead of popping at once)
  for (const ex of WORLD.explosives) if (ex.alive && Math.hypot(ex.x - pos.x, ex.z - pos.z) < (big ? 7 : 4.2) * power) setTimeout(() => damageExplosive(ex, 999, source), 160 + Math.random() * 240);
  SFX.bigExplosion(pos, big ? Math.max(1.3, power * 1.2) : Math.max(0.9, power));

  const dp = pos.distanceTo(_pV.set(player.pos.x, player.pos.y + 1, player.pos.z));
  const friendly = source && source !== 'player' && source.team === 'blue';
  if (dp < 7 * power && !friendly && !G.dead) damagePlayer(Math.round(95 * power * (1 - dp / (7 * power))), pos);
  const killed = [];
  const R = (big ? 9.5 : 6) * power, R2 = (big ? 17 : 6) * power;
  for (const e of enemies) {
    if (e.dead) continue;
    if (big && source === 'player' && e.team === 'blue') continue;   // the player's own blasts spare the squad
    const d = pos.distanceTo(_pV.copy(e.g.position).add(_pUp));
    if (d >= R2) continue;
    const dmg = big ? (d < R ? 6000 : lerp(650, 140, (d - R) / (R2 - R))) : 150 * power * (1 - d / (6 * power));
    damageEnemy(e, dmg, 'body', e.g.position.clone().add(_pUp), _pV2.subVectors(e.g.position, pos).setY(0.35).normalize(), { explosive: true, source });
    if (e.dead) killed.push(e);
  }
  if (big && source === 'player' && killed.length && typeof CINE !== 'undefined' && CINE.blastCam) CINE.blastCam(pos, killed, power);
  return killed;
}

// ---------- big blasts: sprites large enough that no point-size cap shrinks them, a ground ring, rocks, smoke ----------
const _bmV = new THREE.Vector3(), _bmC = new THREE.Color();
const BOOM = {
  spr: [], live: [], rings: [], rocks: [], rockGeo: null, rockMat: null, cam: 0,
  // pooled THREE.Sprite (own material: per-sprite colour / opacity / blending)
  sprite(additive) {
    let o = null;
    for (const p of this.spr) if (!p.visible) { o = p; break; }
    if (!o) {
      if (this.spr.length >= 56) return null;
      o = new THREE.Sprite(new THREE.SpriteMaterial({ map: ASSETS.fx.explosion, transparent: true, depthWrite: false }));
      o.renderOrder = 4; o.frustumCulled = false; this.spr.push(o);
    }
    if (!o.parent) scene.add(o);
    o.material.blending = additive ? THREE.AdditiveBlending : THREE.NormalBlending;
    o.material.fog = false; o.material.toneMapped = !additive; o.material.needsUpdate = true;   // (haze would wash the blast into the sky colour)
    o.visible = true;
    return o;
  },
  // k: { tex, add, life, s0, s1, c0, c1 (rgb arrays), op, vel, drag, grav, delay, fade (fraction of life fading out) }
  add(pos, k) {
    const o = this.sprite(!!k.add); if (!o) return;
    o.material.map = ASSETS.fx[k.tex || 'explosion'];
    o.position.copy(pos); o.scale.set(k.s0, k.s0, 1); o.material.rotation = Math.random() * 6.28; o.material.opacity = 0;
    this.live.push(Object.assign({ o, t: -(k.delay || 0), spin: rand(-0.5, 0.5) }, k));
  },
  ring(pos, s) {
    let m = this.rings.find(r => !r.visible);
    if (!m) {
      if (this.rings.length >= 4) return;
      const g = new THREE.RingGeometry(0.82, 1, 48, 1); g.rotateX(-Math.PI / 2);
      m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0xffd8a8, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, side: THREE.DoubleSide }));
      m.renderOrder = 4; m.frustumCulled = false; this.rings.push(m);
    }
    if (!m.parent) scene.add(m);
    m.visible = true; m.position.set(pos.x, (typeof groundHeightAt === 'function' ? groundHeightAt(pos.x, pos.z, pos.y + 0.5, 0.05, 1.5) : 0) + 0.12, pos.z);
    m.scale.setScalar(0.5); m.material.opacity = 0.95;
    this.live.push({ ring: m, t: 0, life: 0.55, r1: 19 * s });
  },
  rock(pos, s) {
    if (!this.rockGeo) { this.rockGeo = new THREE.DodecahedronGeometry(0.09, 0); this.rockMat = new THREE.MeshStandardMaterial({ color: 0x3a3632, roughness: 0.95, metalness: 0 }); }
    let m = this.rocks.find(r => !r.visible);
    if (!m) { if (this.rocks.length >= 28) return; m = new THREE.Mesh(this.rockGeo, this.rockMat); m.castShadow = false; m.frustumCulled = false; this.rocks.push(m); }
    if (!m.parent) scene.add(m);
    m.visible = true; m.position.copy(pos); m.scale.setScalar(rand(0.5, 1.6) * Math.min(1.6, s));
    const a = Math.random() * 6.28, sp = rand(6, 15) * Math.sqrt(s);
    this.live.push({ rock: m, t: 0, life: rand(1.8, 2.8), vel: new THREE.Vector3(Math.cos(a) * sp, rand(6, 16) * Math.sqrt(s), Math.sin(a) * sp), spin: new THREE.Vector3(rand(-12, 12), rand(-12, 12), rand(-12, 12)) });
  },
  blast(pos, s, surf) {
    const P = _bmV.copy(pos), up = (y) => P.clone().setY(P.y + y);
    const q = Q().fx || 1, few = q < 0.7;
    // 1. white-hot core flash
    this.add(up(0.8 * s), { add: true, life: 0.26, s0: 5 * s, s1: 15 * s, c0: [3.2, 2.7, 1.9], c1: [2.2, 1.0, 0.35], op: 1, fade: 0.8 });
    this.add(up(0.4 * s), { add: true, life: 0.12, s0: 9 * s, s1: 20 * s, c0: [2.4, 2.2, 1.9], c1: [1.4, 0.8, 0.4], op: 0.8, fade: 1 });
    // 2. rolling fireball: burns white-orange, chars to black smoke as it climbs
    const nF = few ? 5 : 8;
    for (let i = 0; i < nF; i++) {
      const a = i / nF * 6.28 + rand(-0.3, 0.3), r = rand(0.4, 1.3) * s;
      this.add(P.clone().add(new THREE.Vector3(Math.cos(a) * r, rand(0.3, 1.6) * s, Math.sin(a) * r)), {
        life: rand(1.1, 1.7), s0: rand(2.6, 3.6) * s, s1: rand(7.5, 10) * s, c0: [1.9, 1.45, 1.05], c1: [0.2, 0.17, 0.15], op: 1, fade: 0.45,
        vel: new THREE.Vector3(Math.cos(a) * rand(1.5, 4), rand(2.5, 5.5), Math.sin(a) * rand(1.5, 4)).multiplyScalar(s), drag: 1.6, colorPow: 0.55 });
    }
    for (let i = 0; i < (few ? 2 : 4); i++) this.add(up(rand(0.6, 2) * s).add(new THREE.Vector3(rand(-1, 1) * s, 0, rand(-1, 1) * s)), { add: true, life: rand(0.45, 0.7), s0: 4 * s, s1: 9 * s, c0: [2.2, 1.3, 0.55], c1: [0.9, 0.25, 0.05], op: 0.9, fade: 0.7, vel: new THREE.Vector3(0, 3 * s, 0), drag: 1 });
    // 3. smoke column with a mushroom cap
    const nS = few ? 5 : 9;
    for (let i = 0; i < nS; i++) {
      const top = i >= nS - 3;
      this.add(up((0.8 + i * 0.5) * s).add(new THREE.Vector3(rand(-1, 1) * s, 0, rand(-1, 1) * s)), { tex: 'smoke', delay: 0.12 + i * 0.05, life: rand(4.5, 6.5), s0: rand(3, 4.5) * s, s1: (top ? rand(13, 17) : rand(8, 11)) * s,
        c0: [0.16, 0.15, 0.14], c1: [0.42, 0.41, 0.4], op: 0.9, fade: 0.55, fadeIn: 0.12, vel: new THREE.Vector3(rand(-0.6, 0.6), (top ? rand(7, 9) : rand(3.5, 6.5)) * Math.sqrt(s), rand(-0.6, 0.6)), drag: 0.55, wind: true });
    }
    // 3b. thick black smoke boiling up out of the fireball, and grey smoke rolling out low and lingering
    //     (the fire is gone in a second; the black and grey clouds hang over the spot for several seconds)
    const nB = few ? 6 : 11, nG = few ? 7 : 13;
    for (let i = 0; i < nB; i++) {
      const q = P.clone().add(new THREE.Vector3(rand(-1.1, 1.1) * s, rand(0.5, 2.6) * s, rand(-1.1, 1.1) * s));
      const sm = fxSprite('smoke', new THREE.Color().setScalar(rand(0.025, 0.075)), rand(2.0, 3.2) * s, q, { opacity: 0.94 });
      addParticle(sm, rand(5.5, 8.5), 'smoke', { grav: -rand(0.3, 0.55), grow: rand(0.26, 0.36), op: 0.94, vel: new THREE.Vector3(rand(-0.9, 0.9), rand(1.8, 3.4), rand(-0.9, 0.9)).multiplyScalar(Math.sqrt(s)) });
    }
    for (let i = 0; i < nG; i++) {
      const a = rand(0, 6.28), r = rand(0.4, 2.4) * s, g = rand(0.32, 0.62);
      const q = P.clone().add(new THREE.Vector3(Math.cos(a) * r, rand(0.3, 1.6) * s, Math.sin(a) * r));
      const sm = fxSprite('smoke', new THREE.Color(g, g * 0.99, g * 0.97), rand(2.4, 3.8) * s, q, { opacity: 0.8 });
      addParticle(sm, rand(6.5, 10.5), 'smoke', { grav: -rand(0.12, 0.26), grow: rand(0.18, 0.26), op: 0.8, vel: new THREE.Vector3(Math.cos(a) * rand(0.9, 2.4), rand(0.3, 1.3), Math.sin(a) * rand(0.9, 2.4)).multiplyScalar(Math.sqrt(s)) });
    }
    // 4. ground shock ring + screen-space pressure wave
    this.ring(P, s);
    // 5. dust skirt racing out along the ground (colour of the ground)
    const dc = surf === 'snow' ? 0xe8ecf0 : surf === 'sand' ? 0xc8ae84 : surf === 'concrete' || surf === 'rock' || surf === 'metal' ? 0x9a9690 : 0x8a7a62;
    const nD = few ? 8 : 16;
    for (let i = 0; i < nD; i++) {
      const a = i / nD * 6.28 + rand(-0.2, 0.2), sp = rand(9, 16) * Math.sqrt(s);
      const dd = fxSprite('dust', dc, rand(1.6, 2.6) * s, P.clone().setY(P.y + 0.3).add(new THREE.Vector3(Math.cos(a), 0, Math.sin(a))), { opacity: 0.85 });
      addParticle(dd, rand(1.4, 2.4), 'smoke', { grav: -0.2, grow: 1.1, op: 0.85, vel: new THREE.Vector3(Math.cos(a) * sp, rand(0.4, 1.6), Math.sin(a) * sp) });
    }
    // 6. debris: dark clods and rocks thrown high
    for (let i = 0; i < (few ? 10 : 18); i++) {
      const db = fxSprite('dust', 0x2a2620, 0.14 + Math.random() * 0.2, P.clone().setY(P.y + 0.4), { opacity: 1 });
      addParticle(db, rand(1.1, 1.9), 'chunk', { grav: 14, op: 1, vel: new THREE.Vector3(rand(-10, 10), rand(6, 17), rand(-10, 10)).multiplyScalar(Math.sqrt(s)) });
    }
    for (let i = 0; i < (few ? 5 : 10); i++) this.rock(P.clone().setY(P.y + 0.4), s);
    // 7. sparks and embers
    for (let i = 0; i < (few ? 16 : 32); i++) {
      const sp = fxSprite('glint', 0xffb050, 0.1 + Math.random() * 0.16, P.clone().setY(P.y + 0.6), { additive: true });
      addParticle(sp, rand(0.6, 1.3), 'spark', { grav: 9, vel: new THREE.Vector3(rand(-1, 1), rand(0.2, 1.2), rand(-1, 1)).normalize().multiplyScalar(rand(8, 22) * Math.sqrt(s)) });
    }
    for (let i = 0; i < (few ? 6 : 12); i++) {
      const em = fxSprite('glint', 0xff8a3a, rand(0.05, 0.09), P.clone().add(new THREE.Vector3(rand(-1.5, 1.5) * s, rand(1, 3) * s, rand(-1.5, 1.5) * s)), { additive: true });
      addParticle(em, rand(2, 3.5), 'spark', { grav: -0.4, vel: new THREE.Vector3(rand(-1.2, 1.2), rand(0.5, 2.2), rand(-1.2, 1.2)) });
    }
    // 8. fire left burning on the ground
    for (let i = 0; i < (few ? 4 : 7); i++) {
      const fire = fxSprite('explosion', 0xff9a40, rand(0.7, 1.3) * s, P.clone().add(new THREE.Vector3(rand(-1.6, 1.6) * s, 0.3, rand(-1.6, 1.6) * s)), { additive: true, opacity: 0.85 });
      addParticle(fire, rand(1.8, 3.6), 'smoke', { grav: -1.4, grow: 0.35, op: 0.85, vel: new THREE.Vector3(0, 0.7, 0) });
    }
    // 9. light, scorch, camera
    lightPulse(up(1.5 * s), 0xffa050, 26 * s, 42 * s, 0.6);
    spawnDecal(new THREE.Vector3(P.x, 0.02, P.z), new THREE.Vector3(0, 1, 0), 'hole', 2.8 * s);
    const cp = activeCamera.position, d = cp.distanceTo(P);
    const facing = _pV2.subVectors(P, cp).normalize().dot(new THREE.Vector3(0, 0, -1).applyQuaternion(activeCamera.quaternion));
    if (typeof shockwave === 'function' && d < 90 && facing > -0.2) shockwave(P, clamp(0.05 * s * (1 - d / 110), 0.012, 0.07));
    if (typeof POST !== 'undefined' && facing > 0.1) POST.grade.uniforms.flash.value = Math.max(POST.grade.uniforms.flash.value, clamp((1 - d / 70) * 0.6 * facing, 0, 0.55));
    G.camShake = Math.min(0.5, G.camShake + clamp(0.3 * s * (1 - d / 70), 0.02, 0.42));
    this.cam = Math.max(this.cam, clamp(1 - d / 45, 0, 1) * 0.6);
  },
  update(dt) {
    if (this.cam > 0) { this.cam = Math.max(0, this.cam - dt * 1.6); if (typeof MFX !== 'undefined') { MFX.radial += this.cam * 0.05; MFX.ghost = Math.max(MFX.ghost, this.cam * 0.35); } }
    for (let i = this.live.length - 1; i >= 0; i--) {
      const L = this.live[i]; L.t += dt;
      if (L.t < 0) continue;
      const u = clamp(L.t / L.life, 0, 1);
      if (L.ring) {
        const m = L.ring, e = 1 - Math.pow(1 - u, 2.2);
        m.scale.setScalar(0.5 + e * L.r1); m.material.opacity = 0.95 * Math.pow(1 - u, 1.5);
        if (u >= 1) { m.visible = false; this.live.splice(i, 1); }
        continue;
      }
      if (L.rock) {
        const m = L.rock; L.vel.y -= 16 * dt; m.position.addScaledVector(L.vel, dt);
        m.rotation.x += L.spin.x * dt; m.rotation.y += L.spin.y * dt; m.rotation.z += L.spin.z * dt;
        if (m.position.y < 0.06) { m.position.y = 0.06; L.vel.multiplyScalar(0.45); L.vel.y = Math.abs(L.vel.y) * 0.5; L.spin.multiplyScalar(0.6); }
        if (u >= 1) { m.visible = false; this.live.splice(i, 1); }
        continue;
      }
      const o = L.o;
      if (L.vel) { o.position.addScaledVector(L.vel, dt); if (L.drag) L.vel.multiplyScalar(Math.exp(-L.drag * dt)); if (L.wind) o.position.x += dt * 0.5; }
      const sz = lerp(L.s0, L.s1, 1 - Math.pow(1 - u, 2.4)); o.scale.set(sz, sz, 1);
      o.material.rotation += L.spin * dt;
      const cu = Math.pow(u, L.colorPow || 1);
      o.material.color.setRGB(lerp(L.c0[0], L.c1[0], cu), lerp(L.c0[1], L.c1[1], cu), lerp(L.c0[2], L.c1[2], cu));
      const fi = L.fadeIn ? clamp(u / L.fadeIn, 0, 1) : 1, fo = clamp((1 - u) / (L.fade || 0.5), 0, 1);
      o.material.opacity = L.op * fi * fo;
      if (u >= 1) { o.visible = false; this.live.splice(i, 1); }
    }
  },
  clear() { for (const L of this.live) { if (L.o) L.o.visible = false; if (L.ring) L.ring.visible = false; if (L.rock) L.rock.visible = false; } this.live.length = 0; this.cam = 0; }
};

function updateGrenades(dt) {
  for (let i = grenades.length - 1; i >= 0; i--) {
    const g = grenades[i];
    g.fuse -= dt; g.vel.y -= 18 * dt;
    g.m.position.addScaledVector(g.vel, dt);
    const p = g.m.position;
    const gh = groundHeightAt(p.x, p.z, p.y + 0.3, 0.05, 0.3);
    if (p.y < gh + 0.07) { p.y = gh + 0.07; if (g.vel.y < 0) g.vel.y *= -0.35; g.vel.x *= 0.7; g.vel.z *= 0.7; if (Math.abs(g.vel.y) < 0.5) g.vel.y = 0; }
    g.m.material.emissiveIntensity = (g.fuse % 0.3 < 0.15) ? 2.5 : 0.3;
    if (!g.warned && (!g.src || g.src.team !== 'blue') && Math.hypot(p.x - player.pos.x, p.z - player.pos.z) < 8) { g.warned = true; addKillFeed('⚠ GRENADE — MOVE!', true); AudioSys.tone(880, 0.1, 0.3, 'square'); }
    if (g.fuse <= 0) { if (!(g.kind && g.kind !== 'frag' && typeof EQUIP !== 'undefined' && EQUIP.detonate(g))) explode(p.clone(), g.src === 'player' ? 1.15 : 1, g.src, { big: g.src === 'player' }); scene.remove(g.m); grenades.splice(i, 1); }
  }
}

// ---------- particle update (world time) ----------
function updateParticles(dt, dtReal) {
  BOOM.update(dt);
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i], step = p.real ? dtReal : dt;
    p.life -= step;
    if (p.life <= 0) {
      if (p.obj.isVSprite) p.obj.batch.items.delete(p.obj);
      else if (p.pooled) p.obj.visible = false;
      else { scene.remove(p.obj); if (!p.shared && p.obj.material) p.obj.material.dispose(); }
      particles.splice(i, 1); continue;
    }
    const t = p.life / p.max;
    if (p.vel) { p.obj.position.addScaledVector(p.vel, step); if (p.grav) p.vel.y -= p.grav * step; }
    if (p.spin) { p.obj.rotation.x += p.spin.x * step; p.obj.rotation.y += p.spin.y * step; }
    switch (p.kind) {
      case 'flash': p.obj.material.opacity = t; break;
      case 'fade': p.obj.material.opacity = t * (p.op || 1); break;
      case 'spark': p.obj.material.opacity = t; break;
      case 'chunk': p.obj.material.opacity = t * (p.op || 1); if (p.obj.position.y < 0.02) { p.obj.position.y = 0.02; p.vel.set(0, 0, 0); } break;
      case 'smoke': { p.obj.material.opacity = t * (p.op || 0.5); const gr = 1 + step * (p.grow || 1); p.obj.scale.x *= gr; p.obj.scale.y *= gr; if (p.vel) p.vel.multiplyScalar(1 - step * 1.2); break; }
      case 'boom': { p.obj.material.opacity = Math.min(1, t * 1.6); const gr = 1 + step * (p.grow || 1); p.obj.scale.x *= gr; p.obj.scale.y *= gr; break; }
      case 'shell': if (p.obj.position.y < 0.02) { p.obj.position.y = 0.02; p.vel.y *= -0.25; p.vel.x *= 0.5; p.vel.z *= 0.5; } break;
      case 'trail': { p.obj.material.opacity = t * (p.op || 0.6); const gr = 1 + step * 2; p.obj.scale.x *= gr; p.obj.scale.y *= gr; break; } // batched sprites have a plain {x, y} scale
    }
  }
  const L = fxLight;
  if (L.userData.t > 0) { L.userData.t -= dt; if (L.userData.t <= 0) L.intensity = 0; else L.intensity *= Math.pow(0.002, dt); }
}

// ---------- weather ----------
// Layers of particles around the camera (rain and thunderstorm as falling streaks, hail pellets driven by the wind,
// blowing sand with dust clouds), lightning with rolling thunder, wind on the vegetation, and a looping ambience
// generated here (rain, wind, hail). Random Outdoor picks clear skies 60 % of the time (random_maps.js).
let weatherKind = 'none', lightningT = 8, flashT = 0, weatherArea = 80, WEATHER_WIND = 1;
const WEATHER = { layers: [], vid: 0, snd: '' };
const WEATHER_CONF = {
  rain:      [{ streak: true, n: 2600, c: 0x9fb6d4, o: 0.42, len: 0.6, fall: 20, wx: 1.5 }],
  lightrain: [{ streak: true, n: 1300, c: 0xaebfd2, o: 0.32, len: 0.42, fall: 14, wx: 0.8 }],
  thunder:   [{ streak: true, n: 3400, c: 0x9cb0c8, o: 0.48, len: 0.75, fall: 24, wx: 4.5 }],
  hail:      [{ n: 3600, box: 46, c: 0xf4f8fc, s: 0.13, o: 1, fall: 19, wx: 8.5, jit: 1.6 }, { streak: true, box: 46, n: 1400, c: 0xc8d4e0, o: 0.5, len: 0.55, fall: 18, wx: 8 }],
  sandstorm: [{ n: 4200, box: 50, c: 0xd2aa72, s: 0.14, o: 0.6, sand: true, wx: 15 }, { n: 180, c: 0xc89c62, s: 10, o: 0.3, tex: 'dust', sand: true, wx: 11, cloud: true }],
  snow:      [{ n: 2200, c: 0xffffff, s: 0.11, o: 0.85 }],
  dust:      [{ n: 900, c: 0xd8b880, s: 0.1, o: 0.35 }],
  motes:     [{ n: 700, c: 0xfff0c8, s: 0.045, o: 0.6, add: true, area: 40 }],
  drips:     [{ n: 260, c: 0xa8c8e8, s: 0.05, o: 0.55, area: 40 }],
  embers:    [{ n: 300, c: 0xff8a3a, s: 0.07, o: 0.9, add: true }],
  fog:       [{ n: 300, c: 0xcfd6dc, s: 1.6, o: 0.09, tex: 'smoke' }]
};
function setWeather(kind) {
  for (const L of WEATHER.layers) { scene.remove(L.obj); L.obj.geometry.dispose(); L.obj.material.dispose(); }
  WEATHER.layers.length = 0;
  weatherKind = kind || 'none'; WEATHER_WIND = 1;
  document.getElementById('flash').style.opacity = 0;
  WEATHER_SND.set(WORLD.indoor ? '' : { rain: 'wx_rain', lightrain: 'wx_rain', thunder: 'wx_rain', hail: 'wx_hail', sandstorm: 'wx_wind' }[weatherKind] || '', weatherKind);
  const confs = WEATHER_CONF[weatherKind]; if (!confs) return;
  WEATHER_WIND = { hail: 3.2, sandstorm: 2.6, thunder: 1.8, rain: 1.3 }[weatherKind] || 1;
  lightningT = rand(3, 7);
  for (const conf of confs) {
    const area = conf.box || conf.area || 80, n = Math.round(conf.n * Q().weather);
    const pos = new Float32Array(n * 3 * (conf.streak ? 2 : 1)), seeds = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = rand(-area / 2, area / 2), y = rand(0, conf.area ? 5 : 30), z = rand(-area / 2, area / 2); seeds[i] = Math.random() * 6.28;
      if (conf.streak) { pos.set([x, y, z, x, y + conf.len, z], i * 6); } else pos.set([x, conf.sand ? rand(0, conf.cloud ? 9 : 14) : y, z], i * 3);
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    let obj;
    if (conf.streak) obj = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: conf.c, transparent: true, opacity: conf.o, depthWrite: false }));
    else {
      const map = conf.tex ? ASSETS.fx[conf.tex] : radialTex('dot', 'rgba(255,255,255,1)', 'rgba(255,255,255,0)');
      obj = new THREE.Points(geo, new THREE.PointsMaterial({ color: conf.c, size: conf.s, map, transparent: true, opacity: conf.o, sizeAttenuation: true, depthWrite: false, blending: conf.add ? THREE.AdditiveBlending : THREE.NormalBlending }));
    }
    obj.frustumCulled = false; obj.renderOrder = 2;
    scene.add(obj);
    WEATHER.layers.push({ obj, conf, seeds, area, n });
  }
  weatherArea = confs[0].area || 80;
}

function updateWeather(dt, t) {
  if (flashT > 0) {
    flashT -= dt;
    const f = Math.max(0, flashT) * (flashT > 0.12 && flashT < 0.18 ? 0.35 : 1);   // a lightning stroke flickers
    hemi.intensity = WORLD.env.hemiI + f * 3;
    document.getElementById('flash').style.opacity = f * 1.6;
  }
  if ((weatherKind === 'rain' || weatherKind === 'thunder') && !WORLD.indoor) {
    lightningT -= dt;
    if (lightningT <= 0) {
      const storm = weatherKind === 'thunder';
      lightningT = storm ? rand(4, 10) : rand(9, 20); flashT = storm ? 0.3 : 0.22;
      const far = Math.random(), delay = 250 + far * 2400;
      setTimeout(() => SFX.thunder(far), delay);
    }
  }
  WEATHER_SND.retry(dt);
  for (const sw of swayers) sw.rotation.z = Math.sin(t * 1.4 * Math.min(2, WEATHER_WIND) + sw.userData.ph) * sw.userData.amp * WEATHER_WIND;
  if (!WEATHER.layers.length) return;
  const cp = activeCamera.position;
  for (const L of WEATHER.layers) {
    const C = L.conf, A = L.area / 2, arr = L.obj.geometry.attributes.position.array, n = L.n;
    L.obj.position.set(cp.x, 0, cp.z);
    if (C.streak) {
      // falling streaks slanted by the wind: both ends move together
      const vy = C.fall, vx = C.wx, len = C.len;
      for (let i = 0; i < n; i++) {
        const k = i * 6, sp = 1 + (i % 7) * 0.05;
        let x = arr[k] + vx * dt * sp, y = arr[k + 1] - vy * dt * sp, z = arr[k + 2];
        if (y < 0) { y = rand(24, 30); x = rand(-A, A); z = rand(-A, A); }
        if (x > A) x -= 2 * A;
        arr[k] = x; arr[k + 1] = y; arr[k + 2] = z;
        arr[k + 3] = x - vx / vy * len; arr[k + 4] = y + len; arr[k + 5] = z;
      }
    } else {
      for (let i = 0; i < n; i++) {
        const k = i * 3;
        if (C.sand) {
          // sand and dust clouds racing across the ground with gusts
          const g = 1 + Math.sin(t * 0.9 + L.seeds[i]) * 0.3;
          arr[k] += C.wx * dt * g; arr[k + 1] += Math.sin(t * 2.1 + L.seeds[i]) * 0.6 * dt; arr[k + 2] += Math.cos(t * 0.7 + L.seeds[i]) * 1.2 * dt;
          if (arr[k] > A) { arr[k] = -A; arr[k + 2] = rand(-A, A); }
          continue;
        }
        switch (weatherKind) {
          case 'hail': arr[k + 1] -= C.fall * dt; arr[k] += C.wx * dt + Math.sin(t * 7 + L.seeds[i]) * C.jit * dt; if (arr[k + 1] < 0) { arr[k + 1] = rand(24, 30); arr[k] = rand(-A, A); arr[k + 2] = rand(-A, A); } if (arr[k] > A) arr[k] -= 2 * A; break;
          case 'snow': arr[k + 1] -= 2.2 * dt; arr[k] += Math.sin(t * 0.8 + L.seeds[i]) * 0.5 * dt; if (arr[k + 1] < 0) arr[k + 1] = 30; break;
          case 'dust': arr[k] += 4.5 * dt; arr[k + 1] += Math.sin(t + L.seeds[i]) * 0.3 * dt; if (arr[k] > A) arr[k] = -A; break;
          case 'embers': arr[k + 1] += (0.8 + (i % 5) * 0.2) * dt; arr[k] += Math.sin(t + L.seeds[i]) * 0.6 * dt; if (arr[k + 1] > 18) arr[k + 1] = 0; break;
          case 'motes': arr[k] += Math.sin(t * 0.3 + L.seeds[i]) * 0.12 * dt; arr[k + 1] += Math.cos(t * 0.25 + L.seeds[i]) * 0.08 * dt; break;
          case 'drips': arr[k + 1] -= 7 * dt; if (arr[k + 1] < 0) { arr[k + 1] = rand(3.5, 4.2); arr[k] = rand(-A, A); arr[k + 2] = rand(-A, A); } break;
          case 'fog': arr[k] += 0.4 * dt; if (arr[k] > A) arr[k] = -A; break;
        }
      }
    }
    L.obj.geometry.attributes.position.needsUpdate = true;
  }
}

// weather ambience: loops generated once in plain JS (22 kHz, seamless) and played on the ambience bus
const WEATHER_SND = {
  RATE: 22050,
  make(name) {
    if (AudioSys.has(name)) return true;
    if (!AC) return false;
    const R = this.RATE, dur = 4, n = R * dur, m = Math.round(R * 0.3), N = n + m, x = new Float32Array(N);
    let seed = name.length * 977 + 13;
    const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 * 2 - 1; };
    const onePole = (f) => 1 - Math.exp(-2 * Math.PI * f / R);
    if (name === 'wx_wind') {
      // howling wind: low band of noise, slow gusts (whole cycles per loop) and a whistle that rises with them
      let l1 = 0, l2 = 0, h = 0, ph = 0;
      const a = onePole(900), b = onePole(140);
      for (let i = 0; i < N; i++) {
        const t = i / R, g = 0.55 + 0.3 * Math.sin(2 * Math.PI * t / dur) + 0.15 * Math.sin(2 * Math.PI * 3 * t / dur + 1.3);
        const w = rnd(); l1 += a * (w - l1); l2 += a * (l1 - l2); h += b * (l2 - h);
        ph += 2 * Math.PI * (380 + 160 * g) / R;
        x[i] = ((l2 - h) * 2.4 + Math.sin(ph) * 0.03 * g * g) * g;
      }
    } else {
      // rain: a hiss of fine drops and the ticks of single big ones; hail: hard pellets bouncing off everything
      const hail = name === 'wx_hail';
      let l = 0, h = 0;
      const a = onePole(hail ? 7000 : 6000), b = onePole(hail ? 900 : 450);
      for (let i = 0; i < N; i++) { const w = rnd(); l += a * (w - l); h += b * (l - h); x[i] = (l - h) * (hail ? 0.45 : 0.6); }
      const ticks = (hail ? 190 : 70) * dur;
      for (let k = 0; k < ticks; k++) {
        const at = Math.floor((rnd() * 0.5 + 0.5) * n), f = (hail ? 2600 : 1800) + (rnd() * 0.5 + 0.5) * (hail ? 3600 : 2600), amp = (hail ? 0.35 : 0.16) * (0.3 + (rnd() * 0.5 + 0.5)), len = Math.round(R * (hail ? 0.012 : 0.02));
        for (let j = 0; j < len && at + j < N; j++) x[at + j] += Math.sin(2 * Math.PI * f * j / R) * Math.exp(-j / (len * 0.25)) * amp;
      }
    }
    const out = new Int16Array(n + 1);
    let pk = 0; for (let i = 0; i < N; i++) pk = Math.max(pk, Math.abs(x[i]));
    const k = 0.9 / (pk || 1);
    for (let i = 0; i < n; i++) { let v = x[i]; if (i < m) { const u = i / m; v = x[i] * Math.sqrt(u) + x[n + i] * Math.sqrt(1 - u); } out[i] = Math.round(clamp(v * k, -1, 1) * 32767); }
    out[n] = out[0];
    AudioSys.infos[name] = { rate: R, n }; AudioSys.decoded[name] = out;
    if (AudioSys.ready) { AudioSys._sendSample(name); AudioSys._flush(); }
    SOUND_LEVEL[name] = 0.5;
    return true;
  },
  set(name, kind) {
    if (WEATHER.kind === kind && WEATHER.snd === name && (WEATHER.vid || !name)) return;
    for (const k of ['vid', 'vid2']) if (WEATHER[k]) { AudioSys.post({ t: 'stop', vid: WEATHER[k], time: 1.2 }); WEATHER[k] = 0; }
    WEATHER.snd = name; WEATHER.kind = kind;
    if (!name || !this.make(name)) return;   // no audio yet (before the first click): retried by retry()
    const vol = { thunder: 0.85, rain: 0.7, lightrain: 0.45, hail: 0.8, sandstorm: 0.75 }[kind] || 0.5;
    WEATHER.vid = AudioSys.play(name, { bus: 2, loop: true, fade: 2, vol, reverb: 0, wide: true });
    // a hailstorm comes with a gale
    if (kind === 'hail' && this.make('wx_wind')) WEATHER.vid2 = AudioSys.play('wx_wind', { bus: 2, loop: true, fade: 2, vol: 0.6, reverb: 0, wide: true, offset: 1.7 });
  },
  retryT: 0,
  retry(dt) { if (!WEATHER.snd || WEATHER.vid || !AC) return; this.retryT -= dt; if (this.retryT > 0) return; this.retryT = 1; const s = WEATHER.snd, k = WEATHER.kind; WEATHER.kind = null; this.set(s, k); }
};
