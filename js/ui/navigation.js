import {ISLANDS} from '../data.js';
const compass=heading=>['N','NE','E','SE','S','SW','W','NW'][Math.round((heading||0)/45)%8];
const text=(node,value)=>{if(node&&node.textContent!==value)node.textContent=value;};
export function ensureVoyageHud(doc){
  let root=doc.getElementById('voyageHud');if(root)return root;
  root=doc.createElement('div');root.id='voyageHud';root.className='voyage-hud';root.setAttribute('aria-label','Аяллын чиглэл');
  root.innerHTML='<span data-voyage-motion>Алхаж байна</span><b data-voyage-heading></b><i data-voyage-arrow aria-hidden="true">↑</i><small data-voyage-route>Map дээр чиглэлээ сонгоорой</small>';
  doc.getElementById('playHud').append(root);return root;
}
export function renderVoyageHud(root,context={}){
  const heading=Math.round(context.heading||0),route=context.route;
  text(root.querySelector('[data-voyage-motion]'),context.sailing?'Завь · '+Math.round(context.speed||0)+' м/с':context.motion==='swimming'?'Сэлж байна':'Алхаж байна');
  text(root.querySelector('[data-voyage-heading]'),compass(heading)+' · '+heading+'°');
  text(root.querySelector('[data-voyage-route]'),route?route.name+' · '+Math.round(route.distance)+' м · '+route.compass:'Map дээр чиглэлээ сонгоорой');
  const arrow=root.querySelector('[data-voyage-arrow]');arrow.hidden=!route;if(route)arrow.style.transform='rotate('+(route.bearing-heading)+'deg)';
}
export function locationName(context={}){return context.location?ISLANDS[context.location]?.name||'Задгай далай':'Задгай далай';}
