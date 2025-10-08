/**
 * AUDIO/kinetic/ensemble-choreographer.ts - Ensemble Choreography System
 * 
 * Assigns roles to particles (Lead/Support/Ambient) and coordinates their behavior
 * Creates choreographed group motion with inter-particle communication
 */

import * as THREE from "three/webgpu";
import type { EnhancedAudioData } from '../core/enhanced-audio-analyzer';
import type { ActiveGesture } from './gesture-interpreter';

/**
 * Particle role types
 */
export enum ParticleRole {
  LEAD = 'lead',          // 10% - Large, bright, follow primary melody/beat
  SUPPORT = 'support',    // 30% - Medium, respond to harmony and rhythm
  AMBIENT = 'ambient',    // 60% - Small, provide atmospheric context
}

/**
 * Formation types
 */
export enum FormationType {
  SCATTERED = 'scattered',      // Dispersed, chaotic
  CLUSTERED = 'clustered',      // Grouped together
  ORBITING = 'orbiting',        // Circular motion around center
  FLOWING = 'flowing',          // Directional flow
  LAYERED = 'layered',          // Horizontal layers
  RADIAL = 'radial',            // Radial expansion/contraction
  GRID = 'grid',                // Organized grid pattern
  SPIRAL = 'spiral',            // Spiral pattern
}

/**
 * Particle role assignment
 */
export interface ParticleRoleAssignment {
  particleIndex: number;
  role: ParticleRole;
  priority: number;         // 0-1, higher = more important
  energy: number;           // Current energy level
  lastUpdate: number;       // Time of last role update
}

/**
 * Influence signal from lead particles
 */
export interface InfluenceSignal {
  sourceIndex: number;      // Lead particle index
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  gesture: string;          // Active gesture name
  gesturePhase: number;     // 0-1
  intensity: number;        // Signal strength
  radius: number;           // Influence radius
}

/**
 * Formation state
 */
export interface FormationState {
  type: FormationType;
  center: THREE.Vector3;
  radius: number;
  direction: THREE.Vector3;
  rotation: number;         // Rotation speed
  cohesion: number;         // How tightly grouped (0-1)
  energy: number;           // Formation energy level
}

/**
 * Ensemble choreography state
 */
export interface EnsembleState {
  roleAssignments: Map<number, ParticleRoleAssignment>;
  influenceSignals: InfluenceSignal[];
  formation: FormationState;
  
  leadCount: number;
  supportCount: number;
  ambientCount: number;
  
  transitionPhase: number;  // 0-1 during formation transitions
  lastUpdate: number;
}

/**
 * EnsembleChoreographer - Coordinates particle roles and formations
 */
export class EnsembleChoreographer {
  // Configuration
  private readonly leadPercentage = 0.10;
  private readonly supportPercentage = 0.30;
  private readonly ambientPercentage = 0.60;
  
  private readonly roleHysteresis = 2.0;  // Seconds before role can change
  private readonly influenceRadius = 50.0;
  private readonly formationTransitionTime = 2.0;  // Seconds
  
  // State
  private roleAssignments: Map<number, ParticleRoleAssignment> = new Map();
  private influenceSignals: InfluenceSignal[] = [];
  private currentFormation: FormationState;
  private targetFormation: FormationState | null = null;
  private formationTransitionStart = 0;
  
  // Camera reference for depth calculation
  private camera: THREE.Camera | null = null;
  
  // Particle data cache
  private particlePositions: Float32Array | null = null;
  private particleVelocities: Float32Array | null = null;
  private particleCount = 0;
  
  private currentTime = 0;
  
  constructor() {
    this.currentFormation = this.createFormation(FormationType.SCATTERED);
  }
  
  /**
   * Set camera for depth-based calculations
   */
  setCamera(camera: THREE.Camera): void {
    this.camera = camera;
  }
  
  /**
   * Update particle data from simulation
   */
  updateParticleData(positions: Float32Array, velocities: Float32Array): void {
    this.particlePositions = positions;
    this.particleVelocities = velocities;
    this.particleCount = positions.length / 3;
  }
  
  /**
   * Update ensemble choreography
   */
  update(
    audioData: EnhancedAudioData,
    activeGestures: ActiveGesture[],
    deltaTime: number
  ): EnsembleState {
    this.currentTime = audioData.time;
    
    if (!this.particlePositions || !this.particleVelocities) {
      return this.getEmptyState();
    }
    
    // Update role assignments
    this.updateRoleAssignments(audioData);
    
    // Generate influence signals from lead particles
    this.generateInfluenceSignals(activeGestures);
    
    // Update formation based on musical structure
    this.updateFormation(audioData, deltaTime);
    
    // Build state
    return {
      roleAssignments: new Map(this.roleAssignments),
      influenceSignals: [...this.influenceSignals],
      formation: { ...this.currentFormation },
      
      leadCount: this.countRole(ParticleRole.LEAD),
      supportCount: this.countRole(ParticleRole.SUPPORT),
      ambientCount: this.countRole(ParticleRole.AMBIENT),
      
      transitionPhase: this.getFormationTransitionPhase(),
      lastUpdate: this.currentTime,
    };
  }
  
  /**
   * Update particle role assignments
   */
  private updateRoleAssignments(audioData: EnhancedAudioData): void {
    if (!this.particlePositions || !this.camera) return;
    
    // Calculate priority scores for all particles
    const priorities: Array<{ index: number; priority: number; energy: number }> = [];
    
    for (let i = 0; i < this.particleCount; i++) {
      const pos = new THREE.Vector3(
        this.particlePositions[i * 3],
        this.particlePositions[i * 3 + 1],
        this.particlePositions[i * 3 + 2]
      );
      
      const vel = new THREE.Vector3(
        this.particleVelocities[i * 3],
        this.particleVelocities[i * 3 + 1],
        this.particleVelocities[i * 3 + 2]
      );
      
      // Calculate priority based on multiple factors
      const priority = this.calculateParticlePriority(pos, vel, i, audioData);
      const energy = vel.length();
      
      priorities.push({ index: i, priority, energy });
    }
    
    // Sort by priority
    priorities.sort((a, b) => b.priority - a.priority);
    
    // Assign roles based on percentile
    const leadCount = Math.floor(this.particleCount * this.leadPercentage);
    const supportCount = Math.floor(this.particleCount * this.supportPercentage);
    
    for (let i = 0; i < priorities.length; i++) {
      const { index, priority, energy } = priorities[i];
      
      // Check if role can change (hysteresis)
      const existing = this.roleAssignments.get(index);
      const canChange = !existing || (this.currentTime - existing.lastUpdate) > this.roleHysteresis;
      
      if (canChange || !existing) {
        let role: ParticleRole;
        
        if (i < leadCount) {
          role = ParticleRole.LEAD;
        } else if (i < leadCount + supportCount) {
          role = ParticleRole.SUPPORT;
        } else {
          role = ParticleRole.AMBIENT;
        }
        
        // Only update if role changed or new assignment
        if (!existing || existing.role !== role) {
          this.roleAssignments.set(index, {
            particleIndex: index,
            role,
            priority,
            energy,
            lastUpdate: this.currentTime,
          });
        } else {
          // Update priority and energy
          existing.priority = priority;
          existing.energy = energy;
        }
      }
    }
  }
  
  /**
   * Calculate particle priority score
   */
  private calculateParticlePriority(
    pos: THREE.Vector3,
    vel: THREE.Vector3,
    index: number,
    audioData: EnhancedAudioData
  ): number {
    if (!this.camera) return Math.random();
    
    // Factor 1: Distance to camera (closer = higher priority)
    const distToCamera = pos.distanceTo(this.camera.position);
    const maxDist = 100; // Assume max viewing distance
    const distScore = 1.0 - Math.min(distToCamera / maxDist, 1.0);
    
    // Factor 2: Particle energy (faster = higher priority)
    const energy = vel.length();
    const maxEnergy = 20; // Reasonable max velocity
    const energyScore = Math.min(energy / maxEnergy, 1.0);
    
    // Factor 3: Height (higher = more prominent)
    const heightScore = (pos.y + 50) / 100; // Normalize to 0-1
    
    // Factor 4: Audio reactivity (particles in high-audio zones)
    const audioScore = audioData.smoothOverall;
    
    // Factor 5: Random variation (prevent static assignments)
    const randomScore = Math.random();
    
    // Weighted combination
    const priority = 
      distScore * 0.35 +
      energyScore * 0.25 +
      heightScore * 0.15 +
      audioScore * 0.15 +
      randomScore * 0.10;
    
    return THREE.MathUtils.clamp(priority, 0, 1);
  }
  
  /**
   * Generate influence signals from lead particles
   */
  private generateInfluenceSignals(activeGestures: ActiveGesture[]): void {
    if (!this.particlePositions || !this.particleVelocities) return;
    
    this.influenceSignals = [];
    
    // Get lead particles
    const leadParticles = Array.from(this.roleAssignments.entries())
      .filter(([_, assignment]) => assignment.role === ParticleRole.LEAD);
    
    for (const [index, assignment] of leadParticles) {
      const pos = new THREE.Vector3(
        this.particlePositions[index * 3],
        this.particlePositions[index * 3 + 1],
        this.particlePositions[index * 3 + 2]
      );
      
      const vel = new THREE.Vector3(
        this.particleVelocities[index * 3],
        this.particleVelocities[index * 3 + 1],
        this.particleVelocities[index * 3 + 2]
      );
      
      // Use primary active gesture if available
      const gesture = activeGestures.length > 0 ? activeGestures[0] : null;
      
      this.influenceSignals.push({
        sourceIndex: index,
        position: pos.clone(),
        velocity: vel.clone(),
        gesture: gesture?.gesture.name || 'none',
        gesturePhase: gesture?.params.phase || 0,
        intensity: assignment.priority,
        radius: this.influenceRadius,
      });
    }
  }
  
  /**
   * Update formation based on musical structure
   */
  private updateFormation(audioData: EnhancedAudioData, deltaTime: number): void {
    // Determine target formation based on musical section
    const section = audioData.structure.currentSection.type;
    const energy = audioData.structure.energy.current;
    const tension = audioData.structure.tension.tension;
    
    let targetType: FormationType;
    
    switch (section) {
      case 'intro':
        targetType = FormationType.SCATTERED;
        break;
      case 'verse':
        targetType = FormationType.FLOWING;
        break;
      case 'chorus':
        targetType = FormationType.CLUSTERED;
        break;
      case 'bridge':
        targetType = FormationType.LAYERED;
        break;
      case 'build_up':
        targetType = FormationType.SPIRAL;
        break;
      case 'drop':
        targetType = FormationType.RADIAL;
        break;
      case 'breakdown':
        targetType = FormationType.SCATTERED;
        break;
      case 'outro':
        targetType = FormationType.FLOWING;
        break;
      default:
        targetType = FormationType.SCATTERED;
    }
    
    // Initiate transition if target changed
    if (this.currentFormation.type !== targetType) {
      if (!this.targetFormation || this.targetFormation.type !== targetType) {
        this.targetFormation = this.createFormation(targetType);
        this.targetFormation.energy = energy;
        this.targetFormation.cohesion = tension;
        this.formationTransitionStart = this.currentTime;
      }
    }
    
    // Apply transition
    if (this.targetFormation) {
      const transitionPhase = this.getFormationTransitionPhase();
      
      if (transitionPhase >= 1.0) {
        // Transition complete
        this.currentFormation = this.targetFormation;
        this.targetFormation = null;
      } else {
        // Blend formations
        this.currentFormation = this.blendFormations(
          this.currentFormation,
          this.targetFormation,
          transitionPhase
        );
      }
    }
    
    // Update formation properties based on audio
    this.currentFormation.energy = energy;
    this.currentFormation.cohesion = THREE.MathUtils.clamp(0.3 + tension * 0.7, 0, 1);
    this.currentFormation.rotation += deltaTime * energy * 0.5;
  }
  
  /**
   * Create a formation configuration
   */
  private createFormation(type: FormationType): FormationState {
    return {
      type,
      center: new THREE.Vector3(0, 0, 0),
      radius: 40,
      direction: new THREE.Vector3(1, 0, 0),
      rotation: 0,
      cohesion: 0.5,
      energy: 0.5,
    };
  }
  
  /**
   * Blend two formations
   */
  private blendFormations(
    from: FormationState,
    to: FormationState,
    t: number
  ): FormationState {
    const eased = this.easeInOutCubic(t);
    
    return {
      type: eased < 0.5 ? from.type : to.type,
      center: new THREE.Vector3().lerpVectors(from.center, to.center, eased),
      radius: THREE.MathUtils.lerp(from.radius, to.radius, eased),
      direction: new THREE.Vector3().lerpVectors(from.direction, to.direction, eased).normalize(),
      rotation: THREE.MathUtils.lerp(from.rotation, to.rotation, eased),
      cohesion: THREE.MathUtils.lerp(from.cohesion, to.cohesion, eased),
      energy: THREE.MathUtils.lerp(from.energy, to.energy, eased),
    };
  }
  
  /**
   * Get formation transition phase
   */
  private getFormationTransitionPhase(): number {
    if (!this.targetFormation) return 0;
    
    const elapsed = this.currentTime - this.formationTransitionStart;
    return Math.min(elapsed / this.formationTransitionTime, 1.0);
  }
  
  /**
   * Count particles with specific role
   */
  private countRole(role: ParticleRole): number {
    return Array.from(this.roleAssignments.values())
      .filter(assignment => assignment.role === role)
      .length;
  }
  
  /**
   * Get particle role
   */
  getParticleRole(particleIndex: number): ParticleRole {
    return this.roleAssignments.get(particleIndex)?.role || ParticleRole.AMBIENT;
  }
  
  /**
   * Get nearest influence signal for a particle
   */
  getNearestInfluence(particlePos: THREE.Vector3): InfluenceSignal | null {
    if (this.influenceSignals.length === 0) return null;
    
    let nearest: InfluenceSignal | null = null;
    let minDist = Infinity;
    
    for (const signal of this.influenceSignals) {
      const dist = particlePos.distanceTo(signal.position);
      
      if (dist < signal.radius && dist < minDist) {
        nearest = signal;
        minDist = dist;
      }
    }
    
    return nearest;
  }
  
  /**
   * Get formation target position for a particle
   */
  getFormationTarget(particleIndex: number, currentPos: THREE.Vector3): THREE.Vector3 {
    const formation = this.currentFormation;
    const target = new THREE.Vector3();
    
    switch (formation.type) {
      case FormationType.SCATTERED:
        // No target, let particles roam freely
        return currentPos.clone();
        
      case FormationType.CLUSTERED:
        // Pull toward center
        return formation.center.clone();
        
      case FormationType.ORBITING:
        // Circular orbit around center
        {
          const toCenter = currentPos.clone().sub(formation.center);
          const radiusXZ = new THREE.Vector2(toCenter.x, toCenter.z).length();
          const angle = Math.atan2(toCenter.z, toCenter.x) + formation.rotation;
          
          target.set(
            formation.center.x + Math.cos(angle) * formation.radius,
            formation.center.y,
            formation.center.z + Math.sin(angle) * formation.radius
          );
        }
        break;
        
      case FormationType.FLOWING:
        // Flow in direction
        target.copy(currentPos).add(formation.direction.clone().multiplyScalar(10));
        break;
        
      case FormationType.LAYERED:
        // Horizontal layers
        {
          const layerHeight = 20;
          const layer = Math.floor((currentPos.y + 50) / layerHeight);
          target.copy(currentPos);
          target.y = layer * layerHeight - 50 + layerHeight / 2;
        }
        break;
        
      case FormationType.RADIAL:
        // Radial expansion from center
        {
          const dir = currentPos.clone().sub(formation.center).normalize();
          target.copy(formation.center).add(dir.multiplyScalar(formation.radius));
        }
        break;
        
      case FormationType.GRID:
        // Snap to grid
        {
          const gridSize = 10;
          target.set(
            Math.round(currentPos.x / gridSize) * gridSize,
            Math.round(currentPos.y / gridSize) * gridSize,
            Math.round(currentPos.z / gridSize) * gridSize
          );
        }
        break;
        
      case FormationType.SPIRAL:
        // Spiral pattern
        {
          const toCenter = currentPos.clone().sub(formation.center);
          const dist = toCenter.length();
          const angle = Math.atan2(toCenter.z, toCenter.x) + formation.rotation + dist * 0.1;
          
          target.set(
            formation.center.x + Math.cos(angle) * dist,
            formation.center.y + dist * 0.2,
            formation.center.z + Math.sin(angle) * dist
          );
        }
        break;
        
      default:
        return currentPos.clone();
    }
    
    return target;
  }
  
  /**
   * Get empty state
   */
  private getEmptyState(): EnsembleState {
    return {
      roleAssignments: new Map(),
      influenceSignals: [],
      formation: this.currentFormation,
      leadCount: 0,
      supportCount: 0,
      ambientCount: 0,
      transitionPhase: 0,
      lastUpdate: 0,
    };
  }
  
  /**
   * Ease in-out cubic
   */
  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
  
  /**
   * Reset choreographer
   */
  reset(): void {
    this.roleAssignments.clear();
    this.influenceSignals = [];
    this.currentFormation = this.createFormation(FormationType.SCATTERED);
    this.targetFormation = null;
    this.currentTime = 0;
  }
}

