// 공룡 몇 종을 3/4 앞모습으로 가까이: node tests/focus.js triceratops,styracosaurus,tyrannosaurus,edmontosaurus
const { chromium } = require('playwright-core'); const fs=require('fs'), path=require('path');
(async()=>{
 const keys=(process.argv[2]||'triceratops').split(','), out=process.argv[3]||'focus';
 const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--no-sandbox']});
 const pg=await b.newPage({viewport:{width:420,height:420}}); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
 const three=fs.readFileSync(path.join(__dirname,'../node_modules/three/build/three.min.js'));
 await pg.route('**/*',r=>{const u=r.request().url(); if(u.includes('three.min.js'))return r.fulfill({body:three,contentType:'application/javascript'}); if(u.startsWith('file:'))return r.continue(); return r.abort();});
 await pg.goto('file://'+path.resolve(__dirname,'../index.html')); await pg.waitForTimeout(500);
 const shots=[];
 for (const k of keys) {
   await pg.evaluate((k)=>{const d=window.__dino; d.setEra(SPECIES[k].era); d.startGame(); d.freeze();
     document.getElementById('hud').classList.add('hidden');
     for (const c of d.world.creatures) c.holder.visible=false;
     for (const o of d.world.obstacles) o.grp.visible=false; for (const f of d.world.ferns) f.mesh.visible=false; for (const p of d.world.pteros){p.g.visible=false;p.sh.visible=false;}
     const c=d.makeCreature('dino',k,{level:10,pos:new THREE.Vector3(20,0,20),name:k}); c.heading=0.75+1.1; c.vel.set(0,0,0); c.ring.visible=false; c.tag.visible=false;
     const s=SPECIES[k].adult; window.__cam={pos:[20+s*4.2,s*2.4,20+s*4.6], look:[20+s*0.6,s*1.0,20+s*0.6]};},k);
   await pg.waitForTimeout(900);
   shots.push(await pg.screenshot({clip:{x:0,y:0,width:420,height:420}}));
 }
 // 가로로 이어 붙이기
 const html='<body style="margin:0;display:flex">'+shots.map(b=>`<img src="data:image/png;base64,${b.toString('base64')}" width=420>`).join('')+'</body>';
 const p2=await b.newPage({viewport:{width:420*shots.length,height:420}}); await p2.setContent(html); await p2.waitForTimeout(200);
 await p2.screenshot({path:path.join(__dirname,out+'.png')});
 console.log('errors',errs.length?errs.slice(0,5):'none'); await b.close();})();
