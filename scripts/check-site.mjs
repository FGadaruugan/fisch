import {readFile,readdir,access} from 'node:fs/promises';
import {resolve,dirname,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {build,transform} from 'esbuild';
const root=fileURLToPath(new URL('../',import.meta.url));
async function files(directory){let result=[];for(const entry of await readdir(directory,{withFileTypes:true})){const path=resolve(directory,entry.name);if(entry.isDirectory())result.push(...await files(path));else result.push(path);}return result;}
let count=0;
for(const dir of ['js','scripts','tests','supabase/functions'])for(const path of await files(resolve(root,dir))){
  if(!/\.(?:js|mjs|ts)$/.test(path))continue;const source=await readFile(path,'utf8');
  if(path.endsWith('.ts'))await transform(source,{loader:'ts',target:'es2022'});
  else{const check=spawnSync(process.execPath,['--check',path],{encoding:'utf8'});if(check.status!==0)throw new Error(check.stderr);}
  // The shared-server generator's inline entry is resolved from the project root.
  const importRoot=path===resolve(root,'scripts/sync-server.mjs')?root:dirname(path);
  for(const match of source.matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)(['"])(\.[^'"]+)\1/g))await access(resolve(importRoot,match[2]));
  count++;
}
const html=await readFile(resolve(root,'index.html'),'utf8'),ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
if(new Set(ids).size!==ids.length)throw new Error('Duplicate HTML IDs');
for(const match of html.matchAll(/\b(?:src|href)="([^"#]+)"/g)){if(!/^(?:https?:|data:)/.test(match[1]))await access(resolve(root,match[1]));}
for(const file of ['js/main.js','js/ui.js','js/lobby.js']){
  const source=await readFile(resolve(root,file),'utf8');
  for(const match of source.matchAll(/\b(?:byId|id)\(['"]([^'"]+)['"]\)/g))if(!ids.includes(match[1]))throw new Error(`${file}: missing HTML id ${match[1]}`);
}
await build({absWorkingDir:root,entryPoints:['js/main.js'],bundle:true,format:'esm',platform:'browser',splitting:true,outdir:resolve(root,'dist'),write:false,logLevel:'silent'});
console.log(`Checked ${count} JS/TS files, ${ids.length} HTML IDs, imports, assets and browser bundle.`);
