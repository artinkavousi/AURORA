/**
 * PARTICLESYSTEM/physic/emitters.ts - Particle emission system
 * Single responsibility: Dynamic particle spawning and lifecycle management
 */

import * as THREE from "three/webgpu";
import { MaterialType } from "./materials";

/**
 * Emitter types
 */
export enum EmitterType {
  POINT = 0,        // Emit from single point
  SPHERE = 1,       // Emit from sphere surface
  DISC = 2,         // Emit from disc
  BOX = 3,          // Emit from box volume
  CONE = 4,         // Emit in cone shape
  RING = 5,         // Emit from ring/torus
}

/**
 * Emission patterns
 */
export enum EmissionPattern {
  CONTINUOUS = 0,   // Steady stream
  BURST = 1,        // Emit all at once
  PULSE = 2,        // Rhythmic bursts
  FOUNTAIN = 3,     // Upward arc
  EXPLOSION = 4,    // Radial burst
  STREAM = 5,       // Directed flow
}

/**
 * Particle emitter configuration
 */
export interface ParticleEmitterConfig {
  // Core settings
  type: EmitterType;
  pattern: EmissionPattern;
  enabled: boolean;
  name: string;
  
  // Transform
  position: THREE.Vector3;
  direction: THREE.Vector3;
  rotation: THREE.Euler;
  scale: THREE.Vector3;
  
  // Emission parameters
  rate: number;               // particles per second [0.0 - 10000.0]
  lifetime: number;           // particle lifetime in seconds [0.1 - 100.0]
  lifetimeVariance: number;   // randomness in lifetime [0.0 - 1.0]
  
  // Velocity parameters
  velocity: number;           // initial velocity magnitude [0.0 - 100.0]
  velocityVariance: number;   // randomness in velocity [0.0 - 1.0]
  spread: number;             // emission cone angle in radians [0.0 - Math.PI]
  
  // Burst parameters (for burst pattern)
  burstCount: number;         // particles per burst [1 - 10000]
  burstInterval: number;      // time between bursts in seconds [0.1 - 10.0]
  
  // Material
  materialType: MaterialType;
  
  // Size
  startSize: number;          // initial size [0.1 - 10.0]
  endSize: number;            // final size [0.1 - 10.0]
  
  // Color
  startColor: THREE.Color;
  endColor: THREE.Color;
  
  // Physics inheritance
  inheritVelocity: number;    // inherit emitter velocity [0.0 - 1.0]
}

/**
 * Default emitter configuration
 */
export const DEFAULT_EMITTER: ParticleEmitterConfig = {
  type: EmitterType.POINT,
  pattern: EmissionPattern.CONTINUOUS,
  enabled: true,
  name: "Emitter",
  position: new THREE.Vector3(0, 0, 0),
  direction: new THREE.Vector3(0, 1, 0),
  rotation: new THREE.Euler(0, 0, 0),
  scale: new THREE.Vector3(1, 1, 1),
  rate: 100.0,
  lifetime: 5.0,
  lifetimeVariance: 0.2,
  velocity: 10.0,
  velocityVariance: 0.3,
  spread: Math.PI / 6,
  burstCount: 1000,
  burstInterval: 1.0,
  materialType: MaterialType.FLUID,
  startSize: 1.0,
  endSize: 0.5,
  startColor: new THREE.Color(1, 1, 1),
  endColor: new THREE.Color(0.5, 0.5, 1),
  inheritVelocity: 0.0,
};

/**
 * Emitter presets
 */
export const EMITTER_PRESETS: Record<string, Partial<ParticleEmitterConfig>> = {
  FOUNTAIN: {
    name: "Fountain",
    type: EmitterType.DISC,
    pattern: EmissionPattern.FOUNTAIN,
    rate: 500,
    velocity: 20,
    spread: Math.PI / 8,
    lifetime: 3.0,
    direction: new THREE.Vector3(0, 1, 0),
    materialType: MaterialType.FLUID,
    scale: new THREE.Vector3(0.5, 0.5, 0.5),
  },
  
  EXPLOSION: {
    name: "Explosion",
    type: EmitterType.SPHERE,
    pattern: EmissionPattern.EXPLOSION,
    rate: 0,
    burstCount: 5000,
    burstInterval: 2.0,
    velocity: 30,
    velocityVariance: 0.5,
    spread: Math.PI,
    lifetime: 2.0,
    materialType: MaterialType.PLASMA,
    startSize: 1.5,
    endSize: 0.1,
  },
  
  SMOKE: {
    name: "Smoke",
    type: EmitterType.DISC,
    pattern: EmissionPattern.CONTINUOUS,
    rate: 200,
    velocity: 5,
    velocityVariance: 0.5,
    spread: Math.PI / 4,
    lifetime: 6.0,
    direction: new THREE.Vector3(0, 1, 0),
    materialType: MaterialType.FOAM,
    startSize: 0.5,
    endSize: 3.0,
    scale: new THREE.Vector3(1, 1, 1),
  },
  
  WATERFALL: {
    name: "Waterfall",
    type: EmitterType.BOX,
    pattern: EmissionPattern.STREAM,
    rate: 1000,
    velocity: 15,
    velocityVariance: 0.1,
    spread: Math.PI / 16,
    lifetime: 4.0,
    direction: new THREE.Vector3(0, -1, 0),
    materialType: MaterialType.FLUID,
    scale: new THREE.Vector3(3, 0.5, 1),
  },
  
  FIRE: {
    name: "Fire",
    type: EmitterType.CONE,
    pattern: EmissionPattern.CONTINUOUS,
    rate: 800,
    velocity: 8,
    velocityVariance: 0.6,
    spread: Math.PI / 6,
    lifetime: 1.5,
    lifetimeVariance: 0.5,
    direction: new THREE.Vector3(0, 1, 0),
    materialType: MaterialType.PLASMA,
    startSize: 1.0,
    endSize: 0.1,
    startColor: new THREE.Color(1, 0.5, 0),
    endColor: new THREE.Color(1, 0, 0),
  },
  
  SNOW: {
    name: "Snow",
    type: EmitterType.BOX,
    pattern: EmissionPattern.CONTINUOUS,
    rate: 300,
    velocity: 2,
    velocityVariance: 0.8,
    spread: Math.PI / 3,
    lifetime: 8.0,
    direction: new THREE.Vector3(0, -1, 0),
    materialType: MaterialType.SNOW,
    scale: new THREE.Vector3(10, 0.5, 10),
    startSize: 0.8,
    endSize: 0.8,
  },
  
  SPARK_BURST: {
    name: "Sparks",
    type: EmitterType.POINT,
    pattern: EmissionPattern.PULSE,
    rate: 0,
    burstCount: 100,
    burstInterval: 0.5,
    velocity: 25,
    velocityVariance: 0.7,
    spread: Math.PI,
    lifetime: 1.0,
    materialType: MaterialType.PLASMA,
    startSize: 1.0,
    endSize: 0.1,
    startColor: new THREE.Color(1, 1, 0),
    endColor: new THREE.Color(1, 0.5, 0),
  },
  
  SANDSTORM: {
    name: "Sandstorm",
    type: EmitterType.BOX,
    pattern: EmissionPattern.CONTINUOUS,
    rate: 600,
    velocity: 10,
    velocityVariance: 0.6,
    spread: Math.PI / 4,
    lifetime: 5.0,
    direction: new THREE.Vector3(1, 0.2, 0),
    materialType: MaterialType.SAND,
    scale: new THREE.Vector3(1, 5, 8),
  },
};

/**
 * Particle data for emission
 */
export interface EmittedParticle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  lifetime: number;
  age: number;
  size: number;
  materialType: MaterialType;
  color: THREE.Color;
}

/**
 * Particle emitter manager
 */
export class ParticleEmitterManager {
  private emitters: ParticleEmitterConfig[] = [];
  private emitterStates: Map<number, EmitterState> = new Map();
  private maxEmitters: number;
  
  constructor(maxEmitters: number = 8) {
    this.maxEmitters = maxEmitters;
  }
  
  /**
   * Add emitter
   */
  public addEmitter(config: Partial<ParticleEmitterConfig> = {}): number {
    if (this.emitters.length >= this.maxEmitters) {
      console.warn(`Maximum emitters (${this.maxEmitters}) reached`);
      return -1;
    }
    
    const emitter: ParticleEmitterConfig = { ...DEFAULT_EMITTER, ...config };
    const index = this.emitters.length;
    this.emitters.push(emitter);
    this.emitterStates.set(index, new EmitterState());
    return index;
  }
  
  /**
   * Remove emitter
   */
  public removeEmitter(index: number): void {
    if (index >= 0 && index < this.emitters.length) {
      this.emitters.splice(index, 1);
      this.emitterStates.delete(index);
    }
  }
  
  /**
   * Get emitter
   */
  public getEmitter(index: number): ParticleEmitterConfig | undefined {
    return this.emitters[index];
  }
  
  /**
   * Update emitter
   */
  public updateEmitter(index: number, updates: Partial<ParticleEmitterConfig>): void {
    if (index >= 0 && index < this.emitters.length) {
      Object.assign(this.emitters[index], updates);
    }
  }
  
  /**
   * Add preset emitter
   */
  public addPreset(presetName: keyof typeof EMITTER_PRESETS): number {
    const preset = EMITTER_PRESETS[presetName];
    return this.addEmitter(preset);
  }
  
  /**
   * Update and emit particles
   */
  public update(deltaTime: number): EmittedParticle[] {
    const emittedParticles: EmittedParticle[] = [];
    
    this.emitters.forEach((emitter, index) => {
      if (!emitter.enabled) return;
      
      const state = this.emitterStates.get(index)!;
      const particles = this.emitFromEmitter(emitter, state, deltaTime);
      emittedParticles.push(...particles);
    });
    
    return emittedParticles;
  }
  
  /**
   * Emit particles from single emitter
   */
  private emitFromEmitter(
    emitter: ParticleEmitterConfig,
    state: EmitterState,
    deltaTime: number
  ): EmittedParticle[] {
    const particles: EmittedParticle[] = [];
    
    switch (emitter.pattern) {
      case EmissionPattern.CONTINUOUS:
        const count = Math.floor(emitter.rate * deltaTime + state.accumulator);
        state.accumulator += emitter.rate * deltaTime - count;
        for (let i = 0; i < count; i++) {
          particles.push(this.createParticle(emitter));
        }
        break;
        
      case EmissionPattern.BURST:
        if (state.timeSinceLastBurst >= emitter.burstInterval) {
          for (let i = 0; i < emitter.burstCount; i++) {
            particles.push(this.createParticle(emitter));
          }
          state.timeSinceLastBurst = 0;
        }
        state.timeSinceLastBurst += deltaTime;
        break;
        
      case EmissionPattern.PULSE:
        state.timeSinceLastBurst += deltaTime;
        if (state.timeSinceLastBurst >= emitter.burstInterval) {
          for (let i = 0; i < emitter.burstCount; i++) {
            particles.push(this.createParticle(emitter));
          }
          state.timeSinceLastBurst = 0;
        }
        break;
        
      case EmissionPattern.FOUNTAIN:
      case EmissionPattern.STREAM:
        const streamCount = Math.floor(emitter.rate * deltaTime + state.accumulator);
        state.accumulator += emitter.rate * deltaTime - streamCount;
        for (let i = 0; i < streamCount; i++) {
          const particle = this.createParticle(emitter);
          // Add upward arc for fountain
          if (emitter.pattern === EmissionPattern.FOUNTAIN) {
            particle.velocity.y += emitter.velocity * 0.5;
          }
          particles.push(particle);
        }
        break;
        
      case EmissionPattern.EXPLOSION:
        if (!state.hasExploded) {
          for (let i = 0; i < emitter.burstCount; i++) {
            const particle = this.createParticle(emitter);
            // Radial explosion
            const dir = new THREE.Vector3(
              Math.random() * 2 - 1,
              Math.random() * 2 - 1,
              Math.random() * 2 - 1
            ).normalize();
            particle.velocity.copy(dir).multiplyScalar(emitter.velocity);
            particles.push(particle);
          }
          state.hasExploded = true;
          state.timeSinceLastBurst = 0;
        }
        state.timeSinceLastBurst += deltaTime;
        if (state.timeSinceLastBurst >= emitter.burstInterval) {
          state.hasExploded = false;
        }
        break;
    }
    
    return particles;
  }
  
  /**
   * Create single particle
   */
  private createParticle(emitter: ParticleEmitterConfig): EmittedParticle {
    const position = this.generatePosition(emitter);
    const velocity = this.generateVelocity(emitter);
    const lifetime = emitter.lifetime * (1 + (Math.random() * 2 - 1) * emitter.lifetimeVariance);
    
    return {
      position,
      velocity,
      lifetime: Math.max(0.1, lifetime),
      age: 0,
      size: emitter.startSize,
      materialType: emitter.materialType,
      color: emitter.startColor.clone(),
    };
  }
  
  /**
   * Generate emission position based on emitter type
   */
  private generatePosition(emitter: ParticleEmitterConfig): THREE.Vector3 {
    const pos = new THREE.Vector3();
    
    switch (emitter.type) {
      case EmitterType.POINT:
        pos.copy(emitter.position);
        break;
        
      case EmitterType.SPHERE:
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(Math.random() * 2 - 1);
        const r = emitter.scale.x;
        pos.set(
          r * Math.sin(phi) * Math.cos(theta),
          r * Math.sin(phi) * Math.sin(theta),
          r * Math.cos(phi)
        ).add(emitter.position);
        break;
        
      case EmitterType.DISC:
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.sqrt(Math.random()) * emitter.scale.x;
        pos.set(
          radius * Math.cos(angle),
          0,
          radius * Math.sin(angle)
        ).add(emitter.position);
        break;
        
      case EmitterType.BOX:
        pos.set(
          (Math.random() - 0.5) * emitter.scale.x,
          (Math.random() - 0.5) * emitter.scale.y,
          (Math.random() - 0.5) * emitter.scale.z
        ).add(emitter.position);
        break;
        
      case EmitterType.CONE:
        const coneAngle = Math.random() * Math.PI * 2;
        const coneRadius = Math.random() * Math.tan(emitter.spread) * emitter.scale.x;
        pos.set(
          coneRadius * Math.cos(coneAngle),
          0,
          coneRadius * Math.sin(coneAngle)
        ).add(emitter.position);
        break;
        
      case EmitterType.RING:
        const ringAngle = Math.random() * Math.PI * 2;
        const ringRadius = emitter.scale.x;
        pos.set(
          ringRadius * Math.cos(ringAngle),
          0,
          ringRadius * Math.sin(ringAngle)
        ).add(emitter.position);
        break;
    }
    
    return pos;
  }
  
  /**
   * Generate emission velocity
   */
  private generateVelocity(emitter: ParticleEmitterConfig): THREE.Vector3 {
    const dir = emitter.direction.clone().normalize();
    
    // Add spread
    const spreadTheta = (Math.random() * 2 - 1) * emitter.spread;
    const spreadPhi = Math.random() * Math.PI * 2;
    
    const perpendicular1 = new THREE.Vector3();
    const perpendicular2 = new THREE.Vector3();
    
    if (Math.abs(dir.y) < 0.9) {
      perpendicular1.crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();
    } else {
      perpendicular1.crossVectors(dir, new THREE.Vector3(1, 0, 0)).normalize();
    }
    perpendicular2.crossVectors(dir, perpendicular1).normalize();
    
    const spreadDir = dir.clone()
      .add(perpendicular1.multiplyScalar(Math.sin(spreadTheta) * Math.cos(spreadPhi)))
      .add(perpendicular2.multiplyScalar(Math.sin(spreadTheta) * Math.sin(spreadPhi)))
      .normalize();
    
    // Apply velocity with variance
    const speed = emitter.velocity * (1 + (Math.random() * 2 - 1) * emitter.velocityVariance);
    
    return spreadDir.multiplyScalar(speed);
  }
  
  /**
   * Get all emitters
   */
  public getEmitters(): ParticleEmitterConfig[] {
    return [...this.emitters];
  }
  
  /**
   * Clear all emitters
   */
  public clearEmitters(): void {
    this.emitters = [];
    this.emitterStates.clear();
  }
}

/**
 * Emitter state (internal)
 */
class EmitterState {
  accumulator: number = 0;
  timeSinceLastBurst: number = 0;
  hasExploded: boolean = false;
}

