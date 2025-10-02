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
  
  // Boundary limits (in grid space)
  public readonly min: THREE.Vector3;
  public readonly max: THREE.Vector3;
  
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
    
    // Calculate boundary limits
    this.min = new THREE.Vector3(wallThickness, wallThickness, wallThickness);
    this.max = this.gridSize.clone().subScalar(wallThickness);
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
    // Grid space (64x64x64) → World space with same transform as particles
    const s = 1 / 64;
    this.boundaryMesh.position.set(0, 0, 0);  // Centered in grid space
    this.boundaryMesh.scale.set(1, 1, 1);     // Already sized correctly
    
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
    const radius = (Math.min(this.gridSize.x, this.gridSize.y, this.gridSize.z) / 2 - this.wallThickness) / 64;
    
    const geometry = new THREE.SphereGeometry(radius, 64, 64);
    const material = this.createGlassMaterial();
    
    this.boundaryMesh = new THREE.Mesh(geometry, material);
    
    // Position at grid center in world space
    const s = 1 / 64;
    this.boundaryMesh.position.set(
      (gridCenter.x - 32) * s,
      gridCenter.y * s,
      gridCenter.z * s * 0.4
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
    const radiusX = (Math.min(this.gridSize.x, this.gridSize.y) / 2 - this.wallThickness) / 64;
    const height = (this.gridSize.z - this.wallThickness * 2) / 64 * 0.4;  // Z compression
    
    const geometry = new THREE.CylinderGeometry(radiusX, radiusX, height, 64, 1, false);
    const material = this.createGlassMaterial();
    
    this.boundaryMesh = new THREE.Mesh(geometry, material);
    this.boundaryMesh.rotation.set(0, 0, 0);
    
    // Position at grid center in world space
    const s = 1 / 64;
    this.boundaryMesh.position.set(
      (gridCenter.x - 32) * s,
      gridCenter.y * s,
      gridCenter.z * s * 0.4
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
    const radius = (Math.min(this.gridSize.x, this.gridSize.y, this.gridSize.z) / 2 - this.wallThickness) / 64;
    
    const geometry = new THREE.DodecahedronGeometry(radius, 0);
    const material = this.createGlassMaterial();
    
    this.boundaryMesh = new THREE.Mesh(geometry, material);
    
    // Position at grid center in world space
    const s = 1 / 64;
    this.boundaryMesh.position.set(
      (gridCenter.x - 32) * s,
      gridCenter.y * s,
      gridCenter.z * s * 0.4
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
    }
  ): void {
    const xN = particlePosition.add(particleVelocity.mul(uniforms.dt).mul(3.0)).toConst("xN");
    
    // === VIEWPORT MODE (NONE or disabled) ===
    // Particles use gridSize (viewport space) as boundaries
    // This keeps particles visible on page and adapts to page size
    If(uniforms.boundaryEnabled.equal(int(0)), () => {
      const viewportMin = vec3(2, 2, 2).toConst("viewportMin");
      const viewportMax = uniforms.gridSize.sub(2).toConst("viewportMax");
      const softStiffness = float(0.2);  // Softer collision for viewport
      
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
      const xN = particlePosition.add(particleVelocity.mul(uniforms.dt).mul(3.0)).toConst("xN");
      
      // === BOX CONTAINER (shape = 0) ===
      If(uniforms.boundaryShape.equal(int(0)), () => {
        const wallMin = uniforms.boundaryWallMin.toConst("wallMin");
        const wallMax = uniforms.boundaryWallMax.toConst("wallMax");
        const wallStiffness = uniforms.boundaryWallStiffness;
        
        // Six-sided box collision
        If(xN.x.lessThan(wallMin.x), () => { 
          particleVelocity.x.addAssign(wallMin.x.sub(xN.x).mul(wallStiffness)); 
        });
        If(xN.x.greaterThan(wallMax.x), () => { 
          particleVelocity.x.addAssign(wallMax.x.sub(xN.x).mul(wallStiffness)); 
        });
        If(xN.y.lessThan(wallMin.y), () => { 
          particleVelocity.y.addAssign(wallMin.y.sub(xN.y).mul(wallStiffness)); 
        });
        If(xN.y.greaterThan(wallMax.y), () => { 
          particleVelocity.y.addAssign(wallMax.y.sub(xN.y).mul(wallStiffness)); 
        });
        If(xN.z.lessThan(wallMin.z), () => { 
          particleVelocity.z.addAssign(wallMin.z.sub(xN.z).mul(wallStiffness)); 
        });
        If(xN.z.greaterThan(wallMax.z), () => { 
          particleVelocity.z.addAssign(wallMax.z.sub(xN.z).mul(wallStiffness)); 
        });
        
        // Clamp position to box boundaries
        particlePosition.assign(particlePosition.clamp(wallMin, wallMax));
      });
      
      // === SPHERE CONTAINER (shape = 1) ===
      If(uniforms.boundaryShape.equal(int(1)), () => {
        const center = uniforms.boundaryCenter.toConst("center");
        const radius = uniforms.boundaryRadius.toConst("radius");
        const wallStiffness = uniforms.boundaryWallStiffness;
        
        // Radial distance-based collision
        const offset = xN.sub(center).toConst("offset");
        const dist = offset.length().toConst("dist");
        
        If(dist.greaterThan(radius), () => {
          const normal = offset.normalize().toConst("normal");
          const penetration = dist.sub(radius).toConst("penetration");
          particleVelocity.subAssign(normal.mul(penetration).mul(wallStiffness));
        });
        
        // Clamp position to sphere
        const currentOffset = particlePosition.sub(center);
        const currentDist = currentOffset.length();
        If(currentDist.greaterThan(radius), () => {
          particlePosition.assign(center.add(currentOffset.normalize().mul(radius)));
        });
      });
      
      // === TUBE CONTAINER (shape = 2) ===
      If(uniforms.boundaryShape.equal(int(2)), () => {
        const center = uniforms.boundaryCenter.toConst("center");
        const radius = uniforms.boundaryRadius.toConst("radius");
        const wallMin = uniforms.boundaryWallMin.toConst("wallMin");
        const wallMax = uniforms.boundaryWallMax.toConst("wallMax");
        const wallStiffness = uniforms.boundaryWallStiffness;
        
        // Radial collision on XY plane
        const offsetXY = vec3(xN.x.sub(center.x), xN.y.sub(center.y), 0).toConst("offsetXY");
        const distXY = offsetXY.length().toConst("distXY");
        
        If(distXY.greaterThan(radius), () => {
          const normalXY = offsetXY.normalize().toConst("normalXY");
          const penetration = distXY.sub(radius).toConst("penetration");
          particleVelocity.x.subAssign(normalXY.x.mul(penetration).mul(wallStiffness));
          particleVelocity.y.subAssign(normalXY.y.mul(penetration).mul(wallStiffness));
        });
        
        // Z-axis collision (tube caps)
        If(xN.z.lessThan(wallMin.z), () => { 
          particleVelocity.z.addAssign(wallMin.z.sub(xN.z).mul(wallStiffness)); 
        });
        If(xN.z.greaterThan(wallMax.z), () => { 
          particleVelocity.z.addAssign(wallMax.z.sub(xN.z).mul(wallStiffness)); 
        });
        
        // Clamp position to tube
        const currentOffsetXY = vec3(particlePosition.x.sub(center.x), particlePosition.y.sub(center.y), 0);
        const currentDistXY = currentOffsetXY.length();
        If(currentDistXY.greaterThan(radius), () => {
          const clampedXY = currentOffsetXY.normalize().mul(radius);
          particlePosition.x.assign(center.x.add(clampedXY.x));
          particlePosition.y.assign(center.y.add(clampedXY.y));
        });
        particlePosition.z.assign(particlePosition.z.clamp(wallMin.z, wallMax.z));
      });
      
      // === DODECAHEDRON CONTAINER (shape = 3) ===
      // Approximated as spherical collision for GPU efficiency
      If(uniforms.boundaryShape.equal(int(3)), () => {
        const center = uniforms.boundaryCenter.toConst("center");
        const radius = uniforms.boundaryRadius.toConst("radius");
        const wallStiffness = uniforms.boundaryWallStiffness;
        
        // Radial distance-based collision (same as sphere)
        const offset = xN.sub(center).toConst("offset");
        const dist = offset.length().toConst("dist");
        
        If(dist.greaterThan(radius), () => {
          const normal = offset.normalize().toConst("normal");
          const penetration = dist.sub(radius).toConst("penetration");
          particleVelocity.subAssign(normal.mul(penetration).mul(wallStiffness));
        });
        
        // Clamp position to dodecahedron (spherical approximation)
        const currentOffset = particlePosition.sub(center);
        const currentDist = currentOffset.length();
        If(currentDist.greaterThan(radius), () => {
          particlePosition.assign(center.add(currentOffset.normalize().mul(radius)));
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
    
    // Clamp position to boundary
    position.clamp(this.min, this.max);
  }
  
  /**
   * Update boundary (for dynamic boundaries)
   */
  public update(elapsed: number): void {
    // Reserved for animated/dynamic boundaries
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

