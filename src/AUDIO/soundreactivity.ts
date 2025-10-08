/**
 * AUDIO/soundreactivity.ts - Advanced audio analysis and reactivity engine
 * Responsibilities:
 *   • Capture microphone/file audio via Web Audio API
 *   • Extract rich feature set (bands, flux, harmonicity, stereo imaging, rhythm)
 *   • Maintain modulation bus + history buffers for downstream visual systems
 */

import * as THREE from "three/webgpu";
import type { AudioConfig } from "../config";

export interface AudioFeatureSummary {
  spectralFlux: number;
  harmonicEnergy: number;
  harmonicRatio: number;
  onsetEnergy: number;
  rhythmConfidence: number;
  tempo: number;
  stereoBalance: number;
  stereoWidth: number;
  groove: number;
}

export interface AudioHistorySnapshot {
  loudness: Float32Array;
  flux: Float32Array;
  beat: Float32Array;
}

export interface AudioModulationState {
  pulse: number;   // Beat + onset energy
  flow: number;    // Macro motion & envelopes
  shimmer: number; // Treble + stereo sparkle
  warp: number;    // Stereo balance driven warp
  density: number; // Particle emission density
  aura: number;    // Post/Bloom intensity
}

export interface AudioData {
  frequencyData: Uint8Array;
  timeDomainData: Uint8Array;

  bass: number;
  mid: number;
  treble: number;
  overall: number;

  isBeat: boolean;
  beatIntensity: number;
  timeSinceLastBeat: number;

  peakFrequency: number;
  peakIntensity: number;

  smoothBass: number;
  smoothMid: number;
  smoothTreble: number;
  smoothOverall: number;

  time: number;
  deltaTime: number;

  tempoPhase: number;
  overallTrend: number;

  features: AudioFeatureSummary;
  history: AudioHistorySnapshot;
  modulators: AudioModulationState;
}

/**
 * SoundReactivity - high fidelity audio feature extraction with modulation bus
 */
export class SoundReactivity {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | MediaElementAudioSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private channelSplitter: ChannelSplitterNode | null = null;
  private leftAnalyser: AnalyserNode | null = null;
  private rightAnalyser: AnalyserNode | null = null;
  private audioElement: HTMLAudioElement | null = null;

  private frequencyData: Uint8Array = new Uint8Array(0);
  private timeDomainData: Uint8Array = new Uint8Array(0);
  private leftFrequencyData: Uint8Array = new Uint8Array(0);
  private rightFrequencyData: Uint8Array = new Uint8Array(0);
  private leftTimeDomain: Float32Array = new Float32Array(0);
  private rightTimeDomain: Float32Array = new Float32Array(0);

  private currentSpectrum: Float32Array = new Float32Array(0);
  private previousSpectrum: Float32Array = new Float32Array(0);

  private config: AudioConfig;
  private isInitialized = false;

  private beatHistory: number[] = [];
  private beatIntervals: number[] = [];
  private lastBeatTime = 0;
  private beatThresholdAdaptive = 0;
  private tempoEstimate = 120;
  private tempoPhase = 0;
  private rhythmConfidence = 0;

  private smoothedValues = {
    bass: 0,
    mid: 0,
    treble: 0,
    overall: 0,
  };

  private modulationState: AudioModulationState = {
    pulse: 0,
    flow: 0,
    shimmer: 0,
    warp: 0,
    density: 0,
    aura: 0,
  };

  private smoothedFlux = 0;
  private smoothedOnset = 0;
  private previousOverall = 0;

  private loudnessHistory: Float32Array = new Float32Array(0);
  private fluxHistory: Float32Array = new Float32Array(0);
  private beatEnergyHistory: Float32Array = new Float32Array(0);
  private historyIndex = 0;

  private startTime = 0;
  private lastTime = 0;

  constructor(config: AudioConfig) {
    this.config = { ...config };
    this.allocateHistoryBuffers(this.config.historySize ?? 192);
  }

  async init(): Promise<void> {
    if (this.isInitialized) return;

    this.audioContext = new AudioContext();
    this.analyser = this.audioContext.createAnalyser();
    this.gainNode = this.audioContext.createGain();
    this.channelSplitter = this.audioContext.createChannelSplitter(2);
    this.leftAnalyser = this.audioContext.createAnalyser();
    this.rightAnalyser = this.audioContext.createAnalyser();

    this.configureAnalyser(this.analyser);
    this.configureAnalyser(this.leftAnalyser);
    this.configureAnalyser(this.rightAnalyser);

    this.gainNode.gain.value = 1.0;

    const bufferLength = this.analyser.frequencyBinCount;
    this.frequencyData = new Uint8Array(bufferLength);
    this.timeDomainData = new Uint8Array(bufferLength);
    this.currentSpectrum = new Float32Array(bufferLength);
    this.previousSpectrum = new Float32Array(bufferLength);

    this.leftFrequencyData = new Uint8Array(this.leftAnalyser.frequencyBinCount);
    this.rightFrequencyData = new Uint8Array(this.rightAnalyser.frequencyBinCount);
    this.leftTimeDomain = new Float32Array(this.leftAnalyser.fftSize);
    this.rightTimeDomain = new Float32Array(this.rightAnalyser.fftSize);

    if (this.config.source === 'microphone') {
      await this.initMicrophone();
    } else {
      this.initFileInput();
    }

    this.isInitialized = true;
    this.startTime = performance.now();
    this.lastTime = this.startTime;
  }

  private configureAnalyser(node: AnalyserNode | null): void {
    if (!node) return;
    node.fftSize = this.config.fftSize;
    node.smoothingTimeConstant = this.config.smoothing;
    node.minDecibels = this.config.minDecibels;
    node.maxDecibels = this.config.maxDecibels;
  }

  private connectAnalyzers(): void {
    if (!this.gainNode || !this.analyser || !this.channelSplitter || !this.leftAnalyser || !this.rightAnalyser) {
      return;
    }

    this.gainNode.connect(this.analyser);
    this.gainNode.connect(this.channelSplitter);
    this.channelSplitter.connect(this.leftAnalyser, 0);
    this.channelSplitter.connect(this.rightAnalyser, 1);
  }

  private async initMicrophone(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      this.source = this.audioContext!.createMediaStreamSource(stream);
      this.source.connect(this.gainNode!);
      this.connectAnalyzers();
      console.log('🎤 Microphone input initialized');
    } catch (error) {
      console.error('Failed to access microphone:', error);
      throw error;
    }
  }

  private initFileInput(): void {
    this.audioElement = document.createElement('audio');
    this.audioElement.style.display = 'none';
    this.audioElement.crossOrigin = 'anonymous';
    document.body.appendChild(this.audioElement);

    if (this.audioContext && this.analyser) {
      this.source = this.audioContext.createMediaElementSource(this.audioElement);
      this.source.connect(this.gainNode!);
      this.connectAnalyzers();
      this.analyser.connect(this.audioContext.destination);
    }

    console.log('🎵 File input initialized (use loadAudioFile to load a file)');
  }

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

  togglePlayback(): void {
    if (!this.audioElement) return;
    if (this.audioElement.paused) {
      this.audioElement.play();
    } else {
      this.audioElement.pause();
    }
  }

  setVolume(volume: number): void {
    if (this.gainNode) {
      this.gainNode.gain.value = THREE.MathUtils.clamp(volume, 0, 1);
    }
  }

  updateConfig(config: Partial<AudioConfig>): void {
    Object.assign(this.config, config);

    if (config.historySize !== undefined) {
      this.allocateHistoryBuffers(config.historySize);
    }

    if (this.analyser) {
      this.configureAnalyser(this.analyser);
      const bufferLength = this.analyser.frequencyBinCount;
      this.frequencyData = new Uint8Array(bufferLength);
      this.timeDomainData = new Uint8Array(bufferLength);
      this.currentSpectrum = new Float32Array(bufferLength);
      this.previousSpectrum = new Float32Array(bufferLength);
    }

    if (this.leftAnalyser && this.rightAnalyser) {
      this.configureAnalyser(this.leftAnalyser);
      this.configureAnalyser(this.rightAnalyser);
      this.leftFrequencyData = new Uint8Array(this.leftAnalyser.frequencyBinCount);
      this.rightFrequencyData = new Uint8Array(this.rightAnalyser.frequencyBinCount);
      this.leftTimeDomain = new Float32Array(this.leftAnalyser.fftSize);
      this.rightTimeDomain = new Float32Array(this.rightAnalyser.fftSize);
    }
  }

  getAudioData(): AudioData {
    if (!this.isInitialized || !this.analyser) {
      return this.getEmptyAudioData();
    }

    this.analyser.getByteFrequencyData(this.frequencyData);
    this.analyser.getByteTimeDomainData(this.timeDomainData);
    if (this.leftAnalyser && this.rightAnalyser) {
      this.leftAnalyser.getByteFrequencyData(this.leftFrequencyData);
      this.rightAnalyser.getByteFrequencyData(this.rightFrequencyData);
      this.leftAnalyser.getFloatTimeDomainData(this.leftTimeDomain);
      this.rightAnalyser.getFloatTimeDomainData(this.rightTimeDomain);
    }

    const currentTime = performance.now();
    const deltaTime = (currentTime - this.lastTime) / 1000;
    const time = (currentTime - this.startTime) / 1000;
    this.lastTime = currentTime;

    for (let i = 0; i < this.frequencyData.length; i++) {
      this.currentSpectrum[i] = this.frequencyData[i] / 255;
    }

    const bands = this.analyzeFrequencyBands();
    const beatData = this.detectBeat(bands.overall, time);
    const peakData = this.findPeakFrequency();

    if (beatData.isBeat && beatData.timeSinceLast > 0.05) {
      this.registerBeatInterval(beatData.timeSinceLast);
      this.tempoPhase = 0;
    } else {
      const beatDuration = 60 / Math.max(this.tempoEstimate, 1e-3);
      this.tempoPhase = (this.tempoPhase + deltaTime / beatDuration) % 1;
    }

    const spectralFlux = this.computeSpectralFlux();
    const onsetEnergy = this.computeOnsetEnergy(bands.overall);
    const harmonicity = this.computeHarmonicity(peakData.frequency);
    const stereo = this.computeStereoMetrics();
    const groove = this.computeGroove(bands, spectralFlux);

    const features: AudioFeatureSummary = {
      spectralFlux,
      harmonicEnergy: harmonicity.energy,
      harmonicRatio: harmonicity.ratio,
      onsetEnergy,
      rhythmConfidence: this.rhythmConfidence,
      tempo: this.tempoEstimate,
      stereoBalance: stereo.balance,
      stereoWidth: stereo.width,
      groove,
    };

    const smoothingFactor = Math.exp(-deltaTime * THREE.MathUtils.lerp(2.5, 7.5, 1 - this.config.featureSmoothing));
    this.smoothedValues.bass = this.lerp(bands.bass, this.smoothedValues.bass, smoothingFactor);
    this.smoothedValues.mid = this.lerp(bands.mid, this.smoothedValues.mid, smoothingFactor);
    this.smoothedValues.treble = this.lerp(bands.treble, this.smoothedValues.treble, smoothingFactor);
    this.smoothedValues.overall = this.lerp(bands.overall, this.smoothedValues.overall, smoothingFactor);

    const historyBeatValue = beatData.isBeat ? beatData.intensity : beatData.intensity * 0.5;
    this.pushHistory(bands.overall, spectralFlux, historyBeatValue);

    const modulators = this.updateModulators(bands, features);

    const overallTrend = THREE.MathUtils.clamp(bands.overall - this.previousOverall, -1, 1);
    this.previousOverall = bands.overall;

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
      tempoPhase: this.tempoPhase,
      overallTrend,
      features,
      history: this.getHistorySnapshot(),
      modulators,
    };
  }

  private analyzeFrequencyBands(): { bass: number; mid: number; treble: number; overall: number } {
    const binCount = this.frequencyData.length;
    const sampleRate = this.audioContext!.sampleRate;
    const nyquist = sampleRate / 2;
    const binWidth = nyquist / binCount;

    const ranges = {
      bass: { min: 20, max: 250 },
      mid: { min: 250, max: 4000 },
      treble: { min: 4000, max: 20000 },
    } as const;

    const getAverage = (min: number, max: number) => {
      const start = Math.floor(min / binWidth);
      const end = Math.min(Math.floor(max / binWidth), binCount - 1);
      return this.calculateBandAverage(start, end);
    };

    const bass = getAverage(ranges.bass.min, ranges.bass.max) * this.config.bassGain;
    const mid = getAverage(ranges.mid.min, ranges.mid.max) * this.config.midGain;
    const treble = getAverage(ranges.treble.min, ranges.treble.max) * this.config.trebleGain;
    const overall = (bass + mid + treble) / 3;

    return { bass, mid, treble, overall };
  }

  private calculateBandAverage(startBin: number, endBin: number): number {
    let sum = 0;
    let count = 0;
    for (let i = startBin; i <= endBin; i++) {
      sum += this.frequencyData[i];
      count++;
    }
    return count > 0 ? (sum / count) / 255 : 0;
  }

  private detectBeat(currentIntensity: number, time: number): {
    isBeat: boolean;
    intensity: number;
    timeSinceLast: number;
  } {
    if (!this.config.beatDetectionEnabled) {
      return { isBeat: false, intensity: 0, timeSinceLast: time - this.lastBeatTime };
    }

    this.beatHistory.push(currentIntensity);
    if (this.beatHistory.length > 96) {
      this.beatHistory.shift();
    }

    const average = this.beatHistory.reduce((a, b) => a + b, 0) / this.beatHistory.length;
    const variance = this.beatHistory.reduce((a, b) => a + Math.pow(b - average, 2), 0) / this.beatHistory.length;
    this.beatThresholdAdaptive = average + Math.sqrt(variance) * this.config.beatThreshold;

    const timeSinceLastBeat = time - this.lastBeatTime;
    const minTimeBetweenBeats = 0.1;
    const isBeat = currentIntensity > this.beatThresholdAdaptive && timeSinceLastBeat > minTimeBetweenBeats;

    if (isBeat) {
      this.lastBeatTime = time;
    }

    const beatIntensity = isBeat
      ? 1.0
      : Math.max(0, 1.0 - (timeSinceLastBeat * this.config.beatDecay));

    return {
      isBeat,
      intensity: THREE.MathUtils.clamp(beatIntensity, 0, 1),
      timeSinceLast: timeSinceLastBeat,
    };
  }

  private registerBeatInterval(interval: number): void {
    if (!isFinite(interval) || interval <= 0) return;
    if (interval < 0.15 || interval > 2.5) return;

    this.beatIntervals.push(interval);
    if (this.beatIntervals.length > 32) {
      this.beatIntervals.shift();
    }

    const mean = this.beatIntervals.reduce((acc, value) => acc + value, 0) / this.beatIntervals.length;
    const variance = this.beatIntervals.reduce((acc, value) => acc + Math.pow(value - mean, 2), 0) / this.beatIntervals.length;
    const deviation = Math.sqrt(variance);

    const stability = mean > 0 ? THREE.MathUtils.clamp(1 - deviation / mean, 0, 1) : 0;
    this.rhythmConfidence = THREE.MathUtils.lerp(this.rhythmConfidence, stability, 0.35);
    this.tempoEstimate = THREE.MathUtils.clamp(60 / mean, 40, 200);
  }

  private computeSpectralFlux(): number {
    if (!this.currentSpectrum.length) {
      return 0;
    }

    let flux = 0;
    for (let i = 0; i < this.currentSpectrum.length; i++) {
      const diff = this.currentSpectrum[i] - this.previousSpectrum[i];
      if (diff > 0) {
        flux += diff;
      }
      this.previousSpectrum[i] = this.currentSpectrum[i];
    }

    flux = flux / (this.currentSpectrum.length || 1);
    this.smoothedFlux = this.lerp(THREE.MathUtils.clamp(flux, 0, 1), this.smoothedFlux, this.config.fluxSmoothing);
    return this.smoothedFlux;
  }

  private computeOnsetEnergy(overall: number): number {
    const delta = Math.max(0, overall - this.previousOverall);
    const raw = THREE.MathUtils.clamp(
      delta * (1 - this.config.onsetSensitivity) + this.smoothedFlux * this.config.onsetSensitivity,
      0,
      1
    );
    this.smoothedOnset = this.lerp(raw, this.smoothedOnset, this.config.featureSmoothing);
    return this.smoothedOnset;
  }

  private findPeakFrequency(): { frequency: number; intensity: number } {
    if (!this.audioContext || !this.currentSpectrum.length) {
      return { frequency: 0, intensity: 0 };
    }

    const sampleRate = this.audioContext.sampleRate;
    const nyquist = sampleRate / 2;
    const binWidth = nyquist / this.currentSpectrum.length;

    // Find the bin with maximum intensity
    let maxIntensity = 0;
    let maxBin = 0;
    
    for (let i = 0; i < this.currentSpectrum.length; i++) {
      if (this.currentSpectrum[i] > maxIntensity) {
        maxIntensity = this.currentSpectrum[i];
        maxBin = i;
      }
    }

    // Calculate frequency from bin index
    const frequency = maxBin * binWidth;
    
    return { 
      frequency: frequency,
      intensity: maxIntensity 
    };
  }

  private computeHarmonicity(peakFrequency: number): { energy: number; ratio: number } {
    if (!this.audioContext || !peakFrequency || !this.currentSpectrum.length) {
      return { energy: 0, ratio: 0 };
    }

    const sampleRate = this.audioContext.sampleRate;
    const nyquist = sampleRate / 2;
    const binWidth = nyquist / this.currentSpectrum.length;

    let harmonicEnergy = 0;
    let harmonicCount = 0;

    for (let h = 2; h <= 6; h++) {
      const freq = peakFrequency * h;
      if (freq >= nyquist) break;
      const index = Math.round(freq / binWidth);
      const window = 2;
      let energy = 0;
      let count = 0;
      for (let i = Math.max(0, index - window); i <= Math.min(this.currentSpectrum.length - 1, index + window); i++) {
        energy += this.currentSpectrum[i];
        count++;
      }
      if (count > 0) {
        harmonicEnergy += energy / count;
        harmonicCount++;
      }
    }

    const totalEnergy = this.currentSpectrum.reduce((acc, value) => acc + value, 0);
    const normalizedEnergy = harmonicCount > 0 ? harmonicEnergy / harmonicCount : 0;
    const ratio = totalEnergy > 0 ? THREE.MathUtils.clamp(harmonicEnergy / totalEnergy, 0, 1) : 0;

    return { energy: normalizedEnergy, ratio };
  }

  private computeStereoMetrics(): { balance: number; width: number } {
    if (!this.leftFrequencyData.length || !this.rightFrequencyData.length) {
      return { balance: 0, width: 0 };
    }

    let leftEnergy = 0;
    let rightEnergy = 0;
    for (let i = 0; i < this.leftFrequencyData.length; i++) {
      leftEnergy += this.leftFrequencyData[i];
      rightEnergy += this.rightFrequencyData[i];
    }

    const total = leftEnergy + rightEnergy + 1e-5;
    const balance = THREE.MathUtils.clamp(((rightEnergy - leftEnergy) / total) * this.config.stereoEmphasis, -1, 1);

    let dot = 0;
    let leftNorm = 0;
    let rightNorm = 0;
    const sampleCount = Math.min(this.leftTimeDomain.length, this.rightTimeDomain.length);
    for (let i = 0; i < sampleCount; i++) {
      const l = this.leftTimeDomain[i];
      const r = this.rightTimeDomain[i];
      dot += l * r;
      leftNorm += l * l;
      rightNorm += r * r;
    }

    const denominator = Math.sqrt(leftNorm * rightNorm) + 1e-5;
    const correlation = THREE.MathUtils.clamp(dot / denominator, -1, 1);
    const width = THREE.MathUtils.clamp(1 - Math.abs(correlation), 0, 1);

    return { balance, width };
  }

  private computeGroove(
    bands: { bass: number; mid: number; treble: number; overall: number },
    spectralFlux: number
  ): number {
    const tempoFactor = THREE.MathUtils.clamp((this.tempoEstimate - 60) / 120, 0, 1);
    const blend = bands.bass * 0.45 + bands.mid * 0.2 + spectralFlux * 0.2 + tempoFactor * 0.15;
    return THREE.MathUtils.clamp(blend * (0.5 + this.config.grooveSensitivity), 0, 1);
  }

  private updateModulators(
    bands: { bass: number; mid: number; treble: number; overall: number },
    features: AudioFeatureSummary
  ): AudioModulationState {
    const balanceNormalized = (features.stereoBalance + 1) * 0.5;

    const targets: AudioModulationState = {
      pulse: THREE.MathUtils.clamp(features.onsetEnergy * 0.6 + features.spectralFlux * 0.4, 0, 1),
      flow: THREE.MathUtils.clamp(this.smoothedValues.overall * 0.5 + features.rhythmConfidence * 0.5, 0, 1),
      shimmer: THREE.MathUtils.clamp(bands.treble * 0.6 + features.stereoWidth * 0.4, 0, 1),
      warp: THREE.MathUtils.clamp(balanceNormalized * 0.8 + features.stereoWidth * 0.2, 0, 1),
      density: THREE.MathUtils.clamp(bands.bass * 0.4 + bands.mid * 0.35 + features.groove * 0.25, 0, 1),
      aura: THREE.MathUtils.clamp(this.smoothedValues.overall * 0.6 + features.stereoWidth * 0.2 + features.harmonicRatio * 0.2, 0, 1),
    };

    for (const key of Object.keys(targets) as (keyof AudioModulationState)[]) {
      const target = targets[key];
      this.modulationState[key] = this.lerp(target, this.modulationState[key], this.config.featureSmoothing);
    }

    return { ...this.modulationState };
  }

  private pushHistory(loudness: number, flux: number, beat: number): void {
    if (!this.loudnessHistory.length) return;
    this.loudnessHistory[this.historyIndex] = loudness;
    this.fluxHistory[this.historyIndex] = flux;
    this.beatEnergyHistory[this.historyIndex] = beat;
    this.historyIndex = (this.historyIndex + 1) % this.loudnessHistory.length;
  }

  private getHistorySnapshot(): AudioHistorySnapshot {
    const snapshotLength = this.loudnessHistory.length;
    const loudness = new Float32Array(snapshotLength);
    const flux = new Float32Array(snapshotLength);
    const beat = new Float32Array(snapshotLength);

    for (let i = 0; i < snapshotLength; i++) {
      const index = (this.historyIndex + i) % snapshotLength;
      loudness[i] = this.loudnessHistory[index];
      flux[i] = this.fluxHistory[index];
      beat[i] = this.beatEnergyHistory[index];
    }

    return { loudness, flux, beat };
  }

  private allocateHistoryBuffers(size: number): void {
    const length = Math.max(32, Math.floor(size));
    this.loudnessHistory = new Float32Array(length);
    this.fluxHistory = new Float32Array(length);
    this.beatEnergyHistory = new Float32Array(length);
    this.historyIndex = 0;
  }

  private lerp(target: number, current: number, factor: number): number {
    return current * factor + target * (1 - factor);
  }

  private getEmptyAudioData(): AudioData {
    const history = this.getHistorySnapshot();
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
      tempoPhase: 0,
      overallTrend: 0,
      features: {
        spectralFlux: 0,
        harmonicEnergy: 0,
        harmonicRatio: 0,
        onsetEnergy: 0,
        rhythmConfidence: 0,
        tempo: this.tempoEstimate,
        stereoBalance: 0,
        stereoWidth: 0,
        groove: 0,
      },
      history,
      modulators: { ...this.modulationState },
    };
  }

  dispose(): void {
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }

    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }

    if (this.channelSplitter) {
      this.channelSplitter.disconnect();
      this.channelSplitter = null;
    }

    if (this.leftAnalyser) {
      this.leftAnalyser.disconnect();
      this.leftAnalyser = null;
    }

    if (this.rightAnalyser) {
      this.rightAnalyser.disconnect();
      this.rightAnalyser = null;
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
    this.beatIntervals = [];
    this.beatHistory = [];
    this.rhythmConfidence = 0;
    this.tempoEstimate = 120;
  }
}
