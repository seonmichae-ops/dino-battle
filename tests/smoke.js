// 사용법: node tests/smoke.js [species] [eraKey]
const { chromium } = require('playwright-core'); const fs=require('fs'), path=require('path');
(async()=>{
 const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--no-sandbox']});
 const pg=await b.newPage({viewport:{width:1100,height:700}}); const errs=[]; pg.on('pageerror',e=>errs.push(e.message)); pg.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
 const three=fs.readFileSync(path.join(__dirname,'../node_modules/three/build/three.min.js'));
 await pg.route('**/*',r=>{const u=r.request().url(); if(u.includes('three.min.js'))return r.fulfill({body:three,contentType:'application/javascript'}); if(u.startsWith('file:'))return r.continue(); return r.abort();});
 await pg.goto('file://'+path.resolve(__dirname,'../index.html')); await pg.waitForTimeout(600);
 const sp=process.argv[2]||'coelophysis', era=process.argv[3];
 const r=await pg.evaluate(([sp,era])=>{const d=window.__dino; if(era&&d.setEra)d.setEra(era); d.setSel(sp); d.startGame(); return {n:d.world.creatures.length, sp:d.player.sp.name};},[sp,era]);
 await pg.waitForTimeout(2500);
 const r2=await pg.evaluate(()=>({alive:!window.__dino.player.dead, lv:window.__dino.player.level}));
 await pg.screenshot({path:path.join(__dirname,'smoke.png')});
 console.log(JSON.stringify(r),JSON.stringify(r2),'errors',errs.length?errs.slice(0,5):'none'); await b.close();})();
