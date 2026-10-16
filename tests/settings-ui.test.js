import test from 'node:test';
import assert from 'node:assert/strict';
import {renderSettings,settingsItemVisible} from '../js/ui/settings.js';
import {DEFAULT_SETTINGS} from '../js/performance.js';
function fixture(){
  class Node extends EventTarget{
    constructor(tag){super();this.tagName=tag;this.nodeType=1;this.children=[];this.attributes=new Map();this.dataset={};this.style={setProperty(){}};this._text='';this.hidden=false;}
    setAttribute(name,value){this.attributes.set(name,String(value));if(name.startsWith('data-'))this.dataset[name.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=String(value);}
    getAttribute(name){return this.attributes.get(name)??null;}
    append(...nodes){for(const node of nodes){node.parentElement=this;this.children.push(node);}}
    replaceChildren(...nodes){this.children=[];this._text='';this.append(...nodes);}
    get textContent(){return this._text+this.children.map(n=>n.textContent||'').join('');}set textContent(value){this._text=String(value);this.children=[];}
    matches(selector){const tag=selector.match(/^[a-z]+/);if(tag&&this.tagName!==tag[0])return false;for(const match of selector.matchAll(/\[([^=\]]+)(?:="([^"]*)")?\]/g))if(!this.attributes.has(match[1])||(match[2]!==undefined&&this.getAttribute(match[1])!==match[2]))return false;return true;}
    querySelectorAll(selector){return this.children.flatMap(n=>[...(n.nodeType===1&&n.matches(selector)?[n]:[]),...(n.querySelectorAll?.(selector)||[])]);}
    querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
    contains(node){return this===node||this.children.some(n=>n.contains?.(node));}
    focus(){doc.activeElement=this;}
  }
  const doc={activeElement:null,createElement:tag=>new Node(tag),createTextNode:text=>({nodeType:3,textContent:String(text)})};return doc;
}
test('search spans every category and resets to the selected category when cleared',()=>{
  assert.equal(settingsItemVisible({category:'sound',selected:'general',query:'ДУУ',text:'Дууны түвшин'}),true);
  assert.equal(settingsItemVisible({category:'sound',selected:'general',query:'',text:'Дууны түвшин'}),false);
  assert.equal(settingsItemVisible({category:'sound',selected:'sound',query:' ',text:''}),true);
});
test('SS 2 keeps a single control per key and updates live state without replacing focused inputs',()=>{
  const previous=globalThis.document;globalThis.document=fixture();
  try{
    const root=renderSettings({...DEFAULT_SETTINGS}),controls=root.querySelectorAll('[data-setting]');assert.equal(controls.length,Object.keys(DEFAULT_SETTINGS).length);assert.equal(new Set(controls.map(c=>c.dataset.setting)).size,controls.length);
    const search=root.querySelector('input[type="search"]');search.value='FPS';search.focus();search.dispatchEvent(new Event('input'));
    const slider=root.querySelector('[data-setting="volume"]');root.updateSettings({settings:{...DEFAULT_SETTINGS,volume:.8},canUndo:true,network:{hint:'offline',check:{status:'success',duration:15}},profiles:[]});
    assert.equal(globalThis.document.activeElement,search);assert.equal(root.querySelector('input[type="search"]'),search);assert.equal(search.value,'FPS');assert.equal(root.querySelector('[data-setting="volume"]'),slider);assert.equal(slider.value,'0.8');
    assert.match(root.querySelector('[data-network-hint]').textContent,/сүлжээгүй/);assert.match(root.querySelector('[data-network-check]').textContent,/15 ms/);
    assert.equal(root.querySelector('[data-command="settings_undo"]').disabled,false);
  }finally{globalThis.document=previous;}
});
