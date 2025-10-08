/**
 * PANEL/core/TabNavigationSystem.ts - Advanced tab navigation with keyboard support
 * Handles tab switching, visual indicators, badges, and accessibility
 */

export interface TabDefinition {
  id: string;
  icon: string;
  label: string;
  color?: string;
  badge?: number | string;
  disabled?: boolean;
}

export interface TabNavigationConfig {
  orientation: 'vertical' | 'horizontal';
  showLabels: boolean;
  showIcons: boolean;
  activeIndicatorStyle: 'underline' | 'background' | 'border';
  keyboardEnabled: boolean;
}

export interface TabNavigationCallbacks {
  onTabChange?: (tabId: string) => void;
  onTabHover?: (tabId: string | null) => void;
  onTabContextMenu?: (tabId: string, event: MouseEvent) => void;
}

const DEFAULT_CONFIG: TabNavigationConfig = {
  orientation: 'vertical',
  showLabels: true,
  showIcons: true,
  activeIndicatorStyle: 'background',
  keyboardEnabled: true,
};

/**
 * TabNavigationSystem - Rich tab navigation with animations
 */
export class TabNavigationSystem {
  private config: TabNavigationConfig;
  private callbacks: TabNavigationCallbacks;
  private tabs: Map<string, TabDefinition> = new Map();
  private tabOrder: string[] = [];
  private activeTabId: string | null = null;
  private container: HTMLElement;
  private tabElements: Map<string, HTMLElement> = new Map();
  private activeIndicator: HTMLElement;
  
  constructor(
    config: Partial<TabNavigationConfig> = {},
    callbacks: TabNavigationCallbacks = {}
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.callbacks = callbacks;
    
    this.container = this.createContainer();
    this.activeIndicator = this.createActiveIndicator();
    this.container.appendChild(this.activeIndicator);
    
    if (this.config.keyboardEnabled) {
      this.setupKeyboardNavigation();
    }
  }
  
  /**
   * Create tab container
   */
  private createContainer(): HTMLElement {
    const container = document.createElement('div');
    container.className = `tab-navigation tab-${this.config.orientation}`;
    container.setAttribute('role', 'tablist');
    container.setAttribute('aria-label', 'Panel navigation');
    return container;
  }
  
  /**
   * Create active tab indicator
   */
  private createActiveIndicator(): HTMLElement {
    const indicator = document.createElement('div');
    indicator.className = 'tab-active-indicator';
    indicator.style.position = 'absolute';
    indicator.style.transition = 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)';
    indicator.style.pointerEvents = 'none';
    return indicator;
  }
  
  /**
   * Add tab
   */
  addTab(tab: TabDefinition): void {
    if (this.tabs.has(tab.id)) {
      console.warn(`Tab ${tab.id} already exists`);
      return;
    }
    
    this.tabs.set(tab.id, tab);
    this.tabOrder.push(tab.id);
    
    const element = this.createTabElement(tab);
    this.tabElements.set(tab.id, element);
    this.container.appendChild(element);
    
    // Set first tab as active
    if (this.tabs.size === 1) {
      this.setActiveTab(tab.id);
    }
  }
  
  /**
   * Create tab element
   */
  private createTabElement(tab: TabDefinition): HTMLElement {
    const element = document.createElement('button');
    element.className = 'tab-item';
    element.setAttribute('role', 'tab');
    element.setAttribute('aria-label', tab.label);
    element.setAttribute('data-tab-id', tab.id);
    element.disabled = tab.disabled ?? false;
    
    // Icon
    if (this.config.showIcons && tab.icon) {
      const icon = document.createElement('span');
      icon.className = 'tab-icon';
      icon.textContent = tab.icon;
      element.appendChild(icon);
    }
    
    // Label
    if (this.config.showLabels) {
      const label = document.createElement('span');
      label.className = 'tab-label';
      label.textContent = tab.label;
      element.appendChild(label);
    }
    
    // Badge
    if (tab.badge !== undefined) {
      const badge = document.createElement('span');
      badge.className = 'tab-badge';
      badge.textContent = String(tab.badge);
      element.appendChild(badge);
    }
    
    // Custom color
    if (tab.color) {
      element.style.setProperty('--tab-color', tab.color);
    }
    
    // Event listeners
    element.addEventListener('click', () => this.handleTabClick(tab.id));
    element.addEventListener('mouseenter', () => this.callbacks.onTabHover?.(tab.id));
    element.addEventListener('mouseleave', () => this.callbacks.onTabHover?.(null));
    element.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.callbacks.onTabContextMenu?.(tab.id, e);
    });
    
    return element;
  }
  
  /**
   * Handle tab click
   */
  private handleTabClick(tabId: string): void {
    if (this.activeTabId === tabId) return;
    
    const tab = this.tabs.get(tabId);
    if (!tab || tab.disabled) return;
    
    this.setActiveTab(tabId);
    this.callbacks.onTabChange?.(tabId);
  }
  
  /**
   * Set active tab
   */
  setActiveTab(tabId: string): void {
    if (!this.tabs.has(tabId)) {
      console.warn(`Tab ${tabId} not found`);
      return;
    }
    
    // Update previous active tab
    if (this.activeTabId) {
      const prevElement = this.tabElements.get(this.activeTabId);
      if (prevElement) {
        prevElement.classList.remove('active');
        prevElement.setAttribute('aria-selected', 'false');
        prevElement.setAttribute('tabindex', '-1');
      }
    }
    
    // Update new active tab
    this.activeTabId = tabId;
    const element = this.tabElements.get(tabId);
    if (element) {
      element.classList.add('active');
      element.setAttribute('aria-selected', 'true');
      element.setAttribute('tabindex', '0');
      element.focus({ preventScroll: true });
      
      // Update indicator position
      this.updateActiveIndicator(element);
    }
  }
  
  /**
   * Update active indicator position
   */
  private updateActiveIndicator(element: HTMLElement): void {
    const rect = element.getBoundingClientRect();
    const containerRect = this.container.getBoundingClientRect();
    
    if (this.config.orientation === 'vertical') {
      this.activeIndicator.style.left = '0';
      this.activeIndicator.style.top = `${rect.top - containerRect.top}px`;
      this.activeIndicator.style.width = '100%';
      this.activeIndicator.style.height = `${rect.height}px`;
    } else {
      this.activeIndicator.style.left = `${rect.left - containerRect.left}px`;
      this.activeIndicator.style.top = '0';
      this.activeIndicator.style.width = `${rect.width}px`;
      this.activeIndicator.style.height = '100%';
    }
  }
  
  /**
   * Remove tab
   */
  removeTab(tabId: string): void {
    const element = this.tabElements.get(tabId);
    if (element) {
      element.remove();
      this.tabElements.delete(tabId);
    }
    
    this.tabs.delete(tabId);
    this.tabOrder = this.tabOrder.filter(id => id !== tabId);
    
    // If removed tab was active, switch to first tab
    if (this.activeTabId === tabId && this.tabOrder.length > 0) {
      this.setActiveTab(this.tabOrder[0]);
      this.callbacks.onTabChange?.(this.tabOrder[0]);
    }
  }
  
  /**
   * Update tab badge
   */
  updateBadge(tabId: string, badge: number | string | undefined): void {
    const tab = this.tabs.get(tabId);
    if (!tab) return;
    
    tab.badge = badge;
    
    const element = this.tabElements.get(tabId);
    if (!element) return;
    
    let badgeElement = element.querySelector('.tab-badge') as HTMLElement;
    
    if (badge === undefined) {
      // Remove badge
      if (badgeElement) {
        badgeElement.remove();
      }
    } else {
      // Update or create badge
      if (!badgeElement) {
        badgeElement = document.createElement('span');
        badgeElement.className = 'tab-badge';
        element.appendChild(badgeElement);
      }
      badgeElement.textContent = String(badge);
    }
  }
  
  /**
   * Setup keyboard navigation
   */
  private setupKeyboardNavigation(): void {
    this.container.addEventListener('keydown', (e) => {
      if (!this.activeTabId) return;
      
      const currentIndex = this.tabOrder.indexOf(this.activeTabId);
      let nextIndex = currentIndex;
      
      if (this.config.orientation === 'vertical') {
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          nextIndex = Math.max(0, currentIndex - 1);
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          nextIndex = Math.min(this.tabOrder.length - 1, currentIndex + 1);
        }
      } else {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          nextIndex = Math.max(0, currentIndex - 1);
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          nextIndex = Math.min(this.tabOrder.length - 1, currentIndex + 1);
        }
      }
      
      // Home/End keys
      if (e.key === 'Home') {
        e.preventDefault();
        nextIndex = 0;
      } else if (e.key === 'End') {
        e.preventDefault();
        nextIndex = this.tabOrder.length - 1;
      }
      
      if (nextIndex !== currentIndex) {
        const nextTabId = this.tabOrder[nextIndex];
        this.setActiveTab(nextTabId);
        this.callbacks.onTabChange?.(nextTabId);
      }
    });
  }
  
  /**
   * Set orientation
   */
  setOrientation(orientation: 'vertical' | 'horizontal'): void {
    this.config.orientation = orientation;
    this.container.className = `tab-navigation tab-${orientation}`;
    
    if (this.activeTabId) {
      const element = this.tabElements.get(this.activeTabId);
      if (element) {
        requestAnimationFrame(() => this.updateActiveIndicator(element));
      }
    }
  }
  
  /**
   * Get active tab ID
   */
  getActiveTabId(): string | null {
    return this.activeTabId;
  }
  
  /**
   * Get all tabs
   */
  getAllTabs(): TabDefinition[] {
    return this.tabOrder.map(id => this.tabs.get(id)!);
  }
  
  /**
   * Get container element
   */
  getElement(): HTMLElement {
    return this.container;
  }
  
  /**
   * Dispose
   */
  dispose(): void {
    this.container.remove();
    this.tabs.clear();
    this.tabElements.clear();
    this.tabOrder = [];
  }
}

