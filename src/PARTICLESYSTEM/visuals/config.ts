/**
 * PARTICLESYSTEM/visuals/config.ts - Unified visual configuration schema
 * Single responsibility: Central configuration for all visual/rendering aspects
 * 
 * Following ESM philosophy: Self-contained, typed, well-documented configuration
 */

import { ParticleRenderMode } from '../RENDERER/renderercore';
import { ColorMode } from './colormodes';
import type { VisualMaterialProperties } from './materialvisuals';

/**
 * Render quality presets
 */
export enum RenderQuality {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  ULTRA = 'ultra',
}

/**
 * Billboard orientation modes for sprites
 */
export enum BillboardMode {
  CAMERA = 0,      // Face camera
  VELOCITY = 1,    // Align with velocity
  AXIS = 2,        // Fixed axis
}

/**
 * Blend modes for transparency
 */
export enum BlendMode {
  ALPHA = 0,       // Standard alpha blending
  ADDITIVE = 1,    // Additive (glow effect)
  MULTIPLY = 2,    // Multiply (darken)
}

/**
 * Trail configuration
 */
export interface TrailConfig {
  enabled: boolean;
  length: number;           // Number of trail segments [2-64]
  widthFalloff: number;     // Width taper [0.0-1.0]
  alphaFalloff: number;     // Opacity fade [0.0-1.0]
}

/**
 * Glow/bloom configuration
 */
export interface GlowConfig {
  enabled: boolean;
  intensity: number;        // Glow strength [0.0-5.0]
  radius: number;           // Glow radius [0.1-3.0]
  threshold: number;        // Brightness threshold [0.0-1.0]
}

/**
 * Debug visualization options
 */
export interface VisualDebugConfig {
  showGrid: boolean;
  showForceFields: boolean;
  showBoundaries: boolean;
  showVelocity: boolean;
  showNormals: boolean;
  wireframe: boolean;
}

/**
 * Color adjustment settings
 */
export interface ColorAdjustmentConfig {
  brightness: number;       // [0.0-2.0]
  contrast: number;         // [0.0-2.0]
  saturation: number;       // [0.0-2.0]
  hueShift: number;         // [0.0-360.0] degrees
}

/**
 * Particle appearance settings
 */
export interface ParticleAppearanceConfig {
  size: number;             // Base size [0.1-5.0]
  sizeVariation: number;    // Random variation [0.0-1.0]
  rotation: number;         // Base rotation [0-360] degrees
  rotationSpeed: number;    // Rotation animation [0.0-10.0]
  opacity: number;          // Global opacity [0.0-1.0]
}

/**
 * Sprite-specific settings
 */
export interface SpriteConfig {
  billboardMode: BillboardMode;
  blendMode: BlendMode;
  texture: string;          // Texture name or path
  atlasSize: number;        // Size of texture atlas [1-16]
  spriteIndex: number;      // Index in atlas [0-255]
}

/**
 * Optimization settings
 */
export interface OptimizationConfig {
  lodEnabled: boolean;      // Level of detail
  cullingEnabled: boolean;  // Frustum/occlusion culling
  sortingEnabled: boolean;  // Depth sorting for transparency
  maxParticles: number;     // Particle limit
}

/**
 * Complete visual configuration
 */
export interface VisualConfig {
  // Renderer
  renderMode: ParticleRenderMode;
  quality: RenderQuality;
  optimization: OptimizationConfig;
  
  // Material
  material: Partial<VisualMaterialProperties>;
  materialPreset: string;
  
  // Color
  colorMode: ColorMode;
  colorGradient: string;
  colorCycleSpeed: number;    // [0.0-1.0]
  colorAdjustment: ColorAdjustmentConfig;
  
  // Appearance
  appearance: ParticleAppearanceConfig;
  
  // Effects
  trails: TrailConfig;
  glow: GlowConfig;
  softParticles: boolean;
  
  // Sprite-specific
  sprite: SpriteConfig;
  
  // Debug
  debug: VisualDebugConfig;
}

/**
 * Default visual configuration
 */
export const DEFAULT_VISUAL_CONFIG: VisualConfig = {
  // Renderer
  renderMode: ParticleRenderMode.MESH,
  quality: RenderQuality.HIGH,
  optimization: {
    lodEnabled: false,
    cullingEnabled: false,
    sortingEnabled: false,
    maxParticles: 131000,
  },
  
  // Material
  material: {
    metalness: 0.9,
    roughness: 0.5,
    emissive: 0.0,
    transmission: 0.0,
    ior: 1.5,
    iridescence: 0.0,
    clearcoat: 0.0,
    sheen: 0.0,
  },
  materialPreset: 'WATER_DROPLET',
  
  // Color
  colorMode: ColorMode.VELOCITY,
  colorGradient: 'RAINBOW',
  colorCycleSpeed: 0.05,
  colorAdjustment: {
    brightness: 1.0,
    contrast: 1.0,
    saturation: 1.0,
    hueShift: 0.0,
  },
  
  // Appearance
  appearance: {
    size: 1.0,
    sizeVariation: 0.2,
    rotation: 0.0,
    rotationSpeed: 0.0,
    opacity: 1.0,
  },
  
  // Effects
  trails: {
    enabled: false,
    length: 8,
    widthFalloff: 0.5,
    alphaFalloff: 0.7,
  },
  glow: {
    enabled: false,
    intensity: 1.0,
    radius: 1.0,
    threshold: 0.8,
  },
  softParticles: true,
  
  // Sprite
  sprite: {
    billboardMode: BillboardMode.CAMERA,
    blendMode: BlendMode.ALPHA,
    texture: 'builtin_circle',
    atlasSize: 1,
    spriteIndex: 0,
  },
  
  // Debug
  debug: {
    showGrid: false,
    showForceFields: false,
    showBoundaries: false,
    showVelocity: false,
    showNormals: false,
    wireframe: false,
  },
};

/**
 * Visual preset (named configuration)
 */
export interface VisualPreset {
  name: string;
  description?: string;
  config: Partial<VisualConfig>;
}

/**
 * Built-in visual presets
 */
export const VISUAL_PRESETS: Record<string, VisualPreset> = {
  PERFORMANCE: {
    name: 'Performance Mode',
    description: 'Optimized for maximum FPS',
    config: {
      renderMode: ParticleRenderMode.POINT,
      quality: RenderQuality.LOW,
      optimization: {
        lodEnabled: true,
        cullingEnabled: true,
        sortingEnabled: false,
        maxParticles: 131000,
      },
      trails: {
        enabled: false,
        length: 4,
        widthFalloff: 0.5,
        alphaFalloff: 0.7,
      },
      glow: {
        enabled: false,
        intensity: 0.0,
        radius: 1.0,
        threshold: 0.8,
      },
      softParticles: false,
    },
  },
  
  QUALITY: {
    name: 'Quality Mode',
    description: 'Maximum visual fidelity',
    config: {
      renderMode: ParticleRenderMode.MESH,
      quality: RenderQuality.ULTRA,
      optimization: {
        lodEnabled: false,
        cullingEnabled: false,
        sortingEnabled: true,
        maxParticles: 131000,
      },
      trails: {
        enabled: true,
        length: 16,
        widthFalloff: 0.7,
        alphaFalloff: 0.8,
      },
      glow: {
        enabled: true,
        intensity: 2.0,
        radius: 1.5,
        threshold: 0.6,
      },
      softParticles: true,
    },
  },
  
  BALANCED: {
    name: 'Balanced',
    description: 'Balance between quality and performance',
    config: {
      renderMode: ParticleRenderMode.SPRITE,
      quality: RenderQuality.MEDIUM,
      optimization: {
        lodEnabled: true,
        cullingEnabled: true,
        sortingEnabled: false,
        maxParticles: 131000,
      },
      softParticles: true,
    },
  },
};

/**
 * Merge partial config with defaults
 */
export function mergeVisualConfig(
  base: VisualConfig,
  updates: Partial<VisualConfig>
): VisualConfig {
  return {
    ...base,
    ...updates,
    optimization: { ...base.optimization, ...updates.optimization },
    material: { ...base.material, ...updates.material },
    colorAdjustment: { ...base.colorAdjustment, ...updates.colorAdjustment },
    appearance: { ...base.appearance, ...updates.appearance },
    trails: { ...base.trails, ...updates.trails },
    glow: { ...base.glow, ...updates.glow },
    sprite: { ...base.sprite, ...updates.sprite },
    debug: { ...base.debug, ...updates.debug },
  };
}

/**
 * Validate visual configuration
 */
export function validateVisualConfig(config: Partial<VisualConfig>): string[] {
  const errors: string[] = [];
  
  // Validate appearance
  if (config.appearance) {
    const { size, sizeVariation, opacity } = config.appearance;
    if (size !== undefined && (size < 0.1 || size > 5.0)) {
      errors.push('Particle size must be between 0.1 and 5.0');
    }
    if (sizeVariation !== undefined && (sizeVariation < 0 || sizeVariation > 1)) {
      errors.push('Size variation must be between 0.0 and 1.0');
    }
    if (opacity !== undefined && (opacity < 0 || opacity > 1)) {
      errors.push('Opacity must be between 0.0 and 1.0');
    }
  }
  
  // Validate trails
  if (config.trails) {
    const { length } = config.trails;
    if (length !== undefined && (length < 2 || length > 64)) {
      errors.push('Trail length must be between 2 and 64');
    }
  }
  
  return errors;
}

/**
 * Export configuration to JSON
 */
export function exportVisualConfig(config: VisualConfig): string {
  return JSON.stringify(config, null, 2);
}

/**
 * Import configuration from JSON
 */
export function importVisualConfig(json: string): VisualConfig {
  const parsed = JSON.parse(json);
  return mergeVisualConfig(DEFAULT_VISUAL_CONFIG, parsed);
}


