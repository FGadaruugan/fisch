import {FISH,RARITIES} from './data.js';
import {formatKg,fishPrice} from './progression.js';
import {messageFor} from './errors.js';
import {createLobby} from './lobby.js';
import {renderBackpack,renderRodShop} from './ui/backpack.js';
import {renderProfile} from './ui/profile.js';
import {renderSettings} from './ui/settings.js';
import {renderMap} from './ui/map.js';
import {renderSocial} from './ui/social.js';
import {h,empty,badge,money} from './ui/dom.js';
import {fishIcon} from './models/fish.js';

const PANEL_TITLES={backpack:['YOUR COLLECTION','Backpack'],profile:['YOUR STORY','Profile'],shop:['THE NEXT UPGRADE','Rod shop'],map:['BEYOND THE HORIZON','Islands'],settings:['MAKE IT YOURS','Graphics & settings'],top:['THE BEST OF THE SEA','Top 30'],friends:['A SHARED JOURNEY','Friends'],guide:['YOUR FIRST CAST','Удирдлага']};
export function createUI({document:doc,onCommand,onPhase=()=>{},onCatch=()=>{}}) {
  const el=id=>doc.getElementById(id),root=el('shell'),lobby=createLobby({root});
  let snapshot=null,panel=null,mode='lobby',gameMode='local',context={},settings={},stats={},social={connected:false,metric:'xp'},filter={tab:'fish',rarity:'all',sort:'weight'},previousFocus=null,lastPhase='idle',lastNotice='',lastNoticeTime=0,catchTimer=null;
  const busySources=new Set(),originalDisabled=new WeakMap(),history=[];
  const send=(command,payload={})=>Promise.resolve(onCommand(command,payload)).catch(error=>showNotice(error?.code||'UNKNOWN'));
  const isEditing=()=>el('panelContent').contains(doc.activeElement)&&['INPUT','TEXTAREA'].includes(doc.activeElement?.tagName);
  function renderPanel(){
    if(!snapshot||!panel)return;
    const target=el('panelContent');let content;
    if(panel==='backpack')content=renderBackpack(snapshot,{...filter,merchant:context.merchant&&mode==='play',onFilter:patch=>{filter={...filter,...patch};renderPanel();}});
    else if(panel==='profile')content=renderProfile(snapshot,gameMode);
    else if(panel==='shop')content=h('div',{},h('div',{class:'shop-balance'},h('span',{},'ТАНЫ COIN'),h('b',{},'✦ '+money(snapshot.coins))),renderRodShop(snapshot),renderBackpack(snapshot,{tab:'fish',rarity:'all',sort:'value',merchant:context.merchant&&mode==='play',onFilter:patch=>{filter={...filter,...patch};}}));
    else if(panel==='settings')content=renderSettings(settings,stats);
    else if(panel==='map')content=renderMap(snapshot);
    else if(panel==='top'||panel==='friends')content=renderSocial(panel,social);
    else content=h('div',{class:'guide-panel'},h('h3',{},'Эхний загасаа барих'),h('ol',{},h('li',{},'WASD эсвэл joystick ашиглан тавцангийн үзүүрт оч.'),h('li',{},'F эсвэл Шидэх товчоо дарж бариад сулла.'),h('li',{},'Хөвөгч дохио өгөхөд F / Татах товчоо дахин дар.'),h('li',{},'Товчийг дарж/суллан барыг загасны тэмдэгтэй давхцуул.'),h('li',{},'Backpack-доо загасныхаа нэр, кг-г хар. Худалдаачинд зарж coin аваарай.')),h('h3',{},'Удирдлага'),h('p',{},'WASD / сум — алхах · Space — үсрэх · Mouse drag — камер · F — загасчлах · E — харилцах · B — Backpack · Esc — цэс'),h('p',{},'Утас: зүүн joystick-оор алхаж, дэлгэцийн баруун хоосон хэсгийг чирж камераа эргүүлнэ. Хоёр хуруугаар камерын зайг өөрчилнө.'));
    target.replaceChildren(content);applyBusy();
  }
  function applyBusy(){
    const busy=busySources.size>0;doc.body.dataset.busy=String(busy);
    for(const button of root.querySelectorAll('button[data-command], button[type="submit"]')){
      if(['close','open','lobby'].includes(button.dataset.command))continue;
      if(busy){if(!originalDisabled.has(button))originalDisabled.set(button,button.disabled);button.disabled=true;}
      else if(originalDisabled.has(button)){button.disabled=originalDisabled.get(button);originalDisabled.delete(button);}
    }
  }
  function showPanel(name){
    if(name==='lobby'||name==='play'){mode=name;panel=null;el('modalBackdrop').hidden=true;doc.body.dataset.panelOpen='false';lobby.showPanel(mode);if(previousFocus?.isConnected)previousFocus.focus?.();previousFocus=null;return;}
    previousFocus=doc.activeElement;panel=name;doc.body.dataset.panelOpen='true';
    const titles=PANEL_TITLES[name]||PANEL_TITLES.guide;el('panelEyebrow').textContent=titles[0];el('panelTitle').textContent=titles[1];el('modalBackdrop').hidden=false;renderPanel();el('modal').querySelector('.close-button')?.focus();
    if(name==='top'||name==='friends')void send('social_refresh',{panel:name,metric:social.metric});
  }
  function showNotice(code){
    const text=messageFor(code),now=performance.now();if(text===lastNotice&&now-lastNoticeTime<2500)return;
    lastNotice=text;lastNoticeTime=now;const notice=h('div',{class:'toast'},h('span',{},'•'),h('p',{},text));el('notices').append(notice);if(el('notices').children.length>3)el('notices').firstElementChild.remove();setTimeout(()=>notice.remove(),4500);
  }
  function click(event){
    const button=event.target.closest?.('[data-command]');if(!button||button.disabled)return;
    let payload={};try{payload=JSON.parse(button.dataset.payload||'{}');}catch{return;}
    void send(button.dataset.command,payload);
  }
  function submit(event){
    if(event.target.matches('[data-profile-form]')){event.preventDefault();const data=new FormData(event.target);doc.activeElement?.blur?.();void send('update_profile',{name:String(data.get('name')||''),avatar:Number(data.get('avatar'))});}
    else if(event.target.matches('[data-friend-form]')){event.preventDefault();const data=new FormData(event.target);void send('friend_request',{code:String(data.get('code')||'').trim().toUpperCase()});}
  }
  function setting(event){
    const control=event.target;if(!control.dataset?.setting)return;
    const name=control.dataset.setting,value=control.type==='checkbox'?control.checked:control.dataset.number==='true'?Number(control.value):control.value;
    const label=root.querySelector('[data-range-label="'+name+'"]');if(label)label.textContent=typeof value==='number'?value.toFixed(control.step&&Number(control.step)<1?1:0):String(value);
    void send('settings',{[name]:value});
  }
  function keyboard(event){
    if(!panel)return;
    if(event.key==='Escape'&&!event.isComposing){event.preventDefault();void send('close');}
    if(event.key==='Tab'){
      const elements=[...el('modal').querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),a[href]')].filter(n=>n.getClientRects().length);
      const first=elements[0],last=elements.at(-1);if(!first)return;
      if(event.shiftKey&&doc.activeElement===first){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&doc.activeElement===last){event.preventDefault();first.focus();}
    }
  }
  const backdropClick=event=>{if(event.target===el('modalBackdrop'))void send('close');};
  root.addEventListener('click',click);root.addEventListener('submit',submit);root.addEventListener('change',setting);root.addEventListener('input',event=>{if(event.target.type==='range')setting(event);});doc.addEventListener('keydown',keyboard);el('modalBackdrop').addEventListener('click',backdropClick);
  for(let i=0;i<18;i++)el('statsBars').append(h('i',{}));
  el('retryButton').addEventListener('click',()=>globalThis.location.reload());
  return{
    renderSnapshot(state){snapshot=state;lobby.renderHeader(state);if(panel&&panel!=='settings'&&!isEditing())renderPanel();},
    showPanel,showNotice,
    renderFishing(view){
      if(view.phase!==lastPhase){onPhase(view.phase,lastPhase);lastPhase=view.phase;}
      const active=['charging','waiting','bite','reeling'].includes(view.phase);doc.body.dataset.fishingActive=String(active);el('fishingHud').hidden=!active||mode!=='play'||!!panel;
      el('chargeTrack').hidden=view.phase!=='charging';el('reelTrack').hidden=view.phase!=='reeling';el('reelProgressTrack').hidden=view.phase!=='reeling';
      el('chargeFill').style.width=(view.charge*100)+'%';el('reelBar').style.width=(view.width*100)+'%';el('reelBar').style.left=((view.bar-view.width/2)*100)+'%';el('reelTarget').style.left=(view.target*100)+'%';el('reelProgress').style.width=(view.progress*100)+'%';
      const text={idle:['Шидэх','Дарж бариад сулла','🎣'],charging:['Шидэх','Хүчээ сонгоод сулла','↗'],waiting:['Хүлээж байна','Хөвөгчийг ажигла','···'],bite:['Татах!','Одоо дар!','!'],reeling:['Татах','Дарж / суллаж удирд','↕'],caught:['Барьлаа','Дараагийн загас?','✦'],escaped:['Дахин шидэх','Шинэ боломж','🎣']}[view.phase];
      el('actionLabel').textContent=text[0];el('actionSub').textContent=text[1];el('actionIcon').textContent=text[2];el('fishingAction').dataset.phase=view.phase;
      el('fishingPhase').textContent={charging:'Саваагаа цэнэглэ',waiting:'Далайн нууцыг хүлээ',bite:'ЗАГАС ӨГӨӨШ АВЛАА!',reeling:'Загасны тэмдэгтэй барыг давхцуул'}[view.phase]||'';
      el('fishingRemaining').textContent=view.phase==='charging'?Math.round(view.charge*100)+'%':view.phase==='reeling'?Math.ceil(view.remaining)+'s':view.phase==='bite'?'Одоо дар!':'';
      el('fishingTip').textContent=view.phase==='reeling'?'Дарвал дээш, суллавал доош. Давхцуулж ахицаа дүүргэ.':view.phase==='waiting'?'Хөвөгч дохио өгөхөд Татах товчийг дар.':'Хүчээ сонгоод товчоо суллаарай.';
    },
    renderContext(next){context=next;el('contextHint').textContent=next.merchant?'Худалдаачин · E / Харилцах':next.ferry?'Арал руу аялах · E / Харилцах':next.spot?'Загасчлах бүс · F товчоо дарж бариад сулла':'Тавцангийн үзүүрт эсвэл эргийн усанд ойртоорой.';},
    showCatch(caught){
      const f=FISH[caught.speciesId],target=el('catchNotice');clearTimeout(catchTimer);
      target.replaceChildren(h('p',{class:'eyebrow'},'A NEW DISCOVERY'),h('img',{src:fishIcon(f.id),alt:f.name}),
        badge(f.rarity,RARITIES[f.rarity].color),h('h3',{},f.name),
        h('div',{class:'catch-values'},h('b',{},formatKg(caught.weightGrams)+' kg'),
          h('span',{},'✦ '+money(fishPrice(caught))),h('span',{class:'catch-xp'},'+'+RARITIES[f.rarity].xp+' XP')));
      target.style.setProperty('--accent',RARITIES[f.rarity].color);target.hidden=false;catchTimer=setTimeout(()=>target.hidden=true,3800);onCatch(caught);
    },
    setBusy(value,source='game'){if(value)busySources.add(source);else busySources.delete(source);applyBusy();},
    setSettings(next){settings=next;el('performanceHud').hidden=!settings.showStats;},
    setConnection(nextMode){gameMode=nextMode;el('connectionBadge').className='connection-badge '+(nextMode==='online'?'online':'');el('connectionBadge').replaceChildren(h('i',{}),nextMode==='online'?'ONLINE':'LOCAL');if(panel==='profile'&&!isEditing())renderPanel();},
    setSocial(next){social={...social,...next};if(['top','friends'].includes(panel)&&!isEditing())renderPanel();},
    getPanel:()=>panel,
    renderPerformance(next){
      stats=next;el('statsFps').textContent=(stats.fps||'—')+' FPS';el('statsHz').textContent='RAF ≈ '+(stats.hz||'—')+' Hz';el('statsQuality').textContent=stats.quality||'AUTO';
      el('statsDetail').textContent=(stats.frameMs?stats.frameMs.toFixed(1)+'ms':'—')+' · '+stats.calls+' calls · '+Math.round(stats.triangles/1000)+'k tris';
      history.push(stats.fps);if(history.length>18)history.shift();[...el('statsBars').children].forEach((bar,index)=>bar.style.height=(3+(history[index]||0)/144*24)+'px');
      const hour=Math.floor(stats.hour),minute=Math.floor((stats.hour-hour)*60);el('islandTime').textContent=String(hour).padStart(2,'0')+':'+String(minute).padStart(2,'0');
      if(panel==='settings'){const b=el('panelContent').querySelector('.graphics-summary b');if(b)b.textContent=(stats.fps||'—')+' FPS';}
    },
    finishLoading(){el('loading').hidden=true;},
    showError(message){el('loading').hidden=false;el('loadingText').textContent=message;el('retryButton').hidden=false;el('loading').querySelector('.loading-wave').hidden=true;},
    dispose(){clearTimeout(catchTimer);root.removeEventListener('click',click);root.removeEventListener('submit',submit);root.removeEventListener('change',setting);doc.removeEventListener('keydown',keyboard);el('modalBackdrop').removeEventListener('click',backdropClick);}
  };
}
