import {ISLANDS} from './data.js';
import {createNavigationModel} from './navigation.js';
import {createWorld} from './world.js';
import {disposeObject} from './models/character.js';
export function createArchipelago(T,islandId,totalXp){
  const model=createNavigationModel({islandId,totalXp}),group=new T.Group(),full=new Map(),distant=new Map();let profile,settings;
  for(const meta of Object.values(ISLANDS)){
    const root=new T.Group();group.add(root);distant.set(meta.id,root);
    const material=new T.MeshStandardMaterial({color:meta.ground,roughness:1});
    const base=new T.Mesh(new T.CylinderGeometry(meta.radius*.92,meta.radius,7,40),material);base.position.set(meta.center[0],1.8,meta.center[1]);root.add(base);
    const peak=new T.Mesh(new T.ConeGeometry(meta.radius*.55,meta.biome==='alpine'?100:55,18),new T.MeshStandardMaterial({color:meta.rock,roughness:1}));peak.position.set(meta.center[0],25,meta.center[1]-15);root.add(peak);
    if(meta.biome==='alpine'){const snow=new T.Mesh(new T.ConeGeometry(meta.radius*.23,46,18),new T.MeshStandardMaterial({color:'#dde9e6',roughness:1}));snow.position.set(meta.center[0],73,meta.center[1]-15);root.add(snow);}
  }
  function stream(position){
    for(const meta of Object.values(ISLANDS)){
      const distance=Math.hypot(position.x-meta.center[0],position.z-meta.center[1]);let world=full.get(meta.id);
      if(!world&&distance<meta.radius+320){world=createWorld(T,meta.id,{distantIslands:false,decorativeBoat:false});full.set(meta.id,world);group.add(world.group);if(profile)world.setQuality(profile,settings);}
      if(world&&distance>meta.radius+460){group.remove(world.group);world.dispose();full.delete(meta.id);world=null;}
      distant.get(meta.id).visible=!world;
    }
  }
  stream(model.spawn);
  return{
    ...model,group,
    get islandId(){return model.islandId;},get meta(){return model.meta;},get center(){return model.center;},get radius(){return model.radius;},get spawn(){return model.spawn;},get seller(){return model.seller;},get ferry(){return model.ferry;},get secret(){return model.secret;},
    get loadedCount(){return full.size;},get cameraColliders(){return [...full.values()].flatMap(world=>world.cameraColliders);},
    setQuality(next,preferences){profile=next;settings=preferences;for(const world of full.values())world.setQuality(profile,settings);},
    update(dt,position){stream(position);for(const world of full.values())world.update(dt,position);},
    dispose(){disposeObject(group);full.clear();distant.clear();group.clear();}
  };
}
