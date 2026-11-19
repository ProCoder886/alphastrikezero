// ---------- player ----------
const player = {
  pos: new THREE.Vector3(0, 0, 10), vel: new THREE.Vector3(),
  yaw: Math.PI, pitch: 0, onGround: true, crouch: false, sliding: false, slideT: 0,
  stamina: 100, eye: 1.68, bobT: 0, hp: 100, maxHp: 100, lastDmg: -99, speed2d: 0,
  lean: 0, leanK: 0, leanOff: 0, sprintT: 0, airT: 0, surface: 'concrete', prone: false
};
const keys = {};

document.addEventListener('keydown', e => {
  keys[e.code] = true;
  if (!G.playing || G.paused || G.dead) return;
  if (G.cine) { if (e.code === 'Space' || e.code === 'Escape') CINE.skip(); return; }
  if (typeof INVWHEEL !== 'undefined' && !e.repeat) { if (INVWHEEL.key(e)) return; if (e.code === 'KeyI') { INVWHEEL.show(); return; } }
  if (e.code === 'KeyR' && !e.repeat) startReload();
  if (e.code === 'KeyN' && !e.repeat) NVG.toggle();
  if (e.code === 'KeyM' && !e.repeat) NVG.cycleMode();
  // 1-3 primaries, 4-6 secondaries, 7 melee, 8 launcher
  const dm = e.code.match(/^Digit(\d)$/);
  if (dm) { const n = parseInt(dm[1]); INVENTORY.switchWeapon(n === 0 ? 9 : n - 1); }
  if (e.code === 'KeyX') INVENTORY.switchWeapon(INVENTORY.lastIdx);
  if (e.code === 'KeyE') interact();
  if (e.code === 'KeyC' && (keys.ShiftLeft || player.sprintT > 0.2) && player.onGround && player.speed2d > 6) { player.sliding = true; player.slideT = 0.75; }
  if (e.code === 'KeyZ' && !e.repeat) toggleProne();
  else if (player.prone && !e.repeat && (e.code === 'KeyC' || e.code === 'ControlLeft' || e.code === 'Space')) toggleProne(); // up to a crouch / on your feet
  if (e.code === 'KeyV' && !e.repeat) startPlayerMelee('butt');
  if (e.code === 'KeyF' && !e.repeat) startPlayerMelee('kick');
  if (e.code === 'KeyG' && !e.repeat && typeof EQUIP !== 'undefined') EQUIP.tryThrow('lethal');
  if (e.code === 'KeyT' && !e.repeat && typeof EQUIP !== 'undefined') EQUIP.tryThrow('tactical');
});
document.addEventListener('keyup', e => { keys[e.code] = false; });

document.addEventListener('wheel', e => {
  if (!G.playing || G.paused || G.dead || G.cine) return;
  if (typeof INVWHEEL !== 'undefined' && INVWHEEL.open) { INVWHEEL.wheel(e.deltaY); return; }
  const dir = Math.sign(e.deltaY), n = INVENTORY.slots.length;
  INVENTORY.switchWeapon((INVENTORY.activeIdx + dir + n) % n);
});

document.addEventListener('mousemove', e => {
  if (!locked || G.paused || G.dead || G.cine) return;
  if (typeof INVWHEEL !== 'undefined' && INVWHEEL.open) return;   // the wheel holds the view still
  const w = INVENTORY.curW();
  const zoom = adsT > 0.5 && w ? (adsFovOf(w) / S.fov) : 1;
  const s = 0.0021 * S.sens * (adsT > 0.5 ? S.adsSens * Math.max(0.25, zoom) / 0.75 : 1);
  player.yaw -= e.movementX * s;
  player.pitch -= e.movementY * s;
  player.pitch = clamp(player.pitch, -1.45, 1.45);
  swayX = clamp(swayX - e.movementX * 0.00035, -0.035, 0.035);
  swayY = clamp(swayY + e.movementY * 0.00035, -0.035, 0.035);
});

document.addEventListener('mousedown', e => {
  if (!locked || G.paused || G.dead) return;
  if (G.cine) { CINE.skip(); return; }
  if (typeof INVWHEEL !== 'undefined' && INVWHEEL.open) { if (e.button === 0) INVWHEEL.confirm(); else if (e.button === 2) INVWHEEL.hide(); return; }
  if (e.button === 0) { mouseFire = true; const w = INVENTORY.curW(); if (w && !w.def.auto) tryFire(); }
  if (e.button === 2) ads = true;
});
document.addEventListener('mouseup', e => {
  if (e.button === 0) mouseFire = false;
  if (e.button === 2) ads = false;
});
document.addEventListener('contextmenu', e => e.preventDefault());

let stepT = 0, heartT = 0, breathOutPlayed = true;

function updatePlayer(dt) {
  const w = INVENTORY.curW();
  const wantSprint = ((keys.ShiftLeft && keys.KeyW) || TOUCH.sprint) && player.stamina > 2 && !ads && !player.crouch && !player.prone;
  player.crouch = !!(keys.KeyC || keys.ControlLeft || TOUCH.crouch) && !player.sliding && !player.prone;
  if (player.sliding) { player.slideT -= dt; if (player.slideT <= 0 || player.speed2d < 2.5) player.sliding = false; }

  // hold breath while scoped (Shift)
  const scoped = w && w.def.scope && adsT > 0.85;
  G.holdingBreath = scoped && (keys.ShiftLeft || TOUCH.breath) && G.breath > 0;
  if (G.holdingBreath) { if (breathOutPlayed) { SFX.breathIn(); breathOutPlayed = false; } G.breath = Math.max(0, G.breath - 28 * dt); }
  else { if (!breathOutPlayed) { SFX.breathOut(); breathOutPlayed = true; } G.breath = Math.min(100, G.breath + 18 * dt); }

  const sprinting = wantSprint && !player.sliding && player.onGround;
  player.sprintT = sprinting ? player.sprintT + dt : 0;
  const speed = player.sliding ? 10.5 : player.prone ? (adsT > 0.5 ? 0.55 : 1.15) : sprinting ? 8.4 : player.crouch ? 2.9 : (adsT > 0.5 ? 3.6 : 5.4);
  if (sprinting) player.stamina = Math.max(0, player.stamina - 14 * dt); else player.stamina = Math.min(100, player.stamina + 12 * dt);

  // lean: Q left, E right (E stays pick-up / hold-to-interact while one of those is in reach)
  let targetLean = 0;
  const canLean = !player.prone && !sprinting && !player.sliding && player.onGround;
  if (canLean && keys.KeyQ) targetLean = 1;
  else if (canLean && keys.KeyE && eKeyFree()) targetLean = -1;
  player.leanK = damp(player.leanK, targetLean, 9, dt);
  player.lean = player.leanK * 0.16;

  const f = _plV1.set(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
  const rgt = _plV2.set(-f.z, 0, f.x);
  const want = _plV3.set(0, 0, 0);
  if (!player.sliding) {
    if (keys.KeyW) want.add(f); if (keys.KeyS) want.sub(f);
    if (keys.KeyD) want.add(rgt); if (keys.KeyA) want.sub(rgt);
    if (TOUCH.mx || TOUCH.my) { want.addScaledVector(f, TOUCH.my); want.addScaledVector(rgt, TOUCH.mx); }   // analogue stick
  } else want.add(f);
  const wl = want.length();
  if (wl > 0) want.multiplyScalar(speed * Math.min(1, wl) / wl);   // a half-pushed stick walks slowly

  const k = Math.min(1, dt * (player.onGround ? (player.sliding ? 1.5 : 11) : 2.5));
  player.vel.x += (want.x - player.vel.x) * k;
  player.vel.z += (want.z - player.vel.z) * k;
  if (keys.Space && player.onGround && !player.sliding && !player.prone && !(player.proneUpT > 0)) { player.vel.y = 7.4; player.onGround = false; }
  player.proneUpT = Math.max(0, (player.proneUpT || 0) - dt);
  player.vel.y -= 22 * dt;

  const height = player.prone ? 0.62 : player.crouch || player.sliding ? 1.15 : 1.78;
  player.pos.x += player.vel.x * dt; player.pos.z += player.vel.z * dt;
  resolveCollision(player.pos, 0.36, player.pos.y, height);
  const ceil = ceilingAbove(player.pos.x, player.pos.z, player.pos.y + 0.5, 0.3);
  player.pos.y += player.vel.y * dt;
  if (player.pos.y + height > ceil && player.vel.y > 0) { player.pos.y = ceil - height; player.vel.y = 0; }

  const gh = groundHeightAt(player.pos.x, player.pos.z, player.pos.y, 0.3, 0.5);
  if (player.pos.y <= gh + 0.001 && player.vel.y <= 0) {
    if (!player.onGround) {
      if (player.vel.y < -13) damagePlayer(Math.round((-player.vel.y - 13) * 4), null);
      VMS.land = clamp(-player.vel.y * 0.006, 0, 0.06);
      if (player.airT > 0.25) SFX.step(player.surface);
    }
    // smooth step-up onto low ledges / stairs
    player.pos.y = gh > player.pos.y ? Math.min(gh, player.pos.y + dt * 6) : gh;
    if (gh - player.pos.y < 0.01) player.pos.y = gh;
    player.vel.y = 0; player.onGround = true; player.airT = 0;
  } else if (player.pos.y > gh + 0.05) { player.onGround = false; player.airT += dt; }

  player.speed2d = Math.hypot(player.vel.x, player.vel.z);
  player.surface = surfaceAt(player.pos.x, player.pos.z, player.pos.y);

  const targetEye = player.prone ? 0.42 : player.sliding ? 0.8 : (player.crouch ? 1.05 : 1.66);
  player.eye += (targetEye - player.eye) * Math.min(1, dt * (player.prone || player.eye < 0.9 ? 5 : 10)); // going prone / getting up takes a moment

  // Walking head motion: a dip on every footfall, side-to-side weight shift, a little roll and nod; it grows with
  // speed (sprinting is heavier), eases in and out, and almost disappears while aiming down the sights.
  let bobY = 0, bobX = 0, bobRoll = 0, bobPitch = 0;
  const walkSpd = player.onGround && !player.sliding ? player.speed2d : 0;
  player.bobAmp = damp(player.bobAmp || 0, walkSpd > 0.5 ? Math.min(1.6, walkSpd / 4.2) : 0, 7, dt);
  if (walkSpd > 0.5) {
    player.bobT += dt * walkSpd * 1.55;
    stepT -= dt * walkSpd;
    if (stepT <= 0) { SFX.step(player.surface); stepT = player.prone ? 1.1 : player.crouch ? 2.6 : 2.1; }
  }
  if (player.bobAmp > 0.002) {
    const A = player.bobAmp * (1 - adsT * 0.78) * (player.crouch ? 0.65 : 1), sprint = clamp((walkSpd - 5) / 3, 0, 1);
    const ph = player.bobT, fall = Math.abs(Math.sin(ph)) - 0.64;
    bobY = fall * 0.036 * A * (1 + sprint * 0.6);
    bobX = Math.sin(ph) * 0.022 * A;
    bobRoll = Math.sin(ph) * 0.0065 * A * (1 + sprint * 0.8);
    bobPitch = fall * 0.0055 * A * (1 + sprint * 0.5);
  }
  // crawling: elbows and knees rock the head side to side
  if (player.prone && walkSpd > 0.3) {
    const ph = player.bobT * 2.2;
    bobX += Math.sin(ph) * 0.03; bobY += (Math.abs(Math.sin(ph)) - 0.5) * 0.02; bobRoll += Math.sin(ph) * 0.03;
  }
  // breathing when standing still
  const still = 1 - Math.min(1, player.bobAmp * 2);
  bobY += Math.sin(G.time * 1.35) * 0.004 * still * (1 - adsT * 0.6);
  bobPitch += Math.sin(G.time * 1.35 + 0.6) * 0.0009 * still * (1 - adsT * 0.6);

  // camera shake + recoil
  const shakeX = rand(-1, 1) * G.camShake, shakeY = rand(-1, 1) * G.camShake;
  G.camShake *= Math.pow(0.008, dt);
  if (G.camShake < 0.0005) G.camShake = 0;
  // scope sway (breathing) when scoped and not holding breath
  let swP = 0, swY = 0;
  if (scoped && !G.holdingBreath) { const t = G.time; swP = Math.sin(t * 1.1) * 0.0022 + Math.sin(t * 2.3) * 0.0008; swY = Math.cos(t * 0.8) * 0.0028; }

  // leaning moves the head out sideways (shortened when a wall is in the way) and a little down
  let leanX = 0;
  if (Math.abs(player.leanK) > 0.01) {
    const side = Math.sign(-player.leanK), dir = _plV3.set(Math.cos(player.yaw) * side, 0, -Math.sin(player.yaw) * side);
    const head = _plV4.set(player.pos.x, player.pos.y + player.eye, player.pos.z);
    const hit = rayWorld(head, dir, 0.6, 'shot');
    const room = hit ? Math.max(0, head.distanceTo(hit.point) - 0.18) : 0.42;
    player.leanOff = damp(player.leanOff, Math.min(0.42, room) * Math.abs(player.leanK), 14, dt);
    leanX = player.leanOff * side;
  } else player.leanOff = 0;
  bobX += leanX; bobY -= player.leanOff * 0.12;
  camera.position.set(player.pos.x + bobX * Math.cos(player.yaw) + shakeX * 0.3, player.pos.y + player.eye + bobY + shakeY * 0.3, player.pos.z - bobX * Math.sin(player.yaw));
  camera.rotation.y = player.yaw + recoilY + swY;
  camera.rotation.x = player.pitch + recoilP + swP + shakeY * 0.5 + bobPitch;
  camera.rotation.z = player.lean + shakeX * 0.4 + (player.sliding ? 0.04 : 0) + bobRoll;
  updatePlayerMelee(dt);
  if (typeof EQUIP !== 'undefined') EQUIP.update(dt);

  // recoil recovery: fast when not firing
  const firing = mouseFire && w && w.def.auto && w.mag > 0;
  const rec = firing ? 0.25 : (w && w.def.cls === 'sniper' ? 6 : 9);
  recoilP = damp(recoilP, 0, rec, dt); recoilY = damp(recoilY, 0, rec, dt);
  swayX *= Math.pow(0.004, dt); swayY *= Math.pow(0.004, dt);

  const tf = (adsT > 0 && w && !w.def.noADS ? lerp(S.fov, adsFovOf(w), smoothstep(0, 1, adsT)) : (sprinting ? S.fov + 7 : (player.sliding ? S.fov + 10 : S.fov))) - SLOWMO.fovKick();
  camera.fov += (tf - camera.fov) * Math.min(1, dt * (SLOWMO.active ? 20 : 14));
  camera.updateProjectionMatrix();
  vmCamera.fov = lerp(54, 46, smoothstep(0, 1, adsT)); vmCamera.updateProjectionMatrix();

  // low health feedback
  if (player.hp > 0 && player.hp < 35) { heartT -= dt; if (heartT <= 0) { SFX.heartbeat(); heartT = 0.9 + player.hp / 60; } }
  const bs = document.getElementById('bloodScreen');
  bs.style.opacity = player.hp < 45 ? (1 - player.hp / 45) * 0.85 : 0;

  // health regenerates after 5 s out of fire (in Survival only up to half)
  const regenTo = MODE.regenCap ?? player.maxHp;
  if (G.time - player.lastDmg > 5 && player.hp > 0 && player.hp < regenTo) player.hp = Math.min(regenTo, player.hp + 9 * dt);
}
const _plV1 = new THREE.Vector3(), _plV2 = new THREE.Vector3(), _plV3 = new THREE.Vector3(), _plV4 = new THREE.Vector3();

// E leans right only when it is not needed for a pick-up or a hold-to-interact objective
let _interactHintEl = null;
function eKeyFree() {
  _interactHintEl = _interactHintEl || document.getElementById('interactHint');
  return !(typeof HOLD !== 'undefined' && HOLD.key) && _interactHintEl.style.display !== 'block';
}

// ---------- prone (Z): lie down, crawl, steadier aim; Z / C / Space to get up ----------
function toggleProne() {
  if (player.prone) {
    // stand back up only with head room (low ceilings, vehicles)
    if (ceilingAbove(player.pos.x, player.pos.z, player.pos.y + 0.5, 0.3) - player.pos.y < 1.2) return;
    player.prone = false; player.proneUpT = 0.35; SFX.step(player.surface);
  } else if (player.onGround && !player.sliding && !(MELEE_P.t > 0)) {
    player.prone = true; player.sprintT = 0; VMS.land = 0.05; G.camShake += 0.012;
    SFX.step(player.surface); setTimeout(() => SFX.step(player.surface), 160);
  }
}

// ---------- close combat: rifle-butt strike (V) and a front kick (F) ----------
const MELEE_P = { t: 0, kind: '', dur: 0, hitAt: 0, hitDone: false, cd: 0 };
function startPlayerMelee(kind) {
  const w = INVENTORY.curW();
  if (MELEE_P.t > 0 || MELEE_P.cd > 0 || player.prone || G.cine || (w && w.reloading) || VMS.equip < 0.85) return;
  if (kind === 'kick' && (!player.onGround || player.sliding)) return;
  Object.assign(MELEE_P, { kind, t: 1e-4, hitDone: false, dur: kind === 'kick' ? 0.78 : kind === 'weapon' ? 0.55 : 0.52, hitAt: kind === 'kick' ? 0.36 : kind === 'weapon' ? 0.22 : 0.17 });
  ads = false; if (w) cancelPendingShot(w);
  const ws = kind === 'weapon' && w && w.def.snd && w.def.snd.swing;
  if (ws) AudioSys.play(ws, { vol: 0.9, rate: rand(0.95, 1.05) }); else AudioSys.noise(0.14, 0.16, kind === 'kick' ? 900 : 1500); // swing
  if (kind === 'kick') KICK_BODY.start();
}
function updatePlayerMelee(dt) {
  MELEE_P.cd = Math.max(0, MELEE_P.cd - dt);
  KICK_BODY.update(dt);
  if (!(MELEE_P.t > 0)) return;
  MELEE_P.t += dt;
  if (!MELEE_P.hitDone && MELEE_P.t >= MELEE_P.hitAt) { MELEE_P.hitDone = true; playerMeleeHit(MELEE_P.kind); }
  if (MELEE_P.t >= MELEE_P.dur) { MELEE_P.t = 0; MELEE_P.cd = 0.2; }
}
// the closest hostile in a cone in front, within reach and in sight
function playerMeleeHit(kind) {
  const reach = kind === 'kick' ? 2.3 : kind === 'weapon' ? 2.7 : 2.5, fx = -Math.sin(player.yaw), fz = -Math.cos(player.yaw);
  const eye = _plV4.set(player.pos.x, player.pos.y + player.eye, player.pos.z);
  let best = null, bd = reach;
  for (const e of enemies) {
    if (e.dead || e.team === 'blue' || e.escort) continue;
    const dx = e.g.position.x - player.pos.x, dz = e.g.position.z - player.pos.z, d = Math.hypot(dx, dz);
    if (d > bd || d < 1e-3 || (dx * fx + dz * fz) / d < 0.72) continue;
    if (Math.abs(e.g.position.y - player.pos.y) > 1.2) continue;
    const c = e.hb.spine1 || _plV3.set(e.g.position.x, e.g.position.y + 1.1, e.g.position.z);
    if (!hasLOS(eye, c)) continue;
    best = e; bd = d;
  }
  if (!best) return;
  const c = (best.hb.spine1 || best.g.position).clone(), dir = new THREE.Vector3(fx, 0, fz);
  const wd = INVENTORY.curW() && INVENTORY.curW().def;
  damageEnemy(best, kind === 'kick' ? 70 : kind === 'weapon' ? (wd && wd.cls === 'melee' ? wd.dmg * 1.4 : 100) : 125, kind === 'kick' ? 'stomach' : 'chest', c, dir, { melee: true });
  if (!best.dead && kind === 'kick') { best.staggerDir = dir; best.stagger = Math.max(best.stagger, 0.6); } // knocked back a step
  const wh = kind === 'weapon' && wd && wd.snd && wd.snd.hit;
  if (wh) AudioSys.play(wh, { vol: 1, rate: rand(0.95, 1.05) }); else SFX.punch();
  G.camShake += 0.035; VMS.kickZ += 0.05;
}
// First-person kick: a soldier body under the camera with everything but the kicking leg folded away plays the Mixamo
// kick, so the boot swings up into view.
const KICK_BODY = {
  S: null, mixer: null, a: null, t: 0, START: 0.12, TS: 1.3,
  build() {
    if (!ASSETS.clips.mmaKick || !ASSETS.models.soldier) return false;
    const S0 = makeSoldier(ENEMY_TYPES.soldier, 'ally', 'blue');
    S0.root.visible = false; scene.add(S0.root);
    S0.clone.traverse(o => { if (o.isMesh) { o.castShadow = false; o.frustumCulled = false; } });
    for (const b of ['Spine', 'RightUpLeg']) if (S0.B[b]) S0.B[b].scale.setScalar(1e-3); // the left leg kicks
    this.S = S0; this.mixer = new THREE.AnimationMixer(S0.clone);
    this.a = this.mixer.clipAction(ASSETS.clips.mmaKick); this.a.setLoop(THREE.LoopOnce, 1); this.a.clampWhenFinished = true;
    return true;
  },
  start() {
    if (!this.S && !this.build()) return;
    this.a.reset(); this.a.timeScale = this.TS; this.a.play(); this.a.time = this.START;
    this.t = 0; this.S.root.visible = true; this.place(); this.mixer.update(0);
  },
  place() {
    const fx = -Math.sin(player.yaw), fz = -Math.cos(player.yaw), r = this.S.root;
    r.position.set(player.pos.x - fx * 0.3, player.pos.y, player.pos.z - fz * 0.3);
    r.rotation.y = player.yaw + Math.PI;
  },
  update(dt) {
    if (!this.S || !this.S.root.visible) return;
    this.t += dt;
    if (this.t > 0.78 || G.dead || player.prone) { this.S.root.visible = false; this.a.stop(); return; }
    this.place(); this.mixer.update(dt);
  }
};
// viewmodel offsets [px, py, pz, rx, ry, rz] for the strike / kick in progress
const _mvm = [0, 0, 0, 0, 0, 0];
function meleeViewPose() {
  _mvm.fill(0);
  if (!(MELEE_P.t > 0)) return _mvm;
  const u = MELEE_P.t / MELEE_P.dur;
  if (MELEE_P.kind === 'weapon') {
    // melee weapon: raised to the right, slashed across to the left, recovered
    const wind = u < 0.32 ? smoothstep(0, 0.32, u) : Math.max(0, 1 - (u - 0.32) / 0.14);
    const hit = u < 0.32 ? 0 : u < 0.5 ? (u - 0.32) / 0.18 : 1 - smoothstep(0.5, 1, u);
    _mvm[0] = 0.07 * wind - 0.18 * hit; _mvm[1] = 0.09 * wind - 0.05 * hit; _mvm[2] = 0.04 * wind - 0.08 * hit;
    _mvm[3] = 0.35 * wind - 0.3 * hit; _mvm[4] = -0.5 * wind + 1.1 * hit; _mvm[5] = 0.9 * wind - 0.7 * hit;
    return _mvm;
  }
  if (MELEE_P.kind === 'butt') {
    // wind up (rifle pulled back and turned), drive the stock forward, recover
    const wind = u < 0.3 ? smoothstep(0, 0.3, u) : Math.max(0, 1 - (u - 0.3) / 0.12);
    const hit = u < 0.3 ? 0 : u < 0.42 ? (u - 0.3) / 0.12 : 1 - smoothstep(0.42, 1, u);
    _mvm[0] = 0.03 * wind - 0.1 * hit; _mvm[1] = 0.01 * wind + 0.04 * hit; _mvm[2] = 0.08 * wind - 0.2 * hit;
    _mvm[3] = 0.12 * wind - 0.2 * hit; _mvm[4] = 0.35 * wind + 0.95 * hit; _mvm[5] = -0.45 * wind - 0.8 * hit;
  } else {
    // kick: rifle swings out of the way and comes back
    const k = Math.sin(Math.min(1, u * 1.15) * Math.PI);
    _mvm[0] = 0.06 * k; _mvm[1] = -0.1 * k; _mvm[3] = -0.25 * k; _mvm[4] = -0.35 * k; _mvm[5] = 0.45 * k;
  }
  return _mvm;
}

function surfaceAt(x, z, y) {
  let best = null, h = -1;
  for (const c of colliders) if (c.move && x > c.x0 && x < c.x1 && z > c.z0 && z < c.z1 && c.y1 <= y + 0.1 && c.y1 > h) { h = c.y1; best = c; }
  return best && h > 0.05 ? best.surface : (WORLD.groundSurface || 'concrete');
}

function damagePlayer(dmg, fromPos) {
  if (G.dead || dmg <= 0 || G.cine) return;
  dmg *= MODE.dmgScale;
  player.hp -= dmg; player.lastDmg = G.time;
  SFX.hurt();
  POST.grade.uniforms.damage.value = Math.min(0.85, POST.grade.uniforms.damage.value + 0.35 + dmg / 80);
  recoilP += 0.012; recoilY += rand(-1, 1) * 0.02; G.camShake += 0.03;
  if (fromPos && S.hitIndicator) showHitIndicator(fromPos);
  if (player.hp <= 0) { player.hp = 0; die(); }
}

function interact() {
  let closest = null, closestD = 2.6;
  for (const p of weaponDrops) {
    const d = Math.hypot(p.mesh.position.x - player.pos.x, p.mesh.position.z - player.pos.z);
    if (d < closestD) { closestD = d; closest = p; }
  }
  if (closest) {
    INVENTORY.pickupWeapon(closest.weaponName, closest.mag, closest.reserve);
    scene.remove(closest.mesh);
    weaponDrops.splice(weaponDrops.indexOf(closest), 1);
    document.getElementById('interactHint').style.display = 'none';
  }
}
