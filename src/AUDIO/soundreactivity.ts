/**
 * AUDIO/soundreactivity.ts - Advanced audio analysis and reactivity engine
 * Single responsibility: Web Audio API analysis, frequency detection, beat tracking
 */

import * as THREE from "three/webgpu";

export interface AudioConfig {
  enabled: boolean;
  source: 'microphone' | 'file';
  fftSize: number;
  smoothing: number;
  minDecibels: number;
  maxDecibels: number;
  
  // Frequency band gains
  bassGain: number;
  midGain: number;
  trebleGain: number;
  
  // Beat detection
  beatDetectionEnabled: boolean;
  beatThreshold: number;
  beatDecay: number;
  
  // Reactivity mapping
  particleInfluence: number;
  volumetricInfluence: number;
  colorInfluence: number;
  postFXInfluence: number;
}

export interface AudioData {
  // Raw frequency data
  frequencyData: Uint8Array;
  timeDomainData: Uint8Array;
  
  // Analyzed bands (0-1 normalized)
  bass: number;
  mid: number;
  treble: number;
  overall: number;
  
  // Beat detection
  isBeat: boolean;
  beatIntensity: number;
  timeSinceLastBeat: number;
  
  // Peak tracking
  peakFrequency: number;
  peakIntensity: number;
  
  // Smoothed values for animations
  smoothBass: number;
  smoothMid: number;
  smoothTreble: number;
  smoothOverall: number;
  
  // Time metrics
  time: number;
  deltaTime: number;
}

/**
 * SoundReactivity - Advanced audio analysis engine
 * Provides real-time frequency analysis, beat detection, and audio-reactive data
 */
export class SoundReactivity {
  // Web Audio API
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | MediaElementAudioSourceNode | null = null;
  private gainNode: GainNode | null = null;
  
  // Audio data buffers
  private frequencyData: Uint8Array = new Uint8Array(0);
  private timeDomainData: Uint8Array = new Uint8Array(0);
  
  // Analysis state
  private config: AudioConfig;
  private isInitialized: boolean = false;
  private audioElement: HTMLAudioElement | null = null;
  
  // Beat detection state
  private beatHistory: number[] = [];
  private lastBeatTime: number = 0;
  private beatThresholdAdaptive: number = 0;
  
  // Smoothing state
  private smoothedValues = {
    bass: 0,
    mid: 0,
    treble: 0,
    overall: 0,
  };
  
  // Time tracking
  private startTime: number = 0;
  private lastTime: number = 0;
  
  constructor(config: AudioConfig) {
    this.config = { ...config };
  }
  
  /**
   * Initialize audio context and start listening
   */
  async init(): Promise<void> {
    if (this.isInitialized) {
      return;
    }
    
    // Create audio context
    this.audioContext = new AudioContext();
    
    // Create analyser node
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = this.config.fftSize;
    this.analyser.smoothingTimeConstant = this.config.smoothing;
    this.analyser.minDecibels = this.config.minDecibels;
    this.analyser.maxDecibels = this.config.maxDecibels;
    
    // Create gain node for volume control
    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.value = 1.0;
    
    // Allocate data buffers
    const bufferLength = this.analyser.frequencyBinCount;
    this.frequencyData = new Uint8Array(bufferLength);
    this.timeDomainData = new Uint8Array(bufferLength);
    
    // Connect based on source type
    if (this.config.source === 'microphone') {
      await this.initMicrophone();
    } else {
      this.initFileInput();
    }
    
    this.isInitialized = true;
    this.startTime = performance.now();
    this.lastTime = this.startTime;
  }
  
  /**
   * Initialize microphone input
   */
  private async initMicrophone(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        } 
      });
      
      this.source = this.audioContext!.createMediaStreamSource(stream);
      this.source.connect(this.gainNode!);
      this.gainNode!.connect(this.analyser!);
      
      console.log('🎤 Microphone input initialized');
    } catch (error) {
      console.error('Failed to access microphone:', error);
      throw error;
    }
  }
  
  /**
   * Initialize file input (creates audio element for user to load files)
   */
  private initFileInput(): void {
    // Create hidden audio element
    this.audioElement = document.createElement('audio');
    this.audioElement.style.display = 'none';
    this.audioElement.crossOrigin = 'anonymous';
    document.body.appendChild(this.audioElement);
    
    // Connect audio element to analyser
    if (this.audioContext && this.analyser) {
      this.source = this.audioContext.createMediaElementSource(this.audioElement);
      this.source.connect(this.gainNode!);
      this.gainNode!.connect(this.analyser!);
      this.analyser!.connect(this.audioContext.destination); // Route to speakers
    }
    
    console.log('🎵 File input initialized (use loadAudioFile to load a file)');
  }
  
  /**
   * Load an audio file
   */
  loadAudioFile(url: string): void {
    if (!this.audioElement) {
      console.error('Audio element not initialized');
      return;
    }
    
    this.audioElement.src = url;
    this.audioElement.loop = true;
    this.audioElement.play().catch(err => {
      console.warn('Autoplay prevented, user interaction required:', err);
    });
  }
  
  /**
   * Play/pause audio
   */
  togglePlayback(): void {
    if (!this.audioElement) return;
    
    if (this.audioElement.paused) {
      this.audioElement.play();
    } else {
      this.audioElement.pause();
    }
  }
  
  /**
   * Set volume (0-1)
   */
  setVolume(volume: number): void {
    if (this.gainNode) {
      this.gainNode.gain.value = THREE.MathUtils.clamp(volume, 0, 1);
    }
  }
  
  /**
   * Update configuration
   */
  updateConfig(config: Partial<AudioConfig>): void {
    Object.assign(this.config, config);
    
    if (this.analyser) {
      if (config.fftSize !== undefined) {
        this.analyser.fftSize = config.fftSize;
        const bufferLength = this.analyser.frequencyBinCount;
        this.frequencyData = new Uint8Array(bufferLength);
        this.timeDomainData = new Uint8Array(bufferLength);
      }
      if (config.smoothing !== undefined) {
        this.analyser.smoothingTimeConstant = config.smoothing;
      }
      if (config.minDecibels !== undefined) {
        this.analyser.minDecibels = config.minDecibels;
      }
      if (config.maxDecibels !== undefined) {
        this.analyser.maxDecibels = config.maxDecibels;
      }
    }
  }
  
  /**
   * Get current audio data with analysis
   */
  getAudioData(): AudioData {
    if (!this.isInitialized || !this.analyser) {
      return this.getEmptyAudioData();
    }
    
    // Get raw audio data
    this.analyser.getByteFrequencyData(this.frequencyData);
    this.analyser.getByteTimeDomainData(this.timeDomainData);
    
    // Calculate time metrics
    const currentTime = performance.now();
    const deltaTime = (currentTime - this.lastTime) / 1000;
    const time = (currentTime - this.startTime) / 1000;
    this.lastTime = currentTime;
    
    // Analyze frequency bands
    const bands = this.analyzeFrequencyBands();
    
    // Detect beats
    const beatData = this.detectBeat(bands.overall, time);
    
    // Find peak frequency
    const peakData = this.findPeakFrequency();
    
    // Smooth values for animations with refined exponential smoothing
    // Lower rate = slower, more stable response (4 instead of 8)
    const smoothingFactor = Math.exp(-deltaTime * 4); // Slower exponential smoothing for stability
    this.smoothedValues.bass = this.lerp(bands.bass, this.smoothedValues.bass, smoothingFactor);
    this.smoothedValues.mid = this.lerp(bands.mid, this.smoothedValues.mid, smoothingFactor);
    this.smoothedValues.treble = this.lerp(bands.treble, this.smoothedValues.treble, smoothingFactor);
    this.smoothedValues.overall = this.lerp(bands.overall, this.smoothedValues.overall, smoothingFactor);
    
    return {
      frequencyData: this.frequencyData,
      timeDomainData: this.timeDomainData,
      
      bass: bands.bass,
      mid: bands.mid,
      treble: bands.treble,
      overall: bands.overall,
      
      isBeat: beatData.isBeat,
      beatIntensity: beatData.intensity,
      timeSinceLastBeat: beatData.timeSinceLast,
      
      peakFrequency: peakData.frequency,
      peakIntensity: peakData.intensity,
      
      smoothBass: this.smoothedValues.bass,
      smoothMid: this.smoothedValues.mid,
      smoothTreble: this.smoothedValues.treble,
      smoothOverall: this.smoothedValues.overall,
      
      time,
      deltaTime,
    };
  }
  
  /**
   * Analyze frequency bands (bass, mid, treble)
   */
  private analyzeFrequencyBands(): { bass: number; mid: number; treble: number; overall: number } {
    const binCount = this.frequencyData.length;
    const sampleRate = this.audioContext!.sampleRate;
    const nyquist = sampleRate / 2;
    const binWidth = nyquist / binCount;
    
    // Define frequency ranges (Hz)
    const bassRange = { min: 20, max: 250 };
    const midRange = { min: 250, max: 4000 };
    const trebleRange = { min: 4000, max: 20000 };
    
    // Convert to bin indices
    const bassBins = {
      start: Math.floor(bassRange.min / binWidth),
      end: Math.floor(bassRange.max / binWidth),
    };
    const midBins = {
      start: Math.floor(midRange.min / binWidth),
      end: Math.floor(midRange.max / binWidth),
    };
    const trebleBins = {
      start: Math.floor(trebleRange.min / binWidth),
      end: Math.min(Math.floor(trebleRange.max / binWidth), binCount - 1),
    };
    
    // Calculate average amplitude for each band
    const bass = this.calculateBandAverage(bassBins.start, bassBins.end) * this.config.bassGain;
    const mid = this.calculateBandAverage(midBins.start, midBins.end) * this.config.midGain;
    const treble = this.calculateBandAverage(trebleBins.start, trebleBins.end) * this.config.trebleGain;
    const overall = (bass + mid + treble) / 3;
    
    return { bass, mid, treble, overall };
  }
  
  /**
   * Calculate average amplitude for a frequency bin range
   */
  private calculateBandAverage(startBin: number, endBin: number): number {
    let sum = 0;
    let count = 0;
    
    for (let i = startBin; i <= endBin; i++) {
      sum += this.frequencyData[i];
      count++;
    }
    
    return count > 0 ? (sum / count) / 255 : 0; // Normalize to 0-1
  }
  
  /**
   * Detect beats using adaptive threshold
   */
  private detectBeat(currentIntensity: number, time: number): { 
    isBeat: boolean; 
    intensity: number; 
    timeSinceLast: number;
  } {
    if (!this.config.beatDetectionEnabled) {
      return { isBeat: false, intensity: 0, timeSinceLast: 0 };
    }
    
    // Add to history
    this.beatHistory.push(currentIntensity);
    if (this.beatHistory.length > 60) {
      this.beatHistory.shift();
    }
    
    // Calculate adaptive threshold
    const average = this.beatHistory.reduce((a, b) => a + b, 0) / this.beatHistory.length;
    const variance = this.beatHistory.reduce((a, b) => a + Math.pow(b - average, 2), 0) / this.beatHistory.length;
    this.beatThresholdAdaptive = average + Math.sqrt(variance) * this.config.beatThreshold;
    
    // Detect beat
    const timeSinceLastBeat = time - this.lastBeatTime;
    const minTimeBetweenBeats = 0.1; // 100ms minimum
    const isBeat = currentIntensity > this.beatThresholdAdaptive && 
                   timeSinceLastBeat > minTimeBetweenBeats;
    
    if (isBeat) {
      this.lastBeatTime = time;
    }
    
    // Calculate beat intensity with decay
    const beatIntensity = isBeat ? 1.0 : Math.max(0, 1.0 - (timeSinceLastBeat * this.config.beatDecay));
    
    return {
      isBeat,
      intensity: beatIntensity,
      timeSinceLast: timeSinceLastBeat,
    };
  }
  
  /**
   * Find peak frequency and its intensity
   */
  private findPeakFrequency(): { frequency: number; intensity: number } {
    let maxValue = 0;
    let maxIndex = 0;
    
    for (let i = 0; i < this.frequencyData.length; i++) {
      if (this.frequencyData[i] > maxValue) {
        maxValue = this.frequencyData[i];
        maxIndex = i;
      }
    }
    
    const sampleRate = this.audioContext!.sampleRate;
    const nyquist = sampleRate / 2;
    const binWidth = nyquist / this.frequencyData.length;
    const frequency = maxIndex * binWidth;
    const intensity = maxValue / 255;
    
    return { frequency, intensity };
  }
  
  /**
   * Linear interpolation
   */
  private lerp(target: number, current: number, factor: number): number {
    return current * factor + target * (1 - factor);
  }
  
  /**
   * Get empty audio data (for when audio is not initialized)
   */
  private getEmptyAudioData(): AudioData {
    return {
      frequencyData: new Uint8Array(0),
      timeDomainData: new Uint8Array(0),
      bass: 0,
      mid: 0,
      treble: 0,
      overall: 0,
      isBeat: false,
      beatIntensity: 0,
      timeSinceLastBeat: 0,
      peakFrequency: 0,
      peakIntensity: 0,
      smoothBass: 0,
      smoothMid: 0,
      smoothTreble: 0,
      smoothOverall: 0,
      time: 0,
      deltaTime: 0,
    };
  }
  
  /**
   * Dispose of audio resources
   */
  dispose(): void {
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    
    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }
    
    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.remove();
      this.audioElement = null;
    }
    
    this.isInitialized = false;
  }
}

