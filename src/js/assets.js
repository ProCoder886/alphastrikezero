// ---------- Asset manager ----------
// In the single-file release build every asset is embedded in window.ASSET_DATA (binary, data URI)
// or window.ASSET_JSON (parsed JSON). In the dev build they are fetched from src/.
function assetURL(p) { return (window.ASSET_DATA && window.ASSET_DATA[p]) || ('src/' + encodeURI(p)); }

const TEXTURE_NAMES = ['adobe', 'asphalt', 'brick', 'dirt', 'facade_city', 'facade_desert', 'metal', 'rock', 'sand', 'snow', 'wood',
  'bark', 'black_brick', 'clinker', 'cobble', 'fortress', 'grass', 'gravel', 'gravel2', 'greenstone', 'leaves', 'mountain_rock', 'plaster', 'roof', 'rose_clay', 'wood_floor',
  'concrete', 'concrete_wall', 'ceiling_tiles', 'corrugated', 'tiles', 'detail']; // last six: tools/bake_textures.py
const NORMAL_MAPS = TEXTURE_NAMES.slice(); // every texture ships with a normal map
const PROP_NAMES = ['barrel_red', 'barrel_rust', 'barrier', 'bus_wreck', 'cabin', 'car_wreck', 'crate', 'generator', 'palm', 'pine_snow', 'radar', 'rubble',
  'sandbags', 'technical', 'tent', 'tnt_barrel', 'watchtower', 'water_tank'];
// Third-person weapons of the AI soldiers. The player's weapons are built in code (gunsmith.js); the old first-person
// models (rifle_viper / phantom / titan, pistol, shotgun, legacy_mp5 / deagle / woodpecker) are no longer loaded.
const WEAPON_MODELS = ['enemy_ak', 'rifle_talon'];

const ASSETS = {
  models: {}, tex: {}, normals: {}, fx: {}, sky: {}, json: {}, clips: {}, clipSpeed: {}, uniforms: {},
  loaded: 0, total: 0, done: false,

  _tick() {
    this.loaded++;
    const pct = Math.min(100, this.loaded / Math.max(1, this.total) * 100);
    const bar = document.getElementById('loadBar'); if (bar) bar.style.width = pct + '%';
    const t = document.getElementById('loadText'); if (t) t.textContent = 'LOADING ASSETS ' + Math.round(pct) + '%';
  },

  async init() {
    const gltf = new THREE.GLTFLoader();
    if (window.MeshoptDecoder) gltf.setMeshoptDecoder(MeshoptDecoder);
    // The legacy FBX guns reference texture files that were never shipped: answer those with a blank image
    const BLANK = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
    const fbxManager = new THREE.LoadingManager();
    fbxManager.setURLModifier(u => u.startsWith('missing-tex/') ? BLANK : u);
    const fbx = new THREE.FBXLoader(fbxManager), obj = new THREE.OBJLoader(), tl = new THREE.TextureLoader();
    fbx.setResourcePath('missing-tex/');
    const jobs = [];
    const job = (fn) => { this.total++; jobs.push(fn().catch(e => console.warn('asset failed', e)).finally(() => this._tick())); };

    const loadGLTF = (key, path) => job(() => new Promise((res, rej) => gltf.load(assetURL(path), g => { this._register(key, g.scene, g.animations); res(); }, undefined, rej)));
    loadGLTF('soldier', 'assets/characters/soldier.glb');
    for (const n of WEAPON_MODELS) loadGLTF(n, 'assets/weapons/' + n + '.glb');
    for (const n of PROP_NAMES) loadGLTF(n, 'assets/props/' + n + '.glb');

    // AI shotgun (its textures were never shipped, so it gets a PBR material here)
    job(() => new Promise((res, rej) => fbx.load(assetURL('assets/weapons/legacy_m590.fbx'), o => { this._register('m590', o, [], 'gunmetal'); res(); }, undefined, rej)));

    const loadTex = (store, key, path, srgb = true) => job(() => new Promise((res, rej) => tl.load(assetURL(path), t => {
      t.encoding = srgb ? THREE.sRGBEncoding : THREE.LinearEncoding;
      t.anisotropy = renderer.capabilities.getMaxAnisotropy();
      store[key] = t; res();
    }, undefined, rej)));
    for (const n of TEXTURE_NAMES) loadTex(this.tex, n, 'assets/textures/' + n + '.jpg');
    for (const n of NORMAL_MAPS) loadTex(this.normals, n, 'assets/textures/' + n + '_n.jpg', false);
    for (const n of ['blood', 'dust', 'explosion', 'glint', 'muzzle', 'smoke']) loadTex(this.fx, n, 'assets/fx/' + n + '.png');
    for (const n of ['pano_desert', 'pano_snow']) loadTex(this.sky, n, 'assets/sky/' + n + '.webp'); // sky cut out, alpha = mountains
    loadTex(this.tex, 'water_n', 'assets/textures/water_n.png', false);
    for (const n of ['tuft_green', 'tuft_dry', 'pine_branch', 'leaf_cluster']) loadTex(this.tex, n, 'assets/textures/' + n + '.png');
    // unit uniforms (fabric is decoded to linear in the shader) and the cloth masks of the soldier model
    for (const n of UNIFORM_KEYS) loadTex(this.uniforms, n, 'assets/uniforms/' + n + '.jpg', false);
    for (const n of ['body', 'legs', 'helmet']) loadTex(this.tex, 'soldier_mask_' + n, 'assets/characters/soldier_mask_' + n + '.jpg', false);

    const loadJSON = (key, path) => job(async () => {
      let d = window.ASSET_JSON && window.ASSET_JSON[path];
      if (!d) d = await (await fetch('src/' + path)).json();
      this.json[key] = d;
    });
    loadJSON('audio', 'assets/audio/audio_pack.json');
    loadJSON('anims', 'assets/anims/soldier_anims.json');

    await Promise.all(jobs);
    if (this.json.audio) AudioSys.addPack(this.json.audio);
    this._buildClips();
    this.done = true;
  },

  _register(key, root, animations, overrideMat) {
    root.updateMatrixWorld(true);
    root.traverse(o => {
      if (!o.isMesh) return;
      // weld non-indexed meshes: shared vertices are transformed / skinned once instead of once per triangle corner
      if (!o.geometry.index && o.geometry.groups.length <= 1) { const w = THREE.BufferGeometryUtils.mergeVertices(o.geometry, 1e-5); if (w.attributes.position.count < o.geometry.attributes.position.count * 0.8) { o.geometry.dispose(); o.geometry = w; } }
      o.castShadow = true; o.receiveShadow = true;
      if (overrideMat) o.material = Array.isArray(o.material) ? o.material.map(() => gunMaterial(overrideMat)) : gunMaterial(overrideMat);
      else {
        const ms = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of ms) { if (m.map) m.map.anisotropy = renderer.capabilities.getMaxAnisotropy(); if (m.envMapIntensity !== undefined) m.envMapIntensity = 0.7; }
      }
    });
    const box = new THREE.Box3().setFromObject(root);
    this.models[key] = { scene: root, animations: animations || [], box, size: box.getSize(new THREE.Vector3()), center: box.getCenter(new THREE.Vector3()) };
  },

  // soldier_anims.json -> THREE.AnimationClip per name (Mixamo bone names). Mixamo clips + the NVIDIA Kimodo walk.
  _buildClips() {
    const data = this.json.anims;
    if (!data) return;
    for (const name in data) {
      const c = data[name], tracks = [];
      for (const tr of c.tr) {
        const bone = 'mixamorig' + tr.b;
        if (tr.p === 'q') tracks.push(new THREE.QuaternionKeyframeTrack(bone + '.quaternion', tr.t, tr.v));
        else tracks.push(new THREE.VectorKeyframeTrack(bone + '.position', tr.t, tr.v));
      }
      this.clips[name] = new THREE.AnimationClip(name, c.d, tracks);
      if (c.spd) this.clipSpeed[name] = c.spd; // natural ground speed (m/s): animation time scale = move speed / spd
    }
  },

  // Clone of a prop scaled so its largest dimension (or a given axis) matches `size` metres, base on y=0, centred.
  prop(name, size, axis) {
    const m = this.models[name];
    if (!m) return null;
    const ref = axis === 'h' ? m.size.y : axis === 'w' ? Math.max(m.size.x, m.size.z) : Math.max(m.size.x, m.size.y, m.size.z);
    const k = size / (ref || 1);
    const inner = m.scene.clone(true);
    inner.position.set(-m.center.x * k, -m.box.min.y * k, -m.center.z * k);
    inner.scale.multiplyScalar(k);
    const g = new THREE.Group(); g.add(inner);
    g.userData.size = m.size.clone().multiplyScalar(k);
    return g;
  }
};

const _gunMats = {};
function gunMaterial(kind) {
  if (_gunMats[kind]) return _gunMats[kind];
  const p = {
    polymer: { color: 0x17181a, metalness: 0.2, roughness: 0.6, envMapIntensity: 0.3 },
    steel: { color: 0x5c6066, metalness: 0.85, roughness: 0.3, envMapIntensity: 0.55 },
    gunmetal: { color: 0x202326, metalness: 0.65, roughness: 0.42, envMapIntensity: 0.35 }
  }[kind];
  return (_gunMats[kind] = new THREE.MeshStandardMaterial(p));
}

// Reads a vertex component, de-normalising quantized attributes (r128 getX returns raw integers).
function readAttr(attr, i, c) {
  let v;
  if (attr.isInterleavedBufferAttribute) v = attr.data.array[i * attr.data.stride + attr.offset + c];
  else v = attr.array[i * attr.itemSize + c];
  if (attr.normalized) {
    const A = attr.isInterleavedBufferAttribute ? attr.data.array : attr.array;
    if (A instanceof Int16Array) v = Math.max(v / 32767, -1);
    else if (A instanceof Uint16Array) v = v / 65535;
    else if (A instanceof Int8Array) v = Math.max(v / 127, -1);
    else if (A instanceof Uint8Array) v = v / 255;
  }
  return v;
}

// Ray helpers
const _rc = new THREE.Raycaster();
function raycast(origin, dir, maxDist, targets) {
  _rc.set(origin, dir); _rc.near = 0.05; _rc.far = maxDist;
  return _rc.intersectObjects(targets, false);
}
