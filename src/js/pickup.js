// ---------- Pickups and dropped weapons ----------
const weaponDrops = [];
const _pkGlow = {};
function pickupGlow(color) {
  if (_pkGlow[color]) return _pkGlow[color];
  return (_pkGlow[color] = new THREE.SpriteMaterial({ map: radialTex('pkglow', 'rgba(255,255,255,0.9)', 'rgba(255,255,255,0)'), color, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false }));
}

function spawnPickup(pos, kind) {
  const g = new THREE.Group();
  if (kind === 'ammo') {
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.24, 0.26), MATLIB.get('metal', { color: 0x6a7a4a }));
    box.castShadow = true; g.add(box);
    const lid = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.04, 0.28), MATLIB.plain(0x3e4a2a, { rough: 0.6, metal: 0.4 })); lid.position.y = 0.13; g.add(lid);
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.43, 0.05, 0.27), MATLIB.emissive(0xffb454, 2.2)); strip.position.y = 0.0; g.add(strip);
  } else {
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.22, 0.24), MATLIB.plain(0xe8e8e8, { rough: 0.5 })); box.castShadow = true; g.add(box);
    const c1 = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.06, 0.245), MATLIB.emissive(0xff3030, 2)); g.add(c1);
    const c2 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.2, 0.245), MATLIB.emissive(0xff3030, 2)); g.add(c2);
  }
  const glow = new THREE.Sprite(pickupGlow(kind === 'ammo' ? 0xffb454 : 0x54ff86)); glow.scale.set(0.8, 0.8, 1); g.add(glow);
  g.position.set(pos.x, 0.45, pos.z);
  scene.add(g);
  pickups.push({ m: g, kind, life: 30, bob: Math.random() * 6 });
}

function updatePickups(dt) {
  for (let i = pickups.length - 1; i >= 0; i--) {
    const p = pickups[i];
    p.life -= dt; p.bob += dt * 3;
    p.m.rotation.y += dt * 1.6;
    p.m.position.y = 0.45 + Math.sin(p.bob) * 0.08 + groundHeightAt(p.m.position.x, p.m.position.z, 2, 0.1, 0);
    const d = Math.hypot(p.m.position.x - player.pos.x, p.m.position.z - player.pos.z);
    if (d < 1.4 && Math.abs(player.pos.y - (p.m.position.y - 0.45)) < 1.5) {
      if (p.kind === 'ammo') {
        const w = INVENTORY.curW(); if (w) w.reserve += w.def.mag * 2;
        addKillFeed('+AMMO', false); SFX.pickupAmmo();
      } else {
        if (player.hp >= player.maxHp) continue;
        player.hp = Math.min(player.maxHp, player.hp + 40); addKillFeed('+HEALTH', false); SFX.pickupHealth();
      }
      updateAmmoHUD(); p.life = 0;
    }
    if (p.life <= 0) { scene.remove(p.m); pickups.splice(i, 1); }
  }
}

function spawnDroppedWeapon(weaponName, pos, mag, reserve) {
  if (!WEAPON_DEFS[weaponName]) return;
  const hqId = WEAPON_DEFS[weaponName].hq;
  let model;
  if (hqId && typeof ARSENAL !== 'undefined' && ARSENAL.byId[hqId]) { model = GUNSMITH.build(ARSENAL.byId[hqId], ARSENAL.kitFor(hqId)).root; model.traverse(o => { if (o.isMesh) o.castShadow = true; }); }
  else model = buildGun(weaponName, true);
  const holder = new THREE.Group(); holder.add(model);
  model.rotation.set(0, 0, Math.PI / 2);
  const glow = new THREE.Sprite(pickupGlow(0xffaa33)); glow.scale.set(1.3, 0.6, 1); glow.position.y = 0.05; holder.add(glow);
  holder.position.set(pos.x, groundHeightAt(pos.x, pos.z, pos.y + 1, 0.1, 1) + 0.06, pos.z);
  holder.rotation.y = Math.random() * Math.PI * 2;
  scene.add(holder);
  weaponDrops.push({ weaponName, mag, reserve, mesh: holder, life: 60 });
}

function updateWeaponDrops(dt) {
  let showHint = false;
  for (let i = weaponDrops.length - 1; i >= 0; i--) {
    const w = weaponDrops[i];
    w.life -= dt;
    w.mesh.rotation.y += dt * 0.6;
    const d = Math.hypot(w.mesh.position.x - player.pos.x, w.mesh.position.z - player.pos.z);
    if (d < 2.4) { showHint = true; document.getElementById('interactHint').textContent = 'PRESS E · ' + WEAPON_DEFS[w.weaponName].label; }
    if (w.life <= 0) { scene.remove(w.mesh); weaponDrops.splice(i, 1); }
  }
  document.getElementById('interactHint').style.display = showHint ? 'block' : 'none';
}
