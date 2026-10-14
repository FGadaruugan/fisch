import {operationId} from './services/local.js';
import {GameError} from './errors.js';

/** Owns game lifecycle; rendering, persistence and input are injected boundaries. */
export function createApp({service,fishing,input,worldFactory,view}) {
  let mode='lobby',panel=null,visible=true,disposed=false,busyCount=0,generation=0,activeTicket=null,held=false,previousAction=false,pendingFinish=null;
  let scene=worldFactory(service.getSnapshot().lastIsland),unsubscribe=()=>{};
  const isBusy=()=>busyCount>0;
  const syncInput=()=>input.setEnabled(visible&&mode==='play'&&!panel&&!disposed);
  const changeBusy=delta=>{busyCount=Math.max(0,busyCount+delta);view.setBusy(isBusy());};
  const fail=error=>view.showNotice(error?.code||'UNKNOWN');
  const near=point=>!!point&&Math.hypot(scene.player.position.x-point.x,scene.player.position.z-point.z)<7;
  function bind(){unsubscribe=service.subscribe(snapshot=>{if(!disposed)view.renderSnapshot(snapshot);});}
  function cancelActive(){
    generation++;held=false;previousAction=false;fishing.cancel();input.releaseAll();
    const ticket=activeTicket;activeTicket=null;
    if(ticket&&!pendingFinish)service.cancelCast(ticket.id).catch(fail);
    view.renderFishing(fishing.getView());
  }
  function showCurrent(){view.showPanel(panel||mode);syncInput();}
  function replaceScene(id){const old=scene;scene=worldFactory(id);old.dispose();}
  async function run(command){
    if(disposed||isBusy())return false;
    changeBusy(1);try{await command();return true;}catch(error){fail(error);return false;}finally{changeBusy(-1);}
  }
  async function fishPress(){
    held=true;
    if(disposed||!visible||mode!=='play'||panel||isBusy())return;
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
  function openPanel(name){if(disposed)return;cancelActive();panel=name;showCurrent();}
  function closePanel(){panel=null;showCurrent();}
  async function travel(islandId){
    if(pendingFinish)await pendingFinish;
    const ok=await run(()=>service.travel(islandId));
    if(ok){cancelActive();replaceScene(service.getSnapshot().lastIsland);mode='play';panel=null;showCurrent();}
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
      case 'equip_rod':await run(()=>service.equipRod(payload.rodId));break;
      case 'update_profile':await run(()=>service.updateProfile(payload));break;
      case 'sell_fish':case 'sell_all':
        if(mode!=='play'||!near(scene.world.seller)){view.showNotice('NEAR_MERCHANT');break;}
        await run(()=>service.sellFish(command==='sell_all'?service.getSnapshot().fish.map(f=>f.id):[payload.id],operationId()));break;
      default:fail(new GameError('UNKNOWN_ACTION'));
    }
  }
  function tick(dt){
    if(disposed||!visible)return;
    const values=input.getSnapshot();
    if(values.cancelPressed){if(panel)closePanel();else if(fishing.active)cancelActive();else openPanel('settings');}
    if(values.backpackPressed)openPanel('backpack');
    if(mode==='play'&&!panel){
      if(values.interactPressed){if(near(scene.world.seller))openPanel('shop');else if(near(scene.world.ferry))openPanel('map');}
      if(values.actionHeld!==previousAction){previousAction=values.actionHeld;if(values.actionHeld)void fishPress();else{held=false;fishing.release();}}
    }
    fishing.tick(dt);
    const locked=mode!=='play'||!!panel||fishing.active||isBusy();
    scene.update({...values,moveX:locked?0:values.moveX,moveZ:locked?0:values.moveZ,jumpPressed:!locked&&values.jumpPressed},dt,fishing.getView(),mode);
    view.renderFishing(fishing.getView());
    view.renderContext?.({islandId:scene.world.islandId,position:scene.player.position,merchant:near(scene.world.seller),ferry:near(scene.world.ferry),spot:!!scene.world.fishingSpot(scene.player.position),mode,panel});
  }
  function setVisible(value){visible=!!value;held=false;previousAction=false;fishing.setPaused(!visible);syncInput();}
  async function setService(next){
    if(!next||typeof next.getSnapshot!=='function'||next.isActive?.()===false)throw new GameError('AUTH_REQUIRED');
    if(pendingFinish)await pendingFinish;
    if(next.isActive?.()===false)throw new GameError('AUTH_REQUIRED');
    const snapshot=next.getSnapshot();cancelActive();unsubscribe();service=next;replaceScene(snapshot.lastIsland);bind();mode='lobby';panel=null;showCurrent();
  }
  bind();showCurrent();
  return{play,openPanel,closePanel,travel,dispatch,tick,setVisible,setService,handleFinish,getScene:()=>scene,getService:()=>service,getState:()=>({mode,panel,visible,busy:isBusy()}),dispose(){if(disposed)return;cancelActive();disposed=true;unsubscribe();scene.dispose();input.dispose();}};
}
