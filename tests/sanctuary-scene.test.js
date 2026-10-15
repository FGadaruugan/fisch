import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createTerrainModel} from '../js/terrain.js';
import {createNavigationModel} from '../js/navigation.js';
import {createOcean} from '../js/ocean.js';
import {createWorld} from '../js/world.js';
import {loadFeature} from './helpers.js';
const feature=await loadFeature('../js/models/sanctuary.js');
test('the hidden shrine is reachable on unlocked land and the ruin columns remain solid',()=>{
  const model=createTerrainModel('sanctuary');assert.ok(model.secret);assert.ok(model.secret.y>.6);assert.equal(model.isWalkable(model.secret.x,model.secret.z),true);
  const world=createNavigationModel({totalXp:3599});assert.equal(world.canOccupy(model.secret.x,model.secret.z),false);
  world.setAccess(3600);world.setIsland('sanctuary');assert.deepEqual(world.secret,model.secret);
  for(let i=0;i<=100;i++){
    const t=i/100,x=model.spawn.x+(model.secret.x-model.spawn.x)*t,z=model.spawn.z+(model.secret.z-model.spawn.z)*t;
    assert.equal(world.canOccupy(x,z),true,'the port-to-shrine walking approach stays open');
  }
  for(const [x,z]of model.ruinColumns)assert.equal(world.canOccupy(model.center.x+x,model.center.z+z),false);
});
test('Sanctuary ruins and its secret trader construct finite geometry with owned disposal',()=>{
  assert.equal(typeof feature.createSanctuary,'function');
  const world=createWorld(THREE,'sanctuary');assert.ok(world.group.getObjectByName('secret-trader'));
  world.group.updateMatrixWorld(true);let meshes=0,disposed=0;
  world.group.traverse(node=>{assert.ok(node.matrixWorld.elements.every(Number.isFinite));if(node.geometry){meshes++;for(const attr of Object.values(node.geometry.attributes))assert.ok(attr.array.every(Number.isFinite));node.geometry.addEventListener('dispose',()=>disposed++);}});
  assert.ok(meshes>0);world.dispose();assert.ok(disposed>0);
});
test('ocean shader shoreline inputs and loop cover all four island centers',()=>{
  const ocean=createOcean(THREE),material=ocean.mesh.material;
  assert.equal(material.uniforms.uCenters.value.length,4);
  const arraySize=Number(material.fragmentShader.match(/uCenters\[(\d+)\]/)[1]),loopSize=Number(material.fragmentShader.match(/i<(\d+)/)[1]);
  assert.equal(arraySize,4);assert.equal(loopSize,4);ocean.dispose();
});
