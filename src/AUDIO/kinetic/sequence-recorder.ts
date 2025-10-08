/**
 * AUDIO/kinetic/sequence-recorder.ts - Gesture Sequence Recorder & Playback
 * 
 * Records and plays back gesture sequences for performance and automation
 */

import type { GestureType } from './gesture-primitives';
import { MacroType } from './macro-control';

/**
 * Recorded event types
 */
export enum SequenceEventType {
  GESTURE_TRIGGER = 'gesture',
  MACRO_CHANGE = 'macro',
  PERSONALITY_CHANGE = 'personality',
  FORMATION_CHANGE = 'formation',
}

/**
 * Base sequence event
 */
export interface SequenceEvent {
  type: SequenceEventType;
  timestamp: number;  // Seconds from sequence start
}

/**
 * Gesture trigger event
 */
export interface GestureEvent extends SequenceEvent {
  type: SequenceEventType.GESTURE_TRIGGER;
  gesture: GestureType;
  intensity: number;
}

/**
 * Macro change event
 */
export interface MacroEvent extends SequenceEvent {
  type: SequenceEventType.MACRO_CHANGE;
  macro: MacroType;
  value: number;
}

/**
 * Personality change event
 */
export interface PersonalityEvent extends SequenceEvent {
  type: SequenceEventType.PERSONALITY_CHANGE;
  personality: string;
}

/**
 * Formation change event
 */
export interface FormationEvent extends SequenceEvent {
  type: SequenceEventType.FORMATION_CHANGE;
  formation: string;
}

/**
 * All event types
 */
export type AnySequenceEvent = GestureEvent | MacroEvent | PersonalityEvent | FormationEvent;

/**
 * Recorded sequence
 */
export interface GestureSequence {
  id: string;
  name: string;
  description: string;
  duration: number;  // Total duration in seconds
  events: AnySequenceEvent[];
  createdAt: number;
  tags: string[];
}

/**
 * Playback state
 */
export interface PlaybackState {
  isPlaying: boolean;
  isPaused: boolean;
  currentTime: number;
  sequence: GestureSequence | null;
  loop: boolean;
  speed: number;  // Playback speed multiplier
  nextEventIndex: number;
}

/**
 * Recorder state
 */
export interface RecorderState {
  isRecording: boolean;
  startTime: number;
  events: AnySequenceEvent[];
  duration: number;
}

/**
 * SequenceRecorder - Records and plays back gesture sequences
 */
export class SequenceRecorder {
  private sequences: Map<string, GestureSequence> = new Map();
  
  // Recording state
  private isRecording: boolean = false;
  private recordingStartTime: number = 0;
  private recordingEvents: AnySequenceEvent[] = [];
  
  // Playback state
  private isPlaying: boolean = false;
  private isPaused: boolean = false;
  private currentSequence: GestureSequence | null = null;
  private playbackStartTime: number = 0;
  private playbackOffset: number = 0;  // For pause/resume
  private nextEventIndex: number = 0;
  private loop: boolean = false;
  private playbackSpeed: number = 1.0;
  
  // Event callbacks
  private onEventCallback?: (event: AnySequenceEvent) => void;
  
  constructor() {}
  
  // ========================================
  // RECORDING
  // ========================================
  
  /**
   * Start recording
   */
  startRecording(): void {
    if (this.isRecording) return;
    
    this.isRecording = true;
    this.recordingStartTime = performance.now() / 1000;
    this.recordingEvents = [];
    
    console.log('🔴 Recording started');
  }
  
  /**
   * Stop recording and save sequence
   */
  stopRecording(name: string = 'Untitled Sequence', description: string = ''): GestureSequence | null {
    if (!this.isRecording) return null;
    
    this.isRecording = false;
    const duration = (performance.now() / 1000) - this.recordingStartTime;
    
    const sequence: GestureSequence = {
      id: `seq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      duration,
      events: [...this.recordingEvents],
      createdAt: Date.now(),
      tags: [],
    };
    
    this.sequences.set(sequence.id, sequence);
    this.recordingEvents = [];
    
    console.log(`✅ Recording stopped: ${name} (${duration.toFixed(2)}s, ${sequence.events.length} events)`);
    
    return sequence;
  }
  
  /**
   * Cancel recording
   */
  cancelRecording(): void {
    if (!this.isRecording) return;
    
    this.isRecording = false;
    this.recordingEvents = [];
    
    console.log('❌ Recording cancelled');
  }
  
  /**
   * Record a gesture trigger
   */
  recordGesture(gesture: GestureType, intensity: number = 1.0): void {
    if (!this.isRecording) return;
    
    const timestamp = (performance.now() / 1000) - this.recordingStartTime;
    
    this.recordingEvents.push({
      type: SequenceEventType.GESTURE_TRIGGER,
      timestamp,
      gesture,
      intensity,
    });
  }
  
  /**
   * Record a macro change
   */
  recordMacro(macro: MacroType, value: number): void {
    if (!this.isRecording) return;
    
    const timestamp = (performance.now() / 1000) - this.recordingStartTime;
    
    this.recordingEvents.push({
      type: SequenceEventType.MACRO_CHANGE,
      timestamp,
      macro,
      value,
    });
  }
  
  /**
   * Record a personality change
   */
  recordPersonality(personality: string): void {
    if (!this.isRecording) return;
    
    const timestamp = (performance.now() / 1000) - this.recordingStartTime;
    
    this.recordingEvents.push({
      type: SequenceEventType.PERSONALITY_CHANGE,
      timestamp,
      personality,
    });
  }
  
  /**
   * Record a formation change
   */
  recordFormation(formation: string): void {
    if (!this.isRecording) return;
    
    const timestamp = (performance.now() / 1000) - this.recordingStartTime;
    
    this.recordingEvents.push({
      type: SequenceEventType.FORMATION_CHANGE,
      timestamp,
      formation,
    });
  }
  
  // ========================================
  // PLAYBACK
  // ========================================
  
  /**
   * Start playing a sequence
   */
  play(sequenceId: string, loop: boolean = false): boolean {
    const sequence = this.sequences.get(sequenceId);
    if (!sequence) {
      console.error(`Sequence not found: ${sequenceId}`);
      return false;
    }
    
    this.currentSequence = sequence;
    this.isPlaying = true;
    this.isPaused = false;
    this.playbackStartTime = performance.now() / 1000;
    this.playbackOffset = 0;
    this.nextEventIndex = 0;
    this.loop = loop;
    
    console.log(`▶️ Playing: ${sequence.name} (${loop ? 'looped' : 'once'})`);
    
    return true;
  }
  
  /**
   * Pause playback
   */
  pause(): void {
    if (!this.isPlaying || this.isPaused) return;
    
    this.isPaused = true;
    const currentTime = (performance.now() / 1000) - this.playbackStartTime;
    this.playbackOffset = currentTime;
    
    console.log('⏸️ Playback paused');
  }
  
  /**
   * Resume playback
   */
  resume(): void {
    if (!this.isPlaying || !this.isPaused) return;
    
    this.isPaused = false;
    this.playbackStartTime = (performance.now() / 1000) - this.playbackOffset;
    
    console.log('▶️ Playback resumed');
  }
  
  /**
   * Stop playback
   */
  stop(): void {
    if (!this.isPlaying) return;
    
    this.isPlaying = false;
    this.isPaused = false;
    this.currentSequence = null;
    this.nextEventIndex = 0;
    
    console.log('⏹️ Playback stopped');
  }
  
  /**
   * Update playback (call each frame)
   */
  update(): void {
    if (!this.isPlaying || this.isPaused || !this.currentSequence) return;
    
    const currentTime = ((performance.now() / 1000) - this.playbackStartTime) * this.playbackSpeed;
    
    // Check if sequence is finished
    if (currentTime >= this.currentSequence.duration) {
      if (this.loop) {
        // Restart sequence
        this.playbackStartTime = performance.now() / 1000;
        this.nextEventIndex = 0;
        console.log('🔁 Sequence loop');
      } else {
        // Stop playback
        this.stop();
        return;
      }
    }
    
    // Process events
    while (
      this.nextEventIndex < this.currentSequence.events.length &&
      this.currentSequence.events[this.nextEventIndex].timestamp <= currentTime
    ) {
      const event = this.currentSequence.events[this.nextEventIndex];
      this.onEventCallback?.(event);
      this.nextEventIndex++;
    }
  }
  
  /**
   * Set playback speed
   */
  setSpeed(speed: number): void {
    this.playbackSpeed = Math.max(0.1, Math.min(4.0, speed));
  }
  
  /**
   * Set event callback
   */
  setEventCallback(callback: (event: AnySequenceEvent) => void): void {
    this.onEventCallback = callback;
  }
  
  // ========================================
  // SEQUENCE MANAGEMENT
  // ========================================
  
  /**
   * Get sequence by ID
   */
  getSequence(id: string): GestureSequence | undefined {
    return this.sequences.get(id);
  }
  
  /**
   * Get all sequences
   */
  getAllSequences(): GestureSequence[] {
    return Array.from(this.sequences.values());
  }
  
  /**
   * Delete sequence
   */
  deleteSequence(id: string): boolean {
    if (this.currentSequence?.id === id) {
      this.stop();
    }
    return this.sequences.delete(id);
  }
  
  /**
   * Rename sequence
   */
  renameSequence(id: string, name: string): boolean {
    const sequence = this.sequences.get(id);
    if (!sequence) return false;
    
    sequence.name = name;
    return true;
  }
  
  /**
   * Export sequence to JSON
   */
  exportSequence(id: string): string | null {
    const sequence = this.sequences.get(id);
    if (!sequence) return null;
    
    return JSON.stringify(sequence, null, 2);
  }
  
  /**
   * Import sequence from JSON
   */
  importSequence(json: string): GestureSequence | null {
    try {
      const sequence = JSON.parse(json) as GestureSequence;
      
      // Validate structure
      if (!sequence.id || !sequence.name || !sequence.events || !Array.isArray(sequence.events)) {
        throw new Error('Invalid sequence format');
      }
      
      // Generate new ID to avoid conflicts
      sequence.id = `seq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      this.sequences.set(sequence.id, sequence);
      
      console.log(`📥 Imported sequence: ${sequence.name}`);
      
      return sequence;
    } catch (error) {
      console.error('Failed to import sequence:', error);
      return null;
    }
  }
  
  // ========================================
  // STATE
  // ========================================
  
  /**
   * Get recorder state
   */
  getRecorderState(): RecorderState {
    return {
      isRecording: this.isRecording,
      startTime: this.recordingStartTime,
      events: [...this.recordingEvents],
      duration: this.isRecording
        ? (performance.now() / 1000) - this.recordingStartTime
        : 0,
    };
  }
  
  /**
   * Get playback state
   */
  getPlaybackState(): PlaybackState {
    const currentTime = this.isPlaying && !this.isPaused
      ? ((performance.now() / 1000) - this.playbackStartTime) * this.playbackSpeed
      : this.playbackOffset;
    
    return {
      isPlaying: this.isPlaying,
      isPaused: this.isPaused,
      currentTime,
      sequence: this.currentSequence,
      loop: this.loop,
      speed: this.playbackSpeed,
      nextEventIndex: this.nextEventIndex,
    };
  }
  
  /**
   * Reset recorder
   */
  reset(): void {
    this.stop();
    this.cancelRecording();
    this.sequences.clear();
  }
}

