import {h,button,empty,AVATARS,money} from './dom.js';
import {formatKg} from '../progression.js';
export function renderSocial(panel,social){
  const root=h('div',{class:'social-panel'});
  if(!social.connected){
    root.append(empty('Онлайн аяллаа нээх','Top болон Friends нь онлайн profile ашиглана. Онлайн холболт бэлэн болоход энд тоглогчдын бодит мэдээлэл гарна.',panel==='friends'?'♧':'♜'),button('Онлайн холболт шалгах','connect_online',{},'btn primary'));
    return root;
  }
  if(panel==='top'){
    const tabs=h('div',{class:'tabs'});
    for(const [metric,label]of [['xp','Level / XP'],['catches','Загасны тоо'],['weight','Хамгийн хүнд']])tabs.append(button(label,'social_refresh',{panel:'top',metric},social.metric===metric?'active':''));
    root.append(tabs);
    if(social.loading)root.append(h('p',{class:'loading-copy'},'Далайн рекордуудыг уншиж байна…'));
    else if(social.error&&!social.leaderboard)root.append(empty('Мэдээлэл ачаалагдсангүй','Холболтоо шалгаад дахин оролдоорой.','♜'),button('Дахин шалгах','social_refresh',{panel:'top',metric:social.metric},'btn primary'));
    else if(!social.leaderboard?.entries?.length)root.append(empty('Анхны рекордоо тогтоо','Загас бариад далайн шилдгүүдийн жагсаалтад ороорой.','♜'));
    else{
      const list=h('div',{class:'rank-list'});
      for(const entry of social.leaderboard.entries)list.append(rankRow(entry,social.metric));
      root.append(list);
      if(social.leaderboard.self)root.append(h('div',{class:'own-rank'},h('small',{},'ТАНЫ БАЙР'),rankRow(social.leaderboard.self,social.metric)));
    }
  }else{
    root.append(h('div',{class:'friend-code'},h('div',{},h('small',{},'ТАНЫ FRIEND CODE'),h('b',{},social.friendCode||'—')),button('Хуулах','copy_friend_code',{},'btn subtle')));
    const form=h('form',{'data-friend-form':'',class:'friend-form'},h('input',{name:'code',placeholder:'Найзын friend code',required:true,maxlength:12,autocomplete:'off'}),h('button',{type:'submit',class:'btn primary'},'Хүсэлт илгээх'));root.append(form);
    if(social.loading)root.append(h('p',{class:'loading-copy'},'Найзуудын мэдээллийг уншиж байна…'));
    const requests=social.requests||{};
    for(const [kind,rows]of [['incoming',requests.incoming||[]],['outgoing',requests.outgoing||[]]]){
      if(!rows.length)continue;root.append(h('h3',{class:'section-heading'},kind==='incoming'?'Ирсэн хүсэлт':'Илгээсэн хүсэлт'));
      for(const request of rows){
        const row=h('div',{class:'friend-row'},h('span',{class:'avatar'},AVATARS[request.profile.avatar]||AVATARS[0]),h('div',{class:'friend-copy'},h('b',{},request.profile.name),h('small',{},'Lv.'+request.profile.level)));
        if(kind==='incoming')row.append(button('Зөвшөөрөх','friend_respond',{requestId:request.id,decision:'accept'},'btn primary compact'),button('×','friend_respond',{requestId:request.id,decision:'decline'},'btn subtle compact'));
        else row.append(button('Цуцлах','friend_cancel',{requestId:request.id},'btn subtle compact'));
        root.append(row);
      }
    }
    root.append(h('div',{class:'section-heading'},h('h3',{},'Найзууд'),h('span',{},(social.friends||[]).length)));
    if(!social.friends?.length)root.append(empty('Дараагийн аяллаа найздаа хуваалц','Friend code-оор найзаа нэмээд online төлөвийг нь хараарай.','♧'));
    for(const friend of social.friends||[])root.append(h('div',{class:'friend-row'},h('span',{class:'avatar'},AVATARS[friend.avatar]||AVATARS[0]),h('div',{class:'friend-copy'},h('b',{},friend.name),h('small',{class:friend.online?'online-state':'offline-state'},friend.online?'● Online · Lv.'+friend.level:'● Offline · Lv.'+friend.level)),button('Хасах','friend_remove',{friendId:friend.id},'btn subtle compact')));
  }
  if(social.error)root.append(h('p',{class:'inline-error'},social.error));
  return root;
}
function rankRow(entry,metric){return h('div',{class:'rank-row'},h('b',{class:'rank-number'},'#'+entry.rank),h('span',{class:'avatar'},AVATARS[entry.avatar]||AVATARS[0]),h('div',{class:'friend-copy'},h('b',{},entry.name),h('small',{},'Lv.'+entry.level)),h('strong',{},metric==='weight'?formatKg(entry.value)+' kg':money(entry.value)+(metric==='xp'?' XP':' загас')));}
