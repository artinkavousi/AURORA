/**
 * PANEL/tabs/VisualsTab.ts - Visual controls tab
 * Migrated and enhanced from PARTICLESYSTEM/PANEL/PANELvisuals.ts
 */

import type { Pane } from 'tweakpane';
import type { FlowConfig } from '../../config';
import { BaseTab, type BaseCallbacks } from '../types';
import { ParticleRenderMode, RendererManager } from '../../PARTICLESYSTEM/RENDERER/renderercore';
import { ColorMode } from '../../PARTICLESYSTEM/visuals/colormodes';
import { getGradientNames } from '../../PARTICLESYSTEM/visuals/colorpalette';
import { 
  VISUAL_MATERIAL_PRESETS, 
  getVisualPresetNames,
  type VisualMaterialProperties 
} from '../../PARTICLESYSTEM/visuals/materialvisuals';
import { TextureManager } from '../../PARTICLESYSTEM/textures/texturemanager';

export interface VisualsTabCallbacks extends BaseCallbacks {
  onRenderModeChange?: (mode: ParticleRenderMode) => void;
  onMaterialPresetChange?: (preset: VisualMaterialProperties) => void;
  onColorModeChange?: (mode: ColorMode) => void;
  onColorGradientChange?: (gradientName: string) => void;
  onSizeChange?: (size: number) => void;
  onMaterialPropertyChange?: (property: string, value: number) => void;
}

export class VisualsTab extends BaseTab {
  private rendererManager: RendererManager | null = null;
  private textureManager: TextureManager;
  
  public settings = {
    renderMode: ParticleRenderMode.MESH,
    quality: 'high' as 'low' | 'medium' | 'high' | 'ultra',
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

  constructor(pane: Pane, config: FlowConfig, callbacks: VisualsTabCallbacks = {}) {
    super(pane, config, callbacks);
    this.textureManager = new TextureManager();
  }

  buildUI(): void {
    this.setupRendererSection();
    this.setupMaterialSection();
    this.setupColorSection();
    this.setupParticleAppearance();
    this.setupEffectsSection();
    this.setupSpriteSettings();
    this.setupDebugSection();
    this.setupQuickActions();
  }

  private setupRendererSection(): void {
    const folder = this.createFolder('🖼️ Renderer', true);
    
    this.createList(
      'Mode',
      this.settings.renderMode,
      {
        'Point': ParticleRenderMode.POINT,
        'Sprite': ParticleRenderMode.SPRITE,
        'Mesh': ParticleRenderMode.MESH,
        'Trail': ParticleRenderMode.TRAIL,
      },
      (value: number) => {
        this.settings.renderMode = value;
        (this.callbacks as VisualsTabCallbacks).onRenderModeChange?.(value);
      }
    );
    
    this.createList(
      'Quality',
      this.settings.quality,
      {
        'Low': 'low',
        'Medium': 'medium',
        'High': 'high',
        'Ultra': 'ultra',
      },
      (value: string) => {
        this.settings.quality = value as any;
      }
    );
    
    this.createBinding(this.settings, 'lodEnabled', { label: 'LOD (Auto Quality)' });
    this.createBinding(this.settings, 'cullingEnabled', { label: 'GPU Culling' });
    this.createBinding(this.settings, 'sortingEnabled', { label: 'Depth Sorting' });
  }

  private setupMaterialSection(): void {
    const folder = this.createFolder('🎭 Material Properties', true);
    
    const presetNames = getVisualPresetNames();
    const presetOptions: Record<string, string> = {};
    presetNames.forEach(name => {
      presetOptions[name] = name;
    });
    
    this.createList(
      'Preset',
      this.settings.materialPreset,
      presetOptions,
      (value: string) => {
        this.applyMaterialPreset(value);
      }
    );
    
    this.createButton('📁 Browse Presets...', () => this.openPresetBrowser());
    this.createSeparator();
    
    this.createBinding(
      this.settings,
      'metalness',
      { label: 'Metalness', min: 0, max: 1, step: 0.01 },
      (value: number) => (this.callbacks as VisualsTabCallbacks).onMaterialPropertyChange?.('metalness', value)
    );
    
    this.createBinding(
      this.settings,
      'roughness',
      { label: 'Roughness', min: 0, max: 1, step: 0.01 },
      (value: number) => (this.callbacks as VisualsTabCallbacks).onMaterialPropertyChange?.('roughness', value)
    );
    
    this.createBinding(
      this.settings,
      'emissive',
      { label: 'Emissive', min: 0, max: 10, step: 0.1 },
      (value: number) => (this.callbacks as VisualsTabCallbacks).onMaterialPropertyChange?.('emissive', value)
    );
    
    this.createBinding(
      this.settings,
      'transmission',
      { label: 'Transmission', min: 0, max: 1, step: 0.01 },
      (value: number) => (this.callbacks as VisualsTabCallbacks).onMaterialPropertyChange?.('transmission', value)
    );
    
    this.createBinding(
      this.settings,
      'ior',
      { label: 'IOR', min: 1.0, max: 3.0, step: 0.01 },
      (value: number) => (this.callbacks as VisualsTabCallbacks).onMaterialPropertyChange?.('ior', value)
    );
    
    this.createBinding(
      this.settings,
      'iridescence',
      { label: 'Iridescence', min: 0, max: 1, step: 0.01 },
      (value: number) => (this.callbacks as VisualsTabCallbacks).onMaterialPropertyChange?.('iridescence', value)
    );
  }

  private setupColorSection(): void {
    const folder = this.createFolder('🌈 Color System', true);
    
    this.createList(
      'Mode',
      this.settings.colorMode,
      {
        'Velocity (HSV)': ColorMode.VELOCITY,
        'Density': ColorMode.DENSITY,
        'Material Type': ColorMode.MATERIAL,
        'Custom Gradient': ColorMode.GRADIENT,
        'Gradient (Velocity)': ColorMode.GRADIENT_VELOCITY,
        'Gradient (Density)': ColorMode.GRADIENT_DENSITY,
        'Temperature': ColorMode.TEMPERATURE,
        'Height': ColorMode.HEIGHT,
      },
      (value: number) => {
        this.settings.colorMode = value;
        (this.callbacks as VisualsTabCallbacks).onColorModeChange?.(value);
      }
    );
    
    const gradientNames = getGradientNames();
    const gradientOptions: Record<string, string> = {};
    gradientNames.forEach(name => {
      gradientOptions[name] = name;
    });
    
    this.createList(
      'Gradient',
      this.settings.colorGradient,
      gradientOptions,
      (value: string) => {
        this.settings.colorGradient = value;
        (this.callbacks as VisualsTabCallbacks).onColorGradientChange?.(value);
      }
    );
    
    this.createButton('🎨 Edit Gradient...', () => this.openGradientEditor());
    this.createSeparator();
    
    this.createBinding(this.settings, 'colorCycleSpeed', { label: 'Cycle Speed', min: 0, max: 1, step: 0.01 });
    this.createBinding(this.settings, 'brightness', { label: 'Brightness', min: 0, max: 2, step: 0.01 });
    this.createBinding(this.settings, 'contrast', { label: 'Contrast', min: 0, max: 2, step: 0.01 });
    this.createBinding(this.settings, 'saturation', { label: 'Saturation', min: 0, max: 2, step: 0.01 });
  }

  private setupParticleAppearance(): void {
    const folder = this.createFolder('✨ Particle Appearance', true);
    
    this.createBinding(
      this.settings,
      'particleSize',
      { label: 'Size', min: 0.1, max: 5, step: 0.1 },
      (value: number) => (this.callbacks as VisualsTabCallbacks).onSizeChange?.(value)
    );
    
    this.createBinding(this.settings, 'sizeVariation', { label: 'Size Variation', min: 0, max: 1, step: 0.01 });
    this.createBinding(this.settings, 'rotation', { label: 'Rotation', min: 0, max: 360, step: 1 });
    this.createBinding(this.settings, 'rotationSpeed', { label: 'Rotation Speed', min: 0, max: 10, step: 0.1 });
    this.createBinding(this.settings, 'opacity', { label: 'Opacity', min: 0, max: 1, step: 0.01 });
  }

  private setupEffectsSection(): void {
    const folder = this.createFolder('💫 Effects', true);
    
    this.createBinding(this.settings, 'trailsEnabled', { label: 'Trails' });
    this.createBinding(this.settings, 'trailLength', { label: 'Trail Length', min: 2, max: 64, step: 1 });
    this.createBinding(this.settings, 'trailWidthFalloff', { label: 'Trail Width Falloff', min: 0, max: 1, step: 0.01 });
    this.createBinding(this.settings, 'trailAlphaFalloff', { label: 'Trail Alpha Falloff', min: 0, max: 1, step: 0.01 });
    this.createSeparator();
    this.createBinding(this.settings, 'glowEnabled', { label: 'Glow' });
    this.createBinding(this.settings, 'glowIntensity', { label: 'Glow Intensity', min: 0, max: 5, step: 0.1 });
    this.createBinding(this.settings, 'softParticles', { label: 'Soft Particles' });
  }

  private setupSpriteSettings(): void {
    const folder = this.createFolder('🖼️ Sprite Settings', false);
    
    this.createList(
      'Billboard Mode',
      this.settings.billboardMode,
      {
        'Camera': 0,
        'Velocity': 1,
        'Axis': 2,
      },
      (value: number) => {
        this.settings.billboardMode = value;
      }
    );
    
    this.createList(
      'Blend Mode',
      this.settings.blendMode,
      {
        'Alpha': 0,
        'Additive': 1,
        'Multiply': 2,
      },
      (value: number) => {
        this.settings.blendMode = value;
      }
    );
    
    this.createList(
      'Texture',
      this.settings.spriteTexture,
      {
        'Circle': 'builtin_circle',
        'Square': 'builtin_square',
        'Star': 'builtin_star',
        'Hexagon': 'builtin_hexagon',
        'Spark': 'builtin_spark',
        'Smoke': 'builtin_smoke',
        'Flare': 'builtin_flare',
      },
      (value: string) => {
        this.settings.spriteTexture = value;
      }
    );
  }

  private setupDebugSection(): void {
    const folder = this.createFolder('🔍 Debug', false);
    
    this.createBinding(this.settings, 'showGrid', { label: 'Show Grid' });
    this.createBinding(this.settings, 'showForceFields', { label: 'Show Force Fields' });
    this.createBinding(this.settings, 'showBoundaries', { label: 'Show Boundaries' });
    this.createBinding(this.settings, 'showVelocity', { label: 'Show Velocity' });
    this.createBinding(this.settings, 'wireframe', { label: 'Wireframe' });
  }

  private setupQuickActions(): void {
    const folder = this.createFolder('⚡ Quick Actions', false);
    
    this.createButton('🎬 Performance Mode', () => this.applyPerformanceMode());
    this.createButton('💎 Quality Mode', () => this.applyQualityMode());
    this.createButton('🔥 Fire Preset', () => this.applyMaterialPreset('FIREFLY'));
    this.createButton('💧 Water Preset', () => this.applyMaterialPreset('WATER_DROPLET'));
    this.createButton('✨ Magic Preset', () => this.applyMaterialPreset('MAGIC_SPARK'));
    this.createSeparator();
    this.createButton('↺ Reset to Defaults', () => this.resetToDefaults());
  }

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
    
    (this.callbacks as VisualsTabCallbacks).onMaterialPresetChange?.(preset);
    (this.callbacks as VisualsTabCallbacks).onRenderModeChange?.(preset.renderMode);
    (this.callbacks as VisualsTabCallbacks).onColorModeChange?.(preset.colorMode);
  }

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
    (this.callbacks as VisualsTabCallbacks).onRenderModeChange?.(ParticleRenderMode.POINT);
  }

  private applyQualityMode(): void {
    this.settings.renderMode = ParticleRenderMode.MESH;
    this.settings.quality = 'ultra';
    this.settings.lodEnabled = false;
    this.settings.cullingEnabled = false;
    this.settings.sortingEnabled = true;
    this.settings.softParticles = true;
    
    this.pane.refresh();
    (this.callbacks as VisualsTabCallbacks).onRenderModeChange?.(ParticleRenderMode.MESH);
  }

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
      colorMode: ColorMode.VELOCITY,
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

  private openPresetBrowser(): void {
    console.log('[VisualsTab] Opening preset browser (not yet implemented)');
  }

  private openGradientEditor(): void {
    console.log('[VisualsTab] Opening gradient editor (not yet implemented)');
  }

  public setRendererManager(manager: RendererManager): void {
    this.rendererManager = manager;
  }

  public syncRenderMode(mode: ParticleRenderMode): void {
    this.settings.renderMode = mode;
    this.pane.refresh();
  }

  public getTextureManager(): TextureManager {
    return this.textureManager;
  }

  public dispose(): void {
    this.textureManager.dispose();
  }
}


