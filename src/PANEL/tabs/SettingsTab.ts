/**
 * PANEL/tabs/SettingsTab.ts - Application settings and theme editor
 * NEW - Dashboard configuration and app preferences
 */

import type { Pane } from 'tweakpane';
import type { FlowConfig } from '../../config';
import { BaseTab, type BaseCallbacks } from '../types';
import { DEFAULT_THEME, THEME_PRESETS, type DashboardTheme } from '../theme';

export interface SettingsTabCallbacks extends BaseCallbacks {
  onThemeChange?: (theme: Partial<DashboardTheme>) => void;
  onDockChange?: (dock: 'left' | 'right' | 'bottom') => void;
  onClearStorage?: () => void;
}

export class SettingsTab extends BaseTab {
  private themeState: DashboardTheme = { ...DEFAULT_THEME };

  constructor(pane: Pane, config: FlowConfig, callbacks: SettingsTabCallbacks = {}) {
    super(pane, config, callbacks);
  }

  buildUI(): void {
    this.setupThemeControls();
    this.setupViewportControls();
    this.setupPerformanceControls();
    this.setupDataPrivacy();
    this.setupAbout();
  }

  private setupThemeControls(): void {
    const folder = this.createFolder('🎨 Theme Editor', true);
    if (!folder || typeof folder.addBinding !== 'function') {
      return;
    }
    
    // Theme presets
    this.createList(
      'Preset',
      'Aurora',
      {
        'Aurora': 'Aurora',
        'Amethyst': 'Amethyst',
        'Emerald': 'Emerald',
        'Rose': 'Rose',
        'Amber': 'Amber',
      },
      (value: string) => {
        const preset = THEME_PRESETS[value];
        if (preset) {
          this.themeState = { ...preset };
          this.pane.refresh();
          (this.callbacks as SettingsTabCallbacks).onThemeChange?.(preset);
        }
      }
    );
    
    folder.addBlade({ view: 'separator' });
    
    // Accent color
    folder.addBinding(this.themeState, 'accent', {
      label: 'Accent Color',
    }).on('change', (ev: any) => {
      (this.callbacks as SettingsTabCallbacks).onThemeChange?.({ accent: ev.value });
    });
    
    // Background
    const bgFolder = folder.addFolder({ title: 'Background', expanded: false });
    if (!bgFolder || typeof bgFolder.addBinding !== 'function') {
      return;
    }
    
    bgFolder.addBinding(this.themeState, 'backgroundHue', {
      label: 'Hue',
      min: 0,
      max: 360,
      step: 1,
    }).on('change', (ev: any) => {
      (this.callbacks as SettingsTabCallbacks).onThemeChange?.({ backgroundHue: ev.value });
    });
    
    bgFolder.addBinding(this.themeState, 'backgroundSaturation', {
      label: 'Saturation',
      min: 0,
      max: 1,
      step: 0.01,
    }).on('change', (ev: any) => {
      (this.callbacks as SettingsTabCallbacks).onThemeChange?.({ backgroundSaturation: ev.value });
    });
    
    bgFolder.addBinding(this.themeState, 'backgroundLightness', {
      label: 'Lightness',
      min: 0,
      max: 1,
      step: 0.01,
    }).on('change', (ev: any) => {
      (this.callbacks as SettingsTabCallbacks).onThemeChange?.({ backgroundLightness: ev.value });
    });
    
    // Glass effect
    const glassFolder = folder.addFolder({ title: 'Glass Effect', expanded: false });
    if (!glassFolder || typeof glassFolder.addBinding !== 'function') {
      return;
    }
    
    glassFolder.addBinding(this.themeState, 'glassOpacity', {
      label: 'Opacity',
      min: 0,
      max: 1,
      step: 0.01,
    }).on('change', (ev: any) => {
      (this.callbacks as SettingsTabCallbacks).onThemeChange?.({ glassOpacity: ev.value });
    });
    
    glassFolder.addBinding(this.themeState, 'glassBlur', {
      label: 'Blur',
      min: 0,
      max: 100,
      step: 1,
    }).on('change', (ev: any) => {
      (this.callbacks as SettingsTabCallbacks).onThemeChange?.({ glassBlur: ev.value });
    });
    
    glassFolder.addBinding(this.themeState, 'glassSaturation', {
      label: 'Saturation',
      min: 0,
      max: 5,
      step: 0.1,
    }).on('change', (ev: any) => {
      (this.callbacks as SettingsTabCallbacks).onThemeChange?.({ glassSaturation: ev.value });
    });
    
    glassFolder.addBinding(this.themeState, 'glassBrightness', {
      label: 'Brightness',
      min: 0,
      max: 3,
      step: 0.05,
    }).on('change', (ev: any) => {
      (this.callbacks as SettingsTabCallbacks).onThemeChange?.({ glassBrightness: ev.value });
    });
    
    // Visual properties
    const visualFolder = folder.addFolder({ title: 'Visual Properties', expanded: false });
    if (!visualFolder || typeof visualFolder.addBinding !== 'function') {
      return;
    }
    
    visualFolder.addBinding(this.themeState, 'radius', {
      label: 'Border Radius',
      min: 0,
      max: 48,
      step: 1,
    }).on('change', (ev: any) => {
      (this.callbacks as SettingsTabCallbacks).onThemeChange?.({ radius: ev.value });
    });
    
    visualFolder.addBinding(this.themeState, 'shadowStrength', {
      label: 'Shadow Strength',
      min: 0,
      max: 1,
      step: 0.05,
    }).on('change', (ev: any) => {
      (this.callbacks as SettingsTabCallbacks).onThemeChange?.({ shadowStrength: ev.value });
    });
    
    visualFolder.addBinding(this.themeState, 'highlightStrength', {
      label: 'Highlight Strength',
      min: 0,
      max: 1,
      step: 0.05,
    }).on('change', (ev: any) => {
      (this.callbacks as SettingsTabCallbacks).onThemeChange?.({ highlightStrength: ev.value });
    });
    
    visualFolder.addBinding(this.themeState, 'textBrightness', {
      label: 'Text Brightness',
      min: 0,
      max: 1,
      step: 0.05,
    }).on('change', (ev: any) => {
      (this.callbacks as SettingsTabCallbacks).onThemeChange?.({ textBrightness: ev.value });
    });
    
    folder.addBlade({ view: 'separator' });
    
    this.createButton('🔄 Reset Theme', () => {
      this.themeState = { ...DEFAULT_THEME };
      this.pane.refresh();
      (this.callbacks as SettingsTabCallbacks).onThemeChange?.(DEFAULT_THEME);
    });
  }

  private setupViewportControls(): void {
    const folder = this.createFolder('🖼️ Viewport', true);
    
    this.createList(
      'Dock Position',
      'right',
      {
        'Right': 'right',
        'Left': 'left',
        'Bottom': 'bottom',
      },
      (value: string) => {
        (this.callbacks as SettingsTabCallbacks).onDockChange?.(value as any);
      }
    );
    
    const settings = {
      autoSnap: true,
      collapseOnBlur: false,
    };
    
    this.createBinding(settings, 'autoSnap', { label: 'Auto-snap to Edges' });
    this.createBinding(settings, 'collapseOnBlur', { label: 'Collapse on Blur' });
  }

  private setupPerformanceControls(): void {
    const folder = this.createFolder('⚡ Performance', false);
    
    const perfSettings = {
      adaptiveQuality: false,
      targetFPS: 60,
      showOverlay: false,
    };
    
    this.createBinding(perfSettings, 'adaptiveQuality', { label: 'Adaptive Quality' });
    this.createBinding(perfSettings, 'targetFPS', {
      label: 'Target FPS',
      min: 30,
      max: 144,
      step: 1,
    });
    this.createBinding(perfSettings, 'showOverlay', { label: 'Show Performance Overlay' });
  }

  private setupDataPrivacy(): void {
    const folder = this.createFolder('🔐 Data & Privacy', false);
    
    const privacySettings = {
      saveSettings: true,
      analytics: false,
    };
    
    this.createBinding(privacySettings, 'saveSettings', { label: 'Save Settings Locally' });
    this.createBinding(privacySettings, 'analytics', { label: 'Anonymous Analytics' });
    
    folder.addBlade({ view: 'separator' });
    
    this.createButton('🗑️ Clear Local Storage', () => {
      if (confirm('Are you sure you want to clear all saved settings and presets?')) {
        (this.callbacks as SettingsTabCallbacks).onClearStorage?.();
        alert('Local storage cleared successfully!');
      }
    });
  }

  private setupAbout(): void {
    const folder = this.createFolder('ℹ️ About Aurora', true);
    if (!folder || typeof folder.addBinding !== 'function') {
      return;
    }
    
    const info = {
      version: '2.0.0',
      build: 'unified-dashboard',
      engine: 'Three.js WebGPU',
    };
    
    folder.addBinding(info, 'version', { label: 'Version', readonly: true });
    folder.addBinding(info, 'build', { label: 'Build', readonly: true });
    folder.addBinding(info, 'engine', { label: 'Engine', readonly: true });
    
    folder.addBlade({ view: 'separator' });
    
    this.createButton('📖 Documentation', () => {
      window.open('https://github.com/yourusername/aurora/wiki', '_blank');
    });
    
    this.createButton('🐛 Report Bug', () => {
      window.open('https://github.com/yourusername/aurora/issues/new', '_blank');
    });
    
    this.createButton('⭐ Give Feedback', () => {
      window.open('https://github.com/yourusername/aurora/discussions', '_blank');
    });
  }

  public setTheme(theme: DashboardTheme): void {
    this.themeState = { ...theme };
    this.pane.refresh();
  }

  public dispose(): void {
    // Cleanup if needed
  }
}


