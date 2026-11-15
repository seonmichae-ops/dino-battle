// 실제 사용자 흐름: 바다 해금 상태로 새로 열고 메뉴에서 시작 버튼 클릭
const { chromium } = require('playwright-core'); const path=require('path');
(async()=>{
 const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--no-sandbox']});
 const ctx=await b.newContext({viewport:{width:1680,height:1330}}); const pg=await ctx.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message+' @ '+(e.stack||'').split('\n')[1])); pg.on('console',m=>{if(m.type()==='error')errs.push('console: '+m.text())});
 await pg.route('**/*',r=>r.request().url().startsWith('file:')?r.continue():r.abort());
 const url='file://'+path.resolve(__dirname,'../index.html');
 await pg.goto(url); await pg.evaluate(()=>localStorage.setItem('dino_unlock','3'));
 await pg.evaluate(()=>{localStorage.setItem('dino_unlock_sea','0');localStorage.setItem('dino_sea_intro','1');localStorage.setItem('dino_era','seaTriassic');localStorage.setItem('dino_name','선해인');});
 await pg.reload(); await pg.waitForTimeout(800);
 console.log('menu era', await pg.evaluate(()=>window.__dino.curEra.key));
 await pg.click('#startBtn').catch(e=>console.log('no #startBtn', e.message));
 await pg.waitForTimeout(3000);
 console.log('timer', await pg.evaluate(()=>document.querySelector('#timer')?.textContent), 'state', await pg.evaluate(()=>window.__dino.state));
 await pg.screenshot({path:path.resolve(__dirname,'sea-real.png')});
 console.log('errors', errs.length?errs:'none'); await b.close();})();
