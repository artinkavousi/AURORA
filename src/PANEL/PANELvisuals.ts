/**
 * PANEL/PANELvisuals.ts - Visual controls panel (Refactored for DashboardV2)
 * Organized sections: Renderer, Material, Color, Particles, Effects, Sprite, Debug
 */

import type { Pane } from 'tweakpane';
import { ParticleRenderMode, RendererManager } from '../PARTICLESYSTEM/RENDERER/renderercore';
import { ColorMode } from '../PARTICLESYSTEM/visuals/colormodes';
import { COLOR_GRADIENTS, getGradientNames } from '../PARTICLESYSTEM/visuals/colorpalette';
import { 
  VISUAL_MATERIAL_PRESETS, 
  getVisualPresetNames,
  getCategories,
  type VisualMaterialProperties 
} from '../PARTICLESYSTEM/visuals/materialvisuals';
import { TextureManager } from '../PARTICLESYSTEM/visuals/textures/texturemanager';

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
 * VisualsPanel - Comprehensive particle appearance controls
 */
export class VisualsPanel {
  private pane: Pane;
  private callbacks: VisualPanelCallbacks;
  private rendererManager: RendererManager | null = null;
  private textureManager: TextureManager;
  
  // Organized settings
  public settings = {
    // === RENDERER ===
    renderMode: ParticleRenderMode.MESH,
    quality: 'high' as 'low' | 'medium' | 'high' | 'ultra',
    lodEnabled: false,
    cullingEnabled: false,
    sortingEnabled: false,
    
    // === MATERIAL ===
    materialPreset: 'WATER_DROPLET',
    metalness: 0.9,
    roughness: 0.5,
    emissive: 0.0,
    transmission: 0.0,
    ior: 1.5,
    iridescence: 0.0,
    
    // === COLOR ===
    colorMode: ColorMode.VELOCITY,
    colorGradient: 'RAINBOW',
    colorCycleSpeed: 0.05,
    brightness: 1.0,
    contrast: 1.0,
    saturation: 1.0,
    hueShift: 0.0,
    
    // === PARTICLES ===
    particleSize: 1.0,
    sizeVariation: 0.2,
    rotation: 0.0,
    rotationSpeed: 0.0,
    opacity: 1.0,
    
    // === EFFECTS ===
    trailsEnabled: false,
    trailLength: 8,
    trailWidthFalloff: 0.5,
    trailAlphaFalloff: 0.7,
    glowEnabled: false,
    glowIntensity: 1.0,
    softParticles: true,
    
    // === SPRITE ===
    billboardMode: 'camera' as 'camera' | 'velocity' | 'axis',
    blendMode: 'alpha' as 'alpha' | 'additive' | 'multiply',
    spriteTexture: 'builtin_circle',
    
    // === DEBUG ===
    showGrid: false,
    showForceFields: false,
    showBoundaries: false,
    showVelocity: false,
    wireframe: false,
  };
  
  constructor(pane: Pane, callbacks: VisualPanelCallbacks = {}) {
    this.pane = pane;
    this.callbacks = callbacks;
    this.textureManager = new TextureManager();
    
    this.buildPanel();
  }
  
  /**
   * Build complete panel UI
   */
  private buildPanel(): void {
    // === RENDERER SECTION ===
    this.buildRendererSection();
    
    // === MATERIAL SECTION ===
    this.buildMaterialSection();
    
    // === COLOR SECTION ===
    this.buildColorSection();
    
    // === PARTICLE APPEARANCE ===
    this.buildParticleSection();
    
    // === EFFECTS SECTION ===
    this.buildEffectsSection();
    
    // === SPRITE SETTINGS ===
    this.buildSpriteSection();
    
    // === DEBUG SECTION ===
    this.buildDebugSection();
    
    // === QUICK ACTIONS ===
    this.buildQuickActions();
  }
  
  /**
   * Renderer Section
   */
  private buildRendererSection(): void {
    const folder = this.pane.addFolder({ title: '🖼️ Renderer', expanded: true });
    
    folder.addBinding(this.settings, 'renderMode', {
      label: 'Mode',
      options: {
        'Point': ParticleRenderMode.POINT,
        'Sprite': ParticleRenderMode.SPRITE,
        'Mesh': ParticleRenderMode.MESH,
        'Trail': ParticleRenderMode.TRAIL,
      },
    }).on('change', (ev: any) => {
      this.callbacks.onRenderModeChange?.(ev.value);
    });
    
    folder.addBlade({ view: 'separator' });
    
    folder.addBinding(this.settings, 'quality', {
      label: 'Quality',
      options: {
        'Low': 'low',
        'Medium': 'medium',
        'High': 'high',
        'Ultra': 'ultra',
      },
    });
    
    const advancedFolder = folder.addFolder({ title: 'Advanced', expanded: false });
    
    advancedFolder.addBinding(this.settings, 'lodEnabled', { label: 'LOD (Auto Quality)' });
    advancedFolder.addBinding(this.settings, 'cullingEnabled', { label: 'GPU Culling' });
    advancedFolder.addBinding(this.settings, 'sortingEnabled', { label: 'Depth Sorting' });
  }
  
  /**
   * Material Section
   */
  private buildMaterialSection(): void {
    const folder = this.pane.addFolder({ title: '🎭 Material', expanded: true });
    
    // Preset selector
    const presetNames = getVisualPresetNames();
    const presetOptions: Record<string, string> = {};
    presetNames.forEach(name => {
      presetOptions[name] = name;
    });
    
    folder.addBinding(this.settings, 'materialPreset', {
      label: 'Preset',
      options: presetOptions,
    }).on('change', (ev: any) => {
      this.applyMaterialPreset(ev.value);
    });
    
    folder.addButton({ title: '📁 Browse Presets...' }).on('click', () => {
      this.openPresetBrowser();
    });
    
    folder.addBlade({ view: 'separator' });
    
    // Physical properties
    const physicalFolder = folder.addFolder({ title: 'Physical Properties', expanded: true });
    
    physicalFolder.addBinding(this.settings, 'metalness', {
      label: 'Metalness',
      min: 0,
      max: 1,
      step: 0.01,
    }).on('change', (ev: any) => {
      this.callbacks.onMaterialPropertyChange?.('metalness', ev.value);
    });
    
    physicalFolder.addBinding(this.settings, 'roughness', {
      label: 'Roughness',
      min: 0,
      max: 1,
      step: 0.01,
    }).on('change', (ev: any) => {
      this.callbacks.onMaterialPropertyChange?.('roughness', ev.value);
    });
    
    // Advanced properties
    const advancedFolder = folder.addFolder({ title: 'Advanced', expanded: false });
    
    advancedFolder.addBinding(this.settings, 'emissive', {
      label: 'Emissive',
      min: 0,
      max: 10,
      step: 0.1,
    }).on('change', (ev: any) => {
      this.callbacks.onMaterialPropertyChange?.('emissive', ev.value);
    });
    
    advancedFolder.addBinding(this.settings, 'transmission', {
      label: 'Transmission',
      min: 0,
      max: 1,
      step: 0.01,
    }).on('change', (ev: any) => {
      this.callbacks.onMaterialPropertyChange?.('transmission', ev.value);
    });
    
    advancedFolder.addBinding(this.settings, 'ior', {
      label: 'IOR',
      min: 1.0,
      max: 3.0,
      step: 0.01,
    }).on('change', (ev: any) => {
      this.callbacks.onMaterialPropertyChange?.('ior', ev.value);
    });
    
    advancedFolder.addBinding(this.settings, 'iridescence', {
      label: 'Iridescence',
      min: 0,
      max: 1,
      step: 0.01,
    }).on('change', (ev: any) => {
      this.callbacks.onMaterialPropertyChange?.('iridescence', ev.value);
    });
  }
  
  /**
   * Color Section
   */
  private buildColorSection(): void {
    const folder = this.pane.addFolder({ title: '🌈 Color', expanded: true });
    
    folder.addBinding(this.settings, 'colorMode', {
      label: 'Mode',
      options: {
        'Velocity': ColorMode.VELOCITY,
        'Density': ColorMode.DENSITY,
        'Material Type': ColorMode.MATERIAL_TYPE,
        'Custom Gradient': ColorMode.CUSTOM_GRADIENT,
        'Gradient (Velocity)': ColorMode.GRADIENT_VELOCITY,
        'Gradient (Density)': ColorMode.GRADIENT_DENSITY,
        'Temperature': ColorMode.TEMPERATURE,
        'Height': ColorMode.HEIGHT,
      },
    }).on('change', (ev: any) => {
      this.callbacks.onColorModeChange?.(ev.value);
    });
    
    // Gradient selector
    const gradientNames = getGradientNames();
    const gradientOptions: Record<string, string> = {};
    gradientNames.forEach(name => {
      gradientOptions[name] = name;
    });
    
    folder.addBinding(this.settings, 'colorGradient', {
      label: 'Gradient',
      options: gradientOptions,
    }).on('change', (ev: any) => {
      this.callbacks.onColorGradientChange?.(ev.value);
    });
    
    folder.addButton({ title: '🎨 Edit Gradient...' }).on('click', () => {
      this.openGradientEditor();
    });
    
    folder.addBlade({ view: 'separator' });
    
    // Color adjustments
    const adjustFolder = folder.addFolder({ title: 'Adjustments', expanded: true });
    
    adjustFolder.addBinding(this.settings, 'colorCycleSpeed', {
      label: 'Cycle Speed',
      min: 0,
      max: 1,
      step: 0.01,
    });
    
    adjustFolder.addBinding(this.settings, 'brightness', {
      label: 'Brightness',
      min: 0,
      max: 2,
      step: 0.01,
    });
    
    adjustFolder.addBinding(this.settings, 'contrast', {
      label: 'Contrast',
      min: 0,
      max: 2,
      step: 0.01,
    });
    
    adjustFolder.addBinding(this.settings, 'saturation', {
      label: 'Saturation',
      min: 0,
      max: 2,
      step: 0.01,
    });
    
    adjustFolder.addBinding(this.settings, 'hueShift', {
      label: 'Hue Shift',
      min: 0,
      max: 360,
      step: 1,
    });
  }
  
  /**
   * Particle Appearance Section
   */
  private buildParticleSection(): void {
    const folder = this.pane.addFolder({ title: '✨ Particles', expanded: true });
    
    folder.addBinding(this.settings, 'particleSize', {
      label: 'Size',
      min: 0.1,
      max: 5,
      step: 0.1,
    }).on('change', (ev: any) => {
      this.callbacks.onSizeChange?.(ev.value);
    });
    
    folder.addBinding(this.settings, 'sizeVariation', {
      label: 'Size Variation',
      min: 0,
      max: 1,
      step: 0.01,
    });
    
    folder.addBlade({ view: 'separator' });
    
    folder.addBinding(this.settings, 'rotation', {
      label: 'Rotation',
      min: 0,
      max: 360,
      step: 1,
    });
    
    folder.addBinding(this.settings, 'rotationSpeed', {
      label: 'Rotation Speed',
      min: 0,
      max: 10,
      step: 0.1,
    });
    
    folder.addBlade({ view: 'separator' });
    
    folder.addBinding(this.settings, 'opacity', {
      label: 'Opacity',
      min: 0,
      max: 1,
      step: 0.01,
    });
  }
  
  /**
   * Effects Section
   */
  private buildEffectsSection(): void {
    const folder = this.pane.addFolder({ title: '💫 Effects', expanded: false });
    
    // Trails
    const trailFolder = folder.addFolder({ title: 'Trails', expanded: true });
    
    trailFolder.addBinding(this.settings, 'trailsEnabled', { label: 'Enable' });
    
    trailFolder.addBinding(this.settings, 'trailLength', {
      label: 'Length',
      min: 2,
      max: 64,
      step: 1,
    });
    
    trailFolder.addBinding(this.settings, 'trailWidthFalloff', {
      label: 'Width Falloff',
      min: 0,
      max: 1,
      step: 0.01,
    });
    
    trailFolder.addBinding(this.settings, 'trailAlphaFalloff', {
      label: 'Alpha Falloff',
      min: 0,
      max: 1,
      step: 0.01,
    });
    
    folder.addBlade({ view: 'separator' });
    
    // Glow
    const glowFolder = folder.addFolder({ title: 'Glow', expanded: true });
    
    glowFolder.addBinding(this.settings, 'glowEnabled', { label: 'Enable' });
    
    glowFolder.addBinding(this.settings, 'glowIntensity', {
      label: 'Intensity',
      min: 0,
      max: 5,
      step: 0.1,
    });
    
    folder.addBlade({ view: 'separator' });
    
    // Other effects
    folder.addBinding(this.settings, 'softParticles', { label: 'Soft Particles' });
  }
  
  /**
   * Sprite Settings Section
   */
  private buildSpriteSection(): void {
    const folder = this.pane.addFolder({ title: '🖼️ Sprite', expanded: false });
    
    folder.addBinding(this.settings, 'billboardMode', {
      label: 'Billboard Mode',
      options: {
        'Camera': 'camera',
        'Velocity': 'velocity',
        'Axis': 'axis',
      },
    });
    
    folder.addBinding(this.settings, 'blendMode', {
      label: 'Blend Mode',
      options: {
        'Alpha': 'alpha',
        'Additive': 'additive',
        'Multiply': 'multiply',
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
    
    folder.addBinding(this.settings, 'spriteTexture', {
      label: 'Texture',
      options: textureOptions,
    });
  }
  
  /**
   * Debug Section
   */
  private buildDebugSection(): void {
    const folder = this.pane.addFolder({ title: '🔍 Debug', expanded: false });
    
    folder.addBinding(this.settings, 'showGrid', { label: 'Show Grid' });
    folder.addBinding(this.settings, 'showForceFields', { label: 'Show Force Fields' });
    folder.addBinding(this.settings, 'showBoundaries', { label: 'Show Boundaries' });
    folder.addBinding(this.settings, 'showVelocity', { label: 'Show Velocity' });
    folder.addBinding(this.settings, 'wireframe', { label: 'Wireframe' });
  }
  
  /**
   * Quick Actions Section
   */
  private buildQuickActions(): void {
    const folder = this.pane.addFolder({ title: '⚡ Quick Actions', expanded: false });
    
    folder.addButton({ title: '🎬 Performance Mode' }).on('click', () => {
      this.applyPerformanceMode();
    });
    
    folder.addButton({ title: '💎 Quality Mode' }).on('click', () => {
      this.applyQualityMode();
    });
    
    folder.addBlade({ view: 'separator' });
    
    folder.addButton({ title: '🔥 Fire Preset' }).on('click', () => {
      this.applyMaterialPreset('FIREFLY');
    });
    
    folder.addButton({ title: '💧 Water Preset' }).on('click', () => {
      this.applyMaterialPreset('WATER_DROPLET');
    });
    
    folder.addButton({ title: '✨ Magic Preset' }).on('click', () => {
      this.applyMaterialPreset('MAGIC_SPARK');
    });
    
    folder.addBlade({ view: 'separator' });
    
    folder.addButton({ title: '↺ Reset to Defaults' }).on('click', () => {
      this.resetToDefaults();
    });
  }
  
  /**
   * Apply material preset
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
    
    this.pane.refresh();
    
    this.callbacks.onMaterialPresetChange?.(preset);
    this.callbacks.onRenderModeChange?.(preset.renderMode);
    this.callbacks.onColorModeChange?.(preset.colorMode);
  }
  
  /**
   * Apply performance mode
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
   * Apply quality mode
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
   * Reset to defaults
   */
  private resetToDefaults(): void {
    Object.assign(this.settings, {
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
      colorMode: ColorMode.VELOCITY,
      colorGradient: 'RAINBOW',
      colorCycleSpeed: 0.05,
      brightness: 1.0,
      contrast: 1.0,
      saturation: 1.0,
      hueShift: 0.0,
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
      billboardMode: 'camera',
      blendMode: 'alpha',
      spriteTexture: 'builtin_circle',
      showGrid: false,
      showForceFields: false,
      showBoundaries: false,
      showVelocity: false,
      wireframe: false,
    });
    
    this.pane.refresh();
  }
  
  /**
   * Open preset browser (placeholder)
   */
  private openPresetBrowser(): void {
    const categories = getCategories();
    console.log('📁 Preset Browser');
    console.log('Categories:', categories);
    alert(`Preset Browser\n\nCategories:\n${categories.map(c => `• ${c}`).join('\n')}\n\n(Full UI coming soon!)`);
  }
  
  /**
   * Open gradient editor (placeholder)
   */
  private openGradientEditor(): void {
    const gradients = getGradientNames();
    console.log('🎨 Gradient Editor');
    console.log('Available gradients:', gradients);
    alert('Gradient Editor\n\nThis feature is coming soon!\n\nYou can select from existing gradients or create custom ones.');
  }
  
  /**
   * Set renderer manager reference
   */
  public setRendererManager(manager: RendererManager): void {
    this.rendererManager = manager;
  }

  /**
   * Sync render mode when changed externally
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
