import {FISH,RARITIES} from '../data.js';
import {levelProgress,formatKg} from '../progression.js';
import {fishIcon} from '../models/fish.js';
import {h,button,badge,stat,AVATARS,money} from './dom.js';
import {renderAccount} from './account.js';
import {getProfileInfo} from './fish-info.js';
const percent=new Intl.NumberFormat('en-US',{maximumFractionDigits:3});
export function renderProfile(state,mode='local',account={}) {
  const progress=levelProgress(state.totalXp),info=getProfileInfo(state),best=info.best;
  const root=h('div',{class:'profile-panel'});
  root.append(h('section',{class:'profile-hero'},h('div',{class:'large-avatar'},AVATARS[state.profile.avatar]),h('div',{},h('p',{class:'eyebrow'},mode==='online'?'ONLINE VOYAGER':'LOCAL VOYAGER'),h('h3',{},state.profile.name),h('span',{class:'level-label'},'LEVEL '+progress.level))));
  if(mode==='online')root.append(button('Local аялалд очих','switch_local',{},'btn subtle'));
  root.append(renderAccount(account,mode));
  root.append(h('div',{class:'xp-section'},h('div',{class:'xp-caption'},h('b',{},'Дараагийн эрэг рүү'),h('span',{},money(progress.current)+' / '+money(progress.needed)+' XP')),h('div',{class:'xp-track'},h('i',{style:{width:(progress.fraction*100)+'%'}}))));
  root.append(h('div',{class:'stats-grid'},stat(money(state.stats.totalCaught),'Барьсан загас'),stat(state.collection.length+'/'+Object.keys(FISH).length,'Нээгдсэн species'),stat('✦ '+money(state.coins),'Coin'),stat(best?formatKg(best.weightGrams)+' kg':'—','Хамгийн хүнд')));
  if(best)root.append(h('div',{class:'personal-best'},h('img',{src:fishIcon(best.speciesId),alt:best.name}),h('div',{},h('p',{class:'eyebrow'},'PERSONAL BEST'),h('h3',{},best.name),badge(best.rarity,best.color)),h('div',{class:'record-values'},h('b',{},best.kg+' kg'),h('small',{},'✦ '+money(best.value)))));
  root.append(h('div',{class:'section-heading'},h('h3',{},'Барилтын статистик'),h('span',{},'Нийт барьсан · зарсан загас багтана')));
  const rarityStats=h('div',{class:'rarity-breakdown'});
  for(const rarity of info.rarities)rarityStats.append(h('div',{class:'rarity-stat',style:{'--accent':rarity.color}},badge(rarity.label,rarity.color),h('b',{},money(rarity.count)),h('small',{},'барьсан')));
  root.append(rarityStats,h('div',{class:'section-heading'},h('h3',{},'Арлын ахиц'),h('span',{},info.islands.filter(island=>island.unlocked).length+' / '+info.islands.length+' нээгдсэн')));
  const islands=h('div',{class:'profile-islands'});
  for(const island of info.islands)islands.append(h('div',{class:'profile-island'+(island.unlocked?' unlocked':' locked')+(island.current?' current':''),style:{'--accent':island.color}},h('span',{class:'island-status'},island.current?'Одоо энд':island.unlocked?'Нээгдсэн':'🔒 Lv.'+island.level),h('b',{},island.name),h('small',{},island.unlocked?'Lv.'+island.level+' · Нээлттэй':'Lv.'+island.level+' хүрээд нээнэ')));
  root.append(islands);
  const odds=info.odds,oddsPanel=h('section',{class:'odds-panel'},h('div',{class:'odds-heading'},h('div',{},h('h3',{},'Luck ба магадлал'),h('p',{},odds.rodName+' · '+odds.islandName)),h('span',{class:'luck-pill'},'Luck ×'+odds.luck)));
  const oddsRows=h('tbody');
  for(const rarity of odds.rarities)oddsRows.append(h('tr',{class:rarity.probability?'':'unavailable'},h('th',{scope:'row'},badge(rarity.label,rarity.color)),h('td',{},h('b',{},percent.format(rarity.probability*100)+'%'),rarity.probability?null:h('small',{},'Энэ аралд байхгүй'))));
  oddsPanel.append(h('table',{class:'odds-table'},h('thead',{},h('tr',{},h('th',{scope:'col'},'Ангилал'),h('th',{scope:'col'},'Сонгогдох хувь'))),oddsRows),h('p',{class:'help-text'},'Luck нь Rare, Legendary, Mythic, ??? ангиллын сонголтын жинг үржүүлнэ. Хувийг энэ аралд байгаа ангиллуудаас тооцсон. Барих амжилт reel удирдлагаас хамаарна.'));
  root.append(oddsPanel);
  const form=h('form',{'data-profile-form':'',class:'profile-form'},h('h3',{},'Өөрийн нэр, аватар'));
  form.append(h('label',{},'Тоглогчийн нэр',h('input',{name:'name',value:state.profile.name,maxlength:18,minlength:1,required:true,autocomplete:'off'})));
  const avatars=h('div',{class:'avatar-options'});
  AVATARS.forEach((avatar,index)=>avatars.append(h('label',{class:'avatar-choice'},h('input',{type:'radio',name:'avatar',value:index,checked:state.profile.avatar===index}),h('span',{},avatar))));
  form.append(avatars,h('button',{type:'submit',class:'btn primary'},'Хадгалах'));root.append(form);
  root.append(h('div',{class:'section-heading'},h('h3',{},'Fish collection'),h('span',{},state.collection.length+' / '+Object.keys(FISH).length)));
  const collection=h('div',{class:'collection-grid'});
  for(const f of Object.values(FISH)){const discovered=state.collection.includes(f.id);collection.append(h('div',{class:'collection-card'+(discovered?'':' locked'),style:{'--accent':RARITIES[f.rarity].color}},h('img',{src:fishIcon(f.id),alt:discovered?f.name:'Нээгдээгүй загас'}),h('b',{},discovered?f.name:'???'),h('small',{},f.rarity)));}
  root.append(collection);return root;
}
