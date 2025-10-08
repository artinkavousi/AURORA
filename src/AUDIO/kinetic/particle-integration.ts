/**
 * AUDIO/kinetic/particle-integration.ts - Kinetic System → Particle Physics Integration
 * 
 * Bridges the kinetic motion systems with the MLS-MPM particle simulation
 * Converts high-level gestures, personalities, and roles into particle forces
 */

import { uniform, Fn, vec3, float, int, If, length, normalize, sin, cos, smoothstep, mix, dot, time } from 'three/tsl';
import type { GestureType } from './gesture-primitives';
import type { ParticleRole } from './ensemble-choreographer';
import type { PersonalityType } from './personality-profiles';

/**
 * GPU uniforms for kinetic system state
 */
export interface KineticUniforms {
  // Active gesture
  activeGesture: ReturnType<typeof uniform>;  // int (GestureType enum value)
  gestureIntensity: ReturnType<typeof uniform>;
  gestureProgress: ReturnType<typeof uniform>;  // 0-1 animation progress
  gestureBlend: ReturnType<typeof uniform>;  // blend between gestures
  
  // Secondary gesture (for blending)
  secondaryGesture: ReturnType<typeof uniform>;
  secondaryIntensity: ReturnType<typeof uniform>;
  
  // Global personality
  globalPersonality: ReturnType<typeof uniform>;  // int
  personalityTransition: ReturnType<typeof uniform>;  // 0-1
  
  // Macro parameters
  macroIntensity: ReturnType<typeof uniform>;
  macroChaos: ReturnType<typeof uniform>;
  macroSmoothness: ReturnType<typeof uniform>;
  macroResponsiveness: ReturnType<typeof uniform>;
  macroEnergy: ReturnType<typeof uniform>;
  macroCoherence: ReturnType<typeof uniform>;
  
  // Audio features for motion
  beatPhase: ReturnType<typeof uniform>;  // 0-1 within beat
  downbeatPhase: ReturnType<typeof uniform>;  // 0-1 within measure
  grooveIntensity: ReturnType<typeof uniform>;
  swingRatio: ReturnType<typeof uniform>;
  tension: ReturnType<typeof uniform>;  // Musical tension
  
  // Spatial/ensemble (would need per-particle data, these are global hints)
  foregroundRatio: ReturnType<typeof uniform>;  // % particles in foreground
  leadRatio: ReturnType<typeof uniform>;  // % lead particles
}

/**
 * Create kinetic uniforms
 */
export function createKineticUniforms(): KineticUniforms {
  return {
    activeGesture: uniform(0, 'int'),
    gestureIntensity: uniform(0),
    gestureProgress: uniform(0),
    gestureBlend: uniform(0),
    
    secondaryGesture: uniform(0, 'int'),
    secondaryIntensity: uniform(0),
    
    globalPersonality: uniform(0, 'int'),
    personalityTransition: uniform(1),
    
    // ✨ FIX: Initialize macro params to 0 to prevent forces at startup
    macroIntensity: uniform(0),
    macroChaos: uniform(0),
    macroSmoothness: uniform(0),
    macroResponsiveness: uniform(0),
    macroEnergy: uniform(0),
    macroCoherence: uniform(0),
    
    beatPhase: uniform(0),
    downbeatPhase: uniform(0),
    grooveIntensity: uniform(0),
    swingRatio: uniform(0.5),
    tension: uniform(0),
    
    foregroundRatio: uniform(0.33),
    leadRatio: uniform(0.2),
  };
}

/**
 * TSL Function: Calculate gesture-based force for a particle
 * 
 * @param particlePos - Particle position in world space
 * @param particleVel - Particle velocity
 * @param gridCenter - Center of simulation grid
 * @param gridSize - Size of simulation grid
 * @param uniforms - Kinetic uniforms
 * @returns Force vector to apply to particle
 */
export const calculateGestureForce = /*#__PURE__*/ Fn((
  [particlePos, particleVel, gridCenter, gridSize, uniforms]
) => {
  const force = vec3(0).toVar('force');
  const normPos = particlePos.sub(gridCenter).div(gridSize).toVar('normPos');
  const centerDist = length(normPos).toVar('centerDist');
  const centerDir = normalize(normPos).toVar('centerDir');
  
  const intensity = uniforms.gestureIntensity.mul(uniforms.macroIntensity).mul(2.0).toVar('intensity');
  const progress = uniforms.gestureProgress.toVar('progress');
  
  // Gesture Type Enum (matches gesture-primitives.ts)
  const SWELL = int(0);
  const ATTACK = int(1);
  const RELEASE = int(2);
  const SUSTAIN = int(3);
  const ACCENT = int(4);
  const BREATH = int(5);
  
  // === SWELL: Radial expansion from center ===
  If(uniforms.activeGesture.equal(SWELL), () => {
    const swellPhase = sin(progress.mul(Math.PI)).toVar('swellPhase');
    const radialForce = centerDir.mul(intensity).mul(swellPhase).mul(2.0);
    const liftForce = vec3(0, intensity.mul(0.5).mul(swellPhase), 0);
    force.assign(radialForce.add(liftForce));
  })
  
  // === ATTACK: Explosive burst ===
  .ElseIf(uniforms.activeGesture.equal(ATTACK), () => {
    const attackPhase = smoothstep(0.0, 0.2, progress).mul(smoothstep(1.0, 0.3, progress)).toVar('attackPhase');
    const burstForce = centerDir.mul(intensity).mul(attackPhase).mul(5.0);
    const upwardKick = vec3(0, intensity.mul(2.0).mul(attackPhase), 0);
    force.assign(burstForce.add(upwardKick));
  })
  
  // === RELEASE: Gradual relaxation, downward drift ===
  .ElseIf(uniforms.activeGesture.equal(RELEASE), () => {
    const releasePhase = smoothstep(0.0, 1.0, progress).toVar('releasePhase');
    const dampForce = particleVel.negate().mul(intensity).mul(releasePhase).mul(0.5);
    const settleForce = vec3(0, intensity.negate().mul(0.3).mul(releasePhase), 0);
    force.assign(dampForce.add(settleForce));
  })
  
  // === SUSTAIN: Held motion with gentle oscillation ===
  .ElseIf(uniforms.activeGesture.equal(SUSTAIN), () => {
    const sustainOsc = sin(time.mul(2.0)).mul(0.5).add(0.5).toVar('sustainOsc');
    const holdForce = centerDir.mul(intensity).mul(sustainOsc).mul(0.8);
    force.assign(holdForce);
  })
  
  // === ACCENT: Short emphasis pulse ===
  .ElseIf(uniforms.activeGesture.equal(ACCENT), () => {
    const accentPhase = smoothstep(0.0, 0.1, progress).mul(smoothstep(0.4, 0.1, progress)).toVar('accentPhase');
    const pulseDir = mix(centerDir, vec3(sin(uniforms.beatPhase.mul(Math.PI * 2)), cos(uniforms.beatPhase.mul(Math.PI * 2)), 0), 0.5);
    const pulseForce = pulseDir.mul(intensity).mul(accentPhase).mul(8.0);
    force.assign(pulseForce);
  })
  
  // === BREATH: Gentle oscillating rhythm ===
  .ElseIf(uniforms.activeGesture.equal(BREATH), () => {
    const breathPhase = sin(progress.mul(Math.PI * 2)).toVar('breathPhase');
    const breathForce = vec3(0, breathPhase.mul(intensity).mul(0.6), 0);
    const sideOsc = sin(time.mul(1.5).add(normPos.x.mul(2.0))).mul(intensity).mul(0.3);
    force.x.addAssign(sideOsc);
    force.addAssign(breathForce);
  });
  
  return force;
}).setLayout({
  name: 'calculateGestureForce',
  type: 'vec3',
  inputs: [
    { name: 'particlePos', type: 'vec3' },
    { name: 'particleVel', type: 'vec3' },
    { name: 'gridCenter', type: 'vec3' },
    { name: 'gridSize', type: 'float' },
    { name: 'uniforms', type: 'KineticUniforms' },
  ],
});

/**
 * TSL Function: Calculate personality modulation factor
 * 
 * Modulates forces based on global personality
 */
export const calculatePersonalityModulation = /*#__PURE__*/ Fn((
  [uniforms, particleVel]
) => {
  const modulation = float(1.0).toVar('modulation');
  const damping = float(0.0).toVar('damping');
  const speedScale = float(1.0).toVar('speedScale');
  
  // Personality Type Enum
  const CALM = int(0);
  const ENERGETIC = int(1);
  const FLOWING = int(2);
  const AGGRESSIVE = int(3);
  const GENTLE = int(4);
  const CHAOTIC = int(5);
  const RHYTHMIC = int(6);
  const ETHEREAL = int(7);
  
  // Calm: Low forces, high damping
  If(uniforms.globalPersonality.equal(CALM), () => {
    modulation.assign(0.6);
    damping.assign(0.7);
    speedScale.assign(0.8);
  })
  
  // Energetic: High forces, low damping
  .ElseIf(uniforms.globalPersonality.equal(ENERGETIC), () => {
    modulation.assign(1.5);
    damping.assign(0.2);
    speedScale.assign(1.5);
  })
  
  // Flowing: Medium forces, very low damping
  .ElseIf(uniforms.globalPersonality.equal(FLOWING), () => {
    modulation.assign(1.0);
    damping.assign(0.1);
    speedScale.assign(1.2);
  })
  
  // Aggressive: Very high forces, medium damping
  .ElseIf(uniforms.globalPersonality.equal(AGGRESSIVE), () => {
    modulation.assign(2.0);
    damping.assign(0.4);
    speedScale.assign(1.8);
  })
  
  // Gentle: Low forces, high damping
  .ElseIf(uniforms.globalPersonality.equal(GENTLE), () => {
    modulation.assign(0.5);
    damping.assign(0.8);
    speedScale.assign(0.7);
  })
  
  // Chaotic: Random forces, varying damping
  .ElseIf(uniforms.globalPersonality.equal(CHAOTIC), () => {
    const chaos = sin(time.mul(3.7)).mul(0.5).add(1.0);
    modulation.assign(chaos.mul(1.5));
    damping.assign(0.3);
    speedScale.assign(1.3);
  })
  
  // Rhythmic: Beat-locked forces
  .ElseIf(uniforms.globalPersonality.equal(RHYTHMIC), () => {
    const beat = smoothstep(0.0, 0.1, uniforms.beatPhase).mul(smoothstep(0.3, 0.1, uniforms.beatPhase));
    modulation.assign(float(0.8).add(beat.mul(0.7)));
    damping.assign(0.5);
    speedScale.assign(1.0);
  })
  
  // Ethereal: Subtle forces, high damping, slow
  .ElseIf(uniforms.globalPersonality.equal(ETHEREAL), () => {
    modulation.assign(0.4);
    damping.assign(0.9);
    speedScale.assign(0.6);
  });
  
  return vec3(modulation, damping, speedScale);
}).setLayout({
  name: 'calculatePersonalityModulation',
  type: 'vec3',
  inputs: [
    { name: 'uniforms', type: 'KineticUniforms' },
    { name: 'particleVel', type: 'vec3' },
  ],
});

/**
 * TSL Function: Apply macro-based turbulence
 * 
 * Adds variety and prevents stuck particles
 */
export const calculateMacroTurbulence = /*#__PURE__*/ Fn((
  [particlePos, uniforms]
) => {
  const turbulence = vec3(0).toVar('turbulence');
  
  // Chaos macro drives turbulence intensity
  const chaosIntensity = uniforms.macroChaos.mul(uniforms.macroEnergy).toVar('chaosIntensity');
  
  // Multi-frequency noise
  const t = time.mul(0.5);
  const freq1 = 0.5;
  const freq2 = 1.5;
  const freq3 = 3.0;
  
  const noise1 = sin(particlePos.x.mul(freq1).add(t)).mul(cos(particlePos.y.mul(freq1)));
  const noise2 = sin(particlePos.x.mul(freq2).add(t.mul(1.3))).mul(cos(particlePos.z.mul(freq2)));
  const noise3 = sin(particlePos.y.mul(freq3).add(t.mul(1.7))).mul(cos(particlePos.x.mul(freq3)));
  
  turbulence.x.assign(noise1.mul(chaosIntensity).mul(0.8));
  turbulence.y.assign(noise2.mul(chaosIntensity).mul(0.8));
  turbulence.z.assign(noise3.mul(chaosIntensity).mul(0.8));
  
  return turbulence;
}).setLayout({
  name: 'calculateMacroTurbulence',
  type: 'vec3',
  inputs: [
    { name: 'particlePos', type: 'vec3' },
    { name: 'uniforms', type: 'KineticUniforms' },
  ],
});

/**
 * TSL Function: Complete kinetic force calculation
 * 
 * Combines all kinetic systems into final force
 */
export const calculateKineticForce = /*#__PURE__*/ Fn((
  [particlePos, particleVel, gridCenter, gridSize, uniforms]
) => {
  // 1. Calculate gesture force
  const gestureForce = calculateGestureForce(particlePos, particleVel, gridCenter, gridSize, uniforms).toVar('gestureForce');
  
  // 2. Calculate personality modulation
  const personalityMod = calculatePersonalityModulation(uniforms, particleVel).toVar('personalityMod');
  const forceMultiplier = personalityMod.x;
  const dampingFactor = personalityMod.y;
  
  // 3. Apply macro turbulence
  const turbulence = calculateMacroTurbulence(particlePos, uniforms).toVar('turbulence');
  
  // 4. Combine forces
  const totalForce = gestureForce.mul(forceMultiplier).add(turbulence).toVar('totalForce');
  
  // 5. Apply velocity damping (personality-based)
  const velocityDamping = particleVel.negate().mul(dampingFactor).mul(0.1);
  totalForce.addAssign(velocityDamping);
  
  // 6. Scale by macro responsiveness
  const responsivenessScale = mix(0.5, 2.0, uniforms.macroResponsiveness);
  totalForce.mulAssign(responsivenessScale);
  
  return totalForce;
}).setLayout({
  name: 'calculateKineticForce',
  type: 'vec3',
  inputs: [
    { name: 'particlePos', type: 'vec3' },
    { name: 'particleVel', type: 'vec3' },
    { name: 'gridCenter', type: 'vec3' },
    { name: 'gridSize', type: 'float' },
    { name: 'uniforms', type: 'KineticUniforms' },
  ],
});

