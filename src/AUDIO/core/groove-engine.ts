/**
 * AUDIO/core/groove-engine.ts - Groove Intelligence Engine
 * 
 * Analyzes micro-timing, swing, rhythmic patterns to understand musical "feel"
 * Goes beyond simple beat detection to capture groove, pocket, and rhythmic nuance
 */

import * as THREE from "three/webgpu";

/**
 * Groove state containing rhythmic feel analysis
 */
export interface GrooveState {
  // Swing & Timing
  swingRatio: number;           // 0=straight, 0.1-0.3=swing, 0.5+=heavy shuffle
  microTimingVariance: number;  // Deviation from perfect timing (human feel)
  timingConsistency: number;    // 0-1, how consistent the timing is
  
  // Rhythmic Pattern
  rhythmicDensity: number;      // Hits per beat (0-1+)
  syncopationLevel: number;     // Off-beat emphasis (0-1)
  polyrhythmDetected: boolean;  // Multiple simultaneous rhythms
  
  // Groove Feel
  grooveIntensity: number;      // Overall groove strength (0-1)
  pocketTightness: number;      // How "tight" the groove is (0-1)
  drivingForce: number;         // Forward momentum (0-1)
  
  // Confidence
  analysisConfidence: number;   // How confident we are (0-1)
  sampleSize: number;           // Number of beats analyzed
}

/**
 * Beat timing data for groove analysis
 */
interface BeatTiming {
  time: number;           // Absolute time of beat
  intensity: number;      // Beat strength (0-1)
  isDownbeat: boolean;    // Is this a downbeat (1, 3, etc.)?
  ioi: number;           // Inter-onset interval to next beat
}

/**
 * Rhythmic pattern structure
 */
interface RhythmicPattern {
  intervals: number[];    // Sequence of IOIs
  strength: number;       // How strong/repeating the pattern is
  offset: number;         // Phase offset from downbeat
}

/**
 * GrooveEngine - Analyzes and understands rhythmic feel
 */
export class GrooveEngine {
  // Configuration
  private readonly maxHistorySize = 128;      // Max beats to remember
  private readonly minBeatsForAnalysis = 8;   // Min beats needed
  private readonly patternDetectionWindow = 16; // Beats to check for patterns
  
  // Beat history
  private beatHistory: BeatTiming[] = [];
  private lastBeatTime = 0;
  
  // Analysis state
  private currentGroove: GrooveState;
  private detectedPatterns: RhythmicPattern[] = [];
  
  // Smoothing
  private readonly smoothingFactor = 0.7;
  
  // Tempo estimation
  private estimatedTempo = 120;
  private beatsPerMeasure = 4;
  private beatsSinceLastDownbeat = 0;
  
  constructor() {
    this.currentGroove = this.getEmptyGrooveState();
  }
  
  /**
   * Register a detected beat for groove analysis
   */
  registerBeat(time: number, intensity: number, isDownbeat: boolean = false): void {
    // Calculate inter-onset interval
    const ioi = this.lastBeatTime > 0 ? time - this.lastBeatTime : 0;
    
    // Add to history
    this.beatHistory.push({
      time,
      intensity,
      isDownbeat,
      ioi,
    });
    
    // Trim history
    if (this.beatHistory.length > this.maxHistorySize) {
      this.beatHistory.shift();
    }
    
    this.lastBeatTime = time;
    this.beatsSinceLastDownbeat = isDownbeat ? 0 : this.beatsSinceLastDownbeat + 1;
    
    // Update analysis if we have enough data
    if (this.beatHistory.length >= this.minBeatsForAnalysis) {
      this.analyzeGroove();
    }
  }
  
  /**
   * Main groove analysis routine
   */
  private analyzeGroove(): void {
    if (this.beatHistory.length < this.minBeatsForAnalysis) {
      return;
    }
    
    // Calculate various groove metrics
    const swingRatio = this.calculateSwingRatio();
    const microTiming = this.analyzeMicroTiming();
    const rhythmicDensity = this.calculateRhythmicDensity();
    const syncopation = this.detectSyncopation();
    const grooveFeel = this.assessGrooveFeel();
    
    // Detect patterns
    this.detectRhythmicPatterns();
    
    // Update state with smoothing
    const target: GrooveState = {
      swingRatio: swingRatio.ratio,
      microTimingVariance: microTiming.variance,
      timingConsistency: microTiming.consistency,
      
      rhythmicDensity,
      syncopationLevel: syncopation,
      polyrhythmDetected: this.detectedPatterns.length > 1,
      
      grooveIntensity: grooveFeel.intensity,
      pocketTightness: grooveFeel.tightness,
      drivingForce: grooveFeel.drive,
      
      analysisConfidence: this.calculateConfidence(),
      sampleSize: this.beatHistory.length,
    };
    
    // Smooth transition
    this.currentGroove = this.smoothGrooveState(this.currentGroove, target);
  }
  
  /**
   * Calculate swing ratio (triplet feel vs straight)
   */
  private calculateSwingRatio(): { ratio: number; confidence: number } {
    if (this.beatHistory.length < 4) {
      return { ratio: 0, confidence: 0 };
    }
    
    // Group beats into pairs (downbeat + upbeat)
    const pairs: number[][] = [];
    for (let i = 0; i < this.beatHistory.length - 1; i += 2) {
      if (i + 1 < this.beatHistory.length) {
        pairs.push([
          this.beatHistory[i].ioi,
          this.beatHistory[i + 1].ioi,
        ]);
      }
    }
    
    if (pairs.length < 2) {
      return { ratio: 0, confidence: 0 };
    }
    
    // Calculate average ratio of odd/even beats
    let ratioSum = 0;
    let ratioCount = 0;
    
    for (const [ioi1, ioi2] of pairs) {
      if (ioi1 > 0 && ioi2 > 0) {
        // Swing ratio = (long beat / short beat) - 1
        const ratio = (ioi1 / ioi2) - 1.0;
        ratioSum += Math.abs(ratio); // Use absolute for bidirectional swing
        ratioCount++;
      }
    }
    
    if (ratioCount === 0) {
      return { ratio: 0, confidence: 0 };
    }
    
    const avgRatio = ratioSum / ratioCount;
    
    // Calculate consistency (confidence)
    let variance = 0;
    for (const [ioi1, ioi2] of pairs) {
      if (ioi1 > 0 && ioi2 > 0) {
        const ratio = Math.abs((ioi1 / ioi2) - 1.0);
        variance += Math.pow(ratio - avgRatio, 2);
      }
    }
    variance /= ratioCount;
    
    const confidence = 1.0 / (1.0 + variance * 10); // Lower variance = higher confidence
    
    return {
      ratio: THREE.MathUtils.clamp(avgRatio, 0, 1),
      confidence: THREE.MathUtils.clamp(confidence, 0, 1),
    };
  }
  
  /**
   * Analyze micro-timing (deviation from perfect grid)
   */
  private analyzeMicroTiming(): { variance: number; consistency: number } {
    if (this.beatHistory.length < 4) {
      return { variance: 0, consistency: 1 };
    }
    
    // Calculate expected IOI from tempo
    const expectedIOI = 60.0 / this.estimatedTempo;
    
    // Measure deviation from expected
    const deviations: number[] = [];
    for (const beat of this.beatHistory) {
      if (beat.ioi > 0) {
        const deviation = Math.abs(beat.ioi - expectedIOI) / expectedIOI;
        deviations.push(deviation);
      }
    }
    
    if (deviations.length === 0) {
      return { variance: 0, consistency: 1 };
    }
    
    // Calculate mean and variance
    const mean = deviations.reduce((a, b) => a + b, 0) / deviations.length;
    const variance = deviations.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / deviations.length;
    
    // Consistency = inverse of variance
    const consistency = 1.0 / (1.0 + variance * 20);
    
    return {
      variance: THREE.MathUtils.clamp(mean, 0, 1),
      consistency: THREE.MathUtils.clamp(consistency, 0, 1),
    };
  }
  
  /**
   * Calculate rhythmic density (hits per beat)
   */
  private calculateRhythmicDensity(): number {
    if (this.beatHistory.length < 2) {
      return 0;
    }
    
    // Simple metric: average intensity weighted by timing consistency
    const avgIntensity = this.beatHistory.reduce((sum, beat) => sum + beat.intensity, 0) / this.beatHistory.length;
    
    // More beats with high intensity = higher density
    return THREE.MathUtils.clamp(avgIntensity, 0, 1);
  }
  
  /**
   * Detect syncopation (off-beat emphasis)
   */
  private detectSyncopation(): number {
    if (this.beatHistory.length < 8) {
      return 0;
    }
    
    // Compare intensity of downbeats vs upbeats
    let downbeatIntensity = 0;
    let upbeatIntensity = 0;
    let downbeatCount = 0;
    let upbeatCount = 0;
    
    for (const beat of this.beatHistory) {
      if (beat.isDownbeat) {
        downbeatIntensity += beat.intensity;
        downbeatCount++;
      } else {
        upbeatIntensity += beat.intensity;
        upbeatCount++;
      }
    }
    
    if (downbeatCount === 0 || upbeatCount === 0) {
      return 0;
    }
    
    const downbeatAvg = downbeatIntensity / downbeatCount;
    const upbeatAvg = upbeatIntensity / upbeatCount;
    
    // Syncopation = when upbeats are as strong or stronger than downbeats
    const syncopation = upbeatAvg / (downbeatAvg + 0.001); // Avoid division by zero
    
    return THREE.MathUtils.clamp(syncopation, 0, 1);
  }
  
  /**
   * Assess overall groove feel
   */
  private assessGrooveFeel(): { intensity: number; tightness: number; drive: number } {
    if (this.beatHistory.length < 4) {
      return { intensity: 0, tightness: 0, drive: 0 };
    }
    
    // Intensity = combination of rhythmic density and syncopation
    const intensity = (this.calculateRhythmicDensity() * 0.6 + this.detectSyncopation() * 0.4);
    
    // Tightness = timing consistency
    const microTiming = this.analyzeMicroTiming();
    const tightness = microTiming.consistency;
    
    // Drive = forward momentum (increasing intensity over time)
    let momentumSum = 0;
    for (let i = 1; i < this.beatHistory.length; i++) {
      const intensityDiff = this.beatHistory[i].intensity - this.beatHistory[i - 1].intensity;
      momentumSum += intensityDiff;
    }
    const drive = THREE.MathUtils.clamp((momentumSum / this.beatHistory.length) + 0.5, 0, 1);
    
    return { intensity, tightness, drive };
  }
  
  /**
   * Detect repeating rhythmic patterns
   */
  private detectRhythmicPatterns(): void {
    if (this.beatHistory.length < this.patternDetectionWindow) {
      return;
    }
    
    // Simple pattern detection: look for repeating IOI sequences
    const recentBeats = this.beatHistory.slice(-this.patternDetectionWindow);
    const intervals = recentBeats.map(b => b.ioi).filter(ioi => ioi > 0);
    
    if (intervals.length < 4) {
      return;
    }
    
    // Check for 2-beat, 4-beat, and 8-beat patterns
    const patternLengths = [2, 4, 8];
    this.detectedPatterns = [];
    
    for (const length of patternLengths) {
      if (intervals.length >= length * 2) {
        const pattern = intervals.slice(0, length);
        const repeat = intervals.slice(length, length * 2);
        
        // Calculate similarity
        let similarity = 0;
        for (let i = 0; i < length; i++) {
          const diff = Math.abs(pattern[i] - repeat[i]) / pattern[i];
          similarity += 1.0 - Math.min(diff, 1.0);
        }
        similarity /= length;
        
        if (similarity > 0.7) { // 70% similar = pattern detected
          this.detectedPatterns.push({
            intervals: pattern,
            strength: similarity,
            offset: 0,
          });
        }
      }
    }
  }
  
  /**
   * Calculate overall analysis confidence
   */
  private calculateConfidence(): number {
    // Confidence increases with sample size and timing consistency
    const sampleFactor = Math.min(this.beatHistory.length / this.maxHistorySize, 1.0);
    const microTiming = this.analyzeMicroTiming();
    const consistencyFactor = microTiming.consistency;
    
    return (sampleFactor * 0.4 + consistencyFactor * 0.6);
  }
  
  /**
   * Smooth transition between groove states
   */
  private smoothGrooveState(current: GrooveState, target: GrooveState): GrooveState {
    const lerp = (a: number, b: number, t: number) => a * t + b * (1 - t);
    
    return {
      swingRatio: lerp(target.swingRatio, current.swingRatio, this.smoothingFactor),
      microTimingVariance: lerp(target.microTimingVariance, current.microTimingVariance, this.smoothingFactor),
      timingConsistency: lerp(target.timingConsistency, current.timingConsistency, this.smoothingFactor),
      
      rhythmicDensity: lerp(target.rhythmicDensity, current.rhythmicDensity, this.smoothingFactor),
      syncopationLevel: lerp(target.syncopationLevel, current.syncopationLevel, this.smoothingFactor),
      polyrhythmDetected: target.polyrhythmDetected,
      
      grooveIntensity: lerp(target.grooveIntensity, current.grooveIntensity, this.smoothingFactor),
      pocketTightness: lerp(target.pocketTightness, current.pocketTightness, this.smoothingFactor),
      drivingForce: lerp(target.drivingForce, current.drivingForce, this.smoothingFactor),
      
      analysisConfidence: lerp(target.analysisConfidence, current.analysisConfidence, this.smoothingFactor),
      sampleSize: target.sampleSize,
    };
  }
  
  /**
   * Get current groove state
   */
  getGrooveState(): GrooveState {
    return { ...this.currentGroove };
  }
  
  /**
   * Get detected patterns
   */
  getDetectedPatterns(): RhythmicPattern[] {
    return [...this.detectedPatterns];
  }
  
  /**
   * Update tempo estimate
   */
  setTempo(bpm: number, beatsPerMeasure: number = 4): void {
    this.estimatedTempo = THREE.MathUtils.clamp(bpm, 40, 200);
    this.beatsPerMeasure = THREE.MathUtils.clamp(beatsPerMeasure, 2, 8);
  }
  
  /**
   * Reset analysis
   */
  reset(): void {
    this.beatHistory = [];
    this.lastBeatTime = 0;
    this.detectedPatterns = [];
    this.currentGroove = this.getEmptyGrooveState();
    this.beatsSinceLastDownbeat = 0;
  }
  
  /**
   * Get empty groove state
   */
  private getEmptyGrooveState(): GrooveState {
    return {
      swingRatio: 0,
      microTimingVariance: 0,
      timingConsistency: 1,
      rhythmicDensity: 0,
      syncopationLevel: 0,
      polyrhythmDetected: false,
      grooveIntensity: 0,
      pocketTightness: 0,
      drivingForce: 0,
      analysisConfidence: 0,
      sampleSize: 0,
    };
  }
}

