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
  thigh.scale.set(th * (o.column ? 1.12 : 1.5), len * 0.3, th * (o.column ? 1.35 : 1.9)); thigh.position.set(0, -len * (o.column ? 0.12 : 0.2), o.column ? 0 : th * 0.4); pivot.add(thigh);
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
  if (o.sickle) { // 드로마이오사우루스류의 치켜든 갈고리 발톱 (둘째 발가락)
    const sk = new THREE.Mesh(new THREE.ConeGeometry(th * 0.3, th * 2.0, 6), m.claw);
    sk.position.set(-(o.side || 1) * th * 0.5, -len + th * 1.0, fl * 0.95); sk.rotation.x = 0.5; pivot.add(sk);
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
// --------------------------------------------------------------------
//  MVP 몸 형태: 네발 초식(용각류·검룡·곡룡·각룡·조각류)과 두 발 소형 초식
//  pts: 꼬리 끝 → 목 끝 (x=0, y, z), prof: 각 점의 [가로, 세로] 반지름
//  quad: { back/front: [x, z, 다리 길이, 굵기] } — 다리 길이 = 엉덩이·어깨 높이
//  acc: 몸에 붙는 장식 (골판·가시·돛·갑옷·곤봉 등), headOpts: 머리 장식
// --------------------------------------------------------------------
const P3 = a => a.map(([y, z]) => [0, y, z]);
Object.assign(HERB_SPINES, {
  dryo: { pts: P3([[0.82, -2.6], [0.95, -1.6], [1.02, -0.7], [1.05, -0.15], [1.08, 0.3], [1.25, 0.55], [1.45, 0.72], [1.55, 0.82]]),
    prof: [[0.02, 0.02], [0.11, 0.12], [0.2, 0.22], [0.27, 0.3], [0.25, 0.28], [0.14, 0.15], [0.11, 0.12], [0.1, 0.1]],
    head: { len: 0.42, h: 0.22, w: 0.2, taper: 0.6 }, eye: 1.6, hip: 1.02, legs: [[0.16, 0.0, 1.0, 0.09]],
    arms: { x: 0.17, y: 1.04, z: 0.42, len: 0.3, th: 0.04, hand: 0.1, claws: 3, clawLen: 0.05 }, headOpts: { beak: 1 } },
  psittaco: { pts: P3([[0.72, -2.0], [0.86, -1.3], [0.96, -0.6], [1.0, -0.12], [1.02, 0.3], [1.16, 0.52], [1.32, 0.66]]),
    prof: [[0.02, 0.02], [0.12, 0.13], [0.22, 0.25], [0.3, 0.33], [0.28, 0.3], [0.16, 0.17], [0.14, 0.15]],
    head: { len: 0.4, h: 0.36, w: 0.32, taper: 0.55 }, eye: 1.5, hip: 0.98, legs: [[0.17, 0.0, 0.96, 0.09]],
    arms: { x: 0.18, y: 1.0, z: 0.36, len: 0.32, th: 0.045, hand: 0.1, claws: 3, clawLen: 0.05 },
    headOpts: { beak: 2, cheekHorns: 1 }, acc: [{ t: 'bristles', f0: 0.9, f1: 2.4, n: 14, len: 0.42 }] },
  pachy: { pts: P3([[0.85, -2.6], [1.0, -1.7], [1.12, -0.8], [1.18, -0.2], [1.2, 0.35], [1.32, 0.65], [1.5, 0.85], [1.62, 0.98]]),
    prof: [[0.02, 0.02], [0.15, 0.17], [0.28, 0.32], [0.42, 0.48], [0.42, 0.46], [0.22, 0.24], [0.16, 0.17], [0.14, 0.15]],
    head: { len: 0.46, h: 0.3, w: 0.28, taper: 0.55 }, eye: 1.1, hip: 1.16, legs: [[0.25, 0.0, 1.15, 0.14]],
    arms: { x: 0.28, y: 1.15, z: 0.5, len: 0.34, th: 0.06, hand: 0.12, claws: 3, clawLen: 0.05 }, headOpts: { beak: 1, dome: 1 } },
  stego: { pts: P3([[0.95, -3.6], [1.22, -2.6], [1.45, -1.6], [1.6, -0.6], [1.5, 0.3], [1.2, 1.0], [0.95, 1.5], [0.8, 1.85], [0.72, 2.05]]),
    prof: [[0.03, 0.03], [0.18, 0.2], [0.32, 0.36], [0.52, 0.62], [0.55, 0.6], [0.45, 0.48], [0.24, 0.24], [0.16, 0.16], [0.13, 0.13]],
    head: { len: 0.5, h: 0.2, w: 0.2, taper: 0.55 }, eye: 0.8, headPitch: 0.15,
    quad: { back: [0.38, -0.55, 1.55, 0.22], front: [0.34, 0.95, 1.0, 0.17] }, headOpts: { beak: 1 },
    acc: [{ t: 'plates', f0: 1.2, f1: 6.9, n: 17, h: 0.62, w: 0.42, peak: 3.0 }, { t: 'thag', f: 0.35, len: 0.75 }] },
  kentro: { pts: P3([[0.8, -3.4], [1.05, -2.4], [1.28, -1.45], [1.42, -0.5], [1.34, 0.3], [1.08, 0.95], [0.88, 1.4], [0.76, 1.72], [0.7, 1.9]]),
    prof: [[0.03, 0.03], [0.15, 0.17], [0.28, 0.32], [0.46, 0.54], [0.48, 0.52], [0.38, 0.4], [0.2, 0.2], [0.14, 0.14], [0.12, 0.12]],
    head: { len: 0.46, h: 0.18, w: 0.18, taper: 0.55 }, eye: 0.8, headPitch: 0.15,
    quad: { back: [0.34, -0.45, 1.38, 0.19], front: [0.3, 0.9, 0.9, 0.15] }, headOpts: { beak: 1 },
    acc: [{ t: 'plates', f0: 3.3, f1: 7.0, n: 8, h: 0.34, w: 0.28, peak: 3.3 },
      { t: 'spikes', f0: 0.15, f1: 3.1, n: 7, len: 0.62, grow: true }, { t: 'shoulderSpike', f: 5.1, len: 0.85 }] },
  brachio: { pts: P3([[1.6, -3.2], [1.85, -2.3], [2.05, -1.4], [2.15, -0.6], [2.35, 0.4], [2.55, 1.2], [3.1, 1.75], [3.9, 2.15], [4.7, 2.4], [5.3, 2.55]]),
    prof: [[0.04, 0.04], [0.2, 0.22], [0.38, 0.42], [0.62, 0.68], [0.72, 0.78], [0.6, 0.66], [0.3, 0.32], [0.22, 0.23], [0.17, 0.18], [0.14, 0.14]],
    head: { len: 0.62, h: 0.3, w: 0.28, taper: 0.7 }, eye: 0.9, headPitch: 0.25,
    quad: { back: [0.34, -0.55, 1.7, 0.28], front: [0.34, 1.2, 2.1, 0.25] }, headOpts: { nasalDome: 1 } },
  argentino: { pts: P3([[1.2, -3.6], [1.5, -2.6], [1.8, -1.6], [2.0, -0.6], [2.1, 0.4], [2.05, 1.2], [2.35, 1.9], [2.85, 2.6], [3.35, 3.2], [3.75, 3.65]]),
    prof: [[0.04, 0.04], [0.24, 0.26], [0.46, 0.5], [0.8, 0.82], [0.88, 0.86], [0.7, 0.72], [0.34, 0.36], [0.25, 0.26], [0.19, 0.2], [0.15, 0.15]],
    head: { len: 0.55, h: 0.26, w: 0.28, taper: 0.7 }, eye: 0.85, headPitch: 0.3,
    quad: { back: [0.44, -0.55, 1.65, 0.32], front: [0.42, 1.15, 1.75, 0.3] }, headOpts: {} },
  sauropelta: { pts: P3([[0.45, -3.2], [0.65, -2.3], [0.85, -1.4], [1.0, -0.5], [1.02, 0.4], [0.95, 1.1], [0.82, 1.55], [0.72, 1.85]]),
    prof: [[0.04, 0.03], [0.2, 0.16], [0.38, 0.3], [0.82, 0.55], [0.86, 0.56], [0.7, 0.48], [0.3, 0.26], [0.22, 0.2]],
    head: { len: 0.5, h: 0.26, w: 0.34, taper: 0.75 }, eye: 0.8, headPitch: 0.1,
    quad: { back: [0.5, -0.45, 0.85, 0.2], front: [0.5, 0.95, 0.75, 0.18] }, headOpts: { beak: 1 },
    acc: [{ t: 'osteo', f0: 1.4, f1: 5.6, rows: [0.5, 1.0, 1.57, 2.14, 2.64], step: 0.32, size: 0.11 },
      { t: 'neckSpikes', f0: 5.2, f1: 6.8, n: 3, len: 0.75 }] },
  ankylo: { pts: P3([[0.5, -3.3], [0.66, -2.4], [0.84, -1.45], [1.0, -0.5], [1.02, 0.4], [0.95, 1.05], [0.82, 1.45], [0.74, 1.68]]),
    prof: [[0.05, 0.05], [0.16, 0.14], [0.36, 0.28], [0.95, 0.56], [0.98, 0.56], [0.8, 0.48], [0.34, 0.28], [0.27, 0.24]],
    head: { len: 0.52, h: 0.3, w: 0.46, taper: 0.8 }, eye: 0.75, headPitch: 0.1,
    quad: { back: [0.58, -0.45, 0.85, 0.22], front: [0.56, 0.9, 0.75, 0.2] }, headOpts: { beak: 1, headSpikes: 1 },
    acc: [{ t: 'osteo', f0: 2.2, f1: 5.6, rows: [0.35, 0.9, 1.57, 2.24, 2.79], step: 0.3, size: 0.12 },
      { t: 'sideSpikes', f0: 2.4, f1: 5.2, n: 6, len: 0.3 }, { t: 'club', f: 0.05, r: 0.34 }] },
  trice: { pts: P3([[0.8, -3.0], [1.05, -2.1], [1.3, -1.2], [1.45, -0.4], [1.45, 0.4], [1.3, 1.0], [1.12, 1.38], [1.02, 1.58]]),
    prof: [[0.03, 0.03], [0.2, 0.22], [0.38, 0.42], [0.7, 0.72], [0.74, 0.74], [0.6, 0.62], [0.38, 0.38], [0.32, 0.32]],
    head: { len: 1.1, h: 0.55, w: 0.5, taper: 0.5 }, eye: 0.85, headPitch: 0.3,
    quad: { back: [0.45, -0.4, 1.4, 0.27], front: [0.48, 0.95, 1.15, 0.24] }, headOpts: { beak: 1, frill: 'trice', horns: 'trice' } },
  styraco: { pts: P3([[0.72, -2.7], [0.95, -1.9], [1.18, -1.1], [1.32, -0.35], [1.32, 0.35], [1.18, 0.9], [1.02, 1.25], [0.94, 1.42]]),
    prof: [[0.03, 0.03], [0.18, 0.2], [0.34, 0.38], [0.62, 0.64], [0.66, 0.66], [0.54, 0.56], [0.34, 0.34], [0.29, 0.29]],
    head: { len: 0.95, h: 0.5, w: 0.44, taper: 0.5 }, eye: 0.85, headPitch: 0.3,
    quad: { back: [0.4, -0.35, 1.28, 0.24], front: [0.43, 0.85, 1.05, 0.21] }, headOpts: { beak: 1, frill: 'styraco', horns: 'styraco' } },
  edmonto: { pts: P3([[0.7, -3.5], [1.0, -2.5], [1.3, -1.5], [1.52, -0.5], [1.44, 0.4], [1.22, 1.0], [1.22, 1.38], [1.32, 1.66], [1.38, 1.84]]),
    prof: [[0.03, 0.03], [0.2, 0.34], [0.36, 0.52], [0.6, 0.7], [0.6, 0.64], [0.46, 0.5], [0.3, 0.32], [0.24, 0.26], [0.2, 0.22]],
    head: { len: 0.95, h: 0.34, w: 0.3, taper: 1.05 }, eye: 0.9, headPitch: 0.35,
    quad: { back: [0.42, -0.5, 1.45, 0.27], front: [0.32, 1.0, 1.15, 0.14] }, headOpts: { bill: 1, comb: 1 } },
  ourano: { pts: P3([[0.65, -3.4], [0.95, -2.4], [1.25, -1.45], [1.42, -0.5], [1.35, 0.4], [1.15, 1.0], [1.18, 1.38], [1.3, 1.68], [1.38, 1.88]]),
    prof: [[0.03, 0.03], [0.2, 0.26], [0.36, 0.45], [0.55, 0.62], [0.55, 0.58], [0.42, 0.46], [0.26, 0.28], [0.19, 0.2], [0.16, 0.17]],
    head: { len: 0.85, h: 0.3, w: 0.26, taper: 0.8 }, eye: 0.9, headPitch: 0.35,
    quad: { back: [0.4, -0.5, 1.38, 0.26], front: [0.3, 1.0, 1.1, 0.13], thumb: 0.32 }, headOpts: { bill: 0.6, snoutBump: 1 },
    acc: [{ t: 'sail', f0: 1.3, f1: 5.6, h: 0.6 }] }
});
SMOOTH_BODIES.push(...Object.keys(HERB_SPINES).filter(k => !SMOOTH_BODIES.includes(k)));

// 등뼈 곡선 위의 위치·굵기 (조절점 번호 f, 소수 허용)
function spineAt(V, prof, f) {
  const n = V.length - 1; f = clamp(f, 0, n);
  const i = Math.min(n - 1, Math.floor(f)), k = f - i;
  return { p: V[i].clone().lerp(V[i + 1], k), r: [prof[i][0] + (prof[i + 1][0] - prof[i][0]) * k, prof[i][1] + (prof[i + 1][1] - prof[i][1]) * k], t: V[i + 1].clone().sub(V[i]).normalize() };
}
const UPV = new THREE.Vector3(0, 1, 0);
function coneTo(mat, base, len, pos, dir) {
  const c = new THREE.Mesh(new THREE.ConeGeometry(base, len, 7), mat);
  const d = new THREE.Vector3(...dir).normalize();
  c.quaternion.setFromUnitVectors(UPV, d);
  c.position.copy(pos).addScaledVector(d, len * 0.45);
  return c;
}
// 돛·지느러미 같은 얇은 막
function membraneGeo(V, prof, f0, f1, hFn, side, N) {
  N = N || 20; const P = [], I = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N, s = spineAt(V, prof, f0 + (f1 - f0) * u), yb = s.p.y + side * s.r[1] * 0.75;
    P.push(0, yb, s.p.z, 0, yb + side * hFn(u), s.p.z);
  }
  for (let i = 0; i < N; i++) { const a = i * 2; I.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setIndex(I); g.computeVertexNormals();
  return g;
}
// 몸 장식 붙이기. 꼬리에 붙은 것은 꼬리와 함께 흔들리도록 등록
function addBodyAcc(g, m, sp, V, prof, list, wOf, sm) {
  const plateM = smoothMat(sp.stripe || sp.color), hornM = smoothMat(0xd8ccb0), dark = smoothMat(new THREE.Color(sp.color).multiplyScalar(0.72).getHex());
  m.extraMats.push(plateM, hornM, dark);
  const attach = o => { const w = wOf(o.position.z); if (w > 0.001) sm.attach.push({ obj: o, bx: o.position.x, w }); g.add(o); };
  const memb = (geo, color) => {
    const mm = new THREE.MeshStandardMaterial({ color, roughness: 0.8, side: THREE.DoubleSide }); m.extraMats.push(mm);
    const mesh = new THREE.Mesh(geo, mm); g.add(mesh);
    const base = geo.attributes.position.array.slice(), w = new Float32Array(base.length / 3);
    for (let i = 0; i < w.length; i++) w[i] = wOf(base[i * 3 + 2]);
    if (w.some(x => x > 0.001)) sm.extraGeos.push({ geo, base, w });
  };
  for (const a of list) {
    if (a.t === 'plates') { // 검룡 골판: 엇갈린 두 줄
      for (let i = 0; i < a.n; i++) {
        const f = a.f0 + (a.f1 - a.f0) * i / (a.n - 1), s = spineAt(V, prof, f);
        const prof01 = Math.exp(-Math.pow((f - a.peak) / 2.0, 2));
        const h = a.h * (0.35 + 0.65 * prof01), w = a.w * (0.45 + 0.55 * prof01);
        const pl = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), plateM);
        pl.scale.set(0.035, h, w); pl.position.set((i % 2 ? 1 : -1) * 0.07, s.p.y + s.r[1] * 0.75 + h * 0.6, s.p.z);
        pl.rotation.z = (i % 2 ? 1 : -1) * 0.12; attach(pl);
      }
    } else if (a.t === 'spikes') { // 켄트로 등·꼬리 가시 (한 쌍씩)
      for (let i = 0; i < a.n; i++) {
        const f = a.f0 + (a.f1 - a.f0) * i / (a.n - 1), s = spineAt(V, prof, f), L = a.len * (a.grow ? 1.25 - 0.55 * i / (a.n - 1) : 1);
        for (const sx of [-1, 1]) attach(coneTo(hornM, 0.06, L, new THREE.Vector3(sx * s.r[0] * 0.35, s.p.y + s.r[1] * 0.7, s.p.z), [sx * 0.45, 0.85, -0.35]));
      }
    } else if (a.t === 'thag') { // 스테고 꼬리 끝 가시 4개
      for (const [f, sx] of [[a.f, -1], [a.f, 1], [a.f + 0.35, -1], [a.f + 0.35, 1]]) {
        const s = spineAt(V, prof, f);
        attach(coneTo(hornM, 0.06, a.len, new THREE.Vector3(sx * s.r[0] * 0.5, s.p.y + s.r[1] * 0.5, s.p.z), [sx * 0.9, 0.55, -0.45]));
      }
    } else if (a.t === 'shoulderSpike') {
      const s = spineAt(V, prof, a.f);
      for (const sx of [-1, 1]) g.add(coneTo(hornM, 0.07, a.len, new THREE.Vector3(sx * s.r[0] * 0.85, s.p.y - s.r[1] * 0.1, s.p.z), [sx * 0.8, 0.15, -0.6]));
    } else if (a.t === 'neckSpikes') { // 사우로펠타 목·어깨 가시
      for (let i = 0; i < a.n; i++) {
        const f = a.f0 + (a.f1 - a.f0) * i / Math.max(1, a.n - 1), s = spineAt(V, prof, f), L = a.len * (1.15 - 0.3 * i / a.n);
        for (const sx of [-1, 1]) g.add(coneTo(hornM, 0.07, L, new THREE.Vector3(sx * s.r[0] * 0.8, s.p.y + s.r[1] * 0.35, s.p.z), [sx * 0.85, 0.45, 0.2]));
      }
    } else if (a.t === 'sideSpikes') {
      for (let i = 0; i < a.n; i++) {
        const f = a.f0 + (a.f1 - a.f0) * i / (a.n - 1), s = spineAt(V, prof, f);
        for (const sx of [-1, 1]) attach(coneTo(hornM, 0.06, a.len, new THREE.Vector3(sx * s.r[0] * 0.92, s.p.y - s.r[1] * 0.05, s.p.z), [sx, 0.1, -0.3]));
      }
    } else if (a.t === 'osteo') { // 뼈 갑옷 돌기
      for (let f = a.f0; f <= a.f1; f += a.step) {
        const s = spineAt(V, prof, f);
        for (const ang of a.rows) {
          const b = new THREE.Mesh(new THREE.SphereGeometry(a.size, 6, 5), dark);
          b.scale.set(1, 0.6, 1.2);
          b.position.set(Math.cos(ang) * s.r[0] * 0.97, s.p.y + Math.sin(ang) * s.r[1] * 0.97, s.p.z + (Math.round(f / a.step) % 2 ? a.step * 0.4 : 0));
          attach(b);
        }
      }
    } else if (a.t === 'club') { // 안킬로 꼬리 곤봉
      const s = spineAt(V, prof, a.f);
      const cl = new THREE.Mesh(new THREE.SphereGeometry(a.r, 10, 8), dark); cl.scale.set(1.35, 0.7, 1.1);
      cl.position.copy(s.p); attach(cl);
    } else if (a.t === 'bristles') { // 프시타코 꼬리 강모
      for (let i = 0; i < a.n; i++) {
        const f = a.f0 + (a.f1 - a.f0) * i / (a.n - 1), s = spineAt(V, prof, f);
        const br = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.014, a.len, 4), dark);
        br.position.set(0, s.p.y + s.r[1] * 0.8 + a.len * 0.45, s.p.z); br.rotation.x = -0.35; attach(br);
      }
    } else if (a.t === 'sail') { // 등 돛 (오우라노·스피노)
      memb(membraneGeo(V, prof, a.f0, a.f1, u => a.h * Math.pow(Math.sin(Math.PI * u), 0.75) * (a.mShape ? 1 - 0.18 * Math.exp(-Math.pow((u - 0.5) / 0.12, 2)) : 1), 1, 26), sp.stripe || sp.color);
    } else if (a.t === 'tailFin') { // 스피노 지느러미 꼬리
      memb(membraneGeo(V, prof, a.f0, a.f1, u => a.h * Math.sin(Math.PI * Math.min(1, u * 1.15)), 1, 16), new THREE.Color(sp.color).multiplyScalar(0.85).getHex());
      memb(membraneGeo(V, prof, a.f0, a.f1, u => a.h * 0.6 * Math.sin(Math.PI * Math.min(1, u * 1.15)), -1, 16), new THREE.Color(sp.color).multiplyScalar(0.85).getHex());
    } else if (a.t === 'backSpikes') { // 인도미누스 등 돌기
      for (let f = a.f0; f <= a.f1; f += 0.32) { const s = spineAt(V, prof, f); attach(coneTo(dark, 0.05, a.len, new THREE.Vector3(0, s.p.y + s.r[1] * 0.85, s.p.z), [0, 1, -0.25])); }
    } else if (a.t === 'tailFan') { // 랩터 꼬리 끝 깃털
      const s = spineAt(V, prof, a.f);
      const fan = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), plateM); fan.scale.set(a.w, 0.025, a.len); fan.position.copy(s.p); attach(fan);
    }
  }
}
// 머리 장식 (머리 좌표: 두개골이 z=0~K.len, 윗면 y≈K.h/2)
function decorateHead(head, K, sp, m, o) {
  const keratin = smoothMat(0x4a3a2a), hornM = smoothMat(0xddd0b4), stripeM = smoothMat(sp.stripe || sp.color), skin = smoothMat(sp.color);
  m.extraMats.push(keratin, hornM, stripeM, skin);
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  if (o.beak) { // 부리 (2 = 앵무새처럼 굽은 부리)
    const b = coneTo(keratin, K.w * K.taper * (o.beak === 2 ? 0.42 : 0.3), K.len * (o.beak === 2 ? 0.3 : 0.24), V3(0, -K.h * 0.05, K.len * 0.9), o.beak === 2 ? [0, -0.8, 0.6] : [0, -0.35, 1]);
    head.add(b);
  }
  if (o.bill) { // 오리 부리
    const b = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), keratin);
    b.scale.set(K.w * 0.55 * (o.bill > 0.8 ? 1 : 0.8), K.h * 0.12, K.len * 0.2); b.position.set(0, -K.h * 0.2, K.len * 0.92); head.add(b);
  }
  if (o.snoutBump) { const b = new THREE.Mesh(new THREE.SphereGeometry(K.h * 0.28, 8, 6), skin); b.scale.set(0.8, 0.7, 1.3); b.position.set(0, K.h * 0.32, K.len * 0.5); head.add(b); }
  if (o.dome) { // 파키 돔 머리 + 뒤쪽 혹
    const d = new THREE.Mesh(new THREE.SphereGeometry(K.w * 0.7, 14, 10), stripeM); d.scale.set(1, 0.82, 1.05); d.position.set(0, K.h * 0.5, K.len * 0.2); head.add(d);
    for (let i = 0; i < 7; i++) { const a = Math.PI * (0.15 + 0.7 * i / 6); head.add(coneTo(hornM, 0.035, 0.09, V3(Math.cos(a) * K.w * 0.62, K.h * 0.3 + Math.sin(a) * 0.05, -0.04 - Math.sin(a) * K.w * 0.25), [Math.cos(a), 0.3, -0.6])); }
  }
  if (o.nasalDome) { const d = new THREE.Mesh(new THREE.SphereGeometry(K.h * 0.5, 12, 8), skin); d.scale.set(0.9, 0.8, 1.2); d.position.set(0, K.h * 0.42, K.len * 0.38); head.add(d); }
  if (o.comb) { // 에드몬토 살 볏
    const c = new THREE.Mesh(new THREE.CircleGeometry(K.len * 0.17, 12, 0, Math.PI), new THREE.MeshStandardMaterial({ color: 0xb8483a, roughness: 0.7, side: THREE.DoubleSide }));
    m.extraMats.push(c.material); c.rotation.y = Math.PI / 2; c.position.set(0, K.h * 0.38, K.len * 0.22); head.add(c);
  }
  if (o.cheekHorns) for (const sx of [-1, 1]) head.add(coneTo(hornM, 0.05, 0.16, V3(sx * K.w * 0.45, -K.h * 0.1, K.len * 0.28), [sx, -0.5, 0.1]));
  if (o.hornlets) for (const sx of [-1, 1]) head.add(coneTo(stripeM, o.hornlets * 0.45, o.hornlets, V3(sx * K.w * 0.33, K.h * 0.38, K.len * 0.2), [sx * 0.15, 1, 0.15]));
  if (o.browRidge) for (const sx of [-1, 1]) { const r = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), stripeM); r.scale.set(K.w * 0.14, K.h * 0.1, K.len * 0.14); r.position.set(sx * K.w * 0.36, K.h * 0.34, K.len * 0.2); head.add(r); }
  if (o.headSpikes) for (const sx of [-1, 1]) { // 안킬로 머리 뒤 뿔
    head.add(coneTo(hornM, 0.06, 0.2, V3(sx * K.w * 0.45, K.h * 0.25, 0.02), [sx * 0.7, 0.35, -0.6]));
    head.add(coneTo(hornM, 0.05, 0.16, V3(sx * K.w * 0.48, -K.h * 0.1, 0.06), [sx * 0.7, -0.4, -0.5]));
  }
  if (o.frill) { // 각룡 프릴 (반원판을 뒤로 젖힘)
    const R = o.frill === 'trice' ? K.h * 1.45 : K.h * 1.3;
    const fm = new THREE.MeshStandardMaterial({ color: sp.stripe || sp.color, roughness: 0.8, side: THREE.DoubleSide }); m.extraMats.push(fm);
    const fr = new THREE.Group(); fr.position.set(0, K.h * 0.15, 0.02); fr.rotation.x = -0.55;
    const disc = new THREE.Mesh(new THREE.CircleGeometry(R, 22, -0.25, Math.PI + 0.5), fm); fr.add(disc);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(R, 0.03, 5, 22, Math.PI + 0.5), stripeM); rim.rotation.z = -0.25; fr.add(rim);
    if (o.frill === 'trice') for (let i = 0; i <= 12; i++) { const a = -0.25 + (Math.PI + 0.5) * i / 12; const b = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.12, 5), hornM); b.position.set(Math.cos(a) * R, Math.sin(a) * R, 0); b.rotation.z = a - Math.PI / 2; fr.add(b); }
    else for (let i = 0; i < 6; i++) { const a = 0.55 + (Math.PI - 1.1) * i / 5, L = (i === 0 || i === 5) ? 0.45 : 0.62; const sp2 = new THREE.Mesh(new THREE.ConeGeometry(0.05, L, 6), hornM); sp2.position.set(Math.cos(a) * (R + L * 0.42), Math.sin(a) * (R + L * 0.42), 0); sp2.rotation.z = a - Math.PI / 2; fr.add(sp2); }
    head.add(fr);
  }
  if (o.horns === 'trice') {
    for (const sx of [-1, 1]) head.add(coneTo(hornM, 0.07, 0.75, V3(sx * K.w * 0.3, K.h * 0.38, K.len * 0.28), [sx * 0.15, 0.75, 0.75]));
    head.add(coneTo(hornM, 0.06, 0.22, V3(0, K.h * 0.25, K.len * 0.78), [0, 0.8, 0.5]));
  } else if (o.horns === 'styraco') {
    head.add(coneTo(hornM, 0.08, 0.62, V3(0, K.h * 0.28, K.len * 0.68), [0, 0.85, 0.4]));
    for (const sx of [-1, 1]) head.add(coneTo(hornM, 0.04, 0.08, V3(sx * K.w * 0.3, K.h * 0.38, K.len * 0.28), [0, 1, 0.2]));
  }
}

function buildSmoothDino(sp) {
  const g = new THREE.Group(); g.rotation.order = 'YXZ';
  const m = { body: smoothMat(0, true), limb: smoothMat(sp.color), claw: smoothMat(0x2a2218), stripe: smoothMat(sp.stripe || sp.color), extraMats: [] };
  m.claw.roughness = 0.5;
  const legs = []; let pts, prof, K, hip, hOpts = {}, bandOpts = null, acc = [], headPitch = null, H = null, frontLegs = [];
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
    hOpts = { teeth: S.teeth, mixedTeeth: S.mixedTeeth, eye: S.eye, eyeFwd: S.eyeFwd, nostril: S.nostril, nasalRidge: S.nasalRidge, crest: S.crest, jawHinge: S.jawHinge, hornlets: S.hornlets, browRidge: S.browRidge };
    if (sp.name !== '에오랍토르' && !sp.boss) bandOpts = { band: sp.stripe, bands: 9, bandFrom: 0.08, bandTo: 0.62 };
    for (const sx of [-1, 1]) legs.push(addLeg2(g, sx * bw * 0.3, hip, -bl * 0.05, S.leg + 0.08, S.legT, m, { foot: S.foot, sickle: S.sickle, side: sx }));
    for (const sx of [-1, 1]) addArm(g, sx * bw * 0.28, by - 0.04, bl * 0.3, S.arm, S.armT, S.hand, m, { claws: S.claws, clawLen: S.clawLen });
    if (S.feathers) for (const sx of [-1, 1]) { // 랩터 앞팔 깃털
      const fv = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), m.stripe); fv.scale.set(0.015, S.arm * 0.2, S.arm * 0.55);
      fv.position.set(sx * bw * 0.33, by - 0.04 - S.arm * 0.4, bl * 0.3 + S.arm * 0.2); fv.rotation.x = 0.9; g.add(fv);
    }
    if (S.sail) acc.push({ t: 'sail', f0: 2.2, f1: 5.5, h: S.sail, mShape: true });
    if (S.tailFin) acc.push({ t: 'tailFin', f0: 0.12, f1: 2.3, h: S.tailR * 1.4 });
    if (S.backSpikes) acc.push({ t: 'backSpikes', f0: 1.0, f1: 6.4, len: 0.16 });
    if (S.feathers) acc.push({ t: 'tailFan', f: 0.25, w: 0.2, len: 0.45 });
  } else {
    H = HERB_SPINES[sp.body]; hip = H.hip;
    pts = H.pts; prof = H.prof; K = H.head; hOpts = Object.assign({ eye: H.eye || 1, teeth: sp.body === 'theco' ? 3 : 0, mixedTeeth: true }, H.headOpts || {});
    acc = H.acc || []; headPitch = H.headPitch != null ? H.headPitch : null;
    if (H.quad === true) {
      for (const [x, z, ln, th] of [[-0.44, -0.55, 1.0, 0.25], [0.44, -0.55, 1.0, 0.25], [-0.4, 0.62, 0.96, 0.22], [0.4, 0.62, 0.96, 0.22]]) legs.push(addLeg2(g, x, 1.02, z, ln, th, m, { column: true }));
    } else if (H.quad) {
      for (const key of ['back', 'front']) { const [x, z, ln, th] = H.quad[key]; for (const sx of [-1, 1]) { const pv = addLeg2(g, sx * x, ln + 0.02, z, ln, th, m, { column: true }); legs.push(pv); if (key === 'front') frontLegs.push([pv, sx, ln, th]); } }
      if (H.quad.thumb) for (const [pv, sx, ln, th] of frontLegs) pv.add(coneTo(m.claw, 0.04, H.quad.thumb, new THREE.Vector3(-sx * th * 0.7, -ln * 0.78, th * 0.4), [-sx * 0.35, 0.25, 1]));
    } else {
      for (const [x, z, ln, th] of H.legs) for (const sx of [-1, 1]) legs.push(addLeg2(g, sx * x, hip, z, ln, th, m, {}));
      const A = H.arms; for (const sx of [-1, 1]) addArm(g, sx * (A.x || (sp.body === 'theco' ? 0.18 : 0.34)), A.y, A.z, A.len, A.th, A.hand, m, A);
    }
  }
  const V = pts.map(p => new THREE.Vector3(p[0], p[1], p[2]));
  const geo = sweepGeo(V, prof, Object.assign({ top: sp.color, bottom: sp.belly || sp.color, samples: 46, radial: 14 }, bandOpts || {}));
  geo.computeBoundingSphere(); geo.boundingSphere.radius += 1.2;
  const body = new THREE.Mesh(geo, m.body); g.add(body);
  // 꼬리 흔들기용: 원래 위치와 꼬리 가중치(엉덩이 0 → 꼬리 끝 1)
  const base = geo.attributes.position.array.slice();
  const zTip = V[0].z, zHip = V[3].z;
  const wOf = z => Math.pow(clamp((zHip - z) / (zHip - zTip), 0, 1), 1.6);
  const w = new Float32Array(base.length / 3);
  for (let i = 0; i < w.length; i++) w[i] = wOf(base[i * 3 + 2]);
  const sm = { geo, base, w, tailLen: Math.abs(zHip - zTip), attach: [], extraGeos: [] };
  if (acc.length) addBodyAcc(g, m, sp, V, prof, acc, wOf, sm);
  const hd = buildHead(K, sp, m, hOpts);
  decorateHead(hd.head, K, sp, m, hOpts);
  const last = V[V.length - 1], prev = V[V.length - 2];
  hd.head.position.copy(last);
  hd.head.rotation.x = headPitch != null ? headPitch : -Math.atan2(last.y - prev.y, last.z - prev.z) * 0.35;
  g.add(hd.head);
  const mats = [m.body, m.limb, m.claw, m.stripe, ...m.extraMats];
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; } });
  return { group: g, legs, tail: null, head: hd.head, jaw: hd.jaw, mats, extra: { jawFront: hd.jawFront, headPitch: headPitch || 0, smooth: sm } };
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
    if (sp.snout === 'croc') { // 작은 악어류: 납작하고 긴 주둥이
      head.add(new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.22, 0.34), mBody));
      const sn = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.13, 0.5), mBody); sn.position.set(0, -0.04, 0.4); head.add(sn);
      for (const sx of [-1, 1]) { const t = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.07, 4), mat(0xf4efe0)); t.rotation.x = Math.PI; t.position.set(sx * 0.09, -0.12, 0.58); head.add(t); }
      for (let k = 0; k < 6; k++) { const sc = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.12), mStripe); sc.position.set((k % 2 ? 1 : -1) * 0.12, 0.74, 0.3 - k * 0.15); g.add(sc); }
    } else if (sp.snout === 'mammal') { // 오소리만 한 포유류: 둥근 머리, 귀, 털빛
      const hd = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 1), mBody); hd.scale.set(1, 0.85, 1.25); head.add(hd);
      const no = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 5), mat(0x1a1410)); no.position.set(0, 0, 0.28); head.add(no);
      for (const sx of [-1, 1]) { const ear = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 5), mBody); ear.scale.set(1, 1, 0.4); ear.position.set(sx * 0.14, 0.17, -0.05); head.add(ear); }
    } else {
      head.add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.28, 0.36), mBody));
      const beak = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.28, 4), mat(0x3a3020));
      beak.rotation.x = Math.PI / 2 + 0.6; beak.position.set(0, -0.05, 0.25); head.add(beak);
    }
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
