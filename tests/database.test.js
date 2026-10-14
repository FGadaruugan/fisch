import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {createInitialState} from '../js/save.js';

const A='00000000-0000-4000-8000-000000000001',B='00000000-0000-4000-8000-000000000002',C='00000000-0000-4000-8000-000000000003';
async function fixture(){
  const db=new PGlite();
  try{
  await db.exec(`create schema auth; create table auth.users(id uuid primary key);
    create role anon; create role authenticated; create role service_role bypassrls;
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;
    insert into auth.users values ('${A}'),('${B}'),('${C}');`);
  await db.exec(await readFile(new URL('../supabase/schema.sql',import.meta.url),'utf8'));
  for(const id of [A,B,C])await db.query('select public.fisch_bootstrap($1,$2::jsonb)',[id,JSON.stringify(createInitialState())]);
  return db;
  }catch(error){await db.close();throw error;}
}
async function asUser(db,id,fn){await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('set role authenticated');try{return await fn();}finally{await db.exec('reset role');}}
test('Postgres RLS isolates private state and denies client reward writes',async()=>{
  const db=await fixture();try{
    await asUser(db,A,async()=>{
      const rows=(await db.query('select user_id from public.fisch_state')).rows;assert.deepEqual(rows.map(r=>r.user_id),[A]);
      await assert.rejects(db.query('update public.fisch_state set revision=99 where user_id=$1',[A]),/permission denied/);
      await assert.rejects(db.query('select public.fisch_commit_state($1,$2,$3,0,$4::jsonb,null,null)',[A,'forged','x',JSON.stringify(createInitialState())]),/permission denied/);
      assert.equal((await db.query('select * from public.fisch_profiles')).rows.length,3);
      assert.equal((await db.query('select * from public.fisch_scores')).rows.length,3);
    });
    await db.exec('set role anon');await assert.rejects(db.query('select * from public.fisch_state'),/permission denied/);await db.exec('reset role');
  }finally{await db.close();}
});
test('database commit caches retries, guards signatures and revision and synchronizes scores',async()=>{
  const db=await fixture();try{
    const state=createInitialState();state.totalXp=100;state.coins=24;
    const commit=async(id,signature,revision,snapshot)=> (await db.query('select public.fisch_commit_state($1,$2,$3,$4,$5::jsonb,$6::jsonb,null) as result',[A,id,signature,revision,JSON.stringify(snapshot),JSON.stringify({awarded:true})])).rows[0].result;
    const first=await commit('operation-1','catch',0,state);assert.equal(first.revision,1);
    const repeat=await commit('operation-1','catch',0,state);assert.equal(repeat.revision,1);assert.equal(repeat.snapshot.totalXp,100);
    await assert.rejects(commit('operation-1','forged',1,state),/OPERATION_CONFLICT/);
    await assert.rejects(commit('operation-2','sale',0,state),/CONFLICT_RETRY/);
    assert.equal((await db.query('select total_xp from public.fisch_scores where user_id=$1',[A])).rows[0].total_xp,100);
  }finally{await db.close();}
});
test('friend transactions enforce participants, crossed requests and exactly one friendship',async()=>{
  const db=await fixture();try{
    const code=(await db.query('select friend_code from public.fisch_profiles where user_id=$1',[B])).rows[0].friend_code;
    const social=async(caller,action,op,payload)=>(await db.query('select public.fisch_social_command($1,$2,$3,$4::jsonb) as result',[caller,action,op,JSON.stringify(payload)])).rows[0].result;
    const sent=await social(A,'friend_request','send-1',{friendCode:code});
    const pending=(await db.query("select public.fisch_social_read($1,'requests') as result",[B])).rows[0].result;assert.equal(pending.incoming[0].id,sent.id);
    const aCode=(await db.query('select friend_code from public.fisch_profiles where user_id=$1',[A])).rows[0].friend_code;
    const crossed=await social(B,'friend_request','cross-1',{friendCode:aCode});assert.equal(crossed.id,sent.id);
    await assert.rejects(social(C,'friend_respond','intruder-1',{requestId:sent.id,decision:'accept'}),/FORBIDDEN/);
    await assert.rejects(social(A,'friend_respond','sender-1',{requestId:sent.id,decision:'accept'}),/FORBIDDEN/);
    await social(B,'friend_respond','accept-1',{requestId:sent.id,decision:'accept'});
    await social(B,'friend_respond','accept-1',{requestId:sent.id,decision:'accept'});
    assert.equal((await db.query('select * from public.fisch_friendships')).rows.length,1);
    await db.query('select public.fisch_heartbeat($1)',[B]);
    const friends=(await db.query("select public.fisch_social_read($1,'friends') as result",[A])).rows[0].result;assert.equal(friends[0].id,B);assert.equal(friends[0].online,true);
    const top=(await db.query("select public.fisch_social_read($1,'leaderboard','xp') as result",[A])).rows[0].result;assert.equal(top.entries.length,3);assert.equal(top.self.rank,1);
    await asUser(db,C,async()=>{assert.equal((await db.query('select * from public.fisch_friendships')).rows.length,0);assert.equal((await db.query('select * from public.fisch_requests')).rows.length,0);});
    await social(A,'friend_remove','remove-1',{friendId:B});assert.equal((await db.query('select * from public.fisch_friendships')).rows.length,0);
  }finally{await db.close();}
});
