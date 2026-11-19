// ---------- Unit roster: elite hostile commandos, BRAVO squad uniforms, overhead markers ----------
// Every unit wears its own fabric (src/assets/uniforms, from the "Uniforms Textures" library). The fabric is
// projected tri-planar in the soldier's rest pose (it moves with the body, no UV seams) onto the cloth parts of
// the model (baked masks: soldier_mask_*.jpg); straps, boots, gloves and hardware take the unit's gear colour.
// The model's own albedo keeps the folds, seams and stitching on top of the new fabric.

// mean linear luminance of each fabric (measured offline) -> per-fabric gain so even the black kits show their pattern
const FABRIC_LUM = {
  assassinator: 0.0168, black_cobra: 0.0289, black_eagle_eyes: 0.0195, black_eagle_squad: 0.0248, black_eagle_vanguard: 0.0206,
  black_panther: 0.0223, cobra_strike: 0.0447, crimson_viper: 0.024, delta_elite: 0.0543, dust_jackal: 0.1545, glacier_wolf: 0.3137,
  ironclad: 0.0417, night_hawk: 0.0206, obsidian_ghost: 0.0185, sandstorm_ghost: 0.1785, shadow_phantom: 0.0215,
  special_commando: 0.0427, terminator: 0.0349, titan_reaper: 0.0314, viper_commander: 0.0252
};
const UNIFORM_KEYS = Object.keys(FABRIC_LUM);

// Hostile elite units. base = AI archetype (ENEMY_TYPES); multipliers stack on top of the difficulty.
// threat = intel ranking (100 = deadliest); tactics adds to the difficulty's tactical level (cover, dives, flanks).
const HOSTILE_UNITS = [
  { key: 'assassinator', name: 'ASSASSINATOR', cls: 'STEALTH MARKSMAN', base: 'rifleman', fabric: 'assassinator', gear: 0x181214, weapon: 'ScarL',
    hp: 1.55, dmg: 1.45, acc: 1.6, fire: 1.35, speed: 1.22, tactics: 2, threat: 99, desc: 'Silent hunter. Flanks wide, strikes from the dark and never misses twice.' },
  { key: 'terminator', name: 'TERMINATOR', cls: 'HEAVY ASSAULT', base: 'heavy', fabric: 'terminator', gear: 0x141414, weapon: 'LMG',
    hp: 2.1, dmg: 1.3, acc: 1.15, fire: 1.3, speed: 0.95, armor: 0.62, tactics: 0, threat: 96, desc: 'Armoured heavy gunner. Walks through fire and suppresses everything in sight.' },
  { key: 'viper_commander', name: 'VIPER COMMANDER', cls: 'SQUAD COMMANDER', base: 'officer', fabric: 'viper_commander', gear: 0x1c1416, weapon: 'ScarL',
    hp: 1.8, dmg: 1.3, acc: 1.35, fire: 1.3, speed: 1.05, tactics: 1, threat: 93, desc: 'Directs the hostile squads. Every soldier near him fights harder.' },
  { key: 'delta_elite', name: 'DELTA ELITE', cls: 'ASSAULT OPERATOR', base: 'rifleman', fabric: 'delta_elite', gear: 0x2a2d30, weapon: 'M4A1',
    hp: 1.45, dmg: 1.25, acc: 1.4, fire: 1.35, speed: 1.15, tactics: 1, threat: 89, desc: 'Urban assault specialist. Fast, precise bursts and relentless pushes.' },
  { key: 'seal_commando', name: 'SEAL COMMANDO', cls: 'NAVAL SPECIAL WARFARE', base: 'rifleman', fabric: 'night_hawk', gear: 0x161a20, weapon: 'AUG',
    hp: 1.4, dmg: 1.2, acc: 1.35, fire: 1.3, speed: 1.2, tactics: 2, threat: 87, desc: 'Amphibious raider. Flanks, dives into cover and strikes from unexpected angles.' },
  { key: 'black_eagle_eyes', name: 'BLACK EAGLE EYES', cls: 'LONG-RANGE SNIPER', base: 'sniper', fabric: 'black_eagle_eyes', gear: 0x15171a, weapon: 'M24',
    hp: 1.2, dmg: 1.45, acc: 1.7, fire: 1.2, speed: 1.0, tactics: 1, threat: 85, desc: 'Precision sniper. Finds high ground and punishes any exposed head.' },
  { key: 'crimson_viper', name: 'CRIMSON VIPER', cls: 'CLOSE QUARTERS BREACHER', base: 'rusher', fabric: 'crimson_viper', gear: 0x1a1214, weapon: 'PumpShotgun',
    hp: 1.4, dmg: 1.3, acc: 1.25, fire: 1.25, speed: 1.3, tactics: 2, threat: 81, desc: 'Shotgun breacher. Leaps through doorways and rushes on every reload.' },
  { key: 'obsidian_ghost', name: 'OBSIDIAN GHOST', cls: 'RECON INFILTRATOR', base: 'soldier', fabric: 'obsidian_ghost', gear: 0x141216, weapon: 'AK47',
    hp: 1.3, dmg: 1.2, acc: 1.3, fire: 1.25, speed: 1.15, tactics: 2, threat: 77, desc: 'Infiltrator. Moves between cover unseen and attacks from the flank.' },
  { key: 'titan_reaper', name: 'TITAN REAPER', cls: 'ARMOURED RIFLEMAN', base: 'rifleman', fabric: 'titan_reaper', gear: 0x1e2226, weapon: 'ScarL',
    hp: 1.65, dmg: 1.15, acc: 1.2, fire: 1.2, speed: 1.0, armor: 0.8, tactics: 1, threat: 74, desc: 'Plated rifleman. Soaks up fire and holds the line.' },
  { key: 'special_commando', name: 'SPECIAL COMMANDO', cls: 'WOODLAND COMMANDO', base: 'soldier', fabric: 'special_commando', gear: 0x3a3a2c, weapon: 'AK47',
    hp: 1.25, dmg: 1.15, acc: 1.2, fire: 1.2, speed: 1.1, tactics: 1, threat: 70, desc: 'Regular special forces. Disciplined, fast and well drilled.' }
];
HOSTILE_UNITS.sort((a, b) => b.threat - a.threat).forEach((u, i) => { u.rank = i + 1; });
const HOSTILE_BY_KEY = Object.fromEntries(HOSTILE_UNITS.map(u => [u.key, u]));

// BRAVO squad uniforms (Team Deathmatch allies and friendly units)
const ALLY_UNITS = [
  { key: 'black_eagle_squad', name: 'EAGLE', cls: 'BLACK EAGLE SQUAD', base: 'rifleman', fabric: 'black_eagle_squad', gear: 0x1a1c20 },
  { key: 'black_eagle_vanguard', name: 'VANGUARD', cls: 'BLACK EAGLE VANGUARD', base: 'rifleman', fabric: 'black_eagle_vanguard', gear: 0x18191c },
  { key: 'black_panther', name: 'PANTHER', cls: 'BLACK PANTHER ELITE', base: 'soldier', fabric: 'black_panther', gear: 0x15181c },
  { key: 'cobra_strike', name: 'COBRA', cls: 'COBRA STRIKE TEAM', base: 'rifleman', fabric: 'cobra_strike', gear: 0x3a3c2a },
  { key: 'dust_jackal', name: 'JACKAL', cls: 'DUST JACKAL RECON', base: 'soldier', fabric: 'dust_jackal', gear: 0x6a5a42 },
  { key: 'glacier_wolf', name: 'WOLF', cls: 'GLACIER WOLF', base: 'rifleman', fabric: 'glacier_wolf', gear: 0x8c9298 },
  { key: 'ironclad', name: 'IRONCLAD', cls: 'IRONCLAD HEAVY', base: 'heavy', fabric: 'ironclad', gear: 0x34362e },
  { key: 'sandstorm_ghost', name: 'SANDSTORM', cls: 'SANDSTORM GHOST', base: 'sniper', fabric: 'sandstorm_ghost', gear: 0x5e5038 },
  { key: 'shadow_phantom', name: 'PHANTOM', cls: 'SHADOW PHANTOM', base: 'soldier', fabric: 'shadow_phantom', gear: 0x15191e },
  { key: 'black_cobra', name: 'BLACK COBRA', cls: 'BLACK COBRA SF', base: 'heavy', fabric: 'black_cobra', gear: 0x22241e }
];
const ALLY_BY_KEY = Object.fromEntries(ALLY_UNITS.map(u => [u.key, u]));

// Which elite (if any) takes the place of a regular hostile of archetype `base`, by difficulty
function pickHostileUnit(base) {
  const D = diffSettings();
  if (!D.eliteChance || Math.random() > D.eliteChance) return null;
  const pool = HOSTILE_UNITS.filter(u => u.base === base && u.rank >= (D.eliteMinRank || 1));
  if (!pool.length) return null;
  // deadlier units are rarer (except on Legendary)
  const w = pool.map(u => D.tactics >= 3 ? 1 : 0.5 + u.rank / 10);
  let x = Math.random() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < pool.length; i++) { x -= w[i]; if (x <= 0) return pool[i]; }
  return pool[0];
}
// the TDM squad: four distinct uniforms per match, suited to the map's climate first
function pickAllyUnits(n) {
  const th = WORLD.enemyTheme || 'urban';
  const pref = th === 'arctic' ? ['glacier_wolf'] : th === 'desert' ? ['dust_jackal', 'sandstorm_ghost'] : th === 'woodland' || th === 'jungle' ? ['cobra_strike'] : [];
  const rest = ALLY_UNITS.filter(u => !pref.includes(u.key)).sort(() => Math.random() - 0.5);
  return [...pref.map(k => ALLY_BY_KEY[k]), ...rest].slice(0, n);
}

// ---------- uniform material ----------
const _unitMatCache = {};
const _bsV = new THREE.Vector3();
const MASK_FOR = { 'blinn4.001': 'soldier_mask_body', 'blinn1.001': 'soldier_mask_legs', 'blinn2.001': 'soldier_mask_helmet' };
const CLOTH_LUM = { 'blinn4.001': 0.0466, 'blinn1.001': 0.0268, 'blinn2.001': 0.0301 };
function unitMaterial(m, unit, mesh) {
  const key = m.uuid + '|' + unit.key;
  if (_unitMatCache[key]) return _unitMatCache[key];
  const fab = ASSETS.uniforms && ASSETS.uniforms[unit.fabric], mask = MASK_FOR[m.name] && ASSETS.tex[MASK_FOR[m.name]];
  if (!fab || !mask) return themedMaterial(m, 'urban');
  if (fab.wrapS !== THREE.RepeatWrapping) { fab.wrapS = fab.wrapT = THREE.RepeatWrapping; fab.anisotropy = 8; fab.needsUpdate = true; }
  const c = m.clone();
  c.color.setRGB(1, 1, 1); c.envMapIntensity = 0.45; c.roughness = 0.78;
  mesh.updateMatrixWorld(true);
  const bindScale = _bsV.setFromMatrixScale(mesh.matrixWorld).x;
  const lum = FABRIC_LUM[unit.fabric] || 0.04, t = Math.max(lum, 0.062);
  const gain = t * (1 - lum) / (lum * (1 - t));
  const U = {
    uFabric: { value: fab }, uMask: { value: mask }, uGear: { value: new THREE.Color(unit.gear || 0x222222).convertSRGBToLinear() },
    uGain: { value: gain }, uClothLum: { value: CLOTH_LUM[m.name] || 0.035 }, uTile: { value: 0.62 }, uBindScale: { value: bindScale }
  };
  c.userData.unitU = U;
  c.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = 'varying vec3 vBindPos;\nvarying vec3 vBindN;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n\tvBindPos = position; vBindN = normal;');
    sh.fragmentShader = 'uniform sampler2D uFabric, uMask;\nuniform vec3 uGear;\nuniform float uGain, uClothLum, uTile, uBindScale;\nvarying vec3 vBindPos;\nvarying vec3 vBindN;\n' +
      sh.fragmentShader.replace('#include <map_fragment>', `
#ifdef USE_MAP
	vec4 texelColor = mapTexelToLinear( texture2D( map, vUv ) );
	vec3 lifted = texelColor.rgb * 6.0 / ( 1.0 + texelColor.rgb * 5.0 );
	float lumO = dot( texelColor.rgb, vec3( 0.2126, 0.7152, 0.0722 ) );
	vec3 bn = pow( abs( normalize( vBindN ) ), vec3( 4.0 ) ); bn /= ( bn.x + bn.y + bn.z );
	vec3 tp = vBindPos * ( uBindScale / uTile );
	vec3 fab = texture2D( uFabric, tp.zy ).rgb * bn.x + texture2D( uFabric, tp.xz ).rgb * bn.y + texture2D( uFabric, tp.xy ).rgb * bn.z;
	fab = pow( fab, vec3( 2.2 ) );
	fab = fab * uGain / ( 1.0 + fab * ( uGain - 1.0 ) );
	vec3 cloth = fab * mix( 1.0, clamp( lumO / uClothLum, 0.4, 1.9 ), 0.75 );
	float lumL = dot( lifted, vec3( 0.2126, 0.7152, 0.0722 ) );
	vec3 gear = mix( lifted, uGear * clamp( lumL / 0.12, 0.3, 2.4 ), 0.72 );
	diffuseColor.rgb *= mix( gear, cloth, texture2D( uMask, vUv ).r );
#endif`);
  };
  c.customProgramCacheKey = () => 'soldierUnit';
  return (_unitMatCache[key] = c);
}

// ---------- overhead marker: arrow + name ----------
const _markerCache = {};
function markerTexture(team, label) {
  const key = team + '|' + label;
  if (_markerCache[key]) return _markerCache[key];
  const W = 384, H = 128, col = team === 'blue' ? '#3aa8ff' : '#ff2a20', hi = team === 'blue' ? '#a8dcff' : '#ff9a8a';
  const tex = canvasTex('marker_' + key, W, H, (x) => {
    const ax = W / 2;
    const arrow = () => { x.beginPath(); x.moveTo(ax - 9, 4); x.lineTo(ax + 9, 4); x.lineTo(ax + 9, 24); x.lineTo(ax + 21, 24); x.lineTo(ax, 52); x.lineTo(ax - 21, 24); x.lineTo(ax - 9, 24); x.closePath(); };
    x.lineJoin = 'round';
    arrow(); x.strokeStyle = 'rgba(0,0,0,0.9)'; x.lineWidth = 7; x.stroke();
    const g = x.createLinearGradient(0, 4, 0, 52); g.addColorStop(0, hi); g.addColorStop(0.5, col); g.addColorStop(1, col);
    arrow(); x.fillStyle = g; x.fill();
    if (label) {
      let fs = 40; const font = () => `700 ${fs}px Consolas, "Segoe UI", sans-serif`; x.font = font();
      while (x.measureText(label).width > W - 12 && fs > 22) { fs -= 2; x.font = font(); }
      x.textAlign = 'center'; x.textBaseline = 'middle';
      x.lineWidth = 8; x.strokeStyle = 'rgba(0,0,0,0.88)'; x.strokeText(label, ax, 92);
      x.fillStyle = team === 'blue' ? '#d6ecff' : '#ffd8d2'; x.fillText(label, ax, 92);
    }
  });
  return (_markerCache[key] = tex);
}
function makeMarker(team, label) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: markerTexture(team, label), depthTest: team !== 'blue', depthWrite: false, transparent: true, sizeAttenuation: false, toneMapped: false, fog: false }));
  s.center.set(0.5, 0.0); s.renderOrder = 20; s.userData.aspect = 384 / 128;
  return s;
}

// ---------- intel: ranked hostile roster (menu window) ----------
function buildIntelPanel(el) {
  if (!el) return;
  el.innerHTML = HOSTILE_UNITS.map(u => {
    const T = ENEMY_TYPES[u.base] || {};
    const w = WEAPON_DEFS[u.weapon] ? WEAPON_DEFS[u.weapon].label : '';
    return `<div class="intelRow${u.rank === 1 ? ' top' : ''}">
      <div class="rk">#${u.rank}</div>
      <div class="sw" style="background-image:url('${assetURL('assets/uniforms/' + u.fabric + '.jpg')}')"></div>
      <div class="nm"><b>${u.name}</b>${u.rank === 1 ? '<i>DEADLIEST</i>' : ''}<span>${u.cls} · ${w}</span><em>${u.desc}</em></div>
      <div class="th"><span>THREAT</span><div class="bar"><i style="width:${u.threat}%"></i></div><small>HP ×${u.hp.toFixed(2)} · DMG ×${u.dmg.toFixed(2)} · ACC ×${u.acc.toFixed(2)}</small></div>
    </div>`;
  }).join('');
}

// helmet shell for heavies / commanders, painted in the unit's gear colour (matte, no sky-mirror sheen)
const _helmetMats = {};
function helmetMaterial(unit) {
  const k = unit ? unit.key : '_';
  if (_helmetMats[k]) return _helmetMats[k];
  const c = new THREE.Color(unit ? unit.gear : 0x3a4030).multiplyScalar(unit ? 1.4 : 1);
  return (_helmetMats[k] = new THREE.MeshStandardMaterial({ color: c, roughness: 0.68, metalness: 0.12, envMapIntensity: 0.4 }));
}
