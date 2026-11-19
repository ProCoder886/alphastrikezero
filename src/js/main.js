// ---------- Main loop, menus & boot ----------
const SAVE = {
  db: null, mem: {},
  init() {
    return new Promise(res => {
      try {
        const r = indexedDB.open('asz-upgraded', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('kv');
        r.onsuccess = () => { SAVE.db = r.result; res(); };
        r.onerror = () => res(); r.onblocked = () => res();
      } catch (e) { res(); }
    });
  },
  get(k) {
    return new Promise(res => {
      if (!SAVE.db) return res(SAVE.mem[k]);
      try { const t = SAVE.db.transaction('kv').objectStore('kv').get(k); t.onsuccess = () => res(t.result); t.onerror = () => res(SAVE.mem[k]); }
      catch (e) { res(SAVE.mem[k]); }
    });
  },
  set(k, v) {
    SAVE.mem[k] = v;
    if (!SAVE.db) return;
    try { SAVE.db.transaction('kv', 'readwrite').objectStore('kv').put(JSON.parse(JSON.stringify(v)), k); } catch (e) { }
  }
};

let bests = {};
// first launch: pick a preset from the GPU (integrated / mobile GPUs start on MEDIUM, software rendering on LOW)
function detectQuality() {
  try {
    const gl = renderer.getContext(), ext = gl.getExtension('WEBGL_debug_renderer_info');
    const name = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '';
    if (/swiftshader|llvmpipe|software|basic render/i.test(name)) return 'low';
    if (TOUCH.enabled) return /apple gpu/i.test(name) && (window.devicePixelRatio || 1) >= 2 ? 'medium' : 'low';   // phones: keep the frame rate
    if (/intel|uhd|iris|mali|adreno|powervr|apple gpu|vega \d+ graphics|radeon\(tm\) graphics/i.test(name)) return 'medium';
  } catch (e) { }
  return 'high';
}
// Graphics AUTO (the default): every location starts on its own preset - indoor locations HIGH, outdoor locations
// MEDIUM on desktop / web, and HIGH on every location on phones and tablets. Picking LOW / MEDIUM / HIGH in
// Settings fixes the preset instead. (The adaptive ladder still trims effects when the frame rate drops.)
function autoQualityFor(indoor) { return TOUCH.detect() ? 'high' : indoor ? 'high' : 'medium'; }
function autoQuality(indoor) {
  if (!S.qAuto) return;
  const q = autoQualityFor(indoor);
  if (S.quality !== q) { S.quality = q; QLEVEL = 0; DYN.scale = 1; DYN.restoreWait = 15; applyQuality(); }
  if (document.getElementById('toggleQuality')) updateToggleButtons();
}
// location preview: a screenshot of the real location (src/assets/previews, made by tools/devpreviews.js)
function mapPreviewURL(M) { return M ? assetURL('assets/previews/' + M.key + '.jpg') : ''; }
function buildMapMenu() {
  const groups = { indoor: document.getElementById('mapsIndoor'), outdoor: document.getElementById('mapsOutdoor') };
  groups.indoor.innerHTML = ''; groups.outdoor.innerHTML = '';
  // the random battlefields head each list (they are the default locations)
  const order = MAPS.map((M, i) => i).sort((a, b) => (MAPS[b].random ? 1 : 0) - (MAPS[a].random ? 1 : 0));
  order.forEach((i) => {
    const M = MAPS[i];
    const b = document.createElement('button');
    b.className = 'chip map' + (M.random ? ' rnd' : ''); b.dataset.m = i; b.title = M.name + (M.desc ? ' · ' + M.desc : '');
    b.innerHTML = `<span class="mimg" style="background-image:url('${mapPreviewURL(M)}')"></span>${M.random ? '<i class="defTag">NEW EVERY DEPLOY</i>' : ''}<span class="mname">${M.name}</span><span class="desc">${M.desc || ''}</span><span class="best" id="best${i}"></span>`;
    b.addEventListener('click', () => selectMap(i));
    b.addEventListener('mouseenter', () => { initAudio(); SFX.uiHover(); });
    groups[M.group].appendChild(b);
  });
}
function refreshBests() {
  MAPS.forEach((M, i) => { const b = bests[M.key], el = document.getElementById('best' + i); if (el) { el.textContent = b ? `BEST W${b.wave} · ${b.kills}K` : ''; el.classList.toggle('none', !b); } });
}
function updateMapButtons() {
  document.querySelectorAll('#mapsCol .chip.map').forEach(c => c.classList.toggle('active', parseInt(c.dataset.m) === S.map));
  const mi = document.getElementById('mapInfo'), M = MAPS[S.map];
  if (mi && M) mi.innerHTML = '<b>' + M.name + '</b> · ' + (M.desc || '');
  updateFeatured(); updateMenuSub();
}
// FEATURED LOCATION: the selected location's preview and name
function updateFeatured() {
  const M = MAPS[S.map], f = document.getElementById('featured'); if (!f || !M) return;
  const img = f.querySelector('.fimg'), url = mapPreviewURL(M);
  if (img.dataset.url !== url) { img.dataset.url = url; img.style.backgroundImage = `url('${url}')`; }
  f.querySelector('b').textContent = M.name;
}
// "TEAM DEATHMATCH · RANDOM OPS · OUTDOOR · AMATEUR"
function updateMenuSub() {
  const el = document.getElementById('menuSub'), M = MAPS[S.map]; if (!el || !M) return;
  const mode = MODE_INFO[S.mode] ? MODE_INFO[S.mode].label : '';
  const loc = S.mode === 'campaign' && MISSIONS[S.mission] ? 'MISSION ' + (S.mission + 1) + ' · ' + MISSIONS[S.mission].name : M.name;
  const where = M.group === 'indoor' ? 'INDOOR' : 'OUTDOOR', parts = [mode, loc];
  if (!loc.includes(where)) parts.push(where);
  parts.push(S.difficulty.toUpperCase());
  el.textContent = parts.join(' · ');
}
// LOADOUT strip: the weapons in the seven slots with their rendered pictures (click: the Armory)
let _loThumbT = 0;
function renderMenuLoadout() {
  const box = document.getElementById('menuLoadout'); if (!box || typeof LOADOUT === 'undefined' || !ARSENAL.ready) return;
  const slots = LOADOUT_SLOTS.filter(s => !s.gren);
  box.innerHTML = '';
  let missing = [];
  for (const sl of slots) {
    const id = LOADOUT.get(sl.g, sl.i), e = id && ARSENAL.byId[id], cat = e && ARSENAL.cat(e.category);
    const b = document.createElement('button'); b.className = 'lo'; b.type = 'button';
    const t = id ? ARSENAL.thumb(id) : '';
    if (id && !t) missing.push(id);
    b.innerHTML = `<small>${sl.key} · ${cat ? cat.short : sl.label}</small>${t ? `<img alt="" src="${t}">` : ''}<b>${e ? e.name : 'EMPTY'}</b>`;
    b.title = sl.label + (e ? ' · ' + e.name : '');
    b.onclick = () => { ARMORY.show(); };
    b.addEventListener('mouseenter', () => { initAudio(); SFX.uiHover(); });
    box.appendChild(b);
  }
  // render the missing pictures a few at a time (the Armory keeps them for its own cards too)
  clearTimeout(_loThumbT);
  if (missing.length) _loThumbT = setTimeout(() => {
    const t0 = performance.now();
    while (missing.length && performance.now() - t0 < 40) { const id = missing.shift(); try { if (!ARSENAL._thumbs[id]) ARSENAL._thumbs[id] = ARMORY.thumb(id, 300, 132); } catch (err) { console.warn('thumb', id, err); } }
    renderMenuLoadout();
  }, 60);
}
// DEADLIEST HOSTILE card: unit fabric behind a masked operator silhouette
const HOSTILE_SIL = '<svg viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="hsg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#20232a"/><stop offset="1" stop-color="#0a0b0e"/></linearGradient></defs><rect width="64" height="64" fill="rgba(0,0,0,.35)"/><path d="M8 64c1-12 9-18 18-20h12c9 2 17 8 18 20z" fill="url(#hsg)"/><path d="M19 30c0-11 6-18 13-18s13 7 13 18v6c0 6-6 10-13 10s-13-4-13-10z" fill="#15171c"/><path d="M17 27c0-10 7-17 15-17s15 7 15 17l-2 2H19z" fill="#2a2e36"/><rect x="20" y="28" width="24" height="7" rx="3" fill="#ff2d5e"/><rect x="21" y="29" width="22" height="2" rx="1" fill="#ffb3c6" opacity=".7"/><path d="M22 38h20l-2 6H24z" fill="#0c0d10"/></svg>';
const DIFF_DESC = {
  Amateur: 'Fewer, slower hostiles who miss more often. No elite commandos.',
  Pro: 'Balanced firefights. Hostiles use cover and flank; some elite commandos join them.',
  'Top Class': 'Elite tactics: faster fire, dives and jumps out of your fire, crouch-firing, pushes while you reload. Commandos are common.',
  Legendary: 'Pro-league difficulty for elite players: near-instant reactions, relentless accurate fire, coordinated rushes and the deadliest commandos.'
};
function updateDifficultyButtons() {
  document.querySelectorAll('#difficultyOptions .chip.diff').forEach(c => c.classList.toggle('active', c.dataset.d === S.difficulty));
  const d = document.getElementById('diffDesc'); if (d) d.textContent = DIFF_DESC[S.difficulty] || '';
}
// ---------- menu windows: settings, how to play, enemy intel ----------
function openWin(id) {
  for (const w of document.querySelectorAll('.win')) w.classList.toggle('hidden', w.id !== id);
  initAudio(); SFX.uiClick();
  if (id === 'intelWin') { buildIntelPanel(document.getElementById('intelList')); INTEL_PAGER.layout(); }
  if (id === 'settingsWin' || id === 'howWin') TOUCH.fsLabel();
}
function closeWins() { let any = false; for (const w of document.querySelectorAll('.win')) { if (!w.classList.contains('hidden')) any = true; w.classList.add('hidden'); } return any; }
function updateDeadliest() {
  const u = HOSTILE_UNITS[0], el = document.getElementById('deadliest'); if (!el) return;
  el.innerHTML = `<div class="sw" style="background-image:url('${assetURL('assets/uniforms/' + u.fabric + '.jpg')}')">${HOSTILE_SIL}</div><div class="dInfo"><b>${u.name}</b><span>${u.cls}</span><i>RANK #1 · THREAT ${u.threat}</i></div>`;
}
document.getElementById('settingsBtn').onclick = () => openWin('settingsWin');
document.getElementById('howBtn').onclick = () => openWin('howWin');
document.getElementById('intelBtn').onclick = () => openWin('intelWin');
document.getElementById('pauseSettingsBtn').onclick = () => openWin('settingsWin');
document.getElementById('deadliest').onclick = () => openWin('intelWin');
document.getElementById('viewIntelBtn').onclick = () => openWin('intelWin');
// left navigation: HOME / PLAY / LOCATIONS change the main panel, the rest open their screens
function menuNav(to) {
  const menu = document.getElementById('menu');
  if (['home', 'play', 'locations'].includes(to)) {
    menu.dataset.view = to;
    for (const b of document.querySelectorAll('#menuNav .nav')) b.classList.toggle('active', b.dataset.nav === to);
    initAudio(); SFX.uiClick();
    if (to === 'locations' && S.mode === 'campaign') selectMode('tdm');
    document.getElementById('menuMain').scrollTop = 0;
    return;
  }
  if (to === 'armory') ARMORY.show();
  else if (to === 'intel') openWin('intelWin');
  else if (to === 'settings') openWin('settingsWin');
  else if (to === 'how') openWin('howWin');
}
for (const b of document.querySelectorAll('#menuNav .nav')) { b.onclick = () => menuNav(b.dataset.nav); b.addEventListener('mouseenter', () => { initAudio(); SFX.uiHover(); }); }
// ENTER deploys from the main menu
document.addEventListener('keydown', (ev) => {
  if (ev.code !== 'Enter' && ev.code !== 'NumpadEnter') return;
  if (G.playing || document.getElementById('menu').classList.contains('hidden') || (typeof ARMORY !== 'undefined' && ARMORY.open)) return;
  if ([...document.querySelectorAll('.win')].some(w => !w.classList.contains('hidden'))) return;
  ev.preventDefault(); SFX.uiConfirm(); startGame();
});
for (const w of document.querySelectorAll('.win')) {
  w.addEventListener('click', (ev) => { if (ev.target === w) { closeWins(); SFX.uiBack(); } });
  w.querySelector('.winX').onclick = () => { closeWins(); SFX.uiBack(); };
}
document.addEventListener('keydown', (ev) => { if (ev.code === 'Escape' && closeWins()) ev.stopPropagation(); }, true);
function updateToggleButtons() {
  const t = (id, v) => { document.getElementById(id).textContent = v ? 'ON' : 'OFF'; };
  t('toggleMinimap', S.showMinimap); t('toggleBlood', S.showBlood); t('toggleFPS', S.showFPS); t('toggleAutoReload', S.autoReload);
  t('toggleHitIndicator', S.hitIndicator); t('toggleDmgNumbers', S.showDamageNumbers); t('toggleKillCam', S.killCam);
  t('toggleSlowmo', S.slowmoKills); t('toggleMotionBlur', S.motionBlur); t('toggleSSAO', S.ssao);
  document.getElementById('toggleTouch').textContent = (S.touchMode || 'auto').toUpperCase();
  document.getElementById('toggleTouchAim').textContent = S.touchAim === 'hold' ? 'HOLD' : 'TOGGLE';
  document.getElementById('toggleNvgMode').textContent = S.nvgMode === 'blue' ? 'BLUE' : 'GREEN';
  document.getElementById('toggleQuality').textContent = (S.qAuto ? 'AUTO · ' : '') + S.quality.toUpperCase();
  document.getElementById('fps').style.display = S.showFPS ? '' : 'none';
}
function selectMap(i) {
  if (G.playing) return;
  S.map = i; updateMapButtons(); SAVE.set('map', i);
  initAudio(); SFX.uiClick();
  buildMap(i);
}
function selectDifficulty(name) {
  if (!DIFFICULTY_SETTINGS[name]) return;
  S.difficulty = name; updateDifficultyButtons(); updateMenuSub(); SAVE.set('settings', S);
  initAudio(); SFX.uiClick();
}
function applySettingsUI() {
  const set = (id, vid, v, txt) => { document.getElementById(id).value = v; document.getElementById(vid).textContent = txt ?? v; };
  set('sensR', 'sensV', S.sens); set('adsSensR', 'adsSensV', S.adsSens); set('fovR', 'fovV', S.fov);
  set('touchSensR', 'touchSensV', S.touchSens);
  set('volR', 'volV', Math.round(S.vol * 100)); set('sfxVolR', 'sfxVolV', Math.round(S.sfxVol * 100)); set('musicVolR', 'musicVolV', Math.round(S.musicVol * 100));
  updateMapButtons(); updateDifficultyButtons(); updateToggleButtons(); updateDeadliest();
}
// the loading screen art also in the single-file build (its assets are embedded)
if (window.ASSET_DATA) { const la = document.querySelector('#loadingScreen .lsArt'); if (la) la.style.backgroundImage = `url('${assetURL('assets/ui/loading.webp')}')`; }

document.querySelectorAll('.btn, .chip').forEach(b => b.addEventListener('mouseenter', () => { initAudio(); SFX.uiHover(); }));
document.querySelectorAll('#difficultyOptions .chip.diff').forEach(b => b.addEventListener('click', () => selectDifficulty(b.dataset.d)));
const bind = (id, vid, fn) => { const el = document.getElementById(id); el.addEventListener('input', () => { fn(parseFloat(el.value)); document.getElementById(vid).textContent = el.value; SAVE.set('settings', S); SFX.uiSlider(); }); };
bind('sensR', 'sensV', v => S.sens = v);
bind('adsSensR', 'adsSensV', v => S.adsSens = v);
bind('fovR', 'fovV', v => S.fov = v);
bind('touchSensR', 'touchSensV', v => S.touchSens = v);
bind('volR', 'volV', v => { S.vol = v / 100; if (masterGain) masterGain.gain.value = S.vol; });
bind('sfxVolR', 'sfxVolV', v => { S.sfxVol = v / 100; if (sfxGain) sfxGain.gain.value = S.sfxVol; });
bind('musicVolR', 'musicVolV', v => { S.musicVol = v / 100; if (musicGain) musicGain.gain.value = S.musicVol; });
const tog = (id, key) => { document.getElementById(id).onclick = () => { S[key] = !S[key]; updateToggleButtons(); SAVE.set('settings', S); SFX.uiToggle(); }; };
tog('toggleMinimap', 'showMinimap'); tog('toggleBlood', 'showBlood'); tog('toggleFPS', 'showFPS'); tog('toggleAutoReload', 'autoReload');
tog('toggleHitIndicator', 'hitIndicator'); tog('toggleDmgNumbers', 'showDamageNumbers'); tog('toggleKillCam', 'killCam');
tog('toggleSlowmo', 'slowmoKills'); tog('toggleMotionBlur', 'motionBlur'); tog('toggleSSAO', 'ssao');
document.getElementById('toggleTouch').onclick = () => { S.touchMode = S.touchMode === 'auto' ? 'on' : S.touchMode === 'on' ? 'off' : 'auto'; TOUCH.refresh(); updateToggleButtons(); SAVE.set('settings', S); SFX.uiToggle(); };
document.getElementById('toggleTouchAim').onclick = () => { S.touchAim = S.touchAim === 'hold' ? 'toggle' : 'hold'; updateToggleButtons(); SAVE.set('settings', S); SFX.uiToggle(); };
document.getElementById('toggleFullscreen').onclick = () => { TOUCH.fs(!TOUCH.inFs()); SFX.uiToggle(); };
bindSubtabs('setTabs', '#settingsWin .settings'); bindSubtabs('howTabs', '#howWin .howCols');
const INTEL_PAGER = new Pager(document.getElementById('intelList'), document.getElementById('intelPager'));
document.getElementById('toggleNvgMode').onclick = () => { S.nvgMode = S.nvgMode === 'blue' ? 'green' : 'blue'; updateToggleButtons(); NVG.hud(); SAVE.set('settings', S); SFX.uiToggle(); };
document.getElementById('toggleQuality').onclick = () => {
  const q = ['auto', 'low', 'medium', 'high'], nx = q[(q.indexOf(S.qAuto ? 'auto' : S.quality) + 1) % q.length];
  if (nx === 'auto') { S.qAuto = true; S.quality = autoQualityFor(WORLD.indoor); } else { S.qAuto = false; S.quality = nx; }
  QLEVEL = 0; DYN.scale = 1; DYN.restoreWait = 15;
  applyQuality(); updateToggleButtons(); SAVE.set('settings', S); SFX.uiToggle();
  if (!G.playing && ASSETS.done) buildMap(S.map); // light caps / weather density apply on rebuild
};
// start menu music on the first interaction (autoplay policy)
// Browsers only allow audio after a real user gesture: (re)start the context on every gesture until it runs.
const firstGesture = () => {
  initAudio();
  if (!AC) return;
  if (AC.state !== 'running') AC.resume().catch(() => { });
  if (!G.playing) AudioSys.music('menu');
  if (AC.state === 'running') { window.removeEventListener('pointerdown', firstGesture, true); window.removeEventListener('keydown', firstGesture, true); window.removeEventListener('touchend', firstGesture, true); }
};
window.addEventListener('pointerdown', firstGesture, true); window.addEventListener('keydown', firstGesture, true); window.addEventListener('touchend', firstGesture, true);
document.addEventListener('visibilitychange', () => { if (AC && !document.hidden && AC.state === 'suspended' && navigator.userActivation && navigator.userActivation.hasBeenActive) AC.resume().catch(() => { }); });

const clock = new THREE.Clock();
let wallT = 0, menuT = 0, slowAudio = 0;
const _mainV = new THREE.Vector3();

// ---------- dynamic resolution + adaptive quality: hold 60+ FPS in every preset ----------
// Drops render scale fast when frames run long and probes back up slowly (with back-off). When the scale is
// already at its floor, the ladder takes off the most expensive effects one step at a time (MSAA, bloom,
// shadow rate) and gives them back after a long stretch of headroom at full resolution.
const DYN = { scale: 1, cap: 1, avg: 16.7, frames: 0, acc: 0, goodT: 0, wait: 3, last: 0, t: 0, levelT: 0, restoreWait: 15, restoredT: -99 };
function setPixelRatioCap() {
  DYN.cap = Math.min(window.devicePixelRatio || 1, Q().prCap);
  applyPixelRatio();
}
function applyPixelRatio() {
  const pr = Math.max(0.5, DYN.cap * DYN.scale);
  // post on: the canvas keeps native density, only the world renders at `pr` and the grade pass upscales it
  const canvasPR = POST.enabled ? Math.max(pr, Math.min(window.devicePixelRatio || 1, 1.5)) : pr;
  if (Math.abs(renderer.getPixelRatio() - canvasPR) > 0.001 || Math.abs(RENDER_PR - pr) > 0.001 || DYN.post !== POST.enabled) {
    RENDER_PR = pr; DYN.post = POST.enabled; renderer.setPixelRatio(canvasPR); onResize();
  }
}
function updateDynRes(raw) {
  if (raw > 0.25) return; // stalls (loading, tab switches) say nothing about steady-state speed
  DYN.t += raw;
  const ms = Math.min(raw * 1000, 100);
  DYN.avg += (ms - DYN.avg) * 0.1;
  DYN.frames++; DYN.acc += raw;
  if (DYN.acc >= 0.5) {
    const fps = DYN.frames / DYN.acc;
    document.getElementById('fps').textContent = Math.round(fps) + ' FPS · ' + Math.round(DYN.scale * 100) + '% RES' + (QLEVEL ? ' · Q-' + QLEVEL : '');
    DYN.frames = 0; DYN.acc = 0;
  }
  if (document.hidden || DYN.t - DYN.last < 0.5) return;
  // The image is kept sharp: resolution only gives way down to 82 % before the effect ladder is used, and never
  // below 70 % (it used to fall to 50 %, which blurred every surface and then had to be over-sharpened).
  const floor = QLEVEL >= 3 ? 0.7 : 0.82;
  if (DYN.avg > 17.6) {
    // below ~57 FPS: step resolution down (bigger step when far off), then take effects off
    if (DYN.scale > floor + 1e-3) { DYN.scale = Math.max(floor, DYN.scale - (DYN.avg > 24 ? 0.1 : 0.05)); DYN.last = DYN.t; applyPixelRatio(); if (DYN.goodT < DYN.wait) DYN.wait = Math.min(12, DYN.wait * 2); }
    else if (QLEVEL < 3 && DYN.t - DYN.levelT > 1.5) {
      if (DYN.t - DYN.restoredT < 12) DYN.restoreWait = Math.min(240, DYN.restoreWait * 2); // restoring did not hold: wait longer next time
      QLEVEL++; DYN.levelT = DYN.last = DYN.t; applyQuality(true);
    }
    DYN.goodT = 0;
  } else {
    DYN.goodT += raw;
    const roomy = DYN.avg < 12; // lots of headroom: climb back quickly
    if (DYN.goodT > (roomy ? Math.min(DYN.wait, 1.5) : DYN.wait) && DYN.scale < 1) { DYN.scale = Math.min(1, DYN.scale + (roomy ? 0.08 : 0.04)); DYN.last = DYN.t; DYN.goodT = 0; applyPixelRatio(); }
    else if (DYN.scale >= 1 && QLEVEL > 0 && DYN.goodT > DYN.restoreWait) { QLEVEL--; DYN.levelT = DYN.restoredT = DYN.last = DYN.t; DYN.goodT = 0; applyQuality(true); }
    if (DYN.goodT > 20) DYN.wait = Math.max(3, DYN.wait * 0.5);
  }
}

function animate() {
  requestAnimationFrame(animate);
  const raw = clock.getDelta();
  updateDynRes(raw);
  frame(Math.min(raw, 0.05));
}

function frame(dtReal) {

  // while waiting to respawn (Team Deathmatch) the world keeps running
  const active = G.playing && !G.paused && (!G.dead || G.respawning);
  CINE.update(dtReal);

  // world time scale (slow motion): bullet cam, precision-kill slow motion, hold breath
  let targetScale = 1, slow = 0;
  if (active) SLOWMO.update(dtReal); else if (!G.playing) SLOWMO.reset();
  if (CINE.active) { G.worldScale = CINE.worldScale; slow = 1; }
  else if (SLOWMO.active && active) { G.worldScale = SLOWMO.scale(); slow = 0.45 + SLOWMO.level * 0.18; G.bulletTime = 1; }
  else {
    G.bulletTime = 0;
    if (G.holdingBreath && active) { targetScale = 0.6; slow = 0.3; }
    G.worldScale = damp(G.worldScale, targetScale, 10, dtReal);
  }
  const ns = damp(slowAudio, slow, 6, dtReal);
  if (Math.abs(ns - slowAudio) > 0.005 || (slow === 0 && slowAudio !== 0 && ns < 0.01)) { slowAudio = ns < 0.01 && slow === 0 ? 0 : ns; AudioSys.setSlowmo(slowAudio); }
  const dtW = dtReal * G.worldScale;

  const U = POST.grade.uniforms;
  U.slowmo.value = damp(U.slowmo.value, CINE.active ? 1 : (SLOWMO.active ? SLOWMO.grade() : (G.holdingBreath ? 0.3 : 0)), SLOWMO.active ? 14 : 8, dtReal);
  if (!CINE.active) U.letterbox.value = damp(U.letterbox.value, SLOWMO.letterbox(), 6, dtReal);
  NVG.update(dtReal);
  TOUCH.update(); UIFIT.tick(); INVWHEEL.update();
  U.damage.value = Math.max(0, U.damage.value - dtReal * 1.4);
  U.flash.value = Math.max(0, U.flash.value - dtReal * 2.5);

  weaponRig.visible = G.playing && !G.dead && !G.cine;

  if (active) {
    const pn = performance.now();
    // real interval between frames (ms): shot visuals waiting for their report land within half of it
    G.frameMs = G.perfNow ? (G.frameMs || 16.7) * 0.85 + clamp(pn - G.perfNow, 4, 100) * 0.15 : 16.7;
    G.time += dtReal; G.perfNow = pn; G.frameNo = (G.frameNo || 0) + 1; G.dtAvg = (G.dtAvg || dtReal) * 0.9 + dtReal * 0.1;
    if (!G.cine && !G.dead) { updatePlayer(dtReal); camera.updateMatrixWorld(true); updateWeapons(dtReal); } else LASER.hide();
    updateEnemies(dtW);
    updateGrenades(dtW);
    if (!G.cine) MODE.update(dtW);
    updatePickups(dtReal);
    updateWeaponDrops(dtReal);
    updateParticles(dtW, dtReal);
    updateHUD(dtReal);
    drawMinimap();
  } else if (!G.playing) {
    menuT += dtReal * 0.08;
    const mc = WORLD.menuCam || { y: 13, r: 26 };
    const b = WORLD.bounds, cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2;
    camera.position.set(cx + Math.cos(menuT) * mc.r, mc.y, cz + Math.sin(menuT) * mc.r);
    if (WORLD.indoor) camera.lookAt(cx + Math.cos(menuT + 1.2) * (mc.r + 12), mc.y - 0.6, cz + Math.sin(menuT + 1.2) * (mc.r + 12));
    else camera.lookAt(cx, 2, cz);
    camera.fov += (62 - camera.fov) * Math.min(1, dtReal * 3); camera.updateProjectionMatrix();
    updateParticles(dtReal, dtReal);
  }

  wallT += dtReal;
  updateWeather(dtW, wallT);
  for (const f of mapAnimators) f(wallT, dtReal);
  updateSky(dtReal);
  LIGHTPOOL.update(dtReal);

  // sun shadow follows the action (snapped to texels to avoid shimmering)
  if (moon.visible) {
    const focus = G.playing ? (CINE.active ? (CINE.shot && CINE.shot.point) || player.pos : player.pos) : _mainV.set((WORLD.bounds.x0 + WORLD.bounds.x1) / 2, 0, (WORLD.bounds.z0 + WORLD.bounds.z1) / 2);
    const tx = 90 / 2048;
    const fx = Math.round(focus.x / tx) * tx, fz = Math.round(focus.z / tx) * tx;
    moon.target.position.set(fx, 0, fz);
    moon.position.set(fx + sunDir.x * 100, sunDir.y * 100, fz + sunDir.z * 100);
    moon.target.updateMatrixWorld();
  }
  AudioSys.updateListener(activeCamera);
  updateSunGlare(dtReal);
  SPR.update(activeCamera);
  renderFrame(dtReal);
  if (ARMORY.open) ARMORY.draw(dtReal);
}

// The web build loads its assets as files: that needs a web server (Live Server, a game host, build.py serve).
const fromDisk = location.protocol === 'file:' && !window.ASSET_DATA;
if (fromDisk) document.getElementById('loadText').innerHTML = 'THIS BUILD LOADS ITS ASSETS FROM <b>src/assets</b>.<br>OPEN IT WITH VS CODE LIVE SERVER (OR ANY WEB SERVER),<br>OR RUN <b>python build.py offline</b> FOR A DOUBLE-CLICK VERSION.';
// downloads start right away, in parallel with reading the save data
const assetsReady = fromDisk ? null : ASSETS.init();
if (!fromDisk) SAVE.init().then(async () => {
  const st = await SAVE.get('settings');
  if (st) {
    for (const k in S) if (st[k] !== undefined && typeof st[k] === typeof S[k]) S[k] = st[k];
    // settings from before revision 5: Top Class became the default difficulty
    if (!(st.rev >= 5)) { S.difficulty = 'Top Class'; S.rev = 5; SAVE.set('settings', S); }
    // revision 6: touch controls are for phones and tablets; a desktop save that forced them on goes back to AUTO
    if (!(st.rev >= 6)) { if (S.touchMode === 'on') S.touchMode = 'auto'; S.rev = 6; SAVE.set('settings', S); }
  }
  else if (detectQuality() === 'low' && !TOUCH.detect()) { S.qAuto = false; S.quality = 'low'; }   // software rendering only
  TOUCH.refresh();
  bests = (await SAVE.get('bests')) || {};
  CAMPAIGN_SAVE = Object.assign({ unlocked: 1, stars: {} }, (await SAVE.get('campaign')) || {});
  S.mission = clamp(S.mission, 0, CAMPAIGN_SAVE.unlocked - 1);
  buildMapMenu();
  buildMissionList();
  // every launch: Team Deathmatch on Random Outdoor (Free Mode is gone; old saves fall back too)
  S.mode = 'tdm'; S.map = mapIndexByKey(DEFAULT_MAP_KEY);
  applySettingsUI();
  refreshBests();
  BOOT.mark('settings');
  // weapon catalogue (weapons, attachments, sounds) + saved loadout and progression
  const arsenalReady = ARSENAL.init().then(() => typeof PROGRESSION !== 'undefined' && PROGRESSION.init ? PROGRESSION.init() : null).then(() => LOADOUT.load()).catch(e => console.warn('arsenal', e));
  await assetsReady;
  await arsenalReady;
  ARMORY.init();
  { const hide0 = ARMORY.hide.bind(ARMORY); ARMORY.hide = function () { hide0(); renderMenuLoadout(); }; }   // a changed loadout shows in the menu
  if (typeof TEXPOOL !== 'undefined') TEXPOOL.init();   // materials of the first random battlefield download in the background
  BOOT.mark('assets');
  document.getElementById('bloodScreen').style.backgroundImage = 'url("' + assetURL('assets/fx/blood_screen.png') + '")';
  applyQuality();
  if (S.mode === 'campaign') S.map = mapIndexByKey(MISSIONS[S.mission].map);
  buildMap(S.map);
  BOOT.mark('map');
  selectMode('tdm', true);
  document.getElementById('loadingScreen').classList.add('hidden');
  document.getElementById('menu').classList.remove('hidden');
  updateMapButtons(); renderMenuLoadout();
  BOOT.report();
});

animate();
