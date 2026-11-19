// ---------- Layout manager (UIFIT), pagers, sub-tabs and touch controls ----------
// UIFIT keeps <html> classes in step with the window: `rsp` (compact layout: portrait, phones, small windows),
// `portrait` / `landscape`, `touch`, and the UI scale --s (1rem = 10px * --s). responsive.css does the rest.
// Pager shows as many items of a list as fit its box and pages through the rest, so no screen ever scrolls.
// TOUCH reads the thumbs: a floating joystick (left), look by dragging anywhere else, action buttons (right).
const UIFIT = {
  s: 1, rsp: false, portrait: false, touch: false, w: 0, h: 0, listeners: [], _t: 0, _key: '', safe: { x0: 46, x1: 800, y0: 46, y1: 500 },
  init() {
    this.apply(true);
    const sched = () => { clearTimeout(this._t); this._t = setTimeout(() => this.apply(), 50); };
    window.addEventListener('resize', sched);
    window.addEventListener('orientationchange', () => { sched(); setTimeout(() => this.apply(), 350); });   // iOS reports the old size at first
    if (window.visualViewport) window.visualViewport.addEventListener('resize', sched);
  },
  onChange(fn) { this.listeners.push(fn); },
  apply(force) {
    const w = Math.max(1, window.innerWidth), h = Math.max(1, window.innerHeight);
    const touch = typeof TOUCH !== 'undefined' && TOUCH.enabled;
    const portrait = h > w, rsp = touch || portrait || h < 640 || w < 1100;   // touch devices always get the scaled layout (big thumb targets, even on a tablet)
    let s = 1;
    if (rsp) s = portrait ? clamp(Math.min(w / 390, h / 780), 0.72, 1.5) : clamp(Math.min(h / 400, w / 800), 0.78, 1.5);
    s = Math.round(s * 100) / 100;
    const u = 10 * s;
    // where world markers may sit: clear of the corner HUD, the controls and the weapon strip
    let safe = rsp ? (portrait ? { x0: 4 * u, x1: w - 4 * u, y0: 28 * u, y1: h - 33 * u } : { x0: 28 * u, x1: w - 28 * u, y0: 12 * u, y1: h - 7 * u }) : { x0: 46, x1: w - 46, y0: 46, y1: h - 46 };
    if (safe.x1 - safe.x0 < 60 || safe.y1 - safe.y0 < 60) safe = { x0: 46, x1: w - 46, y0: 46, y1: h - 46 };
    this.safe = safe;
    const key = [w, h, s, rsp, portrait, touch].join('|');
    if (!force && key === this._key) return;
    this._key = key; this.w = w; this.h = h; this.s = s; this.rsp = rsp; this.portrait = portrait; this.touch = touch;
    const root = document.documentElement;
    root.style.setProperty('--s', String(s));
    root.classList.toggle('rsp', rsp); root.classList.toggle('portrait', portrait); root.classList.toggle('landscape', !portrait); root.classList.toggle('touch', touch);
    for (const fn of this.listeners) { try { fn(); } catch (e) { console.warn('uifit', e); } }
  },
  rem() { return 10 * this.s; },
  // transient centre messages (banner, kill cam, slow-motion tag) keep the unlock toasts out of their way
  tick() {
    const E = (id) => document.getElementById(id);
    const busy = parseFloat(E('waveBanner').style.opacity || 0) > 0.2 || E('killcam').classList.contains('show') || E('slowmoTag').classList.contains('show');
    if (busy !== this._busy) { this._busy = busy; document.body.classList.toggle('hudBusy', busy); }
  }
};

// ---------- pager: fit as many items as the box holds, page through the rest ----------
const PAGERS = [];
class Pager {
  // list: container whose children are the items (needs a fixed / flexible height and overflow:hidden);
  // bar: element that gets the < n / m > controls; always: also page on large screens (otherwise only in the compact layout)
  constructor(list, bar, opts = {}) {
    this.list = list; this.bar = bar; this.always = !!opts.always; this.page = 0; this.pages = [[0, 0]]; this.focus = -1;
    PAGERS.push(this);
    let sx = 0, sy = 0, sid = null;
    list.addEventListener('pointerdown', (e) => { sx = e.clientX; sy = e.clientY; sid = e.pointerId; });
    list.addEventListener('pointerup', (e) => {
      if (sid !== e.pointerId) return; sid = null;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.4 && this.pages.length > 1) {
        this.go(this.page + (dx < 0 ? 1 : -1));
        const stop = (ev) => { ev.stopPropagation(); ev.preventDefault(); list.removeEventListener('click', stop, true); };
        list.addEventListener('click', stop, true); setTimeout(() => list.removeEventListener('click', stop, true), 60);
      }
    });
  }
  get active() { return this.always || UIFIT.rsp; }
  items() { return [...this.list.children]; }
  visible() { return this.list.getClientRects().length > 0; }
  // recompute the pages for the current box; keep `focusIdx` (an item index) on screen
  layout(focusIdx) {
    const items = this.items();
    if (focusIdx !== undefined) this.focus = focusIdx;
    if (!this.visible()) return;
    if (!this.active || !items.length) { for (const it of items) it.classList.remove('pgHide'); this.pages = [[0, items.length]]; this.page = 0; this._bar(); return; }
    const compute = () => {
      for (const it of items) it.classList.add('pgHide');
      const pages = []; let start = 0;
      while (start < items.length) {
        let end = start;
        while (end < items.length) {
          items[end].classList.remove('pgHide');
          if (this.list.scrollHeight > this.list.clientHeight + 1 || this.list.scrollWidth > this.list.clientWidth + 1) { items[end].classList.add('pgHide'); break; }
          end++;
        }
        if (end === start) { items[start].classList.remove('pgHide'); end = start + 1; }
        for (let i = start; i < end; i++) items[i].classList.add('pgHide');
        pages.push([start, end]); start = end;
      }
      return pages;
    };
    this.bar.classList.remove('on');
    let pages = compute();
    if (pages.length > 1) { this.bar.classList.add('on'); this._bar(true); pages = compute(); }
    this.pages = pages;
    const f = this.focus >= 0 ? pages.findIndex(p => this.focus >= p[0] && this.focus < p[1]) : -1;
    this.page = f >= 0 ? f : clamp(this.page, 0, pages.length - 1);
    this._show();
  }
  _show() {
    const items = this.items(), [a, b] = this.pages[this.page] || [0, items.length];
    items.forEach((it, i) => it.classList.toggle('pgHide', !(i >= a && i < b)));
    this._bar();
  }
  _bar(quick) {
    const bar = this.bar, n = this.pages.length;
    if (!bar) return;
    if (!bar._built) {
      bar.innerHTML = '<button type="button" data-d="-1" aria-label="Previous page">◀</button><span></span><button type="button" data-d="1" aria-label="Next page">▶</button>';
      bar.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { if (typeof SFX !== 'undefined') SFX.uiClick(); this.go(this.page + parseInt(b.dataset.d)); } });
      bar._built = true;
    }
    bar.classList.toggle('on', this.active && (n > 1 || quick));
    const [p, sp, nx] = [bar.children[0], bar.children[1], bar.children[2]];
    sp.innerHTML = '<b>' + (this.page + 1) + '</b> / ' + Math.max(1, n); p.disabled = this.page <= 0; nx.disabled = this.page >= n - 1;
  }
  go(p) { this.page = clamp(p, 0, this.pages.length - 1); this._show(); }
  // page that holds item `i`
  showItem(i) { this.focus = i; const f = this.pages.findIndex(p => i >= p[0] && i < p[1]); if (f >= 0 && f !== this.page) this.go(f); }
}
UIFIT.onChange(() => { for (const p of PAGERS) p.layout(); });

// ---------- sub-tabs (settings, how to play): tabs choose which rows of the window are shown ----------
function bindSubtabs(barId, targetSel) {
  const bar = document.getElementById(barId), tgt = document.querySelector(targetSel); if (!bar || !tgt) return;
  bar.style.setProperty('--n', bar.children.length);
  bar.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    tgt.dataset.tab = b.dataset.t;
    for (const x of bar.children) x.classList.toggle('active', x === b);
    if (typeof SFX !== 'undefined') SFX.uiClick();
  });
}

// ---------- touch controls ----------
const TOUCH = {
  enabled: false, mx: 0, my: 0, sprint: false, crouch: false, breath: false, _joy: null, _look: new Map(), _fireId: null, _vis: false, _st: {},
  detect() {
    const q = new URLSearchParams(location.search);
    if (q.has('touch')) return q.get('touch') !== '0';
    const m = S.touchMode;
    if (m === 'off') return false;
    const mm = (c) => window.matchMedia && window.matchMedia(c).matches;
    // AUTO: phones and tablets only. A desktop / laptop browser (a mouse or touchpad present) never shows the touch
    // layer, even with a touchscreen; ON forces it on any device that has a touchscreen.
    const hasTouch = navigator.maxTouchPoints > 0 || 'ontouchstart' in window;
    if (m === 'on') return hasTouch;
    const ua = navigator.userAgent || '';
    const mobileUA = /Android|iPhone|iPad|iPod|Mobile|Silk|Kindle|BlackBerry|Opera Mini|IEMobile/i.test(ua) || !!(navigator.userAgentData && navigator.userAgentData.mobile)
      || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);   // iPadOS reports a desktop Safari
    const touchOnly = mm('(pointer: coarse)') && !mm('(any-pointer: fine)');
    return hasTouch && (mobileUA || touchOnly);
  },
  refresh() {
    const on = this.detect();
    if (on !== this.enabled) { this.enabled = on; if (!on) this.release(); }
    UIFIT.apply(true);
    const b = document.getElementById('toggleTouch'); if (b) b.textContent = (S.touchMode || 'auto').toUpperCase();
  },
  release() {
    this.mx = this.my = 0; this.sprint = this.crouch = this.breath = false; mouseFire = false; keys.Space = false; keys.KeyE = false;
    if (this._joy) this._endJoy(); this._look.clear();
    for (const el of document.querySelectorAll('.tb.on')) el.classList.remove('on');
  },
  k() { return 0.0052 * clamp(900 / Math.max(UIFIT.w, UIFIT.h), 0.55, 1.5); },   // radians per pixel at look speed 1
  active() { return this.enabled && G.playing && !G.paused && !G.dead && !G.respawning; },
  init() {
    this.ui = document.getElementById('touchUI');
    this.joyBase = document.getElementById('joyBase'); this.joyKnob = document.getElementById('joyKnob');
    const zl = document.getElementById('tzLook'), zm = document.getElementById('tzMove');
    // ----- look: any finger on the look zone turns the view -----
    zl.addEventListener('pointerdown', (e) => {
      e.preventDefault(); if (typeof initAudio === 'function') initAudio();
      if (G.cine) { CINE.skip(); return; }
      if (!this.active()) return;
      try { zl.setPointerCapture(e.pointerId); } catch (err) { } this._look.set(e.pointerId, { x: e.clientX, y: e.clientY });
    });
    zl.addEventListener('pointermove', (e) => { const l = this._look.get(e.pointerId); if (l && this.active()) { this.look(e.clientX - l.x, e.clientY - l.y); l.x = e.clientX; l.y = e.clientY; } });
    const lookEnd = (e) => this._look.delete(e.pointerId);
    zl.addEventListener('pointerup', lookEnd); zl.addEventListener('pointercancel', lookEnd); zl.addEventListener('lostpointercapture', lookEnd);
    // ----- move: a floating joystick starts where the thumb lands -----
    zm.addEventListener('pointerdown', (e) => {
      e.preventDefault(); if (typeof initAudio === 'function') initAudio();
      if (G.cine) { CINE.skip(); return; }
      if (!this.active() || this._joy) return;
      try { zm.setPointerCapture(e.pointerId); } catch (err) { }
      const R = UIFIT.rem() * 6, half = UIFIT.rem() * 6;
      const cx = clamp(e.clientX, half + 4, UIFIT.w - half - 4), cy = clamp(e.clientY, half + 4, UIFIT.h - half - 4);
      this._joy = { id: e.pointerId, cx, cy, R };
      const b = this.joyBase; b.classList.add('moved', 'live'); b.style.left = (cx - half) + 'px'; b.style.top = (cy - half) + 'px';
      this._moveJoy(e);
    });
    zm.addEventListener('pointermove', (e) => { if (this._joy && this._joy.id === e.pointerId) this._moveJoy(e); });
    const joyEnd = (e) => { if (this._joy && this._joy.id === e.pointerId) this._endJoy(); };
    zm.addEventListener('pointerup', joyEnd); zm.addEventListener('pointercancel', joyEnd); zm.addEventListener('lostpointercapture', joyEnd);
    // ----- buttons -----
    for (const el of this.ui.querySelectorAll('.tb')) {
      const a = el.dataset.a;
      el.addEventListener('pointerdown', (e) => {
        e.preventDefault(); e.stopPropagation(); if (typeof initAudio === 'function') initAudio();
        if (G.cine) { CINE.skip(); return; }
        if (a !== 'pause' && !this.active()) return;
        try { el.setPointerCapture(e.pointerId); } catch (err) { }
        el.classList.add('on'); el._pid = e.pointerId; el._lx = e.clientX; el._ly = e.clientY;
        this.ripple(el, e);
        this.press(a, el);
      });
      el.addEventListener('pointermove', (e) => {
        // a thumb resting on FIRE can still turn the view
        if (a === 'fire' && el._pid === e.pointerId && this.active()) { this.look(e.clientX - el._lx, e.clientY - el._ly); el._lx = e.clientX; el._ly = e.clientY; }
      });
      const up = (e) => { if (el._pid !== e.pointerId) return; el._pid = null; el.classList.remove('on'); this.releaseBtn(a, el); };
      el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('lostpointercapture', up);
      el.addEventListener('contextmenu', (e) => e.preventDefault());
    }
    // weapon strip
    this.slots = document.getElementById('touchSlots');
    this.slots.addEventListener('pointerdown', (e) => {
      const b = e.target.closest('.ts'); if (!b) return;
      e.preventDefault(); e.stopPropagation(); if (G.cine) { CINE.skip(); return; }
      if (this.active()) { INVENTORY.switchWeapon(parseInt(b.dataset.i)); this.buzz(8); }
    });
    // pause when the page goes to the background
    document.addEventListener('visibilitychange', () => { if (document.hidden && this.enabled && G.playing && !G.paused && !G.dead) this.pause(); });
    document.addEventListener('fullscreenchange', () => this.fsLabel());
    this.fsLabel();
    this.updateSlots();
  },
  // touch feedback: a ripple spreads from the finger (the button itself shrinks and glows while held, see .tb.on)
  ripple(el, e) {
    const r = el.getBoundingClientRect(), d = document.createElement('i');
    d.className = 'rip'; d.style.left = (e.clientX - r.left) + 'px'; d.style.top = (e.clientY - r.top) + 'px';
    el.appendChild(d); setTimeout(() => d.remove(), 460);
  },
  buzz(ms) { try { if (navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) navigator.vibrate(ms); } catch (e) { } },   // browsers ignore (and log) buzzes before the first tap
  look(dx, dy) {
    const w = INVENTORY.curW(), zoom = adsT > 0.5 && w ? adsFovOf(w) / S.fov : 1;
    const s = this.k() * (S.touchSens || 1) * (adsT > 0.5 ? S.adsSens * Math.max(0.25, zoom) / 0.75 : 1);
    player.yaw -= dx * s; player.pitch = clamp(player.pitch - dy * s, -1.45, 1.45);
    swayX = clamp(swayX - dx * 0.00035, -0.035, 0.035); swayY = clamp(swayY + dy * 0.00035, -0.035, 0.035);
  },
  _moveJoy(e) {
    const j = this._joy; let dx = e.clientX - j.cx, dy = e.clientY - j.cy;
    const d = Math.hypot(dx, dy), R = j.R * 0.5;                       // full deflection at half the base's radius
    const k = d > R ? R / d : 1, px = dx * k, py = dy * k, m = Math.min(1, d / R);
    this.joyKnob.style.setProperty('--kx', px + 'px'); this.joyKnob.style.setProperty('--ky', py + 'px');
    const dz = 0.14;
    if (m < dz) { this.mx = this.my = 0; this.sprint = false; this.joyBase.classList.remove('sprint'); return; }
    const a = (m - dz) / (1 - dz), nx = dx / d, ny = dy / d;
    this.mx = nx * a; this.my = -ny * a;
    this.sprint = m > 0.96 && -ny > 0.5;                                  // pushed to the rim, forward: run
    this.joyBase.classList.toggle('sprint', this.sprint);
  },
  _endJoy() {
    this._joy = null; this.mx = this.my = 0; this.sprint = false;
    const b = this.joyBase; b.classList.remove('moved', 'live', 'sprint'); b.style.left = b.style.top = '';
    this.joyKnob.style.setProperty('--kx', '0px'); this.joyKnob.style.setProperty('--ky', '0px');
  },
  press(a, el) {
    const w = INVENTORY.curW();
    switch (a) {
      case 'fire': mouseFire = true; this._fireId = el._pid; if (w && !w.def.auto) tryFire(); break;
      case 'aim':
        if (!w || w.def.noADS) break;
        if (S.touchAim === 'hold') ads = true; else ads = !ads;
        this.buzz(6); break;
      case 'reload': startReload(); this.buzz(10); break;
      case 'jump': keys.Space = true; if (player.prone) toggleProne(); break;
      case 'crouch':
        if (player.prone) toggleProne();
        else if (player.sprintT > 0.2 && player.onGround && player.speed2d > 6) { player.sliding = true; player.slideT = 0.75; }
        else this.crouch = !this.crouch;
        break;
      case 'prone': this.crouch = false; toggleProne(); break;
      case 'nv': NVG.toggle(); break;
      case 'gren': if (typeof EQUIP !== 'undefined') EQUIP.tryThrow(); this.buzz(10); break;
      case 'melee': startPlayerMelee('butt'); break;
      case 'kick': startPlayerMelee('kick'); break;
      case 'swap': INVENTORY.switchWeapon(INVENTORY.lastIdx); break;
      case 'prev': case 'next': { const n = INVENTORY.slots.length; if (n) INVENTORY.switchWeapon((INVENTORY.activeIdx + (a === 'next' ? 1 : -1) + n) % n); this.buzz(8); break; }
      case 'inv': if (typeof INVWHEEL !== 'undefined') INVWHEEL.toggle(); this.buzz(8); break;
      case 'use': keys.KeyE = true; interact(); break;
      case 'breath': this.breath = true; break;
      case 'pause': this.pause(); break;
    }
  },
  releaseBtn(a) {
    switch (a) {
      case 'fire': mouseFire = false; this._fireId = null; break;
      case 'aim': if (S.touchAim === 'hold') ads = false; break;
      case 'jump': keys.Space = false; break;
      case 'use': keys.KeyE = false; break;
      case 'breath': this.breath = false; break;
    }
  },
  pause() {
    if (!G.playing || G.dead || G.paused) return;
    G.paused = true; mouseFire = false; ads = false; this.release();
    if (typeof preparePause === 'function') preparePause();
    document.getElementById('pause').classList.remove('hidden');
  },
  resume() { G.paused = false; document.getElementById('pause').classList.add('hidden'); },
  // weapon strip: one button per inventory slot
  updateSlots() {
    if (!this.slots || typeof INVENTORY === 'undefined') return;
    const TAG = { rifle: 'AR', smg: 'SMG', lmg: 'LMG', sniper: 'SNP', dmr: 'DMR', shotgun: 'SG', pistol: 'PST', launcher: 'LNC', melee: 'MEL', minigun: 'LMG' };
    const n = Math.max(6, INVENTORY.slots.length);
    while (this.slots.children.length < n) { const b = document.createElement('button'); b.type = 'button'; b.className = 'ts'; b.dataset.i = this.slots.children.length; this.slots.appendChild(b); }
    while (this.slots.children.length > n) this.slots.lastChild.remove();
    for (let i = 0; i < n; i++) {
      const w = INVENTORY.slots[i], b = this.slots.children[i], txt = '<b>' + (i + 1) + '</b><span>' + (w ? (TAG[w.def.cls] || '') : '') + '</span>';
      if (b._h !== txt) { b.innerHTML = txt; b._h = txt; }
      b.classList.toggle('empty', !w); b.classList.toggle('act', i === INVENTORY.activeIdx);
    }
    // weapon switcher: the weapon in hand (its slot key) between the previous / next buttons
    const cw = INVENTORY.curW(), nm = document.getElementById('twName');
    if (nm) nm.textContent = cw ? (INVENTORY.activeIdx + 1) + ' · ' + cw.def.label : '—';
  },
  // per frame: show / hide the layer, context buttons, button states
  update() {
    if (!this.enabled || !this.ui) return;
    const hudOn = !document.getElementById('hud').classList.contains('hidden');
    const vis = G.playing && hudOn && !G.dead;
    if (vis !== this._vis) { this._vis = vis; this.ui.classList.toggle('hidden', !vis); if (!vis) this.release(); }
    if (!vis) return;
    const S0 = this._st, set = (k, v, fn) => { if (S0[k] !== v) { S0[k] = v; fn(v); } };
    const w = INVENTORY.curW();
    const hint = document.getElementById('interactHint');
    const use = hint.style.display === 'block' || (typeof HOLD !== 'undefined' && !!HOLD.key);
    set('use', use, v => this.ui.querySelector('.t-use').classList.toggle('show', v));
    set('scoped', !!(w && w.def.scope && adsT > 0.6), v => this.ui.classList.toggle('scoped', v));
    set('aim', !!ads, v => this.ui.querySelector('.t-aim').classList.toggle('lit', v));
    set('crouch', !!(this.crouch || player.crouch), v => this.ui.querySelector('.t-crouch').classList.toggle('lit', v));
    set('prone', !!player.prone, v => this.ui.querySelector('.t-prone').classList.toggle('lit', v));
    set('nv', NVG.on + S.nvgMode, () => { const b = this.ui.querySelector('.t-nv'); b.classList.toggle('lit', NVG.on); b.classList.toggle('blue', NVG.on && S.nvgMode === 'blue'); b.querySelector('span').textContent = NVG.on ? S.nvgMode.toUpperCase() : 'OFF'; });
    if (typeof EQUIP !== 'undefined') set('gren', EQUIP.count, v => { document.getElementById('tbGrenN').textContent = '×' + v; this.ui.querySelector('.t-gren').style.opacity = v > 0 ? '' : '0.45'; });
    set('ammo', w ? (w.def.cls === 'melee' ? '' : w.mag + '/' + (infiniteAmmo(w) ? '∞' : w.reserve)) : '', v => { const el = document.getElementById('twAmmo'); if (el) el.textContent = v; });
    const pw = w && w.def.cls === 'melee';
    set('melee', !!pw, v => { for (const k of ['.t-reload', '.t-aim']) this.ui.querySelector(k).style.opacity = v ? '0.4' : ''; });
  },
  // fullscreen (Android, desktop, iPad; iPhone Safari has none)
  canFs() { const d = document.documentElement; return !!(d.requestFullscreen || d.webkitRequestFullscreen); },
  inFs() { return !!(document.fullscreenElement || document.webkitFullscreenElement); },
  fs(on) {
    try {
      if (on && !this.inFs()) { const d = document.documentElement, p = (d.requestFullscreen || d.webkitRequestFullscreen).call(d, { navigationUI: 'hide' }); if (p && p.catch) p.catch(() => { }); }
      else if (!on && this.inFs()) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    } catch (e) { }
  },
  fsLabel() { const b = document.getElementById('toggleFullscreen'); if (b) { b.textContent = this.canFs() ? (this.inFs() ? 'ON' : 'OFF') : 'N/A'; b.disabled = !this.canFs(); } }
};

TOUCH.init();
TOUCH.enabled = TOUCH.detect();
UIFIT.onChange(() => { if (TOUCH.enabled) TOUCH.release(); });   // rotating the phone mid-fight drops held sticks / buttons instead of leaving them stuck
UIFIT.init();
