// 공룡 배틀 — 바다 생물 모델과 바다 지형 (옆에서 보는 시점)
// 모델 좌표: 앞 +z, 위 +y, 몸 중심선 y=0. 옆모습(yz 평면)이 화면에 보임
const SEA_BODIES = ['ichthyo', 'plesio', 'plio', 'mosa', 'shark', 'fish', 'placo', 'turtle', 'saw'];
const P2 = a => a.map(([y, z]) => new THREE.Vector3(0, y, z));

// 옆에서 보이는 납작한 지느러미 (u = 몸 앞뒤 방향, v = 위아래)
function finMesh(pts, color, m) {
  const sh = new THREE.Shape(); pts.forEach(([u, v], i) => i ? sh.lineTo(u, v) : sh.moveTo(u, v));
  const geo = new THREE.ShapeGeometry(sh);
  const a = geo.attributes.position.array;
  for (let i = 0; i < a.length; i += 3) { const u = a[i], v = a[i + 1]; a[i] = 0; a[i + 1] = v; a[i + 2] = u; }
  geo.computeVertexNormals();
  const mt = new THREE.MeshStandardMaterial({ color, roughness: 0.8, side: THREE.DoubleSide, emissive: new THREE.Color(color).multiplyScalar(0.3) }); m.extraMats.push(mt);
  return new THREE.Mesh(geo, mt);
}
const FLUKES = {
  lunate: h => [[0.15 * h, 0], [-0.3 * h, 1.0 * h], [-0.48 * h, 0.98 * h], [-0.12 * h, 0.05 * h], [-0.48 * h, -0.9 * h], [-0.3 * h, -0.92 * h]],
  low: h => [[0.7 * h, 0.02], [-0.15 * h, 0.4 * h], [-0.45 * h, 0], [-0.15 * h, -0.32 * h]],
  shark: h => [[0.25 * h, 0.12 * h], [-0.95 * h, 1.15 * h], [-0.8 * h, 0.8 * h], [-0.12 * h, 0.04 * h], [-0.4 * h, -0.55 * h], [-0.18 * h, -0.5 * h], [0.18 * h, -0.14 * h]],
  hypo: h => [[0.25 * h, -0.12 * h], [-0.95 * h, -1.05 * h], [-0.8 * h, -0.75 * h], [-0.12 * h, -0.04 * h], [-0.4 * h, 0.5 * h], [-0.18 * h, 0.45 * h], [0.18 * h, 0.12 * h]],
  fork: h => [[0.15 * h, 0], [-0.55 * h, 0.9 * h], [-0.62 * h, 0.82 * h], [-0.25 * h, 0.02 * h], [-0.62 * h, -0.82 * h], [-0.55 * h, -0.9 * h]],
  paddle: h => [[0.2 * h, 0.15 * h], [-0.5 * h, 0.3 * h], [-0.7 * h, 0], [-0.5 * h, -0.3 * h], [0.2 * h, -0.15 * h]]
};

function buildSwimmer(sp) {
  const g = new THREE.Group(); g.rotation.order = 'YXZ';
  const m = { body: smoothMat(0, true), limb: smoothMat(sp.color), claw: smoothMat(0x2a2218), stripe: smoothMat(sp.stripe || sp.color), extraMats: [] };
  const S = sp.shape || {}, b = sp.body;
  let pts, prof, K, hOpts = { eye: 1, teeth: 6 }, acc = [], flips = [], fluke = null, flukeH = 0.8, dorsal = null, headPitch = 0;
  if (b === 'ichthyo') { // 어룡: 물고기 모양 몸, 긴 주둥이, 초승달 꼬리
    const L = S.L, D = S.D;
    pts = P2([[0, -L * 0.52], [0.01, -L * 0.34], [0.02, -L * 0.15], [0.03, 0], [0.02, L * 0.15], [0.0, L * 0.27]]);
    prof = [[0.03, 0.05], [D * 0.16, D * 0.26], [D * 0.36, D * 0.55], [D * 0.46, D * 0.7], [D * 0.42, D * 0.6], [D * 0.3, D * 0.42]];
    K = { len: S.snout, h: D * 0.52, w: D * 0.46, taper: 0.3 }; hOpts = { eye: S.eye, teeth: 9 };
    fluke = S.low ? 'low' : 'lunate'; flukeH = S.fluke;
    if (S.dorsal) dorsal = { f: 2.7, len: L * 0.22, h: S.dorsal };
    const fl = S.flip || 1;
    flips = [{ f: 4.1, len: D * 1.0 * fl, w: D * 0.42, down: 0.75 }, { f: 2.25, len: D * 0.6 * fl, w: D * 0.3, down: 0.7 }];
  } else if (b === 'plesio') { // 장경룡·노토사우루스·타니스트로페우스: 긴 목
    const N = S.neck, T = S.tail, th = S.thin ? 0.6 : 1;
    pts = P2([[0, -0.9 - T], [0.02, -0.9 - T * 0.5], [0.04, -0.75], [0.05, -0.25], [0.05, 0.4], [0.05, 0.95], [0.08, 1.15 + N * 0.3], [0.12, 1.15 + N * 0.6], [0.15, 1.15 + N * 0.85], [0.16, 1.15 + N]]);
    prof = [[0.02, 0.02], [0.1 * th, 0.09 * th], [0.28 * th, 0.2 * th], [0.6 * th, 0.4 * th], [0.62 * th, 0.42 * th], [0.42 * th, 0.3 * th], [0.17, 0.16], [0.14, 0.13], [0.12, 0.11], [0.11, 0.1]];
    K = { len: S.head, h: 0.2, w: 0.2, taper: 0.5 }; hOpts = { eye: 1.1, teeth: 8 };
    const fl = S.flip;
    flips = [{ f: 5.1, len: 1.0 * fl, w: 0.36 * fl, down: 0.55 }, { f: 3.4, len: 0.95 * fl, w: 0.33 * fl, down: 0.55 }];
    if (S.legs) fluke = 'paddle', flukeH = 0.25; // 노토·타니: 꼬리 끝이 살짝 납작
  } else if (b === 'plio') { // 단경룡: 짧은 목, 거대한 머리
    pts = P2([[0, -2.2], [0.02, -1.6], [0.04, -0.9], [0.05, -0.2], [0.05, 0.55], [0.05, 1.05], [0.06, 1.35]]);
    prof = [[0.02, 0.02], [0.13, 0.11], [0.36, 0.27], [0.68, 0.48], [0.66, 0.47], [0.44, 0.34], [0.34, 0.28]];
    K = { len: S.head, h: 0.5, w: 0.5, taper: 0.55 }; hOpts = { eye: 0.9, teeth: 9 };
    flips = [{ f: 4.6, len: 1.5, w: 0.48, down: 0.5 }, { f: 2.8, len: 1.4, w: 0.45, down: 0.5 }];
  } else if (b === 'mosa') { // 모사사우루스류·바다악어: 긴 몸, 아래로 꺾인 꼬리지느러미
    const L = S.L || 1;
    pts = P2([[-0.2, -3.0 * L], [-0.04, -2.2 * L], [0.02, -1.3 * L], [0.04, -0.4 * L], [0.04, 0.5 * L], [0.04, 1.1 * L], [0.05, 1.4 * L]]);
    prof = [[0.03, 0.06], [0.11, 0.2], [0.26, 0.36], [0.4, 0.5], [0.42, 0.52], [0.32, 0.4], [0.26, 0.32]];
    K = { len: S.head, h: S.hh, w: S.hh * 0.9, taper: S.taper }; hOpts = { eye: 1, teeth: S.blunt ? 0 : 9, mixedTeeth: !!S.blunt };
    fluke = 'hypo'; flukeH = 0.75 * L;
    flips = [{ f: 4.7, len: 0.75, w: 0.3, down: 0.6 }, { f: 2.8, len: 0.65, w: 0.26, down: 0.6 }];
    if (S.blunt) acc.push({ t: 'none' });
  } else if (b === 'shark') { // 상어: 위 꼬리가 긴 꼬리지느러미
    const L = S.L, D = S.D;
    pts = P2([[0.12, -L * 0.5], [0.05, -L * 0.33], [0.02, -L * 0.15], [0.02, 0], [0.03, L * 0.17], [0.0, L * 0.3]]);
    prof = [[0.03, 0.04], [D * 0.14, D * 0.2], [D * 0.3, D * 0.42], [D * 0.42, D * 0.6], [D * 0.4, D * 0.55], [D * 0.26, D * 0.34]];
    K = { len: L * 0.17, h: D * 0.5, w: D * 0.45, taper: 0.45 }; hOpts = { eye: 0.8, teeth: 7 }; headPitch = 0.08;
    fluke = 'shark'; flukeH = D * 1.2;
    dorsal = { f: 3.3, len: L * 0.2, h: D * 0.75, spine: S.spine };
    flips = [{ f: 4.0, len: D * 0.95, w: D * 0.38, down: 0.95 }];
  } else if (b === 'fish') { // 경골어류: 크시팍티누스·리드시크티스
    const L = S.L, D = S.D;
    pts = P2([[0.0, -L * 0.48], [0.01, -L * 0.32], [0.02, -L * 0.14], [0.03, 0], [0.03, L * 0.16], [0.02, L * 0.28]]);
    prof = [[0.03, 0.05], [D * 0.12, D * 0.2], [D * 0.28, D * 0.46], [D * 0.36, D * 0.62], [D * 0.36, D * 0.6], [D * 0.3, D * 0.48]];
    K = { len: L * 0.2, h: D * 0.62, w: D * 0.5, taper: S.gape ? 0.95 : 0.6 }; hOpts = { eye: S.gape ? 0.7 : 1.1, teeth: S.gape ? 0 : 8 };
    headPitch = S.upjaw ? -0.12 : 0;
    fluke = 'fork'; flukeH = D * 1.1;
    dorsal = { f: 2.7, len: L * 0.16, h: D * 0.5 };
    flips = [{ f: 4.1, len: D * 0.9 * S.fin, w: D * 0.3, down: 0.9 }];
  } else if (b === 'placo') { // 플라코두스: 통통한 몸, 등에 뼈 돌기, 긴 꼬리
    pts = P2([[0, -2.6], [0.02, -1.8], [0.05, -1.0], [0.08, -0.3], [0.08, 0.4], [0.06, 0.9], [0.06, 1.15]]);
    prof = [[0.02, 0.02], [0.12, 0.12], [0.3, 0.28], [0.62, 0.5], [0.6, 0.48], [0.36, 0.32], [0.26, 0.24]];
    K = { len: 0.5, h: 0.32, w: 0.34, taper: 0.7 }; hOpts = { eye: 1, teeth: 4, mixedTeeth: true };
    acc.push({ t: 'osteo', f0: 2.6, f1: 4.4, rows: [1.0, 1.57, 2.14], step: 0.28, size: 0.09 });
    flips = [{ f: 4.6, len: 0.7, w: 0.28, down: 0.8 }, { f: 2.7, len: 0.65, w: 0.26, down: 0.8 }];
    fluke = 'paddle'; flukeH = 0.22;
  } else if (b === 'turtle') { // 바다거북: 넓적한 몸 + 등딱지, 긴 앞지느러미
    pts = P2([[0, -1.2], [0.02, -0.9], [0.04, -0.5], [0.05, -0.1], [0.05, 0.4], [0.06, 0.8], [0.1, 1.05]]);
    prof = [[0.03, 0.03], [0.12, 0.08], [0.45, 0.22], [0.72, 0.3], [0.68, 0.3], [0.32, 0.2], [0.2, 0.17]];
    K = { len: 0.5, h: 0.32, w: 0.3, taper: 0.55 }; hOpts = { eye: 1.1, teeth: 0, beak: 2 };
    acc.push({ t: 'shell', ridges: S.ridges });
    flips = [{ f: 4.4, len: 1.9, w: 0.42, down: 0.45 }, { f: 2.2, len: 0.8, w: 0.3, down: 0.6 }];
  } else if (b === 'saw') { // 온코프리스티스: 납작한 몸 + 톱 주둥이
    pts = P2([[0.05, -2.4], [0.03, -1.6], [0.02, -0.8], [0.02, -0.1], [0.02, 0.6], [0.0, 1.1], [-0.02, 1.35]]);
    prof = [[0.02, 0.02], [0.08, 0.08], [0.22, 0.16], [0.7, 0.24], [0.66, 0.22], [0.34, 0.15], [0.22, 0.11]];
    K = { len: 0.35, h: 0.2, w: 0.3, taper: 0.7 }; hOpts = { eye: 0.9, teeth: 0 };
    acc.push({ t: 'saw', len: 1.9 });
    dorsal = { f: 2.4, len: 0.4, h: 0.32 };
    fluke = 'shark'; flukeH = 0.35;
    flips = [{ f: 3.6, len: 0.9, w: 0.5, down: 0.25 }];
  }
  const V = pts;
  const geo = sweepGeo(V, prof, { top: sp.color, bottom: sp.belly || sp.color, samples: 46, radial: 14, band: b === 'shark' || b === 'fish' ? null : sp.stripe, bands: 7, bandFrom: 0.1, bandTo: 0.6 });
  geo.computeBoundingSphere(); geo.boundingSphere.radius += 1.5;
  g.add(new THREE.Mesh(geo, m.body));
  const base = geo.attributes.position.array.slice();
  const zTip = V[0].z, zHip = V[3].z;
  const wOf = z => Math.pow(clamp((zHip - z) / (zHip - zTip), 0, 1), 1.6);
  const w = new Float32Array(base.length / 3);
  for (let i = 0; i < w.length; i++) w[i] = wOf(base[i * 3 + 2]);
  const sm = { geo, base, w, tailLen: Math.abs(zHip - zTip), attach: [], extraGeos: [] };
  const attach = o => { const ww = wOf(o.position.z); if (ww > 0.001) sm.attach.push({ obj: o, bx: o.position.x, w: ww }); g.add(o); };
  // 꼬리지느러미
  if (fluke) { const f = finMesh(FLUKES[fluke](flukeH), new THREE.Color(sp.color).multiplyScalar(0.9).getHex(), m); f.position.copy(V[0]); attach(f); }
  // 등지느러미
  if (dorsal) {
    const s = spineAt(V, prof, dorsal.f), L = dorsal.len, H = dorsal.h;
    const f = finMesh([[L * 0.5, 0], [-L * 0.15, H], [-L * 0.45, H * 0.85], [-L * 0.5, 0]], sp.stripe || sp.color, m);
    f.position.set(0, s.p.y + s.r[1] * 0.85, s.p.z); attach(f);
    if (dorsal.spine) { const c = coneTo(m.claw, 0.03, H * 1.05, new THREE.Vector3(0, s.p.y + s.r[1] * 0.85, s.p.z + L * 0.45), [0, 1, -0.25]); g.add(c); }
  }
  // 지느러미발 (다리처럼 저어서 헤엄)
  const legs = [];
  for (const F of flips) {
    const s = spineAt(V, prof, F.f);
    for (const sx of [-1, 1]) {
      const pv = new THREE.Group(); pv.position.set(sx * s.r[0] * 0.8, s.p.y - s.r[1] * 0.35, s.p.z);
      const d = new THREE.Vector3(sx * 0.45, -F.down, -0.55).normalize();
      const fm = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), m.limb);
      fm.scale.set(F.w * 0.5, F.len * 0.5, 0.05 + F.w * 0.08);
      fm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d);
      fm.position.copy(d).multiplyScalar(F.len * 0.45);
      pv.add(fm); g.add(pv); legs.push(pv);
    }
  }
  // 등딱지·톱·뼈 돌기
  for (const a of acc) {
    if (a.t === 'shell') {
      const s = spineAt(V, prof, 3.4);
      const shM = smoothMat(new THREE.Color(sp.color).lerp(new THREE.Color(sp.stripe || sp.color), 0.3).getHex()); m.extraMats.push(shM);
      const sh = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 12), shM); sh.scale.set(0.95, 0.42, 1.1); sh.position.set(0, s.p.y + 0.06, s.p.z); g.add(sh);
      if (a.ridges) for (let i = 0; i < 7; i++) { const r = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 5), m.claw); r.position.set(0, s.p.y + 0.47 - Math.abs(i - 3) * 0.02, s.p.z - 0.75 + i * 0.25); g.add(r); }
    } else if (a.t === 'saw') {
      const tip = V[V.length - 1];
      const ro = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.05, a.len), m.limb); ro.position.set(0, tip.y - 0.02, tip.z + 0.25 + a.len / 2); g.add(ro);
      const hornM = smoothMat(0xe8dcc0); m.extraMats.push(hornM);
      for (let i = 0; i < 9; i++) for (const sx of [-1, 1]) g.add(coneTo(hornM, 0.025, 0.14, new THREE.Vector3(sx * 0.08, tip.y - 0.04, tip.z + 0.4 + i * a.len / 9.5), [sx, -0.45, -0.2]));
    }
  }
  const real = acc.filter(a => a.t === 'osteo');
  if (real.length) addBodyAcc(g, m, sp, V, prof, real, wOf, sm);
  const hd = buildHead(K, sp, m, hOpts);
  decorateHead(hd.head, K, sp, m, hOpts);
  hd.head.position.copy(V[V.length - 1]); hd.head.rotation.x = headPitch;
  g.add(hd.head);
  const mats = [m.body, m.limb, m.claw, m.stripe, ...m.extraMats];
  return { group: g, legs, tail: null, head: hd.head, jaw: hd.jaw, mats, extra: { jawFront: hd.jawFront, headPitch, smooth: sm, swim: true } };
}

// 바다 먹잇감: 암모나이트(감긴 껍데기)·벨렘나이트(오징어 비슷)·바큘리테스(곧은 껍데기)
function buildSeaPrey(sp) {
  const g = new THREE.Group(); g.rotation.order = 'YXZ';
  const mBody = new THREE.MeshPhongMaterial({ color: sp.color, flatShading: true }), mBelly = new THREE.MeshPhongMaterial({ color: sp.belly, flatShading: true });
  const mats = [mBody, mBelly], tent = mat(0xb07060);
  if (sp.body === 'ammonite') {
    for (let k = 0; k < 3; k++) { const t = new THREE.Mesh(new THREE.TorusGeometry(0.42 - k * 0.13, 0.13 - k * 0.03, 8, 18), k % 2 ? mBelly : mBody); t.rotation.y = Math.PI / 2; t.position.z = -0.05 * k; g.add(t); }
    const c = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), mBody); g.add(c);
    for (let i = 0; i < 5; i++) { const tt = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.35, 4), tent); tt.rotation.x = Math.PI / 2; tt.position.set(0, -0.15 + i * 0.07, 0.5); g.add(tt); }
  } else if (sp.body === 'belemnite') {
    const bd = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.12, 0.9, 8), mBody); bd.rotation.x = Math.PI / 2; g.add(bd);
    const gd = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.45, 8), mBelly); gd.rotation.x = -Math.PI / 2; gd.position.z = -0.65; g.add(gd);
    for (const sy of [-1, 1]) { const fn = new THREE.Mesh(new THREE.SphereGeometry(0.2, 6, 4), mBody); fn.scale.set(0.05, 1, 0.8); fn.position.set(0, sy * 0.15, -0.3); g.add(fn); }
    for (let i = 0; i < 6; i++) { const tt = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.4, 4), tent); tt.rotation.x = Math.PI / 2; tt.position.set(0, -0.1 + i * 0.04, 0.62); g.add(tt); }
  } else { // baculites
    const sh = new THREE.Mesh(new THREE.ConeGeometry(0.16, 1.5, 10), mBody); sh.rotation.x = -Math.PI / 2; sh.position.z = -0.4; g.add(sh);
    for (let i = 0; i < 5; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.15 - i * 0.022, 0.02, 4, 10), mBelly); r.position.z = 0.2 - i * 0.28; g.add(r); }
    for (let i = 0; i < 5; i++) { const tt = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.35, 4), tent); tt.rotation.x = Math.PI / 2; tt.position.set(0, -0.08 + i * 0.04, 0.5); g.add(tt); }
  }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return { group: g, legs: [], tail: null, head: null, jaw: null, mats, extra: { swim: true } };
}
// 바다의 작은 먹이(육지의 곤충 자리): 작은 물고기 세 마리
function buildFishSchool() {
  const g = new THREE.Group(); g.rotation.order = 'YXZ';
  const mt = new THREE.MeshPhongMaterial({ color: 0xc8dce6, flatShading: true }), fin = mat(0x8fb0c0);
  for (const [y, z] of [[0.12, 0.2], [-0.12, -0.05], [0.02, -0.35]]) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.18, 7, 5), mt); b.scale.set(0.5, 0.75, 1.5); b.position.set(0, y, z); g.add(b);
    const t = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.18, 4), fin); t.rotation.x = Math.PI / 2; t.scale.set(0.3, 1, 1); t.position.set(0, y, z - 0.32); g.add(t);
  }
  return { group: g, legs: [], tail: null, head: null, jaw: null, mats: [mt], extra: { swim: true } };
}
// 조개·해파리 (육지의 고사리 자리). 화면 위쪽이 논리 좌표 −z 이므로 rotation.x = −π/2로 세움
function makeSeaFood(onFloor) {
  const grp = new THREE.Group(), inner = new THREE.Group(); inner.rotation.x = -Math.PI / 2; grp.add(inner);
  if (onFloor) {
    const c = mat(pick([0xd8c8b0, 0xc8a890, 0xb8b8c8]));
    for (const sy of [1, -1]) { const h = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), c); h.scale.set(1, 0.45, 0.8); h.rotation.x = sy > 0 ? 0 : Math.PI; h.position.y = 0.2 + sy * 0.02; inner.add(h); }
  } else {
    const bell = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshPhongMaterial({ color: 0xf0c8e8, transparent: true, opacity: 0.75 }));
    inner.add(bell);
    for (let i = 0; i < 5; i++) { const t = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.01, 0.9, 3), mat(0xe8b8d8)); t.position.set(Math.cos(i * 1.25) * 0.25, -0.45, Math.sin(i * 1.25) * 0.25); inner.add(t); }
  }
  return grp;
}

// 바다 지형: 뒤 배경(수면 위 하늘~깊은 바다 그라데이션), 바닥 모래, 바위, 산호·바다나리, 빛줄기, 수면, 왼쪽 위 해변(스피노 입장 장면)
function buildSeaTerrain() {
  const L = curEra.look;
  terrainEra = curEra.key;
  scene.background = new THREE.Color(L.deep); scene.fog.color.setHex(L.mid);
  const W = SEA_W + 90, H = SEA_H + 70;
  const bg = new THREE.PlaneGeometry(W * 2, H * 2, 1, 40); bg.rotateX(-Math.PI / 2);
  const col = [], pos = bg.attributes.position, c = new THREE.Color(), cTop = new THREE.Color(L.top), cMid = new THREE.Color(L.mid), cDeep = new THREE.Color(L.deep), sky = new THREE.Color(0xbfe6f2);
  for (let i = 0; i < pos.count; i++) {
    const z = pos.getZ(i);
    if (z < -SEA_H - 0.6) c.copy(sky);
    else { const t = clamp((z + SEA_H) / (2 * SEA_H + 10), 0, 1); c.copy(cTop).lerp(cMid, Math.min(1, t * 2)).lerp(cDeep, Math.max(0, t * 2 - 1)); }
    col.push(c.r, c.g, c.b);
  }
  bg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const bgM = new THREE.Mesh(bg, new THREE.MeshBasicMaterial({ vertexColors: true, fog: false })); bgM.position.y = -18; world.decor.add(bgM);
  // 수면 (밝은 띠)
  const surf = new THREE.Mesh(new THREE.PlaneGeometry(W * 2, 0.9).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xe8fbff, transparent: true, opacity: 0.85, fog: false }));
  surf.position.set(0, -3, -SEA_H); world.decor.add(surf);
  // 빛줄기
  for (let i = 0; i < 10; i++) {
    const ray = new THREE.Mesh(new THREE.PlaneGeometry(rand(3, 7), SEA_H * 1.6).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xdff8ff, transparent: true, opacity: 0.08, depthWrite: false, fog: false }));
    ray.position.set(rand(-SEA_W, SEA_W), -10, -SEA_H + SEA_H * 0.75); ray.rotation.y = rand(-0.25, 0.25); world.decor.add(ray);
  }
  // 바닥 모래 (앞으로 튀어나온 판)
  const floor = new THREE.Mesh(new THREE.BoxGeometry(W * 2, 30, 30), mat(L.sand)); floor.position.set(0, -11, SEA_H + 15); world.decor.add(floor);
  // 왼쪽 위 해변 (입장 장면에서 스피노가 서 있는 곳)
  const shore = new THREE.Mesh(new THREE.BoxGeometry(60, 24, 22), mat(0xd8c08a)); shore.position.set(-SEA_W - 22, -14, -SEA_H + 8); world.decor.add(shore);
  // 바위(부딪힘) + 산호·바다나리·바닷말(장식)
  const upGroup = (x, z) => { const gg = new THREE.Group(), inner = new THREE.Group(); inner.rotation.x = -Math.PI / 2; gg.add(inner); gg.position.set(x, 0, z); world.decor.add(gg); return inner; };
  for (let i = 0; i < 26; i++) {
    const x = rand(-SEA_W + 4, SEA_W - 4), r = rand(1.4, 3.2);
    if (world.obstacles.some(o => Math.abs(o.x - x) < o.r + r + 2)) continue;
    const z = SEA_H - r * 0.45;
    const inner = upGroup(x, z);
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), mat(pick(L.rock))); rock.rotation.set(rand(0, 3), rand(0, 3), 0); inner.add(rock);
    world.obstacles.push({ x, z, r: r * 0.9, type: 'rock', grp: inner.parent, pos: new THREE.Vector3(x, 0, z), gone: false });
  }
  for (let i = 0; i < 40; i++) {
    const x = rand(-SEA_W, SEA_W), inner = upGroup(x, SEA_H + 0.3), k = Math.random();
    if (k < 0.45) { // 산호
      const cm = mat(pick(L.coral));
      for (let j = 0; j < 5; j++) { const br = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.16, rand(0.8, 2.0), 5), cm); br.position.set(rand(-0.5, 0.5), 0.7, rand(-0.3, 0.3)); br.rotation.z = rand(-0.5, 0.5); inner.add(br); const tip = new THREE.Mesh(new THREE.SphereGeometry(0.18, 6, 4), cm); tip.position.set(br.position.x - Math.sin(br.rotation.z) * 0.7, 1.4, br.position.z); inner.add(tip); }
    } else if (k < 0.7 && L.crinoid) { // 바다나리
      const st = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 3.2, 5), mat(0xb8a080)); st.position.y = 1.6; inner.add(st);
      for (let j = 0; j < 7; j++) { const arm = new THREE.Mesh(new THREE.ConeGeometry(0.05, 1.1, 4), mat(0xd8b890)); const a = j / 7 * Math.PI * 2; arm.position.set(Math.cos(a) * 0.3, 3.4, Math.sin(a) * 0.3); arm.rotation.set(Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9); inner.add(arm); }
    } else { // 바닷말
      for (let j = 0; j < 4; j++) { const wd = new THREE.Mesh(new THREE.ConeGeometry(0.15, rand(1.5, 3.5), 4), mat(pick([0x4f8a4a, 0x6a9a3e, 0x3f7a5a]))); wd.scale.z = 0.3; wd.position.set(rand(-0.4, 0.4), 1.2, 0); wd.rotation.z = rand(-0.3, 0.3); inner.add(wd); }
    }
  }
}
