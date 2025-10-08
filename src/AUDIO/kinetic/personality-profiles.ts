/**
 * AUDIO/kinetic/personality-profiles.ts - Particle Personality System
 * 
 * Defines 8 distinct personality archetypes that influence particle behavior
 * Each personality affects response to audio, gestures, and motion characteristics
 */

import type { EnhancedAudioData } from '../core/enhanced-audio-analyzer';
import type { GestureType } from './gesture-primitives';
import { ParticleRole } from './ensemble-choreographer';

/**
 * Personality types - 8 distinct archetypes
 */
export enum PersonalityType {
  CALM = 'calm',                 // Smooth, slow, meditative
  ENERGETIC = 'energetic',       // Fast, responsive, high amplitude
  FLOWING = 'flowing',           // Fluid, continuous, graceful
  AGGRESSIVE = 'aggressive',     // Sharp, intense, powerful
  GENTLE = 'gentle',             // Soft, subtle, delicate
  CHAOTIC = 'chaotic',          // Unpredictable, erratic, wild
  RHYTHMIC = 'rhythmic',        // Precise, beat-locked, predictable
  ETHEREAL = 'ethereal',        // Dreamy, floating, otherworldly
}

/**
 * Personality trait values (0-1 normalized)
 */
export interface PersonalityTraits {
  // Motion characteristics
  speed: number;              // How fast particle moves (0=slow, 1=fast)
  smoothness: number;         // Motion smoothing factor (0=choppy, 1=smooth)
  amplitude: number;          // Motion range/magnitude (0=subtle, 1=large)
  
  // Audio response
  audioSensitivity: number;   // How strongly responds to audio (0=low, 1=high)
  bassResponse: number;       // Preference for bass frequencies (0-1)
  trebleResponse: number;     // Preference for treble frequencies (0-1)
  beatResponse: number;       // How much beats affect motion (0-1)
  
  // Gesture affinity
  gestureAffinity: Partial<Record<GestureType, number>>;  // 0-1 for each gesture
  
  // Behavioral traits
  independence: number;       // 0=follows others, 1=acts alone
  predictability: number;     // 0=chaotic, 1=regular patterns
  energy: number;            // Overall energy level (0=calm, 1=intense)
  aggression: number;        // 0=gentle, 1=aggressive
  
  // Visual characteristics
  brightness: number;         // Visual brightness multiplier (0.5-2.0)
  saturation: number;        // Color saturation multiplier (0.5-2.0)
  scaleVariation: number;    // Size variation amount (0=constant, 1=varied)
  
  // Temporal behavior
  reactionSpeed: number;      // How quickly responds to changes (0=slow, 1=instant)
  inertia: number;           // Motion inertia (0=responsive, 1=momentum-heavy)
  rhythmicAlignment: number; // How much aligns to beat grid (0=free, 1=locked)
}

/**
 * Complete personality profile
 */
export interface PersonalityProfile {
  type: PersonalityType;
  name: string;
  description: string;
  traits: PersonalityTraits;
  
  // Role affinity (preferred roles)
  roleAffinity: Partial<Record<ParticleRole, number>>;  // 0-1 for each role
  
  // Favorite formations
  formationPreference: string[];  // Ordered list of preferred formations
  
  // Visual theme
  colorTint: [number, number, number];  // RGB color influence (0-1 each)
  
  // Behavior tags
  tags: string[];  // Descriptive tags for personality
}

/**
 * Personality profile definitions
 */
export const PERSONALITY_PROFILES: Record<PersonalityType, PersonalityProfile> = {
  [PersonalityType.CALM]: {
    type: PersonalityType.CALM,
    name: 'Calm',
    description: 'Smooth, slow, meditative motion. Responds gently to audio with flowing grace.',
    traits: {
      speed: 0.3,
      smoothness: 0.9,
      amplitude: 0.4,
      audioSensitivity: 0.4,
      bassResponse: 0.6,
      trebleResponse: 0.3,
      beatResponse: 0.2,
      gestureAffinity: {
        'Swell': 0.9,
        'Sustain': 1.0,
        'Breath': 0.8,
        'Attack': 0.1,
        'Accent': 0.2,
        'Release': 0.5,
      },
      independence: 0.4,
      predictability: 0.8,
      energy: 0.2,
      aggression: 0.1,
      brightness: 0.8,
      saturation: 0.7,
      scaleVariation: 0.2,
      reactionSpeed: 0.3,
      inertia: 0.7,
      rhythmicAlignment: 0.3,
    },
    roleAffinity: {
      [ParticleRole.AMBIENT]: 0.9,
      [ParticleRole.SUPPORT]: 0.5,
      [ParticleRole.LEAD]: 0.2,
    },
    formationPreference: ['flowing', 'layered', 'scattered'],
    colorTint: [0.5, 0.7, 1.0],  // Cool blue tint
    tags: ['meditative', 'smooth', 'peaceful', 'zen'],
  },
  
  [PersonalityType.ENERGETIC]: {
    type: PersonalityType.ENERGETIC,
    name: 'Energetic',
    description: 'Fast, responsive, high-energy motion. Reacts strongly to beats and dynamics.',
    traits: {
      speed: 0.9,
      smoothness: 0.4,
      amplitude: 0.8,
      audioSensitivity: 0.9,
      bassResponse: 0.8,
      trebleResponse: 0.7,
      beatResponse: 1.0,
      gestureAffinity: {
        'Attack': 1.0,
        'Accent': 0.9,
        'Release': 0.7,
        'Swell': 0.5,
        'Sustain': 0.3,
        'Breath': 0.4,
      },
      independence: 0.7,
      predictability: 0.6,
      energy: 0.95,
      aggression: 0.6,
      brightness: 1.3,
      saturation: 1.2,
      scaleVariation: 0.6,
      reactionSpeed: 0.95,
      inertia: 0.2,
      rhythmicAlignment: 0.8,
    },
    roleAffinity: {
      [ParticleRole.LEAD]: 0.9,
      [ParticleRole.SUPPORT]: 0.6,
      [ParticleRole.AMBIENT]: 0.2,
    },
    formationPreference: ['radial', 'clustered', 'orbiting'],
    colorTint: [1.0, 0.5, 0.3],  // Warm orange-red tint
    tags: ['dynamic', 'powerful', 'responsive', 'intense'],
  },
  
  [PersonalityType.FLOWING]: {
    type: PersonalityType.FLOWING,
    name: 'Flowing',
    description: 'Fluid, continuous, graceful motion. Emphasizes smooth transitions and curves.',
    traits: {
      speed: 0.6,
      smoothness: 1.0,
      amplitude: 0.6,
      audioSensitivity: 0.6,
      bassResponse: 0.5,
      trebleResponse: 0.5,
      beatResponse: 0.4,
      gestureAffinity: {
        'Swell': 0.8,
        'Release': 0.9,
        'Breath': 1.0,
        'Attack': 0.3,
        'Accent': 0.2,
        'Sustain': 0.7,
      },
      independence: 0.3,
      predictability: 0.7,
      energy: 0.5,
      aggression: 0.2,
      brightness: 1.0,
      saturation: 0.9,
      scaleVariation: 0.3,
      reactionSpeed: 0.5,
      inertia: 0.8,
      rhythmicAlignment: 0.4,
    },
    roleAffinity: {
      [ParticleRole.SUPPORT]: 0.8,
      [ParticleRole.AMBIENT]: 0.6,
      [ParticleRole.LEAD]: 0.4,
    },
    formationPreference: ['flowing', 'spiral', 'layered'],
    colorTint: [0.4, 0.9, 0.7],  // Cyan-green tint
    tags: ['graceful', 'continuous', 'fluid', 'elegant'],
  },
  
  [PersonalityType.AGGRESSIVE]: {
    type: PersonalityType.AGGRESSIVE,
    name: 'Aggressive',
    description: 'Sharp, intense, powerful motion. Responds with force to audio peaks.',
    traits: {
      speed: 0.8,
      smoothness: 0.2,
      amplitude: 1.0,
      audioSensitivity: 1.0,
      bassResponse: 1.0,
      trebleResponse: 0.4,
      beatResponse: 0.9,
      gestureAffinity: {
        'Attack': 1.0,
        'Accent': 1.0,
        'Release': 0.6,
        'Swell': 0.2,
        'Sustain': 0.1,
        'Breath': 0.1,
      },
      independence: 0.8,
      predictability: 0.5,
      energy: 1.0,
      aggression: 1.0,
      brightness: 1.5,
      saturation: 1.5,
      scaleVariation: 0.8,
      reactionSpeed: 1.0,
      inertia: 0.1,
      rhythmicAlignment: 0.7,
    },
    roleAffinity: {
      [ParticleRole.LEAD]: 1.0,
      [ParticleRole.SUPPORT]: 0.4,
      [ParticleRole.AMBIENT]: 0.1,
    },
    formationPreference: ['radial', 'clustered', 'grid'],
    colorTint: [1.0, 0.2, 0.2],  // Intense red tint
    tags: ['powerful', 'intense', 'sharp', 'forceful'],
  },
  
  [PersonalityType.GENTLE]: {
    type: PersonalityType.GENTLE,
    name: 'Gentle',
    description: 'Soft, subtle, delicate motion. Responds with nuance to quiet details.',
    traits: {
      speed: 0.4,
      smoothness: 0.9,
      amplitude: 0.3,
      audioSensitivity: 0.3,
      bassResponse: 0.2,
      trebleResponse: 0.8,
      beatResponse: 0.2,
      gestureAffinity: {
        'Breath': 1.0,
        'Sustain': 0.9,
        'Swell': 0.7,
        'Release': 0.6,
        'Attack': 0.1,
        'Accent': 0.1,
      },
      independence: 0.2,
      predictability: 0.9,
      energy: 0.2,
      aggression: 0.0,
      brightness: 0.7,
      saturation: 0.6,
      scaleVariation: 0.1,
      reactionSpeed: 0.4,
      inertia: 0.6,
      rhythmicAlignment: 0.3,
    },
    roleAffinity: {
      [ParticleRole.AMBIENT]: 1.0,
      [ParticleRole.SUPPORT]: 0.4,
      [ParticleRole.LEAD]: 0.1,
    },
    formationPreference: ['scattered', 'layered', 'flowing'],
    colorTint: [1.0, 0.9, 0.95],  // Soft pink-white tint
    tags: ['delicate', 'subtle', 'soft', 'nuanced'],
  },
  
  [PersonalityType.CHAOTIC]: {
    type: PersonalityType.CHAOTIC,
    name: 'Chaotic',
    description: 'Unpredictable, erratic, wild motion. Breaks patterns and creates surprise.',
    traits: {
      speed: 0.7,
      smoothness: 0.1,
      amplitude: 0.9,
      audioSensitivity: 0.8,
      bassResponse: 0.6,
      trebleResponse: 0.9,
      beatResponse: 0.5,
      gestureAffinity: {
        'Accent': 0.8,
        'Attack': 0.7,
        'Release': 0.9,
        'Swell': 0.6,
        'Sustain': 0.2,
        'Breath': 0.5,
      },
      independence: 1.0,
      predictability: 0.1,
      energy: 0.8,
      aggression: 0.7,
      brightness: 1.2,
      saturation: 1.3,
      scaleVariation: 1.0,
      reactionSpeed: 0.9,
      inertia: 0.3,
      rhythmicAlignment: 0.1,
    },
    roleAffinity: {
      [ParticleRole.LEAD]: 0.6,
      [ParticleRole.SUPPORT]: 0.5,
      [ParticleRole.AMBIENT]: 0.5,
    },
    formationPreference: ['scattered', 'chaotic', 'radial'],
    colorTint: [0.8, 0.3, 0.9],  // Purple-magenta tint
    tags: ['unpredictable', 'wild', 'erratic', 'surprising'],
  },
  
  [PersonalityType.RHYTHMIC]: {
    type: PersonalityType.RHYTHMIC,
    name: 'Rhythmic',
    description: 'Precise, beat-locked, predictable motion. Perfect timing with musical structure.',
    traits: {
      speed: 0.7,
      smoothness: 0.6,
      amplitude: 0.7,
      audioSensitivity: 0.7,
      bassResponse: 0.9,
      trebleResponse: 0.5,
      beatResponse: 1.0,
      gestureAffinity: {
        'Accent': 1.0,
        'Attack': 0.8,
        'Sustain': 0.7,
        'Release': 0.5,
        'Swell': 0.4,
        'Breath': 0.3,
      },
      independence: 0.5,
      predictability: 1.0,
      energy: 0.7,
      aggression: 0.5,
      brightness: 1.1,
      saturation: 1.0,
      scaleVariation: 0.4,
      reactionSpeed: 0.8,
      inertia: 0.4,
      rhythmicAlignment: 1.0,
    },
    roleAffinity: {
      [ParticleRole.LEAD]: 0.7,
      [ParticleRole.SUPPORT]: 0.8,
      [ParticleRole.AMBIENT]: 0.3,
    },
    formationPreference: ['grid', 'radial', 'orbiting'],
    colorTint: [0.9, 0.9, 0.4],  // Yellow tint
    tags: ['precise', 'rhythmic', 'locked', 'regular'],
  },
  
  [PersonalityType.ETHEREAL]: {
    type: PersonalityType.ETHEREAL,
    name: 'Ethereal',
    description: 'Dreamy, floating, otherworldly motion. Disconnected from gravity and time.',
    traits: {
      speed: 0.5,
      smoothness: 1.0,
      amplitude: 0.5,
      audioSensitivity: 0.5,
      bassResponse: 0.3,
      trebleResponse: 0.9,
      beatResponse: 0.3,
      gestureAffinity: {
        'Breath': 0.9,
        'Swell': 1.0,
        'Sustain': 0.8,
        'Release': 0.7,
        'Attack': 0.2,
        'Accent': 0.3,
      },
      independence: 0.6,
      predictability: 0.4,
      energy: 0.4,
      aggression: 0.1,
      brightness: 1.2,
      saturation: 0.5,
      scaleVariation: 0.4,
      reactionSpeed: 0.2,
      inertia: 0.9,
      rhythmicAlignment: 0.2,
    },
    roleAffinity: {
      [ParticleRole.AMBIENT]: 0.9,
      [ParticleRole.SUPPORT]: 0.5,
      [ParticleRole.LEAD]: 0.3,
    },
    formationPreference: ['scattered', 'layered', 'spiral'],
    colorTint: [0.7, 0.8, 1.0],  // Pale blue tint
    tags: ['dreamy', 'floating', 'otherworldly', 'transcendent'],
  },
};

/**
 * Get personality profile by type
 */
export function getPersonalityProfile(type: PersonalityType): PersonalityProfile {
  return PERSONALITY_PROFILES[type];
}

/**
 * Get all personality types
 */
export function getAllPersonalityTypes(): PersonalityType[] {
  return Object.values(PersonalityType);
}

/**
 * Get all personality profiles
 */
export function getAllPersonalityProfiles(): PersonalityProfile[] {
  return Object.values(PERSONALITY_PROFILES);
}

/**
 * Calculate personality compatibility with audio state
 * Returns 0-1 score of how well this personality fits current audio
 */
export function calculatePersonalityAudioMatch(
  profile: PersonalityProfile,
  audioData: EnhancedAudioData
): number {
  let score = 0;
  let weights = 0;
  
  // Energy match
  const audioEnergy = audioData.structure?.energy.current || audioData.smoothOverall;
  const energyMatch = 1 - Math.abs(profile.traits.energy - audioEnergy);
  score += energyMatch * 2;
  weights += 2;
  
  // Beat intensity match
  if (audioData.beatIntensity > 0.5) {
    score += profile.traits.beatResponse;
    weights += 1;
  }
  
  // Groove match
  if (audioData.groove) {
    const grooveMatch = Math.min(
      profile.traits.rhythmicAlignment,
      audioData.groove.grooveIntensity
    );
    score += grooveMatch;
    weights += 1;
  }
  
  // Frequency preference match
  const bassWeight = audioData.smoothBass * profile.traits.bassResponse;
  const trebleWeight = audioData.smoothTreble * profile.traits.trebleResponse;
  score += (bassWeight + trebleWeight) / 2;
  weights += 1;
  
  return weights > 0 ? score / weights : 0.5;
}

/**
 * Recommend personality based on current audio
 */
export function recommendPersonality(audioData: EnhancedAudioData): PersonalityType {
  let bestMatch = PersonalityType.CALM;
  let bestScore = 0;
  
  for (const profile of getAllPersonalityProfiles()) {
    const score = calculatePersonalityAudioMatch(profile, audioData);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = profile.type;
    }
  }
  
  return bestMatch;
}

