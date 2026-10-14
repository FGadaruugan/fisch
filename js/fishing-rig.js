import {createFishModel} from './models/fish.js';
import {disposeObject} from './models/character.js';
export function createFishingRig(T,player) {
  const group=new T.Group(),positions=new Float32Array(6),geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.BufferAttribute(positions,3));
  const line=new T.Line(geometry,new T.LineBasicMaterial({color:'#eee7c6',transparent:true,opacity:0.7}));line.frustumCulled=false;group.add(line);
  const bobber=new T.Group();group.add(bobber);
  const body=new T.Mesh(new T.SphereGeometry(0.13,12,8),new T.MeshStandardMaterial({color:'#eec567',roughness:0.35}));body.scale.y=1.35;bobber.add(body);
  const top=new T.Mesh(new T.SphereGeometry(0.095,10,6),new T.MeshStandardMaterial({color:'#e97564'}));top.position.y=0.1;bobber.add(top);
  const ripple=new T.Mesh(new T.RingGeometry(0.43,0.48,32),new T.MeshBasicMaterial({color:'#e8faf4',transparent:true,opacity:0.5,side:T.DoubleSide,depthWrite:false}));ripple.rotation.x=-Math.PI/2;group.add(ripple);
  let spot=null,time=0,phase='idle',castTime=0,catchModel=null,catchTime=0;
  const tip=new T.Vector3(),end=new T.Vector3();
  function clearCatch(){if(catchModel){group.remove(catchModel.group);catchModel.dispose();catchModel=null;}}
  return{
    group,
    setSpot(next){spot=next?{...next}:null;},
    showCatch(caught){clearCatch();catchModel=createFishModel(T,caught.speciesId);const scale=0.8+Math.min(0.65,Math.log10(caught.weightGrams/1000+1)*0.25);catchModel.group.scale.setScalar(scale);group.add(catchModel.group);catchTime=0;},
    update(dt,view,worldTime,profile){
      time+=dt;
      const active=['charging','waiting','bite','reeling'].includes(view.phase)&&spot;
      line.visible=!!active&&view.phase!=='charging';bobber.visible=line.visible;ripple.visible=line.visible;
      if(view.phase!==phase){if(view.phase==='waiting')castTime=0;phase=view.phase;}
      if(active&&view.phase!=='charging'){
        castTime+=dt;player.rodTip.getWorldPosition(tip);
        const wave=profile?.id==='low'?0.18:0.35;
        end.set(spot.x,0.35+(Math.sin(spot.x*0.045+worldTime*0.65)+Math.cos(spot.z*0.068+worldTime*0.5)*0.65)*wave,spot.z);
        const t=Math.min(1,castTime/0.32);end.lerpVectors(tip,end,t);end.y+=Math.sin(t*Math.PI)*6;
        positions.set([tip.x,tip.y,tip.z,end.x,end.y,end.z]);geometry.attributes.position.needsUpdate=true;
        bobber.position.copy(end);bobber.scale.setScalar(view.phase==='bite'?1.4:1);ripple.position.set(end.x,end.y-0.09,end.z);ripple.scale.setScalar(0.5+(time%1.5));ripple.material.opacity=view.phase==='bite'?0.8:Math.max(0,0.4-(time%1.5)*0.22);
      }
      if(catchModel){catchTime+=dt;const p=player.position;catchModel.group.position.set(p.x,p.y+2.2+Math.sin(catchTime*2)*0.08,p.z+1.3);catchModel.group.rotation.y=Math.sin(catchTime*0.7)*0.28;catchModel.animate(dt);if(catchTime>3.8)clearCatch();}
    },
    dispose(){clearCatch();disposeObject(group);}
  };
}
