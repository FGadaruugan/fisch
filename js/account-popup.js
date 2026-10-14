import {GameError} from './errors.js';
/** Keep opening synchronous so mobile browsers retain the initiating user gesture. */
export function createPopupLogin({window:win=window,callbackURL,nonce=crypto.randomUUID()}={}) {
  const callback=new URL(callbackURL),popup=win.open(callback.href,'_blank','popup,width=500,height=680');
  if(!popup)return Promise.reject(new GameError('AUTH_POPUP_BLOCKED'));
  return new Promise((resolve,reject)=>{
    let done=false,interval,timeout;
    function finish(error,session){
      if(done)return;done=true;win.removeEventListener('message',message);win.clearInterval(interval);win.clearTimeout(timeout);
      try{popup.close();}catch{}
      if(error)reject(new GameError(error));else resolve(session);
    }
    function message(event){
      if(event.source!==popup||event.origin!==callback.origin||!event.data||typeof event.data!=='object')return;
      const data=event.data;
      if(data.type==='fisch:ready'){popup.postMessage({type:'fisch:begin',nonce},callback.origin);return;}
      if(data.nonce!==nonce)return;
      if(data.type==='fisch:error'){finish('AUTH_FAILED');return;}
      const session=data.session;
      if(data.type!=='fisch:session'||!session||!['access_token','refresh_token'].every(key=>typeof session[key]==='string'&&session[key].length>0&&session[key].length<=8192))return;
      finish(null,{access_token:session.access_token,refresh_token:session.refresh_token});
    }
    win.addEventListener('message',message);
    interval=win.setInterval(()=>{try{if(popup.closed)finish('AUTH_CANCELLED');}catch{}},500);
    timeout=win.setTimeout(()=>finish('AUTH_CANCELLED'),300000);
  });
}
