import test from 'node:test';
import assert from 'node:assert/strict';
import {createInitialState} from '../js/save.js';
let createOnlineService;try{({createOnlineService}=await import('../js/services/online.js'));}catch(e){if(e.code!=='ERR_MODULE_NOT_FOUND')throw e;}
const reply=(revision=0,snapshot=createInitialState(),result=null)=>({ok:true,revision,snapshot,friendCode:'ABCDEF123456',result});
async function open(transport,options={}){assert.equal(typeof createOnlineService,'function');return createOnlineService({transport,delay:async()=>{},...options});}
test('online transport retries with the same operation ID and never presents an unconfirmed award',async()=>{
  let attempts=0,ids=[],finishResolve;
  const {service}=await open(async command=>{
    if(command.action==='bootstrap')return reply();
    if(command.action==='start_cast'){ids.push(command.operationId);if(++attempts===1)throw Object.assign(new Error('lost'),{code:'NETWORK_ERROR'});return reply(1,createInitialState(),{id:'cast-1'});}
    if(command.action==='finish_cast')return new Promise(resolve=>finishResolve=resolve);
  });
  await service.startCast('palm');assert.equal(ids[0],ids[1]);
  const pending=service.finishCast('cast-1','caught');await Promise.resolve();await Promise.resolve();assert.equal(service.getSnapshot().stats.totalCaught,0);
  const state=createInitialState();state.stats.totalCaught=1;state.totalXp=12;finishResolve(reply(2,state,{id:'cast-1'}));
  assert.equal((await pending).id,'cast-1');assert.equal(service.getSnapshot().totalXp,12);
  assert.equal((await service.finishCast('cast-1','caught')).id,'cast-1');
});
test('a later server revision cannot be replaced by an out-of-order older response',async()=>{
  const waiting=new Map();const {service}=await open(async command=>command.action==='bootstrap'?reply():new Promise(resolve=>waiting.set(command.action,resolve)));
  const buy=service.buyRod('river'),profile=service.updateProfile({name:'Mongol',avatar:1});await Promise.resolve();await Promise.resolve();
  const newer=createInitialState();newer.profile={name:'Mongol',avatar:1};newer.coins=20;waiting.get('update_profile')(reply(3,newer));await profile;
  waiting.get('buy_rod')(reply(2));await buy;assert.equal(service.getSnapshot().profile.name,'Mongol');assert.equal(service.getSnapshot().coins,20);
  const external=service.getSnapshot();external.coins=9999;assert.equal(service.getSnapshot().coins,20);
});
test('a failed network command keeps its ID for a deliberate later retry',async()=>{
  let fail=true;const ids=[];const {service}=await open(async command=>{
    if(command.action==='bootstrap')return reply();ids.push(command.operationId);
    if(fail)throw Object.assign(new Error(),{code:'NETWORK_ERROR'});return reply(1);
  });
  await assert.rejects(service.buyRod('river'),e=>e.code==='NETWORK_ERROR');fail=false;await service.buyRod('river');assert.equal(new Set(ids).size,1);
});
test('missing configuration and an invalid stored identity produce errors without local progress substitution',async()=>{
  assert.equal(typeof createOnlineService,'function');await assert.rejects(createOnlineService(),e=>e.code==='ONLINE_UNAVAILABLE');
  const client={auth:{getSession:async()=>({error:new Error('invalid session')})}};
  await assert.rejects(createOnlineService({client,config:{url:'https://game.supabase.co',publishableKey:'sb_publishable_test'}}),e=>e.code==='AUTH_REQUIRED');
  await assert.rejects(open(async()=>({ok:false,error:{code:'AUTH_REQUIRED'}})),e=>e.code==='AUTH_REQUIRED');
});
