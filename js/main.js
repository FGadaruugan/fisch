import * as THREE from 'three';
import {createGraphics} from './graphics.js';
import {createWorld} from './world.js';
import {createPlayer} from './player.js';
import {createFishingRig} from './fishing-rig.js';
import {createInput} from './input.js';
import {createFishingController} from './fishing.js';
import {createLocalService} from './services/local.js';
import {createApp} from './app.js';
import {createUI} from './ui.js';
import {createAudio} from './audio.js';
import {normalizeSettings,createFramePacer} from './performance.js';
import {ONLINE_CONFIG} from './online-config.js';
import {prepareSocialRefresh} from './ui/social-state.js';
import {createFullscreenControl} from './fullscreen.js';

const byId=id=>document.getElementById(id),SETTINGS_KEY='fisch3d.settings.v1';
let settings;try{settings=normalizeSettings(JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}'));}catch{settings=normalizeSettings();}
let app,graphics,currentScene,audio,socialService=null,onlineService=null,onlineClient=null,refreshGeneration=0,animationId=0;
let socialState={connected:false,metric:'xp',friends:[],requests:{incoming:[],outgoing:[]},leaderboard:null},heartbeatTimer=null;
const view=createUI({document,onCommand:command,onPhase:phase=>audio?.phase(phase),onCatch:caught=>{audio?.catch();currentScene?.rig.showCatch(caught);}});
const fullscreen=createFullscreenControl({document,button:byId('fullscreenButton'),onResize:()=>graphics?.resize(),onUnavailable:()=>view.showNotice('FULLSCREEN_UNAVAILABLE')});
audio=createAudio(()=>settings.volume);
const localService=createLocalService({onStorageError:code=>view.showNotice(code)});
const pacer=createFramePacer(settings.targetFps);view.setSettings(settings);
window.addEventListener('pointerdown',audio.unlock,{once:true});window.addEventListener('keydown',audio.unlock,{once:true});

function cameraCollision(world,target,desired){
  let fraction=1;
  for(const box of world.cameraColliders||[]){
    let near=0,far=1;
    for(const key of ['x','y','z']){
      const d=desired[key]-target[key];
      if(Math.abs(d)<1e-7){if(target[key]<box.min[key]||target[key]>box.max[key]){near=2;break;}}
      else{const a=(box.min[key]-target[key])/d,b=(box.max[key]-target[key])/d;near=Math.max(near,Math.min(a,b));far=Math.min(far,Math.max(a,b));}
    }
    if(near<=far&&near>0.03&&near<1)fraction=Math.min(fraction,Math.max(0.15,near-0.035));
  }
  desired.lerpVectors(target,desired,fraction);
  desired.y=Math.max(desired.y,world.heightAt(desired.x,desired.z)+0.65,0.8);return desired;
}
function worldFactory(islandId){
  const world=createWorld(THREE,islandId),player=createPlayer(THREE,world),rig=createFishingRig(THREE,player),root=new THREE.Group();
  root.add(world.group,player.group,rig.group);graphics.scene.add(root);graphics.setWorld(world);
  let yaw=Math.PI,pitch=0.38,distance=12,clock=0;
  const target=new THREE.Vector3(),desired=new THREE.Vector3();
  graphics.camera.position.set(world.center.x+world.radius*0.55,30,world.center.z+world.radius*1.40);
  player.reset(world);
  const context={world,player,rig,
    update(input,dt,fishing,mode){
      clock+=dt;
      if(mode==='play'){
        yaw-=input.lookDeltaX*0.005;pitch=Math.max(0.15,Math.min(1.05,pitch+input.lookDeltaY*0.005));distance=Math.max(5,Math.min(16,distance+input.zoomDelta*0.018));
        player.tick({...input,cameraYaw:yaw},dt,fishing.phase);
        if(['charging','waiting','bite','reeling'].includes(fishing.phase)){const spot=world.fishingSpot(player.position);if(spot)player.faceDirection(spot.direction);}
        const pose=player.getCameraPose(yaw,pitch,distance);target.set(pose.target.x,pose.target.y,pose.target.z);desired.set(pose.position.x,pose.position.y,pose.position.z);cameraCollision(world,target,desired);
      }else{
        player.tick({},dt,'idle');target.set(world.center.x,8,world.center.z+world.radius*0.52);
        desired.set(world.center.x+world.radius*(0.48+Math.sin(clock*0.07)*0.12),31,world.center.z+world.radius*1.40);
      }
      graphics.camera.position.lerp(desired,dt?1-Math.exp(-dt*7):1);graphics.camera.lookAt(target);
      world.update(dt,player.position);rig.update(dt,fishing,graphics.time,graphics.profile);
    },
    dispose(){graphics.scene.remove(root);rig.dispose();player.dispose();world.dispose();}
  };
  currentScene=context;return context;
}
async function connectOnline(){
  if(!ONLINE_CONFIG.url||!ONLINE_CONFIG.publishableKey){view.showNotice('ONLINE_UNAVAILABLE');return;}
  view.setBusy(true,'online');
  try{
    const {createOnlineService,createSocialService}=await import('./services/online.js');
    if(!onlineService){const created=await createOnlineService({config:ONLINE_CONFIG,profile:localService.getSnapshot().profile});onlineService=created.service;onlineClient=created.client;socialService=createSocialService(created.client,ONLINE_CONFIG);socialState.friendCode=created.friendCode;}
    onlineClient.auth.startAutoRefresh();await onlineService.refresh();await app.setService(onlineService);
    view.setConnection('online');socialState.connected=true;view.setSocial(socialState);
    if(heartbeatTimer)clearInterval(heartbeatTimer);
    const heartbeat=()=>{if(!document.hidden&&app.getService().mode==='online'){void socialService.heartbeat().catch(()=>{});if(view.getPanel()==='friends')void refreshSocial({panel:'friends'});}};heartbeat();heartbeatTimer=setInterval(heartbeat,30000);
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
  if(name==='fullscreen'){await fullscreen.toggle();return;}
  if(name==='settings'){
    const previousFps=settings.targetFps;
    settings=normalizeSettings({...settings,...payload});graphics?.applySettings(payload);if(previousFps!==settings.targetFps)pacer.setTarget(settings.targetFps);view.setSettings(settings);
    try{localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings));}catch{view.showNotice('SAVE_UNAVAILABLE');}return;
  }
  if(!app)return;
  if(name==='play'&&window.matchMedia('(pointer: coarse)').matches)void fullscreen.enter();
  if(name==='connect_online'){await connectOnline();return;}
  if(name==='switch_local'){refreshGeneration++;if(heartbeatTimer)clearInterval(heartbeatTimer);heartbeatTimer=null;onlineClient?.auth.stopAutoRefresh();await app.setService(localService);view.setConnection('local');view.setSocial({connected:false,friends:[],requests:{incoming:[],outgoing:[]},leaderboard:null});return;}
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
  await app.dispatch(name,payload);
}
try{
  graphics=createGraphics(THREE,byId('viewport'),settings);
  const input=createInput({window,canvas:byId('viewport'),joystick:byId('joystick'),action:byId('fishingAction'),jump:byId('jumpAction'),interact:byId('interactAction')});
  const fishing=createFishingController({onFinish:event=>app?.handleFinish(event)});
  app=createApp({service:localService,fishing,input,worldFactory,view});view.finishLoading();
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
  byId('viewport').addEventListener('webglcontextlost',event=>{event.preventDefault();visibility(false);view.showError('Графикийн холболт түр тасарлаа. Ахиц хадгалагдсан. Дахин оролдоорой.');});
  window.addEventListener('beforeunload',()=>{cancelAnimationFrame(animationId);if(heartbeatTimer)clearInterval(heartbeatTimer);fullscreen.dispose();app.dispose();graphics.dispose();audio.dispose();view.dispose();},{once:true});
}catch(error){console.error('Fisch startup failed',error);view.showError('3D график нээгдсэнгүй. WebGL 2 дэмждэг browser дээр дахин оролдоорой.');}
