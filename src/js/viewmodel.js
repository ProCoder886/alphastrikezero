// ---------- First-person weapon handling: hands, reload choreography, moving parts ----------
// Works on catalogue weapons (ARSENAL / GUNSMITH). The weapon's own parts are animated: the magazine leaves with the
// left hand (or drops free) and a fresh one comes back, the bolt / charging handle / slide / pump cycle per shot
// and on reloads, feed covers open, cylinders swing out, break actions hinge. The reload timeline is the weapon's
// reload SOUND: its event times (magazine out, magazine in, bolt...) place the animation keys, so picture and sound
// stay locked together. The arms (FPARMS) hold the weapon at its hand frames (weapon space).
const HQVM = {
  // per class: gun motion during the reload (cm / degrees at full weight)
  PRESETS: {
    // the weapon is raised muzzle-up across the view so the magazine well and the working hand are in sight
    rifle:    { roll: -24, pitch: 36, yaw: 24, dx: -3, dy: 8.5, dz: -5, magTilt: 18 },
    smg:      { roll: -24, pitch: 34, yaw: 22, dx: -3, dy: 8, dz: -4, magTilt: 14 },
    lmg:      { roll: 12, pitch: 14, yaw: 16, dx: -4, dy: 5, dz: -6, magTilt: 6 },
    dmr:      { roll: -24, pitch: 34, yaw: 24, dx: -3, dy: 8.5, dz: -5, magTilt: 16 },
    sniper:   { roll: -22, pitch: 30, yaw: 22, dx: -3, dy: 7.5, dz: -5, magTilt: 12 },
    pistol:   { roll: -26, pitch: 38, yaw: 12, dx: -6, dy: 7, dz: -2, magTilt: 4 },
    shotgun:  { roll: -40, pitch: 22, yaw: 14, dx: -3, dy: 6, dz: -4, magTilt: 0 },
    launcher: { roll: -12, pitch: 22, yaw: 26, dx: -6, dy: 3, dz: -4, magTilt: 0 },
    melee:    { roll: 0, pitch: 0, yaw: 0, dx: 0, dy: 0, dz: 0, magTilt: 0 }
  },

  // ---------- setup once the model exists ----------
  setup(w, root) {
    const info = root.userData.hqInfo, R = root.userData.rig;
    const hq = {
      root, info, e: info.e, rig: R, mag: R.mag, magRest: R.mag ? { p: R.mag.position.clone(), q: R.mag.quaternion.clone() } : null,
      bolt: R.bolt, charging: R.charge, slide: R.slide, pump: R.pump, cover: R.cover, cyl: R.cyl, brk: R.brk,
      frameR: R.frameR, frameL: R.frameL, magPos: R.magPos.clone(), magLen: R.magLen, magKind: R.magKind, boltStyle: R.boltStyle, chargePos: R.chargePos,
      rest: new Map(), boltT: 0, boltDur: 0.08, slideLock: false, handLFrame: null, handRFrame: null, drop: null
    };
    for (const o of [hq.bolt, hq.charging, hq.slide, hq.pump, hq.cyl, hq.cover, hq.brk]) if (o) hq.rest.set(o, { p: o.position.clone(), q: o.quaternion.clone() });
    w.hq = hq;
  },
  // hand frame from a position, palm normal and finger direction (weapon space)
  _frame(p, palm, fingers) { return GUNSMITH._frame(p, palm, fingers); },
  _lerpF(a, b, k) { return { p: a.p.clone().lerp(b.p, k), q: a.q.clone().slerp(b.q, k) }; },
  // part at its rest position, moved by (x, y, z) metres
  _slide(hq, node, x, y, z) { const r = hq.rest.get(node); if (r) node.position.set(r.p.x + (x || 0), r.p.y + (y || 0), r.p.z + (z || 0)); },
  _rot(hq, node, rx, ry, rz) { const r = hq.rest.get(node); if (r) { node.quaternion.copy(r.q); if (rx || ry || rz) node.quaternion.multiply(_hqQ.setFromEuler(_hqE.set(rx || 0, ry || 0, rz || 0))); } },

  // ---------- reload plan: the timeline of the weapon's reload sound ----------
  // returns { dur, rate, snd, events: [{t, fn}], keys }
  reloadPlan(w, empty) {
    const d = w.def, hq = w.hq, P = this.PRESETS[d.cls] || this.PRESETS.rifle, RS = d.reloadSnd;
    const rs = RS ? (empty ? RS.empty || RS.tac : RS.tac || RS.empty) : null;
    const want = d.reload * (empty && (!RS || RS.empty) ? 1.12 : 1);   // only weapons with bolt work take longer when empty
    let dur, rate = 1, ev = {};
    if (rs && rs.dur) {
      // the sound is the timeline; a modest speed change fits it to the weapon's reload time
      rate = clamp(rs.dur / want, 0.82, 1.3); dur = rs.dur / rate;
      for (const k in rs.events) if (typeof rs.events[k] === 'number') ev[k] = rs.events[k] / rate;
    } else {
      dur = want; ev = { magOut: dur * 0.22, magIn: dur * 0.62 };
      if (empty || d.bolt) { ev.boltPull = dur * 0.8; ev.boltRelease = dur * 0.88; }
    }
    const num = (v) => typeof v === 'number' && isFinite(v);
    if (!num(ev.magOut)) ev.magOut = dur * 0.22;
    if (!(ev.magIn > ev.magOut)) ev.magIn = Math.max(ev.magOut + 0.35, dur * 0.62);
    let hasBolt = num(ev.boltPull) && ev.boltPull > ev.magIn && hq.boltStyle !== 'none' && hq.boltStyle !== 'pump';
    let tBolt = hasBolt ? ev.boltPull : -1, tBoltRel = hasBolt ? (num(ev.boltRelease) && ev.boltRelease > tBolt ? ev.boltRelease : tBolt + 0.14) : -1;
    const keys = { magOut: ev.magOut, magIn: ev.magIn, bolt: tBolt, boltRel: tBoltRel, dur, empty, P,
      open: num(ev.open) ? ev.open : -1, close: num(ev.close) ? ev.close : -1 };
    const events = [{ t: ev.magOut, fn: 'magOut' }, { t: ev.magIn, fn: 'magIn' }, { t: ev.magIn + 0.04, fn: 'fill' }];
    if (hasBolt) events.push({ t: tBolt, fn: 'bolt' });
    events.sort((a, b) => a.t - b.t);
    return { dur: Math.max(dur, ev.magIn + 0.25, hasBolt ? tBoltRel + 0.22 : 0, keys.close > 0 ? keys.close + 0.2 : 0), rate, snd: rs ? rs.id : null, events, keys };
  },

  // ---------- per-frame ----------
  // pose: { px, py, pz, rx, ry, rz } to modify (camera-space gun pose)
  update(w, dt, pose) {
    const hq = w.hq; if (!hq) return;
    const d = w.def;
    hq.handLFrame = null; hq.handRFrame = null;
    // bolt / slide recoil cycle after each shot
    if (hq.boltT > 0) hq.boltT = Math.max(0, hq.boltT - dt);
    const cyc = hq.boltT > 0 ? Math.sin((1 - hq.boltT / hq.boltDur) * Math.PI) : 0;
    const manual = d.bolt || d.pump;
    if (hq.bolt && !manual) this._slide(hq, hq.bolt, 0, 0, cyc * 0.05);
    if (hq.slide) this._slide(hq, hq.slide, 0, 0, (hq.slideLock && !w.reloading ? 1 : cyc) * 0.034);
    if (hq.charging) this._slide(hq, hq.charging, 0, 0, 0);
    // revolver: the cylinder steps one chamber per shot
    if (hq.cyl && !w.reloading && hq.magKind === 'cyl') { hq.cylA = damp(hq.cylA || 0, hq.cylTarget || 0, 22, dt); this._slide(hq, hq.cyl, 0, 0, 0); this._rot(hq, hq.cyl, 0, 0, hq.cylA); }
    // manual actions between shots
    if (w.cycleT > 0 && w.cycleDur) {
      const u = 1 - w.cycleT / w.cycleDur;
      if (d.pump) this._pumpCycle(w, u); else if (d.bolt) this._boltCycle(w, u, pose);
    } else {
      if (hq.pump) this._slide(hq, hq.pump, 0, 0, 0);
      if (hq.bolt && manual) { this._slide(hq, hq.bolt, 0, 0, 0); this._rot(hq, hq.bolt, 0, 0, 0); }
    }
    // launchers: the rocket shows only while one is loaded
    if (hq.magKind === 'rocket' && hq.mag && !w.reloading) hq.mag.visible = w.mag > 0;
    if (w.reloading && w.reloadKind === 'mag' && w.reloadPlan) this._reloadPose(w, pose);
    else if (w.reloading && w.reloadKind === 'shells') this._shellPose(w, pose);
    else {
      if (hq.mag && hq.magRest && hq.magKind !== 'rocket') { hq.mag.position.copy(hq.magRest.p); hq.mag.quaternion.copy(hq.magRest.q); hq.mag.visible = !(hq.magKind === 'cyl' || hq.magKind === 'break'); }
      if (hq.cover) this._rot(hq, hq.cover, 0, 0, 0);
      if (hq.brk) this._rot(hq, hq.brk, 0, 0, 0);
      if (hq.cyl && hq.magKind !== 'cyl') this._slide(hq, hq.cyl, 0, 0, 0);
    }
    this._dropUpdate(hq, dt);
  },

  // pump action: the left hand and the fore-end go back and forward
  // fore-end travel keyed from the x_pump recording (seconds from its start): drawn back over 0.15-0.27 s (the back
  // clack at 0.27), held, driven forward over 0.38-0.48 s (the locking clack at 0.48)
  PUMP_KEYS: [[0.15, 0], [0.27, 1], [0.38, 1], [0.48, 0]],
  pumpTravel(t) { return t <= 0 ? 0 : kf(t, this.PUMP_KEYS); },
  _pumpCycle(w, u) {
    const hq = w.hq, k = this.pumpTravel(u * w.cycleDur), z = k * 0.078;
    if (hq.pump) this._slide(hq, hq.pump, 0, 0, z);
    hq.handLFrame = { p: hq.frameL.p.clone().add(_hqA.set(0, 0, z)), q: hq.frameL.q };
  },
  // bolt action: the right hand leaves the grip, lifts the handle, draws the bolt back, closes it, returns
  BOLT_KEYS: { reach: 0.14, lift: 0.26, back: 0.44, fwd: 0.64, down: 0.76, home: 1 },
  _boltCycle(w, u, pose) {
    const hq = w.hq, K = this.BOLT_KEYS;
    const lift = kf(u, [[K.reach, 0], [K.lift, 1], [K.fwd, 1], [K.down, 0]]), back = kf(u, [[K.lift, 0], [K.back, 1], [K.back + 0.04, 1], [K.fwd, 0]]);
    if (hq.bolt) { this._slide(hq, hq.bolt, 0, 0, back * 0.085); this._rot(hq, hq.bolt, 0, 0, lift * 1.05); }
    const cp = hq.chargePos; if (!cp) return;
    // knob position follows the bolt (rotation about the bore axis, then the draw)
    const by = hq.bolt ? hq.rest.get(hq.bolt).p.y : cp.y, a = lift * 1.05;
    const rx = cp.x, ry = cp.y - by, kx = rx * Math.cos(a) - ry * Math.sin(a), ky = by + rx * Math.sin(a) + ry * Math.cos(a);
    const grab = this._frame(new THREE.Vector3(kx + 0.03, ky - 0.03, cp.z + back * 0.085 + 0.068), _hqB.set(-0.8, 0.6, 0), _hqC.set(-0.1, 0.2, -1));
    const kIn = smoothstep(0, 1, u / K.reach), kOut = smoothstep(0, 1, (u - K.down) / (K.home - K.down));
    hq.handRFrame = u < K.reach ? this._lerpF(hq.frameR, grab, kIn) : u < K.down ? grab : this._lerpF(grab, hq.frameR, kOut);
    pose.rz += Math.sin(clamp(u, 0, 1) * Math.PI) * -0.12; pose.py -= Math.sin(clamp(u, 0, 1) * Math.PI) * 0.01;
  },

  // shell by shell: the left hand brings each shell from the belt to the loading port
  _shellPose(w, pose) {
    const hq = w.hq, d = w.def, P = this.PRESETS[d.cls === 'launcher' ? 'shotgun' : d.cls] || this.PRESETS.shotgun, D2R = Math.PI / 180;
    const tilt = kf(w.reloadT, [[0, 0], [0.3, 1], [w.reloadDur - 0.5, 1], [w.reloadDur - 0.12, 0]]);
    pose.rz += tilt * P.roll * D2R; pose.rx += tilt * P.pitch * D2R; pose.ry += tilt * P.yaw * D2R; pose.px += tilt * P.dx / 100; pose.py += tilt * P.dy / 100; pose.pz += tilt * P.dz / 100;
    const port = this._frame(hq.magPos.clone().add(_hqA.set(-0.035, -0.06, 0.065)), _hqB.set(0.45, 0.9, 0), _hqC.set(0.15, 0.25, -1));
    const low = { p: port.p.clone().add(_hqA.set(-0.07, -0.26, 0.1)), q: port.q };
    const tt = w.reloadT - 0.35, n = w.shellsToLoad, st = w.shellTime;
    let hand = hq.frameL, carry = false, push = 0;
    if (tt < 0) hand = this._lerpF(hq.frameL, low, smoothstep(0, 1, w.reloadT / 0.35));
    else if (tt < n * st) {
      const su = (tt % st) / st;
      // 0-0.5 up to the port, 0.5-0.68 push the shell in, then down for the next one
      if (su < 0.5) { hand = this._lerpF(low, port, smoothstep(0, 1, su / 0.5)); carry = true; }
      else if (su < 0.68) { push = smoothstep(0, 1, (su - 0.5) / 0.18); hand = { p: port.p.clone().add(_hqA.set(0, 0.012 * push, -0.03 * push)), q: port.q }; carry = push < 0.8; }
      else hand = this._lerpF({ p: port.p.clone().add(_hqA.set(0, 0.012, -0.03)), q: port.q }, low, smoothstep(0, 1, (su - 0.68) / 0.32));
    } else {
      const k = smoothstep(0, 1, (tt - n * st) / 0.3);
      hand = this._lerpF(low, hq.frameL, k);
      // closing pump
      const pe = w.pumpAt > 0 ? w.pumpAt : -1;
      if (hq.pump && pe > 0) { const pk = this.pumpTravel(w.reloadT - pe) * 0.078; this._slide(hq, hq.pump, 0, 0, pk); if (w.reloadT > pe) hand = { p: hq.frameL.p.clone().add(_hqA.set(0, 0, pk)), q: hq.frameL.q }; }
    }
    hq.handLFrame = hand;
    // the shell rides in the fingers
    hq.shell = carry ? hand.p.clone().add(_hqA.set(0, 1, 0).applyQuaternion(hand.q).multiplyScalar(0.085)).add(_hqB.set(1, 0, 0).applyQuaternion(hand.q).multiplyScalar(0.022)) : null;
  },

  // magazine reloads (box, drum, belt box, top magazine, pistol, revolver, break action, rocket)
  _reloadPose(w, pose) {
    const hq = w.hq, K = w.reloadPlan.keys, P = K.P, t = w.reloadT, dur = w.reloadPlan.dur, kind = hq.magKind, D2R = Math.PI / 180;
    const tGrab = Math.max(0.1, K.magOut - 0.28), tLow = K.magOut + (K.magIn - K.magOut) * 0.4, tUp = K.magIn - Math.min(0.34, (K.magIn - K.magOut) * 0.36);
    const hasBolt = K.bolt > 0, tBoltReach = hasBolt ? K.bolt - 0.24 : -1, tDone = hasBolt ? K.boltRel + 0.24 : (K.close > 0 ? K.close + 0.2 : K.magIn + 0.34);
    // gun tilt: up to the reload pose by the grab, held, back by the end
    const tilt = kf(t, [[0, 0], [Math.max(0.12, tGrab * 0.8), 1], [Math.max(tDone, K.magIn + 0.15), hasBolt ? 0.75 : 0.6], [dur, 0]]);
    const boltTwist = hasBolt ? kf(t, [[tBoltReach, 0], [K.bolt, 1], [K.boltRel, 1], [tDone, 0]]) : 0;
    const side = hq.boltStyle === 'side' || hq.boltStyle === 'boltAction';
    pose.rz += tilt * P.roll * D2R + boltTwist * (side ? 0.34 : -0.12); pose.rx += tilt * P.pitch * D2R; pose.ry += tilt * P.yaw * D2R;
    pose.px += tilt * P.dx / 100; pose.py += tilt * P.dy / 100; pose.pz += tilt * P.dz / 100;
    // revolver: muzzle up to dump the brass, then down to load
    if (kind === 'cyl') { const up = kf(t, [[K.open, 0], [K.magOut, 1], [K.magOut + 0.2, 1], [tUp, -0.5], [K.magIn + 0.1, -0.5], [dur, 0]]); pose.rx += up * 0.5; }
    // seating bump
    const bump = kf(t, [[K.magIn - 0.06, 0], [K.magIn, 1], [K.magIn + 0.12, 0]]);
    pose.py += bump * 0.012; pose.rx -= bump * 0.05;
    // left-hand frames (weapon space)
    const fL = hq.frameL, magP = hq.magPos, magLen = Math.max(0.05, hq.magLen || 0.12);
    let atMag, low;
    if (kind === 'top') {
      atMag = this._frame(magP.clone().add(_hqA.set(-0.035, 0.034, 0.07)), _hqB.set(0.35, -0.94, 0), _hqC.set(0.12, 0, -1));
      low = { p: atMag.p.clone().add(_hqA.set(-0.12, -0.3, 0.14)), q: atMag.q };
    } else if (kind === 'rocket') {
      atMag = this._frame(magP.clone().add(_hqA.set(-0.04, -0.03, 0.075)), _hqB.set(0.9, 0.44, 0), _hqC.set(0.1, 0.05, -1));
      low = { p: atMag.p.clone().add(_hqA.set(-0.16, -0.34, 0.3)), q: atMag.q };
    } else if (kind === 'cyl' || kind === 'break') {
      atMag = this._frame(magP.clone().add(_hqA.set(-0.03, -0.02, 0.085)), _hqB.set(0.8, 0.6, 0), _hqC.set(0.25, 0.1, -1));
      low = { p: atMag.p.clone().add(_hqA.set(-0.08, -0.3, 0.1)), q: atMag.q };
    } else {
      const fing = _hqD.set(0, -0.33, -0.94).normalize();
      const palmAt = magP.clone().add(_hqA.set(-0.03, -magLen * 0.55, 0.0));
      atMag = { p: palmAt.clone().addScaledVector(fing, -0.075).add(_hqB.set(-0.01, 0, 0)), q: this._frame(_hqB.set(0, 0, 0), _hqC.set(1, 0.1, 0), fing).q };
      low = { p: atMag.p.clone().add(_hqA.set(-0.1, kind === 'belt' ? -0.3 : -0.36, 0.1)), q: atMag.q };
    }
    const preIn = { p: atMag.p.clone().add(kind === 'top' ? _hqA.set(-0.01, 0.07, 0.03) : kind === 'rocket' ? _hqA.set(0, 0, -0.16) : _hqA.set(-0.015, -0.08, 0.02)), q: atMag.q };
    const free = kind === 'drop' || kind === 'rocket' || kind === 'cyl' || kind === 'break' || kind === 'none';   // the hand does not pull the old magazine out
    let hand;
    if (free) {
      if (t < K.magOut + 0.05) hand = this._lerpF(fL, low, smoothstep(0, 1, (t - 0.08) / Math.max(0.2, K.magOut - 0.03)));
      else if (t < tLow) hand = low;
      else if (t < tUp) hand = this._lerpF(low, preIn, smoothstep(0, 1, (t - tLow) / (tUp - tLow)));
      else if (t < K.magIn) hand = this._lerpF(preIn, atMag, smoothstep(0, 1, (t - tUp) / (K.magIn - tUp)));
    } else {
      if (t < tGrab) hand = this._lerpF(fL, atMag, smoothstep(0, 1, t / tGrab));
      else if (t < K.magOut) hand = atMag;
      else if (t < tLow) hand = this._lerpF(atMag, low, smoothstep(0, 1, (t - K.magOut) / (tLow - K.magOut)));
      else if (t < tUp) hand = this._lerpF(low, preIn, smoothstep(0, 1, (t - tLow) / (tUp - tLow)));
      else if (t < K.magIn) hand = this._lerpF(preIn, atMag, smoothstep(0, 1, (t - tUp) / (K.magIn - tUp)));
    }
    if (t >= K.magIn) {
      const leftBolt = hasBolt && !side && hq.boltStyle !== 'slide';   // pistols: the thumb drops the slide, the hand goes straight back to the grip
      if (leftBolt) {
        const bf = this._boltFrame(w);
        if (t < tBoltReach) hand = this._lerpF(atMag, bf.grab, smoothstep(0, 1, (t - K.magIn) / Math.max(0.05, tBoltReach - K.magIn)));
        else if (t < K.bolt) hand = bf.grab;
        else if (t < K.boltRel) hand = this._lerpF(bf.grab, bf.pulled, smoothstep(0, 1, (t - K.bolt) / Math.max(0.05, Math.min(0.14, K.boltRel - K.bolt))));
        else hand = this._lerpF(bf.pulled, fL, smoothstep(0, 1, (t - K.boltRel) / Math.max(0.05, tDone - K.boltRel)));
      } else hand = this._lerpF(atMag, fL, smoothstep(0, 1, (t - K.magIn - 0.06) / 0.3));
    }
    hq.handLFrame = hand;
    // charging: the handle / slide / bolt moves with the hand that works it
    if (hasBolt) {
      const pull = t >= K.bolt && t < K.boltRel + 0.07 ? (t < K.boltRel ? smoothstep(0, 1, (t - K.bolt) / Math.max(0.05, Math.min(0.14, K.boltRel - K.bolt))) : 1 - smoothstep(0, 1, (t - K.boltRel) / 0.06)) : 0;
      const st = hq.boltStyle;
      if (st === 'charging') { if (hq.charging) this._slide(hq, hq.charging, 0, 0, pull * 0.07); if (hq.bolt) this._slide(hq, hq.bolt, 0, 0, pull * 0.05); }
      else if (st === 'catch') { if (hq.bolt) this._slide(hq, hq.bolt, 0, 0, (t < K.bolt ? 1 : 1 - smoothstep(0, 1, (t - K.bolt) / 0.05)) * (K.empty ? 0.05 : 0)); }
      else if (st === 'slide') { if (hq.slide) this._slide(hq, hq.slide, 0, 0, (hq.slideLock && t < K.boltRel ? 1 : 0) * 0.034); }
      else if (side) {
        // right hand racks the handle on the right side
        const cp = hq.chargePos || _hqA.set(0.04, 0.05, -0.1);
        const mk = (z) => this._frame(new THREE.Vector3(cp.x + 0.03, cp.y - 0.02, cp.z + z + 0.07), _hqB.set(-1, 0.2, 0), _hqC.set(-0.2, 0.1, -1));
        const travel = st === 'boltAction' ? 0.085 : 0.07, g0 = mk(0), g1 = mk(travel);
        if (t >= tBoltReach - 0.08 && t < tDone) {
          hq.handRFrame = t < K.bolt ? this._lerpF(hq.frameR, g0, smoothstep(0, 1, (t - (tBoltReach - 0.08)) / Math.max(0.08, K.bolt - tBoltReach + 0.08)))
            : t < K.boltRel + 0.07 ? this._lerpF(g0, g1, pull) : this._lerpF(g0, hq.frameR, smoothstep(0, 1, (t - K.boltRel - 0.07) / Math.max(0.06, tDone - K.boltRel - 0.07)));
        }
        if (hq.bolt) { this._slide(hq, hq.bolt, 0, 0, pull * travel); if (st === 'boltAction') this._rot(hq, hq.bolt, 0, 0, kf(t, [[tBoltReach, 0], [K.bolt, 1], [K.boltRel + 0.07, 1], [tDone - 0.05, 0]]) * 1.05); }
        if (hq.charging) this._slide(hq, hq.charging, 0, 0, pull * travel);
      }
    }
    // feed cover (belt-fed), cylinder (revolver), break action
    if (K.open >= 0) {
      const o = kf(t, [[K.open, 0], [K.open + 0.22, 1], [(K.close > 0 ? K.close : dur) - 0.16, 1], [K.close > 0 ? K.close : dur, 0]]);
      if (hq.cover) this._rot(hq, hq.cover, -1.15 * o, 0, 0);
      if (hq.brk) this._rot(hq, hq.brk, -0.5 * o, 0, 0);
      if (hq.cyl && kind === 'cyl') { this._slide(hq, hq.cyl, -0.042 * o, -0.014 * o, 0); this._rot(hq, hq.cyl, 0, 0, o * 1.0 + (hq.cylA || 0)); }
    }
    // the magazine: in the gun until released, then carried by the hand (the fresh one comes back up with it)
    if (hq.mag && hq.magRest) {
      const m = hq.mag;
      m.position.copy(hq.magRest.p); m.quaternion.copy(hq.magRest.q);
      if (free) {
        if (kind === 'drop' && t >= K.magOut && !hq._dropped) { hq._dropped = true; this._dropMag(w); }
        const carried = t >= tLow && t < K.magIn;
        m.visible = kind === 'drop' ? (t < K.magOut || t >= tLow) : kind === 'rocket' ? t >= tLow : carried;
        if (carried) { m.position.add(_hqA.copy(hand.p).sub(atMag.p)); if (kind === 'rocket') m.position.z -= 0; }
        if ((kind === 'cyl' || kind === 'break') && t >= K.magIn) m.visible = false;
      } else if (t >= K.magOut && t < K.magIn) {
        const k = t < tLow ? smoothstep(0, 1, (t - K.magOut) / Math.max(0.05, tLow - K.magOut)) : t < tUp ? 1 : 1 - smoothstep(0, 1, (t - tUp) / Math.max(0.05, K.magIn - tUp));
        m.position.add(_hqA.copy(hand.p).sub(atMag.p));
        if (P.magTilt) m.quaternion.premultiply(_hqQ.setFromAxisAngle(_hqB.set(1, 0, 0), P.magTilt * k * D2R));
        // empty reloads: the old magazine is let go and falls away; the fresh one comes up from the vest
        if (K.empty && kind === 'mag') {
          if (t > K.magOut + 0.14 && !hq._dropped) { hq._dropped = true; this._dropMag(w); }
          m.visible = !(hq._dropped && t < tLow + 0.04);
        } else m.visible = true;
      } else m.visible = true;
    }
  },

  // an ejected magazine: a copy of the magazine falls out of view
  _dropMag(w) {
    const hq = w.hq; if (!hq.mag) return;
    const c = hq.mag.clone(true); c.visible = true;
    hq.root.add(c);
    hq.drop = { o: c, v: new THREE.Vector3(rand(-0.25, 0.05), -0.4, rand(0.05, 0.3)), rv: new THREE.Vector3(rand(-3, 3), rand(-1, 1), rand(-4, 4)), life: 0.7 };
  },
  _dropUpdate(hq, dt) {
    const dr = hq.drop; if (!dr) return;
    dr.life -= dt; dr.v.y -= 6.5 * dt;
    dr.o.position.addScaledVector(dr.v, dt); dr.o.rotation.x += dr.rv.x * dt; dr.o.rotation.y += dr.rv.y * dt; dr.o.rotation.z += dr.rv.z * dt;
    if (dr.life <= 0) { hq.root.remove(dr.o); hq.drop = null; }
  },

  // left-hand frames for the bolt catch / charging handle / slide (weapon space)
  _boltFrame(w) {
    const hq = w.hq, st = hq.boltStyle, sight = hq.info.sightY || 0.06;
    if (st === 'catch') {
      // bolt catch on the left of the receiver, just above the magazine well: the palm slaps it
      const fing = new THREE.Vector3(0, 0.25, -1).normalize(), palmAt = hq.magPos.clone().add(new THREE.Vector3(-0.03, 0.065, 0.03));
      const grab = { p: palmAt.clone().addScaledVector(fing, -0.07).add(new THREE.Vector3(-0.02, 0, 0)), q: this._frame(_hqB.set(0, 0, 0), _hqC.set(1, 0, 0), fing).q };
      return { grab, pulled: { p: grab.p.clone().add(new THREE.Vector3(0.016, 0.004, 0)), q: grab.q } };
    }
    const cp = hq.chargePos || new THREE.Vector3(-0.02, sight + 0.02, 0.06);
    let grab;
    if (st === 'slide') grab = this._frame(new THREE.Vector3(-0.03, cp.y + 0.03, cp.z + 0.07), _hqB.set(0.5, -0.86, 0), _hqC.set(0.3, 0.1, -1));
    else if (Math.abs(cp.x) < 0.012) grab = this._frame(new THREE.Vector3(cp.x - 0.045, cp.y + 0.018, cp.z + 0.055), _hqB.set(0.55, -0.83, 0), _hqC.set(0.55, 0.05, -0.83));
    else grab = this._frame(new THREE.Vector3(cp.x - 0.03, cp.y - 0.012, cp.z + 0.07), _hqB.set(1, 0.2, 0), _hqC.set(0.2, 0.1, -1));
    return { grab, pulled: { p: grab.p.clone().add(new THREE.Vector3(0, 0.004, st === 'slide' ? 0.034 : 0.07)), q: grab.q } };
  },

  // ---------- shots ----------
  onShot(w) {
    const hq = w.hq; if (!hq) return;
    const d = w.def;
    if (hq.magKind === 'cyl') hq.cylTarget = (hq.cylTarget || 0) + Math.PI / 3;
    if (d.bolt || d.pump) return; // cycled by hand
    hq.boltDur = Math.min(0.09, 60 / d.rpm * 0.9); hq.boltT = hq.boltDur;
    if (w.mag === 0 && hq.slide) hq.slideLock = true;
  },
  onReloadStart(w) { if (w.hq) { w.hq._dropped = false; w.hq.shell = null; } },
  cancelReload(w) {
    const hq = w.hq; if (!hq) return;
    hq.shell = null; hq.handLFrame = null; hq.handRFrame = null;
    if (hq.drop) { hq.root.remove(hq.drop.o); hq.drop = null; }
    if (hq.mag && hq.magRest) { hq.mag.position.copy(hq.magRest.p); hq.mag.quaternion.copy(hq.magRest.q); hq.mag.visible = hq.magKind !== 'cyl' && hq.magKind !== 'break'; }
    for (const o of [hq.cover, hq.brk, hq.cyl, hq.bolt, hq.charging, hq.pump]) {
      const rest = hq.rest.get(o); if (rest) { o.position.copy(rest.p); o.quaternion.copy(rest.q); }
    }
  },
  onReloaded(w) { if (w.hq) w.hq.slideLock = false; },

  // ---------- arms ----------
  // after VM.pose is placed: wrist targets in camera space from the weapon-space hand frames
  arms(w) {
    const hq = w.hq; if (!hq || !FPARMS.ready) return;
    const gm = w.model.matrixWorld;
    const toT = (f, curl, trig) => {
      const p = f.p.clone().applyMatrix4(gm);
      const q = _hqQ.setFromRotationMatrix(_hqM.extractRotation(gm)).multiply(f.q);
      return { pos: p, x: new THREE.Vector3(1, 0, 0).applyQuaternion(q), y: new THREE.Vector3(0, 1, 0).applyQuaternion(q), z: new THREE.Vector3(0, 0, 1).applyQuaternion(q), curl, trigger: trig };
    };
    const melee = w.def.cls === 'melee';
    const R = toT(hq.handRFrame || hq.frameR, hq.handRFrame ? 0.7 : melee ? 1.0 : 0.85, hq.handRFrame || melee ? undefined : (mouseFire && !w.reloading ? 1 : 0));
    if (R.trigger === undefined) delete R.trigger;
    const L = toT(hq.handLFrame || hq.frameL, hq.handLFrame ? 0.95 : melee ? 0.4 : 0.72);
    delete L.trigger;
    FPARMS.update(R, L, w.def.cls !== 'pistol' || w.reloading);
  }
};
const _hqM = new THREE.Matrix4(), _hqQ = new THREE.Quaternion(), _hqE = new THREE.Euler();
const _hqA = new THREE.Vector3(), _hqB = new THREE.Vector3(), _hqC = new THREE.Vector3(), _hqD = new THREE.Vector3();

// ---------- equipment: grenades (G), launcher projectiles, smoke ----------
const EQUIP = {
  TYPES: { frag: { label: 'FRAG', fuse: 2.2, color: 0x3a4430 }, flash: { label: 'FLASHBANG', fuse: 1.4, color: 0x8a8f96 }, smoke: { label: 'SMOKE', fuse: 1.2, color: 0x5a6a5a } },
  // two throwables: LETHAL (G) and TACTICAL (T), each with its own count; `active` is the one the inventory wheel and
  // the touch GREN button throw
  counts: { lethal: 2, tactical: 2 }, max: 2, allot: null, active: 'lethal', throwT: 0, thrown: false, throwing: 'lethal', smokes: [], rockets: [],
  get count() { return this.counts[this.active] || 0; },
  // a new game: Team Deathmatch and Endless roll 5-10 of each throwable (AMMO_RULES), the other modes carry two
  newGame() { this.allot = typeof AMMO_RULES !== 'undefined' ? AMMO_RULES.grenades() : null; this.reset(); },
  reset() { this.counts.lethal = this.allot ? this.allot.lethal : this.max; this.counts.tactical = this.allot ? this.allot.tactical : this.max; this.throwT = 0; for (const r of this.rockets) scene.remove(r.m); this.rockets.length = 0; this.smokes.length = 0; this.updateHUD(); },
  type(slot) {
    const k = typeof LOADOUT !== 'undefined' ? LOADOUT[slot || this.throwing] : null;
    return this.TYPES[k] ? k : (slot || this.throwing) === 'tactical' ? 'flash' : 'frag';
  },
  select(slot) { if (slot === 'lethal' || slot === 'tactical') { this.active = slot; this.updateHUD(); if (typeof TOUCH !== 'undefined' && TOUCH.updateSlots) TOUCH.updateSlots(); } },
  updateHUD() {
    let el = document.getElementById('grenadeHUD');
    if (!el) { const hud = document.getElementById('hud'); if (!hud) return; el = document.createElement('div'); el.id = 'grenadeHUD'; el.className = 'mono'; hud.appendChild(el); }
    const part = (slot, key) => `<span class="${slot === this.active ? 'act' : ''}${this.counts[slot] > 0 ? '' : ' none'}">${key} ${this.TYPES[this.type(slot)].label} ×${this.counts[slot]}</span>`;
    el.innerHTML = part('lethal', 'G') + part('tactical', 'T');
    el.classList.toggle('empty', this.counts.lethal + this.counts.tactical <= 0);
  },
  // throw: the gun dips while the arm swings, the grenade leaves at ~0.3 s along the view
  tryThrow(slot) {
    slot = slot || this.active;
    const w = INVENTORY.curW();
    if (this.counts[slot] <= 0) { SFX.dry(); return; }
    if (this.throwT > 0 || G.cine || (player.prone && player.speed2d > 0.4) || (typeof MELEE_P !== 'undefined' && MELEE_P.t > 0) || (w && w.reloading)) return;
    this.counts[slot]--; this.throwing = slot; this.throwT = 0.7; this.thrown = false; ads = false; SFX.grenadePin(); this.updateHUD(); cancelPendingShot(w);
    if (typeof TOUCH !== 'undefined' && TOUCH.updateSlots) TOUCH.updateSlots();
  },
  update(dt) {
    if (this.throwT > 0) {
      this.throwT -= dt;
      if (!this.thrown && this.throwT < 0.42) { this.thrown = true; this._release(); }
    }
    this._updateSmokes(dt); this._updateRockets(dt);
  },
  // 0..1 weight of the throw pose (gun lowered and turned away)
  pose() { if (!(this.throwT > 0)) return 0; const u = 1 - this.throwT / 0.7; return Math.sin(Math.min(1, u * 1.1) * Math.PI); },
  _release() {
    const kind = this.type(), T = this.TYPES[kind];
    camera.updateMatrixWorld(true);
    const from = camera.localToWorld(new THREE.Vector3(0.12, -0.05, -0.35)), dir = new THREE.Vector3(0, 0.18, -1).applyQuaternion(camera.quaternion).normalize();
    const m = new THREE.Mesh(grenGeo, grenMat.clone()); m.material.color.setHex(T.color); m.castShadow = true; m.position.copy(from); scene.add(m);
    const vel = dir.multiplyScalar(17).add(new THREE.Vector3(player.vel.x, 2.2, player.vel.z));
    grenades.push({ m, fuse: T.fuse, warned: true, src: 'player', vel, kind });
    AudioSys.noise(0.12, 0.14, 1200);
  },
  // non-frag grenades (called from updateGrenades); returns true when handled
  detonate(g) {
    const p = g.m.position.clone();
    if (g.kind === 'flash') {
      explodeSmall(p);
      const eye = new THREE.Vector3(player.pos.x, player.pos.y + player.eye, player.pos.z), d = eye.distanceTo(p);
      if (d < 22 && hasLOS(eye, p.clone().setY(p.y + 0.2))) {
        const f = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion), facing = f.dot(p.clone().sub(eye).normalize());
        POST.grade.uniforms.flash.value = Math.max(POST.grade.uniforms.flash.value, clamp((facing + 0.3) * (1 - d / 24) * 1.6, 0.15, 1.2));
      }
      for (const e of enemies) {
        if (e.dead || e.team === 'blue') continue;
        const he = e.g.position.clone().setY(e.g.position.y + 1.5);
        if (he.distanceTo(p) < 14 && hasLOS(he, p.clone().setY(p.y + 0.2))) { hitReaction(e, 'chest', true); e.stagger = Math.max(e.stagger, 2.6); e.losCache = false; e.suppressT = 4; }
      }
      SFX.explosion(p);
      return true;
    }
    if (g.kind === 'smoke') {
      this.smokes.push({ p: p.setY(p.y + 0.3), r: 0.5, t: 0, life: 15, emit: 0 });
      AudioSys.noise(1.4, 0.25, 700);
      return true;
    }
    return false;
  },
  _updateSmokes(dt) {
    for (let i = this.smokes.length - 1; i >= 0; i--) {
      const s = this.smokes[i]; s.t += dt; s.r = Math.min(5.2, 0.5 + s.t * 1.6);
      s.emit -= dt;
      if (s.t < s.life - 3 && s.emit <= 0) {
        s.emit = 0.09;
        const q = s.p.clone().add(new THREE.Vector3(rand(-1, 1) * s.r * 0.6, rand(0, 1.6), rand(-1, 1) * s.r * 0.6));
        const sm = fxSprite('smoke', 0xb8bcb4, rand(2.4, 3.6), q, { opacity: 0.85 });
        addParticle(sm, rand(4, 6), 'smoke', { grav: -0.15, vel: new THREE.Vector3(rand(-0.6, 0.6), rand(0.1, 0.4), rand(-0.6, 0.6)), grow: 0.25, op: 0.85 });
      }
      if (s.t > s.life) this.smokes.splice(i, 1);
    }
  },
  // does a sight line pass through a smoke cloud?
  blocks(a, b) {
    for (const s of this.smokes) {
      if (s.t > s.life - 2) continue;
      const ab = _eqV.subVectors(b, a), L = ab.length(); if (L < 1e-3) continue;
      ab.multiplyScalar(1 / L);
      const t = clamp(_eqV2.subVectors(s.p, a).dot(ab), 0, L), c = _eqV2.copy(a).addScaledVector(ab, t);
      if (c.distanceTo(s.p) < s.r && Math.abs(c.y - s.p.y - 0.8) < 2.4) return true;
    }
    return false;
  },
  // launcher round: rocket (straight, fast) or 40 mm grenade (arcing)
  fireProjectile(w, from, dir) {
    const rocket = w.def.launcher !== 'grenade';
    const body = new THREE.Group();
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, rocket ? 0.5 : 0.1, 10), MATLIB.plain(rocket ? 0x4a5240 : 0x6a6a52, { rough: 0.6, metal: 0.4 }));
    tube.rotation.x = Math.PI / 2; body.add(tube);
    // (Object3D.lookAt turns +Z toward the flight direction: the warhead leads, the motor burns at the back)
    if (rocket) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.16, 10), MATLIB.plain(0x3a4232, { rough: 0.5, metal: 0.5 })); cone.rotation.x = Math.PI / 2; cone.position.z = 0.32; body.add(cone);
      const fl = new THREE.Sprite(new THREE.SpriteMaterial({ map: ASSETS.fx.explosion, color: 0xffc070, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
      fl.scale.set(0.75, 0.75, 1); fl.position.z = -0.38; body.add(fl); body.userData.flame = fl;
    }
    body.position.copy(from); body.lookAt(from.clone().add(dir)); scene.add(body);
    this.rockets.push({ m: body, vel: dir.clone().multiplyScalar(rocket ? 58 : 46), grav: rocket ? 0 : 9.8, life: 6, rocket, trailT: 0, blast: clamp(w.def.blast || 1, 0.8, 1.6) });
    // launch: backblast behind the shooter, a smoke puff at the muzzle
    for (let i = 0; i < (rocket ? 10 : 4); i++) {
      const back = rocket && i < 7, q = from.clone().addScaledVector(dir, back ? -rand(0.8, 2.6) : rand(0.2, 0.9)).add(new THREE.Vector3(rand(-0.4, 0.4), rand(-0.2, 0.4), rand(-0.4, 0.4)));
      const sm = fxSprite('smoke', 0xcfc8bc, rand(0.8, 1.6), q, { opacity: 0.75 });
      addParticle(sm, rand(1.4, 2.6), 'smoke', { grav: -0.3, grow: 1.1, op: 0.75, vel: dir.clone().multiplyScalar(back ? -rand(3, 7) : rand(0.5, 2)).add(new THREE.Vector3(rand(-1, 1), rand(0, 0.8), rand(-1, 1))) });
    }
    if (rocket) { const fb = fxSprite('explosion', 0xffb060, 1.6, from.clone().addScaledVector(dir, -1.2), { additive: true }); addParticle(fb, 0.18, 'boom', { grow: 1.5, op: 1 }); }
    G.camShake += rocket ? 0.16 : 0.07;
  },
  _updateRockets(dt) {
    for (let i = this.rockets.length - 1; i >= 0; i--) {
      const r = this.rockets[i], p = r.m.position;
      r.life -= dt; r.vel.y -= r.grav * dt;
      const step = r.vel.length() * dt, dir = _eqV.copy(r.vel).normalize();
      const hit = traceShot(p, dir, step + 0.1);
      if (hit.point || r.life <= 0) {
        explode(hit.point ? hit.point.clone().addScaledVector(dir, -0.2) : p.clone(), (r.rocket ? 1.15 : 1) * (r.blast || 1), 'player', { big: true });
        scene.remove(r.m); this.rockets.splice(i, 1); continue;
      }
      p.addScaledVector(r.vel, dt); r.m.lookAt(_eqV2.copy(p).add(r.vel));
      if (r.m.userData.flame) { const f = r.m.userData.flame; f.material.rotation = Math.random() * 6.28; f.scale.setScalar(rand(0.6, 0.95)); }
      r.trailT -= dt;
      if (r.trailT <= 0) {
        r.trailT = 0.025;
        const sm = fxSprite('smoke', 0xd8d4cc, r.rocket ? 0.8 : 0.32, p.clone(), { opacity: 0.65 });
        addParticle(sm, r.rocket ? 2.4 : 1.0, 'smoke', { grav: -0.2, grow: 1.25, op: 0.65, vel: new THREE.Vector3(rand(-0.3, 0.3), rand(0, 0.3), rand(-0.3, 0.3)) });
        if (r.rocket) { const fl = fxSprite('explosion', 0xffb060, 0.6, p.clone(), { additive: true }); addParticle(fl, 0.1, 'flash'); }
      }
    }
  }
};
const _eqV = new THREE.Vector3(), _eqV2 = new THREE.Vector3();
// small bang (flashbang): flash without the fragmentation damage
function explodeSmall(pos) {
  const fl = fxSprite('explosion', 0xffffff, 3.2, pos.clone().add(new THREE.Vector3(0, 0.4, 0)), { additive: true });
  addParticle(fl, 0.22, 'boom', { grow: 1.6, op: 1 });
  lightPulse(pos.clone().setY(pos.y + 1), 0xffffff, 14, 26, 0.25);
}
// smoke clouds block sight lines (hostile line of sight, sniper perches)
{ const _los = hasLOS; hasLOS = function (a, b) { return !EQUIP.blocks(a, b) && _los(a, b); }; }
