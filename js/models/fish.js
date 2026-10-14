import {FISH,RARITIES} from '../data.js';
import {disposeObject} from './character.js';

/** Procedural fish families with species-specific colour, proportions and rarity accents. */
export function createFishModel(T,speciesId) {
  const fish=FISH[speciesId];if(!fish)throw new RangeError('Unknown species');
  const group=new T.Group(),visual=fish.visual,rare=['Mythic','???'].includes(fish.rarity);
  const skin=new T.MeshStandardMaterial({color:visual.color,roughness:0.32,metalness:0.16});
  const accent=new T.MeshStandardMaterial({color:visual.accent,roughness:0.42,metalness:0.08,emissive:rare?visual.accent:'#000000',emissiveIntensity:rare?0.28:0});
  const dark=new T.MeshStandardMaterial({color:'#162d36',roughness:0.35});
  const eyeWhite=new T.MeshStandardMaterial({color:'#eee9d9',roughness:0.3});
  const mesh=(geo,mat,x=0,y=0,z=0)=>{const m=new T.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;group.add(m);return m;};
  const sphere=(mat,x,y,z,sx,sy,sz)=>{const m=mesh(new T.SphereGeometry(1,20,12),mat,x,y,z);m.scale.set(sx,sy,sz);return m;};
  const fin=(points,mat,x,y,z)=>{const shape=new T.Shape();shape.moveTo(points[0][0],points[0][1]);points.slice(1).forEach(p=>shape.lineTo(p[0],p[1]));shape.closePath();return mesh(new T.ExtrudeGeometry(shape,{depth:0.025,bevelEnabled:false}),mat,x,y,z);};
  let tail=null,wings=[];
  if(visual.family==='eel'||visual.family==='serpent'){
    const length=visual.family==='serpent'?4.5:3.5;
    const curve=new T.CatmullRomCurve3(Array.from({length:9},(_,i)=>new T.Vector3(-length/2+i*length/8,Math.sin(i*0.9)*0.12,Math.sin(i*0.7)*0.12)));
    mesh(new T.TubeGeometry(curve,48,visual.family==='serpent'?0.23:0.14,10,false),skin);
    sphere(skin,length/2,0,0,0.39,0.28,0.32);
    for(let i=0;i<8;i++){const spike=mesh(new T.ConeGeometry(0.11,0.42,6),accent,-length/2+i*length/7,0.34,0);spike.rotation.z=-0.4;}
    if(visual.family==='serpent')for(const sign of [-1,1]){const horn=mesh(new T.ConeGeometry(0.12,0.65,6),accent,length/2,0.45,sign*0.18);horn.rotation.z=-0.5;}
  }else if(visual.family==='ray'){
    sphere(skin,0,0,0,0.8,0.16,0.62);
    for(const sign of [-1,1]){
      const g=new T.BufferGeometry();
      g.setAttribute('position',new T.Float32BufferAttribute([0.45,0,0,0.05,0.08,sign*1.7,-0.65,-0.06,sign*1.05,-0.55,0,0],3));
      g.setIndex(sign===1?[0,1,2,0,2,3]:[0,2,1,0,3,2]);g.computeVertexNormals();
      const wing=mesh(g,skin);wing.material.side=T.DoubleSide;wings.push(wing);
    }
    const curve=new T.CatmullRomCurve3([new T.Vector3(-0.5,0,0),new T.Vector3(-1.4,0.1,0.15),new T.Vector3(-2.5,0.05,0.3)]);
    tail=mesh(new T.TubeGeometry(curve,20,0.038,6,false),accent);
    sphere(accent,0.38,0.12,0,0.25,0.08,0.40);
  }else{
    const shark=visual.family==='shark'||visual.family==='leviathan';
    const long=visual.family==='pike'?1.55:shark?1.50:1.23;
    sphere(skin,0,0,0,long,0.43*visual.girth,0.40*visual.girth);
    sphere(accent,0,-0.15*visual.girth,0,long*0.95,0.25*visual.girth,0.36*visual.girth);
    tail=fin([[0,0],[-0.75,0.62],[-0.42,0],[-0.75,-0.58]],accent,-long+0.05,0,0);
    fin([[-0.5,0],[0.28,0],[0,shark?0.85:0.52]],skin,-0.05,0.34*visual.girth,0);
    for(const sign of [-1,1]){const side=fin([[0,0],[-0.6,-0.3],[0.12,-0.18]],accent,0.22,-0.12,sign*0.27*visual.girth);side.rotation.x=sign*0.85;}
    if(visual.family==='billfish'){const nose=mesh(new T.ConeGeometry(0.10,1.1,8),skin,long+0.37,0.03,0);nose.rotation.z=-Math.PI/2;}
    if(shark){for(let i=0;i<3;i++)mesh(new T.BoxGeometry(0.025,0.17,0.012),dark,0.48-i*0.09,-0.03,0.35*visual.girth);}
    if(visual.family==='koi')for(let i=0;i<5;i++)sphere(accent,-0.6+i*0.27,0.34,Math.sin(i*2)*0.22,0.13,0.06,0.10);
    if(visual.family==='leviathan')for(const sign of [-1,1]){const horn=mesh(new T.ConeGeometry(0.14,0.65,6),accent,0.95,0.52,sign*0.25);horn.rotation.z=-0.48;}
  }
  const headX=visual.family==='eel'?1.65:visual.family==='serpent'?2.18:visual.family==='ray'?0.55:['pike','shark','leviathan'].includes(visual.family)?1.25:1.02;
  const eyeZ=visual.family==='ray'?0.20:['eel','serpent'].includes(visual.family)?0.30:0.25*visual.girth;
  for(const sign of [-1,1]){sphere(eyeWhite,headX,0.13,sign*eyeZ,0.084,0.084,0.043);sphere(dark,headX+0.01,0.14,sign*(eyeZ+0.035),0.046,0.046,0.026);}
  const orbit=new T.Group();group.add(orbit);
  if(rare)for(let i=0;i<7;i++){const angle=i*Math.PI*2/7;const crystal=new T.Mesh(new T.OctahedronGeometry(0.065+0.025*(i%2)),accent);crystal.position.set(Math.cos(angle)*1.4,0.35+Math.sin(angle)*0.4,Math.sin(angle)*1.1);orbit.add(crystal);}
  let clock=0;
  group.userData.animate=dt=>{clock+=dt;if(tail)tail.rotation.z=Math.sin(clock*3.2)*0.10;wings.forEach((wing,i)=>wing.rotation.x=Math.sin(clock*2.6+i*Math.PI)*0.075);orbit.rotation.y=clock*0.5;};
  group.userData.speciesId=speciesId;group.userData.rarityColor=RARITIES[fish.rarity].color;
  return{group,animate:dt=>group.userData.animate(dt),dispose:()=>disposeObject(group)};
}

/** Trusted catalogue-only SVG icons; profile names never enter markup. */
export function fishIcon(speciesId) {
  const f=FISH[speciesId];if(!f)return'';
  const c=f.visual.color,a=f.visual.accent,ray=f.visual.family==='ray',eel=['eel','serpent'].includes(f.visual.family);
  const body=ray?'<path d="M28 35 Q45 1 92 35 Q44 64 28 35Z" fill="'+c+'"/><path d="M30 35L8 45" stroke="'+a+'" stroke-width="3"/>':eel?'<path d="M18 42 Q35 15 52 38 T91 32" fill="none" stroke="'+c+'" stroke-width="15" stroke-linecap="round"/>':'<path d="M28 34L10 19V49Z" fill="'+a+'"/><ellipse cx="58" cy="34" rx="32" ry="'+(13*f.visual.girth)+'" fill="'+c+'"/><path d="M49 22L59 8L67 22Z" fill="'+a+'"/>';
  const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 112 70">'+body+'<circle cx="81" cy="29" r="4" fill="#f7f4e9"/><circle cx="82" cy="29" r="2" fill="#16333e"/></svg>';
  return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
}
