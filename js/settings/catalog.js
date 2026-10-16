import {GUI_OPTIONS} from '../gui.js';
export const CATEGORIES=Object.freeze([
  {id:'general',label:'Ерөнхий',icon:'◈',description:'Горим, профайл, буцаах'},
  {id:'graphics',label:'График',icon:'◇',description:'Чанар, FPS, гэрэл ба цаг'},
  {id:'display',label:'Дэлгэц',icon:'▣',description:'GUI ба мэдээлэл'},
  {id:'sound',label:'Дуу',icon:'♪',description:'Дууны түвшин'},
  {id:'network',label:'Сүлжээ',icon:'⌁',description:'Local, Online, холболт'},
  {id:'resources',label:'Нөөц',icon:'↓',description:'Татах, офлайн файлууд'},
  {id:'device',label:'Апп ба төхөөрөмж',icon:'▤',description:'Суулгах, дэмжлэг'},
  {id:'about',label:'Мэдээлэл',icon:'ⓘ',description:'Хувилбар, шинэчлэлт'}
]);
export const PRESETS=Object.freeze([
  {id:'economy',label:'Хэмнэлт',description:'Бага ачаалал · 30 FPS',values:{quality:'low',targetFps:30,renderScale:.8,viewDistance:800,shadows:false,particles:false}},
  {id:'balanced',label:'Тэнцвэртэй',description:'Auto чанар · 60 FPS',values:{quality:'auto',targetFps:60,renderScale:1,viewDistance:1400,shadows:true,particles:true}},
  {id:'high',label:'Өндөр чанар',description:'Илүү нарийвчлал · 60 FPS',values:{quality:'high',targetFps:60,renderScale:1.2,viewDistance:1800,shadows:true,particles:true}}
]);
export const CONTROLS=Object.freeze([
  {key:'quality',category:'graphics',label:'Quality · Зургийн чанар',description:'Auto нь ачаалалд тохируулна.',type:'select',options:[['auto','Auto · Adaptive'],['low','Low'],['medium','Medium'],['high','High'],['ultra','Ultra']]},
  {key:'targetFps',category:'graphics',label:'FPS хязгаар',description:'Зурагдах давтамж. Төхөөрөмжийн бодит чадлаас хамаарна.',type:'select',number:true,options:[[30,'30 FPS'],[60,'60 FPS'],[90,'90 FPS'],[120,'120 FPS'],[144,'144 FPS'],[0,'Хязгааргүй']]},
  {key:'renderScale',category:'graphics',label:'Render scale',description:'3D зургийн нягтрал',type:'range',min:.6,max:1.5,step:.1,unit:'×'},
  {key:'viewDistance',category:'graphics',label:'Харах зай',description:'Холын орчны дүрслэл',type:'range',min:500,max:2600,step:100,unit:' units'},
  {key:'shadows',category:'graphics',label:'Сүүдэр',description:'Quality нь сүүдрийн нарийвчлалыг сонгоно.',type:'toggle'},
  {key:'fog',category:'graphics',label:'Манан',description:'Холын эрэг ба агаарын гүн',type:'toggle'},
  {key:'particles',category:'graphics',label:'Орчны эффект',description:'Цас, жижиг гэрэл',type:'toggle'},
  {key:'exposure',category:'graphics',label:'Гэрэлтүүлэг',description:'Орчны гэрлийн хүч',type:'range',min:.5,max:1.8,step:.1,unit:'×'},
  {key:'timeOfDay',category:'graphics',label:'Өдрийн цаг',description:'Тоглоомын цаг; серверийн цаг биш.',type:'range',min:0,max:24,step:.1,unit:'h'},
  {key:'dayCycle',category:'graphics',label:'Өдөр, шөнийн цикл',description:'Тоглоомын цаг автоматаар урагшилна.',type:'toggle'},
  ...GUI_OPTIONS.map(o=>({...o,category:'display',type:'toggle'})),
  {key:'volume',category:'sound',label:'Дууны түвшин',description:'Тоглоомын эффект ба дохио',type:'range',min:0,max:1,step:.1,unit:''}
]);
export const CATEGORY_KEYS=Object.freeze(Object.fromEntries(CATEGORIES.map(c=>[c.id,CONTROLS.filter(o=>o.category===c.id).map(o=>o.key)])));
export function matchesSearch(text,query){return String(text).toLocaleLowerCase().includes(String(query).trim().toLocaleLowerCase());}
