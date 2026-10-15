export function createAppInstallControl({window:win=globalThis.window,onChange=()=>{}}={}){
  const nav=win.navigator||{},ios=/iPhone|iPad|iPod/.test(nav.userAgent||'')||(nav.platform==='MacIntel'&&nav.maxTouchPoints>1);
  const platform=ios?'ios':/Android/.test(nav.userAgent||'')?'android':'desktop';
  const media=win.matchMedia?.('(display-mode: standalone)');
  let offered=null,pending=null,installed=false,disposed=false,feedback='',appLaunchObserved=false;
  // Fullscreen can replace the active standalone media query within the same app window.
  const runningAsApp=()=>{appLaunchObserved||=media?.matches===true||nav.standalone===true;return appLaunchObserved;};
  function getState(){return{platform,feedback,mode:runningAsApp()?'standalone':installed?'installed':win.isSecureContext===false?'insecure':pending?'prompting':offered?'ready':'manual'};}
  const notify=()=>{if(!disposed)onChange(getState());};
  function beforeInstall(event){
    if(disposed||win.isSecureContext===false||typeof event.prompt!=='function')return;
    event.preventDefault();if(installed||runningAsApp())return;
    offered=event;feedback='';notify();
  }
  function onInstalled(){installed=true;offered=null;feedback='';notify();}
  function install(){
    if(disposed)return Promise.resolve(false);
    if(pending)return pending;
    if(installed||runningAsApp()||win.isSecureContext===false)return Promise.resolve(false);
    if(!offered){feedback='manual';notify();return Promise.resolve(false);}
    const request=offered;offered=null;feedback='';let complete,accepted=false;
    const action=new Promise(resolve=>{complete=resolve;});pending=action;notify();
    let result;
    // Keep prompt() in the initiating click, before any await or microtask.
    try{result=request.prompt();}catch(error){result=Promise.reject(error);}
    Promise.resolve(result).then(choice=>choice?.outcome?choice:request.userChoice).then(choice=>{
      accepted=choice?.outcome==='accepted';feedback=accepted?'accepted':choice?.outcome==='dismissed'?'dismissed':'manual';
    }).catch(()=>{feedback='error';}).finally(()=>{pending=null;notify();complete(!disposed&&accepted);});
    return action;
  }
  win.addEventListener('beforeinstallprompt',beforeInstall);win.addEventListener('appinstalled',onInstalled);
  if(media?.addEventListener)media.addEventListener('change',notify);else media?.addListener?.(notify);
  notify();
  return{getState,install,dispose(){disposed=true;offered=null;win.removeEventListener('beforeinstallprompt',beforeInstall);win.removeEventListener('appinstalled',onInstalled);if(media?.removeEventListener)media.removeEventListener('change',notify);else media?.removeListener?.(notify);}};
}
