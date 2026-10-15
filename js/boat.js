import {WATER_LEVEL} from './navigation.js';
import {disposeObject} from './models/character.js';
export function createBoatState(position){return{position:{x:position.x,y:WATER_LEVEL,z:position.z},yaw:0,speed:0,riding:false};}
function clearHull(state,x,z,yaw,world){
  const sin=Math.sin(yaw),cos=Math.cos(yaw);
  for(const [forward,width]of [[-4.6,2.8],[-1,2.8],[2.5,2.8],[4.5,1.8],[6,.3]])for(const side of [-width,0,width])if(!world.canSail(x+sin*forward+cos*side,z+cos*forward-sin*side))return false;
  return true;
}
export function stepBoatState(state,input={},seconds,world){
  if(!Number.isFinite(seconds)||seconds<=0||input.freeze)return state;
  const dt=Math.min(seconds,.05),throttle=Math.min(1,Math.max(-1,Number.isFinite(input.moveZ)?input.moveZ:0)),steer=Math.min(1,Math.max(-1,Number.isFinite(input.moveX)?input.moveX:0));
  state.speed=Math.max(-8,Math.min(24,state.speed+throttle*8*dt));
  if(Math.abs(throttle)<.05){const drag=3.2*dt;state.speed=Math.abs(state.speed)<=drag?0:state.speed-Math.sign(state.speed)*drag;}
  const yaw=state.yaw-steer*(.4+Math.min(1,Math.abs(state.speed)/24))*(state.speed<-.1?-1:1)*dt;
  if(clearHull(state,state.position.x,state.position.z,yaw,world))state.yaw=yaw;
  const count=Math.max(1,Math.ceil(Math.abs(state.speed*dt)/.5)),distance=state.speed*dt/count;
  for(let i=0;i<count;i++){
    const x=state.position.x+Math.sin(state.yaw)*distance,z=state.position.z+Math.cos(state.yaw)*distance;
    if(!clearHull(state,x,z,state.yaw,world)){state.speed=0;break;}
    state.position.x=x;state.position.z=z;
  }
  state.position.y=WATER_LEVEL;return state;
}
export function boatExitPosition(state,world){
  const candidates=[];
  for(const side of [1,-1])for(const along of [0,-2,2]){
    const x=state.position.x+Math.cos(state.yaw)*side*4.8+Math.sin(state.yaw)*along,z=state.position.z-Math.sin(state.yaw)*side*4.8+Math.cos(state.yaw)*along;
    if(world.canOccupy(x,z)){const floor=world.heightAt(x,z);candidates.push({x,z,y:floor>WATER_LEVEL+.3?floor:WATER_LEVEL-1.1});}
  }
  return candidates.find(p=>p.y>WATER_LEVEL+.3)||candidates[0]||null;
}
export function createBoatModel(T){
  const group=new T.Group(),hull=new T.Group();group.add(hull);
  const mat=(color,options={})=>new T.MeshStandardMaterial({color,roughness:.7,...options});
  const blue=mat('#3e7b87'),wood=mat('#b09160'),trim=mat('#ead7aa'),dark=mat('#31454c'),metal=mat('#aebcb6',{metalness:.6,roughness:.4});
  const mesh=(geometry,material,x,y,z)=>{const node=new T.Mesh(geometry,material);node.position.set(x,y,z);node.castShadow=true;node.receiveShadow=true;hull.add(node);return node;};
  const outline=[[-2,-4],[2,-4],[2.4,2.6],[1.4,4.5],[0,5.5],[-1.4,4.5],[-2.4,2.6]],vertices=[],indices=[];
  for(const y of [-.55,.72])for(const [x,z]of outline)vertices.push(x*(y<0?.7:1),y,z*(y<0?.85:1));
  for(let i=0;i<outline.length;i++){const j=(i+1)%outline.length,n=outline.length;indices.push(i,i+n,j,j,i+n,j+n);}
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);geometry.computeVertexNormals();
  mesh(geometry,blue,0,0,0);const deckShape=new T.Shape();outline.forEach(([x,z],i)=>i?deckShape.lineTo(x,-z):deckShape.moveTo(x,-z));deckShape.closePath();const deckGeometry=new T.ShapeGeometry(deckShape);deckGeometry.rotateX(-Math.PI/2);mesh(deckGeometry,wood,0,.72,0);
  for(const z of [-2.3,.5,3])mesh(new T.BoxGeometry(z===3?2.2:3.8,.23,.65),trim,0,.96,z);
  for(const side of [-1,1]){mesh(new T.BoxGeometry(.14,.23,6.9),trim,side*2,.85,-.3);mesh(new T.BoxGeometry(.12,.8,.12),metal,side*1.8,1.25,-.9);}
  mesh(new T.BoxGeometry(1.2,1.1,.65),blue,0,1.3,.9);
  const wheel=mesh(new T.TorusGeometry(.32,.045,6,16),dark,0,1.99,.55);wheel.rotation.x=-.5;
  mesh(new T.BoxGeometry(.65,1.2,.65),dark,0,.18,-4.3);mesh(new T.BoxGeometry(.2,.9,.2),metal,0,-.7,-4.3);
  const wake=new T.Mesh(new T.RingGeometry(2.4,3,32),new T.MeshBasicMaterial({color:'#d9f4e9',transparent:true,opacity:.25,depthWrite:false,side:T.DoubleSide}));wake.rotation.x=-Math.PI/2;wake.position.set(0,.06,-6);wake.scale.set(.8,2.5,1);group.add(wake);
  let time=0;
  return{group,update(state,dt,paused=false){time+=dt;group.position.set(state.position.x,WATER_LEVEL,state.position.z);group.rotation.y=state.yaw;hull.position.y=Math.sin(time*1.5)*.08;hull.rotation.z=Math.sin(time*1.1)*.018;wake.visible=!paused&&Math.abs(state.speed)>1;wake.material.opacity=Math.min(.4,Math.abs(state.speed)/60);},dispose(){disposeObject(group);}};
}
