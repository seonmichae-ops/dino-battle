// 고기 조각 크기: Lv.1 / Lv.10 공룡을 쓰러뜨려 비교
const { chromium } = require('playwright-core'); const path=require('path');
(async()=>{
 const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--no-sandbox']});
 const pg=await b.newPage({viewport:{width:1100,height:700}}); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
 await pg.route('**/*',r=>r.request().url().startsWith('file:')?r.continue():r.abort());
 await pg.goto('file://'+path.resolve(__dirname,'../index.html?all=1')); await pg.waitForTimeout(500);
 const r = await pg.evaluate(async()=>{
   const d=window.__dino; d.setEra('lateK'); d.setSel('tyrannosaurus'); d.startGame(); const P=d.player; P.invT=999;
   d.gain(P, 120);
   for (const c of d.world.creatures) if (c!==P && c.pos.distanceTo(P.pos)<25) c.pos.x += 60;
   const mk=(sp,lv,dx,dz)=>{const c=d.makeCreature('dino',sp,{pos:P.pos.clone().add(new THREE.Vector3(dx,0,dz))}); if(lv>1) d.gain(c, [0,0,8,20,36,60,90,130,180,240][lv-1]||0); c.ai=null; return c;};
   const a=mk('velociraptor',1,-7,4), bb=mk('velociraptor',10,7,4);
   const before=d.world.chunks.length;
   for (const c of [a,bb]) { c.invT=0; c.hp=1; d.doBite(P,{type:'creature',obj:c}); }
   await new Promise(r=>setTimeout(r,900));
   return { lv:[a.level,bb.level], chunks: d.world.chunks.slice(before).map(c=>+c.sc.toFixed(2)) };
 });
 console.log(JSON.stringify(r));
 await pg.screenshot({path:path.resolve(__dirname,'chunks.png')});
 console.log('errors', errs.length?errs:'none'); await b.close();})();
