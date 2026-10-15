import test from 'node:test';
import assert from 'node:assert/strict';
import {loadFeature} from './helpers.js';
const feature=await loadFeature('../js/install.js');
function fixture(navigator={userAgent:'Android'},secure=true){
  assert.equal(typeof feature.createAppInstallControl,'function');
  const win=new EventTarget(),media=new EventTarget(),updates=[];media.matches=false;
  win.navigator=navigator;win.isSecureContext=secure;win.matchMedia=()=>media;
  const control=feature.createAppInstallControl({window:win,onChange:state=>updates.push(state)});
  function offer(prompt){const event=new Event('beforeinstallprompt',{cancelable:true});event.prompt=prompt;win.dispatchEvent(event);return event;}
  return{win,media,control,updates,offer};
}

test('install waits for a click and invokes the browser prompt synchronously only once',async()=>{
  const f=fixture();let calls=0,finish;
  const event=f.offer(()=>{calls++;return new Promise(resolve=>{finish=resolve;});});
  assert.equal(event.defaultPrevented,true);assert.equal(calls,0);assert.equal(f.control.getState().mode,'ready');
  const pending=f.control.install();assert.equal(calls,1,'keep the click user activation');
  assert.equal(f.control.getState().mode,'prompting');assert.equal(f.control.install(),pending);
  finish({outcome:'accepted'});assert.equal(await pending,true);
  assert.equal(f.control.getState().feedback,'accepted');assert.equal(f.control.getState().mode,'manual','accepting a prompt alone is not an installation signal');
  f.win.dispatchEvent(new Event('appinstalled'));assert.equal(f.control.getState().mode,'installed');
  await f.control.install();assert.equal(calls,1);
});

test('dismissal consumes its prompt but a new browser offer can be used',async()=>{
  const f=fixture();let calls=0;
  f.offer(()=>{calls++;return Promise.resolve({outcome:'dismissed'});});
  assert.equal(await f.control.install(),false);assert.equal(f.control.getState().feedback,'dismissed');
  assert.equal(await f.control.install(),false);assert.equal(calls,1);
  f.offer(()=>{calls++;return Promise.resolve({outcome:'accepted'});});
  assert.equal(f.control.getState().mode,'ready');assert.equal(await f.control.install(),true);assert.equal(calls,2);
});

test('a browser prompt error releases busy state and permits a fresh offer',async()=>{
  for(const prompt of [()=>{throw new Error('blocked');},()=>Promise.reject(new Error('denied'))]){
    const f=fixture();f.offer(prompt);assert.equal(await f.control.install(),false);
    assert.equal(f.control.getState().mode,'manual');assert.equal(f.control.getState().feedback,'error');
    f.offer(()=>Promise.resolve({outcome:'accepted'}));assert.equal(await f.control.install(),true);
  }
});

test('legacy userChoice and standalone display signals work without assuming installation',async()=>{
  const f=fixture({userAgent:'iPhone',standalone:true});assert.equal(f.control.getState().mode,'standalone');assert.equal(f.control.getState().platform,'ios');
  const browser=fixture({userAgent:'iPhone'}),event=browser.offer(()=>Promise.resolve());event.userChoice=Promise.resolve({outcome:'dismissed'});
  assert.equal(await browser.control.install(),false);assert.equal(browser.control.getState().feedback,'dismissed');
  const ipad=fixture({userAgent:'Macintosh',platform:'MacIntel',maxTouchPoints:5});assert.equal(ipad.control.getState().platform,'ios');
});

test('a fullscreen transition retains app launch evidence without labeling a browser tab installed',()=>{
  const f=fixture();f.media.matches=true;f.media.dispatchEvent(new Event('change'));
  assert.equal(f.control.getState().mode,'standalone');
  f.media.matches=false;f.media.dispatchEvent(new Event('change'));
  assert.equal(f.control.getState().mode,'standalone','Fullscreen API can replace the active standalone display mode');
  const browser=fixture();browser.media.dispatchEvent(new Event('change'));assert.equal(browser.control.getState().mode,'manual');
});

test('missing install APIs keep platform guidance available and insecure pages cannot prompt',async()=>{
  for(const [navigator,platform]of [[{userAgent:'Android'},'android'],[{userAgent:'Windows'},'desktop'],[{},'desktop']]){
    const f=fixture(navigator);assert.equal(f.control.getState().mode,'manual');assert.equal(f.control.getState().platform,platform);
    assert.equal(await f.control.install(),false);assert.equal(f.control.getState().feedback,'manual');
  }
  const f=fixture({},false);let calls=0;f.offer(()=>{calls++;});
  assert.equal(f.control.getState().mode,'insecure');assert.equal(await f.control.install(),false);assert.equal(calls,0);
});

test('disposing install control detaches listeners and suppresses pending completion updates',async()=>{
  const f=fixture();let finish;f.offer(()=>new Promise(resolve=>{finish=resolve;}));const pending=f.control.install();
  f.control.dispose();const count=f.updates.length;finish({outcome:'accepted'});await pending;
  f.win.dispatchEvent(new Event('appinstalled'));f.media.dispatchEvent(new Event('change'));f.offer(()=>Promise.resolve({outcome:'accepted'}));
  assert.equal(f.updates.length,count);assert.equal(await f.control.install(),false);
});
