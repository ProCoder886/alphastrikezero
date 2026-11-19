// ---------- Game modes: Campaign, Team Deathmatch, Survival, Endless ----------
const MODE_INFO = {
  campaign: { label: 'CAMPAIGN', desc: 'Twelve story missions across every location. Each mission has clear, step-by-step objectives: recon, sabotage, intel, high-value targets, rescues and extraction.' },
  tdm: { label: 'TEAM DEATHMATCH', desc: 'Your squad BRAVO (you + 4 AI operators in unit uniforms) against hostile commandos. Infinite ammo for rifles, SMGs, machine guns, shotguns and pistols; launchers (5-10 rounds), sniper and scoped rifles (25-40 rounds) and grenades (5-10 each) get a new random supply every game. Score with kills, by holding the moving HARDPOINT, taking down the marked HVT and collecting dog tags; killstreaks earn UAV, resupply and airstrikes. First to 50, or the leader after 8 minutes, wins.' },
  survival: { label: 'SURVIVAL', desc: 'Survive round after round with limited ammo and no full healing. Every round brings a field objective - supply drops, beacon defence, rescues, commander hunts, sabotage, recon sweeps and shrinking holdout zones. Call extraction every 5th round, or fight on for a higher score.' },
  endless: { label: 'ENDLESS', desc: 'Hold out against infinite, ever stronger waves. Infinite ammo except launchers (5-10 rounds), sniper and scoped rifles (25-40 rounds) and grenades (5-10 each), rolled fresh every game. Heal up between waves and beat your best wave on every map.' }
};
// the location every mode opens on (Random Outdoor; Random Indoor heads the indoor list)
const DEFAULT_MAP_KEY = 'random_outdoor';

// ---------- campaign ----------
// Objective types: goto, eliminate, intel, destroy, hvt, rescue, hold, survive, extract
const MISSIONS = [
  { id: 'm1', map: 'misty_valley', name: 'FIRST LIGHT', brief: 'Insurgents have moved into the valley overnight. Scout the ridge, clear the patrols and get out before their main force arrives.',
    obj: [{ type: 'goto', label: 'Reach the observation post' }, { type: 'eliminate', n: 8, label: 'Clear the valley patrols' }, { type: 'extract', label: 'Reach the extraction point' }] },
  { id: 'm2', map: 'desert_village', name: 'SANDSTORM', brief: 'A courier network runs through the village. Recover their intel packages before the convoy reaches them.',
    obj: [{ type: 'intel', n: 3, label: 'Recover the intel packages' }, { type: 'eliminate', n: 10, label: 'Ambush the convoy escort' }, { type: 'extract', label: 'Extract from the village' }] },
  { id: 'm3', map: 'white_bunker', name: 'DEEP FREEZE', brief: 'The arctic bunker powers a missile radar. Sabotage its generators and fight your way out.',
    obj: [{ type: 'destroy', n: 3, prop: 'generator', label: 'Plant charges on the generators' }, { type: 'extract', label: 'Escape the bunker' }] },
  { id: 'm4', map: 'moonlit_compound', name: 'SILENT NIGHT', brief: 'The compound commander arrives tonight. Eliminate him, take his laptop and slip away under the moon.',
    obj: [{ type: 'hvt', label: 'Eliminate the compound commander' }, { type: 'intel', n: 1, label: "Take the commander's laptop" }, { type: 'extract', label: 'Reach the extraction point' }] },
  { id: 'm5', map: 'dune_hangar', name: 'HANGAR RAID', brief: 'Enemy gunships refuel at the desert hangar. Destroy the fuel tanks and hold until the strike team arrives.',
    obj: [{ type: 'destroy', n: 2, prop: 'water_tank', label: 'Destroy the fuel tanks' }, { type: 'eliminate', n: 10, label: 'Repel the hangar guards' }, { type: 'extract', label: 'Reach the extraction point' }] },
  { id: 'm6', map: 'sector7_basement', name: 'UNDERCITY', brief: 'A downed pilot is held in the Sector 7 basement. Find him, free him and escort him out alive.',
    obj: [{ type: 'rescue', label: 'Free the captured pilot' }, { type: 'extract', label: 'Escort the pilot to extraction', escort: true }] },
  { id: 'm7', map: 'alpine_fortress', name: 'ICE WALL', brief: 'Radar dishes on the fortress walls are tracking our aircraft. Knock them out and hold the gatehouse.',
    obj: [{ type: 'destroy', n: 2, prop: 'radar', label: 'Destroy the radar dishes' }, { type: 'hold', time: 45, label: 'Hold the position' }, { type: 'extract', label: 'Reach the extraction point' }] },
  { id: 'm8', map: 'city_garage', name: 'NEON SIEGE', brief: 'Your contact never showed. The parking garage is a trap: survive the ambush until the quick-reaction force arrives.',
    obj: [{ type: 'survive', time: 90, label: 'Survive the ambush' }, { type: 'extract', label: 'Reach the extraction point' }] },
  { id: 'm9', map: 'jungle_bunker', name: 'GREEN HELL', brief: 'The jungle bunker hides a weapons program. Gather the research files and eliminate the program director.',
    obj: [{ type: 'intel', n: 3, label: 'Collect the research files' }, { type: 'hvt', label: 'Eliminate the program director' }, { type: 'extract', label: 'Reach the extraction point' }] },
  { id: 'm10', map: 'fortified_valley', name: 'IRON RIDGE', brief: 'Take the hill fort at sunrise and hold it against the counter-attack.',
    obj: [{ type: 'hold', time: 60, label: 'Capture the hill position' }, { type: 'eliminate', n: 12, label: 'Break the counter-attack' }, { type: 'extract', label: 'Reach the extraction point' }] },
  { id: 'm11', map: 'river_delta', name: 'RIVER CROSSING', brief: 'Supply crates are staged at the river crossing. Mine them and stop the convoy.',
    obj: [{ type: 'destroy', n: 3, prop: 'crate', label: 'Mine the supply crates' }, { type: 'eliminate', n: 10, label: 'Stop the convoy guards' }, { type: 'extract', label: 'Reach the extraction point' }] },
  { id: 'm12', map: 'random_ops', name: 'ZERO HOUR', brief: 'Final operation. Hit the enemy headquarters: destroy their communications, eliminate the general and survive the response.',
    obj: [{ type: 'destroy', n: 2, prop: 'generator', label: 'Destroy the communication generators' }, { type: 'hvt', label: 'Eliminate the general' }, { type: 'survive', time: 60, label: 'Survive the counter-attack' }, { type: 'extract', label: 'Reach the extraction point' }] }
];
const OBJ_VERB = { goto: 'REACH', eliminate: 'ELIMINATE', intel: 'RECOVER', destroy: 'DESTROY', hvt: 'ELIMINATE HVT', rescue: 'RESCUE', hold: 'HOLD', survive: 'SURVIVE', extract: 'EXTRACT' };
let CAMPAIGN_SAVE = { unlocked: 1, stars: {} };

function mapIndexByKey(key) { return Math.max(0, MAPS.findIndex(m => m.key === key)); }

// ---------- shared helpers ----------
const _mV = new THREE.Vector3();
// walkable, reachable points spread over the map
function objectivePoints(n, opts = {}) {
  const rng = opts.rng || Math.random, b = WORLD.bounds, sp = WORLD.spawn;
  const minD = opts.minD ?? (WORLD.indoor ? 12 : 22), maxD = opts.maxD ?? 999, spacing = opts.spacing ?? (WORLD.indoor ? 9 : 14);
  const avoid = opts.avoid || [];
  const out = [];
  for (let tries = 0; tries < 400 && out.length < n; tries++) {
    const s = NAV.snap(b.x0 + 4 + rng() * (b.x1 - b.x0 - 8), b.z0 + 4 + rng() * (b.z1 - b.z0 - 8));
    const d = Math.hypot(s.x - sp.x, s.z - sp.z);
    if (d < minD || d > maxD) continue;
    if (out.concat(avoid).some(p => Math.hypot(p.x - s.x, p.z - s.z) < spacing)) continue;
    if (!NAV.walkable(s.x, s.z)) continue;
    if (tries < 300 && !NAV.findPath(sp.x, sp.z, s.x, s.z)) continue;
    out.push(new THREE.Vector3(s.x, 0, s.z));
  }
  while (out.length < n) { const s = NAV.snap(sp.x + (rng() - 0.5) * 20, sp.z + (rng() - 0.5) * 20); out.push(new THREE.Vector3(s.x, 0, s.z)); }
  return out;
}
// spawn point for hostiles: out of sight of the player, preferring a comfortable distance
function spawnPointAway(minD, prefer) {
  const cands = WORLD.enemySpawns.map(p => ({ x: p[0] + rand(-2, 2), z: p[1] + rand(-2, 2) }));
  minD = minD ?? (WORLD.indoor ? 13 : 22); prefer = prefer ?? (WORLD.indoor ? 22 : 38);
  const head = new THREE.Vector3(player.pos.x, player.pos.y + 1.6, player.pos.z);
  const scored = [];
  for (const c of cands) {
    const s = NAV.snap(c.x, c.z), d = Math.hypot(s.x - player.pos.x, s.z - player.pos.z);
    if (d < minD) continue;
    const visible = hasLOS(new THREE.Vector3(s.x, 1.6, s.z), head);
    scored.push({ p: s, score: (visible ? 100 : 0) + Math.abs(d - prefer) * 0.5 + Math.random() * 10 });
  }
  scored.sort((a, b) => a.score - b.score);
  if (scored.length) return new THREE.Vector3(scored[0].p.x, 0, scored[0].p.z);
  let best = null, bd = -1;
  for (const c of cands) { const s = NAV.snap(c.x, c.z), d = Math.hypot(s.x - player.pos.x, s.z - player.pos.z); if (d > bd) { bd = d; best = s; } }
  best = best || NAV.snap(0, 0);
  return new THREE.Vector3(best.x, 0, best.z);
}
function nearPoint(c, r) { const s = NAV.snap(c.x + rand(-r, r), c.z + rand(-r, r)); return new THREE.Vector3(s.x, 0, s.z); }
function aliveTeam(team) { let n = 0; for (const e of enemies) if (!e.dead && e.team === team) n++; return n; }
function wavePool(wave) {
  const pool = [['soldier', 6]];
  if (wave >= 2) pool.push(['rifleman', 4]);
  if (wave >= 3 || S.difficulty === 'Legendary') pool.push(['rusher', WORLD.indoor ? 4 : 2]);
  if (wave >= 4) pool.push(['heavy', 2]);
  if (wave >= 3 && !WORLD.indoor) pool.push(['sniper', 2]);
  if (wave >= 5 && WORLD.indoor) pool.push(['sniper', 1]);
  return pool;
}
function pickWeighted(pool) { const tot = pool.reduce((a, p) => a + p[1], 0); let x = Math.random() * tot; for (const p of pool) { x -= p[1]; if (x <= 0) return p[0]; } return pool[0][0]; }
function spawnSquad(n, at, opts = {}) {
  const sq = squadSeq++;
  const pool = opts.pool || wavePool(opts.tier || 3);
  for (let i = 0; i < n; i++) spawnEnemy(opts.type || pickWeighted(pool), nearPoint(at, 2.5), Object.assign({ squad: sq }, opts.agent || {}));
}
function refillAmmo(full) {
  for (const w of INVENTORY.slots) if (w) {
    if (w.limited) { AMMO_RULES.restore(w, full); continue; }   // limited supplies come back to this game's roll only
    if (full) w.mag = w.def.mag; w.reserve = Math.max(w.reserve, w.def.mag * 3);
  }
  updateAmmoHUD();
}
function respawnPlayer(at) {
  G.dead = false; G.respawning = false;
  player.pos.set(at.x, 0, at.z); player.vel.set(0, 0, 0); player.hp = player.maxHp; player.stamina = 100; player.prone = false; player.leanK = 0;
  POST.grade.uniforms.damage.value = 0;
  refillAmmo(true); if (typeof EQUIP !== 'undefined') EQUIP.reset();
  document.getElementById('respawn').classList.add('hidden');
  document.getElementById('hud').classList.remove('hidden');
}

// ---------- world markers: waypoints (DOM), zone rings, intel items, charges ----------
const WAYPOINTS = [];
function addWaypoint(label, getPos, kind = 'obj') {
  const el = document.createElement('div'); el.className = 'wp ' + kind;
  el.innerHTML = '<i></i><b></b><span></span>';
  el.querySelector('b').textContent = label;
  document.getElementById('waypoints').appendChild(el);
  const w = { el, getPos, label, dist: el.querySelector('span') };
  WAYPOINTS.push(w); return w;
}
function removeWaypoint(w) { if (!w) return; w.el.remove(); const i = WAYPOINTS.indexOf(w); if (i >= 0) WAYPOINTS.splice(i, 1); }
function clearWaypoints() { while (WAYPOINTS.length) removeWaypoint(WAYPOINTS[0]); }
function updateWaypoints() {
  const W2 = innerWidth, H2 = innerHeight;
  for (const w of WAYPOINTS) {
    const p = w.getPos(); if (!p) { w.el.style.display = 'none'; continue; }
    w.el.style.display = '';
    _mV.set(p.x, (p.y || 0) + 1.6, p.z).project(activeCamera);
    let x = (_mV.x + 1) / 2 * W2, y = (1 - _mV.y) / 2 * H2;
    const behind = _mV.z > 1;
    if (behind) { x = W2 - x; y = H2 - 40; }
    // markers stay inside the area the HUD and touch controls leave free (UIFIT.safe)
    const R = UIFIT.safe, off = behind || x < R.x0 || x > R.x1 || y < R.y0 || y > R.y1;
    x = clamp(x, R.x0, R.x1); y = clamp(y, R.y0, R.y1);
    w.el.style.transform = `translate(${x.toFixed(0)}px,${y.toFixed(0)}px)`;
    w.el.classList.toggle('edge', off);
    w.dist.textContent = Math.round(Math.hypot(p.x - player.pos.x, p.z - player.pos.z)) + ' m';
  }
}
function zoneRing(pos, r, color) {
  const g = new THREE.RingGeometry(r - 0.25, r, 64); g.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(1.6), transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  m.position.set(pos.x, 0.06, pos.z); m.renderOrder = 3; scene.add(m);
  const fill = new THREE.Mesh(new THREE.CircleGeometry(r, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.08, depthWrite: false }));
  fill.position.set(pos.x, 0.05, pos.z); scene.add(fill);
  return { ring: m, fill, dispose() { scene.remove(m); scene.remove(fill); } };
}
function smokeColumn(pos, color) {
  let t = 0;
  return (dt) => {
    t -= dt; if (t > 0) return; t = 0.18;
    const s = fxSprite('smoke', color, 1.1, new THREE.Vector3(pos.x + rand(-0.3, 0.3), 0.3, pos.z + rand(-0.3, 0.3)), { opacity: 0.75 });
    addParticle(s, rand(3.5, 5), 'smoke', { grav: -1.2, vel: new THREE.Vector3(rand(-0.3, 0.3) + 0.4, rand(1.2, 2), rand(-0.3, 0.3)), grow: 1.5, op: 0.7 });
  };
}
function intelItem(pos) {
  const g = new THREE.Group();
  const crate = ASSETS.prop('crate', 0.9, 'h'); if (crate) g.add(crate);
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.03, 0.3), MATLIB.plain(0x22262b, { rough: 0.4, metal: 0.6 })); base.position.set(0, 0.93, 0);
  const lid = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.28, 0.02), MATLIB.plain(0x22262b, { rough: 0.4, metal: 0.6 })); lid.position.set(0, 1.07, -0.14); lid.rotation.x = -0.25;
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.38, 0.24), MATLIB.emissive(0x40ff90, 2.4)); scr.position.set(0, 1.07, -0.128); scr.rotation.x = -0.25;
  g.add(base, lid, scr); g.position.set(pos.x, 0, pos.z); g.rotation.y = rand(0, 6.28);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  scene.add(g);
  const col = addCollider(pos.x - 0.45, pos.x + 0.45, 0, 0.9, pos.z - 0.45, pos.z + 0.45, { surface: 'wood' });
  return { g, col, dispose() { scene.remove(g); const i = colliders.indexOf(col); if (i >= 0) colliders.splice(i, 1); } };
}
function targetProp(name, pos) {
  const sizes = { generator: [1.6, 'h'], water_tank: [3.2, 'h'], radar: [3.0, 'h'], crate: [1.3, 'h'] };
  const [sz, ax] = sizes[name] || [1.6, 'h'];
  const g = ASSETS.prop(name, sz, ax) || new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.4, 1.4), MATLIB.plain(0x5a5f55));
  g.position.set(pos.x, 0, pos.z); g.rotation.y = rand(0, 6.28);
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  scene.add(g);
  const s = g.userData.size || new THREE.Vector3(1.4, 1.4, 1.4), r = Math.max(s.x, s.z) * 0.4;
  const col = addCollider(pos.x - r, pos.x + r, 0, s.y, pos.z - r, pos.z + r, { surface: 'metal' });
  const light = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), MATLIB.emissive(0xff2020, 6)); light.visible = false;
  light.position.set(pos.x, Math.min(1.2, s.y * 0.6), pos.z); scene.add(light);
  return { g, col, light, size: s, dispose() { scene.remove(g); scene.remove(light); const i = colliders.indexOf(col); if (i >= 0) colliders.splice(i, 1); } };
}
// kneeling captive (hands on head) until freed
function captiveModel(pos) {
  const S0 = makeSoldier(ENEMY_TYPES.soldier, 'ally', 'blue');
  S0.root.position.set(pos.x, 0, pos.z); S0.root.rotation.y = rand(0, 6.28); scene.add(S0.root);
  const mixer = new THREE.AnimationMixer(S0.clone); const a = mixer.clipAction(ASSETS.clips.kneelIdle); a.play();
  const B = S0.B, tmp = new THREE.Vector3(), pole = new THREE.Vector3();
  return {
    root: S0.root,
    update(dt) {
      mixer.update(dt); S0.root.updateMatrixWorld(true);
      if (!B.Head || !B.LeftArm) return;
      const back = new THREE.Vector3(-Math.sin(S0.root.rotation.y), 0, -Math.cos(S0.root.rotation.y));
      for (const [arm, fore, hand, side] of [[B.LeftArm, B.LeftForeArm, B.LeftHand, 1], [B.RightArm, B.RightForeArm, B.RightHand, -1]]) {
        bonePos(B.Head, tmp).addScaledVector(back, 0.1); tmp.y += 0.08;
        bonePos(arm, pole); pole.y += 0.3; pole.addScaledVector(new THREE.Vector3(Math.cos(S0.root.rotation.y), 0, -Math.sin(S0.root.rotation.y)), side * 0.5);
        solveTwoBone(arm, fore, hand, tmp, pole);
      }
    },
    dispose() { scene.remove(S0.root); mixer.stopAllAction(); }
  };
}

// hold-E interaction prompt with progress
const HOLD = { t: 0, key: null };
function holdInteract(id, label, dur, inRange, dt) {
  const el = document.getElementById('holdBar');
  if (!inRange) { if (HOLD.key === id) { HOLD.key = null; HOLD.t = 0; el.classList.add('hidden'); } return false; }
  el.classList.remove('hidden'); el.querySelector('b').textContent = 'HOLD E · ' + label;
  if (HOLD.key !== id) { HOLD.key = id; HOLD.t = 0; }
  if (keys.KeyE) HOLD.t += dt; else HOLD.t = Math.max(0, HOLD.t - dt * 2);
  el.querySelector('i').style.width = (clamp(HOLD.t / dur, 0, 1) * 100).toFixed(1) + '%';
  if (HOLD.t >= dur) { HOLD.key = null; HOLD.t = 0; el.classList.add('hidden'); return true; }
  return false;
}

// ---------- mode implementations ----------
const ENDLESS = {
  start() { this.queue = []; this.spawnT = 0; this.state = 'idle'; this.interT = 0; G.wave = 0; this.nextWave(); },
  nextWave() {
    G.wave++; SFX.wave();
    showBanner('WAVE ' + G.wave, G.wave === 1 ? WORLD.name + ' — HOSTILES INBOUND' : 'HOSTILES INBOUND');
    const n = Math.round(Math.min(4 + G.wave * 2.5, 30) * diffSettings().waveMult), pool = wavePool(G.wave);
    this.queue = []; for (let i = 0; i < n; i++) this.queue.push(pickWeighted(pool));
    this.spawnT = 1.0; this.state = 'spawning'; if (G.wave === 1) AudioSys.gameplayMusic();
  },
  update(dt) {
    if (this.state === 'spawning') {
      this.spawnT -= dt;
      if (this.spawnT <= 0 && this.queue.length && aliveTeam('red') < Math.round(Math.min(11, 4 + G.wave) * (diffSettings().aliveMul || 1))) {
        spawnEnemy(this.queue.shift(), spawnPointAway());
        this.spawnT = (1.3 - Math.min(0.6, G.wave * 0.05)) / diffSettings().spawnRate;
      }
      if (!this.queue.length) this.state = 'active';
    } else if (this.state === 'active') {
      if (!aliveTeam('red')) {
        this.state = 'inter'; this.interT = 6;
        showBanner('WAVE CLEARED', 'HEALTH +25 · NEXT WAVE IN 6s'); SFX.waveClear();
        if (G.wave % 5 === 0) { SFX.rankUp(); addKillFeed('★ WAVE ' + G.wave + ' MILESTONE', false); }
        player.hp = Math.min(player.maxHp, player.hp + 25);
      }
    } else if (this.state === 'inter') { this.interT -= dt; if (this.interT <= 0) this.nextWave(); }
  },
  isLastEnemy() { return aliveTeam('red') === 1 && !this.queue.length && this.state === 'active'; },
  hud() { let alive = this.queue.length + aliveTeam('red'); return [['WAVE', G.wave], ['HOSTILES', alive], ['KILLS', G.kills]]; },
  onPlayerDeath() {
    const acc = G.shots ? Math.round(G.hits / G.shots * 100) : 0, key = MAPS[S.map].key, b = bests[key] || { wave: 0, kills: 0 };
    const newBest = G.wave > b.wave || (G.wave === b.wave && G.kills > b.kills);
    if (newBest) { bests[key] = { wave: G.wave, kills: G.kills }; SAVE.set('bests', bests); refreshBests(); setTimeout(() => SFX.newBest(), 1800); }
    showResult({ title: 'K.I.A.', tag: 'OPERATIVE DOWN', bad: true, stats: `WAVE ${G.wave} · ${G.kills} KILLS · ${G.headshots} HEADSHOTS · ${acc}% ACCURACY${newBest ? '<br><b>NEW BEST</b>' : ''}`, primary: 'REDEPLOY' });
  }
};

const TDM = {
  // Kill race plus match objectives: a rotating HARDPOINT (+1 every 5 s held by one team alone), a marked HVT on the
  // hostile side (+3 total), dog tags (pick up a hostile's tag for KILL CONFIRMED +1, your squad's to deny it),
  // killstreak rewards (3 UAV sweep · 5 resupply · 7 airstrike) and a first-blood bonus.
  LIMIT: 50, TIME: 480,
  start() {
    this.score = { blue: 0, red: 0 }; this.t = 0; this.respawns = []; this.over = false; this.deaths = 0;
    this.streak = 0; this.firstBlood = false; this.tags = []; this.hvt = null; this.hvtT = 40; this.panelT = 0; this.assignT = 2; this.hp = null; this.hpT = 0;
    const sp = WORLD.spawn;
    this.zone = { blue: new THREE.Vector3(sp.x, 0, sp.z), red: null };
    let far = null, fd = -1;
    for (const p of WORLD.enemySpawns) { const d = Math.hypot(p[0] - sp.x, p[1] - sp.z); if (d > fd && d < (WORLD.indoor ? 70 : 120)) { fd = d; far = p; } }
    const rz = far ? NAV.snap(far[0], far[1]) : NAV.snap(-sp.x, -sp.z);
    this.zone.red = new THREE.Vector3(rz.x, 0, rz.z);
    // BRAVO: four squad mates in four different unit uniforms; hostiles may be elite commandos (by difficulty)
    this.allyUnits = pickAllyUnits(4);
    this.redTypes = ['soldier', 'rifleman', 'rusher', 'heavy', WORLD.indoor ? 'soldier' : 'sniper'];
    if (S.difficulty === 'Legendary') this.redTypes.push('rifleman');
    this.allyUnits.forEach((u, i) => this.spawnAI('blue', u.base, 'BRAVO-' + (i + 2), u));
    this.redTypes.forEach((t) => this.spawnAI('red', t));
    this.moveHardpoint();
    showBanner('TEAM DEATHMATCH', 'FIRST TO ' + this.LIMIT + ' · HOLD THE HARDPOINT · ' + WORLD.name);
    SFX.wave(); AudioSys.gameplayMusic();
  },
  spawnAI(team, type, name, unit) {
    const p = nearPoint(this.zone[team], WORLD.indoor ? 4 : 7);
    const e = spawnEnemy(type, p, { team, name: name || undefined, unit: unit || undefined, squad: team === 'blue' ? 9000 : 9001 });
    e.respawnType = type; e.alerted = true; e.state = e.type === 'sniper' ? 'snipe' : 'advance';
    return e;
  },
  // the hardpoint sits between the two bases and moves every 60 s
  moveHardpoint() {
    if (this.hp) { this.hp.ring.dispose(); removeWaypoint(this.hp.wp); }
    const a = this.zone.blue, b = this.zone.red, t = rand(0.35, 0.65);
    const s = NAV.snap(lerp(a.x, b.x, t) + rand(-12, 12), lerp(a.z, b.z, t) + rand(-12, 12));
    const pos = new THREE.Vector3(s.x, 0, s.z), r = WORLD.indoor ? 5 : 7;
    this.hp = { pos, r, ring: zoneRing(pos, r, 0xffb454), wp: null, holdT: 0, owner: null };
    this.hp.wp = addWaypoint('HARDPOINT', () => pos, 'obj');
    this.hpT = 60;
  },
  update(dt) {
    if (this.over) return;
    this.t += dt;
    for (let i = this.respawns.length - 1; i >= 0; i--) { const r = this.respawns[i]; r.t -= dt; if (r.t <= 0) { this.spawnAI(r.team, r.type, r.name, r.unit); this.respawns.splice(i, 1); } }
    if (G.respawning) { G.respawnT -= dt; document.getElementById('respawnT').textContent = Math.max(1, Math.ceil(G.respawnT)); if (G.respawnT <= 0) respawnPlayer(nearPoint(this.zone.blue, 3)); }
    // hardpoint: count who stands in it
    const hp = this.hp;
    this.hpT -= dt; if (this.hpT <= 0) { this.moveHardpoint(); addKillFeed('HARDPOINT MOVED', false); }
    let blue = !G.dead && !G.respawning && Math.hypot(player.pos.x - hp.pos.x, player.pos.z - hp.pos.z) < hp.r ? 1 : 0, red = 0;
    for (const e of enemies) if (!e.dead && Math.hypot(e.g.position.x - hp.pos.x, e.g.position.z - hp.pos.z) < hp.r) { if (e.team === 'blue') blue++; else red++; }
    const owner = blue && !red ? 'blue' : red && !blue ? 'red' : null;
    if (owner !== hp.owner) { hp.owner = owner; hp.holdT = 0; hp.ring.ring.material.color.setHex(owner === 'blue' ? 0x40a0ff : owner === 'red' ? 0xff3030 : 0xffb454).multiplyScalar(1.6); }
    if (owner) { hp.holdT += dt; if (hp.holdT >= 5) { hp.holdT -= 5; this.score[owner]++; if (owner === 'blue') addKillFeed('+1 HARDPOINT', false); } }
    // send a couple of soldiers from each side to the hardpoint every few seconds
    this.assignT -= dt;
    if (this.assignT <= 0) {
      this.assignT = 5;
      for (const team of ['blue', 'red']) {
        const free = enemies.filter(e => !e.dead && e.team === team && !e.escort && (e.noLosT > 2 || !e.tgt)).slice(0, 2);
        for (const e of free) { e.lkp.copy(hp.pos); e.state = 'advance'; e.stateT = 0; e.path = null; }
      }
    }
    // HVT: one hostile is marked; killing him is worth 3
    this.hvtT -= dt;
    if ((!this.hvt || this.hvt.dead) && this.hvtT <= 0) {
      const reds = enemies.filter(e => !e.dead && e.team === 'red').sort((a, b) => (b.unit ? b.unit.threat : 0) - (a.unit ? a.unit.threat : 0));
      if (reds.length) { this.hvt = reds[0]; this.hvt.hvt = true; this.hvtWp = addWaypoint('HVT · ' + this.hvt.name, () => this.hvt && !this.hvt.dead ? this.hvt.g.position : null, 'hvt'); addKillFeed('★ HVT MARKED · ' + this.hvt.name + ' (+3)', true); }
      this.hvtT = 75;
    }
    // dog tags
    for (let i = this.tags.length - 1; i >= 0; i--) {
      const tg = this.tags[i]; tg.t -= dt; tg.m.rotation.y += dt * 3; tg.m.position.y = 0.45 + Math.sin(this.t * 4 + i) * 0.08;
      const near = !G.dead && Math.hypot(player.pos.x - tg.m.position.x, player.pos.z - tg.m.position.z) < 1.4;
      if (near) { if (tg.team === 'red') { this.score.blue++; addKillFeed('KILL CONFIRMED +1', true); } else addKillFeed('KILL DENIED', false); SFX.pickupAmmo(); }
      if (near || tg.t <= 0) { scene.remove(tg.m); this.tags.splice(i, 1); }
    }
    if (MODE.uavT > 0) MODE.uavT -= dt;
    this.panelT -= dt; if (this.panelT <= 0) { this.panelT = 0.25; this.renderPanel(); }
    if (this.score.blue >= this.LIMIT || this.score.red >= this.LIMIT || this.t >= this.TIME) this.finish();
  },
  onKill(victim, killer) {
    if (this.over) return;
    if (victim.team === 'red') this.score.blue++; else this.score.red++;
    if (!this.firstBlood) { this.firstBlood = true; const tm = victim.team === 'red' ? 'blue' : 'red'; this.score[tm]++; showBanner('FIRST BLOOD', tm === 'blue' ? 'BRAVO DRAWS FIRST · +1' : 'HOSTILES DRAW FIRST'); }
    if (victim.hvt && victim.team === 'red') { this.score.blue += 2; addKillFeed('★ HVT ELIMINATED +3', true); if (this.hvtWp) removeWaypoint(this.hvtWp); this.hvt = null; this.hvtT = 30; }
    // dog tag drop
    const tag = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.24, 0.03), MATLIB.emissive(victim.team === 'red' ? 0xffc040 : 0x40a0ff, 2.5));
    tag.position.copy(victim.g.position).setY(0.45); scene.add(tag); this.tags.push({ m: tag, team: victim.team, t: 20 });
    if (killer === 'player' && victim.team === 'red') {
      this.streak++;
      if (this.streak === 3) { MODE.uavT = 20; showBanner('UAV ONLINE', 'ALL HOSTILES ON THE MINIMAP · 20s'); SFX.rankUp(); }
      else if (this.streak === 5) { refillAmmo(true); if (typeof EQUIP !== 'undefined') EQUIP.reset(); player.hp = player.maxHp; showBanner('RESUPPLY', 'FULL HEALTH · FULL AMMO'); SFX.rankUp(); }
      else if (this.streak === 7) { this.airstrike(); }
    }
    this.respawns.push({ team: victim.team, type: victim.respawnType || victim.type, name: victim.team === 'blue' ? victim.name : null, unit: victim.team === 'blue' ? victim.unit : null, t: victim.team === 'red' ? 7 : 5 });
  },
  airstrike() {
    showBanner('AIRSTRIKE INBOUND', 'HOSTILE POSITIONS MARKED'); SFX.rankUp();
    const reds = enemies.filter(e => !e.dead && e.team === 'red').slice(0, 4);
    reds.forEach((e, i) => setTimeout(() => { if (!this.over) explode(e.g.position.clone().setY(0.5), 1.6, 'player'); }, 1500 + i * 600));
  },
  onPlayerDeath() {
    this.score.red++; this.deaths++; this.streak = 0;
    G.respawning = true; G.respawnT = 4;
    document.getElementById('respawn').classList.remove('hidden'); document.getElementById('hud').classList.add('hidden');
  },
  renderPanel() {
    const hp = this.hp, el = document.getElementById('objPanel');
    const own = hp.owner === 'blue' ? 'BRAVO' : hp.owner === 'red' ? 'HOSTILES' : 'CONTESTED / EMPTY';
    const next = this.streak < 3 ? 'UAV IN ' + (3 - this.streak) : this.streak < 5 ? 'RESUPPLY IN ' + (5 - this.streak) : this.streak < 7 ? 'AIRSTRIKE IN ' + (7 - this.streak) : 'MAX STREAK';
    el.innerHTML = `<div class="oh">TEAM DEATHMATCH · FIRST TO ${this.LIMIT}</div>
      <div class="oi"><span>▸</span>HARDPOINT · ${own} · MOVES IN ${Math.ceil(this.hpT)}s</div>
      <div class="oi${this.hvt && !this.hvt.dead ? ' hot' : ''}"><span>★</span>${this.hvt && !this.hvt.dead ? 'HVT · ' + this.hvt.name + ' (+3)' : 'NEXT HVT IN ' + Math.ceil(Math.max(0, this.hvtT)) + 's'}</div>
      <div class="oi sub">STREAK ${this.streak} · ${next}${MODE.uavT > 0 ? ' · UAV ' + Math.ceil(MODE.uavT) + 's' : ''} · TAGS ${this.tags.length}</div>`;
  },
  finish() {
    this.over = true;
    const win = this.score.blue > this.score.red, draw = this.score.blue === this.score.red;
    for (const e of enemies) if (!e.dead) { e.alerted = false; e.state = 'patrol'; }
    (win ? SFX.newBest : SFX.playerDie).call(SFX);
    const acc = G.shots ? Math.round(G.hits / G.shots * 100) : 0;
    showResult({ title: draw ? 'DRAW' : win ? 'VICTORY' : 'DEFEAT', tag: 'BRAVO ' + this.score.blue + ' — ' + this.score.red + ' HOSTILES', bad: !win && !draw,
      stats: `${G.kills} KILLS · ${this.deaths} DEATHS · ${G.headshots} HEADSHOTS · ${acc}% ACCURACY`, primary: 'PLAY AGAIN' });
  },
  cleanup() { if (this.hp) { this.hp.ring.dispose(); this.hp = null; } for (const tg of this.tags || []) scene.remove(tg.m); this.tags = []; MODE.uavT = 0; },
  isLastEnemy() { return false; },
  hud() { const left = Math.max(0, this.TIME - this.t); return [['BRAVO', this.score.blue], ['HOSTILES', this.score.red], ['TIME', fmtTime(left)]]; }
};


const CAMPAIGN = {
  start(mi) {
    this.mi = mi; this.m = MISSIONS[mi]; this.idx = -1; this.t = 0; this.deaths = 0; this.reinfT = 40; this.done = false; this.escort = null;
    this.rng = mulberry32(1000 + mi * 77);
    // plan every objective location up front so guards can be posted there
    const used = [];
    this.objs = this.m.obj.map(o => {
      const ob = Object.assign({ state: 'pending', count: 0, progress: 0 }, o);
      const n = o.type === 'destroy' || o.type === 'intel' ? o.n : (o.type === 'eliminate' || o.type === 'survive' || o.type === 'extract' ? 0 : 1);
      ob.pts = n ? objectivePoints(n, { rng: this.rng, avoid: used, minD: WORLD.indoor ? 14 : 24 }) : [];
      used.push(...ob.pts);
      return ob;
    });
    // garrison: guards around objective points + roaming patrols
    for (const ob of this.objs) for (const p of ob.pts) {
      if (ob.type === 'hvt') continue;
      const n = ob.type === 'goto' ? 2 : 2 + (Math.random() < 0.4 ? 1 : 0);
      const sq = squadSeq++;
      for (let i = 0; i < n; i++) spawnEnemy(Math.random() < 0.65 ? 'soldier' : 'rifleman', nearPoint(p, 4), { state: 'patrol', post: p, squad: sq });
    }
    for (const p of objectivePoints(3, { rng: this.rng, avoid: used, minD: WORLD.indoor ? 16 : 30 })) spawnEnemy('soldier', nearPoint(p, 2), { state: 'patrol', post: p, squad: squadSeq++ });
    showBanner(this.m.name, 'MISSION ' + (mi + 1) + ' · ' + WORLD.name);
    SFX.wave(); AudioSys.gameplayMusic();
    setTimeout(() => { if (MODE.id === 'campaign' && this.idx < 0) this.next(); }, 1600);
    this.renderPanel();
  },
  next() {
    if (this.idx >= 0) { const cur = this.objs[this.idx]; cur.state = 'done'; this.cleanupObjective(cur); SFX.waveClear(); if (typeof PROGRESSION !== 'undefined' && PROGRESSION.onObjective) try { PROGRESSION.onObjective(250, 'OBJECTIVE'); } catch (err) { } }
    this.idx++;
    if (this.idx >= this.objs.length) return this.complete();
    const ob = this.objs[this.idx]; ob.state = 'active'; ob.t = 0;
    showBanner(this.idx === 0 ? 'OBJECTIVE' : 'OBJECTIVE COMPLETE', ob.label.toUpperCase());
    AudioSys.play('radio', { vol: 1, reverb: 0 });
    this.setupObjective(ob);
    this.renderPanel();
  },
  setupObjective(ob) {
    ob.parts = []; ob.wps = [];
    const P = (p) => () => p;
    switch (ob.type) {
      case 'goto': ob.wps.push(addWaypoint('REACH', P(ob.pts[0]))); ob.zone = zoneRing(ob.pts[0], 3.5, 0xffb454); break;
      case 'eliminate': ob.kills = 0; ob.spawnT = 0; break;
      case 'intel': ob.items = ob.pts.map(p => ({ p, item: intelItem(p), got: false })); ob.items.forEach(it => { it.wp = addWaypoint('INTEL', P(it.p)); }); break;
      case 'destroy': ob.items = ob.pts.map(p => ({ p, prop: targetProp(ob.prop, p), armed: false, timer: 0, gone: false })); ob.items.forEach(it => { it.wp = addWaypoint('DESTROY', P(it.p)); }); break;
      case 'hvt': {
        const p = ob.pts[0];
        ob.hvt = spawnEnemy('officer', p, { state: 'patrol', post: p, hvt: true, name: this.mi === 11 ? 'THE GENERAL' : 'COMMANDER' });
        spawnSquad(3, p, { type: 'rifleman', agent: { state: 'patrol', post: p } });
        ob.wps.push(addWaypoint('HVT', () => ob.hvt && !ob.hvt.dead ? ob.hvt.g.position : null, 'hvt'));
        break;
      }
      case 'rescue': {
        const p = ob.pts[0];
        ob.captive = captiveModel(p); spawnSquad(3, p, { type: 'soldier', agent: { state: 'patrol', post: p } });
        ob.wps.push(addWaypoint('PILOT', P(p), 'ally'));
        break;
      }
      case 'hold': ob.zone = zoneRing(ob.pts[0], 6, 0x4ab0ff); ob.wps.push(addWaypoint('HOLD', P(ob.pts[0]), 'ally')); ob.spawnT = 6; break;
      case 'survive': ob.spawnT = 2; break;
      case 'extract': {
        const pts = objectivePoints(1, { minD: WORLD.indoor ? 18 : 30, rng: this.rng, avoid: [] });
        ob.pt = pts[0]; ob.zone = zoneRing(ob.pt, 4, 0x54ff86); ob.smoke = smokeColumn(ob.pt, 0x60ff90);
        ob.wps.push(addWaypoint('EXTRACT', () => ob.pt, 'extract'));
        break;
      }
    }
  },
  cleanupObjective(ob) {
    for (const w of ob.wps || []) removeWaypoint(w);
    for (const it of ob.items || []) { removeWaypoint(it.wp); if (it.item && !it.got) it.item.dispose(); }
    if (ob.zone) ob.zone.dispose();
    if (ob.captive) { ob.captive.dispose(); ob.captive = null; }
    document.getElementById('holdBar').classList.add('hidden');
  },
  reinforce(n, tier) { const p = spawnPointAway(); spawnSquad(n, p, { tier }); for (const e of enemies) if (!e.dead && e.team === 'red' && e.squad === squadSeq - 1) { e.alerted = true; e.lkp.copy(player.pos); } },
  update(dt) {
    if (this.done || this.idx < 0) return;
    this.t += dt;
    const ob = this.objs[this.idx], pp = player.pos;
    const near = (p, r) => Math.hypot(p.x - pp.x, p.z - pp.z) < r;
    // periodic reinforcements keep the pressure on
    this.reinfT -= dt;
    if (this.reinfT <= 0 && ob.type !== 'survive' && ob.type !== 'eliminate') { this.reinfT = rand(45, 70); if (aliveTeam('red') < 7) this.reinforce(randInt(2, 3), 3); }
    switch (ob.type) {
      case 'goto': if (near(ob.pts[0], 3.5)) this.next(); break;
      case 'eliminate':
        ob.spawnT -= dt;
        if (ob.spawnT <= 0 && aliveTeam('red') < Math.min(5, ob.n - ob.kills)) { ob.spawnT = 6; this.reinforce(Math.min(3, ob.n - ob.kills - aliveTeam('red')), 4); }
        if (ob.kills >= ob.n) this.next();
        break;
      case 'intel':
        for (const it of ob.items) if (!it.got && holdInteract('intel' + ob.items.indexOf(it), 'RECOVER INTEL', 1.5, near(it.p, 2.3), dt)) {
          it.got = true; it.item.dispose(); removeWaypoint(it.wp); ob.count++; SFX.pickupAmmo(); addKillFeed('INTEL RECOVERED ' + ob.count + '/' + ob.n, false); this.renderPanel();
        }
        if (ob.count >= ob.n) this.next();
        break;
      case 'destroy':
        for (const it of ob.items) {
          if (it.gone) continue;
          if (!it.armed && holdInteract('chg' + ob.items.indexOf(it), 'PLANT CHARGE', 2.4, near(it.p, 2.8), dt)) {
            it.armed = true; it.timer = 6; it.prop.light.visible = true; removeWaypoint(it.wp);
            addKillFeed('CHARGE PLANTED — MOVE AWAY', true); AudioSys.tone(880, 0.08, 0.25, 'square');
            for (const e of enemies) if (!e.dead && e.team === 'red' && e.g.position.distanceTo(it.p) < 40) { e.alerted = true; e.lkp.copy(pp); if (e.state === 'patrol') e.state = 'advance'; }
          }
          if (it.armed) {
            const before = it.timer; it.timer -= dt;
            if (Math.floor(before * 2) !== Math.floor(it.timer * 2)) { AudioSys.tone(it.timer < 2 ? 1320 : 990, 0.05, 0.18, 'square'); it.prop.light.visible = !it.prop.light.visible; }
            if (it.timer <= 0) { it.gone = true; it.prop.dispose(); explode(it.p.clone().setY(0.8), 1.5, 'player'); ob.count++; addKillFeed('TARGET DESTROYED ' + ob.count + '/' + ob.n, false); this.renderPanel(); }
          }
        }
        if (ob.count >= ob.n) this.next();
        break;
      case 'hvt': if (ob.hvt && ob.hvt.dead) { addKillFeed('✦ HIGH-VALUE TARGET ELIMINATED', true); this.next(); } break;
      case 'rescue':
        if (ob.captive) ob.captive.update(dt);
        if (holdInteract('rescue', 'FREE THE PILOT', 2.5, near(ob.pts[0], 2.4), dt)) {
          const p = ob.pts[0]; ob.captive.dispose(); ob.captive = null;
          this.escort = spawnEnemy('soldier', p.clone(), { team: 'blue', name: 'PILOT', state: 'escort' });
          this.escort.escort = true; this.escort.t.dmg *= 0.6; this.escort.hp = this.escort.maxhp = 260;
          addKillFeed('PILOT FREED — KEEP HIM ALIVE', false); this.next();
        }
        break;
      case 'hold': {
        const inZone = near(ob.pts[0], 6);
        if (inZone) ob.progress += dt;
        ob.spawnT -= dt;
        if (ob.spawnT <= 0) { ob.spawnT = rand(11, 16); if (aliveTeam('red') < 7) this.reinforce(randInt(2, 3), 4); }
        if (ob.progress >= ob.time) this.next();
        break;
      }
      case 'survive':
        ob.progress += dt; ob.spawnT -= dt;
        if (ob.spawnT <= 0) { ob.spawnT = rand(8, 11); if (aliveTeam('red') < Math.min(7, 3 + Math.floor(ob.progress / 18))) this.reinforce(randInt(2, 3), 5); }
        if (ob.progress >= ob.time) { for (const e of enemies) if (!e.dead && e.team === 'red') { e.alerted = false; e.state = 'patrol'; e.post = spawnPointAway(); } this.next(); }
        break;
      case 'extract': {
        ob.smoke(dt);
        const escortOk = !this.escort || this.escort.dead || near(this.escort.g.position, 30) && Math.hypot(this.escort.g.position.x - ob.pt.x, this.escort.g.position.z - ob.pt.z) < 7;
        if (near(ob.pt, 4) && escortOk) this.next();
        break;
      }
    }
    if (this.escort && this.escort.dead && !this.done) this.fail('THE PILOT WAS KILLED');
    if ((Math.floor(this.t * 4) % 2) === 0) this.renderPanel();
  },
  onKill(victim) { const ob = this.objs[this.idx]; if (ob && ob.type === 'eliminate' && victim.team === 'red') { ob.kills++; this.renderPanel(); } },
  onPlayerDeath() { this.fail('OPERATIVE DOWN'); },
  fail(reason) {
    if (this.done) return; this.done = true;
    this.cleanupAll();
    G.dead = true; mouseFire = false; ads = false; document.exitPointerLock();
    SFX.playerDie();
    showResult({ title: 'MISSION FAILED', tag: reason, bad: true, stats: `${this.m.name} · ${G.kills} KILLS · ${fmtTime(this.t)}`, primary: 'RETRY MISSION' });
  },
  complete() {
    this.done = true; this.cleanupAll();
    const acc = G.shots ? Math.round(G.hits / G.shots * 100) : 0;
    const stars = 1 + (this.t < 360 ? 1 : 0) + (acc >= 35 ? 1 : 0);
    const prev = CAMPAIGN_SAVE.stars[this.m.id] || 0;
    CAMPAIGN_SAVE.stars[this.m.id] = Math.max(prev, stars);
    CAMPAIGN_SAVE.unlocked = Math.max(CAMPAIGN_SAVE.unlocked, Math.min(MISSIONS.length, this.mi + 2));
    SAVE.set('campaign', CAMPAIGN_SAVE);
    G.dead = true; mouseFire = false; ads = false; document.exitPointerLock();
    SFX.newBest();
    const last = this.mi >= MISSIONS.length - 1;
    showResult({ title: 'MISSION COMPLETE', tag: this.m.name + (last ? ' · CAMPAIGN COMPLETE' : ''), good: true,
      stats: `${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}<br>TIME ${fmtTime(this.t)} · ${G.kills} KILLS · ${G.headshots} HEADSHOTS · ${acc}% ACCURACY<br><span class="mut">★ complete · ★ under 6:00 · ★ accuracy 35%+</span>`,
      primary: last ? 'REPLAY MISSION' : 'NEXT MISSION', next: !last });
    buildMissionList();
  },
  cleanupAll() { for (const ob of this.objs) this.cleanupObjective(ob); clearWaypoints(); },
  isLastEnemy() { const ob = this.objs && this.objs[this.idx]; return !!ob && ob.type === 'eliminate' && ob.n - ob.kills === 1; },
  renderPanel() {
    const el = document.getElementById('objPanel'); if (!el) return;
    let h = `<div class="mh">${this.m.name}</div>`;
    this.objs.forEach((ob, i) => {
      if (i > this.idx + 1 && i !== this.objs.length - 1 && this.idx >= 0) return;
      let prog = '';
      if (ob.type === 'eliminate') prog = ` <em>${ob.kills || 0}/${ob.n}</em>`;
      else if (ob.type === 'intel' || ob.type === 'destroy') prog = ` <em>${ob.count}/${ob.n}</em>`;
      else if (ob.type === 'hold') prog = ` <em>${Math.floor(ob.progress)}/${ob.time}s</em>`;
      else if (ob.type === 'survive') prog = ` <em>${fmtTime(Math.max(0, ob.time - ob.progress))}</em>`;
      if (ob.type === 'destroy' && ob.items) { const armed = ob.items.find(it => it.armed && !it.gone); if (armed) prog += ` <em class="warn">${Math.ceil(armed.timer)}s</em>`; }
      h += `<div class="ob ${ob.state}"><span>${ob.state === 'done' ? '✓' : ob.state === 'active' ? '►' : '·'}</span>${ob.label.toUpperCase()}${ob.state === 'active' ? prog : ''}</div>`;
    });
    if (el.innerHTML !== h) el.innerHTML = h;
  },
  hud() { const ob = this.objs[this.idx]; return [['MISSION', (this.mi + 1) + '/' + MISSIONS.length], ['OBJECTIVE', this.idx < 0 ? '—' : Math.min(this.idx + 1, this.objs.length) + '/' + this.objs.length], ['TIME', fmtTime(this.t)]]; }
};

function fmtTime(s) { s = Math.max(0, Math.floor(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }

// ---------- dispatcher ----------
// ---------- survival ----------
// Rounds of assault waves, each with a field objective (supply drop, beacon defence, rescue, commander hunt,
// sabotage, recon sweep, shrinking holdout zone). Ammo is limited and health only regenerates to half: supply drops
// and completed objectives refill both. From round 5 on, every 5th round an extraction can be called (win), or keep
// fighting for a higher score.
const SURV_OBJECTIVES = ['supply', 'beacon', 'rescue', 'commander', 'sabotage', 'recon', 'holdout'];
const SURVIVAL = {
  start() {
    this.round = 0; this.score = 0; this.state = 'inter'; this.t = 5; this.obj = null; this.queue = []; this.spawnT = 0; this.extract = null; this.objDone = 0; this.panelT = 0;
    G.wave = 0;
    showBanner('SURVIVAL', WORLD.name + ' — SCAVENGE · HOLD · SURVIVE'); SFX.wave(); AudioSys.gameplayMusic();
  },
  nextRound() {
    this.round++; G.wave = this.round;
    const last = this.obj ? this.obj.kind : null;
    const pool = SURV_OBJECTIVES.filter(k => k !== last);
    this.setup(this.round === 1 ? 'supply' : pool[Math.floor(Math.random() * pool.length)]);
    const n = Math.round(Math.min(5 + this.round * 2, 24) * diffSettings().waveMult);
    this.queue = []; for (let i = 0; i < n; i++) this.queue.push(pickWeighted(wavePool(this.round + 1)));
    this.spawnT = 3; this.state = 'active';
    showBanner('ROUND ' + this.round, this.obj.label); SFX.wave();
  },
  setup(kind) {
    const far = objectivePoints(3, { minD: WORLD.indoor ? 16 : 26, maxD: WORLD.indoor ? 60 : 90 });
    const p = far[0], o = { kind, pos: p, parts: [], wps: [], done: false, failed: false, t: 0 };
    const keep = (x) => { o.parts.push(x); return x; };
    if (kind === 'supply') {
      o.label = 'RECOVER THE SUPPLY DROP'; const box = keep(intelItem(p)); o.smoke = smokeColumn(p, 0x40ff80);
      o.wps.push(addWaypoint('SUPPLY DROP', () => o.done ? null : p));
      spawnSquad(3, nearPoint(p, 8), { tier: this.round + 1 });
      o.update = (dt) => { o.smoke(dt); const near = Math.hypot(player.pos.x - p.x, player.pos.z - p.z) < 2.3; if (holdInteract('surv_supply', 'OPEN SUPPLY DROP', 2.2, near, dt)) { box.dispose(); refillAmmo(true); player.hp = player.maxHp; addKillFeed('+ SUPPLY DROP · AMMO & MEDKIT', true); return 'done'; } };
    } else if (kind === 'beacon') {
      o.label = 'PLANT THE BEACON AND DEFEND IT (40s)'; o.hold = 40; o.planted = false;
      o.wps.push(addWaypoint('BEACON SITE', () => o.done ? null : p));
      o.update = (dt) => {
        const d = Math.hypot(player.pos.x - p.x, player.pos.z - p.z);
        if (!o.planted) { if (holdInteract('surv_beacon', 'PLANT BEACON', 2.0, d < 2.5, dt)) { o.planted = true; o.ring = keep(zoneRing(p, 7, 0x40c0ff)); o.smoke = smokeColumn(p, 0x40c0ff); for (const e of enemies) if (!e.dead && e.team === 'red') { e.alerted = true; e.lkp.copy(p); } spawnSquad(4, spawnPointAway(), { tier: this.round + 2 }); } return; }
        o.smoke(dt); if (d < 7) o.hold -= dt; o.label = 'DEFEND THE BEACON · ' + Math.ceil(Math.max(0, o.hold)) + 's' + (d < 7 ? '' : ' (GET IN THE ZONE)');
        if (o.hold <= 0) return 'done';
      };
    } else if (kind === 'rescue') {
      o.label = 'RESCUE THE PILOT AND ESCORT HIM TO THE LZ'; const cap = keep(captiveModel(p)); o.freed = false;
      const lz = new THREE.Vector3(WORLD.spawn.x, 0, WORLD.spawn.z);
      o.wps.push(addWaypoint('PILOT', () => o.done ? null : (o.freed ? (o.vip && !o.vip.dead ? o.vip.g.position : null) : p)));
      spawnSquad(3, nearPoint(p, 7), { tier: this.round + 1 });
      o.update = (dt) => {
        if (!o.freed) {
          cap.update(dt);
          if (holdInteract('surv_rescue', 'FREE THE PILOT', 2.5, Math.hypot(player.pos.x - p.x, player.pos.z - p.z) < 2.2, dt)) {
            o.freed = true; cap.dispose(); o.vip = spawnEnemy('soldier', p, { team: 'blue', name: 'PILOT', label: 'PILOT · ESCORT', unit: ALLY_BY_KEY.black_eagle_vanguard }); o.vip.escort = true; o.vip.hp = o.vip.maxhp = 160;
            o.ring = keep(zoneRing(lz, 6, 0x40ff80)); o.wps.push(addWaypoint('LZ', () => o.done ? null : lz));
          }
          return;
        }
        if (o.vip.dead) return 'fail';
        if (Math.hypot(o.vip.g.position.x - lz.x, o.vip.g.position.z - lz.z) < 6) { o.vip.escort = false; return 'done'; }
      };
    } else if (kind === 'commander') {
      const u = HOSTILE_UNITS.filter(h => h.rank <= 4)[Math.floor(Math.random() * 4)];
      o.label = 'HUNT THE COMMANDER · ' + u.name;
      o.hvt = spawnEnemy(u.base, p, { unit: u, hvt: true, state: 'patrol', post: p, squad: squadSeq });
      spawnSquad(3, nearPoint(p, 4), { tier: this.round + 2 });
      o.wps.push(addWaypoint('HVT · ' + u.name, () => o.done || o.hvt.dead ? null : o.hvt.g.position, 'hvt'));
      o.update = () => { if (o.hvt.dead) return 'done'; };
    } else if (kind === 'sabotage') {
      o.label = 'SABOTAGE TWO ENEMY AMMO CACHES'; o.left = 2;
      o.targets = far.slice(0, 2).map((q, i) => ({ q, prop: keep(targetProp(i ? 'radar' : 'generator', q)), armed: false, t: 0 }));
      o.targets.forEach((tg, i) => { tg.wp = addWaypoint('CACHE ' + (i + 1), () => tg.armed ? null : tg.q); o.wps.push(tg.wp); spawnSquad(2, nearPoint(tg.q, 6), { tier: this.round + 1 }); });
      o.update = (dt) => {
        for (const [i, tg] of o.targets.entries()) {
          if (!tg.armed && holdInteract('surv_sab' + i, 'PLANT CHARGE', 2.6, Math.hypot(player.pos.x - tg.q.x, player.pos.z - tg.q.z) < 2.6, dt)) { tg.armed = true; tg.t = 3; tg.prop.light.visible = true; addKillFeed('CHARGE PLANTED · 3s', false); }
          if (tg.armed && tg.t > 0) { tg.t -= dt; if (tg.t <= 0) { explode(new THREE.Vector3(tg.q.x, 0.6, tg.q.z), 1.4, 'player'); tg.prop.dispose(); o.left--; } }
        }
        o.label = 'SABOTAGE THE AMMO CACHES · ' + (2 - o.left) + '/2';
        if (o.left <= 0) return 'done';
      };
    } else if (kind === 'recon') {
      o.label = 'RECON SWEEP · REACH 3 POINTS IN 120s'; o.time = 120; o.pts = far.map(q => ({ q, hit: false }));
      o.pts.forEach((pt, i) => o.wps.push(addWaypoint('RECON ' + (i + 1), () => pt.hit ? null : pt.q)));
      o.update = (dt) => {
        o.time -= dt;
        for (const pt of o.pts) if (!pt.hit && Math.hypot(player.pos.x - pt.q.x, player.pos.z - pt.q.z) < 3) { pt.hit = true; SFX.pickupAmmo(); }
        const n = o.pts.filter(x => x.hit).length; o.label = 'RECON SWEEP · ' + n + '/3 · ' + Math.ceil(Math.max(0, o.time)) + 's';
        if (n === 3) return 'done'; if (o.time <= 0) return 'fail';
      };
    } else { // holdout: a zone that shrinks; outside it you take damage
      o.label = 'HOLDOUT · STAY INSIDE THE SHRINKING ZONE (60s)'; o.time = 60; o.r0 = WORLD.indoor ? 12 : 18; o.ring = keep(zoneRing(p, o.r0, 0xffb040));
      o.wps.push(addWaypoint('HOLDOUT ZONE', () => o.done ? null : p));
      for (const e of enemies) if (!e.dead && e.team === 'red') { e.alerted = true; e.lkp.copy(p); }
      o.update = (dt) => {
        o.time -= dt; const r = Math.max(4.5, o.r0 * (o.time / 60)); o.ring.ring.scale.setScalar(r / o.r0); o.ring.fill.scale.setScalar(r / o.r0);
        if (Math.hypot(player.pos.x - p.x, player.pos.z - p.z) > r && !G.dead) { o.burn = (o.burn || 0) + dt; if (o.burn > 0.5) { o.burn = 0; damagePlayer(4, p); } }
        o.label = 'HOLDOUT · ' + Math.ceil(Math.max(0, o.time)) + 's · ZONE ' + r.toFixed(0) + ' m';
        if (o.time <= 0) return 'done';
      };
    }
    this.obj = o;
  },
  finishObjective(res) {
    const o = this.obj; if (!o || o.done) return;
    o.done = true; for (const w of o.wps) removeWaypoint(w); for (const p of o.parts) if (p.dispose) p.dispose();
    HOLD.key = null; document.getElementById('holdBar').classList.add('hidden');
    if (res === 'done') {
      this.objDone++; const pts = 150 + this.round * 25; this.score += pts;
      refillAmmo(false); player.hp = Math.min(player.maxHp, player.hp + 40);
      showBanner('OBJECTIVE COMPLETE', '+' + pts + ' · AMMO & HEALTH RESTORED'); SFX.waveClear();
    } else { showBanner('OBJECTIVE FAILED', 'NO SUPPLIES THIS ROUND'); SFX.playerDie(); }
  },
  update(dt) {
    if (this.state === 'inter') {
      this.t -= dt;
      if (this.extract) {
        const lz = this.extract.pos;
        if (holdInteract('surv_extract', 'CALL EXTRACTION', 3, Math.hypot(player.pos.x - lz.x, player.pos.z - lz.z) < 3, dt)) return this.win();
      }
      if (this.t <= 0) { if (this.extract) { removeWaypoint(this.extract.wp); this.extract.ring.dispose(); this.extract = null; } this.nextRound(); }
    } else if (this.state === 'active') {
      this.spawnT -= dt;
      if (this.spawnT <= 0 && this.queue.length && aliveTeam('red') < Math.round(Math.min(10, 4 + this.round) * (diffSettings().aliveMul || 1))) {
        spawnEnemy(this.queue.shift(), spawnPointAway()); this.spawnT = (1.6 - Math.min(0.8, this.round * 0.06)) / diffSettings().spawnRate;
      }
      const o = this.obj;
      if (o && !o.done) { const res = o.update(dt); if (res) this.finishObjective(res); }
      if (!this.queue.length && !aliveTeam('red') && (!o || o.done)) {
        this.state = 'inter'; this.t = 10; this.score += 50 * this.round;
        player.hp = Math.min(player.maxHp * 0.5, Math.max(player.hp, player.hp + 15));
        if (this.round % 5 === 0) {
          const lz = new THREE.Vector3(WORLD.spawn.x, 0, WORLD.spawn.z); this.t = 25;
          this.extract = { pos: lz, ring: zoneRing(lz, 3, 0x40ff80), wp: addWaypoint('EXTRACTION', () => lz) };
          showBanner('ROUND ' + this.round + ' SURVIVED', 'EXTRACTION AVAILABLE AT THE LZ (25s) — OR KEEP FIGHTING');
        } else showBanner('ROUND ' + this.round + ' SURVIVED', 'NEXT ASSAULT IN 10s');
        SFX.waveClear();
      }
    }
    this.panelT -= dt; if (this.panelT <= 0) { this.panelT = 0.25; this.renderPanel(); }
  },
  renderPanel() {
    const el = document.getElementById('objPanel'), o = this.obj;
    el.innerHTML = `<div class="oh">SURVIVAL · ROUND ${this.round}</div>` +
      (o ? `<div class="oi${o.done ? ' done' : ''}"><span>${o.done ? '✓' : '▸'}</span>${o.label}</div>` : '') +
      `<div class="oi sub">SCORE ${this.score} · OBJECTIVES ${this.objDone}</div>` + (this.extract ? '<div class="oi hot">▸ EXTRACTION AVAILABLE — HOLD E AT THE LZ</div>' : '');
  },
  win() {
    this.state = 'over';
    const acc = G.shots ? Math.round(G.hits / G.shots * 100) : 0, key = 'surv_' + MAPS[S.map].key, b = bests[key] || { wave: 0, kills: 0 };
    if (this.score > (b.kills || 0)) { bests[key] = { wave: this.round, kills: this.score }; SAVE.set('bests', bests); }
    SFX.newBest();
    showResult({ title: 'EXTRACTED', tag: 'SURVIVED ' + this.round + ' ROUNDS', good: true, stats: `SCORE ${this.score} · ${G.kills} KILLS · ${this.objDone} OBJECTIVES · ${acc}% ACCURACY`, primary: 'PLAY AGAIN' });
  },
  isLastEnemy() { return this.state === 'active' && !this.queue.length && aliveTeam('red') === 1; },
  hud() { return [['ROUND', this.round], ['HOSTILES', this.queue.length + aliveTeam('red')], ['SCORE', this.score]]; },
  onKill(victim, killer) { if (victim.team === 'red' && killer === 'player') this.score += victim.unit ? 40 + victim.unit.threat : 20; },
  onPlayerDeath() {
    const acc = G.shots ? Math.round(G.hits / G.shots * 100) : 0, key = 'surv_' + MAPS[S.map].key, b = bests[key] || { wave: 0, kills: 0 };
    const best = this.score > (b.kills || 0); if (best) { bests[key] = { wave: this.round, kills: this.score }; SAVE.set('bests', bests); }
    showResult({ title: 'K.I.A.', tag: 'FELL IN ROUND ' + this.round, bad: true, stats: `SCORE ${this.score} · ${G.kills} KILLS · ${this.objDone} OBJECTIVES · ${acc}% ACCURACY${best ? '<br><b>NEW BEST</b>' : ''}`, primary: 'REDEPLOY' });
  },
  cleanup() { if (this.obj && !this.obj.done) { this.obj.done = true; for (const p of this.obj.parts) if (p.dispose) p.dispose(); } if (this.extract) { this.extract.ring.dispose(); this.extract = null; } }
};

const MODE = {
  id: 'endless', impl: ENDLESS, peace: false, noDrops: false, dmgScale: 1, infiniteAmmo: false, uavT: 0, regenCap: null,
  begin(id) {
    this.id = id; this.impl = { campaign: CAMPAIGN, tdm: TDM, endless: ENDLESS, survival: SURVIVAL }[id] || TDM;
    this.uavT = 0; this.regenCap = id === 'survival' ? 50 : null;
    this.peace = false; this.noDrops = id === 'tdm'; this.dmgScale = 1;
    this.infiniteAmmo = id === 'tdm' || id === 'endless';
    document.body.dataset.mode = id;
    document.getElementById('objPanel').classList.toggle('hidden', !['campaign', 'tdm', 'survival'].includes(id));
    if (id === 'campaign') this.impl.start(S.mission); else this.impl.start();
    updateAmmoHUD();
  },
  update(dt) { this.impl.update(dt); updateWaypoints(); },
  onKill(victim, killer, zone) { if (this.impl.onKill) this.impl.onKill(victim, killer, zone); },
  onPlayerDeath() { this.impl.onPlayerDeath(); },
  isLastEnemy() { return this.impl.isLastEnemy(); },
  hud() { return this.impl.hud(); },
  end() { if (this.impl === CAMPAIGN && CAMPAIGN.objs) CAMPAIGN.cleanupAll(); if (this.impl && this.impl.cleanup) this.impl.cleanup(); clearWaypoints(); HOLD.key = null; document.getElementById('holdBar').classList.add('hidden'); document.getElementById('respawn').classList.add('hidden'); G.respawning = false; }
};

// ---------- result screen (death / mission end / match end) ----------
function showResult(o) {
  if (G.playing && !G.resultShown && typeof PROGRESSION !== 'undefined' && PROGRESSION.onMatchEnd) { G.resultShown = true; try { PROGRESSION.onMatchEnd({ won: !!o.good, mode: S.mode, score: G.kills || 0 }); } catch (err) { console.warn(err); } }
  G.dead = true; mouseFire = false; ads = false;
  if (CINE.active) CINE.end();
  document.exitPointerLock();
  const scr = document.getElementById('death');
  scr.classList.toggle('good', !!o.good); scr.classList.toggle('bad', !!o.bad);
  document.getElementById('resultTitle').textContent = o.title;
  document.getElementById('resultTag').textContent = o.tag || '';
  document.getElementById('deathStats').innerHTML = o.stats || '';
  document.getElementById('restartBtn').textContent = o.primary || 'REDEPLOY';
  document.getElementById('restartBtn').dataset.next = o.next ? '1' : '';
  scr.classList.remove('hidden');
  document.getElementById('hud').classList.add('hidden');
  document.getElementById('respawn').classList.add('hidden');
  AudioSys.music('menu');
}

// ---------- menu: mode tabs, mission list, briefing ----------
function buildMissionList() {
  const list = document.getElementById('missionList'); if (!list) return;
  list.innerHTML = '';
  MISSIONS.forEach((m, i) => {
    const locked = i >= CAMPAIGN_SAVE.unlocked, st = CAMPAIGN_SAVE.stars[m.id] || 0;
    const b = document.createElement('button');
    b.className = 'chip map mission' + (locked ? ' locked' : '') + (i === S.mission ? ' active' : '');
    const M = MAPS[mapIndexByKey(m.map)];
    b.innerHTML = `<span class="mimg" style="background-image:url('${typeof mapPreviewURL === 'function' ? mapPreviewURL(M) : ''}')"></span><small>${String(i + 1).padStart(2, '0')}</small><em class="mn">${m.name}</em><span class="desc">${M ? M.name : ''}</span><span class="best">${locked ? 'LOCKED' : st ? '★'.repeat(st) + '☆'.repeat(3 - st) : 'NEW'}</span>`;
    b.addEventListener('click', () => { if (locked) { SFX.uiBack(); return; } selectMission(i); });
    b.addEventListener('mouseenter', () => { initAudio(); SFX.uiHover(); });
    list.appendChild(b);
  });
  renderBriefing();
}
function renderBriefing() {
  const m = MISSIONS[S.mission], el = document.getElementById('briefing'); if (!el || !m) return;
  el.innerHTML = `<div class="bh">MISSION ${S.mission + 1} · ${m.name}</div><p>${m.brief}</p><div class="bo">OBJECTIVES</div>` +
    m.obj.map((o, k) => `<div class="ob"><span>${k + 1}</span>${o.label.toUpperCase()}${o.n ? ' (' + o.n + ')' : o.time ? ' (' + o.time + 's)' : ''}</div>`).join('');
}
function selectMission(i) {
  if (G.playing) return;
  S.mission = i; SAVE.set('settings', S); initAudio(); SFX.uiClick();
  buildMissionList(); if (typeof updateMenuSub === 'function') updateMenuSub();
  const mi = mapIndexByKey(MISSIONS[i].map);
  if (currentMapIndex !== mi) { S.map = mi; buildMap(mi); updateMapButtons(); } else S.map = mi;
}
function selectMode(id, keepMap) {
  if (!MODE_INFO[id]) id = 'tdm';
  const changed = S.mode !== id;
  S.mode = id; SAVE.set('settings', S);
  document.querySelectorAll('#modeTabs .tab').forEach(t => t.classList.toggle('active', t.dataset.mode === id));
  document.getElementById('modeDesc').textContent = MODE_INFO[id].desc;
  document.getElementById('campaignCol').classList.toggle('hidden', id !== 'campaign');
  document.getElementById('mapsCol').classList.toggle('hidden', id === 'campaign');
  const dl = id === 'campaign' ? 'START MISSION' : 'DEPLOY';
  const sp = document.querySelector('#playBtn .dl'); if (sp) sp.textContent = dl;
  if (id === 'campaign') selectMission(Math.min(S.mission, CAMPAIGN_SAVE.unlocked - 1));
  // every other mode opens on Random Outdoor (Random Indoor is the first indoor choice)
  else if (!keepMap && changed && !G.playing) {
    const mi = mapIndexByKey(DEFAULT_MAP_KEY);
    if (currentMapIndex !== mi) { S.map = mi; buildMap(mi); } else S.map = mi;
    SAVE.set('map', mi); updateMapButtons();
  }
  if (typeof updateMapButtons === 'function') updateMapButtons();
}
document.querySelectorAll('#modeTabs .tab').forEach(t => {
  t.addEventListener('click', () => { initAudio(); SFX.uiClick(); selectMode(t.dataset.mode); });
  t.addEventListener('mouseenter', () => { initAudio(); SFX.uiHover(); });
});
