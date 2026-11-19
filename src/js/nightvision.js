// ---------- Night vision goggles ----------
// N toggles the goggles, M switches the phosphor between green and blue (Modern Warfare style white-blue).
// The image intensifier itself is part of the grading shader (renderer.js): monochrome gain with phosphor
// saturation, grain, scan lines and tube falloff. An infrared illuminator on the helmet lights what the player
// looks at while the goggles are down. In dark places the HUD recommends switching them on.
// estimated light level below which a spot counts as dark: interiors flag their dimmest corners, outdoors only at night
function nvgDarkThreshold() { return WORLD.indoor ? 0.6 : (WORLD.env.night ? 0.3 : -1); }

// rough light level at a position: ambient + moon/sun (when under open sky) + nearby lamps, times exposure
function lightLevelAt(p) {
  const lum = (c) => c.r * 0.3 + c.g * 0.59 + c.b * 0.11;
  let L = hemi.intensity * (lum(hemi.color) * 0.6 + lum(hemi.groundColor) * 0.4) * 0.45;
  if (moon.visible && moon.intensity > 0 && ceilingAbove(p.x, p.z, p.y + 1.9, 0.2) === Infinity)
    L += moon.intensity * lum(moon.color) * Math.max(0, sunDir.y) * 0.5;
  const c = _nvC;
  for (const l of WORLD.lamps) {
    const dx = l.x - p.x, dy = l.y - p.y - 1.6, dz = l.z - p.z, d = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (d >= l.dist) continue;
    const f = 1 - d / l.dist;
    L += l.i * l.mult * lum(c.setHex(l.color)) * f * f * 0.9;
  }
  return L * POST.grade.uniforms.exposure.value;
}
const _nvC = new THREE.Color();

const NVG = {
  on: false, k: 0, flick: 0, ir: null, irT: null, level: 1, gain: 6, darkT: 0, checkT: 0, hintOn: false, cssOn: '', ready: false,
  init() {
    // The IR illuminator always exists (a light appearing mid-game would recompile every material); it only
    // emits while the goggles are down.
    this.ir = new THREE.SpotLight(0xffffff, 0, 46, 0.6, 0.6, 1.2);
    this.irT = new THREE.Object3D(); this.irT.position.set(0, -0.8, -10);
    this.ir.position.set(0.06, 0.08, 0);
    camera.add(this.ir); camera.add(this.irT); this.ir.target = this.irT;
    this.ready = true;
    this.applyQuality(); this.hud();
  },
  applyQuality() { if (this.ir) this.ir.visible = S.quality !== 'low'; },
  toggle() {
    if (!G.playing || G.dead) return;
    this.on = !this.on;
    if (this.on) { AudioSys.noise(0.05, 0.22, 3200); AudioSys.tone(1900, 0.45, 0.045, 'sine', 6400, { delay: 0.04 }); this.flick = 0.22; }
    else { AudioSys.noise(0.05, 0.22, 2400); AudioSys.tone(950, 0.07, 0.06, 'square', 480); }
    this.hud(); this.showHint(false);
  },
  cycleMode() {
    S.nvgMode = S.nvgMode === 'blue' ? 'green' : 'blue';
    SAVE.set('settings', S); AudioSys.tone(1500, 0.04, 0.08, 'square');
    if (this.on) this.flick = 0.12;
    this.hud(); if (typeof updateToggleButtons === 'function') updateToggleButtons();
  },
  reset() { this.on = false; this.k = 0; this.flick = 0; this.darkT = 0; this.checkT = 0; this.showHint(false); this.hud(); },
  update(dt) {
    if (!this.ready) return;
    const U = POST.grade.uniforms, want = this.on && G.playing ? 1 : 0;
    this.k = want ? Math.min(1, this.k + dt * 7) : Math.max(0, this.k - dt * 9);
    let k = this.k;
    if (this.flick > 0) { this.flick -= dt; k *= 0.5 + 0.5 * Math.random(); } // intensifier tube warming up
    U.nvg.value = k; U.nvgMode.value = S.nvgMode === 'blue' ? 1 : 0;
    // automatic gain like a real intensifier tube: strong in the dark, backed off in lit rooms so they don't wash out
    this.gain = damp(this.gain, clamp(2.4 / Math.max(this.level, 0.04), 1.6, WORLD.env.night ? 12 : 9), 2.5, dt);
    U.nvgGain.value = WORLD.env.nvgGain || this.gain;
    if (this.ir) this.ir.intensity = k * (WORLD.indoor ? 1.4 : 2.0);
    // Low preset has no post-processing: approximate the goggles with a CSS filter on the canvas
    const css = !POST.enabled && k > 0.5 ? (S.nvgMode === 'blue' ? 'grayscale(1) brightness(2.3) contrast(1.2) sepia(1) hue-rotate(165deg) saturate(2.2)' : 'grayscale(1) brightness(2.3) contrast(1.2) sepia(1) hue-rotate(68deg) saturate(3)') : '';
    if (css !== this.cssOn) { this.cssOn = css; renderer.domElement.style.filter = css; }
    // recommend the goggles after a moment in a dark spot
    if (!G.playing || G.dead || G.cine || G.paused) { this.showHint(false); return; }
    this.checkT -= dt;
    if (this.checkT <= 0) { this.checkT = 0.35; this.level = WORLD.indoor || WORLD.env.night ? lightLevelAt(player.pos) : 2; }
    this.darkT = this.level < nvgDarkThreshold() ? this.darkT + dt : Math.max(0, this.darkT - dt * 2);
    this.showHint(!this.on && this.darkT > 1.0);
  },
  showHint(v) {
    if (v === this.hintOn) return;
    this.hintOn = v;
    document.getElementById('nvgHint').classList.toggle('show', v);
    if (v) AudioSys.tone(660, 0.06, 0.05, 'sine');
  },
  hud() {
    const el = document.getElementById('nvgStatus'); if (!el) return;
    el.classList.toggle('on', this.on); el.classList.toggle('blue', S.nvgMode === 'blue');
    document.getElementById('nvgState').textContent = this.on ? 'NIGHT VISION · ' + (S.nvgMode === 'blue' ? 'BLUE' : 'GREEN') : 'NIGHT VISION OFF';
  }
};
NVG.init();
