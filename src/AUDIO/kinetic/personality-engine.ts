/**
 * AUDIO/kinetic/personality-engine.ts - Personality Assignment Engine
 * 
 * Assigns personalities to particles and manages personality blending
 */

import type { EnhancedAudioData } from '../core/enhanced-audio-analyzer';
import type { ParticleRole } from './ensemble-choreographer';
import {
  PersonalityType,
  type PersonalityProfile,
  type PersonalityTraits,
  getPersonalityProfile,
  getAllPersonalityTypes,
  recommendPersonality,
} from './personality-profiles';

/**
 * Particle personality assignment
 */
export interface ParticlePersonality {
  particleIndex: number;
  primaryPersonality: PersonalityType;
  primaryWeight: number;        // 0-1
  
  // Blending (up to 2 secondary personalities)
  secondaryPersonality?: PersonalityType;
  secondaryWeight?: number;     // 0-1
  
  tertiaryPersonality?: PersonalityType;
  tertiaryWeight?: number;      // 0-1
  
  // Computed traits (blended result)
  traits: PersonalityTraits;
  
  // Assignment metadata
  lastUpdate: number;
  stability: number;            // How stable this assignment is (0-1)
}

/**
 * Personality blend state
 */
export interface PersonalityBlendState {
  globalPersonality: PersonalityType;  // Current dominant global personality
  globalWeight: number;                 // How much global personality influences (0-1)
  
  transitionProgress: number;           // Transition between personalities (0-1)
  transitionFrom?: PersonalityType;
  transitionTo?: PersonalityType;
  
  particleCount: number;
  assignmentCount: number;
}

/**
 * Personality assignment configuration
 */
export interface PersonalityConfig {
  // Assignment strategy
  randomization: number;        // 0=deterministic, 1=fully random
  roleInfluence: number;        // 0-1, how much particle role affects personality
  audioInfluence: number;       // 0-1, how much audio state affects personality
  
  // Blending
  maxBlendComponents: number;   // 1-3, max personalities to blend
  blendSmoothing: number;       // 0-1, smoothing for blend transitions
  
  // Stability
  assignmentStability: number;  // 0-1, how long personality lasts before changing
  transitionDuration: number;   // Seconds for personality transitions
  
  // Global influence
  globalInfluence: number;      // 0-1, how much global personality affects all
  autoAdapt: boolean;          // Automatically adapt to audio
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: PersonalityConfig = {
  randomization: 0.3,
  roleInfluence: 0.6,
  audioInfluence: 0.4,
  maxBlendComponents: 2,
  blendSmoothing: 0.8,
  assignmentStability: 0.7,
  transitionDuration: 2.0,
  globalInfluence: 0.5,
  autoAdapt: true,
};

/**
 * PersonalityEngine - Assigns and manages particle personalities
 */
export class PersonalityEngine {
  private config: PersonalityConfig;
  private assignments: Map<number, ParticlePersonality> = new Map();
  
  private globalPersonality: PersonalityType = PersonalityType.CALM;
  private globalWeight: number = 0.5;
  
  private transitionProgress: number = 1.0;  // 1.0 = transition complete
  private transitionFrom?: PersonalityType;
  private transitionTo?: PersonalityType;
  private transitionStartTime: number = 0;
  
  private particleCount: number = 0;
  private currentTime: number = 0;
  
  constructor(config?: Partial<PersonalityConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }
  
  /**
   * Update personality assignments based on audio and roles
   */
  update(
    audioData: EnhancedAudioData,
    particleRoles: Map<number, ParticleRole>,
    deltaTime: number
  ): PersonalityBlendState {
    this.currentTime = audioData.time;
    this.particleCount = particleRoles.size;
    
    // Update global personality transition
    if (this.transitionProgress < 1.0) {
      this.transitionProgress = Math.min(
        1.0,
        this.transitionProgress + deltaTime / this.config.transitionDuration
      );
      
      // Blend global personalities during transition
      if (this.transitionFrom && this.transitionTo) {
        const t = this.easeInOutCubic(this.transitionProgress);
        this.globalWeight = t;
        
        if (t >= 1.0) {
          this.globalPersonality = this.transitionTo;
          this.transitionFrom = undefined;
          this.transitionTo = undefined;
        }
      }
    }
    
    // Auto-adapt global personality to audio
    if (this.config.autoAdapt && this.transitionProgress >= 1.0) {
      const recommended = recommendPersonality(audioData);
      if (recommended !== this.globalPersonality) {
        // Only change if significantly different
        const currentProfile = getPersonalityProfile(this.globalPersonality);
        const recommendedProfile = getPersonalityProfile(recommended);
        
        const energyDiff = Math.abs(
          currentProfile.traits.energy - recommendedProfile.traits.energy
        );
        
        if (energyDiff > 0.3) {
          this.setGlobalPersonality(recommended);
        }
      }
    }
    
    // Update individual particle assignments
    for (const [particleIndex, role] of particleRoles) {
      const existing = this.assignments.get(particleIndex);
      
      if (!existing || this.shouldReassign(existing, audioData)) {
        const personality = this.assignPersonality(particleIndex, role, audioData);
        this.assignments.set(particleIndex, personality);
      } else {
        // Update existing assignment's traits (for global influence)
        existing.traits = this.blendTraits(existing);
      }
    }
    
    return this.getState();
  }
  
  /**
   * Set global personality (initiates transition)
   */
  setGlobalPersonality(personality: PersonalityType): void {
    if (personality === this.globalPersonality) return;
    
    this.transitionFrom = this.globalPersonality;
    this.transitionTo = personality;
    this.transitionProgress = 0.0;
    this.transitionStartTime = this.currentTime;
  }
  
  /**
   * Force reassignment of all particles
   */
  reassignAll(
    audioData: EnhancedAudioData,
    particleRoles: Map<number, ParticleRole>
  ): void {
    this.assignments.clear();
    
    for (const [particleIndex, role] of particleRoles) {
      const personality = this.assignPersonality(particleIndex, role, audioData);
      this.assignments.set(particleIndex, personality);
    }
  }
  
  /**
   * Get personality for a specific particle
   */
  getParticlePersonality(particleIndex: number): ParticlePersonality | undefined {
    return this.assignments.get(particleIndex);
  }
  
  /**
   * Get blended traits for a particle
   */
  getParticleTraits(particleIndex: number): PersonalityTraits | undefined {
    return this.assignments.get(particleIndex)?.traits;
  }
  
  /**
   * Update configuration
   */
  updateConfig(config: Partial<PersonalityConfig>): void {
    Object.assign(this.config, config);
  }
  
  /**
   * Get current state
   */
  getState(): PersonalityBlendState {
    return {
      globalPersonality: this.globalPersonality,
      globalWeight: this.globalWeight,
      transitionProgress: this.transitionProgress,
      transitionFrom: this.transitionFrom,
      transitionTo: this.transitionTo,
      particleCount: this.particleCount,
      assignmentCount: this.assignments.size,
    };
  }
  
  /**
   * Assign personality to a particle
   */
  private assignPersonality(
    particleIndex: number,
    role: ParticleRole,
    audioData: EnhancedAudioData
  ): ParticlePersonality {
    const personalities = getAllPersonalityTypes();
    
    // Calculate weights for each personality
    const weights = personalities.map(type => {
      const profile = getPersonalityProfile(type);
      let weight = 0.1;  // Base weight
      
      // Role affinity
      const roleAffinity = profile.roleAffinity[role] || 0.5;
      weight += roleAffinity * this.config.roleInfluence;
      
      // Audio match
      const audioEnergy = audioData.structure?.energy.current || audioData.smoothOverall;
      const energyMatch = 1 - Math.abs(profile.traits.energy - audioEnergy);
      weight += energyMatch * this.config.audioInfluence;
      
      // Global personality influence
      if (type === this.globalPersonality) {
        weight += this.config.globalInfluence;
      }
      
      // Randomization
      if (this.config.randomization > 0) {
        weight += (Math.random() - 0.5) * this.config.randomization;
      }
      
      return Math.max(0, weight);
    });
    
    // Normalize weights
    const total = weights.reduce((sum, w) => sum + w, 0);
    const normalized = weights.map(w => w / total);
    
    // Select primary personality (highest weight)
    let primaryIndex = 0;
    for (let i = 1; i < normalized.length; i++) {
      if (normalized[i] > normalized[primaryIndex]) {
        primaryIndex = i;
      }
    }
    
    const primaryType = personalities[primaryIndex];
    const primaryWeight = normalized[primaryIndex];
    
    // Select secondary (if blending enabled)
    let secondaryType: PersonalityType | undefined;
    let secondaryWeight: number | undefined;
    
    if (this.config.maxBlendComponents >= 2) {
      // Find second highest
      let secondaryIndex = primaryIndex === 0 ? 1 : 0;
      for (let i = 0; i < normalized.length; i++) {
        if (i !== primaryIndex && normalized[i] > normalized[secondaryIndex]) {
          secondaryIndex = i;
        }
      }
      
      if (normalized[secondaryIndex] > 0.2) {  // Threshold for secondary
        secondaryType = personalities[secondaryIndex];
        secondaryWeight = normalized[secondaryIndex];
      }
    }
    
    // Blend traits
    const assignment: ParticlePersonality = {
      particleIndex,
      primaryPersonality: primaryType,
      primaryWeight,
      secondaryPersonality: secondaryType,
      secondaryWeight,
      traits: {} as PersonalityTraits,  // Will be filled by blendTraits
      lastUpdate: this.currentTime,
      stability: this.config.assignmentStability,
    };
    
    assignment.traits = this.blendTraits(assignment);
    
    return assignment;
  }
  
  /**
   * Blend personality traits
   */
  private blendTraits(assignment: ParticlePersonality): PersonalityTraits {
    const primary = getPersonalityProfile(assignment.primaryPersonality);
    
    // Start with primary traits
    let blended: PersonalityTraits = { ...primary.traits };
    
    // Blend with secondary if present
    if (assignment.secondaryPersonality && assignment.secondaryWeight) {
      const secondary = getPersonalityProfile(assignment.secondaryPersonality);
      const primaryW = assignment.primaryWeight;
      const secondaryW = assignment.secondaryWeight;
      const totalW = primaryW + secondaryW;
      
      const p = primaryW / totalW;
      const s = secondaryW / totalW;
      
      blended = this.lerpTraitsWeighted(primary.traits, secondary.traits, p, s);
    }
    
    // Apply global personality influence
    if (this.config.globalInfluence > 0) {
      const global = getPersonalityProfile(this.globalPersonality);
      const globalInfluence = this.config.globalInfluence * this.globalWeight;
      blended = this.lerpTraits(blended, global.traits, globalInfluence);
    }
    
    return blended;
  }
  
  /**
   * Lerp between two trait sets
   */
  private lerpTraits(
    a: PersonalityTraits,
    b: PersonalityTraits,
    t: number
  ): PersonalityTraits {
    return {
      speed: a.speed * (1 - t) + b.speed * t,
      smoothness: a.smoothness * (1 - t) + b.smoothness * t,
      amplitude: a.amplitude * (1 - t) + b.amplitude * t,
      audioSensitivity: a.audioSensitivity * (1 - t) + b.audioSensitivity * t,
      bassResponse: a.bassResponse * (1 - t) + b.bassResponse * t,
      trebleResponse: a.trebleResponse * (1 - t) + b.trebleResponse * t,
      beatResponse: a.beatResponse * (1 - t) + b.beatResponse * t,
      gestureAffinity: {},  // TODO: blend gesture affinity
      independence: a.independence * (1 - t) + b.independence * t,
      predictability: a.predictability * (1 - t) + b.predictability * t,
      energy: a.energy * (1 - t) + b.energy * t,
      aggression: a.aggression * (1 - t) + b.aggression * t,
      brightness: a.brightness * (1 - t) + b.brightness * t,
      saturation: a.saturation * (1 - t) + b.saturation * t,
      scaleVariation: a.scaleVariation * (1 - t) + b.scaleVariation * t,
      reactionSpeed: a.reactionSpeed * (1 - t) + b.reactionSpeed * t,
      inertia: a.inertia * (1 - t) + b.inertia * t,
      rhythmicAlignment: a.rhythmicAlignment * (1 - t) + b.rhythmicAlignment * t,
    };
  }
  
  /**
   * Weighted lerp between two trait sets
   */
  private lerpTraitsWeighted(
    a: PersonalityTraits,
    b: PersonalityTraits,
    weightA: number,
    weightB: number
  ): PersonalityTraits {
    const t = weightB / (weightA + weightB);
    return this.lerpTraits(a, b, t);
  }
  
  /**
   * Check if particle should be reassigned
   */
  private shouldReassign(
    assignment: ParticlePersonality,
    audioData: EnhancedAudioData
  ): boolean {
    // Check time-based stability
    const timeSince = this.currentTime - assignment.lastUpdate;
    if (timeSince < 2.0 * assignment.stability) {
      return false;
    }
    
    // Check if audio has changed significantly
    const profile = getPersonalityProfile(assignment.primaryPersonality);
    const audioEnergy = audioData.structure?.energy.current || audioData.smoothOverall;
    const energyDiff = Math.abs(profile.traits.energy - audioEnergy);
    
    // Reassign if energy is very different
    if (energyDiff > 0.5) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Ease in-out cubic
   */
  private easeInOutCubic(t: number): number {
    return t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
  
  /**
   * Reset engine
   */
  reset(): void {
    this.assignments.clear();
    this.globalPersonality = PersonalityType.CALM;
    this.globalWeight = 0.5;
    this.transitionProgress = 1.0;
    this.transitionFrom = undefined;
    this.transitionTo = undefined;
  }
}

