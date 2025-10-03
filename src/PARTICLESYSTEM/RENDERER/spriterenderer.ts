/**
 * PARTICLESYSTEM/RENDERER/spriterenderer.ts - Sprite-based particle renderer
 * Single responsibility: Render particles as textured billboards
 */

import * as THREE from "three/webgpu";
import {
  Fn,
  vec3,
  vec4,
  vec2,
  float,
  instanceIndex,
  positionLocal,
  uv,
  modelViewMatrix,
  cameraProjectionMatrix,
  normalize,
  length,
  texture,
  uniform,
  varying,
  mix,
} from "three/tsl";
import type { MlsMpmSimulator } from '../physic/mls-mpm';
import type { IParticleRenderer } from './renderercore';

/**
 * Billboard orientation modes
 */
export enum BillboardMode {
  CAMERA = 0,        // Face camera
  VELOCITY = 1,      // Align with velocity
  AXIS = 2,          // Lock to axis
}

/**
 * Blend modes for sprite rendering
 */
export enum BlendMode {
  ALPHA = 0,         // Standard alpha blending
  ADDITIVE = 1,      // Additive (glow)
  MULTIPLY = 2,      // Multiply (darken)
}

/**
 * Sprite renderer configuration
 */
export interface SpriteRendererConfig {
  billboardMode?: BillboardMode;
  blendMode?: BlendMode;
  particleTexture?: THREE.Texture;
  softParticles?: boolean;
  atlasSize?: number;  // 1x1, 2x2, 4x4, 8x8
  particleSize?: number;
  sizeVariation?: number;
}

/**
 * SpriteRenderer - Billboard particle renderer with texture support
 * Renders particles as camera-facing or velocity-aligned quads with textures
 */
export class SpriteRenderer implements IParticleRenderer {
  public readonly object: THREE.Points;
  private readonly geometry: THREE.InstancedBufferGeometry;
  private readonly material: THREE.PointsNodeMaterial;
  private readonly simulator: MlsMpmSimulator;
  private readonly sizeUniform: any;
  private readonly billboardModeUniform: any;
  private readonly atlasSizeUniform: any;
  private readonly textureUniform: any | null;
  
  constructor(simulator: MlsMpmSimulator, config: SpriteRendererConfig = {}) {
    this.simulator = simulator;
    
    const {
      billboardMode = BillboardMode.CAMERA,
      blendMode = BlendMode.ALPHA,
      particleTexture = null,
      softParticles = true,
      atlasSize = 1,
      particleSize = 1.0,
      sizeVariation = 0.2,
    } = config;
    
    // Create geometry (single point for instancing)
    this.geometry = new THREE.InstancedBufferGeometry();
    const positionBuffer = new THREE.BufferAttribute(new Float32Array(3), 3);
    this.geometry.setAttribute('position', positionBuffer);
    
    // Create material
    this.material = new THREE.PointsNodeMaterial({
      transparent: true,
      depthWrite: false,
    });
    
    // Set blend mode
    switch (blendMode) {
      case BlendMode.ADDITIVE:
        this.material.blending = THREE.AdditiveBlending;
        break;
      case BlendMode.MULTIPLY:
        this.material.blending = THREE.MultiplyBlending;
        break;
      case BlendMode.ALPHA:
      default:
        this.material.blending = THREE.NormalBlending;
        break;
    }
    
    // Uniforms
    this.sizeUniform = uniform(particleSize);
    this.billboardModeUniform = uniform(billboardMode, 'int');
    this.atlasSizeUniform = uniform(atlasSize, 'int');
    this.textureUniform = particleTexture ? uniform(particleTexture) : null;
    
    const particle = this.simulator.particleBuffer.element(instanceIndex);
    
    // Position node - simple particle position
    this.material.positionNode = Fn(() => {
      const particlePosition = particle.get("position");
      return particlePosition.mul(vec3(1, 1, 0.4));
    })();
    
    // Size node - base size with density variation
    this.material.sizeNode = Fn(() => {
      const particleDensity = particle.get("density");
      const particleMass = particle.get("mass");
      
      // Size based on density and mass
      const densityFactor = particleDensity.mul(0.3).add(0.7).clamp(0.5, 1.5);
      const massFactor = particleMass.mul(0.3).add(0.7);
      const randomVariation = float(1.0).sub(float(sizeVariation).mul(0.5));
      
      return this.sizeUniform
        .mul(densityFactor)
        .mul(massFactor)
        .mul(randomVariation)
        .mul(50.0); // Base scale factor
    })();
    
    // Color node - use particle color with texture modulation
    if (this.textureUniform) {
      this.material.colorNode = Fn(() => {
        const particleColor = particle.get("color");
        
        // Sample texture (for now, just use particle color)
        // Full texture sampling will be added with proper UV coordinates
        return vec4(particleColor, 1.0);
      })();
    } else {
      this.material.colorNode = Fn(() => {
        const particleColor = particle.get("color");
        return vec4(particleColor, 1.0);
      })();
    }
    
    // Opacity node - soft particles if enabled
    if (softParticles) {
      this.material.opacityNode = Fn(() => {
        // Fade based on density (higher density = more opaque)
        const particleDensity = particle.get("density");
        const baseOpacity = particleDensity.mul(0.5).add(0.5).clamp(0.3, 1.0);
        
        // TODO: Add depth-based soft particle fade
        return baseOpacity;
      })();
    }
    
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
   * Update renderer
   */
  public update(particleCount: number, size: number = 1.0): void {
    this.geometry.instanceCount = particleCount;
    this.sizeUniform.value = size;
  }
  
  /**
   * Set billboard mode
   */
  public setBillboardMode(mode: BillboardMode): void {
    this.billboardModeUniform.value = mode;
  }
  
  /**
   * Set particle size
   */
  public setSize(size: number): void {
    this.sizeUniform.value = size;
  }
  
  /**
   * Set texture
   */
  public setTexture(texture: THREE.Texture | null): void {
    if (this.textureUniform) {
      this.textureUniform.value = texture;
    }
  }
  
  /**
   * Dispose resources
   */
  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}

