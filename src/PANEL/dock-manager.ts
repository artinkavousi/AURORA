/**
 * PANEL/dock-manager.ts - Intelligent docking system with snap zones
 * Handles drag-to-dock, snap zones, and adaptive positioning
 */

export type DockSide = 'left' | 'right' | 'bottom';

export interface DockPosition {
  side: DockSide;
  offset: { x: number; y: number };
}

export interface SnapZone {
  side: DockSide;
  bounds: DOMRect;
  element: HTMLElement;
}

export interface DockManagerConfig {
  snapThreshold: number;  // Pixels from edge to trigger snap
  collapsedWidth: number; // Tab bar width when collapsed (vertical)
  expandedWidth: number;  // Panel width when expanded (vertical)
  collapsedHeight: number; // Tab bar height when collapsed (horizontal)
  expandedHeight: number; // Panel height when expanded (horizontal)
}

const DEFAULT_CONFIG: DockManagerConfig = {
  snapThreshold: 200,
  collapsedWidth: 56,
  expandedWidth: 360,
  collapsedHeight: 56,
  expandedHeight: 400,
};

/**
 * DockManager - Manages panel docking, snapping, and positioning
 */
export class DockManager {
  private config: DockManagerConfig;
  private currentDock: DockPosition;
  private snapZones: SnapZone[] = [];
  private snapZoneElements: HTMLElement[] = [];
  private isDragging = false;
  private dragStartPos = { x: 0, y: 0 };
  private onDockChange?: (position: DockPosition) => void;

  constructor(
    initialDock: DockPosition = { side: 'right', offset: { x: 0, y: 0 } },
    config: Partial<DockManagerConfig> = {},
    onDockChange?: (position: DockPosition) => void
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.currentDock = initialDock;
    this.onDockChange = onDockChange;
    this.createSnapZones();
  }

  /**
   * Get current dock position
   */
  getCurrentDock(): DockPosition {
    return { ...this.currentDock };
  }

  /**
   * Get size for current dock position
   */
  getCurrentSize(expanded: boolean): { width: number; height: number } {
    const isHorizontal = this.currentDock.side === 'bottom';
    
    if (isHorizontal) {
      return {
        width: window.innerWidth,
        height: expanded ? this.config.expandedHeight : this.config.collapsedHeight,
      };
    } else {
      return {
        width: expanded ? this.config.expandedWidth : this.config.collapsedWidth,
        height: window.innerHeight,
      };
    }
  }

  /**
   * Get CSS position for current dock
   */
  getPosition(expanded: boolean): { left: string; top: string; right: string; bottom: string } {
    const size = this.getCurrentSize(expanded);
    
    switch (this.currentDock.side) {
      case 'left':
        return {
          left: '0',
          top: '0',
          right: 'auto',
          bottom: 'auto',
        };
      case 'right':
        return {
          left: 'auto',
          top: '0',
          right: '0',
          bottom: 'auto',
        };
      case 'bottom':
        return {
          left: '0',
          top: 'auto',
          right: 'auto',
          bottom: '0',
        };
    }
  }

  /**
   * Create snap zone visual indicators
   */
  private createSnapZones(): void {
    // Remove existing zones
    this.snapZoneElements.forEach(el => el.remove());
    this.snapZoneElements = [];

    const zones: Array<{ side: DockSide; style: Partial<CSSStyleDeclaration> }> = [
      {
        side: 'left',
        style: {
          left: '0',
          top: '0',
          width: `${this.config.snapThreshold}px`,
          height: '100%',
        },
      },
      {
        side: 'right',
        style: {
          right: '0',
          top: '0',
          width: `${this.config.snapThreshold}px`,
          height: '100%',
        },
      },
      {
        side: 'bottom',
        style: {
          left: '0',
          bottom: '0',
          width: '100%',
          height: `${this.config.snapThreshold}px`,
        },
      },
    ];

    zones.forEach(({ side, style }) => {
      const element = document.createElement('div');
      element.className = 'unified-panel-snap-zone';
      element.dataset.side = side;
      Object.assign(element.style, {
        position: 'fixed',
        pointerEvents: 'none',
        opacity: '0',
        border: '3px dashed rgba(80, 120, 180, 0.5)',
        background: 'rgba(80, 120, 180, 0.1)',
        backdropFilter: 'blur(20px)',
        transition: 'opacity 0.3s ease',
        zIndex: '9999',
        ...style,
      });
      document.body.appendChild(element);
      this.snapZoneElements.push(element);

      this.snapZones.push({
        side,
        bounds: element.getBoundingClientRect(),
        element,
      });
    });
  }

  /**
   * Update snap zone bounds (call on resize)
   */
  updateSnapZones(): void {
    this.snapZones.forEach(zone => {
      zone.bounds = zone.element.getBoundingClientRect();
    });
  }

  /**
   * Detect which snap zone cursor is in
   */
  detectSnapZone(x: number, y: number): SnapZone | null {
    for (const zone of this.snapZones) {
      if (
        x >= zone.bounds.left &&
        x <= zone.bounds.right &&
        y >= zone.bounds.top &&
        y <= zone.bounds.bottom
      ) {
        return zone;
      }
    }
    return null;
  }

  /**
   * Show snap zone indicator
   */
  showSnapZone(side: DockSide): void {
    this.snapZoneElements.forEach(el => {
      if (el.dataset.side === side) {
        el.style.opacity = '0.7';
      } else {
        el.style.opacity = '0';
      }
    });
  }

  /**
   * Hide all snap zone indicators
   */
  hideSnapZones(): void {
    this.snapZoneElements.forEach(el => {
      el.style.opacity = '0';
    });
  }

  /**
   * Start drag operation
   */
  startDrag(x: number, y: number): void {
    this.isDragging = true;
    this.dragStartPos = { x, y };
    
    // Show all snap zones
    this.snapZoneElements.forEach(el => {
      el.style.opacity = '0.3';
    });
  }

  /**
   * Update drag position
   */
  updateDrag(x: number, y: number): DockSide | null {
    if (!this.isDragging) return null;

    const zone = this.detectSnapZone(x, y);
    if (zone) {
      this.showSnapZone(zone.side);
      return zone.side;
    } else {
      this.hideSnapZones();
      return null;
    }
  }

  /**
   * End drag and snap to zone
   */
  endDrag(x: number, y: number): DockSide | null {
    if (!this.isDragging) return null;

    this.isDragging = false;
    this.hideSnapZones();

    const zone = this.detectSnapZone(x, y);
    if (zone && zone.side !== this.currentDock.side) {
      // Dock changed
      const oldDock = this.currentDock.side;
      this.currentDock = {
        side: zone.side,
        offset: { x: 0, y: 0 },
      };
      
      this.onDockChange?.(this.currentDock);
      return zone.side;
    }

    return null;
  }

  /**
   * Cancel drag
   */
  cancelDrag(): void {
    this.isDragging = false;
    this.hideSnapZones();
  }

  /**
   * Manually set dock position
   */
  setDock(side: DockSide): void {
    if (side === this.currentDock.side) return;
    
    this.currentDock = {
      side,
      offset: { x: 0, y: 0 },
    };
    
    this.onDockChange?.(this.currentDock);
  }

  /**
   * Check if position is near snap threshold
   */
  isNearEdge(x: number, y: number): boolean {
    const threshold = this.config.snapThreshold;
    return (
      x < threshold ||
      x > window.innerWidth - threshold ||
      y > window.innerHeight - threshold
    );
  }

  /**
   * Get tab bar orientation based on dock
   */
  getTabBarOrientation(): 'vertical' | 'horizontal' {
    return this.currentDock.side === 'bottom' ? 'horizontal' : 'vertical';
  }

  /**
   * Save dock position to localStorage
   */
  saveDockPosition(): void {
    try {
      localStorage.setItem('unified-panel-dock', JSON.stringify(this.currentDock));
    } catch (error) {
      console.warn('Failed to save dock position:', error);
    }
  }

  /**
   * Load dock position from localStorage
   */
  loadDockPosition(): DockPosition | null {
    try {
      const saved = localStorage.getItem('unified-panel-dock');
      if (saved) {
        return JSON.parse(saved) as DockPosition;
      }
    } catch (error) {
      console.warn('Failed to load dock position:', error);
    }
    return null;
  }

  /**
   * Dispose manager
   */
  dispose(): void {
    this.snapZoneElements.forEach(el => el.remove());
    this.snapZoneElements = [];
    this.snapZones = [];
  }
}



