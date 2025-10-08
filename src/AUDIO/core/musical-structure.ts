/**
 * AUDIO/core/musical-structure.ts - Musical Structure Analyzer
 * 
 * Detects musical sections (intro, verse, chorus, bridge, outro),
 * energy trajectories, tension/release patterns, and phrase boundaries
 */

import * as THREE from "three/webgpu";

/**
 * Musical section types
 */
export enum SectionType {
  UNKNOWN = 'unknown',
  INTRO = 'intro',
  VERSE = 'verse',
  CHORUS = 'chorus',
  BRIDGE = 'bridge',
  BREAKDOWN = 'breakdown',
  BUILD_UP = 'build_up',
  DROP = 'drop',
  OUTRO = 'outro',
}

/**
 * Section information
 */
export interface MusicSection {
  type: SectionType;
  startTime: number;
  duration: number;
  energy: number;        // Average energy level (0-1)
  confidence: number;    // Detection confidence (0-1)
}

/**
 * Energy trajectory over time
 */
export interface EnergyTrajectory {
  current: number;           // Current energy (0-1)
  trend: number;             // Rising (+1) or falling (-1)
  trendStrength: number;     // How strong the trend is (0-1)
  peakRecent: number;        // Recent peak energy
  valleyRecent: number;      // Recent valley energy
  dynamicRange: number;      // Difference between peak and valley
}

/**
 * Tension/Release state
 */
export interface TensionState {
  tension: number;           // Current tension level (0-1)
  isBuilding: boolean;       // Is tension building?
  isReleasing: boolean;      // Is tension releasing?
  lastPeakTime: number;      // Time of last tension peak
  timeSincePeak: number;     // Seconds since last peak
  anticipation: number;      // Anticipatory tension (0-1)
}

/**
 * Musical structure state
 */
export interface MusicalStructureState {
  currentSection: MusicSection;
  previousSection: MusicSection | null;
  sectionProgress: number;        // 0-1 progress through current section
  
  energy: EnergyTrajectory;
  tension: TensionState;
  
  phraseBoundaryDetected: boolean;
  timeSinceLastPhrase: number;
  
  analysisTime: number;
  totalDuration: number;
}

/**
 * MusicalStructureAnalyzer - Detects and tracks musical structure
 */
export class MusicalStructureAnalyzer {
  // Configuration
  private readonly energyHistorySize = 300;    // 10 seconds @ 30fps
  private readonly sectionMinDuration = 4.0;   // Min section length (seconds)
  private readonly sectionMaxDuration = 32.0;  // Max section length (seconds)
  
  // Energy tracking
  private energyHistory: Array<{ time: number; energy: number }> = [];
  private currentEnergy = 0;
  
  // Section tracking
  private sections: MusicSection[] = [];
  private currentSection: MusicSection;
  private sectionStartTime = 0;
  
  // Tension tracking
  private tensionHistory: number[] = [];
  private lastTensionPeak = 0;
  private lastTensionPeakTime = 0;
  
  // Phrase tracking
  private lastPhraseBoundaryTime = 0;
  private phraseLength = 8.0; // Default: 8 beats ≈ 4 seconds @ 120 BPM
  
  // Analysis state
  private analysisStartTime = 0;
  private currentTime = 0;
  
  constructor() {
    this.currentSection = this.createSection(SectionType.INTRO, 0);
    this.analysisStartTime = performance.now() / 1000;
  }
  
  /**
   * Update analysis with current audio features
   */
  update(
    time: number,
    overall: number,
    spectralFlux: number,
    beatIntensity: number,
    harmonicRatio: number,
    tempo: number
  ): MusicalStructureState {
    this.currentTime = time;
    this.currentEnergy = overall;
    
    // Update histories
    this.updateEnergyHistory(time, overall);
    this.updateTensionHistory(spectralFlux, beatIntensity, harmonicRatio);
    
    // Detect section changes
    this.detectSectionChange(time, overall, spectralFlux, beatIntensity);
    
    // Detect phrase boundaries
    const phraseBoundary = this.detectPhraseBoundary(time, beatIntensity, tempo);
    
    // Calculate trajectories
    const energy = this.calculateEnergyTrajectory();
    const tension = this.calculateTensionState(time);
    
    // Build state
    const sectionDuration = time - this.currentSection.startTime;
    const sectionProgress = this.currentSection.duration > 0
      ? THREE.MathUtils.clamp(sectionDuration / this.currentSection.duration, 0, 1)
      : 0;
    
    return {
      currentSection: { ...this.currentSection },
      previousSection: this.sections.length > 0 ? { ...this.sections[this.sections.length - 1] } : null,
      sectionProgress,
      
      energy,
      tension,
      
      phraseBoundaryDetected: phraseBoundary,
      timeSinceLastPhrase: time - this.lastPhraseBoundaryTime,
      
      analysisTime: time - this.analysisStartTime,
      totalDuration: time,
    };
  }
  
  /**
   * Update energy history
   */
  private updateEnergyHistory(time: number, energy: number): void {
    this.energyHistory.push({ time, energy });
    
    // Trim old entries
    const cutoffTime = time - 10.0; // Keep last 10 seconds
    while (this.energyHistory.length > 0 && this.energyHistory[0].time < cutoffTime) {
      this.energyHistory.shift();
    }
  }
  
  /**
   * Update tension history
   */
  private updateTensionHistory(spectralFlux: number, beatIntensity: number, harmonicRatio: number): void {
    // Tension = combination of flux, beat intensity, and harmonic complexity
    const tension = spectralFlux * 0.4 + beatIntensity * 0.3 + (1.0 - harmonicRatio) * 0.3;
    
    this.tensionHistory.push(tension);
    
    // Keep last 100 samples
    if (this.tensionHistory.length > 100) {
      this.tensionHistory.shift();
    }
    
    // Track peaks
    if (tension > this.lastTensionPeak) {
      this.lastTensionPeak = tension;
      this.lastTensionPeakTime = this.currentTime;
    }
    
    // Decay peak tracker
    this.lastTensionPeak *= 0.99;
  }
  
  /**
   * Calculate energy trajectory
   */
  private calculateEnergyTrajectory(): EnergyTrajectory {
    if (this.energyHistory.length < 10) {
      return {
        current: this.currentEnergy,
        trend: 0,
        trendStrength: 0,
        peakRecent: this.currentEnergy,
        valleyRecent: this.currentEnergy,
        dynamicRange: 0,
      };
    }
    
    // Calculate trend using linear regression
    const recent = this.energyHistory.slice(-60); // Last 2 seconds
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    const n = recent.length;
    
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += recent[i].energy;
      sumXY += i * recent[i].energy;
      sumX2 += i * i;
    }
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const trend = THREE.MathUtils.clamp(slope * 30, -1, 1); // Scale to -1 to 1
    const trendStrength = Math.abs(trend);
    
    // Find recent peak and valley
    let peak = 0;
    let valley = 1;
    for (const entry of recent) {
      peak = Math.max(peak, entry.energy);
      valley = Math.min(valley, entry.energy);
    }
    
    return {
      current: this.currentEnergy,
      trend,
      trendStrength,
      peakRecent: peak,
      valleyRecent: valley,
      dynamicRange: peak - valley,
    };
  }
  
  /**
   * Calculate tension state
   */
  private calculateTensionState(time: number): TensionState {
    if (this.tensionHistory.length < 10) {
      return {
        tension: 0,
        isBuilding: false,
        isReleasing: false,
        lastPeakTime: 0,
        timeSincePeak: 0,
        anticipation: 0,
      };
    }
    
    // Current tension = recent average
    const recentTension = this.tensionHistory.slice(-30);
    const currentTension = recentTension.reduce((a, b) => a + b, 0) / recentTension.length;
    
    // Is tension building? (compare first half vs second half)
    const firstHalf = recentTension.slice(0, 15);
    const secondHalf = recentTension.slice(15);
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    
    const isBuilding = secondAvg > firstAvg + 0.05;
    const isReleasing = secondAvg < firstAvg - 0.05;
    
    // Anticipation = tension building with high energy
    const anticipation = isBuilding ? Math.min(currentTension * 1.5, 1.0) : currentTension * 0.5;
    
    return {
      tension: currentTension,
      isBuilding,
      isReleasing,
      lastPeakTime: this.lastTensionPeakTime,
      timeSincePeak: time - this.lastTensionPeakTime,
      anticipation: THREE.MathUtils.clamp(anticipation, 0, 1),
    };
  }
  
  /**
   * Detect section changes (intro, verse, chorus, etc.)
   */
  private detectSectionChange(time: number, overall: number, spectralFlux: number, beatIntensity: number): void {
    const sectionDuration = time - this.currentSection.startTime;
    
    // Don't change too quickly
    if (sectionDuration < this.sectionMinDuration) {
      return;
    }
    
    // Calculate section energy
    const recentEnergy = this.energyHistory.slice(-60);
    const avgEnergy = recentEnergy.length > 0
      ? recentEnergy.reduce((sum, e) => sum + e.energy, 0) / recentEnergy.length
      : overall;
    
    // Detect significant energy change
    const energyDelta = avgEnergy - this.currentSection.energy;
    const significantChange = Math.abs(energyDelta) > 0.15;
    
    // Detect section type based on patterns
    let newType = this.currentSection.type;
    
    if (significantChange) {
      if (energyDelta > 0.2 && spectralFlux > 0.5) {
        // Big energy increase = DROP or CHORUS
        newType = sectionDuration < 16 ? SectionType.DROP : SectionType.CHORUS;
      } else if (energyDelta < -0.2 && beatIntensity < 0.3) {
        // Big energy decrease = BREAKDOWN or BRIDGE
        newType = SectionType.BRIDGE;
      } else if (avgEnergy < 0.3 && sectionDuration < 8) {
        // Low energy at start = INTRO
        newType = SectionType.INTRO;
      } else if (avgEnergy < 0.4) {
        // Low/medium energy = VERSE
        newType = SectionType.VERSE;
      } else {
        // Default to CHORUS for high energy
        newType = SectionType.CHORUS;
      }
    }
    
    // Force section change if too long
    if (sectionDuration > this.sectionMaxDuration) {
      newType = this.inferNextSection(this.currentSection.type);
    }
    
    // Create new section if type changed or max duration exceeded
    if (newType !== this.currentSection.type || sectionDuration > this.sectionMaxDuration) {
      this.transitionToSection(newType, time, avgEnergy);
    }
  }
  
  /**
   * Infer next section based on current section
   */
  private inferNextSection(current: SectionType): SectionType {
    switch (current) {
      case SectionType.INTRO:
        return SectionType.VERSE;
      case SectionType.VERSE:
        return SectionType.CHORUS;
      case SectionType.CHORUS:
        return SectionType.VERSE;
      case SectionType.BRIDGE:
        return SectionType.CHORUS;
      case SectionType.BUILD_UP:
        return SectionType.DROP;
      case SectionType.DROP:
        return SectionType.VERSE;
      case SectionType.BREAKDOWN:
        return SectionType.BUILD_UP;
      default:
        return SectionType.VERSE;
    }
  }
  
  /**
   * Transition to a new section
   */
  private transitionToSection(type: SectionType, time: number, energy: number): void {
    // Finalize current section
    this.currentSection.duration = time - this.currentSection.startTime;
    this.sections.push({ ...this.currentSection });
    
    // Create new section
    this.currentSection = this.createSection(type, time, energy);
    this.sectionStartTime = time;
    
    console.log(`🎵 Section change: ${type} (energy: ${energy.toFixed(2)})`);
  }
  
  /**
   * Detect phrase boundaries (typically every 4 or 8 beats)
   */
  private detectPhraseBoundary(time: number, beatIntensity: number, tempo: number): boolean {
    // Estimate phrase length from tempo
    this.phraseLength = (60.0 / tempo) * 4; // 4 beats
    
    const timeSinceLastPhrase = time - this.lastPhraseBoundaryTime;
    
    // Phrase boundary if:
    // 1. Enough time has passed (~phrase length)
    // 2. Strong beat detected
    if (timeSinceLastPhrase >= this.phraseLength * 0.8 && beatIntensity > 0.7) {
      this.lastPhraseBoundaryTime = time;
      return true;
    }
    
    // Force phrase boundary if too long since last one
    if (timeSinceLastPhrase > this.phraseLength * 1.5) {
      this.lastPhraseBoundaryTime = time;
      return true;
    }
    
    return false;
  }
  
  /**
   * Create a new section
   */
  private createSection(type: SectionType, startTime: number, energy: number = 0): MusicSection {
    return {
      type,
      startTime,
      duration: 0,
      energy,
      confidence: 0.5, // Default confidence
    };
  }
  
  /**
   * Get all detected sections
   */
  getSections(): MusicSection[] {
    return [...this.sections, { ...this.currentSection }];
  }
  
  /**
   * Reset analysis
   */
  reset(): void {
    this.energyHistory = [];
    this.tensionHistory = [];
    this.sections = [];
    this.currentSection = this.createSection(SectionType.INTRO, 0);
    this.sectionStartTime = 0;
    this.lastPhraseBoundaryTime = 0;
    this.lastTensionPeak = 0;
    this.lastTensionPeakTime = 0;
    this.analysisStartTime = performance.now() / 1000;
  }
}

