// ---------- First-person arms: the soldier's own sleeves and gloves, IK'd onto the weapon ----------
// A clone of soldier.glb lives in the viewmodel rig (camera space). Head and legs are folded away, the shoulder
// joints slide so both hands can always reach, two-bone IK puts each wrist on its target (the weapon's own hand
// tags, or the reload choreography's hand path) and the hand is turned to a target frame; fingers curl per grip.
// Hand frames follow the weapon tags' convention: Y = finger direction, X = palm normal, Z = knuckle line.
const FPARMS = {
  S: null, B: null, theme: '', ready: false,
  // natural shoulder sockets in camera space (metres); the IK slides them toward the hands when needed
  BASE_R: new THREE.Vector3(0.19, -0.25, 0.07), BASE_L: new THREE.Vector3(-0.2, -0.26, 0.05),
  REACH: 0.4,
  _armLen: 0,
  build(theme) {
    if (this.S && this.theme === theme) return;
    if (this.S) { weaponRig.remove(this.S.root); this.S = null; }
    if (!ASSETS.models.soldier || typeof makeSoldier !== 'function') return;
    const S0 = makeSoldier(ENEMY_TYPES.soldier, theme || 'urban', 'blue');
    S0.clone.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; o.frustumCulled = false; o.renderOrder = 2; } });
    const B = S0.B;
    // head and legs collapse into their joints (the camera sits inside the head)
    for (const n of ['Neck', 'LeftUpLeg', 'RightUpLeg']) if (B[n]) B[n].scale.setScalar(1e-3);
    weaponRig.add(S0.root);
    S0.root.rotation.y = Math.PI; // the soldier faces +Z, the camera looks down -Z
    this.S = S0; this.B = B; this.theme = theme; this.ready = !!(B.RightArm && B.LeftArm && B.RightHand && B.LeftHand);
    // rest lengths (world units after the model scale)
    S0.root.updateMatrixWorld(true);
    const p = (b) => new THREE.Vector3().setFromMatrixPosition(b.matrixWorld);
    this._armLen = p(B.RightArm).distanceTo(p(B.RightForeArm)) + p(B.RightForeArm).distanceTo(p(B.RightHand));
    this.REACH = this._armLen * 0.9;
    // rest local positions of the shoulder joints (restored before each solve)
    this._restR = B.RightArm.position.clone(); this._restL = B.LeftArm.position.clone();
    this._restLScale = B.LeftArm.scale.clone();
    // bind rotations: every solve starts from them (no twist creeping in frame after frame), and the hand's bind
    // rotation relative to the forearm is the "no twist" reference for the forearm roll
    this._bindQ = new Map();
    for (const n of ['RightArm', 'RightForeArm', 'RightHand', 'LeftArm', 'LeftForeArm', 'LeftHand']) this._bindQ.set(B[n], B[n].quaternion.clone());
    // eye height: the body hangs below the camera so the eyes sit at the camera
    this._eyeY = p(B.Head).y + 0.06;
  },
  setVisible(v) { if (this.S) this.S.root.visible = v; },

  // R / L: { pos: Vector3 (camera space), x, y, z: unit axes (hand frame), curl: 0..1, trigger: 0..1 }
  update(R, L, showLeft = true) {
    if (!this.ready) return;
    const S0 = this.S, B = this.B, root = S0.root;
    // A skinned mesh is not hidden by toggling a bone's visible flag. Collapse the
    // support-arm bone for one-handed pistol poses, then restore it for reloads.
    B.LeftArm.scale.copy(this._restLScale);
    root.position.set(0, -this._eyeY, 0.06);
    root.updateMatrixWorld(true);
    this._solve(B.RightArm, B.RightForeArm, B.RightHand, this._restR, this.BASE_R, R, 1);
    this._solve(B.LeftArm, B.LeftForeArm, B.LeftHand, this._restL, this.BASE_L, L, -1);
    this._fingers('Right', R); this._fingers('Left', L);
    // Pistols are fired with the right hand only. The support hand returns for reloads.
    B.LeftArm.scale.copy(showLeft ? this._restLScale : _faHiddenArmScale);
  },

  _solve(upper, lower, hand, rest, base, T, side) {
    // slide the shoulder joint so the wrist target is within reach: keep it at most REACH from the target, as close
    // to the natural socket as possible
    upper.position.copy(rest);
    const bq = this._bindQ;
    upper.quaternion.copy(bq.get(upper)); lower.quaternion.copy(bq.get(lower)); hand.quaternion.copy(bq.get(hand));
    upper.updateMatrixWorld(true);
    const sp = _fa1.setFromMatrixPosition(upper.matrixWorld);
    const want = _fa2.copy(base);
    const d = want.distanceTo(T.pos);
    if (d > this.REACH) want.sub(T.pos).multiplyScalar(this.REACH / d).add(T.pos);
    // move the joint by the world delta, expressed in the parent's frame
    const parentInv = _faM.copy(upper.parent.matrixWorld).invert();
    const lp = _fa3.copy(want).applyMatrix4(parentInv);
    const lp0 = _fa4.copy(sp).applyMatrix4(parentInv);
    upper.position.add(lp.sub(lp0));
    upper.updateMatrixWorld(true);
    // elbow down and out
    const pole = _fa5.copy(want).add(_fa6.set(0.28 * side, -0.55, 0.12));
    solveTwoBone(upper, lower, hand, T.pos, pole);
    // hand frame: in this skeleton both hands have the fingers along +Y and curl them toward +Z, so the palm is +Z
    // on BOTH sides (measured on the bind pose; the thumb sits on +X of the right hand and -X of the left one).
    // target: fingers = T.y, palm = T.x -> bone X = Y x Z = T.y x T.x = -T.z, the same basis for either hand (a
    // mirrored palm on the left turned the support hand inside out: palm away from the handguard, fingers curling
    // back toward the camera)
    _faM.makeBasis(_fa1.copy(T.z).negate(), T.y, T.x);
    const q = _faQ.setFromRotationMatrix(_faM);
    // forearm roll: a wrist cannot twist, the forearm does (pronation / supination). Most of the hand's twist about
    // the forearm axis, measured against the bind pose, is given to the forearm so the wrist only bends.
    lower.updateMatrixWorld(true);
    const fq = lower.getWorldQuaternion(_faQ2);
    const hl = _faQ3.copy(fq).invert().multiply(q);                         // hand rotation in forearm space
    const R = _faQ4.copy(hl).multiply(_faQ5.copy(bq.get(hand)).invert());   // relative to the bind relation
    const ax = _fa6.copy(hand.position).normalize();                        // forearm axis (forearm space)
    if (R.w < 0) { R.x = -R.x; R.y = -R.y; R.z = -R.z; R.w = -R.w; }
    const pr = R.x * ax.x + R.y * ax.y + R.z * ax.z;
    const tw = _faQ5.set(ax.x * pr, ax.y * pr, ax.z * pr, R.w);
    if (tw.lengthSq() > 1e-9) {
      tw.normalize();
      lower.quaternion.multiply(_faQ4.identity().slerp(tw, this.TWIST));
      lower.updateMatrixWorld(true);
    }
    const pq = hand.parent.getWorldQuaternion(_faQ2).invert();
    hand.quaternion.copy(pq.multiply(q));
    hand.updateMatrixWorld(true);
  },
  TWIST: 0.75,

  // finger curls: flexion about each joint's local X, toward the palm; trigger finger and thumb separately. Only the
  // flexion is replaced: each joint keeps the spread and twist of the skeleton's own rest pose (Y / Z of its bind
  // rotation; e.g. the middle and ring knuckles are turned 0.4 rad), otherwise curled fingers fan out like a claw.
  _fingers(sideName, T) {
    const B = this.B, c = T.curl === undefined ? 0.8 : T.curl, trig = T.trigger || 0;
    if (!this._fbind) this._fbind = new Map();
    const set = (n, a) => {
      const b = B[sideName + 'Hand' + n]; if (!b) return;
      let r = this._fbind.get(b); if (!r) { r = b.rotation.clone(); this._fbind.set(b, r); }
      b.rotation.set(a, r.y, r.z);
    };
    const idx = sideName === 'Right' && T.trigger !== undefined ? 0.45 + trig * 0.35 : c;
    set('Index1', idx * 0.9); set('Index2', idx * 1.1); set('Index3', idx * 0.8);
    set('Middle1', c * 1.05); set('Middle2', c * 1.25); set('Middle3', c * 0.9);
    set('Ring1', c * 1.1); set('Ring2', c * 1.3); set('Ring3', c * 0.9);
    // thumb: rest pose plus a little opposition toward the fingers as the grip closes
    const th = (n, ax, az) => {
      const b = B[sideName + 'Hand' + n]; if (!b) return;
      let r = this._fbind.get(b); if (!r) { r = b.rotation.clone(); this._fbind.set(b, r); }
      b.rotation.set(r.x + ax, r.y, r.z + az);
    };
    th('Thumb1', 0.12 * c, (sideName === 'Right' ? -0.3 : 0.3) * c); th('Thumb2', 0.3 * c, 0);
  }
};
const _fa1 = new THREE.Vector3(), _fa2 = new THREE.Vector3(), _fa3 = new THREE.Vector3(), _fa4 = new THREE.Vector3(), _fa5 = new THREE.Vector3(), _fa6 = new THREE.Vector3();
const _faHiddenArmScale = new THREE.Vector3(1e-3, 1e-3, 1e-3);
const _faM = new THREE.Matrix4(), _faQ = new THREE.Quaternion(), _faQ2 = new THREE.Quaternion(), _faQ3 = new THREE.Quaternion(), _faQ4 = new THREE.Quaternion(), _faQ5 = new THREE.Quaternion();
