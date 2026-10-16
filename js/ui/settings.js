import {h,button} from './dom.js';
import {CATEGORIES,CONTROLS,PRESETS,CATEGORY_KEYS,matchesSearch} from '../settings/catalog.js';
import {DEFAULT_SETTINGS} from '../performance.js';
import {RELEASE} from '../release.js';
import {renderDeviceSupport} from './device-support.js';
import {renderInstallCard} from './install.js';
export function settingsItemVisible({category,query,text,selected='general'}){return query.trim()?matchesSearch(text,query):category===selected;}
export function formatBytes(bytes){if(!Number.isFinite(bytes))return '—';return bytes<1024?bytes+' B':bytes<1048576?(bytes/1024).toFixed(1)+' KB':(bytes/1048576).toFixed(2)+' MB';}
function controlRow(o,settings){
  const text=h('span',{},h('b',{},o.label),h('small',{},o.description),h('em',{'data-changed-label':'',hidden:true},'Өөрчилсөн'));let input;
  if(o.type==='select'){input=h('select',{'data-setting':o.key,'data-number':String(!!o.number)},...o.options.map(([value,label])=>h('option',{value},label)));input.value=String(settings[o.key]);}
  else if(o.type==='toggle')input=h('span',{class:'switch gui-switch'},h('input',{type:'checkbox',checked:settings[o.key],'data-setting':o.key}),h('i',{}),h('b',{class:'gui-state','aria-hidden':'true'}));
  else{text.append(h('output',{'data-range-label':o.key},''));input=h('input',{type:'range',min:o.min,max:o.max,step:o.step,value:settings[o.key],'data-setting':o.key,'data-number':'true'});}
  return h('label',{class:'setting-row ss2-control','data-control-row':o.key,'data-settings-item':'','data-search':o.label+' '+o.description},text,input);
}
const tierInfo={core:['Үндсэн','Тоглоом, 3D runtime, интерфэйс. Офлайн local эхлүүлэлт.'],extended:['Нэмэлт','Үндсэн + account, social модулиуд. Cloud боломжид интернэт хэрэгтэй.'],full:['Бүрэн','Бүх багц + аппын дүрс, install metadata, credits.']};
export function renderSettings(settings,stats={},support={},install={},initial={},onCommand=()=>{}){
  let selected='general',query='',current={settings,...initial},profileSignature='';
  const root=h('div',{class:'ss2','data-settings-root':''});
  const search=h('input',{type:'search',placeholder:'Тохиргоо хайх…',maxlength:80,'aria-label':'Бүх тохиргооноос хайх',autocomplete:'off'});
  const clear=h('button',{type:'button',class:'ss2-clear','aria-label':'Хайлтыг цэвэрлэх',hidden:true},'×');
  const nav=h('nav',{class:'ss2-nav','aria-label':'Тохиргооны ангилал'}),sections=h('div',{class:'ss2-sections',tabindex:'0','aria-label':'Тохиргооны агуулга'});
  const results=h('p',{class:'ss2-results',role:'status','aria-live':'polite',hidden:true});
  const noResults=h('div',{class:'ss2-empty',hidden:true},h('b',{},'Тохиргоо олдсонгүй'),h('p',{},'Өөр үгээр хайж эсвэл хайлтаа цэвэрлээрэй.'));
  const categorySections=new Map();
  for(const cat of CATEGORIES){
    const tab=h('button',{type:'button',class:'ss2-category','data-category':cat.id,'aria-pressed':String(cat.id===selected)},h('span',{'aria-hidden':'true'},cat.icon),h('span',{},h('b',{},cat.label),h('small',{},cat.description)));
    tab.addEventListener('click',()=>{selected=cat.id;query='';search.value='';filter();sections.scrollTop=0;});nav.append(tab);
    const section=h('section',{class:'ss2-section','data-section':cat.id,'aria-label':cat.label},h('header',{class:'ss2-section-head'},h('div',{},h('p',{class:'eyebrow'},'SETTINGS SYSTEM 2'),h('h3',{},cat.label),h('p',{},cat.description)),CATEGORY_KEYS[cat.id].length?button('Сэргээх','settings_reset',{category:cat.id},'btn subtle compact'):null));
    categorySections.set(cat.id,section);sections.append(section);
  }
  function item(category,text,...children){const node=h('div',{class:'ss2-card','data-settings-item':'','data-search':text},...children);categorySections.get(category).append(node);return node;}
  item('general','SS 2 ColorOS Lagoon ерөнхий хураангуй',h('div',{class:'ss2-hero'},h('span',{class:'ss2-mark','aria-hidden':'true'},'SS²'),h('div',{},h('p',{class:'eyebrow'},'YOUR GAME. YOUR WAY.'),h('h3',{},'Танд таарсан Fisch'),h('p',{},'Хялбар сонголт. Илүү нарийн удирдлага.'))),h('div',{class:'ss2-summary'},h('b',{'data-settings-summary':''}),button('↶ Буцаах','settings_undo',{},'btn subtle compact',true)));
  item('general','Бэлэн горим хэмнэлт тэнцвэртэй өндөр чанар preset',h('h4',{},'Бэлэн горим'),h('div',{class:'ss2-presets'},...PRESETS.map(p=>button([h('b',{},p.label),h('small',{},p.description)],'settings_preset',{id:p.id},'ss2-preset'))),h('p',{class:'help-text'},'Горим нь графикийн сонголтыг өөрчилнө. Бодит FPS нь төхөөрөмжөөс хамаарна.'));
  const profileList=h('div',{class:'ss2-profile-list','data-settings-profiles':''}),profileName=h('input',{name:'name',required:'',maxlength:18,placeholder:'Жишээ: Миний утас','aria-label':'Профайлын нэр',autocomplete:'off'}),profileFeedback=h('p',{class:'help-text',role:'status','aria-live':'polite'});
  const profileForm=h('form',{class:'ss2-profile-form'},profileName,h('button',{type:'submit',class:'btn primary compact'},'Хадгалах'));
  profileForm.addEventListener('submit',async event=>{event.preventDefault();const saved=await onCommand('settings_profile_save',{name:profileName.value});profileFeedback.textContent=saved?'Профайл хадгаллаа.':'1–18 тэмдэгттэй нэр оруулна уу. Дээд тал нь 3 профайл хадгална; хадгалалтын алдаа гарвал мэдэгдэл үзүүлнэ.';if(saved)profileName.value='';});
  item('general','Өөрийн профайл хадгалах ачаалах устгах',h('h4',{},'Миний профайлууд · 3 хүртэл'),h('p',{class:'help-text'},'Зөвхөн энэ төхөөрөмжийн тохиргоог хадгална.'),profileList,profileForm,profileFeedback);
  categorySections.get('graphics').append(h('div',{class:'graphics-summary','data-settings-item':'','data-search':'Live FPS Hz чанар performance'},h('span',{},'LIVE GRAPHICS'),h('b',{'data-live-stat':'fps'},(stats.fps||'—')+' FPS'),h('span',{'data-live-stat':'hz'},'RAF ≈ '+(stats.hz||'—')+' Hz'),h('span',{'data-live-stat':'quality'},stats.quality||'AUTO')));
  for(const o of CONTROLS)categorySections.get(o.category).append(controlRow(o,settings));
  item('display','Байнга ON удирдлага хамгаалагдсан controls joystick загасчлах',h('h4',{},'Байнга ON'),h('p',{class:'help-text'},'Цэс, joystick, үсрэх, загасчлах, таталтын bar, алдаа ба account мэдэгдэл үргэлж харагдана.'));
  item('network','Сүлжээ local online offline холболт сервер дахин холбох шалгах',h('div',{class:'ss2-status-line'},h('span',{class:'ss2-dot','aria-hidden':'true'}),h('b',{'data-network-mode':''})),h('p',{'data-network-hint':'',class:'help-text'}),h('p',{'data-network-check':'',class:'ss2-check',role:'status','aria-live':'polite'}),h('div',{class:'ss2-actions'},button('Холболт шалгах','network_check',{},'btn primary compact'),button('Online холбох','connect_online',{},'btn subtle compact'),button('Local тоглох','switch_local',{},'btn subtle compact'),button('Account шинэчлэх','account_refresh',{},'btn subtle compact')),h('p',{class:'help-text'},'Local ахиц энэ төхөөрөмжид хадгалагдана. Account, Friends, Top болон cloud хадгалалт интернэт шаарддаг.'));
  const resourceCards=h('div',{class:'ss2-resource-grid'});
  for(const [id,[label,description]]of Object.entries(tierInfo))resourceCards.append(h('article',{class:'ss2-resource','data-tier':id},h('span',{class:'eyebrow'},id==='core'?'ESSENTIAL':id==='extended'?'CONNECTED':'COMPLETE'),h('h4',{},label),h('p',{},description),h('strong',{'data-tier-size':id},'—'),h('progress',{'data-tier-progress':id,max:1,value:0,'aria-label':label+' таталтын явц'}),h('small',{'data-tier-count':id}),button('Татах','resources_download',{tier:id},'btn primary compact')));
  item('resources','Нөөц татах багц файл хэмжээ офлайн download pause resume үндсэн нэмэлт бүрэн',h('p',{class:'help-text'},'Файлын хэмжээ нь шахаагүй бодит byte. Хадгалах зай, сүлжээгээр дамжих хэмжээ өөр байж болно.'),resourceCards,h('p',{'data-resource-status':'',class:'ss2-resource-status',role:'status','aria-live':'polite'}),h('div',{class:'ss2-actions'},button('Түр зогсоох','resources_pause',{},'btn subtle compact'),button('Үргэлжлүүлэх / дахин оролдох','resources_resume',{},'btn subtle compact')),h('p',{'data-offline-status':'',class:'help-text'}),h('p',{'data-storage-estimate':'',class:'help-text'}));
  for(const [group,title,description]of [['extras','Аппын нэмэлт файл','Аппын дүрс, install metadata, credits-ийг устгана.'],['social','Бүх нэмэлт файл','Account/social болон аппын нэмэлт файлыг устгана. Үндсэн тоглоом үлдэнэ.']])item('resources',title+' устгах нөөц',h('details',{class:'ss2-remove'},h('summary',{},title+' устгах'),h('p',{class:'help-text'},description+' Ахиц, зүрх, тохиргоо, session-д хүрэхгүй.'),button('Устгах','resources_remove',{group},'btn subtle compact')));
  item('device','Апп суулгах install android ios desktop',renderInstallCard(install));
  item('device','Төхөөрөмж дэмжлэг WebGL graphics GPU browser',h('div',{'data-device-support':''},renderDeviceSupport(support)));
  item('about','Fisch хувилбар version SS Settings System ColorOS FSFS JavaScript',h('div',{class:'ss2-version'},h('span',{class:'ss2-mark','aria-hidden':'true'},'f'),h('div',{},h('h3',{},'Fisch '+RELEASE.version),h('p',{},RELEASE.date+' · '+RELEASE.appearance))),h('dl',{class:'ss2-about'},...[[RELEASE.settings,'Settings System · тохиргооны систем'],[RELEASE.appearance,'Lagoon интерфэйс ба өнгө төрх'],[RELEASE.system,'Fisch System · JavaScript тоглоомын систем']].map(([name,text])=>h('div',{},h('dt',{},name),h('dd',{},text)))),h('p',{'data-build-label':'',class:'help-text'}));
  item('about','Шинэчлэлт release notes changelog мэдээлэл',h('h4',{},'Шинэчилсэн мэдээлэл'),h('ul',{class:'ss2-release-notes'},...RELEASE.notes.map(text=>h('li',{},text))),h('a',{href:'./CREDITS.txt',target:'_blank',rel:'noopener',class:'ss2-credits','data-settings-credits':''},'Credits ба лиценз ↗'));
  function filter(){
    let count=0;
    for(const [id,section]of categorySections){const category=CATEGORIES.find(c=>c.id===id);let visible=0;for(const row of section.querySelectorAll('[data-settings-item]')){row.hidden=!settingsItemVisible({category:id,selected,query,text:category.label+' '+category.description+' '+row.dataset.search});if(!row.hidden)visible++;}section.hidden=!visible;count+=visible;}
    for(const tab of nav.querySelectorAll('[data-category]'))tab.setAttribute('aria-pressed',String(!query.trim()&&tab.dataset.category===selected));
    clear.hidden=!query;results.hidden=!query.trim();results.textContent=count+' үр дүн';noResults.hidden=count>0;
  }
  search.addEventListener('input',()=>{query=search.value;filter();});clear.addEventListener('click',()=>{search.value='';query='';filter();search.focus();});
  root.append(h('div',{class:'ss2-toolbar'},h('label',{class:'ss2-search'},h('span',{'aria-hidden':'true'},'⌕'),search,clear),h('span',{class:'ss2-badge'},'SS 2')),h('div',{class:'ss2-layout'},nav,h('div',{class:'ss2-content'},results,sections,noResults)));
  root.updateSettings=next=>{
    current={...current,...next};const values=current.settings||settings;
    for(const o of CONTROLS){const row=root.querySelector('[data-control-row="'+o.key+'"]'),control=row.querySelector('[data-setting]');if(o.type==='toggle')control.checked=values[o.key];else control.value=String(values[o.key]);row.dataset.changed=String(values[o.key]!==DEFAULT_SETTINGS[o.key]);row.querySelector('[data-changed-label]').hidden=values[o.key]===DEFAULT_SETTINGS[o.key];if(o.type==='range')row.querySelector('[data-range-label]').textContent=Number(values[o.key]).toFixed(o.step<1?1:0)+(o.unit||'');}
    root.querySelector('[data-command="settings_undo"]').disabled=!current.canUndo;
    root.querySelector('[data-settings-summary]').textContent=String(values.quality).toUpperCase()+' · '+(values.targetFps?values.targetFps+' FPS':'FPS ∞')+' · '+Object.keys(DEFAULT_SETTINGS).filter(k=>values[k]!==DEFAULT_SETTINGS[k]).length+' өөрчлөлт';
    for(const action of root.querySelectorAll('[data-command="settings_preset"]')){const p=PRESETS.find(p=>p.id===JSON.parse(action.dataset.payload).id);action.setAttribute('aria-pressed',String(Object.entries(p.values).every(([key,value])=>values[key]===value)));}
    const signature=JSON.stringify(current.profiles||[]);if(signature!==profileSignature){profileSignature=signature;const focused=profileList.contains(document.activeElement);profileList.replaceChildren(...(current.profiles||[]).map(p=>h('div',{class:'ss2-profile'},h('b',{},p.name),button('Ачаалах','settings_profile_load',{id:p.id},'btn subtle compact'),button('Устгах','settings_profile_delete',{id:p.id},'btn subtle compact'))));if(focused)profileName.focus({preventScroll:true});}
    const net=current.network||{hint:'unknown',check:{status:'idle'}},check=net.check||{};
    root.querySelector('[data-network-mode]').textContent=current.gameMode==='online'?'ONLINE · Cloud холбогдсон':'LOCAL · Энэ төхөөрөмж';
    root.querySelector('[data-network-hint]').textContent=net.hint==='offline'?'Browser: сүлжээгүй гэсэн дохио.':net.hint==='online'?'Browser: сүлжээтэй гэсэн дохио. Серверт хүрч байгааг тусад нь шалгана.':'Browser-ийн сүлжээний дохио тодорхойгүй.';
    root.querySelector('[data-network-check]').textContent={idle:'Static файлын серверийг хараахан шалгаагүй.',checking:'Static файлын серверийг шалгаж байна…',success:'Static файлын сервер хариуллаа · '+check.duration+' ms',error:'Static файлын серверт хүрсэнгүй. Дахин шалгаж болно.'}[check.status]||'';
    root.querySelector('[data-command="network_check"]').disabled=check.status==='checking';root.querySelector('[data-command="account_refresh"]').disabled=current.gameMode!=='online';
    const resources=current.resources||{status:'idle',tiers:{}},downloading=resources.status==='downloading',unavailable=resources.status==='unsupported'||resources.error==='BUILD_MISMATCH';
    for(const id of Object.keys(tierInfo)){const tier=resources.tiers?.[id]||{},card=root.querySelector('[data-tier="'+id+'"]'),done=tier.files>0&&tier.files===tier.completed;card.dataset.complete=String(done);card.querySelector('[data-tier-size]').textContent=formatBytes(tier.bytes);const progress=card.querySelector('progress');progress.max=tier.bytes||1;progress.value=tier.downloadedBytes||0;card.querySelector('[data-tier-count]').textContent=tier.files?(tier.completed||0)+' / '+tier.files+' файл · '+formatBytes(tier.downloadedBytes||0):'Файлын жагсаалтыг уншиж байна';const action=card.querySelector('button');action.disabled=unavailable||!tier.files||downloading||done;action.textContent=done?'✓ Татсан':downloading&&resources.selected===id?'Татаж байна…':'Татах';}
    root.querySelector('[data-command="resources_pause"]').disabled=!downloading;root.querySelector('[data-command="resources_resume"]').disabled=unavailable||!['paused','error'].includes(resources.status);
    for(const action of root.querySelectorAll('[data-command="resources_remove"]'))action.disabled=unavailable||downloading;
    root.querySelector('[data-resource-status]').textContent=resources.error==='BUILD_MISMATCH'?'Шинэ хувилбар гарсан байна. Тоглоомоо дахин нээгээд нөөцөө татаарай.':resources.status==='error'?'Таталт амжилтгүй. Сүлжээ болон сул зайгаа шалгаад дахин оролдоорой.':{idle:'Хэрэгтэй багцаа сонгоорой.',downloading:'Батлагдсан файл бүрийн дараа явц хадгалагдана.',paused:'Түр зогссон. Дууссан файлууд хадгалагдсан.',completed:'Сонгосон багц бүрэн татагдлаа.',unsupported:'Энэ browser-д нөөц хадгалах боломжгүй. Тоглоомыг интернэтээр ашиглаж болно.'}[resources.status]||'';
    root.querySelector('[data-offline-status]').textContent=resources.offlineReady?'✓ Офлайн local эхлүүлэх нөөц ба worker бэлэн.':resources.ready?'Үндсэн файл татсан. Worker идэвхжсэний дараа офлайн эхлүүлэлт бэлэн болно.':'Офлайн эхлүүлэхийн тулд үндсэн багцыг бүрэн татна.';
    root.querySelector('[data-storage-estimate]').textContent=current.storageEstimate?'Browser хадгалалт: ойролцоогоор '+formatBytes(current.storageEstimate.usage)+' ашигласан / '+formatBytes(current.storageEstimate.quota):'';
    root.querySelector('[data-build-label]').textContent=resources.build?'Build · '+resources.build:'';
    if(/^[a-f0-9]{24}$/.test(resources.build||'')){root.querySelector('[data-settings-credits]').setAttribute('href','./CREDITS.txt?fisch-build='+resources.build);root.querySelector('[data-app-install]').querySelector('img').setAttribute('src','./assets/app-192.png?fisch-build='+resources.build);}
  };
  root.updateSettings(current);filter();return root;
}
export function updateSettings(root,state){root.querySelector('[data-settings-root]')?.updateSettings(state);}
