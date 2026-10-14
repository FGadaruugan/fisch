// Explicit live check: creates three new guest profiles in the configured game project.
// Never prints credentials. Not part of npm test; requires the deployed backend.
import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';
import {ONLINE_CONFIG} from '../js/online-config.js';
import {fishPrice} from '../js/progression.js';
const url=process.env.FISCH_SUPABASE_URL||ONLINE_CONFIG.url,key=process.env.FISCH_PUBLISHABLE_KEY||ONLINE_CONFIG.publishableKey;
if(!url||!key){console.error('Live backend check pending: configure the dedicated Fisch project URL and publishable key first.');process.exit(2);}
const phase=process.argv[process.argv.indexOf('--phase')+1]||'all';
if(!['ownership','game','social','all'].includes(phase))throw new Error('Unknown smoke phase');
const clients=[];
async function api(client,action,payload={},operationId=crypto.randomUUID()){
  const {data,error}=await client.functions.invoke('fisch-api',{body:{action,payload,operationId}});
  if(error)throw new Error('Backend HTTP request failed');
  if(!data?.ok)throw Object.assign(new Error(data?.error?.code||'API_ERROR'),{code:data?.error?.code});
  return data;
}
try{
  for(let i=0;i<3;i++){
    const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});clients.push(client);
    const {data,error}=await client.auth.signInAnonymously();assert.equal(error,null,'Enable anonymous sign-ins in the dedicated project');
    client.testId=data.user.id;client.bootstrap=await api(client,'bootstrap');
  }
  const [a,b,c]=clients;
  if(['ownership','all'].includes(phase)){
    const own=await a.from('fisch_state').select('user_id,snapshot');assert.equal(own.error,null);assert.deepEqual(own.data.map(r=>r.user_id),[a.testId]);
    const foreign=await a.from('fisch_state').select('user_id').eq('user_id',b.testId);assert.deepEqual(foreign.data,[]);
    const write=await a.from('fisch_state').update({snapshot:{coins:1000000,totalXp:1000000}}).eq('user_id',a.testId);assert.ok(write.error,'Direct reward writes must be denied');
    const unauth=createClient(url,key,{auth:{persistSession:false}});const read=await unauth.from('fisch_state').select('*');assert.ok(read.error||read.data.length===0);
    const profiles=await a.from('fisch_profiles').select('*').limit(1);assert.equal(profiles.error,null);assert.equal('snapshot' in profiles.data[0],false);
    console.log('Ownership: PASS');
  }
  if(['game','all'].includes(phase)){
    await assert.rejects(api(a,'award_catch',{ticket:{weightGrams:1000000}}));
    const start=await api(a,'start_cast',{islandId:'palm'}),ticket=start.result;
    await assert.rejects(api(b,'finish_cast',{ticketId:ticket.id,outcome:'caught'}));
    await assert.rejects(api(a,'finish_cast',{ticketId:ticket.id,outcome:'caught'}),e=>e.code==='CAST_TOO_EARLY');
    await new Promise(resolve=>setTimeout(resolve,(ticket.waitSeconds+4.85)*1000));
    const op=crypto.randomUUID(),first=await api(a,'finish_cast',{ticketId:ticket.id,outcome:'caught'},op);
    const retry=await api(a,'finish_cast',{ticketId:ticket.id,outcome:'caught'},op);assert.equal(retry.snapshot.stats.totalCaught,1);assert.equal(first.result.id,retry.result.id);
    const saleOp=crypto.randomUUID(),sold=await api(a,'sell_fish',{ids:[first.result.id]},saleOp);
    const saleRetry=await api(a,'sell_fish',{ids:[first.result.id]},saleOp);assert.equal(sold.snapshot.coins,fishPrice(first.result));assert.equal(saleRetry.snapshot.coins,sold.snapshot.coins);
    console.log('Game/idempotency: PASS');
  }
  if(['social','all'].includes(phase)){
    const sent=await api(a,'friend_request',{friendCode:b.bootstrap.friendCode});
    await assert.rejects(api(c,'friend_respond',{requestId:sent.result.id,decision:'accept'}));
    await api(b,'friend_respond',{requestId:sent.result.id,decision:'accept'});
    await api(b,'heartbeat');const friends=await api(a,'friends');assert.ok(friends.result.find(f=>f.id===b.testId)?.online);
    const rank=await api(a,'leaderboard',{metric:'xp'});assert.ok(rank.result.self);assert.ok(rank.result.entries.length<=30);
    await api(a,'friend_remove',{friendId:b.testId});assert.equal((await api(a,'friends')).result.length,0);
    console.log('Friends/presence/ranking: PASS');
  }
}finally{for(const client of clients)await client.auth.signOut().catch(()=>{});}
