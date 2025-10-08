/**
 * PANEL/core/index.ts - Core exports for unified panel system
 */

export { UnifiedPanelContainer, type PanelDefinition, type UnifiedPanelConfig } from './UnifiedPanelContainer';
export { AdaptiveDockingSystem, type DockSide, type DockPosition } from './AdaptiveDockingSystem';
export { TabNavigationSystem, type TabDefinition } from './TabNavigationSystem';
export { ThemeEngine, type ThemeConfig, type ThemeColors, type ThemeGlassmorphism, BUILTIN_THEMES } from './ThemeEngine';
export { StateManager } from './StateManager';
export { AnimationController, type SpringConfig } from './AnimationController';

