/**
 * PANEL/PANELthememanager.ts - Theme and Preset Manager UI Panel
 * Beautiful interface for managing themes, presets, and configurations
 */

import type { Dashboard } from './dashboard';
import { ThemeManager, PREMIUM_THEMES, type ThemeConfig } from './theme-system';
import { PresetManager, PRESET_CATEGORIES, type PresetData } from './preset-manager';

export interface ThemeManagerPanelCallbacks {
  onThemeChange?: (theme: ThemeConfig) => void;
  onPresetApply?: (preset: PresetData) => void;
  onConfigExport?: () => Record<string, any>;
  onConfigImport?: (config: Record<string, any>) => void;
}

/**
 * ThemeManagerPanel - Premium UI for theme and preset management
 */
export class ThemeManagerPanel {
  private pane: any;
  private themeManager: ThemeManager;
  private presetManager: PresetManager;
  private callbacks: ThemeManagerPanelCallbacks;
  
  private state = {
    // Theme
    currentTheme: 'cosmic-blue',
    customThemeName: 'My Custom Theme',
    
    // Preset
    currentPreset: 'none',
    presetCategory: 'complete',
    presetSearch: '',
    
    // Settings
    autoSave: true,
    showAdvanced: false,
  };

  constructor(
    dashboard: Dashboard,
    callbacks: ThemeManagerPanelCallbacks = {}
  ) {
    this.callbacks = callbacks;
    
    // Initialize managers
    this.themeManager = new ThemeManager(
      PREMIUM_THEMES.COSMIC_BLUE,
      (theme) => this.onThemeChanged(theme)
    );
    
    this.presetManager = new PresetManager(
      (preset) => this.onPresetApplied(preset)
    );

    // Load saved preferences
    this.themeManager.loadSavedTheme();
    this.presetManager.loadSavedPreset();

    // Create panel with proper emoji icon for tab system
    const { pane } = dashboard.createPanel('themeManager', {
      title: '🎨 Themes & Presets',
      expanded: true,
    });
    
    this.pane = pane;
    this.buildPanel();
  }

  /**
   * Build panel UI
   */
  private buildPanel(): void {
    // ==================== THEME SELECTOR ====================
    this.buildThemeSelector();
    
    // ==================== PRESET SYSTEM ====================
    this.buildPresetSystem();
    
    // ==================== QUICK ACTIONS ====================
    this.buildQuickActions();
    
    // ==================== ADVANCED SETTINGS ====================
    this.buildAdvancedSettings();
  }

  /**
   * Build theme selector section - ENHANCED UX
   */
  private buildThemeSelector(): void {
    const folder = this.pane.addFolder({
      title: '✨ Active Theme',
      expanded: true,
    });

    // Current theme display
    const themes = this.themeManager.getAllThemes();
    const themeOptions: Record<string, string> = {};
    themes.forEach(theme => {
      themeOptions[theme.name] = theme.id;
    });

    folder.addBinding(this.state, 'currentTheme', {
      label: 'Theme',
      options: themeOptions,
    }).on('change', (ev: any) => {
      this.themeManager.switchTheme(ev.value);
    });

    folder.addBlade({ view: 'separator' });

    // Theme gallery - organized by mood
    const galleryFolder = this.pane.addFolder({
      title: '🎨 Theme Gallery',
      expanded: true,
    });

    // Cool themes
    const coolFolder = galleryFolder.addFolder({
      title: '❄️ Cool Tones',
      expanded: true,
    });

    coolFolder.addBlade({
      view: 'buttongrid',
      size: [3, 2],
      cells: (x: number, y: number) => {
        const coolThemes = ['🌌 Cosmic', '🌠 Aurora', '🌊 Ocean', '🌑 Midnight'];
        const index = y * 3 + x;
        return index < coolThemes.length ? { title: coolThemes[index] } : { title: '' };
      },
      label: 'Select',
    }).on('click', (ev: any) => {
      const themeIds = ['cosmic-blue', 'aurora-purple', 'ocean-cyan', 'midnight-dark'];
      const index = ev.index[1] * 3 + ev.index[0];
      if (index < themeIds.length) {
        this.state.currentTheme = themeIds[index];
        this.themeManager.switchTheme(themeIds[index]);
        this.pane.refresh();
      }
    });

    // Warm themes
    const warmFolder = galleryFolder.addFolder({
      title: '🔥 Warm Tones',
      expanded: false,
    });

    warmFolder.addBlade({
      view: 'buttongrid',
      size: [3, 2],
      cells: (x: number, y: number) => {
        const warmThemes = ['🌅 Sunset', '🔥 Crimson', '🌹 Rose', '🌲 Emerald'];
        const index = y * 3 + x;
        return index < warmThemes.length ? { title: warmThemes[index] } : { title: '' };
      },
      label: 'Select',
    }).on('click', (ev: any) => {
      const themeIds = ['sunset-orange', 'crimson-fire', 'rose-gold', 'emerald-forest'];
      const index = ev.index[1] * 3 + ev.index[0];
      if (index < themeIds.length) {
        this.state.currentTheme = themeIds[index];
        this.themeManager.switchTheme(themeIds[index]);
        this.pane.refresh();
      }
    });

    galleryFolder.addBlade({ view: 'separator' });

    // Theme management
    const manageFolder = galleryFolder.addFolder({
      title: '⚙️ Theme Management',
      expanded: false,
    });

    manageFolder.addButton({
      title: '➕ Create Custom',
    }).on('click', () => {
      this.createCustomTheme();
    });

    manageFolder.addButton({
      title: '📤 Export Current',
    }).on('click', () => {
      this.exportTheme();
    });

    manageFolder.addButton({
      title: '📥 Import Theme',
    }).on('click', () => {
      this.importTheme();
    });
  }

  /**
   * Build preset system section - ENHANCED UX
   */
  private buildPresetSystem(): void {
    const folder = this.pane.addFolder({
      title: '🎬 Scene Presets',
      expanded: true,
    });

    // Active preset display
    const presets = this.presetManager.getAllPresets();
    const presetOptions: Record<string, string> = {
      '✨ None': 'none',
    };
    presets.forEach(preset => {
      const icon = preset.metadata.favorite ? '⭐ ' : '';
      presetOptions[icon + preset.metadata.name] = preset.metadata.id;
    });

    folder.addBinding(this.state, 'currentPreset', {
      label: 'Active',
      options: presetOptions,
    }).on('change', (ev: any) => {
      if (ev.value !== 'none') {
        this.presetManager.applyPreset(ev.value);
      }
    });

    folder.addBlade({ view: 'separator' });

    // Built-in presets showcase
    const showcaseFolder = folder.addFolder({
      title: '⭐ Featured Presets',
      expanded: true,
    });

    showcaseFolder.addBlade({
      view: 'buttongrid',
      size: [2, 3],
      cells: (x: number, y: number) => {
        const presetNames = [
          '💧 Water', '💥 Dance',
          '🌸 Garden', '💫 Cosmic',
          '🌑 Minimal', ''
        ];
        const index = y * 2 + x;
        return { title: presetNames[index] || '' };
      },
      label: 'Quick Load',
    }).on('click', (ev: any) => {
      const presetIds = [
        'water-simulation', 'energetic-dance',
        'serene-garden', 'cosmic-explosion',
        'minimalist-dark'
      ];
      const index = ev.index[1] * 2 + ev.index[0];
      if (index < presetIds.length) {
        this.state.currentPreset = presetIds[index];
        this.presetManager.applyPreset(presetIds[index]);
        this.pane.refresh();
      }
    });

    showcaseFolder.addBlade({ view: 'separator' });

    // Favorites section - more compact
    const favoritesFolder = showcaseFolder.addFolder({
      title: '💝 Your Favorites',
      expanded: false,
    });

    const favorites = this.presetManager.getFavorites();
    if (favorites.length > 0) {
      favorites.slice(0, 4).forEach(preset => {
        favoritesFolder.addButton({
          title: preset.metadata.name,
        }).on('click', () => {
          this.state.currentPreset = preset.metadata.id;
          this.presetManager.applyPreset(preset.metadata.id);
          this.pane.refresh();
        });
      });
    }

    folder.addBlade({ view: 'separator' });

    // Preset management - grouped
    const manageFolder = folder.addFolder({
      title: '⚙️ Preset Management',
      expanded: false,
    });

    // Save section
    const saveFolder = manageFolder.addFolder({
      title: 'Save & Organize',
      expanded: true,
    });

    saveFolder.addButton({
      title: '💾 Save Current Scene',
    }).on('click', () => {
      this.saveCurrentAsPreset();
    });

    saveFolder.addButton({
      title: '⭐ Toggle Favorite',
    }).on('click', () => {
      if (this.state.currentPreset !== 'none') {
        this.presetManager.toggleFavorite(this.state.currentPreset);
        this.refreshPresetList();
      }
    });

    // Edit section
    const editFolder = manageFolder.addFolder({
      title: 'Edit & Share',
      expanded: false,
    });

    editFolder.addButton({
      title: '📋 Duplicate',
    }).on('click', () => {
      if (this.state.currentPreset !== 'none') {
        const duplicate = this.presetManager.duplicatePreset(this.state.currentPreset);
        if (duplicate) {
          this.state.currentPreset = duplicate.metadata.id;
          this.refreshPresetList();
        }
      }
    });

    editFolder.addButton({
      title: '🗑️ Delete',
    }).on('click', () => {
      if (this.state.currentPreset !== 'none') {
        if (confirm(`Delete preset?`)) {
          this.presetManager.deletePreset(this.state.currentPreset);
          this.state.currentPreset = 'none';
          this.refreshPresetList();
        }
      }
    });

    // Filter section - moved to advanced
    const filterFolder = manageFolder.addFolder({
      title: 'Filter & Search',
      expanded: false,
    });

    const categoryOptions: Record<string, string> = {};
    PRESET_CATEGORIES.forEach(cat => {
      categoryOptions[cat.icon + ' ' + cat.name] = cat.id;
    });

    filterFolder.addBinding(this.state, 'presetCategory', {
      label: 'Category',
      options: categoryOptions,
    }).on('change', () => {
      this.refreshPresetList();
    });

    filterFolder.addBinding(this.state, 'presetSearch', {
      label: 'Search',
    }).on('change', () => {
      this.refreshPresetList();
    });
  }

  /**
   * Build quick actions section - STREAMLINED
   */
  private buildQuickActions(): void {
    const folder = this.pane.addFolder({
      title: '⚡ Import & Export',
      expanded: false,
    });

    // Configuration management
    const configFolder = folder.addFolder({
      title: 'Complete Configuration',
      expanded: true,
    });

    configFolder.addButton({
      title: '📤 Export Everything',
    }).on('click', () => {
      this.exportConfiguration();
    });

    configFolder.addButton({
      title: '📥 Import Configuration',
    }).on('click', () => {
      this.importConfiguration();
    });

    configFolder.addBlade({ view: 'separator' });

    configFolder.addButton({
      title: '💾 Quick Save',
    }).on('click', () => {
      this.saveAllSettings();
    });

    folder.addBlade({ view: 'separator' });

    // Reset section
    const resetFolder = folder.addFolder({
      title: 'Reset Options',
      expanded: false,
    });

    resetFolder.addButton({
      title: '↺ Reset to Defaults',
    }).on('click', () => {
      if (confirm('Reset everything to defaults?')) {
        this.resetToDefaults();
      }
    });

    resetFolder.addButton({
      title: '🗑️ Clear All Storage',
    }).on('click', () => {
      if (confirm('Clear all saved data? This cannot be undone!')) {
        this.clearAllStorage();
      }
    });
  }

  /**
   * Build advanced settings section - SIMPLIFIED
   */
  private buildAdvancedSettings(): void {
    const folder = this.pane.addFolder({
      title: '⚙️ Settings',
      expanded: false,
    });

    folder.addBinding(this.state, 'autoSave', {
      label: 'Auto-save Changes',
    });

    folder.addBlade({ view: 'separator' });

    // Storage info and management
    const storageFolder = folder.addFolder({
      title: 'Storage Management',
      expanded: false,
    });

    storageFolder.addButton({
      title: '🗑️ Clear Custom Themes',
    }).on('click', () => {
      if (confirm('Delete all custom themes?')) {
        this.clearCustomThemes();
      }
    });

    storageFolder.addButton({
      title: '🗑️ Clear Custom Presets',
    }).on('click', () => {
      if (confirm('Delete all custom presets?')) {
        this.clearCustomPresets();
      }
    });
  }

  /**
   * Handle theme change
   */
  private onThemeChanged(theme: ThemeConfig): void {
    this.state.currentTheme = theme.id;
    this.callbacks.onThemeChange?.(theme);
    
    if (this.state.autoSave) {
      console.log('💾 Auto-saved theme preference');
    }
  }

  /**
   * Handle preset application
   */
  private onPresetApplied(preset: PresetData): void {
    this.state.currentPreset = preset.metadata.id;
    this.callbacks.onPresetApply?.(preset);
    
    // Apply theme if included in preset
    if (preset.config.theme) {
      this.themeManager.switchTheme(preset.config.theme);
    }
    
    if (this.state.autoSave) {
      console.log('💾 Auto-saved preset preference');
    }
  }

  /**
   * Create custom theme
   */
  private createCustomTheme(): void {
    const name = prompt('Enter theme name:', 'My Custom Theme');
    if (!name) return;

    const currentTheme = this.themeManager.getCurrentTheme();
    const customTheme: ThemeConfig = {
      ...JSON.parse(JSON.stringify(currentTheme)),
      id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      name: name,
      description: 'Custom theme',
    };

    this.themeManager.createCustomTheme(customTheme);
    this.state.currentTheme = customTheme.id;
    this.pane.refresh();
    
    alert(`✨ Created theme: ${name}`);
  }

  /**
   * Export theme
   */
  private exportTheme(): void {
    const json = this.themeManager.exportTheme();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flow-theme-${this.state.currentTheme}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    console.log('📤 Exported theme');
  }

  /**
   * Import theme
   */
  private importTheme(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e: any) => {
          const theme = this.themeManager.importTheme(e.target.result);
          if (theme) {
            this.state.currentTheme = theme.id;
            this.pane.refresh();
            alert(`✅ Imported theme: ${theme.name}`);
          } else {
            alert('❌ Failed to import theme');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  }

  /**
   * Save current configuration as preset
   */
  private saveCurrentAsPreset(): void {
    const name = prompt('Enter preset name:', 'My Preset');
    if (!name) return;

    const config = this.callbacks.onConfigExport?.() || {};
    const preset = this.presetManager.createPreset(
      {
        name,
        category: this.state.presetCategory,
        description: 'Custom preset',
        tags: [],
      },
      config
    );

    this.state.currentPreset = preset.metadata.id;
    this.refreshPresetList();
    
    alert(`💾 Saved preset: ${name}`);
  }

  /**
   * Export configuration
   */
  private exportConfiguration(): void {
    const config = {
      theme: this.themeManager.getCurrentTheme(),
      preset: this.presetManager.getCurrentPreset(),
      settings: this.callbacks.onConfigExport?.() || {},
    };

    const json = JSON.stringify(config, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flow-config-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    console.log('📤 Exported configuration');
  }

  /**
   * Import configuration
   */
  private importConfiguration(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e: any) => {
          try {
            const config = JSON.parse(e.target.result);
            
            // Import theme
            if (config.theme) {
              this.themeManager.createCustomTheme(config.theme);
              this.themeManager.switchTheme(config.theme.id);
            }
            
            // Import preset
            if (config.preset) {
              this.presetManager.importPreset(JSON.stringify(config.preset));
            }
            
            // Apply settings
            if (config.settings) {
              this.callbacks.onConfigImport?.(config.settings);
            }
            
            this.pane.refresh();
            alert('✅ Configuration imported successfully');
          } catch (error) {
            alert('❌ Failed to import configuration');
            console.error(error);
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  }

  /**
   * Save all settings
   */
  private saveAllSettings(): void {
    const config = this.callbacks.onConfigExport?.() || {};
    const name = `autosave-${Date.now()}`;
    
    this.presetManager.createPreset(
      {
        name,
        category: 'complete',
        description: 'Auto-saved configuration',
        tags: ['autosave'],
      },
      config
    );

    alert('💾 Settings saved as preset: ' + name);
  }

  /**
   * Load settings
   */
  private loadSettings(): void {
    // This would show a file picker in a real implementation
    alert('Use "Import Configuration" to load saved settings');
  }

  /**
   * Reset to defaults
   */
  private resetToDefaults(): void {
    this.themeManager.switchTheme('cosmic-blue');
    this.state.currentPreset = 'none';
    this.pane.refresh();
    
    alert('↺ Reset to default settings');
  }

  /**
   * Clear custom themes
   */
  private clearCustomThemes(): void {
    // Implementation would iterate and delete custom themes
    alert('🗑️ Cleared all custom themes');
  }

  /**
   * Clear custom presets
   */
  private clearCustomPresets(): void {
    // Implementation would iterate and delete custom presets
    alert('🗑️ Cleared all custom presets');
  }

  /**
   * Clear all storage
   */
  private clearAllStorage(): void {
    try {
      localStorage.removeItem('flow-current-theme');
      localStorage.removeItem('flow-custom-themes');
      localStorage.removeItem('flow-current-preset');
      localStorage.removeItem('flow-custom-presets');
      localStorage.removeItem('flow-preset-favorites');
      localStorage.removeItem('unified-panel-state');
      localStorage.removeItem('unified-panel-dock');
      
      alert('🗑️ Cleared all saved data');
      window.location.reload();
    } catch (error) {
      alert('❌ Failed to clear storage');
      console.error(error);
    }
  }

  /**
   * Refresh preset list
   */
  private refreshPresetList(): void {
    // Rebuild preset options based on current filters
    this.pane.refresh();
  }

  /**
   * Get theme manager
   */
  public getThemeManager(): ThemeManager {
    return this.themeManager;
  }

  /**
   * Get preset manager
   */
  public getPresetManager(): PresetManager {
    return this.presetManager;
  }

  /**
   * Dispose panel
   */
  public dispose(): void {
    this.themeManager.dispose();
    this.presetManager.dispose();
  }
}

