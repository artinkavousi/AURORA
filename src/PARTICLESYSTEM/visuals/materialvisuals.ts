/**
 * PARTICLESYSTEM/visuals/materialvisuals.ts - Visual material presets
 * Single responsibility: Material definitions with rendering properties
 */

import { MATERIAL_PRESETS, MaterialType, type MaterialProperties } from '../physic/materials';
import { COLOR_GRADIENTS, type ColorGradient } from './colorpalette';
import { ColorMode } from './colormodes';
import { ParticleRenderMode } from '../RENDERER/renderercore';

/**
 * Extended material properties with rendering
 */
export interface VisualMaterialProperties extends MaterialProperties {
  // Rendering mode
  renderMode: ParticleRenderMode;
  
  // Color settings
  colorMode: ColorMode;
  colorGradient?: string;  // Gradient name from COLOR_GRADIENTS
  colorCycleSpeed?: number;
  
  // Particle appearance
  particleSize: number;
  sizeVariation: number;
  rotationSpeed: number;
  
  // Effects
  trailEnabled: boolean;
  trailLength: number;
  glowIntensity: number;
  
  // Advanced visual
  transmission: number;      // Glass-like transparency [0.0 - 1.0]
  ior: number;               // Index of refraction [1.0 - 3.0]
  iridescence: number;       // Rainbow effect [0.0 - 1.0]
  clearcoat: number;         // Glossy coating [0.0 - 1.0]
  sheen: number;             // Fabric-like sheen [0.0 - 1.0]
  
  // Texture
  texture?: string;
  spriteIndex?: number;
  atlasSize?: number;
}

/**
 * Visual material presets combining physics and rendering
 */
export const VISUAL_MATERIAL_PRESETS: Record<string, VisualMaterialProperties> = {
  // === ENERGY & EFFECTS ===
  FIREFLY: {
    ...MATERIAL_PRESETS.PLASMA,
    renderMode: ParticleRenderMode.SPRITE,
    colorMode: ColorMode.GRADIENT_LIFETIME,
    colorGradient: 'FIRE',
    colorCycleSpeed: 0.0,
    particleSize: 1.2,
    sizeVariation: 0.3,
    rotationSpeed: 0.0,
    trailEnabled: false,
    trailLength: 0,
    glowIntensity: 3.0,
    emissive: 3.0,
    emissiveColor: [1.0, 0.9, 0.5],
    transmission: 0.0,
    ior: 1.0,
    iridescence: 0.0,
    clearcoat: 0.0,
    sheen: 0.0,
  },
  
  ENERGY_BURST: {
    ...MATERIAL_PRESETS.PLASMA,
    renderMode: ParticleRenderMode.SPRITE,
    colorMode: ColorMode.GRADIENT_VELOCITY,
    colorGradient: 'ELECTRIC',
    colorCycleSpeed: 0.0,
    particleSize: 0.8,
    sizeVariation: 0.4,
    rotationSpeed: 2.0,
    trailEnabled: true,
    trailLength: 16,
    glowIntensity: 2.5,
    emissive: 5.0,
    emissiveColor: [0.5, 0.8, 1.0],
    transmission: 0.0,
    ior: 1.0,
    iridescence: 0.0,
    clearcoat: 0.0,
    sheen: 0.0,
  },
  
  PLASMA_GLOW: {
    ...MATERIAL_PRESETS.PLASMA,
    renderMode: ParticleRenderMode.SPRITE,
    colorMode: ColorMode.GRADIENT,
    colorGradient: 'PLASMA',
    colorCycleSpeed: 0.1,
    particleSize: 1.5,
    sizeVariation: 0.5,
    rotationSpeed: 1.0,
    trailEnabled: true,
    trailLength: 8,
    glowIntensity: 4.0,
    emissive: 6.0,
    emissiveColor: [0.8, 0.3, 1.0],
    transmission: 0.0,
    ior: 1.0,
    iridescence: 0.0,
    clearcoat: 0.0,
    sheen: 0.0,
  },
  
  // === FLUIDS ===
  WATER_DROPLET: {
    ...MATERIAL_PRESETS.WATER,
    renderMode: ParticleRenderMode.MESH,
    colorMode: ColorMode.GRADIENT_DENSITY,
    colorGradient: 'OCEAN',
    colorCycleSpeed: 0.0,
    particleSize: 1.0,
    sizeVariation: 0.15,
    rotationSpeed: 0.5,
    trailEnabled: false,
    trailLength: 0,
    glowIntensity: 0.0,
    transmission: 0.9,
    ior: 1.33,
    iridescence: 0.05,
    clearcoat: 1.0,
    sheen: 0.0,
  },
  
  LAVA_BLOB: {
    ...MATERIAL_PRESETS.VISCOUS,
    renderMode: ParticleRenderMode.MESH,
    colorMode: ColorMode.GRADIENT,
    colorGradient: 'LAVA',
    colorCycleSpeed: 0.05,
    particleSize: 1.3,
    sizeVariation: 0.3,
    rotationSpeed: 0.2,
    trailEnabled: false,
    trailLength: 0,
    glowIntensity: 2.0,
    emissive: 4.0,
    emissiveColor: [1.0, 0.3, 0.0],
    transmission: 0.0,
    ior: 1.0,
    iridescence: 0.0,
    clearcoat: 0.3,
    sheen: 0.0,
  },
  
  // === ATMOSPHERIC ===
  SMOKE_WISP: {
    ...MATERIAL_PRESETS.FOAM,
    renderMode: ParticleRenderMode.SPRITE,
    colorMode: ColorMode.GRADIENT_DENSITY,
    colorGradient: 'GRAYSCALE',
    colorCycleSpeed: 0.0,
    particleSize: 2.0,
    sizeVariation: 0.5,
    rotationSpeed: 0.5,
    trailEnabled: false,
    trailLength: 0,
    glowIntensity: 0.0,
    opacity: 0.3,
    transmission: 0.0,
    ior: 1.0,
    iridescence: 0.0,
    clearcoat: 0.0,
    sheen: 0.0,
  },
  
  FOG: {
    ...MATERIAL_PRESETS.FOAM,
    renderMode: ParticleRenderMode.SPRITE,
    colorMode: ColorMode.HEIGHT,
    colorGradient: 'MONOCHROME',
    colorCycleSpeed: 0.0,
    particleSize: 3.0,
    sizeVariation: 0.7,
    rotationSpeed: 0.1,
    trailEnabled: false,
    trailLength: 0,
    glowIntensity: 0.0,
    opacity: 0.15,
    transmission: 0.0,
    ior: 1.0,
    iridescence: 0.0,
    clearcoat: 0.0,
    sheen: 0.0,
  },
  
  // === SOLIDS ===
  CRYSTAL_SHARD: {
    ...MATERIAL_PRESETS.RIGID,
    renderMode: ParticleRenderMode.MESH,
    colorMode: ColorMode.MATERIAL,
    colorCycleSpeed: 0.0,
    particleSize: 1.0,
    sizeVariation: 0.2,
    rotationSpeed: 1.5,
    trailEnabled: false,
    trailLength: 0,
    glowIntensity: 0.0,
    metalness: 0.0,
    roughness: 0.1,
    transmission: 0.8,
    ior: 1.8,
    iridescence: 0.4,
    clearcoat: 1.0,
    sheen: 0.0,
  },
  
  SAND_GRAIN: {
    ...MATERIAL_PRESETS.SAND,
    renderMode: ParticleRenderMode.MESH,
    colorMode: ColorMode.MATERIAL,
    colorCycleSpeed: 0.0,
    particleSize: 0.8,
    sizeVariation: 0.3,
    rotationSpeed: 2.0,
    trailEnabled: false,
    trailLength: 0,
    glowIntensity: 0.0,
    transmission: 0.0,
    ior: 1.0,
    iridescence: 0.0,
    clearcoat: 0.0,
    sheen: 0.0,
  },
  
  SNOW_FLAKE: {
    ...MATERIAL_PRESETS.SNOW,
    renderMode: ParticleRenderMode.SPRITE,
    colorMode: ColorMode.GRADIENT,
    colorGradient: 'ICE',
    colorCycleSpeed: 0.0,
    particleSize: 1.0,
    sizeVariation: 0.4,
    rotationSpeed: 0.8,
    trailEnabled: false,
    trailLength: 0,
    glowIntensity: 0.1,
    transmission: 0.2,
    ior: 1.3,
    iridescence: 0.1,
    clearcoat: 0.8,
    sheen: 0.0,
  },
  
  // === ORGANIC ===
  LEAF: {
    ...MATERIAL_PRESETS.ELASTIC,
    renderMode: ParticleRenderMode.SPRITE,
    colorMode: ColorMode.GRADIENT,
    colorGradient: 'FOREST',
    colorCycleSpeed: 0.0,
    particleSize: 1.2,
    sizeVariation: 0.3,
    rotationSpeed: 1.0,
    trailEnabled: false,
    trailLength: 0,
    glowIntensity: 0.0,
    transmission: 0.0,
    ior: 1.0,
    iridescence: 0.0,
    clearcoat: 0.2,
    sheen: 0.3,
  },
  
  // === MAGICAL ===
  MAGIC_SPARK: {
    ...MATERIAL_PRESETS.PLASMA,
    renderMode: ParticleRenderMode.SPRITE,
    colorMode: ColorMode.GRADIENT_VELOCITY,
    colorGradient: 'AURORA',
    colorCycleSpeed: 0.2,
    particleSize: 0.7,
    sizeVariation: 0.5,
    rotationSpeed: 3.0,
    trailEnabled: true,
    trailLength: 12,
    glowIntensity: 3.5,
    emissive: 4.0,
    emissiveColor: [0.7, 0.5, 1.0],
    transmission: 0.0,
    ior: 1.0,
    iridescence: 0.6,
    clearcoat: 0.0,
    sheen: 0.0,
  },
  
  STARDUST: {
    ...MATERIAL_PRESETS.PLASMA,
    renderMode: ParticleRenderMode.SPRITE,
    colorMode: ColorMode.GRADIENT,
    colorGradient: 'RAINBOW',
    colorCycleSpeed: 0.05,
    particleSize: 0.5,
    sizeVariation: 0.6,
    rotationSpeed: 2.0,
    trailEnabled: true,
    trailLength: 6,
    glowIntensity: 2.0,
    emissive: 3.0,
    emissiveColor: [1.0, 1.0, 1.0],
    transmission: 0.0,
    ior: 1.0,
    iridescence: 1.0,
    clearcoat: 0.0,
    sheen: 0.0,
  },
};

/**
 * Get visual material preset names
 */
export function getVisualPresetNames(): string[] {
  return Object.keys(VISUAL_MATERIAL_PRESETS);
}

/**
 * Get visual preset by name
 */
export function getVisualPreset(name: string): VisualMaterialProperties | undefined {
  return VISUAL_MATERIAL_PRESETS[name];
}

/**
 * Get presets by category
 */
export function getPresetsByCategory(category: string): string[] {
  const categories: Record<string, string[]> = {
    ENERGY: ['FIREFLY', 'ENERGY_BURST', 'PLASMA_GLOW'],
    FLUID: ['WATER_DROPLET', 'LAVA_BLOB'],
    ATMOSPHERIC: ['SMOKE_WISP', 'FOG'],
    SOLID: ['CRYSTAL_SHARD', 'SAND_GRAIN', 'SNOW_FLAKE'],
    ORGANIC: ['LEAF'],
    MAGICAL: ['MAGIC_SPARK', 'STARDUST'],
  };
  
  return categories[category] || [];
}

/**
 * Get all categories
 */
export function getCategories(): string[] {
  return ['ENERGY', 'FLUID', 'ATMOSPHERIC', 'SOLID', 'ORGANIC', 'MAGICAL'];
}

