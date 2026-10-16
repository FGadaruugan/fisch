import test from 'node:test';
import assert from 'node:assert/strict';
import {memoryStorage,loadFeature} from './helpers.js';
import {SAVE_KEY,createInitialState,normalizeState} from '../js/save.js';
const feature=await loadFeature('../js/storage.js');
const BACKUP=SAVE_KEY+'.backup',RECOVERY=SAVE_KEY+'.recovery';
const saved=()=>normalizeState({...createInitialState(),coins:9876,totalXp:1600,lastIsland:'frost',fish:[{id:'kept',speciesId:'r01',weightGrams:3420,islandId:'palm',caughtAt:'2026-01-01T00:00:00.000Z'}]});
function fixture(initial={},failKey){
  const storage=memoryStorage(initial),codes=[],baseSet=storage.setItem;
  storage.setItem=(key,value)=>{if(key===failKey)throw Error('quota');baseSet(key,value);};
  assert.equal(typeof feature.createSaveStorage,'function');
  const boundary=feature.createSaveStorage({storage,onError:code=>codes.push(code)});
  return {storage,codes,boundary};
}
test('valid progress is normalized without writes and old primary becomes backup',()=>{
  const raw=JSON.stringify(saved()),{storage,boundary}=fixture({[SAVE_KEY]:raw});
  assert.deepEqual(boundary.load(),normalizeState(saved()));assert.equal(storage.getItem(BACKUP),null);
  assert.equal(boundary.write({...boundary.load(),coins:10000}),true);
  assert.equal(storage.getItem(BACKUP),raw);assert.equal(JSON.parse(storage.getItem(SAVE_KEY)).coins,10000);
  assert.equal(boundary.getStatus().canImport,true);
});
test('unknown versions are protected even when a valid old backup exists',()=>{
  for(const version of [2,99,'1']){
    const raw=JSON.stringify({...saved(),version}),{storage,boundary,codes}=fixture({[SAVE_KEY]:raw,[BACKUP]:JSON.stringify(saved())});
    assert.equal(boundary.load().coins,0);assert.deepEqual(boundary.getStatus(),{kind:'unsupported',writable:false,canImport:false});
    assert.equal(boundary.write(createInitialState()),false);assert.equal(storage.getItem(SAVE_KEY),raw);assert.ok(codes.includes('SAVE_INCOMPATIBLE'));
  }
});
test('damaged primary recovers good backup and quarantines exact damaged bytes before replacing',()=>{
  const raw='{broken',backup=JSON.stringify(saved()),{storage,boundary,codes}=fixture({[SAVE_KEY]:raw,[BACKUP]:backup});
  assert.equal(boundary.load().coins,9876);assert.equal(storage.getItem(SAVE_KEY),raw);
  assert.ok(codes.includes('SAVE_RECOVERED'));assert.equal(boundary.write({...boundary.load(),coins:9999}),true);
  assert.equal(storage.getItem(RECOVERY),raw);assert.equal(storage.getItem(BACKUP),backup);
});
test('missing primary restores existing backup',()=>{
  const {boundary,codes}=fixture({[BACKUP]:JSON.stringify(saved())});
  assert.equal(boundary.load().coins,9876);assert.ok(codes.includes('SAVE_RECOVERED'));
});
test('damaged and incompatible backups are not falsely recovered or overwritten',()=>{
  for(const raw of ['{bad','null','[]',JSON.stringify({version:2,coins:9999})]){
    const {storage,boundary,codes}=fixture({[SAVE_KEY]:'{bad-primary',[BACKUP]:raw});
    assert.equal(boundary.load().coins,0);assert.equal(codes.includes('SAVE_RECOVERED'),false);
    assert.equal(boundary.write(createInitialState()),false);assert.equal(storage.getItem(BACKUP),raw);assert.equal(storage.getItem(SAVE_KEY),'{bad-primary');
  }
});
test('quarantine failure cannot replace damaged primary or good backup',()=>{
  const backup=JSON.stringify(saved()),{storage,boundary}=fixture({[SAVE_KEY]:'bad',[BACKUP]:backup},RECOVERY);
  boundary.load();assert.equal(boundary.write(saved()),false);assert.equal(storage.getItem(SAVE_KEY),'bad');assert.equal(storage.getItem(BACKUP),backup);
});
test('occupied recovery slot is not overwritten with different damaged bytes',()=>{
  const {storage,boundary}=fixture({[SAVE_KEY]:'bad',[RECOVERY]:'older evidence'});
  boundary.load();assert.equal(boundary.write(saved()),false);assert.equal(storage.getItem(RECOVERY),'older evidence');assert.equal(storage.getItem(SAVE_KEY),'bad');
});
test('backup or primary write failure preserves last durable progress',()=>{
  for(const key of [BACKUP,SAVE_KEY]){
    const raw=JSON.stringify(saved()),{storage,boundary,codes}=fixture({[SAVE_KEY]:raw},key);
    boundary.load();assert.equal(boundary.write({...saved(),coins:1}),false);assert.equal(storage.getItem(SAVE_KEY),raw);
    assert.ok(codes.includes('SAVE_UNAVAILABLE'));assert.equal(boundary.getStatus().canImport,false);
    if(key===SAVE_KEY)assert.equal(storage.getItem(BACKUP),raw);
  }
});
test('stale writer detects another committed save and remains blocked',()=>{
  const {storage,boundary:a}=fixture({[SAVE_KEY]:JSON.stringify(saved())}),b=feature.createSaveStorage({storage});
  a.load();b.load();assert.equal(a.write({...saved(),coins:12}),true);const latest=storage.getItem(SAVE_KEY);
  assert.equal(b.write({...saved(),coins:13}),false);assert.equal(b.getStatus().kind,'conflict');assert.equal(storage.getItem(SAVE_KEY),latest);
  assert.equal(b.write(saved()),false);
});
test('future save introduced after load blocks both writes and import eligibility',()=>{
  const {storage,boundary}=fixture({[SAVE_KEY]:JSON.stringify(saved())});boundary.load();
  const future=JSON.stringify({...saved(),version:2});storage.setItem(SAVE_KEY,future);
  assert.equal(boundary.getStatus().canImport,false);assert.equal(boundary.write(saved()),false);assert.equal(storage.getItem(SAVE_KEY),future);
});
test('unavailable storage and a new empty profile remain usable without uncaught exceptions',()=>{
  const codes=[],boundary=feature.createSaveStorage({storage:{getItem(){throw Error('denied');}},onError:code=>codes.push(code)});
  assert.deepEqual(boundary.load(),createInitialState());assert.equal(boundary.write(saved()),false);assert.ok(codes.includes('SAVE_UNAVAILABLE'));
  const empty=fixture();assert.deepEqual(empty.boundary.load(),createInitialState());assert.equal(empty.boundary.write(saved()),true);
});
test('malformed v1 backup cannot masquerade as a recovered empty profile',()=>{
  for(const data of [{version:1},{...saved(),coins:'9876'},{...saved(),fish:'corrupt'}]){
    const raw=JSON.stringify(data),{storage,boundary,codes}=fixture({[SAVE_KEY]:'broken',[BACKUP]:raw});
    boundary.load();assert.equal(codes.includes('SAVE_RECOVERED'),false);assert.equal(boundary.getStatus().canImport,false);
    assert.equal(boundary.write(createInitialState()),false);assert.equal(storage.getItem(BACKUP),raw);
  }
});
test('unrecoverable primary gives a damage notice rather than silently starting over',()=>{
  const {boundary,codes}=fixture({[SAVE_KEY]:'broken'});boundary.load();
  assert.ok(codes.includes('SAVE_DAMAGED'));assert.equal(codes.includes('SAVE_RECOVERED'),false);
});
test('recovery notice reports restored progress and corrupt hearts do not claim a save recovery',async()=>{
  const {messageFor}=await import('../js/errors.js');
  const {createFavorites}=await import('../js/favorites.js');
  const codes=[],favorites=createFavorites({storage:memoryStorage({'fisch3d.favorites.v1.local':'broken'}),onError:c=>codes.push(c)});
  favorites.has({mode:'local'},'fish');assert.equal(codes.includes('SAVE_RECOVERED'),false);
  assert.ok(messageFor(codes[0]).includes('Зүрх'));
  assert.ok(messageFor('SAVE_RECOVERED').includes('нөөцөөс'));
});
