import test from 'node:test';
import assert from 'node:assert/strict';
import {loadFeature,memoryStorage} from './helpers.js';
import {createLocalService} from '../js/services/local.js';
import {createFishingController} from '../js/fishing.js';
import {createInput} from '../js/input.js';
import {createTerrainModel} from '../js/terrain.js';
import {createNavigationModel} from '../js/navigation.js';
import {SAVE_KEY,createInitialState} from '../js/save.js';
import {FISH} from '../js/data.js';
const feature=await loadFeature('../js/app.js');
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function setup({xp=0,initial}={}){
  assert.equal(typeof feature.createApp,'function');
  const win=new EventTarget(),input=createInput({window:win}),service=createLocalService({storage:memoryStorage({[SAVE_KEY]:JSON.stringify(initial||{...createInitialState(),totalXp:xp})}),rng:()=>0});
  const notices=[],caught=[],rendered=[];let busy=false,app;
  const view={renderSnapshot:s=>rendered.push(s),renderFishing(){},showPanel(){},showNotice:c=>notices.push(c),showCatch:f=>caught.push(f),setBusy:v=>{busy=v;}};
  const fishing=createFishingController({onFinish:event=>app.handleFinish(event)});
  const factory=id=>{const world=createNavigationModel({islandId:id,totalXp:service.getSnapshot().totalXp}),p={x:world.center.x,y:2.2,z:world.center.z+world.radius*1.04};return{world,player:{position:p,motion:'walking'},setIsland:world.setIsland,setAccess:world.setAccess,update(){},dispose(){}};};
  app=feature.createApp({service,fishing,input,worldFactory:factory,view});
  const key=(code,down)=>{const e=new Event(down?'keydown':'keyup',{cancelable:true});Object.assign(e,{code,repeat:false});win.dispatchEvent(e);};
  return{app,service,fishing,input,notices,caught,rendered,key,get busy(){return busy;}};
}
test('opening a menu clears controls and invalidates an unsubmitted fishing ticket',async()=>{
  const s=setup();s.app.play();await s.app.dispatch('fish_press');const id=s.fishing.getView().ticketId;
  s.key('KeyW',true);s.app.openPanel('backpack');await flush();
  assert.equal(s.input.getSnapshot().moveZ,0);assert.equal(s.fishing.getView().phase,'idle');
  await s.app.handleFinish({ticketId:id,outcome:'caught'});assert.equal(s.service.getSnapshot().fish.length,0);s.app.dispose();
});
test('a delayed start response after a menu opens is cancelled instead of starting a stale reel',async()=>{
  const s=setup();let resolve;const gate=new Promise(r=>resolve=r),original=s.service.startCast;
  s.service.startCast=async(...args)=>{const t=await original(...args);await gate;return t;};
  s.app.play();const pending=s.app.dispatch('fish_press');s.app.openPanel('profile');resolve();await pending;
  assert.equal(s.fishing.getView().phase,'idle');const next=await s.service.startCast('palm');assert.ok(next.id);await s.service.cancelCast(next.id);s.app.dispose();
});
test('locked travel and failed purchases keep the previous scene and release busy state',async()=>{
  const s=setup();s.app.play();await s.app.travel('frost');await s.app.dispatch('buy_rod',{rodId:'river'});
  assert.equal(s.service.getSnapshot().lastIsland,'palm');assert.equal(s.app.getScene().world.islandId,'palm');
  assert.equal(s.app.getState().busy,false);assert.equal(s.busy,false);assert.ok(s.notices.includes('ISLAND_LOCKED'));assert.ok(s.notices.includes('NOT_ENOUGH_COINS'));s.app.dispose();
});
test('hidden app freezes fishing time and resumes without a large time jump',async()=>{
  const s=setup();s.app.play();await s.app.dispatch('fish_press');await s.app.dispatch('fish_release');
  const remaining=s.fishing.getView().remaining;s.app.setVisible(false);for(let i=0;i<100;i++)s.app.tick(0.05);
  assert.equal(s.fishing.getView().remaining,remaining);s.app.setVisible(true);s.app.tick(0.05);assert.ok(s.fishing.getView().remaining<remaining);s.app.dispose();
});
test('actual input and service complete a fishing then selling cycle once',async()=>{
  const s=setup();s.app.play();await s.app.dispatch('fish_press');await s.app.dispatch('fish_release');
  for(let i=0;i<100&&s.fishing.getView().phase!=='bite';i++)s.app.tick(0.05);
  s.key('KeyF',true);s.app.tick(1/120);
  for(let i=0;i<2400&&s.fishing.getView().phase==='reeling';i++){const v=s.fishing.getView();s.key('KeyF',v.bar<v.target);s.app.tick(1/120);}
  await flush();assert.equal(s.service.getSnapshot().fish.length,1);assert.equal(s.caught.length,1);
  Object.assign(s.app.getScene().player.position,s.app.getScene().world.seller);await s.app.dispatch('sell_all');
  assert.equal(s.service.getSnapshot().coins,1);assert.equal(s.service.getSnapshot().fish.length,0);assert.equal(s.service.getSnapshot().totalXp,12);s.app.dispose();
});
test('disposing the app detaches snapshots from the view',async()=>{
  const s=setup();s.app.dispose();const count=s.rendered.length;await s.service.updateProfile({name:'new name',avatar:1});assert.equal(s.rendered.length,count);
});
test('an invalid service switch cannot replace the current playable service',async()=>{
  const s=setup();await assert.rejects(s.app.setService(null));assert.equal(s.app.getService(),s.service);
  const next=createLocalService({storage:memoryStorage()});next.isActive=()=>false;await assert.rejects(s.app.setService(next));assert.equal(s.app.getService(),s.service);s.app.dispose();
});

test('map selection only guides and physical arrival commits without recreating or moving the scene',async()=>{
  const s=setup({xp:1600});s.app.play();const scene=s.app.getScene(),start={...scene.player.position};
  await s.app.travel('coral');assert.equal(s.service.getSnapshot().lastIsland,'palm');assert.deepEqual(scene.player.position,start);assert.equal(s.app.getState().destination,'coral');
  Object.assign(scene.player.position,scene.world.models.coral.spawn);const reached={...scene.player.position};s.app.tick(.05);await flush();
  assert.equal(s.service.getSnapshot().lastIsland,'coral');assert.equal(s.app.getScene(),scene);assert.deepEqual(scene.player.position,reached);assert.equal(scene.world.islandId,'coral');s.app.dispose();
});
test('a failed arrival keeps physical position and can retry without losing control',async()=>{
  const s=setup({xp:1600});s.app.play();const scene=s.app.getScene(),travel=s.service.travel;let attempts=0;
  s.service.travel=async id=>{if(++attempts===1)throw {code:'NETWORK_ERROR'};return travel(id);};
  Object.assign(scene.player.position,scene.world.models.coral.spawn);const point={...scene.player.position};s.app.tick(.05);await flush();
  assert.equal(scene.world.islandId,'palm');assert.deepEqual(scene.player.position,point);assert.equal(s.busy,false);
  for(let i=0;i<125;i++)s.app.tick(.05);await flush();assert.equal(s.service.getSnapshot().lastIsland,'coral');assert.equal(attempts,2);s.app.dispose();
});
test('a delayed arrival cannot change a replacement account scene',async()=>{
  const s=setup({xp:1600});s.app.play();let finish,started=0;const gate=new Promise(resolve=>{finish=resolve;}),travel=s.service.travel;
  s.service.travel=async id=>{started++;await gate;return travel(id);};Object.assign(s.app.getScene().player.position,s.app.getScene().world.models.coral.spawn);s.app.tick(.05);await flush();assert.equal(started,1);
  const next=createLocalService({storage:memoryStorage()});await s.app.setService(next);assert.equal(s.busy,false,'old arrival must not freeze a new account');const scene=s.app.getScene();finish();await flush();
  assert.equal(s.app.getScene(),scene);assert.equal(scene.world.islandId,'palm');assert.equal(s.app.getService(),next);s.app.dispose();
});
test('fishing requires leaving the boat even when it is alongside a fishing pier',async()=>{
  const s=setup();s.app.play();s.app.getScene().player.motion='sailing';await s.app.dispatch('fish_press');
  assert.equal(s.fishing.getView().phase,'idle');assert.ok(s.notices.includes('ON_FOOT_FISHING'));s.app.dispose();
});
test('opening Settings during arrival preserves the reached island and the open panel',async()=>{
  const s=setup({xp:1600});s.app.play();let finish;const gate=new Promise(resolve=>{finish=resolve;}),travel=s.service.travel;
  s.service.travel=async id=>{await gate;return travel(id);};const scene=s.app.getScene();Object.assign(scene.player.position,scene.world.models.coral.spawn);s.app.tick(.05);s.app.openPanel('settings');
  finish();await flush();assert.equal(scene.world.islandId,'coral');assert.equal(s.app.getState().panel,'settings');s.app.dispose();
});
function sanctuaryState(){
  const state={...createInitialState(),totalXp:3600,coins:200000,lastIsland:'sanctuary'};
  state.fish=['n11','r09','l05','m03','u02'].map((speciesId,i)=>({id:'offering-'+i,speciesId,islandId:'sanctuary',weightGrams:FISH[speciesId].minGrams,caughtAt:new Date(0).toISOString()}));return state;
}
test('the hidden shrine opens on E and exchanges only from its on-foot panel',async()=>{
  const s=setup({initial:sanctuaryState()});s.app.play();
  await s.app.dispatch('open',{panel:'secret'});assert.equal(s.app.getState().panel,null,'remote secret panel must stay closed');
  await s.app.dispatch('trade_rod',{rodId:'eclipse'});assert.equal(s.service.getSnapshot().coins,200000);
  const scene=s.app.getScene();assert.ok(scene.world.secret);Object.assign(scene.player.position,scene.world.secret);
  s.key('KeyE',true);s.app.tick(.05);s.key('KeyE',false);assert.equal(s.app.getState().panel,'secret');
  await s.app.dispatch('trade_rod',{rodId:'eclipse',position:{x:0,z:0}});
  assert.equal(s.service.getSnapshot().coins,100000);assert.ok(s.service.getSnapshot().rods.includes('eclipse'));assert.ok(s.notices.includes('TRADE_SUCCESS'));s.app.dispose();
});
test('leaving the shrine or sitting in a boat invalidates a previously open trade panel',async()=>{
  for(const motion of ['walking','sailing']){
    const s=setup({initial:sanctuaryState()});s.app.play();const scene=s.app.getScene();assert.ok(scene.world.secret);
    Object.assign(scene.player.position,scene.world.secret);s.app.openPanel('secret');assert.equal(s.app.getState().panel,'secret');
    if(motion==='walking')scene.player.position.x+=20;else scene.player.motion='sailing';
    await s.app.dispatch('trade_rod',{rodId:'eclipse'});assert.equal(s.service.getSnapshot().coins,200000);assert.equal(s.service.getSnapshot().fish.length,5);s.app.dispose();
  }
});
