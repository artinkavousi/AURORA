/**
 * AUDIO/core/enhanced-audio-analyzer.ts - Enhanced Audio Analysis System
 * 
 * Integrates groove intelligence, musical structure, and predictive timing
 * with expanded audio feature extraction
 */

import type { AudioData } from '../soundreactivity';
import { GrooveEngine, type GrooveState } from './groove-engine';
import { MusicalStructureAnalyzer, type MusicalStructureState } from './musical-structure';
import { PredictiveTimingSystem, type PredictiveTimingState } from './predictive-timing';

/**
 * Extended audio data with enhanced analysis
 */
export interface EnhancedAudioData extends AudioData {
  // Enhanced features
  groove: GrooveState;
  structure: MusicalStructureState;
  timing: PredictiveTimingState;
  
  // Genre classification (basic)
  estimatedGenre: string;
  genreConfidence: number;
}

/**
 * Genre classification result
 */
interface GenreClassification {
  genre: string;
  confidence: number;
  characteristics: {
    electronic: number;    // 0-1
    organic: number;       // 0-1
    rhythmic: number;      // 0-1
    melodic: number;       // 0-1
    aggressive: number;    // 0-1
    ambient: number;       // 0-1;
  };
}

/**
 * EnhancedAudioAnalyzer - Comprehensive audio analysis with groove intelligence
 */
export class EnhancedAudioAnalyzer {
  private grooveEngine: GrooveEngine;
  private structureAnalyzer: MusicalStructureAnalyzer;
  private predictiveTiming: PredictiveTimingSystem;
  
  // Genre classification state
  private genreCharacteristics = {
    electronic: 0,
    organic: 0,
    rhythmic: 0,
    melodic: 0,
    aggressive: 0,
    ambient: 0,
  };
  
  private lastBeatTime = 0;
  private beatCount = 0;
  
  constructor() {
    this.grooveEngine = new GrooveEngine();
    this.structureAnalyzer = new MusicalStructureAnalyzer();
    this.predictiveTiming = new PredictiveTimingSystem();
  }
  
  /**
   * Analyze audio data and add enhanced features
   */
  analyze(audioData: AudioData): EnhancedAudioData {
    // Register beats with all systems
    if (audioData.isBeat && audioData.time !== this.lastBeatTime) {
      const isDownbeat = this.beatCount % 4 === 0; // Simple downbeat detection
      
      this.grooveEngine.registerBeat(audioData.time, audioData.beatIntensity, isDownbeat);
      this.predictiveTiming.registerBeat(audioData.time, isDownbeat);
      
      this.lastBeatTime = audioData.time;
      this.beatCount++;
    }
    
    // Update tempo in all systems
    const tempo = audioData.features.tempo;
    this.grooveEngine.setTempo(tempo);
    this.predictiveTiming.setTempo(tempo);
    
    // Get enhanced analysis
    const groove = this.grooveEngine.getGrooveState();
    
    const structure = this.structureAnalyzer.update(
      audioData.time,
      audioData.smoothOverall,
      audioData.features.spectralFlux,
      audioData.beatIntensity,
      audioData.features.harmonicRatio,
      tempo
    );
    
    const timing = this.predictiveTiming.update(audioData.time);
    
    // Classify genre
    const genre = this.classifyGenre(audioData, groove, structure);
    
    // Return enhanced data
    return {
      ...audioData,
      groove,
      structure,
      timing,
      estimatedGenre: genre.genre,
      genreConfidence: genre.confidence,
    };
  }
  
  /**
   * Basic genre classification based on audio features
   */
  private classifyGenre(
    audioData: AudioData,
    groove: GrooveState,
    structure: MusicalStructureState
  ): GenreClassification {
    // Update characteristic estimates (smoothed over time)
    const smoothFactor = 0.95;
    
    // Electronic: high harmonic ratio, tight timing, digital artifacts
    const electronicScore = audioData.features.harmonicRatio * 0.4 +
                            groove.pocketTightness * 0.3 +
                            (1 - groove.microTimingVariance) * 0.3;
    
    this.genreCharacteristics.electronic = 
      this.genreCharacteristics.electronic * smoothFactor + electronicScore * (1 - smoothFactor);
    
    // Organic: micro-timing variance, swing, lower harmonic ratio
    const organicScore = groove.microTimingVariance * 0.4 +
                         groove.swingRatio * 0.3 +
                         (1 - audioData.features.harmonicRatio) * 0.3;
    
    this.genreCharacteristics.organic = 
      this.genreCharacteristics.organic * smoothFactor + organicScore * (1 - smoothFactor);
    
    // Rhythmic: strong groove, high beat intensity, syncopation
    const rhythmicScore = groove.grooveIntensity * 0.4 +
                          audioData.beatIntensity * 0.3 +
                          groove.syncopationLevel * 0.3;
    
    this.genreCharacteristics.rhythmic = 
      this.genreCharacteristics.rhythmic * smoothFactor + rhythmicScore * (1 - smoothFactor);
    
    // Melodic: high harmonic energy, low spectral flux
    const melodicScore = audioData.features.harmonicEnergy * 0.5 +
                         (1 - audioData.features.spectralFlux) * 0.5;
    
    this.genreCharacteristics.melodic = 
      this.genreCharacteristics.melodic * smoothFactor + melodicScore * (1 - smoothFactor);
    
    // Aggressive: high energy, high spectral flux, high onset
    const aggressiveScore = structure.energy.current * 0.3 +
                            audioData.features.spectralFlux * 0.4 +
                            audioData.features.onsetEnergy * 0.3;
    
    this.genreCharacteristics.aggressive = 
      this.genreCharacteristics.aggressive * smoothFactor + aggressiveScore * (1 - smoothFactor);
    
    // Ambient: low energy, low rhythm, high harmonic, slow changes
    const ambientScore = (1 - structure.energy.current) * 0.3 +
                         (1 - groove.grooveIntensity) * 0.3 +
                         audioData.features.harmonicRatio * 0.2 +
                         (1 - audioData.features.spectralFlux) * 0.2;
    
    this.genreCharacteristics.ambient = 
      this.genreCharacteristics.ambient * smoothFactor + ambientScore * (1 - smoothFactor);
    
    // Determine primary genre
    const chars = this.genreCharacteristics;
    const maxChar = Math.max(
      chars.electronic,
      chars.organic,
      chars.rhythmic,
      chars.melodic,
      chars.aggressive,
      chars.ambient
    );
    
    let genre = 'Unknown';
    let confidence = 0;
    
    // Genre classification rules
    if (chars.electronic > 0.6 && chars.rhythmic > 0.6 && chars.aggressive > 0.5) {
      genre = 'EDM/Dance';
      confidence = (chars.electronic + chars.rhythmic + chars.aggressive) / 3;
    } else if (chars.organic > 0.6 && chars.rhythmic > 0.5 && groove.swingRatio > 0.2) {
      genre = 'Jazz/Swing';
      confidence = (chars.organic + chars.rhythmic + groove.swingRatio) / 3;
    } else if (chars.ambient > 0.7 && chars.melodic > 0.5) {
      genre = 'Ambient/Drone';
      confidence = (chars.ambient + chars.melodic) / 2;
    } else if (chars.aggressive > 0.7 && chars.rhythmic > 0.6) {
      genre = 'Rock/Metal';
      confidence = (chars.aggressive + chars.rhythmic) / 2;
    } else if (chars.melodic > 0.6 && chars.harmonic > 0.5) {
      genre = 'Classical/Orchestral';
      confidence = (chars.melodic + audioData.features.harmonicRatio) / 2;
    } else if (chars.electronic > 0.5 && chars.ambient > 0.5) {
      genre = 'Electronic Ambient';
      confidence = (chars.electronic + chars.ambient) / 2;
    } else if (chars.rhythmic > 0.5) {
      genre = 'Rhythmic/Percussion';
      confidence = chars.rhythmic;
    } else {
      genre = 'Mixed/Unknown';
      confidence = 0.3;
    }
    
    return {
      genre,
      confidence: Math.min(confidence, 1.0),
      characteristics: { ...chars },
    };
  }
  
  /**
   * Get current groove state
   */
  getGrooveState(): GrooveState {
    return this.grooveEngine.getGrooveState();
  }
  
  /**
   * Get current structure state
   */
  getStructureState(): MusicalStructureState | null {
    return null; // Would need to store last state
  }
  
  /**
   * Get current timing state
   */
  getTimingState(): PredictiveTimingState | null {
    return null; // Would need to store last state
  }
  
  /**
   * Reset all analysis
   */
  reset(): void {
    this.grooveEngine.reset();
    this.structureAnalyzer.reset();
    this.predictiveTiming.reset();
    
    this.genreCharacteristics = {
      electronic: 0,
      organic: 0,
      rhythmic: 0,
      melodic: 0,
      aggressive: 0,
      ambient: 0,
    };
    
    this.lastBeatTime = 0;
    this.beatCount = 0;
  }
  
  /**
   * Dispose of resources
   */
  dispose(): void {
    // Clean up if needed
  }
}

