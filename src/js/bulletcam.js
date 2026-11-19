// ---------- Bullet cam, slow-motion kill cam ----------
const CINE = {
  active: false, phase: '', t: 0, dur: 0, shot: null, worldScale: 1, cool: 0, kcool: 0, ringT: 0, style: 'orbit', fov0: 50,
  bullet: null, streak: null, side: new THREE.Vector3(), up: new THREE.Vector3(), orbit: 0, flash: 0, skipReq: false,

  // Bullet cam on a good share of kill shots at range: likelier for headshots, aimed shots, snipers and long
  // shots, always for the last enemy of a wave. A short cooldown keeps it regular without taking over.
  shouldTrigger(w, res, dist) {
    if (!S.killCam || this.active || this.cool > 0 || G.dead || !res.enemy) return false;
    const d = w.def, head = res.zone === 'head', aimed = adsT > 0.7;
    const precision = d.cls === 'sniper' || d.cls === 'dmr';
    if (MODE.isLastEnemy() && dist > 8) return true;
    if (dist < 9) return false;
    let p = 0.16;
    if (aimed) p += 0.14; if (head) p += 0.3; if (precision) p += 0.35; if (dist > 30) p += 0.15;
    return Math.random() < Math.min(0.9, p);
  },
  // Kill cam without the bullet ride: the camera cuts to the falling soldier in slow motion from a dramatic angle.
  maybeKillCam(w, kill, from) {
    if (!S.killCam || this.active || this.cool > 0 || this.kcool > 0 || G.dead || !kill || kill.dist < 5) return false;
    if (Math.random() > (kill.zone === 'head' ? 0.5 : 0.3)) return false;
    const dir = _cV1.subVectors(kill.point, from).normalize().clone();
    this.shot = { enemy: kill.enemy, zone: kill.zone, point: kill.point.clone(), dir, dist: kill.dist, from: from.clone(), weapon: w.name };
    this.active = true; G.cine = true; this.skipReq = false; mouseFire = false;
    this.side.crossVectors(dir, WUP); if (this.side.lengthSq() < 1e-6) this.side.set(1, 0, 0); this.side.normalize();
    this.up.crossVectors(this.side, dir).normalize();
    document.getElementById('scope').classList.remove('on'); document.getElementById('reddot').classList.remove('on');
    activeCamera = cineCamera; cineCamera.fov = 48; cineCamera.updateProjectionMatrix();
    document.body.classList.add('cine');
    document.getElementById('kcTitle').textContent = kill.zone === 'head' ? 'HEADSHOT' : 'KILL CAM';
    this.subText = Math.round(kill.dist) + ' M  ·  ' + (WEAPON_DEFS[w.name] ? WEAPON_DEFS[w.name].label : w.name);
    document.getElementById('killcam').classList.remove('show');
    SFX.bulletTimeIn(); AudioSys.tone(60, 1.1, 0.25, 'sine', 32);
    this.beginKillPhase(1.7);
    const c = this.shot.enemy.hb.spine1 || this.shot.enemy.g.position;
    this.placeKillCam(c, 0, true);
    shockwave(kill.point, 0.02); POST.grade.uniforms.flash.value = Math.max(POST.grade.uniforms.flash.value, 0.2);
    return true;
  },
  // kill phase camera styles: orbit around the body, low angle looking up, side dolly with a slow zoom, or a
  // reverse shot from in front of the soldier back toward the shooter
  // the original four (orbit, low, side, front) and three cinematic cams: SWEEP (bullet-time arc with a dolly zoom
  // around a near-frozen moment), CRANE (rises from the ground up and over the body to a top-down shot) and
  // HANDHELD (a close tracking shot with real camera shake, a push-in and a slow-fast-slow speed ramp).
  // BLAST is the wide orbit around a grenade / rocket multi-kill (blastCam).
  STYLES: { orbit: 1, low: 1, side: 1, front: 1, sweep: 1.4, crane: 1.4, handheld: 1.4 },
  STYLE_LABEL: { orbit: 'ORBIT CAM', low: 'LOW ANGLE', side: 'DOLLY CAM', front: 'REVERSE SHOT', sweep: 'BULLET-TIME SWEEP', crane: 'CRANE CAM', handheld: 'ACTION CAM', blast: 'BLAST CAM' },
  STYLE_DUR: { sweep: 2.5, crane: 2.6, handheld: 2.1, blast: 3.0 },
  pickStyle() {
    let tot = 0; for (const k in this.STYLES) if (k !== this.lastStyle) tot += this.STYLES[k];
    let x = Math.random() * tot;
    for (const k in this.STYLES) { if (k === this.lastStyle) continue; x -= this.STYLES[k]; if (x <= 0) return k; }
    return 'orbit';
  },
  beginKillPhase(dur, style) {
    this.phase = 'kill'; this.t = 0; this.orbit = 0;
    this.style = style || this.forceStyle || this.pickStyle(); this.lastStyle = this.style;
    this.dur = this.STYLE_DUR[this.style] || dur;
    const c = this.shot.blast ? this.shot.point : this.shot.enemy.g.position, s = this.shot;
    this.baseAng = Math.atan2(s.from.x - c.x, s.from.z - c.z) + (Math.random() < 0.5 ? 1 : -1) * Math.PI * 0.55;
    this.sweepDir = Math.random() < 0.5 ? 1 : -1;
    this.fov0 = cineCamera.fov; this.shake = 0; this.seed = Math.random() * 100;
    const sub = document.getElementById('kcSub'); if (sub) sub.textContent = (this.STYLE_LABEL[this.style] || 'KILL CAM') + '  ·  ' + (this.subText || '');
  },
  // world time scale of the kill phase: every style has its own speed ramp
  killScale(u) {
    switch (this.style) {
      case 'sweep': return u < 0.72 ? 0.012 : lerp(0.012, 0.32, smoothstep(0.72, 1, u));
      case 'crane': return u < 0.1 ? 0.05 : lerp(0.08, 0.24, u);
      case 'handheld': return u < 0.14 ? lerp(0.4, 0.05, u / 0.14) : u < 0.62 ? 0.05 : lerp(0.05, 0.36, smoothstep(0.62, 1, u));
      case 'blast': return u < 0.08 ? 0.03 : lerp(0.09, 0.3, smoothstep(0.08, 1, u));
      default: return u < 0.15 ? 0.05 : lerp(0.14, 0.32, u);
    }
  },
  // keep the lens on the subject's side of any wall: pulled in to just in front of the first obstacle
  clearCam(c, want) {
    const d = _cV5.subVectors(want, c), L = d.length(); if (L < 0.3) return;
    d.multiplyScalar(1 / L);
    const h = rayWorld(c, d, L + 0.3, 'shot');
    if (h && h.t < L + 0.3) want.copy(c).addScaledVector(d, Math.max(0.55, h.t - 0.4));
    const g = typeof groundHeightAt === 'function' ? groundHeightAt(want.x, want.z, want.y, 0.05, 0.5) : 0;
    if (want.y < g + 0.18) want.y = g + 0.18;
  },
  // the most open direction around a point (for the wide blast orbit)
  openAngle(c, r, h, prefer) {
    let best = prefer, bestS = -1;
    for (let k = 0; k < 16; k++) {
      const a = prefer + k / 16 * Math.PI * 2, d = _cV5.set(Math.sin(a), h / r, Math.cos(a)).normalize();
      const hit = rayWorld(_cV4.copy(c), d, r * 1.4, 'shot'), free = hit ? hit.t : r * 1.4;
      const sc = Math.min(free, r * 1.4) - (k > 8 ? 16 - k : k) * 0.15;   // ties go to the player's side
      if (sc > bestS) { bestS = sc; best = a; }
    }
    return best;
  },
  // handheld noise (three octaves, smooth): the camera operator's breathing and footwork
  hand(t, k) { const s = this.seed || 0; return Math.sin(t * 1.9 + s + k) * 0.6 + Math.sin(t * 3.7 + s * 1.7 + k * 2.1) * 0.28 + Math.sin(t * 7.3 + s * 0.6 + k * 3.3) * 0.12; },
  placeKillCam(c, u, snap, dtR) {
    const s = this.shot, dir = s.dir;
    const want = _cV2, look = _cV4.copy(c);
    let rate = 9, fov = null;
    if (this.style === 'sweep') {
      // ~200 degree arc at chest height; the camera pulls back while the lens narrows (vertigo / dolly zoom)
      const e = smoothstep(0, 1, u), a = this.baseAng + this.sweepDir * e * 3.5, r = lerp(2.0, 4.4, e);
      want.set(c.x + Math.sin(a) * r, c.y + 0.25 + Math.sin(e * Math.PI) * 0.35, c.z + Math.cos(a) * r);
      fov = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(62) / 2) * 2.0 / r) * 180 / Math.PI;
      rate = 30;
    } else if (this.style === 'crane') {
      // from ground level beside the body up over it, ending almost straight down on the fall
      const e = smoothstep(0, 1, u), a = this.baseAng + e * 0.9, r = lerp(3.2, 1.2, e), h = lerp(0.2, 6.5, e * e * (3 - 2 * e));
      want.set(c.x + Math.sin(a) * r, Math.max(c.y - 0.9, 0.15) + h, c.z + Math.cos(a) * r);
      look.y -= e * 0.5; fov = lerp(58, 44, e); rate = 7;
    } else if (this.style === 'handheld') {
      // close on the soldier's side, tracking with the fall, a fast push-in at the start
      want.copy(c).addScaledVector(this.side, 3.0 - smoothstep(0, 0.25, u) * 0.6).addScaledVector(dir, lerp(-1.0, 0.5, u)); want.y = c.y + 0.4;
      look.y += 0.12; fov = lerp(62, 44, smoothstep(0, 0.22, u)) + smoothstep(0.7, 1, u) * 6; rate = 12;
      this.shake = 0.06 * (1 - smoothstep(0.75, 1, u) * 0.5);
    } else if (this.style === 'blast') {
      // wide, low orbit around the blast: the fireball, the column and the soldiers thrown clear
      const pw = s.power || 1, a = this.baseAng + u * 0.95, r = lerp(9, 13, u) * Math.min(1.5, pw);
      want.set(c.x + Math.sin(a) * r, c.y + lerp(1.2, 3.6, u), c.z + Math.cos(a) * r);
      look.y = c.y + lerp(1.4, 3.6, u); fov = lerp(64, 54, u); rate = 5;
      this.shake = 0.05 * (1 - u);
    } else if (this.style === 'low') {
      const a = this.baseAng + u * 0.4, r = 2.4 - u * 0.5;
      want.set(c.x + Math.sin(a) * r, Math.max(c.y - 0.75, 0.25), c.z + Math.cos(a) * r);
    } else if (this.style === 'side') {
      want.copy(c).addScaledVector(this.side, 3.2).addScaledVector(dir, (u - 0.5) * 2.2); want.y = c.y + 0.25;
      cineCamera.fov = lerp(this.fov0, 32, smoothstep(0, 1, u)); cineCamera.updateProjectionMatrix();
    } else if (this.style === 'front') {
      want.copy(c).addScaledVector(dir, 2.6 + u * 0.8).addScaledVector(this.side, 0.6); want.y = c.y + 0.45;
    } else {
      const a = this.baseAng + this.orbit, r = 2.3 - u * 0.3;
      want.set(c.x + Math.sin(a) * r, c.y + 0.35 + u * 0.25, c.z + Math.cos(a) * r);
    }
    this.clearCam(c, want);
    // frame-rate independent smoothing (snapped on the first frame); the original styles keep their old pace
    if (snap || !dtR) cineCamera.position.copy(want);
    else { const k = 1 - Math.exp(-rate * dtR); cineCamera.position.lerp(want, k); }
    if (fov !== null) { cineCamera.fov = fov; cineCamera.updateProjectionMatrix(); }
    cineCamera.lookAt(look);
    // handheld: small rotations of the lens, never of the subject
    const sh = (this.shake || 0) + 0.008, t = this.t;
    cineCamera.rotateX(this.hand(t, 0) * sh * 0.35); cineCamera.rotateY(this.hand(t, 5) * sh * 0.45); cineCamera.rotateZ(this.hand(t, 9) * sh * 0.3);
  },

  start(shot) {
    this.active = true; G.cine = true; this.shot = shot; this.phase = 'bullet'; this.t = 0;
    this.dur = clamp(shot.dist / 24, 1.0, 2.6);
    this.worldScale = 0.015; this.skipReq = false; this.ringT = 0;
    mouseFire = false;
    const dir = shot.dir;
    this.side.crossVectors(dir, WUP); if (this.side.lengthSq() < 1e-6) this.side.set(1, 0, 0); this.side.normalize();
    this.up.crossVectors(this.side, dir).normalize();
    // bullet model: copper jacket + pointed tip, scaled up for readability
    const b = new THREE.Group();
    const jacket = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.05, 16), new THREE.MeshStandardMaterial({ color: 0xc8733a, metalness: 1, roughness: 0.22, envMapIntensity: 1.4 }));
    jacket.rotation.x = Math.PI / 2;
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.011, 0.035, 16), jacket.material); tip.rotation.x = -Math.PI / 2; tip.position.z = -0.042;
    b.add(jacket); b.add(tip);
    b.scale.setScalar(1.8);
    b.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), dir);
    document.getElementById('scope').classList.remove('on'); document.getElementById('reddot').classList.remove('on');
    b.position.copy(shot.from);
    scene.add(b); this.bullet = b;
    // hot streak behind the bullet
    this.streak = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.012, 1, 8, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffb070).multiplyScalar(1.2), transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    this.streak.geometry.translate(0, 0.5, 0);
    scene.add(this.streak);
    activeCamera = cineCamera; cineCamera.fov = 50; cineCamera.updateProjectionMatrix();
    cineCamera.position.copy(shot.from).addScaledVector(dir, -0.5).addScaledVector(this.side, 0.15);
    cineCamera.lookAt(shot.point);
    document.body.classList.add('cine');
    const kc = document.getElementById('killcam');
    document.getElementById('kcTitle').textContent = shot.zone === 'head' ? 'HEADSHOT' : 'BULLET CAM';
    this.subText = Math.round(shot.dist) + ' M  ·  ' + (WEAPON_DEFS[shot.weapon] ? WEAPON_DEFS[shot.weapon].label : shot.weapon);
    document.getElementById('kcSub').textContent = this.subText;
    kc.classList.remove('show');
    SFX.bulletTimeIn(); SFX.breathIn();
    AudioSys.tone(70, 1.4, 0.25, 'sine', 40);
  },

  // BLAST CAM: a grenade or launcher round of the player's killed two or more soldiers - a wide slow-motion orbit
  // around the fireball while the bodies are thrown clear
  blastCam(pos, killed, power) {
    if (!S.killCam || this.active || this.cool > 0 || G.dead || !killed || killed.length < 2) return false;
    camera.updateMatrixWorld(true);
    const from = camera.getWorldPosition(new THREE.Vector3()), dir = _cV1.subVectors(pos, from).setY(0);
    if (dir.lengthSq() < 1e-4) dir.set(0, 0, -1);
    dir.normalize();
    this.shot = { blast: true, enemy: killed[0], point: pos.clone(), dir: dir.clone(), dist: from.distanceTo(pos), from, power: power || 1, weapon: INVENTORY.curW() ? INVENTORY.curW().name : '' };
    this.active = true; G.cine = true; this.skipReq = false; mouseFire = false;
    this.side.crossVectors(this.shot.dir, WUP).normalize(); this.up.crossVectors(this.side, this.shot.dir).normalize();
    document.getElementById('scope').classList.remove('on'); document.getElementById('reddot').classList.remove('on');
    activeCamera = cineCamera; cineCamera.fov = 64; cineCamera.updateProjectionMatrix();
    document.body.classList.add('cine');
    document.getElementById('kcTitle').textContent = killed.length >= 4 ? 'MASSACRE' : killed.length === 3 ? 'TRIPLE KILL' : 'DOUBLE KILL';
    this.subText = killed.length + ' KILLS  ·  ' + Math.round(this.shot.dist) + ' M';
    document.getElementById('killcam').classList.remove('show');
    SFX.bulletTimeIn(); AudioSys.tone(42, 1.6, 0.3, 'sine', 24);
    this.beginKillPhase(3, 'blast');
    const pc = new THREE.Vector3(pos.x, pos.y + 1.4, pos.z);
    this.baseAng = this.openAngle(pc, 11 * Math.min(1.5, power || 1), 2.2, Math.atan2(from.x - pos.x, from.z - pos.z)) - 0.45;
    this.placeKillCam(pc, 0, true);
    return true;
  },

  skip() { if (this.active && this.t > 0.25) this.skipReq = true; },

  update(dtR) {
    if (this.cool > 0) this.cool -= dtR;
    if (this.kcool > 0) this.kcool -= dtR;
    if (!this.active) return;
    this.t += dtR;
    const s = this.shot, dir = s.dir;
    const U = POST.grade.uniforms;
    U.letterbox.value = damp(U.letterbox.value, 1, 6, dtR);

    if (this.phase === 'bullet') {
      if (this.skipReq) this.t = this.dur;
      const u = Math.min(1, this.t / this.dur);
      const k = u < 0.8 ? u / 0.8 * 0.93 : 0.93 + (u - 0.8) / 0.2 * 0.07;
      const bp = _cV1.copy(s.from).lerp(s.point, k);
      this.bullet.position.copy(bp);
      this.bullet.rotateOnWorldAxis(dir, dtR * 18);
      // streak
      const back = Math.min(0.3, bp.distanceTo(s.from));
      this.streak.position.copy(bp).addScaledVector(dir, -back);
      this.streak.quaternion.setFromUnitVectors(WUP, dir);
      this.streak.scale.set(1, back, 1);
      // air distortion rings
      this.ringT -= dtR;
      if (this.ringT <= 0) {
        this.ringT = 0.045;
        const r = fxSprite('smoke', 0xd8e0ea, 0.06, bp.clone().addScaledVector(dir, -0.08), { opacity: 0.22 });
        addParticle(r, 0.9, 'trail', { real: true, op: 0.22 });
      }
      // insane speed streaks + afterimages while riding the bullet
      MFX.radial += 0.045 * (1 - smoothstep(0.85, 1, u)); MFX.ghost = Math.max(MFX.ghost, 0.32);
      // camera: chase + slow roll around the bullet, then swing beside the target
      const a = u * 2.4;
      const off = _cV2.copy(this.side).multiplyScalar(Math.cos(a) * 0.17).addScaledVector(this.up, Math.sin(a) * 0.12 + 0.03);
      const chase = _cV3.copy(bp).addScaledVector(dir, -0.42 - u * 0.15).add(off);
      if (u > 0.82) {
        const tgt = s.enemy.hb.headC || s.point;
        const side = _cV4.copy(s.point).addScaledVector(this.side, 1.6).addScaledVector(dir, -1.1).add(new THREE.Vector3(0, 0.25, 0));
        const m = smoothstep(0.82, 1, u);
        cineCamera.position.lerpVectors(chase, side, m);
        cineCamera.lookAt(_cV5.copy(bp).addScaledVector(dir, 1.5).lerp(tgt, m));
      } else {
        cineCamera.position.copy(chase);
        cineCamera.lookAt(_cV5.copy(bp).addScaledVector(dir, 1.5));
      }
      MFX.dof = Math.max(MFX.dof, 0.6); MFX.focus = cineCamera.position.distanceTo(bp) + 0.3;
      if (u >= 1) this.impact();
    } else if (this.phase === 'kill') {
      if (this.skipReq && this.t > 0.2) this.t = this.dur;
      const u = Math.min(1, this.t / this.dur);
      this.worldScale = this.killScale(u);
      const e = s.enemy;
      const c = s.blast ? _cV1.copy(s.point).add(_cV3.set(0, 1.4, 0)) : _cV1.copy(e.hb.spine1 || e.g.position).add(_cV3.set(0, 0.1, 0));
      this.orbit += dtR * 0.55;
      this.placeKillCam(c, u, false, dtR);
      MFX.ghost = Math.max(MFX.ghost, (this.style === 'sweep' ? 0.62 : 0.5) * (1 - u));
      if (this.style === 'handheld' && u < 0.2) MFX.radial += 0.03 * (1 - u / 0.2);
      // rack focus: the lens pulls from the foreground onto the soldier in the first third of a second
      const fd = cineCamera.position.distanceTo(c);
      MFX.dof = Math.max(MFX.dof, s.blast ? 0.45 : 0.85); MFX.focus = lerp(fd * 0.35, fd, smoothstep(0, 0.14, u));
      if (u > 0.3) document.getElementById('killcam').classList.add('show');
      if (u >= 1) this.end();
    }
  },

  impact() {
    const s = this.shot;
    scene.remove(this.bullet); scene.remove(this.streak);
    this.bullet = null;
    damageEnemy(s.enemy, s.dmg, s.zone, s.point, s.dir);
    G.hits += 0; // counted in damageEnemy
    spawnBlood(s.point, s.dir, 1.3);
    if (s.zone === 'head') spawnBlood(s.point.clone().addScaledVector(s.dir, 0.15), s.dir, 0.8);
    AudioSys.tone(55, 1.2, 0.35, 'sine', 30);
    AudioSys.play('hit_head', { vol: 1, rate: 0.6, reverb: 0.6 });
    this.beginKillPhase(2.1);
    POST.grade.uniforms.flash.value = 0.35;
    shockwave(s.point, 0.03);
  },

  end() {
    this.active = false; G.cine = false; this.phase = '';
    if (this.bullet) { scene.remove(this.bullet); scene.remove(this.streak); this.bullet = null; }
    activeCamera = camera;
    this.worldScale = 1; this.cool = 4; this.kcool = 6;
    document.body.classList.remove('cine');
    document.getElementById('killcam').classList.remove('show');
    POST.grade.uniforms.flash.value = 0.5;
    SFX.bulletTimeOut(); SFX.breathOut();
    // a scoped rifle still held on aim goes straight back into the scope (the zoom only drops on reload / release)
    if (!(ads && typeof isScoped === 'function' && isScoped(INVENTORY.curW()))) { adsT = 0; ads = false; }
  }
};
const _cV1 = new THREE.Vector3(), _cV2 = new THREE.Vector3(), _cV3 = new THREE.Vector3(), _cV4 = new THREE.Vector3(), _cV5 = new THREE.Vector3();

// ---------- slow motion on precision kills ----------
// Levels: 1 short dip, 2 precision kill, 3 insane (near freeze, afterimages, letterbox, shockwave).
// Time curve: a hit-stop freeze, a hold at the level's time scale, then an eased speed ramp back to real time.
// The player keeps moving and aiming in real time (bullet time); the world, enemies and effects slow down.
const SLOWMO = {
  active: false, t: 0, level: 0, L: null, endT: -99, focus: new THREE.Vector3(), kills: [],
  LEVELS: [null,
    { scale: 0.24, dur: 0.85, freeze: 0.06, grade: 0.55, ghost: 0.32, radial: 0.02, fov: 3.5, wave: 0.011, dof: 0.35, label: 'KILL' },
    { scale: 0.12, dur: 1.35, freeze: 0.09, grade: 0.8, ghost: 0.46, radial: 0.03, fov: 6, wave: 0.016, dof: 0.6, letterbox: 0.3, label: 'PRECISION KILL' },
    { scale: 0.04, dur: 2.1, freeze: 0.13, grade: 1.0, ghost: 0.6, radial: 0.046, fov: 10, wave: 0.024, dof: 0.85, letterbox: 0.6, label: 'INSANE KILL' }],

  // scores the kills of one trigger pull; returns true if slow motion started
  evaluate(w, kills, from) {
    if (!kills.length || !S.slowmoKills) return false;
    const d = w.def, aimed = adsT > 0.75, now = G.time;
    let best = -1, k0 = kills[0];
    for (const k of kills) {
      let s = 0;
      if (k.zone === 'head') s += 2;
      if (k.dist >= 22) s += 1;
      if (k.dist >= 45) s += 1;
      if (aimed) s += 1;
      if (d.cls === 'sniper' || d.cls === 'dmr') s += 1;
      if ((d.cls === 'pistol' || d.cls === 'shotgun') && k.zone === 'head') s += 1;
      if (!player.onGround || player.sliding) s += 1;
      if (s > best) { best = s; k0 = k; }
    }
    let label = '';
    this.kills = this.kills.filter(t => now - t < 3); for (const k of kills) this.kills.push(now);
    if (kills.length >= 2) { best += 3; label = kills.length >= 3 ? 'TRIPLE COLLATERAL' : 'COLLATERAL'; }
    else if (this.kills.length >= 3) { best += 2; label = this.kills.length >= 4 ? 'RAMPAGE' : 'TRIPLE KILL'; }
    if (MODE.id === 'endless' && ENDLESS.state === 'active' && !ENDLESS.queue.length && aliveTeam('red') === 0) { best += 2; label = label || 'WAVE FINISHER'; }
    if (!label) label = k0.zone === 'head' ? (k0.dist >= 45 ? 'LONG SHOT HEADSHOT' : 'HEADSHOT') : (k0.dist >= 45 ? 'LONG SHOT' : (!player.onGround ? 'AIRBORNE KILL' : ''));
    // every kill slows time a little; headshots, aimed long shots and multi-kills go deeper
    const level = best >= 5 ? 3 : best >= 3 ? 2 : 1;
    return this.trigger(level, label, k0.point, from);
  },
  trigger(level, label, focus, from) {
    if (!S.slowmoKills || G.cine || G.dead || !level) return false;
    const since = G.time - this.endT;
    if (this.active) {
      if (level <= this.level) { this.t = Math.min(this.t, this.L.freeze + 0.05); this.tag(label, this.level); return true; } // extend
    } else if ((level === 1 && since < 1.0) || (level === 2 && since < 0.5)) return false; // no chains during full-auto sprays
    this.active = true; this.t = 0; this.level = level; this.L = this.LEVELS[level];
    this.focus.copy(focus);
    if (level >= 2) SFX.bulletTimeIn();
    AudioSys.tone(46 + level * 4, 0.8 + level * 0.35, 0.2 + level * 0.08, 'sine', 24); // sub-bass drop
    if (level === 3) { SFX.heartbeat(); POST.grade.uniforms.flash.value = Math.max(POST.grade.uniforms.flash.value, 0.18); }
    shockwave(focus, this.L.wave);
    if (from) vaporTrail(from, focus, level);
    if (level >= 2) spawnBlood(focus, null, 0.6 + level * 0.3);
    if (label || level >= 2) this.tag(label, level);
    return true;
  },
  tag(label, level) {
    const el = document.getElementById('slowmoTag');
    el.querySelector('b').textContent = (label || this.LEVELS[level].label).toUpperCase();
    el.querySelector('span').textContent = '×' + this.LEVELS[level].scale.toFixed(2) + ' SPEED';
    el.className = 'lv' + level; void el.offsetWidth; el.classList.add('show');
  },
  // 0..1 strength of the visual treatment (fades out during the speed ramp)
  env() { if (!this.active) return 0; const out = 0.42; return clamp((this.L.dur - this.t) / out, 0, 1); },
  scale() {
    const L = this.L, t = this.t, out = 0.42;
    if (t < L.freeze) return 0.02;
    if (t < L.dur - out) return L.scale;
    const u = clamp((t - (L.dur - out)) / out, 0, 1);
    return lerp(L.scale, 1, u * u);
  },
  grade() { return this.active ? this.L.grade * Math.max(0.35, this.env()) : 0; },
  letterbox() { return this.active && this.L.letterbox ? this.L.letterbox * this.env() : 0; },
  fovKick() { return this.active ? this.L.fov * this.env() * smoothstep(0, 0.12, this.t) : 0; },
  update(dtR) {
    if (!this.active) return;
    if (G.cine || G.dead || !G.playing) { this.end(true); return; }
    this.t += dtR;
    const e = this.env(), L = this.L;
    MFX.ghost = Math.max(MFX.ghost, L.ghost * e);
    MFX.radial += L.radial * e;
    // depth of field on the kill: the soldier stays sharp, the background melts away
    MFX.dof = Math.max(MFX.dof, L.dof * e); MFX.focus = activeCamera.position.distanceTo(this.focus);
    const p = MFX.v.copy(this.focus).project(activeCamera); // streaks converge on the kill
    if (p.z < 1) MFX.radialC.set(clamp(p.x * 0.5 + 0.5, 0.1, 0.9), clamp(p.y * 0.5 + 0.5, 0.1, 0.9));
    if (this.t >= L.dur) this.end();
  },
  end(silent) {
    if (!this.active) return;
    this.active = false; this.endT = G.time;
    if (!silent) { SFX.bulletTimeOut(); AudioSys.noise(0.45, 0.16, 1400); }
    document.getElementById('slowmoTag').classList.remove('show');
  },
  reset() { this.active = false; this.endT = -99; this.kills.length = 0; document.getElementById('slowmoTag').classList.remove('show'); }
};

// bullet vapour trail hanging in the air along the shot (world time: it lingers through the slow motion)
const _vtGeo = new THREE.CylinderGeometry(1, 1, 1, 6, 1, true); _vtGeo.translate(0, 0.5, 0);
function vaporTrail(from, to, level) {
  const d = _cV1.subVectors(to, from), len = d.length();
  if (len < 1.5) return;
  const m = new THREE.Mesh(_vtGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(0xdfe8ff).multiplyScalar(1.3), transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  const r = 0.005 + level * 0.002;
  m.position.copy(from); m.quaternion.setFromUnitVectors(WUP, d.normalize()); m.scale.set(r, len, r); m.frustumCulled = false;
  scene.add(m); addParticle(m, 2.4, 'fade', { op: 0.5 });
  const n = Math.min(22, Math.floor(len / 1.4));
  for (let i = 1; i <= n; i++) {
    const s = fxSprite('smoke', 0xe8eef8, 0.07, _cV2.copy(from).lerp(to, i / (n + 1)), { opacity: 0.25 });
    addParticle(s, rand(1.2, 2.2), 'trail', { op: 0.25 });
  }
}
