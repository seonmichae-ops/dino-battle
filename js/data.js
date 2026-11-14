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
for (const k in SPECIES) SPECIES[k].era = 'triassic';

// ====================================================================
//  MVP 추가 종 (쥐라기 · 백악기 중기 · 백악기 후기)
//  몸길이·시기는 검색으로 확인한 값. 예외: 인도미누스(영화 속 가상 공룡), 벨로키랍토르(영화 크기)
// ====================================================================
const TH = (o) => Object.assign({ eye: 1, teeth: 6, claws: 3, stubs: 1, foot: 1.2 }, o); // 수각류 모양 기본값
Object.assign(SPECIES, {
  // ---------------- 쥐라기 ----------------
  compsognathus: {
    era: 'jurassic', name: '콤프소그나투스', diet: 'carn', body: 'theropod',
    shape: TH({ body: [0.36, 0.38, 0.85], hip: 0.86, neck: { len: 0.7, angles: [0.4, 0.8, 1.2], r: 0.1 }, skull: { len: 0.5, h: 0.2, w: 0.17, taper: 0.55 }, eye: 1.35, teeth: 5, arm: 0.3, armT: 0.04, hand: 0.12, claws: 2, clawLen: 0.07, leg: 0.92, legT: 0.06, foot: 1.0, tail: 2.3, tailR: 0.14 }),
    color: 0x7d9a4a, belly: 0xe2dca8, stripe: 0x4b6326,
    adult: 1.1, speed: 10.6, atk: 5, hp: 36,
    skill: { name: '날쌘 회피', type: 'dash', cd: 5 },
    tags: ['육식', '가장 작음', '가장 빠름'],
    fact: '약 1억 5천만 년 전 독일·프랑스 · 몸길이 약 1m · 닭만 한 작은 육식공룡. 배 속에서 잡아먹은 도마뱀 화석이 함께 발견됐어요.'
  },
  dryosaurus: {
    era: 'jurassic', name: '드리오사우루스', diet: 'herb', body: 'dryo', color: 0x9aa35a, belly: 0xe6e2b4, stripe: 0x5e6a2e,
    adult: 1.35, speed: 10.3, atk: 4, hp: 44,
    skill: { name: '질주', type: 'sprint', cd: 6 },
    tags: ['초식', '달리기 선수'],
    fact: '쥐라기 후기 북미(모리슨층) · 몸길이 약 3m · 부리와 길고 튼튼한 뒷다리로 빨리 달아난 작은 초식공룡.'
  },
  dilophosaurus: {
    era: 'jurassic', name: '딜로포사우루스', diet: 'carn', body: 'theropod',
    shape: TH({ body: [0.58, 0.6, 1.15], hip: 0.95, neck: { len: 0.75, angles: [0.4, 0.8, 1.15], r: 0.16 }, skull: { len: 0.72, h: 0.26, w: 0.24, taper: 0.55 }, crest: 0.3, nostril: true, arm: 0.42, armT: 0.07, hand: 0.24, clawLen: 0.13, leg: 0.95, legT: 0.12, foot: 1.15, tail: 2.2, tailR: 0.26 }),
    color: 0xc0a050, belly: 0xefe0b0, stripe: 0x6e4a24,
    adult: 2.4, speed: 9.0, atk: 11, hp: 66,
    skill: { name: '볏 과시', type: 'roar', cd: 8 },
    tags: ['육식', '두 줄 볏', '얼리기'],
    fact: '약 1억 9,300만 년 전(쥐라기 전기) 미국 애리조나 · 몸길이 약 7m · 머리 위 얇은 볏 두 개는 과시용으로 추정. 영화 속 독 뱉기·목 주름은 증거가 없어요.'
  },
  allosaurus: {
    era: 'jurassic', name: '알로사우루스', diet: 'carn', body: 'theropod',
    shape: TH({ body: [0.72, 0.78, 1.3], hip: 1.0, neck: { len: 0.6, angles: [0.6, 0.95, 1.2], r: 0.22 }, skull: { len: 0.82, h: 0.36, w: 0.32, taper: 0.62 }, eye: 0.95, hornlets: 0.13, teeth: 7, arm: 0.48, armT: 0.09, hand: 0.32, clawLen: 0.2, leg: 1.0, legT: 0.16, foot: 1.3, tail: 2.4, tailR: 0.34 }),
    color: 0x9c6a48, belly: 0xe4c9a4, stripe: 0x5a3422,
    adult: 3.3, speed: 8.2, atk: 16, hp: 95,
    skill: { name: '도끼 물기', type: 'lunge', cd: 7 },
    tags: ['육식', '쥐라기 최강 사냥꾼'],
    fact: '약 1억 5,500만~1억 4,500만 년 전 북미·포르투갈 · 몸길이 약 8.5m · 눈 위의 작은 뿔. 위턱을 도끼처럼 내리찍어 사냥했다는 가설이 있어요.'
  },
  kentrosaurus: {
    era: 'jurassic', name: '켄트로사우루스', diet: 'herb', body: 'kentro', color: 0xb08a4e, belly: 0xe8d6a8, stripe: 0x5e3e22,
    adult: 2.3, speed: 7.2, atk: 14, hp: 95,
    skill: { name: '가시 꼬리', type: 'tail', cd: 6 },
    tags: ['초식', '가시 갑옷', '꼬리 공격'],
    fact: '약 1억 5,200만 년 전 탄자니아(텐다구루) · 몸길이 약 4~4.5m · 앞쪽엔 작은 골판, 엉덩이부터 꼬리까지 긴 가시, 어깨에도 긴 가시 한 쌍.'
  },
  stegosaurus: {
    era: 'jurassic', name: '스테고사우루스', diet: 'herb', body: 'stego', color: 0x7f8f5a, belly: 0xd8d6aa, stripe: 0xb0583a,
    adult: 3.3, speed: 6.0, atk: 17, hp: 140,
    skill: { name: '꼬리 가시 휘두르기', type: 'tail', cd: 6 },
    tags: ['초식', '골판', '꼬리 공격'],
    fact: '약 1억 5,500만~1억 4,500만 년 전 북미(모리슨층) · 몸길이 약 7~9m · 등에 엇갈린 두 줄 골판, 꼬리 끝에 가시 4개(타고마이저).'
  },
  brachiosaurus: {
    era: 'jurassic', name: '브라키오사우루스', diet: 'herb', body: 'brachio', color: 0x8b8f86, belly: 0xd6d4c8, stripe: 0x5a5e58,
    adult: 4.8, speed: 5.6, atk: 20, hp: 210,
    skill: { name: '거대한 밀치기', type: 'charge', cd: 7 },
    tags: ['초식', '가장 큼', '키다리'],
    fact: '약 1억 5,400만~1억 5,300만 년 전 북미 · 몸길이 약 18~22m · 앞다리가 뒷다리보다 길어 기린처럼 목을 높이 들었어요.'
  },
  // ---------------- 백악기 중기 ----------------
  psittacosaurus: {
    era: 'midK', name: '프시타코사우루스', diet: 'herb', body: 'psittaco', color: 0xa3864e, belly: 0xebdcb2, stripe: 0x5c4426,
    adult: 1.15, speed: 10.0, atk: 5, hp: 42,
    skill: { name: '덤불 숨기', type: 'hide', cd: 9 },
    tags: ['초식', '작고 빠름', '숨기'],
    fact: '약 1억 2,300만~1억 년 전 아시아 · 몸길이 약 2m · 앵무새 같은 부리, 볼에 뿔, 꼬리 위에 긴 털 같은 강모가 남은 화석이 있어요.'
  },
  ouranosaurus: {
    era: 'midK', name: '오우라노사우루스', diet: 'herb', body: 'ourano', color: 0xb4874c, belly: 0xeedcb0, stripe: 0xa84c34,
    adult: 2.9, speed: 7.4, atk: 14, hp: 115,
    skill: { name: '엄지 가시 돌진', type: 'charge', cd: 7 },
    tags: ['초식', '등 돛', '돌진'],
    fact: '약 1억 1천만 년 전쯤(백악기 전기 앱트절) 니제르 · 몸길이 약 7~8m · 등의 높은 돛(혹이라는 가설도)과 엄지의 뾰족한 가시.'
  },
  sauropelta: {
    era: 'midK', name: '사우로펠타', diet: 'herb', body: 'sauropelta', color: 0x7c6a52, belly: 0xc8b896, stripe: 0x4a3c2c,
    adult: 2.6, speed: 5.8, atk: 15, hp: 150,
    skill: { name: '웅크리기', type: 'armor', cd: 9 },
    tags: ['초식', '갑옷', '가시 반사'],
    fact: '약 1억 1,500만~1억 800만 년 전 북미 · 몸길이 약 5~6m · 꼬리 곤봉은 없지만 목·어깨에 긴 가시, 등 전체가 뼈 갑옷.'
  },
  argentinosaurus: {
    era: 'midK', name: '아르헨티노사우루스', diet: 'herb', body: 'argentino', color: 0x9a8a74, belly: 0xdcd2c0, stripe: 0x6a5a48,
    adult: 5.3, speed: 5.2, atk: 22, hp: 240,
    skill: { name: '거대한 밀치기', type: 'charge', cd: 7 },
    tags: ['초식', '역대 최대급', '돌진'],
    fact: '약 9,700만~9,400만 년 전 아르헨티나 · 몸길이 약 30~35m · 가장 큰 육상동물 후보. 뼈가 일부만 발견돼 크기는 추정이에요.'
  },
  spinosaurus: {
    era: 'midK', name: '스피노사우루스', diet: 'carn', body: 'theropod',
    shape: TH({ body: [0.64, 0.7, 1.45], hip: 0.82, neck: { len: 0.8, angles: [0.45, 0.8, 1.15], r: 0.18 }, skull: { len: 1.05, h: 0.26, w: 0.22, taper: 0.42 }, eye: 0.9, nostril: true, teeth: 9, sail: 0.9, tailFin: true, arm: 0.55, armT: 0.1, hand: 0.32, clawLen: 0.26, leg: 0.76, legT: 0.17, foot: 1.4, tail: 2.8, tailR: 0.3 }),
    color: 0x7a6650, belly: 0xd8c8a8, stripe: 0xb04a2e,
    adult: 4.2, speed: 7.6, atk: 18, hp: 120,
    skill: { name: '물가 기습', type: 'lunge', cd: 7 },
    tags: ['육식', '등 돛', '물에서 빠름'],
    fact: '약 1억~9,400만 년 전 북아프리카 · 몸길이 약 14m · 거대한 등 돛과 악어 같은 주둥이로 물고기를 잡았어요. 2020년 연구가 넓은 지느러미 꼬리를 보고했지만, 얼마나 헤엄쳤는지는 아직 논쟁 중.',
    swimmer: true
  },
  giganotosaurus: {
    era: 'midK', name: '기가노토사우루스', diet: 'carn', body: 'theropod',
    shape: TH({ body: [0.8, 0.85, 1.4], hip: 1.25, neck: { len: 0.55, angles: [0.65, 1.0], r: 0.25 }, skull: { len: 1.05, h: 0.42, w: 0.34, taper: 0.6 }, eye: 0.9, browRidge: true, teeth: 8, arm: 0.45, armT: 0.1, hand: 0.3, clawLen: 0.2, leg: 1.25, legT: 0.2, foot: 1.35, tail: 2.6, tailR: 0.38 }),
    color: 0x8a7a5a, belly: 0xe0d4b4, stripe: 0x4a3e2a,
    adult: 4.0, speed: 8.4, atk: 20, hp: 130,
    skill: { name: '추격 질주', type: 'sprint', cd: 7 },
    tags: ['육식', '거대 사냥꾼', '질주'],
    fact: '약 9,960만~9,700만 년 전 아르헨티나 · 몸길이 약 12~13m · 티라노사우루스와 맞먹는 크기. 거대한 용각류를 사냥했다는 가설이 있어요.'
  },
  carcharodontosaurus: {
    era: 'midK', name: '카르카로돈토사우루스', diet: 'carn', body: 'theropod',
    shape: TH({ body: [0.82, 0.86, 1.35], hip: 1.25, neck: { len: 0.55, angles: [0.7, 1.05], r: 0.26 }, skull: { len: 1.0, h: 0.46, w: 0.36, taper: 0.62 }, eye: 0.9, hornlets: 0.07, teeth: 9, arm: 0.42, armT: 0.1, hand: 0.28, clawLen: 0.18, leg: 1.25, legT: 0.2, foot: 1.35, tail: 2.5, tailR: 0.38 }),
    color: 0xa08a64, belly: 0xece0c0, stripe: 0x6a4e30,
    adult: 3.9, speed: 8.0, atk: 21, hp: 135,
    skill: { name: '포효', type: 'roar', cd: 8 },
    tags: ['육식', '상어 이빨', '얼리기'],
    fact: '약 1억~9,400만 년 전 북아프리카 · 몸길이 약 12m · 이름 뜻은 "상어 이빨 도마뱀". 톱니가 난 칼날 같은 이빨.'
  },
  // ---------------- 백악기 후기 ----------------
  velociraptor: {
    era: 'lateK', name: '벨로키랍토르', diet: 'carn', body: 'theropod',
    shape: TH({ body: [0.5, 0.55, 1.0], hip: 0.95, neck: { len: 0.6, angles: [0.35, 0.8, 1.2], r: 0.14 }, skull: { len: 0.62, h: 0.24, w: 0.2, taper: 0.55 }, eye: 1.1, arm: 0.55, armT: 0.06, hand: 0.25, clawLen: 0.15, feathers: true, sickle: true, leg: 1.0, legT: 0.1, foot: 1.2, tail: 2.2, tailR: 0.17 }),
    color: 0x8a6a48, belly: 0xe6d2b0, stripe: 0x4e3420,
    adult: 1.7, speed: 10.4, atk: 9, hp: 52,
    skill: { name: '갈고리 발톱 덮치기', type: 'lunge', cd: 6 },
    tags: ['육식', '영화 크기', '덮치기'],
    fact: '실제로는 약 7,500만~7,100만 년 전 몽골 · 몸길이 약 2m · 칠면조만 했고 깃털이 있었어요. 이 게임에선 영화처럼 사람보다 크게 만들었어요. 발에 큰 갈고리 발톱.'
  },
  pachycephalosaurus: {
    era: 'lateK', name: '파키케팔로사우루스', diet: 'herb', body: 'pachy', color: 0x8c7a62, belly: 0xe0d2b6, stripe: 0x4c3e2c,
    adult: 1.7, speed: 8.6, atk: 10, hp: 70,
    skill: { name: '박치기', type: 'charge', cd: 6 },
    tags: ['초식', '돌머리', '박치기'],
    fact: '약 6,800만~6,600만 년 전 북미 · 몸길이 약 4.5m · 두께 약 25cm의 둥근 머리뼈. 실제로 박치기를 했는지는 아직 논쟁 중이에요.'
  },
  edmontosaurus: {
    era: 'lateK', name: '에드몬토사우루스', diet: 'herb', body: 'edmonto', color: 0x6f8a7a, belly: 0xd4ddd0, stripe: 0x3e5448,
    adult: 3.4, speed: 7.6, atk: 12, hp: 120,
    skill: { name: '무리 질주', type: 'sprint', cd: 6 },
    tags: ['초식', '오리 부리', '질주'],
    fact: '약 7,300만~6,600만 년 전 북미 · 몸길이 약 9~12m · 오리 부리 공룡. 2013년 미라 화석에서 머리 위 닭벼슬 같은 살 볏이 발견됐어요.'
  },
  styracosaurus: {
    era: 'lateK', name: '스티라코사우루스', diet: 'herb', body: 'styraco', color: 0xa26a42, belly: 0xe8d0ac, stripe: 0x5a3420,
    adult: 2.9, speed: 7.0, atk: 16, hp: 120,
    skill: { name: '프릴 위협', type: 'roar', cd: 8 },
    tags: ['초식', '가시 프릴', '얼리기'],
    fact: '약 7,550만~7,500만 년 전 캐나다 앨버타 · 몸길이 약 5.5m · 긴 코뿔 하나와 프릴 가장자리의 긴 가시 4~6개.'
  },
  ankylosaurus: {
    era: 'lateK', name: '안킬로사우루스', diet: 'herb', body: 'ankylo', color: 0x7a7458, belly: 0xc8c2a2, stripe: 0x48442e,
    adult: 3.0, speed: 5.6, atk: 20, hp: 170,
    skill: { name: '꼬리 곤봉', type: 'tail', cd: 6 },
    tags: ['초식', '갑옷', '꼬리 곤봉'],
    fact: '약 6,800만~6,600만 년 전 북미 · 몸길이 약 6~8m · 온몸을 덮은 뼈 갑옷과 꼬리 끝의 무거운 뼈 곤봉.'
  },
  triceratops: {
    era: 'lateK', name: '트리케라톱스', diet: 'herb', body: 'trice', color: 0x6e7a52, belly: 0xd2d4ae, stripe: 0x9a5a34,
    adult: 3.6, speed: 6.6, atk: 19, hp: 160,
    skill: { name: '뿔 돌진', type: 'charge', cd: 7 },
    tags: ['초식', '세 뿔', '돌진'],
    fact: '약 6,800만~6,600만 년 전 북미 · 몸길이 약 8~9m · 눈 위 긴 뿔 두 개, 짧은 코뿔 하나, 구멍 없는 단단한 프릴.'
  },
  tyrannosaurus: {
    era: 'lateK', name: '티라노사우루스', diet: 'carn', body: 'theropod',
    shape: TH({ body: [0.95, 1.0, 1.4], hip: 1.3, neck: { len: 0.45, angles: [0.75, 1.05], r: 0.32 }, skull: { len: 1.05, h: 0.55, w: 0.5, taper: 0.58 }, eye: 0.9, eyeFwd: true, browRidge: true, teeth: 8, arm: 0.3, armT: 0.07, hand: 0.14, claws: 2, clawLen: 0.1, leg: 1.35, legT: 0.22, foot: 1.35, tail: 2.5, tailR: 0.42 }),
    color: 0x6e5a44, belly: 0xd8c4a4, stripe: 0x3e2e22,
    adult: 4.3, speed: 7.8, atk: 24, hp: 150,
    skill: { name: '뼈 부수기 물기', type: 'lunge', cd: 7 },
    tags: ['육식', '최강의 턱', '덥석물기'],
    fact: '약 6,800만~6,600만 년 전 북미 · 몸길이 약 12m · 무는 힘이 육상동물 최강급(추정 3.5만~5.7만 N). 앞을 향한 눈으로 거리를 잘 쟀어요.'
  }
});
// 쥐라기 보스 (선택 불가)
const BOSS = {
  indominus: {
    era: 'jurassic', name: '인도미누스 렉스', diet: 'carn', body: 'theropod', boss: true,
    shape: TH({ body: [0.95, 1.0, 1.4], hip: 1.0, neck: { len: 0.45, angles: [0.8, 1.1], r: 0.3 }, skull: { len: 1.0, h: 0.48, w: 0.42, taper: 0.7 }, eye: 0.9, hornlets: 0.14, backSpikes: true, teeth: 8, arm: 0.62, armT: 0.12, hand: 0.4, claws: 4, clawLen: 0.3, leg: 1.0, legT: 0.2, foot: 1.3, tail: 2.4, tailR: 0.4 }),
    color: 0xe6e2d6, belly: 0xf6f4ee, stripe: 0x8e8c84,
    adult: 5.6, speed: 8.6, atk: 30, hp: 700,
    skill: { name: '포효', type: 'roar', cd: 9 },
    fact: '영화 「쥬라기 월드」(2015)의 유전자 조작 가상 공룡이에요. 실제로 존재한 적은 없고, 이 게임에서만 쥐라기 보스로 나와요.'
  }
};
Object.assign(SPECIES, BOSS);

// 시대 맵. 순서대로 해금 (앞 시대에서 서로 다른 3종 Lv.10 달성)
const ERAS = [
  { key: 'triassic', name: '트라이아스기', time: '약 2억 3천만~2억 100만 년 전', sub: '공룡의 시대가 막 시작됐어요.',
    pool: ['eoraptor', 'coelophysis', 'coelophysis', 'herrerasaurus', 'herrerasaurus', 'plateosaurus', 'liliensternus', 'thecodontosaurus', 'thecodontosaurus', 'riojasaurus'],
    prey: 'rhyncho', ptero: 'eudimorphodon', pick: 'coelophysis',
    look: { sky: 0xe7c48e, ground: 0xb59a62, patches: [0x9c8a4f, 0x8f9a55, 0xc2a46a, 0x7f8f4a, 0xa8925a], rock: [0x7d6a52, 0x8e7a5c, 0x6b5a45], shore: 0x8a7a4a, water: 0x3f8fa6, ponds: [{ x: 26, z: -18, r: 12 }, { x: -30, z: 28, r: 9 }, { x: -12, z: -44, r: 7 }], big: 'conifer', small: 'cycad', leaf: [0x3f6b3a, 0x4a7a3f, 0x355e33], fern: [0x6fae45, 0x5c9a3a, 0x86bf55] },
    trees: { cycad: '소철', conifer: '큰 나무' } },
  { key: 'jurassic', name: '쥐라기', time: '약 2억 100만~1억 4,500만 년 전', sub: '거대한 용각류와 골판 공룡의 시대. 그런데 숲 어딘가에 정체불명의 하얀 괴물이…',
    pool: ['compsognathus', 'compsognathus', 'dryosaurus', 'dryosaurus', 'dilophosaurus', 'dilophosaurus', 'allosaurus', 'kentrosaurus', 'kentrosaurus', 'stegosaurus', 'brachiosaurus'],
    prey: 'eilenodon', ptero: 'rhamphorhynchus', pick: 'dilophosaurus', boss: 'indominus',
    look: { sky: 0xcfe0c0, ground: 0x8a9a5a, patches: [0x7a8c4a, 0x6e8444, 0x9aa462, 0x86965a, 0x748a4c], rock: [0x7a7466, 0x8a8474, 0x66625a], shore: 0x7e7a52, water: 0x3a8a9a, ponds: [{ x: 24, z: -20, r: 11 }, { x: -32, z: 24, r: 10 }, { x: 8, z: 40, r: 7 }], big: 'conifer', small: 'cycad', leaf: [0x2f5e34, 0x3a6c3a, 0x2a5430], fern: [0x5fa043, 0x4e8c38, 0x78b450] },
    trees: { cycad: '소철', conifer: '침엽수' } },
  { key: 'midK', name: '백악기 중기', time: '약 1억 1,500만~9,400만 년 전', sub: '강과 늪이 많은 시대. 지구 역사상 가장 거대한 육식공룡과 초식공룡이 살았어요.',
    pool: ['psittacosaurus', 'psittacosaurus', 'psittacosaurus', 'ouranosaurus', 'ouranosaurus', 'sauropelta', 'sauropelta', 'spinosaurus', 'giganotosaurus', 'carcharodontosaurus', 'argentinosaurus'],
    prey: 'araripesuchus', ptero: 'alanqa', pick: 'spinosaurus',
    look: { sky: 0xd8e2c8, ground: 0x9c9a62, patches: [0x8c925a, 0x7c8a4e, 0xb0a670, 0x96a060, 0x6e8048], rock: [0x8a7a62, 0x9a8a70, 0x76664e], shore: 0x8c8458, water: 0x3c8c90, ponds: [{ x: 22, z: -14, r: 15 }, { x: -30, z: 26, r: 12 }, { x: -6, z: -42, r: 9 }, { x: 40, z: 30, r: 8 }], big: 'conifer', small: 'cycad', leaf: [0x3c6a38, 0x467640, 0x325c32], fern: [0x68a846, 0x58963c, 0x80b856] },
    trees: { cycad: '소철', conifer: '큰 나무' } },
  { key: 'lateK', name: '백악기 후기', time: '약 7,500만~6,600만 년 전', sub: '꽃 피는 식물이 퍼진 공룡 시대의 마지막. 티라노사우루스의 땅이에요.',
    pool: ['velociraptor', 'velociraptor', 'pachycephalosaurus', 'pachycephalosaurus', 'edmontosaurus', 'edmontosaurus', 'styracosaurus', 'ankylosaurus', 'triceratops', 'triceratops', 'tyrannosaurus'],
    prey: 'didelphodon', ptero: 'quetzalcoatlus', pick: 'triceratops',
    look: { sky: 0xd6e6d2, ground: 0x8e9e5c, patches: [0x7e9050, 0x9aa866, 0x6e8446, 0xa4a46a, 0x88985a], rock: [0x7e7668, 0x8e8676, 0x6a6458], shore: 0x7c7a54, water: 0x3a86a0, ponds: [{ x: 28, z: -16, r: 11 }, { x: -28, z: 30, r: 9 }, { x: -16, z: -40, r: 8 }], big: 'broadleaf', small: 'palm', leaf: [0x4a7e3a, 0x5a8c42, 0x3e6e34], fern: [0x6aaa48, 0x5a9a3c, 0x84bc58], flowers: true },
    trees: { cycad: '야자류', conifer: '활엽수' } }
];
const ERA = Object.fromEntries(ERAS.map(e => [e.key, e]));
const PTEROS = {
  eudimorphodon: { name: '에우디모르포돈', color: 0x8a6a4a, wing: 0xb98c5e, scale: 1.4, hp: 30, longTail: true },
  rhamphorhynchus: { name: '람포린쿠스', color: 0x6a5a4a, wing: 0xa88c6a, scale: 1.5, hp: 32, longTail: true, vane: true },
  alanqa: { name: '알랑카', color: 0x8a7a6a, wing: 0xc8ae8a, scale: 2.0, hp: 42, neck: true },
  quetzalcoatlus: { name: '케찰코아틀루스', color: 0x7a7066, wing: 0xb8a48c, scale: 2.8, hp: 60, neck: true, crest: true }
};

const PREY = {
  rhyncho: { name: '린코사우루스', diet: 'herb', body: 'rhyncho', color: 0x8c7a5b, belly: 0xc8b48a, speed: 5.2, hp: 22 },
  eilenodon: { name: '에일레노돈', diet: 'herb', body: 'rhyncho', snout: 'beak', color: 0x6e7a52, belly: 0xb8bc8e, speed: 5.0, hp: 20 },   // 쥐라기 후기 모리슨층의 옛도마뱀(훼두류)
  araripesuchus: { name: '아라리페수쿠스', diet: 'carn', body: 'rhyncho', snout: 'croc', color: 0x6a6a4e, belly: 0xbab48e, speed: 5.4, hp: 22 }, // 켐켐층의 1m짜리 작은 악어류
  didelphodon: { name: '디델포돈', diet: 'omni', body: 'rhyncho', snout: 'mammal', color: 0x5a4636, belly: 0x9a8268, speed: 5.6, hp: 22 }, // 헬크릭층의 오소리만 한 포유류
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

// 현재 시대와 해금 상태 (이 기기에 저장). 주소 끝에 ?all=1 을 붙이면 모든 시대가 열림 (테스트용)
let curEra = ERAS[0];
let unlockedIdx = 0;
try { unlockedIdx = Math.min(ERAS.length - 1, parseInt(localStorage.getItem('dino_unlock') || '0', 10) || 0); } catch (_) {}
try { if (/[?&]all=1/.test(location.search)) unlockedIdx = ERAS.length - 1; } catch (_) {}
const eraIdx = e => ERAS.indexOf(e);
// 다음 시대 해금 조건: 한 시대에서 서로 다른 공룡 UNLOCK_NEED종을 Lv.10(성체)까지 키우기
const UNLOCK_NEED = 3;
let adultsByEra = {}; // { triassic: ['coelophysis', ...], ... } — 이 기기에 저장
try { adultsByEra = JSON.parse(localStorage.getItem('dino_adults') || '{}') || {}; } catch (_) {}
const adultsOf = key => adultsByEra[key] || [];
