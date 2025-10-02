/**
 * PARTICLESYSTEM/PHYSIC/mls-mpm.ts - MLS-MPM physics simulator (clean, no UI/rendering deps)
 * Single responsibility: MLS-MPM particle physics simulation
 */

import * as THREE from "three/webgpu";
import {
  array,
  Fn,
  If,
  instancedArray,
  instanceIndex,
  Return,
  uniform,
  int,
  float,
  Loop,
  vec3,
  vec4,
  atomicAdd,
  uint,
  max,
  pow,
  mat3,
  clamp,
  time,
  cross,
  mix,
  ivec3,
} from "three/tsl";
import { triNoise3Dvec } from "../physic/noise";
import { hsvtorgb } from "../physic/hsv";
import { StructuredArray } from "../physic/structuredarray";
import { calculateForceFieldForce } from "../physic/forcefields";
import { MaterialType, getMaterialColor, calculateMaterialStress } from "../physic/materials";
import type { SimulationConfig } from '../../config';
import type { ForceFieldManager } from "../physic/forcefields";
import type { ParticleBoundaries } from "../physic/boundaries";

export interface MlsMpmConfig {
  maxParticles: number;
  gridSize?: THREE.Vector3;
  fixedPointMultiplier?: number;
}

export interface SimulationParams {
  numParticles: number;
  dt: number;
  noise: number;
  stiffness: number;
  restDensity: number;
  dynamicViscosity: number;
  gravityType: number;
  gravity: THREE.Vector3;
  mouseRayOrigin: THREE.Vector3;
  mouseRayDirection: THREE.Vector3;
  mouseForce: THREE.Vector3;
}

/**
 * MlsMpmSimulator - Material Point Method physics core
 * Clean implementation with no camera/bloom/environment dependencies
 */
export class MlsMpmSimulator {
  public readonly particleBuffer: StructuredArray;
  public readonly gridSize: THREE.Vector3;
  private readonly renderer: THREE.WebGPURenderer;
  private readonly cellBuffer: StructuredArray;
  private readonly cellBufferF: any;
  private readonly uniforms: Record<string, any> = {};
  private readonly kernels: Record<string, any> = {};
  private readonly fixedPointMultiplier: number;
  private readonly cellCount: number;
  
  private mousePos: THREE.Vector3 = new THREE.Vector3();
  private mousePosArray: THREE.Vector3[] = [];
  public numParticles: number = 0;
  private boundaries: ParticleBoundaries | null = null;

  constructor(renderer: THREE.WebGPURenderer, config: MlsMpmConfig) {
    this.renderer = renderer;
    this.gridSize = config.gridSize || new THREE.Vector3(64, 64, 64);
    this.fixedPointMultiplier = config.fixedPointMultiplier || 1e7;
    this.cellCount = this.gridSize.x * this.gridSize.y * this.gridSize.z;

    // Define particle structure with new fields for materials and lifecycle
    const particleStruct = {
      position: { type: 'vec3' as const },
      density: { type: 'float' as const },
      velocity: { type: 'vec3' as const },
      mass: { type: 'float' as const },
      C: { type: 'mat3' as const },
      direction: { type: 'vec3' as const },
      color: { type: 'vec3' as const },
      materialType: { type: 'int' as const },
      age: { type: 'float' as const },
      lifetime: { type: 'float' as const },
    };
    this.particleBuffer = new StructuredArray(particleStruct, config.maxParticles, "particleData");

    // Initialize particle positions in sphere
    const vec = new THREE.Vector3();
    for (let i = 0; i < config.maxParticles; i++) {
      let dist = 2;
      while (dist > 1) {
        vec.set(Math.random(), Math.random(), Math.random())
          .multiplyScalar(2.0)
          .subScalar(1.0);
        dist = vec.length();
      }
      vec.multiplyScalar(0.8).addScalar(1.0).divideScalar(2.0).multiply(this.gridSize);
      const mass = 1.0 - Math.random() * 0.002;
      this.particleBuffer.set(i, "position", vec);
      this.particleBuffer.set(i, "mass", mass);
      this.particleBuffer.set(i, "materialType", MaterialType.FLUID);
      this.particleBuffer.set(i, "age", 0);
      this.particleBuffer.set(i, "lifetime", 999999); // Infinite lifetime by default
    }

    // Define grid cell structure
    const cellStruct = {
      x: { type: 'int' as const, atomic: true },
      y: { type: 'int' as const, atomic: true },
      z: { type: 'int' as const, atomic: true },
      mass: { type: 'int' as const, atomic: true },
    };
    this.cellBuffer = new StructuredArray(cellStruct, this.cellCount, "cellData");
    this.cellBufferF = instancedArray(this.cellCount, 'vec4').label('cellDataF');

    this.initUniforms();
  }

  private initUniforms(): void {
    this.uniforms.gravityType = uniform(0, "uint");
    this.uniforms.gravity = uniform(new THREE.Vector3());
    this.uniforms.stiffness = uniform(0);
    this.uniforms.restDensity = uniform(0);
    this.uniforms.dynamicViscosity = uniform(0);
    this.uniforms.noise = uniform(0);
    this.uniforms.gridSize = uniform(this.gridSize, "ivec3");
    this.uniforms.dt = uniform(0.1);
    this.uniforms.numParticles = uniform(0, "uint");
    this.uniforms.mouseRayDirection = uniform(new THREE.Vector3());
    this.uniforms.mouseRayOrigin = uniform(new THREE.Vector3());
    this.uniforms.mouseForce = uniform(new THREE.Vector3());
    
    // Force field uniforms
    this.uniforms.fieldCount = uniform(0, "int");
    this.uniforms.fieldTypes = uniform(new Int32Array(8));
    this.uniforms.fieldPositions = uniform(new Float32Array(8 * 3));
    this.uniforms.fieldDirections = uniform(new Float32Array(8 * 3));
    this.uniforms.fieldAxes = uniform(new Float32Array(8 * 3));
    this.uniforms.fieldStrengths = uniform(new Float32Array(8));
    this.uniforms.fieldRadii = uniform(new Float32Array(8));
    this.uniforms.fieldFalloffs = uniform(new Int32Array(8));
    this.uniforms.fieldTurbScales = uniform(new Float32Array(8));
    this.uniforms.fieldNoiseSpeeds = uniform(new Float32Array(8));
    
    // Color mode uniform
    this.uniforms.colorMode = uniform(0, "int");
    
    // Boundary uniforms (default: disabled, using viewport mode)
    this.uniforms.boundaryEnabled = uniform(0, "int");  // Default disabled
    this.uniforms.boundaryShape = uniform(0, "int"); // 0=box, 1=sphere, 2=cylinder
    this.uniforms.boundaryWallMin = uniform(new THREE.Vector3(3, 3, 3));
    this.uniforms.boundaryWallMax = uniform(this.gridSize.clone().subScalar(3));
    this.uniforms.boundaryWallStiffness = uniform(0.3);
    this.uniforms.boundaryCenter = uniform(this.gridSize.clone().multiplyScalar(0.5));
    this.uniforms.boundaryRadius = uniform(Math.min(this.gridSize.x, this.gridSize.y, this.gridSize.z) / 2 - 3);
  }

  /**
   * Initialize compute kernels
   */
  public async init(): Promise<void> {
    const encodeFixedPoint = (f32: any) => int(f32.mul(this.fixedPointMultiplier));
    const decodeFixedPoint = (i32: any) => float(i32).div(this.fixedPointMultiplier);

    const getCellPtr = (ipos: any) => {
      const gridSize = this.uniforms.gridSize;
      return int(ipos.x).mul(gridSize.y).mul(gridSize.z).add(int(ipos.y).mul(gridSize.z)).add(int(ipos.z)).toConst();
    };
    const getCell = (ipos: any) => this.cellBuffer.element(getCellPtr(ipos));

    // Kernel: Clear grid
    this.kernels.clearGrid = Fn(() => {
      this.cellBuffer.setAtomic("x", false);
      this.cellBuffer.setAtomic("y", false);
      this.cellBuffer.setAtomic("z", false);
      this.cellBuffer.setAtomic("mass", false);

      If(instanceIndex.greaterThanEqual(uint(this.cellCount)), () => {
        Return();
      });

      this.cellBuffer.element(instanceIndex).get('x').assign(0);
      this.cellBuffer.element(instanceIndex).get('y').assign(0);
      this.cellBuffer.element(instanceIndex).get('z').assign(0);
      this.cellBuffer.element(instanceIndex).get('mass').assign(0);
      this.cellBufferF.element(instanceIndex).assign(0);
    })().compute(this.cellCount);

    // Kernel: Particle to Grid (pass 1 - momentum transfer)
    this.kernels.p2g1 = Fn(() => {
      this.cellBuffer.setAtomic("x", true);
      this.cellBuffer.setAtomic("y", true);
      this.cellBuffer.setAtomic("z", true);
      this.cellBuffer.setAtomic("mass", true);

      If(instanceIndex.greaterThanEqual(uint(this.uniforms.numParticles)), () => {
        Return();
      });

      const particlePosition = this.particleBuffer.element(instanceIndex).get('position').xyz.toConst("particlePosition");
      const particleVelocity = this.particleBuffer.element(instanceIndex).get('velocity').xyz.toConst("particleVelocity");

      const cellIndex = ivec3(particlePosition).sub(1).toConst("cellIndex");
      const cellDiff = particlePosition.fract().sub(0.5).toConst("cellDiff");
      const w0 = float(0.5).mul(float(0.5).sub(cellDiff)).mul(float(0.5).sub(cellDiff));
      const w1 = float(0.75).sub(cellDiff.mul(cellDiff));
      const w2 = float(0.5).mul(float(0.5).add(cellDiff)).mul(float(0.5).add(cellDiff));
      const weights = array([w0, w1, w2]).toConst("weights");

      const C = this.particleBuffer.element(instanceIndex).get('C').toConst();
      Loop({ start: 0, end: 3, type: 'int', name: 'gx', condition: '<' }, ({ gx }) => {
        Loop({ start: 0, end: 3, type: 'int', name: 'gy', condition: '<' }, ({ gy }) => {
          Loop({ start: 0, end: 3, type: 'int', name: 'gz', condition: '<' }, ({ gz }) => {
            const weight = weights.element(gx).x.mul(weights.element(gy).y).mul(weights.element(gz).z);
            const cellX = cellIndex.add(ivec3(gx, gy, gz)).toConst();
            const cellDist = vec3(cellX).add(0.5).sub(particlePosition).toConst("cellDist");
            const Q = C.mul(cellDist);

            const massContrib = weight;
            const velContrib = massContrib.mul(particleVelocity.add(Q)).toConst("velContrib");
            const cell = getCell(cellX);
            atomicAdd(cell.get('x'), encodeFixedPoint(velContrib.x));
            atomicAdd(cell.get('y'), encodeFixedPoint(velContrib.y));
            atomicAdd(cell.get('z'), encodeFixedPoint(velContrib.z));
            atomicAdd(cell.get('mass'), encodeFixedPoint(massContrib));
          });
        });
      });
    })().compute(1);

    // Kernel: Particle to Grid (pass 2 - stress/pressure)
    this.kernels.p2g2 = Fn(() => {
      this.cellBuffer.setAtomic("x", true);
      this.cellBuffer.setAtomic("y", true);
      this.cellBuffer.setAtomic("z", true);
      this.cellBuffer.setAtomic("mass", false);

      If(instanceIndex.greaterThanEqual(uint(this.uniforms.numParticles)), () => {
        Return();
      });

      const particlePosition = this.particleBuffer.element(instanceIndex).get('position').xyz.toConst("particlePosition");

      const cellIndex = ivec3(particlePosition).sub(1).toConst("cellIndex");
      const cellDiff = particlePosition.fract().sub(0.5).toConst("cellDiff");
      const w0 = float(0.5).mul(float(0.5).sub(cellDiff)).mul(float(0.5).sub(cellDiff));
      const w1 = float(0.75).sub(cellDiff.mul(cellDiff));
      const w2 = float(0.5).mul(float(0.5).add(cellDiff)).mul(float(0.5).add(cellDiff));
      const weights = array([w0, w1, w2]).toConst("weights");

      const density = float(0).toVar("density");
      Loop({ start: 0, end: 3, type: 'int', name: 'gx', condition: '<' }, ({ gx }) => {
        Loop({ start: 0, end: 3, type: 'int', name: 'gy', condition: '<' }, ({ gy }) => {
          Loop({ start: 0, end: 3, type: 'int', name: 'gz', condition: '<' }, ({ gz }) => {
            const weight = weights.element(gx).x.mul(weights.element(gy).y).mul(weights.element(gz).z);
            const cellX = cellIndex.add(ivec3(gx, gy, gz)).toConst();
            const cell = getCell(cellX);
            density.addAssign(decodeFixedPoint(cell.get('mass')).mul(weight));
          });
        });
      });

      const densityStore = this.particleBuffer.element(instanceIndex).get('density');
      densityStore.assign(mix(densityStore, density, 0.05));

      const volume = float(1).div(density);
      const pressure = max(0.0, pow(density.div(this.uniforms.restDensity), 5.0).sub(1).mul(this.uniforms.stiffness)).toConst('pressure');
      const stress = mat3(pressure.negate(), 0, 0, 0, pressure.negate(), 0, 0, 0, pressure.negate()).toVar('stress');
      const dudv = this.particleBuffer.element(instanceIndex).get('C').toConst('C');

      const strain = dudv.add(dudv.transpose());
      stress.addAssign(strain.mul(this.uniforms.dynamicViscosity));
      const eq16Term0 = volume.mul(-4).mul(stress).mul(this.uniforms.dt);

      Loop({ start: 0, end: 3, type: 'int', name: 'gx', condition: '<' }, ({ gx }) => {
        Loop({ start: 0, end: 3, type: 'int', name: 'gy', condition: '<' }, ({ gy }) => {
          Loop({ start: 0, end: 3, type: 'int', name: 'gz', condition: '<' }, ({ gz }) => {
            const weight = weights.element(gx).x.mul(weights.element(gy).y).mul(weights.element(gz).z);
            const cellX = cellIndex.add(ivec3(gx, gy, gz)).toConst();
            const cellDist = vec3(cellX).add(0.5).sub(particlePosition).toConst("cellDist");
            const cell = getCell(cellX);

            const momentum = eq16Term0.mul(weight).mul(cellDist).toConst("momentum");
            atomicAdd(cell.get('x'), encodeFixedPoint(momentum.x));
            atomicAdd(cell.get('y'), encodeFixedPoint(momentum.y));
            atomicAdd(cell.get('z'), encodeFixedPoint(momentum.z));
          });
        });
      });
    })().compute(1);

    // Kernel: Update grid (boundary conditions)
    this.kernels.updateGrid = Fn(() => {
      this.cellBuffer.setAtomic("x", false);
      this.cellBuffer.setAtomic("y", false);
      this.cellBuffer.setAtomic("z", false);
      this.cellBuffer.setAtomic("mass", false);

      If(instanceIndex.greaterThanEqual(uint(this.cellCount)), () => {
        Return();
      });

      const cell = this.cellBuffer.element(instanceIndex).toConst("cell");
      const mass = decodeFixedPoint(cell.get('mass')).toConst();
      If(mass.lessThanEqual(0), () => { Return(); });

      const vx = decodeFixedPoint(cell.get('x')).div(mass).toVar();
      const vy = decodeFixedPoint(cell.get('y')).div(mass).toVar();
      const vz = decodeFixedPoint(cell.get('z')).div(mass).toVar();

      // Grid velocity (no hardcoded boundaries - all collision handled in G2P via boundaries module)
      this.cellBufferF.element(instanceIndex).assign(vec4(vx, vy, vz, mass));
    })().compute(this.cellCount);

    // Kernel: Grid to Particle (update particles)
    this.kernels.g2p = Fn(() => {
      If(instanceIndex.greaterThanEqual(uint(this.uniforms.numParticles)), () => {
        Return();
      });

      const particleMass = this.particleBuffer.element(instanceIndex).get('mass').toConst("particleMass");
      const particleDensity = this.particleBuffer.element(instanceIndex).get('density').toConst("particleDensity");
      const particlePosition = this.particleBuffer.element(instanceIndex).get('position').xyz.toVar("particlePosition");
      const particleVelocity = vec3(0).toVar();

      If(this.uniforms.gravityType.equal(uint(2)), () => {
        const pn = particlePosition.div(vec3(this.uniforms.gridSize.sub(1))).sub(0.5).normalize().toConst();
        particleVelocity.subAssign(pn.mul(0.3).mul(this.uniforms.dt));
      }).Else(() => {
        particleVelocity.addAssign(this.uniforms.gravity.mul(this.uniforms.dt));
      });

      const noise = triNoise3Dvec(particlePosition.mul(0.015), time, 0.11).sub(0.285).normalize().mul(0.28).toVar();
      particleVelocity.subAssign(noise.mul(this.uniforms.noise).mul(this.uniforms.dt));

      const cellIndex = ivec3(particlePosition).sub(1).toConst("cellIndex");
      const cellDiff = particlePosition.fract().sub(0.5).toConst("cellDiff");

      const w0 = float(0.5).mul(float(0.5).sub(cellDiff)).mul(float(0.5).sub(cellDiff));
      const w1 = float(0.75).sub(cellDiff.mul(cellDiff));
      const w2 = float(0.5).mul(float(0.5).add(cellDiff)).mul(float(0.5).add(cellDiff));
      const weights = array([w0, w1, w2]).toConst("weights");

      const B = mat3(0).toVar("B");
      Loop({ start: 0, end: 3, type: 'int', name: 'gx', condition: '<' }, ({ gx }) => {
        Loop({ start: 0, end: 3, type: 'int', name: 'gy', condition: '<' }, ({ gy }) => {
          Loop({ start: 0, end: 3, type: 'int', name: 'gz', condition: '<' }, ({ gz }) => {
            const weight = weights.element(gx).x.mul(weights.element(gy).y).mul(weights.element(gz).z);
            const cellX = cellIndex.add(ivec3(gx, gy, gz)).toConst();
            const cellDist = vec3(cellX).add(0.5).sub(particlePosition).toConst("cellDist");
            const cellPtr = getCellPtr(cellX);

            const weightedVelocity = this.cellBufferF.element(cellPtr).xyz.mul(weight).toConst("weightedVelocity");
            const term = mat3(
              weightedVelocity.mul(cellDist.x),
              weightedVelocity.mul(cellDist.y),
              weightedVelocity.mul(cellDist.z)
            );
            B.addAssign(term);
            particleVelocity.addAssign(weightedVelocity);
          });
        });
      });

      // Mouse interaction
      const dist = cross(this.uniforms.mouseRayDirection, particlePosition.mul(vec3(1, 1, 0.4)).sub(this.uniforms.mouseRayOrigin)).length();
      const force = dist.mul(0.1).oneMinus().max(0.0).pow(2);
      particleVelocity.addAssign(this.uniforms.mouseForce.mul(1).mul(force));
      particleVelocity.mulAssign(particleMass);

      this.particleBuffer.element(instanceIndex).get('C').assign(B.mul(4));
      particlePosition.addAssign(particleVelocity.mul(this.uniforms.dt));
      
      // Apply boundary collision (handled by boundaries module)
      // All collision logic is in boundaries.ts for clean separation
      // When boundaries are disabled (boundaryEnabled=0): viewport mode (adapts to gridSize/page size)
      // When boundaries are enabled (boundaryEnabled=1): custom shapes (Box/Sphere/Tube/Dodecahedron)
      // Note: boundaries module is REQUIRED - always set in APP.ts before first update()
      if (this.boundaries) {
        this.boundaries.generateCollisionTSL(particlePosition, particleVelocity, {
          boundaryEnabled: this.uniforms.boundaryEnabled,
          boundaryShape: this.uniforms.boundaryShape,
          boundaryWallMin: this.uniforms.boundaryWallMin,
          boundaryWallMax: this.uniforms.boundaryWallMax,
          boundaryWallStiffness: this.uniforms.boundaryWallStiffness,
          boundaryCenter: this.uniforms.boundaryCenter,
          boundaryRadius: this.uniforms.boundaryRadius,
          dt: this.uniforms.dt,
          gridSize: this.uniforms.gridSize,  // For viewport-based collision
        });
      }
      // No else - boundaries module is required for proper collision handling

      this.particleBuffer.element(instanceIndex).get('position').assign(particlePosition);
      this.particleBuffer.element(instanceIndex).get('velocity').assign(particleVelocity);

      const direction = this.particleBuffer.element(instanceIndex).get('direction');
      direction.assign(mix(direction, particleVelocity, 0.1));

      // Color calculation based on color mode
      const particleMaterialType = this.particleBuffer.element(instanceIndex).get('materialType');
      const color = vec3(1, 1, 1).toVar();
      
      // ColorMode: 0=VELOCITY, 1=DENSITY, 2=PRESSURE, 3=MATERIAL
      If(this.uniforms.colorMode.equal(int(3)), () => {
        // Material-based color
        color.assign(getMaterialColor(particleMaterialType));
      }).ElseIf(this.uniforms.colorMode.equal(int(1)), () => {
        // Density-based color
        const densityHue = particleDensity.div(this.uniforms.restDensity).mul(0.5).clamp(0, 1);
        color.assign(hsvtorgb(vec3(densityHue, 0.8, 1.0)));
      }).Else(() => {
        // Default: Velocity-based color (original)
        color.assign(hsvtorgb(
          vec3(
            particleDensity.div(this.uniforms.restDensity).mul(0.25).add(time.mul(0.05)),
            particleVelocity.length().mul(0.5).clamp(0, 1).mul(0.3).add(0.7),
            force.mul(0.3).add(0.7)
          )
        ));
      });
      
      this.particleBuffer.element(instanceIndex).get('color').assign(color);
    })().compute(1);
  }

  /**
   * Set mouse ray for interaction
   */
  public setMouseRay(origin: THREE.Vector3, direction: THREE.Vector3, pos: THREE.Vector3): void {
    origin.multiplyScalar(64);
    pos.multiplyScalar(64);
    origin.add(new THREE.Vector3(32, 0, 0));
    this.uniforms.mouseRayDirection.value.copy(direction.normalize());
    this.uniforms.mouseRayOrigin.value.copy(origin);
    this.mousePos.copy(pos);
  }

  /**
   * Update simulation
   */
  public async update(params: SimulationParams, deltaTime: number, elapsed: number): Promise<void> {
    // Update uniforms
    this.uniforms.noise.value = params.noise;
    this.uniforms.stiffness.value = params.stiffness;
    this.uniforms.gravityType.value = params.gravityType;
    this.uniforms.gravity.value.copy(params.gravity);
    this.uniforms.dynamicViscosity.value = params.dynamicViscosity;
    this.uniforms.restDensity.value = params.restDensity;

    // Update particle count
    if (params.numParticles !== this.numParticles) {
      this.numParticles = params.numParticles;
      this.uniforms.numParticles.value = params.numParticles;
      this.kernels.p2g1.count = params.numParticles;
      this.kernels.p2g1.updateDispatchCount();
      this.kernels.p2g2.count = params.numParticles;
      this.kernels.p2g2.updateDispatchCount();
      this.kernels.g2p.count = params.numParticles;
      this.kernels.g2p.updateDispatchCount();
    }

    // Update dt
    const interval = Math.min(deltaTime, 1 / 60);
    this.uniforms.dt.value = interval * 6 * params.dt;

    // Mouse force calculation
    this.mousePosArray.push(this.mousePos.clone());
    if (this.mousePosArray.length > 3) this.mousePosArray.shift();
    if (this.mousePosArray.length > 1) {
      this.uniforms.mouseForce.value
        .copy(this.mousePosArray[this.mousePosArray.length - 1])
        .sub(this.mousePosArray[0])
        .divideScalar(this.mousePosArray.length);
    }

    // Run simulation
    const kernels = [
      this.kernels.clearGrid,
      this.kernels.p2g1,
      this.kernels.p2g2,
      this.kernels.updateGrid,
      this.kernels.g2p,
    ];
    await this.renderer.computeAsync(kernels);
  }
  
  /**
   * Update force fields from manager
   */
  public updateForceFields(forceFieldManager: ForceFieldManager): void {
    forceFieldManager.updateUniforms();
    
    this.uniforms.fieldCount.value = forceFieldManager.fieldCountUniform.value;
    this.uniforms.fieldTypes.value = forceFieldManager.fieldTypesUniform.value;
    this.uniforms.fieldPositions.value = forceFieldManager.fieldPositionsUniform.value;
    this.uniforms.fieldDirections.value = forceFieldManager.fieldDirectionsUniform.value;
    this.uniforms.fieldAxes.value = forceFieldManager.fieldAxesUniform.value;
    this.uniforms.fieldStrengths.value = forceFieldManager.fieldStrengthsUniform.value;
    this.uniforms.fieldRadii.value = forceFieldManager.fieldRadiiUniform.value;
    this.uniforms.fieldFalloffs.value = forceFieldManager.fieldFalloffsUniform.value;
    this.uniforms.fieldTurbScales.value = forceFieldManager.fieldTurbScalesUniform.value;
    this.uniforms.fieldNoiseSpeeds.value = forceFieldManager.fieldNoiseSpeedsUniform.value;
  }
  
  /**
   * Set color mode
   */
  public setColorMode(mode: number): void {
    this.uniforms.colorMode.value = mode;
  }
  
  /**
   * Set particle material type
   */
  public setParticleMaterial(index: number, materialType: MaterialType): void {
    if (index >= 0 && index < this.particleBuffer.length) {
      this.particleBuffer.set(index, "materialType", materialType);
    }
  }
  
  /**
   * Set boundaries module for collision detection
   */
  public setBoundaries(boundaries: ParticleBoundaries): void {
    this.boundaries = boundaries;
    this.updateBoundaryUniforms();
  }
  
  /**
   * Get current boundaries
   */
  public getBoundaries(): ParticleBoundaries | null {
    return this.boundaries;
  }
  
  /**
   * Update boundary uniforms from boundaries module
   * Shape mapping:
   * - NONE = -1: Viewport mode (adaptive page boundaries)
   * - BOX = 0: Box container with loaded model
   * - SPHERE = 1: Spherical glass container
   * - TUBE = 2: Cylindrical tube container
   * - DODECAHEDRON = 3: Dodecahedron glass container
   */
  public updateBoundaryUniforms(): void {
    if (!this.boundaries) return;
    
    const boundaryData = this.boundaries.getBoundaryUniforms();
    
    // Use pre-computed shape integer from boundaries
    this.uniforms.boundaryEnabled.value = boundaryData.enabled ? 1 : 0;
    this.uniforms.boundaryShape.value = boundaryData.shapeInt;
    this.uniforms.boundaryWallMin.value.copy(boundaryData.wallMin);
    this.uniforms.boundaryWallMax.value.copy(boundaryData.wallMax);
    this.uniforms.boundaryWallStiffness.value = boundaryData.wallStiffness;
    this.uniforms.boundaryCenter.value.copy(boundaryData.gridCenter);
    this.uniforms.boundaryRadius.value = boundaryData.boundaryRadius;
  }
}

