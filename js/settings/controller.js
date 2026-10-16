import {DEFAULT_SETTINGS,normalizeSettings} from '../performance.js';
import {CATEGORY_KEYS,PRESETS} from './catalog.js';
export const SETTINGS_KEY='fisch3d.settings.v1',PROFILES_KEY='fisch3d.settings.profiles.v1';
const copy=value=>JSON.parse(JSON.stringify(value));
const equal=(a,b)=>Object.keys(DEFAULT_SETTINGS).every(key=>a[key]===b[key]);
export const changedSettings=(before,after)=>Object.fromEntries(Object.keys(DEFAULT_SETTINGS).filter(key=>before[key]!==after[key]).map(key=>[key,after[key]]));
const validName=value=>typeof value==='string'&&[...value.trim()].length>=1&&[...value.trim()].length<=18;
export function createSettingsController({storage,onError=()=>{}}={}){
  function read(key,fallback){try{return JSON.parse(storage?.getItem(key)||'null')??fallback;}catch{return fallback;}}
  let settings=normalizeSettings(read(SETTINGS_KEY,{})),previous=null,gesture=null;
  const raw=read(PROFILES_KEY,{}),ids=new Set();
  let profiles=raw?.version===1&&Array.isArray(raw.profiles)?raw.profiles.filter(p=>p&&typeof p.id==='string'&&p.id.length<=80&&validName(p.name)&&p.settings&&typeof p.settings==='object'&&!ids.has(p.id)&&ids.add(p.id)).slice(0,3).map(p=>({id:p.id,name:p.name.trim(),settings:normalizeSettings(p.settings)})):[];
  const listeners=new Set();
  const getState=()=>({settings:{...settings},canUndo:!!previous,profiles:copy(profiles)});
  const emit=()=>listeners.forEach(fn=>fn(getState()));
  function persist(key,value){try{if(!storage)throw new Error('Unavailable');storage.setItem(key,JSON.stringify(value));return true;}catch{onError('SAVE_UNAVAILABLE');return false;}}
  function edit(patch,{transaction=null,commit=true}={}){
    const next=normalizeSettings({...settings,...patch});
    if(gesture&&gesture.key!==transaction)gesture=null;
    if(!equal(next,settings)){
      if(transaction){if(!gesture)gesture={key:transaction,before:{...settings}};previous={...gesture.before};}
      else previous={...settings};
      settings=next;persist(SETTINGS_KEY,settings);
    }
    if(commit)gesture=null;emit();
  }
  return {getState,edit,subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},
    preset(id){const preset=PRESETS.find(p=>p.id===id);if(preset)edit(preset.values);},
    reset(category){const keys=CATEGORY_KEYS[category]||[];if(keys.length)edit(Object.fromEntries(keys.map(key=>[key,DEFAULT_SETTINGS[key]])));},
    undo(){if(!previous)return;settings=previous;previous=null;gesture=null;persist(SETTINGS_KEY,settings);emit();},
    saveProfile(name){
      if(!validName(name)||profiles.length>=3)return false;
      const next=[...profiles,{id:globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+'-'+Math.random().toString(36).slice(2),name:name.trim(),settings:{...settings}}];
      if(!persist(PROFILES_KEY,{version:1,profiles:next}))return false;profiles=next;emit();return true;
    },
    loadProfile(id){const profile=profiles.find(p=>p.id===id);if(profile)edit(profile.settings);},
    deleteProfile(id){const next=profiles.filter(p=>p.id!==id);if(next.length===profiles.length)return false;if(!persist(PROFILES_KEY,{version:1,profiles:next}))return false;profiles=next;emit();return true;}
  };
}
