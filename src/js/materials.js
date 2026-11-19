// ---------- Materials, world-UV static batching, instanced props ----------
// Texture definitions: tile = metres per texture repeat. concrete, concrete_wall, ceiling_tiles, corrugated and
// tiles are baked by tools/bake_textures.py (they used to be generated in JavaScript at every launch).
// wall: a second texture used on vertical faces (poured slab on floors and ceilings, formed concrete on walls).
const TEXDEF = {
  concrete:      { tile: 4.5, rough: 0.78, surface: 'concrete', wall: 'concrete_wall', wallTile: 2.4 },
  concrete_wall: { tile: 2.4, rough: 0.85, surface: 'concrete' },
  asphalt:       { tile: 4.0, rough: 0.95, surface: 'concrete' },
  brick:         { tile: 2.4, rough: 0.86, ns: 1.2, surface: 'concrete' },
  black_brick:   { tile: 2.4, rough: 0.82, ns: 1.3, surface: 'concrete' },
  clinker:       { tile: 2.6, rough: 0.82, ns: 1.3, surface: 'concrete' },
  adobe:         { tile: 3.2, rough: 0.95, surface: 'sand' },
  facade_desert: { tile: 4.0, rough: 0.95, surface: 'sand' },
  facade_city:   { tile: 6.0, rough: 0.9,  surface: 'concrete' },
  metal:         { tile: 2.0, rough: 0.42, metal: 0.7, ns: 1.2, surface: 'metal' },
  rock:          { tile: 4.0, rough: 0.95, surface: 'rock' },
  mountain_rock: { tile: 5.0, rough: 0.95, surface: 'rock' },
  sand:          { tile: 5.0, rough: 1.0,  surface: 'sand' },
  snow:          { tile: 5.0, rough: 0.85, ns: 1.6, surface: 'snow' },
  dirt:          { tile: 4.5, rough: 1.0,  surface: 'dirt' },
  grass:         { tile: 4.0, rough: 1.0,  surface: 'dirt' },
  gravel:        { tile: 3.0, rough: 1.0,  surface: 'dirt' },
  gravel2:       { tile: 6.4, rough: 1.0,  ns: 0.8, surface: 'dirt' },   // library gravel (mirrored 2 x 2)
  wood:          { tile: 2.0, rough: 0.85, surface: 'wood' },
  wood_floor:    { tile: 2.5, rough: 0.45, ns: 0.8, surface: 'wood' },
  plaster:       { tile: 3.0, rough: 0.95, surface: 'concrete' },
  roof:          { tile: 2.0, rough: 0.6,  ns: 1.3, surface: 'concrete' },
  cobble:        { tile: 2.4, rough: 0.8,  ns: 1.4, surface: 'concrete' },
  greenstone:    { tile: 2.6, rough: 0.78, ns: 1.3, surface: 'rock' },
  fortress:      { tile: 3.2, rough: 0.85, ns: 1.4, surface: 'rock' },
  rose_clay:     { tile: 2.0, rough: 0.9,  surface: 'concrete' },
  bark:          { tile: 1.6, rough: 1.0,  surface: 'wood' },
  leaves:        { tile: 1.5, rough: 1.0,  surface: 'wood' },
  // hangar cladding: wide profile, maps sampled one mip softer and relief faded with distance - the dense ridges
  // used to alias into moire rings across the arched roof
  corrugated:    { tile: 4.2, rough: 0.5, metal: 0.6, ns: 0.85, surface: 'metal', bias: 1.0, nfar: 0.3 },
  tiles:         { tile: 2.4, rough: 0.3, surface: 'concrete' },
  ceiling_tiles: { tile: 2.4, rough: 0.92, surface: 'concrete' }
};
const MAX_ANISO = () => renderer.capabilities.getMaxAnisotropy();
function waterNormalTex() { return ASSETS.tex.water_n; }

// ---------- surface shading layers for textured world materials ----------
// detail: grain + micro relief (baked detail map, ~0.6 m repeat) fading in within ~16 m of the camera, so walls
//         and floors stay crisp up close although their maps cover several metres
// dirt:   grime splashed up the bottom metre of every wall, crate and building (irregular, from the detail map)
// wall:   materials with a wall texture switch to it on vertical faces (world normal from the geometry)
// Normal-map code only exists after include resolution: expand the chunk so it can be edited.
function expandNormalChunk(sh) {
  if (sh.fragmentShader.indexOf('#include <normal_fragment_maps>') >= 0) sh.fragmentShader = sh.fragmentShader.replace('#include <normal_fragment_maps>', THREE.ShaderChunk.normal_fragment_maps);
}
function injectDetail(sh, scale, wall, aa = {}) {
  const detail = S.quality !== 'low' && ASSETS.tex.detail;
  expandNormalChunk(sh);
  let fs = sh.fragmentShader;
  // specular anti-aliasing: roughness also grows with the variance of the *bumped* normal across the pixel quad, so
  // fine relief seen at a distance turns into a soft sheen instead of shimmering stripes
  fs = fs.replace('#include <lights_physical_fragment>', THREE.ShaderChunk.lights_physical_fragment.replace(
    'float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );',
    'vec3 nDx = dFdx( normal ), nDy = dFdy( normal );\n float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z ) + sqrt( min( 0.5 * ( dot( nDx, nDx ) + dot( nDy, nDy ) ), 0.3 ) );'));
  if (aa.bias) {
    const b = aa.bias.toFixed(2);
    if (!wall) fs = fs.replace('#include <map_fragment>', THREE.ShaderChunk.map_fragment.replace('texture2D( map, vUv )', `texture2D( map, vUv, ${b} )`));
    fs = fs.replace('vec3 mapN = texture2D( normalMap, vUv ).xyz * 2.0 - 1.0;', `vec3 mapN = texture2D( normalMap, vUv, ${b} ).xyz * 2.0 - 1.0;`);
  }
  if (aa.nfar) fs = fs.replace('mapN.xy *= normalScale;', `mapN.xy *= normalScale;\n mapN.xy *= mix(1.0, ${aa.nfar.toFixed(2)}, smoothstep(6.0, 34.0, length(vViewPosition)));`);
  if (!detail && !wall) { sh.fragmentShader = fs; return; }
  let head = '', pre = '\n vec3 sWN = normalize((vec4(vNormal, 0.0) * viewMatrix).xyz);\n vec3 sWP = (vec4(-vViewPosition, 0.0) * viewMatrix).xyz + cameraPosition;\n float sWall = step(abs(sWN.y), 0.6);';
  if (detail) {
    sh.uniforms.dMap = { value: ASSETS.tex.detail }; sh.uniforms.dNrm = { value: ASSETS.normals.detail }; sh.uniforms.dScale = { value: scale };
    head += 'uniform sampler2D dMap, dNrm;\nuniform float dScale;\n';
    pre += '\n float dFade = 1.0 - smoothstep(3.0, 16.0, length(vViewPosition)); vec2 dUv = vUv * dScale;';
    fs = fs.replace('#include <color_fragment>', `#include <color_fragment>
      diffuseColor.rgb *= mix(1.0, 0.84 + texture2D(dMap, dUv).r * 0.32, dFade * 0.5);
      float sDirt = (1.0 - smoothstep(0.05, 1.1, sWP.y)) * sWall * (0.55 + 0.45 * texture2D(dMap, vec2((sWP.x + sWP.z) * 0.13, sWP.y * 0.2)).r);
      diffuseColor.rgb *= 1.0 - sDirt * 0.2;`)
      .replace('mapN.xy *= normalScale;', 'mapN.xy *= normalScale;\n mapN.xy += (texture2D(dNrm, dUv).xy * 2.0 - 1.0) * dFade * 0.24;');
  }
  if (wall) {
    sh.uniforms.wMap = { value: wall.map }; sh.uniforms.wNrm = { value: wall.nrm }; sh.uniforms.wScale = { value: wall.scale };
    head += 'uniform sampler2D wMap, wNrm;\nuniform float wScale;\n';
    fs = fs.replace('#include <map_fragment>', `#ifdef USE_MAP
        vec4 texelColor = mapTexelToLinear(mix(texture2D(map, vUv), texture2D(wMap, vUv * wScale), sWall));
        diffuseColor *= texelColor;
      #endif`)
      .replace('vec3 mapN = texture2D( normalMap, vUv ).xyz * 2.0 - 1.0;', 'vec3 mapN = mix(texture2D(normalMap, vUv).xyz, texture2D(wNrm, vUv * wScale).xyz, sWall) * 2.0 - 1.0;');
  }
  sh.fragmentShader = head + fs.replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>' + pre);
}
function detailKey() { return S.quality === 'low' ? '' : 'd'; }

// ---------- contact shadows (fake ambient occlusion under props): one batched mesh per map ----------
const AO_BATCH = {
  quads: [],
  reset() { this.quads.length = 0; },
  add(x, z, sx, sz, y = 0, rot = 0) { this.quads.push([x, z, sx, sz, y, rot]); },
  build() {
    if (!this.quads.length) return;
    const n = this.quads.length, pos = new Float32Array(n * 12), uv = new Float32Array(n * 8), idx = [];
    const corners = [[-0.5, -0.5, 0, 0], [0.5, -0.5, 1, 0], [0.5, 0.5, 1, 1], [-0.5, 0.5, 0, 1]];
    this.quads.forEach(([x, z, sx, sz, y, rot], q) => {
      const c = Math.cos(rot), s = Math.sin(rot);
      corners.forEach(([u, v, tu, tv], k) => { const lx = u * sx, lz = v * sz; pos.set([x + lx * c + lz * s, y + 0.012, z - lx * s + lz * c], (q * 4 + k) * 3); uv.set([tu, tv], (q * 4 + k) * 2); });
      const b = q * 4; idx.push(b, b + 2, b + 1, b, b + 3, b + 2);
    });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setIndex(idx);
    const tex = radialTex('aoBlob', 'rgba(255,255,255,0.8)', 'rgba(255,255,255,0)');
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, color: 0x000000, opacity: WORLD.indoor ? 0.8 : 0.5, fog: true }));
    m.renderOrder = 1; m.matrixAutoUpdate = false;
    scene.add(m); mapObjects.push(m);
    this.quads.length = 0;
  }
};


const MATLIB = {
  cache: {},
  // name: texture key; opts: color (tint), rough, metal, emissive, ei, wet, transparent...
  get(name, opts = {}) {
    const key = name + '|' + JSON.stringify(opts);
    if (this.cache[key]) return this.cache[key];
    const def = TEXDEF[name] || { tile: 3, rough: 0.9, surface: 'concrete' };
    const p = {
      color: opts.color !== undefined ? opts.color : 0xffffff,
      roughness: opts.rough !== undefined ? opts.rough : (opts.wet ? def.rough * 0.6 : def.rough),
      metalness: opts.metal !== undefined ? opts.metal : (def.metal || 0.02),
      envMapIntensity: opts.env !== undefined ? opts.env : (opts.wet ? 0.35 : 0.32)
    };
    const ns = (opts.ns !== undefined ? opts.ns : (def.ns || 1));
    // pool textures (RANDOM OPS) tile mirrored: seamless for any image
    if (ASSETS.tex[name]) { p.map = ASSETS.tex[name]; if (!p.map.mirrorWrap) p.map.wrapS = p.map.wrapT = THREE.RepeatWrapping; }
    if (ASSETS.normals[name]) { p.normalMap = ASSETS.normals[name]; if (!p.normalMap.mirrorWrap) p.normalMap.wrapS = p.normalMap.wrapT = THREE.RepeatWrapping; p.normalScale = new THREE.Vector2(ns, ns); }
    if (opts.emissive) { p.emissive = new THREE.Color(opts.emissive); p.emissiveIntensity = opts.ei || 1; }
    const m = new THREE.MeshStandardMaterial(p);
    m.userData.surface = opts.surface || def.surface;
    m.userData.tile = opts.tile || def.tile;
    if (p.map && p.normalMap) {
      const dScale = m.userData.tile / 0.6, wt = def.wall && ASSETS.tex[def.wall];
      const wall = wt ? { map: wt, nrm: ASSETS.normals[def.wall], scale: m.userData.tile / (def.wallTile || 2.4) } : null;
      if (wall) { wt.wrapS = wt.wrapT = THREE.RepeatWrapping; wall.nrm.wrapS = wall.nrm.wrapT = THREE.RepeatWrapping; }
      const aa = { bias: def.bias || 0, nfar: def.nfar || 0 };
      m.onBeforeCompile = (sh) => injectDetail(sh, dScale, wall, aa);
      m.customProgramCacheKey = () => 'mat' + detailKey() + (wall ? 'w' : '') + (aa.bias ? 'b' + aa.bias : '') + (aa.nfar ? 'n' + aa.nfar : '');
    }
    return (this.cache[key] = m);
  },
  // Plain colour material (no texture)
  plain(color, opts = {}) {
    const key = 'plain|' + color + '|' + JSON.stringify(opts);
    if (this.cache[key]) return this.cache[key];
    const p = { color, roughness: opts.rough ?? 0.7, metalness: opts.metal ?? 0.1, transparent: !!opts.opacity, opacity: opts.opacity ?? 1, side: opts.double ? THREE.DoubleSide : THREE.FrontSide, envMapIntensity: 0.5 };
    if (opts.emissive) { p.emissive = new THREE.Color(opts.emissive); p.emissiveIntensity = opts.ei || 1; }
    const m = new THREE.MeshStandardMaterial(p);
    m.userData.surface = opts.surface || 'metal';
    m.userData.tile = 1;
    m.userData.noWorldUV = true;
    return (this.cache[key] = m);
  },
  emissive(color, intensity = 3) {
    const key = 'emis|' + color + '|' + intensity;
    if (this.cache[key]) return this.cache[key];
    const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), toneMapped: false });
    m.userData.surface = 'glass'; m.userData.noWorldUV = true;
    return (this.cache[key] = m);
  }
};

// ---------- ground materials ----------
// World-UV floors (terrain, roads, interior slabs) get: anti-tiling (a second rotated sample blended by world noise),
// macro colour/brightness variation, patches of a second material (dirt in grass, rock through snow...),
// roughness variation and, on wet floors, local puddles that mirror the lights instead of a uniformly glossy floor.
const GROUND_DEF = {
  grass:      { vari: 0.55, mix: 'dirt', patch: 0.62, amt: 0.85, tint: [1.2, 1.08, 0.6], tintAmt: 0.6 },
  sand:       { vari: 0.35, mix: 'dirt', patch: 0.68, amt: 0.4, tint: [1.08, 0.97, 0.84], tintAmt: 0.45 },
  snow:       { vari: 0.35, mix: 'rock', patch: 0.64, amt: 0.85, tint: [0.88, 0.93, 1.06], tintAmt: 0.6 },
  dirt:       { vari: 0.45, mix: 'gravel', patch: 0.62, amt: 0.65, tint: [1.12, 1.0, 0.82], tintAmt: 0.4 },
  gravel:     { vari: 0.35, mix: 'dirt', patch: 0.62, amt: 0.55, tint: [1, 1, 1], tintAmt: 0 },
  gravel2:    { vari: 0.38, mix: 'dirt', patch: 0.68, amt: 0.35, tint: [1, 1, 1], tintAmt: 0 },
  concrete:   { vari: 0.26, tint: [0.86, 0.8, 0.72], tintAmt: 0.3 },
  asphalt:    { vari: 0.32, tint: [0.78, 0.78, 0.8], tintAmt: 0.45 },
  cobble:     { vari: 0.3, tint: [0.9, 0.96, 0.84], tintAmt: 0.4 },
  wood_floor: { vari: 0.2, tint: [0.9, 0.84, 0.78], tintAmt: 0.35 },
  default:    { vari: 0.3, tint: [1, 1, 1], tintAmt: 0 }
};
// Rectangles (x0, z0, x1, z1) where the terrain is cut away for river channels / lakes (filled per map by W.channel)
const CHANNEL_CUTS = Array.from({ length: 8 }, () => new THREE.Vector4(1e9, 1e9, -1e9, -1e9));
let CHANNEL_N = 0;
function resetChannelCuts() { for (const v of CHANNEL_CUTS) v.set(1e9, 1e9, -1e9, -1e9); CHANNEL_N = 0; }
MATLIB.ground = function (name, opts = {}) {
  const key = 'ground|' + name + '|' + S.quality + '|' + JSON.stringify(opts);
  if (this.cache[key]) return this.cache[key];
  const baseOpts = Object.assign({}, opts); delete baseOpts.wet; delete baseOpts.ground; delete baseOpts.puddles; delete baseOpts.vc;
  const base = this.get(name, baseOpts), m = base.clone();
  m.userData = Object.assign({}, base.userData);
  if (opts.vc) m.vertexColors = true;
  const gd = Object.assign({}, GROUND_DEF[name] || GROUND_DEF.default, opts.ground || {});
  const mixM = gd.mix && ASSETS.tex[gd.mix] ? this.get(gd.mix) : null;
  const wet = opts.wet ? (opts.puddles ?? 0.55) : (opts.puddles || 0);
  if (wet) m.envMapIntensity = 0.38; // the captured environment holds the real lamps: keep wet floors from glaring
  const U = {
    gNoise: { value: NOISE_TEX }, gTile: { value: m.userData.tile || 3 },
    gMap2: { value: mixM ? mixM.map : null }, gNorm2: { value: mixM ? mixM.normalMap : null }, gTile2: { value: mixM ? mixM.userData.tile : 3 },
    gPatch: { value: gd.patch || 0.7 }, gAmt: { value: mixM ? gd.amt : 0 },
    gVar: { value: gd.vari }, gTint: { value: new THREE.Vector3(...gd.tint) }, gTintAmt: { value: gd.tintAmt }, gWet: { value: wet },
    gCut: { value: CHANNEL_CUTS }
  };
  const low = S.quality === 'low';
  const defs = (mixM && !low ? '#define G_MIX\n' : '') + (mixM && mixM.normalMap && !low ? '#define G_MIXN\n' : '') + (wet ? '#define G_WET\n' : '') + (low ? '#define G_LOW\n' : '');
  const dScale = (m.userData.tile || 3) / 0.6;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    expandNormalChunk(sh);
    sh.fragmentShader = defs + 'uniform sampler2D gNoise, gMap2, gNorm2;\nuniform float gTile, gTile2, gPatch, gAmt, gVar, gTintAmt, gWet;\nuniform vec3 gTint;\nuniform vec4 gCut[8];\n' + sh.fragmentShader
      .replace('#include <map_fragment>', `
        vec2 gWp = vUv * gTile;
        // river channels and lakes are dug into the terrain: their banks and bed are separate meshes
        for (int i = 0; i < 8; i++) { vec4 c = gCut[i]; if (gWp.x > c.x && gWp.x < c.z && gWp.y > c.y && gWp.y < c.w) discard; }
        float gM1 = texture2D(gNoise, gWp * 0.019).r, gM2 = texture2D(gNoise, gWp * 0.067 + 0.31).g, gM3 = texture2D(gNoise, gWp * 0.23 + 0.77).r;
        vec2 gUv2 = mat2(0.8, -0.6, 0.6, 0.8) * vUv * 0.73 + vec2(0.37, 0.11);
        float gBt = smoothstep(0.42, 0.58, gM2 * 0.7 + gM3 * 0.3), gPm = 0.0, gPud = 0.0;
        #ifdef USE_MAP
          #ifdef G_LOW
            vec4 texelColor = mapTexelToLinear(texture2D(map, vUv));
          #else
            vec4 texelColor = mapTexelToLinear(mix(texture2D(map, vUv), texture2D(map, gUv2), gBt));
          #endif
          #ifdef G_MIX
            gPm = smoothstep(gPatch - 0.05, gPatch + 0.05, gM1 * 0.55 + gM2 * 0.3 + gM3 * 0.15) * gAmt;
            texelColor = mix(texelColor, mapTexelToLinear(texture2D(gMap2, gWp / gTile2)), gPm);
          #endif
          texelColor.rgb *= 1.0 + ((gM1 - 0.5) * 0.6 + (gM2 - 0.5) * 0.4 + (gM3 - 0.5) * 0.25) * gVar;
          texelColor.rgb = mix(texelColor.rgb, texelColor.rgb * gTint, smoothstep(0.4, 0.72, gM2) * gTintAmt);
          #ifdef G_WET
            gPud = smoothstep(0.69 - gWet * 0.12, 0.72 - gWet * 0.12, gM2 * 0.6 + gM1 * 0.4) * 0.9;
            texelColor.rgb *= mix(1.0, 0.55, gPud);
          #endif
          diffuseColor *= texelColor;
        #endif`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = clamp(roughnessFactor * (1.0 + (gM3 - 0.5) * 0.3), 0.04, 1.0);
        #ifdef G_WET
          roughnessFactor = mix(roughnessFactor, 0.14, gPud);
        #endif`)
      .replace('vec3 mapN = texture2D( normalMap, vUv ).xyz * 2.0 - 1.0;', `
        #ifdef G_LOW
          vec3 mapN = texture2D(normalMap, vUv).xyz * 2.0 - 1.0;
        #else
          vec3 mapN = mix(texture2D(normalMap, vUv).xyz, texture2D(normalMap, gUv2).xyz, gBt) * 2.0 - 1.0;
        #endif
        #ifdef G_MIXN
          mapN = mix(mapN, texture2D(gNorm2, gWp / gTile2).xyz * 2.0 - 1.0, gPm);
        #endif
        #ifdef G_WET
          mapN.xy *= 1.0 - gPud * 0.9;
        #endif`);
    injectDetail(sh, dScale);
  };
  m.customProgramCacheKey = () => 'ground' + defs + detailKey();
  return (this.cache[key] = m);
};

// ---------- static geometry batcher ----------
const STATIC = {
  chunks: new Map(), CH: 32,
  reset() { this.chunks.clear(); },
  // geo: geometry in local space; matrix: local->world. UVs are re-projected in world space (tri-planar per face).
  add(geo, mat, matrix, opts = {}) {
    let g = geo.index ? geo.toNonIndexed() : geo.clone();
    g.applyMatrix4(matrix);
    if (!mat.userData.noWorldUV && !opts.keepUV) worldUV(g, mat.userData.tile || 3, opts.uvRot);
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') g.deleteAttribute(k);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    g.computeBoundingBox();
    const c = g.boundingBox.getCenter(_mV1);
    const key = mat.uuid + '|' + (opts.noShadow ? 'n' : 's') + '|' + Math.floor(c.x / this.CH) + ',' + Math.floor(c.z / this.CH);
    let ch = this.chunks.get(key);
    if (!ch) { ch = { mat, geos: [], noShadow: !!opts.noShadow }; this.chunks.set(key, ch); }
    ch.geos.push(g);
  },
  build() {
    for (const ch of this.chunks.values()) {
      let merged = THREE.BufferGeometryUtils.mergeBufferGeometries(ch.geos, false);
      if (!merged) continue;
      const welded = fastWeld(merged);
      if (welded.attributes.position.count < merged.attributes.position.count * 0.85) { merged.dispose(); merged = welded; }
      const mesh = new THREE.Mesh(merged, ch.mat);
      mesh.castShadow = !ch.noShadow; mesh.receiveShadow = true;
      mesh.matrixAutoUpdate = false;
      scene.add(mesh); mapObjects.push(mesh);
      for (const g of ch.geos) g.dispose();
    }
    this.chunks.clear();
  }
};
const _mV1 = new THREE.Vector3(), _mV2 = new THREE.Vector3(), _mM = new THREE.Matrix4(), _mQ = new THREE.Quaternion(), _mS = new THREE.Vector3();
// Weld identical vertices (position / normal / uv quantised) with numeric hashing: ~15x faster than
// BufferGeometryUtils.mergeVertices on the expanded maps (about a million triangle corners per map).
function fastWeld(g) {
  const P = g.attributes.position.array, N = g.attributes.normal.array, U = g.attributes.uv.array, n = P.length / 3;
  const head = new Map(), next = new Int32Array(n), K = new Int32Array(n * 8), src = new Int32Array(n), index = new Uint32Array(n);
  let m = 0;
  for (let i = 0; i < n; i++) {
    const i3 = i * 3, i2 = i * 2;
    const k0 = Math.round(P[i3] * 1e4), k1 = Math.round(P[i3 + 1] * 1e4), k2 = Math.round(P[i3 + 2] * 1e4);
    const k3 = Math.round(N[i3] * 1e3), k4 = Math.round(N[i3 + 1] * 1e3), k5 = Math.round(N[i3 + 2] * 1e3);
    const k6 = Math.round(U[i2] * 1e4), k7 = Math.round(U[i2 + 1] * 1e4);
    const h = Math.imul(k0, 73856093) ^ Math.imul(k1, 19349663) ^ Math.imul(k2, 83492791) ^ Math.imul(k3, 1640531513) ^ Math.imul(k4, 40503) ^ Math.imul(k5, 2246822519) ^ Math.imul(k6, 1131376761) ^ Math.imul(k7, 668265263);
    let j = head.has(h) ? head.get(h) : -1, found = -1;
    while (j >= 0) { const b = j * 8; if (K[b] === k0 && K[b + 1] === k1 && K[b + 2] === k2 && K[b + 3] === k3 && K[b + 4] === k4 && K[b + 5] === k5 && K[b + 6] === k6 && K[b + 7] === k7) { found = j; break; } j = next[j]; }
    if (found >= 0) { index[i] = found; continue; }
    const b = m * 8; K[b] = k0; K[b + 1] = k1; K[b + 2] = k2; K[b + 3] = k3; K[b + 4] = k4; K[b + 5] = k5; K[b + 6] = k6; K[b + 7] = k7;
    next[m] = head.has(h) ? head.get(h) : -1; head.set(h, m); src[m] = i; index[i] = m; m++;
  }
  const out = new THREE.BufferGeometry(), op = new Float32Array(m * 3), on = new Float32Array(m * 3), ou = new Float32Array(m * 2);
  for (let k = 0; k < m; k++) { const i = src[k]; op.set(P.subarray(i * 3, i * 3 + 3), k * 3); on.set(N.subarray(i * 3, i * 3 + 3), k * 3); ou.set(U.subarray(i * 2, i * 2 + 2), k * 2); }
  out.setAttribute('position', new THREE.BufferAttribute(op, 3)); out.setAttribute('normal', new THREE.BufferAttribute(on, 3)); out.setAttribute('uv', new THREE.BufferAttribute(ou, 2));
  out.setIndex(new THREE.BufferAttribute(m > 65535 ? index : new Uint16Array(index), 1));
  return out;
}

function worldUV(g, tile, rot) {
  const p = g.attributes.position, n = g.attributes.normal;
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const nx = Math.abs(n.getX(i)), ny = Math.abs(n.getY(i)), nz = Math.abs(n.getZ(i));
    let u, v;
    if (ny >= nx && ny >= nz) { u = p.getX(i); v = p.getZ(i); }
    else if (nx >= nz) { u = p.getZ(i); v = p.getY(i); }
    else { u = p.getX(i); v = p.getY(i); }
    if (rot) { const t = u; u = v; v = t; }
    uv[i * 2] = u / tile; uv[i * 2 + 1] = v / tile;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

// ---------- instanced GLB props ----------
const INSTANCER = {
  groups: new Map(),
  reset() { this.groups.clear(); },
  // Queue an instance of prop `name` with world matrix
  add(name, matrix) {
    let g = this.groups.get(name);
    if (!g) { g = []; this.groups.set(name, g); }
    g.push(matrix.clone());
  },
  // One InstancedMesh per prop part per 40 m cell, each with its own bounding sphere: off-screen props are culled
  // in the main and the shadow pass (the expanded maps hold thousands of props). The cell meshes share the model's
  // vertex buffers (same BufferAttribute objects), only the bounds differ.
  build() {
    const CH = 40, _p = new THREE.Vector3(), _s = new THREE.Vector3(), _q = new THREE.Quaternion();
    for (const [name, mats] of this.groups) {
      const m = ASSETS.models[name];
      if (!m) continue;
      m.scene.updateMatrixWorld(true);
      const cells = new Map();
      for (const mt of mats) { _p.setFromMatrixPosition(mt); const k = Math.floor(_p.x / CH) + ',' + Math.floor(_p.z / CH); let c = cells.get(k); if (!c) cells.set(k, c = []); c.push(mt); }
      m.scene.traverse(o => {
        if (!o.isMesh) return;
        if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
        const r0 = o.geometry.boundingSphere.radius;
        for (const list of cells.values()) {
          const g = new THREE.BufferGeometry();
          for (const an in o.geometry.attributes) g.setAttribute(an, o.geometry.attributes[an]);
          if (o.geometry.index) g.setIndex(o.geometry.index);
          for (const gr of o.geometry.groups) g.addGroup(gr.start, gr.count, gr.materialIndex);
          const im = new THREE.InstancedMesh(g, o.material, list.length);
          const ctr = new THREE.Vector3(); let rad = 0;
          for (let i = 0; i < list.length; i++) { _mM.multiplyMatrices(list[i], o.matrixWorld); im.setMatrixAt(i, _mM); ctr.add(_p.setFromMatrixPosition(_mM)); }
          ctr.multiplyScalar(1 / list.length);
          for (let i = 0; i < list.length; i++) { _mM.multiplyMatrices(list[i], o.matrixWorld); _mM.decompose(_p, _q, _s); rad = Math.max(rad, _p.distanceTo(ctr) + r0 * Math.max(_s.x, _s.y, _s.z)); }
          g.boundingSphere = new THREE.Sphere(ctr, rad + 0.5);
          im.instanceMatrix.needsUpdate = true;
          im.castShadow = true; im.receiveShadow = true;
          im.userData.prop = name;
          scene.add(im); mapObjects.push(im);
        }
      });
    }
    this.groups.clear();
  }
};

// ---------- procedural canvas textures ----------
const PTEX = {};
function canvasTex(key, w, h, draw, opts = {}) {
  if (PTEX[key]) return PTEX[key];
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.encoding = opts.linear ? THREE.LinearEncoding : THREE.sRGBEncoding;
  if (opts.repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return (PTEX[key] = t);
}
function radialTex(key, inner, outer) {
  return canvasTex(key, 128, 128, (x, w) => {
    const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, inner); g.addColorStop(1, outer);
    x.fillStyle = g; x.fillRect(0, 0, w, w);
  });
}
function bulletHoleTex() {
  return canvasTex('bullethole', 64, 64, (x) => {
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.18, 'rgba(10,10,10,0.95)'); g.addColorStop(0.32, 'rgba(40,36,32,0.55)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    x.strokeStyle = 'rgba(0,0,0,0.5)'; x.lineWidth = 1;
    for (let i = 0; i < 7; i++) { const a = Math.random() * 6.28; x.beginPath(); x.moveTo(32, 32); x.lineTo(32 + Math.cos(a) * rand(10, 22), 32 + Math.sin(a) * rand(10, 22)); x.stroke(); }
  });
}
function bloodDecalTex() {
  return canvasTex('blooddecal', 128, 128, (x) => {
    for (let i = 0; i < 14; i++) {
      const r = rand(6, 26), cx = 64 + rand(-28, 28), cy = 64 + rand(-28, 28);
      const g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, 'rgba(90,0,0,0.9)'); g.addColorStop(1, 'rgba(60,0,0,0)');
      x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r, 0, 6.28); x.fill();
    }
  });
}
function windowTex(key, lit, rng) {
  return canvasTex(key, 128, 128, (x) => {
    x.fillStyle = lit ? '#ffcf7a' : '#1a1e24'; x.fillRect(0, 0, 128, 128);
    if (lit) { const g = x.createRadialGradient(64, 70, 10, 64, 64, 90); g.addColorStop(0, '#fff1c8'); g.addColorStop(1, '#c47a2a'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); }
    x.fillStyle = '#2a2018'; x.fillRect(60, 0, 8, 128); x.fillRect(0, 60, 128, 8);
    x.strokeStyle = '#2a2018'; x.lineWidth = 10; x.strokeRect(0, 0, 128, 128);
  });
}
