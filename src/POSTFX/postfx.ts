/**
 * POSTFX/postfx.ts - Clean Post-Processing with Built-in Nodes
 * 
 * Effects:
 * 1. Bloom (built-in BloomNode)
 * 2. Chromatic Aberration (built-in RGBShiftNode)
 * 3. Radial Blur (custom TSL with directional blur)
 */

import * as THREE from "three/webgpu";
import { Fn, pass, uniform, uv, vec2, vec3, vec4, float, mix, length, texture } from "three/tsl";
// @ts-ignore
import { bloom } from 'three/examples/jsm/tsl/display/BloomNode.js';
// @ts-ignore  
import { rgbShift } from 'three/examples/jsm/tsl/display/RGBShiftNode.js';
// @ts-ignore
import { gaussianBlur } from 'three/examples/jsm/tsl/display/GaussianBlurNode.js';

export interface BloomConfig {
  enabled: boolean;
  threshold: number;
  strength: number;
  radius: number;
}

export interface RadialBlurConfig {
  enabled: boolean;
  strength: number;
}

export interface RadialCAConfig {
  enabled: boolean;
  strength: number;
  angle: number;
}

export interface PostFXOptions {
  bloom?: Partial<BloomConfig>;
  radialBlur?: Partial<RadialBlurConfig>;
  radialCA?: Partial<RadialCAConfig>;
}

/**
 * PostFX - Post-processing with Three.js built-in nodes
 */
export class PostFX {
  private renderer: THREE.WebGPURenderer;
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private postProcessing: THREE.PostProcessing;
  private scenePass: any;
  private bloomPass: any;
  private rgbShiftPass: any;
  private blurPass: any;

  // Uniforms for effects
  public uniforms = {
    // Bloom
    bloomEnabled: uniform(1.0),
    
    // Radial Blur (enable/disable only, strength set at construction)
    radialBlurEnabled: uniform(0.0),
    
    // Chromatic Aberration (enable/disable only, params set at construction)
    caEnabled: uniform(0.0),
  };

  constructor(
    renderer: THREE.WebGPURenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
    options: PostFXOptions = {}
  ) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;

    // Apply enable/disable config
    if (options.bloom?.enabled !== undefined) {
      this.uniforms.bloomEnabled.value = options.bloom.enabled ? 1.0 : 0.0;
    }
    
    if (options.radialBlur?.enabled !== undefined) {
      this.uniforms.radialBlurEnabled.value = options.radialBlur.enabled ? 1.0 : 0.0;
    }
    
    if (options.radialCA?.enabled !== undefined) {
      this.uniforms.caEnabled.value = options.radialCA.enabled ? 1.0 : 0.0;
    }

    // Setup scene pass
    this.scenePass = pass(scene, camera);
    
    // Setup bloom (built-in Three.js bloom)
    this.bloomPass = bloom(
      this.scenePass,
      options.bloom?.threshold || 0.8,
      options.bloom?.strength || 0.5, 
      options.bloom?.radius || 0.8
    );

    // Setup RGB Shift (built-in chromatic aberration)
    // Note: rgbShift requires constant values at construction
    this.rgbShiftPass = rgbShift(
      this.bloomPass,
      options.radialCA?.strength || 0.005,
      options.radialCA?.angle || 0.0
    );

    // Setup Gaussian Blur (for radial blur effect)
    // directionNode is optional, will blur in both directions if not specified
    this.blurPass = gaussianBlur(
      this.rgbShiftPass,
      options.radialBlur?.strength || 0.05
    );

    // Create final output with proper enable/disable for each effect
    const finalOutput = Fn(() => {
      const uvCoord = uv();
      const center = vec2(0.5, 0.5);
      
      // Start with scene (no effects)
      const sceneColor = this.scenePass.toVec3().toVar();
      const bloomColor = this.bloomPass.toVec3().toVar();
      const rgbShiftColor = this.rgbShiftPass.toVec3().toVar();
      const blurredColor = this.blurPass.toVec3().toVar();
      
      // 1. Apply bloom (mix scene with bloom based on enable)
      let color = mix(sceneColor, bloomColor, this.uniforms.bloomEnabled).toVar();
      
      // 2. Apply chromatic aberration (mix current with CA based on enable)
      color.assign(mix(color, rgbShiftColor, this.uniforms.caEnabled));
      
      // 3. Apply radial blur (mix current with blurred based on distance and enable)
      const offset = uvCoord.sub(center);
      const dist = length(offset);
      const radialMask = dist.mul(2.0); // 0 at center, 1 at edges
      const blurAmount = radialMask.mul(this.uniforms.radialBlurEnabled);
      color.assign(mix(color, blurredColor, blurAmount));
      
      return vec4(color, 1.0);
    });

    // Setup post-processing
    this.postProcessing = new THREE.PostProcessing(renderer);
    this.postProcessing.outputNode = finalOutput();
    
    // Let Three.js handle tone mapping and color space conversion
    this.postProcessing.outputColorTransform = true;
    
    console.log('✅ PostFX: Bloom + RGBShift + GaussianBlur (all built-in) with radial mask initialized');
  }

  async init(): Promise<void> {
    // Nothing to initialize
  }

  // ========================================
  // PUBLIC API
  // ========================================

  updateBloom(config: Partial<BloomConfig>): void {
    if (config.enabled !== undefined) {
      this.uniforms.bloomEnabled.value = config.enabled ? 1.0 : 0.0;
    }
    // Note: threshold, strength, radius require restart (built-in node limitation)
  }

  updateRadialBlur(config: Partial<RadialBlurConfig>): void {
    if (config.enabled !== undefined) {
      this.uniforms.radialBlurEnabled.value = config.enabled ? 1.0 : 0.0;
    }
    // Note: strength requires restart (built-in node limitation)
  }

  updateRadialCA(config: Partial<RadialCAConfig>): void {
    if (config.enabled !== undefined) {
      this.uniforms.caEnabled.value = config.enabled ? 1.0 : 0.0;
    }
    // Note: strength and angle require restart (built-in node limitation)
  }

  async render(): Promise<void> {
      await this.postProcessing.renderAsync();
  }

  dispose(): void {
    this.postProcessing.dispose();
  }
}
