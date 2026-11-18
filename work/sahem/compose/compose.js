// node compose/compose.js [scale] — shoots every .fig in figs.html to assets/img/fig_<id>.jpg (3x by default)
const {chromium}=require('playwright');const path=require('path');const {execSync}=require('child_process');
(async()=>{const s=+(process.argv[2]||3);const b=await chromium.launch({args:['--allow-file-access-from-files']});
const p=await b.newPage({viewport:{width:1000,height:900},deviceScaleFactor:s});
await p.goto('file://'+path.join(__dirname,'figs.html'));await p.waitForLoadState('networkidle');await p.waitForTimeout(600);
const ids=await p.$$eval('.fig',e=>e.map(x=>x.id));
for(const id of ids){const out=path.join(__dirname,'..','assets','img','fig_'+id+'.png');await (await p.$('#'+id)).screenshot({path:out});
 execSync(`python3 -c "from PIL import Image;im=Image.open('${out}').convert('RGB');im.save('${out.replace('.png','.jpg')}',quality=92,subsampling=0)"; rm '${out}'`);console.log(id);}
await b.close();})();
