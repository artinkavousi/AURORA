/**
 * PARTICLESYSTEM/visuals/textures/unified-texture-system.ts - Unified texture API
 * Single responsibility: Facade pattern for CPU and GPU texture generation
 * 
 * Automatically chooses the best backend (CPU canvas-based or GPU TSL-based)
 * based on texture type and performance requirements.
 */

import * as THREE from "three/webgpu";
import { TextureManager } from './texturemanager';
import { GPUTextureManager } from './proceduralGPU';

/**
 * Unified texture type enum
 */
export enum UnifiedTextureType {
  // Simple shapes (CPU-optimized)
  CIRCLE = 'circle',
  SQUARE = 'square',
  STAR = 'star',
  HEXAGON = 'hexagon',
  
  // Effects (GPU-optimized)
  SPARK = 'spark',
  SMOKE = 'smoke',
  FLARE = 'flare',
  ELECTRIC = 'electric',
  CELLULAR = 'cellular',
  
  // Custom
  CUSTOM = 'custom',
}

/**
 * Unified texture configuration
 */
export interface UnifiedTextureConfig {
  type: UnifiedTextureType | string;
  size?: number;
  softness?: number;
  
  // GPU-specific
  animated?: boolean;
  time?: number;
  turbulence?: number;
  complexity?: number;
  rays?: number;
  rings?: number;
  scale?: number;
  sharpness?: number;
  
  // General
  color?: THREE.Color;
}

/**
 * Texture backend selector
 */
type TextureBackend = 'cpu' | 'gpu';

/**
 * UnifiedTextureSystem - Smart texture generation facade
 * 
 * Automatically selects the best generation method (CPU or GPU)
 * based on texture type and requirements.
 */
export class UnifiedTextureSystem {
  private cpuManager: TextureManager;
  private gpuManager: GPUTextureManager;
  private cache: Map<string, THREE.Texture> = new Map();
  private renderer: THREE.WebGPURenderer;
  
  constructor(renderer: THREE.WebGPURenderer) {
    this.renderer = renderer;
    this.cpuManager = new TextureManager();
    this.gpuManager = new GPUTextureManager(renderer);
  }
  
  /**
   * Generate a texture using the optimal backend
   */
  public generateTexture(config: UnifiedTextureConfig): THREE.Texture {
    const cacheKey = this.generateCacheKey(config);
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }
    
    // Select backend
    const backend = this.selectBackend(config);
    
    // Generate texture
    let texture: THREE.Texture;
    
    if (backend === 'cpu') {
      texture = this.generateCPU(config);
    } else {
      texture = this.generateGPU(config);
    }
    
    // Cache and return
    this.cache.set(cacheKey, texture);
    return texture;
  }
  
  /**
   * Get built-in texture by name
   */
  public getBuiltIn(name: string): THREE.Texture | undefined {
    return this.cpuManager.getTexture(this.cpuManager.BUILTIN[name as keyof typeof this.cpuManager.BUILTIN]);
  }
  
  /**
   * Update time for animated textures
   */
  public update(deltaTime: number): void {
    this.gpuManager.update(deltaTime);
  }
  
  /**
   * Smart backend selection
   */
  private selectBackend(config: UnifiedTextureConfig): TextureBackend {
    // Force GPU for animated textures
    if (config.animated) {
      return 'gpu';
    }
    
    // GPU-optimized types
    const gpuTypes = [
      UnifiedTextureType.SMOKE,
      UnifiedTextureType.ELECTRIC,
      UnifiedTextureType.CELLULAR,
      UnifiedTextureType.FLARE,
    ];
    
    if (gpuTypes.includes(config.type as UnifiedTextureType)) {
      return 'gpu';
    }
    
    // Default to CPU for simple shapes (faster generation, no render pass needed)
    return 'cpu';
  }
  
  /**
   * Generate using CPU canvas backend
   */
  private generateCPU(config: UnifiedTextureConfig): THREE.Texture {
    const cpuType = config.type as any; // Maps directly to procedural types
    const size = config.size || 256;
    const softness = config.softness || 0.3;
    
    return this.cpuManager.generateTexture({
      type: cpuType,
      size,
      softness,
      color: config.color,
    });
  }
  
  /**
   * Generate using GPU TSL backend
   */
  private generateGPU(config: UnifiedTextureConfig): THREE.Texture {
    const gpuType = config.type as any;
    const size = config.size || 512;
    
    // Map config to GPU params
    const params: Record<string, number> = {};
    
    if (config.softness !== undefined) params.softness = config.softness;
    if (config.turbulence !== undefined) params.turbulence = config.turbulence;
    if (config.complexity !== undefined) params.complexity = config.complexity;
    if (config.rays !== undefined) params.rays = config.rays;
    if (config.rings !== undefined) params.rings = config.rings;
    if (config.scale !== undefined) params.scale = config.scale;
    if (config.sharpness !== undefined) params.sharpness = config.sharpness;
    
    return this.gpuManager.generateTexture(gpuType, size, params);
  }
  
  /**
   * Generate cache key from config
   */
  private generateCacheKey(config: UnifiedTextureConfig): string {
    const parts = [
      config.type,
      config.size || 256,
      config.softness || 0.3,
      config.animated ? 't' : 'f',
    ];
    
    // Add GPU params if present
    if (config.turbulence) parts.push(`turb:${config.turbulence}`);
    if (config.complexity) parts.push(`comp:${config.complexity}`);
    if (config.rays) parts.push(`rays:${config.rays}`);
    if (config.rings) parts.push(`rings:${config.rings}`);
    
    return parts.join('_');
  }
  
  /**
   * Clear cache
   */
  public clearCache(): void {
    this.cache.forEach(texture => texture.dispose());
    this.cache.clear();
  }
  
  /**
   * Dispose all resources
   */
  public dispose(): void {
    this.clearCache();
    this.cpuManager.dispose();
    this.gpuManager.dispose();
  }
  
  /**
   * Get cache size
   */
  public getCacheSize(): number {
    return this.cache.size;
  }
  
  /**
   * Get cache statistics
   */
  public getCacheStats(): { cpu: number; gpu: number; total: number } {
    // TODO: Track backend per texture
    return {
      cpu: 0,
      gpu: 0,
      total: this.cache.size,
    };
  }
}

/**
 * Export convenience types
 */
export { TextureManager, GPUTextureManager };


