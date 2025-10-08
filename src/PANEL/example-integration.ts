/**
 * PANEL/example-integration.ts - Complete example of unified panel system
 * Shows how to integrate all panels with DashboardV2
 */

import { DashboardV2 } from './DashboardV2';
import { VisualsPanel } from './PANELvisuals';
import { ThemesPanel } from './PANELthemes';
import { PhysicPanel } from './PANELphysics';
import { PostFXPanel } from './PANELpostfx';
import { AudioPanel } from './PANELaudio';
import type { FlowConfig } from '../config';

/**
 * Initialize complete panel system with all panels
 */
export function initializePanelSystem(config: FlowConfig) {
  // Create unified dashboard
  const dashboard = new DashboardV2({
    defaultDock: 'right',
    defaultExpanded: true,
    defaultTheme: 'cosmic-blue',
    width: 380,
    height: 500,
    enableKeyboardShortcuts: true,
    enablePersistence: true,
  });
  
  console.log('✅ Dashboard initialized');
  
  // === VISUALS PANEL ===
  const { pane: visualsPane } = dashboard.createPanel('visuals', {
    title: '🎨 Visuals',
    expanded: true,
  });
  
  const visualsPanel = new VisualsPanel(visualsPane, {
    onRenderModeChange: (mode) => {
      console.log('Render mode changed:', mode);
      // Update renderer...
    },
    onColorModeChange: (mode) => {
      console.log('Color mode changed:', mode);
      // Update color system...
    },
    onSizeChange: (size) => {
      console.log('Particle size changed:', size);
      // Update particle size...
    },
  });
  
  // === THEMES PANEL ===
  const { pane: themesPane } = dashboard.createPanel('themes', {
    title: '🎭 Themes',
    expanded: true,
  });
  
  const themeManager = dashboard.getThemeEngine();
  const themesPanel = new ThemesPanel(themesPane, themeManager, {
    onThemeChange: (theme) => {
      console.log(`✨ Theme changed to: ${theme.name}`);
    },
  });
  
  // === PHYSICS PANEL ===
  const { pane: physicsPane } = dashboard.createPanel('physics', {
    title: '🌊 Physics',
    expanded: true,
  });
  
  const physicsPanel = new PhysicPanel(physicsPane, config, {
    onParticleCountChange: (count) => {
      console.log('Particle count changed:', count);
      // Reinitialize particles...
    },
    onSimulationChange: (simConfig) => {
      console.log('Simulation config changed:', simConfig);
      // Update simulation...
    },
  });
  
  // === POST-FX PANEL ===
  const { pane: postFXPane } = dashboard.createPanel('postfx', {
    title: '✨ Post-FX',
    expanded: true,
  });
  
  const postFXPanel = new PostFXPanel(postFXPane, config, {
    onBloomChange: (bloomConfig) => {
      console.log('Bloom config changed:', bloomConfig);
      // Update bloom pass...
    },
    onRadialFocusChange: (focusConfig) => {
      console.log('Radial focus changed:', focusConfig);
      // Update DOF pass...
    },
  });
  
  // === AUDIO PANEL ===
  const { pane: audioPane } = dashboard.createPanel('audio', {
    title: '🎵 Audio',
    expanded: true,
  });
  
  const audioPanel = new AudioPanel(audioPane, config, {
    onAudioReactiveConfigChange: (audioConfig) => {
      console.log('Audio config changed:', audioConfig);
      // Update audio reactivity...
    },
    onEnableChange: (enabled) => {
      console.log('Audio reactivity:', enabled ? 'enabled' : 'disabled');
      // Toggle audio system...
    },
  });
  
  console.log('✅ All panels initialized!');
  console.log('');
  console.log('Keyboard Shortcuts:');
  console.log('  Ctrl+B    : Toggle collapse/expand');
  console.log('  Ctrl+1    : Visuals panel');
  console.log('  Ctrl+2    : Themes panel');
  console.log('  Ctrl+3    : Physics panel');
  console.log('  Ctrl+4    : Post-FX panel');
  console.log('  Ctrl+5    : Audio panel');
  console.log('  Arrow Keys: Navigate tabs');
  console.log('');
  console.log('Try dragging the panel near screen edges to auto-dock!');
  
  return {
    dashboard,
    panels: {
      visuals: visualsPanel,
      themes: themesPanel,
      physics: physicsPanel,
      postFX: postFXPanel,
      audio: audioPanel,
    },
  };
}

/**
 * Simplified panel initialization (one-liner)
 */
export function createQuickPanels(config: FlowConfig) {
  const dashboard = new DashboardV2();
  
  // Create all panels
  const visuals = dashboard.createPanel('visuals', { title: '🎨 Visuals' });
  const themes = dashboard.createPanel('themes', { title: '🎭 Themes' });
  const physics = dashboard.createPanel('physics', { title: '🌊 Physics' });
  const postfx = dashboard.createPanel('postfx', { title: '✨ Post-FX' });
  const audio = dashboard.createPanel('audio', { title: '🎵 Audio' });
  
  // Initialize panel classes
  new VisualsPanel(visuals.pane);
  new ThemesPanel(themes.pane, dashboard.getThemeEngine());
  new PhysicPanel(physics.pane, config);
  new PostFXPanel(postfx.pane, config);
  new AudioPanel(audio.pane, config);
  
  return dashboard;
}

