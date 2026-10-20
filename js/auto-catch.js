/**
 * Fisch Auto Catch v1.1.
 * Automates only the fishing simulation inside this website.
 */
export function createAutoCatch({fishing,fishPress,release,canStart=()=>true}) {
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

    // canStart includes transient busy state (startCast/finishCast). Only
    // apply it while idle; otherwise the cast request itself releases input
    // before the charging phase can begin.
    if(state.phase==='idle'&&!canStart()) {
      setHeld(false);
      return;
    }

    switch(state.phase) {
      case 'idle':
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
