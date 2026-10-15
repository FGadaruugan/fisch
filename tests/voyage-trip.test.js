import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createApp} from '../js/app.js';
import {createVoyageScene} from '../js/voyage-scene.js';
import {createLocalService} from '../js/services/local.js';
import {createFishingController} from '../js/fishing.js';
import {createInitialState,SAVE_KEY} from '../js/save.js';
import {QUALITY_LEVELS} from '../js/performance.js';
import {memoryStorage} from './helpers.js';
test('a real boat sails around Palm Bay to Coral and saves arrival in the same scene',async()=>{
  const service=createLocalService({storage:memoryStorage({[SAVE_KEY]:JSON.stringify({...createInitialState(),totalXp:1600})})});
  const graphics={scene:new THREE.Scene(),camera:new THREE.PerspectiveCamera(62,1,.08,1800),profile:QUALITY_LEVELS[0],settings:{particles:false},time:0,setWorld(world){world.setQuality(this.profile,this.settings);}};
  let controls={};const input={getSnapshot:()=>({actionHeld:false,...controls}),releaseAll(){controls={};},setEnabled(){controls={};},dispose(){}};
  const view={renderSnapshot(){},renderFishing(){},showPanel(){},showNotice(){},setBusy(){}};
  const app=createApp({service,input,view,fishing:createFishingController(),worldFactory:(islandId,{totalXp})=>createVoyageScene(THREE,{islandId,totalXp,graphics})});
  app.play();const scene=app.getScene();scene.player.setPosition({x:scene.boat.position.x-5,y:2.2,z:scene.boat.position.z});scene.interact();await app.travel('coral');
  const start={...scene.boat.position};app.openPanel('map');controls={moveZ:1};for(let i=0;i<20;i++)app.tick(.05);assert.deepEqual(scene.boat.position,start);app.closePanel();
  const waypoints=[{x:340,z:330},{x:340,z:-330},{x:-810,z:-470}];let waypoint=0,steps=0;
  for(;steps<8000&&service.getSnapshot().lastIsland!=='coral';steps++){
    const target=waypoints[waypoint],boat=scene.boat,dx=target.x-boat.position.x,dz=target.z-boat.position.z;
    if(Math.hypot(dx,dz)<35&&waypoint<waypoints.length-1){waypoint++;continue;}
    const desired=Math.atan2(dx,dz),error=Math.atan2(Math.sin(desired-boat.yaw),Math.cos(desired-boat.yaw));
    controls={moveX:Math.min(1,Math.max(-1,-error*2.5)),moveZ:Math.abs(error)<.7?1:0};app.tick(.05);
    if(app.getState().busy)await new Promise(resolve=>setImmediate(resolve));
  }
  assert.equal(service.getSnapshot().lastIsland,'coral','physical route must complete within the bounded simulation');assert.equal(scene.world.islandId,'coral');assert.equal(app.getScene(),scene);
  assert.ok(Math.hypot(scene.player.position.x-start.x,scene.player.position.z-start.z)>900);assert.notDeepEqual(scene.player.position,scene.world.models.coral.spawn);
  assert.equal(service.getSnapshot().totalXp,1600);app.dispose();
});
