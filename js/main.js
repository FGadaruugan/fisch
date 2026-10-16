import {getImportableLocalSnapshot} from './local-import.js';
import * as THREE from 'three';
import {createGraphics} from './graphics.js';
import {createVoyageScene} from './voyage-scene.js';
import {createInput} from './input.js';
import {createFishingController} from './fishing.js';
import {createLocalService} from './services/local.js';
import {createApp} from './app.js';
import {createUI} from './ui.js';
import {createAudio} from './audio.js';
import {createFramePacer} from './performance.js';
import {ONLINE_CONFIG} from './online-config.js';
import {prepareSocialRefresh} from './ui/social-state.js';
import {createFullscreenControl} from './fullscreen.js';
import {createPopupLogin} from './account-popup.js';
import {createIdentityGuard} from './account-identity.js';
import {collectDeviceSupport} from './device-support.js';
import {createAppInstallControl} from './install.js';
import {createSettingsController,changedSettings} from './settings/controller.js';
import {createNetworkMonitor} from './network.js';
import {createResourceManager} from './resources/manager.js';

const byId=id=>document.getElementById(id);
let settingsStorage;try{settingsStorage=window.localStorage;}catch{}
const settingsController=createSettingsController({storage:settingsStorage,onError:code=>view.showNotice(code)});
let settings=settingsController.getState().settings;
let app,graphics,currentScene,audio,socialService=null,onlineService=null,onlineClient=null,refreshGeneration=0,animationId=0;
let socialState={connected:false,metric:'xp',friends:[],requests:{incoming:[],outgoing:[]},leaderboard:null},heartbeatTimer=null;
let accountClientPromise,accountClient,currentAuthUser=null,onlineOwner=null,identityTransition=null,accountSigning=false,authSubscription,connectionQueue=Promise.resolve();
const identityGuard=createIdentityGuard();
const view=createUI({document,onCommand:command,onPhase:phase=>audio?.phase(phase),onCatch:caught=>{audio?.catch();currentScene?.rig.showCatch(caught);}});
const appInstall=createAppInstallControl({window,onChange:state=>view.setInstallState(state)});
const fullscreen=createFullscreenControl({document,button:byId('fullscreenButton'),onResize:()=>graphics?.resize(),onUnavailable:()=>view.showNotice('FULLSCREEN_UNAVAILABLE')});
audio=createAudio(()=>settings.volume);
const localService=createLocalService({onStorageError:code=>view.showNotice(code)});
const pacer=createFramePacer(settings.targetFps);
settingsController.subscribe(state=>{const previousFps=settings.targetFps,patch=changedSettings(settings,state.settings);settings=state.settings;if(Object.keys(patch).length)graphics?.applySettings(patch);if(previousFps!==settings.targetFps)pacer.setTarget(settings.targetFps);view.setSettingsState(state);});
view.setSettingsState(settingsController.getState());
const baseURL=new URL('./',document.baseURI),build=document.querySelector('meta[name="fisch-build"]')?.content;
const network=createNetworkMonitor({baseURL});network.subscribe(state=>view.setSettingsState({network:state}));view.setSettingsState({network:network.getState()});
const resources=createResourceManager({baseURL,build,supported:!!(window.isSecureContext&&navigator.serviceWorker&&window.caches&&window.crypto?.subtle)});
resources.subscribe(state=>view.setSettingsState({resources:state}));view.setSettingsState({resources:resources.getState()});void resources.initialize();
if(window.isSecureContext&&navigator.serviceWorker){
  const workerState=()=>resources.setWorkerActive(navigator.serviceWorker.controller?.scriptURL===new URL('sw.js',baseURL).href);
  navigator.serviceWorker.addEventListener('controllerchange',workerState);workerState();
  void navigator.serviceWorker.register(new URL('sw.js',baseURL),{scope:baseURL.pathname,updateViaCache:'none'}).then(()=>workerState()).catch(()=>resources.setWorkerActive(false));
}
void navigator.storage?.estimate?.().then(estimate=>view.setSettingsState({storageEstimate:estimate})).catch(()=>{});
window.addEventListener('pointerdown',audio.unlock,{once:true});window.addEventListener('keydown',audio.unlock,{once:true});

function refreshDeviceSupport(){
  let gpu;try{gpu=graphics?.getSupport();}catch{}
  view.setDeviceSupport(collectDeviceSupport({window,document,navigator,graphics:gpu}));
}

function worldFactory(islandId,{totalXp=0}={}){currentScene=createVoyageScene(THREE,{islandId,totalXp,graphics});return currentScene;}
function syncAccountView(){
  const local=getImportableLocalSnapshot(localService),hasProgress=local&&(local.coins||local.totalXp||local.stats.totalCaught||local.fish.length||local.collection.length||local.rods.length>1);
  view.setAccount({user:currentAuthUser?{email:currentAuthUser.email}:null,connected:app?.getService().mode==='online',...(onlineService?.getAccountState()||{canImport:false,importedFromLocal:false}),local:hasProgress?local:null});
}
function getAccountClient(){
  if(!accountClientPromise)accountClientPromise=import('./services/account.js').then(module=>{
    accountClient=module.createAccountClient(ONLINE_CONFIG);
    authSubscription=accountClient.auth.onAuthStateChange((event,session)=>{
      const owner=session?.user?.id||null,changed=identityGuard.observe(owner);
      if(changed){
        if(currentAuthUser?.id!==owner)currentAuthUser=null;
        syncAccountView();
        if(event==='SIGNED_OUT'||(onlineOwner&&owner!==onlineOwner))queueMicrotask(()=>void disconnectOnline().catch(error=>view.showNotice(error?.code||'NETWORK_ERROR')));
        if(event==='SIGNED_IN'&&!accountSigning)queueMicrotask(()=>void connectOnline());
      }
    }).data.subscription;
    return {client:accountClient,verifiedAccount:module.verifiedAccount};
  }).catch(error=>{accountClientPromise=null;throw error;});
  return accountClientPromise;
}
function disconnectOnline(){
  if(identityTransition)return identityTransition;
  refreshGeneration++;if(heartbeatTimer)clearInterval(heartbeatTimer);heartbeatTimer=null;
  const previous=onlineService,previousSocial=socialService;onlineService=null;onlineOwner=null;socialService=null;
  previous?.dispose();previousSocial?.dispose();
  socialState={connected:false,metric:'xp',friends:[],requests:{incoming:[],outgoing:[]},leaderboard:null};
  view.setBusy(true,'identity');
  identityTransition=(async()=>{
    if(app?.getService().mode==='online')await app.setService(localService);
    view.setConnection('local');view.setSocial(socialState);syncAccountView();
  })().finally(()=>{identityTransition=null;view.setBusy(false,'identity');});
  return identityTransition;
}
function connectOnline(){
  const work=connectionQueue.then(()=>establishOnlineConnection());connectionQueue=work.catch(()=>{});return work;
}
async function establishOnlineConnection(){
  if(!ONLINE_CONFIG.url||!ONLINE_CONFIG.publishableKey){view.showNotice('ONLINE_UNAVAILABLE');return;}
  view.setBusy(true,'online');
  try{
    if(identityTransition)await identityTransition;
    const {client,verifiedAccount}=await getAccountClient(),user=await verifiedAccount(client);
    if(!user){currentAuthUser=null;syncAccountView();await app.dispatch('open',{panel:'profile'});return;}
    const ticket=identityGuard.capture(user.id);
    currentAuthUser=user;
    const {createOnlineService,createSocialService}=await identityGuard.run(ticket,()=>import('./services/online.js'));
    if(onlineOwner&&onlineOwner!==user.id)await identityGuard.run(ticket,()=>disconnectOnline());
    if(!onlineService){
      const created=await identityGuard.run(ticket,()=>createOnlineService({client,expectedOwner:user.id,config:ONLINE_CONFIG,profile:localService.getSnapshot().profile}),value=>value.service.dispose());
      if(created.service.ownerId!==user.id){created.service.dispose();throw {code:'AUTH_REQUIRED'};}
      onlineService=created.service;onlineClient=created.client;onlineOwner=user.id;socialService=createSocialService(created.client,{...ONLINE_CONFIG,ownerId:user.id});socialState.friendCode=created.friendCode;
      onlineService.subscribe(()=>syncAccountView());
    }
    const service=onlineService,activeSocial=socialService;
    onlineClient.auth.startAutoRefresh();await identityGuard.run(ticket,()=>service.refresh());
    if(app.getService()!==service)await identityGuard.run(ticket,()=>app.setService(service));
    view.setConnection('online');socialState.connected=true;view.setSocial(socialState);
    syncAccountView();
    if(heartbeatTimer)clearInterval(heartbeatTimer);
    const heartbeat=()=>{if(!document.hidden&&onlineService===service&&app.getService()===service){void activeSocial.heartbeat().catch(()=>{});if(view.getPanel()==='friends')void refreshSocial({panel:'friends'});}};heartbeat();heartbeatTimer=setInterval(heartbeat,30000);
  }catch(error){view.showNotice(error?.code||'NETWORK_ERROR');}finally{view.setBusy(false,'online');}
}
async function refreshSocial(payload={}){
  if(!socialService||app.getService().mode!=='online'){view.setSocial({...socialState,connected:false});return;}
  const token=++refreshGeneration,metric=payload.metric||socialState.metric,panel=payload.panel||view.getPanel();
  socialState=prepareSocialRefresh(socialState,{metric});view.setSocial(socialState);
  try{
    if(panel==='top'){const leaderboard=await socialService.getLeaderboard(metric);if(token!==refreshGeneration)return;socialState={...socialState,leaderboard,loading:false};}
    else{const [friends,requests]=await Promise.all([socialService.listFriends(),socialService.listRequests()]);if(token!==refreshGeneration)return;socialState={...socialState,friends,requests,loading:false};}
    view.setSocial(socialState);
  }catch(error){if(token===refreshGeneration){socialState={...socialState,loading:false,error:'Холболт тасарлаа. Дахин шалгаарай.'};view.setSocial(socialState);}}
}
async function command(name,payload={}){
  if(name==='install_app')return appInstall.install();
  if(name==='support_refresh'){refreshDeviceSupport();return;}
  if(name==='fullscreen'){await fullscreen.toggle();return;}
  if(name==='settings'){settingsController.edit(payload);return;}
  if(name==='settings_edit'){settingsController.edit(payload.values,{transaction:payload.transaction,commit:payload.commit});return;}
  if(name==='settings_preset'){settingsController.preset(payload.id);return;}
  if(name==='settings_reset'){settingsController.reset(payload.category);return;}
  if(name==='settings_undo'){settingsController.undo();return;}
  if(name==='settings_profile_save')return settingsController.saveProfile(payload.name);
  if(name==='settings_profile_load'){settingsController.loadProfile(payload.id);return;}
  if(name==='settings_profile_delete')return settingsController.deleteProfile(payload.id);
  if(name==='network_check')return network.check();
  if(name==='resources_download')return resources.download(payload.tier);
  if(name==='resources_pause'){resources.pause();return;}
  if(name==='resources_resume')return resources.download();
  if(name==='resources_remove')return resources.remove(payload.group);
  if(!app)return;
  if(name==='account_signin'){
    const login=createPopupLogin({window,callbackURL:ONLINE_CONFIG.callbackURL});
    accountSigning=true;view.setBusy(true,'account');
    try{const [session,{client,verifiedAccount}]=await Promise.all([login,getAccountClient()]);const {error}=await client.auth.setSession(session);if(error)throw {code:'AUTH_FAILED'};currentAuthUser=await verifiedAccount(client);if(!currentAuthUser)throw {code:'AUTH_REQUIRED'};await connectOnline();await app.dispatch('open',{panel:'profile'});}
    catch(error){view.showNotice(error?.code||'AUTH_FAILED');}
    finally{accountSigning=false;syncAccountView();view.setBusy(false,'account');}return;
  }
  if(name==='account_signout'){
    view.setBusy(true,'account');
    try{await disconnectOnline();const {client}=await getAccountClient();const {error}=await client.auth.signOut({scope:'local'});if(error)throw {code:'NETWORK_ERROR'};currentAuthUser=null;syncAccountView();await app.dispatch('open',{panel:'profile'});}
    catch(error){view.showNotice(error?.code||'NETWORK_ERROR');}finally{view.setBusy(false,'account');}return;
  }
  if(name==='account_refresh'){
    view.setBusy(true,'account');try{const service=onlineService,ticket=identityGuard.capture(service?.ownerId);await identityGuard.run(ticket,()=>service.refresh());syncAccountView();}catch(error){view.showNotice(error?.code||'NETWORK_ERROR');}finally{view.setBusy(false,'account');}return;
  }
  if(name==='account_import'){
    view.setBusy(true,'account');
    try{const service=onlineService;if(!service||!service.getAccountState().canImport)throw {code:'IMPORT_UNAVAILABLE'};const ticket=identityGuard.capture(service.ownerId),snapshot=getImportableLocalSnapshot(localService);if(!snapshot)throw {code:'IMPORT_UNAVAILABLE'};await identityGuard.run(ticket,()=>service.importLocal(snapshot));await identityGuard.run(ticket,()=>app.setService(service));view.setConnection('online');syncAccountView();await app.dispatch('open',{panel:'profile'});view.showNotice('IMPORT_SUCCESS');}
    catch(error){view.showNotice(error?.code||'NETWORK_ERROR');}finally{view.setBusy(false,'account');}return;
  }
  if(name==='play'&&window.matchMedia('(pointer: coarse)').matches)void fullscreen.enter();
  if(name==='connect_online'){await connectOnline();return;}
  if(name==='switch_local'){refreshGeneration++;if(heartbeatTimer)clearInterval(heartbeatTimer);heartbeatTimer=null;onlineClient?.auth.stopAutoRefresh();await app.setService(localService);view.setConnection('local');view.setSocial({connected:false,friends:[],requests:{incoming:[],outgoing:[]},leaderboard:null});syncAccountView();return;}
  if(name==='social_refresh'){await refreshSocial(payload);return;}
  if(name==='copy_friend_code'){try{await navigator.clipboard.writeText(socialState.friendCode||'');}catch{view.showNotice('UNKNOWN');}return;}
  if(name.startsWith('friend_')){
    if(!socialService){view.showNotice('ONLINE_UNAVAILABLE');return;}
    view.setBusy(true,'social');
    try{
      if(name==='friend_request')await socialService.sendRequest(payload.code);
      if(name==='friend_respond')await socialService.respondRequest(payload.requestId,payload.decision);
      if(name==='friend_cancel')await socialService.cancelRequest(payload.requestId);
      if(name==='friend_remove')await socialService.removeFriend(payload.friendId);
      await refreshSocial({panel:'friends'});
    }catch(error){view.showNotice(error?.code||'NETWORK_ERROR');}
    finally{view.setBusy(false,'social');}return;
  }
  if(name==='open'&&payload.panel==='profile')syncAccountView();
  await app.dispatch(name,payload);
}
try{
  graphics=createGraphics(THREE,byId('viewport'),settings);
  refreshDeviceSupport();
  const input=createInput({window,canvas:byId('viewport'),joystick:byId('joystick'),action:byId('fishingAction'),jump:byId('jumpAction'),interact:byId('interactAction')});
  const fishing=createFishingController({onFinish:event=>app?.handleFinish(event)});
  app=createApp({service:localService,fishing,input,worldFactory,view});view.finishLoading();
  syncAccountView();void getAccountClient().then(async({client,verifiedAccount})=>{currentAuthUser=await verifiedAccount(client);syncAccountView();if(currentAuthUser)await connectOnline();}).catch(error=>view.showNotice(error?.code||'NETWORK_ERROR'));
  window.addEventListener('focus',()=>{if(!accountSigning&&app.getService().mode==='online')void command('account_refresh');});
  let statsTime=0;
  function frame(now){
    animationId=requestAnimationFrame(frame);if(!app.getState().visible)return;
    const timing=pacer.step(now);graphics.observeRaf(now);app.tick(timing.delta);graphics.update(timing.delta,currentScene.player.position);
    if(timing.draw)graphics.render(now);
    statsTime+=timing.delta;if(statsTime>=0.4){statsTime=0;view.renderPerformance(graphics.getStats());}
  }
  animationId=requestAnimationFrame(frame);
  const resize=()=>graphics.resize();window.addEventListener('resize',resize);window.addEventListener('orientationchange',resize);
  function visibility(value){app.setVisible(value);pacer.reset();graphics.resetMonitor();if(value)audio.resume();else audio.suspend();}
  document.addEventListener('visibilitychange',()=>visibility(!document.hidden));window.addEventListener('blur',()=>visibility(false));window.addEventListener('focus',()=>visibility(!document.hidden));
  byId('viewport').addEventListener('webglcontextlost',event=>{event.preventDefault();visibility(false);refreshDeviceSupport();view.showError('Графикийн холболт түр тасарлаа. Ахиц хадгалагдсан. Дахин оролдоорой.');});
  window.addEventListener('beforeunload',()=>{cancelAnimationFrame(animationId);if(heartbeatTimer)clearInterval(heartbeatTimer);authSubscription?.unsubscribe();onlineService?.dispose();network.dispose();resources.pause();appInstall.dispose();fullscreen.dispose();app.dispose();graphics.dispose();audio.dispose();view.dispose();},{once:true});
}catch(error){console.error('Fisch startup failed',error);refreshDeviceSupport();view.showError('3D график нээгдсэнгүй. Доорх дэмжлэгийн мэдээллийг шалгаад дахин оролдоорой.');}
