import {h} from './dom.js';
function select(label,key,options,value){
  const control=h('select',{'data-setting':key,'data-number':key==='targetFps'?'true':'false'},...options.map(([v,t])=>h('option',{value:v},t)));control.value=String(value);
  return h('label',{class:'setting-row'},h('span',{},h('b',{},label)),control);
}
function range(label,key,value,min,max,step,unit=''){
  return h('label',{class:'setting-row range-row'},h('span',{},h('b',{},label),h('small',{'data-range-label':key},Number(value).toFixed(step<1?1:0)+unit)),h('input',{type:'range',min,max,step,value,'data-setting':key,'data-number':'true'}));
}
function toggle(label,key,value,description){
  return h('label',{class:'setting-row'},h('span',{},h('b',{},label),description?h('small',{},description):null),h('span',{class:'switch'},h('input',{type:'checkbox',checked:value,'data-setting':key}),h('i',{})));
}
export function renderSettings(settings,stats={}){
  const root=h('div',{class:'settings-panel'});
  root.append(h('div',{class:'graphics-summary'},h('span',{},'LIVE GRAPHICS'),h('b',{},(stats.fps||'—')+' FPS'),h('span',{},'RAF ≈ '+(stats.hz||'—')+' Hz'),h('span',{},stats.quality||'Auto')));
  root.append(h('h3',{class:'settings-heading'},'Зураг ба гүйцэтгэл'),
    select('Quality','quality',[['auto','Auto · Adaptive'],['low','Low'],['medium','Medium'],['high','High'],['ultra','Ultra']],settings.quality),
    select('FPS cap','targetFps',[[30,'30 FPS'],[60,'60 FPS'],[90,'90 FPS'],[120,'120 FPS'],[144,'144 FPS'],[0,'Uncapped']],settings.targetFps),
    range('Render scale','renderScale',settings.renderScale,0.6,1.5,0.1,'×'),
    range('Харах зай','viewDistance',settings.viewDistance,500,2600,100,' units'),
    toggle('Сүүдэр','shadows',settings.shadows,'Quality нь сүүдрийн нарийвчлалыг сонгоно.'),
    toggle('Манан','fog',settings.fog,'Холын эрэг ба агаарын гүн'),
    toggle('Орчны жижиг эффект','particles',settings.particles,'Цас, жижиг гэрэл'),
    toggle('FPS хэмжилт','showStats',settings.showStats,'FPS, RAF cadence, frame time'),
    h('h3',{class:'settings-heading'},'Гэрэл ба цаг'),
    range('Гэрэлтүүлэг','exposure',settings.exposure,0.5,1.8,0.1,'×'),
    range('Өдрийн цаг','timeOfDay',settings.timeOfDay,0,24,0.1,'h'),
    toggle('Өдөр, шөнийн цикл','dayCycle',settings.dayCycle),
    h('h3',{class:'settings-heading'},'Дуу'),
    range('Дууны түвшин','volume',settings.volume,0,1,0.1)
  );
  root.append(h('p',{class:'help-text'},'Auto нь үргэлжилсэн ачаалалд чанарыг тохируулна. FPS cap нь зурагдах давтамжийг удирдана. RAF Hz нь browser-ийн animation cadence-ийн ойролцоо хэмжилт.'));
  return root;
}
