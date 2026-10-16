import test from 'node:test';
import assert from 'node:assert/strict';
import {memoryStorage,loadFeature} from './helpers.js';
const local=await loadFeature('../js/services/local.js');
const saves=await loadFeature('../js/save.js');
function service(options={}) { assert.equal(typeof local.createLocalService,'function'); return local.createLocalService({storage:memoryStorage(),now:()=>1700000000000,rng:()=>0,...options}); }

test('finishing the same live cast twice awards one catch and one XP reward',async()=>{
  const game=service(); const ticket=await game.startCast('palm');
  const caught=await game.finishCast(ticket.id,'caught');
  assert.equal(caught.speciesId,'n01');
  assert.equal(game.getSnapshot().fish.length,1);
  assert.equal(game.getSnapshot().totalXp,12);
  assert.equal(await game.finishCast(ticket.id,'caught'),null);
  assert.equal(game.getSnapshot().totalXp,12);
});
test('a cancelled or escaped cast cannot award a fish',async()=>{
  const game=service(),ticket=await game.startCast('palm');
  await game.cancelCast(ticket.id);
  assert.equal(await game.finishCast(ticket.id,'caught'),null);
  const next=await game.startCast('palm');
  await game.finishCast(next.id,'escaped');
  assert.equal(game.getSnapshot().fish.length,0);
});
test('selling is idempotent and preserves lifetime stats and collection',async()=>{
  const game=service(); const ticket=await game.startCast('palm'),caught=await game.finishCast(ticket.id,'caught');
  await game.sellFish([caught.id],'sale-1'); await game.sellFish([caught.id],'sale-1');
  const state=game.getSnapshot();
  assert.equal(state.coins,1); assert.equal(state.fish.length,0); assert.equal(state.totalXp,12);
  assert.equal(state.stats.totalCaught,1); assert.equal(state.stats.bestCatch.weightGrams,100);
  assert.deepEqual(state.collection,['n01']);
});
test('Backpack capacity and locked islands prevent starting invalid casts',async()=>{
  assert.equal(typeof saves.createInitialState,'function');
  const state=saves.createInitialState();
  state.fish=Array.from({length:100},(_,i)=>({id:`fish-${i}`,speciesId:'n01',weightGrams:100,islandId:'palm',caughtAt:'2026-01-01T00:00:00.000Z'}));
  const game=service({storage:memoryStorage({'fisch3d.save.v1':JSON.stringify(state)})});
  await assert.rejects(game.startCast('palm'),{code:'BACKPACK_FULL'});
  await assert.rejects(service().startCast('frost'),{code:'ISLAND_LOCKED'});
});
test('buying and equipping enforce ownership and never spend twice on retry',async()=>{
  const state=saves.createInitialState?.(); assert.ok(state);
  state.coins=200;
  const game=service({storage:memoryStorage({'fisch3d.save.v1':JSON.stringify(state)})});
  await game.buyRod('river','buy-1'); await game.buyRod('river','buy-1'); await game.equipRod('river');
  assert.equal(game.getSnapshot().coins,50); assert.equal(game.getSnapshot().equippedRod,'river');
  await assert.rejects(game.buyRod('ocean','buy-2'),{code:'NOT_ENOUGH_COINS'});
  await assert.rejects(game.equipRod('ocean'),{code:'ROD_NOT_OWNED'});
});
test('saved progress survives reload and external snapshots cannot change it',async()=>{
  const storage=memoryStorage(),game=service({storage});
  const ticket=await game.startCast('palm');await game.finishCast(ticket.id,'caught');
  game.getSnapshot().coins=999999;
  assert.equal(game.getSnapshot().coins,0);
  const reload=service({storage});assert.equal(reload.getSnapshot().fish.length,1);
  assert.equal(reload.getSnapshot().totalXp,12);
  assert.equal(await reload.finishCast(ticket.id,'caught'),null);
});
test('storage failure retains usable progress',async()=>{
  const codes=[];const game=service({storage:{getItem(){throw Error('denied');},setItem(){throw Error('denied');}},onStorageError:code=>codes.push(code)});
  const ticket=await game.startCast('palm');await game.finishCast(ticket.id,'caught');
  assert.equal(game.getSnapshot().fish.length,1);assert.ok(codes.includes('SAVE_UNAVAILABLE'));
});
test('prototype names are not accepted as purchasable rods',async()=>{
  const game=service();await assert.rejects(game.buyRod('constructor','bad-prototype'),{code:'INVALID_ROD'});
});

test('future local saves cannot be changed or cast from, even with an older backup',async()=>{
  const raw=JSON.stringify({...saves.createInitialState(),version:2,coins:9876}),storage=memoryStorage({[saves.SAVE_KEY]:raw,[saves.SAVE_KEY+'.backup']:JSON.stringify(saves.createInitialState())});
  const game=service({storage});
  await assert.rejects(game.updateProfile({name:'No overwrite',avatar:0}),{code:'SAVE_INCOMPATIBLE'});
  await assert.rejects(game.startCast('palm'),{code:'SAVE_INCOMPATIBLE'});
  assert.equal(storage.getItem(saves.SAVE_KEY),raw);assert.equal(game.getPersistenceStatus().canImport,false);
});
test('a full populated v1 save survives normalization, mutation and reload',async()=>{
  const state={...saves.createInitialState(),coins:10000,totalXp:3600,lastIsland:'sanctuary',rods:['starter','river'],equippedRod:'river',fish:[{id:'gold-kept',speciesId:'r01',islandId:'palm',weightGrams:3420,caughtAt:'2026-01-01T00:00:00.000Z'}]};
  const storage=memoryStorage({[saves.SAVE_KEY]:JSON.stringify(state)}),game=service({storage});
  await game.updateProfile({name:'Preserved',avatar:2});
  const expected=saves.normalizeState({...state,profile:{name:'Preserved',avatar:2}});
  assert.deepEqual(service({storage}).getSnapshot(),expected);
  assert.equal(storage.getItem(saves.SAVE_KEY+'.backup'),JSON.stringify(state));
});
test('local service restores a good backup without erasing damaged source during load',async()=>{
  const backup={...saves.createInitialState(),coins:6789},storage=memoryStorage({[saves.SAVE_KEY]:'bad-json',[saves.SAVE_KEY+'.backup']:JSON.stringify(backup)}),codes=[];
  const game=service({storage,onStorageError:c=>codes.push(c)});
  assert.equal(game.getSnapshot().coins,6789);assert.equal(storage.getItem(saves.SAVE_KEY),'bad-json');assert.ok(codes.includes('SAVE_RECOVERED'));
  await game.updateProfile({name:'Recovered',avatar:0});assert.equal(storage.getItem(saves.SAVE_KEY+'.recovery'),'bad-json');
  assert.equal(service({storage}).getSnapshot().coins,6789);
});
test('quota failure retains both usable session progress and previous durable save',async()=>{
  const raw=JSON.stringify(saves.createInitialState()),storage=memoryStorage({[saves.SAVE_KEY]:raw});storage.setItem=()=>{throw Error('quota');};
  const game=service({storage}),ticket=await game.startCast('palm');await game.finishCast(ticket.id,'caught');
  assert.equal(game.getSnapshot().fish.length,1);assert.equal(storage.getItem(saves.SAVE_KEY),raw);assert.equal(game.getPersistenceStatus().canImport,false);
});
test('stale local session rejects mutations before changing its state or awarding a pending catch',async()=>{
  const storage=memoryStorage(),a=service({storage}),b=service({storage});
  const pending=await b.startCast('palm');await a.updateProfile({name:'Other tab',avatar:1});const before=b.getSnapshot();
  await assert.rejects(b.updateProfile({name:'Stale',avatar:0}),{code:'SAVE_CONFLICT'});
  await assert.rejects(b.finishCast(pending.id,'caught'),{code:'SAVE_CONFLICT'});assert.deepEqual(b.getSnapshot(),before);
});
