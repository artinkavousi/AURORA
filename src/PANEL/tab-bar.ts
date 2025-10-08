/**
 * PANEL/tab-bar.ts - Vertical/Horizontal tab navigation component
 * Handles tab rendering, selection, and visual feedback
 */

import { AnimationController } from './animation-controller';

export interface Tab {
  id: string;
  icon: string;
  label: string;
  color?: string;
}

export interface TabBarConfig {
  orientation: 'vertical' | 'horizontal';
  tabs: Tab[];
  activeTabId?: string;
  onTabChange?: (tabId: string) => void;
}

/**
 * TabBar - Visual tab navigation component
 */
export class TabBar {
  private container: HTMLElement;
  private tabs: Tab[];
  private activeTabId: string;
  private orientation: 'vertical' | 'horizontal';
  private onTabChange?: (tabId: string) => void;
  private animationController: AnimationController;
  private indicatorElement: HTMLElement;
  private tabElements: Map<string, HTMLElement> = new Map();

  constructor(config: TabBarConfig, animationController: AnimationController) {
    this.tabs = config.tabs;
    this.activeTabId = config.activeTabId || config.tabs[0]?.id;
    this.orientation = config.orientation;
    this.onTabChange = config.onTabChange;
    this.animationController = animationController;

    this.container = this.createContainer();
    this.indicatorElement = this.createIndicator();
    this.render();
  }

  /**
   * Create main container
   */
  private createContainer(): HTMLElement {
    const container = document.createElement('div');
    container.className = `unified-panel-tabs unified-panel-tabs-${this.orientation}`;
    return container;
  }

  /**
   * Create active tab indicator
   */
  private createIndicator(): HTMLElement {
    const indicator = document.createElement('div');
    indicator.className = 'unified-panel-tab-indicator';
    return indicator;
  }

  /**
   * Render tab bar
   */
  private render(): void {
    this.container.innerHTML = '';
    this.tabElements.clear();

    // Add indicator
    this.container.appendChild(this.indicatorElement);

    // Create tab buttons
    this.tabs.forEach((tab, index) => {
      const tabElement = this.createTabElement(tab, index);
      this.container.appendChild(tabElement);
      this.tabElements.set(tab.id, tabElement);
    });

    // Position indicator on active tab
    this.updateIndicator(this.activeTabId, false);
  }

  /**
   * Create individual tab element
   */
  private createTabElement(tab: Tab, index: number): HTMLElement {
    const button = document.createElement('button');
    button.className = 'unified-panel-tab';
    button.dataset.tabId = tab.id;
    button.setAttribute('aria-label', tab.label);
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-selected', tab.id === this.activeTabId ? 'true' : 'false');

    // Icon
    const icon = document.createElement('span');
    icon.className = 'unified-panel-tab-icon';
    icon.textContent = tab.icon;
    button.appendChild(icon);

    // Label (only visible in vertical mode or on hover in horizontal)
    const label = document.createElement('span');
    label.className = 'unified-panel-tab-label';
    label.textContent = tab.label;
    button.appendChild(label);

    // Active state
    if (tab.id === this.activeTabId) {
      button.classList.add('active');
      this.animationController.glowTab(button);
    }

    // Click handler
    button.addEventListener('click', () => {
      this.selectTab(tab.id);
    });

    // Hover effect
    button.addEventListener('mouseenter', () => {
      if (tab.id !== this.activeTabId) {
        button.style.transform = 'scale(1.05)';
      }
    });

    button.addEventListener('mouseleave', () => {
      if (tab.id !== this.activeTabId) {
        button.style.transform = 'scale(1)';
      }
    });

    return button;
  }

  /**
   * Select a tab
   */
  async selectTab(tabId: string, animate = true): Promise<void> {
    if (tabId === this.activeTabId) return;

    const oldTabId = this.activeTabId;
    this.activeTabId = tabId;

    // Update ARIA attributes
    this.tabElements.forEach((element, id) => {
      element.setAttribute('aria-selected', id === tabId ? 'true' : 'false');
      if (id === tabId) {
        element.classList.add('active');
      } else {
        element.classList.remove('active');
      }
    });

    // Animate indicator
    if (animate) {
      await this.updateIndicator(tabId, true);
    } else {
      this.updateIndicator(tabId, false);
    }

    // Start glow on new active tab
    const newTabElement = this.tabElements.get(tabId);
    if (newTabElement) {
      this.animationController.glowTab(newTabElement);
    }

    // Cancel glow on old tab
    const oldTabElement = this.tabElements.get(oldTabId);
    if (oldTabElement) {
      this.animationController.cancel(`tab-glow-${oldTabElement.id}`);
    }

    // Notify listener
    this.onTabChange?.(tabId);
  }

  /**
   * Update indicator position
   */
  private async updateIndicator(tabId: string, animate: boolean): Promise<void> {
    const tabElement = this.tabElements.get(tabId);
    if (!tabElement) return;

    const tabRect = tabElement.getBoundingClientRect();
    const containerRect = this.container.getBoundingClientRect();

    const fromPosition = {
      x: parseFloat(this.indicatorElement.style.transform?.match(/translateX\(([-\d.]+)px\)/)?.[1] || '0'),
      y: parseFloat(this.indicatorElement.style.transform?.match(/translateY\(([-\d.]+)px\)/)?.[1] || '0'),
    };

    const toPosition = {
      x: tabRect.left - containerRect.left,
      y: tabRect.top - containerRect.top,
    };

    // Update indicator size
    if (this.orientation === 'vertical') {
      this.indicatorElement.style.width = `${tabRect.width}px`;
      this.indicatorElement.style.height = `${tabRect.height}px`;
    } else {
      this.indicatorElement.style.width = `${tabRect.width}px`;
      this.indicatorElement.style.height = `${tabRect.height}px`;
    }

    if (animate) {
      await this.animationController.slideTabIndicator(
        this.indicatorElement,
        fromPosition,
        toPosition
      );
    } else {
      this.indicatorElement.style.transform = `translate(${toPosition.x}px, ${toPosition.y}px)`;
    }
  }

  /**
   * Change orientation
   */
  setOrientation(orientation: 'vertical' | 'horizontal'): void {
    if (orientation === this.orientation) return;

    this.orientation = orientation;
    this.container.className = `unified-panel-tabs unified-panel-tabs-${orientation}`;
    this.updateIndicator(this.activeTabId, false);
  }

  /**
   * Get active tab ID
   */
  getActiveTabId(): string {
    return this.activeTabId;
  }

  /**
   * Get container element
   */
  getElement(): HTMLElement {
    return this.container;
  }

  /**
   * Add a new tab
   */
  addTab(tab: Tab): void {
    this.tabs.push(tab);
    const tabElement = this.createTabElement(tab, this.tabs.length - 1);
    this.container.appendChild(tabElement);
    this.tabElements.set(tab.id, tabElement);
  }

  /**
   * Remove a tab
   */
  removeTab(tabId: string): void {
    const index = this.tabs.findIndex(t => t.id === tabId);
    if (index === -1) return;

    this.tabs.splice(index, 1);
    const element = this.tabElements.get(tabId);
    if (element) {
      element.remove();
      this.tabElements.delete(tabId);
    }

    // If removed tab was active, select first tab
    if (tabId === this.activeTabId && this.tabs.length > 0) {
      this.selectTab(this.tabs[0].id, false);
    }
  }

  /**
   * Enable/disable tab
   */
  setTabEnabled(tabId: string, enabled: boolean): void {
    const element = this.tabElements.get(tabId);
    if (element) {
      (element as HTMLButtonElement).disabled = !enabled;
      if (!enabled) {
        element.classList.add('disabled');
      } else {
        element.classList.remove('disabled');
      }
    }
  }

  /**
   * Update tab badge (count/notification)
   */
  setTabBadge(tabId: string, badge?: number | string): void {
    const element = this.tabElements.get(tabId);
    if (!element) return;

    let badgeElement = element.querySelector('.unified-panel-tab-badge') as HTMLElement;
    
    if (!badge) {
      // Remove badge
      if (badgeElement) {
        badgeElement.remove();
      }
      return;
    }

    if (!badgeElement) {
      // Create badge
      badgeElement = document.createElement('span');
      badgeElement.className = 'unified-panel-tab-badge';
      element.appendChild(badgeElement);
    }

    badgeElement.textContent = String(badge);
  }

  /**
   * Dispose tab bar
   */
  dispose(): void {
    this.container.remove();
    this.tabElements.clear();
  }
}



