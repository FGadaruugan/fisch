import {ISLANDS,speciesForIsland} from '../data.js';
import {canVisit,levelForXp} from '../progression.js';
import {destinationInfo} from '../navigation.js';
import {createMapSurface,updateMapSurface} from './chart.js';
import {h,button} from './dom.js';
export function updateMapNavigation(root,context={}){
  updateMapSurface(root,context);
  const route=context.route||destinationInfo(context.position||{x:0,z:0},context.destination),copy=route?route.name+' · Эрэг хүртэл '+Math.round(route.distance)+' м':'Арал сонгоод газрын зураг дээр маршрутаа хараарай.';
  const readout=root.querySelector('[data-map-route]');if(readout&&readout.textContent!==copy)readout.textContent=copy;
}
export function renderMap(state,context={}){
  const root=h('div',{class:'map-panel'}),map=h('div',{class:'archipelago-map'},createMapSurface(document),h('span',{class:'map-scale'},'4 км × 4 км · ▲ ТА'));
  root.append(map,h('p',{class:'map-route','data-map-route':''}));
  for(const island of Object.values(ISLANDS)){
    const unlocked=canVisit(island.id,state.totalXp),current=unlocked&&context.location===island.id,route=destinationInfo(context.position||{x:0,z:0},island.id);
    root.append(h('article',{class:'island-card',style:{'--accent':island.color}},h('div',{class:'island-symbol'},island.id==='palm'?'♧':island.id==='coral'?'✷':island.id==='sanctuary'?'▥':'△'),h('div',{},h('p',{class:'eyebrow'},island.subtitle),h('h3',{},island.name),h('p',{},'Lv.'+island.level+' · '+speciesForIsland(island.id).length+' загас · '+Math.round(route.distance)+' м')),button(current?'Энд байна':unlocked?'Чиглэл сонгох':'Lv.'+island.level+' хэрэгтэй','travel',{islandId:island.id},unlocked?'btn primary':'btn subtle',!unlocked||current)));
  }
  root.append(h('p',{class:'help-text'},'Чиглэлээ сонгоод завь эсвэл сэлэлтээр өөрөө хүрнэ. E / Харилцах — завинд суух, буух. Завийг боомтын ажилтнаас дуудаж болно. W/S — хурд, A/D — жолоо; утсан дээр joystick. Таны Level: '+levelForXp(state.totalXp)+'.'));
  updateMapNavigation(root,{...context,totalXp:state.totalXp});return root;
}
