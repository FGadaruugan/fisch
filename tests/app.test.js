import test from 'node:test';
import assert from 'node:assert/strict';
import {loadFeature,memoryStorage} from './helpers.js';
import {createLocalService} from '../js/services/local.js';
import {createFishingController} from '../js/fishing.js';
import {createInput} from '../js/input.js';
import {createTerrainModel} from '../js/terrain.js';
const feature=await loadFeature('../js/app.js');
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function setup(){
  assert.equal(typeof feature.createApp,'function');
  const win=new EventTarget(),input=createInput({window:win}),service=createLocalService({storage:memoryStorage(),rng:()=>0});
  const notices=[],caught=[],rendered=[];let busy=false,app;
  const view={renderSnapshot:s=>rendered.push(s),renderFishing(){},showPanel(){},showNotice:c=>notices.push(c),showCatch:f=>caught.push(f),setBusy:v=>{busy=v;}};
  const fishing=createFishingController({onFinish:event=>app.handleFinish(event)});
  const factory=id=>{const world=createTerrainModel(id),p={x:world.center.x,y:2.2,z:world.center.z+world.radius*1.04};return{world,player:{position:p},update(){},dispose(){}};};
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
