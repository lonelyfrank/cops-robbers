import * as THREE from 'three';
import { MAX_CROSSINGS, getMultiplier } from './gameMath.js';
import { formatMultiplier } from './ui.js';
import { CityStream } from './cityStream.js';
import { disposeTileSharedAssets } from './cityTile.js';
import { getCrossingX, getStopX, MAIN_ROAD_Z, sirenPulse } from './mapLayout.js';

export { CROSSING_SPACING, getCrossingX, getStopX } from './mapLayout.js';

export function createSceneManager(canvas,container) {
  const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.6));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.24;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  const scene=new THREE.Scene();scene.background=new THREE.Color(0x06132c);
  scene.fog=new THREE.FogExp2(0x06132c,.0065);
  const camera=new THREE.OrthographicCamera(-40,40,20,-20,.1,190);
  const focus=new THREE.Vector3(0,1.1,1.1),cameraOffset=new THREE.Vector3(-29,33,37);
  // Cool ambient light keeps adjacent streets readable; the warm key marks the active district.
  scene.add(new THREE.HemisphereLight(0x779edc,0x161e36,.56));
  const rim=new THREE.DirectionalLight(0x809edb,.3);rim.position.set(4,18,-12);scene.add(rim);
  // One warm key for the occupied tile. All other lights are fixed, reused pools.
  const key=new THREE.SpotLight(0xffd5a5,1950,65,.9,1,2);
  key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.near=2;key.shadow.camera.far=70;
  key.shadow.normalBias=.055;key.shadow.bias=-.00008;scene.add(key,key.target);
  const warmLights=Array.from({length:4},()=>{const light=new THREE.PointLight(0xffb458,0,11,2);scene.add(light);return light;});
  const signalLight=new THREE.PointLight(0xffba39,0,9,2);scene.add(signalLight);
  const captureLights=Array.from({length:2},()=>{const light=new THREE.PointLight(0x286bff,0,23,2);scene.add(light);return light;});
  const stream=new CityStream(scene,{reducedMotion});
  const indicator=new THREE.Mesh(new THREE.RingGeometry(.67,.79,4),new THREE.MeshBasicMaterial({color:0xd6efae,transparent:true,opacity:.6,side:THREE.DoubleSide,depthWrite:false}));
  indicator.rotation.x=-Math.PI/2;indicator.rotation.z=Math.PI/4;scene.add(indicator);
  // A road marking between the four crosswalks, with normal scene occlusion.
  const multiplierCanvas=document.createElement('canvas');multiplierCanvas.width=1024;multiplierCanvas.height=512;
  const multiplierContext=multiplierCanvas.getContext('2d');
  const multiplierTexture=new THREE.CanvasTexture(multiplierCanvas);multiplierTexture.colorSpace=THREE.SRGBColorSpace;
  const roadMultiplier=new THREE.Mesh(new THREE.PlaneGeometry(5.2,2.6),new THREE.MeshBasicMaterial({map:multiplierTexture,transparent:true,depthWrite:false,toneMapped:false}));
  roadMultiplier.name='road-multiplier';roadMultiplier.rotation.x=-Math.PI/2;roadMultiplier.visible=false;scene.add(roadMultiplier);
  const flash=document.getElementById('police-flash'),streetCaption=document.getElementById('street-caption');
  let targetCrossing=1,multiplierText='';
  let width=1,height=1,followX=getStopX(0),thief=null,phase='idle',lastCaption='',captureTime=0;
  function resize() {
    width=Math.max(1,container.clientWidth);height=Math.max(1,container.clientHeight);
    const aspect=width/height,viewHeight=Math.max(34,40/aspect);
    camera.left=-viewHeight*aspect/2;camera.right=viewHeight*aspect/2;camera.top=viewHeight/2;camera.bottom=-viewHeight/2;
    camera.updateProjectionMatrix();renderer.setSize(width,height,false);
  }
  const observer=new ResizeObserver(resize);observer.observe(container);resize();
  function setPhase(value) {
    if(value==='caught'&&phase!=='caught')captureTime=0;
    phase=value;
    if(['idle','running','ready','escaping'].includes(value))stream.setCaught(false);
    else if(value==='caught')stream.setCaught(true);
    // Keep blue capture flashes through a losing result, until replay/reset.
  }
  function reset() {
    stream.reset();followX=getStopX(0);focus.set(0,1.1,1.1);phase='idle';captureTime=0;camera.zoom=1;camera.updateProjectionMatrix();
    captureLights.forEach(light=>{light.intensity=0;});if(flash)flash.style.opacity='0';
  }
  function setCrossingTarget(s) {
    targetCrossing=Math.min(s.crossing+1,MAX_CROSSINGS);
    roadMultiplier.visible=s.crossing<MAX_CROSSINGS&&!['escaping','result'].includes(s.phase);
    const text=`${formatMultiplier(getMultiplier(targetCrossing,s.difficulty))}×`;
    if(text!==multiplierText) {
      multiplierText=text;
      multiplierContext.clearRect(0,0,1024,512);
      multiplierContext.font='bold 360px Arial, sans-serif';
      multiplierContext.textAlign='center';multiplierContext.textBaseline='middle';
      multiplierContext.fillStyle='#c9f57a';
      multiplierContext.fillText(text,512,256,940);
      multiplierTexture.needsUpdate=true;
    }
  }
  function updateRoadMultiplier() {
    const tile=stream.tiles.get(targetCrossing)?.tile;
    roadMultiplier.position.set(getCrossingX(targetCrossing),.16+(tile?.root.position.y??0),MAIN_ROAD_Z);
    roadMultiplier.material.opacity=tile?.reveal??0;
    const caption=`TRATTO ${String(stream.current).padStart(2,'0')} / ${MAX_CROSSINGS} · ${stream.caught?'SIRENE ALLE SPALLE':'VIA DELLA FUGA'}`;
    if(caption!==lastCaption){streetCaption.textContent=caption;lastCaption=caption;}
  }
  function update(dt,elapsed) {
    if(thief)stream.setPlayerX(thief.position.x);
    stream.update(dt);
    const occupiedX=getCrossingX(stream.current),lightX=stream.lighting.focusX.value,capture=stream.lighting.capture.value;
    // Camera movement is continuous; district roles change at the road connector.
    const factor=reducedMotion?1:1-Math.exp(-dt*7.5);
    focus.x+=((stream.caught&&thief?thief.position.x:followX)+4.7-focus.x)*factor;
    const zoomTarget=stream.caught&&!reducedMotion?1.08:1;
    const zoom=camera.zoom+(zoomTarget-camera.zoom)*factor;
    if(Math.abs(zoom-camera.zoom)>.00001){camera.zoom=zoom;camera.updateProjectionMatrix();}
    camera.position.copy(focus).add(cameraOffset);camera.lookAt(focus);camera.updateMatrixWorld();
    key.position.set(lightX-3,23,1);key.target.position.set(lightX,0,0);
    key.intensity=1950*(1-.85*capture);
    const offsets=[[-7,-1.3],[7,-.5],[-6,MAIN_ROAD_Z+3.3],[6,MAIN_ROAD_Z+3.3]];
    for(let i=0;i<warmLights.length;i++) {
      warmLights[i].position.set(lightX+offsets[i][0],2.9,offsets[i][1]);
      warmLights[i].intensity=26*(1-.85*capture);
    }
    const signal=stream.activeTile.signal;
    signalLight.position.set(occupiedX+3.72,2.8,MAIN_ROAD_Z-3.1);
    signalLight.color.set(signal==='green'?0x8bff7e:signal==='red'?0xff365b:0xffbd3f);
    signalLight.intensity=signal==='off'?0:13;
    const caught=stream.caught;
    if(caught)captureTime+=dt;
    const pulse=sirenPulse(captureTime,reducedMotion);
    captureLights[0].position.set(occupiedX-5,3.5,MAIN_ROAD_Z-1);
    captureLights[1].position.set(occupiedX+4,4,MAIN_ROAD_Z+2);
    captureLights[0].intensity=caught?340*pulse:0;
    captureLights[1].intensity=caught?225*sirenPulse(captureTime,reducedMotion,1):0;
    if(flash)flash.style.opacity=caught?String(reducedMotion ? .09 : .035+pulse*.22):'0';
    if(thief) {
      indicator.visible=thief.visible&&thief.position.y<1.5;
      indicator.position.set(thief.position.x,.143,thief.position.z);
      indicator.material.color.set(caught?0x6aa5ff:0xc9ef9b);
      indicator.material.opacity=reducedMotion ? .55 : .43+Math.sin(elapsed*2)*.1;
    }
    updateRoadMultiplier();renderer.render(scene,camera);
  }
  function dispose() {
    observer.disconnect();stream.dispose();disposeTileSharedAssets();
    const geometries=new Set(),materials=new Set();
    scene.traverse(object=>{if(object.geometry)geometries.add(object.geometry);if(object.material)(Array.isArray(object.material)?object.material:[object.material]).forEach(m=>materials.add(m));});
    geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());multiplierTexture.dispose();renderer.dispose();
    if(flash)flash.style.opacity='0';
  }
  reset();
  return {scene,camera,renderer,stream,reducedMotion,reset,update,dispose,setPhase,setCrossingTarget,
    setMovement:n=>stream.setMovement(n),setThief:root=>{thief=root;},follow:x=>{followX=x;}};
}
