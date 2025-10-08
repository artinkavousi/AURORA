/**
 * PARTICLESYSTEM/RENDERER/pointrenderer.ts - Point-based particle renderer
 * Single responsibility: Render particles as GPU points
 */

import * as THREE from "three/webgpu";
import { Fn, vec3, instanceIndex } from "three/tsl";
import type { MlsMpmSimulator } from '../physic/mls-mpm';

/**
 * PointRenderer - Simple point-based particle renderer
 * Lightweight alternative to mesh renderer for performance
 */
export class PointRenderer {
  public readonly object: THREE.Points;
  private readonly geometry: THREE.InstancedBufferGeometry;
  private readonly material: THREE.PointsNodeMaterial;
  private readonly simulator: MlsMpmSimulator;

  constructor(simulator: MlsMpmSimulator) {
    this.simulator = simulator;

    // Create empty geometry (points don't need vertices, just instance count)
    this.geometry = new THREE.InstancedBufferGeometry();
    const positionBuffer = new THREE.BufferAttribute(new Float32Array(3), 3, false);
    this.geometry.setAttribute('position', positionBuffer);

    // Create points material
    this.material = new THREE.PointsNodeMaterial();

    // Position node from particle buffer
    this.material.positionNode = Fn(() => {
      return this.simulator.particleBuffer
        .element(instanceIndex)
        .get('position')
        .mul(vec3(1, 1, 0.4));
    })();

    // Create points object
    this.object = new THREE.Points(this.geometry, this.material);
    this.object.frustumCulled = false;

    // Transform to simulation space
    const s = 1 / 64;
    this.object.position.set(-32.0 * s, 0, 0);
    this.object.scale.set(s, s, s);
    this.object.castShadow = false;
    this.object.receiveShadow = false;
  }

  /**
   * Update renderer (particle count)
   */
  public update(particleCount: number): void {
    // Validate to prevent WebGPU errors
    const validCount = Number.isFinite(particleCount) && particleCount > 0 
      ? Math.floor(particleCount) 
      : 1;
    this.geometry.instanceCount = validCount;
  }

  /**
   * Dispose resources
   */
  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}

