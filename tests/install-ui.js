// 브라우저별 설치 안내: 카카오톡 안 / 안드로이드 크롬 / 아이폰 사파리 / 아이폰 크롬
const { chromium } = require('playwright-core'); const path=require('path'); const { spawn }=require('child_process');
const UAS = {
 kakao_android: 'Mozilla/5.0 (Linux; Android 14; SM-S918N Build/UP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.0.0 Mobile Safari/537.36 KAKAOTALK/10.9.0',
 kakao_ios: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 KAKAOTALK 10.9.0',
 chrome_android: 'Mozilla/5.0 (Linux; Android 14; SM-S918N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
 safari_ios: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
 chrome_ios: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0 Mobile/15E148 Safari/604.1',
 samsung: 'Mozilla/5.0 (Linux; Android 14; SM-S918N) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0.0.0 Mobile Safari/537.36'
};
(async()=>{
 const srv=spawn('python3',['-m','http.server','8766','--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..'),stdio:'ignore'}); await new Promise(r=>setTimeout(r,800));
 const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--use-gl=swiftshader','--no-sandbox','--unsafely-treat-insecure-origin-as-secure=http://localhost:8766']});
 for (const [k,ua] of Object.entries(UAS)) {
  const ctx=await b.newContext({userAgent:ua,viewport:{width:390,height:800},isMobile:true,hasTouch:true}); const pg=await ctx.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  await pg.goto('http://localhost:8766/'); await pg.waitForTimeout(900);
  const r=await pg.evaluate(()=>{const v=id=>!document.getElementById(id).classList.contains('hidden'); return {bar:v('inAppBar')?document.getElementById('inAppMsg').textContent+' ['+document.getElementById('inAppBtn').textContent+']':'-', install:v('installBtn')};});
  let note='';
  if (r.install) { await pg.click('#installBtn'); note=await pg.textContent('#fsNote'); }
  else if (r.bar!=='-' && /ios/.test(k) && !/kakao/.test(k)) { await pg.click('#inAppBtn'); note=await pg.textContent('#fsNote'); }
  console.log(k.padEnd(15), JSON.stringify(r), note, errs.length?errs:''); await ctx.close();
 }
 await b.close(); srv.kill();})();
