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
  vec2,
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
  sin,
  cos,
  length,
  smoothstep,
  normalize,
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

/**
 * Transfer modes for Grid-to-Particle velocity update
 */
export enum TransferMode {
  PIC = 0,        // Pure PIC (stable, dissipative)
  FLIP = 1,       // Pure FLIP (energetic, noisy)
  HYBRID = 2,     // FLIP/PIC blend (balanced)
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
  
  // FLIP/PIC Hybrid parameters
  transferMode: TransferMode;
  flipRatio: number;  // 0.0 = pure PIC, 1.0 = pure FLIP
  
  // Vorticity confinement
  vorticityEnabled: boolean;
  vorticityEpsilon: number;
  
  // Surface tension
  surfaceTensionEnabled: boolean;
  surfaceTensionCoeff: number;
  
  // Performance
  sparseGrid: boolean;
  adaptiveTimestep: boolean;
  cflTarget: number;
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
  private readonly vorticityBuffer: any;  // Vorticity field (curl of velocity)
  private readonly neighborDensityBuffer: any;  // Neighbor density for surface detection
  private readonly activeCellBuffer: any;  // Sparse grid: marks active cells (1=active, 0=empty)
  private readonly uniforms: Record<string, any> = {};
  private readonly kernels: Record<string, any> = {};
  private readonly fixedPointMultiplier: number;
  private readonly cellCount: number;
  private readonly maxParticles: number;
  
  private mousePos: THREE.Vector3 = new THREE.Vector3();
  private mousePosArray: THREE.Vector3[] = [];
  public numParticles: number = 0;
  private boundaries: ParticleBoundaries | null = null;

  constructor(renderer: THREE.WebGPURenderer, config: MlsMpmConfig) {
    this.renderer = renderer;
    this.gridSize = config.gridSize || new THREE.Vector3(64, 64, 64);
    this.fixedPointMultiplier = config.fixedPointMultiplier || 1e7;
    this.cellCount = this.gridSize.x * this.gridSize.y * this.gridSize.z;
    this.maxParticles = config.maxParticles;

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
    
    // Vorticity buffer (stores curl of velocity field at each grid cell)
    this.vorticityBuffer = instancedArray(this.cellCount, 'vec3').label('vorticityData');
    
    // Neighbor density buffer (stores density for surface detection) - using vec4 for compatibility
    this.neighborDensityBuffer = instancedArray(this.maxParticles, 'vec4').label('neighborDensity');
    
    // Active cell buffer for sparse grid optimization
    this.activeCellBuffer = instancedArray(this.cellCount, 'int').label('activeCells');

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
    
    // FLIP/PIC Hybrid uniforms
    this.uniforms.transferMode = uniform(TransferMode.HYBRID, "int");
    this.uniforms.flipRatio = uniform(0.95);  // Default: 95% FLIP, 5% PIC
    
    // Vorticity confinement uniforms
    this.uniforms.vorticityEnabled = uniform(0, "int");
    this.uniforms.vorticityEpsilon = uniform(0.0);
    
    // Surface tension uniforms
    this.uniforms.surfaceTensionEnabled = uniform(0, "int");
    this.uniforms.surfaceTensionCoeff = uniform(0.5);
    
    // Performance uniforms
    this.uniforms.sparseGrid = uniform(1, "int");  // 1=enabled, 0=disabled
    
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
    
    // Audio reactive uniforms
    this.uniforms.audioReactiveEnabled = uniform(0, "int");
    this.uniforms.audioBass = uniform(0);
    this.uniforms.audioMid = uniform(0);
    this.uniforms.audioTreble = uniform(0);
    this.uniforms.audioBeatIntensity = uniform(0);
    this.uniforms.audioVisualizationMode = uniform(0, "int");  // 0-8 for 9 visualization modes
    
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
    this.uniforms.boundaryViewportPulse = uniform(0);
    this.uniforms.boundaryViewportAttractorStrength = uniform(0.08);
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
      
      // Clear active cell flags for sparse grid
      this.activeCellBuffer.element(instanceIndex).assign(int(0));
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
            
            // Mark cell as active for sparse grid optimization
            this.activeCellBuffer.element(getCellPtr(cellX)).assign(int(1));
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
      
      // Sparse grid optimization: skip inactive cells
      If(this.uniforms.sparseGrid.equal(int(1)), () => {
        const isActive = this.activeCellBuffer.element(instanceIndex).toConst("isActive");
        If(isActive.equal(int(0)), () => {
          Return();  // Skip this cell - no particles nearby
        });
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

    // Kernel: Calculate Vorticity (curl of velocity field)
    this.kernels.calculateVorticity = Fn(() => {
      If(instanceIndex.greaterThanEqual(uint(this.cellCount)), () => {
        Return();
      });

      // Convert flat index to 3D grid coordinates
      const gz = instanceIndex.mod(this.uniforms.gridSize.z).toConst();
      const gy = instanceIndex.div(this.uniforms.gridSize.z).mod(this.uniforms.gridSize.y).toConst();
      const gx = instanceIndex.div(this.uniforms.gridSize.z).div(this.uniforms.gridSize.y).toConst();
      const cellPos = ivec3(gx, gy, gz).toConst("cellPos");

      // Skip boundary cells (need neighbors for gradient)
      If(cellPos.x.lessThanEqual(0).or(cellPos.x.greaterThanEqual(this.uniforms.gridSize.x.sub(1)))
        .or(cellPos.y.lessThanEqual(0).or(cellPos.y.greaterThanEqual(this.uniforms.gridSize.y.sub(1))))
        .or(cellPos.z.lessThanEqual(0).or(cellPos.z.greaterThanEqual(this.uniforms.gridSize.z.sub(1)))),
      () => {
        this.vorticityBuffer.element(instanceIndex).assign(vec3(0));
        Return();
      });

      // Sample neighboring velocities for gradient calculation
      const vC = this.cellBufferF.element(getCellPtr(cellPos)).xyz.toConst("vC");
      const vXP = this.cellBufferF.element(getCellPtr(cellPos.add(ivec3(1, 0, 0)))).xyz.toConst("vXP");
      const vXM = this.cellBufferF.element(getCellPtr(cellPos.sub(ivec3(1, 0, 0)))).xyz.toConst("vXM");
      const vYP = this.cellBufferF.element(getCellPtr(cellPos.add(ivec3(0, 1, 0)))).xyz.toConst("vYP");
      const vYM = this.cellBufferF.element(getCellPtr(cellPos.sub(ivec3(0, 1, 0)))).xyz.toConst("vYM");
      const vZP = this.cellBufferF.element(getCellPtr(cellPos.add(ivec3(0, 0, 1)))).xyz.toConst("vZP");
      const vZM = this.cellBufferF.element(getCellPtr(cellPos.sub(ivec3(0, 0, 1)))).xyz.toConst("vZM");

      // Calculate velocity gradients using central differences
      const dv_dx = vXP.sub(vXM).mul(0.5).toConst("dv_dx");
      const dv_dy = vYP.sub(vYM).mul(0.5).toConst("dv_dy");
      const dv_dz = vZP.sub(vZM).mul(0.5).toConst("dv_dz");

      // Calculate curl: ω = ∇ × v
      const curl = vec3(
        dv_dz.y.sub(dv_dy.z),  // ∂v_z/∂y - ∂v_y/∂z
        dv_dx.z.sub(dv_dz.x),  // ∂v_x/∂z - ∂v_z/∂x
        dv_dy.x.sub(dv_dx.y)   // ∂v_y/∂x - ∂v_x/∂y
      ).toConst("curl");

      // Store vorticity in buffer
      this.vorticityBuffer.element(instanceIndex).assign(curl);
    })().compute(this.cellCount);
    
    // KERNEL: Calculate Neighbor Density (for surface detection)
    // TODO: Fix TSL node issues - temporarily disabled
    /*
    this.kernels.calculateNeighborDensity = Fn(() => {
      If(instanceIndex.greaterThanEqual(this.uniforms.numParticles), () => {
        Return();
      });
      
      const particle = this.particleBuffer.element(instanceIndex);
      const particlePos = particle.get('position').xyz.toConst("particlePos");
      
      // Count neighbors within radius by sampling grid density
      const neighborDensity = float(0.0).toVar("neighborDensity");
      
      // Sample neighbors in nearby grid cells (3x3x3 neighborhood)
      Loop({ start: int(-1), end: int(2), type: "int", condition: "<" }, ({ i }) => {
        Loop({ start: int(-1), end: int(2), type: "int", condition: "<" }, ({ j }) => {
          Loop({ start: int(-1), end: int(2), type: "int", condition: "<" }, ({ k }) => {
            const offset = ivec3(i, j, k).toConst("offset");
            const neighborCellPos = ivec3(particlePos).add(offset).toConst("neighborCellPos");
            
            // Sample grid density (mass) from neighboring cells
            If(
              neighborCellPos.x.greaterThanEqual(int(0)).and(neighborCellPos.x.lessThan(this.uniforms.gridSize.x))
              .and(neighborCellPos.y.greaterThanEqual(int(0)).and(neighborCellPos.y.lessThan(this.uniforms.gridSize.y)))
              .and(neighborCellPos.z.greaterThanEqual(int(0)).and(neighborCellPos.z.lessThan(this.uniforms.gridSize.z))),
              () => {
                const cellMass = this.cellBufferF.element(getCellPtr(neighborCellPos)).w;
                neighborDensity.addAssign(cellMass);
              }
            );
          });
        });
      });
      
      // Normalize by expected density (for full interior particle)
      const expectedDensity = float(10.0).toConst("expectedDensity");
      const normalizedDensity = neighborDensity.div(expectedDensity).toConst("normalizedDensity");
      
      // Store normalized density in buffer (scalar access)
      this.neighborDensityBuffer.element(instanceIndex).assign(vec4(normalizedDensity, float(0), float(0), float(0)));
    })().compute(this.maxParticles);
    */

    // Kernel: Grid to Particle (update particles)
    this.kernels.g2p = Fn(() => {
      If(instanceIndex.greaterThanEqual(uint(this.uniforms.numParticles)), () => {
        Return();
      });

      const particleMass = this.particleBuffer.element(instanceIndex).get('mass').toConst("particleMass");
      const particleDensity = this.particleBuffer.element(instanceIndex).get('density').toConst("particleDensity");
      const particlePosition = this.particleBuffer.element(instanceIndex).get('position').xyz.toVar("particlePosition");
      
      // FLIP/PIC: Store old velocity before updating
      const oldVelocity = this.particleBuffer.element(instanceIndex).get('velocity').xyz.toConst("oldVelocity");
      
      // Start with forces (gravity + noise + audio-reactive)
      const forceAccumulator = vec3(0).toVar("forceAccumulator");

      If(this.uniforms.gravityType.equal(uint(2)), () => {
        const pn = particlePosition.div(vec3(this.uniforms.gridSize.sub(1))).sub(0.5).normalize().toConst();
        forceAccumulator.subAssign(pn.mul(0.3).mul(this.uniforms.dt));
      }).Else(() => {
        forceAccumulator.addAssign(this.uniforms.gravity.mul(this.uniforms.dt));
      });

      const noise = triNoise3Dvec(particlePosition.mul(0.015), time, 0.11).sub(0.285).normalize().mul(0.28).toVar();
      forceAccumulator.subAssign(noise.mul(this.uniforms.noise).mul(this.uniforms.dt));
      
      // Audio-reactive force (enhanced with visualization modes)
      If(this.uniforms.audioReactiveEnabled.equal(int(1)), () => {
        const normPos = particlePosition.div(vec3(this.uniforms.gridSize)).toConst('normPos');
        
        // Mode 0: Wave Field - Traveling wave patterns
        If(this.uniforms.audioVisualizationMode.equal(int(0)), () => {
          // Bass wave (large wavelength, slow)
          const bassPhase = time.mul(1.5).add(normPos.x.mul(8.0)).toConst('bassPhase');
          const bassWave = sin(bassPhase).mul(this.uniforms.audioBass).mul(2.0).toConst('bassWave');
          forceAccumulator.y.addAssign(bassWave.mul(this.uniforms.dt));
          
          // Mid wave (medium wavelength, moderate speed)
          const midPhase = time.mul(3.0).add(length(normPos.xz).mul(4.0)).toConst('midPhase');
          const midWave = sin(midPhase).mul(this.uniforms.audioMid).mul(1.4).toConst('midWave');
          const midDir = vec2(cos(midPhase), sin(midPhase)).toConst('midDir');
          forceAccumulator.x.addAssign(midDir.x.mul(midWave).mul(this.uniforms.dt));
          forceAccumulator.z.addAssign(midDir.y.mul(midWave).mul(this.uniforms.dt));
          
          // Treble wave (small wavelength, fast)
          const treblePhase = time.mul(5.0).add(length(normPos).mul(2.0)).toConst('treblePhase');
          const trebleWave = sin(treblePhase).mul(this.uniforms.audioTreble).mul(0.8).toConst('trebleWave');
          forceAccumulator.addAssign(vec3(cos(treblePhase), sin(treblePhase.mul(2)), sin(treblePhase)).mul(trebleWave).mul(this.uniforms.dt));
        });
        
        // Mode 1: Frequency Towers - Vertical columns
        If(this.uniforms.audioVisualizationMode.equal(int(1)), () => {
          const numBands = float(16);
          const bandIndex = normPos.x.mul(numBands).floor().toConst('bandIndex');
          const bandCenter = bandIndex.add(0.5).div(numBands).toConst('bandCenter');
          const bandFreqNorm = bandIndex.div(numBands).toConst('bandFreqNorm');
          
          // Audio amplitude for this frequency range
          const bassContrib = smoothstep(0.5, 0.0, bandFreqNorm).mul(this.uniforms.audioBass).toConst('bassContrib');
          const midContrib = smoothstep(0.2, 0.5, bandFreqNorm).mul(smoothstep(0.8, 0.5, bandFreqNorm)).mul(this.uniforms.audioMid).toConst('midContrib');
          const trebleContrib = smoothstep(0.5, 1.0, bandFreqNorm).mul(this.uniforms.audioTreble).toConst('trebleContrib');
          const amplitude = bassContrib.add(midContrib).add(trebleContrib).toConst('amplitude');
          
          // Vertical force toward target height
          const targetHeight = amplitude.mul(this.uniforms.gridSize.y).mul(0.8).toConst('targetHeight');
          forceAccumulator.y.addAssign(targetHeight.sub(particlePosition.y).mul(0.1).mul(this.uniforms.dt).mul(15.0));
          
          // Horizontal attraction to band center
          const horizontalDir = bandCenter.mul(this.uniforms.gridSize.x).sub(particlePosition.x).toConst('horizontalDir');
          forceAccumulator.x.addAssign(horizontalDir.mul(0.2).mul(this.uniforms.dt).mul(10.0));
        });
        
        // Mode 2: Vortex Dance - Swaying + beat bounce
        If(this.uniforms.audioVisualizationMode.equal(int(2)), () => {
          // Swaying motion
          const sway = vec3(
            sin(time.mul(2).add(particlePosition.z.mul(0.1))),
            cos(time.mul(1.5).add(particlePosition.x.mul(0.1))),
            sin(time.mul(1.8).add(particlePosition.y.mul(0.1)))
          ).mul(this.uniforms.audioBass.add(this.uniforms.audioMid).add(this.uniforms.audioTreble).div(3)).mul(2.0).toConst('sway');
          forceAccumulator.addAssign(sway.mul(this.uniforms.dt));
          
          // Beat-synchronized bounce
          const bounce = this.uniforms.audioBeatIntensity.mul(sin(time.mul(12))).mul(5.0).toConst('bounce');
          forceAccumulator.y.addAssign(bounce.mul(this.uniforms.dt));
        });
        
        // Mode 3: Morphological - Shape forming
        If(this.uniforms.audioVisualizationMode.equal(int(3)), () => {
          const center = vec3(this.uniforms.gridSize).mul(0.5).toConst('center');
          const toCenter = center.sub(particlePosition).toConst('toCenter');
          const distFromCenter = length(toCenter).toConst('distFromCenter');
          const dirToCenter = normalize(toCenter).toConst('dirToCenter');
          
          // Bass → Sphere attraction
          const sphereRadius = this.uniforms.gridSize.x.mul(0.25).toConst('sphereRadius');
          const sphereForce = dirToCenter.mul(distFromCenter.sub(sphereRadius).mul(0.2)).mul(this.uniforms.audioBass).mul(8.0).toConst('sphereForce');
          forceAccumulator.addAssign(sphereForce.mul(this.uniforms.dt));
          
          // Mid → Torus
          const torusRadius = this.uniforms.gridSize.x.mul(0.3).toConst('torusRadius');
          const horizontalDist = length(particlePosition.xz.sub(center.xz)).toConst('horizontalDist');
          const torusForce = vec3(
            dirToCenter.x,
            particlePosition.y.sub(center.y).negate().mul(0.3),
            dirToCenter.z
          ).mul(horizontalDist.sub(torusRadius).mul(0.15)).mul(this.uniforms.audioMid).mul(8.0).toConst('torusForce');
          forceAccumulator.addAssign(torusForce.mul(this.uniforms.dt));
        });
        
        // Mode 4: Galaxy Spiral - Orbital motion
        If(this.uniforms.audioVisualizationMode.equal(int(4)), () => {
          const center = vec3(this.uniforms.gridSize).mul(0.5).toConst('center');
          const radialDir = normalize(vec3(particlePosition.x.sub(center.x), 0, particlePosition.z.sub(center.z))).toConst('radialDir');
          const tangent = vec3(radialDir.z.negate(), 0, radialDir.x).toConst('tangent');
          
          // Orbital speed modulated by audio
          const orbitalSpeed = this.uniforms.audioBass.add(this.uniforms.audioMid).add(this.uniforms.audioTreble).div(3).mul(2).add(1.0).toConst('orbitalSpeed');
          forceAccumulator.addAssign(tangent.mul(orbitalSpeed).mul(12.0).mul(this.uniforms.dt));
          
          // Spiral inward
          const radiusXZ = length(particlePosition.xz.sub(center.xz)).toConst('radiusXZ');
          const spiralAngle = time.mul(orbitalSpeed).add(radiusXZ.mul(0.3)).toConst('spiralAngle');
          const spiralInward = radialDir.negate().mul(sin(spiralAngle)).mul(this.uniforms.audioBass).mul(3.6).toConst('spiralInward');
          forceAccumulator.addAssign(spiralInward.mul(this.uniforms.dt));
        });
        
        // Mode 5: Kinetic Flow - Velocity field visualization
        If(this.uniforms.audioVisualizationMode.equal(int(5)), () => {
          // Bass: broad, slow flows (horizontal)
          const bassFlow = vec3(
            sin(normPos.z.mul(3).add(time.mul(0.5))),
            0,
            cos(normPos.x.mul(3).add(time.mul(0.5)))
          ).mul(this.uniforms.audioBass).mul(10.0).toConst('bassFlow');
          forceAccumulator.addAssign(bassFlow.mul(this.uniforms.dt));
          
          // Mid: swirling flows
          const center = vec3(0.5).toConst('center');
          const toCenter = normPos.sub(center).toConst('toCenter');
          const midSwirl = vec3(toCenter.z.negate(), 0, toCenter.x).mul(this.uniforms.audioMid).mul(8.0).toConst('midSwirl');
          forceAccumulator.addAssign(midSwirl.mul(this.uniforms.dt));
          
          // Treble: chaotic turbulent flows
          const trebleTurbulence = triNoise3Dvec(
            particlePosition.mul(0.05),
            time.mul(this.uniforms.audioTreble.add(0.1)),
            0.15
          ).sub(0.5).mul(2).mul(this.uniforms.audioTreble).mul(5.0).toConst('trebleTurbulence');
          forceAccumulator.addAssign(trebleTurbulence.mul(this.uniforms.dt));
        });
        
        // Mode 6: Fractal Burst - Explosive patterns on beat
        If(this.uniforms.audioVisualizationMode.equal(int(6)), () => {
          const center = vec3(this.uniforms.gridSize).mul(0.5).toConst('center');
          const toCenter = center.sub(particlePosition).toConst('toCenter');
          
          // Fractal branching pattern
          const branchNoise = triNoise3Dvec(particlePosition.mul(0.1), time.mul(0.1), 0.2).toConst('branchNoise');
          const burstPhase = this.uniforms.audioBeatIntensity.mul(
            float(1).sub(smoothstep(0.0, 0.5, time.mod(2.0)))
          ).toConst('burstPhase');
          const burstDir = normalize(branchNoise.sub(0.5).mul(2)).toConst('burstDir');
          forceAccumulator.addAssign(burstDir.mul(burstPhase).mul(20.0).mul(this.uniforms.dt));
          
          // Return to center
          forceAccumulator.addAssign(toCenter.mul(0.05).mul(this.uniforms.audioBass.add(this.uniforms.audioMid).add(this.uniforms.audioTreble).div(3)).mul(this.uniforms.dt));
        });
        
        // Mode 7: Harmonic Lattice - Oscillating grid
        If(this.uniforms.audioVisualizationMode.equal(int(7)), () => {
          const latticeSpacing = float(4.0);
          const latticePos = particlePosition.div(latticeSpacing).floor().mul(latticeSpacing).add(latticeSpacing.mul(0.5)).toConst('latticePos');
          const toLattice = latticePos.sub(particlePosition).toConst('toLattice');

          // Natural frequency based on lattice position
          const omega0 = length(latticePos.div(vec3(this.uniforms.gridSize))).mul(5).add(1).toConst('omega0');

          // Audio frequency
          const audioFreq = this.uniforms.audioBass.mul(0.2).add(this.uniforms.audioTreble.mul(2.0)).add(1.0).toConst('audioFreq');
          const resonanceFactor = float(1).div(
            float(1).add(pow(audioFreq.sub(omega0).abs(), float(2)))
          ).toConst('resonanceFactor');

          // Oscillation amplitude
          const amplitude = this.uniforms.audioBass.add(this.uniforms.audioMid).add(this.uniforms.audioTreble).div(3).mul(resonanceFactor).mul(7.5).toConst('amplitude');
          const oscillation = sin(time.mul(omega0)).mul(amplitude).toConst('oscillation');
          const oscillationDir = normalize(toLattice.add(0.001)).toConst('oscillationDir');
          forceAccumulator.addAssign(oscillationDir.mul(oscillation).mul(this.uniforms.dt));

          // Spring force back to lattice
          forceAccumulator.addAssign(toLattice.mul(0.3).mul(this.uniforms.dt).mul(15.0));
        });

        // Mode 8: Aurora Veil - flowing curtains of light
        If(this.uniforms.audioVisualizationMode.equal(int(8)), () => {
          const curtainPhase = normPos.x.mul(8.0)
            .add(time.mul(this.uniforms.audioMid.add(this.uniforms.audioTreble).mul(0.5).add(0.8)))
            .toConst('curtainPhase');
          const swayX = sin(curtainPhase).mul(this.uniforms.audioTreble.add(0.3)).toConst('swayX');
          const swayZ = cos(curtainPhase).mul(this.uniforms.audioMid.add(0.2)).toConst('swayZ');
          forceAccumulator.x.addAssign(swayX.mul(this.uniforms.dt).mul(8.0));
          forceAccumulator.z.addAssign(swayZ.mul(this.uniforms.dt).mul(6.0));

          const heightMask = smoothstep(0.1, 0.9, normPos.y).toConst('heightMask');
          const lift = heightMask.mul(
            this.uniforms.audioMid.mul(8.0).add(this.uniforms.audioTreble.mul(10.0))
          ).toConst('lift');
          forceAccumulator.y.addAssign(lift.mul(this.uniforms.dt));

          const shimmer = triNoise3Dvec(
            particlePosition.mul(0.04),
            time.mul(this.uniforms.audioTreble.add(0.6)),
            0.3
          ).sub(0.5).mul(2).mul(
            this.uniforms.audioTreble.add(this.uniforms.audioMid.mul(0.5))
          ).toConst('shimmer');
          forceAccumulator.addAssign(shimmer.mul(this.uniforms.dt).mul(4.0));

          const beatCurtain = this.uniforms.audioBeatIntensity
            .mul(sin(time.mul(9.0).add(normPos.z.mul(6.0))))
            .mul(14.0)
            .toConst('beatCurtain');
          forceAccumulator.y.addAssign(beatCurtain.mul(this.uniforms.dt));

          const convergence = vec3(0.5, smoothstep(0.2, 0.8, normPos.y), 0.5)
            .sub(normPos)
            .toConst('convergence');
          forceAccumulator.addAssign(convergence.mul(0.6).mul(this.uniforms.audioMid).mul(this.uniforms.dt));
        });

        // Beat pulse (global, applies to all modes)
        const center = vec3(0.5).toConst('center');
        const toCenter = center.sub(normPos).toConst('toCenter');
        const distFromCenter = length(toCenter).toConst('distFromCenter');
        const beatIntensity = this.uniforms.audioBeatIntensity
          .mul(smoothstep(0.0, 0.3, distFromCenter))
          .toConst('beatIntensity');
        const beatPhase = sin(time.mul(6.0)).mul(0.5).add(0.5).toConst('beatPhase');  // Slower (was 8.0)
        const beatForce = toCenter.normalize()
          .mul(beatIntensity)
          .mul(beatPhase)
          .mul(1.5)  // Much gentler (was 3.5)
          .toConst('beatForce');
        forceAccumulator.addAssign(beatForce.mul(this.uniforms.dt));
      });

      const cellIndex = ivec3(particlePosition).sub(1).toConst("cellIndex");
      const cellDiff = particlePosition.fract().sub(0.5).toConst("cellDiff");

      const w0 = float(0.5).mul(float(0.5).sub(cellDiff)).mul(float(0.5).sub(cellDiff));
      const w1 = float(0.75).sub(cellDiff.mul(cellDiff));
      const w2 = float(0.5).mul(float(0.5).add(cellDiff)).mul(float(0.5).add(cellDiff));
      const weights = array([w0, w1, w2]).toConst("weights");

      // Interpolate velocity from grid (PIC)
      const gridVelocity = vec3(0).toVar("gridVelocity");
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
            gridVelocity.addAssign(weightedVelocity);
          });
        });
      });

      // FLIP/PIC Hybrid Transfer
      const particleVelocity = vec3(0).toVar("particleVelocity");
      
      // Transfer Mode: 0=PIC, 1=FLIP, 2=HYBRID
      If(this.uniforms.transferMode.equal(int(0)), () => {
        // Pure PIC: Use grid velocity directly (stable, dissipative)
        particleVelocity.assign(gridVelocity);
      }).ElseIf(this.uniforms.transferMode.equal(int(1)), () => {
        // Pure FLIP: Use velocity delta (energetic, noisy)
        const velocityDelta = gridVelocity.sub(oldVelocity).toConst("velocityDelta");
        particleVelocity.assign(oldVelocity.add(velocityDelta));
      }).Else(() => {
        // FLIP/PIC Hybrid: Blend using flipRatio
        const velocityDelta = gridVelocity.sub(oldVelocity).toConst("velocityDelta");
        const flipComponent = oldVelocity.add(velocityDelta).toConst("flipComponent");
        const picComponent = gridVelocity.toConst("picComponent");
        
        // particleVelocity = flipRatio * FLIP + (1 - flipRatio) * PIC
        particleVelocity.assign(
          flipComponent.mul(this.uniforms.flipRatio).add(
            picComponent.mul(float(1.0).sub(this.uniforms.flipRatio))
          )
        );
      });
      
      // Add forces
      particleVelocity.addAssign(forceAccumulator);
      
      // Vorticity Confinement (if enabled)
      If(this.uniforms.vorticityEnabled.equal(int(1)), () => {
        // Sample vorticity field at particle position
        const vorticityAtParticle = vec3(0).toVar("vorticityAtParticle");
        
        Loop({ start: 0, end: 3, type: 'int', name: 'gx', condition: '<' }, ({ gx }) => {
          Loop({ start: 0, end: 3, type: 'int', name: 'gy', condition: '<' }, ({ gy }) => {
            Loop({ start: 0, end: 3, type: 'int', name: 'gz', condition: '<' }, ({ gz }) => {
              const weight = weights.element(gx).x.mul(weights.element(gy).y).mul(weights.element(gz).z);
              const cellX = cellIndex.add(ivec3(gx, gy, gz)).toConst();
              const cellPtr = getCellPtr(cellX);
              
              const vorticity = this.vorticityBuffer.element(cellPtr).toConst("vorticity");
              vorticityAtParticle.addAssign(vorticity.mul(weight));
            });
          });
        });
        
        // Calculate magnitude of vorticity
        const omega = vorticityAtParticle.toConst("omega");
        const omegaMag = omega.length().add(1e-6).toConst("omegaMag");  // Add epsilon to avoid division by zero
        
        // Calculate gradient of vorticity magnitude (using finite differences)
        const gradOmegaMag = vec3(0).toVar("gradOmegaMag");
        
        // Sample vorticity magnitude at neighboring cells
        const cellPos = ivec3(particlePosition).toConst();
        
        If(cellPos.x.greaterThan(0).and(cellPos.x.lessThan(this.uniforms.gridSize.x.sub(1))), () => {
          const omegaXP = this.vorticityBuffer.element(getCellPtr(cellPos.add(ivec3(1, 0, 0)))).length();
          const omegaXM = this.vorticityBuffer.element(getCellPtr(cellPos.sub(ivec3(1, 0, 0)))).length();
          gradOmegaMag.x.assign(omegaXP.sub(omegaXM).mul(0.5));
        });
        
        If(cellPos.y.greaterThan(0).and(cellPos.y.lessThan(this.uniforms.gridSize.y.sub(1))), () => {
          const omegaYP = this.vorticityBuffer.element(getCellPtr(cellPos.add(ivec3(0, 1, 0)))).length();
          const omegaYM = this.vorticityBuffer.element(getCellPtr(cellPos.sub(ivec3(0, 1, 0)))).length();
          gradOmegaMag.y.assign(omegaYP.sub(omegaYM).mul(0.5));
        });
        
        If(cellPos.z.greaterThan(0).and(cellPos.z.lessThan(this.uniforms.gridSize.z.sub(1))), () => {
          const omegaZP = this.vorticityBuffer.element(getCellPtr(cellPos.add(ivec3(0, 0, 1)))).length();
          const omegaZM = this.vorticityBuffer.element(getCellPtr(cellPos.sub(ivec3(0, 0, 1)))).length();
          gradOmegaMag.z.assign(omegaZP.sub(omegaZM).mul(0.5));
        });
        
        // Normalize gradient
        const gradMag = gradOmegaMag.length().add(1e-6);
        const N = gradOmegaMag.div(gradMag).toConst("N");
        
        // Vorticity confinement force: F = ε * (N × ω)
        const vorticityForce = cross(N, omega).mul(this.uniforms.vorticityEpsilon).toConst("vorticityForce");
        
        // Apply vorticity confinement force
        particleVelocity.addAssign(vorticityForce.mul(this.uniforms.dt));
      });
      
      // Surface Tension: Apply cohesion force based on neighbor density
      // TODO: Re-enable once TSL node issues are resolved
      // Temporarily fully commented out to prevent errors
      /*
      If(this.uniforms.surfaceTensionEnabled.equal(int(1)), () => {
        const densityVec = this.neighborDensityBuffer.element(instanceIndex).toConst("densityVec");
        const density = densityVec.x.toConst("surfaceDensity");
        const surfaceFactor = max(float(0.0), float(1.0).sub(density)).toConst("surfaceFactor");
        const neighborCenterOfMass = vec3(float(0)).toVar("neighborCenterOfMass");
        const neighborMassSum = float(0).toVar("neighborMassSum");
        
        Loop({ start: int(-1), end: int(2), type: "int", condition: "<" }, ({ i }) => {
          Loop({ start: int(-1), end: int(2), type: "int", condition: "<" }, ({ j }) => {
            Loop({ start: int(-1), end: int(2), type: "int", condition: "<" }, ({ k }) => {
              const offset = ivec3(i, j, k).toConst("offset");
              const neighborCellPos = ivec3(particlePosition).add(offset).toConst("neighborCellPos");
              If(
                neighborCellPos.x.greaterThanEqual(int(0)).and(neighborCellPos.x.lessThan(this.uniforms.gridSize.x))
                .and(neighborCellPos.y.greaterThanEqual(int(0)).and(neighborCellPos.y.lessThan(this.uniforms.gridSize.y)))
                .and(neighborCellPos.z.greaterThanEqual(int(0)).and(neighborCellPos.z.lessThan(this.uniforms.gridSize.z))),
                () => {
                  const cellData = this.cellBufferF.element(getCellPtr(neighborCellPos)).toConst("cellData");
                  const cellMass = cellData.w;
                  If(cellMass.greaterThan(float(0.01)), () => {
                    const cellCenter = vec3(float(neighborCellPos.x), float(neighborCellPos.y), float(neighborCellPos.z)).add(vec3(0.5)).toConst("cellCenter");
                    neighborCenterOfMass.addAssign(cellCenter.mul(cellMass));
                    neighborMassSum.addAssign(cellMass);
                  });
                }
              );
            });
          });
        });
        
        If(neighborMassSum.greaterThan(float(0.01)), () => {
          neighborCenterOfMass.divAssign(neighborMassSum);
          const cohesionDir = neighborCenterOfMass.sub(particlePosition).toConst("cohesionDir");
          const cohesionDist = cohesionDir.length().add(float(1e-6)).toConst("cohesionDist");
          const cohesionNorm = cohesionDir.div(cohesionDist).toConst("cohesionNorm");
          const tensionForce = cohesionNorm
            .mul(this.uniforms.surfaceTensionCoeff)
            .mul(surfaceFactor)
            .toConst("tensionForce");
          particleVelocity.addAssign(tensionForce.mul(this.uniforms.dt));
        });
      });
      */

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
          viewportPulse: this.uniforms.boundaryViewportPulse,
          viewportAttractorStrength: this.uniforms.boundaryViewportAttractorStrength,
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
   * Estimate max velocity by sampling particles (for adaptive timestep)
   */
  private estimateMaxVelocity(): number {
    const sampleInterval = 64;  // Sample every 64th particle
    const sampleCount = Math.ceil(this.numParticles / sampleInterval);
    let maxVelSq = 0;
    
    // Particle struct layout:
    // position (vec3): 0-2, density (float): 3, velocity (vec3): 4-6, mass (float): 7, ...
    const velocityOffset = 4;  // Velocity starts at index 4 in struct
    const structSize = this.particleBuffer.structSize;
    
    // Sample velocities from particle buffer
    for (let i = 0; i < sampleCount && i * sampleInterval < this.numParticles; i++) {
      const idx = i * sampleInterval;
      const baseIdx = idx * structSize + velocityOffset;
      const vx = this.particleBuffer.floatArray[baseIdx];
      const vy = this.particleBuffer.floatArray[baseIdx + 1];
      const vz = this.particleBuffer.floatArray[baseIdx + 2];
      const velSq = vx * vx + vy * vy + vz * vz;
      maxVelSq = Math.max(maxVelSq, velSq);
    }
    
    return Math.sqrt(maxVelSq);
  }

  /**
   * Update simulation (with audio reactivity)
   */
  public async update(params: SimulationParams, deltaTime: number, elapsed: number, audioData?: any): Promise<void> {
    // Update uniforms
    this.uniforms.noise.value = params.noise;
    this.uniforms.stiffness.value = params.stiffness;
    this.uniforms.gravityType.value = params.gravityType;
    this.uniforms.gravity.value.copy(params.gravity);
    this.uniforms.dynamicViscosity.value = params.dynamicViscosity;
    this.uniforms.restDensity.value = params.restDensity;
    
    // Update audio reactivity
    if (audioData) {
      this.uniforms.audioReactiveEnabled.value = 1;
      this.uniforms.audioBass.value = audioData.smoothBass || 0;
      this.uniforms.audioMid.value = audioData.smoothMid || 0;
      this.uniforms.audioTreble.value = audioData.smoothTreble || 0;
      this.uniforms.audioBeatIntensity.value = audioData.beatIntensity || 0;
      // audioVisualizationMode is set via setAudioVisualizationMode() method
    } else {
      this.uniforms.audioReactiveEnabled.value = 0;
    }
    
    // Update FLIP/PIC parameters
    this.uniforms.transferMode.value = params.transferMode;
    this.uniforms.flipRatio.value = params.flipRatio;
    
    // Update vorticity confinement parameters
    this.uniforms.vorticityEnabled.value = params.vorticityEnabled ? 1 : 0;
    this.uniforms.vorticityEpsilon.value = params.vorticityEpsilon;
    
    // Update surface tension parameters
    this.uniforms.surfaceTensionEnabled.value = params.surfaceTensionEnabled ? 1 : 0;
    this.uniforms.surfaceTensionCoeff.value = params.surfaceTensionCoeff;
    
    // Update performance parameters
    this.uniforms.sparseGrid.value = params.sparseGrid ? 1 : 0;
    
    // Calculate base dt from frame interval and speed
    const interval = Math.min(deltaTime, 1 / 60);
    const baseDt = interval * 6 * params.dt;
    
    // Adaptive timestep: clamp dt based on CFL condition
    let dt = baseDt;
    if (params.adaptiveTimestep && this.numParticles > 0) {
      const maxVelocity = this.estimateMaxVelocity();
      const gridSpacing = 1.0;  // Grid cell size
      const cflTarget = params.cflTarget;
      
      if (maxVelocity > 0.1) {  // Only clamp if velocity is significant
        const dtSafe = (cflTarget * gridSpacing) / maxVelocity;
        dt = Math.min(baseDt, dtSafe);  // Clamp to safe value, don't increase
      }
      // Clamp to reasonable bounds
      dt = Math.max(0.0001, Math.min(0.1, dt));
    }
    this.uniforms.dt.value = dt;

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

    // Note: dt already set above via adaptive timestep or params.dt

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
    ];
    
    // Add vorticity calculation if enabled
    if (params.vorticityEnabled) {
      kernels.push(this.kernels.calculateVorticity);
    }
    
    // Add neighbor density calculation if surface tension is enabled
    // TODO: Re-enable once TSL node issues are resolved
    // if (params.surfaceTensionEnabled) {
    //   kernels.push(this.kernels.calculateNeighborDensity);
    // }
    
    // Grid to particle always runs last
    kernels.push(this.kernels.g2p);
    
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
   * Set audio visualization mode (0-8)
   */
  public setAudioVisualizationMode(mode: number): void {
    this.uniforms.audioVisualizationMode.value = mode;
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
    
    // Update gridSize uniform for viewport mode (critical for adaptive boundaries)
    this.uniforms.gridSize.value = new THREE.Vector3(
      this.boundaries.gridSize.x,
      this.boundaries.gridSize.y,
      this.boundaries.gridSize.z
    );
    
    // Use pre-computed shape integer from boundaries
    this.uniforms.boundaryEnabled.value = boundaryData.enabled ? 1 : 0;
    this.uniforms.boundaryShape.value = boundaryData.shapeInt;
    this.uniforms.boundaryWallMin.value.copy(boundaryData.wallMin);
    this.uniforms.boundaryWallMax.value.copy(boundaryData.wallMax);
    this.uniforms.boundaryWallStiffness.value = boundaryData.wallStiffness;
    this.uniforms.boundaryCenter.value.copy(boundaryData.gridCenter);
    this.uniforms.boundaryRadius.value = boundaryData.boundaryRadius;
    this.uniforms.boundaryViewportPulse.value = boundaryData.viewportPulse ?? 0;
    this.uniforms.boundaryViewportAttractorStrength.value = boundaryData.viewportAttractorStrength ?? 0;
  }
}

