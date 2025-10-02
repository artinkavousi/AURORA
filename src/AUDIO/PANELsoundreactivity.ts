/**
 * AUDIO/PANELsoundreactivity.ts - Premium audio reactivity control panel
 * Elegant UI for audio analysis and visualization with real-time metrics
 */

import type { Pane } from 'tweakpane';
import type { AudioConfig } from './soundreactivity';
import type { FlowConfig, VolumetricConfig } from '../config';
import type { Dashboard } from '../PANEL/dashboard';

export interface AudioPanelCallbacks {
  onAudioConfigChange?: (config: Partial<AudioConfig>) => void;
  onVolumetricConfigChange?: (config: Partial<VolumetricConfig>) => void;
  onSourceChange?: (source: 'microphone' | 'file') => void;
  onFileLoad?: (url: string) => void;
  onTogglePlayback?: () => void;
  onVolumeChange?: (volume: number) => void;
}

/**
 * AudioPanel - Premium audio reactivity control panel
 * Beautiful, organized interface with real-time metrics
 */
export class AudioPanel {
  private pane: any;
  private callbacks: AudioPanelCallbacks;
  private config: FlowConfig;
  
  // Control state
  private audioState = {
    enabled: true,
    source: 'microphone' as 'microphone' | 'file',
    volume: 1.0,
    isPlaying: false,
  };
  
  // Metrics display
  private metrics = {
    bass: 0,
    mid: 0,
    treble: 0,
    overall: 0,
    beatIntensity: 0,
    peakFrequency: 0,
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
    this.buildMetricsDisplay();
    this.buildSourceControls();
    this.buildReactivityControls();
    this.buildAnalysisControls();
    this.buildVolumetricControls();
  }
  
  // ========================================
  // REAL-TIME METRICS
  // ========================================
  
  private buildMetricsDisplay(): void {
    const folder = this.pane.addFolder({
      title: '📊 Live Audio Metrics',
      expanded: true,
    });

    folder.addBinding(this.metrics, 'overall', {
      label: 'Overall',
      readonly: true,
      min: 0,
      max: 1,
    });

    folder.addBlade({ view: 'separator' });

    const bandsFolder = folder.addFolder({
      title: 'Frequency Bands',
      expanded: true,
    });

    bandsFolder.addBinding(this.metrics, 'bass', {
      label: 'Bass',
      readonly: true,
      min: 0,
      max: 1,
    });

    bandsFolder.addBinding(this.metrics, 'mid', {
      label: 'Mid',
      readonly: true,
      min: 0,
      max: 1,
    });

    bandsFolder.addBinding(this.metrics, 'treble', {
      label: 'Treble',
      readonly: true,
      min: 0,
      max: 1,
    });

    folder.addBlade({ view: 'separator' });

    folder.addBinding(this.metrics, 'beatIntensity', {
      label: 'Beat',
      readonly: true,
      min: 0,
      max: 1,
    });

    folder.addBinding(this.metrics, 'peakFrequency', {
      label: 'Peak (Hz)',
      readonly: true,
      format: (v: number) => v.toFixed(0),
    });
  }
  
  // ========================================
  // AUDIO SOURCE
  // ========================================
  
  private buildSourceControls(): void {
    const folder = this.pane.addFolder({
      title: '🎤 Audio Input',
      expanded: true,
    });
    
    folder.addBinding(this.audioState, 'enabled', {
      label: 'Enable Audio',
    }).on('change', (ev: any) => {
      this.config.audio.enabled = ev.value;
      this.callbacks.onAudioConfigChange?.({ enabled: ev.value });
    });

    folder.addBlade({ view: 'separator' });
    
    folder.addBinding(this.audioState, 'source', {
      label: 'Source',
      options: {
        Microphone: 'microphone',
        'Audio File': 'file',
      },
    }).on('change', (ev: any) => {
      this.config.audio.source = ev.value;
      this.callbacks.onSourceChange?.(ev.value);
    });
    
    folder.addBinding(this.audioState, 'volume', {
      label: 'Volume',
      min: 0,
      max: 1,
      step: 0.01,
    }).on('change', (ev: any) => {
      this.callbacks.onVolumeChange?.(ev.value);
    });

    folder.addBlade({ view: 'separator' });
    
    folder.addButton({
      title: 'Load Audio File',
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
      title: '▶️ Play / ⏸️ Pause',
    }).on('click', () => {
      this.audioState.isPlaying = !this.audioState.isPlaying;
      this.callbacks.onTogglePlayback?.();
    });
  }
  
  // ========================================
  // REACTIVITY INFLUENCE
  // ========================================
  
  private buildReactivityControls(): void {
    const folder = this.pane.addFolder({
      title: '🎚️ Reactivity Influence',
      expanded: false,
    });
    
    folder.addBinding(this.config.audio, 'particleInfluence', {
      label: 'Particles',
      min: 0,
      max: 1,
      step: 0.05,
    }).on('change', (ev: any) => {
      this.callbacks.onAudioConfigChange?.({ particleInfluence: ev.value });
    });
    
    folder.addBinding(this.config.audio, 'volumetricInfluence', {
      label: 'Volumetric',
      min: 0,
      max: 1,
      step: 0.05,
    }).on('change', (ev: any) => {
      this.callbacks.onAudioConfigChange?.({ volumetricInfluence: ev.value });
    });
    
    folder.addBinding(this.config.audio, 'colorInfluence', {
      label: 'Color',
      min: 0,
      max: 1,
      step: 0.05,
    }).on('change', (ev: any) => {
      this.callbacks.onAudioConfigChange?.({ colorInfluence: ev.value });
    });
    
    folder.addBinding(this.config.audio, 'postFXInfluence', {
      label: 'Post-FX',
      min: 0,
      max: 1,
      step: 0.05,
    }).on('change', (ev: any) => {
      this.callbacks.onAudioConfigChange?.({ postFXInfluence: ev.value });
    });
  }
  
  // ========================================
  // ANALYSIS SETTINGS
  // ========================================
  
  private buildAnalysisControls(): void {
    const folder = this.pane.addFolder({
      title: '🔬 Analysis Settings',
      expanded: false,
    });
    
    // FFT Settings
    const fftFolder = folder.addFolder({
      title: 'FFT & Smoothing',
      expanded: true,
    });

    fftFolder.addBinding(this.config.audio, 'fftSize', {
      label: 'FFT Size',
      options: {
        '512': 512,
        '1024': 1024,
        '2048': 2048,
        '4096': 4096,
        '8192': 8192,
      },
    }).on('change', (ev: any) => {
      this.callbacks.onAudioConfigChange?.({ fftSize: ev.value });
    });
    
    fftFolder.addBinding(this.config.audio, 'smoothing', {
      label: 'Smoothing',
      min: 0,
      max: 0.99,
      step: 0.01,
    }).on('change', (ev: any) => {
      this.callbacks.onAudioConfigChange?.({ smoothing: ev.value });
    });
    
    // Frequency Gains
    const gainsFolder = folder.addFolder({
      title: 'Band Gains',
      expanded: true,
    });
    
    gainsFolder.addBinding(this.config.audio, 'bassGain', {
      label: 'Bass',
      min: 0,
      max: 2,
      step: 0.1,
    }).on('change', (ev: any) => {
      this.callbacks.onAudioConfigChange?.({ bassGain: ev.value });
    });
    
    gainsFolder.addBinding(this.config.audio, 'midGain', {
      label: 'Mid',
      min: 0,
      max: 2,
      step: 0.1,
    }).on('change', (ev: any) => {
      this.callbacks.onAudioConfigChange?.({ midGain: ev.value });
    });
    
    gainsFolder.addBinding(this.config.audio, 'trebleGain', {
      label: 'Treble',
      min: 0,
      max: 2,
      step: 0.1,
    }).on('change', (ev: any) => {
      this.callbacks.onAudioConfigChange?.({ trebleGain: ev.value });
    });
    
    // Beat Detection
    const beatFolder = folder.addFolder({
      title: 'Beat Detection',
      expanded: true,
    });
    
    beatFolder.addBinding(this.config.audio, 'beatDetectionEnabled', {
      label: 'Enable',
    }).on('change', (ev: any) => {
      this.callbacks.onAudioConfigChange?.({ beatDetectionEnabled: ev.value });
    });
    
    beatFolder.addBinding(this.config.audio, 'beatThreshold', {
      label: 'Threshold',
      min: 0.5,
      max: 3.0,
      step: 0.1,
    }).on('change', (ev: any) => {
      this.callbacks.onAudioConfigChange?.({ beatThreshold: ev.value });
    });
    
    beatFolder.addBinding(this.config.audio, 'beatDecay', {
      label: 'Decay',
      min: 1,
      max: 10,
      step: 0.5,
    }).on('change', (ev: any) => {
      this.callbacks.onAudioConfigChange?.({ beatDecay: ev.value });
    });
  }
  
  // ========================================
  // VOLUMETRIC VISUALIZATION
  // ========================================
  
  private buildVolumetricControls(): void {
    const folder = this.pane.addFolder({
      title: '🌐 Volumetric Viz',
      expanded: false,
    });
    
    folder.addBinding(this.config.volumetric, 'enabled', {
      label: 'Enable Effect',
    }).on('change', (ev: any) => {
      this.callbacks.onVolumetricConfigChange?.({ enabled: ev.value });
    });

    folder.addBlade({ view: 'separator' });
    
    folder.addBinding(this.config.volumetric, 'mode', {
      label: 'Mode',
      options: {
        Sphere: 'sphere',
        Cylinder: 'cylinder',
        Waves: 'waves',
        Particles: 'particles',
        Tunnel: 'tunnel',
      },
    }).on('change', (ev: any) => {
      this.callbacks.onVolumetricConfigChange?.({ mode: ev.value });
    });
    
    // Appearance
    const appearanceFolder = folder.addFolder({
      title: 'Appearance',
      expanded: true,
    });
    
    appearanceFolder.addBinding(this.config.volumetric, 'scale', {
      label: 'Scale',
      min: 0.5,
      max: 3.0,
      step: 0.1,
    }).on('change', (ev: any) => {
      this.callbacks.onVolumetricConfigChange?.({ scale: ev.value });
    });
    
    appearanceFolder.addBinding(this.config.volumetric, 'complexity', {
      label: 'Complexity',
      min: 1,
      max: 20,
      step: 1,
    }).on('change', (ev: any) => {
      this.callbacks.onVolumetricConfigChange?.({ complexity: ev.value });
    });
    
    appearanceFolder.addBinding(this.config.volumetric, 'speed', {
      label: 'Speed',
      min: 0,
      max: 3,
      step: 0.1,
    }).on('change', (ev: any) => {
      this.callbacks.onVolumetricConfigChange?.({ speed: ev.value });
    });
    
    appearanceFolder.addBinding(this.config.volumetric, 'opacity', {
      label: 'Opacity',
      min: 0,
      max: 1,
      step: 0.05,
    }).on('change', (ev: any) => {
      this.callbacks.onVolumetricConfigChange?.({ opacity: ev.value });
    });
    
    // Color
    const colorFolder = folder.addFolder({
      title: 'Color',
      expanded: true,
    });
    
    colorFolder.addBinding(this.config.volumetric, 'colorMode', {
      label: 'Mode',
      options: {
        Rainbow: 'rainbow',
        Bass: 'bass',
        Frequency: 'frequency',
        Gradient: 'gradient',
      },
    }).on('change', (ev: any) => {
      this.callbacks.onVolumetricConfigChange?.({ colorMode: ev.value });
    });
    
    colorFolder.addBinding(this.config.volumetric, 'hue', {
      label: 'Hue',
      min: 0,
      max: 1,
      step: 0.01,
    }).on('change', (ev: any) => {
      this.callbacks.onVolumetricConfigChange?.({ hue: ev.value });
    });
    
    colorFolder.addBinding(this.config.volumetric, 'saturation', {
      label: 'Saturation',
      min: 0,
      max: 1,
      step: 0.01,
    }).on('change', (ev: any) => {
      this.callbacks.onVolumetricConfigChange?.({ saturation: ev.value });
    });
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
    this.metrics.beatIntensity = beatIntensity;
    this.metrics.peakFrequency = peakFrequency;
  }
  
  /**
   * Dispose of panel
   */
  dispose(): void {
    this.pane.dispose();
  }
}
