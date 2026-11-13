// 공룡 배틀 — 렌더러·HUD 스프라이트·지형

// ====================================================================
//  Three.js
// ====================================================================
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xe7c48e);
scene.fog = new THREE.Fog(0xe7c48e, 55, 120);
const camera = new THREE.PerspectiveCamera(50, 1, 0.5, 300);
scene.add(new THREE.HemisphereLight(0xfff1d6, 0x6a4f32, 0.5));
const sun = new THREE.DirectionalLight(0xfff4e0, 0.62);
sun.position.set(30, 60, 20);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { left: -28, right: 28, top: 28, bottom: -28, near: 5, far: 140 });
sun.shadow.bias = -0.0015;
scene.add(sun); scene.add(sun.target);

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

const matCache = {};
function mat(color) {
  if (!matCache[color]) matCache[color] = new THREE.MeshPhongMaterial({ color, flatShading: true, shininess: 4 });
  return matCache[color];
}
function ownMat(color) { return new THREE.MeshPhongMaterial({ color, flatShading: true, shininess: 6 }); }

const ringGeo = new THREE.RingGeometry(0.85, 1.05, 24); ringGeo.rotateX(-Math.PI / 2);
const shadowGeo = new THREE.CircleGeometry(0.9, 14); shadowGeo.rotateX(-Math.PI / 2);
const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false });
function makeRing(color, opacity) {
  const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: opacity || 0.85, depthWrite: false }));
  m.position.y = 0.06;
  return m;
}

// ====================================================================
//  텍스트 / 에너지바 스프라이트
// ====================================================================
const FONT = "'Jua', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif";
function makeCanvasSprite(w, h, sx, sy) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const tex = new THREE.CanvasTexture(cv);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  sp.renderOrder = 10; sp.scale.set(sx, sy, 1);
  sp.userData = { cv, ctx: cv.getContext('2d'), tex };
  return sp;
}
function drawBar(ctx, x, y, w, h, ratio, ghost) {
  ctx.fillStyle = 'rgba(0,0,0,.65)';
  ctx.fillRect(x - 3, y - 3, w + 6, h + 6);
  ctx.fillStyle = 'rgba(255,255,255,.18)';
  ctx.fillRect(x, y, w, h);
  if (ghost > ratio) { ctx.fillStyle = '#fff6d0'; ctx.fillRect(x, y, w * ghost, h); }
  ctx.fillStyle = ratio > 0.5 ? '#5bd85b' : ratio > 0.25 ? '#ffc93c' : '#ff4b3e';
  ctx.fillRect(x, y, w * Math.max(0, ratio), h);
}
// 이름 + 종/레벨 + 에너지바
function drawTag(c) {
  const { cv, ctx, tex } = c.tag.userData;
  ctx.clearRect(0, 0, cv.width, cv.height);
  const r = clamp(c.hp / c.maxHp, 0, 1), g = clamp(c.hpGhost / c.maxHp, 0, 1);
  if (c.tagHasName) {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 8; ctx.strokeStyle = 'rgba(0,0,0,.7)';
    ctx.font = '44px ' + FONT;
    const nm = c.isPlayer ? playerName : c.name;
    ctx.strokeText(nm, 256, 36); ctx.fillStyle = c.isPlayer ? '#ffe066' : '#fff'; ctx.fillText(nm, 256, 36);
    ctx.font = '34px ' + FONT;
    const sub = `${c.sp.name} Lv.${c.level}`;
    ctx.strokeText(sub, 256, 86); ctx.fillStyle = '#f3e6c8'; ctx.fillText(sub, 256, 86);
    drawBar(ctx, 106, 118, 300, 26, r, g);
  } else {
    drawBar(ctx, 8, 8, cv.width - 16, cv.height - 16, r, g);
  }
  tex.needsUpdate = true;
  c.drawnHp = c.hp; c.drawnGhost = c.hpGhost;
}
function makeLabel(text, color) {
  const sp = makeCanvasSprite(512, 96, 4.6, 0.86);
  const { ctx, tex } = sp.userData;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '44px ' + FONT; ctx.lineWidth = 8; ctx.strokeStyle = 'rgba(0,0,0,.7)';
  ctx.strokeText(text, 256, 48); ctx.fillStyle = color || '#fff'; ctx.fillText(text, 256, 48);
  tex.needsUpdate = true;
  return sp;
}

// 떠오르는 숫자 (데미지)
const floaters = [];
function floatText(pos, text, color, size) {
  const sp = makeCanvasSprite(256, 96, (size || 1) * 2.4, (size || 1) * 0.9);
  const { ctx, tex } = sp.userData;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '64px ' + FONT; ctx.lineWidth = 10; ctx.strokeStyle = 'rgba(0,0,0,.75)';
  ctx.strokeText(text, 128, 48); ctx.fillStyle = color; ctx.fillText(text, 128, 48);
  tex.needsUpdate = true;
  sp.position.copy(pos);
  scene.add(sp);
  floaters.push({ sp, t: 0 });
}

// ====================================================================
//  지형
// ====================================================================
const world = { obstacles: [], ponds: [], ferns: [], creatures: [], pteros: [], chunks: [], chest: null, decor: new THREE.Group() };
scene.add(world.decor);

let terrainEra = null;
function clearTerrain() {
  while (world.decor.children.length) world.decor.remove(world.decor.children[0]);
  for (const o of world.obstacles) { if (o.ring) scene.remove(o.ring); if (o.lock) scene.remove(o.lock); }
  world.obstacles.length = 0; world.ponds = []; terrainEra = null;
}
function buildTerrain() {
  const L = curEra.look;
  terrainEra = curEra.key;
  scene.background = new THREE.Color(L.sky); scene.fog.color.setHex(L.sky);
  const g = new THREE.CircleGeometry(MAP_R + 40, 64);
  g.rotateX(-Math.PI / 2);
  const groundM = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color: L.ground })); groundM.receiveShadow = true; world.decor.add(groundM);
  for (let i = 0; i < 70; i++) {
    const p = new THREE.Mesh(new THREE.CircleGeometry(rand(3, 9), 7), new THREE.MeshLambertMaterial({ color: pick(L.patches) }));
    p.rotation.x = -Math.PI / 2; p.rotation.z = rand(0, 6);
    const a = rand(0, Math.PI * 2), d = Math.sqrt(Math.random()) * (MAP_R + 10);
    p.position.set(Math.cos(a) * d, 0.01 + i * 0.0004, Math.sin(a) * d);
    p.receiveShadow = true;
    world.decor.add(p);
  }
  world.ponds = L.ponds.map(p => Object.assign({}, p));
  for (const pd of world.ponds) {
    const shore = new THREE.Mesh(new THREE.CircleGeometry(pd.r + 2.2, 14), new THREE.MeshLambertMaterial({ color: L.shore }));
    shore.rotation.x = -Math.PI / 2; shore.position.set(pd.x, 0.04, pd.z);
    const water = new THREE.Mesh(new THREE.CircleGeometry(pd.r, 14), new THREE.MeshPhongMaterial({ color: L.water, transparent: true, opacity: 0.85, shininess: 60, flatShading: true }));
    water.rotation.x = -Math.PI / 2; water.position.set(pd.x, 0.07, pd.z);
    world.decor.add(shore, water);
  }
  for (let i = 0; i < 64; i++) {
    const a = i / 64 * Math.PI * 2, s = rand(3, 6);
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), mat(pick(L.rock)));
    rock.position.set(Math.cos(a) * (MAP_R + s * 0.6), s * 0.4, Math.sin(a) * (MAP_R + s * 0.6));
    rock.rotation.set(rand(0, 3), rand(0, 3), 0);
    world.decor.add(rock);
  }
  const inPond = (x, z, pad) => world.ponds.some(p => Math.hypot(x - p.x, z - p.z) < p.r + pad);
  for (let i = 0; i < 46; i++) {
    let x, z, tries = 0;
    do { const a = rand(0, Math.PI * 2), d = rand(8, MAP_R - 6); x = Math.cos(a) * d; z = Math.sin(a) * d; tries++; }
    while ((inPond(x, z, 4) || world.obstacles.some(o => Math.hypot(o.x - x, o.z - z) < o.r + 5)) && tries < 30);
    const roll = Math.random();
    const type = roll < 0.42 ? 'conifer' : roll < 0.78 ? 'cycad' : 'rock';
    const grp = new THREE.Group();
    let r, topY = 3.6;
    if (type === 'conifer' && L.big === 'broadleaf') { // 활엽수 (백악기 후기 꽃 피는 나무)
      const h = rand(5, 8);
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.45, h * 0.6, 6), mat(0x6b4a2e));
      trunk.position.y = h * 0.3; grp.add(trunk);
      for (let k = 0; k < 4; k++) {
        const bl = new THREE.Mesh(new THREE.IcosahedronGeometry(rand(1.3, 1.9), 0), mat(pick(L.leaf)));
        bl.position.set(rand(-0.9, 0.9), h * 0.62 + rand(0, 1.4), rand(-0.9, 0.9)); grp.add(bl);
      }
      if (L.flowers) for (let k = 0; k < 7; k++) {
        const fl = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2, 0), mat(pick([0xf4f0e8, 0xf2c8d8, 0xf8e08a])));
        const a = rand(0, 6.28); fl.position.set(Math.cos(a) * 1.7, h * 0.7 + rand(0, 1.5), Math.sin(a) * 1.7); grp.add(fl);
      }
      r = 0.9; topY = h + 0.8;
    } else if (type === 'conifer') {
      const h = rand(5, 9);
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, h * 0.45, 5), mat(0x6b4a2e));
      trunk.position.y = h * 0.22; grp.add(trunk);
      for (let k = 0; k < 3; k++) {
        const cone = new THREE.Mesh(new THREE.ConeGeometry(1.9 - k * 0.45, h * 0.35, 6), mat(pick(L.leaf)));
        cone.position.y = h * 0.42 + k * h * 0.18; grp.add(cone);
      }
      r = 0.9; topY = 4.5;
    } else if (type === 'cycad' && L.small === 'palm') { // 야자류
      const h = rand(3.2, 4.2);
      for (let k = 0; k < 4; k++) { const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, h / 4, 6), mat(0x7a5a36)); seg.position.set(k * 0.12, h / 8 + k * h / 4, 0); seg.rotation.z = -0.08; grp.add(seg); }
      for (let k = 0; k < 7; k++) {
        const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.22, 2.4, 4), mat(0x5f8a3a)); leaf.scale.set(1, 1, 0.3);
        const a = k / 7 * Math.PI * 2;
        leaf.position.set(0.48 + Math.cos(a) * 0.9, h + 0.1, Math.sin(a) * 0.9);
        leaf.lookAt(0.48 + Math.cos(a) * 3, h - 0.8, Math.sin(a) * 3); leaf.rotateX(Math.PI / 2);
        grp.add(leaf);
      }
      r = 0.8; topY = h + 1.2;
    } else if (type === 'cycad') {
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.55, 1.4, 6), mat(0x7a5a36));
      trunk.position.y = 0.7; grp.add(trunk);
      for (let k = 0; k < 7; k++) {
        const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.28, 2.6, 4), mat(0x5f8a3a));
        const a = k / 7 * Math.PI * 2;
        leaf.position.set(Math.cos(a) * 0.9, 1.8, Math.sin(a) * 0.9);
        leaf.lookAt(Math.cos(a) * 3, 2.4, Math.sin(a) * 3); leaf.rotateX(Math.PI / 2);
        grp.add(leaf);
      }
      r = 1.0;
    } else {
      const s = rand(1.2, 2.4);
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), mat(pick(L.rock)));
      rock.position.y = s * 0.5; rock.rotation.set(rand(0, 3), rand(0, 3), 0); grp.add(rock);
      r = s * 0.85;
    }
    grp.position.set(x, 0, z);
    grp.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    world.decor.add(grp);
    const o = { x, z, r, type, grp, pos: new THREE.Vector3(x, 0, z), gone: false, regrowT: 0 };
    if (type !== 'rock') {
      o.rule = Object.assign({}, TREE_RULE[type], { name: curEra.trees[type] });
      o.bites = o.rule.bites;
      o.ring = makeRing(0x4cd964, 0.9); o.ring.scale.setScalar(r + 0.9); o.ring.position.set(x, 0.07, z); o.ring.visible = false;
      o.lock = makeLabel(`🔒 Lv.${o.rule.lv}부터`, '#ffe9a8'); o.lock.position.set(x, topY, z); o.lock.visible = false;
      o.lock.scale.set(3.2, 0.6, 1);
      scene.add(o.ring, o.lock);
    }
    world.obstacles.push(o);
  }
}

function makeFern() {
  const grp = new THREE.Group();
  for (let k = 0; k < 5; k++) {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.16, 1.1, 4), mat(pick(curEra.look.fern)));
    const a = k / 5 * Math.PI * 2 + rand(0, .5);
    leaf.position.set(Math.cos(a) * 0.25, 0.45, Math.sin(a) * 0.25);
    leaf.rotation.set(Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6);
    grp.add(leaf);
  }
  const ring = makeRing(0x4cd964, 0.8); ring.scale.setScalar(0.65); grp.add(ring);
  scene.add(grp);
  const f = { pos: new THREE.Vector3(), mesh: grp, ring, active: true, t: 0, r: 0.5 };
  placeRandom(f.pos, 2, true);
  grp.position.copy(f.pos);
  return f;
}

function inWater(x, z) { return world.ponds.some(p => Math.hypot(x - p.x, z - p.z) < p.r); }
function placeRandom(v, pad, avoidWater, awayFrom, minDist, maxDist) {
  for (let t = 0; t < 60; t++) {
    const a = rand(0, Math.PI * 2), d = Math.sqrt(Math.random()) * (MAP_R - 6);
    const x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (avoidWater && inWater(x, z)) continue;
    if (world.obstacles.some(o => !o.gone && Math.hypot(o.x - x, o.z - z) < o.r + pad)) continue;
    if (awayFrom) {
      const dd = Math.hypot(awayFrom.x - x, awayFrom.z - z);
      if (dd < minDist || (maxDist && dd > maxDist)) continue;
    }
    v.set(x, 0, z); return v;
  }
  v.set(rand(-10, 10), 0, rand(-10, 10));
  return v;
}

