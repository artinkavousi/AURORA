/**
 * PARTICLESYSTEM/physic/forcefields.ts - Force field system
 * Single responsibility: Dynamic force fields for particle interaction
 */

import * as THREE from "three/webgpu";
import { Fn, vec3, float, int, If, Loop, uniform, length, normalize, cross, dot, sin, cos, time, instanceIndex } from "three/tsl";
import { triNoise3Dvec } from "./noise";

/**
 * Force field types
 */
export enum ForceFieldType {
  ATTRACTOR = 0,    // Point-based gravitational attraction
  REPELLER = 1,     // Point-based repulsion
  VORTEX = 2,       // Rotational force around axis
  TURBULENCE = 3,   // Noise-based chaotic forces
  DIRECTIONAL = 4,  // Constant direction (wind)
  VORTEX_TUBE = 5,  // Tube-shaped vortex (tornado)
  SPHERICAL = 6,    // Radial force from sphere
  CURL_NOISE = 7,   // Curl noise (divergence-free)
}

/**
 * Force field falloff modes
 */
export enum ForceFalloff {
  CONSTANT = 0,     // No falloff
  LINEAR = 1,       // Linear decrease with distance
  QUADRATIC = 2,    // Inverse square law
  SMOOTH = 3,       // Smooth hermite falloff
}

/**
 * Force field configuration
 */
export interface ForceFieldConfig {
  type: ForceFieldType;
  enabled: boolean;
  
  // Transform
  position: THREE.Vector3;
  direction: THREE.Vector3;
  rotation: THREE.Euler;
  
  // Parameters
  strength: number;         // Force magnitude [0.0 - 100.0]
  radius: number;           // Influence radius [0.1 - 100.0]
  falloff: ForceFalloff;    // Distance falloff type
  
  // Type-specific parameters
  vortexAxis: THREE.Vector3;     // For vortex fields
  turbulenceScale: number;       // For turbulence fields [0.1 - 10.0]
  turbulenceOctaves: number;     // Turbulence complexity [1 - 4]
  noiseSpeed: number;            // Animation speed [0.0 - 2.0]
  
  // Animation
  animated: boolean;
  animationSpeed: number;
  animationAmplitude: number;
}

/**
 * Default force field configuration
 */
export const DEFAULT_FORCE_FIELD: ForceFieldConfig = {
  type: ForceFieldType.ATTRACTOR,
  enabled: true,
  position: new THREE.Vector3(0, 0, 0),
  direction: new THREE.Vector3(0, 1, 0),
  rotation: new THREE.Euler(0, 0, 0),
  strength: 10.0,
  radius: 20.0,
  falloff: ForceFalloff.QUADRATIC,
  vortexAxis: new THREE.Vector3(0, 1, 0),
  turbulenceScale: 1.0,
  turbulenceOctaves: 2,
  noiseSpeed: 1.0,
  animated: false,
  animationSpeed: 1.0,
  animationAmplitude: 0.0,
};

/**
 * Force field presets
 */
export const FORCE_FIELD_PRESETS: Record<string, Partial<ForceFieldConfig>> = {
  GRAVITY_WELL: {
    type: ForceFieldType.ATTRACTOR,
    strength: 50.0,
    radius: 30.0,
    falloff: ForceFalloff.QUADRATIC,
  },
  
  BLACK_HOLE: {
    type: ForceFieldType.ATTRACTOR,
    strength: 200.0,
    radius: 15.0,
    falloff: ForceFalloff.QUADRATIC,
  },
  
  EXPLOSION: {
    type: ForceFieldType.REPELLER,
    strength: 100.0,
    radius: 25.0,
    falloff: ForceFalloff.LINEAR,
    animated: true,
    animationSpeed: 2.0,
  },
  
  TORNADO: {
    type: ForceFieldType.VORTEX_TUBE,
    strength: 30.0,
    radius: 10.0,
    vortexAxis: new THREE.Vector3(0, 1, 0),
    falloff: ForceFalloff.SMOOTH,
  },
  
  WIND: {
    type: ForceFieldType.DIRECTIONAL,
    strength: 5.0,
    direction: new THREE.Vector3(1, 0, 0),
    radius: 100.0,
    falloff: ForceFalloff.CONSTANT,
  },
  
  TURBULENCE: {
    type: ForceFieldType.TURBULENCE,
    strength: 15.0,
    radius: 30.0,
    turbulenceScale: 2.0,
    turbulenceOctaves: 3,
    noiseSpeed: 1.0,
  },
  
  GALAXY_SPIRAL: {
    type: ForceFieldType.VORTEX,
    strength: 20.0,
    radius: 40.0,
    vortexAxis: new THREE.Vector3(0, 0, 1),
    falloff: ForceFalloff.SMOOTH,
  },
};

/**
 * Calculate falloff multiplier based on distance and falloff type
 * TSL function for GPU-side falloff calculation
 */
export const calculateFalloff = /*#__PURE__*/ Fn(([dist, radius, falloffType]) => {
  const result = float(1.0).toVar();
  const t = dist.div(radius).clamp(0, 1).toVar();
  
  // CONSTANT: No falloff
  If(falloffType.equal(int(ForceFalloff.CONSTANT)), () => {
    result.assign(1.0);
  })
  // LINEAR: Linear decrease
  .ElseIf(falloffType.equal(int(ForceFalloff.LINEAR)), () => {
    result.assign(t.oneMinus());
  })
  // QUADRATIC: Inverse square
  .ElseIf(falloffType.equal(int(ForceFalloff.QUADRATIC)), () => {
    const invDist = t.oneMinus();
    result.assign(invDist.mul(invDist));
  })
  // SMOOTH: Smooth hermite
  .ElseIf(falloffType.equal(int(ForceFalloff.SMOOTH)), () => {
    const smoothT = t.mul(t).mul(float(3).sub(t.mul(2)));
    result.assign(smoothT.oneMinus());
  });
  
  return result;
}).setLayout({
  name: 'calculateFalloff',
  type: 'float',
  inputs: [
    { name: 'dist', type: 'float' },
    { name: 'radius', type: 'float' },
    { name: 'falloffType', type: 'int' },
  ],
});

/**
 * Calculate force from a single force field
 * TSL function for GPU-side force calculation
 */
export const calculateForceFieldForce = /*#__PURE__*/ Fn((
  [particlePos, fieldType, fieldPos, fieldDir, fieldAxis, strength, radius, falloffType, turbScale, noiseSpeed]
) => {
  const force = vec3(0).toVar();
  const toField = fieldPos.sub(particlePos).toVar();
  const dist = length(toField).toVar();
  
  // Skip if outside radius
  If(dist.greaterThan(radius), () => {
    return vec3(0);
  });
  
  const falloff = calculateFalloff(dist, radius, falloffType).toVar();
  const dirToField = normalize(toField).toVar();
  
  // === ATTRACTOR ===
  If(fieldType.equal(int(ForceFieldType.ATTRACTOR)), () => {
    force.assign(dirToField.mul(strength).mul(falloff));
  })
  
  // === REPELLER ===
  .ElseIf(fieldType.equal(int(ForceFieldType.REPELLER)), () => {
    force.assign(dirToField.negate().mul(strength).mul(falloff));
  })
  
  // === VORTEX ===
  .ElseIf(fieldType.equal(int(ForceFieldType.VORTEX)), () => {
    const axis = normalize(fieldAxis);
    const radial = toField.sub(axis.mul(dot(toField, axis))).toVar();
    const radialDist = length(radial);
    
    If(radialDist.greaterThan(0.001), () => {
      const radialDir = normalize(radial);
      const tangent = cross(axis, radialDir);
      
      // Tangential force (rotation)
      const tangentForce = tangent.mul(strength).mul(falloff);
      
      // Inward spiral
      const inwardForce = radialDir.negate().mul(strength.mul(0.3)).mul(falloff);
      
      // Upward lift
      const liftForce = axis.mul(strength.mul(0.2)).mul(falloff);
      
      force.assign(tangentForce.add(inwardForce).add(liftForce));
    });
  })
  
  // === TURBULENCE ===
  .ElseIf(fieldType.equal(int(ForceFieldType.TURBULENCE)), () => {
    const noisePos = particlePos.mul(turbScale);
    const turbulence = triNoise3Dvec(noisePos, noiseSpeed, time).sub(0.5).mul(2.0);
    force.assign(turbulence.mul(strength).mul(falloff));
  })
  
  // === DIRECTIONAL (Wind) ===
  .ElseIf(fieldType.equal(int(ForceFieldType.DIRECTIONAL)), () => {
    const windDir = normalize(fieldDir);
    force.assign(windDir.mul(strength).mul(falloff));
  })
  
  // === VORTEX TUBE (Tornado) ===
  .ElseIf(fieldType.equal(int(ForceFieldType.VORTEX_TUBE)), () => {
    const axis = normalize(fieldAxis);
    const axisProjection = dot(toField, axis);
    const radial = toField.sub(axis.mul(axisProjection)).toVar();
    const radialDist = length(radial);
    
    If(radialDist.greaterThan(0.001), () => {
      const radialDir = normalize(radial);
      const tangent = cross(axis, radialDir);
      
      // Strong tangential rotation
      const tangentForce = tangent.mul(strength.mul(2.0)).mul(falloff);
      
      // Strong inward suction
      const inwardForce = radialDir.negate().mul(strength.mul(0.8)).mul(falloff);
      
      // Upward lift (stronger than regular vortex)
      const heightFactor = float(1).sub(axisProjection.abs().div(radius)).max(0);
      const liftForce = axis.mul(strength.mul(0.5)).mul(falloff).mul(heightFactor);
      
      force.assign(tangentForce.add(inwardForce).add(liftForce));
    });
  })
  
  // === SPHERICAL (Radial push/pull) ===
  .ElseIf(fieldType.equal(int(ForceFieldType.SPHERICAL)), () => {
    // Pulsating radial force
    const pulseFactor = sin(time.mul(2.0)).mul(0.5).add(0.5);
    force.assign(dirToField.mul(strength).mul(falloff).mul(pulseFactor));
  })
  
  // === CURL NOISE (Divergence-free) ===
  .ElseIf(fieldType.equal(int(ForceFieldType.CURL_NOISE)), () => {
    const eps = float(0.1);
    const noisePos = particlePos.mul(turbScale);
    
    // Calculate curl of noise field (divergence-free)
    const n1 = triNoise3Dvec(noisePos.add(vec3(eps, 0, 0)), noiseSpeed, time);
    const n2 = triNoise3Dvec(noisePos.sub(vec3(eps, 0, 0)), noiseSpeed, time);
    const dx = n1.sub(n2).div(eps.mul(2.0));
    
    const n3 = triNoise3Dvec(noisePos.add(vec3(0, eps, 0)), noiseSpeed, time);
    const n4 = triNoise3Dvec(noisePos.sub(vec3(0, eps, 0)), noiseSpeed, time);
    const dy = n3.sub(n4).div(eps.mul(2.0));
    
    const n5 = triNoise3Dvec(noisePos.add(vec3(0, 0, eps)), noiseSpeed, time);
    const n6 = triNoise3Dvec(noisePos.sub(vec3(0, 0, eps)), noiseSpeed, time);
    const dz = n5.sub(n6).div(eps.mul(2.0));
    
    // Curl = ∇ × F
    const curl = vec3(
      dz.y.sub(dy.z),
      dx.z.sub(dz.x),
      dy.x.sub(dx.y)
    );
    
    force.assign(curl.mul(strength).mul(falloff));
  });
  
  return force;
}).setLayout({
  name: 'calculateForceFieldForce',
  type: 'vec3',
  inputs: [
    { name: 'particlePos', type: 'vec3' },
    { name: 'fieldType', type: 'int' },
    { name: 'fieldPos', type: 'vec3' },
    { name: 'fieldDir', type: 'vec3' },
    { name: 'fieldAxis', type: 'vec3' },
    { name: 'strength', type: 'float' },
    { name: 'radius', type: 'float' },
    { name: 'falloffType', type: 'int' },
    { name: 'turbScale', type: 'float' },
    { name: 'noiseSpeed', type: 'float' },
  ],
});

/**
 * Force field manager
 */
export class ForceFieldManager {
  private fields: ForceFieldConfig[] = [];
  private maxFields: number;
  
  // Uniforms for GPU upload
  public fieldCountUniform: any;
  public fieldTypesUniform: any;
  public fieldPositionsUniform: any;
  public fieldDirectionsUniform: any;
  public fieldAxesUniform: any;
  public fieldStrengthsUniform: any;
  public fieldRadiiUniform: any;
  public fieldFalloffsUniform: any;
  public fieldTurbScalesUniform: any;
  public fieldNoiseSpeedsUniform: any;
  
  constructor(maxFields: number = 8) {
    this.maxFields = maxFields;
    this.initUniforms();
  }
  
  /**
   * Initialize GPU uniforms
   */
  private initUniforms(): void {
    this.fieldCountUniform = uniform(0, "int");
    this.fieldTypesUniform = uniform(new Int32Array(this.maxFields));
    this.fieldPositionsUniform = uniform(new Float32Array(this.maxFields * 3));
    this.fieldDirectionsUniform = uniform(new Float32Array(this.maxFields * 3));
    this.fieldAxesUniform = uniform(new Float32Array(this.maxFields * 3));
    this.fieldStrengthsUniform = uniform(new Float32Array(this.maxFields));
    this.fieldRadiiUniform = uniform(new Float32Array(this.maxFields));
    this.fieldFalloffsUniform = uniform(new Int32Array(this.maxFields));
    this.fieldTurbScalesUniform = uniform(new Float32Array(this.maxFields));
    this.fieldNoiseSpeedsUniform = uniform(new Float32Array(this.maxFields));
  }
  
  /**
   * Add force field
   */
  public addField(config: Partial<ForceFieldConfig> = {}): number {
    if (this.fields.length >= this.maxFields) {
      console.warn(`Maximum force fields (${this.maxFields}) reached`);
      return -1;
    }
    
    const field: ForceFieldConfig = { ...DEFAULT_FORCE_FIELD, ...config };
    this.fields.push(field);
    this.updateUniforms();
    return this.fields.length - 1;
  }
  
  /**
   * Remove force field
   */
  public removeField(index: number): void {
    if (index >= 0 && index < this.fields.length) {
      this.fields.splice(index, 1);
      this.updateUniforms();
    }
  }
  
  /**
   * Get force field
   */
  public getField(index: number): ForceFieldConfig | undefined {
    return this.fields[index];
  }
  
  /**
   * Update force field
   */
  public updateField(index: number, updates: Partial<ForceFieldConfig>): void {
    if (index >= 0 && index < this.fields.length) {
      Object.assign(this.fields[index], updates);
      this.updateUniforms();
    }
  }
  
  /**
   * Clear all fields
   */
  public clearFields(): void {
    this.fields = [];
    this.updateUniforms();
  }
  
  /**
   * Add preset field
   */
  public addPreset(presetName: keyof typeof FORCE_FIELD_PRESETS): number {
    const preset = FORCE_FIELD_PRESETS[presetName];
    return this.addField(preset);
  }
  
  /**
   * Update GPU uniforms with current field data
   */
  public updateUniforms(): void {
    const activeFields = this.fields.filter(f => f.enabled);
    this.fieldCountUniform.value = activeFields.length;
    
    const types = new Int32Array(this.maxFields);
    const positions = new Float32Array(this.maxFields * 3);
    const directions = new Float32Array(this.maxFields * 3);
    const axes = new Float32Array(this.maxFields * 3);
    const strengths = new Float32Array(this.maxFields);
    const radii = new Float32Array(this.maxFields);
    const falloffs = new Int32Array(this.maxFields);
    const turbScales = new Float32Array(this.maxFields);
    const noiseSpeeds = new Float32Array(this.maxFields);
    
    activeFields.forEach((field, i) => {
      types[i] = field.type;
      positions[i * 3 + 0] = field.position.x;
      positions[i * 3 + 1] = field.position.y;
      positions[i * 3 + 2] = field.position.z;
      directions[i * 3 + 0] = field.direction.x;
      directions[i * 3 + 1] = field.direction.y;
      directions[i * 3 + 2] = field.direction.z;
      axes[i * 3 + 0] = field.vortexAxis.x;
      axes[i * 3 + 1] = field.vortexAxis.y;
      axes[i * 3 + 2] = field.vortexAxis.z;
      strengths[i] = field.strength;
      radii[i] = field.radius;
      falloffs[i] = field.falloff;
      turbScales[i] = field.turbulenceScale;
      noiseSpeeds[i] = field.noiseSpeed;
    });
    
    this.fieldTypesUniform.value = types;
    this.fieldPositionsUniform.value = positions;
    this.fieldDirectionsUniform.value = directions;
    this.fieldAxesUniform.value = axes;
    this.fieldStrengthsUniform.value = strengths;
    this.fieldRadiiUniform.value = radii;
    this.fieldFalloffsUniform.value = falloffs;
    this.fieldTurbScalesUniform.value = turbScales;
    this.fieldNoiseSpeedsUniform.value = noiseSpeeds;
  }
  
  /**
   * Get all fields
   */
  public getFields(): ForceFieldConfig[] {
    return [...this.fields];
  }
  
  /**
   * Get field count
   */
  public getFieldCount(): number {
    return this.fields.filter(f => f.enabled).length;
  }
}

