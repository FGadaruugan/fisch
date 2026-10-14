import {FISH,RARITIES,RODS} from './data.js';
import {GameError} from './errors.js';

const ACTIVE=new Set(['charging','waiting','bite','reeling']);
const clamp=(value,min=0,max=1)=>Math.min(max,Math.max(min,value));

/** Renderer-free simulation, driven by elapsed seconds instead of display FPS. */
export function createFishingController({onFinish=()=>{}}={}) {
  let ticket=null,paused=false,held=false,finished=false,reelTime=0,targetDirection=1;
  let view=initial();
  function initial(){return{phase:'idle',charge:0,target:0.5,bar:0.5,width:0.24,progress:0,remaining:0,ticketId:null};}
  function finish(outcome){
    if(finished||!ticket)return;
    finished=true;held=false;view.phase=outcome;view.remaining=1.6;
    onFinish({ticketId:ticket.id,outcome});
  }
  return {
    start(next){
      if(ACTIVE.has(view.phase))throw new GameError('FISHING_BUSY');
      if(!FISH[next?.speciesId]||!RODS[next?.rodId])throw new GameError('INVALID_FISH');
      ticket={...next};held=true;finished=false;paused=false;reelTime=0;targetDirection=1;
      view={...initial(),phase:'charging',ticketId:ticket.id,width:RODS[ticket.rodId].width};
    },
    press(){
      held=true;
      if(view.phase==='bite'){view.phase='reeling';view.progress=0.28;view.remaining=20;view.bar=0.5;view.target=0.5;reelTime=0;}
    },
    release(){held=false;if(view.phase==='charging'){view.phase='waiting';view.remaining=ticket.waitSeconds;}},
    tick(seconds){
      if(paused||!Number.isFinite(seconds)||seconds<=0)return;
      const dt=Math.min(seconds,0.05);
      switch(view.phase){
        case 'charging':if(held)view.charge=clamp(view.charge+dt/1.2);break;
        case 'waiting':
          view.remaining=Math.max(0,view.remaining-dt);
          if(view.remaining<1e-9){view.phase='bite';view.remaining=ticket.biteSeconds;}
          break;
        case 'bite':view.remaining-=dt;if(view.remaining<=0)finish('escaped');break;
        case 'reeling':{
          const speed=RARITIES[FISH[ticket.speciesId].rarity].speed;
          view.target+=targetDirection*speed*dt;
          if(view.target>1){view.target=2-view.target;targetDirection=-1;}
          if(view.target<0){view.target=-view.target;targetDirection=1;}
          view.bar=clamp(view.bar+(held?0.55:-0.35)*dt,view.width/2,1-view.width/2);
          const overlap=Math.abs(view.bar-view.target)<=view.width/2;
          view.progress=clamp(view.progress+(overlap?0.15:-0.10)*dt);
          reelTime+=dt;view.remaining=Math.max(0,20-reelTime);
          if(view.progress>=1-1e-9)finish('caught');
          else if(view.progress<=0||reelTime>=20-1e-9)finish('escaped');
          break;
        }
        case 'caught':case 'escaped':
          view.remaining-=dt;
          if(view.remaining<=0){ticket=null;view=initial();}
          break;
      }
    },
    cancel(){ticket=null;held=false;finished=true;view=initial();},
    setPaused(value){paused=!!value;if(paused)held=false;},
    getView(){return{...view};},
    get active(){return ACTIVE.has(view.phase);}
  };
}
