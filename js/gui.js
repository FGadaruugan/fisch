/** Only informational overlays are optional; game controls never belong to this list. */
export const GUI_OPTIONS=Object.freeze([
  {id:'stats',key:'showStats',label:'FPS / Hz',description:'Гүйцэтгэл, frame time, Quality'},
  {id:'coins',key:'showCoins',label:'Coin',description:'Дээд хэсгийн coin мэдээлэл'},
  {id:'connection',key:'showConnection',label:'Local / Online төлөв',description:'Холболтын тэмдэг'},
  {id:'location',key:'showLocation',label:'Арлын нэр ба цаг',description:'Одоо байгаа газар, тоглоомын цаг'},
  {id:'rod',key:'showRod',label:'Савааны мэдээлэл',description:'Тоноглосон савааны нэр'},
  {id:'contextHint',key:'showContextHint',label:'Туслах бичвэр',description:'Дэлгэцийн доорх ойрын үйлдлийн заавар'},
  {id:'controlsHint',key:'showControlsHint',label:'Keyboard заавар',description:'PC дээрх WASD, F, E, B тайлбар'},
  {id:'catchNotice',key:'showCatchNotice',label:'Барьсан загасны мэдэгдэл',description:'Нэр, кг, үнэ, XP бүхий түр мэдээлэл'}
].map(Object.freeze));
export const GUI_DEFAULTS=Object.freeze(Object.fromEntries(GUI_OPTIONS.map(option=>[option.key,true])));
const optionsById=new Map(GUI_OPTIONS.map(option=>[option.id,option]));
const controls='button,input,select,textarea,a[href],[role="button"],[tabindex]';

export function applyGuiVisibility(root,settings={}){
  for(const node of root.querySelectorAll('[data-gui]')){
    const option=optionsById.get(node.dataset.gui);
    const containsControl=node.matches(controls)||!!node.querySelector(controls);
    node.toggleAttribute('data-gui-hidden',!!option&&!containsControl&&settings[option.key]===false);
  }
  // Keep the open Settings panel in sync when "all ON" restores several choices.
  for(const control of root.querySelectorAll('input[type="checkbox"][data-setting]')){
    if(Object.hasOwn(GUI_DEFAULTS,control.dataset.setting))control.checked=settings[control.dataset.setting]!==false;
  }
}
