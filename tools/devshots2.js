// Dev helper: film strip of the first-person view. devSeq(name, shots, framesBetween, cols, crop)
// crop = [x0, y0, x1, y1] as fractions of the canvas (default: the lower right where the weapon is)
async function devSeq(name, shots, between, cols, crop, scale) {
  crop = crop || [0.25, 0.3, 1, 1]; scale = scale || 0.5;
  const src = renderer.domElement, sw = Math.round(src.width * (crop[2] - crop[0])), sh = Math.round(src.height * (crop[3] - crop[1]));
  const w = Math.round(sw * scale), h = Math.round(sh * scale), rows = Math.ceil(shots / cols);
  const c = document.createElement('canvas'); c.width = cols * w; c.height = rows * h;
  const x = c.getContext('2d'); x.font = '12px Consolas';
  for (let i = 0; i < shots; i++) {
    devFrames(i === 0 ? 1 : between);
    const px = (i % cols) * w, py = Math.floor(i / cols) * h;
    x.drawImage(src, src.width * crop[0], src.height * crop[1], sw, sh, px, py, w, h);
    const wp = INVENTORY.curW();
    x.fillStyle = '#000'; x.fillRect(px, py, 150, 15); x.fillStyle = '#fff';
    x.fillText('#' + i + ' t=' + (wp && wp.reloading ? wp.reloadT.toFixed(2) + '/' + wp.reloadDur.toFixed(2) : G.time.toFixed(2)), px + 3, py + 11);
  }
  return devPost(name, c, 0.85);
}
// equip a catalogue weapon by id in the active slot (dev)
async function devEquip(id) {
  const nw = createWeaponInstance(ARSENAL.defName(id));
  INVENTORY.slots[INVENTORY.activeIdx] = nw; attachGun(nw); equipAnim(nw);
  await nw.ready; devFrames(40);
  return nw;
}
