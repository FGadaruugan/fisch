import {h,button} from './dom.js';
const labels={supported:'Дэмжинэ',unsupported:'Дэмжихгүй',unknown:'Тодорхойгүй'};
export function ensureSupportTarget(doc){
  let target=doc.getElementById('loadingSupport');
  if(!target){
    target=doc.createElement('div');target.id='loadingSupport';target.className='loading-support';target.hidden=true;
    doc.getElementById('loading').append(target);
  }
  return target;
}
export function renderDeviceSupport(report={}){
  const root=h('section',{class:'device-support'},h('div',{class:'support-heading'},h('h3',{},'Төхөөрөмжийн дэмжлэг'),button('Дахин шалгах','support_refresh',{},'btn subtle compact')));
  root.append(h('p',{class:'help-text'},'Энэ browser-ийн одоогийн боломж, зөвшөөрлийн мэдээлэл.'));
  const list=h('dl',{class:'support-list'});
  for(const feature of report.features||[])list.append(h('div',{class:'support-row'},h('dt',{},h('b',{},feature.label),h('small',{},feature.detail)),h('dd',{class:'support-status '+feature.status},labels[feature.status]||labels.unknown)));
  root.append(list,h('p',{class:'help-text'},'Графикийн API дэмжих нь өндөр FPS-ийн баталгаа болохгүй. FPS болон RAF Hz нь ажиллаж буй тоглоомын хэмжилтээр шинэчлэгдэнэ.'));
  return root;
}
