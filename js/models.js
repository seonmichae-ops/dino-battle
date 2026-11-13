// 공룡 배틀 — 3D 모델 (절차 생성)
// ====================================================================
//  모델
// ====================================================================
function addLeg(grp, x, hipY, len, thick, m, front, footMul) {
  const pivot = new THREE.Group();
  pivot.position.set(x, hipY, front || 0);
  const leg = new THREE.Mesh(new THREE.CylinderGeometry(thick, thick * 0.7, len, 5), m);
  leg.position.y = -len / 2;
  const fm = footMul || 1;
  const foot = new THREE.Mesh(new THREE.BoxGeometry(thick * 2.2, thick * 0.8, thick * 3 * fm), m);
  foot.position.set(0, -len, thick * 0.9 * fm);
  pivot.add(leg, foot);
  grp.add(pivot);
  return pivot;
}

// ====================================================================
//  매끈한 공룡 모델: 척추 곡선을 따라 굵기가 변하는 한 덩어리 몸 (몸통·목·꼬리 일체)
// ====================================================================
const smoothMat = (c, vc) => new THREE.MeshStandardMaterial({ color: vc ? 0xffffff : c, vertexColors: !!vc, roughness: 0.82, metalness: 0 });
function lerpProf(prof, f) {
  const n = prof.length - 1, x = clamp(f, 0, 1) * n, i = Math.min(n - 1, Math.floor(x)), k = x - i;
  return [prof[i][0] + (prof[i + 1][0] - prof[i][0]) * k, prof[i][1] + (prof[i + 1][1] - prof[i][1]) * k];
}
function sweepGeo(pts, prof, o) {
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  const N = o.samples || 40, M = o.radial || 12;
  const pos = [], col = [], idx = [];
  const cTop = new THREE.Color(o.top), cBot = new THREE.Color(o.bottom), cBand = o.band != null ? new THREE.Color(o.band) : null, tmp = new THREE.Color();
  const up = new THREE.Vector3(0, 1, 0), side = new THREE.Vector3(), nrm = new THREE.Vector3();
  // 단면 굵기는 조절점 순서(=곡선 매개변수)에 맞춰 보간
  const lens = [0]; for (let i = 1; i < pts.length; i++) lens.push(lens[i - 1] + pts[i].distanceTo(pts[i - 1]));
  const total = lens[lens.length - 1];
  const profAt = u => { const d = u * total; let i = 0; while (i < lens.length - 2 && lens[i + 1] < d) i++; const k = (d - lens[i]) / Math.max(1e-6, lens[i + 1] - lens[i]); return lerpProf(prof, (i + clamp(k, 0, 1)) / (pts.length - 1)); };
  for (let i = 0; i <= N; i++) {
    const u = i / N, P = curve.getPointAt(u), T = curve.getTangentAt(u);
    side.crossVectors(T, up); if (side.lengthSq() < 1e-4) side.set(-1, 0, 0); side.normalize();
    nrm.crossVectors(side, T).normalize();
    const [rx, ry] = profAt(u);
    for (let j = 0; j < M; j++) {
      const a = j / M * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
      pos.push(P.x + side.x * ca * rx + nrm.x * sa * ry, P.y + side.y * ca * rx + nrm.y * sa * ry, P.z + side.z * ca * rx + nrm.z * sa * ry);
      tmp.copy(cBot).lerp(cTop, THREE.MathUtils.smoothstep(sa, -0.5, 0.35)); // 등은 진하고 배는 밝게
      if (cBand && sa > 0.1 && u > (o.bandFrom || 0) && u < (o.bandTo || 1) && ((u * o.bands) % 1) < 0.3) tmp.lerp(cBand, 0.7);
      col.push(tmp.r, tmp.g, tmp.b);
    }
  }
  for (let i = 0; i < N; i++) for (let j = 0; j < M; j++) {
    const a = i * M + j, b = i * M + (j + 1) % M, c = (i + 1) * M + j, d = (i + 1) * M + (j + 1) % M;
    idx.push(a, c, b, b, c, d);
  }
  // 양 끝 막기
  for (const [ring, P, flip] of [[0, curve.getPointAt(0), true], [N, curve.getPointAt(1), false]]) {
    const ci = pos.length / 3; pos.push(P.x, P.y, P.z); col.push(cBot.r, cBot.g, cBot.b);
    for (let j = 0; j < M; j++) { const a = ring * M + j, b = ring * M + (j + 1) % M; if (flip) idx.push(ci, a, b); else idx.push(ci, b, a); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}
// 둥근 머리 (두개골 + 아래턱 + 동그란 눈)
function buildHead(K, sp, m, o) {
  o = o || {};
  const head = new THREE.Group();
  const top = sp.color, bot = sp.belly || sp.color;
  const skullGeo = sweepGeo([new THREE.Vector3(0, 0.0, -0.04), new THREE.Vector3(0, 0.02, K.len * 0.35), new THREE.Vector3(0, -0.01, K.len * 0.75), new THREE.Vector3(0, -0.03, K.len)],
    [[K.w * 0.46, K.h * 0.48], [K.w * 0.5, K.h * 0.5], [K.w * K.taper * 0.48, K.h * 0.36], [K.w * K.taper * 0.28, K.h * 0.2]], { top, bottom: bot, samples: 12, radial: 10 });
  const skull = new THREE.Mesh(skullGeo, m.body); head.add(skull);
  const inner = new THREE.Mesh(new THREE.BoxGeometry(K.w * 0.55, 0.02, K.len * 0.75), mat(0x7a1f1f));
  inner.position.set(0, -K.h * 0.36, K.len * 0.45); head.add(inner);
  const jaw = new THREE.Group(); jaw.position.set(0, -K.h * 0.32, 0.0);
  const mkJaw = (z0, z1, w0, w1) => new THREE.Mesh(sweepGeo([new THREE.Vector3(0, -0.02, z0), new THREE.Vector3(0, -0.03, (z0 + z1) / 2), new THREE.Vector3(0, -0.03, z1)],
    [[w0 * 0.42, K.h * 0.16], [w1 * 0.4, K.h * 0.12], [w1 * 0.26, K.h * 0.07]], { top: bot, bottom: bot, samples: 8, radial: 8 }), m.body);
  let jawFront = jaw;
  if (o.jawHinge) { // 헤레라: 아래턱 중간 관절
    jaw.add(mkJaw(0, K.len * 0.47, K.w, K.w * 0.8));
    jawFront = new THREE.Group(); jawFront.position.set(0, 0, K.len * 0.45);
    jawFront.add(mkJaw(0, K.len * 0.5, K.w * 0.78, K.w * K.taper));
    jaw.add(jawFront);
  } else jaw.add(mkJaw(0, K.len * 0.97, K.w, K.w * K.taper));
  const white = mat(0xf8f4ea), black = mat(0x111111);
  const nT = o.teeth || 0;
  for (let k = 0; k < nT; k++) for (const sx of [-1, 1]) {
    const zz = K.len * (0.2 + 0.72 * k / Math.max(1, nT - 1));
    const leaf = o.mixedTeeth && k >= nT - 2;
    const tooth = leaf ? new THREE.Mesh(new THREE.SphereGeometry(0.022, 5, 4), white) : new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.06, 4), white);
    if (leaf) tooth.scale.set(0.6, 1.3, 1);
    const host = (o.jawHinge && zz > K.len * 0.45) ? jawFront : jaw;
    tooth.position.set(sx * K.w * K.taper * 0.3, 0.02, zz - (host === jawFront && host !== jaw ? K.len * 0.45 : 0));
    host.add(tooth);
  }
  head.add(jaw);
  const es = o.eye || 1;
  for (const sx of [-1, 1]) {
    const ex = sx * K.w * 0.42, ez = K.len * (o.eyeFwd ? 0.32 : 0.22);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045 * es, 10, 8), white);
    eye.position.set(ex, K.h * 0.16, ez); head.add(eye);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.026 * es, 8, 6), black);
    pupil.position.set(ex + sx * 0.03 * es, K.h * 0.17, ez + (o.eyeFwd ? 0.025 : 0.012)); head.add(pupil);
  }
  if (o.nostril) for (const sx of [-1, 1]) { const ns = new THREE.Mesh(new THREE.SphereGeometry(0.022, 6, 5), black); ns.scale.set(0.6, 0.8, 1.4); ns.position.set(sx * K.w * K.taper * 0.22, K.h * 0.06, K.len * 0.9); head.add(ns); }
  if (o.nasalRidge) for (const sx of [-1, 1]) {
    const rd = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, K.len * 0.5, 5), m.stripe);
    rd.rotation.x = Math.PI / 2; rd.position.set(sx * K.w * 0.24, K.h * 0.42, K.len * 0.55); head.add(rd);
  }
  if (o.crest) for (const sx of [-1, 1]) {
    const geo = new THREE.BufferGeometry(), L = K.len * 0.85, H = o.crest;
    const P = [], I = [], seg = 8;
    for (let i = 0; i <= seg; i++) { const t = i / seg, z = t * L, hh = Math.sin(Math.PI * Math.pow(t, 0.8)) * H; P.push(0, 0, z, 0, hh, z); }
    for (let i = 0; i < seg; i++) { const a = i * 2; I.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); geo.setIndex(I); geo.computeVertexNormals();
    const cr = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: sp.stripe, roughness: 0.7, side: THREE.DoubleSide }));
    cr.position.set(sx * K.w * 0.16, K.h * 0.4, K.len * 0.06); cr.rotation.z = sx * 0.08; head.add(cr);
    m.extraMats.push(cr.material);
  }
  return { head, jaw, jawFront: o.jawHinge ? jawFront : null };
}
// 다리: 허벅지 + 정강이 + 발(발가락 셋)
function addLeg2(grp, x, hipY, z, len, th, m, o) {
  o = o || {};
  const pivot = new THREE.Group(); pivot.position.set(x, hipY, z);
  const thigh = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), m.limb);
  thigh.scale.set(th * 1.5, len * 0.3, th * (o.column ? 1.5 : 1.9)); thigh.position.set(0, -len * 0.2, o.column ? 0 : th * 0.4); pivot.add(thigh);
  const shin = new THREE.Mesh(new THREE.CylinderGeometry(th * (o.column ? 1.05 : 0.7), th * (o.column ? 0.95 : 0.5), len * 0.62, 8), m.limb);
  shin.position.set(0, -len * 0.64, o.column ? 0 : -th * 0.15); shin.rotation.x = o.column ? 0 : -0.12; pivot.add(shin);
  const foot = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), m.limb);
  const fl = (o.foot || 1) * th * (o.column ? 1.2 : 2.0);
  foot.scale.set(th * (o.column ? 1.25 : 0.9), th * 0.45, fl); foot.position.set(0, -len + th * 0.3, fl * 0.55); pivot.add(foot);
  const nToe = o.column ? 0 : 3;
  for (let k = 0; k < nToe; k++) {
    const toe = new THREE.Mesh(new THREE.ConeGeometry(th * 0.22, th * 1.1, 5), m.claw);
    toe.rotation.x = Math.PI / 2; toe.position.set((k - 1) * th * 0.45, -len + th * 0.18, fl * 1.25 + th * 0.2 - Math.abs(k - 1) * th * 0.2); pivot.add(toe);
  }
  grp.add(pivot);
  return pivot;
}
function addArm(grp, x, y, z, len, th, hand, m, o) {
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(th, th * 0.75, len, 7), m.limb);
  arm.position.set(x, y - len * 0.32, z + len * 0.32); arm.rotation.x = 0.8; grp.add(arm);
  const hx = x, hy = y - len * 0.66, hz = z + len * 0.64;
  const palm = new THREE.Mesh(new THREE.SphereGeometry(1, 7, 6), m.limb);
  palm.scale.set(th * 0.7, hand * 0.5, hand * 0.35); palm.position.set(hx, hy - hand * 0.2, hz + 0.03); grp.add(palm);
  for (let f = 0; f < o.claws; f++) {
    const big = o.thumb && f === 0;
    const cl = new THREE.Mesh(new THREE.ConeGeometry(big ? 0.05 : 0.022 + o.clawLen * 0.1, big ? o.thumb : o.clawLen, 5), m.claw);
    cl.position.set(hx + (f - (o.claws - 1) / 2) * 0.035 * (x > 0 ? 1 : -1), hy - hand * 0.62, hz + 0.08); cl.rotation.x = big ? 2.2 : 2.6; grp.add(cl);
  }
}
const SMOOTH_BODIES = ['theropod', 'plateo', 'rioja', 'theco'];
const HERB_SPINES = {
  plateo: { pts: [[0, 1.02, -3.7], [0, 1.18, -2.5], [0, 1.3, -1.25], [0, 1.36, -0.4], [0, 1.34, 0.35], [0, 1.42, 0.85], [0, 1.74, 1.14], [0, 2.04, 1.37], [0, 2.2, 1.5]],
    prof: [[0.02, 0.02], [0.2, 0.22], [0.38, 0.42], [0.56, 0.6], [0.55, 0.6], [0.34, 0.38], [0.2, 0.22], [0.15, 0.16], [0.12, 0.13]],
    head: { len: 0.5, h: 0.22, w: 0.24, taper: 0.62 }, hip: 1.18, legs: [[0.32, 0.0, 1.12, 0.17]], arms: { y: 1.25, z: 0.72, len: 0.55, th: 0.08, hand: 0.2, claws: 3, clawLen: 0.08, thumb: 0.28 } },
  rioja: { pts: [[0, 0.82, -4.1], [0, 1.03, -2.8], [0, 1.2, -1.5], [0, 1.27, -0.6], [0, 1.26, 0.4], [0, 1.36, 1.0], [0, 1.68, 1.5], [0, 2.0, 1.9], [0, 2.2, 2.12]],
    prof: [[0.03, 0.03], [0.24, 0.26], [0.46, 0.5], [0.76, 0.7], [0.74, 0.7], [0.42, 0.46], [0.27, 0.3], [0.19, 0.2], [0.14, 0.15]],
    head: { len: 0.46, h: 0.22, w: 0.26, taper: 0.68 }, hip: 1.0, quad: true },
  theco: { pts: [[0, 0.82, -2.35], [0, 0.94, -1.4], [0, 1.0, -0.6], [0, 1.02, -0.15], [0, 1.03, 0.3], [0, 1.2, 0.5], [0, 1.34, 0.62]],
    prof: [[0.02, 0.02], [0.12, 0.13], [0.24, 0.26], [0.3, 0.31], [0.27, 0.29], [0.17, 0.18], [0.15, 0.16]],
    head: { len: 0.58, h: 0.32, w: 0.36, taper: 0.66 }, hip: 0.92, legs: [[0.17, 0.0, 0.88, 0.09]], arms: { y: 1.0, z: 0.35, len: 0.32, th: 0.045, hand: 0.12, claws: 3, clawLen: 0.06, thumb: 0.16 }, eye: 1.7 }
};
function buildSmoothDino(sp) {
  const g = new THREE.Group(); g.rotation.order = 'YXZ';
  const m = { body: smoothMat(0, true), limb: smoothMat(sp.color), claw: smoothMat(0x2a2218), stripe: smoothMat(sp.stripe || sp.color), extraMats: [] };
  m.claw.roughness = 0.5;
  const legs = []; let pts, prof, K, hip, hOpts = {}, bandOpts = null, tailFrom = 0;
  if (sp.body === 'theropod') {
    const S = sp.shape, [bw, bh, bl] = S.body; hip = S.hip;
    const by = hip + 0.1, tl = S.tail;
    pts = [[0, by - tl * 0.14, -bl * 0.42 - tl], [0, by - tl * 0.05, -bl * 0.42 - tl * 0.62], [0, by + 0.02, -bl * 0.42 - tl * 0.22], [0, by + 0.03, -bl * 0.24], [0, by, bl * 0.08], [0, by + 0.02, bl * 0.33]];
    prof = [[0.015, 0.015], [S.tailR * 0.38, S.tailR * 0.45], [S.tailR * 0.85, S.tailR], [bw * 0.46, bh * 0.52], [bw * 0.5, bh * 0.56], [bw * 0.4, bh * 0.48]];
    let py = by + bh * 0.2, pz = bl * 0.44;
    pts.push([0, py, pz]); prof.push([S.neck.r * 1.35, S.neck.r * 1.45]);
    const segL = S.neck.len / S.neck.angles.length;
    S.neck.angles.forEach((a, i) => { py += Math.cos(a) * segL; pz += Math.sin(a) * segL; pts.push([0, py, pz]); const r = S.neck.r * (1 - (i + 1) * 0.15); prof.push([r, r * 1.08]); });
    K = S.skull;
    hOpts = { teeth: S.teeth, mixedTeeth: S.mixedTeeth, eye: S.eye, eyeFwd: S.eyeFwd, nostril: S.nostril, nasalRidge: S.nasalRidge, crest: S.crest, jawHinge: S.jawHinge };
    if (sp.name !== '에오랍토르') bandOpts = { band: sp.stripe, bands: 9, bandFrom: 0.08, bandTo: 0.62 };
    for (const sx of [-1, 1]) legs.push(addLeg2(g, sx * bw * 0.3, hip, -bl * 0.05, S.leg + 0.08, S.legT, m, { foot: S.foot }));
    for (const sx of [-1, 1]) addArm(g, sx * bw * 0.28, by - 0.04, bl * 0.3, S.arm, S.armT, S.hand, m, { claws: S.claws, clawLen: S.clawLen });
  } else {
    const H = HERB_SPINES[sp.body]; hip = H.hip;
    pts = H.pts; prof = H.prof; K = H.head; hOpts = { eye: H.eye || 1, teeth: sp.body === 'theco' ? 3 : 0, mixedTeeth: true };
    if (H.quad) {
      for (const [x, z, ln, th] of [[-0.44, -0.55, 1.0, 0.25], [0.44, -0.55, 1.0, 0.25], [-0.4, 0.62, 0.96, 0.22], [0.4, 0.62, 0.96, 0.22]]) legs.push(addLeg2(g, x, 1.02, z, ln, th, m, { column: true }));
    } else {
      for (const [x, z, ln, th] of H.legs) for (const sx of [-1, 1]) legs.push(addLeg2(g, sx * x, hip, z, ln, th, m, {}));
      const A = H.arms; for (const sx of [-1, 1]) addArm(g, sx * (sp.body === 'theco' ? 0.18 : 0.34), A.y, A.z, A.len, A.th, A.hand, m, A);
    }
  }
  const V = pts.map(p => new THREE.Vector3(p[0], p[1], p[2]));
  const geo = sweepGeo(V, prof, Object.assign({ top: sp.color, bottom: sp.belly || sp.color, samples: 46, radial: 14 }, bandOpts || {}));
  geo.computeBoundingSphere(); geo.boundingSphere.radius += 1.2;
  const body = new THREE.Mesh(geo, m.body); g.add(body);
  // 꼬리 흔들기용: 원래 위치와 꼬리 가중치(엉덩이 0 → 꼬리 끝 1)
  const base = geo.attributes.position.array.slice();
  const zTip = V[0].z, zHip = V[3].z;
  const w = new Float32Array(base.length / 3);
  for (let i = 0; i < w.length; i++) w[i] = Math.pow(clamp((zHip - base[i * 3 + 2]) / (zHip - zTip), 0, 1), 1.6);
  const hd = buildHead(K, sp, m, hOpts);
  const last = V[V.length - 1], prev = V[V.length - 2];
  hd.head.position.copy(last).add(new THREE.Vector3(0, 0.0, 0.0));
  hd.head.rotation.x = -Math.atan2(last.y - prev.y, last.z - prev.z) * 0.35;
  g.add(hd.head);
  const mats = [m.body, m.limb, m.claw, m.stripe, ...m.extraMats];
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; } });
  return { group: g, legs, tail: null, head: hd.head, jaw: hd.jaw, mats, extra: { jawFront: hd.jawFront, smooth: { geo, base, w, tailLen: Math.abs(zHip - zTip) } } };
}

function buildModel(sp) {
  if (SMOOTH_BODIES.includes(sp.body)) return buildSmoothDino(sp);
  const g = new THREE.Group();
  g.rotation.order = 'YXZ';
  const mBody = ownMat(sp.color), mBelly = ownMat(sp.belly || sp.color), mStripe = ownMat(sp.stripe || sp.color);
  const mats = [mBody, mBelly, mStripe];
  const black = mat(0x111111), white = mat(0xffffff), mouthIn = mat(0x7a1f1f);
  const legs = [];
  let tail = null, head = null, jaw = null, extra = {};
  if (sp.body === 'theropod') {
    // 공통 두 발 육식·잡식 골격을 종별 수치(sp.shape)로 다르게 조립
    const S = sp.shape;
    const [bw, bh, bl] = S.body;
    const hipY = S.hip;
    const body = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 1), mBody);
    body.scale.set(bw, bh, bl); body.position.y = hipY + 0.1; g.add(body);
    const belly = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 1), mBelly);
    belly.scale.set(bw * 0.95, bh * 0.75, bl * 0.92); belly.position.set(0, hipY - 0.02, 0.05); g.add(belly);
    // 목: 각도 목록을 따라 마디를 이어 붙임 (코엘로피시스는 S자)
    let px = 0, py = hipY + 0.1 + bh * 0.25, pz = bl * 0.38;
    const segL = S.neck.len / S.neck.angles.length;
    S.neck.angles.forEach((a, i) => {
      const r1 = S.neck.r * (1 - i * 0.18), r2 = S.neck.r * (1 - (i + 1) * 0.18);
      const dy = Math.cos(a) * segL, dz = Math.sin(a) * segL;
      const n = new THREE.Mesh(new THREE.CylinderGeometry(r2, r1, segL * 1.15, 6), mBody);
      n.position.set(px, py + dy / 2, pz + dz / 2); n.rotation.x = a; g.add(n);
      py += dy; pz += dz;
    });
    // 머리
    head = new THREE.Group();
    const K = S.skull;
    const skull = new THREE.Mesh(new THREE.BoxGeometry(K.w, K.h, K.len * 0.55), mBody);
    skull.position.set(0, 0.02, K.len * 0.22); head.add(skull);
    const snout = new THREE.Mesh(new THREE.BoxGeometry(K.w * K.taper, K.h * 0.72, K.len * 0.5), mBody);
    snout.position.set(0, -0.01, K.len * 0.7); head.add(snout);
    const inner = new THREE.Mesh(new THREE.BoxGeometry(K.w * 0.7, 0.03, K.len * 0.8), mouthIn);
    inner.position.set(0, -K.h * 0.42, K.len * 0.45); head.add(inner);
    if (S.nostril) { // 에오랍토르: 조금 커진 콧구멍
      for (const sx of [-1, 1]) { const ns = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.05, 0.07), black); ns.position.set(sx * K.w * K.taper * 0.5, 0.03, K.len * 0.88); head.add(ns); }
    }
    if (S.nasalRidge) for (const sx of [-1, 1]) { // 코엘로피시스: 콧등 양옆의 낮은 뼈 능선
      const rd = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.045, K.len * 0.55), mStripe);
      rd.position.set(sx * K.w * 0.3, K.h * 0.42, K.len * 0.55); head.add(rd);
    }
    if (S.crest) for (const sx of [-1, 1]) { // 릴리엔스테르누스: 한 쌍의 얇은 볏 (추정 복원)
      const geo = new THREE.BufferGeometry();
      const L = K.len * 0.85, H = S.crest;
      geo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, L, 0, H, L * 0.35, 0, H * 0.75, L * 0.75], 3));
      geo.setIndex([0, 1, 2, 2, 1, 3]); geo.computeVertexNormals();
      const cr = new THREE.Mesh(geo, new THREE.MeshPhongMaterial({ color: sp.stripe, flatShading: true, side: THREE.DoubleSide }));
      cr.position.set(sx * K.w * 0.22, K.h * 0.48, K.len * 0.05); head.add(cr);
    }
    // 아래턱 (헤레라: 턱 중간에 앞뒤로 움직이는 관절이 있어 두 마디)
    jaw = new THREE.Group(); jaw.position.set(0, -K.h * 0.45, 0);
    const jawRear = new THREE.Mesh(new THREE.BoxGeometry(K.w * 0.8, K.h * 0.28, K.len * (S.jawHinge ? 0.45 : 0.9)), mBelly);
    jawRear.position.set(0, -K.h * 0.12, K.len * (S.jawHinge ? 0.22 : 0.45)); jaw.add(jawRear);
    let jawFront = jaw;
    if (S.jawHinge) {
      jawFront = new THREE.Group(); jawFront.position.set(0, 0, K.len * 0.45);
      const jf = new THREE.Mesh(new THREE.BoxGeometry(K.w * 0.65, K.h * 0.24, K.len * 0.48), mBelly);
      jf.position.set(0, -K.h * 0.12, K.len * 0.24); jawFront.add(jf);
      const hingeDot = new THREE.Mesh(new THREE.BoxGeometry(K.w * 0.85, K.h * 0.08, 0.04), mStripe);
      hingeDot.position.set(0, -K.h * 0.12, 0); jawFront.add(hingeDot);
      jaw.add(jawFront); extra.jawFront = jawFront;
    }
    // 이빨: 에오랍토르는 앞니가 나뭇잎 모양, 뒤쪽은 칼날 모양 (잡식의 증거)
    const nT = S.teeth || 4;
    for (let k = 0; k < nT; k++) for (const sx of [-1, 1]) {
      const zz = K.len * (0.15 + 0.75 * k / Math.max(1, nT - 1));
      const leaf = S.mixedTeeth && k >= nT - 2;
      const tooth = leaf ? new THREE.Mesh(new THREE.IcosahedronGeometry(0.03, 0), white) : new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.07, 3), white);
      if (leaf) tooth.scale.set(0.6, 1.2, 1);
      tooth.position.set(sx * K.w * 0.3, K.h * 0.05, zz);
      (S.jawHinge && zz > K.len * 0.45 ? jawFront : jaw).add(tooth);
      if (S.jawHinge && zz > K.len * 0.45) tooth.position.z -= K.len * 0.45;
    }
    head.add(jaw);
    for (const sx of [-1, 1]) { // 눈 (코엘로피시스는 앞쪽을 향한 큰 눈)
      const es = S.eye;
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.09 * es, 0.09 * es), white);
      eye.position.set(sx * K.w * 0.5, K.h * 0.2, K.len * (S.eyeFwd ? 0.32 : 0.2));
      if (S.eyeFwd) eye.rotation.y = sx * -0.35;
      head.add(eye);
      const pupil = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.055 * es, 0.05 * es), black);
      pupil.position.set(sx * (K.w * 0.5 + 0.02), K.h * 0.2, K.len * (S.eyeFwd ? 0.34 : 0.22)); head.add(pupil);
    }
    head.position.set(0, py + 0.02, pz + 0.02); g.add(head);
    // 팔·손·발톱
    const clawM = mat(0x2a2218);
    for (const sx of [-1, 1]) {
      const ax = sx * bw * 0.36, ay = hipY + 0.05, az = bl * 0.36;
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(S.armT, S.armT * 0.8, S.arm, 5), mBody);
      arm.position.set(ax, ay - S.arm * 0.3, az + S.arm * 0.3); arm.rotation.x = 0.8; g.add(arm);
      const hx = ax, hy = ay - S.arm * 0.62, hz = az + S.arm * 0.62;
      const hand = new THREE.Mesh(new THREE.BoxGeometry(0.06, S.hand, S.hand * 0.6), mBody);
      hand.position.set(hx, hy - S.hand * 0.3, hz + 0.04); hand.rotation.x = 0.4; g.add(hand);
      for (let f = 0; f < S.claws; f++) { // 발톱 달린 손가락
        const cl = new THREE.Mesh(new THREE.ConeGeometry(0.022 + S.clawLen * 0.12, S.clawLen, 4), clawM);
        cl.position.set(hx + (f - (S.claws - 1) / 2) * 0.035, hy - S.hand * 0.75, hz + 0.1); cl.rotation.x = 2.5; g.add(cl);
      }
      for (let f = 0; f < (S.stubs || 0); f++) { // 작은 손가락(발톱 없음)
        const st = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.05, 0.02), mBody);
        st.position.set(hx - sx * (0.06 + f * 0.025), hy - S.hand * 0.5, hz); g.add(st);
      }
    }
    tail = new THREE.Group();
    const tc = new THREE.Mesh(new THREE.ConeGeometry(S.tailR, S.tail, 6), mBody);
    tc.rotation.x = -Math.PI / 2; tc.position.z = -S.tail / 2; tail.add(tc);
    tail.position.set(0, hipY + 0.12, -bl * 0.42); tail.rotation.x = 0.08; g.add(tail);
    legs.push(addLeg(g, -bw * 0.32, hipY, S.leg, S.legT, mBody, 0, S.foot));
    legs.push(addLeg(g, bw * 0.32, hipY, S.leg, S.legT, mBody, 0, S.foot));
  } else if (sp.body === 'plateo') {
    // 플라테오사우루스: 연구에 따라 두 발로 걷는 모습. 손바닥은 서로 마주보고(땅을 짚지 못함), 큰 엄지 발톱, 길고 유연한 목
    const body = new THREE.Mesh(new THREE.IcosahedronGeometry(0.6, 1), mBody);
    body.scale.set(0.95, 0.95, 1.6); body.position.set(0, 1.3, 0.05); body.rotation.x = -0.08; g.add(body);
    const belly = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 1), mBelly);
    belly.scale.set(0.95, 0.75, 1.55); belly.position.set(0, 1.12, 0.1); g.add(belly);
    // S자 목 (세 마디)
    const neckSegs = [[0, 1.52, 0.92, 0.95, 0.26, 0.2, 0.6], [0, 1.86, 1.2, 0.55, 0.2, 0.15, 0.5], [0, 2.1, 1.42, 0.25, 0.15, 0.12, 0.38]];
    for (const [x, y, z, rx, r1, r2, len] of neckSegs) {
      const n = new THREE.Mesh(new THREE.CylinderGeometry(r2, r1, len, 7), mBody);
      n.position.set(x, y, z); n.rotation.x = rx; g.add(n);
      const nb = new THREE.Mesh(new THREE.CylinderGeometry(r2 * 0.75, r1 * 0.75, len * 0.95, 6), mBelly);
      nb.position.set(x, y - 0.05, z + 0.04); nb.rotation.x = rx; g.add(nb);
    }
    head = new THREE.Group();
    const skull = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.2, 0.42), mBody); skull.position.set(0, 0.02, 0.12); head.add(skull);
    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.14, 0.16), mBody); snout.position.set(0, -0.01, 0.38); head.add(snout);
    jaw = new THREE.Group(); jaw.position.set(0, -0.08, -0.05);
    const jm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.07, 0.48), mBelly); jm.position.set(0, -0.03, 0.22); jaw.add(jm); head.add(jaw);
    for (const sx of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.08, 0.08), white); eye.position.set(sx * 0.12, 0.07, 0.08); head.add(eye);
      const pu = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.05, 0.05), black); pu.position.set(sx * 0.135, 0.07, 0.1); head.add(pu);
    }
    head.position.set(0, 2.24, 1.6); g.add(head);
    // 짧지만 튼튼한 팔 + 서로 마주보는 손 + 큰 엄지 발톱
    const claw = mat(0xe9dcc0);
    for (const sx of [-1, 1]) {
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.07, 0.55, 5), mBody);
      arm.position.set(sx * 0.36, 1.18, 0.85); arm.rotation.x = 0.7; arm.rotation.z = sx * 0.15; g.add(arm);
      const hand = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.2, 0.16), mBody);
      hand.position.set(sx * 0.33, 0.96, 1.05); g.add(hand); // 손바닥이 안쪽(서로)을 향함
      const thumb = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.26, 4), claw);
      thumb.position.set(sx * 0.28, 0.9, 1.16); thumb.rotation.x = 2.2; thumb.rotation.z = -sx * 0.5; g.add(thumb);
      for (let k = 0; k < 2; k++) { const f = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.12, 3), claw); f.position.set(sx * 0.34, 0.84, 1.04 + k * 0.06); f.rotation.x = Math.PI; g.add(f); }
    }
    tail = new THREE.Group();
    const tc = new THREE.Mesh(new THREE.ConeGeometry(0.42, 2.9, 7), mBody);
    tc.rotation.x = -Math.PI / 2; tc.position.z = -1.45; tail.add(tc);
    tail.position.set(0, 1.28, -0.75); tail.rotation.x = 0.1; g.add(tail);
    // 튼튼한 뒷다리 (두 발 보행)
    legs.push(addLeg(g, -0.3, 1.15, 1.05, 0.2, mBody, -0.1));
    legs.push(addLeg(g, 0.3, 1.15, 1.05, 0.2, mBody, -0.1));
  } else if (sp.body === 'rioja') {
    // 리오하사우루스: 네 발로 천천히 걸었다는 복원 (굵고 무거운 다리 뼈, 긴 목·꼬리, 작은 머리)
    const body = new THREE.Mesh(new THREE.IcosahedronGeometry(0.7, 1), mBody);
    body.scale.set(1.05, 0.95, 1.45); body.position.y = 1.2; g.add(body);
    const belly = new THREE.Mesh(new THREE.IcosahedronGeometry(0.6, 1), mBelly);
    belly.scale.set(1.0, 0.7, 1.35); belly.position.set(0, 0.98, 0); g.add(belly);
    const neckSegs = [[0, 1.55, 1.0, 1.1, 0.34, 0.26, 0.75], [0, 1.85, 1.5, 0.95, 0.26, 0.19, 0.7], [0, 2.12, 1.95, 0.85, 0.19, 0.14, 0.55]];
    for (const [x, y, z, rx, r1, r2, len] of neckSegs) {
      const n = new THREE.Mesh(new THREE.CylinderGeometry(r2, r1, len, 7), mBody);
      n.position.set(x, y, z); n.rotation.x = rx; g.add(n);
    }
    head = new THREE.Group();
    const skull = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.2, 0.42), mBody); skull.position.set(0, 0.02, 0.12); head.add(skull);
    jaw = new THREE.Group(); jaw.position.set(0, -0.08, -0.05);
    const jm = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.08, 0.4), mBelly); jm.position.set(0, -0.03, 0.2); jaw.add(jm); head.add(jaw);
    for (const sx of [-1, 1]) { const eye = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.07, 0.07), black); eye.position.set(sx * 0.135, 0.07, 0.1); head.add(eye); }
    head.position.set(0, 2.28, 2.22); g.add(head);
    tail = new THREE.Group();
    const tc = new THREE.Mesh(new THREE.ConeGeometry(0.5, 3.2, 7), mBody);
    tc.rotation.x = -Math.PI / 2; tc.position.z = -1.6; tail.add(tc);
    tail.position.set(0, 1.2, -0.9); tail.rotation.x = 0.12; g.add(tail);
    // 기둥 같은 굵은 네 다리
    legs.push(addLeg(g, -0.42, 1.0, 1.0, 0.26, mBody, -0.5));
    legs.push(addLeg(g, 0.42, 1.0, 1.0, 0.26, mBody, -0.5));
    legs.push(addLeg(g, -0.38, 0.95, 0.95, 0.23, mBody, 0.62));
    legs.push(addLeg(g, 0.38, 0.95, 0.95, 0.23, mBody, 0.62));
  } else if (sp.body === 'theco') {
    // 테코돈토사우루스: 작은 두 발 초식, 짧은 목에 비해 큰 머리와 큰 눈, 큰 엄지 발톱, 긴 다리
    const body = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 1), mBody);
    body.scale.set(0.58, 0.58, 0.95); body.position.y = 0.98; g.add(body);
    const belly = new THREE.Mesh(new THREE.IcosahedronGeometry(0.4, 1), mBelly);
    belly.scale.set(0.6, 0.5, 0.95); belly.position.set(0, 0.86, 0.04); g.add(belly);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 0.32, 6), mBody);
    neck.position.set(0, 1.22, 0.45); neck.rotation.x = 0.55; g.add(neck);
    head = new THREE.Group();
    const skull = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.34, 0.5), mBody); skull.position.set(0, 0.04, 0.14); head.add(skull);
    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.2), mBody); snout.position.set(0, -0.02, 0.45); head.add(snout);
    jaw = new THREE.Group(); jaw.position.set(0, -0.12, -0.05);
    const jm = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.08, 0.56), mBelly); jm.position.set(0, -0.03, 0.27); jaw.add(jm);
    for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) { const t = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.06, 4), white); t.position.set(sx * 0.1, 0.03, 0.3 + k * 0.08); jaw.add(t); } // 나뭇잎 모양 이빨
    head.add(jaw);
    for (const sx of [-1, 1]) { // 큰 눈
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.15, 0.15), white); eye.position.set(sx * 0.2, 0.1, 0.12); head.add(eye);
      const pu = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.09, 0.09), black); pu.position.set(sx * 0.225, 0.1, 0.15); head.add(pu);
    }
    head.position.set(0, 1.42, 0.68); g.add(head);
    const claw = mat(0xe9dcc0);
    for (const sx of [-1, 1]) {
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.32, 4), mBody);
      arm.position.set(sx * 0.2, 0.95, 0.42); arm.rotation.x = 0.9; g.add(arm);
      const thumb = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.16, 4), claw);
      thumb.position.set(sx * 0.19, 0.85, 0.58); thumb.rotation.x = 2.3; g.add(thumb);
    }
    tail = new THREE.Group();
    const tc = new THREE.Mesh(new THREE.ConeGeometry(0.24, 1.9, 6), mBody);
    tc.rotation.x = -Math.PI / 2; tc.position.z = -0.95; tail.add(tc);
    tail.position.set(0, 1.0, -0.45); tail.rotation.x = 0.1; g.add(tail);
    // 길고 가는 다리
    legs.push(addLeg(g, -0.17, 0.92, 0.88, 0.09, mBody));
    legs.push(addLeg(g, 0.17, 0.92, 0.88, 0.09, mBody));
  } else if (sp.body === 'rhyncho') {
    const body = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 1), mBody);
    body.scale.set(0.9, 0.5, 1.1); body.position.y = 0.48; g.add(body);
    head = new THREE.Group();
    head.add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.28, 0.36), mBody));
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.28, 4), mat(0x3a3020));
    beak.rotation.x = Math.PI / 2 + 0.6; beak.position.set(0, -0.05, 0.25); head.add(beak);
    for (const sx of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 0.06), black);
      eye.position.set(sx * 0.24, 0.06, 0.06); head.add(eye);
    }
    head.position.set(0, 0.55, 0.68); g.add(head);
    tail = new THREE.Group();
    const tc = new THREE.Mesh(new THREE.ConeGeometry(0.2, 1.0, 5), mBody);
    tc.rotation.x = -Math.PI / 2; tc.position.z = -0.5; tail.add(tc);
    tail.position.set(0, 0.42, -0.45); g.add(tail);
    for (const [x, z] of [[-0.35, 0.3], [0.35, 0.3], [-0.35, -0.3], [0.35, -0.3]]) legs.push(addLeg(g, x, 0.38, 0.32, 0.08, mBody, z));
  } else if (sp.body === 'bug') {
    const b1 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 0), mBody);
    b1.scale.set(0.7, 0.45, 1.1); b1.position.y = 0.35; g.add(b1);
    const b2 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28, 0), mat(0x3b2412));
    for (const [x, z] of [[-0.18, 0.1], [0.18, -0.15], [0.05, -0.35]]) { const sp = new THREE.Mesh(new THREE.IcosahedronGeometry(0.09, 0), mat(0xffe36a)); sp.position.set(x, 0.55, z); g.add(sp); }
    b2.position.set(0, 0.38, 0.55); g.add(b2);
    extra.wings = [];
    for (const sx of [-1, 1]) {
      const w = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.8), new THREE.MeshBasicMaterial({ color: 0xdff3ff, transparent: true, opacity: 0.45, side: THREE.DoubleSide }));
      w.rotation.x = -Math.PI / 2; w.position.set(sx * 0.28, 0.62, -0.1); g.add(w); extra.wings.push(w);
    }
  }
  return { group: g, legs, tail, head, jaw, mats, extra };
}

// ====================================================================
//  생물
// ====================================================================
