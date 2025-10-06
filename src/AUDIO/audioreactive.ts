/**
 * AUDIO/audioreactive.ts - Audio-reactive particle physics behaviors
 * Single responsibility: Audio → Particle dynamics mapping (TSL/WebGPU)
 */

import * as THREE from "three/webgpu";
import {
  Fn,
  If,
  uniform,
  instanceIndex,
  float,
  vec3,
  vec4,
  int,
  sin,
  cos,
  length,
  normalize,
  dot,
  cross,
  time,
  mix,
  smoothstep,
  pow,
  clamp,
} from "three/tsl";
import type { AudioData } from './soundreactivity';
import type { ForceFieldManager, ForceFieldConfig } from '../PARTICLESYSTEM/physic/forcefields';
import type { AudioReactiveConfig as SharedAudioReactiveConfig } from '../config';
import { ForceFieldType, ForceFalloff } from '../PARTICLESYSTEM/physic/forcefields';

/**
 * Audio visualization modes
 */
export enum AudioVisualizationMode {
  WAVE_FIELD = 0,        // Spatial wave patterns
  FREQUENCY_TOWERS = 1,  // Vertical frequency columns
  VORTEX_DANCE = 2,      // Beat-driven vortexes
  MORPHOLOGICAL = 3,     // Shape-forming clusters
  GALAXY_SPIRAL = 4,     // Spiral orbital patterns
  KINETIC_FLOW = 5,      // Velocity field visualization
  FRACTAL_BURST = 6,     // Beat-triggered fractals
  HARMONIC_LATTICE = 7,  // Oscillating grid structure
}

/**
 * Spatial audio mapping modes
 */
export enum SpatialMode {
  LAYERED = 0,    // Vertical layers (bass→mid→treble)
  RADIAL = 1,     // Concentric spheres
  ZONED = 2,      // Discrete spatial regions
  GRADIENT = 3,   // Smooth spatial interpolation
}

/**
 * Audio-reactive force field modes
 */
export enum AudioForceFieldMode {
  NONE = 0,               // No force fields
  BEAT_VORTEX = 1,        // Vortex on beat
  FREQUENCY_ATTRACT = 2,  // Frequency-based attractors
  HARMONIC_GRID = 3,      // Grid of oscillating forces
  TURBULENT_CASCADE = 4,  // Energy cascade simulation
}

/**
 * Audio-reactive configuration
 */
export interface AudioReactiveConfig extends Omit<SharedAudioReactiveConfig, "mode" | "spatialMode" | "forceFieldMode"> {
  mode: AudioVisualizationMode;
  spatialMode: SpatialMode;
  forceFieldMode: AudioForceFieldMode;
}

/**
 * Default configuration
 */
export const DEFAULT_AUDIO_REACTIVE_CONFIG: AudioReactiveConfig = {
  enabled: false,
  mode: AudioVisualizationMode.WAVE_FIELD,
  
  bassInfluence: 1.0,
  midInfluence: 0.8,
  trebleInfluence: 0.6,
  
  spatialMode: SpatialMode.LAYERED,
  spatialScale: 1.0,
  spatialIntensity: 1.0,
  
  inertia: 0.5,
  resonance: 1.0,
  dampening: 0.3,
  
  beatImpulse: 20.0,
  beatRadius: 15.0,
  beatDecay: 5.0,
  
  forceFieldsEnabled: true,
  forceFieldMode: AudioForceFieldMode.BEAT_VORTEX,
  forceFieldStrength: 30.0,
  
  materialModulation: true,
  viscosityMin: 0.1,
  viscosityMax: 1.0,
  stiffnessMin: 50,
  stiffnessMax: 500,

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
};

/**
 * Audio-reactive behavior system
 * Manages audio→particle physics integration
 */
export class AudioReactiveBehavior {
  private config: AudioReactiveConfig;
  private renderer: THREE.WebGPURenderer;
  private forceFieldManager: ForceFieldManager | null = null;
  
  // GPU uniforms for audio data
  private audioUniforms = {
    bass: uniform(0),
    mid: uniform(0),
    treble: uniform(0),
    overall: uniform(0),
    beatIntensity: uniform(0),
    beatActive: uniform(0, 'int'),
    peakFrequency: uniform(0),
    spectralFlux: uniform(0),
    harmonicRatio: uniform(0),
    harmonicEnergy: uniform(0),
    onsetEnergy: uniform(0),
    rhythmConfidence: uniform(0),
    tempo: uniform(120),
    tempoPhase: uniform(0),
    overallTrend: uniform(0),
    stereoBalance: uniform(0),
    stereoWidth: uniform(0),
    groove: uniform(0),

    // Smoothed values for animations
    smoothBass: uniform(0),
    smoothMid: uniform(0),
    smoothTreble: uniform(0),

    // Configuration
    bassInfluence: uniform(1.0),
    midInfluence: uniform(0.8),
    trebleInfluence: uniform(0.6),
    
    spatialMode: uniform(SpatialMode.LAYERED, 'int'),
    spatialScale: uniform(1.0),
    spatialIntensity: uniform(1.0),
    
    inertia: uniform(0.5),
    resonance: uniform(1.0),
    dampening: uniform(0.3),
    
    beatImpulse: uniform(20.0),
    beatRadius: uniform(15.0),

    colorReactivity: uniform(0.8),
    scaleReactivity: uniform(0.3),
    timelineSmoothing: uniform(0.65),
    transitionResponsiveness: uniform(0.75),
    modulationPulseForce: uniform(1.0),
    modulationFlowTurbulence: uniform(0.8),
    modulationShimmerColor: uniform(0.9),
    modulationWarpSpatial: uniform(0.85),
    modulationDensitySpawn: uniform(0.7),
    modulationAuraBloom: uniform(0.6),

    // Modulation bus snapshot
    modPulse: uniform(0),
    modFlow: uniform(0),
    modShimmer: uniform(0),
    modWarp: uniform(0),
    modDensity: uniform(0),
    modAura: uniform(0),
  };
  
  // Beat-triggered vortex tracking
  private activeVortexes: Array<{
    position: THREE.Vector3;
    axis: THREE.Vector3;
    strength: number;
    age: number;
    lifetime: number;
  }> = [];
  private maxVortexes = 4;
  
  constructor(renderer: THREE.WebGPURenderer, config: Partial<AudioReactiveConfig> = {}) {
    this.renderer = renderer;
    this.config = { ...DEFAULT_AUDIO_REACTIVE_CONFIG, ...config };
    this.updateUniforms();
  }
  
  /**
   * Update configuration
   */
  updateConfig(config: Partial<AudioReactiveConfig>): void {
    Object.assign(this.config, config);
    this.updateUniforms();
  }
  
  /**
   * Sync config to GPU uniforms
   */
  private updateUniforms(): void {
    this.audioUniforms.bassInfluence.value = this.config.bassInfluence;
    this.audioUniforms.midInfluence.value = this.config.midInfluence;
    this.audioUniforms.trebleInfluence.value = this.config.trebleInfluence;
    this.audioUniforms.spatialMode.value = this.config.spatialMode;
    this.audioUniforms.spatialScale.value = this.config.spatialScale;
    this.audioUniforms.spatialIntensity.value = this.config.spatialIntensity;
    this.audioUniforms.inertia.value = this.config.inertia;
    this.audioUniforms.resonance.value = this.config.resonance;
    this.audioUniforms.dampening.value = this.config.dampening;
    this.audioUniforms.beatImpulse.value = this.config.beatImpulse;
    this.audioUniforms.beatRadius.value = this.config.beatRadius;
    this.audioUniforms.colorReactivity.value = this.config.colorReactivity;
    this.audioUniforms.scaleReactivity.value = this.config.scaleReactivity;
    this.audioUniforms.timelineSmoothing.value = this.config.timelineSmoothing;
    this.audioUniforms.transitionResponsiveness.value = this.config.transitionResponsiveness;
    this.audioUniforms.modulationPulseForce.value = this.config.modulationPulseForce;
    this.audioUniforms.modulationFlowTurbulence.value = this.config.modulationFlowTurbulence;
    this.audioUniforms.modulationShimmerColor.value = this.config.modulationShimmerColor;
    this.audioUniforms.modulationWarpSpatial.value = this.config.modulationWarpSpatial;
    this.audioUniforms.modulationDensitySpawn.value = this.config.modulationDensitySpawn;
    this.audioUniforms.modulationAuraBloom.value = this.config.modulationAuraBloom;
  }
  
  /**
   * Update audio data to GPU
   */
  updateAudioData(audioData: AudioData): void {
    this.audioUniforms.bass.value = audioData.bass;
    this.audioUniforms.mid.value = audioData.mid;
    this.audioUniforms.treble.value = audioData.treble;
    this.audioUniforms.overall.value = audioData.overall;
    this.audioUniforms.beatIntensity.value = audioData.beatIntensity;
    this.audioUniforms.beatActive.value = audioData.isBeat ? 1 : 0;
    this.audioUniforms.peakFrequency.value = audioData.peakFrequency;
    this.audioUniforms.smoothBass.value = audioData.smoothBass;
    this.audioUniforms.smoothMid.value = audioData.smoothMid;
    this.audioUniforms.smoothTreble.value = audioData.smoothTreble;
    this.audioUniforms.spectralFlux.value = audioData.features.spectralFlux;
    this.audioUniforms.harmonicRatio.value = audioData.features.harmonicRatio;
    this.audioUniforms.harmonicEnergy.value = audioData.features.harmonicEnergy;
    this.audioUniforms.onsetEnergy.value = audioData.features.onsetEnergy;
    this.audioUniforms.rhythmConfidence.value = audioData.features.rhythmConfidence;
    this.audioUniforms.tempo.value = audioData.features.tempo;
    this.audioUniforms.tempoPhase.value = audioData.tempoPhase;
    this.audioUniforms.overallTrend.value = audioData.overallTrend;
    this.audioUniforms.stereoBalance.value = audioData.features.stereoBalance;
    this.audioUniforms.stereoWidth.value = audioData.features.stereoWidth;
    this.audioUniforms.groove.value = audioData.features.groove;
    this.audioUniforms.modPulse.value = audioData.modulators.pulse;
    this.audioUniforms.modFlow.value = audioData.modulators.flow;
    this.audioUniforms.modShimmer.value = audioData.modulators.shimmer;
    this.audioUniforms.modWarp.value = audioData.modulators.warp;
    this.audioUniforms.modDensity.value = audioData.modulators.density;
    this.audioUniforms.modAura.value = audioData.modulators.aura;
  }
  
  /**
   * Set force field manager for audio-reactive force fields
   */
  setForceFieldManager(manager: ForceFieldManager): void {
    this.forceFieldManager = manager;
  }
  
  /**
   * Update beat-triggered effects (vortexes, etc.)
   */
  updateBeatEffects(audioData: AudioData, deltaTime: number, gridSize: THREE.Vector3): void {
    if (!this.config.forceFieldsEnabled || !this.forceFieldManager) return;
    
    // Age existing vortexes
    this.activeVortexes = this.activeVortexes.filter(vortex => {
      vortex.age += deltaTime;
      return vortex.age < vortex.lifetime;
    });
    
    const dynamicMax = Math.max(
      2,
      Math.round(this.maxVortexes + audioData.modulators.density * this.config.modulationDensitySpawn * 3)
    );

    // Spawn new vortex on beat
    if (audioData.isBeat && this.activeVortexes.length < dynamicMax) {
      const beatStrength = audioData.beatIntensity;
      const pulseFactor = 0.6 + audioData.modulators.pulse * this.config.modulationPulseForce;
      const warpFactor = 0.7 + audioData.modulators.warp * this.config.modulationWarpSpatial * 0.6;
      const densityFactor = 0.6 + audioData.modulators.density * this.config.modulationDensitySpawn;
      const flowLift = audioData.modulators.flow * this.config.modulationFlowTurbulence;
      const balance = THREE.MathUtils.clamp(audioData.features.stereoBalance, -1, 1);
      const heightPhase = THREE.MathUtils.lerp(0.2, 0.8, audioData.tempoPhase);

      if (this.config.forceFieldMode === AudioForceFieldMode.BEAT_VORTEX) {
        const posX = THREE.MathUtils.clamp(
          gridSize.x * (0.5 + (Math.random() - 0.5) * 0.8 + balance * warpFactor * 0.25),
          0,
          gridSize.x
        );
        const posY = THREE.MathUtils.clamp(gridSize.y * heightPhase, gridSize.y * 0.15, gridSize.y * 0.9);
        const posZ = THREE.MathUtils.clamp(
          gridSize.z * (0.5 + (Math.random() - 0.5) * densityFactor * 0.6),
          0,
          gridSize.z
        );

        const position = new THREE.Vector3(posX, posY, posZ);
        const axis = new THREE.Vector3(
          (Math.random() - 0.5) * (0.2 + warpFactor * 0.3) + balance * 0.4,
          0.4 + Math.random() * 0.6 + flowLift * 0.5,
          (Math.random() - 0.5) * (0.2 + warpFactor * 0.3) - balance * 0.4
        ).normalize();

        const strength = this.config.forceFieldStrength * beatStrength * pulseFactor;
        const bassRatio = audioData.bass / (audioData.overall + 0.001);
        const lifetime = 0.8 + bassRatio * (1.5 + flowLift);
        const radius = this.config.beatRadius * warpFactor;

        this.activeVortexes.push({
          position,
          axis,
          strength,
          age: 0,
          lifetime,
        });

        this.forceFieldManager.addField({
          type: ForceFieldType.VORTEX,
          enabled: true,
          position: position.clone(),
          direction: new THREE.Vector3(0, 1, 0),
          rotation: new THREE.Euler(),
          strength,
          radius,
          falloff: ForceFalloff.SMOOTH,
          vortexAxis: axis.clone(),
          turbulenceScale: 1.0 + audioData.modulators.shimmer * this.config.modulationShimmerColor,
          turbulenceOctaves: 2,
          noiseSpeed: 1.0 + audioData.features.spectralFlux * 1.5,
          animated: true,
          animationSpeed: 1.0 + audioData.modulators.shimmer * 0.5,
          animationAmplitude: audioData.modulators.aura * this.config.modulationAuraBloom * 2.0,
        });
      }
    }
    
    // Update active vortex strengths (decay over lifetime)
    // Note: In real implementation, we'd track field indices and update them
    // For now, force fields auto-manage themselves via the manager
  }
  
  /**
   * Calculate material property modulation based on audio
   */
  getMaterialModulation(audioData: AudioData): {
    viscosity: number;
    stiffness: number;
  } {
    if (!this.config.materialModulation) {
      return { viscosity: 0.5, stiffness: 250 };
    }
    
    const viscosityMix = THREE.MathUtils.clamp(
      audioData.smoothBass * 0.5 + audioData.modulators.flow * this.config.modulationFlowTurbulence * 0.5,
      0,
      1
    );
    const viscosity = THREE.MathUtils.lerp(
      this.config.viscosityMin,
      this.config.viscosityMax,
      viscosityMix
    );

    const stiffnessMix = THREE.MathUtils.clamp(
      audioData.overall * 0.4 +
        audioData.beatIntensity * 0.2 +
        audioData.modulators.pulse * this.config.modulationPulseForce * 0.4,
      0,
      1
    );
    const stiffness = THREE.MathUtils.lerp(
      this.config.stiffnessMin,
      this.config.stiffnessMax,
      stiffnessMix
    );

    return { viscosity, stiffness };
  }
  
  /**
   * TSL function: Calculate spatial audio influence for a particle position
   * Returns influence factor (0-1) based on spatial mode
   */
  generateSpatialInfluenceTSL() {
    return Fn(([particlePos, gridSize, audioData]) => {
      const influence = vec3(1, 1, 1).toVar('influence');
      const normalizedPos = particlePos.div(gridSize).toVar('normalizedPos');
      
      // LAYERED mode: Vertical layers (bass=bottom, mid=middle, treble=top)
      If(this.audioUniforms.spatialMode.equal(int(SpatialMode.LAYERED)), () => {
        const heightNorm = normalizedPos.y.toConst('heightNorm');
        
        // Bass influence (0-0.33 height)
        const bassZone = smoothstep(0.4, 0.0, heightNorm);
        influence.x.assign(bassZone);
        
        // Mid influence (0.33-0.66 height)
        const midZone = smoothstep(0.0, 0.5, heightNorm).mul(smoothstep(1.0, 0.5, heightNorm));
        influence.y.assign(midZone);
        
        // Treble influence (0.66-1.0 height)
        const trebleZone = smoothstep(0.6, 1.0, heightNorm);
        influence.z.assign(trebleZone);
      })
      
      // RADIAL mode: Concentric spheres from center
      .ElseIf(this.audioUniforms.spatialMode.equal(int(SpatialMode.RADIAL)), () => {
        const center = vec3(0.5).toConst('center');
        const distFromCenter = length(normalizedPos.sub(center)).toConst('distFromCenter');
        
        // Bass = outer shell
        const bassShell = smoothstep(0.7, 1.0, distFromCenter);
        influence.x.assign(bassShell);
        
        // Mid = middle shell
        const midShell = smoothstep(0.3, 0.5, distFromCenter).mul(smoothstep(0.7, 0.5, distFromCenter));
        influence.y.assign(midShell);
        
        // Treble = inner core
        const trebleCore = smoothstep(0.3, 0.0, distFromCenter);
        influence.z.assign(trebleCore);
      })
      
      // ZONED mode: Discrete regions (left=bass, center=mid, right=treble)
      .ElseIf(this.audioUniforms.spatialMode.equal(int(SpatialMode.ZONED)), () => {
        const xNorm = normalizedPos.x.toConst('xNorm');
        
        // Bass zone (0-0.33)
        const bassZone = smoothstep(0.4, 0.0, xNorm);
        influence.x.assign(bassZone);
        
        // Mid zone (0.33-0.66)
        const midZone = smoothstep(0.25, 0.5, xNorm).mul(smoothstep(0.75, 0.5, xNorm));
        influence.y.assign(midZone);
        
        // Treble zone (0.66-1.0)
        const trebleZone = smoothstep(0.6, 1.0, xNorm);
        influence.z.assign(trebleZone);
      })
      
      // GRADIENT mode: Smooth spatial gradient
      .Else(() => {
        // Gradient from bass (bottom-left) to treble (top-right)
        const gradientFactor = normalizedPos.x.mul(0.5).add(normalizedPos.y.mul(0.5)).toConst('gradientFactor');
        
        influence.x.assign(smoothstep(0.6, 0.0, gradientFactor)); // Bass
        influence.y.assign(smoothstep(0.2, 0.5, gradientFactor).mul(smoothstep(0.8, 0.5, gradientFactor))); // Mid
        influence.z.assign(smoothstep(0.4, 1.0, gradientFactor)); // Treble
      });
      
      return influence;
    }).setLayout({
      name: 'calculateSpatialInfluence',
      type: 'vec3',
      inputs: [
        { name: 'particlePos', type: 'vec3' },
        { name: 'gridSize', type: 'vec3' },
        { name: 'audioData', type: 'vec4' }, // Placeholder for future structured audio data
      ],
    });
  }
  
  /**
   * Get audio uniforms for TSL shader integration
   */
  getAudioUniforms() {
    return this.audioUniforms;
  }
  
  /**
   * Dispose resources
   */
  dispose(): void {
    // Clear active vortexes
    this.activeVortexes = [];
  }
}

