/**
 * PANEL/tabs/LibraryTab.ts - Material library and presets browser
 * NEW - Enhanced preset management system
 */

import type { Pane } from 'tweakpane';
import type { FlowConfig } from '../../config';
import { BaseTab, type BaseCallbacks } from '../types';

export interface LibraryTabCallbacks extends BaseCallbacks {
  onMaterialPresetSelect?: (presetName: string) => void;
  onScenePresetLoad?: (presetName: string) => void;
  onConfigExport?: () => void;
  onConfigImport?: (config: any) => void;
}

export class LibraryTab extends BaseTab {
  constructor(pane: Pane, config: FlowConfig, callbacks: LibraryTabCallbacks = {}) {
    super(pane, config, callbacks);
  }

  buildUI(): void {
    this.setupMaterialPresets();
    this.setupScenePresets();
    this.setupCustomPresets();
    this.setupImportExport();
  }

  private setupMaterialPresets(): void {
    const folder = this.createFolder('🎨 Material Presets', true);
    if (!folder || typeof folder.addBinding !== 'function') {
      return;
    }
    
    const searchState = {
      query: '',
      category: 'All',
    };
    
    folder.addBinding(searchState, 'query', {
      label: '🔍 Search',
    });
    
    this.createList(
      'Category',
      searchState.category,
      {
        'All': 'All',
        'Glass': 'Glass',
        'Metal': 'Metal',
        'Liquid': 'Liquid',
        'Energy': 'Energy',
        'Nature': 'Nature',
      },
      (value: string) => {
        searchState.category = value;
        console.log('[LibraryTab] Filter by category:', value);
      }
    );
    
    folder.addBlade({ view: 'separator' });
    
    // Placeholder for preset grid (would need custom view)
    const infoFolder = folder.addFolder({ title: '📋 Preset List', expanded: true });
    if (infoFolder && typeof infoFolder.addBlade === 'function') {
      // Use a simple text blade instead of addMonitor
      this.createButton('ℹ️ Material presets are available in the Visuals tab', () => {
        console.log('[LibraryTab] Navigate to Visuals tab for material presets');
      });
    }
  }

  private setupScenePresets(): void {
    const folder = this.createFolder('📦 Scene Presets', true);
    if (!folder || typeof folder.addButton !== 'function') {
      return;
    }
    
    const scenePresets = [
      { name: '💧 Water Fountain', id: 'water_fountain' },
      { name: '❄️ Snow Storm', id: 'snow_storm' },
      { name: '🌪️ Tornado', id: 'tornado' },
      { name: '💥 Explosion', id: 'explosion' },
      { name: '🌀 Galaxy', id: 'galaxy' },
      { name: '🔥 Fire Burst', id: 'fire_burst' },
      { name: '💎 Crystal Formation', id: 'crystal' },
      { name: '🌊 Ocean Waves', id: 'ocean' },
    ];
    
    scenePresets.forEach(preset => {
      this.createButton(preset.name, () => {
        console.log('[LibraryTab] Loading scene preset:', preset.id);
        (this.callbacks as LibraryTabCallbacks).onScenePresetLoad?.(preset.id);
      });
    });
  }

  private setupCustomPresets(): void {
    const folder = this.createFolder('🎚️ Custom Presets', false);
    if (!folder || typeof folder.addButton !== 'function') {
      return;
    }
    
    this.createButton('➕ Save Current Config', () => {
      const timestamp = new Date().toISOString().split('T')[0];
      const presetName = prompt('Enter preset name:', `Custom ${timestamp}`);
      if (presetName) {
        this.saveCustomPreset(presetName);
      }
    });
    
    this.createButton('📋 Manage Presets...', () => {
      console.log('[LibraryTab] Opening preset manager (not yet implemented)');
      alert('Preset manager\n\nThis feature is coming soon!');
    });
    
    folder.addBlade({ view: 'separator' });
    
    const infoFolder = folder.addFolder({ title: 'ℹ️ Saved Presets', expanded: false });
    if (infoFolder && typeof infoFolder.addBinding === 'function') {
      const countState = { count: this.getSavedPresetsCount() };
      infoFolder.addBinding(countState, 'count', { 
        label: 'Total',
        readonly: true,
      });
    }
  }

  private setupImportExport(): void {
    const folder = this.createFolder('💾 Import / Export', true);
    if (!folder || typeof folder.addButton !== 'function') {
      return;
    }
    
    this.createButton('📥 Import Config (JSON)', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = (e: any) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event: any) => {
            try {
              const config = JSON.parse(event.target.result);
              (this.callbacks as LibraryTabCallbacks).onConfigImport?.(config);
              console.log('[LibraryTab] Config imported successfully');
            } catch (error) {
              console.error('[LibraryTab] Failed to parse config:', error);
              alert('Failed to import config: Invalid JSON format');
            }
          };
          reader.readAsText(file);
        }
      };
      input.click();
    });
    
    this.createButton('📤 Export Config (JSON)', () => {
      const configJson = JSON.stringify(this.config, null, 2);
      const blob = new Blob([configJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `aurora-config-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      console.log('[LibraryTab] Config exported');
    });
    
    folder.addBlade({ view: 'separator' });
    
    this.createButton('📥 Import Preset Pack (JSON)', () => {
      console.log('[LibraryTab] Import preset pack (not yet implemented)');
      alert('Preset Pack Import\n\nThis feature is coming soon!');
    });
    
    this.createButton('📤 Export All Presets (ZIP)', () => {
      console.log('[LibraryTab] Export all presets (not yet implemented)');
      alert('Preset Pack Export\n\nThis feature is coming soon!');
    });
  }

  private saveCustomPreset(name: string): void {
    try {
      const presets = this.getCustomPresets();
      presets[name] = {
        timestamp: new Date().toISOString(),
        config: this.config,
      };
      localStorage.setItem('aurora.customPresets', JSON.stringify(presets));
      console.log('[LibraryTab] Saved custom preset:', name);
      alert(`Preset "${name}" saved successfully!`);
    } catch (error) {
      console.error('[LibraryTab] Failed to save preset:', error);
      alert('Failed to save preset: ' + error);
    }
  }

  private getCustomPresets(): Record<string, any> {
    try {
      const data = localStorage.getItem('aurora.customPresets');
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  }

  private getSavedPresetsCount(): number {
    return Object.keys(this.getCustomPresets()).length;
  }

  public dispose(): void {
    // Cleanup if needed
  }
}


