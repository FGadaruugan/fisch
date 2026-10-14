import {GAME,sampleFish,canVisit,createInitialState,normalizeState,applyGameMutation,GameError} from './shared-game.js';
const allowed=new Map([
  ['bootstrap',['profile']],['import_local',['snapshot']],['start_cast',['islandId']],['finish_cast',['ticketId','outcome']],['cancel_cast',['ticketId']],
  ['sell_fish',['ids']],['buy_rod',['rodId']],['equip_rod',['rodId']],['travel',['islandId']],['update_profile',['name','avatar']]
]);
export const canonical=value=>JSON.stringify(value,(_key,item)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.entries(item).sort(([a],[b])=>a.localeCompare(b))):item);
const publicReply=({snapshot,revision,friendCode,result,canImport,importedFromLocal})=>({ok:true,snapshot,revision,friendCode,result,canImport,importedFromLocal});
const secureRng=()=>crypto.getRandomValues(new Uint32Array(1))[0]/4294967296;
export async function runGameCommand({ownerId,action,operationId,payload={}},{database,now=Date.now,rng=secureRng,id=()=>crypto.randomUUID()}={}){
  try{
    if(typeof ownerId!=='string'||!ownerId)throw new GameError('AUTH_REQUIRED');
    if(!allowed.has(action))throw new GameError('UNKNOWN_ACTION');
    if(typeof operationId!=='string'||!/^[\w-]{1,64}$/.test(operationId)||!payload||typeof payload!=='object'||Array.isArray(payload)||Object.keys(payload).some(key=>!allowed.get(action).includes(key)))throw new GameError('INVALID_REQUEST');
    if(action==='bootstrap'){
      let initial=createInitialState();
      if(payload.profile)initial=applyGameMutation(initial,{action:'update_profile',payload:payload.profile}).state;
      return publicReply(await database.bootstrap(ownerId,initial));
    }
    const signature=canonical({action,payload});
    if(action==='import_local'){
      const raw=payload.snapshot;
      if(!raw||typeof raw!=='object'||Array.isArray(raw)||raw.version!==1)throw new GameError('INVALID_SAVE');
      const snapshot=normalizeState(raw);
      if(!snapshot.coins&&!snapshot.totalXp&&!snapshot.stats.totalCaught&&!snapshot.fish.length&&!snapshot.collection.length&&snapshot.rods.length===1)throw new GameError('IMPORT_EMPTY');
      return publicReply(await database.importLocal(ownerId,operationId,signature,snapshot));
    }
    const previous=await database.receipt(ownerId,operationId);
    if(previous){if(previous.signature!==signature)throw new GameError('OPERATION_CONFLICT');return publicReply({...await database.read(ownerId),result:previous.result});}
    for(let attempt=0;attempt<3;attempt++){
      const record=await database.read(ownerId);if(!record)throw new GameError('NOT_INITIALIZED');
      // Another invocation may commit after the initial lookup but before this read.
      // Check its receipt before validating the already-consumed inventory/ticket.
      const concurrent=await database.receipt(ownerId,operationId);
      if(concurrent){if(concurrent.signature!==signature)throw new GameError('OPERATION_CONFLICT');return publicReply({...await database.read(ownerId),result:concurrent.result});}
      let snapshot=record.snapshot,ticket=record.ticket,result=null;
      const time=now();if(ticket&&time>=ticket.expiresAt)ticket=null;
      if(action==='start_cast'){
        if(!canVisit(payload.islandId,snapshot.totalXp))throw new GameError('ISLAND_LOCKED');
        if(snapshot.lastIsland!==payload.islandId)throw new GameError('WRONG_ISLAND');
        if(snapshot.fish.length>=GAME.capacity)throw new GameError('BACKPACK_FULL');
        if(ticket)throw new GameError('FISHING_BUSY');
        ticket={...sampleFish(payload.islandId,snapshot.equippedRod,rng),id:id(),rodId:snapshot.equippedRod,
          waitSeconds:2+Math.max(0,Math.min(1,rng()))*3,biteSeconds:1.8,startedAt:time,expiresAt:time+120000};
        const {startedAt,expiresAt,...visibleTicket}=ticket;result=visibleTicket;
      }else if(action==='finish_cast'||action==='cancel_cast'){
        if(!ticket||typeof payload.ticketId!=='string'||payload.ticketId!==ticket.id)throw new GameError('CAST_NOT_FOUND');
        if(action==='finish_cast'){
          if(!['caught','escaped','cancelled'].includes(payload.outcome))throw new GameError('INVALID_REQUEST');
          if(payload.outcome==='caught'){
            if(time<ticket.startedAt+(ticket.waitSeconds+4.8)*1000)throw new GameError('CAST_TOO_EARLY');
            const next=applyGameMutation(snapshot,{action:'award_catch',payload:{ticket}},{now:()=>time});snapshot=next.state;result=next.result;
          }
        }
        ticket=null;
      }else{
        if(action==='equip_rod'&&ticket)throw new GameError('FISHING_BUSY');
        const next=applyGameMutation(snapshot,{action,payload},{now:()=>time});snapshot=next.state;result=next.result;
        if(action==='travel')ticket=null;
      }
      try{return publicReply(await database.commit(ownerId,operationId,signature,record.revision,snapshot,result,ticket));}
      catch(error){if(error.code!=='CONFLICT_RETRY'||attempt===2)throw error;}
    }
  }catch(error){return {ok:false,error:{code:error.code||'SERVER_ERROR',message:error.code||'SERVER_ERROR'}};}
}
