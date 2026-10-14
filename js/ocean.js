import {ISLANDS,GAME} from './data.js';
export function createOcean(T) {
  const uniforms={
    uTime:{value:0},uWave:{value:0.35},uDay:{value:1},uFog:{value:0.00045},uFogColor:{value:new T.Color('#b7dce0')},uSun:{value:new T.Vector3(0.5,0.7,0.3)},
    uCenters:{value:Object.values(ISLANDS).map(i=>new T.Vector4(i.center[0],i.center[1],i.radius,i.seed))}
  };
  const vertex=[
    'uniform float uTime; uniform float uWave; varying vec3 vWorld; varying vec3 vNormal;',
    'void main(){ vec3 p=position;',
    'p.y += (sin(p.x*.045+uTime*.65)+cos(p.z*.068+uTime*.5)*.65)*uWave;',
    'vNormal=normalize(vec3(-cos(p.x*.045+uTime*.65)*.045*uWave,1.,sin(p.z*.068+uTime*.5)*.0442*uWave));',
    'vWorld=(modelMatrix*vec4(p,1.)).xyz; gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.); }'
  ].join('\n');
  const fragment=[
    'uniform float uTime; uniform float uDay; uniform float uFog; uniform vec3 uFogColor; uniform vec3 uSun; uniform vec4 uCenters[3]; varying vec3 vWorld; varying vec3 vNormal;',
    'void main(){float shore=10000.;',
    'for(int i=0;i<3;i++){vec2 p=vWorld.xz-uCenters[i].xy;float a=atan(p.y,p.x);float r=uCenters[i].z*(1.+.045*sin(a*5.+uCenters[i].w)+.025*sin(a*9.-uCenters[i].w));shore=min(shore,length(p)-r);}',
    'vec3 V=normalize(cameraPosition-vWorld); vec3 N=normalize(vNormal);',
    'vec3 deep=vec3(.015,.20,.27);vec3 shallow=vec3(.22,.59,.54);vec3 color=mix(shallow,deep,smoothstep(0.,55.,shore));',
    'float fresnel=pow(1.-max(dot(N,V),0.),3.);color=mix(color,uFogColor*.80,fresnel*.62);',
    'float glitter=pow(max(dot(reflect(-normalize(uSun),N),V),0.),95.);color+=vec3(1.,.9,.67)*glitter*.75*uDay;',
    'float band=sin(shore*.8-uTime*1.2+sin(vWorld.x*.13)*.6);float foam=(1.-smoothstep(1.,6.,abs(shore)))*smoothstep(.42,.9,band);color=mix(color,vec3(.80,.91,.86),foam*.68);',
    'color*=.20+.80*uDay;float distanceFog=1.-exp(-pow(length(cameraPosition-vWorld)*uFog,2.));color=mix(color,uFogColor,distanceFog);',
    'gl_FragColor=vec4(color,.965);',
    '#include <tonemapping_fragment>',
    '#include <colorspace_fragment>',
    '}'
  ].join('\n');
  const geometry=new T.PlaneGeometry(GAME.oceanSize,GAME.oceanSize,128,128);geometry.rotateX(-Math.PI/2);
  const material=new T.ShaderMaterial({uniforms,vertexShader:vertex,fragmentShader:fragment,transparent:true,depthWrite:false});
  const mesh=new T.Mesh(geometry,material);mesh.position.y=0.3;mesh.renderOrder=1;
  return{mesh,update(time,day,sun,fogColor,fogDensity){uniforms.uTime.value=time;uniforms.uDay.value=day;uniforms.uSun.value.copy(sun);uniforms.uFogColor.value.copy(fogColor);uniforms.uFog.value=fogDensity;},setQuality(profile){uniforms.uWave.value=profile.id==='low'?0.18:0.35;},dispose(){geometry.dispose();material.dispose();}};
}
