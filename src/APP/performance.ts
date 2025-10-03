/**
 * APP/performance.ts - Adaptive performance governor
 * Analyzes frame timings and emits performance tier changes so the app can
 * automatically balance visual quality and responsiveness.
 */

export type PerformanceTier = 'high' | 'medium' | 'low';

export type PerformanceChangeReason = 'low' | 'critical-low' | 'recover-high';

export interface PerformanceChangeContext {
  tier: PerformanceTier;
  reason: PerformanceChangeReason;
  fps: number;
}

export interface AdaptivePerformanceOptions {
  lowFpsThreshold: number;
  criticalFpsThreshold: number;
  highFpsThreshold: number;
  framesForLow: number;
  framesForCritical: number;
  framesForHigh: number;
}

export interface AdaptivePerformanceCallbacks {
  onTierChange: (context: PerformanceChangeContext) => void;
}

/**
 * AdaptivePerformanceManager - lightweight frame pacing analyzer
 */
export class AdaptivePerformanceManager {
  private tier: PerformanceTier = 'high';
  private fps: number = 60;
  private lowStreak: number = 0;
  private criticalStreak: number = 0;
  private highStreak: number = 0;

  constructor(
    private readonly options: AdaptivePerformanceOptions,
    private readonly callbacks: AdaptivePerformanceCallbacks,
  ) {}

  /**
   * Process a new frame delta
   */
  public update(delta: number): void {
    if (!isFinite(delta) || delta <= 0) {
      return;
    }

    const fps = 1 / delta;
    this.fps = fps;

    const { lowFpsThreshold, criticalFpsThreshold, highFpsThreshold } = this.options;

    if (fps < criticalFpsThreshold) {
      this.criticalStreak++;
      this.lowStreak++;
      this.highStreak = 0;
    } else if (fps < lowFpsThreshold) {
      this.lowStreak++;
      this.criticalStreak = 0;
      this.highStreak = 0;
    } else if (fps > highFpsThreshold) {
      this.highStreak++;
      this.lowStreak = 0;
      this.criticalStreak = 0;
    } else {
      this.resetStreaks();
    }

    let nextTier: PerformanceTier | null = null;
    let reason: PerformanceChangeReason | null = null;

    if (this.criticalStreak >= this.options.framesForCritical && this.tier !== 'low') {
      nextTier = 'low';
      reason = 'critical-low';
    } else if (this.lowStreak >= this.options.framesForLow && this.tier === 'high') {
      nextTier = 'medium';
      reason = 'low';
    } else if (this.highStreak >= this.options.framesForHigh && this.tier !== 'high') {
      nextTier = 'high';
      reason = 'recover-high';
    }

    if (nextTier && nextTier !== this.tier) {
      this.tier = nextTier;
      this.callbacks.onTierChange({
        tier: nextTier,
        reason: reason ?? (nextTier === 'high' ? 'recover-high' : nextTier === 'medium' ? 'low' : 'critical-low'),
        fps,
      });
      this.resetStreaks();
    }
  }

  public getCurrentTier(): PerformanceTier {
    return this.tier;
  }

  public getDiagnostics() {
    return {
      fps: this.fps,
      tier: this.tier,
      lowStreak: this.lowStreak,
      criticalStreak: this.criticalStreak,
      highStreak: this.highStreak,
    };
  }

  public registerManualOverride(): void {
    this.resetStreaks();
  }

  private resetStreaks(): void {
    this.lowStreak = 0;
    this.criticalStreak = 0;
    this.highStreak = 0;
  }
}
