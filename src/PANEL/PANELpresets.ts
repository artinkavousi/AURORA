/**
 * PANEL/PANELpresets.ts - Preset Manager Panel Tab
 * Complete preset management, save/load, and browsing UI
 */

import type { Dashboard } from './dashboard';
import { PresetManager, PRESET_CATEGORIES, BUILTIN_PRESETS, type PresetData, type PresetMetadata } from './preset-manager';

export interface PresetsPanelCallbacks {
  onPresetApply?: (preset: PresetData) => void;
  onPresetCreate?: (preset: PresetData) => void;
  onPresetDelete?: (presetId: string) => void;
}

/**
 * PresetsPanel - Comprehensive preset management interface
 */
export class PresetsPanel {
  private pane: any;
  private presetManager: PresetManager;
  private callbacks: PresetsPanelCallbacks;
  
  // UI state
  private state = {
    searchQuery: '',
    filterCategory: 'all',
    showFavorites: false,
    currentPresetId: '',
    
    // Current preset info
    presetName: 'Current Configuration',
    presetDescription: '',
    presetCategory: 'complete',
    presetAuthor: 'User',
    presetTags: '',
    
    // Apply options
    applyPhysics: true,
    applyVisuals: true,
    applyAudio: true,
    applyPostFX: true,
    applyTheme: false,
  };
  
  // Bindings for dynamic updates
  private presetInfoBindings: any[] = [];
  
  constructor(
    dashboard: Dashboard,
    presetManager: PresetManager,
    callbacks: PresetsPanelCallbacks = {}
  ) {
    this.presetManager = presetManager;
    this.callbacks = callbacks;
    
    // Sync with current preset
    const currentPreset = this.presetManager.getCurrentPreset();
    if (currentPreset) {
      this.syncWithPreset(currentPreset);
    }
    
    // Create panel
    const { pane } = dashboard.createPanel('presets', {
      title: '💾 Presets',
      position: { x: window.innerWidth - 360, y: 16 },
      expanded: false,
      draggable: true,
      collapsible: true,
    });
    
    this.pane = pane;
    this.buildPanel();
  }
  
  /**
   * Build panel UI
   */
  private buildPanel(): void {
    // ========== PRESETS LIBRARY ==========
    this.buildLibrary();
    
    // ========== CURRENT PRESET ==========
    this.buildCurrentPreset();
    
    // ========== QUICK ACTIONS ==========
    this.buildQuickActions();
    
    // ========== APPLY OPTIONS ==========
    this.buildApplyOptions();
  }
  
  /**
   * Presets Library Section
   */
  private buildLibrary(): void {
    const folder = this.pane.addFolder({
      title: '💾 Presets Library',
      expanded: true,
    });
    
    // Search
    folder.addBinding(this.state, 'searchQuery', {
      label: '🔍 Search',
    }).on('change', () => {
      this.refreshPresetList();
    });
    
    // Category filter
    const categoryOptions: Record<string, string> = {
      'All': 'all',
    };
    PRESET_CATEGORIES.forEach(cat => {
      categoryOptions[cat.icon + ' ' + cat.name] = cat.id;
    });
    
    folder.addBinding(this.state, 'filterCategory', {
      label: 'Category',
      options: categoryOptions,
    }).on('change', () => {
      this.refreshPresetList();
    });
    
    // Favorites toggle
    folder.addBinding(this.state, 'showFavorites', {
      label: '⭐ Favorites Only',
    }).on('change', () => {
      this.refreshPresetList();
    });
    
    folder.addBlade({ view: 'separator' });
    
    // === PRESET GRID ===
    this.buildPresetGrid(folder);
  }
  
  /**
   * Build preset selection grid
   */
  private buildPresetGrid(folder: any): void {
    // Get filtered presets
    const presets = this.getFilteredPresets();
    
    if (presets.length === 0) {
      // No presets found
      const msgBinding = folder.addBinding(
        { message: 'No presets found' },
        'message',
        { label: '', readonly: true }
      );
      this.presetInfoBindings.push(msgBinding);
      return;
    }
    
    // Create button grid for presets (2 columns)
    const rows = Math.min(Math.ceil(presets.length / 2), 6); // Max 6 rows = 12 presets
    const displayPresets = presets.slice(0, 12); // Show first 12
    
    const gridBinding = folder.addBlade({
      view: 'buttongrid',
      size: [2, rows],
      cells: (x: number, y: number) => {
        const index = y * 2 + x;
        if (index < displayPresets.length) {
          const preset = displayPresets[index];
          // Short name (first part of name, up to emoji or 15 chars)
          let title = preset.metadata.name;
          if (title.length > 15) {
            title = title.substring(0, 12) + '...';
          }
          return { 
            title: preset.metadata.favorite ? `⭐${title}` : title
          };
        }
        return { title: '' };
      },
      label: 'Presets',
    });
    
    gridBinding.on('click', (ev: any) => {
      const index = ev.index[1] * 2 + ev.index[0];
      if (index < displayPresets.length) {
        const preset = displayPresets[index];
        this.selectPreset(preset.metadata.id);
      }
    });
    
    this.presetInfoBindings.push(gridBinding);
    
    // Show count if more than displayed
    if (presets.length > 12) {
      const countBinding = folder.addBinding(
        { info: `Showing 12 of ${presets.length} presets` },
        'info',
        { label: '', readonly: true }
      );
      this.presetInfoBindings.push(countBinding);
    }
  }
  
  /**
   * Current Preset Section
   */
  private buildCurrentPreset(): void {
    const folder = this.pane.addFolder({
      title: '📝 Current Preset',
      expanded: true,
    });
    
    // Preset name
    const nameBinding = folder.addBinding(this.state, 'presetName', {
      label: 'Name',
      readonly: true,
    });
    this.presetInfoBindings.push(nameBinding);
    
    // Description
    const descBinding = folder.addBinding(this.state, 'presetDescription', {
      label: 'Description',
      readonly: true,
    });
    this.presetInfoBindings.push(descBinding);
    
    // Category
    const catBinding = folder.addBinding(this.state, 'presetCategory', {
      label: 'Category',
      readonly: true,
    });
    this.presetInfoBindings.push(catBinding);
    
    // Author
    const authorBinding = folder.addBinding(this.state, 'presetAuthor', {
      label: 'Author',
      readonly: true,
    });
    this.presetInfoBindings.push(authorBinding);
    
    // Tags
    const tagsBinding = folder.addBinding(this.state, 'presetTags', {
      label: 'Tags',
      readonly: true,
    });
    this.presetInfoBindings.push(tagsBinding);
    
    folder.addBlade({ view: 'separator' });
    
    // Action buttons
    folder.addButton({
      title: '⭐ Toggle Favorite',
    }).on('click', () => {
      if (this.state.currentPresetId) {
        this.toggleFavorite(this.state.currentPresetId);
      }
    });
    
    folder.addButton({
      title: '📋 Duplicate',
    }).on('click', () => {
      if (this.state.currentPresetId) {
        this.duplicatePreset(this.state.currentPresetId);
      }
    });
    
    folder.addButton({
      title: '🗑️ Delete',
    }).on('click', () => {
      if (this.state.currentPresetId) {
        this.deletePreset(this.state.currentPresetId);
      }
    });
  }
  
  /**
   * Quick Actions Section
   */
  private buildQuickActions(): void {
    const folder = this.pane.addFolder({
      title: '💾 Quick Actions',
      expanded: true,
    });
    
    // Save current configuration
    folder.addButton({
      title: '📸 Save Current as Preset',
    }).on('click', () => {
      this.saveCurrentAsPreset();
    });
    
    folder.addBlade({ view: 'separator' });
    
    // Import/Export
    folder.addButton({
      title: '📥 Import Preset(s)',
    }).on('click', () => {
      this.importPresets();
    });
    
    folder.addButton({
      title: '📤 Export All Presets',
    }).on('click', () => {
      this.exportAllPresets();
    });
    
    folder.addBlade({ view: 'separator' });
    
    // Reset
    folder.addButton({
      title: '🔄 Reset to Defaults',
    }).on('click', () => {
      this.resetToDefaults();
    });
  }
  
  /**
   * Apply Options Section
   */
  private buildApplyOptions(): void {
    const folder = this.pane.addFolder({
      title: '🎯 Apply Options',
      expanded: false,
    });
    
    folder.addBinding(this.state, 'applyPhysics', {
      label: '🌊 Physics',
    });
    
    folder.addBinding(this.state, 'applyVisuals', {
      label: '🎨 Visuals',
    });
    
    folder.addBinding(this.state, 'applyAudio', {
      label: '🎵 Audio',
    });
    
    folder.addBinding(this.state, 'applyPostFX', {
      label: '✨ PostFX',
    });
    
    folder.addBinding(this.state, 'applyTheme', {
      label: '🎭 Theme',
    });
    
    folder.addBlade({ view: 'separator' });
    
    // Apply button
    folder.addButton({
      title: '▶️ Apply Preset',
    }).on('click', () => {
      if (this.state.currentPresetId) {
        this.applyPreset(this.state.currentPresetId);
      } else {
        alert('⚠️ No preset selected');
      }
    });
  }
  
  /**
   * Get filtered presets based on current filters
   */
  private getFilteredPresets(): PresetData[] {
    let presets = this.presetManager.getAllPresets();
    
    // Filter by category
    if (this.state.filterCategory !== 'all') {
      presets = presets.filter(p => p.metadata.category === this.state.filterCategory);
    }
    
    // Filter favorites
    if (this.state.showFavorites) {
      presets = presets.filter(p => p.metadata.favorite);
    }
    
    // Search filter
    if (this.state.searchQuery) {
      presets = this.presetManager.searchPresets(this.state.searchQuery);
    }
    
    return presets;
  }
  
  /**
   * Refresh preset list display
   */
  private refreshPresetList(): void {
    // Remove old bindings
    this.presetInfoBindings.forEach(binding => {
      try {
        binding.dispose?.();
      } catch (e) {
        // Ignore disposal errors
      }
    });
    this.presetInfoBindings = [];
    
    // Rebuild grid
    this.pane.refresh();
  }
  
  /**
   * Select a preset
   */
  private selectPreset(presetId: string): void {
    const preset = this.presetManager.getPreset(presetId);
    if (preset) {
      this.syncWithPreset(preset);
      this.state.currentPresetId = presetId;
      this.pane.refresh();
      console.log(`📝 Selected preset: ${preset.metadata.name}`);
    }
  }
  
  /**
   * Sync UI state with preset
   */
  private syncWithPreset(preset: PresetData): void {
    this.state.currentPresetId = preset.metadata.id;
    this.state.presetName = preset.metadata.name;
    this.state.presetDescription = preset.metadata.description;
    this.state.presetCategory = preset.metadata.category;
    this.state.presetAuthor = preset.metadata.author;
    this.state.presetTags = preset.metadata.tags.join(', ');
  }
  
  /**
   * Apply selected preset
   */
  private applyPreset(presetId: string): void {
    const success = this.presetManager.applyPreset(presetId);
    if (success) {
      const preset = this.presetManager.getPreset(presetId);
      if (preset) {
        // Apply with options
        const options = {
          physics: this.state.applyPhysics,
          visuals: this.state.applyVisuals,
          audio: this.state.applyAudio,
          postfx: this.state.applyPostFX,
          theme: this.state.applyTheme,
        };
        
        this.callbacks.onPresetApply?.(preset);
        console.log(`🎯 Applied preset: ${preset.metadata.name}`, options);
        alert(`✅ Preset "${preset.metadata.name}" applied successfully!`);
      }
    }
  }
  
  /**
   * Toggle favorite status
   */
  private toggleFavorite(presetId: string): void {
    const isFavorite = this.presetManager.toggleFavorite(presetId);
    const preset = this.presetManager.getPreset(presetId);
    if (preset) {
      this.syncWithPreset(preset);
      this.refreshPresetList();
      console.log(`${isFavorite ? '⭐' : '☆'} ${preset.metadata.name}`);
    }
  }
  
  /**
   * Duplicate preset
   */
  private duplicatePreset(presetId: string): void {
    const duplicate = this.presetManager.duplicatePreset(presetId);
    if (duplicate) {
      this.selectPreset(duplicate.metadata.id);
      this.refreshPresetList();
      alert(`📋 Preset duplicated: "${duplicate.metadata.name}"`);
    }
  }
  
  /**
   * Delete preset
   */
  private deletePreset(presetId: string): void {
    const preset = this.presetManager.getPreset(presetId);
    if (!preset) return;
    
    // Check if it's a built-in preset
    if (BUILTIN_PRESETS[presetId.toUpperCase().replace(/-/g, '_')]) {
      alert('❌ Cannot delete built-in presets');
      return;
    }
    
    if (confirm(`🗑️ Delete preset "${preset.metadata.name}"?`)) {
      const success = this.presetManager.deletePreset(presetId);
      if (success) {
        this.state.currentPresetId = '';
        this.state.presetName = 'No preset selected';
        this.state.presetDescription = '';
        this.callbacks.onPresetDelete?.(presetId);
        this.refreshPresetList();
        this.pane.refresh();
        alert(`✅ Preset "${preset.metadata.name}" deleted`);
      }
    }
  }
  
  /**
   * Save current configuration as preset
   */
  private saveCurrentAsPreset(): void {
    const name = prompt('Preset Name:', 'My Custom Preset');
    if (!name) return;
    
    const description = prompt('Description (optional):', '');
    const category = prompt('Category (complete/physics/visuals/audio/postfx):', 'complete');
    
    // TODO: Get actual current configuration from app
    // For now, create a placeholder
    const currentConfig = {
      // This would be populated with actual current state
      placeholder: true,
    };
    
    const preset = this.presetManager.createPreset(
      {
        name,
        description: description || `Custom preset: ${name}`,
        category: category || 'complete',
        author: 'User',
        tags: ['custom'],
      },
      currentConfig
    );
    
    this.selectPreset(preset.metadata.id);
    this.refreshPresetList();
    this.callbacks.onPresetCreate?.(preset);
    
    alert(`✨ Preset "${name}" saved successfully!`);
  }
  
  /**
   * Import presets from file
   */
  private importPresets(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event: any) => {
          const json = event.target.result;
          
          // Try to parse as single preset first
          try {
            const singlePreset = this.presetManager.importPreset(json);
            if (singlePreset) {
              this.selectPreset(singlePreset.metadata.id);
              this.refreshPresetList();
              alert(`📥 Preset "${singlePreset.metadata.name}" imported!`);
              return;
            }
          } catch (e) {
            // Not a single preset, try as array
          }
          
          // Try as array of presets
          const presets = this.presetManager.importPresets(json);
          if (presets.length > 0) {
            this.refreshPresetList();
            alert(`📥 Imported ${presets.length} preset(s) successfully!`);
          } else {
            alert('❌ Failed to import presets. Invalid format.');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  }
  
  /**
   * Export all presets
   */
  private exportAllPresets(): void {
    const json = this.presetManager.exportAllPresets();
    
    // Create download link
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `presets-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    console.log('📤 All presets exported successfully');
  }
  
  /**
   * Reset to default configuration
   */
  private resetToDefaults(): void {
    if (confirm('🔄 Reset to default configuration?\n\nThis will apply the default built-in preset.')) {
      // Apply first built-in preset
      const defaultPreset = Object.values(BUILTIN_PRESETS)[0];
      if (defaultPreset) {
        this.selectPreset(defaultPreset.metadata.id);
        this.applyPreset(defaultPreset.metadata.id);
      }
    }
  }
  
  /**
   * Dispose panel
   */
  public dispose(): void {
    this.presetInfoBindings.forEach(binding => {
      try {
        binding.dispose?.();
      } catch (e) {
        // Ignore
      }
    });
    this.presetInfoBindings = [];
    this.pane.dispose();
  }
}


