// Dev helpers (loaded on the dev page only: add <script src="tools/devshots.js"> from the console).
// devSheet(ids, cols, w, h, name, yaw, pitch)  contact sheet of weapon renders -> tools/out/<name>.jpg
// devSave(name)                                 the game canvas as it is -> tools/out/<name>.jpg
// devFrames(n, dt)                              run n game frames by hand (the pane throttles rAF when hidden)
async function devPost(name, canvas, q) {
  const url = canvas.toDataURL('image/jpeg', q || 0.88);
  await fetch('/save?name=' + name + '&ext=jpg', { method: 'POST', body: url });
  return name + ' ' + canvas.width + 'x' + canvas.height;
}
async function devSheet(ids, cols, w, h, name, yaw, pitch, kits) {
  ARMORY.init(); ARMORY._scene();
  const rows = Math.ceil(ids.length / cols), c = document.createElement('canvas'); c.width = cols * w; c.height = rows * (h + 16);
  const x = c.getContext('2d'); x.fillStyle = '#2a3038'; x.fillRect(0, 0, c.width, c.height); x.font = '11px Consolas'; x.fillStyle = '#fff';
  const errs = [];
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i]; let url = '';
    try { url = ARMORY.thumb(id, w, h, kits ? kits[i] : undefined, yaw, pitch); } catch (e) { errs.push(id + ': ' + e.message); }
    const px = (i % cols) * w, py = Math.floor(i / cols) * (h + 16);
    if (url) { const im = new Image(); await new Promise(r => { im.onload = r; im.onerror = r; im.src = url; }); x.drawImage(im, px, py); }
    x.fillStyle = '#fff'; x.fillText((ARSENAL.byId[id] || {}).name + '  [' + id + ']', px + 4, py + h + 11);
  }
  const r = await devPost(name, c);
  return r + (errs.length ? ' ERR ' + errs.join(' | ') : '');
}
// n is counted in 60 Hz frames; window.DEV_DT (e.g. 1 / 20) runs the same game time in fewer, longer steps
function devFrames(n, dt) { const DT = dt || window.DEV_DT || 1 / 60, m = Math.max(1, Math.round(n / 60 / DT)); for (let i = 0; i < m; i++) frame(DT); }
async function devSave(name, scale) {
  const src = renderer.domElement, c = document.createElement('canvas'); c.width = Math.round(src.width * (scale || 1)); c.height = Math.round(src.height * (scale || 1));
  c.getContext('2d').drawImage(src, 0, 0, c.width, c.height);
  return devPost(name, c);
}
// start a match on the current map with everything needed for viewmodel shots (no pointer lock)
function devPlay(mode) {
  if (mode) selectMode(mode);
  document.getElementById('playBtn').click();
}
