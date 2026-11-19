// ---------- Gunsmith families I: rifles, carbines, submachine guns, machine guns ----------
// Each family builds one weapon layout from the entry's parameters `p` and records its anchors in b.a:
//   len, muzzle, bore, optic {y, z, grp}, under {y, z}, side {x, y, z}, fore (left-hand point), foreKind,
//   mag / magLen / magKind, irons {fz, rz, y}, brass, boltStyle, chargePos, gripKind
const GSF = {};
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

// ----- AR-pattern: carbines, rifles, PDWs, designated-marksman and support variants -----
GSF.ar = function (b, p) {
  const M = b.M, F = b.F, by = b.by = 0.046, hgLen = p.hgLen || 0.26, style = p.hg || 'mlok';
  const hz0 = -0.155, hz1 = hz0 - hgLen, hy = by + 0.004;
  b.prof([[0.05, 0.034], [0.05, 0.006], [0.024, 0.0], [-0.072, 0.0], [-0.072, -0.036], [-0.14, -0.046], [-0.148, 0.034]], 0.03, M, null, { bev: 0.002 });
  b.prof([[0.05, 0.034], [0.05, 0.072], [0.036, 0.078], [-0.155, 0.078], [-0.155, 0.034]], 0.032, M, null, { bev: 0.003 });
  b.box(0.034, 0.042, 0.014, 0, by, 0.05, M);
  // ejection port, dust cover, case deflector, forward assist
  b.box(0.0016, 0.016, 0.056, 0.0162, 0.057, -0.086, 'dark'); b.box(0.003, 0.004, 0.06, 0.0168, 0.0465, -0.086, M);
  b.prof([[-0.052, 0.05], [-0.036, 0.066], [-0.03, 0.05]], 0.006, M, null, { x: 0.0185, bev: 0.001 });
  b.rod(0.0066, [0.017, 0.058, 0.018], [0.027, 0.052, 0.046], M); b.ball(0.0074, 0.028, 0.0515, 0.048, 'blued');
  b.grp('bolt', 0, 0.057, -0.086); b.box(0.0012, 0.012, 0.05, 0.0176, 0.057, -0.086, 'bare', 'bolt');
  b.grp('charge', 0, 0.072, 0.052); b.box(0.036, 0.006, 0.014, 0, 0.073, 0.06, 'blued', 'charge'); b.box(0.012, 0.006, 0.03, 0, 0.073, 0.044, 'blued', 'charge');
  const rt = GSP.rail(b, 0.044, -0.155, 0.078);
  GSP.controls(b, 0.0152, 0.012, 0.012, -0.062);
  b.box(0.004, 0.022, 0.012, -0.0165, 0.03, -0.078, 'blued'); b.cylX(0.0034, 0.033, 0, 0.014, -0.138, 'blued', null, 8);
  GSP.guard(b, -0.07, -0.022, 0, M); GSP.grip(b, p.grip || 'ar', F);
  // handguard
  let underY = hy - 0.026;
  if (style === 'quad') {
    b.tube(0.0215, hz0, hz1, hy, M, null, { seg: 8, rot: Math.PI / 8 });
    GSP.rail(b, hz0, hz1 + 0.004, 0.078);
    for (const r of [Math.PI / 2, -Math.PI / 2, Math.PI]) GSP.rail(b, hz0 - 0.012, hz1 + 0.006, hy + 0.0195, { rot: r, axisY: hy });
    underY = hy - 0.028;
  } else if (style === 'round') {
    b.tube(0.0275, hz0 - 0.012, hz1 + 0.012, hy, F, null, { seg: 14, r2: 0.0235 });
    for (let i = 0; i < 7; i++) { const k = (i + 0.5) / 7, z = hz0 - 0.02 - k * (hgLen - 0.04); b.tube(0.0278 - k * 0.004, z, z - 0.003, hy, 'dark', null, { seg: 14 }); }
    b.tube(0.0285, hz0, hz0 - 0.014, hy, M, null, { r2: 0.025 }); b.tube(0.0245, hz1 + 0.012, hz1 + 0.003, hy, M);
  } else {
    const mat = style === 'slim' ? F : M;
    b.tube(0.0236, hz0, hz1, hy, mat, null, { seg: 8, sy: 1.1, rot: Math.PI / 8 });
    b.tube(0.0258, hz0 + 0.002, hz0 - 0.014, hy, M, null, { seg: 16 });
    GSP.rail(b, hz0, hz1 + 0.004, 0.078);
    const n = Math.max(2, Math.floor(hgLen / 0.05));
    b.slots(hz0 - 0.035, hz1 + 0.03, hy, 0.0222, n, 0.03, 0.007);
    for (let i = 0; i < n; i++) b.box(0.007, 0.0016, 0.03, 0, hy - 0.0244, hz0 - 0.035 - (hz1 + 0.065 - hz0) * -i / Math.max(1, n - 1), 'dark');
    for (let i = 0; i < n; i++) for (const s of [1, -1]) b.box(0.006, 0.0016, 0.028, s * 0.0162, hy + 0.0175, hz0 - 0.035 + (hz1 + 0.065 - hz0) * i / Math.max(1, n - 1), 'dark', null, 0, 0, -s * 0.785);
  }
  // barrel and muzzle
  const br = p.br || 0.0086, zb = hz1 - (p.bExt === undefined ? 0.09 : p.bExt);
  b.tube(br, hz1 + 0.03, zb, by, 'blued');
  if (style === 'round') b.box(0.018, 0.02, 0.022, 0, by + 0.012, hz1 - 0.03, M);
  const mz = GSP.muzzle(b, p.mz || 'bird', zb, by, br);
  // sights
  if (style === 'round') { GSP.irons(b, 'post', hz1 - 0.03, 0.02, rt + 0.032, by + 0.02); GSP.irons(b, 'flip', 0, 0.02, rt, 0, 'r'); }
  else GSP.irons(b, 'flip', hz1 + 0.03, 0.02, rt);
  GSP.stock(b, p.stock || 'm4', 0.056, by);
  GSP.mag(b, p.mag || 'stanag', -0.108, -0.04);
  if (p.bipod) GSP.bipod(b, hz1 + 0.05, underY, false);
  Object.assign(b.a, { len: -mz, muzzle: V3(0, by, mz), bore: br, optic: { y: rt, z: p.optZ || -0.05 }, under: p.bipod ? null : { y: underY, z: hz0 - hgLen * 0.58 },
    side: { x: 0.035, y: hy + 0.002, z: hz1 + 0.05 }, fore: V3(0, underY, hz0 - hgLen * 0.5), brass: V3(0.022, 0.057, -0.086), boltStyle: 'catch', chargePos: V3(0, 0.074, 0.06) });
};

// ----- AK-pattern: rifles, carbines, light support guns, a box-fed shotgun, a marksman rifle -----
GSF.ak = function (b, p) {
  const M = b.M, F = b.F, by = b.by = 0.043, L = p.len || 0.6, sg = !!p.sg, br = sg ? 0.0115 : (p.br || 0.0078);
  const hz1 = -0.19 - (p.hgLen || 0.17), helix = p.mag === 'helix';
  b.prof([[0.036, 0.004], [0.036, 0.046], [-0.19, 0.046], [-0.19, 0.008], [-0.172, 0.0], [0.03, 0.0]], 0.032, M, null, { bev: 0.002 });
  b.prof([[0.034, 0.046], [0.03, 0.056], [0.012, 0.0635], [-0.16, 0.0635], [-0.186, 0.056], [-0.19, 0.046]], 0.03, M, null, { bev: 0.005, bs: 2 });
  for (let i = 0; i < 3; i++) b.box(0.022, 0.0016, 0.004, 0, 0.0637, -0.03 - i * 0.045, 'dark');
  for (const z of [0.02, -0.06, -0.16]) { b.cylX(0.0028, 0.0012, 0.0162, 0.012, z, 'blued', null, 6); b.cylX(0.0028, 0.0012, -0.0162, 0.012, z, 'blued', null, 6); }
  b.box(0.026, 0.02, 0.05, 0, 0.056, -0.215, M);
  // handguard
  if (p.hg === 'rail') {
    b.tube(0.0225, -0.19, hz1, by + 0.008, M, null, { seg: 8, rot: Math.PI / 8, sy: 1.15 });
    GSP.rail(b, -0.2, hz1 + 0.004, by + 0.033); b.slots(-0.22, hz1 + 0.03, by + 0.008, 0.0212, 3, 0.03, 0.007);
  } else if (helix) {
    b.tube(0.0165, -0.19, hz1, by + 0.012, F, null, { sx: 1.1, sy: 1.5 });
  } else {
    b.prof([[-0.19, 0.01], [-0.19, 0.046], [hz1, 0.046], [hz1, 0.022], [hz1 + 0.03, 0.012]], 0.04, F, null, { bev: 0.007, bs: 2 });
    b.tube(0.0165, -0.24, hz1 + 0.01, by + 0.024, F, null, { sx: 1.05 });
    b.slots(-0.225, hz1 + 0.035, 0.036, 0.0202, 3, 0.022, 0.004);
  }
  b.tube(0.0072, hz1 + 0.012, hz1 - 0.05, by + 0.026, M); b.box(0.02, 0.036, 0.024, 0, by + 0.013, hz1 - 0.05, M);
  b.tube(br, -0.19, -L, by, 'blued'); b.tube(0.0024, hz1, -L + 0.05, by - br - 0.006, 'blued');
  const mz = GSP.muzzle(b, p.mz || 'slant', -L, by, br);
  GSP.irons(b, 'notch', -L + 0.045, -0.2, by + 0.04, by + br);
  let optic = { y: 0.072, z: -0.075 };
  if (b.kit.optic || p.rail) GSP.rail(b, 0.02, -0.17, 0.0635);
  // bolt carrier with its handle, ejection port, selector
  b.box(0.0012, 0.014, 0.07, 0.0162, 0.05, -0.105, 'dark');
  b.grp('bolt', 0, 0.05, -0.105); b.box(0.0012, 0.011, 0.085, 0.0172, 0.05, -0.105, 'bare', 'bolt');
  b.cylX(0.0048, 0.024, 0.028, 0.05, -0.14, M, 'bolt', 8); b.ball(0.0062, 0.041, 0.05, -0.14, M, 'bolt');
  b.box(0.0022, 0.012, 0.085, 0.0168, 0.022, -0.03, 'blued', null, 0.1);
  GSP.grip(b, p.grip || 'ak', F); GSP.guard(b, -0.085, -0.02, 0, M); b.box(0.008, 0.02, 0.006, 0, -0.012, -0.09, M);
  if (helix) GSP.mag(b, 'helix', -0.29, 0.012); else GSP.mag(b, p.mag || (sg ? 'sgbox' : 'ak'), sg ? -0.135 : -0.128, 0.0);
  const st = p.stock || 'wood';
  if (st === 'thumb') {
    b.prof([[0.036, 0.046], [0.3, 0.03], [0.306, -0.09], [0.28, -0.096], [0.07, -0.05], [0.036, 0.0]], 0.036, F, null, { bev: 0.008, bs: 2, hole: [[0.08, 0.02], [0.21, 0.01], [0.24, -0.04], [0.1, -0.03]] });
    b.box(0.038, 0.126, 0.008, 0, -0.03, 0.31, 'rubber'); b.prof([[0.1, 0.034], [0.22, 0.03], [0.22, 0.05], [0.1, 0.054]], 0.03, F, null, { bev: 0.006 });
  } else if (st !== 'none') GSP.stock(b, st, 0.036, st === 'wood' || st === 'fixed' ? by - 0.006 : by - 0.004, M, F);
  if (p.bipod) GSP.bipod(b, -L + 0.09, by - br, false);
  Object.assign(b.a, { len: -mz, muzzle: V3(0, by, mz), bore: br, optic, under: helix || p.bipod ? null : { y: p.hg === 'rail' ? by - 0.018 : 0.011, z: (-0.19 + hz1) / 2 - 0.02 },
    side: { x: 0.033, y: 0.032, z: hz1 + 0.04 }, fore: helix ? V3(0, -0.046, -0.29) : V3(0, 0.008, (-0.19 + hz1) / 2), brass: V3(0.022, 0.05, -0.105), boltStyle: 'side', chargePos: V3(0.041, 0.05, -0.14) });
};

// ----- bullpups: magazine behind the grip -----
GSF.bullpup = function (b, p) {
  const M = b.M, F = b.F, by = b.by = 0.05, L = p.len || 0.42, st = p.style || 'aug', top = 0.084, rear = 0.34;
  let fore, foreKind, under = null, rt;
  if (st === 'tavor') {
    b.prof([[-0.2, 0.03], [-0.2, top], [rear, top], [rear + 0.012, 0.06], [rear + 0.012, -0.072], [rear - 0.02, -0.08], [0.21, -0.03], [0.07, -0.03], [0.045, 0.0], [-0.03, 0.0], [-0.07, 0.014]], 0.046, F, null, { bev: 0.008, bs: 2 });
    b.prof([[-0.04, 0.0], [-0.078, -0.1], [0.07, -0.112], [0.075, -0.03], [0.06, -0.03], [0.056, -0.098], [-0.064, -0.09], [-0.03, 0.0]], 0.016, F, null, { bev: 0.003 });
    b.slots(-0.09, -0.18, 0.056, 0.0232, 3, 0.03, 0.012);
    b.tube(0.013, -0.2, -0.24, by, M); fore = V3(0, 0.022, -0.13); under = { y: 0.03, z: -0.14 };
    rt = GSP.rail(b, rear - 0.08, -0.195, top);
  } else if (st === 'famas') {
    b.prof([[-0.19, 0.02], [-0.19, top - 0.004], [rear, top - 0.004], [rear + 0.01, 0.06], [rear + 0.01, -0.07], [rear - 0.02, -0.076], [0.23, -0.028], [0.05, -0.024], [0.03, 0.0], [-0.03, 0.0], [-0.06, 0.012]], 0.044, F, null, { bev: 0.008, bs: 2 });
    // carry handle: two side plates and a top bar, sights inside the channel
    for (const s of [1, -1]) b.prof([[-0.2, top - 0.004], [-0.186, 0.134], [0.11, 0.134], [0.132, top - 0.004]], 0.004, F, null, { x: s * 0.014, bev: 0.001, hole: [[-0.176, top + 0.004], [-0.17, 0.122], [0.1, 0.122], [0.114, top + 0.004]] });
    b.box(0.032, 0.005, 0.3, 0, 0.1345, -0.038, F);
    b.rod(0.004, [0.024, 0.07, -0.19], [0.024, 0.06, -0.36], M); b.rod(0.004, [-0.024, 0.07, -0.19], [-0.024, 0.06, -0.36], M);
    b.tube(0.014, -0.19, -0.25, by, M); fore = V3(0, 0.016, -0.14);
    if (b.kit.optic) rt = GSP.rail(b, 0.09, -0.17, 0.137);
    else { rt = 0.137; b.box(0.0018, 0.014, 0.0018, 0, 0.105, -0.165, 'bare'); b.box(0.014, 0.004, 0.004, 0, 0.096, -0.165, M); for (const s of [1, -1]) b.box(0.004, 0.012, 0.004, s * 0.0052, 0.108, 0.085, M); b.box(0.016, 0.004, 0.004, 0, 0.1, 0.085, M); b.a.irons = { fz: -0.165, rz: 0.085, y: 0.112 }; }
  } else {
    b.prof([[-0.11, 0.02], [-0.11, top - 0.004], [rear, top - 0.004], [rear + 0.01, 0.06], [rear + 0.01, -0.07], [rear - 0.02, -0.076], [0.24, -0.026], [0.048, -0.022], [0.03, 0.0], [-0.03, 0.0]], 0.044, F, null, { bev: 0.008, bs: 2 });
    b.prof([[-0.03, 0.002], [-0.068, -0.008], [-0.08, -0.1], [0.012, -0.108], [0.012, -0.098], [-0.068, -0.092], [-0.058, -0.014], [-0.03, -0.008]], 0.014, F, null, { bev: 0.003 });
    b.tube(0.0155, -0.11, -0.21, by, M, null, { seg: 14 });
    b.prof([[-0.148, by - 0.014], [-0.14, by - 0.104], [-0.168, by - 0.104], [-0.178, by - 0.014]], 0.027, F, null, { bev: 0.007, bs: 2 });
    fore = V3(0, by - 0.06, -0.16); foreKind = 'vgrip';
    rt = GSP.rail(b, 0.12, -0.105, top - 0.004);
  }
  if (st !== 'famas') GSP.irons(b, 'flip', st === 'tavor' ? -0.17 : -0.09, 0.1, rt);
  b.box(0.04, 0.132, 0.01, 0, -0.004, rear + (st === 'tavor' ? 0.018 : 0.016), 'rubber');
  const br = p.br || 0.0082;
  b.tube(br, -0.2, -L, by, 'blued');
  const mz = GSP.muzzle(b, p.mz || 'bird', -L, by, br);
  if (p.bipod) GSP.bipod(b, -L + 0.1, by - br, false);
  GSP.grip(b, 'ar', F);
  if (st === 'famas') GSP.guard(b, -0.06, -0.022, 0, F);
  else b.prof([[-0.036, 0.002], [-0.041, -0.012], [-0.046, -0.024], [-0.042, -0.026], [-0.034, -0.012], [-0.03, 0.002]], 0.006, 'blued', null, { bev: 0.001 });
  // magazine behind the grip, ejection port, charging handle
  const mzc = st === 'tavor' ? 0.14 : 0.165, my = st === 'tavor' ? -0.032 : -0.03;
  b.box(0.036, 0.016, 0.078, 0, my + 0.006, mzc, F);
  GSP.mag(b, p.mag || 'pmag', mzc, my);
  b.box(0.0016, 0.016, 0.056, 0.0226, 0.058, mzc + 0.03, 'dark'); b.grp('bolt', 0, 0.058, mzc + 0.03); b.box(0.0012, 0.012, 0.05, 0.0238, 0.058, mzc + 0.03, 'bare', 'bolt');
  const cz = st === 'famas' ? -0.02 : -0.07, cy = st === 'famas' ? 0.094 : 0.066, cx = st === 'famas' ? 0 : -0.026;
  b.grp('charge', cx, cy, cz);
  if (st === 'famas') b.box(0.02, 0.012, 0.022, 0, cy, cz, 'polymer', 'charge'); else { b.cylX(0.0055, 0.02, cx - 0.006, cy, cz, M, 'charge', 8); b.ball(0.007, cx - 0.017, cy, cz, 'polymer', 'charge'); }
  Object.assign(b.a, { len: -mz, muzzle: V3(0, by, mz), bore: br, optic: { y: rt, z: st === 'famas' ? -0.04 : 0.0 }, under, side: { x: 0.034, y: by + 0.012, z: st === 'aug' ? -0.14 : -0.16 },
    fore, foreKind, brass: V3(0.028, 0.058, mzc + 0.03), boltStyle: 'charging', chargePos: V3(cx - 0.017, cy, cz) });
};

// ----- modular rifles: monolithic railed upper, polymer lower, folding stock -----
GSF.modular = function (b, p) {
  const st = p.style || 'scar', M = b.M, F = b.F, by = b.by = 0.047, L = p.len || 0.62, fz = -(p.upLen || 0.38), UM = st === 'g36' ? F : M;
  b.prof([[0.06, 0.03], [0.06, 0.08], [fz, 0.08], [fz, 0.05], [fz + 0.03, 0.03]], 0.036, UM, null, { bev: 0.004 });
  let rt = GSP.rail(b, 0.055, fz + 0.005, 0.08);
  b.prof([[0.055, 0.03], [0.055, 0.004], [0.026, 0.0], [-0.074, 0.0], [-0.074, -0.034], [-0.142, -0.044], [-0.148, 0.03]], 0.03, F, null, { bev: 0.003 });
  b.prof([[-0.148, 0.03], [-0.148, 0.012], [fz + 0.02, 0.012], [fz + 0.002, 0.03]], 0.034, UM, null, { bev: 0.004 });
  const n = Math.max(2, Math.floor((-0.19 - fz) / 0.05));
  b.slots(-0.19, fz + 0.05, 0.043, 0.0182, n, 0.03, 0.009);
  if (st === 'scar') for (const r of [Math.PI / 2, -Math.PI / 2]) GSP.rail(b, fz + 0.13, fz + 0.01, by + 0.018, { rot: r, axisY: by + 0.008 });
  if (st === 'g36') {
    // carry handle with a sight channel
    for (const s of [1, -1]) b.prof([[-0.2, rt - 0.008], [-0.18, 0.136], [0.03, 0.136], [0.05, rt - 0.008]], 0.004, F, null, { x: s * 0.014, bev: 0.001, hole: [[-0.172, rt], [-0.166, 0.124], [0.02, 0.124], [0.034, rt]] });
    b.box(0.032, 0.005, 0.215, 0, 0.1365, -0.075, F);
    if (b.kit.optic) rt = GSP.rail(b, 0.02, -0.17, 0.139); else { rt = 0.139; b.box(0.0018, 0.014, 0.0018, 0, 0.108, -0.16, 'bare'); b.box(0.014, 0.004, 0.004, 0, 0.099, -0.16, F); for (const s of [1, -1]) b.box(0.004, 0.012, 0.004, s * 0.0052, 0.111, 0.02, F); b.box(0.016, 0.004, 0.004, 0, 0.103, 0.02, F); b.a.irons = { fz: -0.16, rz: 0.02, y: 0.115 }; }
  } else GSP.irons(b, 'flip', fz + 0.03, 0.03, rt);
  const br = p.br || 0.0088;
  b.tube(br, fz + 0.03, -L, by, 'blued'); b.box(0.02, 0.022, 0.03, 0, by + 0.015, fz - 0.03, M);
  const mz = GSP.muzzle(b, p.mz || 'brake', -L, by, br);
  b.box(0.0016, 0.016, 0.06, 0.0182, 0.058, -0.085, 'dark'); b.grp('bolt', 0, 0.058, -0.085); b.box(0.0012, 0.012, 0.052, 0.0194, 0.058, -0.085, 'bare', 'bolt');
  const cz = st === 'g36' ? -0.1 : fz + 0.18, cy = st === 'g36' ? rt - 0.05 : 0.064, cx = st === 'g36' ? 0 : -0.024;
  if (st === 'g36') { b.grp('charge', 0, cy, cz); b.box(0.014, 0.008, 0.03, 0, cy, cz, 'polymer', 'charge'); }
  else { b.cylX(0.005, 0.02, cx - 0.008, cy, cz, M, 'bolt', 8); b.ball(0.0065, cx - 0.018, cy, cz, 'polymer', 'bolt'); }
  GSP.grip(b, 'ergo', F); GSP.guard(b, -0.072, -0.022, 0, F); GSP.controls(b, 0.0152, 0.01, 0.012, -0.064);
  GSP.mag(b, p.mag || (st === 'g36' ? 'g36' : 'pmag'), -0.108, -0.039);
  GSP.stock(b, p.stock || (st === 'g36' ? 'skel' : 'boot'), 0.06, by);
  if (p.bipod) GSP.bipod(b, fz + 0.03, 0.012, false);
  Object.assign(b.a, { len: -mz, muzzle: V3(0, by, mz), bore: br, optic: { y: rt, z: st === 'g36' ? -0.075 : -0.06 }, under: p.bipod ? null : { y: 0.012, z: (fz - 0.148) / 2 - 0.02 },
    side: { x: st === 'scar' ? 0.04 : 0.032, y: by + 0.008, z: fz + 0.05 }, fore: V3(0, 0.01, (fz - 0.148) / 2), brass: V3(0.024, 0.058, -0.085), boltStyle: st === 'g36' ? 'charging' : 'side', chargePos: V3(cx - 0.018, cy, cz) });
};

// ----- tube-receiver guns with a forward cocking handle: 9 mm SMGs and a .30 battle rifle -----
GSF.hk = function (b, p) {
  const M = b.M, F = b.F, by = b.by = 0.05, long = !!p.long, L = p.len || (long ? 0.72 : 0.42);
  const rz1 = long ? -0.25 : -0.2, mzc = long ? -0.118 : -0.108, cz1 = rz1 - (long ? 0.2 : 0.15);
  b.tube(0.0215, 0.07, rz1, by, M, null, { seg: 16 }); b.box(0.038, 0.04, 0.012, 0, by, 0.074, M);
  b.prof([[0.06, 0.032], [0.06, 0.004], [0.026, 0.0], [-0.07, 0.0], [-0.076, 0.032]], 0.03, F, null, { bev: 0.004 });
  b.prof([[mzc + 0.03, 0.034], [mzc + 0.03, -0.014], [mzc - 0.032, -0.02], [mzc - 0.036, 0.034]], 0.03, M, null, { bev: 0.002 });
  b.tube(0.012, rz1, cz1, by + 0.03, M); b.box(0.0016, 0.006, 0.09, -0.012, by + 0.03, cz1 + 0.06, 'dark');
  b.grp('charge', -0.014, by + 0.03, cz1 + 0.04); b.cylX(0.0055, 0.03, -0.026, by + 0.03, cz1 + 0.04, M, 'charge', 8); b.ball(0.008, -0.043, by + 0.03, cz1 + 0.04, 'polymer', 'charge');
  b.tube(0.0078, rz1, -L, by, 'blued');
  let mz;
  if (p.sd) {
    // integral suppressor in place of the handguard
    b.tube(0.0205, rz1 - 0.004, -L, by, 'blued', null, { seg: 18 }); b.tube(0.0225, rz1 - 0.004, rz1 - 0.15, by - 0.002, F, null, { seg: 18 });
    for (let i = 0; i < 4; i++) b.tube(0.021, -L + 0.03 + i * 0.03, -L + 0.026 + i * 0.03, by, 'dark', null, { seg: 18 });
    b.tube(0.006, -L + 0.001, -L - 0.001, by, 'dark'); mz = -L; b.a.suppressed = true;
  } else {
    b.tube(0.021, rz1 - 0.004, cz1 + 0.012, by - 0.004, F, null, { seg: 14, sy: 1.25, sx: 0.95 });
    b.slots(rz1 - 0.03, cz1 + 0.035, by - 0.004, 0.0198, 3, 0.02, 0.005);
    mz = GSP.muzzle(b, p.mz || (long ? 'bird' : 'thread'), -L, by, 0.0078);
  }
  // hooded front post, rear drum sight
  const fz = cz1 - 0.012;
  if (!b.kit.optic) {
    b.tube(0.016, fz + 0.007, fz - 0.007, by + 0.03, M, null, { open: true, seg: 16 }); b.box(0.014, 0.016, 0.014, 0, by + 0.01, fz, M);
    b.box(0.0018, 0.018, 0.0018, 0, by + 0.0235, fz, 'bare');
    b.box(0.026, 0.01, 0.03, 0, by + 0.0255, 0.035, M); for (const s of [1, -1]) b.box(0.006, 0.012, 0.006, s * 0.0062, by + 0.0345, 0.035, M);
    b.a.irons = { fz, rz: 0.035, y: by + 0.0325 };
  } else { b.box(0.014, 0.016, 0.014, 0, by + 0.01, fz, M); }
  let optic = { y: by + 0.03, z: -0.045 };
  if (b.kit.optic) GSP.rail(b, 0.05, -0.14, by + 0.0215, { w: 0.02 });
  b.box(0.0016, 0.014, 0.05, 0.0212, by + 0.004, mzc, 'dark'); b.grp('bolt', 0, by, mzc); b.box(0.0012, 0.01, 0.044, 0.0224, by + 0.004, mzc, 'bare', 'bolt');
  GSP.grip(b, 'slim', F); GSP.guard(b, -0.07, -0.02, 0, F);
  GSP.mag(b, p.mag || (long ? 'box308' : 'curve9'), mzc, -0.016);
  const st = p.stock || 'wire';
  if (st === 'wire') GSP.stock(b, 'wire', 0.074, by); else if (st !== 'none') GSP.stock(b, st, 0.078, by, M, F);
  Object.assign(b.a, { len: -mz, muzzle: V3(0, by, mz), bore: 0.0078, optic, under: p.sd ? null : { y: by - 0.03, z: (rz1 + cz1) / 2 },
    side: { x: 0.031, y: by, z: cz1 + 0.035 }, fore: V3(0, by - (p.sd ? 0.024 : 0.03), (rz1 + cz1) / 2), brass: V3(0.026, by + 0.004, mzc), boltStyle: 'charging', chargePos: V3(-0.043, by + 0.03, cz1 + 0.04) });
};

// ----- box-receiver machine pistols and compact SMGs -----
GSF.boxsmg = function (b, p) {
  const M = b.M, F = b.F, st = p.style || 'uzi';
  const S = {
    uzi:   { by: 0.042, rear: 0.105, front: -0.2, top: 0.068, bot: 0.016, hw: 0.044, L: 0.27, body: M, fore: 'block', magIn: true, mag: 'stick', ch: 'top' },
    mac:   { by: 0.046, rear: 0.07, front: -0.15, top: 0.08, bot: 0.012, hw: 0.05, L: 0.2, body: M, fore: 'strap', magIn: true, mag: 'stick', ch: 'top' },
    mp7:   { by: 0.046, rear: 0.13, front: -0.2, top: 0.074, bot: 0.012, hw: 0.042, L: 0.25, body: F, fore: 'fold', magIn: true, mag: 'stick', ch: 'rear', rail: true },
    mp9:   { by: 0.044, rear: 0.1, front: -0.17, top: 0.07, bot: 0.012, hw: 0.04, L: 0.2, body: F, fore: 'molded', magIn: true, mag: 'stick', ch: 'side', rail: true },
    tec:   { by: 0.05, rear: 0.09, front: -0.13, top: 0.07, bot: 0.03, hw: 0.038, L: 0.3, body: F, fore: 'shroud', magIn: false, mag: 'stick', ch: 'side' },
    skorp: { by: 0.04, rear: 0.07, front: -0.14, top: 0.062, bot: 0.014, hw: 0.036, L: 0.2, body: M, fore: 'none', magIn: false, mag: 'curve9', ch: 'side' }
  }[st];
  const by = b.by = S.by, L = p.len || S.L, top = S.top;
  b.prof([[S.rear, S.bot], [S.rear, top], [S.front, top], [S.front, S.bot]], S.hw, S.body, null, { bev: 0.004, bs: 2 });
  b.box(0.0016, 0.012, 0.045, S.hw / 2 + 0.0002, by + 0.004, -0.05, 'dark'); b.grp('bolt', 0, by, -0.05); b.box(0.0012, 0.009, 0.04, S.hw / 2 + 0.0012, by + 0.004, -0.05, 'bare', 'bolt');
  b.tube(0.013, S.front + 0.004, S.front - 0.018, by, M); b.tube(0.0075, S.front, -L, by, 'blued');
  let fore = V3(0, S.bot - 0.004, (S.front + -0.08) / 2), foreKind, under = null;
  if (S.magIn) {
    b.prof([[-0.024, S.bot], [-0.028, -0.105], [0.024, -0.105], [0.03, S.bot]], 0.036, F, null, { bev: 0.006, bs: 2 });
    for (let i = 0; i < 4; i++) b.box(0.0375, 0.002, 0.03, 0, -0.03 - i * 0.018, 0.0, 'dark');
    GSP.guard(b, -0.085, -0.027, S.bot, M, 0.04);
    GSP.mag(b, p.mag || S.mag, 0.0, -0.105, null, { h: st === 'mp7' ? 0.045 : 0.075, ins: 0.1 });
  } else {
    GSP.grip(b, 'slim', F); GSP.guard(b, -0.066, -0.02, S.bot, M, 0.032 + S.bot);
    b.box(0.03, 0.03, 0.05, 0, S.bot - 0.01, -0.092, S.body); GSP.mag(b, p.mag || S.mag, -0.092, S.bot - 0.022, null, { h: st === 'skorp' ? 0.1 : 0.14 });
    fore = V3(0, S.bot - 0.07, -0.094); foreKind = 'vgrip';
  }
  if (S.fore === 'block') { b.prof([[-0.088, S.bot + 0.004], [-0.088, S.bot - 0.03], [S.front + 0.01, S.bot - 0.03], [S.front + 0.01, S.bot + 0.004]], 0.046, F, null, { bev: 0.007, bs: 2 }); for (let i = 0; i < 5; i++) b.box(0.047, 0.022, 0.003, 0, S.bot - 0.014, -0.1 - i * 0.02, 'dark'); fore = V3(0, S.bot - 0.03, -0.14); }
  else if (S.fore === 'fold') { b.prof([[-0.118, S.bot], [-0.11, S.bot - 0.09], [-0.138, S.bot - 0.09], [-0.148, S.bot]], 0.028, F, null, { bev: 0.007, bs: 2 }); fore = V3(0, S.bot - 0.05, -0.13); foreKind = 'vgrip'; }
  else if (S.fore === 'molded') { b.prof([[-0.08, S.bot], [-0.094, S.bot - 0.07], [-0.122, S.bot - 0.07], [-0.15, S.bot]], 0.032, F, null, { bev: 0.007, bs: 2 }); fore = V3(0, S.bot - 0.04, -0.112); foreKind = 'vgrip'; }
  else if (S.fore === 'strap') { b.prof([[-0.11, S.bot], [-0.118, S.bot - 0.085], [-0.14, S.bot - 0.085], [-0.146, S.bot], [-0.14, S.bot], [-0.136, S.bot - 0.078], [-0.122, S.bot - 0.078], [-0.116, S.bot]], 0.03, 'rubber', null, { bev: 0.002 }); fore = V3(0, S.bot - 0.05, -0.128); foreKind = 'vgrip'; }
  else if (S.fore === 'shroud') { b.tube(0.0175, S.front - 0.018, -L + 0.03, by, M, null, { seg: 14 }); for (let i = 0; i < 4; i++) for (let k = 0; k < 6; k++) { const an = k / 6 * 6.283 + i * 0.5; b.box(0.006, 0.0014, 0.008, Math.sin(an) * 0.0175, by + Math.cos(an) * 0.0175, S.front - 0.035 - i * 0.03, 'dark', null, 0, 0, -an); } }
  // cocking handle
  const cp = S.ch === 'top' ? V3(0, top + 0.007, -0.1) : S.ch === 'rear' ? V3(0, top - 0.008, S.rear + 0.008) : V3(-S.hw / 2 - 0.012, by + 0.012, -0.08);
  b.grp('charge', cp.x, cp.y, cp.z);
  if (S.ch === 'top') { b.box(0.02, 0.012, 0.022, 0, cp.y, cp.z, 'polymer', 'charge'); b.box(0.004, 0.0122, 0.0224, 0, cp.y + 0.001, cp.z, 'dark', 'charge'); }
  else if (S.ch === 'rear') { b.box(0.04, 0.008, 0.012, 0, cp.y, cp.z, M, 'charge'); }
  else { b.cylX(0.005, 0.02, cp.x + 0.004, cp.y, cp.z, M, 'charge', 8); b.ball(0.0068, cp.x, cp.y, cp.z, 'polymer', 'charge'); }
  // sights
  let rt = top;
  if (S.rail || b.kit.optic) { rt = GSP.rail(b, S.rear - 0.012, S.front + 0.012, top, { w: 0.02 }); GSP.irons(b, 'flip', S.front + 0.03, S.rear - 0.03, rt); }
  else {
    const fz = S.front + 0.02, rz = S.rear - 0.03, sy = top + 0.016;
    b.box(0.0018, 0.016, 0.0018, 0, top + 0.008, fz, 'bare'); for (const s of [1, -1]) { b.box(0.0026, 0.02, 0.01, s * 0.008, top + 0.01, fz, M); b.box(0.005, 0.02, 0.006, s * 0.0058, top + 0.01, rz, M); }
    b.a.irons = { fz, rz, y: sy };
  }
  const mz = GSP.muzzle(b, p.mz || 'thread', -L, by, 0.0075);
  const stock = p.stock || 'none';
  if (stock !== 'none') GSP.stock(b, stock, S.rear, by + 0.006, M, F);
  Object.assign(b.a, { len: -mz, muzzle: V3(0, by, mz), bore: 0.0075, optic: { y: rt, z: (S.rear + S.front) / 2 + 0.02 }, under,
    side: { x: S.hw / 2 + 0.014, y: by + 0.008, z: S.front + 0.04 }, fore, foreKind, brass: V3(S.hw / 2 + 0.006, by + 0.004, -0.05), boltStyle: 'charging', chargePos: cp });
};

// ----- personal defence weapon: thumbhole shell, horizontal magazine on top -----
GSF.pdw = function (b, p) {
  const M = b.M, F = b.F, by = b.by = 0.04, L = p.len || 0.3;
  b.prof([[-0.21, 0.0], [-0.21, 0.058], [0.29, 0.058], [0.3, 0.04], [0.3, -0.09], [0.27, -0.1], [-0.13, -0.106], [-0.152, -0.09], [-0.162, -0.02]], 0.05, F, null, { bev: 0.009, bs: 2,
    holes: [[[-0.108, -0.006], [-0.028, -0.006], [-0.012, -0.084], [-0.098, -0.084]], [[0.048, -0.006], [0.16, -0.006], [0.2, -0.05], [0.2, -0.084], [0.062, -0.084]]] });
  b.prof([[-0.034, -0.008], [-0.039, -0.022], [-0.044, -0.034], [-0.04, -0.036], [-0.032, -0.022], [-0.028, -0.008]], 0.006, 'blued', null, { bev: 0.001 });
  // magazine on top
  b.grp('mag', 0, 0.07, 0.04);
  b.box(0.04, 0.022, 0.25, 0, 0.07, 0.04, 'smoke', 'mag'); b.box(0.042, 0.024, 0.012, 0, 0.07, 0.16, 'polymer', 'mag'); b.box(0.042, 0.024, 0.012, 0, 0.07, -0.082, 'polymer', 'mag');
  for (let i = 0; i < 12; i++) b.cylX(0.0036, 0.026, 0, 0.07, -0.06 + i * 0.018, 'brass', 'mag', 8);
  b.a.mag = V3(0, 0.07, 0.04); b.a.magLen = 0.03; b.a.magKind = 'top';
  // sight block and rail in front of the magazine
  b.prof([[-0.095, 0.058], [-0.1, 0.086], [-0.2, 0.086], [-0.21, 0.058]], 0.034, F, null, { bev: 0.005 });
  const rt = GSP.rail(b, -0.1, -0.2, 0.086, { w: 0.02 }); GSP.irons(b, 'flip', -0.188, -0.112, rt);
  b.tube(0.0115, -0.21, -0.25, by, M); b.tube(0.0075, -0.21, -L, by, 'blued');
  const mz = GSP.muzzle(b, p.mz || 'bird', -L, by, 0.0075);
  b.grp('charge', 0, 0.04, -0.15); for (const s of [1, -1]) { b.cylX(0.005, 0.012, s * 0.03, 0.04, -0.15, M, 'charge', 8); b.ball(0.0062, s * 0.037, 0.04, -0.15, 'polymer', 'charge'); }
  b.box(0.044, 0.126, 0.01, 0, -0.024, 0.304, 'rubber');
  b.a.gripKind = 'thumb';
  Object.assign(b.a, { len: -mz, muzzle: V3(0, by, mz), bore: 0.0075, optic: { y: rt, z: -0.15 }, under: null, side: { x: 0.038, y: 0.03, z: -0.17 },
    fore: V3(0, -0.05, -0.13), foreKind: 'vgrip', brass: V3(0.0, -0.1, 0.1), boltStyle: 'charging', chargePos: V3(-0.037, 0.04, -0.15) });
};

// ----- delayed-blowback carbine with the magazine well ahead of an angular lower -----
GSF.vec = function (b, p) {
  const M = b.M, F = b.F, by = b.by = 0.034, L = p.len || 0.33;
  b.prof([[0.09, 0.0], [0.09, 0.074], [-0.23, 0.074], [-0.23, 0.012], [-0.214, -0.03], [-0.2, -0.085], [-0.14, -0.085], [-0.125, -0.03], [-0.075, 0.0]], 0.044, F, null, { bev: 0.005, bs: 2 });
  const rt = GSP.rail(b, 0.085, -0.225, 0.074); GSP.irons(b, 'flip', -0.2, 0.06, rt);
  b.box(0.032, 0.032, 0.05, 0, by, -0.252, M); b.tube(0.0078, -0.23, -L, by, 'blued');
  const mz = GSP.muzzle(b, p.mz || 'thread', -L, by, 0.0078);
  GSP.mag(b, p.mag || 'stick45', -0.17, -0.083, null, { h: 0.1, ins: 0.08 });
  GSP.grip(b, 'ergo', F); GSP.guard(b, -0.075, -0.022, 0, F);
  b.box(0.0016, 0.014, 0.05, 0.0222, 0.05, -0.06, 'dark'); b.grp('bolt', 0, 0.05, -0.06); b.box(0.0012, 0.01, 0.044, 0.0234, 0.05, -0.06, 'bare', 'bolt');
  b.grp('charge', -0.024, 0.052, -0.16); b.box(0.008, 0.01, 0.03, -0.027, 0.052, -0.16, M, 'charge'); b.box(0.012, 0.012, 0.008, -0.034, 0.052, -0.172, 'polymer', 'charge');
  b.slots(-0.02, -0.12, 0.05, 0.0222, 4, 0.016, 0.02, 'dark', null, -1);
  GSP.stock(b, p.stock || 'skel', 0.09, 0.05, M, F);
  Object.assign(b.a, { len: -mz, muzzle: V3(0, by, mz), bore: 0.0078, optic: { y: rt, z: -0.06 }, under: null, side: { x: 0.036, y: 0.052, z: -0.2 },
    fore: V3(0, -0.04, -0.212), foreKind: 'vgrip', brass: V3(0.026, 0.05, -0.06), boltStyle: 'charging', chargePos: V3(-0.034, 0.052, -0.172) });
};

// ----- belt-fed machine guns: hinged feed cover, ammunition box, heavy barrel, bipod -----
GSF.belt = function (b, p) {
  const M = b.M, F = b.F, by = b.by = 0.05, L = p.len || 0.78, st = p.style || 'saw', jacket = st === 'mg3';
  b.prof([[0.08, 0.002], [0.08, 0.074], [-0.27, 0.074], [-0.27, 0.014], [-0.06, 0.002]], 0.046, M, null, { bev: 0.003 });
  b.grp('cover', 0, 0.076, -0.25);
  b.prof([[-0.04, 0.074], [-0.046, 0.094], [-0.24, 0.098], [-0.256, 0.074]], 0.05, M, 'cover', { bev: 0.004 });
  b.box(0.02, 0.006, 0.02, 0, 0.097, -0.058, 'blued', 'cover');
  const rt = GSP.rail(b, -0.075, -0.225, 0.097, { grp: 'cover' });
  b.box(0.03, 0.012, 0.075, -0.034, 0.066, -0.15, M);
  // ammunition box and the belt running up to the feed tray
  b.grp('mag', -0.03, 0.004, -0.15);
  if (p.drumBox) { b.cylX(0.064, 0.07, -0.064, 0.0, -0.15, p.boxMat || 'olive', 'mag', 20); b.cylX(0.02, 0.074, -0.064, 0.0, -0.15, 'steel', 'mag', 10); }
  else { b.box(0.085, 0.105, 0.15, -0.034, -0.052, -0.15, p.boxMat || 'olive', 'mag'); b.box(0.088, 0.008, 0.154, -0.034, 0.004, -0.15, p.boxMat || 'olive', 'mag'); b.box(0.02, 0.03, 0.156, -0.034, -0.05, -0.15, 'dark', 'mag'); }
  for (let i = 0; i < 5; i++) b.tube(0.0048, -0.122, -0.176, 0.014 + i * 0.012, 'brass', 'mag', { x: -0.042 + i * 0.002, seg: 8 });
  b.a.mag = V3(-0.034, 0.0, -0.15); b.a.magLen = 0.11; b.a.magKind = 'belt';
  // barrel group
  const br = 0.0115;
  b.tube(0.0125, -0.27, -L, by, 'blued', null, { r2: br });
  if (jacket) {
    b.tube(0.022, -0.27, -L + 0.07, by, M, null, { seg: 12 });
    for (let i = 0; i < 7; i++) for (const s of [1, -1]) b.box(0.0016, 0.012, 0.03, s * 0.0222, by, -0.31 - i * 0.05, 'dark');
  } else {
    b.prof([[-0.27, 0.012], [-0.27, 0.04], [-0.47, 0.04], [-0.47, 0.02], [-0.45, 0.012]], 0.052, F, null, { bev: 0.007, bs: 2 });
    b.prof([[-0.275, by + 0.016], [-0.275, by + 0.027], [-0.46, by + 0.027], [-0.46, by + 0.016]], 0.034, M, null, { bev: 0.003 });
    for (let i = 0; i < 5; i++) b.box(0.02, 0.0016, 0.022, 0, by + 0.0275, -0.3 - i * 0.035, 'dark');
    b.tube(0.0075, -0.47, -L + 0.16, by - 0.026, M); b.box(0.022, 0.04, 0.024, 0, by - 0.012, -L + 0.16, M);
  }
  b.rod(0.005, [0.018, by + 0.018, -0.34], [0.034, by + 0.06, -0.34], M); b.rod(0.0075, [0.034, by + 0.06, -0.39], [0.034, by + 0.06, -0.29], 'polymer');
  GSP.bipod(b, -L + (jacket ? 0.12 : 0.2), by - (jacket ? 0.022 : 0.03), false);
  const mz = GSP.muzzle(b, p.mz || 'cone', -L, by, br);
  // sights: rear on the receiver, hooded front post
  if (!b.kit.optic) { GSP.irons(b, 'post', -L + 0.06, 0.05, 0.112, by + 0.011); b.box(0.03, 0.02, 0.03, 0, 0.084, 0.05, M); for (const s of [1, -1]) b.box(0.004, 0.012, 0.005, s * 0.0052, 0.108, 0.05, M); b.box(0.016, 0.008, 0.005, 0, 0.098, 0.05, M); }
  b.grp('charge', 0.024, 0.03, -0.12); b.box(0.014, 0.012, 0.03, 0.03, 0.03, -0.12, M, 'charge'); b.cylX(0.006, 0.022, 0.046, 0.03, -0.12, 'polymer', 'charge', 8);
  b.box(0.0016, 0.014, 0.05, 0.0232, 0.02, -0.19, 'dark');
  GSP.grip(b, 'ar', F); GSP.guard(b, -0.07, -0.022, 0.002, M);
  GSP.stock(b, p.stock || (jacket ? 'fixed' : 'skel'), 0.08, by, M, F);
  Object.assign(b.a, { len: -mz, muzzle: V3(0, by, mz), bore: br, optic: { y: rt, z: -0.15, grp: 'cover' }, under: null, side: { x: jacket ? 0.036 : 0.04, y: jacket ? by : 0.03, z: -0.44 },
    fore: V3(0, jacket ? by - 0.022 : 0.008, -0.37), brass: V3(0.028, 0.02, -0.19), boltStyle: 'side', chargePos: V3(0.05, 0.03, -0.12) });
};

// ----- rotary support gun: six spinning barrels, carried low on two handles -----
GSF.rotary = function (b, p) {
  const M = b.M, by = b.by = 0.02;
  b.tube(0.066, 0.06, -0.2, by, 'olive', null, { seg: 18 }); b.tube(0.07, 0.07, 0.05, by, M, null, { seg: 18 }); b.tube(0.07, -0.19, -0.21, by, M, null, { seg: 18 });
  b.box(0.1, 0.07, 0.16, 0, by + 0.06, -0.06, M); b.box(0.06, 0.05, 0.12, 0.07, by + 0.01, -0.04, 'steel');
  b.grp('barrels', 0, by, -0.2);
  for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283; b.tube(0.011, -0.2, -0.8, by + Math.sin(a) * 0.036, 'blued', 'barrels', { x: Math.cos(a) * 0.036, seg: 10 }); b.tube(0.007, -0.7995, -0.801, by + Math.sin(a) * 0.036, 'dark', 'barrels', { x: Math.cos(a) * 0.036, seg: 10 }); }
  for (const z of [-0.33, -0.52, -0.72]) b.tube(0.052, z, z - 0.014, by, M, 'barrels', { seg: 18 });
  b.tube(0.012, -0.2, -0.76, by, M, 'barrels');
  b.tube(0.058, -0.74, -0.79, by, M, 'barrels', { open: true, seg: 18 });
  // rear spade grip (origin) and the top carry handle
  b.box(0.03, 0.03, 0.09, 0, 0.012, 0.03, M); GSP.grip(b, 'ar', 'polymer');
  b.rod(0.008, [0, by + 0.09, -0.12], [0, by + 0.16, -0.12], M); b.rod(0.008, [0, by + 0.09, 0.0], [0, by + 0.16, 0.0], M); b.rod(0.0125, [0, by + 0.16, -0.14], [0, by + 0.16, 0.02], 'rubber', null, 12);
  // feed chute and ammunition pack
  b.grp('mag', -0.1, -0.06, 0.02);
  for (let i = 0; i < 6; i++) b.box(0.04, 0.05, 0.03, -0.075 - i * 0.012, by - 0.02 - i * 0.022, -0.02 + i * 0.014, 'steel', 'mag', 0, 0, 0.5);
  b.box(0.12, 0.15, 0.2, -0.16, -0.19, 0.08, 'olive', 'mag');
  b.a.mag = V3(-0.12, -0.1, 0.04); b.a.magLen = 0.15; b.a.magKind = 'belt';
  Object.assign(b.a, { len: 0.8, muzzle: V3(0, by, -0.81), bore: 0.036, optic: null, under: null, side: null, fore: V3(0, by + 0.16, -0.06), foreKind: 'top', brass: V3(0.08, by - 0.03, -0.04),
    boltStyle: 'none', chargePos: V3(0.07, by + 0.02, -0.04), barrels: 'barrels', irons: { fz: -0.5, rz: 0, y: by + 0.2 } });
};
