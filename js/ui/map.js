import {ISLANDS} from '../data.js';
import {canVisit,levelForXp} from '../progression.js';
import {h,button,badge} from './dom.js';
export function renderMap(state){
  const root=h('div',{class:'map-panel'});
  const map=h('div',{class:'archipelago-map'});
  const positions={palm:[64,71],coral:[25,50],frost:[77,20]};
  map.append(h('div',{class:'map-grid-lines'}),h('span',{class:'map-ocean-label'},'THE OPEN SEA'));
  for(const island of Object.values(ISLANDS)){const p=positions[island.id];map.append(h('div',{class:'map-island '+island.id,style:{left:p[0]+'%',top:p[1]+'%','--accent':island.color}},h('i',{}),h('b',{},island.name),h('small',{},canVisit(island.id,state.totalXp)?'Нээлттэй':'Lv.'+island.level)));}
  root.append(map);
  for(const island of Object.values(ISLANDS)){
    const unlocked=canVisit(island.id,state.totalXp),current=state.lastIsland===island.id;
    root.append(h('article',{class:'island-card',style:{'--accent':island.color}},h('div',{class:'island-symbol'},island.id==='palm'?'♧':island.id==='coral'?'✷':'△'),h('div',{},h('p',{class:'eyebrow'},island.subtitle),h('h3',{},island.name),h('p',{},(island.id==='palm'?7:island.id==='coral'?8:10)+' species · Lv.'+island.level)),button(current?'Одоо энд':unlocked?'Аялах ↗':'Lv.'+island.level+' хэрэгтэй','travel',{islandId:island.id},unlocked?'btn primary':'btn subtle',!unlocked||current)));
  }
  root.append(h('p',{class:'help-text'},'Загас барих бүрд XP нэмэгдэнэ. Таны Level: '+levelForXp(state.totalXp)+'.'));return root;
}
