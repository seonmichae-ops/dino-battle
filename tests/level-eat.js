// 육식끼리 통째로 잡아먹기: 몸집 + 레벨이 더 높아야 함
const { chromium } = require('playwright-core'); const path=require('path');
(async()=>{
 const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--no-sandbox']});
 const pg=await b.newPage({viewport:{width:1000,height:650}}); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
 await pg.route('**/*',r=>r.request().url().startsWith('file:')?r.continue():r.abort());
 await pg.goto('file://'+path.resolve(__dirname,'../index.html?all=1')); await pg.waitForTimeout(500);
 const r = await pg.evaluate(async()=>{
   const d=window.__dino; d.setEra('lateK'); d.setSel('tyrannosaurus'); d.startGame(); const P=d.player; P.invT=999;
   const mk=(kind, sp, lv)=>d.makeCreature(kind, sp, {level: lv, pos: P.pos.clone().add(new THREE.Vector3(0,0,80))});
   const T=(sp,lv)=>mk('dino',sp,lv);
   const cases = [
     ['티라노 Lv2 → 랩터 Lv8', T('tyrannosaurus',2), T('velociraptor',8)],
     ['티라노 Lv8 → 랩터 Lv3', T('tyrannosaurus',8), T('velociraptor',3)],
     ['티라노 Lv5 → 랩터 Lv5', T('tyrannosaurus',5), T('velociraptor',5)],
     ['랩터 Lv9 → 티라노 Lv2 (작음)', T('velociraptor',9), T('tyrannosaurus',2)],
     ['티라노 Lv2 → 에드몬토 Lv8 (초식)', T('tyrannosaurus',2), T('edmontosaurus',4)],
   ];
   const out = cases.map(([n,a,o])=>({n, size:(a.s/o.s).toFixed(2), canSwallow: d.canSwallow(a,o)}));
   // 실제 물기: 플레이어 티라노 Lv2가 랩터 Lv8을 물면 통째로 삼키지 않고 피해만
   const rap = T('velociraptor',8); rap.invT=0; const hp0=rap.hp;
   P.level=2; d.gain(P,0);
   d.doBite(P,{type:'creature',obj:rap});
   out.push({n:'실제 물기 티라노Lv'+P.level+'→랩터Lv8', dead: rap.dead, hp:`${hp0.toFixed(0)}→${rap.hp.toFixed(0)}`});
   return out;
 });
 for (const x of r) console.log(JSON.stringify(x));
 console.log('errors', errs.length?errs:'none'); await b.close();})();
