import test from 'node:test';
import assert from 'node:assert/strict';
import {ISLANDS} from '../js/data.js';
import {createTerrainModel} from '../js/terrain.js';
import {ensureVoyageHud,renderVoyageHud} from '../js/ui/navigation.js';
import {loadFeature} from './helpers.js';
const chart=await loadFeature('../js/ui/chart.js');
// Minimal DOM boundary: map construction and attributes run in Node without a renderer.
function documentFixture(){
  class Node extends EventTarget{
    constructor(tag,namespaceURI=null){super();this.tagName=tag;this.namespaceURI=namespaceURI;this.nodeType=1;this.children=[];this.attributes=new Map();this.dataset={};this.style={setProperty(){}};this._text='';}
    setAttribute(name,value){this.attributes.set(name,String(value));if(name==='id')this.id=String(value);if(name.startsWith('data-'))this.dataset[name.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=String(value);}
    getAttribute(name){return this.attributes.get(name)??null;}
    append(...nodes){this.children.push(...nodes);}
    replaceChildren(...nodes){this.children=[];this._text='';this.append(...nodes);}
    get textContent(){return this._text+this.children.map(n=>n.textContent||'').join('');}set textContent(value){this._text=String(value);this.children=[];}
    matches(selector){const match=selector.match(/^\[([^=\]]+)(?:="([^"]*)")?\]$/);return match?this.attributes.has(match[1])&&(match[2]===undefined||this.getAttribute(match[1])===match[2]):selector[0]==='#'?this.id===selector.slice(1):this.tagName===selector;}
    querySelectorAll(selector){return this.children.flatMap(n=>[...(n.matches?.(selector)?[n]:[]),...(n.querySelectorAll?.(selector)||[])]);}
    querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
  }
  const body=new Node('body');return{body,createElement:tag=>new Node(tag),createElementNS:(ns,tag)=>new Node(tag,ns),getElementById:id=>body.querySelector('#'+id)};
}
test('world map uses all four actual coastlines in a square 4000-unit coordinate system',()=>{
  assert.equal(typeof chart.createMapSurface,'function');const doc=documentFixture(),root=chart.createMapSurface(doc),svg=root.querySelector('svg');
  assert.equal(svg.namespaceURI,'http://www.w3.org/2000/svg');assert.equal(svg.getAttribute('viewBox'),'-2000 -2000 4000 4000');
  assert.equal(root.querySelectorAll('[data-chart-island]').length,4);
  for(const meta of Object.values(ISLANDS)){
    const polygon=root.querySelector('[data-chart-island="'+meta.id+'"]').querySelector('polygon'),points=polygon.getAttribute('points').split(' ').map(pair=>pair.split(',').map(Number));
    assert.ok(points.length>=16);assert.ok(points.flat().every(Number.isFinite));
    assert.ok(Math.abs(points[0][0]-meta.center[0]-createTerrainModel(meta.id).coastRadius(0))<.1);assert.equal(points[0][1],meta.center[1]);
  }
});
test('map player and destination line follow world coordinates and release an absent route',()=>{
  assert.equal(typeof chart.updateMapSurface,'function');const root=chart.createMapSurface(documentFixture());
  chart.updateMapSurface(root,{position:{x:1070,z:580},heading:90,destination:'coral',totalXp:3599});
  assert.equal(root.querySelector('[data-chart-player]').getAttribute('transform'),'translate(1070 580) rotate(90)');
  const line=root.querySelector('[data-chart-route]');assert.equal(line.getAttribute('x1'),'1070');assert.equal(line.getAttribute('y1'),'580');assert.equal(line.getAttribute('x2'),'-820');assert.equal(line.getAttribute('y2'),'-650');assert.equal(line.getAttribute('visibility'),'visible');
  assert.equal(root.querySelector('[data-chart-island="sanctuary"]').getAttribute('data-locked'),'true');
  chart.updateMapSurface(root,{position:{x:NaN,z:Infinity},heading:NaN,totalXp:3600});
  assert.equal(line.getAttribute('visibility'),'hidden');assert.equal(root.querySelector('[data-chart-player]').getAttribute('transform'),'translate(0 0) rotate(0)');
  assert.equal(root.querySelector('[data-chart-island="sanctuary"]').getAttribute('data-locked'),'false');
});
test('cached compass HUD upgrades to one clickable live map and keeps route distance readable',()=>{
  const doc=documentFixture(),play=doc.createElement('section'),old=doc.createElement('div'),heading=doc.createElement('b');
  play.id='playHud';old.id='voyageHud';heading.setAttribute('data-voyage-heading','');old.append(heading);play.append(old);doc.body.append(play);
  const root=ensureVoyageHud(doc),control=root.querySelector('[data-command]');assert.ok(control,'a map button replaces the old compass');
  assert.equal(root,old);assert.equal(control.getAttribute('data-command'),'open');assert.equal(JSON.parse(control.getAttribute('data-payload')).panel,'map');assert.equal(root.querySelector('[data-voyage-heading]'),null);
  renderVoyageHud(root,{position:{x:0,z:0},heading:45,sailing:true,speed:12,route:{name:'Sunken Sanctuary',distance:980},destination:'sanctuary',totalXp:3600});
  assert.match(root.textContent,/Sunken Sanctuary.*980/);assert.doesNotMatch(root.textContent,/45°|NE/);
  assert.equal(ensureVoyageHud(doc),root);assert.equal(root.querySelectorAll('button').length,1);
});
