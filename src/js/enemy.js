// ---------- AI soldiers: Mixamo + NVIDIA Kimodo animation, IK rifle hold, bone hitboxes, team-based tactical AI ----------
// Every AI agent lives in `enemies`. `team` is 'red' (hostile) or 'blue' (the player's squad in Team Deathmatch).
// Agents pick the nearest opposing target (the player counts as blue), so the same AI fights for either side.
const ENEMY_TYPES = {
  soldier:  { hp: 110, speed: 3.6, dmg: 11, weapon: 'AK47', range: 40, engage: 24, burst: [3, 5], burstGap: 0.11, pause: [0.9, 1.8], acc: 1.0, grenade: true, mag: 30, reload: 2.3, label: 'RIFLEMAN' },
  rifleman: { hp: 120, speed: 3.8, dmg: 10, weapon: 'M4A1', range: 44, engage: 26, burst: [3, 6], burstGap: 0.09, pause: [0.8, 1.6], acc: 1.1, grenade: true, mag: 30, reload: 2.2, label: 'OPERATOR' },
  rusher:   { hp: 95, speed: 5.0, dmg: 26, weapon: 'PumpShotgun', range: 13, engage: 8, burst: [1, 1], burstGap: 0, pause: [0.9, 1.3], acc: 1.25, shotgun: true, mag: 6, reload: 2.8, label: 'BREACHER' },
  heavy:    { hp: 270, speed: 2.7, dmg: 9, weapon: 'LMG', range: 42, engage: 28, burst: [7, 12], burstGap: 0.085, pause: [1.2, 2.0], acc: 0.85, helmet: true, scale: 1.07, armor: 0.75, mag: 100, reload: 3.4, label: 'HEAVY' },
  sniper:   { hp: 90, speed: 3.2, dmg: 36, weapon: 'M24', range: 90, engage: 75, burst: [1, 1], burstGap: 0, pause: [2.8, 4.2], acc: 1.55, sniper: true, mag: 5, reload: 2.9, label: 'SNIPER' },
  officer:  { hp: 320, speed: 3.4, dmg: 14, weapon: 'ScarL', range: 46, engage: 26, burst: [3, 5], burstGap: 0.1, pause: [0.9, 1.6], acc: 1.15, grenade: true, helmet: true, armor: 0.8, mag: 30, reload: 2.2, label: 'COMMANDER' }
};
// Uniform colours: the map theme sets the camouflage brightness, the team sets the colour - hostiles wear red,
// the player's squad blue, so friend and foe read at a glance. The face material is never tinted.
const THEME_TINT = {
  urban: [0.95, 0.97, 1.0], desert: [1.15, 1.07, 0.94], arctic: [1.35, 1.38, 1.42], woodland: [0.95, 1.04, 0.9],
  night: [0.82, 0.84, 0.9], jungle: [0.92, 1.04, 0.88], ally: [0.9, 0.95, 1.0], officer: [0.62, 0.58, 0.56]
};
// Uniforms keep their natural camouflage (the map theme only nudges it); teams are told apart by the arrows
// over their heads. The face material is never tinted.
const FACE_MATERIAL = 'blinn3.001';
const _tintCache = {};
function themedMaterial(m, theme, team) {
  const key = m.uuid + theme;
  if (_tintCache[key]) return _tintCache[key];
  const c = m.clone();
  if (m.name !== FACE_MATERIAL) {
    const t = THEME_TINT[theme] || THEME_TINT.urban;
    c.color = m.color.clone().multiply(new THREE.Color(t[0], t[1], t[2])).multiplyScalar(1.15);
  }
  c.envMapIntensity = 0.45;
  // The soldier albedo maps are authored very dark (~3% reflectance, reads as charcoal in daylight): lift them into
  // the range of real fabric and webbing (10-15%) with a soft curve that keeps highlights below 1.
  c.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', THREE.ShaderChunk.map_fragment
      .replace('diffuseColor *= texelColor;', 'texelColor.rgb = texelColor.rgb * 6.0 / (1.0 + texelColor.rgb * 5.0);\n\tdiffuseColor *= texelColor;'));
  };
  c.customProgramCacheKey = () => 'soldierLift';
  return (_tintCache[key] = c);
}
const helmetMat = new THREE.MeshStandardMaterial({ color: 0x3a4030, roughness: 0.55, metalness: 0.35 });

let squadSeq = 0;
const BLOB_GEO = new THREE.PlaneGeometry(1.1, 1.1);
let BLOB_MAT = null;
function blobMat() {
  return BLOB_MAT || (BLOB_MAT = new THREE.MeshBasicMaterial({ map: radialTex('aoBlob', 'rgba(255,255,255,0.8)', 'rgba(255,255,255,0)'), color: 0x000000, transparent: true, opacity: 0.7, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 }));
}
// Team markers: a big downward arrow over every soldier, constant size on screen (a little smaller far off). Allies (blue)
// show through walls so the squad can be tracked; hostiles (red) only where they are actually in view.
const MARKER_MATS = {};
function markerMat(team) {
  if (MARKER_MATS[team]) return MARKER_MATS[team];
  const col = team === 'blue' ? '#3aa8ff' : '#ff2a20', hi = team === 'blue' ? '#a8dcff' : '#ff9a8a';
  return (MARKER_MATS[team] = new THREE.SpriteMaterial({
    map: canvasTex('arrow_' + team, 128, 128, (x) => {
      const arrow = () => { x.beginPath(); x.moveTo(44, 10); x.lineTo(84, 10); x.lineTo(84, 52); x.lineTo(112, 52); x.lineTo(64, 118); x.lineTo(16, 52); x.lineTo(44, 52); x.closePath(); };
      x.lineJoin = 'round';
      arrow(); x.strokeStyle = 'rgba(0,0,0,0.9)'; x.lineWidth = 12; x.stroke();      // dark outline: reads on sky and snow
      const g = x.createLinearGradient(0, 10, 0, 118); g.addColorStop(0, hi); g.addColorStop(0.45, col); g.addColorStop(1, col);
      arrow(); x.fillStyle = g; x.fill();
      arrow(); x.strokeStyle = 'rgba(255,255,255,0.55)'; x.lineWidth = 3; x.stroke();
    }),
    depthTest: team !== 'blue', depthWrite: false, transparent: true, sizeAttenuation: false, toneMapped: false, fog: false
  }));
}
// per-frame budget helpers
const _frus = new THREE.Frustum(), _frusM = new THREE.Matrix4(), _sph = new THREE.Sphere(new THREE.Vector3(), 1.4);
let ENEMY_FRAME = 0;
const PATH_BUDGET = { left: 2 };
const clipSpeed = (n) => (ASSETS.clipSpeed && ASSETS.clipSpeed[n]) || 3;

// ---------- IK helpers ----------
const _q1 = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _qd = new THREE.Quaternion();
const _a1 = new THREE.Vector3(), _a2 = new THREE.Vector3(), _a3 = new THREE.Vector3();
const _i1 = new THREE.Vector3(), _i2 = new THREE.Vector3(), _i3 = new THREE.Vector3(), _i4 = new THREE.Vector3(), _i5 = new THREE.Vector3(), _i6 = new THREE.Vector3(), _i7 = new THREE.Vector3();
const WUP = new THREE.Vector3(0, 1, 0);
function bonePos(b, out) { return out.setFromMatrixPosition(b.matrixWorld); }
// The IK works on the matrices produced by one hierarchy update after the mixer. A rotation only refreshes
// the matrices the next step reads (the bone and the listed chain), never whole sub-trees: the renderer
// recomputes every matrix once per frame anyway.
const _mR = new THREE.Matrix4();
function worldQuat(o, out) { return out.setFromRotationMatrix(_mR.extractRotation(o.matrixWorld)); }
function refresh(b) { b.updateMatrix(); b.matrixWorld.multiplyMatrices(b.parent.matrixWorld, b.matrix); }
function rotateBoneWorld(bone, qDelta, chain) {
  worldQuat(bone, _q1).premultiply(qDelta);
  worldQuat(bone.parent, _q2).invert();
  bone.quaternion.copy(_q2.multiply(_q1));
  refresh(bone);
  if (chain) for (const c of chain) c.matrixWorld.multiplyMatrices(c.parent.matrixWorld, c.matrix);
}
function aimBone(bone, childPos, target, weight = 1, chain) {
  const bp = bonePos(bone, _a1);
  _a2.subVectors(childPos, bp); _a3.subVectors(target, bp);
  if (_a2.lengthSq() < 1e-10 || _a3.lengthSq() < 1e-10) return;
  _qd.setFromUnitVectors(_a2.normalize(), _a3.normalize());
  if (weight < 1) _qd.slerp(_q2.identity(), 1 - weight);
  rotateBoneWorld(bone, _qd, chain);
}
const _chain1 = [null, null], _chain2 = [null];
function solveTwoBone(upper, lower, end, target, pole) {
  const A = bonePos(upper, _i1), B = bonePos(lower, _i2), C = bonePos(end, _i3);
  const a = A.distanceTo(B), b = B.distanceTo(C);
  const dv = _i4.subVectors(target, A);
  const d = clamp(dv.length(), Math.abs(a - b) + 1e-3, a + b - 1e-3);
  const n = dv.normalize();
  const x = (a * a - b * b + d * d) / (2 * d), h = Math.sqrt(Math.max(0, a * a - x * x));
  const pd = _i5.subVectors(pole, A); pd.addScaledVector(n, -pd.dot(n));
  if (pd.lengthSq() < 1e-8) pd.set(0, -1, 0); pd.normalize();
  const E = _i6.copy(A).addScaledVector(n, x).addScaledVector(pd, h);
  _chain1[0] = lower; _chain1[1] = end; _chain2[0] = end;
  _i7.copy(B); aimBone(upper, _i7, E, 1, _chain1);
  aimBone(lower, bonePos(end, _i3), target, 1, _chain2);
}
// world position of a child joint from its parent's (fresh) matrix
function childPos(parent, child, out) { return out.copy(child.position).applyMatrix4(parent.matrixWorld); }

// ---------- model ----------
function makeSoldier(type, theme, team = 'red', unit = null) {
  const src = ASSETS.models.soldier;
  const clone = THREE.SkeletonUtils.clone(src.scene);
  const k = 1.78 * (type.scale || 1) / src.size.y;
  clone.position.set(-src.center.x, -src.box.min.y, -src.center.z);
  const inner = new THREE.Group(); inner.add(clone); inner.scale.setScalar(k);
  inner.updateMatrixWorld(true);
  clone.traverse(o => {
    if (o.isMesh) {
      // elite and squad units wear their own fabric; regular soldiers the map's camouflage
      o.material = unit && o.material.name !== FACE_MATERIAL ? unitMaterial(o.material, unit, o) : themedMaterial(o.material, theme, team);
      o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false;
    }
  });
  const root = new THREE.Group(); root.add(inner);
  const B = {};
  clone.traverse(o => { if (o.isBone) B[o.name.replace('mixamorig', '')] = o; });
  return { root, clone, B, k };
}

// opts: { team: 'red'|'blue', state, post: Vector3 (patrol centre), name, hvt }
function spawnEnemy(typeKey, spawnPos, opts = {}) {
  const team = opts.team || 'red';
  // hostile elites replace regular soldiers of the same archetype (more often on harder difficulties)
  const unit = opts.unit || (team === 'red' && !opts.noElite ? pickHostileUnit(typeKey) : null);
  if (unit && unit.base && team === 'red') typeKey = unit.base;
  const base = ENEMY_TYPES[typeKey] || ENEMY_TYPES.soldier;
  const t = unit && team === 'red' ? Object.assign({}, base, {
    hp: base.hp * unit.hp, dmg: base.dmg * unit.dmg, acc: base.acc * unit.acc, speed: base.speed * unit.speed, fire: unit.fire,
    armor: unit.armor || base.armor, tactics: unit.tactics || 0, weapon: unit.weapon || base.weapon, label: unit.name, elite: true
  }) : base;
  const diff = diffSettings();
  const theme = team === 'blue' ? 'ally' : (typeKey === 'officer' ? 'officer' : WORLD.enemyTheme || 'urban');
  const S0 = makeSoldier(t, theme, team, unit);
  const g = S0.root;
  g.position.copy(spawnPos);
  if (PITS.length) { const pt = pitAt(spawnPos.x, spawnPos.z); if (pt) g.position.y = pt.y; }   // spawned in a basement: start on its floor
  g.rotation.y = Math.atan2(player.pos.x - spawnPos.x, player.pos.z - spawnPos.z);
  scene.add(g);

  const mixer = new THREE.AnimationMixer(S0.clone);
  const actions = {}; // bound on first use (enemyAction): ~100 clips x every agent would bind thousands of tracks up front

  if (t.helmet && S0.B.Head) {
    const hm = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), helmetMaterial(unit));
    hm.castShadow = true; hm.userData.helmet = true;
    g.add(hm); // positioned each frame
    S0.helmet = hm;
  }

  const weapon = team === 'blue' ? (typeKey === 'heavy' ? 'LMG' : typeKey === 'sniper' ? 'M24' : 'M4A1') : t.weapon;
  const gun = buildGun(weapon, true);
  scene.add(gun);

  const red = team === 'red';
  const hp = t.hp * (red ? (1 + G.wave * 0.04) * diff.enemyHp : 1.1);
  const state = opts.state || (t.sniper ? 'snipe' : 'advance');
  const e = {
    g, model: S0, B: S0.B, mixer, actions, cur: null, curName: '', gun, gunVel: null, team, weapon,
    type: typeKey, name: opts.name || t.label, hvt: !!opts.hvt, unit,
    t: Object.assign({}, t, red ? { dmg: t.dmg * diff.enemyDmg, speed: t.speed * diff.enemySpeed } : { dmg: t.dmg * 0.9, acc: t.acc * 0.95 }),
    hp, maxhp: hp, dead: false, deadT: 0, alerted: state !== 'patrol',
    state, stateT: 0, post: opts.post ? opts.post.clone() : spawnPos.clone(), patrolP: null, idleT: 0, spotT: 0,
    path: null, pathI: 0, repathT: 0, lastTgt: null, lkp: player.pos.clone(),
    tgt: null, tgtT: 0, noLosT: 0, losT: 0, suppressT: 0, grenadeT: 6 + Math.random() * 8,
    cover: null, peek: null, flank: null, searchP: null, searchN: 0,
    strafeDir: Math.random() > 0.5 ? 1 : -1, strafeT: 0,
    burstLeft: 0, shotT: 1 + Math.random() * 1.5, meleeT: 0, mag: t.mag || 30, reloadT: 0, throwT: 0, throwTgt: null,
    special: null, stagger: 0, leapUsed: false,
    flinch: new THREE.Vector3(), aimBlend: 0, moveSpeed: 0, prevPos: spawnPos.clone(), bodyYaw: g.rotation.y, moveYaw: g.rotation.y, posture: 'stand',
    uid: squadSeq, squad: opts.squad ?? Math.floor(squadSeq++ / 4), hbT: 0, hb: {}, showHpT: 0, mixAcc: 0, losCache: false,
    laser: null, perch: null, marker: null
  };
  if (t.sniper && red) {
    e.laser = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 1, 4, 1, true), new THREE.MeshBasicMaterial({ color: 0xff2020, transparent: true, opacity: 0.5, toneMapped: false, depthWrite: false }));
    e.laser.geometry.translate(0, 0.5, 0); scene.add(e.laser);
    e.glint = fxSprite('glint', 0xfff0d0, 0.6, spawnPos, { additive: true, fog: false });
  }
  // floating health bar
  e.hbBg = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0x111111, transparent: true, opacity: 0.0, depthWrite: false }));
  e.hbFg = new THREE.Sprite(new THREE.SpriteMaterial({ color: red ? 0xff3a3a : 0x4ab0ff, transparent: true, opacity: 0.0, depthWrite: false }));
  e.hbBg.scale.set(0.8, 0.07, 1); e.hbFg.scale.set(0.8, 0.07, 1);
  scene.add(e.hbBg); scene.add(e.hbFg);
  e.label = opts.label || (unit ? (team === 'blue' && opts.name ? unit.name + ' · ' + opts.name.replace('BRAVO-', 'B') : unit.name) : (opts.name || t.label));
  e.marker = makeMarker(team, e.label); scene.add(e.marker);

  if (WORLD.indoor || !Q().shadows) {
    e.blob = new THREE.Mesh(BLOB_GEO, blobMat()); e.blob.rotation.x = -Math.PI / 2; e.blob.renderOrder = 1; scene.add(e.blob);
  }
  if (!MIX_GRIP) measureMixamoGrip(e);
  playEnemyAnim(e, state === 'snipe' ? 'kneelIdle' : state === 'patrol' ? 'walk' : 'jogF', 0);
  enemies.push(e);
  return e;
}

function enemyAction(e, name) {
  let a = e.actions[name];
  if (!a && ASSETS.clips[name]) a = e.actions[name] = e.mixer.clipAction(ASSETS.clips[name]);
  return a;
}
// sync: start the new loop at the same gait phase as the old one (direction / speed changes keep the feet in step)
function playEnemyAnim(e, name, fade = 0.25, once = false, sync = false) {
  if (e.curName === name && !once) return;
  const a = enemyAction(e, name);
  if (!a) return;
  const prev = e.cur;
  a.reset();
  a.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
  a.clampWhenFinished = once;
  a.timeScale = 1;
  if (sync && prev && prev !== a && !once) { const pd = prev.getClip().duration; a.time = (((prev.time / pd) % 1 + 1) % 1) * a.getClip().duration; }
  a.play();
  if (prev && prev !== a) prev.crossFadeTo(a, fade, false);
  e.cur = a; e.curName = name; e.posture = postureOf(name);
}
// one-shot full-body clip (melee strike, hit reaction, posture change) that the selector leaves alone for `hold` s.
// hand: which hand keeps the rifle while the clip's own arms play ('R', 'L'; null = both hands stay on the rifle)
function playOnce(e, name, ts = 1, hold = 0.8, hand = null, fade = 0.15, soft = false) {
  if (!enemyAction(e, name)) return false;
  playEnemyAnim(e, name, fade, true);
  e.cur.timeScale = ts;
  e.animHold = hold; e.holdHand = hand; e.holdSoft = soft;
  return true;
}

// ---------- body posture of a clip: eye height for line of sight, footsteps, which hit / death reaction fits ----------
function postureOf(n) {
  if (n === 'kneelToStand') return 'stand';
  if (n === 'proneToCrouch') return 'crouch';
  if (n.startsWith('prone')) return 'prone';
  if (n.startsWith('kneel') || n === 'standToKneel' || n === 'crouchAim') return 'kneel';
  if (n.startsWith('cwalk') || n.startsWith('crouch') || n === 'coverCrouch' || n === 'hiding' || n === 'throwGrenade') return 'crouch';
  return 'stand';
}
const EYE_H = { stand: 1.6, crouch: 1.15, kneel: 1.2, prone: 0.5 };

// ---------- upper-body layer: a clip's arm (and optionally spine) rotations blended over the base pose ----------
// Reloads, grenade throws and flinches play on the arms while the legs keep walking. Track interpolants are evaluated
// synchronously, so one set per clip serves every agent.
const LAYER_RE = /^(Spine\d?|Neck|Head|(Left|Right)(Shoulder|Arm|ForeArm|Hand\w*))$/, _layers = {}, _lq = new THREE.Quaternion();
function layerOf(name) {
  if (name in _layers) return _layers[name];
  const c = ASSETS.clips[name];
  if (!c) return (_layers[name] = null);
  const list = [];
  for (const tr of c.tracks) {
    const [b, p] = tr.name.split('.'), bn = b.replace('mixamorig', '');
    if (p === 'quaternion' && LAYER_RE.test(bn)) list.push([bn, tr.createInterpolant(), /^(Spine|Neck|Head)/.test(bn)]);
  }
  return (_layers[name] = { list, d: c.duration });
}
// end: clip time (s) where the layer stops (default: the clip's end)
function playLayer(e, name, ts, hand, spine, kind, end) {
  const L = layerOf(name);
  if (!L) return false;
  e.layer = { L, name, t: 0, ts, w: 0, hand, spine, kind, end: Math.min(end || L.d, L.d) };
  return true;
}
function stepLayer(e, dt) {
  const ly = e.layer;
  if (!ly) return;
  ly.t += dt * ly.ts;
  if (ly.t >= ly.end) { e.layer = null; return; }
  ly.w = Math.min(1, ly.t / ly.ts / 0.15, (ly.end - ly.t) / ly.ts / 0.25); // ease in 0.15 s, out over the last 0.25 s
}
function applyLayer(e) {
  const ly = e.layer;
  if (!ly || ly.w <= 0) return;
  const B = e.B, t = Math.min(ly.t, ly.L.d - 1e-3);
  for (const [bn, it, isSpine] of ly.L.list) {
    if (isSpine && !ly.spine) continue;
    const b = B[bn];
    if (b) b.quaternion.slerp(_lq.fromArray(it.evaluate(t)), ly.w);
  }
}

// ---------- clip choice ----------
const DIR8 = ['F', 'FL', 'L', 'BL', 'B', 'BR', 'R', 'FR'];
// 8-way sector of a movement direction relative to the body (rel > 0: toward the agent's left), with hysteresis
function dirIndex(e, rel) {
  let i = ((Math.round(rel / (Math.PI / 4)) % 8) + 8) % 8;
  if (e.locoDir != null && i !== e.locoDir && Math.abs(angleDiff(e.locoDir * Math.PI / 4, rel)) < Math.PI / 8 + 0.18) i = e.locoDir;
  return (e.locoDir = i);
}
function idleAnim(e, aiming) {
  const st = e.state;
  if (st === 'inCover' || (e.reloadT > 0 && e.cover && st !== 'combat')) return e.cover && !e.cover.low ? 'coverIdle' : (e.hidT === 2 ? 'hiding' : 'coverCrouch');
  if (st === 'snipe') return e.snipeProne ? (aiming ? 'proneFire' : 'proneIdle') : (aiming ? 'kneelAim' : 'kneelIdle');
  if (st === 'peek') return e.peek && e.peek.stand ? (e.burstLeft > 0 ? 'fireStand' : 'idleAim') : (e.uid & 1) ? 'crouchAim' : 'coverPeek'; // lean around the corner
  if (e.crouchFire && st === 'combat') return 'kneelAim';
  if (aiming && e.burstLeft > 0) return 'fireStand';
  if (aiming || (e.alerted && st !== 'search')) return (e.uid & 1) ? 'idleAim' : 'standAim';
  return e.uid % 3 === 0 ? 'lookAround' : 'idleRelaxed';
}
// posture changes that have their own transition clip (only when standing still)
function postureTransition(from, to) {
  if (to === 'prone' && from !== 'prone') return 'proneEnter';
  if (from === 'stand' && to === 'kneel') return 'standToKneel';
  if (from === 'kneel' && to === 'stand') return 'kneelToStand';
  return null;
}
function selectAnim(e, aiming) {
  let anim, ts = 1, fade = 0.25, sync = false;
  const sp = e.moveSpeed;
  if (sp > 0.35) {
    const d = DIR8[dirIndex(e, angleDiff(e.g.rotation.y, e.moveYaw))];
    const crouch = e.state === 'toCover';
    if (crouch && d === 'F' && sp > 2.2) anim = 'crouchRun';
    else if (crouch) anim = 'cwalk' + d;
    else if (e.state === 'peek' && (d === 'L' || d === 'R')) anim = 'coverSneak' + d;  // sliding out along the cover
    else if (aiming && e.burstLeft > 0 && d === 'F' && sp < 2.7) anim = 'fireWalk';    // advancing while firing
    else if (!aiming && d === 'F' && sp < 1.45) anim = 'walk';                         // relaxed patrol walk
    else anim = (sp < 2.7 ? 'walk' : sp < 5.6 ? 'jog' : 'sprint') + d;               // 8-way rifle locomotion
    ts = clamp(sp / clipSpeed(anim), 0.55, 1.6); sync = true; fade = 0.22;
  } else if (Math.abs(e.turnRate || 0) > 1.6 && e.posture === 'stand') {
    anim = e.turnRate > 0 ? 'walkL' : 'walkR'; ts = 0.7; sync = true;              // foot shuffle while turning on the spot
  } else {
    anim = idleAnim(e, aiming);
    const tr = postureTransition(e.posture, postureOf(anim));
    if (tr && e.curName !== tr && playOnce(e, tr, tr === 'proneEnter' ? 1.3 : 1.5, tr === 'proneEnter' ? 1.25 : 0.55, null, 0.2, true)) return;
  }
  playEnemyAnim(e, anim, fade, false, sync);
  if (e.cur) e.cur.timeScale = ts;
}
// hit reaction for a heavy hit that did not kill (bodies on the move flinch on the arms and keep running)
function hitReaction(e, zone, explosive) {
  if (e.posture === 'prone') { e.stagger = 0; return; }
  if (e.moveSpeed > 2.2 && !explosive) { playLayer(e, 'hitReact', 1.6, 'R', true, 'hit', 1.1); e.stagger = 0; return; }
  const clip = explosive ? 'shieldBlast' : e.posture === 'kneel' ? 'kneelHit' : zone === 'head' ? 'headHit' : (Math.random() < 0.5 ? 'hitReact' : 'hitFront');
  const ts = explosive ? 1.5 : 1.35, hold = explosive ? 1.15 : clip === 'headHit' ? 0.65 : 0.75;
  if (playOnce(e, clip, ts, hold, 'R', 0.1)) e.stagger = hold;
}
// death clip from how and where the body was hit
function deathClip(e, zone, dir, explosive) {
  if (explosive) return Math.random() < 0.5 ? 'deathKnock' : 'deathFallBack';
  if (e.posture === 'prone') return 'deathProne';
  if (e.posture === 'kneel' || e.posture === 'crouch') return 'deathCrouchHead';
  const y = e.g.rotation.y;
  const f = dir ? Math.sin(y) * dir.x + Math.cos(y) * dir.z : -1;     // < 0: shot from the front
  const r = dir ? -Math.cos(y) * dir.x + Math.sin(y) * dir.z : 0;     // < 0: shot from the right
  if (e.moveSpeed > 3.2 && f > -0.3) return 'deathRun';
  if (zone === 'head') return f < 0 ? 'deathHeadFront' : 'deathHeadBack';
  if (Math.abs(r) > 0.72) return r < 0 ? 'deathRight' : 'deathLeft';
  const pool = f < 0 ? ['deathFront', 'deathRifle', 'death1'] : ['deathBack', 'death2'];
  return pool[Math.floor(Math.random() * pool.length)];
}
// melee moves: clip, time scale, impact time in the clip (s), hand that keeps the rifle, damage factor
const MELEE = [
  { clip: 'rifleButt', ts: 1.35, hit: 0.92, hand: 'R', dmg: 1 },
  { clip: 'riflePunch', ts: 1.35, hit: 0.92, hand: 'R', dmg: 1 },
  { clip: 'kick', ts: 1.3, hit: 1.1, hand: null, dmg: 1.2 },
  { clip: 'mmaKick', ts: 1.2, hit: 0.6, hand: null, dmg: 1.2 },
  { clip: 'crossPunch', ts: 1.4, hit: 1.0, hand: 'L', dmg: 0.9 },
  { clip: 'elbow', ts: 1.3, hit: 0.56, hand: 'L', dmg: 0.9 }
];
// grenade throws: crouched / standing clip and the release moment in the clip (s)
const THROWS = { throwGrenade: 1.87, tossGrenade: 1.81 };
function startThrow(e) {
  const clip = e.posture === 'stand' ? 'tossGrenade' : 'throwGrenade', ts = 1.7;
  if (!ASSETS.clips[clip]) { e.throwT = 0.9; e.throwRel = 0.38; e.throwClip = null; return; }
  const rel = THROWS[clip] / ts;
  if (e.moveSpeed < 0.5 && !(e.animHold > 0)) { playOnce(e, clip, ts, rel + 0.4, 'L', 0.2); e.moveLock = rel + 0.3; }
  else playLayer(e, clip, ts, 'L', false, 'throw', THROWS[clip] + 0.8);
  e.throwT = rel + 0.45; e.throwRel = 0.45; e.throwClip = clip;
}

// ---------- targets ----------
// e.tgt is 'player', another agent, or null. Positions/heads are read through these helpers.
const _tH = new THREE.Vector3();
function tgtPos(e) { return e.tgt === 'player' ? player.pos : e.tgt ? e.tgt.g.position : null; }
function tgtHead(e, out, playerHead) {
  if (e.tgt === 'player') return out.copy(playerHead);
  const o = e.tgt; return o.hb.headC ? out.copy(o.hb.headC) : out.copy(o.g.position).setY(o.g.position.y + 1.55);
}
function playerTargetable() { return G.playing && !G.dead && !G.respawning && !(typeof MODE !== 'undefined' && MODE.peace); }
function pickTarget(e) {
  const p = e.g.position;
  let best = null, bd = Infinity;
  const cur = e.tgt && e.tgt !== 'player' && e.tgt.dead ? null : e.tgt;
  if (e.team === 'red' && playerTargetable()) { const d = Math.hypot(player.pos.x - p.x, player.pos.z - p.z) - (cur === 'player' ? 4 : 0); best = 'player'; bd = d; }
  for (const o of enemies) {
    if (o.dead || o.team === e.team) continue;
    const d = Math.hypot(o.g.position.x - p.x, o.g.position.z - p.z) - (cur === o ? 4 : 0);
    if (d < bd) { bd = d; best = o; }
  }
  return best;
}
function alertSquad(e) {
  for (const o of enemies) if (!o.dead && o.team === e.team && o.squad === e.squad && !o.alerted) { o.alerted = true; o.lkp.copy(e.lkp); if (o.state === 'patrol') { o.state = 'advance'; o.stateT = 0; } }
}

// ---------- hit volumes ----------
function updateHitboxes(e) {
  const B = e.B, hb = e.hb;
  const set = (k, bone, fallbackY) => { hb[k] = hb[k] || new THREE.Vector3(); if (bone) bonePos(bone, hb[k]); else hb[k].copy(e.g.position).y += fallbackY; };
  set('head', B.Head, 1.6); set('neck', B.Neck, 1.48); set('spine1', B.Spine1, 1.2); set('hips', B.Hips, 0.95);
  set('lUp', B.LeftUpLeg, 0.9); set('lLeg', B.LeftLeg, 0.5); set('lFoot', B.LeftFoot, 0.08);
  set('rUp', B.RightUpLeg, 0.9); set('rLeg', B.RightLeg, 0.5); set('rFoot', B.RightFoot, 0.08);
  set('lArm', B.LeftArm, 1.4); set('lFore', B.LeftForeArm, 1.2); set('lHand', B.LeftHand, 1.1);
  set('rArm', B.RightArm, 1.4); set('rFore', B.RightForeArm, 1.2); set('rHand', B.RightHand, 1.1);
  // head centre sits above the head joint
  hb.headC = hb.headC || new THREE.Vector3();
  hb.headC.copy(hb.head).sub(hb.neck).normalize().multiplyScalar(0.09).add(hb.head);
}

const _rs = { u: new THREE.Vector3(), w: new THREE.Vector3(), p: new THREE.Vector3(), q: new THREE.Vector3() };
// distance between ray (o + s d, s>=0) and segment ab; returns [dist, s]
function raySeg(o, d, a, b) {
  const v = _rs.u.subVectors(b, a), w = _rs.w.subVectors(o, a);
  const B = d.dot(v), C = v.dot(v), D = d.dot(w), E = v.dot(w);
  const den = C - B * B;
  let t = den > 1e-9 ? (E - B * D) / den : 0;
  t = C > 1e-9 ? clamp(t, 0, 1) : 0;
  let s = Math.max(0, B * t - D);
  if (C > 1e-9) t = clamp((s * B + E) / C, 0, 1);
  _rs.p.copy(o).addScaledVector(d, s); _rs.q.copy(a).addScaledVector(v, t);
  return [_rs.p.distanceTo(_rs.q), s];
}
function enemyRayTest(e, o, d, maxT) {
  const hb = e.hb;
  if (!hb.head) return null;
  const c = _rs.p.copy(e.g.position); c.y += 1.0;
  const tc = Math.max(0, _rs.w.subVectors(c, o).dot(d));
  if (tc > maxT + 1.5) return null;
  if (_rs.q.copy(o).addScaledVector(d, tc).distanceTo(c) > 1.6) return null;
  let best = null;
  const test = (a, b, r, zone) => {
    const [dist, s] = raySeg(o, d, a, b);
    if (dist > r) return;
    const th = s - Math.sqrt(r * r - dist * dist);
    if (th < 0 || th > maxT) return;
    if (!best || th < best.t - 0.002 || (zone === 'head' && th < best.t + 0.02)) best = { t: th, zone };
  };
  test(hb.headC, hb.headC, e.t.helmet ? 0.15 : 0.135, 'head');
  test(hb.neck, hb.spine1, 0.2, 'chest');
  test(hb.spine1, hb.hips, 0.19, 'stomach');
  test(hb.lUp, hb.lLeg, 0.1, 'limb'); test(hb.lLeg, hb.lFoot, 0.08, 'limb');
  test(hb.rUp, hb.rLeg, 0.1, 'limb'); test(hb.rLeg, hb.rFoot, 0.08, 'limb');
  test(hb.lArm, hb.lFore, 0.065, 'limb'); test(hb.lFore, hb.lHand, 0.055, 'limb');
  test(hb.rArm, hb.rFore, 0.065, 'limb'); test(hb.rFore, hb.rHand, 0.055, 'limb');
  return best;
}

// ---------- damage ----------
// opts.by: the AI agent that fired (undefined = the player). Returns true if this damage killed the agent.
function damageEnemy(e, dmg, zone, point, dir, opts = {}) {
  if (e.dead) return false;
  if (typeof zone === 'boolean') zone = zone ? 'head' : 'chest';
  const byPlayer = !opts.by && !opts.explosive;
  if (byPlayer && !opts.noStats) G.hits++;
  if (e.t.armor && zone !== 'head') dmg *= e.t.armor;
  e.hp -= dmg;
  e.suppressT = 1.6; e.alerted = true;
  if (opts.by) { e.lkp.copy(opts.by.g.position); if (!e.tgt || e.noLosT > 1) e.tgt = opts.by; }
  else if (!opts.explosive) e.lkp.copy(player.pos);
  if (e.state === 'patrol') { e.state = 'advance'; e.stateT = 0; alertSquad(e); }
  e.showHpT = 3;
  spawnBlood(point || e.g.position.clone().setY(1.2), dir, zone === 'head' ? 1.4 : 1);
  if (byPlayer && !opts.silent) { SFX.hitBody(zone === 'head'); SFX.hitmarker(zone === 'head'); flashHitmarker(zone === 'head', e.hp <= 0); }
  if (byPlayer && S.showDamageNumbers) spawnDamageNumber(point || e.g.position, Math.round(dmg), zone === 'head');
  // flinch: torso snaps away from the bullet; heavy hits make the soldier stagger
  if (dir) e.flinch.set(dir.x, 0, dir.z).normalize().multiplyScalar(zone === 'head' ? 0.5 : 0.3);
  if (e.hp > 0 && (dmg > 38 || (zone === 'head' && dmg > 20) || opts.explosive) && !e.special && !(e.animHold > 0 && e.holdHand && e.stagger > 0)) {
    e.stagger = 0.45; e.staggerDir = dir ? new THREE.Vector3(dir.x, 0, dir.z).normalize() : null;
    e.meleeHitT = 0; e.throwT = 0; if (e.layer && e.layer.kind === 'throw') e.layer = null; // a heavy hit spoils a strike or a throw
    hitReaction(e, zone, !!opts.explosive);
  }

  if (e.hp <= 0) {
    e.dead = true; e.deadT = 0; e.special = null; e.layer = null; e.animHold = 0;
    const killer = opts.by || (opts.explosive ? opts.source || null : 'player');
    if (killer === 'player' && e.team === 'red') {
      G.kills++; if (zone === 'head') G.headshots++; SFX.kill();
      // progression: XP and per-category weapon challenges
      if (typeof PROGRESSION !== 'undefined' && PROGRESSION.onKill) {
        const cw = typeof INVENTORY !== 'undefined' ? INVENTORY.curW() : null, hq = cw && cw.def.hq, dist = Math.hypot(player.pos.x - e.g.position.x, player.pos.z - e.g.position.z);
        try { PROGRESSION.onKill({ weaponId: opts.explosive ? null : hq || null, category: opts.melee ? 'melee' : (hq && ARSENAL.get(hq) ? ARSENAL.get(hq).category : null), headshot: zone === 'head', distance: dist, longshot: dist > 45, melee: !!opts.melee, explosive: !!opts.explosive }); } catch (err) { console.warn(err); }
      }
    }
    const who = killer === 'player' ? '' : killer && killer.name ? (killer.team === 'blue' ? '◆ ' : '') + killer.name + ' ▸ ' : '';
    addKillFeed(who + (zone === 'head' ? '✦ HEADSHOT · ' : '') + (e.team === 'blue' ? 'ALLY ' + e.name + ' DOWN' : e.name + ' ELIMINATED'), zone === 'head' && killer === 'player');
    const dc = deathClip(e, zone, dir, !!opts.explosive);
    // blasts throw the body away from the explosion: face it, the clip falls backwards
    if (opts.explosive && dir) e.g.rotation.y = Math.atan2(-dir.x, -dir.z);
    playEnemyAnim(e, enemyAction(e, dc) ? dc : 'death1', 0.12, true);
    if (e.cur) e.cur.timeScale = zone === 'head' ? 1.15 : 1;
    e.gunVel = new THREE.Vector3(dir ? dir.x * 2 : 0, 2.5, dir ? dir.z * 2 : 0);
    e.gunSpin = new THREE.Vector3(rand(-4, 4), rand(-4, 4), rand(-4, 4));
    e.hbBg.visible = e.hbFg.visible = false;
    if (e.laser) e.laser.visible = false; if (e.glint) e.glint.visible = false; if (e.marker) e.marker.visible = false;
    setTimeout(() => SFX.bodyFall(e.g.position.clone()), 900);
    if (e.team === 'red' && (!MODE.noDrops)) {
      const diff = diffSettings();
      if (Math.random() < diff.pickupChance) spawnPickup(e.g.position.clone(), !MODE.infiniteAmmo && Math.random() < 0.55 ? 'ammo' : 'health');
      if (Math.random() < diff.pickupChance * 0.5) {
        const w = e.weapon;
        spawnDroppedWeapon(w, e.g.position.clone().add(new THREE.Vector3(rand(-0.6, 0.6), 0, rand(-0.6, 0.6))), WEAPON_DEFS[w].mag, WEAPON_DEFS[w].mag * 2);
      }
    }
    MODE.onKill(e, killer, zone);
    return true;
  }
  return false;
}

function removeEnemy(e) {
  scene.remove(e.g); scene.remove(e.gun); scene.remove(e.hbBg); scene.remove(e.hbFg);
  if (e.laser) scene.remove(e.laser); if (e.glint) removeFx(e.glint); if (e.blob) scene.remove(e.blob); if (e.marker) scene.remove(e.marker);
  e.mixer.stopAllAction();
}

// ---------- per-frame ----------
const _e1 = new THREE.Vector3(), _e2 = new THREE.Vector3(), _e3 = new THREE.Vector3(), _e4 = new THREE.Vector3(), _e5 = new THREE.Vector3(), _e6 = new THREE.Vector3();
const _eM = new THREE.Matrix4(), _eX = new THREE.Vector3(), _eY = new THREE.Vector3(), _eZ = new THREE.Vector3();

function updateEnemies(dt) {
  const camQ = activeCamera.quaternion;
  ENEMY_FRAME++; PATH_BUDGET.left = 2;
  activeCamera.updateMatrixWorld();
  _frus.setFromProjectionMatrix(_frusM.multiplyMatrices(activeCamera.projectionMatrix, activeCamera.matrixWorldInverse));
  const playerHead = _e6.set(player.pos.x, player.pos.y + player.eye - 0.05, player.pos.z);
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    if (e.dead) {
      e.deadT += dt;
      _sph.center.set(e.g.position.x, e.g.position.y + 0.6, e.g.position.z);
      const dvis = _frus.intersectsSphere(_sph); e.g.visible = dvis;
      e.mixAcc += dt;
      if (dvis || (ENEMY_FRAME + e.uid) % 4 === 0) { e.mixer.update(e.mixAcc); e.mixAcc = 0; e.g.updateMatrixWorld(true); updateHitboxes(e); }
      if (e.blob) { e.blob.position.set(e.hb.hips ? e.hb.hips.x : e.g.position.x, e.g.position.y + 0.02, e.hb.hips ? e.hb.hips.z : e.g.position.z); e.blob.material.opacity = 0.7; }
      updateDroppedGun(e, dt);
      if (e.model.helmet) placeHelmet(e);
      if (e.deadT > 9) e.g.position.y -= dt * 0.35;
      if (e.deadT > 12) { removeEnemy(e); enemies.splice(i, 1); }
      continue;
    }
    updateAgent(e, dt, playerHead, camQ);
  }
}

function updateAgent(e, dt, playerHead, camQ) {
  const pos = e.g.position, T = e.t;
  // ---------- target ----------
  e.tgtT -= dt;
  if (e.tgtT <= 0 || (e.tgt && e.tgt !== 'player' && e.tgt.dead) || (e.tgt === 'player' && !playerTargetable())) {
    e.tgtT = 0.5 + Math.random() * 0.3;
    const nt = pickTarget(e);
    if (nt !== e.tgt) { e.tgt = nt; e.losCache = false; e.losT = 0; }
  }
  const tp = tgtPos(e);
  const head = e.tgt ? tgtHead(e, _tH, playerHead) : null;
  const dx = tp ? tp.x - pos.x : 0, dz = tp ? tp.z - pos.z : 0;
  const dist = tp ? Math.hypot(dx, dz) || 0.001 : 999;
  const eye = _e1.set(pos.x, pos.y + (EYE_H[e.posture] || 1.6), pos.z);
  if (head && ((ENEMY_FRAME + e.uid) % 3 === 0)) e.losCache = dist < (WORLD.indoor ? 60 : 110) && hasLOS(eye, head);
  let los = !!head && e.losCache;
  // unalerted patrols only notice targets in front of them
  if (!e.alerted && los) {
    const fy = Math.atan2(dx, dz), inCone = Math.abs(angleDiff(e.g.rotation.y, fy)) < 1.2;
    if (inCone && dist < (WORLD.indoor ? 26 : 38)) { e.spotT += dt; if (e.spotT > 0.7 * diffSettings().reaction) { e.alerted = true; e.state = 'advance'; e.stateT = 0; alertSquad(e); } }
    else e.spotT = Math.max(0, e.spotT - dt);
    los = false;
  }
  if (los) { e.lkp.copy(tp); e.noLosT = 0; e.losT += dt; } else { e.noLosT += dt; e.losT = 0; }
  e.suppressT = Math.max(0, e.suppressT - dt);
  e.grenadeT -= dt; e.stateT += dt;
  if (e.reloadT > 0) { e.reloadT -= dt; if (e.reloadT <= 0) e.mag = T.mag || 30; }
  e.prevPos.copy(pos);

  // ---------- special moves (dodge roll, leap, stagger) override the state machine ----------
  if (e.special) updateSpecial(e, dt);
  else if (e.stagger > 0) {
    e.stagger -= dt;
    if (e.staggerDir) { const nx = pos.x + e.staggerDir.x * dt * 0.8, nz = pos.z + e.staggerDir.z * dt * 0.8; if (NAV.walkable(nx, nz)) { pos.x = nx; pos.z = nz; } }
  } else {
    // dodge an incoming grenade
    for (const gr of grenades) {
      const gd = Math.hypot(gr.m.position.x - pos.x, gr.m.position.z - pos.z);
      if (gd < 5 && gr.fuse < 2.2 && !e.dodged) {
        e.dodged = true;
        const ax = pos.x - gr.m.position.x, az = pos.z - gr.m.position.z, al = Math.hypot(ax, az) || 1;
        if (Math.random() < 0.65) startSpecial(e, 'diveRoll', ax / al, az / al, 4.2, 1.15);
        else { e.cover = null; e.state = 'advance'; }
        break;
      }
    }
    e.moving = false;
    if (!e.special) think(e, dt, tp, dist, los, head);
    // feet planted for a strike, a standing throw or getting up from prone
    if (e.moveLock > 0) { e.moveLock -= dt; pos.x = e.prevPos.x; pos.z = e.prevPos.z; e.moving = false; }
    if (!e.moving) e.curSpd = (e.curSpd || 0) * Math.max(0, 1 - dt * 8);
  }

  resolveCollision(pos, 0.38, pos.y, 1.7);
  pos.y = damp(pos.y, groundHeightAt(pos.x, pos.z, pos.y, 0.2, 0.45), 12, dt);

  // ---------- movement speed (from displacement) and facing ----------
  const mvx = pos.x - e.prevPos.x, mvz = pos.z - e.prevPos.z;
  const spd = Math.hypot(mvx, mvz) / Math.max(dt, 1e-4);
  e.moveSpeed = damp(e.moveSpeed, spd, 10, dt);
  const aimYaw = tp ? Math.atan2(dx, dz) : e.g.rotation.y;
  const aiming = !!e.tgt && (los || e.state === 'combat' || e.state === 'peek' || e.state === 'snipe') && e.state !== 'melee' && e.alerted;
  let faceYaw = aiming ? aimYaw : e.g.rotation.y;
  if (spd > 0.05) e.moveYaw = Math.atan2(mvx, mvz);
  if (e.special) faceYaw = e.special.yaw;
  else if (e.state === 'melee' && tp) faceYaw = aimYaw;
  else if (e.moveSpeed > 0.35) {
    const moveYaw = e.moveYaw;
    // aiming: the body squares up to the target and the legs pick the 8-way clip; a flat-out sprint stays roughly along the path
    if (!aiming) faceYaw = moveYaw;
    else if (e.moveSpeed > 5.2) faceYaw = moveYaw + clamp(angleDiff(moveYaw, aimYaw), -0.5, 0.5);
    else faceYaw = aimYaw;
  } else if (!aiming && e.path && e.path.length) {
    const wp = e.path[Math.min(e.pathI, e.path.length - 1)];
    faceYaw = Math.atan2(wp[0] - pos.x, wp[1] - pos.z);
  }
  // exponential turn with a cap on angular speed: no instant snaps when a new target appears behind them
  const turnCap = dt * (e.special ? 12 : e.posture === 'prone' ? 1.2 : 5.5);
  const turn = clamp(angleDiff(e.g.rotation.y, faceYaw) * Math.min(1, dt * (e.special ? 14 : 7)), -turnCap, turnCap);
  e.g.rotation.y += turn;
  e.turnRate = damp(e.turnRate || 0, turn / Math.max(dt, 1e-4), 8, dt);

  // ---------- animation selection: 8-way, speed-matched locomotion (no foot sliding), posture clips, one-shots ----------
  stepLayer(e, dt);
  if (e.animHold > 0) {
    e.animHold -= dt;
    if (e.holdSoft && e.moveSpeed > 1) e.animHold = 0;   // a posture change gives way when the agent sets off
  } else if (!e.special) selectAnim(e, aiming);
  // which hand keeps the rifle while a clip moves the arms (null: both hands on the rifle through the IK)
  e.handMode = e.layer && e.layer.hand && e.layer.w > 0 ? e.layer.hand : (e.animHold > 0 ? e.holdHand : null);
  if (e.handMode) e.lastHand = e.handMode;
  e.freeW = damp(e.freeW || 0, e.handMode && e.gripR ? 1 : 0, 12, dt);
  e.recoil = Math.max(0, (e.recoil || 0) - dt * 9);

  // ---------- visibility + animation LOD ----------
  const pd = Math.hypot(player.pos.x - pos.x, player.pos.z - pos.z);
  _sph.center.set(pos.x, pos.y + 1, pos.z);
  const vis = pd < 3 || _frus.intersectsSphere(_sph);
  e.g.visible = vis; e.gun.visible = vis;
  const lod = !vis ? 4 : (pd > 45 ? 2 : 1);
  e.mixAcc += dt;
  e.aimBlend = damp(e.aimBlend, aiming && !e.special && e.reloadT <= 0 && !e.handMode ? 1 : 0, 6, dt);
  if ((ENEMY_FRAME + e.uid) % lod === 0) {
    e.mixer.update(e.mixAcc); e.mixAcc = 0;
    applyLayer(e);
    e.g.updateMatrixWorld(true);
    const castSh = pd < 22;
    if (e.castSh !== castSh) { e.castSh = castSh; e.model.clone.traverse(o => { if (o.isMesh) o.castShadow = castSh; }); }
    applyRifleIK(e, head || _e2.copy(pos).addScaledVector(_e3.set(Math.sin(e.g.rotation.y), 0, Math.cos(e.g.rotation.y)), 8).setY(pos.y + 1.2), dt * lod);
    updateHitboxes(e);
    if (e.model.helmet) placeHelmet(e);
  }
  if (e.blob) e.blob.position.set(pos.x, pos.y + 0.02, pos.z);
  // footsteps you can hear coming (positional; quieter for your own squad)
  if (e.moveSpeed > 0.8 && pd < 22) {
    e.stepT = (e.stepT || 0) - dt * e.moveSpeed;
    if (e.stepT <= 0) { e.stepT = e.posture !== 'stand' ? 1.9 : 1.5; SFX.stepAt(surfaceAt(pos.x, pos.z, pos.y), _e3.set(pos.x, pos.y + 0.1, pos.z), e.team === 'red' ? 1 : 0.55); }
  }
  if (e.marker) {
    // small arrow + name a hand's width above the helmet (bottom-anchored, constant size on screen)
    const hy = e.hb.headC ? e.hb.headC.y : pos.y + 1.6;
    e.marker.position.set(pos.x, hy + 0.2 + Math.sin(G.time * 3 + e.uid) * 0.02 * Math.min(1, pd / 10), pos.z);
    const ms = 0.07 * (1 - 0.25 * smoothstep(25, 90, pd)); e.marker.scale.set(ms * e.marker.userData.aspect, ms, 1);
    e.marker.visible = e.team === 'blue' ? pd > 4 : (vis && pd < (WORLD.indoor ? 60 : 110) && !e.escort);
  }

  // sniper laser + glint
  if (e.laser) {
    const show = e.tgt === 'player' && los && dist < T.range && e.losT > 0.4 && e.reloadT <= 0;
    if (show && !e.laser.visible) SFX.glint(pos.clone().setY(1.5));
    e.laser.visible = show; e.glint.visible = show;
    if (show) {
      const mz = e.gun.localToWorld(e.gun.userData.muzzle.clone());
      const tgt = _e3.copy(playerHead).add(_e4.set(Math.sin(G.time * 2.1) * 0.4, Math.cos(G.time * 1.7) * 0.3 - 0.3, 0));
      const d2 = _e4.subVectors(tgt, mz); const L = d2.length();
      e.laser.position.copy(mz); e.laser.quaternion.setFromUnitVectors(WUP, d2.normalize()); e.laser.scale.set(1, L, 1);
      e.glint.position.copy(mz); const gs = 0.3 + 0.4 * Math.abs(Math.sin(G.time * 3)); e.glint.scale.set(gs * 2, gs, 1);
    }
  }

  // health bar (only after being damaged)
  e.showHpT -= dt;
  const op = clamp(e.showHpT, 0, 1) * 0.9;
  e.hbBg.material.opacity = op * 0.8; e.hbFg.material.opacity = op;
  if (op > 0) {
    const top = _e3.copy(e.hb.headC || pos).add(_e4.set(0, 0.35, 0));
    e.hbBg.position.copy(top); e.hbFg.position.copy(top);
    const f = Math.max(0.001, e.hp / e.maxhp);
    e.hbFg.scale.x = 0.8 * f;
    const right = _e4.set(1, 0, 0).applyQuaternion(camQ);
    e.hbFg.position.addScaledVector(right, -(1 - f) * 0.4);
  }
}

// ---------- tactical state machine ----------
function think(e, dt, tp, dist, los, head) {
  const pos = e.g.position, T = e.t;
  const D = diffSettings(), tac = e.team === 'red' ? Math.min(4, (D.tactics || 0) + (T.tactics || 0)) : 1;
  const fr = (e.team === 'red' ? D.fireRate || 1 : 1) * (T.fire || 1);
  // escorted VIP: sticks with the player and fights from there
  if (e.escort) {
    const d = Math.hypot(player.pos.x - pos.x, player.pos.z - pos.z);
    if (d > 3.5) stepAlong(e, player.pos, dt, d > 9 ? 1.05 : 0.55);
    e.state = 'combat'; e.alerted = true;
    if (tp && los && dist < T.range && e.reloadT <= 0) {
      e.shotT -= dt;
      if (e.shotT <= 0 && e.losT > 0.6) { if (e.burstLeft <= 0) e.burstLeft = randInt(2, 4); enemyShoot(e, dist, head); e.burstLeft--; e.mag--; if (e.mag <= 0) enemyStartReload(e); e.shotT = e.burstLeft > 0 ? 0.12 : rand(0.8, 1.4); }
    }
    return;
  }
  // no enemy around: allies regroup on the player, hostiles patrol their post
  if (!tp) {
    if (e.team === 'blue' && G.playing && !G.dead) { const d = Math.hypot(player.pos.x - pos.x, player.pos.z - pos.z); if (d > 5) stepAlong(e, player.pos, dt, d > 12 ? 1 : 0.4); }
    else patrol(e, dt);
    return;
  }
  if (!e.alerted) { patrol(e, dt); return; }
  if (e.state === 'patrol') { e.state = 'advance'; e.stateT = 0; }

  if (dist < 2.0 && !T.sniper) e.state = 'melee';
  else if (e.state === 'melee') e.state = 'combat';

  // ---------- elite combat reflexes (Top Class / Legendary and elite units) ----------
  if (tac >= 2 && !T.sniper && e.state !== 'melee') {
    // under fire: dive or jump sideways out of the line of fire
    e.evadeT = (e.evadeT || 0) - dt;
    if (e.suppressT > 0.9 && e.evadeT <= 0 && los && dist > 5 && Math.random() < dt * (0.9 + 0.5 * (tac - 2))) {
      e.evadeT = rand(3.5, 6) / (1 + 0.25 * (tac - 2));
      const sx = -(tp.z - pos.z) / dist, sz = (tp.x - pos.x) / dist, s = Math.random() < 0.5 ? 1 : -1;
      if (NAV.walkable(pos.x + sx * s * 3, pos.z + sz * s * 3)) { startSpecial(e, tac >= 3 && Math.random() < 0.45 ? 'jump' : 'diveRoll', sx * s, sz * s, tac >= 3 ? 3.6 : 3.0, 0.8); return; }
    }
    // the player is reloading in the open: push now
    const w = e.tgt === 'player' && typeof INVENTORY !== 'undefined' ? INVENTORY.curW() : null;
    if (w && w.reloading && dist < 30 && dist > 4 && (e.state === 'combat' || e.state === 'inCover' || e.state === 'peek') && Math.random() < dt * 1.5 * tac) {
      e.cover = null; e.state = tac >= 3 && Math.random() < 0.5 ? 'flank' : 'advance'; e.stateT = 0; e.rushT = 2.5;
    }
    // badly hurt: break contact and hide
    if (e.hp < e.maxhp * 0.4 && !e.hidT && (e.state === 'combat' || e.state === 'advance') && los) {
      e.hidT = 1; const c = findCoverFor(e, tp, head);
      if (c) { e.cover = c; e.state = 'toCover'; e.stateT = 0; e.path = null; }
    }
  }
  e.rushT = Math.max(0, (e.rushT || 0) - dt);
  if (e.meleeHitT > 0) {
    e.meleeHitT -= dt;
    if (e.meleeHitT <= 0) {
      const v = e.meleeVictim, ep = e.g.position;
      if (v === 'player') { if (playerTargetable() && Math.hypot(player.pos.x - ep.x, player.pos.z - ep.z) < 2.4) { damagePlayer(14 * e.meleeDmg * diffSettings().enemyDmg, ep); SFX.punch(); } }
      else if (v && !v.dead && v.g.position.distanceTo(ep) < 2.4) { damageEnemy(v, 30 * e.meleeDmg, 'chest', null, null, { by: e }); SFX.punch(); }
    }
  }
  const pace = 1 + 0.12 * tac + (e.rushT > 0 ? 0.3 : 0);
  switch (e.state) {
    case 'melee':
      e.meleeT -= dt;
      if (e.meleeT <= 0) {
        // rifle-butt strikes, kicks, punches and elbows: the clip plays out, the blow lands at its impact frame
        const m = MELEE[Math.floor(Math.random() * MELEE.length)];
        const ok = playOnce(e, m.clip, m.ts, m.hit / m.ts + 0.35, m.hand, 0.12);
        const hitT = ok ? m.hit / m.ts : 0.35;
        e.meleeT = hitT + 0.6; e.meleeHitT = hitT; e.meleeVictim = e.tgt; e.meleeDmg = ok ? m.dmg : 1; e.moveLock = hitT + 0.2;
      }
      break;
    case 'advance':
      // breachers leap the last metres when they see their target
      if (T.shotgun && los && dist > 6 && dist < 10 && !e.leapUsed && Math.random() < dt * 1.5) { e.leapUsed = true; startSpecial(e, 'jump', dx1(e, tp), dz1(e, tp), 4.5, 0.75); break; }
      if (stepAlong(e, e.lkp, dt, (T.shotgun ? 1.15 : (los ? 0.7 : 1)) * pace) && !los) { e.state = 'search'; e.searchN = 0; e.searchP = null; e.stateT = 0; }
      else if (los && dist < T.engage) { e.state = (!T.shotgun && Math.random() < 0.3 + 0.1 * tac) ? 'flank' : 'combat'; e.stateT = 0; e.path = null; }
      break;
    case 'combat': {
      if (T.shotgun && dist > 4) stepAlong(e, tp, dt, 1.1);
      else if (e.reloadT > 0 && !e.cover) {
        // reloading in the open: back off a little
        const nx = pos.x - (tp.x - pos.x) / dist * dt * 1.2, nz = pos.z - (tp.z - pos.z) / dist * dt * 1.2;
        if (NAV.walkable(nx, nz)) { pos.x = nx; pos.z = nz; }
      } else {
        // measured side-steps with pauses; at range riflemen plant their feet for each burst
        e.strafeT -= dt;
        if (e.strafeT <= 0) {
          e.strafeT = rand(1.2, 2.8) / (1 + 0.2 * tac); e.strafeDir = Math.random() < 0.35 / (1 + tac) ? 0 : (Math.random() < 0.5 ? 1 : -1);
          // elite shooters drop to a knee for steadier bursts between side-steps
          e.crouchFire = tac >= 2 && dist > 10 && Math.random() < 0.18 * tac;
          if (e.crouchFire) e.strafeDir = 0;
        }
        const planted = (e.burstLeft > 0 && dist > 12 && tac < 3) || e.crouchFire;
        e.strafeV = damp(e.strafeV || 0, e.strafeDir && !planted ? 1.15 * (1 + 0.22 * tac) : 0, 6, dt);
        if (e.strafeDir && e.strafeV > 0.02) {
          const dx = tp.x - pos.x, dz = tp.z - pos.z;
          const sx = -dz / dist * e.strafeDir, sz = dx / dist * e.strafeDir;
          const nx = pos.x + sx * e.strafeV * dt, nz = pos.z + sz * e.strafeV * dt;
          if (NAV.walkable(nx, nz)) { pos.x = nx; pos.z = nz; } else e.strafeDir *= -1;
        }
      }
      if (!los && e.noLosT > 2) { e.state = 'advance'; e.stateT = 0; }
      else if (los && dist > T.engage + 10) { e.state = 'advance'; e.stateT = 0; }
      else if (!T.shotgun && ((e.suppressT > 0 && Math.random() < dt * (1.5 + 0.5 * tac)) || e.reloadT > 0 || e.stateT > rand(4, 7) / (1 + 0.15 * tac))) {
        const c = findCoverFor(e, tp, head);
        if (c) { e.cover = c; e.state = 'toCover'; e.stateT = 0; e.path = null; } else e.stateT = 0;
      }
      break;
    }
    case 'flank':
      if (e.stateT > 6 || !e.flank) { e.flank = flankPoint(e, tp); e.stateT = 0; }
      if (stepAlong(e, e.flank, dt, 1.2 * pace) || (los && dist < 10)) { e.state = 'combat'; e.stateT = 0; }
      break;
    case 'toCover':
      if (!e.cover) { e.state = 'combat'; break; }
      if (stepAlong(e, e.cover, dt, (e.suppressT > 0 || tac >= 2 ? 1.3 : 0.6) * (1 + 0.08 * tac))) { e.state = 'inCover'; e.stateT = 0; e.hidT = e.hidT ? 2 : 0; }
      break;
    case 'inCover':
      if (e.reloadT > 0) break;
      if (e.stateT > rand(1.2, 2.2) / (1 + 0.25 * tac) * (e.hidT === 2 ? 2.2 : 1)) { e.hidT = 0; e.peek = e.cover && e.cover.low ? { x: pos.x, z: pos.z, stand: true } : peekPoint(e, tp, head); if (e.peek) { e.state = 'peek'; e.stateT = 0; if (e.peek.stand) playOnce(e, 'coverToShoot', 1.8, 0.85, null, 0.2, true); } else e.state = 'combat'; }
      break;
    case 'peek':
      if (e.peek && !e.peek.stand) { const pd = Math.hypot(e.peek.x - pos.x, e.peek.z - pos.z); if (pd > 0.1) { pos.x += (e.peek.x - pos.x) / pd * Math.min(pd, 1.4 * dt); pos.z += (e.peek.z - pos.z) / pd * Math.min(pd, 1.4 * dt); } }
      if (e.stateT > rand(1.8, 3) || e.reloadT > 0) e.state = Math.random() < 0.6 ? 'toCover' : 'combat';
      break;
    case 'search':
      if (!e.searchP) { e.searchP = NAV.snap(e.lkp.x + rand(-6, 6), e.lkp.z + rand(-6, 6)); e.path = null; }
      if (stepAlong(e, e.searchP, dt, 0.45)) { e.searchN++; e.searchP = null; if (e.searchN >= 3) { e.lkp.copy(tp); e.state = 'advance'; e.path = null; } }
      if (los) e.state = 'combat';
      break;
    case 'snipe':
      if (!e.perch || e.stateT > 16) { e.perch = sniperPerch(e, tp); e.stateT = 0; }
      if (e.perch && Math.hypot(e.perch.x - pos.x, e.perch.z - pos.z) > 0.6) {
        e.snipeProne = false;
        if (e.posture === 'prone') { if (!(e.moveLock > 0)) { playOnce(e, 'proneToCrouch', 1.6, 0.95); e.moveLock = 0.95; } }
        else stepAlong(e, e.perch, dt, 1.1);
      } else if (!e.snipeProne && los && !WORLD.indoor && (e.proneCheckT = (e.proneCheckT || 0) - dt) <= 0) {
        // settled with the target in sight: lie down if it stays visible from ground level
        e.proneCheckT = 1;
        e.snipeProne = hasLOS(_e3.set(pos.x, pos.y + EYE_H.prone, pos.z), head);
      }
      if (!los && e.noLosT > 6) e.perch = null;
      break;
    default:
      e.state = 'advance';
  }

  // grenades when the target hides
  if (T.grenade && e.grenadeT <= 0 && e.noLosT > 3 / (1 + 0.3 * tac) && dist < 22 && dist > 6 && e.state !== 'melee' && e.throwT <= 0) {
    e.throwTgt = e.lkp.clone();
    e.grenadeT = rand(9, 15) / (1 + 0.25 * tac);
    startThrow(e);
  }
  if (e.throwT > 0) {
    const before = e.throwT; e.throwT -= dt;
    if (before > e.throwRel && e.throwT <= e.throwRel && !e.dead) {
      const hp = e.throwClip && e.B.RightHand ? bonePos(e.B.RightHand, _e2) : _e2.set(pos.x, pos.y + 1.8, pos.z);
      if (hp.y < pos.y + 0.9) hp.y = pos.y + 0.9;
      throwGrenade(e, hp, e.throwTgt);
    }
  }

  // firing
  // only with the rifle up and actually pointing at the target: shots leave the barrel where it is aimed
  const canShoot = los && dist < T.range && e.state !== 'toCover' && e.state !== 'inCover' && e.state !== 'melee' && e.reloadT <= 0 && e.throwT <= 0 && e.stagger <= 0
    && e.aimBlend > 0.8 && gunOnTarget(e, head);
  const reaction = (T.sniper ? 1.6 : 0.55) * diffSettings().reaction;
  if (canShoot && e.losT > reaction) {
    e.shotT -= dt;
    if (e.shotT <= 0) {
      if (e.burstLeft <= 0) e.burstLeft = randInt(T.burst[0], T.burst[1]) + (tac >= 2 && !T.sniper && !T.shotgun ? tac - 1 : 0);
      enemyShoot(e, dist, head);
      e.burstLeft--; e.mag--;
      if (e.mag <= 0) enemyStartReload(e);
      e.shotT = e.burstLeft > 0 ? T.burstGap / Math.sqrt(fr) : rand(T.pause[0], T.pause[1]) / fr;
    }
  }
}
const _gf = new THREE.Vector3(), _gt = new THREE.Vector3();
function gunOnTarget(e, head) {
  if (!head) return false;
  _gf.set(0, 0, -1).applyQuaternion(e.gun.quaternion);
  e.gun.localToWorld(_gt.copy(e.gun.userData.muzzle));
  _gt.subVectors(head, _gt).normalize();
  return _gf.dot(_gt) > 0.985; // within ~10 degrees
}
function dx1(e, tp) { const d = Math.hypot(tp.x - e.g.position.x, tp.z - e.g.position.z) || 1; return (tp.x - e.g.position.x) / d; }
function dz1(e, tp) { const d = Math.hypot(tp.x - e.g.position.x, tp.z - e.g.position.z) || 1; return (tp.z - e.g.position.z) / d; }

// (named apart from the player's startReload() in weapons.js: both are globals and the later script would win)
function enemyStartReload(e) {
  e.reloadT = e.t.reload || 2.3; e.burstLeft = 0;
  if (!e.layer && layerOf('reload2')) playLayer(e, 'reload2', layerOf('reload2').d / e.reloadT, 'R', false, 'reload');
  const p = e.g.position.clone().setY(e.g.position.y + 1.2);
  if (Math.hypot(player.pos.x - p.x, player.pos.z - p.z) < 25) {
    setTimeout(() => { if (!e.dead) AudioSys.play('mag_reload', { vol: 0.7, rate: rand(0.95, 1.08), pos: p, ref: 3, reverb: 0.2 }); }, 350);
    setTimeout(() => { if (!e.dead) AudioSys.play('bolt', { vol: 0.5, rate: 1.1, pos: p, ref: 3, reverb: 0.2 }); }, (e.reloadT - 0.5) * 1000);
  }
}

// one-shot clip that also moves the body (dodge roll, leap)
function startSpecial(e, clip, dirX, dirZ, distance, moveDur) {
  const dur = ASSETS.clips[clip] ? ASSETS.clips[clip].duration : 1;
  e.special = { clip, t: 0, dur: Math.min(dur, clip === 'diveRoll' ? 1.6 : dur), vx: dirX * distance / moveDur, vz: dirZ * distance / moveDur, moveDur, yaw: Math.atan2(dirX, dirZ) };
  e.path = null; e.animHold = 0; e.layer = null; e.meleeHitT = 0;
  playEnemyAnim(e, clip, 0.12, true);
  if (e.cur) e.cur.timeScale = clip === 'diveRoll' ? 1.25 : 1.1;
}
function updateSpecial(e, dt) {
  const s = e.special, pos = e.g.position;
  s.t += dt;
  if (s.t < s.moveDur) {
    const k = Math.sin(Math.PI * Math.min(1, s.t / s.moveDur)) * 1.5;
    const nx = pos.x + s.vx * dt * k, nz = pos.z + s.vz * dt * k;
    if (NAV.walkable(nx, nz)) { pos.x = nx; pos.z = nz; }
  }
  if (s.t >= s.dur) { e.special = null; e.dodged = false; e.state = e.alerted ? 'combat' : e.state; e.stateT = 0; e.curName = ''; }
}

// calm walk between points around the post
function patrol(e, dt) {
  const pos = e.g.position;
  if (e.idleT > 0) { e.idleT -= dt; return; }
  if (!e.patrolP) { e.patrolP = NAV.snap(e.post.x + rand(-9, 9), e.post.z + rand(-9, 9)); e.path = null; }
  if (stepAlong(e, e.patrolP, dt, 1.15 / e.t.speed)) { e.patrolP = null; e.idleT = rand(1.5, 4); }
}

function placeHelmet(e) {
  const hm = e.model.helmet, B = e.B;
  if (!B.Head) return;
  bonePos(B.Head, hm.position); e.g.worldToLocal(hm.position);
  const up = _e3.copy(e.hb.headC || hm.position).sub(e.hb.neck || hm.position).normalize();
  hm.position.addScaledVector(up, 0.07);
  hm.scale.setScalar(1);
  B.Head.getWorldQuaternion(_q1); e.g.getWorldQuaternion(_q2).invert();
  hm.quaternion.copy(_q2.multiply(_q1));
}

// IK scratch objects (no per-frame allocations)
const IKV = Array.from({ length: 18 }, () => new THREE.Vector3());
const IKQ = [new THREE.Quaternion(), new THREE.Quaternion(), new THREE.Quaternion(), new THREE.Quaternion()];
const _ikOff1 = new THREE.Vector3(0, 0.03, 0.07), _ikOff2 = new THREE.Vector3(-0.01, -0.01, 0.06), _ikDown = new THREE.Vector3();
// Torso aim, rifle placement and both arms, layered on top of the mocap:
// idle breathing, reload (left hand to the magazine and the belt pouch), grenade throw (right arm wind-up and release).
function applyRifleIK(e, target, dt) {
  const B = e.B;
  if (!B.Spine2 || !B.RightArm || !B.LeftArm) return;
  const [chest, fwd, aimT, dirT, right, c2, aimF, aimR, aimU, grip, gunF, gripW, foreW, poleR, poleL, tmp, tmp2] = IKV;
  const [qy, qp, qf, qb] = IKQ;
  const w = e.aimBlend, yaw = e.g.rotation.y, special = !!e.special;
  // a clip that moves the arms (strike, throw, reload, flinch): keep its arm pose to blend back to after the solve
  const fw = e.freeW || 0, held = fw > 0.002 && e.gripR, arms = held ? armBones(B) : null;
  if (held) for (let i = 0; i < 6; i++) ARMQ[i].copy(arms[i].quaternion);
  bonePos(B.Spine2, chest);
  fwd.set(Math.sin(yaw), 0, Math.cos(yaw));
  aimT.copy(chest).addScaledVector(fwd, 6); aimT.y -= 2.6; aimT.lerp(target, w);
  dirT.subVectors(aimT, chest);
  if (!special) {
    // torso twist + pitch toward the target, spread across three spine bones
    const dy = clamp(angleDiff(yaw, Math.atan2(dirT.x, dirT.z)), -1.4, 1.4) * w;
    let pitch = clamp(Math.atan2(dirT.y, Math.hypot(dirT.x, dirT.z)), -0.9, 0.9) * w;
    // breathing / weight shift while standing; lean back when staggered
    const still = e.moveSpeed < 0.35 ? 1 : 0, ph = e.uid * 1.7 + G.time;
    pitch += still * Math.sin(ph * 1.6) * 0.018;
    const sway = still * Math.sin(ph * 0.8) * 0.03;
    if (e.stagger > 0) pitch += Math.sin(Math.min(1, e.stagger / 0.45) * Math.PI) * 0.35;
    right.set(Math.sin(yaw + dy), 0, Math.cos(yaw + dy)).cross(WUP).normalize();
    qy.setFromAxisAngle(WUP, (dy + sway) / 3); qp.setFromAxisAngle(right, pitch / 3 * 0.85);
    const fl = e.flinch, flinching = fl.lengthSq() > 1e-4;
    if (flinching) { qf.setFromAxisAngle(tmp.set(fl.z, 0, -fl.x).normalize(), fl.length() / 3); fl.multiplyScalar(Math.pow(0.002, dt)); }
    // same world delta on each spine bone, expressed in the bone's (pre-IK) parent frame; one sub-tree refresh
    qb.copy(qp).multiply(qy); if (flinching) qb.premultiply(qf);
    for (const b of [B.Spine, B.Spine1, B.Spine2]) { if (!b) continue; worldQuat(b.parent, _q2); _q1.copy(_q2).invert().multiply(qb).multiply(_q2); b.quaternion.premultiply(_q1); }
    B.Spine.updateMatrixWorld(true);
  }

  // rifle placed in an aim frame anchored at the chest, barrel pointing at the target (low ready when not aiming)
  bonePos(B.Spine2, c2);
  aimF.subVectors(aimT, c2).normalize(); aimR.crossVectors(aimF, WUP).normalize(); aimU.crossVectors(aimR, aimF).normalize();
  const pistol = WEAPON_DEFS[e.weapon].cls === 'pistol';
  const rl = e.reloadT > 0 && !(e.layer && e.layer.kind === 'reload') ? clamp(1 - e.reloadT / (e.t.reload || 2.3), 0, 1) : -1; // procedural reload progress
  const tilt = rl >= 0 ? Math.sin(rl * Math.PI) : 0;                                   // rifle rolls and lowers during the reload
  grip.copy(c2).addScaledVector(aimR, pistol ? 0.08 : 0.15 + (1 - w) * 0.02 - tilt * 0.04).addScaledVector(aimU, pistol ? 0.08 : -0.06 - (1 - w) * 0.1 - tilt * 0.08).addScaledVector(aimF, pistol ? 0.42 : 0.24 + (1 - w) * 0.04 - tilt * 0.05);
  const rc = e.recoil || 0;                                                             // shot kick: back into the shoulder, muzzle up
  if (rc) grip.addScaledVector(aimF, -0.045 * rc);
  gunF.subVectors(aimT, grip).normalize();
  if (tilt) gunF.addScaledVector(aimU, -0.35 * tilt).normalize();
  if (rc) gunF.addScaledVector(aimU, 0.07 * rc).normalize();
  const g = e.gun;
  _eZ.copy(gunF).negate(); _eX.crossVectors(WUP, _eZ).normalize(); _eY.crossVectors(_eZ, _eX);
  if (_eX.lengthSq() < 1e-6) _eX.set(1, 0, 0);
  _eM.makeBasis(_eX, _eY, _eZ);
  g.quaternion.setFromRotationMatrix(_eM);
  if (tilt) g.quaternion.multiply(qb.setFromAxisAngle(tmp2.set(0, 0, 1), -0.6 * tilt));
  g.position.copy(grip); g.updateMatrixWorld(true);

  // right hand: grip, or the grenade throw arc
  g.localToWorld(gripW.copy(_ikOff1));
  bonePos(B.RightArm, poleR).addScaledVector(aimR, 0.35).addScaledVector(aimF, -0.1); poleR.y -= 0.5;
  if (e.throwT > 0 && !e.throwClip) {
    const k = 1 - e.throwT / 0.9; // 0..1
    const wind = k < 0.55 ? k / 0.55 : 1 - (k - 0.55) / 0.45;
    bonePos(B.RightArm, tmp).addScaledVector(fwd, k < 0.55 ? -0.25 * wind : 0.55 * (1 - wind)).addScaledVector(WUP, 0.35 + 0.2 * wind).addScaledVector(aimR, 0.08);
    gripW.lerp(tmp, Math.sin(Math.min(1, k * 1.15) * Math.PI));
    poleR.y += 0.8;
  }
  solveTwoBone(B.RightArm, B.RightForeArm, B.RightHand, gripW, poleR);
  // left hand: handguard, or magazine well -> belt pouch -> magazine well while reloading
  g.localToWorld(foreW.copy(g.userData.fore).add(_ikOff2));
  if (pistol) foreW.copy(gripW).addScaledVector(aimR, -0.04);
  if (rl >= 0) {
    g.localToWorld(tmp.set(0, -0.09, 0.02));                      // magazine well (under the receiver)
    bonePos(B.Hips, tmp2).addScaledVector(aimR, -0.12).addScaledVector(fwd, 0.12); tmp2.y += 0.05; // pouch on the belt
    if (rl < 0.25) foreW.lerp(tmp, rl / 0.25);
    else if (rl < 0.5) foreW.copy(tmp).lerp(tmp2, (rl - 0.25) / 0.25);
    else if (rl < 0.75) foreW.copy(tmp2).lerp(tmp, (rl - 0.5) / 0.25);
    else foreW.lerp(tmp, 1 - (rl - 0.75) / 0.25);
  }
  bonePos(B.LeftArm, poleL).addScaledVector(aimR, -0.25).addScaledVector(aimF, 0.15); poleL.y -= 0.55;
  solveTwoBone(B.LeftArm, B.LeftForeArm, B.LeftHand, foreW, poleL);
  // wrists: fingers wrap the grip / handguard
  if (B.RightHandMiddle1 && (e.throwT <= 0 || e.throwClip)) { bonePos(B.RightHand, tmp); tmp.addScaledVector(gunF, 0.05).addScaledVector(_eX, -0.06).addScaledVector(_eY, -0.06); aimBone(B.RightHand, childPos(B.RightHand, B.RightHandMiddle1, _ikDown), tmp); }
  if (B.LeftHandMiddle1 && rl < 0) { bonePos(B.LeftHand, tmp); tmp.addScaledVector(gunF, 0.06).addScaledVector(_eX, 0.05).addScaledVector(_eY, 0.02); aimBone(B.LeftHand, childPos(B.LeftHand, B.LeftHandMiddle1, _ikDown), tmp); }

  if (held) {
    // arms back toward the clip, rifle carried by one hand at the grip measured while both hands held it
    for (let i = 0; i < 6; i++) arms[i].quaternion.slerp(ARMQ[i], fw);
    for (let i = 0; i < 6; i++) refresh(arms[i]);
    const left = e.lastHand === 'L', hand = left ? B.LeftHand : B.RightHand, off = left ? e.gripL : (MIX_GRIP || e.gripR);
    tmp.copy(off.p).applyMatrix4(hand.matrixWorld);
    hand.matrixWorld.decompose(tmp2, qy, aimR); qy.multiply(off.q);
    g.position.lerp(tmp, fw); g.quaternion.slerp(qy, fw); g.updateMatrixWorld(true);
  } else if (rl < 0 && e.throwT <= 0 && !special && (!e.gripR || (ENEMY_FRAME + e.uid) % 30 === 0)) calibrateGrip(e);
}
const ARMQ = Array.from({ length: 6 }, () => new THREE.Quaternion()), _gm = new THREE.Matrix4(), _gv = new THREE.Vector3(), _gs = new THREE.Vector3(), _gq = new THREE.Quaternion();
function armBones(B) { return B._arms || (B._arms = [B.RightArm, B.RightForeArm, B.RightHand, B.LeftArm, B.LeftForeArm, B.LeftHand]); }
// Right-hand rifle grip the way the Mixamo rifle clips hold it (strikes, flinches and the reload are authored around it):
// measured once on the aiming idle, rifle along the line from the right wrist to the left wrist, in the hand's frame.
// Every soldier shares the rig, so one measurement serves all of them.
let MIX_GRIP = null;
function measureMixamoGrip(e) {
  const clip = ASSETS.clips.idleAim, B = e.B;
  if (!clip || !B.RightHand || !B.LeftHand) return;
  const a = e.mixer.clipAction(clip); a.reset(); a.play(); e.mixer.update(0.5); e.g.updateMatrixWorld(true);
  const pr = bonePos(B.RightHand, new THREE.Vector3()), pl = bonePos(B.LeftHand, new THREE.Vector3());
  const Z = pr.clone().sub(pl).normalize(), X = new THREE.Vector3().crossVectors(WUP, Z).normalize(), Y = new THREE.Vector3().crossVectors(Z, X);
  const gq = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z));
  const gp = pr.clone().sub(_ikOff1.clone().multiply(e.gun.scale).applyQuaternion(gq));
  const hq = new THREE.Quaternion(); B.RightHand.matrixWorld.decompose(new THREE.Vector3(), hq, new THREE.Vector3());
  MIX_GRIP = { p: gp.applyMatrix4(new THREE.Matrix4().copy(B.RightHand.matrixWorld).invert()), q: hq.invert().multiply(gq) };
  a.stop();
}
// rifle pose in each hand's frame while both hands hold it: lets a one-handed clip carry it naturally
function calibrateGrip(e) {
  const g = e.gun;
  for (const [hand, key] of [[e.B.RightHand, 'gripR'], [e.B.LeftHand, 'gripL']]) {
    if (!hand) return;
    const o = e[key] || (e[key] = { p: new THREE.Vector3(), q: new THREE.Quaternion() });
    o.p.copy(g.position).applyMatrix4(_gm.copy(hand.matrixWorld).invert());
    hand.matrixWorld.decompose(_gv, _gq, _gs); o.q.copy(_gq).invert().multiply(g.quaternion);
  }
}

function updateDroppedGun(e, dt) {
  const g = e.gun;
  if (!e.gunVel || e.gunRest) return;
  e.gunVel.y -= 14 * dt;
  g.position.addScaledVector(e.gunVel, dt);
  g.rotation.x += e.gunSpin.x * dt; g.rotation.y += e.gunSpin.y * dt; g.rotation.z += e.gunSpin.z * dt;
  const gh = groundHeightAt(g.position.x, g.position.z, g.position.y, 0.05, 0.3) + 0.04;
  if (g.position.y < gh) { g.position.y = gh; e.gunRest = true; g.rotation.set(0, g.rotation.y, Math.PI / 2); }
}

function enemyShoot(e, dist, head) {
  const T = e.t, diff = diffSettings(), atPlayer = e.tgt === 'player';
  const burstK = (e.burstLeft < T.burst[0] ? 0.65 : 1) * (e.moveSpeed > 2.6 ? 0.8 : 1);
  e.recoil = 1;
  let chance;
  if (atPlayer) {
    const moving = player.speed2d > 4.5;
    const mp = diff.movePen ?? 1;
    chance = T.acc * diff.accuracy * (0.4 - dist * (T.sniper ? 0.0015 : 0.0065)) * burstK - (moving ? 0.14 * mp : 0) - (player.prone ? 0.11 * mp : player.crouch ? 0.06 * mp : 0) - (e.suppressT > 0 ? 0.15 * mp : 0) - (G.bulletTime > 0 ? 0.2 : 0);
  } else chance = T.acc * (0.42 - dist * (T.sniper ? 0.0015 : 0.0075)) * burstK - (e.suppressT > 0 ? 0.12 : 0);
  if (T.shotgun) chance = dist < 6 ? 0.8 : dist < 12 ? 0.4 : 0.08;
  const cap = atPlayer && e.team === 'red' ? (diff.maxHit || 0.5) : 0.5;
  chance = clamp(chance, 0.03, T.sniper ? Math.max(0.65, cap + 0.08) : cap);
  const hit = Math.random() < chance;
  const mz = e.gun.localToWorld(e.gun.userData.muzzle.clone());
  const tgt = head.clone();
  if (!hit) tgt.add(new THREE.Vector3(rand(-1, 1), rand(-0.5, 0.8), rand(-1, 1)).normalize().multiplyScalar(rand(0.35, 1.1))); // near misses, not wild sprays
  else tgt.y -= rand(0.15, 0.5);
  const dir = tgt.clone().sub(mz).normalize();
  const far = mz.clone().addScaledVector(dir, hit ? mz.distanceTo(tgt) : 80);
  const wh = rayWorld(mz, dir, mz.distanceTo(far), 'shot');
  const end = wh ? wh.point : far;
  const pd = Math.hypot(player.pos.x - mz.x, player.pos.z - mz.z);
  if (pd < 90 || atPlayer) spawnMuzzleFlash(mz, dir, T.sniper ? 1.3 : 1);
  spawnTracer(mz, end, e.team === 'blue' ? 0x9fd8ff : (T.sniper ? 0xff6050 : 0xffb070), T.sniper ? 0.03 : 0.022);
  SFX.enemyShot(T.sniper ? 'sniper' : T.shotgun ? 'shotgun' : (e.type === 'heavy' ? 'heavy' : 'rifle'), mz);
  if (wh && !hit) {
    spawnImpact(wh.point, wh.normal, wh.collider.surface); if (Math.random() < 0.5) spawnDecal(wh.point, wh.normal, 'hole', 0.11);
    if (wh.collider.explosive) damageExplosive(wh.collider.explosive, T.dmg, e); // stray rounds set barrels off too
  }
  if (!hit) {
    const cam = activeCamera.position;
    const [d] = raySeg(mz, dir, cam, cam);
    if (d < 2.2 && Math.random() < 0.8) SFX.whiz(cam.clone().addScaledVector(dir, 1.5));
  } else if (atPlayer) damagePlayer(T.dmg * rand(0.8, 1.2), e.g.position);
  else if (!wh && e.tgt && !e.tgt.dead) damageEnemy(e.tgt, T.dmg * rand(0.8, 1.2) * (T.sniper ? 2.2 : 1.6), Math.random() < 0.12 ? 'head' : 'chest', tgt, dir, { by: e });
}

// ---------- movement helpers ----------
function stepAlong(e, tgt, dt, spMul) {
  const pos = e.g.position, tx = tgt.x, tz = tgt.z;
  e.repathT -= dt;
  const moved = !e.lastTgt || Math.hypot(tx - e.lastTgt.x, tz - e.lastTgt.z) > 2.5;
  if (!e.path || e.repathT <= 0 || moved) {
    e.lastTgt = { x: tx, z: tz }; e.repathT = rand(0.8, 1.4); e.pathI = 0;
    if (Math.hypot(tx - pos.x, tz - pos.z) < 14 && NAV.lineWalkable(pos.x, pos.z, tx, tz)) e.path = [[tx, tz]];
    else if (PATH_BUDGET.left > 0) { PATH_BUDGET.left--; e.path = NAV.findPath(pos.x, pos.z, tx, tz) || [[tx, tz]]; }
    else { if (!e.path) e.path = [[tx, tz]]; e.repathT = 0.05; e.lastTgt = null; }
  }
  const wp = e.path[Math.min(e.pathI, e.path.length - 1)];
  const wdx = wp[0] - pos.x, wdz = wp[1] - pos.z, d = Math.hypot(wdx, wdz);
  if (d < 0.45) { if (e.pathI < e.path.length - 1) { e.pathI++; return false; } return true; }
  // accelerate into a run instead of starting at full speed (decays again in updateAgent when they stop)
  const sp = e.t.speed * spMul;
  e.curSpd = (e.curSpd || 0) + (sp - (e.curSpd || 0)) * Math.min(1, dt * 4.5); e.moving = true;
  const step = Math.min(d, e.curSpd * dt);
  pos.x += wdx / d * step; pos.z += wdz / d * step;
  return false;
}

function findCoverFor(e, tp, head) {
  const cands = [];
  for (const p of coverPoints) {
    const de = Math.hypot(p.x - e.g.position.x, p.z - e.g.position.z);
    const dp = Math.hypot(p.x - tp.x, p.z - tp.z);
    if (de < 25 && dp > 8 && dp < 40) cands.push([de + Math.random() * 3, p]);
  }
  cands.sort((a, b) => a[0] - b[0]);
  for (let i = 0; i < Math.min(10, cands.length); i++) {
    if (!hasLOS(new THREE.Vector3(cands[i][1].x, 1.1, cands[i][1].z), head)) return cands[i][1];
  }
  return null;
}

function flankPoint(e, tp) {
  const a = Math.atan2(e.g.position.x - tp.x, e.g.position.z - tp.z);
  const na = a + e.strafeDir * (1.2 + Math.random());
  return NAV.snap(tp.x + Math.sin(na) * 13, tp.z + Math.cos(na) * 13);
}

function peekPoint(e, tp, head) {
  if (!e.cover) return null;
  const tx = tp.x - e.cover.x, tz = tp.z - e.cover.z, d = Math.hypot(tx, tz) || 1;
  const px = -tz / d, pz = tx / d;
  for (let si = 0; si < 2; si++) {
    const s = si === 0 ? 1 : -1;
    const x = e.cover.x + px * 1.2 * s, z = e.cover.z + pz * 1.2 * s;
    if (NAV.walkable(x, z) && hasLOS(new THREE.Vector3(x, 1.5, z), head)) return { x, z };
  }
  return null;
}

function sniperPerch(e, tp) {
  const eyeT = new THREE.Vector3(tp.x, tp.y + 1.5, tp.z);
  for (let k = 0; k < 14; k++) {
    const a = Math.random() * Math.PI * 2, r = rand(28, WORLD.indoor ? 34 : 55);
    const p = NAV.snap(clamp(tp.x + Math.sin(a) * r, NAV.bounds.x0 + 3, NAV.bounds.x1 - 3), clamp(tp.z + Math.cos(a) * r, NAV.bounds.z0 + 3, NAV.bounds.z1 - 3));
    if (hasLOS(new THREE.Vector3(p.x, 1.2, p.z), eyeT)) return p;
  }
  return NAV.snap(e.g.position.x, e.g.position.z);
}
