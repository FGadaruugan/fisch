import {createCharacter,disposeObject} from './models/character.js';

export function stepPlayerState(state,input={},seconds,world) {
  if(!Number.isFinite(seconds)||seconds<=0)return state;
  const dt=Math.min(seconds,0.05),x=Number.isFinite(input.moveX)?input.moveX:0,z=Number.isFinite(input.moveZ)?input.moveZ:0;
  const magnitude=Math.max(1,Math.hypot(x,z)),yaw=input.cameraYaw||0;
  const dx=(x*Math.cos(yaw)-z*Math.sin(yaw))/magnitude*5.5*dt;
  const dz=(-x*Math.sin(yaw)-z*Math.cos(yaw))/magnitude*5.5*dt;
  const oldX=state.position.x,oldZ=state.position.z;
  if(world.isWalkable(oldX+dx,oldZ+dz)){state.position.x+=dx;state.position.z+=dz;}
  else{if(world.isWalkable(oldX+dx,oldZ))state.position.x+=dx;if(world.isWalkable(state.position.x,oldZ+dz))state.position.z+=dz;}
  const movedX=state.position.x-oldX,movedZ=state.position.z-oldZ;state.speed=Math.hypot(movedX,movedZ)/dt;
  if(state.speed>0.02)state.yaw=Math.atan2(movedX,movedZ);
  const floor=world.heightAt(state.position.x,state.position.z);
  if(input.jumpPressed&&state.grounded){state.velocityY=7;state.grounded=false;}
  if(!state.grounded){state.velocityY-=20*dt;state.position.y+=state.velocityY*dt;if(state.position.y<=floor){state.position.y=floor;state.velocityY=0;state.grounded=true;}}
  else state.position.y=floor;
  return state;
}
export function createPlayer(THREE,world) {
  const character=createCharacter(THREE),position={...world.spawn};
  const state={position,velocityY:0,grounded:true,yaw:0,speed:0};
  let activeWorld=world;
  return{
    group:character.group,position,rodTip:character.rodTip,
    tick(input,dt,phase='idle'){stepPlayerState(state,input,dt,activeWorld);character.group.position.set(position.x,position.y,position.z);character.group.rotation.y=state.yaw;character.animate(dt,state.speed,phase);},
    reset(next){activeWorld=next;Object.assign(position,next.spawn);state.velocityY=0;state.grounded=true;state.yaw=0;character.group.position.set(position.x,position.y,position.z);},
    faceDirection(direction){state.yaw=Math.atan2(direction.x,direction.z);character.group.rotation.y=state.yaw;},
    getCameraPose(yaw,pitch,distance){const target={x:position.x,y:position.y+1.5,z:position.z};return{target,position:{x:target.x+Math.sin(yaw)*Math.cos(pitch)*distance,y:target.y+Math.sin(pitch)*distance,z:target.z+Math.cos(yaw)*Math.cos(pitch)*distance}};},
    dispose(){disposeObject(character.group);}
  };
}
