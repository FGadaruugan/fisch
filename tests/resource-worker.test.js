import test from 'node:test';
import assert from 'node:assert/strict';
import {loadFeature} from './helpers.js';
const worker=await loadFeature('../js/resources/worker.js');
const scope='https://example.test/fisch/';
const req=(path,extra={})=>({url:new URL(path,scope).href,method:'GET',mode:'cors',...extra});
test('worker routing isolates the game scope and never intercepts OAuth, APIs or mutable assets',()=>{
  assert.equal(typeof worker.resourceRoute,'function');
  for(const path of ['../other/index.html','account.html?code=secret','?code=secret','api/player','resources.json','sw.js','css/game.css','web/js/main.js','manifest.webmanifest'])assert.equal(worker.resourceRoute(req(path),scope),'network',path);
  assert.equal(worker.resourceRoute(req('',{mode:'navigate'}),scope),'navigation');assert.equal(worker.resourceRoute(req('index.html',{mode:'navigate'}),scope),'navigation');
  assert.equal(worker.resourceRoute(req('css/game.css?fisch-build='+'a'.repeat(24)),scope),'static');assert.equal(worker.resourceRoute(req('web/js/chunks/chunk-ABCDEFGH.js'),scope),'static');
  assert.equal(worker.resourceRoute(req('web/js/chunks/chunk-ABCDEFGH.js',{method:'POST'}),scope),'network');
});
test('partial caches cannot supply offline navigation and a build URL is never substituted',async()=>{
  assert.equal(typeof worker.createResourceHandler,'function');
  const caches={keys:async()=>['fisch-resources-v1-test'],open:async()=>({match:async()=>undefined})};
  const handle=worker.createResourceHandler({scope,caches,fetch:async()=>{throw new Error('offline');}});
  await assert.rejects(handle(req('',{mode:'navigate'})),/offline/);await assert.rejects(handle(req('css/game.css?fisch-build='+'b'.repeat(24))),/offline/);
});
test('completed builds serve their own entry and exact URLs; partial and unrelated caches are ignored',async()=>{
  const {cacheName,READY_PATH}=await import('../js/resources/shared.js'),a='a'.repeat(24),b='b'.repeat(24),maps=new Map();
  function ready(build,time){const js='./js/main.js?fisch-build='+build,manifest={schema:1,build,entry:'./index.html',files:[{url:'./index.html',bytes:1,sha256:'0'.repeat(64)},{url:js,bytes:1,sha256:'0'.repeat(64)}],groups:{core:{files:['./index.html',js],requires:[]},social:{files:[],requires:['core']},extras:{files:[],requires:['social']}},tiers:{core:['core'],extended:['social'],full:['extras']}};return new Map([[new URL(READY_PATH,scope).href,Response.json({manifest,completedAt:time})],[scope+'index.html',new Response('html-'+build)],[new URL(js,scope).href,new Response('js-'+build)]]);}
  maps.set(cacheName(scope,a),ready(a,1));maps.set(cacheName(scope,b),ready(b,2));
  const caches={keys:async()=>[...maps.keys()],open:async name=>({match:async key=>maps.get(name).get(String(key))?.clone()})},handle=worker.createResourceHandler({scope,caches,fetch:async()=>{throw new Error('offline');}});
  assert.equal(await (await handle(req('',{mode:'navigate'}))).text(),'html-'+b);
  assert.equal(await (await handle(req('js/main.js?fisch-build='+a))).text(),'js-'+a);
  await assert.rejects(handle(req('js/main.js?fisch-build='+'c'.repeat(24))),/offline/);
  maps.get(cacheName(scope,b)).delete(scope+'js/main.js?fisch-build='+b);
  assert.equal(await (await handle(req('',{mode:'navigate'}))).text(),'html-'+a);
});
