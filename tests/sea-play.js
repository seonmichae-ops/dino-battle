// 바다 플레이 점검: 스피노 성체 → 바다 해금, 입장 장면, 옆 카메라, 숨쉬기, 바다 메뉴
const { chromium } = require('playwright-core'); const path=require('path');
(async()=>{
 const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--no-sandbox']});
 const pg=await b.newPage({viewport:{width:1100,height:700}}); const errs=[]; pg.on('pageerror',e=>errs.push(e.message+' '+(e.stack||'').split('\n')[1]));
 await pg.route('**/*',r=>r.request().url().startsWith('file:')?r.continue():r.abort());
 await pg.goto('file://'+path.resolve(__dirname,'../index.html')); await pg.waitForTimeout(600);
 const R={};
 R.sea0=await pg.evaluate(()=>[...document.querySelectorAll('#seaTabs .eraTab')].map(t=>t.className.includes('locked')));
 await pg.click('#seaTabs .eraTab:nth-child(1)'); R.note0=await pg.textContent('#eraNote');
 // 백악기 중기를 열어 두고 스피노 성체 달성
 await pg.evaluate(()=>{unlockedIdx=2; const d=window.__dino; d.setEra('midK'); d.setSel('spinosaurus'); d.startGame(); d.player.invT=999; d.gain(d.player,5000);});
 await pg.waitForTimeout(2600); R.warn=await pg.textContent('#warn'); R.seaUnlock=await pg.evaluate(()=>localStorage.getItem('dino_unlock_sea'));
 await pg.evaluate(()=>window.__dino.skip()); await pg.waitForTimeout(800); await pg.click('#menuBtn'); await pg.waitForTimeout(300);
 R.sea1=await pg.evaluate(()=>[...document.querySelectorAll('#seaTabs .eraTab')].map(t=>t.className.includes('locked')));
 await pg.click('#seaTabs .eraTab:nth-child(1)'); await pg.waitForTimeout(800);
 R.title=await pg.textContent('#menuTitle'); R.cards=await pg.evaluate(()=>[...document.querySelectorAll('.card .cn')].map(e=>e.textContent).join(','));
 await pg.screenshot({path:path.join(__dirname,'sea_menu.png')});
 // 입장 장면
 await pg.evaluate(()=>{window.__dino.setSel('placodus'); window.__dino.startGame();});
 await pg.waitForTimeout(1400); R.introState=await pg.evaluate(()=>window.__dino.state); await pg.screenshot({path:path.join(__dirname,'sea_intro1.png')});
 await pg.waitForTimeout(2600); await pg.screenshot({path:path.join(__dirname,'sea_intro2.png')});
 await pg.waitForTimeout(4500); R.afterIntro=await pg.evaluate(()=>({st:window.__dino.state, sp:window.__dino.player&&window.__dino.player.sp.name, air:!document.getElementById('airRow').classList.contains('hidden')}));
 await pg.waitForTimeout(1500); await pg.screenshot({path:path.join(__dirname,'sea_play.png')});
 // 숨쉬기: 깊은 곳에 두고 숨을 0으로
 R.breath=await pg.evaluate(()=>{const d=window.__dino,p=d.player; p.invT=0; p.pos.z=10; p.air=0.02; const hp0=p.hp; d.updateBreath(p,0.1); d.updateBreath(p,1.2); const lost=hp0-p.hp; p.pos.z=-SEA_H+1; d.updateBreath(p,1); return {lost:+lost.toFixed(1), refill:+p.air.toFixed(2), txt:document.getElementById('airTxt').textContent};});
 // 봇 생물 종류
 R.bots=await pg.evaluate(()=>[...new Set(window.__dino.world.creatures.filter(c=>c.kind==='dino').map(c=>c.sp.name))].join(','));
 console.log(JSON.stringify(R,null,1),'\nerrors',errs.length?errs.slice(0,6):'none'); await b.close();})();
