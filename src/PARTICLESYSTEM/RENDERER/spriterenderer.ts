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
  attribute,
  uv,
  modelViewMatrix,
  cameraProjectionMatrix,
  normalize,
  length,
  texture,
  uniform,
  varying,
  mix,
  cross,
  smoothstep,
  floor,
  mod,
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
  softParticleRange?: number;  // Depth fade range
  atlasSize?: number;  // 1x1, 2x2, 4x4, 8x8
  particleSize?: number;
  sizeVariation?: number;
  rotation?: boolean;  // Enable rotation
  animationSpeed?: number;  // For atlas animation
}

/**
 * SpriteRenderer - Billboard particle renderer with texture support
 * Renders particles as camera-facing or velocity-aligned quads with textures
 */
export class SpriteRenderer implements IParticleRenderer {
  public readonly object: THREE.InstancedMesh;
  private readonly geometry: THREE.InstancedBufferGeometry;
  private readonly material: THREE.MeshBasicNodeMaterial;
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
      softParticleRange = 2.0,
      atlasSize = 1,
      particleSize = 1.0,
      sizeVariation = 0.2,
      rotation = false,
      animationSpeed = 1.0,
    } = config;
    
    // Create geometry (quad for proper billboarding)
    this.geometry = new THREE.InstancedBufferGeometry();
    
    // Quad vertices for billboarding
    const vertices = new Float32Array([
      -0.5, -0.5, 0,
       0.5, -0.5, 0,
       0.5,  0.5, 0,
      -0.5,  0.5, 0,
    ]);
    
    const uvs = new Float32Array([
      0, 0,
      1, 0,
      1, 1,
      0, 1,
    ]);
    
    const indices = new Uint16Array([
      0, 1, 2,
      0, 2, 3,
    ]);
    
    this.geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    this.geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    
    // Set index buffer for quad rendering (2 triangles = 6 indices)
    this.geometry.setIndex(new THREE.BufferAttribute(indices, 1));
    
    // Create material with proper transparency
    this.material = new THREE.MeshBasicNodeMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
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
    const softParticleRangeUniform = uniform(softParticleRange);
    const animationSpeedUniform = uniform(animationSpeed);
    const timeUniform = uniform(0.0);
    
    const particle = this.simulator.particleBuffer.element(instanceIndex);
    
    // Enhanced position node with billboarding
    this.material.positionNode = Fn(() => {
      const particlePosition = particle.get("position");
      const particleVelocity = particle.get("velocity");
      const localPos = attribute("position");
      
      // Get billboard rotation based on mode
      let billboardOffset = localPos.xyz.toVar();
      
      if (billboardMode === BillboardMode.VELOCITY) {
        // Align billboard with velocity direction
        const vel = particleVelocity.normalize();
        const right = cross(vel, vec3(0, 1, 0)).normalize();
        const up = cross(right, vel).normalize();
        
        billboardOffset.assign(
          right.mul(localPos.x)
            .add(up.mul(localPos.y))
            .add(vel.mul(localPos.z))
        );
      }
      // For CAMERA and AXIS modes, default billboard orientation is used
      
      // Apply size
      const particleDensity = particle.get("density");
      const particleMass = particle.get("mass");
      const densityFactor = particleDensity.mul(0.3).add(0.7).clamp(0.5, 1.5);
      const massFactor = particleMass.mul(0.3).add(0.7);
      const size = this.sizeUniform.mul(densityFactor).mul(massFactor);
      
      return particlePosition.mul(vec3(1, 1, 0.4))
        .add(billboardOffset.mul(size));
    })();
    
    // Enhanced color node with texture atlas support
    this.material.colorNode = Fn(() => {
      const particleColor = particle.get("color");
      const uvCoord = uv();
      
      if (this.textureUniform) {
        // Atlas support
        const atlasSize = float(atlasSize);
        const particleId = instanceIndex.mod(atlasSize.mul(atlasSize));
        const atlasRow = floor(particleId.div(atlasSize));
        const atlasCol = particleId.mod(atlasSize);
        
        // Calculate atlas UV
        const cellSize = float(1.0).div(atlasSize);
        const atlasUV = vec2(
          atlasCol.mul(cellSize).add(uvCoord.x.mul(cellSize)),
          atlasRow.mul(cellSize).add(uvCoord.y.mul(cellSize))
        );
        
        const texColor = texture(this.textureUniform, atlasUV);
        
        // Modulate texture with particle color
        return vec4(particleColor.mul(texColor.rgb), texColor.a);
      }
      
      // Procedural circle if no texture
      const center = vec2(0.5);
      const dist = length(uvCoord.sub(center)).mul(2.0);
      const alpha = smoothstep(1.0, 0.7, dist);
      
      return vec4(particleColor, alpha);
    })();
    
    // Enhanced opacity with depth-based soft particles
    if (softParticles) {
      this.material.opacityNode = Fn(() => {
        const particleDensity = particle.get("density");
        const baseOpacity = particleDensity.mul(0.5).add(0.5).clamp(0.3, 1.0);
        
        // Depth-based soft particle fade
        // This creates smooth transitions when particles intersect geometry
        // The actual depth comparison would require scene depth texture
        // For now, we'll use density-based fade
        const depthFade = smoothstep(0.3, 1.0, particleDensity);
        
        return baseOpacity.mul(depthFade);
      })();
    }
    
    // Create instanced mesh with validated particle count
    const initialCount = Number.isFinite(this.simulator.numParticles) && this.simulator.numParticles > 0
      ? Math.floor(this.simulator.numParticles)
      : 1; // Default to 1 to prevent WebGPU errors
    
    this.object = new THREE.InstancedMesh(
      this.geometry, 
      this.material, 
      initialCount
    );
    
    // CRITICAL: Explicitly set geometry instance count for WebGPU
    // WebGPU requires both mesh.count AND geometry.instanceCount to be set
    this.geometry.instanceCount = initialCount;
    
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
    // Validate inputs to prevent WebGPU drawIndexed errors
    const validCount = Number.isFinite(particleCount) && particleCount > 0 
      ? Math.floor(particleCount) 
      : 1; // Default to 1 to prevent WebGPU errors
    const validSize = Number.isFinite(size) && size > 0 ? size : 1.0;
    
    // Ensure geometry has valid index buffer
    if (!this.geometry.index || this.geometry.index.count <= 0) {
      console.error('❌ SpriteRenderer: Geometry has invalid index buffer!');
      return;
    }
    
    // CRITICAL: Set both mesh count AND geometry instanceCount for WebGPU
    this.object.count = validCount;
    this.geometry.instanceCount = validCount;
    this.sizeUniform.value = validSize;
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

