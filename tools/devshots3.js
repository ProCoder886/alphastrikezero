// Dev helper: one sheet per weapon with hip, aimed, shot and reload frames (4 x 2 tiles). devTour(id, name, emptyReload)
async function devTour(id, name, emptyReload, crop) {
  crop = crop || [0.18, 0.08, 1, 1];
  const src = renderer.domElement, sc = 0.5, sx = src.width * crop[0], sy = src.height * crop[1], sw = src.width * (crop[2] - crop[0]), sh = src.height * (crop[3] - crop[1]);
  const w = Math.round(sw * sc), h = Math.round(sh * sc), cols = 4;
  const c = document.createElement('canvas'); c.width = cols * w; c.height = 2 * h;
  const x = c.getContext('2d'); x.font = '13px Consolas'; let note = id;
  let k = 0;
  const grab = (label) => { const px = (k % cols) * w, py = Math.floor(k / cols) * h; x.drawImage(src, sx, sy, sw, sh, px, py, w, h); x.fillStyle = '#000'; x.fillRect(px, py, 230, 16); x.fillStyle = '#fff'; x.fillText(label, px + 3, py + 12); k++; };
  MODE.peace = true; player.hp = 100;
  const nw = await devEquip(id);
  try {
    ads = false; devFrames(30); grab(nw.def.label + ' hip');
    ads = true; devFrames(45); grab('aim scope=' + (nw.def.scope || 0)); ads = false; devFrames(25);
    mouseFire = true; tryFire(); mouseFire = false; devFrames(3, 1 / 60); grab('shot+3f mag ' + nw.mag);
    devFrames(Math.round((nw.cycleDur || 0.2) * 60 * 0.42)); grab('cycle ' + (nw.cycleDur || 0).toFixed(2));
    devFrames(70);
    if (emptyReload) nw.mag = 0;
    startReload();
    if (nw.reloading) {
      const D = nw.reloadDur, steps = emptyReload === 'bolt' ? [0.55, 0.7, 0.8, 0.9] : [0.3, 0.5, 0.68, 0.86];
      let done = 0;
      for (let i = 0; i < 4; i++) { devFrames(Math.round((steps[i] - done) * D * 60)); done = steps[i]; grab('reload ' + nw.reloadKind + ' ' + nw.reloadT.toFixed(2) + '/' + D.toFixed(2)); }
      devFrames(Math.round(D * 0.2 * 60) + 20);
      note += ' rl ' + D.toFixed(2) + (nw.reloadPlan && nw.reloadKind === 'mag' ? ' snd ' + nw.reloadPlan.snd + ' rate ' + nw.reloadPlan.rate.toFixed(2) : '');
    } else note += ' no reload';
  } catch (e) { note += ' ERR ' + e.message + ' @ ' + (e.stack || '').split('\n')[1]; }
  return (await devPost(name, c, 0.86)) + ' :: ' + note;
}
