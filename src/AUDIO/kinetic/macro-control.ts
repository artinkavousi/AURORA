/**
 * AUDIO/kinetic/macro-control.ts - Macro Control System
 * 
 * High-level macro controls that affect multiple parameters simultaneously
 * Provides intuitive, instrument-style control over complex systems
 */

import type { EnhancedAudioData } from '../core/enhanced-audio-analyzer';
import type { PersonalityConfig } from './personality-engine';
import type { GestureType } from './gesture-primitives';
import { PersonalityType } from './personality-profiles';

/**
 * Macro parameter types
 */
export enum MacroType {
  INTENSITY = 'intensity',           // Overall system intensity (0-1)
  CHAOS = 'chaos',                   // Order vs chaos (0-1)
  SMOOTHNESS = 'smoothness',         // Choppy vs smooth (0-1)
  RESPONSIVENESS = 'responsiveness', // Slow vs instant (0-1)
  DENSITY = 'density',               // Sparse vs dense (0-1)
  ENERGY = 'energy',                 // Calm vs energetic (0-1)
  COHERENCE = 'coherence',          // Independent vs synchronized (0-1)
  COMPLEXITY = 'complexity',         // Simple vs complex (0-1)
}

/**
 * Macro control value
 */
export interface MacroControl {
  type: MacroType;
  value: number;           // 0-1 normalized
  target: number;          // Target value (for smooth transitions)
  smoothing: number;       // Transition smoothing factor
}

/**
 * Macro state affecting all systems
 */
export interface MacroState {
  intensity: number;
  chaos: number;
  smoothness: number;
  responsiveness: number;
  density: number;
  energy: number;
  coherence: number;
  complexity: number;
  
  // Computed influence on subsystems
  gestureInfluence: Record<GestureType, number>;
  personalityWeights: Record<PersonalityType, number>;
  formationBias: string[];
  spatialSpread: number;
}

/**
 * Macro preset configuration
 */
export interface MacroPreset {
  name: string;
  description: string;
  icon: string;
  values: Partial<Record<MacroType, number>>;
  tags: string[];
}

/**
 * Predefined macro presets
 */
export const MACRO_PRESETS: MacroPreset[] = [
  {
    name: 'Zen Garden',
    description: 'Calm, smooth, coherent motion with minimal chaos',
    icon: '🧘',
    values: {
      [MacroType.INTENSITY]: 0.3,
      [MacroType.CHAOS]: 0.1,
      [MacroType.SMOOTHNESS]: 0.9,
      [MacroType.RESPONSIVENESS]: 0.3,
      [MacroType.DENSITY]: 0.5,
      [MacroType.ENERGY]: 0.2,
      [MacroType.COHERENCE]: 0.8,
      [MacroType.COMPLEXITY]: 0.3,
    },
    tags: ['calm', 'meditative', 'smooth'],
  },
  {
    name: 'Electric Storm',
    description: 'High energy, chaotic, highly responsive',
    icon: '⚡',
    values: {
      [MacroType.INTENSITY]: 0.9,
      [MacroType.CHAOS]: 0.8,
      [MacroType.SMOOTHNESS]: 0.2,
      [MacroType.RESPONSIVENESS]: 0.95,
      [MacroType.DENSITY]: 0.7,
      [MacroType.ENERGY]: 1.0,
      [MacroType.COHERENCE]: 0.3,
      [MacroType.COMPLEXITY]: 0.9,
    },
    tags: ['energetic', 'chaotic', 'intense'],
  },
  {
    name: 'Flowing Water',
    description: 'Smooth, coherent, fluid motion',
    icon: '🌊',
    values: {
      [MacroType.INTENSITY]: 0.6,
      [MacroType.CHAOS]: 0.2,
      [MacroType.SMOOTHNESS]: 1.0,
      [MacroType.RESPONSIVENESS]: 0.5,
      [MacroType.DENSITY]: 0.6,
      [MacroType.ENERGY]: 0.5,
      [MacroType.COHERENCE]: 0.9,
      [MacroType.COMPLEXITY]: 0.5,
    },
    tags: ['fluid', 'smooth', 'coherent'],
  },
  {
    name: 'Cosmic Dance',
    description: 'Complex, synchronized, ethereal patterns',
    icon: '✨',
    values: {
      [MacroType.INTENSITY]: 0.7,
      [MacroType.CHAOS]: 0.4,
      [MacroType.SMOOTHNESS]: 0.7,
      [MacroType.RESPONSIVENESS]: 0.6,
      [MacroType.DENSITY]: 0.8,
      [MacroType.ENERGY]: 0.6,
      [MacroType.COHERENCE]: 0.8,
      [MacroType.COMPLEXITY]: 0.9,
    },
    tags: ['ethereal', 'complex', 'synchronized'],
  },
  {
    name: 'Primal Rhythm',
    description: 'Beat-locked, powerful, aggressive',
    icon: '🥁',
    values: {
      [MacroType.INTENSITY]: 0.8,
      [MacroType.CHAOS]: 0.3,
      [MacroType.SMOOTHNESS]: 0.4,
      [MacroType.RESPONSIVENESS]: 0.9,
      [MacroType.DENSITY]: 0.6,
      [MacroType.ENERGY]: 0.9,
      [MacroType.COHERENCE]: 0.7,
      [MacroType.COMPLEXITY]: 0.6,
    },
    tags: ['rhythmic', 'powerful', 'beat-driven'],
  },
  {
    name: 'Gentle Breeze',
    description: 'Soft, subtle, delicate motion',
    icon: '🍃',
    values: {
      [MacroType.INTENSITY]: 0.4,
      [MacroType.CHAOS]: 0.2,
      [MacroType.SMOOTHNESS]: 0.85,
      [MacroType.RESPONSIVENESS]: 0.4,
      [MacroType.DENSITY]: 0.4,
      [MacroType.ENERGY]: 0.3,
      [MacroType.COHERENCE]: 0.6,
      [MacroType.COMPLEXITY]: 0.4,
    },
    tags: ['gentle', 'subtle', 'delicate'],
  },
];

/**
 * MacroControlSystem - High-level control over all audio reactive systems
 */
export class MacroControlSystem {
  private macros: Map<MacroType, MacroControl> = new Map();
  private smoothing: number = 0.85;
  
  constructor() {
    // Initialize all macros with default values (0.5)
    for (const type of Object.values(MacroType)) {
      this.macros.set(type as MacroType, {
        type: type as MacroType,
        value: 0.5,
        target: 0.5,
        smoothing: this.smoothing,
      });
    }
  }
  
  /**
   * Set macro value (with smoothing)
   */
  setMacro(type: MacroType, value: number): void {
    const macro = this.macros.get(type);
    if (macro) {
      macro.target = Math.max(0, Math.min(1, value));
    }
  }
  
  /**
   * Get macro value
   */
  getMacro(type: MacroType): number {
    return this.macros.get(type)?.value || 0.5;
  }
  
  /**
   * Apply preset
   */
  applyPreset(preset: MacroPreset): void {
    for (const [type, value] of Object.entries(preset.values)) {
      this.setMacro(type as MacroType, value);
    }
  }
  
  /**
   * Update macro values (smooth interpolation)
   */
  update(deltaTime: number): void {
    for (const macro of this.macros.values()) {
      const diff = macro.target - macro.value;
      macro.value += diff * (1 - Math.pow(macro.smoothing, deltaTime * 60));
    }
  }
  
  /**
   * Compute macro state and influences
   */
  computeState(): MacroState {
    const intensity = this.getMacro(MacroType.INTENSITY);
    const chaos = this.getMacro(MacroType.CHAOS);
    const smoothness = this.getMacro(MacroType.SMOOTHNESS);
    const responsiveness = this.getMacro(MacroType.RESPONSIVENESS);
    const density = this.getMacro(MacroType.DENSITY);
    const energy = this.getMacro(MacroType.ENERGY);
    const coherence = this.getMacro(MacroType.COHERENCE);
    const complexity = this.getMacro(MacroType.COMPLEXITY);
    
    // Compute gesture influences
    const gestureInfluence = this.computeGestureInfluence(
      energy,
      chaos,
      smoothness,
      responsiveness
    );
    
    // Compute personality weights
    const personalityWeights = this.computePersonalityWeights(
      energy,
      chaos,
      smoothness,
      coherence
    );
    
    // Compute formation bias
    const formationBias = this.computeFormationBias(
      chaos,
      coherence,
      complexity
    );
    
    // Compute spatial spread
    const spatialSpread = this.computeSpatialSpread(
      density,
      coherence,
      chaos
    );
    
    return {
      intensity,
      chaos,
      smoothness,
      responsiveness,
      density,
      energy,
      coherence,
      complexity,
      gestureInfluence,
      personalityWeights,
      formationBias,
      spatialSpread,
    };
  }
  
  /**
   * Apply macro state to personality config
   */
  applyToPersonalityConfig(config: PersonalityConfig, state: MacroState): PersonalityConfig {
    return {
      ...config,
      randomization: state.chaos * 0.5,
      globalInfluence: state.coherence,
      blendSmoothing: state.smoothness,
      assignmentStability: 1.0 - state.responsiveness * 0.5,
    };
  }
  
  /**
   * Compute gesture influence from macro parameters
   */
  private computeGestureInfluence(
    energy: number,
    chaos: number,
    smoothness: number,
    responsiveness: number
  ): Record<GestureType, number> {
    return {
      'Swell': smoothness * (1 - energy) * 0.8 + 0.2,
      'Attack': energy * responsiveness * 0.8 + 0.2,
      'Release': smoothness * energy * 0.7 + 0.3,
      'Sustain': (1 - responsiveness) * smoothness * 0.8 + 0.2,
      'Accent': energy * (1 - smoothness) * 0.8 + 0.2,
      'Breath': (1 - energy) * smoothness * 0.8 + 0.2,
    };
  }
  
  /**
   * Compute personality weights from macro parameters
   */
  private computePersonalityWeights(
    energy: number,
    chaos: number,
    smoothness: number,
    coherence: number
  ): Record<PersonalityType, number> {
    return {
      [PersonalityType.CALM]: (1 - energy) * smoothness * coherence,
      [PersonalityType.ENERGETIC]: energy * (1 - smoothness) * coherence,
      [PersonalityType.FLOWING]: smoothness * (1 - chaos) * 0.8,
      [PersonalityType.AGGRESSIVE]: energy * (1 - smoothness) * (1 - coherence),
      [PersonalityType.GENTLE]: (1 - energy) * smoothness * (1 - chaos),
      [PersonalityType.CHAOTIC]: chaos * (1 - coherence),
      [PersonalityType.RHYTHMIC]: coherence * (1 - chaos) * energy * 0.8,
      [PersonalityType.ETHEREAL]: (1 - energy) * (1 - coherence) * smoothness,
    };
  }
  
  /**
   * Compute formation bias from macro parameters
   */
  private computeFormationBias(
    chaos: number,
    coherence: number,
    complexity: number
  ): string[] {
    const formations: string[] = [];
    
    if (chaos > 0.7) {
      formations.push('scattered', 'chaotic');
    } else if (coherence > 0.7) {
      if (complexity > 0.6) {
        formations.push('spiral', 'grid');
      } else {
        formations.push('clustered', 'orbiting');
      }
    } else {
      formations.push('flowing', 'layered');
    }
    
    return formations;
  }
  
  /**
   * Compute spatial spread factor
   */
  private computeSpatialSpread(
    density: number,
    coherence: number,
    chaos: number
  ): number {
    // Higher density + low coherence = more spread
    // Low density + high coherence = more concentrated
    return density * (1 - coherence * 0.5) + chaos * 0.3;
  }
  
  /**
   * Reset all macros to defaults
   */
  reset(): void {
    for (const macro of this.macros.values()) {
      macro.value = 0.5;
      macro.target = 0.5;
    }
  }
  
  /**
   * Get all macro values as object
   */
  getAllValues(): Record<MacroType, number> {
    const values: any = {};
    for (const [type, macro] of this.macros) {
      values[type] = macro.value;
    }
    return values;
  }
  
  /**
   * Set smoothing factor for all macros
   */
  setSmoothing(smoothing: number): void {
    this.smoothing = Math.max(0, Math.min(1, smoothing));
    for (const macro of this.macros.values()) {
      macro.smoothing = this.smoothing;
    }
  }
}

/**
 * Get preset by name
 */
export function getMacroPreset(name: string): MacroPreset | undefined {
  return MACRO_PRESETS.find(p => p.name === name);
}

/**
 * Get all preset names
 */
export function getMacroPresetNames(): string[] {
  return MACRO_PRESETS.map(p => p.name);
}

