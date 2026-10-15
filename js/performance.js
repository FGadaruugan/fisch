import {GUI_DEFAULTS} from './gui.js';
export const DEFAULT_SETTINGS=Object.freeze({quality:'auto',targetFps:60,renderScale:1,shadows:true,fog:true,particles:true,timeOfDay:10.5,dayCycle:true,exposure:1,viewDistance:1400,volume:0.35,...GUI_DEFAULTS});
export const QUALITY_LEVELS=Object.freeze([
  {id:'low',label:'Low',density:0.3,lodDistance:90,shadowSize:512,pixelRatio:0.8,waterSegments:40},
  {id:'medium',label:'Medium',density:0.55,lodDistance:180,shadowSize:1024,pixelRatio:1,waterSegments:64},
  {id:'high',label:'High',density:0.8,lodDistance:350,shadowSize:2048,pixelRatio:1.35,waterSegments:96},
  {id:'ultra',label:'Ultra',density:1,lodDistance:650,shadowSize:2048,pixelRatio:1.5,waterSegments:128}
]);
const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
export function normalizeSettings(raw={}) {
  const s={...DEFAULT_SETTINGS};if(!raw||typeof raw!=='object')return s;
  if(['auto','low','medium','high','ultra'].includes(raw.quality))s.quality=raw.quality;
  if([0,30,60,90,120,144].includes(raw.targetFps))s.targetFps=raw.targetFps;
  for(const [key,min,max]of [['renderScale',0.6,1.5],['timeOfDay',0,24],['exposure',0.5,1.8],['viewDistance',500,2600],['volume',0,1]])if(Number.isFinite(raw[key]))s[key]=clamp(raw[key],min,max);
  for(const key of ['shadows','fog','particles','dayCycle',...Object.keys(GUI_DEFAULTS)])if(typeof raw[key]==='boolean')s[key]=raw[key];
  return s;
}
export function createFramePacer(target=60) {
  let previous=null,deadline=null,limit=target;
  return {
    step(now){
      const delta=previous===null?0:clamp((now-previous)/1000,0,0.05);previous=now;
      if(limit===0)return{draw:true,delta};
      const period=1000/limit;if(deadline===null)deadline=now;
      const draw=now+0.2>=deadline;
      if(draw)deadline+=Math.max(1,Math.floor((now-deadline)/period)+1)*period;
      return{draw,delta};
    },
    setTarget(value){limit=[0,30,60,90,120,144].includes(value)?value:60;deadline=null;},
    reset(){previous=null;deadline=null;}
  };
}
export function createAdaptiveQuality(initial=1) {
  let level=clamp(initial,0,3),slow=0,fast=0;
  return {
    get level(){return level;},
    setLevel(value){level=clamp(value,0,3);slow=0;fast=0;},
    tick(stats,dt,target=60){
      if(!stats.fps||!Number.isFinite(dt))return level;
      const expected=Math.min(target||144,Math.max(stats.hz||60,60));
      slow=stats.fps<expected*0.76?slow+dt:Math.max(0,slow-dt*2);
      fast=stats.fps>=expected*0.96?fast+dt:0;
      if(slow>3&&level>0){level--;slow=0;fast=0;}
      else if(fast>12&&level<3){level++;fast=0;slow=0;}
      return level;
    }
  };
}
export function createPerformanceMonitor() {
  let previous=null,windowStart=null,frames=0,fps=0,cpu=0,hz=0,calls=0,triangles=0;
  const samples=[];
  return {
    observeRaf(now){
      if(previous!==null){const dt=now-previous;if(dt>2&&dt<70){samples.push(dt);if(samples.length>120)samples.shift();}}
      previous=now;
      if(samples.length>=30){const sorted=[...samples].sort((a,b)=>a-b);hz=Math.round(1000/sorted[Math.floor(sorted.length*0.15)]);}
    },
    rendered(now,cost,info){
      cpu=cpu?cpu*0.85+cost*0.15:cost;calls=info?.calls??0;triangles=info?.triangles??0;
      if(windowStart===null){windowStart=now;frames=0;return;}
      frames++;if(now-windowStart>=1000){fps=frames*1000/(now-windowStart);frames=0;windowStart=now;}
    },
    getSnapshot(){return{fps:Math.round(fps),hz,cpuMs:cpu,calls,triangles,frameMs:fps?1000/fps:0};},
    reset(){previous=null;windowStart=null;frames=0;samples.length=0;fps=0;hz=0;}
  };
}
