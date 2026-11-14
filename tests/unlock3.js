// 해금 조건: 서로 다른 3종 Lv.10
const { chromium } = require('playwright-core'); const fs=require('fs'), path=require('path');
(async()=>{
 const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--no-sandbox']});
 const pg=await b.newPage({viewport:{width:1100,height:700}}); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
 await pg.route('**/*',r=>r.request().url().startsWith('file:')?r.continue():r.abort());
 await pg.goto('file://'+path.resolve(__dirname,'../index.html')); await pg.waitForTimeout(500);
 const out=[];
 for (const sp of ['coelophysis','coelophysis','plateosaurus','herrerasaurus']) {
   await pg.evaluate(sp=>{const d=window.__dino; d.setSel(sp); d.startGame(); d.player.invT=999; d.gain(d.player,5000);},sp);
   await pg.waitForTimeout(2600);
   out.push(sp+' → '+(await pg.textContent('#warn')).trim()+' | unlock='+(await pg.evaluate(()=>localStorage.getItem('dino_unlock'))));
   await pg.evaluate(()=>window.__dino.skip()); await pg.waitForTimeout(800); await pg.click('#menuBtn'); await pg.waitForTimeout(200);
   if (sp==='plateosaurus'===false && out.length===1) { await pg.click('.eraTab:nth-child(2)'); out.push('  잠긴 탭: '+await pg.textContent('#eraNote')); }
 }
 out.push('메뉴: '+await pg.textContent('#eraNote'));
 out.push('별: '+await pg.evaluate(()=>[...document.querySelectorAll('.card .cn')].filter(e=>e.textContent.includes('⭐')).map(e=>e.textContent).join(', ')));
 console.log(out.join('\n'),'\nerrors',errs.length?errs:'none'); await b.close();})();
