// ---------- Progression: XP, levels, weapon unlocks (written by the progression agent) ----------
// Player level 1-60 from XP, per-category combat stats, the unlock rules for the Arsenal catalogue, XP popups /
// level-up banner / unlock toasts, and the level badge in the main menu. CSS and DOM are injected from here.
//
// Boot: ARSENAL.init() -> await PROGRESSION.init() -> LOADOUT.load()
// Hooks (never throw, every field optional):
//   PROGRESSION.onKill({ weaponId, category, headshot, distance, multikill, longshot, melee })
//       multikill: kill count of the current chain (2 = double kill) or true; omitted = tracked here (2.5 s window)
//       longshot: omitted = derived from distance (metres) and the category
//   PROGRESSION.onObjective(xp, label)
//   PROGRESSION.onMatchStart()                      optional: resets the per-match summary
//   PROGRESSION.onMatchEnd({ won, mode, score })    -> { xp, levelFrom, level, unlocks: [ids] } for the result screen
// Levels: level, xp, MAX_LEVEL, xpForLevel(n) (total XP to reach level n), xpToNext(n), progressToNext(), levelInfo()
// Unlocks (entry = catalogue entry or id): isUnlocked, requirement, requirementText, progress, ruleFor(cat, order),
//   newUnlocks(), isNew(id), markViewed(id?)
// Debug: PROGRESSION.debugGrant(levels)
const PG_MAX = 60;
const PG_CATS = ['mg', 'smg', 'lmg', 'rifle', 'assault', 'shotgun', 'pistol', 'launcher', 'melee'];
// interleaving of the categories along the level track (neighbouring unlocks come from different categories)
const PG_PHASE = { assault: 0, lmg: 1, rifle: 2, launcher: 3, smg: 4, pistol: 5, shotgun: 6, melee: 7, mg: 8 };
const PG_KILL_MULT = { mg: 0.8, assault: 1, smg: 1, lmg: 0.8, rifle: 0.6, shotgun: 0.7, pistol: 0.6, launcher: 0.35, melee: 0.3 };
const PG_HS_CATS = { mg: 1, assault: 1, smg: 1, lmg: 1, rifle: 1, pistol: 1 };
const PG_LONG_M = { mg: 50, assault: 45, smg: 30, lmg: 45, rifle: 70, shotgun: 18, pistol: 25, launcher: 50 };
const PG_CLS_CAT = { rifle: 'assault', smg: 'smg', lmg: 'lmg', sniper: 'rifle', dmr: 'rifle', shotgun: 'shotgun', pistol: 'pistol', launcher: 'launcher', melee: 'melee' };
const PG_CAT_FALLBACK = { mg: ['MACHINE GUNS', 'MG'], assault: ['ASSAULT RIFLES', 'AR'], smg: ['SUBMACHINE GUNS', 'SMG'], lmg: ['LIGHT MACHINE GUNS', 'LMG'], rifle: ['MARKSMAN & SNIPER RIFLES', 'SNIPER'], shotgun: ['SHOTGUNS', 'SHOTGUN'], pistol: ['PISTOLS', 'PISTOL'], launcher: ['LAUNCHERS', 'LAUNCHER'], melee: ['MELEE', 'MELEE'] };
const PG_FIRST_LOCKED = 7, PG_TABLE = 13; // orders 7..19 are scheduled; later orders extrapolate
const PG_XP = { kill: 100, headshot: 50, longshot: 50, melee: 75, multi: 50, match: 400, win: 600, objective: 250 };
const PG_MULTI = ['', '', 'DOUBLE KILL', 'TRIPLE KILL', 'QUAD KILL', 'MEGA KILL'];

const PG_CSS = `
#pgPops{position:fixed;left:calc(50% + 64px);top:calc(50% + 22px);z-index:12;pointer-events:none;display:flex;flex-direction:column;gap:1px}
.pgPop{display:flex;align-items:baseline;gap:6px;white-space:nowrap;text-shadow:0 1px 3px #000,0 0 2px #000;animation:pgPop 1.55s ease-out forwards}
.pgPop b{font:700 15px Consolas,"SF Mono",Menlo,monospace;color:#fff}
.pgPop i{font:700 10px Consolas,"SF Mono",Menlo,monospace;font-style:normal;color:var(--amber);letter-spacing:.08em}
.pgPop span{font-size:10px;letter-spacing:.22em;color:#e8c8cd}
@keyframes pgPop{0%{opacity:0;transform:translateX(-10px) scale(1.18)}9%{opacity:1;transform:none}76%{opacity:1;transform:none}100%{opacity:0;transform:translateY(-5px)}}
#pgLevel{position:fixed;left:0;right:0;top:15%;text-align:center;pointer-events:none;z-index:12;opacity:0;padding:10px 0 12px;
  background:linear-gradient(90deg,transparent,rgba(10,14,19,.78) 32%,rgba(10,14,19,.78) 68%,transparent)}
#pgLevel.show{animation:pgLevel 3s ease-out forwards}
#pgLevel small{display:block;font:700 11px Consolas,"SF Mono",Menlo,monospace;letter-spacing:.5em;text-indent:.5em;color:var(--amber)}
#pgLevel b{display:block;font-size:44px;font-weight:300;letter-spacing:.42em;text-indent:.42em;color:#fff;margin-top:2px;text-shadow:0 0 22px rgba(230,42,94,.75),0 2px 4px #000}
#pgLevel i{display:block;width:280px;height:2px;margin:6px auto 0;background:linear-gradient(90deg,transparent,var(--amber),transparent)}
@keyframes pgLevel{0%{opacity:0;transform:scale(1.25)}8%{opacity:1;transform:scale(1)}82%{opacity:1;transform:scale(1.02)}100%{opacity:0;transform:scale(1.03)}}
#pgToasts{position:fixed;right:22px;top:36%;z-index:13;display:flex;flex-direction:column;gap:6px;align-items:flex-end;pointer-events:none}
.pgToast{display:flex;gap:10px;align-items:center;min-width:290px;max-width:380px;background:rgba(10,14,19,.88);border:1px solid var(--line);border-left:3px solid var(--amber);
  padding:8px 14px 8px 10px;box-shadow:0 0 18px rgba(230,42,94,.18);opacity:0;animation:pgToast 4.2s ease-out forwards}
.pgToast img{width:72px;height:40px;object-fit:contain;flex:none}
.pgToast div{font-size:10px;letter-spacing:.2em;color:var(--amber);line-height:1.5}
.pgToast b{color:#fff;font-weight:600;font-size:12px;letter-spacing:.14em}
.pgToast span{display:block;font-size:9.5px;letter-spacing:.16em;color:#8a93a0}
@keyframes pgToast{0%{opacity:0;transform:translateX(30px)}7%{opacity:1;transform:none}88%{opacity:1;transform:none}100%{opacity:0;transform:translateX(20px)}}
#pgBadge{position:relative;flex:none;margin-left:auto;margin-right:12px;display:flex;align-items:center;gap:9px;padding:5px 10px 5px 5px;background:rgba(10,14,19,.55);border:1px solid rgba(230,42,94,.35)}
#pgBadge .pgLv{position:relative;width:36px;height:36px;flex:none;display:flex;align-items:center;justify-content:center;font:700 17px Consolas,"SF Mono",Menlo,monospace;color:#fff;
  background:linear-gradient(160deg,rgba(230,42,94,.5),rgba(230,42,94,.1));border:1px solid var(--amber);text-shadow:0 0 8px rgba(230,42,94,.8);
  clip-path:polygon(8px 0,100% 0,100% calc(100% - 8px),calc(100% - 8px) 100%,0 100%,0 8px)}
#pgBadge .pgLv i{display:none;position:absolute;left:4px;right:4px;bottom:4px;height:2px;background:rgba(255,255,255,.15)}
#pgBadge .pgLv i b{display:block;height:100%;width:0;background:#fff}
#pgBadge .pgInfo{width:86px}
#pgBadge .pgL{font-size:9.5px;letter-spacing:.2em;color:#e8c8cd;white-space:nowrap}
#pgBadge .pgBar{height:3px;background:rgba(255,255,255,.1);margin:4px 0 3px}
#pgBadge .pgBar i{display:block;height:100%;width:0;background:var(--amber);box-shadow:0 0 6px var(--crimson-glow)}
#pgBadge .pgX{font:9px Consolas,"SF Mono",Menlo,monospace;color:#8a93a0;white-space:nowrap}
#pgBadge .pgNew{position:absolute;top:-7px;right:-7px;font:700 8.5px Consolas,"SF Mono",Menlo,monospace;color:#fff;background:var(--amber);padding:1px 5px;letter-spacing:.08em;box-shadow:0 0 8px var(--crimson-glow)}
@media (max-width:1259px){#pgBadge{padding:5px}#pgBadge .pgInfo{display:none}#pgBadge .pgLv i{display:block}}
`;

const PROGRESSION = {
  MAX_LEVEL: PG_MAX, ready: false, state: null,
  _cum: null, _rules: null, _seenSet: new Set(), _match: null, _chain: { t: -1e9, n: 0 }, _saveT: 0, _dirty: false,
  _toastQ: [], _el: null, _initP: null,

  get level() { return this.state.level; },
  get xp() { return this.state.xp; },

  // ---------- state & save ----------
  _defaults() {
    const z = () => { const o = {}; for (const c of PG_CATS) o[c] = 0; return o; };
    return { v: 1, xp: 0, level: 1, stats: { killsByCat: z(), headshotsByCat: z(), kills: 0, headshots: 0, matches: 0, wins: 0, longshots: 0, multikills: 0 }, unlocked: [], seen: [], fresh: [] };
  },
  _sanitize(s) {
    const d = this._defaults();
    if (!s || typeof s !== 'object') return d;
    const num = (v) => (typeof v === 'number' && isFinite(v) && v > 0 ? Math.floor(v) : 0);
    const ids = (a) => (Array.isArray(a) ? [...new Set(a.filter(x => typeof x === 'string'))] : []);
    d.xp = num(s.xp);
    const st = s.stats || {};
    for (const k of ['kills', 'headshots', 'matches', 'wins', 'longshots', 'multikills']) d.stats[k] = num(st[k]);
    for (const k of ['killsByCat', 'headshotsByCat']) if (st[k]) for (const c in st[k]) d.stats[k][c] = num(st[k][c]);
    d.unlocked = ids(s.unlocked); d.seen = ids(s.seen); d.fresh = ids(s.fresh);
    // levels never go down: if the curve changes, the XP is lifted to the saved level
    d.level = Math.max(this.levelFromXP(d.xp), Math.min(PG_MAX, Math.max(1, num(s.level))));
    d.xp = Math.max(d.xp, this.xpForLevel(d.level));
    return d;
  },
  init() {
    if (this._initP) return this._initP;
    this._initP = (async () => {
      this._dom();
      let saved = null;
      try { if (typeof SAVE !== 'undefined') saved = await SAVE.get('progression'); } catch (e) { }
      this.state = this._sanitize(saved);
      this._seenSet = new Set(this.state.seen);
      this._match = this._newMatch();
      // requirements already met (the catalogue grew, rules changed): unlock quietly, the Armory badges them as new
      this._checkUnlocks(false);
      this._renderBadge();
      this.ready = true;
      window.addEventListener('pagehide', () => { if (this._dirty) this.save(); });
      return this;
    })();
    return this._initP;
  },
  save() {
    if (this._saveT) { clearTimeout(this._saveT); this._saveT = 0; }
    this._dirty = false;
    if (typeof SAVE === 'undefined' || !this.state) return;
    const s = this.state;
    try { SAVE.set('progression', { v: 1, xp: s.xp, level: s.level, stats: s.stats, unlocked: s.unlocked, seen: s.seen, fresh: s.fresh }); } catch (e) { }
  },
  _queueSave() { this._dirty = true; if (!this._saveT) this._saveT = setTimeout(() => this.save(), 600); },

  // ---------- levels ----------
  // XP from level n to n+1: 1,000 at level 1 (one match), ~2,550 at 10, ~7,450 at 30, ~18,100 at 59 (~490k in total)
  xpToNext(n) {
    n = Math.floor(n) || 1; if (n >= PG_MAX) return 0; if (n < 1) n = 1;
    const m = n - 1; return Math.round((1000 + 150 * m + 2.5 * m * m) / 50) * 50;
  },
  xpForLevel(n) {
    if (!this._cum) { this._cum = [0, 0]; for (let l = 1; l < PG_MAX; l++) this._cum[l + 1] = this._cum[l] + this.xpToNext(l); }
    n = Math.floor(n) || 1; return this._cum[Math.max(1, Math.min(PG_MAX, n))];
  },
  levelFromXP(xp) { let l = 1; while (l < PG_MAX && xp >= this.xpForLevel(l + 1)) l++; return l; },
  levelInfo() {
    const s = this.state, L = s.level, max = L >= PG_MAX;
    const into = s.xp - this.xpForLevel(L), need = max ? 0 : this.xpToNext(L);
    return { level: L, xp: s.xp, into, need, progress: max ? 1 : Math.max(0, Math.min(1, into / need)), max };
  },
  progressToNext() { return this.levelInfo().progress; },

  // ---------- XP ----------
  _newMatch() { return { xp: 0, levelFrom: this.state ? this.state.level : 1, unlocks: [] }; },
  addXP(amount, reason) {
    try {
      amount = Math.round(+amount);
      if (!(amount > 0) || !this.state) return 0;
      this._gain([[amount, reason]]);
      return amount;
    } catch (e) { console.warn('progression', e); return 0; }
  },
  _gain(parts) {
    const before = this.state.level;
    let total = 0;
    for (const [amt, why] of parts) { if (!(amt > 0)) continue; this.state.xp += amt; total += amt; this._popup(amt, why); }
    if (this._match) this._match.xp += total;
    const L = this.levelFromXP(this.state.xp);
    if (L > before) { this.state.level = L; this._levelUp(L); }
    const unlocked = this._checkUnlocks(true).length;
    this._renderBadge();
    // level-ups and unlocks are written at once, plain XP is batched
    if (L > before || unlocked) this.save(); else this._queueSave();
    return total;
  },

  // ---------- event hooks ----------
  _catOf(p) {
    if (p.category && PG_PHASE[p.category] !== undefined) return p.category;
    const id = p.weaponId != null ? String(p.weaponId) : '';
    if (id && typeof ARSENAL !== 'undefined' && ARSENAL.byId) {
      const e = ARSENAL.byId[id] || ARSENAL.byId[id.replace(/^HQ_/, '')];
      if (e && PG_PHASE[e.category] !== undefined) return e.category;
    }
    const d = id && typeof WEAPON_DEFS !== 'undefined' && WEAPON_DEFS[id];
    if (d) return (d.cat && PG_PHASE[d.cat] !== undefined) ? d.cat : (PG_CLS_CAT[d.cls] || null);
    return null;
  },
  onKill(p) {
    try {
      if (!this.state) return 0;
      p = p || {};
      let cat = this._catOf(p);
      const melee = !!p.melee || cat === 'melee';
      if (melee) cat = 'melee';
      const st = this.state.stats, hs = !!p.headshot;
      st.kills++; if (cat) st.killsByCat[cat] = (st.killsByCat[cat] || 0) + 1;
      if (hs) { st.headshots++; if (cat) st.headshotsByCat[cat] = (st.headshotsByCat[cat] || 0) + 1; }
      const dist = +p.distance || 0;
      const long = p.longshot != null ? !!p.longshot : (!melee && dist > 0 && dist >= (PG_LONG_M[cat] || 45));
      if (long) st.longshots++;
      // kill chain (2.5 s between kills) unless the caller passes its own count
      const now = performance.now();
      this._chain.n = now - this._chain.t < 2500 ? this._chain.n + 1 : 1; this._chain.t = now;
      let mk = p.multikill;
      mk = mk == null ? this._chain.n : mk === true ? Math.max(2, this._chain.n) : (Math.floor(+mk) || 0);
      if (mk === 2) st.multikills++;
      const parts = [[PG_XP.kill, 'KILL']];
      if (melee) parts.push([PG_XP.melee, 'MELEE']);
      if (hs) parts.push([PG_XP.headshot, 'HEADSHOT']);
      if (long) parts.push([PG_XP.longshot, 'LONGSHOT']);
      if (mk >= 2) parts.push([PG_XP.multi * Math.min(4, mk - 1), PG_MULTI[Math.min(5, mk)]]);
      return this._gain(parts);
    } catch (e) { console.warn('progression', e); return 0; }
  },
  onObjective(xp, label) {
    xp = +xp; return this.addXP(isFinite(xp) && xp > 0 ? xp : PG_XP.objective, label ? String(label).toUpperCase() : 'OBJECTIVE');
  },
  onMatchStart() { if (this.state) this._match = this._newMatch(); this._chain.n = 0; },
  onMatchEnd(p) {
    try {
      if (!this.state) return null;
      p = p || {};
      const st = this.state.stats; st.matches++; if (p.won) st.wins++;
      const parts = [];
      parts.push([PG_XP.match, 'MATCH COMPLETE']);
      if (p.won) parts.push([PG_XP.win, 'VICTORY']);
      this._gain(parts);
      const m = this._match || this._newMatch();
      const sum = { xp: m.xp, levelFrom: m.levelFrom, level: this.state.level, unlocks: m.unlocks.slice() };
      this._match = this._newMatch(); this._chain.n = 0;
      this.save();
      return sum;
    } catch (e) { console.warn('progression', e); return null; }
  },

  // ---------- unlock rules ----------
  // Orders 0-6 (unlockedByDefault) are free. Orders 7-19: every third slot (offset per category) is a category
  // challenge, the rest unlock by level, spread evenly from level 4 to 55 across all categories in interleaved order.
  _challenge(cat, k, j) {
    let stat = 'kills';
    if (PG_HS_CATS[cat]) stat = (cat === 'rifle' ? j % 2 === 0 : j % 2 === 1) ? 'headshots' : 'kills';
    const t = (10 + k * 6) * (PG_KILL_MULT[cat] || 1) * (stat === 'headshots' ? 0.4 : 1);
    return { type: 'challenge', cat, stat, target: Math.max(5, Math.round(t / 5) * 5) };
  },
  _buildRules() {
    const R = {}, slots = [];
    for (const cat of PG_CATS) {
      R[cat] = []; let j = 0; const ph = PG_PHASE[cat];
      for (let k = 0; k < PG_TABLE; k++) {
        if ((k + ph) % 3 === 1) R[cat][k] = this._challenge(cat, k, j++);
        else { const r = { type: 'level', level: 0 }; R[cat][k] = r; slots.push({ s: k * 9 + ph, r }); }
      }
    }
    slots.sort((a, b) => a.s - b.s);
    slots.forEach((x, i) => { x.r.level = Math.round(4 + i * 51 / (slots.length - 1)); });
    return R;
  },
  ruleFor(cat, order) {
    if (!this._rules) this._rules = this._buildRules();
    const k = (Math.floor(+order) || 0) - PG_FIRST_LOCKED, row = this._rules[cat];
    if (k < 0) return { type: 'level', level: 2 };
    if (!row) return { type: 'level', level: Math.min(PG_MAX, 4 + k * 4) };
    if (k < row.length) return row[k];
    if ((k + PG_PHASE[cat]) % 3 === 1) return this._challenge(cat, k, k);
    return { type: 'level', level: Math.min(PG_MAX, 56 + (k - PG_TABLE)) };
  },
  _entry(x) {
    if (x && typeof x === 'object') return x.id ? x : null;
    if (typeof x === 'string' && typeof ARSENAL !== 'undefined' && ARSENAL.byId) return ARSENAL.byId[x] || null;
    return null;
  },
  _stat(cat, stat) { const s = this.state.stats[stat === 'headshots' ? 'headshotsByCat' : 'killsByCat']; return (s && s[cat]) || 0; },
  _met(e) {
    const r = this.ruleFor(e.category, e.order);
    return r.type === 'level' ? this.state.level >= r.level : this._stat(r.cat, r.stat) >= r.target;
  },
  isUnlocked(entry) {
    const e = this._entry(entry); if (!e) return false;
    if (e.unlockedByDefault) return true;
    if (!this.state) return false;
    // once unlocked (announced or challenge done), a weapon stays unlocked
    if (this._seenSet.has(e.id) || this.state.unlocked.includes(e.id)) return true;
    return this._met(e);
  },
  _catLabel(cat, short) {
    const c = typeof ARSENAL !== 'undefined' && ARSENAL.cat ? ARSENAL.cat(cat) : null;
    if (c) return short ? c.short : c.label;
    const f = PG_CAT_FALLBACK[cat]; return f ? f[short ? 1 : 0] : String(cat || '').toUpperCase();
  },
  requirement(entry) {
    const e = this._entry(entry); if (!e) return null;
    if (e.unlockedByDefault) return { type: 'default', met: true };
    const r = this.ruleFor(e.category, e.order), met = this.isUnlocked(e);
    if (r.type === 'level') return { type: 'level', level: r.level, met };
    const cur = this.state ? this._stat(r.cat, r.stat) : 0;
    const what = r.stat === 'headshots' ? 'headshots' : 'kills';
    const desc = r.cat === 'melee' ? `Get ${r.target} melee ${what}` : `Get ${r.target} ${what} with ${this._catLabel(r.cat).toLowerCase().replace(/\b[a-z]/g, ch => ch.toUpperCase())}`;
    return { type: 'challenge', cat: r.cat, stat: r.stat, target: r.target, current: met ? r.target : Math.min(cur, r.target), met, desc };
  },
  requirementText(entry) {
    const r = this.requirement(entry);
    if (!r || r.met) return '';
    if (r.type === 'level') return 'UNLOCKS AT LEVEL ' + r.level;
    return `${r.target} ${this._catLabel(r.cat, true)} ${r.stat === 'headshots' ? 'HEADSHOTS' : 'KILLS'} (${r.current}/${r.target})`;
  },
  progress(entry) {
    const r = this.requirement(entry);
    if (!r) return 0;
    if (r.met) return 1;
    if (r.type === 'level') return Math.max(0, Math.min(1, this.state.xp / this.xpForLevel(r.level)));
    return Math.max(0, Math.min(1, r.current / r.target));
  },
  _checkUnlocks(announce) {
    if (!this.state || typeof ARSENAL === 'undefined' || !Array.isArray(ARSENAL.weapons)) return [];
    const s = this.state, out = [];
    for (const e of ARSENAL.weapons) {
      if (!e || !e.id || e.unlockedByDefault || this._seenSet.has(e.id)) continue;
      if (!s.unlocked.includes(e.id) && !this._met(e)) continue;
      if (this.ruleFor(e.category, e.order).type === 'challenge' && !s.unlocked.includes(e.id)) s.unlocked.push(e.id);
      s.seen.push(e.id); this._seenSet.add(e.id);
      if (!s.fresh.includes(e.id)) s.fresh.push(e.id);
      out.push(e);
    }
    if (!out.length) return out;
    out.sort((a, b) => (PG_CATS.indexOf(a.category) - PG_CATS.indexOf(b.category)) || ((a.order || 0) - (b.order || 0)));
    if (this._match) for (const e of out) this._match.unlocks.push(e.id);
    if (announce) this._announce(out);
    this._queueSave();
    return out;
  },
  newUnlocks() {
    if (!this.state) return [];
    const has = typeof ARSENAL !== 'undefined' && ARSENAL.byId && ARSENAL.weapons && ARSENAL.weapons.length;
    return this.state.fresh.filter(id => !has || ARSENAL.byId[id]);
  },
  isNew(id) { return !!this.state && this.state.fresh.includes(id); },
  markViewed(id) {
    if (!this.state) return;
    const f = this.state.fresh, n = f.length;
    this.state.fresh = id == null ? [] : f.filter(x => x !== id);
    if (this.state.fresh.length !== n) { this._renderBadge(); this._queueSave(); }
  },

  // ---------- DOM: popups, level banner, unlock toasts, menu badge ----------
  _dom() {
    if (this._el) return this._el;
    if (!document.getElementById('progressionCSS')) {
      const st = document.createElement('style'); st.id = 'progressionCSS'; st.textContent = PG_CSS; document.head.appendChild(st);
    }
    const mk = (tag, id, html) => { const d = document.createElement(tag); d.id = id; if (html) d.innerHTML = html; document.body.appendChild(d); return d; };
    const el = this._el = {
      pops: mk('div', 'pgPops'), toasts: mk('div', 'pgToasts'),
      lvl: mk('div', 'pgLevel', '<small>LEVEL UP</small><b></b><i></i>'), badge: null
    };
    const top = document.getElementById('menuTop');
    if (top) {
      const b = document.createElement('div'); b.id = 'pgBadge';
      b.innerHTML = '<div class="pgLv"><span>1</span><i><b></b></i></div><div class="pgInfo"><div class="pgL">LEVEL 1</div>' +
        '<div class="pgBar"><i></i></div><div class="pgX"></div></div><div class="pgNew"></div>';
      top.insertBefore(b, top.querySelector('.topBtns'));
      el.badge = { root: b, lv: b.querySelector('.pgLv span'), mini: b.querySelector('.pgLv b'), l: b.querySelector('.pgL'), bar: b.querySelector('.pgBar i'), x: b.querySelector('.pgX'), nw: b.querySelector('.pgNew') };
    }
    return el;
  },
  _fmt(n) { return Math.round(n).toLocaleString('en-US'); },
  _renderBadge() {
    const B = this._dom().badge; if (!B || !this.state) return;
    const I = this.levelInfo();
    B.lv.textContent = I.level; B.l.textContent = I.max ? 'LEVEL ' + I.level + ' · MAX' : 'LEVEL ' + I.level;
    B.bar.style.width = B.mini.style.width = (I.progress * 100).toFixed(1) + '%';
    B.x.textContent = I.max ? this._fmt(I.xp) + ' XP' : this._fmt(I.into) + ' / ' + this._fmt(I.need);
    const n = this.newUnlocks().length;
    B.nw.textContent = n ? n + ' NEW' : ''; B.nw.style.display = n ? '' : 'none';
    B.root.title = 'Level ' + I.level + (I.max ? ' (max)' : ' · ' + this._fmt(I.into) + ' / ' + this._fmt(I.need) + ' XP · ' + this._fmt(I.need - I.into) + ' XP to level ' + (I.level + 1)) + (n ? ' · ' + n + ' new weapons in the Armory' : '');
  },
  _popup(amt, why) {
    const box = this._dom().pops, d = document.createElement('div'); d.className = 'pgPop';
    const b = document.createElement('b'), i = document.createElement('i'), s = document.createElement('span');
    b.textContent = '+' + this._fmt(amt); i.textContent = 'XP'; s.textContent = why ? String(why).toUpperCase() : '';
    d.append(b, i, s); box.appendChild(d);
    while (box.children.length > 6) box.firstChild.remove();
    setTimeout(() => d.remove(), 1600);
  },
  _levelUp(L) {
    const b = this._dom().lvl;
    b.querySelector('b').textContent = 'LEVEL ' + L;
    b.classList.remove('show'); void b.offsetWidth; b.classList.add('show');
    try { if (typeof SFX !== 'undefined' && SFX.rankUp) SFX.rankUp(); } catch (e) { }
  },
  _announce(list) {
    const items = list.length > 4 ? [...list.slice(0, 3), { more: list.length - 3 }] : list;
    const q = this._toastQ;
    for (const e of items) q.push(e);
    // a long backlog collapses into one summary toast
    if (q.length > 5) { const more = q.splice(3).reduce((n, x) => n + (x.more || 1), 0); q.push({ more }); }
    try { if (typeof SFX !== 'undefined' && SFX.uiConfirm) setTimeout(() => SFX.uiConfirm(), 350); } catch (e) { }
    this._pumpToasts();
  },
  _pumpToasts() {
    const box = this._dom().toasts;
    let k = 0;
    while (box.children.length < 3 && this._toastQ.length) {
      const e = this._toastQ.shift(), d = document.createElement('div'); d.className = 'pgToast';
      const delay = k++ * 250; d.style.animationDelay = delay + 'ms';
      const t = document.createElement('div');
      if (e.more) {
        t.append('+' + e.more + ' MORE WEAPONS UNLOCKED');
        const s = document.createElement('span'); s.textContent = 'OPEN THE ARMORY TO SEE THEM'; t.append(s);
      } else {
        if (typeof ARSENAL !== 'undefined' && ARSENAL.thumb && e.id && ARSENAL.byId && ARSENAL.byId[e.id]) {
          const img = document.createElement('img'); img.alt = ''; img.onerror = () => img.remove(); img.src = ARSENAL.thumb(e.id); d.append(img);
        }
        const b = document.createElement('b'); b.textContent = String(e.name || e.id).toUpperCase();
        const r = this.ruleFor(e.category, e.order), s = document.createElement('span');
        s.textContent = this._catLabel(e.category) + ' · ' + (r.type === 'level' ? 'LEVEL ' + r.level : 'CHALLENGE COMPLETE');
        t.append('NEW WEAPON UNLOCKED · ', b, s);
      }
      d.append(t); box.appendChild(d);
      setTimeout(() => { d.remove(); this._pumpToasts(); }, 4250 + delay);
    }
  },

  // ---------- debug ----------
  debugGrant(levels) {
    if (!this.state) return 0;
    const target = Math.min(PG_MAX, this.state.level + Math.max(1, Math.round(+levels || 1)));
    const need = this.xpForLevel(target) - this.state.xp;
    if (need > 0) this.addXP(need, 'DEBUG');
    return this.state.level;
  }
};
PROGRESSION.state = PROGRESSION._defaults();
