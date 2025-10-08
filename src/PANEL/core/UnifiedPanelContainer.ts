/**
 * PANEL/core/UnifiedPanelContainer.ts - Main unified panel controller
 * Orchestrates all panels, tabs, docking, themes, and state
 */

import type { Pane } from 'tweakpane';
import { AdaptiveDockingSystem, type DockSide, type DockPosition } from './AdaptiveDockingSystem';
import { TabNavigationSystem, type TabDefinition } from './TabNavigationSystem';
import { ThemeEngine, type ThemeConfig } from './ThemeEngine';
import { StateManager } from './StateManager';
import { AnimationController } from './AnimationController';

export interface PanelDefinition {
  id: string;
  icon: string;
  label: string;
  pane: Pane;
  container: HTMLElement;
  color?: string;
}

export interface UnifiedPanelConfig {
  defaultDock?: DockSide;
  defaultExpanded?: boolean;
  defaultTab?: string;
  defaultTheme?: string;
  width?: number;
  height?: number;
  enableDragging?: boolean;
  enableDocking?: boolean;
  enablePersistence?: boolean;
  enableKeyboardShortcuts?: boolean;
}

const DEFAULT_CONFIG: Required<UnifiedPanelConfig> = {
  defaultDock: 'right',
  defaultExpanded: true,
  defaultTab: '',
  defaultTheme: 'cosmic-blue',
  width: 360,
  height: 400,
  enableDragging: true,
  enableDocking: true,
  enablePersistence: true,
  enableKeyboardShortcuts: true,
};

/**
 * UnifiedPanelContainer - Main orchestrator for unified panel system
 */
export class UnifiedPanelContainer {
  private config: Required<UnifiedPanelConfig>;
  private panels: Map<string, PanelDefinition> = new Map();
  private panelOrder: string[] = [];
  
  // Core systems
  private dockingSystem: AdaptiveDockingSystem;
  private tabNavigation: TabNavigationSystem;
  private themeEngine: ThemeEngine;
  private stateManager: StateManager;
  private animationController: AnimationController;
  
  // UI elements
  private mainContainer: HTMLElement;
  private dragHandle: HTMLElement;
  private contentContainer: HTMLElement;
  private collapseButton: HTMLElement;
  private activePanel: string | null = null;
  private isExpanded: boolean;
  
  // Drag state
  private isDragging = false;
  private dragOffset = { x: 0, y: 0 };
  private magneticGlow: HTMLElement | null = null;
  
  constructor(config: Partial<UnifiedPanelConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.isExpanded = this.config.defaultExpanded;
    
    // Initialize core systems
    this.animationController = new AnimationController();
    this.stateManager = new StateManager(this.config.enablePersistence);
    this.themeEngine = new ThemeEngine(this.config.defaultTheme);
    
    this.dockingSystem = new AdaptiveDockingSystem(
      this.loadDockPosition(),
      {
        snapThreshold: 150,
        magneticZoneSize: 100,
        collapsedWidth: 56,
        expandedWidth: this.config.width,
        collapsedHeight: 56,
        expandedHeight: this.config.height,
        minMargin: 16,
      },
      {
        onDockChange: (position) => this.onDockChanged(position),
        onEnterMagneticZone: (side) => this.showMagneticFeedback(side),
        onLeaveMagneticZone: () => this.hideMagneticFeedback(),
      }
    );
    
    this.tabNavigation = new TabNavigationSystem(
      {
        orientation: this.dockingSystem.getTabBarOrientation(),
        showLabels: this.isExpanded,
        showIcons: true,
        activeIndicatorStyle: 'background',
        keyboardEnabled: this.config.enableKeyboardShortcuts,
      },
      {
        onTabChange: (tabId) => this.switchPanel(tabId),
      }
    );
    
    // Create UI
    this.mainContainer = this.createMainContainer();
    this.dragHandle = this.createDragHandle();
    this.contentContainer = this.createContentContainer();
    this.collapseButton = this.createCollapseButton();
    
    this.assembleUI();
    this.setupEventListeners();
    this.updatePosition();
    
    console.log('✅ UnifiedPanelContainer initialized');
  }
  
  /**
   * Create main container
   */
  private createMainContainer(): HTMLElement {
    const container = document.createElement('div');
    container.id = 'unified-panel-container';
    container.className = 'unified-panel-container';
    document.body.appendChild(container);
    return container;
  }
  
  /**
   * Create drag handle
   */
  private createDragHandle(): HTMLElement {
    const handle = document.createElement('div');
    handle.className = 'unified-panel-drag-handle';
    handle.innerHTML = '<span class="drag-icon">⋮⋮</span>';
    handle.title = 'Drag to reposition (Snap to edges)';
    return handle;
  }
  
  /**
   * Create content container
   */
  private createContentContainer(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'unified-panel-content';
    return container;
  }
  
  /**
   * Create collapse button
   */
  private createCollapseButton(): HTMLElement {
    const button = document.createElement('button');
    button.className = 'unified-panel-collapse-btn';
    button.innerHTML = this.getCollapseIcon();
    button.title = this.isExpanded ? 'Collapse panel' : 'Expand panel';
    button.setAttribute('aria-label', button.title);
    return button;
  }
  
  /**
   * Get collapse icon based on dock position
   */
  private getCollapseIcon(): string {
    const dock = this.dockingSystem.getCurrentDock();
    if (!this.isExpanded) return '▶';
    
    switch (dock.side) {
      case 'left': return '◀';
      case 'right': return '▶';
      case 'bottom': return '▼';
      default: return '◀';
    }
  }
  
  /**
   * Assemble UI structure
   */
  private assembleUI(): void {
    this.mainContainer.innerHTML = '';
    
    const dock = this.dockingSystem.getCurrentDock();
    
    // Create wrapper for tab bar
    const tabWrapper = document.createElement('div');
    tabWrapper.className = 'unified-panel-tabs-wrapper';
    tabWrapper.appendChild(this.tabNavigation.getElement());
    
    // Layout based on dock
    if (dock.side === 'bottom') {
      // Horizontal: drag handle, tabs, content, collapse
      this.mainContainer.appendChild(this.dragHandle);
      this.mainContainer.appendChild(tabWrapper);
      this.mainContainer.appendChild(this.contentContainer);
      this.mainContainer.appendChild(this.collapseButton);
    } else {
      // Vertical: drag handle, tabs, content, collapse
      this.mainContainer.appendChild(this.dragHandle);
      this.mainContainer.appendChild(tabWrapper);
      this.mainContainer.appendChild(this.contentContainer);
      this.mainContainer.appendChild(this.collapseButton);
    }
    
    // Update container classes
    this.mainContainer.classList.toggle('expanded', this.isExpanded);
    this.mainContainer.classList.toggle('collapsed', !this.isExpanded);
    this.mainContainer.setAttribute('data-dock', dock.side);
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
    
    // Collapse button
    this.collapseButton.addEventListener('click', () => this.toggleExpanded());
    
    // Window resize
    window.addEventListener('resize', () => this.onWindowResize());
    
    // Keyboard shortcuts
    if (this.config.enableKeyboardShortcuts) {
      document.addEventListener('keydown', (e) => this.onKeyDown(e));
    }
  }
  
  /**
   * Handle drag start
   */
  private onDragStart(e: MouseEvent | TouchEvent): void {
    const event = 'touches' in e ? e.touches[0] : e;
    
    this.isDragging = true;
    this.mainContainer.classList.add('dragging');
    
    const rect = this.mainContainer.getBoundingClientRect();
    this.dragOffset = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
    
    // Attach global move/end listeners
    const onMove = (e: MouseEvent | TouchEvent) => this.onDragMove(e);
    const onEnd = (e: MouseEvent | TouchEvent) => this.onDragEnd(e, onMove, onEnd);
    
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onEnd);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onEnd);
    
    e.preventDefault();
  }
  
  /**
   * Handle drag move
   */
  private onDragMove(e: MouseEvent | TouchEvent): void {
    if (!this.isDragging) return;
    
    const event = 'touches' in e ? e.touches[0] : e;
    
    // Update position
    this.dockingSystem.updatePosition(event.clientX, event.clientY);
    
    // Move container (free-form)
    const left = event.clientX - this.dragOffset.x;
    const top = event.clientY - this.dragOffset.y;
    
    this.mainContainer.style.left = `${left}px`;
    this.mainContainer.style.top = `${top}px`;
    this.mainContainer.style.right = 'auto';
    this.mainContainer.style.bottom = 'auto';
    this.mainContainer.style.transform = 'none';
    
    e.preventDefault();
  }
  
  /**
   * Handle drag end
   */
  private onDragEnd(
    e: MouseEvent | TouchEvent,
    onMove: (e: MouseEvent | TouchEvent) => void,
    onEnd: (e: MouseEvent | TouchEvent) => void
  ): void {
    if (!this.isDragging) return;
    
    const event = 'touches' in e ? e.changedTouches[0] : e;
    
    // Snap to nearest edge
    const position = this.dockingSystem.snapToEdge(
      event.clientX,
      event.clientY,
      this.isExpanded
    );
    
    this.isDragging = false;
    this.mainContainer.classList.remove('dragging');
    
    // Animate to snapped position
    this.animateToDockedPosition();
    
    // Remove global listeners
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onEnd);
    document.removeEventListener('touchmove', onMove);
    document.removeEventListener('touchend', onEnd);
    
    // Save state
    this.saveDockPosition();
  }
  
  /**
   * Animate to docked position
   */
  private animateToDockedPosition(): void {
    this.updatePosition(true);
  }
  
  /**
   * Update position based on dock
   */
  private updatePosition(animate = false): void {
    const style = this.dockingSystem.getComputedStyle(this.isExpanded);
    
    if (animate) {
      this.mainContainer.style.transition = 'all 400ms cubic-bezier(0.34, 1.56, 0.64, 1)';
    } else {
      this.mainContainer.style.transition = 'none';
    }
    
    Object.assign(this.mainContainer.style, style);
    
    if (animate) {
      setTimeout(() => {
        this.mainContainer.style.transition = '';
      }, 400);
    }
  }
  
  /**
   * Show magnetic feedback
   */
  private showMagneticFeedback(side: DockSide): void {
    if (!this.magneticGlow) {
      this.magneticGlow = document.createElement('div');
      this.magneticGlow.className = 'unified-panel-magnetic-glow';
      document.body.appendChild(this.magneticGlow);
    }
    
    this.magneticGlow.classList.add('active');
    this.magneticGlow.setAttribute('data-side', side);
  }
  
  /**
   * Hide magnetic feedback
   */
  private hideMagneticFeedback(): void {
    if (this.magneticGlow) {
      this.magneticGlow.classList.remove('active');
    }
  }
  
  /**
   * Toggle expanded/collapsed
   */
  toggleExpanded(): void {
    this.isExpanded = !this.isExpanded;
    
    this.mainContainer.classList.toggle('expanded', this.isExpanded);
    this.mainContainer.classList.toggle('collapsed', !this.isExpanded);
    
    this.collapseButton.innerHTML = this.getCollapseIcon();
    this.collapseButton.title = this.isExpanded ? 'Collapse panel' : 'Expand panel';
    
    this.tabNavigation.setOrientation(this.dockingSystem.getTabBarOrientation());
    
    this.updatePosition(true);
    this.saveState();
  }
  
  /**
   * Register panel
   */
  registerPanel(definition: PanelDefinition): void {
    this.panels.set(definition.id, definition);
    this.panelOrder.push(definition.id);
    
    // Add tab
    const tab: TabDefinition = {
      id: definition.id,
      icon: definition.icon,
      label: definition.label,
      color: definition.color,
    };
    this.tabNavigation.addTab(tab);
    
    // Add content to container (hidden by default)
    definition.container.style.display = 'none';
    this.contentContainer.appendChild(definition.container);
    
    // Set first panel as active
    if (this.panels.size === 1) {
      this.switchPanel(definition.id);
    }
  }
  
  /**
   * Switch to panel
   */
  switchPanel(panelId: string): void {
    if (!this.panels.has(panelId)) return;
    
    // Hide previous panel
    if (this.activePanel) {
      const prevPanel = this.panels.get(this.activePanel);
      if (prevPanel) {
        prevPanel.container.style.display = 'none';
      }
    }
    
    // Show new panel
    this.activePanel = panelId;
    const panel = this.panels.get(panelId);
    if (panel) {
      panel.container.style.display = 'block';
    }
    
    this.saveState();
  }
  
  /**
   * Handle dock changed
   */
  private onDockChanged(position: DockPosition): void {
    this.tabNavigation.setOrientation(this.dockingSystem.getTabBarOrientation());
    this.collapseButton.innerHTML = this.getCollapseIcon();
    this.mainContainer.setAttribute('data-dock', position.side);
    this.assembleUI();
    
    // Re-append panel containers
    this.panels.forEach(panel => {
      this.contentContainer.appendChild(panel.container);
    });
    
    // Show active panel
    if (this.activePanel) {
      this.switchPanel(this.activePanel);
    }
  }
  
  /**
   * Handle window resize
   */
  private onWindowResize(): void {
    this.updatePosition();
  }
  
  /**
   * Handle keyboard shortcuts
   */
  private onKeyDown(e: KeyboardEvent): void {
    // Ctrl/Cmd + B: Toggle expanded
    if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
      e.preventDefault();
      this.toggleExpanded();
    }
    
    // Ctrl/Cmd + [1-5]: Switch tabs
    if ((e.ctrlKey || e.metaKey) && e.key >= '1' && e.key <= '5') {
      e.preventDefault();
      const index = parseInt(e.key) - 1;
      if (index < this.panelOrder.length) {
        const panelId = this.panelOrder[index];
        this.tabNavigation.setActiveTab(panelId);
        this.switchPanel(panelId);
      }
    }
  }
  
  /**
   * Load dock position from state
   */
  private loadDockPosition(): DockPosition {
    const saved = this.stateManager.load('dockPosition');
    return saved || { side: this.config.defaultDock, offset: { x: 0, y: 0 } };
  }
  
  /**
   * Save dock position to state
   */
  private saveDockPosition(): void {
    const position = this.dockingSystem.getCurrentDock();
    this.stateManager.save('dockPosition', position);
  }
  
  /**
   * Save full state
   */
  private saveState(): void {
    this.stateManager.save('state', {
      isExpanded: this.isExpanded,
      activePanel: this.activePanel,
      dockPosition: this.dockingSystem.getCurrentDock(),
      themeId: this.themeEngine.getCurrentThemeId(),
    });
  }
  
  /**
   * Get theme engine
   */
  getThemeEngine(): ThemeEngine {
    return this.themeEngine;
  }
  
  /**
   * Get container element
   */
  getElement(): HTMLElement {
    return this.mainContainer;
  }
  
  /**
   * Dispose
   */
  dispose(): void {
    this.mainContainer.remove();
    this.tabNavigation.dispose();
    this.themeEngine.dispose();
    this.panels.clear();
    
    if (this.magneticGlow) {
      this.magneticGlow.remove();
    }
  }
}

