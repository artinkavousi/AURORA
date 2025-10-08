/**
 * AUDIO/kinetic/gesture-interpreter.ts - Gesture Selection & Interpretation
 * 
 * Analyzes audio features and selects appropriate gesture primitives
 * Maps audio state → gesture types with timing and intensity
 */

import * as THREE from "three/webgpu";
import type { EnhancedAudioData } from '../core/enhanced-audio-analyzer';
import { GestureFactory, type Gesture, type GestureParams } from './gesture-primitives';

/**
 * Active gesture instance with timing
 */
export interface ActiveGesture {
  gesture: Gesture;
  params: GestureParams;
  startTime: number;
  duration: number;
  priority: number;    // 0-1, higher = more important
  weight: number;      // 0-1, blending weight
}

/**
 * Gesture selection result
 */
export interface GestureSelection {
  primary: ActiveGesture | null;
  secondary: ActiveGesture[];  // Additional active gestures
  blendMode: 'replace' | 'additive' | 'multiplicative';
}

/**
 * GestureInterpreter - Maps audio features to gesture primitives
 */
export class GestureInterpreter {
  // Configuration
  private readonly maxSimultaneousGestures = 3;
  private readonly gestureMinDuration = 0.1;      // seconds
  private readonly gestureMaxDuration = 4.0;      // seconds
  
  // Active gestures
  private activeGestures: ActiveGesture[] = [];
  
  // Gesture history for pattern detection
  private recentGestures: string[] = [];
  private readonly historySize = 16;
  
  // Timing
  private currentTime = 0;
  private lastGestureTime = 0;
  
  constructor() {
    // Initialize
  }
  
  /**
   * Update and select gestures based on audio
   */
  update(audioData: EnhancedAudioData, deltaTime: number): GestureSelection {
    this.currentTime = audioData.time;
    
    // Update active gestures (age and remove expired)
    this.updateActiveGestures(deltaTime);
    
    // Detect new gestures from audio
    this.detectNewGestures(audioData);
    
    // Sort by priority
    this.activeGestures.sort((a, b) => b.priority - a.priority);
    
    // Trim to max simultaneous
    if (this.activeGestures.length > this.maxSimultaneousGestures) {
      this.activeGestures = this.activeGestures.slice(0, this.maxSimultaneousGestures);
    }
    
    // Calculate blend weights
    this.calculateBlendWeights();
    
    // Build selection
    const primary = this.activeGestures.length > 0 ? this.activeGestures[0] : null;
    const secondary = this.activeGestures.slice(1);
    const blendMode = this.determineBlendMode(audioData);
    
    return {
      primary,
      secondary,
      blendMode,
    };
  }
  
  /**
   * Update active gesture timing and phases
   */
  private updateActiveGestures(deltaTime: number): void {
    const now = this.currentTime;
    
    // Update phases and remove expired
    this.activeGestures = this.activeGestures.filter(ag => {
      const elapsed = now - ag.startTime;
      const phase = Math.min(elapsed / ag.duration, 1.0);
      ag.params.phase = phase;
      
      // Remove if complete
      return phase < 1.0;
    });
  }
  
  /**
   * Detect new gestures from audio analysis
   */
  private detectNewGestures(audioData: EnhancedAudioData): void {
    const timeSinceLastGesture = this.currentTime - this.lastGestureTime;
    
    // Don't spawn too frequently
    if (timeSinceLastGesture < 0.05) {
      return;
    }
    
    // ATTACK: Sharp onset with high energy
    if (audioData.features.onsetEnergy > 0.7 && audioData.isBeat) {
      this.spawnGesture('attack', audioData, {
        intensity: audioData.beatIntensity,
        duration: 0.3,
        priority: 0.9,
      });
    }
    
    // SWELL: Building tension detected by structure analyzer
    else if (audioData.structure.tension.isBuilding && audioData.structure.tension.anticipation > 0.6) {
      // Only start if not already active
      if (!this.isGestureActive('swell')) {
        this.spawnGesture('swell', audioData, {
          intensity: audioData.structure.tension.anticipation,
          duration: 1.5,
          priority: 0.8,
        });
      }
    }
    
    // RELEASE: Tension releasing
    else if (audioData.structure.tension.isReleasing && !this.isGestureActive('release')) {
      this.spawnGesture('release', audioData, {
        intensity: 0.8,
        duration: 1.0,
        priority: 0.7,
      });
    }
    
    // ACCENT: Downbeat prediction
    else if (audioData.timing.nextDownbeat && audioData.timing.nextDownbeat.timeUntil < 0.2 && audioData.timing.nextDownbeat.timeUntil > 0) {
      this.spawnGesture('accent', audioData, {
        intensity: audioData.timing.nextDownbeat.confidence,
        duration: 0.25,
        priority: 0.85,
      });
    }
    
    // SUSTAIN: Sustained energy with low flux
    else if (audioData.smoothOverall > 0.5 && audioData.features.spectralFlux < 0.3 && !this.isGestureActive('sustain')) {
      this.spawnGesture('sustain', audioData, {
        intensity: audioData.smoothOverall,
        duration: 2.0,
        priority: 0.5,
      });
    }
    
    // BREATH: Rhythmic breathing pattern from groove
    else if (audioData.groove.grooveIntensity > 0.6 && audioData.features.rhythmConfidence > 0.7) {
      // Cycle with tempo
      const breathCycle = (60.0 / audioData.features.tempo) * 4; // 4 beats
      if (!this.isGestureActive('breath') && timeSinceLastGesture > breathCycle * 0.5) {
        this.spawnGesture('breath', audioData, {
          intensity: audioData.groove.grooveIntensity,
          duration: breathCycle,
          priority: 0.6,
        });
      }
    }
  }
  
  /**
   * Spawn a new gesture
   */
  private spawnGesture(
    gestureName: string,
    audioData: EnhancedAudioData,
    options: { intensity: number; duration: number; priority: number }
  ): void {
    const gesture = GestureFactory.getGesture(gestureName);
    if (!gesture) {
      console.warn(`Gesture "${gestureName}" not found`);
      return;
    }
    
    // Create gesture parameters
    const params: GestureParams = {
      ...gesture.getDefaultParams(),
      intensity: options.intensity,
      phase: 0,
      epicenter: new THREE.Vector3(0, 0, 0), // Will be set by ensemble coordinator
      radius: 30.0,
      direction: new THREE.Vector3(0, 1, 0), // Will be set by ensemble coordinator
      tempo: audioData.features.tempo,
    };
    
    // Create active gesture
    const activeGesture: ActiveGesture = {
      gesture,
      params,
      startTime: this.currentTime,
      duration: THREE.MathUtils.clamp(options.duration, this.gestureMinDuration, this.gestureMaxDuration),
      priority: options.priority,
      weight: 1.0,
    };
    
    this.activeGestures.push(activeGesture);
    this.lastGestureTime = this.currentTime;
    
    // Add to history
    this.recentGestures.push(gestureName);
    if (this.recentGestures.length > this.historySize) {
      this.recentGestures.shift();
    }
    
    console.log(`🎭 Gesture: ${gestureName} (intensity: ${options.intensity.toFixed(2)}, duration: ${options.duration.toFixed(2)}s)`);
  }
  
  /**
   * Check if a gesture type is currently active
   */
  private isGestureActive(gestureName: string): boolean {
    return this.activeGestures.some(ag => ag.gesture.name.toLowerCase() === gestureName.toLowerCase());
  }
  
  /**
   * Calculate blend weights for multiple gestures
   */
  private calculateBlendWeights(): void {
    if (this.activeGestures.length === 0) {
      return;
    }
    
    // Calculate total priority
    const totalPriority = this.activeGestures.reduce((sum, ag) => sum + ag.priority, 0);
    
    if (totalPriority === 0) {
      return;
    }
    
    // Normalize weights based on priority
    for (const ag of this.activeGestures) {
      ag.weight = ag.priority / totalPriority;
    }
    
    // Apply phase-based envelope to weights
    for (const ag of this.activeGestures) {
      const phase = ag.params.phase;
      
      // Fade in at start, fade out at end
      let envelope = 1.0;
      if (phase < 0.1) {
        envelope = phase / 0.1; // Fade in
      } else if (phase > 0.9) {
        envelope = (1.0 - phase) / 0.1; // Fade out
      }
      
      ag.weight *= envelope;
    }
    
    // Re-normalize after envelope
    const totalWeight = this.activeGestures.reduce((sum, ag) => sum + ag.weight, 0);
    if (totalWeight > 0) {
      for (const ag of this.activeGestures) {
        ag.weight /= totalWeight;
      }
    }
  }
  
  /**
   * Determine blend mode based on audio characteristics
   */
  private determineBlendMode(audioData: EnhancedAudioData): 'replace' | 'additive' | 'multiplicative' {
    // Additive for high energy, chaotic sections
    if (audioData.smoothOverall > 0.7 && audioData.features.spectralFlux > 0.6) {
      return 'additive';
    }
    
    // Multiplicative for smooth, flowing sections
    if (audioData.features.harmonicRatio > 0.7 && audioData.features.spectralFlux < 0.3) {
      return 'multiplicative';
    }
    
    // Replace for clear, distinct gestures
    return 'replace';
  }
  
  /**
   * Get all active gestures
   */
  getActiveGestures(): ActiveGesture[] {
    return [...this.activeGestures];
  }
  
  /**
   * Get gesture history
   */
  getGestureHistory(): string[] {
    return [...this.recentGestures];
  }
  
  /**
   * Force trigger a specific gesture
   */
  triggerGesture(
    gestureName: string,
    intensity: number = 1.0,
    duration: number = 1.0,
    priority: number = 0.9
  ): void {
    // Create dummy audio data for manual trigger
    const dummyAudioData = {
      features: { tempo: 120 },
      time: this.currentTime,
    } as EnhancedAudioData;
    
    this.spawnGesture(gestureName, dummyAudioData, {
      intensity,
      duration,
      priority,
    });
  }
  
  /**
   * Clear all active gestures
   */
  clear(): void {
    this.activeGestures = [];
  }
  
  /**
   * Reset interpreter
   */
  reset(): void {
    this.activeGestures = [];
    this.recentGestures = [];
    this.currentTime = 0;
    this.lastGestureTime = 0;
  }
}

