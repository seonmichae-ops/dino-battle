// 폰 화면에서 키보드 안내 대신 터치 안내가 나오는지 확인
const { chromium } = require('playwright-core'); const fs=require('fs'), path=require('path');
(async()=>{
 const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--no-sandbox']});
 const three=fs.readFileSync(path.join(__dirname,'../node_modules/three/build/three.min.js'));
 for (const mobile of [true,false]) {
  const ctx=await b.newContext(mobile?{viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2}:{viewport:{width:1100,height:700}});
  const pg=await ctx.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  await pg.route('**/*',r=>{const u=r.request().url(); if(u.includes('three.min.js'))return r.fulfill({body:three,contentType:'application/javascript'}); if(u.startsWith('file:'))return r.continue(); return r.abort();});
  await pg.goto('file://'+path.resolve(__dirname,'../index.html')); await pg.waitForTimeout(500);
  const help=await pg.evaluate(()=>document.querySelector('.help').innerText.split('\n')[0]);
  await pg.evaluate(()=>{window.__dino.startGame();}); await pg.waitForTimeout(800);
  const r=await pg.evaluate(()=>({touch:document.body.classList.contains('touch'), legend:document.getElementById('legend').innerText, bite:document.getElementById('biteBtn').innerText.replace(/\n/g,' '), skill:document.getElementById('skillBtn').innerText.replace(/\n/g,' '), toast:document.getElementById('toast').innerText}));
  if (mobile) await pg.screenshot({path:path.join(__dirname,'touch_play.png')});
  console.log(mobile?'[폰]':'[PC]', JSON.stringify({help,...r}), errs.length?errs:''); await ctx.close();
 }
 await b.close();})();
