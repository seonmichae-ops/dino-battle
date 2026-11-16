// 기본 속도 측정: 오른쪽 방향키를 2초 누르고 이동 거리
const { chromium } = require('playwright-core'); const path=require('path');
(async()=>{
 const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--no-sandbox']});
 const pg=await b.newPage({viewport:{width:1000,height:650}}); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
 await pg.route('**/*',r=>r.request().url().startsWith('file:')?r.continue():r.abort());
 await pg.goto('file://'+path.resolve(__dirname,'../index.html?all=1')); await pg.waitForTimeout(500);
 for (const [era,sp] of [['lateK','tyrannosaurus'],['seaJurassic','ophthalmosaurus']]) {
   await pg.evaluate(([e,s])=>{const d=window.__dino; d.setEra(e); d.setSel(s); window.__skipIntro=true; d.startGame(); d.player.invT=999; d.player.pos.set(0,0,0);},[era,sp]);
   await pg.waitForTimeout(300);
   const x0 = await pg.evaluate(()=>window.__dino.player.pos.x);
   await pg.keyboard.down('ArrowRight'); await pg.waitForTimeout(2000); await pg.keyboard.up('ArrowRight');
   const r = await pg.evaluate(()=>({x:window.__dino.player.pos.x, sp:window.__dino.player.sp.speed}));
   console.log(era, sp, 'base sp.speed', r.sp, 'moved/2s', (r.x-x0).toFixed(1), '→ /s', ((r.x-x0)/2).toFixed(2));
 }
 console.log('errors', errs.length?errs:'none'); await b.close();})();
