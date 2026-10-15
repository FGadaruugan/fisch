import {ISLANDS,GAME} from './data.js';
import {createTerrainModel} from './terrain.js';
import {canVisit} from './progression.js';
export const WATER_LEVEL=.3;
const terrains=Object.fromEntries(Object.keys(ISLANDS).map(id=>[id,createTerrainModel(id)]));
const finite=(x,z)=>Number.isFinite(x)&&Number.isFinite(z);
export function createNavigationModel({islandId='palm',totalXp=0}={}){
  let current=islandId,xp=totalXp;
  const inBounds=(x,z)=>finite(x,z)&&Math.abs(x)<GAME.oceanSize/2-15&&Math.abs(z)<GAME.oceanSize/2-15;
  function nearby(position,margin=0){return Object.values(terrains).find(m=>m.onPier(position.x,position.z)||Math.hypot(position.x-m.center.x,position.z-m.center.z)<=m.coastRadius(Math.atan2(position.z-m.center.z,position.x-m.center.x))+margin);}
  function heightAt(x,z){const m=nearby({x,z},60);return m?m.heightAt(x,z):-13;}
  function canOccupy(x,z){
    if(!inBounds(x,z))return false;
    const m=nearby({x,z});
    return !m||m.heightAt(x,z)<=WATER_LEVEL+.3||(canVisit(m.meta.id,xp)&&!m.isBlocked(x,z));
  }
  return{
    models:terrains,
    get islandId(){return current;},get meta(){return ISLANDS[current];},get center(){return terrains[current].center;},get radius(){return terrains[current].radius;},get spawn(){return terrains[current].spawn;},get seller(){return terrains[current].seller;},get ferry(){return terrains[current].ferry;},get secret(){return terrains[current].secret;},
    setAccess(value){xp=value;},setIsland(id){if(!ISLANDS[id])throw new RangeError('Unknown island');current=id;},
    heightAt,canOccupy,isWalkable:canOccupy,isWater:(x,z)=>heightAt(x,z)<=WATER_LEVEL+.3,
    canSail:(x,z)=>inBounds(x,z)&&heightAt(x,z)<-.5,
    islandAt(position,margin=0){return nearby(position,margin)?.meta||null;},
    fishingSpot(position){const m=nearby(position);return m&&canVisit(m.meta.id,xp)&&m.meta.id===current&&heightAt(position.x,position.z)>WATER_LEVEL+.3?m.fishingSpot(position):null;}
  };
}
export function projectMapPoint(position={}){
  const value=key=>Math.min(98,Math.max(2,((Number.isFinite(position[key])?position[key]:0)/GAME.oceanSize+.5)*100));
  return{left:value('x'),top:value('z')};
}
export function destinationInfo(position,id){
  const m=terrains[id];if(!m)return null;
  const dx=m.center.x-position.x,dz=m.center.z-position.z,bearing=(Math.atan2(dx,-dz)*180/Math.PI+360)%360;
  const coast=m.coastRadius(Math.atan2(-dz,-dx));
  return{id,name:m.meta.name,distance:Math.max(0,Math.hypot(dx,dz)-coast),bearing,compass:['N','NE','E','SE','S','SW','W','NW'][Math.round(bearing/45)%8]};
}
