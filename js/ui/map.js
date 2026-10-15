import {ISLANDS} from '../data.js';
import {canVisit,levelForXp} from '../progression.js';
import {projectMapPoint,destinationInfo} from '../navigation.js';
import {h,button} from './dom.js';
export function updateMapNavigation(root,context={}){
  const marker=root.querySelector('[data-map-player]');if(!marker)return;
  const point=projectMapPoint(context.position||{});marker.style.left=point.left+'%';marker.style.top=point.top+'%';marker.style.setProperty('--heading',(context.heading||0)+'deg');
  for(const node of root.querySelectorAll('[data-map-island]'))node.dataset.target=String(node.dataset.mapIsland===context.destination);
  const route=context.route||destinationInfo(context.position||{x:0,z:0},context.destination),copy=route?route.name+' · '+Math.round(route.distance)+' м · '+route.compass+' '+Math.round(route.bearing)+'°':'Арал сонгоод чиглэлээ аваарай.';
  const readout=root.querySelector('[data-map-route]');if(readout.textContent!==copy)readout.textContent=copy;
}
export function renderMap(state,context={}){
  const root=h('div',{class:'map-panel'}),map=h('div',{class:'archipelago-map',role:'img','aria-label':'Арлууд болон таны бодит байрлал'});
  map.append(h('div',{class:'map-grid-lines'}),h('span',{class:'map-ocean-label'},'THE OPEN SEA'),h('span',{class:'map-north'},'↑ N'),h('span',{class:'map-scale'},'4 км × 4 км'));
  for(const island of Object.values(ISLANDS)){
    const point=projectMapPoint({x:island.center[0],z:island.center[1]});
    map.append(h('div',{class:'map-island '+island.id,'data-map-island':island.id,style:{left:point.left+'%',top:point.top+'%','--accent':island.color,'--diameter':island.radius/20+'%'}},h('i',{}),h('b',{},island.name),h('small',{},canVisit(island.id,state.totalXp)?'Нээлттэй':'Lv.'+island.level)));
  }
  map.append(h('div',{class:'map-player','data-map-player':''},h('i',{}),h('b',{},'ТА')));
  root.append(map,h('p',{class:'map-route','data-map-route':''}));
  for(const island of Object.values(ISLANDS)){
    const unlocked=canVisit(island.id,state.totalXp),current=context.location===island.id,route=destinationInfo(context.position||{x:0,z:0},island.id);
    root.append(h('article',{class:'island-card',style:{'--accent':island.color}},h('div',{class:'island-symbol'},island.id==='palm'?'♧':island.id==='coral'?'✷':'△'),h('div',{},h('p',{class:'eyebrow'},island.subtitle),h('h3',{},island.name),h('p',{},'Lv.'+island.level+' · '+Math.round(route.distance)+' м · '+route.compass)),button(current?'Энд байна':unlocked?'Чиглэл сонгох':'Lv.'+island.level+' хэрэгтэй','travel',{islandId:island.id},unlocked?'btn primary':'btn subtle',!unlocked||current)));
  }
  root.append(h('p',{class:'help-text'},'Чиглэлээ сонгоод завь эсвэл сэлэлтээр өөрөө хүрнэ. E / Харилцах — завинд суух, буух. Завийг боомтын ажилтнаас дуудаж болно. W/S — хурд, A/D — жолоо; утсан дээр joystick. Таны Level: '+levelForXp(state.totalXp)+'.'));
  updateMapNavigation(root,context);return root;
}
