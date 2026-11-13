// 앱 아이콘 후보 렌더링: node tools/render-icon.js stegosaurus 0x2e7d4f
const { chromium } = require('playwright-core'); const fs=require('fs'), path=require('path');
(async()=>{
 const k=process.argv[2]||'stegosaurus', bg=process.argv[3]||'0x2e7d4f', head=parseFloat(process.argv[4]||'1.95');
 const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--no-sandbox']});
 const pg=await b.newPage({viewport:{width:512,height:512}}); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
 await pg.route('**/*',r=>r.request().url().startsWith('file:')?r.continue():r.abort());
 await pg.goto('file://'+path.resolve(__dirname,'../index.html')); await pg.waitForTimeout(500);
 await pg.evaluate(([k,bg,head])=>{const d=window.__dino; d.setEra(SPECIES[k].era); d.startGame(); d.freeze();
   document.querySelectorAll('.overlay,#hud').forEach(e=>e.classList.add('hidden'));
   for (const c of d.world.creatures) c.holder.visible=false; for (const f of d.world.ferns) f.mesh.visible=false; for (const p of d.world.pteros){p.g.visible=false;p.sh.visible=false;}
   for (const o of d.world.obstacles){o.grp.visible=false; if(o.lock)o.lock.visible=false;}
   d.world.decor.visible=false; const sc=d.world.decor.parent; sc.background=new THREE.Color(+bg); sc.fog=null;
   const c=d.makeCreature('dino',k,{level:10,pos:new THREE.Vector3(0,0,0),name:''}); c.heading=head; c.vel.set(0,0,0); c.holder.remove(c.ring); c.holder.remove(c.tag); c.shadow.visible=false;
   const s=SPECIES[k].adult; window.__cam={pos:[s*5.6,s*2.6,s*4.4], look:[-s*0.15,s*0.95,-s*0.35]};},[k,bg,head]);
 await pg.waitForTimeout(1200);
 const out=path.join(__dirname,`icon_${k}.png`); await pg.screenshot({path:out});
 console.log(out, errs.length?errs:'ok'); await b.close();})();
