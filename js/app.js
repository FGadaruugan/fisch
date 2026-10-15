import {createFavorites} from './favorites.js';
import {operationId} from './services/local.js';
import {GameError} from './errors.js';
import {canVisit} from './progression.js';

/** Owns game lifecycle; rendering, persistence and input are injected boundaries. */
export function createApp({service,fishing,input,worldFactory,view,favoriteStorage}) {
  let mode='lobby',panel=null,visible=true,disposed=false,busyCount=0,generation=0,activeTicket=null,held=false,previousAction=false,pendingFinish=null,destination=null,elapsed=0,arrivalRetry=0,pendingArrival=null;
  let scene=worldFactory(service.getSnapshot().lastIsland,{totalXp:service.getSnapshot().totalXp}),unsubscribe=()=>{};
  const isBusy=()=>busyCount>0;
  const syncInput=()=>input.setEnabled(visible&&mode==='play'&&!panel&&!disposed);
  const changeBusy=delta=>{busyCount=Math.max(0,busyCount+delta);view.setBusy(isBusy());};
  const fail=error=>view.showNotice(error?.code||'UNKNOWN');
  const favorites=createFavorites({storage:favoriteStorage,onError:code=>view.showNotice(code)});
  const near=point=>!!point&&Math.hypot(scene.player.position.x-point.x,scene.player.position.z-point.z)<7;
  const nearSecret=()=>mode==='play'&&scene.player.motion==='walking'&&near(scene.world.secret);
  function bind(){unsubscribe=service.subscribe(snapshot=>{if(!disposed){scene.setAccess?.(snapshot.totalXp);view.renderSnapshot(favorites.decorate(service,snapshot));}});}
  function cancelActive(){
    generation++;held=false;previousAction=false;fishing.cancel();input.releaseAll();
    const ticket=activeTicket;activeTicket=null;
    if(ticket&&!pendingFinish)service.cancelCast(ticket.id).catch(fail);
    view.renderFishing(fishing.getView());
  }
  function showCurrent(){view.showPanel(panel||mode);syncInput();}
  function releaseArrival(ticket){if(ticket&&!ticket.released){ticket.released=true;changeBusy(-1);}}
  function replaceScene(id){releaseArrival(pendingArrival);pendingArrival=null;const old=scene;scene=worldFactory(id,{totalXp:service.getSnapshot().totalXp});destination=null;arrivalRetry=0;old.dispose();}
  async function run(command){
    if(disposed||isBusy())return false;
    changeBusy(1);try{await command();return true;}catch(error){fail(error);return false;}finally{changeBusy(-1);}
  }
  async function fishPress(){
    held=true;
    if(disposed||!visible||mode!=='play'||panel||isBusy())return;
    if(['swimming','sailing'].includes(scene.player.motion)){view.showNotice('ON_FOOT_FISHING');return;}
    if(fishing.active){fishing.press();return;}
    const spot=scene.world.fishingSpot(scene.player.position);
    if(!spot){view.showNotice('NEAR_WATER');return;}
    const token=++generation;changeBusy(1);
    try{
      const next=await service.startCast(scene.world.islandId);
      if(disposed||token!==generation||panel||!visible||mode!=='play'){await service.cancelCast(next.id);return;}
      activeTicket=next;scene.rig?.setSpot(spot);fishing.start(next);
      if(!held)fishing.release();
    }catch(error){fail(error);}finally{changeBusy(-1);}
  }
  function handleFinish(event){
    if(disposed||activeTicket?.id!==event.ticketId)return Promise.resolve(null);
    activeTicket=null;changeBusy(1);
    const work=(async()=>{
      try{
        const caught=await service.finishCast(event.ticketId,event.outcome);
        if(caught&&!disposed)view.showCatch(caught);
        else if(event.outcome==='escaped'&&!disposed)view.showNotice('FISH_ESCAPED');
        return caught;
      }catch(error){fail(error);return null;}finally{changeBusy(-1);}
    })();
    pendingFinish=work;
    work.then(()=>{if(pendingFinish===work)pendingFinish=null;},()=>{if(pendingFinish===work)pendingFinish=null;});
    return work;
  }
  function play(){if(disposed)return;mode='play';panel=null;showCurrent();}
  function openPanel(name){if(disposed)return;if(name==='secret'&&!nearSecret()){view.showNotice('TRADE_LOCATION_REQUIRED');return;}cancelActive();panel=name;showCurrent();}
  function closePanel(){panel=null;showCurrent();}
  async function travel(islandId){
    if(disposed)return;
    if(!canVisit(islandId,service.getSnapshot().totalXp)){view.showNotice('ISLAND_LOCKED');return;}
    cancelActive();destination=islandId;mode='play';panel=null;showCurrent();
  }
  function checkArrival(){
    const reached=scene.world.islandAt?.(scene.player.position,24);if(!reached)return;
    if(reached.id===scene.world.islandId){if(destination===reached.id)destination=null;return;}
    if(!canVisit(reached.id,service.getSnapshot().totalXp)||pendingArrival||elapsed<arrivalRetry)return;
    const actor=service,place=scene,ticket={released:false};pendingArrival=ticket;changeBusy(1);
    ticket.work=(async()=>{
      try{
        await actor.travel(reached.id);
        if(disposed||actor!==service||place!==scene)return;
        place.setIsland?.(reached.id);if(destination===reached.id)destination=null;view.showNotice('ISLAND_ARRIVED');
      }catch(error){if(!disposed&&actor===service&&place===scene){arrivalRetry=elapsed+5;fail(error);}}
      finally{releaseArrival(ticket);if(pendingArrival===ticket)pendingArrival=null;}
    })();
  }
  async function dispatch(command,payload={}){
    switch(command){
      case 'play':case 'resume':play();break;
      case 'open':openPanel(payload.panel);break;
      case 'close':closePanel();break;
      case 'lobby':cancelActive();mode='lobby';panel=null;showCurrent();break;
      case 'fish_press':await fishPress();break;
      case 'fish_release':held=false;fishing.release();break;
      case 'cancel':cancelActive();break;
      case 'travel':await travel(payload.islandId);break;
      case 'buy_rod':await run(()=>service.buyRod(payload.rodId,operationId()));break;
      case 'trade_rod': {
        if(panel!=='secret'||!nearSecret()){view.showNotice('TRADE_LOCATION_REQUIRED');break;}
        const actor=service,position={x:scene.player.position.x,z:scene.player.position.z};
        const success=await run(()=>actor.tradeRod(payload.rodId,position,operationId()));if(success&&!disposed&&actor===service)view.showNotice('TRADE_SUCCESS');break;
      }
      case 'equip_rod':await run(()=>service.equipRod(payload.rodId));break;
      case 'update_profile':await run(()=>service.updateProfile(payload));break;
      case 'toggle_favorite':
        if(disposed||isBusy())break;
        favorites.toggle(service,payload.id);view.renderSnapshot(favorites.decorate(service,service.getSnapshot()));break;
      case 'sell_fish':case 'sell_all': {
        if(mode!=='play'||!near(scene.world.seller)){view.showNotice('NEAR_MERCHANT');break;}
        const ids=command==='sell_all'?service.getSnapshot().fish.filter(f=>!favorites.has(service,f.id)).map(f=>f.id):[payload.id];
        if(ids.length)await run(()=>service.sellFish(ids,operationId()));break;
      }
      default:fail(new GameError('UNKNOWN_ACTION'));
    }
  }
  function tick(dt){
    if(disposed||!visible)return;
    elapsed+=Math.min(.05,Math.max(0,dt));const values=input.getSnapshot();
    if(values.cancelPressed){if(panel)closePanel();else if(fishing.active)cancelActive();else openPanel('settings');}
    if(values.backpackPressed)openPanel('backpack');
    if(mode==='play'&&!panel){
      if(values.interactPressed&&!isBusy()&&!fishing.active){const interaction=scene.interact?.();if(interaction){if(interaction.code)view.showNotice(interaction.code);}else if(nearSecret())openPanel('secret');else if(near(scene.world.seller))openPanel('shop');else if(near(scene.world.ferry))openPanel('map');}
      if(values.actionHeld!==previousAction){previousAction=values.actionHeld;if(values.actionHeld)void fishPress();else{held=false;fishing.release();}}
    }
    fishing.tick(dt);
    const locked=mode!=='play'||!!panel||fishing.active||isBusy();
    scene.update({...values,freeze:locked,moveX:locked?0:values.moveX,moveZ:locked?0:values.moveZ,jumpPressed:!locked&&values.jumpPressed},dt,fishing.getView(),mode);
    if(!locked)checkArrival();
    view.renderFishing(fishing.getView());
    view.renderContext?.({...scene.getNavigation?.(destination),islandId:scene.world.islandId,position:scene.player.position,merchant:near(scene.world.seller),ferry:near(scene.world.ferry),secret:nearSecret(),spot:!!scene.world.fishingSpot(scene.player.position),mode,panel});
  }
  function setVisible(value){visible=!!value;held=false;previousAction=false;fishing.setPaused(!visible);syncInput();}
  async function setService(next){
    if(!next||typeof next.getSnapshot!=='function'||next.isActive?.()===false)throw new GameError('AUTH_REQUIRED');
    if(pendingFinish)await pendingFinish;
    if(next.isActive?.()===false)throw new GameError('AUTH_REQUIRED');
    const snapshot=next.getSnapshot();cancelActive();unsubscribe();service=next;replaceScene(snapshot.lastIsland);bind();mode='lobby';panel=null;showCurrent();
  }
  bind();showCurrent();
  return{play,openPanel,closePanel,travel,dispatch,tick,setVisible,setService,handleFinish,getScene:()=>scene,getService:()=>service,getState:()=>({mode,panel,visible,destination,busy:isBusy()}),dispose(){if(disposed)return;cancelActive();releaseArrival(pendingArrival);disposed=true;unsubscribe();scene.dispose();input.dispose();}};
}
