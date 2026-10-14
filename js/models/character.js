export function disposeObject(group) {
  const geometries=new Set(),materials=new Set(),textures=new Set();
  group.traverse(node=>{if(node.geometry)geometries.add(node.geometry);for(const material of Array.isArray(node.material)?node.material:node.material?[node.material]:[]){materials.add(material);for(const value of Object.values(material))if(value?.isTexture)textures.add(value);}});
  textures.forEach(t=>t.dispose());materials.forEach(m=>m.dispose());geometries.forEach(g=>g.dispose());
}
export function createCharacter(T,{shirt='#276c71',rod=true}={}) {
  const group=new T.Group(),skin=new T.MeshStandardMaterial({color:'#d6a77d',roughness:0.8}),cloth=new T.MeshStandardMaterial({color:shirt,roughness:0.9}),pants=new T.MeshStandardMaterial({color:'#233e48',roughness:1}),boots=new T.MeshStandardMaterial({color:'#544636',roughness:1}),hatMat=new T.MeshStandardMaterial({color:'#dbc596',roughness:0.9});
  const mesh=(geometry,material,parent,x,y,z)=>{const m=new T.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=true;parent.add(m);return m;};
  mesh(new T.BoxGeometry(0.72,0.72,0.42),cloth,group,0,1.22,0);
  mesh(new T.BoxGeometry(0.06,0.55,0.025),hatMat,group,0,1.25,0.225);
  const head=mesh(new T.SphereGeometry(0.29,16,12),skin,group,0,1.86,0);head.scale.set(0.94,1,0.95);
  const eyeMat=new T.MeshStandardMaterial({color:'#18323b'});
  for(const x of [-0.105,0.105])mesh(new T.SphereGeometry(0.025,8,6),eyeMat,group,x,1.88,0.252);
  mesh(new T.SphereGeometry(0.047,8,6),skin,group,0,1.82,0.275);
  mesh(new T.CylinderGeometry(0.38,0.38,0.045,20),hatMat,group,0,2.075,0);
  mesh(new T.CylinderGeometry(0.26,0.30,0.16,16),hatMat,group,0,2.16,0);
  const band=mesh(new T.TorusGeometry(0.287,0.026,6,20),cloth,group,0,2.11,0);band.rotation.x=Math.PI/2;
  const legs=[],arms=[];
  for(const sign of [-1,1]){
    const leg=new T.Group();leg.position.set(sign*0.19,0.88,0);group.add(leg);legs.push(leg);
    mesh(new T.CapsuleGeometry(0.13,0.44,3,8),pants,leg,0,-0.31,0);
    mesh(new T.BoxGeometry(0.27,0.17,0.41),boots,leg,0,-0.78,0.07);
    const arm=new T.Group();arm.position.set(sign*0.44,1.51,0);group.add(arm);arms.push(arm);
    mesh(new T.CapsuleGeometry(0.105,0.3,3,8),cloth,arm,0,-0.21,0);
    mesh(new T.SphereGeometry(0.12,10,8),skin,arm,0,-0.49,0);
  }
  const rodGroup=new T.Group();rodGroup.position.set(0,-0.48,0.06);rodGroup.rotation.z=-0.13;arms[1].add(rodGroup);
  const rodMat=new T.MeshStandardMaterial({color:'#574634',roughness:0.6});
  mesh(new T.CylinderGeometry(0.012,0.028,2.1,8),rodMat,rodGroup,0,0.92,0);
  mesh(new T.CylinderGeometry(0.045,0.04,0.32,8),boots,rodGroup,0,0.02,0);
  const reel=mesh(new T.TorusGeometry(0.09,0.025,6,12),pants,rodGroup,0,-0.06,0.1);reel.rotation.y=Math.PI/2;
  const rodTip=new T.Object3D();rodTip.position.y=1.98;rodGroup.add(rodTip);rodGroup.visible=rod;
  let time=0;
  return{group,rodTip,animate(dt,speed,phase){time+=dt*Math.max(speed,0.5);const fishing=['charging','waiting','bite','reeling'].includes(phase);const swing=speed>0.1?Math.sin(time*2.5)*0.5:0;legs[0].rotation.x=swing;legs[1].rotation.x=-swing;arms[0].rotation.x=-swing*0.65;arms[1].rotation.x=fishing?-0.85+Math.sin(time*3)*0.04:0.1-swing*0.5;rodGroup.rotation.x=fishing?0.2:-0.15;}};
}
