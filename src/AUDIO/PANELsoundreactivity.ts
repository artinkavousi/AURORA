/**
 * AUDIO/PANELsoundreactivity.ts - Unified Audio Reactivity Panel
 * 
 * Modern, comprehensive control panel integrating:
 * - Legacy audio reactivity (frequency bands, modulation, presets)
 * - Groove Intelligence Engine (swing, timing, patterns)
 * - Musical Structure Analyzer (section detection, energy)
 * - Predictive Timing System (beat/downbeat prediction)
 * - Kinetic Gesture System (expressive motion primitives)
 * - Ensemble Choreography (particle roles, formations)
 * - Spatial Staging (depth layers, camera-aware dynamics)
 */

import type { Pane } from 'tweakpane';
import type { AudioConfig, AudioReactiveConfig } from '../config';
import type { FlowConfig } from '../config';
import { AudioVisualizationMode } from './audioreactive';
import { VISUALIZATION_MODE_NAMES } from './audiovisual';
import type { AudioData } from './soundreactivity';
import type { EnhancedAudioData } from './core/enhanced-audio-analyzer';
import type { GestureSelection } from './kinetic/gesture-interpreter';
import type { EnsembleState } from './kinetic/ensemble-choreographer';
import type { SpatialState } from './kinetic/spatial-composer';
import { GestureFactory } from './kinetic/gesture-primitives';
import { PersonalityType, getAllPersonalityProfiles } from './kinetic/personality-profiles';
import type { PersonalityBlendState } from './kinetic/personality-engine';
import { MacroType, MACRO_PRESETS, type MacroState } from './kinetic/macro-control';
import type { PlaybackState, RecorderState } from './kinetic/sequence-recorder';

export interface AudioPanelCallbacks {
  onAudioConfigChange?: (config: Partial<AudioConfig>) => void;
  onAudioReactiveConfigChange?: (config: Partial<AudioReactiveConfig>) => void;
  onSourceChange?: (source: 'microphone' | 'file') => void;
  onFileLoad?: (url: string) => void;
  onTogglePlayback?: () => void;
  onVolumeChange?: (volume: number) => void;
  
  // New system callbacks
  onEnableChange?: (enabled: boolean) => void;
  onMasterIntensityChange?: (intensity: number) => void;
  onManualGestureTrigger?: (gestureName: string) => void;
  onFormationOverride?: (formation: string | null) => void;
  onTempoOverride?: (bpm: number) => void;
  onBeatAlign?: () => void;
  onPersonalityChange?: (personality: PersonalityType) => void;
  onPersonalityAutoAdapt?: (enabled: boolean) => void;
  
  // Macro & sequence callbacks
  onMacroChange?: (macro: MacroType, value: number) => void;
  onMacroPresetApply?: (presetName: string) => void;
  onSequenceRecord?: () => void;
  onSequenceStop?: () => void;
  onSequencePlay?: (sequenceId: string) => void;
  onSequencePause?: () => void;
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
    
    // Quick toggles
    groove: true,
    gestures: true,
    ensemble: true,
    spatial: true,
    
    // Manual overrides
    manualTempo: 120,
    formationOverride: 'Auto',
    personalityOverride: 'Auto' as 'Auto' | PersonalityType,
    personalityAutoAdapt: true,
    
    // Macro controls
    macroPreset: 'Zen Garden',
    macroIntensity: 0.5,
    macroChaos: 0.5,
    macroSmoothness: 0.5,
    macroResponsiveness: 0.5,
    macroDensity: 0.5,
    macroEnergy: 0.5,
    macroCoherence: 0.5,
    macroComplexity: 0.5,
    
    // Sequence controls
    isRecording: false,
    isPlaying: false,
    sequenceLoop: false,
    
    // Performance
    showMetrics: true,
    showAdvanced: false,
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
  
  // Enhanced metrics
  private grooveMetrics = {
    swingRatio: 0,
    grooveIntensity: 0,
    pocketTightness: 0,
    syncopation: 0,
    confidence: 0,
  };
  
  private structureMetrics = {
    section: 'Unknown',
    sectionProgress: 0,
    energy: 0,
    tension: 0,
    anticipation: 0,
  };
  
  private timingMetrics = {
    tempo: 120,
    beatPhase: 0,
    nextBeatIn: 0,
    nextDownbeatIn: 0,
    tempoStable: false,
  };
  
  private gestureMetrics = {
    primaryGesture: 'None',
    gesturePhase: 0,
    activeCount: 0,
    blendMode: 'replace',
  };
  
  private ensembleMetrics = {
    leadCount: 0,
    supportCount: 0,
    ambientCount: 0,
    formation: 'Scattered',
    formationProgress: 0,
  };
  
  private spatialMetrics = {
    foregroundCount: 0,
    midgroundCount: 0,
    backgroundCount: 0,
  };
  
  private personalityMetrics = {
    globalPersonality: 'Calm',
    transitionProgress: 1.0,
    assignmentCount: 0,
    calmCount: 0,
    energeticCount: 0,
    flowingCount: 0,
    aggressiveCount: 0,
    gentleCount: 0,
    chaoticCount: 0,
    rhythmicCount: 0,
    etherealCount: 0,
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
  
  constructor(
    pane: Pane,
    config: FlowConfig,
    callbacks: AudioPanelCallbacks = {}
  ) {
    this.config = config;
    this.callbacks = callbacks;
    
    // Use provided pane from unified panel system
    this.pane = pane;
    this.buildPanel();
  }
  
  private buildPanel(): void {
    // ==================== MAIN CONTROLS ====================
    this.buildMainControls();
    
    // ==================== QUICK TOGGLES ====================
    this.buildQuickToggles();

    // ==================== LIVE OVERVIEW ====================
    this.buildOverview();
    
    // ==================== GROOVE INTELLIGENCE ====================
    this.buildGrooveSection();
    
    // ==================== MUSICAL STRUCTURE ====================
    this.buildStructureSection();
    
    // ==================== PREDICTIVE TIMING ====================
    this.buildTimingSection();
    
    // ==================== GESTURES ====================
    this.buildGesturesSection();
    
    // ==================== ENSEMBLE CHOREOGRAPHY ====================
    this.buildEnsembleSection();
    
    // ==================== SPATIAL STAGING ====================
    this.buildSpatialSection();
    
    // ==================== PERSONALITY SYSTEM ====================
    this.buildPersonalitySection();
    
    // ==================== MACRO CONTROLS ====================
    this.buildMacroSection();
    
    // ==================== SEQUENCE RECORDER ====================
    this.buildSequenceSection();

    // ==================== FEATURE INSIGHTS ====================
    this.buildFeatureInsights();

    // ==================== MODULATION LAB ====================
    this.buildModulationLab();

    // ==================== HISTORY ====================
    this.buildHistory();

    // ==================== AUDIO INPUT ====================
    this.buildAudioInput();

    // ==================== PRESETS ====================
    this.buildPresets();
    
    // ==================== MANUAL CONTROLS ====================
    this.buildManualControls();
    
    // ==================== ADVANCED (Collapsed) ====================
    this.buildAdvanced();
  }
  
  // ========================================
  // MAIN CONTROLS
  // ========================================
  
  private buildMainControls(): void {
    const folder = this.pane.addFolder({
      title: '🎛️ Master',
      expanded: true,
    });
    
    // Master enable/disable
    folder.addBinding(this.state, 'enabled', {
      label: 'Enable Audio FX',
    }).on('change', (ev: any) => {
      this.config.audioReactive.enabled = ev.value;
      this.callbacks.onAudioReactiveConfigChange?.({ enabled: ev.value });
      this.callbacks.onEnableChange?.(ev.value);
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
      this.callbacks.onMasterIntensityChange?.(ev.value);
    });
  }
  
  // ========================================
  // QUICK TOGGLES
  // ========================================
  
  private buildQuickToggles(): void {
    const folder = this.pane.addFolder({
      title: '⚡ Quick Toggles',
      expanded: true,
    });
    
    folder.addBinding(this.state, 'groove', {
      label: '🎵 Groove Intelligence',
    });
    
    folder.addBinding(this.state, 'gestures', {
      label: '🎭 Gesture System',
    });
    
    folder.addBinding(this.state, 'ensemble', {
      label: '🎪 Ensemble Choreography',
    });
    
    folder.addBinding(this.state, 'spatial', {
      label: '📐 Spatial Staging',
    });
  }
  
  // ========================================
  // LIVE METRICS
  // ========================================
  
  private buildOverview(): void {
    const folder = this.pane.addFolder({
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
  
  // ========================================
  // GROOVE INTELLIGENCE
  // ========================================
  
  private buildGrooveSection(): void {
    const folder = this.pane.addFolder({
      title: '🎵 Groove Intelligence',
      expanded: false,
    });
    
    this.metricBindings.push(folder.addBinding(this.grooveMetrics, 'swingRatio', {
      label: 'Swing Ratio',
      readonly: true,
      min: 0,
      max: 1,
      format: (v: number) => {
        if (v < 0.05) return 'Straight';
        if (v < 0.2) return `Light (${v.toFixed(2)})`;
        if (v < 0.4) return `Swing (${v.toFixed(2)})`;
        return `Heavy (${v.toFixed(2)})`;
      },
    }));
    
    this.metricBindings.push(folder.addBinding(this.grooveMetrics, 'grooveIntensity', {
      label: 'Groove Intensity',
      readonly: true,
      min: 0,
      max: 1,
      view: 'graph',
      rows: 2,
    }));
    
    this.metricBindings.push(folder.addBinding(this.grooveMetrics, 'pocketTightness', {
      label: 'Pocket Tightness',
      readonly: true,
      min: 0,
      max: 1,
      format: (v: number) => v.toFixed(2),
    }));
    
    this.metricBindings.push(folder.addBinding(this.grooveMetrics, 'syncopation', {
      label: 'Syncopation',
      readonly: true,
      min: 0,
      max: 1,
      format: (v: number) => v.toFixed(2),
    }));
    
    this.metricBindings.push(folder.addBinding(this.grooveMetrics, 'confidence', {
      label: 'Analysis Confidence',
      readonly: true,
      min: 0,
      max: 1,
      format: (v: number) => `${(v * 100).toFixed(0)}%`,
    }));
  }
  
  // ========================================
  // MUSICAL STRUCTURE
  // ========================================
  
  private buildStructureSection(): void {
    const folder = this.pane.addFolder({
      title: '🎼 Musical Structure',
      expanded: false,
    });
    
    this.metricBindings.push(folder.addBinding(this.structureMetrics, 'section', {
      label: 'Current Section',
      readonly: true,
    }));
    
    this.metricBindings.push(folder.addBinding(this.structureMetrics, 'sectionProgress', {
      label: 'Section Progress',
      readonly: true,
      min: 0,
      max: 1,
      view: 'graph',
      rows: 2,
    }));
    
    folder.addBlade({ view: 'separator' });
    
    this.metricBindings.push(folder.addBinding(this.structureMetrics, 'energy', {
      label: 'Energy',
      readonly: true,
      min: 0,
      max: 1,
      format: (v: number) => v.toFixed(2),
    }));
    
    this.metricBindings.push(folder.addBinding(this.structureMetrics, 'tension', {
      label: 'Tension',
      readonly: true,
      min: 0,
      max: 1,
      format: (v: number) => v.toFixed(2),
    }));
    
    this.metricBindings.push(folder.addBinding(this.structureMetrics, 'anticipation', {
      label: 'Anticipation',
      readonly: true,
      min: 0,
      max: 1,
      format: (v: number) => v.toFixed(2),
    }));
  }
  
  // ========================================
  // PREDICTIVE TIMING
  // ========================================
  
  private buildTimingSection(): void {
    const folder = this.pane.addFolder({
      title: '⏱️ Predictive Timing',
      expanded: false,
    });
    
    this.metricBindings.push(folder.addBinding(this.timingMetrics, 'tempo', {
      label: 'Detected Tempo',
      readonly: true,
      min: 60,
      max: 180,
      format: (v: number) => `${v.toFixed(1)} BPM`,
    }));
    
    this.metricBindings.push(folder.addBinding(this.timingMetrics, 'beatPhase', {
      label: 'Beat Phase',
      readonly: true,
      min: 0,
      max: 1,
      view: 'graph',
      rows: 2,
    }));
    
    folder.addBlade({ view: 'separator' });
    
    this.metricBindings.push(folder.addBinding(this.timingMetrics, 'nextBeatIn', {
      label: 'Next Beat In',
      readonly: true,
      min: 0,
      max: 1,
      format: (v: number) => `${(v * 1000).toFixed(0)}ms`,
    }));
    
    this.metricBindings.push(folder.addBinding(this.timingMetrics, 'nextDownbeatIn', {
      label: 'Next Downbeat In',
      readonly: true,
      min: 0,
      max: 2,
      format: (v: number) => `${v.toFixed(2)}s`,
    }));
    
    this.metricBindings.push(folder.addBinding(this.timingMetrics, 'tempoStable', {
      label: 'Tempo Stable',
      readonly: true,
    }));
  }
  
  // ========================================
  // GESTURES
  // ========================================
  
  private buildGesturesSection(): void {
    const folder = this.pane.addFolder({
      title: '🎭 Gesture System',
      expanded: false,
    });
    
    this.metricBindings.push(folder.addBinding(this.gestureMetrics, 'primaryGesture', {
      label: 'Active Gesture',
      readonly: true,
    }));
    
    this.metricBindings.push(folder.addBinding(this.gestureMetrics, 'gesturePhase', {
      label: 'Gesture Phase',
      readonly: true,
      min: 0,
      max: 1,
      view: 'graph',
      rows: 2,
    }));
    
    folder.addBlade({ view: 'separator' });
    
    this.metricBindings.push(folder.addBinding(this.gestureMetrics, 'activeCount', {
      label: 'Active Gestures',
      readonly: true,
      min: 0,
      max: 3,
      format: (v: number) => v.toString(),
    }));
    
    this.metricBindings.push(folder.addBinding(this.gestureMetrics, 'blendMode', {
      label: 'Blend Mode',
      readonly: true,
    }));
    
    folder.addBlade({ view: 'separator' });
    
    // Manual gesture triggers
    const triggerFolder = folder.addFolder({
      title: 'Manual Triggers',
      expanded: false,
    });
    
    const gestures = GestureFactory.getGestureNames();
    
    triggerFolder.addBlade({
      view: 'buttongrid',
      size: [2, 3],
      cells: (x: number, y: number) => {
        const index = y * 2 + x;
        if (index < gestures.length) {
          return { title: gestures[index] };
        }
        return { title: '' };
      },
      label: 'Trigger',
    }).on('click', (ev: any) => {
      const index = ev.index[1] * 2 + ev.index[0];
      if (index < gestures.length) {
        this.callbacks.onManualGestureTrigger?.(gestures[index]);
      }
    });
  }
  
  // ========================================
  // ENSEMBLE CHOREOGRAPHY
  // ========================================
  
  private buildEnsembleSection(): void {
    const folder = this.pane.addFolder({
      title: '🎪 Ensemble Choreography',
      expanded: false,
    });
    
    // Role distribution
    const rolesFolder = folder.addFolder({
      title: 'Role Distribution',
      expanded: true,
    });
    
    this.metricBindings.push(rolesFolder.addBinding(this.ensembleMetrics, 'leadCount', {
      label: '⭐ Lead',
      readonly: true,
      format: (v: number) => v.toString(),
    }));
    
    this.metricBindings.push(rolesFolder.addBinding(this.ensembleMetrics, 'supportCount', {
      label: '🎸 Support',
      readonly: true,
      format: (v: number) => v.toString(),
    }));
    
    this.metricBindings.push(rolesFolder.addBinding(this.ensembleMetrics, 'ambientCount', {
      label: '🌫️ Ambient',
      readonly: true,
      format: (v: number) => v.toString(),
    }));
    
    folder.addBlade({ view: 'separator' });
    
    // Formation
    this.metricBindings.push(folder.addBinding(this.ensembleMetrics, 'formation', {
      label: 'Current Formation',
      readonly: true,
    }));
    
    this.metricBindings.push(folder.addBinding(this.ensembleMetrics, 'formationProgress', {
      label: 'Formation Transition',
      readonly: true,
      min: 0,
      max: 1,
      view: 'graph',
      rows: 2,
    }));
  }
  
  // ========================================
  // SPATIAL STAGING
  // ========================================
  
  private buildSpatialSection(): void {
    const folder = this.pane.addFolder({
      title: '📐 Spatial Staging',
      expanded: false,
    });
    
    this.metricBindings.push(folder.addBinding(this.spatialMetrics, 'foregroundCount', {
      label: '▶️ Foreground',
      readonly: true,
      format: (v: number) => v.toString(),
    }));
    
    this.metricBindings.push(folder.addBinding(this.spatialMetrics, 'midgroundCount', {
      label: '⏸️ Midground',
      readonly: true,
      format: (v: number) => v.toString(),
    }));
    
    this.metricBindings.push(folder.addBinding(this.spatialMetrics, 'backgroundCount', {
      label: '⏹️ Background',
      readonly: true,
      format: (v: number) => v.toString(),
    }));
  }
  
  // ========================================
  // PERSONALITY SYSTEM
  // ========================================
  
  // ========================================
  // MACRO CONTROLS
  // ========================================
  
  private buildMacroSection(): void {
    const folder = this.pane.addFolder({
      title: '🎹 Macro Controls',
      expanded: false,
    });
    
    // Preset selector
    const presetOptions: Record<string, string> = {};
    MACRO_PRESETS.forEach(preset => {
      presetOptions[preset.icon + ' ' + preset.name] = preset.name;
    });
    
    folder.addBinding(this.state, 'macroPreset', {
      label: 'Preset',
      options: presetOptions,
    }).on('change', (ev: any) => {
      this.callbacks.onMacroPresetApply?.(ev.value);
    });
    
    folder.addBlade({ view: 'separator' });
    
    // Macro sliders
    folder.addBinding(this.state, 'macroIntensity', {
      label: '⚡ Intensity',
      min: 0,
      max: 1,
      step: 0.01,
    }).on('change', (ev: any) => {
      this.callbacks.onMacroChange?.(MacroType.INTENSITY, ev.value);
    });
    
    folder.addBinding(this.state, 'macroChaos', {
      label: '🌀 Chaos',
      min: 0,
      max: 1,
      step: 0.01,
    }).on('change', (ev: any) => {
      this.callbacks.onMacroChange?.(MacroType.CHAOS, ev.value);
    });
    
    folder.addBinding(this.state, 'macroSmoothness', {
      label: '🌊 Smoothness',
      min: 0,
      max: 1,
      step: 0.01,
    }).on('change', (ev: any) => {
      this.callbacks.onMacroChange?.(MacroType.SMOOTHNESS, ev.value);
    });
    
    folder.addBinding(this.state, 'macroResponsiveness', {
      label: '⚡ Responsiveness',
      min: 0,
      max: 1,
      step: 0.01,
    }).on('change', (ev: any) => {
      this.callbacks.onMacroChange?.(MacroType.RESPONSIVENESS, ev.value);
    });
    
    folder.addBinding(this.state, 'macroDensity', {
      label: '🔲 Density',
      min: 0,
      max: 1,
      step: 0.01,
    }).on('change', (ev: any) => {
      this.callbacks.onMacroChange?.(MacroType.DENSITY, ev.value);
    });
    
    folder.addBinding(this.state, 'macroEnergy', {
      label: '🔥 Energy',
      min: 0,
      max: 1,
      step: 0.01,
    }).on('change', (ev: any) => {
      this.callbacks.onMacroChange?.(MacroType.ENERGY, ev.value);
    });
    
    folder.addBinding(this.state, 'macroCoherence', {
      label: '🔗 Coherence',
      min: 0,
      max: 1,
      step: 0.01,
    }).on('change', (ev: any) => {
      this.callbacks.onMacroChange?.(MacroType.COHERENCE, ev.value);
    });
    
    folder.addBinding(this.state, 'macroComplexity', {
      label: '🧩 Complexity',
      min: 0,
      max: 1,
      step: 0.01,
    }).on('change', (ev: any) => {
      this.callbacks.onMacroChange?.(MacroType.COMPLEXITY, ev.value);
    });
  }
  
  // ========================================
  // SEQUENCE RECORDER
  // ========================================
  
  private buildSequenceSection(): void {
    const folder = this.pane.addFolder({
      title: '🎬 Sequence Recorder',
      expanded: false,
    });
    
    // Recording controls
    const recordFolder = folder.addFolder({
      title: 'Recording',
      expanded: true,
    });
    
    recordFolder.addButton({
      title: '🔴 Record',
    }).on('click', () => {
      this.callbacks.onSequenceRecord?.();
    });
    
    recordFolder.addButton({
      title: '⏹️ Stop',
    }).on('click', () => {
      this.callbacks.onSequenceStop?.();
    });
    
    folder.addBlade({ view: 'separator' });
    
    // Playback controls
    const playbackFolder = folder.addFolder({
      title: 'Playback',
      expanded: true,
    });
    
    playbackFolder.addButton({
      title: '▶️ Play',
    }).on('click', () => {
      // Would show sequence selector in a real implementation
      console.log('🎬 Play sequence (not yet implemented)');
    });
    
    playbackFolder.addButton({
      title: '⏸️ Pause',
    }).on('click', () => {
      this.callbacks.onSequencePause?.();
    });
    
    playbackFolder.addBinding(this.state, 'sequenceLoop', {
      label: 'Loop',
    });
  }
  
  private buildPersonalitySection(): void {
    const folder = this.pane.addFolder({
      title: '🎭 Personality System',
      expanded: false,
    });
    
    this.metricBindings.push(folder.addBinding(this.personalityMetrics, 'globalPersonality', {
      label: 'Global Personality',
      readonly: true,
    }));
    
    this.metricBindings.push(folder.addBinding(this.personalityMetrics, 'transitionProgress', {
      label: 'Transition',
      readonly: true,
      min: 0,
      max: 1,
      view: 'graph',
      rows: 2,
    }));
    
    folder.addBlade({ view: 'separator' });
    
    // Distribution chart
    const distributionFolder = folder.addFolder({
      title: 'Personality Distribution',
      expanded: true,
    });
    
    this.metricBindings.push(distributionFolder.addBinding(this.personalityMetrics, 'calmCount', {
      label: '😌 Calm',
      readonly: true,
      format: (v: number) => v.toString(),
    }));
    
    this.metricBindings.push(distributionFolder.addBinding(this.personalityMetrics, 'energeticCount', {
      label: '⚡ Energetic',
      readonly: true,
      format: (v: number) => v.toString(),
    }));
    
    this.metricBindings.push(distributionFolder.addBinding(this.personalityMetrics, 'flowingCount', {
      label: '🌊 Flowing',
      readonly: true,
      format: (v: number) => v.toString(),
    }));
    
    this.metricBindings.push(distributionFolder.addBinding(this.personalityMetrics, 'aggressiveCount', {
      label: '🔥 Aggressive',
      readonly: true,
      format: (v: number) => v.toString(),
    }));
    
    this.metricBindings.push(distributionFolder.addBinding(this.personalityMetrics, 'gentleCount', {
      label: '🌸 Gentle',
      readonly: true,
      format: (v: number) => v.toString(),
    }));
    
    this.metricBindings.push(distributionFolder.addBinding(this.personalityMetrics, 'chaoticCount', {
      label: '🌀 Chaotic',
      readonly: true,
      format: (v: number) => v.toString(),
    }));
    
    this.metricBindings.push(distributionFolder.addBinding(this.personalityMetrics, 'rhythmicCount', {
      label: '🥁 Rhythmic',
      readonly: true,
      format: (v: number) => v.toString(),
    }));
    
    this.metricBindings.push(distributionFolder.addBinding(this.personalityMetrics, 'etherealCount', {
      label: '✨ Ethereal',
      readonly: true,
      format: (v: number) => v.toString(),
    }));
    
    folder.addBlade({ view: 'separator' });
    
    // Personality selector
    const profiles = getAllPersonalityProfiles();
    const personalityOptions: Record<string, 'Auto' | PersonalityType> = { 'Auto': 'Auto' };
    profiles.forEach(profile => {
      personalityOptions[profile.name] = profile.type;
    });
    
    folder.addBinding(this.state, 'personalityOverride', {
      label: 'Force Personality',
      options: personalityOptions,
    }).on('change', (ev: any) => {
      if (ev.value === 'Auto') {
        this.state.personalityAutoAdapt = true;
        this.callbacks.onPersonalityAutoAdapt?.(true);
      } else {
        this.state.personalityAutoAdapt = false;
        this.callbacks.onPersonalityChange?.(ev.value);
      }
    });
    
    folder.addBinding(this.state, 'personalityAutoAdapt', {
      label: 'Auto-Adapt',
    }).on('change', (ev: any) => {
      this.callbacks.onPersonalityAutoAdapt?.(ev.value);
    });
  }

  private buildFeatureInsights(): void {
    const folder = this.pane.addFolder({
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

  private buildModulationLab(): void {
    const folder = this.pane.addFolder({
      title: '🎚️ Modulation Lab',
      expanded: false,
    });

    const readoutFolder = folder.addFolder({
      title: 'Live Modulators',
      expanded: true,
    });

    // Add modulator readouts
    const modulatorKeys: Array<keyof typeof this.modulationReadouts> = [
      'pulse', 'flow', 'shimmer', 'warp', 'density', 'aura'
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

  private buildHistory(): void {
    const folder = this.pane.addFolder({
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
  // MANUAL CONTROLS
  // ========================================
  
  private buildManualControls(): void {
    const folder = this.pane.addFolder({
      title: '🎚️ Manual Override',
      expanded: false,
    });
    
    // Tempo override
    folder.addBinding(this.state, 'manualTempo', {
      label: 'Manual Tempo',
      min: 60,
      max: 200,
      step: 1,
    }).on('change', (ev: any) => {
      this.callbacks.onTempoOverride?.(ev.value);
    });
    
    folder.addButton({
      title: '🎯 Align to Beat',
    }).on('click', () => {
      this.callbacks.onBeatAlign?.();
    });
    
    folder.addBlade({ view: 'separator' });
    
    // Formation override
    folder.addBinding(this.state, 'formationOverride', {
      label: 'Force Formation',
      options: {
        'Auto': 'Auto',
        'Scattered': 'scattered',
        'Clustered': 'clustered',
        'Orbiting': 'orbiting',
        'Flowing': 'flowing',
        'Layered': 'layered',
        'Radial': 'radial',
        'Grid': 'grid',
        'Spiral': 'spiral',
      },
    }).on('change', (ev: any) => {
      this.callbacks.onFormationOverride?.(ev.value === 'Auto' ? null : ev.value);
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
   * Update enhanced metrics from new audio systems
   */
  updateEnhancedMetrics(
    audioData: EnhancedAudioData,
    gestureSelection: GestureSelection | null = null,
    ensembleState: EnsembleState | null = null,
    spatialState: SpatialState | null = null,
    personalityState: PersonalityBlendState | null = null
  ): void {
    if (!audioData) return;
    
    // Update standard metrics first
    this.updateMetrics(audioData);
    
    // Groove metrics
    if (audioData.groove) {
      this.grooveMetrics.swingRatio = audioData.groove.swingRatio;
      this.grooveMetrics.grooveIntensity = audioData.groove.grooveIntensity;
      this.grooveMetrics.pocketTightness = audioData.groove.pocketTightness;
      this.grooveMetrics.syncopation = audioData.groove.syncopationLevel;
      this.grooveMetrics.confidence = audioData.groove.analysisConfidence;
    }
    
    // Structure metrics
    if (audioData.structure) {
      this.structureMetrics.section = this.formatSectionName(audioData.structure.currentSection.type);
      this.structureMetrics.sectionProgress = audioData.structure.sectionProgress;
      this.structureMetrics.energy = audioData.structure.energy.current;
      this.structureMetrics.tension = audioData.structure.tension.tension;
      this.structureMetrics.anticipation = audioData.structure.tension.anticipation;
    }
    
    // Timing metrics
    if (audioData.timing) {
      this.timingMetrics.tempo = audioData.timing.tempo;
      this.timingMetrics.beatPhase = audioData.timing.beatPhase;
      this.timingMetrics.nextBeatIn = audioData.timing.nextBeat?.timeUntil || 0;
      this.timingMetrics.nextDownbeatIn = audioData.timing.nextDownbeat?.timeUntil || 0;
      this.timingMetrics.tempoStable = audioData.timing.tempoStable;
    }
    
    // Gesture metrics
    if (gestureSelection) {
      this.gestureMetrics.primaryGesture = gestureSelection.primary?.gesture.name || 'None';
      this.gestureMetrics.gesturePhase = gestureSelection.primary?.params.phase || 0;
      this.gestureMetrics.activeCount = 
        (gestureSelection.primary ? 1 : 0) + gestureSelection.secondary.length;
      this.gestureMetrics.blendMode = gestureSelection.blendMode;
    }
    
    // Ensemble metrics
    if (ensembleState) {
      this.ensembleMetrics.leadCount = ensembleState.leadCount;
      this.ensembleMetrics.supportCount = ensembleState.supportCount;
      this.ensembleMetrics.ambientCount = ensembleState.ambientCount;
      this.ensembleMetrics.formation = this.formatFormationName(ensembleState.formation.type);
      this.ensembleMetrics.formationProgress = ensembleState.transitionPhase;
    }
    
    // Spatial metrics
    if (spatialState) {
      this.spatialMetrics.foregroundCount = spatialState.foregroundCount;
      this.spatialMetrics.midgroundCount = spatialState.midgroundCount;
      this.spatialMetrics.backgroundCount = spatialState.backgroundCount;
    }
    
    // Personality metrics
    if (personalityState) {
      this.personalityMetrics.globalPersonality = this.formatPersonalityName(personalityState.globalPersonality);
      this.personalityMetrics.transitionProgress = personalityState.transitionProgress;
      this.personalityMetrics.assignmentCount = personalityState.assignmentCount;
      
      // Reset counts
      this.personalityMetrics.calmCount = 0;
      this.personalityMetrics.energeticCount = 0;
      this.personalityMetrics.flowingCount = 0;
      this.personalityMetrics.aggressiveCount = 0;
      this.personalityMetrics.gentleCount = 0;
      this.personalityMetrics.chaoticCount = 0;
      this.personalityMetrics.rhythmicCount = 0;
      this.personalityMetrics.etherealCount = 0;
      
      // Count would be populated by app (particle-level data)
      // For now, just display the assignmentCount
    }
    
    // Refresh all bindings
    this.metricBindings.forEach(binding => binding?.refresh());
  }
  
  /**
   * Format personality name for display
   */
  private formatPersonalityName(personality: PersonalityType): string {
    return personality.charAt(0).toUpperCase() + personality.slice(1);
  }
  
  /**
   * Format section name for display
   */
  private formatSectionName(section: string): string {
    return section
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
  
  /**
   * Format formation name for display
   */
  private formatFormationName(formation: string): string {
    return formation.charAt(0).toUpperCase() + formation.slice(1);
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
    // Safety check: ensure audio data has required properties
    if (!audio || !audio.features || !audio.modulators || !audio.history) {
      console.warn('AudioPanel: Invalid audio data received');
      return;
    }

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

    // Safety check: ensure binding arrays exist before calling forEach
    this.metricBindings?.forEach((binding) => binding?.refresh());
    this.featureBindings?.forEach((binding) => binding?.refresh());
    this.modulatorBindings?.forEach((binding) => binding?.refresh());
    this.sparklineBindings?.forEach((binding) => binding?.refresh());
  }
  
  /**
   * Dispose of panel
   */
  dispose(): void {
    this.pane.dispose();
  }
}
