/**
 * PANEL/unified-panel-system.ts - Unified panel system orchestrator
 * Main controller for tabbed panel interface with smart docking
 */

import type { Pane } from 'tweakpane';
import { TabBar, type Tab } from './tab-bar';
import { DockManager, type DockSide, type DockPosition } from './dock-manager';
import { AnimationController } from './animation-controller';

export interface PanelDefinition {
  id: string;
  icon: string;
  label: string;
  pane: Pane;
  container: HTMLElement;
  color?: string;
}

export interface UnifiedPanelSystemConfig {
  defaultDock?: DockSide;
  defaultExpanded?: boolean;
  defaultTab?: string;
  width?: number;
  height?: number;
  enableDragging?: boolean;
  enableDocking?: boolean;
  enablePersistence?: boolean;
}

const DEFAULT_CONFIG: Required<UnifiedPanelSystemConfig> = {
  defaultDock: 'right',
  defaultExpanded: true,
  defaultTab: '',
  width: 360,
  height: 400,
  enableDragging: true,
  enableDocking: true,
  enablePersistence: true,
};

/**
 * UnifiedPanelSystem - Main orchestrator for the unified panel interface
 */
export class UnifiedPanelSystem {
  private config: Required<UnifiedPanelSystemConfig>;
  private panels: Map<string, PanelDefinition> = new Map();
  private mainContainer: HTMLElement;
  private tabBar: TabBar;
  private panelContainer: HTMLElement;
  private dockManager: DockManager;
  private animationController: AnimationController;
  private isExpanded: boolean;
  private activePanel: string | null = null;
  private dragHandle: HTMLElement;
  
  // Drag state
  private isDragging = false;
  private dragOffset = { x: 0, y: 0 };

  constructor(config: UnifiedPanelSystemConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.isExpanded = this.config.defaultExpanded;

    // Load persisted state
    if (this.config.enablePersistence) {
      this.loadState();
    }

    // Initialize core systems
    this.animationController = new AnimationController();
    this.dockManager = new DockManager(
      { side: this.config.defaultDock, offset: { x: 0, y: 0 } },
      {
        snapThreshold: 200,
        collapsedWidth: 56,
        expandedWidth: this.config.width,
        collapsedHeight: 56,
        expandedHeight: this.config.height,
      },
      (position) => this.onDockChanged(position)
    );

    // Create UI
    this.mainContainer = this.createMainContainer();
    this.dragHandle = this.createDragHandle();
    this.tabBar = new TabBar(
      {
        orientation: this.dockManager.getTabBarOrientation(),
        tabs: [],
        onTabChange: (tabId) => this.switchToPanel(tabId),
      },
      this.animationController
    );
    this.panelContainer = this.createPanelContainer();

    this.assembleUI();
    this.setupEventListeners();
    this.updatePosition();

    console.log('✅ UnifiedPanelSystem initialized');
  }

  /**
   * Create main container
   */
  private createMainContainer(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'unified-panel-system';
    container.id = 'unified-panel-system';
    document.body.appendChild(container);
    return container;
  }

  /**
   * Create drag handle
   */
  private createDragHandle(): HTMLElement {
    const handle = document.createElement('div');
    handle.className = 'unified-panel-drag-handle';
    handle.innerHTML = '<span>⋮⋮</span>';
    handle.title = 'Drag to reposition';
    return handle;
  }

  /**
   * Create panel content container
   */
  private createPanelContainer(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'unified-panel-content';
    return container;
  }

  /**
   * Assemble UI structure
   */
  private assembleUI(): void {
    const dockSide = this.dockManager.getCurrentDock().side;
    
    // Clear container
    this.mainContainer.innerHTML = '';
    
    // Layout based on dock position
    if (dockSide === 'bottom') {
      // Horizontal: tabs on left, content on right
      const tabsWrapper = document.createElement('div');
      tabsWrapper.className = 'unified-panel-tabs-wrapper';
      tabsWrapper.appendChild(this.tabBar.getElement());
      
      this.mainContainer.appendChild(tabsWrapper);
      this.mainContainer.appendChild(this.panelContainer);
      this.mainContainer.appendChild(this.dragHandle);
    } else {
      // Vertical: tabs on top, content on bottom
      this.mainContainer.appendChild(this.dragHandle);
      this.mainContainer.appendChild(this.tabBar.getElement());
      this.mainContainer.appendChild(this.panelContainer);
    }

    // Add collapse toggle
    const collapseButton = document.createElement('button');
    collapseButton.className = 'unified-panel-collapse-toggle';
    collapseButton.innerHTML = this.isExpanded ? '◀' : '▶';
    collapseButton.title = this.isExpanded ? 'Collapse panel' : 'Expand panel';
    collapseButton.addEventListener('click', () => this.toggleExpanded());
    this.mainContainer.appendChild(collapseButton);
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Drag handle
    if (this.config.enableDragging) {
      this.dragHandle.addEventListener('mousedown', (e) => this.onDragStart(e));
      this.dragHandle.addEventListener('touchstart', (e) => this.onDragStart(e), { passive: false });
    }

    // Window resize
    window.addEventListener('resize', () => this.onWindowResize());

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => this.onKeyDown(e));
  }

  /**
   * Register a panel
   */
  registerPanel(definition: PanelDefinition): void {
    this.panels.set(definition.id, definition);

    // Add tab
    const tab: Tab = {
      id: definition.id,
      icon: definition.icon,
      label: definition.label,
      color: definition.color,
    };
    this.tabBar.addTab(tab);

    // Hide panel container initially
    definition.container.style.display = 'none';
    this.panelContainer.appendChild(definition.container);

    // Auto-select first panel
    if (this.panels.size === 1 || definition.id === this.config.defaultTab) {
      this.switchToPanel(definition.id);
    }

    console.log(`📌 Registered panel: ${definition.label}`);
  }

  /**
   * Unregister a panel
   */
  unregisterPanel(panelId: string): void {
    const panel = this.panels.get(panelId);
    if (!panel) return;

    this.tabBar.removeTab(panelId);
    panel.container.remove();
    this.panels.delete(panelId);

    // Switch to another panel if current was removed
    if (this.activePanel === panelId) {
      const firstPanel = Array.from(this.panels.keys())[0];
      if (firstPanel) {
        this.switchToPanel(firstPanel);
      } else {
        this.activePanel = null;
      }
    }
  }

  /**
   * Switch to a specific panel
   */
  private async switchToPanel(panelId: string): Promise<void> {
    const newPanel = this.panels.get(panelId);
    if (!newPanel) return;

    const oldPanelId = this.activePanel;
    const oldPanel = oldPanelId ? this.panels.get(oldPanelId) : null;

    // Hide old panel
    if (oldPanel) {
      if (oldPanel.container.style.display !== 'none') {
        await this.animationController.switchTab(
          oldPanel.container,
          newPanel.container,
          this.dockManager.getCurrentDock().side === 'left' ? 'left' : 'right'
        );
      }
      oldPanel.container.style.display = 'none';
    }

    // Show new panel
    newPanel.container.style.display = 'block';
    this.activePanel = panelId;

    // Update tab selection
    await this.tabBar.selectTab(panelId);

    // Save state
    if (this.config.enablePersistence) {
      this.saveState();
    }

    console.log(`📍 Switched to panel: ${newPanel.label}`);
  }

  /**
   * Toggle expanded/collapsed state
   */
  async toggleExpanded(): Promise<void> {
    const wasExpanded = this.isExpanded;
    this.isExpanded = !wasExpanded;

    const dockSide = this.dockManager.getCurrentDock().side;
    const sizes = this.dockManager.getCurrentSize(false);
    const expandedSizes = this.dockManager.getCurrentSize(true);
    const collapsedSize = dockSide === 'bottom' ? sizes.height : sizes.width;
    const expandedSize = dockSide === 'bottom' ? expandedSizes.height : expandedSizes.width;

    // Update collapse button
    const collapseButton = this.mainContainer.querySelector('.unified-panel-collapse-toggle') as HTMLElement;
    if (collapseButton) {
      collapseButton.innerHTML = this.isExpanded ? '◀' : '▶';
      collapseButton.title = this.isExpanded ? 'Collapse panel' : 'Expand panel';
    }

    if (this.isExpanded) {
      // Expand
      await this.animationController.expandPanel(
        this.mainContainer,
        this.panelContainer,
        dockSide,
        collapsedSize,
        expandedSize
      );
    } else {
      // Collapse
      await this.animationController.collapsePanel(
        this.mainContainer,
        this.panelContainer,
        dockSide,
        collapsedSize
      );
    }

    this.updatePosition();

    // Save state
    if (this.config.enablePersistence) {
      this.saveState();
    }
  }

  /**
   * Update panel position based on dock
   */
  private updatePosition(): void {
    const position = this.dockManager.getPosition(this.isExpanded);
    const size = this.dockManager.getCurrentSize(this.isExpanded);

    Object.assign(this.mainContainer.style, {
      position: 'fixed',
      zIndex: '10000',
      width: `${size.width}px`,
      height: `${size.height}px`,
      ...position,
    });
  }

  /**
   * Handle dock change
   */
  private async onDockChanged(position: DockPosition): Promise<void> {
    console.log(`🔄 Dock changed to: ${position.side}`);

    const oldSide = this.dockManager.getCurrentDock().side;
    const newSide = position.side;

    // Update tab bar orientation
    this.tabBar.setOrientation(this.dockManager.getTabBarOrientation());

    // Reassemble UI for new layout
    this.assembleUI();

    // Animate dock change
    const oldSize = this.dockManager.getCurrentSize(this.isExpanded);
    const sizes = this.dockManager.getCurrentSize(false);
    const expandedSizes = this.dockManager.getCurrentSize(true);

    await this.animationController.changeDock(
      this.mainContainer,
      oldSide,
      newSide,
      oldSide === 'bottom' ? oldSize.height : oldSize.width,
      newSide === 'bottom' ? expandedSizes.height : expandedSizes.width,
      newSide === 'bottom' ? sizes.height : sizes.width
    );

    this.updatePosition();

    // Save state
    if (this.config.enablePersistence) {
      this.dockManager.saveDockPosition();
      this.saveState();
    }
  }

  /**
   * Handle drag start
   */
  private onDragStart(e: MouseEvent | TouchEvent): void {
    if (!this.config.enableDocking) return;

    e.preventDefault();
    const event = 'touches' in e ? e.touches[0] : e;

    this.isDragging = true;
    this.dragOffset = {
      x: event.clientX - this.mainContainer.offsetLeft,
      y: event.clientY - this.mainContainer.offsetTop,
    };

    this.mainContainer.classList.add('dragging');
    this.animationController.startDrag(this.mainContainer);
    this.dockManager.startDrag(event.clientX, event.clientY);

    // Add global listeners
    const moveHandler = (e: MouseEvent | TouchEvent) => this.onDragMove(e);
    const endHandler = (e: MouseEvent | TouchEvent) => this.onDragEnd(e);

    document.addEventListener('mousemove', moveHandler);
    document.addEventListener('mouseup', endHandler);
    document.addEventListener('touchmove', moveHandler, { passive: false });
    document.addEventListener('touchend', endHandler);

    // Store handlers for cleanup
    (this as any)._moveHandler = moveHandler;
    (this as any)._endHandler = endHandler;
  }

  /**
   * Handle drag move
   */
  private onDragMove(e: MouseEvent | TouchEvent): void {
    if (!this.isDragging) return;

    e.preventDefault();
    const event = 'touches' in e ? e.touches[0] : e;

    // Update snap zone highlight
    const snapSide = this.dockManager.updateDrag(event.clientX, event.clientY);
    
    // Move panel with cursor (for visual feedback)
    const x = event.clientX - this.dragOffset.x;
    const y = event.clientY - this.dragOffset.y;
    this.mainContainer.style.transform = `translate(${x}px, ${y}px)`;
  }

  /**
   * Handle drag end
   */
  private onDragEnd(e: MouseEvent | TouchEvent): void {
    if (!this.isDragging) return;

    const event = 'changedTouches' in e ? e.changedTouches[0] : e;

    this.isDragging = false;
    this.mainContainer.classList.remove('dragging');
    this.mainContainer.style.transform = '';
    
    this.animationController.endDrag(this.mainContainer);

    // Snap to dock position
    const newSide = this.dockManager.endDrag(event.clientX, event.clientY);
    
    if (!newSide) {
      // No snap - return to original position
      this.updatePosition();
    }

    // Cleanup listeners
    const moveHandler = (this as any)._moveHandler;
    const endHandler = (this as any)._endHandler;
    if (moveHandler) {
      document.removeEventListener('mousemove', moveHandler);
      document.removeEventListener('touchmove', moveHandler);
    }
    if (endHandler) {
      document.removeEventListener('mouseup', endHandler);
      document.removeEventListener('touchend', endHandler);
    }
  }

  /**
   * Handle window resize
   */
  private onWindowResize(): void {
    this.dockManager.updateSnapZones();
    this.updatePosition();
  }

  /**
   * Handle keyboard shortcuts
   */
  private onKeyDown(e: KeyboardEvent): void {
    // Ctrl+H: Toggle panel
    if (e.ctrlKey && e.key === 'h') {
      e.preventDefault();
      this.toggleExpanded();
    }

    // Tab: Cycle through panels (when panel is focused)
    if (e.key === 'Tab' && document.activeElement?.closest('.unified-panel-system')) {
      e.preventDefault();
      this.cyclePanel(e.shiftKey ? -1 : 1);
    }
  }

  /**
   * Cycle to next/previous panel
   */
  private cyclePanel(direction: 1 | -1): void {
    const panelIds = Array.from(this.panels.keys());
    const currentIndex = panelIds.indexOf(this.activePanel || '');
    const nextIndex = (currentIndex + direction + panelIds.length) % panelIds.length;
    const nextPanelId = panelIds[nextIndex];
    
    if (nextPanelId) {
      this.switchToPanel(nextPanelId);
    }
  }

  /**
   * Save state to localStorage
   */
  private saveState(): void {
    try {
      const state = {
        dock: this.dockManager.getCurrentDock(),
        expanded: this.isExpanded,
        activePanel: this.activePanel,
      };
      localStorage.setItem('unified-panel-state', JSON.stringify(state));
    } catch (error) {
      console.warn('Failed to save panel state:', error);
    }
  }

  /**
   * Load state from localStorage
   */
  private loadState(): void {
    try {
      const saved = localStorage.getItem('unified-panel-state');
      if (saved) {
        const state = JSON.parse(saved);
        if (state.dock) {
          this.dockManager.setDock(state.dock.side);
        }
        if (typeof state.expanded === 'boolean') {
          this.isExpanded = state.expanded;
        }
        if (state.activePanel) {
          this.config.defaultTab = state.activePanel;
        }
      }
    } catch (error) {
      console.warn('Failed to load panel state:', error);
    }
  }

  /**
   * Get panel by ID
   */
  getPanel(panelId: string): PanelDefinition | undefined {
    return this.panels.get(panelId);
  }

  /**
   * Check if panel is active
   */
  isPanelActive(panelId: string): boolean {
    return this.activePanel === panelId;
  }

  /**
   * Get current dock side
   */
  getDockSide(): DockSide {
    return this.dockManager.getCurrentDock().side;
  }

  /**
   * Set dock side programmatically
   */
  setDockSide(side: DockSide): void {
    this.dockManager.setDock(side);
  }

  /**
   * Check if expanded
   */
  isExpanded_(): boolean {
    return this.isExpanded;
  }

  /**
   * Dispose system
   */
  dispose(): void {
    this.animationController.dispose();
    this.dockManager.dispose();
    this.tabBar.dispose();
    this.mainContainer.remove();
    
    console.log('🗑️ UnifiedPanelSystem disposed');
  }
}



