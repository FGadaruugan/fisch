import {createClient} from '@supabase/supabase-js';
import {ONLINE_CONFIG} from './online-config.js';

const byId=id=>document.getElementById(id);
const status=byId('status'),login=byId('login'),logout=byId('logout'),workspace=byId('workspace'),identity=byId('identity');
const client=createClient(ONLINE_CONFIG.url,ONLINE_CONFIG.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const apiURL=new URL('/functions/v1/fisch-api',ONLINE_CONFIG.url).href;
let busy=false;
function show(message){status.textContent=message;}
function reset(){workspace.hidden=true;logout.hidden=true;identity.textContent='';}
async function verify(){
 if(busy)return;busy=true;login.hidden=true;reset();show('Серверийн Admin+ эрхийг шалгаж байна…');
 try{
  const {data:{session},error}=await client.auth.getSession();if(error)throw error;
  if(!session){show('Нэвтрээгүй байна. Admin эрхтэй account-аар нэвтэрнэ үү.');login.hidden=false;return;}
  logout.hidden=false;
  const response=await fetch(apiURL,{method:'POST',headers:{'content-type':'application/json','authorization':'Bearer '+session.access_token},body:JSON.stringify({action:'admin_status'})});
  const result=await response.json().catch(()=>null);
  if(!response.ok||result?.ok!==true||result?.role!=='Admin+'){
   await client.auth.signOut();reset();login.hidden=false;show('ХАНДАЛТ ХОРИГЛОГДЛОО. Энэ account серверийн Admin+ зөвшөөрөгдсөн жагсаалтад байхгүй.');return;
  }
  show('Admin+ баталгаажлаа. Энэ самбар одоогоор зөвхөн аюулгүй байдлын төлөв харуулна.');
  workspace.hidden=false;identity.textContent='Authenticated account ID: '+session.user.id;
 }catch{reset();login.hidden=false;show('Холболт эсвэл серверийн баталгаажуулалт амжилтгүй. Аюулгүй байдлын үүднээс нэвтрэхийг хориглолоо.');}
 finally{busy=false;}
}
login.addEventListener('click',async()=>{
 login.disabled=true;show('Google нэвтрэлтийг нээж байна…');
 try{const {error}=await client.auth.signInWithOAuth({provider:'google',options:{redirectTo:location.href,skipBrowserRedirect:false}});if(error)throw error;}
 catch{show('Нэвтрэлт эхэлсэнгүй. Auth provider-ийн тохиргоог шалгана уу.');login.disabled=false;}
});
logout.addEventListener('click',async()=>{await client.auth.signOut();reset();login.hidden=false;login.disabled=false;show('Системээс гарлаа.');});
client.auth.onAuthStateChange(()=>{void verify();});
void verify();
