import {createArchipelago} from './archipelago.js';
import {createPlayer} from './player.js';
import {createFishingRig} from './fishing-rig.js';
import {createBoatState,stepBoatState,boatExitPosition,createBoatModel} from './boat.js';
import {destinationInfo} from './navigation.js';
function cameraCollision(world,target,desired){
  let fraction=1;
  for(const box of world.cameraColliders){
    let near=0,far=1;
    for(const key of ['x','y','z']){
      const d=desired[key]-target[key];
      if(Math.abs(d)<1e-7){if(target[key]<box.min[key]||target[key]>box.max[key]){near=2;break;}}
      else{const a=(box.min[key]-target[key])/d,b=(box.max[key]-target[key])/d;near=Math.max(near,Math.min(a,b));far=Math.min(far,Math.max(a,b));}
    }
    if(near<=far&&near>.03&&near<1)fraction=Math.min(fraction,Math.max(.15,near-.035));
  }
  desired.lerpVectors(target,desired,fraction);desired.y=Math.max(desired.y,world.heightAt(desired.x,desired.z)+.65,1.3);return desired;
}
export function createVoyageScene(T,{islandId,totalXp,graphics}){
  const world=createArchipelago(T,islandId,totalXp),player=createPlayer(T,world),rig=createFishingRig(T,player),vessel=createBoatModel(T),root=new T.Group();
  const dock=()=>({x:world.center.x+10,z:world.center.z+world.radius*1.19}),boat=createBoatState(dock());
  root.add(world.group,vessel.group,player.group,rig.group);graphics.scene.add(root);graphics.setWorld(world);
  let yaw=Math.PI,pitch=.38,distance=12,clock=0;const target=new T.Vector3(),desired=new T.Vector3();
  graphics.camera.position.set(world.center.x+world.radius*.55,30,world.center.z+world.radius*1.4);
  const canBoard=()=>!boat.riding&&Math.hypot(player.position.x-boat.position.x,player.position.z-boat.position.z)<8;
  const canRecall=()=>!boat.riding&&Math.hypot(player.position.x-world.ferry.x,player.position.z-world.ferry.z)<7;
  return{
    world,player,rig,boat,
    setAccess:world.setAccess,
    setIsland(id){world.setIsland(id);graphics.setWorld(world);},
    interact(){
      if(boat.riding){const exit=boatExitPosition(boat,world);if(!exit)return{code:'BOAT_EXIT_BLOCKED'};boat.riding=false;boat.speed=0;player.setPosition(exit);return{motion:player.motion};}
      if(canBoard()){boat.riding=true;boat.speed=0;player.setPosition({...boat.position,y:1.25},true);return{motion:'sailing'};}
      if(canRecall()){Object.assign(boat,createBoatState(dock()));return{code:'BOAT_READY'};}
      return null;
    },
    getNavigation(destination){return{position:{...player.position},heading:((180-(boat.riding?boat.yaw:player.group.rotation.y)*180/Math.PI)%360+360)%360,motion:player.motion,speed:boat.riding?Math.abs(boat.speed):0,sailing:boat.riding,canBoard:canBoard(),canRecall:canRecall(),destination,route:destinationInfo(player.position,destination),location:world.islandAt(player.position,24)?.id||null};},
    update(input,dt,fishing,mode){
      clock+=dt;
      if(mode==='play'){
        yaw-=(input.lookDeltaX||0)*.005;pitch=Math.max(.15,Math.min(1.05,pitch+(input.lookDeltaY||0)*.005));distance=Math.max(5,Math.min(20,distance+(input.zoomDelta||0)*.018));
        if(boat.riding){const before=boat.yaw;stepBoatState(boat,input,dt,world);yaw+=boat.yaw-before;player.setPosition({...boat.position,y:1.25},true);player.faceDirection({x:Math.sin(boat.yaw),z:Math.cos(boat.yaw)});}
        player.tick({...input,cameraYaw:yaw},dt,fishing.phase);
        if(['charging','waiting','bite','reeling'].includes(fishing.phase)){const spot=world.fishingSpot(player.position);if(spot)player.faceDirection(spot.direction);}
        const pose=player.getCameraPose(yaw,pitch,boat.riding?Math.max(16,distance*1.45):distance);target.set(pose.target.x,pose.target.y,pose.target.z);desired.set(pose.position.x,pose.position.y,pose.position.z);cameraCollision(world,target,desired);
      }else{
        player.tick({freeze:true},dt,'idle');target.set(world.center.x,8,world.center.z+world.radius*.52);desired.set(world.center.x+world.radius*(.48+Math.sin(clock*.07)*.12),31,world.center.z+world.radius*1.4);
      }
      graphics.camera.position.lerp(desired,dt?1-Math.exp(-dt*7):1);graphics.camera.lookAt(target);
      world.update(dt,player.position);vessel.update(boat,dt,input.freeze||mode!=='play');rig.update(dt,fishing,graphics.time,graphics.profile);
    },
    dispose(){graphics.scene.remove(root);rig.dispose();player.dispose();vessel.dispose();world.dispose();}
  };
}
