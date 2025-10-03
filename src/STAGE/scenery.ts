/**
 * STAGE/scenery.ts - Complete Stage & Environment Management Module
 * 
 * Self-contained ESM module that handles:
 * - WebGPU renderer configuration (tone mapping, color space)
 * - HDR environment loading and management
 * - Scene setup (background, environment, lighting)
 * - Camera system (perspective camera + orbit controls)
 * - Shadow system (spotlight with PCF soft shadows)
 * - Complete render pipeline
 * 
 * @module STAGE/scenery
 */

import * as THREE from "three/webgpu";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import type { CameraConfig, EnvironmentConfig, ToneMappingConfig } from '../config';
import hdriFile from "../assets/qwantani_night_puresky_4k.hdr";

// ==================== Extended Configuration Interfaces ====================

export interface ExtendedEnvironmentConfig extends EnvironmentConfig {
  hdriFile?: string;
}

export interface LightingConfig {
  spotlightColor?: number;
  spotlightIntensity?: number;
  spotlightDistance?: number;
  spotlightAngle?: number;
  spotlightPosition?: THREE.Vector3;
  targetPosition?: THREE.Vector3;
  castShadow?: boolean;
  shadowMapSize?: number;
}

export interface SceneryConfig {
  // Required
  camera: CameraConfig;
  
  // Optional (all have defaults)
  environment?: ExtendedEnvironmentConfig;
  toneMapping?: ToneMappingConfig;
  lighting?: LightingConfig;
  
  // Renderer settings
  antialias?: boolean;
  shadowMap?: boolean;
  shadowMapType?: THREE.ShadowMapType;
  
  // Orbit controls
  enableDamping?: boolean;
  enablePan?: boolean;
  minDistance?: number;
  maxDistance?: number;
  minPolarAngle?: number;
  maxPolarAngle?: number;
  minAzimuthAngle?: number;
  maxAzimuthAngle?: number;
}

// ==================== Main Scenery Class ====================

/**
 * Scenery - Complete self-contained stage and environment management
 * 
 * This module is the single source of truth for all visual setup:
 * - Receives a WebGPU renderer and configures it properly
 * - Loads and manages HDR environment
 * - Controls tone mapping and color space
 * - Sets up scene, camera, lighting, and shadows
 * - Provides a complete render() method
 */
export class Scenery {
  // Core rendering
  public readonly renderer: THREE.WebGPURenderer;
  public readonly scene: THREE.Scene;
  
  // Environment
  private hdriTexture: THREE.Texture | null = null;
  private environmentConfig: ExtendedEnvironmentConfig;

  // Camera system
  public readonly camera: THREE.PerspectiveCamera;
  public readonly controls: OrbitControls;

  // Lighting system
  public readonly lights: THREE.Object3D;
  private readonly spotlight: THREE.SpotLight;
  private readonly lightTarget: THREE.Object3D;
  
  // Configuration
  private toneMappingConfig: ToneMappingConfig;

  /**
   * Create a new Scenery instance
   * @param renderer - WebGPU renderer (already initialized)
   * @param domElement - DOM element for controls
   * @param config - Complete scenery configuration
   */
  constructor(renderer: THREE.WebGPURenderer, domElement: HTMLElement, config: SceneryConfig) {
    // Store renderer reference
    this.renderer = renderer;
    
    // Extract config with defaults
    const {
      camera: cameraConfig,
      environment = {},
      toneMapping = {},
      lighting = {},
      antialias = false,
      shadowMap = true,
      shadowMapType = THREE.PCFSoftShadowMap,
      enableDamping = true,
      enablePan = false,
      minDistance = 0.1,
      maxDistance = 2.0,
      minPolarAngle = 0.2 * Math.PI,
      maxPolarAngle = 0.8 * Math.PI,
      minAzimuthAngle = 0.7 * Math.PI,
      maxAzimuthAngle = 1.3 * Math.PI,
    } = config;

    // ==================== UNIFIED COLOR/HDR/TONE MAPPING CONFIGURATION ====================
    // All color, HDR, environment, and tone mapping settings are centralized here
    // This is the SINGLE SOURCE OF TRUTH for visual output settings
    
    // Store environment config with conservative defaults to prevent overexposure
    this.environmentConfig = {
      hdriFile: hdriFile,
      environmentIntensity: 0.25,  // Conservative default (was 0.3, reduced to 0.25)
      backgroundRotation: new THREE.Euler(0, 2.15, 0),
      environmentRotation: new THREE.Euler(0, -2.15, 0),
      ...environment,
    };

    // Store tone mapping config with conservative exposure
    this.toneMappingConfig = {
      enabled: true,
      exposure: 0.5,  // Conservative default (was 0.6, reduced to 0.5)
      mode: 'ACES',   // ACES Filmic tone mapping for natural HDR→LDR conversion
      ...toneMapping,
    };

    // ==================== Configure Renderer ====================
    // Set up proper HDR → LDR pipeline
    this.applyToneMappingConfig(this.toneMappingConfig);
    
    // Enable shadows if requested
    if (shadowMap) {
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = shadowMapType;
    }

    // ==================== Initialize Scene ====================
    this.scene = new THREE.Scene();

    // ==================== Initialize Camera ====================
    this.camera = new THREE.PerspectiveCamera(
      cameraConfig.fov,
      window.innerWidth / window.innerHeight,
      cameraConfig.near,
      cameraConfig.far
    );
    this.camera.position.copy(cameraConfig.position);
    this.camera.updateProjectionMatrix();

    // ==================== Initialize Orbit Controls ====================
    this.controls = new OrbitControls(this.camera, domElement);
    this.controls.target.copy(cameraConfig.targetPosition);
    this.controls.enableDamping = enableDamping;
    this.controls.enablePan = enablePan;
    this.controls.touches = {
      TWO: THREE.TOUCH.DOLLY_ROTATE,
    };
    this.controls.minDistance = minDistance;
    this.controls.maxDistance = maxDistance;
    this.controls.minPolarAngle = minPolarAngle;
    this.controls.maxPolarAngle = maxPolarAngle;
    this.controls.minAzimuthAngle = minAzimuthAngle;
    this.controls.maxAzimuthAngle = maxAzimuthAngle;

    // ==================== Initialize Lighting ====================
    this.lights = new THREE.Object3D();
    
    // Extract lighting config with defaults
    const {
      spotlightColor = 0xffffff,
      spotlightIntensity = 5,
      spotlightDistance = 15,
      spotlightAngle = Math.PI * 0.18,
      spotlightPosition = new THREE.Vector3(0, 1.2, -0.8),
      targetPosition = new THREE.Vector3(0, 0.7, 0),
      castShadow = true,
      shadowMapSize = 1024,
    } = lighting;
    
    // Create spotlight with shadow support
    this.spotlight = new THREE.SpotLight(
      spotlightColor,
      spotlightIntensity,
      spotlightDistance,
      spotlightAngle,
      1, // penumbra
      0  // decay
    );
    
    this.lightTarget = new THREE.Object3D();
    this.spotlight.position.copy(spotlightPosition);
    this.lightTarget.position.copy(targetPosition);
    this.spotlight.target = this.lightTarget;

    this.lights.add(this.spotlight);
    this.lights.add(this.lightTarget);

    // Shadow configuration
    if (castShadow) {
      this.spotlight.castShadow = true;
      this.spotlight.shadow.mapSize.width = shadowMapSize;
      this.spotlight.shadow.mapSize.height = shadowMapSize;
      this.spotlight.shadow.bias = -0.005;
      this.spotlight.shadow.camera.near = 0.5;
      this.spotlight.shadow.camera.far = 5;
    }

    // Add lights to scene
    this.scene.add(this.lights);
  }

  // ==================== Initialization ====================

  /**
   * Initialize the scenery (load HDR environment)
   * Must be called after construction, before rendering
   */
  async init(): Promise<void> {
    // Load HDR environment
    if (this.environmentConfig.hdriFile) {
      this.hdriTexture = await this.loadHDR(this.environmentConfig.hdriFile);
      this.applyEnvironmentToScene();
      console.log('✅ HDR environment loaded and configured');
    }
  }

  /**
   * Load HDR texture with proper color space
   * HDR textures use Linear color space (no gamma encoding)
   */
  private async loadHDR(file: string): Promise<THREE.Texture> {
    return new Promise((resolve, reject) => {
      new RGBELoader().load(
        file,
        (texture) => {
          texture.mapping = THREE.EquirectangularReflectionMapping;
          // HDR textures are linear (no gamma encoding)
          texture.colorSpace = THREE.LinearSRGBColorSpace;
          resolve(texture);
        },
        undefined,
        reject
      );
    });
  }

  /**
   * Apply HDR environment to scene
   */
  private applyEnvironmentToScene(): void {
    if (!this.hdriTexture) return;

    // Apply as scene background
    this.scene.background = this.hdriTexture;
    
    // Apply as environment map for reflections/lighting
    this.scene.environment = this.hdriTexture;
    
    // Set environment intensity
    this.scene.environmentIntensity = this.environmentConfig.environmentIntensity || 0.5;
    
    // Apply rotations if specified
    if (this.environmentConfig.backgroundRotation) {
      this.scene.backgroundRotation = this.environmentConfig.backgroundRotation;
    }
    if (this.environmentConfig.environmentRotation) {
      this.scene.environmentRotation = this.environmentConfig.environmentRotation;
    }
  }

  /**
   * Apply tone mapping configuration to renderer
   * 
   * ⚠️ IMPORTANT: When PostFX is active, tone mapping is handled by the PostFX pipeline.
   * In that case, Scenery must output LINEAR HDR values (no tone mapping).
   * 
   * This method is only used for direct rendering without PostFX.
   * When PostFX is active, call disableToneMappingForPostFX() instead.
   */
  private applyToneMappingConfig(config: ToneMappingConfig): void {
    const { enabled = true, exposure = 0.5, mode = 'ACES' } = config;

    // If disabled, use no tone mapping (raw linear output)
    if (!enabled || mode === 'None') {
      this.renderer.toneMapping = THREE.NoToneMapping;
      this.renderer.toneMappingExposure = 1.0;
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      console.log('⚙️ Scenery tone mapping: DISABLED');
      return;
    }

    // Map mode string to Three.js constant
    const modeValue = mode || 'ACES';
    switch (modeValue) {
      case 'ACES':
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        break;
      case 'Reinhard':
        this.renderer.toneMapping = THREE.ReinhardToneMapping;
        break;
      case 'Cineon':
        this.renderer.toneMapping = THREE.CineonToneMapping;
        break;
      case 'Linear':
        this.renderer.toneMapping = THREE.LinearToneMapping;
        break;
      default:
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    }

    // Set exposure (lower = darker, prevents overexposure)
    this.renderer.toneMappingExposure = exposure;
    
    // Output color space MUST be sRGB for proper display
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    
    console.log(`⚙️ Scenery tone mapping: ${modeValue}, exposure: ${exposure.toFixed(2)}`);
  }

  /**
   * Disable renderer tone mapping for PostFX pipeline
   * 
   * When PostFX is active, the renderer MUST output linear HDR values
   * without any tone mapping or color space conversion.
   * PostFX will handle tone mapping in its shader pipeline.
   */
  public disableToneMappingForPostFX(): void {
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    // Output LINEAR color space for PostFX to process
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    console.log('⚙️ Scenery: Tone mapping DISABLED for PostFX pipeline (outputting linear HDR)');
  }

  // ==================== Scene Management ====================

  /**
   * Add object to scene
   */
  public add(object: THREE.Object3D): void {
    this.scene.add(object);
  }

  /**
   * Remove object from scene
   */
  public remove(object: THREE.Object3D): void {
    this.scene.remove(object);
  }

  // ==================== Update Loop ====================

  /**
   * Update controls and animated elements
   * Should be called each frame
   */
  public update(delta: number, elapsed: number): void {
    // Update orbit controls
    this.controls.update();

    // Reserved for light animations if needed
    // this.updateLighting(elapsed);
  }

  /**
   * Update lighting (for animations if needed)
   */
  private updateLighting(elapsed: number): void {
    // Reserved for dynamic lighting effects
  }

  // ==================== Environment Management ====================

  /**
   * Update environment configuration at runtime
   */
  public updateEnvironment(config: Partial<ExtendedEnvironmentConfig>): void {
    // Update stored config
    Object.assign(this.environmentConfig, config);

    // Apply changes to scene
    if (config.environmentIntensity !== undefined) {
      this.scene.environmentIntensity = config.environmentIntensity;
    }
    if (config.backgroundRotation) {
      this.scene.backgroundRotation = config.backgroundRotation;
    }
    if (config.environmentRotation) {
      this.scene.environmentRotation = config.environmentRotation;
    }
  }

  /**
   * Update tone mapping at runtime
   */
  public updateToneMapping(config: Partial<ToneMappingConfig>): void {
    Object.assign(this.toneMappingConfig, config);
    this.applyToneMappingConfig(this.toneMappingConfig);
  }

  // ==================== Camera Management ====================

  /**
   * Update camera parameters
   */
  public updateCameraParams(config: Partial<CameraConfig>): void {
    if (config.fov !== undefined) {
      this.camera.fov = config.fov;
      this.camera.updateProjectionMatrix();
    }
    if (config.near !== undefined) {
      this.camera.near = config.near;
      this.camera.updateProjectionMatrix();
    }
    if (config.far !== undefined) {
      this.camera.far = config.far;
      this.camera.updateProjectionMatrix();
    }
    if (config.position) {
      this.camera.position.copy(config.position);
    }
    if (config.targetPosition) {
      this.controls.target.copy(config.targetPosition);
    }
  }

  /**
   * Get camera raycaster for mouse picking
   */
  public createRaycaster(): THREE.Raycaster {
    return new THREE.Raycaster();
  }

  // ==================== Lighting Management ====================

  /**
   * Update spotlight parameters
   */
  public updateSpotlight(params: {
    color?: number;
    intensity?: number;
    distance?: number;
    angle?: number;
    penumbra?: number;
    decay?: number;
    position?: THREE.Vector3;
    targetPosition?: THREE.Vector3;
  }): void {
    if (params.color !== undefined) this.spotlight.color.setHex(params.color);
    if (params.intensity !== undefined) this.spotlight.intensity = params.intensity;
    if (params.distance !== undefined) this.spotlight.distance = params.distance;
    if (params.angle !== undefined) this.spotlight.angle = params.angle;
    if (params.penumbra !== undefined) this.spotlight.penumbra = params.penumbra;
    if (params.decay !== undefined) this.spotlight.decay = params.decay;
    if (params.position) this.spotlight.position.copy(params.position);
    if (params.targetPosition) this.lightTarget.position.copy(params.targetPosition);
  }

  /**
   * Get spotlight reference for advanced manipulation
   */
  public getSpotlight(): THREE.SpotLight {
    return this.spotlight;
  }

  // ==================== Rendering ====================

  /**
   * Render the scene (direct rendering without post-processing)
   */
  public async render(): Promise<void> {
    await this.renderer.renderAsync(this.scene, this.camera);
  }

  // ==================== Resize Handling ====================

  /**
   * Resize renderer and camera
   */
  public resize(width: number, height: number): void {
    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  // ==================== DOM Element ====================

  /**
   * Get renderer DOM element for mounting
   */
  public get domElement(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  // ==================== Cleanup ====================

  /**
   * Dispose of all resources
   */
  public dispose(): void {
    this.controls.dispose();
    this.spotlight.dispose();
    
    if (this.hdriTexture) {
      this.hdriTexture.dispose();
    }
    
    // Note: Renderer is managed externally, don't dispose it here
  }
}
