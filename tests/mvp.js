// MVP 기능 점검: 시대 해금, 보스, 모든 종 스킬, 웅크리기
const { chromium } = require('playwright-core'); const fs=require('fs'), path=require('path');
(async()=>{
 const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--no-sandbox']});
 const pg=await b.newPage({viewport:{width:1100,height:700}}); const errs=[]; pg.on('pageerror',e=>errs.push(e.message+' @'+(e.stack||'').split('\n')[1]));
 const three=fs.readFileSync(path.join(__dirname,'../node_modules/three/build/three.min.js'));
 await pg.route('**/*',r=>{const u=r.request().url(); if(u.includes('three.min.js'))return r.fulfill({body:three,contentType:'application/javascript'}); if(u.startsWith('file:'))return r.continue(); return r.abort();});
 await pg.goto('file://'+path.resolve(__dirname,'../index.html')); await pg.waitForTimeout(600);
 const R={};
 // 1) 처음엔 트라이아스기만 열림
 R.tabs0=await pg.evaluate(()=>[...document.querySelectorAll('.eraTab')].map(t=>t.className.includes('locked')));
 await pg.click('.eraTab:nth-child(2)'); R.lockNote=await pg.textContent('#eraNote');
 // 2) 트라이아스기에서 Lv.10 → 쥐라기 해금
 await pg.evaluate(()=>{const d=window.__dino; d.setSel('coelophysis'); d.startGame(); d.player.invT=999; d.gain(d.player, 5000);});
 await pg.waitForTimeout(2500);
 R.lv=await pg.evaluate(()=>window.__dino.player.level); R.unlock=await pg.evaluate(()=>localStorage.getItem('dino_unlock'));
 R.warn=await pg.textContent('#warn');
 await pg.evaluate(()=>window.__dino.skip()); await pg.waitForTimeout(1500);
 R.res=await pg.textContent('#resDetail');
 await pg.click('#menuBtn'); await pg.waitForTimeout(300);
 R.tabs1=await pg.evaluate(()=>[...document.querySelectorAll('.eraTab')].map(t=>t.className.includes('locked')));
 await pg.click('.eraTab:nth-child(2)'); await pg.waitForTimeout(500);
 R.title=await pg.textContent('#menuTitle'); R.cards=await pg.evaluate(()=>[...document.querySelectorAll('.card .cn')].map(e=>e.textContent));
 await pg.screenshot({path:path.join(__dirname,'mvp_menu.png')});
 // 3) 쥐라기 보스
 await pg.evaluate(()=>{const d=window.__dino; d.startGame(); d.player.invT=999; d.setElapsed(179.5);});
 await pg.waitForTimeout(2000);
 console.log(JSON.stringify(R)); R.dbg=await pg.evaluate(()=>({era:window.__dino.curEra.key,st:window.__dino.state,el:window.__el(),dead:window.__dino.player.dead})); console.log(R.dbg);
 R.boss=await pg.evaluate(()=>{const bs=window.__dino.world.creatures.find(c=>c.boss&&!c.dead); return bs?{name:bs.name,hp:Math.round(bs.hp),s:bs.s.toFixed(2)}:null;});
 R.inRank=await pg.evaluate(()=>[...document.querySelectorAll('#board .row')].some(r=>r.textContent.includes('인도미누스')));
 // 보스를 플레이어 앞에 두고 화면 찍기
 await pg.evaluate(()=>{const d=window.__dino,p=d.player,bs=d.world.creatures.find(c=>c.boss); bs.pos.set(p.pos.x+6,0,p.pos.z-6);});
 await pg.waitForTimeout(600); await pg.screenshot({path:path.join(__dirname,'mvp_boss.png')});
 // 4) 모든 종 스킬 실행
 R.skills=await pg.evaluate(()=>{const d=window.__dino, out={};
   for (const k of Object.keys(SPECIES)) { if (SPECIES[k].boss) continue; const c=d.makeCreature('dino',k,{level:10}); c.cds=[0,0,0]; out[k]=d.useSkill(c,0)?'ok':'fail'; }
   return Object.values(out).every(v=>v==='ok')?'all ok ('+Object.keys(out).length+')':out;});
 // 5) 웅크리기: 피해 감소 + 반사
 R.armor=await pg.evaluate(()=>{const d=window.__dino; d.setEra('midK'); d.setSel('sauropelta'); d.startGame(); const p=d.player; p.invT=0; p.spawnProt=0; p.cds=[0,0,0];
   d.useSkill(p,0); const a=d.makeCreature('dino','giganotosaurus',{level:10,pos:p.pos.clone()}); a.spawnProt=0; const hp0=p.hp, ahp0=a.hp;
   const t={type:'creature',obj:p}; d.doBite(a,t); return {target:p.armorT,maxHp:p.maxHp, lost:+(hp0-p.hp).toFixed(1), reflect:+(ahp0-a.hp).toFixed(1)};});
 await pg.waitForTimeout(1500);
 console.log(JSON.stringify(R,null,1)); console.log('errors',errs.length?errs.slice(0,6):'none'); await b.close();})();
