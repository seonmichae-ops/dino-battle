const { chromium } = require('playwright-core'); const fs=require('fs'), path=require('path');
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--use-gl=swiftshader','--no-sandbox']});
 const pg=await b.newPage(); pg.on('pageerror',e=>console.log('ERR',e.message, e.stack.split('\n')[1]));
 const three=fs.readFileSync('/home/claude/dino-battle/node_modules/three/build/three.min.js');
 await pg.route('**/*',r=>{const u=r.request().url(); if(u.includes('three.min.js'))return r.fulfill({body:three,contentType:'application/javascript'}); if(u.startsWith('file:'))return r.continue(); return r.abort();});
 await pg.goto('file:///home/claude/dino-battle/index.html'); await pg.waitForTimeout(800); await b.close();})();
