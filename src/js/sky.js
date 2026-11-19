// ---------- Sky: atmosphere gradient, sun with haze, textured moon, stars + Milky Way, two cloud layers ----------
// One full-screen-ish dome shader. Clouds are a curved layer lit from the sun/moon (self-shadowing toward the
// light, silver lining, darker bases); stars use direction-space cells so they don't stretch near the horizon.

// tileable smooth noise (R: base, G: offset copy) used for clouds, moon maria and the Milky Way
function skyNoiseTex() {
  const N = 256, CELLS = 8, data = new Uint8Array(N * N * 4), rng = mulberry32(911);
  const layer = (cells, seed) => {
    const g = [], r = mulberry32(seed);
    for (let i = 0; i < cells * cells; i++) { const a = r() * Math.PI * 2; g.push([Math.cos(a), Math.sin(a)]); }
    const grad = (ix, iy) => g[((iy % cells + cells) % cells) * cells + ((ix % cells + cells) % cells)];
    const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
    return (x, y) => {
      const fx = x / N * cells, fy = y / N * cells, ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy;
      const d = (gx, gy, dx, dy) => { const v = grad(gx, gy); return v[0] * dx + v[1] * dy; };
      const a = d(ix, iy, tx, ty), b = d(ix + 1, iy, tx - 1, ty), c = d(ix, iy + 1, tx, ty - 1), e = d(ix + 1, iy + 1, tx - 1, ty - 1);
      const u = fade(tx), v = fade(ty);
      return (a + (b - a) * u) * (1 - v) + (c + (e - c) * u) * v;
    };
  };
  const p1 = layer(CELLS, 17), p2 = layer(CELLS * 2, 29), p3 = layer(CELLS, 43), p4 = layer(CELLS * 4, 61);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const o = (y * N + x) * 4;
    data[o] = clamp(128 + (p1(x, y) * 0.75 + p2(x, y) * 0.25) * 180, 0, 255);
    data[o + 1] = clamp(128 + (p3(x, y) * 0.7 + p4(x, y) * 0.3) * 180, 0, 255);
    data[o + 2] = rng() * 255; data[o + 3] = 255;
  }
  const t = new THREE.DataTexture(data, N, N, THREE.RGBAFormat);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true; t.needsUpdate = true;
  return t;
}

const SkyShader = {
  uniforms: {
    zenith: { value: new THREE.Color(0x3a6bb0) }, horizon: { value: new THREE.Color(0xbcd4ec) }, ground: { value: new THREE.Color(0x4a4438) },
    haze: { value: new THREE.Color(0xbcd4ec) }, hazeK: { value: 0.5 },
    sunDir: { value: new THREE.Vector3(0, 0.3, -1) }, sunColor: { value: new THREE.Color(0xfff2d0) }, sunSize: { value: 0.99965 },
    glow: { value: 0.6 }, clouds: { value: 0.5 }, cloudColor: { value: new THREE.Color(0xffffff) }, stars: { value: 0 }, time: { value: 0 }, moon: { value: 0 },
    noise: { value: null }
  },
  vertexShader: 'varying vec3 vDir; void main(){ vDir = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position = p.xyww; }',
  fragmentShader: `
    uniform vec3 zenith, horizon, ground, haze, sunDir, sunColor, cloudColor;
    uniform float hazeK, sunSize, glow, clouds, stars, time, moon;
    uniform sampler2D noise; varying vec3 vDir;
    float nz(vec2 p){ return texture2D(noise, p).r; }
    float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++){ v += a * nz(p); p = p * 2.03 + vec2(0.17, 0.41); a *= 0.5; } return v * 1.07; }
    float fbm3(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 3; i++){ v += a * nz(p); p = p * 2.03 + vec2(0.17, 0.41); a *= 0.5; } return v * 1.14; }
    float fbm2(vec2 p){ return (nz(p) * 0.5 + nz(p * 2.03 + vec2(0.17, 0.41)) * 0.25) * 1.33; }
    float hg(float mu, float g){ float g2 = g * g; return (1.0 - g2) / (12.566 * pow(1.0 + g2 - 2.0 * g * mu, 1.5)); }
    float h31(vec3 p){ p = fract(p * vec3(0.1031, 0.1030, 0.0973)); p += dot(p, p.yxz + 33.33); return fract((p.x + p.y) * p.z); }
    void main(){
      vec3 d = normalize(vDir); float h = d.y;
      vec3 L = normalize(sunDir); float mu = dot(d, L);
      float night = step(0.5, moon);
      // atmosphere: exponential horizon falloff, Mie haze around the sun, slightly deeper blue opposite to it
      // three stops: deep zenith -> light, desaturated mid sky -> horizon band (avoids purple blue/orange mixes)
      float t = exp(-max(h, 0.0) * 3.2);
      vec3 midC = mix(zenith * 2.2, vec3(dot(horizon, vec3(0.3, 0.59, 0.11))), 0.55);
      vec3 col = mix(zenith, midC, exp(-max(h, 0.0) * 2.2));
      col = mix(col, horizon, exp(-max(h, 0.0) * 8.0));
      col *= 1.0 - 0.1 * max(-mu, 0.0) * (1.0 - t);
      float sunH = clamp(L.y * 3.0, 0.0, 1.0);
      col += sunColor * glow * (hg(mu, 0.76) * 0.18 + pow(max(mu, 0.0), 6.0) * 0.22 * (1.0 - night * 0.7)) * (0.55 + 0.45 * t);
      col += sunColor * glow * 0.12 * (1.0 - sunH) * exp(-abs(h) * 9.0) * (0.6 + 0.4 * max(mu, 0.0)) * (1.0 - night); // low sun: warm horizon band
      // below the horizon there is only fogged terrain: use the fog colour itself
      if (h < 0.0) col = haze * (1.0 - 0.25 * smoothstep(0.0, 0.3, -h));
      // stars + Milky Way (night only), hidden by clouds later
      vec3 starCol = vec3(0.0);
      if (stars > 0.0 && h > -0.02) {
        vec3 sd = d * 110.0; vec3 cell = floor(sd); float r1 = h31(cell);
        float dens = 0.965;
        vec3 mwN = normalize(vec3(0.35, 0.62, 0.7)); float band = exp(-pow(dot(d, mwN) / 0.2, 2.0));
        dens -= band * 0.025;
        if (r1 > dens) {
          vec3 sp = cell + 0.5 + (vec3(h31(cell + 3.1), h31(cell + 7.7), h31(cell + 11.3)) - 0.5) * 0.6;
          float dist = length(sd - sp);
          float mag = pow(h31(cell + 19.1), 5.0) * 4.0 + 0.35;
          float tw = 0.75 + 0.25 * sin(time * (2.0 + r1 * 5.0) + r1 * 80.0);
          starCol = mix(vec3(0.72, 0.82, 1.0), vec3(1.0, 0.86, 0.66), h31(cell + 23.0)) * smoothstep(0.2, 0.0, dist) * mag * tw;
        }
        vec2 mwUV = vec2(atan(d.x, d.z) * 0.6, dot(d, mwN) * 2.0);
        float mw = band > 0.02 ? band * smoothstep(0.4, 0.78, fbm2(mwUV * 1.2 + 3.0)) : 0.0;
        starCol += vec3(0.5, 0.56, 0.72) * mw * 0.035;
        starCol *= stars * smoothstep(-0.02, 0.18, h);
      }
      col += starCol;
      // sun disc (limb darkened, HDR) or moon (lit sphere with maria, earthshine and a soft halo)
      float rad = sqrt(max(1.0 - sunSize * sunSize, 1e-7));
      if (night < 0.5) {
        float r = (1.0 - mu) / (1.0 - sunSize);
        float disc = smoothstep(1.0, 0.82, r);
        float limb = 0.55 + 0.45 * sqrt(max(0.0, 1.0 - min(r, 1.0)));
        col = mix(col, sunColor * 14.0 * limb, disc);
      } else {
        vec3 rt = normalize(cross(L, vec3(0.0, 1.0, 0.0))); vec3 up = cross(rt, L);
        vec2 q = vec2(dot(d, rt), dot(d, up)) / rad;
        float r2 = dot(q, q);
        col += sunColor * (hg(mu, 0.985) * 0.0045 + pow(max(mu, 0.0), 60.0) * 0.08);
        if (r2 < 1.0 && mu > 0.0) {
          vec3 n = vec3(q, sqrt(1.0 - r2));
          float lit = max(dot(n, normalize(vec3(-0.55, 0.25, 0.8))), 0.0);
          float maria = 0.62 + 0.38 * smoothstep(0.35, 0.75, nz(q * 0.22 + vec2(0.31, 0.67)));
          float crater = 1.0 - 0.18 * smoothstep(0.62, 0.8, nz(q * 0.9 + vec2(0.11, 0.23)));
          float edge = smoothstep(1.0, 0.92, r2);
          vec3 mc = vec3(1.0, 0.97, 0.9) * maria * crater * (lit * 2.6 + 0.05);
          col = mix(col, mc, edge);
        }
      }
      // clouds: curved layer, cumulus (fbm, coverage threshold) + high cirrus streaks
      if (h > -0.02 && clouds > 0.0) {
        float Rp = 18.0;
        float tc = sqrt(Rp * Rp * h * h + 2.0 * Rp + 1.0) - Rp * h;
        vec2 uv = d.xz * tc * 0.16 + vec2(time * 0.0016, time * 0.0007);
        vec2 cuvB = uv * 1.35 + (texture2D(noise, uv * 0.7 + 3.7).rg - 0.5) * 0.12;
        float base = fbm(cuvB) - 0.12 * fbm3(cuvB * 4.1 + 1.7);
        float thr = mix(0.6, 0.34, clamp(clouds, 0.0, 1.0));
        float den = smoothstep(thr, thr + 0.16, base);
        float toL = fbm2(cuvB + L.xz * 0.08);
        float shade = clamp((toL - base) * 4.0 + 0.5, 0.0, 1.0);
        float thick = smoothstep(thr, thr + 0.32, base);
        vec3 amb = mix(zenith, horizon, 0.5) * (night > 0.5 ? 1.2 : 0.9) + vec3(0.06);
        vec3 lightC = sunColor * (night > 0.5 ? 0.35 : 1.25) * cloudColor;
        vec3 cc = mix(lightC * 1.05 + amb * 0.35, amb * mix(0.85, 0.45, thick), shade * 0.85);
        cc += sunColor * cloudColor * hg(mu, 0.55) * (1.0 - thick) * 1.6 * (night > 0.5 ? 0.25 : 1.0); // silver lining
        float fade = smoothstep(-0.02, 0.1, h);
        cc = mix(cc, mix(horizon, haze, 0.5), (1.0 - fade * 0.85) * 0.6);
        float a = den * fade * (night > 0.5 ? 0.8 : 1.0);
        vec2 cuv = (d.xz * tc * 0.05 + vec2(time * 0.0009, 0.0)) * mat2(0.8, 0.6, -0.6, 0.8);
        float ci = smoothstep(0.6, 0.85, fbm2(vec2(cuv.x * 0.6, cuv.y * 4.0) + 2.0)) * (0.3 - 0.2 * clouds) * fade * smoothstep(0.35, 0.6, nz(cuv * 0.3));
        col = mix(col, lightC * 0.9 + amb * 0.25, ci * (1.0 - a) * 0.5);
        col = mix(col, cc, a * 0.97);
      }
      // aerial haze: the sky reaches exactly the fog colour at the horizon, so fogged terrain, the distant
      // mountains and the sky meet without a seam
      col = mix(col, haze, clamp(hazeK + (1.0 - hazeK) * exp(-abs(h) * 70.0), 0.0, 1.0) * exp(-abs(h) * 13.0));
      gl_FragColor = vec4(col, 1.0);
      #include <tonemapping_fragment>
      #include <encodings_fragment>
    }`
};
// shared with the ground materials (macro variation, anti-tiling, puddles)
const NOISE_TEX = skyNoiseTex();
SkyShader.uniforms.noise.value = NOISE_TEX;
const skyMat = new THREE.ShaderMaterial({ uniforms: SkyShader.uniforms, vertexShader: SkyShader.vertexShader, fragmentShader: SkyShader.fragmentShader, side: THREE.BackSide, depthWrite: false, fog: false });
const skyDome = new THREE.Mesh(new THREE.SphereGeometry(800, 48, 24), skyMat);
// drawn after the opaque world (depth = far plane, depth test on): only pixels where sky is visible are shaded
skyDome.renderOrder = 100; skyDome.frustumCulled = false;
scene.add(skyDome);

// per frame: follow the camera, drift clouds, twinkle stars
function updateSky(dt) {
  skyDome.position.copy(activeCamera.position);
  skyMat.uniforms.time.value = (skyMat.uniforms.time.value + dt) % 100000;
}

// map environment -> sky uniforms
function applySky(env) {
  const U = skyMat.uniforms, sky = env.sky || {};
  // gradient colours are authored in sRGB; the shader works in linear light
  U.zenith.value.set(sky.zenith ?? 0x3a6bb0).convertSRGBToLinear(); U.horizon.value.set(sky.horizon ?? 0xbcd4ec).convertSRGBToLinear(); U.ground.value.set(sky.ground ?? 0x4a4438).convertSRGBToLinear();
  U.sunColor.value.set(sky.sunColor ?? 0xfff2d0); U.glow.value = sky.glow ?? 0.6; U.clouds.value = sky.clouds ?? 0.4;
  U.cloudColor.value.set(sky.cloudColor ?? 0xffffff); U.stars.value = sky.stars || 0; U.moon.value = sky.moon ? 1 : 0;
  U.sunSize.value = sky.moon ? 0.99955 : 0.99985;
  U.haze.value.set(env.fog ? env.fog.color : (sky.horizon ?? 0xbcd4ec)); U.hazeK.value = sky.haze ?? (env.indoor ? 0.3 : 0.55);
  U.sunDir.value.copy(sunDir);
}
