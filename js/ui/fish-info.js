import {FISH,RARITIES,ISLANDS,RODS,speciesForIsland} from '../data.js';
import {canVisit,fishPrice,formatKg} from '../progression.js';

const dateFormat=new Intl.DateTimeFormat('mn-MN',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'});
export function getCatchInfo(caught){
  if(!caught)return null;
  const species=FISH[caught.speciesId],instant=Date.parse(caught.caughtAt),hasDate=Number.isFinite(instant)&&instant>0;
  return{
    id:caught.id,speciesId:species.id,name:species.name,rarity:species.rarity,color:RARITIES[species.rarity].color,
    weightGrams:caught.weightGrams,kg:formatKg(caught.weightGrams),value:fishPrice(caught),
    islandName:ISLANDS[caught.islandId]?.name||'—',
    caughtAt:hasDate?new Date(instant).toISOString():null,dateLabel:hasDate?dateFormat.format(instant):'Огноо хадгалагдаагүй'
  };
}
export function getProfileInfo(state){
  return{
    best:getCatchInfo(state.stats.bestCatch),
    odds:getFishingOdds(state.lastIsland,state.equippedRod),
    rarities:Object.entries(RARITIES).map(([key,meta])=>({key,label:meta.label,color:meta.color,count:state.stats.rarityCounts[key]||0})),
    islands:Object.values(ISLANDS).map(island=>{
      const unlocked=canVisit(island.id,state.totalXp);
      return{id:island.id,name:island.name,color:island.color,level:island.level,unlocked,current:unlocked&&state.lastIsland===island.id};
    })
  };
}
export function getFishingOdds(islandId,rodId){
  const island=ISLANDS[islandId],rod=RODS[rodId];
  if(!island||!rod)throw new RangeError('Unknown island or rod');
  const available=new Set(speciesForIsland(islandId).map(fish=>fish.rarity));
  const rows=Object.entries(RARITIES).map(([key,meta])=>({key,label:meta.label,color:meta.color,weight:available.has(key)?meta.weight*(key==='Normal'?1:rod.luck):0}));
  const total=rows.reduce((sum,row)=>sum+row.weight,0);
  return{islandName:island.name,rodName:rod.name,luck:rod.luck,rarities:rows.map(({weight,...row})=>({...row,probability:weight/total}))};
}
