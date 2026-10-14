export const AVATARS=['🎣','🐟','🌊','🪸','🦈','🌙'];
export function h(tag,attributes={},...children) {
  const node=document.createElement(tag);
  for(const [key,value]of Object.entries(attributes)){
    if(value===null||value===undefined)continue;
    if(key==='class')node.className=value;
    else if(key==='text')node.textContent=value;
    else if(key==='style')for(const [name,val]of Object.entries(value))node.style.setProperty(name,String(val));
    else if(key.startsWith('on')&&typeof value==='function')node.addEventListener(key.slice(2).toLowerCase(),value);
    else if(['checked','disabled','hidden'].includes(key))node[key]=!!value;
    else if(key==='value')node.value=String(value);
    else node.setAttribute(key,String(value));
  }
  for(const child of children.flat(Infinity)){if(child===null||child===undefined||child===false)continue;node.append(child?.nodeType?child:document.createTextNode(String(child)));}
  return node;
}
export const button=(text,command,payload={},className='btn',disabled=false)=>h('button',{type:'button',class:className,'data-command':command,'data-payload':JSON.stringify(payload),disabled},text);
export const money=value=>new Intl.NumberFormat('en-US',{maximumFractionDigits:0}).format(value);
export const empty=(title,description,icon='🎣')=>h('div',{class:'empty-state'},h('span',{class:'empty-icon'},icon),h('h3',{},title),h('p',{},description));
export const badge=(text,color)=>h('span',{class:'rarity-badge',style:{'--accent':color}},text);
export const stat=(value,label)=>h('div',{class:'stat-cell'},h('b',{},value),h('span',{},label));
