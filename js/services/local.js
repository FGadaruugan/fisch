import {GAME,sampleFish} from '../data.js';
import {canVisit} from '../progression.js';
import {SAVE_KEY,normalizeState,createInitialState} from '../save.js';
import {applyGameMutation} from '../game-rules.js';
import {GameError} from '../errors.js';

let fallbackSequence=0;
export const operationId=()=>globalThis.crypto?.randomUUID?.()??`local-${Date.now()}-${++fallbackSequence}`;

export function createLocalService({storage,now=Date.now,rng=Math.random,onStorageError=()=>{}}={}) {
  if(storage===undefined) {try{storage=globalThis.localStorage;}catch{onStorageError('SAVE_UNAVAILABLE');}}
  let state=createInitialState(),ticket=null;
  const subscribers=new Set(),operations=new Map();
  try {const raw=storage?.getItem(SAVE_KEY);if(raw){try{state=normalizeState(JSON.parse(raw));}catch{onStorageError('SAVE_RECOVERED');}}}
  catch{onStorageError('SAVE_UNAVAILABLE');}
  const snapshot=()=>structuredClone(state);
  function persist() {
    try{storage?.setItem(SAVE_KEY,JSON.stringify(state));}catch{onStorageError('SAVE_UNAVAILABLE');}
    for(const listener of subscribers)listener(snapshot());
  }
  function mutate(action,payload,id=operationId()) {
    const signature=JSON.stringify({action,payload});
    if(operations.has(id)){const cached=operations.get(id);if(cached.signature!==signature)throw new GameError('OPERATION_CONFLICT');return structuredClone(cached.result);}
    const next=applyGameMutation(state,{action,payload},{now});state=next.state;
    operations.set(id,{signature,result:structuredClone(next.result)});
    if(operations.size>256)operations.delete(operations.keys().next().value);
    persist();return structuredClone(next.result);
  }
  return {
    mode:'local',
    getSnapshot:snapshot,
    subscribe(listener){subscribers.add(listener);listener(snapshot());return()=>subscribers.delete(listener);},
    async startCast(islandId){
      if(!canVisit(islandId,state.totalXp))throw new GameError('ISLAND_LOCKED');
      if(state.lastIsland!==islandId)throw new GameError('WRONG_ISLAND');
      if(state.fish.length>=GAME.capacity)throw new GameError('BACKPACK_FULL');
      if(ticket)throw new GameError('FISHING_BUSY');
      ticket={...sampleFish(islandId,state.equippedRod,rng),id:operationId(),rodId:state.equippedRod,waitSeconds:2+Math.min(1,Math.max(0,rng()))*3,biteSeconds:1.8};
      return structuredClone(ticket);
    },
    async finishCast(id,outcome){
      if(ticket?.id!==id)return null;
      const finished=ticket;ticket=null;
      if(outcome!=='caught')return null;
      return mutate('award_catch',{ticket:finished},id);
    },
    async cancelCast(id){if(ticket?.id===id)ticket=null;},
    async sellFish(ids,id){return mutate('sell_fish',{ids:[...new Set(ids)].sort()},id);},
    async buyRod(rodId,id){return mutate('buy_rod',{rodId},id);},
    async equipRod(rodId){if(ticket)throw new GameError('FISHING_BUSY');return mutate('equip_rod',{rodId});},
    async travel(islandId){if(!canVisit(islandId,state.totalXp))throw new GameError('ISLAND_LOCKED');ticket=null;return mutate('travel',{islandId});},
    async updateProfile(profile){return mutate('update_profile',profile);},
    dispose(){subscribers.clear();ticket=null;operations.clear();}
  };
}
