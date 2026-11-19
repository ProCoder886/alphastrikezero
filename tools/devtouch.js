// Dev helper: synthetic touch input for testing the touch controls (pointer events).
//   TT.down(el, x, y, id) / TT.move(el, x, y, id) / TT.up(el, x, y, id)
//   await TT.suite() -> list of "name: ok / FAIL ..." lines
window.TT = {
  ev(type, el, x, y, id) {
    el.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: id || 1, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y, button: 0, buttons: type === 'pointerup' ? 0 : 1 }));
  },
  down(el, x, y, id) { this.ev('pointerdown', el, x, y, id); },
  move(el, x, y, id) { this.ev('pointermove', el, x, y, id); },
  up(el, x, y, id) { this.ev('pointerup', el, x, y, id); },
  btn(a) { return document.querySelector('#touchUI .tb[data-a="' + a + '"]'); },
  center(el) { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; },
  tap(a, hold) { const el = this.btn(a), [x, y] = this.center(el); this.down(el, x, y, 20); if (hold) hold(); this.up(el, x, y, 20); },
  frames(n) { for (let i = 0; i < n; i++) frame(1 / 30); },
  async suite() {
    const out = [], chk = (n, c, extra) => out.push(n + ': ' + (c ? 'ok' : 'FAIL ' + (extra || '')));
    const W = innerWidth, H = innerHeight, zm = document.getElementById('tzMove'), zl = document.getElementById('tzLook');
    chk('layer visible', !document.getElementById('touchUI').classList.contains('hidden'));
    // joystick: touch low-left, push forward
    const mr = zm.getBoundingClientRect(), sx = mr.left + mr.width * 0.3, sy = mr.top + mr.height * 0.7;
    this.down(zm, sx, sy, 1); this.move(zm, sx, sy - 14, 1);
    chk('stick small push walks slowly', TOUCH.my > 0 && TOUCH.my < 0.6 && !TOUCH.sprint, JSON.stringify([TOUCH.mx, TOUCH.my]));
    this.move(zm, sx, sy - 120, 1); this.frames(2);
    chk('stick full push sprints', TOUCH.my > 0.95 && TOUCH.sprint, JSON.stringify([TOUCH.mx, TOUCH.my, TOUCH.sprint]));
    const p0 = player.pos.clone(); this.frames(30);
    chk('player moved forward', player.pos.distanceTo(p0) > 1.5, player.pos.distanceTo(p0).toFixed(2));
    this.move(zm, sx + 120, sy, 1); chk('stick right', TOUCH.mx > 0.9, TOUCH.mx);
    this.up(zm, sx, sy, 1); chk('stick release stops', TOUCH.mx === 0 && TOUCH.my === 0 && !TOUCH.sprint);
    // look
    const y0 = player.yaw, p1 = player.pitch;
    this.down(zl, W * 0.8, H * 0.3, 2); this.move(zl, W * 0.8 + 100, H * 0.3 + 40, 2); this.up(zl, W * 0.8 + 100, H * 0.3 + 40, 2);
    chk('look turns right and down', player.yaw < y0 - 0.2 && player.pitch < p1 - 0.05, [(y0 - player.yaw).toFixed(2), (p1 - player.pitch).toFixed(2)].join(','));
    // fire (hold) with drag-to-look
    const fire = this.btn('fire'), [fx, fy] = this.center(fire), mag0 = INVENTORY.curW().mag, y1 = player.yaw;
    this.down(fire, fx, fy, 3); chk('fire held', mouseFire === true); this.move(fire, fx - 40, fy, 3); chk('look while firing', player.yaw > y1 + 0.05, (player.yaw - y1).toFixed(2));
    this.frames(12); this.up(fire, fx, fy, 3); chk('fire released', mouseFire === false);
    chk('rounds fired', INVENTORY.curW().mag < mag0, mag0 + '->' + INVENTORY.curW().mag);
    // aim toggle / hold
    S.touchAim = 'toggle'; this.tap('aim'); chk('aim toggles on', ads === true); this.frames(25); chk('aim blends in', adsT > 0.9, adsT); this.tap('aim'); chk('aim toggles off', ads === false);
    S.touchAim = 'hold'; const am = this.btn('aim'), [ax, ay] = this.center(am); this.down(am, ax, ay, 4); chk('aim hold on', ads === true); this.up(am, ax, ay, 4); chk('aim hold release', ads === false); S.touchAim = 'toggle';
    this.frames(20);
    // reload
    const w = INVENTORY.curW(); w.mag = Math.min(w.mag, 10); this.tap('reload'); chk('reload starts', w.reloading === true); this.frames(Math.ceil(w.reloadDur * 30) + 6); chk('reload done', w.reloading === false && w.mag === w.def.mag, w.mag);
    // jump / crouch / prone
    player.vel.set(0, 0, 0); this.tap('jump', () => this.frames(2)); chk('jump leaves ground', player.vel.y > 0 || !player.onGround);
    this.frames(40);
    this.tap('crouch'); this.frames(2); chk('crouch on', player.crouch === true); this.tap('crouch'); this.frames(2); chk('crouch off', player.crouch === false);
    this.tap('prone'); this.frames(3); chk('prone on', player.prone === true); this.tap('prone'); this.frames(3); chk('prone off', player.prone === false);
    // weapons
    this.tap('next'); this.frames(2); chk('next switches weapon', INVENTORY.activeIdx === 1, INVENTORY.activeIdx);
    this.tap('swap'); this.frames(2); chk('swap returns to last', INVENTORY.activeIdx === 0, INVENTORY.activeIdx);
    this.tap('prev'); this.frames(2); chk('prev wraps to the last slot', INVENTORY.activeIdx === INVENTORY.slots.length - 1, INVENTORY.activeIdx);
    this.tap('inv'); this.frames(1); chk('inventory wheel opens', INVWHEEL.open === true);
    const it = INVWHEEL.list[1].el, [ix, iy] = this.center(it); it.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 9, clientX: ix, clientY: iy, bubbles: true })); it.dispatchEvent(new PointerEvent('pointerup', { pointerId: 9, clientX: ix, clientY: iy, bubbles: true })); this.frames(2);
    chk('tap in the wheel equips', INVWHEEL.open === false && INVENTORY.activeIdx === 1, INVENTORY.activeIdx);
    const rip = this.btn('reload'); const [rx, ry] = this.center(rip); this.down(rip, rx, ry, 6); chk('press shows a ripple', !!rip.querySelector('.rip')); this.up(rip, rx, ry, 6); this.frames(2); INVENTORY.curW().reloading = false;
    // night vision, grenade, melee
    this.tap('nv'); this.frames(3); chk('night vision toggles', NVG.on === true); this.tap('nv'); this.frames(3); chk('night vision off', NVG.on === false);
    const g0 = EQUIP.count; this.tap('gren'); this.frames(2); chk('grenade thrown', EQUIP.count === g0 - 1, g0 + '->' + EQUIP.count); this.frames(30);
    this.tap('melee'); this.frames(2); chk('butt strike starts', MELEE_P.t > 0 || MELEE_P.cd > 0); this.frames(30);
    // pause / resume
    this.tap('pause'); chk('pause shows menu', G.paused === true && !document.getElementById('pause').classList.contains('hidden'));
    document.getElementById('resumeBtn').click(); chk('resume continues', G.paused === false && document.getElementById('pause').classList.contains('hidden'));
    return out.join('\n');
  }
};
