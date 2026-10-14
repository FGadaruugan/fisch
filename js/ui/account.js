import {levelForXp} from '../progression.js';
import {h,button,money} from './dom.js';
export function renderAccount(account,mode){
  const root=h('section',{class:'account-card'},h('p',{class:'eyebrow'},'ONE ACCOUNT · EVERY DEVICE'));
  if(!account.user){
    root.append(h('h3',{},'Ахицаа account-д хадгал'),h('p',{},'Mini-3Dgame-ийн Google account-аараа нэвтэрнэ. GitHub болон өөр төхөөрөмжөөс ижил ахицаа үргэлжлүүлээрэй.'),button('G · Google-ээр нэвтрэх','account_signin',{},'btn primary'));
    return root;
  }
  root.append(h('h3',{},'☁ Account хадгалалт'),h('p',{class:'account-email'},account.user.email));
  root.append(h('div',{class:'account-actions'},button(mode==='online'?'Ахиц шинэчлэх':'Account аялалд очих',mode==='online'?'account_refresh':'connect_online',{},'btn primary'),button('Гарах','account_signout',{},'btn subtle')));
  if(account.canImport&&account.local){
    const local=account.local;
    root.append(h('div',{class:'import-card'},h('h4',{},'Энэ browser-ийн Local ахиц'),h('p',{},'Lv. '+levelForXp(local.totalXp)+' · ✦ '+money(local.coins)+' · '+local.collection.length+'/25 species · '+local.fish.length+' загас'),h('p',{class:'help-text'},'Хоосон account-д нэг удаа хуулна. Local хадгалалт чинь үлдэнэ.'),button('Одоогийн ахицаа шилжүүлэх','account_import',{},'btn primary')));
  }else if(account.importedFromLocal){root.append(h('p',{class:'help-text'},'Хуучин ахиц account-д хадгалагдсан. Top нь онлайнаар шинээр барьсан загасны XP, тоо, жингээр эрэмбэлнэ.'));}
  else if(account.connected){root.append(h('p',{class:'help-text'},'Account ахиц серверт хадгалагдана. Өөр төхөөрөмж дээр ижил Google account-аар нэвтэрнэ.'));}
  return root;
}
