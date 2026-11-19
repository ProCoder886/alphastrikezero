// Dev helper: load the other dev helpers and start a peaceful match without pointer lock.
//   (0,eval)(await (await fetch('/tools/devboot.js')).text()); await devBoot();
//   devCrop(name, [x0, y0, x1, y1], w)   save a crop of the canvas (fractions) at width w -> tools/out/<name>.jpg
async function devBoot(mode) {
  for (const f of ['devshots.js', 'devshots2.js', 'devshots3.js']) (0, eval)(await (await fetch('/tools/' + f)).text());
  for (let i = 0; i < 100 && !(typeof ARSENAL !== 'undefined' && ARSENAL.ready && LOADOUT.primary.length && ASSETS && ASSETS.models && ASSETS.models.soldier); i++) await new Promise(r => setTimeout(r, 200));
  if (mode) selectMode(mode);
  G.devSync = true; startGame(); G.paused = false; MODE.peace = true;
  await INVENTORY.curW().ready;
  if (typeof onResize === 'function') onResize();
  devFrames(60);
  return LOADOUT.ids();
}
// the viewmodel (arms + weapon) seen by extra cameras placed in camera space: views = [[x, y, z, lookX, lookY, lookZ, label], ...]
async function devArms(name, views, tile) {
  tile = tile || 420;
  const cols = Math.min(3, views.length), rows = Math.ceil(views.length / cols);
  const c = document.createElement('canvas'); c.width = cols * tile; c.height = rows * tile;
  const x = c.getContext('2d'); x.font = '13px Consolas';
  const cam = new THREE.PerspectiveCamera(40, 1, 0.01, 10); vmCamera.add(cam);
  const rt = new THREE.WebGLRenderTarget(tile, tile, { samples: 4 });
  const buf = new Uint8Array(tile * tile * 4), id = x.createImageData(tile, tile);
  const bg = vmScene.background; vmScene.background = new THREE.Color(0x707a84);
  vmScene.updateMatrixWorld(true);
  for (let i = 0; i < views.length; i++) {
    const v = views[i]; cam.position.set(v[0], v[1], v[2]); cam.up.set(0, 1, 0);
    const look = new THREE.Vector3(v[3], v[4], v[5]); vmCamera.localToWorld(look); cam.updateMatrixWorld(true); cam.lookAt(look); cam.updateMatrixWorld(true);
    renderer.setRenderTarget(rt); renderer.clear(); renderer.render(vmScene, cam); renderer.readRenderTargetPixels(rt, 0, 0, tile, tile, buf); renderer.setRenderTarget(null);
    for (let yy = 0; yy < tile; yy++) id.data.set(buf.subarray((tile - 1 - yy) * tile * 4, (tile - yy) * tile * 4), yy * tile * 4);
    const px = (i % cols) * tile, py = Math.floor(i / cols) * tile;
    x.putImageData(id, px, py); x.fillStyle = '#000'; x.fillRect(px, py, 160, 16); x.fillStyle = '#fff'; x.fillText(v[6] || ('view ' + i), px + 3, py + 12);
  }
  vmScene.background = bg; vmCamera.remove(cam); rt.dispose();
  return devPost(name, c);
}
var DEV_ARM_VIEWS = [
  [0, 0, 0, 0, -0.1, -0.5, 'player eye'], [-0.45, -0.05, -0.3, 0, -0.12, -0.3, 'left side'], [0.05, -0.55, -0.25, 0, -0.1, -0.3, 'below'],
  [-0.25, 0.1, -0.75, -0.05, -0.12, -0.3, 'front-left'], [0.45, -0.05, -0.3, 0, -0.12, -0.3, 'right side'], [0, 0.4, -0.25, 0, -0.12, -0.3, 'above']
];
async function devCrop(name, r, w) {
  const src = renderer.domElement, sw = src.width * (r[2] - r[0]), sh = src.height * (r[3] - r[1]);
  const c = document.createElement('canvas'); c.width = w || 800; c.height = Math.round(c.width * sh / sw);
  c.getContext('2d').drawImage(src, src.width * r[0], src.height * r[1], sw, sh, 0, 0, c.width, c.height);
  return devPost(name, c);
}
