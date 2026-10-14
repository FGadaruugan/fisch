/** Tiny synthesized cues, unlocked by a real user gesture. No external audio assets. */
export function createAudio(getVolume) {
  let context=null;
  function unlock(){try{const C=globalThis.AudioContext||globalThis.webkitAudioContext;if(!C)return;if(!context)context=new C();void context.resume().catch(()=>{});}catch{}}
  function tone(frequency,duration=0.12,delay=0){
    if(!context||context.state!=='running'||getVolume()<=0)return;
    const osc=context.createOscillator(),gain=context.createGain(),t=context.currentTime+delay;
    osc.type='sine';osc.frequency.setValueAtTime(frequency,t);gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(getVolume()*0.10,t+0.015);gain.gain.exponentialRampToValueAtTime(0.0001,t+duration);osc.connect(gain);gain.connect(context.destination);osc.start(t);osc.stop(t+duration+0.02);osc.onended=()=>{osc.disconnect();gain.disconnect();};
  }
  return{
    unlock,
    phase(next){if(next==='waiting')tone(290,0.15);if(next==='bite'){tone(650,0.10);tone(870,0.12,0.12);}if(next==='escaped')tone(210,0.2);},
    catch(){tone(523,0.17);tone(659,0.17,0.13);tone(784,0.23,0.26);},
    suspend(){if(context)void context.suspend().catch(()=>{});},
    resume(){if(context)void context.resume().catch(()=>{});},
    dispose(){if(context)void context.close().catch(()=>{});}
  };
}
