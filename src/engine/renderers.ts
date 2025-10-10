import * as THREE from 'three/webgpu';
import {
  RendererManager,
  ParticleRenderMode,
  RenderQuality,
} from '../PARTICLESYSTEM/RENDERER/renderercore';
import { MeshRenderer } from '../PARTICLESYSTEM/RENDERER/meshrenderer';
import { PointRenderer } from '../PARTICLESYSTEM/RENDERER/pointrenderer';
import type { FlowConfig } from '../config';
import type { PhysicsSystem } from './physics';
import type { ScenerySystem } from './scenery';

export interface RendererSystem {
  manager: RendererManager;
  currentObject: THREE.Object3D | null;
  preferredMode: ParticleRenderMode;
  meshRenderer: MeshRenderer;
  pointRenderer: PointRenderer;
  switchMode: (mode: ParticleRenderMode) => void;
  update: (particleCount: number, size?: number) => void;
  dispose: () => void;
}

export interface RendererSetupOptions {
  config: FlowConfig;
  physics: PhysicsSystem;
  scenery: ScenerySystem;
}

export async function setupRenderers({ config, physics, scenery }: RendererSetupOptions): Promise<RendererSystem> {
  const manager = new RendererManager(physics.simulator, {
    mode: config.rendering.points ? ParticleRenderMode.POINT : ParticleRenderMode.MESH,
    quality: RenderQuality.HIGH,
    lodEnabled: false,
    sortingEnabled: false,
    cullingEnabled: false,
    maxParticles: config.particles.maxCount,
  });

  manager.setSimulationTransform(physics.boundaries.getSimulationTransform());

  let currentObject = manager.getRenderer().object;
  currentObject.visible = true;
  scenery.instance.add(currentObject);

  const meshRenderer = new MeshRenderer(physics.simulator, {
    metalness: 0.9,
    roughness: 0.5,
  });
  const pointRenderer = new PointRenderer(physics.simulator);
  meshRenderer.object.visible = false;
  pointRenderer.object.visible = false;
  scenery.instance.add(meshRenderer.object);
  scenery.instance.add(pointRenderer.object);

  const switchMode = (mode: ParticleRenderMode): void => {
    if (currentObject) {
      scenery.instance.remove(currentObject);
    }

    const newObject = manager.switchMode(mode);
    scenery.instance.add(newObject);
    newObject.visible = true;
    currentObject = newObject;
  };

  return {
    manager,
    currentObject,
    preferredMode: manager.getCurrentMode(),
    meshRenderer,
    pointRenderer,
    switchMode,
    update: (particleCount: number, size?: number) => {
      manager.update(particleCount, size);
    },
    dispose: () => {
      if (currentObject) {
        scenery.instance.remove(currentObject);
      }
      scenery.instance.remove(meshRenderer.object);
      scenery.instance.remove(pointRenderer.object);
      meshRenderer.dispose();
      pointRenderer.dispose();
      manager.dispose();
    },
  };
}

export { ParticleRenderMode };
