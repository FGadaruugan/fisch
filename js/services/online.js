import {createClient} from '@supabase/supabase-js';
import {GameError} from '../errors.js';
import {normalizeState} from '../save.js';
import {createRetryTransport,clientTransport} from './transport.js';
export {createSocialService} from './social.js';

export async function createOnlineService({client,config={},profile,transport,delay}={}){
  if(!transport){
    let valid=false;try{const url=new URL(config.url);valid=url.protocol==='https:'||(['localhost','127.0.0.1'].includes(url.hostname)&&url.protocol==='http:');}catch{}
    if(!valid||typeof config.publishableKey!=='string'||!config.publishableKey.startsWith('sb_publishable_'))throw new GameError('ONLINE_UNAVAILABLE');
    client??=createClient(config.url,config.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,storageKey:'fisch3d.online.auth.v1'}});
    const {data,error}=await client.auth.getSession();if(error)throw new GameError('AUTH_REQUIRED');
    if(data?.session){const verified=await client.auth.getUser();if(verified.error||!verified.data?.user)throw new GameError('AUTH_REQUIRED');}
    else{const guest=await client.auth.signInAnonymously();if(guest.error||!guest.data?.user)throw new GameError('AUTH_REQUIRED');}
    transport=clientTransport(client);
  }
  const rpc=createRetryTransport(transport,{delay});
  let state=null,revision=-1,friendCode='',disposed=false;
  const listeners=new Set(),finished=new Map();
  const snapshot=()=>structuredClone(state);
  function accept(response){
    if(!response.snapshot||response.snapshot.version!==1||!Number.isSafeInteger(response.revision)||response.revision<0)throw new GameError('PROTOCOL_ERROR');
    if(!disposed&&response.revision>=revision){revision=response.revision;state=normalizeState(response.snapshot);friendCode=response.friendCode||friendCode;for(const listener of listeners)listener(snapshot());}
    return structuredClone(response.result??null);
  }
  const execute=async(action,payload={},id)=>accept(await rpc.request(action,payload,id));
  await execute('bootstrap',profile?{profile}:{});
  const service={
    mode:'online',getSnapshot:snapshot,
    subscribe(listener){listeners.add(listener);listener(snapshot());return()=>listeners.delete(listener);},
    startCast:islandId=>execute('start_cast',{islandId}),
    finishCast(ticketId,outcome){
      if(finished.has(ticketId))return finished.get(ticketId);
      const pending=execute('finish_cast',{ticketId,outcome}).catch(error=>{finished.delete(ticketId);throw error;});
      finished.set(ticketId,pending);if(finished.size>128)finished.delete(finished.keys().next().value);return pending;
    },
    async cancelCast(ticketId){if(!ticketId||finished.has(ticketId))return null;try{return await execute('cancel_cast',{ticketId});}catch(error){if(error.code==='CAST_NOT_FOUND')return null;throw error;}},
    sellFish:(ids,id)=>execute('sell_fish',{ids:[...new Set(ids)].sort()},id),
    buyRod:(rodId,id)=>execute('buy_rod',{rodId},id),
    equipRod:rodId=>execute('equip_rod',{rodId}),
    travel:islandId=>execute('travel',{islandId}),
    updateProfile:profile=>execute('update_profile',profile),
    refresh:()=>execute('bootstrap'),
    dispose(){disposed=true;listeners.clear();finished.clear();rpc.dispose();}
  };
  return {service,client,friendCode};
}
