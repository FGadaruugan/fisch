/**
 * Fisch Auto Catch v1.2.
 * Automates only the fishing simulation inside this website.
 */
export function createAutoCatch({fishing,fishPress,release,canStart=()=>true,isBusy=()=>false}) {
  let enabled=false;
  let pending=false;
  let previousHeld=false;

  function setHeld(value) {
    if(value===previousHeld)return;
    previousHeld=value;
    if(value) void fishPress();
    else release();
  }

  function start() {
    if(!canStart())return false;
    enabled=true;
    return true;
  }

  function stop() {
    enabled=false;
    pending=false;
    setHeld(false);
  }

  function toggle() {
    if(enabled){stop();return false;}
    return start();
  }

  function tick() {
    if(!enabled)return;
    const state=fishing.getView();

    switch(state.phase) {
      case 'idle':
        // Cast/finish requests briefly set the app busy while the simulation
        // is still idle. Wait for that request instead of cancelling the held
        // input or issuing another cast.
        if(isBusy())return;
        if(!canStart()) { stop(); return; }
        if(!pending) {
          pending=true;
          Promise.resolve()
            .then(()=>fishPress())
            .catch(()=>{})
            .finally(()=>{pending=false;});
        }
        break;
      case 'charging': setHeld(state.charge<0.98); break;
      case 'waiting': setHeld(false); break;
      case 'bite': setHeld(true); break;
      case 'reeling': setHeld(state.bar<state.target-0.025); break;
      case 'caught':
      case 'escaped': setHeld(false); break;
      default: setHeld(false);
    }
  }

  return {start,stop,toggle,tick,get enabled(){return enabled;}};
}
