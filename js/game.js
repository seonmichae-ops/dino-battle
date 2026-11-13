// 공룡 배틀 — 게임 로직·AI·사운드·UI
function makeCreature(kind, key, opts = {}) {
  const sp = kind === 'dino' ? SPECIES[key] : PREY[key];
  const c = {
    kind, key, sp, isPlayer: !!opts.isPlayer, name: opts.name || sp.name,
    level: opts.level || 1, xp: 0, totalXp: 0, hp: 1, maxHp: 1, hpGhost: 1, ghostDelay: 0, s: 1, r: 1,
    pos: new THREE.Vector3(), vel: new THREE.Vector3(), want: new THREE.Vector3(), heading: rand(0, Math.PI * 2),
    dead: false, biteCd: rand(0, 0.5), trampleCd: 0, cds: [0, 0, 0], lungeHit: false, tailAnim: 0, stompAnim: 0, stompPending: 0, sprintT: 0, dashT: 0, lungeBuff: 0, invT: 0, boostT: 0, stunT: 0, hideT: 0, chargeT: 0, chargeHits: null, lastStep: 0, armorT: 0, boss: !!opts.boss,
    spawnProt: opts.prot || 0, biteAnim: 0,
    aiT: rand(0, 0.3), wanderA: rand(0, Math.PI * 2), goal: null, anim: rand(0, 6), flash: 0, aggr: Math.random() < 0.5,
    baseS: opts.baseS || 1
  };
  if (opts.pos) c.pos.copy(opts.pos); else placeRandom(c.pos, 1.5, kind === 'dino');
  c.model = buildModel(sp);
  c.holder = new THREE.Group();
  c.holder.add(c.model.group);
  c.shadow = new THREE.Mesh(shadowGeo, shadowMat); c.shadow.position.y = 0.03; c.holder.add(c.shadow);
  if (c.model.extra.smooth) c.shadow.visible = false; // 진짜 그림자를 씀
  c.ring = makeRing(0xffd24a); c.holder.add(c.ring);
  if (kind === 'dino') {
    c.tag = makeCanvasSprite(512, 152, 5.0, 1.48); c.tagHasName = true; c.holder.add(c.tag);
  } else if (kind === 'prey') {
    c.tag = makeCanvasSprite(192, 36, 1.7, 0.32); c.tagHasName = false; c.holder.add(c.tag);
  }
  scene.add(c.holder);
  if (kind === 'dino' && c.level > 1) for (let l = 1; l < c.level; l++) c.totalXp += xpNeed(l);
  updateSize(c, true);
  world.creatures.push(c);
  return c;
}

function updateSize(c, fill) {
  if (c.kind === 'dino') {
    const g = (c.level - 1) / (MAX_LV - 1);
    c.s = c.sp.adult * (0.38 + 0.62 * g);
    c.maxHp = c.sp.hp * (0.45 + 0.55 * g);
    c.atk = c.sp.atk * (0.6 + 0.4 * g);
  } else {
    c.s = c.baseS; c.maxHp = c.sp.hp * c.baseS; c.atk = 0;
  }
  c.r = c.s * 0.55;
  if (fill) { c.hp = c.maxHp; c.hpGhost = c.maxHp; }
  if (c.tag) drawTag(c);
}

function removeCreature(c) {
  scene.remove(c.holder);
  if (c.tag) { c.tag.material.map.dispose(); c.tag.material.dispose(); }
  c.ring.material.dispose();
  c.model.mats.forEach(m => m.dispose());
}

function xpOf(c) {
  if (c.boss) return 400;
  if (c.kind === 'bug') return 4;
  if (c.kind === 'prey') return Math.round(10 + c.s * 8);
  return Math.round(12 + c.level * 8 + c.totalXp * 0.25);
}

function gain(c, xp) {
  if (!c.isPlayer && c.kind === 'dino') xp = Math.max(1, Math.round(xp * 0.6));
  c.totalXp += xp;
  if (c.level >= MAX_LV) return;
  c.xp += xp;
  let up = false;
  while (c.level < MAX_LV && c.xp >= xpNeed(c.level)) { c.xp -= xpNeed(c.level); c.level++; up = true; }
  if (c.level >= MAX_LV) c.xp = 0;
  if (up) {
    updateSize(c);
    c.hp = Math.min(c.maxHp, c.hp + c.maxHp * 0.35); c.hpGhost = c.hp;
    drawTag(c);
    if (c.isPlayer) {
      let msg = c.level >= MAX_LV ? `최대 성장! ${c.sp.name} 성체 완성!` : `레벨 업! Lv.${c.level}`;
      if (c.sp.diet === 'herb' && c.level === 3) msg = `Lv.3! 이제 ${curEra.trees.cycad}를 먹을 수 있어요 🌴`;
      if (c.sp.diet === 'herb' && c.level === 7) msg = `Lv.7! 이제 ${curEra.trees.conifer}도 먹을 수 있어요 🌲`;
      if (c.level >= MAX_LV && c.sp.diet === 'herb') msg = 'Lv.10! 새 스킬 「짓밟기」(W) 획득! 🦶';
      if (c.level >= MAX_LV && c.sp.diet !== 'herb') msg = 'Lv.10! 이제 같은 종도 잡아먹을 수 있어요 🍖';
      toast(msg); sfx('up'); voice(c, 1.2);
      if (c.level >= MAX_LV) unlockNext();
    }
  }
}

// ====================================================================
//  고기 조각
// ====================================================================
const meatGeo = new THREE.DodecahedronGeometry(0.5, 0);
const boneGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.1, 5);
function spawnChunks(pos, srcSize, totalXp, n) {
  const per = Math.max(1, Math.ceil(totalXp / n));
  for (let i = 0; i < n; i++) {
    const g = new THREE.Group();
    const meat = new THREE.Mesh(meatGeo, mat(pick([0xc0473f, 0xd65a4f, 0xb33a35])));
    meat.scale.set(1, 0.7, 0.85); g.add(meat);
    const bone = new THREE.Mesh(boneGeo, mat(0xf3ead8));
    bone.rotation.z = Math.PI / 2; bone.position.y = 0.05; g.add(bone);
    for (const sx of [-1, 1]) { const knob = new THREE.Mesh(new THREE.SphereGeometry(0.13, 5, 4), mat(0xf3ead8)); knob.position.set(sx * 0.55, 0.05, 0); g.add(knob); }
    const sc = clamp(0.38 + srcSize * 0.18, 0.4, 0.9);
    g.scale.setScalar(sc);
    const ring = makeRing(0x4cd964, 0.85); ring.scale.setScalar(0.75); ring.position.y = -0.3; g.add(ring);
    scene.add(g);
    const a = (i / n) * Math.PI * 2 + rand(-0.3, 0.3), d = srcSize * 0.5 + rand(0.6, 1.4);
    const to = new THREE.Vector3(pos.x + Math.cos(a) * d, 0, pos.z + Math.sin(a) * d);
    const pr = Math.hypot(to.x, to.z); if (pr > MAP_R - 2) to.multiplyScalar((MAP_R - 2) / pr);
    world.chunks.push({ mesh: g, ring, from: pos.clone(), pos: to, xp: per, t: 0, life: 25, r: 0.4 * sc + 0.2, dead: false, isChunk: true, spin: rand(0, 6) });
  }
}

// ====================================================================
//  전투
// ====================================================================
function damage(B, dmg, A, opts) {
  if (B.dead || B.invT > 0) return;
  if (opts && opts.minHp != null) dmg = Math.min(dmg, Math.max(0, B.hp - opts.minHp));
  if (dmg <= 0) return;
  if (B.armorT > 0) { // 웅크리기: 받는 피해 80% 감소, 문 상대는 가시에 찔림
    dmg *= 0.2;
    if (A && A !== B && !A.dead && A.kind === 'dino' && !(opts && opts.reflect)) damage(A, Math.max(3, B.atk * 0.8), B, { reflect: true });
  }
  B.hp -= dmg;
  B.flash = 0.15;
  B.ghostDelay = 0.35;
  if (dmg > B.maxHp * 0.12 && !(B.voiceCd > 0) && B.kind !== 'bug') { B.voiceCd = 1.2; voice(B, 0.75); }
  if (B.isPlayer) { shake = Math.min(0.6, shake + 0.25); sfx('hit'); }
  if (player && Math.hypot(B.pos.x - player.pos.x, B.pos.z - player.pos.z) < 35) {
    const top = B.kind === 'dino' ? B.s * 2.1 + 2.0 : B.s * 1.4 + 0.8;
    floatText(new THREE.Vector3(B.pos.x + rand(-0.4, 0.4), top, B.pos.z), `-${Math.ceil(dmg)}`, B.isPlayer ? '#ff5a4a' : (A && A.isPlayer ? '#ffe066' : '#ffffff'), B.isPlayer || (A && A.isPlayer) ? 1 : 0.75);
  }
  if (B.hp <= 0) kill(B, A);
}

function kill(B, A, how) {
  if (B.dead) return;
  B.dead = true;
  removeCreature(B);
  if (B.kind === 'bug') {
    if (A && A.kind === 'dino') gain(A, xpOf(B));
    respawnQueue.push({ t: rand(3, 8), kind: 'bug' });
    return;
  }
  // 공룡·먹이 동물은 고기 조각으로
  const n = B.kind === 'prey' ? 2 : 2 + Math.floor(B.level / 2) + (B.sp.adult > 2 ? 1 : 0);
  spawnChunks(B.pos, B.s, xpOf(B), n);
  if (A && A.kind === 'dino' && !isMeatEater(A)) gain(A, Math.round(xpOf(B) * 0.6)); // 초식은 고기를 못 먹으니 바로 경험치
  if (A && A.isPlayer && isMeatEater(A)) toast(`${B.sp.name} 사냥 성공! 고기 ${n}조각 🍖`);
  if (A && A.kind === 'dino' && isMeatEater(A)) { sfxAt('bigcrunch', A.pos, A.isPlayer ? 1 : 0.6); voice(A, 1); }
  if (B.isPlayer) {
    const by = how || (A ? `${A.name === A.sp.name ? '' : A.name + '의 '}${A.sp.name}에게 잡아먹혔어요!` : '쓰러졌어요!');
    endGame(false, by);
  } else if (B.boss) {
    boss = null; if (!ev) setMusic('calm');
    warn(A && A.isPlayer ? `🏆 ${B.name}를 쓰러뜨렸다!` : `${B.name}가 쓰러졌어요!`);
  } else if (B.kind === 'dino') respawnQueue.push({ t: rand(3, 6), kind: 'dino' });
  else respawnQueue.push({ t: rand(4, 9), kind: B.kind });
}

function knock(B, A, power) {
  const dx = B.pos.x - A.pos.x, dz = B.pos.z - A.pos.z;
  const d = Math.hypot(dx, dz) || 1;
  B.vel.x += dx / d * power; B.vel.z += dz / d * power;
}

const herbRevoltOn = () => !!(ev && ev.type === 'herbRevolt');
const landRevoltOn = () => !!(ev && ev.type === 'landRevolt'); // (버그 수정) null이 아닌 false를 돌려줘야 익룡 원이 숨겨짐
const isRebel = c => c.isPlayer && herbRevoltOn();

// 앞에 있는 물 수 있는 대상 찾기
function findBiteTarget(A) {
  const reach = A.r + A.s * 0.75 + 0.55;
  const fx = Math.sin(A.heading), fz = Math.cos(A.heading);
  let best = null, bestD = Infinity;
  const consider = (type, obj, px, pz, tr, pri) => {
    const dx = px - A.pos.x, dz = pz - A.pos.z;
    const d = Math.hypot(dx, dz);
    const gap = d - tr;
    if (gap > reach) return;
    if (d > 0.3 && (dx * fx + dz * fz) / d < -0.15) return; // 뒤쪽은 못 묾
    const score = gap - (pri || 0);
    if (score < bestD) { bestD = score; best = { type, obj }; }
  };
  const meat = isMeatEater(A), herb = A.kind === 'dino' && A.sp.diet === 'herb', plants = A.sp.diet !== 'carn';
  for (const o of world.creatures) {
    if (o === A || o.dead || friendly(A, o) || o.hideT > 0) continue;
    if (o.kind === 'bug') { if (meat) consider('bug', o, o.pos.x, o.pos.z, o.r, 0.3); continue; }
    if (herb) {
      if (isRebel(A) && isMeatEater(o)) consider('creature', o, o.pos.x, o.pos.z, o.r, 0.5);
      continue;
    }
    if (!A.isPlayer && o.s > A.s * EAT_RATIO) continue; // 봇은 큰 상대를 물지 않음
    if (!A.isPlayer && isRebel(o)) continue;
    consider('creature', o, o.pos.x, o.pos.z, o.r, o.s * EAT_RATIO < A.s ? 0.4 : 0);
  }
  if (meat) for (const ch of world.chunks) if (!ch.dead && ch.t > 0.4) consider('chunk', ch, ch.pos.x, ch.pos.z, ch.r, 0.5);
  if (plants) for (const f of world.ferns) if (f.active) consider('fern', f, f.pos.x, f.pos.z, f.r, 0.2);
  if (herb) for (const o of world.obstacles) if (o.rule && !o.gone && A.level >= o.rule.lv) consider('tree', o, o.x, o.z, o.r, 0.1);
  if (A.isPlayer && world.chest && !world.chest.opened) consider('chest', world.chest, world.chest.pos.x, world.chest.pos.z, 0.8, 1);
  if (landRevoltOn()) for (const p of world.pteros) if (!p.dead && p.pos.y < 3.6) consider('ptero', p, p.pos.x, p.pos.z, 0.9, 0.6);
  return best;
}

function doBite(A, tgt) {
  A.biteCd = A.isPlayer ? 0.35 : 0.55;
  A.biteAnim = 0.28;
  if (!tgt) return;
  const o = tgt.obj;
  switch (tgt.type) {
    case 'bug':
      kill(o, A); sfxAt('crunch', A.pos, A.isPlayer ? 0.8 : 0.4); break;
    case 'fern':
      o.active = false; o.mesh.visible = false; o.t = rand(10, 16);
      gain(A, A.sp.diet === 'herb' ? 6 : 4);
      A.hp = Math.min(A.maxHp, A.hp + A.maxHp * 0.05);
      if (isMeatEater(A)) sfxAt('crunch', A.pos, A.isPlayer ? 0.6 : 0.3); else sfxAt('munch', A.pos, A.isPlayer ? 1 : 0.4);
      break;
    case 'tree':
      o.bites--;
      gain(A, o.rule.xp);
      A.hp = Math.min(A.maxHp, A.hp + A.maxHp * 0.06);
      sfxAt('munch', A.pos, A.isPlayer ? 1.2 : 0.5); sfxAt('rustle', A.pos, A.isPlayer ? 0.8 : 0.3);
      if (A.isPlayer) floatText(new THREE.Vector3(o.x, o.type === 'conifer' ? 5 : 3, o.z), `+${o.rule.xp}`, '#9cf06a', 0.9);
      if (o.bites <= 0) {
        o.gone = true; o.grp.visible = false; o.ring.visible = false; o.lock.visible = false; o.regrowT = rand(40, 55);
        if (A.isPlayer) toast(`${o.rule.name}를 다 먹었다! 🌿`);
      } else {
        o.grp.scale.setScalar(0.45 + 0.55 * o.bites / o.rule.bites);
      }
      break;
    case 'chunk':
      o.dead = true; scene.remove(o.mesh); o.ring.material.dispose();
      gain(A, o.xp);
      A.hp = Math.min(A.maxHp, A.hp + A.maxHp * 0.08);
      sfxAt('crunch', A.pos, A.isPlayer ? 1 : 0.55);
      if (A.isPlayer) floatText(new THREE.Vector3(o.pos.x, 1.5, o.pos.z), `+${o.xp}`, '#9cf06a', 0.9);
      break;
    case 'chest':
      openChest(); break;
    case 'ptero':
      damagePtero(o, A.atk * 1.2 + 6, A); break;
    case 'creature': {
      if (isRebel(A)) { // 초식공룡의 반란: 크기와 상관없이 강하게, 단 잡아먹지는 못함
        damage(o, 6 + o.maxHp * 0.16 + A.atk * 0.5, A, { minHp: 1 });
        knock(o, A, 7);
        if (A.isPlayer) sfx('hit');
        break;
      }
      const catchable = A.s > o.s * EAT_RATIO && o.invT <= 0 && !isRebel(o) && !(o.armorT > 0); // 웅크린 갑옷 공룡은 통째로 못 삼킴
      if (catchable) { kill(o, A); break; }
      let mult = Math.pow(A.s / o.s, 1.3);
      if (A.lungeBuff > 0) { mult *= 2.5; A.lungeBuff = 0; if (A.isPlayer) toast('덥석!'); }
      if (isRebel(o)) mult *= 0.5;
      damage(o, A.atk * mult, A);
      break;
    }
  }
}

// 다음 시대 해금 (이 시대에서 Lv.10 달성)
let unlockMsg = '';
function unlockNext() {
  const i = eraIdx(curEra);
  if (i < unlockedIdx || i >= ERAS.length - 1) return;
  unlockedIdx = i + 1;
  try { localStorage.setItem('dino_unlock', String(unlockedIdx)); } catch (_) {}
  unlockMsg = `🔓 새 시대 「${ERAS[unlockedIdx].name}」가 열렸어요!`;
  setTimeout(() => { if (state === 'play') { warn(unlockMsg); sfx('chest'); } }, 1900);
}

const STOMP = { name: '짓밟기', type: 'stomp', cd: 6 };
const SKILL_KEYS = ['Q', 'W', 'E'];
// 스킬 목록: 기본 스킬(Q) + 초식 Lv.10 짓밟기(W). 새 스킬은 E 순서로 추가
function skillsOf(c) {
  const l = [c.sp.skill];
  if (c.kind === 'dino' && c.sp.diet === 'herb' && c.level >= MAX_LV) l.push(STOMP);
  return l;
}
function useSkill(c, i) {
  i = i || 0;
  if (c.dead || c.kind !== 'dino') return false;
  const sk = skillsOf(c)[i];
  if (!sk || c.cds[i] > 0 || c.stunT > 0) return false;
  c.cds[i] = sk.cd;
  const fx = Math.sin(c.heading), fz = Math.cos(c.heading);
  const near = (o, R) => Math.hypot(o.pos.x - c.pos.x, o.pos.z - c.pos.z) < R + o.r;
  if (sk.type === 'dash') {
    c.dashT = 0.35; c.invT = 0.6;
    c.vel.set(fx * c.sp.speed * 3, 0, fz * c.sp.speed * 3);
    sfxAt('whoosh', c.pos, c.isPlayer ? 0.7 : 0.3);
  } else if (sk.type === 'sprint') {
    c.sprintT = 2.5;
    sfxAt('whoosh', c.pos, c.isPlayer ? 0.6 : 0.3);
  } else if (sk.type === 'lunge') {
    // 덥석물기: 앞으로 뛰어들며 처음 닿는 상대를 자동으로 강하게 문다
    c.dashT = 0.35; c.lungeBuff = 1.2; c.lungeHit = true;
    c.vel.set(fx * c.sp.speed * 2.8, 0, fz * c.sp.speed * 2.8);
    voice(c, 1);
  } else if (sk.type === 'tail') {
    // 꼬리 휘두르기: 주변 모두에게 큰 피해 + 멀리 튕겨내고 잠깐 비틀거림
    const R = c.s * 1.8 + 2.2;
    c.tailAnim = 0.45;
    spawnWave(c.pos, R, 0xfff1a8);
    sfxAt('tailwhip', c.pos, c.isPlayer ? 1 : 0.6, 30);
    let hits = 0;
    for (const o of world.creatures) {
      if (o === c || o.dead || friendly(c, o) || o.hideT > 0 || !near(o, R)) continue;
      hits++;
      if (isRebel(c) && isMeatEater(o)) damage(o, 10 + o.maxHp * 0.3, c, { minHp: 1 });
      else damage(o, Math.max(8, c.atk * 2.2 * Math.sqrt(c.s / o.s)), c);
      if (!o.dead) { knock(o, c, 13); o.stunT = Math.max(o.stunT, 0.6); }
    }
    if (landRevoltOn()) for (const p of world.pteros) if (!p.dead && p.pos.y < 3.6 && Math.hypot(p.pos.x - c.pos.x, p.pos.z - c.pos.z) < R + 1) { damagePtero(p, c.atk * 2, c); hits++; }
    if (c.isPlayer) toast(hits ? `꼬리 휘두르기! ${hits}마리 명중` : '꼬리 휘두르기! (빗나감)');
  } else if (sk.type === 'roar') {
    // 포효: 주변 모두를 얼어붙게 (작을수록 오래)
    const R = c.s * 2 + 6;
    spawnWave(c.pos, R, 0xff8a5a);
    voice(c, 1.6, 35);
    let hits = 0;
    for (const o of world.creatures) {
      if (o === c || o.dead || friendly(c, o) || o.kind === 'bug' || !near(o, R)) continue;
      o.stunT = clamp(1.8 * c.s / o.s, 0.8, 2.2); o.vel.set(0, 0, 0); hits++;
      if (o.isPlayer) toast('포효에 얼어붙었다!');
    }
    if (c.isPlayer) toast(hits ? `포효! ${hits}마리가 얼어붙었다` : '포효!');
  } else if (sk.type === 'hide') {
    c.hideT = 3.5; c.invT = Math.max(c.invT, 0.5);
    sfxAt('rustle', c.pos, c.isPlayer ? 1.5 : 0.5);
    if (c.isPlayer) toast('덤불 속에 숨었다! (3초)');
  } else if (sk.type === 'charge') {
    c.chargeT = 0.7; c.dashT = 0.7; c.chargeHits = new Set();
    c.vel.set(fx * c.sp.speed * 2.8, 0, fz * c.sp.speed * 2.8);
    voice(c, 1.2);
    sfxAt('stomp', c.pos, c.isPlayer ? 0.8 : 0.5);
  } else if (sk.type === 'armor') {
    c.armorT = 4; c.vel.set(0, 0, 0);
    sfxAt('stomp', c.pos, c.isPlayer ? 0.6 : 0.3);
    if (c.isPlayer) toast('웅크리기! 4초간 피해 80% 감소 · 물면 가시에 찔려요');
  } else if (sk.type === 'stomp') {
    // 짓밟기 (초식 Lv.10): 앞발을 들었다가 내리찍어 주변 육식공룡을 쓰러뜨림
    c.stompAnim = 0.55; c.stompPending = 0.3;
    voice(c, 1.5);
  }
  return true;
}
function doStomp(c) {
  const R = c.r + 2.4 + c.s * 0.6;
  spawnWave(c.pos, R, 0xc89a5a); spawnWave(c.pos, R * 0.6, 0xffe0a0);
  sfxAt('stomp', c.pos, c.isPlayer ? 1.3 : 0.8, 40);
  if (c.isPlayer) shake = 0.6;
  let kills = 0, hurt = 0;
  for (const o of world.creatures) {
    if (o === c || o.dead || friendly(c, o) || o.kind === 'bug') continue;
    if (Math.hypot(o.pos.x - c.pos.x, o.pos.z - c.pos.z) > R + o.r) continue;
    if (o.boss) { damage(o, o.maxHp * 0.12, c); hurt++; }
    else if (isMeatEater(o)) {
      if (o.level >= MAX_LV) { // 육식 Lv.10은 두 번 밟아야 쓰러짐
        damage(o, o.maxHp * 0.5 + 1, c, o.hp > o.maxHp * 0.55 ? { minHp: 1 } : null);
        if (o.dead) kills++; else hurt++;
      } else { damage(o, o.hp + 1, c); kills++; }
      if (o.isPlayer && !o.dead) shake = 0.7;
    } else damage(o, c.atk, c);
    if (!o.dead) { knock(o, c, 10); o.stunT = Math.max(o.stunT, 0.8); }
  }
  if (c.isPlayer) toast(kills ? `쿵! 육식공룡 ${kills}마리를 밟아 쓰러뜨렸다!` : hurt ? '쿵! 한 번 더 밟으면 쓰러져요!' : '쿵! (주변에 육식공룡이 없어요)');
}

const waves = [];
function spawnWave(pos, R, color) {
  const m = new THREE.Mesh(new THREE.RingGeometry(0.8, 1, 32), new THREE.MeshBasicMaterial({ color: color || 0xfff1a8, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.set(pos.x, 0.1, pos.z);
  scene.add(m);
  waves.push({ m, t: 0, R });
}

// ====================================================================
//  익룡 (에우디모르포돈)
// ====================================================================
function makePtero(near) {
  const PT = PTEROS[curEra.ptero];
  const g = new THREE.Group();
  const m = mat(PT.color), mw = new THREE.MeshPhongMaterial({ color: PT.wing, flatShading: true, side: THREE.DoubleSide });
  const body = new THREE.Mesh(new THREE.IcosahedronGeometry(0.4, 0), m); body.scale.set(0.6, 0.5, 1.4); g.add(body);
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.9, 4), m); head.rotation.x = Math.PI / 2; head.position.z = 0.8; g.add(head);
  if (PT.longTail) { // 람포린쿠스류: 긴 꼬리 (끝에 마름모 날개)
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.2, 3), m); tail.rotation.x = Math.PI / 2; tail.position.z = -1.0; g.add(tail);
    if (PT.vane) { const v = new THREE.Mesh(new THREE.CircleGeometry(0.22, 4), mw); v.rotation.x = -Math.PI / 2; v.position.z = -1.65; g.add(v); }
  }
  if (PT.neck) { // 아즈다르코류: 긴 목, 큰 부리
    const nk = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 1.0, 5), m); nk.rotation.x = Math.PI / 2 - 0.5; nk.position.set(0, 0.25, 0.85); g.add(nk);
    head.position.set(0, 0.55, 1.65); head.scale.set(1, 1.6, 1);
    if (PT.crest) { const cr = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.5, 3), m); cr.position.set(0, 0.75, 1.35); cr.rotation.x = -0.9; g.add(cr); }
  }
  const wings = [];
  for (const sx of [-1, 1]) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.35, sx * 2.6, 0, -0.1, 0, 0, -0.45], 3));
    geo.computeVertexNormals();
    const pivot = new THREE.Group(); pivot.add(new THREE.Mesh(geo, mw)); g.add(pivot); wings.push({ pivot, sx });
  }
  g.scale.setScalar(PT.scale);
  scene.add(g);
  const sh = new THREE.Mesh(new THREE.CircleGeometry(1.8, 12), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25, depthWrite: false }));
  sh.rotation.x = -Math.PI / 2; scene.add(sh);
  const ring = makeRing(0x4cd964, 0.9); ring.scale.setScalar(1.6); ring.visible = false; scene.add(ring);
  const tag = makeCanvasSprite(192, 36, 2.0, 0.38); tag.visible = false; scene.add(tag);
  const cx = near ? near.x + rand(-15, 15) : rand(-30, 30), cz = near ? near.z + rand(-15, 15) : rand(-30, 30);
  const p = { g, sh, ring, tag, wings, state: 'circle', t: rand(10, 18), ang: rand(0, 6), cx, cz, pos: new THREE.Vector3(cx, 16, cz), target: null, flap: 0,
    hp: PT.hp, maxHp: PT.hp, hpGhost: PT.hp, ghostDelay: 0, dead: false, flash: 0, tagHasName: false, kind: 'ptero', name: PT.name, s: 0.5 * PT.scale };
  p.tagObj = { tag, get hp() { return p.hp; }, get maxHp() { return p.maxHp; }, get hpGhost() { return p.hpGhost; }, tagHasName: false };
  world.pteros.push(p);
  return p;
}
function drawPteroTag(p) { drawTag({ tag: p.tag, hp: p.hp, maxHp: p.maxHp, hpGhost: p.hpGhost, tagHasName: false }); p.drawnHp = p.hp; p.drawnGhost = p.hpGhost; }

function damagePtero(p, dmg, A) {
  if (p.dead) return;
  p.hp -= dmg; p.flash = 0.15; p.ghostDelay = 0.3;
  floatText(new THREE.Vector3(p.pos.x, p.pos.y + 1.5, p.pos.z), `-${Math.ceil(dmg)}`, A && A.isPlayer ? '#ffe066' : '#fff', A && A.isPlayer ? 1 : 0.75);
  if (A && A.isPlayer) sfx('hit');
  if (p.hp <= 0) {
    p.dead = true;
    scene.remove(p.g, p.sh, p.ring, p.tag);
    const ground = new THREE.Vector3(p.pos.x, 0, p.pos.z);
    if (A && isMeatEater(A)) spawnChunks(ground, 1.2, 60, 4);
    else if (A) gain(A, 60);
    if (A && A.isPlayer) toast(isMeatEater(A) ? '익룡 사냥 성공! 🍖' : '익룡을 물리쳤다! +60');
    pteroRespawn.push(rand(18, 28));
  }
}

function updatePtero(p, dt) {
  const revolt = landRevoltOn();
  p.flap += dt * (p.state === 'dive' ? 4 : p.state === 'peck' ? 2 : 7);
  for (const w of p.wings) w.pivot.rotation.z = Math.sin(p.flap) * 0.45 * w.sx;
  const prev = p.pos.clone();
  if (p.state === 'circle') {
    p.ang += dt * 0.35;
    p.pos.set(p.cx + Math.cos(p.ang) * 22, 16, p.cz + Math.sin(p.ang) * 22);
    if (state === 'play' && Math.random() < dt * 0.06) sfxAt('screech', p.pos, 0.35, 30); // 멀리서 들리는 울음
    p.t -= dt;
    if (revolt && p.t > 6) p.t = rand(2, 5);
    if (p.t <= 0) {
      let best = null, bd = revolt ? 60 : 40;
      for (const c of world.creatures) {
        if (c.dead || c.s > 0.75) continue;
        let w = Math.hypot(c.pos.x - p.pos.x, c.pos.z - p.pos.z);
        if (c.isPlayer) w *= 0.6;
        if (revolt && player) w = Math.hypot(c.pos.x - player.pos.x, c.pos.z - player.pos.z); // 반란 중엔 플레이어 근처 먹이를 노림
        if (w < bd) { bd = w; best = c; }
      }
      if (best) {
        p.target = best; p.targetPos = null; p.state = 'dive'; p.t = 0;
        if (best.isPlayer && !revolt) warn('⚠ 하늘에서 익룡이 내려온다! 피해요!');
        sfxAt('screech', p.pos, best.isPlayer ? 1 : 0.8, 40);
      } else if (revolt && player) {
        p.target = null; p.targetPos = new THREE.Vector3(player.pos.x + rand(-8, 8), 0, player.pos.z + rand(-8, 8));
        p.state = 'dive'; p.t = 0;
        sfxAt('screech', p.pos, 0.8, 40);
      } else p.t = 6;
    }
  } else if (p.state === 'dive') {
    p.t += dt;
    const tg = p.target;
    const tp = tg ? tg.pos : p.targetPos;
    if ((tg && tg.dead) || !tp || p.t > 5) { p.state = revolt ? 'peck' : 'climb'; p.t = 0; }
    else {
      const to = new THREE.Vector3(tp.x - p.pos.x, 1.0 - p.pos.y, tp.z - p.pos.z);
      const d = to.length();
      const sp = p.t < 1.0 ? 9 : 17;
      p.pos.addScaledVector(to.normalize(), Math.min(d, sp * dt));
      if (d < 1.6) {
        if (tg && !tg.dead && tg.s <= 0.75) {
          if (tg.kind === 'bug') kill(tg, null);
          else damage(tg, tg.maxHp * 0.35, null);
          if (tg.isPlayer && !tg.dead) toast('익룡에게 쪼였다!');
        }
        p.state = revolt ? 'peck' : 'climb'; p.t = 0;
      }
    }
  } else if (p.state === 'peck') { // 반란 중: 땅에 내려앉아 잠시 쪼아먹기 → 공격 기회
    p.t += dt;
    p.pos.y = 1.0 + Math.abs(Math.sin(p.t * 6)) * 0.3;
    if (p.t > 2.2) { p.state = 'climb'; p.t = 0; }
  } else {
    p.t += dt;
    p.pos.y += dt * 8;
    p.pos.x += Math.cos(p.ang) * dt * 6; p.pos.z += Math.sin(p.ang) * dt * 6;
    const pr = Math.hypot(p.pos.x, p.pos.z); if (pr > MAP_R) { p.pos.x *= MAP_R / pr; p.pos.z *= MAP_R / pr; }
    if (p.pos.y >= 16) { p.state = 'circle'; p.t = rand(14, 24); p.cx = p.pos.x - Math.cos(p.ang) * 22; p.cz = p.pos.z - Math.sin(p.ang) * 22; }
  }
  p.g.position.copy(p.pos);
  const mv = p.pos.clone().sub(prev);
  if (mv.lengthSq() > 1e-6 && p.state !== 'peck') p.g.rotation.y = Math.atan2(mv.x, mv.z);
  p.g.rotation.x = p.state === 'dive' ? 0.6 : p.state === 'peck' ? 0.5 : 0;
  p.sh.position.set(p.pos.x, 0.05, p.pos.z);
  p.sh.scale.setScalar((1 - clamp((p.pos.y - 1) / 16, 0, 1) * 0.5) * 1.2);
  p.sh.material.opacity = 0.12 + (1 - p.pos.y / 16) * 0.25;
  // 반란 중: 에너지바와 먹이 표시
  // (버그 수정) 하늘 높이 있을 때는 땅의 원을 숨김 — 빈 땅에 초록 원만 보이던 원인
  p.ring.visible = !!(revolt && p.pos.y < 3.6); p.tag.visible = !!revolt;
  if (revolt) {
    p.ring.position.set(p.pos.x, 0.08, p.pos.z);
    p.ring.material.opacity = 0.95;
    p.tag.position.set(p.pos.x, p.pos.y + 1.6, p.pos.z);
    if (p.hpGhost > p.hp) { if (p.ghostDelay > 0) p.ghostDelay -= dt; else p.hpGhost = Math.max(p.hp, p.hpGhost - p.maxHp * 0.8 * dt); }
    if (p.drawnHp !== p.hp || Math.abs((p.drawnGhost || 0) - p.hpGhost) > 0.2) drawPteroTag(p);
  }
}

// ====================================================================
//  보물상자 (대비보)
// ====================================================================
function makeChest() {
  const g = new THREE.Group();
  const wood = mat(0x8a4f22), gold = new THREE.MeshPhongMaterial({ color: 0xffc83a, flatShading: true, shininess: 80, emissive: 0x553300 });
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.8, 1.0), wood); base.position.y = 0.4; g.add(base);
  const lid = new THREE.Group(); lid.position.set(0, 0.8, -0.5);
  const lidM = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1.4, 8, 1, false, 0, Math.PI), wood);
  lidM.rotation.z = Math.PI / 2; lidM.position.z = 0.5; lid.add(lidM); g.add(lid);
  for (const x of [-0.55, 0, 0.55]) { const band = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.84, 1.04), gold); band.position.set(x, 0.4, 0); g.add(band); }
  const lock = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.32, 0.1), gold); lock.position.set(0, 0.7, 0.53); g.add(lock);
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.35, 0), new THREE.MeshPhongMaterial({ color: 0x7fe3ff, emissive: 0x1a6b88, flatShading: true }));
  gem.position.y = 2.4; g.add(gem);
  const glow = makeRing(0xffd24a, 0.9); glow.scale.setScalar(1.8); g.add(glow);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 1.1, 14, 10, 1, true), new THREE.MeshBasicMaterial({ color: 0xffe9a0, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false }));
  beam.position.y = 7; g.add(beam);
  const pos = new THREE.Vector3();
  placeRandom(pos, 2.5, true, player ? player.pos : null, 18, 50);
  g.position.copy(pos);
  scene.add(g);
  world.chest = { g, lid, gem, glow, pos, life: CHEST_LIFE, opened: false, openT: 0 };
  toast('🎁 보물상자가 나타났다! 화살표를 따라가세요');
  sfx('chest');
}
function removeChest() { if (world.chest) { scene.remove(world.chest.g); world.chest = null; } }

const EVENTS = {
  boost: { dur: 20, title: '⚡ 부스터! 엄청 빨라졌다', start() { player.boostT = 20; sfx('whoosh'); } },
  herbRevolt: { dur: 30, title: '🌿 초식공룡의 반란! 육식공룡을 마구 공격하세요', start() {} },
  landRevolt: { dur: 30, title: '🦖 육지 공룡의 반란! 내려온 익룡을 물어서 잡으세요', start() {
    let alive = world.pteros.filter(p => !p.dead).length;
    while (alive < 4) { makePtero(player.pos); alive++; }
    for (const p of world.pteros) if (!p.dead && p.state === 'circle') p.t = rand(0.5, 3);
  } }
};
let ev = null;
function openChest() {
  const ch = world.chest;
  if (!ch || ch.opened) return;
  ch.opened = true; ch.openT = 0;
  const opts = player.sp.diet === 'herb' ? ['boost', 'herbRevolt', 'landRevolt'] : ['boost', 'landRevolt'];
  const type = pick(opts);
  ev = { type, t: EVENTS[type].dur };
  EVENTS[type].start();
  toast(EVENTS[type].title);
  sfx('open');
  setMusic('event');
  $('eventBar').classList.remove('hidden');
}
function endEvent() {
  if (!ev) return;
  if (ev.type === 'landRevolt') for (const p of world.pteros) { if (!p.dead && p.hp < p.maxHp) p.hp = p.hpGhost = p.maxHp; }
  ev = null;
  if (player) player.boostT = 0;
  $('eventBar').classList.add('hidden');
  toast('이벤트 끝!');
  setMusic('calm');
}

// ====================================================================
//  AI
// ====================================================================
function think(c) {
  if (c.kind === 'bug') {
    c.wanderA += rand(-1.2, 1.2);
    c.want.set(Math.cos(c.wanderA), 0, Math.sin(c.wanderA)).multiplyScalar(Math.random() < 0.3 ? 0 : 1);
    c.goal = null; return;
  }
  const view = 16 + c.s * 5;
  let fx = 0, fz = 0, threatD = Infinity, threat = null;
  let best = null, bestScore = 0;
  const meat = isMeatEater(c);
  for (const o of world.creatures) {
    if (o === c || o.dead || (o.kind === 'bug' && !meat) || o.hideT > 0) continue;
    const oHostile = !friendly(o, c), cHostile = !friendly(c, o);
    if (!oHostile && !cHostile) continue;
    const dx = o.pos.x - c.pos.x, dz = o.pos.z - c.pos.z;
    const d = Math.hypot(dx, dz);
    if (d > view) continue;
    let danger = oHostile && o.kind === 'dino' && o.spawnProt <= 0 && (
      (isMeatEater(o) && o.s > c.s * EAT_RATIO) ||
      (o.sp.diet === 'herb' && o.s > c.s * 1.5 && d < o.r + c.r + 3) ||
      (o.sp.diet === 'herb' && o.level >= MAX_LV && meat && d < o.r + c.r + 4)); // Lv.10 초식은 육식을 밟음
    if (isRebel(o) && meat) danger = true; // 반란 중인 초식공룡을 피함
    if (danger) {
      const w = 1 / (d + 0.5);
      fx -= dx / (d || 1) * w; fz -= dz / (d || 1) * w;
      if (d < threatD) { threatD = d; threat = o; }
    }
    if (meat && cHostile && !isRebel(o)) {
      let score = 0;
      if (o.kind === 'bug' || c.s > o.s * EAT_RATIO) score = xpOf(o) / (d + 4);
      else if (o.kind === 'dino' && c.aggr && o.s < c.s * 1.1 && c.hp > c.maxHp * 0.6 && o.hp < c.hp) score = 2.5 / (d + 4);
      if (o.isPlayer && elapsed < 12) score = 0;
      if (c.boss && o.kind === 'dino') score = Math.max(score, (o.isPlayer ? 6 : 3) / (d + 4)); // 보스는 공룡을 사냥
      if (score > bestScore) { bestScore = score; best = o; }
    }
  }
  if (meat) for (const ch of world.chunks) {
    if (ch.dead) continue;
    const d = Math.hypot(ch.pos.x - c.pos.x, ch.pos.z - c.pos.z);
    if (d > view) continue;
    const score = ch.xp * 1.3 / (d + 3);
    if (score > bestScore) { bestScore = score; best = ch; }
  }
  if (c.kind === 'dino' && c.sp.diet !== 'carn') {
    for (const f of world.ferns) {
      if (!f.active) continue;
      const d = Math.hypot(f.pos.x - c.pos.x, f.pos.z - c.pos.z);
      if (d > view) continue;
      const score = (c.sp.diet === 'herb' ? 6 : 3) / (d + 4);
      if (score > bestScore) { bestScore = score; best = f; }
    }
    if (c.sp.diet === 'herb') for (const o of world.obstacles) {
      if (!o.rule || o.gone || c.level < o.rule.lv) continue;
      const d = Math.hypot(o.x - c.pos.x, o.z - c.pos.z);
      if (d > view) continue;
      const score = o.rule.xp * 1.4 / (d + 4);
      if (score > bestScore) { bestScore = score; best = o; }
    }
  }
  if (landRevoltOn()) for (const p of world.pteros) {
    if (p.dead || p.pos.y > 3.6) continue;
    const d = Math.hypot(p.pos.x - c.pos.x, p.pos.z - c.pos.z);
    if (d < view && 8 / (d + 3) > bestScore) { bestScore = 8 / (d + 3); best = p; }
  }
  const fearR = 8 + c.s * 2;
  if (threat && threatD < fearR) {
    const l = Math.hypot(fx, fz) || 1;
    c.want.set(fx / l, 0, fz / l);
    const pr = Math.hypot(c.pos.x, c.pos.z);
    if (pr > MAP_R - 10) { c.want.x -= c.pos.x / pr * 0.8; c.want.z -= c.pos.z / pr * 0.8; c.want.normalize(); }
    c.goal = null;
    if (c.kind === 'dino' && c.sp.diet === 'herb' && c.level >= MAX_LV && isMeatEater(threat) && threatD < c.r + 2.4 + c.s * 0.6) useSkill(c, 1);
    if (c.kind === 'dino' && c.cds[0] <= 0) {
      const t = c.sp.skill.type;
      if ((t === 'dash' || t === 'sprint' || t === 'hide' || t === 'roar' || t === 'charge' || t === 'armor') && threatD < 5) useSkill(c);
      if (t === 'tail' && threatD < c.s * 1.6 + 1.6 + threat.r) useSkill(c);
    }
    return;
  }
  if (best) { c.goal = best; return; }
  c.goal = null;
  c.wanderA += rand(-0.7, 0.7);
  const pr = Math.hypot(c.pos.x, c.pos.z);
  if (pr > MAP_R - 12) c.wanderA = Math.atan2(-c.pos.z, -c.pos.x) + rand(-0.5, 0.5);
  c.want.set(Math.cos(c.wanderA), 0, Math.sin(c.wanderA)).multiplyScalar(c.kind === 'prey' ? 0.5 : 0.6);
}

function steerToGoal(c) {
  const g = c.goal;
  if (!g) return;
  if (g.dead || g.active === false || g.gone) { c.goal = null; return; }
  const dx = g.pos.x - c.pos.x, dz = g.pos.z - c.pos.z;
  const d = Math.hypot(dx, dz) || 1;
  const stop = (g.r || 0.5) + c.r * 0.5;
  const k = d < stop ? 0.15 : 1;
  c.want.set(dx / d * k, 0, dz / d * k);
  if (d < stop + 1) c.heading = Math.atan2(dx, dz); // 먹이 쪽을 바라보기
  if (c.kind === 'dino' && g.kind === 'dino' && c.cds[0] <= 0 && d < 6 + c.s) {
    const t = c.sp.skill.type;
    if (t === 'sprint' || t === 'lunge' || (t === 'roar' && d < 5)) useSkill(c);
  }
}

// ====================================================================
//  입력
// ====================================================================
const keys = {};
let biteHeld = false, biteBtnHeld = false;
window.addEventListener('keydown', e => {
  if (e.target && e.target.tagName === 'INPUT') { if (e.code === 'Enter' && state === 'menu') { e.preventDefault(); e.target.blur(); startGame(); } return; }
  keys[e.code] = true;
  if (e.code === 'Space') { e.preventDefault(); biteHeld = true; }
  const si = { KeyQ: 0, KeyW: 1, KeyE: 2 }[e.code];
  if (si != null && !e.repeat) { e.preventDefault(); if (state === 'play' && player) useSkill(player, si); }
  if (e.code.startsWith('Arrow')) e.preventDefault();
  if (e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Escape') {
    if (state === 'play' || state === 'paused') e.preventDefault(); // 버튼에 포커스가 있어도 눌리지 않게
    if (state === 'play') pauseGame(); else if (state === 'paused') resumeGame();
  }
});
window.addEventListener('keyup', e => { keys[e.code] = false; if (e.code === 'Space') biteHeld = false; });
const joy = { active: false, id: null, cx: 0, cy: 0, x: 0, y: 0 };
const joyEl = document.getElementById('joy'), knob = document.getElementById('knob');
const joyZone = document.getElementById('joyZone');
joyZone.addEventListener('pointerdown', e => {
  joy.active = true; joy.id = e.pointerId; joy.cx = e.clientX; joy.cy = e.clientY; joy.x = 0; joy.y = 0;
  joyEl.style.display = 'block'; joyEl.style.left = (e.clientX - 60) + 'px'; joyEl.style.top = (e.clientY - 60) + 'px';
  knob.style.transform = 'translate(0,0)';
  try { joyZone.setPointerCapture(e.pointerId); } catch (_) {}
});
joyZone.addEventListener('pointermove', e => {
  if (!joy.active || e.pointerId !== joy.id) return;
  let dx = e.clientX - joy.cx, dy = e.clientY - joy.cy;
  const d = Math.hypot(dx, dy), m = 50;
  if (d > m) { dx = dx / d * m; dy = dy / d * m; }
  joy.x = dx / m; joy.y = dy / m;
  knob.style.transform = `translate(${dx}px,${dy}px)`;
});
const joyEnd = e => { if (e.pointerId !== joy.id) return; joy.active = false; joy.x = joy.y = 0; joyEl.style.display = 'none'; };
joyZone.addEventListener('pointerup', joyEnd);
joyZone.addEventListener('pointercancel', joyEnd);
const biteBtn = document.getElementById('biteBtn');
biteBtn.addEventListener('pointerdown', e => { e.preventDefault(); biteBtnHeld = true; try { biteBtn.setPointerCapture(e.pointerId); } catch (_) {} });
const biteUp = () => { biteBtnHeld = false; };
biteBtn.addEventListener('pointerup', biteUp); biteBtn.addEventListener('pointercancel', biteUp);
document.getElementById('skillBtn').addEventListener('pointerdown', e => { e.preventDefault(); if (state === 'play' && player) useSkill(player, 0); });
document.getElementById('skill2Btn').addEventListener('pointerdown', e => { e.preventDefault(); if (state === 'play' && player) useSkill(player, 1); });
document.getElementById('pauseBtn').addEventListener('click', () => { if (state === 'play') pauseGame(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'play') pauseGame(); });

function playerInput() {
  let x = 0, z = 0;
  if (keys.ArrowUp) z -= 1;
  if (keys.ArrowDown) z += 1;
  if (keys.ArrowLeft) x -= 1;
  if (keys.ArrowRight) x += 1;
  if (joy.active) { x += joy.x; z += joy.y; }
  const l = Math.hypot(x, z);
  if (l > 1) { x /= l; z /= l; }
  player.want.set(x, 0, z);
}

// ====================================================================
//  사운드
// ====================================================================
// 모든 소리는 Web Audio로 직접 합성 (외부 파일 없음)
const AU = { ctx: null, master: null, music: null, fx: null, noise: null, mode: null, timer: null, nextT: 0, step: 0, muted: false, count: {} };
try { AU.muted = localStorage.getItem('dino_mute') === '1'; } catch (_) {}
function initAudio() {
  try {
    if (!AU.ctx) {
      const C = window.AudioContext || window.webkitAudioContext;
      const c = AU.ctx = new C();
      AU.comp = c.createDynamicsCompressor(); AU.comp.threshold.value = -14; AU.comp.ratio.value = 4; AU.comp.connect(c.destination);
      AU.master = c.createGain(); AU.master.gain.value = AU.muted ? 0 : 1; AU.master.connect(AU.comp);
      AU.music = c.createGain(); AU.music.gain.value = 0.35; AU.music.connect(AU.master);
      AU.fx = c.createGain(); AU.fx.gain.value = 1.0; AU.fx.connect(AU.master);
      const buf = c.createBuffer(1, c.sampleRate, c.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      AU.noise = buf;
    }
    if (AU.ctx.state === 'suspended') AU.ctx.resume();
  } catch (_) { AU.ctx = null; }
}
function setMuted(m) {
  AU.muted = m;
  try { localStorage.setItem('dino_mute', m ? '1' : '0'); } catch (_) {}
  if (AU.master) AU.master.gain.value = m ? 0 : 1;
  const b = document.getElementById('muteBtn'); if (b) b.textContent = m ? '🔇' : '🔊';
}
function env(g, t, vol, a, dur) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
}
function tone(f1, f2, dur, type, vol, t, dest, a) {
  const c = AU.ctx; t = t || c.currentTime;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type || 'sine';
  o.frequency.setValueAtTime(f1, t);
  if (f2 && f2 !== f1) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
  env(g, t, vol, a || 0.005, dur);
  o.connect(g); g.connect(dest || AU.fx); o.start(t); o.stop(t + dur + 0.05);
  return o;
}
function noise(dur, ftype, freq, vol, t, dest, q, f2) {
  const c = AU.ctx; t = t || c.currentTime;
  const src = c.createBufferSource(); src.buffer = AU.noise;
  const f = c.createBiquadFilter(); f.type = ftype; f.frequency.setValueAtTime(freq, t); f.Q.value = q || 1;
  if (f2) f.frequency.exponentialRampToValueAtTime(f2, t + dur);
  const g = c.createGain(); env(g, t, vol, 0.004, dur);
  src.connect(f); f.connect(g); g.connect(dest || AU.fx);
  src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.05);
}
// 폰·노트북 스피커가 잘 내는 200Hz~4kHz 대역 중심으로 설계
function sfx(type, vol) {
  if (!AU.ctx || AU.muted) return;
  vol = vol == null ? 1 : vol;
  if (vol <= 0.03) return;
  AU.count[type] = (AU.count[type] || 0) + 1;
  try {
    const t = AU.ctx.currentTime;
    switch (type) {
      case 'chomp': tone(320, 160, 0.08, 'triangle', 0.12 * vol); break;
      case 'crunch': // 육식: 우적! 우적!
        noise(0.08, 'bandpass', 1200, 1.6 * vol, t, null, 0.8);
        tone(300, 120, 0.09, 'triangle', 0.4 * vol, t);
        noise(0.07, 'bandpass', 2400, 1.1 * vol, t + 0.1, null, 1);
        tone(260, 110, 0.08, 'triangle', 0.32 * vol, t + 0.1);
        break;
      case 'bigcrunch': // 사냥 성공: 뼈까지 와작!
        for (let i = 0; i < 3; i++) { noise(0.09, 'bandpass', 900 + i * 600, 1.0 * vol, t + i * 0.09, null, 0.9); tone(280 - i * 40, 100, 0.1, 'triangle', 0.22 * vol, t + i * 0.09); }
        break;
      case 'munch': // 초식: 풀 뜯어 씹는 소리
        noise(0.14, 'bandpass', 3000, 0.9 * vol, t, null, 0.7);
        tone(380, 260, 0.07, 'triangle', 0.22 * vol, t + 0.02);
        noise(0.1, 'bandpass', 2200, 0.7 * vol, t + 0.13, null, 0.7);
        break;
      case 'rustle': noise(0.25, 'bandpass', 3200, 0.6 * vol, t, null, 0.5); break;
      case 'step': // 큰 초식공룡 발소리: 쿵
        tone(170, 60, 0.3, 'sine', 0.45 * vol, t);
        tone(330, 140, 0.18, 'triangle', 0.5 * vol, t);
        noise(0.16, 'bandpass', 450, 1.4 * vol, t, null, 0.7);
        noise(0.09, 'bandpass', 1100, 0.5 * vol, t, null, 0.8);
        break;
      case 'stomp': // 짓밟기·돌진: 쿵!!
        tone(200, 50, 0.5, 'sine', 0.6 * vol, t);
        tone(360, 110, 0.35, 'triangle', 0.7 * vol, t);
        noise(0.35, 'bandpass', 500, 1.8 * vol, t, null, 0.6);
        noise(0.15, 'bandpass', 1600, 0.9 * vol, t + 0.03, null, 0.8);
        break;
      case 'tailwhip': // 휘익- 퍽!
        noise(0.3, 'bandpass', 800, 1.6 * vol, t, null, 1.5, 4500);
        noise(0.12, 'bandpass', 1200, 1.8 * vol, t + 0.25, null, 0.7);
        tone(360, 140, 0.15, 'triangle', 0.5 * vol, t + 0.25);
        break;
      case 'screech': { // 익룡: 끼이익-!
        const c = AU.ctx, o = c.createOscillator(), lfo = c.createOscillator(), lg = c.createGain(), f = c.createBiquadFilter(), g = c.createGain();
        o.type = 'sawtooth'; o.frequency.setValueAtTime(1700, t); o.frequency.exponentialRampToValueAtTime(800, t + 0.7);
        lfo.frequency.value = 22; lg.gain.value = 140; lfo.connect(lg); lg.connect(o.frequency);
        f.type = 'bandpass'; f.frequency.value = 1600; f.Q.value = 1.5;
        env(g, t, 0.5 * vol, 0.03, 0.75);
        o.connect(f); f.connect(g); g.connect(AU.fx);
        o.start(t); lfo.start(t); o.stop(t + 0.8); lfo.stop(t + 0.8);
        break;
      }
      case 'chest': // 보물상자 등장 팡파레
        [[523, 0], [659, 0.12], [784, 0.24], [1047, 0.36], [784, 0.52], [1047, 0.64]].forEach(([f, d]) => {
          tone(f, f, 0.32, 'triangle', 0.3 * vol, t + d); tone(f * 1.5, f * 1.5, 0.25, 'sine', 0.08 * vol, t + d);
        });
        tone(1568, 1568, 0.8, 'sine', 0.12 * vol, t + 0.8);
        noise(1.0, 'highpass', 5000, 0.25 * vol, t + 0.6);
        break;
      case 'twinkle': // 보물상자가 있는 동안 반짝반짝
        [1568, 2093, 2637].forEach((f, i) => tone(f, f, 0.3, 'sine', 0.16 * vol, t + i * 0.09));
        break;
      case 'open':
        [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, f, 0.35, 'square', 0.12 * vol, t + i * 0.07));
        noise(0.6, 'highpass', 4000, 0.3 * vol, t);
        break;
      case 'whoosh': noise(0.6, 'bandpass', 400, 0.9 * vol, t, null, 1.2, 3500); break;
      case 'up': [523, 659, 784, 1047].forEach((f, i) => tone(f, f * 1.01, 0.22, 'triangle', 0.22 * vol, t + i * 0.07)); break;
      case 'hit': tone(330, 140, 0.15, 'square', 0.12 * vol); noise(0.1, 'bandpass', 1000, 0.6 * vol); break;
      case 'lose': [392, 330, 262, 196].forEach((f, i) => tone(f, f * 0.98, 0.35, 'triangle', 0.25 * vol, t + i * 0.18)); break;
      case 'win': [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, f, 0.4, 'triangle', 0.25 * vol, t + i * 0.12)); break;
    }
  } catch (_) {}
}
function sfxAt(type, pos, vol, range) {
  if (!player) return;
  const d = Math.hypot(pos.x - player.pos.x, pos.z - player.pos.z);
  sfx(type, (vol == null ? 1 : vol) * Math.max(0, 1 - d / (range || 25)));
}
// 공룡마다 다른 울음소리 (formant: 성대·입 모양을 흉내 내는 필터)
const VOICES = {
  eoraptor: { kind: 'chirp', f: 1500, n: 3 },
  coelophysis: { kind: 'chirp', f: 1050, n: 2, rough: 1 },
  herrerasaurus: { kind: 'growl', f: 200, formant: 700, dur: 0.6 },
  liliensternus: { kind: 'growl', f: 150, formant: 550, dur: 0.95 },
  thecodontosaurus: { kind: 'squeak', f: 1200 },
  plateosaurus: { kind: 'honk', f: 230, formant: 800, dur: 0.7 },
  riojasaurus: { kind: 'honk', f: 160, formant: 600, dur: 1.0 },
  rhyncho: { kind: 'grunt', f: 260 },
  // 쥐라기
  compsognathus: { kind: 'chirp', f: 1400, n: 3 }, dryosaurus: { kind: 'squeak', f: 1100 },
  dilophosaurus: { kind: 'growl', f: 210, formant: 800, dur: 0.6 }, allosaurus: { kind: 'growl', f: 160, formant: 600, dur: 0.9 },
  kentrosaurus: { kind: 'honk', f: 260, formant: 850, dur: 0.6 }, stegosaurus: { kind: 'honk', f: 200, formant: 700, dur: 0.8 },
  brachiosaurus: { kind: 'honk', f: 120, formant: 500, dur: 1.3 }, indominus: { kind: 'growl', f: 110, formant: 520, dur: 1.4 },
  // 백악기 중기
  psittacosaurus: { kind: 'squeak', f: 1300 }, ouranosaurus: { kind: 'honk', f: 220, formant: 760, dur: 0.8 },
  sauropelta: { kind: 'grunt', f: 200 }, argentinosaurus: { kind: 'honk', f: 110, formant: 480, dur: 1.4 },
  spinosaurus: { kind: 'growl', f: 170, formant: 650, dur: 1.0 }, giganotosaurus: { kind: 'growl', f: 140, formant: 560, dur: 1.1 },
  carcharodontosaurus: { kind: 'growl', f: 145, formant: 580, dur: 1.05 },
  // 백악기 후기
  velociraptor: { kind: 'chirp', f: 1150, n: 3, rough: 1 }, pachycephalosaurus: { kind: 'grunt', f: 300 },
  edmontosaurus: { kind: 'honk', f: 180, formant: 900, dur: 1.0 }, styracosaurus: { kind: 'honk', f: 240, formant: 700, dur: 0.7 },
  ankylosaurus: { kind: 'grunt', f: 180 }, triceratops: { kind: 'honk', f: 190, formant: 650, dur: 0.8 },
  tyrannosaurus: { kind: 'growl', f: 120, formant: 500, dur: 1.3 },
  eilenodon: { kind: 'grunt', f: 300 }, araripesuchus: { kind: 'grunt', f: 220 }, didelphodon: { kind: 'squeak', f: 1500 }
};
function voice(c, intensity, range) {
  if (!AU.ctx || AU.muted || !player) return;
  const d = Math.hypot(c.pos.x - player.pos.x, c.pos.z - player.pos.z);
  const vol = (intensity || 1) * (c.isPlayer ? 1 : Math.max(0, 1 - d / (range || 28)));
  if (vol <= 0.04) return;
  const v = VOICES[c.key]; if (!v) return;
  AU.count.voice = (AU.count.voice || 0) + 1;
  const ctx = AU.ctx, t = ctx.currentTime;
  const pitch = 1.25 - Math.min(0.5, (c.s || 1) * 0.12); // 클수록 낮은 목소리
  try {
    if (v.kind === 'chirp') {
      for (let i = 0; i < v.n; i++) {
        const f = v.f * pitch * (1 + i * 0.08);
        tone(f, f * 1.45, 0.1, v.rough ? 'square' : 'triangle', (v.rough ? 0.26 : 0.42) * vol, t + i * 0.11);
      }
    } else if (v.kind === 'squeak') {
      tone(v.f * pitch, v.f * 1.4 * pitch, 0.12, 'triangle', 0.25 * vol, t);
      tone(v.f * 1.3 * pitch, v.f * 0.9 * pitch, 0.14, 'triangle', 0.2 * vol, t + 0.13);
    } else if (v.kind === 'grunt') {
      noise(0.15, 'bandpass', 700, 0.4 * vol, t, null, 1.5); tone(v.f, v.f * 0.7, 0.15, 'triangle', 0.18 * vol, t);
    } else {
      // growl(육식 으르렁) / honk(초식 울음): 톱니파 + 입 모양 필터 + 떨림
      const dur = v.dur * (intensity > 1.3 ? 1.3 : 1);
      const o = ctx.createOscillator(), o2 = ctx.createOscillator(), lfo = ctx.createOscillator(), lg = ctx.createGain();
      const f1 = ctx.createBiquadFilter(), f2 = ctx.createBiquadFilter(), g = ctx.createGain();
      const base = v.f * pitch;
      o.type = 'sawtooth'; o2.type = v.kind === 'honk' ? 'square' : 'sawtooth';
      if (v.kind === 'growl') { o.frequency.setValueAtTime(base * 1.3, t); o.frequency.exponentialRampToValueAtTime(base * 0.75, t + dur); o2.frequency.setValueAtTime(base * 1.31, t); o2.frequency.exponentialRampToValueAtTime(base * 0.76, t + dur); }
      else { o.frequency.setValueAtTime(base, t); o.frequency.linearRampToValueAtTime(base * 1.15, t + dur * 0.4); o.frequency.linearRampToValueAtTime(base * 0.9, t + dur); o2.frequency.setValueAtTime(base * 1.5, t); o2.frequency.linearRampToValueAtTime(base * 1.6, t + dur * 0.4); o2.frequency.linearRampToValueAtTime(base * 1.35, t + dur); }
      lfo.frequency.value = v.kind === 'growl' ? 38 : 7; lg.gain.value = v.kind === 'growl' ? base * 0.25 : base * 0.04;
      lfo.connect(lg); lg.connect(o.frequency); lg.connect(o2.frequency);
      f1.type = 'bandpass'; f1.frequency.value = v.formant * pitch; f1.Q.value = 2.5;
      f2.type = 'bandpass'; f2.frequency.value = v.formant * 2.3 * pitch; f2.Q.value = 3;
      const mix = ctx.createGain(); mix.gain.value = 1;
      o.connect(f1); o2.connect(f1); o.connect(f2);
      f1.connect(mix); f2.connect(mix); mix.connect(g); g.connect(AU.fx);
      env(g, t, 0.9 * vol, 0.06, dur);
      o.start(t); o2.start(t); lfo.start(t); o.stop(t + dur + 0.05); o2.stop(t + dur + 0.05); lfo.stop(t + dur + 0.05);
      if (v.kind === 'growl') noise(dur * 0.8, 'bandpass', 400, 0.35 * vol, t, null, 1.2);
    }
  } catch (_) {}
}

// ---- 배경음악 ----
const PENTA = [220, 261.63, 293.66, 329.63, 392, 440, 523.25, 587.33, 659.25, 783.99, 880];
const CHORDS = [[220, 261.63, 329.63], [174.61, 220, 261.63], [261.63, 329.63, 392], [196, 246.94, 293.66]];
const EVENT_MELODY = [7, 9, 10, 9, 7, 5, 7, 4, 5, 7, 9, 7, 5, 4, 2, 4]; // PENTA 인덱스
function pad(f, t, dur, vol) {
  const c = AU.ctx, f1 = c.createBiquadFilter(), g = c.createGain();
  f1.type = 'lowpass'; f1.frequency.value = 1100;
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 1.2); g.gain.linearRampToValueAtTime(vol * 0.8, t + dur - 1.2); g.gain.linearRampToValueAtTime(0.0001, t + dur);
  for (const det of [-5, 5]) { const o = c.createOscillator(); o.type = 'triangle'; o.frequency.value = f; o.detune.value = det; o.connect(f1); o.start(t); o.stop(t + dur + 0.1); }
  f1.connect(g); g.connect(AU.music);
}
function setMusic(mode) {
  if (!AU.ctx) return;
  if (AU.mode === mode) return;
  AU.mode = mode; AU.step = 0; AU.nextT = AU.ctx.currentTime + 0.15;
  try { AU.music.gain.setTargetAtTime(mode === 'event' ? 0.8 : 0.35, AU.ctx.currentTime, 0.3); } catch (_) {}
  if (!AU.timer) AU.timer = setInterval(scheduleMusic, 100);
}
function stopMusic() { AU.mode = null; if (AU.timer) { clearInterval(AU.timer); AU.timer = null; } }
function scheduleMusic() {
  const c = AU.ctx;
  if (!c || !AU.mode || state !== 'play' || AU.muted) return;
  if (AU.nextT < c.currentTime - 0.05) AU.nextT = c.currentTime + 0.05;
  while (AU.nextT < c.currentTime + 0.35) {
    const t = AU.nextT, s = AU.step;
    if (AU.mode === 'calm') {
      // 잔잔한 배경음: 부드러운 화음 + 드문드문 맑은 음 + 바람
      if (s % 8 === 0) CHORDS[((s / 8) | 0) % 4].forEach(f => pad(f, t, 4.3, 0.05));
      if (Math.random() < 0.38) tone(PENTA[3 + ((Math.random() * 7) | 0)] * (Math.random() < 0.25 ? 2 : 1), null, 1.4, 'sine', 0.07, t, AU.music, 0.01);
      if (s % 32 === 16) noise(3.5, 'bandpass', 600, 0.05, t, AU.music, 0.6, 1000);
      AU.nextT += 0.5;
    } else {
      // 이벤트 BGM: 신나는 북 + 베이스 + 멜로디 (152 BPM, 8분음표 단위)
      const beat = 60 / 152 / 2;
      if (s % 4 === 0) { tone(220, 70, 0.18, 'triangle', 0.5, t, AU.music); noise(0.02, 'bandpass', 2500, 0.3, t, AU.music); }   // 킥
      if (s % 8 === 4) noise(0.14, 'bandpass', 1800, 0.55, t, AU.music, 0.7);                                                     // 스네어
      noise(0.03, 'highpass', 7000, s % 2 ? 0.08 : 0.15, t, AU.music);                                                            // 하이햇
      const root = [220, 220, 293.66, 261.63][((s / 16) | 0) % 4];
      if (s % 2 === 0) tone(root * (s % 4 === 2 ? 1.5 : 1), null, beat * 1.7, 'square', 0.07, t, AU.music);                     // 베이스
      if (s % 2 === 0) { const n = PENTA[EVENT_MELODY[(s / 2 | 0) % 16]]; tone(n, n, beat * 1.8, 'square', 0.06, t, AU.music); tone(n * 2, n * 2, beat, 'sine', 0.04, t, AU.music); } // 멜로디
      AU.nextT += beat;
    }
    AU.step++;
  }
}

// ====================================================================
//  UI
// ====================================================================
const $ = id => document.getElementById(id);
let toastTimer = 0, warnTimer = 0;
function toast(msg) { const el = $('toast'); el.textContent = msg; el.style.opacity = 1; toastTimer = 1.8; }
function warn(msg) { const el = $('warn'); el.textContent = msg; el.style.opacity = 1; warnTimer = 1.8; }

let selected = 'coelophysis';
const hex = c => '#' + c.toString(16).padStart(6, '0');
function buildCards() {
  const tabs = $('eraTabs'); tabs.innerHTML = '';
  ERAS.forEach((e, i) => {
    const t = document.createElement('button'); const locked = i > unlockedIdx;
    t.className = 'eraTab' + (e === curEra ? ' on' : '') + (locked ? ' locked' : '');
    t.innerHTML = `${locked ? '🔒 ' : ''}${e.name}<small>${e.time}</small>`;
    t.onclick = () => {
      if (locked) { $('eraNote').textContent = `🔒 「${ERAS[i - 1].name}」에서 Lv.10(성체)을 달성하면 열려요!`; return; }
      if (e !== curEra) setEra(e.key);
    };
    tabs.appendChild(t);
  });
  $('eraNote').textContent = curEra.sub;
  $('menuTitle').textContent = `🦖 공룡 배틀 : ${curEra.name}`;
  const wrap = $('cards'); wrap.innerHTML = '';
  for (const [k, sp] of Object.entries(SPECIES)) {
    if (sp.era !== curEra.key || sp.boss) continue;
    const d = document.createElement('div');
    d.className = 'card' + (k === selected ? ' sel' : '');
    d.innerHTML = `<div class="sw" style="background:linear-gradient(90deg,${hex(sp.color)} 70%,${hex(sp.stripe || sp.color)})"></div>
      <div class="cn">${sp.name}</div>
      <div>${sp.tags.map(t => `<span class="tag">${t}</span>`).join('')}</div>
      <div class="sk">스킬(Q): ${sp.skill.name}${sp.diet === 'herb' ? '<br>Lv.10 스킬(W): 짓밟기' : ''}</div>
      <div class="fact">${sp.fact}</div>`;
    d.onclick = () => { selected = k; buildCards(); };
    wrap.appendChild(d);
  }
}
function setEra(key) {
  curEra = ERA[key];
  if (SPECIES[selected].era !== key) selected = curEra.pick;
  try { localStorage.setItem('dino_era', key); } catch (_) {}
  clearWorld(); clearTerrain(); demoWorld();
  buildCards();
}
try { const k = localStorage.getItem('dino_era'); if (k && ERA[k] && eraIdx(ERA[k]) <= unlockedIdx) { curEra = ERA[k]; selected = curEra.pick; } } catch (_) {}
buildCards();

function updateHUD() {
  const p = player;
  $('stName').textContent = `${p.sp.name}  Lv.${p.level}${p.level >= MAX_LV ? ' (성체)' : ''}`;
  $('hpb').firstElementChild.style.width = (clamp(p.hp / p.maxHp, 0, 1) * 100) + '%';
  $('hpTxt').textContent = `체력 ${Math.max(0, Math.ceil(p.hp))} / ${Math.ceil(p.maxHp)}`;
  $('xpb').firstElementChild.style.width = (p.level >= MAX_LV ? 100 : p.xp / xpNeed(p.level) * 100) + '%';
  $('xpTxt').textContent = p.level >= MAX_LV ? `점수 ${p.totalXp}` : `성장 ${p.xp} / ${xpNeed(p.level)} · 점수 ${p.totalXp}`;
  const rem = Math.max(0, Math.ceil(ROUND_TIME - elapsed));
  $('timer').textContent = `${(rem / 60) | 0}:${String(rem % 60).padStart(2, '0')}`;
  const sks = skillsOf(p);
  $('skillBtn').firstElementChild.style.height = (p.cds[0] > 0 ? p.cds[0] / sks[0].cd * 100 : 0) + '%';
  const has2 = sks.length > 1;
  $('skill2Btn').classList.toggle('hidden', !has2);
  if (has2) $('skill2Btn').firstElementChild.style.height = (p.cds[1] > 0 ? p.cds[1] / sks[1].cd * 100 : 0) + '%';
  if (ev) $('eventBar').textContent = `${EVENTS[ev.type].title} · ${Math.ceil(ev.t)}초`;
}

function rankList() { return world.creatures.filter(c => c.kind === 'dino' && !c.dead && !c.boss).sort((a, b) => b.totalXp - a.totalXp); }
function updateBoard() {
  const list = rankList();
  const myRank = list.indexOf(player) + 1;
  let html = '<div class="t">🏆 순위 (점수)</div>';
  list.slice(0, 5).forEach((c, i) => {
    html += `<div class="row ${c.isPlayer ? 'me' : ''}"><span>${i + 1}. ${esc(c.isPlayer ? playerName : c.name)} <small>Lv.${c.level}</small></span><span>${c.totalXp}</span></div>`;
  });
  if (myRank > 5) html += `<div class="row me"><span>${myRank}. ${esc(playerName)} <small>Lv.${player.level}</small></span><span>${player.totalXp}</span></div>`;
  $('board').innerHTML = html;
}

// ====================================================================
//  게임 흐름
// ====================================================================
let bossDone = false;
const BOSS_AT = 180; // 쥐라기: 3분째에 보스 등장
let boss = null;
function spawnBoss() {
  bossDone = true;
  const pos = new THREE.Vector3();
  placeRandom(pos, 4, true, player && !player.dead ? player.pos : null, 38, 60);
  boss = makeCreature('dino', curEra.boss, { level: MAX_LV, pos, name: SPECIES[curEra.boss].name, boss: true });
  boss.aggr = true;
  warn(`⚠️ ${boss.name} 출현! 숲이 조용해졌어요…`);
  toast('하얀 괴물은 모두를 노려요. 숨거나, 힘을 합쳐 쓰러뜨리세요!');
  voice(boss, 1.8, 200); setMusic('event');
  return boss;
}
let state = 'menu', player = null, elapsed = 0, shake = 0, boardT = 0, nextChest = CHEST_FIRST;
const respawnQueue = [], pteroRespawn = [];

// 보물상자 방향 화살표
const arrow = new THREE.Group();
{
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.9, 3), new THREE.MeshBasicMaterial({ color: 0xffd24a }));
  head.rotation.x = Math.PI / 2; head.position.z = 0.45; arrow.add(head);
  const stem = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.05, 0.7), new THREE.MeshBasicMaterial({ color: 0xffd24a }));
  stem.position.z = -0.25; arrow.add(stem);
  arrow.visible = false; scene.add(arrow);
}

function clearWorld() {
  for (const c of world.creatures) if (!c.dead) removeCreature(c);
  world.creatures.length = 0;
  for (const f of world.ferns) scene.remove(f.mesh);
  world.ferns.length = 0;
  for (const p of world.pteros) scene.remove(p.g, p.sh, p.ring, p.tag);
  world.pteros.length = 0;
  for (const ch of world.chunks) scene.remove(ch.mesh);
  world.chunks.length = 0;
  for (const w of waves) scene.remove(w.m);
  waves.length = 0;
  for (const f of floaters) scene.remove(f.sp);
  floaters.length = 0;
  for (const d of dusts) scene.remove(d.m);
  dusts.length = 0;
  for (const o of world.obstacles) if (o.rule) { o.gone = false; o.bites = o.rule.bites; o.grp.visible = true; o.grp.scale.setScalar(1); }
  removeChest();
  respawnQueue.length = 0; pteroRespawn.length = 0;
  ev = null; $('eventBar').classList.add('hidden');
}

function spawnBot(maxLv, prot) {
  const key = pick(curEra.pool);
  let lv;
  if (Math.random() < 0.55) lv = Math.random() < 0.6 ? 1 : 2;
  else lv = Math.round(1 + Math.pow(Math.random(), 2.2) * (maxLv - 1));
  if (player && !player.dead) lv = Math.min(lv, player.level + 2);
  lv = clamp(lv, 1, MAX_LV);
  const pos = new THREE.Vector3();
  placeRandom(pos, 2, true, player ? player.pos : null, 28);
  const used = new Set(world.creatures.filter(c => !c.dead && c.kind === 'dino').map(c => c.name));
  const name = pick(BOT_NAMES.filter(n => !used.has(n))) || pick(BOT_NAMES);
  return makeCreature('dino', key, { level: lv, pos, name, prot: prot || 0 });
}
function spawnPrey(kind) {
  if (kind === 'prey') {
    const pd = pick(world.ponds);
    const a = rand(0, 6), d = pd.r + rand(2, 10);
    const pos = new THREE.Vector3(pd.x + Math.cos(a) * d, 0, pd.z + Math.sin(a) * d);
    if (Math.hypot(pos.x, pos.z) > MAP_R - 4) placeRandom(pos, 1.5, true);
    return makeCreature('prey', curEra.prey, { baseS: rand(0.5, 0.95), pos });
  }
  return makeCreature('bug', 'bug', { baseS: rand(0.34, 0.42) });
}

function startGame() {
  initAudio();
  const nm = ($('nameIn').value || '').trim().slice(0, 8);
  playerName = nm || '나';
  try { if (nm) localStorage.setItem('dino_name', nm); } catch (_) {}
  clearWorld();
  if (terrainEra !== curEra.key) { clearTerrain(); buildTerrain(); }
  elapsed = 0; shake = 0; nextChest = CHEST_FIRST; bossDone = false; unlockMsg = '';
  const pos = new THREE.Vector3();
  placeRandom(pos, 3, true);
  player = makeCreature('dino', selected, { isPlayer: true, pos, prot: 2 });
  player.invT = 3;
  for (let i = 0; i < N_BOTS; i++) spawnBot(3, 0);
  for (let i = 0; i < N_RHYNCHO; i++) spawnPrey('prey');
  for (let i = 0; i < N_BUGS; i++) spawnPrey('bug');
  for (let i = 0; i < N_FERNS; i++) world.ferns.push(makeFern());
  makePtero(); makePtero();
  $('skillName').innerHTML = `${player.sp.skill.name}<br><small>Q</small>`;
  $('menu').classList.add('hidden'); $('over').classList.add('hidden'); $('pause').classList.add('hidden'); $('hud').classList.remove('hidden');
  state = 'play';
  updateBoard();
  toast(`${curEra.name}의 ${player.sp.name} 등장! Space로 물어서 먹어요!`);
  AU.mode = null; setMusic('calm');
}

function pauseGame() {
  if (state !== 'play') return;
  state = 'paused';
  biteHeld = biteBtnHeld = false; joy.active = false; joyEl.style.display = 'none';
  for (const k in keys) keys[k] = false;
  $('pause').classList.remove('hidden');
  try { if (AU.ctx) AU.ctx.suspend(); } catch (_) {}
}
function resumeGame() {
  if (state !== 'paused') return;
  $('pause').classList.add('hidden');
  state = 'play';
  last = performance.now();
  try { if (AU.ctx) AU.ctx.resume(); } catch (_) {}
}

function endGame(survived, reason) {
  if (state !== 'play') return;
  state = 'over';
  const list = rankList();
  if (!list.includes(player)) list.push(player);
  list.sort((a, b) => b.totalXp - a.totalXp);
  const rank = list.indexOf(player) + 1;
  $('overTitle').textContent = survived ? (rank === 1 ? '🏆 최강 공룡 등극!' : '⏰ 시간 종료!') : '😵 잡아먹혔다!';
  $('result').textContent = survived ? `${list.length}마리 중 ${rank}위!` : reason;
  $('resDetail').textContent = `${playerName} · ${player.sp.name} · Lv.${player.level} · 점수 ${player.totalXp} · 생존 ${Math.floor(elapsed / 60)}분 ${Math.floor(elapsed % 60)}초`;
  if (unlockMsg) $('resDetail').textContent += `\n${unlockMsg}`;
  const newIdx = recordScore();
  renderHof($('overHof'), newIdx);
  renderHof($('menuHof'), -1);
  stopMusic();
  if (ev) { ev = null; $('eventBar').classList.add('hidden'); }
  sfx(survived ? 'win' : 'lose');
  setTimeout(() => { $('over').classList.remove('hidden'); $('hud').classList.add('hidden'); }, survived ? 200 : 900);
}
document.querySelectorAll('button').forEach(b => b.addEventListener('click', () => b.blur()));
$('startBtn').onclick = startGame;
$('againBtn').onclick = startGame;
$('menuBtn').onclick = () => { $('over').classList.add('hidden'); $('menu').classList.remove('hidden'); state = 'menu'; buildCards(); renderHof($('menuHof'), -1); };
$('resumeBtn').onclick = resumeGame;
$('quitBtn').onclick = () => { $('pause').classList.add('hidden'); $('hud').classList.add('hidden'); $('menu').classList.remove('hidden'); state = 'menu'; buildCards(); stopMusic(); try { if (AU.ctx) AU.ctx.resume(); } catch (_) {} renderHof($('menuHof'), -1); };

// ---- 이름 / 명예의 전당 (이 기기에 저장) ----
$('nameIn').value = playerName === '나' ? '' : playerName;
let hofOk = true;
function loadHof() { try { return JSON.parse(localStorage.getItem('dino_hof') || '[]'); } catch (_) { hofOk = false; return []; } }
function recordScore() {
  const list = loadHof();
  const e = { name: playerName, score: player.totalXp, sp: player.sp.name, lv: player.level, era: curEra.name, at: Date.now() };
  list.push(e);
  list.sort((a, b) => b.score - a.score || a.at - b.at);
  const top = list.slice(0, 20);
  try { localStorage.setItem('dino_hof', JSON.stringify(top)); } catch (_) { hofOk = false; }
  return top.indexOf(e);
}
function renderHof(el, newIdx) {
  const list = loadHof();
  el.textContent = '';
  const t = document.createElement('div'); t.className = 'ht'; t.textContent = '🏅 명예의 전당 (이 기기)'; el.appendChild(t);
  if (!list.length) {
    const e = document.createElement('div'); e.className = 'empty';
    e.textContent = hofOk ? '아직 기록이 없어요. 첫 기록의 주인공이 되어보세요!' : '이 브라우저에서는 기록을 저장할 수 없어요.';
    el.appendChild(e);
  } else {
    const tb = document.createElement('table');
    list.slice(0, 10).forEach((r, i) => {
      const tr = document.createElement('tr');
      if (i === newIdx) tr.className = 'new';
      else if (r.name === playerName) tr.className = 'me';
      const medal = ['🥇', '🥈', '🥉'][i] || (i + 1) + '';
      [[medal, 'r'], [r.name, ''], [`${r.era ? r.era + ' · ' : ''}${r.sp} Lv.${r.lv}`, ''], [`${r.score}점`, 's']].forEach(([txt, cls]) => {
        const td = document.createElement('td'); td.textContent = txt; if (cls) td.className = cls; tr.appendChild(td);
      });
      tb.appendChild(tr);
    });
    el.appendChild(tb);
    if (newIdx >= 0 && newIdx < 10) { const n = document.createElement('div'); n.className = 'ht'; n.style.marginTop = '6px'; n.textContent = newIdx === 0 ? '🎉 새로운 1위 기록!' : `🎉 ${newIdx + 1}위에 이름을 올렸어요!`; el.appendChild(n); }
  }
  const note = document.createElement('div'); note.className = 'hn';
  note.textContent = '기록은 이 기기·이 브라우저에만 저장돼요. 한 기기에서 여러 명이 번갈아 하면 함께 순위가 매겨져요.';
  el.appendChild(note);
}
renderHof($('menuHof'), -1);

// ---- 전체 화면 / 소리 ----
function toggleFullscreen() {
  const d = document, el = d.documentElement;
  const on = d.fullscreenElement || d.webkitFullscreenElement;
  const fail = () => { const msg = '이 기기에서는 전체 화면을 지원하지 않아요 (아이폰은 미지원)'; $('fsNote').textContent = msg; if (state === 'play') toast(msg); };
  try {
    if (on) { (d.exitFullscreen || d.webkitExitFullscreen).call(d); return; }
    const req = el.requestFullscreen || el.webkitRequestFullscreen;
    if (!req) return fail();
    const p = req.call(el);
    if (p && p.then) p.then(() => { $('fsNote').textContent = ''; try { screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => {}); } catch (_) {} }).catch(fail);
  } catch (_) { fail(); }
}
$('fsBtn').addEventListener('click', toggleFullscreen);
$('fsMenuBtn').addEventListener('click', toggleFullscreen);
$('muteBtn').addEventListener('click', () => { initAudio(); setMuted(!AU.muted); });
setMuted(AU.muted);

// ====================================================================
//  메인 루프
// ====================================================================
const ringCols = { green: new THREE.Color(0x4cd964), yellow: new THREE.Color(0xffd24a), red: new THREE.Color(0xff4b4b), white: new THREE.Color(0xffffff), blue: new THREE.Color(0x5ac8fa), pale: new THREE.Color(0xc8f5c8) };
let last = performance.now();
let menuCamA = 0;

function step(dt) {
  elapsed += dt;
  if (elapsed >= ROUND_TIME) { endGame(true); return; }

  for (let i = respawnQueue.length - 1; i >= 0; i--) {
    const r = respawnQueue[i]; r.t -= dt;
    if (r.t <= 0) {
      respawnQueue.splice(i, 1);
      if (r.kind === 'dino') spawnBot(Math.min(MAX_LV, 3 + Math.floor(elapsed / 110)), 3);
      else spawnPrey(r.kind);
    }
  }
  for (let i = pteroRespawn.length - 1; i >= 0; i--) { pteroRespawn[i] -= dt; if (pteroRespawn[i] <= 0) { pteroRespawn.splice(i, 1); if (world.pteros.filter(p => !p.dead).length < 2) makePtero(); } }
  for (const f of world.ferns) if (!f.active) { f.t -= dt; if (f.t <= 0) { f.active = true; f.mesh.visible = true; } }
  for (const o of world.obstacles) if (o.gone) {
    o.regrowT -= dt;
    if (o.regrowT <= 0 && !world.creatures.some(c => !c.dead && Math.hypot(c.pos.x - o.x, c.pos.z - o.z) < o.r + c.r + 0.5)) {
      o.gone = false; o.bites = o.rule.bites; o.grp.visible = true; o.grp.scale.setScalar(1);
    }
  }

  // 보물상자
  if (!world.chest && elapsed >= nextChest) { makeChest(); nextChest = elapsed + CHEST_EVERY; }
  if (curEra.boss && !bossDone && elapsed >= BOSS_AT) spawnBoss();
  if (world.chest) {
    const ch = world.chest;
    if (ch.opened) {
      ch.openT += dt;
      ch.lid.rotation.x = -Math.min(1.9, ch.openT * 6);
      ch.gem.position.y = 2.4 + ch.openT * 4;
      if (ch.openT > 1.2) removeChest();
    } else {
      ch.life -= dt;
      ch.tw = (ch.tw || 0) - dt;
      if (ch.tw <= 0) { ch.tw = 2.2; sfxAt('twinkle', ch.pos, 1, 75); }
      ch.gem.rotation.y += dt * 2; ch.gem.position.y = 2.4 + Math.sin(elapsed * 3) * 0.25;
      ch.glow.material.opacity = 0.5 + Math.sin(elapsed * 5) * 0.4;
      if (ch.life <= 0) { removeChest(); toast('보물상자가 사라졌어요…'); }
    }
  }
  if (ev) { ev.t -= dt; if (ev.t <= 0) endEvent(); }

  if (!player.dead) playerInput();

  const list = world.creatures;
  for (const c of list) {
    if (c.dead) continue;
    c.biteCd -= dt; c.armorT -= dt; c.cds[0] -= dt; c.cds[1] -= dt; c.cds[2] -= dt; c.tailAnim -= dt; c.stompAnim -= dt;
    if (c.stompPending > 0) { c.stompPending -= dt; if (c.stompPending <= 0) doStomp(c); }
    if (c.dashT <= 0) c.lungeHit = false; c.sprintT -= dt; c.dashT -= dt; c.invT -= dt; c.spawnProt -= dt; c.flash -= dt; c.trampleCd -= dt; c.boostT -= dt;
    c.stunT -= dt; c.hideT -= dt; c.chargeT -= dt; c.voiceCd = (c.voiceCd || 0) - dt;
    if (!c.isPlayer && c.kind === 'dino' && c.hideT <= 0 && Math.random() < dt * 0.05) voice(c, 0.55, 26); // 주변 공룡 울음
    if (c.lungeBuff > 0) c.lungeBuff -= dt;
    if (c.biteAnim > 0) c.biteAnim -= dt;
    if (!c.isPlayer) {
      c.aiT -= dt;
      if (c.aiT <= 0) { c.aiT = 0.25 + Math.random() * 0.15; think(c); }
      steerToGoal(c);
    }
    let spd = c.sp.speed;
    if (c.kind === 'dino') spd *= 1 - 0.22 * (c.level - 1) / (MAX_LV - 1);
    if (!c.isPlayer && c.kind === 'dino') spd *= 0.93;
    if (c.sprintT > 0) spd *= 1.9;
    if (c.boostT > 0) spd *= 2.3;
    if (c.stunT > 0) spd = 0;
    const wet = c.kind !== 'bug' && inWater(c.pos.x, c.pos.z);
    if (wet) spd *= c.sp.swimmer ? 1.25 : 0.6;
    if (c.armorT > 0) spd *= 0.3;
    if (c.dashT <= 0) {
      const k = Math.min(1, dt * (c.kind === 'bug' ? 4 : 7));
      c.vel.x += (c.want.x * spd - c.vel.x) * k;
      c.vel.z += (c.want.z * spd - c.vel.z) * k;
    }
    c.pos.x += c.vel.x * dt; c.pos.z += c.vel.z * dt;
    for (const o of world.obstacles) {
      if (o.gone) continue;
      const dx = c.pos.x - o.x, dz = c.pos.z - o.z, rr = o.r + c.r * 0.6;
      const d2 = dx * dx + dz * dz;
      if (d2 < rr * rr) { const d = Math.sqrt(d2) || 0.01; c.pos.x = o.x + dx / d * rr; c.pos.z = o.z + dz / d * rr; }
    }
    const pr = Math.hypot(c.pos.x, c.pos.z);
    if (pr > MAP_R - c.r) { c.pos.x *= (MAP_R - c.r) / pr; c.pos.z *= (MAP_R - c.r) / pr; }
    c.wet = wet;
    // 물기
    if (c.kind === 'dino' && c.biteCd <= 0 && c.spawnProt <= 0) {
      if (c.isPlayer) {
        if (biteHeld || biteBtnHeld) { const t = findBiteTarget(c); doBite(c, t); if (!t) sfx('chomp'); }
      } else {
        const t = findBiteTarget(c);
        if (t && t.type !== 'chest') doBite(c, t); else c.biteCd = 0.15;
      }
    }
  }

  // 몸 부딪힘 (밀어내기 + 초식공룡 밟기)
  for (let i = 0; i < list.length; i++) {
    const a = list[i]; if (a.dead) continue;
    for (let j = i + 1; j < list.length; j++) {
      const b = list[j]; if (b.dead || a.dead) continue;
      if (a.kind !== 'dino' && b.kind !== 'dino') continue;
      const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z;
      const rr = a.r + b.r;
      const d2 = dx * dx + dz * dz;
      if (d2 >= rr * rr) continue;
      for (const [A, B] of [[a, b], [b, a]]) {
        if (A.dead || B.dead || A.kind !== 'dino' || B.kind === 'bug' || friendly(A, B) || A.spawnProt > 0) continue;
        // 덥석물기: 돌진 중 처음 닿은 상대를 자동으로 문다
        if (A.lungeHit && B.kind !== 'bug') { A.lungeHit = false; A.biteCd = 0; doBite(A, { type: 'creature', obj: B }); if (B.dead) continue; }
        // 돌진(리오하사우루스): 부딪힌 상대마다 한 번씩
        if (A.chargeT > 0 && A.chargeHits && !A.chargeHits.has(B)) {
          A.chargeHits.add(B);
          damage(B, A.atk * 1.3 * Math.sqrt(A.s / B.s), A); if (!B.dead) knock(B, A, 10);
          continue;
        }
        if (A.sp.diet !== 'herb' || A.trampleCd > 0) continue;
        if (A.s > B.s * 1.5) {
          damage(B, A.atk * 0.55, A); A.trampleCd = 0.9; if (!B.dead) knock(B, A, 4);
        }
      }
      if (a.dead || b.dead) continue;
      if (a.kind === 'bug' || b.kind === 'bug') continue;
      const d = Math.sqrt(d2) || 0.01, ov = rr - d;
      const ma = a.s * a.s, mb = b.s * b.s;
      a.pos.x -= dx / d * ov * mb / (ma + mb); a.pos.z -= dz / d * ov * mb / (ma + mb);
      b.pos.x += dx / d * ov * ma / (ma + mb); b.pos.z += dz / d * ov * ma / (ma + mb);
    }
  }
  if (world.creatures.some(c => c.dead && !c.isPlayer)) world.creatures = world.creatures.filter(c => !c.dead || c.isPlayer);

  for (const c of world.creatures) if (!c.dead && c.kind === 'dino') c.hp = Math.min(c.maxHp, c.hp + c.maxHp * 0.012 * dt);

  // 고기 조각
  for (const ch of world.chunks) {
    if (ch.dead) continue;
    ch.t += dt;
    if (ch.t >= ch.life) { ch.dead = true; scene.remove(ch.mesh); continue; }
  }
  if (world.chunks.some(c => c.dead)) world.chunks = world.chunks.filter(c => !c.dead);

  for (const p of world.pteros) if (!p.dead) updatePtero(p, dt);
  if (world.pteros.some(p => p.dead)) world.pteros = world.pteros.filter(p => !p.dead);

  boardT -= dt;
  if (boardT <= 0) { boardT = 0.5; updateBoard(); }
}

const dusts = []; let dustT = 0;
const dustGeo = new THREE.IcosahedronGeometry(0.4, 0);
function spawnDust(c) {
  const m = new THREE.Mesh(dustGeo, new THREE.MeshBasicMaterial({ color: Math.random() < 0.5 ? 0xe8d29a : 0xfff0b0, transparent: true, opacity: 0.55, depthWrite: false }));
  const bx = -Math.sin(c.heading), bz = -Math.cos(c.heading);
  m.position.set(c.pos.x + bx * c.r + rand(-0.4, 0.4) * c.s, 0.25 + Math.random() * 0.3, c.pos.z + bz * c.r + rand(-0.4, 0.4) * c.s);
  scene.add(m);
  dusts.push({ m, t: 0, s: 0.5 + c.s * 0.4 });
}
function renderWorld(dt) {
  // (버그 수정) 반드시 true/false 값으로 — null이면 Three.js가 '보임'으로 처리해서 빈 곳에 초록 원이 남았음
  const alive = !!(player && !player.dead);
  const pMeat = alive && isMeatEater(player);
  const pPlants = alive && player.sp.diet !== 'carn';
  const pHerb = alive && player.sp.diet === 'herb';
  const pulse = 0.55 + Math.sin(performance.now() / 180) * 0.35;
  const inGame = state === 'play' || state === 'paused' || state === 'over';

  for (const c of world.creatures) {
    if (c.dead) continue;
    const sp2 = Math.hypot(c.vel.x, c.vel.z);
    if (sp2 > 0.4) {
      const target = Math.atan2(c.vel.x, c.vel.z);
      let diff = target - c.heading;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      c.heading += diff * Math.min(1, dt * 10);
    }
    c.anim += dt * (sp2 / Math.max(0.35, c.s)) * 2.2;
    const m = c.model;
    m.group.rotation.y = c.heading;
    m.group.scale.setScalar(c.s);
    c.holder.position.set(c.pos.x, c.wet ? -0.22 * c.s : 0, c.pos.z);
    const sw = sp2 > 0.4 ? 0.7 : 0;
    m.legs.forEach((l, i) => { l.rotation.x = Math.sin(c.anim + (i % 2 ? Math.PI : 0) + (i > 1 ? Math.PI / 2 : 0)) * sw; });
    if (m.extra.smooth) { // 매끈한 몸: 꼬리가 휘며 흔들림
      const sm = m.extra.smooth, arr = sm.geo.attributes.position.array, b = sm.base, w = sm.w;
      const whip = c.tailAnim > 0 ? Math.sin((1 - c.tailAnim / 0.45) * Math.PI * 3) * 0.55 : 0;
      const amp = sm.tailLen * (0.07 + Math.min(0.08, sp2 * 0.008)) + sm.tailLen * Math.abs(whip);
      const ph = c.anim * 0.9 + (whip ? whip * 4 : 0);
      for (let i = 0, n = w.length; i < n; i++) {
        const wi = w[i]; if (wi <= 0) continue;
        arr[i * 3] = b[i * 3] + (whip ? whip * sm.tailLen * 0.9 * wi : Math.sin(ph - wi * 2.6) * amp * wi);
      }
      sm.geo.attributes.position.needsUpdate = true;
      const off = wi => whip ? whip * sm.tailLen * 0.9 * wi : Math.sin(ph - wi * 2.6) * amp * wi;
      for (const a of sm.attach) a.obj.position.x = a.bx + off(a.w); // 꼬리에 붙은 가시·곤봉
      for (const e of sm.extraGeos) { const ea = e.geo.attributes.position.array; for (let i = 0; i < e.w.length; i++) if (e.w[i] > 0) ea[i * 3] = e.base[i * 3] + off(e.w[i]); e.geo.attributes.position.needsUpdate = true; }
    }
    if (m.tail) m.tail.rotation.y = c.tailAnim > 0 ? Math.sin((1 - c.tailAnim / 0.45) * Math.PI * 3) * 1.3 : Math.sin(c.anim * 0.5) * 0.25;
    // 짓밟기: 앞쪽을 들어 올렸다가 내리찍기
    m.group.rotation.x = c.stompAnim > 0 ? -0.55 * Math.sin(clamp((1 - c.stompAnim / 0.55) / 0.55, 0, 1) * Math.PI) : 0;
    if (c.stunT > 0) m.group.rotation.z = Math.sin(performance.now() / 60) * 0.12; else m.group.rotation.z = 0;
    // 입 움직임
    if (m.jaw) {
      const b = c.biteAnim > 0 ? Math.sin((1 - c.biteAnim / 0.28) * Math.PI) : 0;
      m.jaw.rotation.x = b * 0.75;
      if (m.extra.jawFront) m.extra.jawFront.rotation.x = -b * 0.35; // 헤레라: 턱 중간 관절이 꺾이며 꽉 무는 동작
      if (m.head) m.head.rotation.x = (m.extra.headPitch || 0) - b * 0.25 + (c.lungeBuff > 0 ? -0.3 : 0);
    } else if (m.head) m.head.rotation.x = Math.sin(c.anim * 0.5) * 0.05;
    if (m.extra.wings) m.extra.wings.forEach((w, i) => { w.rotation.y = Math.sin(performance.now() / 30 + i) * 0.4; });
    const fl = c.flash > 0;
    const boosting = c.isPlayer && c.boostT > 0;
    const hid = c.hideT > 0, stun = c.stunT > 0;
    for (const mm of m.mats) {
      mm.emissive.setHex(fl ? 0x993322 : stun ? 0x2a2a66 : boosting ? (Math.sin(performance.now() / 70) > 0 ? 0x664400 : 0x332200) : (c.invT > 0 && c.isPlayer ? 0x333333 : 0x000000));
      if (mm.transparent !== hid) { mm.transparent = hid; mm.needsUpdate = true; }
      mm.opacity = hid ? (c.isPlayer ? 0.45 : 0.25) : 1;
    }
    if (c.tag) c.tag.visible = !(hid && !c.isPlayer) && (c.kind !== 'prey' || c.hp < c.maxHp - 0.01);
    // 큰 초식공룡(Lv.5 이상) 발소리
    if (state === 'play' && c.kind === 'dino' && c.sp.diet === 'herb' && c.level >= 5 && sp2 > 0.8 && player && !player.dead) {
      const ph = Math.floor(c.anim / Math.PI);
      if (ph !== c.lastStep) {
        c.lastStep = ph;
        const lv = 0.35 + 0.65 * (c.level - 5) / 5;
        if (c.isPlayer) { sfx('step', lv); if (c.level >= 8) shake = Math.max(shake, 0.06 * c.level / 10); }
        else sfxAt('step', c.pos, lv * 0.8, 30);
      }
    }
    // 부스터 먼지
    if (boosting && sp2 > 2 && state === 'play') { dustT -= dt; if (dustT <= 0) { dustT = 0.035; spawnDust(c); } }
    // 원 표시
    c.ring.scale.setScalar(c.s * 0.75 + 0.25);
    c.shadow.scale.setScalar(c.s * 0.7 + 0.2);
    if (c.model.extra.smooth) c.shadow.visible = false;
    let col = ringCols.yellow, vis = true, op = 0.85;
    if (c.isPlayer) col = ringCols.white;
    else if (player && !player.dead && inGame) {
      const cHost = !friendly(c, player), pHost = !friendly(player, c);
      if (c.kind === 'bug') { vis = pMeat; col = ringCols.green; op = pulse; }
      else if (!cHost && !pHost) col = ringCols.blue;
      else if (c.hideT > 0) { col = ringCols.pale; op = 0.25; }
      else if (isRebel(player) && isMeatEater(c)) { col = ringCols.green; op = pulse; }
      else if (pHost && pMeat && player.s > c.s * EAT_RATIO) col = ringCols.green;
      else if (cHost && isMeatEater(c) && c.s > player.s * EAT_RATIO) col = ringCols.red;
      else if (c.kind === 'dino' && !isMeatEater(c) && (c.s > player.s * 1.5 || (c.level >= MAX_LV && pMeat))) col = ringCols.red;
      else if (pHost && pMeat && player.level >= MAX_LV && sameKind(c, player)) col = ringCols.yellow;
      else if (!pMeat && !isMeatEater(c)) col = ringCols.pale;
    } else if (c.kind === 'bug') vis = false;
    c.ring.visible = !!vis;
    c.ring.material.color.copy(col);
    c.ring.material.opacity = c.spawnProt > 0 ? 0.35 : op;
    // 에너지바
    if (c.tag) {
      c.tag.position.set(0, c.kind === 'dino' ? c.s * 2.1 + 1.25 : c.s * 1.4 + 0.6, 0);
      if (c.hpGhost < c.hp) c.hpGhost = c.hp;
      if (c.hpGhost > c.hp) { if (c.ghostDelay > 0) c.ghostDelay -= dt; else c.hpGhost = Math.max(c.hp, c.hpGhost - c.maxHp * 0.8 * dt); }
      if (Math.abs(c.drawnHp - c.hp) > c.maxHp * 0.01 || Math.abs(c.drawnGhost - c.hpGhost) > c.maxHp * 0.01) drawTag(c);
    }
  }
  // 먹이 표시: 고사리, 나무
  for (const f of world.ferns) if (f.active) { f.ring.visible = !!pPlants && inGame; f.ring.material.opacity = pulse; }
  for (const o of world.obstacles) if (o.rule) {
    const can = !!(pHerb && inGame && !o.gone && player.level >= o.rule.lv);
    o.ring.visible = can; if (can) o.ring.material.opacity = pulse;
    o.lock.visible = !!(pHerb && inGame && !o.gone && player.level < o.rule.lv && Math.hypot(o.x - player.pos.x, o.z - player.pos.z) < 22);
  }
  // 고기 조각 (튀어나오는 애니메이션)
  for (const ch of world.chunks) {
    const k = clamp(ch.t / 0.4, 0, 1);
    const x = ch.from.x + (ch.pos.x - ch.from.x) * k, z = ch.from.z + (ch.pos.z - ch.from.z) * k;
    ch.mesh.position.set(x, 0.35 + Math.sin(k * Math.PI) * 1.4, z);
    ch.spin += dt * 1.5; ch.mesh.rotation.y = ch.spin;
    ch.ring.visible = !!pMeat && inGame;
    ch.ring.material.opacity = pulse;
    ch.mesh.visible = ch.life - ch.t > 5 || Math.sin(ch.t * 14) > 0;
  }
  for (let i = waves.length - 1; i >= 0; i--) {
    const w = waves[i]; w.t += dt;
    const k = w.t / 0.35;
    w.m.scale.setScalar(w.R * k);
    w.m.material.opacity = 0.9 * (1 - k);
    if (k >= 1) { scene.remove(w.m); waves.splice(i, 1); }
  }
  for (let i = dusts.length - 1; i >= 0; i--) {
    const d = dusts[i]; d.t += dt;
    const k = d.t / 0.55;
    d.m.scale.setScalar(d.s * (1 + k * 2.2)); d.m.position.y += dt * 0.8;
    d.m.material.opacity = 0.55 * (1 - k);
    if (k >= 1) { scene.remove(d.m); d.m.material.dispose(); dusts.splice(i, 1); }
  }
  for (let i = floaters.length - 1; i >= 0; i--) {
    const f = floaters[i]; f.t += dt;
    f.sp.position.y += dt * 1.6;
    f.sp.material.opacity = 1 - clamp((f.t - 0.5) / 0.4, 0, 1);
    if (f.t > 0.9) { scene.remove(f.sp); f.sp.material.map.dispose(); f.sp.material.dispose(); floaters.splice(i, 1); }
  }
  // 보물 화살표
  if (world.chest && !world.chest.opened && player && !player.dead && state === 'play') {
    const dx = world.chest.pos.x - player.pos.x, dz = world.chest.pos.z - player.pos.z, d = Math.hypot(dx, dz);
    arrow.visible = d > 5;
    const off = player.r + 1.6;
    arrow.position.set(player.pos.x + dx / d * off, 0.25, player.pos.z + dz / d * off);
    arrow.rotation.y = Math.atan2(dx, dz);
    arrow.scale.setScalar(0.9 + player.s * 0.3);
  } else arrow.visible = false;
}

function updateCamera(dt) {
  if (window.__cam) { const k = window.__cam; camera.position.set(...k.pos); camera.lookAt(...k.look); sun.position.set(k.look[0] + 22, 50, k.look[2] + 16); sun.target.position.set(k.look[0], 0, k.look[2]); return; } // 테스트용 고정 카메라
  if (state === 'menu' || !player) {
    menuCamA += dt * 0.08;
    camera.position.set(Math.cos(menuCamA) * 50, 34, Math.sin(menuCamA) * 50);
    camera.lookAt(0, 0, 0);
    return;
  }
  const zoom = (0.55 + player.s * 0.48) * (camera.aspect < 1 ? 1.55 : 1);
  const tx = player.pos.x, tz = player.pos.z;
  camera.position.lerp(new THREE.Vector3(tx, 15 * zoom, tz + 12.5 * zoom), Math.min(1, dt * 4));
  if (shake > 0 && state === 'play') {
    camera.position.x += rand(-1, 1) * shake; camera.position.y += rand(-1, 1) * shake;
    shake = Math.max(0, shake - dt * 2);
  }
  camera.lookAt(tx, 0.5, tz);
  sun.position.set(tx + 22, 50, tz + 16); sun.target.position.set(tx, 0, tz); // 그림자가 플레이어 주변을 따라옴
  // 부스터: 시야가 넓어지며 속도감
  const wantFov = player.boostT > 0 && state === 'play' ? 68 : 50;
  if (Math.abs(camera.fov - wantFov) > 0.05) { camera.fov += (wantFov - camera.fov) * Math.min(1, dt * 3); camera.updateProjectionMatrix(); }
}

function demoWorld() {
  if (terrainEra !== curEra.key) buildTerrain();
  for (let i = 0; i < 8; i++) makeCreature('dino', pick(curEra.pool), { level: (Math.random() * 6 + 1) | 0, name: pick(BOT_NAMES) });
  for (let i = 0; i < 6; i++) spawnPrey('prey');
  for (let i = 0; i < 25; i++) world.ferns.push(makeFern());
  makePtero();
}

function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (state === 'play') {
    step(dt);
    if (player && state !== 'menu') updateHUD();
  } else if (state === 'menu') {
    for (const c of world.creatures) {
      if (c.dead) continue;
      c.aiT -= dt;
      if (c.aiT <= 0) { c.aiT = 1; c.wanderA += rand(-0.8, 0.8); c.want.set(Math.cos(c.wanderA), 0, Math.sin(c.wanderA)).multiplyScalar(0.5); }
      c.vel.lerp(c.want.clone().multiplyScalar(c.sp.speed), Math.min(1, dt * 5));
      c.pos.addScaledVector(c.vel, dt);
      if (Math.hypot(c.pos.x, c.pos.z) > MAP_R - 15) c.wanderA = Math.atan2(-c.pos.z, -c.pos.x);
    }
    for (const p of world.pteros) { if (p.dead) continue; p.state = 'circle'; p.t = 99; updatePtero(p, dt); }
  }
  if (state !== 'paused') {
    if (toastTimer > 0) { toastTimer -= dt; if (toastTimer <= 0) $('toast').style.opacity = 0; }
    if (warnTimer > 0) { warnTimer -= dt; if (warnTimer <= 0) $('warn').style.opacity = 0; }
    renderWorld(dt);
  }
  updateCamera(state === 'paused' ? 0 : dt);
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}

if (document.fonts && document.fonts.load) {
  document.fonts.load("44px 'Jua'").then(() => { for (const c of world.creatures) if (c.tag && !c.dead) drawTag(c); }).catch(() => {});
}

demoWorld();
requestAnimationFrame(loop);

// 테스트용 훅
window.__el = () => elapsed;
window.__AU = AU; window.__sfx = sfx; window.__voice = voice;
window.__dino = {
  world, get player() { return player; }, get state() { return state; }, get ev() { return ev; },
  startGame, useSkill, gain, setSel: k => { selected = k; }, setEra, spawnBoss, get curEra() { return curEra; }, skip: () => { elapsed = ROUND_TIME - 0.5; },
  setElapsed: t => { elapsed = t; }, freeze: () => { state = 'over'; }, makeCreature, openChest, makeChest, findBiteTarget, doBite, pauseGame, resumeGame,
  forceEvent: type => { ev = { type, t: EVENTS[type].dur }; EVENTS[type].start(); $('eventBar').classList.remove('hidden'); }
};
