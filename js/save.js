import {FISH,RODS,RARITIES,GAME} from './data.js';
import {canVisit} from './progression.js';

export const SAVE_KEY='fisch3d.save.v1';
export const boundedInt=(value,max=GAME.maxXp)=>Number.isFinite(value)?Math.min(max,Math.max(0,Math.floor(value))):0;
export function createInitialState() {
  return {version:1,profile:{name:'Fisher',avatar:0},coins:0,totalXp:0,fish:[],rods:['starter'],equippedRod:'starter',stats:{totalCaught:0,rarityCounts:Object.fromEntries(Object.keys(RARITIES).map(key=>[key,0])),bestCatch:null},collection:[],lastIsland:'palm'};
}
export function validCatch(raw) {
  const species=FISH[raw?.speciesId];
  if(!species || typeof raw.id!=='string' || !/^[\w-]{1,64}$/.test(raw.id) || raw.islandId!==species.islandId || !Number.isInteger(raw.weightGrams) || raw.weightGrams<species.minGrams || raw.weightGrams>species.maxGrams) return null;
  const date=typeof raw.caughtAt==='string' && Number.isFinite(Date.parse(raw.caughtAt))?new Date(raw.caughtAt).toISOString():'1970-01-01T00:00:00.000Z';
  return {id:raw.id,speciesId:species.id,weightGrams:raw.weightGrams,islandId:species.islandId,caughtAt:date};
}
export function normalizeState(input) {
  const state=createInitialState();
  if(!input || typeof input!=='object' || Array.isArray(input) || input.version!==1) return state;
  state.coins=boundedInt(input.coins,GAME.maxCoins);state.totalXp=boundedInt(input.totalXp);
  const name=typeof input.profile?.name==='string'?input.profile.name.replace(/[\u0000-\u001f]/g,'').trim().slice(0,18):'';
  state.profile={name:name||'Fisher',avatar:Number.isInteger(input.profile?.avatar)&&input.profile.avatar>=0&&input.profile.avatar<=5?input.profile.avatar:0};
  const ids=new Set();
  for(const raw of (Array.isArray(input.fish)?input.fish:[]).slice(0,1000)) {
    const fish=validCatch(raw);if(!fish || ids.has(fish.id))continue;
    ids.add(fish.id);state.fish.push(fish);if(state.fish.length===GAME.capacity)break;
  }
  state.rods=[...new Set(['starter',...(Array.isArray(input.rods)?input.rods:[]).filter(id=>Object.hasOwn(RODS,id))])];
  state.equippedRod=state.rods.includes(input.equippedRod)?input.equippedRod:'starter';
  state.lastIsland=canVisit(input.lastIsland,state.totalXp)?input.lastIsland:'palm';
  const collection=(Array.isArray(input.collection)?input.collection:[]).filter(id=>Object.hasOwn(FISH,id));
  state.collection=[...new Set([...collection,...state.fish.map(f=>f.speciesId)])];
  for(const rarity of Object.keys(RARITIES)) state.stats.rarityCounts[rarity]=Math.max(boundedInt(input.stats?.rarityCounts?.[rarity]),state.fish.filter(f=>FISH[f.speciesId].rarity===rarity).length);
  const sum=Object.values(state.stats.rarityCounts).reduce((a,b)=>a+b,0);
  if(sum>GAME.maxXp) for(const rarity of Object.keys(RARITIES)) state.stats.rarityCounts[rarity]=state.fish.filter(f=>FISH[f.speciesId].rarity===rarity).length;
  state.stats.totalCaught=Math.max(state.fish.length,boundedInt(input.stats?.totalCaught),Math.min(GAME.maxXp,Object.values(state.stats.rarityCounts).reduce((a,b)=>a+b,0)));
  const best=validCatch(input.stats?.bestCatch);
  state.stats.bestCatch=[...(best?[best]:[]),...state.fish].reduce((old,fish)=>!old||fish.weightGrams>old.weightGrams?fish:old,null);
  return state;
}
