const editable=target=>target?.isContentEditable||['INPUT','TEXTAREA','SELECT'].includes(target?.tagName);
export function createInput({window:win=globalThis.window,canvas,joystick,action,jump,interact}={}) {
  const listeners=[],keys=new Set(),pointers=new Map();let enabled=false,actionPointer=null,joystickPointer=null,pinchDistance=null;
  let stick={x:0,y:0},edges={},lookX=0,lookY=0,zoom=0,actionHeld=false;
  const thumb=joystick?.querySelector?.('[data-thumb]');
  const bind=(target,type,fn,options)=>{if(!target?.addEventListener)return;target.addEventListener(type,fn,options);listeners.push(()=>target.removeEventListener(type,fn,options));};
  const capture=(target,event)=>{try{target?.setPointerCapture?.(event.pointerId);}catch{}};
  function releaseAll(){keys.clear();pointers.clear();actionPointer=null;joystickPointer=null;pinchDistance=null;stick={x:0,y:0};edges={};lookX=0;lookY=0;zoom=0;actionHeld=false;if(thumb)thumb.style.transform='translate(0, 0)';}
  bind(win,'keydown',event=>{
    if(!enabled||editable(event.target)||event.ctrlKey||event.metaKey||event.altKey)return;
    const code=event.code||event.key;const allowed=['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','KeyF','KeyE','KeyB','Escape','ShiftLeft'];
    if(!allowed.includes(code))return;event.preventDefault();keys.add(code);
    if(code==='KeyF')actionHeld=true;
    if(!event.repeat){if(code==='Space')edges.jumpPressed=true;if(code==='KeyE')edges.interactPressed=true;if(code==='KeyB')edges.backpackPressed=true;if(code==='Escape')edges.cancelPressed=true;}
  });
  bind(win,'keyup',event=>{keys.delete(event.code||event.key);if((event.code||event.key)==='KeyF')actionHeld=actionPointer!==null;});
  bind(win,'blur',releaseAll);
  bind(action,'pointerdown',event=>{if(!enabled)return;event.preventDefault();capture(action,event);actionPointer=event.pointerId;actionHeld=true;});
  bind(action,'keydown',event=>{if(enabled&&['Space','Enter'].includes(event.code)){event.preventDefault();event.stopPropagation();actionHeld=true;}});
  bind(action,'keyup',event=>{if(['Space','Enter'].includes(event.code)){event.preventDefault();actionHeld=false;}});
  bind(jump,'pointerdown',event=>{if(enabled){event.preventDefault();edges.jumpPressed=true;}});
  bind(interact,'pointerdown',event=>{if(enabled){event.preventDefault();edges.interactPressed=true;}});
  function updateStick(event){const r=joystick.getBoundingClientRect(),radius=Math.min(r.width,r.height)*0.38;let x=(event.clientX-r.left-r.width/2)/radius,y=(event.clientY-r.top-r.height/2)/radius;const d=Math.hypot(x,y);if(d>1){x/=d;y/=d;}stick=d<0.12?{x:0,y:0}:{x,y};if(thumb)thumb.style.transform=`translate(${x*radius}px, ${y*radius}px)`;}
  bind(joystick,'pointerdown',event=>{if(!enabled||joystickPointer!==null)return;event.preventDefault();joystickPointer=event.pointerId;capture(joystick,event);updateStick(event);});
  bind(canvas,'pointerdown',event=>{if(!enabled||event.button>0)return;event.preventDefault();capture(canvas,event);pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});pinchDistance=null;});
  bind(win,'pointermove',event=>{
    if(!enabled)return;
    if(event.pointerId===joystickPointer){updateStick(event);return;}
    const previous=pointers.get(event.pointerId);if(!previous)return;
    const next={x:event.clientX,y:event.clientY};pointers.set(event.pointerId,next);
    if(pointers.size>=2){const [a,b]=[...pointers.values()];const d=Math.hypot(a.x-b.x,a.y-b.y);if(pinchDistance!==null)zoom+=pinchDistance-d;pinchDistance=d;}
    else{lookX+=next.x-previous.x;lookY+=next.y-previous.y;}
  });
  function pointerEnd(event){
    if(event.pointerId===actionPointer){actionPointer=null;actionHeld=keys.has('KeyF');}
    if(event.pointerId===joystickPointer){joystickPointer=null;stick={x:0,y:0};if(thumb)thumb.style.transform='translate(0, 0)';}
    pointers.delete(event.pointerId);pinchDistance=null;
  }
  bind(win,'pointerup',pointerEnd);bind(win,'pointercancel',pointerEnd);bind(action,'lostpointercapture',pointerEnd);bind(joystick,'lostpointercapture',pointerEnd);
  bind(canvas,'wheel',event=>{if(enabled){event.preventDefault();zoom+=event.deltaY;}},{passive:false});
  bind(canvas,'contextmenu',event=>event.preventDefault());
  return{
    getSnapshot(){
      const x=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0)+stick.x;
      const z=(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-stick.y;
      const magnitude=Math.max(1,Math.hypot(x,z));
      const result={moveX:enabled?x/magnitude:0,moveZ:enabled?z/magnitude:0,actionHeld:enabled&&actionHeld,jumpPressed:!!edges.jumpPressed,interactPressed:!!edges.interactPressed,backpackPressed:!!edges.backpackPressed,cancelPressed:!!edges.cancelPressed,lookDeltaX:lookX,lookDeltaY:lookY,zoomDelta:zoom};
      edges={};lookX=0;lookY=0;zoom=0;return result;
    },
    releaseAll,
    setEnabled(value){enabled=!!value;releaseAll();},
    dispose(){releaseAll();listeners.forEach(remove=>remove());listeners.length=0;}
  };
}
