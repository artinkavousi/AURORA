import * as THREE from 'three/webgpu';
import { ParticleBoundaries } from '../PARTICLESYSTEM/physic/boundaries';
import { MlsMpmSimulator } from '../PARTICLESYSTEM/physic/mls-mpm';
import type { FlowConfig } from '../config';
import type { ScenerySystem } from './scenery';

export interface PhysicsSystem {
  simulator: MlsMpmSimulator;
  boundaries: ParticleBoundaries;
  viewportGridSize: THREE.Vector3;
  updateViewport: (width: number, height: number) => void;
  dispose: () => void;
}

export interface PhysicsSetupOptions {
  renderer: THREE.WebGPURenderer;
  config: FlowConfig;
  scenery: ScenerySystem;
}

const BASE_GRID_SIZE = new THREE.Vector3(64, 64, 64);

export async function setupPhysics({ renderer, config, scenery }: PhysicsSetupOptions): Promise<PhysicsSystem> {
  const viewportGridSize = BASE_GRID_SIZE.clone();

  const boundaries = new ParticleBoundaries({
    gridSize: viewportGridSize,
    wallThickness: 3,
    wallStiffness: 0.3,
    visualize: false,
    audioReactive: false,
    audioPulseStrength: 0.15,
    viewportAttractorStrength: 0.12,
    zCompression: 0.25,
  });

  await boundaries.init();
  scenery.instance.add(boundaries.object);
  boundaries.setEnabled(false);

  const simulator = new MlsMpmSimulator(renderer, {
    maxParticles: config.particles.maxCount,
    gridSize: viewportGridSize.clone(),
  });
  await simulator.init();
  simulator.setBoundaries(boundaries);

  const updateViewport = (width: number, height: number): void => {
    const aspect = height === 0 ? 1 : width / height;
    viewportGridSize.set(
      BASE_GRID_SIZE.x * Math.max(1, aspect),
      BASE_GRID_SIZE.y * Math.max(1, 1 / aspect),
      BASE_GRID_SIZE.z,
    );
    boundaries.setGridSize(viewportGridSize);
    simulator.updateBoundaryUniforms();
  };

  return {
    simulator,
    boundaries,
    viewportGridSize,
    updateViewport,
    dispose: () => {
      boundaries.dispose();
      const maybeDisposable = simulator as unknown as { dispose?: () => void };
      maybeDisposable.dispose?.();
    },
  };
}
