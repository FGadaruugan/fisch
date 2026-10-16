import {h,button} from './dom.js';
import {GUI_OPTIONS,GUI_DEFAULTS} from '../gui.js';
import {renderDeviceSupport} from './device-support.js';
import {renderInstallCard} from './install.js';
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
export function renderSettings(settings,stats={},support={},install={}){
  const root=h('div',{class:'settings-panel'});
  root.append(h('section',{class:'coloros-card','aria-label':'ColorOS 2'},h('span',{class:'coloros-mark','aria-hidden':'true'},'2'),h('div',{},h('p',{class:'eyebrow'},'FISCH · LAGOON'),h('h3',{},'ColorOS 2'),h('p',{},'Далайн шинэ өнгө. Таны аяллын шинэ төрх.'))));
  root.append(renderInstallCard(install));
  root.append(h('div',{class:'graphics-summary'},h('span',{},'LIVE GRAPHICS'),h('b',{'data-live-stat':'fps'},(stats.fps||'—')+' FPS'),h('span',{'data-live-stat':'hz'},'RAF ≈ '+(stats.hz||'—')+' Hz'),h('span',{'data-live-stat':'quality'},stats.quality||'AUTO')),h('div',{'data-device-support':''},renderDeviceSupport(support)));
  const gui=h('section',{class:'gui-settings'},h('h3',{class:'settings-heading'},'GUI · Дэлгэцийн мэдээлэл'),h('p',{class:'help-text'},'Хэрэгтэй мэдээллээ ON, хэрэггүйг OFF болгоорой. Анхны тохиргоо бүгд ON. Сонголт энэ төхөөрөмжид хадгалагдана.'));
  for(const option of GUI_OPTIONS)gui.append(h('label',{class:'setting-row'},h('span',{},h('b',{},option.label),h('small',{},option.description)),h('span',{class:'switch gui-switch'},h('input',{type:'checkbox',checked:settings[option.key]!==false,'data-setting':option.key}),h('i',{}),h('b',{class:'gui-state','aria-hidden':'true'}))));
  gui.append(button('Бүх GUI-г ON болгох','settings',GUI_DEFAULTS,'btn subtle gui-restore'),h('h3',{class:'settings-heading'},'Байнга ON'));
  for(const [label,description]of [
    ['Цэс ба үндсэн товчнууд','Settings, Profile, Backpack, Islands, Lobby, бүтэн дэлгэц'],
    ['Тоглох удирдлага','Joystick, үсрэх, загасчлах, харилцах'],
    ['Загас татах bar ба дохио','Загасчлалын үеийн хүч, bite, reel, ахиц'],
    ['Алдаа ба account мэдэгдэл','Хадгалалт, нэвтрэлт, холболтын чухал мэдээлэл']
  ])gui.append(h('div',{class:'setting-row gui-locked'},h('span',{},h('b',{},label),h('small',{},description)),h('span',{class:'gui-lock'},'🔒 ON')));
  root.append(gui);
  root.append(h('h3',{class:'settings-heading'},'Зураг ба гүйцэтгэл'),
    select('Quality','quality',[['auto','Auto · Adaptive'],['low','Low'],['medium','Medium'],['high','High'],['ultra','Ultra']],settings.quality),
    select('FPS cap','targetFps',[[30,'30 FPS'],[60,'60 FPS'],[90,'90 FPS'],[120,'120 FPS'],[144,'144 FPS'],[0,'Uncapped']],settings.targetFps),
    range('Render scale','renderScale',settings.renderScale,0.6,1.5,0.1,'×'),
    range('Харах зай','viewDistance',settings.viewDistance,500,2600,100,' units'),
    toggle('Сүүдэр','shadows',settings.shadows,'Quality нь сүүдрийн нарийвчлалыг сонгоно.'),
    toggle('Манан','fog',settings.fog,'Холын эрэг ба агаарын гүн'),
    toggle('Орчны жижиг эффект','particles',settings.particles,'Цас, жижиг гэрэл'),
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
