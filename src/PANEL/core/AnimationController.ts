/**
 * PANEL/core/AnimationController.ts - Animation utilities
 * Spring physics, easing functions, and animation helpers
 */

export interface SpringConfig {
  stiffness: number;
  damping: number;
  mass: number;
}

const DEFAULT_SPRING: SpringConfig = {
  stiffness: 170,
  damping: 26,
  mass: 1,
};

/**
 * AnimationController - Smooth animations and transitions
 */
export class AnimationController {
  private animations: Map<string, number> = new Map();
  
  /**
   * Animate value with spring physics
   */
  spring(
    from: number,
    to: number,
    callback: (value: number) => void,
    config: Partial<SpringConfig> = {}
  ): () => void {
    const { stiffness, damping, mass } = { ...DEFAULT_SPRING, ...config };
    
    let value = from;
    let velocity = 0;
    let lastTime = performance.now();
    
    const animate = () => {
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;
      
      // Spring physics
      const force = -stiffness * (value - to);
      const dampingForce = -damping * velocity;
      const acceleration = (force + dampingForce) / mass;
      
      velocity += acceleration * dt;
      value += velocity * dt;
      
      callback(value);
      
      // Continue if not settled
      if (Math.abs(velocity) > 0.01 || Math.abs(value - to) > 0.01) {
        const id = requestAnimationFrame(animate);
        this.animations.set('spring', id);
      } else {
        callback(to);
        this.animations.delete('spring');
      }
    };
    
    const id = requestAnimationFrame(animate);
    this.animations.set('spring', id);
    
    // Return cancel function
    return () => {
      const animId = this.animations.get('spring');
      if (animId !== undefined) {
        cancelAnimationFrame(animId);
        this.animations.delete('spring');
      }
    };
  }
  
  /**
   * Animate with easing function
   */
  ease(
    duration: number,
    callback: (progress: number) => void,
    easing: (t: number) => number = (t) => t
  ): () => void {
    const startTime = performance.now();
    
    const animate = () => {
      const now = performance.now();
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      callback(easing(progress));
      
      if (progress < 1) {
        const id = requestAnimationFrame(animate);
        this.animations.set('ease', id);
      } else {
        this.animations.delete('ease');
      }
    };
    
    const id = requestAnimationFrame(animate);
    this.animations.set('ease', id);
    
    // Return cancel function
    return () => {
      const animId = this.animations.get('ease');
      if (animId !== undefined) {
        cancelAnimationFrame(animId);
        this.animations.delete('ease');
      }
    };
  }
  
  /**
   * Easing functions
   */
  static easeInOut(t: number): number {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }
  
  static easeOut(t: number): number {
    return t * (2 - t);
  }
  
  static easeIn(t: number): number {
    return t * t;
  }
  
  /**
   * Cancel all animations
   */
  cancelAll(): void {
    this.animations.forEach((id) => cancelAnimationFrame(id));
    this.animations.clear();
  }
}

