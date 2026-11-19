// Dev helper: kill cams and blasts on demand (load after devboot.js; the match must be running).
//   await devCam('sweep')           kill a soldier 18 m ahead and film the kill cam style at u = 0.12 / 0.45 / 0.85
//   await devBlast('rb_', 26, 1.27) blow up a player rocket among seven soldiers and film four moments
window.devCam = async (style, dist) => {
  G.paused = false; if (CINE.active) CINE.end(); CINE.cool = 0; CINE.kcool = 0;
  camera.updateMatrixWorld(true);
  const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).setY(0).normalize();
  const c = player.pos.clone().addScaledVector(fwd, dist || 18); c.y = 0;
  const e = spawnEnemy('soldier', c, { state: 'patrol' }); devFrames(20);
  const from = camera.getWorldPosition(new THREE.Vector3()), point = e.g.position.clone().setY(1.4);
  damageEnemy(e, 999, 'head', point, point.clone().sub(from).normalize());
  CINE.forceStyle = style; const R = Math.random; Math.random = () => 0.1;
  const ok = CINE.maybeKillCam(INVENTORY.curW(), { enemy: e, zone: 'head', point, dist: from.distanceTo(point) }, from);
  Math.random = R; CINE.forceStyle = null;
  const D = CINE.dur;
  for (const u of [0.12, 0.45, 0.85]) { G.paused = false; while (CINE.active && CINE.t < u * D) frame(1 / 60); await devSave('cam_' + style + '_' + Math.round(u * 100), 0.4); }
  while (CINE.active) frame(1 / 30);
  return { style, ok, D, label: document.getElementById('kcSub').textContent };
};
window.devBlast = async (prefix, dist, power, n) => {
  G.paused = false; G.camShake = 0; if (CINE.active) CINE.end(); CINE.cool = 0;
  camera.updateMatrixWorld(true);
  const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).setY(0).normalize();
  const c = player.pos.clone().addScaledVector(fwd, dist); c.y = 0;
  const spawned = [];
  for (let i = 0; i < (n || 7); i++) { const e = spawnEnemy('soldier', new THREE.Vector3(c.x + rand(-8, 8), 0, c.z + rand(-8, 8)), { state: 'patrol' }); if (e) spawned.push(e); }
  devFrames(10);
  const killed = explode(c.clone().setY(0.4), power || 1.27, 'player', { big: true });
  const cine = { active: CINE.active, style: CINE.style, title: document.getElementById('kcTitle').textContent, sub: document.getElementById('kcSub').textContent };
  for (const [k, f] of [['a', 3], ['b', 14], ['c', 40], ['d', 70]]) { G.paused = false; devFrames(f); await devSave(prefix + k, 0.5); }
  while (CINE.active) frame(1 / 30);
  return { spawned: spawned.length, killed: killed.length, cine };
};
