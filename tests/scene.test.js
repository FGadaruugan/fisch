import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {FISH,ISLANDS} from '../js/data.js';
import {createWorld} from '../js/world.js';
import {createPlayer} from '../js/player.js';
import {createFishingRig} from '../js/fishing-rig.js';
import {createFishModel} from '../js/models/fish.js';
import {QUALITY_LEVELS} from '../js/performance.js';
function finiteGeometry(root){
  let vertices=0;root.updateMatrixWorld(true);
  root.traverse(node=>{
    assert.ok(node.matrixWorld.elements.every(Number.isFinite),'finite scene transforms');
    if(!node.geometry)return;
    for(const attribute of Object.values(node.geometry.attributes))assert.ok(attribute.array.every(Number.isFinite),'finite geometry attributes');
    vertices+=node.geometry.attributes.position?.count||0;
  });assert.ok(vertices>0);
}
test('all 30 procedural fish construct, animate and release actual Three.js geometry',()=>{
  for(const fish of Object.values(FISH)){const model=createFishModel(THREE,fish.id);model.animate(0.05);finiteGeometry(model.group);model.dispose();}
});
test('all four large worlds integrate player, fishing rig and quality changes without invalid geometry',()=>{
  for(const island of Object.values(ISLANDS)){
    const world=createWorld(THREE,island.id),player=createPlayer(THREE,world),rig=createFishingRig(THREE,player);
    const point={x:island.center[0],y:2.2,z:island.center[1]+island.radius*1.12},spot=world.fishingSpot(point);assert.ok(spot);
    Object.assign(player.position,point);player.faceDirection(spot.direction);player.tick({},0.05,'waiting');
    rig.setSpot(spot);rig.update(0.05,{phase:'waiting'},1,QUALITY_LEVELS[2]);finiteGeometry(rig.group);finiteGeometry(world.group);
    world.setQuality(QUALITY_LEVELS[0],{particles:true});world.update(0.05,player.position);finiteGeometry(world.group);
    rig.dispose();player.dispose();world.dispose();
  }
});
