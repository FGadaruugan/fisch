import {ONLINE_CONFIG} from './online-config.js';
import {createAccountClient,verifiedAccount} from './services/account.js';
import {sessionForOAuthReturn} from './account-return.js';
const status=document.querySelector('[data-account-status]'),retry=document.querySelector('[data-account-retry]');
const returnHash=window.location.hash;
const client=createAccountClient(ONLINE_CONFIG,{callback:true}),key='fisch3d.oauth.bridge',callback=new URL(ONLINE_CONFIG.callbackURL);
const allowed=new Set(ONLINE_CONFIG.origins);
let running=false,readyTimer;
function readBridge(){try{const b=JSON.parse(sessionStorage.getItem(key)||'null');return b&&allowed.has(b.origin)&&typeof b.nonce==='string'&&b.nonce.length<=100&&Date.now()-b.at<300000?b:null;}catch{return null;}}
function notice(text){status.textContent=text;}
async function complete(){
  const bridge=readBridge();
  if(!bridge)return false;
  const {data}=await client.auth.getSession();
  const returned=sessionForOAuthReturn(returnHash,data.session);if(!returned)return false;
  const user=await verifiedAccount(client);if(!user)throw new Error('Unverified OAuth return');
  if(window.opener){window.opener.postMessage({type:'fisch:session',nonce:bridge.nonce,session:returned},bridge.origin);}
  sessionStorage.removeItem(key);notice('Нэвтэрлээ. Тоглоомын цонх руу буцаарай.');retry.hidden=false;return true;
}
async function begin(event){
  if(running||event.source!==window.opener||!allowed.has(event.origin)||event.data?.type!=='fisch:begin'||typeof event.data.nonce!=='string'||event.data.nonce.length>100)return;
  running=true;clearInterval(readyTimer);
  try{
    sessionStorage.setItem(key,JSON.stringify({origin:event.origin,nonce:event.data.nonce,at:Date.now()}));
    notice('Google account-аа сонгоорой.');
    const {data,error}=await client.auth.signInWithOAuth({provider:'google',options:{redirectTo:callback.href,queryParams:{prompt:'select_account'},skipBrowserRedirect:true}});
    if(error||!data?.url)throw error||new Error('OAuth unavailable');
    window.location.replace(data.url);
  }catch{notice('Нэвтрэх боломжгүй байна. Тоглоом руу буцаад дахин оролдоорой.');const b=readBridge();if(b&&window.opener)window.opener.postMessage({type:'fisch:error',nonce:b.nonce},b.origin);sessionStorage.removeItem(key);}
}
window.addEventListener('message',event=>void begin(event));
const ready=()=>window.opener?.postMessage({type:'fisch:ready'},callback.origin===window.location.origin?'*':callback.origin);
try{
  if(!await complete()){
    if(new URLSearchParams(returnHash.slice(1)).has('error')){sessionStorage.removeItem(key);notice('Google нэвтрэлт цуцлагдсан байна. Тоглоом руу буцаад дахин оролдоорой.');}
    else if(window.opener){notice('Нэвтрэхийг бэлдэж байна…');ready();readyTimer=setInterval(ready,300);setTimeout(()=>clearInterval(readyTimer),300000);}
    else{notice('Энэ цонхыг тоглоомын Google нэвтрэх товчоор нээгээрэй.');retry.hidden=false;}
  }
}catch{const b=readBridge();if(b&&window.opener)window.opener.postMessage({type:'fisch:error',nonce:b.nonce},b.origin);sessionStorage.removeItem(key);notice('Нэвтрэх боломжгүй байна. Тоглоом руу буцаад дахин оролдоорой.');retry.hidden=false;}
