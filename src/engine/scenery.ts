import * as THREE from 'three/webgpu';
import { Scenery } from '../STAGE/scenery';
import type { FlowConfig } from '../config';
import type { SceneGraphHooks } from './types';

export interface ScenerySystem {
  instance: Scenery;
  update: (delta: number, elapsed: number) => void;
  resize: (width: number, height: number) => void;
  createRaycaster: () => THREE.Raycaster;
  dispose: () => void;
}

export interface ScenerySetupOptions {
  renderer: THREE.WebGPURenderer;
  config: FlowConfig;
  hooks: SceneGraphHooks;
}

export async function setupScenery({ renderer, config, hooks }: ScenerySetupOptions): Promise<ScenerySystem> {
  const domElement = hooks.getDomElement?.() ?? renderer.domElement;

  const scenery = new Scenery(renderer, domElement, {
    camera: config.camera,
    environment: config.environment,
    toneMapping: config.toneMapping,
    shadowMap: true,
    shadowMapType: THREE.PCFSoftShadowMap,
    enableDamping: true,
    enablePan: false,
    maxDistance: 2.0,
    minDistance: 0.1,
    minPolarAngle: 0.2 * Math.PI,
    maxPolarAngle: 0.8 * Math.PI,
    minAzimuthAngle: 0.7 * Math.PI,
    maxAzimuthAngle: 1.3 * Math.PI,
  });

  await scenery.init();

  hooks.onSceneReady?.(scenery.scene);
  hooks.onCameraReady?.(scenery.camera);

  return {
    instance: scenery,
    update: scenery.update.bind(scenery),
    resize: scenery.resize.bind(scenery),
    createRaycaster: () => scenery.createRaycaster(),
    dispose: () => scenery.dispose(),
  };
}
