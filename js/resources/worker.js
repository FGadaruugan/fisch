import {CACHE_PREFIX,READY_PATH,validateManifest,cacheName,getTierFiles} from './shared.js';
export function resourceRoute(request,scope){
  const base=new URL(scope),url=new URL(request.url);if(request.method!=='GET'||url.origin!==base.origin||!url.pathname.startsWith(base.pathname))return 'network';
  const path=url.pathname.slice(base.pathname.length);
  if(request.mode==='navigate'&&!url.search&&(path===''||path==='index.html'))return 'navigation';
  if(!/^(?:css\/[\w.-]+\.css|(?:web\/)?js\/(?:chunks\/)?[\w.-]+\.js|assets\/[\w./-]+\.(?:png|svg)|manifest\.webmanifest|CREDITS\.txt)$/.test(path)||/account-callback/.test(path))return 'network';
  const version=url.searchParams.get('fisch-build');
  if(version&&/^[a-f0-9]{24}$/.test(version)&&[...url.searchParams.keys()].length===1)return 'static';
  if(!url.search&&/\/chunks\/[\w-]+-[A-Z0-9]{8}\.js$/.test('/'+path))return 'static';
  return 'network';
}
export function createResourceHandler({scope,caches,fetch}){
  const base=new URL(scope);
  async function completed(){
    const result=[];
    try{for(const name of await caches.keys()){
      if(!name.startsWith(CACHE_PREFIX))continue;
      try{const cache=await caches.open(name),response=await cache.match(new URL(READY_PATH,base).href);if(!response)continue;const marker=await response.json(),manifest=validateManifest(marker.manifest,base);if(name!==cacheName(base,manifest.build))continue;const present=await Promise.all(getTierFiles(manifest,'core').map(file=>cache.match(new URL(file.url,base).href)));if(present.some(value=>!value))continue;result.push({cache,manifest,time:Number(marker.completedAt)||0});}catch{}
    }}catch{}
    return result.sort((a,b)=>b.time-a.time);
  }
  return async request=>{
    const route=resourceRoute(request,base),url=new URL(request.url);
    if(route==='navigation'){
      try{return await fetch(request);}catch(error){for(const {cache,manifest}of await completed()){const response=await cache.match(new URL(manifest.entry,base).href);if(response)return response;}throw error;}
    }
    if(route==='static')for(const {cache,manifest}of await completed())if(manifest.files.some(file=>new URL(file.url,base).href===url.href)){const response=await cache.match(url.href);if(response)return response;}
    return fetch(request);
  };
}
if(typeof self!=='undefined'&&self.registration&&self.caches){
  const scope=self.registration.scope,handle=createResourceHandler({scope,caches:self.caches,fetch:self.fetch.bind(self)});
  self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
  self.addEventListener('fetch',event=>{if(resourceRoute(event.request,scope)!=='network')event.respondWith(handle(event.request));});
}
