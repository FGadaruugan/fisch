import {validateManifest,getTierFiles,getGroupFiles,verifyResponse,cacheName,READY_PATH,MANIFEST_PATH} from './shared.js';
export {validateManifest,getTierFiles} from './shared.js';
export function createResourceManager({baseURL,build,caches=globalThis.caches,fetch=globalThis.fetch,crypto=globalThis.crypto,manifest:provided,supported=!!(caches&&crypto?.subtle)}={}){
  const base=new URL('./',baseURL),listeners=new Set(),verified=new Set();
  let manifest=null,cache=null,job=false,abort=null,initPromise,workerActive=false,paused=false,completedAt=0;
  let state={status:'idle',selected:'core',error:'',ready:false};
  function getState(){const files=manifest?.files||[],tiers={};for(const tier of ['core','extended','full']){const list=manifest?getTierFiles(manifest,tier):[];tiers[tier]={bytes:list.reduce((s,f)=>s+f.bytes,0),downloadedBytes:list.filter(f=>verified.has(f.url)).reduce((s,f)=>s+f.bytes,0),files:list.length,completed:list.filter(f=>verified.has(f.url)).length};}return {...state,build:manifest?.build||build,tiers,downloadedBytes:files.filter(f=>verified.has(f.url)).reduce((s,f)=>s+f.bytes,0),offlineReady:state.ready&&workerActive,workerActive};}
  const emit=()=>listeners.forEach(fn=>fn(getState()));
  async function markReady(){
    const complete=getTierFiles(manifest,'core').every(f=>verified.has(f.url));state.ready=false;
    if(complete){completedAt||=Date.now();await cache.put(new URL(READY_PATH,base).href,new Response(JSON.stringify({manifest,completedAt}),{headers:{'Content-Type':'application/json'}}));state.ready=true;}
    else await cache.delete(new URL(READY_PATH,base).href);
  }
  function initialize(){
    if(initPromise)return initPromise;
    initPromise=(async()=>{
      try{
        let raw=provided;
        if(!raw){
          try{const url=new URL('resources.json',base),response=await fetch(url.href,{cache:'no-store',credentials:'omit',redirect:'error'});if(!response.ok||response.redirected||(response.url&&response.url!==url.href))throw new Error('MANIFEST_UNAVAILABLE');raw=await response.json();}
          catch(error){
            if(!supported||!caches||!/^[a-f0-9]{24}$/.test(build||''))throw error;
            const stored=await caches.open(cacheName(base,build)),response=await stored.match(new URL(MANIFEST_PATH,base).href);if(!response)throw error;raw=await response.json();
          }
        }
        manifest=validateManifest(raw,base,build);
        if(!supported||!caches||!crypto?.subtle){state.status='unsupported';emit();return;}
        cache=await caches.open(cacheName(base,manifest.build));
        await cache.put(new URL(MANIFEST_PATH,base).href,new Response(JSON.stringify(manifest),{headers:{'Content-Type':'application/json'}}));
        verified.clear();
        try{const response=await cache.match(new URL(READY_PATH,base).href);if(response)completedAt=Number((await response.json()).completedAt)||0;}catch{}
        for(const file of manifest.files){const url=new URL(file.url,base).href,response=await cache.match(url);if(!response)continue;try{await verifyResponse(response,file,crypto);verified.add(file.url);}catch{await cache.delete(url);}}
        await markReady();state.status='idle';state.error='';
      }catch(error){state.status=supported?'error':'unsupported';state.error=error.message||'RESOURCE_UNAVAILABLE';}
      emit();
    })();return initPromise;
  }
  async function download(tier=state.selected){
    if(job)return;job=true;paused=false;
    try{
      if(state.status==='error')initPromise=null;
      await initialize();if(!cache||['unsupported','error'].includes(state.status))return;
      if(paused){state.status='paused';emit();return;}
      if(!manifest.tiers[tier])return;state={...state,selected:tier,status:'downloading',error:''};emit();
      for(const file of getTierFiles(manifest,tier)){
        if(state.status==='paused')return;if(verified.has(file.url))continue;
        abort=new AbortController();const url=new URL(file.url,base).href;
        const response=await fetch(url,{signal:abort.signal,cache:'no-store',credentials:'omit',redirect:'error'});
        if(response.redirected||(response.url&&response.url!==url))throw new Error('UNEXPECTED_REDIRECT');
        await verifyResponse(response,file,crypto);if(state.status==='paused')return;
        await cache.put(url,response);verified.add(file.url);await markReady();emit();
      }
      if(state.status!=='paused'){state.status='completed';emit();}
    }catch(error){if(state.status!=='paused'){state.status='error';state.error=error.message||'DOWNLOAD_FAILED';emit();}}
    finally{abort=null;job=false;}
  }
  return {initialize,download,getState,subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},
    pause(){if(job){paused=true;state.status='paused';abort?.abort();emit();}},
    setWorkerActive(value){workerActive=!!value;emit();},
    async remove(group){
      if(job||!cache||!['social','extras'].includes(group))return;
      job=true;
      // Removing social also removes extras, which depend on it. Core/shared files stay.
      const removed=group==='social'?['social','extras']:['extras'],keep=getGroupFiles(manifest,Object.keys(manifest.groups).filter(id=>!removed.includes(id))),keepURLs=new Set(keep.map(f=>f.url));
      try{for(const file of manifest.files)if(!keepURLs.has(file.url)){await cache.delete(new URL(file.url,base).href);verified.delete(file.url);}await markReady();state.status='idle';state.error='';}
      catch(error){state.status='error';state.error=error.message||'REMOVE_FAILED';}finally{job=false;}emit();
    }
  };
}
