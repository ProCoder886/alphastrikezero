// ---------- Game flow: start / reset / death / menu (mode rules live in modes.js) ----------
function die() {
  G.dead = true; mouseFire = false; ads = false;
  SFX.playerDie();
  if (CINE.active) CINE.end();
  MODE.onPlayerDeath();
}

function resetGame() {
  for (const e of enemies) removeEnemy(e); enemies.length = 0;
  for (const p of pickups) scene.remove(p.m); pickups.length = 0;
  for (const p of particles) removeFx(p.obj); particles.length = 0; SPR.clear(); BOOM.clear();
  for (const g of grenades) scene.remove(g.m); grenades.length = 0;
  for (const w of weaponDrops) scene.remove(w.mesh); weaponDrops.length = 0;
  DECALS.clear();
  squadSeq = 0;
  G.wave = 0; G.kills = 0; G.shots = 0; G.hits = 0; G.headshots = 0; G.dead = false; G.respawning = false; G.hintT = 10; G.bulletTime = 0; G.camShake = 0; G.breath = 100;
  SLOWMO.reset(); NVG.reset();
  const sp = WORLD.spawn;
  player.pos.set(sp.x, 0, sp.z); player.vel.set(0, 0, 0);
  player.yaw = sp.yaw || 0; player.pitch = 0; player.hp = 100; player.stamina = 100; player.prone = false; player.leanK = 0; player.leanOff = 0; MELEE_P.t = 0;
  recoilP = recoilY = 0; adsT = 0; ads = false;
  activeCamera = camera;
  INVENTORY.init(); G.resultShown = false;
  if (typeof EQUIP !== 'undefined') { EQUIP.active = 'lethal'; EQUIP.newGame(); }
  if (typeof INVWHEEL !== 'undefined') { INVWHEEL.hide(); INVWHEEL.prepare(); }
  prewarmWeapons();
  document.getElementById('hint').style.display = '';
  document.getElementById('interactHint').style.display = 'none';
  updateAmmoHUD();
}

function lockPointer() {
  if (TOUCH.enabled) { G.paused = false; document.getElementById('pause').classList.add('hidden'); return; }   // touch: no pointer lock
  try { const p = renderer.domElement.requestPointerLock(); if (p && p.catch) p.catch(() => { }); } catch (e) { }
}

function startGame() {
  initAudio(); if (AC && AC.state === 'suspended') AC.resume();
  if (TOUCH.enabled) TOUCH.fs(true);   // full screen from the deploy tap (browsers only allow it inside a gesture)
  MODE.end();
  if (S.mode === 'campaign') S.map = mapIndexByKey(MISSIONS[S.mission].map);
  const build = currentMapIndex !== S.map || MAPS[S.map].random;
  // the pointer is locked while the click is still fresh: building a large battlefield can take several seconds
  lockPointer();
  const go = () => {
    if (build) buildMap(S.map);
    resetGame();
    G.playing = true;
    camera.fov = S.fov; camera.updateProjectionMatrix();
    document.getElementById('loadingScreen').classList.add('hidden');
    document.getElementById('menu').classList.add('hidden');
    document.getElementById('death').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
    document.getElementById('pause').classList.add('hidden');
    document.getElementById('loadingScreen').classList.remove('deploying');
    if (!locked) lockPointer();
    AudioSys.ambience(WORLD.env.ambience || null, WORLD.env.ambVol || 0.4);
    MODE.begin(S.mode);
    showLocationName();
  };
  if (build && !G.devSync) {
    // show what is happening before the (synchronous) build starts
    const ls = document.getElementById('loadingScreen'), lt = document.getElementById('loadText'), bar = document.getElementById('loadBar');
    lt.textContent = MAPS[S.map].random ? 'BUILDING A NEW BATTLEFIELD...' : 'DEPLOYING TO ' + MAPS[S.map].name + '...'; if (bar) bar.style.width = '100%';
    ls.classList.add('deploying'); ls.classList.remove('hidden');
    setTimeout(go, 60);
  } else go();
}
// the location's name on screen for 3 s as the match starts, then it fades away (two words for the random ones)
function showLocationName() {
  const el = document.getElementById('locBanner'); if (!el) return;
  const M = MAPS[S.map], name = WORLD.locName || (M && M.random ? WORLD.name : (M ? M.name : ''));
  if (!name) return;
  el.querySelector('b').textContent = name;
  el.querySelector('small').textContent = WORLD.locKind || (M && M.group === 'indoor' ? 'INDOOR LOCATION' : 'OUTDOOR LOCATION');
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  clearTimeout(showLocationName.t); showLocationName.t = setTimeout(() => el.classList.remove('show'), 3000);
}
// CHANGE LOCATION draws from a shuffled bag of 5 RANDOM OPS · OUTDOOR and 5 RANDOM OPS · COMPOUND (indoor) restarts,
// kept across sessions: every 10 location changes are exactly 5 outdoor and 5 indoor, in random order
function nextRandomLocation() {
  const keys = ['random_outdoor', 'random_ops'];
  let bag = [];
  try { bag = JSON.parse(localStorage.getItem('asz_loc_bag') || '[]').filter(k => keys.includes(k)); } catch (e) { bag = []; }
  if (!bag.length) {
    bag = [0, 1, 2, 3, 4].flatMap(() => keys.slice());
    for (let i = bag.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [bag[i], bag[j]] = [bag[j], bag[i]]; }
  }
  const key = bag.shift();
  try { localStorage.setItem('asz_loc_bag', JSON.stringify(bag)); } catch (e) { }
  return mapIndexByKey(key);
}
// pause menu RESTART: a brand-new game in the same mode, optionally with a random loadout and / or a new random
// location - RANDOM OPS outdoor or indoor (campaign missions keep their own location)
function restartFromPause() {
  SFX.uiConfirm();
  const nw = document.getElementById('optNewWeapons'), nl = document.getElementById('optNewLocation');
  if (CINE.active) CINE.end();
  if (nw && nw.checked && typeof LOADOUT !== 'undefined' && ARSENAL.ready) LOADOUT.randomize();
  if (nl && nl.checked && S.mode !== 'campaign') {
    S.map = nextRandomLocation(); SAVE.set('map', S.map);
    currentMapIndex = -1;   // always a freshly generated battlefield
    updateMapButtons();
  }
  document.getElementById('pause').classList.add('hidden');
  G.paused = false; G.dead = false;
  startGame();
}

document.getElementById('playBtn').onclick = () => { SFX.uiConfirm(); startGame(); };
document.getElementById('restartBtn').onclick = (ev) => {
  SFX.uiConfirm();
  if (ev.currentTarget.dataset.next && S.mode === 'campaign') { S.mission = Math.min(MISSIONS.length - 1, S.mission + 1); SAVE.set('settings', S); buildMissionList(); }
  startGame();
};
function toMenu() {
  TOUCH.release();
  G.playing = false; G.dead = false; G.paused = false; G.respawning = false; LASER.hide();
  if (CINE.active) CINE.end();
  MODE.end();
  for (const e of enemies) removeEnemy(e); enemies.length = 0;
  document.getElementById('death').classList.add('hidden');
  document.getElementById('pause').classList.add('hidden');
  document.getElementById('hud').classList.add('hidden');
  document.getElementById('menu').classList.remove('hidden');
  if (typeof renderMenuLoadout === 'function') { renderMenuLoadout(); updateMapButtons(); }
  AudioSys.music('menu');
}
document.getElementById('menuBtn').onclick = () => { SFX.uiBack(); toMenu(); };
document.getElementById('resumeBtn').onclick = () => { lockPointer(); };
document.getElementById('pauseRestartBtn').onclick = () => restartFromPause();
for (const id of ['optNewWeapons', 'optNewLocation']) document.getElementById(id).addEventListener('change', () => { initAudio(); SFX.uiToggle(); });
document.getElementById('quitBtn').onclick = () => { SFX.uiBack(); toMenu(); };

document.addEventListener('pointerlockchange', () => {
  locked = document.pointerLockElement === renderer.domElement;
  if (locked) { G.paused = false; document.getElementById('pause').classList.add('hidden'); }
  else if (G.playing && (!G.dead || G.respawning)) {
    G.paused = true; mouseFire = false; ads = false;
    preparePause();
    document.getElementById('pause').classList.remove('hidden');
  }
});

// pause screen: where the operation is, and CHANGE LOCATION only where it applies (not in campaign missions)
function preparePause() {
  const M = MAPS[S.map], loc = document.getElementById('pauseLoc');
  if (loc) loc.textContent = (MODE_INFO[S.mode] ? MODE_INFO[S.mode].label : '') + ' · ' + (WORLD.locName || (M ? M.name : '')) + ' · ' + S.difficulty.toUpperCase();
  const row = document.getElementById('optNewLocationRow'); if (row) row.classList.toggle('off', S.mode === 'campaign');
}
