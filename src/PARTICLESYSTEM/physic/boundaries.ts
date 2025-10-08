/**
 * PARTICLESYSTEM/PHYSIC/boundaries.ts - Particle container boundaries system
 * Single responsibility: Manage particle container shape, walls, collision detection and visual representation
 * 
 * ✨ NEW: SELF-DEPENDENT & VIEWPORT-AWARE
 * - Automatically tracks viewport dimensions and UI exclusion zones
 * - NONE mode: Particles float freely in center of safe viewport area (no hard boundaries)
 * - Shape modes: Automatically scale and position to fit viewport while avoiding UI
 * - Robust collision system with proper coordinate space handling
 * - No external dependencies on APP.ts resize handlers
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
import { ViewportTracker, type ViewportBounds } from './viewport-tracker';

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
 * ParticleBoundaries - Comprehensive boundary management system
 * ✨ NEW: SELF-DEPENDENT & VIEWPORT-AWARE
 * - Automatically tracks viewport and adapts boundaries
 * - NONE mode: Soft floating boundaries in center of safe viewport
 * - Shape modes: Auto-scales and positions to avoid UI clipping
 * - Robust collision detection with proper coordinate handling
 */
export class ParticleBoundaries {
  public readonly object: THREE.Object3D;
  public readonly shape: BoundaryShape;
  public readonly wallThickness: number;
  public readonly wallStiffness: number;
  public readonly collisionMode: CollisionMode;
  public readonly restitution: number;
  public readonly friction: number;
  
  private boundaryMesh: THREE.Mesh | null = null;
  private customMesh: THREE.Mesh | null = null;
  private visualize: boolean;

  // Audio reactivity
  private audioReactive: boolean;
  private audioPulseStrength: number;
  private baseRadius: number = 0;  // Store base radius for pulsing
  private baseScale: THREE.Vector3 = new THREE.Vector3(1, 1, 1);
  private viewportPulse: number = 0;  // Audio-driven viewport expansion when shape = NONE
  
  // ✨ NEW: Self-dependent viewport tracking
  private viewportTracker: ViewportTracker;
  private currentBounds: ViewportBounds;
  
  // Dynamic boundary limits (updated from viewport tracker)
  public min: THREE.Vector3 = new THREE.Vector3();
  public max: THREE.Vector3 = new THREE.Vector3();
  public gridSize: THREE.Vector3 = new THREE.Vector3();
  public gridCenter: THREE.Vector3 = new THREE.Vector3();
  
  // Boundary enabled state (NONE mode = disabled/viewport mode, others = enabled)
  private enabled: boolean = false;
  
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
    } = config;
    
    this.object = new THREE.Object3D();
    this.shape = shape;
    this.wallThickness = wallThickness;
    this.wallStiffness = wallStiffness;
    this.collisionMode = collisionMode;
    this.restitution = restitution;
    this.friction = friction;
    this.visualize = visualize;
    this.customMesh = customMesh;
    this.audioReactive = audioReactive;
    this.audioPulseStrength = audioPulseStrength;
    
    // ✨ NEW: Initialize viewport tracker with base grid size
    this.viewportTracker = new ViewportTracker({
      baseGridSize: gridSize,
      minGridMargin: wallThickness,
      uiMargin: 16,
    });
    
    // Get initial bounds
    this.currentBounds = this.viewportTracker.getBounds();
    this.updateBoundaryLimits();
    
    // Subscribe to viewport updates
    this.viewportTracker.onUpdate((bounds) => {
      this.currentBounds = bounds;
      this.updateBoundaryLimits();
      this.updateMeshTransform();
    });
    
    // Set enabled state based on shape
    this.enabled = shape !== BoundaryShape.NONE;
  }
  
  /**
   * ✨ NEW: Update boundary limits from viewport tracker
   * Called automatically when viewport changes
   */
  private updateBoundaryLimits(): void {
    const { grid, safe } = this.currentBounds;
    
    // Update grid size
    this.gridSize.set(grid.width, grid.height, grid.depth);
    this.gridCenter.copy(grid.center);
    
    // Calculate boundary limits (with wall thickness margin)
    this.min.set(
      this.wallThickness,
      this.wallThickness,
      this.wallThickness
    );
    this.max.set(
      this.gridSize.x - this.wallThickness,
      this.gridSize.y - this.wallThickness,
      this.gridSize.z - this.wallThickness
    );
    
    // ✨ FIX: Calculate radius based on SAFE ZONE (viewport minus UI panels)
    // This prevents sphere from clipping with UI elements
    const safeWidthGrid = (safe.width / window.innerWidth) * this.gridSize.x;
    const safeHeightGrid = (safe.height / window.innerHeight) * this.gridSize.y;
    
    // Use smallest dimension of safe zone, with extra margin for UI panels
    const safeDimension = Math.min(safeWidthGrid, safeHeightGrid, this.gridSize.z);
    this.baseRadius = (safeDimension / 2) - this.wallThickness - 5;  // Extra 5-unit margin for safety
  }
  
  /**
   * ✨ NEW: Update mesh transform to match current viewport
   * Called automatically when viewport changes
   */
  private updateMeshTransform(): void {
    if (!this.boundaryMesh) return;
    
    const { grid, safe, screen } = this.currentBounds;
    
    // ✨ FIX: Position sphere in center of SAFE ZONE (not grid center)
    // This ensures sphere is centered in available space (viewport minus UI)
    const safeCenterX = ((safe.centerX / screen.width) * grid.width);
    const safeCenterY = ((safe.centerY / screen.height) * grid.height);
    const safeCenterGrid = new THREE.Vector3(safeCenterX, safeCenterY, grid.center.z);
    
    const worldCenter = this.viewportTracker.gridToWorld(safeCenterGrid);
    this.boundaryMesh.position.copy(worldCenter);
    
    // For procedural shapes (sphere, tube, dodecahedron), scale to fit safe zone
    if (this.shape === BoundaryShape.SPHERE || 
        this.shape === BoundaryShape.TUBE || 
        this.shape === BoundaryShape.DODECAHEDRON) {
      const radius = this.baseRadius / 64;  // Convert grid units to world units
      const scaleFactor = radius / this.baseScale.x;  // Maintain original proportions
      this.boundaryMesh.scale.setScalar(scaleFactor);
    }
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
   * ✨ NEW: Manually refresh viewport tracking
   * Call this after UI panels are created/modified
   */
  public refreshViewport(): void {
    this.viewportTracker.recalculateBounds();
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
   * ✨ NEW: Uses normalized radius (1.0) and scales via transform
   * ✨ FIX: Positioned and sized for safe zone (viewport minus UI)
   */
  private async createSphereBoundary(): Promise<void> {
    // Create unit sphere (radius = 1.0)
    const geometry = new THREE.SphereGeometry(1.0, 64, 64);
    const material = this.createGlassMaterial();
    
    this.boundaryMesh = new THREE.Mesh(geometry, material);
    
    // Store base scale (will be adjusted by updateMeshTransform)
    this.baseScale.setScalar(1.0);
    
    // Initial position and scale (updateMeshTransform will position it correctly)
    this.updateMeshTransform();  // Use safe zone positioning
    
    this.boundaryMesh.castShadow = false;
    this.boundaryMesh.receiveShadow = true;
    
    this.object.add(this.boundaryMesh);
  }
  
  /**
   * Create tube (cylinder) boundary mesh with glass material
   * ✨ NEW: Uses normalized dimensions and scales via transform
   * ✨ FIX: Positioned and sized for safe zone
   */
  private async createTubeBoundary(): Promise<void> {
    // Create unit cylinder (radius = 1.0, height = 1.0)
    const geometry = new THREE.CylinderGeometry(1.0, 1.0, 1.0, 64, 1, false);
    const material = this.createGlassMaterial();
    
    this.boundaryMesh = new THREE.Mesh(geometry, material);
    this.boundaryMesh.rotation.set(0, 0, 0);
    
    // Store base scale
    this.baseScale.setScalar(1.0);
    
    // Initial position and scale (updateMeshTransform will position it correctly)
    this.updateMeshTransform();  // Use safe zone positioning
    
    this.boundaryMesh.castShadow = false;
    this.boundaryMesh.receiveShadow = true;
    
    this.object.add(this.boundaryMesh);
  }
  
  /**
   * Create dodecahedron boundary mesh with glass material
   * ✨ NEW: Uses normalized radius and scales via transform
   * ✨ FIX: Positioned and sized for safe zone
   */
  private async createDodecahedronBoundary(): Promise<void> {
    // Create unit dodecahedron (radius = 1.0)
    const geometry = new THREE.DodecahedronGeometry(1.0, 0);
    const material = this.createGlassMaterial();
    
    this.boundaryMesh = new THREE.Mesh(geometry, material);
    
    // Store base scale
    this.baseScale.setScalar(1.0);
    
    // Initial position and scale (updateMeshTransform will position it correctly)
    this.updateMeshTransform();  // Use safe zone positioning
    
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
    };
  }
  
  /**
   * Generate TSL collision code for GPU compute shader
   * This is the COMPLETE collision logic for all boundary shapes
   * Call this inside the particle update kernel
   * 
   * ✨ NEW: IMPROVED COLLISION SYSTEM
   * - NONE mode: Soft radial containment - particles float near viewport center
   * - Shape modes: Proper collision with adaptive scaling
   * - Better coordinate space handling
   * - Smooth, natural physics
   * 
   * SHAPE MODES:
   * - NONE (boundaryEnabled = 0): Soft radial containment in viewport center
   * - BOX (shape = 0): Box container with loaded model
   * - SPHERE (shape = 1): Spherical glass container
   * - TUBE (shape = 2): Cylindrical glass tube container
   * - DODECAHEDRON (shape = 3): Dodecahedron glass container (approximated as sphere)
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

    // === VIEWPORT MODE (NONE / disabled) ===
    // ✨ NEW: Soft radial containment - particles float near center
    // No hard boundaries, just gentle forces that keep particles visible
    // Adapts to viewport size automatically
    If(uniforms.boundaryEnabled.equal(int(0)), () => {
      const center = uniforms.boundaryCenter;
      const offset = xN.sub(center);
      const dist = offset.length();
      
      // Soft radial boundary (very gentle, increases with distance from center)
      const pulse = uniforms.viewportPulse.clamp(0, 1);
      const safeRadius = uniforms.boundaryRadius.mul(float(0.95)).add(pulse.mul(uniforms.boundaryRadius.mul(0.15)));
      const softZone = uniforms.boundaryRadius.mul(0.7);  // Start soft containment at 70% of radius
      
      // Gentle radial force that increases smoothly with distance
      If(dist.greaterThan(softZone), () => {
        const overshoot = dist.sub(softZone);
        const maxOvershoot = safeRadius.sub(softZone);
        const forceFactor = overshoot.div(maxOvershoot).clamp(0, 1);
        const softStiffness = float(0.04).add(pulse.mul(0.08)).add(forceFactor.mul(0.12));  // Very gentle base, increases with distance
        
        const pushDir = offset.normalize();
        const pushForce = pushDir.mul(overshoot).mul(softStiffness);
        particleVelocity.subAssign(pushForce);
      });
      
      // Very soft clamp (only at extreme edges, prevents particles from completely leaving)
      const hardEdge = safeRadius.mul(1.05);
      const currentOffset = particlePosition.sub(center);
      const currentDist = currentOffset.length();
      If(currentDist.greaterThan(hardEdge), () => {
        particlePosition.assign(center.add(currentOffset.normalize().mul(hardEdge)));
      });
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
    
    // Clamp position to boundary
    position.clamp(this.min, this.max);
  }
  
  /**
   * Update boundary with audio data (for audio-reactive animations)
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

    if (this.shape === BoundaryShape.NONE) {
      // In viewport mode we do not have a mesh to animate. Instead we feed an
      // audio-driven pulse back into the physics uniforms so the invisible
      // viewport boundary expands and contracts with the beat. This prevents
      // particles from drifting out of view when sound reactivity is enabled.
      const combinedEnergy =
        audioData.bass * 0.6 +
        audioData.mid * 0.3 +
        audioData.treble * 0.1 +
        audioData.beatIntensity * 0.5;
      const targetPulse = THREE.MathUtils.clamp(combinedEnergy * this.audioPulseStrength, 0, 1);
      this.viewportPulse = THREE.MathUtils.lerp(this.viewportPulse, targetPulse, 0.25);
      return;
    }

    // For visible meshes we keep the viewport pulse relaxed to avoid bleeding
    // into the viewport uniform logic.
    this.viewportPulse = THREE.MathUtils.lerp(this.viewportPulse, 0, 0.2);

    if (!this.boundaryMesh) return;

    // Audio-reactive pulsing for glass containers
    if (this.shape === BoundaryShape.SPHERE || this.shape === BoundaryShape.DODECAHEDRON) {
      // Pulse scale based on bass
      const pulseScale = 1.0 + audioData.bass * this.audioPulseStrength;
      this.boundaryMesh.scale.setScalar(pulseScale);

      // Beat flash (opacity pulse)
      if (this.boundaryMesh.material instanceof THREE.Material) {
        const material = this.boundaryMesh.material as THREE.MeshPhysicalNodeMaterial;
        const baseOpacity = 0.3;
        const beatFlash = audioData.beatIntensity * 0.2;
        material.opacity = baseOpacity + beatFlash;
      }
    } else if (this.shape === BoundaryShape.TUBE) {
      // Tube: radial pulse + height modulation
      const radialPulse = 1.0 + audioData.mid * this.audioPulseStrength;
      const heightPulse = 1.0 + audioData.bass * this.audioPulseStrength * 0.5;
      this.boundaryMesh.scale.set(radialPulse, heightPulse, radialPulse);

      // Beat flash
      if (this.boundaryMesh.material instanceof THREE.Material) {
        const material = this.boundaryMesh.material as THREE.MeshPhysicalNodeMaterial;
        material.opacity = 0.3 + audioData.beatIntensity * 0.2;
      }
    } else if (this.shape === BoundaryShape.BOX) {
      // Box: subtle pulse + rotation on beat
      const pulseScale = 1.0 + (audioData.bass + audioData.mid + audioData.treble) / 3 * this.audioPulseStrength * 0.3;
      this.boundaryMesh.scale.setScalar(pulseScale);

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
   * When disabled:
   * - Uses viewport/page dimensions as boundaries
   * - Visual mesh hidden
   * - Particles adapt to page size automatically
   * - Particles stay visible on page
   * When enabled:
   * - Uses configured boundary shape (Box/Sphere/Cylinder)
   * - Visual mesh shown
   */
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
   * ✨ NEW: No longer needed - viewport tracker handles this automatically
   * Kept for backward compatibility but does nothing
   * @deprecated Use viewport tracker automatic updates instead
   */
  public setGridSize(gridSize: THREE.Vector3): void {
    // No-op: viewport tracker handles grid size automatically
    // This method is kept for backward compatibility with existing code
    console.warn('⚠️ setGridSize() is deprecated and no longer needed. Boundaries update automatically via ViewportTracker.');
  }
  
  /**
   * ✨ NEW: Get current viewport bounds
   */
  public getViewportBounds(): ViewportBounds {
    return this.currentBounds;
  }
  
  /**
   * Dispose resources
   * ✨ NEW: Also disposes viewport tracker
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
    
    // Dispose viewport tracker
    this.viewportTracker.dispose();
  }
}

