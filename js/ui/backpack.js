import {FISH,RARITIES,RODS} from '../data.js';
import {fishPrice} from '../progression.js';
import {fishIcon} from '../models/fish.js';
import {h,button,empty,badge,money} from './dom.js';
import {getCatchInfo} from './fish-info.js';

export function renderBackpack(state,{tab='fish',rarity='all',sort='weight',merchant=false,onFilter}={}) {
  const root=h('div',{class:'backpack-panel'});
  const tabs=h('div',{class:'tabs'});
  for(const [id,label]of [['fish','Загас · '+state.fish.length],['rods','Саваа · '+state.rods.length]])tabs.append(h('button',{class:tab===id?'active':'',type:'button',onClick:()=>onFilter({tab:id})},label));
  root.append(tabs);
  if(tab==='rods'){root.append(renderRodShop(state));return root;}
  const filter=h('select',{'aria-label':'Ховор байдлаар шүүх',onChange:event=>onFilter({rarity:event.target.value})},h('option',{value:'all'},'Бүх rarity'),...Object.keys(RARITIES).map(key=>h('option',{value:key},key)));filter.value=rarity;
  const sorter=h('select',{'aria-label':'Загас эрэмбэлэх',onChange:event=>onFilter({sort:event.target.value})},h('option',{value:'weight'},'Хамгийн хүнд'),h('option',{value:'value'},'Хамгийн үнэтэй'),h('option',{value:'recent'},'Сүүлд барьсан'));sorter.value=sort;
  root.append(h('div',{class:'filter-row'},filter,sorter,h('span',{class:'capacity'},state.fish.length+' / 100 slots')));
  let fish=state.fish.filter(f=>rarity==='all'||FISH[f.speciesId].rarity===rarity);
  fish=[...fish].sort((a,b)=>sort==='value'?fishPrice(b)-fishPrice(a):sort==='recent'?Date.parse(b.caughtAt)-Date.parse(a.caughtAt):b.weightGrams-a.weightGrams);
  if(!fish.length)root.append(empty('Таны дараагийн гайхамшиг энд байна','Эргийн тавцангаас загас бариад Backpack-доо цуглуулаарай.'));
  else{
    const grid=h('div',{class:'fish-grid'});
    for(const caught of fish){const info=getCatchInfo(caught),color=info.color;
      grid.append(h('article',{class:'fish-card',style:{'--accent':color}},
        h('details',{class:'fish-detail','data-catch-id':caught.id},
          h('summary',{class:'fish-summary'},h('span',{class:'fish-image'},h('img',{src:fishIcon(info.speciesId),alt:'',loading:'lazy'}),badge(info.rarity,color)),h('b',{class:'fish-name'},info.name),h('span',{class:'fish-values'},h('b',{},info.kg+' kg'),h('span',{},'✦ '+money(info.value))),h('span',{class:'fish-expand'},'Дэлгэрэнгүй',h('i',{'aria-hidden':'true'},'+'))),
          h('dl',{class:'fish-details'},
            h('dt',{},'Загас'),h('dd',{},info.name),h('dt',{},'Жин'),h('dd',{},info.kg+' kg'),
            h('dt',{},'Ховор байдал'),h('dd',{},badge(info.rarity,color)),h('dt',{},'Үнэ'),h('dd',{},'✦ '+money(info.value)),
            h('dt',{},'Барьсан арал'),h('dd',{},info.islandName),h('dt',{},'Барьсан огноо'),h('dd',{},h('time',{datetime:info.caughtAt},info.dateLabel)))
        ),
        button('Зарах','sell_fish',{id:caught.id},'btn subtle compact',!merchant)
      ));
    }root.append(grid);
  }
  const total=state.fish.reduce((sum,f)=>sum+fishPrice(f),0);
  root.append(h('div',{class:'panel-summary'},h('div',{},h('small',{},'НИЙТ ҮНЭ'),h('b',{},'✦ '+money(total))),button('Бүгдийг зарах','sell_all',{},'btn primary',!merchant||!state.fish.length)));
  if(!merchant)root.append(h('p',{class:'help-text'},'Загасаа худалдаачны дэргэд очоод зарна.'));
  return root;
}
export function renderRodShop(state){
  const root=h('div',{class:'rod-grid'});
  for(const rod of Object.values(RODS)){
    const owned=state.rods.includes(rod.id),equipped=state.equippedRod===rod.id;
    root.append(h('article',{class:'rod-shop-card',style:{'--accent':rod.color}},
      h('div',{class:'rod-illustration'},h('i',{}),h('b',{},'◉')),
      h('div',{class:'rod-info'},h('p',{class:'eyebrow'},equipped?'EQUIPPED':owned?'OWNED':'UPGRADE YOUR VOYAGE'),h('h3',{},rod.name),h('p',{},rod.description),h('div',{class:'rod-attributes'},h('span',{},'Control '+Math.round(rod.width*100)+'%'),h('span',{},'Luck ×'+rod.luck))),
      button(equipped?'Тоноглосон':owned?'Тоноглох':'✦ '+money(rod.price)+' · Авах',owned?'equip_rod':'buy_rod',{rodId:rod.id},equipped?'btn subtle':'btn primary',equipped||(!owned&&state.coins<rod.price))
    ));
  }return root;
}
