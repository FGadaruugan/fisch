import {FISH,RARITIES} from '../data.js';
import {levelProgress,formatKg} from '../progression.js';
import {fishIcon} from '../models/fish.js';
import {h,button,badge,stat,AVATARS,money} from './dom.js';
export function renderProfile(state,mode='local') {
  const progress=levelProgress(state.totalXp),best=state.stats.bestCatch;
  const root=h('div',{class:'profile-panel'});
  root.append(h('section',{class:'profile-hero'},h('div',{class:'large-avatar'},AVATARS[state.profile.avatar]),h('div',{},h('p',{class:'eyebrow'},mode==='online'?'ONLINE VOYAGER':'LOCAL VOYAGER'),h('h3',{},state.profile.name),h('span',{class:'level-label'},'LEVEL '+progress.level))));
  root.append(button(mode==='online'?'Local аялалд очих':'Онлайн аялал нээх',mode==='online'?'switch_local':'connect_online',{},'btn subtle'));
  root.append(h('div',{class:'xp-section'},h('div',{class:'xp-caption'},h('b',{},'Дараагийн эрэг рүү'),h('span',{},money(progress.current)+' / '+money(progress.needed)+' XP')),h('div',{class:'xp-track'},h('i',{style:{width:(progress.fraction*100)+'%'}}))));
  root.append(h('div',{class:'stats-grid'},stat(money(state.stats.totalCaught),'Барьсан загас'),stat(state.collection.length+'/25','Нээгдсэн species'),stat('✦ '+money(state.coins),'Coin'),stat(best?formatKg(best.weightGrams)+' kg':'—','Хамгийн хүнд')));
  if(best){const f=FISH[best.speciesId];root.append(h('div',{class:'personal-best'},h('img',{src:fishIcon(f.id),alt:f.name}),h('div',{},h('p',{class:'eyebrow'},'PERSONAL BEST'),h('h3',{},f.name),badge(f.rarity,RARITIES[f.rarity].color)),h('b',{},formatKg(best.weightGrams)+' kg')));}
  const form=h('form',{'data-profile-form':'',class:'profile-form'},h('h3',{},'Өөрийн нэр, аватар'));
  form.append(h('label',{},'Тоглогчийн нэр',h('input',{name:'name',value:state.profile.name,maxlength:18,minlength:1,required:true,autocomplete:'off'})));
  const avatars=h('div',{class:'avatar-options'});
  AVATARS.forEach((avatar,index)=>avatars.append(h('label',{class:'avatar-choice'},h('input',{type:'radio',name:'avatar',value:index,checked:state.profile.avatar===index}),h('span',{},avatar))));
  form.append(avatars,h('button',{type:'submit',class:'btn primary'},'Хадгалах'));root.append(form);
  root.append(h('div',{class:'section-heading'},h('h3',{},'Fish collection'),h('span',{},state.collection.length+' / 25')));
  const collection=h('div',{class:'collection-grid'});
  for(const f of Object.values(FISH)){const discovered=state.collection.includes(f.id);collection.append(h('div',{class:'collection-card'+(discovered?'':' locked'),style:{'--accent':RARITIES[f.rarity].color}},h('img',{src:fishIcon(f.id),alt:discovered?f.name:'Нээгдээгүй загас'}),h('b',{},discovered?f.name:'???'),h('small',{},f.rarity)));}
  root.append(collection);return root;
}
