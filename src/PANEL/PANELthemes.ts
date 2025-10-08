/**
 * PANEL/PANELthemes.ts - Theme Manager Panel (Refactored for DashboardV2)
 * Complete theme customization and management UI
 */

import type { Pane } from 'tweakpane';
import { ThemeEngine, BUILTIN_THEMES, type ThemeConfig } from './core/ThemeEngine';

export interface ThemesPanelCallbacks {
  onThemeChange?: (theme: ThemeConfig) => void;
  onThemeCreate?: (theme: ThemeConfig) => void;
  onThemeDelete?: (themeId: string) => void;
}

/**
 * ThemesPanel - Comprehensive theme management interface
 */
export class ThemesPanel {
  private pane: Pane;
  private themeEngine: ThemeEngine;
  private callbacks: ThemesPanelCallbacks;
  
  // UI state
  private state = {
    currentTheme: 'cosmic-blue',
    customThemeName: 'My Custom Theme',
    
    // Customization controls
    primaryColor: '#5078b4',
    secondaryColor: '#648cc8',
    accentColor: '#a78bfa',
    
    glassBlur: 60,
    glassSaturation: 220,
    glassBrightness: 1.25,
    glassContrast: 1.2,
    glassBorderOpacity: 0.25,
    glassShadowIntensity: 1.0,
    
    borderRadius: 20,
    animationSpeed: 400,
  };
  
  constructor(
    pane: Pane,
    themeEngine: ThemeEngine,
    callbacks: ThemesPanelCallbacks = {}
  ) {
    this.pane = pane;
    this.themeEngine = themeEngine;
    this.callbacks = callbacks;
    
    // Sync with current theme
    const currentTheme = this.themeEngine.getCurrentTheme();
    this.syncWithTheme(currentTheme);
    
    this.buildPanel();
  }
  
  /**
   * Build panel UI
   */
  private buildPanel(): void {
    // ========== THEME GALLERY ==========
    this.buildThemeGallery();
    
    // ========== ACTIVE THEME ==========
    this.buildActiveTheme();
    
    // ========== CUSTOMIZATION ==========
    this.buildCustomization();
    
    // ========== THEME MANAGEMENT ==========
    this.buildManagement();
  }
  
  /**
   * Theme Gallery Section
   */
  private buildThemeGallery(): void {
    const folder = this.pane.addFolder({
      title: '🎨 Theme Gallery',
      expanded: true,
    });
    
    // Create theme options
    const themeOptions: Record<string, string> = {};
    const allThemes = this.themeEngine.getAllThemes();
    
    allThemes.forEach(theme => {
      themeOptions[theme.name] = theme.id;
    });
    
    // Theme selector
    folder.addBinding(this.state, 'currentTheme', {
      label: 'Select Theme',
      options: themeOptions,
    }).on('change', (ev: any) => {
      this.applyTheme(ev.value);
    });
    
    folder.addBlade({ view: 'separator' });
    
    // Quick select buttons (built-in themes only)
    const builtinThemes = Object.values(BUILTIN_THEMES);
    const rows = Math.ceil(builtinThemes.length / 2);
    
    folder.addBlade({
      view: 'buttongrid',
      size: [2, rows],
      cells: (x: number, y: number) => {
        const index = y * 2 + x;
        if (index < builtinThemes.length) {
          const theme = builtinThemes[index];
          // Extract emoji from name
          const emoji = theme.name.match(/[\u{1F300}-\u{1F9FF}]/u)?.[0] || '🎨';
          return { title: emoji };
        }
        return { title: '' };
      },
      label: 'Quick Select',
    }).on('click', (ev: any) => {
      const index = ev.index[1] * 2 + ev.index[0];
      const themes = builtinThemes;
      if (index < themes.length) {
        this.applyTheme(themes[index].id);
      }
    });
  }
  
  /**
   * Active Theme Section
   */
  private buildActiveTheme(): void {
    const folder = this.pane.addFolder({
      title: '🎨 Active Theme',
      expanded: true,
    });
    
    const currentTheme = this.themeEngine.getCurrentTheme();
    
    // Theme name (readonly)
    folder.addBinding({ name: currentTheme.name }, 'name', {
      label: 'Theme',
      readonly: true,
    });
    
    // Description (readonly)
    folder.addBinding({ desc: currentTheme.description }, 'desc', {
      label: 'Description',
      readonly: true,
    });
    
    folder.addBlade({ view: 'separator' });
    
    // Edit button
    folder.addButton({
      title: '✏️ Edit Theme',
    }).on('click', () => {
      this.openThemeEditor();
    });
  }
  
  /**
   * Customization Section
   */
  private buildCustomization(): void {
    const folder = this.pane.addFolder({
      title: '🎨 Customization',
      expanded: false,
    });
    
    // === COLORS ===
    const colorsFolder = folder.addFolder({
      title: 'Colors',
      expanded: true,
    });
    
    colorsFolder.addBinding(this.state, 'primaryColor', {
      label: 'Primary',
      color: { type: 'float' },
    }).on('change', () => this.updateCustomTheme());
    
    colorsFolder.addBinding(this.state, 'secondaryColor', {
      label: 'Secondary',
      color: { type: 'float' },
    }).on('change', () => this.updateCustomTheme());
    
    colorsFolder.addBinding(this.state, 'accentColor', {
      label: 'Accent',
      color: { type: 'float' },
    }).on('change', () => this.updateCustomTheme());
    
    // === GLASSMORPHISM ===
    const glassFolder = folder.addFolder({
      title: 'Glassmorphism',
      expanded: false,
    });
    
    glassFolder.addBinding(this.state, 'glassBlur', {
      label: 'Blur Amount',
      min: 0,
      max: 100,
      step: 1,
    }).on('change', () => this.updateCustomTheme());
    
    glassFolder.addBinding(this.state, 'glassSaturation', {
      label: 'Saturation',
      min: 100,
      max: 300,
      step: 5,
    }).on('change', () => this.updateCustomTheme());
    
    glassFolder.addBinding(this.state, 'glassBrightness', {
      label: 'Brightness',
      min: 0.8,
      max: 1.5,
      step: 0.05,
    }).on('change', () => this.updateCustomTheme());
    
    glassFolder.addBinding(this.state, 'glassContrast', {
      label: 'Contrast',
      min: 1.0,
      max: 1.5,
      step: 0.05,
    }).on('change', () => this.updateCustomTheme());
    
    glassFolder.addBinding(this.state, 'glassBorderOpacity', {
      label: 'Border Opacity',
      min: 0,
      max: 1,
      step: 0.05,
    }).on('change', () => this.updateCustomTheme());
    
    glassFolder.addBinding(this.state, 'glassShadowIntensity', {
      label: 'Shadow Intensity',
      min: 0,
      max: 2,
      step: 0.1,
    }).on('change', () => this.updateCustomTheme());
    
    // === LAYOUT ===
    folder.addBlade({ view: 'separator' });
    
    folder.addBinding(this.state, 'borderRadius', {
      label: 'Border Radius',
      min: 8,
      max: 32,
      step: 1,
    }).on('change', () => this.updateCustomTheme());
    
    folder.addBinding(this.state, 'animationSpeed', {
      label: 'Animation Speed',
      min: 200,
      max: 800,
      step: 50,
    }).on('change', () => this.updateCustomTheme());
    
    folder.addBlade({ view: 'separator' });
    
    // Save/Reset buttons
    folder.addButton({
      title: '💾 Save as Custom',
    }).on('click', () => {
      this.saveAsCustomTheme();
    });
    
    folder.addButton({
      title: '🔄 Reset to Default',
    }).on('click', () => {
      this.resetToDefault();
    });
  }
  
  /**
   * Theme Management Section
   */
  private buildManagement(): void {
    const folder = this.pane.addFolder({
      title: '📦 Theme Management',
      expanded: false,
    });
    
    // Custom theme name
    folder.addBinding(this.state, 'customThemeName', {
      label: 'Theme Name',
    });
    
    folder.addBlade({ view: 'separator' });
    
    // Export current theme
    folder.addButton({
      title: '📤 Export Current Theme',
    }).on('click', () => {
      this.exportCurrentTheme();
    });
    
    // Import theme
    folder.addButton({
      title: '📥 Import Theme File',
    }).on('click', () => {
      this.importTheme();
    });
    
    // Create new theme
    folder.addButton({
      title: '✨ Create New Theme',
    }).on('click', () => {
      this.createNewTheme();
    });
    
    // Delete custom theme
    folder.addButton({
      title: '🗑️ Delete Custom Theme',
    }).on('click', () => {
      this.deleteCustomTheme();
    });
  }
  
  /**
   * Apply theme by ID
   */
  private applyTheme(themeId: string): void {
    const success = this.themeEngine.switchTheme(themeId);
    if (success) {
      const theme = this.themeEngine.getCurrentTheme();
      this.state.currentTheme = themeId;
      this.syncWithTheme(theme);
      this.pane.refresh();
      this.callbacks.onThemeChange?.(theme);
      console.log(`🎨 Applied theme: ${theme.name}`);
    }
  }
  
  /**
   * Sync UI state with theme
   */
  private syncWithTheme(theme: ThemeConfig): void {
    this.state.currentTheme = theme.id;
    this.state.primaryColor = theme.colors.primary;
    this.state.secondaryColor = theme.colors.secondary;
    this.state.accentColor = theme.colors.accent;
    this.state.glassBlur = theme.glassmorphism.blur;
    this.state.glassSaturation = theme.glassmorphism.saturation;
    this.state.glassBrightness = theme.glassmorphism.brightness;
    this.state.glassContrast = theme.glassmorphism.contrast;
    this.state.glassBorderOpacity = theme.glassmorphism.borderOpacity;
    this.state.glassShadowIntensity = theme.glassmorphism.shadowIntensity;
    this.state.borderRadius = theme.borderRadius.xl;
    this.state.animationSpeed = theme.animation.base;
  }
  
  /**
   * Update custom theme in real-time
   */
  private updateCustomTheme(): void {
    // Create temporary theme from current settings
    const customTheme: ThemeConfig = {
      id: 'custom-preview',
      name: 'Custom (Preview)',
      description: 'Custom theme preview',
      palette: {
        name: 'Custom',
        primary: this.state.primaryColor,
        secondary: this.state.secondaryColor,
        accent: this.state.accentColor,
        // Use current theme's other palette values as base
        background: this.themeEngine.getCurrentTheme().colors.background,
        text: this.themeEngine.getCurrentTheme().colors.text,
        border: this.themeEngine.getCurrentTheme().colors.border,
        shadow: this.themeEngine.getCurrentTheme().colors.shadow,
        gradient: {
          primary: `linear-gradient(135deg, ${this.state.primaryColor} 0%, ${this.state.secondaryColor} 50%, ${this.state.accentColor} 100%)`,
          secondary: `linear-gradient(135deg, ${this.state.primaryColor}33 0%, ${this.state.secondaryColor}20 100%)`,
          accent: `linear-gradient(180deg, ${this.state.accentColor} 0%, ${this.state.primaryColor} 50%, ${this.state.secondaryColor} 100%)`,
        },
      },
      glassmorphism: {
        blur: this.state.glassBlur,
        saturation: this.state.glassSaturation,
        brightness: this.state.glassBrightness,
        contrast: this.state.glassContrast,
        opacity: 0.85,
        borderOpacity: this.state.glassBorderOpacity,
        shadowIntensity: this.state.glassShadowIntensity,
      },
      borderRadius: this.state.borderRadius,
      fontSize: { small: 11, medium: 13, large: 16 },
      spacing: { small: 8, medium: 12, large: 16 },
      animation: {
        duration: this.state.animationSpeed,
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    };
    
    // Apply for real-time preview
    this.themeEngine.applyTheme(customTheme);
  }
  
  /**
   * Save current customization as a new custom theme
   */
  private saveAsCustomTheme(): void {
    const themeName = this.state.customThemeName || 'Custom Theme';
    const themeId = themeName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    
    const customTheme: ThemeConfig = {
      id: themeId,
      name: themeName,
      description: 'Custom user theme',
      palette: {
        name: themeName,
        primary: this.state.primaryColor,
        secondary: this.state.secondaryColor,
        accent: this.state.accentColor,
        background: this.themeEngine.getCurrentTheme().colors.background,
        text: this.themeEngine.getCurrentTheme().colors.text,
        border: this.themeEngine.getCurrentTheme().colors.border,
        shadow: this.themeEngine.getCurrentTheme().colors.shadow,
        gradient: {
          primary: `linear-gradient(135deg, ${this.state.primaryColor} 0%, ${this.state.secondaryColor} 50%, ${this.state.accentColor} 100%)`,
          secondary: `linear-gradient(135deg, ${this.state.primaryColor}33 0%, ${this.state.secondaryColor}20 100%)`,
          accent: `linear-gradient(180deg, ${this.state.accentColor} 0%, ${this.state.primaryColor} 50%, ${this.state.secondaryColor} 100%)`,
        },
      },
      glassmorphism: {
        blur: this.state.glassBlur,
        saturation: this.state.glassSaturation,
        brightness: this.state.glassBrightness,
        contrast: this.state.glassContrast,
        opacity: 0.85,
        borderOpacity: this.state.glassBorderOpacity,
        shadowIntensity: this.state.glassShadowIntensity,
      },
      borderRadius: this.state.borderRadius,
      fontSize: { small: 11, medium: 13, large: 16 },
      spacing: { small: 8, medium: 12, large: 16 },
      animation: {
        duration: this.state.animationSpeed,
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    };
    
    this.themeEngine.createCustomTheme(customTheme);
    this.themeEngine.applyTheme(customTheme);
    this.state.currentTheme = themeId;
    this.pane.refresh();
    this.callbacks.onThemeCreate?.(customTheme);
    
    alert(`✨ Custom theme "${themeName}" saved successfully!`);
  }
  
  /**
   * Reset to default theme
   */
  private resetToDefault(): void {
    this.applyTheme('cosmic-blue');
  }
  
  /**
   * Export current theme as JSON
   */
  private exportCurrentTheme(): void {
    const json = this.themeEngine.exportTheme();
    
    // Create download link
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `theme-${this.state.currentTheme}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    console.log('📤 Theme exported successfully');
  }
  
  /**
   * Import theme from JSON file
   */
  private importTheme(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event: any) => {
          const json = event.target.result;
          const theme = this.themeEngine.importTheme(json);
          if (theme) {
            this.applyTheme(theme.id);
            this.pane.refresh();
            alert(`📥 Theme "${theme.name}" imported successfully!`);
          } else {
            alert('❌ Failed to import theme. Invalid format.');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  }
  
  /**
   * Create new blank theme
   */
  private createNewTheme(): void {
    this.state.customThemeName = 'New Theme';
    this.state.primaryColor = '#5078b4';
    this.state.secondaryColor = '#648cc8';
    this.state.accentColor = '#a78bfa';
    this.state.glassBlur = 60;
    this.state.glassSaturation = 220;
    this.state.glassBrightness = 1.25;
    this.state.glassContrast = 1.2;
    this.state.glassBorderOpacity = 0.25;
    this.state.glassShadowIntensity = 1.0;
    this.state.borderRadius = 20;
    this.state.animationSpeed = 400;
    
    this.pane.refresh();
    this.updateCustomTheme();
  }
  
  /**
   * Delete current custom theme
   */
  private deleteCustomTheme(): void {
    const currentTheme = this.themeEngine.getCurrentTheme();
    
    // Can't delete built-in themes
    if (Object.values(BUILTIN_THEMES).find(t => t.id === currentTheme.id)) {
      alert('❌ Cannot delete built-in themes');
      return;
    }
    
    if (confirm(`🗑️ Delete theme "${currentTheme.name}"?`)) {
      const success = this.themeEngine.deleteCustomTheme(currentTheme.id);
      if (success) {
        this.applyTheme('cosmic-blue'); // Reset to default
        this.callbacks.onThemeDelete?.(currentTheme.id);
        alert(`✅ Theme "${currentTheme.name}" deleted`);
      }
    }
  }
  
  /**
   * Open theme editor (placeholder)
   */
  private openThemeEditor(): void {
    alert('Theme Editor\n\nThis feature is coming soon!\n\nFor now, use the Customization section to modify colors and effects.');
  }
  
  /**
   * Dispose panel
   */
  public dispose(): void {
    this.pane.dispose();
  }
}


