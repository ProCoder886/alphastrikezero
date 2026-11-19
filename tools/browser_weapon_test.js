// Dev server only: visible controls let browser automation exercise the real gameplay code
// when the automation browser does not grant pointer lock. Never included in index.html.
if (new URLSearchParams(location.search).has('weapon-test')) {
  const panel = document.createElement('div');
  panel.id = 'weaponTestPanel';
  panel.style.cssText = 'position:fixed;z-index:99999;top:8px;right:8px;background:#141923;color:#fff;padding:8px;font:12px monospace;display:flex;gap:4px;flex-wrap:wrap;max-width:360px';
  panel.innerHTML = '<button id="wtStart">START TEST</button><button id="wtFire">FIRE</button><button id="wtAuto">BURST</button><button id="wtReload">RELOAD</button><button id="wtAds">ADS</button><button id="wtNext">NEXT</button><button id="wtAudit">AUDIT ALL</button><span id="wtStatus">waiting</span><span id="wtAuditResult"></span>';
  document.body.appendChild(panel);
  const status = panel.querySelector('#wtStatus');
  const ready = () => typeof ARSENAL !== 'undefined' && ARSENAL.ready && LOADOUT.primary.length;
  panel.querySelector('#wtStart').onclick = () => {
    if (!ready()) { status.textContent = 'assets loading'; return; }
    G.devSync = true; selectMode('free'); startGame(); MODE.peace = true;
    G.paused = false; document.getElementById('pause').classList.add('hidden');
    setInterval(() => { if (G.playing) { G.paused = false; document.getElementById('pause').classList.add('hidden'); const w = INVENTORY.curW(); status.textContent = w ? `${INVENTORY.activeIdx + 1} ${w.def.label} ${w.mag}/${w.def.mag} ${w.reloading ? 'RELOADING ' + w.reloadT.toFixed(1) : 'READY'} ${ads ? 'ADS' : 'HIP'}` : 'no weapon'; } }, 100);
  };
  panel.querySelector('#wtFire').onclick = () => { if (AC && AC.state === 'suspended') AC.resume(); VMS.equip = 1; tryFire(); };
  panel.querySelector('#wtAuto').onclick = () => {
    if (AC && AC.state === 'suspended') AC.resume();
    VMS.equip = 1;
    // Keep the simulated trigger held despite the button's own mouseup event.
    const held = setInterval(() => { mouseFire = true; tryFire(); }, 16);
    setTimeout(() => { clearInterval(held); mouseFire = false; }, 600);
  };
  panel.querySelector('#wtReload').onclick = () => { const w = INVENTORY.curW(); if (!w) return; w.mag = Math.max(0, w.mag - 5); VMS.equip = 1; startReload(); };
  panel.querySelector('#wtAds').onclick = () => { ads = !ads; };
  panel.querySelector('#wtNext').onclick = () => { INVENTORY.switchWeapon((INVENTORY.activeIdx + 1) % INVENTORY.slots.length); };
  panel.querySelector('#wtAudit').onclick = async () => {
    if (!ready()) return;
    const out = panel.querySelector('#wtAuditResult'), errors = [];
    let built = 0, plans = 0, fire = 0;
    const fireIds = new Set(), reloadIds = new Set();
    for (const e of ARSENAL.all()) {
      let root;
      try {
        const def = WEAPON_DEFS[ARSENAL.defName(e.id)];
        if (!def) throw new Error('missing definition');
        if (def.snd.s) { if (!AudioSys.has(def.snd.s)) throw new Error('missing fire clip ' + def.snd.s); fire++; fireIds.add(def.snd.s); }
        root = await ARSENAL.instance(e.id);
        if (!root.userData.hqInfo || !root.userData.rig) throw new Error('missing model rig');
        built++;
        if (def.cls !== 'melee' && !usesShells(def)) {
          const w = { def, hq: null, model: new THREE.Group() };
          HQVM.setup(w, root);
          for (const empty of [false, true]) {
            const p = HQVM.reloadPlan(w, empty);
            if (!(p.keys.magOut < p.keys.magIn && p.keys.magIn < p.dur)) throw new Error('invalid reload keys');
            if (p.snd && !AudioSys.has(p.snd)) throw new Error('missing reload clip ' + p.snd);
            if (p.snd) reloadIds.add(p.snd);
            plans++;
          }
        }
      } catch (err) { errors.push(e.id + ': ' + err.message); }
      finally { if (root) root.traverse(o => { if (o.geometry) o.geometry.dispose(); }); }
      if ((built + errors.length) % 8 === 0) { out.textContent = `model audit ${built + errors.length}/${ARSENAL.all().length}`; await new Promise(r => setTimeout(r, 0)); }
    }
    const missingFire = Object.keys(ARSENAL.suppliedAudio.fire).filter(id => !fireIds.has(id));
    const missingReload = Object.keys(ARSENAL.suppliedAudio.reload).filter(id => !reloadIds.has(id));
    out.textContent = `AUDIT ${built}/${ARSENAL.all().length} models, ${fire} fire clips, ${plans} reload plans; supplied used ${26 - missingFire.length}/26 fire, ${26 - missingReload.length}/26 reload; ${errors.length} errors${errors.length ? ': ' + errors.slice(0, 3).join('; ') : ''}${missingFire.length || missingReload.length ? '; unused ' + missingFire.concat(missingReload).join(', ') : ''}`;
  };
}
