import test from 'node:test';
import assert from 'node:assert/strict';
import {loadFeature} from './helpers.js';
import {DEFAULT_SETTINGS} from '../js/performance.js';
const feature=await loadFeature('../js/settings/controller.js');
function fixture(initial={}){const data=new Map(Object.entries(initial));return {getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value),data};}
function controller(storage=fixture()){assert.equal(typeof feature.createSettingsController,'function');return feature.createSettingsController({storage});}
test('presets change graphics only, and Undo restores the entire previous settings',()=>{
  const c=controller();c.edit({volume:.8,showStats:false,timeOfDay:19});const before=c.getState().settings;
  c.preset('economy');assert.equal(c.getState().settings.quality,'low');assert.equal(c.getState().settings.targetFps,30);
  for(const key of ['volume','showStats','timeOfDay'])assert.equal(c.getState().settings[key],before[key]);
  c.undo();assert.deepEqual(c.getState().settings,before);assert.equal(c.getState().canUndo,false);
});
test('a slider gesture is one Undo transaction and a category reset stays in its category',()=>{
  const c=controller();c.edit({volume:.7});
  c.edit({renderScale:.8},{transaction:'renderScale',commit:false});c.edit({renderScale:.9},{transaction:'renderScale',commit:false});c.edit({renderScale:1.2},{transaction:'renderScale',commit:true});
  c.undo();assert.equal(c.getState().settings.renderScale,DEFAULT_SETTINGS.renderScale);assert.equal(c.getState().settings.volume,.7);
  c.edit({quality:'high',showStats:false});c.reset('graphics');assert.equal(c.getState().settings.quality,'auto');assert.equal(c.getState().settings.showStats,false);
  c.undo();assert.equal(c.getState().settings.quality,'high');
});
test('three named profiles contain normalized settings only and survive reopening',()=>{
  const storage=fixture(),c=controller(storage);c.edit({volume:.6,coins:999,fish:[1],renderScale:99});
  assert.equal(c.saveProfile(' '),false);assert.equal(c.saveProfile('abcdefghijklmnopqrs'),false);
  for(const name of ['Аялал','Утас','Desktop'])assert.equal(c.saveProfile(name),true);
  assert.equal(c.saveProfile('Fourth'),false);const state=c.getState();assert.equal(state.profiles.length,3);
  const again=controller(storage);again.edit({volume:0});again.loadProfile(state.profiles[0].id);assert.equal(again.getState().settings.volume,.6);
  assert.equal(again.getState().settings.renderScale,1.5);assert.equal(Object.hasOwn(again.getState().settings,'coins'),false);
  assert.equal(again.deleteProfile(state.profiles[1].id),true);assert.equal(controller(storage).getState().profiles.length,2);
});
test('corrupt profiles and persistence errors never alter game save or report a saved profile',()=>{
  const storage=fixture({'fisch3d.settings.profiles.v1':'{bad','fisch3d.save.v1':'keep'}),errors=[];
  const c=feature.createSettingsController({storage,onError:code=>errors.push(code)});assert.deepEqual(c.getState().profiles,[]);
  storage.setItem=()=>{throw new Error('quota');};assert.equal(c.saveProfile('Утас'),false);assert.deepEqual(c.getState().profiles,[]);
  c.edit({volume:.9});assert.equal(c.getState().settings.volume,.9);assert.ok(errors.includes('SAVE_UNAVAILABLE'));assert.equal(storage.data.get('fisch3d.save.v1'),'keep');
});
test('graphics receives only edited values so volume and profile management cannot rewind live time',()=>{
  assert.equal(typeof feature.changedSettings,'function');const c=controller(),patches=[];let before=c.getState().settings;
  c.subscribe(state=>{patches.push(feature.changedSettings(before,state.settings));before=state.settings;});
  c.edit({volume:.2});c.saveProfile('Утас');c.preset('economy');
  assert.deepEqual(patches[0],{volume:.2});assert.deepEqual(patches[1],{});assert.equal(Object.hasOwn(patches[2],'timeOfDay'),false);
  c.edit({timeOfDay:16});assert.deepEqual(patches.at(-1),{timeOfDay:16});
});
