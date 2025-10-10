/**
 * PARTICLESYSTEM/PHYSIC/boundaries.ts - Particle container boundaries system
 * Single responsibility: Manage particle container shape, walls, collision detection and visual representation
 * 
 * NOTE: This module's material/rendering is ISOLATED and does NOT affect main scene rendering
 * - Boundary visualization is DISABLED by default (visualize: false)
 * - Uses proper TSL node-based materials (no plain objects)
 * - All color/tone mapping is handled by Scenery.ts (single source of truth)
 * - This module only provides collision physics and optional boundary visualization
 */

import * as THREE from "three/webgpu";
import { Fn, texture, uv, positionWorld, If, vec3, int, float } from "three/tsl";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { SimulationSpace, type SimulationTransform } from "./simulation-space";

import boxObjUrl from '../../assets/boxSlightlySmooth.obj?url';
import normalMapFile from '../../assets/concrete_0016_normal_opengl_1k.png';
import aoMapFile from '../../assets/concrete_0016_ao_1k.jpg';
import colorMapFile from '../../assets/concrete_0016_color_1k.jpg';
import roughnessMapFile from '../../assets/concrete_0016_roughness_1k.jpg';

const textureLoader = new THREE.TextureLoader();

/**
 * Load a texture with repeat wrapping and proper color space
 * 
 * NOTE: Texture color space handling:
 * - Color/diffuse maps: SRGBColorSpace (gamma-encoded, will be linearized by GPU)
 * - Normal/roughness/AO maps: LinearSRGBColorSpace (already linear data)
 * - HDR environment maps: LinearSRGBColorSpace (handled by Scenery.ts)
 * 
 * All tone mapping and final color output is handled by Scenery.ts
 */
async function loadTexture(file: string, colorSpace: THREE.ColorSpace = THREE.LinearSRGBColorSpace): Promise<THREE.Texture> {
  return new Promise((resolve, reject) => {
    textureLoader.load(
      file,
      (texture) => {
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.colorSpace = colorSpace;
        resolve(texture);
      },
      undefined,
      reject
    );
  });
}

/**
 * Boundary container types
 */
export enum BoundaryShape {
  NONE = 'none',           // No container - viewport mode (adaptive page boundaries)
  BOX = 'box',             // Box container with loaded model
  SPHERE = 'sphere',       // Sphere container with glass material
  TUBE = 'tube',           // Cylindrical tube with glass material
  DODECAHEDRON = 'dodecahedron', // Dodecahedron container with glass material
  CUSTOM = 'custom',       // Custom geometry
}

/**
 * Boundary collision mode
 */
export enum CollisionMode {
  REFLECT = 'reflect',      // Bounce off walls
  CLAMP = 'clamp',          // Stop at walls
  WRAP = 'wrap',            // Wrap around
  KILL = 'kill',            // Delete particles
}

/**
 * Boundary configuration
 */
export interface BoundaryConfig {
  shape?: BoundaryShape;
  gridSize?: THREE.Vector3;
  wallThickness?: number;
  wallStiffness?: number;
  collisionMode?: CollisionMode;
  restitution?: number;         // Bounciness (0-1)
  friction?: number;            // Wall friction (0-1)
  visualize?: boolean;          // Show boundary mesh
  customMesh?: THREE.Mesh;      // Custom boundary mesh
  customModelPath?: string;     // Path to OBJ model
  audioReactive?: boolean;      // Enable audio-reactive animations
  audioPulseStrength?: number;  // Strength of audio pulse effect (0-1)
  baseGridSize?: THREE.Vector3; // Reference grid size (defaults to 64^3)
  viewportAttractorStrength?: number; // Strength of soft centering force when boundaries are disabled
  zCompression?: number;        // Rendering compression factor for Z axis
}

/**
 * Wall collision result
 */
export interface CollisionResult {
  collided: boolean;
  normal: THREE.Vector3;
  penetrationDepth: number;
}

interface BoundaryAudioPayload {
  bass: number;
  mid: number;
  treble: number;
  beatIntensity: number;
  containment?: number;
  flow?: number;
  shimmer?: number;
  sway?: number;
}

/**
 * ParticleBoundaries - Comprehensive boundary management system
 * Handles collision detection, visual representation, and boundary constraints
 */
export class ParticleBoundaries {
  public readonly object: THREE.Object3D;
  public readonly gridSize: THREE.Vector3;
  public readonly wallThickness: number;
  public readonly wallStiffness: number;
  public readonly collisionMode: CollisionMode;
  public readonly restitution: number;
  public readonly friction: number;
  public readonly shape: BoundaryShape;

  private boundaryMesh: THREE.Mesh | null = null;
  private customMesh: THREE.Mesh | null = null;
  private visualize: boolean;

  // Audio reactivity
  private audioReactive: boolean;
  private audioPulseStrength: number;
  private baseRadius: number = 0;  // Store base radius for pulsing
  private baseScale: THREE.Vector3 = new THREE.Vector3(1, 1, 1);
  private viewportPulse: number = 0;  // Audio-driven viewport expansion when shape = NONE
  private meshScaleScalar = 1;
  private meshScaleVector: THREE.Vector3 = new THREE.Vector3(1, 1, 1);
  private meshGlow = 0.3;
  private meshRotationOffset = 0;
  private baseRotation: THREE.Euler = new THREE.Euler();

  // Boundary limits (in grid space)
  public readonly min: THREE.Vector3;
  public readonly max: THREE.Vector3;

  private readonly baseGridSize: THREE.Vector3;
  private readonly zCompression: number;
  private readonly simulationSpace: SimulationSpace;
  private viewportAttractorStrength: number;
  
  constructor(config: BoundaryConfig = {}) {
    const {
      shape = BoundaryShape.NONE,  // Default to NONE (viewport mode)
      gridSize = new THREE.Vector3(64, 64, 64),
      wallThickness = 3,
      wallStiffness = 0.3,
      collisionMode = CollisionMode.REFLECT,
      restitution = 0.3,
      friction = 0.1,
      visualize = false,  // Default to hidden
      customMesh = null,
      audioReactive = false,
      audioPulseStrength = 0.15,
      baseGridSize = new THREE.Vector3(64, 64, 64),
      viewportAttractorStrength = 0.08,
      zCompression = 0.4,
    } = config;

    this.object = new THREE.Object3D();
    this.shape = shape;
    this.gridSize = gridSize.clone();
    this.wallThickness = wallThickness;
    this.wallStiffness = wallStiffness;
    this.collisionMode = collisionMode;
    this.restitution = restitution;
    this.friction = friction;
    this.visualize = visualize;
    this.customMesh = customMesh;
    this.audioReactive = audioReactive;
    this.audioPulseStrength = audioPulseStrength;
    this.baseGridSize = baseGridSize.clone();
    this.viewportAttractorStrength = Math.max(0, viewportAttractorStrength);
    this.zCompression = zCompression;
    this.simulationSpace = new SimulationSpace({
      baseGridSize: this.baseGridSize,
      zCompression: this.zCompression,
    });
    this.simulationSpace.setGridSize(this.gridSize);

    // Calculate boundary limits
    this.min = new THREE.Vector3(wallThickness, wallThickness, wallThickness);
    this.max = this.gridSize.clone().subScalar(wallThickness);

    // Store base radius for audio reactivity
    this.baseRadius = Math.min(this.gridSize.x, this.gridSize.y, this.gridSize.z) / 2 - wallThickness;
    this.baseScale.set(
      this.gridSize.x / this.baseGridSize.x,
      this.gridSize.y / this.baseGridSize.y,
      this.gridSize.z / this.baseGridSize.z
    );
  }
  
  /**
   * Initialize boundary geometry and visuals
   */
  public async init(): Promise<void> {
    if (!this.visualize && this.shape !== BoundaryShape.NONE) return;

    switch (this.shape) {
      case BoundaryShape.NONE:
        // No visual container - viewport mode
        break;
      case BoundaryShape.BOX:
        await this.createBoxBoundary();
        this.updateBoundaryMeshTransform();
        break;
      case BoundaryShape.SPHERE:
        await this.createSphereBoundary();
        this.updateBoundaryMeshTransform();
        break;
      case BoundaryShape.TUBE:
        await this.createTubeBoundary();
        this.updateBoundaryMeshTransform();
        break;
      case BoundaryShape.DODECAHEDRON:
        await this.createDodecahedronBoundary();
        this.updateBoundaryMeshTransform();
        break;
      case BoundaryShape.CUSTOM:
        if (this.customMesh) {
          this.boundaryMesh = this.customMesh;
          this.object.add(this.boundaryMesh);
          this.updateBoundaryMeshTransform();
        }
        break;
    }
  }

  private getBaseScale(): number {
    return 1 / this.baseGridSize.x;
  }

  private updateBoundaryMeshTransform(): void {
    if (!this.boundaryMesh) return;

    const scale = this.getBaseScale();
    const gridCenter = this.gridSize.clone().multiplyScalar(0.5);

    const offsetX = (gridCenter.x - this.gridSize.x * 0.5) * scale;
    const offsetY = gridCenter.y * scale;
    const offsetZ = gridCenter.z * scale * this.zCompression;

    this.boundaryMesh.position.set(offsetX, offsetY, offsetZ);

    if (this.shape === BoundaryShape.BOX && this.boundaryMesh) {
      this.boundaryMesh.scale.set(this.baseScale.x, this.baseScale.y, this.baseScale.z);
    }

    this.captureBaseVisualState();
  }

  private captureBaseVisualState(): void {
    if (!this.boundaryMesh) return;
    this.baseRotation.copy(this.boundaryMesh.rotation);
    if (this.shape === BoundaryShape.BOX) {
      this.meshScaleVector.copy(this.boundaryMesh.scale);
    } else {
      this.meshScaleVector.set(1, 1, 1);
    }
    this.meshScaleScalar = 1;
    this.meshGlow = 0.3;
    this.meshRotationOffset = 0;
  }

  private relaxVisualMeshState(): void {
    if (!this.boundaryMesh) return;

    switch (this.shape) {
      case BoundaryShape.BOX:
        this.boundaryMesh.scale.set(this.baseScale.x, this.baseScale.y, this.baseScale.z);
        this.meshScaleVector.set(this.baseScale.x, this.baseScale.y, this.baseScale.z);
        break;
      case BoundaryShape.SPHERE:
      case BoundaryShape.DODECAHEDRON:
        this.boundaryMesh.scale.setScalar(1);
        this.meshScaleVector.set(1, 1, 1);
        break;
      case BoundaryShape.TUBE:
        this.boundaryMesh.scale.set(1, 1, 1);
        this.meshScaleVector.set(1, 1, 1);
        break;
      default:
        break;
    }

    this.meshScaleScalar = 1;
    this.meshGlow = 0.3;
    this.meshRotationOffset = 0;
    this.boundaryMesh.rotation.copy(this.baseRotation);

    if (this.boundaryMesh.material instanceof THREE.Material) {
      const material = this.boundaryMesh.material as THREE.MeshPhysicalNodeMaterial;
      material.opacity = 0.3;
    }
  }
  
  /**
   * Create box boundary mesh
   */
  private async createBoxBoundary(): Promise<void> {
    // Load box geometry
    const loader = new OBJLoader();
    const objectRaw = await new Promise<THREE.Group>((resolve, reject) => {
      loader.load(boxObjUrl, resolve, undefined, reject);
    });
    const geometry = BufferGeometryUtils.mergeVertices((objectRaw.children[0] as THREE.Mesh).geometry);
    
    // Scale UVs for tiling
    const uvArray = geometry.attributes.uv.array as Float32Array;
    for (let i = 0; i < uvArray.length; i++) {
      uvArray[i] *= 10;
    }
    
    // Load textures with correct color spaces
    // Normal, AO, and Roughness are Linear (data maps)
    // Color map is sRGB (color data)
    const [normalMap, aoMap, map, roughnessMap] = await Promise.all([
      loadTexture(normalMapFile, THREE.LinearSRGBColorSpace),
      loadTexture(aoMapFile, THREE.LinearSRGBColorSpace),
      loadTexture(colorMapFile, THREE.SRGBColorSpace), // COLOR = sRGB!
      loadTexture(roughnessMapFile, THREE.LinearSRGBColorSpace),
    ]);
    
    // Create material with TSL nodes
    const material = new THREE.MeshStandardNodeMaterial({
      roughness: 0.9,
      metalness: 0.0,
      normalScale: new THREE.Vector2(1.0, 1.0),
      normalMap,
      aoMap,
      map,
      roughnessMap,
    });
    
    // Custom AO node with depth fade
    material.aoNode = Fn(() => {
      return texture(aoMap, uv()).mul(
        positionWorld.z.div(0.4).mul(0.95).oneMinus()
      );
    })();
    
    // Custom color node with depth fade
    material.colorNode = Fn(() => {
      return texture(map, uv()).mul(
        positionWorld.z.div(0.4).mul(0.5).oneMinus().mul(0.7)
      );
    })();
    
    // Create mesh
    this.boundaryMesh = new THREE.Mesh(geometry, material);
    this.boundaryMesh.rotation.set(0, Math.PI, 0);
    
    // Position and scale to match particle world space
    this.boundaryMesh.scale.set(this.baseScale.x, this.baseScale.y, this.baseScale.z);

    this.boundaryMesh.castShadow = true;
    this.boundaryMesh.receiveShadow = true;

    this.object.add(this.boundaryMesh);
  }
  
  /**
   * Create frosted glass material for procedural containers
   */
  private createGlassMaterial(): THREE.MeshPhysicalNodeMaterial {
    const material = new THREE.MeshPhysicalNodeMaterial({
      color: new THREE.Color(0xaaccff),
      metalness: 0.0,
      roughness: 0.1,
      transmission: 0.9,
      thickness: 0.5,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
      depthWrite: false,
      ior: 1.5,
      iridescence: 0.2,
      iridescenceIOR: 1.3,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
    });
    
    return material;
  }
  
  /**
   * Create sphere boundary mesh with glass material
   */
  private async createSphereBoundary(): Promise<void> {
    // Sphere radius in world space (grid units scaled to world)
    const gridCenter = this.gridSize.clone().multiplyScalar(0.5);
    const radius = (Math.min(this.gridSize.x, this.gridSize.y, this.gridSize.z) / 2 - this.wallThickness) / this.baseGridSize.x;

    const geometry = new THREE.SphereGeometry(radius, 64, 64);
    const material = this.createGlassMaterial();

    this.boundaryMesh = new THREE.Mesh(geometry, material);

    // Position at grid center in world space
    const scale = this.getBaseScale();
    this.boundaryMesh.position.set(
      (gridCenter.x - this.gridSize.x * 0.5) * scale,
      gridCenter.y * scale,
      gridCenter.z * scale * this.zCompression
    );

    this.boundaryMesh.castShadow = false;
    this.boundaryMesh.receiveShadow = true;

    this.object.add(this.boundaryMesh);
  }
  
  /**
   * Create tube (cylinder) boundary mesh with glass material
   */
  private async createTubeBoundary(): Promise<void> {
    const gridCenter = this.gridSize.clone().multiplyScalar(0.5);
    const radiusX = (Math.min(this.gridSize.x, this.gridSize.y) / 2 - this.wallThickness) / this.baseGridSize.x;
    const height = (this.gridSize.z - this.wallThickness * 2) / this.baseGridSize.x * this.zCompression;

    const geometry = new THREE.CylinderGeometry(radiusX, radiusX, height, 64, 1, false);
    const material = this.createGlassMaterial();

    this.boundaryMesh = new THREE.Mesh(geometry, material);
    this.boundaryMesh.rotation.set(0, 0, 0);

    // Position at grid center in world space
    const scale = this.getBaseScale();
    this.boundaryMesh.position.set(
      (gridCenter.x - this.gridSize.x * 0.5) * scale,
      gridCenter.y * scale,
      gridCenter.z * scale * this.zCompression
    );

    this.boundaryMesh.castShadow = false;
    this.boundaryMesh.receiveShadow = true;

    this.object.add(this.boundaryMesh);
  }
  
  /**
   * Create dodecahedron boundary mesh with glass material
   */
  private async createDodecahedronBoundary(): Promise<void> {
    const gridCenter = this.gridSize.clone().multiplyScalar(0.5);
    const radius = (Math.min(this.gridSize.x, this.gridSize.y, this.gridSize.z) / 2 - this.wallThickness) / this.baseGridSize.x;

    const geometry = new THREE.DodecahedronGeometry(radius, 0);
    const material = this.createGlassMaterial();

    this.boundaryMesh = new THREE.Mesh(geometry, material);

    // Position at grid center in world space
    const scale = this.getBaseScale();
    this.boundaryMesh.position.set(
      (gridCenter.x - this.gridSize.x * 0.5) * scale,
      gridCenter.y * scale,
      gridCenter.z * scale * this.zCompression
    );

    this.boundaryMesh.castShadow = false;
    this.boundaryMesh.receiveShadow = true;

    this.object.add(this.boundaryMesh);
  }
  
  /**
   * Get boundary shape as integer for GPU shader
   */
  public getShapeAsInt(): number {
    const shapeMap: Record<BoundaryShape, number> = {
      [BoundaryShape.NONE]: -1,
      [BoundaryShape.BOX]: 0,
      [BoundaryShape.SPHERE]: 1,
      [BoundaryShape.TUBE]: 2,
      [BoundaryShape.DODECAHEDRON]: 3,
      [BoundaryShape.CUSTOM]: 4,
    };
    return shapeMap[this.shape] ?? -1;
  }
  
  /**
   * Get boundary uniforms for GPU shader
   */
  public getBoundaryUniforms() {
    return {
      enabled: this.enabled,
      shape: this.shape,
      shapeInt: this.getShapeAsInt(),
      wallMin: this.min,
      wallMax: this.max,
      wallStiffness: this.wallStiffness,
      wallThickness: this.wallThickness,
      restitution: this.restitution,
      friction: this.friction,
      collisionMode: this.collisionMode,
      gridCenter: this.gridSize.clone().multiplyScalar(0.5),
      boundaryRadius: Math.min(this.gridSize.x, this.gridSize.y, this.gridSize.z) / 2 - this.wallThickness,
      viewportPulse: this.viewportPulse,
      viewportAttractorStrength: this.viewportAttractorStrength,
    };
  }

  /**
   * Expose the renderer transform so other systems (renderers, gizmos, etc.)
   * can stay aligned with the simulation domain.
   */
  public getSimulationTransform(): SimulationTransform {
    return this.simulationSpace.getRendererTransform();
  }
  
  /**
   * Generate TSL collision code for GPU compute shader
   * This is the COMPLETE collision logic for all boundary shapes
   * Call this inside the particle update kernel
   * 
   * SHAPE MODES:
   * - NONE (shape = -1): Viewport mode - adaptive page boundaries, no container
   * - BOX (shape = 0): Box container with loaded model
   * - SPHERE (shape = 1): Spherical glass container
   * - TUBE (shape = 2): Cylindrical glass tube container
   * - DODECAHEDRON (shape = 3): Dodecahedron glass container (approximated as sphere)
   * 
   * When DISABLED (boundaryEnabled = 0) or NONE:
   * - Uses page/viewport dimensions as soft boundaries
   * - Particles float in center of page
   * - Adapts automatically to window resize
   * - Softer collision (0.2 stiffness) for natural feel
   * 
   * When ENABLED (boundaryEnabled = 1):
   * - Uses configured container shape
   * - Stronger collision based on wallStiffness
   * - Visual mesh shown
   * - Custom boundary physics
   */
  public generateCollisionTSL(
    particlePosition: any,
    particleVelocity: any,
    uniforms: {
      boundaryEnabled: any,
      boundaryShape: any,
      boundaryWallMin: any,
      boundaryWallMax: any,
      boundaryWallStiffness: any,
      boundaryCenter: any,
      boundaryRadius: any,
      dt: any,
      gridSize: any,
      viewportPulse: any,
      viewportAttractorStrength: any,
    }
  ): void {
    // === VIEWPORT MODE (NONE or disabled) ===
    // Particles use gridSize (viewport space) as boundaries
    // This keeps particles visible on page and adapts to page size
    If(uniforms.boundaryEnabled.equal(int(0)), () => {
      // Tighter soft viewport walls to keep particles more centered
      const wallMarginXY = float(15).toConst("wallMarginXY"); // Larger margins for X/Y to keep particles more central
      const wallMarginZ = float(8).toConst("wallMarginZ"); // Smaller Z margin for less extreme depth
      const wallStiffness = float(0.5).toConst("wallStiffness"); // Stronger walls
      const xN2 = particlePosition.add(particleVelocity.mul(uniforms.dt).mul(2.0));
      
      // Apply soft wall forces with tighter constraints
      If(xN2.x.lessThan(wallMarginXY), () => {
        particleVelocity.x.addAssign(wallMarginXY.sub(xN2.x).mul(wallStiffness));
      });
      If(xN2.x.greaterThan(uniforms.gridSize.x.sub(wallMarginXY)), () => {
        particleVelocity.x.addAssign(uniforms.gridSize.x.sub(wallMarginXY).sub(xN2.x).mul(wallStiffness));
      });
      If(xN2.y.lessThan(wallMarginXY), () => {
        particleVelocity.y.addAssign(wallMarginXY.sub(xN2.y).mul(wallStiffness));
      });
      If(xN2.y.greaterThan(uniforms.gridSize.y.sub(wallMarginXY)), () => {
        particleVelocity.y.addAssign(uniforms.gridSize.y.sub(wallMarginXY).sub(xN2.y).mul(wallStiffness));
      });
      // Reduced Z range for less extreme depth
      If(xN2.z.lessThan(wallMarginZ), () => {
        particleVelocity.z.addAssign(wallMarginZ.sub(xN2.z).mul(wallStiffness));
      });
      If(xN2.z.greaterThan(uniforms.gridSize.z.sub(wallMarginZ)), () => {
        particleVelocity.z.addAssign(uniforms.gridSize.z.sub(wallMarginZ).sub(xN2.z).mul(wallStiffness));
      });
      
      // Stronger centering attractor for more natural clustering
      const viewportCenter = uniforms.gridSize.mul(0.5).toConst("viewportCenter");
      const offsetToCenter = viewportCenter.sub(particlePosition).toConst("viewportOffset");
      const attractStrength = uniforms.viewportAttractorStrength
        .mul(1.5) // Increase attractor strength by 50%
        .add(uniforms.viewportPulse.mul(0.25))
        .toConst("viewportAttractorStrength");

      particleVelocity.addAssign(offsetToCenter.mul(attractStrength));
    });
    
    // === CUSTOM CONTAINER MODE (enabled) ===
    If(uniforms.boundaryEnabled.equal(int(1)), () => {
      const xN2 = particlePosition.add(particleVelocity.mul(uniforms.dt).mul(3.0));
      
      // === BOX CONTAINER (shape = 0) ===
      If(uniforms.boundaryShape.equal(int(0)), () => {
        const boxMin = uniforms.boundaryWallMin;
        const boxMax = uniforms.boundaryWallMax;
        const boxStiffness = uniforms.boundaryWallStiffness;
        
        // Six-sided box collision
        If(xN2.x.lessThan(boxMin.x), () => { 
          particleVelocity.x.addAssign(boxMin.x.sub(xN2.x).mul(boxStiffness)); 
        });
        If(xN2.x.greaterThan(boxMax.x), () => { 
          particleVelocity.x.addAssign(boxMax.x.sub(xN2.x).mul(boxStiffness)); 
        });
        If(xN2.y.lessThan(boxMin.y), () => { 
          particleVelocity.y.addAssign(boxMin.y.sub(xN2.y).mul(boxStiffness)); 
        });
        If(xN2.y.greaterThan(boxMax.y), () => { 
          particleVelocity.y.addAssign(boxMax.y.sub(xN2.y).mul(boxStiffness)); 
        });
        If(xN2.z.lessThan(boxMin.z), () => { 
          particleVelocity.z.addAssign(boxMin.z.sub(xN2.z).mul(boxStiffness)); 
        });
        If(xN2.z.greaterThan(boxMax.z), () => { 
          particleVelocity.z.addAssign(boxMax.z.sub(xN2.z).mul(boxStiffness)); 
        });
        
        // Clamp position to box boundaries
        particlePosition.assign(particlePosition.clamp(boxMin, boxMax));
      });
      
      // === SPHERE CONTAINER (shape = 1) ===
      If(uniforms.boundaryShape.equal(int(1)), () => {
        const sphereCenter = uniforms.boundaryCenter;
        const sphereRadius = uniforms.boundaryRadius;
        const sphereStiffness = uniforms.boundaryWallStiffness;
        
        // Radial distance-based collision
        const sphereOffset = xN2.sub(sphereCenter);
        const sphereDist = sphereOffset.length();
        
        If(sphereDist.greaterThan(sphereRadius), () => {
          const sphereNormal = sphereOffset.normalize();
          const spherePenetration = sphereDist.sub(sphereRadius);
          particleVelocity.subAssign(sphereNormal.mul(spherePenetration).mul(sphereStiffness));
        });
        
        // Clamp position to sphere
        const sphereCurrentOffset = particlePosition.sub(sphereCenter);
        const sphereCurrentDist = sphereCurrentOffset.length();
        If(sphereCurrentDist.greaterThan(sphereRadius), () => {
          particlePosition.assign(sphereCenter.add(sphereCurrentOffset.normalize().mul(sphereRadius)));
        });
      });
      
      // === TUBE CONTAINER (shape = 2) ===
      If(uniforms.boundaryShape.equal(int(2)), () => {
        const tubeCenter = uniforms.boundaryCenter;
        const tubeRadius = uniforms.boundaryRadius;
        const tubeMinZ = uniforms.boundaryWallMin;
        const tubeMaxZ = uniforms.boundaryWallMax;
        const tubeStiffness = uniforms.boundaryWallStiffness;
        
        // Radial collision on XY plane
        const tubeOffsetXY = vec3(xN2.x.sub(tubeCenter.x), xN2.y.sub(tubeCenter.y), 0);
        const tubeDistXY = tubeOffsetXY.length();
        
        If(tubeDistXY.greaterThan(tubeRadius), () => {
          const tubeNormalXY = tubeOffsetXY.normalize();
          const tubePenetration = tubeDistXY.sub(tubeRadius);
          particleVelocity.x.subAssign(tubeNormalXY.x.mul(tubePenetration).mul(tubeStiffness));
          particleVelocity.y.subAssign(tubeNormalXY.y.mul(tubePenetration).mul(tubeStiffness));
        });
        
        // Z-axis collision (tube caps)
        If(xN2.z.lessThan(tubeMinZ.z), () => { 
          particleVelocity.z.addAssign(tubeMinZ.z.sub(xN2.z).mul(tubeStiffness)); 
        });
        If(xN2.z.greaterThan(tubeMaxZ.z), () => { 
          particleVelocity.z.addAssign(tubeMaxZ.z.sub(xN2.z).mul(tubeStiffness)); 
        });
        
        // Clamp position to tube
        const tubeCurrentOffsetXY = vec3(particlePosition.x.sub(tubeCenter.x), particlePosition.y.sub(tubeCenter.y), 0);
        const tubeCurrentDistXY = tubeCurrentOffsetXY.length();
        If(tubeCurrentDistXY.greaterThan(tubeRadius), () => {
          const tubeClampedXY = tubeCurrentOffsetXY.normalize().mul(tubeRadius);
          particlePosition.x.assign(tubeCenter.x.add(tubeClampedXY.x));
          particlePosition.y.assign(tubeCenter.y.add(tubeClampedXY.y));
        });
        particlePosition.z.assign(particlePosition.z.clamp(tubeMinZ.z, tubeMaxZ.z));
      });
      
      // === DODECAHEDRON CONTAINER (shape = 3) ===
      // Approximated as spherical collision for GPU efficiency
      If(uniforms.boundaryShape.equal(int(3)), () => {
        const dodecaCenter = uniforms.boundaryCenter;
        const dodecaRadius = uniforms.boundaryRadius;
        const dodecaStiffness = uniforms.boundaryWallStiffness;
        
        // Radial distance-based collision (same as sphere)
        const dodecaOffset = xN2.sub(dodecaCenter);
        const dodecaDist = dodecaOffset.length();
        
        If(dodecaDist.greaterThan(dodecaRadius), () => {
          const dodecaNormal = dodecaOffset.normalize();
          const dodecaPenetration = dodecaDist.sub(dodecaRadius);
          particleVelocity.subAssign(dodecaNormal.mul(dodecaPenetration).mul(dodecaStiffness));
        });
        
        // Clamp position to dodecahedron (spherical approximation)
        const dodecaCurrentOffset = particlePosition.sub(dodecaCenter);
        const dodecaCurrentDist = dodecaCurrentOffset.length();
        If(dodecaCurrentDist.greaterThan(dodecaRadius), () => {
          particlePosition.assign(dodecaCenter.add(dodecaCurrentOffset.normalize().mul(dodecaRadius)));
        });
      });
    });
  }
  
  /**
   * Check collision for a single particle (CPU-side)
   */
  public checkCollision(
    position: THREE.Vector3,
    velocity: THREE.Vector3,
    dt: number
  ): CollisionResult {
    const result: CollisionResult = {
      collided: false,
      normal: new THREE.Vector3(),
      penetrationDepth: 0,
    };
    
    // Predict next position
    const nextPos = position.clone().addScaledVector(velocity, dt * 3.0);
    
    if (this.shape === BoundaryShape.BOX) {
      // Check each axis
      if (nextPos.x < this.min.x) {
        result.collided = true;
        result.normal.set(1, 0, 0);
        result.penetrationDepth = this.min.x - nextPos.x;
      } else if (nextPos.x > this.max.x) {
        result.collided = true;
        result.normal.set(-1, 0, 0);
        result.penetrationDepth = nextPos.x - this.max.x;
      }
      
      if (nextPos.y < this.min.y) {
        result.collided = true;
        result.normal.set(0, 1, 0);
        result.penetrationDepth = Math.max(result.penetrationDepth, this.min.y - nextPos.y);
      } else if (nextPos.y > this.max.y) {
        result.collided = true;
        result.normal.set(0, -1, 0);
        result.penetrationDepth = Math.max(result.penetrationDepth, nextPos.y - this.max.y);
      }
      
      if (nextPos.z < this.min.z) {
        result.collided = true;
        result.normal.set(0, 0, 1);
        result.penetrationDepth = Math.max(result.penetrationDepth, this.min.z - nextPos.z);
      } else if (nextPos.z > this.max.z) {
        result.collided = true;
        result.normal.set(0, 0, -1);
        result.penetrationDepth = Math.max(result.penetrationDepth, nextPos.z - this.max.z);
      }
    } else if (this.shape === BoundaryShape.SPHERE || this.shape === BoundaryShape.DODECAHEDRON) {
      // Sphere and dodecahedron use same collision logic (spherical approximation)
      const center = this.gridSize.clone().multiplyScalar(0.5);
      const radius = Math.min(this.gridSize.x, this.gridSize.y, this.gridSize.z) / 2 - this.wallThickness;
      const offset = nextPos.clone().sub(center);
      const dist = offset.length();
      
      if (dist > radius) {
        result.collided = true;
        result.normal.copy(offset).normalize();
        result.penetrationDepth = dist - radius;
      }
    } else if (this.shape === BoundaryShape.TUBE) {
      // Tube (cylinder) collision
      const center = this.gridSize.clone().multiplyScalar(0.5);
      const radius = Math.min(this.gridSize.x, this.gridSize.y) / 2 - this.wallThickness;
      const offsetXY = new THREE.Vector2(nextPos.x - center.x, nextPos.y - center.y);
      const distXY = offsetXY.length();
      
      // Radial collision
      if (distXY > radius) {
        result.collided = true;
        result.normal.set(offsetXY.x, offsetXY.y, 0).normalize();
        result.penetrationDepth = distXY - radius;
      }
      
      // Cap collision
      if (nextPos.z < this.min.z) {
        result.collided = true;
        result.normal.set(0, 0, 1);
        result.penetrationDepth = Math.max(result.penetrationDepth, this.min.z - nextPos.z);
      } else if (nextPos.z > this.max.z) {
        result.collided = true;
        result.normal.set(0, 0, -1);
        result.penetrationDepth = Math.max(result.penetrationDepth, nextPos.z - this.max.z);
      }
    }
    
    return result;
  }
  
  /**
   * Apply collision response to velocity (CPU-side)
   */
  public applyCollisionResponse(
    position: THREE.Vector3,
    velocity: THREE.Vector3,
    dt: number
  ): void {
    const collision = this.checkCollision(position, velocity, dt);
    
    if (!collision.collided) return;
    
    switch (this.collisionMode) {
      case CollisionMode.REFLECT:
        // Reflect velocity with restitution
        const normalVel = velocity.dot(collision.normal);
        velocity.addScaledVector(
          collision.normal,
          -(1 + this.restitution) * normalVel
        );
        break;
        
      case CollisionMode.CLAMP:
        // Stop at boundary
        velocity.addScaledVector(
          collision.normal,
          collision.penetrationDepth * this.wallStiffness
        );
        break;
        
      case CollisionMode.WRAP:
        // Wrap around (teleport to opposite side)
        if (this.shape === BoundaryShape.BOX) {
          if (position.x < this.min.x) position.x = this.max.x;
          if (position.x > this.max.x) position.x = this.min.x;
          if (position.y < this.min.y) position.y = this.max.y;
          if (position.y > this.max.y) position.y = this.min.y;
          if (position.z < this.min.z) position.z = this.max.z;
          if (position.z > this.max.z) position.z = this.min.z;
        }
        break;
        
      case CollisionMode.KILL:
        // Mark for deletion (caller should handle)
        break;
    }
    
    // Apply friction
    if (this.friction > 0 && collision.collided) {
      const tangent = velocity.clone().addScaledVector(
        collision.normal,
        -velocity.dot(collision.normal)
      );
      velocity.addScaledVector(tangent, -this.friction);
    }

    position.clamp(this.min, this.max);
  }

  
  /**
   * Update boundary with audio data (for audio-reactive animations)
   */
  public update(elapsed: number, audioData?: BoundaryAudioPayload): void {
    if (!this.audioReactive) {
      this.viewportPulse = THREE.MathUtils.lerp(this.viewportPulse, 0, 0.15);
      this.relaxVisualMeshState();
      return;
    }

    if (!audioData) {
      this.viewportPulse = THREE.MathUtils.lerp(this.viewportPulse, 0, 0.15);
      this.relaxVisualMeshState();
      return;
    }

    const beat = THREE.MathUtils.clamp(audioData.beatIntensity ?? 0, 0, 1);
    const containment = THREE.MathUtils.clamp(
      audioData.containment ?? audioData.bass * 0.5 + audioData.mid * 0.35 + audioData.treble * 0.15,
      0,
      1
    );
    const shimmer = THREE.MathUtils.clamp(audioData.shimmer ?? audioData.treble, 0, 1);
    const flow = THREE.MathUtils.clamp(audioData.flow ?? audioData.mid, 0, 1);
    const sway = THREE.MathUtils.clamp((audioData.sway ?? 0.5) * 2 - 1, -1, 1);

    if (this.shape === BoundaryShape.NONE) {
      const combinedEnergy =
        audioData.bass * 0.45 +
        audioData.mid * 0.35 +
        audioData.treble * 0.2 +
        beat * 0.6 +
        containment * 0.5;
      const targetPulse = THREE.MathUtils.clamp(combinedEnergy * this.audioPulseStrength * 1.2, 0, 0.4);
      this.viewportPulse = THREE.MathUtils.lerp(this.viewportPulse, targetPulse, 0.25);
      this.relaxVisualMeshState();
      return;
    }

    this.viewportPulse = THREE.MathUtils.lerp(this.viewportPulse, 0, 0.2);

    if (!this.boundaryMesh) {
      return;
    }

    const baseOpacity = 0.25 + containment * 0.1;

    if (this.shape === BoundaryShape.SPHERE || this.shape === BoundaryShape.DODECAHEDRON) {
      const pulseStrength = audioData.bass * 0.6 + containment * 0.4;
      const targetScale = 1 + pulseStrength * this.audioPulseStrength * 1.3 + beat * 0.1;
      this.meshScaleScalar = THREE.MathUtils.lerp(this.meshScaleScalar, targetScale, 0.18);
      this.boundaryMesh.scale.setScalar(this.meshScaleScalar);

      this.meshGlow = THREE.MathUtils.lerp(this.meshGlow, baseOpacity + shimmer * 0.35 + beat * 0.25, 0.25);
      this.meshRotationOffset = THREE.MathUtils.lerp(this.meshRotationOffset, sway * 0.35, 0.12);
      this.boundaryMesh.rotation.y = this.baseRotation.y + this.meshRotationOffset;

      if (this.boundaryMesh.material instanceof THREE.Material) {
        const material = this.boundaryMesh.material as THREE.MeshPhysicalNodeMaterial;
        material.opacity = THREE.MathUtils.clamp(this.meshGlow, 0.1, 0.85);
      }
    } else if (this.shape === BoundaryShape.TUBE) {
      const targetRadial = 1 + (flow * 0.45 + containment * 0.35 + beat * 0.15) * this.audioPulseStrength;
      const targetHeight = 1 + (audioData.bass * 0.35 + containment * 0.4) * this.audioPulseStrength;
      this.meshScaleVector.set(
        THREE.MathUtils.lerp(this.meshScaleVector.x, targetRadial, 0.18),
        THREE.MathUtils.lerp(this.meshScaleVector.y, targetHeight, 0.18),
        THREE.MathUtils.lerp(this.meshScaleVector.z, targetRadial, 0.18)
      );
      this.boundaryMesh.scale.copy(this.meshScaleVector);

      this.meshGlow = THREE.MathUtils.lerp(this.meshGlow, baseOpacity + shimmer * 0.3 + beat * 0.2, 0.2);
      this.meshRotationOffset = THREE.MathUtils.lerp(this.meshRotationOffset, sway * 0.25, 0.1);
      this.boundaryMesh.rotation.y = this.baseRotation.y + this.meshRotationOffset;

      if (this.boundaryMesh.material instanceof THREE.Material) {
        const material = this.boundaryMesh.material as THREE.MeshPhysicalNodeMaterial;
        material.opacity = THREE.MathUtils.clamp(this.meshGlow, 0.1, 0.75);
      }
    } else if (this.shape === BoundaryShape.BOX) {
      const energy = (audioData.bass + audioData.mid + audioData.treble) / 3;
      const targetScalar = 1 + (energy * 0.25 + containment * 0.3) * this.audioPulseStrength + beat * 0.08;
      const targetHeight = this.baseScale.y * (1 + flow * this.audioPulseStrength * 0.25);

      this.meshScaleVector.set(
        THREE.MathUtils.lerp(this.meshScaleVector.x, this.baseScale.x * targetScalar, 0.16),
        THREE.MathUtils.lerp(this.meshScaleVector.y, targetHeight, 0.16),
        THREE.MathUtils.lerp(this.meshScaleVector.z, this.baseScale.z * targetScalar, 0.16)
      );
      this.boundaryMesh.scale.copy(this.meshScaleVector);

      this.meshRotationOffset = THREE.MathUtils.lerp(this.meshRotationOffset, sway * 0.25 + beat * 0.05, 0.1);
      this.boundaryMesh.rotation.y = this.baseRotation.y + this.meshRotationOffset;

      if (this.boundaryMesh.material instanceof THREE.Material) {
        const material = this.boundaryMesh.material as THREE.MeshStandardNodeMaterial;
        material.opacity = THREE.MathUtils.clamp(baseOpacity + beat * 0.2, 0.2, 0.9);
      }
    }
  }
  /**
   * Set visibility
   */
  public setVisible(visible: boolean): void {
    this.visualize = visible;
    if (this.boundaryMesh) {
      this.boundaryMesh.visible = visible;
    }
  }
  
  /**
   * Enable/disable boundaries (physics + visual)
   * When disabled:
   * - Uses viewport/page dimensions as boundaries
   * - Visual mesh hidden
   * - Particles adapt to page size automatically
   * - Particles stay visible on page
   * When enabled:
   * - Uses configured boundary shape (Box/Sphere/Cylinder)
   * - Visual mesh shown
   */
  private enabled: boolean = false;  // Default to disabled (viewport mode)
  
  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.setVisible(enabled);
    if (!enabled) {
      this.viewportPulse = 0;
    }

    // Note: GPU collision is controlled via boundaryEnabled uniform
    // which is synced via updateBoundaryUniforms() in mls-mpm.ts
  }
  
  public isEnabled(): boolean {
    return this.enabled;
  }
  
  /**
   * Change boundary shape dynamically
   */
  public async setShape(newShape: BoundaryShape): Promise<void> {
    if (this.shape === newShape) return;
    
    // Dispose old mesh
    if (this.boundaryMesh) {
      this.boundaryMesh.geometry.dispose();
      if (this.boundaryMesh.material instanceof THREE.Material) {
        this.boundaryMesh.material.dispose();
      }
      this.object.remove(this.boundaryMesh);
      this.boundaryMesh = null;
    }
    
    // Update shape
    (this as any).shape = newShape;
    
    // Create new mesh if visualizing
    if (this.visualize) {
      await this.init();
    }

    this.updateBoundaryMeshTransform();
  }
  
  /**
   * Update wall properties
   */
  public setWallStiffness(stiffness: number): void {
    (this as any).wallStiffness = stiffness;
  }
  
  public setWallThickness(thickness: number): void {
    (this as any).wallThickness = thickness;
    this.min.set(thickness, thickness, thickness);
    this.max.copy(this.gridSize).subScalar(thickness);
    this.baseRadius = Math.min(this.gridSize.x, this.gridSize.y, this.gridSize.z) / 2 - this.wallThickness;
    this.updateBoundaryMeshTransform();
  }
  
  public setRestitution(restitution: number): void {
    (this as any).restitution = Math.max(0, Math.min(1, restitution));
  }
  
  public setFriction(friction: number): void {
    (this as any).friction = Math.max(0, Math.min(1, friction));
  }
  
  public setCollisionMode(mode: CollisionMode): void {
    (this as any).collisionMode = mode;
  }
  
  /**
   * Update boundary dimensions
   */
  public setGridSize(gridSize: THREE.Vector3): void {
    this.gridSize.copy(gridSize);
    this.min.set(this.wallThickness, this.wallThickness, this.wallThickness);
    this.max.copy(this.gridSize).subScalar(this.wallThickness);
    this.simulationSpace.setGridSize(this.gridSize);
    this.baseRadius = Math.min(this.gridSize.x, this.gridSize.y, this.gridSize.z) / 2 - this.wallThickness;
    this.baseScale.set(
      this.gridSize.x / this.baseGridSize.x,
      this.gridSize.y / this.baseGridSize.y,
      this.gridSize.z / this.baseGridSize.z
    );
    this.updateBoundaryMeshTransform();
  }
  
  /**
   * Dispose resources
   */
  public dispose(): void {
    if (this.boundaryMesh) {
      this.boundaryMesh.geometry.dispose();
      if (this.boundaryMesh.material instanceof THREE.Material) {
        this.boundaryMesh.material.dispose();
      }
      this.object.remove(this.boundaryMesh);
      this.boundaryMesh = null;
    }
  }
}

