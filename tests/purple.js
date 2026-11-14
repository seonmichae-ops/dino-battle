// 백악기 육지: 부스터 2.5배·2배, 보라색 상자 4배·4배, 출현 확률
const { chromium } = require('playwright-core'); const path=require('path');
(async()=>{
 const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--no-sandbox']});
 const pg=await b.newPage({viewport:{width:1100,height:700}}); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
 await pg.route('**/*',r=>r.request().url().startsWith('file:')?r.continue():r.abort());
 await pg.goto('file://'+path.resolve(__dirname,'../index.html?all=1')); await pg.waitForTimeout(500);
 const run = async (era, sp) => pg.evaluate(async ([era, sp]) => {
   const d=window.__dino; d.setEra(era); d.setSel(sp); d.startGame(); const P=d.player; P.invT=999;
   // 확률: 2000번 계획해서 평균 개수
   let n=0; for(let i=0;i<2000;i++){ d.planPurple(); n+=d.purpleAt.length; } d.planPurple();
   const slots = []; { for (let t=120; t+60+50<600; t+=120) slots.push(t+60); }
   // 피해 측정용 상대
   const foe = d.makeCreature('dino', sp, { pos: P.pos.clone().add(new THREE.Vector3(30,0,0)) }); foe.invT=0; foe.maxHp=foe.hp=1e6;
   const hit = () => { const h=foe.hp; d.damage ? d.damage(foe, 10, P) : null; return h-foe.hp; };
   const res = { era, avgPurple: +(n/2000).toFixed(2), candidateTimes: slots };
   // 일반 상자 → 부스터 강제
   d.makeChest(); d.world.chest.pos.copy(P.pos); d.openChest();
   res.normal = { type: d.ev && d.ev.type, spd: P.boostSpd, pow: P.boostPow, bar: document.getElementById('eventBar').textContent };
   // 보라 상자
   await new Promise(r=>setTimeout(r,1500));
   d.makeChest(true); res.purpleToast = document.getElementById('toast') ? document.getElementById('toast').textContent : '';
   d.openChest();
   res.purple = { type: d.ev.type, spd: P.boostSpd, pow: P.boostPow, boostT: +P.boostT.toFixed(1), bar: document.getElementById('eventBar').textContent };
   return res;
 }, [era, sp]);
 for (const [e,s] of [['lateK','tyrannosaurus'],['midK','spinosaurus'],['jurassic','allosaurus']]) console.log(JSON.stringify(await run(e,s)));
 // 실제 속도/피해 비교 (lateK)
 const m = await pg.evaluate(async () => {
   const d=window.__dino; d.setEra('lateK'); d.setSel('tyrannosaurus'); d.startGame(); const P=d.player; P.invT=999;
   const foe = d.makeCreature('dino','triceratops',{pos:P.pos.clone().add(new THREE.Vector3(0,0,40))}); foe.maxHp=foe.hp=1e6; foe.invT=0;
   const out={};
   const dmg = () => { const h=foe.hp; d.doBite(P, {type:'creature', obj:foe}); return +(h-foe.hp).toFixed(1); };
   P.biteCd=0; out.base = dmg();
   P.boostT=20; P.boostSpd=2.5; P.boostPow=2; out.boost = dmg();
   P.boostSpd=4; P.boostPow=4; out.superB = dmg();
   return out;
 });
 console.log('bite damage', JSON.stringify(m));
 console.log('errors', errs.length?errs:'none'); await b.close();})();
