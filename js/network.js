export function createNetworkMonitor({window=globalThis.window,navigator=globalThis.navigator,baseURL,fetch=globalThis.fetch,now=()=>performance.now(),timeout=8000}={}){
  let checkState={status:'idle',duration:null},controller=null;const listeners=new Set();
  const getState=()=>({hint:navigator?.onLine===false?'offline':navigator?.onLine===true?'online':'unknown',check:{...checkState}});
  const emit=()=>listeners.forEach(fn=>fn(getState()));
  window?.addEventListener('online',emit);window?.addEventListener('offline',emit);
  return {getState,subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},
    async check(){
      if(controller)return;controller=new AbortController();const started=now(),timer=setTimeout(()=>controller?.abort(),timeout);checkState={status:'checking',duration:null};emit();
      try{const response=await fetch(new URL('resources.json',baseURL).href,{signal:controller.signal,cache:'no-store',credentials:'omit',redirect:'error'});if(!response.ok||response.redirected)throw new Error('Unavailable');const body=await response.json();if(body.schema!==1)throw new Error('Invalid response');checkState={status:'success',duration:Math.max(0,Math.round(now()-started))};}
      catch{checkState={status:'error',duration:null};}finally{clearTimeout(timer);controller=null;emit();}
    },
    dispose(){controller?.abort();window?.removeEventListener('online',emit);window?.removeEventListener('offline',emit);listeners.clear();}
  };
}
