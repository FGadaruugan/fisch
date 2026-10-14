import test from 'node:test';
import assert from 'node:assert/strict';
import {loadFeature} from './helpers.js';
const saves=await loadFeature('../js/save.js');
test('corrupt or incompatible saves recover to a playable initial profile',()=>{
  assert.equal(typeof saves.normalizeState,'function');
  for(const input of [null,[],{version:99},{version:1,coins:-5,totalXp:Infinity,lastIsland:'frost',fish:[{speciesId:'bad'}]}]){
    const state=saves.normalizeState(input);
    assert.equal(state.coins,0);assert.equal(state.totalXp,0);assert.equal(state.lastIsland,'palm');
    assert.equal(state.equippedRod,'starter');assert.deepEqual(state.fish,[]);
  }
});
test('invalid catches and duplicate IDs cannot enter a restored Backpack',()=>{
  assert.equal(typeof saves.normalizeState,'function');
  const valid={id:'ok-1',speciesId:'r01',weightGrams:3420,islandId:'palm',caughtAt:'2026-01-01T00:00:00.000Z'};
  const state=saves.normalizeState({version:1,fish:[valid,valid,{...valid,id:'bad-1',weightGrams:-1},{...valid,id:'bad-2',speciesId:'u01'},{...valid,id:'<img>',weightGrams:100000}],rods:['bad'],equippedRod:'ocean',profile:{name:'  fisher  ',avatar:999}});
  assert.equal(state.fish.length,1);assert.equal(state.fish[0].weightGrams,3420);
  assert.equal(state.equippedRod,'starter');assert.equal(state.profile.name,'fisher');assert.equal(state.profile.avatar,0);
});
test('legitimate XP unlocks restored islands while unknown destinations fall back',()=>{
  assert.equal(typeof saves.normalizeState,'function');
  assert.equal(saves.normalizeState({version:1,totalXp:1600,lastIsland:'frost'}).lastIsland,'frost');
  assert.equal(saves.normalizeState({version:1,totalXp:1600,lastIsland:'missing'}).lastIsland,'palm');
});
test('prototype property names in damaged saves are rejected as unknown species',()=>{
  assert.doesNotThrow(()=>saves.normalizeState({version:1,fish:[{id:'bad',speciesId:'__proto__',weightGrams:100}]}));
  assert.equal(saves.normalizeState({version:1,fish:[{id:'bad',speciesId:'__proto__',weightGrams:100}]}).fish.length,0);
});
