'use strict';
/* ============================================================
   ALPHA STRIKE ZERO
   Campaign, Team Deathmatch, Survival and Endless modes across indoor and
   outdoor locations; IK-driven AI soldiers, bullet cam and kill cam.
   ============================================================ */

const DIFFICULTY_LEVELS = ['Amateur', 'Pro', 'Top Class', 'Legendary'];
// fireRate: shorter gaps between shots and bursts · tactics 0-3: cover use, crouch-firing, dive rolls and jumps under
// fire, flanking, rushing a reloading player · movePen: how much the player's movement / crouch throws off their aim
// maxHit: per-shot hit cap · eliteChance / eliteMinRank: share of elite commandos and the deadliest rank allowed
const DIFFICULTY_SETTINGS = {
  Amateur:     { waveMult: 0.85, enemyHp: 0.9,  enemyDmg: 0.75, enemySpeed: 0.95, accuracy: 0.75, reaction: 1.25, pickupChance: 0.65, ammoReserveScale: 1.5,  spawnRate: 0.92,
                 fireRate: 0.85, tactics: 0, movePen: 1.3, maxHit: 0.42, eliteChance: 0, eliteMinRank: 11, aliveMul: 0.9 },
  Pro:         { waveMult: 0.9,  enemyHp: 0.98, enemyDmg: 0.88, enemySpeed: 1.0,  accuracy: 0.92, reaction: 1.0,  pickupChance: 0.5,  ammoReserveScale: 1.15, spawnRate: 0.92,
                 fireRate: 1.0,  tactics: 1, movePen: 1.0, maxHit: 0.5,  eliteChance: 0.3, eliteMinRank: 7, aliveMul: 1.0 },
  'Top Class': { waveMult: 1.15, enemyHp: 1.15, enemyDmg: 1.12, enemySpeed: 1.1,  accuracy: 1.3,  reaction: 0.62, pickupChance: 0.35, ammoReserveScale: 0.9,  spawnRate: 1.2,
                 fireRate: 1.3,  tactics: 2, movePen: 0.72, maxHit: 0.58, eliteChance: 0.55, eliteMinRank: 3, aliveMul: 1.25 },
  Legendary:   { waveMult: 1.5,  enemyHp: 1.4,  enemyDmg: 1.35, enemySpeed: 1.2,  accuracy: 1.62, reaction: 0.4,  pickupChance: 0.22, ammoReserveScale: 0.7,  spawnRate: 1.6,
                 fireRate: 1.6,  tactics: 3, movePen: 0.5, maxHit: 0.66, eliteChance: 0.85, eliteMinRank: 1, aliveMul: 1.5 }
};

const S = {
  sens: 1.0, adsSens: 0.75, fov: 75, vol: 0.7, sfxVol: 1.0, musicVol: 0.4, map: 6, difficulty: 'Top Class', mode: 'campaign', mission: 0, rev: 6,
  showMinimap: true, showBlood: true, showFPS: true, hitIndicator: true, autoReload: true,
  showDamageNumbers: true, killCam: true, quality: 'high', qAuto: true,
  motionBlur: true, slowmoKills: true, nvgMode: 'green', ssao: true,
  touchMode: 'auto', touchSens: 1.0, touchAim: 'toggle'
};

const G = {
  playing: false, paused: false, dead: false, respawning: false, respawnT: 0,
  wave: 0, kills: 0, shots: 0, hits: 0, headshots: 0, time: 0, hintT: 0,
  bulletTime: 0, slowmoScale: 1, worldScale: 1,
  camShake: 0, cine: false, breath: 100, holdingBreath: false
};

// World data shared between modules
const colliders = [];      // {x0,x1,y0,y1,z0,z1, move, shot, nav, surface}
const mapRects = [];       // minimap footprint rectangles
const mapObjects = [];     // everything added to the scene by the map builder
const mapAnimators = [];   // per-frame callbacks (flicker, searchlights, water...)
const swayers = [];
const enemies = [];
const pickups = [];
const particles = [];
const grenades = [];
const coverPoints = [];
const decals = [];

// ---------- small helpers ----------
function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
function lerp(a, b, t) { return a + (b - a) * clamp(t, 0, 1); }
function damp(cur, target, rate, dt) { return cur + (target - cur) * (1 - Math.exp(-rate * dt)); }
function rand(a, b) { return a + Math.random() * (b - a); }
function randInt(a, b) { return Math.floor(rand(a, b + 1)); }
function choose(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function angleDiff(a, b) { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; }
function smoothstep(a, b, x) { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function diffSettings() { return DIFFICULTY_SETTINGS[S.difficulty] || DIFFICULTY_SETTINGS['Top Class']; }

// boot timing: one console line per launch showing where loading time went
const BOOT = {
  t0: performance.now(), last: performance.now(), parts: [],
  mark(name) { const t = performance.now(); this.parts.push(name + ' ' + Math.round(t - this.last) + 'ms'); this.last = t; },
  report() { console.info('[boot] ' + Math.round(performance.now() - this.t0) + 'ms total (since script start; page parse ' + Math.round(this.t0) + 'ms) · ' + this.parts.join(' · ')); }
};
