import {h,button} from './dom.js';
const instructions={
  android:['Тоглоомоо Chrome-оор нээнэ.','⋮ цэс → Install and create shortcut / Add to Home screen → Install сонгоно.','Суулгасны дараа үндсэн дэлгэцийн Fisch icon-оор нээнэ.'],
  ios:['Тоглоомоо Safari-гаар нээнэ.','Share → Add to Home Screen сонгоно. Open as Web App сонголт байвал асаагаад Add дарна.','Үндсэн дэлгэцийн Fisch icon-оор нээнэ.'],
  desktop:['Тоглоомоо Chrome эсвэл Edge-ээр нээнэ.','Хаягийн мөрийн суулгах тэмдэг эсвэл browser-ийн цэсний Install app / Суулгах үйлдлийг сонгоно.','Компьютерийн app жагсаалт эсвэл shortcut-оос Fisch-ийг нээнэ.']
};
export function updateInstallCard(root,state={}){
  const mode=state.mode||'manual',done=['installed','standalone'].includes(mode);
  const labels={ready:'Суулгахад бэлэн',prompting:'Суулгах цонх нээгдсэн',installed:'Суулгасан',standalone:'Апп горимоор нээгдсэн',insecure:'HTTPS холбоос шаардлагатай',manual:'Browser-ийн цэсээр суулгана'};
  root.dataset.installMode=mode;root.querySelector('[data-install-status]').textContent=labels[mode]||labels.manual;
  const action=root.querySelector('[data-command="install_app"]');
  action.textContent=mode==='ready'?'Суулгах':mode==='prompting'?'Суулгах цонх…':done?'Апп бэлэн':'Суулгах заавар';action.disabled=done||mode==='prompting'||mode==='insecure';
  const notes={accepted:'Browser-ийн зааврыг дуусгаад Fisch icon-оос нээгээрэй.',dismissed:'Суулгах цонх хаагдлаа. Хүссэн үедээ browser-ийн цэсээр суулгаж болно.',error:'Суулгах цонх нээгдсэнгүй. Доорх browser-ийн зааврыг ашиглаарай.'};
  root.querySelector('[data-install-note]').textContent=mode==='standalone'?'Fisch одоо тусдаа аппын цонхонд ажиллаж байна.':mode==='installed'?'Үндсэн дэлгэц эсвэл app жагсаалтын Fisch icon-оос нээгээрэй.':mode==='insecure'?'https://fgadaruugan.github.io/fisch/ холбоосоор нээгээрэй.':notes[state.feedback]||'Үндсэн дэлгэцээсээ Fisch-ийг шууд нээгээрэй. Суулгах боломжийг browser шийднэ.';
  root.querySelector('[data-install-steps]').replaceChildren(...(instructions[state.platform]||instructions.desktop).map(text=>h('li',{},text)));
  if(['manual','error','dismissed'].includes(state.feedback)||mode==='insecure')root.querySelector('details').open=true;
}
export function renderInstallCard(state={}){
  const root=h('section',{class:'app-install','data-app-install':''},
    h('div',{class:'install-heading'},h('img',{src:'./assets/app-192.png',width:52,height:52,alt:''}),h('div',{},h('h3',{},'Fisch апп'),h('p',{'data-install-status':'',role:'status','aria-live':'polite'})),button('Суулгах заавар','install_app',{},'btn primary compact')),
    h('p',{class:'help-text','data-install-note':''}),
    h('details',{class:'install-guide'},h('summary',{},'Browser-оос суулгах заавар'),h('ol',{'data-install-steps':''}))
  );
  updateInstallCard(root,state);return root;
}
