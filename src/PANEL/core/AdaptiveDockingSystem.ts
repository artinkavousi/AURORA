/**
 * PANEL/core/AdaptiveDockingSystem.ts - Intelligent docking and positioning
 * Handles auto-snap to edges, magnetic zones, smooth transitions
 */

export type DockSide = 'left' | 'right' | 'bottom';

export interface DockPosition {
  side: DockSide;
  offset: { x: number; y: number };
}

export interface DockConstraints {
  snapThreshold: number;
  magneticZoneSize: number;
  collapsedWidth: number;
  expandedWidth: number;
  collapsedHeight: number;
  expandedHeight: number;
  minMargin: number;
}

export interface DockCallbacks {
  onDockChange?: (position: DockPosition) => void;
  onEnterMagneticZone?: (side: DockSide) => void;
  onLeaveMagneticZone?: () => void;
}

const DEFAULT_CONSTRAINTS: DockConstraints = {
  snapThreshold: 150,
  magneticZoneSize: 100,
  collapsedWidth: 56,
  expandedWidth: 360,
  collapsedHeight: 56,
  expandedHeight: 400,
  minMargin: 16,
};

/**
 * AdaptiveDockingSystem - Intelligent panel positioning with auto-snap
 */
export class AdaptiveDockingSystem {
  private position: DockPosition;
  private constraints: DockConstraints;
  private callbacks: DockCallbacks;
  private isInMagneticZone = false;
  private currentMagneticSide: DockSide | null = null;
  
  constructor(
    initialPosition: DockPosition,
    constraints: Partial<DockConstraints> = {},
    callbacks: DockCallbacks = {}
  ) {
    this.position = initialPosition;
    this.constraints = { ...DEFAULT_CONSTRAINTS, ...constraints };
    this.callbacks = callbacks;
  }
  
  /**
   * Update position based on drag
   */
  updatePosition(clientX: number, clientY: number): DockPosition {
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
    };
    
    // Calculate distances to each edge
    const distToLeft = clientX;
    const distToRight = viewport.width - clientX;
    const distToBottom = viewport.height - clientY;
    
    // Find nearest edge
    const distances = [
      { side: 'left' as DockSide, dist: distToLeft },
      { side: 'right' as DockSide, dist: distToRight },
      { side: 'bottom' as DockSide, dist: distToBottom },
    ];
    
    const nearest = distances.reduce((min, curr) =>
      curr.dist < min.dist ? curr : min
    );
    
    // Check if within magnetic zone
    if (nearest.dist < this.constraints.magneticZoneSize) {
      if (!this.isInMagneticZone || this.currentMagneticSide !== nearest.side) {
        this.isInMagneticZone = true;
        this.currentMagneticSide = nearest.side;
        this.callbacks.onEnterMagneticZone?.(nearest.side);
      }
    } else {
      if (this.isInMagneticZone) {
        this.isInMagneticZone = false;
        this.currentMagneticSide = null;
        this.callbacks.onLeaveMagneticZone?.();
      }
    }
    
    // Update position (not snapped yet, just tracked)
    this.position = {
      side: this.position.side, // Keep current until released
      offset: { x: clientX, y: clientY },
    };
    
    return this.position;
  }
  
  /**
   * Snap to nearest edge (called on drag end)
   */
  snapToEdge(clientX: number, clientY: number, isExpanded: boolean): DockPosition {
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
    };
    
    // Calculate distances to each edge
    const distToLeft = clientX;
    const distToRight = viewport.width - clientX;
    const distToBottom = viewport.height - clientY;
    
    // Find nearest edge
    const distances = [
      { side: 'left' as DockSide, dist: distToLeft },
      { side: 'right' as DockSide, dist: distToRight },
      { side: 'bottom' as DockSide, dist: distToBottom },
    ];
    
    const nearest = distances.reduce((min, curr) =>
      curr.dist < min.dist ? curr : min
    );
    
    // Snap if within threshold
    if (nearest.dist < this.constraints.snapThreshold) {
      this.position = {
        side: nearest.side,
        offset: { x: 0, y: 0 },
      };
    }
    
    this.isInMagneticZone = false;
    this.currentMagneticSide = null;
    this.callbacks.onDockChange?.(this.position);
    
    return this.position;
  }
  
  /**
   * Get computed position and dimensions for current dock
   */
  getComputedStyle(isExpanded: boolean): {
    left: string;
    top: string;
    right: string;
    bottom: string;
    width: string;
    height: string;
    transform: string;
  } {
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
    };
    
    const margin = this.constraints.minMargin;
    
    switch (this.position.side) {
      case 'left':
        return {
          left: `${margin}px`,
          top: `${margin}px`,
          right: 'auto',
          bottom: `${margin}px`,
          width: isExpanded
            ? `${this.constraints.expandedWidth}px`
            : `${this.constraints.collapsedWidth}px`,
          height: `calc(100vh - ${margin * 2}px)`,
          transform: 'none',
        };
        
      case 'right':
        return {
          left: 'auto',
          top: `${margin}px`,
          right: `${margin}px`,
          bottom: `${margin}px`,
          width: isExpanded
            ? `${this.constraints.expandedWidth}px`
            : `${this.constraints.collapsedWidth}px`,
          height: `calc(100vh - ${margin * 2}px)`,
          transform: 'none',
        };
        
      case 'bottom':
        return {
          left: `${margin}px`,
          top: 'auto',
          right: `${margin}px`,
          bottom: `${margin}px`,
          width: `calc(100vw - ${margin * 2}px)`,
          height: isExpanded
            ? `${this.constraints.expandedHeight}px`
            : `${this.constraints.collapsedHeight}px`,
          transform: 'none',
        };
        
      default:
        return {
          left: 'auto',
          top: `${margin}px`,
          right: `${margin}px`,
          bottom: `${margin}px`,
          width: `${this.constraints.expandedWidth}px`,
          height: `calc(100vh - ${margin * 2}px)`,
          transform: 'none',
        };
    }
  }
  
  /**
   * Get tab bar orientation based on dock side
   */
  getTabBarOrientation(): 'vertical' | 'horizontal' {
    return this.position.side === 'bottom' ? 'horizontal' : 'vertical';
  }
  
  /**
   * Get current dock position
   */
  getCurrentDock(): DockPosition {
    return { ...this.position };
  }
  
  /**
   * Set dock position manually
   */
  setDock(position: DockPosition): void {
    this.position = position;
    this.callbacks.onDockChange?.(this.position);
  }
  
  /**
   * Check if currently in magnetic zone
   */
  isInMagnetic(): boolean {
    return this.isInMagneticZone;
  }
  
  /**
   * Get magnetic zone side
   */
  getMagneticSide(): DockSide | null {
    return this.currentMagneticSide;
  }
}

