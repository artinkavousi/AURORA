/**
 * PARTICLESYSTEM/PHYSIC/boundaries.ts - Particle container boundaries system
 * 
 * SELF-CONTAINED COORDINATE SYSTEM:
 * ==================================
 * This module is fully independent and self-contained:
 * - Internal grid space: (0, 0, 0) to (gridSize.x, gridSize.y, gridSize.z)
 * - World space transform: Applied internally, not by parent
 * - Visual meshes: Generated in proper world coordinates
 * - Collision boundaries: Always aligned with visual meshes
 * 
 * Features:
 * ✅ Self-contained - All coordinate transforms are internal
 * ✅ Viewport independent - Container shapes never deform from resize
 * ✅ Fully responsive - Adaptive boundaries for viewport mode
 * ✅ Audio reactive - Clean animations without transform conflicts
 * ✅ Shape switching - Box, Sphere, Tube, Dodecahedron, None (viewport mode)
 * ✅ Perfect alignment - Visual meshes match collision boundaries exactly
 */

import * as THREE from "three/webgpu";
import { Fn, texture, uv, positionWorld, If, vec3, int, float } from "three/tsl";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';

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
}

/**
 * Wall collision result
 */
export interface CollisionResult {
  collided: boolean;
  normal: THREE.Vector3;
  penetrationDepth: number;
}

/**
 * ParticleBoundaries - Self-contained boundary management system
 * Handles collision detection, visual representation, and boundary constraints
 * 
 * ARCHITECTURE:
 * - Fully independent coordinate system (no parent transforms)
 * - Visual meshes generated in world space directly
 * - Collision boundaries always aligned with visuals
 * - Responsive to scene changes without deformation
 * - Clean audio reactivity without transform conflicts
 */
export class ParticleBoundaries {
  public readonly object: THREE.Object3D;
  
  // Mutable boundary properties (can be changed at runtime)
  private _gridSize: THREE.Vector3;
  private _wallThickness: number;
  private _wallStiffness: number;
  private _collisionMode: CollisionMode;
  private _restitution: number;
  private _friction: number;
  private _shape: BoundaryShape;
  
  // Visual mesh
  private boundaryMesh: THREE.Mesh | null = null;
  private customMesh: THREE.Mesh | null = null;
  private visualize: boolean;

  // Audio reactivity
  private audioReactive: boolean;
  private audioPulseStrength: number;
  private baseGeometry: {
    radius?: number;
    scale?: THREE.Vector3;
    height?: number;
  } = {};
  private viewportPulse: number = 0;
  
  // Boundary limits (in grid space) - recomputed when gridSize changes
  private _min: THREE.Vector3;
  private _max: THREE.Vector3;
  
  // Coordinate transform constants (for internal conversions)
  private readonly GRID_TO_WORLD_SCALE = 1 / 64;
  private readonly GRID_CENTER_OFFSET = 32;
  private readonly Z_COMPRESSION = 0.4;
  
  // Enable/disable state
  private enabled: boolean = false;
  
  constructor(config: BoundaryConfig = {}) {
    const {
      shape = BoundaryShape.SPHERE,
      gridSize = new THREE.Vector3(64, 64, 64),
      wallThickness = 3,
      wallStiffness = 0.3,
      collisionMode = CollisionMode.REFLECT,
      restitution = 0.3,
      friction = 0.1,
      visualize = true,
      customMesh = null,
      audioReactive = false,
      audioPulseStrength = 0.15,
    } = config;
    
    // Create object container (no transforms - meshes handle their own positioning)
    this.object = new THREE.Object3D();
    this.object.name = 'ParticleBoundaries';
    
    // Initialize properties
    this._shape = shape;
    this._gridSize = gridSize.clone();
    this._wallThickness = wallThickness;
    this._wallStiffness = wallStiffness;
    this._collisionMode = collisionMode;
    this._restitution = restitution;
    this._friction = friction;
    this.visualize = visualize;
    this.customMesh = customMesh;
    this.audioReactive = audioReactive;
    this.audioPulseStrength = audioPulseStrength;
    
    // Calculate boundary limits (in grid space)
    this._min = new THREE.Vector3(wallThickness, wallThickness, wallThickness);
    this._max = this._gridSize.clone().subScalar(wallThickness);
    
    // Store base geometry data
    this.updateBaseGeometry();
  }
  
  // Getters for readonly-like access
  public get gridSize(): THREE.Vector3 { return this._gridSize; }
  public get wallThickness(): number { return this._wallThickness; }
  public get wallStiffness(): number { return this._wallStiffness; }
  public get collisionMode(): CollisionMode { return this._collisionMode; }
  public get restitution(): number { return this._restitution; }
  public get friction(): number { return this._friction; }
  public get shape(): BoundaryShape { return this._shape; }
  public get min(): THREE.Vector3 { return this._min; }
  public get max(): THREE.Vector3 { return this._max; }
  
  /**
   * Update base geometry data for audio reactivity reference
   */
  private updateBaseGeometry(): void {
    const minDim = Math.min(this._gridSize.x, this._gridSize.y, this._gridSize.z);
    this.baseGeometry.radius = minDim / 2 - this._wallThickness;
    this.baseGeometry.scale = new THREE.Vector3(1, 1, 1);
    this.baseGeometry.height = this._gridSize.z - this._wallThickness * 2;
  }
  
  /**
   * Get grid center position (in grid space)
   */
  private getGridCenter(): THREE.Vector3 {
    return this._gridSize.clone().multiplyScalar(0.5);
  }
  
  /**
   * Get boundary radius (in grid space)
   */
  private getBoundaryRadius(): number {
    return Math.min(this._gridSize.x, this._gridSize.y, this._gridSize.z) / 2 - this._wallThickness;
  }
  
  /**
   * Convert grid space position to world space position
   * This is the key transformation that ensures alignment
   */
  private gridToWorld(gridPos: THREE.Vector3): THREE.Vector3 {
    return new THREE.Vector3(
      (gridPos.x - this.GRID_CENTER_OFFSET) * this.GRID_TO_WORLD_SCALE,
      gridPos.y * this.GRID_TO_WORLD_SCALE,
      gridPos.z * this.GRID_TO_WORLD_SCALE * this.Z_COMPRESSION
    );
  }
  
  /**
   * Get world space scale for boundary meshes
   */
  private getWorldScale(): THREE.Vector3 {
    return new THREE.Vector3(
      this.GRID_TO_WORLD_SCALE,
      this.GRID_TO_WORLD_SCALE,
      this.GRID_TO_WORLD_SCALE
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
        break;
      case BoundaryShape.SPHERE:
        await this.createSphereBoundary();
        break;
      case BoundaryShape.TUBE:
        await this.createTubeBoundary();
        break;
      case BoundaryShape.DODECAHEDRON:
        await this.createDodecahedronBoundary();
        break;
      case BoundaryShape.CUSTOM:
        if (this.customMesh) {
          this.boundaryMesh = this.customMesh;
          this.object.add(this.boundaryMesh);
        }
        break;
    }
  }
  
  /**
   * Create box boundary mesh in proper world space
   * Self-contained positioning - no parent transforms needed
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
    const [normalMap, aoMap, map, roughnessMap] = await Promise.all([
      loadTexture(normalMapFile, THREE.LinearSRGBColorSpace),
      loadTexture(aoMapFile, THREE.LinearSRGBColorSpace),
      loadTexture(colorMapFile, THREE.SRGBColorSpace),
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
    this.boundaryMesh.name = 'BoundaryBox';
    
    // Position in world space (grid center converted to world)
    const gridCenter = this.getGridCenter();
    const worldCenter = this.gridToWorld(gridCenter);
    this.boundaryMesh.position.copy(worldCenter);
    
    // Scale: grid dimensions to world dimensions
    const worldScale = this.getWorldScale();
    this.boundaryMesh.scale.set(
      this._gridSize.x * worldScale.x,
      this._gridSize.y * worldScale.y,
      this._gridSize.z * worldScale.z
    );
    
    // Store base geometry for audio reactivity
    this.baseGeometry.scale = this.boundaryMesh.scale.clone();
    
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
   * Create sphere boundary mesh with glass material in proper world space
   */
  private async createSphereBoundary(): Promise<void> {
    // Calculate radius in grid space then convert to world space
    const gridRadius = this.getBoundaryRadius();
    const worldRadius = gridRadius * this.GRID_TO_WORLD_SCALE;
    
    const geometry = new THREE.SphereGeometry(worldRadius, 64, 64);
    const material = this.createGlassMaterial();
    
    this.boundaryMesh = new THREE.Mesh(geometry, material);
    this.boundaryMesh.name = 'BoundarySphere';
    
    // Position at grid center converted to world space
    const gridCenter = this.getGridCenter();
    const worldCenter = this.gridToWorld(gridCenter);
    this.boundaryMesh.position.copy(worldCenter);
    
    // Store base geometry for audio reactivity
    this.baseGeometry.radius = worldRadius;
    this.baseGeometry.scale = new THREE.Vector3(1, 1, 1);
    
    this.boundaryMesh.castShadow = false;
    this.boundaryMesh.receiveShadow = true;
    
    this.object.add(this.boundaryMesh);
  }
  
  /**
   * Create tube (cylinder) boundary mesh with glass material in proper world space
   */
  private async createTubeBoundary(): Promise<void> {
    // Calculate dimensions in grid space then convert to world space
    const gridRadiusXY = Math.min(this._gridSize.x, this._gridSize.y) / 2 - this._wallThickness;
    const gridHeight = this._gridSize.z - this._wallThickness * 2;
    
    const worldRadiusXY = gridRadiusXY * this.GRID_TO_WORLD_SCALE;
    const worldHeight = gridHeight * this.GRID_TO_WORLD_SCALE * this.Z_COMPRESSION;
    
    const geometry = new THREE.CylinderGeometry(worldRadiusXY, worldRadiusXY, worldHeight, 64, 1, false);
    const material = this.createGlassMaterial();
    
    this.boundaryMesh = new THREE.Mesh(geometry, material);
    this.boundaryMesh.rotation.set(0, 0, 0);
    this.boundaryMesh.name = 'BoundaryTube';
    
    // Position at grid center converted to world space
    const gridCenter = this.getGridCenter();
    const worldCenter = this.gridToWorld(gridCenter);
    this.boundaryMesh.position.copy(worldCenter);
    
    // Store base geometry for audio reactivity
    this.baseGeometry.radius = worldRadiusXY;
    this.baseGeometry.height = worldHeight;
    this.baseGeometry.scale = new THREE.Vector3(1, 1, 1);
    
    this.boundaryMesh.castShadow = false;
    this.boundaryMesh.receiveShadow = true;
    
    this.object.add(this.boundaryMesh);
  }
  
  /**
   * Create dodecahedron boundary mesh with glass material in proper world space
   */
  private async createDodecahedronBoundary(): Promise<void> {
    // Calculate radius in grid space then convert to world space
    const gridRadius = this.getBoundaryRadius();
    const worldRadius = gridRadius * this.GRID_TO_WORLD_SCALE;
    
    const geometry = new THREE.DodecahedronGeometry(worldRadius, 0);
    const material = this.createGlassMaterial();
    
    this.boundaryMesh = new THREE.Mesh(geometry, material);
    this.boundaryMesh.name = 'BoundaryDodecahedron';
    
    // Position at grid center converted to world space
    const gridCenter = this.getGridCenter();
    const worldCenter = this.gridToWorld(gridCenter);
    this.boundaryMesh.position.copy(worldCenter);
    
    // Store base geometry for audio reactivity
    this.baseGeometry.radius = worldRadius;
    this.baseGeometry.scale = new THREE.Vector3(1, 1, 1);
    
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
   * Returns all necessary data for collision computation
   */
  public getBoundaryUniforms() {
    return {
      enabled: this.enabled,
      shape: this._shape,
      shapeInt: this.getShapeAsInt(),
      wallMin: this._min,
      wallMax: this._max,
      wallStiffness: this._wallStiffness,
      wallThickness: this._wallThickness,
      restitution: this._restitution,
      friction: this._friction,
      collisionMode: this._collisionMode,
      gridCenter: this._gridSize.clone().multiplyScalar(0.5),
      boundaryRadius: Math.min(this._gridSize.x, this._gridSize.y, this._gridSize.z) / 2 - this._wallThickness,
      viewportPulse: this.viewportPulse,
    };
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
    }
  ): void {
    const xN = particlePosition.add(particleVelocity.mul(uniforms.dt).mul(3.0));

    // === VIEWPORT MODE (NONE or disabled) ===
    // Particles use gridSize (viewport space) as boundaries
    // This keeps particles visible on page and adapts to page size
    If(uniforms.boundaryEnabled.equal(int(0)), () => {
      const pulse = uniforms.viewportPulse.clamp(0, 1);
      const expansionAmount = pulse.mul(6.0);
      const expansion = vec3(expansionAmount, expansionAmount, expansionAmount);
      const viewportMin = vec3(1, 1, 1).sub(expansion);
      const viewportMax = uniforms.gridSize.sub(1).add(expansion);
      const softStiffness = float(0.08).add(pulse.mul(0.12));  // Gentle base + audio boost

      // Soft viewport boundaries (keeps particles visible)
      If(xN.x.lessThan(viewportMin.x), () => {
        particleVelocity.x.addAssign(viewportMin.x.sub(xN.x).mul(softStiffness));
      });
      If(xN.x.greaterThan(viewportMax.x), () => { 
        particleVelocity.x.addAssign(viewportMax.x.sub(xN.x).mul(softStiffness)); 
      });
      If(xN.y.lessThan(viewportMin.y), () => { 
        particleVelocity.y.addAssign(viewportMin.y.sub(xN.y).mul(softStiffness)); 
      });
      If(xN.y.greaterThan(viewportMax.y), () => { 
        particleVelocity.y.addAssign(viewportMax.y.sub(xN.y).mul(softStiffness)); 
      });
      If(xN.z.lessThan(viewportMin.z), () => { 
        particleVelocity.z.addAssign(viewportMin.z.sub(xN.z).mul(softStiffness)); 
      });
      If(xN.z.greaterThan(viewportMax.z), () => { 
        particleVelocity.z.addAssign(viewportMax.z.sub(xN.z).mul(softStiffness)); 
      });
      
      // Clamp position to viewport
      particlePosition.assign(particlePosition.clamp(viewportMin, viewportMax));
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
   * Works in grid space for consistency with GPU collision
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
    
    if (this._shape === BoundaryShape.BOX) {
      // Check each axis
      if (nextPos.x < this._min.x) {
        result.collided = true;
        result.normal.set(1, 0, 0);
        result.penetrationDepth = this._min.x - nextPos.x;
      } else if (nextPos.x > this._max.x) {
        result.collided = true;
        result.normal.set(-1, 0, 0);
        result.penetrationDepth = nextPos.x - this._max.x;
      }
      
      if (nextPos.y < this._min.y) {
        result.collided = true;
        result.normal.set(0, 1, 0);
        result.penetrationDepth = Math.max(result.penetrationDepth, this._min.y - nextPos.y);
      } else if (nextPos.y > this._max.y) {
        result.collided = true;
        result.normal.set(0, -1, 0);
        result.penetrationDepth = Math.max(result.penetrationDepth, nextPos.y - this._max.y);
      }
      
      if (nextPos.z < this._min.z) {
        result.collided = true;
        result.normal.set(0, 0, 1);
        result.penetrationDepth = Math.max(result.penetrationDepth, this._min.z - nextPos.z);
      } else if (nextPos.z > this._max.z) {
        result.collided = true;
        result.normal.set(0, 0, -1);
        result.penetrationDepth = Math.max(result.penetrationDepth, nextPos.z - this._max.z);
      }
    } else if (this._shape === BoundaryShape.SPHERE || this._shape === BoundaryShape.DODECAHEDRON) {
      // Sphere and dodecahedron use same collision logic (spherical approximation)
      const center = this._gridSize.clone().multiplyScalar(0.5);
      const radius = Math.min(this._gridSize.x, this._gridSize.y, this._gridSize.z) / 2 - this._wallThickness;
      const offset = nextPos.clone().sub(center);
      const dist = offset.length();
      
      if (dist > radius) {
        result.collided = true;
        result.normal.copy(offset).normalize();
        result.penetrationDepth = dist - radius;
      }
    } else if (this._shape === BoundaryShape.TUBE) {
      // Tube (cylinder) collision
      const center = this._gridSize.clone().multiplyScalar(0.5);
      const radius = Math.min(this._gridSize.x, this._gridSize.y) / 2 - this._wallThickness;
      const offsetXY = new THREE.Vector2(nextPos.x - center.x, nextPos.y - center.y);
      const distXY = offsetXY.length();
      
      // Radial collision
      if (distXY > radius) {
        result.collided = true;
        result.normal.set(offsetXY.x, offsetXY.y, 0).normalize();
        result.penetrationDepth = distXY - radius;
      }
      
      // Cap collision
      if (nextPos.z < this._min.z) {
        result.collided = true;
        result.normal.set(0, 0, 1);
        result.penetrationDepth = Math.max(result.penetrationDepth, this._min.z - nextPos.z);
      } else if (nextPos.z > this._max.z) {
        result.collided = true;
        result.normal.set(0, 0, -1);
        result.penetrationDepth = Math.max(result.penetrationDepth, nextPos.z - this._max.z);
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
    
    switch (this._collisionMode) {
      case CollisionMode.REFLECT:
        // Reflect velocity with restitution
        const normalVel = velocity.dot(collision.normal);
        velocity.addScaledVector(
          collision.normal,
          -(1 + this._restitution) * normalVel
        );
        break;
        
      case CollisionMode.CLAMP:
        // Stop at boundary
        velocity.addScaledVector(
          collision.normal,
          collision.penetrationDepth * this._wallStiffness
        );
        break;
        
      case CollisionMode.WRAP:
        // Wrap around (teleport to opposite side)
        if (this._shape === BoundaryShape.BOX) {
          if (position.x < this._min.x) position.x = this._max.x;
          if (position.x > this._max.x) position.x = this._min.x;
          if (position.y < this._min.y) position.y = this._max.y;
          if (position.y > this._max.y) position.y = this._min.y;
          if (position.z < this._min.z) position.z = this._max.z;
          if (position.z > this._max.z) position.z = this._min.z;
        }
        break;
        
      case CollisionMode.KILL:
        // Mark for deletion (caller should handle)
        break;
    }
    
    // Apply friction
    if (this._friction > 0 && collision.collided) {
      const tangent = velocity.clone().addScaledVector(
        collision.normal,
        -velocity.dot(collision.normal)
      );
      velocity.addScaledVector(tangent, -this._friction);
    }
    
    // Clamp position to boundary
    position.clamp(this._min, this._max);
  }
  
  /**
   * Update boundary with audio data (for audio-reactive animations)
   * Clean implementation without transform conflicts
   */
  public update(elapsed: number, audioData?: { bass: number; mid: number; treble: number; beatIntensity: number }): void {
    if (!this.audioReactive) {
      this.viewportPulse = THREE.MathUtils.lerp(this.viewportPulse, 0, 0.15);
      return;
    }

    if (!audioData) {
      this.viewportPulse = THREE.MathUtils.lerp(this.viewportPulse, 0, 0.15);
      return;
    }

    if (this._shape === BoundaryShape.NONE) {
      // Viewport mode: pulse the invisible boundaries with audio
      const combinedEnergy =
        audioData.bass * 0.6 +
        audioData.mid * 0.3 +
        audioData.treble * 0.1 +
        audioData.beatIntensity * 0.5;
      const targetPulse = THREE.MathUtils.clamp(combinedEnergy * this.audioPulseStrength, 0, 1);
      this.viewportPulse = THREE.MathUtils.lerp(this.viewportPulse, targetPulse, 0.25);
      return;
    }

    // Container mode: keep viewport pulse at zero
    this.viewportPulse = THREE.MathUtils.lerp(this.viewportPulse, 0, 0.2);

    if (!this.boundaryMesh) return;

    // Audio-reactive pulsing for different shapes
    if (this._shape === BoundaryShape.SPHERE || this._shape === BoundaryShape.DODECAHEDRON) {
      // Uniform scaling for spherical shapes
      const baseScale = this.baseGeometry.scale || new THREE.Vector3(1, 1, 1);
      const pulseAmount = audioData.bass * this.audioPulseStrength;
      const pulseScale = 1.0 + pulseAmount;
      
      this.boundaryMesh.scale.copy(baseScale).multiplyScalar(pulseScale);

      // Beat flash (opacity pulse)
      if (this.boundaryMesh.material instanceof THREE.Material) {
        const material = this.boundaryMesh.material as THREE.MeshPhysicalNodeMaterial;
        const baseOpacity = 0.3;
        const beatFlash = audioData.beatIntensity * 0.2;
        material.opacity = baseOpacity + beatFlash;
      }
    } else if (this._shape === BoundaryShape.TUBE) {
      // Tube: radial pulse + height modulation
      const baseScale = this.baseGeometry.scale || new THREE.Vector3(1, 1, 1);
      const radialPulse = 1.0 + audioData.mid * this.audioPulseStrength;
      const heightPulse = 1.0 + audioData.bass * this.audioPulseStrength * 0.5;
      
      this.boundaryMesh.scale.set(
        baseScale.x * radialPulse,
        baseScale.y * heightPulse,
        baseScale.z * radialPulse
      );

      // Beat flash
      if (this.boundaryMesh.material instanceof THREE.Material) {
        const material = this.boundaryMesh.material as THREE.MeshPhysicalNodeMaterial;
        material.opacity = 0.3 + audioData.beatIntensity * 0.2;
      }
    } else if (this._shape === BoundaryShape.BOX) {
      // Box: subtle uniform pulse + rotation on beat
      const baseScale = this.baseGeometry.scale || new THREE.Vector3(1, 1, 1);
      const avgEnergy = (audioData.bass + audioData.mid + audioData.treble) / 3;
      const pulseAmount = avgEnergy * this.audioPulseStrength * 0.3;
      const pulseScale = 1.0 + pulseAmount;
      
      this.boundaryMesh.scale.copy(baseScale).multiplyScalar(pulseScale);

      // Subtle rotation on strong beats
      if (audioData.beatIntensity > 0.7) {
        this.boundaryMesh.rotation.y += audioData.beatIntensity * 0.01;
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
   * When disabled: Uses viewport/page dimensions as boundaries
   * When enabled: Uses configured boundary shape container
   */
  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.setVisible(enabled);
    if (!enabled) {
      this.viewportPulse = 0;
    }
  }
  
  public isEnabled(): boolean {
    return this.enabled;
  }
  
  /**
   * Change boundary shape dynamically
   * Properly disposes old mesh and creates new one
   */
  public async setShape(newShape: BoundaryShape): Promise<void> {
    if (this._shape === newShape) return;
    
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
    this._shape = newShape;
    
    // Create new mesh if visualizing
    if (this.visualize && newShape !== BoundaryShape.NONE) {
      await this.init();
    }
  }
  
  /**
   * Update wall properties - properly mutable now
   */
  public setWallStiffness(stiffness: number): void {
    this._wallStiffness = stiffness;
  }
  
  public setWallThickness(thickness: number): void {
    this._wallThickness = thickness;
    this._min.set(thickness, thickness, thickness);
    this._max.copy(this._gridSize).subScalar(thickness);
    this.updateBaseGeometry();
  }
  
  public setRestitution(restitution: number): void {
    this._restitution = THREE.MathUtils.clamp(restitution, 0, 1);
  }
  
  public setFriction(friction: number): void {
    this._friction = THREE.MathUtils.clamp(friction, 0, 1);
  }
  
  public setCollisionMode(mode: CollisionMode): void {
    this._collisionMode = mode;
  }
  
  /**
   * Update boundary dimensions (for viewport resize handling)
   * Properly recreates geometry to maintain correct proportions
   */
  public async setGridSize(gridSize: THREE.Vector3): Promise<void> {
    // Update internal grid size
    this._gridSize.copy(gridSize);
    this._min.set(this._wallThickness, this._wallThickness, this._wallThickness);
    this._max.copy(this._gridSize).subScalar(this._wallThickness);
    
    // Update base geometry data
    this.updateBaseGeometry();
    
    // If in viewport mode (NONE) or no mesh, just update bounds
    if (this._shape === BoundaryShape.NONE || !this.boundaryMesh) {
      return;
    }
    
    // For container modes, recreate the mesh with new dimensions
    // This ensures proper proportions without deformation
    const wasVisible = this.boundaryMesh.visible;
    
    // Dispose old mesh
    this.boundaryMesh.geometry.dispose();
    if (this.boundaryMesh.material instanceof THREE.Material) {
      this.boundaryMesh.material.dispose();
    }
    this.object.remove(this.boundaryMesh);
    this.boundaryMesh = null;
    
    // Recreate mesh with new dimensions
    switch (this._shape) {
      case BoundaryShape.BOX:
        await this.createBoxBoundary();
        break;
      case BoundaryShape.SPHERE:
        await this.createSphereBoundary();
        break;
      case BoundaryShape.TUBE:
        await this.createTubeBoundary();
        break;
      case BoundaryShape.DODECAHEDRON:
        await this.createDodecahedronBoundary();
        break;
      case BoundaryShape.CUSTOM:
        if (this.customMesh) {
          this.boundaryMesh = this.customMesh;
          this.object.add(this.boundaryMesh);
        }
        break;
    }
    
    // Restore visibility
    if (this.boundaryMesh) {
      this.boundaryMesh.visible = wasVisible;
    }
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

