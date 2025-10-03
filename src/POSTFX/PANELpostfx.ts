/**
 * POSTFX/PANELpostfx.ts - Refined Post-Effects Control Panel
 */

import type { FlowConfig } from '../config';
import type { Dashboard } from '../PANEL/dashboard';

export interface PostFXPanelCallbacks {
  onBloomChange?: (config: FlowConfig['bloom']) => void;
  onRadialFocusChange?: (config: FlowConfig['radialFocus']) => void;
  onRadialCAChange?: (config: FlowConfig['radialCA']) => void;
}

export class PostFXPanel {
  private pane: any;
  private config: FlowConfig;
  private callbacks: PostFXPanelCallbacks;

  constructor(
    dashboard: Dashboard,
    config: FlowConfig,
    callbacks: PostFXPanelCallbacks = {}
  ) {
    this.config = config;
    this.callbacks = callbacks;

    const { pane } = dashboard.createPanel('postfx', {
      title: '✨ Post Effects',
      position: { x: window.innerWidth - 360, y: 16 },
      expanded: true,
      draggable: true,
      collapsible: true,
    });

    this.pane = pane;

    this.setupBloomControls();
    this.setupRadialFocusControls();
    this.setupRadialCAControls();
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
}
