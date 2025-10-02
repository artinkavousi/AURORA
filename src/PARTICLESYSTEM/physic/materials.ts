/**
 * PARTICLESYSTEM/physic/materials.ts - Multi-material particle system
 * Single responsibility: Material definitions, properties, and physics models
 */

import { Fn, float, int, vec3, If, mat3 } from "three/tsl";

/**
 * Material types for particle simulation
 */
export enum MaterialType {
  FLUID = 0,      // Water-like behavior (incompressible, low viscosity)
  ELASTIC = 1,    // Rubber, jelly (elastic deformation)
  SAND = 2,       // Granular materials (friction, no cohesion)
  SNOW = 3,       // Plasticity with cohesion (deforms under stress)
  FOAM = 4,       // Low density, high compressibility
  VISCOUS = 5,    // Honey, lava (high viscosity)
  RIGID = 6,      // Solid objects (minimal deformation)
  PLASMA = 7,     // High energy, charged particles
}

/**
 * Material property configuration
 */
export interface MaterialProperties {
  type: MaterialType;
  name: string;
  
  // Physical properties
  density: number;              // Base density [0.1 - 10.0]
  stiffness: number;           // Pressure stiffness [0.1 - 100.0]
  viscosity: number;           // Dynamic viscosity [0.0 - 10.0]
  friction: number;            // Friction coefficient [0.0 - 1.0]
  cohesion: number;            // Particle attraction [0.0 - 1.0]
  elasticity: number;          // Elastic recovery [0.0 - 1.0]
  plasticity: number;          // Plastic deformation [0.0 - 1.0]
  compressibility: number;     // Volume change under pressure [0.0 - 1.0]
  surfaceTension: number;      // Surface tension coefficient [0.0 - 1.0]
  
  // Thermal properties
  heatCapacity: number;        // Specific heat capacity [0.1 - 10.0]
  thermalConductivity: number; // Heat diffusion rate [0.0 - 1.0]
  meltingPoint: number;        // Phase transition temperature (if applicable)
  
  // Visual properties
  baseColor: [number, number, number]; // RGB base color
  metalness: number;           // Metallic appearance [0.0 - 1.0]
  roughness: number;           // Surface roughness [0.0 - 1.0]
  emissive: number;            // Glow intensity [0.0 - 1.0]
}

/**
 * Predefined material presets
 */
export const MATERIAL_PRESETS: Record<string, MaterialProperties> = {
  // === FLUID MATERIALS ===
  WATER: {
    type: MaterialType.FLUID,
    name: "Water",
    density: 1.0,
    stiffness: 3.0,
    viscosity: 0.1,
    friction: 0.1,
    cohesion: 0.3,
    elasticity: 0.0,
    plasticity: 1.0,
    compressibility: 0.0,
    surfaceTension: 0.5,
    heatCapacity: 4.2,
    thermalConductivity: 0.6,
    meltingPoint: 0.0,
    baseColor: [0.2, 0.5, 1.0],
    metalness: 0.0,
    roughness: 0.1,
    emissive: 0.0,
  },
  
  OIL: {
    type: MaterialType.VISCOUS,
    name: "Oil",
    density: 0.8,
    stiffness: 2.0,
    viscosity: 2.5,
    friction: 0.3,
    cohesion: 0.4,
    elasticity: 0.0,
    plasticity: 1.0,
    compressibility: 0.1,
    surfaceTension: 0.3,
    heatCapacity: 2.0,
    thermalConductivity: 0.2,
    meltingPoint: -20.0,
    baseColor: [0.8, 0.7, 0.2],
    metalness: 0.3,
    roughness: 0.2,
    emissive: 0.0,
  },
  
  HONEY: {
    type: MaterialType.VISCOUS,
    name: "Honey",
    density: 1.4,
    stiffness: 4.0,
    viscosity: 8.0,
    friction: 0.5,
    cohesion: 0.8,
    elasticity: 0.0,
    plasticity: 1.0,
    compressibility: 0.05,
    surfaceTension: 0.7,
    heatCapacity: 2.5,
    thermalConductivity: 0.3,
    meltingPoint: 40.0,
    baseColor: [1.0, 0.7, 0.1],
    metalness: 0.0,
    roughness: 0.4,
    emissive: 0.0,
  },
  
  // === SOLID MATERIALS ===
  SAND: {
    type: MaterialType.SAND,
    name: "Sand",
    density: 1.6,
    stiffness: 5.0,
    viscosity: 0.5,
    friction: 0.8,
    cohesion: 0.05,
    elasticity: 0.05,
    plasticity: 0.95,
    compressibility: 0.2,
    surfaceTension: 0.0,
    heatCapacity: 0.8,
    thermalConductivity: 0.1,
    meltingPoint: 1700.0,
    baseColor: [0.9, 0.8, 0.5],
    metalness: 0.0,
    roughness: 0.9,
    emissive: 0.0,
  },
  
  SNOW: {
    type: MaterialType.SNOW,
    name: "Snow",
    density: 0.3,
    stiffness: 1.5,
    viscosity: 0.3,
    friction: 0.4,
    cohesion: 0.5,
    elasticity: 0.2,
    plasticity: 0.8,
    compressibility: 0.6,
    surfaceTension: 0.2,
    heatCapacity: 2.1,
    thermalConductivity: 0.2,
    meltingPoint: 0.0,
    baseColor: [0.95, 0.95, 1.0],
    metalness: 0.0,
    roughness: 0.8,
    emissive: 0.0,
  },
  
  // === ELASTIC MATERIALS ===
  RUBBER: {
    type: MaterialType.ELASTIC,
    name: "Rubber",
    density: 1.1,
    stiffness: 8.0,
    viscosity: 1.0,
    friction: 0.9,
    cohesion: 0.9,
    elasticity: 0.9,
    plasticity: 0.1,
    compressibility: 0.1,
    surfaceTension: 0.4,
    heatCapacity: 1.5,
    thermalConductivity: 0.15,
    meltingPoint: 180.0,
    baseColor: [0.2, 0.2, 0.2],
    metalness: 0.0,
    roughness: 0.7,
    emissive: 0.0,
  },
  
  JELLY: {
    type: MaterialType.ELASTIC,
    name: "Jelly",
    density: 1.0,
    stiffness: 2.0,
    viscosity: 0.8,
    friction: 0.2,
    cohesion: 0.7,
    elasticity: 0.7,
    plasticity: 0.3,
    compressibility: 0.2,
    surfaceTension: 0.5,
    heatCapacity: 3.0,
    thermalConductivity: 0.4,
    meltingPoint: 80.0,
    baseColor: [1.0, 0.3, 0.5],
    metalness: 0.0,
    roughness: 0.3,
    emissive: 0.0,
  },
  
  // === SPECIAL MATERIALS ===
  FOAM: {
    type: MaterialType.FOAM,
    name: "Foam",
    density: 0.1,
    stiffness: 0.5,
    viscosity: 0.2,
    friction: 0.3,
    cohesion: 0.2,
    elasticity: 0.4,
    plasticity: 0.6,
    compressibility: 0.9,
    surfaceTension: 0.1,
    heatCapacity: 1.0,
    thermalConductivity: 0.05,
    meltingPoint: 100.0,
    baseColor: [1.0, 1.0, 1.0],
    metalness: 0.0,
    roughness: 1.0,
    emissive: 0.0,
  },
  
  LAVA: {
    type: MaterialType.VISCOUS,
    name: "Lava",
    density: 2.5,
    stiffness: 6.0,
    viscosity: 5.0,
    friction: 0.4,
    cohesion: 0.6,
    elasticity: 0.0,
    plasticity: 1.0,
    compressibility: 0.05,
    surfaceTension: 0.8,
    heatCapacity: 1.2,
    thermalConductivity: 0.8,
    meltingPoint: 1200.0,
    baseColor: [1.0, 0.3, 0.1],
    metalness: 0.0,
    roughness: 0.5,
    emissive: 1.0,
  },
  
  PLASMA: {
    type: MaterialType.PLASMA,
    name: "Plasma",
    density: 0.05,
    stiffness: 0.5,
    viscosity: 0.05,
    friction: 0.0,
    cohesion: 0.0,
    elasticity: 0.0,
    plasticity: 1.0,
    compressibility: 0.95,
    surfaceTension: 0.0,
    heatCapacity: 0.5,
    thermalConductivity: 1.0,
    meltingPoint: 10000.0,
    baseColor: [0.5, 0.7, 1.0],
    metalness: 0.0,
    roughness: 0.0,
    emissive: 1.5,
  },
  
  METAL: {
    type: MaterialType.RIGID,
    name: "Metal",
    density: 7.8,
    stiffness: 50.0,
    viscosity: 10.0,
    friction: 0.6,
    cohesion: 1.0,
    elasticity: 0.3,
    plasticity: 0.7,
    compressibility: 0.01,
    surfaceTension: 0.0,
    heatCapacity: 0.5,
    thermalConductivity: 0.9,
    meltingPoint: 1500.0,
    baseColor: [0.7, 0.7, 0.7],
    metalness: 1.0,
    roughness: 0.3,
    emissive: 0.0,
  },
};

/**
 * Get material properties from material type
 * TSL function for GPU-side material property lookup
 */
export const getMaterialStiffness = /*#__PURE__*/ Fn(([materialType]) => {
  const result = float(3.0).toVar();
  
  // Use conditional logic to return material-specific stiffness
  If(materialType.equal(int(MaterialType.FLUID)), () => {
    result.assign(3.0);
  }).ElseIf(materialType.equal(int(MaterialType.ELASTIC)), () => {
    result.assign(8.0);
  }).ElseIf(materialType.equal(int(MaterialType.SAND)), () => {
    result.assign(5.0);
  }).ElseIf(materialType.equal(int(MaterialType.SNOW)), () => {
    result.assign(1.5);
  }).ElseIf(materialType.equal(int(MaterialType.FOAM)), () => {
    result.assign(0.5);
  }).ElseIf(materialType.equal(int(MaterialType.VISCOUS)), () => {
    result.assign(4.0);
  }).ElseIf(materialType.equal(int(MaterialType.RIGID)), () => {
    result.assign(50.0);
  }).ElseIf(materialType.equal(int(MaterialType.PLASMA)), () => {
    result.assign(0.5);
  });
  
  return result;
}).setLayout({
  name: 'getMaterialStiffness',
  type: 'float',
  inputs: [{ name: 'materialType', type: 'int' }],
});

/**
 * Get material viscosity from material type
 */
export const getMaterialViscosity = /*#__PURE__*/ Fn(([materialType]) => {
  const result = float(0.1).toVar();
  
  If(materialType.equal(int(MaterialType.FLUID)), () => {
    result.assign(0.1);
  }).ElseIf(materialType.equal(int(MaterialType.ELASTIC)), () => {
    result.assign(1.0);
  }).ElseIf(materialType.equal(int(MaterialType.SAND)), () => {
    result.assign(0.5);
  }).ElseIf(materialType.equal(int(MaterialType.SNOW)), () => {
    result.assign(0.3);
  }).ElseIf(materialType.equal(int(MaterialType.FOAM)), () => {
    result.assign(0.2);
  }).ElseIf(materialType.equal(int(MaterialType.VISCOUS)), () => {
    result.assign(5.0);
  }).ElseIf(materialType.equal(int(MaterialType.RIGID)), () => {
    result.assign(10.0);
  }).ElseIf(materialType.equal(int(MaterialType.PLASMA)), () => {
    result.assign(0.05);
  });
  
  return result;
}).setLayout({
  name: 'getMaterialViscosity',
  type: 'float',
  inputs: [{ name: 'materialType', type: 'int' }],
});

/**
 * Calculate material-specific stress tensor
 * Implements constitutive models for different materials
 */
export const calculateMaterialStress = /*#__PURE__*/ Fn(([materialType, pressure, strain, density, restDensity]) => {
  const stress = mat3(pressure.negate(), 0, 0, 0, pressure.negate(), 0, 0, 0, pressure.negate()).toVar();
  const viscosity = getMaterialViscosity(materialType);
  
  // FLUID: Pure pressure, low viscosity
  If(materialType.equal(int(MaterialType.FLUID)), () => {
    stress.addAssign(strain.mul(viscosity.mul(0.1)));
  })
  // ELASTIC: Strong elastic response
  .ElseIf(materialType.equal(int(MaterialType.ELASTIC)), () => {
    const elasticStress = strain.mul(viscosity.mul(2.0));
    stress.addAssign(elasticStress);
  })
  // SAND: Friction-dominated, no tension
  .ElseIf(materialType.equal(int(MaterialType.SAND)), () => {
    const frictionStress = strain.mul(viscosity.mul(0.5));
    stress.addAssign(frictionStress);
    // No negative pressure (no tension)
    If(pressure.lessThan(0), () => {
      stress.assign(mat3(0));
    });
  })
  // SNOW: Plasticity model
  .ElseIf(materialType.equal(int(MaterialType.SNOW)), () => {
    const plasticStress = strain.mul(viscosity.mul(0.3));
    stress.addAssign(plasticStress);
  })
  // FOAM: Highly compressible
  .ElseIf(materialType.equal(int(MaterialType.FOAM)), () => {
    const compressiveStress = strain.mul(viscosity.mul(0.2));
    stress.addAssign(compressiveStress);
    // Foam is weak under compression
    stress.mulAssign(0.3);
  })
  // VISCOUS: High viscosity dominates
  .ElseIf(materialType.equal(int(MaterialType.VISCOUS)), () => {
    const viscousStress = strain.mul(viscosity.mul(5.0));
    stress.addAssign(viscousStress);
  })
  // RIGID: Minimal deformation
  .ElseIf(materialType.equal(int(MaterialType.RIGID)), () => {
    const rigidStress = strain.mul(viscosity.mul(10.0));
    stress.addAssign(rigidStress);
  })
  // PLASMA: Minimal viscosity, pressure-dominated
  .ElseIf(materialType.equal(int(MaterialType.PLASMA)), () => {
    stress.addAssign(strain.mul(viscosity.mul(0.05)));
  });
  
  return stress;
}).setLayout({
  name: 'calculateMaterialStress',
  type: 'mat3',
  inputs: [
    { name: 'materialType', type: 'int' },
    { name: 'pressure', type: 'float' },
    { name: 'strain', type: 'mat3' },
    { name: 'density', type: 'float' },
    { name: 'restDensity', type: 'float' },
  ],
});

/**
 * Get material base color
 */
export const getMaterialColor = /*#__PURE__*/ Fn(([materialType]) => {
  const color = vec3(0.5, 0.5, 1.0).toVar();
  
  If(materialType.equal(int(MaterialType.FLUID)), () => {
    color.assign(vec3(0.2, 0.5, 1.0));
  }).ElseIf(materialType.equal(int(MaterialType.ELASTIC)), () => {
    color.assign(vec3(1.0, 0.3, 0.5));
  }).ElseIf(materialType.equal(int(MaterialType.SAND)), () => {
    color.assign(vec3(0.9, 0.8, 0.5));
  }).ElseIf(materialType.equal(int(MaterialType.SNOW)), () => {
    color.assign(vec3(0.95, 0.95, 1.0));
  }).ElseIf(materialType.equal(int(MaterialType.FOAM)), () => {
    color.assign(vec3(1.0, 1.0, 1.0));
  }).ElseIf(materialType.equal(int(MaterialType.VISCOUS)), () => {
    color.assign(vec3(1.0, 0.7, 0.1));
  }).ElseIf(materialType.equal(int(MaterialType.RIGID)), () => {
    color.assign(vec3(0.7, 0.7, 0.7));
  }).ElseIf(materialType.equal(int(MaterialType.PLASMA)), () => {
    color.assign(vec3(0.5, 0.7, 1.0));
  });
  
  return color;
}).setLayout({
  name: 'getMaterialColor',
  type: 'vec3',
  inputs: [{ name: 'materialType', type: 'int' }],
});

/**
 * Material manager helper class
 */
export class MaterialManager {
  private materials: Map<string, MaterialProperties> = new Map();
  
  constructor() {
    // Load all presets
    Object.entries(MATERIAL_PRESETS).forEach(([key, props]) => {
      this.materials.set(key, props);
    });
  }
  
  /**
   * Get material by name
   */
  public getMaterial(name: string): MaterialProperties | undefined {
    return this.materials.get(name);
  }
  
  /**
   * Get all material names
   */
  public getMaterialNames(): string[] {
    return Array.from(this.materials.keys());
  }
  
  /**
   * Add custom material
   */
  public addMaterial(name: string, props: MaterialProperties): void {
    this.materials.set(name, props);
  }
  
  /**
   * Get material properties array for uniform upload
   */
  public getMaterialPropertiesArray(): Float32Array {
    const count = Object.keys(MaterialType).length / 2; // enum size
    const propsPerMaterial = 8; // stiffness, viscosity, etc.
    const array = new Float32Array(count * propsPerMaterial);
    
    // Fill with preset values
    Object.values(MATERIAL_PRESETS).forEach((props) => {
      const offset = props.type * propsPerMaterial;
      array[offset + 0] = props.density;
      array[offset + 1] = props.stiffness;
      array[offset + 2] = props.viscosity;
      array[offset + 3] = props.friction;
      array[offset + 4] = props.cohesion;
      array[offset + 5] = props.elasticity;
      array[offset + 6] = props.compressibility;
      array[offset + 7] = props.surfaceTension;
    });
    
    return array;
  }
}

