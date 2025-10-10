/**
 * AUDIO/PANELsoundreactivity.ts - Clean & simple audio reactivity panel
 * Streamlined UI with essential controls and presets
 */

import type { Pane } from 'tweakpane';
import type { AudioConfig, AudioReactiveConfig } from '../../config';
import type { FlowConfig } from '../../config';
import type { Dashboard } from '../dashboard';
import { AudioVisualizationMode } from '../../AUDIO/audioreactive';
import { VISUALIZATION_MODE_NAMES } from '../../AUDIO/audiovisual';
import type { AudioData } from '../../AUDIO/soundreactivity';

type PaneContainer = Pick<
  Pane,
  'addFolder' | 'addBinding' | 'addMonitor' | 'addBlade' | 'addButton' | 'addInput' | 'addTab' | 'refresh'
>;

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
  {
    name: '🌠 Aurora Veil',
    description: 'Silky light curtains shimmer with treble energy',
    config: {
      mode: AudioVisualizationMode.AURORA_VEIL,
      bassInfluence: 0.6,
      midInfluence: 0.7,
      trebleInfluence: 1.0,
      audioSmoothing: 0.82,
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
  private overviewMetrics = {
    overall: 0,
    bass: 0,
    mid: 0,
    treble: 0,
    beat: 0,
    tempoPhase: 0,
  };

  private featureMetrics = {
    spectralFlux: 0,
    onsetEnergy: 0,
    harmonicRatio: 0,
    harmonicEnergy: 0,
    rhythmConfidence: 0,
    tempo: 0,
    stereoBalance: 0,
    stereoWidth: 0,
    groove: 0,
    overallTrend: 0,
  };

  private modulationReadouts = {
    pulse: 0,
    flow: 0,
    shimmer: 0,
    warp: 0,
    density: 0,
    aura: 0,
    containment: 0,
    sway: 0,
  };

  private motionReadouts = {
    expansion: 0,
    sway: 0,
    sparkle: 0,
  };

  private dynamicsReadouts = {
    momentum: 0,
    acceleration: 0,
    breath: 0,
  };

  private sparklineState = {
    loudness: '─',
    flux: '─',
    beat: '─',
  };

  private metricBindings: any[] = [];
  private featureBindings: any[] = [];
  private modulatorBindings: any[] = [];
  private motionBindings: any[] = [];
  private dynamicsBindings: any[] = [];
  private sparklineBindings: any[] = [];
  
  constructor(
    dashboard: Dashboard,
    config: FlowConfig,
    callbacks: AudioPanelCallbacks = {}
  ) {
    this.config = config;
    this.callbacks = callbacks;
    
    // Register within the adaptive dashboard shell
    this.pane = dashboard.registerPanel({
      id: 'audio',
      title: '🎵 Audio Reactivity',
      icon: '🎵',
      description: 'Sound-reactive controls, modulation, and monitoring',
    });

    this.buildPanel();
  }

  private buildPanel(): void {
    const tabs = this.pane.addTab({
      pages: [
        { title: 'Essentials' },
        { title: 'Dynamics' },
        { title: 'Modulation' },
        { title: 'Advanced' },
      ],
    });

    const essentials = tabs.pages[0] as unknown as PaneContainer;
    const dynamics = tabs.pages[1] as unknown as PaneContainer;
    const modulation = tabs.pages[2] as unknown as PaneContainer;
    const advanced = tabs.pages[3] as unknown as PaneContainer;

    this.buildMainControls(essentials);
    this.buildAudioInput(essentials);
    this.buildPresets(essentials);

    this.buildOverview(dynamics);
    this.buildFeatureInsights(dynamics);
    this.buildMotionDynamics(dynamics);

    this.buildModulationLab(modulation);

    this.buildHistory(advanced);
    this.buildAdvanced(advanced);
  }
  
  // ========================================
  // MAIN CONTROLS
  // ========================================
  
  private buildMainControls(container: PaneContainer = this.pane): void {
    const folder = container.addFolder({
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
  
  private buildOverview(container: PaneContainer = this.pane): void {
    const folder = container.addFolder({
      title: '📊 Live Overview',
      expanded: true,
    });

    this.metricBindings.push(folder.addBinding(this.overviewMetrics, 'overall', {
      label: 'Level',
      readonly: true,
      min: 0,
      max: 1,
      view: 'graph',
      rows: 3,
    }));

    folder.addBlade({ view: 'separator' });

    const bandsFolder = folder.addFolder({
      title: 'Frequency Bands',
      expanded: true,
    });

    this.metricBindings.push(bandsFolder.addBinding(this.overviewMetrics, 'bass', {
      label: '🔊 Bass',
      readonly: true,
      min: 0,
      max: 1,
      format: (v: number) => v.toFixed(2),
    }));

    this.metricBindings.push(bandsFolder.addBinding(this.overviewMetrics, 'mid', {
      label: '🎸 Mid',
      readonly: true,
      min: 0,
      max: 1,
      format: (v: number) => v.toFixed(2),
    }));

    this.metricBindings.push(bandsFolder.addBinding(this.overviewMetrics, 'treble', {
      label: '🎺 High',
      readonly: true,
      min: 0,
      max: 1,
      format: (v: number) => v.toFixed(2),
    }));

    folder.addBlade({ view: 'separator' });

    this.metricBindings.push(folder.addBinding(this.overviewMetrics, 'beat', {
      label: '⚡ Beat Pulse',
      readonly: true,
      min: 0,
      max: 1,
      format: (v: number) => v.toFixed(2),
    }));

    this.metricBindings.push(folder.addBinding(this.overviewMetrics, 'tempoPhase', {
      label: 'Tempo Phase',
      readonly: true,
      min: 0,
      max: 1,
      view: 'graph',
    }));
  }

  private buildFeatureInsights(container: PaneContainer = this.pane): void {
    const folder = container.addFolder({
      title: '🧠 Feature Insights',
      expanded: false,
    });

    this.featureBindings.push(folder.addBinding(this.featureMetrics, 'spectralFlux', {
      label: 'Spectral Flux',
      readonly: true,
      min: 0,
      max: 1,
      format: (v: number) => v.toFixed(3),
    }));

    this.featureBindings.push(folder.addBinding(this.featureMetrics, 'onsetEnergy', {
      label: 'Onset Energy',
      readonly: true,
      min: 0,
      max: 1,
      format: (v: number) => v.toFixed(3),
    }));

    this.featureBindings.push(folder.addBinding(this.featureMetrics, 'harmonicRatio', {
      label: 'Harmonic Ratio',
      readonly: true,
      min: 0,
      max: 1,
      format: (v: number) => v.toFixed(3),
    }));

    this.featureBindings.push(folder.addBinding(this.featureMetrics, 'harmonicEnergy', {
      label: 'Harmonic Energy',
      readonly: true,
      min: 0,
      max: 1.5,
      format: (v: number) => v.toFixed(3),
    }));

    this.featureBindings.push(folder.addBinding(this.featureMetrics, 'rhythmConfidence', {
      label: 'Rhythm Confidence',
      readonly: true,
      min: 0,
      max: 1,
      format: (v: number) => v.toFixed(3),
    }));

    this.featureBindings.push(folder.addBinding(this.featureMetrics, 'tempo', {
      label: 'Tempo (BPM)',
      readonly: true,
      min: 40,
      max: 200,
      format: (v: number) => v.toFixed(1),
    }));

    this.featureBindings.push(folder.addBinding(this.featureMetrics, 'stereoBalance', {
      label: 'Stereo Balance',
      readonly: true,
      min: -1,
      max: 1,
      format: (v: number) => v.toFixed(3),
    }));

    this.featureBindings.push(folder.addBinding(this.featureMetrics, 'stereoWidth', {
      label: 'Stereo Width',
      readonly: true,
      min: 0,
      max: 1,
      format: (v: number) => v.toFixed(3),
    }));

    this.featureBindings.push(folder.addBinding(this.featureMetrics, 'groove', {
      label: 'Groove Index',
      readonly: true,
      min: 0,
      max: 1,
      format: (v: number) => v.toFixed(3),
    }));

    this.featureBindings.push(folder.addBinding(this.featureMetrics, 'overallTrend', {
      label: 'Energy Trend',
      readonly: true,
      min: -1,
      max: 1,
      format: (v: number) => v.toFixed(3),
    }));
  }

  private buildMotionDynamics(container: PaneContainer = this.pane): void {
    const motionFolder = container.addFolder({
      title: '🌬️ Motion Field',
      expanded: false,
    });

    this.motionBindings.push(motionFolder.addBinding(this.motionReadouts, 'expansion', {
      label: 'Expansion',
      readonly: true,
      min: 0,
      max: 1,
      format: (v: number) => v.toFixed(3),
    }));

    this.motionBindings.push(motionFolder.addBinding(this.motionReadouts, 'sway', {
      label: 'Stereo Sway',
      readonly: true,
      min: -1,
      max: 1,
      format: (v: number) => v.toFixed(3),
    }));

    this.motionBindings.push(motionFolder.addBinding(this.motionReadouts, 'sparkle', {
      label: 'Sparkle',
      readonly: true,
      min: 0,
      max: 1,
      format: (v: number) => v.toFixed(3),
    }));

    const dynamicsFolder = container.addFolder({
      title: '🫁 Dynamics Envelope',
      expanded: false,
    });

    this.dynamicsBindings.push(dynamicsFolder.addBinding(this.dynamicsReadouts, 'momentum', {
      label: 'Momentum',
      readonly: true,
      min: -1,
      max: 1,
      format: (v: number) => v.toFixed(3),
    }));

    this.dynamicsBindings.push(dynamicsFolder.addBinding(this.dynamicsReadouts, 'acceleration', {
      label: 'Acceleration',
      readonly: true,
      min: -1,
      max: 1,
      format: (v: number) => v.toFixed(3),
    }));

    this.dynamicsBindings.push(dynamicsFolder.addBinding(this.dynamicsReadouts, 'breath', {
      label: 'Breath',
      readonly: true,
      min: 0,
      max: 1,
      format: (v: number) => v.toFixed(3),
    }));
  }


  private buildModulationLab(container: PaneContainer = this.pane): void {
    const folder = container.addFolder({
      title: '🎚️ Modulation Lab',
      expanded: false,
    });

    const readoutFolder = folder.addFolder({
      title: 'Live Modulators',
      expanded: true,
    });

    const modulatorKeys: Array<keyof typeof this.modulationReadouts> = [
      'pulse', 'flow', 'shimmer', 'warp', 'density', 'aura', 'containment', 'sway'
    ];

    for (const key of modulatorKeys) {
      this.modulatorBindings.push(readoutFolder.addBinding(this.modulationReadouts, key, {
        label: key.charAt(0).toUpperCase() + key.slice(1),
        readonly: true,
        min: 0,
        max: 1,
        format: (v: number) => v.toFixed(3),
      }));
    }

    folder.addBlade({ view: 'separator' });

    const routingFolder = folder.addFolder({
      title: 'Routing Intensities',
      expanded: false,
    });

    routingFolder.addBinding(this.config.audioReactive, 'modulationPulseForce', {
      label: 'Pulse → Forces',
      min: 0,
      max: 2,
      step: 0.05,
    }).on('change', (ev: any) => {
      this.callbacks.onAudioReactiveConfigChange?.({ modulationPulseForce: ev.value });
    });

    routingFolder.addBinding(this.config.audioReactive, 'modulationFlowTurbulence', {
      label: 'Flow → Fluidity',
      min: 0,
      max: 2,
      step: 0.05,
    }).on('change', (ev: any) => {
      this.callbacks.onAudioReactiveConfigChange?.({ modulationFlowTurbulence: ev.value });
    });

    routingFolder.addBinding(this.config.audioReactive, 'modulationShimmerColor', {
      label: 'Shimmer → Color',
      min: 0,
      max: 2,
      step: 0.05,
    }).on('change', (ev: any) => {
      this.callbacks.onAudioReactiveConfigChange?.({ modulationShimmerColor: ev.value });
    });

    routingFolder.addBinding(this.config.audioReactive, 'modulationWarpSpatial', {
      label: 'Warp → Spatial',
      min: 0,
      max: 2,
      step: 0.05,
    }).on('change', (ev: any) => {
      this.callbacks.onAudioReactiveConfigChange?.({ modulationWarpSpatial: ev.value });
    });

    routingFolder.addBinding(this.config.audioReactive, 'modulationDensitySpawn', {
      label: 'Density → Emit',
      min: 0,
      max: 2,
      step: 0.05,
    }).on('change', (ev: any) => {
      this.callbacks.onAudioReactiveConfigChange?.({ modulationDensitySpawn: ev.value });
    });

    routingFolder.addBinding(this.config.audioReactive, 'modulationAuraBloom', {
      label: 'Aura → Bloom',
      min: 0,
      max: 2,
      step: 0.05,
    }).on('change', (ev: any) => {
      this.callbacks.onAudioReactiveConfigChange?.({ modulationAuraBloom: ev.value });
    });

    folder.addBlade({ view: 'separator' });

    const temporalFolder = folder.addFolder({
      title: 'Temporal Sculpting',
      expanded: false,
    });

    temporalFolder.addBinding(this.config.audioReactive, 'timelineSmoothing', {
      label: 'Timeline Smooth',
      min: 0,
      max: 1,
      step: 0.05,
    }).on('change', (ev: any) => {
      this.callbacks.onAudioReactiveConfigChange?.({ timelineSmoothing: ev.value });
    });

    temporalFolder.addBinding(this.config.audioReactive, 'transitionResponsiveness', {
      label: 'Transition Agility',
      min: 0,
      max: 1,
      step: 0.05,
    }).on('change', (ev: any) => {
      this.callbacks.onAudioReactiveConfigChange?.({ transitionResponsiveness: ev.value });
    });
  }

  private buildHistory(container: PaneContainer = this.pane): void {
    const folder = container.addFolder({
      title: '🗂️ Motion History',
      expanded: false,
    });

    this.sparklineBindings.push(folder.addBinding(this.sparklineState, 'loudness', {
      label: 'Loudness',
      readonly: true,
    }));

    this.sparklineBindings.push(folder.addBinding(this.sparklineState, 'flux', {
      label: 'Flux',
      readonly: true,
    }));

    this.sparklineBindings.push(folder.addBinding(this.sparklineState, 'beat', {
      label: 'Beat Grid',
      readonly: true,
    }));
  }
  
  // ========================================
  // AUDIO INPUT
  // ========================================
  
  private buildAudioInput(container: PaneContainer = this.pane): void {
    const folder = container.addFolder({
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
  
  private buildPresets(container: PaneContainer = this.pane): void {
    const folder = container.addFolder({
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
    
    // Quick preset buttons (replaced buttongrid which isn't available in Tweakpane v4)
    PRESETS.forEach((preset) => {
      folder.addButton({ title: preset.name }).on('click', () => {
        this.applyPreset(preset.name);
        this.state.preset = preset.name;
        (this.pane as any).refresh?.();
      });
    });
  }
  
  // ========================================
  // ADVANCED SETTINGS
  // ========================================
  
  private buildAdvanced(container: PaneContainer = this.pane): void {
    const folder = container.addFolder({
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

    const responseFolder = folder.addFolder({
      title: 'Signal Response',
      expanded: false,
    });

    responseFolder.addBinding(this.config.audio, 'featureSmoothing', {
      label: 'Feature Lag',
      min: 0,
      max: 0.95,
      step: 0.01,
    }).on('change', (ev: any) => {
      this.callbacks.onAudioConfigChange?.({ featureSmoothing: ev.value });
    });

    responseFolder.addBinding(this.config.audio, 'modulationSmoothing', {
      label: 'Modulation Lag',
      min: 0,
      max: 0.95,
      step: 0.01,
    }).on('change', (ev: any) => {
      this.callbacks.onAudioConfigChange?.({ modulationSmoothing: ev.value });
    });

    responseFolder.addBinding(this.config.audio, 'motionSmoothing', {
      label: 'Motion Lag',
      min: 0,
      max: 0.95,
      step: 0.01,
    }).on('change', (ev: any) => {
      this.callbacks.onAudioConfigChange?.({ motionSmoothing: ev.value });
    });

    responseFolder.addBinding(this.config.audio, 'dynamicsSmoothing', {
      label: 'Dynamics Lag',
      min: 0,
      max: 0.95,
      step: 0.01,
    }).on('change', (ev: any) => {
      this.callbacks.onAudioConfigChange?.({ dynamicsSmoothing: ev.value });
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
  private renderSparkline(data: Float32Array, segments = 28): string {
    if (!data.length) return '';
    const glyphs = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
    const stride = Math.max(1, Math.floor(data.length / segments));
    const values: number[] = [];

    for (let i = 0; i < data.length; i += stride) {
      let sum = 0;
      let count = 0;
      for (let j = 0; j < stride && i + j < data.length; j++) {
        sum += data[i + j];
        count++;
      }
      values.push(count > 0 ? sum / count : 0);
    }

    return values.map((value) => {
      const normalized = Math.min(1, Math.max(0, value));
      const index = Math.min(glyphs.length - 1, Math.round(normalized * (glyphs.length - 1)));
      return glyphs[index];
    }).join('');
  }

  updateMetrics(audio: AudioData): void {
    this.overviewMetrics.bass = audio.smoothBass;
    this.overviewMetrics.mid = audio.smoothMid;
    this.overviewMetrics.treble = audio.smoothTreble;
    this.overviewMetrics.overall = audio.smoothOverall;
    this.overviewMetrics.beat = audio.beatIntensity;
    this.overviewMetrics.tempoPhase = audio.tempoPhase;

    this.featureMetrics.spectralFlux = audio.features.spectralFlux;
    this.featureMetrics.onsetEnergy = audio.features.onsetEnergy;
    this.featureMetrics.harmonicRatio = audio.features.harmonicRatio;
    this.featureMetrics.harmonicEnergy = audio.features.harmonicEnergy;
    this.featureMetrics.rhythmConfidence = audio.features.rhythmConfidence;
    this.featureMetrics.tempo = audio.features.tempo;
    this.featureMetrics.stereoBalance = audio.features.stereoBalance;
    this.featureMetrics.stereoWidth = audio.features.stereoWidth;
    this.featureMetrics.groove = audio.features.groove;
    this.featureMetrics.overallTrend = audio.overallTrend;

    this.modulationReadouts.pulse = audio.modulators.pulse;
    this.modulationReadouts.flow = audio.modulators.flow;
    this.modulationReadouts.shimmer = audio.modulators.shimmer;
    this.modulationReadouts.warp = audio.modulators.warp;
    this.modulationReadouts.density = audio.modulators.density;
    this.modulationReadouts.aura = audio.modulators.aura;
    this.modulationReadouts.containment = audio.modulators.containment;
    this.modulationReadouts.sway = audio.modulators.sway;

    this.motionReadouts.expansion = audio.motion.expansion;
    this.motionReadouts.sway = audio.motion.sway;
    this.motionReadouts.sparkle = audio.motion.sparkle;

    this.dynamicsReadouts.momentum = audio.dynamics.momentum;
    this.dynamicsReadouts.acceleration = audio.dynamics.acceleration;
    this.dynamicsReadouts.breath = audio.dynamics.breath;

    this.sparklineState.loudness = this.renderSparkline(audio.history.loudness);
    this.sparklineState.flux = this.renderSparkline(audio.history.flux);
    this.sparklineState.beat = this.renderSparkline(audio.history.beat);

    this.metricBindings.forEach((binding) => binding.refresh());
    this.featureBindings.forEach((binding) => binding.refresh());
    this.modulatorBindings.forEach((binding) => binding.refresh());
    this.motionBindings.forEach((binding) => binding.refresh());
    this.dynamicsBindings.forEach((binding) => binding.refresh());
    this.sparklineBindings.forEach((binding) => binding.refresh());
  }
  
  /**
   * Dispose of panel
   */
  dispose(): void {
    this.pane.dispose();
  }
}
