/**
 * POSTFX/PANELpostfx.ts - Post-Effects Control Panel
 */

import type { FlowConfig } from '../config';
import type { Dashboard } from '../PANEL/dashboard';

export interface PostFXPanelCallbacks {
  onBloomChange?: (config: FlowConfig['bloom']) => void;
  onRadialBlurChange?: (config: FlowConfig['radialBlur']) => void;
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
      position: { x: window.innerWidth - 340, y: 16 },
      expanded: true,
      draggable: true,
      collapsible: true,
    });

    this.pane = pane;

    this.setupBloomControls();
    this.setupRadialBlurControls();
    this.setupRadialCAControls();
  }

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
        max: 1.0, 
        step: 0.01 
      })
      .on('change', () => this.callbacks.onBloomChange?.(this.config.bloom));

    folder
      .addBinding(this.config.bloom, "strength", { 
        label: "Strength",
        min: 0.0, 
        max: 3.0, 
        step: 0.01 
      })
      .on('change', () => this.callbacks.onBloomChange?.(this.config.bloom));

    folder
      .addBinding(this.config.bloom, "radius", { 
        label: "Radius",
        min: 0.0, 
        max: 2.0, 
        step: 0.01 
      })
      .on('change', () => this.callbacks.onBloomChange?.(this.config.bloom));
  }

  private setupRadialBlurControls(): void {
    const folder = this.pane.addFolder({
      title: "🌀 Radial Blur",
      expanded: false,
    });

    folder
      .addBinding(this.config.radialBlur, "enabled", { label: "Enable" })
      .on('change', () => this.callbacks.onRadialBlurChange?.(this.config.radialBlur));

    folder.addBlade({ view: 'separator' });

    folder
      .addBinding(this.config.radialBlur, "strength", { 
        label: "Strength",
        min: 0.0, 
        max: 0.3, 
        step: 0.01 
      })
      .on('change', () => this.callbacks.onRadialBlurChange?.(this.config.radialBlur));
  }

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
        max: 0.05, 
        step: 0.001 
      })
      .on('change', () => this.callbacks.onRadialCAChange?.(this.config.radialCA));

    folder
      .addBinding(this.config.radialCA, "angle", { 
        label: "Angle",
        min: -Math.PI, 
        max: Math.PI, 
        step: 0.01 
      })
      .on('change', () => this.callbacks.onRadialCAChange?.(this.config.radialCA));
  }
}
