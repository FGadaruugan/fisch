import test from 'node:test';
import assert from 'node:assert/strict';
import {createApiHandler} from '../supabase/functions/fisch-api/handler.js';
test('HTTP API derives identity from verified JWT and never from request owner fields',async()=>{
  let command;
  const handler=createApiHandler({verifyUser:async token=>token==='valid-token'?{id:'verified-owner'}:null,
    game:async value=>{command=value;return {ok:true,snapshot:{}};},social:async()=>({ok:true,result:[]})});
  const request=body=>new Request('https://example.test/api',{method:'POST',headers:{Authorization:'Bearer valid-token','content-type':'application/json'},body:JSON.stringify(body)});
  assert.equal((await handler(request({action:'bootstrap',operationId:'op-1',ownerId:'foreign-owner',payload:{}}))).status,200);
  assert.equal(command.ownerId,'verified-owner');
  const noAuth=new Request('https://example.test/api',{method:'POST',body:'{}'});assert.equal((await handler(noAuth)).status,401);
  const badToken=new Request('https://example.test/api',{method:'POST',headers:{Authorization:'Bearer expired'},body:'{}'});assert.equal((await handler(badToken)).status,401);
});
test('HTTP API rejects invalid bodies and disallowed configured origins',async()=>{
  const handler=createApiHandler({verifyUser:async()=>({id:'a'}),game:async()=>({ok:true}),social:async()=>({ok:true}),allowedOrigins:['https://game.example']});
  const request=(body,origin='https://game.example')=>new Request('https://api.example',{method:'POST',headers:{authorization:'Bearer token',origin},body});
  assert.equal((await handler(request('not JSON'))).status,400);
  assert.equal((await handler(request('x'.repeat(16385)))).status,413);
  assert.equal((await handler(request('{}','https://other.example'))).status,403);
});
test('the API accepts a full backpack transfer but retains the smaller limit for ordinary commands',async()=>{
  const handler=createApiHandler({verifyUser:async()=>({id:'owner'}),game:async()=>({ok:true}),social:async()=>({ok:true})});
  const body=JSON.stringify({action:'import_local',payload:{snapshot:{version:1,padding:'x'.repeat(25000)}}});
  const request=action=>new Request('https://api.example',{method:'POST',headers:{authorization:'Bearer token'},body:body.replace('import_local',action)});
  assert.equal((await handler(request('import_local'))).status,200);assert.equal((await handler(request('bootstrap'))).status,413);
});
test('an account-bound request with a newly switched JWT cannot mutate the new account',async()=>{
  let mutations=0;const handler=createApiHandler({verifyUser:async()=>({id:'B'}),game:async()=>{mutations++;return {ok:true};},social:async()=>({ok:true})});
  const request=new Request('https://api.example',{method:'POST',headers:{authorization:'Bearer token-B','x-fisch-owner':'A'},body:JSON.stringify({action:'import_local'})});
  assert.equal((await handler(request)).status,401);assert.equal(mutations,0);
});

test('Admin+ status is denied by default and never falls through to game commands',async()=>{
  let gameCalls=0;
  const handler=createApiHandler({verifyUser:async()=>({id:'verified-user'}),game:async()=>{gameCalls++;return {ok:true};},social:async()=>({ok:true})});
  const response=await handler(new Request('https://api.example',{method:'POST',headers:{authorization:'Bearer token','content-type':'application/json'},body:JSON.stringify({action:'admin_status'})}));
  assert.equal(response.status,403);assert.equal(gameCalls,0);
});
test('Admin+ status requires the server-side allowlist predicate',async()=>{
  const makeHandler=isAdmin=>createApiHandler({verifyUser:async()=>({id:'verified-user'}),isAdmin,game:async()=>({ok:false}),social:async()=>({ok:false})});
  const request=()=>new Request('https://api.example',{method:'POST',headers:{authorization:'Bearer token','content-type':'application/json'},body:JSON.stringify({action:'admin_status'})});
  const denied=await makeHandler(async user=>user.id==='other-user')(request());assert.equal(denied.status,403);
  const allowed=await makeHandler(async user=>user.id==='verified-user')(request());assert.equal(allowed.status,200);assert.deepEqual(await allowed.json(),{ok:true,role:'Admin+'});
});
