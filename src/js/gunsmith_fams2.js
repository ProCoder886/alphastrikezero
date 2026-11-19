// ---------- Gunsmith families II: precision rifles, shotguns, pistols, launchers, melee + GUNSMITH.build ----------

// traditional butt with a wrist grip (rifles, shotguns, the single-shot launcher); z0 = rear of the receiver
function gsButt(b, z0, y, F, sawn) {
  if (sawn) b.prof([[z0 - 0.01, y + 0.01], [z0 + 0.03, y - 0.01], [z0 + 0.08, y - 0.06], [z0 + 0.09, y - 0.12], [z0 + 0.05, y - 0.13], [z0 + 0.01, y - 0.08], [z0 - 0.02, y - 0.04]], 0.04, F, null, { bev: 0.01, bs: 2 });
  else {
    b.prof([[z0 - 0.01, y + 0.01], [z0 + 0.03, y - 0.01], [z0 + 0.26, y - 0.02], [z0 + 0.266, y - 0.14], [z0 + 0.24, y - 0.146], [z0 + 0.06, y - 0.09], [z0, y - 0.086], [z0 - 0.025, y - 0.06], [z0 - 0.03, y - 0.04]], 0.042, F, null, { bev: 0.009, bs: 2 });
    b.box(0.044, 0.13, 0.012, 0, y - 0.08, z0 + 0.27, 'rubber');
  }
  b.a.gripKind = 'wrist';
}

// ----- bolt-action and self-loading precision rifles -----
GSF.rifle = function (b, p) {
  const st = p.stock || 'sporter';
  if (st === 'amr') return GSF._amr(b, p);
  const M = b.M, F = b.F, L = p.len || 0.78, bolt = p.action !== 'semi', chassis = st === 'chassis';
  const by = b.by = chassis ? 0.05 : 0.04, br = p.br || 0.0105, fe = -(p.fore || (chassis ? 0.42 : 0.36));
  if (!chassis) {
    if (st === 'thumb') b.prof([[fe, 0.008], [fe, 0.032], [0.03, 0.032], [0.07, 0.026], [0.11, 0.034], [0.33, 0.03], [0.336, -0.1], [0.31, -0.106], [0.2, -0.086], [0.07, -0.086], [0.045, -0.06], [0.02, -0.02], [-0.03, -0.014], [-0.12, -0.014]], 0.044, F, null,
      { bev: 0.01, bs: 2, hole: [[0.078, -0.004], [0.2, -0.004], [0.24, -0.04], [0.21, -0.066], [0.092, -0.066]] });
    else b.prof([[fe, 0.008], [fe, 0.032], [0.03, 0.032], [0.065, 0.016], [0.1, 0.024], [0.33, 0.016], [0.336, -0.104], [0.31, -0.11], [0.12, -0.05], [0.06, -0.05], [0.04, -0.03], [0.015, -0.016], [-0.03, -0.014], [-0.12, -0.014]], 0.044, F, null, { bev: 0.01, bs: 2 });
    b.box(0.046, 0.13, 0.012, 0, -0.044, 0.342, 'rubber');
    if (p.cheek) b.prof([[0.12, 0.026], [0.26, 0.022], [0.255, 0.05], [0.125, 0.054]], 0.036, 'polymer', null, { bev: 0.008, bs: 2 });
    b.a.gripKind = 'wrist';
  } else {
    b.prof([[0.06, 0.004], [0.06, 0.036], [-0.15, 0.036], [-0.15, 0.004]], 0.036, M, null, { bev: 0.003 });
    b.tube(0.024, -0.15, fe, by + 0.004, M, null, { seg: 8, rot: Math.PI / 8 });
    b.slots(-0.19, fe + 0.03, by + 0.004, 0.0225, Math.max(2, Math.floor((-0.15 - fe) / 0.05)), 0.03, 0.007);
    GSP.grip(b, 'ergo', F); GSP.stock(b, 'prs', 0.06, by - 0.012, M, F);
  }
  b.tube(0.0165, 0.075, -0.14, by, M, null, { seg: 16 });
  b.tube(0.0185, -0.14, -0.168, by, M, null, { seg: 16, r2: br + 0.003 });
  b.tube(br + 0.002, -0.165, -L, by, 'blued', null, { r2: br - 0.0015 });
  if (p.fluted) for (let i = 0; i < 6; i++) { const an = i / 6 * 6.283 + 0.5; b.box(0.003, 0.0012, (L - 0.3), Math.sin(an) * (br + 0.0005), by + Math.cos(an) * (br + 0.0005), (-0.2 - L + 0.1) / 2, 'dark', null, 0, 0, -an); }
  const mz = GSP.muzzle(b, p.mz || 'thread', -L, by, br - 0.0015);
  b.box(0.0016, 0.012, 0.07, 0.0162, by + 0.004, -0.05, 'dark');
  b.grp('bolt', 0, by, 0.03);
  b.tube(0.0095, 0.03, 0.085, by, 'bare', 'bolt', { seg: 12 }); b.tube(0.012, 0.076, 0.1, by, M, 'bolt', { seg: 12 }); b.box(0.0012, 0.009, 0.066, 0.0172, by + 0.004, -0.05, 'bare', 'bolt');
  let chargePos;
  if (bolt) { b.rod(0.0046, [0.012, by + 0.002, 0.04], [0.046, by - 0.02, 0.046], 'blued', 'bolt'); b.ball(0.0115, 0.05, by - 0.024, 0.047, p.knob || 'polymer', 'bolt'); chargePos = V3(0.05, by - 0.024, 0.047); }
  else { b.cylX(0.005, 0.022, 0.027, by + 0.004, -0.085, M, 'bolt', 8); chargePos = V3(0.038, by + 0.004, -0.085); }
  const rt = GSP.rail(b, 0.07, -0.135, by + 0.0158);
  GSP.guard(b, -0.085, -0.03, chassis ? 0.004 : -0.014, M);
  GSP.mag(b, p.mag || 'box308', -0.125, chassis ? 0.002 : -0.016);
  const uy = chassis ? by - 0.02 : 0.006;
  if (p.bipod) GSP.bipod(b, fe + 0.05, uy, !!p.bipodDown);
  // back-up sights for the self-loaders (the bolt guns are scope-only)
  if (!bolt && !b.kit.optic) GSP.irons(b, 'post', -L + 0.05, 0.04, rt + 0.032, by + br);
  if (!bolt && !b.kit.optic) GSP.irons(b, 'flip', 0, 0.04, rt, 0, 'r');
  Object.assign(b.a, { len: -mz, muzzle: V3(0, by, mz), bore: br - 0.0015, optic: { y: rt, z: -0.035 }, under: p.bipod ? null : { y: uy, z: fe + 0.12 }, side: { x: 0.035, y: by, z: fe + 0.06 },
    fore: V3(0, chassis ? by - 0.022 : 0.004, fe * 0.62), brass: V3(0.022, by + 0.004, -0.05), boltStyle: bolt ? 'boltAction' : 'side', chargePos });
};
// anti-materiel rifle: long ribbed receiver, heavy fluted barrel, big brake
GSF._amr = function (b, p) {
  const M = b.M, F = b.F, by = b.by = 0.056, L = p.len || 1.0, bolt = p.action === 'bolt';
  b.prof([[0.1, 0.03], [0.1, 0.086], [-0.42, 0.086], [-0.42, 0.03]], 0.05, M, null, { bev: 0.004 });
  b.slots(-0.2, -0.4, 0.058, 0.0252, 5, 0.03, 0.018);
  const rt = GSP.rail(b, 0.09, -0.3, 0.086);
  b.prof([[0.09, 0.03], [0.09, 0.0], [-0.07, 0.0], [-0.072, -0.03], [-0.19, -0.036], [-0.2, 0.03]], 0.04, M, null, { bev: 0.003 });
  b.prof([[0.1, 0.02], [0.1, 0.086], [0.31, 0.086], [0.32, 0.06], [0.32, -0.07], [0.3, -0.07], [0.27, 0.02]], 0.044, M, null, { bev: 0.004 });
  b.box(0.048, 0.16, 0.014, 0, 0.008, 0.327, 'rubber'); b.rod(0.007, [0, -0.07, 0.29], [0, -0.13, 0.29], M); b.cylY(0.014, 0.006, 0, -0.132, 0.29, 'rubber');
  b.prof([[0.12, 0.09], [0.26, 0.09], [0.255, 0.108], [0.125, 0.108]], 0.04, 'polymer', null, { bev: 0.006, bs: 2 });
  b.tube(0.0165, -0.42, -L, by, 'blued', null, { r2: 0.0135, seg: 16 });
  for (let i = 0; i < 6; i++) { const an = i / 6 * 6.283; b.box(0.004, 0.0012, L - 0.55, Math.sin(an) * 0.0152, by + Math.cos(an) * 0.0152, (-0.46 - L + 0.1) / 2, 'dark', null, 0, 0, -an); }
  const mz = GSP.muzzle(b, p.mz || 'heavy', -L, by, 0.0135);
  b.rod(0.005, [-0.03, 0.07, -0.36], [-0.05, 0.11, -0.36], M); b.rod(0.007, [-0.05, 0.11, -0.41], [-0.05, 0.11, -0.31], 'polymer');
  GSP.bipod(b, -0.45, 0.03, !!p.bipodDown);
  b.box(0.0016, 0.02, 0.1, 0.0252, 0.06, -0.1, 'dark'); b.grp('bolt', 0, 0.06, -0.1); b.box(0.0012, 0.016, 0.09, 0.0264, 0.06, -0.1, 'bare', 'bolt');
  if (bolt) { b.rod(0.005, [0.024, 0.062, -0.05], [0.058, 0.04, -0.044], 'blued', 'bolt'); b.ball(0.012, 0.062, 0.036, -0.043, 'polymer', 'bolt'); }
  else b.cylX(0.006, 0.03, 0.04, 0.06, -0.14, M, 'bolt', 8);
  GSP.grip(b, 'ar', F); GSP.guard(b, -0.07, -0.022, 0, M);
  GSP.mag(b, 'box50', -0.132, -0.032);
  Object.assign(b.a, { len: -mz, muzzle: V3(0, by, mz), bore: 0.0135, optic: { y: rt, z: -0.07 }, under: null, side: { x: 0.04, y: 0.058, z: -0.38 },
    fore: V3(0, 0.026, -0.3), brass: V3(0.03, 0.06, -0.1), boltStyle: bolt ? 'boltAction' : 'side', chargePos: bolt ? V3(0.062, 0.036, -0.043) : V3(0.055, 0.06, -0.14) });
};

// ----- tube-fed shotguns: pump or self-loading; traditional or pistol-grip furniture -----
GSF.tubesg = function (b, p) {
  const M = b.M, F = b.F, by = b.by = 0.046, L = p.len || 0.72, pump = p.action !== 'semi', pg = p.grip === 'pistol';
  const br = p.r || 0.0125, ty = by - br * 2 - 0.004;
  b.prof([[0.07, 0.002], [0.076, 0.05], [0.06, 0.064], [-0.16, 0.064], [-0.168, 0.0], [0.05, -0.002]], 0.044, M, null, { bev: 0.006, bs: 2 });
  b.box(0.03, 0.002, 0.075, 0, -0.0012, -0.09, 'dark');
  b.box(0.0016, 0.018, 0.06, 0.0222, by + 0.002, -0.07, 'dark'); b.grp('bolt', 0, by + 0.002, -0.07); b.box(0.0012, 0.014, 0.054, 0.0234, by + 0.002, -0.07, 'bare', 'bolt');
  b.tube(br, -0.16, -L, by, 'blued', null, { seg: 16 });
  const tz = p.ext ? -L + 0.02 : -L + 0.12;
  b.tube(br - 0.0005, -0.16, tz, ty, 'blued', null, { seg: 16 }); b.tube(br + 0.001, tz, tz - 0.012, ty, M, null, { seg: 16 });
  b.box(0.012, br * 4 + 0.012, 0.014, 0, (by + ty) / 2, tz + 0.03, M);
  const f0 = -0.24, f1 = -0.385;
  if (pump) {
    b.grp('pump', 0, ty, (f0 + f1) / 2);
    b.tube(br + 0.011, f0, f1, ty - 0.002, F, 'pump', { seg: 14, sy: 0.95 });
    for (let i = 0; i < 7; i++) b.tube(br + 0.0118, f0 - 0.014 - i * 0.018, f0 - 0.019 - i * 0.018, ty - 0.002, 'dark', 'pump', { seg: 14, sy: 0.95 });
    for (const s of [1, -1]) b.box(0.003, 0.006, 0.1, s * (br + 0.002), ty + 0.012, f0 + 0.05, M, 'pump');
  } else {
    b.prof([[-0.165, ty - 0.022], [-0.165, by + 0.004], [f1, by + 0.004], [f1, ty - 0.014], [f1 + 0.03, ty - 0.024]], 0.046, F, null, { bev: 0.008, bs: 2 });
    b.slots(-0.2, f1 + 0.03, ty + 0.004, 0.0232, 4, 0.03, 0.006);
    b.cylX(0.005, 0.02, 0.03, by + 0.002, -0.1, M, 'bolt', 8);
  }
  const mz = GSP.muzzle(b, 'none', -L, by, br);
  b.tube(br * 0.82, -L + 0.001, -L - 0.0012, by, 'dark', null, { seg: 16 });
  let rt = 0.064, optic = { y: 0.0725, z: -0.05 };
  if (p.rail || b.kit.optic) { rt = GSP.rail(b, 0.05, -0.15, 0.064); optic = { y: rt, z: -0.05 }; }
  if (!b.kit.optic) {
    // bead on a short post and a rear notch standing clear of the receiver, so the aimed eye looks over the top
    const sy = Math.max(by + br + 0.02, rt + 0.016);
    b.box(0.004, sy - by - br, 0.008, 0, (sy + by + br) / 2 - 0.002, -L + 0.012, M); b.ball(0.0034, 0, sy - 0.002, -L + 0.012, 'brass');
    b.box(0.022, sy - rt - 0.006, 0.01, 0, (sy - 0.006 + rt) / 2, 0.03, M); for (const s of [1, -1]) b.box(0.006, 0.008, 0.01, s * 0.0068, sy - 0.002, 0.03, M);
    b.a.irons = { fz: -L + 0.012, rz: 0.03, y: sy };
  }
  if (pg) { GSP.grip(b, 'ar', F); GSP.guard(b, -0.075, -0.022, 0, M); if (p.stock && p.stock !== 'none') GSP.stock(b, p.stock, 0.074, by - 0.004, M, F); else b.box(0.04, 0.05, 0.012, 0, 0.03, 0.078, M); }
  else { gsButt(b, 0.07, 0.04, F, false); GSP.guard(b, -0.08, -0.02, 0, M); }
  b.a.mag = V3(0, -0.006, -0.09); b.a.magLen = 0.02; b.a.magKind = 'shells';
  Object.assign(b.a, { len: -mz, muzzle: V3(0, by, mz), bore: br, optic, under: pump ? null : { y: ty - 0.024, z: -0.3 }, side: { x: 0.03, y: (by + ty) / 2, z: tz + 0.075 },
    fore: V3(0, ty - br - 0.012, (f0 + f1) / 2), brass: V3(0.027, by, -0.07), boltStyle: pump ? 'pump' : 'side', chargePos: V3(0.04, by + 0.002, -0.1) });
};
// bullpup pump shotgun: twin magazine tubes under the barrel
GSF.bullsg = function (b, p) {
  const M = b.M, F = b.F, by = b.by = 0.052, L = p.len || 0.44;
  b.prof([[-0.12, 0.02], [-0.12, 0.084], [0.34, 0.084], [0.35, 0.06], [0.35, -0.07], [0.32, -0.076], [0.24, -0.026], [0.05, -0.022], [0.03, 0.0], [-0.03, 0.0]], 0.05, F, null, { bev: 0.008, bs: 2 });
  b.box(0.044, 0.132, 0.01, 0, -0.004, 0.356, 'rubber');
  const rt = GSP.rail(b, 0.3, -0.115, 0.084); GSP.irons(b, 'flip', -0.1, 0.2, rt);
  b.tube(0.0128, -0.12, -L, by, 'blued', null, { seg: 16 });
  for (const s of [1, -1]) b.tube(0.012, -0.12, -L + 0.01, by - 0.028, 'blued', null, { x: s * 0.0125, seg: 14 });
  b.grp('pump', 0, by - 0.03, -0.26);
  b.prof([[-0.19, by - 0.012], [-0.19, by - 0.05], [-0.33, by - 0.05], [-0.33, by - 0.012]], 0.056, F, 'pump', { bev: 0.008, bs: 2 });
  b.prof([[-0.245, by - 0.05], [-0.238, by - 0.13], [-0.266, by - 0.13], [-0.276, by - 0.05]], 0.028, F, 'pump', { bev: 0.007, bs: 2 });
  const mz = GSP.muzzle(b, 'none', -L, by, 0.0128); b.tube(0.0105, -L + 0.001, -L - 0.0012, by, 'dark', null, { seg: 16 });
  GSP.grip(b, 'ar', F); GSP.guard(b, -0.07, -0.022, 0, F);
  b.box(0.04, 0.003, 0.09, 0, -0.027, 0.15, 'dark'); b.box(0.0016, 0.018, 0.06, 0.0256, 0.05, 0.2, 'dark');
  b.grp('bolt', 0, 0.05, 0.2); b.box(0.0012, 0.014, 0.054, 0.0268, 0.05, 0.2, 'bare', 'bolt');
  b.a.mag = V3(0, -0.03, 0.15); b.a.magLen = 0.02; b.a.magKind = 'shells';
  Object.assign(b.a, { len: -mz, muzzle: V3(0, by, mz), bore: 0.0128, optic: { y: rt, z: 0.04 }, under: null, side: { x: 0.038, y: by, z: -0.15 }, fore: V3(0, by - 0.09, -0.256), foreKind: 'vgrip',
    brass: V3(0.03, 0.05, 0.2), boltStyle: 'pump', chargePos: V3(0, by - 0.09, -0.256) });
};
// side-by-side double barrel (break action)
GSF.dbl = function (b, p) {
  const F = b.F, by = b.by = 0.048, L = p.len || 0.7;
  b.prof([[0.06, 0.004], [0.066, 0.05], [0.03, 0.064], [-0.11, 0.064], [-0.115, 0.004]], 0.05, (p.actMat || 'grey') + (b.skin ? '@' + b.skin : ''), null, { bev: 0.006, bs: 2 });
  b.box(0.008, 0.004, 0.04, 0.004, 0.0665, 0.03, 'blued', null, 0, 0.3);
  for (const s of [1, -1]) b.prof([[0.05, 0.064], [0.062, 0.078], [0.066, 0.07], [0.058, 0.058]], 0.006, 'blued', null, { x: s * 0.013, bev: 0.001 });
  GSP.guard(b, -0.085, -0.02, 0.004, 'blued');
  b.prof([[-0.05, 0.006], [-0.055, -0.008], [-0.06, -0.02], [-0.056, -0.022], [-0.048, -0.008], [-0.044, 0.006]], 0.005, 'blued', null, { x: 0.005, bev: 0.001 });
  b.grp('break', 0, 0.012, -0.115);
  for (const s of [1, -1]) { b.tube(0.0128, -0.115, -L, by, 'blued', 'break', { x: s * 0.013, seg: 16 }); b.tube(0.0102, -L + 0.001, -L - 0.0012, by, 'dark', 'break', { x: s * 0.013, seg: 14 }); b.tube(0.0102, -0.1135, -0.1155, by, 'dark', 'break', { x: s * 0.013, seg: 14 }); }
  b.box(0.008, 0.004, L - 0.13, 0, by + 0.0125, (-0.115 - L) / 2, 'blued', 'break');
  b.ball(0.0032, 0, by + 0.0175, -L + 0.012, 'brass', 'break');
  b.prof([[-0.125, by - 0.012], [-0.125, by + 0.0], [-0.36, by + 0.0], [-0.36, by - 0.022], [-0.33, by - 0.036], [-0.15, by - 0.036]], 0.05, F, 'break', { bev: 0.01, bs: 2 });
  gsButt(b, 0.06, 0.04, F, !!p.sawn);
  // the pair of shells carried by the hand during the reload
  b.grp('mag', 0, by, -0.1);
  for (const s of [1, -1]) { b.tube(0.0112, -0.075, -0.125, by, 'red', 'mag', { x: s * 0.013, seg: 12 }); b.tube(0.0118, -0.065, -0.076, by, 'brass', 'mag', { x: s * 0.013, seg: 12 }); }
  b.a.mag = V3(0, by + 0.02, -0.07); b.a.magLen = 0.03; b.a.magKind = 'break';
  Object.assign(b.a, { len: L, muzzle: V3(0, by, -L), bore: 0.0128, optic: null, under: null, side: null, fore: V3(0, by - 0.036, -0.25),
    brass: null, boltStyle: 'none', irons: { fz: -L + 0.012, rz: 0.03, y: by + 0.019 } });
};
// full-auto drum shotgun and the revolving-drum street sweeper
GSF.autosg = function (b, p) {
  const M = b.M, F = b.F, by = b.by = 0.05, st = p.style || 'box', L = p.len || 0.5;
  if (st === 'carousel') {
    const ay = by - 0.04;
    b.prof([[0.06, 0.0], [0.064, by + 0.03], [-0.06, by + 0.03], [-0.06, 0.0]], 0.04, M, null, { bev: 0.004 });
    b.box(0.03, 0.012, 0.16, 0, by + 0.036, -0.13, M); b.box(0.04, 0.12, 0.014, 0, ay + 0.02, -0.19, M);
    b.grp('cyl', 0, ay, -0.125);
    b.tube(0.062, -0.068, -0.182, ay, 'steel', 'cyl', { seg: 20 });
    for (let i = 0; i < 12; i++) { const an = i / 12 * 6.283; b.box(0.01, 0.0016, 0.09, Math.sin(an) * 0.062, ay + Math.cos(an) * 0.062, -0.125, 'dark', 'cyl', 0, 0, -an); b.tube(0.0105, -0.1815, -0.183, ay + Math.cos(an) * 0.045, 'dark', 'cyl', { x: Math.sin(an) * 0.045, seg: 8 }); }
    b.cylX(0.012, 0.004, 0, ay, -0.186, 'bare'); b.box(0.004, 0.03, 0.006, 0, ay, -0.19, 'bare');
    b.tube(0.0128, -0.19, -L, by + 0.005, 'blued', null, { seg: 16 }); b.tube(0.019, -0.2, -L + 0.06, by + 0.005, M, null, { seg: 12 });
    for (let i = 0; i < 4; i++) for (const s of [1, -1]) b.box(0.0016, 0.01, 0.02, s * 0.0192, by + 0.005, -0.23 - i * 0.035, 'dark');
    b.prof([[-0.25, by - 0.016], [-0.243, by - 0.1], [-0.27, by - 0.1], [-0.28, by - 0.016]], 0.028, F, null, { bev: 0.007, bs: 2 });
    const rt = GSP.rail(b, 0.05, -0.2, by + 0.042); GSP.irons(b, 'flip', -0.18, 0.03, rt);
    GSP.grip(b, 'ar', F); GSP.guard(b, -0.058, -0.022, 0, M); GSP.stock(b, p.stock || 'skel', 0.064, by + 0.01, M, F);
    const mz = GSP.muzzle(b, 'none', -L, by + 0.005, 0.0128); b.tube(0.0105, -L + 0.001, -L - 0.0012, by + 0.005, 'dark', null, { seg: 16 });
    b.a.mag = V3(0.04, ay + 0.02, -0.06); b.a.magLen = 0.02; b.a.magKind = 'shells';
    Object.assign(b.a, { len: -mz, muzzle: V3(0, by + 0.005, mz), bore: 0.0128, optic: { y: rt, z: -0.08 }, under: null, side: { x: 0.032, y: by + 0.005, z: -L + 0.1 }, fore: V3(0, by - 0.06, -0.26), foreKind: 'vgrip',
      brass: null, boltStyle: 'none', chargePos: V3(0, ay, -0.19) });
    return;
  }
  b.prof([[-0.36, 0.014], [-0.36, 0.086], [0.3, 0.086], [0.31, 0.07], [0.31, -0.08], [0.28, -0.086], [0.2, -0.03], [0.06, -0.026], [0.04, 0.0], [-0.07, 0.0], [-0.075, 0.014]], 0.056, F, null, { bev: 0.008, bs: 2 });
  b.box(0.05, 0.14, 0.01, 0, -0.004, 0.316, 'rubber');
  const rt = GSP.rail(b, 0.12, -0.3, 0.086); GSP.irons(b, 'flip', -0.28, 0.08, rt);
  b.slots(-0.18, -0.33, 0.05, 0.0282, 4, 0.03, 0.016);
  b.tube(0.0135, -0.36, -L, by, 'blued', null, { seg: 16 }); b.tube(0.02, -0.36, -0.39, by, M, null, { seg: 12 });
  const mz = GSP.muzzle(b, 'none', -L, by, 0.0135); b.tube(0.011, -L + 0.001, -L - 0.0012, by, 'dark', null, { seg: 16 });
  b.grp('charge', 0, 0.098, -0.2); b.box(0.016, 0.01, 0.03, 0, 0.1, -0.2, M, 'charge');
  b.box(0.0016, 0.02, 0.07, 0.0282, 0.054, -0.06, 'dark'); b.grp('bolt', 0, 0.054, -0.06); b.box(0.0012, 0.016, 0.064, 0.0294, 0.054, -0.06, 'bare', 'bolt');
  GSP.grip(b, 'ergo', F); GSP.guard(b, -0.072, -0.022, 0, F);
  GSP.mag(b, p.mag || 'sgdrum', -0.14, 0.004);
  Object.assign(b.a, { len: -mz, muzzle: V3(0, by, mz), bore: 0.0135, optic: { y: rt, z: -0.04 }, under: { y: 0.014, z: -0.29 }, side: { x: 0.042, y: 0.05, z: -0.32 }, fore: V3(0, 0.01, -0.27),
    brass: V3(0.034, 0.054, -0.06), boltStyle: 'charging', chargePos: V3(0, 0.106, -0.2) });
};

// ----- self-loading pistols -----
GSF.pistol = function (b, p) {
  const M = b.M, F = b.F, st = p.style || 'striker', L = p.len || 0.15, heavy = st === 'heavy';
  const by = b.by = heavy ? 0.032 : 0.027, top = heavy ? 0.054 : 0.041, hw = heavy ? 0.031 : 0.026;
  const FM = st === 'striker' ? F : M, gb = -(p.gripLen || 0.105);
  b.prof([[0.034, 0.013], [0.038, -0.004], [0.031, -0.03], [0.04, gb - 0.004], [-0.008, gb], [-0.026, -0.008], [-0.078, -0.008], [-(L - 0.03), -0.006], [-(L - 0.022), 0.013]], hw + 0.002, FM, null, { bev: 0.004, bs: 2 });
  GSP.guard(b, -0.078, -0.027, -0.008, FM, 0.034);
  if (st === 'striker') { b.box(0.014, 0.004, 0.036, 0, -0.008, -(L - 0.066), FM); for (let i = 0; i < 3; i++) b.box(hw + 0.0026, 0.002, 0.028, 0, -0.04 - i * 0.018, 0.012 + i * 0.002, 'dark'); }
  else for (const s of [1, -1]) b.prof([[-0.02, -0.018], [-0.004, gb + 0.012], [0.032, gb + 0.008], [0.026, -0.018]], 0.004, b.A, null, { x: s * (hw / 2 + 0.002), bev: 0.0015 });
  // slide
  b.grp('slide', 0, by, 0);
  if (st === 'open') {
    b.prof([[0.036, 0.013], [0.036, top - 0.004], [0.03, top], [-0.028, top], [-0.034, 0.03], [-L, 0.03], [-L, 0.013]], hw, M, 'slide', { bev: 0.0035, bs: 2 });
    b.box(hw * 0.9, 0.012, 0.012, 0, top - 0.007, -L + 0.008, M, 'slide');
    b.tube(0.0072, -0.03, -L - 0.008, by + 0.006, 'blued', null, { seg: 12 });
  } else if (heavy) {
    b.prof([[0.04, 0.013], [0.04, top - 0.004], [0.032, top], [-0.05, top], [-0.058, 0.034], [-L, 0.034], [-L, 0.013]], hw, M, 'slide', { bev: 0.004, bs: 2 });
    b.prof([[-0.058, 0.034], [-0.052, top + 0.002], [-L + 0.004, top - 0.004], [-L, 0.034]], hw * 0.62, M, null, { bev: 0.004, bs: 2 });
    b.box(0.008, 0.003, L - 0.07, 0, top + 0.0005, -(L + 0.05) / 2, 'blued');
  } else {
    b.prof([[0.036, 0.013], [0.036, top - 0.004], [0.03, top], [-L + 0.006, top], [-L, top - 0.006], [-L, 0.013]], hw, M, 'slide', { bev: 0.0035, bs: 2 });
  }
  b.slots(0.027, 0.006, (0.013 + top) / 2 + 0.002, hw / 2 + 0.0003, 6, 0.0022, (top - 0.013) * 0.7, 'dark', 'slide');
  if (st !== 'open') { b.box(hw * 0.46, 0.0016, 0.03, hw * 0.2, top + 0.0003, -0.04, 'dark', 'slide'); b.box(0.0016, 0.009, 0.03, hw / 2 + 0.0003, top - 0.008, -0.04, 'dark', 'slide'); }
  if (st === 'm1911' || st === 'open' || heavy) b.prof([[0.036, top - 0.012], [0.047, top - 0.004], [0.051, top - 0.011], [0.041, top - 0.022]], 0.006, 'blued', null, { bev: 0.001 });
  if (st !== 'open') { b.tube(0.0068, -L + 0.006, -L - 0.004, by, 'blued', null, { seg: 12 }); b.tube(0.0036, -L + 0.001, -L - 0.0012, by - 0.0095, 'dark', 'slide', { seg: 8 }); }
  const mzz = st === 'open' ? -L - 0.008 : -L - 0.004, mby = st === 'open' ? by + 0.006 : by;
  const mz = GSP.muzzle(b, 'none', mzz, mby, 0.0068); b.tube(0.0044, mzz + 0.001, mzz - 0.0012, mby, 'dark', null, { seg: 10 });
  if (p.comp && !b.kit.muzzle) { b.box(hw, top - 0.012, 0.03, 0, (top + 0.013) / 2, -L - 0.019, 'blued'); b.slots(-L - 0.012, -L - 0.026, top - 0.006, hw / 2 + 0.0002, 2, 0.006, 0.006); }
  if (p.auto) b.box(0.004, 0.008, 0.012, -hw / 2 - 0.001, top - 0.01, 0.02, 'blued', 'slide');
  // sights (the micro dot replaces the rear notch)
  if (!b.kit.optic) {
    b.box(0.003, 0.0055, 0.008, 0, top + 0.0027, -L + 0.014, 'blued', 'slide'); b.box(0.0016, 0.0018, 0.001, 0, top + 0.0038, -L + 0.0182, 'white', 'slide');
    for (const s of [1, -1]) b.box(0.005, 0.0055, 0.006, s * 0.0056, top + 0.0027, 0.026, 'blued', 'slide');
    b.a.irons = { fz: -L + 0.014, rz: 0.026, y: top + 0.0052 };
  }
  // magazine inside the grip
  const ext = p.extMag || (b.kit.magazine && b.kit.magazine !== 'mg_fast') ? (b.kit.magazine === 'mg_drum' ? 0.08 : 0.05) : 0, mb = gb - ext;
  b.grp('mag', 0, gb, 0.016);
  b.prof([[-0.012, 0.004], [0.02, 0.004], [0.031, mb + 0.004], [-0.002, mb + 0.004]], hw * 0.62, 'blued', 'mag', { bev: 0.001 });
  b.box(hw * 0.86, 0.007, 0.04, 0, mb - 0.0005, 0.016, 'polymer', 'mag', -0.1);
  b.cylX(0.0044, hw * 0.4, 0, 0.004, 0.002, 'brass', 'mag', 8);
  b.a.mag = V3(0, gb, 0.016); b.a.magLen = 0.11; b.a.magKind = 'drop';
  Object.assign(b.a, { len: -mz, muzzle: V3(0, mby, mz), bore: 0.0068, optic: { y: top, z: 0.004, grp: 'slide' }, under: null, side: { x: 0, y: -0.024, z: -(L - 0.062), under: true },
    fore: V3(0, -0.05, 0.0), foreKind: 'pistol', brass: V3(0.016, top, -0.04), boltStyle: 'slide', chargePos: V3(0, top - 0.008, 0.02), gripKind: 'pistol' });
};
// ----- revolvers -----
GSF.revolver = function (b, p) {
  const M = b.M, F = b.F, L = p.len || 0.19, cr = p.cr || 0.0215, ay = 0.03, by = b.by = ay + cr - 0.0075, ts = ay + cr + 0.013;
  b.prof([[0.036, -0.004], [0.042, ay + cr + 0.004], [0.032, ts], [-0.09, ts], [-0.09, -0.004]], 0.02, M, null, { bev: 0.003, hole: [[0.012, ay - cr - 0.003], [0.012, ay + cr + 0.003], [-0.062, ay + cr + 0.003], [-0.062, ay - cr - 0.003]] });
  b.grp('cyl', 0, ay, -0.025);
  b.tube(cr, 0.008, -0.058, ay, p.cylMat || M, 'cyl', { seg: 18 });
  for (let i = 0; i < 6; i++) { const an = i / 6 * 6.283 + 0.52, a2 = i / 6 * 6.283; b.box(0.009, 0.0016, 0.036, Math.sin(an) * cr, ay + Math.cos(an) * cr, -0.036, 'dark', 'cyl', 0, 0, -an); b.tube(0.0052, 0.0092, 0.0078, ay + Math.cos(a2) * 0.014, 'brass', 'cyl', { x: Math.sin(a2) * 0.014, seg: 8 }); b.tube(0.0048, -0.0575, -0.0592, ay + Math.cos(a2) * 0.014, 'dark', 'cyl', { x: Math.sin(a2) * 0.014, seg: 8 }); }
  b.tube(0.0095, -0.09, -L, by, M, null, { seg: 14 }); b.tube(0.008, -0.09, -L + 0.02, by - 0.017, M);
  b.box(0.008, 0.005, L - 0.09, 0, by + 0.0115, (-0.09 - L) / 2, M);
  b.tube(0.0052, -L + 0.001, -L - 0.0012, by, 'dark', null, { seg: 10 });
  const sy = by + 0.0235;
  if (!b.kit.optic) { b.prof([[-L + 0.03, by + 0.014], [-L + 0.008, sy], [-L + 0.004, by + 0.014]], 0.004, M, null, { bev: 0 }); for (const s of [1, -1]) b.box(0.0045, 0.009, 0.006, s * 0.0052, ts + 0.0045, 0.022, M); b.a.irons = { fz: -L + 0.008, rz: 0.022, y: sy }; }
  else GSP.rail(b, 0.02, -0.07, ts, { w: 0.018 });
  b.prof([[0.036, ay + cr + 0.002], [0.05, ay + cr + 0.012], [0.054, ay + cr + 0.004], [0.042, ay + cr - 0.01]], 0.007, 'blued', null, { bev: 0.001 });
  GSP.guard(b, -0.07, -0.016, -0.004, M, 0.034);
  b.prof([[0.036, -0.004], [0.046, -0.03], [0.05, -0.1], [0.012, -0.106], [-0.004, -0.07], [-0.014, -0.012], [-0.01, -0.004]], 0.032, F, null, { bev: 0.009, bs: 2 });
  b.cylX(0.004, 0.034, 0, -0.05, 0.022, 'brass', null, 8);
  // speed loader carried by the hand during the reload
  b.grp('mag', 0, ay, 0.03);
  b.tube(0.016, 0.05, 0.036, ay, 'blued', 'mag', { seg: 12 }); b.tube(0.006, 0.066, 0.05, ay, 'blued', 'mag', { seg: 8 });
  for (let i = 0; i < 6; i++) { const a2 = i / 6 * 6.283; b.tube(0.0048, 0.036, 0.004, ay + Math.cos(a2) * 0.014, 'brass', 'mag', { x: Math.sin(a2) * 0.014, seg: 8 }); }
  b.a.mag = V3(-0.05, ay - 0.012, 0.03); b.a.magLen = 0.04; b.a.magKind = 'cyl';
  Object.assign(b.a, { len: L, muzzle: V3(0, by, -L), bore: 0.0052, optic: { y: ts + 0.0085, z: -0.025 }, under: null, side: { x: 0, y: by - 0.04, z: -L + 0.05, under: true },
    fore: V3(0, -0.05, 0.0), foreKind: 'pistol', brass: null, boltStyle: 'none', gripKind: 'pistol' });
};

// ----- shoulder launchers -----
GSF.tubeL = function (b, p) {
  const M = b.M, F = b.F, st = p.style || 'rpg';
  let by, r, front, rear, fore, foreKind, optic, muzzle, irons = null;
  if (st === 'rpg') {
    by = b.by = 0.062; r = 0.0215; front = -0.42; rear = 0.5;
    b.tube(r, 0.36, front, by, M, null, { seg: 16 }); b.tube(0.03, 0.3, 0.03, by, F, null, { seg: 16 });
    b.tube(0.044, rear, rear - 0.14, by, M, null, { r2: r, seg: 16 }); b.tube(r, front + 0.03, front, by, M, null, { r2: 0.027, seg: 16 });
    b.box(0.03, 0.03, 0.08, 0, by - 0.034, -0.02, M); GSP.grip(b, 'ak', F); GSP.guard(b, -0.07, -0.02, 0.012, M, 0.046);
    b.prof([[0.126, by - 0.022], [0.142, by - 0.1], [0.176, by - 0.1], [0.168, by - 0.022]], 0.03, F, null, { bev: 0.007, bs: 2 });
    if (!b.kit.optic) { const sy = by + r + 0.04; b.box(0.012, 0.03, 0.004, 0, by + r + 0.015, -0.3, M); b.box(0.0018, 0.012, 0.0018, 0, sy - 0.006, -0.3, 'bare'); for (const s of [1, -1]) b.box(0.005, 0.04, 0.004, s * 0.0058, by + r + 0.02, -0.06, M); irons = { fz: -0.3, rz: -0.06, y: sy }; }
    else GSP.rail(b, -0.05, -0.2, by + r - 0.002, { w: 0.02 });
    optic = { y: by + r + 0.0065, z: -0.12 };
    // the rocket
    b.grp('mag', 0, by, front);
    b.tube(0.019, front + 0.12, front - 0.06, by, 'olive', 'mag', { seg: 12 }); b.tube(0.019, front - 0.06, front - 0.1, by, 'olive', 'mag', { r2: 0.042, seg: 16 });
    b.tube(0.042, front - 0.1, front - 0.2, by, 'olive', 'mag', { seg: 16 }); b.tube(0.042, front - 0.2, front - 0.34, by, 'olive', 'mag', { r2: 0.011, seg: 16 }); b.tube(0.011, front - 0.34, front - 0.39, by, 'bare', 'mag', { r2: 0.005, seg: 10 });
    b.tube(0.0425, front - 0.14, front - 0.15, by, 'red', 'mag', { seg: 16 });
    b.a.mag = V3(0, by, front - 0.08); b.a.magLen = 0.1; b.a.magKind = 'rocket';
    fore = V3(0, by - r - 0.004, -0.2); muzzle = V3(0, by, front - 0.39);
  } else {
    const olv = b.skin ? 'olive@' + b.skin : 'olive';   // the launch tube carries the weapon's skin
    const S = { at: { r: 0.047, by: 0.088, front: -0.52, rear: 0.48, c: olv }, recoilless: { r: 0.046, by: 0.088, front: -0.46, rear: 0.5, c: M },
      guided: { r: 0.064, by: 0.105, front: -0.56, rear: 0.46, c: olv }, aa: { r: 0.04, by: 0.086, front: -0.78, rear: 0.6, c: olv } }[st];
    by = b.by = S.by; r = S.r; front = S.front; rear = S.rear;
    b.tube(r, rear, front, by, S.c, null, { seg: 20 });
    if (st === 'at') { b.tube(r + 0.008, rear + 0.01, rear - 0.05, by, 'rubber', null, { seg: 20 }); b.tube(r + 0.008, front + 0.05, front - 0.01, by, 'rubber', null, { seg: 20 }); for (const z of [0.2, -0.3]) b.tube(r + 0.002, z, z - 0.02, by, 'dark', null, { seg: 20 }); b.box(0.02, 0.012, 0.3, 0, by + r + 0.004, -0.02, 'polymer'); }
    else if (st === 'recoilless') { b.tube(0.072, rear + 0.12, rear, by, M, null, { r2: r, seg: 20 }); b.tube(r + 0.004, front + 0.02, front, by, M, null, { seg: 20 }); for (const z of [0.3, 0.05, -0.25]) b.tube(r + 0.003, z, z - 0.016, by, 'blued', null, { seg: 20 }); b.box(0.05, 0.03, 0.09, 0, by - r - 0.012, 0.25, 'rubber'); }
    else if (st === 'guided') { b.tube(r + 0.02, rear + 0.01, rear - 0.07, by, 'rubber', null, { seg: 16 }); b.tube(r + 0.02, front + 0.07, front - 0.01, by, 'rubber', null, { seg: 16 }); b.box(0.11, 0.13, 0.22, -0.11, by - 0.03, -0.2, 'olive'); b.tube(0.03, -0.31, -0.33, by - 0.02, 'lens', null, { x: -0.11, seg: 14 }); b.tube(0.036, -0.3, -0.325, by - 0.02, 'rubber', null, { x: -0.11, seg: 14, open: true }); b.box(0.03, 0.05, 0.03, -0.11, by + 0.05, -0.1, 'rubber'); }
    else { b.tube(r + 0.004, front + 0.03, front - 0.004, by, M, null, { seg: 20 }); b.ball(r * 0.86, 0, by, front + 0.006, 'lens', null, 1, 1, 0.7); b.box(0.05, 0.07, 0.24, 0, by - r - 0.03, -0.16, 'olive'); b.tube(0.022, -0.26, -0.36, by - r - 0.04, M, null, { seg: 12 }); b.box(0.004, 0.09, 0.07, -r - 0.02, by + 0.02, -0.3, M); for (let i = 0; i < 4; i++) b.box(0.004, 0.002, 0.07, -r - 0.022, by - 0.015 + i * 0.022, -0.3, 'dark'); }
    b.box(0.03, by - r, 0.07, 0, (by - r) / 2, 0.0, M); GSP.grip(b, 'ar', F); GSP.guard(b, -0.07, -0.022, 0, M);
    b.prof([[-0.19, by - r], [-0.182, by - r - 0.09], [-0.21, by - r - 0.09], [-0.22, by - r]], 0.028, F, null, { bev: 0.007, bs: 2 });
    fore = V3(0, by - r - 0.045, -0.2); foreKind = 'vgrip';
    const rt = GSP.rail(b, 0.02, -0.14, by + r - 0.003, { w: 0.02, rot: 0.9, axisY: by });
    optic = null;
    if (!b.kit.optic) { const sx = -Math.sin(0.9) * (r + 0.03), sy = by + Math.cos(0.9) * (r + 0.03); b.box(0.004, 0.03, 0.004, sx, sy, -0.12, M); b.box(0.02, 0.02, 0.003, sx, sy + 0.02, -0.12, 'polymer'); }
    b.a.mag = V3(0.02, by - r - 0.1, 0.25); b.a.magLen = 0.1; b.a.magKind = 'none';
    muzzle = V3(0, by, front); irons = { fz: front + 0.1, rz: 0, y: by + r + 0.01, x: -(r + 0.035) };
    void rt;
  }
  Object.assign(b.a, { len: -muzzle.z, muzzle, bore: r, optic, under: null, side: null, fore, foreKind, brass: null, boltStyle: 'none', irons, launcherTube: st !== 'rpg' });
};
// grenade launchers: single-shot break action, six-shot revolving
GSF.gl = function (b, p) {
  const M = b.M, F = b.F, st = p.style || 'break', by = b.by = 0.052;
  if (st === 'break') {
    b.prof([[0.06, 0.0], [0.064, 0.062], [0.03, 0.08], [-0.07, 0.08], [-0.07, 0.0]], 0.05, M, null, { bev: 0.006, bs: 2 });
    b.grp('break', 0, 0.014, -0.07);
    b.tube(0.0262, -0.07, -0.36, by, 'blued', 'break', { seg: 18 }); b.tube(0.021, -0.359, -0.3615, by, 'dark', 'break', { seg: 18 }); b.tube(0.021, -0.0685, -0.0705, by, 'dark', 'break', { seg: 18 });
    b.prof([[-0.08, by - 0.03], [-0.08, by - 0.012], [-0.26, by - 0.012], [-0.26, by - 0.042], [-0.1, by - 0.05]], 0.052, F, 'break', { bev: 0.01, bs: 2 });
    b.box(0.02, 0.05, 0.003, 0, by + 0.05, -0.2, M, 'break'); b.box(0.008, 0.016, 0.0034, 0, by + 0.058, -0.2, 'dark', 'break'); b.box(0.003, 0.014, 0.01, 0, by + 0.033, -0.345, M, 'break');
    gsButt(b, 0.06, 0.044, F, false); GSP.guard(b, -0.07, -0.02, 0, M);
    b.grp('mag', 0, by, -0.06);
    b.tube(0.0205, -0.03, -0.085, by, 'olive', 'mag', { seg: 14 }); b.tube(0.0205, -0.085, -0.125, by, 'brass', 'mag', { r2: 0.008, seg: 14 }); b.tube(0.0215, -0.024, -0.031, by, 'brass', 'mag', { seg: 14 });
    b.a.mag = V3(0, by + 0.03, -0.05); b.a.magLen = 0.04; b.a.magKind = 'break';
    Object.assign(b.a, { len: 0.36, muzzle: V3(0, by, -0.36), bore: 0.021, optic: null, under: null, side: null, fore: V3(0, by - 0.05, -0.17), brass: null, boltStyle: 'none', irons: { fz: -0.345, rz: -0.2, y: by + 0.04 } });
    return;
  }
  const ay = by - 0.04;
  b.prof([[0.06, 0.0], [0.064, by + 0.03], [-0.06, by + 0.03], [-0.06, 0.0]], 0.04, M, null, { bev: 0.004 });
  b.box(0.03, 0.012, 0.17, 0, by + 0.036, -0.135, M); b.box(0.04, 0.13, 0.014, 0, ay + 0.02, -0.2, M);
  b.grp('cyl', 0, ay, -0.13);
  b.tube(0.064, -0.068, -0.192, ay, 'steel', 'cyl', { seg: 18 });
  for (let i = 0; i < 6; i++) { const an = i / 6 * 6.283, a2 = an + 0.52; b.box(0.022, 0.0016, 0.09, Math.sin(a2) * 0.064, ay + Math.cos(a2) * 0.064, -0.13, 'dark', 'cyl', 0, 0, -a2); b.tube(0.02, -0.1915, -0.193, ay + Math.cos(an) * 0.04, 'dark', 'cyl', { x: Math.sin(an) * 0.04, seg: 12 }); }
  b.tube(0.0262, -0.2, -0.37, by, 'blued', null, { seg: 18 }); b.tube(0.021, -0.369, -0.3715, by, 'dark', null, { seg: 18 });
  b.prof([[-0.26, by - 0.026], [-0.253, by - 0.115], [-0.28, by - 0.115], [-0.29, by - 0.026]], 0.028, F, null, { bev: 0.007, bs: 2 });
  const rt = GSP.rail(b, 0.05, -0.21, by + 0.042); GSP.irons(b, 'flip', -0.19, 0.03, rt);
  GSP.grip(b, 'ar', F); GSP.guard(b, -0.058, -0.022, 0, M); GSP.stock(b, p.stock || 'm4', 0.064, by + 0.006, M, F);
  b.a.mag = V3(0.045, ay + 0.02, -0.06); b.a.magLen = 0.03; b.a.magKind = 'shells';
  Object.assign(b.a, { len: 0.37, muzzle: V3(0, by, -0.37), bore: 0.021, optic: { y: rt, z: -0.08 }, under: null, side: null, fore: V3(0, by - 0.07, -0.27), foreKind: 'vgrip', brass: null, boltStyle: 'none' });
};

// ----- melee weapons: built upright (working end up), then tilted forward -----
GSF.melee = function (b, p) {
  const k = p.kind || 'knife', M = b.M, F = b.F;
  const H = (r, y0, y1, mat, seg, r2) => b.cylY(r, y1 - y0, 0, (y0 + y1) / 2, 0, mat || F, null, seg || 10, r2);
  let reach = 1.9, tip = 0.24;
  switch (k) {
    case 'knife':
      H(0.0125, -0.055, 0.05, 'rubber'); for (let i = 0; i < 4; i++) H(0.0132, -0.04 + i * 0.022, -0.034 + i * 0.022, 'dark');
      b.box(0.012, 0.008, 0.05, 0, 0.054, -0.004, M); H(0.014, -0.066, -0.055, M);
      b.prof([[0.012, 0.058], [0.014, 0.19], [0.0, 0.235], [-0.016, 0.2], [-0.02, 0.058]], 0.004, 'bare', null, { bev: 0.0018 });
      b.box(0.0046, 0.09, 0.004, 0, 0.12, 0.004, 'grey'); break;
    case 'trench':
      H(0.0125, -0.055, 0.05, 'wood'); b.box(0.014, 0.008, 0.05, 0, 0.054, -0.004, 'brass'); H(0.014, -0.066, -0.055, 'brass');
      b.prof([[-0.014, 0.05], [-0.044, 0.04], [-0.05, -0.05], [-0.014, -0.058], [-0.014, -0.05], [-0.042, -0.044], [-0.037, 0.034], [-0.014, 0.042]], 0.012, 'brass', null, { bev: 0.002 });
      b.prof([[0.009, 0.058], [0.004, 0.2], [0.0, 0.26], [-0.004, 0.2], [-0.009, 0.058]], 0.008, 'bare', null, { bev: 0.0035 }); tip = 0.26; break;
    case 'karambit':
      H(0.012, -0.05, 0.045, 'rubber'); b.torus(0.016, 0.0045, 0, -0.066, 0, M, null, 'x');
      b.prof([[0.012, 0.045], [0.008, 0.1], [-0.02, 0.15], [-0.07, 0.16], [-0.075, 0.152], [-0.04, 0.125], [-0.018, 0.09], [-0.014, 0.045]], 0.004, 'bare', null, { bev: 0.0018 }); tip = 0.16; reach = 1.7; break;
    case 'kukri':
      H(0.013, -0.06, 0.05, 'woodDark'); H(0.0155, -0.068, -0.06, 'brass'); H(0.015, 0.05, 0.058, 'brass');
      b.prof([[0.012, 0.058], [0.02, 0.16], [0.0, 0.26], [-0.04, 0.34], [-0.06, 0.33], [-0.058, 0.25], [-0.03, 0.16], [-0.016, 0.058]], 0.005, 'bare', null, { bev: 0.0022 }); tip = 0.34; reach = 2.1; break;
    case 'machete':
      H(0.013, -0.06, 0.055, 'polymer'); H(0.015, 0.055, 0.062, M);
      b.prof([[0.014, 0.062], [0.02, 0.4], [0.004, 0.47], [-0.03, 0.45], [-0.036, 0.062]], 0.0032, 'bare', null, { bev: 0.0014 }); tip = 0.47; reach = 2.3; break;
    case 'cleaver':
      H(0.013, -0.06, 0.05, 'wood'); for (const y of [-0.03, 0.02]) b.cylX(0.003, 0.028, 0, y, 0, 'brass', null, 6);
      b.prof([[0.02, 0.055], [0.02, 0.23], [-0.085, 0.23], [-0.09, 0.07], [-0.02, 0.055]], 0.004, 'bare', null, { bev: 0.0018, hole: [[0.008, 0.2], [0.008, 0.215], [-0.006, 0.215], [-0.006, 0.2]] }); tip = 0.23; break;
    case 'tomahawk':
      H(0.011, -0.12, 0.24, 'polymer', 10, 0.0125); H(0.013, -0.12, -0.04, 'wrap');
      b.prof([[0.012, 0.2], [0.05, 0.215], [0.014, 0.25], [-0.02, 0.262], [-0.085, 0.28], [-0.1, 0.215], [-0.085, 0.16], [-0.02, 0.19]], 0.01, M, null, { bev: 0.004, bs: 2 });
      b.prof([[-0.08, 0.275], [-0.1, 0.215], [-0.08, 0.166], [-0.088, 0.215]], 0.0102, 'bare', null, { bev: 0.004 }); tip = 0.28; reach = 2.1; break;
    case 'waraxe':
      H(0.013, -0.16, 0.42, 'woodDark', 10, 0.014); H(0.015, -0.16, -0.1, 'wrap');
      for (const s of [1, -1]) b.prof([[s * 0.012, 0.33], [s * 0.05, 0.3], [s * 0.11, 0.27], [s * 0.125, 0.365], [s * 0.11, 0.46], [s * 0.05, 0.43], [s * 0.012, 0.4]], 0.01, M, null, { bev: 0.004, bs: 2 });
      H(0.008, 0.42, 0.47, 'bare', 8, 0.001); tip = 0.47; reach = 2.4; break;
    case 'baton':
      H(0.0145, -0.08, 0.06, 'rubber'); for (let i = 0; i < 5; i++) H(0.0152, -0.065 + i * 0.024, -0.058 + i * 0.024, 'dark');
      H(0.0105, 0.06, 0.3, M); H(0.0078, 0.3, 0.52, 'bare'); b.ball(0.0105, 0, 0.525, 0, 'bare'); tip = 0.53; reach = 2.4; break;
    case 'bat':
      H(0.02, -0.14, -0.125, 'woodLight'); H(0.014, -0.125, 0.12, 'wrap', 12, 0.015); H(0.015, 0.12, 0.42, 'woodLight', 14, 0.032); H(0.032, 0.42, 0.62, 'woodLight', 14, 0.033); b.ball(0.033, 0, 0.62, 0, 'woodLight', null, 1, 0.5, 1);
      tip = 0.64; reach = 2.5; break;
    case 'sledge':
      H(0.016, -0.2, 0.56, 'wood', 10, 0.017); H(0.018, -0.2, -0.05, 'wrap');
      b.box(0.062, 0.07, 0.17, 0, 0.6, 0, M); for (const s of [1, -1]) b.box(0.066, 0.074, 0.012, 0, 0.6, s * 0.08, 'bare'); tip = 0.64; reach = 2.5; break;
    case 'crowbar':
      H(0.0105, -0.16, 0.42, 'red', 6); b.rod(0.0105, [0, 0.42, 0], [0, 0.48, -0.03], 'red', null, 6); b.rod(0.0105, [0, 0.48, -0.03], [0, 0.49, -0.085], 'red', null, 6);
      b.prof([[-0.08, 0.5], [-0.115, 0.475], [-0.115, 0.468], [-0.08, 0.48]], 0.02, 'bare', null, { bev: 0.002 }); b.prof([[0.012, -0.16], [0.02, -0.215], [0.012, -0.22], [-0.008, -0.16]], 0.022, 'bare', null, { bev: 0.002 }); tip = 0.5; reach = 2.4; break;
    case 'shovel':
      H(0.013, -0.14, 0.28, 'olive', 10); b.prof([[0.02, -0.14], [0.04, -0.2], [-0.04, -0.2], [-0.02, -0.14]], 0.03, 'olive', null, { bev: 0.006, hole: [[0.012, -0.156], [0.024, -0.188], [-0.024, -0.188], [-0.012, -0.156]] });
      b.box(0.11, 0.12, 0.005, 0, 0.35, 0, 'olive'); b.cylY(0.078, 0.08, 0, 0.45, 0, 'olive', null, 4, 0.004); b.box(0.03, 0.05, 0.02, 0, 0.29, 0, M); tip = 0.49; reach = 2.3; break;
    case 'iceaxe':
      H(0.012, -0.14, 0.4, 'grey', 8); H(0.0138, -0.14, -0.02, 'rubber'); b.rod(0.006, [0, -0.14, 0], [0, -0.18, 0], 'bare', null, 6);
      b.prof([[0.03, 0.4], [0.0, 0.425], [-0.1, 0.405], [-0.175, 0.33], [-0.165, 0.322], [-0.09, 0.378], [0.0, 0.39]], 0.008, 'bare', null, { bev: 0.003 });
      b.prof([[0.02, 0.425], [0.08, 0.42], [0.085, 0.385], [0.02, 0.395]], 0.03, 'bare', null, { bev: 0.003 }); tip = 0.425; reach = 2.2; break;
    case 'katana':
    default: {
      H(0.0135, -0.13, 0.11, 'wrap', 10); H(0.016, -0.14, -0.13, 'brass'); b.cylY(0.036, 0.005, 0, 0.114, 0, 'blued', null, 16); H(0.0125, 0.117, 0.14, 'brass', 8);
      const pts = [], back = [];
      for (let i = 0; i <= 10; i++) { const y = 0.14 + i * 0.066, c = 0.00012 * i * i * 10; pts.push([-0.015 + c + (i === 10 ? 0.02 : 0), y]); back.push([0.011 + c, y - (i === 10 ? 0.02 : 0)]); }
      b.prof(pts.concat(back.reverse()), 0.006, 'bare', null, { bev: 0.0026 }); tip = 0.8; reach = 2.6;
    }
  }
  // tilt the working end forward
  const tilt = p.tilt === undefined ? 0.62 : p.tilt;
  for (const mk in b.G.body.parts) for (const g of b.G.body.parts[mk]) g.rotateX(-tilt);
  const dir = V3(0, Math.cos(tilt), -Math.sin(tilt));
  Object.assign(b.a, { len: tip * Math.sin(tilt) + 0.02, muzzle: dir.clone().multiplyScalar(tip), bore: 0.01, optic: null, under: null, side: null, fore: null, foreKind: 'free', brass: null, boltStyle: 'none',
    gripKind: 'melee', meleeAxis: dir, reach, irons: { fz: -0.2, rz: 0, y: 0.1 } });
};

// slots a family can take (the entry may remove some with p.noSlots)
const GS_FAM_SLOTS = {
  ar: ['optic', 'muzzle', 'underbarrel', 'laser', 'magazine'], ak: ['optic', 'muzzle', 'underbarrel', 'laser', 'magazine'], bullpup: ['optic', 'muzzle', 'underbarrel', 'laser', 'magazine'],
  modular: ['optic', 'muzzle', 'underbarrel', 'laser', 'magazine'], hk: ['optic', 'muzzle', 'underbarrel', 'laser', 'magazine'], boxsmg: ['optic', 'muzzle', 'laser', 'magazine'],
  pdw: ['optic', 'muzzle', 'laser'], vec: ['optic', 'muzzle', 'laser', 'magazine'], belt: ['optic', 'muzzle', 'laser'], rotary: [], rifle: ['optic', 'muzzle', 'underbarrel', 'laser', 'magazine'],
  tubesg: ['optic', 'muzzle', 'underbarrel', 'laser'], bullsg: ['optic', 'muzzle', 'laser'], dbl: [], autosg: ['optic', 'muzzle', 'underbarrel', 'laser'], pistol: ['optic', 'muzzle', 'laser', 'magazine'],
  revolver: ['optic', 'laser'], tubeL: ['optic'], gl: ['optic'], melee: []
};

const GUNSMITH = {
  slots(e) {
    const no = (e.p && e.p.noSlots) || [];
    return (GS_FAM_SLOTS[e.fam] || []).filter(s => !no.includes(s));
  },
  // attachments of a slot that fit a weapon
  compatible(e, slot) {
    if (!this.slots(e).includes(slot)) return [];
    return GS_ATTACH.filter(a => a.slot === slot && a.fit.includes(e.category === 'mg' ? 'lmg' : e.category) && !(e.p && e.p.sd && slot === 'muzzle')
      && !(slot === 'magazine' && a.id === 'mg_drum' && !['ar', 'ak', 'modular', 'hk'].includes(e.fam))
      && !(slot === 'optic' && e.fam === 'tubeL' && e.p && e.p.style !== 'rpg'));
  },
  // drop what does not fit
  validKit(e, kit) {
    const out = {};
    for (const s of this.slots(e)) { const id = kit && kit[s]; if (id && this.compatible(e, s).some(a => a.id === id)) out[s] = id; }
    return out;
  },
  _frame(p, palm, fingers) {
    const x = palm.clone().normalize(), y = fingers.clone().sub(x.clone().multiplyScalar(fingers.dot(x))).normalize(), z = new THREE.Vector3().crossVectors(x, y);
    return { p, q: new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z)) };
  },
  build(e, kit) {
    kit = this.validKit(e, kit || {});
    const b = new GunBuilder(e, kit);
    // magazine attachments change the magazine the family builds
    const mg = kit.magazine && GS_ATT_BY_ID[kit.magazine];
    if (mg && e.fam !== 'pistol') {
      const base = b.p.mag;
      b.p = Object.assign({}, b.p);
      if (mg.mag.kind === 'drum') b.p.mag = e.p && e.p.sg ? 'sgdrum' : 'drum';
      b.magAtt = mg.mag.kind;
    }
    GSF[e.fam](b, b.p);
    const a = b.a, mounted = {};
    let at;
    if ((at = GS_ATT_BY_ID[kit.optic]) && a.optic) mounted.optic = GSA.optic(b, at, a.optic.y, a.optic.z, a.optic.grp);
    if ((at = GS_ATT_BY_ID[kit.muzzle]) && a.muzzleMount) { mounted.muzzle = GSA.muzzle(b, at, a.muzzleMount, a.bore || 0.008); a.muzzle = mounted.muzzle.flash.clone(); a.len = -a.muzzle.z; }
    if ((at = GS_ATT_BY_ID[kit.underbarrel]) && a.under) mounted.underbarrel = GSA.under(b, at, a.under);
    if ((at = GS_ATT_BY_ID[kit.laser]) && a.side) Object.assign(mounted, GSA.side(b, at, a.side.under ? { x: 0, y: a.side.y, z: a.side.z } : a.side));
    if (mg) {
      mounted.magazine = { id: mg.id, cap: mg.mag.cap, reload: mg.mag.reload, kind: mg.mag.kind };
      // pull loop on the speed magazine
      if (mg.mag.kind === 'fast' && a.mag && b.G.mag && e.fam !== 'pistol') b.box(0.006, 0.03, 0.028, 0, a.mag.y - (a.magLen || 0.12) - 0.016, a.mag.z - 0.02, 'tan', 'mag');
    }
    if (a.suppressed) mounted.muzzle = Object.assign(mounted.muzzle || { flash: a.muzzle.clone() }, { suppressed: true, integral: true });
    const { root, nodes } = b.finish();
    root.name = 'gs_' + e.id;
    if (mounted.optic) { const r = gsReticle(mounted.optic); (mounted.optic.grp && nodes[mounted.optic.grp] ? (r.position.sub(nodes[mounted.optic.grp].position), nodes[mounted.optic.grp]) : root).add(r); mounted.optic.reticleMesh = r; }
    // hidden until the reload brings them in
    if (nodes.mag && (a.magKind === 'cyl' || a.magKind === 'break')) nodes.mag.visible = false;
    root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root), size = box.getSize(new THREE.Vector3());
    const ir = a.irons;
    const info = {
      id: e.id, e, box, size, len: a.len, muzzle: a.muzzle.clone(),
      handL: a.fore ? a.fore.clone() : null, mag: a.mag ? a.mag.clone() : null, brass: a.brass ? a.brass.clone() : null,
      sight: ir ? new THREE.Vector3(ir.x || 0, ir.y, ir.rz) : null, iron: ir ? new THREE.Vector3(ir.x || 0, ir.y, ir.fz) : null,
      sightY: ir ? ir.y : Math.max(0.03, box.max.y * 0.8)
    };
    // hand frames (weapon space): Y = finger direction, X = palm normal
    const F = (p, palm, fingers) => this._frame(p, palm, fingers);
    const gk = a.gripKind || 'ar';
    let frameR, frameL;
    // stock wrist (rifles, shotguns): the knuckle line runs along the sloping wrist, fingers wrap under it, thumb over the top
    if (gk === 'wrist') frameR = F(V3(0.016, -0.004, 0.1), V3(-1, 0.12, 0), V3(-0.08, -0.82, -0.56));
    else if (gk === 'thumb') frameR = F(V3(0.016, -0.03, 0.09), V3(-1, 0, 0), V3(0, -0.2, -0.98));
    else if (gk === 'pistol') frameR = F(V3(0.014, -0.034, 0.078), V3(-1, 0, 0), V3(0, -0.22, -0.975));
    else if (gk === 'melee') { const h = a.meleeAxis, f = V3(0, h.z, -h.y); frameR = F(V3(0.014, 0, 0).addScaledVector(f, -0.07), V3(-1, 0, 0), f); }
    else frameR = F(V3(0.015, -0.026, 0.082), V3(-1, 0, 0), V3(0, -0.29, -0.955));
    const fk = mounted.underbarrel && mounted.underbarrel.hand ? (mounted.underbarrel.vertical ? 'vgrip' : 'under') : (a.foreKind || 'under');
    const fp = mounted.underbarrel && mounted.underbarrel.hand ? mounted.underbarrel.hand : (a.fore || V3(0, -0.04, -0.2));
    if (fk === 'vgrip') frameL = F(fp.clone().add(V3(-0.03, -0.006, 0.07)), V3(1, 0.1, 0), V3(0.12, 0.05, -1));
    else if (fk === 'pistol') frameL = F(V3(-0.026, -0.058, 0.066), V3(1, 0, 0.2), V3(0.1, 0.22, -1));
    else if (fk === 'top') frameL = F(fp.clone().add(V3(-0.02, 0.03, 0.075)), V3(0.2, -1, 0), V3(0.1, -0.1, -1));
    else if (fk === 'free') frameL = F(V3(-0.26, -0.3, 0.12), V3(1, 0, 0), V3(0, 0.3, -1));
    else frameL = F(fp.clone().add(V3(-0.034, -0.03, 0.068)), V3(0.6, 0.8, 0), V3(0.24, 0.1, -0.96));
    const rig = {
      mag: nodes.mag || null, bolt: nodes.bolt || null, charge: nodes.charge || null, slide: nodes.slide || null, pump: nodes.pump || null, cover: nodes.cover || null,
      cyl: nodes.cyl || null, brk: nodes.break || null, barrels: nodes.barrels || null, frameR, frameL, magPos: a.mag ? a.mag.clone() : V3(0, -0.06, -0.08), magLen: a.magLen || 0.12,
      magKind: a.magKind || 'mag', boltStyle: a.boltStyle || 'catch', chargePos: a.chargePos ? a.chargePos.clone() : null, launcherTube: !!a.launcherTube
    };
    root.userData.hqInfo = info; root.userData.rig = rig; root.userData.mounted = mounted; root.userData.kit = kit;
    return { root, info, rig, mounted };
  }
};
