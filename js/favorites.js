/** Browser-local preferences, isolated from game currency and by account. */
export function createFavorites({storage,onError=()=>{}}={}) {
  if(storage===undefined){try{storage=globalThis.localStorage;}catch{onError('SAVE_UNAVAILABLE');}}
  const cache=new Map();
  const key=service=>'fisch3d.favorites.v1.'+(service.mode==='online'?'online.'+service.ownerId:'local');
  function read(service){
    const name=key(service);
    if(!cache.has(name)){
      let ids=[];
      try{const saved=JSON.parse(storage?.getItem(name)||'[]');if(Array.isArray(saved))ids=saved.filter(id=>typeof id==='string'&&/^[\w-]{1,64}$/.test(id));}catch{onError('SAVE_RECOVERED');}
      cache.set(name,new Set(ids));
    }
    return cache.get(name);
  }
  return {
    has:(service,id)=>read(service).has(id),
    toggle(service,id){
      const snapshot=service.getSnapshot();if(!snapshot.fish.some(f=>f.id===id))return;
      const ids=read(service);if(ids.has(id))ids.delete(id);else ids.add(id);
      const owned=new Set(snapshot.fish.map(f=>f.id));for(const saved of ids)if(!owned.has(saved))ids.delete(saved);
      try{storage?.setItem(key(service),JSON.stringify([...ids]));}catch{onError('SAVE_UNAVAILABLE');}
    },
    decorate(service,snapshot){return {...snapshot,fish:snapshot.fish.map(f=>({...f,favorite:read(service).has(f.id)}))};}
  };
}
