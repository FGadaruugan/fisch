import {ISLANDS} from '../data.js';
import {createMapSurface,updateMapSurface} from './chart.js';
const text=(node,value)=>{if(node&&node.textContent!==value)node.textContent=value;};
export function ensureVoyageHud(doc){
  let root=doc.getElementById('voyageHud');if(root?.querySelector('[data-map-surface]'))return root;
  if(!root){root=doc.createElement('div');root.id='voyageHud';doc.getElementById('playHud').append(root);}
  root.className='voyage-hud';root.setAttribute('aria-label','Газрын зураг');
  const button=doc.createElement('button');button.type='button';button.className='minimap-open';button.setAttribute('data-command','open');button.setAttribute('data-payload',JSON.stringify({panel:'map'}));button.setAttribute('aria-label','Том газрын зураг нээх');
  const title=doc.createElement('span');title.className='minimap-title';title.textContent='🗺 MAP';
  const motion=doc.createElement('span');motion.setAttribute('data-voyage-motion','');motion.className='minimap-motion';
  const route=doc.createElement('small');route.setAttribute('data-voyage-route','');route.textContent='Дарж томруулах';
  button.append(title,createMapSurface(doc,{compact:true}),motion,route);root.replaceChildren(button);return root;
}
export function renderVoyageHud(root,context={}){
  const route=context.route;
  text(root.querySelector('[data-voyage-motion]'),context.sailing?'Завь · '+Math.round(context.speed||0)+' м/с':context.motion==='swimming'?'Сэлж байна':'Алхаж байна');
  text(root.querySelector('[data-voyage-route]'),route?route.name+' · '+Math.round(route.distance)+' м':'Дарж томруулах');
  updateMapSurface(root,context);
}
export function locationName(context={}){return context.location?ISLANDS[context.location]?.name||'Задгай далай':'Задгай далай';}
