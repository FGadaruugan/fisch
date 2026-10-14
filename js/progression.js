import {FISH,ISLANDS,RARITIES,GAME} from './data.js';

export const safeXp = value => Number.isFinite(value) ? Math.min(GAME.maxXp,Math.max(0,Math.floor(value))) : 0;
export const levelForXp = xp => Math.floor(Math.sqrt(safeXp(xp)/100))+1;
export const nextLevelXp = xp => 100*levelForXp(xp)**2;
export const canVisit = (islandId,xp) => !!ISLANDS[islandId] && levelForXp(xp)>=ISLANDS[islandId].level;
export const formatKg = grams => (Math.max(0,Number.isFinite(grams)?grams:0)/1000).toFixed(2);
export function fishPrice(sample) {
  const species=FISH[sample?.speciesId];
  if (!species || !Number.isInteger(sample.weightGrams) || sample.weightGrams<species.minGrams || sample.weightGrams>species.maxGrams) throw new RangeError('Invalid fish sample');
  return Math.max(1,Math.round(sample.weightGrams/1000*RARITIES[species.rarity].price));
}
export function levelProgress(xp) {
  const level=levelForXp(xp),start=100*(level-1)**2,end=100*level**2;
  return {level,current:safeXp(xp)-start,needed:end-start,fraction:(safeXp(xp)-start)/(end-start),next:end};
}
