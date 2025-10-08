/**
 * PARTICLESYSTEM/visuals/PANELvisuals.ts - Visual controls panel
 * Single responsibility: UI controls for particle rendering and appearance
 */

import type { Dashboard } from '../../PANEL/dashboard';
import { ParticleRenderMode, RendererManager, type RendererConfig } from '../RENDERER/renderercore';
import { ColorMode } from './colormodes';
import { COLOR_GRADIENTS, getGradientNames } from './colorpalette';
import { 
  VISUAL_MATERIAL_PRESETS, 
  getVisualPresetNames,
  getCategories,
  getPresetsByCategory,
  type VisualMaterialProperties 
} from './materialvisuals';
import { TextureManager } from './textures/texturemanager';

/**
 * Visual panel callbacks
 */
export interface VisualPanelCallbacks {
  onRenderModeChange?: (mode: ParticleRenderMode) => void;
  onMaterialPresetChange?: (preset: VisualMaterialProperties) => void;
  onColorModeChange?: (mode: ColorMode) => void;
  onColorGradientChange?: (gradientName: string) => void;
  onSizeChange?: (size: number) => void;
  onMaterialPropertyChange?: (property: string, value: number) => void;
}

/**
 * VisualsPanel - Control panel for particle rendering and appearance
 */
export class VisualsPanel {
  private pane: any;
  private callbacks: VisualPanelCallbacks;
  private rendererManager: RendererManager | null = null;
  private textureManager: TextureManager;
  
  // Current settings
  public settings = {
    // Renderer
    renderMode: ParticleRenderMode.MESH,
    quality: 'high' as 'low' | 'medium' | 'high' | 'ultra',
    lodEnabled: false,
    cullingEnabled: false,
    sortingEnabled: false,
    
    // Material
    materialPreset: 'WATER_DROPLET',
    metalness: 0.9,
    roughness: 0.5,
    emissive: 0.0,
    transmission: 0.0,
    ior: 1.5,
    iridescence: 0.0,
    
    // Color
    colorMode: 0, // ColorMode.VELOCITY as number for Tweakpane compatibility
    colorGradient: 'RAINBOW',
    colorCycleSpeed: 0.05,
    brightness: 1.0,
    contrast: 1.0,
    saturation: 1.0,
    
    // Particles
    particleSize: 1.0,
    sizeVariation: 0.2,
    rotation: 0.0,
    rotationSpeed: 0.0,
    opacity: 1.0,
    
    // Effects
    trailsEnabled: false,
    trailLength: 8,
    trailWidthFalloff: 0.5,
    trailAlphaFalloff: 0.7,
    glowEnabled: false,
    glowIntensity: 1.0,
    softParticles: true,
    
    // Sprite-specific
    billboardMode: 0, // 0=camera, 1=velocity, 2=axis
    blendMode: 0,     // 0=alpha, 1=additive, 2=multiply
    spriteTexture: 'builtin_circle',
    
    // Debug
    showGrid: false,
    showForceFields: false,
    showBoundaries: false,
    showVelocity: false,
    wireframe: false,
  };
  
  constructor(dashboard: Dashboard, callbacks: VisualPanelCallbacks = {}) {
    this.callbacks = callbacks;
    this.textureManager = new TextureManager();
    
    // Create panel using Dashboard's createPanel method
    const { pane } = dashboard.createPanel('visuals', {
      title: '🎨 Visuals',
      position: { x: window.innerWidth - 316, y: 16 },
      expanded: false,
      draggable: true,
      collapsible: true,
    });
    
    this.pane = pane;
    
    this.buildPanel();
  }
  
  /**
   * Build the panel UI
   */
  private buildPanel(): void {
    // === RENDERER SECTION ===
    const rendererFolder = this.pane.addFolder({ title: '🖼️ Renderer', expanded: true });
    
    const renderModeOptions = {
      'Point': ParticleRenderMode.POINT,
      'Sprite': ParticleRenderMode.SPRITE,
      'Mesh': ParticleRenderMode.MESH,
      'Trail': ParticleRenderMode.TRAIL,
    };
    
    rendererFolder.addBinding(this.settings, 'renderMode', {
      label: 'Mode',
      options: renderModeOptions,
    }).on('change', (ev: any) => {
      this.callbacks.onRenderModeChange?.(ev.value);
    });
    
    rendererFolder.addBinding(this.settings, 'quality', {
      label: 'Quality',
      options: {
        'Low': 'low',
        'Medium': 'medium',
        'High': 'high',
        'Ultra': 'ultra',
      },
    });
    
    rendererFolder.addBinding(this.settings, 'lodEnabled', { label: 'LOD (Auto Quality)' });
    rendererFolder.addBinding(this.settings, 'cullingEnabled', { label: 'GPU Culling' });
    rendererFolder.addBinding(this.settings, 'sortingEnabled', { label: 'Depth Sorting' });
    
    // === MATERIAL SECTION ===
    const materialFolder = this.pane.addFolder({ title: '🎭 Material', expanded: true });
    
    // Preset selector
    const presetNames = getVisualPresetNames();
    const presetOptions: Record<string, string> = {};
    presetNames.forEach(name => {
      presetOptions[name] = name;
    });
    
    materialFolder.addBinding(this.settings, 'materialPreset', {
      label: 'Preset',
      options: presetOptions,
    }).on('change', (ev: any) => {
      this.applyMaterialPreset(ev.value);
    });
    
    materialFolder.addButton({ title: '📁 Browse Presets...' }).on('click', () => {
      this.openPresetBrowser();
    });
    
    materialFolder.addBlade({ view: 'separator' });
    
    materialFolder.addBinding(this.settings, 'metalness', {
      label: 'Metalness',
      min: 0,
      max: 1,
      step: 0.01,
    }).on('change', (ev: any) => {
      this.callbacks.onMaterialPropertyChange?.('metalness', ev.value);
    });
    
    materialFolder.addBinding(this.settings, 'roughness', {
      label: 'Roughness',
      min: 0,
      max: 1,
      step: 0.01,
    }).on('change', (ev: any) => {
      this.callbacks.onMaterialPropertyChange?.('roughness', ev.value);
    });
    
    materialFolder.addBinding(this.settings, 'emissive', {
      label: 'Emissive',
      min: 0,
      max: 10,
      step: 0.1,
    }).on('change', (ev: any) => {
      this.callbacks.onMaterialPropertyChange?.('emissive', ev.value);
    });
    
    materialFolder.addBinding(this.settings, 'transmission', {
      label: 'Transmission',
      min: 0,
      max: 1,
      step: 0.01,
    }).on('change', (ev: any) => {
      this.callbacks.onMaterialPropertyChange?.('transmission', ev.value);
    });
    
    materialFolder.addBinding(this.settings, 'ior', {
      label: 'IOR',
      min: 1.0,
      max: 3.0,
      step: 0.01,
    }).on('change', (ev: any) => {
      this.callbacks.onMaterialPropertyChange?.('ior', ev.value);
    });
    
    materialFolder.addBinding(this.settings, 'iridescence', {
      label: 'Iridescence',
      min: 0,
      max: 1,
      step: 0.01,
    }).on('change', (ev: any) => {
      this.callbacks.onMaterialPropertyChange?.('iridescence', ev.value);
    });
    
    // === COLOR SECTION ===
    const colorFolder = this.pane.addFolder({ title: '🌈 Color', expanded: true });
    
    const colorModeOptions = {
      'Velocity (HSV)': 0,
      'Density': 1,
      'Material Type': 3,
      'Custom Gradient': 4,
      'Gradient (Velocity)': 5,
      'Gradient (Density)': 6,
      'Temperature': 8,
      'Height': 10,
    };
    
    colorFolder.addBinding(this.settings, 'colorMode', {
      label: 'Mode',
      options: colorModeOptions,
    }).on('change', (ev: any) => {
      this.callbacks.onColorModeChange?.(ev.value);
    });
    
    // Gradient selector
    const gradientNames = getGradientNames();
    const gradientOptions: Record<string, string> = {};
    gradientNames.forEach(name => {
      gradientOptions[name] = name;
    });
    
    colorFolder.addBinding(this.settings, 'colorGradient', {
      label: 'Gradient',
      options: gradientOptions,
    }).on('change', (ev: any) => {
      this.callbacks.onColorGradientChange?.(ev.value);
    });
    
    colorFolder.addButton({ title: '🎨 Edit Gradient...' }).on('click', () => {
      this.openGradientEditor();
    });
    
    colorFolder.addBlade({ view: 'separator' });
    
    colorFolder.addBinding(this.settings, 'colorCycleSpeed', {
      label: 'Cycle Speed',
      min: 0,
      max: 1,
      step: 0.01,
    });
    
    colorFolder.addBinding(this.settings, 'brightness', {
      label: 'Brightness',
      min: 0,
      max: 2,
      step: 0.01,
    });
    
    colorFolder.addBinding(this.settings, 'contrast', {
      label: 'Contrast',
      min: 0,
      max: 2,
      step: 0.01,
    });
    
    colorFolder.addBinding(this.settings, 'saturation', {
      label: 'Saturation',
      min: 0,
      max: 2,
      step: 0.01,
    });
    
    // === PARTICLE APPEARANCE ===
    const particleFolder = this.pane.addFolder({ title: '✨ Particles', expanded: true });
    
    particleFolder.addBinding(this.settings, 'particleSize', {
      label: 'Size',
      min: 0.1,
      max: 5,
      step: 0.1,
    }).on('change', (ev: any) => {
      this.callbacks.onSizeChange?.(ev.value);
    });
    
    particleFolder.addBinding(this.settings, 'sizeVariation', {
      label: 'Size Variation',
      min: 0,
      max: 1,
      step: 0.01,
    });
    
    particleFolder.addBinding(this.settings, 'rotation', {
      label: 'Rotation',
      min: 0,
      max: 360,
      step: 1,
    });
    
    particleFolder.addBinding(this.settings, 'rotationSpeed', {
      label: 'Rotation Speed',
      min: 0,
      max: 10,
      step: 0.1,
    });
    
    particleFolder.addBinding(this.settings, 'opacity', {
      label: 'Opacity',
      min: 0,
      max: 1,
      step: 0.01,
    });
    
    // === EFFECTS SECTION ===
    const effectsFolder = this.pane.addFolder({ title: '💫 Effects', expanded: true });
    
    effectsFolder.addBinding(this.settings, 'trailsEnabled', { label: 'Trails' });
    
    effectsFolder.addBinding(this.settings, 'trailLength', {
      label: 'Trail Length',
      min: 2,
      max: 64,
      step: 1,
    });
    
    effectsFolder.addBinding(this.settings, 'trailWidthFalloff', {
      label: 'Trail Width Falloff',
      min: 0,
      max: 1,
      step: 0.01,
    });
    
    effectsFolder.addBinding(this.settings, 'trailAlphaFalloff', {
      label: 'Trail Alpha Falloff',
      min: 0,
      max: 1,
      step: 0.01,
    });
    
    effectsFolder.addBlade({ view: 'separator' });
    
    effectsFolder.addBinding(this.settings, 'glowEnabled', { label: 'Glow' });
    
    effectsFolder.addBinding(this.settings, 'glowIntensity', {
      label: 'Glow Intensity',
      min: 0,
      max: 5,
      step: 0.1,
    });
    
    effectsFolder.addBinding(this.settings, 'softParticles', { label: 'Soft Particles' });
    
    // === SPRITE SETTINGS ===
    const spriteFolder = this.pane.addFolder({ title: '🖼️ Sprite Settings', expanded: false });
    
    spriteFolder.addBinding(this.settings, 'billboardMode', {
      label: 'Billboard Mode',
      options: {
        'Camera': 0,
        'Velocity': 1,
        'Axis': 2,
      },
    });
    
    spriteFolder.addBinding(this.settings, 'blendMode', {
      label: 'Blend Mode',
      options: {
        'Alpha': 0,
        'Additive': 1,
        'Multiply': 2,
      },
    });
    
    const textureOptions: Record<string, string> = {
      'Circle': 'builtin_circle',
      'Square': 'builtin_square',
      'Star': 'builtin_star',
      'Hexagon': 'builtin_hexagon',
      'Spark': 'builtin_spark',
      'Smoke': 'builtin_smoke',
      'Flare': 'builtin_flare',
    };
    
    spriteFolder.addBinding(this.settings, 'spriteTexture', {
      label: 'Texture',
      options: textureOptions,
    });
    
    // === DEBUG SECTION ===
    const debugFolder = this.pane.addFolder({ title: '🔍 Debug', expanded: false });
    
    debugFolder.addBinding(this.settings, 'showGrid', { label: 'Show Grid' });
    debugFolder.addBinding(this.settings, 'showForceFields', { label: 'Show Force Fields' });
    debugFolder.addBinding(this.settings, 'showBoundaries', { label: 'Show Boundaries' });
    debugFolder.addBinding(this.settings, 'showVelocity', { label: 'Show Velocity' });
    debugFolder.addBinding(this.settings, 'wireframe', { label: 'Wireframe' });
    
    // === QUICK ACTIONS ===
    const actionsFolder = this.pane.addFolder({ title: '⚡ Quick Actions', expanded: false });
    
    actionsFolder.addButton({ title: '🎬 Performance Mode' }).on('click', () => {
      this.applyPerformanceMode();
    });
    
    actionsFolder.addButton({ title: '💎 Quality Mode' }).on('click', () => {
      this.applyQualityMode();
    });
    
    actionsFolder.addButton({ title: '🔥 Fire Preset' }).on('click', () => {
      this.applyMaterialPreset('FIREFLY');
    });
    
    actionsFolder.addButton({ title: '💧 Water Preset' }).on('click', () => {
      this.applyMaterialPreset('WATER_DROPLET');
    });
    
    actionsFolder.addButton({ title: '✨ Magic Preset' }).on('click', () => {
      this.applyMaterialPreset('MAGIC_SPARK');
    });
    
    actionsFolder.addBlade({ view: 'separator' });
    
    actionsFolder.addButton({ title: '↺ Reset to Defaults' }).on('click', () => {
      this.resetToDefaults();
    });
  }
  
  /**
   * Apply a material preset
   */
  private applyMaterialPreset(presetName: string): void {
    const preset = VISUAL_MATERIAL_PRESETS[presetName];
    if (!preset) return;
    
    this.settings.materialPreset = presetName;
    this.settings.renderMode = preset.renderMode;
    this.settings.metalness = preset.metalness;
    this.settings.roughness = preset.roughness;
    this.settings.emissive = preset.emissive;
    this.settings.transmission = preset.transmission;
    this.settings.ior = preset.ior;
    this.settings.iridescence = preset.iridescence;
    this.settings.colorMode = preset.colorMode;
    this.settings.particleSize = preset.particleSize;
    this.settings.sizeVariation = preset.sizeVariation;
    this.settings.rotationSpeed = preset.rotationSpeed;
    this.settings.trailsEnabled = preset.trailEnabled;
    this.settings.trailLength = preset.trailLength;
    this.settings.glowIntensity = preset.glowIntensity;
    
    if (preset.colorGradient) {
      this.settings.colorGradient = preset.colorGradient;
    }
    
    // Refresh panel
    this.pane.refresh();
    
    // Notify callbacks
    this.callbacks.onMaterialPresetChange?.(preset);
    this.callbacks.onRenderModeChange?.(preset.renderMode);
    this.callbacks.onColorModeChange?.(preset.colorMode);
  }
  
  /**
   * Apply performance mode (low quality, high FPS)
   */
  private applyPerformanceMode(): void {
    this.settings.renderMode = ParticleRenderMode.POINT;
    this.settings.quality = 'low';
    this.settings.lodEnabled = true;
    this.settings.cullingEnabled = true;
    this.settings.sortingEnabled = false;
    this.settings.trailsEnabled = false;
    this.settings.glowEnabled = false;
    this.settings.softParticles = false;
    
    this.pane.refresh();
    this.callbacks.onRenderModeChange?.(ParticleRenderMode.POINT);
  }
  
  /**
   * Apply quality mode (high quality, lower FPS)
   */
  private applyQualityMode(): void {
    this.settings.renderMode = ParticleRenderMode.MESH;
    this.settings.quality = 'ultra';
    this.settings.lodEnabled = false;
    this.settings.cullingEnabled = false;
    this.settings.sortingEnabled = true;
    this.settings.softParticles = true;
    
    this.pane.refresh();
    this.callbacks.onRenderModeChange?.(ParticleRenderMode.MESH);
  }
  
  /**
   * Reset to default settings
   */
  private resetToDefaults(): void {
    this.settings = {
      renderMode: ParticleRenderMode.MESH,
      quality: 'high',
      lodEnabled: false,
      cullingEnabled: false,
      sortingEnabled: false,
      materialPreset: 'WATER_DROPLET',
      metalness: 0.9,
      roughness: 0.5,
      emissive: 0.0,
      transmission: 0.0,
      ior: 1.5,
      iridescence: 0.0,
      colorMode: 0, // ColorMode.VELOCITY
      colorGradient: 'RAINBOW',
      colorCycleSpeed: 0.05,
      brightness: 1.0,
      contrast: 1.0,
      saturation: 1.0,
      particleSize: 1.0,
      sizeVariation: 0.2,
      rotation: 0.0,
      rotationSpeed: 0.0,
      opacity: 1.0,
      trailsEnabled: false,
      trailLength: 8,
      trailWidthFalloff: 0.5,
      trailAlphaFalloff: 0.7,
      glowEnabled: false,
      glowIntensity: 1.0,
      softParticles: true,
      billboardMode: 0,
      blendMode: 0,
      spriteTexture: 'builtin_circle',
      showGrid: false,
      showForceFields: false,
      showBoundaries: false,
      showVelocity: false,
      wireframe: false,
    };
    
    this.pane.refresh();
  }
  
  /**
   * Open preset browser (placeholder)
   */
  private openPresetBrowser(): void {
    console.log('Preset browser not yet implemented');
    alert('Preset Browser\n\nCategories: ' + getCategories().join(', '));
  }
  
  /**
   * Open gradient editor (placeholder)
   */
  private openGradientEditor(): void {
    console.log('Gradient editor not yet implemented');
    alert('Gradient Editor\n\nThis feature is coming soon!');
  }
  
  /**
   * Set renderer manager reference
   */
  public setRendererManager(manager: RendererManager): void {
    this.rendererManager = manager;
  }

  /**
   * Sync render mode when changed externally (e.g. adaptive performance)
   */
  public syncRenderMode(mode: ParticleRenderMode): void {
    this.settings.renderMode = mode;
    this.pane.refresh();
  }

  /**
   * Get texture manager
   */
  public getTextureManager(): TextureManager {
    return this.textureManager;
  }
  
  /**
   * Dispose resources
   */
  public dispose(): void {
    this.textureManager.dispose();
  }
}

