import test from 'node:test';
import assert from 'node:assert/strict';
let createFullscreenControl;try{({createFullscreenControl}=await import('../js/fullscreen.js'));}catch(error){if(error.code!=='ERR_MODULE_NOT_FOUND')throw error;}
function fixture(){
  const doc=new EventTarget();doc.body={dataset:{}};doc.fullscreenElement=null;doc.fullscreenEnabled=true;
  const attributes=new Map(),button={hidden:false,setAttribute:(key,value)=>attributes.set(key,value)};let requests=0,resizes=0,unavailable=0;
  doc.documentElement={requestFullscreen(options){requests++;assert.equal(options.navigationUI,'hide');doc.fullscreenElement=this;doc.dispatchEvent(new Event('fullscreenchange'));return Promise.resolve();}};
  doc.exitFullscreen=()=>{doc.fullscreenElement=null;doc.dispatchEvent(new Event('fullscreenchange'));return Promise.resolve();};
  assert.equal(typeof createFullscreenControl,'function');
  const control=createFullscreenControl({document:doc,button,onResize:()=>resizes++,onUnavailable:()=>unavailable++});
  return {doc,control,button,attributes,get requests(){return requests;},get resizes(){return resizes;},get unavailable(){return unavailable;}};
}
test('fullscreen requests run immediately on a user action and synchronize the exit control',async()=>{
  const f=fixture(),pending=f.control.enter();assert.equal(f.requests,1,'keep the browser user activation');assert.equal(await pending,true);
  assert.equal(f.doc.body.dataset.fullscreen,'true');assert.equal(f.attributes.get('aria-pressed'),'true');assert.equal(f.button.textContent,'↙');
  await f.control.toggle();assert.equal(f.doc.fullscreenElement,null);assert.equal(f.attributes.get('aria-pressed'),'false');assert.equal(f.button.textContent,'⛶');assert.equal(f.resizes,2);
});
test('a denied fullscreen request leaves the game usable and permits another attempt',async()=>{
  const f=fixture();f.doc.documentElement.requestFullscreen=()=>Promise.reject(new Error('Browser denied'));
  assert.equal(await f.control.enter(),false);assert.equal(f.unavailable,1);assert.equal(f.doc.body.dataset.fullscreen,'false');assert.equal(f.resizes,0);
  f.doc.documentElement.requestFullscreen=()=>{f.doc.fullscreenElement=f.doc.documentElement;f.doc.dispatchEvent(new Event('fullscreenchange'));return Promise.resolve();};
  assert.equal(await f.control.enter(),true);
});
test('repeated taps issue one pending request and browser Back resynchronizes the button',async()=>{
  const f=fixture();let complete;
  f.doc.documentElement.requestFullscreen=()=>{complete=()=>{f.doc.fullscreenElement=f.doc.documentElement;f.doc.dispatchEvent(new Event('fullscreenchange'));};return new Promise(resolve=>{const finish=complete;complete=()=>{finish();resolve();};});};
  const first=f.control.enter(),second=f.control.enter();assert.equal(first,second);complete();await first;
  f.doc.fullscreenElement=null;f.doc.dispatchEvent(new Event('fullscreenchange'));assert.equal(f.button.textContent,'⛶');assert.equal(f.doc.body.dataset.fullscreen,'false');
  f.control.dispose();const before=f.resizes;f.doc.dispatchEvent(new Event('fullscreenchange'));assert.equal(f.resizes,before);
});
