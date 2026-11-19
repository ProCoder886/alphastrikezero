// ---------- Arsenal: the weapon catalogue ----------
// The catalogue (catalogue.js) with its generated combat stats, the weapon models built by the Gunsmith with the
// attachment kit of each weapon, the weapon sound packs, unlock state (PROGRESSION) and the saved loadout.
//
// Public API (used by weapons.js, the Armory and the progression system):
//   ARSENAL.ready / await ARSENAL.init()  (boot: ARSENAL.init -> PROGRESSION.init -> LOADOUT.load)
//   ARSENAL.CATS                      categories [{key, label, short, slot, cls}]
//   ARSENAL.list(cat) / ARSENAL.get(id) / ARSENAL.all()
//   ARSENAL.defName(id)               WEAPON_DEFS key of a catalogue weapon ('HQ_' + id)
//   ARSENAL.stats(id)                 {damage, fireRate, range, accuracy, mobility, control} 0..100 for UI bars
//   ARSENAL.isUnlocked(id) / ARSENAL.requirement(id)
//   ARSENAL.thumb(id)                 thumbnail URL (rendered by the Armory, '' until it exists)
//   await ARSENAL.instance(id)        fresh model with the weapon's attachment kit (userData: hqInfo, rig, mounted)
//   await ARSENAL.preview(id, kit)    model centred on its bounds for showcase rendering (Armory)
//   ARSENAL.slots(id) / compatible(id, slot) / kitFor(id) / setKit(id, slot, attId)
//   LOADOUT.primary[3] / secondary[2] / melee / launcher / lethal / tactical, LOADOUT.set(g, i, id), LOADOUT.save()
//   LOADOUT_SLOTS                     the ten loadout slots and the categories each one takes
//
// Weapon frame: origin at the pistol grip, muzzle along -Z, +Y up, +X right, metres.
const ARSENAL_CATS = [
  { key: 'mg', label: 'MACHINE GUNS', short: 'MG', slot: 'primary', cls: 'lmg' },
  { key: 'smg', label: 'SUBMACHINE GUNS', short: 'SMG', slot: 'primary', cls: 'smg' },
  { key: 'lmg', label: 'LIGHT MACHINE GUNS', short: 'LMG', slot: 'primary', cls: 'lmg' },
  { key: 'rifle', label: 'MARKSMAN & SNIPER RIFLES', short: 'SNIPER', slot: 'primary', cls: 'sniper' },
  { key: 'assault', label: 'ASSAULT RIFLES', short: 'AR', slot: 'primary', cls: 'rifle' },
  { key: 'shotgun', label: 'SHOTGUNS', short: 'SHOTGUN', slot: 'secondary', cls: 'shotgun' },
  { key: 'pistol', label: 'PISTOLS', short: 'PISTOL', slot: 'secondary', cls: 'pistol' },
  { key: 'launcher', label: 'LAUNCHERS', short: 'LAUNCHER', slot: 'launcher', cls: 'launcher' },
  { key: 'melee', label: 'MELEE', short: 'MELEE', slot: 'melee', cls: 'melee' }
];
// class templates the per-weapon stats are layered on
const ARSENAL_TPL = {
  assault:  { cls: 'rifle', auto: true, hip: 0.032, ads: 0.004, bloom: 0.005, maxBloom: 0.036, recV: 0.015, recH: 0.0075, adsFov: 48, typ: 28, len: 0.82 },
  smg:      { cls: 'smg', auto: true, hip: 0.029, ads: 0.0075, bloom: 0.005, maxBloom: 0.04, recV: 0.011, recH: 0.0075, adsFov: 55, typ: 19, len: 0.55 },
  mg:       { cls: 'lmg', auto: true, hip: 0.05, ads: 0.011, bloom: 0.0045, maxBloom: 0.055, recV: 0.019, recH: 0.013, adsFov: 52, typ: 34, len: 1.1 },
  lmg:      { cls: 'lmg', auto: true, hip: 0.045, ads: 0.01, bloom: 0.004, maxBloom: 0.05, recV: 0.017, recH: 0.012, adsFov: 52, typ: 30, len: 1.05 },
  dmr:      { cls: 'dmr', auto: false, hip: 0.05, ads: 0.0015, bloom: 0.018, maxBloom: 0.05, recV: 0.04, recH: 0.012, adsFov: 40, typ: 65, len: 1.0 },
  sniper:   { cls: 'sniper', auto: false, hip: 0.07, ads: 0, bloom: 0, maxBloom: 0.05, recV: 0.085, recH: 0.015, adsFov: 16, scope: 8, typ: 140, len: 1.15 },
  shotgun:  { cls: 'shotgun', auto: false, hip: 0.06, ads: 0.045, bloom: 0.006, maxBloom: 0.04, recV: 0.06, recH: 0.021, adsFov: 60, typ: 16, len: 0.95 },
  pistol:   { cls: 'pistol', auto: false, hip: 0.024, ads: 0.006, bloom: 0.011, maxBloom: 0.036, recV: 0.03, recH: 0.01, adsFov: 60, typ: 28, len: 0.2 },
  launcher: { cls: 'launcher', auto: false, hip: 0.03, ads: 0.006, bloom: 0, maxBloom: 0.02, recV: 0.06, recH: 0.01, adsFov: 50, typ: 220, len: 0.95 },
  melee:    { cls: 'melee', auto: false, hip: 0, ads: 0, bloom: 0, maxBloom: 0, recV: 0, recH: 0, adsFov: 70, noADS: true, typ: 100, len: 0.3 }
};
// suppressed fire voice per class
const ARSENAL_SUP = { pistol: 'sup_pistol', smg: 'sup_smg', rifle: 'sup_rifle', lmg: 'sup_rifle', dmr: 'sup_sniper', sniper: 'sup_sniper' };
// The source fire MP3s are multi-shot demonstrations. The imported sf_* clips contain one
// original attack each; every supplied take is rotated across weapons in its category.
const SUPPLIED_FIRE = {
  assault: ['sf_assault_rifle_1', 'sf_asasault_rifle_2'], rifle: ['sf_assault_rifle_1', 'sf_asasault_rifle_2'],
  smg: [1,2,3,4,5,6].map(i => 'sf_sub_machine_gun_' + i),
  mg: [1,2,3,4,5].map(i => 'sf_machine_gun_' + i),
  lmg: [1,2,3,4,5,6].map(i => 'sf_light_machine_gun_' + i),
  pistol: [1,2,3,4].map(i => 'sf_pistol_' + i), shotgun: ['sf_shotgun_1', 'sf_shotgun_2'], launcher: ['sf_rpg_1']
};
const SUPPLIED_RELOAD = {
  assault: ['sr_m4a1', 'sr_assault_rifle_reload_1', 'sr_assault_rifle_reload_2'],
  rifle: ['sr_assault_rifle_reload_1', 'sr_m4a1', 'sr_assault_rifle_reload_2'],
  smg: [1,2,3,4,5].map(i => 'sr_sub_machine_gun_reload_' + i),
  mg: [1,2,3,4,5,6].map(i => 'sr_machine_gun_reload_' + i),
  lmg: [1,2,3,4,5,6].map(i => 'sr_light_machine_gun_reload_' + i),
  pistol: [1,2,3,4].map(i => 'sr_pistol_reload_' + i), shotgun: ['sr_shotgun_reload_1', 'sr_shotgun_reload_2']
};

const ARSENAL = {
  CATS: ARSENAL_CATS, ready: false, weapons: [], byId: {}, attachments: [], attById: {}, audioMeta: null, _initP: null, _thumbs: {},

  init() {
    if (this._initP) return this._initP;
    const getJSON = async (path) => {
      const pre = window.ASSET_JSON && window.ASSET_JSON[path];
      if (pre) return pre;
      try { const r = await fetch(assetURL(path)); return r.ok ? await r.json() : null; } catch (e) { return null; }
    };
    this._initP = (async () => {
      this.weapons = GS_CATALOGUE.filter(e => ARSENAL_CATS.some(c => c.key === e.category) && GSF[e.fam]);
      this.byId = {}; for (const e of this.weapons) this.byId[e.id] = e;
      this.attachments = GS_ATTACH; this.attById = GS_ATT_BY_ID;
      // weapon sound packs (generated single shots, burst tails, reloads with their event times, handling effects)
      const [meta, supplied, ...packs] = await Promise.all([getJSON('assets/audio/arsenal_audio.json'), getJSON('assets/audio/supplied_audio.json'), ...['arsenal_fire', 'arsenal_reload', 'arsenal_fx', 'supplied_fire', 'supplied_reload'].map(p => getJSON('assets/audio/' + p + '.json'))]);
      const loading = packs.map(p => AudioSys.addPack(p));
      loading.push(GSTEX.preload());   // weapon finishes and skins (the thumbnails must not catch one still loading)
      await Promise.all(loading);
      if (meta && meta.levels) Object.assign(SOUND_LEVEL, meta.levels);
      if (supplied) for (const name of Object.keys(supplied.source || {})) SOUND_LEVEL[name] = name.startsWith('sf_') ? 0.82 : 0.78;
      SOUND_LEVEL.sr_shell_1 = SOUND_LEVEL.sr_shell_2 = 0.72;
      this.audioMeta = meta || { reload: {}, fx: {}, fire: {} };
      this.suppliedAudio = supplied || null;
      for (const e of this.weapons) WEAPON_DEFS[this.defName(e.id)] = this.makeDef(e);
      // the hostiles' weapons carry the same names as their catalogue counterparts (kill feed, pick-up prompts)
      for (const k in GS_LEGACY_MAP) if (WEAPON_DEFS[k] && this.byId[GS_LEGACY_MAP[k]]) WEAPON_DEFS[k].label = this.byId[GS_LEGACY_MAP[k]].name;
      this.ready = true;
      return this;
    })();
    return this._initP;
  },

  all() { return this.weapons; },
  list(cat) { return this.weapons.filter(e => e.category === cat).sort((a, b) => (a.order || 0) - (b.order || 0)); },
  get(id) { return this.byId[id] || null; },
  defName(id) { return 'HQ_' + id; },
  cat(key) { return ARSENAL_CATS.find(c => c.key === key) || null; },
  thumb(id) { return this._thumbs[id] || ''; },
  isUnlocked(id) {
    const e = this.byId[id]; if (!e) return false;
    if (typeof PROGRESSION !== 'undefined' && PROGRESSION.isUnlocked) return PROGRESSION.isUnlocked(e);
    return !!e.unlockedByDefault;
  },
  requirement(id) {
    const e = this.byId[id]; if (!e) return '';
    if (typeof PROGRESSION !== 'undefined' && PROGRESSION.requirementText) return PROGRESSION.requirementText(e);
    return e.unlockedByDefault ? '' : 'LOCKED';
  },

  // ---------- combat stats ----------
  makeDef(e) {
    const s = e.st || {}, cat = e.category;
    const T = ARSENAL_TPL[cat === 'rifle' ? (s.bolt ? 'sniper' : 'dmr') : cat];
    const d = Object.assign({}, T);
    d.dmg = s.d || T.typ; d.rpm = s.r || 600; d.mag = s.m || 1; d.reload = s.t || 2;
    if (s.p) d.pellets = s.p;
    if (s.auto) d.auto = true; if (s.semi) d.auto = false;
    if (s.bolt) d.bolt = true; if (s.pump) d.pump = true; if (s.boxMag) d.boxMag = true;
    if (s.scope) d.scope = s.scope;
    if (s.spinUp) d.spinUp = s.spinUp; if (s.noADS) d.noADS = true;
    // heavier rounds kick more, fast guns a little less per shot
    const k = clamp(Math.pow(d.dmg / T.typ, 0.75), 0.7, 1.7);
    if (cat !== 'melee' && cat !== 'launcher') { d.recV = T.recV * k * (d.rpm > 900 ? 0.88 : 1); d.recH = T.recH * (0.85 + k * 0.15) * (d.rpm > 900 ? 1.1 : 1); }
    if (cat === 'pistol' && d.dmg > 50) { d.bloom = 0.028; d.adsFov = 58; d.ads = 0.004; }
    if (cat === 'pistol' && d.auto) { d.hip = 0.02; d.bloom = 0.008; d.recV *= 0.7; }
    if (cat === 'smg' && d.rpm >= 1000) { d.hip = 0.034; d.maxBloom = 0.05; }
    if (cat === 'shotgun') {
      d.shells = !(s.boxMag || e.fam === 'dbl');
      if (e.fam === 'dbl') { d.hip = 0.07; d.ads = 0.055; d.recV = 0.09; }
      if (d.auto) { d.hip = 0.065; d.ads = 0.05; d.recV = 0.05; }
    }
    if (cat === 'launcher') { d.launcher = s.gren ? 'grenade' : 'rocket'; d.shells = !!s.shells; d.blast = d.dmg / 200; }
    if (cat === 'melee') { d.melee = s.blunt ? 'blunt' : 'blade'; d.mag = 1; d.reload = 0; }
    if (e.fam === 'rotary') { d.hip = 0.05; d.ads = 0.035; d.bloom = 0.002; d.maxBloom = 0.06; d.recV = 0.006; d.recH = 0.008; d.adsFov = 66; }
    const P = e.p || {};
    d.len = P.len ? P.len + (cat === 'pistol' ? 0.03 : 0.26) : T.len;
    const voice = e.snd, A = this.audioMeta || {}, R = A.reload || {};
    const one = (k2) => (R[k2] ? Object.assign({ id: k2 }, R[k2]) : null);
    let rl = e.rl ? { tac: one('r_' + e.rl + '_tac'), empty: one('r_' + e.rl + '_empty') } : null;
    const group = this.list(cat), idx = Math.max(0, group.findIndex(x => x.id === e.id));
    const fireNames = SUPPLIED_FIRE[cat] || [], fireName = fireNames[idx % fireNames.length];
    const reloadNames = SUPPLIED_RELOAD[cat] || [], reloadName = reloadNames[idx % reloadNames.length];
    const useSuppliedFire = !voice.startsWith('sup_') && e.fam !== 'revolver' && cat !== 'rifle' && (cat !== 'launcher' || d.launcher === 'rocket');
    const useSuppliedReload = !(cat === 'rifle' && d.bolt) && e.fam !== 'revolver' && e.fam !== 'dbl' && !(cat === 'shotgun' && d.shells);
    const suppliedRS = this.suppliedAudio && this.suppliedAudio.reload && this.suppliedAudio.reload[reloadName];
    if (useSuppliedReload && suppliedRS && AudioSys.has(reloadName)) {
      const common = { magOut: suppliedRS.events.magOut, magIn: suppliedRS.events.magIn };
      rl = { tac: { id: reloadName, dur: suppliedRS.dur, events: common },
        empty: { id: reloadName, dur: suppliedRS.dur, events: Object.assign({}, suppliedRS.events) } };
    }
    const heavy = cat === 'lmg' || cat === 'mg' || cat === 'launcher' || d.cls === 'sniper';
    return Object.assign(d, {
      model: 'hq:' + e.id, hq: e.id, label: e.name, cat,
      snd: {
        s: cat === 'melee' ? null : (useSuppliedFire && fireName && AudioSys.has(fireName) ? fireName : 'f_' + voice), sup: ARSENAL_SUP[d.cls] ? 'f_' + ARSENAL_SUP[d.cls] : null, tail: (A.tails || {})[voice] || null, vol: cat === 'rifle' ? 1.05 : 0.95, rate: useSuppliedFire ? 1 : (e.pitch || 1), hq: true,
        // marksman and sniper rifles: the report rolling back from the terrain (outdoors), started with the shot
        echo: cat !== 'rifle' ? null : voice === 'amr50' ? 'ft_amr' : voice === 'dmr' ? 'ft_dmr' : 'ft_sniper',
        equip: cat === 'pistol' ? 'x_equip_pistol' : cat === 'melee' ? 'x_equip_blade' : heavy ? 'x_equip_heavy' : 'x_equip_rifle', dry: 'x_dry',
        cycle: d.bolt ? 'x_bolt_cycle' : d.pump ? 'x_pump' : null,
        swing: cat === 'melee' ? (s.blunt ? 'x_swing_blunt' : 'x_swing_blade') : null, hit: cat === 'melee' ? (s.blunt ? 'x_hit_blunt' : 'x_hit_blade') : null
      },
      reloadSnd: rl && (rl.tac || rl.empty) ? rl : null
    });
  },

  stats(id) {
    const d = WEAPON_DEFS[this.defName(id)]; if (!d) return null;
    const ttk = d.dmg * (d.pellets ? d.pellets * 0.6 : 1);
    const range = { pistol: 30, smg: 35, rifle: 65, dmr: 85, sniper: 100, lmg: 70, shotgun: 15, launcher: 60, melee: 3 }[d.cls] || 50;
    return {
      damage: clamp(ttk / (d.cls === 'sniper' ? 2.3 : d.cls === 'launcher' ? 3.2 : d.cls === 'melee' ? 1.6 : 1.3), 5, 100) | 0,
      fireRate: clamp(d.rpm / 11, 5, 100) | 0,
      range,
      accuracy: clamp(100 - (d.hip * 900 + d.ads * 2500), 5, 100) | 0,
      mobility: clamp(100 - (d.len || 0.8) * 55 - (d.cls === 'lmg' ? 20 : 0), 10, 100) | 0,
      control: clamp(100 - d.recV * 2600 - d.recH * 2000, 5, 100) | 0
    };
  },

  // ---------- attachments ----------
  SLOTS: ['optic', 'muzzle', 'underbarrel', 'laser', 'magazine'],
  SLOT_LABEL: { optic: 'OPTIC', muzzle: 'MUZZLE', underbarrel: 'UNDERBARREL', laser: 'LASER / LIGHT', magazine: 'MAGAZINE' },
  slots(id) { const e = this.byId[id]; return e ? GUNSMITH.slots(e).filter(s => GUNSMITH.compatible(e, s).length) : []; },
  compatible(id, slot) { const e = this.byId[id]; return e ? GUNSMITH.compatible(e, slot) : []; },
  // the player's choice (Armory) or the weapon's default kit; bolt-action rifles always carry a scope
  kitFor(id) {
    const e = this.byId[id]; if (!e) return {};
    const own = LOADOUT.kits && LOADOUT.kits[id];
    const kit = GUNSMITH.validKit(e, own || e.kit || {});
    if (e.st && e.st.bolt && !kit.optic) kit.optic = (e.kit && e.kit.optic) || 'op_sniper';
    return kit;
  },
  setKit(id, slot, attId) {
    const e = this.byId[id]; if (!e) return;
    const kit = Object.assign({}, this.kitFor(id));
    if (attId) kit[slot] = attId; else delete kit[slot];
    LOADOUT.kits[id] = GUNSMITH.validKit(e, kit); LOADOUT.save();
  },

  // ---------- models ----------
  instance(id, kit) {
    const e = this.byId[id];
    if (!e) return Promise.reject(new Error('unknown weapon ' + id));
    try { return Promise.resolve(GUNSMITH.build(e, kit || this.kitFor(id)).root); } catch (err) { return Promise.reject(err); }
  },
  async preview(id, kit) {
    const root = await this.instance(id, kit);
    const box = new THREE.Box3().setFromObject(root), c = box.getCenter(new THREE.Vector3());
    const g = new THREE.Group(); root.position.sub(c); g.add(root);
    g.userData.size = box.getSize(new THREE.Vector3());
    return g;
  }
};

// ---------- loadout: three primaries, two secondaries, melee, launcher, and two grenades ----------
const LOADOUT_SLOTS = [
  { g: 'primary', i: 0, key: '1', label: 'PRIMARY 1', cats: ['assault', 'mg', 'smg', 'lmg', 'rifle'], defaultCats: ['assault', 'mg'] },
  { g: 'primary', i: 1, key: '2', label: 'PRIMARY 2', cats: ['assault', 'mg', 'smg', 'lmg', 'rifle'], defaultCats: ['smg'] },
  { g: 'primary', i: 2, key: '3', label: 'PRIMARY 3', cats: ['assault', 'mg', 'smg', 'lmg', 'rifle'], defaultCats: ['lmg', 'rifle'] },
  { g: 'secondary', i: 0, key: '4', label: 'SECONDARY 1', cats: ['pistol', 'shotgun'], defaultCats: ['pistol'] },
  { g: 'secondary', i: 1, key: '5', label: 'SECONDARY 2', cats: ['pistol', 'shotgun'], defaultCats: ['shotgun', 'pistol'] },
  { g: 'melee', i: 0, key: '6', label: 'MELEE', cats: ['melee'] },
  { g: 'launcher', i: 0, key: '7', label: 'LAUNCHER', cats: ['launcher'] },
  { g: 'lethal', i: 0, key: 'G', label: 'LETHAL', gren: ['frag'] },
  { g: 'tactical', i: 0, key: 'T', label: 'TACTICAL', gren: ['flash', 'smoke'] }
];
const LOADOUT = {
  primary: [], secondary: [], melee: null, launcher: null, lethal: 'frag', tactical: 'flash', kits: {},
  slotDef(g, i) { return LOADOUT_SLOTS.find(s => s.g === g && s.i === (i || 0)) || null; },
  // the slot a weapon of this category goes to by default
  slotFor(cat) { return LOADOUT_SLOTS.find(s => s.cats && s.cats.includes(cat)) || null; },
  get(g, i) { return g === 'primary' || g === 'secondary' ? this[g][i] || null : this[g] || null; },
  firstOf(cats, avoid) {
    for (const c of cats) for (const e of ARSENAL.list(c)) if (ARSENAL.isUnlocked(e.id) && e.id !== avoid) return e.id;
    return null;
  },
  async load() {
    const s = (typeof SAVE !== 'undefined' && await SAVE.get('loadout3')) || {};
    const old = (!s.v && typeof SAVE !== 'undefined' && await SAVE.get('loadout2')) || {};
    this.kits = s.kits || old.kits || {};
    const ok = (id, cats) => id && ARSENAL.byId[id] && ARSENAL.isUnlocked(id) && cats.includes(ARSENAL.byId[id].category);
    this.primary = []; this.secondary = [];
    for (const sl of LOADOUT_SLOTS) {
      if (sl.gren) { const v = s[sl.g]; this[sl.g] = sl.gren.includes(v) ? v : (sl.g === 'tactical' && sl.gren.includes(old.grenade) ? old.grenade : sl.gren[0]); continue; }
      const saved = sl.g === 'primary' || sl.g === 'secondary' ? (s[sl.g] || [])[sl.i] : s[sl.g];
      const id = ok(saved, sl.cats) ? saved : this.firstOf(sl.defaultCats || sl.cats);
      if (sl.g === 'primary' || sl.g === 'secondary') this[sl.g][sl.i] = id; else this[sl.g] = id;
    }
    this.save();
  },
  save() { if (typeof SAVE !== 'undefined') SAVE.set('loadout3', { v: 3, primary: this.primary, secondary: this.secondary, melee: this.melee, launcher: this.launcher, lethal: this.lethal, tactical: this.tactical, kits: this.kits }); },
  set(g, i, id) {
    if (g === 'primary' || g === 'secondary') this[g][i] = id; else this[g] = id;
    this.save();
  },
  // every slot gets a random unlocked weapon of its own categories (and a random tactical grenade)
  randomize() {
    const pick = (a) => a[Math.floor(Math.random() * a.length)], used = new Set();
    for (const sl of LOADOUT_SLOTS) {
      if (sl.gren) { this[sl.g] = pick(sl.gren); continue; }
      // never the same weapon in two slots
      const all = sl.cats.flatMap(c => ARSENAL.list(c)).filter(e => ARSENAL.isUnlocked(e.id)).map(e => e.id), pool = all.filter(id => !used.has(id));
      const id = pool.length ? pick(pool) : all.length ? pick(all) : null;
      if (id) { this.set(sl.g, sl.i, id); used.add(id); }
    }
    this.save();
  },
  // weapon ids in inventory order (keys 1-7): primaries, secondaries, melee, launcher
  ids() {
    // a match started before the saved loadout finished loading still gets the default ten (never the old armoury)
    if (!this.primary.length && ARSENAL.ready) for (const sl of LOADOUT_SLOTS) {
      if (sl.gren) continue;
      const id = this.firstOf(sl.defaultCats || sl.cats); if (sl.g === 'primary' || sl.g === 'secondary') this[sl.g][sl.i] = id; else this[sl.g] = id;
    }
    return [...this.primary, ...this.secondary, this.melee, this.launcher].filter(Boolean);
  }
};
