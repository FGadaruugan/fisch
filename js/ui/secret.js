import {RODS,RARITIES} from '../data.js';
import {getSecretTradeInfo} from '../trade.js';
import {formatKg} from '../progression.js';
import {fishIcon} from '../models/fish.js';
import {h,button,badge,money} from './dom.js';

export function renderSecretTrade(state,context={}){
  const info=getSecretTradeInfo(state),rod=RODS[info.rodId];
  const root=h('section',{class:'secret-trade'},h('div',{class:'secret-hero'},h('span',{'aria-hidden':'true'},'✧'),h('p',{class:'eyebrow'},'THE KEEPER OF FIVE OFFERINGS'),h('h3',{},rod.name),h('p',{},'Туурийн сахиулын нууц солилцоо'),h('div',{class:'secret-attributes'},h('span',{},'Control '+Math.round(rod.width*100)+'%'),h('span',{},'Luck ×'+rod.luck))));
  if(info.owned){root.append(h('p',{class:'trade-complete'},'Өргөл хүлээн авсан. Энэ нууц саваа одоо таных.'),button(state.equippedRod===rod.id?'Тоноглосон':'Тоноглох','equip_rod',{rodId:rod.id},'btn primary',state.equippedRod===rod.id));return root;}
  root.append(h('div',{class:'trade-requirements'},h('span',{},'Lv.'+info.currentLevel+' / '+info.level),h('span',{},info.requirements.filter(r=>r.fish).length+' / 5 загас'),h('b',{},'✦ '+money(info.price))));
  const list=h('div',{class:'offering-list'});
  for(const row of info.requirements)list.append(h('article',{class:'offering'+(row.fish?' ready':' missing')},h('img',{src:fishIcon(row.speciesId),alt:''}),h('div',{},h('b',{},row.name),badge(row.rarity,RARITIES[row.rarity].color)),h('span',{},row.fish?'✓ '+formatKg(row.fish.weightGrams)+' kg':'Олдоогүй')));
  root.append(list,h('p',{class:'help-text'},'Backpack дахь төрөл тус бүрийн хамгийн хөнгөн загасыг нэг нэгээр, мөн 100,000 зоосыг хасна. Collection, рекорд, XP хэвээр үлдэнэ. Зарсан загас өргөлд тооцогдохгүй.'),h('p',{class:'trade-balance'},'Таны зоос: ✦ '+money(state.coins)),button('5 загас + ✦ 100,000 · Солих','trade_rod',{rodId:rod.id},'btn primary trade-button',!info.ready||!context.secret));
  if(info.currentLevel<info.level)root.append(h('p',{class:'help-text'},'Эхлээд Lv.7 хүрээрэй.'));
  if(!context.secret)root.append(h('p',{class:'help-text'},'Солихын тулд сахиулын дэргэд явган зогсоорой.'));
  return root;
}
