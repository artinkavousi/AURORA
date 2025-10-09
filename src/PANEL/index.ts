/**
 * PANEL/index.ts - Main entry point for unified dashboard system
 */

export { Dashboard, type DashboardOptions, type DashboardDock } from './dashboard';
export { UnifiedPanelManager, createUnifiedPanels, type UnifiedPanelCallbacks } from './UnifiedPanelManager';
export { BaseTab, type TabOptions, type BaseCallbacks } from './types';
export { 
  DEFAULT_THEME, 
  THEME_PRESETS, 
  type DashboardTheme,
  hexToRgb,
  hexToHsl,
  hslToCss,
} from './theme';

// Export all tabs
export * from './tabs';


