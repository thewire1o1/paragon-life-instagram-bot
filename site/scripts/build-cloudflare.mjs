import {rm,mkdir,cp,copyFile,writeFile} from 'node:fs/promises';
import {join,dirname} from 'node:path';
const out=join(process.cwd(),'dist');
await rm(out,{recursive:true,force:true});
await mkdir(out,{recursive:true});
for(const f of ['index.html','404.html','sitemap.html','sitemap.xml','robots.txt']){
 await copyFile(join(process.cwd(),f),join(out,f));
}
await cp(join(process.cwd(),'assets'),join(out,'assets'),{recursive:true});
await mkdir(join(out,'shop'),{recursive:true});
await copyFile(join(process.cwd(),'shop/index.html'),join(out,'shop/index.html'));
await writeFile(join(out,'_routes.json'),JSON.stringify({version:1,include:['/api/*'],exclude:[]},null,2)+'\n');
console.log('Cloudflare Pages static build ready:',out);
