// 바다 생물 옆모습 쇼케이스: node tests/sea-show.js seaTriassic
const { chromium } = require('playwright-core'); const path=require('path');
(async()=>{
 const era=process.argv[2]||'seaTriassic';
 const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--no-sandbox']});
 const pg=await b.newPage({viewport:{width:1400,height:700}}); const errs=[]; pg.on('pageerror',e=>errs.push(e.message+' '+(e.stack||'').split('\n')[1]));
 await pg.route('**/*',r=>r.request().url().startsWith('file:')?r.continue():r.abort());
 await pg.goto('file://'+path.resolve(__dirname,'../index.html')+'?all=1'); await pg.waitForTimeout(600);
 const info=await pg.evaluate((era)=>{const d=window.__dino; window.__skipIntro=true; d.setEra(era); d.startGame(); d.freeze();
   document.getElementById('hud').classList.add('hidden');
   for (const c of d.world.creatures) c.holder.visible=false; for (const f of d.world.ferns) f.mesh.visible=false;
   const keys=Object.keys(SPECIES).filter(k=>inEra(SPECIES[k],era)&&!SPECIES[k].boss);
   let x=-60; const out=[];
   keys.forEach((k,i)=>{ const sp=SPECIES[k]; const w=sp.adult*3.4; x+=w/2; const c=d.makeCreature('dino',k,{level:10,pos:new THREE.Vector3(x,0,i%2? -6:6),name:sp.name}); c.heading=Math.PI/2; c.vel.set(0,0,0); out.push(k+'@'+x.toFixed(0)); x+=w/2+2; });
   const cx=(x-60)/2; window.__cam={pos:[cx,0,(x+60)*0.62], look:[cx,0,0]}; return out;},era);
 await pg.waitForTimeout(1600);
 await pg.screenshot({path:path.join(__dirname,`sea_${era}.png`)});
 console.log(info.join(' '),'\nerrors',errs.length?errs.slice(0,5):'none'); await b.close();})();
