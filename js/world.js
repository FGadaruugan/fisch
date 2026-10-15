import {ISLANDS} from './data.js';
import {createTerrainModel,seededRandom,smooth} from './terrain.js';
import {createCharacter,disposeObject} from './models/character.js';
import {batchStaticMeshes} from './models/batching.js';

function chunkGeometry(T,model,x0,z0,size,cells){
  const positions=[],colors=[],indices=[],sand=new T.Color(model.meta.sand),grass=new T.Color(model.meta.ground),rock=new T.Color(model.meta.rock),snow=new T.Color('#e7f1ed');
  for(let z=0;z<=cells;z++)for(let x=0;x<=cells;x++){
    const px=x0+x/cells*size,pz=z0+z/cells*size,h=model.heightAt(model.center.x+px,model.center.z+pz);
    positions.push(px-x0-size/2,h,pz-z0-size/2);
    const distance=Math.hypot(px,pz)/model.coastRadius(Math.atan2(pz,px));
    const color=sand.clone().lerp(grass,1-smooth(0.84,0.99,distance)).lerp(rock,smooth(22,45,h));
    if(model.meta.biome==='alpine')color.lerp(snow,smooth(8,32,h)*0.8+0.15);
    color.multiplyScalar(0.96+0.04*Math.sin(px*0.31+pz*0.19));colors.push(color.r,color.g,color.b);
  }
  for(let z=0;z<cells;z++)for(let x=0;x<cells;x++){const a=z*(cells+1)+x,b=a+1,c=a+cells+1,d=c+1;indices.push(a,c,b,b,c,d);}
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.setIndex(indices);geo.computeVertexNormals();geo.computeBoundingSphere();return geo;
}
function label(T,text){
  if(!globalThis.document)return null;
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=96;const c=canvas.getContext('2d');if(!c)return null;
  c.fillStyle='rgba(15,48,55,.82)';c.beginPath();c.roundRect(4,4,504,88,24);c.fill();
  c.fillStyle='#f2ebd9';c.font='600 34px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(text,256,48);
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
  const sprite=new T.Sprite(new T.SpriteMaterial({map:texture,transparent:true,depthWrite:false}));sprite.scale.set(6.5,1.22,1);return sprite;
}
export function createWorld(T,islandId,{distantIslands=true,decorativeBoat=true}={}) {
  const model=createTerrainModel(islandId),group=new T.Group(),lods=[],instances=[],random=seededRandom(model.meta.seed),matrix=new T.Matrix4(),dummy=new T.Object3D();
  const material=(color,options={})=>new T.MeshStandardMaterial({color,roughness:0.9,...options});
  const terrainMat=material('#ffffff',{vertexColors:true});
  const extent=model.radius*1.12,cellSize=extent*2/8;
  for(let z=0;z<8;z++)for(let x=0;x<8;x++){
    const lod=new T.LOD(),gx=-extent+x*cellSize,gz=-extent+z*cellSize;
    for(const [resolution,distance]of [[16,0],[6,300]]){
      const m=new T.Mesh(chunkGeometry(T,model,gx,gz,cellSize,resolution),terrainMat);m.castShadow=true;m.receiveShadow=true;lod.addLevel(m,distance);
    }
    lod.position.set(model.center.x+gx+cellSize/2,0,model.center.z+gz+cellSize/2);group.add(lod);lods.push(lod);
  }
  const mesh=(geometry,mat,x,y,z)=>{const m=new T.Mesh(geometry,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;group.add(m);return m;};
  const wood=material('#927550'),trim=material('#d9c8a4'),darkWood=material('#5b5345'),roofMat=material(model.meta.biome==='coral'?'#b76e55':model.meta.biome==='alpine'?'#5d8293':'#6b9290');
  const cx=model.center.x,cz=model.center.z,r=model.radius;
  mesh(new T.BoxGeometry(9,0.24,r*0.43),wood,cx,2.06,cz+r*1.015);
  const planks=new T.InstancedMesh(new T.BoxGeometry(8.8,0.035,r*0.43/37),trim,36);
  for(let i=0;i<36;i++){matrix.makeTranslation(cx,2.18,cz+r*0.80+(i+0.5)*r*0.43/36);planks.setMatrixAt(i,matrix);}
  planks.receiveShadow=true;planks.castShadow=true;group.add(planks);
  for(const sign of [-1,1]){mesh(new T.BoxGeometry(0.13,0.15,r*0.29),darkWood,cx+sign*4.1,3.08,cz+r*1.085);for(let i=0;i<9;i++)mesh(new T.CylinderGeometry(0.13,0.17,4.4,8),darkWood,cx+sign*4.1,1.1,cz+r*(0.81+i*0.051));}
  const cameraColliders=[],wallMat=material(model.meta.biome==='coral'?'#d29c83':model.meta.biome==='alpine'?'#b7c8c9':'#9bb9a3');
  const windowMat=material('#f0d895',{emissive:'#c8a662',emissiveIntensity:0.30});
  for(const [x,z,w,d]of model.buildings){
    const y=model.heightAt(cx+x,cz+z);
    mesh(new T.BoxGeometry(w,4.5,d),wallMat,cx+x,y+2.1,cz+z);
    const roof=mesh(new T.ConeGeometry(Math.max(w,d)*0.82,3.8,4),roofMat,cx+x,y+6.1,cz+z);roof.rotation.y=Math.PI/4;roof.scale.z=d/w;
    mesh(new T.BoxGeometry(1.6,2.7,0.14),darkWood,cx+x,y+1.35,cz+z+d/2+0.06);
    for(const side of [-1,1])mesh(new T.BoxGeometry(1.3,1.3,0.12),windowMat,cx+x+side*w*0.3,y+2.6,cz+z+d/2+0.07);
    cameraColliders.push({min:{x:cx+x-w/2,y:y-1,z:cz+z-d/2},max:{x:cx+x+w/2,y:y+8,z:cz+z+d/2}});
  }
  const merchant=createCharacter(T,{shirt:'#c5a175',rod:false});merchant.group.position.set(model.seller.x,model.seller.y,model.seller.z);merchant.group.rotation.y=0.7;group.add(merchant.group);
  const merchantLabel=label(T,'Худалдаачин');if(merchantLabel){merchantLabel.position.set(model.seller.x,model.seller.y+3.35,model.seller.z);group.add(merchantLabel);}
  const ferryman=createCharacter(T,{shirt:'#567f98',rod:false});ferryman.group.position.set(model.ferry.x,model.ferry.y,model.ferry.z);group.add(ferryman.group);
  batchStaticMeshes(T,merchant.group,{recursive:true});batchStaticMeshes(T,ferryman.group,{recursive:true});
  const ferryLabel=label(T,'Завь дуудах');if(ferryLabel){ferryLabel.position.set(model.ferry.x,model.ferry.y+3.35,model.ferry.z);group.add(ferryLabel);}
  for(const p of [model.seller,model.ferry]){const ring=new T.Mesh(new T.RingGeometry(1.6,1.85,32),new T.MeshBasicMaterial({color:'#e8d59f',transparent:true,opacity:0.45,side:T.DoubleSide,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.position.set(p.x,p.y+0.035,p.z);group.add(ring);}
  const boat=new T.Group();boat.visible=decorativeBoat;boat.position.set(cx+14,0.7,cz+r*1.01);group.add(boat);
  const boatMesh=(g,m,x,y,z)=>{const node=new T.Mesh(g,m);node.position.set(x,y,z);node.castShadow=true;boat.add(node);return node;};
  boatMesh(new T.BoxGeometry(4.1,1.2,8),material('#477d8c'),0,0,0);
  const bow=boatMesh(new T.ConeGeometry(2.05,3.1,4),material('#477d8c'),0,0,5.05);bow.rotation.x=Math.PI/2;bow.rotation.z=Math.PI/4;
  boatMesh(new T.BoxGeometry(3.8,0.22,7.6),trim,0,0.74,0);
  boatMesh(new T.BoxGeometry(2.6,2.6,3.4),material('#e6dfcb'),0,2,-1);
  boatMesh(new T.BoxGeometry(3.1,0.25,3.8),roofMat,0,3.42,-1);
  boatMesh(new T.BoxGeometry(2,1,0.06),material('#3c6679',{metalness:0.2,roughness:0.3}),0,2.4,0.75);

  function instance(geometry,mat,count,transforms,colors=null,shadow=true){
    const m=new T.InstancedMesh(geometry,mat,count);m.castShadow=shadow;m.receiveShadow=true;m.userData.baseCount=count;
    for(let i=0;i<count;i++){const p=transforms[i];dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(p.rx||0,p.ry||0,p.rz||0);dummy.scale.set(p.sx||1,p.sy||1,p.sz||1);dummy.updateMatrix();m.setMatrixAt(i,dummy.matrix);if(colors)m.setColorAt(i,colors[i]);}
    m.instanceMatrix.needsUpdate=true;m.computeBoundingSphere();instances.push(m);group.add(m);return m;
  }
  const trees=[],rocks=[],grass=[];
  let tries=0;
  while(trees.length<560&&tries++<12000){
    const x=cx+(random()*2-1)*r,z=cz+(random()*2-1)*r,h=model.heightAt(x,z),lx=x-cx,lz=z-cz;
    if(!model.isWalkable(x,z)||model.onPier(x,z)||h<2.1||h>58||(Math.abs(lx)<13&&lz>0)||model.buildings.some(([bx,bz,w,d])=>Math.abs(lx-bx)<w&&Math.abs(lz-bz)<d))continue;
    trees.push({x,z,h,size:0.65+random()*0.75,angle:random()*Math.PI*2});
  }
  const trunks=trees.map(p=>({x:p.x,y:p.h+3*p.size,z:p.z,sx:0.26*p.size,sy:6*p.size,sz:0.26*p.size}));
  instance(new T.CylinderGeometry(0.8,1,1,7),material('#77634c'),trunks.length,trunks);
  if(model.meta.biome==='tropical'){
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute([0,0,0,0.7,0.7,0.55,2.6,0.95,0.4,4.4,0,0,2.6,0.9,-0.4,0.7,0.7,-0.55],3));geo.setIndex([0,1,2,0,2,3,0,3,4,0,4,5]);geo.computeVertexNormals();
    const leaves=[];for(const p of trees)for(let i=0;i<5;i++)leaves.push({x:p.x,y:p.h+6*p.size,z:p.z,ry:p.angle+i*Math.PI*2/5,sx:p.size,sy:p.size,sz:p.size});
    instance(geo,material('#4c8454',{side:T.DoubleSide}),leaves.length,leaves);
  }else if(model.meta.biome==='alpine'){
    const crowns=trees.map(p=>({x:p.x,y:p.h+7.4*p.size,z:p.z,sx:p.size*2.1,sy:p.size*6.6,sz:p.size*2.1}));
    instance(new T.ConeGeometry(1,1,9),material('#5d7a70'),crowns.length,crowns);
    const caps=trees.map(p=>({x:p.x,y:p.h+8*p.size,z:p.z,sx:p.size*1.8,sy:p.size*5.9,sz:p.size*1.8}));
    instance(new T.ConeGeometry(1,1,9),material('#d7e5de'),caps.length,caps);
  }else{
    const crowns=trees.map(p=>({x:p.x,y:p.h+6*p.size,z:p.z,sx:p.size*2.4,sy:p.size*1.2,sz:p.size*2.4}));
    instance(new T.IcosahedronGeometry(1,1),material('#a3a269'),crowns.length,crowns);
  }
  for(let i=0;i<1700;i++){
    const x=cx+(random()*2-1)*r,z=cz+(random()*2-1)*r,h=model.heightAt(x,z);
    if(!model.isWalkable(x,z)||model.onPier(x,z)||h<1.5)continue;
    if(i<420){const size=0.6+random()*2.1;rocks.push({x,y:h+size*0.35,z,sx:size,sy:size*(0.45+random()*0.5),sz:size*0.9,ry:random()*6.28});}
    else if(h<30)grass.push({x,y:h,z,sx:0.35+random()*0.4,sy:0.4+random()*0.8,sz:0.4,ry:random()*6.28});
  }
  instance(new T.DodecahedronGeometry(1,0),material(model.meta.rock),rocks.length,rocks);
  if(model.meta.biome!=='alpine')instance(new T.ConeGeometry(0.8,1.3,3),material(model.meta.biome==='coral'?'#b39b69':'#76965f',{side:T.DoubleSide}),grass.length,grass,null,false);
  if(distantIslands)for(const meta of Object.values(ISLANDS)){
    if(meta.id===islandId)continue;
    const m=mesh(new T.CylinderGeometry(meta.radius*0.9,meta.radius,8,48),material(meta.ground),meta.center[0],2,meta.center[1]);
    m.castShadow=false;
    const hill=mesh(new T.ConeGeometry(meta.radius*0.55,meta.biome==='alpine'?100:55,18),material(meta.rock),meta.center[0],25,meta.center[1]-15);hill.castShadow=false;
    if(meta.biome==='alpine'){const snow=mesh(new T.ConeGeometry(meta.radius*0.23,46,18),material('#dde9e6'),meta.center[0],73,meta.center[1]-15);snow.castShadow=false;}
  }
  const particlesCount=240,particlePositions=new Float32Array(particlesCount*3);
  for(let i=0;i<particlesCount;i++){particlePositions[i*3]=(random()*2-1)*32;particlePositions[i*3+1]=random()*25;particlePositions[i*3+2]=(random()*2-1)*32;}
  const particlesGeo=new T.BufferGeometry();particlesGeo.setAttribute('position',new T.BufferAttribute(particlePositions,3));
  const particles=new T.Points(particlesGeo,new T.PointsMaterial({color:model.meta.biome==='alpine'?'#edfaff':'#e6ce8b',size:model.meta.biome==='alpine'?0.09:0.055,transparent:true,opacity:0.55,depthWrite:false}));particles.frustumCulled=false;group.add(particles);
  batchStaticMeshes(T,boat);batchStaticMeshes(T,group);
  let time=0;
  return{
    ...model,group,cameraColliders,
    setQuality(profile,settings){for(const lod of lods)lod.levels[1].distance=profile.lodDistance;for(const m of instances)m.count=Math.floor(m.userData.baseCount*profile.density);particles.visible=settings.particles;particles.geometry.setDrawRange(0,Math.floor(particlesCount*profile.density));},
    update(dt,position){time+=dt;boat.position.y=0.65+Math.sin(time*0.8)*0.15;boat.rotation.z=Math.sin(time*0.65)*0.025;particles.position.set(position.x,position.y,position.z);const a=particlePositions;for(let i=0;i<particlesCount;i++){a[i*3+1]-=dt*(model.meta.biome==='alpine'?1.1:0.08);if(a[i*3+1]<0)a[i*3+1]=25;}particlesGeo.attributes.position.needsUpdate=true;},
    dispose(){disposeObject(group);}
  };
}
