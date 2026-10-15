import {FISH,ISLANDS,SECRET_TRADE} from './data.js';
import {levelForXp} from './progression.js';

export function secretTradePoint(){
  const center=ISLANDS[SECRET_TRADE.islandId].center;
  return{x:center[0]+SECRET_TRADE.offset[0],z:center[1]+SECRET_TRADE.offset[1]};
}
export function isAtSecretTrade(state,position){
  const point=secretTradePoint();
  return state.lastIsland===SECRET_TRADE.islandId&&!!position&&!Array.isArray(position)&&Number.isFinite(position.x)&&Number.isFinite(position.z)&&Math.hypot(position.x-point.x,position.z-point.z)<SECRET_TRADE.radius;
}
/** Select actual held specimens; sold collection entries never count as an offering. */
export function getSecretTradeInfo(state){
  const requirements=SECRET_TRADE.speciesIds.map(speciesId=>{
    const species=FISH[speciesId];
    const fish=state.fish.filter(item=>item.speciesId===speciesId).reduce((lightest,item)=>!lightest||item.weightGrams<lightest.weightGrams?item:lightest,null);
    return{speciesId,name:species.name,rarity:species.rarity,fish};
  });
  const owned=state.rods.includes(SECRET_TRADE.rodId),level=levelForXp(state.totalXp);
  const code=owned?'ROD_ALREADY_OWNED':level<SECRET_TRADE.level?'TRADE_LEVEL_REQUIRED':requirements.some(row=>!row.fish)?'MISSING_TRADE_FISH':state.coins<SECRET_TRADE.price?'NOT_ENOUGH_COINS':null;
  return{...SECRET_TRADE,requirements,owned,currentLevel:level,code,ready:!code};
}
