/**
 * AUDIO/kinetic/gesture-primitives.ts - Gesture-Based Motion Primitives
 * 
 * Defines the 6 core gesture types that particles can perform:
 * 1. Swell - Gradual build with anticipation
 * 2. Attack - Sharp, explosive onset
 * 3. Release - Relaxation and decay
 * 4. Sustain - Held tension or flow
 * 5. Accent - Emphasis and punctuation
 * 6. Breath - Cyclical expansion/contraction
 */

import * as THREE from "three/webgpu";
import { Fn, type NodeRepresentation, uniform, vec3, float, sin, cos, smoothstep, mix, pow } from "three/tsl";
import type { EnhancedAudioData } from '../core/enhanced-audio-analyzer';

/**
 * Gesture output containing multi-modal effects
 */
export interface GestureOutput {
  // Motion
  force: THREE.Vector3;           // Force to apply
  velocityScale: number;          // Velocity multiplier
  
  // Material
  viscosity: number;              // Fluid resistance (0-2)
  stiffness: number;              // Spring stiffness (0-1000)
  pressure: number;               // Expansion/compression (-1 to 1)
  
  // Visual
  hueShift: number;               // Color hue shift (0-1)
  saturation: number;             // Color saturation (0-1)
  brightness: number;             // Brightness multiplier (0-2)
  scale: number;                  // Size multiplier (0-2)
  glow: number;                   // Emission intensity (0-2)
  opacity: number;                // Transparency (0-1)
}

/**
 * Gesture parameters
 */
export interface GestureParams {
  intensity: number;              // Overall strength (0-1)
  phase: number;                  // Progress through gesture (0-1)
  epicenter: THREE.Vector3;       // Center point
  radius: number;                 // Influence radius
  direction: THREE.Vector3;       // Primary direction
  tempo: number;                  // Beats per minute
}

/**
 * Base Gesture interface
 */
export interface Gesture {
  name: string;
  
  /**
   * Calculate gesture output for a particle
   */
  calculate(
    particlePos: THREE.Vector3,
    particleVel: THREE.Vector3,
    params: GestureParams,
    audioData: EnhancedAudioData
  ): GestureOutput;
  
  /**
   * Generate TSL shader function for GPU computation
   */
  generateTSL(): NodeRepresentation;
  
  /**
   * Get default parameters
   */
  getDefaultParams(): Partial<GestureParams>;
}

/**
 * 1. SWELL GESTURE
 * Gradual build with anticipation - particles expand outward from center
 * Used for: Rising pads, crescendos, build-ups
 */
export class SwellGesture implements Gesture {
  name = 'Swell';
  
  getDefaultParams(): Partial<GestureParams> {
    return {
      intensity: 1.0,
      radius: 30.0,
    };
  }
  
  calculate(
    particlePos: THREE.Vector3,
    particleVel: THREE.Vector3,
    params: GestureParams,
    audioData: EnhancedAudioData
  ): GestureOutput {
    const toCenter = new THREE.Vector3().subVectors(params.epicenter, particlePos);
    const dist = toCenter.length();
    const dir = toCenter.clone().normalize();
    
    // Ease-in-out envelope
    const t = params.phase;
    const envelope = this.easeInOutCubic(t);
    
    // Radial outward force (inverse of distance)
    const strength = params.intensity * envelope;
    const falloff = Math.max(0, 1.0 - dist / params.radius);
    const force = dir.clone().multiplyScalar(-strength * falloff * 20.0);
    
    // Add upward lift
    force.y += strength * 3.0 * falloff;
    
    // Add vortex rotation
    const tangent = new THREE.Vector3(-dir.z, 0, dir.x);
    force.add(tangent.multiplyScalar(strength * 5.0 * falloff));
    
    return {
      force,
      velocityScale: 1.0 + envelope * 0.3,
      
      viscosity: THREE.MathUtils.lerp(0.1, 0.5, envelope),
      stiffness: THREE.MathUtils.lerp(100, 300, envelope),
      pressure: envelope * 0.5,
      
      hueShift: envelope * 0.1,
      saturation: 1.0 - envelope * 0.2,
      brightness: 1.0 + envelope * 0.5,
      scale: 1.0 + envelope * 0.3,
      glow: envelope * 0.8,
      opacity: 0.7 + envelope * 0.3,
    };
  }
  
  generateTSL(): NodeRepresentation {
    // TSL uniforms for gesture
    const intensity = uniform(1.0, 'float');
    const phase = uniform(0.0, 'float');
    const epicenter = uniform(vec3(0), 'vec3');
    const radius = uniform(30.0, 'float');
    
    return Fn(([particlePos, particleVel]) => {
      const toCenter = epicenter.sub(particlePos);
      const dist = toCenter.length();
      const dir = toCenter.normalize();
      
      // Ease-in-out envelope
      const t = phase.toVar();
      const envelope = smoothstep(0.0, 0.5, t).mul(float(1.0).sub(smoothstep(0.5, 1.0, t)));
      
      // Radial outward force
      const strength = intensity.mul(envelope);
      const falloff = float(1.0).sub(dist.div(radius)).max(0.0);
      const forceDir = dir.negate();
      const forceMag = strength.mul(falloff).mul(20.0);
      
      // Add upward lift
      const liftForce = vec3(0, strength.mul(3.0).mul(falloff), 0);
      
      // Add rotation
      const tangent = vec3(dir.z.negate(), 0, dir.x);
      const rotForce = tangent.mul(strength.mul(5.0).mul(falloff));
      
      const totalForce = forceDir.mul(forceMag).add(liftForce).add(rotForce);
      
      return {
        force: totalForce,
        envelope,
      };
    }).setLayout({
      name: 'swellGesture',
      type: 'struct',
      inputs: [
        { name: 'particlePos', type: 'vec3' },
        { name: 'particleVel', type: 'vec3' },
      ],
    });
  }
  
  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
}

/**
 * 2. ATTACK GESTURE
 * Sharp, explosive onset - particles burst outward
 * Used for: Drum hits, impacts, sharp transients
 */
export class AttackGesture implements Gesture {
  name = 'Attack';
  
  getDefaultParams(): Partial<GestureParams> {
    return {
      intensity: 1.5,
      radius: 20.0,
    };
  }
  
  calculate(
    particlePos: THREE.Vector3,
    particleVel: THREE.Vector3,
    params: GestureParams,
    audioData: EnhancedAudioData
  ): GestureOutput {
    const toCenter = new THREE.Vector3().subVectors(params.epicenter, particlePos);
    const dist = toCenter.length();
    const dir = toCenter.clone().normalize();
    
    // Exponential decay envelope
    const t = params.phase;
    const envelope = Math.exp(-t * 5.0); // Sharp attack, fast decay
    
    // Radial burst force
    const strength = params.intensity * envelope;
    const falloff = Math.exp(-dist / params.radius);
    const force = dir.clone().multiplyScalar(-strength * falloff * 50.0);
    
    // Add angular scatter
    const scatter = new THREE.Vector3(
      (Math.random() - 0.5) * strength * 10.0,
      (Math.random() - 0.5) * strength * 10.0,
      (Math.random() - 0.5) * strength * 10.0
    );
    force.add(scatter);
    
    return {
      force,
      velocityScale: 1.0 + envelope * 0.5,
      
      viscosity: 0.05, // Very low resistance for explosive motion
      stiffness: THREE.MathUtils.lerp(500, 100, t),
      pressure: -envelope * 0.3, // Expansion
      
      hueShift: envelope * 0.2,
      saturation: 1.0 + envelope * 0.5,
      brightness: 1.0 + envelope * 1.5,
      scale: 1.0 + envelope * 0.5,
      glow: envelope * 2.0,
      opacity: 0.9,
    };
  }
  
  generateTSL(): NodeRepresentation {
    const intensity = uniform(1.5, 'float');
    const phase = uniform(0.0, 'float');
    const epicenter = uniform(vec3(0), 'vec3');
    const radius = uniform(20.0, 'float');
    
    return Fn(([particlePos, particleVel]) => {
      const toCenter = epicenter.sub(particlePos);
      const dist = toCenter.length();
      const dir = toCenter.normalize();
      
      // Exponential decay
      const envelope = pow(float(2.718), phase.negate().mul(5.0));
      
      // Radial burst
      const strength = intensity.mul(envelope);
      const falloff = pow(float(2.718), dist.negate().div(radius));
      const forceDir = dir.negate();
      const forceMag = strength.mul(falloff).mul(50.0);
      
      return {
        force: forceDir.mul(forceMag),
        envelope,
      };
    }).setLayout({
      name: 'attackGesture',
      type: 'struct',
      inputs: [
        { name: 'particlePos', type: 'vec3' },
        { name: 'particleVel', type: 'vec3' },
      ],
    });
  }
}

/**
 * 3. RELEASE GESTURE
 * Relaxation and decay - particles gently settle
 * Used for: Fadeouts, releases, decays
 */
export class ReleaseGesture implements Gesture {
  name = 'Release';
  
  getDefaultParams(): Partial<GestureParams> {
    return {
      intensity: 0.8,
      radius: 40.0,
    };
  }
  
  calculate(
    particlePos: THREE.Vector3,
    particleVel: THREE.Vector3,
    params: GestureParams,
    audioData: EnhancedAudioData
  ): GestureOutput {
    const t = params.phase;
    
    // Exponential decay (slower than attack)
    const envelope = Math.exp(-t * 2.0);
    
    // Damping force (proportional to velocity)
    const damping = particleVel.clone().multiplyScalar(-params.intensity * envelope * 2.0);
    
    // Gentle downward drift
    const drift = new THREE.Vector3(0, -params.intensity * envelope * 1.0, 0);
    
    const force = new THREE.Vector3().addVectors(damping, drift);
    
    return {
      force,
      velocityScale: 1.0 - envelope * 0.3,
      
      viscosity: THREE.MathUtils.lerp(0.1, 0.8, t),
      stiffness: THREE.MathUtils.lerp(300, 50, t),
      pressure: -envelope * 0.2,
      
      hueShift: -envelope * 0.05,
      saturation: 1.0 - envelope * 0.5,
      brightness: 1.0 - t * 0.5,
      scale: 1.0 - t * 0.2,
      glow: envelope * 0.3,
      opacity: THREE.MathUtils.lerp(1.0, 0.5, t),
    };
  }
  
  generateTSL(): NodeRepresentation {
    const intensity = uniform(0.8, 'float');
    const phase = uniform(0.0, 'float');
    
    return Fn(([particlePos, particleVel]) => {
      // Exponential decay
      const envelope = pow(float(2.718), phase.negate().mul(2.0));
      
      // Damping force
      const damping = particleVel.negate().mul(intensity).mul(envelope).mul(2.0);
      
      // Downward drift
      const drift = vec3(0, intensity.negate().mul(envelope).mul(1.0), 0);
      
      const force = damping.add(drift);
      
      return {
        force,
        envelope,
      };
    }).setLayout({
      name: 'releaseGesture',
      type: 'struct',
      inputs: [
        { name: 'particlePos', type: 'vec3' },
        { name: 'particleVel', type: 'vec3' },
      ],
    });
  }
}

/**
 * 4. SUSTAIN GESTURE
 * Held tension or flow - particles maintain state
 * Used for: Sustained notes, pads, drones
 */
export class SustainGesture implements Gesture {
  name = 'Sustain';
  
  getDefaultParams(): Partial<GestureParams> {
    return {
      intensity: 0.6,
      radius: 35.0,
    };
  }
  
  calculate(
    particlePos: THREE.Vector3,
    particleVel: THREE.Vector3,
    params: GestureParams,
    audioData: EnhancedAudioData
  ): GestureOutput {
    const t = params.phase;
    
    // Constant envelope (sustain)
    const envelope = params.intensity;
    
    // Gentle flow in direction
    const flowForce = params.direction.clone().multiplyScalar(envelope * 5.0);
    
    // Velocity maintenance (resist decay)
    const maintenance = particleVel.clone().multiplyScalar(envelope * 0.5);
    
    const force = new THREE.Vector3().addVectors(flowForce, maintenance);
    
    return {
      force,
      velocityScale: 1.0,
      
      viscosity: 0.3,
      stiffness: 200,
      pressure: 0,
      
      hueShift: Math.sin(t * Math.PI * 2) * 0.05,
      saturation: 0.8,
      brightness: 1.0,
      scale: 1.0,
      glow: envelope * 0.5,
      opacity: 0.8,
    };
  }
  
  generateTSL(): NodeRepresentation {
    const intensity = uniform(0.6, 'float');
    const phase = uniform(0.0, 'float');
    const flowDirection = uniform(vec3(1, 0, 0), 'vec3');
    
    return Fn(([particlePos, particleVel]) => {
      const envelope = intensity;
      
      // Flow force
      const flowForce = flowDirection.mul(envelope).mul(5.0);
      
      // Velocity maintenance
      const maintenance = particleVel.mul(envelope).mul(0.5);
      
      const force = flowForce.add(maintenance);
      
      return {
        force,
        envelope,
      };
    }).setLayout({
      name: 'sustainGesture',
      type: 'struct',
      inputs: [
        { name: 'particlePos', type: 'vec3' },
        { name: 'particleVel', type: 'vec3' },
      ],
    });
  }
}

/**
 * 5. ACCENT GESTURE
 * Emphasis and punctuation - particles snap to attention
 * Used for: Downbeats, accents, rhythmic emphasis
 */
export class AccentGesture implements Gesture {
  name = 'Accent';
  
  getDefaultParams(): Partial<GestureParams> {
    return {
      intensity: 1.2,
      radius: 25.0,
    };
  }
  
  calculate(
    particlePos: THREE.Vector3,
    particleVel: THREE.Vector3,
    params: GestureParams,
    audioData: EnhancedAudioData
  ): GestureOutput {
    const t = params.phase;
    
    // Sharp spike with quick decay
    const envelope = Math.exp(-t * 8.0) * (1 - t);
    
    // Directional impulse
    const impulse = params.direction.clone().multiplyScalar(params.intensity * envelope * 30.0);
    
    // Snap to attention (reduce chaos)
    const snap = particleVel.clone().multiplyScalar(-envelope * 0.3);
    
    const force = new THREE.Vector3().addVectors(impulse, snap);
    
    return {
      force,
      velocityScale: 1.0 + envelope * 0.4,
      
      viscosity: THREE.MathUtils.lerp(0.1, 0.4, t),
      stiffness: THREE.MathUtils.lerp(600, 200, t),
      pressure: envelope * 0.2,
      
      hueShift: envelope * 0.15,
      saturation: 1.0 + envelope * 0.3,
      brightness: 1.0 + envelope * 1.0,
      scale: 1.0 + envelope * 0.2,
      glow: envelope * 1.2,
      opacity: 0.9,
    };
  }
  
  generateTSL(): NodeRepresentation {
    const intensity = uniform(1.2, 'float');
    const phase = uniform(0.0, 'float');
    const direction = uniform(vec3(0, 1, 0), 'vec3');
    
    return Fn(([particlePos, particleVel]) => {
      // Sharp spike
      const envelope = pow(float(2.718), phase.negate().mul(8.0)).mul(float(1.0).sub(phase));
      
      // Directional impulse
      const impulse = direction.mul(intensity).mul(envelope).mul(30.0);
      
      // Snap
      const snap = particleVel.negate().mul(envelope).mul(0.3);
      
      const force = impulse.add(snap);
      
      return {
        force,
        envelope,
      };
    }).setLayout({
      name: 'accentGesture',
      type: 'struct',
      inputs: [
        { name: 'particlePos', type: 'vec3' },
        { name: 'particleVel', type: 'vec3' },
      ],
    });
  }
}

/**
 * 6. BREATH GESTURE
 * Cyclical expansion/contraction - particles breathe
 * Used for: Periodic motion, breathing, cyclical patterns
 */
export class BreathGesture implements Gesture {
  name = 'Breath';
  
  getDefaultParams(): Partial<GestureParams> {
    return {
      intensity: 0.7,
      radius: 30.0,
    };
  }
  
  calculate(
    particlePos: THREE.Vector3,
    particleVel: THREE.Vector3,
    params: GestureParams,
    audioData: EnhancedAudioData
  ): GestureOutput {
    const toCenter = new THREE.Vector3().subVectors(params.epicenter, particlePos);
    const dist = toCenter.length();
    const dir = toCenter.clone().normalize();
    
    // Sinusoidal breathing cycle
    const breathPhase = Math.sin(params.phase * Math.PI * 2);
    const envelope = params.intensity;
    
    // Radial breathing (in/out)
    const breathForce = dir.clone().multiplyScalar(breathPhase * envelope * 8.0);
    
    // Gentle rotation
    const tangent = new THREE.Vector3(-dir.z, 0, dir.x);
    const rotation = tangent.multiplyScalar(envelope * 2.0);
    
    const force = new THREE.Vector3().addVectors(breathForce, rotation);
    
    // Scale modulation
    const scale = 1.0 + breathPhase * envelope * 0.2;
    
    return {
      force,
      velocityScale: 1.0,
      
      viscosity: 0.4,
      stiffness: 150,
      pressure: breathPhase * envelope * 0.3,
      
      hueShift: breathPhase * 0.1,
      saturation: 0.7 + breathPhase * 0.3,
      brightness: 1.0 + Math.abs(breathPhase) * envelope * 0.3,
      scale,
      glow: Math.abs(breathPhase) * envelope * 0.6,
      opacity: 0.75 + Math.abs(breathPhase) * 0.25,
    };
  }
  
  generateTSL(): NodeRepresentation {
    const intensity = uniform(0.7, 'float');
    const phase = uniform(0.0, 'float');
    const epicenter = uniform(vec3(0), 'vec3');
    const radius = uniform(30.0, 'float');
    
    return Fn(([particlePos, particleVel]) => {
      const toCenter = epicenter.sub(particlePos);
      const dist = toCenter.length();
      const dir = toCenter.normalize();
      
      // Sinusoidal breathing
      const breathPhase = sin(phase.mul(Math.PI * 2));
      const envelope = intensity;
      
      // Radial breathing
      const breathForce = dir.mul(breathPhase).mul(envelope).mul(8.0);
      
      // Rotation
      const tangent = vec3(dir.z.negate(), 0, dir.x);
      const rotation = tangent.mul(envelope).mul(2.0);
      
      const force = breathForce.add(rotation);
      
      return {
        force,
        envelope: breathPhase,
      };
    }).setLayout({
      name: 'breathGesture',
      type: 'struct',
      inputs: [
        { name: 'particlePos', type: 'vec3' },
        { name: 'particleVel', type: 'vec3' },
      ],
    });
  }
}

/**
 * Gesture factory - create gesture instances
 */
export class GestureFactory {
  private static gestures: Map<string, Gesture> = new Map([
    ['swell', new SwellGesture()],
    ['attack', new AttackGesture()],
    ['release', new ReleaseGesture()],
    ['sustain', new SustainGesture()],
    ['accent', new AccentGesture()],
    ['breath', new BreathGesture()],
  ]);
  
  static getGesture(name: string): Gesture | undefined {
    return this.gestures.get(name.toLowerCase());
  }
  
  static getAllGestures(): Gesture[] {
    return Array.from(this.gestures.values());
  }
  
  static getGestureNames(): string[] {
    return Array.from(this.gestures.keys());
  }
}

