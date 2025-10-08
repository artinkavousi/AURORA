/**
 * PANEL/DashboardV2.ts - New unified dashboard system
 * Complete redesign with elegant glassmorphism and intelligent docking
 */

import { Pane } from 'tweakpane';
import * as EssentialsPlugin from '@tweakpane/plugin-essentials';
import { UnifiedPanelContainer, type PanelDefinition, type UnifiedPanelConfig } from './core/UnifiedPanelContainer';
import type { ThemeEngine } from './core/ThemeEngine';

export interface DashboardV2Options extends Partial<UnifiedPanelConfig> {
  autoInjectStyles?: boolean;
}

/**
 * DashboardV2 - Next-generation unified panel system
 */
export class DashboardV2 {
  private unifiedPanel: UnifiedPanelContainer;
  private panels: Map<string, PanelDefinition> = new Map();
  private styleElement: HTMLStyleElement | null = null;
  
  constructor(options: DashboardV2Options = {}) {
    const {
      autoInjectStyles = true,
      ...unifiedConfig
    } = options;
    
    // Inject styles
    if (autoInjectStyles) {
      this.injectStyles();
    }
    
    // Create unified panel system
    this.unifiedPanel = new UnifiedPanelContainer(unifiedConfig);
    
    console.log('✅ DashboardV2 initialized with unified panel system');
  }
  
  /**
   * Inject CSS styles
   */
  private injectStyles(): void {
    // Remove existing
    const existing = document.getElementById('dashboard-v2-styles');
    if (existing) {
      existing.remove();
    }
    
    // Load CSS file
    const link = document.createElement('link');
    link.id = 'dashboard-v2-styles';
    link.rel = 'stylesheet';
    link.href = '/src/PANEL/core/unified-panel.css';
    document.head.appendChild(link);
    
    // Also inject legacy glassmorphism styles for Tweakpane
    this.injectTweakpaneStyles();
  }
  
  /**
   * Inject Tweakpane glassmorphism styles
   */
  private injectTweakpaneStyles(): void {
    const existing = document.getElementById('tweakpane-glass-styles');
    if (existing) return;
    
    const style = document.createElement('style');
    style.id = 'tweakpane-glass-styles';
    style.textContent = `
      /* Enhanced Tweakpane styling for unified panels */
      .unified-panel-content .tp-dfwv,
      .unified-panel-content .tp-rotv {
        background: rgba(255, 255, 255, 0.02) !important;
        border: 1px solid var(--color-border-light) !important;
        border-radius: var(--radius-md) !important;
      }
      
      .unified-panel-content .tp-fldv_t {
        background: linear-gradient(
          135deg,
          rgba(255, 255, 255, 0.05) 0%,
          transparent 100%
        );
        border-bottom: 1px solid var(--color-border-light);
        padding: var(--space-md) !important;
      }
      
      .unified-panel-content .tp-fldv_b {
        color: var(--color-text-primary);
        font-weight: 700;
        font-size: var(--text-sm);
        letter-spacing: 0.5px;
        text-transform: uppercase;
      }
      
      .unified-panel-content .tp-lblv_l {
        color: var(--color-text-secondary);
        font-weight: 600;
        font-size: var(--text-xs);
        letter-spacing: 0.5px;
        text-transform: uppercase;
      }
      
      .unified-panel-content .tp-rotv_b,
      .unified-panel-content .tp-sldtxtv_t {
        background: linear-gradient(
          135deg,
          rgba(255, 255, 255, 0.06) 0%,
          rgba(255, 255, 255, 0.03) 100%
        ) !important;
        border: 1px solid var(--color-border-light);
        border-radius: var(--radius-sm);
        color: var(--color-text-primary) !important;
        transition: all var(--duration-base) var(--easing-ease);
      }
      
      .unified-panel-content .tp-rotv_b:hover,
      .unified-panel-content .tp-sldtxtv_t:hover {
        background: linear-gradient(
          135deg,
          rgba(255, 255, 255, 0.10) 0%,
          rgba(255, 255, 255, 0.06) 100%
        ) !important;
        border-color: var(--color-border-medium);
      }
      
      .unified-panel-content .tp-btnv_b {
        background: linear-gradient(
          135deg,
          var(--color-primary) 0%,
          var(--color-secondary) 50%,
          var(--color-accent) 100%
        ) !important;
        border: 1px solid var(--color-border-heavy) !important;
        border-radius: var(--radius-md);
        color: white !important;
        font-weight: 700;
        font-size: var(--text-xs);
        letter-spacing: 0.8px;
        text-transform: uppercase;
        padding: var(--space-sm) var(--space-md);
        transition: all var(--duration-base) var(--easing-ease);
        box-shadow: 0 4px 12px var(--color-shadow-glow);
      }
      
      .unified-panel-content .tp-btnv_b:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 20px var(--color-shadow-glow);
      }
      
      .unified-panel-content .tp-btnv_b:active {
        transform: translateY(0);
      }
      
      .unified-panel-content .tp-sldv_t {
        background: linear-gradient(
          90deg,
          rgba(255, 255, 255, 0.08) 0%,
          rgba(255, 255, 255, 0.04) 100%
        );
        border-radius: var(--radius-md);
        height: 6px;
      }
      
      .unified-panel-content .tp-sldv_k {
        background: linear-gradient(
          135deg,
          var(--color-accent) 0%,
          var(--color-primary) 50%,
          var(--color-secondary) 100%
        );
        border-radius: var(--radius-md);
        box-shadow: 0 2px 8px var(--color-shadow-glow);
        border: 2px solid rgba(255, 255, 255, 0.2);
        transition: all var(--duration-base) var(--easing-ease);
      }
      
      .unified-panel-content .tp-sldv_k:hover {
        transform: scale(1.15);
        box-shadow: 0 4px 16px var(--color-shadow-glow);
      }
      
      .unified-panel-content .tp-sprv_r {
        background: linear-gradient(
          90deg,
          transparent,
          var(--color-border-medium) 50%,
          transparent
        );
        height: 2px;
        margin: var(--space-md) 0;
      }
      
      .unified-panel-content .tp-ckbv_i {
        background: linear-gradient(
          135deg,
          rgba(255, 255, 255, 0.08) 0%,
          rgba(255, 255, 255, 0.04) 100%
        );
        border: 2px solid var(--color-border-medium);
        border-radius: var(--radius-sm);
        transition: all var(--duration-base) var(--easing-ease);
      }
      
      .unified-panel-content .tp-ckbv_i:checked {
        background: linear-gradient(
          135deg,
          var(--color-primary) 0%,
          var(--color-secondary) 100%
        );
        border-color: var(--color-primary);
        box-shadow: 0 4px 12px var(--color-shadow-glow);
      }
      
      .unified-panel-content .tp-lstv_s {
        background: linear-gradient(
          135deg,
          rgba(255, 255, 255, 0.08) 0%,
          rgba(255, 255, 255, 0.04) 100%
        ) !important;
        border: 1px solid var(--color-border-light);
        border-radius: var(--radius-sm);
        color: var(--color-text-primary);
        padding: var(--space-sm) var(--space-md);
        transition: all var(--duration-base) var(--easing-ease);
      }
      
      .unified-panel-content .tp-lstv_s:hover {
        background: linear-gradient(
          135deg,
          rgba(255, 255, 255, 0.12) 0%,
          rgba(255, 255, 255, 0.08) 100%
        ) !important;
        border-color: var(--color-border-medium);
      }
      
      .unified-panel-content .tp-fldv_c {
        padding: var(--space-sm) var(--space-md);
        background: rgba(0, 0, 0, 0.10);
      }
      
      .unified-panel-content .tp-fldv .tp-fldv {
        margin: var(--space-sm) 0;
        border-radius: var(--radius-md);
        background: rgba(255, 255, 255, 0.02);
        border: 1px solid var(--color-border-light);
      }
    `;
    document.head.appendChild(style);
    this.styleElement = style;
  }
  
  /**
   * Create a panel (automatically integrated into unified system)
   */
  createPanel(id: string, config: {
    title: string;
    icon?: string;
    expanded?: boolean;
  }): { pane: Pane; container: HTMLElement } {
    // Create container
    const container = document.createElement('div');
    container.className = 'unified-panel-content-pane';
    container.style.width = '100%';
    container.style.height = '100%';
    
    // Create Tweakpane
    const pane: any = new Pane({
      container,
      title: config.title,
      expanded: config.expanded ?? true,
    });
    
    pane.registerPlugin(EssentialsPlugin);
    
    // Extract icon from title or use default
    const iconMatch = config.title.match(/^([\u{1F300}-\u{1F9FF}])/u);
    const icon = iconMatch ? iconMatch[1] : (config.icon || '📋');
    const label = config.title.replace(/^[\u{1F300}-\u{1F9FF}]\s*/u, '');
    
    // Create panel definition
    const panelDef: PanelDefinition = {
      id,
      icon,
      label,
      pane,
      container,
    };
    
    // Register with unified panel system
    this.unifiedPanel.registerPanel(panelDef);
    this.panels.set(id, panelDef);
    
    return { pane, container };
  }
  
  /**
   * Get theme engine
   */
  getThemeEngine(): ThemeEngine {
    return this.unifiedPanel.getThemeEngine();
  }
  
  /**
   * Get unified panel container
   */
  getUnifiedPanel(): UnifiedPanelContainer {
    return this.unifiedPanel;
  }
  
  /**
   * Get panel by ID
   */
  getPanel(id: string): Pane | undefined {
    return this.panels.get(id)?.pane;
  }
  
  /**
   * Dispose
   */
  dispose(): void {
    this.unifiedPanel.dispose();
    this.panels.clear();
    
    if (this.styleElement) {
      this.styleElement.remove();
    }
    
    const link = document.getElementById('dashboard-v2-styles');
    if (link) {
      link.remove();
    }
  }
}

