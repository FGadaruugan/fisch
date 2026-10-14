import test from 'node:test';
import assert from 'node:assert/strict';
import {loadFeature} from './helpers.js';
const terrain=await loadFeature('../js/terrain.js'),player=await loadFeature('../js/player.js'),inputs=await loadFeature('../js/input.js');
const flat={heightAt:()=>1,isWalkable:(x,z)=>Math.hypot(x,z)<10};
function state(){return{position:{x:0,y:1,z:0},velocityY:0,grounded:true,yaw:0,speed:0};}
test('diagonal movement does not exceed axial movement speed',()=>{
  assert.equal(typeof player.stepPlayerState,'function');
  const a=state(),b=state();player.stepPlayerState(a,{moveX:1,moveZ:0},0.05,flat);player.stepPlayerState(b,{moveX:1,moveZ:1},0.05,flat);
  assert.ok(Math.abs(Math.hypot(a.position.x,a.position.z)-Math.hypot(b.position.x,b.position.z))<1e-9);
  assert.ok(Math.hypot(a.position.x,a.position.z)<=0.275001);
});
test('collision keeps the player on land and jumping lands on the terrain',()=>{
  assert.equal(typeof player.stepPlayerState,'function');const p=state();p.position.x=9.99;
  player.stepPlayerState(p,{moveX:1,moveZ:0},0.05,flat);assert.ok(p.position.x<10);
  player.stepPlayerState(p,{jumpPressed:true},0.05,flat);assert.ok(p.position.y>1);
  for(let i=0;i<100;i++)player.stepPlayerState(p,{},0.05,flat);
  assert.equal(p.position.y,1);assert.equal(p.grounded,true);
  player.stepPlayerState(p,{moveX:1},1000,flat);assert.ok(p.position.x<10);
});
test('all large islands have walkable spawns and impassable distant ocean',()=>{
  assert.equal(typeof terrain.createTerrainModel,'function');
  for(const id of ['palm','coral','frost']){const m=terrain.createTerrainModel(id);assert.equal(m.isWalkable(m.spawn.x,m.spawn.z),true);assert.equal(m.isWalkable(m.center.x+1000,m.center.z+1000),false);assert.ok(m.radius>=160);assert.ok(m.heightAt(m.spawn.x,m.spawn.z)>0);}
});
test('pointercancel and disabling controls release held fishing input',()=>{
  assert.equal(typeof inputs.createInput,'function');
  const w=new EventTarget(),canvas=new EventTarget(),action=new EventTarget();
  const input=inputs.createInput({window:w,canvas,action});input.setEnabled(true);
  const fire=(target,type,fields={})=>{const e=new Event(type,{cancelable:true});Object.assign(e,fields);target.dispatchEvent(e);};
  fire(action,'pointerdown',{pointerId:4});assert.equal(input.getSnapshot().actionHeld,true);
  fire(w,'pointercancel',{pointerId:4});assert.equal(input.getSnapshot().actionHeld,false);
  fire(action,'pointerdown',{pointerId:5});input.setEnabled(false);assert.equal(input.getSnapshot().actionHeld,false);
  input.dispose();
});
