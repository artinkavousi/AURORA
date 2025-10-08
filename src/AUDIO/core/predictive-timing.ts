/**
 * AUDIO/core/predictive-timing.ts - Predictive Beat Timing System
 * 
 * Predicts when beats and downbeats will occur in the future,
 * enabling anticipatory motion and visual preparation
 */

import * as THREE from "three/webgpu";

/**
 * Predicted beat event
 */
export interface PredictedBeat {
  time: number;           // Predicted time (seconds)
  isDownbeat: boolean;    // Is this a downbeat?
  beatNumber: number;     // Beat number in measure (1, 2, 3, 4...)
  confidence: number;     // Prediction confidence (0-1)
  timeUntil: number;      // Seconds until this beat
}

/**
 * Anticipation window for different gesture types
 */
export interface AnticipationWindow {
  swell: number;          // How early to start swell gesture (ms)
  attack: number;         // How early to start attack preparation (ms)
  accent: number;         // How early to emphasize accent (ms)
  breath: number;         // Breath cycle anticipation (ms)
}

/**
 * Predictive timing state
 */
export interface PredictiveTimingState {
  nextBeat: PredictedBeat | null;
  nextDownbeat: PredictedBeat | null;
  upcomingBeats: PredictedBeat[];  // Next 4 beats
  
  anticipation: AnticipationWindow;
  
  tempo: number;              // Current tempo (BPM)
  beatsPerMeasure: number;    // Time signature numerator
  beatPhase: number;          // Current phase in beat cycle (0-1)
  measurePhase: number;       // Current phase in measure (0-1)
  
  tempoStable: boolean;       // Is tempo stable enough for prediction?
  confidence: number;         // Overall prediction confidence (0-1)
}

/**
 * Beat timing record for tempo estimation
 */
interface BeatRecord {
  time: number;
  ioi: number;  // Inter-onset interval
}

/**
 * PredictiveTimingSystem - Predicts future beats for anticipatory motion
 */
export class PredictiveTimingSystem {
  // Configuration
  private readonly beatHistorySize = 32;
  private readonly minBeatsForPrediction = 4;
  
  // Tempo tracking
  private beatHistory: BeatRecord[] = [];
  private estimatedTempo = 120;
  private beatsPerMeasure = 4;
  private tempoVariance = 0;
  
  // Beat tracking
  private lastBeatTime = 0;
  private beatNumberInMeasure = 0;
  
  // Anticipation windows (milliseconds)
  private anticipation: AnticipationWindow = {
    swell: 400,      // Start swell 400ms before peak
    attack: 50,      // Start attack prep 50ms before hit
    accent: 200,     // Emphasize 200ms before downbeat
    breath: 300,     // Breath cycle anticipation
  };
  
  // Prediction state
  private currentTime = 0;
  private predictionCache: PredictedBeat[] = [];
  private cacheTime = 0;
  
  constructor() {
    // Initialize with default tempo
    this.updateAnticipationWindows();
  }
  
  /**
   * Register a detected beat
   */
  registerBeat(time: number, isDownbeat: boolean = false): void {
    // Calculate IOI
    const ioi = this.lastBeatTime > 0 ? time - this.lastBeatTime : 0;
    
    // Add to history
    if (ioi > 0) {
      this.beatHistory.push({ time, ioi });
      
      // Trim history
      if (this.beatHistory.length > this.beatHistorySize) {
        this.beatHistory.shift();
      }
    }
    
    this.lastBeatTime = time;
    
    // Update beat number
    if (isDownbeat) {
      this.beatNumberInMeasure = 1;
    } else {
      this.beatNumberInMeasure++;
      if (this.beatNumberInMeasure > this.beatsPerMeasure) {
        this.beatNumberInMeasure = 1;
      }
    }
    
    // Re-estimate tempo
    if (this.beatHistory.length >= this.minBeatsForPrediction) {
      this.estimateTempo();
      this.updateAnticipationWindows();
    }
    
    // Invalidate prediction cache
    this.predictionCache = [];
  }
  
  /**
   * Update current time and get predictions
   */
  update(currentTime: number): PredictiveTimingState {
    this.currentTime = currentTime;
    
    // Regenerate predictions if cache is stale
    if (this.predictionCache.length === 0 || currentTime - this.cacheTime > 0.1) {
      this.generatePredictions(currentTime);
      this.cacheTime = currentTime;
    }
    
    // Find next beat and downbeat
    const upcoming = this.predictionCache.filter(beat => beat.time > currentTime);
    const nextBeat = upcoming.length > 0 ? upcoming[0] : null;
    const nextDownbeat = upcoming.find(beat => beat.isDownbeat) || null;
    
    // Calculate phases
    const beatDuration = 60.0 / this.estimatedTempo;
    const measureDuration = beatDuration * this.beatsPerMeasure;
    
    let beatPhase = 0;
    let measurePhase = 0;
    
    if (this.lastBeatTime > 0 && beatDuration > 0) {
      const timeSinceLastBeat = currentTime - this.lastBeatTime;
      beatPhase = (timeSinceLastBeat / beatDuration) % 1.0;
      
      const beatsSinceDownbeat = (this.beatNumberInMeasure - 1) + beatPhase;
      measurePhase = (beatsSinceDownbeat / this.beatsPerMeasure) % 1.0;
    }
    
    // Check tempo stability
    const tempoStable = this.isTempoStable();
    const confidence = this.calculateConfidence();
    
    return {
      nextBeat,
      nextDownbeat,
      upcomingBeats: upcoming.slice(0, 4),
      
      anticipation: { ...this.anticipation },
      
      tempo: this.estimatedTempo,
      beatsPerMeasure: this.beatsPerMeasure,
      beatPhase,
      measurePhase,
      
      tempoStable,
      confidence,
    };
  }
  
  /**
   * Estimate current tempo from beat history
   */
  private estimateTempo(): void {
    if (this.beatHistory.length < this.minBeatsForPrediction) {
      return;
    }
    
    // Calculate mean IOI
    const iois = this.beatHistory.map(b => b.ioi);
    const meanIOI = iois.reduce((a, b) => a + b, 0) / iois.length;
    
    // Calculate variance
    const variance = iois.reduce((sum, ioi) => sum + Math.pow(ioi - meanIOI, 2), 0) / iois.length;
    this.tempoVariance = variance;
    
    // Convert IOI to BPM
    if (meanIOI > 0) {
      const bpm = 60.0 / meanIOI;
      this.estimatedTempo = THREE.MathUtils.clamp(bpm, 40, 200);
    }
  }
  
  /**
   * Check if tempo is stable enough for reliable predictions
   */
  private isTempoStable(): boolean {
    if (this.beatHistory.length < this.minBeatsForPrediction) {
      return false;
    }
    
    // Calculate coefficient of variation
    const iois = this.beatHistory.map(b => b.ioi);
    const mean = iois.reduce((a, b) => a + b, 0) / iois.length;
    const stdDev = Math.sqrt(this.tempoVariance);
    const cv = stdDev / mean;
    
    // Stable if CV < 0.1 (10% variation)
    return cv < 0.1;
  }
  
  /**
   * Calculate prediction confidence
   */
  private calculateConfidence(): number {
    if (this.beatHistory.length < this.minBeatsForPrediction) {
      return 0;
    }
    
    // Factors:
    // 1. Sample size
    const sampleFactor = Math.min(this.beatHistory.length / this.beatHistorySize, 1.0);
    
    // 2. Tempo stability
    const stabilityFactor = this.isTempoStable() ? 1.0 : 0.3;
    
    // 3. Recency (how recent was last beat?)
    const timeSinceLastBeat = this.currentTime - this.lastBeatTime;
    const beatDuration = 60.0 / this.estimatedTempo;
    const recencyFactor = THREE.MathUtils.clamp(1.0 - (timeSinceLastBeat / (beatDuration * 2)), 0, 1);
    
    return sampleFactor * 0.3 + stabilityFactor * 0.5 + recencyFactor * 0.2;
  }
  
  /**
   * Generate predictions for upcoming beats
   */
  private generatePredictions(currentTime: number): void {
    if (this.beatHistory.length < this.minBeatsForPrediction) {
      this.predictionCache = [];
      return;
    }
    
    const beatDuration = 60.0 / this.estimatedTempo;
    const predictions: PredictedBeat[] = [];
    const confidence = this.calculateConfidence();
    
    // Predict next 8 beats
    let predictTime = this.lastBeatTime;
    let beatNum = this.beatNumberInMeasure;
    
    for (let i = 0; i < 8; i++) {
      predictTime += beatDuration;
      beatNum++;
      
      if (beatNum > this.beatsPerMeasure) {
        beatNum = 1;
      }
      
      const isDownbeat = beatNum === 1;
      const timeUntil = predictTime - currentTime;
      
      // Only include future beats
      if (timeUntil > 0) {
        predictions.push({
          time: predictTime,
          isDownbeat,
          beatNumber: beatNum,
          confidence,
          timeUntil,
        });
      }
    }
    
    this.predictionCache = predictions;
  }
  
  /**
   * Check if we should anticipate a specific beat type
   */
  shouldAnticipate(beatType: keyof AnticipationWindow): boolean {
    if (this.predictionCache.length === 0 || !this.isTempoStable()) {
      return false;
    }
    
    const anticipationWindow = this.anticipation[beatType] / 1000; // Convert to seconds
    
    // Check if any predicted beat is within anticipation window
    for (const beat of this.predictionCache) {
      if (beat.timeUntil <= anticipationWindow && beat.timeUntil > 0) {
        // For downbeat-specific anticipation (like swell), only trigger for downbeats
        if (beatType === 'swell' || beatType === 'accent') {
          return beat.isDownbeat;
        }
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Get time until next predicted event
   */
  getTimeUntilNextBeat(): number {
    if (this.predictionCache.length === 0) {
      return Infinity;
    }
    
    const nextBeat = this.predictionCache.find(beat => beat.time > this.currentTime);
    return nextBeat ? nextBeat.timeUntil : Infinity;
  }
  
  /**
   * Get time until next downbeat
   */
  getTimeUntilNextDownbeat(): number {
    if (this.predictionCache.length === 0) {
      return Infinity;
    }
    
    const nextDownbeat = this.predictionCache.find(beat => beat.isDownbeat && beat.time > this.currentTime);
    return nextDownbeat ? nextDownbeat.timeUntil : Infinity;
  }
  
  /**
   * Update anticipation windows based on tempo
   */
  private updateAnticipationWindows(): void {
    const beatDuration = (60.0 / this.estimatedTempo) * 1000; // In milliseconds
    
    // Scale anticipation windows based on tempo
    // Faster tempo = shorter anticipation
    // Slower tempo = longer anticipation
    
    const tempoFactor = THREE.MathUtils.clamp(120 / this.estimatedTempo, 0.5, 2.0);
    
    this.anticipation = {
      swell: THREE.MathUtils.clamp(beatDuration * 0.6 * tempoFactor, 200, 800),
      attack: THREE.MathUtils.clamp(beatDuration * 0.08 * tempoFactor, 30, 100),
      accent: THREE.MathUtils.clamp(beatDuration * 0.3 * tempoFactor, 100, 400),
      breath: THREE.MathUtils.clamp(beatDuration * 0.4 * tempoFactor, 150, 600),
    };
  }
  
  /**
   * Manually set tempo
   */
  setTempo(bpm: number, beatsPerMeasure: number = 4): void {
    this.estimatedTempo = THREE.MathUtils.clamp(bpm, 40, 200);
    this.beatsPerMeasure = THREE.MathUtils.clamp(beatsPerMeasure, 2, 8);
    this.updateAnticipationWindows();
    
    // Invalidate predictions
    this.predictionCache = [];
  }
  
  /**
   * Manually set beat number in measure (for manual downbeat alignment)
   */
  setBeatNumber(beatNumber: number): void {
    this.beatNumberInMeasure = THREE.MathUtils.clamp(beatNumber, 1, this.beatsPerMeasure);
  }
  
  /**
   * Reset the system
   */
  reset(): void {
    this.beatHistory = [];
    this.lastBeatTime = 0;
    this.beatNumberInMeasure = 0;
    this.predictionCache = [];
    this.cacheTime = 0;
    this.tempoVariance = 0;
  }
}

