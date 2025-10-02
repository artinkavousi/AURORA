/**
 * config.ts - Typed configuration schema and defaults
 * Pure data layer with no side effects, no UI dependencies
 */

import * as THREE from "three/webgpu";

export interface ParticleConfig {
  count: number;
  maxCount: number;
  size: number;
  actualSize: number;
}

export interface SimulationConfig {
  run: boolean;
  noise: number;
  speed: number;
  stiffness: number;
  restDensity: number;
  density: number;
  dynamicViscosity: number;
  gravityType: number; // 0=back, 1=down, 2=center, 3=device
}

export interface RenderingConfig {
  bloom: boolean;
  points: boolean;
}

export interface CameraConfig {
  fov: number;
  near: number;
  far: number;
  position: THREE.Vector3;
  targetPosition: THREE.Vector3;
}

export interface BloomConfig {
  enabled: boolean;
  threshold: number;
  strength: number;
  radius: number;
  levels: number;
  smoothing: number;
}

export interface ChromaticAberrationConfig {
  enabled: boolean;
  strength: number;
  radialIntensity: number;
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

// Legacy - keeping for compatibility
export interface RadialLensAberrationConfig {
  enabled: boolean;
  strength: number;
  radialIntensity: number;
  edgeFalloff: number;
  barrelDistortion: number;
  fringing: number;
}

export interface DepthOfFieldConfig {
  enabled: boolean;
  focusDistance: number;
  focusRange: number;
  bokehSize: number;
  bokehIntensity: number;
  aperture: number;
  maxBlur: number;
}

export interface LensDistortionConfig {
  enabled: boolean;
  distortion: number;
  vignetteStrength: number;
  vignetteRadius: number;
}

export interface ColorGradeConfig {
  enabled: boolean;
  exposure: number;
  contrast: number;
  saturation: number;
  brightness: number;
  temperature: number;
  tint: number;
}

export interface EnvironmentConfig {
  backgroundRotation: THREE.Euler;
  environmentRotation: THREE.Euler;
  environmentIntensity: number;
}

export interface ToneMappingConfig {
  enabled: boolean;
  exposure: number;
  mode: 'ACES' | 'Reinhard' | 'Cineon' | 'Linear' | 'None';
}

export interface AudioConfig {
  enabled: boolean;
  source: 'microphone' | 'file';
  fftSize: number;
  smoothing: number;
  minDecibels: number;
  maxDecibels: number;
  
  // Frequency band gains
  bassGain: number;
  midGain: number;
  trebleGain: number;
  
  // Beat detection
  beatDetectionEnabled: boolean;
  beatThreshold: number;
  beatDecay: number;
  
  // Reactivity mapping
  particleInfluence: number;
  volumetricInfluence: number;
  colorInfluence: number;
  postFXInfluence: number;
}

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

export interface FlowConfig {
  particles: ParticleConfig;
  simulation: SimulationConfig;
  rendering: RenderingConfig;
  camera: CameraConfig;
  bloom: BloomConfig;
  radialBlur: RadialBlurConfig;
  radialCA: RadialCAConfig;
  // Legacy
  chromaticAberration: ChromaticAberrationConfig;
  radialLensAberration: RadialLensAberrationConfig;
  depthOfField: DepthOfFieldConfig;
  lensDistortion: LensDistortionConfig;
  colorGrade: ColorGradeConfig;
  toneMapping: ToneMappingConfig;
  environment: EnvironmentConfig;
  audio: AudioConfig;
  volumetric: VolumetricConfig;
  
  // Device sensors
  gravitySensorReading: THREE.Vector3;
  accelerometerReading: THREE.Vector3;
}

// Check if mobile to set appropriate defaults
const isMobile = (): boolean => {
  try {
    const mobile = require("is-mobile");
    return mobile();
  } catch {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }
};

const mobile = isMobile();

export const defaultConfig: FlowConfig = {
  particles: {
    count: mobile ? 4096 : 8192 * 4,
    maxCount: mobile ? 8192 * 8 : 8192 * 16,
    size: 1.0,
    actualSize: 1.0,
  },
  simulation: {
    run: true,
    noise: 1.0,
    speed: 1.0,
    stiffness: 3.0,
    restDensity: 1.0,
    density: 1.0,
    dynamicViscosity: 0.1,
    gravityType: 0,
  },
  rendering: {
    bloom: true,
    points: false,
  },
  camera: {
    fov: 60,
    near: 0.01,
    far: 5,
    // Optimized for viewport mode (NONE) - particles at (0, 0.5, 0.2)
    position: new THREE.Vector3(0, 0.6, -0.9),
    targetPosition: new THREE.Vector3(0, 0.5, 0.15),
  },
  bloom: {
    enabled: true,
    threshold: 0.8,
    strength: 0.5,
    radius: 0.8,
    levels: 3,
    smoothing: 0.05,
  },
  radialBlur: {
    enabled: false,
    strength: 0.05,
  },
  radialCA: {
    enabled: false,
    strength: 0.005,
    angle: 0.0,
  },
  // Legacy
  chromaticAberration: {
    enabled: false,
    strength: 0.005,
    radialIntensity: 1.5,
  },
  radialLensAberration: {
    enabled: true,
    strength: 0.004,          // Reduced for subtlety
    radialIntensity: 1.5,     // Reduced
    edgeFalloff: 2.0,         // Gentler falloff
    barrelDistortion: 0.02,   // Very subtle
    fringing: 0.3,            // Much less fringing
  },
  depthOfField: {
    enabled: true,
    focusDistance: 0.3,
    focusRange: 0.2,           // Wider focus range
    bokehSize: 0.012,          // Smaller blur
    bokehIntensity: 0.8,       // Reduced intensity
    aperture: 4.0,             // Narrower aperture
    maxBlur: 0.8,              // Less max blur
  },
  lensDistortion: {
    enabled: false,
    distortion: 0.15,      // blur size (0-0.5)
    vignetteStrength: 1.0, // max blur amount (0-2.0)
    vignetteRadius: 2.0,   // focus falloff (0.5-4.0)
  },
  colorGrade: {
    enabled: false,          // Disabled by default - neutral passthrough
    exposure: 1.0,           // Neutral
    contrast: 1.0,           // Neutral (was 1.05)
    saturation: 1.0,         // Neutral (was 1.1 - causing color shift!)
    brightness: 0.0,         // Neutral
    temperature: 0.0,        // Neutral
    tint: 0.0,               // Neutral
  },
  // ==================== TONE MAPPING & ENVIRONMENT ====================
  // These settings are managed by Scenery.ts (single source of truth)
  // Values here are just defaults passed to Scenery during initialization
  toneMapping: {
    enabled: true,
    exposure: 0.5,  // Conservative default to prevent overexposure
    mode: 'ACES',   // ACES Filmic provides natural HDR→LDR conversion
  },
  environment: {
    backgroundRotation: new THREE.Euler(0, 2.15, 0),
    environmentRotation: new THREE.Euler(0, -2.15, 0),
    environmentIntensity: 0.25,  // Conservative default to prevent overexposure
  },
  audio: {
    enabled: false,
    source: 'microphone',
    fftSize: 2048,
    smoothing: 0.8,
    minDecibels: -90,
    maxDecibels: -10,
    bassGain: 1.0,
    midGain: 1.0,
    trebleGain: 1.0,
    beatDetectionEnabled: true,
    beatThreshold: 1.5,
    beatDecay: 4.0,
    particleInfluence: 0.3,
    volumetricInfluence: 1.0,
    colorInfluence: 0.5,
    postFXInfluence: 0.2,
  },
  volumetric: {
    enabled: false,
    mode: 'sphere',
    scale: 1.0,
    complexity: 8.0,
    speed: 1.0,
    colorMode: 'rainbow',
    hue: 0.5,
    saturation: 0.8,
    brightness: 1.0,
    rotationSpeed: 0.5,
    pulseIntensity: 1.0,
    waveAmplitude: 1.0,
    glowIntensity: 2.0,
    opacity: 0.6,
    bassInfluence: 1.5,
    midInfluence: 0.8,
    trebleInfluence: 0.4,
  },
  gravitySensorReading: new THREE.Vector3(),
  accelerometerReading: new THREE.Vector3(),
};

/**
 * Computes derived parameters based on particle count and size
 */
export function updateParticleParams(config: FlowConfig): void {
  const level = Math.max(config.particles.count / 8192, 1);
  const size = 1.6 / Math.pow(level, 1 / 3);
  config.particles.actualSize = size * config.particles.size;
  config.simulation.restDensity = 0.25 * level * config.simulation.density;
}

/**
 * Deep merge config with partial updates
 */
export function mergeConfig(base: FlowConfig, updates: Partial<FlowConfig>): FlowConfig {
  return {
    ...base,
    ...updates,
    particles: { ...base.particles, ...updates.particles },
    simulation: { ...base.simulation, ...updates.simulation },
    rendering: { ...base.rendering, ...updates.rendering },
    camera: { ...base.camera, ...updates.camera },
    bloom: { ...base.bloom, ...updates.bloom },
    chromaticAberration: { ...base.chromaticAberration, ...updates.chromaticAberration },
    radialLensAberration: { ...base.radialLensAberration, ...updates.radialLensAberration },
    depthOfField: { ...base.depthOfField, ...updates.depthOfField },
    lensDistortion: { ...base.lensDistortion, ...updates.lensDistortion },
    colorGrade: { ...base.colorGrade, ...updates.colorGrade },
    toneMapping: { ...base.toneMapping, ...updates.toneMapping },
    environment: { ...base.environment, ...updates.environment },
    audio: { ...base.audio, ...updates.audio },
    volumetric: { ...base.volumetric, ...updates.volumetric },
  };
}

