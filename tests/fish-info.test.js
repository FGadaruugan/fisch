import test from 'node:test';
import assert from 'node:assert/strict';
import {createInitialState} from '../js/save.js';
import {applyGameMutation} from '../js/game-rules.js';
import {loadFeature} from './helpers.js';
const info=await loadFeature('../js/ui/fish-info.js');
const caught={id:'gold-1',speciesId:'r01',weightGrams:3456,islandId:'palm',caughtAt:'2026-10-15T08:00:00.000Z'};

test('Profile keeps lifetime rarity counts and the record value after every fish is sold',()=>{
  assert.equal(typeof info.getProfileInfo,'function');
  let state=createInitialState();
  for(const ticket of [{id:'normal-1',speciesId:'n01',weightGrams:100,islandId:'palm'},caught])state=applyGameMutation(state,{action:'award_catch',payload:{ticket}},{now:()=>Date.parse(caught.caughtAt)}).state;
  state=applyGameMutation(state,{action:'sell_fish',payload:{ids:state.fish.map(f=>f.id)}}).state;
  const before=structuredClone(state),profile=info.getProfileInfo(state);
  assert.equal(state.fish.length,0);
  assert.deepEqual(profile.rarities.map(r=>[r.key,r.count]),[['Normal',1],['Rare',1],['Legendary',0],['Mythic',0],['???',0]]);
  assert.equal(profile.best.name,'Golden Carp');assert.equal(profile.best.kg,'3.46');assert.equal(profile.best.value,97);
  assert.deepEqual(state,before,'reading a Profile must not change its save');
});

test('Profile island progress follows the actual XP unlock boundaries',()=>{
  assert.equal(typeof info.getProfileInfo,'function');
  const state=createInitialState();
  for(const [xp,expected]of [[0,[true,false,false,false]],[399,[true,false,false,false]],[400,[true,true,false,false]],[1599,[true,true,false,false]],[1600,[true,true,true,false]],[3599,[true,true,true,false]],[3600,[true,true,true,true]]]){
    state.totalXp=xp;
    assert.deepEqual(info.getProfileInfo(state).islands.map(island=>island.unlocked),expected);
  }
  state.lastIsland='frost';
  assert.deepEqual(info.getProfileInfo(state).islands.map(island=>island.current),[false,false,true,false]);
  assert.equal(info.getProfileInfo(createInitialState()).best,null);
});

test('Backpack details keep the actual specimen weight, price, island and catch instant',()=>{
  assert.equal(typeof info.getCatchInfo,'function');
  const first=info.getCatchInfo(caught);
  const second=info.getCatchInfo({...caught,id:'gold-2',weightGrams:7000,caughtAt:'2026-10-14T21:00:00.000Z'});
  assert.equal(first.name,'Golden Carp');assert.equal(first.rarity,'Rare');assert.equal(first.islandName,'Palm Bay');
  assert.equal(first.weightGrams,3456);assert.equal(first.kg,'3.46');assert.equal(first.value,97);
  assert.equal(first.caughtAt,'2026-10-15T08:00:00.000Z');assert.ok(first.dateLabel.length>0);
  assert.equal(second.id,'gold-2');assert.equal(second.kg,'7.00');assert.equal(second.value,196);
  assert.equal(second.caughtAt,'2026-10-14T21:00:00.000Z');
  assert.equal(info.getCatchInfo({...caught,caughtAt:'1970-01-01T00:00:00.000Z'}).caughtAt,null);
  assert.equal(info.getCatchInfo({...caught,caughtAt:'invalid'}).dateLabel,'Огноо хадгалагдаагүй');
});

test('Luck information excludes unavailable tiers before calculating island odds',()=>{
  assert.equal(typeof info.getFishingOdds,'function');
  const odds=info.getFishingOdds('palm','starter'),byTier=Object.fromEntries(odds.rarities.map(row=>[row.key,row.probability]));
  assert.equal(odds.luck,1);assert.equal(odds.islandName,'Palm Bay');
  assert.ok(Math.abs(byTier.Normal-68/99)<1e-12);assert.ok(Math.abs(byTier.Rare-25/99)<1e-12);
  assert.ok(Math.abs(byTier.Legendary-6/99)<1e-12);assert.equal(byTier.Mythic,0);assert.equal(byTier['???'],0);
});

test('Ocean Luck applies the rare-tier multiplier then normalizes the full probability',()=>{
  assert.equal(typeof info.getFishingOdds,'function');
  const odds=info.getFishingOdds('frost','ocean'),byTier=Object.fromEntries(odds.rarities.map(row=>[row.key,row.probability]));
  assert.equal(odds.luck,1.35);assert.equal(odds.rodName,'Ocean Sovereign');
  assert.ok(Math.abs(byTier.Normal-68/111.2)<1e-12);
  assert.ok(Math.abs(byTier.Rare-33.75/111.2)<1e-12);
  assert.ok(Math.abs(byTier['???']-0.135/111.2)<1e-12);
  assert.ok(Math.abs(odds.rarities.reduce((sum,row)=>sum+row.probability,0)-1)<1e-12);
});
