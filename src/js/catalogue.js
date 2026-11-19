// ---------- Weapon catalogue: this game's own arsenal ----------
// All names, makers and designs are fictional. Every entry is built by the Gunsmith from its family `fam` and
// parameters `p` (c = [metal, furniture, accent] finishes).
//   cat    category (mg, smg, lmg, rifle, assault, shotgun, pistol, launcher, melee); the order inside a category is the
//          unlock order: the first seven are available from the start, the rest unlock by level or challenge
//   st     stats: d damage, r rounds per minute, m magazine, t reload seconds (per shell for tube-fed guns),
//          + optional p pellets, semi, bolt, pump, auto, scope
//   snd    fire voice (arsenal_fire pack), pit = pitch;  rl = reload recording family (arsenal_reload pack)
//   kit    default attachments (the Armory can change them)
const GS_CAT_SRC = {
  assault: [
    ['ar_kestrel', 'KESTREL C4', 'ar', { hg: 'mlok', hgLen: 0.26, stock: 'm4', mag: 'pmag' }, { d: 27, r: 780, m: 30, t: 2.1 }, 'carbine', 1, { optic: 'op_reflex' }, '5.56 carbine. Balanced and easy to control.'],
    ['ak_vargan', 'VARGAN 7', 'ak', { len: 0.6, stock: 'wood', c: ['steel', 'wood'] }, { d: 34, r: 600, m: 30, t: 2.4 }, 'ak762', 1, {}, '7.62 rifle. Hits hard, kicks hard.'],
    ['bp_halcyon', 'HALCYON A3', 'bullpup', { style: 'aug', c: ['steel', 'olive'], mag: 'g36' }, { d: 26, r: 700, m: 30, t: 2.4 }, 'bullpup', 1, { optic: 'op_dot' }, 'Bullpup rifle. Long barrel in a short body.'],
    ['md_talon', 'TALON SR', 'modular', { style: 'scar', c: ['grey', 'tan'] }, { d: 30, r: 640, m: 30, t: 2.2 }, 'ar556', 1, { optic: 'op_holo', underbarrel: 'ub_angled' }, 'Modular rifle with a steady, slower cadence.'],
    ['md_nord', 'NORD G6', 'modular', { style: 'g36', c: ['steel', 'polymer'] }, { d: 26, r: 750, m: 30, t: 2.3 }, 'ar556', 1.05, {}, 'Polymer rifle with a carry-handle sight.'],
    ['ar_kestrel_k', 'KESTREL K', 'ar', { hg: 'quad', hgLen: 0.18, bExt: 0.05, stock: 'm4', mz: 'comp' }, { d: 26, r: 850, m: 30, t: 2.0 }, 'carbine', 1.06, { optic: 'op_reflex', underbarrel: 'ub_vgrip' }, 'Short-barrel carbine for close quarters.'],
    ['ak_vargan_5', 'VARGAN 5M', 'ak', { len: 0.58, stock: 'skel', mag: 'ak5', c: ['steel', 'polymer'], mz: 'brake' }, { d: 28, r: 680, m: 30, t: 2.3 }, 'ak545', 1, { optic: 'op_dot' }, 'Light-calibre rifle with a folding stock.'],
    ['bp_fenris', 'FENRIS FX', 'bullpup', { style: 'famas', mag: 'stanag', c: ['steel', 'polymer'] }, { d: 24, r: 950, m: 25, t: 2.3 }, 'bullpup', 1.08, {}, 'Very fast-firing bullpup with a carry handle.'],
    ['md_talon_h', 'TALON H', 'modular', { style: 'scar', len: 0.68, mag: 'box308', br: 0.0095, c: ['grey', 'tan'] }, { d: 38, r: 560, m: 20, t: 2.5 }, 'br762', 1, { optic: 'op_prism' }, 'Heavy-calibre battle rifle.'],
    ['ar_arclight', 'ARCLIGHT L20', 'ar', { hg: 'round', hgLen: 0.3, bExt: 0.16, stock: 'fixed', mag: 'stanag' }, { d: 30, r: 720, m: 30, t: 2.2 }, 'ar556', 1, {}, 'Full-length rifle. Accurate at range.'],
    ['ak_vargan_x', 'VARGAN X12', 'ak', { len: 0.6, hg: 'rail', stock: 'm4', mag: 'ak5', grip: 'ergo', c: ['steel', 'polymer'], mz: 'brake', rail: true }, { d: 29, r: 700, m: 30, t: 2.2 }, 'ak545', 1.04, { optic: 'op_holo', underbarrel: 'ub_stubby' }, 'Modernised rifle with full rails.'],
    ['hk_korda', 'KORDA BR', 'hk', { long: true, stock: 'fixed', c: ['steel', 'olive'] }, { d: 40, r: 540, m: 20, t: 2.6 }, 'br762', 0.96, {}, 'Classic battle rifle. Slow, heavy, precise.'],
    ['bp_halcyon_m', 'HALCYON MICRO', 'bullpup', { style: 'tavor', len: 0.36, c: ['steel', 'tan'] }, { d: 27, r: 820, m: 30, t: 2.3 }, 'bullpup', 0.97, { optic: 'op_reflex' }, 'Compact bullpup built for room clearing.'],
    ['md_spectre', 'SPECTRE MR', 'modular', { style: 'acr', stock: 'm4', upLen: 0.34, c: ['blued', 'polymer'] }, { d: 29, r: 760, m: 30, t: 2.0 }, 'ar556', 0.97, { optic: 'op_hybrid', muzzle: 'mz_sup' }, 'Suppressed special-operations rifle.'],
    ['ar_obsidian', 'OBSIDIAN MK9', 'ar', { hg: 'mlok', hgLen: 0.33, bExt: 0.06, stock: 'boot', grip: 'ergo', mz: 'brake', c: ['crimson', 'polymer'] }, { d: 31, r: 740, m: 30, t: 2.0 }, 'ar556', 0.94, { optic: 'op_lpvo', underbarrel: 'ub_angled', laser: 'ls_green' }, 'Top-tier rifle: flat, fast and accurate.']
  ],
  smg: [
    ['hk_viper', 'VIPER 9', 'hk', {}, { d: 21, r: 800, m: 30, t: 2.0 }, 'smg9', 1, {}, '9 mm submachine gun. Smooth and accurate.'],
    ['bx_stryx', 'STRYX K', 'boxsmg', { style: 'uzi', stock: 'skel' }, { d: 19, r: 900, m: 32, t: 2.0 }, 'smg9', 1.06, {}, 'Compact SMG with the magazine in the grip.'],
    ['pd_hornet', 'HORNET PDW', 'pdw', {}, { d: 18, r: 900, m: 50, t: 2.4 }, 'pdw', 1, { optic: 'op_reflex' }, '50-round defence weapon with a top magazine.'],
    ['vc_razor', 'RAZOR V', 'vec', {}, { d: 17, r: 1100, m: 25, t: 1.8 }, 'smg45', 1, { optic: 'op_holo' }, 'Extreme rate of fire, almost no climb.'],
    ['ar_lynx', 'LYNX 9', 'ar', { hg: 'mlok', hgLen: 0.17, bExt: 0.03, mag: 'stick', stock: 'm4', mz: 'thread', br: 0.0078 }, { d: 20, r: 850, m: 30, t: 1.9 }, 'smg9', 0.95, { optic: 'op_dot' }, 'Pistol-calibre carbine with rifle handling.'],
    ['bx_mako', 'MAKO 10', 'boxsmg', { style: 'mac' }, { d: 16, r: 1090, m: 30, t: 1.9 }, 'smg45', 1.1, { muzzle: 'mz_supS' }, 'Tiny bullet hose. Wild beyond close range.'],
    ['ak_helix', 'HELIX 64', 'ak', { mag: 'helix', len: 0.42, hgLen: 0.15, stock: 'skel', c: ['steel', 'polymer'], mz: 'thread', noSlots: ['underbarrel', 'magazine'] }, { d: 20, r: 700, m: 64, t: 2.6 }, 'smg9', 0.92, {}, '64 rounds in a helical magazine.'],
    ['bx_wasp', 'WASP MP', 'boxsmg', { style: 'mp7', stock: 'wire' }, { d: 20, r: 950, m: 40, t: 1.8 }, 'pdw', 1.05, { optic: 'op_reflex', laser: 'ls_green' }, 'Armour-piercing machine pistol with a fold-down grip.'],
    ['hk_viper_sd', 'VIPER SD', 'hk', { sd: true }, { d: 20, r: 780, m: 30, t: 2.0 }, 'sup_smg', 1, {}, 'Integrally suppressed. Nearly silent.'],
    ['md_krait', 'KRAIT 45', 'modular', { style: 'ump', upLen: 0.27, len: 0.4, mag: 'stick45', stock: 'skel', c: ['steel', 'polymer'], mz: 'thread' }, { d: 24, r: 620, m: 25, t: 2.0 }, 'smg45', 0.94, {}, 'Slow, heavy .45 SMG with real punch.'],
    ['bx_mantis', 'MANTIS M', 'boxsmg', { style: 'skorp', stock: 'wire', c: ['blued', 'wood'] }, { d: 17, r: 880, m: 20, t: 1.7 }, 'smg9', 1.14, {}, 'Pocket machine pistol with a wire stock.'],
    ['bx_stryx_p', 'STRYX PRO', 'boxsmg', { style: 'uzi', len: 0.24, stock: 'skel', c: ['crimson', 'polymer'] }, { d: 19, r: 1000, m: 32, t: 1.9 }, 'smg9', 1.02, { optic: 'op_reflex', muzzle: 'mz_comp' }, 'Railed, compensated and faster.'],
    ['bx_tempest', 'TEMPEST 9', 'boxsmg', { style: 'mp9', stock: 'skel' }, { d: 18, r: 1000, m: 30, t: 1.8 }, 'smg9', 1.1, { optic: 'op_dot' }, 'Featherweight polymer machine pistol.'],
    ['ar_lynx_k', 'LYNX K', 'ar', { hg: 'slim', hgLen: 0.12, bExt: 0.02, mag: 'stick', stock: 'tube', mz: 'comp', br: 0.0078, c: ['steel', 'tan'] }, { d: 19, r: 950, m: 30, t: 1.8 }, 'smg9', 1.02, { optic: 'op_holo', underbarrel: 'ub_stop' }, 'Ultra-short carbine for vehicle crews.'],
    ['pd_phantom', 'PHANTOM 57', 'pdw', { c: ['steel', 'tan'], len: 0.34 }, { d: 21, r: 920, m: 50, t: 2.3 }, 'pdw', 0.95, { optic: 'op_holo', muzzle: 'mz_sup', laser: 'ls_red' }, 'Suppressed elite defence weapon.']
  ],
  mg: [
    ['bl_goliath', 'GOLIATH M7', 'belt', { style: 'gp', len: 0.84, stock: 'fixed', c: ['steel', 'polymer'] }, { d: 36, r: 580, m: 100, t: 5.8 }, 'lmg762', 1, {}, 'General-purpose machine gun. Heavy rounds.'],
    ['bl_tundra', 'TUNDRA 7', 'belt', { style: 'gp', len: 0.88, stock: 'skel', c: ['steel', 'wood'], boxMat: 'steel' }, { d: 35, r: 650, m: 100, t: 5.6 }, 'lmg762', 0.96, {}, 'Long-barrel belt-fed. Reaches far.'],
    ['bl_ironclad', 'IRONCLAD G4', 'belt', { style: 'gp', len: 0.8, stock: 'wood', c: ['steel', 'wood'], boxMat: 'olive' }, { d: 34, r: 600, m: 100, t: 5.4 }, 'lmg762', 0.98, {}, 'Wood-stocked general-purpose gun. Steady and loud.'],
    ['bl_rampart', 'RAMPART MG', 'belt', { style: 'gp', len: 0.9, stock: 'fixed', c: ['grey', 'polymer'] }, { d: 38, r: 560, m: 100, t: 6.0 }, 'lmg762', 0.93, {}, 'Long, heavy medium machine gun. Hits like a rifle.'],
    ['bl_warhound', 'WARHOUND 7', 'belt', { style: 'gp', len: 0.76, stock: 'skel', c: ['blued', 'tan'], boxMat: 'tan' }, { d: 33, r: 680, m: 100, t: 5.4 }, 'lmg762', 1.0, { optic: 'op_reflex' }, 'Lightened 7.62 belt-fed with a reflex sight.'],
    ['bl_ravager', 'RAVAGER MG', 'belt', { style: 'mg3', len: 0.8, drumBox: true, c: ['steel', 'wood'] }, { d: 30, r: 1000, m: 75, t: 5.2 }, 'lmg762', 1.06, {}, 'Jacketed barrel, very high rate of fire.'],
    ['hk_hydra_k', 'HYDRA 21K', 'hk', { long: true, len: 0.68, mag: 'drum', stock: 'skel', c: ['steel', 'polymer'], noSlots: ['magazine'] }, { d: 33, r: 820, m: 80, t: 4.0 }, 'lmg762', 1.08, { optic: 'op_dot' }, 'Short drum-fed machine gun for close assaults.', 'lmgmag'],
    ['bl_reaver', 'REAVER 3', 'belt', { style: 'mg3', len: 0.86, drumBox: true, c: ['steel', 'polymer'] }, { d: 30, r: 1150, m: 75, t: 5.4 }, 'lmg762', 1.1, {}, 'Buzz-saw rate of fire.'],
    ['bl_goliath_e', 'GOLIATH E6', 'belt', { style: 'gp', len: 0.74, stock: 'm4', c: ['blued', 'tan'], boxMat: 'tan' }, { d: 37, r: 600, m: 100, t: 5.2 }, 'lmg762', 1.02, { optic: 'op_prism' }, 'Lightened general-purpose gun.'],
    ['ak_vargan_bull', 'VARGAN BULL', 'ak', { len: 0.7, hg: 'rail', mag: 'drum', bipod: true, stock: 'skel', br: 0.0095, mz: 'brake', c: ['steel', 'polymer'], noSlots: ['magazine'] }, { d: 32, r: 660, m: 95, t: 4.0 }, 'ak762', 0.9, { optic: 'op_dot' }, '95-round drum on a railed heavy rifle.', 'lmgmag'],
    ['hk_hydra', 'HYDRA 21', 'hk', { long: true, len: 0.78, mag: 'drum', stock: 'fixed', c: ['steel', 'polymer'], noSlots: ['magazine'] }, { d: 35, r: 800, m: 80, t: 4.2 }, 'lmg762', 1.06, {}, 'Fast, accurate drum-fed machine gun.', 'lmgmag'],
    ['bl_colossus', 'COLOSSUS 338', 'belt', { style: 'gp', len: 0.92, stock: 'fixed', c: ['blued', 'polymer'] }, { d: 44, r: 520, m: 100, t: 6.2 }, 'lmg762', 0.88, { optic: 'op_prism' }, 'Magnum belt-fed. Reaches across the map.'],
    ['bl_ravager_x', 'RAVAGER X', 'belt', { style: 'mg3', len: 0.9, drumBox: true, c: ['crimson', 'polymer'] }, { d: 31, r: 1200, m: 75, t: 5.4 }, 'lmg762', 1.12, { optic: 'op_holo' }, 'The fastest belt-fed gun in the armoury.'],
    ['bl_behemoth', 'BEHEMOTH GPMG', 'belt', { style: 'gp', len: 0.86, stock: 'm4', c: ['olive', 'olive'], boxMat: 'olive' }, { d: 40, r: 640, m: 125, t: 6.0 }, 'lmg762', 0.92, { optic: 'op_lpvo' }, '125-round belt and a 6x scope.'],
    ['rt_cyclone', 'CYCLONE XR', 'rotary', {}, { d: 21, r: 1500, m: 200, t: 5.0, spinUp: 0.45, noADS: true }, 'rotary', 1, {}, 'Six-barrel rotary gun. Spins up, then shreds.']
  ],
  lmg: [
    ['bl_bulwark', 'BULWARK S', 'belt', { style: 'saw' }, { d: 28, r: 780, m: 100, t: 5.2 }, 'lmg556', 1, {}, 'Belt-fed squad weapon. 100 rounds of cover fire.'],
    ['ak_vargan_rpl', 'VARGAN RPL', 'ak', { len: 0.74, mag: 'drum', bipod: true, stock: 'wood', br: 0.009, c: ['steel', 'wood'], noSlots: ['magazine'] }, { d: 31, r: 620, m: 75, t: 3.8 }, 'ak762', 0.95, {}, 'Drum-fed support rifle.', 'lmgmag'],
    ['ar_kestrel_hb', 'KESTREL HB', 'ar', { hg: 'mlok', hgLen: 0.33, bExt: 0.1, br: 0.0105, mag: 'drum', bipod: true, stock: 'fixed', noSlots: ['magazine'] }, { d: 28, r: 720, m: 60, t: 3.6 }, 'lmg556', 1.04, { optic: 'op_dot' }, 'Heavy-barrel rifle with a 60-round drum.', 'lmgmag'],
    ['bp_halcyon_hb', 'HALCYON HBAR', 'bullpup', { style: 'aug', len: 0.62, br: 0.0095, bipod: true, mag: 'long', c: ['steel', 'olive'], noSlots: ['magazine'] }, { d: 28, r: 690, m: 42, t: 2.9 }, 'bullpup', 0.92, { optic: 'op_prism' }, 'Bullpup support gun with quick reloads.'],
    ['md_anvil', 'ANVIL LSW', 'modular', { style: 'scar', len: 0.72, br: 0.0105, bipod: true, mag: 'drum', c: ['grey', 'polymer'], noSlots: ['magazine'] }, { d: 30, r: 640, m: 75, t: 3.8 }, 'lmg556', 0.96, { optic: 'op_holo' }, 'Drum-fed light support weapon.', 'lmgmag'],
    ['ak_vargan_rpl5', 'VARGAN RPL-5', 'ak', { len: 0.72, mag: 'ak5', bipod: true, stock: 'skel', br: 0.009, c: ['steel', 'polymer'] }, { d: 28, r: 680, m: 45, t: 2.9 }, 'ak545', 1.02, {}, 'Light-calibre support rifle with 45-round magazines.'],
    ['md_nord_lsw', 'NORD LSW', 'modular', { style: 'g36', len: 0.7, br: 0.0102, bipod: true, mag: 'drum', c: ['steel', 'polymer'], noSlots: ['magazine'] }, { d: 27, r: 760, m: 100, t: 3.9 }, 'lmg556', 1.04, {}, 'Polymer support gun with a 100-round twin drum.', 'lmgmag'],
    ['bl_bulwark_p', 'BULWARK PARA', 'belt', { style: 'saw', len: 0.62, stock: 'wire' }, { d: 27, r: 820, m: 100, t: 5.0 }, 'lmg556', 1.05, { optic: 'op_reflex' }, 'Short airborne version: handier, wilder.'],
    ['bl_sirocco', 'SIROCCO NG', 'belt', { style: 'saw', len: 0.7, stock: 'm4', c: ['steel', 'tan'], boxMat: 'tan' }, { d: 30, r: 740, m: 150, t: 5.6 }, 'lmg556', 0.97, { optic: 'op_holo' }, '150-round belt. Rarely reloads.'],
    ['md_talon_iar', 'TALON IAR', 'modular', { style: 'scar', len: 0.66, br: 0.01, mag: 'long', bipod: true, c: ['grey', 'tan'], noSlots: ['magazine'] }, { d: 31, r: 700, m: 45, t: 2.8 }, 'ar556', 0.92, { optic: 'op_lpvo' }, 'Magazine-fed automatic rifle. Rifle accuracy.', 'ar'],
    ['bp_fenris_hb', 'FENRIS LSW', 'bullpup', { style: 'famas', len: 0.6, br: 0.0095, bipod: true, mag: 'long', c: ['steel', 'polymer'], noSlots: ['magazine'] }, { d: 26, r: 900, m: 42, t: 2.9 }, 'bullpup', 1.06, { optic: 'op_dot' }, 'Fast bullpup support weapon.'],
    ['ar_kestrel_lsw', 'KESTREL LSW', 'ar', { hg: 'quad', hgLen: 0.34, bExt: 0.12, br: 0.0105, mag: 'drum', bipod: true, stock: 'boot', c: ['crimson', 'tan'], noSlots: ['magazine'] }, { d: 29, r: 760, m: 100, t: 3.8 }, 'lmg556', 1.0, { optic: 'op_holo' }, 'Quad-rail heavy barrel with a 100-round drum.', 'lmgmag'],
    ['bl_bulwark_m', 'BULWARK MK7', 'belt', { style: 'saw', len: 0.74, stock: 'm4', c: ['steel', 'tan'], boxMat: 'tan' }, { d: 32, r: 720, m: 100, t: 5.2 }, 'lmg556', 0.95, { optic: 'op_dot' }, 'Heavier-calibre squad gun.'],
    ['hk_korda_lmg', 'KORDA LMG', 'hk', { long: true, len: 0.76, mag: 'drum', stock: 'fixed', c: ['steel', 'olive'], noSlots: ['magazine'] }, { d: 30, r: 780, m: 80, t: 4.0 }, 'lmg556', 1.02, {}, 'Roller-delayed light machine gun.', 'lmgmag'],
    ['md_spectre_l', 'SPECTRE LSW', 'modular', { style: 'acr', len: 0.68, br: 0.01, bipod: true, mag: 'drum', stock: 'm4', c: ['blued', 'polymer'], noSlots: ['magazine'] }, { d: 28, r: 800, m: 90, t: 3.7 }, 'lmg556', 0.98, { optic: 'op_hybrid' }, 'Special-operations support weapon.', 'lmgmag']
  ],
  rifle: [
    ['rf_longbow', 'LONGBOW M2', 'rifle', { stock: 'sporter', c: ['blued', 'wood'], len: 0.78 }, { d: 135, r: 55, m: 5, t: 2.6, bolt: 1 }, 'sniper308', 1, { optic: 'op_sniper' }, 'Bolt-action sniper rifle. One shot to the chest.'],
    ['rf_warden', 'WARDEN DMR', 'rifle', { stock: 'sporter', action: 'semi', c: ['blued', 'woodDark'], len: 0.72, mz: 'bird' }, { d: 62, r: 300, m: 20, t: 2.4, semi: 1 }, 'dmr', 1, { optic: 'op_prism' }, 'Semi-automatic marksman rifle.'],
    ['ak_dragoon', 'DRAGOON SV', 'ak', { len: 0.86, stock: 'thumb', hgLen: 0.22, mag: 'box308', br: 0.0082, mz: 'bird', rail: true, c: ['steel', 'wood'] }, { d: 88, r: 220, m: 10, t: 2.6, semi: 1 }, 'dmr', 0.92, { optic: 'op_lpvo' }, 'Long semi-automatic sharpshooter rifle.'],
    ['rf_sentinel', 'SENTINEL 338', 'rifle', { stock: 'chassis', len: 0.86, mag: 'box338', mz: 'brake', bipod: true, fluted: true, c: ['grey', 'polymer'] }, { d: 160, r: 50, m: 5, t: 2.9, bolt: 1 }, 'sniper338', 1, { optic: 'op_sniper' }, 'Magnum chassis rifle for long range.'],
    ['ar_kestrel_spr', 'KESTREL SPR', 'ar', { hg: 'mlok', hgLen: 0.36, bExt: 0.1, br: 0.0095, stock: 'prs', mag: 'short', mz: 'brake' }, { d: 55, r: 340, m: 20, t: 2.2, semi: 1 }, 'dmr', 1.1, { optic: 'op_lpvo', underbarrel: 'ub_bipod' }, 'Precision carbine. Fast follow-up shots.'],
    ['rf_hammerfall', 'HAMMERFALL .50', 'rifle', { stock: 'amr', len: 1.0 }, { d: 190, r: 90, m: 8, t: 3.4, semi: 1, scope: 10 }, 'amr50', 1, { optic: 'op_sniper12' }, 'Semi-automatic anti-materiel rifle.'],
    ['rf_trapper', 'TRAPPER 70', 'rifle', { stock: 'thumb', c: ['blued', 'woodLight'], len: 0.74, knob: 'bare' }, { d: 120, r: 62, m: 6, t: 2.4, bolt: 1 }, 'sniper308', 1.06, { optic: 'op_lpvo' }, 'Light scout rifle. Quick bolt.'],
    ['md_talon_ssr', 'TALON SSR', 'modular', { style: 'scar', len: 0.76, upLen: 0.42, br: 0.0098, mag: 'box308', stock: 'prs', c: ['grey', 'tan'] }, { d: 70, r: 280, m: 20, t: 2.5, semi: 1 }, 'dmr', 0.96, { optic: 'op_sniper', muzzle: 'mz_sup' }, 'Suppressed sniper support rifle.'],
    ['rf_wraith', 'WRAITH AX', 'rifle', { stock: 'chassis', len: 0.82, mz: 'brake', bipod: true, c: ['olive', 'olive'] }, { d: 145, r: 54, m: 10, t: 2.7, bolt: 1 }, 'sniper308', 0.95, { optic: 'op_sniper' }, 'Ten-round tactical bolt-action.'],
    ['ak_vargan_sk', 'VARGAN SK', 'ak', { len: 0.72, stock: 'wood', hgLen: 0.2, mag: 'box308', mz: 'none', c: ['steel', 'woodLight'] }, { d: 58, r: 330, m: 10, t: 2.3, semi: 1 }, 'ak762', 1.05, {}, 'Old-world semi-automatic carbine. Iron sights.'],
    ['rf_zenith', 'ZENITH 408', 'rifle', { stock: 'chassis', len: 0.95, br: 0.012, mag: 'box338', mz: 'heavy', bipod: true, fluted: true, c: ['blued', 'tan'] }, { d: 175, r: 46, m: 7, t: 3.0, bolt: 1 }, 'sniper338', 0.92, { optic: 'op_sniper12' }, 'Extreme-range precision rifle.'],
    ['hk_korda_p', 'KORDA P1', 'hk', { long: true, len: 0.8, stock: 'prs', c: ['steel', 'polymer'] }, { d: 76, r: 300, m: 20, t: 2.6, semi: 1 }, 'dmr', 0.9, { optic: 'op_sniper' }, 'Match-grade semi-automatic sniper.'],
    ['bp_oracle', 'ORACLE XM', 'bullpup', { style: 'tavor', len: 0.62, br: 0.0098, mag: 'box308', mz: 'brake', bipod: true, c: ['steel', 'polymer'] }, { d: 95, r: 200, m: 10, t: 2.8, semi: 1 }, 'sniper308', 1.04, { optic: 'op_sniper' }, 'Bullpup sniper: full barrel, short rifle.'],
    ['rf_longbow_cs', 'LONGBOW CS', 'rifle', { stock: 'sporter', cheek: true, c: ['blued', 'polymer'], len: 0.7 }, { d: 128, r: 58, m: 5, t: 2.5, bolt: 1 }, 'sniper308', 1, { optic: 'op_sniper', muzzle: 'mz_sup' }, 'Covert suppressed sniper rifle.'],
    ['rf_titan', 'TITAN AM', 'rifle', { stock: 'amr', action: 'bolt', len: 1.08, c: ['grey', 'polymer'] }, { d: 230, r: 40, m: 5, t: 3.6, bolt: 1, scope: 12 }, 'amr50', 0.94, { optic: 'op_sniper12' }, 'Bolt-action .50. Stops anything.']
  ],
  shotgun: [
    ['sg_breacher', 'BREACHER 12', 'tubesg', { c: ['blued', 'polymer'] }, { d: 17, p: 9, r: 72, m: 6, t: 0.5, pump: 1 }, 'sgpump', 1, {}, 'Pump-action 12 gauge. Reliable door opener.'],
    ['sg_riot', 'RIOT SA', 'tubesg', { action: 'semi', ext: true, c: ['blued', 'polymer'] }, { d: 14, p: 8, r: 180, m: 8, t: 0.45 }, 'sgsemi', 1, {}, 'Self-loading shotgun. Fast follow-ups.'],
    ['sg_coach', 'COACH DB', 'dbl', { c: ['blued', 'wood'] }, { d: 21, p: 10, r: 320, m: 2, t: 2.3 }, 'sgdouble', 1, {}, 'Two barrels, two triggers, huge damage.'],
    ['ak_vargan_sg', 'VARGAN SG', 'ak', { sg: true, len: 0.62, stock: 'skel', mz: 'none', c: ['steel', 'polymer'], noSlots: ['muzzle'] }, { d: 13, p: 8, r: 240, m: 8, t: 2.4, boxMag: 1 }, 'sgsemi', 0.95, {}, 'Magazine-fed combat shotgun.'],
    ['sg_breacher_s', 'BREACHER SHORTY', 'tubesg', { len: 0.5, grip: 'pistol', stock: 'none', c: ['blued', 'polymer'] }, { d: 18, p: 9, r: 76, m: 4, t: 0.5, pump: 1 }, 'sgpump', 1.06, {}, 'Stockless pump for tight corridors.'],
    ['sg_hammer', 'HAMMER AA', 'autosg', { style: 'box' }, { d: 11, p: 8, r: 300, m: 20, t: 3.2, auto: 1, boxMag: 1 }, 'sgauto', 1, {}, 'Fully automatic drum shotgun.', 'lmgmag'],
    ['sg_ranger', 'RANGER TAC', 'tubesg', { rail: true, grip: 'pistol', stock: 'm4', ext: true, c: ['blued', 'tan'] }, { d: 17, p: 9, r: 80, m: 8, t: 0.48, pump: 1 }, 'sgpump', 0.96, { optic: 'op_reflex' }, 'Railed tactical pump with eight shells.'],
    ['sg_bastion', 'BASTION KS', 'bullsg', {}, { d: 16, p: 9, r: 78, m: 14, t: 0.46, pump: 1 }, 'sgpump', 1.03, { optic: 'op_holo' }, 'Bullpup pump with twin magazine tubes.'],
    ['ar_fury', 'FURY 12', 'ar', { hg: 'mlok', hgLen: 0.3, bExt: 0.05, br: 0.0122, mag: 'sgbox', mz: 'none', stock: 'fixed', noSlots: ['muzzle', 'magazine'] }, { d: 13, p: 8, r: 260, m: 8, t: 2.3, boxMag: 1 }, 'sgsemi', 1.05, { optic: 'op_dot' }, 'Rifle-pattern 12 gauge with box magazines.', 'ar'],
    ['sg_sawtooth', 'SAWTOOTH', 'dbl', { sawn: true, len: 0.42, c: ['blued', 'woodDark'] }, { d: 23, p: 10, r: 340, m: 2, t: 2.2 }, 'sgdouble', 1.08, {}, 'Sawn-off double. Devastating up close.'],
    ['sg_riot_xm', 'RIOT XM', 'tubesg', { action: 'semi', grip: 'pistol', stock: 'm4', rail: true, ext: true, c: ['blued', 'polymer'] }, { d: 15, p: 8, r: 220, m: 7, t: 0.42 }, 'sgsemi', 1, { optic: 'op_dot' }, 'Military self-loader with a collapsible stock.'],
    ['sg_carousel', 'CAROUSEL 12', 'autosg', { style: 'carousel' }, { d: 13, p: 8, r: 200, m: 12, t: 0.5 }, 'sgsemi', 0.92, {}, 'Twelve shells in a revolving drum.'],
    ['sg_legion', 'LEGION 12', 'tubesg', { grip: 'pistol', stock: 'skel', ext: true, c: ['blued', 'polymer'] }, { d: 19, p: 9, r: 84, m: 8, t: 0.47, pump: 1 }, 'sgpump', 0.92, {}, 'Heavy pump with a folding stock.'],
    ['sg_inferno', 'INFERNO DB', 'dbl', { len: 0.6, c: ['blued', 'woodLight'], actMat: 'brass' }, { d: 20, p: 12, r: 300, m: 2, t: 2.1 }, 'sgdouble', 0.95, {}, 'Engraved double with dense, twelve-pellet loads.'],
    ['sg_hammer_x', 'HAMMER X', 'autosg', { style: 'box', len: 0.56, c: ['blued', 'tan'] }, { d: 12, p: 8, r: 340, m: 24, t: 3.0, auto: 1, boxMag: 1 }, 'sgauto', 1.05, { optic: 'op_holo', underbarrel: 'ub_vgrip' }, 'The fastest shotgun in the armoury.', 'lmgmag']
  ],
  pistol: [
    ['ps_sentry', 'SENTRY P9', 'pistol', { style: 'striker' }, { d: 26, r: 480, m: 17, t: 1.4 }, 'pistol9', 1, {}, 'Polymer service pistol. 17 rounds.'],
    ['ps_guardian', 'GUARDIAN .45', 'pistol', { style: 'm1911', len: 0.16, c: ['steel', 'polymer', 'wood'] }, { d: 36, r: 400, m: 8, t: 1.5 }, 'pistol45', 1, {}, 'Steel-frame .45. Eight heavy rounds.'],
    ['rv_marshal', 'MARSHAL R6', 'revolver', { c: ['blued', 'wood'], len: 0.19 }, { d: 58, r: 150, m: 6, t: 2.6 }, 'revolver', 1, {}, 'Six-shot magnum revolver.'],
    ['ps_centurion', 'CENTURION 9', 'pistol', { style: 'open', len: 0.16, c: ['blued', 'polymer', 'polymer'] }, { d: 27, r: 460, m: 15, t: 1.45 }, 'pistol9', 0.95, {}, 'Open-slide service pistol.'],
    ['ps_sentry_c', 'SENTRY C', 'pistol', { style: 'striker', len: 0.125, gripLen: 0.09, c: ['steel', 'tan'] }, { d: 24, r: 520, m: 12, t: 1.3 }, 'pistol9', 1.08, {}, 'Compact carry pistol. Very quick to draw.'],
    ['ps_warhawk', 'WARHAWK .50', 'pistol', { style: 'heavy', len: 0.2, gripLen: 0.115, c: ['bare', 'polymer', 'polymer'] }, { d: 66, r: 170, m: 7, t: 1.9 }, 'pistol50', 1, {}, 'Hand cannon. Two hits, usually.'],
    ['ps_sentry_a', 'SENTRY AUTO', 'pistol', { style: 'striker', auto: true, extMag: true, comp: true }, { d: 22, r: 1100, m: 33, t: 1.6, auto: 1 }, 'pistol9', 1.05, { laser: 'ls_red' }, 'Fully automatic machine pistol.'],
    ['bx_raider', 'RAIDER 9', 'boxsmg', { style: 'tec' }, { d: 23, r: 600, m: 32, t: 1.9, auto: 1 }, 'smg9', 1.08, {}, 'Big automatic pistol with a shrouded barrel.', 'smg'],
    ['ps_korda', 'KORDA USM', 'pistol', { style: 'striker', len: 0.165, gripLen: 0.11, c: ['blued', 'polymer'] }, { d: 34, r: 430, m: 12, t: 1.5 }, 'pistol45', 1.04, { muzzle: 'mz_sup' }, 'Suppressed special-forces .45.'],
    ['rv_bulldog', 'BULLDOG .44', 'revolver', { c: ['bare', 'rubber'], len: 0.14, cr: 0.023 }, { d: 64, r: 140, m: 5, t: 2.5 }, 'revolver', 0.94, {}, 'Snub-nose big-bore revolver.'],
    ['ps_stiletto', 'STILETTO 5.7', 'pistol', { style: 'striker', len: 0.17, gripLen: 0.11, c: ['steel', 'tan'] }, { d: 24, r: 560, m: 20, t: 1.4 }, 'pistol9', 1.15, { optic: 'op_micro' }, 'Flat-shooting 20-round pistol with a micro dot.'],
    ['ps_vargan', 'VARGAN P8', 'pistol', { style: 'm1911', len: 0.125, gripLen: 0.09, c: ['blued', 'polymer', 'bake'] }, { d: 25, r: 440, m: 8, t: 1.3 }, 'pistol9', 1.02, {}, 'Small, simple sidearm.'],
    ['ps_alpine', 'ALPINE P2', 'pistol', { style: 'm1911', len: 0.155, c: ['grey', 'polymer', 'polymer'] }, { d: 29, r: 470, m: 15, t: 1.4 }, 'pistol9', 0.92, { optic: 'op_micro', laser: 'ls_light' }, 'Alloy-frame duty pistol with a light.'],
    ['ps_guardian_ls', 'GUARDIAN LONGSLIDE', 'pistol', { style: 'm1911', len: 0.19, comp: true, c: ['bare', 'polymer', 'woodDark'] }, { d: 40, r: 380, m: 10, t: 1.5 }, 'pistol45', 0.95, {}, 'Competition long-slide .45.'],
    ['rv_magnate', 'MAGNATE .500', 'revolver', { c: ['bare', 'woodDark'], len: 0.26, cr: 0.025 }, { d: 82, r: 110, m: 5, t: 2.8 }, 'revolver', 0.86, {}, 'The biggest revolver made.']
  ],
  launcher: [
    ['ln_volkov', 'VOLKOV R7', 'tubeL', { style: 'rpg', c: ['steel', 'wood'] }, { d: 220, r: 40, m: 1, t: 3.4 }, 'rocket', 1, {}, 'Reloadable rocket launcher.', 'rocket'],
    ['ln_thumper', 'THUMPER 40', 'gl', { style: 'break', c: ['blued', 'wood'] }, { d: 200, r: 40, m: 1, t: 2.6, gren: 1 }, 'gl40', 1, {}, 'Single-shot 40 mm grenade launcher.', 'break'],
    ['ln_lance', 'LANCE AT', 'tubeL', { style: 'at' }, { d: 240, r: 40, m: 1, t: 3.8 }, 'rocket', 0.94, {}, 'Light anti-armour tube.', 'tube'],
    ['ln_hexa', 'HEXA MGL', 'gl', { style: 'mgl', stock: 'm4' }, { d: 180, r: 110, m: 6, t: 0.7, gren: 1, shells: 1 }, 'gl40', 1.04, {}, 'Six 40 mm grenades in a revolving drum.'],
    ['ln_orcus', 'ORCUS M3', 'tubeL', { style: 'recoilless', c: ['grey', 'polymer'] }, { d: 260, r: 40, m: 1, t: 3.6 }, 'rocket', 0.9, {}, 'Recoilless rifle with a huge blast.', 'tube'],
    ['ln_bombard', 'BOMBARD P4', 'tubesg', { r: 0.0215, len: 0.6, c: ['blued', 'wood'], noSlots: ['optic', 'muzzle', 'underbarrel', 'laser'] }, { d: 180, r: 70, m: 4, t: 0.7, gren: 1, shells: 1, pump: 1 }, 'gl40', 0.94, {}, 'Pump-action grenade launcher.'],
    ['ln_sparrow', 'SPARROW AA', 'tubeL', { style: 'aa' }, { d: 250, r: 40, m: 1, t: 4.0 }, 'rocket', 1.08, {}, 'Slim high-velocity missile tube.', 'tube'],
    ['ln_skyhammer', 'SKYHAMMER', 'tubeL', { style: 'guided' }, { d: 320, r: 40, m: 1, t: 4.2 }, 'rocket', 0.86, {}, 'Heavy missile. Biggest explosion.', 'tube']
  ],
  melee: [
    ['ml_knife', 'COMBAT KNIFE', 'melee', { kind: 'knife' }, { d: 90, r: 110 }, 'blade', 1, {}, 'Standard issue fighting knife.'],
    ['ml_karambit', 'TALON KARAMBIT', 'melee', { kind: 'karambit' }, { d: 80, r: 130 }, 'blade', 1.12, {}, 'Curved claw blade. Fastest strikes.'],
    ['ml_tomahawk', 'RAVEN TOMAHAWK', 'melee', { kind: 'tomahawk' }, { d: 110, r: 85 }, 'blunt', 1.05, {}, 'Tactical axe.'],
    ['ml_machete', 'JUNGLE MACHETE', 'melee', { kind: 'machete' }, { d: 105, r: 90 }, 'blade', 0.92, {}, 'Long reach, wide cuts.'],
    ['ml_kukri', 'KUKRI', 'melee', { kind: 'kukri' }, { d: 100, r: 100 }, 'blade', 0.96, {}, 'Heavy forward-curved blade.'],
    ['ml_baton', 'TACTICAL BATON', 'melee', { kind: 'baton', c: ['blued', 'rubber'] }, { d: 85, r: 115, blunt: 1 }, 'blunt', 1.1, {}, 'Telescopic steel baton.'],
    ['ml_shovel', 'ENTRENCHING TOOL', 'melee', { kind: 'shovel' }, { d: 115, r: 78, blunt: 1 }, 'blunt', 0.95, {}, 'Folding shovel. Surprisingly lethal.'],
    ['ml_trench', 'TRENCH KNIFE', 'melee', { kind: 'trench' }, { d: 95, r: 115 }, 'blade', 1.04, {}, 'Spike blade with a knuckle guard.'],
    ['ml_crowbar', 'CROWBAR', 'melee', { kind: 'crowbar' }, { d: 110, r: 82, blunt: 1 }, 'blunt', 1, {}, 'Steel pry bar.'],
    ['ml_bat', 'SLUGGER BAT', 'melee', { kind: 'bat' }, { d: 120, r: 72, blunt: 1 }, 'blunt', 0.88, {}, 'Ash wood bat.'],
    ['ml_cleaver', 'BUTCHER CLEAVER', 'melee', { kind: 'cleaver' }, { d: 105, r: 105 }, 'blade', 0.9, {}, 'Wide chopping blade.'],
    ['ml_iceaxe', 'ICE AXE', 'melee', { kind: 'iceaxe' }, { d: 125, r: 76 }, 'blade', 1.08, {}, 'Mountaineering pick.'],
    ['ml_sledge', 'SLEDGEHAMMER', 'melee', { kind: 'sledge' }, { d: 160, r: 52, blunt: 1 }, 'blunt', 0.8, {}, 'Slow. Final.'],
    ['ml_waraxe', 'WAR AXE', 'melee', { kind: 'waraxe' }, { d: 150, r: 58 }, 'blunt', 0.86, {}, 'Double-bit battle axe.'],
    ['ml_katana', 'KATANA', 'melee', { kind: 'katana' }, { d: 140, r: 88 }, 'blade', 1, {}, 'Long curved sword. Longest reach.']
  ]
};
// reload recording family per weapon family (an entry can name its own)
const GS_RELOAD_FAM = { ar: 'ar', ak: 'ak', bullpup: 'bullpup', modular: 'ar', hk: 'smg', boxsmg: 'smgbox', pdw: 'pdw', vec: 'smg', belt: 'lmgbelt', rotary: 'lmgbelt', pistol: 'pistol', revolver: 'revolver', dbl: 'break' };
const GS_CATALOGUE = [];
for (const cat in GS_CAT_SRC) GS_CAT_SRC[cat].forEach((r, i) => {
  const st = r[4] || {};
  let rl = r[9] || GS_RELOAD_FAM[r[2]] || null;
  if (r[2] === 'rifle') rl = (r[3] || {}).stock === 'amr' ? 'amr' : st.bolt ? 'sniper' : 'dmr';
  // heavy belt-fed machine guns, 7.62 battle rifles, magnum pistols and support rifles have their own reloads
  if (r[2] === 'belt' || r[2] === 'rotary') rl = cat === 'mg' ? 'mgbelt' : 'lmgbelt';
  if (r[2] === 'hk' && (cat === 'assault' || cat === 'rifle')) rl = 'br';
  if (r[2] === 'pistol' && (r[3] || {}).style === 'heavy') rl = 'magnum';
  if (cat === 'lmg' && (r[2] === 'bullpup' || r[0] === 'md_talon_iar')) rl = 'lsw';
  if (st.shells || r[2] === 'tubesg' || r[2] === 'bullsg' || (r[2] === 'autosg' && r[3].style === 'carousel')) rl = null;   // loaded shell by shell
  GS_CATALOGUE.push({ id: r[0], name: r[1], category: cat, order: i, fam: r[2], p: r[3] || {}, st, snd: r[5], pitch: r[6] || 1, kit: r[7] || {}, desc: r[8] || '', rl, unlockedByDefault: i < 7 });
});
// enemy drops and the old armoury names map onto catalogue weapons
const GS_LEGACY_MAP = {
  M4A1: 'ar_kestrel', AK47: 'ak_vargan', MP5: 'hk_viper', PumpShotgun: 'sg_breacher', AWM: 'rf_sentinel', DesertEagle: 'ps_warhawk', BarrettM82: 'rf_hammerfall', Woodpecker: 'rf_warden',
  M1911: 'ps_guardian', LMG: 'ak_vargan_rpl', MK18: 'ar_kestrel_k', HK416: 'md_talon', MP7: 'bx_wasp', P90: 'pd_hornet', G18: 'ps_sentry_a', ScarL: 'md_talon', AUG: 'bp_halcyon', FAMAS: 'bp_fenris',
  Uzi: 'bx_stryx', Vector: 'vc_razor', MAC10: 'bx_mako', TacticalShotgun: 'sg_riot', AutoShotgun: 'sg_hammer', DoubleBarrel: 'sg_coach', Dragunov: 'ak_dragoon', M24: 'rf_longbow', Glock: 'ps_sentry',
  Beretta: 'ps_centurion', Revolver: 'rv_marshal', Minigun: 'rt_cyclone'
};
