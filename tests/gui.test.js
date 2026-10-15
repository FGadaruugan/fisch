import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeSettings} from '../js/performance.js';
import {loadFeature} from './helpers.js';
const gui=await loadFeature('../js/gui.js');

test('GUI choices start on, survive a settings reload and ignore malformed or protected flags',()=>{
  const fresh=normalizeSettings();
  for(const key of ['showStats','showCoins','showConnection','showLocation','showRod','showContextHint','showControlsHint','showCatchNotice'])assert.equal(fresh[key],true,key);
  const saved=normalizeSettings({quality:'low',showStats:false,showCoins:false,showRod:false,showLocation:'false',showButtons:false,showFishingHud:false});
  const restored=normalizeSettings(JSON.parse(JSON.stringify(saved)));
  assert.equal(restored.showCoins,false);assert.equal(restored.showRod,false);assert.equal(restored.showStats,false);
  assert.equal(restored.showLocation,true);assert.equal(restored.showButtons,undefined);assert.equal(restored.showFishingHud,undefined);
  assert.equal(restored.quality,'low');
});

function node(key,{hidden=false,button=false,nestedButton=false}={}){
  const attributes=new Set();
  return{dataset:{gui:key},hidden,matches:()=>button,querySelector:()=>nestedButton?{}:null,
    toggleAttribute(name,enabled){if(enabled)attributes.add(name);else attributes.delete(name);},
    hasAttribute:name=>attributes.has(name)};
}
function root(nodes,controls=[]){return{querySelectorAll:selector=>selector==='[data-gui]'?nodes:controls};}

test('GUI visibility composes with a timed catch notice without changing its lifecycle',()=>{
  assert.equal(typeof gui.applyGuiVisibility,'function');
  const coins=node('coins'),catchNotice=node('catchNotice',{hidden:true});
  const shell=root([coins,catchNotice]);
  gui.applyGuiVisibility(shell,normalizeSettings({showCoins:false,showCatchNotice:false}));
  assert.equal(coins.hasAttribute('data-gui-hidden'),true);
  assert.equal(catchNotice.hasAttribute('data-gui-hidden'),true);
  gui.applyGuiVisibility(shell,normalizeSettings());
  assert.equal(coins.hasAttribute('data-gui-hidden'),false);
  assert.equal(catchNotice.hasAttribute('data-gui-hidden'),false);
  assert.equal(catchNotice.hidden,true,'turning a GUI on must not resurrect an expired notice');
});

test('hiding information cannot hide a button or its container and restoring GUI updates its switches',()=>{
  assert.equal(typeof gui.applyGuiVisibility,'function');
  const button=node('coins',{button:true}),menu=node('location',{nestedButton:true}),unknown=node('buttons');
  const control={dataset:{setting:'showCoins'},checked:true};
  const shell=root([button,menu,unknown],[control]);
  gui.applyGuiVisibility(shell,normalizeSettings({showCoins:false,showLocation:false}));
  for(const element of [button,menu,unknown])assert.equal(element.hasAttribute('data-gui-hidden'),false);
  assert.equal(control.checked,false);
  gui.applyGuiVisibility(shell,normalizeSettings());
  assert.equal(control.checked,true);
});
