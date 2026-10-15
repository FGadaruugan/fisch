import test from 'node:test';
import assert from 'node:assert/strict';
import {loadFeature} from './helpers.js';
import {stepPlayerState} from '../js/player.js';
const feature=await loadFeature('../js/navigation.js');
const make=xp=>{assert.equal(typeof feature.createNavigationModel,'function');return feature.createNavigationModel({islandId:'palm',totalXp:xp});};
test('one navigation terrain contains all real islands and bounded open water',()=>{
  const world=make(1600);
  for(const model of Object.values(world.models)){
    assert.equal(world.heightAt(model.spawn.x,model.spawn.z),model.spawn.y);
    assert.equal(world.canOccupy(model.spawn.x,model.spawn.z),true);
    assert.equal(world.islandAt(model.spawn)?.id,model.meta.id);
  }
  assert.equal(world.isWater(400,400),true);assert.equal(world.canOccupy(400,400),true);assert.equal(world.canSail(400,400),true);
  assert.equal(world.canOccupy(2100,0),false);assert.equal(world.canSail(NaN,0),false);
});
test('locked land and buildings stay solid while the surrounding sea is navigable',()=>{
  const world=make(0),coral=world.models.coral;
  assert.equal(world.canOccupy(coral.spawn.x,coral.spawn.z),false);
  world.setAccess(400);assert.equal(world.canOccupy(coral.spawn.x,coral.spawn.z),true);
  const [x,z]=coral.buildings[0];assert.equal(world.canOccupy(coral.center.x+x,coral.center.z+z),false);
  assert.equal(world.canSail(coral.spawn.x,coral.spawn.z),false);
});
test('walking enters water, swims at a bounded speed and returns to shore',()=>{
  const world=make(0),model=world.models.palm;
  const state={position:{x:400,y:2,z:400},velocityY:0,grounded:true,yaw:0,speed:0};
  stepPlayerState(state,{moveX:1,moveZ:1},.05,world);
  assert.equal(state.swimming,true);assert.ok(state.position.y<.3);assert.ok(state.speed<=4.00001);
  Object.assign(state.position,model.spawn);stepPlayerState(state,{},.05,world);
  assert.equal(state.swimming,false);assert.equal(state.position.y,model.spawn.y);assert.equal(state.grounded,true);
});
test('map positions and route bearings use the same ocean coordinates',()=>{
  assert.equal(typeof feature.projectMapPoint,'function');assert.equal(typeof feature.destinationInfo,'function');
  assert.deepEqual(feature.projectMapPoint({x:0,z:0}),{left:50,top:50});
  const coral=feature.projectMapPoint({x:-820,z:-650});assert.ok(coral.left<50&&coral.top<50);
  const route=feature.destinationInfo({x:0,z:0},'coral');assert.ok(route.distance>800&&route.distance<1100);assert.equal(route.compass,'NW');
  assert.equal(feature.destinationInfo({x:0,z:0},'missing'),null);
});
