/** Keep the browser request inside the click's user activation; preserve play on denial. */
export function supportsFullscreen(doc,element=doc?.documentElement){
  const standard=typeof element?.requestFullscreen==='function';
  const permission=standard?doc?.fullscreenEnabled:doc?.webkitFullscreenEnabled??doc?.fullscreenEnabled;
  return permission!==false&&(standard||typeof element?.webkitRequestFullscreen==='function');
}
export function createFullscreenControl({document:doc,element=doc.documentElement,button,onResize=()=>{},onUnavailable=()=>{}}){
  let pending=null,disposed=false;
  const active=()=>Boolean(doc.fullscreenElement||doc.webkitFullscreenElement);
  const supported=()=>supportsFullscreen(doc,element);
  let previous=active();
  function sync(){
    if(disposed)return;const value=active();doc.body.dataset.fullscreen=String(value);
    if(button){button.hidden=!supported();button.textContent=value?'↙':'⛶';button.setAttribute('aria-pressed',String(value));button.setAttribute('aria-label',value?'Бүтэн дэлгэцээс гарах':'Бүтэн дэлгэц');button.title=value?'Бүтэн дэлгэцээс гарах':'Бүтэн дэлгэц';}
    if(value!==previous){previous=value;onResize();}
  }
  function transition(enter){
    if(pending)return pending;
    if(enter===active())return Promise.resolve(true);
    if(enter&&!supported()){onUnavailable();return Promise.resolve(false);}
    let request;
    try{
      if(enter)request=element.requestFullscreen?element.requestFullscreen({navigationUI:'hide'}):element.webkitRequestFullscreen();
      else request=doc.exitFullscreen?doc.exitFullscreen():doc.webkitExitFullscreen();
    }catch{sync();onUnavailable();return Promise.resolve(false);}
    pending=Promise.resolve(request).then(()=>{sync();return active()===enter;},()=>{sync();onUnavailable();return false;}).finally(()=>pending=null);
    return pending;
  }
  doc.addEventListener('fullscreenchange',sync);doc.addEventListener('webkitfullscreenchange',sync);sync();
  return {enter:()=>transition(true),toggle:()=>transition(!active()),dispose(){disposed=true;doc.removeEventListener('fullscreenchange',sync);doc.removeEventListener('webkitfullscreenchange',sync);}};
}
