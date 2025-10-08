/**
 * PARTICLESYSTEM/visuals/index.ts - Visual system barrel export
 * Single responsibility: Clean public API for visual components
 * 
 * Central entry point for all visual-related functionality
 */

// Core visual definitions
export { ColorMode, getColorModeName, getAvailableColorModes, COLOR_MODE_DESCRIPTIONS } from './colormodes';
export type { ColorStop, ColorGradient } from './colorpalette';
export { COLOR_GRADIENTS, sampleGradient, createGradientSamplerTSL, getGradientNames, getGradient, createCustomGradient } from './colorpalette';
export type { VisualMaterialProperties } from './materialvisuals';
export { VISUAL_MATERIAL_PRESETS, getVisualPresetNames, getVisualPreset, getPresetsByCategory, getCategories } from './materialvisuals';

// Configuration
export type {
  VisualConfig,
  TrailConfig,
  GlowConfig,
  VisualDebugConfig,
  ColorAdjustmentConfig,
  ParticleAppearanceConfig,
  SpriteConfig,
  OptimizationConfig,
  VisualPreset,
} from './config';
export {
  RenderQuality,
  BillboardMode,
  BlendMode,
  DEFAULT_VISUAL_CONFIG,
  VISUAL_PRESETS,
  mergeVisualConfig,
  validateVisualConfig,
  exportVisualConfig,
  importVisualConfig,
} from './config';

// Texture system
export { UnifiedTextureSystem, UnifiedTextureType } from './textures/unified-texture-system';
export type { UnifiedTextureConfig } from './textures/unified-texture-system';
export { TextureManager, GPUTextureManager } from './textures/unified-texture-system';

// Control panel
export { VisualsPanel } from './PANELvisuals';
export type { VisualPanelCallbacks } from './PANELvisuals';


