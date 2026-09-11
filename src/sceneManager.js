import * as THREE from 'three';
import { getMultiplier } from './gameMath.js';
import { MAX_CROSSINGS } from './config/gameplay.js';
import { formatMultiplier } from './format.js';
import { CityStream } from './cityStream.js';
import { retainVoxelAssets } from './voxelModels.js';
import { getCrossingX, getStopX, MAIN_ROAD_Z, sirenPulse } from './mapLayout.js';
import { CAMERA, CAPTURE, LIGHTING, RENDERER } from './config/rendering.js';

export function createSceneManager(canvas, container, { motion = { reduced: false } } = {}) {
  let disposed = false;
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: RENDERER.antialias,
    alpha: false,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, RENDERER.pixelRatio));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = RENDERER.exposure;
  renderer.shadowMap.enabled = RENDERER.shadows;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const releaseVoxelAssets = retainVoxelAssets();
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(RENDERER.background);
  scene.fog = new THREE.FogExp2(RENDERER.background, RENDERER.fogDensity);
  const camera = new THREE.OrthographicCamera(-40, 40, 20, -20, 0.1, 190);
  const focus = new THREE.Vector3(0, 1.1, 1.1),
    cameraOffset = new THREE.Vector3(...CAMERA.offset);
  // Cool ambient light keeps adjacent streets readable; the warm key marks the active district.
  scene.add(
    new THREE.HemisphereLight(LIGHTING.ambientSky, LIGHTING.ambientGround, LIGHTING.ambientPower),
  );
  const rim = new THREE.DirectionalLight(LIGHTING.rimColor, LIGHTING.rimPower);
  rim.position.set(4, 18, -12);
  scene.add(rim);
  // One warm key for the occupied tile. All other lights are fixed, reused pools.
  const key = new THREE.SpotLight(
    LIGHTING.keyColor,
    LIGHTING.keyPower,
    LIGHTING.keyRange,
    LIGHTING.keyAngle,
    1,
    2,
  );
  key.castShadow = true;
  key.shadow.mapSize.set(LIGHTING.shadowSize, LIGHTING.shadowSize);
  key.shadow.camera.near = 2;
  key.shadow.camera.far = LIGHTING.shadowFar;
  key.shadow.normalBias = LIGHTING.shadowNormalBias;
  key.shadow.bias = LIGHTING.shadowBias;
  scene.add(key, key.target);
  const warmLights = Array.from({ length: 4 }, () => {
    const light = new THREE.PointLight(LIGHTING.warmColor, 0, LIGHTING.warmRange, 2);
    scene.add(light);
    return light;
  });
  const signalLight = new THREE.PointLight(0xffba39, 0, LIGHTING.signalRange, 2);
  scene.add(signalLight);
  const captureLights = Array.from({ length: 2 }, () => {
    const light = new THREE.PointLight(CAPTURE.color, 0, CAPTURE.range, 2);
    scene.add(light);
    return light;
  });
  const stream = new CityStream(scene, { reducedMotion: motion.reduced });
  const indicator = new THREE.Mesh(
    new THREE.RingGeometry(0.67, 0.79, 4),
    new THREE.MeshBasicMaterial({
      color: 0xd6efae,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  indicator.rotation.x = -Math.PI / 2;
  indicator.rotation.z = Math.PI / 4;
  scene.add(indicator);
  // A road marking between the four crosswalks, with normal scene occlusion.
  const multiplierCanvas = document.createElement('canvas');
  multiplierCanvas.width = 1024;
  multiplierCanvas.height = 512;
  const multiplierContext = multiplierCanvas.getContext('2d');
  const multiplierTexture = new THREE.CanvasTexture(multiplierCanvas);
  multiplierTexture.colorSpace = THREE.SRGBColorSpace;
  const roadMultiplier = new THREE.Mesh(
    new THREE.PlaneGeometry(5.2, 2.6),
    new THREE.MeshBasicMaterial({
      map: multiplierTexture,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  roadMultiplier.name = 'road-multiplier';
  roadMultiplier.rotation.x = -Math.PI / 2;
  // Keep the decal on the asphalt, with its baseline parallel to the camera's right axis.
  roadMultiplier.rotation.z = Math.atan2(cameraOffset.x, cameraOffset.z);
  roadMultiplier.visible = false;
  scene.add(roadMultiplier);
  const flash = document.getElementById('police-flash');
  let targetCrossing = 1,
    multiplierText = '';
  let width = 1,
    height = 1,
    followX = getStopX(0),
    thief = null;
  function resize() {
    width = Math.max(1, container.clientWidth);
    height = Math.max(1, container.clientHeight);
    const aspect = width / height,
      // A tighter crop fills the CCTV monitor while retaining the isometric camera angle.
      viewHeight = Math.max(CAMERA.monitorViewHeight, CAMERA.monitorMinViewWidth / aspect);
    camera.left = (-viewHeight * aspect) / 2;
    camera.right = (viewHeight * aspect) / 2;
    camera.top = viewHeight / 2;
    camera.bottom = -viewHeight / 2;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  }
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  resize();
  function setPhase(value) {
    if (['idle', 'running', 'ready', 'escaping'].includes(value)) stream.setCaught(false);
    else if (value === 'caught') stream.setCaught(true);
    // Keep blue capture flashes through a losing result, until replay/reset.
  }
  function reset(themeId = stream.theme.id) {
    stream.reset(themeId);
    key.color.set(stream.theme.keyColor);
    warmLights.forEach((light, i) =>
      light.color.set(i % 2 ? stream.theme.accentColor : stream.theme.warmColor),
    );
    followX = getStopX(0);
    focus.set(0, 1.1, 1.1);
    camera.zoom = 1;
    camera.updateProjectionMatrix();
    captureLights.forEach((light) => {
      light.intensity = 0;
    });
    if (flash) flash.style.opacity = '0';
  }
  function setCrossingTarget(s) {
    targetCrossing = Math.min(s.crossing + 1, MAX_CROSSINGS);
    roadMultiplier.visible =
      s.crossing < MAX_CROSSINGS && !['escaping', 'result'].includes(s.phase);
    const text = `${formatMultiplier(getMultiplier(targetCrossing, s.difficulty))}×`;
    if (text !== multiplierText) {
      multiplierText = text;
      multiplierContext.clearRect(0, 0, 1024, 512);
      multiplierContext.font = 'bold 360px Arial, sans-serif';
      multiplierContext.textAlign = 'center';
      multiplierContext.textBaseline = 'middle';
      multiplierContext.fillStyle = '#c9f57a';
      multiplierContext.fillText(text, 512, 256, 940);
      multiplierTexture.needsUpdate = true;
    }
  }
  function updateRoadMultiplier() {
    const tile = stream.tiles.get(targetCrossing)?.tile;
    roadMultiplier.position.set(
      getCrossingX(targetCrossing),
      0.16 + (tile?.root.position.y ?? 0),
      MAIN_ROAD_Z,
    );
    roadMultiplier.material.opacity = tile?.reveal ?? 0;
  }

  function update(dt, elapsed) {
    if (disposed) return;
    const reducedMotion = motion.reduced;
    stream.reducedMotion = reducedMotion;
    if (thief) stream.setPlayerX(thief.position.x);
    stream.update(dt);
    const occupiedX = getCrossingX(stream.current),
      lightX = stream.lighting.focusX.value,
      capture = stream.lighting.capture.value;
    // Camera movement is continuous; district roles change at the road connector.
    const factor = reducedMotion ? 1 : 1 - Math.exp(-dt * CAMERA.response);
    focus.x +=
      ((stream.caught && thief ? thief.position.x : followX) + CAMERA.focusAhead - focus.x) *
      factor;
    const zoomTarget = stream.caught && !reducedMotion ? CAMERA.captureZoom : 1;
    const zoom = camera.zoom + (zoomTarget - camera.zoom) * factor;
    if (Math.abs(zoom - camera.zoom) > 0.00001) {
      camera.zoom = zoom;
      camera.updateProjectionMatrix();
    }
    camera.position.copy(focus).add(cameraOffset);
    camera.lookAt(focus);
    camera.updateMatrixWorld();
    key.position.set(lightX - 3, 23, 1);
    key.target.position.set(lightX, 0, 0);
    key.intensity = stream.theme.keyPower * (1 - CAPTURE.dimming * capture);
    const offsets = LIGHTING.warmOffsets;
    for (let i = 0; i < warmLights.length; i++) {
      warmLights[i].position.set(
        lightX + offsets[i][0],
        stream.theme.fillHeight ?? LIGHTING.warmHeight,
        offsets[i][1],
      );
      warmLights[i].intensity =
        (stream.theme.fillPower ?? LIGHTING.warmPower) * (1 - CAPTURE.dimming * capture);
    }
    const signal = stream.activeTile.signal;
    signalLight.position.set(occupiedX + 3.72, 2.8, MAIN_ROAD_Z - 3.1);
    signalLight.color.set(signal === 'green' ? 0x8bff7e : signal === 'red' ? 0xff365b : 0xffbd3f);
    signalLight.intensity = signal === 'off' ? 0 : LIGHTING.signalPower;
    const caught = stream.caught;
    const pulse = sirenPulse(elapsed, reducedMotion);
    captureLights[0].position.set(occupiedX - 5, 3.5, MAIN_ROAD_Z - 1);
    captureLights[1].position.set(occupiedX + 4, 4, MAIN_ROAD_Z + 2);
    captureLights[0].intensity = caught ? CAPTURE.power[0] * pulse : 0;
    captureLights[1].intensity = caught
      ? CAPTURE.power[1] * sirenPulse(elapsed, reducedMotion, 1)
      : 0;
    if (flash)
      flash.style.opacity = caught
        ? String(
            reducedMotion ? CAPTURE.reducedFlash : CAPTURE.flashBase + pulse * CAPTURE.flashPower,
          )
        : '0';
    if (thief) {
      indicator.visible = thief.visible && thief.position.y < 1.5;
      indicator.position.set(thief.position.x, 0.143, thief.position.z);
      indicator.material.color.set(caught ? 0x6aa5ff : 0xc9ef9b);
      indicator.material.opacity = reducedMotion ? 0.55 : 0.43 + Math.sin(elapsed * 2) * 0.1;
    }
    updateRoadMultiplier();
    renderer.render(scene, camera);
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    observer.disconnect();
    stream.dispose();
    // Explicitly owned meshes; the shared pool is released only after its last scene.
    for (const mesh of [indicator, roadMultiplier]) {
      mesh.geometry.dispose();
      mesh.material.dispose();
    }
    key.shadow.dispose();
    multiplierTexture.dispose();
    scene.clear();
    releaseVoxelAssets();
    renderer.dispose();
    if (flash) flash.style.opacity = '0';
  }
  reset();
  return {
    scene,
    camera,
    renderer,
    stream,
    get reducedMotion() {
      return motion.reduced;
    },
    reset,
    update,
    dispose,
    setPhase,
    setCrossingTarget,
    setMovement: (n) => stream.setMovement(n),
    setThief: (root) => {
      thief = root;
    },
    follow: (x) => {
      followX = x;
    },
  };
}
