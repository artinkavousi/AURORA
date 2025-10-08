/**
 * POSTFX/PANELpostfx.ts - Refined Post-Effects Control Panel
 */

import type { Pane } from 'tweakpane';
import type { FlowConfig } from '../config';

export interface PostFXPanelCallbacks {
  onBloomChange?: (config: FlowConfig['bloom']) => void;
  onRadialFocusChange?: (config: FlowConfig['radialFocus']) => void;
  onRadialCAChange?: (config: FlowConfig['radialCA']) => void;
  onVignetteChange?: (config: any) => void;
  onFilmGrainChange?: (config: any) => void;
  onColorGradingChange?: (config: any) => void;
}

export class PostFXPanel {
  private pane: any;
  private config: FlowConfig;
  private callbacks: PostFXPanelCallbacks;

  constructor(
    pane: Pane,
    config: FlowConfig,
    callbacks: PostFXPanelCallbacks = {}
  ) {
    this.config = config;
    this.callbacks = callbacks;
    
    // Initialize default configs if not present
    if (!this.config.vignette) {
      this.config.vignette = {
        enabled: false,
        intensity: 0.5,
        smoothness: 0.5,
        roundness: 1.0
      };
    }
    if (!this.config.filmGrain) {
      this.config.filmGrain = {
        enabled: false,
        intensity: 0.05,
        size: 1.5,
        speed: 1.0
      };
    }
    if (!this.config.colorGrading) {
      this.config.colorGrading = {
        enabled: false,
        exposure: 1.0,
        contrast: 1.0,
        saturation: 1.0,
        brightness: 0.0,
        temperature: 0.0,
        tint: 0.0,
      shadows: new THREE.Vector3(1, 1, 1),
      midtones: new THREE.Vector3(1, 1, 1),
      highlights: new THREE.Vector3(1, 1, 1)
      };
    }

    // Use provided pane from unified panel system
    this.pane = pane;

    this.setupBloomControls();
    this.setupRadialFocusControls();
    this.setupRadialCAControls();
    this.setupVignetteControls();
    this.setupFilmGrainControls();
    this.setupColorGradingControls();
  }

  // ========================================
  // BLOOM (HDR-aware glow)
  // ========================================
  
  private setupBloomControls(): void {
    const folder = this.pane.addFolder({
      title: "✨ Bloom",
      expanded: true,
    });

    folder
      .addBinding(this.config.bloom, "enabled", { label: "Enable" })
      .on('change', () => this.callbacks.onBloomChange?.(this.config.bloom));

    folder.addBlade({ view: 'separator' });

    folder
      .addBinding(this.config.bloom, "threshold", { 
        label: "Threshold",
        min: 0.0, 
        max: 1.5, 
        step: 0.01 
      })
      .on('change', () => this.callbacks.onBloomChange?.(this.config.bloom));

    folder
      .addBinding(this.config.bloom, "strength", { 
        label: "Strength",
        min: 0.0, 
        max: 5.0, 
        step: 0.05 
      })
      .on('change', () => this.callbacks.onBloomChange?.(this.config.bloom));

    folder
      .addBinding(this.config.bloom, "radius", { 
        label: "Radius",
        min: 0.0, 
        max: 4.0, 
        step: 0.05 
      })
      .on('change', () => this.callbacks.onBloomChange?.(this.config.bloom));

    folder
      .addBinding(this.config.bloom, "blendMode", {
        label: "Blend Mode",
        options: {
          'Add': 'add',
          'Screen': 'screen',
          'Soft Light': 'softlight',
        }
      })
      .on('change', () => this.callbacks.onBloomChange?.(this.config.bloom));
  }

  // ========================================
  // RADIAL FOCUS/BLUR (sharp center → blurred edges)
  // ========================================
  
  private setupRadialFocusControls(): void {
    const folder = this.pane.addFolder({
      title: "🎯 Radial Focus",
      expanded: false,
    });

    folder
      .addBinding(this.config.radialFocus, "enabled", { label: "Enable" })
      .on('change', () => this.callbacks.onRadialFocusChange?.(this.config.radialFocus));

    folder.addBlade({ view: 'separator' });

    // Focus Center
    const centerFolder = folder.addFolder({
      title: "Focus Center",
      expanded: false,
    });

    centerFolder
      .addBinding(this.config.radialFocus.focusCenter, "x", {
        label: "X",
        min: 0.0,
        max: 1.0,
        step: 0.01,
      })
      .on('change', () => this.callbacks.onRadialFocusChange?.(this.config.radialFocus));

    centerFolder
      .addBinding(this.config.radialFocus.focusCenter, "y", {
        label: "Y",
        min: 0.0,
        max: 1.0,
        step: 0.01,
      })
      .on('change', () => this.callbacks.onRadialFocusChange?.(this.config.radialFocus));

    folder.addBlade({ view: 'separator' });

    folder
      .addBinding(this.config.radialFocus, "focusRadius", {
        label: "Focus Radius",
        min: 0.0,
        max: 1.0,
        step: 0.01,
      })
      .on('change', () => this.callbacks.onRadialFocusChange?.(this.config.radialFocus));

    folder
      .addBinding(this.config.radialFocus, "falloffPower", {
        label: "Falloff Power",
        min: 0.1,
        max: 8.0,
        step: 0.1,
      })
      .on('change', () => this.callbacks.onRadialFocusChange?.(this.config.radialFocus));

    folder
      .addBinding(this.config.radialFocus, "blurStrength", {
        label: "Blur Strength",
        min: 0.0,
        max: 0.5,
        step: 0.01,
      })
      .on('change', () => this.callbacks.onRadialFocusChange?.(this.config.radialFocus));
  }

  // ========================================
  // RADIAL CHROMATIC ABERRATION (color fringing at edges)
  // ========================================
  
  private setupRadialCAControls(): void {
    const folder = this.pane.addFolder({
      title: "🔴 Chromatic Aberration",
      expanded: false,
    });

    folder
      .addBinding(this.config.radialCA, "enabled", { label: "Enable" })
      .on('change', () => this.callbacks.onRadialCAChange?.(this.config.radialCA));

    folder.addBlade({ view: 'separator' });

    folder
      .addBinding(this.config.radialCA, "strength", { 
        label: "Strength",
        min: 0.0, 
        max: 0.1, 
        step: 0.001 
      })
      .on('change', () => this.callbacks.onRadialCAChange?.(this.config.radialCA));

    folder
      .addBinding(this.config.radialCA, "angle", { 
        label: "Angle",
        min: -Math.PI, 
        max: Math.PI, 
        step: 0.05 
      })
      .on('change', () => this.callbacks.onRadialCAChange?.(this.config.radialCA));

    folder.addBlade({ view: 'separator' });

    folder
      .addBinding(this.config.radialCA, "edgeIntensity", {
        label: "Edge Intensity",
        min: 0.0,
        max: 10.0,
        step: 0.1,
      })
      .on('change', () => this.callbacks.onRadialCAChange?.(this.config.radialCA));

    folder
      .addBinding(this.config.radialCA, "falloffPower", {
        label: "Falloff Power",
        min: 0.5,
        max: 10.0,
        step: 0.1,
      })
      .on('change', () => this.callbacks.onRadialCAChange?.(this.config.radialCA));
  }
  
  // ========================================
  // VIGNETTE (radial darkening)
  // ========================================
  
  private setupVignetteControls(): void {
    const folder = this.pane.addFolder({
      title: "🌑 Vignette",
      expanded: false,
    });

    folder
      .addBinding(this.config.vignette, "enabled", { label: "Enable" })
      .on('change', () => this.callbacks.onVignetteChange?.(this.config.vignette));

    folder.addBlade({ view: 'separator' });

    folder
      .addBinding(this.config.vignette, "intensity", { 
        label: "Intensity",
        min: 0.0, 
        max: 1.0, 
        step: 0.01 
      })
      .on('change', () => this.callbacks.onVignetteChange?.(this.config.vignette));

    folder
      .addBinding(this.config.vignette, "smoothness", { 
        label: "Smoothness",
        min: 0.0, 
        max: 1.0, 
        step: 0.01 
      })
      .on('change', () => this.callbacks.onVignetteChange?.(this.config.vignette));

    folder
      .addBinding(this.config.vignette, "roundness", {
        label: "Roundness",
        min: 0.5,
        max: 2.0,
        step: 0.1,
      })
      .on('change', () => this.callbacks.onVignetteChange?.(this.config.vignette));
  }
  
  // ========================================
  // FILM GRAIN (temporal noise)
  // ========================================
  
  private setupFilmGrainControls(): void {
    const folder = this.pane.addFolder({
      title: "🎞️ Film Grain",
      expanded: false,
    });

    folder
      .addBinding(this.config.filmGrain, "enabled", { label: "Enable" })
      .on('change', () => this.callbacks.onFilmGrainChange?.(this.config.filmGrain));

    folder.addBlade({ view: 'separator' });

    folder
      .addBinding(this.config.filmGrain, "intensity", { 
        label: "Intensity",
        min: 0.0, 
        max: 0.2, 
        step: 0.001 
      })
      .on('change', () => this.callbacks.onFilmGrainChange?.(this.config.filmGrain));

    folder
      .addBinding(this.config.filmGrain, "size", { 
        label: "Grain Size",
        min: 0.5, 
        max: 5.0, 
        step: 0.1 
      })
      .on('change', () => this.callbacks.onFilmGrainChange?.(this.config.filmGrain));
  }
  
  // ========================================
  // COLOR GRADING (professional color correction)
  // ========================================
  
  private setupColorGradingControls(): void {
    const folder = this.pane.addFolder({
      title: "🎨 Color Grading",
      expanded: false,
    });

    folder
      .addBinding(this.config.colorGrading, "enabled", { label: "Enable" })
      .on('change', () => this.callbacks.onColorGradingChange?.(this.config.colorGrading));

    folder.addBlade({ view: 'separator' });
    
    // Basic controls
    const basicFolder = folder.addFolder({
      title: "Basic",
      expanded: true,
    });

    basicFolder
      .addBinding(this.config.colorGrading, "exposure", { 
        label: "Exposure",
        min: 0.1, 
        max: 3.0, 
        step: 0.01 
      })
      .on('change', () => this.callbacks.onColorGradingChange?.(this.config.colorGrading));

    basicFolder
      .addBinding(this.config.colorGrading, "contrast", { 
        label: "Contrast",
        min: 0.0, 
        max: 2.0, 
        step: 0.01 
      })
      .on('change', () => this.callbacks.onColorGradingChange?.(this.config.colorGrading));

    basicFolder
      .addBinding(this.config.colorGrading, "saturation", { 
        label: "Saturation",
        min: 0.0, 
        max: 2.0, 
        step: 0.01 
      })
      .on('change', () => this.callbacks.onColorGradingChange?.(this.config.colorGrading));

    basicFolder
      .addBinding(this.config.colorGrading, "brightness", {
        label: "Brightness",
        min: -1.0,
        max: 1.0,
        step: 0.01,
      })
      .on('change', () => this.callbacks.onColorGradingChange?.(this.config.colorGrading));
    
    // Temperature & Tint
    const tempFolder = folder.addFolder({
      title: "Temperature & Tint",
      expanded: false,
    });

    tempFolder
      .addBinding(this.config.colorGrading, "temperature", {
        label: "Temperature",
        min: -1.0,
        max: 1.0,
        step: 0.01,
      })
      .on('change', () => this.callbacks.onColorGradingChange?.(this.config.colorGrading));

    tempFolder
      .addBinding(this.config.colorGrading, "tint", {
        label: "Tint",
        min: -1.0,
        max: 1.0,
        step: 0.01,
      })
      .on('change', () => this.callbacks.onColorGradingChange?.(this.config.colorGrading));
    
    // Advanced lift-gamma-gain controls
    const advancedFolder = folder.addFolder({
      title: "Advanced (LGG)",
      expanded: false,
    });

    advancedFolder
      .addBinding(this.config.colorGrading, "shadows", {
        label: "Lift (Shadows)",
        x: { min: 0.5, max: 1.5, step: 0.01 },
        y: { min: 0.5, max: 1.5, step: 0.01 },
        z: { min: 0.5, max: 1.5, step: 0.01 },
      })
      .on('change', () => this.callbacks.onColorGradingChange?.(this.config.colorGrading));

    advancedFolder
      .addBinding(this.config.colorGrading, "midtones", {
        label: "Gamma (Midtones)",
        x: { min: 0.5, max: 1.5, step: 0.01 },
        y: { min: 0.5, max: 1.5, step: 0.01 },
        z: { min: 0.5, max: 1.5, step: 0.01 },
      })
      .on('change', () => this.callbacks.onColorGradingChange?.(this.config.colorGrading));

    advancedFolder
      .addBinding(this.config.colorGrading, "highlights", {
        label: "Gain (Highlights)",
        x: { min: 0.5, max: 1.5, step: 0.01 },
        y: { min: 0.5, max: 1.5, step: 0.01 },
        z: { min: 0.5, max: 1.5, step: 0.01 },
      })
      .on('change', () => this.callbacks.onColorGradingChange?.(this.config.colorGrading));
  }
}
