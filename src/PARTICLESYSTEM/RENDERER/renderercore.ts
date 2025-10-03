/**
 * PARTICLESYSTEM/RENDERER/renderercore.ts - Unified renderer management system
 * Single responsibility: Central renderer coordination and mode switching
 */

import * as THREE from "three/webgpu";
import type { MlsMpmSimulator } from '../physic/mls-mpm';
import { MeshRenderer, type MeshRendererConfig } from './meshrenderer';
import { PointRenderer } from './pointrenderer';
import { SpriteRenderer, type SpriteRendererConfig } from './spriterenderer';
import { TrailRenderer, type TrailRendererConfig } from './trailrenderer';

/**
 * Particle rendering modes
 */
export enum ParticleRenderMode {
  POINT = 0,           // Simple points (best performance)
  SPRITE = 1,          // Textured billboards
  MESH = 2,            // Instanced 3D geometry (current default)
  MESH_CUSTOM = 3,     // Custom imported geometry
  TRAIL = 4,           // Motion trails
  RIBBON = 5,          // Connected ribbons
  GLOW = 6,            // Volumetric glow spheres
  METABALL = 7,        // Marching cubes metaballs (advanced)
  PROCEDURAL = 8,      // Procedural shapes (hexagons, stars, etc.)
}

/**
 * Quality presets for rendering
 */
export enum RenderQuality {
  LOW = 0,
  MEDIUM = 1,
  HIGH = 2,
  ULTRA = 3,
}

/**
 * Base renderer interface - all renderers must implement this
 */
export interface IParticleRenderer {
  readonly object: THREE.Object3D;
  update(particleCount: number, size?: number): void;
  dispose(): void;
}

/**
 * Renderer configuration
 */
export interface RendererConfig {
  mode: ParticleRenderMode;
  quality: RenderQuality;
  lodEnabled: boolean;
  sortingEnabled: boolean;
  cullingEnabled: boolean;
  maxParticles: number;
  
  // Mesh-specific
  meshConfig?: MeshRendererConfig;
  
  // Sprite-specific
  spriteConfig?: {
    billboardMode: 'camera' | 'velocity' | 'axis';
    textureAtlas?: string;
    atlasSize?: number;
    softParticles?: boolean;
    blendMode?: 'alpha' | 'additive' | 'multiply';
  };
  
  // Trail-specific
  trailConfig?: {
    length: number;
    widthFalloff: number;
    alphaFalloff: number;
  };
}

/**
 * Default renderer configuration
 */
export const DEFAULT_RENDERER_CONFIG: RendererConfig = {
  mode: ParticleRenderMode.MESH,
  quality: RenderQuality.HIGH,
  lodEnabled: false,
  sortingEnabled: false,
  cullingEnabled: false,
  maxParticles: 131000,
  
  meshConfig: {
    metalness: 0.900,
    roughness: 0.50,
  },
  
  spriteConfig: {
    billboardMode: 'camera',
    atlasSize: 1,
    softParticles: true,
    blendMode: 'alpha',
  },
  
  trailConfig: {
    length: 8,
    widthFalloff: 0.5,
    alphaFalloff: 0.7,
  },
};

/**
 * RendererManager - Central renderer coordination
 * Manages multiple renderer types and handles mode switching
 */
export class RendererManager {
  private simulator: MlsMpmSimulator;
  private config: RendererConfig;
  private currentRenderer: IParticleRenderer | null = null;
  private currentMode: ParticleRenderMode;
  
  // Renderer cache (reuse when switching)
  private rendererCache: Map<ParticleRenderMode, IParticleRenderer> = new Map();
  
  constructor(simulator: MlsMpmSimulator, config: Partial<RendererConfig> = {}) {
    this.simulator = simulator;
    this.config = { ...DEFAULT_RENDERER_CONFIG, ...config };
    this.currentMode = this.config.mode;
  }
  
  /**
   * Initialize and get the current renderer
   */
  public getRenderer(): IParticleRenderer {
    if (!this.currentRenderer) {
      this.currentRenderer = this.createRenderer(this.currentMode);
      this.rendererCache.set(this.currentMode, this.currentRenderer);
    }
    return this.currentRenderer;
  }
  
  /**
   * Switch to a different rendering mode
   */
  public switchMode(mode: ParticleRenderMode): THREE.Object3D {
    if (mode === this.currentMode && this.currentRenderer) {
      return this.currentRenderer.object;
    }
    
    // Check cache first
    let renderer = this.rendererCache.get(mode);
    
    // Create new renderer if not cached
    if (!renderer) {
      renderer = this.createRenderer(mode);
      this.rendererCache.set(mode, renderer);
    }
    
    this.currentRenderer = renderer;
    this.currentMode = mode;
    
    return renderer.object;
  }
  
  /**
   * Create a new renderer for the specified mode
   */
  private createRenderer(mode: ParticleRenderMode): IParticleRenderer {
    switch (mode) {
      case ParticleRenderMode.POINT:
        return new PointRenderer(this.simulator);
      
      case ParticleRenderMode.MESH:
        return new MeshRenderer(this.simulator, this.config.meshConfig);
      
      case ParticleRenderMode.SPRITE:
        return new SpriteRenderer(this.simulator, this.config.spriteConfig);
      
      case ParticleRenderMode.TRAIL:
        return new TrailRenderer(this.simulator, this.config.trailConfig);
      
      case ParticleRenderMode.GLOW:
        // Future implementation
        throw new Error('GlowRenderer not yet implemented');
      
      case ParticleRenderMode.MESH_CUSTOM:
        // Future implementation
        throw new Error('CustomMeshRenderer not yet implemented');
      
      case ParticleRenderMode.PROCEDURAL:
        // Future implementation
        throw new Error('ProceduralRenderer not yet implemented');
      
      case ParticleRenderMode.METABALL:
        // Advanced feature
        throw new Error('MetaballRenderer not yet implemented');
      
      case ParticleRenderMode.RIBBON:
        // Future implementation
        throw new Error('RibbonRenderer not yet implemented');
      
      default:
        console.warn(`Unknown render mode ${mode}, falling back to MESH`);
        return new MeshRenderer(this.simulator, this.config.meshConfig);
    }
  }
  
  /**
   * Update current renderer
   */
  public update(particleCount: number, size: number = 1.0): void {
    if (this.currentRenderer) {
      this.currentRenderer.update(particleCount, size);
    }
  }
  
  /**
   * Get current rendering mode
   */
  public getCurrentMode(): ParticleRenderMode {
    return this.currentMode;
  }
  
  /**
   * Get human-readable name for render mode
   */
  public static getModeName(mode: ParticleRenderMode): string {
    const names: Record<ParticleRenderMode, string> = {
      [ParticleRenderMode.POINT]: 'Point Cloud',
      [ParticleRenderMode.MESH]: 'Instanced Mesh',
      [ParticleRenderMode.SPRITE]: 'Billboard Sprites',
      [ParticleRenderMode.TRAIL]: 'Motion Trails',
      [ParticleRenderMode.GLOW]: 'Volumetric Glow',
      [ParticleRenderMode.MESH_CUSTOM]: 'Custom Mesh',
      [ParticleRenderMode.METABALL]: 'Metaballs',
      [ParticleRenderMode.PROCEDURAL]: 'Procedural',
      [ParticleRenderMode.RIBBON]: 'Ribbon Trails',
    };
    return names[mode] || 'Unknown';
  }
  
  /**
   * Update configuration
   */
  public updateConfig(updates: Partial<RendererConfig>): void {
    Object.assign(this.config, updates);
    
    // If mode changed, switch renderer
    if (updates.mode !== undefined && updates.mode !== this.currentMode) {
      this.switchMode(updates.mode);
    }
  }
  
  /**
   * Get current configuration
   */
  public getConfig(): RendererConfig {
    return { ...this.config };
  }
  
  /**
   * Clear renderer cache and dispose all renderers
   */
  public dispose(): void {
    this.rendererCache.forEach(renderer => renderer.dispose());
    this.rendererCache.clear();
    this.currentRenderer = null;
  }
  
  /**
   * Get available render modes
   */
  public static getAvailableModes(): ParticleRenderMode[] {
    return [
      ParticleRenderMode.POINT,
      ParticleRenderMode.MESH,
      ParticleRenderMode.SPRITE,
      ParticleRenderMode.TRAIL,
      // More to come:
      // ParticleRenderMode.GLOW,
      // ParticleRenderMode.MESH_CUSTOM,
    ];
  }
}

