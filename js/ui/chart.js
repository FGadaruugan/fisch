import {ISLANDS,GAME} from '../data.js';
import {createTerrainModel} from '../terrain.js';
import {canVisit} from '../progression.js';
const svgNS='http://www.w3.org/2000/svg',shortNames={palm:'PALM',coral:'CORAL',frost:'FROST',sanctuary:'SANCTUARY'};
const coasts=Object.values(ISLANDS).map(meta=>{
  const model=createTerrainModel(meta.id),points=Array.from({length:48},(_,i)=>{const a=i*Math.PI*2/48,r=model.coastRadius(a);return[meta.center[0]+Math.cos(a)*r,meta.center[1]+Math.sin(a)*r].map(n=>n.toFixed(2)).join(',');}).join(' ');
  return{meta,points};
});
function svgNode(doc,tag,attributes,parent){const node=doc.createElementNS(svgNS,tag);for(const [key,value]of Object.entries(attributes))node.setAttribute(key,String(value));parent?.append(node);return node;}
export function createMapSurface(doc,{compact=false}={}){
  const root=doc.createElement('div');root.className='ocean-chart'+(compact?' compact':'');root.setAttribute('data-map-surface','');
  const size=GAME.oceanSize,svg=svgNode(doc,'svg',{viewBox:`${-size/2} ${-size/2} ${size} ${size}`,role:'img','aria-label':'Дөрвөн арал, таны байрлал болон сонгосон маршрут'},root);
  for(const {meta,points}of coasts){
    const group=svgNode(doc,'g',{'data-chart-island':meta.id,'data-locked':'false'},svg);
    svgNode(doc,'polygon',{points,fill:meta.color,class:'chart-land'},group);
    svgNode(doc,'rect',{x:meta.center[0]-5,y:meta.center[1]+meta.radius*.8,width:10,height:meta.radius*.43,fill:'#ddc799'},group);
    const label=svgNode(doc,'text',{x:meta.center[0],y:meta.center[1]+meta.radius+140,class:'chart-label','text-anchor':'middle'},group);label.textContent=compact?shortNames[meta.id]:meta.name;
    if(!compact){const level=svgNode(doc,'text',{x:meta.center[0],y:meta.center[1]+meta.radius+270,class:'chart-level','text-anchor':'middle'},group);level.textContent='Lv.'+meta.level;}
  }
  svgNode(doc,'line',{'data-chart-route':'',class:'chart-route',visibility:'hidden'},svg);
  const player=svgNode(doc,'g',{'data-chart-player':'',transform:'translate(0 0) rotate(0)',class:'chart-player'},svg);
  svgNode(doc,'circle',{r:95},player);svgNode(doc,'path',{d:'M0 -120 L65 75 L0 43 L-65 75 Z'},player);
  return root;
}
function set(node,key,value){const text=String(value);if(node.getAttribute(key)!==text)node.setAttribute(key,text);}
export function updateMapSurface(root,context={}){
  const player=root.querySelector('[data-chart-player]');if(!player)return;
  const finite=n=>Number.isFinite(n)?n:0,x=finite(context.position?.x),z=finite(context.position?.z),heading=finite(context.heading);
  set(player,'transform',`translate(${x} ${z}) rotate(${heading})`);
  const target=ISLANDS[context.destination],line=root.querySelector('[data-chart-route]');set(line,'visibility',target?'visible':'hidden');
  if(target)for(const [key,value]of Object.entries({x1:x,y1:z,x2:target.center[0],y2:target.center[1]}))set(line,key,value);
  for(const island of root.querySelectorAll('[data-chart-island]')){const id=island.getAttribute('data-chart-island');set(island,'data-selected',id===context.destination);if(Number.isFinite(context.totalXp))set(island,'data-locked',!canVisit(id,context.totalXp));}
}
