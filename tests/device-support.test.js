import test from 'node:test';
import assert from 'node:assert/strict';
import {loadFeature} from './helpers.js';
const support=await loadFeature('../js/device-support.js');
const supportUI=await loadFeature('../js/ui/device-support.js');
function fixture(){
  const values=new Map([['fisch3d.save.v1','my-progress'],['fisch3d.settings.v1','my-settings']]);
  const storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};
  let activeProbes=0;
  const forbidden=()=>{activeProbes++;throw new Error('do not activate hardware while reporting support');};
  return{values,window:{localStorage:storage,AudioContext:forbidden,PointerEvent:forbidden,WebGL2RenderingContext:forbidden},document:{fullscreenEnabled:true,documentElement:{requestFullscreen:forbidden}},navigator:{maxTouchPoints:5},graphics:{webgl2:true,contextLost:false,maxTextureSize:8192},get activeProbes(){return activeProbes;}};
}
const statuses=result=>Object.fromEntries(result.features.map(feature=>[feature.id,feature.status]));

test('support reporting uses the existing graphics context and leaves saves and hardware activation untouched',()=>{
  assert.equal(typeof support.collectDeviceSupport,'function');
  const env=fixture(),report=support.collectDeviceSupport(env);
  assert.deepEqual(statuses(report),{webgl:'supported',fullscreen:'supported',audio:'supported',touch:'supported',storage:'supported'});
  assert.equal(env.activeProbes,0);assert.deepEqual([...env.values],[['fisch3d.save.v1','my-progress'],['fisch3d.settings.v1','my-settings']]);
});

test('available APIs with denied fullscreen or storage permissions are not labeled supported',()=>{
  assert.equal(typeof support.collectDeviceSupport,'function');
  const env=fixture();env.document.fullscreenEnabled=false;
  Object.defineProperty(env.window,'localStorage',{get(){throw new Error('SecurityError');}});
  const report=statuses(support.collectDeviceSupport(env));
  assert.equal(report.fullscreen,'unsupported');assert.equal(report.storage,'unsupported');assert.equal(env.activeProbes,0);
  assert.deepEqual(statuses(support.collectDeviceSupport({window:{},document:{documentElement:{}},navigator:{maxTouchPoints:0}})),{webgl:'unsupported',fullscreen:'unsupported',audio:'unsupported',touch:'unsupported',storage:'unsupported'});
});

test('an unverified or lost graphics context stays unknown instead of guessing GPU support',()=>{
  assert.equal(typeof support.collectDeviceSupport,'function');
  const env=fixture();delete env.graphics;
  assert.equal(statuses(support.collectDeviceSupport(env)).webgl,'unknown');
  env.graphics={webgl2:true,contextLost:true,maxTextureSize:8192};
  assert.equal(statuses(support.collectDeviceSupport(env)).webgl,'unknown');
});

test('a full storage quota remains uncertain and does not modify existing progress',()=>{
  assert.equal(typeof support.collectDeviceSupport,'function');
  const env=fixture();env.window.localStorage.setItem=()=>{throw Object.assign(new Error('full'),{name:'QuotaExceededError'});};
  assert.equal(statuses(support.collectDeviceSupport(env)).storage,'unknown');
  assert.deepEqual([...env.values],[['fisch3d.save.v1','my-progress'],['fisch3d.settings.v1','my-settings']]);
});

test('Settings refreshes measured FPS, RAF and quality together without assigning hardware support',()=>{
  assert.equal(typeof support.updatePerformanceReadout,'function');
  const nodes=['fps','hz','quality'].map(key=>({dataset:{liveStat:key},textContent:''})),root={querySelectorAll:()=>nodes};
  support.updatePerformanceReadout(root,{fps:58,hz:60,quality:'Medium'});
  assert.deepEqual(nodes.map(node=>node.textContent),['58 FPS','RAF ≈ 60 Hz','Medium']);
  support.updatePerformanceReadout(root,{fps:72,hz:120,quality:'High'});
  assert.deepEqual(nodes.map(node=>node.textContent),['72 FPS','RAF ≈ 120 Hz','High']);
  support.updatePerformanceReadout(root,{});
  assert.deepEqual(nodes.map(node=>node.textContent),['— FPS','RAF — Hz','AUTO']);
});

test('diagnostics create their missing container when an older HTML page is cached',()=>{
  assert.equal(typeof supportUI.ensureSupportTarget,'function');
  const nodes=new Map(),loading={append(node){nodes.set(node.id,node);}};
  nodes.set('loading',loading);
  const doc={getElementById:id=>nodes.get(id)||null,createElement:tag=>({tagName:tag.toUpperCase()})};
  const target=supportUI.ensureSupportTarget(doc);
  assert.equal(nodes.get('loadingSupport'),target);assert.equal(target.hidden,true);
  assert.equal(supportUI.ensureSupportTarget(doc),target);assert.equal(nodes.size,2);
});
