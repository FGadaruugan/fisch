import {ISLANDS} from './data.js';
export const lerp=(a,b,t)=>a+(b-a)*t;
export const smooth=(a,b,value)=>{const t=Math.min(1,Math.max(0,(value-a)/(b-a)));return t*t*(3-2*t);};
function hash(x,z,seed){const n=Math.sin(x*127.1+z*311.7+seed*0.017)*43758.5453;return(n-Math.floor(n))*2-1;}
export function noise2(x,z,seed=0){const ix=Math.floor(x),iz=Math.floor(z),fx=smooth(0,1,x-ix),fz=smooth(0,1,z-iz);return lerp(lerp(hash(ix,iz,seed),hash(ix+1,iz,seed),fx),lerp(hash(ix,iz+1,seed),hash(ix+1,iz+1,seed),fx),fz);}
export function seededRandom(seed){let value=seed>>>0;return()=>{value+=0x6D2B79F5;let t=value;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}

export function createTerrainModel(islandId) {
  const meta=ISLANDS[islandId];if(!meta)throw new RangeError('Unknown island');
  const center={x:meta.center[0],z:meta.center[1]},radius=meta.radius;
  const point=(x,z)=>({x:center.x+x,z:center.z+z});
  const buildings=[[-17,radius*0.78,11,9],[19,radius*0.76,9,8],[-33,radius*0.69,9,8],[35,radius*0.68,8,8]];
  const onPier=(x,z)=>Math.abs(x-center.x)<=4.5&&z-center.z>=radius*0.80&&z-center.z<=radius*1.23;
  const coastRadius=angle=>radius*(1+0.045*Math.sin(angle*5+meta.seed)+0.025*Math.sin(angle*9-meta.seed));
  function heightAt(x,z){
    if(onPier(x,z))return 2.2;
    const lx=x-center.x,lz=z-center.z,d=Math.hypot(lx,lz),r=d/coastRadius(Math.atan2(lz,lx));
    if(r>=1)return-3-Math.min(10,(r-1)*25);
    const core=1-smooth(0.15,0.86,r);
    const peak=meta.biome==='alpine'?72:meta.biome==='coral'?40:48;
    const ridge=Math.exp(-((lx/radius+0.1)**2*5+(lz/radius+0.2)**2*7));
    const rough=noise2(lx/37,lz/37,meta.seed)*2.2+noise2(lx/12,lz/12,meta.seed+3)*0.55;
    let h=0.9+core*(3+ridge*peak+rough*2);
    const port=smooth(radius*0.64,radius*0.80,lz)*(1-smooth(12,36,Math.abs(lx)));
    h=lerp(h,1.5+Math.max(0,radius*0.79-lz)*0.05,port);
    return h;
  }
  function isWalkable(x,z){
    if(!Number.isFinite(x)||!Number.isFinite(z))return false;
    const lx=x-center.x,lz=z-center.z;
    if(buildings.some(([bx,bz,w,d])=>Math.abs(lx-bx)<w/2+0.5&&Math.abs(lz-bz)<d/2+0.5))return false;
    return onPier(x,z)||Math.hypot(lx,lz)<coastRadius(Math.atan2(lz,lx))-1.3;
  }
  function fishingSpot(position){
    const lx=position.x-center.x,lz=position.z-center.z,d=Math.hypot(lx,lz),coast=coastRadius(Math.atan2(lz,lx));
    if(!(onPier(position.x,position.z)&&lz>radius*0.98)&&!(d>coast-10&&d<coast))return null;
    const dx=onPier(position.x,position.z)?0:lx/(d||1),dz=onPier(position.x,position.z)?1:lz/(d||1);
    return {x:position.x+dx*14,z:position.z+dz*14,y:0.35,direction:{x:dx,z:dz}};
  }
  const spawn=point(0,radius*0.83),seller=point(-9,radius*0.82),ferry=point(10,radius*0.89);
  for(const p of [spawn,seller,ferry])p.y=heightAt(p.x,p.z);
  return{meta,islandId,center,radius,spawn,seller,ferry,buildings,coastRadius,heightAt,isWalkable,fishingSpot,onPier};
}
