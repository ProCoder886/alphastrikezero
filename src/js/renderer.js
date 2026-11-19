// ---------- Renderer, scenes, cameras, post-processing ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.NoToneMapping; // tone mapping happens in the final grading pass
// Shader programs compile on the driver's worker threads: three.js would otherwise query every program's link
// status right after linking, which serialises all compiles (seconds on Windows / ANGLE). Errors are still
// checked in the dev build.
renderer.getContext().getExtension('KHR_parallel_shader_compile');
renderer.debug.checkShaderErrors = !!window.ASZ_DEV;
document.getElementById('game').appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0c1118);
scene.fog = new THREE.FogExp2(0x0c1118, 0.017);

const camera = new THREE.PerspectiveCamera(S.fov, window.innerWidth / window.innerHeight, 0.05, 900);
camera.rotation.order = 'YXZ';
scene.add(camera);

// Cinematic camera (bullet cam / kill cam)
const cineCamera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.02, 900);
scene.add(cineCamera);
let activeCamera = camera;

// First-person viewmodel lives in its own scene and is drawn after the world with a cleared depth buffer,
// so weapons never clip into walls and keep a stable field of view.
const vmScene = new THREE.Scene();
const vmCamera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.01, 10);
vmScene.add(vmCamera);
const weaponRig = new THREE.Group();
vmCamera.add(weaponRig);
const vmHemi = new THREE.HemisphereLight(0xbfd2ff, 0x2a2a2a, 0.9); vmScene.add(vmHemi);
const vmSun = new THREE.DirectionalLight(0xffffff, 1.2); vmSun.position.set(0.6, 1, 0.4); vmScene.add(vmSun);
const vmFill = new THREE.DirectionalLight(0xffffff, 0.35); vmFill.position.set(-1, 0.2, 0.6); vmScene.add(vmFill);
const vmFlash = new THREE.PointLight(0xffb060, 0, 3, 2); vmFlash.position.set(0.1, -0.05, -0.8); vmCamera.add(vmFlash);

// ---------- lighting ----------
const hemi = new THREE.HemisphereLight(0x5a6f96, 0x1a2015, 0.55);
scene.add(hemi);
const moon = new THREE.DirectionalLight(0x9fb4d8, 0.65); // "sun" for outdoor maps
moon.position.set(28, 42, -18);
moon.castShadow = true;
moon.shadow.mapSize.set(2048, 2048);
moon.shadow.camera.left = -45; moon.shadow.camera.right = 45;
moon.shadow.camera.top = 45; moon.shadow.camera.bottom = -45;
moon.shadow.camera.near = 1; moon.shadow.camera.far = 220;
moon.shadow.bias = -0.0006; moon.shadow.normalBias = 0.03;
scene.add(moon); scene.add(moon.target);
const sunDir = new THREE.Vector3(0.5, 0.8, -0.3).normalize();

// One pooled dynamic light for muzzle flashes and explosions. It always exists (adding/removing lights forces
// shader recompiles) and there is only one, because every point light costs every lit pixel of the frame.
const fxLight = new THREE.PointLight(0xffb060, 0, 14, 2); scene.add(fxLight);
function lightPulse(pos, color, intensity, dist, dur) {
  if (fxLight.userData.t > 0.02 && fxLight.intensity > intensity * 1.2) return; // a bigger flash is still burning
  fxLight.position.copy(pos); fxLight.color.setHex(color); fxLight.intensity = intensity; fxLight.distance = dist; fxLight.userData.t = dur;
}

// ---------- post-processing ----------
const GradeShader = {
  uniforms: {
    tDiffuse: { value: null }, exposure: { value: 1.0 }, saturation: { value: 1.05 }, contrast: { value: 1.05 },
    tint: { value: new THREE.Color(1, 1, 1) }, lift: { value: new THREE.Color(0, 0, 0) }, vignette: { value: 0.35 },
    slowmo: { value: 0 }, letterbox: { value: 0 }, damage: { value: 0 }, flash: { value: 0 }, time: { value: 0 }, aspect: { value: 1 },
    scope: { value: 0 }, texel: { value: new THREE.Vector2(1 / 1920, 1 / 1080) }, fxaa: { value: 0 },
    sunUV: { value: new THREE.Vector2(-9, -9) }, sunVis: { value: 0 }, sunCol: { value: new THREE.Color(1, 0.9, 0.7) }, sunNight: { value: 0 },
    sharpen: { value: 0.5 }, nvg: { value: 0 }, nvgMode: { value: 0 }, nvgGain: { value: 7 }, nvgNoise: { value: 0 }, upscale: { value: 1 },
    tTeam: { value: null }, teamOn: { value: 0 }, torch: { value: 0 }, tVmDepth: { value: null }, vmMask: { value: 0 }
  },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float exposure, saturation, contrast, vignette, slowmo, letterbox, damage, flash, time, aspect, scope, fxaa, sunVis, sunNight;
    uniform float sharpen, nvg, nvgMode, nvgGain, nvgNoise, upscale, teamOn, torch, vmMask;
    uniform sampler2D tTeam, tVmDepth;
    uniform vec3 tint, lift, sunCol; uniform vec2 texel, sunUV; varying vec2 vUv;
    vec3 aces(vec3 x){ return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14),0.0,1.0); }
    vec3 toSRGB(vec3 c){ return mix(c*12.92, 1.055*pow(c, vec3(1.0/2.4)) - 0.055, step(0.0031308, c)); }
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
    float lum(vec3 c){ c = c / (1.0 + c); return dot(c, vec3(0.299, 0.587, 0.114)); }
    // FXAA (console variant) on tone-compressed luma
    // Upscaling from the dynamic-resolution world image to the native canvas: 5-tap Catmull-Rom (bilinear taps,
    // corners dropped) clamped to the taps' range so bright edges do not ring - far crisper than plain bilinear.
    vec3 sampleCR(vec2 uv){
      vec2 sp = uv / texel, t1 = floor(sp - 0.5) + 0.5, f = sp - t1;
      vec2 w0 = f * (-0.5 + f * (1.0 - 0.5 * f)), w1 = 1.0 + f * f * (-2.5 + 1.5 * f);
      vec2 w2 = f * (0.5 + f * (2.0 - 1.5 * f)), w3 = f * f * (-0.5 + 0.5 * f);
      vec2 w12 = w1 + w2, t12 = (t1 + w2 / w12) * texel, t0 = (t1 - 1.0) * texel, t3 = (t1 + 2.0) * texel;
      vec3 a = texture2D(tDiffuse, vec2(t12.x, t0.y)).rgb, b = texture2D(tDiffuse, vec2(t0.x, t12.y)).rgb;
      vec3 c = texture2D(tDiffuse, t12).rgb, d = texture2D(tDiffuse, vec2(t3.x, t12.y)).rgb, e = texture2D(tDiffuse, vec2(t12.x, t3.y)).rgb;
      float wa = w12.x * w0.y, wb = w0.x * w12.y, wc = w12.x * w12.y, wd = w3.x * w12.y, we = w12.x * w3.y;
      vec3 r = (a * wa + b * wb + c * wc + d * wd + e * we) / (wa + wb + wc + wd + we);
      return clamp(r, min(c, min(min(a, b), min(d, e))), max(c, max(max(a, b), max(d, e))));
    }
    vec3 fxaaSample(vec2 uv, vec3 m){
      vec3 nw = texture2D(tDiffuse, uv + vec2(-1.0,-1.0)*texel).rgb, ne = texture2D(tDiffuse, uv + vec2(1.0,-1.0)*texel).rgb;
      vec3 sw = texture2D(tDiffuse, uv + vec2(-1.0,1.0)*texel).rgb, se = texture2D(tDiffuse, uv + vec2(1.0,1.0)*texel).rgb;
      float lNW = lum(nw), lNE = lum(ne), lSW = lum(sw), lSE = lum(se), lM = lum(m);
      float lMin = min(lM, min(min(lNW, lNE), min(lSW, lSE))), lMax = max(lM, max(max(lNW, lNE), max(lSW, lSE)));
      if (lMax - lMin < max(0.03, lMax * 0.12)) return m;
      vec2 dir = vec2(-((lNW + lNE) - (lSW + lSE)), ((lNW + lSW) - (lNE + lSE)));
      float red = max((lNW + lNE + lSW + lSE) * 0.03125, 0.0078125);
      dir = clamp(dir / (min(abs(dir.x), abs(dir.y)) + red), vec2(-8.0), vec2(8.0)) * texel;
      vec3 a = 0.5 * (texture2D(tDiffuse, uv + dir * (1.0/3.0 - 0.5)).rgb + texture2D(tDiffuse, uv + dir * (2.0/3.0 - 0.5)).rgb);
      vec3 b = a * 0.5 + 0.25 * (texture2D(tDiffuse, uv - dir * 0.5).rgb + texture2D(tDiffuse, uv + dir * 0.5).rgb);
      float lB = lum(b);
      return (lB < lMin || lB > lMax) ? a : b;
    }
    // contrast-adaptive sharpening (AMD CAS) on tone-compressed colour: restores texture detail lost to
    // dynamic resolution / FXAA without haloing strong edges
    vec3 tc(vec3 c){ return c / (1.0 + c); }
    vec3 sharpenAt(vec2 uv, vec3 m){
      vec3 a = tc(texture2D(tDiffuse, uv + vec2(0.0, -texel.y)).rgb), b = tc(texture2D(tDiffuse, uv + vec2(-texel.x, 0.0)).rgb);
      vec3 c = tc(texture2D(tDiffuse, uv + vec2(texel.x, 0.0)).rgb), d = tc(texture2D(tDiffuse, uv + vec2(0.0, texel.y)).rgb);
      vec3 e = tc(m);
      vec3 mn = min(e, min(min(a, b), min(c, d))), mx = max(e, max(max(a, b), max(c, d)));
      vec3 amp = sqrt(clamp(min(mn, 1.0 - mx) / max(mx, 1e-4), 0.0, 1.0));
      vec3 w = -amp / mix(8.0, 4.5, clamp(sharpen, 0.0, 1.0));
      vec3 r = clamp((e + (a + b + c + d) * w) / (1.0 + 4.0 * w), 0.0, 0.995);
      return r / (1.0 - r);
    }
    // sun / moon glare: halo, anamorphic streak and lens ghosts (HDR, before tone mapping)
    vec3 glare(vec2 uv){
      vec2 d = (uv - sunUV) * vec2(aspect, 1.0); float r = length(d);
      vec3 g = sunCol * (exp(-r * 5.5) * 0.35 + exp(-r * 20.0) * 0.9 + exp(-r * 70.0) * 2.2);
      g += sunCol * exp(-abs(d.y) * 120.0) * exp(-abs(d.x) * 2.4) * 0.5 * (1.0 - sunNight * 0.6);
      if (sunNight < 0.5) {
        vec2 axis = vec2(0.5) - sunUV;
        for (int i = 1; i <= 4; i++) {
          float f = float(i);
          float gd = length((uv - (sunUV + axis * (0.5 * f))) * vec2(aspect, 1.0));
          float sz = 0.02 + 0.02 * f;
          g += sunCol * vec3(0.5 + 0.15 * f, 0.75, 1.0 - 0.12 * f) * smoothstep(sz, sz * 0.35, gd) * 0.05;
        }
      }
      return g * sunVis;
    }
    void main(){
      vec2 uv = vUv; vec2 c = uv - 0.5;
      vec3 col;
      if (slowmo > 0.01) {
        float ca = slowmo * 0.006 * dot(c,c) * 4.0;
        col.r = texture2D(tDiffuse, uv + c*ca).r; col.g = texture2D(tDiffuse, uv).g; col.b = texture2D(tDiffuse, uv - c*ca).b;
      } else {
        vec3 base = upscale > 1.05 ? sampleCR(uv) : texture2D(tDiffuse, uv).rgb;
        col = fxaa > 0.5 ? fxaaSample(uv, base) : base;
      }
      if (sharpen > 0.01 && slowmo <= 0.01) col = sharpenAt(uv, col);
      if (sunVis > 0.002) col += glare(uv);
      col *= exposure;
      // weapon light: a soft cone of extra exposure around the aim point (cheap stand-in for a real spot light)
      if (torch > 0.01) { vec2 tq = c * vec2(aspect, 1.0); col *= 1.0 + torch * 2.6 * smoothstep(0.46, 0.04, length(tq)); }
      float nvL = dot(col, vec3(0.299, 0.587, 0.114));
      col = aces(col);
      col = col * tint + lift;
      float l = dot(col, vec3(0.2126,0.7152,0.0722));
      col = mix(vec3(l), col, saturation * (1.0 - slowmo*0.55));
      col = mix(col, l * vec3(1.12, 0.98, 0.78), slowmo * 0.35);
      col = (col - 0.5) * (contrast + slowmo*0.12) + 0.5;
      vec2 vc = c * vec2(aspect, 1.0);
      float v = smoothstep(0.95, 0.25, length(vc) * (1.0 + slowmo*0.35));
      col *= mix(1.0, v, vignette + slowmo*0.3);
      // night vision: clean digital intensifier - monochrome gain with a gentle shoulder, no grain, no scan lines,
      // only a light falloff toward the corners. Hostiles show in red and the squad in blue (team mask, see
      // TeamMaskPass): the mask is drawn from the soldiers themselves, hidden behind walls like they are.
      if (nvg > 0.001) {
        float a = 1.0 - exp(-nvL * nvgGain);
        a = pow(a, 0.86); a = mix(a, a * a * (3.0 - 2.0 * a), 0.35);
        vec3 green = vec3(0.30, 1.0, 0.42) * a + vec3(0.0, 0.022, 0.006);
        vec3 blue = vec3(0.40, 0.86, 1.0) * a + vec3(0.0, 0.016, 0.028);
        vec3 nv = mix(green, blue, nvgMode);
        nv = mix(nv, mix(vec3(0.86, 1.0, 0.88), vec3(0.9, 0.98, 1.0), nvgMode), smoothstep(0.8, 1.0, a) * 0.55);
        if (teamOn > 0.5) {
          vec4 tm = texture2D(tTeam, uv);
          // soft outline from the neighbouring mask texels, so distant figures stay readable
          vec2 to = texel * 2.2;
          vec4 th = texture2D(tTeam, uv + vec2(to.x, 0.0)) + texture2D(tTeam, uv - vec2(to.x, 0.0)) + texture2D(tTeam, uv + vec2(0.0, to.y)) + texture2D(tTeam, uv - vec2(0.0, to.y));
          float halo = clamp(th.a * 0.5, 0.0, 1.0) * (1.0 - tm.a);
          // the weapon and the arms cover the mask: after the viewmodel pass the depth buffer holds only them
          if (vmMask > 0.5 && texture2D(tVmDepth, uv).x < 0.99999) { tm = vec4(0.0); halo = 0.0; }
          vec3 hc = th.a > 0.001 ? th.rgb / th.a : vec3(0.0);
          nv = mix(nv, tm.rgb * (0.5 + 0.7 * a), tm.a * 0.94);
          nv += hc * halo * 0.55;
        }
        float tube = smoothstep(1.18, 0.55, length(vc * vec2(0.8, 1.0)));
        nv *= mix(0.55, 1.0, tube);
        col = mix(col, nv, nvg);
      }
      col = mix(col, vec3(0.55,0.0,0.0), damage * smoothstep(0.25, 0.85, length(vc)));
      col += flash;
      col += (hash(uv*vec2(1920.0,1080.0) + time) - 0.5) * 0.008 * (1.0 - nvg);
      col = clamp(col, 0.0, 1.0);
      if (abs(c.y) > 0.5 - letterbox*0.11) col = vec3(0.0);
      gl_FragColor = vec4(toSRGB(col), 1.0);
    }`
};

// ---------- motion FX: camera motion blur, radial speed blur, slow-motion afterimage, shockwave ----------
// Runs on the world image before the weapon is drawn (the gun moves with the camera and stays sharp).
// The motion vector comes from the camera's rotation and zoom since the last frame, so no depth or velocity
// buffer is needed: a far-plane point is re-projected with the previous view rotation and projection.
const MotionShader = {
  uniforms: {
    tDiffuse: { value: null }, tHistory: { value: null }, uReproj: { value: new THREE.Matrix4() }, uBlur: { value: 0 }, uMaxBlur: { value: 0.07 },
    tDepth: { value: null }, uInvProj: { value: new THREE.Matrix4() }, uDof: { value: 0 }, uFocus: { value: 10 },
    uRadial: { value: 0 }, uRadialC: { value: new THREE.Vector2(0.5, 0.5) }, uGhost: { value: 0 }, uWave: { value: new THREE.Vector3(0.5, 0.5, 0) }, uWaveAmp: { value: 0 },
    uAspect: { value: 1 }, uTime: { value: 0 }
  },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: `
    uniform sampler2D tDiffuse, tHistory; uniform mat4 uReproj; uniform vec2 uRadialC; uniform vec3 uWave;
    uniform float uBlur, uMaxBlur, uRadial, uGhost, uWaveAmp, uAspect, uTime; varying vec2 vUv;
    uniform sampler2D tDepth; uniform mat4 uInvProj; uniform float uDof, uFocus;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main(){
      vec2 uv = vUv;
      if (uWaveAmp > 0.0005) {
        vec2 d = (uv - uWave.xy) * vec2(uAspect, 1.0); float r = length(d);
        float ring = exp(-pow((r - uWave.z) * 16.0, 2.0));
        uv -= d / max(r, 1e-4) / vec2(uAspect, 1.0) * ring * uWaveAmp;
      }
      vec4 pc = uReproj * vec4(uv * 2.0 - 1.0, 1.0, 1.0);
      vec2 vel = pc.w > 0.0 ? (uv - (pc.xy / pc.w * 0.5 + 0.5)) * uBlur : vec2(0.0);
      float vl = length(vel); if (vl > uMaxBlur) vel *= uMaxBlur / vl;
      vel += (uv - uRadialC) * uRadial;
      vec3 c;
      if (dot(vel, vel) < 1e-6) c = texture2D(tDiffuse, uv).rgb;
      else {
        // interleaved gradient noise spreads the sample positions in a fine, even pattern (white noise left
        // jagged streaks along the direction of a fast turn); taps fade toward the ends of the streak
        vec2 fc = gl_FragCoord.xy + mod(uTime, 64.0) * 5.588238;
        float j = fract(52.9829189 * fract(dot(fc, vec2(0.06711056, 0.00583715)))) - 0.5; c = vec3(0.0); float wsum = 0.0;
        for (int i = 0; i < MB_SAMPLES; i++) {
          float f = (float(i) + 0.5 + j) / float(MB_SAMPLES) - 0.5, w = 1.0 - abs(f) * 0.9;
          c += texture2D(tDiffuse, uv + vel * f).rgb * w; wsum += w;
        }
        c /= wsum;
      }
      // depth of field (slow motion / kill cams): a disc blur that grows with distance from the focus plane
      if (uDof > 0.01) {
        float d = texture2D(tDepth, uv).x;
        vec4 vp = uInvProj * vec4(uv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0);
        float z = -vp.z / vp.w;
        float coc = d >= 0.99999 ? 1.0 : clamp(abs(z - uFocus) / max(uFocus, 1.0) - 0.18, 0.0, 1.0);
        coc *= uDof;
        if (coc > 0.02) {
          float j = hash(gl_FragCoord.yx + uTime) * 6.283; vec3 acc = c;
          for (int i = 0; i < 12; i++) {
            float f = (float(i) + 0.5) / 12.0, a = j + f * 39.0;
            acc += texture2D(tDiffuse, uv + vec2(cos(a) / uAspect, sin(a)) * sqrt(f) * coc * 0.014).rgb;
          }
          c = acc / 13.0;
        }
      }
      if (uGhost > 0.001) c = mix(c, texture2D(tHistory, vUv).rgb, uGhost);
      gl_FragColor = vec4(c, 1.0);
    }`
};
class MotionFXPass extends THREE.Pass {
  constructor(w, h, samples) {
    super(); this.needsSwap = false; this.active = false; this.ghost = 0; this.frame = 0; this.last = -9; this.samples = samples;
    this.mat = new THREE.ShaderMaterial({ uniforms: THREE.UniformsUtils.clone(MotionShader.uniforms), vertexShader: MotionShader.vertexShader, fragmentShader: MotionShader.fragmentShader, defines: { MB_SAMPLES: samples }, depthTest: false, depthWrite: false });
    this.copy = new THREE.ShaderMaterial({ uniforms: THREE.UniformsUtils.clone(THREE.CopyShader.uniforms), vertexShader: THREE.CopyShader.vertexShader, fragmentShader: THREE.CopyShader.fragmentShader, depthTest: false, depthWrite: false });
    this.quad = new THREE.FullScreenQuad(this.mat); this.copyQuad = new THREE.FullScreenQuad(this.copy);
    const o = { type: THREE.HalfFloatType, format: THREE.RGBAFormat, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false };
    this.hist = [new THREE.WebGLRenderTarget(w, h, o), new THREE.WebGLRenderTarget(w, h, o)]; this.idx = 0;
  }
  setSize(w, h) { for (const t of this.hist) t.setSize(w, h); }
  dispose() { for (const t of this.hist) t.dispose(); this.mat.dispose(); this.copy.dispose(); }
  render(r, writeBuffer, readBuffer) {
    this.frame++;
    if (!this.active) return;
    const U = this.mat.uniforms, prev = this.hist[this.idx], cur = this.hist[1 - this.idx];
    U.tDiffuse.value = readBuffer.texture; U.tHistory.value = prev.texture;
    U.tDepth.value = readBuffer.depthTexture || null; U.uInvProj.value.copy(activeCamera.projectionMatrixInverse);
    if (!readBuffer.depthTexture) U.uDof.value = 0;
    U.uGhost.value = this.frame - this.last === 1 ? this.ghost : 0; // history is stale after an idle frame
    r.setRenderTarget(cur); this.quad.render(r);
    // back into the scene buffer: the weapon, bloom and grading passes continue unchanged
    this.copy.uniforms.tDiffuse.value = cur.texture;
    r.setRenderTarget(readBuffer); this.copyQuad.render(r);
    this.idx = 1 - this.idx; this.last = this.frame;
  }
}

// ---------- SSAO: screen-space ambient occlusion (contact shadows in corners, under props, around soldiers) ----------
// Half resolution: occlusion from the world depth buffer (normals reconstructed from depth, 4x4 interleaved
// sample rotations), a depth-aware 4x4 blur that averages exactly those rotations, then a multiply onto the
// world image before the weapon is drawn.
const SSAOShader = {
  uniforms: { tDepth: { value: null }, uProj: { value: new THREE.Matrix4() }, uInvProj: { value: new THREE.Matrix4() }, uTexel: { value: new THREE.Vector2() },
    uRadius: { value: 0.7 }, uIntensity: { value: 1.0 }, uAspect: { value: 1 }, uFade: { value: 60 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: `
    uniform sampler2D tDepth; uniform mat4 uProj, uInvProj; uniform vec2 uTexel; uniform float uRadius, uIntensity, uAspect, uFade; varying vec2 vUv;
    vec3 vpos(vec2 uv){ float d = texture2D(tDepth, uv).x; vec4 v = uInvProj * vec4(uv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0); return v.xyz / v.w; }
    void main(){
      float d = texture2D(tDepth, vUv).x;
      if (d >= 0.99999) { gl_FragColor = vec4(1.0); return; }
      vec3 P = vpos(vUv);
      if (-P.z > uFade) { gl_FragColor = vec4(1.0); return; }
      vec3 pr = vpos(vUv + vec2(uTexel.x, 0.0)), pl = vpos(vUv - vec2(uTexel.x, 0.0)), pu = vpos(vUv + vec2(0.0, uTexel.y)), pd = vpos(vUv - vec2(0.0, uTexel.y));
      vec3 dx = abs(pr.z - P.z) < abs(P.z - pl.z) ? pr - P : P - pl;
      vec3 dy = abs(pu.z - P.z) < abs(P.z - pd.z) ? pu - P : P - pd;
      vec3 N = normalize(cross(dx, dy));
      float rad = uRadius * uProj[1][1] * 0.5 / -P.z;            // world radius -> uv
      rad = min(rad, 0.16);
      float cell = mod(floor(gl_FragCoord.x), 4.0) * 4.0 + mod(floor(gl_FragCoord.y), 4.0);
      float ang = cell * 0.3927, sum = 0.0;
      for (int i = 0; i < AO_SAMPLES; i++) {
        float f = (float(i) + 0.5) / float(AO_SAMPLES);
        float a = ang + f * 15.53;
        vec2 suv = vUv + vec2(cos(a) / uAspect, sin(a)) * rad * f;
        vec3 v = vpos(suv) - P;
        float vv = dot(v, v);
        sum += max(0.0, dot(v, N) - 0.008 * -P.z) / (vv + 0.015) * max(0.0, 1.0 - vv / (uRadius * uRadius * 4.0));
      }
      float ao = pow(clamp(1.0 - uIntensity * 2.2 * sum / float(AO_SAMPLES), 0.0, 1.0), 1.3);
      ao = mix(ao, 1.0, smoothstep(uFade * 0.6, uFade, -P.z));
      gl_FragColor = vec4(ao, ao, ao, 1.0);
    }`
};
const SSAOBlurShader = {
  uniforms: { tAO: { value: null }, tDepth: { value: null }, uTexel: { value: new THREE.Vector2() }, uInvProj: { value: new THREE.Matrix4() } },
  vertexShader: SSAOShader.vertexShader,
  fragmentShader: `
    uniform sampler2D tAO, tDepth; uniform vec2 uTexel; uniform mat4 uInvProj; varying vec2 vUv;
    float vz(vec2 uv){ float d = texture2D(tDepth, uv).x; vec4 v = uInvProj * vec4(uv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0); return v.z / v.w; }
    void main(){
      float zc = vz(vUv), s = 0.0, w = 0.0;
      for (int x = -2; x < 2; x++) for (int y = -2; y < 2; y++) {
        vec2 o = (vec2(float(x), float(y)) + 0.5) * uTexel;
        float wt = 1.0 / (0.002 + abs(vz(vUv + o) - zc) / max(-zc, 0.5));
        s += texture2D(tAO, vUv + o).r * wt; w += wt;
      }
      float ao = s / w;
      gl_FragColor = vec4(ao, ao, ao, 1.0);
    }`
};
class SSAOPass extends THREE.Pass {
  constructor(w, h, samples) {
    super(); this.needsSwap = false; this.active = false; this.strength = 0.8;
    const o = { type: THREE.UnsignedByteType, format: THREE.RGBAFormat, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false };
    this.aoRT = new THREE.WebGLRenderTarget(Math.max(1, w >> 1), Math.max(1, h >> 1), o); this.blurRT = this.aoRT.clone();
    this.aoMat = new THREE.ShaderMaterial({ uniforms: THREE.UniformsUtils.clone(SSAOShader.uniforms), vertexShader: SSAOShader.vertexShader, fragmentShader: SSAOShader.fragmentShader, defines: { AO_SAMPLES: samples }, depthTest: false, depthWrite: false });
    this.blurMat = new THREE.ShaderMaterial({ uniforms: THREE.UniformsUtils.clone(SSAOBlurShader.uniforms), vertexShader: SSAOBlurShader.vertexShader, fragmentShader: SSAOBlurShader.fragmentShader, depthTest: false, depthWrite: false });
    // multiply onto the scene: dst = dst * ao (strength folded into the colour)
    this.compMat = new THREE.ShaderMaterial({ uniforms: { tAO: { value: null }, uStrength: { value: 0.8 } }, vertexShader: SSAOShader.vertexShader,
      fragmentShader: 'uniform sampler2D tAO; uniform float uStrength; varying vec2 vUv; void main(){ float a = mix(1.0, texture2D(tAO, vUv).r, uStrength); gl_FragColor = vec4(a, a, a, 1.0); }',
      depthTest: false, depthWrite: false, transparent: true, blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.ZeroFactor, blendDst: THREE.SrcColorFactor });
    this.q1 = new THREE.FullScreenQuad(this.aoMat); this.q2 = new THREE.FullScreenQuad(this.blurMat); this.q3 = new THREE.FullScreenQuad(this.compMat);
  }
  setSize(w, h) { this.aoRT.setSize(Math.max(1, w >> 1), Math.max(1, h >> 1)); this.blurRT.setSize(Math.max(1, w >> 1), Math.max(1, h >> 1)); }
  dispose() { this.aoRT.dispose(); this.blurRT.dispose(); this.aoMat.dispose(); this.blurMat.dispose(); this.compMat.dispose(); }
  render(r, writeBuffer, readBuffer) {
    if (!this.active || !readBuffer.depthTexture) return;
    const cam = activeCamera, A = this.aoMat.uniforms, B = this.blurMat.uniforms;
    A.tDepth.value = readBuffer.depthTexture; A.uProj.value.copy(cam.projectionMatrix); A.uInvProj.value.copy(cam.projectionMatrixInverse);
    A.uTexel.value.set(1 / readBuffer.width, 1 / readBuffer.height); A.uAspect.value = cam.aspect;
    A.uRadius.value = WORLD.indoor ? 0.95 : 1.3; A.uFade.value = WORLD.indoor ? 50 : 80;
    r.setRenderTarget(this.aoRT); this.q1.render(r);
    B.tAO.value = this.aoRT.texture; B.tDepth.value = readBuffer.depthTexture; B.uInvProj.value.copy(cam.projectionMatrixInverse);
    B.uTexel.value.set(1 / this.aoRT.width, 1 / this.aoRT.height);
    r.setRenderTarget(this.blurRT); this.q2.render(r);
    this.compMat.uniforms.tAO.value = this.blurRT.texture; this.compMat.uniforms.uStrength.value = this.strength;
    const ac = r.autoClear; r.autoClear = false;
    r.setRenderTarget(readBuffer); this.q3.render(r);
    r.autoClear = ac;
  }
}

// Night-vision team mask: while the goggles are on, every living soldier is drawn once more into a small colour
// target (hostiles red, squad blue), tested against the world depth so nobody shows through a wall. The grade pass
// lays that mask over the intensified image. Soldiers are picked out with render layers (1 = hostile, 2 = squad).
const TEAM_VS = `#include <common>
#include <skinning_pars_vertex>
varying vec3 vN;
void main(){
  #include <beginnormal_vertex>
  #include <skinbase_vertex>
  #include <skinnormal_vertex>
  #include <defaultnormal_vertex>
  #include <begin_vertex>
  #include <skinning_vertex>
  #include <project_vertex>
  vN = normalize(transformedNormal);
}`;
const TEAM_FS = `uniform sampler2D tDepth; uniform vec2 uRes; uniform vec3 uColor; uniform float uNear, uFar; varying vec3 vN;
float lin(float d){ return uNear * uFar / (uFar - d * (uFar - uNear)); }
void main(){
  float sd = texture2D(tDepth, gl_FragCoord.xy / uRes).x;
  if (lin(gl_FragCoord.z) > lin(sd) * 1.012 + 0.06) discard;
  float sh = 0.62 + 0.38 * abs(normalize(vN).z);
  gl_FragColor = vec4(uColor * sh, 1.0);
}`;
class TeamMaskPass extends THREE.Pass {
  constructor() {
    super(); this.needsSwap = false; this.enabled = true; this.active = false;
    this.rt = new THREE.WebGLRenderTarget(4, 4, { format: THREE.RGBAFormat, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: true });
    const mk = (hex) => new THREE.ShaderMaterial({ uniforms: { tDepth: { value: null }, uRes: { value: new THREE.Vector2(4, 4) }, uColor: { value: new THREE.Color(hex) }, uNear: { value: 0.1 }, uFar: { value: 1000 } },
      vertexShader: TEAM_VS, fragmentShader: TEAM_FS, skinning: true, fog: false });
    this.red = mk(0xff2a22); this.blue = mk(0x2f8cff);
    this._c = new THREE.Color();
  }
  dispose() { this.rt.dispose(); }
  // layers follow the soldiers: tagged when first seen, untagged when they die (corpses are not marked)
  tag() {
    if (typeof enemies === 'undefined') return 0;
    let n = 0;
    for (const e of enemies) {
      const want = e.dead ? 0 : (e.team === 'blue' ? 2 : 1);
      if (e._nvL !== want && e.g) { const w0 = want; e.g.traverse(o => { if (o.isMesh) { o.layers.disable(1); o.layers.disable(2); if (w0) o.layers.enable(w0); } }); e._nvL = want; }
      if (want) n++;
    }
    return n;
  }
  render(r, writeBuffer, readBuffer) {
    const U = POST.grade.uniforms, on = typeof NVG !== 'undefined' && NVG.k > 0.02 && !!readBuffer.depthTexture;
    this.active = false; U.teamOn.value = 0;
    if (!on || !this.tag()) return;
    const w = Math.max(2, readBuffer.width >> 0), h = Math.max(2, readBuffer.height >> 0), cam = activeCamera;
    if (this.rt.width !== w || this.rt.height !== h) this.rt.setSize(w, h);
    for (const m of [this.red, this.blue]) { const u = m.uniforms; u.tDepth.value = readBuffer.depthTexture; u.uRes.value.set(w, h); u.uNear.value = cam.near; u.uFar.value = cam.far; }
    const bg = scene.background, om = scene.overrideMaterial, mask = cam.layers.mask, ac = r.autoClear, sm = r.shadowMap.needsUpdate;
    r.getClearColor(this._c); const ca = r.getClearAlpha();
    scene.background = null; r.shadowMap.needsUpdate = false;
    r.setRenderTarget(this.rt); r.setClearColor(0x000000, 0); r.autoClear = false; r.clear(true, true, false);
    scene.overrideMaterial = this.red; cam.layers.set(1); r.render(scene, cam);
    scene.overrideMaterial = this.blue; cam.layers.set(2); r.render(scene, cam);
    scene.overrideMaterial = om; scene.background = bg; cam.layers.mask = mask; r.autoClear = ac; r.setClearColor(this._c, ca); r.shadowMap.needsUpdate = sm;
    U.tTeam.value = this.rt.texture; U.teamOn.value = 1; this.active = true;
  }
}

// Draws the first-person weapon over the world after clearing depth
class ViewmodelPass extends THREE.Pass {
  constructor() { super(); this.needsSwap = false; this.enabled = true; }
  render(r, writeBuffer, readBuffer) {
    const U = POST.grade.uniforms; U.vmMask.value = 0;
    if (!weaponRig.visible || activeCamera !== camera) return;
    const ac = r.autoClear; r.autoClear = false;
    r.setRenderTarget(readBuffer); r.clearDepth();
    r.render(vmScene, vmCamera);
    // the depth buffer now holds only the weapon and the arms: the grade pass uses it to keep the night-vision
    // team colours from showing through them
    if (readBuffer.depthTexture) { U.tVmDepth.value = readBuffer.depthTexture; U.vmMask.value = 1; }
    r.autoClear = ac;
  }
}

// Quality presets. Every preset is tuned for 60+ FPS; dynamic resolution (main.js) keeps it there.
// lights = size of the pool of real point lights that follow the player from lamp to lamp (LIGHTPOOL, world.js)
const QUALITY = {
  low:    { post: false, bloom: false, msaa: 0, fxaa: false, shadows: false, shadowSize: 0,    shadowEvery: 0, prCap: 0.9,  lights: 1, fx: 0.5, weather: 0.5, cover: 0.3, sharpen: 0, mb: 0, ao: 0 },
  medium: { post: true,  bloom: false, msaa: 0, fxaa: true,  shadows: true,  shadowSize: 1024, shadowEvery: 2, prCap: 1.0,  lights: 4, fx: 0.75, weather: 0.75, cover: 0.55, sharpen: 0.24, mb: 10, ao: 8 },
  high:   { post: true,  bloom: true,  msaa: 2, fxaa: false, shadows: true,  shadowSize: 2048, shadowEvery: 1, prCap: 1.25, lights: 6, fx: 1, weather: 1, cover: 1, sharpen: 0.18, mb: 14, ao: 12 }
};
// Effective preset = chosen preset minus the steps the adaptive ladder (main.js) has taken off to hold
// 60 FPS: QLEVEL 1 = MSAA -> FXAA, 2 = no bloom, 3 = shadows every 2nd frame at 1024.
let QLEVEL = 0, _qKey = '', _qEff = null;
function Q() {
  const lvl = QLEVEL, key = S.quality + lvl;
  if (key === _qKey) return _qEff;
  const q = Object.assign({}, QUALITY[S.quality] || QUALITY.high);
  if (lvl >= 1 && q.msaa) { q.msaa = 0; q.fxaa = true; }
  if (lvl >= 2) { q.bloom = false; q.ao = 0; }
  if (lvl >= 3 && q.shadows) { q.shadowEvery = Math.max(2, q.shadowEvery); q.shadowSize = Math.min(1024, q.shadowSize); }
  _qKey = key; _qEff = q;
  return q;
}

const POST = { composer: null, grade: null, bloom: null, worldPass: null, motion: null, ssao: null, team: null, enabled: true, msaa: -1, mb: -1, aoN: -1, sharpen: 0 };
// World render scale vs canvas: with post-processing the canvas keeps native density and only the world renders at
// the dynamic-resolution scale (RENDER_PR, main.js); the grade pass upscales it (bicubic + CAS), which is much
// sharper than the browser stretching a shrunken canvas. Without post the canvas itself shrinks.
let RENDER_PR = renderer.getPixelRatio();
function renderBufferSize(v) {
  if (POST.composer && POST.enabled) return v.set(Math.floor(POST.composer.renderTarget1.width), Math.floor(POST.composer.renderTarget1.height));
  return renderer.getDrawingBufferSize(v);
}
function setupPost() {
  const q = Q(), size = new THREE.Vector2(Math.max(1, Math.floor((window.innerWidth || 1) * RENDER_PR)), Math.max(1, Math.floor((window.innerHeight || 1) * RENDER_PR)));
  const samples = q.msaa && renderer.capabilities.isWebGL2 ? q.msaa : 0, mb = Math.max(4, q.mb || 0), aoN = Math.max(4, QUALITY[S.quality] ? QUALITY[S.quality].ao || 0 : 0);
  if (POST.composer && POST.msaa === samples && POST.mb === mb && POST.aoN === aoN) return;
  if (POST.composer) { POST.composer.renderTarget1.dispose(); POST.composer.renderTarget2.dispose(); if (POST.bloom) POST.bloom.dispose(); if (POST.motion) POST.motion.dispose(); if (POST.ssao) POST.ssao.dispose(); if (POST.team) POST.team.dispose(); }
  const opts = { type: THREE.HalfFloatType, format: THREE.RGBAFormat, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter };
  const rt = samples ? new THREE.WebGLMultisampleRenderTarget(size.x, size.y, opts) : new THREE.WebGLRenderTarget(size.x, size.y, opts);
  if (samples) rt.samples = samples;
  // the world depth stays readable for SSAO (resolved from the multisampled buffer by three's blit)
  if (renderer.capabilities.isWebGL2) { rt.depthTexture = new THREE.DepthTexture(size.x, size.y); rt.depthTexture.type = THREE.UnsignedIntType; }
  const composer = new THREE.EffectComposer(renderer, rt);
  // No pass swaps buffers, so every pass works in readBuffer: that one is the (multisampled) target the
  // composer resizes; the spare write buffer stays a plain target.
  composer.renderTarget2.dispose(); composer.renderTarget2 = new THREE.WebGLRenderTarget(size.x, size.y, opts);
  composer.readBuffer = composer.renderTarget1; composer.writeBuffer = composer.renderTarget2;
  POST.worldPass = new THREE.RenderPass(scene, camera);
  composer.addPass(POST.worldPass);
  // straight after the world: the later full-screen passes leave their own depth in the buffer
  POST.team = new TeamMaskPass();
  composer.addPass(POST.team);
  POST.ssao = new SSAOPass(size.x, size.y, aoN);
  composer.addPass(POST.ssao);
  POST.motion = new MotionFXPass(size.x, size.y, mb);
  composer.addPass(POST.motion);
  composer.addPass(new ViewmodelPass());
  POST.bloom = new THREE.UnrealBloomPass(new THREE.Vector2(Math.max(1, size.x >> 1), Math.max(1, size.y >> 1)), 0.55, 0.45, 0.92);
  composer.addPass(POST.bloom);
  POST.grade = POST.grade || new THREE.ShaderPass(GradeShader);
  POST.grade.renderToScreen = true; POST.grade.needsSwap = false;
  composer.addPass(POST.grade);
  POST.composer = composer; POST.msaa = samples; POST.mb = mb; POST.aoN = aoN;
}
setupPost();

let shadowFrame = 0;
// ladder = true when called by the adaptive ladder: only post / shadow-rate settings change, no shader rebuild
function applyQuality(ladder) {
  const q = Q();
  setupPost();
  POST.enabled = q.post;
  POST.bloom.enabled = q.bloom;
  POST.grade.uniforms.fxaa.value = q.fxaa ? 1 : 0;
  POST.sharpen = q.sharpen || 0;
  if (typeof LIGHTPOOL !== 'undefined') LIGHTPOOL.resize(q.lights);
  if (typeof NVG !== 'undefined') NVG.applyQuality();
  renderer.shadowMap.enabled = q.shadows;
  renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = true;
  if (q.shadowSize) moon.shadow.mapSize.set(q.shadowSize, q.shadowSize);
  if (moon.shadow.map) { moon.shadow.map.dispose(); moon.shadow.map = null; }
  renderer.toneMapping = POST.enabled ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping;
  if (!ladder) scene.traverse(o => { if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.needsUpdate = true); });
  if (typeof setPixelRatioCap === 'function') setPixelRatioCap();
}

function renderFrame(dt) {
  if (!window.innerWidth || !window.innerHeight) return; // minimised / zero-size window
  const U = POST.grade.uniforms;
  U.time.value = (U.time.value + dt * 60) % 1000;
  U.aspect.value = camera.aspect;
  // a light, even sharpening pass: no extra boost while dynamic resolution is below native size (the boosted
  // setting gave walls and floors a harsh, over-processed look on top of the softer upscaled image)
  U.sharpen.value = POST.sharpen;
  // weapon light follows the equipped weapon (dark places only)
  U.torch.value = damp(U.torch.value, typeof torchLevel === 'function' ? torchLevel() : 0, 10, dt);
  const q = Q();
  if (q.shadows) renderer.shadowMap.needsUpdate = (++shadowFrame % q.shadowEvery) === 0;
  if (POST.enabled) {
    POST.worldPass.camera = activeCamera;
    POST.ssao.active = !!(q.ao && S.ssao !== false && POST.composer.readBuffer.depthTexture);
    POST.ssao.strength = WORLD.indoor ? 0.62 : 0.5;
    updateMotionFX(dt);
    POST.composer.render(dt);
  } else {
    renderer.toneMappingExposure = U.exposure.value;
    renderer.autoClear = true;
    renderer.render(scene, activeCamera);
    if (weaponRig.visible && activeCamera === camera) { renderer.autoClear = false; renderer.clearDepth(); renderer.render(vmScene, vmCamera); renderer.autoClear = true; }
  }
}

// Motion FX inputs. Slow motion and the bullet cam request radial blur / afterimage through MFX every frame.
const MFX = {
  cam: null, prevQ: new THREE.Quaternion(), prevProj: new THREE.Matrix4(), q: new THREE.Quaternion(), m1: new THREE.Matrix4(), m2: new THREE.Matrix4(), v: new THREE.Vector3(),
  radial: 0, radialC: new THREE.Vector2(0.5, 0.5), ghost: 0, dof: 0, focus: 10, wave: { x: 0.5, y: 0.5, t: 9, amp: 0 }
};
// screen-space shockwave ring at a world position (precision kills, bullet cam impacts)
function shockwave(pos, amp) {
  MFX.v.copy(pos).project(activeCamera);
  if (MFX.v.z > 1) return;
  MFX.wave.x = MFX.v.x * 0.5 + 0.5; MFX.wave.y = MFX.v.y * 0.5 + 0.5; MFX.wave.t = 0; MFX.wave.amp = amp;
}
function updateMotionFX(dt) {
  const pass = POST.motion; if (!pass) return;
  const cam = activeCamera, U = pass.mat.uniforms;
  cam.updateMatrixWorld();
  cam.getWorldQuaternion(MFX.q);
  if (MFX.cam !== cam) { MFX.cam = cam; MFX.prevQ.copy(MFX.q); MFX.prevProj.copy(cam.projectionMatrix); } // camera cut: no blur spike
  // previous clip <- previous view rotation <- current view rotation <- current clip (translation ignored)
  MFX.m1.makeRotationFromQuaternion(MFX.q);
  MFX.m2.makeRotationFromQuaternion(MFX.prevQ).transpose();
  U.uReproj.value.copy(MFX.prevProj).multiply(MFX.m2).multiply(MFX.m1).multiply(cam.projectionMatrixInverse);
  const ang = 2 * Math.acos(Math.min(1, Math.abs(MFX.q.dot(MFX.prevQ))));
  const zoom = Math.abs(MFX.prevProj.elements[5] - cam.projectionMatrix.elements[5]) / cam.projectionMatrix.elements[5];
  const slow = typeof SLOWMO !== 'undefined' && SLOWMO.active ? SLOWMO.env() : 0;
  const on = !!S.motionBlur && G.playing;
  const shutter = on ? (G.cine ? 0.95 : 0.55 + slow * 0.4) : 0;
  U.uBlur.value = shutter;
  // streak length the sample count can fill smoothly (long streaks only in slow motion / kill cams)
  U.uMaxBlur.value = (G.cine || slow > 0.05 ? 0.07 : 0.0045 * pass.samples);
  const move = (ang / THREE.MathUtils.degToRad(cam.fov) + zoom) * shutter;
  let radial = MFX.radial;
  if (on && !G.cine && !G.dead) radial += player.sliding ? 0.035 : (player.sprintT > 0.25 ? 0.018 : 0);
  U.uRadial.value = radial; U.uRadialC.value.copy(MFX.radialC);
  U.uDof.value = MFX.dof; U.uFocus.value = MFX.focus;
  pass.ghost = MFX.ghost;
  const wv = MFX.wave;
  if (wv.t < 2) wv.t += dt;
  const wAmp = wv.amp * Math.max(0, 1 - wv.t / 0.75);
  U.uWave.value.set(wv.x, wv.y, wv.t * 0.85); U.uWaveAmp.value = wAmp;
  pass.active = move > 0.0012 || radial > 0.0005 || pass.ghost > 0.01 || wAmp > 0.0005 || MFX.dof > 0.01;
  MFX.prevQ.copy(MFX.q); MFX.prevProj.copy(cam.projectionMatrix);
  MFX.radial = 0; MFX.ghost = 0; MFX.dof = 0; MFX.radialC.set(0.5, 0.5);
}

// Sun / moon glare: screen position + occlusion test against level geometry (throttled)
const _sunP = new THREE.Vector3(); let _sunVisS = 0, _sunOccT = 0, _sunOcc = false;
function updateSunGlare(dt) {
  const U = POST.grade.uniforms;
  let vis = 0;
  if (WORLD.glare > 0 && POST.enabled) {
    const cam = activeCamera;
    _sunP.copy(cam.position).addScaledVector(sunDir, 1000).project(cam);
    if (_sunP.z < 1) {
      const sx = _sunP.x * 0.5 + 0.5, sy = _sunP.y * 0.5 + 0.5;
      const edge = Math.min(sx + 0.15, 1.15 - sx, sy + 0.15, 1.15 - sy);
      if (edge > 0) {
        _sunOccT -= dt;
        if (_sunOccT <= 0) { _sunOccT = 0.08; const h = rayWorld(cam.position, sunDir, 450, 'shot'); _sunOcc = !!(h && !h.collider.ground); }
        vis = _sunOcc ? 0 : clamp(edge * 4, 0, 1);
        U.sunUV.value.set(sx, sy);
      }
    }
    if (document.getElementById('scope').classList.contains('on')) vis *= 0.35;
  }
  _sunVisS = damp(_sunVisS, vis * (WORLD.glare || 0), 9, dt);
  U.sunVis.value = _sunVisS;
}

function onResize() {
  const w = window.innerWidth, h = window.innerHeight;
  if (!w || !h) return;
  for (const c of [camera, cineCamera, vmCamera]) { c.aspect = w / h; c.updateProjectionMatrix(); }
  renderer.setSize(w, h);
  POST.composer.setPixelRatio(POST.enabled ? RENDER_PR : renderer.getPixelRatio());
  POST.composer.setSize(w, h);
  const s = renderBufferSize(new THREE.Vector2()), d = renderer.getDrawingBufferSize(new THREE.Vector2());
  POST.bloom.setSize(Math.max(1, s.x >> 1), Math.max(1, s.y >> 1));
  POST.grade.uniforms.texel.value.set(1 / Math.max(1, s.x), 1 / Math.max(1, s.y));
  POST.grade.uniforms.upscale.value = d.x / Math.max(1, s.x);
}
window.addEventListener('resize', onResize);

// Environment map for reflections (re-generated per map)
const pmrem = new THREE.PMREMGenerator(renderer);
let envRT = null;
function buildEnvironment(indoor, colors) {
  const es = new THREE.Scene();
  if (indoor) {
    es.background = new THREE.Color(colors.ambient || 0x161a20);
    const pm = new THREE.MeshBasicMaterial({ color: new THREE.Color(colors.light || 0xffffff).multiplyScalar(3) });
    for (let i = 0; i < 6; i++) { const p = new THREE.Mesh(new THREE.PlaneGeometry(2, 0.4), pm); p.position.set((i % 3 - 1) * 4, 3, (i < 3 ? -1 : 1) * 3); p.lookAt(0, 0, 0); es.add(p); }
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.MeshBasicMaterial({ color: 0x0c0d0f })); floor.rotation.x = -Math.PI / 2; floor.position.y = -2; es.add(floor);
  } else {
    const sky = new THREE.Mesh(new THREE.SphereGeometry(50, 24, 12), skyMat.clone()); sky.material.uniforms = THREE.UniformsUtils.clone(skyMat.uniforms);
    sky.material.uniforms.clouds.value = 0; es.add(sky);
  }
  if (envRT) envRT.dispose();
  envRT = pmrem.fromScene(es, 0.04);
  scene.environment = S.quality === 'low' ? null : envRT.texture; // Low: no image-based reflections on the world (viewmodel keeps them)
  vmScene.environment = envRT.texture;
}
// Real reflections: the built map itself (lamps, sky, walls, water) captured by a cube camera at a probe point and
// prefiltered for image-based lighting, so wet floors, metal, glass and weapons reflect the actual place.
let _cubeRT = null, _cubeCam = null;
function captureEnvironment(at) {
  if (S.quality === 'low') return;
  if (!_cubeRT) { _cubeRT = new THREE.WebGLCubeRenderTarget(128, { type: THREE.HalfFloatType, format: THREE.RGBAFormat, generateMipmaps: false }); _cubeCam = new THREE.CubeCamera(0.2, 500, _cubeRT); }
  _cubeCam.position.copy(at);
  skyDome.position.copy(at);
  const wv = typeof weatherPts !== 'undefined' && weatherPts ? weatherPts.visible : null;
  if (wv !== null) weatherPts.visible = false;
  const prevRT = renderer.getRenderTarget(), sh = renderer.shadowMap.autoUpdate;
  _cubeCam.update(renderer, scene);
  renderer.setRenderTarget(prevRT);
  if (wv !== null) weatherPts.visible = wv;
  const rt = pmrem.fromCubemap(_cubeRT.texture);
  if (envRT) envRT.dispose();
  envRT = rt;
  scene.environment = envRT.texture; vmScene.environment = envRT.texture;
}
