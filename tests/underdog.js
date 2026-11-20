// 저레벨 육식이 고레벨 육식을 물 때 몇 번에 쓰러지는지
const { chromium } = require('playwright-core'); const path=require('path');
(async()=>{
 const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--no-sandbox']});
 const pg=await b.newPage({viewport:{width:1000,height:650}}); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
 await pg.route('**/*',r=>r.request().url().startsWith('file:')?r.continue():r.abort());
 await pg.goto('file://'+path.resolve(__dirname,'../index.html?all=1')); await pg.waitForTimeout(500);
 const r = await pg.evaluate(()=>{
   const d=window.__dino; d.setEra('lateK'); d.setSel('tyrannosaurus'); d.startGame(); const P=d.player;
   const far=P.pos.clone().add(new THREE.Vector3(0,0,80));
   const run=(aSp,aLv,oSp,oLv)=>{
     const A=d.makeCreature('dino',aSp,{level:aLv,pos:far.clone()}), o=d.makeCreature('dino',oSp,{level:oLv,pos:far.clone()});
     const hp0=o.hp; let n=0, first=null;
     while(!o.dead && n<50){ o.invT=0; const h=o.hp; d.doBite(A,{type:'creature',obj:o}); if(first===null) first=+(h-o.hp).toFixed(1); n++; }
     return `${aSp} Lv${aLv} → ${oSp} Lv${oLv}: 체력 ${hp0.toFixed(0)}, 첫 물기 -${first}, ${n}번에 ${o.dead?'쓰러짐':'안 쓰러짐'}`;
   };
   return [run('tyrannosaurus',2,'velociraptor',8), run('tyrannosaurus',4,'velociraptor',9), run('velociraptor',3,'tyrannosaurus',4),
           run('tyrannosaurus',8,'velociraptor',8), run('tyrannosaurus',6,'velociraptor',3)].concat([]);
 });
 r.forEach(x=>console.log(x));
 console.log('errors', errs.length?errs:'none'); await b.close();})();
