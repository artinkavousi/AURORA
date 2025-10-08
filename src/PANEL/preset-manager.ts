/**
 * PANEL/preset-manager.ts - Universal preset system for saving/loading configurations
 * Save, load, and manage presets for all parameters across the entire application
 */

export interface PresetMetadata {
  id: string;
  name: string;
  description: string;
  category: string;
  author: string;
  createdAt: number;
  modifiedAt: number;
  tags: string[];
  thumbnail?: string;
  favorite: boolean;
}

export interface PresetData {
  metadata: PresetMetadata;
  config: Record<string, any>;
}

export interface PresetCategory {
  id: string;
  name: string;
  icon: string;
  description: string;
}

/**
 * Preset categories for organization
 */
export const PRESET_CATEGORIES: PresetCategory[] = [
  {
    id: 'complete',
    name: 'Complete Scene',
    icon: '🎬',
    description: 'Full scene configuration including all systems',
  },
  {
    id: 'physics',
    name: 'Physics',
    icon: '🌊',
    description: 'Particle physics and simulation settings',
  },
  {
    id: 'visuals',
    name: 'Visuals',
    icon: '🎨',
    description: 'Rendering, colors, and materials',
  },
  {
    id: 'audio',
    name: 'Audio',
    icon: '🎵',
    description: 'Sound reactivity and audio visualizations',
  },
  {
    id: 'postfx',
    name: 'Post Effects',
    icon: '✨',
    description: 'Post-processing effects',
  },
  {
    id: 'theme',
    name: 'Theme',
    icon: '🎨',
    description: 'Color themes and UI styling',
  },
];

/**
 * Built-in presets for quick start
 */
export const BUILTIN_PRESETS: Record<string, PresetData> = {
  WATER_SIMULATION: {
    metadata: {
      id: 'water-simulation',
      name: '💧 Water Simulation',
      description: 'Realistic fluid dynamics with water-like behavior',
      category: 'complete',
      author: 'Flow Team',
      createdAt: Date.now(),
      modifiedAt: Date.now(),
      tags: ['fluid', 'water', 'physics', 'realistic'],
      favorite: false,
    },
    config: {
      physics: {
        materialType: 'FLUID',
        viscosity: 0.3,
        surfaceTension: 1.5,
        density: 1.0,
      },
      visuals: {
        renderMode: 'MESH',
        materialPreset: 'WATER_DROPLET',
        colorMode: 'GRADIENT',
        colorGradient: 'OCEAN',
      },
      postfx: {
        bloom: { enabled: true, strength: 1.2 },
        radialCA: { enabled: false },
      },
      theme: 'ocean-cyan',
    },
  },

  ENERGETIC_DANCE: {
    metadata: {
      id: 'energetic-dance',
      name: '💥 Energetic Dance',
      description: 'High-energy particle dance with strong audio response',
      category: 'complete',
      author: 'Flow Team',
      createdAt: Date.now(),
      modifiedAt: Date.now(),
      tags: ['audio', 'reactive', 'energetic', 'music'],
      favorite: false,
    },
    config: {
      physics: {
        materialType: 'PLASMA',
        viscosity: 0.1,
        particleCount: 32768,
      },
      audio: {
        enabled: true,
        mode: 'VORTEX_DANCE',
        bassInfluence: 1.0,
        masterIntensity: 1.5,
      },
      visuals: {
        renderMode: 'SPRITE',
        colorMode: 'AUDIO_SPECTRUM',
        trailsEnabled: true,
        glowEnabled: true,
      },
      postfx: {
        bloom: { enabled: true, strength: 2.0 },
        radialCA: { enabled: true, strength: 0.02 },
      },
      theme: 'aurora-purple',
    },
  },

  SERENE_GARDEN: {
    metadata: {
      id: 'serene-garden',
      name: '🌸 Serene Garden',
      description: 'Calm, flowing particles with gentle movements',
      category: 'complete',
      author: 'Flow Team',
      createdAt: Date.now(),
      modifiedAt: Date.now(),
      tags: ['calm', 'gentle', 'ambient', 'nature'],
      favorite: false,
    },
    config: {
      physics: {
        materialType: 'FOAM',
        viscosity: 0.8,
        gravity: 'CENTER',
        noise: 0.5,
      },
      visuals: {
        renderMode: 'MESH',
        materialPreset: 'GENTLE',
        colorGradient: 'SPRING',
        softParticles: true,
      },
      audio: {
        enabled: true,
        mode: 'WAVE_FIELD',
        masterIntensity: 0.6,
      },
      postfx: {
        bloom: { enabled: true, strength: 0.8 },
        vignette: { enabled: true, intensity: 0.3 },
      },
      theme: 'emerald-forest',
    },
  },

  COSMIC_EXPLOSION: {
    metadata: {
      id: 'cosmic-explosion',
      name: '💫 Cosmic Explosion',
      description: 'Explosive particles with radial forces',
      category: 'complete',
      author: 'Flow Team',
      createdAt: Date.now(),
      modifiedAt: Date.now(),
      tags: ['explosive', 'radial', 'space', 'dramatic'],
      favorite: false,
    },
    config: {
      physics: {
        materialType: 'PLASMA',
        forceFields: [
          { type: 'EXPLOSION', strength: 30.0, position: [0, 0, 0] },
        ],
        boundaries: 'sphere',
      },
      visuals: {
        renderMode: 'SPRITE',
        colorMode: 'TEMPERATURE',
        glowEnabled: true,
        glowIntensity: 3.0,
      },
      postfx: {
        bloom: { enabled: true, strength: 3.0, radius: 2.0 },
        radialCA: { enabled: true, strength: 0.05 },
        filmGrain: { enabled: true, intensity: 0.05 },
      },
      theme: 'sunset-orange',
    },
  },

  MINIMALIST_DARK: {
    metadata: {
      id: 'minimalist-dark',
      name: '🌑 Minimalist Dark',
      description: 'Clean, minimal aesthetic with dark theme',
      category: 'complete',
      author: 'Flow Team',
      createdAt: Date.now(),
      modifiedAt: Date.now(),
      tags: ['minimal', 'dark', 'clean', 'simple'],
      favorite: false,
    },
    config: {
      physics: {
        materialType: 'RIGID',
        particleCount: 16384,
        boundaries: 'box',
      },
      visuals: {
        renderMode: 'POINT',
        colorMode: 'MONOCHROME',
        particleSize: 0.5,
        opacity: 0.8,
      },
      postfx: {
        bloom: { enabled: false },
        vignette: { enabled: true, intensity: 0.5 },
      },
      theme: 'midnight-dark',
    },
  },
};

/**
 * PresetManager - Universal preset system
 */
export class PresetManager {
  private presets: Map<string, PresetData> = new Map();
  private favorites: Set<string> = new Set();
  private currentPreset: PresetData | null = null;
  private onPresetChange?: (preset: PresetData) => void;

  constructor(onPresetChange?: (preset: PresetData) => void) {
    this.onPresetChange = onPresetChange;
    this.loadBuiltinPresets();
    this.loadCustomPresets();
    this.loadFavorites();
  }

  /**
   * Load built-in presets
   */
  private loadBuiltinPresets(): void {
    Object.values(BUILTIN_PRESETS).forEach(preset => {
      this.presets.set(preset.metadata.id, preset);
    });
  }

  /**
   * Get all presets
   */
  getAllPresets(): PresetData[] {
    return Array.from(this.presets.values()).sort((a, b) => {
      // Favorites first
      if (a.metadata.favorite !== b.metadata.favorite) {
        return a.metadata.favorite ? -1 : 1;
      }
      // Then by modified date
      return b.metadata.modifiedAt - a.metadata.modifiedAt;
    });
  }

  /**
   * Get presets by category
   */
  getPresetsByCategory(category: string): PresetData[] {
    return this.getAllPresets().filter(p => p.metadata.category === category);
  }

  /**
   * Get preset by ID
   */
  getPreset(id: string): PresetData | null {
    return this.presets.get(id) || null;
  }

  /**
   * Get current preset
   */
  getCurrentPreset(): PresetData | null {
    return this.currentPreset;
  }

  /**
   * Create new preset
   */
  createPreset(metadata: Partial<PresetMetadata>, config: Record<string, any>): PresetData {
    const id = metadata.id || this.generatePresetId(metadata.name || 'New Preset');
    const now = Date.now();

    const preset: PresetData = {
      metadata: {
        id,
        name: metadata.name || 'New Preset',
        description: metadata.description || '',
        category: metadata.category || 'complete',
        author: metadata.author || 'User',
        createdAt: metadata.createdAt || now,
        modifiedAt: now,
        tags: metadata.tags || [],
        thumbnail: metadata.thumbnail,
        favorite: metadata.favorite || false,
      },
      config,
    };

    this.presets.set(id, preset);
    this.saveCustomPresets();
    
    console.log(`✨ Created preset: ${preset.metadata.name}`);
    return preset;
  }

  /**
   * Update existing preset
   */
  updatePreset(id: string, updates: Partial<PresetData>): boolean {
    const preset = this.presets.get(id);
    if (!preset) return false;

    if (updates.metadata) {
      Object.assign(preset.metadata, updates.metadata);
      preset.metadata.modifiedAt = Date.now();
    }

    if (updates.config) {
      Object.assign(preset.config, updates.config);
    }

    this.presets.set(id, preset);
    this.saveCustomPresets();
    
    console.log(`📝 Updated preset: ${preset.metadata.name}`);
    return true;
  }

  /**
   * Delete preset
   */
  deletePreset(id: string): boolean {
    // Don't allow deleting built-in presets
    if (BUILTIN_PRESETS[id.toUpperCase().replace(/-/g, '_')]) {
      console.warn('Cannot delete built-in preset');
      return false;
    }

    if (this.presets.has(id)) {
      this.presets.delete(id);
      this.favorites.delete(id);
      this.saveCustomPresets();
      this.saveFavorites();
      return true;
    }
    return false;
  }

  /**
   * Apply preset
   */
  applyPreset(id: string): boolean {
    const preset = this.presets.get(id);
    if (!preset) return false;

    this.currentPreset = preset;
    this.onPresetChange?.(preset);
    this.saveCurrentPreset(id);
    
    console.log(`🎯 Applied preset: ${preset.metadata.name}`);
    return true;
  }

  /**
   * Toggle favorite
   */
  toggleFavorite(id: string): boolean {
    const preset = this.presets.get(id);
    if (!preset) return false;

    preset.metadata.favorite = !preset.metadata.favorite;
    
    if (preset.metadata.favorite) {
      this.favorites.add(id);
    } else {
      this.favorites.delete(id);
    }

    this.saveCustomPresets();
    this.saveFavorites();
    return preset.metadata.favorite;
  }

  /**
   * Get favorites
   */
  getFavorites(): PresetData[] {
    return this.getAllPresets().filter(p => p.metadata.favorite);
  }

  /**
   * Search presets
   */
  searchPresets(query: string): PresetData[] {
    const lowerQuery = query.toLowerCase();
    return this.getAllPresets().filter(preset => {
      return (
        preset.metadata.name.toLowerCase().includes(lowerQuery) ||
        preset.metadata.description.toLowerCase().includes(lowerQuery) ||
        preset.metadata.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
      );
    });
  }

  /**
   * Export preset as JSON
   */
  exportPreset(id: string): string | null {
    const preset = this.presets.get(id);
    if (!preset) return null;
    return JSON.stringify(preset, null, 2);
  }

  /**
   * Export all custom presets
   */
  exportAllPresets(): string {
    const customPresets = this.getAllPresets().filter(
      p => !BUILTIN_PRESETS[p.metadata.id.toUpperCase().replace(/-/g, '_')]
    );
    return JSON.stringify(customPresets, null, 2);
  }

  /**
   * Import preset from JSON
   */
  importPreset(json: string): PresetData | null {
    try {
      const preset = JSON.parse(json) as PresetData;
      if (this.validatePreset(preset)) {
        // Generate new ID if it conflicts
        if (this.presets.has(preset.metadata.id)) {
          preset.metadata.id = this.generatePresetId(preset.metadata.name);
        }
        this.presets.set(preset.metadata.id, preset);
        this.saveCustomPresets();
        console.log(`📥 Imported preset: ${preset.metadata.name}`);
        return preset;
      }
    } catch (error) {
      console.error('Failed to import preset:', error);
    }
    return null;
  }

  /**
   * Import multiple presets
   */
  importPresets(json: string): PresetData[] {
    try {
      const presets = JSON.parse(json) as PresetData[];
      const imported: PresetData[] = [];
      
      presets.forEach(preset => {
        if (this.validatePreset(preset)) {
          if (this.presets.has(preset.metadata.id)) {
            preset.metadata.id = this.generatePresetId(preset.metadata.name);
          }
          this.presets.set(preset.metadata.id, preset);
          imported.push(preset);
        }
      });
      
      if (imported.length > 0) {
        this.saveCustomPresets();
        console.log(`📥 Imported ${imported.length} presets`);
      }
      
      return imported;
    } catch (error) {
      console.error('Failed to import presets:', error);
      return [];
    }
  }

  /**
   * Duplicate preset
   */
  duplicatePreset(id: string): PresetData | null {
    const original = this.presets.get(id);
    if (!original) return null;

    const duplicate: PresetData = {
      metadata: {
        ...original.metadata,
        id: this.generatePresetId(original.metadata.name + ' (Copy)'),
        name: original.metadata.name + ' (Copy)',
        createdAt: Date.now(),
        modifiedAt: Date.now(),
        favorite: false,
      },
      config: JSON.parse(JSON.stringify(original.config)),
    };

    this.presets.set(duplicate.metadata.id, duplicate);
    this.saveCustomPresets();
    
    console.log(`📋 Duplicated preset: ${duplicate.metadata.name}`);
    return duplicate;
  }

  /**
   * Validate preset structure
   */
  private validatePreset(preset: any): preset is PresetData {
    return (
      preset &&
      preset.metadata &&
      typeof preset.metadata.id === 'string' &&
      typeof preset.metadata.name === 'string' &&
      preset.config &&
      typeof preset.config === 'object'
    );
  }

  /**
   * Generate unique preset ID
   */
  private generatePresetId(name: string): string {
    const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    let id = base;
    let counter = 1;
    
    while (this.presets.has(id)) {
      id = `${base}-${counter}`;
      counter++;
    }
    
    return id;
  }

  /**
   * Save custom presets to localStorage
   */
  private saveCustomPresets(): void {
    try {
      const customPresets = this.getAllPresets().filter(
        p => !BUILTIN_PRESETS[p.metadata.id.toUpperCase().replace(/-/g, '_')]
      );
      localStorage.setItem('flow-custom-presets', JSON.stringify(customPresets));
    } catch (error) {
      console.warn('Failed to save custom presets:', error);
    }
  }

  /**
   * Load custom presets from localStorage
   */
  private loadCustomPresets(): void {
    try {
      const saved = localStorage.getItem('flow-custom-presets');
      if (saved) {
        const presets = JSON.parse(saved) as PresetData[];
        presets.forEach(preset => {
          if (this.validatePreset(preset)) {
            this.presets.set(preset.metadata.id, preset);
          }
        });
      }
    } catch (error) {
      console.warn('Failed to load custom presets:', error);
    }
  }

  /**
   * Save current preset ID
   */
  private saveCurrentPreset(id: string): void {
    try {
      localStorage.setItem('flow-current-preset', id);
    } catch (error) {
      console.warn('Failed to save current preset:', error);
    }
  }

  /**
   * Load saved preset
   */
  loadSavedPreset(): void {
    try {
      const savedId = localStorage.getItem('flow-current-preset');
      if (savedId) {
        this.applyPreset(savedId);
      }
    } catch (error) {
      console.warn('Failed to load saved preset:', error);
    }
  }

  /**
   * Save favorites
   */
  private saveFavorites(): void {
    try {
      localStorage.setItem('flow-preset-favorites', JSON.stringify(Array.from(this.favorites)));
    } catch (error) {
      console.warn('Failed to save favorites:', error);
    }
  }

  /**
   * Load favorites
   */
  private loadFavorites(): void {
    try {
      const saved = localStorage.getItem('flow-preset-favorites');
      if (saved) {
        const favorites = JSON.parse(saved) as string[];
        favorites.forEach(id => this.favorites.add(id));
        
        // Update preset metadata
        favorites.forEach(id => {
          const preset = this.presets.get(id);
          if (preset) {
            preset.metadata.favorite = true;
          }
        });
      }
    } catch (error) {
      console.warn('Failed to load favorites:', error);
    }
  }

  /**
   * Dispose preset manager
   */
  dispose(): void {
    this.presets.clear();
    this.favorites.clear();
    this.currentPreset = null;
  }
}



