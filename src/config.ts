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
  
  // FLIP/PIC Hybrid
  transferMode: number; // 0=PIC, 1=FLIP, 2=HYBRID
  flipRatio: number;    // 0.0-1.0 (0=PIC, 1=FLIP)
  
  // Vorticity Confinement
  vorticityEnabled: boolean;
  vorticityEpsilon: number; // 0.0-1.0
  
  // Surface Tension
  surfaceTensionEnabled: boolean;
  surfaceTensionCoeff: number; // 0.0-2.0
  
  // Performance Optimizations
  sparseGrid: boolean; // Skip empty cells
  adaptiveTimestep: boolean; // Auto-adjust dt based on velocity
  cflTarget: number; // CFL safety factor (0.3-1.0)
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
  blendMode: 'add' | 'screen' | 'softlight';
  levels: number;
  smoothing: number;
}

export interface RadialFocusConfig {
  enabled: boolean;
  blurStrength: number;
  focusCenter: { x: number; y: number };
  focusRadius: number;
  falloffPower: number;
}

export interface RadialCAConfig {
  enabled: boolean;
  strength: number;
  angle: number;
  edgeIntensity: number;
  falloffPower: number;
}

// Legacy - keeping for compatibility
export interface ChromaticAberrationConfig {
  enabled: boolean;
  strength: number;
  radialIntensity: number;
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

export interface VignetteConfig {
  enabled: boolean;
  intensity: number;
  smoothness: number;
  roundness: number;
}

export interface FilmGrainConfig {
  enabled: boolean;
  intensity: number;
  size: number;
  speed: number;
}

export interface ColorGradingConfig {
  enabled: boolean;
  exposure: number;
  contrast: number;
  saturation: number;
  brightness: number;
  temperature: number;
  tint: number;
  shadows: THREE.Vector3;
  midtones: THREE.Vector3;
  highlights: THREE.Vector3;
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

  // Advanced analysis tuning
  historySize: number;
  featureSmoothing: number;
  fluxSmoothing: number;
  onsetSensitivity: number;
  grooveSensitivity: number;
  stereoEmphasis: number;

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

/**
 * Audio-reactive visualization configuration
 */
export interface AudioReactiveConfig {
  enabled: boolean;
  mode: number; // AudioVisualizationMode enum

  // Frequency mapping
  bassInfluence: number;      // 0-1
  midInfluence: number;       // 0-1
  trebleInfluence: number;    // 0-1
  
  // Spatial mapping
  spatialMode: number;        // SpatialMode enum
  spatialScale: number;       // Size of spatial regions
  spatialIntensity: number;   // Strength of spatial effects
  
  // Dynamic response
  inertia: number;            // Motion lag/smoothing (0-1)
  resonance: number;          // Frequency resonance strength (0-2)
  dampening: number;          // Energy dissipation (0-1)
  
  // Beat response
  beatImpulse: number;        // Force magnitude on beats (0-100)
  beatRadius: number;         // Radius of beat influence (0-50)
  beatDecay: number;          // How fast beat effects fade (1-20)
  
  // Force field generation
  forceFieldsEnabled: boolean;
  forceFieldMode: number;     // AudioForceFieldMode enum
  forceFieldStrength: number; // 0-100
  
  // Material modulation
  materialModulation: boolean;
  viscosityMin: number;       // Min viscosity (0-1)
  viscosityMax: number;       // Max viscosity (0-2)
  stiffnessMin: number;       // Min stiffness (0-500)
  stiffnessMax: number;       // Max stiffness (0-1000)

  // Visual effects
  colorReactivity: number;    // Color modulation strength (0-1)
  scaleReactivity: number;    // Size modulation strength (0-1)

  // Temporal sculpting
  timelineSmoothing: number;
  transitionResponsiveness: number;

  // Modulation routing intensities
  modulationPulseForce: number;
  modulationFlowTurbulence: number;
  modulationShimmerColor: number;
  modulationWarpSpatial: number;
  modulationDensitySpawn: number;
  modulationAuraBloom: number;
}

export interface FlowConfig {
  particles: ParticleConfig;
  simulation: SimulationConfig;
  rendering: RenderingConfig;
  camera: CameraConfig;
  bloom: BloomConfig;
  radialFocus: RadialFocusConfig;
  radialCA: RadialCAConfig;
  vignette: VignetteConfig;
  filmGrain: FilmGrainConfig;
  colorGrading: ColorGradingConfig;
  // Legacy
  chromaticAberration: ChromaticAberrationConfig;
  radialLensAberration: RadialLensAberrationConfig;
  depthOfField: DepthOfFieldConfig;
  lensDistortion: LensDistortionConfig;
  colorGrade: ColorGradeConfig;
  toneMapping: ToneMappingConfig;
  environment: EnvironmentConfig;
  audio: AudioConfig;
  audioReactive: AudioReactiveConfig;
  
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
    // During SSR/tests `navigator` may be undefined; assume non-mobile in that case.
    if (typeof navigator === "undefined" || !navigator?.userAgent) {
      return false;
    }
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
    speed: 0.5,
    stiffness: 3.0,
    restDensity: 1.0,
    density: 1.0,
    dynamicViscosity: 0.1,
    gravityType: 2,  // 0=back, 1=down, 2=center (default), 3=device
    
    // FLIP/PIC Hybrid (default: 95% FLIP, 5% PIC)
    transferMode: 2,  // 0=PIC, 1=FLIP, 2=HYBRID
    flipRatio: 0.95,  // 0.0-1.0
    
    // Vorticity Confinement (disabled by default)
    vorticityEnabled: false,
    vorticityEpsilon: 0.0,  // 0.0-1.0
    
    // Surface Tension (disabled by default)
    surfaceTensionEnabled: false,
    surfaceTensionCoeff: 0.5,  // 0.0-2.0
    
    // Performance Optimizations
    sparseGrid: true,  // Enabled by default (free performance!)
    adaptiveTimestep: true,  // Enabled by default (stability + performance)
    cflTarget: 0.7,  // Conservative CFL target (0.3-1.0)
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
    threshold: 0.7,
    strength: 0.8,
    radius: 1.0,
    blendMode: 'add',
    levels: 3,
    smoothing: 0.05,
  },
  radialFocus: {
    enabled: false,
    blurStrength: 0.3,
    focusCenter: { x: 0.5, y: 0.5 },
    focusRadius: 0.3,
    falloffPower: 2.0,
  },
  radialCA: {
    enabled: false,
    strength: 0.008,
    angle: 0.0,
    edgeIntensity: 1.5,
    falloffPower: 2.5,
  },
  vignette: {
    enabled: false,
    intensity: 0.5,
    smoothness: 0.5,
    roundness: 1.0,
  },
  filmGrain: {
    enabled: false,
    intensity: 0.05,
    size: 1.5,
    speed: 1.0,
  },
  colorGrading: {
    enabled: false,
    exposure: 1.0,
    contrast: 1.0,
    saturation: 1.0,
    brightness: 0.0,
    temperature: 0.0,
    tint: 0.0,
    shadows: new THREE.Vector3(1, 1, 1),
    midtones: new THREE.Vector3(1, 1, 1),
    highlights: new THREE.Vector3(1, 1, 1),
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
    enabled: true, // ENABLED BY DEFAULT for testing
    source: 'microphone',
    fftSize: 2048,
    smoothing: 0.88, // Higher smoothing for smoother, more fluid motion
    minDecibels: -90,
    maxDecibels: -10,
    historySize: 192,
    featureSmoothing: 0.82,
    fluxSmoothing: 0.7,
    onsetSensitivity: 0.55,
    grooveSensitivity: 0.45,
    stereoEmphasis: 1.0,
    bassGain: 1.2, // Moderate bass (reduced from 1.5)
    midGain: 1.0, // Moderate mid (reduced from 1.2)
    trebleGain: 0.9, // Slightly reduced treble
    beatDetectionEnabled: true,
    beatThreshold: 1.4, // Slightly less sensitive for stability
    beatDecay: 2.5, // Slower decay for smoother beat response
    particleInfluence: 0.5, // More influence
    volumetricInfluence: 1.0,
    colorInfluence: 0.5,
    postFXInfluence: 0.2,
  },
  audioReactive: {
    enabled: true, // ENABLED BY DEFAULT for testing
    mode: 0, // WAVE_FIELD
    bassInfluence: 1.0,
    midInfluence: 0.8,
    trebleInfluence: 0.6,
    spatialMode: 0, // LAYERED
    spatialScale: 1.0,
    spatialIntensity: 1.0,
    inertia: 0.5,
    resonance: 1.0,
    dampening: 0.3,
    beatImpulse: 50.0, // Increased for more visible effect
    beatRadius: 25.0, // Increased for larger influence
    beatDecay: 3.0, // Faster decay for more responsive
    forceFieldsEnabled: true,
    forceFieldMode: 1, // BEAT_VORTEX
    forceFieldStrength: 80.0, // Increased for stronger vortexes
    materialModulation: true,
    viscosityMin: 0.05, // More range
    viscosityMax: 1.5,
    stiffnessMin: 10, // More range
    stiffnessMax: 800,
    colorReactivity: 0.8,
    scaleReactivity: 0.3,
    timelineSmoothing: 0.65,
    transitionResponsiveness: 0.75,
    modulationPulseForce: 1.0,
    modulationFlowTurbulence: 0.8,
    modulationShimmerColor: 0.9,
    modulationWarpSpatial: 0.85,
    modulationDensitySpawn: 0.7,
    modulationAuraBloom: 0.6,
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
    radialFocus: { ...base.radialFocus, ...updates.radialFocus },
    radialCA: { ...base.radialCA, ...updates.radialCA },
    vignette: { ...base.vignette, ...updates.vignette },
    filmGrain: { ...base.filmGrain, ...updates.filmGrain },
    colorGrading: { ...base.colorGrading, ...updates.colorGrading },
    chromaticAberration: { ...base.chromaticAberration, ...updates.chromaticAberration },
    radialLensAberration: { ...base.radialLensAberration, ...updates.radialLensAberration },
    depthOfField: { ...base.depthOfField, ...updates.depthOfField },
    lensDistortion: { ...base.lensDistortion, ...updates.lensDistortion },
    colorGrade: { ...base.colorGrade, ...updates.colorGrade },
    toneMapping: { ...base.toneMapping, ...updates.toneMapping },
    environment: { ...base.environment, ...updates.environment },
    audio: { ...base.audio, ...updates.audio },
    audioReactive: { ...base.audioReactive, ...updates.audioReactive },
  };
}

