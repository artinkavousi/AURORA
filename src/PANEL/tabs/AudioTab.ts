/**
 * PANEL/tabs/AudioTab.ts - Audio reactivity controls tab
 * Migrated and enhanced from AUDIO/PANELsoundreactivity.ts
 */

import type { Pane } from 'tweakpane';
import type { AudioConfig, AudioReactiveConfig, FlowConfig } from '../../config';
import { BaseTab, type BaseCallbacks } from '../types';
import { AudioVisualizationMode } from '../../AUDIO/audioreactive';
import { VISUALIZATION_MODE_NAMES } from '../../AUDIO/audiovisual';
import type { AudioData } from '../../AUDIO/soundreactivity';

export interface AudioTabCallbacks extends BaseCallbacks {
  onAudioConfigChange?: (config: Partial<AudioConfig>) => void;
  onAudioReactiveConfigChange?: (config: Partial<AudioReactiveConfig>) => void;
  onSourceChange?: (source: 'microphone' | 'file') => void;
  onFileLoad?: (url: string) => void;
  onTogglePlayback?: () => void;
  onVolumeChange?: (volume: number) => void;
}

interface AudioPreset {
  name: string;
  config: Partial<AudioReactiveConfig> & { audioSmoothing?: number };
}

const PRESETS: AudioPreset[] = [
  {
    name: '🌊 Gentle Waves',
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
    config: {
      mode: AudioVisualizationMode.AURORA_VEIL,
      bassInfluence: 0.6,
      midInfluence: 0.7,
      trebleInfluence: 1.0,
      audioSmoothing: 0.82,
    },
  },
];

export class AudioTab extends BaseTab {
  private state = {
    enabled: true,
    source: 'microphone' as 'microphone' | 'file',
    volume: 1.0,
    preset: PRESETS[0].name,
    masterIntensity: 1.0,
  };
  
  private baseInfluences = {
    bass: 1.0,
    mid: 0.8,
    treble: 0.6,
  };
  
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
  };

  private sparklineState = {
    loudness: '─',
    flux: '─',
    beat: '─',
  };

  private metricBindings: any[] = [];
  private featureBindings: any[] = [];
  private modulatorBindings: any[] = [];
  private sparklineBindings: any[] = [];

  constructor(pane: Pane, config: FlowConfig, callbacks: AudioTabCallbacks = {}) {
    super(pane, config, callbacks);
  }

  buildUI(): void {
    this.setupMainControls();
    this.setupOverview();
    this.setupFeatureInsights();
    this.setupModulationLab();
    this.setupHistory();
    this.setupAudioInput();
    this.setupPresets();
    this.setupAdvanced();
  }

  private setupMainControls(): void {
    const folder = this.createFolder('🎛️ Main Controls', true);
    if (!folder || typeof folder.addBinding !== 'function') {
      return;
    }
    
    this.createBinding(
      this.state,
      'enabled',
      { label: 'Enable Audio FX' },
      (value: boolean) => {
        this.config.audioReactive.enabled = value;
        (this.callbacks as AudioTabCallbacks).onAudioReactiveConfigChange?.({ enabled: value });
      }
    );
    
    this.createSeparator();
    
    this.createBinding(
      this.state,
      'masterIntensity',
      { label: 'Master Intensity', min: 0, max: 2, step: 0.1 },
      (value: number) => {
        const scaledConfig = {
          bassInfluence: this.baseInfluences.bass * value,
          midInfluence: this.baseInfluences.mid * value,
          trebleInfluence: this.baseInfluences.treble * value,
        };
        
        Object.assign(this.config.audioReactive, scaledConfig);
        (this.callbacks as AudioTabCallbacks).onAudioReactiveConfigChange?.(scaledConfig);
      }
    );
  }

  private setupOverview(): void {
    const folder = this.createFolder('📊 Live Overview', true);
    if (!folder || typeof folder.addBinding !== 'function') {
      return;
    }

    this.metricBindings.push(folder.addBinding(this.overviewMetrics, 'overall', {
      label: 'Level',
      readonly: true,
      min: 0,
      max: 1,
      view: 'graph',
      rows: 3,
    }));

    folder.addBlade({ view: 'separator' });

    const bandsFolder = folder.addFolder({ title: 'Frequency Bands', expanded: true });
    if (!bandsFolder || typeof bandsFolder.addBinding !== 'function') {
      return;
    }

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

  private setupFeatureInsights(): void {
    const folder = this.createFolder('🧠 Feature Insights', false);
    if (!folder || typeof folder.addBinding !== 'function') {
      return;
    }

    const features = [
      { key: 'spectralFlux', label: 'Spectral Flux', max: 1 },
      { key: 'onsetEnergy', label: 'Onset Energy', max: 1 },
      { key: 'harmonicRatio', label: 'Harmonic Ratio', max: 1 },
      { key: 'harmonicEnergy', label: 'Harmonic Energy', max: 1.5 },
      { key: 'rhythmConfidence', label: 'Rhythm Confidence', max: 1 },
      { key: 'tempo', label: 'Tempo (BPM)', max: 200, min: 40, format: (v: number) => v.toFixed(1) },
      { key: 'stereoBalance', label: 'Stereo Balance', max: 1, min: -1 },
      { key: 'stereoWidth', label: 'Stereo Width', max: 1 },
      { key: 'groove', label: 'Groove Index', max: 1 },
      { key: 'overallTrend', label: 'Energy Trend', max: 1, min: -1 },
    ];

    features.forEach(({ key, label, min = 0, max, format }) => {
      this.featureBindings.push(folder.addBinding(this.featureMetrics, key, {
        label,
        readonly: true,
        min,
        max,
        format: format || ((v: number) => v.toFixed(3)),
      }));
    });
  }

  private setupModulationLab(): void {
    const folder = this.createFolder('🎚️ Modulation Lab', false);
    if (!folder || typeof folder.addFolder !== 'function') {
      return;
    }

    const readoutFolder = folder.addFolder({ title: 'Live Modulators', expanded: true });
    if (!readoutFolder || typeof readoutFolder.addBinding !== 'function') {
      return;
    }

    (['pulse', 'flow', 'shimmer', 'warp', 'density', 'aura'] as const).forEach((key) => {
      this.modulatorBindings.push(readoutFolder.addBinding(this.modulationReadouts, key, {
        label: key.charAt(0).toUpperCase() + key.slice(1),
        readonly: true,
        min: 0,
        max: 1,
        format: (v: number) => v.toFixed(3),
      }));
    });

    folder.addBlade({ view: 'separator' });

    const routingFolder = folder.addFolder({ title: 'Routing Intensities', expanded: false });
    if (!routingFolder || typeof routingFolder.addBinding !== 'function') {
      return;
    }

    const routings = [
      { key: 'modulationPulseForce', label: 'Pulse → Forces' },
      { key: 'modulationFlowTurbulence', label: 'Flow → Fluidity' },
      { key: 'modulationShimmerColor', label: 'Shimmer → Color' },
      { key: 'modulationWarpSpatial', label: 'Warp → Spatial' },
      { key: 'modulationDensitySpawn', label: 'Density → Emit' },
      { key: 'modulationAuraBloom', label: 'Aura → Bloom' },
    ];

    routings.forEach(({ key, label }) => {
      routingFolder.addBinding(this.config.audioReactive, key, {
        label,
        min: 0,
        max: 2,
        step: 0.05,
      }).on('change', (ev: any) => {
        (this.callbacks as AudioTabCallbacks).onAudioReactiveConfigChange?.({ [key]: ev.value });
      });
    });

    folder.addBlade({ view: 'separator' });

    const temporalFolder = folder.addFolder({ title: 'Temporal Sculpting', expanded: false });
    if (!temporalFolder || typeof temporalFolder.addBinding !== 'function') {
      return;
    }

    temporalFolder.addBinding(this.config.audioReactive, 'timelineSmoothing', {
      label: 'Timeline Smooth',
      min: 0,
      max: 1,
      step: 0.05,
    }).on('change', (ev: any) => {
      (this.callbacks as AudioTabCallbacks).onAudioReactiveConfigChange?.({ timelineSmoothing: ev.value });
    });

    temporalFolder.addBinding(this.config.audioReactive, 'transitionResponsiveness', {
      label: 'Transition Agility',
      min: 0,
      max: 1,
      step: 0.05,
    }).on('change', (ev: any) => {
      (this.callbacks as AudioTabCallbacks).onAudioReactiveConfigChange?.({ transitionResponsiveness: ev.value });
    });
  }

  private setupHistory(): void {
    const folder = this.createFolder('🗂️ Motion History', false);
    if (!folder || typeof folder.addBinding !== 'function') {
      return;
    }

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

  private setupAudioInput(): void {
    const folder = this.createFolder('🎤 Audio Source', false);
    if (!folder || typeof folder.addBlade !== 'function') {
      return;
    }
    
    this.createList(
      'Input',
      this.state.source,
      {
        '🎤 Microphone': 'microphone',
        '🎵 Audio File': 'file',
      },
      (value: string) => {
        this.state.source = value as 'microphone' | 'file';
        this.config.audio.source = value as 'microphone' | 'file';
        (this.callbacks as AudioTabCallbacks).onSourceChange?.(value as 'microphone' | 'file');
      }
    );
    
    folder.addBlade({ view: 'separator' });
    
    this.createBinding(
      this.state,
      'volume',
      { label: 'Volume', min: 0, max: 1, step: 0.05 },
      (value: number) => (this.callbacks as AudioTabCallbacks).onVolumeChange?.(value)
    );
    
    folder.addBlade({ view: 'separator' });
    
    this.createButton('📂 Load Audio File', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'audio/*';
      input.onchange = (e: any) => {
        const file = e.target.files[0];
        if (file) {
          const url = URL.createObjectURL(file);
          (this.callbacks as AudioTabCallbacks).onFileLoad?.(url);
        }
      };
      input.click();
    });
    
    this.createButton('▶️ Play / Pause', () => {
      (this.callbacks as AudioTabCallbacks).onTogglePlayback?.();
    });
  }

  private setupPresets(): void {
    const folder = this.createFolder('🎨 Visual Presets', true);
    if (!folder || typeof folder.addBlade !== 'function') {
      return;
    }
    
    const presetOptions: Record<string, string> = {};
    PRESETS.forEach(preset => {
      presetOptions[preset.name] = preset.name;
    });
    
    this.createList(
      'Preset',
      this.state.preset,
      presetOptions,
      (value: string) => {
        this.state.preset = value;
        this.applyPreset(value);
      }
    );
    
    folder.addBlade({ view: 'separator' });
    
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

  private setupAdvanced(): void {
    const folder = this.createFolder('⚙️ Advanced', false);
    if (!folder || typeof folder.addBlade !== 'function') {
      return;
    }
    
    const modeOptions: Record<string, number> = {};
    Object.values(AudioVisualizationMode).forEach((mode) => {
      if (typeof mode === 'number') {
        modeOptions[VISUALIZATION_MODE_NAMES[mode]] = mode;
      }
    });
    
    this.createList(
      'Visualization',
      this.config.audioReactive.mode,
      modeOptions,
      (value: number) => {
        this.config.audioReactive.mode = value;
        (this.callbacks as AudioTabCallbacks).onAudioReactiveConfigChange?.({ mode: value });
      }
    );
    
    folder.addBlade({ view: 'separator' });
    
    const frequencyFolder = folder.addFolder({ title: 'Frequency Balance', expanded: false });
    if (!frequencyFolder || typeof frequencyFolder.addBinding !== 'function') {
      return;
    }
    
    ['bass', 'mid', 'treble'].forEach((freq) => {
      frequencyFolder.addBinding(this.config.audioReactive, `${freq}Influence` as any, {
        label: freq === 'bass' ? '🔊 Bass' : freq === 'mid' ? '🎸 Mid' : '🎺 Treble',
        min: 0,
        max: 1.5,
        step: 0.1,
      }).on('change', (ev: any) => {
        (this.callbacks as AudioTabCallbacks).onAudioReactiveConfigChange?.({ [`${freq}Influence`]: ev.value });
      });
    });
    
    folder.addBlade({ view: 'separator' });
    
    this.createBinding(
      this.config.audio,
      'smoothing',
      { label: 'Smoothness', min: 0.5, max: 0.95, step: 0.05 },
      (value: number) => (this.callbacks as AudioTabCallbacks).onAudioConfigChange?.({ smoothing: value })
    );
    
    this.createBinding(
      this.config.audio,
      'beatThreshold',
      { label: 'Beat Sensitivity', min: 0.8, max: 2.0, step: 0.1 },
      (value: number) => (this.callbacks as AudioTabCallbacks).onAudioConfigChange?.({ beatThreshold: value })
    );
  }

  private applyPreset(presetName: string): void {
    const preset = PRESETS.find(p => p.name === presetName);
    if (!preset) return;
    
    const { audioSmoothing, bassInfluence, midInfluence, trebleInfluence, ...otherConfig } = preset.config;
    
    if (bassInfluence !== undefined) this.baseInfluences.bass = bassInfluence;
    if (midInfluence !== undefined) this.baseInfluences.mid = midInfluence;
    if (trebleInfluence !== undefined) this.baseInfluences.treble = trebleInfluence;
    
    const intensity = this.state.masterIntensity;
    const scaledConfig = {
      ...otherConfig,
      bassInfluence: this.baseInfluences.bass * intensity,
      midInfluence: this.baseInfluences.mid * intensity,
      trebleInfluence: this.baseInfluences.treble * intensity,
    };
    
    (this.callbacks as AudioTabCallbacks).onAudioReactiveConfigChange?.(scaledConfig);
    
    if (audioSmoothing !== undefined) {
      (this.callbacks as AudioTabCallbacks).onAudioConfigChange?.({ smoothing: audioSmoothing });
      this.config.audio.smoothing = audioSmoothing;
    }
    
    Object.assign(this.config.audioReactive, scaledConfig);
    this.pane.refresh();
  }

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

  public updateMetrics(audio: AudioData): void {
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

    this.sparklineState.loudness = this.renderSparkline(audio.history.loudness);
    this.sparklineState.flux = this.renderSparkline(audio.history.flux);
    this.sparklineState.beat = this.renderSparkline(audio.history.beat);

    this.metricBindings.forEach((binding) => binding.refresh());
    this.featureBindings.forEach((binding) => binding.refresh());
    this.modulatorBindings.forEach((binding) => binding.refresh());
    this.sparklineBindings.forEach((binding) => binding.refresh());
  }

  public dispose(): void {
    // Cleanup if needed
  }
}


