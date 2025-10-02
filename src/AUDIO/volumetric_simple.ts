/**
 * AUDIO/volumetric.ts - Volumetric audio visualizer (Simplified stable version)
 * Single responsibility: GPU-accelerated volumetric audio visualization
 */

import * as THREE from "three/webgpu";
import type { AudioData } from './soundreactivity';

export interface VolumetricConfig {
  enabled: boolean;
  mode: 'sphere' | 'cylinder' | 'waves' | 'particles' | 'tunnel';
  
  // Visual properties
  scale: number;
  complexity: number;
  speed: number;
  
  // Color
  colorMode: 'rainbow' | 'bass' | 'frequency' | 'gradient';
  hue: number;
  saturation: number;
  brightness: number;
  
  // Animation
  rotationSpeed: number;
  pulseIntensity: number;
  waveAmplitude: number;
  
  // Glow and opacity
  glowIntensity: number;
  opacity: number;
  
  // Frequency band influence
  bassInfluence: number;
  midInfluence: number;
  trebleInfluence: number;
}

/**
 * VolumetricVisualizer - Simplified stable audio visualizer
 * Uses standard materials with audio-reactive properties
 */
export class VolumetricVisualizer {
  public readonly object: THREE.Mesh;
  private material: THREE.MeshStandardMaterial;
  private config: VolumetricConfig;
  private baseScale: THREE.Vector3 = new THREE.Vector3(1, 1, 1);
  
  constructor(config: VolumetricConfig) {
    this.config = { ...config };
    
    // Create geometry based on mode
    const geometry = this.createGeometry(config.mode);
    
    // Create standard material (stable and performant)
    this.material = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(config.hue, config.saturation, config.brightness * 0.5),
      transparent: true,
      opacity: config.opacity,
      side: THREE.DoubleSide,
      emissive: new THREE.Color().setHSL(config.hue, config.saturation, config.brightness * 0.3),
      emissiveIntensity: config.glowIntensity * 0.5,
      metalness: 0.5,
      roughness: 0.3,
      depthWrite: false,
    });
    
    // Create mesh
    this.object = new THREE.Mesh(geometry, this.material);
    this.object.position.set(0, 0.5, 0.2);
    this.object.visible = config.enabled;
  }
  
  /**
   * Create geometry based on visualization mode
   */
  private createGeometry(mode: string): THREE.BufferGeometry {
    switch (mode) {
      case 'sphere':
        return new THREE.IcosahedronGeometry(0.3, 32);
      
      case 'cylinder':
        return new THREE.CylinderGeometry(0.2, 0.2, 0.6, 32, 32);
      
      case 'waves':
        return new THREE.PlaneGeometry(0.8, 0.8, 64, 64);
      
      case 'particles':
        return new THREE.IcosahedronGeometry(0.3, 16);
      
      case 'tunnel':
        return new THREE.CylinderGeometry(0.3, 0.3, 1.0, 32, 32, true);
      
      default:
        return new THREE.IcosahedronGeometry(0.3, 32);
    }
  }
  
  /**
   * Update with audio data
   */
  update(audioData: AudioData, elapsed: number): void {
    if (!this.config.enabled) {
      this.object.visible = false;
      return;
    }
    
    this.object.visible = true;
    
    // Calculate audio influence
    const audioIntensity = 
      (audioData.smoothBass * this.config.bassInfluence +
       audioData.smoothMid * this.config.midInfluence +
       audioData.smoothTreble * this.config.trebleInfluence) / 3.0;
    
    // Audio-reactive scale (pulse effect)
    const beatPulse = audioData.beatIntensity * this.config.pulseIntensity * 0.3;
    const audioScale = 1.0 + (audioIntensity * 0.5) + beatPulse;
    this.object.scale.setScalar(this.config.scale * audioScale);
    
    // Rotation
    this.object.rotation.y = elapsed * this.config.rotationSpeed * 0.5;
    this.object.rotation.x = Math.sin(elapsed * 0.3) * 0.2;
    
    // Audio-reactive color
    let hue = this.config.hue;
    
    switch (this.config.colorMode) {
      case 'rainbow':
        hue = (elapsed * 0.1) % 1.0;
        break;
      case 'bass':
        hue = this.config.hue + (audioData.smoothBass * 0.5);
        break;
      case 'frequency':
        hue = (audioData.peakFrequency / 20000) % 1.0;
        break;
      case 'gradient':
        hue = this.config.hue + (audioIntensity * 0.3);
        break;
    }
    
    // Update material colors
    this.material.color.setHSL(
      hue,
      this.config.saturation,
      this.config.brightness * 0.5 * (1.0 + audioIntensity * 0.5)
    );
    
    this.material.emissive.setHSL(
      hue,
      this.config.saturation,
      this.config.brightness * 0.3 * (1.0 + audioIntensity)
    );
    
    this.material.emissiveIntensity = this.config.glowIntensity * (0.5 + audioIntensity * 0.5);
    
    // Update opacity
    this.material.opacity = this.config.opacity * (0.8 + audioIntensity * 0.2);
  }
  
  /**
   * Update configuration
   */
  updateConfig(config: Partial<VolumetricConfig>): void {
    Object.assign(this.config, config);
    
    // If mode changed, rebuild geometry
    if (config.mode !== undefined) {
      this.object.geometry.dispose();
      this.object.geometry = this.createGeometry(config.mode);
    }
    
    // Update material properties
    if (config.opacity !== undefined) {
      this.material.opacity = config.opacity;
    }
    
    if (config.glowIntensity !== undefined) {
      this.material.emissiveIntensity = config.glowIntensity * 0.5;
    }
  }
  
  /**
   * Dispose of resources
   */
  dispose(): void {
    this.object.geometry.dispose();
    this.material.dispose();
  }
}

