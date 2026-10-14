import {build} from 'esbuild';
import {cp,mkdir,rm,readdir,readFile,stat} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gzipSync} from 'node:zlib';
const root=fileURLToPath(new URL('../',import.meta.url)),dist=resolve(root,'dist');
await import('./sync-server.mjs');
await rm(dist,{recursive:true,force:true});await mkdir(dist,{recursive:true});
await build({absWorkingDir:root,entryPoints:['js/main.js'],outdir:dist,entryNames:'js/main',chunkNames:'js/chunks/[name]-[hash]',
  bundle:true,splitting:true,format:'esm',platform:'browser',target:'es2022',minify:true,legalComments:'linked',logLevel:'silent'});
for(const file of ['index.html','css','assets'])await cp(resolve(root,file),resolve(dist,file),{recursive:true});
await cp(resolve(root,'THIRD_PARTY.md'),resolve(dist,'CREDITS.txt'));
async function inspect(dir){let total=0,gzip=0,files=0;for(const e of await readdir(dir,{withFileTypes:true})){const path=resolve(dir,e.name);if(e.isDirectory()){const v=await inspect(path);total+=v.total;gzip+=v.gzip;files+=v.files;}else{const content=await readFile(path);total+=content.length;gzip+=gzipSync(content).length;files++;if(/SUPABASE_SERVICE_ROLE_KEY|sb_secret_[A-Za-z0-9_-]{24,}/.test(content.toString()))throw new Error('Privileged backend configuration leaked into static output');}}return {total,gzip,files};}
const report=await inspect(dist);await stat(resolve(dist,'index.html'));
console.log(`Packaged ${report.files} static files · ${(report.total/1024).toFixed(0)} KB · ${(report.gzip/1024).toFixed(0)} KB gzip into dist/.`);
