/**
 * PANEL/UnifiedPanelManager.ts - Orchestrates all control panels
 * Central manager for the unified dashboard system
 */

import { Dashboard } from './dashboard';
import { PhysicsTab, VisualsTab, AudioTab, PostFXTab, LibraryTab, SettingsTab } from './tabs';
import type { FlowConfig } from '../config';
import type { 
  PhysicsTabCallbacks, 
  VisualsTabCallbacks, 
  AudioTabCallbacks, 
  PostFXTabCallbacks,
  LibraryTabCallbacks,
  SettingsTabCallbacks 
} from './tabs';

/**
 * Combined callbacks interface for all tabs
 */
export interface UnifiedPanelCallbacks {
  physics?: PhysicsTabCallbacks;
  visuals?: VisualsTabCallbacks;
  audio?: AudioTabCallbacks;
  postfx?: PostFXTabCallbacks;
  library?: LibraryTabCallbacks;
  settings?: SettingsTabCallbacks;
}

/**
 * UnifiedPanelManager - Central orchestrator for all control panels
 */
export class UnifiedPanelManager {
  private dashboard: Dashboard;
  private config: FlowConfig;
  private callbacks: UnifiedPanelCallbacks;
  
  public physicsTab: PhysicsTab | null = null;
  public visualsTab: VisualsTab | null = null;
  public audioTab: AudioTab | null = null;
  public postfxTab: PostFXTab | null = null;
  public libraryTab: LibraryTab | null = null;
  public settingsTab: SettingsTab | null = null;

  constructor(config: FlowConfig, callbacks: UnifiedPanelCallbacks = {}) {
    this.config = config;
    this.callbacks = callbacks;
    
    // Create dashboard
    this.dashboard = new Dashboard({
      defaultDock: 'right',
      collapsed: false,
      showFPS: false,
      showInfo: false,
      enableGlassmorphism: true,
    });
    
    console.log('[UnifiedPanelManager] Dashboard created');
    
    // Initialize all tabs
    this.initializeTabs();
    
    // Set up settings tab callbacks to control dashboard
    this.setupDashboardCallbacks();
  }

  private initializeTabs(): void {
    console.log('[UnifiedPanelManager] Initializing tabs...');
    
    // Physics Tab
    const physicsPane = this.dashboard.registerPanel({
      id: 'physics',
      title: 'Physics',
      icon: '🌊',
      description: 'Particle physics and simulation controls',
    });
    this.physicsTab = new PhysicsTab(physicsPane, this.config, this.callbacks.physics || {});
    this.physicsTab.buildUI();
    console.log('[UnifiedPanelManager] Physics tab initialized');
    
    // Visuals Tab
    const visualsPane = this.dashboard.registerPanel({
      id: 'visuals',
      title: 'Visuals',
      icon: '🎨',
      description: 'Rendering and appearance controls',
    });
    this.visualsTab = new VisualsTab(visualsPane, this.config, this.callbacks.visuals || {});
    this.visualsTab.buildUI();
    console.log('[UnifiedPanelManager] Visuals tab initialized');
    
    // Audio Tab
    const audioPane = this.dashboard.registerPanel({
      id: 'audio',
      title: 'Audio',
      icon: '🎵',
      description: 'Audio reactivity controls',
    });
    this.audioTab = new AudioTab(audioPane, this.config, this.callbacks.audio || {});
    this.audioTab.buildUI();
    console.log('[UnifiedPanelManager] Audio tab initialized');
    
    // Post FX Tab
    const postfxPane = this.dashboard.registerPanel({
      id: 'postfx',
      title: 'Post FX',
      icon: '✨',
      description: 'Post-processing effects',
    });
    this.postfxTab = new PostFXTab(postfxPane, this.config, this.callbacks.postfx || {});
    this.postfxTab.buildUI();
    console.log('[UnifiedPanelManager] Post FX tab initialized');
    
    // Library Tab
    const libraryPane = this.dashboard.registerPanel({
      id: 'library',
      title: 'Library',
      icon: '📚',
      description: 'Material library and presets',
    });
    this.libraryTab = new LibraryTab(libraryPane, this.config, this.callbacks.library || {});
    this.libraryTab.buildUI();
    console.log('[UnifiedPanelManager] Library tab initialized');
    
    // Settings Tab
    const settingsPane = this.dashboard.registerPanel({
      id: 'settings',
      title: 'Settings',
      icon: '⚙️',
      description: 'Application settings and theme',
    });
    this.settingsTab = new SettingsTab(settingsPane, this.config, this.callbacks.settings || {});
    this.settingsTab.buildUI();
    console.log('[UnifiedPanelManager] Settings tab initialized');
  }

  private setupDashboardCallbacks(): void {
    if (this.settingsTab && this.callbacks.settings) {
      // Enhance settings callbacks to control dashboard
      const originalOnThemeChange = this.callbacks.settings.onThemeChange;
      const originalOnDockChange = this.callbacks.settings.onDockChange;
      
      this.callbacks.settings.onThemeChange = (theme) => {
        this.dashboard.updateTheme(theme);
        originalOnThemeChange?.(theme);
      };
      
      this.callbacks.settings.onDockChange = (dock) => {
        this.dashboard.setDock(dock);
        originalOnDockChange?.(dock);
      };
    }
  }

  /**
   * Update FPS graph in physics tab
   */
  public updateFPS(): void {
    this.physicsTab?.updateFPS();
  }

  /**
   * Update metrics in physics tab
   */
  public updatePhysicsMetrics(activeParticles: number, fps: number, kernelTime: number): void {
    this.physicsTab?.updateMetrics(activeParticles, fps, kernelTime);
  }

  /**
   * Update audio metrics in audio tab
   */
  public updateAudioMetrics(audioData: any): void {
    this.audioTab?.updateMetrics(audioData);
  }

  /**
   * Get dashboard instance
   */
  public getDashboard(): Dashboard {
    return this.dashboard;
  }

  /**
   * Toggle dashboard collapsed state
   */
  public toggleCollapse(): void {
    this.dashboard.toggleCollapse();
  }

  /**
   * Set active tab
   */
  public activateTab(id: string): void {
    this.dashboard.activatePanel(id);
  }

  /**
   * Clean up resources
   */
  public dispose(): void {
    console.log('[UnifiedPanelManager] Disposing...');
    
    this.physicsTab?.dispose();
    this.visualsTab?.dispose();
    this.audioTab?.dispose();
    this.postfxTab?.dispose();
    this.libraryTab?.dispose();
    this.settingsTab?.dispose();
    
    this.dashboard.destroy();
  }
}

/**
 * Convenience function to create and initialize the unified panel system
 */
export function createUnifiedPanels(
  config: FlowConfig,
  callbacks: UnifiedPanelCallbacks = {}
): UnifiedPanelManager {
  console.log('[UnifiedPanelManager] Creating unified panel system...');
  return new UnifiedPanelManager(config, callbacks);
}


