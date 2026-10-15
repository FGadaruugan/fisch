import test from 'node:test';
import assert from 'node:assert/strict';
import * as data from '../js/data.js';
import {canVisit} from '../js/progression.js';
import {createInitialState,normalizeState,SAVE_KEY} from '../js/save.js';
import {applyGameMutation} from '../js/game-rules.js';
import {createLocalService} from '../js/services/local.js';
import {loadFeature,memoryStorage} from './helpers.js';
const trade=await loadFeature('../js/trade.js');
const ids=['n11','r09','l05','m03','u02'],position={x:958,z:504};
export function prepared(){
  const state=createInitialState();Object.assign(state,{totalXp:3600,coins:200000,lastIsland:'sanctuary',collection:[...ids]});
  state.fish=ids.map((speciesId,i)=>({id:'offering-'+i,speciesId,islandId:'sanctuary',weightGrams:data.FISH[speciesId]?.minGrams||1000,caughtAt:'2026-10-15T12:00:00.000Z'}));
  state.stats.totalCaught=5;return state;
}
const exchange=state=>applyGameMutation(state,{action:'trade_rod',payload:{rodId:'eclipse',position}});
test('Sanctuary adds exactly one fish of each rarity and unlocks at Level 7',()=>{
  assert.equal(Object.keys(data.FISH).length,30);assert.equal(Object.keys(data.ISLANDS).length,4);
  assert.deepEqual(data.speciesForIsland('sanctuary').map(f=>f.rarity),['Normal','Rare','Legendary','Mythic','???']);
  assert.equal(canVisit('sanctuary',3599),false);assert.equal(canVisit('sanctuary',3600),true);
  assert.deepEqual(data.ISLANDS.sanctuary.center,[1070,580]);
  for(const [draw,rarity]of [[.1,'Normal'],[.8,'Rare'],[.96,'Legendary'],[.995,'Mythic'],[.9999,'???']]){
    let n=0;const fish=data.sampleFish('sanctuary','starter',()=>n++?0:draw);assert.equal(data.FISH[fish.speciesId].rarity,rarity);
  }
});
test('the two ordinary new rods cost 10000 and 50000 and the secret rod cannot be bought',()=>{
  assert.equal(data.RODS.jade?.price,10000);assert.equal(data.RODS.temple?.price,50000);assert.equal(data.RODS.eclipse?.price,100000);
  let state=prepared();for(const rodId of ['jade','temple'])state=applyGameMutation(state,{action:'buy_rod',payload:{rodId}}).state;
  assert.equal(state.coins,140000);assert.throws(()=>applyGameMutation(state,{action:'buy_rod',payload:{rodId:'eclipse'}}),{code:'ROD_TRADE_ONLY'});
});
test('secret trade consumes only the lightest of each held species and preserves lifetime progress',()=>{
  const state=prepared();state.fish.push({...state.fish[0],id:'keep-heavier',weightGrams:(data.FISH.n11?.maxGrams||2000)});
  const before=structuredClone(state),{state:next,result}=exchange(state);
  assert.deepEqual(state,before);assert.equal(next.coins,100000);assert.deepEqual(next.fish.map(f=>f.id),['keep-heavier']);
  assert.ok(next.rods.includes('eclipse'));assert.equal(result.rodId,'eclipse');assert.equal(result.consumedIds.length,5);
  assert.deepEqual(next.collection,before.collection);assert.deepEqual(next.stats,before.stats);assert.equal(next.totalXp,3600);
  assert.throws(()=>exchange(next),{code:'ROD_ALREADY_OWNED'});
});
test('sold collection entries and duplicate species do not satisfy the five held offerings',()=>{
  for(const state of [Object.assign(prepared(),{fish:[]}),(()=>{const s=prepared();s.fish[4]={...s.fish[0],id:'duplicate-kind'};return s;})()]){
    const before=structuredClone(state);assert.throws(()=>exchange(state),{code:'MISSING_TRADE_FISH'});assert.deepEqual(state,before);
  }
});
test('exchange rejects level, funds, island and malformed or distant locations atomically',()=>{
  for(const [patch,code]of [[{totalXp:3599},'TRADE_LEVEL_REQUIRED'],[{coins:99999},'NOT_ENOUGH_COINS'],[{lastIsland:'palm'},'TRADE_LOCATION_REQUIRED']]){
    const state=Object.assign(prepared(),patch),before=structuredClone(state);assert.throws(()=>exchange(state),{code});assert.deepEqual(state,before);
  }
  for(const point of [null,{},[],{x:NaN,z:504},{x:Infinity,z:504},{x:965,z:504},{x:0,z:0}]){
    assert.throws(()=>applyGameMutation(prepared(),{action:'trade_rod',payload:{rodId:'eclipse',position:point}}),{code:'TRADE_LOCATION_REQUIRED'});
  }
});
test('secret trade information describes the actual Backpack rather than the collection',()=>{
  assert.equal(typeof trade.getSecretTradeInfo,'function');assert.equal(typeof trade.secretTradePoint,'function');
  assert.deepEqual(trade.secretTradePoint(),position);
  const state=prepared();let info=trade.getSecretTradeInfo(state);assert.equal(info.ready,true);assert.equal(info.requirements.length,5);
  state.fish.pop();info=trade.getSecretTradeInfo(state);assert.equal(info.ready,false);assert.equal(info.requirements.filter(r=>r.fish).length,4);
});
test('Local secret exchange retries do not charge twice and a reload retains all new content',async()=>{
  const storage=memoryStorage({[SAVE_KEY]:JSON.stringify(prepared())}),service=createLocalService({storage});
  assert.equal(typeof service.tradeRod,'function');
  await service.tradeRod('eclipse',position,'trade-one');await service.tradeRod('eclipse',position,'trade-one');
  const state=service.getSnapshot();assert.equal(state.coins,100000);assert.equal(state.fish.length,0);
  const restored=createLocalService({storage}).getSnapshot();assert.deepEqual(restored,state);assert.equal(restored.lastIsland,'sanctuary');
  assert.deepEqual(normalizeState(prepared()).fish.map(f=>f.speciesId),ids);
});
