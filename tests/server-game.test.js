import test from 'node:test';
import assert from 'node:assert/strict';
import {createInitialState} from '../js/save.js';
import {fishPrice} from '../js/progression.js';
let runGameCommand;try{({runGameCommand}=await import('../supabase/functions/fisch-api/commands.js'));}catch(e){if(e.code!=='ERR_MODULE_NOT_FOUND')throw e;}
const A='00000000-0000-4000-8000-000000000001',B='00000000-0000-4000-8000-000000000002';
function fixture(initial=createInitialState()){
  const owners=new Map(),receipts=new Map();let clock=100000,id=0;
  const database={
    async bootstrap(owner,state){if(!owners.has(owner))owners.set(owner,{snapshot:structuredClone(initial||state),revision:0,ticket:null,friendCode:'000000000001'});return this.read(owner);},
    async read(owner){return structuredClone(owners.get(owner));},
    async receipt(owner,op){return structuredClone(receipts.get(owner+op)||null);},
    async commit(owner,op,signature,revision,snapshot,result,ticket){
      const previous=receipts.get(owner+op),current=owners.get(owner);
      if(previous){if(previous.signature!==signature)throw Object.assign(new Error(),{code:'OPERATION_CONFLICT'});return {...await this.read(owner),ok:true,result:structuredClone(previous.result)};}
      if(current.revision!==revision)throw Object.assign(new Error(),{code:'CONFLICT_RETRY'});
      owners.set(owner,{...current,snapshot:structuredClone(snapshot),revision:revision+1,ticket:structuredClone(ticket)});receipts.set(owner+op,{signature,result:structuredClone(result)});
      return {...await this.read(owner),ok:true,result:structuredClone(result)};
    }
  };
  const call=(action,payload={},operationId='op-'+(++id),ownerId=A)=>{assert.equal(typeof runGameCommand,'function');return runGameCommand({ownerId,action,payload,operationId},{database,now:()=>clock,rng:()=>0,id:()=> 'ticket-'+id});};
  return {call,database,advance:ms=>clock+=ms};
}
test('server samples the catch and enforces elapsed time, one finish and idempotent sales',async()=>{
  const f=fixture();await f.call('bootstrap');const start=await f.call('start_cast',{islandId:'palm'});assert.equal(start.ok,true);const ticket=start.result;
  assert.equal((await f.call('finish_cast',{ticketId:ticket.id,outcome:'caught'})).error.code,'CAST_TOO_EARLY');
  f.advance(6801);
  const [first,retry]=await Promise.all([f.call('finish_cast',{ticketId:ticket.id,outcome:'caught'},'finish-1'),f.call('finish_cast',{ticketId:ticket.id,outcome:'caught'},'finish-1')]);
  assert.equal(first.snapshot.stats.totalCaught,1);assert.equal(retry.snapshot.totalXp,12);assert.equal(first.result.id,retry.result.id);
  assert.equal((await f.call('finish_cast',{ticketId:ticket.id,outcome:'caught'})).error.code,'CAST_NOT_FOUND');
  const sold=await f.call('sell_fish',{ids:[first.result.id]},'sale-1');const again=await f.call('sell_fish',{ids:[first.result.id]},'sale-1');
  assert.equal(sold.snapshot.coins,fishPrice(first.result));assert.equal(again.snapshot.coins,sold.snapshot.coins);
  assert.equal((await f.call('sell_fish',{ids:[first.result.id]})).error.code,'FISH_NOT_OWNED');
});
test('server rejects forged fields, foreign tickets, invalid commands and operation ID reuse',async()=>{
  const f=fixture();await f.call('bootstrap');await f.call('bootstrap',{},undefined,B);
  const ticket=(await f.call('start_cast',{islandId:'palm'},'cast-1')).result;
  assert.equal((await f.call('finish_cast',{ticketId:ticket.id,outcome:'caught'},undefined,B)).error.code,'CAST_NOT_FOUND');
  assert.equal((await f.call('finish_cast',{ticketId:ticket.id,outcome:'caught',weightGrams:1000000,totalXp:9999})).error.code,'INVALID_REQUEST');
  assert.equal((await f.call('award_catch',{ticket})).error.code,'UNKNOWN_ACTION');
  assert.equal((await f.call('buy_rod',{rodId:'river'},'cast-1')).error.code,'OPERATION_CONFLICT');
  assert.equal((await f.call('buy_rod',{rodId:'constructor'})).error.code,'INVALID_ROD');
  assert.equal((await f.call('travel',{islandId:'frost'})).error.code,'ISLAND_LOCKED');
});
test('server respects capacity, balances, cancellation and active rod ownership',async()=>{
  const full=createInitialState();full.fish=Array.from({length:100},(_,i)=>({id:'fish-'+i,speciesId:'n01',islandId:'palm',weightGrams:100,caughtAt:new Date(0).toISOString()}));
  const a=fixture(full);await a.call('bootstrap');assert.equal((await a.call('start_cast',{islandId:'palm'})).error.code,'BACKPACK_FULL');
  const b=fixture();await b.call('bootstrap');assert.equal((await b.call('buy_rod',{rodId:'river'})).error.code,'NOT_ENOUGH_COINS');
  const ticket=(await b.call('start_cast',{islandId:'palm'})).result;
  assert.equal((await b.call('equip_rod',{rodId:'starter'})).error.code,'FISHING_BUSY');
  await b.call('cancel_cast',{ticketId:ticket.id});b.advance(8000);
  assert.equal((await b.call('finish_cast',{ticketId:ticket.id,outcome:'caught'})).error.code,'CAST_NOT_FOUND');
  assert.equal((await b.call('bootstrap')).snapshot.stats.totalCaught,0);
});
test('different concurrent commands reapply after a revision conflict',async()=>{
  const initial=createInitialState();initial.coins=1000;const f=fixture(initial);await f.call('bootstrap');
  const results=await Promise.all([f.call('buy_rod',{rodId:'river'},'buy-1'),f.call('buy_rod',{rodId:'ocean'},'buy-2')]);
  assert.ok(results.every(r=>r.ok));const state=(await f.call('bootstrap')).snapshot;assert.equal(state.coins,200);assert.equal(state.rods.length,3);
});

async function commitBetweenReceiptAndState(f,action,payload,operationId){
  const read=f.database.read.bind(f.database);let interleave=true,original;
  f.database.read=async owner=>{
    if(interleave){interleave=false;original=await f.call(action,payload,operationId);}
    return read(owner);
  };
  const retry=await f.call(action,payload,operationId);assert.equal(original.ok,true);return retry;
}
test('finish retry observes a receipt committed between its lookup and state read',async()=>{
  const f=fixture();await f.call('bootstrap');const ticket=(await f.call('start_cast',{islandId:'palm'})).result;f.advance(7000);
  const retry=await commitBetweenReceiptAndState(f,'finish_cast',{ticketId:ticket.id,outcome:'caught'},'finish-race');
  assert.equal(retry.ok,true);assert.equal(retry.snapshot.stats.totalCaught,1);assert.equal(retry.result.id,ticket.id);
});
test('sale retry observes a receipt after the original removes its fish',async()=>{
  const f=fixture();await f.call('bootstrap');const ticket=(await f.call('start_cast',{islandId:'palm'})).result;f.advance(7000);
  const caught=(await f.call('finish_cast',{ticketId:ticket.id,outcome:'caught'})).result;
  const retry=await commitBetweenReceiptAndState(f,'sell_fish',{ids:[caught.id]},'sale-race');
  assert.equal(retry.ok,true);assert.equal(retry.snapshot.coins,fishPrice(caught));assert.equal(retry.snapshot.fish.length,0);
});
