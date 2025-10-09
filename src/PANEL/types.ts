/**
 * PANEL/types.ts - Shared types for unified dashboard system
 */

import type { Pane } from 'tweakpane';
import type { FlowConfig } from '../config';

/**
 * Tab options for dashboard registration
 */
export interface TabOptions {
  id: string;
  title: string;
  icon?: string;
  description?: string;
  badge?: string;
}

/**
 * Base callbacks interface - extend this per tab
 */
export interface BaseCallbacks {
  [key: string]: ((...args: any[]) => void) | undefined;
}

/**
 * Abstract base class for all tab panels
 * Provides consistent interface and shared utilities
 */
export abstract class BaseTab {
  protected pane: Pane;
  protected config: FlowConfig;
  protected callbacks: BaseCallbacks;

  constructor(pane: Pane, config: FlowConfig, callbacks: BaseCallbacks = {}) {
    this.pane = pane;
    this.config = config;
    this.callbacks = callbacks;
  }

  /**
   * Build the tab UI - must be implemented by subclass
   */
  abstract buildUI(): void;

  /**
   * Update metrics/readonly displays - optional override
   */
  updateMetrics?(data: any): void;

  /**
   * Cleanup resources - optional override
   */
  dispose?(): void;

  /**
   * Helper: Create folder with consistent styling
   */
  protected createFolder(title: string, expanded: boolean = false): any {
    return this.pane.addFolder({
      title,
      expanded,
    });
  }

  /**
   * Helper: Create separator
   */
  protected createSeparator(): any {
    return this.pane.addBlade({ view: 'separator' });
  }

  /**
   * Helper: Create button with consistent styling
   */
  protected createButton(title: string, onClick: () => void): any {
    return this.pane.addButton({ title }).on('click', onClick);
  }

  /**
   * Helper: Create binding with optional change callback
   */
  protected createBinding(
    object: any,
    key: string,
    options: any = {},
    onChange?: (value: any) => void
  ): any {
    const binding = this.pane.addBinding(object, key, options);
    if (onChange) {
      binding.on('change', (ev: any) => onChange(ev.value));
    }
    return binding;
  }

  /**
   * Helper: Create list (dropdown) with change callback
   */
  protected createList(
    label: string,
    value: any,
    options: Record<string, any>,
    onChange: (value: any) => void
  ): any {
    return this.pane
      .addBlade({
        view: 'list',
        label,
        value,
        options: Object.entries(options).map(([text, value]) => ({ text, value })),
      })
      .on('change', (ev: any) => onChange(ev.value));
  }

  /**
   * Get the pane instance
   */
  getPane(): Pane {
    return this.pane;
  }
}


