import test from 'node:test';
import assert from 'node:assert/strict';
import {loadFeature,memoryStorage} from './helpers.js';
import {createLocalService} from '../js/services/local.js';
import {createInitialState,SAVE_KEY} from '../js/save.js';
import {createFavorites} from '../js/favorites.js';
const feature=await loadFeature('../js/local-import.js');
const progress=()=>({...createInitialState(),coins:500,totalXp:400,fish:[{id:'one',speciesId:'n01',weightGrams:100,islandId:'palm',caughtAt:'2026-01-01T00:00:00.000Z'}]});
function importable(service){assert.equal(typeof feature.getImportableLocalSnapshot,'function');return feature.getImportableLocalSnapshot(service);}
test('supported progress is importable without mutating game or favorites',()=>{
  const storage=memoryStorage({[SAVE_KEY]:JSON.stringify(progress())}),service=createLocalService({storage}),favorites=createFavorites({storage});
  favorites.toggle(service,'one');const before=service.getSnapshot(),raw=storage.getItem(SAVE_KEY);
  assert.deepEqual(importable(service),before);assert.deepEqual(service.getSnapshot(),before);assert.equal(storage.getItem(SAVE_KEY),raw);assert.equal(favorites.has(service,'one'),true);
});
test('unsupported and conflicting local progress is never importable',()=>{
  for(const kind of ['unsupported','conflict']){
    const storage=memoryStorage({[SAVE_KEY]:JSON.stringify(progress())}),service=createLocalService({storage});
    storage.setItem(SAVE_KEY,JSON.stringify({...progress(),coins:600,version:kind==='unsupported'?2:1}));
    assert.equal(importable(service),null);assert.equal(service.getSnapshot().coins,500);
  }
});
test('storage failure blocks import even when the current session has gained XP',async()=>{
  const storage=memoryStorage({[SAVE_KEY]:JSON.stringify(progress())});storage.setItem=()=>{throw Error('full');};
  const service=createLocalService({storage,rng:()=>0}),cast=await service.startCast('palm');await service.finishCast(cast.id,'caught');
  assert.ok(service.getSnapshot().totalXp>400);assert.equal(importable(service),null);
});
test('local incompatibility does not prevent switching to a usable account service',async()=>{
  const {createApp}=await import('../js/app.js');
  const local=createLocalService({storage:memoryStorage({[SAVE_KEY]:JSON.stringify({...progress(),version:2})})});
  const online=createLocalService({storage:memoryStorage({[SAVE_KEY]:JSON.stringify(progress())})});online.mode='online';online.ownerId='account';
  const app=createApp({service:local,favoriteStorage:memoryStorage(),worldFactory:()=>({world:{},player:{position:{}},dispose(){}}),input:{setEnabled(){},releaseAll(){},dispose(){}},fishing:{cancel(){},getView(){return{};}},view:{setBusy(){},showPanel(){},renderSnapshot(){},renderFishing(){},showNotice(){}}});
  assert.equal(importable(local),null);await app.setService(online);assert.equal(app.getService(),online);assert.equal(app.getService().getSnapshot().coins,500);app.dispose();
});
