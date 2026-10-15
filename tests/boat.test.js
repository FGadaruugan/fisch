import test from 'node:test';
import assert from 'node:assert/strict';
import {loadFeature} from './helpers.js';
const feature=await loadFeature('../js/boat.js');
const sea={canSail:(x,z)=>Math.abs(x)<80&&Math.abs(z)<80,canOccupy:(x,z)=>Math.abs(x)<80&&Math.abs(z)<80,heightAt:()=>-13};
function make(){assert.equal(typeof feature.createBoatState,'function');assert.equal(typeof feature.stepBoatState,'function');return feature.createBoatState({x:0,z:0});}
test('boat accelerates, steers and respects forward/reverse caps and frame limits',()=>{
  const state=make();for(let i=0;i<80;i++)feature.stepBoatState(state,{moveZ:1},.05,sea);
  assert.ok(state.speed>20&&state.speed<=24);assert.ok(state.position.z>25);
  const previous=state.yaw;feature.stepBoatState(state,{moveX:1},.05,sea);assert.notEqual(state.yaw,previous);
  const reverse=make();for(let i=0;i<40;i++)feature.stepBoatState(reverse,{moveZ:-1},.05,sea);assert.ok(reverse.speed>=-8&&reverse.speed<0);
  const limited=make();feature.stepBoatState(limited,{moveZ:1},1000,sea);assert.ok(limited.position.z<1);
});
test('right and left controls turn toward the corresponding vessel side at every heading',()=>{
  for(const yaw of [0,Math.PI/2,Math.PI,-Math.PI/2])for(const steer of [-1,1]){
    const state=make();state.yaw=yaw;state.speed=12;
    feature.stepBoatState(state,{moveX:steer},.05,sea);
    const rightward=state.position.x*-Math.cos(yaw)+state.position.z*Math.sin(yaw);
    assert.ok(rightward*steer>0,`steer ${steer} must move toward its vessel side at yaw ${yaw}`);
  }
});
test('hull collision and released throttle stop movement through land or sea boundary',()=>{
  const state=make();state.position.z=73;state.speed=24;
  feature.stepBoatState(state,{moveZ:1},.05,sea);assert.ok(state.position.z<75);assert.equal(state.speed,0);
  const idle=make();idle.speed=12;for(let i=0;i<100;i++)feature.stepBoatState(idle,{},.05,sea);assert.equal(idle.speed,0);
});
test('disembarking prefers reachable land and refuses an obstructed exit',()=>{
  const state=make();assert.equal(typeof feature.boatExitPosition,'function');
  const world={...sea,heightAt:x=>x>0?2:-13};const exit=feature.boatExitPosition(state,world);assert.ok(exit.x>0);assert.equal(exit.y,2);
  assert.equal(feature.boatExitPosition(state,{...world,canOccupy:()=>false}),null);
});
