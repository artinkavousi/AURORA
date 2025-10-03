/**
 * AUDIO/PANELsoundreactivity.ts - Clean & simple audio reactivity panel
 * Streamlined UI with essential controls and presets
 */

import type { Pane } from 'tweakpane';
import type { AudioConfig, AudioReactiveConfig } from '../config';
import type { FlowConfig } from '../config';
import type { Dashboard } from '../PANEL/dashboard';
import { AudioVisualizationMode } from './audioreactive';
import { VISUALIZATION_MODE_NAMES } from './audiovisual';

export interface AudioPanelCallbacks {
  onAudioConfigChange?: (config: Partial<AudioConfig>) => void;
  onAudioReactiveConfigChange?: (config: Partial<AudioReactiveConfig>) => void;
  onSourceChange?: (source: 'microphone' | 'file') => void;
  onFileLoad?: (url: string) => void;
  onTogglePlayback?: () => void;
  onVolumeChange?: (volume: number) => void;
}

/**
 * Preset configurations for easy switching
 */
interface AudioPreset {
  name: string;
  description: string;
  config: Partial<AudioReactiveConfig> & { audioSmoothing?: number };
}

const PRESETS: AudioPreset[] = [
  {
    name: '🌊 Gentle Waves',
    description: 'Smooth, flowing motion - perfect for ambient music',
    config: {
      mode: AudioVisualizationMode.WAVE_FIELD,
      bassInfluence: 0.8,
      midInfluence: 0.6,
      trebleInfluence: 0.4,
      audioSmoothing: 0.9,
    },
  },
  {
    name: '💥 Energetic Dance',
    description: 'High energy with strong beat response',
    config: {
      mode: AudioVisualizationMode.VORTEX_DANCE,
      bassInfluence: 1.0,
      midInfluence: 0.9,
      trebleInfluence: 0.7,
      audioSmoothing: 0.75,
    },
  },
  {
    name: '🌀 Fluid Vortex',
    description: 'Swirling, organic motion',
    config: {
      mode: AudioVisualizationMode.KINETIC_FLOW,
      bassInfluence: 0.9,
      midInfluence: 1.0,
      trebleInfluence: 0.5,
      audioSmoothing: 0.85,
    },
  },
  {
    name: '✨ Shimmer Burst',
    description: 'Quick, responsive with sparkle',
    config: {
      mode: AudioVisualizationMode.FRACTAL_BURST,
      bassInfluence: 0.7,
      midInfluence: 0.8,
      trebleInfluence: 1.0,
      audioSmoothing: 0.7,
    },
  },
  {
    name: '🌌 Galaxy Spiral',
    description: 'Cosmic, expansive motion',
    config: {
      mode: AudioVisualizationMode.GALAXY_SPIRAL,
      bassInfluence: 0.9,
      midInfluence: 0.7,
      trebleInfluence: 0.6,
      audioSmoothing: 0.88,
    },
  },
];

/**
 * AudioPanel - Clean and simple audio reactivity control
 */
export class AudioPanel {
  private pane: any;
  private callbacks: AudioPanelCallbacks;
  private config: FlowConfig;
  
  // Control state
  private state = {
    enabled: true,
    source: 'microphone' as 'microphone' | 'file',
    volume: 1.0,
    preset: PRESETS[0].name,
    masterIntensity: 1.0,
  };
  
  // Base values (for scaling)
  private baseInfluences = {
    bass: 1.0,
    mid: 0.8,
    treble: 0.6,
  };
  
  // Live metrics (readonly displays)
  private metrics = {
    overall: 0,
    bass: 0,
    mid: 0,
    treble: 0,
    beat: 0,
  };
  
  constructor(
    dashboard: Dashboard,
    config: FlowConfig,
    callbacks: AudioPanelCallbacks = {}
  ) {
    this.config = config;
    this.callbacks = callbacks;
    
    // Create standalone draggable panel
    const { pane } = dashboard.createPanel('audio', {
      title: '🎵 Audio Reactivity',
      position: { x: window.innerWidth - 340, y: 520 },
      expanded: true,
      draggable: true,
      collapsible: true,
    });
    
    this.pane = pane;
    this.buildPanel();
  }
  
  private buildPanel(): void {
    // ==================== MAIN CONTROLS ====================
    this.buildMainControls();
    
    // ==================== LIVE METRICS ====================
    this.buildMetrics();
    
    // ==================== AUDIO INPUT ====================
    this.buildAudioInput();
    
    // ==================== PRESETS ====================
    this.buildPresets();
    
    // ==================== ADVANCED (Collapsed) ====================
    this.buildAdvanced();
  }
  
  // ========================================
  // MAIN CONTROLS
  // ========================================
  
  private buildMainControls(): void {
    const folder = this.pane.addFolder({
      title: '🎛️ Main Controls',
      expanded: true,
    });
    
    // Master enable/disable
    folder.addBinding(this.state, 'enabled', {
      label: 'Enable Audio FX',
    }).on('change', (ev: any) => {
      this.config.audioReactive.enabled = ev.value;
      this.callbacks.onAudioReactiveConfigChange?.({ enabled: ev.value });
    });
    
    folder.addBlade({ view: 'separator' });
    
    // Master intensity slider (scales all effects)
    folder.addBinding(this.state, 'masterIntensity', {
      label: 'Master Intensity',
      min: 0,
      max: 2,
      step: 0.1,
    }).on('change', (ev: any) => {
      // Scale frequency influences from base values
      const intensity = ev.value;
      const scaledConfig = {
        bassInfluence: this.baseInfluences.bass * intensity,
        midInfluence: this.baseInfluences.mid * intensity,
        trebleInfluence: this.baseInfluences.treble * intensity,
      };
      
      Object.assign(this.config.audioReactive, scaledConfig);
      this.callbacks.onAudioReactiveConfigChange?.(scaledConfig);
    });
  }
  
  // ========================================
  // LIVE METRICS
  // ========================================
  
  private buildMetrics(): void {
    const folder = this.pane.addFolder({
      title: '📊 Live Audio',
      expanded: true,
    });
    
    // Overall audio level (large display)
    folder.addBinding(this.metrics, 'overall', {
      label: 'Level',
      readonly: true,
      min: 0,
      max: 1,
      view: 'graph',
      rows: 3,
    });
    
    folder.addBlade({ view: 'separator' });
    
    // Frequency bands (compact)
    const grid = folder.addBlade({
      view: 'buttongrid',
      size: [3, 1],
      cells: (x: number, y: number) => ({
        title: [
          ['🔊 Bass', '🎸 Mid', '🎺 High']
        ][y][x],
      }),
      label: 'Bands',
    });
    
    // Small readonly indicators
    folder.addBinding(this.metrics, 'bass', {
      label: 'Bass',
      readonly: true,
      min: 0,
      max: 1,
    });
    
    folder.addBinding(this.metrics, 'mid', {
      label: 'Mid',
      readonly: true,
      min: 0,
      max: 1,
    });
    
    folder.addBinding(this.metrics, 'treble', {
      label: 'Treble',
      readonly: true,
      min: 0,
      max: 1,
    });
    
    folder.addBlade({ view: 'separator' });
    
    // Beat indicator
    folder.addBinding(this.metrics, 'beat', {
      label: '⚡ Beat',
      readonly: true,
      min: 0,
      max: 1,
    });
  }
  
  // ========================================
  // AUDIO INPUT
  // ========================================
  
  private buildAudioInput(): void {
    const folder = this.pane.addFolder({
      title: '🎤 Audio Source',
      expanded: false,
    });
    
    // Source selection
    folder.addBinding(this.state, 'source', {
      label: 'Input',
      options: {
        '🎤 Microphone': 'microphone',
        '🎵 Audio File': 'file',
      },
    }).on('change', (ev: any) => {
      this.config.audio.source = ev.value;
      this.callbacks.onSourceChange?.(ev.value);
    });
    
    folder.addBlade({ view: 'separator' });
    
    // Volume control
    folder.addBinding(this.state, 'volume', {
      label: 'Volume',
      min: 0,
      max: 1,
      step: 0.05,
    }).on('change', (ev: any) => {
      this.callbacks.onVolumeChange?.(ev.value);
    });
    
    folder.addBlade({ view: 'separator' });
    
    // File controls
    folder.addButton({
      title: '📂 Load Audio File',
    }).on('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'audio/*';
      input.onchange = (e: any) => {
        const file = e.target.files[0];
        if (file) {
          const url = URL.createObjectURL(file);
          this.callbacks.onFileLoad?.(url);
          console.log(`🎵 Loaded: ${file.name}`);
        }
      };
      input.click();
    });
    
    folder.addButton({
      title: '▶️ Play / Pause',
    }).on('click', () => {
      this.callbacks.onTogglePlayback?.();
    });
  }
  
  // ========================================
  // PRESETS
  // ========================================
  
  private buildPresets(): void {
    const folder = this.pane.addFolder({
      title: '🎨 Visual Presets',
      expanded: true,
    });
    
    // Preset selector
    const presetOptions: Record<string, string> = {};
    PRESETS.forEach(preset => {
      presetOptions[preset.name] = preset.name;
    });
    
    folder.addBinding(this.state, 'preset', {
      label: 'Preset',
      options: presetOptions,
    }).on('change', (ev: any) => {
      this.applyPreset(ev.value);
    });
    
    folder.addBlade({ view: 'separator' });
    
    // Quick preset buttons
    folder.addBlade({
      view: 'buttongrid',
      size: [2, 3],
      cells: (x: number, y: number) => {
        const index = y * 2 + x;
        if (index < PRESETS.length) {
          return { title: PRESETS[index].name };
        }
        return { title: '' };
      },
      label: 'Quick Select',
    }).on('click', (ev: any) => {
      const index = ev.index[1] * 2 + ev.index[0];
      if (index < PRESETS.length) {
        this.applyPreset(PRESETS[index].name);
        this.state.preset = PRESETS[index].name;
        this.pane.refresh();
      }
    });
  }
  
  // ========================================
  // ADVANCED SETTINGS
  // ========================================
  
  private buildAdvanced(): void {
    const folder = this.pane.addFolder({
      title: '⚙️ Advanced',
      expanded: false,
    });
    
    // Visualization mode
    const modeOptions: Record<string, number> = {};
    Object.values(AudioVisualizationMode).forEach((mode) => {
      if (typeof mode === 'number') {
        modeOptions[VISUALIZATION_MODE_NAMES[mode]] = mode;
      }
    });
    
    folder.addBinding(this.config.audioReactive, 'mode', {
      label: 'Visualization',
      options: modeOptions,
    }).on('change', (ev: any) => {
      this.callbacks.onAudioReactiveConfigChange?.({ mode: ev.value });
    });
    
    folder.addBlade({ view: 'separator' });
    
    // Fine-tune frequency influence
    const frequencyFolder = folder.addFolder({
      title: 'Frequency Balance',
      expanded: false,
    });
    
    frequencyFolder.addBinding(this.config.audioReactive, 'bassInfluence', {
      label: '🔊 Bass',
      min: 0,
      max: 1.5,
      step: 0.1,
    }).on('change', (ev: any) => {
      this.callbacks.onAudioReactiveConfigChange?.({ bassInfluence: ev.value });
    });
    
    frequencyFolder.addBinding(this.config.audioReactive, 'midInfluence', {
      label: '🎸 Mid',
      min: 0,
      max: 1.5,
      step: 0.1,
    }).on('change', (ev: any) => {
      this.callbacks.onAudioReactiveConfigChange?.({ midInfluence: ev.value });
    });
    
    frequencyFolder.addBinding(this.config.audioReactive, 'trebleInfluence', {
      label: '🎺 Treble',
      min: 0,
      max: 1.5,
      step: 0.1,
    }).on('change', (ev: any) => {
      this.callbacks.onAudioReactiveConfigChange?.({ trebleInfluence: ev.value });
    });
    
    folder.addBlade({ view: 'separator' });
    
    // Audio smoothing
    folder.addBinding(this.config.audio, 'smoothing', {
      label: 'Smoothness',
      min: 0.5,
      max: 0.95,
      step: 0.05,
    }).on('change', (ev: any) => {
      this.callbacks.onAudioConfigChange?.({ smoothing: ev.value });
    });
    
    // Beat sensitivity
    folder.addBinding(this.config.audio, 'beatThreshold', {
      label: 'Beat Sensitivity',
      min: 0.8,
      max: 2.0,
      step: 0.1,
    }).on('change', (ev: any) => {
      this.callbacks.onAudioConfigChange?.({ beatThreshold: ev.value });
    });
  }
  
  // ========================================
  // HELPERS
  // ========================================
  
  /**
   * Apply a preset configuration
   */
  private applyPreset(presetName: string): void {
    const preset = PRESETS.find(p => p.name === presetName);
    if (!preset) return;
    
    console.log(`🎨 Applying preset: ${preset.name}`);
    console.log(`   ${preset.description}`);
    
    // Extract base influences and store them
    const { audioSmoothing, bassInfluence, midInfluence, trebleInfluence, ...otherConfig } = preset.config;
    
    // Store base influences
    if (bassInfluence !== undefined) this.baseInfluences.bass = bassInfluence;
    if (midInfluence !== undefined) this.baseInfluences.mid = midInfluence;
    if (trebleInfluence !== undefined) this.baseInfluences.treble = trebleInfluence;
    
    // Apply scaled influences based on master intensity
    const intensity = this.state.masterIntensity;
    const scaledConfig = {
      ...otherConfig,
      bassInfluence: this.baseInfluences.bass * intensity,
      midInfluence: this.baseInfluences.mid * intensity,
      trebleInfluence: this.baseInfluences.treble * intensity,
    };
    
    this.callbacks.onAudioReactiveConfigChange?.(scaledConfig);
    
    // Apply audio smoothing if specified
    if (audioSmoothing !== undefined) {
      this.callbacks.onAudioConfigChange?.({ smoothing: audioSmoothing });
      this.config.audio.smoothing = audioSmoothing;
    }
    
    // Update local config
    Object.assign(this.config.audioReactive, scaledConfig);
    
    // Refresh panel
    this.pane.refresh();
  }
  
  /**
   * Update real-time metrics display
   */
  updateMetrics(
    bass: number,
    mid: number,
    treble: number,
    overall: number,
    beatIntensity: number,
    peakFrequency: number
  ): void {
    this.metrics.bass = bass;
    this.metrics.mid = mid;
    this.metrics.treble = treble;
    this.metrics.overall = overall;
    this.metrics.beat = beatIntensity;
  }
  
  /**
   * Dispose of panel
   */
  dispose(): void {
    this.pane.dispose();
  }
}
