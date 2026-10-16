import test from 'node:test';
import assert from 'node:assert/strict';
import {loadFeature} from './helpers.js';
const feature=await loadFeature('../scripts/build-resources.mjs');
test('canonical HTML strips generated data and repeat builds do not accumulate queries',()=>{
  assert.equal(typeof feature.canonicalHTML,'function');const source='<head><link href="./css/a.css"><script src="./web/js/main.js"></script></head>';
  const versioned=feature.versionHTML(source,'a'.repeat(24));assert.equal(feature.canonicalHTML(versioned),source);assert.equal(feature.versionHTML(versioned,'a'.repeat(24)),versioned);
});
test('packaged root files download over HTTP and every full-tier consumer works offline at its exact version URL',async()=>{
  const {readFile}=await import('node:fs/promises'),{createServer}=await import('node:http');
  const {createResourceManager}=await import('../js/resources/manager.js'),{createResourceHandler}=await import('../js/resources/worker.js'),{cacheName}=await import('../js/resources/shared.js');
  const directory=new URL('../',import.meta.url),manifest=JSON.parse(await readFile(new URL('resources.json',directory),'utf8')),maps=new Map();
  const caches={keys:async()=>[...maps.keys()],open:async name=>{if(!maps.has(name))maps.set(name,new Map());const map=maps.get(name);return {match:async key=>map.get(String(key))?.clone(),put:async(key,response)=>map.set(String(key),response.clone()),delete:async key=>map.delete(String(key))};}};
  const server=createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost'),path=url.pathname.slice('/fisch/'.length);if(!manifest.files.some(file=>file.url.slice(2).split('?')[0]===path)&&path!=='resources.json')throw new Error('unknown');res.writeHead(200);res.end(await readFile(new URL(path,directory)));}catch{res.writeHead(404);res.end();}});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port+'/fisch/';
  try{
    const manager=createResourceManager({baseURL:base,build:manifest.build,caches});await manager.initialize();await manager.download('full');const state=manager.getState();assert.equal(state.status,'completed',state.error);assert.equal(state.tiers.full.completed,manifest.files.length);assert.equal(state.downloadedBytes,manifest.files.reduce((sum,f)=>sum+f.bytes,0));
    const offline=createResourceHandler({scope:base,caches,fetch:async()=>{throw new Error('offline');}}),request=(url,mode='cors')=>({url:new URL(url,base).href,method:'GET',mode});
    const html=await (await offline(request('','navigate'))).text();assert.ok(html.includes('content="'+manifest.build+'"'));
    const appManifest=await (await offline(request('./manifest.webmanifest?fisch-build='+manifest.build))).json();
    for(const icon of appManifest.icons)assert.equal((await offline(request(icon.src))).status,200);
    assert.match(await (await offline(request('./CREDITS.txt?fisch-build='+manifest.build))).text(),/Three|three/);
    await assert.rejects(offline(request('resources.json')),/offline/);await assert.rejects(offline(request('account.html','navigate')),/offline/);
    maps.get(cacheName(base,manifest.build)).delete(new URL(manifest.groups.core.files.find(url=>url.includes('/main.js?')),base).href);
    await assert.rejects(offline(request('','navigate')),/offline/);
  }finally{await new Promise(resolve=>server.close(resolve));}
});
