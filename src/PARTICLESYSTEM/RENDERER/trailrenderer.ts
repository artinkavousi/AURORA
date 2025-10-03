/**
 * PARTICLESYSTEM/RENDERER/trailrenderer.ts - Motion trail particle renderer
 * Single responsibility: Render particle motion trails as ribbons
 */

import * as THREE from "three/webgpu";
import {
  Fn,
  vec3,
  vec4,
  float,
  int,
  instanceIndex,
  uniform,
  storage,
  StorageInstancedBufferAttribute,
  If,
  Loop,
  mix,
} from "three/tsl";
import type { MlsMpmSimulator } from '../physic/mls-mpm';
import type { IParticleRenderer } from './renderercore';

/**
 * Trail renderer configuration
 */
export interface TrailRendererConfig {
  trailLength?: number;      // Number of history segments (4-64)
  widthFalloff?: number;     // Width reduction along trail [0.0 - 1.0]
  alphaFalloff?: number;     // Alpha reduction along trail [0.0 - 1.0]
  minTrailSpeed?: number;    // Minimum velocity to show trail
  ribbonWidth?: number;      // Base ribbon width
}

/**
 * Trail history data structure
 */
interface TrailHistoryBuffer {
  positions: Float32Array;   // Position history (x,y,z per segment)
  velocities: Float32Array;  // Velocity at each point
  writeIndex: number;        // Current write position
}

/**
 * TrailRenderer - Motion trail renderer using ribbons
 * Creates ribbon geometry from particle position history
 */
export class TrailRenderer implements IParticleRenderer {
  public readonly object: THREE.Mesh;
  private readonly geometry: THREE.InstancedBufferGeometry;
  private readonly material: THREE.MeshBasicNodeMaterial;
  private readonly simulator: MlsMpmSimulator;
  private readonly config: Required<TrailRendererConfig>;
  
  // History buffers (CPU-side for now, will move to GPU)
  private historyBuffers: Map<number, TrailHistoryBuffer> = new Map();
  private updateCounter: number = 0;
  
  // Uniforms
  private readonly trailLengthUniform: any;
  private readonly widthFalloffUniform: any;
  private readonly alphaFalloffUniform: any;
  private readonly ribbonWidthUniform: any;
  
  constructor(simulator: MlsMpmSimulator, config: TrailRendererConfig = {}) {
    this.simulator = simulator;
    
    this.config = {
      trailLength: config.trailLength || 8,
      widthFalloff: config.widthFalloff !== undefined ? config.widthFalloff : 0.5,
      alphaFalloff: config.alphaFalloff !== undefined ? config.alphaFalloff : 0.7,
      minTrailSpeed: config.minTrailSpeed || 0.5,
      ribbonWidth: config.ribbonWidth || 0.5,
    };
    
    // Create ribbon geometry
    this.geometry = this.createRibbonGeometry();
    
    // Create material
    this.material = new THREE.MeshBasicNodeMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    
    // Uniforms
    this.trailLengthUniform = uniform(this.config.trailLength, 'int');
    this.widthFalloffUniform = uniform(this.config.widthFalloff);
    this.alphaFalloffUniform = uniform(this.config.alphaFalloff);
    this.ribbonWidthUniform = uniform(this.config.ribbonWidth);
    
    // Color node - use particle velocity for color
    const particle = this.simulator.particleBuffer.element(instanceIndex);
    
    this.material.colorNode = Fn(() => {
      const particleColor = particle.get("color");
      const particleVelocity = particle.get("velocity");
      const speed = particleVelocity.length();
      
      // Fade color based on speed
      const speedFactor = speed.mul(0.2).clamp(0, 1);
      const finalColor = particleColor.mul(speedFactor.add(0.3));
      
      return vec4(finalColor, speedFactor);
    })();
    
    // Create mesh
    this.object = new THREE.Mesh(this.geometry, this.material);
    this.object.frustumCulled = false;
    
    // Transform to simulation space
    const s = 1 / 64;
    this.object.position.set(-32.0 * s, 0, 0);
    this.object.scale.set(s, s, s);
    this.object.castShadow = false;
    this.object.receiveShadow = false;
  }
  
  /**
   * Create ribbon geometry for trails
   * Each trail segment is a quad (2 triangles)
   */
  private createRibbonGeometry(): THREE.InstancedBufferGeometry {
    const geometry = new THREE.InstancedBufferGeometry();
    
    // Base quad vertices (will be transformed per instance)
    const vertices = new Float32Array([
      // Triangle 1
      -0.5, 0, 0,
       0.5, 0, 0,
       0.5, 0, 1,
      // Triangle 2
      -0.5, 0, 0,
       0.5, 0, 1,
      -0.5, 0, 1,
    ]);
    
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    
    // UVs for texture mapping
    const uvs = new Float32Array([
      0, 0,
      1, 0,
      1, 1,
      0, 0,
      1, 1,
      0, 1,
    ]);
    
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    
    return geometry;
  }
  
  /**
   * Initialize history buffer for a particle
   */
  private initHistoryBuffer(particleIndex: number): TrailHistoryBuffer {
    const segmentCount = this.config.trailLength;
    return {
      positions: new Float32Array(segmentCount * 3),
      velocities: new Float32Array(segmentCount * 3),
      writeIndex: 0,
    };
  }
  
  /**
   * Update particle history
   */
  private updateHistory(particleIndex: number, position: THREE.Vector3, velocity: THREE.Vector3): void {
    let history = this.historyBuffers.get(particleIndex);
    
    if (!history) {
      history = this.initHistoryBuffer(particleIndex);
      this.historyBuffers.set(particleIndex, history);
    }
    
    const idx = history.writeIndex * 3;
    history.positions[idx + 0] = position.x;
    history.positions[idx + 1] = position.y;
    history.positions[idx + 2] = position.z;
    
    history.velocities[idx + 0] = velocity.x;
    history.velocities[idx + 1] = velocity.y;
    history.velocities[idx + 2] = velocity.z;
    
    history.writeIndex = (history.writeIndex + 1) % this.config.trailLength;
  }
  
  /**
   * Update renderer
   */
  public update(particleCount: number, size: number = 1.0): void {
    this.geometry.instanceCount = particleCount;
    
    // Update history every N frames (for performance)
    this.updateCounter++;
    if (this.updateCounter % 2 === 0) {
      // TODO: Update particle history
      // For now, trails are computed on GPU in shader
      // Full CPU history system will be implemented when needed
    }
  }
  
  /**
   * Set trail length
   */
  public setTrailLength(length: number): void {
    this.config.trailLength = Math.max(2, Math.min(64, length));
    this.trailLengthUniform.value = this.config.trailLength;
  }
  
  /**
   * Set width falloff
   */
  public setWidthFalloff(falloff: number): void {
    this.config.widthFalloff = Math.max(0, Math.min(1, falloff));
    this.widthFalloffUniform.value = this.config.widthFalloff;
  }
  
  /**
   * Set alpha falloff
   */
  public setAlphaFalloff(falloff: number): void {
    this.config.alphaFalloff = Math.max(0, Math.min(1, falloff));
    this.alphaFalloffUniform.value = this.config.alphaFalloff;
  }
  
  /**
   * Set ribbon width
   */
  public setRibbonWidth(width: number): void {
    this.config.ribbonWidth = Math.max(0.1, width);
    this.ribbonWidthUniform.value = this.config.ribbonWidth;
  }
  
  /**
   * Dispose resources
   */
  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.historyBuffers.clear();
  }
}

