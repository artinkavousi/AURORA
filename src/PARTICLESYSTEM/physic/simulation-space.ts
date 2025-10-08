/**
 * PARTICLESYSTEM/PHYSIC/simulation-space.ts - Shared simulation space helpers
 * Single responsibility: Provide consistent grid→world transforms for the
 * particle system so boundaries, renderers and physics stay in sync.
 */

import * as THREE from "three/webgpu";

/**
 * Configuration for the simulation space helper.
 */
export interface SimulationSpaceConfig {
  /** Reference grid size used to derive world scale (defaults to 64³). */
  baseGridSize?: THREE.Vector3;
  /** Compression factor applied on Z when converting to world space. */
  zCompression?: number;
}

/**
 * Resulting transform that should be applied to particle renderers so that the
 * simulation domain stays centred and scaled correctly.
 */
export interface SimulationTransform {
  position: THREE.Vector3;
  scale: THREE.Vector3;
  zCompression: number;
}

/**
 * SimulationSpace - centralises how grid coordinates map to the rendered
 * world. The Flow project historically relied on hardcoded constants (e.g.
 * `-32 * (1/64)`) across multiple modules which caused containers to drift and
 * deform whenever the grid size changed. This helper encapsulates the maths so
 * every consumer stays aligned.
 */
export class SimulationSpace {
  private readonly baseGridSize: THREE.Vector3;
  private readonly zCompression: number;
  private gridSize: THREE.Vector3;

  constructor(config: SimulationSpaceConfig = {}) {
    this.baseGridSize = (config.baseGridSize ?? new THREE.Vector3(64, 64, 64)).clone();
    this.zCompression = config.zCompression ?? 0.4;
    this.gridSize = this.baseGridSize.clone();
  }

  /** Update the active grid size (typically after a viewport resize). */
  public setGridSize(size: THREE.Vector3): void {
    this.gridSize.copy(size);
  }

  /** Retrieve the current grid size. */
  public getGridSize(): THREE.Vector3 {
    return this.gridSize.clone();
  }

  /** Compression factor used on the Z axis when rendering. */
  public getZCompression(): number {
    return this.zCompression;
  }

  /** Base scaling factor (1 / base grid) applied uniformly in Flow. */
  private getBaseScale(): number {
    return 1 / this.baseGridSize.x;
  }

  /**
   * Compute the renderer transform required to keep the simulation domain
   * centred in world space.
   */
  public getRendererTransform(): SimulationTransform {
    const scale = this.getBaseScale();
    return {
      position: new THREE.Vector3(-this.gridSize.x * scale * 0.5, 0, 0),
      scale: new THREE.Vector3(scale, scale, scale),
      zCompression: this.zCompression,
    };
  }

  /**
   * Helper for computing the world-space coordinates of the grid centre. This
   * is useful for positioning boundary meshes that should float in the middle
   * of the viewport.
   */
  public getWorldCenter(): THREE.Vector3 {
    const transform = this.getRendererTransform();
    const scale = transform.scale.x;
    const width = this.gridSize.x * scale;
    const height = this.gridSize.y * scale;
    const depth = this.gridSize.z * scale * this.zCompression;

    return new THREE.Vector3(
      transform.position.x + width * 0.5,
      transform.position.y + height * 0.5,
      transform.position.z + depth * 0.5,
    );
  }
}

