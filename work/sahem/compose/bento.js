// node compose/bento.js [scale] — shoots the whole grid (preview) and every tile to assets/img/bento/<id>.jpg
const {chromium}=require('playwright');const path=require('path');
(async()=>{const s=+(process.argv[2]||3);const b=await chromium.launch({args:['--allow-file-access-from-files']});
const p=await b.newPage({viewport:{width:1344,height:720},deviceScaleFactor:s});
await p.goto('file://'+path.join(__dirname,'bento.html'));await p.waitForLoadState('networkidle');await p.waitForTimeout(500);
await p.screenshot({path:'/tmp/bento_grid.png'});
for(const id of await p.$$eval('.t',e=>e.map(x=>x.id)))await (await p.$('#'+id)).screenshot({path:path.join(__dirname,'..','assets','img','bento',id+'.jpg'),type:'jpeg',quality:92});
await b.close();})();
