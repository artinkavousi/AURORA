/**
 * PARTICLESYSTEM/PHYSIC/viewport-tracker.ts - Viewport and UI space management
 * Single responsibility: Track viewport dimensions and UI element positions for particle-safe zones
 * 
 * This utility provides:
 * - Real-time viewport tracking
 * - UI panel exclusion zones
 * - Particle-safe zone calculations
 * - Coordinate space conversions (viewport ↔ grid ↔ world)
 * - Automatic resize handling
 */

import * as THREE from "three/webgpu";

/**
 * UI exclusion zone (panel, control, or any UI element)
 */
export interface UIExclusionZone {
  id: string;
  rect: DOMRect;  // Position and size in screen space
  margin?: number;  // Additional margin around UI element
}

/**
 * Viewport bounds in different coordinate spaces
 */
export interface ViewportBounds {
  // Screen space (pixels)
  screen: {
    width: number;
    height: number;
    aspect: number;
  };
  
  // Particle-safe zone (viewport minus UI exclusions)
  safe: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    width: number;
    height: number;
    centerX: number;
    centerY: number;
  };
  
  // Grid space (simulation coordinates)
  grid: {
    width: number;
    height: number;
    depth: number;
    center: THREE.Vector3;
  };
}

/**
 * ViewportTracker - Self-contained viewport and UI space manager
 * Automatically tracks viewport changes and UI element positions
 */
export class ViewportTracker {
  private bounds: ViewportBounds;
  private exclusionZones: Map<string, UIExclusionZone> = new Map();
  private resizeObserver: ResizeObserver;
  private mutationObserver: MutationObserver;
  
  // Configuration
  private readonly baseGridSize: THREE.Vector3;
  private readonly minGridMargin: number;  // Minimum margin from viewport edges
  private readonly uiMargin: number;  // Extra margin around UI elements
  
  // Callbacks
  private onUpdateCallbacks: Array<(bounds: ViewportBounds) => void> = [];
  
  // ✨ FIX: Prevent recursive updates
  private isUpdating: boolean = false;
  
  constructor(config: {
    baseGridSize?: THREE.Vector3;
    minGridMargin?: number;
    uiMargin?: number;
  } = {}) {
    this.baseGridSize = config.baseGridSize ?? new THREE.Vector3(64, 64, 64);
    this.minGridMargin = config.minGridMargin ?? 8;
    this.uiMargin = config.uiMargin ?? 16;
    
    // Initialize bounds
    this.bounds = this.calculateBounds();
    
    // Setup automatic tracking
    this.resizeObserver = new ResizeObserver(() => this.update());
    this.resizeObserver.observe(document.body);
    
    // Track DOM mutations (for UI panels appearing/disappearing)
    this.mutationObserver = new MutationObserver(() => this.update());
    this.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class'],
    });
    
    // Initial update
    this.update();
    
    // ✨ FIX: Delayed update to catch UI panels that load after initialization
    // Panels are often created after boundaries in the app lifecycle
    setTimeout(() => this.update(), 100);
    setTimeout(() => this.update(), 500);  // Extra safety for slow-loading panels
  }
  
  /**
   * Register a UI exclusion zone (panel, control, etc.)
   * ✨ FIX: No longer triggers update (caller must call update if needed)
   */
  public registerUIZone(zone: UIExclusionZone): void {
    this.exclusionZones.set(zone.id, zone);
    // Don't auto-update to prevent recursion
    // Caller must call update() or recalculateBounds() if needed
  }
  
  /**
   * Unregister a UI exclusion zone
   */
  public unregisterUIZone(id: string): void {
    this.exclusionZones.delete(id);
    this.update();
  }
  
  /**
   * Automatically detect and register UI panels
   * Searches for common panel class names and IDs
   * ✨ FIX: Directly modifies exclusionZones without triggering updates
   */
  public autoDetectUIPanels(): void {
    // Clear existing auto-detected zones
    const autoZones = Array.from(this.exclusionZones.keys()).filter(id => id.startsWith('auto-'));
    autoZones.forEach(id => this.exclusionZones.delete(id));
    
    // Detect Tweakpane panels
    const tweakpanes = document.querySelectorAll('.tp-dfwv, .tp-rotv, .panel-container');
    tweakpanes.forEach((element, index) => {
      const rect = element.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        // Directly add to map without calling registerUIZone (prevents recursion)
        this.exclusionZones.set(`auto-tweakpane-${index}`, {
          id: `auto-tweakpane-${index}`,
          rect,
          margin: this.uiMargin,
        });
      }
    });
    
    // Detect unified panel system
    const unifiedPanel = document.querySelector('.unified-panel-system');
    if (unifiedPanel) {
      const rect = unifiedPanel.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        // Directly add to map without calling registerUIZone (prevents recursion)
        this.exclusionZones.set('auto-unified-panel', {
          id: 'auto-unified-panel',
          rect,
          margin: this.uiMargin,
        });
      }
    }
  }
  
  /**
   * Calculate current bounds
   */
  private calculateBounds(): ViewportBounds {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const aspect = width / height;
    
    // Start with full viewport as safe zone
    let safeMinX = this.minGridMargin;
    let safeMaxX = width - this.minGridMargin;
    let safeMinY = this.minGridMargin;
    let safeMaxY = height - this.minGridMargin;
    
    // Subtract UI exclusion zones
    // Group zones by position to determine safe area
    this.exclusionZones.forEach(zone => {
      const margin = zone.margin ?? this.uiMargin;
      const rect = zone.rect;
      
      // Right-side panels (reduce right bound)
      if (rect.left > width * 0.6) {
        safeMaxX = Math.min(safeMaxX, rect.left - margin);
      }
      
      // Left-side panels (increase left bound)
      if (rect.right < width * 0.4) {
        safeMinX = Math.max(safeMinX, rect.right + margin);
      }
      
      // Top panels (increase top bound)
      if (rect.bottom < height * 0.4) {
        safeMinY = Math.max(safeMinY, rect.bottom + margin);
      }
      
      // Bottom panels (reduce bottom bound)
      if (rect.top > height * 0.6) {
        safeMaxY = Math.min(safeMaxY, rect.top - margin);
      }
    });
    
    const safeWidth = safeMaxX - safeMinX;
    const safeHeight = safeMaxY - safeMinY;
    const safeCenterX = (safeMinX + safeMaxX) / 2;
    const safeCenterY = (safeMinY + safeMaxY) / 2;
    
    // Calculate grid space dimensions (adaptive to aspect ratio)
    // Maintains particles in view while adapting to screen shape
    const gridWidth = this.baseGridSize.x * Math.max(1, aspect);
    const gridHeight = this.baseGridSize.y * Math.max(1, 1 / aspect);
    const gridDepth = this.baseGridSize.z;
    
    return {
      screen: {
        width,
        height,
        aspect,
      },
      safe: {
        minX: safeMinX,
        maxX: safeMaxX,
        minY: safeMinY,
        maxY: safeMaxY,
        width: safeWidth,
        height: safeHeight,
        centerX: safeCenterX,
        centerY: safeCenterY,
      },
      grid: {
        width: gridWidth,
        height: gridHeight,
        depth: gridDepth,
        center: new THREE.Vector3(gridWidth / 2, gridHeight / 2, gridDepth / 2),
      },
    };
  }
  
  /**
   * Update bounds and notify listeners
   * ✨ FIX: Prevent recursive updates with guard flag
   */
  private update(): void {
    // Prevent recursive updates
    if (this.isUpdating) {
      return;
    }
    
    this.isUpdating = true;
    
    try {
      // Auto-detect UI panels
      this.autoDetectUIPanels();
      
      // Recalculate bounds
      this.bounds = this.calculateBounds();
      
      // Notify listeners
      this.onUpdateCallbacks.forEach(callback => callback(this.bounds));
    } finally {
      this.isUpdating = false;
    }
  }
  
  /**
   * Get current bounds
   */
  public getBounds(): ViewportBounds {
    return this.bounds;
  }
  
  /**
   * ✨ NEW: Manually trigger bounds recalculation
   * Useful when UI changes and you want to force an update
   */
  public recalculateBounds(): void {
    this.update();
  }
  
  /**
   * Subscribe to bounds updates
   */
  public onUpdate(callback: (bounds: ViewportBounds) => void): () => void {
    this.onUpdateCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.onUpdateCallbacks.indexOf(callback);
      if (index >= 0) {
        this.onUpdateCallbacks.splice(index, 1);
      }
    };
  }
  
  /**
   * Convert screen coordinates to grid coordinates
   */
  public screenToGrid(screenX: number, screenY: number): THREE.Vector2 {
    const { screen, grid } = this.bounds;
    
    // Normalize to 0-1
    const normalizedX = screenX / screen.width;
    const normalizedY = screenY / screen.height;
    
    // Map to grid space
    const gridX = normalizedX * grid.width;
    const gridY = normalizedY * grid.height;
    
    return new THREE.Vector2(gridX, gridY);
  }
  
  /**
   * Convert grid coordinates to world coordinates (Three.js space)
   * Grid space (0-64) → World space (-0.5 to 0.5)
   */
  public gridToWorld(gridPos: THREE.Vector3): THREE.Vector3 {
    const { grid } = this.bounds;
    const scale = 1 / 64;  // Grid unit to world unit
    
    return new THREE.Vector3(
      (gridPos.x - grid.center.x) * scale,
      (gridPos.y - grid.center.y) * scale,
      (gridPos.z - grid.center.z) * scale * 0.4  // Z compression
    );
  }
  
  /**
   * Convert world coordinates to grid coordinates
   */
  public worldToGrid(worldPos: THREE.Vector3): THREE.Vector3 {
    const { grid } = this.bounds;
    const scale = 64;  // World unit to grid unit
    
    return new THREE.Vector3(
      worldPos.x * scale + grid.center.x,
      worldPos.y * scale + grid.center.y,
      worldPos.z * scale / 0.4 + grid.center.z
    );
  }
  
  /**
   * Get particle-safe zone center in grid coordinates
   */
  public getSafeCenterGrid(): THREE.Vector3 {
    const { grid } = this.bounds;
    return grid.center.clone();
  }
  
  /**
   * Get particle-safe zone center in world coordinates
   */
  public getSafeCenterWorld(): THREE.Vector3 {
    return this.gridToWorld(this.getSafeCenterGrid());
  }
  
  /**
   * Get particle-safe radius (maximum safe distance from center)
   * Returns { xy: number, z: number } for different axes
   */
  public getSafeRadius(): { xy: number; z: number } {
    const { grid } = this.bounds;
    const safeMargin = this.minGridMargin;
    
    return {
      xy: Math.min(grid.width, grid.height) / 2 - safeMargin,
      z: grid.depth / 2 - safeMargin,
    };
  }
  
  /**
   * Dispose and cleanup
   */
  public dispose(): void {
    this.resizeObserver.disconnect();
    this.mutationObserver.disconnect();
    this.onUpdateCallbacks = [];
    this.exclusionZones.clear();
  }
}


