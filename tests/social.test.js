import test from 'node:test';
import assert from 'node:assert/strict';
let rules;try{rules=await import('../supabase/functions/fisch-api/social-rules.js');}catch(e){if(e.code!=='ERR_MODULE_NOT_FOUND')throw e;}
let prepareSocialRefresh;try{({prepareSocialRefresh}=await import('../js/ui/social-state.js'));}catch(e){if(e.code!=='ERR_MODULE_NOT_FOUND')throw e;}
test('friend rules restrict transitions to their participants and reject self requests',()=>{
  assert.equal(typeof rules?.validateFriendAction,'function');
  const request={senderId:'a',recipientId:'b',status:'pending'};
  assert.throws(()=>rules.validateFriendAction({callerId:'a',request},'friend_respond'),e=>e.code==='FORBIDDEN');
  assert.throws(()=>rules.validateFriendAction({callerId:'c',request},'friend_respond'),e=>e.code==='FORBIDDEN');
  rules.validateFriendAction({callerId:'b',request},'friend_respond');rules.validateFriendAction({callerId:'a',request},'friend_cancel');
  assert.throws(()=>rules.validateFriendAction({callerId:'b',request:{...request,status:'accepted'}},'friend_respond'),e=>e.code==='REQUEST_CLOSED');
  assert.throws(()=>rules.validateFriendAction({callerId:'a',request:{senderId:'a',recipientId:'a'}},'friend_request'),e=>e.code==='SELF_REQUEST');
  assert.throws(()=>rules.validateFriendAction({callerId:'c',membership:{leftId:'a',rightId:'b'}},'friend_remove'),e=>e.code==='FORBIDDEN');
});
test('presence uses a strict ninety-second TTL and ignores invalid timestamps',()=>{
  assert.equal(typeof rules?.isOnline,'function');assert.equal(rules.isOnline(1000,90000),true);assert.equal(rules.isOnline(1000,91000),false);assert.equal(rules.isOnline('invalid',91000),false);
});
test('Top 30 sorts metric ties consistently and returns own rank outside Top',()=>{
  assert.equal(typeof rules?.rankScores,'function');
  const scores=Array.from({length:40},(_,i)=>({id:String(i).padStart(2,'0'),name:'Fisher '+i,avatar:0,totalXp:100,totalCaught:2,bestGrams:i}));
  const xp=rules.rankScores(scores.reverse(),'xp','39');assert.equal(xp.entries.length,30);assert.equal(xp.entries[0].id,'00');assert.equal(xp.self.rank,40);assert.equal(xp.self.level,2);
  assert.equal(rules.rankScores(scores,'weight','39').entries[0].value,39);assert.throws(()=>rules.rankScores(scores,'coins','39'));
});
test('social API validates codes/decisions and only forwards verified owner and allowed fields',async()=>{
  assert.equal(typeof rules?.runSocialCommand,'function');let received;
  const database={social:async(...args)=>{received=args;return {id:'request'};},heartbeat:async()=>({lastSeen:'now'}),socialRead:async()=>[]};
  const call=(action,payload)=>rules.runSocialCommand({ownerId:'caller',operationId:'operation-1',action,payload},{database});
  assert.equal((await call('friend_request',{friendCode:'BAD'})).error.code,'INVALID_FRIEND_CODE');
  const result=await call('friend_request',{friendCode:'abcdef123456'});assert.equal(result.ok,true);assert.equal(received[0],'caller');assert.equal(received[3].friendCode,'ABCDEF123456');
  assert.equal((await call('friend_respond',{requestId:'00000000-0000-4000-8000-000000000001',decision:'anything'})).error.code,'INVALID_DECISION');
  assert.equal((await call('leaderboard',{metric:'coins'})).error.code,'INVALID_METRIC');
  assert.equal((await call('heartbeat',{ownerId:'someone-else'})).error.code,'INVALID_REQUEST');
});
test('switching a ranking metric clears mismatched cached values before a failed request can display them',()=>{
  assert.equal(typeof prepareSocialRefresh,'function');
  const xp={entries:[{id:'fisher',value:400}],self:null},previous={metric:'xp',leaderboard:xp};
  const loading=prepareSocialRefresh(previous,{metric:'weight'}),failed={...loading,loading:false,error:'Network failed'};
  assert.equal(failed.metric,'weight');assert.equal(failed.leaderboard,null);assert.equal(previous.leaderboard,xp);
  assert.equal(prepareSocialRefresh(previous,{metric:'xp'}).leaderboard,xp);
});
