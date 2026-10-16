import {SAVE_KEY,createInitialState,normalizeState} from './save.js';

const BACKUP_KEY=SAVE_KEY+'.backup',RECOVERY_KEY=SAVE_KEY+'.recovery';
function matchesFields(actual,expected){
  if(expected===null||typeof expected!=='object')return actual===expected;
  if(!actual||typeof actual!=='object'||Array.isArray(actual)!==Array.isArray(expected))return false;
  if(Array.isArray(expected)&&actual.length!==expected.length)return false;
  return Object.keys(expected).every(key=>Object.hasOwn(actual,key)&&matchesFields(actual[key],expected[key]));
}
function classify(raw,{backup=false}={}){
  if(raw===null)return {kind:'missing'};
  try{
    const value=JSON.parse(raw);
    if(!value||typeof value!=='object'||Array.isArray(value))return {kind:'damaged'};
    if(Object.hasOwn(value,'version')&&value.version!==1)return {kind:'unsupported'};
    if(value.version!==1)return {kind:'damaged'};
    const normalized=normalizeState(value);
    if(backup&&!matchesFields(value,normalized))return {kind:'damaged'};
    return {kind:'supported',snapshot:normalized};
  }catch{return {kind:'damaged'};}
}

/** Bounded recovery slots and optimistic conflict detection; not a cross-tab lock. */
export function createSaveStorage({storage,onError=()=>{}}={}){
  let loaded=false,observed=null,snapshot=createInitialState();
  let status={kind:'missing',writable:true,canImport:true};
  const notices=new Set();
  function notify(code){if(!notices.has(code)){notices.add(code);onError(code);}}
  function block(kind,code){status={kind,writable:false,canImport:false};notify(code);}
  function load(){
    if(loaded)return structuredClone(snapshot);
    loaded=true;
    try{
      if(storage===undefined)storage=globalThis.localStorage;
      if(!storage||typeof storage.getItem!=='function'||typeof storage.setItem!=='function')throw Error('Storage unavailable');
      observed=storage.getItem(SAVE_KEY);
      const primary=classify(observed);
      if(primary.kind==='unsupported'){block('unsupported','SAVE_INCOMPATIBLE');return structuredClone(snapshot);}
      if(primary.kind==='supported'){snapshot=primary.snapshot;status={kind:'supported',writable:true,canImport:true};}
      else{
        const backup=classify(storage.getItem(BACKUP_KEY),{backup:true});
        if(backup.kind==='supported'){
          snapshot=backup.snapshot;status={kind:'recovered',writable:true,canImport:true};notify('SAVE_RECOVERED');
        }else if(backup.kind!=='missing'){
          block(backup.kind==='unsupported'?'unsupported':'damaged',backup.kind==='unsupported'?'SAVE_INCOMPATIBLE':'SAVE_UNAVAILABLE');
        }else{
          status={kind:primary.kind,writable:true,canImport:primary.kind==='missing'};
          if(primary.kind==='damaged')notify('SAVE_DAMAGED');
        }
      }
    }catch{block('unavailable','SAVE_UNAVAILABLE');}
    return structuredClone(snapshot);
  }
  function checkCurrent(){
    load();
    if(!status.writable)return false;
    try{
      const current=storage.getItem(SAVE_KEY);
      if(current!==observed){
        const newer=classify(current).kind==='unsupported';
        block(newer?'unsupported':'conflict',newer?'SAVE_INCOMPATIBLE':'SAVE_CONFLICT');return false;
      }
      return true;
    }catch{block('unavailable','SAVE_UNAVAILABLE');return false;}
  }
  function write(next){
    if(!checkCurrent())return false;
    // The writer must never turn a future schema into an empty v1 save.
    if(!next||next.version!==1)return false;
    try{
      const raw=JSON.stringify(normalizeState(next)),primary=classify(observed);
      const backupRaw=storage.getItem(BACKUP_KEY),backup=classify(backupRaw,{backup:true});
      if(backup.kind!=='missing'&&backup.kind!=='supported'){
        block('unavailable','SAVE_UNAVAILABLE');return false;
      }
      if(primary.kind==='damaged'){
        const recovery=storage.getItem(RECOVERY_KEY);
        if(recovery!==null&&recovery!==observed){block('unavailable','SAVE_UNAVAILABLE');return false;}
        if(recovery===null)storage.setItem(RECOVERY_KEY,observed);
      }
      if(primary.kind==='supported')storage.setItem(BACKUP_KEY,observed);
      // Detect changes committed while preparing the backup as well.
      if(!checkCurrent())return false;
      storage.setItem(SAVE_KEY,raw);observed=raw;snapshot=JSON.parse(raw);
      status={kind:'supported',writable:true,canImport:true};return true;
    }catch{block('unavailable','SAVE_UNAVAILABLE');return false;}
  }
  return {load,write,getStatus(){checkCurrent();return {...status};}};
}
