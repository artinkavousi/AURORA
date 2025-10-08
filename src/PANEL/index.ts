/**
 * PANEL/index.ts - Main exports for unified panel system
 * 
 * Usage:
 *   import { DashboardV2, ThemeEngine, BUILTIN_THEMES } from './PANEL';
 */

// Main dashboard API
export { DashboardV2, type DashboardV2Options } from './DashboardV2';

// Core systems (if you need direct access)
export {
  UnifiedPanelContainer,
  AdaptiveDockingSystem,
  TabNavigationSystem,
  ThemeEngine,
  StateManager,
  AnimationController,
  BUILTIN_THEMES,
} from './core';

// Types
export type {
  PanelDefinition,
  UnifiedPanelConfig,
  DockSide,
  DockPosition,
  TabDefinition,
  ThemeConfig,
  ThemeColors,
  ThemeGlassmorphism,
  SpringConfig,
} from './core';

// Legacy (for backward compatibility)
export { Dashboard, type DashboardOptions, type PanelConfig } from './dashboard';

