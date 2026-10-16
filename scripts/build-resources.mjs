import {readFile,writeFile,readdir} from 'node:fs/promises';
import {resolve,relative} from 'node:path';
import {createHash} from 'node:crypto';
import {validateManifest,getTierFiles} from '../js/resources/shared.js';
const digest=value=>createHash('sha256').update(value).digest('hex');
export function canonicalHTML(html){return html.replace(/<meta name="fisch-build" content="[a-f0-9]{24}">\n?/g,'').replace(/\?fisch-build=[a-f0-9]{24}/g,'');}
export function versionHTML(html,build){return canonicalHTML(html).replace('</head>',`<meta name="fisch-build" content="${build}">\n</head>`).replace(/((?:src|href)="\.\/[^"?]+\.(?:css|js|svg|png|webmanifest))"/g,`$1?fisch-build=${build}"`);}
async function walk(dir){let files=[];for(const e of await readdir(dir,{withFileTypes:true})){const path=resolve(dir,e.name);files.push(...e.isDirectory()?await walk(path):[path]);}return files;}
export async function generateResources({directory,jsPrefix='js',metafile,outputRoot}){
  const candidates=['index.html','manifest.webmanifest','CREDITS.txt',...(await walk(resolve(directory,'css'))).map(p=>relative(directory,p)),...(await walk(resolve(directory,'assets'))).map(p=>relative(directory,p)),...(await walk(resolve(directory,jsPrefix))).map(p=>relative(directory,p)).filter(p=>!p.endsWith('account-callback.js'))].sort();
  const htmlPath=resolve(directory,'index.html'),canonical=canonicalHTML(await readFile(htmlPath,'utf8'));
  const appManifestPath=resolve(directory,'manifest.webmanifest'),appManifest=JSON.parse(canonicalHTML(await readFile(appManifestPath,'utf8')));
  const parts=[];for(const name of candidates)parts.push(name+'\0'+(name==='index.html'?digest(canonical):name==='manifest.webmanifest'?digest(JSON.stringify(appManifest)):digest(await readFile(resolve(directory,name)))));
  const build=digest(parts.join('\n')).slice(0,24),html=versionHTML(canonical,build);await writeFile(htmlPath,html);
  for(const icon of appManifest.icons)icon.src=icon.src+'?fisch-build='+build;
  await writeFile(appManifestPath,JSON.stringify(appManifest,null,2)+'\n');
  const core=new Set(['index.html',...candidates.filter(n=>n.startsWith('css/'))]);
  // esbuild's static import graph is the actual boot dependency closure.
  const outputs=metafile.outputs,entry=Object.keys(outputs).find(name=>outputs[name].entryPoint==='js/main.js');
  const visited=new Set();function add(name){if(visited.has(name))return;visited.add(name);const output=outputs[name];if(!output)throw new Error('Missing output dependency: '+name);core.add(jsPrefix+'/'+relative(resolve(outputRoot,'js'),resolve(name)));for(const item of output.imports)if(item.kind!=='dynamic-import'&&!item.external)add(item.path);}
  add(entry);
  const urlFor=name=>'./'+name+((name.endsWith('.css')||name.startsWith('assets/')||name===jsPrefix+'/main.js'||['manifest.webmanifest','CREDITS.txt'].includes(name))?'?fisch-build='+build:'');
  const files=[];for(const name of candidates){const content=await readFile(resolve(directory,name));files.push({url:urlFor(name),bytes:content.length,sha256:digest(content)});}
  const social=candidates.filter(n=>n.startsWith(jsPrefix+'/')&&n.endsWith('.js')&&!core.has(n)),extras=candidates.filter(n=>!core.has(n)&&!social.includes(n));
  const manifest={schema:1,build,entry:'./index.html',files,groups:{core:{files:[...core].sort().map(urlFor),requires:[]},social:{files:social.map(urlFor),requires:['core']},extras:{files:extras.map(urlFor),requires:['social']}},tiers:{core:['core'],extended:['social'],full:['extras']}};
  validateManifest(manifest,'https://build.test/fisch/',build);
  await writeFile(resolve(directory,'resources.json'),JSON.stringify(manifest,null,2)+'\n');return manifest;
}
export async function checkResources(directory){
  const manifest=validateManifest(JSON.parse(await readFile(resolve(directory,'resources.json'),'utf8')),'https://build.test/fisch/');
  const html=await readFile(resolve(directory,'index.html'),'utf8');if(!html.includes(`<meta name="fisch-build" content="${manifest.build}">`))throw new Error('HTML build mismatch');
  for(const file of manifest.files){const content=await readFile(resolve(directory,file.url.slice(2).split('?')[0]));if(content.length!==file.bytes||digest(content)!==file.sha256)throw new Error('Resource hash mismatch: '+file.url);}
  const core=getTierFiles(manifest,'core');
  for(const match of html.matchAll(/(?:src|href)="(\.\/[^"?]+\.(?:css|js))([^\"]*)"/g))if(match[2]!=='?fisch-build='+manifest.build||!core.some(f=>f.url===match[1]+match[2]))throw new Error('Unversioned or missing core boot asset: '+match[1]);
  const appManifest=JSON.parse(await readFile(resolve(directory,'manifest.webmanifest'),'utf8'));
  for(const icon of appManifest.icons)if(!manifest.files.some(f=>f.url===icon.src))throw new Error('Missing versioned install icon');
  if(getTierFiles(manifest,'core').some(file=>/account/.test(file.url)))throw new Error('Account callback in offline core');
  return manifest;
}
