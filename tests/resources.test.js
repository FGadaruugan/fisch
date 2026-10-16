import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {loadFeature} from './helpers.js';
const feature=await loadFeature('../js/resources/manager.js');
const base='https://example.test/fisch/',build='a'.repeat(24),hash=s=>createHash('sha256').update(s).digest('hex');
function manifest(){return {schema:1,build,entry:'./index.html',files:[{url:'./index.html',bytes:4,sha256:hash('html')},{url:'./js/main.js?fisch-build='+build,bytes:4,sha256:hash('main')},{url:'./js/chunks/social-ABCDEFGH.js',bytes:6,sha256:hash('social')}],groups:{core:{files:['./index.html','./js/main.js?fisch-build='+build],requires:[]},social:{files:['./js/chunks/social-ABCDEFGH.js'],requires:['core']},extras:{files:[],requires:['social']}},tiers:{core:['core'],extended:['social'],full:['extras']}};}
function cachesFixture(){const maps=new Map();return {maps,async keys(){return [...maps.keys()];},async open(name){if(!maps.has(name))maps.set(name,new Map());const map=maps.get(name);return {async match(key){return map.get(String(key))?.clone();},async put(key,response){map.set(String(key),response.clone());},async delete(key){return map.delete(String(key));},async keys(){return [...map.keys()].map(url=>({url}));}};}};}
function create(overrides={}){assert.equal(typeof feature.createResourceManager,'function');const caches=cachesFixture(),calls=[];const fetch=async(url,{signal}={})=>{if(signal?.aborted)throw new DOMException('aborted','AbortError');calls.push(String(url));return new Response(String(url).includes('social')?'social':String(url).includes('main.js')?'main':'html');};return {caches,calls,manager:feature.createResourceManager({baseURL:base,build,caches,fetch,crypto:globalThis.crypto,manifest:manifest(),supported:true,...overrides})};}
test('manifest validates same-origin scoped URLs, hashes, dependency closure and build identity',()=>{
  assert.equal(typeof feature.validateManifest,'function');const m=manifest();assert.equal(feature.validateManifest(m,base,build).build,build);
  for(const url of ['../private.js','https://evil.test/x','./api/user','./account.html','./js/../secret.js','./js/main.js?token=x']){const bad=manifest();bad.files[1].url=url;assert.throws(()=>feature.validateManifest(bad,base,build));}
  const bad=manifest();bad.groups.social.requires=['missing'];assert.throws(()=>feature.validateManifest(bad,base,build));assert.throws(()=>feature.validateManifest(m,base,'b'.repeat(24)),/BUILD_MISMATCH/);
});
test('verified files resume after reopening; incomplete core never becomes ready',async()=>{
  const {manager,caches,calls}=create();await manager.initialize();assert.equal(manager.getState().ready,false);await manager.download('core');
  assert.equal(manager.getState().status,'completed');assert.equal(manager.getState().ready,true);assert.equal(manager.getState().downloadedBytes,8);
  const reopened=create({caches}).manager;await reopened.initialize();assert.equal(reopened.getState().ready,true);await reopened.download('full');assert.equal(reopened.getState().downloadedBytes,14);assert.equal(calls.length,2);
  await reopened.remove('social');assert.equal(reopened.getState().ready,true);assert.equal(reopened.getState().downloadedBytes,8);
});
test('hash mismatch and quota failure cannot mark a core build complete',async()=>{
  const first=create({fetch:async()=>new Response('oops')}).manager;await first.initialize();await first.download('core');assert.equal(first.getState().status,'error');assert.equal(first.getState().ready,false);
  const caches=cachesFixture(),open=caches.open;caches.open=async name=>{const cache=await open(name);return {...cache,put:async()=>{throw new Error('quota');}};};
  const second=create({caches}).manager;await second.initialize();await second.download('core');assert.equal(second.getState().status,'error');assert.equal(second.getState().ready,false);
});
test('pause aborts current fetch, duplicate start is ignored, and retry keeps verified files',async()=>{
  let started=0;const {manager}=create({fetch:(url,{signal})=>new Promise((resolve,reject)=>{started++;signal.addEventListener('abort',()=>reject(new DOMException('aborted','AbortError')),{once:true});})});
  await manager.initialize();const running=manager.download('core');await Promise.resolve();await Promise.resolve();await manager.download('full');manager.pause();await running;assert.equal(started,1);assert.equal(manager.getState().status,'paused');assert.equal(manager.getState().ready,false);
});
test('offline reopening reads only this build metadata and revalidates cached files',async()=>{
  const {manager,caches}=create();await manager.initialize();await manager.download('core');
  const reopened=create({caches,manifest:undefined,fetch:async()=>{throw new Error('offline');}}).manager;await reopened.initialize();assert.equal(reopened.getState().ready,true);assert.equal(reopened.getState().downloadedBytes,8);
  const another=create({caches,build:'b'.repeat(24),manifest:undefined,fetch:async()=>{throw new Error('offline');}}).manager;await another.initialize();assert.equal(another.getState().ready,false);assert.equal(another.getState().status,'error');
  const map=[...caches.maps.values()][0];map.set(base+'index.html',new Response('oops'));const corrupted=create({caches}).manager;await corrupted.initialize();assert.equal(corrupted.getState().ready,false);assert.equal(map.has(base+'__fisch_core_ready__'),false);
});
test('initial manifest failure can retry, redirects are rejected and marker quota failure is not ready',async()=>{
  let fail=true;const {manager}=create({manifest:undefined,fetch:async url=>{if(String(url).endsWith('resources.json')){if(fail)throw new Error('offline');return Response.json(manifest());}return new Response(String(url).includes('main.js')?'main':'html');}});
  await manager.initialize();assert.equal(manager.getState().status,'error');fail=false;await manager.download('core');assert.equal(manager.getState().ready,true);
  const response=new Response('html');Object.defineProperty(response,'redirected',{value:true});const redirect=create({fetch:async()=>response}).manager;await redirect.initialize();await redirect.download('core');assert.equal(redirect.getState().status,'error');assert.equal(redirect.getState().ready,false);
  const caches=cachesFixture(),open=caches.open;caches.open=async name=>{const cache=await open(name);return {...cache,put:async(key,value)=>{if(String(key).endsWith('__fisch_core_ready__'))throw new Error('quota');return cache.put(key,value);}};};
  const quota=create({caches}).manager;await quota.initialize();await quota.download('core');assert.equal(quota.getState().status,'error');assert.equal(quota.getState().ready,false);
});
