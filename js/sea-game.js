// 공룡 배틀 — 바다 맵 진행: 옆모습 회전, 옆 카메라, 숨쉬기, 스피노 입장 장면, 바다 배경음
const _sX = new THREE.Vector3(), _sY = new THREE.Vector3(), _sZ = new THREE.Vector3(), _sM = new THREE.Matrix4(), _sQ = new THREE.Quaternion();
// 몸의 앞(진행 방향)은 화면 안 평면에, 등은 화면 위쪽을 향하도록 돌림 (논리 좌표 −z = 화면 위)
function seaOrient(c, dt) {
  const h = c.heading;
  _sZ.set(Math.sin(h), 0, Math.cos(h));
  if (Math.abs(_sZ.x) > 0.25) c.seaFace = Math.sign(_sZ.x);
  _sY.set(-c.seaFace * 0.06, 0, -1).addScaledVector(_sZ, _sZ.z);
  _sY.addScaledVector(_sZ, -_sY.dot(_sZ)).normalize();
  _sX.crossVectors(_sY, _sZ);
  _sM.makeBasis(_sX, _sY, _sZ); _sQ.setFromRotationMatrix(_sM);
  c.pivot.quaternion.slerp(_sQ, dt > 0 ? Math.min(1, dt * 9) : 1);
}
// 옆 카메라: 논리 (x, z) → 화면 (x, −z)
function seaCamera(t, D, dt, snap) {
  const wx = clamp(t.x, -SEA_W - 6, SEA_W + 6), wy = clamp(-t.z, -SEA_H + D * 0.3, SEA_H + 6);
  const want = new THREE.Vector3(wx, wy + D * 0.06, D);
  if (snap || dt <= 0) camera.position.copy(want); else camera.position.lerp(want, Math.min(1, dt * 4));
  if (shake > 0 && state === 'play') { camera.position.x += rand(-1, 1) * shake; camera.position.y += rand(-1, 1) * shake; shake = Math.max(0, shake - dt * 2); }
  camera.lookAt(camera.position.x, camera.position.y - D * 0.06, 0);
  scene.fog.near = D * 0.9; scene.fog.far = D + 70;
  sun.position.set(camera.position.x + 15, camera.position.y + 60, 45); sun.target.position.set(camera.position.x, camera.position.y, 0);
}
// 숨쉬기: 파충류는 수면(맨 위 띠)에서만 숨을 채울 수 있음
const SEA_SURF = () => -SEA_H + 2.6;
function updateBreath(c, dt) {
  if (c.pos.z < SEA_SURF()) {
    if (c.isPlayer && c.air < 0.5 && c.airWarn) { floatText(new THREE.Vector3(c.pos.x, 2, c.pos.z - c.s * 2), '🫧 숨!', '#bff4ff', 1.2); sfx('whoosh'); }
    c.air = Math.min(1, c.air + dt * 0.7); c.airWarn = false;
  } else c.air = Math.max(0, c.air - dt / (38 + 16 * c.s));
  if (c.isPlayer && c.air < 0.25 && !c.airWarn) { c.airWarn = true; toast('🫧 숨이 차요! 위로 올라가 수면에서 숨을 쉬세요 ⬆'); }
  if (c.air <= 0) {
    c.airHurtT -= dt;
    if (c.airHurtT <= 0) {
      c.airHurtT = 1; const d = c.maxHp * 0.07; c.hp -= d; c.flash = 0.2;
      if (c.isPlayer) floatText(new THREE.Vector3(c.pos.x, 2, c.pos.z), `-${Math.ceil(d)}`, '#bff4ff', 1);
      if (c.hp <= 0) kill(c, null, 'air');
    }
  }
}
function updateAirHUD() {
  if (!player || $('airRow').classList.contains('hidden')) return;
  const a = clamp(player.air, 0, 1);
  $('airb').firstElementChild.style.width = (a * 100) + '%';
  $('airb').classList.toggle('low', a < 0.25);
  $('airTxt').textContent = a < 0.25 ? '숨이 차요! 수면으로 ⬆' : `숨 ${Math.round(a * 100)}%`;
}

// ---- 입장 장면: 스피노사우루스가 해변에서 바다로 뛰어듦 (바다를 처음 열 때 한 번) ----
function beginSeaIntro() {
  clearWorld();
  if (terrainEra !== curEra.key) { clearTerrain(); buildTerrain(); }
  const mdl = buildModel(SPECIES.spinosaurus), holder = new THREE.Group(), pivot = new THREE.Group();
  holder.add(pivot); pivot.add(mdl.group); worldRoot.add(holder);
  const s = 2.4; mdl.group.scale.setScalar(s);
  seaIntro = { t: 0, mdl, holder, pivot, s, pos: new THREE.Vector3(-SEA_W - 16, 0, -SEA_H - 3), cam: { x: -SEA_W - 6, z: -SEA_H + 3 }, heading: Math.PI / 2, seaFace: 1, anim: 0, splashed: false };
  $('menu').classList.add('hidden'); $('over').classList.add('hidden'); $('hud').classList.add('hidden');
  $('introCap').classList.remove('hidden'); $('introCap').textContent = '스피노사우루스가 물가로 달려가요…';
  state = 'intro'; stopMusic();
}
function endSeaIntro() {
  const I = seaIntro; if (!I) return;
  worldRoot.remove(I.holder); seaIntro = null;
  try { localStorage.setItem('dino_sea_intro', '1'); } catch (_) {}
  $('introCap').classList.add('hidden');
  startGame();
}
function updateSeaIntro(dt) {
  const I = seaIntro; if (!I) return;
  I.t += dt;
  const t = I.t, p = I.pos, m = I.mdl, top = -SEA_H - 3;
  let vx = 0, vz = 0, inWaterNow = p.z > -SEA_H + 0.5;
  if (t < 2.0) { vx = 9; I.anim += dt * 9; }                                      // 해변을 달림
  else if (t < 3.2) { const u = (t - 2.0) / 1.2; vx = 11; vz = -6 + u * 22; I.anim += dt * 6; } // 뛰어들기
  else if (t < 6.4) { vx = 6; vz = (-SEA_H + 8 - p.z) * 1.5; I.anim += dt * 3; $('introCap').textContent = '🌊 바다가 열렸어요! 바다에는 공룡 대신 해양 파충류와 물고기가 살았어요'; } // 헤엄
  else { endSeaIntro(); return; }
  p.x += vx * dt; p.z = Math.max(p.z + vz * dt, t < 2.0 ? top : -1e9); if (t < 2.0) p.z = top;
  if (!I.splashed && p.z > -SEA_H) {
    I.splashed = true; sfx('stomp', 0.9); sfx('whoosh');
    for (let i = 0; i < 14; i++) floatText(new THREE.Vector3(p.x + rand(-2, 2), 3, -SEA_H + rand(-2.5, 0.5)), pick(['💦', '🫧']), '#ffffff', 1.1);
    $('introCap').textContent = '첨벙!';
  }
  I.heading = Math.atan2(vx, vz || 0.0001);
  seaOrient(I, dt);
  I.holder.position.set(p.x, 0, p.z);
  inWaterNow = p.z > -SEA_H + 0.5;
  m.group.position.y = inWaterNow ? -(SPECIES.spinosaurus.shape.hip + 0.1) * I.s : 0;
  m.legs.forEach((l, i) => { l.rotation.x = inWaterNow ? 0.9 + Math.sin(I.anim * 0.6 + i) * 0.25 : Math.sin(I.anim + (i % 2 ? Math.PI : 0)) * 0.8; });
  if (m.extra.smooth) { const sm = m.extra.smooth, arr = sm.geo.attributes.position.array; for (let i = 0; i < sm.w.length; i++) if (sm.w[i] > 0) arr[i * 3] = sm.base[i * 3] + Math.sin(I.anim * 0.9 - sm.w[i] * 2.6) * sm.tailLen * 0.12 * sm.w[i]; sm.geo.attributes.position.needsUpdate = true; }
  I.cam.x += (p.x + 6 - I.cam.x) * Math.min(1, dt * 3); I.cam.z += (Math.max(p.z, -SEA_H + 2) - I.cam.z) * Math.min(1, dt * 3);
}
['keydown', 'pointerdown'].forEach(evn => window.addEventListener(evn, () => { if (state === 'intro' && seaIntro && seaIntro.t > 0.6) seaIntro.t = 99; }));

// ---- 바다 배경음: 물속처럼 먹먹한 화음 + 맑은 아르페지오 + 거품 소리 / 이벤트 때는 깊은 바다의 긴장감 ----
const SEA_CHORDS = [[196, 246.94, 293.66, 369.99], [174.61, 220, 261.63, 329.63], [164.81, 207.65, 246.94, 311.13], [185, 233.08, 277.18, 349.23]];
function bubbleBlip(t, vol) { tone(rand(380, 520), rand(900, 1400), 0.09, 'sine', vol, t, AU.music, 0.005); }
function scheduleSeaStep(t, s) {
  if (AU.mode === 'calm') {
    const ch = SEA_CHORDS[((s / 8) | 0) % 4];
    if (s % 8 === 0) ch.forEach(f => pad(f, t, 6.2, 0.045));
    if (s % 2 === 0) { const n = ch[(s / 2 | 0) % 4] * 2; tone(n, null, 1.6, 'sine', 0.05, t, AU.music, 0.02); }
    if (Math.random() < 0.3) bubbleBlip(t + rand(0, 0.3), 0.05);
    if (s % 32 === 20) noise(4, 'lowpass', 500, 0.05, t, AU.music, 1.2, 300);
    return 0.75;
  }
  const beat = 60 / 128 / 2;
  if (s % 4 === 0) tone(170, 80, 0.25, 'triangle', 0.5, t, AU.music);
  if (s % 8 === 6) tone(240, 120, 0.15, 'triangle', 0.3, t, AU.music);
  const root = [146.83, 146.83, 130.81, 164.81][((s / 16) | 0) % 4];
  if (s % 2 === 0) tone(root, null, beat * 1.8, 'sawtooth', 0.045, t, AU.music);
  const arp = [1, 1.5, 2, 2.4, 3, 2.4, 2, 1.5][s % 8];
  tone(root * arp * 2, null, beat * 0.9, 'sine', 0.05, t, AU.music, 0.005);
  if (Math.random() < 0.25) bubbleBlip(t, 0.06);
  return beat;
}
