// Dev helper: screenshots of every location for the menu's location cards -> tools/out/prev_<key>.jpg
// (copy them to src/assets/previews/<key>.jpg).  In the dev page console:
//   (0,eval)(await (await fetch('/tools/devpreviews.js')).text()); await devPreviews();        // all locations
//   await devPreview(3, { yaw: 1.2, y: 2.4 })                                                  // one, with a view override
// Outdoor locations are seen from above their spawn toward the middle of the map; indoor ones from the middle
// of the building along its longest open line of sight.
async function devPreview(i, o = {}) {
  if (G.playing) toMenu();
  buildMap(i);
  for (let k = 0; k < 40; k++) await new Promise(r => setTimeout(r, 25));   // textures / environment settle
  for (let k = 0; k < 30; k++) frame(1 / 30);
  const M = MAPS[i], b = WORLD.bounds, sp = WORLD.spawn;
  const cam = camera, cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2;
  let pos, look;
  if (!WORLD.indoor) {
    const dx = cx - sp.x, dz = cz - sp.z, d = Math.hypot(dx, dz) || 1, ux = dx / d, uz = dz / d;
    const back = o.back ?? 10, h = o.y ?? (M.random ? 16 : 11);
    pos = new THREE.Vector3(sp.x - ux * back, h, sp.z - uz * back);
    const ahead = o.ahead ?? Math.min(d, M.random ? 70 : 45);
    look = new THREE.Vector3(sp.x + ux * ahead, o.lookY ?? 1.5, sp.z + uz * ahead);
  } else {
    // the longest open view from (near) the centre at eye height
    const y = o.y ?? 2.1, from = new THREE.Vector3(o.x ?? cx, y, o.z ?? cz);
    if (o.yaw === undefined) {
      let best = 0, by = 0;
      for (let a = 0; a < 32; a++) { const yaw = a / 32 * Math.PI * 2, dir = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)); const h = rayWorld(from, dir, 120, 'shot'); const dd = h ? h.t : 120; if (dd > best) { best = dd; by = yaw; } }
      o.yaw = by;
    }
    pos = from; look = from.clone().add(new THREE.Vector3(Math.sin(o.yaw), o.pitch ?? -0.08, Math.cos(o.yaw)).multiplyScalar(10));
  }
  cam.position.copy(pos); cam.lookAt(look); cam.fov = o.fov ?? 62; cam.updateProjectionMatrix(); cam.updateMatrixWorld(true);
  activeCamera = cam;
  for (let k = 0; k < 6; k++) { LIGHTPOOL.t = 0; LIGHTPOOL.update(0.3); }
  SPR.update(cam); renderer.shadowMap.needsUpdate = true;
  renderFrame(0.016); renderFrame(0.016);
  const src = renderer.domElement, c = document.createElement('canvas'); c.width = 640; c.height = 360;
  const sw = src.width, sh = src.height, ar = 16 / 9; let w = sw, h2 = sw / ar; if (h2 > sh) { h2 = sh; w = sh * ar; }
  c.getContext('2d').drawImage(src, (sw - w) / 2, (sh - h2) / 2, w, h2, 0, 0, 640, 360);
  const url = c.toDataURL('image/jpeg', 0.86);
  await fetch('/save?name=prev_' + M.key + '&ext=jpg', { method: 'POST', body: url });
  return M.key + (WORLD.locName ? ' (' + WORLD.locName + ')' : '');
}
async function devPreviews(only) {
  const out = [];
  for (let i = 0; i < MAPS.length; i++) if (!only || only.includes(MAPS[i].key)) out.push(await devPreview(i, (window.DEV_PREV_VIEWS || {})[MAPS[i].key] || {}));
  return out;
}
