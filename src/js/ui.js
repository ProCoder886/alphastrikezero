// ---------- UI & HUD ----------
const HM = document.getElementById('hitmarker');
let hmT = 0;
function flashHitmarker(hs, kill) {
  HM.style.opacity = 1; HM.classList.toggle('hs', !!hs); HM.classList.toggle('kill', !!kill); hmT = kill ? 0.3 : 0.14;
}

function addKillFeed(text, hs) {
  const kf = document.getElementById('killfeed');
  const d = document.createElement('div');
  if (hs) d.className = 'hs';
  d.textContent = text;
  kf.prepend(d);
  while (kf.children.length > 5) kf.removeChild(kf.lastChild);
  setTimeout(() => { if (d.parentNode) d.parentNode.removeChild(d); }, 4000);
}

function updateAmmoHUD() {
  const w = INVENTORY.curW();
  if (!w) return;
  document.getElementById('weaponName').textContent = w.def.label;
  document.getElementById('ammoMag').textContent = w.mag;
  document.getElementById('ammoRes').textContent = '/ ' + (infiniteAmmo(w) ? '∞' : w.reserve);
  document.getElementById('ammoMag').classList.toggle('low', w.mag <= Math.ceil(w.def.mag * 0.25));
}

function updateInventoryUI() {
  const container = document.getElementById('inventoryUI');
  container.innerHTML = '';
  const n = INVENTORY.slots.length;
  for (let k = -2; k <= 2; k++) {
    const i = (INVENTORY.activeIdx + k + n) % n;
    const w = INVENTORY.slots[i];
    const d = document.createElement('div');
    d.className = 'inv-slot' + (k === 0 ? ' active' : '');
    const keyHint = i < 9 ? (i + 1) : (i === 9 ? '0' : '·');
    d.textContent = keyHint + '  ' + (w ? w.def.label : 'EMPTY');
    container.appendChild(d);
  }
  if (typeof TOUCH !== 'undefined') TOUCH.updateSlots();
}

const mmCtx = document.getElementById('minimap').getContext('2d');
function drawMinimap() {
  if (!S.showMinimap) { document.getElementById('minimapWrap').style.display = 'none'; return; }
  mmT -= 1 / 60; if (mmT > 0) return; mmT = 0.05;
  document.getElementById('minimapWrap').style.display = '';
  const s = WORLD.indoor ? 2.6 : 1.7;
  mmCtx.fillStyle = 'rgba(10,14,20,0.92)'; mmCtx.fillRect(0, 0, 180, 180);
  mmCtx.save();
  mmCtx.translate(90, 90);
  mmCtx.rotate(player.yaw);
  mmCtx.fillStyle = 'rgba(214,220,228,0.17)';
  for (const r of mapRects) {
    const x = (r.x - player.pos.x) * s, z = (r.z - player.pos.z) * s;
    if (Math.abs(x) > 140 || Math.abs(z) > 140) continue;
    mmCtx.fillRect(x - r.w * s / 2, z - r.d * s / 2, r.w * s, r.d * s);
  }
  mmCtx.fillStyle = '#54ff86';
  for (const p of pickups) mmCtx.fillRect((p.m.position.x - player.pos.x) * s - 2, (p.m.position.z - player.pos.z) * s - 2, 4, 4);
  mmCtx.fillStyle = '#ffaa33';
  for (const w of weaponDrops) mmCtx.fillRect((w.mesh.position.x - player.pos.x) * s - 2, (w.mesh.position.z - player.pos.z) * s - 2, 4, 4);
  for (const e of enemies) {
    if (e.dead) continue;
    // allies always, hostiles only while they are firing / recently visible
    if (e.team === 'red' && !(MODE.uavT > 0) && e.losT <= 0 && e.noLosT > 3) continue; // a UAV sweep shows them all
    mmCtx.save();
    mmCtx.translate((e.g.position.x - player.pos.x) * s, (e.g.position.z - player.pos.z) * s);
    mmCtx.rotate(-e.g.rotation.y + Math.PI);
    mmCtx.fillStyle = e.team === 'blue' ? '#4ab0ff' : e.hvt ? '#ffd040' : e.t.sniper ? '#ff66ff' : '#ff3333';
    mmCtx.beginPath(); mmCtx.moveTo(0, -5); mmCtx.lineTo(3.5, 4); mmCtx.lineTo(-3.5, 4); mmCtx.closePath(); mmCtx.fill();
    mmCtx.restore();
  }
  mmCtx.restore();
  mmCtx.save(); mmCtx.translate(90, 90);
  mmCtx.fillStyle = '#ffffff'; mmCtx.strokeStyle = '#e62a5e'; mmCtx.lineWidth = 1.8;
  mmCtx.beginPath(); mmCtx.moveTo(0, -8); mmCtx.lineTo(5, 6); mmCtx.lineTo(-5, 6); mmCtx.closePath(); mmCtx.fill(); mmCtx.stroke();
  mmCtx.restore();
}

// damage direction indicator
function showHitIndicator(fromPos) {
  const c = document.getElementById('hitIndicators');
  const ang = Math.atan2(fromPos.x - player.pos.x, fromPos.z - player.pos.z);
  const rel = angleDiff(ang, player.yaw + Math.PI);
  const d = document.createElement('div'); d.className = 'hitInd';
  d.style.transform = `translate(-50%,-50%) rotate(${-rel}rad) translateY(-120px)`;
  c.appendChild(d);
  setTimeout(() => d.classList.add('fade'), 50);
  setTimeout(() => d.remove(), 1300);
}

// floating damage numbers
const dmgNums = [];
function spawnDamageNumber(pos, value, head) {
  const d = document.createElement('div'); d.className = 'dmgNum' + (head ? ' hs' : ''); d.textContent = value;
  document.getElementById('dmgNums').appendChild(d);
  dmgNums.push({ el: d, pos: pos.clone().add(new THREE.Vector3(rand(-0.2, 0.2), 0.3, rand(-0.2, 0.2))), t: 0.9 });
}
const _uV = new THREE.Vector3();
function updateDamageNumbers(dt) {
  for (let i = dmgNums.length - 1; i >= 0; i--) {
    const n = dmgNums[i]; n.t -= dt; n.pos.y += dt * 0.8;
    if (n.t <= 0) { n.el.remove(); dmgNums.splice(i, 1); continue; }
    _uV.copy(n.pos).project(activeCamera);
    if (_uV.z > 1) { n.el.style.opacity = 0; continue; }
    n.el.style.left = ((_uV.x + 1) / 2 * innerWidth) + 'px'; n.el.style.top = ((1 - _uV.y) / 2 * innerHeight) + 'px';
    n.el.style.opacity = Math.min(1, n.t * 2);
  }
}

// cached DOM handles + throttled text updates (10 Hz) keep layout work off the frame budget
const HUDEL = {}; let hudT = 0, mmT = 0;
function el(id) { return HUDEL[id] || (HUDEL[id] = document.getElementById(id)); }
function setText(id, v) { const e = el(id); v = String(v); if (e.textContent !== v) e.textContent = v; }
function updateHUD(dt) {
  hudT -= dt;
  if (hudT <= 0) { hudT = 0.1; updateHUDText(); }
  updateHUDFast(dt);
}
function updateHUDText() {
  setText('healthNum', Math.ceil(player.hp));
  const hf = el('healthFill');
  hf.style.width = player.hp.toFixed(1) + '%';
  hf.style.background = player.hp > 35 ? 'var(--amber)' : 'var(--red)';
  el('stamFill').style.width = player.stamina.toFixed(1) + '%';
  el('lowhp').style.opacity = player.hp < 35 ? (0.9 - player.hp / 50) : 0;
  const top = MODE.hud();
  for (let i = 0; i < 3; i++) { setText('tl' + i, top[i] ? top[i][0] + ' ' : ''); setText('tv' + i, top[i] ? top[i][1] : ''); }
  setText('diffBadge', S.difficulty.toUpperCase());
  el('bulletTimeBar').classList.toggle('hidden', !(G.bulletTime > 0 || G.holdingBreath));
}
function updateHUDFast(dt) {
  // breath meter (scoped)
  const w = INVENTORY.curW();
  el('breathBar').style.opacity = w && w.def.scope && adsT > 0.85 ? 1 : 0;
  el('breathFill').style.width = G.breath.toFixed(1) + '%';

  // crosshair from the real spread cone
  const ch = document.getElementById('crosshair');
  ch.style.opacity = adsT > 0.3 ? 0 : 1;
  if (w && adsT <= 0.3) {
    const sp = currentSpread(w);
    const px = Math.tan(sp) / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * (innerHeight / 2) + 6;
    const t = Math.min(90, px);
    ch.querySelector('.t').style.transform = `translateY(-${t}px)`;
    ch.querySelector('.b').style.transform = `translateY(${t}px)`;
    ch.querySelector('.l').style.transform = `translateX(-${t}px)`;
    ch.querySelector('.r').style.transform = `translateX(${t}px)`;
  }
  if (hmT > 0) { hmT -= dt; if (hmT <= 0) HM.style.opacity = 0; }
  if (bannerT > 0) { bannerT -= dt; if (bannerT <= 0) document.getElementById('waveBanner').style.opacity = 0; }
  if (G.hintT > 0) { G.hintT -= dt; if (G.hintT <= 0) document.getElementById('hint').style.display = 'none'; }
  updateDamageNumbers(dt);
}

let bannerT = 0;
function showBanner(h, p) {
  document.getElementById('bannerH').textContent = h;
  document.getElementById('bannerP').textContent = p;
  const b = document.getElementById('waveBanner'); b.style.opacity = 1;
  const hh = document.getElementById('bannerH'); hh.style.animation = 'none'; void hh.offsetWidth; hh.style.animation = '';
  bannerT = 3.0;
}
