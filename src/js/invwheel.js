// ---------- Inventory wheel: the ten loadout items on a ring (I) ----------
// PRIMARY 1-3, SECONDARY 1-2, MELEE, LAUNCHER (the weapons in hand, keys 1-7) and the LETHAL / TACTICAL throwables.
// The ring turns with the mouse wheel so the chosen item comes to the top; left click (or Enter) equips it and closes,
// I / Esc / right click close. Touch: tap an item to equip, swipe round the ring to turn it, tap outside to close.
// While the wheel is open the view does not turn and the weapon does not fire.
const IW_CSS = `
#invWheel{position:fixed;inset:0;z-index:14;display:flex;align-items:center;justify-content:center;pointer-events:auto;touch-action:none;
  background:radial-gradient(circle at 50% 50%,rgba(6,8,12,.52) 0,rgba(6,8,12,.78) 62%,rgba(6,8,12,.9) 100%);animation:iwIn .16s ease-out}
#invWheel.hidden{display:none}
@keyframes iwIn{from{opacity:0}to{opacity:1}}
#invWheel .iwBox{position:relative;width:var(--D);height:var(--D);--D:min(88vh,80vw,640px);--R:calc(var(--D) * .385)}
#invWheel .iwRing{position:absolute;inset:0;transform:rotate(var(--r,0deg));transition:transform .26s cubic-bezier(.3,.9,.3,1)}
#invWheel svg.iwBg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
#invWheel .iwSeg{fill:rgba(16,21,28,.82);stroke:rgba(230,42,94,.28);stroke-width:.35}
#invWheel .iwSeg.sel{fill:rgba(230,42,94,.24);stroke:var(--amber);stroke-width:.6}
#invWheel .iwItem{position:absolute;left:50%;top:50%;width:calc(var(--D) * .2);margin-left:calc(var(--D) * -.1);margin-top:calc(var(--D) * -.08);height:calc(var(--D) * .16);
  display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;cursor:pointer;color:#cfd6df;
  transform:rotate(var(--a)) translateY(calc(var(--R) * -1)) rotate(calc(var(--a) * -1 - var(--r,0deg)));transition:transform .26s cubic-bezier(.3,.9,.3,1)}
#invWheel .iwItem>*{flex:none}
#invWheel .iwItem img,#invWheel .iwItem .ico{width:100%;height:calc(var(--D) * .062);object-fit:contain;filter:drop-shadow(0 2px 3px #000) brightness(.85);transition:transform .2s,filter .2s}
#invWheel .iwItem .ico svg{width:100%;height:100%}
#invWheel .iwItem b{font-size:max(calc(var(--D) * .0185),9px);font-weight:600;letter-spacing:.08em;white-space:nowrap;max-width:100%;overflow:hidden;text-overflow:ellipsis;margin-top:2px}
#invWheel .iwItem small{font:700 max(calc(var(--D) * .0155),7.5px) Consolas,monospace;letter-spacing:.14em;color:var(--amber)}
#invWheel .iwItem i{font:max(calc(var(--D) * .016),8px) Consolas,monospace;font-style:normal;color:#8f99a8}
#invWheel .iwItem.sel{color:#fff}
#invWheel .iwItem.sel img,#invWheel .iwItem.sel .ico{transform:scale(1.18);filter:drop-shadow(0 0 10px rgba(230,42,94,.7)) brightness(1.08)}
#invWheel .iwItem.cur small::after{content:" ●";color:#7dff9a}
#invWheel .iwItem.empty{opacity:.4}
#invWheel .iwMark{position:absolute;left:50%;top:calc(var(--D) * -.012);width:0;height:0;margin-left:calc(var(--D) * -.022);border:calc(var(--D) * .022) solid transparent;border-top-color:var(--amber);filter:drop-shadow(0 0 6px rgba(230,42,94,.8))}
#invWheel .iwCenter{position:absolute;left:50%;top:50%;width:calc(var(--D) * .4);height:calc(var(--D) * .4);margin:calc(var(--D) * -.2) 0 0 calc(var(--D) * -.2);border-radius:50%;
  display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;background:radial-gradient(circle,rgba(20,26,34,.95),rgba(10,13,18,.95));
  border:1px solid rgba(230,42,94,.45);box-shadow:0 0 30px rgba(230,42,94,.15) inset;pointer-events:none;padding:0 calc(var(--D) * .03)}
#invWheel .iwCenter small{font:700 max(calc(var(--D) * .016),8px) Consolas,monospace;letter-spacing:.2em;color:var(--amber)}
#invWheel .iwCenter b{font-size:max(calc(var(--D) * .034),13px);font-weight:300;letter-spacing:.12em;color:#fff;margin:2px 0}
#invWheel .iwCenter img,#invWheel .iwCenter .ico{width:86%;height:28%;object-fit:contain;filter:drop-shadow(0 3px 5px #000)}
#invWheel .iwCenter .ico svg{width:100%;height:100%}
#invWheel .iwCenter span{font:max(calc(var(--D) * .021),10px) Consolas,monospace;color:#dfe6ee;letter-spacing:.06em}
#invWheel .iwCenter em{font:max(calc(var(--D) * .015),7.5px) Consolas,monospace;font-style:normal;color:#8f99a8;letter-spacing:.12em;margin-top:3px}
#invWheel .iwHint{position:absolute;left:-20%;right:-20%;bottom:calc(var(--D) * -.07);text-align:center;font:max(calc(var(--D) * .017),9px) Consolas,monospace;letter-spacing:.22em;color:#9aa4b2;white-space:nowrap}
#invWheel .iwTitle{position:absolute;left:0;right:0;top:calc(var(--D) * -.07);text-align:center;font-size:max(calc(var(--D) * .026),11px);font-weight:300;letter-spacing:.5em;color:#fff}
#invWheel .iwTitle b{color:var(--amber);font-weight:600}
`;
const IW_ICON = {
  frag: '<svg viewBox="0 0 64 40"><g fill="none" stroke="#c9d1bb" stroke-width="2"><ellipse cx="30" cy="23" rx="12" ry="14" fill="#3a4430"/><path d="M19 18h22M18 26h24M30 9v28M23 11v24M37 11v24" stroke="#24291f"/><rect x="26" y="4" width="9" height="6" fill="#59605a"/><path d="M35 6l12 3-2 4-10-3" fill="#8a8f96"/><circle cx="46" cy="6" r="3"/></g></svg>',
  flash: '<svg viewBox="0 0 64 40"><g stroke="#d7dce2" stroke-width="2"><rect x="20" y="10" width="20" height="27" rx="3" fill="#8a8f96"/><path d="M20 17h20M20 30h20" stroke="#5b6168"/><rect x="25" y="4" width="10" height="6" fill="#59605a"/><path d="M35 6l12 3-2 4-10-3" fill="#8a8f96"/><path d="M48 18l7-4M49 24h8M48 30l7 4" stroke="#ffe9a8"/></g></svg>',
  smoke: '<svg viewBox="0 0 64 40"><g stroke="#c9d1c9" stroke-width="2"><rect x="20" y="10" width="20" height="27" rx="3" fill="#5a6a5a"/><path d="M20 16h20" stroke="#3b463b"/><rect x="25" y="4" width="10" height="6" fill="#59605a"/><path d="M35 6l12 3-2 4-10-3" fill="#8a8f96"/><path d="M46 22c4-3 9 0 7 4s4 6 0 8" fill="none" stroke="#b9c0b9"/></g></svg>',
  gun: '<svg viewBox="0 0 64 40"><path d="M4 18h40l3-3h10v6h-6l-2 3H36l-3 11h-7l2-9H14l-2 4H4z" fill="#59616c" stroke="#c9d1db" stroke-width="1.5" stroke-linejoin="round"/></svg>'
};
const INVWHEEL = {
  open: false, sel: 0, rot: 0, el: null, list: [], _wheelT: 0,
  init() {
    if (this.el) return;
    const st = document.createElement('style'); st.textContent = IW_CSS; document.head.appendChild(st);
    const d = document.createElement('div'); d.id = 'invWheel'; d.className = 'hidden';
    d.innerHTML = '<div class="iwBox"><div class="iwTitle">INVEN<b>TORY</b></div><div class="iwRing"><svg class="iwBg" viewBox="-100 -100 200 200"></svg></div><div class="iwMark"></div>' +
      '<div class="iwCenter"></div><div class="iwHint"></div></div>';
    document.body.appendChild(d);
    this.el = d; this.ring = d.querySelector('.iwRing'); this.svg = d.querySelector('svg.iwBg'); this.center = d.querySelector('.iwCenter');
    // touch / unlocked mouse: tap an item to equip it, drag round the ring to turn it, tap outside to close
    let start = null;
    d.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); start = { x: e.clientX, y: e.clientY, a: this._ang(e), moved: 0 }; });
    d.addEventListener('pointermove', (e) => {
      if (!start) return;
      const a = this._ang(e), n = this.list.length, step = 360 / n;
      let da = a - start.a; if (da > 180) da -= 360; if (da < -180) da += 360;
      if (Math.abs(da) > step * 0.8 && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 24) { this.step(da > 0 ? -1 : 1); start.a = a; start.moved++; }
    });
    d.addEventListener('pointerup', (e) => {
      e.preventDefault(); e.stopPropagation();
      const s = start; start = null; if (!s || s.moved) return;
      const it = e.target.closest('.iwItem');
      if (it) { this.select(parseInt(it.dataset.k), true); return; }
      if (!e.target.closest('.iwCenter')) this.hide();
    });
    d.addEventListener('wheel', (e) => { e.preventDefault(); e.stopPropagation(); this.wheel(e.deltaY); }, { passive: false });
    d.addEventListener('contextmenu', (e) => e.preventDefault());
  },
  _ang(e) { const r = this.el.querySelector('.iwBox').getBoundingClientRect(); return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180 / Math.PI; },
  // the ten items: the weapons in hand (inventory slots) then the two throwables
  items() {
    const out = [];
    const ids = typeof LOADOUT !== 'undefined' ? LOADOUT_SLOTS : [];
    INVENTORY.slots.forEach((w, i) => {
      const def = ids[i] && !ids[i].gren ? ids[i] : null;
      out.push({ kind: 'w', idx: i, w, key: String(i + 1), label: def ? def.label : 'SLOT ' + (i + 1) });
    });
    if (typeof EQUIP !== 'undefined') for (const g of ['lethal', 'tactical']) out.push({ kind: 'g', slot: g, key: g === 'lethal' ? 'G' : 'T', label: g === 'lethal' ? 'LETHAL' : 'TACTICAL' });
    return out;
  },
  _thumb(it) {
    if (it.kind === 'g') return '<div class="ico">' + IW_ICON[EQUIP.type(it.slot)] + '</div>';
    const id = it.w && it.w.def && it.w.def.hq, t = id && typeof ARSENAL !== 'undefined' ? ARSENAL.thumb(id) : '';
    return t ? `<img alt="" src="${t}">` : '<div class="ico">' + IW_ICON.gun + '</div>';
  },
  _ammo(it) {
    if (it.kind === 'g') return '×' + EQUIP.counts[it.slot];
    const w = it.w; if (!w) return '';
    if (w.def.cls === 'melee') return '—';
    return w.mag + ' / ' + (infiniteAmmo(w) ? '∞' : w.reserve);
  },
  // thumbnails of the loadout are rendered when a match starts (the wheel opens without a hitch)
  prepare() {
    if (typeof ARSENAL === 'undefined' || typeof ARMORY === 'undefined' || !ARSENAL.ready) return;
    for (const id of LOADOUT.ids()) if (!ARSENAL._thumbs[id]) { try { ARSENAL._thumbs[id] = ARMORY.thumb(id, 300, 132); } catch (e) { } }
  },
  build() {
    this.init();
    this.list = this.items();
    const n = this.list.length, step = 360 / n, box = this.ring;
    for (const o of [...box.querySelectorAll('.iwItem')]) o.remove();
    // ring segments
    const P = (a, r) => [Math.sin(a * Math.PI / 180) * r, -Math.cos(a * Math.PI / 180) * r].map(v => v.toFixed(2)).join(' ');
    let svg = '<circle r="98" fill="none" stroke="rgba(230,42,94,.35)" stroke-width=".5"/><circle r="47" fill="none" stroke="rgba(230,42,94,.3)" stroke-width=".4"/>';
    for (let k = 0; k < n; k++) {
      const a0 = k * step - step / 2 + 0.8, a1 = k * step + step / 2 - 0.8;
      svg += `<path class="iwSeg" data-k="${k}" d="M${P(a0, 50)} L${P(a0, 97)} A97 97 0 0 1 ${P(a1, 97)} L${P(a1, 50)} A50 50 0 0 0 ${P(a0, 50)}Z"/>`;
    }
    this.svg.innerHTML = svg;
    this.list.forEach((it, k) => {
      const el = document.createElement('div'); el.className = 'iwItem'; el.dataset.k = k; el.style.setProperty('--a', (k * step) + 'deg');
      el.innerHTML = this._thumb(it) + `<small>${it.key} · ${it.label}</small><b></b><i></i>`;
      box.appendChild(el); it.el = el;
    });
    this._refresh();
  },
  _name(it) { return it.kind === 'g' ? EQUIP.TYPES[EQUIP.type(it.slot)].label : it.w ? it.w.def.label : 'EMPTY'; },
  _refresh() {
    const curW = INVENTORY.activeIdx;
    this.list.forEach((it, k) => {
      const el = it.el; if (!el) return;
      el.querySelector('b').textContent = this._name(it);
      el.querySelector('i').textContent = this._ammo(it);
      el.classList.toggle('sel', k === this.sel);
      el.classList.toggle('cur', it.kind === 'w' ? it.idx === curW : EQUIP.active === it.slot);
      el.classList.toggle('empty', it.kind === 'g' ? EQUIP.counts[it.slot] <= 0 : !it.w);
    });
    for (const p of this.svg.querySelectorAll('.iwSeg')) p.classList.toggle('sel', parseInt(p.dataset.k) === this.sel);
    this.ring.style.setProperty('--r', this.rot + 'deg');
    for (const it of this.list) if (it.el) it.el.style.setProperty('--r', this.rot + 'deg');
    const it = this.list[this.sel];
    if (it) {
      const cat = it.kind === 'w' && it.w && typeof ARSENAL !== 'undefined' && it.w.def.hq ? ARSENAL.cat(ARSENAL.byId[it.w.def.hq].category) : null;
      this.center.innerHTML = `<small>${it.label}</small>${this._thumb(it)}<b>${this._name(it)}</b><span>${this._ammo(it)}</span><em>${it.kind === 'g' ? (it.slot === 'lethal' ? 'THROW WITH G' : 'THROW WITH T') : cat ? cat.label : ''}</em>`;
    }
    this.el.querySelector('.iwHint').textContent = UIFIT.touch ? 'TAP TO EQUIP · SWIPE TO TURN · TAP OUTSIDE TO CLOSE' : 'SCROLL TO TURN · CLICK TO EQUIP · I / ESC TO CLOSE';
  },
  // turn the ring by one item (the chosen one sits at the top)
  step(dir) {
    const n = this.list.length; if (!n) return;
    this.sel = (this.sel + dir + n) % n; this.rot -= dir * 360 / n;
    if (typeof SFX !== 'undefined' && SFX.uiHover) SFX.uiHover();
    this._refresh();
  },
  wheel(dy) {
    const now = performance.now(); if (now - this._wheelT < 70) return; this._wheelT = now;   // one item per notch (touchpads send bursts)
    this.step(dy > 0 ? 1 : -1);
  },
  // choose item k; equip = confirm and close
  select(k, equip) {
    const n = this.list.length; if (k < 0 || k >= n) return;
    let d = k - this.sel; if (d > n / 2) d -= n; if (d < -n / 2) d += n;
    this.sel = k; this.rot -= d * 360 / n; this._refresh();
    if (equip) this.confirm();
  },
  confirm() {
    const it = this.list[this.sel];
    if (it) {
      if (it.kind === 'w' && it.w) INVENTORY.switchWeapon(it.idx);
      else if (it.kind === 'g') EQUIP.select(it.slot);
      if (typeof SFX !== 'undefined' && SFX.uiConfirm) SFX.uiConfirm();
    }
    this.hide();
  },
  show() {
    if (this.open || !G.playing || G.paused || G.dead || G.cine) return;
    this.open = true; mouseFire = false; ads = false;
    this.build();
    // start on what is in hand
    const k = this.list.findIndex(it => it.kind === 'w' && it.idx === INVENTORY.activeIdx);
    this.sel = Math.max(0, k); this.rot = -this.sel * 360 / this.list.length;
    this.ring.style.transition = 'none'; for (const it of this.list) if (it.el) it.el.style.transition = 'none';
    this._refresh(); void this.ring.offsetWidth;
    this.ring.style.transition = ''; for (const it of this.list) if (it.el) it.el.style.transition = '';
    this.el.classList.remove('hidden');
    if (typeof TOUCH !== 'undefined' && TOUCH.release) TOUCH.release();
  },
  hide() { if (!this.open) return; this.open = false; this.el.classList.add('hidden'); },
  toggle() { if (this.open) this.hide(); else this.show(); },
  // per frame: close when the match state changes, keep the ammo numbers fresh
  update() {
    if (!this.open) return;
    if (!G.playing || G.paused || G.dead || G.cine) { this.hide(); return; }
    this._t = (this._t || 0) + 1; if (this._t % 10 === 0) this._refresh();
  },
  // keyboard while open; returns true when the key was used
  key(e) {
    if (!this.open) return false;
    if (e.code === 'KeyI' || e.code === 'Escape') { this.hide(); return true; }
    if (e.code === 'Enter') { this.confirm(); return true; }
    if (e.code === 'ArrowRight' || e.code === 'ArrowDown') { this.step(1); return true; }
    if (e.code === 'ArrowLeft' || e.code === 'ArrowUp') { this.step(-1); return true; }
    const dm = e.code.match(/^Digit([1-8])$/);
    if (dm) { const k = this.list.findIndex(it => it.kind === 'w' && it.idx === parseInt(dm[1]) - 1); if (k >= 0) this.select(k, true); return true; }
    if (e.code === 'KeyG' || e.code === 'KeyT') { const k = this.list.findIndex(it => it.kind === 'g' && it.slot === (e.code === 'KeyG' ? 'lethal' : 'tactical')); if (k >= 0) this.select(k, true); return true; }
    return false;
  }
};
