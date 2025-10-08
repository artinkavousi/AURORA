/**
 * AUDIO/kinetic/spatial-composer.ts - Spatial Composition & Staging
 * 
 * Camera-aware depth layering and spatial composition
 * Manages foreground/midground/background particle behavior
 */

import * as THREE from "three/webgpu";
import type { EnhancedAudioData } from '../core/enhanced-audio-analyzer';
import type { ParticleRole } from './ensemble-choreographer';

/**
 * Depth layer types
 */
export enum DepthLayer {
  FOREGROUND = 'foreground',    // 0-40% depth (near camera)
  MIDGROUND = 'midground',      // 40-80% depth (main action)
  BACKGROUND = 'background',    // 80-100% depth (atmospheric)
}

/**
 * Spatial modulation for a particle
 */
export interface SpatialModulation {
  layer: DepthLayer;
  depthNormalized: number;    // 0-1, 0=near, 1=far
  
  // Force scaling
  forceScale: number;          // Multiply forces by this
  velocityScale: number;       // Multiply velocities by this
  
  // Frequency response
  bassResponse: number;        // 0-1
  midResponse: number;         // 0-1
  trebleResponse: number;      // 0-1
  
  // Visual properties
  brightness: number;          // Brightness multiplier
  saturation: number;          // Saturation multiplier
  scale: number;               // Size multiplier
  opacity: number;             // Opacity multiplier
  
  // Motion characteristics
  motionSpeed: number;         // Speed multiplier
  motionSmooth: number;        // Smoothing factor
}

/**
 * Staging configuration
 */
export interface StagingConfig {
  // Depth ranges (world space units)
  cameraNear: number;
  cameraFar: number;
  
  // Layer boundaries (normalized 0-1)
  foregroundEnd: number;       // Default: 0.4
  midgroundEnd: number;        // Default: 0.8
  
  // Force scaling by layer
  foregroundForceScale: number;
  midgroundForceScale: number;
  backgroundForceScale: number;
  
  // Motion scaling by layer
  foregroundMotionSpeed: number;
  midgroundMotionSpeed: number;
  backgroundMotionSpeed: number;
}

/**
 * Spatial composition state
 */
export interface SpatialState {
  foregroundCount: number;
  midgroundCount: number;
  backgroundCount: number;
  
  staging: StagingConfig;
  cameraPosition: THREE.Vector3;
  cameraDirection: THREE.Vector3;
}

/**
 * SpatialComposer - Camera-aware depth management and staging
 */
export class SpatialComposer {
  // Default staging configuration
  private config: StagingConfig = {
    cameraNear: 1,
    cameraFar: 200,
    
    foregroundEnd: 0.4,
    midgroundEnd: 0.8,
    
    foregroundForceScale: 1.5,
    midgroundForceScale: 1.0,
    backgroundForceScale: 0.6,
    
    foregroundMotionSpeed: 1.3,
    midgroundMotionSpeed: 1.0,
    backgroundMotionSpeed: 0.7,
  };
  
  // Camera reference
  private camera: THREE.Camera | null = null;
  
  // Particle data cache
  private particlePositions: Float32Array | null = null;
  private particleCount = 0;
  
  // Cached modulations
  private modulationCache: Map<number, SpatialModulation> = new Map();
  private cacheTime = 0;
  
  constructor(config?: Partial<StagingConfig>) {
    if (config) {
      Object.assign(this.config, config);
    }
  }
  
  /**
   * Set camera for depth calculations
   */
  setCamera(camera: THREE.Camera): void {
    this.camera = camera;
  }
  
  /**
   * Update particle data
   */
  updateParticleData(positions: Float32Array): void {
    this.particlePositions = positions;
    this.particleCount = positions.length / 3;
    
    // Invalidate cache
    this.modulationCache.clear();
  }
  
  /**
   * Update staging configuration
   */
  updateConfig(config: Partial<StagingConfig>): void {
    Object.assign(this.config, config);
    this.modulationCache.clear();
  }
  
  /**
   * Get spatial modulation for a particle
   */
  getSpatialModulation(
    particleIndex: number,
    particlePos: THREE.Vector3,
    role: ParticleRole,
    audioData: EnhancedAudioData
  ): SpatialModulation {
    // Check cache
    const cached = this.modulationCache.get(particleIndex);
    if (cached && audioData.time - this.cacheTime < 0.1) {
      return cached;
    }
    
    if (!this.camera) {
      return this.getDefaultModulation();
    }
    
    // Calculate depth
    const depth = this.calculateDepth(particlePos);
    const layer = this.getDepthLayer(depth);
    
    // Calculate spatial modulation
    const modulation = this.calculateModulation(depth, layer, role, audioData);
    
    // Cache result
    this.modulationCache.set(particleIndex, modulation);
    this.cacheTime = audioData.time;
    
    return modulation;
  }
  
  /**
   * Calculate normalized depth (0=near, 1=far)
   */
  private calculateDepth(pos: THREE.Vector3): number {
    if (!this.camera) return 0.5;
    
    // Distance from camera
    const distance = pos.distanceTo(this.camera.position);
    
    // Normalize to 0-1 based on camera near/far
    const depth = (distance - this.config.cameraNear) / (this.config.cameraFar - this.config.cameraNear);
    
    return THREE.MathUtils.clamp(depth, 0, 1);
  }
  
  /**
   * Determine depth layer from normalized depth
   */
  private getDepthLayer(depth: number): DepthLayer {
    if (depth < this.config.foregroundEnd) {
      return DepthLayer.FOREGROUND;
    } else if (depth < this.config.midgroundEnd) {
      return DepthLayer.MIDGROUND;
    } else {
      return DepthLayer.BACKGROUND;
    }
  }
  
  /**
   * Calculate full spatial modulation
   */
  private calculateModulation(
    depth: number,
    layer: DepthLayer,
    role: ParticleRole,
    audioData: EnhancedAudioData
  ): SpatialModulation {
    // Base modulation by layer
    let forceScale: number;
    let motionSpeed: number;
    let bassResponse: number;
    let midResponse: number;
    let trebleResponse: number;
    let brightness: number;
    let saturation: number;
    let scale: number;
    
    switch (layer) {
      case DepthLayer.FOREGROUND:
        forceScale = this.config.foregroundForceScale;
        motionSpeed = this.config.foregroundMotionSpeed;
        bassResponse = 0.3;
        midResponse = 0.6;
        trebleResponse = 1.0;  // High freq
        brightness = 1.3;
        saturation = 1.2;
        scale = 1.2;
        break;
        
      case DepthLayer.MIDGROUND:
        forceScale = this.config.midgroundForceScale;
        motionSpeed = this.config.midgroundMotionSpeed;
        bassResponse = 0.8;
        midResponse = 1.0;
        trebleResponse = 0.8;
        brightness = 1.0;
        saturation = 1.0;
        scale = 1.0;
        break;
        
      case DepthLayer.BACKGROUND:
        forceScale = this.config.backgroundForceScale;
        motionSpeed = this.config.backgroundMotionSpeed;
        bassResponse = 1.0;    // Low freq
        midResponse = 0.5;
        trebleResponse = 0.2;
        brightness = 0.6;
        saturation = 0.7;
        scale = 0.8;
        break;
    }
    
    // Modify by role
    switch (role) {
      case 'lead':
        forceScale *= 1.2;
        motionSpeed *= 1.2;
        brightness *= 1.3;
        saturation *= 1.1;
        scale *= 1.3;
        break;
        
      case 'support':
        // Use defaults
        break;
        
      case 'ambient':
        forceScale *= 0.7;
        motionSpeed *= 0.8;
        brightness *= 0.7;
        saturation *= 0.8;
        scale *= 0.7;
        break;
    }
    
    // Smooth interpolation within layer boundaries
    const velocityScale = motionSpeed;
    const motionSmooth = THREE.MathUtils.lerp(0.3, 0.8, depth);
    
    // Opacity based on depth (farther = more transparent)
    const opacity = THREE.MathUtils.lerp(1.0, 0.5, depth);
    
    return {
      layer,
      depthNormalized: depth,
      
      forceScale,
      velocityScale,
      
      bassResponse,
      midResponse,
      trebleResponse,
      
      brightness,
      saturation,
      scale,
      opacity,
      
      motionSpeed,
      motionSmooth,
    };
  }
  
  /**
   * Get default modulation (when camera not available)
   */
  private getDefaultModulation(): SpatialModulation {
    return {
      layer: DepthLayer.MIDGROUND,
      depthNormalized: 0.5,
      
      forceScale: 1.0,
      velocityScale: 1.0,
      
      bassResponse: 1.0,
      midResponse: 1.0,
      trebleResponse: 1.0,
      
      brightness: 1.0,
      saturation: 1.0,
      scale: 1.0,
      opacity: 1.0,
      
      motionSpeed: 1.0,
      motionSmooth: 0.5,
    };
  }
  
  /**
   * Get state for all particles
   */
  getState(): SpatialState {
    let foregroundCount = 0;
    let midgroundCount = 0;
    let backgroundCount = 0;
    
    // Count particles in each layer
    for (const modulation of this.modulationCache.values()) {
      switch (modulation.layer) {
        case DepthLayer.FOREGROUND:
          foregroundCount++;
          break;
        case DepthLayer.MIDGROUND:
          midgroundCount++;
          break;
        case DepthLayer.BACKGROUND:
          backgroundCount++;
          break;
      }
    }
    
    return {
      foregroundCount,
      midgroundCount,
      backgroundCount,
      staging: { ...this.config },
      cameraPosition: this.camera ? this.camera.position.clone() : new THREE.Vector3(),
      cameraDirection: this.camera 
        ? new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion)
        : new THREE.Vector3(0, 0, -1),
    };
  }
  
  /**
   * Apply approach/retreat dynamics
   * Returns a force vector to move particles toward/away from camera
   */
  getApproachRetreatForce(
    particlePos: THREE.Vector3,
    audioData: EnhancedAudioData
  ): THREE.Vector3 {
    if (!this.camera) return new THREE.Vector3();
    
    const toCamera = this.camera.position.clone().sub(particlePos);
    const dist = toCamera.length();
    const dir = toCamera.normalize();
    
    // Approach on accents/attacks
    const approachIntensity = audioData.features.onsetEnergy * 0.5 + audioData.beatIntensity * 0.5;
    
    // Retreat on releases
    const retreatIntensity = audioData.structure.tension.isReleasing ? 0.5 : 0;
    
    const netApproach = approachIntensity - retreatIntensity;
    
    // Scale by distance (farther particles move more)
    const distScale = Math.min(dist / 50, 1.0);
    
    return dir.multiplyScalar(netApproach * distScale * 10);
  }
  
  /**
   * Get lateral movement for stereo imaging
   * Returns force vector for left/right motion based on stereo balance
   */
  getLateralForce(
    particlePos: THREE.Vector3,
    audioData: EnhancedAudioData
  ): THREE.Vector3 {
    if (!this.camera) return new THREE.Vector3();
    
    // Get camera right vector
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
    
    // Stereo balance: -1 (left) to +1 (right)
    const balance = audioData.features.stereoBalance;
    
    // Stereo width affects intensity
    const width = audioData.features.stereoWidth;
    
    // Create lateral force
    const lateralForce = right.multiplyScalar(balance * width * 5);
    
    return lateralForce;
  }
  
  /**
   * Get vertical movement for tonal register
   * Higher frequencies → upward motion
   * Lower frequencies → downward motion
   */
  getVerticalForce(
    particlePos: THREE.Vector3,
    audioData: EnhancedAudioData
  ): THREE.Vector3 {
    // High frequencies push up
    const upwardForce = audioData.smoothTreble * 3;
    
    // Low frequencies push down
    const downwardForce = audioData.smoothBass * 2;
    
    const netVertical = upwardForce - downwardForce;
    
    return new THREE.Vector3(0, netVertical, 0);
  }
  
  /**
   * Clear cache
   */
  clearCache(): void {
    this.modulationCache.clear();
  }
  
  /**
   * Reset composer
   */
  reset(): void {
    this.modulationCache.clear();
    this.cacheTime = 0;
  }
}

