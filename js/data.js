// 공룡 배틀 — 데이터 (종·시대·규칙 상수)
'use strict';
// ====================================================================
//  데이터
// ====================================================================
const SPECIES = {
  eoraptor: {
    name: '에오랍토르', diet: 'omni', body: 'theropod', shape: { body: [0.52, 0.52, 0.85], hip: 0.82, neck: { len: 0.45, angles: [0.75, 0.95], r: 0.15 }, skull: { len: 0.46, h: 0.26, w: 0.24, taper: 0.75 }, eye: 1.35, nostril: true, mixedTeeth: true, teeth: 5, arm: 0.34, armT: 0.05, hand: 0.13, claws: 3, clawLen: 0.08, stubs: 2, leg: 0.8, legT: 0.08, foot: 1.1, tail: 1.5, tailR: 0.2 }, color: 0x93ad55, belly: 0xd9d19a, stripe: 0x5d7330,
    adult: 1.25, speed: 10.2, atk: 6, hp: 42, headScale: 0.85,
    skill: { name: '날쌘 회피', type: 'dash', cd: 5 },
    tags: ['잡식', '최고 속도', '도전 모드'],
    fact: '약 2억 3천만 년 전 아르헨티나 · 몸길이 약 1m · 앞니는 나뭇잎 모양, 뒤쪽 이빨은 칼날 모양이라 잡식으로 봐요. 다섯 손가락 중 세 개에 발톱.'
  },
  coelophysis: {
    name: '코엘로피시스', diet: 'carn', body: 'theropod', shape: { body: [0.44, 0.46, 1.0], hip: 0.9, neck: { len: 0.85, angles: [0.25, 0.75, 1.25], r: 0.12 }, skull: { len: 0.72, h: 0.2, w: 0.18, taper: 0.55 }, eye: 1.25, eyeFwd: true, nasalRidge: true, teeth: 6, arm: 0.38, armT: 0.045, hand: 0.15, claws: 3, clawLen: 0.09, stubs: 1, leg: 0.92, legT: 0.075, foot: 1.0, tail: 2.2, tailR: 0.17 }, color: 0xd09346, belly: 0xf1d7a6, stripe: 0x8a5420,
    adult: 1.6, speed: 9.8, atk: 8, hp: 48, headScale: 0.9,
    skill: { name: '질주', type: 'sprint', cd: 6 },
    tags: ['육식', '빠름', '추천'],
    fact: '트라이아스기 후기 북미 · 몸길이 2~3m · 가늘고 긴 머리, S자로 굽은 긴 목, 앞을 보는 큰 눈. 뼈 속이 빈 가벼운 몸.'
  },
  herrerasaurus: {
    name: '헤레라사우루스', diet: 'carn', body: 'theropod', shape: { body: [0.62, 0.62, 1.1], hip: 0.9, neck: { len: 0.5, angles: [0.75, 1.05], r: 0.19 }, skull: { len: 0.66, h: 0.3, w: 0.27, taper: 0.7 }, eye: 1.0, jawHinge: true, teeth: 6, arm: 0.36, armT: 0.07, hand: 0.3, claws: 3, clawLen: 0.17, stubs: 2, leg: 0.86, legT: 0.13, foot: 1.45, tail: 2.0, tailR: 0.27 }, color: 0xa1503c, belly: 0xe2b48c, stripe: 0x5e2a1f,
    adult: 2.4, speed: 8.4, atk: 13, hp: 75, headScale: 1.25,
    skill: { name: '덥석물기', type: 'lunge', cd: 7 },
    tags: ['육식', '최상위 포식자'],
    fact: '약 2억 3천만 년 전 아르헨티나 · 몸길이 3~6m · 아래턱 중간 관절이 앞뒤로 움직여 먹이를 꽉 물었고, 큰 손에 굽은 발톱 세 개.'
  },
  liliensternus: {
    name: '릴리엔스테르누스', diet: 'carn', body: 'theropod', shape: { body: [0.62, 0.64, 1.15], hip: 0.95, neck: { len: 0.65, angles: [0.45, 0.85, 1.15], r: 0.17 }, skull: { len: 0.68, h: 0.27, w: 0.25, taper: 0.62 }, eye: 1.0, crest: 0.22, teeth: 6, arm: 0.4, armT: 0.065, hand: 0.2, claws: 3, clawLen: 0.12, stubs: 1, leg: 0.92, legT: 0.12, foot: 1.15, tail: 2.1, tailR: 0.26 }, color: 0x7a8a3c, belly: 0xd8d2a0, stripe: 0x3f4a1c,
    adult: 2.7, speed: 8.0, atk: 14, hp: 85, headScale: 1.15, crest: true,
    skill: { name: '포효', type: 'roar', cd: 8 },
    tags: ['육식', '가장 큰 사냥꾼', '포효로 얼리기'],
    fact: '약 2억 1천만 년 전 독일 · 몸길이 약 5m · 유럽 트라이아스기 최대급 육식공룡. 머리 볏은 추정 복원이에요.'
  },
  thecodontosaurus: {
    name: '테코돈토사우루스', diet: 'herb', body: 'theco', color: 0xa98c5c, belly: 0xe8d9b0, stripe: 0x6e5530,
    adult: 1.3, speed: 10.0, atk: 5, hp: 46, headScale: 0.72,
    skill: { name: '덤불 숨기', type: 'hide', cd: 9 },
    tags: ['초식', '작고 빠름', '숨기'],
    fact: '트라이아스기 후기 영국 · 몸길이 1.2~2.5m · 짧은 목에 비해 큰 머리와 큰 눈, 엄지 발톱을 가진 작은 초식공룡.'
  },
  riojasaurus: {
    name: '리오하사우루스', diet: 'herb', body: 'rioja', color: 0x8a6f5a, belly: 0xd6c4a8, stripe: 0x5a4030,
    adult: 3.0, speed: 6.2, atk: 17, hp: 150, headScale: 0.8,
    skill: { name: '육중한 돌진', type: 'charge', cd: 7 },
    tags: ['초식', '가장 튼튼함', '돌진'],
    fact: '트라이아스기 후기(노리절) 아르헨티나 · 몸길이 약 6.6~10m · 무겁고 단단한 다리뼈로 네 발로 천천히 걸었다고 복원돼요.'
  },
  plateosaurus: {
    name: '플라테오사우루스', diet: 'herb', body: 'plateo', color: 0x6c8fa0, belly: 0xc9d8cf, stripe: 0x3f5d6b,
    adult: 3.3, speed: 6.9, atk: 15, hp: 120, headScale: 0.8,
    skill: { name: '꼬리 휘두르기', type: 'tail', cd: 6 },
    tags: ['초식', '가장 큼', '나무도 먹음'],
    fact: '약 2억 1,400만~2억 400만 년 전 유럽 · 몸길이 4.8~10m · 손바닥을 땅에 짚을 수 없어 두 발로 걸었어요. 큰 엄지 발톱이 특징.'
  }
};
const PREY = {
  rhyncho: { name: '린코사우루스', diet: 'herb', body: 'rhyncho', color: 0x8c7a5b, belly: 0xc8b48a, speed: 5.2, hp: 22 },
  bug: { name: '곤충', diet: 'none', body: 'bug', color: 0xb5651d, speed: 2.2, hp: 1 }
};
const TREE_RULE = { cycad: { lv: 3, bites: 3, xp: 7, name: '소철' }, conifer: { lv: 7, bites: 5, xp: 10, name: '큰 나무' } };
const BOT_NAMES = ['쿵쾅이','바삭이','초코','번개','티노','몽실이','뾰족이','먹보','달리','용용이','루루','깡총','후추','마루','짱돌','코코','두두','삐약','곰돌','라온','콩떡','방울','다솜','우주'];

const MAP_R = 72;
const ROUND_TIME = 600;
const MAX_LV = 10;
const EAT_RATIO = 1.25;
const N_BOTS = 18, N_RHYNCHO = 12, N_BUGS = 46, N_FERNS = 55;
const CHEST_FIRST = 120, CHEST_EVERY = 120, CHEST_LIFE = 50;

const rand = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[(Math.random() * arr.length) | 0];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const xpNeed = lv => 8 + lv * 6;
const sameKind = (a, b) => a.kind === 'dino' && b.kind === 'dino' && a.key === b.key;
// A가 B를 공격하지 않는 사이인가? (같은 종은 친구, 단 Lv.10 육식은 같은 종도 사냥)
const friendly = (A, B) => sameKind(A, B) && !(A.sp.diet !== 'herb' && A.level >= 10);
const esc = t => String(t).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const isMeatEater = c => c.kind === 'dino' && c.sp.diet !== 'herb';
let playerName = '나';
try { playerName = localStorage.getItem('dino_name') || '나'; } catch (_) {}
