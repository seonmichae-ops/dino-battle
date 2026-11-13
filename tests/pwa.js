// 설치형 웹앱 점검: 로컬 서버로 열어 매니페스트·설치 가능 여부·오프라인 실행 확인
const { chromium } = require('playwright-core'); const path=require('path'); const { spawn }=require('child_process');
(async()=>{
 const srv=spawn('python3',['-m','http.server','8765','--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..'),stdio:'ignore'});
 await new Promise(r=>setTimeout(r,800));
 const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--no-sandbox']});
 const ctx=await b.newContext({viewport:{width:900,height:600}}); const pg=await ctx.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
 await pg.route(/fonts\.(googleapis|gstatic)\.com/,r=>r.abort());
 await pg.goto('http://localhost:8765/'); await pg.waitForTimeout(1500);
 const cdp=await ctx.newCDPSession(pg);
 const man=await cdp.send('Page.getAppManifest'); const inst=await cdp.send('Page.getInstallabilityErrors');
 const sw=await pg.evaluate(async()=>{const r=await navigator.serviceWorker.ready; await new Promise(r=>setTimeout(r,1500)); const ks=await caches.keys(); const c=await caches.open(ks.find(k=>/^dino-v\d+$/.test(k))); return {scope:r.scope, caches:ks, files:(await c.keys()).length};});
 await ctx.setOffline(true);
 await pg.reload(); await pg.waitForTimeout(1500);
 const off=await pg.evaluate(()=>({title:document.title, three:typeof THREE, cards:document.querySelectorAll('.card').length, h1:document.getElementById('menuTitle').textContent}));
 console.log(JSON.stringify({manifestErrors:man.errors, installErrors:inst.installabilityErrors, sw, offline:off},null,1),'errors',errs.length?errs:'none');
 await b.close(); srv.kill();})();
