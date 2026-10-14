import test from 'node:test';
import assert from 'node:assert/strict';
import {createOnlineService} from '../js/services/online.js';
import {createRetryTransport,clientTransport} from '../js/services/transport.js';
let createIdentityGuard;try{({createIdentityGuard}=await import('../js/account-identity.js'));}catch(e){if(e.code!=='ERR_MODULE_NOT_FOUND')throw e;}
let createPopupLogin;
try { ({createPopupLogin}=await import('../js/account-popup.js')); } catch(e) { if(e.code!=='ERR_MODULE_NOT_FOUND')throw e; }
const origin='https://fisch-tides.hulanganbaatar834.chatgpt.site',callback='https://fgadaruugan.github.io/fisch/account.html';
function fixture(blocked=false){
  const win=new EventTarget(),sent=[];let opened=0,tick,timeout;
  const popup={closed:false,postMessage:(data,target)=>sent.push({data,target}),close(){this.closed=true;}};
  Object.assign(win,{location:{origin},open(){opened++;return blocked?null:popup;},setInterval(fn){tick=fn;return 1;},clearInterval(){tick=null;},setTimeout(fn){timeout=fn;return 2;},clearTimeout(){timeout=null;}});
  const message=(data,source=popup,from='https://fgadaruugan.github.io')=>{const e=new Event('message');Object.assign(e,{data,source,origin:from});win.dispatchEvent(e);};
  return {win,popup,sent,message,get opened(){return opened;},expire:()=>timeout?.(),get poll(){return tick;}};
}
test('Google popup opens on the initiating click and accepts only the bound window origin and nonce',async()=>{
  assert.equal(typeof createPopupLogin,'function');const f=fixture();
  const pending=createPopupLogin({window:f.win,callbackURL:callback,nonce:'bound-nonce'});assert.equal(f.opened,1);
  let finished=false;pending.then(()=>finished=true);
  f.message({type:'fisch:ready'}, {}, 'https://fgadaruugan.github.io');assert.equal(f.sent.length,0);
  f.message({type:'fisch:ready'},f.popup,'https://evil.example');assert.equal(f.sent.length,0);
  f.message({type:'fisch:ready'});assert.deepEqual(f.sent[0],{target:'https://fgadaruugan.github.io',data:{type:'fisch:begin',nonce:'bound-nonce'}});
  const session={access_token:'short-lived',refresh_token:'private-refresh'};
  f.message({type:'fisch:session',nonce:'wrong',session});await Promise.resolve();assert.equal(finished,false);
  f.message({type:'fisch:session',nonce:'bound-nonce',session});assert.deepEqual(await pending,session);assert.equal(f.popup.closed,true);assert.equal(f.poll,null);
  f.message({type:'fisch:ready'});assert.equal(f.sent.length,1,'completion detaches the token listener');
});
test('blocked and cancelled login windows leave the caller able to retry',async()=>{
  assert.equal(typeof createPopupLogin,'function');await assert.rejects(createPopupLogin({window:fixture(true).win,callbackURL:callback}),e=>e.code==='AUTH_POPUP_BLOCKED');
  const f=fixture(),pending=createPopupLogin({window:f.win,callbackURL:callback});f.popup.closed=true;f.poll();await assert.rejects(pending,e=>e.code==='AUTH_CANCELLED');assert.equal(f.poll,null);
});
test('online connection requires an existing permanent identity and never silently creates a guest',async()=>{
  const client={auth:{getSession:async()=>({data:{session:null}}),signInAnonymously(){throw new Error('Must not create a new account');}}};
  await assert.rejects(createOnlineService({client,config:{url:'https://game.supabase.co',publishableKey:'sb_publishable_test'}}),e=>e.code==='AUTH_REQUIRED');
});
test('disposing a lost-response import stops its retry after an identity switch',async()=>{
  let calls=0,rpc;
  rpc=createRetryTransport(async()=>{calls++;throw {code:'NETWORK_ERROR'};},{delay:async()=>rpc.dispose()});
  await assert.rejects(rpc.request('import_local',{snapshot:{coins:650}}),e=>e.code==='AUTH_REQUIRED');assert.equal(calls,1);
});
test('the transport binds each command to its original account and explicit JWT',async()=>{
  let owner='A',options;
  const client={auth:{getSession:async()=>({data:{session:{user:{id:owner},access_token:'token-'+owner}}})},functions:{invoke:async(_name,value)=>{options=value;return {data:{ok:true}};}}};
  const request=clientTransport(client,{ownerId:'A'});await request({action:'bootstrap'});assert.equal(options.headers['x-fisch-owner'],'A');assert.equal(options.headers.Authorization,'Bearer token-A');
  owner='B';await assert.rejects(request({action:'import_local'}),e=>e.code==='AUTH_REQUIRED');
});
test('identity change during lazy loading cannot publish an old account or reuse its import continuation',async()=>{
  assert.equal(typeof createIdentityGuard,'function');const guard=createIdentityGuard();guard.observe('A');const ticket=guard.capture('A');let release,disposed=false;
  const pending=guard.run(ticket,()=>new Promise(resolve=>release=resolve),()=>disposed=true);guard.observe('B');release({ownerId:'A'});
  await assert.rejects(pending,e=>e.code==='AUTH_REQUIRED');assert.equal(disposed,true);assert.throws(()=>guard.capture('A'),e=>e.code==='AUTH_REQUIRED');
  const current=guard.capture('B');guard.assert(current);guard.observe(null);assert.throws(()=>guard.assert(current),e=>e.code==='AUTH_REQUIRED');
});
