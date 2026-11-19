// ---------- Audio engine ----------
// All sound is mixed by our own processor (AudioWorklet, or ScriptProcessor fallback).
// No AudioBuffer, decodeAudioData, buffer sources or media elements are ever created, so
// download managers (IDM etc.) have nothing to grab, and nothing is fetched at runtime:
// effects are 8-bit mu-law and music/ambience IMA-ADPCM, decoded here in plain JS.
let AC = null, masterGain = null;
const sfxGain = { gain: { set value(v) { AudioSys.post({ t: 'vol', sfx: v }); }, get value() { return S.sfxVol; } } };
const musicGain = { gain: { set value(v) { AudioSys.post({ t: 'vol', music: v }); }, get value() { return S.musicVol; } } };

// ---------- mixer core (runs inside the audio thread; also usable on the main thread) ----------
const MIXER_SRC = String.raw`
class MixerCore {
  constructor(sr) {
    this.sr = sr; this.samples = new Map(); this.voices = []; this.sfxVol = 1; this.musicVol = 0.4; this.reports = []; this.frame = 0;
    this.seed = 22222; this.revL = new Float32Array(128); this.revR = new Float32Array(128);
    const k = sr / 44100, combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617], aps = [556, 441, 341, 225];
    this.cL = combs.map(n => ({ b: new Float32Array(Math.round(n * k)), i: 0, f: 0 }));
    this.cR = combs.map(n => ({ b: new Float32Array(Math.round((n + 23) * k)), i: 0, f: 0 }));
    this.aL = aps.map(n => ({ b: new Float32Array(Math.round(n * k)), i: 0 }));
    this.aR = aps.map(n => ({ b: new Float32Array(Math.round((n + 23) * k)), i: 0 }));
    this.setReverb(0.6, 0.5, 1);
  }
  setReverb(room, damp, wet) { this.fb = room * 0.28 + 0.7; this.d1 = damp * 0.4; this.d2 = 1 - this.d1; this.wet = wet; }
  rnd() { let x = this.seed; x ^= x << 13; x ^= x >>> 17; x ^= x << 5; this.seed = x; return (x >>> 0) / 4294967296 * 2 - 1; }
  find(id) { for (const v of this.voices) if (v.id === id) return v; return null; }
  biquad(type, f, q) {
    const w = 2 * Math.PI * Math.min(f, this.sr * 0.45) / this.sr, a = Math.sin(w) / (2 * q), c = Math.cos(w), a0 = 1 + a;
    if (type === 'highpass') return [(1 + c) / 2 / a0, -(1 + c) / a0, (1 + c) / 2 / a0, -2 * c / a0, (1 - a) / a0];
    if (type === 'bandpass') return [a / a0, 0, -a / a0, -2 * c / a0, (1 - a) / a0];
    return [(1 - c) / 2 / a0, (1 - c) / a0, (1 - c) / 2 / a0, -2 * c / a0, (1 - a) / a0];
  }
  msg(m) {
    switch (m.t) {
      case 'sample': this.samples.set(m.id, { d: m.data, rate: m.rate }); break;
      case 'play': {
        const s = this.samples.get(m.id); if (!s) return;
        if (this.voices.length > 110) { const i = this.voices.findIndex(v => v.bus === 0); if (i >= 0) this.voices.splice(i, 1); }
        this.voices.push({ k: 0, id: m.vid, s, pos: m.offset ? m.offset * s.rate : 0, step: s.rate / this.sr, rate: m.rate || 1, rateT: m.rate || 1, at: m.at, dbg: m.dbg, skipLate: !!m.skipLate,
          g: m.fade ? 0 : 1, gT: 1, gS: m.fade ? 1 / (m.fade * this.sr) : 0, vol: m.vol, gl: m.gl, gr: m.gr, send: m.send || 0,
          delay: Math.round((m.delay || 0) * this.sr), loop: !!m.loop, bus: m.bus || 0, lpA: m.lp ? 1 - Math.exp(-2 * Math.PI * m.lp / this.sr) : 0, l1: 0, l2: 0, hp: m.hp ? 1 - Math.exp(-2 * Math.PI * m.hp / this.sr) : 0, h1: 0,
          wide: m.wide ? Math.round(0.011 * s.rate) : 0 });
        break;
      }
      case 'noise': {
        const c = this.biquad(m.ftype || 'lowpass', m.cutoff, m.q || 0.8);
        this.voices.push({ k: 1, id: m.vid, n: Math.max(1, Math.round(m.dur * this.sr / (m.rate || 1))), t: 0, vol: m.vol, shape: m.shape || 2, c, x1: 0, x2: 0, y1: 0, y2: 0,
          gl: m.gl, gr: m.gr, send: m.send || 0, delay: Math.round((m.delay || 0) * this.sr), bus: 0, g: 1, gT: 1, gS: 0 });
        break;
      }
      case 'tone': {
        const n = Math.max(1, Math.round(m.dur * this.sr));
        this.voices.push({ k: 2, id: m.vid, n, t: 0, vol: m.vol, f0: m.freq, f1: m.slide || m.freq, wave: m.wave || 'sine', ph: 0,
          gl: m.gl, gr: m.gr, send: m.send || 0, delay: Math.round((m.delay || 0) * this.sr), bus: 0, g: 1, gT: 1, gS: 0, decay: Math.log(0.0001) / n });
        break;
      }
      case 'gain': { const v = this.find(m.vid); if (v) { v.gT = m.value; v.gS = 1 / Math.max(1, (m.time || 0.05) * this.sr); } break; }
      case 'stop': { const v = this.find(m.vid); if (v) { v.gT = 0; v.gS = 1 / Math.max(1, (m.time || 0.05) * this.sr); v.dying = true; } break; }
      case 'rate': { for (const v of this.voices) if (v.k === 0 && (m.bus === undefined ? v.id === m.vid : v.bus === m.bus)) v.rateT = m.value; break; }
      case 'vol': if (m.sfx !== undefined) this.sfxVol = m.sfx; if (m.music !== undefined) this.musicVol = m.music; break;
      case 'reverb': this.setReverb(m.room, m.damp, m.wet); break;
      case 'stopAll': this.voices.length = 0; break;
    }
  }
  // f0: the context frame of this block's first sample (voices with an absolute start time "at", in seconds of
  // context time, begin on their exact sample: shots of an automatic weapon keep a perfectly even cadence)
  render(L, R, n, f0) {
    L.fill(0); R.fill(0);
    if (f0 === undefined) f0 = this.frame || 0;
    this.frame = f0 + n;
    if (this.revL.length < n) { this.revL = new Float32Array(n); this.revR = new Float32Array(n); }
    const rL = this.revL, rR = this.revR; rL.fill(0, 0, n); rR.fill(0, 0, n);
    const vs = this.voices;
    for (let vi = vs.length - 1; vi >= 0; vi--) {
      const v = vs[vi];
      if (v.at !== undefined) { const st = Math.round(v.at * this.sr) - f0; v.late = st < 0 ? -st : 0; v.delay = Math.max(0, st); v.at = undefined; if (v.late && v.skipLate) v.pos += v.late * v.step * v.rate; }
      if (v.dbg && !v.dying && v.delay < n) { this.reports.push({ vid: v.id, frame: f0 + Math.max(0, v.delay), late: v.late || 0 }); v.dbg = false; }
      const busVol = v.bus === 1 ? this.musicVol : this.sfxVol;
      const gl = v.gl * v.vol * busVol, gr = v.gr * v.vol * busVol, send = v.send;
      let done = false;
      for (let i = 0; i < n; i++) {
        if (v.delay > 0) { v.delay--; continue; }
        let x;
        if (v.k === 0) {
          const d = v.s.d, len = d.length;
          if (v.rate !== v.rateT) v.rate += (v.rateT - v.rate) * 0.0008;
          let p = v.pos;
          if (p >= len - 1) { if (v.loop) { p -= len - 1; v.pos = p; } else { done = true; break; } }
          const ip = p | 0, fr = p - ip;
          x = (d[ip] + (d[ip + 1] - d[ip]) * fr) * 0.000030518;
          let xr = x;
          if (v.wide) { const q = ip - v.wide; xr = q >= 0 ? d[q] * 0.000030518 : (v.loop ? d[len + q] * 0.000030518 : 0); xr = x * 0.35 + xr * 0.65; }
          v.pos = p + v.step * v.rate;
          if (v.lpA) {
            v.l1 += v.lpA * (x - v.l1); v.l2 += v.lpA * (v.l1 - v.l2); x = v.l2;
            if (v.wide) { v.r1 = (v.r1 || 0) + v.lpA * (xr - (v.r1 || 0)); v.r2 = (v.r2 || 0) + v.lpA * (v.r1 - (v.r2 || 0)); xr = v.r2; } else xr = x;
          }
          if (v.hp) { v.h1 += v.hp * (x - v.h1); x = x - v.h1; if (!v.wide) xr = x; }
          if (v.g !== v.gT) { v.g = v.g < v.gT ? Math.min(v.gT, v.g + v.gS) : Math.max(v.gT, v.g - v.gS); if (v.dying && v.g <= 0) { done = true; break; } }
          const a = x * v.g, b = xr * v.g;
          L[i] += a * gl; R[i] += b * gr;
          if (send) { rL[i] += a * send * gl; rR[i] += b * send * gr; }
          continue;
        }
        if (v.t >= v.n) { done = true; break; }
        if (v.k === 1) {
          const env = Math.pow(1 - v.t / v.n, v.shape), c = v.c, r = this.rnd() * env;
          x = c[0] * r + c[1] * v.x1 + c[2] * v.x2 - c[3] * v.y1 - c[4] * v.y2;
          v.x2 = v.x1; v.x1 = r; v.y2 = v.y1; v.y1 = x;
        } else {
          const u = v.t / v.n, f = v.f0 * Math.pow(v.f1 / v.f0, u);
          v.ph += f / this.sr; v.ph -= Math.floor(v.ph);
          const ph = v.ph;
          x = v.wave === 'square' ? (ph < 0.5 ? 0.7 : -0.7) : v.wave === 'sawtooth' ? (2 * ph - 1) * 0.7 : v.wave === 'triangle' ? (ph < 0.5 ? 4 * ph - 1 : 3 - 4 * ph) : Math.sin(ph * 6.283185307);
          x *= Math.exp(v.decay * v.t);
        }
        v.t++;
        L[i] += x * gl; R[i] += x * gr;
        if (send) { rL[i] += x * send * gl; rR[i] += x * send * gr; }
      }
      if (done) vs.splice(vi, 1);
    }
    // stereo freeverb on the send bus
    const fb = this.fb, d1 = this.d1, d2 = this.d2, wet = this.wet * 3;
    for (let i = 0; i < n; i++) {
      const inp = (rL[i] + rR[i]) * 0.015;
      let oL = 0, oR = 0;
      for (const c of this.cL) { const o = c.b[c.i]; c.f = o * d2 + c.f * d1; c.b[c.i] = inp + c.f * fb; if (++c.i >= c.b.length) c.i = 0; oL += o; }
      for (const c of this.cR) { const o = c.b[c.i]; c.f = o * d2 + c.f * d1; c.b[c.i] = inp + c.f * fb; if (++c.i >= c.b.length) c.i = 0; oR += o; }
      for (const a of this.aL) { const o = a.b[a.i]; a.b[a.i] = oL + o * 0.5; if (++a.i >= a.b.length) a.i = 0; oL = o - oL; }
      for (const a of this.aR) { const o = a.b[a.i]; a.b[a.i] = oR + o * 0.5; if (++a.i >= a.b.length) a.i = 0; oR = o - oR; }
      // soft limiter keeps big firefights clean
      let l = L[i] + oL * wet, r = R[i] + oR * wet;
      L[i] = l > 1 || l < -1 ? Math.tanh(l) : l; R[i] = r > 1 || r < -1 ? Math.tanh(r) : r;
    }
  }
}
if (typeof registerProcessor === 'function') {
  registerProcessor('asz-mixer', class extends AudioWorkletProcessor {
    constructor() { super(); this.core = new MixerCore(sampleRate); this.port.onmessage = (e) => { const m = e.data; if (Array.isArray(m)) for (const x of m) this.core.msg(x); else this.core.msg(m); }; }
    process(inputs, outputs) {
      const o = outputs[0], c = this.core; c.render(o[0], o[1] || o[0], o[0].length, currentFrame);
      if (c.reports.length) { this.port.postMessage({ t: 'started', list: c.reports }); c.reports = []; }
      return true;
    }
  });
}
`;

// ---------- codecs ----------
const MULAW = (() => { const t = new Int16Array(256); for (let u = 0; u < 256; u++) { const v = ~u & 0xFF, e = (v >> 4) & 7, m = v & 15; let d = ((m << 3) + 0x84) << e; d -= 0x84; t[u] = (v & 0x80) ? -d : d; } return t; })();
const ADPCM_IDX = [-1, -1, -1, -1, 2, 4, 6, 8, -1, -1, -1, -1, 2, 4, 6, 8];
const ADPCM_STEP = [7, 8, 9, 10, 11, 12, 13, 14, 16, 17, 19, 21, 23, 25, 28, 31, 34, 37, 41, 45, 50, 55, 60, 66, 73, 80, 88, 97, 107, 118, 130, 143, 157, 173, 190, 209, 230, 253, 279, 307, 337, 371, 408, 449, 494, 544, 598, 658, 724, 796, 876, 963, 1060, 1166, 1282, 1411, 1552, 1707, 1878, 2066, 2272, 2499, 2749, 3024, 3327, 3660, 4026, 4428, 4871, 5358, 5894, 6484, 7132, 7845, 8630, 9493, 10442, 11487, 12635, 13899, 15289, 16818, 18500, 20350, 22385, 24623, 27086, 29794, 32767];
function b64Bytes(s) { const bin = atob(s), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i); return u8; }
function decodeSound(snd) {
  const src = b64Bytes(snd.d), out = new Int16Array(snd.n + 1);
  if (snd.c === 'pcm16') { const dv = new DataView(src.buffer, src.byteOffset, src.byteLength); for (let i = 0; i < snd.n; i++) out[i] = dv.getInt16(i * 2, true); return out; }
  if (snd.c === 'mulaw') { for (let i = 0; i < snd.n; i++) out[i] = MULAW[src[i]]; return out; }
  const B = snd.b, bytesPer = 3 + B / 2;
  for (let blk = 0, o = 0; o < snd.n; blk++) {
    const h = blk * bytesPer;
    let pred = (src[h] | (src[h + 1] << 8)) << 16 >> 16, index = src[h + 2];
    for (let k = 0; k < B && o < snd.n; k++) {
      const byte = src[h + 3 + (k >> 1)], nib = (k & 1) ? byte >> 4 : byte & 15;
      let step = ADPCM_STEP[index], delta = step >> 3;
      if (nib & 4) delta += step; step >>= 1; if (nib & 2) delta += step; step >>= 1; if (nib & 1) delta += step;
      pred += (nib & 8) ? -delta : delta;
      pred = pred < -32768 ? -32768 : pred > 32767 ? 32767 : pred;
      index += ADPCM_IDX[nib]; index = index < 0 ? 0 : index > 88 ? 88 : index;
      out[o++] = pred;
    }
  }
  return out;
}

// Mix levels (all samples are peak-normalised in the pack)
const SOUND_LEVEL = {
  shot_viper: 0.9, shot_talon: 0.95, shot_titan: 1.0, shot_phantom: 0.85, enemy_single: 0.75, enemy_burst: 0.75, enemy_sniper: 0.9,
  explosion: 1.0, hit_body: 0.55, hit_head: 0.65, hit_concrete: 0.4, hit_metal: 0.4, hit_wood: 0.4, hit_sand: 0.35, hitmarker: 0.4, kill: 0.5,
  mag_reload: 0.55, bolt: 0.55, round_in: 0.5, shell: 0.22, dry_fire: 0.45, scope_in: 0.4, zoom: 0.3, whiz: 0.7, hurt: 0.55,
  heartbeat: 0.5, breath_in: 0.4, breath_out: 0.4, body_fall: 0.55, glint: 0.45, ui_hover: 0.12, ui_click: 0.3, ui_confirm: 0.4, ui_back: 0.3,
  wave: 0.55, radio: 0.4, reward: 0.45, rank_up: 0.5, mission_complete: 0.55, mission_fail: 0.55, bullet_time: 0.65, turret: 0.5,
  amb_city: 0.3, amb_desert: 0.3, amb_snow: 0.3, menu: 0.95, combat: 0.85
};

const AudioSys = {
  mode: 'none', node: null, port: null, core: null, ready: false, queue: [], pending: [], infos: {}, decoded: {}, sent: new Set(),
  packs: [], nextId: 1, indoor: false, slow: 0, slowFilter: null, musicId: 0, musicName: '', ambId: 0, ambName: '',
  lp: new THREE.Vector3(), lr: new THREE.Vector3(1, 0, 0), lf: new THREE.Vector3(0, 0, -1),

  init() {
    if (AC) return;
    try { AC = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive' }); } catch (e) { return; }
    masterGain = AC.createGain(); masterGain.gain.value = S.vol; masterGain.connect(AC.destination);
    this.slowFilter = AC.createBiquadFilter(); this.slowFilter.type = 'lowpass'; this.slowFilter.frequency.value = Math.min(20000, AC.sampleRate * 0.45); this.slowFilter.Q.value = 0.5;
    this.slowFilter.connect(masterGain);
    this.queue.push({ t: 'vol', sfx: S.sfxVol, music: S.musicVol });
    this.queue.push(this._reverbMsg());
    const useScript = () => {
      // fallback: same mixer on the main thread through a ScriptProcessor
      this.core = new (new Function(MIXER_SRC + '\nreturn MixerCore;')())(AC.sampleRate);
      const sp = AC.createScriptProcessor(1024, 0, 2);
      sp.onaudioprocess = (e) => {
        const b = e.outputBuffer, c = this.core; c.render(b.getChannelData(0), b.getChannelData(1), b.length, Math.round(e.playbackTime * AC.sampleRate));
        if (c.reports.length) { this._onStarted(c.reports); c.reports = []; }
      };
      sp.connect(this.slowFilter); this.node = sp; this.mode = 'script'; this._ready();
    };
    if (AC.audioWorklet && window.isSecureContext !== false) {
      const url = URL.createObjectURL(new Blob([MIXER_SRC], { type: 'text/javascript' }));
      AC.audioWorklet.addModule(url).then(() => {
        const n = new AudioWorkletNode(AC, 'asz-mixer', { numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [2] });
        n.connect(this.slowFilter); this.node = n; this.port = n.port; this.mode = 'worklet';
        this.port.onmessage = (e) => { if (e.data && e.data.t === 'started') this._onStarted(e.data.list); };
        this._ready();
      }).catch(useScript).finally(() => URL.revokeObjectURL(url));
    } else useScript();
  },
  _ready() {
    this.ready = true;
    // samples must reach the mixer before anything that plays them; drop stale one-shots queued while loading
    const old = this.queue; this.queue = [];
    for (const name in this.decoded) this._sendSample(name);
    for (const m of old) if (!((m.t === 'play' || m.t === 'noise' || m.t === 'tone') && !m.bus)) this.queue.push(m);
    this._flush();
  },
  _flush() {
    if (!this.ready || !this.queue.length) return;
    const q = this.queue, tr = this.transfer; this.queue = []; this.transfer = [];
    if (this.mode === 'worklet') this.port.postMessage(q, tr); else for (const m of q) this.core.msg(m);
  },
  transfer: [],
  post(m) { if (!AC) return; this.queue.push(m); if (this.ready && this.queue.length > 64) this._flush(); },
  _sendSample(name) {
    if (this.sent.has(name) || !this.decoded[name]) return;
    const d = this.decoded[name];
    this.queue.push({ t: 'sample', id: name, rate: this.infos[name].rate, data: d });
    if (this.mode === 'worklet') { this.transfer.push(d.buffer); delete this.decoded[name]; }
    this.sent.add(name);
  },

  // pack = {sounds:{name:{rate,n,c,b,d}}}; decoded in small chunks so loading stays responsive
  addPack(pack) {
    if (!pack || !pack.sounds) return Promise.resolve();
    const names = Object.keys(pack.sounds);
    for (const n of names) this.infos[n] = { rate: pack.sounds[n].rate, n: pack.sounds[n].n };
    const priority = ['menu', 'ui_hover', 'ui_click', 'ui_confirm', 'ui_back'];
    names.sort((a, b) => (priority.includes(b) ? 1 : 0) - (priority.includes(a) ? 1 : 0));
    return new Promise(resolve => { const step = () => {
      const t0 = performance.now();
      while (names.length && performance.now() - t0 < 12) {
        const n = names.shift();
        this.decoded[n] = decodeSound(pack.sounds[n]);
        if (this.ready) this._sendSample(n);
        if (n === this.musicName && !this.musicId) this.music(n, true);
        if (n === this.ambName && !this.ambId) this.ambience(n, this.ambVol);
      }
      if (names.length) setTimeout(step, 0); else resolve();
    }; step(); });
  },
  has(name) { return this.sent.has(name) || !!this.decoded[name]; },

  _reverbMsg() { return this.indoor ? { t: 'reverb', room: 0.82, damp: 0.45, wet: 1.0 } : { t: 'reverb', room: 0.55, damp: 0.6, wet: 0.55 }; },
  setIndoor(indoor) { this.indoor = indoor; this.post(this._reverbMsg()); },
  setSlowmo(a) {
    this.slow = a;
    if (!AC) return;
    const ny = AC.sampleRate * 0.45;
    const f = a > 0.01 ? Math.min(ny, 18000 * Math.pow(1 - a, 2.2) + 520) : Math.min(ny, 20000);
    this.slowFilter.frequency.setTargetAtTime(f, AC.currentTime, 0.05);
    this.post({ t: 'rate', bus: 1, value: 1 - a * 0.3 });
    this.post({ t: 'rate', bus: 2, value: 1 - a * 0.4 });
  },
  updateListener(cam) {
    cam.getWorldPosition(this.lp);
    cam.getWorldQuaternion(_aQ);
    this.lr.set(1, 0, 0).applyQuaternion(_aQ); this.lf.set(0, 0, -1).applyQuaternion(_aQ);
    this._flush();
  },
  // gains for a positioned source: equal-power pan + inverse distance + air absorption
  _spatial(pos, ref = 4, msg) {
    const d = _aV1.subVectors(pos, this.lp), dist = d.length();
    const att = dist <= ref ? 1 : ref / (ref + 1.1 * (dist - ref));
    let pan = 0, behind = 0;
    if (dist > 0.01) { d.multiplyScalar(1 / dist); pan = clamp(d.dot(this.lr), -1, 1) * 0.85; behind = d.dot(this.lf) < -0.2 ? 1 : 0; }
    const a = (pan + 1) * Math.PI / 4;
    msg.gl *= Math.cos(a) * 1.414 * att; msg.gr *= Math.sin(a) * 1.414 * att;
    const lp = Math.min(20000, 22000 / (1 + dist / 35)) * (behind ? 0.55 : 1);
    if (lp < 16000) msg.lp = msg.lp ? Math.min(msg.lp, lp) : lp;
    return att;
  },

  // ---- timing ----
  // context time (seconds) that will be HEARD at performance time `perfMs` (output timestamp mapping: smooth, already
  // includes the output latency); fallback: the render clock
  ctxAt(perfMs) {
    if (!AC) return 0;
    const ts = AC.getOutputTimestamp ? AC.getOutputTimestamp() : null;
    if (ts && ts.performanceTime > 0 && ts.contextTime > 0) return ts.contextTime + (perfMs - ts.performanceTime) / 1000;
    // no output timestamp: the render clock minus the latency between rendering a sample and hearing it
    return AC.currentTime + (perfMs - performance.now()) / 1000 - (AC.baseLatency || 0) - (AC.outputLatency || 0);
  },
  // context time being HEARD at performance time perfMs (animation clocks that follow a sound use this)
  heardAt(perfMs) { return this.ctxAt(perfMs); },
  // earliest context time a voice posted now can still start on time (render clock + a message / block margin)
  ctxEarliest() { return AC ? AC.currentTime + 128 / AC.sampleRate * 2 + 0.006 : 0; },
  startLog: null,
  _onStarted(list) { if (this.startLog) for (const r of list) this.startLog.push(r); },

  // play a sample. opts: vol, rate, pos (Vector3), reverb (send), delay, lowpass, highpass, loop, bus, fade, ref,
  //   at (absolute context time to start on, sample-accurate), dbg (report the start frame to AudioSys.startLog)
  play(name, opts = {}) {
    if (!AC || !this.infos[name]) return 0;
    const vid = this.nextId++;
    // noSlow: the player's own actions (reloads, bolt / pump work) run in real time in slow motion, so their sound must
    // not be stretched or it would fall behind the hands
    const m = { t: 'play', vid, id: name, vol: (opts.vol === undefined ? 1 : opts.vol) * (SOUND_LEVEL[name] ?? 0.6), rate: (opts.rate || 1) * (opts.bus || opts.noSlow ? 1 : 1 - this.slow * 0.45),
      gl: 1, gr: 1, send: opts.reverb === undefined ? 0.35 : opts.reverb, delay: opts.delay || 0, loop: !!opts.loop, bus: opts.bus || 0, fade: opts.fade || 0,
      lp: opts.lowpass || 0, hp: opts.highpass || 0, wide: !!opts.wide, offset: opts.offset || 0, dbg: !!opts.dbg, skipLate: !!opts.skipLate };
    if (opts.at !== undefined) {
      if (this.mode === 'worklet') m.at = opts.at;
      else if (opts.at > AC.currentTime) m.delay = opts.at - AC.currentTime + (opts.delay || 0);   // main-thread mixer: relative delay
      else if (opts.skipLate) m.offset = (m.offset || 0) + (AC.currentTime - opts.at);
    }
    if (opts.pos && this._spatial(opts.pos, opts.ref || 4, m) < 0.004) return 0;
    this.post(m);
    return vid;
  },

  // ---- synth layers (generated inside the mixer) ----
  noise(dur, vol, cutoff, opts = {}) {
    if (!AC) return;
    const m = { t: 'noise', vid: this.nextId++, dur, vol: vol * 0.9, cutoff, ftype: opts.type || 'lowpass', q: opts.q || 0.8, shape: opts.shape || 2, rate: (opts.rate || 1) * (1 - this.slow * 0.45), gl: 1, gr: 1, send: opts.reverb || 0, delay: opts.delay || 0 };
    if (opts.pos) this._spatial(opts.pos, opts.ref || 4, m);
    this.post(m);
  },
  tone(freq, dur, vol, type, slideTo, opts = {}) {
    if (!AC) return;
    const k = 1 - this.slow * 0.45;
    this.post({ t: 'tone', vid: this.nextId++, freq: freq * k, slide: slideTo ? Math.max(1, slideTo * k) : 0, dur, vol: vol * 0.8, wave: type || 'sine', gl: 1, gr: 1, send: opts.reverb || 0, delay: opts.delay || 0 });
  },

  // ---- player gunshot: sample + punch + crack + mechanics + environment tail ----
  gunshot(snd) {
    if (!AC) return;
    const r = (snd.rate || 1) * rand(0.97, 1.03);
    this.play(snd.s, { vol: snd.vol || 1, rate: r, reverb: this.indoor ? 0.55 : 0.25 });
    if (snd.layer) this.play(snd.layer, { vol: snd.layerVol || 0.5, rate: (snd.layerRate || 1) * rand(0.97, 1.03), reverb: 0.1 });
    if (snd.bass) this.tone(snd.bassF || 70, 0.16, snd.bass * 0.9, 'sine', 32);
    if (snd.crack) this.noise(0.035, snd.crack, 5200, { type: 'highpass' });
    if (snd.mech) this.tone(snd.mech, 0.03, 0.07, 'square', snd.mech * 0.7, { delay: 0.04 });
    if (!this.indoor && snd.echo !== false) this.play(snd.s, { vol: (snd.vol || 1) * 0.16, rate: r * 0.92, delay: 0.28 + Math.random() * 0.2, lowpass: 900, reverb: 0.5 });
  },

  music(name, force) {
    if (!AC) { this.musicName = name; return; }
    if (this.musicName === name && this.musicId && !force) return;
    this.musicName = name;
    if (this.musicId) { this.post({ t: 'stop', vid: this.musicId, time: 1.2 }); this.musicId = 0; }
    if (!this.has(name)) return; // starts when decoded
    this.musicId = this.play(name, { bus: 1, loop: true, fade: 1.5, reverb: 0, wide: true });
  },
  ambience(name, vol = 0.5) {
    this.ambName = name; this.ambVol = vol;
    if (!AC) return;
    if (this.ambId) { this.post({ t: 'stop', vid: this.ambId, time: 1.0 }); this.ambId = 0; }
    if (!name || !this.has(name)) return;
    this.ambId = this.play(name, { bus: 2, loop: true, fade: 1.5, vol: vol * 1.4, reverb: 0, wide: true, lowpass: this.indoor ? 900 : 0, offset: Math.random() * 10 });
  }
};
// Gameplay score: ten generated slow (20-30 BPM) military tracks (tools/make_music.py -> src/assets/audio/music).
// Every match starts a random one (never the same twice in a row); a track is downloaded only when picked.
const MUSIC_TRACKS = ['nightfall', 'iron_curtain', 'silent_approach', 'black_eagle', 'scorched_earth', 'deep_cover', 'last_stand', 'cold_front', 'hollow_point', 'dust_devil'];
for (const k of MUSIC_TRACKS) SOUND_LEVEL['music_' + k] = 0.82;
AudioSys.gameplayMusic = function () {
  let pick = MUSIC_TRACKS[Math.floor(Math.random() * MUSIC_TRACKS.length)];
  if (pick === this.lastTrack) pick = MUSIC_TRACKS[(MUSIC_TRACKS.indexOf(pick) + 1 + Math.floor(Math.random() * (MUSIC_TRACKS.length - 1))) % MUSIC_TRACKS.length];
  this.lastTrack = pick;
  const name = 'music_' + pick;
  this.music(name); // starts as soon as the track is decoded (addPack checks musicName)
  if (this.has(name) || this.loading === name) return;
  this.loading = name;
  const path = 'assets/audio/music/' + pick + '.json';
  (async () => {
    try { let d = window.ASSET_JSON && window.ASSET_JSON[path]; if (!d) d = await (await fetch('src/' + path)).json(); this.addPack(d); }
    catch (e) { if (this.musicName === name) this.music('combat'); }
    finally { if (this.loading === name) this.loading = null; }
  })();
};
const _aV1 = new THREE.Vector3(), _aQ = new THREE.Quaternion();

function initAudio() { AudioSys.init(); }
function playNoise(dur, vol, cutoff, pitchShift = 1) { AudioSys.noise(dur, vol, cutoff, { rate: pitchShift }); }
function playTone(freq, dur, vol, type, slideTo) { AudioSys.tone(freq, dur, vol, type, slideTo); }

// Named game sounds (sample first, synth fallback when a sample is missing)
const SFX = {
  _s(name, opts, fallback) { if (!AudioSys.play(name, opts) && fallback) fallback(); },
  magOut() { this._s('mag_reload', { vol: 0.9, rate: 1.08, reverb: 0.15 }, () => { AudioSys.tone(320, 0.04, 0.18, 'square', 200); }); },
  magIn() { AudioSys.noise(0.05, 0.3, 2600); AudioSys.tone(520, 0.04, 0.16, 'square', 380); },
  bolt(rate = 1) { this._s('bolt', { vol: 0.9, rate, reverb: 0.15 }, () => { AudioSys.noise(0.07, 0.28, 1800); AudioSys.tone(480, 0.05, 0.2, 'square', 380, { delay: 0.08 }); }); },
  roundIn() { this._s('round_in', { vol: 0.9, rate: rand(0.95, 1.05), reverb: 0.12 }, () => AudioSys.tone(900, 0.04, 0.15, 'square', 600)); },
  shell() { this._s('shell', { vol: 1, rate: rand(0.9, 1.2), reverb: 0.1, delay: 0.25 + Math.random() * 0.15 }); },
  dry() { this._s('dry_fire', { vol: 1, reverb: 0.05 }, () => AudioSys.tone(700, 0.04, 0.12, 'square')); },
  equip() { AudioSys.noise(0.08, 0.18, 2200); AudioSys.tone(260, 0.06, 0.12, 'triangle', 180, { delay: 0.05 }); },
  scopeIn() { this._s('scope_in', { vol: 1, reverb: 0 }); },
  zoom() { this._s('zoom', { vol: 1, reverb: 0 }); },
  hitBody(head) { this._s(head ? 'hit_head' : 'hit_body', { vol: 1, rate: rand(0.95, 1.05), reverb: 0.1 }); },
  hitmarker(head) { this._s('hitmarker', { vol: head ? 1.2 : 1, rate: head ? 1.25 : 1, reverb: 0 }, () => AudioSys.tone(head ? 1500 : 1100, 0.05, 0.2, 'square')); },
  kill() { this._s('kill', { vol: 1, reverb: 0 }); },
  glint(pos) { AudioSys.play('glint', { vol: 1, pos, ref: 8, reverb: 0.1 }); },
  rankUp() { this._s('rank_up', { vol: 1, reverb: 0.2 }); },
  newBest() { this._s('mission_complete', { vol: 1, reverb: 0.2 }); },
  impact(surface, pos) {
    const map = { metal: 'hit_metal', wood: 'hit_wood', sand: 'hit_sand', dirt: 'hit_sand', snow: 'hit_sand', concrete: 'hit_concrete', rock: 'hit_concrete', glass: 'hit_metal' };
    AudioSys.play(map[surface] || 'hit_concrete', { vol: 1, rate: rand(0.9, 1.1), pos, ref: 3, reverb: 0.2 });
  },
  whiz(pos) { AudioSys.play('whiz', { vol: 1, rate: rand(0.9, 1.15), pos, ref: 2, reverb: 0.05 }); },
  enemyShot(kind, pos) {
    // hostile marksmen fire the same heavy rifle report as the player's snipers, rolling echo included
    if (kind === 'sniper' && AudioSys.has('f_sniper308')) {
      AudioSys.play('f_sniper308', { vol: 1.1, rate: rand(0.96, 1.04), pos, ref: 14, reverb: AudioSys.indoor ? 0.6 : 0.3 });
      if (!AudioSys.indoor && AudioSys.has('ft_sniper')) AudioSys.play('ft_sniper', { vol: 0.9, pos, ref: 30, reverb: 0.3 });
      return;
    }
    const n = kind === 'sniper' ? 'enemy_sniper' : (kind === 'shotgun' ? 'shot_titan' : 'enemy_single');
    AudioSys.play(n, { vol: kind === 'heavy' ? 1.1 : 1, rate: (kind === 'shotgun' ? 0.75 : kind === 'heavy' ? 0.9 : 1) * rand(0.95, 1.05), pos, ref: 7, reverb: AudioSys.indoor ? 0.6 : 0.3 });
  },
  hurt() { this._s('hurt', { vol: 1, rate: rand(0.95, 1.05), reverb: 0 }, () => AudioSys.tone(230, 0.16, 0.32, 'sawtooth', 110)); },
  heartbeat() { this._s('heartbeat', { vol: 1, reverb: 0 }); },
  breathIn() { this._s('breath_in', { vol: 1, reverb: 0 }); },
  breathOut() { this._s('breath_out', { vol: 1, reverb: 0 }); },
  bodyFall(pos) { AudioSys.play('body_fall', { vol: 1, pos, ref: 4, reverb: 0.3 }); },
  explosion(pos) {
    if (!AudioSys.play('explosion', { vol: 1.0, pos, ref: 10, reverb: 0.6 })) { AudioSys.noise(0.6, 0.9, 400); AudioSys.tone(55, 0.5, 0.7, 'sine', 20); }
    AudioSys.tone(48, 0.6, 0.5, 'sine', 22);
  },
  // grenade / rocket / drum blast: the report, a deeper body, a sub boom the chest feels, the rumble rolling away,
  // debris pattering down, the echo from the terrain outdoors, and ringing ears when it went off close by
  bigExplosion(pos, s = 1) {
    const d = pos.distanceTo(AudioSys.lp), near = clamp(1 - d / 60, 0, 1);
    if (!AudioSys.play('explosion', { vol: 1.35 * Math.min(1.25, s), rate: rand(0.86, 0.96), pos, ref: 16 * s, reverb: 0.75 })) AudioSys.noise(0.8, 1, 380);
    AudioSys.play('explosion', { vol: 1.0, rate: rand(0.5, 0.58), pos, ref: 22 * s, reverb: 0.5, lowpass: 900 });
    AudioSys.tone(38, 1.8, 0.5 + near * 0.4, 'sine', 20);
    AudioSys.noise(2.6, 0.3 + near * 0.32, 260, { shape: 1.4, reverb: 0.4 });
    AudioSys.noise(0.05, 0.1 + 0.6 * near, 5200, { type: 'highpass' });
    for (let i = 0; i < 6; i++) AudioSys.noise(rand(0.04, 0.09), rand(0.06, 0.14) * (0.4 + near), rand(1800, 4200), { delay: rand(0.45, 1.6), pos, ref: 8, reverb: 0.2 });
    if (!AudioSys.indoor) AudioSys.play('explosion', { vol: 0.55, rate: 0.48, delay: rand(0.35, 0.6), lowpass: 520, reverb: 0.9 });
    if (d < 13) AudioSys.tone(3900, 2.4, 0.045 * (1 - d / 13), 'sine', 3700);
  },
  // thunder after a lightning stroke: a crack when it struck close, then the long low rumble rolling across the sky
  thunder(far = 0.5) {
    if (far < 0.35) AudioSys.noise(0.22, 0.45 * (1 - far), 2600, { type: 'highpass', shape: 3, reverb: 0.4 });
    AudioSys.noise(3.8 + far * 1.5, 0.55 - far * 0.2, 170 + (1 - far) * 120, { shape: 1.1, reverb: 0.5 });
    AudioSys.noise(2.4, 0.3, 480, { shape: 1.4, delay: 0.25 + far * 0.4, reverb: 0.6 });
    AudioSys.tone(34, 3.2, 0.42 - far * 0.15, 'sine', 22);
  },
  bulletTimeIn() { this._s('bullet_time', { vol: 1, reverb: 0.4 }, () => { AudioSys.tone(220, 0.8, 0.18, 'sine', 110); }); },
  bulletTimeOut() { AudioSys.tone(110, 0.4, 0.15, 'sine', 220); },
  grenadePin() { AudioSys.tone(900, 0.05, 0.12, 'square'); },
  playerDie() { this._s('mission_fail', { vol: 1, reverb: 0.2 }, () => { AudioSys.noise(0.35, 0.45, 600); AudioSys.tone(90, 0.5, 0.35, 'sawtooth', 30); }); },
  wave() { this._s('wave', { vol: 1, reverb: 0.2 }, () => { AudioSys.tone(392, 0.35, 0.22, 'sawtooth', 196); }); this._s('radio', { vol: 1, delay: 0.6, reverb: 0 }); },
  waveClear() { this._s('reward', { vol: 1, reverb: 0.2 }, () => { AudioSys.tone(660, 0.07, 0.2, 'sine'); AudioSys.tone(990, 0.12, 0.18, 'sine'); }); },
  pickupAmmo() { this._s('round_in', { vol: 1, reverb: 0 }); AudioSys.tone(660, 0.07, 0.12, 'sine'); AudioSys.tone(990, 0.12, 0.1, 'sine', null, { delay: 0.05 }); },
  pickupHealth() { AudioSys.tone(520, 0.08, 0.14, 'sine'); AudioSys.tone(780, 0.14, 0.12, 'sine', null, { delay: 0.06 }); },
  pickupWep() { SFX.bolt(1.1); },
  punch() { AudioSys.noise(0.07, 0.5, 800); AudioSys.tone(180, 0.06, 0.3, 'square', 80); },
  stepAt(surface, pos, vol = 1) {
    const cut = surface === 'metal' ? 2600 : surface === 'wood' ? 1200 : surface === 'snow' ? 900 : surface === 'sand' || surface === 'dirt' ? 700 : 1500;
    AudioSys.noise(0.06, (surface === 'metal' ? 0.13 : 0.1) * vol, cut, { pos, ref: 3, reverb: 0.08 });
  },
  step(surface) {
    const cut = surface === 'metal' ? 2600 : surface === 'wood' ? 1200 : surface === 'snow' ? 900 : surface === 'sand' || surface === 'dirt' ? 700 : 1500;
    AudioSys.noise(0.06, surface === 'metal' ? 0.11 : 0.08, cut, { reverb: 0.05 });
    if (surface === 'metal') AudioSys.tone(rand(180, 240), 0.05, 0.03, 'triangle');
  },
  uiHover() { this._s('ui_hover', { vol: 1, reverb: 0 }, () => AudioSys.tone(800, 0.02, 0.04, 'sine')); },
  uiClick() { this._s('ui_click', { vol: 1, reverb: 0 }, () => AudioSys.tone(1200, 0.04, 0.1, 'square')); },
  uiConfirm() { this._s('ui_confirm', { vol: 1, reverb: 0 }); },
  uiBack() { this._s('ui_back', { vol: 1, reverb: 0 }); },
  uiToggle() { this.uiClick(); },
  // Armory: a crisp mechanical tick for every click, a weapon locking into its slot when something is selected,
  // and a dice rattle with the lock for RANDOM PICK
  armClick() { AudioSys.noise(0.016, 0.2, 4600, { type: 'highpass' }); AudioSys.tone(2100, 0.035, 0.1, 'square', 1500); AudioSys.tone(620, 0.03, 0.06, 'triangle', 420); },
  armSelect() {
    if (!AudioSys.play('x_bolt_close', { vol: 0.75, rate: 1.08, reverb: 0.05 })) { AudioSys.noise(0.06, 0.3, 2400); AudioSys.tone(300, 0.06, 0.2, 'square', 180); }
    AudioSys.tone(880, 0.09, 0.12, 'sine', null, { delay: 0.07 }); AudioSys.tone(1320, 0.16, 0.12, 'sine', null, { delay: 0.14 });
  },
  armRandom() { for (let i = 0; i < 7; i++) AudioSys.noise(0.02, 0.16, 3000 + i * 300, { type: 'bandpass', q: 2, delay: i * 0.045 }); setTimeout(() => SFX.armSelect(), 330); },
  uiSlider() { AudioSys.tone(700, 0.015, 0.04, 'sine'); },
  // legacy aliases
  reload1() { this.magOut(); }, reload2() { this.magIn(); }, die() { this.playerDie(); },
  hit(hs) { this.hitmarker(hs); }, enemyDie() { }
};
