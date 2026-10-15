import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {loadFeature} from './helpers.js';
import {QUALITY_LEVELS} from '../js/performance.js';
const feature=await loadFeature('../js/voyage-scene.js');
function setup(){assert.equal(typeof feature.createVoyageScene,'function');const graphics={scene:new THREE.Scene(),camera:new THREE.PerspectiveCamera(62,1,.08,1800),profile:QUALITY_LEVELS[0],settings:{particles:true},time:0,setWorld(world){world.setQuality(this.profile,this.settings);}};return{scene:feature.createVoyageScene(THREE,{islandId:'palm',totalXp:3600,graphics}),graphics};}
test('on-foot movement remains relative to the orbit camera',()=>{
  const {scene}=setup(),before=scene.player.position.z;scene.update({moveZ:1},.05,{phase:'idle'},'play');assert.ok(scene.player.position.z>before);scene.dispose();
});
test('real boat boarding, paused inertia and water exit share continuous coordinates',()=>{
  const {scene}=setup();scene.player.setPosition({x:scene.boat.position.x-5,y:2.2,z:scene.boat.position.z});
  assert.ok(scene.interact());assert.equal(scene.getNavigation().sailing,true);
  for(let i=0;i<30;i++)scene.update({moveZ:1},.05,{phase:'idle'},'play');const point={...scene.player.position};
  for(let i=0;i<30;i++)scene.update({moveZ:1,freeze:true},.05,{phase:'idle'},'play');assert.deepEqual(scene.player.position,point);
  assert.ok(scene.interact());assert.equal(scene.getNavigation().sailing,false);assert.equal(scene.player.motion,'swimming');scene.dispose();
});
test('streamed archipelago keeps finite geometry, quality and resource disposal across islands',()=>{
  const {scene,graphics}=setup();
  for(const id of ['palm','coral','frost','sanctuary']){
    scene.player.setPosition(scene.world.models[id].spawn);scene.setIsland(id);scene.update({freeze:true},.05,{phase:'idle'},'play');
    scene.world.setQuality(QUALITY_LEVELS[0],{particles:false});graphics.scene.updateMatrixWorld(true);
    graphics.scene.traverse(node=>{assert.ok(node.matrixWorld.elements.every(Number.isFinite));for(const attribute of Object.values(node.geometry?.attributes||{}))assert.ok(attribute.array.every(Number.isFinite));});
    assert.ok(scene.world.loadedCount>=1&&scene.world.loadedCount<=2);
  }
  scene.dispose();assert.equal(graphics.scene.children.length,0);
});
