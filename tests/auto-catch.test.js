import test from 'node:test';
import assert from 'node:assert/strict';
import {createAutoCatch} from '../js/auto-catch.js';

function setup({canStart=()=>true}={}) {
  const state={phase:'idle',charge:0,bar:.4,target:.6};
  let presses=0,releases=0;
  const fishing={getView:()=>({...state})};
  const auto=createAutoCatch({fishing,canStart,fishPress:()=>{presses++;},release:()=>{releases++;}});
  return {auto,set(patch){Object.assign(state,patch);},counts:()=>({presses,releases})};
}

test('does not start when the start guard rejects it',()=>{
  const x=setup({canStart:()=>false});
  assert.equal(x.auto.start(),false);
  assert.equal(x.auto.enabled,false);
});

test('idle phase starts a cast once while the request is pending',async()=>{
  const x=setup();
  assert.equal(x.auto.start(),true);
  x.auto.tick();
  x.auto.tick();
  await Promise.resolve();
  assert.equal(x.counts().presses,1);
});

test('charging continues while a transient busy guard is active',()=>{
  let allowed=true;
  const x=setup({canStart:()=>allowed});
  x.auto.start();
  x.set({phase:'charging',charge:.2});
  allowed=false;
  x.auto.tick();
  assert.equal(x.counts().presses,1);
  assert.equal(x.counts().releases,0);
  x.set({charge:.99});
  x.auto.tick();
  assert.equal(x.counts().releases,1);
});

test('idle phase does not start a cast while busy',()=>{
  let allowed=false;
  const x=setup({canStart:()=>allowed});
  x.auto.enabled;
  assert.equal(x.auto.start(),false);
  x.auto.tick();
  assert.equal(x.counts().presses,0);
});

test('reeling updates held input and stop disables the loop',()=>{
  const x=setup();x.auto.start();
  x.set({phase:'reeling',bar:.4,target:.7});x.auto.tick();
  assert.equal(x.counts().presses,1);
  x.auto.stop();
  assert.equal(x.auto.enabled,false);
  assert.equal(x.counts().releases,1);
});
