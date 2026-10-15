import {supportsFullscreen} from './fullscreen.js';

function storageSupport(win){
  let storage,previous,attempted=false,result;
  const key='fisch3d.support-probe.'+(globalThis.crypto?.randomUUID?.()||Date.now()+'-'+Math.random());
  try{
    storage=win.localStorage;
    if(!storage)return{status:'unsupported',detail:'Local хадгалалтын API алга.'};
    previous=storage.getItem(key);attempted=true;storage.setItem(key,key);
    result=storage.getItem(key)===key?{status:'supported',detail:'Түр бичилт, уншилтын шалгалт тэнцсэн.'}:{status:'unsupported',detail:'Бичсэн мэдээллийг буцааж уншиж чадсангүй.'};
  }catch(error){
    result=['QuotaExceededError','NS_ERROR_DOM_QUOTA_REACHED'].includes(error?.name)?{status:'unknown',detail:'Хадгалалтын багтаамж дүүрсэн байж болно.'}:{status:'unsupported',detail:'Browser хадгалалтыг хаасан эсвэл бичих боломжгүй байна.'};
  }finally{
    if(attempted)try{if(previous===null)storage.removeItem(key);else storage.setItem(key,previous);}catch{result={status:'unknown',detail:'Түр бичилтийн шалгалтыг бүрэн дуусгаж чадсангүй.'};}
  }
  return result;
}
export function collectDeviceSupport({window:win=globalThis.window||{},document:doc=globalThis.document||{},navigator:nav=globalThis.navigator||{},graphics}={}){
  const check=(id,label,read)=>{try{return{id,label,...read()};}catch{return{id,label,status:'unknown',detail:'Browser энэ мэдээллийг өгөхгүй байна.'};}};
  return{features:[
    check('webgl','3D график · WebGL 2',()=>{
      if(graphics?.contextLost)return{status:'unknown',detail:'Графикийн холболт тасарсан. Дахин оролдоорой.'};
      if(graphics?.webgl2===true)return{status:'supported',detail:'3D контекст ажиллаж байна.'+(Number.isFinite(graphics.maxTextureSize)?' Max texture: '+graphics.maxTextureSize+' px.':'')};
      return typeof win.WebGL2RenderingContext==='function'?{status:'unknown',detail:'API илэрсэн; ажиллах 3D контекст баталгаажаагүй.'}:{status:'unsupported',detail:'Энэ browser WebGL 2 API өгөхгүй байна.'};
    }),
    check('fullscreen','Бүтэн дэлгэц',()=>({status:supportsFullscreen(doc)?'supported':'unsupported',detail:supportsFullscreen(doc)?'Товч дарахад browser зөвшөөрвөл нээнэ.':'API байхгүй эсвэл энэ хуудсанд зөвшөөрөөгүй.'})),
    check('audio','Дуу · Web Audio',()=>({status:typeof(win.AudioContext||win.webkitAudioContext)==='function'?'supported':'unsupported',detail:typeof(win.AudioContext||win.webkitAudioContext)==='function'?'Дууг эхлүүлэхийн тулд дэлгэц эсвэл товч дарна.':'Browser дууны API өгөхгүй байна.'})),
    check('touch','Touch / joystick',()=>{
      if(typeof win.PointerEvent!=='function')return{status:'unsupported',detail:'Joystick-д хэрэгтэй pointer оролт алга.'};
      if(!Number.isFinite(nav.maxTouchPoints))return{status:'unknown',detail:'Touch цэгийн мэдээлэл алга.'};
      return{status:nav.maxTouchPoints>0?'supported':'unsupported',detail:nav.maxTouchPoints>0?'Зэрэг мэдрэх touch цэг: '+nav.maxTouchPoints+'.':'Touch дэлгэц илрээгүй. Keyboard / mouse ашиглана.'};
    }),
    check('storage','Local хадгалалт',()=>storageSupport(win))
  ]};
}
export function updatePerformanceReadout(root,stats={}){
  const fps=Number.isFinite(stats.fps)&&stats.fps>0?Math.round(stats.fps):null,hz=Number.isFinite(stats.hz)&&stats.hz>0?Math.round(stats.hz):null;
  const text={fps:(fps||'—')+' FPS',hz:hz?'RAF ≈ '+hz+' Hz':'RAF — Hz',quality:stats.quality||'AUTO'};
  for(const node of root.querySelectorAll('[data-live-stat]'))if(Object.hasOwn(text,node.dataset.liveStat))node.textContent=text[node.dataset.liveStat];
}
