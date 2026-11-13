// 시대별 공룡 모델 한 줄로 세워 찍기: node tests/showcase.js jurassic [side|front]
const { chromium } = require('playwright-core'); const fs=require('fs'), path=require('path');
(async()=>{
 const era=process.argv[2]||'jurassic', view=process.argv[3]||'side';
 const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--no-sandbox']});
 const pg=await b.newPage({viewport:{width:1400,height:700}}); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
 const three=fs.readFileSync(path.join(__dirname,'../node_modules/three/build/three.min.js'));
 await pg.route('**/*',r=>{const u=r.request().url(); if(u.includes('three.min.js'))return r.fulfill({body:three,contentType:'application/javascript'}); if(u.startsWith('file:'))return r.continue(); return r.abort();});
 await pg.goto('file://'+path.resolve(__dirname,'../index.html')); await pg.waitForTimeout(500);
 const info=await pg.evaluate(([era,view])=>{const d=window.__dino; d.setEra(era); d.startGame(); d.freeze();
   document.getElementById('hud').classList.add('hidden');
   for (const c of d.world.creatures) c.holder.visible=false;
   for (const o of d.world.obstacles) o.grp.visible=false; for (const f of d.world.ferns) f.mesh.visible=false; for (const p of d.world.pteros){p.g.visible=false;p.sh.visible=false;}
   const keys=Object.keys(SPECIES).filter(k=>SPECIES[k].era===era);
   let x=0; const out=[];
   for (const k of keys){ const sp=SPECIES[k]; const w=sp.adult*3.2; x+=w/2; const c=d.makeCreature('dino',k,{level:10,pos:new THREE.Vector3(x,0,0),name:sp.name}); c.heading=view==='side'?Math.PI/2:0.6; c.vel.set(0,0,0); c.ring.visible=false; c.tag.visible=true; out.push(k); x+=w/2+1.5; }
   const cx=x/2; window.__cam={pos:[cx, x*0.18, x*0.62], look:[cx,2.5,0]}; return out;},[era,view]);
 await pg.waitForTimeout(1500);
 await pg.screenshot({path:path.join(__dirname,`show_${era}_${view}.png`)});
 console.log(info.join(','),'errors',errs.length?errs.slice(0,5):'none'); await b.close();})();
