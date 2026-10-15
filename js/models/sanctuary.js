import {createCharacter} from './character.js';
import {batchStaticMeshes} from './batching.js';

/** Static ruins share the terrain's collision columns and clearing coordinates. */
export function createSanctuary(T,model){
  const group=new T.Group(),cameraColliders=[];group.name='sanctuary-ruins';
  const stone=new T.MeshStandardMaterial({color:'#a0a58e',roughness:.95}),moss=new T.MeshStandardMaterial({color:'#5a8170',roughness:1}),gold=new T.MeshStandardMaterial({color:'#b8a771',roughness:.5,metalness:.25});
  const glow=new T.MeshStandardMaterial({color:'#bd9fe1',emissive:'#9776c2',emissiveIntensity:.6,roughness:.32});
  const mesh=(geometry,material,x,y,z)=>{const node=new T.Mesh(geometry,material);node.position.set(x,y,z);node.castShadow=true;node.receiveShadow=true;group.add(node);return node;};
  for(const arch of model.ruinArches){
    const x=model.center.x+arch.x,z=model.center.z+arch.z;
    const top=Math.max(model.heightAt(x-8,z),model.heightAt(x+8,z))+8;
    for(const sign of [-1,1]){
      const px=x+sign*8,y=model.heightAt(px,z),height=top-y;
      mesh(new T.BoxGeometry(3.6,.6,3.6),moss,px,y+.3,z);
      mesh(new T.BoxGeometry(2.8,height,2.8),stone,px,y+height/2,z);
      mesh(new T.BoxGeometry(3.6,.7,3.6),gold,px,top-.35,z);
      cameraColliders.push({min:{x:px-1.8,y:y-1,z:z-1.8},max:{x:px+1.8,y:top+.6,z:z+1.8}});
    }
    mesh(new T.BoxGeometry(20,1.6,4),stone,x,top+.6,z);
    mesh(new T.BoxGeometry(9,.25,4.2),moss,x-3,top+1.5,z);
    cameraColliders.push({min:{x:x-10,y:top-.2,z:z-2},max:{x:x+10,y:top+1.7,z:z+2}});
    for(let i=0;i<3;i++)mesh(new T.BoxGeometry(.35,.9,.12),gold,x+(i-1)*1.5,top+.6,z+2.04);
  }
  const p=model.secret;
  mesh(new T.CylinderGeometry(3.8,4.2,.3,24),stone,p.x,p.y+.04,p.z);
  const ring=mesh(new T.TorusGeometry(3.3,.08,6,40),gold,p.x,p.y+.23,p.z);ring.rotation.x=-Math.PI/2;
  const trader=createCharacter(T,{shirt:'#74618b',rod:false});trader.group.name='secret-trader';trader.group.position.set(p.x,p.y+.2,p.z);group.add(trader.group);batchStaticMeshes(T,trader.group,{recursive:true});
  const altarZ=p.z-5.5,altarY=model.heightAt(p.x,altarZ);
  mesh(new T.BoxGeometry(5,1.3,2.7),stone,p.x,altarY+.65,altarZ);
  mesh(new T.BoxGeometry(5.5,.25,3.1),gold,p.x,altarY+1.4,altarZ);
  for(let i=0;i<5;i++)mesh(new T.OctahedronGeometry(.25,0),glow,p.x+(i-2)*.85,altarY+2.05,altarZ);
  cameraColliders.push({min:{x:p.x-2.75,y:altarY,z:altarZ-1.55},max:{x:p.x+2.75,y:altarY+2.4,z:altarZ+1.55}});
  batchStaticMeshes(T,group);return{group,cameraColliders};
}
