import {normalizeSettings,QUALITY_LEVELS,createAdaptiveQuality,createPerformanceMonitor} from './performance.js';
import {createOcean} from './ocean.js';
import {createLighting} from './lighting.js';

export function createGraphics(T,canvas,rawSettings={},onQuality=()=>{}) {
  let settings=normalizeSettings(rawSettings),hour=settings.timeOfDay,time=0,world=null;
  const mobile=globalThis.matchMedia?.('(pointer: coarse)')?.matches??false;
  const adaptive=createAdaptiveQuality(mobile?1:2),monitor=createPerformanceMonitor();
  const renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.shadowMap.type=T.PCFShadowMap;
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(62,1,0.08,settings.viewDistance);
  const ocean=createOcean(T),lighting=createLighting(T,scene);scene.add(ocean.mesh);
  let quality=QUALITY_LEVELS[adaptive.level];
  function applyQuality() {
    const index=settings.quality==='auto'?adaptive.level:QUALITY_LEVELS.findIndex(p=>p.id===settings.quality);
    quality=QUALITY_LEVELS[Math.max(0,index)];
    const dpr=globalThis.devicePixelRatio||1;renderer.setPixelRatio(Math.min(dpr,quality.pixelRatio)*settings.renderScale);
    renderer.shadowMap.enabled=settings.shadows;renderer.toneMappingExposure=settings.exposure;
    camera.far=settings.viewDistance;camera.updateProjectionMatrix();
    lighting.setQuality(quality);ocean.setQuality(quality);world?.setQuality(quality,settings);onQuality(quality);
    resize();
  }
  function resize(){const width=Math.max(1,canvas.clientWidth||globalThis.innerWidth||1),height=Math.max(1,canvas.clientHeight||globalThis.innerHeight||1);renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();}
  function applySettings(partial) {const next=normalizeSettings({...settings,...partial});if(Object.hasOwn(partial,'timeOfDay'))hour=next.timeOfDay;settings=next;applyQuality();}
  applyQuality();
  return{
    scene,camera,renderer,
    get settings(){return{...settings};},get profile(){return quality;},get hour(){return hour;},get time(){return time;},
    applySettings,resize,
    setWorld(next){world=next;lighting.setBiome(next.meta);world.setQuality(quality,settings);},
    update(dt,position){
      time+=dt;if(settings.dayCycle)hour=(hour+dt*0.035)%24;
      const day=lighting.update(time,hour,position,camera,settings);
      const density=settings.fog?1.0/settings.viewDistance*0.8:0;
      if(settings.fog){if(!scene.fog)scene.fog=new T.FogExp2(lighting.fogColor,density);scene.fog.color.copy(lighting.fogColor);scene.fog.density=density;}
      else scene.fog=null;
      renderer.setClearColor(lighting.fogColor);ocean.update(time,day,lighting.sunDirection,lighting.fogColor,density);
      if(settings.quality==='auto'){const old=adaptive.level;adaptive.tick(monitor.getSnapshot(),dt,settings.targetFps);if(old!==adaptive.level)applyQuality();}
    },
    observeRaf:now=>monitor.observeRaf(now),
    render(now){const before=performance.now();renderer.render(scene,camera);monitor.rendered(now,performance.now()-before,renderer.info.render);},
    getStats(){return{...monitor.getSnapshot(),quality:quality.label,targetFps:settings.targetFps,pixelRatio:renderer.getPixelRatio(),hour};},
    resetMonitor(){monitor.reset();},
    dispose(){ocean.dispose();lighting.dispose();renderer.dispose();}
  };
}
