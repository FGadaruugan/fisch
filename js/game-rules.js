import {FISH,RODS,RARITIES,GAME} from './data.js';
import {canVisit,fishPrice} from './progression.js';
import {validCatch,boundedInt} from './save.js';
import {GameError} from './errors.js';
import {getSecretTradeInfo,isAtSecretTrade} from './trade.js';

/** Pure transactional rules: input state is never mutated. Ticket validity is the service's responsibility. */
export function applyGameMutation(state,{action,payload={}},{now=Date.now}={}) {
  const next=structuredClone(state);let result=null;
  switch(action) {
    case 'award_catch': {
      if(next.fish.length>=GAME.capacity)throw new GameError('BACKPACK_FULL');
      const ticket=payload.ticket;
      const fish=validCatch({...ticket,caughtAt:new Date(now()).toISOString()});
      if(!fish)throw new GameError('INVALID_FISH');
      if(next.fish.some(item=>item.id===fish.id))throw new GameError('OPERATION_CONFLICT');
      const rarity=FISH[fish.speciesId].rarity;
      next.fish.push(fish);next.totalXp=boundedInt(next.totalXp+RARITIES[rarity].xp);
      next.stats.totalCaught=boundedInt(next.stats.totalCaught+1);
      next.stats.rarityCounts[rarity]=boundedInt((next.stats.rarityCounts[rarity]??0)+1);
      if(!next.collection.includes(fish.speciesId))next.collection.push(fish.speciesId);
      if(!next.stats.bestCatch || fish.weightGrams>next.stats.bestCatch.weightGrams)next.stats.bestCatch=fish;
      result=fish;break;
    }
    case 'sell_fish': {
      if(!Array.isArray(payload.ids) || payload.ids.length===0)throw new GameError('EMPTY_BACKPACK');
      const ids=new Set(payload.ids);
      const fish=next.fish.filter(item=>ids.has(item.id));
      if(fish.length!==ids.size)throw new GameError('FISH_NOT_OWNED');
      next.coins=boundedInt(next.coins+fish.reduce((sum,item)=>sum+fishPrice(item),0),GAME.maxCoins);
      next.fish=next.fish.filter(item=>!ids.has(item.id));break;
    }
    case 'buy_rod': {
      const rod=RODS[payload.rodId];if(!rod)throw new GameError('INVALID_ROD');
      if(rod.acquisition==='trade')throw new GameError('ROD_TRADE_ONLY');
      if(next.rods.includes(rod.id))throw new GameError('ROD_ALREADY_OWNED');
      if(next.coins<rod.price)throw new GameError('NOT_ENOUGH_COINS');
      next.coins-=rod.price;next.rods.push(rod.id);break;
    }
    case 'trade_rod': {
      const info=getSecretTradeInfo(next);
      if(payload.rodId!==info.rodId)throw new GameError('INVALID_ROD');
      if(info.code)throw new GameError(info.code);
      if(!isAtSecretTrade(next,payload.position))throw new GameError('TRADE_LOCATION_REQUIRED');
      const consumedIds=info.requirements.map(row=>row.fish.id),ids=new Set(consumedIds);
      next.coins-=info.price;next.fish=next.fish.filter(item=>!ids.has(item.id));next.rods.push(info.rodId);
      result={rodId:info.rodId,consumedIds};break;
    }
    case 'equip_rod':
      if(!next.rods.includes(payload.rodId))throw new GameError('ROD_NOT_OWNED');
      next.equippedRod=payload.rodId;break;
    case 'travel':
      if(!canVisit(payload.islandId,next.totalXp))throw new GameError('ISLAND_LOCKED');
      next.lastIsland=payload.islandId;break;
    case 'update_profile': {
      const name=typeof payload.name==='string'?payload.name.replace(/[\u0000-\u001f]/g,'').trim():'';
      if(!name || name.length>18 || !Number.isInteger(payload.avatar) || payload.avatar<0 || payload.avatar>5)throw new GameError('INVALID_PROFILE');
      next.profile={name,avatar:payload.avatar};break;
    }
    default:throw new GameError('UNKNOWN_ACTION');
  }
  return {state:next,result};
}
