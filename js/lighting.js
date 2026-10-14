import {seededRandom} from './terrain.js';
export function createLighting(T,scene) {
  const group=new T.Group(),skyGroup=new T.Group();group.add(skyGroup);
  const uniforms={uDay:{value:1},uTop:{value:new T.Color('#5799b0')},uHorizon:{value:new T.Color('#cae7e2')}};
  const skyMat=new T.ShaderMaterial({uniforms,side:T.BackSide,depthWrite:false,vertexShader:'varying vec3 vDirection; void main(){ vDirection=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',fragmentShader:[
    'uniform float uDay;uniform vec3 uTop;uniform vec3 uHorizon;varying vec3 vDirection;',
    'void main(){float h=normalize(vDirection).y;vec3 daylight=mix(uHorizon,uTop,smoothstep(-.05,.85,h));vec3 night=mix(vec3(.025,.06,.10),vec3(.006,.015,.05),smoothstep(0.,1.,h));gl_FragColor=vec4(mix(night,daylight,uDay),1.);',
    '#include <colorspace_fragment>',
    '}'
  ].join('\n')});
  const sky=new T.Mesh(new T.SphereGeometry(1000,24,16),skyMat);sky.renderOrder=-100;sky.frustumCulled=false;skyGroup.add(sky);
  const sunVisual=new T.Mesh(new T.SphereGeometry(19,16,12),new T.MeshBasicMaterial({color:'#ffe6af',toneMapped:false}));sunVisual.renderOrder=-90;skyGroup.add(sunVisual);
  const moonVisual=new T.Mesh(new T.SphereGeometry(13,12,10),new T.MeshBasicMaterial({color:'#d0e5f8',toneMapped:false}));skyGroup.add(moonVisual);
  const random=seededRandom(7091),positions=[];
  for(let i=0;i<440;i++){const az=random()*Math.PI*2,h=0.12+random()*0.88,ring=Math.sqrt(1-h*h);positions.push(Math.cos(az)*ring*940,h*940,Math.sin(az)*ring*940);}
  const starsGeo=new T.BufferGeometry();starsGeo.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  const stars=new T.Points(starsGeo,new T.PointsMaterial({color:'#dceefe',size:1.75,sizeAttenuation:false,transparent:true,depthWrite:false}));skyGroup.add(stars);
  const hemisphere=new T.HemisphereLight('#c6e9ef','#767753',2.1);group.add(hemisphere);
  const sun=new T.DirectionalLight('#ffe0ac',2.8),moon=new T.DirectionalLight('#a1c7f3',0.35);group.add(sun,moon,sun.target,moon.target);
  sun.shadow.camera.left=-40;sun.shadow.camera.right=40;sun.shadow.camera.top=40;sun.shadow.camera.bottom=-40;sun.shadow.camera.near=1;sun.shadow.camera.far=250;sun.shadow.normalBias=0.045;sun.shadow.bias=-0.00008;sun.shadow.camera.updateProjectionMatrix();
  const clouds=new T.InstancedMesh(new T.SphereGeometry(1,8,6),new T.MeshLambertMaterial({color:'#e7f4ed',transparent:true,opacity:0.86,depthWrite:false}),100),dummy=new T.Object3D();
  for(let i=0;i<100;i++){dummy.position.set((random()*2-1)*1600,140+random()*100,(random()*2-1)*1600);dummy.scale.set(14+random()*18,3+random()*4,7+random()*10);dummy.updateMatrix();clouds.setMatrixAt(i,dummy.matrix);}
  clouds.instanceMatrix.needsUpdate=true;group.add(clouds);scene.add(group);
  const sunDirection=new T.Vector3(),fogColor=new T.Color();
  return{
    sunDirection,fogColor,
    update(time,hour,position,camera,settings){
      const angle=(hour-6)/24*Math.PI*2;sunDirection.set(Math.cos(angle)*0.75,Math.sin(angle),0.32).normalize();
      const day=Math.min(1,Math.max(0,(sunDirection.y+0.12)/0.4));
      uniforms.uDay.value=day;fogColor.copy(uniforms.uHorizon.value).multiplyScalar(0.10+0.90*day);
      sun.intensity=day*2.8;moon.intensity=(1-day)*0.5;hemisphere.intensity=0.35+day*1.75;
      sun.castShadow=settings.shadows&&day>0.05;
      sun.position.set(position.x+sunDirection.x*100,position.y+sunDirection.y*100,position.z+sunDirection.z*100);sun.target.position.set(position.x,position.y,position.z);
      moon.position.set(position.x-sunDirection.x*100,position.y+70,position.z-sunDirection.z*100);moon.target.position.copy(sun.target.position);
      skyGroup.position.copy(camera.position);skyGroup.scale.setScalar(camera.far*0.91/1000);
      sunVisual.position.copy(sunDirection).multiplyScalar(920);sunVisual.visible=sunDirection.y>-0.1;
      moonVisual.position.copy(sunDirection).multiplyScalar(-915);moonVisual.visible=day<0.8;
      stars.visible=day<0.5;stars.material.opacity=(1-day)*0.85;clouds.position.x=Math.sin(time*0.007)*110;clouds.material.opacity=0.4+day*0.42;
      return day;
    },
    setQuality(profile){const size=profile.shadowSize;if(sun.shadow.mapSize.x!==size){sun.shadow.map?.dispose();sun.shadow.map=null;sun.shadow.mapSize.set(size,size);}clouds.count=Math.max(30,Math.floor(100*profile.density));},
    setBiome(meta){uniforms.uHorizon.value.set(meta.sky);uniforms.uTop.value.set(meta.biome==='alpine'?'#6493b2':meta.biome==='coral'?'#6c9db3':'#529ead');},
    dispose(){scene.remove(group);sky.geometry.dispose();skyMat.dispose();starsGeo.dispose();stars.material.dispose();clouds.geometry.dispose();clouds.material.dispose();sunVisual.geometry.dispose();sunVisual.material.dispose();moonVisual.geometry.dispose();moonVisual.material.dispose();sun.shadow.map?.dispose();}
  };
}
