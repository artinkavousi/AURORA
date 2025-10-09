/**
 * PANEL/tabs/PostFXTab.ts - Post-processing effects controls tab
 * Migrated and enhanced from POSTFX/PANELpostfx.ts
 */

import type { Pane } from 'tweakpane';
import type { FlowConfig } from '../../config';
import { BaseTab, type BaseCallbacks } from '../types';

export interface PostFXTabCallbacks extends BaseCallbacks {
  onBloomChange?: (config: FlowConfig['bloom']) => void;
  onRadialFocusChange?: (config: FlowConfig['radialFocus']) => void;
  onRadialCAChange?: (config: FlowConfig['radialCA']) => void;
}

export class PostFXTab extends BaseTab {
  constructor(pane: Pane, config: FlowConfig, callbacks: PostFXTabCallbacks = {}) {
    super(pane, config, callbacks);
  }

  buildUI(): void {
    this.setupQuickPresets();
    this.setupBloomControls();
    this.setupDepthEffects();
    this.setupChromaticEffects();
    this.setupColorGrading();
  }
  
  private setupQuickPresets(): void {
    const folder = this.createFolder("🎬 Quick Presets", true);
    
    folder.addBlade({
      view: 'buttongrid',
      size: [2, 2],
      cells: (x: number, y: number) => {
        const presets = [
          ['✨ Dreamy', '🔥 Cinematic'],
          ['🌈 Vibrant', '⚫ Dark Mood']
        ];
        return { title: presets[y][x] };
      },
      label: 'Effect Presets',
    }).on('click', (ev: any) => {
      this.applyPreset(ev.index[1] * 2 + ev.index[0]);
    });
  }
  
  private applyPreset(index: number): void {
    const presets = [
      { // Dreamy
        bloom: { enabled: true, strength: 2.5, threshold: 0.3, radius: 2.5 },
        radialFocus: { enabled: true, focusRadius: 0.4, blurStrength: 0.15 },
        radialCA: { enabled: true, strength: 0.02 },
      },
      { // Cinematic
        bloom: { enabled: true, strength: 1.2, threshold: 0.6, radius: 1.5 },
        radialFocus: { enabled: true, focusRadius: 0.6, blurStrength: 0.08 },
        radialCA: { enabled: false },
      },
      { // Vibrant
        bloom: { enabled: true, strength: 3.5, threshold: 0.2, radius: 3.0 },
        radialFocus: { enabled: false },
        radialCA: { enabled: true, strength: 0.03 },
      },
      { // Dark Mood
        bloom: { enabled: true, strength: 1.0, threshold: 0.85, radius: 1.0 },
        radialFocus: { enabled: true, focusRadius: 0.3, blurStrength: 0.25 },
        radialCA: { enabled: true, strength: 0.015 },
      },
    ];
    
    if (index < presets.length) {
      const preset = presets[index];
      Object.assign(this.config.bloom, preset.bloom);
      Object.assign(this.config.radialFocus, preset.radialFocus);
      Object.assign(this.config.radialCA, preset.radialCA);
      
      (this.callbacks as PostFXTabCallbacks).onBloomChange?.(this.config.bloom);
      (this.callbacks as PostFXTabCallbacks).onRadialFocusChange?.(this.config.radialFocus);
      (this.callbacks as PostFXTabCallbacks).onRadialCAChange?.(this.config.radialCA);
    }
  }

  private setupBloomControls(): void {
    const folder = this.createFolder("✨ Bloom & Glow", true);

    // Enable/disable
    const controlGroup = folder.addFolder({ title: 'Controls', expanded: true });
    controlGroup.addBinding(this.config.bloom, "enabled", { 
      label: "Enable Bloom" 
    }).on('change', () => {
      (this.callbacks as PostFXTabCallbacks).onBloomChange?.(this.config.bloom);
    });

    folder.addBlade({ view: 'separator' });

    // Main parameters
    const mainGroup = folder.addFolder({ title: 'Parameters', expanded: true });
    mainGroup.addBinding(this.config.bloom, "threshold", {
      label: "🎚️ Threshold",
      min: 0.0,
      max: 1.5,
      step: 0.01,
    }).on('change', () => {
      (this.callbacks as PostFXTabCallbacks).onBloomChange?.(this.config.bloom);
    });

    mainGroup.addBinding(this.config.bloom, "strength", {
      label: "💪 Strength",
      min: 0.0,
      max: 5.0,
      step: 0.05,
    }).on('change', () => {
      (this.callbacks as PostFXTabCallbacks).onBloomChange?.(this.config.bloom);
    });

    mainGroup.addBinding(this.config.bloom, "radius", {
      label: "📐 Radius",
      min: 0.0,
      max: 4.0,
      step: 0.05,
    }).on('change', () => {
      (this.callbacks as PostFXTabCallbacks).onBloomChange?.(this.config.bloom);
    });

    // Blend mode
    folder.addBlade({ view: 'separator' });
    this.createList(
      "Blend Mode",
      this.config.bloom.blendMode,
      {
        '➕ Add': 'add',
        '🖥️ Screen': 'screen',
        '🌟 Soft Light': 'softlight',
      },
      (value: string) => {
        this.config.bloom.blendMode = value as any;
        (this.callbacks as PostFXTabCallbacks).onBloomChange?.(this.config.bloom);
      }
    );
  }

  private setupDepthEffects(): void {
    const folder = this.createFolder("🎯 Depth of Field", true);
    
    this.setupRadialFocusControls(folder);
  }
  
  private setupRadialFocusControls(parentFolder: any): void {
    const folder = parentFolder.addFolder({ title: 'Radial Focus', expanded: true });
    if (!folder || typeof folder.addBlade !== 'function') {
      return;
    }

    this.createBinding(
      this.config.radialFocus,
      "enabled",
      { label: "Enable" },
      () => (this.callbacks as PostFXTabCallbacks).onRadialFocusChange?.(this.config.radialFocus)
    );

    folder.addBlade({ view: 'separator' });

    const centerFolder = folder.addFolder({ title: "Focus Center", expanded: false });
    if (!centerFolder || typeof centerFolder.addBinding !== 'function') {
      return;
    }

    centerFolder.addBinding(this.config.radialFocus.focusCenter, "x", {
      label: "X",
      min: 0.0,
      max: 1.0,
      step: 0.01,
    }).on('change', () => {
      (this.callbacks as PostFXTabCallbacks).onRadialFocusChange?.(this.config.radialFocus);
    });

    centerFolder.addBinding(this.config.radialFocus.focusCenter, "y", {
      label: "Y",
      min: 0.0,
      max: 1.0,
      step: 0.01,
    }).on('change', () => {
      (this.callbacks as PostFXTabCallbacks).onRadialFocusChange?.(this.config.radialFocus);
    });

    folder.addBlade({ view: 'separator' });

    this.createBinding(
      this.config.radialFocus,
      "focusRadius",
      { label: "Focus Radius", min: 0.0, max: 1.0, step: 0.01 },
      () => (this.callbacks as PostFXTabCallbacks).onRadialFocusChange?.(this.config.radialFocus)
    );

    this.createBinding(
      this.config.radialFocus,
      "falloffPower",
      { label: "Falloff Power", min: 0.1, max: 8.0, step: 0.1 },
      () => (this.callbacks as PostFXTabCallbacks).onRadialFocusChange?.(this.config.radialFocus)
    );

    this.createBinding(
      this.config.radialFocus,
      "blurStrength",
      { label: "Blur Strength", min: 0.0, max: 0.5, step: 0.01 },
      () => (this.callbacks as PostFXTabCallbacks).onRadialFocusChange?.(this.config.radialFocus)
    );
  }

  private setupChromaticEffects(): void {
    const folder = this.createFolder("🌈 Chromatic Effects", false);
    
    this.setupRadialCAControls(folder);
  }
  
  private setupRadialCAControls(parentFolder: any): void {
    const folder = parentFolder.addFolder({ title: 'Chromatic Aberration', expanded: true });

    folder.addBinding(this.config.radialCA, "enabled", { 
      label: "Enable" 
    }).on('change', () => {
      (this.callbacks as PostFXTabCallbacks).onRadialCAChange?.(this.config.radialCA);
    });

    folder.addBlade({ view: 'separator' });

    folder.addBinding(this.config.radialCA, "strength", {
      label: "💫 Strength",
      min: 0.0,
      max: 0.1,
      step: 0.001,
    }).on('change', () => {
      (this.callbacks as PostFXTabCallbacks).onRadialCAChange?.(this.config.radialCA);
    });

    folder.addBinding(this.config.radialCA, "angle", {
      label: "🔄 Angle",
      min: -Math.PI,
      max: Math.PI,
      step: 0.05,
    }).on('change', () => {
      (this.callbacks as PostFXTabCallbacks).onRadialCAChange?.(this.config.radialCA);
    });

    folder.addBlade({ view: 'separator' });

    folder.addBinding(this.config.radialCA, "edgeIntensity", {
      label: "📊 Edge Intensity",
      min: 0.0,
      max: 10.0,
      step: 0.1,
    }).on('change', () => {
      (this.callbacks as PostFXTabCallbacks).onRadialCAChange?.(this.config.radialCA);
    });

    folder.addBinding(this.config.radialCA, "falloffPower", {
      label: "📉 Falloff Power",
      min: 0.5,
      max: 10.0,
      step: 0.1,
    }).on('change', () => {
      (this.callbacks as PostFXTabCallbacks).onRadialCAChange?.(this.config.radialCA);
    });
  }
  
  private setupColorGrading(): void {
    const folder = this.createFolder("🎨 Color Grading", false);
    
    const colorState = {
      exposure: 1.0,
      contrast: 1.0,
      saturation: 1.0,
      temperature: 0.0,
      tint: 0.0,
      vignette: 0.0,
    };
    
    const exposureGroup = folder.addFolder({ title: 'Tone Mapping', expanded: true });
    exposureGroup.addBinding(colorState, 'exposure', {
      label: '☀️ Exposure',
      min: 0.1,
      max: 3.0,
      step: 0.05,
    });
    
    exposureGroup.addBinding(colorState, 'contrast', {
      label: '◐ Contrast',
      min: 0.5,
      max: 2.0,
      step: 0.05,
    });
    
    exposureGroup.addBinding(colorState, 'saturation', {
      label: '🌈 Saturation',
      min: 0.0,
      max: 2.0,
      step: 0.05,
    });
    
    folder.addBlade({ view: 'separator' });
    
    const colorGroup = folder.addFolder({ title: 'Color Balance', expanded: false });
    colorGroup.addBinding(colorState, 'temperature', {
      label: '🌡️ Temperature',
      min: -1.0,
      max: 1.0,
      step: 0.05,
    });
    
    colorGroup.addBinding(colorState, 'tint', {
      label: '🎨 Tint',
      min: -1.0,
      max: 1.0,
      step: 0.05,
    });
    
    folder.addBlade({ view: 'separator' });
    
    folder.addBinding(colorState, 'vignette', {
      label: '⚫ Vignette',
      min: 0.0,
      max: 1.0,
      step: 0.05,
    });
  }

  public dispose(): void {
    // Cleanup if needed
  }
}


